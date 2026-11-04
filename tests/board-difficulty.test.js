import test from 'node:test';
import assert from 'node:assert/strict';
import {ChessGame,chooseChessMove,chessIndex as sq} from '../chess-game.js';
import {CheckersGame,chooseCheckersMove,checkersMoves,applyCheckersMove} from '../checkers.js';
import {sanitizeSettings} from '../arcade.js';

const levels=['easy','normal','hard'];
function draughts(entries){const game=new CheckersGame();game.board=Array(64).fill(0);for(const [s,p] of Object.entries(entries))game.board[sq(s)]=p;game.history=new Map([[game.key(),1]]);return game;}
const same=(a,b)=>a.from===b.from&&a.to===b.to&&a.promotion===b.promotion;

test('Board difficulty preferences survive settings normalization independently',()=>{
  const value=sanitizeSettings({chessDifficulty:'hard',checkersDifficulty:'easy',records:{fast:17}});
  assert.equal(value.chessDifficulty,'hard');assert.equal(value.checkersDifficulty,'easy');assert.equal(value.records.fast,17);
  assert.equal(sanitizeSettings(value).chessDifficulty,'hard');
  for(const bad of ['constructor','unknown',null,{},4]){
    const safe=sanitizeSettings({chessDifficulty:bad,checkersDifficulty:bad});
    assert.equal(safe.chessDifficulty,'normal');assert.equal(safe.checkersDifficulty,'normal');
  }
});

test('All chess levels return legal moves for castling, en passant and promotion without touching the live board',()=>{
  for(const fen of ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','7k/P7/8/8/8/8/8/4K3 w - - 0 1'])for(const level of levels){
    const game=new ChessGame(fen),legal=game.moves(),before={fen:game.engine.fen(),hash:game.engine.hash(),history:game.engine.history(),counts:new Map(game.engine._positionCount)};
    const move=chooseChessMove(game,()=>0,level);
    assert.ok(legal.some(m=>same(m,move)),level);assert.equal(game.engine.fen(),before.fen);assert.equal(game.engine.hash(),before.hash);
    assert.deepEqual(game.engine.history(),before.history);assert.deepEqual(game.engine._positionCount,before.counts);assert.deepEqual(game.journal,[]);
    assert.equal(game.play(move),true);assert.equal(game.journal.length,1);
  }
});

test('Medium chess sees the poisoned pawn that the one-move easy opponent takes',t=>{
  t.mock.method(performance,'now',()=>0);
  const fen='3q3k/8/8/3p4/8/8/8/3Q2K1 w - - 0 1';
  const easy=chooseChessMove(new ChessGame(fen),()=>0,'easy');assert.equal(easy.san,'Qxd5');
  for(const level of ['normal','hard'])assert.notEqual(chooseChessMove(new ChessGame(fen),()=>0,level).san,'Qxd5');
});

test('Hard chess finds a forced mate in two beyond the medium horizon',t=>{
  t.mock.method(performance,'now',()=>0);
  const fen='8/7k/5K2/4Q3/8/8/8/8 w - - 0 1';
  function forcesMate(move){
    const game=new ChessGame(fen);assert.equal(game.play(move),true);
    const replies=game.engine.moves({verbose:true});assert.ok(replies.length);
    return replies.every(reply=>{const next=new ChessGame(game.engine.fen());next.engine.move(reply);return next.engine.moves({verbose:true}).some(m=>m.san.includes('#'));});
  }
  assert.equal(forcesMate(chooseChessMove(new ChessGame(fen),()=>0,'normal')),false);
  assert.equal(forcesMate(chooseChessMove(new ChessGame(fen),()=>0,'hard')),true);
});

test('An interrupted chess search keeps a legal fallback and preserves repetition counts and the real journal',t=>{
  const game=new ChessGame();for(const [from,to] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']])game.play({from:sq(from),to:sq(to)});
  const fen=game.engine.fen(),journal=structuredClone(game.journal),counts=new Map(game.engine._positionCount),legal=game.moves();let clock=0;
  t.mock.method(performance,'now',()=>clock+=60);
  for(const level of levels){const move=chooseChessMove(game,()=>0,level);assert.ok(legal.some(m=>same(m,move)));assert.equal(game.engine.fen(),fen);assert.deepEqual(game.journal,journal);assert.deepEqual(game.engine._positionCount,counts);}
});

test('Medium and hard draughts avoid a capture trap visible beyond the easy horizon',t=>{
  t.mock.method(performance,'now',()=>0);
  const easy=chooseCheckersMove(draughts({c3:1,e5:-1,h8:-1}),()=>0,'easy');assert.equal(easy.to,sq('d4'));
  for(const level of ['normal','hard']){
    const game=draughts({c3:1,e5:-1,h8:-1}),move=chooseCheckersMove(game,()=>0,level);
    assert.equal(move.to,sq('b4'));assert.ok(checkersMoves(applyCheckersMove(game.board,move),1).every(m=>!m.captures.length));
  }
});

test('All draughts levels keep complete mandatory captures and crowning, with no speculative journal entries',()=>{
  for(const level of levels){
    const game=draughts({b6:1,c7:-1,f6:-1}),board=[...game.board],history=new Map(game.history);
    const move=chooseCheckersMove(game,()=>0,level);assert.equal(move.captures.length,2);assert.equal(move.piece,2);
    assert.deepEqual(game.board,board);assert.deepEqual(game.history,history);assert.deepEqual(game.journal,[]);
    assert.equal(game.play(move),true);assert.equal(game.status().winner,0);assert.equal(game.journal.length,1);
  }
});

test('Draughts search handles budget expiry without changing kings, quiet-move count or history',t=>{
  const game=draughts({a1:2,h6:-2,c3:1,e5:-1}),before={board:[...game.board],history:new Map(game.history),quiet:game.quietKings},legal=game.moves();let clock=0;
  t.mock.method(performance,'now',()=>clock+=30);
  for(const level of levels){
    const move=chooseCheckersMove(game,()=>0,level);assert.ok(legal.some(m=>same(m,move)&&m.path.join(',')===move.path.join(',')));
    assert.deepEqual(game.board,before.board);assert.deepEqual(game.history,before.history);assert.equal(game.quietKings,before.quiet);assert.deepEqual(game.journal,[]);
  }
});

test('Neither local opponent makes a move after a completed game at any difficulty',()=>{
  const chess=new ChessGame('7k/8/8/8/8/8/8/K7 b - - 0 1'),checkers=draughts({c3:1});checkers.turn=1;
  for(const level of levels){assert.equal(chooseChessMove(chess,()=>0,level),null);assert.equal(chooseCheckersMove(checkers,()=>0,level),null);}
});

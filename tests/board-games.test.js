import test from 'node:test';
import assert from 'node:assert/strict';
import {ChessGame,chooseChessMove,chessIndex} from '../chess-game.js';
import {CheckersGame,checkersMoves} from '../checkers.js';
const sq=chessIndex;
const move=(game,from,to,promotion)=>game.play({from:sq(from),to:sq(to),path:[sq(to)],promotion});
function position(entries){const board=Array(64).fill(0);for(const [square,p] of Object.entries(entries))board[sq(square)]=p;return board;}

test('Chess rejects illegal moves and its local opponent preserves the position while thinking',()=>{
  const game=new ChessGame();assert.equal(game.moves().length,20);assert.equal(game.position().filter(Boolean).length,32);
  assert.equal(move(game,'e2','e5'),false);assert.equal(move(game,'e2','e4'),true);assert.equal(game.turn,1);
  const before=game.engine.fen(),history=game.engine.history(),reply=chooseChessMove(game,()=>0);
  assert.equal(game.engine.fen(),before);assert.deepEqual(game.engine.history(),history);
  assert.ok(game.moves().some(m=>m.from===reply.from&&m.to===reply.to));assert.equal(game.play(reply),true);assert.equal(game.turn,0);
});
test('Chess castling moves the rook and cannot pass through check',()=>{
  const game=new ChessGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.equal(move(game,'e1','g1'),true);assert.equal(game.engine.get('g1').type,'k');assert.equal(game.engine.get('f1').type,'r');assert.equal(game.engine.get('h1'),undefined);
  const attacked=new ChessGame('4kr2/8/8/8/8/8/8/4K2R w K - 0 1');assert.equal(move(attacked,'e1','g1'),false);
});
test('Chess includes en passant and all four promotion choices',()=>{
  const ep=new ChessGame('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert.equal(move(ep,'e5','d6'),true);assert.equal(ep.engine.get('d5'),undefined);assert.equal(ep.engine.get('d6').type,'p');
  const promotion=new ChessGame('7k/P7/8/8/8/8/8/7K w - - 0 1');
  assert.deepEqual(promotion.moves().filter(m=>m.from===sq('a7')).map(m=>m.promotion).sort(),['b','n','q','r']);
  assert.equal(move(promotion,'a7','a8','n'),true);assert.equal(promotion.engine.get('a8').type,'n');
});
test('Chess reports mate, stalemate, insufficient material and repetition',()=>{
  const game=new ChessGame();for(const [from,to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']])assert.equal(move(game,from,to),true);
  assert.equal(game.status().winner,1);assert.equal(move(game,'e2','e3'),false);
  assert.equal(new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').status().reason,'Пат.');
  assert.equal(new ChessGame('7k/8/8/8/8/8/8/K7 w - - 0 1').status().winner,null);
  const repeat=new ChessGame();for(let n=0;n<2;n++)for(const [from,to] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']])assert.equal(move(repeat,from,to),true);
  assert.equal(repeat.status().reason,'Троекратное повторение.');
});
test('Russian draughts starts with 12 pieces each and enforces backward captures',()=>{
  const game=new CheckersGame();assert.equal(game.board.filter(p=>p===1).length,12);assert.equal(game.board.filter(p=>p===-1).length,12);assert.equal(game.moves().length,7);
  const moves=checkersMoves(position({c3:1,b2:-1,a3:1,h8:-1}));assert.ok(moves.every(m=>m.captures.length));assert.ok(moves.some(m=>m.from===sq('c3')&&m.to===sq('a1')));
});
test('Draughts crowns during capture and must continue as a flying king',()=>{
  const game=new CheckersGame();game.board=position({b6:1,c7:-1,f6:-1});const moves=game.moves();
  assert.ok(moves.length>=2);assert.ok(moves.every(m=>m.path.length===2&&m.captures.length===2&&m.piece===2));
  assert.equal(game.play({from:sq('b6'),path:[sq('d8')]}),false);assert.equal(game.preview(sq('b6'),[sq('d8')])[sq('d8')],2);
  const chosen=moves.find(m=>m.to===sq('g5'));assert.ok(chosen);assert.equal(game.play(chosen),true);assert.equal(game.board[sq('g5')],2);assert.equal(game.status().winner,0);
});
test('Russian draughts permits different capture lengths and retains captured blockers',()=>{
  const choices=checkersMoves(position({a3:1,b4:-1,h2:1,g3:-1,e5:-1}));assert.ok(choices.some(m=>m.captures.length===1));assert.ok(choices.some(m=>m.captures.length===2));
  const blocked=checkersMoves(position({d4:2,c5:-1,e3:-1}));assert.ok(blocked.length);assert.ok(blocked.every(m=>m.captures.length===1),'Early removal would allow an illegal reversal');
  const flying=checkersMoves(position({c3:2,e5:-1}));assert.deepEqual(flying.map(m=>m.to).sort((a,b)=>a-b),['f6','g7','h8'].map(sq).sort((a,b)=>a-b));
});
test('Draughts ends when no moves remain and limits quiet king play',()=>{
  const game=new CheckersGame();game.board=position({c3:1,d4:-1});game.play(game.moves()[0]);assert.equal(game.status().winner,0);
  const quiet=new CheckersGame();quiet.board=position({a1:2,h6:-2});quiet.quietKings=29;const move=quiet.moves().find(m=>m.to===sq('b2'));assert.ok(move);quiet.play(move);assert.equal(quiet.status().winner,null);
});
test('Seeded draughts games conserve pieces and every generated move is playable',()=>{
  let n=789;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);
  for(let match=0;match<12;match++){
    const game=new CheckersGame();let turns=0;
    while(!game.status()&&turns++<500){const moves=game.moves(),move=moves[Math.floor(random()*moves.length)],before=game.board.filter(Boolean).length;
      assert.equal(game.play(move),true);assert.equal(game.board.filter(Boolean).length,before-move.captures.length);
      game.board.forEach((p,i)=>{if(p)assert.equal((Math.floor(i/8)+i%8)%2,1);});
    }assert.ok(game.status());
  }
});

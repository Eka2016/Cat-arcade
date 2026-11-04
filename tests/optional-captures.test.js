import test from 'node:test';
import assert from 'node:assert/strict';
import {CheckersGame,checkersMoves,chooseCheckersMove} from '../checkers.js';
import {ChessGame,chessIndex} from '../chess-game.js';
import {makeGameResult} from '../game-report.js';

const sq=chessIndex;
function setup(pieces,turn=0,mandatoryCapture=false){const game=new CheckersGame({mandatoryCapture});game.board=Array(64).fill(0);for(const [square,piece] of Object.entries(pieces))game.board[sq(square)]=piece;game.turn=turn;game.history=new Map([[game.key(),1]]);return game;}

test('Optional draughts captures leave quiet moves of other pieces available for both sides',()=>{
 for(const side of [0,1]){
  const game=setup({c3:1,h2:1,d4:-1,h8:-1},side),from=side===0?'h2':'h8',to=side===0?'g3':'g7',legal=game.moves();
  assert.ok(legal.some(m=>m.captures.length));const quiet=legal.find(m=>m.from===sq(from)&&m.to===sq(to));assert.ok(quiet);assert.equal(quiet.captures.length,0);assert.equal(game.play(quiet),true);assert.equal(game.board[sq(from)],0);assert.equal(game.board[sq(to)],side===0?1:-1);assert.equal(game.board[sq(side===0?'d4':'c3')],side===0?-1:1);assert.equal(game.journal.length,1);
 }
});
test('Optional draughts still require complete legal capture chains and keep their mode on reset',()=>{
 const game=setup({b6:1,a1:1,c7:-1,f6:-1}),before=[...game.board],capture=game.moves().find(m=>m.from===sq('b6')&&m.captures.length===2);
 assert.ok(capture);assert.equal(game.play({...capture,path:[sq('d8')]}),false);assert.deepEqual(game.board,before);assert.equal(game.play(capture),true);assert.equal(game.board[capture.to],2);assert.equal(game.board[sq('c7')],0);assert.equal(game.board[sq('f6')],0);
 game.reset();assert.equal(game.mandatoryCapture,false);assert.equal(game.moves().length,7);
 const forced=checkersMoves(before,0);assert.ok(forced.every(m=>m.captures.length));assert.ok(checkersMoves(before,0,false).some(m=>!m.captures.length));
});
test('All draughts opponents use legal optional-capture moves without changing the real position or journal',()=>{
 for(const level of ['easy','normal','hard']){
  const game=setup({c3:1,h2:1,d4:-1,h8:-1},1),before=JSON.stringify({board:game.board,turn:game.turn,history:[...game.history],journal:game.journal}),legal=game.moves();
  const move=chooseCheckersMove(game,()=>.2,level);assert.ok(legal.some(m=>m.from===move.from&&m.path.join()===move.path.join()));assert.equal(JSON.stringify({board:game.board,turn:game.turn,history:[...game.history],journal:game.journal}),before);assert.equal(game.play(move),true);
 }
});
test('Chess allows another piece to move quietly when a capture is available and still protects its king',()=>{
 const game=new ChessGame('4k3/8/8/3p4/4P3/8/8/1N2K3 w - - 0 1');assert.ok(game.moves().some(m=>m.from===sq('e4')&&m.to===sq('d5')&&m.capture));
 const quiet=game.moves().find(m=>m.from===sq('b1')&&m.to===sq('c3'));assert.ok(quiet);assert.equal(quiet.capture,false);assert.equal(game.play(quiet),true);assert.equal(game.engine.get('d5').color,'b');assert.equal(game.engine.get('c3').type,'n');
 const checked=new ChessGame('k3r3/8/8/8/8/8/8/1N2K3 w - - 0 1');assert.ok(checked.checkedSquare()>=0);assert.ok(!checked.moves().some(m=>m.from===sq('b1')&&m.to===sq('c3')));
});
test('The game report tells the chat about optional draughts captures',()=>{
 const game=setup({c3:1,d4:-1}),move=game.moves().find(m=>m.captures.length);assert.equal(game.play(move),true);assert.ok(game.status());const result=makeGameResult('checkers',game);assert.match(result.details,/взятие по желанию/);assert.equal(result.outcome,'win');
});

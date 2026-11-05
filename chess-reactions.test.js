import test from 'node:test';
import assert from 'node:assert/strict';
import {ChessGame,chessIndex} from '../chess-game.js';
import {getChessReaction} from '../chess-reactions.js';

const play=(game,from,to)=>assert.equal(game.play({from:chessIndex(from),to:chessIndex(to)}),true);
test('The emperor thinks on his real turn and returns to neutral after moving',()=>{
  const game=new ChessGame();assert.equal(getChessReaction(game).mood,'neutral');
  play(game,'e2','e4');assert.equal(getChessReaction(game).mood,'thinking');
  play(game,'e7','e5');assert.equal(getChessReaction(game).mood,'neutral');
});
test('Actual checkmates select emotions from the emperor’s point of view',()=>{
  const playerWin=new ChessGame('6rk/6pp/8/6N1/8/8/8/K7 w - - 0 1');play(playerWin,'g5','f7');assert.equal(getChessReaction(playerWin).mood,'lose');
  const emperorWin=new ChessGame();for(const [from,to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']])play(emperorWin,from,to);
  assert.equal(getChessReaction(emperorWin).mood,'win');emperorWin.reset();assert.equal(getChessReaction(emperorWin).mood,'neutral');
});
test('A real drawn position remains neutral, independent of whose turn it is',()=>{
  const game=new ChessGame('7k/8/8/8/8/8/8/K7 b - - 0 1');assert.equal(game.status().winner,null);assert.equal(getChessReaction(game).mood,'neutral');
});

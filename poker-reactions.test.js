import test from 'node:test';
import assert from 'node:assert/strict';
import {PokerMatch} from '../poker.js';
import {getPokerReaction} from '../poker-reactions.js';

test('Poker opponent thinks only on his turn, then shows the actual winner from his perspective',()=>{
  const game=new PokerMatch({random:()=>.525});assert.equal(getPokerReaction(game).mood,'neutral');
  game.deal();assert.equal(getPokerReaction(game).mood,'neutral');game.act(0,'raise',40);assert.equal(getPokerReaction(game).mood,'thinking');
  game.act(1,'fold');assert.equal(game.result.winner,0);assert.equal(getPokerReaction(game).mood,'lose');
  game.reset();game.deal();game.act(0,'fold');assert.equal(game.result.winner,1);assert.equal(getPokerReaction(game).mood,'win');
  game.reset();assert.equal(getPokerReaction(game).mood,'neutral');
});

test('A shared showdown has a neutral reaction, with no false celebration',()=>{
  const index=s=>'shdc'.indexOf(s.slice(-1))*13+'23456789TJQKA'.indexOf(s.slice(0,-1));
  const prefix='2h 3d 9h 9d As Ks Qs Js Ts'.split(' ').map(index),deck=[...prefix,...Array.from({length:52},(_,i)=>i).filter(i=>!prefix.includes(i))];
  const game=new PokerMatch({initialStacks:[20,20]});game.deal(deck);game.act(0,'call');assert.equal(game.result.winner,null);assert.equal(getPokerReaction(game).mood,'neutral');
});

test('Reactions never inspect concealed cards and keep one frame per mood',()=>{
  const game={phase:'playing',actor:1,result:null};Object.defineProperty(game,'hands',{get(){throw Error('Hidden cards are private');}});
  assert.equal(getPokerReaction(game).frame,1);game.actor=0;assert.equal(getPokerReaction(game).frame,0);
  const frames=[0,1,2,3].map((_,i)=>i<2?getPokerReaction({...game,actor:i}).frame:getPokerReaction({phase:'finished',result:{},matchWinner:i===2?1:0}).frame);
  assert.deepEqual(frames,[0,1,2,3]);
});

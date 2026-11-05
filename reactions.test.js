import test from 'node:test';
import assert from 'node:assert/strict';
import {DiceMatch} from '../dice.js';
import {getOpponentReaction,REACTION_FRAMES} from '../dice-reactions.js';

test('Drake thinks during an unscored player selection and returns to neutral for a valid combination',()=>{
  const faces=[1,1,1,2,3,4];let i=0;const game=new DiceMatch({rollDie:()=>faces[i++]});
  assert.equal(getOpponentReaction(game).mood,'neutral');assert.equal(getOpponentReaction(game,{rolling:true}).frame,0);
  game.roll();assert.equal(getOpponentReaction(game).mood,'thinking');
  game.select([5]);assert.equal(getOpponentReaction(game).line,'Это пока не зачёт.');
  game.select([0,1,2]);assert.equal(game.selectedScore,1000);assert.equal(getOpponentReaction(game).frame,0);
  game.toggle(5);assert.equal(getOpponentReaction(game).mood,'thinking');
  game.toggle(5);assert.equal(getOpponentReaction(game).mood,'neutral');
  assert.deepEqual(Object.keys(REACTION_FRAMES).sort(),['lose','neutral','thinking','win']);
});
test('Drake thinks while taking his own turn, without a transient victory or defeat face',()=>{
  const game=new DiceMatch({rollDie:()=>1});game.player=1;
  assert.equal(getOpponentReaction(game).frame,5);assert.equal(getOpponentReaction(game,{rolling:true}).frame,5);
  game.roll();game.select([0,1,2]);assert.equal(getOpponentReaction(game).mood,'thinking');
});
test('Match victory and defeat keep the original Drake faces and replay restores neutral',()=>{
  for(const winner of [0,1]){
    const game=new DiceMatch({target:1500,rollDie:()=>1});game.player=winner;game.roll();game.select([0,1,2,3,4,5]);game.bank();
    const reaction=getOpponentReaction(game,{rolling:true});assert.equal(reaction.frame,winner===1?3:4);
    game.reset();assert.equal(getOpponentReaction(game).frame,0);
  }
});

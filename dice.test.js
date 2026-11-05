import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreDice,scoringMoves,DiceMatch,chooseDiceMove} from '../dice.js';

function scripted(faces,target=4000) {
  let cursor=0;
  return new DiceMatch({target,rollDie:()=>{
    assert.ok(cursor<faces.length,'Unexpected extra die roll');
    return faces[cursor++];
  }});
}

test('KCD II singles, triples and doubling for four to six equal dice',()=>{
  assert.equal(scoreDice([1]),100);assert.equal(scoreDice([5]),50);
  for(let face=1;face<=6;face++)for(let n=3;n<=6;n++)
    assert.equal(scoreDice(Array(n).fill(face)),(face===1?1000:face*100)*2**(n-3));
  assert.equal(scoreDice([1,1]),200);assert.equal(scoreDice([5,5]),100);
});
test('KCD II straights, mixed combinations and exact accounting of selected dice',()=>{
  assert.equal(scoreDice([1,2,3,4,5]),500);
  assert.equal(scoreDice([2,3,4,5,6]),750);
  assert.equal(scoreDice([6,3,2,5,1,4]),1500);
  assert.equal(scoreDice([1,2,3,4,5,5]),550);
  assert.equal(scoreDice([2,2,2,3,3,3]),500);
  assert.equal(scoreDice([1,1,1,5,5,5]),1500);
  assert.equal(scoreDice([1,2]),0);assert.equal(scoreDice([2,2]),0);
  assert.equal(scoreDice([2,2,3,3,4,4]),0,'No three-pairs house rule');
  for(const invalid of [[],[0],[7],[NaN],[1,1,1,1,1,1,1]])assert.equal(scoreDice(invalid),0);
});
test('A selection containing non-scoring dice cannot be banked or rerolled',()=>{
  const m=scripted([1,2,3,4,6,2]);m.roll();
  m.select([0,1]);assert.equal(m.bankable,false);
  assert.equal(m.bank(),false);assert.equal(m.keepAndRoll(),false);
  assert.deepEqual(m.scores,[0,0]);
  m.select([0]);assert.equal(m.bank(),true);
  assert.deepEqual(m.scores,[100,0]);assert.equal(m.player,1);
  assert.equal(m.available.length,6);assert.equal(m.phase,'ready');
});
test('Kept dice are excluded from later rolls and cannot complete later triples',()=>{
  const m=scripted([1,2,3,4,6,2,1,1,2,3,4]);
  m.roll();m.select([0]);m.keepAndRoll();
  assert.equal(m.turnPoints,100);assert.equal(m.available.length,5);
  m.roll();assert.equal(m.values[0],1);
  assert.equal(m.select([0,1,2]),false,'Cannot reselect old dice');
  m.select([1,2]);assert.equal(m.selectedScore,200);
  m.bank();assert.equal(m.scores[0],300,'Three ones from different rolls are not a triple');
});
test('A bust loses only the current turn and passes all six dice to the opponent',()=>{
  const m=scripted([1,2,3,4,6,2,2,3,4,6,2]);
  m.scores=[500,300];m.roll();m.select([0]);m.keepAndRoll();m.roll();
  assert.equal(m.phase,'bust');assert.equal(m.turnPoints,0);
  assert.deepEqual(m.scores,[500,300]);assert.equal(m.lastEvent.points,100);
  assert.equal(m.bank(),false);m.finishBust();
  assert.equal(m.player,1);assert.equal(m.phase,'ready');
  assert.equal(m.locked.size,0);assert.equal(m.available.length,6);
});
test('Using all six scoring dice allows six new dice without losing accumulated points',()=>{
  const m=scripted([1,2,3,4,5,6,1,2,2,3,4,6]);
  m.roll();m.select([0,1,2,3,4,5]);m.keepAndRoll();
  assert.equal(m.hotDice,true);assert.equal(m.turnPoints,1500);assert.equal(m.available.length,6);
  m.roll();m.select([0]);m.bank();assert.equal(m.scores[0],1600);
});
test('A bank can overshoot the target and wins immediately without a bonus opponent turn',()=>{
  const m=scripted([1,2,3,4,6,2],1500);m.scores[0]=1450;
  m.roll();m.select([0]);m.bank();
  assert.equal(m.scores[0],1550);assert.equal(m.winner,0);assert.equal(m.phase,'finished');
  assert.equal(m.roll(),false);assert.equal(m.finishBust(),false);
});
test('Opponent banks a winning roll and never selects held or non-scoring dice',()=>{
  const m=scripted([1,2,3,4,6,2]);m.player=1;m.scores[1]=3900;m.roll();
  const move=chooseDiceMove(m);assert.equal(move.bank,true);assert.deepEqual(move.indices,[0]);
  m.select(move.indices);m.bank();assert.equal(m.winner,1);
});
test('Selection bounds and duplicate indices cannot corrupt game state',()=>{
  const m=scripted([1,2,3,4,5,6]);
  assert.equal(m.toggle(0),false);m.roll();
  for(const selection of [[0,0],[-1],[6],[1.5]])assert.equal(m.select(selection),false);
  assert.equal(m.toggle(6),false);assert.equal(m.selected.size,0);
});
test('Seeded complete matches terminate legally with both sides using only current-roll scoring',()=>{
  let seed=25102026;let winners=new Set();
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let game=0;game<60;game++) {
    const m=new DiceMatch({target:1500,rollDie:()=>Math.floor(random()*6)+1});
    let actions=0;
    while(m.phase!=='finished'&&actions++<1000) {
      if(m.phase==='ready')m.roll();
      else if(m.phase==='bust')m.finishBust();
      else {
        const move=chooseDiceMove(m);assert.ok(move);assert.ok(move.score>0);
        assert.ok(m.select(move.indices));
        if(move.bank)m.bank();else m.keepAndRoll();
      }
      assert.ok(m.turnPoints>=0);assert.ok(m.scores.every(n=>n>=0));
    }
    assert.equal(m.phase,'finished');assert.ok(m.scores[m.winner]>=m.target);winners.add(m.winner);
  }
  assert.equal(winners.size,2);
});

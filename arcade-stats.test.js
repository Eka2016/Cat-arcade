import test from 'node:test';
import assert from 'node:assert/strict';
import {RECORD_GAMES,sanitizeArcadeStats,recordArcadeResult,wordRoundOutcome} from '../arcade-stats.js';

test('Eight numeric score records migrate existing counters without inventing old victories or streaks',()=>{
 const stats=sanitizeArcadeStats(undefined,{dice:{wins:3,losses:2},poker:{wins:5,losses:8}});
 assert.deepEqual(Object.keys(stats),['snake','dice','poker','chess','checkers','domino','words','durak']);assert.equal(Object.keys(RECORD_GAMES).length,8);assert.equal(stats.dice.wins,3);assert.equal(stats.poker.losses,8);assert.equal(stats.poker.bestStreak,0);assert.equal(stats.chess.wins,0);assert.equal(stats.words.bestTotal,0);
 assert.throws(()=>recordArcadeResult(stats,'dnd','win'));assert.throws(()=>recordArcadeResult(stats,'truth','loss'));
});
test('Only completed results increment totals, and losses or draws end a streak without erasing its record',()=>{
 const original=sanitizeArcadeStats(),a=recordArcadeResult(original,'chess','win'),b=recordArcadeResult(a,'chess','win'),c=recordArcadeResult(b,'chess','draw'),d=recordArcadeResult(c,'chess','loss'),e=recordArcadeResult(d,'chess','win');
 assert.equal(original.chess.wins,0);assert.equal(a.chess.streak,1);assert.equal(b.chess.bestStreak,2);assert.equal(c.chess.streak,0);assert.equal(c.chess.draws,1);assert.equal(d.chess.losses,1);assert.equal(e.chess.wins,3);assert.equal(e.chess.bestStreak,2);assert.equal(e.chess.streak,1);assert.equal(e.checkers.wins,0);assert.deepEqual(sanitizeArcadeStats(JSON.parse(JSON.stringify(e))),e);
});
test('Word rounds use a stated seventy percent threshold and compare records fairly across short retry rounds',()=>{
 assert.equal(wordRoundOutcome(7,10),'win');assert.equal(wordRoundOutcome(6,10),'loss');assert.equal(wordRoundOutcome(1,2),'loss');assert.equal(wordRoundOutcome(2,2),'win');
 let stats=recordArcadeResult({},'words','win',{correct:1,total:1});stats=recordArcadeResult(stats,'words','win',{correct:7,total:10});assert.deepEqual([stats.words.bestCorrect,stats.words.bestTotal],[1,1]);stats=recordArcadeResult(stats,'words','win',{correct:10,total:10});assert.deepEqual([stats.words.bestCorrect,stats.words.bestTotal],[10,10]);stats=recordArcadeResult(stats,'words','loss',{correct:0,total:1});assert.equal(stats.words.wins,3);assert.equal(stats.words.losses,1);assert.equal(stats.words.bestStreak,3);assert.equal(stats.words.streak,0);
 for(const args of [[-1,10],[11,10],[1,0],[1,11],['7',10]])assert.throws(()=>wordRoundOutcome(...args));assert.throws(()=>recordArcadeResult(stats,'words','win',{correct:6,total:10}));
});
test('Malformed scores, overflow and unrelated data are removed during restore',()=>{
 const stats=sanitizeArcadeStats({chess:{wins:2,losses:-1,draws:Infinity,streak:50,bestStreak:40,chat:'PRIVATE_CHAT'},words:{wins:1000001,losses:NaN,bestTotal:20,bestCorrect:30,secret:'PRIVATE_KEY'},truth:{wins:15}});
 assert.deepEqual([stats.chess.wins,stats.chess.losses,stats.chess.draws,stats.chess.streak,stats.chess.bestStreak],[2,0,0,2,2]);assert.equal(stats.words.wins,1000000);assert.equal(stats.words.bestCorrect,10);assert.equal(stats.words.bestTotal,10);assert.ok(!JSON.stringify(stats).includes('PRIVATE'));assert.equal(stats.truth,undefined);assert.equal(recordArcadeResult(stats,'words','win',{correct:10,total:10}).words.wins,1000000);
});

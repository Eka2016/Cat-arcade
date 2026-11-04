import test from 'node:test';
import assert from 'node:assert/strict';
import {DurakGame} from '../durak.js';
const seed=n=>()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
const take=(g,card)=>{assert.ok(g.play({type:'attack',card}));assert.ok(g.play({type:'take'}));assert.ok(g.play({type:'pass'}));};
function all(g){return [...g.hands.flat(),...g.stock,...g.discard,...g.table.flatMap(p=>[p.attack,...(p.defense===null?[]:[p.defense])])];}
function fixture(hands,stock){
 const g=new DurakGame({random:seed(1)}),used=new Set([...hands.flat(),...stock]);
 Object.assign(g,{hands:hands.map(h=>[...h]),stock:[...stock],discard:Array.from({length:36},(_,i)=>i).filter(id=>!used.has(id)),attacker:0,phase:'attack',limit:Math.min(6,hands[1].length),table:[],journal:[],result:null,lastBout:null});return g;
}
test('First attack and opponent pickup refill the attacker by exactly one card: 5 to 6, stock 24 to 23',()=>{
 for(let i=0;i<1000;i++){
  const g=new DurakGame({random:seed(i)});g.attacker=0;const first=g.hands[0][0];
  take(g,first);assert.equal(g.hands[0].length,6,`seed ${i}: excess attacker cards`);assert.equal(g.hands[1].length,7);assert.equal(g.stock.length,23);assert.equal(g.attacker,0);
  assert.deepEqual(g.journal.filter(m=>m.type==='draw').map(m=>[m.player,m.count]),[[0,1]]);assert.equal(new Set(all(g)).size,36);assert.equal(all(g).length,36);
 }
});
test('A beaten first attack replenishes both hands separately, attacker first, without emptying the stock',()=>{
 const g=fixture([[0,9,18,27,1,2],[3,4,5,6,7,8]],Array.from({length:36},(_,i)=>i).filter(i=>![0,9,18,27,1,2,3,4,5,6,7,8].includes(i)));
 assert.ok(g.play({type:'attack',card:0}));assert.ok(g.play({type:'defend',card:3,index:0}));assert.ok(g.play({type:'pass'}));
 assert.deepEqual(g.hands.map(h=>h.length),[6,6]);assert.equal(g.stock.length,22);assert.deepEqual(g.journal.filter(m=>m.type==='draw').map(m=>[m.player,m.count]),[[0,1],[1,1]]);assert.equal(g.attacker,1);assert.equal(new Set(all(g)).size,36);
});
test('Multiple throw-ins cause only the corresponding refill up to six, while pickup cards stay with defender',()=>{
 const hands=[[0,9,18,1,2,3],[4,5,6,7,8,10]],stock=Array.from({length:36},(_,i)=>i).filter(i=>!hands.flat().includes(i)),g=fixture(hands,stock);
 for(const m of [{type:'attack',card:0},{type:'take'},{type:'attack',card:9},{type:'attack',card:18},{type:'pass'}])assert.ok(g.play(m));
 assert.deepEqual(g.hands.map(h=>h.length),[6,9]);assert.equal(g.stock.length,21);assert.deepEqual(g.journal.filter(m=>m.type==='draw').map(m=>[m.player,m.count]),[[0,3]]);for(const id of [0,9,18])assert.ok(g.hands[1].includes(id));assert.equal(new Set(all(g)).size,36);
});
test('A hand already above six after an earlier pickup receives no new stock cards',()=>{
 const hands=[[0,1,2,3,4,5,6,7],[8,9,10,11,12,13]],stock=Array.from({length:36},(_,i)=>i).filter(i=>!hands.flat().includes(i)),g=fixture(hands,stock);
 take(g,0);assert.deepEqual(g.hands.map(h=>h.length),[7,7]);assert.equal(g.stock.length,22);assert.equal(g.journal.filter(m=>m.type==='draw').length,0);
});
test('A short remaining stock gives at most the cards available, preserving attacker priority and last trump',()=>{
 const g=fixture([[0,9,18],[1,10,19]],[27,28,29]);g.trumpCard=27;g.trump=3;
 assert.ok(g.play({type:'attack',card:0}));assert.ok(g.play({type:'defend',card:1,index:0}));assert.ok(g.play({type:'pass'}));
 assert.deepEqual(g.hands.map(h=>h.length),[5,2]);assert.equal(g.stock.length,0);assert.deepEqual(g.journal.filter(m=>m.type==='draw').map(m=>[m.player,m.count]),[[0,3]]);assert.deepEqual(g.hands[0].slice(-3),[29,28,27]);assert.equal(new Set(all(g)).size,36);
});
test('A second end-attack click cannot repeat a completed pickup or a stock draw',()=>{
 const g=new DurakGame({random:seed(2)});g.attacker=0;take(g,g.hands[0][0]);const before=JSON.stringify(g);
 assert.equal(g.play({type:'pass'}),false);assert.equal(JSON.stringify(g),before);assert.equal(g.hands[0].length,6);
});

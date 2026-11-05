import test from 'node:test';
import assert from 'node:assert/strict';
import {DurakGame,chooseDurakMove} from '../durak.js';
import {chooseDurakOpponentMove} from '../durak-opponent.js';
import {sanitizeSettings} from '../arcade.js';
const c=(s,r)=>s*9+r-6;
const seed=n=>()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
const same=(a,b)=>a.type===b?.type&&a.card===b.card&&a.index===b.index;

test('Durak difficulty restores safely and coexists with existing character choices, records and libraries',()=>{
  for(const level of ['easy','normal','hard']){
    const saved=sanitizeSettings({durakDifficulty:level,characters:{durak:false,poker:false},gameStats:{durak:{wins:3,losses:2,draws:1}},records:{normal:17}}),again=sanitizeSettings(JSON.parse(JSON.stringify(saved)));
    assert.equal(again.durakDifficulty,level);assert.equal(again.characters.durak,false);assert.equal(again.characters.poker,false);assert.equal(again.gameStats.durak.wins,3);assert.equal(again.gameStats.durak.draws,1);assert.equal(again.records.normal,17);assert.equal(again.wordLibrary.cards.length,48);
  }
  for(const value of [null,undefined,'evil',1,{},['hard']])assert.equal(sanitizeSettings({durakDifficulty:value}).durakDifficulty,'normal');
});
test('Opponent memory remembers public pickups, removes played cards and never reveals private draws',()=>{
  const g=new DurakGame({random:seed(4)});
  g.journal=[{type:'deal',hand:[34,35]},{type:'draw',player:0,count:2,cards:[31,32]},{type:'pickup',player:0,cards:[0,1]},{type:'attack',player:0,card:0}];
  const view=g.view(1);assert.deepEqual(view.opponentKnown,[1]);
  for(const key of ['journal','hands','stock','opponentHand'])assert.equal(view[key],undefined);
  view.opponentKnown.push(999);view.discard.push(998);assert.deepEqual(g.discard,[]);assert.deepEqual(g.view(1).opponentKnown,[1]);
});
test('The face-up last trump is remembered when visibly drawn and forgotten when played',()=>{
  const g=new DurakGame({random:seed(1)});
  Object.assign(g,{hands:[[1,5],[0,4]],stock:[27],trump:3,trumpCard:27,attacker:1,limit:2,phase:'attack',table:[],journal:[],discard:[],result:null});
  for(const m of [{type:'attack',card:0},{type:'defend',card:1,index:0},{type:'pass'}])assert.ok(g.play(m));
  assert.deepEqual(g.view(0).opponentKnown,[27]);
  assert.ok(g.play({type:'attack',card:5}));assert.ok(g.play({type:'defend',card:27,index:0}));assert.deepEqual(g.view(0).opponentKnown,[]);
});
test('Hard play finds the winning lead rather than giving away the last defense in a fully deducible ending',()=>{
  const g=new DurakGame({random:seed(1)}),hands=[[c(0,7)],[c(0,6),c(2,7)]];
  Object.assign(g,{hands,stock:[],discard:Array.from({length:36},(_,i)=>i).filter(i=>!hands.flat().includes(i)),table:[],attacker:1,phase:'attack',trump:3,trumpCard:27,limit:1,journal:[],result:null});
  const view=g.view(),before=JSON.stringify(g);
  assert.equal(chooseDurakMove(view).card,c(0,6));
  const hard=chooseDurakOpponentMove(view,'hard',seed(7),{now:()=>0,maxNodes:20000});assert.equal(hard.card,c(2,7));assert.equal(JSON.stringify(g),before);
});
test('Hard decisions depend on the public snapshot rather than hidden real hands or stock order',()=>{
  const g=new DurakGame({random:seed(8)}),view=g.view(),before=JSON.stringify(view);
  const first=chooseDurakOpponentMove(view,'hard',seed(77),{now:()=>0,maxNodes:6000});
  g.hands[1-view.player].reverse();g.stock.reverse();
  const again=chooseDurakOpponentMove(view,'hard',seed(77),{now:()=>0,maxNodes:6000});assert.deepEqual(first,again);assert.equal(JSON.stringify(view),before);
});
test('A budget expiry returns a legal fallback and normal preserves the previous opponent behavior',()=>{
  const g=new DurakGame({random:seed(2)}),view=g.view();
  for(const limits of [{maxMs:0},{maxNodes:0},{maxNodes:1},{samples:0}])assert.ok(view.moves.some(m=>same(m,chooseDurakOpponentMove(view,'hard',seed(1),limits))));
  assert.deepEqual(chooseDurakOpponentMove(view,'normal'),chooseDurakMove(view));assert.deepEqual(chooseDurakOpponentMove(view,'unknown'),chooseDurakMove(view));
  assert.equal(chooseDurakOpponentMove({...view,moves:[]},'hard'),null);
});
test('Easy play can take voluntarily or spend a costly card while always staying within the rules',()=>{
  const view={hand:[1,27],trump:3,stockCount:20,phase:'defend',table:[{attack:0,defense:null}],moves:[{type:'defend',card:1,index:0},{type:'defend',card:27,index:0},{type:'take'}]};
  assert.equal(chooseDurakOpponentMove(view,'easy',()=>0).type,'take');
  const costly=chooseDurakOpponentMove(view,'easy',()=>.99);assert.equal(costly.card,27);assert.ok(view.moves.some(m=>same(m,costly)));
});
test('All three levels finish real matches with legal moves and preserve every card',()=>{
  for(const level of ['easy','normal','hard'])for(let n=0;n<12;n++){
    const g=new DurakGame({random:seed(n)}),random=seed(n+101);let plies=0;
    while(!g.result&&plies++<2500){
      const player=g.turn,view=g.view(),move=player===n%2?chooseDurakOpponentMove(view,level,random,{now:()=>0,maxNodes:1800,samples:4}):chooseDurakMove(view);
      assert.ok(view.moves.some(m=>same(m,move)));assert.ok(g.play(move));
      const cards=[...g.hands.flat(),...g.stock,...g.discard,...g.table.flatMap(p=>[p.attack,...(p.defense===null?[]:[p.defense])])];assert.equal(cards.length,36);assert.equal(new Set(cards).size,36);
    }
    assert.ok(g.result,`${level}, seed ${n} did not finish`);
  }
});

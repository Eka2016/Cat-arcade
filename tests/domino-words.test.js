import test from 'node:test';
import assert from 'node:assert/strict';
import {DominoGame,DOMINO_SET,chooseDominoMove} from '../domino.js';
import {WordGame,WORDS,sanitizeWordProgress} from '../words.js';
const id=(a,b)=>DOMINO_SET.findIndex(t=>t[0]===Math.min(a,b)&&t[1]===Math.max(a,b));
const seed=(initial=87)=>{let n=initial;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);};
function fixture(){const g=new DominoGame();g.turn=0;g.chain=[{id:id(3,5),a:3,b:5}];g.hands=[[id(1,3),id(0,0)],[id(5,6),id(0,2)]];g.stock=[];return g;}
test('Domino deals all 28 tiles and opens with the highest dealt double',()=>{
  const g=new DominoGame({random:seed()});assert.equal(DOMINO_SET.length,28);assert.deepEqual(g.hands.map(h=>h.length),[7,7]);assert.equal(g.stock.length,14);
  assert.equal(new Set([...g.hands.flat(),...g.stock]).size,28);const doubles=g.hands.flat().filter(i=>DOMINO_SET[i][0]===DOMINO_SET[i][1]);
  assert.equal(g.opening,Math.max(...doubles));assert.ok(g.hands[g.turn].includes(g.opening));assert.equal(g.play(g.opening,'right'),true);
});
test('Domino matches either end with correct orientation and rejects the wrong side',()=>{
  const g=fixture();assert.equal(g.play(id(1,3),'right'),false);assert.equal(g.play(id(1,3),'left'),true);assert.deepEqual(g.ends,[1,5]);
  assert.equal(g.play(id(5,6),'right'),true);assert.deepEqual(g.ends,[1,6]);for(let i=1;i<g.chain.length;i++)assert.equal(g.chain[i-1].b,g.chain[i].a);
});
test('Domino draw continues until playable and cannot skip an available move',()=>{
  const g=fixture();g.chain=[{id:id(5,6),a:6,b:5}];g.hands[0]=[id(0,1)];g.stock=[id(6,6),id(4,4),id(2,2)];
  assert.equal(g.draw(),true);assert.equal(g.lastAction.count,3);assert.equal(g.stock.length,0);assert.ok(g.moves().length);assert.equal(g.draw(),false);assert.equal(g.pass(),false);
});
test('A blocked domino round compares remaining pips, including ties',()=>{
  for(const tie of [false,true]){const g=fixture();g.chain=[{id:id(6,6),a:6,b:6}];g.hands=[[tie?id(0,2):id(0,0)],[id(1,1)]];
    assert.equal(g.pass(),true);assert.equal(g.pass(),true);assert.equal(g.result.reason,'blocked');assert.equal(g.result.winner,tie?null:0);
  }
});
test('Domino bot sees its own hand only and whole games conserve every tile',()=>{
  const random=seed();for(let n=0;n<80;n++){
    const g=new DominoGame({random});let turns=0;
    while(!g.result&&turns++<150){const view=g.view();assert.equal(Object.hasOwn(view,'hands'),false);assert.equal(typeof view.stock,'number');
      const move=chooseDominoMove(view);if(move)assert.equal(g.play(move.id,move.side),true);else if(g.stock.length)assert.equal(g.draw(),true);else assert.equal(g.pass(),true);
      const all=[...g.hands.flat(),...g.stock,...g.chain.map(t=>t.id)];assert.equal(all.length,28);assert.equal(new Set(all).size,28);
    }assert.ok(g.result);
  }
});
test('English answers are distinct and a wrong word returns later',()=>{
  assert.equal(WORDS.length,48);assert.equal(new Set(WORDS.map(w=>w.id)).size,48);assert.equal(new Set(WORDS.map(w=>w.ru)).size,48);
  const g=new WordGame({random:seed()}),original=g.word.id;assert.equal(g.options.length,4);assert.equal(new Set(g.options.map(o=>o.text)).size,4);
  const wrong=g.options.findIndex(o=>o.id!==original);assert.equal(g.answer(wrong),true);assert.equal(g.answer(wrong),false);
  assert.equal(g.queue.indexOf(original),3);assert.equal(g.progress[original].wrong,1);assert.equal(g.progress[original].streak,0);
  while(g.phase!=='finished'){if(g.phase==='feedback')g.next();else g.answer(g.options.findIndex(o=>o.id===g.word.id));}
  assert.equal(g.firstCorrect,9);assert.equal(g.mistakes.size,1);assert.equal(g.attempts,11);assert.equal(g.progress[original].streak,0,'A retry must not count as an error-free round');
});
test('English topics, reverse mode, persisted mastery and corrupt progress',()=>{
  assert.deepEqual(sanitizeWordProgress({cat:{correct:2,wrong:-4,streak:99},alien:{correct:999},dog:{correct:Infinity,streak:NaN}}),{cat:{correct:2,wrong:0,streak:3},dog:{correct:0,wrong:0,streak:0}});
  const g=new WordGame({random:seed()});g.start({topic:'forest',mode:'ru-en'});assert.equal(g.word.topic,'forest');assert.ok(g.options.some(o=>o.text===g.word.en));
  for(let round=0;round<3;round++){g.start({ids:['cat']});assert.equal(g.answer(g.options.findIndex(o=>o.id==='cat')),true);g.next();}
  assert.equal(g.progress.cat.streak,3);assert.equal(g.learned,1);assert.equal(new WordGame({progress:structuredClone(g.progress)}).learned,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {DurakGame,beatsDurakCard} from '../durak.js';
import {chooseDurakOpponentMove} from '../durak-opponent.js';

const seed=n=>()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
const suit=id=>Math.floor(id/9),rank=id=>id%9;
const beats=(d,a,t)=>(suit(d)===suit(a)&&rank(d)>rank(a))||(suit(d)===t&&suit(a)!==t);
const turn=s=>s.phase==='defend'?1-s.attacker:s.attacker;
const ordered=xs=>xs.map(x=>JSON.stringify(x)).sort();
const snapshot=g=>structuredClone({hands:g.hands,stock:g.stock,discard:g.discard,table:g.table,attacker:g.attacker,trump:g.trump,trumpCard:g.trumpCard,phase:g.phase,limit:g.limit,bout:g.bout,result:g.result,lastBout:g.lastBout});

// Independent rules oracle: does not call the engine's card, move, play or refill helpers.
function legal(s){
 if(s.result)return [];
 const hand=s.hands[turn(s)],out=[];
 if(s.phase==='defend'){
  for(let index=0;index<s.table.length;index++)if(s.table[index].defense===null)
   for(const card of hand)if(beats(card,s.table[index].attack,s.trump))out.push({type:'defend',card,index});
  out.push({type:'take'});return out;
 }
 const ranks=s.table.flatMap(p=>[p.attack,p.defense]).filter(c=>c!==null).map(rank);
 for(const card of hand)if(s.table.length<s.limit&&(!s.table.length||ranks.includes(rank(card))))out.push({type:'attack',card});
 if(s.table.length)out.push({type:'pass'});
 return out;
}
function advance(s,m){
 const who=turn(s);
 if(m.type==='attack'||m.type==='defend')s.hands[who]=s.hands[who].filter(c=>c!==m.card);
 if(m.type==='attack'){s.table.push({attack:m.card,defense:null});if(s.phase!=='taking')s.phase='defend';return;}
 if(m.type==='defend'){s.table[m.index].defense=m.card;s.phase='attack';return;}
 if(m.type==='take'){s.phase='taking';return;}
 const defender=1-s.attacker,taking=s.phase==='taking',pairs=structuredClone(s.table);
 for(const pair of s.table)for(const c of [pair.attack,pair.defense])if(c!==null)(taking?s.hands[defender]:s.discard).push(c);
 s.lastBout={pairs,taking,defender};s.table=[];
 for(const p of [s.attacker,defender])while(s.hands[p].length<6&&s.stock.length)s.hands[p].push(s.stock.pop());
 if(!s.stock.length&&s.hands.some(h=>!h.length)){
  s.result={winner:!s.hands[0].length?(!s.hands[1].length?null:0):1,reason:s.hands.every(h=>!h.length)?'draw':'empty'};s.phase='finished';return;
 }
 if(!taking)s.attacker=defender;
 s.bout++;s.limit=Math.min(6,s.hands[1-s.attacker].length);s.phase='attack';
}
function fixture(hands,{stock=[],attacker=0,trump=3}={}){
 const g=new DurakGame({random:seed(1)}),used=new Set([...hands.flat(),...stock]);
 Object.assign(g,{hands:structuredClone(hands),stock:[...stock],discard:Array.from({length:36},(_,i)=>i).filter(i=>!used.has(i)),table:[],attacker,trump,trumpCard:stock[0]??27,limit:Math.min(6,hands[1-attacker].length),phase:'attack',bout:1,result:null,journal:[],lastBout:null,lastPlayerAction:null});return g;
}
function play(g,...moves){for(const m of moves)assert.equal(g.play(m),true,JSON.stringify(m));}

test('All 5,184 defense/trump combinations follow strict rank and suit rules',()=>{
 for(let t=0;t<4;t++)for(let a=0;a<36;a++)for(let d=0;d<36;d++)assert.equal(beatsDurakCard(d,a,t),beats(d,a,t),`${d} against ${a}, trump ${t}`);
});
test('180 complete matches at all levels match an independent rules oracle after every action',()=>{
 for(const level of ['easy','normal','hard'])for(let n=0;n<60;n++){
  const g=new DurakGame({random:seed(50+n)}),s=snapshot(g),random=seed(n+700);let plies=0;
  while(!s.result&&plies++<3000){
   assert.deepEqual(ordered(g.moves()),ordered(legal(s)),`${level}/${n}/${plies}: legal moves`);
   assert.deepEqual(g.moves(1-turn(s)),[]);
   const moves=legal(s),m=plies%4===0?moves[Math.floor(random()*moves.length)]:chooseDurakOpponentMove(g.view(),level,random,{now:()=>0,maxNodes:900,samples:2});
   assert.ok(ordered(moves).includes(JSON.stringify(m)));assert.ok(g.play(m));advance(s,m);
   assert.deepEqual(snapshot(g),s,`${level}/${n}/${plies}: state`);
   const all=[...g.hands.flat(),...g.stock,...g.discard,...g.table.flatMap(p=>[p.attack,p.defense]).filter(c=>c!==null)];
   assert.equal(all.length,36);assert.equal(new Set(all).size,36);
   if(g.stock.length)assert.equal(g.stock[0],g.trumpCard);
   for(const player of [0,1])for(const known of g.view(player).opponentKnown)assert.ok(g.hands[1-player].includes(known),'public memory must not retain a card already played');
  }
  assert.ok(s.result,`${level}/${n}: stalled`);assert.deepEqual(g.moves(),[]);
 }
});
test('Throw-ins after a partial defense and take include defense ranks; the starting defender limit stays fixed',()=>{
 const g=fixture([[0,10,19,28],[1,11,20]],{stock:[27,35,34]});
 play(g,{type:'attack',card:0},{type:'defend',card:1,index:0},{type:'attack',card:10},{type:'take'});
 assert.equal(g.limit,3);assert.equal(g.hands[1].length,2);assert.ok(g.moves().some(m=>m.card===19));
 play(g,{type:'attack',card:19});assert.deepEqual(g.moves(),[{type:'pass'}]);
 play(g,{type:'pass'});assert.equal(g.attacker,0);for(const id of [0,1,10,19])assert.ok(g.hands[1].includes(id));
 assert.deepEqual(g.journal.filter(m=>m.type==='draw').map(m=>[m.player,m.count]),[[0,3]]);
});
test('At most six attacks even when the defender began with more than six cards',()=>{
 const g=fixture([[0,9,18,27,10,19,28],[1,11,20,29,12,21,3,4]]);
 let index=0;
 for(const [card,defense] of [[0,1],[9,11],[18,20],[27,29],[10,12],[19,21]])
  play(g,{type:'attack',card},{type:'defend',card:defense,index:index++});
 assert.equal(g.table.length,6);assert.equal(g.hands[1].length,2);assert.ok(g.hands[0].includes(28));
 assert.deepEqual(g.moves(),[{type:'pass'}]);
});
test('The defender may take voluntarily and must take every attack and defense card',()=>{
 const g=fixture([[0,9,2],[1,10,3]]);
 play(g,{type:'attack',card:0});assert.ok(g.moves().some(m=>m.type==='defend'));play(g,{type:'take'},{type:'attack',card:9},{type:'pass'});
 assert.deepEqual(g.hands[1],[1,10,3,0,9]);assert.equal(g.discard.includes(0),false);assert.equal(g.attacker,0);
});
test('Final covered attack can win for either side or draw; stock refill precedes result checking',()=>{
 for(const attacker of [0,1]){
  const hands=[];hands[attacker]=[0];hands[1-attacker]=[1];const g=fixture(hands,{attacker});
  play(g,{type:'attack',card:0},{type:'defend',card:1,index:0});assert.equal(g.result,null);play(g,{type:'pass'});assert.equal(g.result.winner,null);
  const h=fixture(hands,{attacker,stock:[27]});play(h,{type:'attack',card:0},{type:'defend',card:1,index:0},{type:'pass'});
  assert.equal(h.result.winner,1-attacker);assert.deepEqual(h.hands[attacker],[27]);
 }
 for(const hands of [[[0,9],[1]],[[0],[1,10]]]){
  const g=fixture(hands);play(g,{type:'attack',card:0},{type:'defend',card:1,index:0},{type:'pass'});assert.equal(g.result.winner,hands[0].length===1?0:1);
 }
});
test('A last attack is not a win until take and all allowed throw-ins are completed',()=>{
 const g=fixture([[8],[0]],{stock:[27]});play(g,{type:'attack',card:8});assert.equal(g.result,null);play(g,{type:'take'});assert.equal(g.result,null);play(g,{type:'pass'});
 assert.equal(g.result,null);assert.deepEqual(g.hands[0],[27]);assert.equal(g.stock.length,0);
});
test('Malformed, stale and impossible actions leave all cards and journal unchanged',()=>{
 const g=fixture([[0,9,18],[1,10,19]]);
 for(const state of [0,1,2,3]){
  if(state===1)play(g,{type:'attack',card:0});if(state===2)play(g,{type:'defend',card:1,index:0});if(state===3)play(g,{type:'pass'});
  for(const m of [null,{},'pass',{type:'attack',card:36},{type:'attack',card:'9'},{type:'defend',card:10,index:-1},{type:'defend',card:19,index:99},{type:'transfer',card:9}]){
   const before=JSON.stringify(g);assert.equal(g.play(m),false);assert.equal(JSON.stringify(g),before);
  }
 }
});
test('Direct bout completion rejects an empty table, an outstanding defense and a duplicate call',()=>{
 const g=fixture([[0,9],[1,10]],{stock:[27,28]});
 let before=JSON.stringify(g);assert.equal(g.endBout(),false);assert.equal(JSON.stringify(g),before);
 play(g,{type:'attack',card:0});before=JSON.stringify(g);assert.equal(g.endBout(),false);assert.equal(JSON.stringify(g),before);
 play(g,{type:'take'},{type:'pass'});before=JSON.stringify(g);assert.equal(g.endBout(),false);assert.equal(JSON.stringify(g),before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {DurakGame,durakCard,durakCardText,beatsDurakCard,chooseDurakMove} from '../durak.js';
import {makeGameResult,gameJournalText,sanitizeGameReport,sanitizeGameReports,gameReportChatText} from '../game-report.js';
import {recordArcadeResult,sanitizeArcadeStats} from '../arcade-stats.js';
const c=(s,r)=>s*9+r-6;
const seed=n=>()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
function position({hands,stock=[],attacker=0,trump=3,table=[],phase='attack',limit=6}={}){
  const g=new DurakGame({random:seed(1)});Object.assign(g,{hands:hands.map(h=>[...h]),stock:[...stock],attacker,trump,table:table.map(p=>({...p})),phase,limit,journal:[],result:null,discard:[],lastPlayerAction:null});return g;
}
test('36 unique cards, six per hand, lowest trump starts, turned card remains last in stock',()=>{
  for(let i=0;i<100;i++){
    const g=new DurakGame({random:seed(i)}),all=[...g.stock,...g.hands.flat()];
    assert.equal(new Set(all).size,36);assert.equal(g.stock.length,24);assert.deepEqual(g.hands.map(h=>h.length),[6,6]);assert.equal(g.stock[0],g.trumpCard);
    const ranks=g.hands.map(h=>Math.min(...h.filter(id=>durakCard(id).suit===g.trump).map(id=>durakCard(id).rank)));
    if(ranks[0]!==ranks[1])assert.equal(g.attacker,ranks[0]<ranks[1]?0:1);
  }
  assert.equal(durakCardText(c(3,14)),'Т♠');assert.throws(()=>durakCard(36));
});
test('A defense needs a higher same-suit card or trump, and trump needs a higher trump',()=>{
  assert.ok(beatsDurakCard(c(0,8),c(0,7),3));assert.ok(beatsDurakCard(c(3,6),c(0,14),3));
  for(const [d,a] of [[c(0,6),c(0,7)],[c(1,14),c(0,7)],[c(0,14),c(3,6)],[c(3,6),c(3,7)],[c(3,7),c(3,7)]])assert.equal(beatsDurakCard(d,a,3),false);
});
test('Throw-ins may match defense ranks, cannot exceed starting hand, and illegal moves do not mutate',()=>{
  const g=position({hands:[[c(0,6),c(1,7),c(2,8)],[c(0,7),c(1,8)]],limit:2});
  assert.ok(g.play({type:'attack',card:c(0,6)}));assert.ok(g.play({type:'defend',card:c(0,7),index:0}));
  assert.ok(g.moves().some(m=>m.card===c(1,7)));assert.ok(!g.moves().some(m=>m.card===c(2,8)));
  const before=JSON.stringify(g);assert.equal(g.play({type:'attack',card:c(2,8)}),false);assert.equal(JSON.stringify(g),before);
  assert.ok(g.play({type:'attack',card:c(1,7)}));assert.ok(g.play({type:'defend',card:c(1,8),index:1}));
  assert.deepEqual(g.moves(),[{type:'pass'}]);assert.equal(g.result,null);assert.ok(g.play({type:'pass'}));
  assert.equal(g.result.winner,1);assert.equal(g.discard.length,4);
});
test('Taking keeps the table for legal extra throw-ins, including a beaten card, then skips defender',()=>{
  const g=position({hands:[[c(0,6),c(1,7),c(2,7),c(3,9)],[c(0,7),c(2,8),c(1,9)]],stock:[c(3,6),c(0,10),c(1,10)],limit:3});
  for(const m of [{type:'attack',card:c(0,6)},{type:'defend',card:c(0,7),index:0},{type:'attack',card:c(1,7)},{type:'take'}])assert.ok(g.play(m));
  assert.equal(g.phase,'taking');assert.equal(g.turn,0);assert.equal(g.hands[1].length,2);
  assert.ok(g.play({type:'attack',card:c(2,7)}));assert.deepEqual(g.moves(),[{type:'pass'}]);assert.ok(g.play({type:'pass'}));
  assert.equal(g.attacker,0);assert.equal(g.phase,'attack');assert.equal(g.bout,2);assert.equal(g.discard.length,0);
  for(const id of [c(0,6),c(0,7),c(1,7),c(2,7)])assert.ok(g.hands[1].includes(id));
  assert.equal(g.lastBout.taking,true);
});
test('After a successful defense attacker draws first and exposed trump is drawn last',()=>{
  const g=position({hands:[[c(0,6),c(1,6)],[c(0,7),c(1,7)]],stock:[c(3,6),c(2,14)],limit:2});
  for(const m of [{type:'attack',card:c(0,6)},{type:'defend',card:c(0,7),index:0},{type:'pass'}])assert.ok(g.play(m));
  assert.equal(g.attacker,1);assert.equal(g.stock.length,0);assert.ok(g.hands[0].includes(c(2,14)));assert.ok(g.hands[0].includes(c(3,6)));assert.equal(g.hands[1].length,1);
  assert.deepEqual(g.journal.filter(m=>m.type==='draw').map(m=>m.player),[0]);
});
test('Game ends only after the final bout: simultaneous empty hands draw, failed defense loses',()=>{
  const draw=position({hands:[[c(0,6)],[c(0,7)]],limit:1});
  assert.ok(draw.play({type:'attack',card:c(0,6)}));assert.equal(draw.result,null);
  assert.ok(draw.play({type:'defend',card:c(0,7),index:0}));assert.equal(draw.result,null);
  assert.ok(draw.play({type:'pass'}));assert.equal(draw.result.winner,null);assert.deepEqual(draw.moves(),[]);
  const win=position({hands:[[c(0,14)],[c(0,6)]],limit:1});
  for(const m of [{type:'attack',card:c(0,14)},{type:'take'},{type:'pass'}])assert.ok(win.play(m));
  assert.equal(win.result.winner,0);assert.equal(win.hands[1].length,2);
});
test('A player who used their last card still draws when stock remains, not an early victory',()=>{
  const g=position({hands:[[c(0,6)],[c(0,7)]],stock:[c(3,6),c(2,8)],limit:1});
  for(const m of [{type:'attack',card:c(0,6)},{type:'take'},{type:'pass'}])assert.ok(g.play(m));
  assert.equal(g.result,null);assert.equal(g.hands[0].length,2);assert.equal(g.hands[1].length,2);
});
test('AI input contains no opponent hand or stock order and is an isolated snapshot',()=>{
  const g=new DurakGame({random:seed(8)}),view=g.view(),before=JSON.stringify(g);
  assert.equal(view.hands,undefined);assert.equal(view.stock,undefined);assert.equal(view.opponentHand,undefined);
  view.hand.length=0;view.table.push({attack:999});view.moves.length=0;assert.equal(JSON.stringify(g),before);
  assert.ok(g.moves().some(m=>JSON.stringify(m)===JSON.stringify(chooseDurakMove(g.view()))));
});
test('300 seeded matches preserve every card, restrict all AI moves and finish without stalling',()=>{
  for(let i=0;i<300;i++){
    const g=new DurakGame({random:seed(i)});let plies=0;
    while(!g.result&&plies++<3000){
      const all=[...g.hands.flat(),...g.stock,...g.discard,...g.table.flatMap(p=>[p.attack,...(p.defense===null?[]:[p.defense])])];
      assert.equal(all.length,36);assert.equal(new Set(all).size,36);assert.ok(g.table.length<=g.limit);
      assert.ok(g.play(chooseDurakMove(g.view())));
    }
    assert.ok(g.result,`Seed ${i} stalled after ${plies}`);
    assert.equal(g.stock.length,0);assert.ok(g.hands.some(h=>h.length===0));
  }
});
test('Durak journal, last move, final position and saved chat report use real game facts',()=>{
  const g=position({hands:[[c(0,14)],[c(0,6)]],limit:1});
  for(const m of [{type:'attack',card:c(0,14)},{type:'take'},{type:'pass'}])g.play(m);
  const r=makeGameResult('durak',g),saved=sanitizeGameReport({version:1,id:'f'.repeat(32),...r});
  assert.equal(r.outcome,'win');assert.match(r.lastMove,/Последняя сыгранная карта: Т♣/);
  assert.match(r.position,/Карты игрока: нет карт/);assert.match(r.position,/Карты соперника.*6♣, Т♣/);assert.match(r.journal,/взятие всех карт/);
  assert.match(gameJournalText('durak',g),/Победа игрока/);assert.equal(sanitizeGameReports({chat:{durak:saved}}).chat.durak.game,'durak');
  assert.match(gameReportChatText(r),/Дурак/);assert.match(gameReportChatText(r,{includeJournal:true}),/Полный журнал партии/);
  const stats=recordArcadeResult({},'durak','draw');assert.equal(stats.durak.draws,1);assert.equal(sanitizeArcadeStats(stats).durak.draws,1);
});

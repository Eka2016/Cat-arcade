import test from 'node:test';
import assert from 'node:assert/strict';
import {renameChatHistory} from '../chat-history.js';
import {createGameReportManager} from '../game-report-ui.js';

const old='character:friend.png:old',next='character:friend.png:new',third='character:friend.png:third',other='character:other.png:old';
const rename=(from=old,to=next)=>({type:'chat-renamed',fromKey:from,toKey:to});
test('Rename moves DND and all six report kinds together without changing other extension data',()=>{
  const round={table:[{roll:1}]},reports=Object.fromEntries(['dice','poker','chess','checkers','domino','durak'].map(kind=>[kind,{id:kind}]));
  const state={dndRounds:{[old]:round,[other]:{table:[]}},gameReports:{[old]:reports,[other]:{chess:{id:'other'}}},truthRounds:{[old]:{current:'keep'}},gameStats:{wins:5}};
  const snapshot=structuredClone(state),moved=renameChatHistory(state,rename());
  assert.deepEqual(state,snapshot);assert.equal(moved.dndRounds[next],round);assert.deepEqual(moved.gameReports[next],reports);assert.equal(moved.dndRounds[old],undefined);assert.equal(moved.gameReports[old],undefined);
  assert.equal(moved.gameReports[other],state.gameReports[other]);assert.deepEqual(Object.keys(moved).sort(),['dndRounds','gameReports']);
  assert.equal(renameChatHistory(moved,rename()),null);
});
test('Chained group renames preserve every source report and unrelated destination games',()=>{
  const state={dndRounds:{['group:g:old']:{table:[1]}},gameReports:{['group:g:old']:{chess:{id:1}},['group:g:new']:{domino:{id:2},chess:{id:3}}}};
  const moved=renameChatHistory(state,rename('group:g:old','group:g:new')),again=renameChatHistory(moved,rename('group:g:new','group:g:last'));
  assert.deepEqual(again.dndRounds['group:g:last'],{table:[1]});assert.deepEqual(again.gameReports['group:g:last'],{domino:{id:2},chess:{id:1}});assert.equal(again.dndRounds['group:g:old'],undefined);assert.equal(again.gameReports['group:g:new'],undefined);
});
test('Unknown, identical or invalid renames do not remove saved chat state',()=>{
  const state={dndRounds:{[old]:{table:[1]}},gameReports:{}};
  for(const change of [undefined,{},rename(old,old),rename('missing',next),rename('',next),rename(old,'x'.repeat(2049)),{...rename(),type:'chat-changed'}])assert.equal(renameChatHistory(state,change),null);
  assert.deepEqual(state.dndRounds[old],{table:[1]});
});
test('Every report channel finishes under the renamed chat, including a second rename while hidden',()=>{
  for(const kind of ['dice','poker','chess','checkers','domino','durak']){
    let listener,key=old;const saved=[];
    const bridge={info:()=>({key}),subscribe(fn){listener=fn;return ()=>{};}};
    const manager=createGameReportManager({bridge,onReportChange:(key,record)=>saved.push([key,record])}),channel=manager.channel(kind);
    channel.begin();channel.updateJournal('Ход игрока.',1);listener(rename());key=next;listener(rename(next,third));key=third;
    channel.finish({game:kind,outcome:'win',lastMove:'Ход игрока.',details:'Победа.',position:'Позиция на столе.',recentMoves:'',journal:'Ход игрока.',journalEntries:1});
    assert.equal(saved.length,1);assert.equal(saved[0][0],third);assert.equal(saved[0][1].game,kind);manager.destroy();
  }
});

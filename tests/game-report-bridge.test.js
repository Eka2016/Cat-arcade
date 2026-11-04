import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createTavernStoryBridge} from '../dnd-tavern.js';
import {ChessGame,chessIndex} from '../chess-game.js';
import {makeGameResult} from '../game-report.js';
const g=new ChessGame('6rk/6pp/8/6N1/8/8/8/K7 w - - 0 1');g.play({from:chessIndex('g5'),to:chessIndex('f7')});
const report={version:1,id:'a'.repeat(32),...makeGameResult('chess',g),sent:false};
function fixture(){
  const events=new EventEmitter(),calls=[],draft={value:''};let saves=0;
  const state={chat:[{mes:'Мы играем в шахматы.',is_user:true}],chatId:'one',characterId:0,name1:'Игрок',name2:'Дрейк',onlineStatus:'connected',eventSource:events,eventTypes:{CHAT_CHANGED:'chat',GENERATION_STARTED:'start',GENERATION_ENDED:'end',GENERATION_STOPPED:'stop'},
    addOneMessage(message){calls.push(['append',message]);},async saveChat(){saves++;},async generate(...args){calls.push(['generate',...args]);state.chat.push({mes:'Хорошая партия.',is_user:false});},generateQuietPrompt(){throw Error('Quiet generation must not be used for a game reply');}};
  for(const key of ['apiKey','proxy','chatCompletionSettings','textCompletionSettings','getRequestHeaders','executeSlashCommands','setExtensionPrompt','stopGeneration'])Object.defineProperty(state,key,{get(){throw Error('Forbidden access: '+key);}});
  const bridge=createTavernStoryBridge({getContext:()=>state,document:{querySelector:selector=>selector==='#send_textarea'?draft:null}});
  return {state,events,calls,draft,bridge,get saves(){return saves;}};
}
test('Game report uses native narrator save and an optional ordinary generation without keys or quiet event requests',async()=>{
  const f=fixture();try{
    const token=f.bridge.capture(),original=structuredClone(f.state.chat[0]);assert.equal(f.calls.length,0);
    assert.equal((await f.bridge.appendGameReport(token,report)).added,true);assert.equal(f.saves,1);assert.deepEqual(f.state.chat[0],original);
    assert.equal(f.state.chat[1].extra.type,'narrator');assert.match(f.state.chat[1].mes,/конь: f7/);assert.equal(f.state.chat[1].is_system,false);
    assert.equal((await f.bridge.replyToGameReport(token,report.id)).started,true);assert.deepEqual(f.calls[1],['generate','normal',{automatic_trigger:true}]);
    assert.equal((await f.bridge.appendGameReport(token,report)).duplicate,true);assert.equal(f.saves,1);assert.equal((await f.bridge.replyToGameReport(token,report.id)).started,false);
  }finally{f.bridge.destroy();}
});
test('An existing composer draft is preserved and no response is started or command executed',async()=>{
  const f=fixture();try{const token=f.bridge.capture();await f.bridge.appendGameReport(token,report);f.draft.value='/some-command private draft';assert.deepEqual(await f.bridge.replyToGameReport(token,report.id),{started:false,reason:'DRAFT'});assert.equal(f.draft.value,'/some-command private draft');assert.equal(f.calls.filter(c=>c[0]==='generate').length,0);}finally{f.bridge.destroy();}
});
test('Busy generation, switched chat and changed content cannot receive a stale report',async()=>{
  for(const mutate of [f=>{f.state.chatId='two';},f=>{f.state.chat=[{mes:'Other chat'}];},f=>{f.state.chat.push({mes:'New scene'});}]){
    const f=fixture();try{const token=f.bridge.capture();mutate(f);await assert.rejects(f.bridge.appendGameReport(token,report),e=>e.code==='STALE');assert.equal(f.saves,0);assert.equal(f.calls.length,0);}finally{f.bridge.destroy();}
  }
  const f=fixture();try{const token=f.bridge.capture();f.events.emit('start','normal',{},false);await assert.rejects(f.bridge.appendGameReport(token,report),e=>e.code==='BUSY');assert.equal(f.calls.length,0);}finally{f.bridge.destroy();}
});
test('A reply is skipped after switching away and returning, new chat activity, or an offline connection',async()=>{
  for(const [change,reason] of [[f=>{f.events.emit('chat');},'STALE'],[f=>{f.state.chat.push({mes:'Something new'});},'STALE'],[f=>{f.state.onlineStatus='no_connection';},'OFFLINE']]){
    const f=fixture();try{const token=f.bridge.capture();await f.bridge.appendGameReport(token,report);change(f);assert.deepEqual(await f.bridge.replyToGameReport(token,report.id),{started:false,reason});assert.equal(f.calls.filter(c=>c[0]==='generate').length,0);assert.equal(f.saves,1);}finally{f.bridge.destroy();}
  }
});
test('The native chat message receives a full journal only on explicit opt-in',async()=>{
  for(const full of [false,true]){const f=fixture();try{await f.bridge.appendGameReport(f.bridge.capture(),report,{includeJournal:full});assert.equal(f.state.chat[1].extra.paw_arcade_game.fullJournal,full);assert.equal(f.state.chat[1].mes.includes('Полный журнал партии:'),full);}finally{f.bridge.destroy();}}
});

test('Game reports and DND events support user, bot and narrator roles without system messages',async()=>{
  for(const sender of ['user','bot','narrator'])for(const kind of ['game','dnd']){
    const f=fixture();try{
      const token=f.bridge.capture();
      if(kind==='game')await f.bridge.appendGameReport(token,report,{sender});
      else await f.bridge.append(token,{roll:7,title:'Старая переправа',event:'У реки герои находят знакомую переправу и замечают следы недавно прошедшей телеги.'},'b'.repeat(32),{sender});
      const message=f.state.chat.at(-1);assert.equal(message.is_user,sender==='user');assert.equal(message.is_system,false);
      assert.equal(message.name,sender==='user'?'Игрок':sender==='bot'?'Дрейк':kind==='game'?'Игровая партия':'Мастер d20');
      assert.equal(message.extra.type,sender==='narrator'?'narrator':undefined);assert.equal(f.calls.filter(c=>c[0]==='generate').length,0);
    }finally{f.bridge.destroy();}
  }
});

test('A stopped partial reply can be retried explicitly without adding the report again or deleting text',async()=>{
  const f=fixture();try{
    const token=f.bridge.capture();await f.bridge.appendGameReport(token,report);
    f.state.generate=async(...args)=>{f.calls.push(['generate',...args]);f.state.chat.push({mes:'Я смотрю на доску…',is_user:false});f.events.emit('stop');};
    assert.deepEqual(await f.bridge.replyToGameReport(token,report.id),{started:true,stopped:true});
    const partial=structuredClone(f.state.chat.at(-1));
    f.state.generate=async(...args)=>{f.calls.push(['generate',...args]);f.state.chat.push({mes:'Ты поставил мат конём.',is_user:false});};
    assert.equal((await f.bridge.replyToGameReport(f.bridge.capture(),report.id,{retry:true})).started,true);
    assert.deepEqual(f.state.chat[2],partial);assert.equal(f.calls.filter(c=>c[0]==='append').length,1);assert.equal(f.calls.filter(c=>c[0]==='generate').length,2);
  }finally{f.bridge.destroy();}
});

test('Retry never overlaps an in-flight generation or crosses a user message, chat switch or edited snapshot',async()=>{
  const f=fixture();try{
    const token=f.bridge.capture();await f.bridge.appendGameReport(token,report);
    let release;f.state.generate=()=>new Promise(resolve=>{release=resolve;});const pending=f.bridge.replyToGameReport(token,report.id);
    assert.deepEqual(await f.bridge.replyToGameReport(f.bridge.capture(),report.id,{retry:true}),{started:false,reason:'BUSY'});
    f.events.emit('stop');assert.deepEqual(await f.bridge.replyToGameReport(f.bridge.capture(),report.id,{retry:true}),{started:false,reason:'BUSY'});release();await pending;
    const snapshot=f.bridge.capture();f.state.chat[0].mes='Edited scene';assert.deepEqual(await f.bridge.replyToGameReport(snapshot,report.id,{retry:true}),{started:false,reason:'STALE'});
    f.state.chat.push({mes:'Другая тема.',is_user:true});assert.deepEqual(await f.bridge.replyToGameReport(f.bridge.capture(),report.id,{retry:true}),{started:false,reason:'STALE'});
    const current=f.bridge.capture();f.events.emit('chat');assert.deepEqual(await f.bridge.replyToGameReport(current,report.id,{retry:true}),{started:false,reason:'STALE'});
  }finally{f.bridge.destroy();}
});

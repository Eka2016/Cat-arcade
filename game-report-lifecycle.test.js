import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameReportManager} from '../game-report-ui.js';
import {createTavernStoryBridge} from '../dnd-tavern.js';

// Only event delegation and form values are needed here. Browser regressions
// exercise the real DOM, extension restarts, collections and native storage.
function host(){
  const document={querySelector:()=>null,createElement:()=>node()};
  function node(selector=''){
    const children=new Map(),listeners=new Map();
    return {ownerDocument:document,dataset:selector==='.game-report-send'?{reportAction:'send'}:{},hidden:false,disabled:false,checked:false,open:false,textContent:'',isConnected:true,
      querySelector(key){if(!children.has(key))children.set(key,node(key));return children.get(key);},
      setAttribute(){},prepend(){},remove(){this.isConnected=false;},
      addEventListener(type,fn,options){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push({fn,signal:options?.signal});},
      closest(key){return key==='[data-report-action]'&&this.dataset.reportAction?this:null;},matches:key=>key===selector,
      emit(type,target){for(const {fn,signal} of listeners.get(type)||[])if(!signal?.aborted)fn({target,stopPropagation(){}});},
    };
  }
  return {document,container:node()};
}
function fixture(kind,{reply=false,full=false}={}){
  const h=host(),previous=globalThis.document;globalThis.document=h.document;
  let resolve,reject,saves=0,renders=0,replies=0,record,writes=0,preference='old';
  const ctx={chat:[{mes:'Private scene',is_user:true}],chatId:'one',characterId:0,name1:'User',name2:'Bot',onlineStatus:'connected',addOneMessage(){renders++;},saveChat(){saves++;return new Promise((a,b)=>{resolve=a;reject=b;});},async generate(){replies++;}};
  const bridge=createTavernStoryBridge({getContext:()=>ctx,document:h.document});
  const manager=createGameReportManager({bridge,getReport:()=>record,onReportChange(_key,value){writes++;record=structuredClone(value);preference='old';},getReply:()=>reply}),channel=manager.channel(kind);
  const section=h.document.createElement();h.document.createElement=()=>section;channel.attach(h.container);channel.begin();channel.finish({game:kind,outcome:'win',lastMove:'Ход игрока.',details:'Победа.',position:'Позиция на столе.',recentMoves:'',journal:'Подробный журнал партии.',journalEntries:1});
  section.querySelector('.game-report-settings').open=true;section.querySelector('.game-report-preview').open=true;channel.render();section.querySelector('.game-report-full').checked=full;section.emit('change',section.querySelector('.game-report-full'));
  return {h,ctx,bridge,manager,channel,section,get record(){return record;},get writes(){return writes;},get saves(){return saves;},get renders(){return renders;},get replies(){return replies;},get preference(){return preference;},set preference(v){preference=v;},send(){section.emit('click',section.querySelector('.game-report-send'));},resolve:()=>resolve(),reject:()=>reject(Error('Native save failed')),cleanup(){manager.destroy();bridge.destroy();globalThis.document=previous;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('A hidden report keeps its state without repeatedly redrawing on chat notifications',()=>{
  const f=fixture('durak');try{
    f.h.container.hidden=true;
    const marker='hidden report untouched';f.section.querySelector('.game-report-send').textContent=marker;
    for(let n=0;n<10000;n++)f.manager.refresh();
    assert.equal(f.section.querySelector('.game-report-send').textContent,marker);
    f.h.container.hidden=false;f.manager.refresh();
    assert.equal(f.section.querySelector('.game-report-send').textContent,'Отправить в чат');
  }finally{f.cleanup();}
});
for(const kind of ['dice','poker','chess','checkers','domino','durak']){
  test(`${kind}: a destroyed report owner cannot write after late save success or failure`,async()=>{
    for(const owner of ['manager','channel'])for(const fail of [false,true]){
      const f=fixture(kind,{reply:true});try{
        f.send();assert.equal(f.saves,1);const before=f.writes;f[owner].destroy();f.preference='new';if(fail)f.reject();else f.resolve();await settle();
        assert.equal(f.writes,before,'A late result must not write the old settings snapshot');assert.equal(f.preference,'new');assert.equal(f.replies,0);assert.equal(f.renders,1);assert.equal(f.ctx.chat.length,2);
      }finally{f.cleanup();}
    }
  });
  test(`${kind}: a new view reads the actual saved journal without the destroyed owner writing`,async()=>{
    for(const full of [false,true]){
      const f=fixture(kind,{full});let replacement,newBridge;try{
        f.send();const record=structuredClone(f.record),before=f.writes;f.manager.destroy();f.bridge.destroy();
        newBridge=createTavernStoryBridge({getContext:()=>f.ctx,document:f.h.document});let replacementWrites=0;
        replacement=createGameReportManager({bridge:newBridge,getReport:()=>record,onReportChange(){replacementWrites++;},getReply:()=>false});const next=replacement.channel(kind),section=host().document.createElement();f.h.document.createElement=()=>section;next.attach(f.h.container);section.querySelector('.game-report-settings').open=true;section.querySelector('.game-report-preview').open=true;
        f.resolve();await settle();next.render();assert.equal(f.writes,before);assert.equal(replacementWrites,0);assert.equal(section.querySelector('.game-report-full').checked,full);assert.equal(section.querySelector('.game-report-preview pre').textContent.includes('Полный журнал партии:'),full);assert.equal(section.querySelector('.game-report-send').textContent,'Отправлено в чат');assert.equal(f.renders,1);
      }finally{replacement?.destroy();newBridge?.destroy();f.cleanup();}
    }
  });
  test(`${kind}: an active owner still records a saved report and requests the chosen ordinary reply`,async()=>{
    const f=fixture(kind,{reply:true,full:true});try{f.send();f.resolve();await settle();assert.equal(f.record.sent,true);assert.equal(f.record.sentWithJournal,true);assert.equal(f.writes,2);assert.equal(f.replies,1);assert.equal(f.ctx.chat.length,2);assert.equal(f.renders,1);}finally{f.cleanup();}
  });
}
test('A destroyed channel ignores subsequent round and journal callbacks',()=>{
  for(const kind of ['dice','poker','chess','checkers','domino','durak']){const f=fixture(kind);try{const before=f.writes;f.channel.destroy();f.channel.begin();f.channel.updateJournal('Поздний ход.',1);f.channel.finish({game:kind,outcome:'win',lastMove:'Поздний ход.',details:'Победа.',position:'Позиция.',recentMoves:'',journal:'Поздний ход.',journalEntries:1});assert.equal(f.writes,before);}finally{f.cleanup();}}
});

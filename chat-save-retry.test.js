import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createTavernStoryBridge} from '../dnd-tavern.js';

const id='a'.repeat(32),event={roll:10,title:'Забытый мост',event:'На тихой лесной тропе герои находят старый мост и следы недавнего путника.'};
const card={kind:'truth',text:'Какое место ты хотел бы показать собеседнику?',selectionMode:'manual'};
const report={version:1,id,game:'chess',outcome:'win',lastMove:'Конь g5–f7.',details:'Мат.',position:'Конь f7; короли a1 и h8.',recentMoves:'',journal:'Ход конём.',journalEntries:1,sent:false};
function fixture(kind){
  const events=new EventEmitter();let attempts=0,renders=0,failures=1,persisted=[{mes:'Original private scene',is_user:true}];
  const ctx={chat:structuredClone(persisted),chatId:'one',characterId:0,name1:'User',name2:'Character',onlineStatus:'connected',eventSource:events,eventTypes:{CHAT_CHANGED:'chat',CHAT_RENAMED:'rename',GENERATION_STARTED:'start',GENERATION_ENDED:'end'},
    addOneMessage(){renders++;},async saveChat(){attempts++;if(failures-->0)throw Error('Native save failed');persisted=structuredClone(ctx.chat);},generate(){throw Error('Unexpected model call');},generateQuietPrompt(){throw Error('Unexpected model call');}};
  for(const key of ['apiKey','proxy','chatCompletionSettings','getRequestHeaders','executeSlashCommands','setExtensionPrompt','stopGeneration','secrets'])Object.defineProperty(ctx,key,{get(){throw Error('Forbidden context read: '+key);}});
  const bridge=createTavernStoryBridge({getContext:()=>ctx,document:{querySelector:()=>null}});
  const send=(token=bridge.capture(),options={sender:'user'})=>kind==='dnd'?bridge.append(token,event,id,options):kind==='truth'?bridge.appendTruthCard(token,card,id,options):bridge.appendGameReport(token,report,options);
  const saved=()=>kind==='dnd'?bridge.dndEventInfo(id):kind==='truth'?bridge.truthCardInfo(id):bridge.gameReportInfo(id);
  return {ctx,events,bridge,send,saved,get attempts(){return attempts;},get renders(){return renders;},get persisted(){return persisted;},set failures(n){failures=n;}};
}
for(const kind of ['dnd','truth','game']){
  test(`${kind}: retry persists the same message once and preserves its original sender and text`,async()=>{
    const f=fixture(kind);try{
      await assert.rejects(f.send(),{code:'APPEND'});const message=structuredClone(f.ctx.chat[1]);
      assert.equal(f.bridge.chatSavePending(kind,id),true);assert.equal(f.saved(),null);assert.equal(f.bridge.hasGameReport(id),false);assert.equal(f.persisted.length,1);
      assert.deepEqual(await f.send(f.bridge.capture(),{sender:'bot',includeJournal:true}),{added:true,duplicate:true});
      assert.equal(f.attempts,2);assert.equal(f.renders,1);assert.deepEqual(f.persisted,[f.ctx.chat[0],message]);assert.deepEqual(f.ctx.chat[1],message);assert.equal(f.saved().sender,'user');assert.equal(f.bridge.chatSavePending(kind,id),false);
      await f.send();assert.equal(f.attempts,2);assert.equal(f.ctx.chat.length,2);
    }finally{f.bridge.destroy();}
  });
  test(`${kind}: repeated native save failures never become a false success`,async()=>{
    const f=fixture(kind);try{
      f.failures=3;for(let n=1;n<=3;n++){await assert.rejects(f.send(),{code:'APPEND'});assert.equal(f.attempts,n);assert.equal(f.saved(),null);assert.equal(f.ctx.chat.length,2);}
      await f.send();assert.equal(f.attempts,4);assert.equal(f.renders,1);assert.deepEqual(f.persisted,f.ctx.chat);
    }finally{f.bridge.destroy();}
  });
  test(`${kind}: pending retry respects busy generation, a stale snapshot and other chats`,async()=>{
    const f=fixture(kind);try{
      await assert.rejects(f.send(),{code:'APPEND'});const token=f.bridge.capture();
      f.events.emit('start','normal',{},false);await assert.rejects(f.send(),{code:'BUSY'});f.events.emit('end');
      f.ctx.chat.push({mes:'New user message',is_user:true});await assert.rejects(f.send(token),{code:'STALE'});
      f.ctx.chatId='two';await assert.rejects(f.send(token),{code:'STALE'});assert.equal(f.attempts,1);
      f.ctx.chatId='one';await f.send();assert.equal(f.attempts,2);assert.equal(f.renders,1);assert.deepEqual(f.persisted,f.ctx.chat);
    }finally{f.bridge.destroy();}
  });
  test(`${kind}: two clicks cannot overlap a pending native save`,async()=>{
    const f=fixture(kind);try{
      await assert.rejects(f.send(),{code:'APPEND'});let release;f.ctx.saveChat=()=>new Promise(r=>release=r);
      const pending=f.send();assert.equal(f.bridge.info().busy,true);await assert.rejects(f.send(),{code:'BUSY'});release();await pending;
      assert.equal(f.ctx.chat.length,2);assert.equal(f.renders,1);assert.equal(f.bridge.info().busy,false);assert.ok(f.saved());
    }finally{f.bridge.destroy();}
  });
  test(`${kind}: a render failure can be saved later without a duplicate message`,async()=>{
    const f=fixture(kind);try{
      let renderCalls=0;f.ctx.addOneMessage=()=>{renderCalls++;throw Error('Native renderer failed');};f.failures=0;
      await assert.rejects(f.send(),{code:'APPEND'});assert.equal(f.attempts,0);assert.equal(f.saved(),null);
      await f.send();assert.equal(renderCalls,1);assert.equal(f.attempts,1);assert.equal(f.persisted.length,2);
    }finally{f.bridge.destroy();}
  });
  test(`${kind}: a synchronous chat switch in the native renderer cannot save the new chat`,async()=>{
    const f=fixture(kind);try{
      f.ctx.addOneMessage=()=>{f.ctx.chatId='two';f.ctx.chat=[{mes:'Other private chat'}];f.events.emit('chat');};
      await assert.rejects(f.send(),{code:'STALE'});assert.equal(f.attempts,0);assert.deepEqual(f.ctx.chat,[{mes:'Other private chat'}]);
    }finally{f.bridge.destroy();}
  });
  test(`${kind}: re-enabling the extension retains a failed message's pending status`,async()=>{
    const f=fixture(kind);let replacement;try{
      await assert.rejects(f.send(),{code:'APPEND'});f.bridge.destroy();
      replacement=createTavernStoryBridge({getContext:()=>f.ctx,document:{querySelector:()=>null}});assert.equal(replacement.chatSavePending(kind,id),true);
      const token=replacement.capture();if(kind==='dnd')await replacement.append(token,event,id);else if(kind==='truth')await replacement.appendTruthCard(token,card,id);else await replacement.appendGameReport(token,report);
      assert.equal(f.attempts,2);assert.equal(f.persisted.length,2);assert.equal(f.renders,1);assert.equal(replacement.chatSavePending(kind,id),false);
    }finally{f.bridge.destroy();replacement?.destroy();}
  });
}
test('Re-enabling during a native save cannot overlap it, and the new view is notified on completion',async()=>{
  const f=fixture('dnd');let replacement;try{
    let release;f.ctx.saveChat=()=>new Promise(r=>release=r);const pending=f.send();f.bridge.destroy();
    replacement=createTavernStoryBridge({getContext:()=>f.ctx,document:{querySelector:()=>null}});let notifications=0;replacement.subscribe(()=>notifications++);
    assert.equal(replacement.info().busy,true);await assert.rejects(replacement.append(replacement.capture(),event,id),{code:'BUSY'});release();await pending;
    assert.equal(replacement.info().busy,false);assert.ok(replacement.dndEventInfo(id));assert.equal(notifications,1);assert.equal(f.renders,1);
  }finally{f.bridge.destroy();replacement?.destroy();}
});
test('Only a rename of the current character or group invalidates captured requests',()=>{
  for(const group of [false,true]){
    const f=fixture('dnd');try{
      f.ctx.characters=[{avatar:'friend.png'}];if(group)f.ctx.groupId='group-1';
      const token=f.bridge.capture(),owner=group?{groupId:'group-1'}:{avatarId:'friend.png'};
      f.events.emit('rename',{avatarId:'another.png',oldFileName:'one.jsonl',newFileName:'two.jsonl'});assert.equal(f.bridge.isCurrent(token),true);
      f.events.emit('rename',{...owner,oldFileName:'other.jsonl',newFileName:'unrelated.jsonl'});assert.equal(f.bridge.isCurrent(token),true);
      f.events.emit('rename',{...owner,oldFileName:'one.jsonl',newFileName:'two.jsonl'});assert.equal(f.bridge.isCurrent(token),false);
    }finally{f.bridge.destroy();}
  }
});

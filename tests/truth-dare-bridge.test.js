import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createTavernStoryBridge} from '../dnd-tavern.js';
const card={kind:'truth',text:'Какое место ты хотел бы показать собеседнику?',selectionMode:'manual'},id='e'.repeat(32);
function fixture(){
 const events=new EventEmitter(),calls=[],draft={value:'/private draft'};let saves=0;
 const ctx={chat:[{mes:'PRIVATE_CHAT',is_user:true}],chatId:'one',characterId:0,name1:'Игрок',name2:'Император',eventSource:events,eventTypes:{CHAT_CHANGED:'chat',CHAT_RENAMED:'rename',GENERATION_STARTED:'start',GENERATION_ENDED:'end'},onlineStatus:'connected',addOneMessage(m){calls.push(m);},async saveChat(){saves++;},generate(){throw Error('Unexpected model query');},generateQuietPrompt(){throw Error('Unexpected quiet query');}};
 for(const key of ['apiKey','proxy','chatCompletionSettings','textCompletionSettings','getRequestHeaders','executeSlashCommands','setExtensionPrompt','stopGeneration'])Object.defineProperty(ctx,key,{get(){throw Error('Forbidden access: '+key);}});
 const bridge=createTavernStoryBridge({getContext:()=>ctx,document:{querySelector:s=>s==='#send_textarea'?draft:null}});
 return {ctx,events,calls,draft,bridge,get saves(){return saves;}};
}
test('A truth card uses native save once for each ordinary sender and leaves drafts, history and keys untouched',async()=>{
 for(const sender of ['narrator','user','bot']){const f=fixture();try{
  const token=f.bridge.capture(),original=structuredClone(f.ctx.chat[0]);assert.deepEqual(await f.bridge.appendTruthCard(token,card,id,{sender}),{added:true});
  const m=f.ctx.chat[1];assert.equal(m.is_user,sender==='user');assert.equal(m.is_system,false);assert.equal(m.name,sender==='user'?'Игрок':sender==='bot'?'Император':'Правда или действие');assert.equal(m.extra.type,sender==='narrator'?'narrator':undefined);assert.equal(m.extra.paw_arcade_truth.id,id);assert.ok(m.mes.includes(card.text));assert.deepEqual(f.ctx.chat[0],original);assert.equal(f.draft.value,'/private draft');assert.equal(f.saves,1);
  assert.deepEqual(await f.bridge.appendTruthCard(token,card,id,{sender}),{added:true,duplicate:true});assert.equal(f.ctx.chat.length,2);assert.equal(f.calls.length,1);assert.equal(f.saves,1);assert.equal(f.bridge.truthCardInfo(id).kind,'truth');
 }finally{f.bridge.destroy();}}
});
test('Truth sending rejects unsafe cards, busy generation and stale chat snapshots',async()=>{
 for(const mutate of [f=>f.ctx.chatId='two',f=>f.ctx.chat.push({mes:'New scene'}),f=>f.events.emit('chat')]){const f=fixture();try{const token=f.bridge.capture();mutate(f);await assert.rejects(f.bridge.appendTruthCard(token,card,id),{code:'STALE'});assert.equal(f.calls.length,0);}finally{f.bridge.destroy();}}
 const f=fixture();try{
  const token=f.bridge.capture();f.events.emit('start','normal',{},false);await assert.rejects(f.bridge.appendTruthCard(token,card,id),{code:'BUSY'});f.events.emit('end');
  await assert.rejects(f.bridge.appendTruthCard(token,{...card,text:'<img src=x onerror=alert(1)>'},id));await assert.rejects(f.bridge.appendTruthCard(token,card,'not-an-id'),{code:'APPEND'});assert.equal(f.calls.length,0);assert.equal(f.saves,0);
 }finally{f.bridge.destroy();}
});
test('A failed native save can be retried without appending a second copy',async()=>{
 const f=fixture();let attempts=0,persisted=[];try{
  f.ctx.saveChat=async()=>{if(++attempts===1)throw Error('private provider detail');persisted=structuredClone(f.ctx.chat);};
  await assert.rejects(f.bridge.appendTruthCard(f.bridge.capture(),card,id),{code:'APPEND'});assert.equal(f.ctx.chat.length,2);assert.equal(f.bridge.truthCardInfo(id),null);
  assert.deepEqual(await f.bridge.appendTruthCard(f.bridge.capture(),card,id),{added:true,duplicate:true});assert.equal(f.calls.length,1);assert.equal(attempts,2);assert.equal(persisted.length,2);assert.equal(f.bridge.truthCardInfo(id).id,id);
 }finally{f.bridge.destroy();}
});
test('A bot-authored truth card prevents a game reply retry from crossing it',async()=>{
 const f=fixture();try{f.ctx.chat.push({mes:'Previous game',is_user:false,extra:{paw_arcade_game:{id:'a'.repeat(32)}}});await f.bridge.appendTruthCard(f.bridge.capture(),card,id,{sender:'bot'});assert.deepEqual(await f.bridge.replyToGameReport(f.bridge.capture(),'a'.repeat(32),{retry:true}),{started:false,reason:'STALE'});}finally{f.bridge.destroy();}
});
test('Short and long custom cards reach native chat intact with the same duplicate guard and no generation',async()=>{
 for(const text of ['Да?','Первый абзац.\n\n'+'Подробное пользовательское действие. '.repeat(2500).trimEnd()]){const f=fixture();try{
  const own={...card,text};await f.bridge.appendTruthCard(f.bridge.capture(),own,id);assert.ok(f.ctx.chat[1].mes.endsWith(text));assert.equal(f.ctx.chat.length,2);assert.equal(f.saves,1);assert.deepEqual(await f.bridge.appendTruthCard(f.bridge.capture(),own,id),{added:true,duplicate:true});assert.equal(f.calls.length,1);assert.equal(f.draft.value,'/private draft');
 }finally{f.bridge.destroy();}}
});
test('Public chat rename events identify the exact character or group, without moving tokens to another chat',()=>{
 const f=fixture(),changes=[];const off=f.bridge.subscribe(value=>{if(value)changes.push(value);});
 try{
  f.ctx.characters=[{avatar:'friend.png'}];const token=f.bridge.capture();
  f.events.emit('rename',{avatarId:'friend.png',oldFileName:'one.jsonl',newFileName:'Новый вечер.jsonl'});
  assert.deepEqual(changes,[{type:'chat-renamed',fromKey:'character:friend.png:one',toKey:'character:friend.png:Новый вечер'}]);
  f.ctx.chatId='Новый вечер';assert.equal(f.bridge.isCurrent(token),false);
  f.events.emit('rename',{groupId:'group-7',avatarId:undefined,oldFileName:'old.jsonl',newFileName:'new.jsonl'});
  assert.deepEqual(changes[1],{type:'chat-renamed',fromKey:'group:group-7:old',toKey:'group:group-7:new'});
  f.events.emit('rename',{avatarId:'another.png',oldFileName:'name.jsonl.jsonl',newFileName:'next.jsonl.jsonl'});
  assert.equal(changes[2].fromKey,'character:another.png:name.jsonl');assert.equal(changes[2].toKey,'character:another.png:next.jsonl');
  for(const invalid of [undefined,{},'bad',{avatarId:'friend.png',oldFileName:1,newFileName:'x'},{oldFileName:'one.jsonl',newFileName:'x.jsonl'},{avatarId:{},oldFileName:'one',newFileName:'x'},{avatarId:'friend.png',oldFileName:'one',newFileName:'one'},{avatarId:'friend.png',oldFileName:'.jsonl',newFileName:'x.jsonl'},{avatarId:'friend.png',oldFileName:'one',newFileName:'x'.repeat(2049)}])f.events.emit('rename',invalid);
  assert.equal(changes.length,3);assert.equal(f.calls.length,0);assert.equal(f.saves,0);off();assert.equal(f.events.listenerCount('rename'),1);
 }finally{f.bridge.destroy();assert.equal(f.events.listenerCount('rename'),0);}
});

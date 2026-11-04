import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {DndError,dndErrorText,validateDndTable,makeDndPrompt,rollD20,dndRollId,dndChatText,dndSceneStamp,sanitizeDndRound,sanitizeDndRounds,DND_DEFAULT_PRESET,DND_RESPONSE_FORMAT,DND_PRESET_LIMIT,validateDndPreset,sanitizeDndPreset} from '../dnd.js';
import {createDemoStoryBridge} from '../dnd-demo.js';
import {createTavernStoryBridge} from '../dnd-tavern.js';

const RAW=await createDemoStoryBridge().generate(),TABLE=validateDndTable(RAW),ID='a'.repeat(32);
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('Saved DND rounds retain only a validated table, chosen roll and compact scene stamp',()=>{
  const raw={version:1,table:TABLE,selectedRoll:20,rollId:ID,applied:false,sceneStamp:dndSceneStamp('scene-a'),transcript:'PRIVATE_CHAT',connection:{key:'PRIVATE_KEY'}};
  const saved=sanitizeDndRound(raw);
  assert.equal(saved.table.length,20);assert.equal(saved.selectedRoll,20);assert.equal(saved.rollId,ID);
  assert.ok(!JSON.stringify(saved).includes('PRIVATE_'));assert.equal(saved.sceneStamp.length,16);
  assert.deepEqual(sanitizeDndRounds({'character:a:one':raw,'character:b:two':{...raw,selectedRoll:null,rollId:null},bad:{table:[]}}),{'character:a:one':saved,'character:b:two':sanitizeDndRound({...raw,selectedRoll:null,rollId:null})});
  for(const invalid of [{...raw,table:TABLE.slice(1)},{...raw,selectedRoll:21},{...raw,rollId:'bad'},{...raw,sceneStamp:'text'}])assert.throws(()=>sanitizeDndRound(invalid));
});
test('Scene stamps detect changed content without storing the chat in a saved round',()=>{
  const f=fixture();try{const first=f.bridge.capture();assert.equal(first.stamp,dndSceneStamp(first.signature));assert.equal(f.bridge.capture().stamp,first.stamp);f.state.chat[0].mes+=' Changed.';assert.notEqual(f.bridge.capture().stamp,first.stamp);assert.equal(f.bridge.isCurrent(first),false);}finally{f.bridge.destroy();}
});
test('Editable DND presets replace the story instruction, preserve the visible JSON contract and reject Tavern macros',()=>{
  const custom='События тихого расследования в городе. Без боёв и случайных встреч.';
  assert.equal(makeDndPrompt(custom),custom+'\n\n'+DND_RESPONSE_FORMAT);
  assert.ok(!makeDndPrompt(custom).includes(DND_DEFAULT_PRESET));
  assert.equal(validateDndPreset('  '+custom+'\r\nПродолжение.  '),custom+'\nПродолжение.');
  assert.equal(sanitizeDndPreset(undefined),DND_DEFAULT_PRESET);
  for(const invalid of ['',null,'x'.repeat(DND_PRESET_LIMIT+1),'Прочти {{getvar::secret}}','Закрытие }}'])assert.throws(()=>validateDndPreset(invalid),e=>e.code==='PRESET');
});
test('Saved rounds migrate v1 and keep stable per-event send identifiers across manual choices',()=>{
  const legacy={version:1,table:TABLE,selectedRoll:20,rollId:ID,applied:true,sceneStamp:dndSceneStamp('scene')};
  const saved=sanitizeDndRound(legacy);assert.equal(saved.version,2);assert.deepEqual(saved.choices,{'20':{id:ID,applied:true}});
  const manual=sanitizeDndRound({...saved,selectedRoll:7,rollId:'b'.repeat(32),applied:false,selectionMode:'manual'});
  assert.equal(manual.selectionMode,'manual');assert.deepEqual(manual.choices['20'],{id:ID,applied:true});assert.equal(manual.choices['7'].id,'b'.repeat(32));
  assert.throws(()=>sanitizeDndRound({...manual,choices:{...manual.choices,'21':{id:'c'.repeat(32)}}}),DndError);
  assert.throws(()=>sanitizeDndRound({...manual,choices:{...manual.choices,'3':{id:ID}}}),DndError);
});
function fixture({reply=async()=>RAW,group=false}={}){
  const source=new EventEmitter(),requests=[],rendered=[];let saves=0;
  const connection=Object.freeze({proxy:'sentinel-local-proxy',key:'sentinel-private-key',model:'sentinel-model'});
  const original={mes:'Мы стоим в городском дворце, а не в лесу.',is_user:true,name:'Игрок'};
  const state={chat:[original],chatId:'story-a',characterId:0,groupId:group?'g1':false,onlineStatus:'connected',streamingProcessor:null,eventSource:source,
    eventTypes:{GENERATION_STARTED:'start',GENERATION_ENDED:'end',GENERATION_STOPPED:'stop',CHAT_CHANGED:'chat'},
    async generateQuietPrompt(options){requests.push(options);return reply(options);},addOneMessage(message){rendered.push(message);},async saveChat(){saves++;}};
  if(group){state.characters=[{avatar:'a.png'},{avatar:'b.png'}];state.groups=[{id:'g1',members:['a.png','b.png'],disabled_members:['a.png']}];}
  for(const name of ['apiKey','proxy','chatCompletionSettings','textCompletionSettings','getRequestHeaders','saveSettingsDebounced','setExtensionPrompt','executeSlashCommands','stopGeneration'])Object.defineProperty(state,name,{get(){throw Error('Forbidden access: '+name);}});
  const bridge=createTavernStoryBridge({getContext:()=>state,document:{querySelector:()=>null}});
  return {state,source,bridge,requests,rendered,connection,original,get saves(){return saves;}};
}

test('DND accepts exactly twenty numbered events and tolerates a JSON code fence',()=>{
  assert.equal(TABLE.length,20);assert.deepEqual(TABLE.map(e=>e.roll),Array.from({length:20},(_,i)=>i+1));
  assert.deepEqual(validateDndTable('```json\n'+RAW+'\n```'),TABLE);
  assert.deepEqual(validateDndTable(JSON.stringify({events:[...TABLE].reverse()})),TABLE);
  for(const events of [TABLE.slice(0,19),[...TABLE,TABLE[0]],TABLE.map((e,i)=>i===0?{...e,roll:2}:e),TABLE.map((e,i)=>i===0?{...e,roll:'1'}:e)])assert.throws(()=>validateDndTable(JSON.stringify({events})),DndError);
  for(const raw of ['{}','hello',null,JSON.stringify({events:Array(20).fill(null)})])assert.throws(()=>validateDndTable(raw),DndError);
});
test('DND rejects dangerous markup, macros, links, URLs and duplicate ideas',()=>{
  for(const payload of ['<img src=x onerror=alert(1)>','{{getvar::private}}','https://foreign.invalid/collect','![image](/api/private)','&lt;script&gt;','`execute`']){
    const events=TABLE.map((e,i)=>i===0?{...e,event:e.event+' '+payload}:e);
    assert.throws(()=>validateDndTable(JSON.stringify({events})),error=>error.code==='UNSAFE_TEXT');
    assert.throws(()=>dndChatText({...TABLE[0],event:TABLE[0].event+' '+payload}));
  }
  const repeated=TABLE.map((e,i)=>i===1?{...e,event:TABLE[0].event}:e);
  assert.throws(()=>validateDndTable(JSON.stringify({events:repeated})),e=>e.code==='REPEATED');
  assert.throws(()=>dndChatText({...TABLE[0],roll:'<img>'}));
  assert.ok(!dndErrorText(new Error('secret-private-key')).includes('secret-private-key'));
});
test('D20 uses rejection sampling and roll identifiers use only browser cryptography',()=>{
  for(const [value,expected] of [[0,1],[19,20],[20,1],[39,20]])assert.equal(rollD20({getRandomValues(a){a[0]=value;return a;}}),expected);
  const values=[0xffffffff,7];let calls=0;assert.equal(rollD20({getRandomValues(a){a[0]=values[calls++];return a;}}),8);assert.equal(calls,2);
  assert.equal(dndRollId({getRandomValues(a){a.fill(0xad);return a;}}),'ad'.repeat(16));assert.throws(()=>rollD20({}),e=>e.code==='RANDOM');
});
test('DND delegates repeats against past chat to the model and accepts a valid returned table',async()=>{
  const f=fixture();try{
    f.state.chat.push({mes:dndChatText(TABLE[3]),extra:{type:'narrator'}});
    const before=structuredClone(f.state.chat),token=f.bridge.capture();
    assert.equal(Object.hasOwn(token,'messages'),false);
    const raw=await f.bridge.generate(token,makeDndPrompt());
    assert.deepEqual(validateDndTable(raw),TABLE);assert.deepEqual(f.state.chat,before);
    assert.equal(f.requests.length,1);assert.ok(!f.requests[0].quietPrompt.includes(TABLE[3].event));
    assert.match(f.requests[0].quietPrompt,/Не повторяй и не пересказывай/);assert.equal(f.rendered.length,0);
  }finally{f.bridge.destroy();}
});
test('Long chat history and macros do not become a separate message window or increase the instruction',async()=>{
  const f=fixture();try{
    f.state.chat=Array.from({length:110},()=>({name:'{{char}}',mes:'PRIVATE_SENTINEL {{setvar::x::secret}} <script> '+ 'Long story text. '.repeat(500)}));
    const token=f.bridge.capture();assert.equal(Object.hasOwn(token,'messages'),false);
    await f.bridge.generate(token,makeDndPrompt());const prompt=f.requests[0].quietPrompt;
    assert.equal(prompt,makeDndPrompt());assert.ok(prompt.length<2500);assert.ok(!prompt.includes('PRIVATE_SENTINEL'));assert.ok(!prompt.includes('{{'));assert.ok(!prompt.includes('<script>'));
  }finally{f.bridge.destroy();}
});
test('DND generation calls the current public API once without reading keys or connection settings',async()=>{
  const f=fixture();try{
    const token=f.bridge.capture();assert.equal(token.key,'character:0:story-a');assert.equal(f.bridge.info().available,true);
    const before=structuredClone(f.state.chat),connection={...f.connection};
    assert.equal(Object.hasOwn(token,'messages'),false);assert.ok(Object.isFrozen(token));
    assert.equal(await f.bridge.generate(token,makeDndPrompt()),RAW);assert.equal(f.requests.length,1);
    assert.ok(!f.requests[0].quietPrompt.includes(f.original.mes));
    assert.equal(f.requests[0].quietToLoud,false);assert.equal(f.requests[0].skipWIAN,false);assert.equal(f.requests[0].responseLength,2600);
    assert.equal(Object.hasOwn(f.requests[0],'jsonSchema'),false,'No provider-specific structured-output requirement');
    assert.deepEqual(f.state.chat,before);assert.deepEqual(f.connection,connection);assert.equal(f.rendered.length,0);assert.equal(f.saves,0);
  }finally{f.bridge.destroy();}assert.equal(f.source.listenerCount('start'),0);
});
test('The shared native bridge forwards a larger requested vocabulary budget with the same public API and safe defaults',async()=>{
 const f=fixture();try{
  for(const [responseLength,expected] of [[5400,5400],[18000,18000],[65536,65536],[65537,2600],[Infinity,2600],[999,2600],[3600.5,2600]]){
   await f.bridge.generate(f.bridge.capture(),'English request',{responseLength});const options=f.requests.at(-1);assert.equal(options.responseLength,expected);assert.equal(options.quietToLoud,false);assert.equal(options.skipWIAN,false);
  }
  assert.equal(f.state.chat.length,1);assert.equal(f.rendered.length,0);assert.equal(f.saves,0);
 }finally{f.bridge.destroy();}
});
test('DND checks busy state, disallows parallel requests and never retries automatically',async()=>{
  const pending=defer(),f=fixture({reply:()=>pending.promise});try{
    const token=f.bridge.capture();f.source.emit('start','normal',{},false);await assert.rejects(f.bridge.generate(token,'prompt'),e=>e.code==='BUSY');assert.equal(f.requests.length,0);f.source.emit('end');
    const first=f.bridge.generate(token,'prompt');await assert.rejects(f.bridge.generate(token,'prompt'),e=>e.code==='BUSY');assert.equal(f.requests.length,1);
    pending.resolve(RAW);await first;assert.equal(f.bridge.info().busy,false);
  }finally{f.bridge.destroy();}
  const broken=fixture({reply:async()=>{throw Error('secret-private-key');}});try{await assert.rejects(broken.bridge.generate(broken.bridge.capture(),'prompt'),e=>e.code==='GENERATION'&&!e.message.includes('private-key'));assert.equal(broken.requests.length,1);}finally{broken.bridge.destroy();}
});
test('Changing or editing the chat while generating discards the output and writes nothing',async()=>{
  for(const change of [f=>f.state.chat.push({mes:'Новое сообщение'}),f=>f.state.chat[0].mes='Отредактированная история',f=>f.state.chatId='different-chat',f=>f.source.emit('chat')]){
    const pending=defer(),f=fixture({reply:()=>pending.promise});try{
      const token=f.bridge.capture(),request=f.bridge.generate(token,'prompt');change(f);pending.resolve(RAW);
      await assert.rejects(request,e=>e.code==='STALE');await assert.rejects(f.bridge.append(token,TABLE[0],ID),e=>e.code==='STALE');assert.equal(f.rendered.length,0);assert.equal(f.saves,0);
    }finally{f.bridge.destroy();}
  }
});
test('Only the chosen event is appended once; old messages remain untouched',async()=>{
  const f=fixture();try{
    const token=f.bridge.capture(),old=f.state.chat[0],before=structuredClone(old);
    const result=await f.bridge.append(token,TABLE[19],ID);assert.equal(result.added,true);assert.equal(f.state.chat.length,2);
    assert.equal(f.state.chat[0],old);assert.deepEqual(old,before);assert.equal(f.rendered.length,1);assert.equal(f.saves,1);
    const message=f.state.chat[1];assert.equal(message.is_system,false);assert.equal(message.is_user,false);assert.equal(message.extra.type,'narrator');assert.match(message.mes,/20\/20/);assert.ok(message.mes.includes(TABLE[19].event));assert.ok(!message.mes.includes(TABLE[0].event));
    assert.equal((await f.bridge.append(token,TABLE[19],ID)).duplicate,true);assert.equal(f.state.chat.length,2);assert.equal(f.saves,1);
  }finally{f.bridge.destroy();}
});
test('Group DND uses one enabled character and an unavailable connection makes no requests',async()=>{
  const f=fixture({group:true});try{const token=f.bridge.capture();assert.equal(token.key,'group:g1:story-a');await f.bridge.generate(token,'prompt');assert.equal(f.requests.length,1);assert.equal(f.requests[0].forceChId,1);}finally{f.bridge.destroy();}
  const offline=fixture();try{offline.state.onlineStatus='no_connection';assert.equal(offline.bridge.info().reason,'OFFLINE');await assert.rejects(offline.bridge.generate(offline.bridge.capture(),'prompt'),e=>e.code==='OFFLINE');assert.equal(offline.requests.length,0);}finally{offline.bridge.destroy();}
});

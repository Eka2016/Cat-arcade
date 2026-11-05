import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createGenerationNotice} from '../generation-notice.js';

const names=['GENERATION_STARTED','GENERATION_ENDED','GENERATION_STOPPED','GROUP_WRAPPER_STARTED','GROUP_WRAPPER_FINISHED','SD_PROMPT_PROCESSING','MESSAGE_RECEIVED','FORCE_SET_BACKGROUND','TTS_JOB_COMPLETE','APP_READY','CHAT_CHANGED'];
const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
function fixture(){
  const source=new EventEmitter(),state={eventSource:source,eventTypes:Object.fromEntries(names.map(name=>[name,name])),chat:[]};
  for(const key of ['apiKey','proxy','chatCompletionSettings','textCompletionSettings','getRequestHeaders','generate','generateQuietPrompt','extensionSettings','saveSettingsDebounced'])Object.defineProperty(state,key,{get(){throw Error('Forbidden access: '+key);}});
  let completions=0,clears=0;
  const notice=createGenerationNotice({getContext:()=>state,document:null,onComplete:()=>completions++,onClear:()=>clears++});
  return {source,state,notice,get completions(){return completions;},get clears(){return clears;}};
}

test('Native normal, swipe, continuation, impersonation and quiet requests notify only after completion',async()=>{
  const f=fixture();try{
    f.source.emit('GENERATION_STARTED','normal',{},true);await settle();assert.equal(f.completions,0,'Prompt previews do not notify');
    for(const [i,type] of ['normal','swipe','continue','impersonate','quiet'].entries()){
      f.source.emit('GENERATION_STARTED',type,{},false);await settle();assert.equal(f.completions,i);
      f.source.emit('GENERATION_ENDED',1);await settle();assert.equal(f.completions,i+1);
    }
    f.source.emit('GENERATION_STARTED','normal',{},false);
    f.source.emit('GENERATION_ENDED',1);f.source.emit('GENERATION_STOPPED');await settle();
    assert.equal(f.completions,6,'The native end/stop pair is one notice, not two');
  }finally{f.notice.destroy();}
});

test('A group turn notifies after its wrapper finishes, not after each character',async()=>{
  const f=fixture();try{
    f.source.emit('GROUP_WRAPPER_STARTED',{selected_group:'one',type:'normal'});
    for(let i=0;i<3;i++){
      f.source.emit('GENERATION_STARTED','normal',{},false);f.source.emit('GENERATION_ENDED',i);await settle();
      assert.equal(f.completions,0);
    }
    f.source.emit('GROUP_WRAPPER_FINISHED',{selected_group:'one',type:'normal'});await settle();assert.equal(f.completions,1);
    f.source.emit('GROUP_WRAPPER_STARTED',{});f.source.emit('GROUP_WRAPPER_FINISHED',{});await settle();assert.equal(f.completions,1,'An empty group attempt has no completed generation');
  }finally{f.notice.destroy();}
});

test('An image prompt is not a finished picture; native generated media triggers the notice without reading message text',async()=>{
  const f=fixture();try{
    f.source.emit('GENERATION_STARTED','quiet',{},false);f.source.emit('GENERATION_ENDED',0);
    f.source.emit('SD_PROMPT_PROCESSING',{prompt:'not inspected'});await settle();assert.equal(f.completions,0);
    const message={extra:{media:[{url:'/generated/art.webp',source:'generated'}]}};
    Object.defineProperty(message,'mes',{get(){throw Error('Message text must not be read');}});f.state.chat.push(message);
    f.source.emit('MESSAGE_RECEIVED',0,'extension');await settle();assert.equal(f.completions,1);
    f.source.emit('MESSAGE_RECEIVED',0,'first_message');await settle();assert.equal(f.completions,1);
    f.state.chat.push({extra:{media:[{url:'/uploads/photo.webp',source:'upload'}]}});
    f.source.emit('MESSAGE_RECEIVED',1,'extension');f.source.emit('MESSAGE_RECEIVED',-1,'extension');await settle();assert.equal(f.completions,1);
    f.state.chat.push({extra:{image:'/generated/old-format.png',generationType:2}});
    f.source.emit('MESSAGE_RECEIVED',2,'extension');await settle();assert.equal(f.completions,2,'Legacy generated images are also supported');
  }finally{f.notice.destroy();}
});

test('Generated backgrounds and native speech completion are supported without notifying on ordinary background changes',async()=>{
  const f=fixture();try{
    f.source.emit('FORCE_SET_BACKGROUND',{path:'/backgrounds/manual.png'});await settle();assert.equal(f.completions,0);
    f.source.emit('SD_PROMPT_PROCESSING',{});f.source.emit('FORCE_SET_BACKGROUND',{path:'/generated/background.png'});await settle();assert.equal(f.completions,1);
    f.source.emit('TTS_JOB_COMPLETE',{});await settle();assert.equal(f.completions,2);
  }finally{f.notice.destroy();}
});

test('Chat switching cancels pending notices; disable removes every listener and deferred callback',async()=>{
  const f=fixture();
  f.source.emit('GENERATION_ENDED');f.source.emit('CHAT_CHANGED');await settle();assert.equal(f.completions,0);assert.equal(f.clears,1);
  f.source.emit('GENERATION_ENDED');f.notice.destroy();f.notice.destroy();await settle();assert.equal(f.completions,0);
  for(const name of names){assert.equal(f.source.listenerCount(name),0);f.source.emit(name);}
  await settle();assert.equal(f.completions,0);assert.equal(f.clears,1);
});

test('Unavailable host APIs and failing notice callbacks never interrupt native events',async()=>{
  const absent=createGenerationNotice({getContext(){throw Error('Not initialized');},document:null});assert.doesNotThrow(()=>absent.destroy());
  const source=new EventEmitter(),notice=createGenerationNotice({getContext:()=>({eventSource:source,eventTypes:{GENERATION_ENDED:'end',CHAT_CHANGED:'chat'}}),document:null,onComplete(){throw Error('UI destroyed');},onClear(){throw Error('UI destroyed');}});
  try{assert.doesNotThrow(()=>source.emit('end'));await settle();assert.doesNotThrow(()=>source.emit('chat'));}finally{notice.destroy();}
});

test('Ordinary chat does not install a DOM observer; image observation is temporary',async()=>{
  let created=0,disconnected=0,callback,completed=0;
  const source=new EventEmitter(),chat={};
  const doc={querySelector:()=>chat,defaultView:{MutationObserver:class{
    constructor(fn){created++;callback=fn;}observe(){}disconnect(){disconnected++;}
  }}};
  const ctx={chat:[],eventSource:source,eventTypes:Object.fromEntries(names.map(name=>[name,name]))};
  const notice=createGenerationNotice({getContext:()=>ctx,document:doc,onComplete:()=>completed++});
  try{
    for(let n=0;n<10000;n++)source.emit('MESSAGE_RECEIVED',0,'normal');
    assert.equal(created,0);
    source.emit('SD_PROMPT_PROCESSING');assert.equal(created,1);
    callback([{target:{matches:()=>true,classList:{contains:()=>false}},oldValue:'sd_message_gen fa-hourglass'}]);
    await settle();assert.equal(disconnected,1);assert.equal(completed,1);
    for(let n=0;n<10000;n++)source.emit('MESSAGE_RECEIVED',0,'normal');assert.equal(created,1);
  }finally{notice.destroy();}
});

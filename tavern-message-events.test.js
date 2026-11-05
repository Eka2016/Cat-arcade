import test from 'node:test';
import assert from 'node:assert/strict';
import {createTavernStoryBridge} from '../dnd-tavern.js';
const id='e'.repeat(32),event={roll:10,title:'Мост',event:'Герои подходят к старому мосту на лесной дороге.'};
function fixture(){
 const log=[],types=Object.fromEntries(['MESSAGE_SENT','MESSAGE_RECEIVED','USER_MESSAGE_RENDERED','CHARACTER_MESSAGE_RENDERED'].map(x=>[x,x]));
 const ctx={chat:[{mes:'Original'}],chatId:'one',characterId:0,chatMetadata:{},eventTypes:types,eventSource:{on(){},off(){},async emit(...args){log.push(args);}},addOneMessage(){log.push(['render']);},async saveChat(){log.push(['save']);}};
 const bridge=createTavernStoryBridge({getContext:()=>ctx,document:null});
 return {ctx,bridge,log,send:(sender='user')=>bridge.append(bridge.capture(),event,id,{sender})};
}
for(const sender of ['user','narrator','bot'])test(`${sender}: native events bracket rendering exactly once`,async()=>{
 const f=fixture();try{await f.send(sender);await f.send(sender);
 assert.deepEqual(f.log,[[sender==='bot'?'MESSAGE_RECEIVED':'MESSAGE_SENT',1,...(sender==='bot'?['command']:[])],['render'],[sender==='bot'?'CHARACTER_MESSAGE_RENDERED':'USER_MESSAGE_RENDERED',1,...(sender==='bot'?['command']:[])],['save']]);
 assert.equal(f.ctx.chat.length,2);assert.equal(f.ctx.chat[0].mes,'Original');assert.equal(f.ctx.chatMetadata.tainted,true);
 }finally{f.bridge.destroy();}
});
test('A failed save retries without duplicate native events or rendering',async()=>{
 const f=fixture();try{let n=0;f.ctx.saveChat=async()=>{if(!n++)throw Error('offline');};await assert.rejects(f.send(),{code:'APPEND'});await f.send();assert.equal(n,2);assert.equal(f.log.length,3);assert.equal(f.bridge.chatSavePending('dnd',id),false);}finally{f.bridge.destroy();}
});
test('Chat change during an event prevents render and save into the new chat',async()=>{
 const f=fixture();try{f.ctx.eventSource.emit=async()=>{f.ctx.chatId='two';f.ctx.chat=[];};await assert.rejects(f.send(),{code:'STALE'});assert.deepEqual(f.log,[]);assert.deepEqual(f.ctx.chat,[]);}finally{f.bridge.destroy();}
});
test('Chat change during save does not mark an old message saved',async()=>{
 const f=fixture(),original=f.ctx.chat;try{f.ctx.saveChat=async()=>{f.ctx.chatId='two';f.ctx.chat=[];};await assert.rejects(f.send(),{code:'STALE'});f.ctx.chat=original;f.ctx.chatId='one';assert.equal(f.bridge.chatSavePending('dnd',id),true);f.ctx.saveChat=async()=>{};await f.send();assert.equal(f.bridge.chatSavePending('dnd',id),false);assert.equal(f.log.filter(x=>x[0]==='render').length,1);}finally{f.bridge.destroy();}
});
test('Partial renderer failure and external listener failure cannot duplicate a message',async()=>{
 const f=fixture();try{f.ctx.eventSource.emit=async()=>{throw Error('plugin');};let n=0;f.ctx.addOneMessage=()=>{n++;throw Error('render');};await assert.rejects(f.send(),{code:'APPEND'});f.ctx.eventSource.emit=async()=>{throw Error('plugin');};await f.send();assert.equal(n,1);assert.equal(f.ctx.chat.length,2);assert.equal(f.log.some(x=>x[0]==='USER_MESSAGE_RENDERED'),false);}finally{f.bridge.destroy();}
});

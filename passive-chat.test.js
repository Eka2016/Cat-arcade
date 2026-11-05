import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createTavernStoryBridge} from '../dnd-tavern.js';

test('Ordinary chat events and status reads never start generation, send or save messages',()=>{
  const events=new EventEmitter(),calls=[];
  const names=['CHAT_CHANGED','GENERATION_STARTED','GENERATION_ENDED','GENERATION_STOPPED','MESSAGE_SENT','MESSAGE_RECEIVED','MESSAGE_EDITED','MESSAGE_UPDATED','MESSAGE_DELETED','MESSAGE_SWIPED'];
  const state={chat:[{mes:'Обычный разговор.',is_user:true}],chatId:'audit',characterId:0,onlineStatus:'connected',eventSource:events,eventTypes:Object.fromEntries(names.map(name=>[name,name])),
    generateQuietPrompt(){calls.push('quiet');},generate(){calls.push('generate');},addOneMessage(){calls.push('append');},saveChat(){calls.push('save');}};
  const bridge=createTavernStoryBridge({getContext:()=>state,document:{querySelector:()=>null}});
  let notifications=0;bridge.subscribe(()=>{notifications++;bridge.info();bridge.gameInfo();});
  try{
    for(let n=0;n<20;n++){
      state.chat.push({mes:`Сообщение ${n}`,is_user:n%2===0});
      events.emit('GENERATION_STARTED','normal',{},false);
      events.emit('MESSAGE_SENT',state.chat.length-1);events.emit('MESSAGE_RECEIVED',state.chat.length-1,'normal');
      events.emit('GENERATION_ENDED');events.emit('MESSAGE_UPDATED',0);
      if(n%3===0)events.emit('CHAT_CHANGED');
    }
    assert.ok(notifications>=40);assert.deepEqual(calls,[]);assert.equal(state.chat.length,21);
  }finally{bridge.destroy();}
  assert.ok(names.every(name=>events.listenerCount(name)===0));
});

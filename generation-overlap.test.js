import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createTavernStoryBridge} from '../dnd-tavern.js';
import {createGenerationNotice} from '../generation-notice.js';
import {Snake} from '../snake.js';
import {DurakGame} from '../durak.js';

const names=['GENERATION_STARTED','GENERATION_ENDED','GENERATION_STOPPED','CHAT_CHANGED','CHAT_RENAMED','MESSAGE_SENT','MESSAGE_RECEIVED','MESSAGE_EDITED','MESSAGE_UPDATED','MESSAGE_DELETED','MESSAGE_SWIPED'];
const settle=()=>new Promise(resolve=>setTimeout(resolve,5));

test('A pending ordinary response and local Snake/Durak play make no extra requests or mid-generation host saves',async()=>{
  const events=new EventEmitter(),calls={normal:0,quiet:0,append:0,save:0,abort:0};let release,reads=0,notices=0;
  const ctx={chat:[],chatId:'one',characterId:0,onlineStatus:'connected',eventSource:events,eventTypes:Object.fromEntries(names.map(name=>[name,name])),streamingProcessor:{isFinished:false},
    generate(){calls.normal++;events.emit('GENERATION_STARTED','normal',{},false);return new Promise(resolve=>release=resolve);},generateQuietPrompt(){calls.quiet++;},addOneMessage(){calls.append++;},saveChat(){calls.save++;},stopGeneration(){calls.abort++;}};
  const bridge=createTavernStoryBridge({getContext:()=>ctx,document:null});bridge.setActive(false);
  const off=bridge.subscribe(change=>{if(!change){notices++;bridge.capture();}});
  const normal=ctx.generate(),snake=new Snake(),durak=new DurakGame();snake.start();let saved=0;
  const listeners=names.map(name=>events.listenerCount(name));
  try{
    for(let n=0;n<1000;n++){
      if(snake.status!=='running'){snake.reset();snake.start();}snake.tick();
      if(durak.result)durak.reset();assert.ok(durak.play(durak.moves()[0]));
      const message={is_user:false};Object.defineProperty(message,'mes',{get(){reads++;return `Message ${n}`;}});ctx.chat.push(message);
      for(const name of ['MESSAGE_SENT','MESSAGE_RECEIVED','MESSAGE_UPDATED'])events.emit(name,n);
      bridge.queueSettingsSave(()=>saved++);
    }
    assert.equal(reads,0);assert.equal(notices,0);assert.equal(saved,0);
    assert.deepEqual(names.map(name=>events.listenerCount(name)),listeners);
    assert.deepEqual(calls,{normal:1,quiet:0,append:0,save:0,abort:0});
    ctx.streamingProcessor.isFinished=true;events.emit('GENERATION_ENDED');release();await normal;await settle();
    assert.equal(saved,1);assert.equal(reads,0);
    bridge.setActive(true);assert.equal(notices,1);assert.equal(reads,ctx.chat.length);
  }finally{off();bridge.destroy();}
  assert.ok(names.every(name=>events.listenerCount(name)===0));
});

test('Dormant games still receive lightweight chat invalidation and rename migration',()=>{
  const events=new EventEmitter(),ctx={chat:[{mes:'scene'}],chatId:'one',characterId:0,eventSource:events,eventTypes:Object.fromEntries(names.map(name=>[name,name]))};
  const bridge=createTavernStoryBridge({getContext:()=>ctx,document:null}),changes=[];
  bridge.setActive(false);bridge.subscribe(change=>changes.push(change));
  try{
    events.emit('MESSAGE_UPDATED',0);assert.deepEqual(changes,[]);
    events.emit('CHAT_RENAMED',{avatarId:0,oldFileName:'one.jsonl',newFileName:'two.jsonl'});
    events.emit('CHAT_CHANGED');assert.deepEqual(changes.map(c=>c.type),['chat-renamed','chat-changed']);
  }finally{bridge.destroy();}
});

test('Repeated enable/disable does not accumulate native listeners',()=>{
  const events=new EventEmitter(),ctx={chat:[],chatId:'one',characterId:0,eventSource:events,eventTypes:Object.fromEntries(names.map(name=>[name,name]))};
  for(let n=0;n<250;n++){
    const bridge=createTavernStoryBridge({getContext:()=>ctx,document:null});
    const notice=createGenerationNotice({getContext:()=>ctx,document:null});
    bridge.setActive(false);bridge.destroy();notice.destroy();
    assert.equal(events.eventNames().reduce((sum,name)=>sum+events.listenerCount(name),0),0);
  }
});

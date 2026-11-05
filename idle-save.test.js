import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdleSave} from '../idle-save.js';

function fixture(){
  let busy=true,id=0;const timers=new Map(),errors=[];
  const queue=createIdleSave({isBusy:()=>busy,setTimer:(fn,delay)=>{const key=++id;timers.set(key,{fn,delay});return key;},clearTimer:key=>timers.delete(key),onError:()=>errors.push('save')});
  return {queue,timers,errors,setBusy:value=>busy=value,tick(){const [key,job]=timers.entries().next().value;timers.delete(key);job.fn();}};
}

test('Ten thousand record changes during generation keep one latest save and no polling timer',()=>{
  const f=fixture(),saved=[];try{
    for(let n=0;n<10000;n++)f.queue.request(()=>saved.push(n));
    assert.deepEqual(saved,[]);assert.equal(f.timers.size,0);
    for(let n=0;n<10000;n++)f.queue.wake();assert.equal(f.timers.size,1);
    f.tick();assert.equal(f.timers.size,1);assert.deepEqual(saved,[]);
    f.setBusy(false);f.tick();assert.deepEqual(saved,[9999]);assert.equal(f.timers.size,0);
  }finally{f.queue.destroy();}
});
test('Idle storage errors reach the caller while deferred failures stay out of native event handlers',()=>{
  const f=fixture();try{
    f.setBusy(false);assert.throws(()=>f.queue.request(()=>{throw Error('storage');}));
    f.setBusy(true);f.queue.request(()=>{throw Error('storage');});f.setBusy(false);f.queue.wake();
    assert.doesNotThrow(()=>f.tick());assert.deepEqual(f.errors,['save']);assert.equal(f.timers.size,0);
  }finally{f.queue.destroy();}
});
test('Disable releases the queued save and its timer without calling the host later',()=>{
  const f=fixture();let saved=0;f.queue.request(()=>saved++);f.queue.wake();f.queue.destroy();
  assert.equal(f.timers.size,0);f.setBusy(false);f.queue.wake();f.queue.request(()=>saved++);assert.equal(saved,0);
});

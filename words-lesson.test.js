import test from 'node:test';
import assert from 'node:assert/strict';
import {createWordLesson,WORD_SHUFFLE_MS,WORD_DEAL_MS} from '../words-lesson.js';
function fixture(options={}){
 const clocks=[],changes=[];
 const clockFactory=(run,delay)=>{const state={run,delay,pending:false,active:false,destroyed:false,queues:0,activations:0};clocks.push(state);return {queue(){if(!state.destroyed&&!state.pending){state.pending=true;state.queues++;}},cancel(){state.pending=false;},setActive(value){state.active=!!value;state.activations++;},destroy(){state.destroyed=true;state.pending=false;}};};
 const lesson=createWordLesson({clockFactory,onChange:value=>changes.push(value),...options});
 return {lesson,clocks,changes,tick(index){const clock=clocks[index];if(clock.active&&clock.pending&&!clock.destroyed){clock.pending=false;clock.run();}},get pending(){return clocks.some(c=>c.pending);},get queues(){return clocks.reduce((n,c)=>n+c.queues,0);}};
}
test('A lesson schedules one card preparation and one deal, then has no idle animation clock',()=>{
 const f=fixture();assert.deepEqual(f.clocks.map(c=>c.delay),[WORD_SHUFFLE_MS,WORD_DEAL_MS]);assert.equal(f.lesson.ready,true);f.lesson.start();assert.equal(f.lesson.state.phase,'shuffle');
 f.tick(0);assert.equal(f.lesson.state.phase,'shuffle','An unopened game must not advance');f.lesson.setActive(true);f.tick(1);assert.equal(f.lesson.state.phase,'shuffle');
 f.tick(0);assert.equal(f.lesson.state.phase,'deal');assert.equal(f.lesson.ready,false);f.tick(0);assert.equal(f.lesson.state.phase,'deal');f.tick(1);assert.equal(f.lesson.ready,true);assert.equal(f.pending,false);assert.equal(f.queues,2);
 const count=f.changes.length;for(let i=0;i<50;i++){f.tick(0);f.tick(1);}assert.equal(f.changes.length,count);assert.equal(f.queues,2);assert.equal(f.lesson.state.round,1);f.lesson.start();assert.equal(f.lesson.state.round,2);f.lesson.destroy();
});
test('Hide/preset pauses preparation and dealing; repeated render activity never restarts either delay',()=>{
 const f=fixture();f.lesson.start();f.lesson.setActive(true);for(let i=0;i<100;i++)f.lesson.setActive(true);assert.deepEqual(f.clocks.map(c=>c.activations),[1,1]);
 f.lesson.setActive(false);f.tick(0);assert.equal(f.lesson.state.phase,'shuffle');f.lesson.setActive(true);f.tick(0);assert.equal(f.lesson.state.phase,'deal');
 f.lesson.setActive(false);f.tick(1);assert.equal(f.lesson.state.phase,'deal');f.lesson.setActive(true);f.tick(1);assert.equal(f.lesson.ready,true);assert.equal(f.queues,2);f.lesson.destroy();
});
test('Restarting a hidden round cancels the old deal; destroy removes all pending work',()=>{
 const f=fixture();f.lesson.start();f.lesson.setActive(true);f.tick(0);assert.equal(f.lesson.state.phase,'deal');f.lesson.setActive(false);f.lesson.start();assert.equal(f.lesson.state.round,2);assert.equal(f.lesson.state.phase,'shuffle');
 f.lesson.setActive(true);f.tick(1);assert.equal(f.lesson.state.phase,'shuffle','The former round cannot finish the new one');f.tick(0);assert.equal(f.lesson.state.phase,'deal');f.lesson.destroy();const count=f.changes.length;f.tick(1);f.lesson.start();f.lesson.setActive(true);assert.equal(f.changes.length,count);assert.equal(f.pending,false);assert.ok(f.clocks.every(c=>c.destroyed));
});
test('Reduced motion opens the question immediately, including when enabled in either animation phase',()=>{
 const f=fixture({reducedMotion:true});f.lesson.start();f.lesson.setActive(true);assert.equal(f.lesson.ready,true);assert.equal(f.queues,0);
 f.lesson.setReducedMotion(false);assert.equal(f.lesson.ready,true,'Changing the preference does not replay a scene');f.lesson.start();f.lesson.setReducedMotion(true);assert.equal(f.lesson.ready,true);assert.equal(f.pending,false);
 f.lesson.setReducedMotion(false);f.lesson.start();f.tick(0);assert.equal(f.lesson.state.phase,'deal');f.lesson.setReducedMotion(true);assert.equal(f.lesson.ready,true);assert.equal(f.pending,false);const n=f.changes.length;f.tick(1);assert.equal(f.changes.length,n);f.lesson.destroy();
});

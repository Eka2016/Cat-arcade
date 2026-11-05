import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameArtLoader} from '../game-art.js';
function fixture(){
 const calls=[],abort=new AbortController(),doc=new EventTarget();doc.defaultView={requestIdleCallback(){calls.push('idle');},setTimeout(){calls.push('timer');}};
 const views=Array.from({length:2},(_,i)=>{const image=Object.assign(new EventTarget(),{src:`scene-${i}`,loading:'lazy',complete:true,naturalWidth:100,decode(){calls.push(`decode-${i}`);return Promise.resolve();}});return{dataset:{},ownerDocument:doc,querySelectorAll:()=>[image],image};});
 return {calls,views,abort,loader:createGameArtLoader(views,{signal:abort.signal})};
}
test('A closed arcade schedules no background image loading or decoding',()=>{
 const f=fixture();try{f.loader.schedule();f.loader.refresh();f.loader.setBusy(false);assert.deepEqual(f.calls,[]);assert.ok(f.views.every(v=>v.image.loading==='lazy'));}finally{f.abort.abort();}
});
test('Opening one game warms its art without decoding another game',async()=>{
 const f=fixture();try{f.loader.warm(f.views[0]);await Promise.resolve();assert.deepEqual(f.calls,['decode-0']);assert.equal(f.views[0].image.loading,'eager');assert.equal(f.views[1].image.loading,'lazy');f.loader.setBusy(false);f.loader.refresh();assert.deepEqual(f.calls,['decode-0']);}finally{f.abort.abort();}
});

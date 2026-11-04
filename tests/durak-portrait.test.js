import test from 'node:test';
import assert from 'node:assert/strict';
import {createDurakPortrait,getDurakReaction} from '../durak-portrait.js';

const reaction=mood=>getDurakReaction({turn:mood==='thinking'?1:0,result:mood==='win'?{winner:1}:mood==='lose'?{winner:0}:null});
function fixture({loaded=true,paired=false}={}){
 let stamp=0,nextId=0;const timers=new Map(),history=[],motion=new EventTarget();motion.matches=false;
 const images=[null,...Array.from({length:3},()=>Object.assign(new EventTarget(),{complete:loaded,naturalWidth:loaded?1536:0}))];
 const extra=Object.assign(new EventTarget(),{complete:loaded,naturalWidth:loaded?1536:0});
 const layers=images.map((image,index)=>({style:{opacity:'0'},current:null,querySelector:()=>image,querySelectorAll:()=>paired&&index===1?[image,extra]:image?[image]:[],
  get offsetWidth(){throw Error('Emotion changes must not force layout');},
  animate(frames,options){const layer=this,a=new EventTarget();Object.assign(a,{frames,options,cancel(){if(layer.current===a)layer.current=null;}});this.current=a;history.push(a);return a;},
 }));
 const props=new Map(),labels=new Map(),art={dataset:{},style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k)},setAttribute:(k,v)=>labels.set(k,v),querySelectorAll:()=>layers,ownerDocument:{defaultView:{getComputedStyle:l=>({opacity:l.current?.painted??l.style.opacity}),matchMedia:()=>motion}}};
 const portrait=createDurakPortrait(art,{now:()=>stamp,setTimer:(fn,delay)=>{const id=++nextId;timers.set(id,{at:stamp+delay,fn});return id;},clearTimer:id=>timers.delete(id)});
 return{portrait,art,images,extra,layers,history,motion,timers,props,labels,tick(ms){stamp+=ms;for(let n=0;n<30;n++){const due=[...timers].find(([,v])=>v.at<=stamp);if(!due)break;timers.delete(due[0]);due[1].fn();}},load(frame){images[frame].complete=true;images[frame].naturalWidth=1536;images[frame].dispatchEvent(new Event('load'));}};
}

test('Durak victory and defeat are from the opponent perspective, and a draw is neutral',()=>{
 for(const turn of [0,1]){
  assert.equal(getDurakReaction({turn,result:{winner:1}}).mood,'win');
  assert.equal(getDurakReaction({turn,result:{winner:0}}).mood,'lose');
  assert.equal(getDurakReaction({turn,result:{winner:null}}).mood,'neutral');
 }
});
test('Only the actual side to move determines concentration before the result',()=>{
 for(const chain of [[],[{a:6,b:6}],Array(28).fill({a:0,b:1})])for(const turn of [0,1]){
  assert.equal(getDurakReaction({turn,chain,result:null,hands:[[],[]]}).mood,turn===1?'thinking':'neutral');
 }
});
test('Fast AI turns hold the thought briefly; repeated renders do not restart the hold',()=>{
 const f=fixture();try{
  f.portrait.setReaction(reaction('thinking'));f.portrait.setActive(true);f.tick(250);f.portrait.setReaction(reaction('neutral'));f.tick(30);f.portrait.setReaction(reaction('neutral'));f.tick(39);assert.equal(f.art.dataset.reaction,'thinking');f.tick(1);assert.equal(f.art.dataset.reaction,'neutral');assert.ok(f.history.some(a=>a.options.duration===320));
 }finally{f.portrait.destroy();}
});
test('Pause freezes emotion time and results interrupt pending neutral returns',()=>{
 const f=fixture();try{
  f.portrait.setReaction(reaction('thinking'));f.portrait.setActive(true);f.tick(200);f.portrait.setReaction(reaction('neutral'));f.portrait.setActive(false);assert.equal(f.timers.size,0);f.tick(5000);assert.equal(f.art.dataset.reaction,'thinking');f.portrait.setActive(true);f.tick(119);assert.equal(f.art.dataset.reaction,'thinking');f.portrait.setReaction(reaction('lose'));assert.equal(f.art.dataset.reaction,'lose');f.tick(1000);assert.equal(f.art.dataset.reaction,'lose');assert.equal(f.timers.size,0);
 }finally{f.portrait.destroy();}
});
test('Delayed images fade in when active and cannot replace a newer requested expression',async()=>{
 const f=fixture({loaded:false});try{
  f.portrait.setReaction(reaction('thinking'));f.portrait.setActive(true);assert.equal(f.art.dataset.reaction,'neutral');f.load(1);assert.equal(f.art.dataset.reaction,'thinking');assert.ok(f.history.some(a=>a.options.duration===320));
  let decoded;f.images[2].decode=()=>new Promise(r=>decoded=r);f.portrait.setReaction(reaction('win'));f.load(2);f.portrait.setReaction(reaction('lose'));f.load(3);assert.equal(f.art.dataset.reaction,'lose');decoded();await Promise.resolve();await Promise.resolve();assert.equal(f.art.dataset.reaction,'lose');
 }finally{f.portrait.destroy();}
});
test('A failed image keeps the intact base scene; decode-only rejection can use an already loaded image',async()=>{
 const f=fixture({loaded:false});try{
  f.portrait.setActive(true);f.portrait.setReaction(reaction('win'));f.images[2].dispatchEvent(new Event('error'));assert.equal(f.art.dataset.reaction,'neutral');
  f.images[1].decode=()=>Promise.reject(Error('Decode fixture'));f.portrait.setReaction(reaction('thinking'));f.load(1);await Promise.resolve();await Promise.resolve();assert.equal(f.art.dataset.reaction,'thinking');
 }finally{f.portrait.destroy();}
});
test('Restart and destruction cancel pending returns, image listeners and animation resources',()=>{
 const f=fixture();f.portrait.setReaction(reaction('thinking'));f.portrait.setActive(true);f.portrait.setReaction(reaction('neutral'));assert.equal(f.timers.size,1);f.portrait.reset(reaction('neutral'));assert.equal(f.timers.size,0);assert.equal(f.art.dataset.reaction,'neutral');f.portrait.setReaction(reaction('lose'));f.portrait.destroy();const mood=f.art.dataset.reaction;f.portrait.setReaction(reaction('thinking'));f.portrait.setActive(true);f.load(1);f.tick(5000);assert.equal(f.art.dataset.reaction,mood);assert.equal(f.timers.size,0);assert.ok(f.layers.every(l=>!l.current&&!l.style.willChange));assert.equal(f.props.size,0);
});
test('Reduced motion changes the visible face without creating opacity animations',()=>{
 const f=fixture();try{f.motion.matches=true;f.portrait.setActive(true);f.portrait.setReaction(reaction('win'));assert.equal(f.art.dataset.reaction,'win');assert.equal(f.history.length,0);assert.deepEqual(f.layers.map(l=>l.style.opacity),['0','0','1','0']);}finally{f.portrait.destroy();}
});

test('A normal AI turn lets concentration settle before a gentle return',()=>{
 const f=fixture();try{
  f.portrait.setActive(true);f.portrait.setReaction(reaction('thinking'));
  assert.equal(f.history.at(-1).options.duration,320);
  assert.equal(f.history.at(-1).options.easing,'ease-in-out');
  f.tick(650);f.portrait.setReaction(reaction('neutral'));
  assert.equal(f.art.dataset.reaction,'neutral');
  assert.equal(f.history.at(-1).options.duration,320);
  f.portrait.setReaction(reaction('win'));
  assert.equal(f.history.at(-1).options.duration,320);
 }finally{f.portrait.destroy();}
});

test('Reversing the gaze continues from its painted opacity with poker timing',()=>{
 const f=fixture();try{
  f.portrait.setActive(true);f.portrait.setReaction(reaction('thinking'));
  f.tick(320);f.portrait.setReaction(reaction('neutral'));
  f.layers[1].current.painted='0.58';
  f.portrait.setReaction(reaction('thinking'));
  const animation=f.layers[1].current;assert.equal(animation.frames[0].opacity,'0.58');assert.equal(animation.frames[1].opacity,'1');assert.equal(animation.options.duration,320);assert.equal(animation.options.easing,'ease-in-out');
 }finally{f.portrait.destroy();}
});

test('Downcast eyes become visible together after both registered patches decode',async()=>{
 const f=fixture({loaded:false,paired:true});try{
  let finishSecond;f.images[1].decode=()=>Promise.resolve();f.extra.decode=()=>new Promise(r=>finishSecond=r);
  f.portrait.setActive(true);f.portrait.setReaction(reaction('thinking'));f.load(1);
  await Promise.resolve();assert.equal(f.art.dataset.reaction,'neutral');
  finishSecond();for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(f.art.dataset.reaction,'thinking');
 }finally{f.portrait.destroy();}
});

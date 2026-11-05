import test from 'node:test';
import assert from 'node:assert/strict';
import {createChessPortrait} from '../chess-portrait.js';
const moods=Object.fromEntries(['neutral','thinking','win','lose'].map((mood,frame)=>[mood,{mood,frame,label:mood}]));
function fixture(options={}){
 let clock=0,nextId=0;const timers=new Map();
 const layers=Array.from({length:4},()=>({style:{opacity:'0'},image:{style:{}},offsetWidth:1,querySelector(){return this.image;}}));
 const art={dataset:{},style:{setProperty(k,v){this[k]=v;}},ownerDocument:{defaultView:{getComputedStyle:layer=>layer.style}},querySelectorAll:()=>layers,setAttribute(k,v){this[k]=v;}};
 const controller=createChessPortrait(art,{now:()=>clock,setTimer(fn,delay){const id=++nextId;timers.set(id,{fn,due:clock+delay});return id;},clearTimer:id=>timers.delete(id),...options});
 controller.setReaction(moods.neutral);controller.setActive(true);
 function advance(ms){const end=clock+ms;for(;;){const next=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!next)break;clock=next[1].due;timers.delete(next[0]);next[1].fn();}clock=end;}
 return {art,layers,controller,advance,timers};
}
test('A quick chess reply leaves the thoughtful expression readable before a slower return',()=>{
 const f=fixture();try{f.controller.setReaction(moods.thinking);assert.equal(f.art.dataset.reaction,'thinking');assert.equal(f.art.style['--chess-emotion-duration'],'440ms');f.advance(550);f.controller.setReaction(moods.neutral);assert.equal(f.art.dataset.reaction,'thinking');f.advance(699);assert.equal(f.art.dataset.reaction,'thinking');f.advance(1);assert.equal(f.art.dataset.reaction,'neutral');assert.equal(f.art.style['--chess-emotion-duration'],'560ms');}finally{f.controller.destroy();}
});
test('Fast consecutive turns cancel the pending return without flickering or postponing it on every render',()=>{
 const f=fixture();try{f.controller.setReaction(moods.thinking);f.advance(550);f.controller.setReaction(moods.neutral);f.advance(350);f.controller.setReaction(moods.thinking);assert.equal(f.timers.size,0);f.advance(600);assert.equal(f.art.dataset.reaction,'thinking');f.controller.setReaction(moods.neutral);f.advance(400);f.controller.setReaction(moods.neutral);f.advance(20);assert.equal(f.art.dataset.reaction,'neutral');}finally{f.controller.destroy();}
});
test('Portrait dwell freezes while hidden, and resetting or destroying cancels deferred changes',()=>{
 const f=fixture();f.controller.setReaction(moods.thinking);f.advance(550);f.controller.setReaction(moods.neutral);f.controller.setActive(false);f.advance(5000);assert.equal(f.art.dataset.reaction,'thinking');assert.equal(f.timers.size,0);f.controller.setActive(true);f.advance(699);assert.equal(f.art.dataset.reaction,'thinking');f.advance(1);assert.equal(f.art.dataset.reaction,'neutral');
 f.controller.setReaction(moods.thinking);f.advance(550);f.controller.setReaction(moods.neutral);f.controller.reset(moods.neutral);assert.equal(f.art.dataset.reaction,'neutral');assert.equal(f.timers.size,0);f.controller.setReaction(moods.thinking);f.advance(550);f.controller.setReaction(moods.neutral);f.controller.destroy();f.advance(5000);assert.equal(f.art.dataset.reaction,'thinking');assert.equal(f.timers.size,0);
});
test('Actual victory or defeat takes priority over a pending idle expression, with stationary atlas cells',()=>{
 for(const result of ['win','lose']){const f=fixture();try{const anchors=f.layers.map(l=>({...l.image.style}));f.controller.setReaction(moods.thinking);f.advance(550);f.controller.setReaction(moods.neutral);f.controller.setReaction(moods[result]);assert.equal(f.art.dataset.reaction,result);assert.equal(f.art.style['--chess-emotion-duration'],'620ms');f.advance(2000);assert.equal(f.art.dataset.reaction,result);assert.deepEqual(f.layers.map(l=>l.image.style),anchors);assert.equal(f.layers[result==='win'?2:3].style.opacity,'1');}finally{f.controller.destroy();}}
});
test('Isolated checkers portraits keep every image at the origin throughout changes and resets',()=>{
 const f=fixture({isolatedFrames:true});try{
  const origin=Array.from({length:4},()=>({left:'0%',top:'0%'}));assert.deepEqual(f.layers.map(l=>l.image.style),origin);
  for(const mood of ['thinking','win','lose','neutral']){f.controller.setReaction(moods[mood]);f.advance(1600);assert.equal(f.art.dataset.reaction,mood);assert.deepEqual(f.layers.map(l=>l.image.style),origin);}
  f.controller.setActive(false);f.controller.reset(moods.neutral);assert.deepEqual(f.layers.map(l=>l.image.style),origin);
 }finally{f.controller.destroy();}
 const old=fixture();assert.deepEqual(old.layers.map(l=>l.image.style),[{left:'0%',top:'0%'},{left:'-100%',top:'0%'},{left:'0%',top:'-100%'},{left:'-100%',top:'-100%'}]);old.controller.destroy();
});
test('Checkers returns from thinking promptly, while pause and consecutive turns retain the correct expression',()=>{
 const f=fixture({isolatedFrames:true,transitionMs:{thinking:300,neutral:360,result:520},thinkingHoldMs:650,neutralDelayMs:80});try{
  f.controller.setReaction(moods.thinking);assert.equal(f.art.style['--chess-emotion-duration'],'300ms');f.advance(550);f.controller.setReaction(moods.neutral);f.advance(50);assert.equal(f.art.dataset.reaction,'thinking');
  f.controller.setActive(false);f.advance(2000);f.controller.setActive(true);f.advance(49);assert.equal(f.art.dataset.reaction,'thinking');f.advance(1);assert.equal(f.art.dataset.reaction,'neutral');assert.equal(f.art.style['--chess-emotion-duration'],'360ms');
  f.controller.setReaction(moods.thinking);f.advance(700);f.controller.setReaction(moods.neutral);f.advance(79);assert.equal(f.art.dataset.reaction,'thinking');f.advance(1);assert.equal(f.art.dataset.reaction,'neutral');
  f.controller.setReaction(moods.thinking);f.advance(550);f.controller.setReaction(moods.neutral);f.advance(40);f.controller.setReaction(moods.thinking);assert.equal(f.timers.size,0);f.controller.setReaction(moods.win);assert.equal(f.art.style['--chess-emotion-duration'],'520ms');f.controller.reset(moods.neutral);assert.equal(f.art.dataset.reaction,'neutral');assert.equal(f.timers.size,0);
 }finally{f.controller.destroy();}
});

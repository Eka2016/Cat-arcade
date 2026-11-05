import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortraitFade} from '../portrait-fade.js';

function fixture(){
  const motion=new EventTarget();motion.matches=false;const history=[];
  const layers=Array.from({length:4},()=>({style:{opacity:'0'},current:null,
    get offsetWidth(){throw Error('An opacity fade must not force layout');},
    animate(frames,options){
      const layer=this,animation=new EventTarget();Object.assign(animation,{frames,options,cancelled:false,cancel(){this.cancelled=true;if(layer.current===this)layer.current=null;}});
      this.current=animation;history.push(animation);return animation;
    },
  }));
  const art={ownerDocument:{defaultView:{getComputedStyle:layer=>({opacity:layer.current?.painted??layer.style.opacity}),matchMedia:()=>motion}}};
  const fade=createPortraitFade(art,layers,{easing:'ease-in-out'});fade.show(0,{instant:true});
  return{fade,layers,motion,history};
}
test('An interrupted whole-portrait fade continues from painted opacity without layout reads or shortened reverse transitions',()=>{
  const f=fixture();try{
    f.fade.show(1,{duration:320});assert.equal(f.history.length,2);for(const animation of f.history){assert.equal(animation.options.duration,320);assert.equal(animation.options.easing,'ease-in-out');}
    const stale=f.layers[0].current;f.layers[0].current.painted='.65';f.layers[1].current.painted='.35';
    f.fade.show(2,{duration:620});const current=f.layers.map(l=>l.current).filter(Boolean);assert.equal(current.length,3);assert.equal(current.reduce((n,a)=>n+Number(a.frames[0].opacity),0),1);assert.equal(f.layers[0].current.frames[0].opacity,'.65');assert.equal(f.layers[1].current.frames[0].opacity,'.35');assert.ok(current.every(a=>a.options.duration===620));
    stale.dispatchEvent(new Event('finish'));assert.equal(f.layers[0].current,current[0],'A stale completion must not cancel its replacement');
    for(const animation of current)animation.dispatchEvent(new Event('finish'));assert.ok(f.layers.every(l=>!l.current&&!l.style.willChange));assert.deepEqual(f.layers.map(l=>l.style.opacity),['0','0','1','0']);
  }finally{f.fade.destroy();}
});
test('Pause, reduced motion and destruction settle to one complete portrait and cancel all pending animations',()=>{
  const f=fixture();f.fade.show(1);f.fade.finish();assert.deepEqual(f.layers.map(l=>l.style.opacity),['0','1','0','0']);assert.ok(f.layers.every(l=>!l.current&&!l.style.willChange));
  f.fade.show(2);f.motion.matches=true;f.motion.dispatchEvent(new Event('change'));assert.ok(f.layers.every(l=>!l.current));const count=f.history.length;f.fade.show(3);assert.equal(f.history.length,count);assert.deepEqual(f.layers.map(l=>l.style.opacity),['0','0','0','1']);
  f.motion.matches=false;f.fade.show(0);f.fade.destroy();assert.ok(f.layers.every(l=>!l.current&&!l.style.willChange));f.fade.show(1);assert.deepEqual(f.layers.map(l=>l.style.opacity),['1','0','0','0']);
});

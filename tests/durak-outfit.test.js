import test from 'node:test';
import assert from 'node:assert/strict';
import {createDurakOutfit} from '../durak-outfit.js';
import {sanitizeSettings} from '../arcade.js';

function fixture(outfit='sweater',options={}){
  const attributes=new Map(),properties=new Map(),requests=[],errors=[];
  const image=Object.assign(new EventTarget(),{hidden:true,complete:false,naturalWidth:0,getAttribute:name=>attributes.get(name),removeAttribute:name=>attributes.delete(name)});
  Object.defineProperty(image,'src',{set(value){attributes.set('src',value);requests.push(value);}});
  const art={dataset:{},style:{setProperty:(name,value)=>properties.set(name,value),removeProperty:name=>properties.delete(name)}};
  const controller=createDurakOutfit(art,image,{outfit,source:'shirt.webp',onError:()=>errors.push('load'),...options});
  return {art,image,controller,requests,errors,properties,load(){image.complete=true;image.naturalWidth=1536;image.dispatchEvent(new Event('load'));}};
}

test('Older settings keep the sweater and the saved outfit stays independent of character visibility',()=>{
  for(const durakOutfit of [undefined,null,'constructor','__proto__','dress',{},['shirt']])assert.equal(sanitizeSettings({durakOutfit}).durakOutfit,'sweater');
  const saved=sanitizeSettings({durakOutfit:'shirt',characters:{durak:false},durakDifficulty:'hard',durakTableStyle:'green'});
  assert.deepEqual(sanitizeSettings(JSON.parse(JSON.stringify(saved))),saved);
  assert.equal(saved.durakOutfit,'shirt');assert.equal(saved.characters.durak,false);
  assert.equal(saved.durakDifficulty,'hard');assert.equal(saved.durakTableStyle,'green');
});

test('Choosing a shirt in the closed menu makes no request until the character is shown',()=>{
  const f=fixture();try{
    f.controller.setActive(true);assert.deepEqual(f.requests,[]);
    f.controller.setActive(false);f.controller.setOutfit('shirt');assert.deepEqual(f.requests,[]);
    assert.equal(f.art.dataset.outfit,'sweater');
    f.controller.setActive(true);assert.deepEqual(f.requests,['shirt.webp']);assert.equal(f.image.loading,'eager');
    f.load();assert.equal(f.art.dataset.outfit,'shirt');assert.equal(f.image.hidden,false);
    f.controller.setOutfit('sweater');assert.equal(f.art.dataset.outfit,'sweater');assert.equal(f.image.hidden,true);
    f.controller.setOutfit('shirt');assert.deepEqual(f.requests,['shirt.webp']);assert.equal(f.art.dataset.outfit,'shirt');
  }finally{f.controller.destroy();}
});

test('A saved shirt does not fetch or decode while hidden; a completed hidden load waits for reopening',()=>{
  const f=fixture('shirt');try{
    let decodes=0;f.image.decode=async()=>{decodes++;};assert.deepEqual(f.requests,[]);
    f.controller.setActive(true);f.controller.setActive(false);f.load();assert.equal(decodes,0);
    assert.equal(f.art.dataset.outfit,'sweater');f.controller.setActive(true);assert.equal(decodes,1);
  }finally{f.controller.destroy();}
});

test('A slow decode cannot restore a shirt after switching back to the sweater',async()=>{
  const f=fixture('shirt');try{
    let decoded;f.image.decode=()=>new Promise(resolve=>decoded=resolve);
    f.controller.setActive(true);f.load();assert.equal(f.art.dataset.outfit,'sweater');
    f.controller.setOutfit('sweater');decoded();await Promise.resolve();
    assert.equal(f.art.dataset.outfit,'sweater');assert.equal(f.image.hidden,true);
    f.controller.setOutfit('shirt');assert.equal(f.art.dataset.outfit,'shirt');assert.equal(f.requests.length,1);
  }finally{f.controller.destroy();}
});

test('A failed outfit falls back to the intact sweater and can be retried',()=>{
  const f=fixture('shirt');try{
    f.controller.setActive(true);f.image.dispatchEvent(new Event('error'));
    assert.equal(f.art.dataset.outfit,'sweater');assert.deepEqual(f.errors,['load']);
    f.controller.setOutfit('shirt');f.load();assert.equal(f.art.dataset.outfit,'shirt');assert.equal(f.requests.length,2);
  }finally{f.controller.destroy();}
});

test('Destroying a pending outfit ignores late events and removes resources',async()=>{
  const f=fixture('shirt');let decoded;f.image.decode=()=>new Promise(resolve=>decoded=resolve);
  f.controller.setActive(true);f.load();f.controller.destroy();decoded();await Promise.resolve();
  f.image.dispatchEvent(new Event('error'));f.controller.setOutfit('shirt');f.controller.setActive(true);
  assert.equal(f.properties.size,0);assert.equal(f.image.getAttribute('src'),undefined);
  assert.equal(f.art.dataset.outfit,'sweater');assert.deepEqual(f.errors,[]);
});

test('The shirt cannot appear without its original head, including a delayed head decode',async()=>{
  let decoded;
  const headImage=Object.assign(new EventTarget(),{complete:false,naturalWidth:0,decode:()=>new Promise(resolve=>decoded=resolve)});
  const f=fixture('shirt',{headImage});try{
    f.controller.setActive(true);f.load();assert.equal(f.art.dataset.outfit,'sweater');
    headImage.complete=true;headImage.naturalWidth=1536;headImage.dispatchEvent(new Event('load'));
    assert.equal(f.art.dataset.outfit,'sweater');decoded();await Promise.resolve();
    assert.equal(f.art.dataset.outfit,'shirt');
  }finally{f.controller.destroy();}
});

test('A stale failed-attempt decode cannot cancel a successful retry',async()=>{
  const f=fixture('shirt');try{
    let oldDecode;f.image.decode=()=>new Promise(resolve=>oldDecode=resolve);
    f.controller.setActive(true);f.load();f.image.dispatchEvent(new Event('error'));
    f.image.complete=false;f.image.naturalWidth=0;f.image.decode=()=>Promise.resolve();
    f.controller.setOutfit('shirt');oldDecode();await Promise.resolve();
    assert.deepEqual(f.errors,['load']);f.load();await Promise.resolve();
    assert.equal(f.art.dataset.outfit,'shirt');
  }finally{f.controller.destroy();}
});

test('Closing before a head load does not decode it in the background',async()=>{
  let decodes=0;
  const headImage=Object.assign(new EventTarget(),{complete:false,naturalWidth:0,decode:async()=>{decodes++;}});
  const f=fixture('shirt',{headImage});try{
    f.controller.setActive(true);f.load();f.controller.setActive(false);
    headImage.complete=true;headImage.naturalWidth=1536;headImage.dispatchEvent(new Event('load'));
    assert.equal(decodes,0);f.controller.setActive(true);await Promise.resolve();
    assert.equal(decodes,1);assert.equal(f.art.dataset.outfit,'shirt');
  }finally{f.controller.destroy();}
});

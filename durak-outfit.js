import {sanitizeDurakOutfit} from './durak-appearance.js';

// Keep the existing head and expressions. The alternate image supplies only clothing
// and the lower neck, with one stationary feathered join above the shirt collar.
const HEAD_SHAPE='M0 0H1536V416H906Q888 416 880 451L872 520Q837 550 778 558Q716 548 650 504L637 454Q631 426 608 416H0Z';
const FILTER='<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="8"/></filter>';
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">${body}</svg>`;
export const DURAK_HEAD_MASK=svg(`<defs>${FILTER}</defs><path d="${HEAD_SHAPE}" fill="white" filter="url(#soft)"/>`);
// The body remains opaque underneath the feathered head, avoiding a dark alpha seam.
export const DURAK_SHIRT_MASK=svg('<path d="M0 420H1536V1024H0Z" fill="white"/>');

/** One optional, lazy outfit image. No additional expression set or animation loop. */
export function createDurakOutfit(art,image,{outfit='sweater',source,headImage,onError=()=>{}}={}){
  let requested=sanitizeDurakOutfit(outfit),active=false,ready=false,decoding=false,destroyed=false,failed=false,revision=0,headReady=!headImage,headDecoding=false;
  for(const [name,mask] of [['head',DURAK_HEAD_MASK],['shirt',DURAK_SHIRT_MASK]])art.style.setProperty(`--durak-${name}-mask`,`url("data:image/svg+xml,${encodeURIComponent(mask)}")`);
  function display(){
    const show=requested==='shirt'&&ready&&headReady;
    art.dataset.outfit=show?'shirt':'sweater';image.hidden=!show;
  }
  function errored(){
    if(destroyed||failed)return;
    revision++;failed=true;decoding=false;headDecoding=false;ready=false;
    const notify=requested==='shirt';requested='sweater';display();if(notify)onError();
  }
  function loaded(){
    if(destroyed||!active||requested!=='shirt'||decoding||ready||failed)return;
    if(!image.naturalWidth){errored();return;}
    const job=revision;
    const finish=()=>{if(destroyed||job!==revision)return;decoding=false;if(!image.naturalWidth){errored();return;}ready=true;display();};
    if(typeof image.decode==='function'){
      decoding=true;void image.decode().then(finish,()=>{if(destroyed||job!==revision)return;if(image.complete&&image.naturalWidth)finish();else errored();});
    }else finish();
  }
  function prepareHead(){
    if(destroyed||!active||requested!=='shirt'||failed||headReady||headDecoding||!headImage?.complete||!headImage.naturalWidth)return;
    const job=revision;
    const finish=()=>{if(destroyed||job!==revision)return;headDecoding=false;if(!headImage.naturalWidth){errored();return;}headReady=true;display();};
    if(typeof headImage.decode==='function'){
      headDecoding=true;void headImage.decode().then(finish,()=>{if(destroyed||job!==revision)return;if(headImage.complete&&headImage.naturalWidth)finish();else errored();});
    }else finish();
  }
  function begin(){
    if(destroyed||!active||requested!=='shirt'||failed)return;
    prepareHead();if(ready||failed)return;
    if(!image.getAttribute('src')){image.loading='eager';image.fetchPriority='high';image.src=source;}
    if(image.complete&&image.naturalWidth)loaded();
  }
  image.addEventListener('load',loaded);image.addEventListener('error',errored);headImage?.addEventListener('load',prepareHead);display();
  return {
    setOutfit(value){if(destroyed)return;requested=sanitizeDurakOutfit(value);if(requested==='shirt'&&failed){revision++;failed=false;image.removeAttribute('src');}display();begin();},
    setActive(value){if(destroyed)return;active=!!value;begin();},
    destroy(){if(destroyed)return;destroyed=true;revision++;image.removeEventListener('load',loaded);image.removeEventListener('error',errored);headImage?.removeEventListener('load',prepareHead);image.removeAttribute('src');for(const name of ['head','shirt'])art.style.removeProperty(`--durak-${name}-mask`);},
  };
}

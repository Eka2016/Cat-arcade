import {createPortraitFade} from './portrait-fade.js';

const REACTIONS=Object.freeze({
  neutral:{mood:'neutral',frame:0,label:'Соперник спокойно ждёт за карточным столом.'},
  thinking:{mood:'thinking',frame:1,label:'Соперник обдумывает свой ход.'},
  win:{mood:'win',frame:2,label:'Соперник радуется своей победе.'},
  lose:{mood:'lose',frame:3,label:'Соперник огорчён своим поражением.'},
});

export function getDurakReaction(game,result=game.result){
  if(result)return REACTIONS[result.winner===1?'win':result.winner===0?'lose':'neutral'];
  return REACTIONS[game.turn===1?'thinking':'neutral'];
}

// Only the face is visible from edited images; the neutral portrait, hair, neck, hands and sweater stay underneath.
const FACE_MASK='<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><defs><filter id="soft" x="-25%" y="-40%" width="150%" height="180%"><feGaussianBlur stdDeviation="9"/></filter></defs><g fill="white" filter="url(#soft)"><path d="M601 265Q632 246 675 261L683 306Q648 329 612 317Z"/><path d="M711 248Q755 225 798 242L814 280Q776 309 725 300Z"/><path d="M657 385Q712 359 784 367L807 397Q757 438 683 429Z"/></g></svg>';
// Register the two downcast eyes separately. Brows and surrounding face stay
// in the base so their lower position in the painted source cannot slide down.
const THINKING_MASK='<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><defs><filter id="soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="2"/></filter></defs><g fill="white" filter="url(#soft)"><path d="M603 295Q634 279 668 287L685 299Q658 321 625 320L602 309Z"/><path d="M718 276Q749 257 784 257L804 270Q780 297 741 301L718 290Z"/></g></svg>';

/** Finite, face-only fades with load gating and a short, pause-aware thinking hold. */
export function createDurakPortrait(art,{sources=[],now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,thinkingHoldMs=320,neutralDelayMs=0}={}){
  const layers=[...art.querySelectorAll('.durak-emotion-layer')],fade=createPortraitFade(art,layers,{easing:'ease-in-out'});
  const ready=new Set([0]),failed=new Set(),listeners=[];
  let current=REACTIONS.neutral,requested=null,pending=null,timer=null,active=false,destroyed=false,elapsed=0,activeAt=0,thinkingAt=0;
  const time=()=>elapsed+(active?now()-activeAt:0);
  art.style.setProperty('--durak-face-mask',`url("data:image/svg+xml,${encodeURIComponent(FACE_MASK)}")`);
  art.style.setProperty('--durak-thinking-mask',`url("data:image/svg+xml,${encodeURIComponent(THINKING_MASK)}")`);
  function clear(){if(timer!==null)clearTimer(timer);timer=null;}
  function display(reaction,instant=false){
    if(destroyed)return;
    const changed=current.frame!==reaction.frame,duration=320;
    art.style.setProperty('--durak-emotion-duration',`${duration}ms`);
    if(changed||instant)fade.show(reaction.frame,{instant,duration});
    if(changed&&reaction.mood==='thinking')thinkingAt=time();
    current=reaction;art.dataset.reaction=reaction.mood;art.setAttribute('aria-label',reaction.label);
  }
  function flush(){
    clear();if(destroyed||!pending||requested?.frame!==pending.reaction.frame||(!active&&!pending.instant))return;
    if(failed.has(pending.reaction.frame)){pending=null;display(REACTIONS.neutral,true);return;}
    if(!ready.has(pending.reaction.frame))return;
    const wait=pending.at-time();
    if(active&&wait>0){timer=setTimer(()=>{timer=null;flush();},wait);return;}
    const next=pending;pending=null;display(next.reaction,next.instant||!active);
  }
  display(REACTIONS.neutral,true);
  layers.forEach((layer,frame)=>{
    if(frame===0)return;const image=layer.querySelector('img');if(!image){failed.add(frame);return;}
    const images=layer.querySelectorAll?[...layer.querySelectorAll('img')]:[image];
    function loaded(){
      if(destroyed)return;
      const finish=()=>{if(destroyed||!image.naturalWidth)return;ready.add(frame);flush();};
      if(!image.naturalWidth){errored();return;}
      if(typeof image.decode==='function')void Promise.all(images.map(item=>typeof item.decode==='function'?item.decode():Promise.resolve())).then(finish,()=>{if(image.complete&&image.naturalWidth)finish();else errored();});else finish();
    }
    function errored(){if(destroyed)return;failed.add(frame);flush();}
    image.addEventListener('load',loaded);image.addEventListener('error',errored);listeners.push(()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',errored);});
    if(sources[frame-1])for(const item of images)item.src=sources[frame-1];
    if(image.complete&&image.naturalWidth)loaded();
  });
  return {
    setReaction(reaction){
      if(destroyed||requested?.frame===reaction.frame)return;
      requested=reaction;art.dataset.requestedReaction=reaction.mood;clear();
      const at=active&&reaction.mood==='neutral'&&current.mood==='thinking'?Math.max(thinkingAt+thinkingHoldMs,time()+neutralDelayMs):time();
      pending={reaction,at,instant:!active};flush();
    },
    setActive(value){
      if(destroyed||active===!!value)return;
      if(active)elapsed=time();else activeAt=now();active=!!value;
      if(active){if(pending)pending.instant=false;flush();}else{clear();fade.finish();}
    },
    reset(reaction){
      if(destroyed)return;clear();requested=reaction;art.dataset.requestedReaction=reaction.mood;
      pending={reaction,at:time(),instant:true};if(!ready.has(reaction.frame))display(REACTIONS.neutral,true);flush();
    },
    destroy(){if(destroyed)return;destroyed=true;clear();pending=null;for(const remove of listeners)remove();fade.destroy();art.style.removeProperty('--durak-face-mask');art.style.removeProperty('--durak-thinking-mask');art.style.removeProperty('--durak-emotion-duration');},
  };
}

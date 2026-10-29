import {createPortraitFade} from './portrait-fade.js';

const REACTIONS=Object.freeze({
  neutral:{mood:'neutral',frame:0,label:'Соперник спокойно смотрит на доску.'},
  thinking:{mood:'thinking',frame:1,label:'Соперник обдумывает свой ход.'},
  win:{mood:'win',frame:2,label:'Соперник радуется своей победе.'},
  lose:{mood:'lose',frame:3,label:'Соперник огорчён своим поражением.'},
});

export function getDominoReaction(game,result=game.result){
  if(result)return REACTIONS[result.winner===1?'win':result.winner===0?'lose':'neutral'];
  return REACTIONS[game.turn===1?'thinking':'neutral'];
}

// Only the face is visible from edited images; the original room, hair, hands and sweater stay underneath.
const FACE_MASK='<svg xmlns="http://www.w3.org/2000/svg" width="1774" height="887" viewBox="0 0 1774 887"><defs><filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter></defs><path fill="white" filter="url(#soft)" d="M728 266Q747 229 790 204Q835 177 879 190Q928 200 949 246L965 290Q971 333 946 381Q918 431 874 456Q855 464 835 450L797 420L779 398Q767 377 741 362L717 344Q709 310 728 266Z"/></svg>';

/** Finite, face-only fades with load gating and a short, pause-aware thinking hold. */
export function createDominoPortrait(art,{sources=[],now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,thinkingHoldMs=950,neutralDelayMs=200}={}){
  const layers=[...art.querySelectorAll('.domino-emotion-layer')],fade=createPortraitFade(art,layers,{easing:'cubic-bezier(.4,0,.2,1)'});
  const ready=new Set([0]),failed=new Set(),listeners=[];
  let current=REACTIONS.neutral,requested=null,pending=null,timer=null,active=false,destroyed=false,elapsed=0,activeAt=0,thinkingAt=0;
  const time=()=>elapsed+(active?now()-activeAt:0);
  art.style.setProperty('--domino-face-mask',`url("data:image/svg+xml,${encodeURIComponent(FACE_MASK)}")`);
  function clear(){if(timer!==null)clearTimer(timer);timer=null;}
  function display(reaction,instant=false){
    if(destroyed)return;
    const changed=current.frame!==reaction.frame,duration=reaction.mood==='thinking'?480:reaction.mood==='neutral'?620:680;
    art.style.setProperty('--domino-emotion-duration',`${duration}ms`);
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
    function loaded(){
      if(destroyed)return;
      const finish=()=>{if(destroyed||!image.naturalWidth)return;ready.add(frame);flush();};
      if(!image.naturalWidth){errored();return;}
      if(typeof image.decode==='function')void image.decode().then(finish,()=>{if(image.complete&&image.naturalWidth)finish();else errored();});else finish();
    }
    function errored(){if(destroyed)return;failed.add(frame);flush();}
    image.addEventListener('load',loaded);image.addEventListener('error',errored);listeners.push(()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',errored);});
    if(sources[frame-1])image.src=sources[frame-1];
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
    destroy(){if(destroyed)return;destroyed=true;clear();pending=null;for(const remove of listeners)remove();fade.destroy();art.style.removeProperty('--domino-face-mask');art.style.removeProperty('--domino-emotion-duration');},
  };
}

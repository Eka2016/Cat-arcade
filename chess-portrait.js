import {createPortraitFade} from './portrait-fade.js';

/** One-shot expression changes, with time to read a thought before it relaxes. */
export function createChessPortrait(art,{now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,isolatedFrames=false,transitionMs={thinking:440,neutral:560,result:620},thinkingHoldMs=1250,neutralDelayMs=420}={}){
  const layers=[...art.querySelectorAll('.chess-character-layer')];
  const fade=createPortraitFade(art,layers,{easing:isolatedFrames?'cubic-bezier(.4,0,.2,1)':'cubic-bezier(.25,.1,.25,1)'});
  let current=null,requested=null,pending=null,timer=null,destroyed=false,active=false,elapsed=0,activeAt=0,thinkingAt=0;
  const time=()=>elapsed+(active?now()-activeAt:0);
  layers.forEach((layer,frame)=>{const image=layer.querySelector('img');image.style.left=isolatedFrames?'0%':`${-(frame%2)*100}%`;image.style.top=isolatedFrames?'0%':`${-Math.floor(frame/2)*100}%`;});
  function clear(){if(timer!==null)clearTimer(timer);timer=null;}
  function display(reaction,instant=false){
    const changed=current?.frame!==reaction.frame;
    if(!changed&&!instant)return;
    const duration=transitionMs[reaction.mood]??transitionMs.result;
    art.style.setProperty('--chess-emotion-duration',`${duration}ms`);
    fade.show(reaction.frame,{instant,duration});
    if(changed&&reaction.mood==='thinking')thinkingAt=time();
    current=reaction;art.dataset.reaction=reaction.mood;art.setAttribute('aria-label',reaction.label);
  }
  function arm(){
    clear();if(!active||!pending||destroyed)return;
    timer=setTimer(()=>{timer=null;if(destroyed||!active||!pending)return;const next=pending;pending=null;if(requested?.frame===next.reaction.frame)display(next.reaction);},Math.max(0,pending.at-time()));
  }
  return {
    setReaction(reaction){
      if(destroyed||requested?.frame===reaction.frame)return;
      requested=reaction;clear();pending=null;
      if(!current||!active){display(reaction,true);return;}
      if(reaction.mood==='neutral'&&current.mood==='thinking'){
        // A fast local reply must not reverse the expression as soon as it appears.
        pending={reaction,at:Math.max(thinkingAt+thinkingHoldMs,time()+neutralDelayMs)};arm();
      }else display(reaction);
    },
    setActive(value){
      if(destroyed||active===!!value)return;
      if(active)elapsed=time();else activeAt=now();
      active=!!value;
      if(active)arm();else{clear();if(current)display(current,true);}
    },
    reset(reaction){if(destroyed)return;clear();pending=null;requested=reaction;display(reaction,true);},
    destroy(){destroyed=true;clear();pending=null;fade.destroy();},
  };
}

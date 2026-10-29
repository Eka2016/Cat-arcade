import {WORD_SHUFFLE_MS,WORD_DEAL_MS} from './words-lesson.js';

const REACTIONS={neutral:{frame:0,label:'Спокойно ждёт вашего ответа'},approve:{frame:1,label:'Сдержанно одобряет правильный ответ'},support:{frame:2,label:'Терпеливо помогает после ошибки'},focus:{frame:3,label:'Сосредоточенно готовит карточки'}};

function createSpriteFader(root,{columns,rows,count,duration=380}){
  const doc=root.ownerDocument,layers=[];let target=0,active=false,reduced=false,destroyed=false;
  for(let i=0;i<count;i++){
    const layer=doc.createElement('span'),image=doc.createElement('img');layer.className='words-tutor-layer';image.alt='';image.draggable=false;image.loading='lazy';image.decoding='async';image.style.width=`${columns*100}%`;image.style.height=`${rows*100}%`;image.style.left=`${-(i%columns)*100}%`;image.style.top=`${-Math.floor(i/columns)*100}%`;layer.style.opacity=i===0?'1':'0';layer.append(image);root.append(layer);layers.push({layer,image,animation:null});
  }
  function finish(){for(const [i,item] of layers.entries()){item.animation?.cancel();item.animation=null;item.layer.style.opacity=i===target?'1':'0';}}
  return {
    images:layers.map(item=>item.image),
    to(frame,{instant=false}={}){
      if(destroyed||target===frame&&!instant)return;target=frame;
      const weights=layers.map(item=>doc.defaultView?.getComputedStyle(item.layer).opacity||item.layer.style.opacity);
      for(const [i,item] of layers.entries()){
        item.animation?.cancel();item.animation=null;const opacity=i===target?'1':'0';item.layer.style.opacity=opacity;
        if(!active||reduced||instant||typeof item.layer.animate!=='function')continue;
        const animation=item.layer.animate([{opacity:weights[i]},{opacity}],{duration,easing:'cubic-bezier(.25,.1,.25,1)',fill:'both'});item.animation=animation;
        animation.addEventListener('finish',()=>{if(item.animation!==animation)return;item.animation=null;animation.cancel();},{once:true});
      }
    },
    setActive(value){if(destroyed||active===!!value)return;active=!!value;for(const item of layers)if(item.animation){if(active)item.animation.play();else item.animation.pause();}},
    setReducedMotion(value){if(destroyed)return;reduced=!!value;if(reduced)finish();},
    destroy(){destroyed=true;finish();},
  };
}

/** A complete portrait and finite card transforms; no independent body regions. */
export function createWordsScene(stage,{sceneUrl=new URL('./assets/words-penthouse-v2.webp',import.meta.url).href,characterUrl=new URL('./assets/words-tutor-reactions.webp',import.meta.url).href}={}){
  const abort=new AbortController(),signal=abort.signal,background=stage.querySelector('.words-scene-background'),tutor=stage.querySelector('.words-tutor'),caption=stage.querySelector('.words-scene-caption'),card=stage.querySelector('.word-card');
  const portrait=createSpriteFader(stage.querySelector('.words-tutor-portrait'),{columns:2,rows:2,count:4});
  const offer=stage.querySelector('.words-dealt-card'),preparation=[...stage.querySelectorAll('.words-prep-card')];
  let loaded=false,active=false,reduced=false,destroyed=false,cardAnimation=null,offerAnimation=null,currentPhase='ready',pendingPhase=null;
  const preparationAnimations=new Set();
  const resting=(i)=>`translate(${i*.45}px,${-i*.55}px) rotate(-8deg)`;
  preparation.forEach((item,i)=>{item.style.zIndex=String(i+1);item.style.transform=resting(i);});
  function load(){
    if(loaded||destroyed)return;loaded=true;
    for(const [images,url] of [[[background],sceneUrl],[portrait.images,characterUrl]])for(const image of images){image.addEventListener('error',()=>{image.hidden=true;},{once:true,signal});image.src=url;}
  }
  function stopMotion(){
    pendingPhase=null;offerAnimation?.cancel();offerAnimation=null;
    for(const animation of preparationAnimations)animation.cancel();preparationAnimations.clear();
  }
  function playPreparation(){
    for(const [i,item] of preparation.entries()){
      if(typeof item.animate!=='function')continue;
      const spread=i-2,animation=item.animate([
        {transform:resting(i)},
        {transform:`translate(${spread*12}px,${-8-Math.abs(spread)*2}px) rotate(${spread*10-8}deg)`,offset:.26},
        {transform:`translate(${-spread*9}px,${-16-Math.abs(spread)*3}px) rotate(${-spread*7-8}deg)`,offset:.6},
        {transform:resting(i)}
      ],{duration:WORD_SHUFFLE_MS,easing:'cubic-bezier(.45,0,.2,1)',fill:'both'});
      preparationAnimations.add(animation);animation.addEventListener('finish',()=>{if(!preparationAnimations.delete(animation))return;animation.cancel();},{once:true});
    }
  }
  function playOffer(){
    if(typeof offer.animate!=='function')return;
    const w=stage.clientWidth||300,h=stage.clientHeight||190,dx=w*.72-7-(w-28-19),dy=h*.5+11.5-(h-20-26),end=`translate(${dx}px,${dy}px) rotate(1deg) scale(1.4)`;
    offerAnimation=offer.animate([{opacity:.95,transform:'translate(0,0) rotateX(30deg) rotate(-8deg) scale(1)'},{opacity:1,transform:end,offset:.8},{opacity:0,transform:end}],{duration:WORD_DEAL_MS,easing:'cubic-bezier(.25,.1,.25,1)',fill:'both'});
  }
  function beginMotion(){
    if(reduced||destroyed||!active)return;
    pendingPhase=null;if(currentPhase==='shuffle')playPreparation();else if(currentPhase==='deal')playOffer();
  }
  // Assign sources now so the arcade can prepare hidden art without starting the lesson.
  if(background)background.loading='lazy';load();
  return {
    load,
    update({phase='ready',round=0,reaction='neutral',paused=false}={}){
      if(destroyed)return;const mood=REACTIONS[phase==='ready'?reaction:'focus']||REACTIONS.neutral;
      stage.dataset.lesson=phase;stage.dataset.lessonRound=String(round);stage.dataset.motion=active?'running':'paused';tutor.dataset.reaction=phase==='ready'?reaction:'focus';tutor.setAttribute('aria-label',mood.label);portrait.to(mood.frame);
      if(phase!==currentPhase){stopMotion();currentPhase=phase;if(phase!=='ready'&&!reduced){pendingPhase=phase;if(active)beginMotion();}}
      const label=phase==='ready'?'':paused?'Пауза':phase==='deal'?'Ваша карточка':'Готовим карточки…';if(caption.textContent!==label)caption.textContent=label;caption.hidden=!label;
    },
    enterCard(){
      cardAnimation?.cancel();cardAnimation=null;if(destroyed||reduced||!active||typeof card.animate!=='function')return;
      const animation=card.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'});cardAnimation=animation;
      animation.addEventListener('finish',()=>{if(cardAnimation!==animation)return;cardAnimation=null;animation.cancel();},{once:true});
    },
    setActive(value){
      if(destroyed||active===!!value)return;active=!!value;if(active)load();portrait.setActive(active);stage.dataset.motion=active?'running':'paused';
      if(active&&pendingPhase)beginMotion();
      for(const animation of [cardAnimation,offerAnimation,...preparationAnimations])if(animation){if(active)animation.play();else animation.pause();}
    },
    setReducedMotion(value){if(destroyed)return;reduced=!!value;portrait.setReducedMotion(reduced);if(reduced){cardAnimation?.cancel();cardAnimation=null;stopMotion();}},
    destroy(){if(destroyed)return;destroyed=true;abort.abort();cardAnimation?.cancel();cardAnimation=null;stopMotion();portrait.destroy();},
  };
}

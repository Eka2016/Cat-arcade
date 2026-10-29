/** Finite opacity animations, with stationary whole-portrait layers and no layout reads.
 * CSS transitions remain a fallback for browsers without Element.animate(). */
export function createPortraitFade(art,layers,{easing='cubic-bezier(.25,.1,.25,1)'}={}){
  const view=art.ownerDocument.defaultView,modern=layers.every(layer=>typeof layer.animate==='function');
  const motion=view?.matchMedia?.('(prefers-reduced-motion: reduce)'),animations=new Map();
  let target=0,destroyed=false;
  function finish(){
    for(const [layer,animation] of animations){animation.cancel();layer.style.willChange='';}animations.clear();
    if(modern)for(const [i,layer] of layers.entries())layer.style.opacity=i===target?'1':'0';
  }
  function changed(){if(motion.matches)finish();}
  motion?.addEventListener?.('change',changed);
  return {
    show(frame,{instant=false,duration=440}={}){
      if(destroyed)return;target=frame;
      const weights=layers.map(layer=>view.getComputedStyle(layer).opacity);
      for(const [layer,animation] of animations){animation.cancel();layer.style.willChange='';}animations.clear();
      if(!modern){
        layers.forEach((layer,i)=>{layer.style.transition='none';layer.style.opacity=instant?(i===frame?'1':'0'):weights[i];});
        void layers[0].offsetWidth;
        for(const [i,layer] of layers.entries()){layer.style.transition='';layer.style.opacity=i===frame?'1':'0';}
        return;
      }
      for(const [i,layer] of layers.entries()){
        const opacity=i===frame?'1':'0';layer.style.transitionProperty='none';layer.style.opacity=opacity;
        if(instant||motion?.matches||Math.abs(Number(weights[i])-Number(opacity))<.0001)continue;
        layer.style.willChange='opacity';
        const animation=layer.animate([{opacity:weights[i]},{opacity}],{duration,easing,fill:'both'});animations.set(layer,animation);
        animation.addEventListener('finish',()=>{
          if(animations.get(layer)!==animation)return;
          animations.delete(layer);animation.cancel();layer.style.willChange='';
        },{once:true});
      }
    },
    finish,
    destroy(){if(destroyed)return;finish();destroyed=true;motion?.removeEventListener?.('change',changed);},
  };
}

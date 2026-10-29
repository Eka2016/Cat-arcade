/** Observe native completion signals only; never intercept requests or change the chat. */
export function createGenerationNotice({getContext=()=>globalThis.SillyTavern?.getContext?.(),onComplete=()=>{},onClear=()=>{},document:doc=globalThis.document}={}) {
  const context=()=>{try{return getContext()||null;}catch{return null;}};
  const initial=context(),events=initial?.eventTypes||initial?.event_types,source=initial?.eventSource;
  const subscriptions=[];
  let destroyed=false,timer=null,pendingQuiet=false,nativeType=null,groupDepth=0,groupEnded=false,imagePending=false;
  let imageObserver=null,chatElement=null;

  function cancelPending() {
    if(timer!==null)clearTimeout(timer);
    timer=null;pendingQuiet=false;
  }
  function complete(quiet=false) {
    if(destroyed)return;
    // Coalesce native signals from the same completion, after the core updates its UI.
    pendingQuiet=timer===null?quiet:pendingQuiet&&quiet;
    if(timer!==null)return;
    timer=setTimeout(()=>{
      timer=null;pendingQuiet=false;
      if(!destroyed)try{onComplete();}catch{/* A notice cannot affect native generation. */}
    },0);
  }
  function bind(name,callback) {
    const type=events?.[name];
    if(!type||typeof source?.on!=='function')return;
    const listener=(...args)=>{if(!destroyed)try{callback(...args);}catch{/* Optional host signals must not interrupt the host. */}};
    source.on(type,listener);subscriptions.push([type,listener]);
  }
  function observeImageButtons() {
    const next=doc?.querySelector?.('#chat');
    if(next===chatElement)return;
    imageObserver?.disconnect();imageObserver=null;chatElement=next;
    const Observer=doc?.defaultView?.MutationObserver;
    if(!next||typeof Observer!=='function')return;
    // The native image button has no completion event when replacing an existing image.
    // Watch only its busy -> idle class transition, without reading message text or history.
    imageObserver=new Observer(records=>{
      if(destroyed)return;
      for(const record of records){
        const target=record.target;
        if(target.matches?.('.sd_message_gen')&&record.oldValue?.split(/\s+/).includes('fa-hourglass')&&!target.classList.contains('fa-hourglass')){
          imagePending=false;complete();break;
        }
      }
    });
    imageObserver.observe(next,{subtree:true,attributes:true,attributeFilter:['class'],attributeOldValue:true});
  }

  bind('GENERATION_STARTED',(type,_options,dryRun)=>{if(!dryRun)nativeType=type;});
  bind('GENERATION_ENDED',()=>{
    const quiet=nativeType==='quiet';nativeType=null;
    if(groupDepth){groupEnded=true;return;}
    complete(quiet);
  });
  bind('GENERATION_STOPPED',()=>{nativeType=null;complete();});
  bind('GROUP_WRAPPER_STARTED',()=>{groupDepth++;});
  bind('GROUP_WRAPPER_FINISHED',()=>{
    groupDepth=Math.max(0,groupDepth-1);
    if(!groupDepth&&groupEnded){groupEnded=false;complete();}
  });
  bind('SD_PROMPT_PROCESSING',()=>{
    imagePending=true;
    // A quiet text request can be just the prompt for a picture that is still rendering.
    if(pendingQuiet)cancelPending();
  });
  bind('MESSAGE_RECEIVED',(id,type)=>{
    if(type==='first_message'||!Number.isInteger(id)||id<0)return;
    const extra=context()?.chat?.[id]?.extra;
    const generated=extra?.media?.some(item=>item?.source==='generated'&&typeof item.url==='string'&&item.url.length)
      ||(typeof extra?.image==='string'&&extra.image.length&&Number.isInteger(extra.generationType));
    if(generated){imagePending=false;complete();}
  });
  bind('FORCE_SET_BACKGROUND',()=>{if(imagePending){imagePending=false;complete();}});
  bind('TTS_JOB_COMPLETE',()=>complete());
  bind('APP_READY',observeImageButtons);
  bind('CHAT_CHANGED',()=>{
    cancelPending();nativeType=null;groupDepth=0;groupEnded=false;imagePending=false;
    onClear();observeImageButtons();
  });
  observeImageButtons();

  return {
    destroy() {
      if(destroyed)return;
      destroyed=true;cancelPending();imageObserver?.disconnect();imageObserver=null;chatElement=null;
      for(const [type,listener] of subscriptions){
        if(typeof source.removeListener==='function')source.removeListener(type,listener);
        else source.off?.(type,listener);
      }
      subscriptions.length=0;
    },
  };
}

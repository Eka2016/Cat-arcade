const MESSAGES={unsupported:'Этот браузер не поддерживает озвучку.',voice:'На устройстве нет доступного локального английского голоса. Добавь английский голос в настройках устройства и попробуй снова.',busy:'Дождись завершения другой озвучки.',failed:'Не удалось произнести слово. Попробуй нажать значок ещё раз.'};
export const wordSpeechError=code=>MESSAGES[code]||MESSAGES.failed;

/** Explicit tap only; select an installed English voice, never a remote/default fallback. */
export function createWordSpeech({window:host=globalThis.window,onChange=()=>{},onError=()=>{}}={}){
  let synth,Utterance;try{synth=host?.speechSynthesis;Utterance=host?.SpeechSynthesisUtterance;}catch{/* Unsupported host. */}
  const supported=!!synth&&typeof synth.getVoices==='function'&&typeof synth.speak==='function'&&typeof synth.cancel==='function'&&typeof Utterance==='function';
  let current=null,started=false,destroyed=false;
  const notify=()=>{if(!destroyed)onChange();};
  function voice(){
    if(!supported)return null;let voices;try{voices=[...synth.getVoices()].filter(v=>v.localService===true&&/^en(?:[-_]|$)/i.test(v.lang));}catch{return null;}
    return voices.find(v=>v.default)||voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices[0]||null;
  }
  function stop({notify:emit=true}={}){
    const owned=current,wasStarted=started;current=null;started=false;
    if(owned){owned.onstart=null;owned.onend=null;owned.onerror=null;
      // cancel() is global. Do not clear another component's queued speech.
      try{if(!wasStarted||!synth.pending)synth.cancel();}catch{/* Device speech already ended. */}
    }
    if(emit)notify();
  }
  function voicesChanged(){notify();}
  if(supported)synth.addEventListener?.('voiceschanged',voicesChanged);
  return {
    get supported(){return supported;},get speaking(){return !!current;},
    speak(text){
      if(destroyed)return false;
      if(!supported){onError('unsupported');return false;}
      if(current){stop();return false;}
      if(synth.speaking||synth.pending||synth.paused){onError('busy');return false;}
      const selected=voice();if(!selected){onError('voice');return false;}
      if(typeof text!=='string'||!text.trim())return false;
      try{
        const utterance=new Utterance(text);utterance.voice=selected;utterance.lang=selected.lang;utterance.rate=.9;utterance.pitch=1;utterance.volume=1;current=utterance;started=false;
        utterance.onstart=()=>{if(current===utterance){started=true;notify();}};
        utterance.onend=()=>{if(current===utterance){current=null;started=false;notify();}};
        utterance.onerror=event=>{if(current!==utterance||destroyed)return;current=null;started=false;notify();if(!['canceled','interrupted'].includes(event.error))onError('failed');};
        synth.speak(utterance);notify();return true;
      }catch{stop({notify:false});onError('failed');return false;}
    },
    stop,
    destroy(){if(destroyed)return;destroyed=true;stop({notify:false});if(supported)synth.removeEventListener?.('voiceschanged',voicesChanged);},
  };
}

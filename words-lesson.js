import {createGameClock} from './game-clock.js';

export const WORD_SHUFFLE_MS=900;
export const WORD_DEAL_MS=320;
/** Two finite active-time phases; the illustration never has moving body parts. */
export function createWordLesson({onChange=()=>{},clockFactory=createGameClock,reducedMotion=false}={}){
  let phase='ready',active=false,destroyed=false,reduced=!!reducedMotion,round=0;
  const snapshot=()=>({phase,round,active});
  const notify=()=>{if(!destroyed)onChange(snapshot());};
  const preparation=clockFactory(()=>{
    if(destroyed||!active||phase!=='shuffle')return;
    phase='deal';dealing.queue();notify();
  },WORD_SHUFFLE_MS);
  const dealing=clockFactory(()=>{
    if(destroyed||!active||phase!=='deal')return;
    phase='ready';notify();
  },WORD_DEAL_MS);
  const cancel=()=>{preparation.cancel();dealing.cancel();};
  return {
    get state(){return snapshot();},
    get ready(){return phase==='ready';},
    start(){if(destroyed)return;cancel();round++;phase=reduced?'ready':'shuffle';if(phase!=='ready')preparation.queue();notify();},
    setActive(value){if(destroyed||active===!!value)return;active=!!value;preparation.setActive(active);dealing.setActive(active);},
    setReducedMotion(value){if(destroyed||reduced===!!value)return;reduced=!!value;if(reduced&&phase!=='ready'){cancel();phase='ready';notify();}},
    destroy(){if(destroyed)return;destroyed=true;preparation.destroy();dealing.destroy();},
  };
}

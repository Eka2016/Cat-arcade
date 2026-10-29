import {chooseCheckersMove} from './checkers.js';
import {sanitizeBoardDifficulty} from './board-difficulty.js';

/** The bounded draughts search runs in a local worker rather than during a portrait fade. */
export function createCheckersOpponent({workerUrl=new URL('./checkers-worker.js',import.meta.url),Worker:WorkerClass=globalThis.Worker,fallback=chooseCheckersMove}={}){
  let worker=null,disabled=typeof WorkerClass!=='function',pending=null,serial=0,destroyed=false;
  function terminate(){worker?.terminate();worker=null;}
  function release(){if(!pending)return null;const job=pending;pending=null;clearTimeout(job.timer);return job;}
  function failWorker(){
    disabled=true;terminate();if(!pending)return;
    clearTimeout(pending.timer);pending.timer=setTimeout(()=>{
      const job=release();if(!job)return;
      try{job.resolve(fallback(job.game,Math.random,job.difficulty));}catch(error){job.reject(error);}
    },0);
  }
  function ensureWorker(){
    if(worker||disabled)return;
    try{
      worker=new WorkerClass(workerUrl,{type:'module',name:'paw-arcade-checkers'});
      worker.onmessage=({data})=>{
        if(!pending||data?.id!==pending.id)return;
        if(data.error){failWorker();return;}
        const reply=data.move;
        const move=reply&&Array.isArray(reply.path)&&pending.legal.find(candidate=>candidate.from===reply.from&&candidate.path.length===reply.path.length&&candidate.path.every((square,i)=>square===reply.path[i]));
        if(reply!==null&&!move||reply===null&&pending.legal.length&&!pending.game.status()){failWorker();return;}
        release()?.resolve(move||null);
      };
      const instance=worker;
      worker.onerror=event=>{event.preventDefault?.();if(worker===instance)failWorker();};worker.onmessageerror=()=>{if(worker===instance)failWorker();};
    }catch{disabled=true;terminate();}
  }
  return {
    choose(game,difficulty){
      if(destroyed)throw new Error('Checkers opponent is closed');
      this.cancel();ensureWorker();const id=++serial;
      return new Promise((resolve,reject)=>{
        pending={id,game,difficulty:sanitizeBoardDifficulty(difficulty),legal:game.moves(),resolve,reject,timer:null};
        if(!worker){failWorker();return;}
        pending.timer=setTimeout(()=>{if(pending?.id===id)failWorker();},8000);
        try{worker.postMessage({id,board:[...game.board],turn:game.turn,quietKings:game.quietKings,history:[...game.history],mandatoryCapture:game.mandatoryCapture,difficulty:pending.difficulty});}catch{failWorker();}
      });
    },
    cancel(){const job=release();if(!job)return;terminate();const error=new Error('Checkers search cancelled');error.name='AbortError';job.reject(error);},
    destroy(){this.cancel();destroyed=true;terminate();},
  };
}

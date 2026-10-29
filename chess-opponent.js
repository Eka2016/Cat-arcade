import {chooseChessMove} from './chess-game.js';
import {sanitizeBoardDifficulty} from './board-difficulty.js';

/** Keep the bounded chess search off the UI thread when local module workers are available. */
export function createChessOpponent({workerUrl=new URL('./chess-worker.js',import.meta.url),Worker:WorkerClass=globalThis.Worker,fallback=chooseChessMove}={}){
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
      worker=new WorkerClass(workerUrl,{type:'module',name:'paw-arcade-chess'});
      worker.onmessage=({data})=>{
        if(!pending||data?.id!==pending.id)return;
        if(data.error){failWorker();return;}
        const move=data.move;
        if(move!==null&&(!move||!Number.isInteger(move.from)||move.from<0||move.from>63||!Number.isInteger(move.to)||move.to<0||move.to>63||move.promotion!==undefined&&!['q','r','b','n'].includes(move.promotion))){failWorker();return;}
        release()?.resolve(move);
      };
      const instance=worker;
      worker.onerror=event=>{event.preventDefault?.();if(worker===instance)failWorker();};worker.onmessageerror=()=>{if(worker===instance)failWorker();};
    }catch{disabled=true;terminate();}
  }
  return {
    choose(game,difficulty){
      if(destroyed)throw new Error('Chess opponent is closed');
      this.cancel();ensureWorker();const id=++serial;
      return new Promise((resolve,reject)=>{
        pending={id,game,difficulty:sanitizeBoardDifficulty(difficulty),resolve,reject,timer:null};
        if(!worker){failWorker();return;}
        pending.timer=setTimeout(()=>{if(pending?.id===id)failWorker();},8000);
        try{worker.postMessage({id,fen:game.engine.fen(),counts:[...game.engine._positionCount],difficulty:pending.difficulty});}catch{failWorker();}
      });
    },
    cancel(){const job=release();if(!job)return;terminate();const error=new Error('Chess search cancelled');error.name='AbortError';job.reject(error);},
    destroy(){this.cancel();destroyed=true;terminate();},
  };
}

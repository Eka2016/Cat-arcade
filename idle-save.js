/** Coalesce host-settings saves until native generation has released the chat. */
export function createIdleSave({isBusy,setTimer=setTimeout,clearTimer=clearTimeout,onError=()=>{}}={}){
  let pending=null,timer=null,destroyed=false;
  function clear(){if(timer!==null)clearTimer(timer);timer=null;}
  function tick(){
    timer=null;if(destroyed||!pending)return;
    try{
      if(isBusy()){timer=setTimer(tick,250);return;}
      const task=pending;pending=null;task();
    }catch{try{onError();}catch{/* Storage diagnostics must not interrupt native generation. */}}
  }
  return {
    request(task){
      if(destroyed)return;
      if(isBusy()){pending=task;return;}
      clear();pending=null;task();
    },
    wake(){if(!destroyed&&pending&&timer===null)timer=setTimer(tick,0);},
    destroy(){destroyed=true;clear();pending=null;},
  };
}

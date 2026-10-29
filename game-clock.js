/** A pending bot move keeps its remaining delay when any game is paused or hidden. */
export function createGameClock(run,delay=550) {
  let active=false,pending=false,destroyed=false,timer=null,remaining=delay,due=0;
  const clear=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
  function start(){
    if(!active||!pending||destroyed||timer!==null)return;
    due=performance.now()+remaining;
    timer=setTimeout(()=>{timer=null;if(!active||destroyed)return;pending=false;remaining=delay;run();},remaining);
  }
  return {
    queue(){if(destroyed||pending)return;pending=true;remaining=delay;start();},
    setActive(value){if(destroyed)return;if(!value&&timer!==null)remaining=Math.max(0,due-performance.now());clear();active=!!value;start();},
    cancel(){clear();pending=false;remaining=delay;},
    destroy(){clear();destroyed=true;pending=false;},
  };
}

/** Move only this extension's saved DND rounds and game reports on a native
 * chat rename. Inputs stay intact until the caller commits the new snapshot. */
export function renameChatHistory(state,change){
  if(change?.type!=='chat-renamed')return null;
  const {fromKey:from,toKey:to}=change;
  if(typeof from!=='string'||typeof to!=='string'||!from||!to||from===to||from.length>2048||to.length>2048)return null;
  let changed=false;
  function move(source,merge=false){
    if(!source||!Object.hasOwn(source,from))return source;
    const next={...source};next[to]=merge?{...source[to],...source[from]}:source[from];delete next[from];changed=true;return next;
  }
  const dndRounds=move(state.dndRounds),gameReports=move(state.gameReports,true);
  return changed?{dndRounds,gameReports}:null;
}

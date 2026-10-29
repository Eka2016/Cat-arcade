/** Prepare local art one file at a time while games are closed or in the menu.
 * Chosen-game images bypass the queue. Other scenes do not decode during play. */
export function createGameArtLoader(views,{signal}={}){
  const doc=views[0]?.ownerDocument,win=doc?.defaultView,groups=new Map();
  let idle=null,timer=null,started=false,backgroundJobs=0,destroyed=false,busy=false;
  const allowed=area=>area.dataset.characters!=='false';
  function collect(area){
    if(!allowed(area))return [];
    const result=new Set();
    for(const image of area.querySelectorAll('img[src]')){
      const url=image.src;if(!url)continue;
      let group=groups.get(url);if(!group){group={images:new Set(),areas:new Set(),state:'queued',background:false};groups.set(url,group);}
      group.images.add(image);group.areas.add(area);result.add(group);
    }
    return [...result];
  }
  function begin(group,priority){
    group.priority=priority;
    for(const image of group.images){image.fetchPriority=priority;image.loading='eager';}
    if(!['queued','loaded'].includes(group.state))return;
    group.state='loading';group.background=priority==='low';if(group.background)backgroundJobs++;
    const image=group.images.values().next().value;
    function done(state='ready'){
      if(destroyed||group.state!=='loading')return;
      image.removeEventListener('load',settle);image.removeEventListener('error',settle);
      group.state=state;if(group.background)backgroundJobs--;pump();
    }
    function settle(){
      if(destroyed||group.state!=='loading')return;
      if(group.priority==='low'&&busy){done('loaded');return;}
      // Decode one shared source; copies of a sprite use the browser's same image cache.
      if(image.naturalWidth&&typeof image.decode==='function')void image.decode().catch(()=>{}).then(done);else done();
    }
    image.addEventListener('load',settle,{once:true,signal});image.addEventListener('error',settle,{once:true,signal});
    if(image.complete)settle();
  }
  function pump(){
    if(destroyed||busy||!started||doc?.hidden||win?.navigator?.connection?.saveData)return;
    for(const group of groups.values()){
      if(backgroundJobs>=1)break;
      if(['queued','loaded'].includes(group.state)&&[...group.areas].some(allowed))begin(group,'low');
    }
  }
  function start(){
    idle=null;timer=null;if(destroyed)return;started=true;
    for(const area of views)collect(area);pump();
  }
  function schedule(){
    if(destroyed||started||idle!==null||timer!==null)return;
    if(typeof win?.requestIdleCallback==='function')idle=win.requestIdleCallback(start,{timeout:1200});
    else timer=win?.setTimeout(start,300);
  }
  function warm(area){if(destroyed||!area)return;for(const group of collect(area))begin(group,'high');}
  function refresh(){if(destroyed||!started)return;for(const area of views)collect(area);pump();}
  function destroy(){
    destroyed=true;if(idle!==null)win?.cancelIdleCallback?.(idle);if(timer!==null)win?.clearTimeout(timer);groups.clear();
  }
  signal?.addEventListener('abort',destroy,{once:true});doc?.addEventListener('visibilitychange',pump,{signal});
  return {schedule,warm,refresh,setBusy(value){busy=!!value;if(!busy)pump();}};
}

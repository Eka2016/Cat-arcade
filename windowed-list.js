// Keep variable-height card lists small in the DOM. Text and saved data stay
// intact; only the visible rows and a short margin are mounted.
class RowHeights {
  constructor(length,estimate){
    this.length=length;this.values=new Float64Array(length).fill(estimate);this.tree=new Float64Array(length+1);
    for(let i=1;i<=length;i++){this.tree[i]+=estimate;const next=i+((i&-i)>>>0);if(next<=length)this.tree[next]+=this.tree[i];}
  }
  prefix(end){let value=0;for(let i=end;i>0;i-=((i&-i)>>>0))value+=this.tree[i];return value;}
  set(index,height){const delta=height-this.values[index];if(Math.abs(delta)<.5)return false;this.values[index]=height;for(let i=index+1;i<=this.length;i+=((i&-i)>>>0))this.tree[i]+=delta;return true;}
  at(offset){
    let low=0,high=this.length;
    while(low<high){const mid=Math.floor((low+high)/2);if(this.prefix(mid+1)<=offset)low=mid+1;else high=mid;}
    return Math.min(Math.max(0,this.length-1),low);
  }
}

export function createWindowedList(scroller,list,{renderItem,keyFor=(_,index)=>index,estimateHeight=88,overscan=6}={}){
  const win=scroller.ownerDocument.defaultView,abort=new AbortController(),signal=abort.signal;
  const request=callback=>win.requestAnimationFrame?win.requestAnimationFrame(callback):win.setTimeout(callback,0),cancel=id=>win.cancelAnimationFrame?win.cancelAnimationFrame(id):win.clearTimeout(id);
  let items=[],heights=new RowHeights(0,estimateHeight),rows=new Map(),start=-1,end=-1,width=0,frame=null,pending=null,lastAnchor=null,destroyed=false;
  const spacerTag=['UL','OL'].includes(list.tagName)?'li':'div';
  function spacer(){const node=list.ownerDocument.createElement(spacerTag);node.className='truth-virtual-spacer';node.setAttribute('aria-hidden','true');node.setAttribute('role','presentation');return node;}
  const top=spacer(),bottom=spacer();
  function hidden(){
    if(!scroller.isConnected||scroller.closest('[hidden]'))return true;
    const host=scroller.getRootNode().host;return !!host&&(host.hidden||host.style.display==='none');
  }
  function listOffset(){return list.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop;}
  const isAtBottom=()=>scroller.clientHeight>0&&scroller.scrollHeight>scroller.clientHeight+1&&scroller.scrollTop>=scroller.scrollHeight-scroller.clientHeight-2;
  function snapshot(){
    if(pending)return {...pending};if(!items.length)return null;
    if(hidden())return lastAnchor?{...lastAnchor}:null;
    const y=Math.max(0,scroller.scrollTop-listOffset()),index=heights.at(y);
    lastAnchor={key:keyFor(items[index],index),index,offset:Math.max(0,y-heights.prefix(index)),bottom:isAtBottom()};return {...lastAnchor};
  }
  function schedule(){if(destroyed||frame!==null)return;frame=request(()=>{frame=null;render();});}
  function updateSpacers(){
    top.style.height=`${heights.prefix(start)}px`;bottom.style.height=`${Math.max(0,heights.prefix(items.length)-heights.prefix(end))}px`;
  }
  function render(){
    if(destroyed)return;
    if(!items.length){rows.clear();list.replaceChildren();start=end=0;pending=null;lastAnchor=null;list.dataset.total='0';return;}
    // Hidden panes report zero geometry. Keep the last visible anchor and any
    // pending restore until their owner shows the pane again.
    if(hidden())return;
    const nextWidth=scroller.clientWidth;
    if(width&&nextWidth&&width!==nextWidth){pending=snapshot();heights=new RowHeights(items.length,estimateHeight);start=end=-1;}
    if(nextWidth)width=nextWidth;
    const bottomPinned=pending?!!pending.bottom:isAtBottom();
    let y=Math.max(0,scroller.scrollTop-listOffset()),anchorIndex,anchorOffset;
    if(pending){const match=items.findIndex((item,index)=>keyFor(item,index)===pending.key);anchorIndex=match>=0?match:Math.min(items.length-1,Math.max(0,pending.index||0));anchorOffset=match>=0?pending.offset||0:0;y=heights.prefix(anchorIndex)+anchorOffset;}
    else{anchorIndex=heights.at(y);anchorOffset=Math.max(0,y-heights.prefix(anchorIndex));}
    if(bottomPinned){y=Math.max(0,heights.prefix(items.length)-(scroller.clientHeight||360));anchorIndex=heights.at(y);anchorOffset=Math.max(0,y-heights.prefix(anchorIndex));}
    const nextStart=Math.max(0,heights.at(y)-overscan),nextEnd=Math.min(items.length,heights.at(y+(scroller.clientHeight||360))+overscan+1);
    if(nextStart!==start||nextEnd!==end){
      const focusRoot=list.getRootNode(),active=focusRoot.activeElement||list.ownerDocument.activeElement,nodes=[];start=nextStart;end=nextEnd;
      for(const index of rows.keys())if(index<start||index>=end)rows.delete(index);
      for(let index=start;index<end;index++){
        let row=rows.get(index);if(!row){row=renderItem(items[index],index);row.dataset.windowIndex=String(index);row.setAttribute('aria-posinset',String(index+1));row.setAttribute('aria-setsize',String(items.length));if(list.tagName==='OL')row.value=index+1;rows.set(index,row);}nodes.push(row);
      }
      list.replaceChildren(top,...nodes,bottom);if(active&&list.contains(active)&&(focusRoot.activeElement||list.ownerDocument.activeElement)!==active)active.focus({preventScroll:true});
    }
    updateSpacers();if(pending)scroller.scrollTop=listOffset()+y;pending=null;
    let changed=false;
    for(const [index,row] of rows){const height=row.getBoundingClientRect().height;if(height>.5)changed=heights.set(index,height)||changed;}
    if(changed){updateSpacers();scroller.scrollTop=bottomPinned?scroller.scrollHeight-scroller.clientHeight:listOffset()+heights.prefix(anchorIndex)+anchorOffset;schedule();}
    list.dataset.total=String(items.length);list.dataset.start=String(start);list.dataset.end=String(end);
    snapshot();
  }
  scroller.tabIndex=0;
  scroller.addEventListener('scroll',schedule,{passive:true,signal});
  scroller.addEventListener('keydown',event=>{
    if(!['Home','End','PageUp','PageDown'].includes(event.key)||event.altKey||event.metaKey)return;
    event.preventDefault();scroller.focus({preventScroll:true});
    scroller.scrollTop=event.key==='Home'?0:event.key==='End'?scroller.scrollHeight:scroller.scrollTop+(event.key==='PageUp'?-1:1)*scroller.clientHeight;
    render();
  },{signal});
  const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(schedule):null;observer?.observe(scroller);
  return {
    setItems(next,{anchor=snapshot()}={}){items=next;heights=new RowHeights(items.length,estimateHeight);rows.clear();start=end=-1;pending=anchor;render();},
    snapshot,refresh({anchor}={}){if(anchor)pending={...anchor};render();},
    destroy(){destroyed=true;if(frame!==null)cancel(frame);observer?.disconnect();abort.abort();rows.clear();list.replaceChildren();}
  };
}

// Nested collection controls can reveal the stump under a finishing touch.
// Share compatibility-click suppression so that release never activates it too.
const touchClicks=new WeakMap();
/** Shared taps and long-hold selection for DND lists; movement remains native scrolling. */
export function createDndGestures(container,{activate,canSelect=()=>false,toggleSelection=()=>{},isActive=()=>true,ignore=()=>false,signal}={}){
  const doc=container.ownerDocument,win=doc.defaultView;let press=null,timer=null;
  function cancel(){if(timer!==null)win.clearTimeout(timer);timer=null;press=null;}
  container.addEventListener('pointerdown',event=>{
    if(ignore(event.target)||event.isPrimary===false||event.button>0)return;cancel();touchClicks.delete(doc);if(!isActive())return;
    const button=event.target.closest('button');if(!button||button.disabled)return;
    press={id:event.pointerId,button,x:event.clientX,y:event.clientY,touch:['touch','pen'].includes(event.pointerType),fired:false,moved:false};
    if(canSelect(button))timer=win.setTimeout(()=>{timer=null;if(press&&!press.moved&&isActive()){press.fired=true;toggleSelection(button);}},550);
  },{signal});
  win.addEventListener('pointermove',event=>{if(press?.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>8){press.moved=true;if(timer!==null)win.clearTimeout(timer);timer=null;}},{capture:true,signal});
  win.addEventListener('pointercancel',event=>{if(press?.id===event.pointerId)cancel();},{capture:true,signal});
  win.addEventListener('pointerup',event=>{
    if(press?.id!==event.pointerId)return;const current=press;cancel();if(current.moved)return;
    if(current.fired){touchClicks.set(doc,performance.now());return;}
    if(current.touch&&current.button.isConnected&&!current.button.disabled&&isActive()){touchClicks.set(doc,performance.now());activate(current.button);}
  },{capture:true,signal});
  container.addEventListener('click',event=>{
    if(ignore(event.target))return;
    const last=touchClicks.get(doc);if(last!==undefined&&performance.now()-last<800&&(event.isTrusted||event.detail>0)){touchClicks.delete(doc);event.preventDefault();event.stopImmediatePropagation();return;}
    if(isActive())activate(event.target);
  },{signal});
  container.addEventListener('keydown',event=>{if(ignore(event.target))return;touchClicks.delete(doc);const button=event.target.closest('button');if(event.shiftKey&&['Enter',' '].includes(event.key)&&button&&canSelect(button)&&isActive()){event.preventDefault();event.stopPropagation();toggleSelection(button);}},{signal});
  container.addEventListener('contextmenu',event=>{if(ignore(event.target))return;if(canSelect(event.target.closest('button')))event.preventDefault();},{signal});
  signal?.addEventListener('abort',cancel,{once:true});return {cancel};
}

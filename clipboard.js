/** Write only explicitly selected game text. Never read the clipboard or chat composer. */
export async function copyArcadeText(text,{document:doc=globalThis.document,navigator:nav=globalThis.navigator,container}={}){
  if(typeof text!=='string'||!text)throw new Error('Nothing to copy');
  try{if(typeof nav?.clipboard?.writeText==='function'){await nav.clipboard.writeText(text);return;}}catch{/* Local HTTP and older Safari can require the selection fallback. */}
  if(!doc?.createElement||!doc.execCommand)throw new Error('Clipboard unavailable');
  const parent=container||doc.body,active=container?.getRootNode?.().activeElement||doc.activeElement;
  const selection=doc.getSelection?.(),ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
  const area=doc.createElement('textarea');area.value=text;area.readOnly=true;area.tabIndex=-1;area.setAttribute('aria-hidden','true');
  area.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;font-size:16px;user-select:text;-webkit-user-select:text;';
  try{parent.append(area);area.focus({preventScroll:true});area.select();area.setSelectionRange(0,text.length);if(doc.execCommand('copy')!==true)throw new Error('Clipboard unavailable');}
  finally{area.remove();if(selection){selection.removeAllRanges();for(const range of ranges)selection.addRange(range);}if(active?.isConnected)active.focus?.({preventScroll:true});}
}

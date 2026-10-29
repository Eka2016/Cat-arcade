// The original ImageGen atlas stays intact. Viewports isolate its painted digits;
// measured ink bounds keep every result centered independently of font metrics.
export const DND_NUMERAL_ATLAS={width:1983,height:793,glyphs:[
  [84,48,244,317],[500,46,195,314],[859,48,255,316],[1260,47,247,318],[1637,48,258,312],
  [74,431,243,314],[474,435,246,310],[863,436,250,309],[1247,434,258,311],[1660,435,238,306],
]};
export const DND_SYMBOL_ATLAS={width:1983,height:793,glyphs:{'?':[167,104,366,575],'…':[771,376,503,130],'·':[1595,376,132,130]}};
export const DND_WOOD_NUMERAL_ATLAS={width:1983,height:793,glyphs:[
  [82,46,251,319],[500,45,194,316],[858,47,259,317],[1260,44,249,323],[1640,44,269,317],
  [71,422,246,324],[474,429,249,317],[861,427,256,317],[1248,427,264,319],[1665,429,243,313],
]};
export const DND_WOOD_SYMBOL_ATLAS={width:1983,height:793,glyphs:{'?':[169,103,364,575],'…':[772,375,503,131],'·':[1595,375,133,130]}};
export const DND_DIE_STYLES=Object.freeze({forest:'Лесной',wood:'Деревянный'});
export const sanitizeDndDieStyle=value=>value==='wood'?'wood':'forest';
export function dndNumeralLayout(value,{numerals=DND_NUMERAL_ATLAS,symbols=DND_SYMBOL_ATLAS,center={x:80,y:77.5}}={}){
  const key=String(value),symbol=Object.hasOwn(symbols.glyphs,key);if(!symbol&&!/^(?:[1-9]|1\d|20)$/.test(key))return null;
  const atlas=symbol?'symbols':'numerals',height=symbol&&key!=='?'?4.5:22,gap=1.3,padding=2;
  const digits=(symbol?[key]:key.split('')).map(digit=>{const [x,y,w,h]=symbol?symbols.glyphs[digit]:numerals.glyphs[Number(digit)],scale=height/h;return{digit,ink:{x,y,w,h},scale,width:w*scale};});
  const width=digits.reduce((n,d)=>n+d.width,0)+gap*(digits.length-1);let left=center.x-width/2;
  return digits.map(d=>{const {x,y,w,h}=d.ink;const next={digit:d.digit,atlas,x:left-padding*d.scale,y:center.y-height/2-padding*d.scale,width:(w+padding*2)*d.scale,height:(h+padding*2)*d.scale,viewBox:[x-padding,y-padding,w+padding*2,h+padding*2],ink:{x:left,y:center.y-height/2,width:d.width,height}};left+=d.width+gap;return next;});
}
export function createDndNumerals(svg,appearance={}){
  const text=svg.querySelector('.dnd-face-number'),group=svg.querySelector('.dnd-number-glyphs'),slots=[...group.children],ready=new Set();
  let value='?',sources,layoutOptions,revision=0,destroyed=false,abort;
  function paint(){
    if(destroyed)return;
    text.textContent=String(value);const computed=dndNumeralLayout(value,layoutOptions),layout=computed&&ready.has(computed[0].atlas)?computed:null;text.toggleAttribute('hidden',!!layout);group.toggleAttribute('hidden',!layout);group.dataset.value=layout?String(value):'';
    slots.forEach((slot,i)=>{const d=layout?.[i];slot.toggleAttribute('hidden',!d);if(!d)return;for(const field of ['x','y','width','height'])slot.setAttribute(field,String(d[field]));slot.setAttribute('viewBox',d.viewBox.join(' '));const art=slot.querySelector('image'),source=sources[d.atlas];if(art.getAttribute('href')!==source.url){art.setAttribute('href',source.url);art.setAttribute('width',source.width);art.setAttribute('height',source.height);}});
  }
  function setAppearance({url=new URL('./assets/dnd-gold-numerals-v1.png',import.meta.url).href,symbolsUrl=new URL('./assets/dnd-gold-symbols-v1.png',import.meta.url).href,atlas=DND_NUMERAL_ATLAS,symbolsAtlas=DND_SYMBOL_ATLAS,center={x:80,y:77.5}}={}){
    if(destroyed)return;
    abort?.abort();abort=new AbortController();const current=++revision;
    ready.clear();sources={numerals:{url,...atlas},symbols:{url:symbolsUrl,...symbolsAtlas}};layoutOptions={numerals:atlas,symbols:symbolsAtlas,center};paint();
    for(const [id,source] of Object.entries(sources)){
      const image=new svg.ownerDocument.defaultView.Image(),loaded=()=>{if(destroyed||current!==revision)return;if(image.naturalWidth===source.width&&image.naturalHeight===source.height)ready.add(id);paint();};
      image.addEventListener('load',loaded,{signal:abort.signal});image.addEventListener('error',()=>{if(destroyed||current!==revision)return;ready.delete(id);paint();},{signal:abort.signal});image.src=source.url;if(image.complete&&image.naturalWidth>0)loaded();
    }
  }
  setAppearance(appearance);
  return{setValue(next){if(destroyed||String(next)===String(value))return;value=next;paint();},setAppearance,destroy(){destroyed=true;revision++;abort.abort();}};
}

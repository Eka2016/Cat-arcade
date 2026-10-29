import {DndError,dndPlainText,dndRollId,dndSavedEvent,dndSceneStamp,dndLibraryReceipt} from './dnd.js';
const fail=code=>{throw new DndError(code);},validId=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
export const dndLibrarySearchKey=text=>String(text).normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
export function dndLibraryFields(raw){const {roll,title,event}=dndSavedEvent(raw);return{roll,title,event};}
export const dndLibraryKey=event=>JSON.stringify([event.roll,dndLibrarySearchKey(event.title),dndLibrarySearchKey(event.event)]);
const stamp=event=>dndSceneStamp(JSON.stringify([event.roll,event.title,event.event]));
function freshId(ids,crypto){for(let n=0;n<8;n++){const id=dndRollId(crypto);if(!ids.has(id))return id;}return fail('RANDOM');}
export function sanitizeDndLibrary(raw){
  const next={version:1,cards:[],collections:[]};if(raw?.version!==1)return next;
  const groups=new Set(),names=new Set(),ids=new Set(),keys=new Set();
  for(const c of Array.isArray(raw.collections)?raw.collections:[])try{const name=dndPlainText(c.name,1,60),key=dndLibrarySearchKey(name);if(!validId(c.id)||groups.has(c.id)||names.has(key))continue;groups.add(c.id);names.add(key);next.collections.push({id:c.id,name});}catch{}
  for(const c of Array.isArray(raw.cards)?raw.cards:[])try{const fields=dndLibraryFields(c),key=dndLibraryKey(fields);if(!validId(c.id)||ids.has(c.id)||keys.has(key))continue;ids.add(c.id);keys.add(key);next.cards.push({id:c.id,...fields,favorite:c.favorite===true,collections:[...new Set(Array.isArray(c.collections)?c.collections:[])].filter(id=>groups.has(id))});}catch{}
  return next;
}
export const findDndLibraryCard=(library,event)=>library.cards.find(c=>dndLibraryKey(c)===dndLibraryKey(event))||null;
export const dndCollectionCards=(library,id)=>id==='all'?library.cards:id==='favorites'?library.cards.filter(c=>c.favorite):library.cards.filter(c=>c.collections.includes(id));
export function filterDndCards(library,{collection='all',query='',groups=[]}={}){const needle=dndLibrarySearchKey(query),chosen=new Set(groups);return dndCollectionCards(library,collection).filter(c=>(!needle||dndLibrarySearchKey([c.roll,c.title,c.event].join(' ')).includes(needle))&&(!chosen.size||chosen.has('favorites')&&c.favorite||chosen.has('ungrouped')&&!c.favorite&&!c.collections.length||c.collections.some(id=>chosen.has(id))));}
export function saveDndLibraryCard(raw,event,crypto=globalThis.crypto){
  const next=sanitizeDndLibrary(raw),fields=dndLibraryFields(event);if(typeof event.favorite!=='boolean'||!Array.isArray(event.collections))return fail('LIBRARY_CARD');
  const collections=[...new Set(event.collections)];if(collections.some(id=>!next.collections.some(c=>c.id===id)))return fail('LIBRARY_COLLECTION');
  const index=event.id?next.cards.findIndex(c=>c.id===event.id):-1;if(event.id&&index<0)return fail('LIBRARY_CARD');if(next.cards.some(c=>c.id!==event.id&&dndLibraryKey(c)===dndLibraryKey(fields)))return fail('LIBRARY_DUPLICATE');
  const saved={id:index<0?freshId(new Set(next.cards.map(c=>c.id)),crypto):event.id,...fields,favorite:event.favorite,collections};if(index<0)next.cards.push(saved);else next.cards[index]=saved;return next;
}
export function toggleDndFavorite(raw,event,crypto){const next=sanitizeDndLibrary(raw),card=findDndLibraryCard(next,event);return saveDndLibraryCard(next,card?{...card,favorite:!card.favorite}:{...dndLibraryFields(event),favorite:true,collections:[]},crypto);}
export function saveDndCollection(raw,{id,name},crypto=globalThis.crypto){
  const next=sanitizeDndLibrary(raw),value=dndPlainText(name,1,60),key=dndLibrarySearchKey(value);if(next.collections.some(c=>c.id!==id&&dndLibrarySearchKey(c.name)===key))return fail('LIBRARY_NAME');const index=id?next.collections.findIndex(c=>c.id===id):-1;if(id&&index<0)return fail('LIBRARY_COLLECTION');
  const saved={id:id||freshId(new Set(next.collections.map(c=>c.id)),crypto),name:value};if(index<0)next.collections.push(saved);else next.collections[index]=saved;return next;
}
export function deleteDndCollection(raw,id){const next=sanitizeDndLibrary(raw);next.collections=next.collections.filter(c=>c.id!==id);next.cards=next.cards.map(c=>({...c,collections:c.collections.filter(value=>value!==id)}));return next;}
function selectedCards(library,ids){if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!validId(id)))return fail('LIBRARY_CARD');const chosen=new Set(ids),cards=library.cards.filter(c=>chosen.has(c.id));if(cards.length!==ids.length)return fail('LIBRARY_CARD');return cards;}
export function organizeDndLibraryCards(raw,ids,target,{source='all',move=false}={}){
  const next=sanitizeDndLibrary(raw),cards=selectedCards(next,ids);if(target!=='favorites'&&!next.collections.some(c=>c.id===target)||source!=='all'&&source!=='favorites'&&!next.collections.some(c=>c.id===source)||move&&(source==='all'||source===target))return fail('LIBRARY_COLLECTION');if(source!=='all'&&cards.some(c=>source==='favorites'?!c.favorite:!c.collections.includes(source)))return fail('LIBRARY_CARD');
  for(const card of cards){if(target==='favorites')card.favorite=true;else if(!card.collections.includes(target))card.collections.push(target);if(move){if(source==='favorites')card.favorite=false;else card.collections=card.collections.filter(id=>id!==source);}}return next;
}
export function deleteDndLibraryCards(raw,ids,collection='all'){
  const next=sanitizeDndLibrary(raw),cards=selectedCards(next,ids);if(collection==='all'){const chosen=new Set(ids);next.cards=next.cards.filter(c=>!chosen.has(c.id));return next;}if(collection!=='favorites'&&!next.collections.some(c=>c.id===collection))return fail('LIBRARY_COLLECTION');if(cards.some(c=>collection==='favorites'?!c.favorite:!c.collections.includes(collection)))return fail('LIBRARY_CARD');
  for(const card of cards){if(collection==='favorites')card.favorite=false;else card.collections=card.collections.filter(id=>id!==collection);}return next;
}
export function deleteDndLibraryCard(raw,id){const next=sanitizeDndLibrary(raw);next.cards=next.cards.filter(c=>c.id!==id);return next;}
export function dndCollectionCoverage(library,id){const rolls=new Set(dndCollectionCards(library,id).map(c=>c.roll));return{count:rolls.size,missing:Array.from({length:20},(_,i)=>i+1).filter(n=>!rolls.has(n))};}
function randomIndex(size,crypto){if(size===1)return 0;if(typeof crypto?.getRandomValues!=='function')return fail('RANDOM');const values=new Uint32Array(1),limit=Math.floor(2**32/size)*size;do{crypto.getRandomValues(values);}while(values[0]>=limit);return values[0]%size;}
export function dndCollectionTable(raw,id,crypto=globalThis.crypto){
  const library=sanitizeDndLibrary(raw);if(!['all','favorites'].includes(id)&&!library.collections.some(c=>c.id===id))return fail('LIBRARY_COLLECTION');const cards=dndCollectionCards(library,id);if(dndCollectionCoverage(library,id).missing.length)return fail('DND_COLLECTION_INCOMPLETE');
  return Array.from({length:20},(_,i)=>{const choices=cards.filter(c=>c.roll===i+1);return dndSavedEvent(choices[randomIndex(choices.length,crypto)]);});
}
export function addDndEventsToCollection(raw,events,target,crypto=globalThis.crypto,selected=null){
  const next=sanitizeDndLibrary(raw);if(target!=='favorites'&&!next.collections.some(c=>c.id===target))return fail('LIBRARY_COLLECTION');if(!Array.isArray(events)||!events.length||events.length>20||new Set(events.map(e=>e.roll)).size!==events.length)return fail('LIBRARY_CARD');
  const rolls=selected===null?new Set(events.map(e=>e.roll)):new Set(selected);if(!rolls.size||selected&&rolls.size!==selected.length||[...rolls].some(n=>!events.some(e=>e.roll===n)))return fail('LIBRARY_CARD');
  const byKey=new Map(next.cards.map(c=>[dndLibraryKey(c),c])),ids=new Set(next.cards.map(c=>c.id)),items=[];
  for(const event of events){if(!rolls.has(event.roll))continue;const fields=dndLibraryFields(event),key=dndLibraryKey(fields);let card=byKey.get(key),created=!card,changed=created;
    if(card){if(target==='favorites'){changed=!card.favorite;card.favorite=true;}else if(!card.collections.includes(target)){card.collections.push(target);changed=true;}}
    else{card={id:freshId(ids,crypto),...fields,favorite:target==='favorites',collections:target==='favorites'?[]:[target]};ids.add(card.id);byKey.set(key,card);next.cards.push(card);}if(changed)items.push({roll:event.roll,id:card.id,created,stamp:stamp(card)});
  }return{library:next,receipt:{version:1,target,items,...(selected!==null?{selected:true}:{})}};
}
export function undoDndEventsCollection(raw,events,rawReceipt){const receipt=dndLibraryReceipt(rawReceipt,events),next=sanitizeDndLibrary(raw),changes=new Map(receipt.items.map(i=>[i.id,i])),byRoll=new Map(events.map(e=>[e.roll,e]));next.cards=next.cards.filter(card=>{const item=changes.get(card.id),event=item&&byRoll.get(item.roll);if(!event||dndLibraryKey(card)!==dndLibraryKey(event)||stamp(card)!==item.stamp)return true;if(receipt.target==='favorites'){if(!card.favorite)return true;card.favorite=false;}else{if(!card.collections.includes(receipt.target))return true;card.collections=card.collections.filter(id=>id!==receipt.target);}return !item.created||card.favorite||card.collections.length>0;});return next;}
export function dndLibraryError(error){return({DND_FIELDS:'Выбери грань 1–20 и заполни название и текст события.',LIBRARY_CARD:'Событие не найдено. Открой его заново.',LIBRARY_COLLECTION:'Сборник не найден. Выбери другой.',LIBRARY_DUPLICATE:'Такое событие для этой грани уже сохранено.',LIBRARY_NAME:'Название должно отличаться от других сборников.',DND_COLLECTION_INCOMPLETE:'Для бросков нужны события для всех граней 1–20. Отдельное событие можно выбрать для чата в его карточке.',UNSAFE_TEXT:'Используй обычный текст без ссылок, разметки и макросов.',INVALID_TABLE:'Заполни название и текст события. Название сборника: 1–60 знаков.',RANDOM:'Не удалось получить случайное значение. Попробуй ещё раз.',STALE:'Чат или набор изменился. Выбери события заново.'})[error?.code]||'Не удалось сохранить изменения. Попробуй ещё раз.';}

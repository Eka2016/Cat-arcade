import {DndError,dndPlainText,dndRollId} from './dnd.js';
import {validateTruthPack,validateTruthBulkReceipt,truthCardText,truthTextKey} from './truth-dare.js';

const validId=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
const textKey=truthTextKey;
const empty=()=>({version:1,cards:[],collections:[]});
const fail=code=>{throw new DndError(code);};
function freshId(existing,crypto){for(let attempt=0;attempt<8;attempt++){const id=dndRollId(crypto);if(!existing.has(id))return id;}return fail('RANDOM');}
export function sanitizeTruthLibrary(raw){
  const result=empty();if(raw?.version!==1)return result;
  const ids=new Set(),names=new Set(),texts=new Set();
  for(const value of Array.isArray(raw.collections)?raw.collections:[]){
    try{const name=dndPlainText(value.name,1,60),key=textKey(name);if(!validId(value.id)||ids.has(value.id)||!key||names.has(key))continue;ids.add(value.id);names.add(key);result.collections.push({id:value.id,name});}catch{}
  }
  const cardIds=new Set();
  for(const value of Array.isArray(raw.cards)?raw.cards:[]){
    try{
      const text=truthCardText(value.text),key=textKey(text);if(!validId(value.id)||cardIds.has(value.id)||!['truth','dare'].includes(value.kind)||texts.has(key))continue;
      const collections=[...new Set(Array.isArray(value.collections)?value.collections:[])].filter(id=>ids.has(id));
      cardIds.add(value.id);texts.add(key);result.cards.push({id:value.id,kind:value.kind,text,favorite:value.favorite===true,collections});
    }catch{}
  }
  return result;
}
export const truthLibraryCardKey=card=>`${card.kind}:${textKey(card.text)}`;
export function findTruthLibraryCard(library,card){const key=truthLibraryCardKey(card);return library.cards.find(value=>truthLibraryCardKey(value)===key)||null;}
export function truthCollectionCards(library,id){
  return id==='all'?library.cards:id==='favorites'?library.cards.filter(card=>card.favorite):library.cards.filter(card=>card.collections.includes(id));
}
const searchKey=text=>text.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
export function filterTruthCards(library,{collection='all',query='',groups=[]}={}){
  const needle=searchKey(query),chosen=new Set(groups);
  return truthCollectionCards(library,collection).filter(card=>(!needle||searchKey(card.text).includes(needle))&&(!chosen.size||chosen.has('favorites')&&card.favorite||chosen.has('ungrouped')&&!card.favorite&&!card.collections.length||card.collections.some(id=>chosen.has(id))));
}
function selectedLibraryCards(library,ids){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!validId(id)))return fail('LIBRARY_CARD');
  const chosen=new Set(ids),cards=library.cards.filter(card=>chosen.has(card.id));if(cards.length!==ids.length)return fail('LIBRARY_CARD');return cards;
}
export function organizeTruthLibraryCards(raw,ids,target,{source='all',move=false}={}){
  const next=sanitizeTruthLibrary(raw),cards=selectedLibraryCards(next,ids);
  if(target!=='favorites'&&!next.collections.some(c=>c.id===target)||source!=='all'&&source!=='favorites'&&!next.collections.some(c=>c.id===source)||move&&(source==='all'||source===target))return fail('LIBRARY_COLLECTION');
  if(source!=='all'&&cards.some(card=>source==='favorites'?!card.favorite:!card.collections.includes(source)))return fail('LIBRARY_CARD');
  for(const card of cards){
    if(target==='favorites')card.favorite=true;else if(!card.collections.includes(target))card.collections.push(target);
    if(move){if(source==='favorites')card.favorite=false;else card.collections=card.collections.filter(id=>id!==source);}
  }return next;
}
export function deleteTruthLibraryCards(raw,ids,collection='all'){
  const next=sanitizeTruthLibrary(raw),cards=selectedLibraryCards(next,ids);
  if(collection==='all'){const removed=new Set(ids);next.cards=next.cards.filter(card=>!removed.has(card.id));return next;}
  if(collection!=='favorites'&&!next.collections.some(value=>value.id===collection))return fail('LIBRARY_COLLECTION');
  if(cards.some(card=>collection==='favorites'?!card.favorite:!card.collections.includes(collection)))return fail('LIBRARY_CARD');
  for(const card of cards){if(collection==='favorites')card.favorite=false;else card.collections=card.collections.filter(id=>id!==collection);}
  return next;
}
export function saveTruthLibraryCard(raw,card,crypto=globalThis.crypto){
  const next=sanitizeTruthLibrary(raw),text=truthCardText(card?.text);
  if(!['truth','dare'].includes(card?.kind)||typeof card.favorite!=='boolean'||!Array.isArray(card.collections))return fail('LIBRARY_CARD');
  const collectionIds=new Set(next.collections.map(value=>value.id)),collections=[...new Set(card.collections)];
  if(collections.some(id=>!collectionIds.has(id)))return fail('LIBRARY_COLLECTION');
  const index=card.id?next.cards.findIndex(value=>value.id===card.id):-1;if(card.id&&index<0)return fail('LIBRARY_CARD');
  if(next.cards.some(value=>value.id!==card.id&&textKey(value.text)===textKey(text)))return fail('LIBRARY_DUPLICATE');
  const id=index<0?freshId(new Set(next.cards.map(value=>value.id)),crypto):card.id;
  const saved={id,kind:card.kind,text,favorite:card.favorite,collections};if(index<0)next.cards.push(saved);else next.cards[index]=saved;
  return next;
}
export function toggleTruthFavorite(raw,card,crypto=globalThis.crypto){
  const library=sanitizeTruthLibrary(raw),existing=findTruthLibraryCard(library,card);
  return saveTruthLibraryCard(library,existing?{...existing,favorite:!existing.favorite}:{kind:card.kind,text:card.text,favorite:true,collections:[]},crypto);
}
export function favoriteTruthCards(raw,kind,texts,crypto=globalThis.crypto){
  if(!['truth','dare'].includes(kind)||!Array.isArray(texts))return fail('LIBRARY_CARD');
  const next=sanitizeTruthLibrary(raw),byText=new Map(next.cards.map(card=>[textKey(card.text),card])),ids=new Set(next.cards.map(card=>card.id));
  for(const value of texts){
    const text=truthCardText(value),key=textKey(text),existing=byText.get(key);
    if(existing){if(existing.kind!==kind)return fail('LIBRARY_DUPLICATE');existing.favorite=true;}
    else{const card={id:freshId(ids,crypto),kind,text,favorite:true,collections:[]};ids.add(card.id);byText.set(key,card);next.cards.push(card);}
  }
  return next;
}
function cardStamp(card){
  // Only detects later edits before undo; it is not an authentication token.
  let a=2166136261,b=2246822507;const text=card.kind+'\0'+card.text;
  for(let i=0;i<text.length;i++){const code=text.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b^code,3266489909);}
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
export function addTruthCardsToCollection(raw,kind,texts,target,crypto=globalThis.crypto,selected=null){
  if(!['truth','dare'].includes(kind)||!Array.isArray(texts))return fail('LIBRARY_CARD');
  if(selected!==null&&(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length||selected.some(index=>!Number.isInteger(index)||index<0||index>=texts.length)))return fail('LIBRARY_CARD');
  const next=sanitizeTruthLibrary(raw);if(target!=='favorites'&&!next.collections.some(value=>value.id===target))return fail('LIBRARY_COLLECTION');
  const byText=new Map(next.cards.map(card=>[textKey(card.text),card])),ids=new Set(next.cards.map(card=>card.id)),items=[];
  for(const index of selected===null?texts.keys():selected){
    const value=texts[index];
    const text=truthCardText(value),key=textKey(text);let card=byText.get(key),created=!card,changed=created;
    if(card){if(card.kind!==kind)return fail('LIBRARY_DUPLICATE');if(target==='favorites'){changed=!card.favorite;card.favorite=true;}else if(!card.collections.includes(target)){card.collections.push(target);changed=true;}}
    else{card={id:freshId(ids,crypto),kind,text,favorite:target==='favorites',collections:target==='favorites'?[]:[target]};ids.add(card.id);byText.set(key,card);next.cards.push(card);}
    if(changed)items.push({index,id:card.id,created,stamp:cardStamp(card)});
  }
  return {library:next,receipt:{version:1,target,items,...(selected!==null?{selected:true}:{})}};
}
export function undoTruthCardsCollection(raw,kind,texts,rawReceipt){
  if(!['truth','dare'].includes(kind)||!Array.isArray(texts))return fail('LIBRARY_CARD');
  const receipt=validateTruthBulkReceipt(rawReceipt,texts.length),next=sanitizeTruthLibrary(raw),changes=new Map(receipt.items.map(item=>[item.id,item]));
  next.cards=next.cards.filter(card=>{
    const item=changes.get(card.id);if(!item||card.kind!==kind||textKey(card.text)!==textKey(truthCardText(texts[item.index]))||cardStamp(card)!==item.stamp)return true;
    if(receipt.target==='favorites'){if(!card.favorite)return true;card.favorite=false;}
    else{if(!card.collections.includes(receipt.target))return true;card.collections=card.collections.filter(id=>id!==receipt.target);}
    return !item.created||card.favorite||card.collections.length>0;
  });
  return next;
}
export function deleteTruthLibraryCard(raw,id){const next=sanitizeTruthLibrary(raw);next.cards=next.cards.filter(card=>card.id!==id);return next;}
export function saveTruthCollection(raw,{id,name},crypto=globalThis.crypto){
  const next=sanitizeTruthLibrary(raw),value=dndPlainText(name,1,60),key=textKey(value);
  if(!key)return fail('LIBRARY_NAME');
  if(next.collections.some(collection=>collection.id!==id&&textKey(collection.name)===key))return fail('LIBRARY_NAME');
  const index=id?next.collections.findIndex(collection=>collection.id===id):-1;if(id&&index<0)return fail('LIBRARY_COLLECTION');
  const collection={id:index<0?freshId(new Set(next.collections.map(value=>value.id)),crypto):id,name:value};
  if(index<0)next.collections.push(collection);else next.collections[index]=collection;return next;
}
export function deleteTruthCollection(raw,id){
  const next=sanitizeTruthLibrary(raw);next.collections=next.collections.filter(value=>value.id!==id);next.cards=next.cards.map(card=>({...card,collections:card.collections.filter(value=>value!==id)}));return next;
}
export function truthCollectionPack(raw,id){
  const library=sanitizeTruthLibrary(raw);
  if(!['all','favorites'].includes(id)&&!library.collections.some(value=>value.id===id))return fail('LIBRARY_COLLECTION');
  const cards=truthCollectionCards(library,id),pack={truth:cards.filter(card=>card.kind==='truth').map(card=>card.text),dare:cards.filter(card=>card.kind==='dare').map(card=>card.text)};
  if(!pack.truth.length||!pack.dare.length)return fail('COLLECTION_TYPES');return validateTruthPack(pack,{maxCards:Infinity,custom:true});
}
export function truthLibraryError(error){
  return ({LIBRARY_CARD:'Карточка не найдена. Открой её заново.',LIBRARY_COLLECTION:'Сборник не найден. Выбери другой.',LIBRARY_DUPLICATE:'Карточка с таким текстом уже сохранена.',LIBRARY_NAME:'Название должно отличаться от других сборников.',COLLECTION_TYPES:'Для жетона нужна хотя бы одна «Правда» и одно «Действие».',UNSAFE_TEXT:'Используй обычный текст без ссылок, разметки и макросов.',INVALID_TABLE:'Заполни текст карточки. Название сборника: 1–60 знаков.',RANDOM:'Не удалось создать идентификатор. Попробуй ещё раз.'})[error?.code]||'Не удалось сохранить изменения. Попробуй ещё раз.';
}

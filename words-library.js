import {DndError,dndPlainText,dndRollId} from './dnd.js';
import {wordFields,wordPairKey,wordSearchKey,wordStamp,wordBulkReceipt} from './words-content.js';
import {WORDS} from './words.js';

const fail=code=>{throw new DndError(code);},validId=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
const freshId=(ids,crypto)=>{for(let n=0;n<8;n++){const id=dndRollId(crypto);if(!ids.has(id))return id;}return fail('RANDOM');};
export function sanitizeWordLibrary(raw){
  const next={version:1,cards:[],collections:[]};if(raw?.version!==1)return next;
  if(raw.topicsVersion===1)next.topicsVersion=1;
  const collectionIds=new Set(),names=new Set(),ids=new Set(),pairs=new Set();
  for(const value of Array.isArray(raw.collections)?raw.collections:[])try{const name=dndPlainText(value.name,1,60),key=wordSearchKey(name);if(!validId(value.id)||collectionIds.has(value.id)||names.has(key))continue;collectionIds.add(value.id);names.add(key);next.collections.push({id:value.id,name});}catch{}
  for(const value of Array.isArray(raw.cards)?raw.cards:[])try{
    const fields=wordFields(value),pair=wordPairKey(fields);if(!validId(value.id)||ids.has(value.id)||pairs.has(pair))continue;ids.add(value.id);pairs.add(pair);
    next.cards.push({id:value.id,...fields,favorite:value.favorite===true,collections:[...new Set(Array.isArray(value.collections)?value.collections:[])].filter(id=>collectionIds.has(id))});
  }catch{}
  return next;
}
/** Move the former built-in topics into ordinary editable collections once. */
export function seedWordTopics(raw){
  const next=sanitizeWordLibrary(raw);if(next.topicsVersion===1)return next;
  const ids=new Set([...next.cards,...next.collections].map(value=>value.id)),names=new Set(next.collections.map(value=>wordSearchKey(value.name))),byPair=new Map(next.cards.map(card=>[wordPairKey(card),card]));let serial=0;
  function id(){let value;do{value='7061772d656e676c6973682d'+(++serial).toString(16).padStart(8,'0');}while(ids.has(value));ids.add(value);return value;}
  for(const [topic,title] of [['basics','Базовые'],['forest','Лес и природа'],['tavern','Таверна']]){
    let name=title,suffix=0;while(names.has(wordSearchKey(name)))name=`${title} · встроенные${suffix++?' '+suffix:''}`;
    const collection={id:id(),name};names.add(wordSearchKey(name));next.collections.push(collection);
    for(const word of WORDS.filter(value=>value.topic===topic)){
      const pair=wordPairKey(word);let card=byPair.get(pair);
      if(!card){card={id:id(),...wordFields(word),favorite:false,collections:[]};byPair.set(pair,card);next.cards.push(card);}
      card.collections.push(collection.id);
    }
  }
  next.topicsVersion=1;return next;
}
export const findWordLibraryCard=(library,word)=>library.cards.find(card=>wordPairKey(card)===wordPairKey(word))||null;
export const wordCollectionCards=(library,id)=>id==='all'?library.cards:id==='favorites'?library.cards.filter(c=>c.favorite):library.cards.filter(c=>c.collections.includes(id));
export function filterWordCards(library,{collection='all',query='',groups=[]}={}){
  const needle=wordSearchKey(query),selected=new Set(groups);
  return wordCollectionCards(library,collection).filter(card=>(!needle||wordSearchKey([card.en,card.ru,card.example,card.translation].join('\n')).includes(needle))&&(!selected.size||selected.has('favorites')&&card.favorite||selected.has('ungrouped')&&!card.favorite&&!card.collections.length||card.collections.some(id=>selected.has(id))));
}
export function saveWordLibraryCard(raw,word,crypto=globalThis.crypto){
  const next=sanitizeWordLibrary(raw),fields=wordFields(word);
  if(typeof word.favorite!=='boolean'||!Array.isArray(word.collections))return fail('LIBRARY_CARD');
  const collections=[...new Set(word.collections)];if(collections.some(id=>!next.collections.some(c=>c.id===id)))return fail('LIBRARY_COLLECTION');
  const index=word.id?next.cards.findIndex(c=>c.id===word.id):-1;if(word.id&&index<0)return fail('LIBRARY_CARD');
  if(next.cards.some(c=>c.id!==word.id&&wordPairKey(c)===wordPairKey(fields)))return fail('LIBRARY_DUPLICATE');
  const saved={id:index<0?freshId(new Set(next.cards.map(c=>c.id)),crypto):word.id,...fields,favorite:word.favorite,collections};if(index<0)next.cards.push(saved);else next.cards[index]=saved;return next;
}
export function toggleWordFavorite(raw,word,crypto){const next=sanitizeWordLibrary(raw),card=findWordLibraryCard(next,word);return saveWordLibraryCard(next,card?{...card,favorite:!card.favorite}:{...wordFields(word),favorite:true,collections:[]},crypto);}
export function saveWordCollection(raw,{id,name},crypto=globalThis.crypto){
  const next=sanitizeWordLibrary(raw),value=dndPlainText(name,1,60),key=wordSearchKey(value);
  if(next.collections.some(c=>c.id!==id&&wordSearchKey(c.name)===key))return fail('LIBRARY_NAME');
  const index=id?next.collections.findIndex(c=>c.id===id):-1;if(id&&index<0)return fail('LIBRARY_COLLECTION');
  const saved={id:id||freshId(new Set(next.collections.map(c=>c.id)),crypto),name:value};if(index<0)next.collections.push(saved);else next.collections[index]=saved;return next;
}
export function deleteWordCollection(raw,id){const next=sanitizeWordLibrary(raw);next.collections=next.collections.filter(c=>c.id!==id);next.cards=next.cards.map(c=>({...c,collections:c.collections.filter(value=>value!==id)}));return next;}
function selectedCards(library,ids){if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!validId(id)))return fail('LIBRARY_CARD');const chosen=new Set(ids),cards=library.cards.filter(c=>chosen.has(c.id));if(cards.length!==ids.length)return fail('LIBRARY_CARD');return cards;}
export function organizeWordLibraryCards(raw,ids,target,{source='all',move=false}={}){
  const next=sanitizeWordLibrary(raw),cards=selectedCards(next,ids);
  if(target!=='favorites'&&!next.collections.some(c=>c.id===target)||source!=='all'&&source!=='favorites'&&!next.collections.some(c=>c.id===source)||move&&(source==='all'||source===target))return fail('LIBRARY_COLLECTION');
  if(source!=='all'&&cards.some(c=>source==='favorites'?!c.favorite:!c.collections.includes(source)))return fail('LIBRARY_CARD');
  for(const card of cards){if(target==='favorites')card.favorite=true;else if(!card.collections.includes(target))card.collections.push(target);if(move){if(source==='favorites')card.favorite=false;else card.collections=card.collections.filter(id=>id!==source);}}return next;
}
export function deleteWordLibraryCards(raw,ids,collection='all'){
  const next=sanitizeWordLibrary(raw),cards=selectedCards(next,ids);if(collection==='all'){const chosen=new Set(ids);next.cards=next.cards.filter(c=>!chosen.has(c.id));return next;}
  if(collection!=='favorites'&&!next.collections.some(c=>c.id===collection))return fail('LIBRARY_COLLECTION');
  if(cards.some(c=>collection==='favorites'?!c.favorite:!c.collections.includes(collection)))return fail('LIBRARY_CARD');
  for(const card of cards){if(collection==='favorites')card.favorite=false;else card.collections=card.collections.filter(id=>id!==collection);}return next;
}
export function deleteWordLibraryCard(raw,id){const next=sanitizeWordLibrary(raw);next.cards=next.cards.filter(c=>c.id!==id);return next;}
export function wordCollectionSet(raw,id){
  const library=sanitizeWordLibrary(raw);if(!['all','favorites'].includes(id)&&!library.collections.some(c=>c.id===id))return fail('LIBRARY_COLLECTION');
  const cards=wordCollectionCards(library,id);if(!cards.length)return fail('EMPTY_WORDS');
  return {version:1,name:id==='all'?'Все сохранённые слова':id==='favorites'?'Избранное':library.collections.find(c=>c.id===id).name,words:cards.map(({id,en,ru,example,translation})=>({id,en,ru,example,translation}))};
}
export function addWordsToCollection(raw,words,target,crypto=globalThis.crypto,selected=null){
  const next=sanitizeWordLibrary(raw);if(target!=='favorites'&&!next.collections.some(c=>c.id===target))return fail('LIBRARY_COLLECTION');
  if(!Array.isArray(words)||!words.length)return fail('EMPTY_WORDS');
  const chosen=selected===null?new Set(words.map(w=>w.id)):new Set(selected);if(!chosen.size||selected&&chosen.size!==selected.length||[...chosen].some(id=>!words.some(w=>w.id===id)))return fail('LIBRARY_CARD');
  const byPair=new Map(next.cards.map(c=>[wordPairKey(c),c])),ids=new Set(next.cards.map(c=>c.id)),items=[];
  for(const word of words){if(!chosen.has(word.id))continue;const fields=wordFields(word),pair=wordPairKey(fields);let card=byPair.get(pair),created=!card,changed=created;
    if(card){if(target==='favorites'){changed=!card.favorite;card.favorite=true;}else if(!card.collections.includes(target)){card.collections.push(target);changed=true;}}
    else{card={id:freshId(ids,crypto),...fields,favorite:target==='favorites',collections:target==='favorites'?[]:[target]};ids.add(card.id);byPair.set(pair,card);next.cards.push(card);}
    if(changed)items.push({sourceId:word.id,id:card.id,created,stamp:wordStamp(card)});
  }
  return {library:next,receipt:{version:1,target,items,...(selected!==null?{selected:true}:{})}};
}
export function undoWordsCollection(raw,words,rawReceipt){
  const receipt=wordBulkReceipt(rawReceipt,words),next=sanitizeWordLibrary(raw),changes=new Map(receipt.items.map(item=>[item.id,item])),byId=new Map(words.map(w=>[w.id,w]));
  next.cards=next.cards.filter(card=>{const item=changes.get(card.id),word=item&&byId.get(item.sourceId);if(!word||wordPairKey(card)!==wordPairKey(word)||wordStamp(card)!==item.stamp)return true;
    if(receipt.target==='favorites'){if(!card.favorite)return true;card.favorite=false;}else{if(!card.collections.includes(receipt.target))return true;card.collections=card.collections.filter(id=>id!==receipt.target);}
    return !item.created||card.favorite||card.collections.length>0;
  });return next;
}

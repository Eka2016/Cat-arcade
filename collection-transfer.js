import {dndPlainText,dndRollId} from './dnd.js';
import {truthCardText,truthTextKey} from './truth-dare.js';
import {sanitizeTruthLibrary} from './truth-library.js';
import {wordFields,wordPairKey,wordSearchKey} from './words-content.js';
import {sanitizeWordLibrary} from './words-library.js';
import {sanitizeDndLibrary,dndLibraryFields,dndLibraryKey,dndLibrarySearchKey} from './dnd-library.js';

export const COLLECTION_FILE_FORMAT='paw-arcade-collections';
export const COLLECTION_FILE_LIMIT=32*1024*1024;
export const COLLECTION_GAME_NAMES=Object.freeze({truth:'Правда или действие',words:'Английский',dnd:'ДНД'});
const virtualNames=new Map([['favorites','Избранное'],['ungrouped','Без сборника']]);
const validId=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export class CollectionTransferError extends Error{constructor(code,game){super(code);this.name='CollectionTransferError';this.code=code;this.game=game;}}
const fail=(code,game)=>{throw new CollectionTransferError(code,game);};
const adapters={
  truth:{sanitize:sanitizeTruthLibrary,nameKey:truthTextKey,key:card=>truthTextKey(card.text),fields(card){if(!object(card)||!['truth','dare'].includes(card.kind))return fail('CONTENT');return{kind:card.kind,text:truthCardText(card.text)};}},
  words:{sanitize:sanitizeWordLibrary,nameKey:wordSearchKey,key:wordPairKey,fields:wordFields},
  dnd:{sanitize:sanitizeDndLibrary,nameKey:dndLibrarySearchKey,key:dndLibraryKey,fields:dndLibraryFields},
};
function adapter(game){return typeof game==='string'&&Object.hasOwn(adapters,game)?adapters[game]:fail('FORMAT');}
function selection(choices,ids){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)return fail('SELECTION');
  const available=new Set(choices.map(c=>c.id));if(ids.some(id=>!available.has(id)))return fail('SELECTION');return new Set(ids);
}
function memberships(card){return [...card.collections,...(card.favorite?['favorites']:[]),...(!card.favorite&&!card.collections.length?['ungrouped']:[])];}
export function collectionTransferChoices(game,raw){
  const library=adapter(game).sanitize(raw),choices=[{id:'favorites',name:'Избранное'},...library.collections,{id:'ungrouped',name:'Без сборника'}],counts=new Map(choices.map(c=>[c.id,0]));
  for(const card of library.cards)for(const id of memberships(card))counts.set(id,counts.get(id)+1);
  return choices.map(c=>({...c,count:counts.get(c.id)}));
}
/** Only explicitly selected collections and their plain card fields leave the app. */
export function makeCollectionTransfer(game,raw,ids){
  const a=adapter(game),library=a.sanitize(raw),choices=collectionTransferChoices(game,library),chosen=selection(choices,ids);
  const collections=choices.filter(c=>chosen.has(c.id)).map(({id,name})=>({id,name})),cards=[];
  for(const card of library.cards){const groups=memberships(card).filter(id=>chosen.has(id));if(groups.length)cards.push({...a.fields(card),collections:groups});}
  return{format:COLLECTION_FILE_FORMAT,version:1,game,collections,cards};
}
export function validateCollectionTransfer(raw,expectedGame){
  if(!object(raw)||raw.format!==COLLECTION_FILE_FORMAT||raw.version!==1||typeof raw.game!=='string'||!Object.hasOwn(adapters,raw.game)||!Array.isArray(raw.collections)||!raw.collections.length||!Array.isArray(raw.cards))return fail('FORMAT');
  if(expectedGame&&raw.game!==expectedGame)return fail('GAME',raw.game);
  const a=adapter(raw.game),ids=new Set(),collections=[],cards=[],byKey=new Map();
  try{
    for(const c of raw.collections){
      if(!object(c)||!validId(c.id)&&!virtualNames.has(c.id)||ids.has(c.id))return fail('CONTENT');
      const name=dndPlainText(c.name,1,60);if(!a.nameKey(name))return fail('CONTENT');ids.add(c.id);collections.push({id:c.id,name:virtualNames.get(c.id)||name});
    }
    for(const value of raw.cards){
      if(!object(value)||!Array.isArray(value.collections)||!value.collections.length||value.collections.some(id=>!ids.has(id))||new Set(value.collections).size!==value.collections.length)return fail('CONTENT');
      const fields=a.fields(value),key=a.key(fields),previous=byKey.get(key);
      if(previous){if(raw.game==='truth'&&previous.kind!==fields.kind)return fail('CONFLICT');for(const id of value.collections)if(!previous.collections.includes(id))previous.collections.push(id);}
      else{const card={...fields,collections:[...value.collections]};byKey.set(key,card);cards.push(card);}
    }
  }catch(error){if(error instanceof CollectionTransferError)throw error;return fail('CONTENT');}
  return{format:COLLECTION_FILE_FORMAT,version:1,game:raw.game,collections,cards};
}
function checkSize(text){if(typeof text!=='string')return fail('FORMAT');if(text.length>COLLECTION_FILE_LIMIT||new TextEncoder().encode(text).byteLength>COLLECTION_FILE_LIMIT)return fail('SIZE');}
export function parseCollectionTransfer(text,expectedGame){
  checkSize(text);let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,''));}catch{return fail('FORMAT');}return validateCollectionTransfer(raw,expectedGame);
}
export function stringifyCollectionTransfer(pack){const text=JSON.stringify(validateCollectionTransfer(pack),null,2)+'\n';checkSize(text);return text;}
export function importedCollectionChoices(pack){
  const counts=new Map(pack.collections.map(c=>[c.id,0]));for(const card of pack.cards)for(const id of card.collections)counts.set(id,counts.get(id)+1);return pack.collections.map(c=>({...c,count:counts.get(c.id)}));
}
function freshId(ids,crypto){for(let n=0;n<8;n++){let id;try{id=dndRollId(crypto);}catch{return fail('RANDOM');}if(!ids.has(id)){ids.add(id);return id;}}return fail('RANDOM');}
/** Additive, atomic merge: no old card text, memberships or IDs are overwritten. */
export function mergeCollectionTransfer(game,raw,incoming,ids,crypto=globalThis.crypto){
  const pack=validateCollectionTransfer(incoming,game),chosen=selection(pack.collections,ids),a=adapter(game),next=a.sanitize(raw),allIds=new Set([...next.cards,...next.collections].map(c=>c.id));
  const names=new Map(next.collections.map(c=>[a.nameKey(c.name),c])),mapping=new Map(),byKey=new Map(next.cards.map(c=>[a.key(c),c]));
  const stats={collectionsAdded:0,cardsAdded:0,cardsReused:0,membershipsAdded:0,favoritesAdded:0};
  for(const c of pack.collections){
    if(!chosen.has(c.id))continue;if(virtualNames.has(c.id)){mapping.set(c.id,c.id);continue;}
    const key=a.nameKey(c.name);let saved=names.get(key);
    if(!saved){saved={id:freshId(allIds,crypto),name:c.name};next.collections.push(saved);names.set(key,saved);stats.collectionsAdded++;}mapping.set(c.id,saved.id);
  }
  for(const incomingCard of pack.cards){
    const groups=incomingCard.collections.filter(id=>chosen.has(id));if(!groups.length)continue;
    const fields=a.fields(incomingCard),key=a.key(fields);let card=byKey.get(key);
    if(card){if(game==='truth'&&card.kind!==fields.kind)return fail('CONFLICT');stats.cardsReused++;}
    else{card={id:freshId(allIds,crypto),...fields,favorite:false,collections:[]};next.cards.push(card);byKey.set(key,card);stats.cardsAdded++;}
    for(const id of groups){const target=mapping.get(id);if(target==='favorites'){if(!card.favorite){card.favorite=true;stats.favoritesAdded++;}}else if(target!=='ungrouped'&&!card.collections.includes(target)){card.collections.push(target);stats.membershipsAdded++;}}
  }
  return{library:next,stats};
}
export function collectionTransferError(error){
  if(error?.code==='GAME')return`Это сборники игры «${COLLECTION_GAME_NAMES[error.game]||'другой игры'}». Открой импорт в её разделе «Сборники».`;
  return({FORMAT:'Не удалось прочитать файл сборников Paw Arcade. Выбери JSON, сохранённый кнопкой экспорта.',CONTENT:'В файле есть повреждённые карточки или сборники. Ничего не добавлено.',CONFLICT:'Такой текст уже есть в другом типе карточек: «Правда» или «Действие». Измени текст или тип перед импортом. Ничего не добавлено.',SELECTION:'Выбери хотя бы один сборник.',SIZE:'Для одного переноса доступно до 32 МБ. Сохрани сборники несколькими файлами.',RANDOM:'Не удалось создать идентификатор. Попробуй импорт ещё раз.',READ:'Не удалось открыть файл. Выбери его ещё раз.',SAVE:'Не удалось сохранить сборники. Прежние данные сохранены; попробуй ещё раз.',DOWNLOAD:'Не удалось скачать файл. Попробуй экспорт ещё раз.'})[error?.code]||'Не удалось перенести сборники. Попробуй ещё раз.';
}

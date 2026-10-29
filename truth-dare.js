import {DndError,dndPlainText,validateDndPreset} from './dnd.js';

export const TRUTH_PRESET=`Создай для текущего чата игру «Правда или действие»: 10 карточек «Правда» и 10 карточек «Действие».
Учитывай эпоху, место, характеры и отношения участников из контекста. Вопросы должны помогать узнавать друг друга, а действия — давать небольшие интересные поводы для отыгрыша. Разнообразные, конкретные варианты без повторений и перефразирования прежних карточек из истории. Не решай за игрока его ответы, чувства или поступки и не навязывай романтику. Действия должны быть выполнимыми, добровольными и без опасных заданий. Пиши по-русски, одна короткая фраза на карточку, желательно до 120 знаков.`;
export const TRUTH_FORMAT=`[PAW_TRUTH_DARE]
Верни только JSON {"truth":["Вопрос для карточки"],"dare":["Задание для карточки"]}. Количество и темы возьми из промпта выше; если количество не указано, по 10 каждого типа. Допустимо от 1 до 20 карточек КАЖДОГО типа. Не смешивай типы. Каждый текст 8–400 знаков; короткий вопрос или задание без готового ответа и описания его выполнения. Только обычный текст, без HTML, Markdown, кода, ссылок, слеш-команд и макросов. Ничего кроме этих двух массивов.`;
export function truthPreset(value){try{return validateDndPreset(value);}catch{return TRUTH_PRESET;}}
export function truthPrompt(value=TRUTH_PRESET){return `${validateDndPreset(value)}\n\n${TRUTH_FORMAT}`;}
export function truthCardText(value){
  if(typeof value!=='string')throw new DndError('INVALID_TABLE');
  const text=value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').trim();
  dndPlainText(text,1,Infinity);return text;
}
export function truthTextKey(text){const normalized=text.normalize('NFKC').toLowerCase().replace(/ё/g,'е');return normalized.replace(/[^\p{L}\p{N}]+/gu,'')||normalized.replace(/\s+/g,'');}
export function validateTruthPack(raw,{maxCards=20,custom=false,allowEmpty=false}={}){
  if(typeof raw==='string'){
    if(raw.length>45000)throw new DndError('INVALID_TABLE');
    try{raw=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw new DndError('INVALID_TABLE');}
  }
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DndError('INVALID_TABLE');
  const pack={},seen=new Set();
  for(const kind of ['truth','dare']){
    if(!Array.isArray(raw[kind])||raw[kind].length<(custom&&allowEmpty?0:1)||raw[kind].length>maxCards)throw new DndError('INVALID_TABLE');
    pack[kind]=raw[kind].map(value=>{const text=custom?truthCardText(value):dndPlainText(value,8,400),key=truthTextKey(text);if(seen.has(key))throw new DndError('REPEATED');seen.add(key);return text;});
  }return pack;
}
export function validateTruthBulkReceipt(raw,size){
  if(!raw||raw.version!==1||typeof raw.target!=='string'||raw.target!=='favorites'&&!/^[a-f0-9]{32}$/.test(raw.target)||!Array.isArray(raw.items)||raw.items.length>size)throw new DndError('INVALID_TABLE');
  const indices=new Set(),ids=new Set(),items=[];
  for(const item of raw.items){
    if(!item||!Number.isInteger(item.index)||item.index<0||item.index>=size||typeof item.id!=='string'||!/^[a-f0-9]{32}$/.test(item.id)||typeof item.created!=='boolean'||typeof item.stamp!=='string'||!/^[a-f0-9]{16}$/.test(item.stamp)||indices.has(item.index)||ids.has(item.id))throw new DndError('INVALID_TABLE');
    indices.add(item.index);ids.add(item.id);items.push({index:item.index,id:item.id,created:item.created,stamp:item.stamp});
  }
  return {version:1,target:raw.target,items,...(raw.selected===true?{selected:true}:{})};
}
export function truthRound(raw){
  if(!raw||![1,2].includes(raw.version))throw new DndError('INVALID_TABLE');
  const pack=validateTruthPack(raw.pack,{maxCards:Infinity,custom:true,allowEmpty:true}),used={},usedSets={},choices={truth:{},dare:{}};
  for(const kind of ['truth','dare']){
    const list=raw.used?.[kind];
    if(!Array.isArray(list)||list.length>pack[kind].length||new Set(list).size!==list.length||list.some(i=>!Number.isInteger(i)||i<0||i>=pack[kind].length))throw new DndError('INVALID_TABLE');
    used[kind]=[...list];usedSets[kind]=new Set(list);
  }
  let current=null;
  if(raw.current!==null){
    const c=raw.current;if(!c||!['truth','dare'].includes(c.kind)||c.index!==null&&!usedSets[c.kind].has(c.index)||c.index===null&&used[c.kind].length!==pack[c.kind].length)throw new DndError('INVALID_TABLE');
    current={kind:c.kind,index:c.index};
  }
  if(raw.version===2){
    if(!['random','manual'].includes(raw.selectionMode)||!raw.choices||typeof raw.choices!=='object')throw new DndError('INVALID_TABLE');
    const ids=new Set();
    for(const kind of ['truth','dare']){
      const entries=raw.choices[kind];if(!entries||typeof entries!=='object'||Array.isArray(entries))throw new DndError('INVALID_TABLE');
      if(Object.keys(entries).length>pack[kind].length)throw new DndError('INVALID_TABLE');
      for(const [index,choice] of Object.entries(entries)){
        if(!/^(?:0|[1-9]\d*)$/.test(index)||!Number.isSafeInteger(Number(index))||!usedSets[kind].has(Number(index))||!choice||typeof choice.id!=='string'||!/^[a-f0-9]{32}$/.test(choice.id)||typeof choice.applied!=='boolean'||ids.has(choice.id))throw new DndError('INVALID_TABLE');
        ids.add(choice.id);choices[kind][index]={id:choice.id,applied:choice.applied};
      }
    }
  }
  const result={version:2,pack,used,current,selectionMode:raw.version===1?'random':raw.selectionMode,choices},bulk={};
  if(raw.bulk&&typeof raw.bulk==='object'&&!Array.isArray(raw.bulk))for(const kind of ['truth','dare'])if(Object.hasOwn(raw.bulk,kind))try{bulk[kind]=validateTruthBulkReceipt(raw.bulk[kind],pack[kind].length);}catch{/* A damaged undo record does not discard the playable round. */}
  if(Object.keys(bulk).length)result.bulk=bulk;
  return result;
}
export function truthRounds(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw).flatMap(([key,value])=>{if(!key||key.length>2048)return [];try{return [[key,truthRound(value)]];}catch{return [];}}));
}
export function truthIndex(size,cryptoSource=globalThis.crypto){
  if(!Number.isInteger(size)||size<1||size>2**32||typeof cryptoSource?.getRandomValues!=='function')throw new DndError('RANDOM');
  const value=new Uint32Array(1),limit=Math.floor(2**32/size)*size;
  do{cryptoSource.getRandomValues(value);}while(value[0]>=limit);
  return value[0]%size;
}
export function nextTruthCard(saved,cryptoSource){
  const next=truthRound(saved),kinds=['truth','dare'].filter(kind=>next.used[kind].length<next.pack[kind].length);
  const kind=kinds.length===1?kinds[0]:truthIndex(2,cryptoSource)===0?'truth':'dare';
  const used=new Set(next.used[kind]),available=[];
  for(let i=0;i<next.pack[kind].length;i++)if(!used.has(i))available.push(i);
  const index=available.length?available[truthIndex(available.length,cryptoSource)]:null;
  if(index!==null)next.used[kind].push(index);next.current={kind,index};next.selectionMode='random';return next;
}
export function selectTruthCard(saved,kind,index){
  const next=truthRound(saved);
  if(!['truth','dare'].includes(kind)||!Number.isInteger(index)||index<0||index>=next.pack[kind].length)throw new DndError('INVALID_TABLE');
  if(!next.used[kind].includes(index))next.used[kind].push(index);
  next.current={kind,index};next.selectionMode='manual';return next;
}
export function resetTruthRound(saved){
  const next=truthRound(saved);next.used={truth:[],dare:[]};next.current=null;next.selectionMode='random';next.choices={truth:{},dare:{}};return next;
}
export function deleteTruthRoundCards(saved,kind,indices){
  const next=truthRound(saved);
  if(!['truth','dare'].includes(kind)||!Array.isArray(indices)||!indices.length||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=next.pack[kind].length))throw new DndError('INVALID_TABLE');
  const removed=new Set(indices),positions=new Map(),texts=[];
  next.pack[kind].forEach((text,index)=>{if(!removed.has(index)){positions.set(index,texts.length);texts.push(text);}});
  next.pack[kind]=texts;next.used[kind]=next.used[kind].filter(i=>!removed.has(i)).map(i=>positions.get(i));
  next.choices[kind]=Object.fromEntries(Object.entries(next.choices[kind]).filter(([index])=>!removed.has(Number(index))).map(([index,choice])=>[positions.get(Number(index)),choice]));
  if(next.current?.kind===kind&&next.current.index!==null)next.current=removed.has(next.current.index)?null:{kind,index:positions.get(next.current.index)};
  if(next.bulk?.[kind])next.bulk[kind].items=next.bulk[kind].items.filter(item=>!removed.has(item.index)).map(item=>({...item,index:positions.get(item.index)}));
  return !next.pack.truth.length&&!next.pack.dare.length?null:truthRound(next);
}
export function truthChatText(card){
  if(!card||!['truth','dare'].includes(card.kind)||!['random','manual'].includes(card.selectionMode))throw new DndError('APPEND');
  const text=truthCardText(card.text),label=card.kind==='truth'?'Правда':'Действие';
  return `Игра «Правда или действие» · ${card.selectionMode==='manual'?'карточка выбрана вручную':`жетон: ${label.toLowerCase()}`}\n${label}: ${text}`;
}

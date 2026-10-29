import {DndError,dndPlainText,validateDndPreset,dndRollId} from './dnd.js';

export const WORD_PRESET=`Подготовь 10 английских слов или коротких выражений для изучения, уровень A1–A2, с русским переводом.
Выбери полезные, разнообразные слова по теме леса, путешествий и повседневного общения. Для каждого дай простой английский пример и его точный русский перевод. Не повторяй слова внутри набора. Не продолжай ролевой диалог. Если я укажу другую тему, уровень или количество, следуй им.`;
export const WORD_FORMAT=`[PAW_ENGLISH_WORDS]
Верни только JSON {"words":[{"en":"English word","ru":"Русский перевод","example":"A short English example.","translation":"Перевод примера."}]}. Тему, уровень и количество возьми из пресета. Верни ровно указанное в пресете количество слов, не сокращай его до 10 или 20. Если количество не указано, верни 10 слов. en: 1–100 знаков, ru: 1–160; example и translation: до 300 знаков, можно обе пустые строки. Указывай одно конкретное значение, не включай ответ в английское поле. Английские слова не должны повторяться без учёта регистра. Только обычный текст без HTML, Markdown, кода, ссылок и макросов. Никаких других полей или текста вне JSON.`;
export const WORD_RESPONSE_TEXT_LIMIT=2000000;
/** Recognize an unambiguous explicit count; the model still reads the complete preset. */
export function wordGenerationCount(preset){
  const source=String(preset).normalize('NFKC'),counts=new Set();
  const patterns=[/(?:количеств[оа]\s*(?:слов|карточек|выражений)?|number\s+of\s+(?:words|cards)|word\s+count)\s*[:=—-]?\s*(\d+)(?!\d)/giu,/(?:^|[^\p{L}\p{N}])([1-9]\d*)\s*(?:(?:английск(?:их|ие|ое)|нов(?:ых|ые)|разн(?:ых|ые)|прост(?:ых|ые)|коротк(?:их|ие)|уникальн(?:ых|ые)|English|new|short|different|unique|basic)\s+){0,4}(?:слов(?:о|а)?|выражени[йяе]|словосочетани[йяе]|words?|flashcards?|cards?)(?=$|[^\p{L}\p{N}])/giu];
  for(const pattern of patterns)for(const match of source.matchAll(pattern)){const count=Number(match[1]);if(Number.isSafeInteger(count)&&count>0)counts.add(count);}
  return counts.size===1?[...counts][0]:null;
}
export const wordResponseLength=preset=>Math.min(65536,Math.max(3600,(wordGenerationCount(preset)??10)*180));
export const wordSearchKey=text=>String(text).normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
export const wordPairKey=word=>JSON.stringify([wordSearchKey(word.en),wordSearchKey(word.ru)]);
export function wordFields(raw,{generated=false}={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DndError('WORD_FIELDS');
  const field=(name,min,max)=>dndPlainText(raw[name]??'',min,generated?max:Infinity);
  const en=field('en',1,100),ru=field('ru',1,160),example=field('example',0,300),translation=field('translation',0,300);
  if(!!example!==!!translation)throw new DndError('WORD_EXAMPLE');
  return {en,ru,example,translation};
}
export function validateWordPack(raw,cryptoSource=globalThis.crypto){
  if(typeof raw==='string'){
    if(raw.length>WORD_RESPONSE_TEXT_LIMIT)throw new DndError('INVALID_WORDS');
    try{raw=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw new DndError('INVALID_WORDS');}
  }
  if(!raw||!Array.isArray(raw.words)||raw.words.length<1)throw new DndError('INVALID_WORDS');
  const seen=new Set(),ids=new Set();
  return raw.words.map(value=>{
    let fields;try{fields=wordFields(value,{generated:true});}catch(error){if(['INVALID_TABLE','WORD_FIELDS','WORD_EXAMPLE'].includes(error?.code))throw new DndError('INVALID_WORDS');throw error;}
    const key=wordSearchKey(fields.en);if(seen.has(key))throw new DndError('REPEATED_WORD');seen.add(key);
    let id;for(let n=0;n<8;n++){id=dndRollId(cryptoSource);if(!ids.has(id))break;id=null;}if(!id)throw new DndError('RANDOM');ids.add(id);
    return {id,...fields};
  });
}
export function wordPreset(raw){try{return validateDndPreset(raw);}catch{return WORD_PRESET;}}
export const wordPrompt=value=>`${validateDndPreset(value)}\n\n${WORD_FORMAT}`;
export function wordStamp(word){
  // Detects later edits before undo; never used for authentication.
  const text=JSON.stringify([word.en,word.ru,word.example,word.translation]);let a=2166136261,b=2246822507;
  for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489909);}
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
export const validWordId=id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,128}$/.test(id);
export function wordBulkReceipt(raw,words){
  if(!raw||raw.version!==1||typeof raw.target!=='string'||raw.target!=='favorites'&&!/^[a-f0-9]{32}$/.test(raw.target)||!Array.isArray(raw.items)||raw.items.length>words.length)throw new DndError('INVALID_WORDS');
  const sources=new Set(words.map(w=>w.id)),seen=new Set(),ids=new Set(),items=[];
  for(const item of raw.items){
    if(!item||!sources.has(item.sourceId)||seen.has(item.sourceId)||typeof item.id!=='string'||!/^[a-f0-9]{32}$/.test(item.id)||ids.has(item.id)||typeof item.created!=='boolean'||typeof item.stamp!=='string'||!/^[a-f0-9]{16}$/.test(item.stamp))throw new DndError('INVALID_WORDS');
    seen.add(item.sourceId);ids.add(item.id);items.push({sourceId:item.sourceId,id:item.id,created:item.created,stamp:item.stamp});
  }return {version:1,target:raw.target,items,...(raw.selected===true?{selected:true}:{})};
}
export function wordSet(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.words)||!raw.words.length)return null;
  try{
    const ids=new Set(),pairs=new Set(),words=raw.words.map(value=>{
      const fields=wordFields(value),key=wordPairKey(fields);if(!validWordId(value.id)||ids.has(value.id)||pairs.has(key))throw new DndError('INVALID_WORDS');ids.add(value.id);pairs.add(key);return {id:value.id,...fields};
    });
    const next={version:1,name:dndPlainText(raw.name||'Мой набор',1,60),words};
    if(raw.bulk)try{next.bulk=wordBulkReceipt(raw.bulk,words);}catch{/* A damaged undo receipt must not discard words. */}
    return next;
  }catch{return null;}
}
export function wordError(error){
  return ({NO_CHAT:'Открой чат с персонажем или группой.',NO_API:'Эта версия Таверны не предоставляет генерацию для расширений.',OFFLINE:'Подключи модель в настройках Таверны.',BUSY:'Дождись завершения текущей генерации.',STALE:'Чат или история изменились. Набор не заменён; попробуй снова.',CLOSED:'Расширение было закрыто.',GENERATION:'Не удалось получить слова. Можно попробовать ещё раз.',INVALID_WORDS:'Не удалось прочитать полный набор слов с переводами. Попробуй уменьшить количество или повторить генерацию.',WORD_COUNT:'Количество слов в ответе не совпало с пресетом. Прежний набор сохранён; попробуй повторить генерацию.',DEMO_WORD_COUNT:'В предпросмотре доступны 48 готовых слов. Генерация своего количества работает внутри Таверны.',INVALID_TABLE:'Заполни слово и перевод. Название сборника: 1–60 знаков.',WORD_FIELDS:'Заполни слово и перевод.',WORD_EXAMPLE:'Добавь и пример, и его перевод — либо оставь оба поля пустыми.',REPEATED_WORD:'В ответе повторяются английские слова. Попробуй ещё раз.',UNSAFE_TEXT:'Используй обычный текст без разметки, ссылок и макросов.',PRESET:'Пресет: 1–6000 знаков, без макросов в двойных фигурных скобках.',RANDOM:'Не удалось создать идентификатор. Попробуй ещё раз.',LIBRARY_CARD:'Слово не найдено. Открой список заново.',LIBRARY_COLLECTION:'Сборник не найден. Выбери другой.',LIBRARY_DUPLICATE:'Эта пара «слово — перевод» уже сохранена.',LIBRARY_NAME:'Название должно отличаться от других сборников.',EMPTY_WORDS:'Добавь хотя бы одно слово в сборник.'})[error?.code]||'Не удалось сохранить изменения. Попробуй ещё раз.';
}

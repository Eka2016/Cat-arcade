import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLECTION_FILE_FORMAT,COLLECTION_FILE_LIMIT,collectionTransferChoices,makeCollectionTransfer,parseCollectionTransfer,stringifyCollectionTransfer,validateCollectionTransfer,mergeCollectionTransfer,collectionTransferError} from '../collection-transfer.js';

const id=n=>n.toString(16).padStart(32,'0'),copy=value=>structuredClone(value);
function random(){let n=200;return{getRandomValues(array){const value=++n;array.fill(0);array[array.length-2]=value>>>8;array[array.length-1]=value&255;return array;}};}
const fields={truth:n=>({kind:n===2?'dare':'truth',text:['','Какой вечер тебе запомнился?','Придумай имя для совы.','Что тебя радует?'][n]}),words:n=>({en:['','lantern','owl','rain'][n],ru:['','фонарь','сова','дождь'][n],example:n===1?'A warm lantern.':'',translation:n===1?'Тёплый фонарь.':''}),dnd:n=>({roll:n,title:`Событие ${n}`,event:`В лесу открывается новая тропа номер ${n}.`})};
function library(game){return{version:1,...(game==='words'?{topicsVersion:1}:{}),collections:[{id:id(1),name:'Лес'},{id:id(2),name:'Вечер'},{id:id(3),name:'Пустой'}],cards:[{id:id(11),...fields[game](1),favorite:true,collections:[id(1),id(2)]},{id:id(12),...fields[game](2),favorite:false,collections:[id(1)]},{id:id(13),...fields[game](3),favorite:false,collections:[]}]};}
const chooseAll=(game,raw)=>collectionTransferChoices(game,raw).map(c=>c.id);
const encode=(game,raw,ids=chooseAll(game,raw))=>parseCollectionTransfer(stringifyCollectionTransfer(makeCollectionTransfer(game,raw,ids)),game);
const checkCode=(code,fn)=>assert.throws(fn,error=>error.code===code);

for(const game of ['truth','words','dnd']){
 test(`${game}: full round trip preserves cards, favorites, shared memberships, empty collection and ungrouped cards`,()=>{
  const source=library(game),snapshot=copy(source),pack=encode(game,source),out=mergeCollectionTransfer(game,null,pack,pack.collections.map(c=>c.id),random());
  assert.deepEqual(source,snapshot);assert.equal(out.library.cards.length,3);assert.equal(out.library.collections.length,3);assert.equal(out.stats.cardsAdded,3);
  const names=new Map(out.library.collections.map(c=>[c.id,c.name])),first=out.library.cards[0];assert.equal(first.favorite,true);assert.deepEqual(first.collections.map(k=>names.get(k)),['Лес','Вечер']);assert.deepEqual(out.library.cards[2].collections,[]);assert.equal(out.library.cards[2].favorite,false);
  assert.ok(out.library.cards.every(c=>!source.cards.some(old=>old.id===c.id)));assert.equal(out.library.collections.find(c=>c.name==='Пустой')!==undefined,true);
 });
 test(`${game}: exporting and importing one collection excludes all other memberships and favorites`,()=>{
  const raw=library(game),pack=encode(game,raw,[id(1)]);assert.deepEqual(pack.collections,[{id:id(1),name:'Лес'}]);assert.equal(pack.cards.length,2);assert.ok(pack.cards.every(c=>c.collections.length===1&&c.collections[0]===id(1)));
  const out=mergeCollectionTransfer(game,null,pack,[id(1)],random());assert.equal(out.library.cards.some(c=>c.favorite),false);assert.equal(out.library.collections.length,1);
 });
 test(`${game}: repeated import adds no duplicate cards or groups and keeps all current IDs`,()=>{
  const source=library(game),pack=encode(game,source),ids=pack.collections.map(c=>c.id),out=mergeCollectionTransfer(game,source,pack,ids,random());assert.equal(out.stats.collectionsAdded,0);assert.equal(out.stats.cardsAdded,0);assert.equal(out.stats.cardsReused,3);assert.deepEqual(out.library,source);
 });
 test(`${game}: selecting only favorites or ungrouped at preview does not import other collections`,()=>{
  const pack=encode(game,library(game)),fav=mergeCollectionTransfer(game,null,pack,['favorites'],random()).library,free=mergeCollectionTransfer(game,null,pack,['ungrouped'],random()).library;
  assert.equal(fav.collections.length,0);assert.equal(fav.cards.length,1);assert.equal(fav.cards[0].favorite,true);assert.equal(free.cards.length,1);assert.equal(free.cards[0].favorite,false);assert.deepEqual(free.cards[0].collections,[]);
 });
 test(`${game}: source ID collisions cannot overwrite local groups or card data`,()=>{
  const source=library(game),target=library(game);target.collections[0].name='Другая коллекция';const pack=encode(game,source,[id(1)]),before=copy(target),out=mergeCollectionTransfer(game,target,pack,[id(1)],random());
  assert.deepEqual(target,before);assert.equal(out.library.collections.length,4);assert.equal(out.library.collections.find(c=>c.id===id(1)).name,'Другая коллекция');assert.equal(out.stats.cardsAdded,0);assert.equal(out.stats.collectionsAdded,1);assert.equal(out.library.cards[0].collections.length,3);
 });
 test(`${game}: authored card length has no generated-card limit during transfer`,()=>{
  const raw=library(game);if(game==='truth')raw.cards[0].text='Очень длинная история. '.repeat(600).trim();else if(game==='words'){raw.cards[0].en='A very long expression '.repeat(100).trim();raw.cards[0].ru='Длинное выражение '.repeat(100).trim();}else raw.cards[0].event='Событие продолжается. '.repeat(600).trim();
  const pack=encode(game,raw),out=mergeCollectionTransfer(game,null,pack,pack.collections.map(c=>c.id),random());assert.equal(out.library.cards.length,3);for(const [key,value]of Object.entries(fields[game](1)))if(typeof value==='string')assert.equal(out.library.cards[0][key],raw.cards[0][key]);
 });
}
test('Files contain only selected card fields; no chat, preset, private settings or source metadata',()=>{
 const raw={...library('dnd'),chat:'SECRET_CHAT',apiKey:'SECRET_API',preset:'SECRET_PRESET'};raw.cards[0].privateContext='SECRET_CONTEXT';const text=stringifyCollectionTransfer(makeCollectionTransfer('dnd',raw,[id(1)]));assert.equal(/SECRET|Вечер|Пустой|privateContext|apiKey|preset|sceneStamp/.test(text),false);
});
test('English matching keeps local examples and unions memberships without overwriting them',()=>{
 const target=library('words'),source=library('words');source.cards[0].en='LANTERN';source.cards[0].example='Another lantern.';source.cards[0].translation='Другой фонарь.';source.collections[0].name='Новые слова';const out=mergeCollectionTransfer('words',target,encode('words',source,[id(1)]),[id(1)],random());assert.equal(out.library.cards[0].example,'A warm lantern.');assert.equal(out.library.cards[0].en,'lantern');assert.equal(out.library.cards[0].collections.length,3);
});
test('Duplicate incoming names and cards merge by content with all selected links',()=>{
 const pack=encode('truth',library('truth'));pack.collections.find(c=>c.id===id(2)).name='ЛЕС';pack.cards.push({...copy(pack.cards[0]),text:'КАКОЙ вечер тебе запомнился!',collections:[id(2)]});const validated=validateCollectionTransfer(pack,'truth');assert.equal(validated.cards.length,3);const out=mergeCollectionTransfer('truth',null,validated,validated.collections.map(c=>c.id),random());assert.equal(out.library.collections.length,2);assert.equal(out.library.cards[0].collections.length,1);
});
test('Truth/dare type conflicts abort the complete merge without mutating old data',()=>{
 const source=library('truth'),target=library('truth');target.cards[0].kind='dare';const before=copy(target),pack=encode('truth',source);checkCode('CONFLICT',()=>mergeCollectionTransfer('truth',target,pack,pack.collections.map(c=>c.id),random()));assert.deepEqual(target,before);
 pack.cards.push({...copy(pack.cards[0]),kind:'dare'});checkCode('CONFLICT',()=>validateCollectionTransfer(pack));
});
test('Invalid formats, newer versions, another game, malformed references and unsafe card fields fail before saving',()=>{
 const valid=encode('dnd',library('dnd'));for(const value of [null,[],{}, {...valid,format:'other'}, {...valid,version:2},{...valid,game:'constructor'}, {...valid,game:{}},{...valid,collections:[]}])checkCode('FORMAT',()=>validateCollectionTransfer(value));
 checkCode('GAME',()=>parseCollectionTransfer(JSON.stringify(valid),'words'));checkCode('FORMAT',()=>parseCollectionTransfer('{broken'));
 for(const change of [p=>p.collections.push(copy(p.collections[0])),p=>p.cards[0].collections.push('unknown'),p=>p.cards[0].collections=[],p=>p.cards[0].roll=21,p=>p.cards[0].event='<script>bad</script>',p=>p.collections[0].name='{{secret}}']){const p=copy(valid);change(p);checkCode('CONTENT',()=>validateCollectionTransfer(p));}
 assert.ok(collectionTransferError({code:'GAME',game:'dnd'}).includes('ДНД'));
});
test('BOM is accepted; unknown properties and prototype-looking names stay inert',()=>{
 const pack=encode('words',library('words'));pack.collections.find(c=>c.id===id(1)).name='__proto__';const raw=JSON.stringify(pack).replace('"format":','"__proto__":{"polluted":true},"format":');const parsed=parseCollectionTransfer('\uFEFF'+raw,'words'),out=mergeCollectionTransfer('words',null,parsed,[id(1)],random());assert.equal(Object.prototype.polluted,undefined);assert.equal(out.library.collections[0].name,'__proto__');assert.equal(Object.hasOwn(parsed,'__proto__'),false);
});
test('Empty selection, random failure and a too-large file leave the destination unchanged',()=>{
 const target=library('truth'),before=copy(target),pack=encode('truth',target);checkCode('SELECTION',()=>makeCollectionTransfer('truth',target,[]));checkCode('SELECTION',()=>mergeCollectionTransfer('truth',target,pack,['missing'],random()));
 checkCode('RANDOM',()=>mergeCollectionTransfer('truth',null,pack,[id(1)],{getRandomValues(){throw Error('secret internal error');}}));assert.deepEqual(target,before);checkCode('SIZE',()=>parseCollectionTransfer(' '.repeat(COLLECTION_FILE_LIMIT+1)));
});
test('Thousands of cards transfer without imposing a library card count limit',()=>{
 const raw={version:1,cards:[],collections:[{id:id(1),name:'Большой сборник'}]};for(let i=0;i<3500;i++)raw.cards.push({id:id(i+10),kind:'truth',text:`История номер ${i}.`,favorite:false,collections:[id(1)]});const pack=encode('truth',raw,[id(1)]),out=mergeCollectionTransfer('truth',null,pack,[id(1)],random());assert.equal(out.library.cards.length,3500);
});

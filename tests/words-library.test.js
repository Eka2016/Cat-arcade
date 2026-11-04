import test from 'node:test';
import assert from 'node:assert/strict';
import {WORD_PRESET,WORD_RESPONSE_TEXT_LIMIT,wordPrompt,wordPreset,wordFields,validateWordPack,wordSet,wordPairKey,wordError,wordGenerationCount,wordResponseLength} from '../words-content.js';
import {sanitizeWordLibrary,seedWordTopics,saveWordCollection,saveWordLibraryCard,wordCollectionSet,filterWordCards,organizeWordLibraryCards,deleteWordLibraryCards,deleteWordCollection,toggleWordFavorite,addWordsToCollection,undoWordsCollection} from '../words-library.js';
import {WordGame,WORDS,wordProgressId,sanitizeWordProgress,sanitizeWordRoundSize} from '../words.js';
import {sanitizeSettings} from '../arcade.js';
import {createDemoStoryBridge} from '../dnd-demo.js';
const empty=()=>sanitizeWordLibrary(null),word=(en='lantern',ru='фонарь')=>({en,ru,example:'A small lantern.',translation:'Маленький фонарь.'});
const row=(en='lantern',ru='фонарь',id='f'.repeat(32))=>({id,...word(en,ru)});
const fakeCrypto=()=>{let n=1;return {getRandomValues(a){a.fill(0);a[a.length-1]=n++;return a;}};};
function fixture(){const crypto=fakeCrypto();let l=saveWordCollection(empty(),{name:'Лес'},crypto);l=saveWordCollection(l,{name:'Дорога'},crypto);return {l,crypto,a:l.collections[0].id,b:l.collections[1].id};}
const error=(fn,code)=>assert.throws(fn,e=>e.code===code);
test('English preset and generation validate exact word fields, unique English and bounded responses',()=>{
 assert.equal(wordPreset(null),WORD_PRESET);assert.match(wordPrompt('Пять слов B1, город.'),/Пять слов B1, город\.[\s\S]*PAW_ENGLISH_WORDS/);error(()=>wordPrompt('{{secret}}'),'PRESET');
 const words=validateWordPack(JSON.stringify({words:[word(),word('bark','кора')]}),fakeCrypto());assert.equal(words.length,2);assert.notEqual(words[0].id,words[1].id);assert.deepEqual(wordFields(words[0]),word());
 error(()=>validateWordPack({words:[]}),'INVALID_WORDS');
 error(()=>validateWordPack({words:[word(),word('LANTERN','лампа')]}),'REPEATED_WORD');error(()=>validateWordPack({words:[word('<script>','скрипт')]}),'UNSAFE_TEXT');error(()=>validateWordPack({words:[word('a'.repeat(101),'слово')]}),'INVALID_WORDS');
 error(()=>validateWordPack({words:[{en:'a',ru:'б',example:'one'}]}),'INVALID_WORDS');error(()=>validateWordPack('x'.repeat(WORD_RESPONSE_TEXT_LIMIT+1)),'INVALID_WORDS');assert.ok(!wordError(Error('PRIVATE_PROVIDER_SECRET')).includes('PRIVATE_PROVIDER'));
});
test('English generation accepts the preset count above twenty without truncating a valid response',()=>{
 const raw={words:Array.from({length:120},(_,i)=>({...word('phrase '+i,'перевод '+i),example:'A useful example. '.repeat(12),translation:'Пример перевода. '.repeat(12)}))};
 const json=JSON.stringify(raw);assert.ok(json.length>45000);const result=validateWordPack(json,fakeCrypto());assert.equal(result.length,120);assert.equal(result.at(-1).en,'phrase 119');assert.equal(new Set(result.map(w=>w.id)).size,120);
 for(const [preset,count] of [['30 английских слов A1–A2',30],['Подготовь 75 новых английских слов B1',75],['Количество слов: 100',100],['Generate 40 English words at B2 level.',40],['Word count = 25',25],['Тема: 1984 год, уровень A2. Дай 12 слов.',12],['Пять слов B1, город.',null],['50 слов: 20 слов лес и 30 слов город',null],['Лес, A1–A2',null]])assert.equal(wordGenerationCount(preset),count,preset);
 assert.equal(wordResponseLength(WORD_PRESET),3600);assert.equal(wordResponseLength('Лес и природа, A1–A2'),3600);assert.equal(wordResponseLength('30 слов'),5400);assert.equal(wordResponseLength('100 слов'),18000);assert.equal(wordResponseLength('1000000 слов'),65536);assert.ok(!wordPrompt('35 слов').includes('1–20'));
});
test('English round size can be one, more than ten or the whole pool, and persists across new packs and directions',()=>{
 const words=Array.from({length:35},(_,i)=>row('term '+i,'перевод '+i,(i+1).toString(16).padStart(32,'0'))),game=new WordGame({words,roundSize:25,random:()=>.4});
 assert.equal(game.total,25);assert.equal(new Set([game.word.id,...game.queue]).size,25);
 game.start({size:1});assert.equal(game.total,1);game.answer(game.options.findIndex(o=>o.id!==game.word.id));assert.equal(game.queue.length,1);game.next();game.answer(game.options.findIndex(o=>o.id===game.word.id));game.next();assert.equal(game.phase,'finished');assert.equal(game.firstCorrect,0);
 game.start({size:'all',mode:'ru-en'});assert.equal(game.total,35);assert.equal(game.mode,'ru-en');game.setWords(words.slice(0,4));assert.equal(game.total,4);assert.equal(game.roundSize,'all');
 game.start({size:50});assert.equal(game.total,4);assert.equal(game.roundSize,50);assert.equal(new WordGame({words}).total,10);
 for(const invalid of [0,-1,2.5,Infinity,NaN,'25',null,{},Number.MAX_SAFE_INTEGER+1])assert.equal(sanitizeWordRoundSize(invalid),10);
 for(const size of [1,25,'all'])assert.equal(sanitizeSettings({wordRoundSize:size}).wordRoundSize,size);assert.equal(sanitizeSettings({wordRoundSize:0}).wordRoundSize,10);
});
test('The offline English sample honors an explicit supported count and clearly rejects unavailable samples',async()=>{
 const demo=createDemoStoryBridge();
 for(const count of [1,30,48]){const raw=await demo.generate(demo.capture(),wordPrompt(`${count} английских слов`));assert.equal(validateWordPack(raw).length,count);}
 await assert.rejects(demo.generate(demo.capture(),wordPrompt('100 слов')),e=>e.code==='DEMO_WORD_COUNT');
});
test('Own English words have no character count cap, optional examples stay paired and sets reject damaged identities',()=>{
 const own=wordFields({en:'x'.repeat(2000),ru:'я'.repeat(3000)});assert.equal(own.en.length,2000);assert.equal(own.example,'');
 error(()=>wordFields({en:'',ru:'текст'}),'INVALID_TABLE');error(()=>wordFields({en:'x',ru:'я',translation:'только перевод'}),'WORD_EXAMPLE');
 assert.equal(wordSet({version:1,words:[row(),row('different','другое')]}),null);assert.equal(wordSet({version:1,words:[row(),row('LANTERN','ФОНАРЬ','e'.repeat(32))]}),null);
 assert.equal(wordSet({version:1,name:'Набор',words:[row()],bulk:{corrupt:true}}).words.length,1);
});
test('Word library is independent, deduplicates pairs and preserves orphans after deleting collections',()=>{
 let {l,crypto,a,b}=fixture();l=saveWordLibraryCard(l,{...word(),favorite:true,collections:[a,b]},crypto);const before=structuredClone(l);
 error(()=>saveWordLibraryCard(l,{...word('LANTERN','ФОНАРЬ'),favorite:false,collections:[]},crypto),'LIBRARY_DUPLICATE');assert.deepEqual(l,before);
 l=saveWordLibraryCard(l,{...word('lantern','светильник'),favorite:false,collections:[a]},crypto);assert.equal(l.cards.length,2);
 l=deleteWordCollection(l,a);assert.equal(l.cards.length,2);assert.deepEqual(l.cards[0].collections,[b]);assert.equal(l.cards[0].favorite,true);assert.deepEqual(l.cards[1].collections,[]);
 const clean=sanitizeWordLibrary({...l,cards:[...l.cards,{...l.cards[0],id:'bad'}, {...l.cards[0],id:'d'.repeat(32)}]});assert.equal(clean.cards.length,2);assert.equal(wordCollectionSet(l,'all').words.length,2);error(()=>wordCollectionSet(empty(),'favorites'),'EMPTY_WORDS');
});
test('Word search covers EN, RU and examples, combined collection filters and ungrouped words',()=>{
 let {l,crypto,a,b}=fixture();l=saveWordLibraryCard(l,{...word(),favorite:true,collections:[a]},crypto);l=saveWordLibraryCard(l,{...word('fern','папоротник'),favorite:false,collections:[b]},crypto);l=saveWordLibraryCard(l,{...word('hedgehog','ёж'),favorite:false,collections:[]},crypto);
 assert.equal(filterWordCards(l,{query:'ЕЖ'}).length,1);assert.equal(filterWordCards(l,{query:'LANTERN'}).length,3,'Example text is searchable too');assert.equal(filterWordCards(l,{groups:['ungrouped']})[0].en,'hedgehog');assert.equal(filterWordCards(l,{groups:[a,b]}).length,2);assert.equal(filterWordCards(l,{collection:b,query:'ёж'}).length,0);assert.equal(filterWordCards(l,{groups:['favorites']}).length,1);
});
test('Word batch move, scoped deletion and star never delete another collection membership',()=>{
 let {l,crypto,a,b}=fixture();l=saveWordLibraryCard(l,{...word(),favorite:true,collections:[a,b]},crypto);const id=l.cards[0].id;
 let next=deleteWordLibraryCards(l,[id],a);assert.deepEqual(next.cards[0].collections,[b]);assert.equal(next.cards[0].favorite,true);
 next=deleteWordLibraryCards(next,[id],'favorites');assert.equal(next.cards[0].favorite,false);assert.equal(next.cards.length,1);
 next=organizeWordLibraryCards(next,[id],a,{source:b,move:true});assert.deepEqual(next.cards[0].collections,[a]);
 next=toggleWordFavorite(next,next.cards[0],crypto);assert.equal(next.cards[0].favorite,true);assert.equal(deleteWordLibraryCards(next,[id],'all').cards.length,0);assert.equal(l.cards.length,1);
 error(()=>organizeWordLibraryCards(next,[id],b,{source:'all',move:true}),'LIBRARY_COLLECTION');error(()=>deleteWordLibraryCards(next,[id],b),'LIBRARY_CARD');
});
test('Word add-all receipts undo only the intended membership, preserve later changes and validate source IDs',()=>{
 let {l,crypto,a,b}=fixture();const words=[row(),row('fern','папоротник','e'.repeat(32))];l=saveWordLibraryCard(l,{...word(),favorite:true,collections:[]},crypto);
 const {library,receipt}=addWordsToCollection(l,words,a,crypto);assert.equal(receipt.items.length,2);let undone=undoWordsCollection(library,words,receipt);assert.equal(undone.cards.length,1);assert.equal(undone.cards[0].favorite,true);assert.deepEqual(undone.cards[0].collections,[]);
 const added=organizeWordLibraryCards(library,[library.cards[1].id],b);undone=undoWordsCollection(added,words,receipt);assert.equal(undone.cards.length,2);assert.deepEqual(undone.cards[1].collections,[b]);
 const edited=saveWordLibraryCard(library,{...library.cards[1],ru:'папоротник лесной'},crypto);undone=undoWordsCollection(edited,words,receipt);assert.ok(undone.cards[1].collections.includes(a));
 assert.deepEqual(undoWordsCollection(undone,words,receipt),undone);const selected=addWordsToCollection(l,words,'favorites',crypto,[words[1].id]);assert.equal(selected.receipt.selected,true);assert.equal(selected.receipt.items.length,1);
 const set=wordSet({version:1,name:'Лес',words,bulk:receipt});assert.deepEqual(set.bulk,receipt);assert.equal(wordSet({...set,bulk:{...receipt,items:[{...receipt.items[0],sourceId:'unknown'}]}}).bulk,undefined);
});
test('Collections support thousands of custom words without an artificial item limit',()=>{
 const raw={version:1,collections:[{id:'a'.repeat(32),name:'Большой словарь'}],cards:Array.from({length:2400},(_,i)=>({id:(i+1).toString(16).padStart(32,'0'),en:'word '+i,ru:'слово '+i,example:'',translation:'',favorite:i%2===0,collections:['a'.repeat(32)]}))};
 const library=sanitizeWordLibrary(raw);assert.equal(library.cards.length,2400);assert.equal(wordCollectionSet(library,'all').words.length,2400);
});
test('English single-word and repeated translations still offer four distinct choices in both directions',()=>{
 for(const mode of ['en-ru','ru-en']){const game=new WordGame({words:[row(),row('torch','фонарь','e'.repeat(32))],random:()=>.4});game.start({mode});assert.equal(game.options.length,4);assert.equal(new Set(game.options.map(o=>o.text.toLowerCase())).size,4);assert.ok(game.options.some(o=>o.id===game.word.id));}
 const game=new WordGame({words:[row()],random:()=>.4});assert.equal(game.total,1);assert.equal(game.options.length,4);const wrong=game.options.findIndex(o=>o.id!==game.word.id);game.answer(wrong);game.next();game.answer(game.options.findIndex(o=>o.id===game.word.id));game.next();assert.equal(game.phase,'finished');assert.equal(game.firstCorrect,0);
});
test('English mastery follows the word pair across set copies; old progress remains compatible',()=>{
 const word1=row(),word2=row('LANTERN','ФОНАРЬ','e'.repeat(32)),id=wordProgressId(word1);assert.equal(wordProgressId(word2),id);assert.equal(wordProgressId({...word1,ru:'светильник'})===id,false);
 const game=new WordGame({words:[word1]});for(let i=0;i<3;i++){game.start();game.answer(game.options.findIndex(o=>o.id===word1.id));game.next();}assert.equal(game.learned,1);
 const progress=sanitizeWordProgress({...game.progress,cat:{correct:2,wrong:1,streak:2},bad:{correct:8}});assert.equal(new WordGame({words:[word2],progress}).learned,1);assert.equal(progress.cat.correct,2);assert.equal(progress.bad,undefined);assert.equal(wordProgressId(WORDS.find(w=>w.id==='cat')),'cat');
});
test('Former English topics migrate once to three editable collections with all 48 original words',()=>{
 const library=seedWordTopics(null);assert.equal(library.topicsVersion,1);assert.deepEqual(library.collections.map(c=>c.name),['Базовые','Лес и природа','Таверна']);assert.equal(library.cards.length,48);
 assert.equal(new Set([...library.collections,...library.cards].map(v=>v.id)).size,51);assert.ok([...library.collections,...library.cards].every(v=>/^[a-f0-9]{32}$/.test(v.id)));
 for(const [i,topic] of ['basics','forest','tavern'].entries()){const set=wordCollectionSet(library,library.collections[i].id);assert.equal(set.words.length,16);assert.deepEqual(set.words.map(wordPairKey),WORDS.filter(w=>w.topic===topic).map(wordPairKey));assert.equal(wordProgressId(set.words[0]),WORDS.find(w=>w.topic===topic).id);}
 assert.deepEqual(seedWordTopics(library),library);assert.deepEqual(seedWordTopics(null),library,'First migration uses stable local identifiers without random generation');
});
test('Topic migration preserves existing words, favorites, examples and collection/name/ID collisions',()=>{
 const collectionId='7061772d656e676c6973682d00000001',cardId='f'.repeat(32),original={version:1,collections:[{id:collectionId,name:'БАЗОВЫЕ'}],cards:[{id:cardId,en:'cat',ru:'кот',example:'My own example.',translation:'Мой собственный пример.',favorite:true,collections:[collectionId]}]},before=structuredClone(original);
 const library=seedWordTopics(original),card=library.cards.find(c=>c.id===cardId);assert.deepEqual(original,before);assert.equal(library.cards.length,48);assert.equal(library.collections.length,4);assert.deepEqual(library.collections[0],original.collections[0]);assert.equal(new Set(library.collections.map(c=>c.name.toLowerCase())).size,4);
 assert.equal(card.example,'My own example.');assert.equal(card.translation,'Мой собственный пример.');assert.equal(card.favorite,true);assert.ok(card.collections.includes(collectionId));assert.equal(card.collections.length,2);assert.equal(new Set([...library.collections,...library.cards].map(v=>v.id)).size,52);
});
test('Deleting or editing the migrated collections stays effective after all normal saves and remount migration',()=>{
 let library=seedWordTopics(null);const id=library.collections[0].id,ids=wordCollectionSet(library,id).words.map(w=>w.id);
 library=saveWordCollection(library,{id,name:'Мои базовые'});assert.equal(library.topicsVersion,1);library=deleteWordCollection(library,id);library=deleteWordLibraryCards(library,ids,'all');
 assert.equal(library.cards.length,32);assert.equal(library.collections.length,2);assert.deepEqual(seedWordTopics(sanitizeWordLibrary(library)),library);assert.deepEqual(sanitizeSettings({wordLibrary:library}).wordLibrary,library);
 library=toggleWordFavorite(library,library.cards[0]);assert.equal(library.topicsVersion,1);const source=[row()],result=addWordsToCollection(library,source,'favorites');library=undoWordsCollection(result.library,source,result.receipt);assert.equal(library.topicsVersion,1);assert.equal(seedWordTopics(library).collections.length,2);
});
test('Removing the topic chooser keeps a saved generated set, old topic-only sessions and prior mastery',()=>{
 const saved={version:1,name:'Свои слова',words:[row()]},settings=sanitizeSettings({wordLibrary:empty(),wordSet:saved,wordSource:'forest',wordMode:'ru-en',wordProgress:{cat:{correct:3,wrong:1,streak:2}},truthLibrary:{version:1,cards:[],collections:[]}});
 assert.deepEqual(settings.wordSet,saved);assert.equal(settings.wordSource,'current');assert.equal(settings.wordMode,'ru-en');assert.deepEqual(settings.wordProgress.cat,{correct:3,wrong:1,streak:2});assert.equal(settings.wordLibrary.cards.length,48);assert.deepEqual(sanitizeSettings(settings),settings);
 for(const topic of ['all','basics','forest','tavern'])assert.equal(sanitizeSettings({wordSource:topic}).wordSource,topic);assert.equal(sanitizeSettings({wordSource:'current'}).wordSource,'all');
});

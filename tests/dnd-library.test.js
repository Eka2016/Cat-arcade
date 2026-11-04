import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSettings} from '../arcade.js';
import {dndSavedEvent,sanitizeDndRound,dndChatText,validateDndTable} from '../dnd.js';
import {sanitizeDndLibrary,saveDndCollection,saveDndLibraryCard,toggleDndFavorite,addDndEventsToCollection,undoDndEventsCollection,dndCollectionCards,dndCollectionCoverage,dndCollectionTable,deleteDndLibraryCards,deleteDndCollection,organizeDndLibraryCards,filterDndCards} from '../dnd-library.js';
const empty=()=>({version:1,cards:[],collections:[]});
function crypto(){let id=0;return{getRandomValues(a){if(a.BYTES_PER_ELEMENT===1){id++;for(let i=0;i<a.length;i++)a[i]=id>>((i%4)*8)&255;}else a.fill(0);return a;}};}
const events=()=>Array.from({length:20},(_,i)=>({roll:i+1,title:`Событие ${i+1}`,event:`Своеобразное сюжетное развитие ${i+1}, которое относится к текущей истории персонажей.`}));
const group=(library,source,name)=>{const next=saveDndCollection(library,{name},source);return[next,next.collections.at(-1).id];};
test('DND library stores distinct ranked events, normalizes duplicates and rejects unsafe text without imposing custom text-length caps',()=>{
 const c=crypto();let [library,id]=group(empty(),c,'Лес');library=saveDndLibraryCard(library,{roll:7,title:'Ёлка',event:'Длинная история '.repeat(700),favorite:true,collections:[id]},c);
 assert.equal(library.cards[0].roll,7);assert.ok(library.cards[0].event.length>600);assert.throws(()=>saveDndLibraryCard(library,{roll:7,title:' елка ',event:library.cards[0].event.toUpperCase(),favorite:false,collections:[]},c),{code:'LIBRARY_DUPLICATE'});
 assert.throws(()=>saveDndLibraryCard(library,{roll:21,title:'Тест',event:'Текст',favorite:false,collections:[]},c),{code:'DND_FIELDS'});assert.throws(()=>saveDndLibraryCard(library,{roll:1,title:'Тест',event:'<script>bad</script>',favorite:false,collections:[]},c),{code:'UNSAFE_TEXT'});
 const raw=structuredClone(library);raw.cards.push({...raw.cards[0],id:'f'.repeat(32)});raw.cards[0].collections.push('a'.repeat(32));assert.equal(sanitizeDndLibrary(raw).cards.length,1);assert.deepEqual(sanitizeDndLibrary(raw).cards[0].collections,[id]);
});
test('Saving all twenty events deduplicates entries, retains favorites and memberships, and supports selected ranks',()=>{
 const c=crypto();let [library,id]=group(empty(),c,'Приключение');library=toggleDndFavorite(library,events()[0],c);const original=library.cards[0].id;
 const added=addDndEventsToCollection(library,events(),id,c);assert.equal(added.library.cards.length,20);assert.equal(added.library.cards[0].id,original);assert.equal(added.library.cards[0].favorite,true);assert.equal(added.receipt.items.length,20);
 const repeated=addDndEventsToCollection(added.library,events(),id,c);assert.equal(repeated.library.cards.length,20);assert.equal(repeated.receipt.items.length,0);
 const partial=addDndEventsToCollection(library,events(),id,c,[3,10,20]);assert.deepEqual(dndCollectionCards(partial.library,id).map(e=>e.roll),[3,10,20]);assert.equal(partial.receipt.selected,true);
});
test('Collection loading preserves d20 severity and requires coverage of all twenty faces for fair random rolls',()=>{
 const c=crypto();let [library,id]=group(empty(),c,'Полная таблица');library=addDndEventsToCollection(library,events(),id,c).library;
 library=saveDndLibraryCard(library,{roll:1,title:'Другая неприятность',event:'Второй вариант для той же единицы.',favorite:false,collections:[id]},c);assert.deepEqual(dndCollectionCoverage(library,id),{count:20,missing:[]});
 const table=dndCollectionTable(library,id,c);assert.deepEqual(table.map(e=>e.roll),Array.from({length:20},(_,i)=>i+1));assert.ok(table.every(e=>e.custom));assert.equal(table[0].roll,1);
 const incomplete=deleteDndLibraryCards(library,library.cards.filter(e=>e.roll===20).map(e=>e.id),id);assert.deepEqual(dndCollectionCoverage(incomplete,id).missing,[20]);assert.throws(()=>dndCollectionTable(incomplete,id,c),{code:'DND_COLLECTION_INCOMPLETE'});
});
test('Scoped deletion and moves affect only the chosen collection; deleting a collection preserves its events',()=>{
 const c=crypto();let [library,a]=group(empty(),c,'Первый'),b;[library,b]=group(library,c,'Второй');library=addDndEventsToCollection(library,events(),a,c,[7]).library;library=organizeDndLibraryCards(library,[library.cards[0].id],b);library=toggleDndFavorite(library,library.cards[0],c);const id=library.cards[0].id;
 const removed=deleteDndLibraryCards(library,[id],a);assert.deepEqual(removed.cards[0].collections,[b]);assert.equal(removed.cards[0].favorite,true);
 const moved=organizeDndLibraryCards(library,[id],b,{source:a,move:true});assert.deepEqual(moved.cards[0].collections,[b]);assert.equal(deleteDndCollection(moved,b).cards.length,1);assert.equal(deleteDndLibraryCards(moved,[id],'all').cards.length,0);
});
test('Undoing bulk saves preserves preexisting events, later edits and memberships in other collections',()=>{
 const c=crypto();let [library,a]=group(empty(),c,'Сюжет'),b;[library,b]=group(library,c,'Другие');library=toggleDndFavorite(library,events()[0],c);const added=addDndEventsToCollection(library,events(),a,c);const second=added.library.cards.find(e=>e.roll===2);
 let changed=organizeDndLibraryCards(added.library,[second.id],b);const third=changed.cards.find(e=>e.roll===3);changed=saveDndLibraryCard(changed,{...third,event:'Поздняя правка события'},c);
 const undone=undoDndEventsCollection(changed,events(),added.receipt);assert.equal(undone.cards.length,3);assert.equal(undone.cards.find(e=>e.roll===1).favorite,true);assert.deepEqual(undone.cards.find(e=>e.roll===2).collections,[b]);assert.equal(undone.cards.find(e=>e.roll===3).event,'Поздняя правка события');
});
test('A manual saved event and complete custom table survive per-chat round serialization without relaxing generated-table validation',()=>{
 const event=dndSavedEvent({roll:7,title:'К',event:'Текст '.repeat(300)}),id='c'.repeat(32),raw={version:2,table:[event],source:{type:'collection',id:'event',name:'Сохранённое событие'},selectedRoll:7,rollId:id,choices:{7:{id,applied:false}},applied:false,selectionMode:'manual',sceneStamp:'a'.repeat(16)};
 const round=sanitizeDndRound(JSON.parse(JSON.stringify(raw)));assert.equal(round.table.length,1);assert.equal(round.selectedRoll,7);assert.ok(round.table[0].event.length>600);assert.ok(dndChatText(round.table[0]).includes('7/20'));
 assert.throws(()=>sanitizeDndRound({...raw,selectedRoll:1}),{code:'INVALID_TABLE'});assert.throws(()=>sanitizeDndRound({...raw,selectedRoll:null}),{code:'INVALID_TABLE'});assert.throws(()=>sanitizeDndRound({...raw,source:undefined}),{code:'INVALID_TABLE'});
 assert.throws(()=>validateDndTable(JSON.stringify({events:events().map(e=>({...e,title:'К'}))})),{code:'INVALID_TABLE'});assert.throws(()=>dndChatText({roll:1,title:'К',event:'К'}),{code:'INVALID_TABLE'});
 const full=sanitizeDndRound({...raw,table:events().map(dndSavedEvent)});assert.equal(full.table.length,20);
});
test('Large event libraries remain uncapped and searchable by title, body, rank, collection and ungrouped state',()=>{
 const cards=Array.from({length:900},(_,i)=>({id:(i+1).toString(16).padStart(32,'0'),roll:i%20+1,title:`Событие ${i}`,event:`Деталь истории ${i}`,favorite:false,collections:[]}));const library=sanitizeDndLibrary({version:1,collections:[],cards});assert.equal(library.cards.length,900);assert.equal(filterDndCards(library,{query:'ДЕТАЛЬ ИСТОРИИ 899',groups:['ungrouped']}).length,1);
 const settings=sanitizeSettings({dndLibrary:library,records:{calm:4}});assert.equal(settings.dndLibrary.cards.length,900);assert.equal(settings.records.calm,4);assert.deepEqual(sanitizeSettings({}).dndLibrary,empty());
});

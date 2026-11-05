import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTruthPack,truthRound,truthRounds,truthPrompt,truthPreset,TRUTH_PRESET,nextTruthCard,truthIndex,selectTruthCard,truthChatText,resetTruthRound} from '../truth-dare.js';
const pack={truth:['Какое место тебе хотелось бы посетить?','Каким решением ты гордишься больше всего?'],dare:['Придумай маленький добрый обычай для вашей компании.','Расскажи историю от лица чашки на столе.']};
const fresh=()=>({version:1,pack,used:{truth:[],dare:[]},current:null});
const random=n=>({getRandomValues(a){a.fill(n);return a;}});
test('Truth prompt controls quantity and content without copying a chat transcript',()=>{
 const preset='Нужны 3 правды и 5 действий о путешествиях.';
 assert.ok(truthPrompt(preset).startsWith(preset));assert.match(truthPrompt(preset),/PAW_TRUTH_DARE/);assert.equal(truthPreset(''),TRUTH_PRESET);
 assert.throws(()=>truthPrompt('{{user}}'),{code:'PRESET'});assert.throws(()=>truthPrompt('a'.repeat(6001)),{code:'PRESET'});
});
test('Truth cards validate both bounded decks, plain text and duplicates',()=>{
 assert.deepEqual(validateTruthPack(JSON.stringify(pack)),pack);
 for(const raw of ['{}','not json',JSON.stringify({...pack,dare:[]}),JSON.stringify({...pack,truth:Array(21).fill('Очень длинный вопрос?')}),JSON.stringify({...pack,truth:['<img src=x>']}),JSON.stringify({...pack,dare:['{{run script}}']}),JSON.stringify({...pack,truth:['https://example.com']}),JSON.stringify({...pack,truth:[pack.truth[0],pack.truth[0].toUpperCase()]})])assert.throws(()=>validateTruthPack(raw));
});
test('The fair coin chooses both types and draws unused cards without mutating the saved pack',()=>{
 const saved=fresh(),truth=nextTruthCard(saved,random(0)),truth2=nextTruthCard(truth,random(0));
 assert.deepEqual(saved.used,{truth:[],dare:[]});assert.equal(truth.current.kind,'truth');assert.notEqual(truth.current.index,truth2.current.index);
 const dare=nextTruthCard(truth2,random(0));assert.deepEqual(dare.used.truth,[0,1]);assert.equal(dare.current.kind,'dare');assert.equal(dare.current.index,0);
 const last=nextTruthCard(dare,random(1));assert.equal(last.current.kind,'dare');assert.equal(last.used.dare.length,2);assert.equal(last.used.truth.length,2);
});
test('Cryptographic selection rejects the biased tail rather than reducing it modulo the deck size',()=>{
 let count=0;const source={getRandomValues(a){a[0]=count++?2:4294967295;return a;}};
 assert.equal(truthIndex(3,source),2);assert.equal(count,2);assert.throws(()=>truthIndex(2,{}),{code:'RANDOM'});
});
test('Saved decks restore a selected card and reject forged indices or corrupted text',()=>{
 const saved=nextTruthCard(fresh(),random(1));assert.deepEqual(truthRound(saved),saved);assert.deepEqual(truthRounds({a:saved,b:{}}),{a:saved});
 for(const invalid of [{...saved,used:{truth:[],dare:[20]}},{...saved,current:{kind:'truth',index:1}},{...saved,current:{kind:'truth',index:null}},{...saved,used:{truth:[],dare:[1,1]}}])assert.throws(()=>truthRound(invalid));
});
test('Legacy truth decks migrate without losing the card, order or used indices',()=>{
 const legacy={...fresh(),used:{truth:[1],dare:[0]},current:{kind:'truth',index:1},chat:'PRIVATE_CHAT',key:'PRIVATE_KEY'};
 const saved=truthRound(legacy);assert.equal(saved.version,2);assert.equal(saved.selectionMode,'random');assert.deepEqual(saved.pack,pack);assert.deepEqual(saved.used,legacy.used);assert.deepEqual(saved.current,legacy.current);assert.deepEqual(saved.choices,{truth:{},dare:{}});assert.ok(!JSON.stringify(saved).includes('PRIVATE_'));
});
test('Manual selection preserves send receipts and excludes its card from future coin draws',()=>{
 const first=selectTruthCard(fresh(),'truth',0);first.choices.truth[0]={id:'a'.repeat(32),applied:true};
 const second=selectTruthCard(first,'dare',1),again=selectTruthCard(second,'truth',0),draw=nextTruthCard(again,random(0));
 assert.equal(first.used.dare.length,0);assert.deepEqual(second.current,{kind:'dare',index:1});assert.equal(second.selectionMode,'manual');assert.deepEqual(again.used.truth,[0]);assert.deepEqual(again.choices.truth[0],{id:'a'.repeat(32),applied:true});assert.equal(draw.current.index,1);assert.equal(draw.selectionMode,'random');
 for(const [kind,index] of [['bad',0],['truth',-1],['dare',2],['truth','1']])assert.throws(()=>selectTruthCard(first,kind,index));
});
test('Saved send identifiers are bounded to opened cards and cannot collide across cards',()=>{
 const saved=selectTruthCard(fresh(),'truth',0);saved.choices.truth[0]={id:'b'.repeat(32),applied:false};assert.deepEqual(truthRound(saved),saved);
 for(const mutate of [r=>r.choices.truth[1]={id:'c'.repeat(32),applied:false},r=>r.choices.truth[0].id='invalid',r=>r.choices.truth[0].applied='true',r=>{r.used.dare=[0];r.choices.dare[0]={id:'b'.repeat(32),applied:true};},r=>r.choices.truth=[]]){const raw=structuredClone(saved);mutate(raw);assert.throws(()=>truthRound(raw));}
});
test('Chat text includes only the chosen question or task and distinguishes manual from random',()=>{
 const manual=truthChatText({kind:'truth',text:pack.truth[0],selectionMode:'manual'}),random=truthChatText({kind:'dare',text:pack.dare[1],selectionMode:'random'});
 assert.match(manual,/выбрана вручную/);assert.ok(manual.includes(pack.truth[0]));assert.ok(!manual.includes(pack.truth[1]));assert.match(random,/жетон: действие/);assert.ok(random.includes(pack.dare[1]));
 for(const card of [{kind:'bad',text:pack.truth[0],selectionMode:'manual'},{kind:'truth',text:'<img src=x>',selectionMode:'manual'},{kind:'dare',text:'{{user}}',selectionMode:'random'}])assert.throws(()=>truthChatText(card));
});
test('Replay resets opened cards and send receipts while preserving exactly the same generated deck',()=>{
 let saved=fresh();for(const kind of ['truth','dare'])for(let index=0;index<2;index++)saved=selectTruthCard(saved,kind,index);saved.choices.truth[0]={id:'a'.repeat(32),applied:true};
 const before=structuredClone(saved),reset=resetTruthRound(saved);assert.deepEqual(saved,before);assert.deepEqual(reset.pack,saved.pack);assert.deepEqual(reset.used,{truth:[],dare:[]});assert.deepEqual(reset.choices,{truth:{},dare:{}});assert.equal(reset.current,null);assert.equal(reset.selectionMode,'random');assert.equal(nextTruthCard(reset,random(0)).current.index,0);assert.deepEqual(truthRound(JSON.parse(JSON.stringify(reset))),reset);
});

test('The coin excludes an exhausted or absent pile and keeps both types available while both have cards',()=>{
 assert.equal(nextTruthCard(fresh(),random(0)).current.kind,'truth');assert.equal(nextTruthCard(fresh(),random(1)).current.kind,'dare');
 const expanded={truth:Array.from({length:6},(_,i)=>`Правда номер ${i+1}: какое воспоминание тебе дорого?`),dare:Array.from({length:6},(_,i)=>`Действие номер ${i+1}: придумай добрую традицию.`)};
 for(const empty of ['truth','dare'])for(const value of [0,1]){
  const other=empty==='truth'?'dare':'truth';let round=truthRound({version:1,pack:expanded,used:{[empty]:[0,1,2,3,4,5],[other]:[0]},current:{kind:empty,index:5}});const before=structuredClone(round),seen=new Set();
  for(let n=0;n<5;n++){round=nextTruthCard(round,random(value));assert.equal(round.current.kind,other);assert.ok(Number.isInteger(round.current.index));assert.ok(!seen.has(round.current.index));seen.add(round.current.index);}
  assert.equal(seen.size,5);assert.deepEqual(before.used[other],[0]);assert.deepEqual(round.pack,expanded);
  const missing=truthRound({version:1,pack:{[empty]:[],[other]:expanded[other]},used:{truth:[],dare:[]},current:null});assert.equal(nextTruthCard(missing,random(value)).current.kind,other);
 }
});

import {wordPairKey,wordSearchKey,wordFields} from './words-content.js';

const WORD_ROWS=[
  ['basics','cat','кот','The cat is sleeping.','Кот спит.'],['basics','dog','собака','The dog is friendly.','Собака дружелюбная.'],
  ['basics','house','дом','This is my house.','Это мой дом.'],['basics','book','книга','Open the book.','Открой книгу.'],
  ['basics','window','окно','The window is open.','Окно открыто.'],['basics','door','дверь','Close the door.','Закрой дверь.'],
  ['basics','day','день','It is a warm day.','Сегодня тёплый день.'],['basics','night','ночь','The night is quiet.','Ночь тихая.'],
  ['basics','sun','солнце','The sun is bright.','Солнце яркое.'],['basics','moon','луна','Look at the moon.','Посмотри на луну.'],
  ['basics','food','еда','The food is ready.','Еда готова.'],['basics','water','вода','I need some water.','Мне нужно немного воды.'],
  ['basics','friend','друг','You are my friend.','Ты мой друг.'],['basics','family','семья','My family is here.','Моя семья здесь.'],
  ['basics','happy','счастливый','I am happy today.','Сегодня я счастлив.'],['basics','tired','уставший','He is tired.','Он устал.'],
  ['forest','tree','дерево','The tree is tall.','Дерево высокое.'],['forest','leaf','лист','A leaf falls.','Лист падает.'],
  ['forest','forest','лес','We walk in the forest.','Мы гуляем в лесу.'],['forest','river','река','The river is wide.','Река широкая.'],
  ['forest','lake','озеро','The lake is calm.','Озеро спокойное.'],['forest','stone','камень','This stone is heavy.','Этот камень тяжёлый.'],
  ['forest','flower','цветок','The flower is yellow.','Цветок жёлтый.'],['forest','grass','трава','The grass is soft.','Трава мягкая.'],
  ['forest','bird','птица','A bird is singing.','Птица поёт.'],['forest','fox','лиса','The fox is red.','Лиса рыжая.'],
  ['forest','deer','олень','A deer is near the tree.','Олень рядом с деревом.'],['forest','wolf','волк','The wolf is far away.','Волк далеко.'],
  ['forest','rain','дождь','The rain has stopped.','Дождь закончился.'],['forest','snow','снег','The snow is white.','Снег белый.'],
  ['forest','wind','ветер','The wind is cold.','Ветер холодный.'],['forest','path','тропа','Follow the path.','Иди по тропе.'],
  ['tavern','bread','хлеб','The bread is fresh.','Хлеб свежий.'],['tavern','cheese','сыр','I like cheese.','Мне нравится сыр.'],
  ['tavern','soup','суп','The soup is hot.','Суп горячий.'],['tavern','apple','яблоко','Take an apple.','Возьми яблоко.'],
  ['tavern','milk','молоко','The milk is cold.','Молоко холодное.'],['tavern','tea','чай','Would you like some tea?','Хочешь чаю?'],
  ['tavern','cup','чашка','This cup is empty.','Эта чашка пустая.'],['tavern','plate','тарелка','Put it on the plate.','Положи это на тарелку.'],
  ['tavern','table','стол','The table is wooden.','Стол деревянный.'],['tavern','chair','стул','Sit on the chair.','Сядь на стул.'],
  ['tavern','fire','огонь','The fire is warm.','Огонь согревает.'],['tavern','candle','свеча','Light the candle.','Зажги свечу.'],
  ['tavern','coin','монета','I found a coin.','Я нашёл монету.'],['tavern','sword','меч','His sword is sharp.','Его меч острый.'],
  ['tavern','castle','замок','The castle is on a hill.','Замок стоит на холме.'],['tavern','bridge','мост','Cross the bridge.','Перейди мост.'],
];
export const WORDS=Object.freeze(WORD_ROWS.map(([topic,en,ru,example,translation])=>Object.freeze({id:en,topic,en,ru,example,translation})));
const WORD_LOOKUP=new Map(WORDS.map(w=>[w.id,w]));
const BUILTIN_PAIRS=new Map(WORDS.map(w=>[wordPairKey(w),w.id]));
export function wordProgressId(word){
  const pair=wordPairKey(word),builtin=BUILTIN_PAIRS.get(pair);if(builtin)return builtin;
  // Stable vocabulary identity across copies, collections and generated sets.
  let a=2166136261,b=2246822507,c=3266489909,d=668265263;
  for(let i=0;i<pair.length;i++){const n=pair.charCodeAt(i);a=Math.imul(a^n,16777619);b=Math.imul(b^n,3266489909);c=Math.imul(c^n,2246822519);d=Math.imul(d^n,374761393);}
  return 'word:'+ [a,b,c,d].map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');
}
const wordShuffle=(items,random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function sanitizeWordProgress(raw){
  const result={};for(const [id,entry] of Object.entries(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{})){if(!WORD_LOOKUP.has(id)&&!/^word:[a-f0-9]{32}$/.test(id)||!entry||typeof entry!=='object')continue;
    const count=n=>Number.isFinite(n)?Math.max(0,Math.min(1000000,Math.floor(n))):0;
    result[id]={correct:count(entry.correct),wrong:count(entry.wrong),streak:Math.min(3,count(entry.streak))};
  }return result;
}
export const sanitizeWordRoundSize=value=>value==='all'?'all':Number.isSafeInteger(value)&&value>0?value:10;
export class WordGame {
  constructor({progress={},random=Math.random,words=WORDS,roundSize=10}={}){this.progress=sanitizeWordProgress(progress);this.random=random;this.roundSize=sanitizeWordRoundSize(roundSize);this.topic='all';this.mode='en-ru';this.setWords(words);}
  setWords(words){
    const pairs=new Set(),ids=new Set();this.words=words.map(word=>{const fields=wordFields(word),pair=wordPairKey(fields);if(!word.id||ids.has(word.id)||pairs.has(pair))throw Error('Invalid vocabulary');ids.add(word.id);pairs.add(pair);return {...word,...fields};});
    this.lookup=new Map(this.words.map(word=>[word.id,word]));this.progressIds=new Map(this.words.map(word=>[word.id,wordProgressId(word)]));this.topic='all';this.start();
  }
  get learned(){return this.words.filter(word=>(this.progress[this.progressIds.get(word.id)]?.streak||0)>=3).length;}
  start({topic=this.topic,mode=this.mode,ids,size=this.roundSize}={}){
    this.topic=['all','basics','forest','tavern'].includes(topic)?topic:'all';this.mode=mode==='ru-en'?'ru-en':'en-ru';
    this.roundSize=sanitizeWordRoundSize(size);
    const pool=ids?ids.map(id=>this.lookup.get(id)).filter(Boolean):this.words.filter(w=>this.topic==='all'||w.topic===this.topic);
    this.queue=wordShuffle([...new Set(pool)],this.random).sort((a,b)=>(this.progress[this.progressIds.get(a.id)]?.streak||0)-(this.progress[this.progressIds.get(b.id)]?.streak||0)).slice(0,this.roundSize==='all'?pool.length:this.roundSize).map(w=>w.id);
    this.total=this.queue.length;this.seen=new Set();this.credited=new Set();this.mistakes=new Set();this.firstCorrect=0;this.attempts=0;this.next();
  }
  next(){
    const id=this.queue.shift();if(!id){this.phase='finished';this.word=null;return;}
    this.word=this.lookup.get(id);this.phase='question';this.selected=null;this.wasCorrect=null;
    const field=this.mode==='en-ru'?'ru':'en';
    const prompt=this.mode==='en-ru'?'en':'ru',answers=new Set([wordSearchKey(this.word[field])]),others=[];
    for(const word of wordShuffle([...this.words,...WORDS],this.random)){
      const answer=wordSearchKey(word[field]);if(wordSearchKey(word[prompt])===wordSearchKey(this.word[prompt])||answers.has(answer))continue;answers.add(answer);others.push({...word,id:'\0option:'+others.length});if(others.length===3)break;
    }
    this.options=wordShuffle([this.word,...others],this.random).map(w=>({id:w.id,text:w[field]}));
  }
  answer(index){
    if(this.phase!=='question'||!Number.isInteger(index)||!this.options[index])return false;
    const correct=this.options[index].id===this.word.id,first=!this.seen.has(this.word.id);
    this.selected=index;this.wasCorrect=correct;this.attempts++;this.seen.add(this.word.id);
    const entry=this.progress[this.progressIds.get(this.word.id)]||={correct:0,wrong:0,streak:0};
    if(correct){entry.correct=Math.min(1000000,entry.correct+1);if(!this.credited.has(this.word.id)){entry.streak=Math.min(3,entry.streak+1);this.credited.add(this.word.id);}if(first)this.firstCorrect++;}
    else{entry.wrong=Math.min(1000000,entry.wrong+1);entry.streak=0;this.credited.add(this.word.id);this.mistakes.add(this.word.id);this.queue.splice(Math.min(3,this.queue.length),0,this.word.id);}
    this.phase='feedback';return true;
  }
}

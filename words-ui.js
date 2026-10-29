import {WordGame,WORDS,sanitizeWordRoundSize} from './words.js';
import {DndError,validateDndPreset} from './dnd.js';
import {WORD_PRESET,WORD_FORMAT,wordPreset,wordPrompt,wordGenerationCount,wordResponseLength,validateWordPack,wordSet,wordPairKey,wordError} from './words-content.js';
import {sanitizeWordLibrary,seedWordTopics,findWordLibraryCard,toggleWordFavorite,wordCollectionSet,addWordsToCollection,undoWordsCollection} from './words-library.js';
import {createWordLibraryView,WORD_STAR_ICON,WORD_FOLDER_ICON,WORD_TRASH_ICON} from './words-library-ui.js';
import {createWindowedList} from './windowed-list.js';
import {createDemoStoryBridge} from './dnd-demo.js';
import {copyArcadeText} from './clipboard.js';
import {createWordLesson} from './words-lesson.js';
import {createWordsScene} from './words-scene.js';
import {createWordSpeech,wordSpeechError} from './words-speech.js';

const COPY_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5H3v12h5"/></svg>';
const UNDO_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9a8 8 0 1 1-.5 7M5 9V3M5 9h6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COPY_ERROR='Не удалось скопировать слово. Можно скопировать текст вручную.';
const SPEAK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 5 9H2v6h3l6 5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const STOP_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';
const SOURCE_NAMES={all:'Все встроенные слова',basics:'Базовые слова',forest:'Лес и природа',tavern:'Таверна'};
export function createWordsGame(container,{progress={},onProgress=()=>{},onChange=()=>{},onFinish=()=>{},game:provided,bridge:providedBridge,getPreset=()=>WORD_PRESET,onPresetChange,getLibrary,onLibraryChange,getSet,onSetChange,onLibrarySetChange,source='all',direction='en-ru',roundSize=10,onRoundSizeChange=()=>{},onPreferencesChange=()=>{},sceneUrl,characterUrl,tableUrl=new URL('./assets/words-compact-table.webp',import.meta.url).href,characterVisible=true}={}){
  const bridge=providedBridge||createDemoStoryBridge(),abort=new AbortController(),signal=abort.signal;
  let localLibrary=getLibrary?sanitizeWordLibrary(null):seedWordTopics(null),localSet=wordSet(getSet?.()),localPreset=wordPreset(getPreset());
  let activeSet=localSet,selectedSource=activeSet?'current':Object.hasOwn(SOURCE_NAMES,source)?source:'all';
  let paused=true,visible=false,destroyed=false,reported=false,mode='play',generating=false,serial=0,error='',note='',picked=new Set(),deleteConfirm=false,touch=null,lastTouch=null,hold=null,holdTimer=null,copyTimer=null,copySerial=0,copiedWord=null;
  let selectedRoundSize=sanitizeWordRoundSize(roundSize),roundOpen=false,roundAll=false,roundNote='';
  let spokenWord=null,speechNote='';
  let showCharacter=characterVisible!==false;container.dataset.characters=String(showCharacter);
  const game=provided||new WordGame({progress,roundSize:selectedRoundSize});game.roundSize=selectedRoundSize;
  let librarySource=Symbol('unread'),libraryCache=sanitizeWordLibrary(null),librarySize=-1,collectionSize=-1;
  function readLibrary(){const raw=getLibrary?getLibrary():localLibrary;if(raw!==librarySource||raw?.cards?.length!==librarySize||raw?.collections?.length!==collectionSize){librarySource=raw;librarySize=raw?.cards?.length;collectionSize=raw?.collections?.length;libraryCache=sanitizeWordLibrary(raw);}return libraryCache;}
  const readPreset=()=>wordPreset(onPresetChange?getPreset():localPreset);
  const $=s=>container.querySelector(s),el=tag=>container.ownerDocument.createElement(tag);
  container.innerHTML=`<div class="tablegame-top words-top"><strong>Английский</strong><div class="words-tools"><button type="button" class="words-preset-toggle" aria-expanded="false" aria-controls="paw-words-preset">Пресет</button><button type="button" class="words-peek" aria-expanded="false" aria-controls="paw-words-current" aria-label="Текущий набор" title="Текущий набор">☷</button></div></div>
  <div class="words-play"><div class="words-settings"><div class="words-set-info"><span class="words-set-name" aria-label="Текущий сборник"></span><div class="words-progress"></div></div><select class="words-mode" aria-label="Направление перевода"><option value="en-ru">EN → RU</option><option value="ru-en">RU → EN</option></select></div>
  <div class="words-scene" role="group" aria-label="Занятие с персонажем в уютном пентхаусе"><img class="words-scene-background" alt="" draggable="false"><div class="words-scene-shade" aria-hidden="true"></div><div class="words-tutor" role="img" aria-label="Спокойно ждёт вашего ответа"><div class="words-tutor-portrait" aria-hidden="true"></div></div><div class="words-card-preparation" aria-hidden="true"><span class="words-prep-card"><i>Aa</i></span><span class="words-prep-card"><i>Aa</i></span><span class="words-prep-card"><i>Aa</i></span><span class="words-prep-card"><i>Aa</i></span><span class="words-prep-card"><i>Aa</i></span></div><div class="words-dealt-card" aria-hidden="true"><span>Aa</span></div><p class="words-scene-caption" role="status" aria-live="polite" hidden></p>
  <div class="word-card" tabindex="0" role="group" aria-label="Карточка слова"><div class="words-card-tools"><button type="button" class="words-speak truth-mini" aria-label="Произнести английское слово" title="Произнести английское слово" aria-pressed="false">${SPEAK_ICON}</button><button type="button" class="words-favorite truth-mini" aria-label="В избранное">${WORD_STAR_ICON}</button><button type="button" class="words-copy truth-mini" aria-label="Скопировать слово и перевод">${COPY_ICON}</button></div><strong class="word-prompt" lang="en"></strong><div class="words-example" hidden><p lang="en"></p><span></span></div><button type="button" class="words-next" hidden>Дальше</button><span class="word-paused" hidden>Пауза</span></div>
  <div class="words-result" hidden><strong></strong><p></p><button type="button" class="words-again">Ещё 10 слов</button><button type="button" class="words-retry">Повторить ошибки</button></div></div>
  <div class="word-options" role="group" aria-label="Варианты перевода"></div><p class="words-feedback" role="status" aria-live="polite"></p><div class="words-footer"><button type="button" class="words-round-toggle" aria-expanded="false" aria-controls="paw-words-round">Слов: 10</button><button type="button" class="words-generate">Генерация слов</button>
  <div id="paw-words-round" class="words-round-panel" role="group" aria-labelledby="paw-words-round-label" hidden><div class="words-round-heading"><label id="paw-words-round-label" for="paw-words-round-value">Слов в раунде</label><span class="words-round-limit"></span></div><div class="words-round-controls"><input id="paw-words-round-value" class="words-round-value" type="number" inputmode="numeric" min="1" step="1" value="10"><button type="button" class="words-round-all" aria-pressed="false">Все</button><button type="button" class="words-round-start">Начать</button></div><p class="words-round-note" role="alert" hidden></p></div></div></div>
  <div id="paw-words-preset" class="words-preset truth-editor" hidden><label>Тема, уровень и количество слов<textarea class="words-preset-text truth-prompt-text" maxlength="6000" spellcheck="false"></textarea></label><div class="truth-editor-buttons"><button type="button" class="words-preset-save">Сохранить</button><button type="button" class="words-preset-reset">По умолчанию</button></div><p class="words-preset-note truth-prompt-note"></p><details><summary>Формат ответа модели</summary><p class="words-format truth-format"></p></details></div>
  <div id="paw-words-current" class="words-current" hidden><div class="words-current-heading"><button type="button" class="words-current-back" aria-label="К игре">←</button><strong>Текущий набор</strong><span class="words-current-count"></span></div><div class="words-current-toolbar"><button type="button" class="words-collections-toggle" aria-expanded="false" aria-controls="paw-words-collections">Сборники</button><button type="button" class="words-add-all truth-add-all">${WORD_FOLDER_ICON}<span>Добавить все</span></button></div><div class="words-current-selection" hidden><span class="words-picked-count"></span><button type="button" class="words-pick-clear truth-selection-cancel" aria-label="Снять выделение" hidden>×</button><button type="button" class="words-current-trash truth-trash" aria-label="Убрать выбранные слова из текущего набора" hidden>${WORD_TRASH_ICON}</button></div><div class="words-delete-confirm truth-delete-confirm" hidden><span></span><button type="button" class="words-delete-yes truth-danger">Убрать</button><button type="button" class="words-delete-no">Отмена</button></div><div class="words-current-scroll"><ul></ul></div></div>
  <div id="paw-words-collections" class="words-collections truth-collections" hidden></div><p class="words-status" role="status" aria-live="polite"></p>`;
  $('.words-preset-text').value=localPreset;$('.words-format').textContent=WORD_FORMAT;
  function pool(){return selectedSource==='current'&&activeSet?activeSet.words:WORDS.filter(word=>selectedSource==='all'||word.topic===selectedSource);}
  function poolName(){return selectedSource==='current'&&activeSet?activeSet.name:SOURCE_NAMES[selectedSource]||SOURCE_NAMES.all;}
  if(!provided){game.mode=direction==='ru-en'?'ru-en':'en-ru';game.setWords(pool());}
  const positions=new Map();let currentStamp=null,positionSerial=0,lesson=null,lessonPhase='ready',shownWord=null,shownRound=-1;
  const motionQuery=container.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  $('.words-scene').style.setProperty('--words-table',`url("${tableUrl}")`);
  const scene=createWordsScene($('.words-scene'),{sceneUrl,characterUrl});scene.setReducedMotion(!showCharacter||!!motionQuery?.matches);
  $('.words-scene').setAttribute('aria-label',showCharacter?'Занятие с персонажем в уютном пентхаусе':'Карточки английских слов на столе');
  const speech=createWordSpeech({window:container.ownerDocument.defaultView,onChange(){if(!destroyed)paintSpeech();},onError(code){if(destroyed)return;speechNote=wordSpeechError(code);render();}});
  const speechAllowed=()=>visible&&!paused&&mode==='play'&&!roundOpen&&!generating&&!!lesson?.ready&&!!game.word&&game.phase!=='finished';
  function paintSpeech(){const button=$('.words-speak');if(!button)return;button.disabled=!speechAllowed()||!speech.supported;button.setAttribute('aria-pressed',String(speech.speaking));const label=!speech.supported?wordSpeechError('unsupported'):speech.speaking?'Остановить произношение':'Произнести английское слово';button.setAttribute('aria-label',label);button.title=label;button.innerHTML=speech.speaking?STOP_ICON:SPEAK_ICON;}
  function speakWord(){if(!speechAllowed())return;speechNote='';spokenWord=game.word;speech.speak(game.word.en);render();}
  const sceneActive=()=>showCharacter&&visible&&!paused&&mode==='play'&&!generating&&!roundOpen;
  const reaction=()=>generating?'focus':game.phase==='finished'?(game.firstCorrect/game.total>=.7?'approve':'support'):game.phase==='feedback'?(game.wasCorrect?'approve':'support'):'neutral';
  function paintScene(){if(lesson)scene.update({...lesson.state,reaction:reaction(),paused:paused||!visible});}
  function restartLesson(){shownWord=null;shownRound=-1;lesson?.start();}
  const positionKey=()=>selectedSource==='current'?'current:'+positionSerial:selectedSource;
  const list=createWindowedList($('.words-current-scroll'),$('.words-current-scroll ul'),{keyFor:word=>word.id,renderItem(word){
    const item=el('li'),button=el('button'),en=el('strong'),ru=el('span'),star=el('button');button.type='button';button.dataset.wordChoose=word.id;button.className='words-current-word truth-saved-edit';button.dataset.selecting=String(picked.size>0);button.dataset.selected=String(picked.has(word.id));button.setAttribute('aria-pressed',String(picked.has(word.id)));button.title='Удерживай, чтобы выбрать несколько слов. Shift + Enter — выделить.';en.lang='en';en.textContent=word.en;ru.lang='ru';ru.textContent=word.ru;button.append(en,ru);
    const favorite=findWordLibraryCard(readLibrary(),word)?.favorite===true;star.type='button';star.className='truth-mini';star.dataset.wordFavorite=word.id;star.innerHTML=WORD_STAR_ICON;star.setAttribute('aria-pressed',String(favorite));star.setAttribute('aria-label',favorite?'Убрать из избранного':'В избранное');item.append(button,star);return item;
  }});
  const libraryView=createWordLibraryView($('.words-collections'),{getLibrary:()=>getLibrary?getLibrary():localLibrary,onLibraryChange:saveLibrary,onPlay(id){if(generating)return;try{replaceSet(wordCollectionSet(readLibrary(),id));mode='play';render();}catch(e){error=wordError(e);render();}},onBack(){mode='current';render();},canPlay:()=>!generating,isActive:()=>mode==='collections'&&visible&&!paused,onChange});
  function saveLibrary(next){if(onLibraryChange)onLibraryChange(next);else localLibrary=next;currentStamp=null;}
  function saveSet(next){if(onSetChange)onSetChange(next);else localSet=next;activeSet=next;}
  function combined(library,set){
    if(onLibrarySetChange)onLibrarySetChange(library,set);
    else{if(onLibraryChange||onSetChange)throw Error('Atomic storage unavailable');localLibrary=library;localSet=set;}
    activeSet=set;currentStamp=null;
  }
  function changePreferences(nextSource,nextDirection){onPreferencesChange({source:nextSource,direction:nextDirection});selectedSource=nextSource;game.mode=nextDirection;}
  function replaceSet(raw){const next=wordSet(raw);if(raw&&!next)throw new DndError('INVALID_WORDS');saveSet(next);positions.delete('current:'+positionSerial);positionSerial++;selectedSource=next?'current':'all';roundOpen=false;game.setWords(pool());reported=false;clearPicked();currentStamp=null;error='';resetCopy();restartLesson();}
  function clearPicked(){picked=new Set();deleteConfirm=false;}
  function resetCopy(){clearTimeout(copyTimer);copyTimer=null;copiedWord=null;copySerial++;}
  function renderCurrent(){
    const words=pool(),anchor=list.snapshot(),sourceKey=selectedSource==='current'?activeSet:selectedSource;
    $('.words-current-count').textContent=String(words.length);$('.words-current-heading strong').textContent=poolName();
    $('.words-current-selection').hidden=!picked.size;$('.words-picked-count').textContent=picked.size?`Выбрано · ${picked.size}`:'Удерживай слово для выбора';$('.words-pick-clear').hidden=!picked.size;$('.words-current-trash').hidden=!picked.size;$('.words-current-trash').disabled=generating;
    const undo=!picked.size&&selectedSource==='current'&&!!activeSet?.bulk;
    $('.words-add-all').disabled=generating||!words.length;$('.words-add-all span').textContent=picked.size?'Добавить в…':undo?(activeSet.bulk.selected?'Отменить':'Отменить все'):'Добавить все';$('.words-add-all').dataset.undo=String(undo);$('.words-add-all svg').outerHTML=undo?UNDO_ICON:WORD_FOLDER_ICON;
    $('.words-delete-confirm').hidden=!deleteConfirm;$('.words-delete-confirm span').textContent=`Убрать ${picked.size} из текущего набора?`;$('.words-delete-yes').disabled=generating;
    if(currentStamp!==sourceKey){currentStamp=sourceKey;list.setItems(words,{anchor:positions.get(positionKey())||null});}else list.refresh({anchor});
    for(const button of container.querySelectorAll('[data-word-choose]')){button.dataset.selecting=String(picked.size>0);button.dataset.selected=String(picked.has(button.dataset.wordChoose));button.setAttribute('aria-pressed',String(picked.has(button.dataset.wordChoose)));}
    const library=readLibrary();for(const star of container.querySelectorAll('[data-word-favorite]')){const word=words.find(w=>w.id===star.dataset.wordFavorite);star.setAttribute('aria-pressed',String(!!word&&findWordLibraryCard(library,word)?.favorite===true));}
    list.refresh({anchor});
  }
  function render(){
    if(destroyed)return;
    if(mode!=='play')roundOpen=false;
    if(!$('.words-current').hidden)positions.set(positionKey(),list.snapshot());
    const finished=game.phase==='finished',feedback=game.phase==='feedback',reverse=game.mode==='ru-en',info=bridge.info(),intro=lesson?!lesson.ready:false;
    container.dataset.phase=game.phase;container.dataset.paused=String(paused);container.dataset.mode=mode;
    lesson?.setActive(sceneActive());scene.setActive(sceneActive());paintScene();
    for(const [panel,panelMode] of [['.words-play','play'],['.words-preset','preset'],['.words-current','current'],['.words-collections','collections']])$(panel).hidden=mode!==panelMode;
    for(const [button,panelMode] of [['.words-preset-toggle','preset'],['.words-peek','current'],['.words-collections-toggle','collections']])$(button).setAttribute('aria-expanded',String(mode===panelMode));
    $('.words-mode').value=game.mode;$('.words-set-name').textContent=poolName();$('.words-set-name').title=poolName();
    $('.words-progress').textContent=`Запомнено: ${game.learned} / ${game.words.length}${finished?'':` · осталось: ${game.queue.length+(game.phase==='question'?1:0)}`}`;
    $('.word-card').hidden=finished||intro;$('.word-paused').hidden=!paused;$('.word-prompt').textContent=game.word?(reverse?game.word.ru:game.word.en):'';$('.word-prompt').lang=reverse?'ru':'en';
    const optionStamp=JSON.stringify([game.word?.id,game.phase,game.selected,paused,intro,roundOpen,game.mode,game.options]);
    if($('.word-options').dataset.stamp!==optionStamp){$('.word-options').dataset.stamp=optionStamp;$('.word-options').replaceChildren();if(!finished)game.options.forEach((option,index)=>{const button=el('button');button.type='button';button.dataset.wordOption=String(index);button.lang=reverse?'en':'ru';button.className='word-option'+(feedback&&option.id===game.word.id?' right-answer':'')+(feedback&&index===game.selected&&!game.wasCorrect?' wrong-answer':'');button.disabled=paused||feedback||intro||roundOpen;button.textContent=option.text;$('.word-options').append(button);});}
    $('.word-options').dataset.concealed=String(intro||finished);$('.word-options').setAttribute('aria-hidden',String(intro||finished));
    $('.words-feedback').textContent=feedback?game.wasCorrect?'Верно!':`Правильный ответ: ${reverse?game.word.en:game.word.ru}. Вернёмся к этому слову.`:'';$('.words-feedback').classList.toggle('answer-error',feedback&&!game.wasCorrect);
    $('.words-example').hidden=!feedback||!game.word?.example;$('.words-example p').textContent=feedback?game.word.example:'';$('.words-example span').textContent=feedback?game.word.translation:'';
    $('.words-next').hidden=!feedback;$('.words-next').disabled=paused||intro||roundOpen;$('.words-next').textContent=game.queue.length?'Дальше':'Итоги';$('.words-result').hidden=!finished;$('.words-result strong').textContent=`С первой попытки: ${game.firstCorrect} / ${game.total}`;$('.words-result p').textContent=game.mistakes.size?'':'Все слова — с первого раза!';$('.words-result p').hidden=!!game.mistakes.size;$('.words-retry').hidden=!game.mistakes.size;$('.words-again').textContent='Ещё раунд';
    for(const selector of ['.words-again','.words-retry','.words-mode'])$(selector).disabled=paused||generating||roundOpen;
    const available=pool().length,roundCount=selectedRoundSize==='all'?'все':Math.min(selectedRoundSize,available);
    $('.words-round-toggle').textContent=`Слов: ${roundCount}`;$('.words-round-toggle').setAttribute('aria-expanded',String(roundOpen));$('.words-round-toggle').disabled=paused||generating;
    $('.words-round-panel').hidden=!roundOpen;$('.words-round-limit').textContent=`В наборе: ${available}`;$('.words-round-value').max=String(available);$('.words-round-all').setAttribute('aria-pressed',String(roundAll));$('.words-round-note').textContent=roundNote;$('.words-round-note').hidden=!roundNote;
    for(const selector of ['.words-round-value','.words-round-all','.words-round-start'])$(selector).disabled=paused||generating;
    const favorite=game.word&&findWordLibraryCard(readLibrary(),game.word)?.favorite===true;$('.words-favorite').setAttribute('aria-pressed',String(favorite));$('.words-favorite').setAttribute('aria-label',favorite?'Убрать из избранного':'В избранное');$('.words-favorite').disabled=!game.word||intro;$('.words-copy').disabled=!game.word||intro;$('.words-copy').dataset.copied=String(copiedWord===game.word&&!!game.word);$('.words-copy').innerHTML=copiedWord===game.word&&game.word?'✓':COPY_ICON;$('.words-copy').setAttribute('aria-label',copiedWord===game.word&&game.word?'Скопировано':'Скопировать слово и перевод');
    $('.words-generate').disabled=paused||generating||roundOpen||!info.available;$('.words-generate').textContent=generating?'Генерируем…':'Генерация слов';$('.words-preset-note').textContent=note||`Пресет применяется при следующей генерации. ${info.demo?'Здесь показаны только примеры.':'Используется текущее подключение Таверны.'}`;
    if(!speechAllowed()||spokenWord&&spokenWord!==game.word){speech.stop({notify:false});spokenWord=null;speechNote='';}paintSpeech();
    const status=error||speechNote||(generating?'Генерируем слова…':info.demo?'Демонстрация: генерация показывает примеры, не читает пресет моделью.':!info.available?wordError({code:info.reason}):'');$('.words-status').textContent=status;$('.words-status').hidden=!status;
    if(mode==='current')renderCurrent();if(mode==='collections')libraryView.refresh();
    if(!intro&&!finished&&mode==='play'&&!paused&&!roundOpen&&visible&&(shownWord!==game.word||shownRound!==lesson?.state.round)){shownWord=game.word;shownRound=lesson?.state.round??0;scene.enterCard();}
    if(finished&&!reported&&game.total>0){reported=true;onFinish({correct:game.firstCorrect,total:game.total});}
    onChange();
  }
  function toggleWord(id){if(mode!=='current'||!pool().some(word=>word.id===id))return;const anchor=list.snapshot();if(picked.has(id))picked.delete(id);else picked.add(id);deleteConfirm=false;renderCurrent();list.refresh({anchor});onChange();}
  function favorite(word){if(!word)return;try{saveLibrary(toggleWordFavorite(readLibrary(),word));error='';render();}catch(e){error=wordError(e);render();}}
  function bulkAdd(){
    if(generating)return;const words=pool(),set=selectedSource==='current'?activeSet:null;
    if(set?.bulk&&!picked.size){try{const next={...set};delete next.bulk;combined(undoWordsCollection(readLibrary(),words,set.bulk),next);clearPicked();error='';render();}catch(e){error=wordError(e);render();}return;}
    const selected=picked.size?[...picked]:null,origin=words,originSource=selectedSource;
    mode='collections';libraryView.openBatch({count:selected?.length||words.length,onCancel(){mode='current';render();},onChoose(target){
      if(generating||pool()!==origin&&!(originSource!=='current'&&selectedSource===originSource)||!visible||paused)throw new DndError('STALE');
      const {library,receipt}=addWordsToCollection(readLibrary(),origin,target,globalThis.crypto,selected),next={version:1,name:poolName(),words:origin,...(receipt.items.length?{bulk:receipt}:{})};combined(library,wordSet(next));selectedSource='current';clearPicked();error='';mode='current';render();
    }});render();
  }
  async function generate(){
    if(mode!=='play'||paused||generating||roundOpen||!bridge.info().available)return;const request=++serial,preset=readPreset();generating=true;error='';render();
    try{const token=bridge.capture(),raw=await bridge.generate(token,wordPrompt(preset),{responseLength:wordResponseLength(preset)});if(destroyed||request!==serial)return;bridge.assertCurrent(token);const words=validateWordPack(raw),expected=wordGenerationCount(preset);if(expected!==null&&words.length!==expected)throw new DndError('WORD_COUNT');replaceSet({version:1,name:'Сгенерированные слова',words});}
    catch(e){if(destroyed||request!==serial)return;error=wordError(e);}finally{if(!destroyed&&request===serial){generating=false;render();}}
  }
  function toggleRound(){
    roundOpen=!roundOpen;roundNote='';
    if(roundOpen){roundAll=selectedRoundSize==='all';$('.words-round-value').value=String(roundAll?pool().length:Math.min(selectedRoundSize,pool().length));}
    render();if(roundOpen){$('.words-round-value').focus({preventScroll:true});$('.words-round-value').select();}
  }
  function startRound(){
    if(!roundOpen||mode!=='play'||paused||generating||!visible)return;
    const available=pool().length,value=roundAll?'all':Number($('.words-round-value').value);
    if(value!=='all'&&(!Number.isSafeInteger(value)||value<1||value>available)){roundNote=`Введи целое число от 1 до ${available} или выбери «Все».`;render();$('.words-round-value').focus({preventScroll:true});return;}
    try{onRoundSizeChange(value);selectedRoundSize=value;roundOpen=false;roundNote='';game.start({size:value});reported=false;error='';resetCopy();restartLesson();}catch(e){roundNote=wordError(e);}
    render();
  }
  async function copy(){
    const word=game.word;if(!word)return;const request=++copySerial,text=[`${word.en} — ${word.ru}`,word.example,word.translation].filter(Boolean).join('\n');
    try{await copyArcadeText(text,{container,document:container.ownerDocument});if(destroyed||request!==copySerial||game.word!==word)return;copiedWord=word;if(error===COPY_ERROR)error='';clearTimeout(copyTimer);copyTimer=setTimeout(()=>{copiedWord=null;render();},1400);render();}catch{if(!destroyed&&request===copySerial){error=COPY_ERROR;render();}}
  }
  function savePreset(reset=false){try{const value=validateDndPreset(reset?WORD_PRESET:$('.words-preset-text').value);if(onPresetChange)onPresetChange(value);else localPreset=value;$('.words-preset-text').value=value;note='Сохранено. Применится при следующей генерации.';}catch(e){note=wordError(e);}render();}
  function resume(){if(destroyed)return;paused=false;visible=true;render();}
  function activate(target){
    if(destroyed||!visible)return;const button=target.closest('button');if(button?.disabled)return;if(paused)resume();
    if(target.closest('.words-preset-toggle')){clearPicked();mode=mode==='preset'?'play':'preset';render();}
    else if(target.closest('.words-peek')){clearPicked();mode=mode==='current'?'play':'current';render();}
    else if(target.closest('.words-collections-toggle')){if(mode!=='current')return;clearPicked();mode='collections';libraryView.open();render();}
    else if(target.closest('.words-current-back')){clearPicked();mode='play';render();}
    else if(target.closest('.words-preset-save'))savePreset();else if(target.closest('.words-preset-reset'))savePreset(true);
    else if(target.closest('.words-round-toggle'))toggleRound();
    else if(target.closest('.words-round-all')&&roundOpen){roundAll=true;roundNote='';$('.words-round-value').value=String(pool().length);render();}
    else if(target.closest('.words-round-start'))startRound();
    else if(target.closest('.words-generate'))void generate();else if(mode==='collections'&&libraryView.activate(target))return;
    else if(target.closest('.words-speak'))speakWord();else if(target.closest('.words-favorite'))favorite(game.word);else if(target.closest('.words-copy'))void copy();
    else if(button?.dataset.wordFavorite)favorite(pool().find(word=>word.id===button.dataset.wordFavorite));
    else if(button?.dataset.wordChoose){if(picked.size)toggleWord(button.dataset.wordChoose);else{const word=pool().find(word=>word.id===button.dataset.wordChoose);if(word){mode='collections';libraryView.openCard(word,()=>{mode='current';render();});render();}}}
    else if(target.closest('.words-add-all'))bulkAdd();else if(target.closest('.words-pick-clear')){clearPicked();render();}
    else if(target.closest('.words-current-trash')){deleteConfirm=!!picked.size;render();}else if(target.closest('.words-delete-no')){deleteConfirm=false;render();}
    else if(target.closest('.words-delete-yes')&&deleteConfirm&&!generating){try{const old=selectedSource==='current'?activeSet:null,words=pool().filter(word=>!picked.has(word.id)),bulk=old?.bulk?{...old.bulk,items:old.bulk.items.filter(item=>!picked.has(item.sourceId))}:null;replaceSet(words.length?{version:1,name:poolName(),words,...(bulk?{bulk}:{})}:null);render();}catch(e){error=wordError(e);render();}}
    else if(button?.hasAttribute('data-word-option')&&mode==='play'&&!paused&&!roundOpen&&lesson.ready&&game.answer(Number(button.dataset.wordOption))){try{onProgress(structuredClone(game.progress));error='';}catch(e){error=wordError(e);}resetCopy();render();}
    else if(target.closest('.words-next')&&mode==='play'&&!roundOpen&&game.phase==='feedback'){game.next();resetCopy();render();$('.word-card').focus({preventScroll:true});}
    else if(target.closest('.words-again')){game.start();reported=false;resetCopy();restartLesson();render();}else if(target.closest('.words-retry')){game.start({ids:[...game.mistakes]});reported=false;resetCopy();restartLesson();render();}
  }
  container.addEventListener('change',event=>{if(event.target.matches('.words-mode')){if(generating)return;try{changePreferences(selectedSource,$('.words-mode').value);game.setWords(pool());reported=false;clearPicked();currentStamp=null;resetCopy();error='';restartLesson();}catch(e){error=wordError(e);}render();}},{signal});
  container.addEventListener('input',event=>{if(event.target.matches('.words-round-value')){roundAll=false;roundNote='';$('.words-round-all').setAttribute('aria-pressed','false');$('.words-round-note').hidden=true;}},{signal});
  function cancelHold(){clearTimeout(holdTimer);holdTimer=null;hold=null;}
  container.addEventListener('pointerdown',event=>{
    cancelHold();lastTouch=null;if(paused&&visible&&!event.target.closest('.words-preset,.words-collections'))resume();const button=event.target.closest('button');if(event.isPrimary===false||event.button!==0&&event.pointerType!=='touch'&&event.pointerType!=='pen'||!button||button.disabled)return;
    if(event.pointerType==='touch'||event.pointerType==='pen')touch={id:event.pointerId,button,x:event.clientX,y:event.clientY,moved:false};
    const saved=mode==='collections'&&libraryView.canSelect(button),current=mode==='current'&&button.dataset.wordChoose;if(!saved&&!current)return;
    const press={id:event.pointerId,button,x:event.clientX,y:event.clientY,savedId:saved?button.dataset.wordEdit:null,currentId:current||null,fired:false};hold=press;
    holdTimer=setTimeout(()=>{holdTimer=null;if(hold!==press||paused||!visible||!button.isConnected)return;press.fired=true;if(press.savedId)libraryView.toggleSelection(press.savedId);else toggleWord(press.currentId);},500);
  },{capture:true,signal});
  container.addEventListener('pointermove',event=>{if(hold?.id===event.pointerId&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>8)cancelHold();if(touch?.id===event.pointerId&&Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>8)touch.moved=true;},{signal});
  container.addEventListener('pointerup',event=>{const held=hold?.id===event.pointerId&&hold.fired;if(hold?.id===event.pointerId)cancelHold();if(held){touch=null;lastTouch={time:performance.now()};return;}if(touch?.id!==event.pointerId)return;const tap=touch;touch=null;if(!tap.moved){lastTouch={time:performance.now()};if(tap.button.isConnected&&!tap.button.disabled)activate(tap.button);}},{signal});
  container.addEventListener('pointercancel',()=>{cancelHold();touch=null;lastTouch=null;},{signal});
  container.addEventListener('contextmenu',event=>{if(event.target.closest('[data-word-edit],[data-word-choose]'))event.preventDefault();},{signal});
  container.addEventListener('keydown',event=>{
    lastTouch=null;if(paused&&visible&&!event.target.closest('.words-preset,.words-collections'))resume();
    if(roundOpen&&event.key==='Escape'){event.preventDefault();event.stopPropagation();roundOpen=false;render();$('.words-round-toggle').focus({preventScroll:true});return;}
    if(roundOpen&&event.target.matches('.words-round-value')&&event.key==='Enter'){event.preventDefault();event.stopPropagation();startRound();return;}
    const button=event.target.closest('[data-word-edit],[data-word-choose]');if(button&&event.shiftKey&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();if(mode==='collections'&&libraryView.canSelect(button))libraryView.toggleSelection(button.dataset.wordEdit);else if(mode==='current')toggleWord(button.dataset.wordChoose);}
  },{signal});
  container.addEventListener('click',event=>{if(lastTouch&&performance.now()-lastTouch.time<900&&(event.isTrusted||event.detail>0)){lastTouch=null;event.preventDefault();event.stopImmediatePropagation();if(event.target.closest('.truth-saved-search-toggle,.truth-saved-search-clear,.truth-collection-search-toggle,.truth-collection-search-clear'))libraryView.focusSearch();return;}activate(event.target);},{capture:true,signal});
  lesson=createWordLesson({reducedMotion:!showCharacter||!!motionQuery?.matches,onChange(state){if(destroyed)return;const changed=lessonPhase!==state.phase;lessonPhase=state.phase;if(changed)render();else paintScene();}});
  function motionChanged(){const reduced=!showCharacter||!!motionQuery?.matches;scene.setReducedMotion(reduced);lesson.setReducedMotion(reduced);render();}
  function setCharacterVisible(value){
    if(destroyed||showCharacter===!!value)return;showCharacter=!!value;container.dataset.characters=String(showCharacter);
    $('.words-scene').setAttribute('aria-label',showCharacter?'Занятие с персонажем в уютном пентхаусе':'Карточки английских слов на столе');
    motionChanged();
  }
  motionQuery?.addEventListener?.('change',motionChanged);
  const unsubscribe=bridge.subscribe(()=>{if(!destroyed)render();});lesson.start();render();
  return {resume,setCharacterVisible,cancelSelection(){if(mode==='collections')return libraryView.cancelSelection();if(!picked.size)return false;if(deleteConfirm)deleteConfirm=false;else clearPicked();render();return true;},pause(){if(destroyed)return;paused=true;cancelHold();touch=null;render();},hide(){this.pause();visible=false;clearPicked();libraryView.clearSelection();},focus(){(mode==='play'?$('.word-card'):$('.words-preset-toggle')).focus({preventScroll:true});},get stateTag(){return generating?'generating':game.phase==='finished'?'finished':paused?'paused':!lesson.ready?'shuffling':'playing';},destroy(){destroyed=true;serial++;resetCopy();cancelHold();speech.destroy();lesson.destroy();scene.destroy();motionQuery?.removeEventListener?.('change',motionChanged);unsubscribe();list.destroy();libraryView.destroy();if(!providedBridge)bridge.destroy?.();abort.abort();container.replaceChildren();}};
}

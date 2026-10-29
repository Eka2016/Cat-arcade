import {validateDndPreset,dndRollId} from './dnd.js';
import {TRUTH_PRESET,TRUTH_FORMAT,truthPreset,truthPrompt,validateTruthPack,truthRound,nextTruthCard,selectTruthCard,resetTruthRound,deleteTruthRoundCards} from './truth-dare.js';
import {createGameClock} from './game-clock.js';
import {createWindowedList} from './windowed-list.js';
import {copyArcadeText} from './clipboard.js';
import {createDemoStoryBridge} from './dnd-demo.js';
import {sanitizeChatSender} from './chat-message.js';
import {sanitizeTruthLibrary,truthLibraryCardKey,toggleTruthFavorite,addTruthCardsToCollection,undoTruthCardsCollection,truthCollectionPack,truthLibraryError} from './truth-library.js';
import {createTruthLibraryView,TRUTH_STAR_ICON,TRUTH_FOLDER_ICON,TRUTH_TRASH_ICON} from './truth-library-ui.js';

const LABELS={truth:'Правда',dare:'Действие'};
const COPY_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
const COPIED_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COPY_ERROR='Не удалось скопировать карточку. Можно выделить её текст и скопировать вручную.';
const BULK_UNDO_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9a8 8 0 1 1-.5 7M5 9V3M5 9h6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TRUTH_LEAF='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M39 7C17 6 7 18 10 30c11 8 30 1 29-23Z" fill="currentColor"/><path d="m9 39 23-23M18 29l-1-9m8 2 8-1" fill="none" stroke="#315c43" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TRUTH_FERN='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M23 40c-2-12 0-23 7-34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><g fill="currentColor"><path d="M25 31c-10 0-14-6-14-11 7 1 12 4 14 11ZM24 23c-7-1-10-6-9-10 6 2 9 5 9 10ZM27 15c-4-3-5-7-3-11 5 4 5 7 3 11ZM25 30c1-9 6-14 13-14-1 7-5 12-13 14ZM26 21c0-7 4-11 10-12 0 5-3 10-10 12Z"/></g></svg>';
const TRUTH_VINES='<svg class="truth-sky" viewBox="0 0 320 146" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M17 111c39-31 72 34 155 2 60-23 77-55 128-42M24 111c19-7 34-3 49 5M252 40c-3-13 10-22 15-13 3 6-6 12-9 6" opacity=".65"/><path d="M53 89c1-17 15-23 21-24-1 14-8 23-21 24ZM89 117c-15-1-20-10-21-17 13 0 20 6 21 17ZM247 83c-1-16 12-25 19-26-1 14-7 23-19 26ZM276 75c3-11 12-15 20-15-4 11-11 16-20 15Z"/><path d="m53 89 12-15m182 9 11-17" opacity=".7"/><circle cx="34" cy="58" r="2"/><circle cx="99" cy="81" r="1.5"/><circle cx="285" cy="106" r="2"/></g></svg>';
const TRUTH_CAT='<svg viewBox="0 0 150 70" aria-hidden="true"><path d="M23 55c22-27 48-23 78-4-21 21-48 18-78 4Z" fill="#a6bd8c"/><path d="m24 55 75-4m-46 2-9-8m26 7 10 8" fill="none" stroke="#7c9b70" stroke-width="1.5"/><path d="M45 46c-1-9 0-22 6-29l9 9c8-3 14-2 20 0l10-8c4 8 4 16 2 23 10 3 12 10 8 13-8 5-21 2-31-1-8 2-20 3-25-1-2-2-2-4 1-6Z" fill="#3d614a" stroke="#2d4e3c" stroke-width="2" stroke-linejoin="round"/><path d="M63 40q3 4 6 0m8 1q3 4 6 0" fill="none" stroke="#c6e2b5" stroke-width="2" stroke-linecap="round"/><path d="M112 31c-1-11 5-18 15-19 1 11-5 18-15 19Z" fill="#8fae78"/><path d="m110 35 12-17" fill="none" stroke="#5f845a" stroke-width="1.5"/><circle cx="34" cy="26" r="2" fill="#b6c996"/></svg>';
const MESSAGES={NO_CHAT:'Открой чат с персонажем или группой.',NO_API:'Таверна не предоставляет генерацию для расширений.',OFFLINE:'Подключи модель в обычных настройках Таверны.',BUSY:'Дождись завершения текущей генерации.',STALE:'Чат или история изменились. Проверь текущую карточку перед повторной отправкой.',NO_APPEND:'Таверна не предоставляет добавление сообщений в чат.',APPEND:'Не удалось добавить карточку. Проверь чат и попробуй ещё раз.',GENERATION:'Не удалось получить карточки. Можно попробовать ещё раз.',INVALID_TABLE:'Нужны два набора по 1–20 карточек. Попробуй уменьшить количество или повторить генерацию.',UNSAFE_TEXT:'В ответе есть разметка или ссылки. Карточки не использованы.',REPEATED:'В ответе есть одинаковые карточки. Попробуй ещё раз.',RANDOM:'Случайный выбор недоступен в этом браузере.',PRESET:'Промпт: от 1 до 6000 знаков, без макросов в двойных фигурных скобках.'};
export function createTruthGame(container,{bridge:provided,getPreset=()=>TRUTH_PRESET,onPresetChange=()=>{},getRound=()=>null,onRoundChange=()=>{},onRoundRename,getSender=()=>'narrator',getLibrary,onLibraryChange,onLibraryRoundChange,onChange=()=>{},cryptoSource=globalThis.crypto,flipDelay=850}={}){
  const bridge=provided||createDemoStoryBridge(),abort=new AbortController(),signal=abort.signal,cache=new Map(),renames=new Map();
  let key=null,revision=-1,round=null,pending=null,phase='idle',paused=true,visible=false,destroyed=false,serial=0,mode='play',listKind='truth',error='',renameError='',note='',animation=null;
  let selectionKind=null,selection=new Set(),deleteSource=null,hold=null,holdTimer=null,touch=null,lastTouch=null;
  let copyTimer=null,copied=null,copySerial=0;
  container.innerHTML=`<div class="truth-top"><strong>Правда или действие</strong><div class="truth-tools"><button type="button" class="truth-prompt-toggle" aria-expanded="false" aria-controls="paw-truth-editor">Промпт</button><button type="button" class="truth-peek" aria-expanded="false" aria-controls="paw-truth-library" aria-label="Показать все карточки" title="Показать все карточки" disabled>☷</button><button type="button" class="truth-reset" aria-label="Сыграть с теми же карточками заново" title="Сыграть с тем же набором заново, без генерации" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9a8 8 0 1 1-.5 7M5 9V3M5 9h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>
  <div class="truth-play"><div class="truth-counts"><span class="truth-truth-count"></span><span class="truth-dare-count"></span></div>
  <div class="truth-coin-stage">${TRUTH_VINES}<button type="button" class="truth-coin" aria-label="Подбросить жетон"><span class="truth-coin-core"><span class="truth-coin-face truth-coin-front"><b>${TRUTH_LEAF}</b><span>Правда</span></span><span class="truth-coin-face truth-coin-back"><b>${TRUTH_FERN}</b><span>Действие</span></span></span></button><span class="truth-coin-hint">Подбрось жетон</span></div>
  <article class="truth-playing-card" aria-live="polite"><div class="truth-card-tools" hidden><button type="button" class="truth-favorite truth-mini" aria-pressed="false" aria-label="В избранное">${TRUTH_STAR_ICON}</button><button type="button" class="truth-copy-card truth-mini" aria-label="Копировать карточку" title="Копировать карточку">${COPY_ICON}</button></div><span class="truth-card-kind">Закрытая карточка</span><p class="truth-card-text"></p><span class="truth-card-ornament" aria-hidden="true">${TRUTH_CAT}</span></article></div>
  <section id="paw-truth-library" class="truth-library" hidden aria-label="Все сгенерированные карточки"><div class="truth-library-navigation"><strong>Текущий набор</strong><button type="button" class="truth-open-collections">Сборники</button></div><div class="truth-library-tabs" role="group" aria-label="Тип карточек"><button type="button" data-truth-kind="truth" aria-pressed="true">Правда</button><button type="button" data-truth-kind="dare" aria-pressed="false">Действие</button></div><div class="truth-list-tools"><p class="truth-list-hint">Нажми на карточку, затем «В чат».</p><button type="button" class="truth-selection-cancel" aria-label="Отменить выделение" title="Снять выделение" hidden>×</button><button type="button" class="truth-add-all" disabled>${TRUTH_STAR_ICON}<span>Добавить все</span></button><button type="button" class="truth-round-trash truth-trash" aria-label="Удалить выбранные карточки из текущего набора" title="Удалить из текущего набора" hidden>${TRUTH_TRASH_ICON}</button></div><div class="truth-round-delete-confirm truth-delete-confirm" hidden><span class="truth-round-delete-question"></span><button type="button" class="truth-round-delete-yes truth-danger">Удалить</button><button type="button" class="truth-round-delete-no">Отмена</button></div><div class="truth-library-scroll"><p class="truth-round-empty" hidden>Набора пока нет. Сгенерируй карточки или открой сборник.</p><ol></ol></div></section><section id="paw-truth-collections" class="truth-collections" hidden aria-label="Избранное и сборники карточек"></section>
  <div id="paw-truth-editor" class="truth-editor" hidden><label>Количество и содержание карточек<textarea class="truth-prompt-text" maxlength="6000" rows="8" spellcheck="false"></textarea></label><div class="truth-editor-buttons"><button type="button" class="truth-prompt-save">Сохранить</button><button type="button" class="truth-prompt-reset">Стандартный</button><button type="button" class="truth-clear">Удалить карточки</button></div><p class="truth-prompt-note" role="status"></p><details><summary>Формат ответа</summary><p class="truth-format"></p></details></div>
  <div class="truth-actions"><button type="button" class="truth-generate">Генерация карточек</button><button type="button" class="truth-apply" hidden>В чат</button></div><p class="truth-status" role="status" aria-live="polite"></p>`;
  const $=s=>container.querySelector(s);$('.truth-prompt-text').value=truthPreset(getPreset());$('.truth-format').textContent=TRUTH_FORMAT;
  let localLibrary=sanitizeTruthLibrary(null),librarySource=null,libraryCardCount=-1,libraryCollectionCount=-1,library=sanitizeTruthLibrary(null),favoriteKeys=new Set(),listStamp=null,listUsed=new Set(),roundListKey=null;
  const roundPositions=new Map();
  function readLibrary(){const raw=getLibrary?getLibrary():localLibrary,cardCount=raw?.cards?.length||0,collectionCount=raw?.collections?.length||0;if(raw!==librarySource||cardCount!==libraryCardCount||collectionCount!==libraryCollectionCount){librarySource=raw;libraryCardCount=cardCount;libraryCollectionCount=collectionCount;library=sanitizeTruthLibrary(raw);favoriteKeys=new Set(library.cards.filter(card=>card.favorite).map(truthLibraryCardKey));}return library;}
  function storeLibrary(value){onLibraryChange?.(value);localLibrary=value;librarySource=null;readLibrary();}
  const blocked=()=>['generating','flipping','sending'].includes(phase);
  const inChat=choice=>!!(choice?.id&&bridge.truthCardInfo?.(choice.id));
  const sent=(kind,index)=>{const choice=round?.choices[kind][index];return !!(choice?.applied||inChat(choice));};
  function stopAnimation(){animation?.cancel();animation=null;}
  function resetCopy(){
    copySerial++;clearTimeout(copyTimer);copyTimer=null;copied=null;const button=$('.truth-copy-card');
    if(button){button.innerHTML=COPY_ICON;delete button.dataset.copied;button.setAttribute('aria-label','Копировать карточку');button.title='Копировать карточку';}
  }
  async function copyCard(){
    sync();const current=round?.current;if(!current||current.index===null)return;
    resetCopy();const request=copySerial,sourceKey=key,{kind,index}=current,text=round.pack[kind][index];
    try{
      await copyArcadeText(text,{container});
      if(destroyed||request!==copySerial||key!==sourceKey||round?.current?.kind!==kind||round?.current?.index!==index||round?.pack[kind]?.[index]!==text)return;
      copied={key,kind,index,text};const button=$('.truth-copy-card');button.innerHTML=COPIED_ICON;button.dataset.copied='true';button.setAttribute('aria-label','Скопировано');button.title='Скопировано';
      copyTimer=setTimeout(()=>{if(!destroyed)resetCopy();},1400);if(error===COPY_ERROR){error='';render();}
    }catch{if(!destroyed&&request===copySerial&&key===sourceKey){error=COPY_ERROR;render();}}
  }
  // Layout or scrolling after a completed hold must still consume its release.
  function cancelHold(keepFired=false){if(holdTimer!==null)clearTimeout(holdTimer);holdTimer=null;if(!keepFired||!hold?.fired)hold=null;}
  function clearSelection(){selectionKind=null;selection=new Set();deleteSource=null;}
  function toggleSelection(kind,index){
    sync();if(mode!=='cards'||blocked()||!key||!round||!['truth','dare'].includes(kind)||!Number.isInteger(index)||index<0||index>=round.pack[kind].length)return;
    deleteSource=null;
    if(selectionKind!==kind){selection=new Set();selectionKind=kind;}
    if(selection.has(index))selection.delete(index);else selection.add(index);
    if(!selection.size)selectionKind=null;render();
  }
  function restore(){
    let saved=cache.get(key);if(!renames.has(key))try{saved=getRound(key)||saved;}catch{}
    try{round=saved?truthRound(saved):null;}catch{round=null;}
  }
  function writeRename(to,saved){
    const from=renames.get(to);
    if(onRoundRename)onRoundRename(from,to,saved);else onRoundChange(to,saved);
    renames.delete(to);cache.delete(from);
  }
  function followRename(change){
    if(change?.type!=='chat-renamed')return;
    const {fromKey:from,toKey:to}=change;
    let source=cache.get(from),target=cache.get(to);
    try{source=getRound(from)||source;target=getRound(to)||target;}catch{}
    if(!source&&!target)return;
    const saved=truthRound(source||target),original=renames.get(from)||from;
    renames.delete(from);renames.set(to,original);cache.delete(from);cache.set(to,saved);
    if(key===to){round=saved;phase='ready';}
  }
  function retryRenames(){
    renameError='';
    for(const to of [...renames.keys()])try{writeRename(to,to===key?round:cache.get(to));}catch(e){renameError=textError(e);}
  }
  function sync(){
    const info=bridge.info();
    if(key!==info.key||revision!==info.revision){serial++;clock.cancel();stopAnimation();cancelHold();clearSelection();resetCopy();key=info.key;revision=info.revision;pending=null;mode='play';restore();phase=round?'ready':'idle';error='';}
    return info;
  }
  function remember(next){
    const saved=next?truthRound(next):null;
    if(renames.has(key))writeRename(key,saved);else onRoundChange(key,saved);
    if(saved)cache.set(key,saved);else cache.delete(key);round=saved;
  }
  function rememberLibraryRound(nextLibrary,nextRound){
    const saved=truthRound(nextRound),previousLibrary=readLibrary();
    if(onLibraryRoundChange)onLibraryRoundChange(key,nextLibrary,saved);
    else{onLibraryChange?.(nextLibrary);try{onRoundChange(key,saved);}catch(e){try{onLibraryChange?.(previousLibrary);}catch{}throw e;}}
    localLibrary=nextLibrary;librarySource=null;readLibrary();round=saved;cache.set(key,saved);
  }
  function textError(e){return MESSAGES[e?.code]||'Не удалось сохранить изменения. Попробуй ещё раз.';}
  const clock=createGameClock(()=>{
    if(!pending||destroyed)return;
    try{remember(pending);error='';}catch(e){error=textError(e);}
    pending=null;stopAnimation();phase=round?'ready':'idle';render();
  },flipDelay);
  const libraryView=createTruthLibraryView($('.truth-collections'),{isActive:()=>mode==='collections'&&visible,getLibrary:readLibrary,onLibraryChange:storeLibrary,cryptoSource,onChange,onBack(){mode='cards';render();},canPlay:()=>!paused&&!blocked()&&!!key,onPlay(id){
    sync();if(paused||blocked()||!key)return;
    try{roundPositions.clear();remember({version:1,pack:truthCollectionPack(readLibrary(),id),used:{truth:[],dare:[]},current:null});clearSelection();mode='play';phase='ready';error='';render();}catch(e){error=truthLibraryError(e);render();}
  }});
  function favoriteCard(kind,index){
    sync();if(!round||!['truth','dare'].includes(kind)||!Number.isInteger(index)||index<0||index>=round.pack[kind].length)return;
    try{storeLibrary(toggleTruthFavorite(readLibrary(),{kind,text:round.pack[kind][index]},cryptoSource));error='';render();}catch(e){error=truthLibraryError(e);render();}
  }
  function bulkAll(){
    sync();if(!round||blocked())return;
    const kind=listKind,selected=selectionKind===kind&&selection.size?[...selection].sort((a,b)=>a-b):null;
    if(!selected&&round.bulk?.[kind]){
      try{const nextLibrary=undoTruthCardsCollection(readLibrary(),kind,round.pack[kind],round.bulk[kind]),bulk={...round.bulk};delete bulk[kind];rememberLibraryRound(nextLibrary,{...round,bulk});error='';render();}
      catch(e){error=truthLibraryError(e);render();}return;
    }
    const sourceKey=key,sourceRound=round;mode='collections';error='';
    libraryView.openBatch({kind,count:selected?.length,onCancel(){mode='cards';render();},onChoose(target){
      sync();if(sourceKey!==key||sourceRound!==round||blocked()){render();const error=new Error();error.code='STALE';throw error;}
      const added=addTruthCardsToCollection(readLibrary(),kind,round.pack[kind],target,cryptoSource,selected);
      rememberLibraryRound(added.library,{...round,bulk:{...round.bulk,[kind]:added.receipt}});clearSelection();mode='cards';error='';render();
    }});render();
  }
  function deleteCurrent(){
    const source=deleteSource;sync();if(!source||source.key!==key||source.round!==round||blocked()||mode!=='cards')return;
    try{remember(deleteTruthRoundCards(round,source.kind,source.indices));clearSelection();roundPositions.delete(`${key}:${listKind}`);phase=round?'ready':'idle';error='';render();}
    catch(e){error=textError(e);render();}
  }
  const roundList=createWindowedList($('.truth-library-scroll'),$('.truth-library ol'),{keyFor:(_,index)=>index,renderItem(text,index){
    const item=document.createElement('li'),button=document.createElement('button'),body=document.createElement('span'),status=document.createElement('small');
    button.type='button';button.dataset.truthChoose=String(index);button.dataset.kind=listKind;button.disabled=blocked()||!key;
    const selecting=selectionKind===listKind&&selection.size>0,selected=selecting&&selection.has(index);
    button.dataset.selecting=String(selecting);button.dataset.selected=String(selected);button.title='Удерживай, чтобы выбрать несколько карточек. Shift + Enter — выделить с клавиатуры.';
    button.setAttribute('aria-pressed',String(selecting?selected:round.current?.kind===listKind&&round.current.index===index));
    body.textContent=text;status.textContent=sent(listKind,index)?'В чате':listUsed.has(index)?'Открыта':'';
    button.append(body,status);const star=document.createElement('button'),favorite=favoriteKeys.has(truthLibraryCardKey({kind:listKind,text}));star.type='button';star.className='truth-round-favorite truth-mini';star.dataset.truthFavorite=String(index);star.dataset.kind=listKind;star.innerHTML=TRUTH_STAR_ICON;star.setAttribute('aria-pressed',String(favorite));star.setAttribute('aria-label',favorite?'Убрать из избранного':'В избранное');item.append(button,star);return item;
  }});
  function paintSelection(){
    const texts=round?.pack[listKind]||[],selected=selectionKind===listKind?selection.size:0,receipt=round?.bulk?.[listKind],undo=!selected&&!!receipt;
    $('.truth-list-tools').hidden=!!deleteSource;$('.truth-round-delete-confirm').hidden=!deleteSource;$('.truth-round-delete-question').textContent=`Удалить ${selected} из набора?`;
    $('.truth-round-trash').hidden=!selected;$('.truth-round-trash').disabled=blocked();
    $('.truth-selection-cancel').hidden=!selected;$('.truth-list-hint').textContent=selected?`Выбрано · ${selected}`:'Нажми на карточку, затем «В чат».';
    $('.truth-add-all').disabled=!texts.length||blocked();$('.truth-add-all').dataset.undo=String(undo);$('.truth-add-all svg').outerHTML=undo?BULK_UNDO_ICON:TRUTH_FOLDER_ICON;$('.truth-add-all span').textContent=selected?'Добавить в…':undo?(receipt.selected?'Отменить':'Отменить все'):'Добавить все';$('.truth-add-all').setAttribute('aria-label',selected?`Добавить выбранные карточки в сборник · ${selected}`:`${undo?'Отменить добавление':'Добавить все карточки'} «${LABELS[listKind]}»`);$('.truth-add-all').title=selected?'Выбрать сборник для выделенных карточек':undo?'Отменить последнее добавление':'Выбрать сборник для всех карточек этого типа';
    const selecting=!!selected;
    for(const button of container.querySelectorAll('[data-truth-choose]')){
      const index=Number(button.dataset.truthChoose),chosen=selecting&&selection.has(index);
      button.dataset.selecting=String(selecting);button.dataset.selected=String(chosen);
      button.setAttribute('aria-pressed',String(selecting?chosen:round?.current?.kind===listKind&&round.current.index===index));
    }
  }
  function renderLibrary(){
    const open=mode==='cards',position=!$('.truth-library').hidden?roundList.snapshot():null;
    if(position&&roundListKey)roundPositions.set(roundListKey,position);
    $('.truth-library').hidden=!open;
    $('.truth-peek').disabled=false;$('.truth-peek').setAttribute('aria-controls',mode==='collections'?'paw-truth-collections':'paw-truth-library');$('.truth-peek').setAttribute('aria-expanded',String(open||mode==='collections'));
    $('.truth-peek').setAttribute('aria-label',open||mode==='collections'?'Вернуться к жетону':'Показать все карточки');
    paintSelection();
    const stamp=[open,round,listKind,readLibrary(),blocked(),key];
    if(listStamp&&stamp.every((value,index)=>value===listStamp[index])){if(open)roundList.refresh({anchor:position});return;}listStamp=stamp;
    for(const button of container.querySelectorAll('[data-truth-kind]')){const kind=button.dataset.truthKind;button.setAttribute('aria-pressed',String(kind===listKind));button.textContent=`${LABELS[kind]} · ${round?.pack[kind].length||0}`;}
    $('.truth-round-empty').hidden=!!round?.pack[listKind].length;$('.truth-round-empty').textContent=round?'В этой стопке нет карточек. Открой другой тип или загрузи сборник.':'Набора пока нет. Сгенерируй карточки или открой сборник.';
    roundListKey=open&&round?`${key}:${listKind}`:null;listUsed=new Set(round?.used[listKind]||[]);
    roundList.setItems(open&&round?round.pack[listKind]:[],{anchor:roundPositions.get(roundListKey)||null});paintSelection();
  }
  function render(){
    if(destroyed)return;const info=sync(),busy=blocked();retryRenames();
    container.dataset.phase=phase;container.dataset.paused=String(paused);
    const current=round?.current,exhausted=!!round&&['truth','dare'].every(kind=>round.used[kind].length===round.pack[kind].length);
    if(copied&&(copied.key!==key||copied.kind!==current?.kind||copied.index!==current?.index||round?.pack[copied.kind]?.[copied.index]!==copied.text))resetCopy();
    const face=(pending?.current||current)?.kind||'truth';
    $('.truth-coin-core').style.transform=`rotateY(${face==='dare'?180:0}deg)`;
    $('.truth-coin').disabled=paused||busy||!round||!key||exhausted;
    $('.truth-coin').setAttribute('aria-label',phase==='flipping'?'Жетон подбрасывается':'Подбросить жетон');
    $('.truth-coin-hint').textContent=paused?'Пауза · коснись карточки':phase==='flipping'?'Жетон решает…':exhausted?'Все карточки открыты · ↶ — новый круг':current?`${round.selectionMode==='manual'?'Выбрано · ':''}${LABELS[current.kind]}`:'Подбрось жетон';
    for(const kind of ['truth','dare'])$('.truth-'+kind+'-count').textContent=`${LABELS[kind]} · ${round?round.pack[kind].length-round.used[kind].length:0}`;
    $('.truth-playing-card').dataset.kind=current?.kind||'closed';
    $('.truth-card-kind').textContent=current?LABELS[current.kind]:'Закрытая карточка';
    $('.truth-card-text').textContent=current?(current.index===null?'В этой стопке карточки закончились. Перебрось жетон или начни новый круг кнопкой ↶.':round.pack[current.kind][current.index]):round?'Карточки готовы. Нажми на жетон, чтобы открыть одну.':'Сначала сгенерируй карточки. Их количество и темы можно задать в промпте.';
    $('.truth-card-ornament').hidden=!!current;
    container.dataset.pane=mode;$('.truth-play').hidden=mode!=='play';$('.truth-editor').hidden=mode!=='prompt';$('.truth-collections').hidden=mode!=='collections';$('.truth-prompt-toggle').setAttribute('aria-expanded',String(mode==='prompt'));renderLibrary();libraryView.refresh();
    $('.truth-actions').hidden=mode!=='play';$('.truth-generate').hidden=mode!=='play';
    $('.truth-prompt-note').textContent=note;$('.truth-prompt-note').hidden=!note;
    $('.truth-generate').disabled=paused||busy||!info.available;
    $('.truth-generate').textContent=phase==='generating'?'Генерируем…':'Генерация карточек';
    $('.truth-clear').disabled=!round||busy;
    $('.truth-reset').disabled=busy||!round||!key||!['truth','dare'].some(kind=>round.used[kind].length>0);
    const hasCard=!!current&&current.index!==null,applied=hasCard&&sent(current.kind,current.index);
    $('.truth-apply').hidden=!hasCard||mode!=='play';
    $('.truth-card-tools').hidden=!hasCard;
    readLibrary();const favorite=hasCard&&favoriteKeys.has(truthLibraryCardKey({kind:current.kind,text:round.pack[current.kind][current.index]}));$('.truth-favorite').setAttribute('aria-pressed',String(favorite));$('.truth-favorite').setAttribute('aria-label',favorite?'Убрать из избранного':'В избранное');
    $('.truth-apply').disabled=paused||busy||info.busy||!info.canAppend||typeof bridge.appendTruthCard!=='function'||applied;
    $('.truth-apply').textContent=phase==='sending'?'Добавляем…':applied?'Добавлено':'В чат';
    $('.truth-status').textContent=error||renameError||(!key?MESSAGES.NO_CHAT:!info.available&&phase!=='generating'?MESSAGES[info.reason]||'':info.demo?'Предпросмотр: используются готовые примеры.':'');
    $('.truth-status').hidden=!$('.truth-status').textContent;
    onChange();
  }
  async function generate(){
    const info=sync();if(mode!=='play'||paused||blocked()||!info.available)return;
    const request=++serial;let token;
    try{
      token=bridge.capture();const prompt=truthPrompt(getPreset());phase='generating';error='';render();
      const raw=await bridge.generate(token,prompt,{responseLength:3600});
      if(destroyed||request!==serial)return;bridge.assertCurrent(token);
      roundPositions.clear();remember({version:1,pack:validateTruthPack(raw),used:{truth:[],dare:[]},current:null});clearSelection();phase='ready';render();
    }catch(e){if(destroyed||request!==serial)return;phase=round?'ready':'idle';error=textError(e);render();}
  }
  function flip(){
    sync();if(paused||blocked()||!round||!key||['truth','dare'].every(k=>round.used[k].length===round.pack[k].length))return;
    try{
      const start=round.current?.kind==='dare'?180:0;
      pending=nextTruthCard(round,cryptoSource);phase='flipping';error='';render();
      const core=$('.truth-coin-core'),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const target=pending.current.kind==='dare'?180:0,end=start+1440+(target-start+360)%360;
      if(!reduced&&typeof core.animate==='function')animation=core.animate([{transform:`translateY(0) rotateY(${start}deg)`},{transform:`translateY(-25px) rotateY(${start+720}deg)`,offset:.45},{transform:`translateY(0) rotateY(${end}deg)`}],{duration:flipDelay,easing:'cubic-bezier(.25,.6,.35,1)',fill:'forwards'});
      clock.queue();
    }catch(e){pending=null;phase=round?'ready':'idle';error=textError(e);render();}
  }
  function choose(kind,index){
    sync();if(paused||blocked()||!round||!key)return;
    try{remember(selectTruthCard(round,kind,index));mode='play';phase='ready';error='';render();}
    catch(e){error=textError(e);render();}
  }
  function reset(){
    sync();if(paused||blocked()||!round||!key||!['truth','dare'].some(kind=>round.used[kind].length>0))return;
    try{remember(resetTruthRound(round));clearSelection();clock.cancel();stopAnimation();pending=null;phase='ready';mode='play';error='';render();}
    catch(e){error=textError(e);render();}
  }
  async function apply(){
    const info=sync(),current=round?.current;
    if(paused||blocked()||!current||current.index===null||sent(current.kind,current.index)||info.busy||!info.canAppend||typeof bridge.appendTruthCard!=='function')return;
    const request=serial,{kind,index}=current;
    try{
      const token=bridge.capture(),next=truthRound(round);
      if(!next.choices[kind][index])next.choices[kind][index]={id:dndRollId(cryptoSource),applied:false};
      remember(next);const id=round.choices[kind][index].id,card={kind,text:round.pack[kind][index],selectionMode:round.selectionMode};
      phase='sending';error='';render();
      await bridge.appendTruthCard(token,card,id,{sender:sanitizeChatSender(getSender())});
      if(destroyed||request!==serial)return;
      const saved=truthRound(round);saved.choices[kind][index].applied=true;remember(saved);phase='ready';render();
    }catch(e){if(destroyed||request!==serial)return;phase=round?'ready':'idle';error=textError(e);render();}
  }
  function savePreset(reset=false){
    try{const value=validateDndPreset(reset?TRUTH_PRESET:$('.truth-prompt-text').value);onPresetChange(value);$('.truth-prompt-text').value=value;note='Сохранено. Применится при следующей генерации.';}catch(e){note=textError(e);}render();
  }
  function resume(){if(destroyed)return;visible=true;paused=false;sync();clock.setActive(true);animation?.play();render();}
  function activate(target){
    if(paused){if(!visible)return;resume();}
    if(target.closest('.truth-prompt-toggle')){clearSelection();libraryView.clearSelection();mode=mode==='prompt'?'play':'prompt';render();if(mode==='prompt')$('.truth-prompt-text').focus({preventScroll:true});}
    else if(target.closest('.truth-peek')){clearSelection();libraryView.clearSelection();mode=['cards','collections'].includes(mode)?'play':'cards';render();}
    else if(target.closest('.truth-open-collections')){clearSelection();mode='collections';libraryView.open();render();}
    else if(target.closest('.truth-add-all'))bulkAll();
    else if(target.closest('.truth-selection-cancel')&&!target.closest('.truth-collections')){clearSelection();render();}
    else if(target.closest('.truth-round-trash')){if(!blocked()&&selection.size){deleteSource={key,round,kind:selectionKind,indices:[...selection]};render();}}
    else if(target.closest('.truth-round-delete-no')){deleteSource=null;render();}
    else if(target.closest('.truth-round-delete-yes'))deleteCurrent();
    else if(target.closest('.truth-favorite'))favoriteCard(round?.current?.kind,round?.current?.index);
    else if(target.closest('[data-truth-favorite]')){const button=target.closest('[data-truth-favorite]');favoriteCard(button.dataset.kind,Number(button.dataset.truthFavorite));}
    else if(target.closest('.truth-copy-card'))void copyCard();
    else if(target.closest('.truth-reset')&&!$('.truth-reset').disabled)reset();
    else if(target.closest('[data-truth-kind]')){const next=target.closest('[data-truth-kind]').dataset.truthKind;if(listKind!==next)clearSelection();listKind=next;$('.truth-library-scroll').scrollTop=0;render();}
    else if(target.closest('[data-truth-choose]')){const button=target.closest('[data-truth-choose]');if(!button.disabled){if(selectionKind===button.dataset.kind&&selection.size)toggleSelection(button.dataset.kind,Number(button.dataset.truthChoose));else choose(button.dataset.kind,Number(button.dataset.truthChoose));}}
    else if(target.closest('.truth-generate')&&!$('.truth-generate').disabled)void generate();
    else if(target.closest('.truth-apply')&&!$('.truth-apply').disabled)void apply();
    else if(target.closest('.truth-coin')&&!$('.truth-coin').disabled)flip();
    else if(target.closest('.truth-prompt-save'))savePreset();
    else if(target.closest('.truth-prompt-reset'))savePreset(true);
    else if(libraryView.activate(target))return;
    else if(target.closest('.truth-clear')&&!$('.truth-clear').disabled){try{remember(null);clearSelection();phase='idle';error='';render();}catch(e){error=textError(e);render();}}
  }
  // A touch is handled on release. Consume its one compatibility click even
  // when Safari labels that click as a mouse event or omits its click count.
  container.addEventListener('pointerdown',e=>{
    cancelHold();lastTouch=null;const button=e.target.closest('button');if(e.isPrimary===false||e.button!==0&&e.pointerType!=='touch'&&e.pointerType!=='pen'||!button||button.disabled)return;
    if(['touch','pen'].includes(e.pointerType))touch={id:e.pointerId,x:e.clientX,y:e.clientY,button,moved:false};
    const roundCard=button.matches('[data-truth-choose]')&&mode==='cards'&&!blocked(),savedCard=mode==='collections'&&libraryView.canSelect(button);
    if(roundCard||savedCard){
      hold={id:e.pointerId,x:e.clientX,y:e.clientY,kind:button.dataset.kind,index:Number(button.dataset.truthChoose),savedId:button.dataset.truthEdit,key,round};
      const press=hold;holdTimer=setTimeout(()=>{
        holdTimer=null;if(hold!==press||press.key!==key||paused||!visible)return;
        if(press.savedId){if(mode!=='collections'||!libraryView.canSelect(button))return;press.fired=true;libraryView.toggleSelection(press.savedId);}
        else{if(press.round!==round||mode!=='cards'||blocked())return;press.fired=true;toggleSelection(press.kind,press.index);}
      },500);
    }
  },{signal});
  container.addEventListener('pointermove',e=>{if(touch?.id===e.pointerId&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touch.moved=true;if(hold?.id===e.pointerId&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>8)cancelHold(true);},{signal});
  container.addEventListener('pointercancel',()=>{cancelHold();touch=null;lastTouch=null;},{signal});
  container.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')cancelHold(true);},{signal});
  container.addEventListener('pointerup',e=>{const held=hold?.id===e.pointerId&&hold.fired;if(hold?.id===e.pointerId)cancelHold();if(held){touch=null;lastTouch={time:performance.now()};return;}if(touch?.id!==e.pointerId)return;const tap=touch;touch=null;if(!tap.moved){lastTouch={time:performance.now()};if(tap.button.isConnected&&!tap.button.disabled)activate(tap.button);}},{signal});
  container.addEventListener('contextmenu',e=>{if(e.target.closest('[data-truth-choose],[data-truth-edit]'))e.preventDefault();},{signal});
  container.addEventListener('scroll',e=>{if(e.target.closest?.('.truth-library-scroll,.truth-collection-scroll'))cancelHold(true);},{capture:true,passive:true,signal});
  container.addEventListener('keydown',e=>{
    lastTouch=null;cancelHold();const button=e.target.closest('[data-truth-choose],[data-truth-edit]');
    if(button&&e.shiftKey&&['Enter',' '].includes(e.key)){
      e.preventDefault();e.stopPropagation();if(button.dataset.truthEdit){if(libraryView.canSelect(button))libraryView.toggleSelection(button.dataset.truthEdit);}else toggleSelection(button.dataset.kind,Number(button.dataset.truthChoose));
    }else if(e.key==='Escape'&&((mode==='collections'&&libraryView.cancelSelection())||selection.size)){
      e.preventDefault();e.stopPropagation();if(mode==='cards'){if(deleteSource)deleteSource=null;else clearSelection();render();}
    }
  },{capture:true,signal});
  container.addEventListener('click',e=>{if(lastTouch&&performance.now()-lastTouch.time<900&&(e.isTrusted||e.detail>0)){lastTouch=null;e.preventDefault();e.stopImmediatePropagation();if(e.target.closest('.truth-saved-search-toggle,.truth-saved-search-clear,.truth-collection-search-toggle,.truth-collection-search-clear'))libraryView.focusSearch();return;}activate(e.target);},{capture:true,signal});
  container.addEventListener('input',e=>{if(e.target.matches('.truth-prompt-text')){note='Изменения не сохранены.';$('.truth-prompt-note').textContent=note;$('.truth-prompt-note').hidden=false;}},{signal});
  const unsubscribe=bridge.subscribe(change=>{if(!destroyed){try{followRename(change);}catch(e){error=textError(e);}render();}});
  render();
  return {resume,cancelSelection(){if(mode==='collections')return libraryView.cancelSelection();if(mode!=='cards'||!selection.size)return false;if(deleteSource)deleteSource=null;else clearSelection();render();return true;},pause(){if(destroyed)return;paused=true;cancelHold();touch=null;clock.setActive(false);animation?.pause();render();},hide(){this.pause();visible=false;clearSelection();libraryView.clearSelection();},focus(){$('.truth-prompt-toggle').focus({preventScroll:true});},get stateTag(){return paused?'paused':phase;},destroy(){destroyed=true;serial++;resetCopy();cancelHold();clock.destroy();stopAnimation();unsubscribe();roundList.destroy();libraryView.destroy();if(!provided)bridge.destroy?.();abort.abort();container.replaceChildren();}};
}

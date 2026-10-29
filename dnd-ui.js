import {DndError,dndErrorText,makeDndPrompt,validateDndTable,rollD20,dndRollId,sanitizeDndRound,DND_DEFAULT_PRESET,DND_RESPONSE_FORMAT,DND_PRESET_LIMIT,validateDndPreset,sanitizeDndPreset,dndSavedEvent} from './dnd.js';
import {createGameClock} from './game-clock.js';
import {createDemoStoryBridge} from './dnd-demo.js';
import {sanitizeChatSender} from './chat-message.js';
import {sanitizeDndLibrary,findDndLibraryCard,toggleDndFavorite,dndCollectionTable,addDndEventsToCollection,undoDndEventsCollection,dndLibraryError} from './dnd-library.js';
import {createDndLibraryView,DND_STAR_ICON,DND_FOLDER_ICON} from './dnd-library-ui.js';
import {createWindowedList} from './windowed-list.js';
import {createDndGestures} from './dnd-gestures.js';
import {createDndNumerals,sanitizeDndDieStyle,DND_WOOD_NUMERAL_ATLAS,DND_WOOD_SYMBOL_ATLAS} from './dnd-numerals.js';

const FOREST_D20=`<img class="dnd-die-art" width="512" height="512" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false"><svg class="dnd-number-layer" viewBox="0 0 160 160" aria-hidden="true"><text class="dnd-face-number" x="80" y="77.5" text-anchor="middle" dominant-baseline="central">?</text><g class="dnd-number-glyphs" hidden><svg overflow="hidden" preserveAspectRatio="none"><image/></svg><svg overflow="hidden" preserveAspectRatio="none"><image/></svg></g></svg>`;

export function createDndGame(container,{bridge:provided,sceneUrl=new URL('./assets/forest-stump-topdown.webp',import.meta.url).href,dieUrl=new URL('./assets/dnd-jade-die-v1.webp',import.meta.url).href,numeralsUrl,symbolsUrl,dieStyle='forest',woodDieUrl=new URL('./assets/dnd-wood-die-v1.webp',import.meta.url).href,woodNumeralsUrl=new URL('./assets/dnd-wood-numerals-v1.png',import.meta.url).href,woodSymbolsUrl=new URL('./assets/dnd-wood-symbols-v1.png',import.meta.url).href,getRound=()=>null,onRoundChange=()=>{},getPreset=()=>DND_DEFAULT_PRESET,onPresetChange=()=>{},getSender=()=>'narrator',getLibrary,onLibraryChange,onLibraryRoundChange,onChange=()=>{},cryptoSource=globalThis.crypto,rollDelay=850}={}){
  const bridge=provided||createDemoStoryBridge(),abort=new AbortController(),signal=abort.signal;
  container.innerHTML=`<div class="dnd-board"><div class="dnd-stage"><img class="dnd-scene" width="768" height="768" alt="Вид сверху на деревянный пенёк с годичными кольцами и мягким тёплым светом." loading="lazy" decoding="async" draggable="false"><button type="button" class="dnd-die" aria-label="Бросить d20">${FOREST_D20}</button><span class="dnd-roll-caption"></span></div>
  <section id="paw-dnd-table" class="dnd-event-table" hidden aria-label="Последние 20 событий"><div class="dnd-list-heading"><strong class="dnd-table-title">Текущий набор · 20</strong></div><div class="dnd-list-tools"><button type="button" class="dnd-collections-toggle" aria-label="Сборники событий" title="Сборники событий" aria-expanded="false">Сборники</button><button type="button" class="dnd-add-all truth-add-all">${DND_FOLDER_ICON}<span>Добавить все</span></button></div><div class="dnd-selection-tools" hidden><span class="dnd-picked-count"></span><button type="button" class="dnd-selection-cancel truth-selection-cancel" aria-label="Снять выделение" hidden>×</button></div><p class="dnd-list-hint"></p><p class="dnd-events-empty" hidden>Здесь появятся события. Можно открыть сохранённый сборник кнопкой с папкой.</p><div class="dnd-event-scroll"><ol></ol></div></section>
  <section id="paw-dnd-preset" class="dnd-preset-editor" hidden aria-label="Редактор пресета событий"><label for="paw-dnd-preset-text">Инструкции для новых событий</label><textarea id="paw-dnd-preset-text" class="dnd-preset-text" maxlength="${DND_PRESET_LIMIT}" spellcheck="false" aria-describedby="paw-dnd-preset-note"></textarea><details class="dnd-format"><summary>Обязательный формат ответа</summary><pre></pre></details><div class="dnd-preset-actions"><button type="button" class="dnd-preset-save">Сохранить</button><button type="button" class="dnd-preset-reset">По умолчанию</button></div><p id="paw-dnd-preset-note" class="dnd-preset-note" role="status" aria-live="polite"></p></section>
  <section class="dnd-collections truth-collections" hidden aria-label="Сборники событий ДНД"></section>
  <button type="button" class="dnd-preset-toggle" aria-expanded="false" aria-controls="paw-dnd-preset">Пресет</button><button type="button" class="dnd-peek" aria-label="Показать 20 событий" aria-expanded="false" aria-controls="paw-dnd-table" title="Показать или скрыть события">☷</button></div>
  <p class="dnd-status" role="status" aria-live="polite"></p><section class="dnd-outcome" hidden><div class="dnd-outcome-tools"><button type="button" class="dnd-favorite truth-mini" aria-label="В избранное" aria-pressed="false">${DND_STAR_ICON}</button></div><span class="dnd-result-label"></span><h3></h3><p></p></section><div class="dnd-actions" hidden><button type="button" class="dnd-generate" title="Сгенерировать новый набор из 20 событий по текущей истории">Сгенерировать</button><button type="button" class="dnd-apply" disabled>В чат</button></div>`;
  const $=s=>container.querySelector(s);$('.dnd-scene').src=sceneUrl;
  const appearances={forest:{die:dieUrl,numerals:{url:numeralsUrl,symbolsUrl}},wood:{die:woodDieUrl,numerals:{url:woodNumeralsUrl,symbolsUrl:woodSymbolsUrl,atlas:DND_WOOD_NUMERAL_ATLAS,symbolsAtlas:DND_WOOD_SYMBOL_ATLAS,center:{x:79,y:77}}}};
  let currentDieStyle=sanitizeDndDieStyle(dieStyle);container.dataset.dieStyle=currentDieStyle;$('.dnd-die-art').src=appearances[currentDieStyle].die;
  const numerals=createDndNumerals($('.dnd-number-layer'),appearances[currentDieStyle].numerals);
  function setDieStyle(value){const next=sanitizeDndDieStyle(value);if(destroyed||next===currentDieStyle)return;currentDieStyle=next;container.dataset.dieStyle=next;$('.dnd-die-art').src=appearances[next].die;numerals.setAppearance(appearances[next].numerals);}
  $('.dnd-preset-text').value=sanitizeDndPreset(getPreset());$('.dnd-format pre').textContent=DND_RESPONSE_FORMAT;
  let paused=true,visible=false,destroyed=false,phase='idle',key=null,revision=null,token=null,table=[],selected=null,rollId=null,choices={},selectionMode='random',peek=false,editor=false,error='',serial=0,stale=false;
  let collections=false,roundSource=null,bulk=null,picked=new Set(),localLibrary=sanitizeDndLibrary(null),libraryRaw=null,libraryCache=sanitizeDndLibrary(null);
  let presetNote='Общий для всех чатов. Изменит только новые генерации.';
  const blocked=()=>['generating','waiting','rolling','sending'].includes(phase);
  const inChat=id=>id&&(typeof bridge.dndEventInfo==='function'?!!bridge.dndEventInfo(id):token?.chat?.some(m=>m?.extra?.paw_arcade_dnd?.id===id));
  function readLibrary(){const raw=getLibrary?getLibrary():localLibrary;if(raw!==libraryRaw){libraryRaw=raw;libraryCache=sanitizeDndLibrary(raw);}return libraryCache;}
  function storeLibrary(next){onLibraryChange?.(next);localLibrary=next;libraryRaw=null;readLibrary();}
  function roundValue(nextBulk=bulk){return sanitizeDndRound({version:2,table,selectedRoll:selected?.roll??null,rollId,applied:phase==='applied',choices,selectionMode,sceneStamp:token.stamp,...(roundSource?{source:roundSource}:{}),...(nextBulk?{bulk:nextBulk}:{})});}
  function remember(){
    if(!token||!table.length)return;
    try{onRoundChange(key,roundValue());}catch{error='Набор доступен в этой вкладке, но сохранить его не удалось.';}
  }
  function rememberLibraryRound(nextLibrary,nextBulk){
    const nextRound=roundValue(nextBulk),previousLibrary=readLibrary();
    if(onLibraryRoundChange)onLibraryRoundChange(key,nextLibrary,nextRound);
    else{onLibraryChange?.(nextLibrary);try{onRoundChange(key,nextRound);}catch(e){try{onLibraryChange?.(previousLibrary);}catch{}throw e;}}
    localLibrary=nextLibrary;libraryRaw=null;readLibrary();bulk=nextBulk;
  }
  function restore(){
    try{
      const saved=sanitizeDndRound(getRound(key)),current=bridge.capture();if(current.key!==key)return false;
      token=current;table=saved.table;selected=saved.selectedRoll===null?null:table.find(event=>event.roll===saved.selectedRoll);roundSource=saved.source||null;bulk=saved.bulk||null;rollId=saved.rollId;choices=saved.choices;selectionMode=saved.selectionMode;stale=saved.sceneStamp!==current.stamp;
      if(selected&&bridge.chatSavePending?.('dnd',rollId)){choices[selected.roll].applied=false;stale=false;}
      if(selected&&inChat(rollId))choices[selected.roll].applied=true;
      phase=selected?(choices[selected.roll].applied?'applied':'result'):stale?'saved':'waiting';return true;
    }catch{return false;}
  }
  const clock=createGameClock(()=>{
    try{bridge.assertCurrent(token);chooseEvent(rollD20(cryptoSource),false);}
    catch(e){error=dndErrorText(e);phase='saved';render();}
  },rollDelay);
  function sync(){
    const info=bridge.info();
    if(key!==info.key||revision!==info.revision){serial++;clock.cancel();key=info.key;revision=info.revision;token=null;table=[];selected=null;rollId=null;choices={};roundSource=null;bulk=null;picked.clear();selectionMode='random';peek=false;editor=false;phase='idle';error='';stale=false;restore();}
    if(token&&phase!=='sending'&&!bridge.isCurrent(token)){
      stale=true;clock.cancel();
      if(['generating','waiting','rolling'].includes(phase)){serial++;if(!restore())phase=table.length===20?'saved':'idle';error=dndErrorText(new DndError('STALE'));}
    }
    return info;
  }
  const libraryView=createDndLibraryView($('.dnd-collections'),{getLibrary:readLibrary,onLibraryChange:storeLibrary,onChange,cryptoSource,isActive:()=>collections&&visible&&!destroyed,canPlay:()=>!paused&&!blocked()&&!!key,onBack(){collections=false;peek=true;editor=false;render();},onPlay(id){loadSaved(dndCollectionTable(readLibrary(),id,cryptoSource),{type:'collection',id,name:id==='all'?'Все события':id==='favorites'?'Избранное':readLibrary().collections.find(c=>c.id===id).name});},onPick(card){loadSaved([dndSavedEvent(card)],{type:'collection',id:card.id,name:'Сохранённое событие'},card.roll);}});
  let lastTableForList=null;
  const eventList=createWindowedList($('.dnd-event-scroll'),$('.dnd-event-table ol'),{keyFor:event=>event.roll,estimateHeight:105,overscan:20,renderItem(event){
    const item=document.createElement('li'),button=document.createElement('button'),title=document.createElement('strong'),body=document.createElement('p'),star=document.createElement('button');
    button.type='button';button.dataset.dndChoose=String(event.roll);button.className='truth-saved-edit';button.disabled=blocked()||bridge.info().busy||!key;button.setAttribute('aria-pressed',String(picked.size?picked.has(event.roll):event.roll===selected?.roll));button.dataset.selecting=String(picked.size>0);button.dataset.selected=String(picked.has(event.roll));button.title='Удерживай, чтобы выбрать несколько событий. Shift + Enter — выделить.';
    title.textContent=`${event.roll} / 20 · ${event.title}`+(choices[event.roll]?.applied||inChat(choices[event.roll]?.id)?' · добавлено':'');body.textContent=event.event;button.append(title,body);
    const favorite=findDndLibraryCard(readLibrary(),event)?.favorite===true;star.type='button';star.className='dnd-round-favorite truth-mini';star.dataset.dndFavorite=String(event.roll);star.innerHTML=DND_STAR_ICON;star.setAttribute('aria-pressed',String(favorite));star.setAttribute('aria-label',favorite?'Убрать из избранного':'В избранное');item.append(button,star);item.classList.toggle('rolled-event',event.roll===selected?.roll);return item;
  }});
  function togglePicked(button){if(!peek||blocked())return;const n=Number(button.dataset.dndChoose);if(!table.some(e=>e.roll===n))return;if(picked.has(n))picked.delete(n);else picked.add(n);render();}
  function favoriteEvent(event){if(!event)return;try{storeLibrary(toggleDndFavorite(readLibrary(),event,cryptoSource));error='';render();}catch(e){error=dndLibraryError(e);render();}}
  function loadSaved(events,source,chosen=null){
    sync();if(paused||blocked()||!key)throw new DndError('STALE');const nextToken=bridge.capture();clock.cancel();token=nextToken;table=events;roundSource=source;bulk=null;choices={};selected=chosen===null?null:table.find(e=>e.roll===chosen);rollId=selected?dndRollId(cryptoSource):null;if(selected)choices[selected.roll]={id:rollId,applied:false};selectionMode=selected?'manual':'random';stale=false;error='';phase=selected?'result':'waiting';peek=false;editor=false;collections=false;picked.clear();remember();render();animate();
  }
  function saveCurrent(){
    sync();if(!table.length||blocked())return;
    if(!picked.size&&bulk){try{rememberLibraryRound(undoDndEventsCollection(readLibrary(),table,bulk),null);error='';render();}catch(e){error=dndLibraryError(e);render();}return;}
    const sourceKey=key,sourceTable=table,rolls=picked.size?[...picked]:null;collections=true;peek=false;editor=false;
    libraryView.openBatch({count:rolls?.length||table.length,onCancel(){collections=false;peek=true;render();},onChoose(target){
      sync();if(key!==sourceKey||table!==sourceTable||blocked())throw new DndError('STALE');const added=addDndEventsToCollection(readLibrary(),table,target,cryptoSource,rolls);rememberLibraryRound(added.library,added.receipt);picked.clear();collections=false;peek=true;error='';render();
    }});render();
  }
  function showTable(info){
    const open=peek;$('.dnd-board').dataset.list=String(open);$('.dnd-board').dataset.editor=String(editor);$('.dnd-board').dataset.collections=String(collections);$('.dnd-stage').hidden=open||editor||collections;$('.dnd-event-table').hidden=!open||collections;$('.dnd-preset-editor').hidden=!editor||collections;$('.dnd-collections').hidden=!collections;$('.dnd-collections-toggle').setAttribute('aria-expanded',String(collections));
    $('.dnd-peek').setAttribute('aria-expanded',String(open));$('.dnd-peek').setAttribute('aria-label',open?'Вернуться к кубику':`Показать события: ${table.length}`);
    $('.dnd-preset-toggle').setAttribute('aria-expanded',String(editor));$('.dnd-preset-toggle').setAttribute('aria-label',editor?'Закрыть пресет и вернуться к кубику':'Открыть редактор пресета событий');
    $('.dnd-list-hint').textContent=stale?'Набор из прежней сцены. Выбери событие для текущего чата.':picked.size?'Выбери сборник для отмеченных событий.':'Нажми на событие или удерживай для выделения.';
    $('.dnd-table-title').textContent=`Текущий набор · ${table.length}`;$('.dnd-events-empty').hidden=table.length>0;$('.dnd-add-all').hidden=!table.length;$('.dnd-selection-tools').hidden=!picked.size;$('.dnd-list-hint').hidden=!table.length;$('.dnd-event-scroll').hidden=!table.length;$('.dnd-picked-count').textContent=picked.size?`Выбрано · ${picked.size}`:'';$('.dnd-selection-cancel').hidden=!picked.size;$('.dnd-add-all span').textContent=picked.size?'Добавить в…':bulk?'Отменить все':'Добавить все';$('.dnd-add-all').dataset.undo=String(!picked.size&&!!bulk);$('.dnd-add-all').disabled=blocked();
    if(open||lastTableForList!==table){eventList.setItems(table,{anchor:eventList.snapshot()});lastTableForList=table;}if(collections)libraryView.refresh();
    $('.dnd-preset-toggle').hidden=open||collections;$('.dnd-peek').hidden=collections;$('.dnd-collections-toggle').hidden=!open||collections;
  }
  function renderPresetNote(){ $('.dnd-preset-note').textContent=`${presetNote} ${$('.dnd-preset-text').value.length} / ${DND_PRESET_LIMIT}`; }
  function render(){
    if(destroyed)return;const info=sync();
    container.dataset.phase=phase;container.dataset.paused=String(paused);
    numerals.setValue(phase==='generating'?'…':phase==='rolling'?'·':selected?String(selected.roll):'?');
    $('.dnd-die').disabled=blocked()||table.length!==20||info.busy||!key;
    $('.dnd-die').setAttribute('aria-label',selected?`${selectionMode==='manual'?'Выбран результат':'Результат d20'}: ${selected.roll} из 20. Перебросить по текущим событиям.`:'Перебросить d20 по текущим 20 событиям');$('.dnd-die').title=table.length===20?'Перебросить по тем же 20 событиям':'Сначала сгенерируй 20 событий или загрузи полный сборник';
    const favorite=selected&&findDndLibraryCard(readLibrary(),selected)?.favorite===true;$('.dnd-favorite').setAttribute('aria-pressed',String(!!favorite));$('.dnd-favorite').setAttribute('aria-label',favorite?'Убрать из избранного':'В избранное');
    $('.dnd-generate').disabled=blocked()||!info.available;$('.dnd-generate').textContent=phase==='generating'?'Генерация…':'Сгенерировать';
    $('.dnd-apply').disabled=phase!=='result'||!selected||stale||info.busy||!info.canAppend;
    $('.dnd-apply').textContent=phase==='sending'?'Добавляем…':phase==='applied'?'Добавлено':'В чат';
    $('.dnd-peek').disabled=false;showTable(info);renderPresetNote();
    $('.dnd-roll-caption').textContent=phase==='rolling'?'Бросаем d20':selected?`${selectionMode==='manual'?'Выбрано':'d20'} · ${selected.roll} / 20`:'';
    let status=error;
    if(!status)status=phase==='generating'?(info.demo?'Готовим пример набора событий…':'Модель готовит 20 событий по текущей истории…'):phase==='waiting'?'Набор готов. Открой игру, чтобы завершить бросок.':phase==='rolling'?'Пусть кубик решит.':phase==='sending'?'Добавляем одно событие в текущий чат…':stale?'История изменилась. Выбери старое событие вручную, перебрось по тому же набору или сгенерируй новый набор.':phase==='applied'?'Событие уже в чате. Можно перебросить по тому же набору или выбрать другое из списка.':!key?dndErrorText(new DndError('NO_CHAT')):paused?'Пауза · коснись пенька, чтобы продолжить.':selected?info.demo?'Демо: пример события. Можно перебросить или выбрать другое.':selectionMode==='manual'?'Выбрано вручную. Проверь событие и нажми «В чат».':'Добавь событие в чат или перебрось по тому же набору.':!info.available?dndErrorText(new DndError(info.reason)):info.demo?'Демо: нажми «Сгенерировать» для примера набора.':'Сгенерируй события кнопкой внизу или загрузи сборник.';
    const alternative=peek||editor||collections;
    $('.dnd-status').textContent=status;$('.dnd-status').hidden=alternative;$('.dnd-outcome').hidden=!selected||alternative;
    $('.dnd-result-label').textContent=selected?`${selectionMode==='manual'?'Выбрано вручную · ':''}${selected.roll} / 20${selected.roll===1?' · Серьёзная неприятность':selected.roll===20?' · Особый поворот':''}`:'';
    $('.dnd-outcome h3').textContent=selected?.title||'';$('.dnd-outcome p').textContent=selected?.event||'';
    $('.dnd-actions').hidden=alternative;
    onChange();
  }
  function chooseEvent(n,manual=true){
    const info=sync();if(paused||!table.length||!Number.isInteger(n)||n<1||n>20)return;
    if(manual&&(blocked()||info.busy||!key))return;
    if(!manual&&phase!=='rolling')return;
    try{
      if(manual){const current=bridge.capture();if(current.key!==key)throw new DndError('STALE');token=current;}
      else bridge.assertCurrent(token);
      if(!table.some(e=>e.roll===n))return;
      const choice=choices[n]||{id:dndRollId(cryptoSource),applied:false};
      if(inChat(choice.id))choice.applied=true;
      choices[n]=choice;selected=table.find(e=>e.roll===n);rollId=choice.id;selectionMode=manual?'manual':'random';stale=false;phase=choice.applied?'applied':'result';peek=false;editor=false;error='';remember();render();
    }catch(e){error=dndErrorText(e);render();}
  }
  function savePreset(reset=false){
    try{
      const preset=validateDndPreset(reset?DND_DEFAULT_PRESET:$('.dnd-preset-text').value);
      onPresetChange(preset);$('.dnd-preset-text').value=preset;presetNote=reset?'Стандартный пресет восстановлен.':'Сохранено. Применится при следующей генерации.';
    }catch(e){presetNote=e instanceof DndError?dndErrorText(e):'Не удалось сохранить пресет. Попробуй ещё раз.';}
    renderPresetNote();
  }
  function animate(){if(phase==='waiting'&&table.length===20&&!paused&&visible){phase='rolling';clock.queue();render();}}
  function reroll(){
    const info=sync();if(paused||blocked()||info.busy||!key||table.length!==20)return;
    try{
      const current=bridge.capture();if(current.key!==key)throw new DndError('STALE');
      // Keep the previous outcome in place until the die settles. Collapsing it on
      // pointerup could move the controls before the browser's compatibility click.
      token=current;stale=false;peek=false;editor=false;error='';phase='waiting';
      render();animate();
    }catch(e){error=dndErrorText(e);render();}
  }
  async function prepare(){
    const info=sync();if(paused||!info.available||blocked())return;
    const request=++serial;
    try{
      token=bridge.capture();key=token.key;
      const prompt=makeDndPrompt(getPreset());phase='generating';selected=null;rollId=null;table=[];choices={};roundSource=null;bulk=null;picked.clear();selectionMode='random';peek=false;editor=false;error='';stale=false;render();
      const raw=await bridge.generate(token,prompt);
      if(destroyed||request!==serial)return;bridge.assertCurrent(token);
      table=validateDndTable(raw);phase='waiting';remember();render();animate();
    }catch(e){if(destroyed||request!==serial)return;clock.cancel();if(!restore())phase='idle';error=dndErrorText(e);render();animate();}
  }
  async function apply(){
    if(paused||phase!=='result'||!selected||stale)return;const request=serial;
    try{
      bridge.assertCurrent(token);const sender=sanitizeChatSender(getSender());phase='sending';error='';render();await bridge.append(token,selected,rollId,{sender});if(destroyed||request!==serial)return;
      const current=bridge.capture();if(current.key!==key){render();return;}token=current;choices[selected.roll].applied=true;phase='applied';remember();render();
    }catch(e){
      if(destroyed||request!==serial)return;
      // Our own appended message changes the snapshot even if its native save
      // failed. A retry saves that same message, without another story request.
      if(bridge.chatSavePending?.('dnd',rollId))try{const current=bridge.capture();if(current.key===key&&current.chat===token?.chat){token=current;stale=false;}}catch{}
      phase='result';error=dndErrorText(e);render();
    }
  }
  function resume(){if(destroyed)return;visible=true;paused=false;sync();clock.setActive(true);animate();render();}
  const unsubscribe=bridge.subscribe(()=>{if(!destroyed)render();});
  // Resume controls on click: changing the DOM during touchstart can suppress a native tap.
  container.addEventListener('keydown',e=>{if(paused&&visible&&!e.target.closest('button,.dnd-collections'))resume();},{capture:true,signal});
  container.addEventListener('input',e=>{if(e.target.matches('.dnd-preset-text')){presetNote='Изменения не сохранены.';renderPresetNote();}},{signal});
  function activate(target){
    if(target.closest('.dnd-collections'))return;
    if(paused){if(!visible)return;resume();}
    if(target.closest('.dnd-collections-toggle')){if(!peek)return;collections=true;editor=false;libraryView.open();render();}
    else if(target.closest('.dnd-favorite'))favoriteEvent(selected);
    else if(target.closest('.dnd-add-all'))saveCurrent();
    else if(target.closest('.dnd-selection-cancel')){picked.clear();render();}
    else if(target.closest('[data-dnd-favorite]'))favoriteEvent(table.find(e=>e.roll===Number(target.closest('[data-dnd-favorite]').dataset.dndFavorite)));
    else if(target.closest('.dnd-die')&&!$('.dnd-die').disabled)reroll();
    else if(target.closest('.dnd-generate')&&!$('.dnd-generate').disabled)void prepare();
    else if(target.closest('.dnd-apply')&&!$('.dnd-apply').disabled)void apply();
    else if(target.closest('.dnd-peek')&&!$('.dnd-peek').disabled){peek=!peek;editor=false;collections=false;picked.clear();render();}
    else if(target.closest('.dnd-preset-toggle')){editor=!editor;peek=false;collections=false;picked.clear();render();if(editor)$('.dnd-preset-text').focus({preventScroll:true});}
    else if(target.closest('.dnd-preset-save'))savePreset();
    else if(target.closest('.dnd-preset-reset'))savePreset(true);
    else{const button=target.closest('[data-dnd-choose]');if(button&&!button.disabled){if(picked.size)togglePicked(button);else chooseEvent(Number(button.dataset.dndChoose));}}
  }
  const gestures=createDndGestures(container,{activate,canSelect:button=>!!button&&peek&&!blocked()&&button.matches('[data-dnd-choose]'),toggleSelection:togglePicked,isActive:()=>visible&&!destroyed,ignore:target=>!!target.closest('.dnd-collections'),signal});
  render();
  return {resume,setDieStyle,pause(){if(destroyed)return;gestures.cancel();libraryView.cancelGestures();paused=true;clock.setActive(false);render();},hide(){this.pause();visible=false;},cancelSelection(){if(collections)return libraryView.cancelSelection();if(picked.size){picked.clear();render();return true;}return false;},focus(){(collections?$('.truth-collection-back'):editor?$('.dnd-preset-text'):peek?$('.dnd-peek'):$('.dnd-die').disabled?$('.dnd-generate'):$('.dnd-die')).focus({preventScroll:true});},get stateTag(){return paused?'paused':phase;},destroy(){destroyed=true;serial++;gestures.cancel();eventList.destroy();libraryView.destroy();numerals.destroy();clock.destroy();unsubscribe();if(!provided)bridge.destroy?.();abort.abort();container.replaceChildren();}};
}

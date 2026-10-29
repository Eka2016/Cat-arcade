import {GAME_REPORT_TITLES,sanitizeGameReport,sanitizeGameResult,gameReportText} from './game-report.js';
import {dndRollId} from './dnd.js';
import {sanitizeChatSender} from './chat-message.js';
import {copyArcadeText} from './clipboard.js';
import {createGameFooter} from './game-footer.js';

const RESULT_LABELS={win:'победа',loss:'поражение',draw:'ничья'};
const COPY_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
const COPIED_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4 10-10"/></svg>';
const SEND_ERRORS={BUSY:'Дождись завершения текущего запроса в Таверне.',STALE:'Чат изменился. Результат не отправлен в другой чат.',NO_CHAT:'Открой чат, в котором началась партия.',NO_APPEND:'Таверна не предоставляет добавление сообщения.',APPEND:'Не удалось завершить добавление. Проверь чат перед повторной попыткой.'};
const REPLY_NOTES={DRAFT:'Отчёт в чате. Черновик сохранён; очисти поле ввода, когда будешь готова, и нажми «Повторить ответ».',BUSY:'Отчёт в чате. Дождись завершения другого ответа и повтори попытку.',OFFLINE:'Отчёт в чате. Подключи модель и нажми «Повторить ответ».',NO_API:'Отчёт в чате. Ответ можно запустить обычной кнопкой Таверны.',STALE:'После итога чат изменился. Ответ не запущен; продолжи текущую сцену обычной кнопкой Таверны.'};

/** One latest completed report per game/chat; no model calls while playing or restoring. */
export function createGameReportManager({bridge,getReport=()=>null,onReportChange=()=>{},getReply=()=>true,onReplyChange=()=>{},getSender=()=>'narrator',copyText=copyArcadeText,onChange=()=>{},cryptoSource=globalThis.crypto}={}){
  const channels=new Map();let destroyed=false;
  const info=()=>bridge.gameInfo?.()||bridge.info();
  const renderAll=()=>{if(!destroyed)for(const channel of channels.values())channel.render();};
  const unsubscribe=bridge.subscribe(change=>{
    if(change?.type==='chat-renamed')for(const channel of channels.values())channel.rename(change.fromKey,change.toKey);
    renderAll();
  });
  function channel(kind){
    if(channels.has(kind))return channels.get(kind);
    if(!Object.hasOwn(GAME_REPORT_TITLES,kind))throw Error('Unknown game report');
    const abort=new AbortController(),signal=abort.signal;
    const closed=()=>destroyed||signal.aborted;
    let element=null,footerElement=null,ownsFooter=false,originKey=null,finishedKey=null,localRecord=null,busy=false,note='',noteKey=null,noteId=null;
    let liveJournal='',liveCount=0,includeJournal=false,includeId=null,cachedSource=null,cachedRecord=null,activeSend=null;
    const copyTimers=new Map();
    function read(key){try{const source=getReport(key,kind);if(source&&source===cachedSource)return cachedRecord;const record=sanitizeGameReport(source);cachedSource=source;cachedRecord=record;return record;}catch{return localRecord&&finishedKey===key?localRecord:null;}}
    function save(key,record){if(closed())return;localRecord=record;finishedKey=key;onReportChange(key,record);}
    const isSent=record=>typeof bridge.hasGameReport==='function'?bridge.hasGameReport(record.id):record.sent;
    function render(){
      if(!element||closed())return;
      const state=info(),record=read(state.key),live=liveCount>0&&originKey===state.key;
      // Preferences belong to the game UI, even in a new chat without a report.
      element.hidden=false;
      const $=s=>element.querySelector(s);
      const expanded=$('.game-report-settings').open;
      $('.game-report-preview').hidden=!record;$('.game-report-controls').hidden=false;
      $('.game-report-reply').checked=getReply();$('.game-report-reply').disabled=busy;
      $('.game-report-send').hidden=!record;
      $('.game-report-full-label').hidden=!record?.journal;
      if(!record){
        includeId=null;includeJournal=false;
        $('.game-report-preview pre').textContent='';
        $('.game-report-full').checked=false;$('.game-report-full').disabled=true;
        $('.game-report-send').disabled=true;$('.game-report-send').textContent='Отправить в чат';
      }
      const journal=live?liveJournal:record?.journal||'',journalCount=live?liveCount:record?.journalEntries||0;
      $('.game-journal').hidden=!journal;
      $('.game-copy-summary').disabled=!record;$('.game-copy-journal').disabled=!journal;
      const entryWord=journalCount%10===1&&journalCount%100!==11?'запись':journalCount%10>=2&&journalCount%10<=4&&(journalCount%100<12||journalCount%100>14)?'записи':'записей';
      $('.game-journal summary').textContent=`${live&&record?.journal!==liveJournal?'Журнал текущей партии':'Полный журнал партии'} · ${journalCount} ${entryWord}`;
      $('.game-journal pre').textContent=expanded&&$('.game-journal').open?journal:'';
      if(record){
        if(includeId!==record.id){includeJournal=record.sentWithJournal===true;includeId=record.id;}
        const sent=isSent(record);
        // A native save may finish after this view replaced a destroyed one.
        // Read the message's real options without restoring the old settings.
        const saved=sent?bridge.gameReportInfo?.(record.id):null;
        if(typeof saved?.fullJournal==='boolean')includeJournal=saved.fullJournal;
        $('.game-report-preview summary').textContent=`Последний итог · ${RESULT_LABELS[record.outcome]}`;
        $('.game-report-preview pre').textContent=expanded&&$('.game-report-preview').open?gameReportText(record,{forChat:true,includeJournal}):'';
        $('.game-report-full').checked=includeJournal;$('.game-report-full').disabled=busy||sent;
        const button=$('.game-report-send'),canReply=state.canReply??(typeof bridge.replyToGameReport==='function'&&!state.demo);
        button.disabled=busy||state.busy||(sent?(!getReply()||!canReply):!state.canAppend);
        button.textContent=busy?'Отправляем…':sent?(getReply()?'Повторить ответ':'Отправлено в чат'):'Отправить в чат';
      }
      const status=noteKey===state.key&&note&&(!noteId||noteId===record?.id)?note:'';
      $('.game-report-status').textContent=status;$('.game-report-status').hidden=!status;
      onChange();
    }
    async function send(){
      if(closed())return;
      const state=info(),record=read(state.key);
      if(busy||!record||state.busy)return;
      const sent=isSent(record);if(sent?!getReply():!state.canAppend)return;
      let added=sent;const request={key:state.key},wantReply=getReply(),fullJournal=includeJournal,sender=sanitizeChatSender(getSender());activeSend=request;busy=true;note='';noteKey=request.key;noteId=record.id;render();
      try{
        const token=bridge.capture();if(token.key!==request.key)return;
        const result=sent?{added:true}:await bridge.appendGameReport(token,record,{includeJournal:fullJournal,sender});added=result.added===true;
        // Let the already-started native chat save finish, but discard this
        // owner's continuation after disable, deletion or data cleanup.
        if(closed())return;
        if(added){
          const saved=bridge.gameReportInfo?.(record.id),updated={...record,sent:true,sentWithJournal:saved?.fullJournal??fullJournal,sentAs:saved?.sender??(sent?record.sentAs:sender)};
          try{if(read(request.key)?.id===record.id){if(includeId===record.id)includeJournal=updated.sentWithJournal;save(request.key,updated);}}catch{note='Результат добавлен. Не удалось сохранить отметку; повторное добавление проверяется по сообщению чата.';}
          if(wantReply&&!closed()){
            const reply=await bridge.replyToGameReport(token,record.id,{retry:sent||result.duplicate===true});
            note=reply.stopped?'Генерация остановлена. Итог сохранён в чате; можно нажать «Повторить ответ».':reply.started?'':REPLY_NOTES[reply.reason]||'';
          }
        }
      }catch(error){if(!closed())note=added?'Итог в чате, но получить ответ не удалось. Нажми «Повторить ответ»; итог не добавится второй раз.':SEND_ERRORS[error?.code]||'Не удалось отправить результат. Проверь чат перед повторной попыткой.';}
      finally{busy=false;activeSend=null;if(!closed()){noteKey=request.key;noteId=record.id;render();}}
    }
    async function copy(full){
      if(closed())return;
      const state=info(),record=read(state.key),live=liveCount>0&&originKey===state.key;
      const text=full?(live?liveJournal:record?.journal):record?gameReportText(record,{forChat:true,includeJournal}):'';
      if(!text)return;
      const key=state.key,id=record?.id;
      try{
        await copyText(text,{container:element});if(closed())return;
        const button=element.querySelector(full?'.game-copy-journal':'.game-copy-summary');
        clearTimeout(copyTimers.get(button));button.innerHTML=COPIED_ICON;button.dataset.copied='true';button.setAttribute('aria-label','Скопировано');
        copyTimers.set(button,setTimeout(()=>{copyTimers.delete(button);if(destroyed)return;button.innerHTML=COPY_ICON;delete button.dataset.copied;button.setAttribute('aria-label',full?'Копировать полный журнал':'Копировать последний итог');},1400));
      }catch{if(closed())return;note='Копирование недоступно. Раскрой текст и скопируй его вручную.';noteKey=key;noteId=id;render();}
    }
    const api={
      rename(from,to){
        if(closed())return;
        if(originKey===from)originKey=to;
        if(finishedKey===from)finishedKey=to;
        if(noteKey===from)noteKey=to;
        if(activeSend?.key===from)activeSend.key=to;
      },
      begin(){if(closed())return;originKey=bridge.info().key;note='';noteKey=null;noteId=null;},
      updateJournal(text,count){if(closed())return;liveJournal=text;liveCount=count;render();},
      finish(raw){
        if(closed()||!raw)return;
        try{
          const result=sanitizeGameResult(raw),record=sanitizeGameReport({version:1,id:dndRollId(cryptoSource),...result,sent:false});
          if(!originKey)return;
          save(originKey,record);note='';noteKey=originKey;noteId=null;
        }catch{note='Не удалось сохранить итог партии для чата.';noteKey=originKey;}
        render();
      },
      attach(container){
        if(closed())return;
        element=document.createElement('section');element.className='game-report';element.hidden=true;
        element.setAttribute('aria-label',`${GAME_REPORT_TITLES[kind]}: результат для чата`);
        element.innerHTML=`<details class="game-report-settings"><summary>Настройки</summary><div class="game-report-settings-body"><details class="game-journal"><summary>Полный журнал партии</summary><div class="game-report-text"><button type="button" class="game-report-copy game-copy-journal" data-report-action="journal" aria-label="Копировать полный журнал" title="Копировать полный журнал">${COPY_ICON}</button><pre></pre></div></details><details class="game-report-preview"><summary>Итог для чата</summary><div class="game-report-text"><button type="button" class="game-report-copy game-copy-summary" data-report-action="summary" aria-label="Копировать последний итог" title="Копировать последний итог">${COPY_ICON}</button><pre></pre></div></details><div class="game-report-controls"><div class="game-report-options"><label title="После добавления итога вызвать обычный ответ персонажа через Таверну"><input type="checkbox" class="game-report-reply"> Ответ персонажа</label><label class="game-report-full-label"><input type="checkbox" class="game-report-full"> Весь журнал в чат</label></div><button type="button" class="game-report-send" data-report-action="send">Отправить в чат</button></div></div></details><p class="game-report-status" role="status" aria-live="polite"></p>`;
        ownsFooter=!container.querySelector(':scope > .game-footer');footerElement=createGameFooter(container,{signal});footerElement.prepend(element);
        element.addEventListener('change',e=>{if(e.target.matches('.game-report-reply')){try{onReplyChange(e.target.checked);}catch{note='Не удалось сохранить настройку ответа.';noteKey=info().key;}renderAll();}else if(e.target.matches('.game-report-full')){includeJournal=e.target.checked;render();}},{signal});
        element.addEventListener('toggle',e=>{if(e.target.matches('.game-report-settings,.game-journal,.game-report-preview'))render();},{capture:true,signal});
        // Keep report controls separate from game resume/new-round click handlers.
        function activate(button){if(!button||button.disabled)return;const action=button.dataset.reportAction;if(action==='send')void send();else if(action==='journal'||action==='summary')void copy(action==='journal');}
        element.addEventListener('click',e=>{e.stopPropagation();activate(e.target.closest('[data-report-action]'));},{signal});
        let touch=null,lastTouch=-Infinity;
        element.addEventListener('pointerdown',e=>{
          if(e.isPrimary!==false){touch=null;lastTouch=-Infinity;}
          e.stopPropagation();const button=e.target.closest('[data-report-action]');if(e.isPrimary!==false&&['touch','pen'].includes(e.pointerType)&&button&&!button.disabled)touch={id:e.pointerId,x:e.clientX,y:e.clientY,button,moved:false};
        },{signal});
        element.addEventListener('pointermove',e=>{if(touch?.id===e.pointerId&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touch.moved=true;},{signal});
        element.addEventListener('pointercancel',()=>{touch=null;lastTouch=-Infinity;},{signal});
        element.addEventListener('keydown',()=>{lastTouch=-Infinity;},{signal});
        element.addEventListener('pointerup',e=>{if(touch?.id!==e.pointerId)return;const tap=touch;touch=null;if(!tap.moved&&tap.button.isConnected){lastTouch=performance.now();activate(tap.button);}},{signal});
        element.addEventListener('click',e=>{if((e.isTrusted||e.detail>0)&&e.target.closest('[data-report-action]')&&performance.now()-lastTouch<800){lastTouch=-Infinity;e.preventDefault();e.stopImmediatePropagation();}},{capture:true,signal});
        render();
      },
      render,
      destroy(){for(const timer of copyTimers.values())clearTimeout(timer);copyTimers.clear();abort.abort();element?.remove();if(ownsFooter)footerElement?.remove();},
    };
    channels.set(kind,api);return api;
  }
  return {channel,refresh:renderAll,destroy(){destroyed=true;unsubscribe();for(const item of channels.values())item.destroy();channels.clear();}};
}

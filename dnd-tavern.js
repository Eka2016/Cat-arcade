import {DndError,dndChatText,dndSceneStamp} from './dnd.js';
import {sanitizeGameReport,gameReportChatText} from './game-report.js';
import {arcadeChatMessage,sanitizeChatSender} from './chat-message.js';
import {truthChatText} from './truth-dare.js';
import {createIdleSave} from './idle-save.js';

// Weak references keep an unsaved native message recognizable across an
// extension disable/enable cycle without storing chat content anywhere else.
const appendStages=new WeakMap();
const pendingSaves=new WeakSet(),activeChatSaves=new WeakSet(),saveObservers=new Set();

/** Only public chat/generation APIs are accessed. No transport, secrets, or connection settings. */
export function createTavernStoryBridge({getContext=()=>globalThis.SillyTavern?.getContext?.(),document:doc=globalThis.document}={}){
  let destroyed=false,inFlight=false,generating=false,sending=false,chatRevision=0,stops=0,active=true,dirty=false;
  const listeners=new Set(),subscriptions=[];
  const context=()=>{try{return getContext()||null;}catch{return null;}};
  const idleSave=createIdleSave({isBusy:()=>busy(context()),onError:()=>console.warn('[Paw Arcade] Не удалось сохранить настройки после завершения генерации.')});
  const notify=change=>{
    if(destroyed)return;idleSave.wake();
    if(!active&&!['chat-renamed','chat-changed'].includes(change?.type)){dirty=true;return;}
    for(const fn of listeners)try{fn(change);}catch{ /* A view callback must not alter a generation. */ }
  };
  saveObservers.add(notify);
  function identity(ctx){
    if(!ctx||!Array.isArray(ctx.chat))return null;
    const id=typeof ctx.getCurrentChatId==='function'?ctx.getCurrentChatId():ctx.chatId;
    if(id===undefined||id===null||id==='')return null;
    const group=!!ctx.groupId;
    const owner=group?ctx.groupId:ctx.characters?.[ctx.characterId]?.avatar??ctx.characterId;
    if(owner===undefined||owner===null)return null;
    return `${group?'group':'character'}:${String(owner)}:${String(id)}`;
  }
  function signature(ctx){return JSON.stringify(ctx.chat.map(m=>[m?.mes??'',!!m?.is_user,!!m?.is_system,m?.swipe_id??0]));}
  function busy(ctx){
    if(generating||inFlight||sending||ctx?.streamingProcessor?.isFinished===false||activeChatSaves.has(ctx?.chat))return true;
    const stop=doc?.querySelector?.('#mes_stop, #stop_but');
    return !!(stop&&!stop.hidden&&stop.getClientRects?.().length&&doc.defaultView?.getComputedStyle(stop).display!=='none');
  }
  const initial=context(),events=initial?.eventTypes||initial?.event_types,source=initial?.eventSource;
  function bind(name,fn){const type=events?.[name];if(type&&typeof source?.on==='function'){source.on(type,fn);subscriptions.push([type,fn]);}}
  bind('GENERATION_STARTED',(_type,_options,dryRun)=>{if(!dryRun){generating=true;notify();}});
  for(const name of ['GENERATION_ENDED','GENERATION_STOPPED'])bind(name,()=>{generating=false;notify();});
  bind('GENERATION_STOPPED',()=>{stops++;});
  bind('CHAT_CHANGED',()=>{chatRevision++;notify({type:'chat-changed'});});
  bind('CHAT_RENAMED',change=>{
    if(!change||typeof change.oldFileName!=='string'||typeof change.newFileName!=='string')return;
    const group=!!change.groupId,owner=group?change.groupId:change.avatarId;
    if(!['string','number'].includes(typeof owner)||String(owner)==='')return;
    // The public event includes the JSONL suffix; chatId does not.
    const from=change.oldFileName.replace(/\.jsonl$/i,''),to=change.newFileName.replace(/\.jsonl$/i,'');
    if(!from||!to||from===to)return;
    const prefix=`${group?'group':'character'}:${String(owner)}:`;
    if((prefix+from).length>2048||(prefix+to).length>2048)return;
    if([prefix+from,prefix+to].includes(identity(context())))chatRevision++;
    notify({type:'chat-renamed',fromKey:prefix+from,toKey:prefix+to});
  });
  for(const name of ['MESSAGE_SENT','MESSAGE_RECEIVED','MESSAGE_EDITED','MESSAGE_UPDATED','MESSAGE_DELETED','MESSAGE_SWIPED'])bind(name,()=>{if(generating){dirty=true;return;}notify();});
  function capture(){
    if(destroyed)throw new DndError('CLOSED');
    const ctx=context(),key=identity(ctx);if(!key)throw new DndError('NO_CHAT');
    const snapshot=signature(ctx);
    return Object.freeze({key,revision:chatRevision,chat:ctx.chat,signature:snapshot,stamp:dndSceneStamp(snapshot)});
  }
  function isCurrent(token){try{const ctx=context();return !destroyed&&!!token&&token.revision===chatRevision&&identity(ctx)===token.key&&ctx.chat===token.chat&&signature(ctx)===token.signature;}catch{return false;}}
  function assertCurrent(token){if(!isCurrent(token))throw new DndError('STALE');}
  function info(){
    const ctx=context(),key=identity(ctx),pending=busy(ctx);
    const reason=!key?'NO_CHAT':typeof ctx.generateQuietPrompt!=='function'?'NO_API':ctx.onlineStatus==='no_connection'?'OFFLINE':pending?'BUSY':null;
    return {key,revision:chatRevision,available:!reason,reason,busy:pending,demo:false,canAppend:!!key&&typeof ctx?.addOneMessage==='function'&&typeof ctx?.saveChat==='function'};
  }
  const messageFor=(kind,id)=>typeof id==='string'?context()?.chat?.find(m=>m?.extra?.['paw_arcade_'+kind]?.id===id):null;
  function savedInfo(kind,id){const message=messageFor(kind,id);return message&&!pendingSaves.has(message)?message.extra['paw_arcade_'+kind]:null;}
  async function appendMessage(token,kind,id,build){
    const ctx=context();
    if(destroyed||!token||identity(ctx)!==token.key||ctx.chat!==token.chat)throw new DndError('STALE');
    if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))throw new DndError('APPEND');
    const existing=messageFor(kind,id);
    if(existing&&!pendingSaves.has(existing))return {added:true,duplicate:true};
    assertCurrent(token);if(busy(ctx))throw new DndError('BUSY');
    if(typeof ctx.addOneMessage!=='function'||typeof ctx.saveChat!=='function')throw new DndError('NO_APPEND');
    const message=existing||build();sending=true;activeChatSaves.add(token.chat);notify();
    try{
      assertCurrent(token);
      if(!existing){ctx.chat.push(message);pendingSaves.add(message);}
      if(ctx.chatMetadata)ctx.chatMetadata.tainted=true;
      let stages=appendStages.get(message);
      if(!stages){stages={announced:false,renderAttempted:false,rendered:false,renderAnnounced:false};appendStages.set(message,stages);}
      const assertOwner=(allowDestroyed=false)=>{
        const current=context();
        if((destroyed&&!allowDestroyed)||token.revision!==chatRevision||identity(current)!==token.key||current?.chat!==token.chat||!token.chat.includes(message))throw new DndError('STALE');
      };
      const emit=(name,...args)=>{
        const type=events?.[name];if(!type||typeof source?.emit!=='function')return null;
        try{return Promise.resolve(source.emit(type,...args)).catch(()=>{});}catch{return null;}
      };
      const bot=!message.is_user&&message.extra?.type!=='narrator';
      if(!stages.announced){
        stages.announced=true;
        const result=emit(bot?'MESSAGE_RECEIVED':'MESSAGE_SENT',ctx.chat.indexOf(message),...(bot?['command']:[]));
        if(result)await result;
      }
      assertOwner();
      // A renderer may insert DOM before throwing; never render twice on retry.
      if(!stages.renderAttempted){stages.renderAttempted=true;ctx.addOneMessage(message);stages.rendered=true;}
      assertOwner();
      if(stages.rendered&&!stages.renderAnnounced){
        stages.renderAnnounced=true;
        const result=emit(bot?'CHARACTER_MESSAGE_RENDERED':'USER_MESSAGE_RENDERED',ctx.chat.indexOf(message),...(bot?['command']:[]));
        if(result)await result;
      }
      assertOwner();
      await ctx.saveChat();
      // A dispatched save may finish after disable, but not for a different chat.
      assertOwner(true);pendingSaves.delete(message);appendStages.delete(message);
      return existing?{added:true,duplicate:true}:{added:true};
    }catch(error){throw error instanceof DndError?error:new DndError('APPEND');}
    finally{sending=false;activeChatSaves.delete(token.chat);for(const observer of saveObservers)observer();}
  }
  return {
    info,capture,isCurrent,assertCurrent,
    setActive(value){if(destroyed||active===!!value)return;active=!!value;if(active&&dirty){dirty=false;notify();}},
    queueSettingsSave:task=>idleSave.request(task),
    gameInfo(){const value=info();return {...value,canReply:typeof context()?.generate==='function'};},
    hasGameReport:id=>!!savedInfo('game',id),
    gameReportInfo:id=>savedInfo('game',id),
    dndEventInfo:id=>savedInfo('dnd',id),
    truthCardInfo:id=>savedInfo('truth',id),
    chatSavePending(kind,id){const message=messageFor(kind,id);return !!message&&pendingSaves.has(message);},
    subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    async generate(token,prompt,{responseLength=2600}={}){
      assertCurrent(token);const ctx=context();if(busy(ctx))throw new DndError('BUSY');
      if(typeof ctx.generateQuietPrompt!=='function')throw new DndError('NO_API');
      if(ctx.onlineStatus==='no_connection')throw new DndError('OFFLINE');
      const options={quietPrompt:prompt,quietToLoud:false,skipWIAN:false,responseLength:Number.isInteger(responseLength)&&responseLength>=1000&&responseLength<=65536?responseLength:2600,removeReasoning:true,trimToSentence:false};
      if(ctx.groupId){
        const group=ctx.groups?.find(g=>String(g.id)===String(ctx.groupId));
        const member=group?.members?.find(avatar=>!group.disabled_members?.includes(avatar));
        const index=ctx.characters?.findIndex(c=>c.avatar===member);
        if(!Number.isInteger(index)||index<0)throw new DndError('NO_CHAT');options.forceChId=index;
      }
      inFlight=true;notify();
      try{const output=await ctx.generateQuietPrompt(options);assertCurrent(token);return output;}
      catch(error){if(error instanceof DndError)throw error;throw new DndError('GENERATION');}
      finally{inFlight=false;generating=false;notify();}
    },
    async append(token,event,rollId,{sender='narrator'}={}){
      return appendMessage(token,'dnd',rollId,()=>arcadeChatMessage(context(),{text:dndChatText(event),sender,narratorName:'Мастер d20',extra:{paw_arcade_dnd:{id:rollId,roll:event.roll,sender:sanitizeChatSender(sender)}}}));
    },
    async appendTruthCard(token,card,id,{sender='narrator'}={}){
      const text=truthChatText(card);
      return appendMessage(token,'truth',id,()=>arcadeChatMessage(context(),{text,sender,narratorName:'Правда или действие',extra:{paw_arcade_truth:{id,kind:card.kind,selectionMode:card.selectionMode,sender:sanitizeChatSender(sender)}}}));
    },
    async appendGameReport(token,raw,{includeJournal=false,sender='narrator'}={}){
      const report=sanitizeGameReport(raw);
      return appendMessage(token,'game',report.id,()=>arcadeChatMessage(context(),{text:gameReportChatText(report,{includeJournal}),sender,narratorName:'Игровая партия',extra:{paw_arcade_game:{id:report.id,game:report.game,outcome:report.outcome,fullJournal:includeJournal===true,sender:sanitizeChatSender(sender)}}}));
    },
    async replyToGameReport(token,id,{retry=false}={}){
      const ctx=context();
      if(destroyed||!token||token.revision!==chatRevision||identity(ctx)!==token.key||ctx.chat!==token.chat)return {started:false,reason:'STALE'};
      const index=ctx.chat.findIndex(m=>m?.extra?.paw_arcade_game?.id===id);
      if(index<0||(!retry&&index!==ctx.chat.length-1))return {started:false,reason:'STALE'};
      // A deliberate retry can follow a partial/stopped bot reply, but never
      // cross a new user message, another game event, or a changed snapshot.
      if(retry&&(!isCurrent(token)||ctx.chat.slice(index+1).some(m=>m?.is_user||m?.is_system||m?.extra?.type==='narrator'||m?.extra?.paw_arcade_game||m?.extra?.paw_arcade_dnd||m?.extra?.paw_arcade_truth)))return {started:false,reason:'STALE'};
      if(busy(ctx))return {started:false,reason:'BUSY'};
      if(ctx.onlineStatus==='no_connection')return {started:false,reason:'OFFLINE'};
      if(typeof ctx.generate!=='function')return {started:false,reason:'NO_API'};
      // A normal generation reads the composer. Never submit, clear or run a user's draft.
      if(String(doc?.querySelector?.('#send_textarea')?.value??'').length)return {started:false,reason:'DRAFT'};
      const beforeStops=stops;inFlight=true;notify();
      try{
        // automatic_trigger avoids an extra empty-send message and pending file attachment.
        await ctx.generate('normal',{automatic_trigger:true});return {started:true,...(stops!==beforeStops?{stopped:true}:{})};
      }catch{throw new DndError('GENERATION');}
      finally{inFlight=false;generating=false;notify();}
    },
    destroy(){destroyed=true;idleSave.destroy();saveObservers.delete(notify);for(const [type,fn] of subscriptions){if(typeof source?.removeListener==='function')source.removeListener(type,fn);else source?.off?.(type,fn);}listeners.clear();},
  };
}

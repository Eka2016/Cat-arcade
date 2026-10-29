import {COLLECTION_FILE_LIMIT,COLLECTION_GAME_NAMES,CollectionTransferError,collectionTransferChoices,makeCollectionTransfer,stringifyCollectionTransfer,parseCollectionTransfer,importedCollectionChoices,mergeCollectionTransfer,collectionTransferError} from './collection-transfer.js';
import {createWindowedList} from './windowed-list.js';

export const COLLECTION_TRANSFER_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v14m-4-4 4 4 4-4M17 21V7m-4 4 4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const searchKey=value=>value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
/** Same compact transfer panel for all three saved-card libraries. No model or chat access. */
export function createCollectionTransferView(container,{game,getLibrary,onLibraryChange,requestRender,isActive=()=>true,cryptoSource=globalThis.crypto}={}){
  const doc=container.ownerDocument,win=doc.defaultView,abort=new AbortController(),signal=abort.signal;
  let opened=false,destroyed=false,mode='export',pack=null,chosen=new Set(),query='',choices=[],message='',success=false,reading=false,serial=0,list=null,anchor=null;
  const downloads=new Map(),$=s=>container.querySelector(s);
  function stopList(){if(list)anchor=list.snapshot();list?.destroy();list=null;}
  function close(){opened=false;serial++;reading=false;pack=null;stopList();anchor=null;}
  function refreshChoices(){
    choices=mode==='export'?collectionTransferChoices(game,getLibrary()):pack?importedCollectionChoices(pack):[];
    const ids=new Set(choices.map(c=>c.id));chosen=new Set([...chosen].filter(id=>ids.has(id)));
  }
  function update(){
    const total=choices.length,count=chosen.size,button=$('.collection-transfer-submit');if(!button)return;
    $('.collection-transfer-all').textContent=count===total&&total?'Снять все':'Выбрать все';$('.collection-transfer-all').disabled=!total||reading;
    let cards=0;if(mode==='import'&&pack)cards=pack.cards.filter(card=>card.collections.some(id=>chosen.has(id))).length;
    $('.collection-transfer-count').textContent=mode==='import'&&pack?`Выбрано: ${count} · карточек: ${cards}`:`Выбрано сборников: ${count}`;
    button.disabled=!count||reading;button.textContent=mode==='export'?'Скачать JSON':'Добавить выбранные';
    for(const input of container.querySelectorAll('[data-transfer-collection]')){input.checked=chosen.has(input.dataset.transferCollection);input.closest('label').dataset.selected=String(input.checked);}
    $('.collection-transfer-message').textContent=message;$('.collection-transfer-message').hidden=!message;$('.collection-transfer-message').dataset.success=String(success);
  }
  function filter(){
    if(!list)return;const needle=searchKey(query),visible=choices.filter(c=>!needle||searchKey(c.name).includes(needle));list.setItems(visible,{anchor});anchor=null;
    $('.collection-transfer-empty').hidden=!!visible.length;update();
  }
  function render(content){
    stopList();refreshChoices();
    content.innerHTML=`<div class="collection-transfer"><div class="collection-transfer-tabs" role="group" aria-label="Перенос сборников"><button type="button" data-transfer-mode="export">Экспорт</button><button type="button" data-transfer-mode="import">Импорт</button></div><p class="collection-transfer-help"></p><div class="collection-transfer-file-row" hidden><button type="button" class="collection-transfer-file">Выбрать JSON</button><input type="file" class="collection-transfer-input" accept=".json,application/json" hidden></div><div class="collection-transfer-picker"><input type="search" class="collection-transfer-search" placeholder="Найти сборник" aria-label="Найти сборник для переноса" autocomplete="off"><div class="collection-transfer-selection"><span class="collection-transfer-count"></span><button type="button" class="collection-transfer-all">Выбрать все</button></div><div class="collection-transfer-scroll"><div></div></div><p class="collection-transfer-empty" hidden>Сборники не найдены.</p><button type="button" class="collection-transfer-submit"></button></div><p class="collection-transfer-message" role="status" hidden></p></div>`;
    for(const b of container.querySelectorAll('[data-transfer-mode]')){b.setAttribute('aria-pressed',String(b.dataset.transferMode===mode));b.disabled=reading;}
    $('.collection-transfer-help').textContent=mode==='export'?'Выбери сборники для сохранения в файл. В него попадут только выбранные сборники и их карточки.':reading?'Читаю файл…':pack?`${COLLECTION_GAME_NAMES[game]} · сборников: ${pack.collections.length} · карточек: ${pack.cards.length}. Совпадения объединятся.`:'Открой файл сборников этой игры и выбери, что добавить. Текущий набор сохранится.';
    $('.collection-transfer-file-row').hidden=mode!=='import';$('.collection-transfer-file').disabled=reading;$('.collection-transfer-file').textContent=pack?'Другой файл':'Выбрать JSON';
    $('.collection-transfer-picker').hidden=mode==='import'&&!pack;
    $('.collection-transfer-search').value=query;
    list=createWindowedList($('.collection-transfer-scroll'),$('.collection-transfer-scroll > div'),{keyFor:c=>c.id,estimateHeight:48,renderItem(c){
      const label=doc.createElement('label'),input=doc.createElement('input'),name=doc.createElement('span'),count=doc.createElement('small');label.className='truth-member-choice';input.type='checkbox';input.dataset.transferCollection=c.id;input.checked=chosen.has(c.id);label.dataset.selected=String(input.checked);name.className='truth-member-name';name.textContent=c.name;count.textContent=String(c.count);count.setAttribute('aria-label',`Карточек: ${c.count}`);label.append(input,name,count);return label;
    }});filter();
  }
  function rerender(){if(opened&&!destroyed)requestRender();}
  function switchMode(next){if(next===mode)return;serial++;mode=next;reading=false;pack=null;query='';anchor=null;message='';success=false;refreshChoices();chosen=new Set(choices.map(c=>c.id));rerender();}
  async function readFile(file){
    if(!file||!opened||destroyed)return;const request=++serial;pack=null;chosen.clear();query='';anchor=null;reading=true;message='';success=false;rerender();
    try{
      if(file.size>COLLECTION_FILE_LIMIT)throw new CollectionTransferError('SIZE');
      let text;try{text=await file.text();}catch{throw new CollectionTransferError('READ');}
      if(destroyed||!opened||request!==serial)return;
      pack=parseCollectionTransfer(text,game);refreshChoices();chosen=new Set(choices.map(c=>c.id));
    }catch(error){if(destroyed||!opened||request!==serial)return;message=collectionTransferError(error);}
    finally{if(!destroyed&&opened&&request===serial){reading=false;rerender();}}
  }
  function revoke(url){const timer=downloads.get(url);if(timer!==undefined)win.clearTimeout(timer);downloads.delete(url);win.URL.revokeObjectURL(url);}
  function download(){
    const text=stringifyCollectionTransfer(makeCollectionTransfer(game,getLibrary(),[...chosen]));
    let url,link;try{
      url=win.URL.createObjectURL(new win.Blob([text],{type:'application/json;charset=utf-8'}));link=doc.createElement('a');link.href=url;
      const now=new Date(),date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');link.download=`Paw-Arcade-${game}-collections-${date}.json`;link.hidden=true;container.append(link);link.click();
      downloads.set(url,win.setTimeout(()=>revoke(url),30000));
    }catch{if(url)revoke(url);throw new CollectionTransferError('DOWNLOAD');}finally{link?.remove();}
    message='Файл подготовлен для скачивания.';success=true;update();
  }
  function importSelected(){
    const merged=mergeCollectionTransfer(game,getLibrary(),pack,[...chosen],cryptoSource);
    try{onLibraryChange(merged.library);}catch{throw new CollectionTransferError('SAVE');}
    const s=merged.stats;message=`Добавлено сборников: ${s.collectionsAdded} · новых карточек: ${s.cardsAdded} · уже сохранённых: ${s.cardsReused}.`;success=true;rerender();
  }
  function activate(target){
    if(!opened||destroyed||!isActive())return false;const b=target.closest('button');if(!b||!b.closest('.collection-transfer'))return false;if(b.disabled)return true;
    try{
      if(b.dataset.transferMode)switchMode(b.dataset.transferMode);
      else if(b.matches('.collection-transfer-file'))$('.collection-transfer-input').click();
      else if(b.matches('.collection-transfer-all')){chosen=chosen.size===choices.length?new Set():new Set(choices.map(c=>c.id));message='';update();}
      else if(b.matches('.collection-transfer-submit')){message='';success=false;if(mode==='export')download();else importSelected();}
    }catch(error){message=collectionTransferError(error);success=false;update();}return true;
  }
  container.addEventListener('input',event=>{if(opened&&event.target.matches('.collection-transfer-search')){query=event.target.value;anchor=null;filter();}},{signal});
  container.addEventListener('change',event=>{
    if(!opened||destroyed)return;if(event.target.matches('.collection-transfer-input')){const file=event.target.files?.[0];event.target.value='';void readFile(file);}
    else if(event.target.dataset.transferCollection){const id=event.target.dataset.transferCollection;if(!choices.some(c=>c.id===id))return;if(event.target.checked)chosen.add(id);else chosen.delete(id);message='';success=false;update();}
  },{signal});
  return{get isOpen(){return opened;},open(id='all'){close();opened=true;mode='export';query='';message='';success=false;refreshChoices();chosen=new Set(id==='all'?choices.map(c=>c.id):choices.some(c=>c.id===id)?[id]:[]);if(chosen.size===1&&id!=='all')anchor={key:id,index:choices.findIndex(c=>c.id===id),offset:0,bottom:false};},close,render,activate,destroy(){if(destroyed)return;close();destroyed=true;for(const url of [...downloads.keys()])revoke(url);abort.abort();}};
}

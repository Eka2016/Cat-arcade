// Word collections reuse the same bounded, virtualized presentation as Truth / Dare.
import {sanitizeWordLibrary,findWordLibraryCard,wordCollectionCards,filterWordCards,organizeWordLibraryCards,deleteWordLibraryCards,saveWordLibraryCard,toggleWordFavorite,deleteWordLibraryCard,saveWordCollection,deleteWordCollection} from './words-library.js';
import {wordError} from './words-content.js';
import {createWindowedList} from './windowed-list.js';
import {createCollectionTransferView,COLLECTION_TRANSFER_ICON} from './collection-transfer-ui.js';

export const WORD_STAR_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
export const WORD_FOLDER_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h6l2 2h10v13H3ZM12 10v7m-3.5-3.5h7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const WORD_TRASH_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BACK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SEARCH_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const LEAF_ICON='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M39 7C17 6 7 18 10 30c11 8 30 1 29-23Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m9 39 23-23M18 29l-1-9m8 2 8-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const COVER_VINES='<svg class="truth-cover-vines" viewBox="0 0 210 210" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 154C61 127 27 67 63 34M147 176c36-32 5-88 40-118M35 137c-16-3-18-13-17-21 13 2 19 9 17 21ZM39 111c12-3 17-11 17-19-12 3-18 10-17 19ZM35 86c-11-5-13-13-10-21 10 4 14 11 10 21ZM43 60c13 0 19-7 21-14-12-1-20 4-21 14ZM164 151c-12-3-16-11-14-19 12 3 17 11 14 19ZM168 127c13-1 19-9 20-16-12 0-19 6-20 16ZM166 102c-12-5-14-14-11-21 10 5 14 13 11 21ZM173 77c13 0 19-7 21-15-12 0-20 5-21 15Z"/><path d="M53 179q52 19 104-7M62 28q41-14 80 0" opacity=".6"/><circle cx="42" cy="163" r="2"/><circle cx="157" cy="46" r="2"/></g></svg>';
const cardCount=n=>`${n} ${n%10===1&&n%100!==11?'слово':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'слова':'слов'}`;

export function createWordLibraryView(container,{getLibrary,onLibraryChange,onPlay,onBack=()=>{},canPlay=()=>true,isActive=()=>true,onChange=()=>{},cryptoSource=globalThis.crypto}={}){
  const abort=new AbortController(),signal=abort.signal;
  let source=Symbol('unread'),sourceCards=-1,sourceCollections=-1,library=sanitizeWordLibrary(null),section='gallery',selected='favorites',pageId='favorites',galleryWidth=0,draft=null,draftHome=null,nameDraft=null,message='',done=null,destroyed=false,cardList=null,cardListId=null,memberList=null,memberPosition=null,membershipOpen=false,memberQuery='',memberFilter='all',batch=null;
  const listPositions=new Map();let galleryChoices=[],galleryIndices=new Map(),counts=new Map(),galleryQuery='',gallerySearchOpen=false,galleryHome='favorites';
  let query='',searchOpen=false,groups=new Set(),filterQuery='',filtersOpen=false,filterList=null,visibleCards=[],picked=new Set(),deleteConfirm=false;
  const $=selector=>container.querySelector(selector),el=tag=>container.ownerDocument.createElement(tag);
  const transfer=createCollectionTransferView(container,{game:'words',getLibrary:read,onLibraryChange:persist,requestRender:render,isActive,cryptoSource});
  function read(){
    const raw=getLibrary(),cardCount=raw?.cards?.length||0,collectionCount=raw?.collections?.length||0;if(raw!==source||cardCount!==sourceCards||collectionCount!==sourceCollections){
      source=raw;sourceCards=cardCount;sourceCollections=collectionCount;library=sanitizeWordLibrary(raw);filterGalleryChoices();
      counts=new Map([['all',0],['favorites',0],...library.collections.map(value=>[value.id,0])]);
      for(const card of library.cards){counts.set('all',counts.get('all')+1);if(card.favorite)counts.set('favorites',counts.get('favorites')+1);for(const id of card.collections)counts.set(id,counts.get(id)+1);}
    }return library;
  }
  function persist(next){onLibraryChange(next);source=null;read();message='';}
  const galleryKey=value=>String(value).normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
  function filterGalleryChoices(){
    const key=galleryKey(galleryQuery);
    galleryChoices=[{id:'favorites',name:'Избранное'},...library.collections,{id:'new',name:'Новый сборник'}].filter(choice=>choice.id==='new'||!key||galleryKey(choice.name).includes(key));
    galleryIndices=new Map(galleryChoices.map((choice,index)=>[choice.id,index]));
    if(!galleryIndices.has(pageId))pageId=galleryChoices[0].id;
  }
  function paintGallerySearch(){
    const row=$('.truth-collection-search-row'),button=$('.truth-collection-search-toggle');if(!row||!button)return;
    row.hidden=!gallerySearchOpen;button.setAttribute('aria-expanded',String(gallerySearchOpen));button.dataset.active=String(!!galleryKey(galleryQuery));
    const label=gallerySearchOpen?'Свернуть поиск сборников':galleryKey(galleryQuery)?`Поиск сборников: ${galleryQuery}`:'Найти сборник';button.setAttribute('aria-label',label);button.title=label;
    $('.truth-collection-search-clear').disabled=!galleryQuery;
  }
  function closeGallerySearch(){gallerySearchOpen=false;paintGallerySearch();layoutGallery(true);$('.truth-collection-search-toggle')?.focus({preventScroll:true});onChange();}
  function searchGallery(value){
    const previous=galleryKey(galleryQuery),next=galleryKey(value);if(!previous&&next)galleryHome=pageId;
    galleryQuery=value;filterGalleryChoices();
    if(previous&&!next&&galleryIndices.has(galleryHome))pageId=galleryHome;else if(next)pageId=galleryChoices[0].id;
    const carousel=$('.truth-collection-carousel');if(carousel){delete carousel.dataset.start;delete carousel.dataset.end;paintGallery(galleryIndices.get(pageId)||0);layoutGallery(true);}
    paintGallerySearch();updatePager();onChange();
  }
  const pages=()=>galleryChoices;
  const stats=id=>counts.get(id)||0;
  const selectedCards=()=>wordCollectionCards(library,selected);
  const title=()=>selected==='favorites'?'Избранное':selected==='all'?'Все слова':library.collections.find(value=>value.id===selected)?.name||'';
  function updatePager(){
    const choices=pages(),index=galleryIndices.get(pageId)||0;
    if(!$('.truth-collection-page'))return;
    $('.truth-collection-page').textContent=`${index+1} / ${choices.length}`;
    $('.truth-collection-pager-label').textContent=galleryKey(galleryQuery)?choices.length>1?`Найдено сборников: ${choices.length-1}`:'Сборники не найдены':'Листай сборники';
    $('.truth-collections-prev').disabled=index===0;
    $('.truth-collections-next').disabled=index===choices.length-1;
    for(const slide of container.querySelectorAll('.truth-collection-slide'))slide.setAttribute('aria-current',String(Number(slide.dataset.page)===index));
  }
  function layoutGallery(force=false){
    const carousel=$('.truth-collection-carousel');if(!carousel||!carousel.clientWidth)return;
    if(force||carousel.clientWidth!==galleryWidth){galleryWidth=carousel.clientWidth;const index=galleryIndices.get(pageId)||0;paintGallery(index);carousel.scrollLeft=index*galleryWidth;}
  }
  function movePage(delta){
    const choices=pages(),index=galleryIndices.get(pageId)||0,next=Math.min(choices.length-1,Math.max(0,index+delta));
    pageId=choices[next].id;paintGallery(next);layoutGallery(true);updatePager();
  }
  function paintGallery(index){
    const carousel=$('.truth-collection-carousel');if(!carousel)return;
    const choices=pages(),start=Math.max(0,index-2),end=Math.min(choices.length,index+3);
    if(carousel.dataset.start===String(start)&&carousel.dataset.end===String(end))return;
    const left=carousel.scrollLeft,nodes=[];
    function gap(size){const node=el('div');node.className='truth-collection-gap';node.style.flexBasis=`${size*100}%`;node.setAttribute('aria-hidden','true');return node;}
    nodes.push(gap(start));
    for(let position=start;position<end;position++){
      const choice=choices[position],slide=el('div'),button=el('button'),icon=el('span'),name=el('strong'),count=el('small'),hint=el('span');
      slide.className='truth-collection-slide';slide.dataset.page=String(position);slide.setAttribute('role','group');slide.setAttribute('aria-label',`${position+1} из ${choices.length}`);
      button.type='button';button.className='truth-collection-cover';button.dataset.cover=choice.id;
      button.innerHTML=COVER_VINES;icon.className='truth-cover-icon';name.textContent=choice.name;count.className='truth-cover-count';hint.className='truth-cover-hint';
      if(choice.id==='new'){
        button.classList.add('truth-collection-new');icon.textContent='+';count.textContent='Свой словарь для повторения';hint.textContent='Создать';button.setAttribute('aria-label','Создать сборник');
      }else{
        const tally=stats(choice.id);button.dataset.wordCollection=choice.id;icon.innerHTML=choice.id==='favorites'?WORD_STAR_ICON:LEAF_ICON;count.textContent=cardCount(tally);hint.textContent='Открыть';button.setAttribute('aria-label',`Открыть сборник «${choice.name}»`);
      }
      button.append(icon,name,count,hint);slide.append(button);nodes.push(slide);
    }
    nodes.push(gap(choices.length-end));carousel.replaceChildren(...nodes);carousel.scrollLeft=left;carousel.dataset.start=String(start);carousel.dataset.end=String(end);
  }
  function renderGallery(content){
    content.innerHTML=`<div id="paw-words-collection-search" class="truth-collection-search-row" hidden><input type="search" class="truth-collection-search" placeholder="Найти сборник" aria-label="Поиск по названию сборника" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="truth-collection-search-clear" aria-label="Очистить поиск сборников" title="Очистить поиск сборников">×</button></div><div class="truth-collection-carousel" role="region" aria-roledescription="карусель" aria-label="Сборники слов" tabindex="0"></div><div class="truth-collections-pager"><button type="button" class="truth-collections-prev" aria-label="Предыдущий сборник">${BACK_ICON}</button><span><span class="truth-collection-pager-label">Листай сборники</span><small class="truth-collection-page" aria-live="polite"></small></span><button type="button" class="truth-collections-next" aria-label="Следующий сборник">${BACK_ICON}</button></div><button type="button" class="truth-collection-all"></button>`;
    $('.truth-collection-search').value=galleryQuery;paintGallerySearch();
    if(!galleryIndices.has(pageId))pageId=galleryChoices[0].id;paintGallery(galleryIndices.get(pageId));
    $('.truth-collection-all').textContent=`Все слова · ${library.cards.length}`;galleryWidth=0;layoutGallery(true);updatePager();
  }
  function clearPicked(){picked=new Set();deleteConfirm=false;}
  function paintPicked(){
    const bar=$('.truth-saved-selection');if(!bar)return;
    const anchor=cardList?.snapshot();
    bar.hidden=!picked.size||deleteConfirm;$('.truth-saved-delete-confirm').hidden=!deleteConfirm;
    $('.truth-saved-selected-count').textContent=`Выбрано · ${picked.size}`;
    const deletion=selected==='all'?'Удалить из всех сохранённых':selected==='favorites'?'Убрать из избранного':'Убрать из этого сборника';
    $('.truth-saved-trash').setAttribute('aria-label',`${deletion}: ${picked.size}`);$('.truth-saved-trash').title=deletion;
    $('.truth-saved-delete-question').textContent=selected==='all'?`Удалить ${picked.size} везде?`:selected==='favorites'?`Убрать ${picked.size} из избранного?`:`Убрать ${picked.size} из сборника?`;
    $('.truth-saved-delete-yes').textContent=selected==='all'?'Удалить':'Убрать';
    for(const button of container.querySelectorAll('[data-word-edit]')){
      button.dataset.selecting=String(picked.size>0);button.dataset.selected=String(picked.has(button.dataset.wordEdit));
      button.setAttribute('aria-pressed',String(picked.has(button.dataset.wordEdit)));
    }
    cardList?.refresh({anchor});
  }
  function canSelect(button){return !destroyed&&isActive()&&section==='collection'&&!draft&&!nameDraft&&container.contains(button)&&button.matches('[data-word-edit]');}
  function toggleSelection(id){
    read();if(section!=='collection'||draft||nameDraft||!isActive()||!visibleCards.some(card=>card.id===id))return;
    if(picked.has(id))picked.delete(id);else picked.add(id);deleteConfirm=false;paintPicked();onChange();
  }
  function cancelSelection(){if(transfer.isOpen){transfer.close();render();return true;}if(section==='gallery'&&!draft&&!nameDraft&&gallerySearchOpen){closeGallerySearch();return true;}if(deleteConfirm){deleteConfirm=false;paintPicked();return true;}if(!picked.size)return false;clearPicked();paintPicked();onChange();return true;}
  function refreshCards(anchor=null){
    if(!cardList)return;
    visibleCards=filterWordCards(library,{collection:selected,query,groups:selected==='all'?[...groups]:[]});
    cardList.setItems(visibleCards,{anchor});
    const empty=$('.truth-saved-empty');empty.hidden=!!visibleCards.length;
    empty.textContent=query||selected==='all'&&groups.size?'Слова не найдены.':selected==='all'?'Здесь будут все сохранённые слова.':selected==='favorites'?'Нажми ★ на слове в игре или добавь своё.':'Добавь своё слово или сохрани слова из текущего набора.';
    const total=selectedCards().length,filtered=!!query.trim()||selected==='all'&&groups.size>0;
    $('.truth-library-total').textContent=filtered?`${visibleCards.length} / ${total}`:String(total);
    $('.truth-library-total').title=filtered?'Найдено / всего слов':'Слов в этом сборнике';
    $('.truth-collection-description').textContent=cardCount(visibleCards.length);
    paintPicked();
  }
  function paintSearch(){
    const button=$('.truth-saved-search-toggle'),row=$('.truth-saved-search-row');if(!row)return;
    row.hidden=!searchOpen;button.setAttribute('aria-expanded',String(searchOpen));button.dataset.active=String(!!query.trim());
    button.setAttribute('aria-label',searchOpen?'Свернуть поиск':query.trim()?`Поиск: ${query}`:'Найти слово');button.title=searchOpen?'Свернуть поиск':'Найти слово';$('.truth-saved-search-clear').disabled=!query;
  }
  function focusSearch(){if(draft||nameDraft||!isActive())return;if(gallerySearchOpen&&section==='gallery')$('.truth-collection-search')?.focus({preventScroll:true});else if(searchOpen&&section==='collection')$('.truth-saved-search')?.focus({preventScroll:true});}
  function renderFilters(){
    const panel=$('.truth-saved-filter-panel');if(!panel)return;panel.hidden=!filtersOpen;
    $('.truth-saved-filter-toggle').setAttribute('aria-expanded',String(filtersOpen));
    $('.truth-saved-filter-toggle').textContent=groups.size?`Сборники · ${groups.size}`:'Все сборники';
    if(!filtersOpen)return;
    const needle=filterQuery.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
    const choices=[{id:'ungrouped',name:'Без сборника'},{id:'favorites',name:'Избранное'},...library.collections].filter(c=>!needle||c.name.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').includes(needle));
    if(!filterList)filterList=createWindowedList($('.truth-saved-filter-list'),$('.truth-saved-filter-list > div'),{keyFor:c=>c.id,estimateHeight:36,renderItem(c){
      const label=el('label'),check=el('input'),name=el('span');label.className='truth-member-choice';check.type='checkbox';check.dataset.wordGroup=c.id;check.checked=groups.has(c.id);name.textContent=c.name;label.append(check,name);if(c.id==='ungrouped')label.title='Без избранного и своих сборников';return label;
    }});
    filterList.setItems(choices);
    $('.truth-saved-filter-empty').hidden=!!choices.length;
  }
  function renderCollection(content){
    content.innerHTML=`<div class="truth-collection-actions"><button type="button" class="truth-saved-new">+ Своё слово</button><details class="truth-collection-manage"><summary aria-label="Настройки сборника">⋯</summary><div class="truth-collection-manage-buttons"><button type="button" class="truth-collection-rename">Переименовать</button><button type="button" class="truth-collection-delete truth-danger">Удалить сборник</button></div></details></div>
      <div id="paw-words-saved-search" class="truth-saved-search-row" hidden><input type="search" class="truth-saved-search" placeholder="Найти слово" aria-label="Поиск по словам" autocomplete="off"><button type="button" class="truth-saved-search-clear" aria-label="Очистить поиск" title="Очистить поиск">×</button></div>
      <div class="truth-collection-meta"><p class="truth-collection-description"></p><button type="button" class="truth-saved-filter-toggle" aria-expanded="false" aria-controls="paw-words-saved-filters">Все сборники</button></div>
      <div id="paw-words-saved-filters" class="truth-saved-filter-panel" hidden><input type="search" class="truth-saved-filter-search" placeholder="Найти сборник" aria-label="Поиск сборников для фильтра" autocomplete="off"><div class="truth-saved-filter-list"><div></div></div><p class="truth-saved-filter-empty" hidden>Сборники не найдены.</p><div><button type="button" class="truth-saved-filter-clear">Все слова</button><button type="button" class="truth-saved-filter-done">Готово</button></div></div>
      <div class="truth-saved-selection" hidden><span class="truth-saved-selected-count"></span><button type="button" class="truth-saved-selection-cancel" aria-label="Снять выделение">×</button><button type="button" class="truth-saved-add-to">${WORD_FOLDER_ICON}<span>Добавить в…</span></button><button type="button" class="truth-saved-trash truth-trash" aria-label="Удалить выбранные слова из всех сохранённых" title="Удалить из всех сохранённых">${WORD_TRASH_ICON}</button></div>
      <div class="truth-saved-delete-confirm truth-delete-confirm" hidden><span class="truth-saved-delete-question"></span><button type="button" class="truth-saved-delete-yes truth-danger">Удалить</button><button type="button" class="truth-saved-delete-no">Отмена</button></div>
      <div class="truth-collection-scroll" aria-label="Слова сборника"><p class="truth-saved-empty truth-collection-empty" hidden></p><ul></ul></div><button type="button" class="truth-collection-play">Учить этот сборник</button>`;
    $('.truth-saved-new').hidden=selected==='all';$('.truth-collection-manage').hidden=['all','favorites'].includes(selected);$('.truth-collection-actions').hidden=selected==='all';$('.truth-collection-actions').dataset.manage=String(!['all','favorites'].includes(selected));
    $('.truth-saved-search').value=query;$('.truth-saved-filter-search').value=filterQuery;$('.truth-saved-filter-toggle').hidden=selected!=='all';paintSearch();
    cardListId=selected;cardList=createWindowedList($('.truth-collection-scroll'),$('.truth-collection-scroll ul'),{keyFor:card=>card.id,renderItem(card){
      const item=el('li'),edit=el('button'),label=el('small'),body=el('span'),star=el('button');
      edit.type='button';edit.className='truth-saved-edit';edit.dataset.wordEdit=card.id;edit.title='Удерживай, чтобы выбрать несколько слов. Shift + Enter — выделить.';edit.dataset.selecting=String(picked.size>0);edit.dataset.selected=String(picked.has(card.id));edit.setAttribute('aria-pressed',String(picked.has(card.id)));label.textContent=card.en;body.textContent=card.ru;edit.append(label,body);
      star.type='button';star.className='truth-saved-star truth-mini';star.dataset.wordStar=card.id;star.innerHTML=WORD_STAR_ICON;star.setAttribute('aria-pressed',String(card.favorite));star.setAttribute('aria-label',card.favorite?'Убрать из избранного':'В избранное');item.append(edit,star);
      if(!['all','favorites'].includes(selected)){const remove=el('button');remove.type='button';remove.className='truth-saved-remove truth-mini truth-danger';remove.dataset.wordRemove=card.id;remove.textContent='×';remove.setAttribute('aria-label','Убрать из этого сборника');item.append(remove);}return item;
    }});refreshCards(listPositions.get(selected)||null);renderFilters();
    const count=stats(selected);$('.truth-collection-play').textContent=selected==='all'?'Учить все слова':'Учить этот сборник';$('.truth-collection-play').disabled=!count||!canPlay();
  }
  function addPicked(){
    const ids=[...picked],origin=selected;if(!ids.length)return;
    filtersOpen=false;openBatch({count:ids.length,canMove:origin!=='all',source:origin,onChoose(target,{move=false}={}){
      if(!isActive())throw Error('Inactive selection');
      persist(organizeWordLibraryCards(read(),ids,target,{source:origin,move}));clearPicked();
    }});
  }
  function collectionSummary(){
    const names=draft.collections.map(id=>galleryChoices[galleryIndices.get(id)]?.name).filter(Boolean);
    return names.length?names.slice(0,2).join(' · ')+(names.length>2?` · +${names.length-2}`:''):'Выбрать сборники';
  }
  function renderDraft(content){
    if(membershipOpen){renderMemberships(content);return;}
    content.innerHTML=`<div class="truth-saved-editor words-saved-editor"><label>Английское слово или выражение<input class="words-saved-en truth-saved-kind" lang="en" autocomplete="off" spellcheck="false"></label><label>Перевод<input class="words-saved-ru truth-saved-kind" lang="ru" autocomplete="off"></label><details class="words-example-editor"><summary>Пример с переводом · необязательно</summary><label>Пример на английском<textarea class="words-saved-example truth-saved-text" lang="en" rows="2"></textarea></label><label>Перевод примера<textarea class="words-saved-translation truth-saved-text" lang="ru" rows="2"></textarea></label></details><label class="truth-saved-favorite-label"><input type="checkbox" class="truth-saved-favorite">Избранное</label><div class="truth-memberships-panel"><div class="truth-membership-heading"><span>Сборники</span><button type="button" class="truth-collection-new truth-add-collection-inline" aria-label="Создать сборник" title="Создать сборник">+</button></div><button type="button" class="truth-memberships-open"><span class="truth-memberships-folder">${WORD_FOLDER_ICON}</span><span><span>В каких сборниках сохранить</span><small class="truth-membership-summary"></small></span><span class="truth-membership-chevron" aria-hidden="true">›</span></button></div><button type="button" class="truth-saved-delete truth-danger" ${draft.id?'':'hidden'}>Удалить из всех сохранённых</button></div><div class="truth-saved-footer"><button type="button" class="truth-saved-save">Сохранить</button><button type="button" class="truth-saved-cancel">Отмена</button></div>`;
    for(const field of ['en','ru','example','translation'])$('.words-saved-'+field).value=draft[field];
    $('.words-example-editor').open=!!draft.example||!!draft.translation;
    $('.truth-saved-favorite').checked=draft.favorite;$('.truth-saved-favorite').disabled=draftHome==='favorites';$('.truth-membership-summary').textContent=collectionSummary();
  }
  function renderMemberships(content){
    content.innerHTML=`<div class="truth-membership-picker"><div class="truth-membership-search-row"><input type="search" class="truth-member-search" placeholder="Найти сборник" aria-label="Найти сборник" autocomplete="off"><button type="button" class="truth-collection-new truth-add-collection-inline" aria-label="Создать сборник" title="Создать сборник">+</button></div><div class="truth-membership-filters" role="group" aria-label="Какие сборники показать"><button type="button" data-word-member-filter="all">Все</button><button type="button" data-word-member-filter="selected">Выбранные</button></div><div class="truth-membership-list" aria-label="Выбрать сборники"><div></div></div><p class="truth-membership-empty" hidden></p><button type="button" class="truth-memberships-done">Готово</button></div>`;
    if(batch?.canMove){const bar=el('div');bar.className='truth-batch-mode';for(const [mode,label] of [['add','Добавить'],['move','Переместить']]){const button=el('button');button.type='button';button.dataset.wordBatchMode=mode;button.textContent=label;button.setAttribute('aria-pressed',String((batch.move?'move':'add')===mode));bar.append(button);}$('.truth-membership-picker').prepend(bar);}
    $('.truth-member-search').value=memberQuery;
    memberList=createWindowedList($('.truth-membership-list'),$('.truth-membership-list > div'),{keyFor:collection=>collection.id,estimateHeight:46,renderItem(collection){
      const label=el('label'),checkbox=el('input'),text=el('span');label.className='truth-member-choice';checkbox.type=batch?'radio':'checkbox';if(batch)checkbox.name='paw-words-bulk-target';checkbox.dataset.wordMember=collection.id;checkbox.checked=collection.id==='favorites'?draft.favorite:draft.collections.includes(collection.id);checkbox.disabled=draftHome===collection.id;label.dataset.selected=String(checkbox.checked);text.className='truth-member-name';text.textContent=collection.name;label.append(checkbox,text);
      if(draftHome===collection.id){const pin=el('small');pin.textContent='Этот сборник';label.append(pin);}return label;
    }});refreshMemberships(memberPosition);
  }
  function refreshMemberCounts(){
    const selectedButton=$('[data-word-member-filter="selected"]');if(!selectedButton)return;
    selectedButton.textContent=`Выбранные · ${draft.collections.length+(batch&&draft.favorite?1:0)}`;
    if(batch){$('.truth-memberships-done').textContent=batch.move?'Переместить':'Добавить';$('.truth-memberships-done').disabled=!draft.favorite&&!draft.collections.length;}
    for(const button of container.querySelectorAll('[data-word-member-filter]'))button.setAttribute('aria-pressed',String(button.dataset.wordMemberFilter===memberFilter));
  }
  function refreshMemberships(anchor=null){
    if(!memberList||!draft)return;refreshMemberCounts();
    const query=memberQuery.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').trim(),chosen=new Set([...draft.collections,...(batch&&draft.favorite?['favorites']:[])]),source=batch?[{id:'favorites',name:'Избранное'},...library.collections]:library.collections,items=source.filter(collection=>(!batch?.move||collection.id!==batch.source)&&(memberFilter!=='selected'||chosen.has(collection.id))&&(!query||collection.name.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').includes(query)));
    memberList.setItems(items,{anchor});const empty=$('.truth-membership-empty');empty.hidden=!!items.length;empty.textContent=query?'Сборники не найдены.':memberFilter==='selected'?'Сборники пока не выбраны.':'Создай первый сборник кнопкой +.';
  }

  function render(){
    if(destroyed)return;read();
    const position=cardList?.snapshot();if(position&&cardListId)listPositions.set(cardListId,position);cardList?.destroy();cardList=null;cardListId=null;
    if(memberList)memberPosition=memberList.snapshot();memberList?.destroy();memberList=null;filterList?.destroy();filterList=null;
    const valid=new Set(selectedCards().map(c=>c.id));for(const id of picked)if(!valid.has(id))picked.delete(id);if(!picked.size)deleteConfirm=false;
    const validGroups=new Set(['favorites','ungrouped',...library.collections.map(c=>c.id)]);groups=new Set([...groups].filter(id=>validGroups.has(id)));
    if(!['all','favorites'].includes(selected)&&!library.collections.some(value=>value.id===selected)){selected='favorites';if(!draft&&!nameDraft)section='gallery';}
    container.dataset.section=transfer.isOpen?'transfer':nameDraft?'name':draft?'editor':section;container.dataset.editor=batch?'batch':membershipOpen?'memberships':'card';container.dataset.collection=selected;
    container.innerHTML=`<div class="truth-collections-heading"><button type="button" class="truth-collection-back">${BACK_ICON}</button><strong></strong><span class="truth-library-total"></span><button type="button" class="truth-saved-search-toggle" aria-label="Найти слово" title="Найти слово" aria-expanded="false" aria-controls="paw-words-saved-search" hidden>${SEARCH_ICON}</button><button type="button" class="truth-collection-search-toggle" aria-label="Найти сборник" title="Найти сборник" aria-expanded="false" aria-controls="paw-words-collection-search" hidden>${SEARCH_ICON}</button><button type="button" class="collection-transfer-trigger" aria-label="Импорт и экспорт сборников" title="Импорт и экспорт сборников">${COLLECTION_TRANSFER_ICON}</button></div><div class="truth-collections-content"></div><p class="truth-collection-status" role="status"></p>`;
    $('.truth-saved-search-toggle').hidden=transfer.isOpen||!!draft||!!nameDraft||section!=='collection';
    $('.truth-collection-search-toggle').hidden=transfer.isOpen||!!draft||!!nameDraft||section!=='gallery';
    $('.truth-collections-heading strong').textContent=nameDraft?(nameDraft.id?'Переименовать':'Новый сборник'):draft?(batch?(batch.count?`${batch.move?'Переместить':'Добавить'} ${batch.count} в сборник`:'Добавить слова'):membershipOpen?'Выбрать сборники':draft.id?'Редактор слова':draft.en?'Сохранить слово':'Своё слово'):section==='gallery'?'Сборники':title();
    const total=section==='gallery'?library.cards.length:selectedCards().length;
    $('.collection-transfer-trigger').hidden=transfer.isOpen||!!draft||!!nameDraft;$('.truth-library-total').hidden=transfer.isOpen||!!draft||!!nameDraft;$('.truth-library-total').textContent=String(total);$('.truth-library-total').title=section==='gallery'?'Всего сохранённых слов':'Слов в этом сборнике';
    const backLabel=nameDraft?(draft?(membershipOpen?'К выбору сборников':'К слову'):nameDraft.id?'К сборнику':'К сборникам'):draft?(batch?'К словам':membershipOpen?'К слову':done?'К игре':'К сборнику'):section==='gallery'?'К словам':'К сборникам';$('.truth-collection-back').setAttribute('aria-label',backLabel);$('.truth-collection-back').title=backLabel;
    if(transfer.isOpen){$('.truth-collections-heading strong').textContent='Перенос сборников';const label=section==='gallery'?'К сборникам':'К сборнику';$('.truth-collection-back').setAttribute('aria-label',label);$('.truth-collection-back').title=label;}
    const content=$('.truth-collections-content');
    if(transfer.isOpen)transfer.render(content);
    else if(nameDraft){content.innerHTML=`<div class="truth-name-editor"><label>Название сборника<input class="truth-collection-name" maxlength="60" autocomplete="off"></label><div class="truth-editor-buttons"><button type="button" class="truth-collection-name-save">Сохранить</button><button type="button" class="truth-collection-name-cancel">Отмена</button></div></div>`;$('.truth-collection-name').value=nameDraft.name;}
    else if(draft)renderDraft(content);
    else if(section==='gallery')renderGallery(content);
    else renderCollection(content);
    $('.truth-collection-status').textContent=message;$('.truth-collection-status').hidden=!message;onChange();
  }
  function finishBatch(cancel=false){const callback=cancel?batch?.onCancel:null;batch=null;draft=null;draftHome=null;membershipOpen=false;memberQuery='';memberFilter='all';memberPosition=null;message='';render();callback?.();}
  function finishDraft(){draft=null;draftHome=null;membershipOpen=false;memberQuery='';memberFilter='all';memberPosition=null;const callback=done;done=null;render();callback?.();}
  function back(){
    if(transfer.isOpen){transfer.close();render();return;}
    message='';
    if(nameDraft){nameDraft=null;render();}
    else if(batch)finishBatch(true);
    else if(membershipOpen){membershipOpen=false;render();}
    else if(draft)finishDraft();
    else if(picked.size){clearPicked();paintPicked();onChange();}
    else if(section==='collection'){section='gallery';if(selected!=='all')pageId=selected;render();}
    else onBack();
  }
  function openCollection(id){if(!['all','favorites'].includes(id)&&!library.collections.some(value=>value.id===id))return;selected=id;section='collection';query='';searchOpen=false;groups=new Set();filterQuery='';filtersOpen=false;clearPicked();message='';render();}
  function openCard(card,callback){
    transfer.close();read();if(!card&&(section!=='collection'||selected==='all'))return;batch=null;clearPicked();
    const saved=card?findWordLibraryCard(library,card):null;
    draft=saved?{...saved,collections:[...saved.collections]}:{en:card?.en||'',ru:card?.ru||'',example:card?.example||'',translation:card?.translation||'',favorite:selected==='favorites'&&!card,collections:library.collections.some(value=>value.id===selected)?[selected]:[]};
    membershipOpen=false;memberQuery='';memberFilter='all';draftHome=card?null:selected;memberPosition=null;nameDraft=null;message='';done=callback||null;render();$('.words-saved-en').focus({preventScroll:true});
  }
  function activate(target){
    if(destroyed||!isActive())return false;const button=target.closest('button');if(!button||!container.contains(button))return false;if(button.disabled)return true;
    try{
      read();if(transfer.activate(target))return true;
      if(button.matches('.collection-transfer-trigger')){clearPicked();transfer.open(section==='collection'?selected:'all');render();}
      else if(button.matches('.truth-collection-back'))back();
      else if(button.matches('.truth-collection-search-toggle')){gallerySearchOpen=!gallerySearchOpen;paintGallerySearch();layoutGallery(true);if(gallerySearchOpen)focusSearch();onChange();}
      else if(button.matches('.truth-collection-search-clear')){searchGallery('');$('.truth-collection-search').value='';focusSearch();}
      else if(button.matches('.truth-collections-prev'))movePage(-1);
      else if(button.matches('.truth-collections-next'))movePage(1);
      else if(button.dataset.wordCollection)openCollection(button.dataset.wordCollection);
      else if(button.matches('.truth-collection-all'))openCollection('all');
      else if(button.matches('.truth-collection-new')){nameDraft={name:''};message='';render();$('.truth-collection-name').focus({preventScroll:true});}
      else if(button.matches('.truth-collection-rename')){nameDraft={id:selected,name:title()};message='';render();$('.truth-collection-name').focus({preventScroll:true});}
      else if(button.matches('.truth-collection-name-cancel'))back();
      else if(button.matches('.truth-collection-name-save')){
        const previous=new Set(library.collections.map(value=>value.id));persist(saveWordCollection(library,nameDraft,cryptoSource));
        if(!nameDraft.id){const id=library.collections.find(value=>!previous.has(value.id)).id;if(draft){if(batch){draft.favorite=false;draft.collections=[id];}else draft.collections.push(id);if(membershipOpen){memberQuery='';memberFilter='selected';memberPosition=null;}}else{selected=id;pageId=id;section='collection';query='';searchOpen=false;groups=new Set();filtersOpen=false;}}
        nameDraft=null;render();
      }
      else if(button.matches('.truth-collection-delete')){persist(deleteWordCollection(library,selected));selected='favorites';pageId='favorites';section='gallery';render();}
      else if(button.matches('.truth-saved-new'))openCard(null);
      else if(button.matches('.truth-saved-selection-cancel')){clearPicked();paintPicked();onChange();}
      else if(button.matches('.truth-saved-add-to'))addPicked();
      else if(button.matches('.truth-saved-trash')){deleteConfirm=picked.size>0;paintPicked();onChange();}
      else if(button.matches('.truth-saved-delete-no')){deleteConfirm=false;paintPicked();onChange();}
      else if(button.matches('.truth-saved-delete-yes')&&deleteConfirm){persist(deleteWordLibraryCards(library,[...picked],selected));clearPicked();render();}
      else if(button.matches('.truth-saved-search-toggle')){const anchor=cardList?.snapshot();searchOpen=!searchOpen;paintSearch();cardList?.refresh({anchor});if(searchOpen)$('.truth-saved-search').focus({preventScroll:true});onChange();}
      else if(button.matches('.truth-saved-search-clear')){query='';$('.truth-saved-search').value='';clearPicked();listPositions.delete(selected);paintSearch();refreshCards();$('.truth-saved-search').focus({preventScroll:true});}
      else if(button.matches('.truth-saved-filter-toggle')){filtersOpen=!filtersOpen;renderFilters();onChange();}
      else if(button.matches('.truth-saved-filter-done')){filtersOpen=false;renderFilters();onChange();}
      else if(button.matches('.truth-saved-filter-clear')){groups=new Set();filterQuery='';$('.truth-saved-filter-search').value='';clearPicked();listPositions.delete(selected);renderFilters();refreshCards();}
      else if(button.dataset.wordBatchMode){batch.move=button.dataset.wordBatchMode==='move';if(batch.move&&(draft.favorite?'favorites':draft.collections[0])===batch.source){draft.favorite=false;draft.collections=[];}render();}

      else if(button.matches('.truth-memberships-open')){membershipOpen=true;memberQuery='';memberFilter='all';memberPosition=null;render();$('.truth-member-search').focus({preventScroll:true});}
      else if(button.matches('.truth-memberships-done')){if(batch){const target=draft.favorite?'favorites':draft.collections[0];if(!target||!isActive())return true;batch.onChoose(target,{move:batch.move===true});finishBatch();}else{membershipOpen=false;render();}}
      else if(button.dataset.wordMemberFilter){memberFilter=button.dataset.wordMemberFilter;memberPosition=null;refreshMemberships();}
      else if(button.dataset.wordEdit&&picked.size){toggleSelection(button.dataset.wordEdit);}
      else if(button.dataset.wordEdit){const card=library.cards.find(value=>value.id===button.dataset.wordEdit);if(card){draft={...card,collections:[...card.collections]};draftHome=null;memberPosition=null;membershipOpen=false;memberQuery='';memberFilter='all';done=null;message='';render();}}
      else if(button.dataset.wordStar){const card=library.cards.find(value=>value.id===button.dataset.wordStar);if(card){persist(toggleWordFavorite(library,card,cryptoSource));render();}}
      else if(button.dataset.wordRemove){const card=library.cards.find(value=>value.id===button.dataset.wordRemove);if(card){persist(saveWordLibraryCard(library,{...card,collections:card.collections.filter(id=>id!==selected)},cryptoSource));render();}}
      else if(button.matches('.truth-saved-save')){
        const card={...draft,favorite:draftHome==='favorites'||draft.favorite,collections:draftHome&&draftHome!=='favorites'?[...new Set([...draft.collections,draftHome])]:draft.collections};persist(saveWordLibraryCard(library,card,cryptoSource));finishDraft();
      }
      else if(button.matches('.truth-saved-cancel'))back();
      else if(button.matches('.truth-saved-delete')){persist(deleteWordLibraryCard(library,draft.id));finishDraft();}
      else if(button.matches('.truth-collection-play'))onPlay(selected);
      else return false;
    }catch(error){message=wordError(error);const status=$('.truth-collection-status');if(status){status.textContent=message;status.hidden=false;}onChange();}
    return true;
  }
  container.addEventListener('input',event=>{
    if(event.target.matches('.truth-collection-search'))searchGallery(event.target.value);
    if(event.target.matches('.truth-saved-search')){query=event.target.value;clearPicked();listPositions.delete(selected);paintSearch();refreshCards();}
    if(event.target.matches('.truth-saved-filter-search')){filterQuery=event.target.value;renderFilters();}
    if(event.target.matches('.truth-collection-name')&&nameDraft)nameDraft.name=event.target.value;
    for(const field of ['en','ru','example','translation'])if(event.target.matches('.words-saved-'+field)&&draft)draft[field]=event.target.value;
    if(event.target.matches('.truth-member-search')&&draft){memberQuery=event.target.value;memberPosition=null;refreshMemberships();}
  },{signal});
  container.addEventListener('change',event=>{
    if(event.target.dataset.wordGroup){const id=event.target.dataset.wordGroup;if(event.target.checked)groups.add(id);else groups.delete(id);clearPicked();listPositions.delete(selected);refreshCards();$('.truth-saved-filter-toggle').textContent=groups.size?`Сборники · ${groups.size}`:'Все сборники';}
    else if(draft&&event.target.matches('.truth-saved-favorite'))draft.favorite=event.target.checked;
    else if(draft&&event.target.dataset.wordMember){const id=event.target.dataset.wordMember;if(batch){draft.favorite=id==='favorites';draft.collections=id==='favorites'?[]:[id];for(const input of container.querySelectorAll('[data-word-member]')){input.checked=input.dataset.wordMember==='favorites'?draft.favorite:draft.collections.includes(input.dataset.wordMember);input.closest('.truth-member-choice').dataset.selected=String(input.checked);}}else{draft.collections=event.target.checked?[...new Set([...draft.collections,id])]:draft.collections.filter(value=>value!==id);event.target.closest('.truth-member-choice').dataset.selected=String(event.target.checked);}refreshMemberCounts();if(memberFilter==='selected')refreshMemberships(memberList.snapshot());}
  },{signal});
  container.addEventListener('scroll',event=>{
    const carousel=event.target;if(!carousel.matches?.('.truth-collection-carousel')||!carousel.clientWidth)return;
    const choices=pages(),index=Math.min(choices.length-1,Math.max(0,Math.round(carousel.scrollLeft/carousel.clientWidth)));pageId=choices[index].id;paintGallery(index);updatePager();
  },{capture:true,passive:true,signal});
  container.addEventListener('keydown',event=>{
    if(event.target.matches('.truth-collection-search')&&event.key==='Escape'){event.preventDefault();event.stopPropagation();closeGallerySearch();return;}
    if(event.target.matches('.truth-collection-search')&&event.key==='Enter'){event.preventDefault();event.stopPropagation();const choice=pages()[galleryIndices.get(pageId)||0];if(choice.id!=='new')openCollection(choice.id);return;}
    if(event.target.closest('.truth-collection-carousel')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();movePage(event.key==='Home'?-Infinity:event.key==='End'?Infinity:event.key==='ArrowLeft'?-1:1);$('.truth-collection-carousel').focus({preventScroll:true});}
  },{signal});
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>layoutGallery()):null;observer?.observe(container);
  render();
  function openBatch(options){transfer.close();read();batch=options;draft={en:'',ru:'',example:'',translation:'',favorite:false,collections:[]};draftHome=null;done=null;nameDraft=null;message='';membershipOpen=true;memberQuery='';memberFilter='all';memberPosition=null;render();}
  return {activate,focusSearch,openBatch,canSelect,toggleSelection,cancelSelection,clearSelection(){clearPicked();paintPicked();},open(){transfer.close();clearPicked();query='';searchOpen=false;groups=new Set();filtersOpen=false;batch=null;section='gallery';draft=null;draftHome=null;membershipOpen=false;memberQuery='';memberFilter='all';memberPosition=null;nameDraft=null;done=null;message='';render();},openCard,refresh(){const before=library;read();if(library!==before)render();else if($('.truth-collection-play')){const count=stats(selected);$('.truth-collection-play').disabled=!canPlay()||!count;}cardList?.refresh();memberList?.refresh();layoutGallery();},destroy(){destroyed=true;transfer.destroy();cardList?.destroy();memberList?.destroy();filterList?.destroy();observer?.disconnect();abort.abort();container.replaceChildren();}};
}

import {DominoGame,DOMINO_SET,chooseDominoMove} from './domino.js';
import {layoutDominoChain} from './domino-layout.js';
import {createGameClock} from './game-clock.js';
import {makeGameResult,createJournalReporter} from './game-report.js';
import {createGameFooter} from './game-footer.js';
import {sanitizeDominoPieceStyle} from './domino-appearance.js';
import {createDominoPortrait,getDominoReaction} from './domino-portrait.js';

const DOMINO_DOTS={0:[],1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function dominoFace(a,b){return `<span class="domino-tile" aria-hidden="true">${[a,b].map(n=>`<span class="domino-half">${DOMINO_DOTS[n].map(p=>`<i style="grid-area:${Math.ceil(p/3)}/${(p-1)%3+1}"></i>`).join('')}</span>`).join('')}</span>`;}
export function createDominoGame(container,{onChange=()=>{},onFinish=()=>{},onStart=()=>{},onReport=()=>{},onJournal,game:provided,sceneUrl,frontUrl,backUrl,greenFrontUrl,greenBackUrl,pieceStyle='dark',homeUrl,emotionUrls,characterVisible=true}={}){
  const appearances={
    dark:{front:frontUrl||new URL('./assets/domino-luxury-front-v1.webp',import.meta.url).href,back:backUrl||new URL('./assets/domino-luxury-back-v1.webp',import.meta.url).href,metrics:{'front-size':'133.785822% 121.092150%','front-position':'50% 50.161812%','back-size':'133.584337% 121.092150%','back-position':'50.224215% 49.838188%'}},
    green:{front:greenFrontUrl||new URL('./assets/domino-green-front-v1.webp',import.meta.url).href,back:greenBackUrl||new URL('./assets/domino-green-back-v1.webp',import.meta.url).href,metrics:{'front-size':'133.987915% 121.506849%','front-position':'50.222222% 50.636943%','back-size':'133.383459% 121.009550%','back-position':'50.450450% 50%'}},
  };
  const art={scene:sceneUrl||new URL('./assets/domino-luxury-walnut-v1.webp',import.meta.url).href};
  function paintPieceStyle(value){
    const style=sanitizeDominoPieceStyle(value),appearance=appearances[style];container.dataset.pieceStyle=style;
    art.front=appearance.front;art.back=appearance.back;
    for(const [key,url] of Object.entries(art))container.style.setProperty('--domino-'+key+'-art',`url(${JSON.stringify(url)})`);
    for(const [key,value] of Object.entries(appearance.metrics))container.style.setProperty('--domino-'+key,value);
  }
  paintPieceStyle(pieceStyle);
  const panel=container.closest('.panel'),previousPanelArt=panel?.style.getPropertyValue('--domino-panel-art')||'';
  panel?.style.setProperty('--domino-panel-art',`url(${JSON.stringify(art.scene)})`);
  const game=provided||new DominoGame(),abort=new AbortController(),signal=abort.signal;
  let paused=true,visible=false,destroyed=false,selected=null,reported=false,started=false,boardSignature='';
  let showCharacter=characterVisible!==false;container.dataset.characters=String(showCharacter);
  container.innerHTML=`<div class="tablegame-top"><strong>Домино</strong><span>Один на один</span><details class="tablegame-rules"><summary aria-label="Правила домино">?</summary><div class="tablegame-rules-body">28 костяшек от 0–0 до 6–6, по семь на руках. Начинает старший дубль, а если дублей нет — старшая костяшка. Выберите подсвеченную костяшку в своей руке, затем подходящий конец прямо на столе. Подставляйте совпадающие половины; цепочка изгибается, чтобы целиком оставаться на поле. Нет хода — берите с базара до подходящей; базар пуст — пропускайте. Первый без костяшек выигрывает. При блокировке побеждает меньшая сумма точек на руках, при равенстве — ничья.</div></details></div>
  <div class="domino-home" role="img" aria-label="Домашняя партия с соперником в мягком свитере"><img class="domino-home-scene" width="1774" height="887" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false"><div class="domino-emotions" aria-hidden="true">${Array.from({length:4},(_,frame)=>`<span class="domino-emotion-layer" data-frame="${frame}">${frame?'<img class="domino-emotion-image" width="1774" height="887" alt="" loading="lazy" decoding="async" draggable="false">':''}</span>`).join('')}</div></div>
  <div class="domino-table"><div class="domino-opponent"><div class="domino-summary"><span class="domino-opponent-count"></span><span class="domino-turn-label" role="status" aria-live="polite"></span></div><div class="domino-opponent-hand" aria-hidden="true"></div></div>
  <div class="domino-field"><div class="domino-ends"></div><div class="domino-chain" role="group" aria-label="Цепочка домино и её открытые концы" tabindex="0"><svg class="domino-thread" aria-hidden="true" preserveAspectRatio="none"><path/></svg><div class="domino-chain-tiles"></div><button type="button" class="domino-left domino-end" disabled></button><button type="button" class="domino-right domino-end" disabled></button></div></div>
  <div class="domino-player"><div class="domino-player-heading"><span>Ваши костяшки</span><button type="button" class="domino-draw" disabled><span class="domino-stock"></span></button></div><div class="domino-hand" role="group" aria-label="Ваши костяшки"></div></div></div>
  <div class="domino-reveal" hidden><p class="domino-result-message"></p><p class="domino-reveal-hand"></p></div><button type="button" class="tablegame-new">Новая партия</button>`;
  const $=s=>container.querySelector(s);
  $('.domino-home-scene').src=homeUrl||new URL('./assets/domino-home-scene-v1.webp',import.meta.url).href;
  const sources=['thinking','win','lose'].map((mood,i)=>Array.isArray(emotionUrls)&&emotionUrls[i]||new URL('./assets/domino-emotion-'+mood+'-v1.webp',import.meta.url).href);
  const portrait=createDominoPortrait($('.domino-home'),{sources});
  createGameFooter(container,{removeHeader:true,onRestart:restartGame,signal});
  const reportJournal=createJournalReporter('domino',game,onJournal);
  const clock=createGameClock(()=>{const move=chooseDominoMove(game.view());if(move)game.play(move.id,move.side);else if(game.stock.length)game.draw();else game.pass();render();drive();});
  function begin(){if(!started){started=true;onStart();}}
  function drive(){if(!game.result&&game.turn===1){begin();clock.queue();}}
  function position(node,point,layout){node.style.left=`${point.x/layout.width*100}%`;node.style.top=`${point.y/layout.height*100}%`;}
  function renderBoard(moves,enabled){
    const signature=game.chain.map(t=>`${t.id}:${t.a}:${t.b}`).join('|');
    const layout=layoutDominoChain(game.chain);
    if(signature!==boardSignature||!$('.domino-chain').dataset.ready){
      boardSignature=signature;$('.domino-chain').dataset.ready='true';$('.domino-chain').style.aspectRatio=`${layout.width} / ${layout.height}`;
      $('.domino-thread').setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);$('.domino-thread path').setAttribute('d',layout.path);
      $('.domino-chain-tiles').innerHTML=layout.tiles.map(t=>{
        const tile=game.chain[t.index],[a,b]=t.reverse&&!t.double?[tile.b,tile.a]:[tile.a,tile.b];
        return `<span class="chain-tile${t.double?' domino-double':''}" role="img" aria-label="${tile.a}–${tile.b}" data-chain-index="${t.index}" style="left:${t.x/layout.width*100}%;top:${t.y/layout.height*100}%">${dominoFace(a,b)}</span>`;
      }).join('');
    }
    for(const side of ['left','right']){
      const button=$(`.domino-${side}`),point=layout[side],canPlay=enabled&&moves.some(m=>m.id===selected&&m.side===side);
      button.hidden=!point||!!game.result;button.disabled=!canPlay;
      if(!point)continue;position(button,point,layout);
      const pip=game.chain.length?game.ends[side==='left'?0:1]:DOMINO_SET[game.opening].join('–');
      button.innerHTML=`<span>${game.chain.length?pip:'+'}</span><small>${game.chain.length?(side==='left'?'Слева':'Справа'):'Начать'}</small>`;
      button.setAttribute('aria-label',game.chain.length?`Положить ${selected===null?'костяшку':DOMINO_SET[selected].join('–')} ${side==='left'?'слева':'справа'}, к ${pip}`:`Начать с ${pip}`);
      button.classList.toggle('available-end',canPlay);
    }
    $('.domino-ends').textContent=game.chain.length?'':`Первый ход · ${DOMINO_SET[game.opening].join('–')}`;
    $('.domino-chain').setAttribute('aria-label',game.chain.length?`Цепочка из ${game.chain.length} костяшек. Открытые концы: ${game.ends.join(' и ')}.`:'Пустое поле домино');
  }
  function render(){
    if(destroyed)return;
    const reaction=getDominoReaction(game);container.dataset.reaction=reaction.mood;portrait.setReaction(reaction);
    container.dataset.phase=game.result?'finished':game.chain.length?'playing':'ready';container.dataset.turn=String(game.turn);container.dataset.paused=String(paused);
    const human=game.turn===0&&!game.result,enabled=human&&!paused,moves=game.moves(),playable=new Set(moves.map(m=>m.id));
    if(selected!==null&&!game.hands[0].includes(selected))selected=null;
    $('.domino-opponent-count').textContent=`Соперник · ${game.hands[1].length}`;
    $('.domino-turn-label').textContent=game.result?(game.result.winner===null?'Ничья':game.result.winner===0?'Победа!':'Поражение'):paused?'Пауза':!human?'Ход соперника':!moves.length?(game.stock.length?'Возьми с базара':'Пропусти ход'):selected===null?'Выбери костяшку':!playable.has(selected)?'Не подходит':'Выбери край';
    const backs=Array.from({length:Math.min(game.hands[1].length,9)},()=>'<span class="domino-back"></span>').join('');
    if($('.domino-opponent-hand').innerHTML!==backs)$('.domino-opponent-hand').innerHTML=backs;
    renderBoard(moves,enabled);
    const hand=game.hands[0].map(id=>`<button type="button" data-tile="${id}" class="domino-choice${selected===id?' selected-tile':''}${human&&playable.has(id)?' playable-tile':''}" aria-label="Костяшка ${DOMINO_SET[id].join('–')}${human&&playable.has(id)?', можно сыграть':''}" aria-pressed="${selected===id}" ${enabled?'':'disabled'}>${dominoFace(...DOMINO_SET[id])}</button>`).join('');
    if($('.domino-hand').innerHTML!==hand)$('.domino-hand').innerHTML=hand;
    $('.domino-draw').disabled=!enabled||!!moves.length;$('.domino-draw').hidden=!!game.result;
    $('.domino-stock').textContent=game.stock.length?`Базар · ${game.stock.length}`:'Пропустить';
    $('.domino-draw').setAttribute('aria-label',game.stock.length?`Взять с базара · осталось ${game.stock.length}`:'Пропустить ход');
    $('.domino-result-message').textContent=game.result?(game.result.winner===null?'Ничья.':game.result.winner===0?'Вы победили!':'Победил соперник.')+(game.result.reason==='blocked'?` Блокировка: у вас ${game.result.scores[0]}, у соперника ${game.result.scores[1]}.`:' Все костяшки выложены.'):'';
    $('.domino-reveal').hidden=!game.result;$('.domino-reveal-hand').textContent=game.result?'У соперника: '+(game.hands[1].map(id=>DOMINO_SET[id].join('–')).join(', ')||'нет костяшек'):'';
    if(game.result&&!reported){reported=true;onFinish(game.result.winner);onReport(makeGameResult('domino',game));}reportJournal();onChange();
  }
  function restartGame(){if(destroyed||!visible)return;if(paused)resume();clock.cancel();game.reset();portrait.reset(getDominoReaction(game));selected=null;reported=false;started=false;render();drive();}
  function resume(){if(destroyed)return;paused=false;visible=true;clock.setActive(true);portrait.setActive(showCharacter);drive();render();}
  function activate(target){
    if(target.closest('.game-footer'))return;
    if(paused){if(!visible)return;resume();}
    const tile=target.closest('[data-tile]');
    if(tile){const id=Number(tile.dataset.tile);if(game.turn!==0||game.result||!game.hands[0].includes(id))return;selected=selected===id?null:id;render();return;}
    if(target.closest('.tablegame-new')){restartGame();return;}
    let changed=false;
    if(game.turn===0&&!game.result){if(target.closest('.domino-left'))changed=game.play(selected,'left');else if(target.closest('.domino-right'))changed=game.play(selected,'right');else if(target.closest('.domino-draw'))changed=game.stock.length?game.draw():game.pass();}
    if(changed){begin();selected=null;render();drive();}
  }
  // A tap is handled once; dragging the rack remains a horizontal scroll gesture.
  let touchTap=null,lastTouch=null;
  container.addEventListener('pointerdown',e=>{
    if(e.isPrimary===false)return;touchTap=null;lastTouch=null;
    if(!['touch','pen'].includes(e.pointerType))return;
    const button=e.target.closest('button');if(!button||button.disabled)return;
    touchTap={id:e.pointerId,x:e.clientX,y:e.clientY,button,moved:false};
  },{signal});
  container.addEventListener('pointermove',e=>{if(touchTap?.id===e.pointerId&&Math.hypot(e.clientX-touchTap.x,e.clientY-touchTap.y)>8)touchTap.moved=true;},{signal});
  container.addEventListener('pointercancel',()=>{touchTap=null;lastTouch=null;},{signal});
  container.addEventListener('pointerup',e=>{
    if(touchTap?.id!==e.pointerId)return;const tap=touchTap;touchTap=null;
    if(tap.moved||!tap.button.isConnected||tap.button.disabled)return;
    lastTouch={time:performance.now()};activate(tap.button);
  },{signal});
  container.addEventListener('click',e=>{
    if(lastTouch&&performance.now()-lastTouch.time<800&&(e.isTrusted||e.detail>0)){lastTouch=null;e.preventDefault();e.stopImmediatePropagation();return;}
    activate(e.target);
  },{signal});
  container.addEventListener('keydown',e=>{lastTouch=null;if(paused&&visible&&!e.target.closest('button,.game-footer'))resume();},{capture:true,signal});
  render();
  return {resume,setPieceStyle(value){if(!destroyed)paintPieceStyle(value);},setCharacterVisible(value){if(destroyed)return;const next=value!==false;if(next===showCharacter)return;showCharacter=next;container.dataset.characters=String(next);portrait.setActive(next&&visible&&!paused);onChange();},pause(){if(destroyed)return;touchTap=null;paused=true;clock.setActive(false);portrait.setActive(false);render();},hide(){this.pause();visible=false;},focus(){$('.domino-chain').focus({preventScroll:true});},get stateTag(){return game.result?'finished':paused?'paused':game.chain.length?'playing':'ready';},destroy(){clock.destroy();portrait.destroy();destroyed=true;touchTap=null;abort.abort();container.replaceChildren();for(const key of Object.keys(art))container.style.removeProperty('--domino-'+key+'-art');for(const key of Object.keys(appearances.dark.metrics))container.style.removeProperty('--domino-'+key);if(previousPanelArt)panel?.style.setProperty('--domino-panel-art',previousPanelArt);else panel?.style.removeProperty('--domino-panel-art');}};
}

import { DiceMatch, chooseDiceMove } from './dice.js';
import { getOpponentReaction } from './dice-reactions.js';
import { makeGameResult, createJournalReporter } from './game-report.js';
import {createGameFooter} from './game-footer.js';

const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};

/** A single pending action is frozen when hidden; no opponent moves in the background. */
export function createDiceGame(container,{target=4000,sceneUrl=new URL('./assets/tavern-table-pixel.webp',import.meta.url).href,characterUrl=new URL('./assets/opponent-reactions.webp',import.meta.url).href,tableUrl=new URL('./assets/dice-compact-table-v2.webp',import.meta.url).href,rollDie,onChange=()=>{},onFinish=()=>{},onStart=()=>{},onReport=()=>{},onJournal}={}) {
  const match=new DiceMatch({target,rollDie});
  const abort=new AbortController();
  const signal=abort.signal;
  container.innerHTML=`
    <div class="dice-top"><span class="dice-title">Кости</span><span class="dice-goal"></span><details class="dice-rules"><summary aria-label="Правила игры в кости">?</summary><div class="rules-body">
      <strong>Обычные кости · правила KCD II</strong>
      <p>Выбери зачётные кости. Забери очки или бросай оставшиеся: пустой бросок сжигает весь текущий ход. Все шесть зачтены — можно снова бросить шесть.</p>
      <table><thead><tr><th>Комбинация</th><th>Очки</th></tr></thead><tbody>
      <tr><td>Одна 1 / одна 5</td><td>100 / 50</td></tr><tr><td>Три единицы</td><td>1000</td></tr><tr><td>Три 2, 3, 4, 5 или 6</td><td>200–600</td></tr><tr><td>Каждая такая же сверх трёх</td><td>×2</td></tr><tr><td>1–2–3–4–5</td><td>500</td></tr><tr><td>2–3–4–5–6</td><td>750</td></tr><tr><td>1–2–3–4–5–6</td><td>1500</td></tr></tbody></table>
      <p>Комбинации складываются только из одного броска. Три пары сами по себе очков не дают. Побеждает первый, кто заберёт достаточно очков. Особые кости и значки здесь не используются.</p>
    </div></details></div>
    <div class="dice-scores"><div><span>Вы</span><strong data-total="0">0</strong></div><span class="dice-versus">·</span><div><span>Дрейк</span><strong data-total="1">0</strong></div></div>
    <div class="tavern-stage">
      <img class="tavern-scene" width="768" height="768" alt="Деревянный стол в тёплой пиксельной таверне при свечах." loading="lazy" decoding="async" draggable="false">
      <div class="tavern-character" role="img" aria-label="Соперник сосредоточенно наблюдает."><img class="opponent-sheet" width="1536" height="640" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false"></div>
      <p class="dice-turn" role="status" aria-live="polite"></p>
      <div class="dice-tray" role="group" aria-label="Шесть игральных костей на деревянном столе" tabindex="0">${Array.from({length:6},(_,i)=>`<button type="button" class="die" data-die="${i}" aria-pressed="false" aria-label="Кость ${i+1}"><span class="die-face"><span class="die-pips"></span><span class="die-mark" aria-hidden="true"></span></span></button>`).join('')}</div>
    </div>
    <div class="dice-pot"><span>В ходе <strong class="dice-turn-points">0</strong></span><span class="dice-selection"></span></div>
    <p class="dice-message sr-only" role="status" aria-live="polite"></p>
    <div class="dice-actions"><button type="button" class="dice-roll">Бросить</button><button type="button" class="dice-bank" disabled>Забрать</button></div>
    <p class="dice-log" aria-live="polite"></p>`;
  const $=s=>container.querySelector(s);
  createGameFooter(container,{removeHeader:true,metaSelector:'.dice-goal',signal});
  $('.tavern-stage').style.setProperty('--dice-table',`url("${tableUrl}")`);
  $('.tavern-scene').src=sceneUrl;
  $('.opponent-sheet').src=characterUrl;
  const reportJournal=createJournalReporter('dice',match,onJournal);
  const buttons=[...container.querySelectorAll('[data-die]')];
  let paused=true,visible=false,destroyed=false,rolling=false;
  let timer=null,pending=null,remaining=0,due=0,reported=false,aiBank=false;

  function clearTimer() { if(timer!==null)clearTimeout(timer);timer=null; }
  function startTimer() {
    clearTimer();
    if (!pending||paused||!visible||destroyed) return;
    due=performance.now()+remaining;
    timer=setTimeout(()=>{
      timer=null;
      if(paused||!visible||destroyed)return;
      const action=pending;pending=null;remaining=0;
      step(action);
    },remaining);
  }
  function queue(action,delay) { pending=action;remaining=delay;startTimer(); }
  function beginRoll() { if(!match.started)onStart();rolling=true;render();queue('roll',420); }
  function drive() {
    if(match.phase==='finished') {
      if(!reported){reported=true;onFinish(match.winner);onReport(makeGameResult('dice',match));}
    } else if(match.phase==='bust') queue('next',950);
    else if(match.player===1) {
      if(match.phase==='ready')beginRoll();
      else queue('ai-select',600);
    }
  }
  function step(action) {
    if(action==='roll') { match.roll();rolling=false;render();drive(); }
    else if(action==='next') { match.finishBust();render();drive(); }
    else if(action==='ai-select') {
      const move=chooseDiceMove(match);
      if(!move)return;
      match.select(move.indices);aiBank=move.bank;
      render();queue('ai-commit',600);
    } else if(action==='ai-commit') {
      if(aiBank)match.bank();else match.keepAndRoll();
      render();drive();
    }
  }

  function render() {
    if(destroyed)return;
    container.dataset.phase=match.phase;
    container.dataset.player=String(match.player);
    container.dataset.paused=String(paused);
    container.dataset.rolling=String(rolling);
    const reaction=getOpponentReaction(match,{rolling});
    if(container.dataset.reaction!==reaction.mood) {
      container.dataset.reaction=reaction.mood;
      $('.tavern-character').setAttribute('aria-label',reaction.label);
      $('.opponent-sheet').style.left=`${-(reaction.frame%3)*100}%`;
      $('.opponent-sheet').style.top=`${-Math.floor(reaction.frame/3)*100}%`;
    }
    $('.dice-goal').textContent=`до ${match.target}`;
    for(let i=0;i<2;i++)$(`[data-total="${i}"]`).textContent=String(match.scores[i]);
    const human=match.player===0;
    const selected=match.selectedScore;
    const eligible=human&&match.phase==='choose'&&!rolling&&!paused;
    buttons.forEach((button,i)=>{
      const value=match.values[i];
      const locked=match.locked.has(i);
      const displayedValue=(rolling||match.phase==='ready')&&!locked?null:value;
      button.disabled=!eligible||locked;
      button.classList.toggle('locked',locked);
      button.classList.toggle('selected',match.selected.has(i));
      button.setAttribute('aria-pressed',String(match.selected.has(i)));
      button.setAttribute('aria-label',`Кость ${i+1}: ${displayedValue||(rolling&&!locked?'бросается':'не брошена')}${locked?', отложена':''}`);
      const faces=displayedValue?PIPS[displayedValue].map(p=>`<i style="grid-area:${Math.ceil(p/3)}/${(p-1)%3+1}"></i>`).join(''):'';
      const pips=button.querySelector('.die-pips');
      if(pips.dataset.value!==String(displayedValue)){pips.innerHTML=faces;pips.dataset.value=String(displayedValue);}
      button.querySelector('.die-mark').textContent=locked?'✓':'';
    });
    $('.dice-turn-points').textContent=String(match.turnPoints);
    $('.dice-selection').textContent=selected>0?`выбрано +${selected}`:match.selected.size?'не зачтено':'';
    $('.dice-selection').classList.toggle('invalid',match.selected.size>0&&!selected);
    const turn=match.phase==='finished'?(match.winner===0?'Вы победили!':'Победил Дрейк'):human?'Ваш ход':'Ход Дрейка';
    $('.dice-turn').textContent=turn+(paused&&match.phase!=='finished'?' · пауза':'');
    let message='';
    if(match.phase==='finished')message='Можно сыграть ещё одну партию.';
    else if(paused)message='Коснись стола, чтобы продолжить.';
    else if(rolling)message=human?'Бросаем кости…':'Соперник бросает…';
    else if(match.phase==='bust')message='Пусто — очки этого хода сгорели.';
    else if(!human)message='Соперник выбирает: рискнуть или забрать.';
    else if(match.phase==='ready')message=match.hotDice?'Все зачтены — снова доступны шесть костей.':'Брось шесть костей.';
    else if(match.selected.size&&!selected)message='В выборе есть кости без зачётной комбинации.';
    else if(selected)message=match.selected.size===match.available.length?'Все кости зачтены: можно снова бросить шесть.':'Забери очки или рискни ещё раз.';
    else message='Нажми на зачётные кости, чтобы выбрать их.';
    $('.dice-message').textContent=message;
    const finished=match.phase==='finished';
    const roll=$('.dice-roll');
    roll.textContent=finished?'Новая партия':match.phase==='choose'?`Бросить ${match.available.length-match.selected.size||6}`:'Бросить';
    roll.disabled=paused||rolling||!human&&!finished||!finished&&match.phase!=='ready'&&!match.bankable;
    const bank=$('.dice-bank');
    bank.textContent=match.bankable?`Забрать ${match.turnPoints+selected}`:'Забрать';
    bank.disabled=paused||rolling||!human||!match.bankable;
    const last=match.lastEvent;
    const line=`Дрейк: «${reaction.line}»`;
    if($('.dice-log').textContent!==line)$('.dice-log').textContent=line;
    $('.dice-log').title=last?(last.player===0?'Вы':'Соперник')+(last.type==='bank'?` забрали ${last.points}.`:`: пустой бросок${last.points?`, потеряно ${last.points}`:''}.`):'Шесть обычных костей · равные шансы';
    reportJournal();onChange();
  }

  function resume() {
    if(destroyed)return;
    visible=true;paused=false;
    if(pending)startTimer();else drive();
    render();
  }
  container.addEventListener('pointerdown',event=>{if(!event.target.closest('.game-footer')&&paused&&visible)resume();},{capture:true,signal});
  container.addEventListener('keydown',event=>{if(!event.target.closest('.game-footer')&&paused&&visible)resume();},{capture:true,signal});
  container.addEventListener('click',e=>{
    if(destroyed||e.target.closest('.game-footer'))return;
    if(paused){resume();return;}
    const die=e.target.closest('[data-die]');
    if(die&&match.player===0&&!rolling){match.toggle(Number(die.dataset.die));render();return;}
    if(e.target.closest('.dice-roll')&&!$('.dice-roll').disabled) {
      if(match.phase==='finished'){match.reset();reported=false;rolling=false;render();return;}
      if(match.phase==='choose'&&!match.keepAndRoll())return;
      beginRoll();
    } else if(e.target.closest('.dice-bank')&&!$('.dice-bank').disabled) {
      match.bank();render();drive();
    }
  },{signal});
  render();
  return {
    resume,
    pause() {
      if(destroyed)return;
      if(timer!==null)remaining=Math.max(0,due-performance.now());
      clearTimer();paused=true;render();
    },
    hide() { this.pause();visible=false; },
    reset(nextTarget=match.target) {
      clearTimer();pending=null;rolling=false;reported=false;
      match.reset(nextTarget);render();
    },
    focus() { $('.dice-tray').focus({preventScroll:true}); },
    get stateTag() { return match.phase==='finished'?'finished':paused?'paused':match.phase; },
    destroy() { clearTimer();pending=null;destroyed=true;abort.abort();container.replaceChildren(); },
  };
}

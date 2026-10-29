import { PokerMatch, pokerCard, evaluatePokerHand, choosePokerAction } from './poker.js';
import { makeGameResult, createJournalReporter } from './game-report.js';
import { getPokerReaction } from './poker-reactions.js';
import {createGameFooter} from './game-footer.js';
import {createPortraitFade} from './portrait-fade.js';

const STREETS=['Префлоп','Флоп','Тёрн','Ривер'];
// Whole-body frames are centred on the same torso anchor, without compositing faces.
const PORTRAIT_OFFSETS=[[-4.904,0.0],[5.742,0.0],[-4.904,0.212],[5.622,0.212]];
function cardMarkup(id,{hidden=false,empty=false}={}) {
  if(empty)return '<span class="playing-card empty-card" aria-label="Общая карта ещё не открыта"></span>';
  if(hidden)return '<span class="playing-card card-back" aria-label="Закрытая карта"><span aria-hidden="true">◇</span></span>';
  const c=pokerCard(id);
  return `<span class="playing-card${c.red?' red-card':''}" role="img" aria-label="${c.label}"><span class="card-corner" aria-hidden="true">${c.face}<small>${c.symbol}</small></span><span class="card-suit" aria-hidden="true">${c.symbol}</span></span>`;
}

export function createPokerGame(container,{onChange=()=>{},onFinish=()=>{},onStart=()=>{},onReport=()=>{},onJournal,random=Math.random,decide=choosePokerAction,initialStacks,tableUrl=new URL('./assets/poker-compact-felt-v2.webp',import.meta.url).href,sceneUrl=new URL('./assets/poker-city-lounge.webp',import.meta.url).href,characterUrl=new URL('./assets/poker-opponent-reactions.webp?v=1.17.1',import.meta.url).href}={}) {
  const game=new PokerMatch({random,initialStacks});
  const abort=new AbortController(),signal=abort.signal;
  container.innerHTML=`
    <div class="poker-top"><strong>Покер</strong><span>Холдем · 10 / 20</span><details class="poker-rules"><summary aria-label="Правила покера">?</summary><div class="poker-rules-body"><strong>Техасский холдем · один на один</strong><p>У каждого две закрытые карты, на столе до пяти общих. Побеждает лучшая комбинация из любых пяти доступных карт — или тот, кому уступили после паса.</p><p>Чек — пропустить без ставки. Колл — уравнять ставку. Ставка / рейз — увеличить её, пас — отдать раздачу. Ползунок задаёт общую ставку за текущий раунд, а не добавку.</p><p>От старшей к младшей: роял-флеш, стрит-флеш, каре, фулл-хаус, флеш, стрит, тройка, две пары, пара, старшая карта. Туз может завершать стрит A–2–3–4–5. Равные пять карт делят банк.</p><p>По 1000 условных фишек. Блайнды 10 / 20 переходят по очереди. При ва-банке непокрытый остаток возвращается. Собери все фишки, чтобы выиграть матч.</p></div></details></div>
    <div class="poker-table" role="group" aria-label="Карты и фишки в покере" tabindex="0">
      <img class="poker-scene" width="768" height="768" alt="" loading="lazy" decoding="async" draggable="false">
      <div class="poker-portrait"><div class="poker-opponent-art" role="img">${PORTRAIT_OFFSETS.map((_,frame)=>`<span class="poker-character-layer" data-frame="${frame}"><img class="poker-character-sheet" width="1672" height="942" alt="" loading="lazy" decoding="async" draggable="false"></span>`).join('')}</div><span class="poker-turn" role="status" aria-live="polite"></span></div>
      <div class="poker-felt"><div class="poker-seat"><div class="poker-seat-label"><span class="poker-opponent-name">Соперник</span><strong class="poker-opponent-stack">1000</strong></div><div class="poker-hand opponent-hand"></div><span class="poker-opponent-bet"></span></div>
      <div class="poker-middle"><div class="poker-pot"><span class="poker-street">Холдем</span><span>Банк <strong>0</strong></span></div><div class="poker-community"></div></div>
      <div class="poker-seat human-seat"><div class="poker-seat-label"><span class="poker-human-name">Вы</span><strong class="poker-human-stack">1000</strong></div><div class="poker-hand human-hand"></div><span class="poker-human-bet"></span><div class="poker-combination"></div></div><p class="poker-log"></p></div>
    </div>
    <p class="poker-message sr-only" role="status" aria-live="polite"></p>
    <div class="poker-controls"><label class="poker-raise-label"><span>Ставка за раунд <strong class="poker-raise-value"></strong></span><input class="poker-raise-range" type="range" min="40" max="1000" value="40" step="1" aria-label="Общая ставка в текущем раунде"></label><div class="poker-action-slot"><div class="poker-actions"><button type="button" class="poker-fold">Пас</button><button type="button" class="poker-call">Чек</button><button type="button" class="poker-raise">Рейз</button></div><button type="button" class="poker-deal">Раздать карты</button></div></div>`;
  const $=s=>container.querySelector(s);
  createGameFooter(container,{removeHeader:true,metaSelector:'.poker-top > span',signal});
  $('.poker-table').style.setProperty('--poker-surface',`url("${tableUrl}")`);
  $('.poker-scene').src=sceneUrl;for(const image of container.querySelectorAll('.poker-character-sheet'))image.src=characterUrl;
  const layers=[...container.querySelectorAll('.poker-character-layer')];let portraitFrame=-1;
  const portraitFade=createPortraitFade($('.poker-opponent-art'),layers,{easing:'ease-in-out'});
  // A layer owns one fixed atlas cell throughout its lifetime. A rapid new
  // reaction can retarget opacity, never move an image that is still fading.
  layers.forEach((layer,frame)=>{const [x,y]=PORTRAIT_OFFSETS[frame],image=layer.querySelector('img');image.style.left=`${-(frame%2)*100+x}%`;image.style.top=`${-Math.floor(frame/2)*100+y}%`;});
  function showReaction(reaction){
    container.dataset.reaction=reaction.mood;$('.poker-opponent-art').setAttribute('aria-label',reaction.label);
    if(portraitFrame===reaction.frame)return;
    portraitFade.show(reaction.frame,{instant:portraitFrame<0||paused||!visible,duration:320});
    portraitFrame=reaction.frame;
  }
  const reportJournal=createJournalReporter('poker',game,onJournal);
  let paused=true,visible=false,destroyed=false,timer=null,pending=false,remaining=650,due=0,reported=false;
  let raiseValue=null,raiseKey='';
  let reportHand=0;

  function clearTimer(){if(timer!==null)clearTimeout(timer);timer=null;}
  function startTimer(){
    clearTimer();if(!pending||paused||!visible||destroyed)return;
    due=performance.now()+remaining;
    timer=setTimeout(()=>{
      timer=null;if(paused||!visible||destroyed)return;
      pending=false;remaining=650;
      const move=decide(game.view(1),random);
      if(move)game.act(1,move.type,move.to);
      render();drive();
    },remaining);
  }
  function drive(){
    if(game.phase==='finished'&&!reported){reported=true;onFinish(game.matchWinner);}
    if(game.phase==='playing'&&game.actor===1&&!pending){pending=true;remaining=650;startTimer();}
  }
  function cards(selector,markup){if($(selector).innerHTML!==markup)$(selector).innerHTML=markup;}
  function render(){
    if(destroyed)return;
    container.dataset.phase=game.phase;container.dataset.actor=String(game.actor);container.dataset.paused=String(paused);container.dataset.street=String(game.street);
    const playing=game.phase==='playing',done=!!game.result,human=playing&&game.actor===0;
    showReaction(getPokerReaction(game));
    $('.poker-turn').textContent=done?(game.result.winner===null?'Банк разделён':game.result.winner===0?'Вы забрали банк':'Банк сопернику'):paused?'Пауза':playing?(human?'Ваш ход':'Ход соперника'):'За вашим столом';
    const legal=game.legalActions(0),enabled=human&&!paused;
    $('.poker-opponent-stack').textContent=String(game.stacks[1]);$('.poker-human-stack').textContent=String(game.stacks[0]);
    $('.poker-human-name').textContent=`Вы${game.handNumber&&game.dealer===0?' · D':''}`;
    $('.poker-opponent-name').textContent=`Соперник${game.handNumber&&game.dealer===1?' · D':''}`;
    for(const [i,selector] of [[0,'.poker-human-bet'],[1,'.poker-opponent-bet']])$(selector).textContent=playing&&game.bets[i]?`Ставка ${game.bets[i]}${game.stacks[i]===0?' · ва-банк':''}`:'';
    const reveal=game.result?.reason==='showdown';
    cards('.opponent-hand',Array.from({length:2},(_,i)=>cardMarkup(game.hands[1][i],{hidden:!reveal})).join(''));
    cards('.human-hand',Array.from({length:2},(_,i)=>cardMarkup(game.hands[0][i],{hidden:!game.hands[0].length})).join(''));
    cards('.poker-community',Array.from({length:5},(_,i)=>cardMarkup(game.board[i],{empty:i>=game.board.length})).join(''));
    $('.poker-pot strong').textContent=String(done?game.lastPot:game.pot);
    $('.poker-street').textContent=done?'Раздача завершена':game.handNumber?STREETS[game.street]:'До первой раздачи';
    const combination=game.hands[0].length&&game.board.length>=3?evaluatePokerHand([...game.hands[0],...game.board]).name:'';
    $('.poker-combination').textContent=combination;
    let message;
    if(game.phase==='idle')message='Две карты на руках. Начнём?';
    else if(done){
      const {winner,reason,hands}=game.result;
      message=winner===null?'Ничья — банк разделён.':`${winner===0?'Вы забрали':'Соперник забрал'} банк ${game.lastPot}.`;
      if(reason==='fold')message+=` ${winner===0?'Соперник':'Вы'} — пас.`;
      else if(winner!==null)message+=` ${hands[winner].name}.`;
      if(game.phase==='finished')message+=game.matchWinner===0?' Вы выиграли матч!':'Матч выиграл соперник.';
    }else message=paused?'Пауза · коснись карт, чтобы продолжить.':human?legal.toCall?`Ваш ход · уравнять ${legal.call}${legal.call===game.stacks[0]?' · ва-банк':''}.`:'Ваш ход · чек или ставка.':'Соперник думает…';
    $('.poker-message').textContent=message;
    const slider=$('.poker-raise-range');
    // Keep the player's last slider bounds and selection while the opponent
    // acts: legalActions(0) is empty off turn, but the control still keeps its row.
    if(human&&legal.canRaise){
      const key=`${game.handNumber}/${game.street}/${game.currentBet}/${game.actor}`;
      if(key!==raiseKey){raiseKey=key;raiseValue=legal.minRaiseTo;}
      raiseValue=Math.max(legal.minRaiseTo,Math.min(legal.maxRaiseTo,raiseValue||legal.minRaiseTo));
      slider.min=String(legal.minRaiseTo);slider.max=String(legal.maxRaiseTo);slider.value=String(raiseValue);
    }
    slider.disabled=!enabled||!legal.canRaise;
    $('.poker-raise-value').textContent=String(raiseValue??Number(slider.value));
    $('.poker-actions').hidden=!playing;
    $('.poker-fold').disabled=!enabled||!legal.fold;
    $('.poker-call').disabled=!enabled;$('.poker-call').textContent=legal.toCall?`Колл ${legal.call}`:'Чек';
    $('.poker-raise').disabled=!enabled||!legal.canRaise;
    $('.poker-raise').textContent=raiseValue&&raiseValue===Number(slider.max)?'Ва-банк':game.currentBet?'Рейз':'Ставка';
    $('.poker-deal').hidden=playing;$('.poker-deal').disabled=paused;
    $('.poker-deal').textContent=game.phase==='idle'?'Раздать карты':game.phase==='finished'?'Новый матч':'Следующая раздача';
    const action=game.lastAction;
    $('.poker-log').textContent=action?`${action.player===0?'Вы':'Соперник'}: ${action.type==='fold'?'пас':action.type==='check'?'чек':action.type==='call'?`колл ${action.paid}`:`${action.opening?'ставка':'рейз'} до ${action.to}`}.`:'';
    if(game.result&&reportHand!==game.handNumber){reportHand=game.handNumber;onReport(makeGameResult('poker',game));}
    reportJournal();onChange();
  }
  function resume(){if(destroyed)return;visible=true;paused=false;if(pending)startTimer();else drive();render();}
  container.addEventListener('pointerdown',e=>{if(paused&&visible&&!e.target.closest('.game-footer,button,input'))resume();},{capture:true,signal});
  container.addEventListener('keydown',e=>{if(paused&&visible&&!e.target.closest('.game-footer'))resume();},{capture:true,signal});
  container.addEventListener('input',e=>{if(e.target.matches('.poker-raise-range')&&!e.target.disabled){raiseValue=Number(e.target.value);render();}},{signal});
  container.addEventListener('click',e=>{
    if(destroyed||e.target.closest('.game-footer'))return;if(paused){resume();return;}
    if(e.target.closest('.poker-deal')&&!$('.poker-deal').disabled){if(game.phase==='finished'){game.reset();reported=false;reportHand=0;}if(game.deal()&&game.handNumber===1)onStart();render();drive();return;}
    for(const [selector,type] of [['.poker-fold','fold'],['.poker-call',game.legalActions(0).toCall?'call':'check'],['.poker-raise','raise']]){
      if(e.target.closest(selector)&&!$(selector).disabled){if(game.act(0,type,raiseValue)){render();drive();}break;}
    }
  },{signal});
  render();
  return {
    resume,
    pause(){if(destroyed)return;if(timer!==null)remaining=Math.max(0,due-performance.now());clearTimer();paused=true;portraitFade.finish();render();},
    hide(){this.pause();visible=false;},
    focus(){$('.poker-table').focus({preventScroll:true});},
    get stateTag(){return game.phase==='finished'?'finished':paused?'paused':game.phase;},
    destroy(){clearTimer();pending=false;destroyed=true;portraitFade.destroy();abort.abort();container.replaceChildren();},
  };
}

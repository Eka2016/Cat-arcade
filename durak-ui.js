import {DurakGame,DURAK_SUITS,durakCard,durakCardText,sortDurakHand} from './durak.js';
import {chooseDurakOpponentMove} from './durak-opponent.js';
import {BOARD_DIFFICULTIES,sanitizeBoardDifficulty} from './board-difficulty.js';
import {createDurakPortrait,getDurakReaction} from './durak-portrait.js';
import {createDurakOutfit} from './durak-outfit.js';
import {sanitizeDurakTableStyle} from './durak-appearance.js';
import {createGameClock} from './game-clock.js';
import {createGameFooter} from './game-footer.js';
import {createJournalReporter,makeGameResult} from './game-report.js';

const SUIT_NAMES=['трефы','бубны','червы','пики'];
function face(id){const c=durakCard(id);return `<span class="durak-face${c.red?' durak-red':''}" aria-hidden="true"><span class="durak-corner">${c.face}<small>${c.symbol}</small></span><span class="durak-pip">${c.symbol}</span><span class="durak-corner durak-corner-bottom">${c.face}<small>${c.symbol}</small></span></span>`;}
const label=(id,trump)=>{const c=durakCard(id);return `${c.face}, ${SUIT_NAMES[c.suit]}${c.suit===trump?', козырь':''}`;};

export function createDurakGame(container,{game:provided,onChange=()=>{},onStart=()=>{},onFinish=()=>{},onReport=()=>{},onJournal,difficulty='normal',onDifficultyChange=()=>{},sceneUrl,tableUrl,characterUrl,emotionUrls,tableStyle='wood',characterVisible=true,outfit='sweater',onOutfitError=()=>{}}={}){
  const game=provided||new DurakGame(),abort=new AbortController(),signal=abort.signal;
  let paused=true,visible=false,destroyed=false,started=false,reported=false,level=sanitizeBoardDifficulty(difficulty),showCharacter=characterVisible!==false;
  container.dataset.characters=String(showCharacter);
  container.dataset.tableStyle=sanitizeDurakTableStyle(tableStyle);
  container.innerHTML=`<div class="tablegame-top"><strong>Дурак</strong><details class="tablegame-rules"><summary aria-label="Правила игры в дурака">?</summary><div class="tablegame-rules-body">Подкидной дурак, один на один. 36 карт от шестёрки до туза, по шесть на руках. Первым ходит обладатель младшего козыря; если козырей ни у кого нет — жребий. Открытая карта под колодой задаёт козырь и добирается последней. Обмена козырной шестёрки нет.<br><br>Нажми на подсвеченную карту, чтобы сходить или отбиться. Обычную карту бьёт старшая той же масти или любой козырь; козырь — только старший козырь. Подкидывать можно карты того же достоинства, что уже есть на столе, включая карты защиты. За один заход — не больше шести карт атаки и не больше, чем было у защищающегося в начале захода.<br><br>«Бито» завершает отражённую атаку. «Взять» означает забрать весь стол; перед этим атакующий ещё может подкинуть подходящие карты, затем нажать «Завершить». Взявший пропускает следующий ход. После захода сначала добирает атакующий, затем защищавшийся — до шести карт.<br><br>Когда колода пуста, избавься от всех карт. Результат определяется после завершения захода: оставшийся с картами проиграл, оба без карт — ничья. Лапка сворачивает игру и ставит её на паузу.</div></details></div>
  <div class="durak-setting"><div class="durak-home"><img class="durak-home-scene" width="972" height="580" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false"><div class="durak-character" role="img" aria-label="Соперник за карточным столом"><img class="durak-character-shirt durak-character-image" width="1536" height="1024" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false" hidden><img class="durak-character-base durak-character-image" width="1536" height="1024" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">${Array.from({length:4},(_,frame)=>`<span class="durak-emotion-layer" data-frame="${frame}" aria-hidden="true">${frame===1?'<span class="durak-gaze-eye durak-gaze-left"><img class="durak-character-image" width="1536" height="1024" alt="" loading="lazy" decoding="async" draggable="false"></span><span class="durak-gaze-eye durak-gaze-right"><img class="durak-character-image" width="1536" height="1024" alt="" loading="lazy" decoding="async" draggable="false"></span>':frame?'<img class="durak-character-image" width="1536" height="1024" alt="" loading="lazy" decoding="async" draggable="false">':''}</span>`).join('')}</div></div>
  <div class="durak-table" tabindex="0" role="group" aria-label="Карточный стол для игры в дурака">
    <div class="durak-overview"><div class="durak-stock" role="img"><span class="durak-stock-back"></span><span class="durak-trump"></span><b class="durak-stock-count"></b></div><div class="durak-rival"><div class="durak-rival-label"></div><div class="durak-rival-hand" aria-hidden="true"></div></div><div class="durak-discard" title="Карт в бито"></div></div>
    <div class="durak-battle" role="group" aria-label="Карты на столе"></div>
    <div class="durak-status" role="status" aria-live="polite"></div>
    <div class="durak-hand" role="group" aria-label="Ваши карты"></div>
    <div class="durak-actions"><button type="button" class="durak-take">Взять</button><button type="button" class="durak-pass">Бито</button></div>
  </div></div><button type="button" class="tablegame-new">Новая партия</button>`;
  const $=s=>container.querySelector(s);
  $('.durak-home-scene').src=sceneUrl||new URL('./assets/durak-room-v3.webp',import.meta.url).href;
  $('.durak-setting').style.setProperty('--durak-table-texture',`url("${tableUrl||new URL('./assets/durak-table-v4.webp',import.meta.url).href}")`);
  const sources=[characterUrl||new URL('./assets/durak-neutral-v9.webp',import.meta.url).href,...['thinking','win','lose'].map((mood,i)=>emotionUrls?.[i]||new URL('./assets/durak-'+mood+'-v9.webp',import.meta.url).href)];
  $('.durak-character-base').src=sources[0];
  const portrait=createDurakPortrait($('.durak-character'),{sources:sources.slice(1)});
  const outfitView=createDurakOutfit($('.durak-character'),$('.durak-character-shirt'),{outfit,source:new URL('./assets/durak-shirt-v1.webp',import.meta.url).href,headImage:$('.durak-character-base'),onError:onOutfitError});
  const settingsElement=container.ownerDocument.createElement('div');settingsElement.className='durak-options';
  settingsElement.innerHTML=`<label class="board-difficulty-label"><span>Сложность соперника</span><select class="durak-difficulty" aria-label="Дурак: сложность соперника">${Object.entries(BOARD_DIFFICULTIES).map(([value,profile])=>`<option value="${value}">${profile.label}</option>`).join('')}</select></label><p class="durak-difficulty-status" role="status" hidden></p>`;
  container.append(settingsElement);
  settingsElement.querySelector('select').value=level;
  settingsElement.addEventListener('change',e=>{
    if(!e.target.matches('.durak-difficulty')||destroyed)return;
    const next=sanitizeBoardDifficulty(e.target.value),status=settingsElement.querySelector('.durak-difficulty-status');
    try{onDifficultyChange(next);level=next;status.hidden=true;}
    catch{e.target.value=level;status.textContent='Не удалось сохранить сложность. Попробуйте ещё раз.';status.hidden=false;}
    onChange();
  },{signal});
  createGameFooter(container,{removeHeader:true,onRestart:restart,signal});
  const reportJournal=createJournalReporter('durak',game,onJournal);
  const clock=createGameClock(()=>{const move=chooseDurakOpponentMove(game.view(),level);if(move)game.play(move);render();drive();},650);
  function begin(){if(!started){started=true;onStart();}}
  function drive(){if(!game.result&&game.turn===1){begin();clock.queue();}}
  function render(){
    if(destroyed)return;
    portrait.setReaction(getDurakReaction(game));
    const human=game.turn===0&&!game.result,moves=human?game.moves():[],legal=new Set(moves.filter(m=>Number.isInteger(m.card)).map(m=>m.card));
    container.dataset.paused=String(paused);container.dataset.phase=game.result?'finished':game.phase;
    $('.durak-stock-count').textContent=String(game.stock.length);
    $('.durak-stock-back').hidden=game.stock.length<2;
    $('.durak-trump').innerHTML=game.stock.length?face(game.trumpCard):`<span class="durak-trump-empty">${DURAK_SUITS[game.trump]}</span>`;
    $('.durak-stock').setAttribute('aria-label',`В колоде ${game.stock.length} карт, козырь ${SUIT_NAMES[game.trump]}${game.stock.length?', открыта '+durakCardText(game.trumpCard):''}`);
    $('.durak-discard').textContent=`Бито\n${game.discard.length}`;
    $('.durak-rival-label').textContent=`Соперник · ${game.hands[1].length}`;
    const rival=game.result?sortDurakHand(game.hands[1],game.trump).map(id=>`<span class="durak-rival-reveal" role="img" aria-label="${label(id,game.trump)}">${face(id)}</span>`).join(''):Array.from({length:Math.min(game.hands[1].length,8)},()=>'<span class="durak-back"></span>').join('');
    $('.durak-rival-hand').setAttribute('aria-hidden',String(!game.result));
    if($('.durak-rival-hand').innerHTML!==rival)$('.durak-rival-hand').innerHTML=rival;
    const pairs=game.result?game.lastBout?.pairs||[]:game.table;
    const battle=pairs.length?pairs.map(p=>`<div class="durak-pair" role="img" aria-label="Атака ${label(p.attack,game.trump)}${p.defense===null?', не отбита':'; отбита '+label(p.defense,game.trump)}"><span class="durak-attack">${face(p.attack)}</span>${p.defense===null?'<span class="durak-unbeaten" aria-hidden="true"></span>':`<span class="durak-defense">${face(p.defense)}</span>`}</div>`).join(''):`<div class="durak-empty" aria-hidden="true"><span>♠</span><small>Подкидной · 36 карт</small></div>`;
    if($('.durak-battle').innerHTML!==battle)$('.durak-battle').innerHTML=battle;
    const hand=sortDurakHand(game.hands[0],game.trump).map(id=>`<button type="button" data-durak-card="${id}" class="durak-choice${legal.has(id)?' durak-playable':''}" aria-label="${label(id,game.trump)}${legal.has(id)?', можно сыграть':''}" title="${label(id,game.trump)}" ${human&&legal.has(id)&&visible?'':'disabled'}>${face(id)}</button>`).join('');
    const rack=$('.durak-hand');if(rack.innerHTML!==hand){const scroll=rack.scrollLeft;rack.innerHTML=hand;rack.scrollLeft=scroll;}
    $('.durak-status').textContent=game.result?(game.result.winner===null?'Ничья · оба без карт':game.result.winner===0?'Победа! Соперник остался с картами.':'Поражение · у тебя остались карты.'):
      paused?'Пауза':!human?(game.phase==='taking'?'Соперник подкидывает…':'Ход соперника…'):game.phase==='defend'?'Отбей карту или возьми':game.phase==='taking'?'Соперник берёт · подкинь или заверши':game.table.length?'Подкинь карту или нажми «Бито»':'Выбери карту для атаки';
    $('.durak-take').disabled=!visible||!moves.some(m=>m.type==='take');
    $('.durak-pass').disabled=!visible||!moves.some(m=>m.type==='pass');
    $('.durak-pass').textContent=game.phase==='taking'?'Завершить':'Бито';
    if(game.result&&!reported){reported=true;onFinish(game.result.winner);onReport(makeGameResult('durak',game));}
    reportJournal();onChange();
  }
  function resume(){if(destroyed)return;visible=true;paused=false;clock.setActive(true);portrait.setActive(showCharacter);outfitView.setActive(showCharacter);render();drive();}
  function restart(){if(destroyed||!visible)return;clock.cancel();game.reset();portrait.reset(getDurakReaction(game));started=false;reported=false;resume();}
  container.addEventListener('click',e=>{
    if(destroyed||!visible||e.target.closest('.game-footer'))return;
    if(paused)resume();
    if(game.result||game.turn!==0)return;
    const card=e.target.closest('[data-durak-card]');
    const move=card?game.moves().find(m=>m.card===Number(card.dataset.durakCard)):e.target.closest('.durak-take')?{type:'take'}:e.target.closest('.durak-pass')?{type:'pass'}:null;
    if(move&&game.play(move)){begin();render();drive();}
  },{signal});
  render();
  return {resume,settingsElement,setOutfit(value){if(destroyed)return;outfitView.setOutfit(value);onChange();},setTableStyle(value){if(destroyed)return;container.dataset.tableStyle=sanitizeDurakTableStyle(value);onChange();},setCharacterVisible(value){if(destroyed)return;showCharacter=value!==false;container.dataset.characters=String(showCharacter);portrait.setActive(showCharacter&&visible&&!paused);outfitView.setActive(showCharacter&&visible&&!paused);onChange();},pause(){if(destroyed)return;paused=true;clock.setActive(false);portrait.setActive(false);outfitView.setActive(false);render();},hide(){this.pause();visible=false;},focus(){$('.durak-table').focus({preventScroll:true});},get stateTag(){return game.result?'finished':paused?'paused':'playing';},destroy(){destroyed=true;clock.destroy();portrait.destroy();outfitView.destroy();abort.abort();container.replaceChildren();}};
}

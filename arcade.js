import { Snake, DIRECTIONS, SPEEDS } from './snake.js';
import { anchorPanel, clamp } from './positioning.js';
import { createDiceGame } from './dice-ui.js';
import { createPokerGame } from './poker-ui.js';
import { createBoardGame } from './board-ui.js';
import { createDominoGame } from './domino-ui.js';
import { createWordsGame } from './words-ui.js';
import { sanitizeWordProgress,sanitizeWordRoundSize } from './words.js';
import {wordPreset,wordSet} from './words-content.js';
import {sanitizeWordLibrary,seedWordTopics} from './words-library.js';
import { createDndGame } from './dnd-ui.js';
import { sanitizeDndRounds, sanitizeDndRound, sanitizeDndPreset } from './dnd.js';
import { createDemoStoryBridge } from './dnd-demo.js';
import { sanitizeGameReport, sanitizeGameReports } from './game-report.js';
import { createGameReportManager } from './game-report-ui.js';
import { CHAT_SENDERS, sanitizeChatSender } from './chat-message.js';
import { sanitizeBoardDifficulty } from './board-difficulty.js';
import {createTruthGame} from './truth-dare-ui.js';
import {truthPreset,truthRounds,truthRound} from './truth-dare.js';
import {RECORD_GAMES,sanitizeArcadeStats,recordArcadeResult,wordRoundOutcome} from './arcade-stats.js';
import {sanitizeTruthLibrary} from './truth-library.js';
import {sanitizeDndLibrary} from './dnd-library.js';
import {createGameArtLoader} from './game-art.js';
import {DND_DIE_STYLES,sanitizeDndDieStyle} from './dnd-numerals.js';
import {DOMINO_PIECE_STYLES,sanitizeDominoPieceStyle} from './domino-appearance.js';
import {renameChatHistory} from './chat-history.js';

const PAW = `<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="10" cy="15" rx="4" ry="6" transform="rotate(-25 10 15)"/><ellipse cx="18" cy="10" rx="4" ry="6" transform="rotate(-8 18 10)"/><ellipse cx="27" cy="11" rx="4" ry="6" transform="rotate(12 27 11)"/><ellipse cx="33" cy="19" rx="3.5" ry="5.5" transform="rotate(30 33 19)"/><path d="M12 28c0-5 5-11 10-11s10 7 10 12c0 6-6 6-10 4-5 2-10 1-10-5Z"/></svg>`;
const LAUNCHER_LABEL='Открыть или свернуть игру. Удерживайте для меню, перетащите для перемещения.';
const LAUNCHER_TITLE='Нажатие — открыть или свернуть · удержание — меню · перетаскивание — переместить';
const SNAKE_ICON = `<svg viewBox="0 0 110 64" aria-hidden="true"><path d="M18 48h22V30h22v18h22V16H68" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round"/><rect x="58" y="6" width="28" height="22" rx="6" fill="currentColor"/><rect x="64" y="11" width="4" height="4" fill="#13271f"/><rect x="77" y="11" width="4" height="4" fill="#13271f"/><path d="M69 23h7v7" stroke="#efa09c" stroke-width="3" fill="none"/><path d="m24 11 3-5 4 5v7H24Z" fill="#f2b777"/><path d="m29 9 5-4" stroke="#87c99b" stroke-width="3"/></svg>`;
const DICE_ICON = `<svg viewBox="0 0 110 64" aria-hidden="true"><g transform="translate(12 15) rotate(-10 19 19)"><rect width="38" height="38" rx="8" fill="#e3d1aa"/><g fill="#314b35"><circle cx="11" cy="11" r="3"/><circle cx="27" cy="11" r="3"/><circle cx="19" cy="19" r="3"/><circle cx="11" cy="27" r="3"/><circle cx="27" cy="27" r="3"/></g></g><g transform="translate(58 9) rotate(13 19 19)"><rect width="38" height="38" rx="8" fill="#f1dfba"/><g fill="#314b35"><circle cx="11" cy="11" r="3"/><circle cx="19" cy="19" r="3"/><circle cx="27" cy="27" r="3"/></g></g></svg>`;

const POKER_ICON=`<svg viewBox="0 0 110 64" aria-hidden="true"><g transform="translate(22 7) rotate(-10 19 25)"><rect width="35" height="50" rx="4" fill="#e4ddc9"/><path d="M17 16c-7 8-12 13-12 18 0 6 8 7 12 3 4 4 12 3 12-3 0-5-5-10-12-18Z" fill="#283e32"/></g><g transform="translate(54 6) rotate(9 19 25)"><rect width="35" height="50" rx="4" fill="#f1e8d5"/><path d="m17 15 11 15-11 15L6 30Z" fill="#b0594e"/></g></svg>`;

const MENU_ICONS={
  chess:'<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="paw-menu-knight" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#64756d"/><stop offset=".38" stop-color="#252f2c"/><stop offset="1" stop-color="#0a100e"/></linearGradient></defs><g stroke="#a5b29a" stroke-width=".8" stroke-linejoin="round"><path d="M9.7 24c.1-4.7 2.1-8.3 5.5-11.7l-4.4.6-2.2 2.5-4-2.6 4.9-7.2 4.1-.2 2.2-3.2 1.2 3.5c7.5 2.2 10 9.9 5.3 18.3Z" fill="url(#paw-menu-knight)"/><path d="M9 24h13.5l1.2 2.6H7.8Zm-.9 3h15.2l1.9 2.4H6.2Z" fill="url(#paw-menu-knight)"/></g><path d="M18.2 7.8c5.9 4.4 5.7 10.2 2.3 15.1" fill="none" stroke="#8b9c8a" stroke-width="1.2" stroke-linecap="round"/><path d="m19.8 9.7-1.7 1.1m3.2 1.2-1.9.9m2.6 1.8-2 .5m2.2 2.2-2 .1" stroke="#51675c" stroke-width="1" stroke-linecap="round"/><circle cx="12" cy="8.1" r=".95" fill="#e2dec2"/><path d="m6.6 12 2.3-.2M10 28.1h10.5" fill="none" stroke="#a5b39a" stroke-width=".7" stroke-linecap="round"/></svg>',
  dnd:'<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="paw-menu-d20" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#789a74"/><stop offset=".45" stop-color="#315c47"/><stop offset="1" stop-color="#162c26"/></linearGradient></defs><g stroke="#d5bc83" stroke-width="1" stroke-linejoin="round"><path d="m16 2 13 8-2 14-11 6L5 24 3 10Z" fill="url(#paw-menu-d20)"/><path d="M16 7 7 23h18ZM16 2v5M3 10l13-3 13 3M3 10l4 13-2 1M29 10l-4 13 2 1M7 23l9 7 9-7" fill="none"/></g><text x="16" y="20.2" text-anchor="middle" fill="#f0d8a4" font-family="Georgia,serif" font-size="8" font-weight="700">20</text></svg>',
  checkers:'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="9" cy="16.5" rx="7.5" ry="5.2" fill="#956044"/><ellipse cx="9" cy="14" rx="7.5" ry="5.2" fill="#e8bb7e"/><ellipse cx="9" cy="14" rx="5" ry="3.3" fill="none" stroke="#ae784d"/><ellipse cx="15.2" cy="10" rx="7.2" ry="5.1" fill="#315e54"/><ellipse cx="15.2" cy="7.6" rx="7.2" ry="5.1" fill="#89b5a1"/><ellipse cx="15.2" cy="7.6" rx="4.8" ry="3.2" fill="none" stroke="#4c7a69"/></svg>',
  domino:'<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-18 12 12)"><rect x="5.5" y="1.5" width="13" height="21" rx="2" fill="#121e15"/><rect x="5" y="1" width="13" height="20" rx="2" fill="#294c37" stroke="#92935e" stroke-width=".65"/><path d="M7 11h9" stroke="#c0a267"/><path d="m7 8 1-4m7 14 1-4M7.4 6.5l-1-.8m1.3-.4 1.4-.5m6 11.7-1-.8m1.3-.4 1.4-.5" fill="none" stroke="#7e9668" stroke-width=".55"/><g fill="#d0b475"><circle cx="8.5" cy="5" r="1.1"/><circle cx="14.5" cy="8" r="1.1"/><circle cx="8.5" cy="14.5" r="1.1"/><circle cx="11.5" cy="16.5" r="1.1"/><circle cx="14.5" cy="18.5" r="1.1"/></g></g></svg>',
  words:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="18" height="17" rx="3" fill="#788f8c"/><rect x="4" y="2" width="18" height="18" rx="3" fill="#e8d5ac"/><path d="m7 15 3.5-9L14 15m-5.8-3h4.6" fill="none" stroke="#54836c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 7h3m-3 4h3m-3 4h2" stroke="#b47b56" stroke-width="1.5" stroke-linecap="round"/></svg>',
  truth:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 19C1 12 8 5 19.5 3c2 11-2.5 20-10 18Z" fill="#aac78c"/><path d="M8 18c-2-5 2-10 10-12-1 6-4 10-10 12Z" fill="#d5dfab"/><path d="M5 22c3-6 7-10 13-15" fill="none" stroke="#5b9264" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

const EXTRA_GAMES=[
  {id:'chess',title:'Шахматы',description:'Ваш ход, белые.',symbol:'♞'},
  {id:'checkers',title:'Шашки',description:'Русские · 8 × 8.',symbol:'◉'},
  {id:'domino',title:'Домино',description:'Собери цепочку.',symbol:'⚂'},
  {id:'dnd',title:'ДНД · d20',description:'Событие для истории.',symbol:'20'},
  {id:'words',title:'Английский',description:'Слова, примеры и повторение.',symbol:'Aa'},
  {id:'truth',title:'Правда / действие',description:'Карточки и жетон.',symbol:'◇'},
];
const CHARACTER_GAMES={dice:'Кости',poker:'Покер',chess:'Шахматы',checkers:'Шашки',words:'Английский',domino:'Домино'};

export function sanitizeSettings(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
  const gameStats=sanitizeArcadeStats(value.gameStats,{dice:value.diceStats,poker:value.pokerStats});
  const savedWords=wordSet(value.wordSet);
  return {
    enabled: value.enabled !== false,
    position: {
      x: clamp(finite(value.position?.x, 1), 0, 1),
      y: clamp(finite(value.position?.y, 0.58), 0, 1),
    },
    panelPosition: Number.isFinite(value.panelPosition?.x)&&Number.isFinite(value.panelPosition?.y)?{
      x:clamp(value.panelPosition.x,0,1),y:clamp(value.panelPosition.y,0,1),
    }:null,
    speed: Object.hasOwn(SPEEDS, value.speed) ? value.speed : 'normal',
    records: Object.fromEntries(Object.keys(SPEEDS).map(key => [key,
      clamp(Math.floor(finite(value.records?.[key], 0)), 0, 397),
    ])),
    diceTarget: [1500,4000,6000].includes(value.diceTarget)?value.diceTarget:4000,
    gameStats,
    diceStats: {wins:gameStats.dice.wins,losses:gameStats.dice.losses},
    pokerStats: {wins:gameStats.poker.wins,losses:gameStats.poker.losses},
    wordProgress: sanitizeWordProgress(value.wordProgress),
    wordPreset: wordPreset(value.wordPreset),
    wordLibrary: seedWordTopics(value.wordLibrary),
    wordSet: savedWords,
    wordSource: savedWords?'current':['all','basics','forest','tavern'].includes(value.wordSource)?value.wordSource:'all',
    wordMode: value.wordMode==='ru-en'?'ru-en':'en-ru',
    wordRoundSize: sanitizeWordRoundSize(value.wordRoundSize),
    dndRounds: sanitizeDndRounds(value.dndRounds),
    dndPreset: sanitizeDndPreset(value.dndPreset),
    dndDieStyle: sanitizeDndDieStyle(value.dndDieStyle),
    dominoPieceStyle: sanitizeDominoPieceStyle(value.dominoPieceStyle),
    dndLibrary: sanitizeDndLibrary(value.dndLibrary),
    truthPreset: truthPreset(value.truthPreset),
    truthRounds: truthRounds(value.truthRounds),
    truthLibrary: sanitizeTruthLibrary(value.truthLibrary),
    gameReports: sanitizeGameReports(value.gameReports),
    gameReply: value.gameReply!==false,
    gameSender: sanitizeChatSender(value.gameSender),
    characters: Object.fromEntries(Object.keys(CHARACTER_GAMES).map(kind=>[kind,value.characters?.[kind]!==false])),
    chessDifficulty: sanitizeBoardDifficulty(value.chessDifficulty),
    checkersDifficulty: sanitizeBoardDifficulty(value.checkersDifficulty),
  };
}

/** Mounts the same UI in SillyTavern and in the bundled offline demo. */
export function createArcade({ load = () => ({}), save = () => {}, cssText, diceSceneUrl, diceCharacterUrl, diceTableUrl, dndSceneUrl, dndDieUrl, dndNumeralsUrl, dndSymbolsUrl, dndWoodDieUrl, dndWoodNumeralsUrl, dndWoodSymbolsUrl, pokerSceneUrl, pokerCharacterUrl, pokerTableUrl, chessSceneUrl, chessCharacterUrl, chessWorkerUrl, checkersWorkerUrl, checkersSceneUrl, checkersCharacterUrls,checkersWoodUrl, wordsSceneUrl, wordsCharacterUrl, wordsTableUrl, dominoSceneUrl, dominoFrontUrl, dominoBackUrl, dominoGreenFrontUrl, dominoGreenBackUrl, dominoHomeUrl, dominoEmotionUrls, storyBridge } = {}) {
  const old = document.getElementById('paw-arcade-root');
  if (old) throw new Error('Paw Arcade is already mounted');
  let settings,legacyDndHistory=false;
  try {
    const stored=load();settings=sanitizeSettings(stored);
    legacyDndHistory=!!stored&&typeof stored==='object'&&Object.hasOwn(stored,'dndHistory');
  } catch { settings = sanitizeSettings({}); }
  const abort = new AbortController();
  const signal = abort.signal;
  const host = document.createElement('div');
  host.id = 'paw-arcade-root';
  host.lang = 'ru';
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <div class="safe-area" aria-hidden="true"></div>
    <button class="launcher" type="button" aria-label="${LAUNCHER_LABEL}" aria-expanded="false" aria-controls="paw-panel" title="${LAUNCHER_TITLE}">${PAW}</button>
    <span class="generation-announcement sr-only" role="status" aria-live="polite"></span>
    <section id="paw-panel" class="panel" aria-label="Кошачья аркада" tabindex="-1" hidden>
      <div class="window-grip" data-panel-drag tabindex="0" role="button" aria-label="Переместить окно" title="Перетащите окно за эту полоску"><span aria-hidden="true"></span></div>
      <header class="heading">
        <div class="title-group"><h2>Выбери игру</h2></div>
      </header>
      <div class="menu-view">
        <div class="game-list"><button class="game-card snake-card" type="button">
          <span class="card-illustration">${SNAKE_ICON}<span class="card-badge">01</span></span>
          <span class="card-body"><span class="card-title">Змейка</span><span class="card-description">Яблоки и повороты.</span></span>
        </button>
        <button class="game-card dice-card" type="button"><span class="card-illustration">${DICE_ICON}<span class="card-badge">02</span></span><span class="card-body"><span class="card-title">Кости</span><span class="card-description">Рискнуть или забрать?</span></span></button>
        <button class="game-card poker-card" type="button"><span class="card-illustration">${POKER_ICON}<span class="card-badge">03</span></span><span class="card-body"><span class="card-title">Покер</span><span class="card-description">Холдем один на один.</span></span></button>
        ${EXTRA_GAMES.map((g,i)=>`<button class="game-card ${g.id}-card" type="button"><span class="card-illustration">${MENU_ICONS[g.id]||`<span class="game-symbol" aria-hidden="true">${g.symbol}</span>`}<span class="card-badge">0${i+4}</span></span><span class="card-body"><span class="card-title">${g.title}</span><span class="card-description">${g.description}</span></span></button>`).join('')}</div>
        <details class="arcade-options"><summary>Настройки чата</summary><div class="arcade-options-body"><label class="speed-label"><span>Змейка</span><select class="snake-speed" aria-label="Темп новой партии змейки"><option value="calm">Спокойный</option><option value="normal">Обычный</option><option value="fast">Быстрый</option></select></label>
        <label class="speed-label"><span>Отправитель в чат</span><select class="chat-sender" aria-label="От чьего имени отправлять игровые сообщения" title="Для итогов партий, событий ДНД и карточек «Правда или действие»">${Object.entries(CHAT_SENDERS).map(([value,title])=>`<option value="${value}">${title}</option>`).join('')}</select></label>
        <label class="speed-label"><span>Кубик d20</span><select class="dnd-die-style" aria-label="Внешний вид кубика ДНД">${Object.entries(DND_DIE_STYLES).map(([value,title])=>`<option value="${value}">${title}</option>`).join('')}</select></label><p class="dnd-die-style-status" role="status" hidden></p>
        <label class="speed-label"><span>Костяшки домино</span><select class="domino-piece-style" aria-label="Скин костяшек домино">${Object.entries(DOMINO_PIECE_STYLES).map(([value,title])=>`<option value="${value}">${title}</option>`).join('')}</select></label><p class="domino-piece-style-status" role="status" hidden></p>
        <details class="character-options"><summary>Персонажи</summary><div class="character-options-list">${Object.entries(CHARACTER_GAMES).map(([kind,title])=>`<label class="character-option"><span>${title}</span><input type="checkbox" data-character-game="${kind}" checked></label>`).join('')}</div><p class="character-options-status" role="status" hidden></p></details>
        </div></details>
        <details class="arcade-records"><summary>Рекорды</summary><label class="arcade-record-picker"><span>Игра</span><select class="arcade-record-select" aria-label="Рекорды какой игры">${Object.entries(RECORD_GAMES).map(([kind,title])=>`<option value="${kind}">${title}</option>`).join('')}</select></label><div class="arcade-records-list">${Object.entries(RECORD_GAMES).map(([kind,title])=>`<section class="arcade-record-row" data-record-game="${kind}"><div class="arcade-record-heading"><strong>${title}</strong><span class="arcade-record-best"></span></div><div class="arcade-record-counts"><span>Победы <b data-record-count="wins">0</b></span><span>Поражения <b data-record-count="losses">0</b></span><span class="arcade-record-draws">Ничьи <b data-record-count="draws">0</b></span></div><p class="arcade-record-note"></p></section>`).join('')}</div><p class="arcade-record-status" hidden role="status"></p></details>
      </div>
      <div class="snake-view" hidden>
        <div class="stats"><div><span>СЧЁТ</span><strong class="score">00</strong></div><div class="record"><span>РЕКОРД</span><strong class="best">00</strong></div></div>
        <div class="board" tabindex="0" role="group" aria-label="Игровое поле. Управление стрелками, WASD или свайпами.">
          <canvas width="600" height="600" aria-label="Игровое поле змейки"></canvas>
          <div class="board-overlay"><h3>Пойдём за яблоками?</h3><p>Коснись поля или сделай свайп.</p></div>
        </div>
        <p class="announcement sr-only" role="status" aria-live="polite"></p>
      </div>
      <div class="dice-view" hidden></div>
      <div class="poker-view" hidden></div>
      ${EXTRA_GAMES.map(g=>`<div class="${g.id}-view" hidden></div>`).join('')}
    </section>`;
  const $ = selector => root.querySelector(selector);
  const launcher = $('.launcher');
  const panel = $('.panel');
  const board = $('.board');
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const game = new Snake();
  let open = false;
  let view = 'menu';
  let timer = null;
  let layoutFrame = null;
  let destroyed = false;
  let previousFocus = null;
  let drag = null;
  let panelDrag = null;
  let holdTimer = null;
  let swipe = null;
  let layoutPosition = { x: 0, y: 0 };
  let diceUI = null,pokerUI = null;
  let statsSaveError=false;
  let artLoader=null;
  const gameUIs=new Map();
  const chatBridge=storyBridge||createDemoStoryBridge();
  let renameSavePending=false;
  // Subscribe before views so they restore the new key, including when a game
  // is hidden. On a native storage error keep the moved data in memory and
  // retry on the next chat event or ordinary settings save.
  const unsubscribeChatHistory=chatBridge.subscribe(change=>{
    const moved=renameChatHistory(settings,change);
    if(moved){Object.assign(settings,moved);renameSavePending=true;}
    if(renameSavePending)persist();
  });
  const changeSender=value=>{const previous=settings.gameSender;settings.gameSender=sanitizeChatSender(value);if(!persist()){settings.gameSender=previous;throw Error('Sender preference unavailable');}};
  const gameReports=createGameReportManager({bridge:chatBridge,
    getReport:(key,kind)=>settings.gameReports[key]?.[kind],
    onReportChange(key,raw){const report=sanitizeGameReport(raw);settings.gameReports={...settings.gameReports,[key]:{...settings.gameReports[key],[report.game]:report}};if(!persist())throw Error('Report storage unavailable');},
    getReply:()=>settings.gameReply,onReplyChange(value){settings.gameReply=!!value;if(!persist())throw Error('Reply preference unavailable');},onChange:requestLayout,
    getSender:()=>settings.gameSender,
  });
  function recordResult(kind,winner,round){
    const outcome=kind==='words'?wordRoundOutcome(round.correct,round.total):winner===0?'win':winner===1?'loss':winner===null?'draw':null;
    if(!outcome)return;
    settings.gameStats=recordArcadeResult(settings.gameStats,kind,outcome,round);
    for(const key of ['dice','poker'])settings[key+'Stats']={wins:settings.gameStats[key].wins,losses:settings.gameStats[key].losses};
    statsSaveError=!persist();renderRecords();
  }
  const reportHooks=kind=>{const channel=gameReports.channel(kind);return {onStart:()=>channel.begin(),onFinish:winner=>recordResult(kind,winner),onReport:result=>channel.finish(result),onJournal:(text,count)=>channel.updateJournal(text,count)};};
  diceUI = createDiceGame($('.dice-view'), {
    ...reportHooks('dice'),
    target: settings.diceTarget,
    sceneUrl: diceSceneUrl,
    characterUrl: diceCharacterUrl,
    tableUrl: diceTableUrl,
    onChange() {
      if(destroyed)return;
      if(view==='dice')panel.dataset.state=diceUI?.stateTag||'ready';
      requestLayout();
    },
    onFinish(winner) {
      recordResult('dice',winner);
    },
  });

  pokerUI=createPokerGame($('.poker-view'),{
    ...reportHooks('poker'),
    sceneUrl:pokerSceneUrl,characterUrl:pokerCharacterUrl,tableUrl:pokerTableUrl,
    onChange(){
      if(destroyed)return;
      if(view==='poker')panel.dataset.state=pokerUI?.stateTag||'idle';
      requestLayout();
    },
    onFinish(winner){
      recordResult('poker',winner);
    },
  });
  gameUIs.set('dice',diceUI);gameUIs.set('poker',pokerUI);
  for(const extra of EXTRA_GAMES){
    const onChange=()=>{if(destroyed)return;if(view===extra.id)panel.dataset.state=gameUIs.get(extra.id)?.stateTag||'ready';requestLayout();};
    const levelKey=extra.id+'Difficulty';
    const boardOptions={difficulty:settings[levelKey],onDifficultyChange(value){const previous=settings[levelKey];settings[levelKey]=sanitizeBoardDifficulty(value);if(!persist()){settings[levelKey]=previous;throw Error('Difficulty storage unavailable');}}};
    const ui=extra.id==='truth'?createTruthGame($('.truth-view'),{bridge:chatBridge,onChange,getLibrary:()=>settings.truthLibrary,onLibraryChange(value){const previous=settings.truthLibrary;settings.truthLibrary=sanitizeTruthLibrary(value);if(!persist()){settings.truthLibrary=previous;throw Error('Library storage unavailable');}},onLibraryRoundChange(key,library,round){const previousLibrary=settings.truthLibrary,previousRounds=settings.truthRounds;settings.truthLibrary=sanitizeTruthLibrary(library);settings.truthRounds={...previousRounds,[key]:truthRound(round)};if(!persist()){settings.truthLibrary=previousLibrary;settings.truthRounds=previousRounds;throw Error('Batch storage unavailable');}},getSender:()=>settings.gameSender,getPreset:()=>settings.truthPreset,onPresetChange(value){const previous=settings.truthPreset;settings.truthPreset=truthPreset(value);if(!persist()){settings.truthPreset=previous;throw Error('Preset storage unavailable');}},getRound:key=>settings.truthRounds[key],onRoundRename(from,to,round){const previous=settings.truthRounds,next={...previous};if(round)next[to]=truthRound(round);else delete next[to];delete next[from];settings.truthRounds=next;if(!persist()){settings.truthRounds=previous;throw Error('Cards storage unavailable');}},onRoundChange(key,round){const previous=settings.truthRounds,next={...previous};if(round)next[key]=truthRound(round);else delete next[key];settings.truthRounds=next;if(!persist()){settings.truthRounds=previous;throw Error('Cards storage unavailable');}}}):extra.id==='dnd'?createDndGame($('.dnd-view'),{bridge:chatBridge,sceneUrl:dndSceneUrl,dieUrl:dndDieUrl,numeralsUrl:dndNumeralsUrl,symbolsUrl:dndSymbolsUrl,dieStyle:settings.dndDieStyle,woodDieUrl:dndWoodDieUrl,woodNumeralsUrl:dndWoodNumeralsUrl,woodSymbolsUrl:dndWoodSymbolsUrl,onChange,getSender:()=>settings.gameSender,getLibrary:()=>settings.dndLibrary,onLibraryChange(value){const previous=settings.dndLibrary;settings.dndLibrary=sanitizeDndLibrary(value);if(!persist()){settings.dndLibrary=previous;throw Error('DND library storage unavailable');}},onLibraryRoundChange(key,library,round){const previousLibrary=settings.dndLibrary,previousRounds=settings.dndRounds;settings.dndLibrary=sanitizeDndLibrary(library);settings.dndRounds={...previousRounds,[key]:sanitizeDndRound(round)};if(!persist()){settings.dndLibrary=previousLibrary;settings.dndRounds=previousRounds;throw Error('DND library storage unavailable');}},getPreset:()=>settings.dndPreset,onPresetChange(preset){const previous=settings.dndPreset;settings.dndPreset=preset;if(!persist()){settings.dndPreset=previous;throw new Error('Preset storage unavailable');}},getRound:key=>settings.dndRounds[key],onRoundChange(key,round){settings.dndRounds={...settings.dndRounds,[key]:sanitizeDndRound(round)};if(!persist())throw new Error('Round storage unavailable');}}):extra.id==='words'?createWordsGame($('.words-view'),{
      bridge:chatBridge,progress:settings.wordProgress,source:settings.wordSource,direction:settings.wordMode,roundSize:settings.wordRoundSize,sceneUrl:wordsSceneUrl,characterUrl:wordsCharacterUrl,tableUrl:wordsTableUrl,characterVisible:settings.characters.words,onChange,onFinish:round=>recordResult('words',null,round),
      onRoundSizeChange(value){const previous=settings.wordRoundSize;settings.wordRoundSize=sanitizeWordRoundSize(value);if(!persist()){settings.wordRoundSize=previous;throw Error('Word round storage unavailable');}},
      getPreset:()=>settings.wordPreset,onPresetChange(value){const previous=settings.wordPreset;settings.wordPreset=wordPreset(value);if(!persist()){settings.wordPreset=previous;throw Error('Word preset storage unavailable');}},
      getLibrary:()=>settings.wordLibrary,onLibraryChange(value){const previous=settings.wordLibrary;settings.wordLibrary=sanitizeWordLibrary(value);if(!persist()){settings.wordLibrary=previous;throw Error('Word library storage unavailable');}},
      getSet:()=>settings.wordSet,onSetChange(value){const previous=settings.wordSet,previousSource=settings.wordSource;settings.wordSet=wordSet(value);settings.wordSource=settings.wordSet?'current':'all';if(!persist()){settings.wordSet=previous;settings.wordSource=previousSource;throw Error('Word set storage unavailable');}},
      onLibrarySetChange(library,set){const previousLibrary=settings.wordLibrary,previousSet=settings.wordSet,previousSource=settings.wordSource;settings.wordLibrary=sanitizeWordLibrary(library);settings.wordSet=wordSet(set);settings.wordSource=settings.wordSet?'current':'all';if(!persist()){settings.wordLibrary=previousLibrary;settings.wordSet=previousSet;settings.wordSource=previousSource;throw Error('Word batch storage unavailable');}},
      onPreferencesChange({source,direction}){const previousSource=settings.wordSource,previousMode=settings.wordMode;settings.wordSource=source;settings.wordMode=direction;if(!persist()){settings.wordSource=previousSource;settings.wordMode=previousMode;throw Error('Word preferences storage unavailable');}},
      onProgress(progress){const previous=settings.wordProgress;settings.wordProgress=sanitizeWordProgress(progress);if(!persist()){settings.wordProgress=previous;throw Error('Word progress storage unavailable');}}
    }):extra.id==='domino'?createDominoGame($('.domino-view'),{sceneUrl:dominoSceneUrl,frontUrl:dominoFrontUrl,backUrl:dominoBackUrl,greenFrontUrl:dominoGreenFrontUrl,greenBackUrl:dominoGreenBackUrl,homeUrl:dominoHomeUrl,emotionUrls:dominoEmotionUrls,pieceStyle:settings.dominoPieceStyle,characterVisible:settings.characters.domino,onChange,...reportHooks('domino')}):createBoardGame($(`.${extra.id}-view`),{kind:extra.id,onChange,...reportHooks(extra.id),...boardOptions,...(extra.id==='chess'?{sceneUrl:chessSceneUrl,characterUrl:chessCharacterUrl,workerUrl:chessWorkerUrl}:{sceneUrl:checkersSceneUrl,characterUrls:checkersCharacterUrls,woodUrl:checkersWoodUrl,workerUrl:checkersWorkerUrl})});
    gameUIs.set(extra.id,ui);
  }
  function applyCharacterSetting(kind){
    const shown=settings.characters[kind];
    $(`.${kind}-view`).dataset.characters=String(shown);
    $(`[data-character-game="${kind}"]`).checked=shown;
    gameUIs.get(kind)?.setCharacterVisible?.(shown);
    if(shown){artLoader?.refresh();if(open&&view===kind)artLoader?.warm($(`.${kind}-view`));}
  }
  for(const kind of Object.keys(CHARACTER_GAMES))applyCharacterSetting(kind);
  artLoader=createGameArtLoader([...gameUIs.keys()].map(kind=>$(`.${kind}-view`)),{signal});
  for(const kind of ['dice','poker','chess','checkers','domino']){
    const area=$(`.${kind}-view`);gameReports.channel(kind).attach(area);
    let options=gameUIs.get(kind)?.settingsElement;
    if(kind==='dice'){options=document.createElement('div');options.className='dice-options';options.innerHTML='<label class="speed-label"><span>Цель партии</span><select class="dice-target" aria-label="Цель новой партии в кости" title="Изменение цели начинает новую партию"><option value="1500">1500 · короткая</option><option value="4000">4000 · обычная</option><option value="6000">6000 · длинная</option></select></label>';}
    if(options)area.querySelector('.game-report-settings-body').prepend(options);
  }
  for(const handle of root.querySelectorAll('.window-grip,.heading,.stats,.dice-title,.poker-top > strong,.tablegame-top > strong,.truth-top > strong')){
    handle.dataset.panelDrag='';handle.tabIndex=0;
    handle.title='Переместить окно · перетащите заголовок или используйте Alt + стрелки';
  }

  function persist() {
    if(destroyed)return false;
    try { save(structuredClone(settings));statsSaveError=false;renameSavePending=false;return true; }
    catch (error) { console.warn('[Paw Arcade] Не удалось сохранить настройки:', error);return false; }
  }
  // Drop only the former DND memory on upgrade; keep records, position and word progress.
  if(legacyDndHistory)persist();

  function viewport() {
    const v = window.visualViewport;
    const safe = getComputedStyle($('.safe-area'));
    const l = parseFloat(safe.paddingLeft) || 0;
    const r = parseFloat(safe.paddingRight) || 0;
    const t = parseFloat(safe.paddingTop) || 0;
    const b = parseFloat(safe.paddingBottom) || 0;
    return {
      left: (v?.offsetLeft || 0) + l,
      top: (v?.offsetTop || 0) + t,
      width: Math.max(1, (v?.width || innerWidth) - l - r),
      height: Math.max(1, (v?.height || innerHeight) - t - b),
    };
  }

  function launcherLimits(v) {
    const size = launcher.offsetWidth || 48;
    return {
      minX: v.left + 10, maxX: Math.max(v.left + 10, v.left + v.width - size - 10),
      minY: v.top + 10, maxY: Math.max(v.top + 10, v.top + v.height - size - 10), size,
    };
  }

  function placePanel(v) {
    if (!open) return;
    const width=view==='menu'?Math.min(280,Math.max(1,v.width-80)):Math.min(328,Math.max(1,v.width-32));
    const height=Math.max(1,Math.min(v.height-32,Math.floor(v.height*.88)));
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${height}px`;
    panel.style.setProperty('--game-window-height',`${height}px`);
    panel.style.setProperty('--board-cap', `${Math.max(100, Math.min(308, v.height - 100))}px`);
    let position;
    if(!settings.panelPosition){
      position=anchorPanel(
        {...layoutPosition,width:launcher.offsetWidth,height:launcher.offsetHeight},
        {width:panel.offsetWidth,height:panel.offsetHeight},v,
      );
      settings.panelPosition={x:(position.x-v.left)/v.width,y:(position.y-v.top)/v.height};
      persist();
    }else position={
      x:clamp(v.left+settings.panelPosition.x*v.width,v.left+10,v.left+v.width-panel.offsetWidth-10),
      y:clamp(v.top+settings.panelPosition.y*v.height,v.top+10,v.top+v.height-panel.offsetHeight-10),
    };
    panel.style.left = `${Math.round(position.x)}px`;
    panel.style.top = `${Math.round(position.y)}px`;
    panel.dataset.side = 'free';
    const overlaps = layoutPosition.x + 48 > position.x && layoutPosition.x < position.x + panel.offsetWidth
      && layoutPosition.y + 48 > position.y && layoutPosition.y < position.y + panel.offsetHeight;
    launcher.classList.toggle('over-panel', overlaps);
  }

  function layout() {
    if (destroyed || !settings.enabled) return;
    const v = viewport();
    const limits = launcherLimits(v);
    layoutPosition = {
      x: limits.minX + settings.position.x * (limits.maxX - limits.minX),
      y: limits.minY + settings.position.y * (limits.maxY - limits.minY),
    };
    launcher.style.left = `${Math.round(layoutPosition.x)}px`;
    launcher.style.top = `${Math.round(layoutPosition.y)}px`;
    placePanel(v);
  }

  function requestLayout() {
    if (layoutFrame !== null) return;
    layoutFrame = requestAnimationFrame(() => { layoutFrame = null; layout(); });
  }

  function moveTo(x, y) {
    const v = viewport();
    const p = launcherLimits(v);
    settings.position = {
      x: (clamp(x, p.minX, p.maxX) - p.minX) / (p.maxX - p.minX || 1),
      y: (clamp(y, p.minY, p.maxY) - p.minY) / (p.maxY - p.minY || 1),
    };
    layout();
  }

  function movePanelTo(x,y){
    const v=viewport();
    const left=clamp(x,v.left+10,v.left+v.width-panel.offsetWidth-10);
    const top=clamp(y,v.top+10,v.top+v.height-panel.offsetHeight-10);
    settings.panelPosition={x:(left-v.left)/v.width,y:(top-v.top)/v.height};
    layout();
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function schedule() {
    clearTimer();
    if (!open || view !== 'snake' || game.status !== 'running' || destroyed) return;
    timer = setTimeout(() => {
      timer = null;
      const result = game.tick();
      if (result.ate && game.score > settings.records[settings.speed]) {
        settings.records[settings.speed] = game.score;
        persist();
      }
      if (['over', 'won'].includes(game.status))recordResult('snake',game.status==='won'?0:1);
      render();
      if (['over', 'won'].includes(game.status)) {
        $('.announcement').textContent = game.status === 'won' ? 'Победа! Всё поле заполнено.' : `Игра окончена. Счёт: ${game.score}.`;
      }
      schedule();
    }, game.interval(settings.speed));
  }

  function pause() {
    clearTimer();
    game.pause();
    for(const ui of gameUIs.values())ui.pause();
    render();
  }

  function play() {
    if (['over', 'won'].includes(game.status)) game.reset();
    game.start();
    render();
    schedule();
    board.focus({ preventScroll: true });
  }

  function turn(direction) {
    if (['over', 'won'].includes(game.status)) return;
    game.turn(direction);
    if (game.status === 'ready' || game.status === 'paused') {
      game.start(); render(); schedule();
    }
    board.focus({ preventScroll: true });
  }

  function draw() {
    if (!ctx) return;
    const cell = canvas.width / game.size;
    ctx.fillStyle = '#10231d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1b332b';
    ctx.lineWidth = 1;
    for (let i = 1; i < game.size; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke();
    }
    if (game.food) {
      const x = game.food.x * cell, y = game.food.y * cell;
      ctx.fillStyle = '#e9a27c';
      ctx.fillRect(x + cell * .2, y + cell * .25, cell * .6, cell * .58);
      ctx.fillStyle = '#a6d7a0';
      ctx.fillRect(x + cell * .48, y + cell * .08, cell * .28, cell * .17);
      ctx.fillStyle = '#ffe1ba';
      ctx.fillRect(x + cell * .26, y + cell * .32, cell * .12, cell * .18);
    }
    for (let i = game.body.length - 1; i >= 0; i--) {
      const p = game.body[i];
      ctx.fillStyle = i === 0 ? '#c9efab' : i % 2 ? '#7ec493' : '#91d2a3';
      ctx.fillRect(p.x * cell + 2, p.y * cell + 2, cell - 4, cell - 4);
    }
    const head = game.body[0];
    const v = DIRECTIONS[game.direction];
    const cx = (head.x + .5) * cell, cy = (head.y + .5) * cell;
    ctx.fillStyle = '#10231d';
    for (const side of [-1, 1]) {
      const x = cx + v.x * cell * .2 - v.y * side * cell * .21;
      const y = cy + v.y * cell * .2 + v.x * side * cell * .21;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  function renderRecords(){
    const selected=$('.arcade-record-select').value;
    for(const [kind,entry] of Object.entries(settings.gameStats)){
      const row=$(`[data-record-game="${kind}"]`);if(!row)continue;row.hidden=kind!==selected;
      const best=row.querySelector('.arcade-record-best'),note=row.querySelector('.arcade-record-note');
      best.textContent=kind==='snake'?`Яблок: ${Math.max(...Object.values(settings.records))}`:kind==='words'?(entry.bestTotal?`${entry.bestCorrect} / ${entry.bestTotal} с первого раза`:'Пока нет раундов'):`Побед подряд: ${entry.bestStreak}`;
      for(const field of ['wins','losses','draws'])row.querySelector(`[data-record-count="${field}"]`).textContent=String(entry[field]);
      row.querySelector('.arcade-record-draws').hidden=!['chess','checkers','domino'].includes(kind);
      note.textContent=kind==='snake'?`Спокойный ${settings.records.calm} · Обычный ${settings.records.normal} · Быстрый ${settings.records.fast}`:kind==='words'?'Победа: от 70% слов с первой попытки.':kind==='poker'?'Учитываются завершённые матчи.':'';
      note.hidden=!note.textContent;
    }
    $('.arcade-record-status').hidden=!statsSaveError;$('.arcade-record-status').textContent=statsSaveError?'Не удалось сохранить статистику.':'';
  }

  function render() {
    if (destroyed) return;
    panel.dataset.state = gameUIs.get(view)?.stateTag||game.status;
    $('.score').textContent = String(game.score).padStart(2, '0');
    $('.best').textContent = String(settings.records[settings.speed]).padStart(2, '0');
    $('.snake-speed').value = settings.speed;
    $('.dice-target').value = String(settings.diceTarget);
    $('.chat-sender').value=settings.gameSender;
    $('.dnd-die-style').value=settings.dndDieStyle;
    $('.domino-piece-style').value=settings.dominoPieceStyle;
    renderRecords();
    const overlay = $('.board-overlay');
    overlay.hidden = game.status === 'running';
    const labels = {
      ready: ['Пойдём за яблоками?', 'Коснись поля или сделай свайп.'],
      paused: ['Передышка', 'Коснись поля, чтобы продолжить.'],
      over: ['Ещё один раунд?', 'Коснись поля, чтобы начать заново.'],
      won: ['Всё поле твоё!', 'Коснись поля для новой игры.'],
      running: ['', ''],
    };
    const text = labels[game.status];
    $('.board-overlay h3').textContent = text[0];
    $('.board-overlay p').textContent = text[1];
    draw();
    requestLayout();
  }

  function show(next = 'menu') {
    if (!settings.enabled) return;
    artLoader.setBusy(next!=='menu');
    if (!open) {clearGenerationNotice();settings.panelPosition=null;}
    if (next === 'menu' || view!==next) pause();
    if(view!==next)for(const rules of root.querySelectorAll('.game-help[open]'))rules.open=false;
    for(const [id,ui] of gameUIs)if(id!==next)ui.hide();
    if (view !== next) panel.scrollTop = 0;
    view = next;
    if (!open) previousFocus = document.activeElement === host ? launcher : document.activeElement;
    open = true;
    panel.hidden = false;
    $('.menu-view').hidden = next !== 'menu';
    $('.snake-view').hidden = next !== 'snake';
    $('.dice-view').hidden = next !== 'dice';
    $('.poker-view').hidden = next !== 'poker';
    for(const extra of EXTRA_GAMES)$(`.${extra.id}-view`).hidden=next!==extra.id;
    $('.heading').hidden = next !== 'menu';
    panel.dataset.view = next;
    artLoader.warm($(`.${next}-view`));
    panel.setAttribute('aria-label', EXTRA_GAMES.find(g=>g.id===next)?.title||(next === 'snake' ? 'Змейка' : next==='dice'?'Кости':next==='poker'?'Покер':'Кошачья аркада'));
    launcher.setAttribute('aria-expanded', 'true');
    render(); layout();
    if (next === 'snake') {
      if (['ready', 'paused'].includes(game.status)) play();
      else board.focus({ preventScroll: true });
    }
    else if(gameUIs.has(next)){gameUIs.get(next).resume();gameUIs.get(next).focus();}
    else $('.snake-card').focus({ preventScroll: true });
  }

  function close({ restoreFocus = true } = {}) {
    for(const rules of root.querySelectorAll('.game-help[open]'))rules.open=false;
    clearGenerationNotice();
    cancelDrag();
    cancelPanelDrag();
    if (!open) return;
    pause();
    for(const ui of gameUIs.values())ui.hide();
    open = false;
    panel.hidden = true;
    artLoader.setBusy(false);
    launcher.classList.remove('over-panel');
    launcher.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      const target = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : launcher;
      target.focus?.({ preventScroll: true });
    }
  }

  launcher.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0) return;
    cancelDrag();
    if (open && view !== 'menu') pause();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, origin: { ...layoutPosition }, moved: false, held: false };
    launcher.setPointerCapture(e.pointerId);
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (!drag || drag.moved || destroyed) return;
      drag.held = true;
      show('menu');
    }, 550);
  }, { signal });
  launcher.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { clearHold(); drag.moved = true; pause(); launcher.classList.add('dragging'); }
    e.preventDefault();
    moveTo(drag.origin.x + dx, drag.origin.y + dy);
  }, { signal });
  launcher.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    const held = drag.held;
    clearHold();
    drag = null;
    launcher.classList.remove('dragging');
    if (launcher.hasPointerCapture(e.pointerId)) launcher.releasePointerCapture(e.pointerId);
    if (moved) persist();
    else if (!held) { if (open) close(); else show(view); }
  }, { signal });
  function clearHold() {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
  }
  function cancelDrag() {
    clearHold();
    if (drag?.moved) persist();
    drag = null; launcher.classList.remove('dragging');
  }
  launcher.addEventListener('pointercancel', cancelDrag, { signal });
  launcher.addEventListener('lostpointercapture', cancelDrag, { signal });
  panel.addEventListener('pointerdown',e=>{
    if(e.isPrimary===false||(e.button!==0&&e.pointerType!=='touch'&&e.pointerType!=='pen')||!e.target.closest('[data-panel-drag]')
      ||e.target.closest('button,select,input,textarea,summary,a,[contenteditable="true"],.tablegame-rules-body,.poker-rules-body'))return;
    e.preventDefault();cancelPanelDrag();pause();layout();
    panelDrag={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{x:parseFloat(panel.style.left),y:parseFloat(panel.style.top)},moved:false};
    panel.setPointerCapture(e.pointerId);
  },{signal});
  panel.addEventListener('pointermove',e=>{
    if(!panelDrag||e.pointerId!==panelDrag.id)return;
    const dx=e.clientX-panelDrag.x,dy=e.clientY-panelDrag.y;
    if(!panelDrag.moved&&Math.hypot(dx,dy)<6)return;
    e.preventDefault();panelDrag.moved=true;panel.classList.add('dragging');
    movePanelTo(panelDrag.origin.x+dx,panelDrag.origin.y+dy);
  },{signal});
  panel.addEventListener('pointerup',e=>{
    if(!panelDrag||e.pointerId!==panelDrag.id)return;
    if(panelDrag.moved)persist();
    panelDrag=null;panel.classList.remove('dragging');
    if(panel.hasPointerCapture(e.pointerId))panel.releasePointerCapture(e.pointerId);
  },{signal});
  function cancelPanelDrag(){
    if(panelDrag?.moved)persist();
    const id=panelDrag?.id;panelDrag=null;panel.classList.remove('dragging');
    if(id!==undefined&&panel.hasPointerCapture(id))panel.releasePointerCapture(id);
  }
  panel.addEventListener('pointercancel',cancelPanelDrag,{signal});
  panel.addEventListener('lostpointercapture',cancelPanelDrag,{signal});
  launcher.addEventListener('click', e => {
    // Pointer taps are handled on pointerup. detail=0 is keyboard/assistive activation.
    if (e.detail === 0) { if (open) close(); else show(view); }
  }, { signal });
  $('.snake-card').addEventListener('click', () => show('snake'), { signal });
  $('.dice-card').addEventListener('click', () => show('dice'), { signal });
  $('.poker-card').addEventListener('click', () => show('poker'), { signal });
  for(const extra of EXTRA_GAMES)$(`.${extra.id}-card`).addEventListener('click',()=>show(extra.id),{signal});
  $('.snake-speed').addEventListener('change', e => {
    if (!Object.hasOwn(SPEEDS, e.target.value) || e.target.value === settings.speed) return;
    clearTimer(); game.reset();
    settings.speed = e.target.value; persist(); render();
  }, { signal });
  $('.dice-target').addEventListener('change',e=>{
    const target=Number(e.target.value);
    if(![1500,4000,6000].includes(target)||target===settings.diceTarget)return;
    settings.diceTarget=target;diceUI.reset(target);persist();render();
  },{signal});
  $('.arcade-record-select').addEventListener('change',()=>{renderRecords();requestLayout();},{signal});
  $('.chat-sender').addEventListener('change',e=>{try{changeSender(e.target.value);}catch{/* Restore the saved selection if persistence is unavailable. */}render();},{signal});
  $('.dnd-die-style').addEventListener('change',e=>{
    if(!Object.hasOwn(DND_DIE_STYLES,e.target.value)){render();return;}
    if(e.target.value===settings.dndDieStyle)return;
    const previous=settings.dndDieStyle;settings.dndDieStyle=e.target.value;
    const saved=persist();if(!saved)settings.dndDieStyle=previous;
    if(saved){gameUIs.get('dnd').setDieStyle(settings.dndDieStyle);artLoader?.refresh();}
    const status=$('.dnd-die-style-status');status.hidden=saved;status.textContent=saved?'':'Не удалось сохранить вид кубика. Попробуйте ещё раз.';
    render();requestLayout();
  },{signal});
  $('.domino-piece-style').addEventListener('change',e=>{
    if(!Object.hasOwn(DOMINO_PIECE_STYLES,e.target.value)){render();return;}
    if(e.target.value===settings.dominoPieceStyle)return;
    const previous=settings.dominoPieceStyle;settings.dominoPieceStyle=e.target.value;
    const saved=persist();if(!saved)settings.dominoPieceStyle=previous;
    if(saved)gameUIs.get('domino').setPieceStyle(settings.dominoPieceStyle);
    const status=$('.domino-piece-style-status');status.hidden=saved;status.textContent=saved?'':'Не удалось сохранить скин домино. Попробуйте ещё раз.';
    render();requestLayout();
  },{signal});
  $('.character-options').addEventListener('change',e=>{
    const kind=e.target.dataset.characterGame;if(!Object.hasOwn(CHARACTER_GAMES,kind))return;
    const previous=settings.characters;settings.characters={...previous,[kind]:e.target.checked};
    const saved=persist();if(!saved)settings.characters=previous;
    applyCharacterSetting(kind);
    const status=$('.character-options-status');status.textContent=saved?'':'Не удалось сохранить выбор. Попробуйте ещё раз.';status.hidden=saved;
    requestLayout();
  },{signal});
  board.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || e.target.closest('button')) return;
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    board.setPointerCapture(e.pointerId);
    board.focus({ preventScroll: true });
  }, { signal });
  board.addEventListener('pointermove', e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    turn(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: true };
  }, { signal });
  board.addEventListener('pointerup', e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const tapped = !swipe.moved;
    swipe = null;
    if (tapped && game.status !== 'running') play();
  }, { signal });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    board.addEventListener(type, () => { swipe = null; }, { signal });
  }

  window.addEventListener('keydown', e => {
    if (!settings.enabled || !e.composedPath().includes(host)) return;
    const target = e.composedPath()[0];
    if (target === launcher && (e.code === 'ContextMenu' || e.code === 'F10' && e.shiftKey)) {
      e.preventDefault(); e.stopImmediatePropagation(); cancelDrag(); show('menu'); return;
    }
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopImmediatePropagation();const rules=$(`.${view}-view .game-help[open]`);if(rules){rules.open=false;rules.querySelector('summary').focus({preventScroll:true});return;}if(['truth','words','dnd'].includes(view)&&gameUIs.get(view).cancelSelection())return;close();return; }
    const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
    const direction = keys[e.code];
    if (target === launcher && e.altKey && direction) {
      const v = DIRECTIONS[direction];
      e.preventDefault(); e.stopImmediatePropagation();
      moveTo(layoutPosition.x + v.x * 12, layoutPosition.y + v.y * 12); persist(); return;
    }
    if(open&&target.matches('[data-panel-drag]')&&e.altKey&&direction){
      const v=DIRECTIONS[direction];e.preventDefault();e.stopImmediatePropagation();pause();
      movePanelTo(parseFloat(panel.style.left)+v.x*12,parseFloat(panel.style.top)+v.y*12);persist();return;
    }
    if (!open || view !== 'snake' || target === launcher || e.altKey || e.ctrlKey || e.metaKey
      || target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (direction) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) turn(direction);
    } else if (e.code === 'Space' && !target.closest('button')) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) { if (game.status === 'running') close(); else play(); }
    } else if (e.code === 'Enter' && target === board && game.status !== 'running') {
      e.preventDefault(); e.stopImmediatePropagation(); play();
    }
  }, { capture: true, signal });
  document.addEventListener('pointerdown', e => {
    if (!e.composedPath().includes(host)) {clearGenerationNotice();if(open)pause();}
  }, { capture: true, signal });
  document.addEventListener('focusin', e => {
    if (!e.composedPath().includes(host)) {clearGenerationNotice();if(open)pause();}
  }, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelDrag();cancelPanelDrag();pause(); } }, { signal });
  window.addEventListener('blur', () => { cancelDrag();cancelPanelDrag();pause(); }, { signal });
  window.addEventListener('resize', requestLayout, { signal });
  window.visualViewport?.addEventListener('resize', requestLayout, { signal });
  window.visualViewport?.addEventListener('scroll', requestLayout, { signal });
  // Clicks stay inside the widget instead of reaching host UI click shortcuts.
  root.addEventListener('click', e => e.stopPropagation(), { signal });
  root.addEventListener('contextmenu', e => {
    if (e.target.closest('.launcher')) {
      e.preventDefault(); clearHold();
      if (drag) drag.held = true;
      show('menu');
    } else if (e.target.closest('.board')) e.preventDefault();
  }, { signal });
  const observer = new ResizeObserver(requestLayout);
  observer.observe(panel);

  function ready() {
    if (destroyed) return;
    host.dataset.ready = 'true';
    host.style.display = settings.enabled ? 'block' : 'none';
    render(); layout();
    if(settings.enabled)artLoader.schedule();
  }
  if (cssText !== undefined) {
    const style = document.createElement('style');
    style.textContent = cssText; root.prepend(style);
  } else {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = new URL('./style.css', import.meta.url).href;
    link.addEventListener('load', ready, { once: true, signal });
    link.addEventListener('error', () => console.error('[Paw Arcade] Не удалось загрузить style.css. Проверьте файлы расширения.'), { once: true, signal });
    root.prepend(link);
  }
  document.body.append(host);
  if (cssText !== undefined) ready();

  function resetPosition() {
    settings.position = { x: 1, y: .58 };persist();layout();
  }

  function clearGenerationNotice() {
    launcher.classList.remove('generation-ready');
    launcher.setAttribute('aria-label',LAUNCHER_LABEL);
    launcher.title=LAUNCHER_TITLE;
    $('.generation-announcement').textContent='';
  }

  function notifyGenerationComplete() {
    if(destroyed||!settings.enabled)return;
    launcher.classList.add('generation-ready');
    launcher.setAttribute('aria-label',`Генерация завершена. ${LAUNCHER_LABEL}`);
    launcher.title=`Генерация завершена · ${LAUNCHER_TITLE}`;
    $('.generation-announcement').textContent='Генерация в Таверне завершена.';
  }

  return {
    show: () => show('menu'),
    resetPosition,
    notifyGenerationComplete,
    clearGenerationNotice,
    isEnabled: () => settings.enabled,
    setEnabled(value) {
      if (!value) close({ restoreFocus: false });
      settings.enabled = !!value;
      if(value)artLoader.schedule();
      host.style.display = value && host.dataset.ready === 'true' ? 'block' : 'none';
      persist(); layout();
    },
    destroy() {
      if (destroyed) return;
      close({ restoreFocus: false }); destroyed = true;
      clearTimer(); abort.abort(); observer.disconnect();
      unsubscribeChatHistory();
      for(const ui of gameUIs.values())ui.destroy();
      gameReports.destroy();
      chatBridge.destroy?.();
      if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
      host.remove();
    },
  };
}

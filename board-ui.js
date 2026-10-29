import {ChessGame,chooseChessMove} from './chess-game.js';
import {CheckersGame,chooseCheckersMove,boardSquare} from './checkers.js';
import {createGameClock} from './game-clock.js';
import {makeGameResult,createJournalReporter} from './game-report.js';
import {getChessReaction} from './chess-reactions.js';
import {chessPieceMarkup} from './chess-pieces.js';
import {BOARD_DIFFICULTIES,sanitizeBoardDifficulty} from './board-difficulty.js';
import {createChessPortrait} from './chess-portrait.js';
import {createChessOpponent} from './chess-opponent.js';
import {createCheckersOpponent} from './checkers-opponent.js';
import {getCheckersReaction} from './checkers-reactions.js';
import {createGameFooter} from './game-footer.js';

const CHESS_RU={k:'король',q:'ферзь',r:'ладья',b:'слон',n:'конь',p:'пешка'};
const BOARD_RULES={
  chess:'Вы играете белыми. Нажмите фигуру, затем подсвеченную клетку. Нужно поставить мат королю; оставлять своего под шахом нельзя. Есть рокировка, взятие на проходе и выбор фигуры при превращении пешки. Пат и недостаток материала дают ничью. Для этой мини-игры ничья при трёх повторениях или 50 ходах без взятия и движения пешки определяется автоматически. В настройках есть три уровня локального соперника; часов нет.',
  checkers:'Русские шашки, вы — белые. Простая шашка ходит по диагонали вперёд и бьёт в обе стороны. Взятие обязательно: пройдите все подсвеченные прыжки одной шашкой. Можно выбрать любую полную цепочку взятий. Дамка ходит далеко; достигнув последнего ряда при взятии, шашка продолжает как дамка. Победа — у соперника нет шашек или ходов. Ничья: три повторения либо 15 ходов каждой стороны только дамками без взятия. Специальные турнирные лимиты окончаний здесь не применяются.',
};

export function createBoardGame(container,{kind='chess',onChange=()=>{},onFinish=()=>{},onStart=()=>{},onReport=()=>{},onJournal,game:provided,decide,difficulty='normal',onDifficultyChange=()=>{},workerUrl,sceneUrl,characterUrl,characterUrls,woodUrl}={}){
  const chess=kind==='chess',title=chess?'Шахматы':'Шашки',game=provided||(chess?new ChessGame():new CheckersGame({mandatoryCapture:false}));
  const sceneSource=sceneUrl||new URL(chess?'./assets/chess-imperial-library.webp?v=1.20.0':'./assets/checkers-apartment-v2.webp',import.meta.url).href,characterSource=characterUrl||new URL('./assets/chess-emperor-reactions.webp?v=1.20.0',import.meta.url).href,getReaction=chess?getChessReaction:getCheckersReaction;
  const checkersFrames=characterUrls||['neutral','thinking','win','lose'].map(mood=>new URL(`./assets/checkers-${mood}-v2.webp`,import.meta.url).href);
  let level=sanitizeBoardDifficulty(difficulty);
  const choose=decide||((g)=>(chess?chooseChessMove:chooseCheckersMove)(g,Math.random,level)),abort=new AbortController(),signal=abort.signal;
  const portrait=Array.from({length:4},(_,frame)=>`<span class="chess-character-layer" data-frame="${frame}"><img class="chess-character-sheet" width="${chess?1536:768}" height="${chess?1024:512}" alt="" loading="lazy" decoding="async" draggable="false"></span>`).join('');
  const rules=!chess&&game.mandatoryCapture===false?BOARD_RULES.checkers.replace('Взятие обязательно: пройдите все подсвеченные прыжки одной шашкой.','Взятие по желанию: можно выбрать обычный ход другой шашкой, даже если доступно взятие. Выбранная цепочка взятий завершается целиком; до завершения можно выбрать другую шашку.'):BOARD_RULES[kind];
  container.innerHTML=`<div class="tablegame-top"><strong>${title}</strong><span>Вы — белые</span><details class="tablegame-rules"><summary aria-label="Правила: ${title}">?</summary><div class="tablegame-rules-body">${rules}</div></details></div><div class="chess-table${chess?'':' checkers-table'}"><img class="chess-scene" width="768" height="768" alt="" loading="lazy" decoding="async" draggable="false"><div class="chess-portrait"><div class="chess-opponent-art" role="img">${portrait}</div>${chess?'<span class="chess-opponent-name">Император</span>':''}</div><div class="chess-board-frame"><div class="square-board" role="group" tabindex="0" aria-label="Доска: ${title}">${Array.from({length:64},(_,i)=>`<button type="button" class="board-cell ${(Math.floor(i/8)+i%8)%2?'dark-square':'light-square'}" data-square="${i}" aria-pressed="false"><span class="board-piece"></span><small class="board-coordinate">${i>=56?'abcdefgh'[i%8]:''}${i%8===0?8-Math.floor(i/8):''}</small></button>`).join('')}</div><div class="board-promotion" hidden><span>Превратить пешку в:</span><div></div></div></div></div><p class="tablegame-message" role="status" aria-live="polite"></p><button type="button" class="tablegame-new">Новая партия</button>`;
  const $=s=>container.querySelector(s),cells=[...container.querySelectorAll('[data-square]')];
  const settingsElement=document.createElement('div');settingsElement.className='board-options';
  settingsElement.innerHTML=`<label class="board-difficulty-label"><span>Сложность соперника</span><select class="board-difficulty" aria-label="${title}: сложность соперника">${Object.entries(BOARD_DIFFICULTIES).map(([value,profile])=>`<option value="${value}">${profile.label}</option>`).join('')}</select></label>`;
  container.append(settingsElement);
  createGameFooter(container,{removeHeader:true,onRestart:restartGame,signal});
  $('.chess-scene').src=sceneSource;for(const [frame,image] of [...container.querySelectorAll('.chess-character-sheet')].entries())image.src=chess?characterSource:checkersFrames[frame];
  if(!chess)$('.checkers-table').style.setProperty('--checkers-wood',`url("${woodUrl||new URL('./assets/checkers-walnut.webp',import.meta.url).href}")`);
  const chessPortrait=createChessPortrait($('.chess-opponent-art'),chess?{}:{isolatedFrames:true,transitionMs:{thinking:300,neutral:360,result:520},thinkingHoldMs:650,neutralDelayMs:80});
  const opponent=decide?null:chess?createChessOpponent({workerUrl}):createCheckersOpponent({workerUrl});
  const positionStamp=()=>chess?game.engine.fen():game.key()+'/'+game.quietKings;
  const reportJournal=createJournalReporter(kind,game,onJournal);
  let paused=true,visible=false,destroyed=false,started=false,selected=null,path=[],promotion=[],reported=false,aiBusy=false,decision=0;
  const clock=createGameClock(()=>{
    if(opponent)void chooseInBackground();
    else{const move=choose(game);if(move&&game.play(move)){if(!started)onStart();started=true;}render();drive();}
  });
  async function chooseInBackground(){
    const request=++decision,snapshot=positionStamp();aiBusy=true;
    try{
      const move=await opponent.choose(game,level);
      if(destroyed||paused||request!==decision||positionStamp()!==snapshot||game.turn!==1)return;
      if(move&&game.play(move)){if(!started)onStart();started=true;}
    }catch(error){if(error.name!=='AbortError'&&!destroyed&&!paused&&request===decision&&positionStamp()===snapshot&&game.turn===1){const move=game.moves()[0];if(move&&game.play(move)){if(!started)onStart();started=true;}}}
    finally{if(!destroyed&&request===decision){aiBusy=false;render();drive();}}
  }
  function cancelDecision(){decision++;aiBusy=false;opponent?.cancel();}
  function clearSelection(){selected=null;path=[];promotion=[];}
  function drive(){if(!aiBusy&&!game.status()&&game.turn===1)clock.queue();}
  function render(){
    if(destroyed)return;
    const result=game.status(),legal=result?[]:game.moves();
    const reaction=getReaction(game,result);container.dataset.reaction=reaction.mood;chessPortrait.setReaction(reaction);
    container.dataset.phase=result?'finished':started?'playing':'ready';container.dataset.turn=String(game.turn);container.dataset.paused=String(paused);container.dataset.difficulty=level;
    $('.board-difficulty').value=level;
    const candidates=selected===null?[]:legal.filter(m=>m.from===selected&&path.every((to,i)=>m.path[i]===to));
    const targets=new Set(candidates.map(m=>m.path[path.length]).filter(n=>n!==undefined));
    const position=!chess&&selected!==null&&path.length?game.preview(selected,path):game.position();
    const checked=chess?game.checkedSquare():-1;
    cells.forEach((cell,index)=>{
      const piece=position[index],white=chess?piece?.side===0:piece>0,king=!chess&&Math.abs(piece)===2;
      cell.disabled=paused||!!result||game.turn!==0;cell.classList.toggle('chosen-square',index===(path.at(-1)??selected));
      cell.classList.toggle('legal-square',targets.has(index));cell.classList.toggle('check-square',index===checked);
      cell.classList.toggle('last-square',game.lastMove?.from===index||game.lastMove?.to===index);
      cell.setAttribute('aria-pressed',String(index===(path.at(-1)??selected)));
      cell.setAttribute('aria-label',`${boardSquare(index)}${piece?`, ${white?'белая':'чёрная'} ${chess?CHESS_RU[piece.type]:king?'дамка':'шашка'}`:', пустая клетка'}${targets.has(index)?', доступный ход':''}`);
      const p=cell.querySelector('.board-piece');p.className=`board-piece ${chess?'chess-piece':'checker-piece'}${piece?white?' white-piece':' black-piece':''}${king?' crowned':''}`;
      if(chess){
        const pieceKey=piece?`${piece.type}:${piece.side}`:'';
        if(p.dataset.piece!==pieceKey){p.innerHTML=piece?chessPieceMarkup(piece.type,piece.side):'';p.dataset.piece=pieceKey;}
      }else p.textContent=piece&&king?'♛':'';
      p.hidden=!piece;
    });
    $('.board-promotion').hidden=!promotion.length;
    const promoMarkup=promotion.map(m=>`<button type="button" data-promote="${m.promotion}" aria-label="${CHESS_RU[m.promotion]}">${chessPieceMarkup(m.promotion)}</button>`).join('');
    if($('.board-promotion div').innerHTML!==promoMarkup)$('.board-promotion div').innerHTML=promoMarkup;
    for(const button of container.querySelectorAll('[data-promote]'))button.disabled=paused;
    $('.tablegame-message').textContent=result?(result.winner===null?'Ничья.':result.winner===0?'Вы победили!':'Победил соперник.')+' '+result.reason:paused?'Пауза':promotion.length?'Превращение пешки':game.turn===1?'Соперник думает…':path.length?'Продолжи взятие':chess&&checked>=0?'Шах · защити короля':!chess&&game.mandatoryCapture!==false&&legal[0]?.captures.length?'Взятие обязательно':'Выбери фигуру';
    if(result&&!reported){reported=true;onFinish(result.winner);onReport(makeGameResult(kind,game));}reportJournal();onChange();
  }
  function finishMove(move){if(game.play(move)){if(!started)onStart();started=true;clearSelection();render();drive();}}
  function clickSquare(index){
    if(game.turn!==0||game.status())return;
    const legal=game.moves();
    if(promotion.length){if(legal.some(m=>m.from===index)){clearSelection();selected=index;render();}return;}
    const candidates=legal.filter(m=>m.from===selected&&path.every((to,i)=>m.path[i]===to)&&m.path[path.length]===index);
    if(candidates.length){
      const next=[...path,index],done=candidates.filter(m=>m.path.length===next.length);
      if(done.length){if(chess&&done.some(m=>m.promotion)){promotion=done;render();}else finishMove(done[0]);}
      else{path=next;render();}return;
    }
    if(legal.some(m=>m.from===index)){selected=selected===index&&!path.length?null:index;path=[];render();}
  }
  function restartGame(){if(destroyed||!visible)return;if(paused)resume();clock.cancel();cancelDecision();game.reset();chessPortrait?.reset(getReaction(game));started=false;reported=false;clearSelection();render();drive();}
  function resume(){if(destroyed)return;paused=false;visible=true;clock.setActive(true);chessPortrait?.setActive(true);drive();render();}
  container.addEventListener('pointerdown',e=>{if(paused&&visible&&!e.target.closest('.game-footer,.board-options'))resume();},{capture:true,signal});
  container.addEventListener('keydown',e=>{if(paused&&visible&&!e.target.closest('.game-footer,.board-options'))resume();},{capture:true,signal});
  container.addEventListener('change',e=>{
    if(!e.target.matches('.board-difficulty'))return;
    const next=sanitizeBoardDifficulty(e.target.value);
    try{onDifficultyChange(next);level=next;}catch{/* Keep the previous level if saving failed. */}
    render();
  },{signal});
  container.addEventListener('click',e=>{
    if(e.target.closest('.board-options,.game-footer'))return;
    if(paused){resume();return;}const square=e.target.closest('[data-square]'),promote=e.target.closest('[data-promote]');
    if(square)clickSquare(Number(square.dataset.square));
    else if(promote){const move=promotion.find(m=>m.promotion===promote.dataset.promote);if(move)finishMove(move);}
    else if(e.target.closest('.tablegame-new'))restartGame();
  },{signal});
  render();
  return {settingsElement,resume,pause(){if(destroyed)return;paused=true;clock.setActive(false);cancelDecision();chessPortrait?.setActive(false);render();},hide(){this.pause();visible=false;},focus(){$('.square-board').focus({preventScroll:true});},get stateTag(){return game.status()?'finished':paused?'paused':started?'playing':'ready';},destroy(){clock.destroy();cancelDecision();opponent?.destroy();chessPortrait?.destroy();destroyed=true;abort.abort();container.replaceChildren();}};
}

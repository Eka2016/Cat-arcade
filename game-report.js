import {DOMINO_SET} from './domino.js';
import {pokerCard} from './poker.js';
import {sanitizeChatSender} from './chat-message.js';

export const GAME_REPORT_TITLES=Object.freeze({dice:'Кости',poker:'Покер',chess:'Шахматы',checkers:'Шашки',domino:'Домино'});
const PIECES={k:'король',q:'ферзь',r:'ладья',b:'слон',n:'конь',p:'пешка'};
const PIECE_GROUPS={k:'короли',q:'ферзи',r:'ладьи',b:'слоны',n:'кони',p:'пешки'};
const TAKEN={k:'короля',q:'ферзя',r:'ладьи',b:'слона',n:'коня',p:'пешки'};
const PROMOTED={q:'ферзя',r:'ладью',b:'слона',n:'коня'};
const OUTCOMES={win:'Победа игрока',loss:'Поражение игрока',draw:'Ничья'};
const square=i=>'abcdefgh'[i%8]+(8-Math.floor(i/8));
const outcome=winner=>winner===null?'draw':winner===0?'win':'loss';
const tile=id=>DOMINO_SET[id]?.join('–')||'?';
const cards=ids=>ids.map(id=>{const c=pokerCard(id);return c.face+c.symbol;}).join(', ')||'нет';

export function chessMoveText(move){
  if(!move)return 'Игрок ещё не сделал хода.';
  let text=`${PIECES[move.piece]||'фигура'} ${square(move.from)}–${square(move.to)}`;
  if(move.flags?.includes('k'))text+='; короткая рокировка, ладья h'+(move.side===0?'1–f1':'8–f8');
  if(move.flags?.includes('q'))text+='; длинная рокировка, ладья a'+(move.side===0?'1–d1':'8–d8');
  if(move.capturedPiece)text+=`; взятие ${TAKEN[move.capturedPiece]}`;
  if(move.flags?.includes('e'))text+=' на проходе';
  if(move.promotion)text+=`; превращение в ${PROMOTED[move.promotion]}`;
  if(move.san?.includes('#'))text+='; мат';else if(move.san?.includes('+'))text+='; шах';
  return text+(move.san?` (${move.san})`:'');
}
function chessPosition(game){
  const position=game.position(),lines=[];
  for(const side of [0,1]){
    const pieces=[];
    for(const type of ['k','q','r','b','n','p']){
      const squares=position.flatMap((p,i)=>p?.side===side&&p.type===type?[square(i)]:[]);
      if(squares.length)pieces.push(`${squares.length>1?PIECE_GROUPS[type]:PIECES[type]}: ${squares.join(', ')}`);
    }
    lines.push(`${side===0?'Белые (игрок)':'Чёрные (соперник)'}: ${pieces.join('; ')||'нет фигур'}.`);
  }
  lines.push(`Очередь хода: ${game.turn===0?'белые':'чёрные'}. Партия завершена.`);
  return lines.join('\n');
}
export function checkersMoveText(move){
  if(!move)return 'Игрок ещё не сделал хода.';
  return `${Math.abs(move.startPiece??move.piece)===2?'дамка':'шашка'} ${[move.from,...move.path].map(square).join(move.captures.length?':':'–')}`
    +(move.captures.length?`; взято ${move.captures.length}, клетки ${move.captures.map(square).join(', ')}`:'')
    +(Math.abs(move.startPiece??move.piece)===1&&Math.abs(move.piece)===2?'; превращение в дамку':'');
}
function checkersPosition(game){
  return [1,-1].map(side=>{
    const men=[],kings=[];game.position().forEach((p,i)=>{if(p*side>0)(Math.abs(p)===2?kings:men).push(square(i));});
    return `${side===1?'Белые (игрок)':'Чёрные (соперник)'}: шашки ${men.join(', ')||'нет'}; дамки ${kings.join(', ')||'нет'}.`;
  }).join('\n')+`\nОчередь хода: ${game.turn===0?'белые':'чёрные'}. Партия завершена.`;
}
function pokerActionText(action){
  if(!action)return 'Только обязательные блайнды; добровольного хода игрока не было.';
  const street=['префлоп','флоп','тёрн','ривер'][action.street];
  const text=action.type==='fold'?'пас':action.type==='check'?'чек':action.type==='call'?`колл ${action.paid}`:`${action.opening?'ставка':'рейз'} до ${action.to}`;
  return `${street}: ${text}${action.allIn?'; ва-банк':''}.`;
}
function diceActionText(action){
  if(!action)return 'Игрок ещё не сделал хода.';
  if(action.type==='bank')return `Забраны ${action.points} очков за ход. Последний зачётный выбор: ${action.faces.join(', ')}. Общий счёт игрока после этого: ${action.total}.`;
  if(action.type==='risk')return `Зачтены кости ${action.faces.join(', ')}; игрок продолжил бросать с ${action.points} очками в ходе.`;
  return `Бросок: ${action.faces.join(', ')}.${action.bust?` Пустой бросок; потеряно ${action.points} очков текущего хода.`:''}`;
}
function dominoActionText(action){
  if(!action)return 'Игрок ещё не сделал хода.';
  return action.type==='play'?`Выложена костяшка ${tile(action.id)} ${action.side==='left'?'слева':'справа'}.`:action.type==='draw'?`Взято с базара костяшек: ${action.count}.`:'Пропущен ход: подходящей костяшки нет, базар пуст.';
}

export function gameJournalText(kind,game){
  const entries=game.journal||[];if(!entries.length)return '';
  const who=m=>m.player===0?'Игрок':'Соперник';
  const lines=entries.map((m,i)=>{
    let text='';
    if(kind==='chess')text=`${m.side===0?'Белые (игрок)':'Чёрные (соперник)'}: ${chessMoveText(m)}`;
    else if(kind==='checkers')text=`${m.side===0?'Белые (игрок)':'Чёрные (соперник)'}: ${checkersMoveText(m)}`;
    else if(kind==='dice')text=who(m)+': '+(m.type==='roll'?`бросок; на столе ${m.faces.join(', ')}; переброшены кости ${m.rolled.map(n=>n+1).join(', ')}${m.bust?`; пусто, сгорело ${m.points} очков хода`:''}.`:m.type==='risk'?`зачтены ${m.faces.join(', ')} (+${m.gain}); в ходе ${m.points}; выбран ещё бросок.`:`забраны ${m.points} очков; последний выбор ${m.faces.join(', ')}; счёт ${m.scores[0]} : ${m.scores[1]}.`);
    else if(kind==='poker'){
      if(m.type==='deal')text=`Раздача ${m.hand}. Блайнды: игрок ${m.blinds[0]}, соперник ${m.blinds[1]}. Карты игрока: ${cards(m.handCards)}. Карты соперника закрыты.`;
      else if(m.type==='board')text=`Раздача ${m.hand}, ${['префлоп','флоп','тёрн','ривер'][m.street]}: общие карты ${cards(m.cards)}.`;
      else if(m.type==='refund')text=`Раздача ${m.hand}: ${m.player===0?'игроку':'сопернику'} возвращена непокрытая часть ставки: ${m.amount}.`;
      else if(m.type==='settle')text=`Раздача ${m.hand}: ${OUTCOMES[outcome(m.winner)].toLowerCase()}, банк ${m.pot}. `+(m.reason==='fold'?`${m.winner===0?'Соперник':'Игрок'} — пас, закрытые карты не раскрывались.`:`Вскрытие: игрок ${cards(m.shownHands[0])} (${m.combinations[0]}), соперник ${cards(m.shownHands[1])} (${m.combinations[1]}).`)+` Фишки ${m.stacks[0]} : ${m.stacks[1]}.${m.matchFinished?' Матч завершён.':''}`;
      else text=`Раздача ${m.hand}, ${who(m).toLowerCase()}: ${pokerActionText(m)}`;
    }else if(kind==='domino')text=m.type==='finish'?`${OUTCOMES[outcome(m.winner)]}. ${m.reason==='empty'?'Все костяшки победителя выложены.':`Блокировка, очки ${m.scores[0]} : ${m.scores[1]}.`}`:who(m)+': '+dominoActionText(m)+(m.type==='draw'&&m.tiles.length?` Костяшки игрока: ${m.tiles.map(tile).join(', ')}.`:'')+(m.type==='play'?` Открытые концы ${m.ends.join(' и ')}.`:'');
    return `${i+1}. ${text}`;
  });
  if(kind==='chess'||kind==='checkers'){const result=game.status();if(result)lines.push(`${OUTCOMES[outcome(result.winner)]}. ${result.reason}`);}
  if(kind==='dice'&&game.phase==='finished')lines.push(`${OUTCOMES[outcome(game.winner)]}. Счёт ${game.scores[0]} : ${game.scores[1]}, цель ${game.target}.`);
  return `${GAME_REPORT_TITLES[kind]} · полный журнал${kind==='poker'?' матча':''}\n`+lines.join('\n');
}
/** Rebuild only after a committed action; hovering/selecting and AI analysis are not moves. */
export function createJournalReporter(kind,game,onJournal){
  if(typeof onJournal!=='function')return ()=>{};
  let source=null,count=-1;
  return ()=>{if(source===game.journal&&count===game.journal.length)return;source=game.journal;count=source.length;onJournal(gameJournalText(kind,game),count);};
}

/** Facts come from local rule engines, never from a model or an invented game recap. */
export function makeGameResult(kind,game){
  let winner,lastMove,details,position,recentMoves='';
  if(kind==='chess'){
    const result=game.status();if(!result)return null;winner=result.winner;
    lastMove=chessMoveText(game.lastPlayerMove);details=result.reason+' Последний ход партии: '+(game.lastMove?.side===0?'игрок — ':'соперник — ')+chessMoveText(game.lastMove)+'.';
    position=chessPosition(game);
    recentMoves=game.journal.slice(-6).map(m=>`${m.side===0?'Белые':'Чёрные'}: ${chessMoveText(m)}`).join('\n');
  }else if(kind==='checkers'){
    const result=game.status();if(!result)return null;winner=result.winner;lastMove=checkersMoveText(game.lastPlayerMove);
    details=(game.mandatoryCapture===false?'В этой партии взятие по желанию. ':'')+result.reason+' Последний ход партии: '+(game.lastMove?.side===0?'игрок — ':'соперник — ')+checkersMoveText(game.lastMove)+'.';position=checkersPosition(game);
    recentMoves=game.recentMoves.map(m=>`${m.side===0?'Белые':'Чёрные'}: ${checkersMoveText(m)}`).join('\n');
  }else if(kind==='dice'){
    if(game.phase!=='finished')return null;winner=game.winner;lastMove=diceActionText(game.lastPlayerAction);
    details=`Цель: ${game.target}. Счёт: игрок ${game.scores[0]}, соперник ${game.scores[1]}. Победитель забрал нужную сумму очков.`;
    position=`Кости на столе в конце партии: ${game.values.map(v=>v??'не брошена').join(', ')}. Последний завершённый ход: ${game.lastEvent?.player===0?'игрок':'соперник'} забрал ${game.lastEvent?.points??0} очков.`;
  }else if(kind==='poker'){
    if(!game.result)return null;winner=game.result.winner;lastMove=pokerActionText(game.lastPlayerAction);
    details=`Раздача ${game.handNumber}; банк ${game.lastPot} условных фишек. `+(game.result.reason==='fold'?`${winner===0?'Соперник':'Игрок'} сбросил карты; вскрытия не было.`:`Вскрытие: у игрока ${game.result.hands[0].name}, у соперника ${game.result.hands[1].name}.`);
    details+=game.phase==='finished'?` Матч завершён: ${game.matchWinner===0?'игрок выиграл все фишки':'игрок проиграл все фишки'}.`:' Матч ещё продолжается; это итог одной раздачи.';
    position=`Общие карты: ${cards(game.board)}.\nКарты игрока: ${cards(game.hands[0])}.\nКарты соперника: ${game.result.reason==='showdown'?cards(game.hands[1]):'остались закрыты'}.\nФишки после раздачи: игрок ${game.stacks[0]}, соперник ${game.stacks[1]}.`;
  }else if(kind==='domino'){
    if(!game.result)return null;winner=game.result.winner;lastMove=dominoActionText(game.lastPlayerAction);
    details=game.result.reason==='empty'?`${winner===0?'Игрок':'Соперник'} выложил все костяшки.`:`Партия заблокирована. Очки на руках: игрок ${game.result.scores[0]}, соперник ${game.result.scores[1]}; меньшая сумма побеждает.`;
    position=`Цепочка слева направо: ${game.chain.map(t=>`${t.a}–${t.b}`).join(' | ')}.\nУ игрока: ${game.hands[0].map(tile).join(', ')||'нет костяшек'}.\nУ соперника после раскрытия: ${game.hands[1].map(tile).join(', ')||'нет костяшек'}.\nВ базаре осталось: ${game.stock.length}.`;
  }else return null;
  return sanitizeGameResult({game:kind,outcome:outcome(winner),lastMove,details,position,recentMoves,journal:gameJournalText(kind,game),journalEntries:game.journal.length});
}

function plain(raw,max,allowEmpty=false){
  if(typeof raw!=='string'||raw.length>max||(!allowEmpty&&!raw.trim())||/[<>`]|\{\{|\}\}|(?:https?|data|javascript|file):/i.test(raw))throw new Error('Invalid game report');
  return raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
}
export function sanitizeGameResult(raw){
  if(!raw||!Object.hasOwn(GAME_REPORT_TITLES,raw.game)||!Object.hasOwn(OUTCOMES,raw.outcome))throw new Error('Invalid game report');
  const journalEntries=raw.journalEntries??0;if(!Number.isSafeInteger(journalEntries)||journalEntries<0||journalEntries>1000000)throw new Error('Invalid game journal');
  return {game:raw.game,outcome:raw.outcome,lastMove:plain(raw.lastMove,500),details:plain(raw.details,900),position:plain(raw.position,1800),recentMoves:plain(raw.recentMoves??'',1400,true),journal:plain(raw.journal??'',2000000,true),journalEntries};
}
export function sanitizeGameReport(raw){
  if(raw?.version!==1||typeof raw.id!=='string'||!/^[a-f0-9]{32}$/.test(raw.id))throw new Error('Invalid game report');
  return {version:1,id:raw.id,...sanitizeGameResult(raw),sent:raw.sent===true,sentWithJournal:raw.sent===true&&raw.sentWithJournal===true,sentAs:sanitizeChatSender(raw.sentAs)};
}
export function sanitizeGameReports(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  const chats=[];
  for(const [key,value] of Object.entries(raw)){
    if(!key||key.length>2048||!value||typeof value!=='object')continue;
    const reports=[];for(const game of Object.keys(GAME_REPORT_TITLES))try{const record=sanitizeGameReport(value[game]);if(record.game===game)reports.push([game,record]);}catch{/* Ignore invalid old storage. */}
    if(reports.length)chats.push([key,Object.fromEntries(reports)]);
  }
  return Object.fromEntries(chats);
}
export function gameReportText(raw,{forChat=false,includeJournal=false}={}){
  const report=sanitizeGameResult(raw);
  const text=`${GAME_REPORT_TITLES[report.game]} · ${OUTCOMES[report.outcome]}\n${report.details}\n\nПоследний ход игрока: ${report.lastMove}\n\nФинальная позиция:\n${report.position}`+(includeJournal===true&&report.journal?`\n\nПолный журнал партии:\n${report.journal}`:report.recentMoves?`\n\nПоследние ходы обеих сторон:\n${report.recentMoves}`:'');
  return text+(forChat?'\n\nИтог сыгранной мини-игры для текущей сцены. Отреагируй в роли персонажа с учётом сюжета, его характера и отношений с игроком. Сохрани указанные результат и позицию; не придумывай другие ходы и не решай за игрока его действия или чувства. Реакция и литературный стиль остаются за обычным пресетом чата.':'');
}
export function gameReportChatText(raw,{includeJournal=false}={}){
  return gameReportText(raw,{forChat:true,includeJournal}).replace(/&/g,'&amp;').replace(/([\\`*_{}\[\]()!|])/g,'\\$1');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {ChessGame,chessIndex,chooseChessMove} from '../chess-game.js';
import {CheckersGame} from '../checkers.js';
import {DiceMatch,chooseDiceMove} from '../dice.js';
import {PokerMatch} from '../poker.js';
import {DominoGame,DOMINO_SET} from '../domino.js';
import {makeGameResult,gameReportText,gameReportChatText,sanitizeGameReport,sanitizeGameReports,gameJournalText} from '../game-report.js';
const sq=chessIndex,move=(g,a,b,promotion)=>g.play({from:sq(a),to:sq(b),promotion});
const knight=()=>{const g=new ChessGame('6rk/6pp/8/6N1/8/8/8/K7 w - - 0 1');assert.ok(move(g,'g5','f7'));return g;};

test('A knight checkmate report includes every remaining piece, the real move and actual outcome',()=>{
  const g=knight(),r=makeGameResult('chess',g);
  assert.equal(r.outcome,'win');assert.match(r.lastMove,/конь g5–f7; мат \(Nf7#\)/);
  for(const term of ['король: a1','конь: f7','король: h8','ладья: g8','пешки: g7, h7'])assert.ok(r.position.includes(term),term);
  assert.equal(g.position().filter(Boolean).length,6);assert.ok(!r.position.includes('ферзь'));
  assert.match(r.recentMoves,/Белые: конь g5–f7/);assert.match(gameReportText(r,{forChat:true}),/характера и отношений/);
});
test('An opponent move never overwrites the player last move; draws and unfinished games are distinguished',()=>{
  const g=new ChessGame();assert.equal(makeGameResult('chess',g),null);
  for(const [a,b] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']])assert.ok(move(g,a,b));
  const r=makeGameResult('chess',g);assert.equal(r.outcome,'loss');assert.match(r.lastMove,/пешка g2–g4/);assert.match(r.details,/соперник — ферзь d8–h4; мат/);
  assert.equal((r.recentMoves.match(/Белые:|Чёрные:/g)||[]).length,4);
  const draw=makeGameResult('chess',new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'));assert.equal(draw.outcome,'draw');assert.match(draw.details,/Пат/);
});
test('Promotion and en passant preserve the final board and exact move information',()=>{
  const ep=new ChessGame('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert.ok(move(ep,'e5','d6'));assert.equal(ep.lastPlayerMove.flags.includes('e'),true);assert.equal(ep.position()[sq('d5')],null);
  const p=new ChessGame('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.ok(move(p,'a7','a8','n'));
  const r=makeGameResult('chess',p);assert.equal(r.outcome,'draw');assert.match(r.lastMove,/превращение в коня/);assert.match(r.position,/конь: a8/);assert.ok(!r.position.includes('пешка: a7'));
});
test('Draughts report keeps the whole capture chain, promotion, captured cells and full board',()=>{
  const g=new CheckersGame();g.board=Array(64).fill(0);for(const [s,p] of Object.entries({b6:1,c7:-1,f6:-1}))g.board[sq(s)]=p;
  assert.ok(g.play(g.moves().find(m=>m.to===sq('g5'))));const r=makeGameResult('checkers',g);
  assert.equal(r.outcome,'win');assert.match(r.lastMove,/b6:d8:g5/);assert.match(r.lastMove,/взято 2, клетки c7, f6/);assert.match(r.lastMove,/превращение в дамку/);assert.match(r.position,/дамки g5/);assert.match(r.position,/Чёрные \(соперник\): шашки нет; дамки нет/);
});
test('Dice reports preserve the player bank after the opponent turn and contain the true scores',()=>{
  const g=new DiceMatch({target:1500,rollDie:()=>1});g.roll();g.select([0]);g.bank();assert.equal(g.lastPlayerAction.points,100);
  g.roll();const choice=chooseDiceMove(g);g.select(choice.indices);g.bank();const r=makeGameResult('dice',g);
  assert.equal(r.outcome,'loss');assert.match(r.lastMove,/Забраны 100 очков/);assert.ok(g.scores[1]>=1500);assert.ok(r.details.includes('игрок 100, соперник '+g.scores[1]));
});
test('Poker reports distinguish a hand from a match and never reveal folded opponent cards',()=>{
  const g=new PokerMatch();g.deal(Array.from({length:52},(_,i)=>i));assert.ok(g.act(0,'raise',100));assert.ok(g.act(1,'fold'));
  const r=makeGameResult('poker',g);assert.equal(r.outcome,'win');assert.match(r.lastMove,/рейз до 100/);assert.match(r.details,/итог одной раздачи/);assert.match(r.position,/Карты соперника: остались закрыты/);assert.ok(!r.position.includes('Карты соперника: 2♠'));
  const prefix='Kc As Kd Ac 2h 3c 5d 7h 4c 9s 6d Js'.split(' ').map(s=>'shdc'.indexOf(s.at(-1))*13+'23456789TJQKA'.indexOf(s.slice(0,-1)));
  const match=new PokerMatch({initialStacks:[10,10]});match.deal([...prefix,...Array.from({length:52},(_,i)=>i).filter(i=>!prefix.includes(i))]);const done=makeGameResult('poker',match);assert.ok(done);assert.match(done.details,/Матч завершён/);assert.match(done.lastMove,/добровольного хода игрока не было/);
});
test('Domino reports retain the player last tile, the entire chain and revealed end hands',()=>{
  const id=(a,b)=>DOMINO_SET.findIndex(t=>t[0]===a&&t[1]===b),g=new DominoGame();g.turn=0;g.chain=[{id:id(5,6),a:6,b:5}];g.hands=[[id(6,6)],[id(0,1)]];g.stock=[];
  assert.ok(g.play(id(6,6),'left'));const r=makeGameResult('domino',g);assert.equal(r.outcome,'win');assert.match(r.lastMove,/6–6 слева/);assert.match(r.position,/6–6 \| 6–5/);assert.match(r.position,/У игрока: нет костяшек/);assert.match(r.position,/У соперника после раскрытия: 0–1/);
});
test('Stored reports whitelist bounded facts and preserve one last result per game/chat',()=>{
  const raw={version:1,id:'a'.repeat(32),...makeGameResult('chess',knight()),sent:false,chat:'PRIVATE_CHAT',key:'PRIVATE_KEY'};
  const safe=sanitizeGameReport(raw);assert.ok(!JSON.stringify(safe).includes('PRIVATE_'));
  assert.deepEqual(sanitizeGameReports({one:{chess:raw,bad:raw},two:{chess:{...raw,lastMove:'{{getvar::secret}}'}}}),{one:{chess:safe}});
  for(const bad of [{...raw,id:'no'},{...raw,position:'<script>bad</script>'},{...raw,recentMoves:'x'.repeat(1401)},{...raw,outcome:'maybe'}])assert.throws(()=>sanitizeGameReport(bad));
  assert.ok(!gameReportChatText(safe).includes('{{'));assert.match(gameReportChatText(safe),/Nf7#/);
});
test('The full chess journal keeps every move and excludes simulated opponent analysis',()=>{
  const g=new ChessGame();for(const [a,b] of [['e2','e4'],['e7','e5'],['g1','f3']])assert.ok(move(g,a,b));
  const before=gameJournalText('chess',g);chooseChessMove(g,()=>0);assert.equal(gameJournalText('chess',g),before);assert.equal(g.journal.length,3);
  assert.match(before,/1\. Белые .*пешка e2–e4/);assert.match(before,/2\. Чёрные .*пешка e7–e5/);assert.match(before,/3\. Белые .*конь g1–f3/);
  g.reset();assert.equal(g.journal.length,0);assert.equal(gameJournalText('chess',g),'');
});
test('Full journals are preserved but only included in chat when explicitly selected',()=>{
  const g=new ChessGame();for(let i=0;i<2;i++)for(const [a,b] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']])assert.ok(move(g,a,b));
  const r=makeGameResult('chess',g);assert.equal(r.journalEntries,8);assert.ok(r.journal.includes('1. Белые'));assert.ok(r.journal.includes('8. Чёрные'));
  const short=gameReportText(r),full=gameReportText(r,{includeJournal:true});assert.ok(!short.includes('1. Белые'));assert.ok(full.includes(r.journal));assert.ok(!full.includes('Последние ходы обеих сторон:'));assert.ok(full.length>short.length);
  assert.equal(sanitizeGameReport({version:1,id:'a'.repeat(32),...r,sent:true,sentWithJournal:true}).sentWithJournal,true);
});
test('Poker journals span hands, include bets and exposed streets, and keep folded hands hidden',()=>{
  const g=new PokerMatch();g.deal(Array.from({length:52},(_,i)=>i));g.act(0,'raise',100);g.act(1,'fold');
  const first=gameJournalText('poker',g);assert.match(first,/игрок: префлоп: рейз до 100/);assert.match(first,/Соперник — пас, закрытые карты не раскрывались/);
  assert.ok(g.deal(Array.from({length:52},(_,i)=>51-i)));assert.ok(gameJournalText('poker',g).includes(first.split('\n')[1]));assert.match(gameJournalText('poker',g),/Раздача 2/);
  g.reset();assert.equal(g.journal.length,0);
});

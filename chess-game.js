import { Chess, Move } from './vendor/chess.js';
import {BOARD_DIFFICULTIES,sanitizeBoardDifficulty,searchBudget,SEARCH_LIMIT,pickBoardMove} from './board-difficulty.js';

const CHESS_VALUES={p:100,n:320,b:330,r:500,q:900,k:0};
export const chessIndex=square=>(8-Number(square[1]))*8+'abcdefgh'.indexOf(square[0]);
export const chessSquare=index=>'abcdefgh'[index%8]+(8-Math.floor(index/8));
const chessDescriptor=move=>({from:chessIndex(move.from),to:chessIndex(move.to),path:[chessIndex(move.to)],piece:move.piece,side:move.color==='w'?0:1,promotion:move.promotion,capture:!!move.captured,capturedPiece:move.captured,flags:move.flags,san:move.san});

export class ChessGame {
  constructor(fen){this.engine=new Chess(fen);this.lastMove=null;this.lastPlayerMove=null;this.journal=[];}
  reset(){this.engine.reset();this.lastMove=null;this.lastPlayerMove=null;this.journal=[];}
  get turn(){return this.engine.turn()==='w'?0:1;}
  moves(){return this.engine.moves({verbose:true}).map(chessDescriptor);}
  position(){return this.engine.board().flat().map(p=>p?{type:p.type,side:p.color==='w'?0:1}:null);}
  status(){
    if(this.engine.isCheckmate())return {winner:1-this.turn,reason:'Мат.'};
    if(this.engine.isStalemate())return {winner:null,reason:'Пат.'};
    if(this.engine.isInsufficientMaterial())return {winner:null,reason:'Недостаточно материала для мата.'};
    if(this.engine.isThreefoldRepetition())return {winner:null,reason:'Троекратное повторение.'};
    if(this.engine.isDrawByFiftyMoves())return {winner:null,reason:'50 ходов без взятия и движения пешек.'};
    return null;
  }
  checkedSquare(){return this.engine.isCheck()?this.position().findIndex(p=>p?.type==='k'&&p.side===this.turn):-1;}
  play(move){
    if(this.status())return false;
    try{
      const legal=this.engine.move({from:chessSquare(move.from),to:chessSquare(move.to),promotion:move.promotion||'q'});
      this.lastMove=chessDescriptor(legal);this.journal.push(this.lastMove);if(legal.color==='w')this.lastPlayerMove=this.lastMove;return true;
    }catch{return false;}
  }
}

function chessEvaluation(engine,side){
  let score=0;
  for(let index=0;index<128;index++){
    if(index&0x88){index+=7;continue;}
    const p=engine._board[index];if(!p)continue;
    const r=index>>4,c=index&7;
    const center=7-Math.abs(3.5-r)-Math.abs(3.5-c);
    const bonus=p.type==='p'?(p.color==='w'?6-r:r-1)*7:!['k','r'].includes(p.type)?center*5:0;
    score+=(p.color===side?1:-1)*(CHESS_VALUES[p.type]+bonus);
  }
  return score;
}
const chessOrder=move=>(CHESS_VALUES[move.captured]||0)*10-(move.captured?CHESS_VALUES[move.piece]||0:0)+(move.promotion?8000:0);
const sameChessMove=(a,b)=>a&&b&&a.from===b.from&&a.to===b.to&&a.promotion===b.promotion;
/** Bounded iterative search on a disposable board. The pinned chess.js 1.4.0
 * numeric move core avoids building SAN/FEN for every speculative node. Legal
 * move generation stays enabled; actual play still uses public engine.move(). */
export function chooseChessMove(game,random=Math.random,difficulty='normal'){
  if(game.status())return null;
  const level=sanitizeBoardDifficulty(difficulty),profile=BOARD_DIFFICULTIES[level].chess;
  const engine=new Chess(game.engine.fen());engine._positionCount=new Map(game.engine._positionCount);
  const moves=engine._moves().sort((a,b)=>chessOrder(b)-chessOrder(a));
  const visit=searchBudget(profile),MATE=100000;
  let chosen=moves[0];
  function after(move,run){
    engine._makeMove(move);engine._incPositionCount();const hash=engine._hash;
    try{return run();}finally{engine._decPositionCount(hash);engine._undoMove();}
  }
  function search(depth,alpha,beta,ply,extensions){
    visit();
    const legal=engine._moves(),checked=engine.isCheck();
    if(!legal.length)return checked?-MATE+ply:0;
    if(engine.isInsufficientMaterial()||engine.isThreefoldRepetition()||engine.isDrawByFiftyMoves())return 0;
    let candidates=legal;
    if(depth<=0){
      const stand=chessEvaluation(engine,engine.turn());
      if(!extensions)return stand;
      if(!checked){if(stand>=beta)return stand;alpha=Math.max(alpha,stand);candidates=legal.filter(m=>m.captured||m.promotion);}
      if(!candidates.length)return stand;
    }
    candidates.sort((a,b)=>chessOrder(b)-chessOrder(a));
    let best=depth<=0&&!checked?chessEvaluation(engine,engine.turn()):-Infinity;
    for(const move of candidates){
      visit();const score=after(move,()=>-search(depth-1,-beta,-alpha,ply+1,depth<=0?extensions-1:extensions));
      best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break;
    }
    return best;
  }
  for(let depth=1;depth<=profile.depth;depth++){
    let best=-Infinity,next=chosen;const scores=[];
    const ordered=[...moves].sort((a,b)=>(sameChessMove(b,chosen)?1000000:chessOrder(b))-(sameChessMove(a,chosen)?1000000:chessOrder(a)));
    try{
      for(const move of ordered){
        visit();const score=after(move,()=>-search(depth-1,-MATE,-best,1,level==='hard'?2:0));
        scores.push({move,score});if(score>best){best=score;next=move;}
      }
    }catch(error){if(error===SEARCH_LIMIT)break;throw error;}
    chosen=level==='easy'?pickBoardMove(scores.sort((a,b)=>b.score-a.score).filter(s=>s.score>=best-45).slice(0,3).map(s=>s.move),random):next;
    if(best>MATE-100)break;
  }
  return chosen?chessDescriptor(new Move(engine,chosen)):null;
}

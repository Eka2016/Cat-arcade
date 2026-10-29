import {BOARD_DIFFICULTIES,sanitizeBoardDifficulty,searchBudget,SEARCH_LIMIT,pickBoardMove} from './board-difficulty.js';

const DRAUGHT_DIRS=[[-1,-1],[-1,1],[1,-1],[1,1]];
const draughtInside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const draughtCrown=(piece,index)=>Math.abs(piece)===1&&(piece>0&&index<8||piece<0&&index>=56)?piece*2:piece;
export const boardSquare=i=>'abcdefgh'[i%8]+(8-Math.floor(i/8));

/** Russian draughts: captured pieces remain blockers until the complete chain ends. */
export function checkersMoves(board,turn=0,mandatoryCapture=true) {
  const side=turn===0?1:-1,captures=[];
  function search(position,index,piece,from,path,taken) {
    let continued=false;
    for(const [dr,dc] of DRAUGHT_DIRS){
      let r=Math.floor(index/8)+dr,c=index%8+dc;
      if(!draughtInside(r,c))continue;
      if(Math.abs(piece)===1){
        const enemy=r*8+c,nr=r+dr,nc=c+dc;
        if(position[enemy]*side>=0||taken.includes(enemy)||!draughtInside(nr,nc)||position[nr*8+nc])continue;
        const to=nr*8+nc,next=[...position];next[index]=0;next[to]=draughtCrown(piece,to);
        continued=true;search(next,to,next[to],from,[...path,to],[...taken,enemy]);
      }else{
        while(draughtInside(r,c)&&!position[r*8+c]){r+=dr;c+=dc;}
        if(!draughtInside(r,c))continue;
        const enemy=r*8+c;
        if(position[enemy]*side>=0||taken.includes(enemy))continue;
        r+=dr;c+=dc;
        while(draughtInside(r,c)&&!position[r*8+c]){
          const to=r*8+c,next=[...position];next[index]=0;next[to]=piece;
          continued=true;search(next,to,piece,from,[...path,to],[...taken,enemy]);r+=dr;c+=dc;
        }
      }
    }
    if(!continued&&taken.length)captures.push({from,to:index,path,captures:taken,piece});
  }
  for(let i=0;i<64;i++)if(board[i]*side>0)search(board,i,board[i],i,[],[]);
  if(captures.length&&mandatoryCapture)return captures;
  const moves=[];
  for(let from=0;from<64;from++){
    const piece=board[from];if(piece*side<=0)continue;
    for(const [dr,dc] of DRAUGHT_DIRS){
      if(Math.abs(piece)===1&&dr!==(piece>0?-1:1))continue;
      let r=Math.floor(from/8)+dr,c=from%8+dc;
      while(draughtInside(r,c)&&!board[r*8+c]){
        const to=r*8+c;moves.push({from,to,path:[to],captures:[],piece:draughtCrown(piece,to)});
        if(Math.abs(piece)===1)break;r+=dr;c+=dc;
      }
    }
  }
  return captures.concat(moves);
}

export function applyCheckersMove(board,move) {
  const next=[...board];next[move.from]=0;for(const i of move.captures)next[i]=0;next[move.to]=move.piece;return next;
}

export class CheckersGame {
  constructor({mandatoryCapture=true}={}){this.mandatoryCapture=mandatoryCapture!==false;this.reset();}
  reset(){
    this.board=Array(64).fill(0);for(let r=0;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2===1)this.board[r*8+c]=r<3?-1:r>4?1:0;
    this.turn=0;this.lastMove=null;this.lastPlayerMove=null;this.journal=[];this.recentMoves=[];this.quietKings=0;this.history=new Map([[this.key(),1]]);
  }
  key(){return this.board.join(',')+'/'+this.turn;}
  moves(){return checkersMoves(this.board,this.turn,this.mandatoryCapture);}
  position(){return [...this.board];}
  status(){
    if(!this.moves().length)return {winner:1-this.turn,reason:'Нет доступных ходов.'};
    if((this.history.get(this.key())||0)>=3)return {winner:null,reason:'Троекратное повторение.'};
    if(this.quietKings>=30)return {winner:null,reason:'15 ходов каждой стороны только дамками без взятия.'};
    return null;
  }
  play(move){
    if(this.status())return false;
    const legal=this.moves().find(m=>m.from===move.from&&m.path.join(',')===move.path.join(','));if(!legal)return false;
    this.quietKings=Math.abs(this.board[legal.from])===2&&!legal.captures.length?this.quietKings+1:0;
    this.lastMove={...legal,path:[...legal.path],captures:[...legal.captures],side:this.turn,startPiece:this.board[legal.from]};
    if(this.turn===0)this.lastPlayerMove=this.lastMove;
    this.journal.push(this.lastMove);
    this.recentMoves=[...this.recentMoves,this.lastMove].slice(-6);
    this.board=applyCheckersMove(this.board,legal);this.turn=1-this.turn;
    this.history.set(this.key(),(this.history.get(this.key())||0)+1);return true;
  }
  preview(from,path){
    const board=[...this.board];let piece=board[from];board[from]=0;
    for(const to of path)piece=draughtCrown(piece,to);
    if(path.length)board[path.at(-1)]=piece;else board[from]=piece;
    return board;
  }
}

function checkersValue(board,side){
  let value=0;for(let i=0;i<64;i++){
    const p=board[i];if(!p)continue;
    const advanced=p>0?7-Math.floor(i/8):Math.floor(i/8);
    value+=Math.sign(p)*(Math.abs(p)===2?340:100+advanced*5)+(p>0?1:-1)*(3.5-Math.abs(i%8-3.5))*2;
  }return value*(side===0?1:-1);
}
const checkersOrder=move=>move.captures.length*1000+Math.abs(move.piece)*100;
const sameCheckersMove=(a,b)=>a&&b&&a.from===b.from&&a.path.join(',')===b.path.join(',');
export function chooseCheckersMove(game,random=Math.random,difficulty='normal') {
  if(game.status())return null;
  const level=sanitizeBoardDifficulty(difficulty),profile=BOARD_DIFFICULTIES[level].checkers;
  const moves=game.moves().sort((a,b)=>checkersOrder(b)-checkersOrder(a)),history=new Map(game.history);
  const visit=searchBudget(profile),MATE=100000;let chosen=moves[0];
  function after(board,move,side,quiet,run){
    const next=applyCheckersMove(board,move),nextQuiet=Math.abs(board[move.from])===2&&!move.captures.length?quiet+1:0;
    const key=next.join(',')+'/'+(1-side),count=history.get(key)||0;
    history.set(key,count+1);
    try{return run(next,1-side,nextQuiet,count+1);}finally{if(count)history.set(key,count);else history.delete(key);}
  }
  function search(board,side,quiet,repeats,depth,alpha,beta,ply,extensions){
    visit();const legal=checkersMoves(board,side,game.mandatoryCapture);
    if(!legal.length)return -MATE+ply;
    if(repeats>=3||quiet>=30)return 0;
    if(depth<=0&&(!extensions||!legal[0].captures.length))return checkersValue(board,side);
    legal.sort((a,b)=>checkersOrder(b)-checkersOrder(a));let best=-Infinity;
    for(const move of legal){
      const score=after(board,move,side,quiet,(next,turn,q,r)=>-search(next,turn,q,r,depth-1,-beta,-alpha,ply+1,depth<=0?extensions-1:extensions));
      best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break;
    }
    return best;
  }
  for(let depth=1;depth<=profile.depth;depth++){
    let best=-Infinity,next=chosen;const scores=[];
    const ordered=[...moves].sort((a,b)=>(sameCheckersMove(b,chosen)?1000000:checkersOrder(b))-(sameCheckersMove(a,chosen)?1000000:checkersOrder(a)));
    try{
      for(const move of ordered){
        visit();const score=after(game.board,move,game.turn,game.quietKings,(board,side,q,r)=>-search(board,side,q,r,depth-1,-MATE,-best,1,level==='hard'?3:0));
        scores.push({move,score});if(score>best){best=score;next=move;}
      }
    }catch(error){if(error===SEARCH_LIMIT)break;throw error;}
    chosen=level==='easy'?pickBoardMove(scores.sort((a,b)=>b.score-a.score).filter(s=>s.score>=best-18).slice(0,3).map(s=>s.move),random):next;
    if(best>MATE-100)break;
  }
  return chosen||null;
}

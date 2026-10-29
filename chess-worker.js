import {ChessGame,chooseChessMove} from './chess-game.js';

// Only a board snapshot is received. This worker has no chat or Tavern context.
self.onmessage=({data})=>{
  try{
    const game=new ChessGame(data.fen);game.engine._positionCount=new Map(data.counts);
    const move=chooseChessMove(game,Math.random,data.difficulty);
    self.postMessage({id:data.id,move:move?{from:move.from,to:move.to,promotion:move.promotion}:null});
  }catch{self.postMessage({id:data?.id,error:true});}
};

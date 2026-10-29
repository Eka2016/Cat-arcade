import {CheckersGame,chooseCheckersMove} from './checkers.js';

// Only the position, draw counters and local difficulty enter this worker.
self.onmessage=({data})=>{
  try{
    const game=new CheckersGame({mandatoryCapture:data.mandatoryCapture});
    game.board=data.board;game.turn=data.turn;game.quietKings=data.quietKings;game.history=new Map(data.history);
    const move=chooseCheckersMove(game,Math.random,data.difficulty);
    self.postMessage({id:data.id,move:move?{from:move.from,path:move.path}:null});
  }catch{self.postMessage({id:data?.id,error:true});}
};

const REACTIONS=Object.freeze({
  neutral:{mood:'neutral',frame:0,label:'Император спокойно наблюдает за доской.'},
  thinking:{mood:'thinking',frame:1,label:'Император сосредоточенно смотрит на доску.'},
  win:{mood:'win',frame:2,label:'Император сдержанно улыбается после своей победы.'},
  lose:{mood:'lose',frame:3,label:'Император разочарованно принимает поражение.'},
});

/** Only turn and the actual game outcome determine the opponent's expression. */
export function getChessReaction(game,result=game.status()){
  if(result)return REACTIONS[result.winner===1?'win':result.winner===0?'lose':'neutral'];
  return REACTIONS[game.turn===1?'thinking':'neutral'];
}

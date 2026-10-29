const REACTIONS=Object.freeze({
  neutral:{mood:'neutral',frame:0,label:'Соперник спокойно наблюдает за шашечной доской.'},
  thinking:{mood:'thinking',frame:1,label:'Соперник задумчиво выбирает ход.'},
  win:{mood:'win',frame:2,label:'Соперник тепло улыбается после своей победы.'},
  lose:{mood:'lose',frame:3,label:'Соперник с лёгким огорчением принимает поражение.'},
});
export function getCheckersReaction(game,result=game.status()){
  if(result)return REACTIONS[result.winner===1?'win':result.winner===0?'lose':'neutral'];
  return REACTIONS[game.turn===1?'thinking':'neutral'];
}

const REACTIONS=Object.freeze({
  neutral:{mood:'neutral',frame:0,label:'Соперник спокойно наблюдает за игрой.'},
  thinking:{mood:'thinking',frame:1,label:'Соперник задумался над своим ходом.'},
  win:{mood:'win',frame:2,label:'Соперник улыбается, довольный своей победой.'},
  lose:{mood:'lose',frame:3,label:'Соперник разочарован результатом раздачи.'},
});

/** Reactions use turn/result facts only, never the strength of a hidden hand. */
export function getPokerReaction(game){
  if(game.result){const winner=game.phase==='finished'?game.matchWinner:game.result.winner;return REACTIONS[winner===1?'win':winner===0?'lose':'neutral'];}
  return REACTIONS[game.phase==='playing'&&game.actor===1?'thinking':'neutral'];
}

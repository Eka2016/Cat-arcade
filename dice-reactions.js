export const REACTION_FRAMES=Object.freeze({neutral:0,thinking:5,win:3,lose:4});
const REACTION_LABELS={
  win:'Дрейк улыбается, довольный своей победой.',
  lose:'Дрейк разочарованно опускает взгляд после поражения.',
  thinking:'Дрейк задумчиво приподнимает бровь.',
  neutral:'Дрейк спокойно наблюдает за игрой.',
};
const response=(mood,line)=>({mood,frame:REACTION_FRAMES[mood],line,label:REACTION_LABELS[mood]});

/** Every emotion is from the opponent's point of view, including the match result. */
export function getOpponentReaction(match,{rolling=false}={}) {
  if(match.phase==='finished') {
    return match.winner===1?response('win','Сегодня удача за мной.'):response('lose','Хорошо сыграно.');
  }
  if(match.player===1)return response('thinking',rolling?'Посмотрим, что выпадет.':'Мой ход.');
  if(match.phase==='choose'&&!match.selectedScore)return response('thinking',match.selected.size?'Это пока не зачёт.':'Выбери зачётную комбинацию.');
  return response('neutral',match.phase==='bust'?'Пусто. Следующий ход.':match.selectedScore?'Зачёт. Забираешь или ещё бросок?':'Твой ход.');
}

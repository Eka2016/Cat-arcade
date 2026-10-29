export const RECORD_GAMES=Object.freeze({snake:'Змейка',dice:'Кости',poker:'Покер',chess:'Шахматы',checkers:'Шашки',domino:'Домино',words:'Английский'});
const count=n=>Number.isFinite(n)?Math.max(0,Math.min(1000000,Math.floor(n))):0;
/** Bounded numeric totals only: no chat, moves, cards or connection data. */
export function sanitizeArcadeStats(raw,legacy={}){
  return Object.fromEntries(Object.keys(RECORD_GAMES).map(kind=>{
    const saved=raw?.[kind],value=saved&&typeof saved==='object'?saved:legacy[kind]||{};
    const wins=count(value.wins),bestStreak=Math.min(wins,count(value.bestStreak)),streak=Math.min(bestStreak,count(value.streak));
    const bestTotal=kind==='words'?Math.min(10,count(value.bestTotal)):0,bestCorrect=kind==='words'?Math.min(bestTotal,count(value.bestCorrect)):0;
    return [kind,{wins,losses:count(value.losses),draws:count(value.draws),streak,bestStreak,bestCorrect,bestTotal}];
  }));
}
export function wordRoundOutcome(correct,total){
  if(!Number.isInteger(total)||total<1||total>10||!Number.isInteger(correct)||correct<0||correct>total)throw new RangeError('Invalid word round');
  return correct*10>=total*7?'win':'loss';
}
export function recordArcadeResult(raw,kind,outcome,round){
  if(!Object.hasOwn(RECORD_GAMES,kind)||!['win','loss','draw'].includes(outcome))throw new RangeError('Invalid arcade result');
  if(kind==='words'&&wordRoundOutcome(round?.correct,round?.total)!==outcome)throw new RangeError('Invalid word outcome');
  const stats=sanitizeArcadeStats(raw),entry=stats[kind],field=outcome==='win'?'wins':outcome==='loss'?'losses':'draws';
  entry[field]=Math.min(1000000,entry[field]+1);entry.streak=outcome==='win'?Math.min(1000000,entry.streak+1):0;entry.bestStreak=Math.max(entry.bestStreak,entry.streak);
  if(kind==='words'&&(!entry.bestTotal||round.correct*entry.bestTotal>entry.bestCorrect*round.total||round.correct*entry.bestTotal===entry.bestCorrect*round.total&&round.total>entry.bestTotal)){
    entry.bestCorrect=round.correct;entry.bestTotal=round.total;
  }
  return stats;
}

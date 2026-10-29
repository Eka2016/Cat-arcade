export const BOARD_DIFFICULTIES=Object.freeze({
  easy:Object.freeze({label:'Лёгкий',chess:{depth:1,nodes:600,ms:45},checkers:{depth:1,nodes:600,ms:15}}),
  normal:Object.freeze({label:'Средний',chess:{depth:2,nodes:1800,ms:120},checkers:{depth:3,nodes:6000,ms:40}}),
  hard:Object.freeze({label:'Сложный',chess:{depth:3,nodes:4500,ms:250},checkers:{depth:6,nodes:24000,ms:120}}),
});
export const sanitizeBoardDifficulty=value=>typeof value==='string'&&Object.hasOwn(BOARD_DIFFICULTIES,value)?value:'normal';
export const SEARCH_LIMIT=Symbol('local search budget');
export function searchBudget(profile){
  const end=performance.now()+profile.ms;let nodes=0;
  return ()=>{if(++nodes>profile.nodes||performance.now()>end)throw SEARCH_LIMIT;};
}
export function pickBoardMove(moves,random=Math.random){
  return moves[Math.max(0,Math.min(moves.length-1,Math.floor(random()*moves.length)))]||null;
}

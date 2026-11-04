import {DurakGame,durakCard,chooseDurakMove} from './durak.js';
import {sanitizeBoardDifficulty} from './board-difficulty.js';

const LIMIT=Symbol('Durak search budget');
const cardCost=(id,trump)=>{const c=durakCard(id);return c.rank+(c.suit===trump?22:0);};
const sameMove=(a,b)=>a.type===b?.type&&a.card===b.card&&a.index===b.index;
const pick=(items,random)=>items[Math.max(0,Math.min(items.length-1,Math.floor(random()*items.length)))];
function shuffle(items,random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));[out[i],out[j]]=[out[j],out[i]];}return out;}

/** Reconstruct a plausible position solely from a player's public snapshot.
 * The real game object, opponent hand and order of the real stock are unavailable. */
function samplePosition(view,random){
  const used=new Set([...view.hand,...view.discard,...view.table.flatMap(p=>[p.attack,...(p.defense===null?[]:[p.defense])])]);
  const reserve=view.stockCount?[view.trumpCard]:[];
  const known=[...new Set(view.opponentKnown)].filter(id=>!used.has(id)&&!reserve.includes(id));
  const pool=shuffle(Array.from({length:36},(_,i)=>i).filter(id=>!used.has(id)&&!known.includes(id)&&!reserve.includes(id)),random);
  const missing=view.opponentCount-known.length;
  if(missing<0||pool.length!==missing+view.stockCount-reserve.length)return null;
  const opponent=[...known,...pool.splice(0,missing)],hands=[];hands[view.player]=[...view.hand];hands[1-view.player]=opponent;
  const game=Object.create(DurakGame.prototype);
  Object.assign(game,{hands,stock:[...reserve,...pool],discard:[...view.discard],table:view.table.map(p=>({...p})),trump:view.trump,trumpCard:view.trumpCard,attacker:view.attacker,phase:view.phase,limit:view.limit,bout:1,result:null,journal:[],lastPlayerAction:null,lastBout:null});
  return game;
}
function copy(game){
  const next=Object.create(DurakGame.prototype);
  Object.assign(next,{...game,hands:game.hands.map(h=>[...h]),stock:[...game.stock],discard:[...game.discard],table:game.table.map(p=>({...p})),journal:[]});
  return next;
}
function evaluate(game,player){
  if(game.result)return game.result.winner===null?0:game.result.winner===player?10000:-10000;
  const own=game.hands[player],other=game.hands[1-player],quality=hand=>hand.reduce((s,id)=>{const c=durakCard(id);return s+(c.rank-6)*.4+(c.suit===game.trump?7:0);},0);
  if(!game.stock.length)return (other.length-own.length)*17+(quality(own)-quality(other))*.6+(game.turn===player?1:-1);
  const burden=h=>Math.max(0,h.length-6);
  return (burden(other)-burden(own))*8+(quality(own)-quality(other))*.9+(other.length-own.length)*(game.stock.length<7?5:1)+(game.attacker===player?1.5:-1.5);
}
function candidates(view){
  const cards=view.moves.filter(m=>Number.isInteger(m.card));
  const ranks=new Map();for(const id of view.hand){const r=durakCard(id).rank;ranks.set(r,(ranks.get(r)||0)+1);}
  cards.sort((a,b)=>cardCost(a.card,view.trump)-cardCost(b.card,view.trump)-(a.type==='attack'?(ranks.get(durakCard(a.card).rank)-ranks.get(durakCard(b.card).rank))*1.5:0));
  const selected=cards.length<=8?cards:[...cards.slice(0,6),cards.at(-1)];
  return [...selected,...view.moves.filter(m=>!Number.isInteger(m.card))];
}
function endgame(position,player,options,check,fallback){
  function solve(game,depth,alpha,beta){
    check();if(game.result||!depth)return evaluate(game,player);
    const maximize=game.turn===player;let best=maximize?-Infinity:Infinity;
    const moves=game.moves().sort((a,b)=>(a.type==='take')-(b.type==='take'));
    for(const move of moves){
      const next=copy(game);next.play(move);const value=solve(next,depth-1,alpha,beta);
      best=maximize?Math.max(best,value):Math.min(best,value);
      if(maximize)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);if(alpha>=beta)break;
    }
    return best;
  }
  let chosen=fallback;
  try{
    for(const depth of [2,4,6,8,10,12,16,20]){
      let best=-Infinity,nextChoice=chosen;
      const ordered=[...options].sort((a,b)=>Number(sameMove(b,chosen))-Number(sameMove(a,chosen)));
      for(const move of ordered){const next=copy(position);next.play(move);const score=solve(next,depth-1,best,Infinity);if(score>best){best=score;nextChoice=move;}}
      chosen=nextChoice;if(best>=9999)break;
    }
  }catch(e){if(e!==LIMIT)throw e;}
  return chosen;
}

/** Three local skill levels. The hard level samples unknown cards, rather than
 * receiving them, and searches a fully deducible small endgame more deeply. */
export function chooseDurakOpponentMove(view,difficulty='normal',random=Math.random,{maxMs=24,maxNodes=6000,samples=10,now=()=>performance.now()}={}){
  const level=sanitizeBoardDifficulty(difficulty),moves=view.moves||[],fallback=chooseDurakMove(view);
  if(!moves.length||moves.length===1||level==='normal')return fallback;
  if(level==='easy'){
    const defenses=moves.filter(m=>m.type==='defend'),attacks=moves.filter(m=>m.type==='attack'),take=moves.find(m=>m.type==='take'),pass=moves.find(m=>m.type==='pass');
    if(take)return defenses.length&&random()>=.3?pick(defenses,random):take;
    if(attacks.length){if(pass&&random()<.3)return pass;return random()<.5?pick(attacks,random):[...attacks].sort((a,b)=>cardCost(b.card,view.trump)-cardCost(a.card,view.trump))[0];}
    return pass||fallback;
  }
  if(!Array.isArray(view.discard)||!Array.isArray(view.opponentKnown))return fallback;
  const started=now();let nodes=0;
  const check=()=>{if(++nodes>maxNodes||now()-started>=maxMs)throw LIMIT;};
  const options=candidates(view),position=samplePosition(view,random);if(!position)return fallback;
  if(!view.stockCount&&view.hand.length+view.opponentCount<=10)return endgame(position,view.player,view.moves,check,fallback);
  const totals=options.map(()=>0);let completed=0;
  try{
    for(let n=0;n<samples;n++){
      const sample=n?samplePosition(view,random):position,values=[];
      for(const move of options){
        check();const game=copy(sample);game.play(move);
        for(let ply=0;ply<64&&!game.result&&game.bout<3;ply++){
          check();const next=chooseDurakMove({moves:game.moves(),trump:game.trump,stockCount:game.stock.length,phase:game.phase,table:game.table});if(!next)break;game.play(next);
        }
        values.push(evaluate(game,view.player));
      }
      // Only complete batches count, so a time limit cannot favor the first card.
      values.forEach((value,i)=>totals[i]+=value);completed++;
    }
  }catch(e){if(e!==LIMIT)throw e;}
  if(!completed)return fallback;
  let best=options.findIndex(m=>sameMove(m,fallback));if(best<0)best=0;
  for(let i=0;i<options.length;i++)if(totals[i]>totals[best]+.01)best=i;
  return options[best];
}

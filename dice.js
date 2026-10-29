// KCD II base scoring, ordinary six-sided dice. Special dice/badges are not used.
// Sources and the full scoring table are in DICE-RULES.md.
const PATTERNS = [
  { faces: [1], score: 100 }, { faces: [5], score: 50 },
  { faces: [1,2,3,4,5], score: 500 },
  { faces: [2,3,4,5,6], score: 750 },
  { faces: [1,2,3,4,5,6], score: 1500 },
];
for (let face=1; face<=6; face++) {
  for (let count=3; count<=6; count++) {
    PATTERNS.push({ faces: Array(count).fill(face), score: (face===1?1000:face*100) * 2**(count-3) });
  }
}
for (const pattern of PATTERNS) {
  pattern.counts=Array(6).fill(0);
  for (const face of pattern.faces) pattern.counts[face-1]++;
}
const CACHE = new Map([['0,0,0,0,0,0',0]]);
function scoreCounts(counts) {
  const key=counts.join(',');
  if (CACHE.has(key)) return CACHE.get(key);
  let best=-Infinity;
  for (const pattern of PATTERNS) {
    if (pattern.counts.some((n,i)=>n>counts[i])) continue;
    const rest=scoreCounts(counts.map((n,i)=>n-pattern.counts[i]));
    if (Number.isFinite(rest)) best=Math.max(best,pattern.score+rest);
  }
  CACHE.set(key,best);
  return best;
}

/** Every selected die must belong to a scoring combination in THIS roll. */
export function scoreDice(values) {
  if (!Array.isArray(values) || !values.length || values.length>6
    || values.some(n=>!Number.isInteger(n)||n<1||n>6)) return 0;
  const counts=Array(6).fill(0);
  for (const n of values) counts[n-1]++;
  const score=scoreCounts(counts);
  return Number.isFinite(score)?score:0;
}

export function scoringMoves(values, available=values.map((_,i)=>i)) {
  const moves=[];
  for (let mask=1; mask<2**available.length; mask++) {
    const indices=available.filter((_,bit)=>mask&(1<<bit));
    const score=scoreDice(indices.map(i=>values[i]));
    if (score>0) moves.push({indices,score});
  }
  return moves.sort((a,b)=>b.score-a.score || b.indices.length-a.indices.length);
}

export class DiceMatch {
  constructor({target=4000,rollDie=()=>Math.floor(Math.random()*6)+1}={}) {
    this.rollDie=rollDie;
    this.reset(target);
  }

  reset(target=this.target) {
    if (!Number.isInteger(target)||target<50||target>100000) throw new RangeError('Invalid target');
    this.target=target;
    this.scores=[0,0]; this.player=0; this.winner=null;
    this.lastEvent=null;this.lastPlayerAction=null;this.journal=[];this.started=false;
    this.beginTurn();
  }

  beginTurn() {
    this.phase='ready';
    this.values=Array(6).fill(null);
    this.locked=new Set(); this.selected=new Set();
    this.turnPoints=0; this.hotDice=false;
  }

  get available() { return this.values.map((_,i)=>i).filter(i=>!this.locked.has(i)); }
  get selectedScore() { return scoreDice([...this.selected].map(i=>this.values[i])); }
  get bankable() { return this.phase==='choose' && this.selectedScore>0; }

  roll() {
    if (this.phase!=='ready') return false;
    const available=this.available;
    const faces=available.map(()=>this.rollDie());
    if (faces.some(n=>!Number.isInteger(n)||n<1||n>6)) throw new RangeError('Invalid die face');
    available.forEach((index,i)=>{this.values[index]=faces[i];});
    this.started=true; this.selected.clear(); this.hotDice=false;
    if (!scoringMoves(this.values,available).length) {
      this.lastEvent={type:'bust',player:this.player,points:this.turnPoints};
      this.turnPoints=0; this.phase='bust';
    } else this.phase='choose';
    if(this.player===0)this.lastPlayerAction={type:'roll',faces:[...faces],bust:this.phase==='bust',points:this.lastEvent?.type==='bust'&&this.phase==='bust'?this.lastEvent.points:0};
    this.journal.push({type:'roll',player:this.player,faces:[...this.values],rolled:[...available],bust:this.phase==='bust',points:this.phase==='bust'?this.lastEvent.points:0});
    return true;
  }

  toggle(index) {
    if (this.phase!=='choose'||!Number.isInteger(index)||index<0||index>=6||this.locked.has(index)) return false;
    if (this.selected.has(index)) this.selected.delete(index); else this.selected.add(index);
    return true;
  }

  select(indices) {
    if (this.phase!=='choose'||!Array.isArray(indices)||new Set(indices).size!==indices.length
      || indices.some(i=>!Number.isInteger(i)||i<0||i>=6||this.locked.has(i))) return false;
    this.selected=new Set(indices);
    return true;
  }

  keepAndRoll() {
    if (!this.bankable) return false;
    const gain=this.selectedScore;
    if(this.player===0)this.lastPlayerAction={type:'risk',faces:[...this.selected].map(i=>this.values[i]),points:this.turnPoints+gain};
    this.turnPoints+=gain;
    this.journal.push({type:'risk',player:this.player,faces:[...this.selected].map(i=>this.values[i]),gain,points:this.turnPoints});
    for (const index of this.selected) this.locked.add(index);
    this.selected.clear();
    this.hotDice=this.locked.size===6;
    if (this.hotDice) this.locked.clear();
    this.phase='ready';
    return true;
  }

  bank() {
    if (!this.bankable) return false;
    const gain=this.turnPoints+this.selectedScore;
    this.scores[this.player]+=gain;
    if(this.player===0)this.lastPlayerAction={type:'bank',faces:[...this.selected].map(i=>this.values[i]),points:gain,total:this.scores[0]};
    this.journal.push({type:'bank',player:this.player,faces:[...this.selected].map(i=>this.values[i]),points:gain,scores:[...this.scores]});
    this.lastEvent={type:'bank',player:this.player,points:gain};
    if (this.scores[this.player]>=this.target) {
      this.phase='finished'; this.winner=this.player;
    } else {
      this.player=1-this.player;
      this.beginTurn();
    }
    return true;
  }

  finishBust() {
    if (this.phase!=='bust') return false;
    this.player=1-this.player; this.beginTurn();
    return true;
  }
}

/** The opponent only sees its own current roll, scores and remaining dice. */
export function chooseDiceMove(match) {
  if (match.phase!=='choose') return null;
  const move=scoringMoves(match.values,match.available)[0];
  if (!move) return null;
  const points=match.turnPoints+move.score;
  const remaining=match.available.length-move.indices.length || 6;
  const winning=match.scores[match.player]+points>=match.target;
  const shortGame=match.target<=1500;
  const bank=winning || points>=1000 || remaining===1&&points>=150
    || remaining<=3&&points>=(shortGame?350:500);
  return {...move,bank};
}

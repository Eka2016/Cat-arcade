// Two-player throw-in Durak. No network, model, or opponent hand in the AI view.
export const DURAK_SUITS=Object.freeze(['♣','♦','♥','♠']);
const FACES=['6','7','8','9','10','В','Д','К','Т'];
export function durakCard(id){
  if(!Number.isInteger(id)||id<0||id>=36)throw new RangeError('Invalid Durak card');
  const suit=Math.floor(id/9),rank=id%9+6;
  return {id,suit,rank,face:FACES[rank-6],symbol:DURAK_SUITS[suit],red:suit===1||suit===2};
}
export const durakCardText=id=>{const c=durakCard(id);return c.face+c.symbol;};
export function beatsDurakCard(defense,attack,trump){
  const d=durakCard(defense),a=durakCard(attack);
  return d.suit===a.suit?d.rank>a.rank:d.suit===trump&&a.suit!==trump;
}
export function sortDurakHand(hand,trump){
  return [...hand].sort((a,b)=>{const x=durakCard(a),y=durakCard(b);return (x.suit===trump)-(y.suit===trump)||x.suit-y.suit||x.rank-y.rank;});
}
export class DurakGame{
  constructor({random=Math.random}={}){this.random=random;this.reset();}
  reset(){
    const deck=Array.from({length:36},(_,i)=>i);
    for(let i=35;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999999999,this.random()))*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    this.hands=[[],[]];for(let i=0;i<12;i++)this.hands[i%2].push(deck.pop());
    this.stock=deck;this.trumpCard=deck[0];this.trump=durakCard(this.trumpCard).suit;
    const lowest=this.hands.map(h=>Math.min(...h.filter(id=>durakCard(id).suit===this.trump).map(id=>durakCard(id).rank)));
    this.attacker=lowest[0]===lowest[1]?(this.random()<.5?0:1):lowest[0]<lowest[1]?0:1;
    this.discard=[];this.table=[];this.lastBout=null;this.bout=1;this.limit=Math.min(6,this.hands[1-this.attacker].length);
    this.phase='attack';this.result=null;this.lastPlayerAction=null;
    this.journal=[{type:'deal',trumpCard:this.trumpCard,hand:[...this.hands[0]],attacker:this.attacker}];
    return this;
  }
  get defender(){return 1-this.attacker;}
  get turn(){return this.phase==='defend'?this.defender:this.attacker;}
  moves(player=this.turn){
    if(this.result||player!==this.turn)return [];
    const hand=this.hands[player];
    if(this.phase==='defend'){
      const moves=[];
      this.table.forEach((pair,index)=>{if(pair.defense===null)for(const card of hand)if(beatsDurakCard(card,pair.attack,this.trump))moves.push({type:'defend',card,index});});
      return [...moves,{type:'take'}];
    }
    const ranks=new Set(this.table.flatMap(p=>[p.attack,...(p.defense===null?[]:[p.defense])]).map(id=>durakCard(id).rank));
    const moves=this.table.length<this.limit?hand.filter(id=>!this.table.length||ranks.has(durakCard(id).rank)).map(card=>({type:'attack',card})):[];
    if(this.table.length)moves.push({type:'pass'});
    return moves;
  }
  play(action){
    if(!action||!this.moves().some(m=>m.type===action.type&&m.card===action.card&&m.index===action.index))return false;
    const player=this.turn,entry={type:action.type,player,bout:this.bout};
    if(action.type==='attack'||action.type==='defend'){
      entry.card=action.card;this.hands[player].splice(this.hands[player].indexOf(action.card),1);
      if(action.type==='attack'){
        entry.throwIn=!!this.table.length;this.table.push({attack:action.card,defense:null});
        if(this.phase!=='taking')this.phase='defend';
      }else{
        entry.attack=this.table[action.index].attack;this.table[action.index].defense=action.card;this.phase='attack';
      }
    }else if(action.type==='take')this.phase='taking';
    else{
      entry.taking=this.phase==='taking';
      entry.lastCard=[...this.journal].reverse().find(m=>m.player===player&&Number.isInteger(m.card))?.card??null;
    }
    this.journal.push(entry);if(player===0)this.lastPlayerAction=entry;
    if(action.type==='pass')this.endBout();
    return true;
  }
  endBout(){
    // This public boundary must be safe even outside play(): no empty, partial
    // or repeated completion may discard cards, draw again or advance the turn.
    if(this.result||!this.table.length||(this.phase!=='taking'&&(this.phase!=='attack'||this.table.some(p=>p.defense===null))))return false;
    const taking=this.phase==='taking',attacker=this.attacker,defender=this.defender;
    const pairs=this.table.map(p=>({...p})),cards=pairs.flatMap(p=>[p.attack,...(p.defense===null?[]:[p.defense])]);
    if(taking)this.hands[defender].push(...cards);else this.discard.push(...cards);
    this.lastBout={pairs,taking,defender};
    this.journal.push({type:taking?'pickup':'beaten',player:defender,bout:this.bout,cards:[...cards],pairs});
    this.table=[];
    for(const player of [attacker,defender]){
      // New cards are appended after the loop; count the pending draw too.
      const drawn=[];while(this.stock.length&&this.hands[player].length+drawn.length<6)drawn.push(this.stock.pop());
      this.hands[player].push(...drawn);
      if(drawn.length)this.journal.push({type:'draw',player,count:drawn.length,...(player===0?{cards:drawn}:{}),...(drawn.includes(this.trumpCard)?{faceUp:this.trumpCard}:{})});
    }
    if(!this.stock.length&&this.hands.some(h=>!h.length)){
      const winner=this.hands.every(h=>!h.length)?null:this.hands[0].length?1:0;
      this.result={winner,reason:winner===null?'draw':'empty'};this.phase='finished';
      this.journal.push({type:'finish',winner});return true;
    }
    this.attacker=taking?attacker:defender;this.bout++;
    this.limit=Math.min(6,this.hands[this.defender].length);this.phase='attack';
    return true;
  }
  view(player=this.turn){
    // Cards picked up from the public table stay known until visibly played.
    // No private deal or hidden draw is ever included in this knowledge.
    const known=new Set(),other=1-player;
    for(const m of this.journal){
      if(m.player!==other)continue;
      if(m.type==='pickup')for(const id of m.cards)known.add(id);
      else if(m.type==='attack'||m.type==='defend')known.delete(m.card);
      else if(m.type==='draw'&&Number.isInteger(m.faceUp))known.add(m.faceUp);
    }
    return {player,hand:[...this.hands[player]],opponentCount:this.hands[1-player].length,
      stockCount:this.stock.length,trump:this.trump,trumpCard:this.trumpCard,attacker:this.attacker,
      phase:this.phase,table:this.table.map(p=>({...p})),limit:this.limit,moves:this.moves(player).map(m=>({...m})),
      discard:[...this.discard],opponentKnown:[...known]};
  }
}
/** Deliberate legal play, using only one's own hand and public information. */
export function chooseDurakMove(view){
  const moves=view.moves||[],cost=id=>{const c=durakCard(id);return c.rank+(c.suit===view.trump?22:0);};
  const defenses=moves.filter(m=>m.type==='defend').sort((a,b)=>cost(a.card)-cost(b.card));
  if(defenses.length)return defenses[0];
  const attacks=moves.filter(m=>m.type==='attack').sort((a,b)=>cost(a.card)-cost(b.card));
  if(attacks.length){
    const best=attacks[0],c=durakCard(best.card);
    if(view.table.length&&view.stockCount&&view.phase!=='taking'&&c.suit===view.trump&&c.rank>=12)return moves.find(m=>m.type==='pass')||best;
    return best;
  }
  return moves.find(m=>m.type==='pass')||moves.find(m=>m.type==='take')||null;
}

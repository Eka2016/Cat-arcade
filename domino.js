export const DOMINO_SET=Object.freeze(Array.from({length:7},(_,a)=>Array.from({length:7-a},(_,i)=>[a,a+i])).flat());
export const dominoPips=id=>DOMINO_SET[id][0]+DOMINO_SET[id][1];

export class DominoGame {
  constructor({random=Math.random}={}){this.random=random;this.reset();}
  reset(deck){
    const shuffled=deck?[...deck]:DOMINO_SET.map((_,i)=>i);
    if(!deck)for(let i=27;i>0;i--){const j=Math.min(i,Math.floor(this.random()*(i+1)));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    if(shuffled.length!==28||new Set(shuffled).size!==28||shuffled.some(i=>!Number.isInteger(i)||i<0||i>27))throw Error('Invalid domino set');
    this.hands=[shuffled.slice(0,7),shuffled.slice(7,14)];this.stock=shuffled.slice(14);this.chain=[];this.result=null;this.passes=0;this.lastAction=null;this.lastPlayerAction=null;this.journal=[];
    const dealt=this.hands.flat(),doubles=dealt.filter(id=>DOMINO_SET[id][0]===DOMINO_SET[id][1]);
    this.opening=(doubles.length?doubles:dealt).sort((a,b)=>dominoPips(b)-dominoPips(a)||b-a)[0];
    this.turn=this.hands[0].includes(this.opening)?0:1;
  }
  get ends(){return this.chain.length?[this.chain[0].a,this.chain.at(-1).b]:[];}
  moves(player=this.turn){
    if(this.result||player!==this.turn)return [];
    if(!this.chain.length)return [{id:this.opening,side:'right'}];
    const [left,right]=this.ends,moves=[];
    for(const id of this.hands[player]){const [a,b]=DOMINO_SET[id];if(a===left||b===left)moves.push({id,side:'left'});if(a===right||b===right)moves.push({id,side:'right'});}
    return moves;
  }
  play(id,side){
    if(!this.moves().some(m=>m.id===id&&m.side===side))return false;
    const player=this.turn;let [a,b]=DOMINO_SET[id];
    if(this.chain.length){const end=this.ends[side==='left'?0:1];if(side==='left'?b!==end:a!==end)[a,b]=[b,a];}
    const tile={id,a,b};if(side==='left')this.chain.unshift(tile);else this.chain.push(tile);
    this.hands[player].splice(this.hands[player].indexOf(id),1);this.passes=0;this.lastAction={player,type:'play',id,side};
    if(player===0)this.lastPlayerAction={...this.lastAction};
    this.journal.push({...this.lastAction,ends:[...this.ends]});
    if(!this.hands[player].length)this.finish(player,'empty');else this.turn=1-player;return true;
  }
  draw(){
    if(this.result||this.moves().length||!this.stock.length)return false;
    const added=[];while(this.stock.length&&!this.moves().length){const id=this.stock.pop();this.hands[this.turn].push(id);added.push(id);}
    this.lastAction={player:this.turn,type:'draw',count:added.length};if(this.turn===0)this.lastPlayerAction={...this.lastAction};this.journal.push({...this.lastAction,tiles:this.turn===0?[...added]:[]});return true;
  }
  pass(){
    if(this.result||this.moves().length||this.stock.length)return false;
    this.lastAction={player:this.turn,type:'pass'};this.passes++;
    if(this.turn===0)this.lastPlayerAction={...this.lastAction};
    this.journal.push({...this.lastAction});
    if(this.passes===2){const scores=this.hands.map(h=>h.reduce((s,id)=>s+dominoPips(id),0));this.finish(scores[0]===scores[1]?null:scores[0]<scores[1]?0:1,'blocked');}
    else this.turn=1-this.turn;return true;
  }
  finish(winner,reason){this.result={winner,reason,scores:this.hands.map(h=>h.reduce((sum,id)=>sum+dominoPips(id),0))};this.journal.push({type:'finish',...this.result,scores:[...this.result.scores]});}
  /** The bot gets only its own tiles and the visible chain. */
  view(){return {hand:[...this.hands[this.turn]],ends:this.ends,moves:this.moves(),stock:this.stock.length};}
}
export function chooseDominoMove(view){
  return [...view.moves].sort((a,b)=>dominoPips(b.id)-dominoPips(a.id)||(DOMINO_SET[b.id][0]===DOMINO_SET[b.id][1])-(DOMINO_SET[a.id][0]===DOMINO_SET[a.id][1]))[0]||null;
}

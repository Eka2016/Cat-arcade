const POKER_NAMES=['Старшая карта','Пара','Две пары','Тройка','Стрит','Флеш','Фулл-хаус','Каре','Стрит-флеш'];
const CARD_SUITS=['♠','♥','♦','♣'];
const SUIT_NAMES=['пики','черви','бубны','трефы'];
const FACE_NAMES={11:'Валет',12:'Дама',13:'Король',14:'Туз'};

export function pokerCard(id) {
  const rank=id%13+2,suit=Math.floor(id/13);
  return {rank,suit,symbol:CARD_SUITS[suit],red:suit===1||suit===2,
    face:({11:'J',12:'Q',13:'K',14:'A'})[rank]||String(rank),label:`${FACE_NAMES[rank]||rank}, ${SUIT_NAMES[suit]}`};
}

function compareRanks(a,b) {
  for(let i=0;i<Math.max(a.length,b.length);i++)if((a[i]||0)!==(b[i]||0))return Math.sign((a[i]||0)-(b[i]||0));
  return 0;
}

function rankFive(cards) {
  const ranks=cards.map(c=>c%13+2).sort((a,b)=>b-a);
  const counts=new Map();for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
  const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const flush=cards.every(c=>Math.floor(c/13)===Math.floor(cards[0]/13));
  const straight=counts.size===5?(ranks[0]-ranks[4]===4?ranks[0]:ranks.join(',')==='14,5,4,3,2'?5:0):0;
  if(flush&&straight)return [8,straight];
  if(groups[0][1]===4)return [7,groups[0][0],groups[1][0]];
  if(groups[0][1]===3&&groups[1][1]===2)return [6,groups[0][0],groups[1][0]];
  if(flush)return [5,...ranks];
  if(straight)return [4,straight];
  if(groups[0][1]===3)return [3,groups[0][0],...groups.slice(1).map(g=>g[0])];
  if(groups[0][1]===2&&groups[1][1]===2)return [2,groups[0][0],groups[1][0],groups[2][0]];
  if(groups[0][1]===2)return [1,groups[0][0],...groups.slice(1).map(g=>g[0])];
  return [0,...ranks];
}

/** Best five cards, including a board-only hand and ace-low straights. Suits never break ties. */
export function evaluatePokerHand(cards) {
  if(!Array.isArray(cards)||cards.length<5||cards.length>7||new Set(cards).size!==cards.length||cards.some(c=>!Number.isInteger(c)||c<0||c>51))throw new Error('Expected 5–7 distinct cards');
  let best=null,bestCards;
  for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++) {
    const five=[cards[a],cards[b],cards[c],cards[d],cards[e]],rank=rankFive(five);
    if(!best||compareRanks(rank,best)>0){best=rank;bestCards=five;}
  }
  return {category:best[0],rank:best,cards:bestCards,name:best[0]===8&&best[1]===14?'Роял-флеш':POKER_NAMES[best[0]]};
}

export function comparePokerHands(a,b) { return compareRanks(a.rank,b.rank); }

function shuffledPokerDeck(random) {
  const deck=Array.from({length:52},(_,i)=>i);
  for(let i=51;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return deck;
}

/** Heads-up no-limit Hold'em. Chip amounts are integers and are conserved between hands. */
export class PokerMatch {
  constructor({random=Math.random,initialStacks=[1000,1000],smallBlind=10,bigBlind=20}={}) {
    if(initialStacks.length!==2||initialStacks.some(n=>!Number.isSafeInteger(n)||n<=0)||!Number.isSafeInteger(smallBlind)||!Number.isSafeInteger(bigBlind)||smallBlind<=0||bigBlind<smallBlind)throw new Error('Invalid poker stacks or blinds');
    this.random=random;this.initialStacks=[...initialStacks];this.smallBlind=smallBlind;this.bigBlind=bigBlind;
    this.reset();
  }
  reset() {
    this.stacks=[...this.initialStacks];this.phase='idle';this.dealer=1;this.handNumber=0;this.street=0;
    this.hands=[[],[]];this.board=[];this.contributions=[0,0];this.bets=[0,0];this.currentBet=0;
    this.lastFullRaise=this.bigBlind;this.actor=null;this.pending=new Set();this.result=null;this.lastPot=0;this.lastAction=null;this.lastPlayerAction=null;this.journal=[];
  }
  get pot(){return this.contributions[0]+this.contributions[1];}
  get matchWinner(){return this.phase==='finished'?(this.stacks[0]>0?0:1):null;}
  draw(){return this.deck[this.cursor++];}
  commit(player,amount) {
    const paid=Math.min(amount,this.stacks[player]);
    this.stacks[player]-=paid;this.bets[player]+=paid;this.contributions[player]+=paid;
    return paid;
  }
  deal(deck) {
    if(!['idle','result'].includes(this.phase)||this.stacks.some(s=>s<=0))return false;
    const nextDeck=deck?[...deck]:shuffledPokerDeck(this.random);
    if(nextDeck.length!==52||new Set(nextDeck).size!==52||nextDeck.some(c=>!Number.isInteger(c)||c<0||c>51))throw new Error('Invalid deck');
    this.deck=nextDeck;this.cursor=0;this.dealer=1-this.dealer;this.handNumber++;
    this.hands=[[],[]];this.board=[];this.contributions=[0,0];this.bets=[0,0];this.street=0;
    this.result=null;this.lastPot=0;this.lastAction=null;this.lastPlayerAction=null;this.phase='playing';this.lastFullRaise=this.bigBlind;
    for(let i=0;i<2;i++)for(const player of [1-this.dealer,this.dealer])this.hands[player].push(this.draw());
    this.commit(this.dealer,this.smallBlind);this.commit(1-this.dealer,this.bigBlind);
    this.journal.push({type:'deal',hand:this.handNumber,dealer:this.dealer,handCards:[...this.hands[0]],blinds:[...this.bets]});
    this.currentBet=Math.max(...this.bets);this.actor=this.dealer;this.pending=new Set([0,1]);
    this.advance(this.dealer);return true;
  }
  legalActions(player=this.actor) {
    const no={check:false,fold:false,call:0,toCall:0,canRaise:false,minRaiseTo:0,maxRaiseTo:0};
    if(this.phase!=='playing'||player!==this.actor||this.stacks[player]===0)return no;
    const toCall=Math.max(0,this.currentBet-this.bets[player]);
    const max=this.bets[player]+this.stacks[player];
    const canRaise=this.stacks[1-player]>0&&max>this.currentBet;
    return {check:toCall===0,fold:toCall>0,call:Math.min(toCall,this.stacks[player]),toCall,canRaise,
      minRaiseTo:canRaise?Math.min(this.currentBet+this.lastFullRaise,max):0,maxRaiseTo:canRaise?max:0};
  }
  act(player,type,to) {
    if(this.phase!=='playing'||player!==this.actor)return false;
    const legal=this.legalActions(player),opening=this.currentBet===0;let paid=0;
    if(type==='fold') {
      if(!legal.fold)return false;
      this.lastAction={player,type};this.journal.push({...this.lastAction,street:this.street,hand:this.handNumber});if(player===0)this.lastPlayerAction={...this.lastAction,street:this.street};this.settle(1-player,'fold');return true;
    }
    if(type==='check') { if(!legal.check)return false;this.pending.delete(player); }
    else if(type==='call') { if(!legal.call)return false;paid=this.commit(player,legal.call);this.pending.delete(player); }
    else if(type==='raise') {
      if(!legal.canRaise||!Number.isSafeInteger(to)||to<legal.minRaiseTo||to>legal.maxRaiseTo)return false;
      const increase=to-this.currentBet;
      paid=this.commit(player,to-this.bets[player]);
      if(increase>=this.lastFullRaise)this.lastFullRaise=increase;
      this.currentBet=to;this.pending=new Set([1-player]);
    } else return false;
    this.lastAction={player,type,paid,to:this.bets[player],opening};
    if(player===0)this.lastPlayerAction={...this.lastAction,street:this.street,allIn:this.stacks[0]===0};
    this.journal.push({...this.lastAction,street:this.street,hand:this.handNumber,allIn:this.stacks[player]===0});
    this.advance(1-player);return true;
  }
  advance(next) {
    if(this.stacks.some(s=>s===0)) {
      const active=this.stacks.findIndex(s=>s>0);
      if(active>=0&&this.bets[active]<this.currentBet){this.actor=active;this.pending=new Set([active]);return;}
      this.runOut();return;
    }
    if(!this.pending.size){this.nextStreet();return;}
    this.actor=this.pending.has(next)?next:1-next;
  }
  revealStreet() {
    this.draw(); // Burn one card before each board street.
    for(let i=0,n=this.street===0?3:1;i<n;i++)this.board.push(this.draw());
    this.street++;
    this.journal.push({type:'board',hand:this.handNumber,street:this.street,cards:[...this.board]});
  }
  nextStreet() {
    if(this.street===3){this.showdown();return;}
    this.revealStreet();this.bets=[0,0];this.currentBet=0;this.lastFullRaise=this.bigBlind;
    this.actor=1-this.dealer;this.pending=new Set([0,1]);
  }
  runOut() {while(this.board.length<5)this.revealStreet();this.showdown();}
  refundUncalled() {
    const excess=Math.abs(this.contributions[0]-this.contributions[1]);
    if(!excess)return;
    const p=this.contributions[0]>this.contributions[1]?0:1;
    this.contributions[p]-=excess;this.stacks[p]+=excess;this.bets[p]=Math.max(0,this.bets[p]-excess);
    this.journal.push({type:'refund',hand:this.handNumber,player:p,amount:excess});
  }
  showdown() {
    const hands=this.hands.map(hand=>evaluatePokerHand([...hand,...this.board]));
    const comparison=comparePokerHands(hands[0],hands[1]);
    this.settle(comparison===0?null:comparison>0?0:1,'showdown',hands);
  }
  settle(winner,reason,hands=null) {
    this.refundUncalled();
    const pot=this.pot;this.lastPot=pot;
    if(winner===null){const half=Math.floor(pot/2);this.stacks[0]+=half;this.stacks[1]+=half;this.stacks[1-this.dealer]+=pot%2;}
    else this.stacks[winner]+=pot;
    this.contributions=[0,0];this.pending.clear();this.actor=null;
    this.result={winner,reason,hands,pot};this.phase=this.stacks.some(s=>s===0)?'finished':'result';
    this.journal.push({type:'settle',hand:this.handNumber,winner,reason,pot,stacks:[...this.stacks],shownHands:reason==='showdown'?this.hands.map(h=>[...h]):null,combinations:reason==='showdown'?hands.map(h=>h.name):null,matchFinished:this.phase==='finished'});
  }
  /** This is the only information passed to the opponent's decision function. */
  view(player) {
    const reveal=this.result?.reason==='showdown';
    return {phase:this.phase,street:this.street,dealer:this.dealer,handNumber:this.handNumber,player,actor:this.actor,
      stacks:[...this.stacks],bets:[...this.bets],pot:this.pot,hand:[...this.hands[player]],board:[...this.board],
      opponent:reveal?[...this.hands[1-player]]:[],legal:this.legalActions(player),bigBlind:this.bigBlind};
  }
}

/** Small Monte Carlo sample: only the bot's own cards and the exposed board are known. */
export function choosePokerAction(view,random=Math.random) {
  const legal=view.legal;
  if(view.phase!=='playing'||view.actor!==view.player)return null;
  const known=new Set([...view.hand,...view.board]);
  const unknown=Array.from({length:52},(_,i)=>i).filter(c=>!known.has(c));
  let wins=0;const trials=40,needed=2+5-view.board.length;
  for(let n=0;n<trials;n++) {
    const sample=[...unknown];
    for(let i=0;i<needed;i++){const j=i+Math.min(sample.length-i-1,Math.max(0,Math.floor(random()*(sample.length-i))));[sample[i],sample[j]]=[sample[j],sample[i]];}
    const board=[...view.board,...sample.slice(2,needed)];
    const comparison=comparePokerHands(evaluatePokerHand([...view.hand,...board]),evaluatePokerHand([...sample.slice(0,2),...board]));
    wins+=comparison>0?1:comparison===0?.5:0;
  }
  const uncalled=Math.max(0,view.bets[1-view.player]-view.bets[view.player]-legal.call);
  const equity=wins/trials,roll=random(),odds=legal.call/(view.pot-uncalled+legal.call||1);
  if(legal.call&&equity<odds+.06&&roll>.12)return {type:'fold'};
  if(legal.canRaise&&(equity>.67&&roll<.7||legal.check&&roll<.07)) {
    const to=Math.min(legal.maxRaiseTo,Math.max(legal.minRaiseTo,Math.max(...view.bets)+Math.ceil(Math.max(view.bigBlind,view.pot*.6)/10)*10));
    return {type:'raise',to};
  }
  return {type:legal.check?'check':'call'};
}

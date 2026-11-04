import test from 'node:test';
import assert from 'node:assert/strict';
import {PokerMatch,evaluatePokerHand,comparePokerHands,choosePokerAction} from '../poker.js';

const card=s=>'shdc'.indexOf(s.slice(-1))*13+('23456789TJQKA'.indexOf(s.slice(0,-1)));
const cards=s=>s.split(' ').map(card);
function rigged(prefix){const used=cards(prefix);return [...used,...Array.from({length:52},(_,i)=>i).filter(i=>!used.includes(i))];}
function seed(initial=123){let state=initial;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);}
function conserved(game,total){assert.equal(game.stacks[0]+game.stacks[1]+game.pot,total);for(const n of [...game.stacks,...game.bets,...game.contributions])assert.ok(Number.isInteger(n)&&n>=0);}

test('All poker categories compare correctly and the best five are chosen from seven',()=>{
  const examples=[
    'As Kd 9h 7c 4d 3h 2c',
    'As Ad Kh 9c 7d 4h 2c',
    'As Ad Kh Kc 7d 4h 2c',
    'As Ad Ah Kc 7d 4h 2c',
    'As 2d 3h 4c 5d 9h Kc',
    'As Js 9s 7s 4s Kh Qd',
    'As Ad Ah Kc Kd Kh 2c',
    'As Ad Ah Ac Kd 4h 2c',
    '9s 8s 7s 6s 5s Kh Qd',
  ].map(s=>evaluatePokerHand(cards(s)));
  for(let i=0;i<examples.length;i++){
    assert.equal(examples[i].category,i);
    assert.equal(examples[i].cards.length,5);
    if(i)assert.equal(comparePokerHands(examples[i],examples[i-1]),1);
  }
  assert.equal(examples[4].rank[1],5,'Ace-low straight ends at five');
  assert.equal(evaluatePokerHand(cards('As Ks Qs Js Ts 2c 3d')).name,'Роял-флеш');
  assert.equal(evaluatePokerHand(cards('As Kd Qh 3c 2d')).category,0,'A straight cannot wrap through the ace');
  assert.deepEqual(examples[6].rank,[6,14,13],'Two trips use the higher trip as the full house');
});

test('Kickers use all five cards; equal hands split without suit tiebreaks',()=>{
  const high=evaluatePokerHand(cards('As Ah Kd Qc 9h'));
  const low=evaluatePokerHand(cards('Ac Ad Kh Qd 8s'));
  assert.equal(comparePokerHands(high,low),1);
  assert.equal(comparePokerHands(evaluatePokerHand(cards('As Js 9s 7s 4s')),evaluatePokerHand(cards('Ah Jh 9h 7h 3h'))),1);
  assert.equal(comparePokerHands(high,evaluatePokerHand(cards('Ac Ad Ks Qd 9s'))),0);
  const board=cards('As Ks Qs Js Ts');
  assert.equal(comparePokerHands(evaluatePokerHand([...cards('2h 3d'),...board]),evaluatePokerHand([...cards('9h 9d'),...board])),0);
  assert.throws(()=>evaluatePokerHand([0,0,1,2,3]));
});

test('Heads-up blinds, button, big-blind option and postflop action order',()=>{
  const game=new PokerMatch({random:seed()});assert.equal(game.deal(),true);
  assert.equal(game.dealer,0);assert.equal(game.actor,0);assert.deepEqual(game.bets,[10,20]);assert.equal(game.pot,30);
  assert.equal(game.act(1,'check'),false,'Out-of-turn moves are rejected');
  assert.equal(game.act(0,'call'),true);assert.equal(game.actor,1);assert.equal(game.street,0);
  assert.equal(game.legalActions().check,true,'Big blind still gets its option');
  assert.equal(game.act(1,'check'),true);assert.equal(game.street,1);assert.equal(game.board.length,3);assert.equal(game.actor,1);
  for(const street of [1,2,3]){
    assert.equal(game.street,street);game.act(1,'check');game.act(0,'check');
  }
  assert.equal(game.phase,'result');assert.equal(game.board.length,5);
  assert.equal(new Set([...game.hands.flat(),...game.board]).size,9);
  conserved(game,2000);game.deal();assert.equal(game.dealer,1);assert.equal(game.actor,1);
});

test('Full raises set the next minimum by the increment and illegal sizes do not move chips',()=>{
  const game=new PokerMatch({random:seed()});game.deal();
  assert.equal(game.legalActions().minRaiseTo,40);
  assert.equal(game.act(0,'raise',60),true);
  assert.equal(game.legalActions().minRaiseTo,100);
  const before=JSON.stringify([game.stacks,game.bets,game.pot,game.actor]);
  for(const to of [99,100.5,Infinity,-10,1001])assert.equal(game.act(1,'raise',to),false);
  assert.equal(JSON.stringify([game.stacks,game.bets,game.pot,game.actor]),before);
  assert.equal(game.act(1,'raise',100),true);assert.equal(game.legalActions().minRaiseTo,140);conserved(game,2000);
});

test('A short all-in is legal, cannot be raised again and runs out the remaining board after a call',()=>{
  const game=new PokerMatch({random:seed(),initialStacks:[1000,70]});game.deal();
  game.act(0,'raise',60);assert.equal(game.legalActions().minRaiseTo,70);
  assert.equal(game.act(1,'raise',70),true);assert.equal(game.stacks[1],0);
  assert.equal(game.legalActions().canRaise,false);assert.equal(game.legalActions().call,10);
  assert.equal(game.act(0,'raise',100),false);game.act(0,'call');
  assert.equal(game.board.length,5);assert.equal(game.lastPot,140);assert.notEqual(game.phase,'playing');conserved(game,1070);
});

test('Uncalled all-in chips return to the larger stack and partial blinds settle correctly',()=>{
  const game=new PokerMatch({random:seed(),initialStacks:[1000,60]});game.deal();
  game.act(0,'raise',1000);assert.equal(game.legalActions().call,40);game.act(1,'call');
  assert.equal(game.lastPot,120);assert.ok(game.stacks[0]>=940);conserved(game,1060);
  const shortBlind=new PokerMatch({random:seed(),initialStacks:[5,1000]});shortBlind.deal();
  assert.notEqual(shortBlind.phase,'playing');assert.equal(shortBlind.board.length,5);assert.equal(shortBlind.lastPot,10);conserved(shortBlind,1005);
});

test('A fold awards the pot once, keeps concealed cards hidden and returns the uncalled blind',()=>{
  const game=new PokerMatch({random:seed()});game.deal();game.act(0,'fold');
  assert.equal(game.result.winner,1);assert.equal(game.result.reason,'fold');assert.equal(game.lastPot,20);
  assert.deepEqual(game.stacks,[990,1010]);assert.equal(game.act(0,'fold'),false);
  assert.deepEqual(game.view(0).opponent,[]);conserved(game,2000);
});

test('A shared royal flush splits an all-in pot and does not end the match',()=>{
  const game=new PokerMatch();game.deal(rigged('2c 4d 3c 5d 6h Ts Js Qs 7h Ks 8h As'));
  game.act(0,'raise',1000);game.act(1,'call');
  assert.equal(game.result.winner,null);assert.equal(game.phase,'result');assert.deepEqual(game.stacks,[1000,1000]);
  assert.equal(game.lastPot,2000);assert.equal(game.view(0).opponent.length,2);conserved(game,2000);
});

test('Winning all chips ends the match and reset restores a fresh game',()=>{
  const game=new PokerMatch();game.deal(rigged('Kc As Kd Ac 2h 3c 5d 7h 4c 9s 6d Js'));
  game.act(0,'raise',1000);game.act(1,'call');
  assert.equal(game.phase,'finished');assert.equal(game.matchWinner,0);assert.deepEqual(game.stacks,[2000,0]);assert.equal(game.deal(),false);
  game.reset();assert.equal(game.phase,'idle');assert.deepEqual(game.stacks,[1000,1000]);assert.equal(game.deal(),true);
});

test('The opponent decision sees its own cards and public information only',()=>{
  const game=new PokerMatch({random:seed()});game.deal();game.act(0,'call');
  const view=game.view(1),move=choosePokerAction(view,seed(75));
  assert.equal(Object.hasOwn(view,'hands'),false);assert.equal(Object.hasOwn(view,'deck'),false);assert.deepEqual(view.opponent,[]);
  game.hands[0]=[50,51];game.deck.reverse();
  assert.deepEqual(game.view(1),view);assert.deepEqual(choosePokerAction(game.view(1),seed(75)),move);
  assert.equal(game.act(1,move.type,move.to),true);
});

test('Seeded varied hands always terminate with unique cards and conserve every chip',()=>{
  const random=seed(8871),game=new PokerMatch({random});let finishedHands=0;
  for(let n=0;n<250;n++){
    if(game.phase==='finished')game.reset();
    assert.equal(game.deal(),true);let actions=0;
    while(game.phase==='playing'){
      assert.ok(++actions<150,'Betting loop must terminate');
      const p=game.actor,legal=game.legalActions(),roll=random();let type,to;
      if(legal.canRaise&&roll<.23){type='raise';to=Math.min(legal.maxRaiseTo,legal.minRaiseTo+Math.floor(random()*5)*20);}
      else if(legal.fold&&roll<.35)type='fold';else type=legal.check?'check':'call';
      assert.equal(game.act(p,type,to),true);conserved(game,2000);
    }
    assert.equal(new Set([...game.hands.flat(),...game.board]).size,game.board.length+4);finishedHands++;
  }
  assert.equal(finishedHands,250);
});

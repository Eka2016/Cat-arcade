import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {once} from 'node:events';
import {createChessOpponent} from '../chess-opponent.js';
import {ChessGame,chessIndex} from '../chess-game.js';
const position=()=>{const game=new ChessGame();game.play({from:chessIndex('e2'),to:chessIndex('e4')});return game;};
function fixture(){
 const workers=[];
 class Worker{constructor(url,options){this.url=url;this.options=options;this.messages=[];this.terminated=false;workers.push(this);}postMessage(data){this.messages.push(data);}terminate(){this.terminated=true;}}
 const opponent=createChessOpponent({Worker});return {workers,opponent};
}
test('Chess requests carry only the board, repetition counts and difficulty, and keep the live game untouched',async()=>{
 const f=fixture(),game=position(),before=game.engine.fen(),journal=structuredClone(game.journal);try{
  const promise=f.opponent.choose(game,'hard'),w=f.workers[0],request=w.messages[0];assert.equal(w.options.type,'module');assert.match(String(w.url),/chess-worker\.js/);assert.deepEqual(Object.keys(request).sort(),['counts','difficulty','fen','id']);assert.equal(request.fen,before);assert.deepEqual(request.counts,[...game.engine._positionCount]);assert.equal(request.difficulty,'hard');
  const legal=game.moves()[0];w.onmessage({data:{id:request.id,move:{from:legal.from,to:legal.to,promotion:legal.promotion}}});assert.equal((await promise).from,legal.from);assert.equal(game.engine.fen(),before);assert.deepEqual(game.journal,journal);
  const next=f.opponent.choose(game,'easy');assert.equal(f.workers.length,1,'Idle worker is reused');w.onmessage({data:{id:w.messages[1].id,move:null}});assert.equal(await next,null);
 }finally{f.opponent.destroy();}
});
test('Cancelling a hidden or reset game terminates the old worker and ignores its late result or error',async()=>{
 const f=fixture(),game=position();try{
  const first=f.opponent.choose(game,'hard'),old=f.workers[0];f.opponent.cancel();await assert.rejects(first,{name:'AbortError'});assert.equal(old.terminated,true);
  const next=f.opponent.choose(game,'normal'),current=f.workers[1];old.onmessage({data:{id:old.messages[0].id,move:null}});old.onerror({preventDefault(){}});assert.equal(current.terminated,false);const move=game.moves()[0];current.onmessage({data:{id:current.messages[0].id,move}});assert.equal((await next).to,move.to);
  const third=f.opponent.choose(game,'normal');f.opponent.destroy();await assert.rejects(third,{name:'AbortError'});assert.equal(current.terminated,true);
 }finally{f.opponent.destroy();}
});
test('Unavailable or failed workers use a cancellable local fallback without leaking errors or leaving the board stuck',async()=>{
 const game=position();let calls=0;const fallback=()=>{calls++;return game.moves()[0];};
 const none=createChessOpponent({Worker:null,fallback});try{const cancelled=none.choose(game,'normal');none.cancel();await assert.rejects(cancelled,{name:'AbortError'});assert.equal(calls,0);assert.ok(await none.choose(game,'hard'));assert.equal(calls,1);}finally{none.destroy();}
 const workers=[];class Broken{constructor(){workers.push(this);}postMessage(){}terminate(){this.terminated=true;}}
 const broken=createChessOpponent({Worker:Broken,fallback});try{const pending=broken.choose(game,'easy');workers[0].onerror({preventDefault(){}});assert.ok(await pending);assert.equal(workers[0].terminated,true);assert.ok(await broken.choose(game,'normal'));assert.equal(workers.length,1);}finally{broken.destroy();}
});
test('The actual isolated worker chooses a legal move and preserves repetition-draw recognition',async()=>{
 const source=new URL('../chess-worker.js',import.meta.url).href;
 const worker=new NodeWorker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:value=>parentPort.postMessage(value)};import(${JSON.stringify(source)}).then(()=>{parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({ready:true});});`,{eval:true});
 try{
  assert.equal((await once(worker,'message'))[0].ready,true);const game=position(),before=game.engine.fen();worker.postMessage({id:1,fen:before,counts:[...game.engine._positionCount],difficulty:'hard'});const result=(await once(worker,'message'))[0];assert.equal(result.error,undefined);assert.ok(game.moves().some(move=>move.from===result.move.from&&move.to===result.move.to&&move.promotion===result.move.promotion));assert.equal(game.engine.fen(),before);
  const drawn=new ChessGame();for(let repeat=0;repeat<2;repeat++)for(const [from,to] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']])drawn.play({from:chessIndex(from),to:chessIndex(to)});assert.equal(drawn.status().winner,null);worker.postMessage({id:2,fen:drawn.engine.fen(),counts:[...drawn.engine._positionCount],difficulty:'hard'});assert.deepEqual((await once(worker,'message'))[0],{id:2,move:null});
 }finally{await worker.terminate();}
});

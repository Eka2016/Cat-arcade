import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {once} from 'node:events';
import {createCheckersOpponent} from '../checkers-opponent.js';
import {CheckersGame} from '../checkers.js';

function position(){const game=new CheckersGame({mandatoryCapture:false});game.play(game.moves()[0]);return game;}
function fixture(options={}){
 const workers=[];
 class Worker{constructor(url,options){this.url=url;this.options=options;this.messages=[];this.terminated=false;workers.push(this);}postMessage(data){this.messages.push(data);}terminate(){this.terminated=true;}}
 const opponent=createCheckersOpponent({Worker,...options});return {workers,opponent};
}

test('Checkers workers receive only an immutable game snapshot and return a canonical legal move',async()=>{
 const f=fixture(),game=position(),before=structuredClone(game);try{
  const job=f.opponent.choose(game,'hard'),worker=f.workers[0],request=worker.messages[0];
  assert.equal(worker.options.type,'module');assert.match(String(worker.url),/checkers-worker\.js/);
  assert.deepEqual(Object.keys(request).sort(),['board','difficulty','history','id','mandatoryCapture','quietKings','turn']);
  assert.deepEqual(request.board,game.board);assert.notEqual(request.board,game.board);assert.deepEqual(request.history,[...game.history]);assert.equal(request.mandatoryCapture,false);assert.equal(request.difficulty,'hard');
  const legal=game.moves()[0];worker.onmessage({data:{id:request.id,move:{from:legal.from,path:legal.path,piece:99,captures:[99]}}});
  assert.deepEqual(await job,legal);assert.deepEqual(structuredClone(game),before);
  const next=f.opponent.choose(game,'easy');assert.equal(f.workers.length,1);const nextRequest=worker.messages[1];worker.onmessage({data:{id:nextRequest.id,move:{from:legal.from,path:legal.path}}});assert.deepEqual(await next,legal);
 }finally{f.opponent.destroy();}
});

test('Pausing, resetting or closing checkers cancels the worker and ignores late replies',async()=>{
 const f=fixture(),game=position();try{
  const first=f.opponent.choose(game,'hard'),old=f.workers[0];f.opponent.cancel();await assert.rejects(first,{name:'AbortError'});assert.equal(old.terminated,true);
  const second=f.opponent.choose(game,'normal'),current=f.workers[1];old.onmessage({data:{id:old.messages[0].id,move:null}});old.onerror({preventDefault(){}});assert.equal(current.terminated,false);
  const legal=game.moves()[0];current.onmessage({data:{id:current.messages[0].id,move:{from:legal.from,path:legal.path}}});assert.deepEqual(await second,legal);
  const third=f.opponent.choose(game,'hard');f.opponent.destroy();await assert.rejects(third,{name:'AbortError'});assert.equal(current.terminated,true);
 }finally{f.opponent.destroy();}
});

test('Missing, broken or malformed checkers workers have a cancellable local fallback',async()=>{
 const game=position();let calls=0;const fallback=()=>{calls++;return game.moves()[0];};
 const none=createCheckersOpponent({Worker:null,fallback});try{const pending=none.choose(game,'normal');none.cancel();await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,0);assert.ok(await none.choose(game,'hard'));assert.equal(calls,1);}finally{none.destroy();}
 for(const failure of ['error','wrong-path','unexpected-null']){
  const f=fixture({fallback});try{const pending=f.opponent.choose(game,'normal'),worker=f.workers[0];if(failure==='error')worker.onerror({preventDefault(){}});else worker.onmessage({data:{id:worker.messages[0].id,move:failure==='unexpected-null'?null:{from:63,path:[-1]}}});assert.deepEqual(await pending,game.moves()[0]);assert.equal(worker.terminated,true);}finally{f.opponent.destroy();}
 }
});

test('The real checkers worker keeps all difficulties, optional captures, and both draw counters',async()=>{
 const source=new URL('../checkers-worker.js',import.meta.url).href;
 const worker=new NodeWorker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:value=>parentPort.postMessage(value)};import(${JSON.stringify(source)}).then(()=>{parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({ready:true});});`,{eval:true});
 try{
  assert.equal((await once(worker,'message'))[0].ready,true);let id=0;
  async function choose(game,difficulty){worker.postMessage({id:++id,board:game.board,turn:game.turn,quietKings:game.quietKings,history:[...game.history],mandatoryCapture:game.mandatoryCapture,difficulty});return (await once(worker,'message'))[0];}
  const game=position(),before=game.key();for(const level of ['easy','normal','hard']){const result=await choose(game,level);assert.equal(result.error,undefined);assert.ok(game.moves().some(m=>m.from===result.move.from&&m.path.join(',')===result.move.path.join(',')));assert.equal(game.key(),before);}
  const capture=new CheckersGame({mandatoryCapture:false});capture.board=Array(64).fill(0);capture.board[42]=1;capture.board[35]=-1;capture.board[46]=1;capture.turn=0;capture.history=new Map([[capture.key(),1]]);assert.ok(capture.moves().some(m=>m.captures.length===0));assert.ok(capture.moves().some(m=>m.captures.length));const result=await choose(capture,'hard');assert.ok(capture.moves().some(m=>m.from===result.move.from&&m.path.join(',')===result.move.path.join(',')));
  game.history.set(game.key(),3);assert.deepEqual(await choose(game,'hard'),{id,move:null});game.history.set(game.key(),1);game.quietKings=30;assert.deepEqual(await choose(game,'hard'),{id,move:null});
 }finally{await worker.terminate();}
});

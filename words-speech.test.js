import test from 'node:test';
import assert from 'node:assert/strict';
import {createWordSpeech,wordSpeechError} from '../words-speech.js';
import {getCheckersReaction} from '../checkers-reactions.js';

const local=(lang='en-US',extra={})=>({name:lang,lang,localService:true,...extra});
function fixture(voices=[local()]){
  const listeners=new Set(),utterances=[],errors=[];let cancels=0,changes=0;
  const synth={speaking:false,pending:false,paused:false,getVoices:()=>voices,addEventListener(type,fn){if(type==='voiceschanged')listeners.add(fn);},removeEventListener(type,fn){listeners.delete(fn);},speak(utterance){utterances.push(utterance);},cancel(){cancels++;this.speaking=false;this.pending=false;}};
  const speech=createWordSpeech({window:{speechSynthesis:synth,SpeechSynthesisUtterance:class {constructor(text){this.text=text;}}},onChange(){changes++;},onError(code){errors.push(code);}});
  return {speech,synth,utterances,errors,listeners,setVoices(next){voices=next;for(const fn of listeners)fn();},start(){synth.speaking=true;utterances.at(-1).onstart?.();},end(){synth.speaking=false;utterances.at(-1).onend?.();},get cancels(){return cancels;},get changes(){return changes;}};
}
test('English speech selects only a local English voice and never starts automatically',()=>{
 const f=fixture([{...local(),localService:false,default:true},local('ru-RU',{default:true}),local('en-GB'),local('en-US')]);
 assert.equal(f.utterances.length,0);f.setVoices([...f.synth.getVoices()]);assert.equal(f.utterances.length,0);assert.equal(f.speech.speak('A quiet evening.'),true);
 const u=f.utterances[0];assert.equal(u.text,'A quiet evening.');assert.equal(u.lang,'en-US');assert.equal(u.voice.localService,true);assert.equal(u.rate,.9);f.start();assert.equal(f.speech.speaking,true);f.end();assert.equal(f.speech.speaking,false);assert.equal(f.speech.speak('A quiet evening.'),true);assert.equal(f.utterances.length,2);f.speech.destroy();
});
test('An unavailable or remote-only voice does not send speech; late local voices still require a new tap',()=>{
 const f=fixture([]);assert.equal(f.speech.speak('lantern'),false);assert.deepEqual(f.errors,['voice']);f.setVoices([{...local(),localService:false}]);assert.equal(f.speech.speak('lantern'),false);assert.equal(f.utterances.length,0);assert.equal(f.cancels,0);
 f.setVoices([local('en-GB')]);assert.equal(f.utterances.length,0);assert.equal(f.speech.speak('lantern'),true);assert.equal(f.utterances[0].lang,'en-GB');f.speech.destroy();assert.equal(f.listeners.size,0);
 const errors=[],unsupported=createWordSpeech({window:{},onError:c=>errors.push(c)});assert.equal(unsupported.supported,false);unsupported.speak('word');assert.deepEqual(errors,['unsupported']);unsupported.destroy();
});
test('English speech respects another component’s active, pending or paused speech',()=>{
 for(const flag of ['speaking','pending','paused']){const f=fixture();f.synth[flag]=true;assert.equal(f.speech.speak('harbor'),false);assert.deepEqual(f.errors,['busy']);f.speech.stop();f.speech.destroy();assert.equal(f.cancels,0);assert.equal(f.utterances.length,0);}
 const f=fixture();f.speech.speak('harbor');f.start();f.synth.pending=true;f.speech.stop();assert.equal(f.cancels,0,'Do not remove another component’s queued utterances');assert.equal(f.speech.speaking,false);f.speech.destroy();assert.equal(f.cancels,0);
});
test('Owned pronunciation stops once on a second tap or navigation and ignores stale events',()=>{
 const f=fixture();f.speech.speak('lantern');f.start();const u=f.utterances[0],oldError=u.onerror;assert.equal(f.speech.speak('lantern'),false);assert.equal(f.cancels,1);assert.equal(f.utterances.length,1);assert.equal(f.speech.speaking,false);oldError({error:'private provider failure'});assert.deepEqual(f.errors,[]);
 f.speech.speak('harbor');f.start();f.speech.stop({notify:false});assert.equal(f.cancels,2);f.speech.stop();assert.equal(f.cancels,2);f.speech.destroy();assert.equal(f.speech.speak('again'),false);assert.equal(f.listeners.size,0);
});
test('Browser failures have a short generic message and do not expose internal errors',()=>{
 const f=fixture();f.synth.speak=()=>{throw Error('PRIVATE_DEVICE_DETAIL');};assert.equal(f.speech.speak('word'),false);assert.deepEqual(f.errors,['failed']);assert.equal(wordSpeechError('failed').includes('PRIVATE'),false);assert.equal(f.speech.speaking,false);f.speech.destroy();
});
test('Checkers expressions follow the real side to move and the opponent’s outcome',()=>{
 const game={turn:0,status:()=>null};assert.equal(getCheckersReaction(game).mood,'neutral');game.turn=1;assert.equal(getCheckersReaction(game).mood,'thinking');assert.equal(getCheckersReaction(game,{winner:1}).mood,'win');assert.equal(getCheckersReaction(game,{winner:0}).mood,'lose');assert.equal(getCheckersReaction(game,{winner:null}).mood,'neutral');
});

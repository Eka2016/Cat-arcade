import test from 'node:test';
import assert from 'node:assert/strict';
import {copyArcadeText} from '../clipboard.js';
import {arcadeChatMessage,sanitizeChatSender} from '../chat-message.js';

test('Clipboard writes exactly the requested game text without reading the clipboard',async()=>{
  const writes=[],clipboard={writeText:async text=>writes.push(text)};Object.defineProperty(clipboard,'readText',{get(){throw Error('No clipboard reads');}});
  await copyArcadeText('1. Конь g5–f7.\n2. Мат.',{navigator:{clipboard}});assert.deepEqual(writes,['1. Конь g5–f7.\n2. Мат.']);
  await assert.rejects(copyArcadeText('',{navigator:{clipboard}}));assert.equal(writes.length,1);
});

test('Local HTTP clipboard fallback copies only its temporary textarea and always restores focus',async()=>{
  for(const succeed of [true,false]){
    let area,selected=false,removed=false,restored=false,command;
    const active={isConnected:true,focus(){restored=true;}},parent={append(a){area=a;},getRootNode:()=>({activeElement:active})};
    const document={createElement(tag){assert.equal(tag,'textarea');return {style:{},setAttribute(){},focus(){},select(){selected=true;},setSelectionRange(a,b){assert.deepEqual([a,b],[0,13]);},remove(){removed=true;}};},execCommand(name){command=name;assert.equal(area.value,'Полный журнал');assert.equal(selected,true);return succeed;}};
    const action=copyArcadeText('Полный журнал',{document,container:parent,navigator:{clipboard:{writeText:async()=>{throw Error('Unavailable');}}}});
    if(succeed)await action;else await assert.rejects(action);
    assert.equal(command,'copy');assert.equal(removed,true);assert.equal(restored,true);
  }
});

test('An invalid sender safely falls back to narrator and can never create a system message',()=>{
  for(const value of ['system','developer','__proto__',null,{}]){
    assert.equal(sanitizeChatSender(value),'narrator');const message=arcadeChatMessage({},{text:'Итог',sender:value,narratorName:'Игровая партия',extra:{}});assert.equal(message.is_system,false);assert.equal(message.is_user,false);assert.equal(message.extra.type,'narrator');
  }
});

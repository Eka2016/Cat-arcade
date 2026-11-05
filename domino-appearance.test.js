import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSettings} from '../arcade.js';
import {DOMINO_PIECE_STYLES,sanitizeDominoPieceStyle} from '../domino-appearance.js';

test('Older settings retain dark domino pieces; only the explicit green skin is accepted',()=>{
 assert.deepEqual(DOMINO_PIECE_STYLES,{dark:'Тёмный',green:'Зелёный'});
 for(const value of [undefined,null,0,true,{},[],'dark','wood','forest','constructor','__proto__']){
  assert.equal(sanitizeDominoPieceStyle(value),'dark');assert.equal(sanitizeSettings({dominoPieceStyle:value}).dominoPieceStyle,'dark');
 }
 assert.equal(sanitizeSettings({dominoPieceStyle:'green'}).dominoPieceStyle,'green');
});

test('Domino appearance and character visibility persist independently of DND and other preferences',()=>{
 for(const style of Object.keys(DOMINO_PIECE_STYLES))for(const shown of [false,true]){
  const before=sanitizeSettings({dominoPieceStyle:style,characters:{domino:shown,poker:false},dndDieStyle:'wood',records:{normal:23},gameSender:'user'});
  const after=sanitizeSettings(JSON.parse(JSON.stringify(before)));
  assert.deepEqual(after,before);assert.equal(after.dominoPieceStyle,style);assert.equal(after.characters.domino,shown);assert.equal(after.characters.poker,false);
  assert.equal(after.dndDieStyle,'wood');assert.equal(after.records.normal,23);assert.equal(after.gameSender,'user');assert.equal(after.wordLibrary.cards.length,48);
 }
});

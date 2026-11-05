import test from 'node:test';
import assert from 'node:assert/strict';
import {DURAK_TABLE_STYLES,sanitizeDurakTableStyle} from '../durak-appearance.js';
import {sanitizeSettings} from '../arcade.js';

test('Old settings retain the wooden Durak table and reject unsupported style values',()=>{
 assert.equal(sanitizeSettings({}).durakTableStyle,'wood');
 assert.deepEqual(Object.values(DURAK_TABLE_STYLES),['Дерево','Зелёный']);
 for(const value of [undefined,null,'constructor','__proto__','forest',1,{},['green']])assert.equal(sanitizeDurakTableStyle(value),'wood');
});
test('Both Durak table choices survive a settings round trip alongside difficulty and independent skins',()=>{
 for(const durakTableStyle of ['wood','green']){
  const saved=sanitizeSettings({durakTableStyle,durakDifficulty:'hard',dominoPieceStyle:'green',dndDieStyle:'wood',gameSender:'user',characters:{durak:false,domino:false},gameStats:{durak:{wins:4,losses:2,draws:1}}});
  const restored=sanitizeSettings(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.durakTableStyle,durakTableStyle);assert.equal(restored.durakDifficulty,'hard');assert.equal(restored.dominoPieceStyle,'green');assert.equal(restored.dndDieStyle,saved.dndDieStyle);
  assert.equal(restored.characters.durak,false);assert.equal(restored.characters.domino,false);assert.deepEqual(restored.gameStats.durak,saved.gameStats.durak);assert.equal(restored.wordLibrary.cards.length,48);
 }
});

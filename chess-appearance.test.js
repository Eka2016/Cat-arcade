import test from 'node:test';
import assert from 'node:assert/strict';
import {CHESS_BOARD_STYLES,sanitizeChessBoardStyle} from '../chess-appearance.js';
import {sanitizeSettings} from '../arcade.js';

test('Chess defaults to requested dark wood and accepts only its two supported designs',()=>{
 assert.deepEqual(Object.values(CHESS_BOARD_STYLES),['Тёмное дерево','Фэнтези']);
 assert.equal(sanitizeSettings({}).chessBoardStyle,'wood');
 for(const value of [null,undefined,{},['fantasy'],1,'constructor','__proto__','green'])assert.equal(sanitizeChessBoardStyle(value),'wood');
});
test('Chess designs persist independently of all difficulties, character choices, other skins and records',()=>{
 for(const chessBoardStyle of ['wood','fantasy']){
  const saved=sanitizeSettings({chessBoardStyle,chessDifficulty:'hard',checkersDifficulty:'easy',durakDifficulty:'normal',durakTableStyle:'green',dominoPieceStyle:'green',characters:{chess:false,checkers:false},gameStats:{chess:{wins:3,losses:2,draws:1}}});
  const restored=sanitizeSettings(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.chessBoardStyle,chessBoardStyle);assert.equal(restored.chessDifficulty,'hard');assert.equal(restored.checkersDifficulty,'easy');assert.equal(restored.durakTableStyle,'green');assert.equal(restored.dominoPieceStyle,'green');assert.equal(restored.characters.chess,false);assert.equal(restored.characters.checkers,false);assert.deepEqual(restored.gameStats.chess,saved.gameStats.chess);assert.equal(restored.wordLibrary.cards.length,48);
 }
});

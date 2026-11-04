import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSettings} from '../arcade.js';

test('Existing installations keep existing characters and gain Durak; explicit choices stay independent',()=>{
 const all={dice:true,poker:true,chess:true,checkers:true,words:true,domino:true,durak:true};
 assert.deepEqual(sanitizeSettings({}).characters,all);
 for(const kind of Object.keys(all))assert.deepEqual(sanitizeSettings({characters:{[kind]:false}}).characters,{...all,[kind]:false});
 assert.deepEqual(sanitizeSettings({characters:{dice:false,poker:false,chess:false,checkers:false,words:false}}).characters,{dice:false,poker:false,chess:false,checkers:false,words:false,domino:true,durak:true});
 assert.deepEqual(sanitizeSettings({characters:{...all,domino:false}}).characters,{...all,domino:false});
 for(const raw of [null,[],true,'off',{dice:'false',poker:0,chess:null,checkers:undefined,words:{}}])assert.deepEqual(sanitizeSettings({characters:raw}).characters,all);
});

test('Character choices survive serialization without losing records, collections or other preferences',()=>{
 const before=sanitizeSettings({characters:{dice:false,words:false,unknown:false},records:{normal:19},wordProgress:{cat:{correct:3,wrong:1,streak:2}},chessDifficulty:'hard',gameSender:'user'});
 const restored=sanitizeSettings(JSON.parse(JSON.stringify(before)));
 assert.deepEqual(restored,before);assert.deepEqual(Object.keys(restored.characters),['dice','poker','chess','checkers','words','domino','durak']);
 assert.equal(restored.records.normal,19);assert.equal(restored.chessDifficulty,'hard');assert.equal(restored.wordLibrary.cards.length,48);assert.deepEqual(restored.wordProgress.cat,{correct:3,wrong:1,streak:2});
});

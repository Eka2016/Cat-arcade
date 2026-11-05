import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSettings} from '../arcade.js';
import {DND_DIE_STYLES,sanitizeDndDieStyle,dndNumeralLayout,DND_NUMERAL_ATLAS,DND_SYMBOL_ATLAS,DND_WOOD_NUMERAL_ATLAS,DND_WOOD_SYMBOL_ATLAS} from '../dnd-numerals.js';

test('Existing settings use the forest die; an explicit wooden choice survives serialization',()=>{
  assert.deepEqual(DND_DIE_STYLES,{forest:'Лесной',wood:'Деревянный'});
  for(const value of [undefined,null,0,true,{},[], 'forest','constructor','__proto__','wooden']){
    assert.equal(sanitizeDndDieStyle(value),'forest');assert.equal(sanitizeSettings({dndDieStyle:value}).dndDieStyle,'forest');
  }
  const saved=sanitizeSettings({dndDieStyle:'wood',records:{normal:17},gameSender:'user',characters:{poker:false}});
  const restored=sanitizeSettings(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored,saved);assert.equal(restored.dndDieStyle,'wood');assert.equal(restored.records.normal,17);assert.equal(restored.gameSender,'user');assert.equal(restored.characters.poker,false);
});

for(const [theme,numerals,symbols,center] of [['forest',DND_NUMERAL_ATLAS,DND_SYMBOL_ATLAS,{x:80,y:77.5}],['wood',DND_WOOD_NUMERAL_ATLAS,DND_WOOD_SYMBOL_ATLAS,{x:79,y:77}]]){
  test(`${theme}: every 1–20 result and status glyph fits its atlas and stays centered on the face`,()=>{
    for(const value of [...Array.from({length:20},(_,i)=>String(i+1)),'?','…','·']){
      const layout=dndNumeralLayout(value,{numerals,symbols,center});assert.ok(layout?.length);assert.equal(layout.map(d=>d.digit).join(''),value);
      const left=Math.min(...layout.map(d=>d.ink.x)),right=Math.max(...layout.map(d=>d.ink.x+d.ink.width));assert.ok(Math.abs((left+right)/2-center.x)<1e-9,value);
      for(const glyph of layout){
        assert.ok(Math.abs(glyph.ink.y+glyph.ink.height/2-center.y)<1e-9,value);
        const atlas=glyph.atlas==='symbols'?symbols:numerals,[x,y,w,h]=glyph.viewBox;
        assert.ok(x>=0&&y>=0&&x+w<=atlas.width&&y+h<=atlas.height,value+' crop');assert.ok(glyph.width>0&&glyph.height>0);
      }
    }
  });
}

test('A die face accepts only real d20 results and the three actual status symbols',()=>{
  for(const value of ['0','21','100','-1','1.5','',null,undefined,'<script>','NaN'])assert.equal(dndNumeralLayout(value),null);
});

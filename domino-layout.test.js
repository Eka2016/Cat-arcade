import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMINO_SET} from '../domino.js';
import {layoutDominoChain} from '../domino-layout.js';

test('Every domino fits the table without covering another tile, from opening to all 28 tiles',()=>{
  for(let count=1;count<=28;count++){
    const chain=DOMINO_SET.slice(0,count).map(([a,b],id)=>({id,a,b})),layout=layoutDominoChain(chain);
    assert.equal(layout.tiles.length,count);
    assert.deepEqual(layout.tiles.map(t=>t.id),chain.map(t=>t.id));
    const rectangles=layout.tiles.map(t=>({left:t.x-(t.double?21:41),right:t.x+(t.double?21:41),top:t.y-(t.double?41:21),bottom:t.y+(t.double?41:21)}));
    for(const [index,r] of rectangles.entries()){
      assert.ok(r.left>=0&&r.right<=layout.width&&r.top>=0&&r.bottom<=layout.height,`tile ${index} of ${count} stays on the table`);
      for(const other of rectangles.slice(index+1))assert.ok(r.right<=other.left||other.right<=r.left||r.bottom<=other.top||other.bottom<=r.top,'Tiles must not overlap');
    }
    for(const end of [layout.left,layout.right])assert.ok(end.x>40&&end.x<layout.width-40&&end.y>40&&end.y<layout.height-40,'Both placement ends fit');
    assert.notDeepEqual(layout.left,layout.right);
  }
});

test('A new table has one opening target and layout never mutates the actual chain',()=>{
  const empty=layoutDominoChain([]);assert.equal(empty.tiles.length,0);assert.equal(empty.left,null);assert.ok(empty.right);assert.equal(empty.path,'');
  const chain=DOMINO_SET.map(([a,b],id)=>Object.freeze({id,a,b}));Object.freeze(chain);
  const before=structuredClone(chain),layout=layoutDominoChain(chain);
  assert.deepEqual(chain,before);assert.ok(layout.tiles.some(t=>t.reverse));assert.equal(layout.tiles.filter(t=>t.double).length,7);
  assert.throws(()=>layoutDominoChain([...chain,chain[0]]),RangeError);
});

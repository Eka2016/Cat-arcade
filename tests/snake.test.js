import test from 'node:test';
import assert from 'node:assert/strict';
import { Snake } from '../snake.js';
import { anchorPanel } from '../positioning.js';
import { sanitizeSettings } from '../arcade.js';

test('A fresh game is idle, with three segments and food outside the snake', () => {
  const game = new Snake({ random: () => 0 });
  assert.equal(game.status, 'ready');
  assert.equal(game.body.length, 3);
  assert.equal(new Set(game.body.map(p => `${p.x},${p.y}`)).size, 3);
  assert.ok(!game.body.some(p => p.x === game.food.x && p.y === game.food.y));
  const original = structuredClone(game.body);
  game.tick();
  assert.deepEqual(game.body, original);
});

test('Pause freezes play; resuming advances exactly one cell', () => {
  const game = new Snake();
  game.start(); game.pause();
  const x = game.body[0].x;
  game.tick(); assert.equal(game.body[0].x, x);
  game.start(); game.tick(); assert.equal(game.body[0].x, x + 1);
});

test('Reversals are rejected; two quick legal turns are buffered in order', () => {
  const game = new Snake();
  assert.equal(game.turn('left'), false);
  assert.equal(game.turn('constructor'), false);
  assert.equal(game.turn('up'), true);
  assert.equal(game.turn('down'), false);
  assert.equal(game.turn('left'), true);
  assert.equal(game.turn('down'), false);
  game.start(); game.tick(); assert.equal(game.direction, 'up');
  game.tick(); assert.equal(game.direction, 'left');
});

test('Eating grows the snake, increases the score and leaves new food in a free cell', () => {
  const game = new Snake({ random: () => .2 });
  game.food = { x: game.body[0].x + 1, y: game.body[0].y };
  game.start(); assert.equal(game.tick().ate, true);
  assert.equal(game.body.length, 4); assert.equal(game.score, 1);
  assert.ok(!game.body.some(p => p.x === game.food.x && p.y === game.food.y));
});

test('Crossing any of the four edges enters the opposite side without losing', () => {
  const cases = [
    {direction:'right',body:[{x:4,y:2},{x:3,y:2},{x:2,y:2}],next:{x:0,y:2}},
    {direction:'left',body:[{x:0,y:2},{x:1,y:2},{x:2,y:2}],next:{x:4,y:2}},
    {direction:'up',body:[{x:2,y:0},{x:2,y:1},{x:2,y:2}],next:{x:2,y:4}},
    {direction:'down',body:[{x:2,y:4},{x:2,y:3},{x:2,y:2}],next:{x:2,y:0}},
  ];
  for (const c of cases) {
    const game = new Snake({size:5});
    game.body = c.body;game.direction = c.direction;game.food = {x:0,y:0};
    game.start();game.tick();
    assert.equal(game.status,'running',c.direction);
    assert.deepEqual(game.body[0],c.next,c.direction);
    assert.equal(game.body.length,3);
  }
});

test('Repeated wrapping keeps running and food across an edge grows the snake', () => {
  const game = new Snake({random:()=>0});
  game.food={x:0,y:0};game.start();
  for(let i=0;i<80;i++)game.tick();
  assert.equal(game.status,'running');assert.equal(game.body.length,3);
  const edge = new Snake({size:5});
  edge.body=[{x:4,y:2},{x:3,y:2},{x:2,y:2}];edge.food={x:0,y:2};
  edge.start();assert.equal(edge.tick().ate,true);
  assert.equal(edge.score,1);assert.equal(edge.body.length,4);
  assert.deepEqual(edge.body[0],{x:0,y:2});
});

test('Wrapping still detects body collisions and permits the vacating tail cell', () => {
  const game = new Snake({size:5});
  game.body=[{x:4,y:1},{x:4,y:2},{x:0,y:2},{x:0,y:1},{x:1,y:1}];
  game.food={x:3,y:3};game.start();game.tick();
  assert.equal(game.status,'over');assert.equal(game.reason,'self');
  game.body=[{x:4,y:1},{x:4,y:2},{x:0,y:2},{x:0,y:1}];
  game.status='running';game.tick();
  assert.equal(game.status,'running');assert.deepEqual(game.body[0],{x:0,y:1});
});

test('Body collisions end play, while the vacating tail cell is a legal move', () => {
  const game = new Snake({ size: 5 });
  game.body = [{x:1,y:1},{x:1,y:2},{x:2,y:2},{x:2,y:1},{x:3,y:1}];
  game.food = {x:4,y:4}; game.direction = 'up'; game.start();
  game.turn('right'); game.tick(); assert.equal(game.reason, 'self');
  game.body = [{x:1,y:1},{x:1,y:2},{x:2,y:2},{x:2,y:1}];
  game.status = 'running'; game.direction = 'up'; game.turns = [];
  game.turn('right'); game.tick(); assert.equal(game.status, 'running');
  assert.deepEqual(game.body[0], {x:2,y:1});
});

test('Filling the board wins without an infinite food-placement loop', () => {
  const game = new Snake({ size: 5 });
  const food = { x: 1, y: 0 };
  game.body = [{x:0,y:0}];
  for (let y=0;y<5;y++) for(let x=0;x<5;x++) {
    if (!(x===0 && y===0) && !(x===food.x && y===food.y)) game.body.push({x,y});
  }
  game.food = food; game.start(); game.tick();
  assert.equal(game.status, 'won'); assert.equal(game.food, null); assert.equal(game.body.length, 25);
});

test('Panel stays inside phone and desktop viewports at corners and center', () => {
  for (const [width,height] of [[320,568],[393,844],[844,393],[1280,800]]) {
    for (const left of [0,37]) for(const top of [0,110]) {
      const v = {left,top,width,height};
      for (const ratioX of [0,.5,1]) for(const ratioY of [0,.5,1]) {
        const size = {width:Math.min(344,width-20),height:Math.min(650,height-20)};
        const p = anchorPanel({x:left+10+(width-68)*ratioX,y:top+10+(height-68)*ratioY,width:48,height:48},size,v);
        assert.ok(p.x >= left+10 && p.y >= top+10);
        assert.ok(p.x+size.width <= left+width-10+.01);
        assert.ok(p.y+size.height <= top+height-10+.01);
      }
    }
  }
});

test('A side placement uses available height rather than covering the launcher', () => {
  const p = anchorPanel({x:335,y:450,width:48,height:48},{width:315,height:650},{left:0,top:0,width:393,height:844});
  assert.equal(p.side,'left');
  assert.ok(p.x+315 < 335);
});

test('Corrupt saved settings recover without an off-screen button or invalid record', () => {
  const value = sanitizeSettings({position:{x:NaN,y:999}, speed:'unknown', records:{normal:-12, fast:Infinity, calm:2000}});
  assert.deepEqual(value.position,{x:1,y:1});
  assert.equal(value.panelPosition,null);
  assert.deepEqual(sanitizeSettings({panelPosition:{x:-3,y:4},dndPreset:'Тихая история.'}).panelPosition,{x:0,y:1});
  assert.equal(sanitizeSettings({dndPreset:'Тихая история.'}).dndPreset,'Тихая история.');
  assert.equal(value.speed,'normal');
  assert.deepEqual(value.records,{calm:397,normal:0,fast:0});
  assert.deepEqual(sanitizeSettings(null),sanitizeSettings({}));
});

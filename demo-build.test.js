import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const root=new URL('../',import.meta.url),html=readFileSync(new URL('demo.html',root),'utf8');

test('The offline preview contains the current sources and styles, not an older embedded version',()=>{
  const match=html.match(/<script type="application\/json" id="paw-demo-build">([^<]+)<\/script>/);
  assert.ok(match,'Rebuild the preview with python3 tools/build-demo.py');
  const files=JSON.parse(match[1]);
  for(const name of ['arcade.js','durak-ui.js','durak-outfit.js','durak-portrait.js','style.css'])assert.ok(files[name]);
  for(const [name,hash] of Object.entries(files))assert.equal(createHash('sha256').update(readFileSync(new URL(name,root))).digest('hex'),hash,`Stale demo input: ${name}`);
  assert.ok(Buffer.byteLength(html)<2_000_000,'Artwork is shared with assets instead of duplicated inside the preview.');
});

test('Every bundled module loads and exposes the same application factory without starting a UI',()=>{
  const script=html.match(/<script>\n([\s\S]+)\n<\/script>/)?.[1];assert.ok(script);
  const check=script.replace('// PAW_DEMO_START\nrequire("__demo_entry.js");','return require("arcade.js");');
  assert.notEqual(check,script);
  const module=vm.runInNewContext(check,{URL,document:{baseURI:'https://example.invalid/paw-arcade/demo.html'}},{timeout:2000});
  assert.equal(typeof module.createArcade,'function');
});

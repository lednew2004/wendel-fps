import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../../public/src/multiplayer.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/src/styles.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const mobile=readFileSync(new URL('../../public/src/mobile.js',import.meta.url),'utf8');
test('remote avatars display server-health labels and shield bars',()=>{
  assert.match(app,/function updateLifeTag\(/);
  assert.match(app,/case 'health':/);
  assert.match(app,/data\.hp/);
  assert.match(app,/texture\.needsUpdate=true/);
});
test('mobile combat buttons are limited to edge, and free-look remains available',()=>{
  assert.match(css,/#mobile-look\{inset:0 0 0 auto;width:65%/);
  assert.match(css,/#m-fire\{right:/);
  assert.match(css,/#m-interact\{right:auto;left:/);
  assert.match(mobile,/lookFilter/);
  assert.match(mobile,/this\.game\.keys\.KeyF=true/);
});
test('lobby preserves nickname, code clearing, and custom creation',()=>{
  for(const id of ['mp-name-clear','mp-code-clear','mp-code','mp-name'])assert.ok(html.includes(`id="${id}"`));
  assert.match(app,/const room=byId\('mp-code'\)\.value\.trim\(\)\.toUpperCase\(\)/);
});

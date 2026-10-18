import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../public/src/styles.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const controls=readFileSync(new URL('../../public/src/mobile.js',import.meta.url),'utf8');
const game=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
const camera=readFileSync(new URL('../../public/src/thirdPersonCamera.js',import.meta.url),'utf8');

test('mobile HUD must layer above touch-look region while preserving aim elsewhere',()=>{
  assert.match(css,/\.touch-playing\s+#mobile-controls\s*\{[^}]*z-index\s*:\s*22\b/s);
  assert.match(css,/html\.is-touch\.touch-playing\s+#hud\s*\{[^}]*z-index\s*:\s*27\s*;[^}]*pointer-events\s*:\s*none/s);
  for(const id of ['#camera-mode-switch','#hud-pause']){
    assert.ok(css.includes(id),`Expected touch override for ${id}`);
  }
  assert.match(css,/#hud-pause\s*\{[^}]*min-width\s*:\s*44px\s*;/s);
  assert.match(controls,/const isOtherButton=e=>e\.target\?\.closest\?\.\('button'\)/);
});

test('both mobile corner actions invoke real game handlers and camera label reflects its mode',()=>{
  assert.match(index,/id="camera-mode-switch"[^>]*>.*?3ª PESSOA<\/button>/);
  assert.match(index,/id="hud-pause"[^>]*>.*?<\/button>/);
  assert.match(game,/el\('hud-pause'\)\.addEventListener\('click',\(\)=>this\.pause\(\)\)/);
  assert.match(game,/el\('camera-mode-switch'\)\.addEventListener\('click',\(\)=>\{this\.thirdPerson\.toggle\(\)/);
  assert.match(camera,/this\.mode==='third'\?'◉ 3ª PESSOA':'◎ 1ª PESSOA'/);
  assert.match(camera,/localStorage\.setItem\('titan-camera-mode',mode\)/);
});

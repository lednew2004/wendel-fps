import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=s=>readFileSync(new URL('../../'+s,import.meta.url),'utf8');
test('mobile HUD overlays aiming touch layer but action handlers remain attached',()=>{
 const css=read('public/src/styles.css'),touch=read('public/src/mobile.js');
 assert.match(css,/touch-playing #hud\s*\{[^}]*z-index:\s*80/);
 assert.match(css,/#hud-config-top/);assert.match(css,/#hud-pause/);
 assert.match(touch,/const isOtherButton=e=>e\.target\?\.closest\?\.\('button'\)/);
});
test('configuration button replaces camera button and pause remains functional',()=>{
 const html=read('public/index.html'),game=read('public/src/game.js');
 for(const id of ['hud-config-top','hud-config-menu','hud-config-pause','hud-config-mp','hud-editor'])assert.ok(html.includes(`id="${id}"`));
 assert.doesNotMatch(html,/id="camera-mode-switch"/);
 assert.match(game,/el\('hud-pause'\)\.addEventListener\('click',\(\)=>this\.pause\(\)\)/);
 assert.match(game,/this\.hudCustomizer\.attach\(\)/);
});

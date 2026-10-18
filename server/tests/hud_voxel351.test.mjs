import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HUD_ITEMS,HUD_STORAGE_KEY,sanitizeHudLayout} from '../../public/src/hudCustomizer.js';
const base=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
test('HUD editor exposes menu, pause, online and mobile entry points',()=>{
 const html=read('public/index.html');
 for(const id of ['hud-config-menu','hud-config-pause','hud-config-mp','hud-config-top','hud-editor','hud-editor-preview','hud-editor-save','hud-editor-reset'])assert.ok(html.includes(`id="${id}"`),id);
 assert.equal(new Set(HUD_ITEMS.map(i=>i.id)).size,HUD_ITEMS.length);
 assert.ok(HUD_ITEMS.some(i=>i.id==='mobile-move'));
 assert.ok(HUD_ITEMS.some(i=>i.id==='power-hud'));
 assert.equal(HUD_STORAGE_KEY,'titan-hud-layout-v1');
});
test('layout sanitizer prevents offscreen buttons and limits size and opacity',()=>{
 const v=sanitizeHudLayout({'m-fire':{x:-400,y:900,size:900,opacity:-3,visible:true},'hud-pause':{visible:false,x:30},'unknown':{x:20}});
 assert.deepEqual(v['m-fire'],{x:4,y:95,size:150,opacity:35});
 assert.deepEqual(v['hud-pause'],{x:30});
 assert.equal(v.unknown,undefined);
 assert.deepEqual(sanitizeHudLayout(null),{});
});
test('avatar GLBs have hard-edged geometry, 13 unique visual identities and existing rig clips',()=>{
 const gen=read('tools/generate_heroes_glb.py');
 assert.match(gen,/trimesh\.creation\.box\(extents=/);
 assert.match(gen,/HEROES=\{/);
 const chars=read('public/src/characters.js');
 assert.match(chars,/orb:new THREE\.BoxGeometry/);
 const glb=readFileSync(new URL('public/assets/models/operatives/shiro.glb',base));
 const size=glb.readUInt32LE(12);const manifest=JSON.parse(glb.subarray(20,20+size).toString());
 assert.ok(manifest.skins.length>=1);
 assert.ok(manifest.animations.length>=15);
 assert.ok(manifest.meshes[0].primitives.length>=5);
});
test('palette for the FPS squad city uses vibrant facades and cheap shared materials',()=>{
 const scene=read('public/src/squadWorld.js');
 assert.match(scene,/facades=\[/);
 assert.match(scene,/0xf2ae81/);
 assert.match(scene,/0xc9adea/);
 assert.match(scene,/InstancedMesh/);
 assert.doesNotMatch(scene,/new THREE\.PointLight/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const at=n=>new URL('../../'+n,import.meta.url);
const read=n=>readFileSync(at(n),'utf8');
test('3.9.1: visual pass instanced, no alteration to hitboxes or server',()=>{
 const src=read('public/src/cinematicWorld391.js');
 assert.match(src,/InstancedMesh/);
 assert.match(src,/CINEMATIC_391_SCENE_ART/);
 assert.doesNotMatch(src,/\.solids\.push|\.rayTargets\.push|\.addSolid\(|new THREE\.PointLight|new THREE\.SpotLight/);
 assert.match(read('public/src/squadWorld.js'),/installCinematicWorld391\(city\)/);
 assert.match(read('public/src/world.js'),/premium\.root\.visible/);
});
test('3.9.1: bundled physical facade normal and roughness textures',()=>{
 for(const name of ['facade_albedo.webp','facade_normal.webp','facade_roughness.webp'])assert.ok(existsSync(at('public/assets/pbr/'+name)));
 assert.match(read('public/src/world.js'),/this\.materialLibrary\.load\('facade'/);
});
test('3.9.1: visual-only UI, mobile controls keep their event IDs and hit targets',()=>{
 const css=read('public/src/styles.css'),html=read('public/index.html');
 assert.match(css,/CINEMATIC TACTICAL UI/);
 assert.match(css,/mobile-action\.fire/);
 assert.match(css,/pointer-events:auto/);
 for(const id of ['m-fire','mobile-move','m-jump','power-a','power-b','power-c'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/BUILD (?:3\.9\.1|4\.4\.0)/);
});

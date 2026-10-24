import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {HEROES} from '../../public/src/heroRoster.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const get=p=>fs.readFileSync(path.join(root,p));
const text=p=>get(p).toString();
function glb(rel){
 const b=get(rel);assert.equal(b.toString('ascii',0,4),'glTF',rel);
 assert.equal(b.readUInt32LE(8),b.length);
 const len=b.readUInt32LE(12);
 assert.equal(b.toString('ascii',16,20),'JSON');
 const j=JSON.parse(b.subarray(20,20+len).toString());
 assert.equal(j.asset.version,'2.0');return {j,bytes:b.length};
}
test('3.5: os 13 heróis GLB têm armaduras aprimoradas, rig e 16+ clipes válidos',()=>{
 assert.equal(HEROES.length,25);
 for(const h of HEROES){
  const {j,bytes}=glb(`public/assets/models/operatives/${h.id}.glb`);
  assert.ok(bytes<195_000,`${h.id} passou do orçamento de bytes`);
  assert.ok(j.meshes[0].primitives.length>=8,`${h.id} sem separação de materiais`);
  assert.ok(j.skins[0].joints.length>=11);
  const clips=new Set(j.animations.map(c=>c.name));
  for(const required of ['idle','walk','run','dash','jump','aim','fire','cast','hit','reload','strafe_left','strafe_right','crouch','land','aim_upper','fire_upper','cast_upper']){
   assert.ok(clips.has(required),`${h.id} sem clipe ${required}`);
  }
  // Upper-body clips cannot transform leg bones, so locomotion continues.
  const upper=j.animations.find(c=>c.name==='aim_upper');
  const legs=new Set([7,8,9,10]);
  for(const c of upper.channels) assert.ok(!legs.has(c.target.node));
  const low=glb(`public/assets/models/operatives/lod/${h.id}.glb`);
  assert.ok(low.bytes<140_000,`${h.id}: LOD ficou pesado`);
 }
});
test('3.5: quatro armas GLB originais têm geometrias e materiais PBR',()=>{
 for(const type of ['rifle','shotgun','sniper','lmg']){
  const {j,bytes}=glb(`public/assets/models/weapons/${type}.glb`);
  assert.ok(bytes>2_000&&bytes<55_000);
  assert.ok(j.meshes.length>=4,`${type}: faltam grupos de materiais`);
  assert.ok(j.materials?.some(x=>x.pbrMetallicRoughness),`${type}: faltam materiais PBR`);
 }
 const src=text('public/src/weapons.js');
 assert.match(src,/loadWeaponModels\(/);
 assert.match(src,/TITAN_HAND_LEFT/);
 assert.match(src,/this\.muzzle\.getWorldPosition/);
 assert.match(src,/tracerGeometry/);
});
test('3.5: runtime preserva fallback e anima camadas independentes',()=>{
 const s=text('public/src/skinnedOperatives.js');
 assert.match(s,/requestAsset\(id,low=false\)/);
 assert.match(s,/const low=globalThis\.TITAN_VISUAL_QUALITY==='low'/);
 assert.match(s,/fire_upper/);
 assert.match(s,/s\.upperAction/);
 assert.match(s,/visualMuzzle/);
 assert.match(text('public/src/game.js'),/this\.world\.cameraMode='first'/);
});
test('3.5: arquitetura e sombreamento não alteram colisão e ficam desligáveis no LOW',()=>{
 const s=text('public/src/sceneDetails35.js');
 assert.match(s,/new THREE\.InstancedMesh/);
 assert.match(s,/architecture_contact_shadow\.webp/);
 assert.doesNotMatch(s,/city\.solids\.push/);
 assert.doesNotMatch(s,/new THREE\.PointLight/);
 assert.doesNotMatch(s,/new THREE\.DirectionalLight/);
 assert.match(text('public/src/squadWorld.js'),/installArchitecturalDetails\(city\)/);
 assert.ok(get('public/assets/baked/architecture_contact_shadow.webp').length<12_000);
 assert.match(text('public/src/world.js'),/squadDetailRoot\.visible=q!=='low'/);
});
test('3.5: classificação FPS preservada e renderizador WebGL mantém opções existentes',()=>{
 const world=text('public/src/world.js');
 assert.match(world,/new THREE\.WebGLRenderer/);
 assert.match(world,/setQuality\(q\)/);
 assert.match(world,/TITAN_VISUAL_QUALITY=q/);
 const game=text('public/src/game.js');
 assert.match(game,/this\.mobile\?\.enabled \? 0\.55 : 0\.63/);
 for(const fragment of ['this.campaign.update(dt)','this.squad.update(dt)','this.multiplayer.update(dt)','this.weapons.update(dt'])assert.ok(game.includes(fragment));
 assert.match(JSON.parse(text('package.json')).version,/^(3\.9\.1|4\.2\.0|4\.2\.1)$/);
 assert.match(text('server/server.mjs'),/version:'(?:3\.9\.1|4\.2\.0|4\.2\.1)'/);
});

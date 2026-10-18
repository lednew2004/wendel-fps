import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {HEROES} from '../../public/src/heroRoster.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const read=rel=>readFileSync(path.join(root,rel));
function inspectGlb(rel){
 const b=read(rel);
 assert.equal(b.toString('ascii',0,4),'glTF',`${rel} não é GLB`);
 assert.equal(b.readUInt32LE(4),2);
 assert.equal(b.readUInt32LE(8),b.length,'tamanho GLB inconsistente');
 const len=b.readUInt32LE(12);assert.equal(b.toString('ascii',16,20),'JSON');
 const json=JSON.parse(b.subarray(20,20+len).toString('utf8'));
 const chunkAt=20+len;assert.equal(b.toString('ascii',chunkAt+4,chunkAt+8),'BIN\0');
 assert.equal(b.readUInt32LE(chunkAt),json.buffers[0].byteLength);
 return {json,size:b.length};
}
test('13 heróis possuem GLB autoral com rig, geometria e nove animações esqueléticas',()=>{
 assert.equal(HEROES.length,13);
 for(const hero of HEROES){
  const {json,size}=inspectGlb(`public/assets/models/operatives/${hero.id}.glb`);
  assert.ok(size<180_000,`${hero.id}: asset pesado`);
  assert.ok(json.skins[0].joints.length>=11,`${hero.id}: faltam ossos`);
  assert.ok(json.meshes[0].primitives.length>=5,`${hero.id}: sem materiais/identidade`);
  const clips=new Set(json.animations.map(a=>a.name));
  for(const clip of ['idle','walk','run','dash','jump','fire','aim','hit','cast'])assert.ok(clips.has(clip),`${hero.id}: animação ${clip}`);
  for(const primitive of json.meshes[0].primitives){
   assert.ok(primitive.attributes.JOINTS_0!=null&&primitive.attributes.WEIGHTS_0!=null,'geometria não esquelética');
  }
 }
});
test('inimigos de 6 classes e avatar genérico possuem GLB, sem dependência de assets externos',()=>{
 for(const role of ['scout','gunner','sniper','hunter','tank','boss','player']){
  const {json}=inspectGlb(`public/assets/models/operatives/${role}.glb`);
  assert.equal(json.skins.length,1);
 }
 const script=read('public/src/skinnedOperatives.js').toString('utf8');
 assert.match(script,/SkeletonUtils\.js/);
 assert.match(script,/crossFadeFrom/);
 assert.match(script,/\.\/assets\/models\/operatives\//);
 assert.match(script,/TITAN_SKINNED_RUNTIME/);
 const source=read('public/src/characters.js').toString('utf8');
 assert.match(source,/stripLegacy/);
 assert.match(source,/TITAN_SKINNED_RUNTIME\?\.request/);
});
test('cenário possui 3 prefabs GLB locais, sombra estática WebP e preserva colisores',()=>{
 for(const name of ['relay_tower','field_station','power_generator']){
  const {json}=inspectGlb(`public/assets/models/environment/${name}.glb`);
  assert.ok(json.meshes.length>=2);
 }
 assert.ok(statSync(path.join(root,'public/assets/baked/mission_ground_baked.webp')).size<70_000);
 const source=read('public/src/squadWorld.js').toString('utf8');
 assert.match(source,/mission_ground_baked\.webp/);
 assert.match(source,/squadDetailRoot/);
 assert.match(source,/city\.solids\.push\(\{\.\.\.b\}\)/);
});
test('teste WebGPU é opt-in, jogo principal permanece em WebGL',()=>{
 const page=read('public/webgpu-lab.html').toString('utf8');
 assert.match(page,/Testar neste dispositivo/);
 assert.match(page,/navigator\.gpu/);
 assert.match(page,/forceWebGL:false/);
 assert.match(page,/não o tempo de GPU/);
 const world=read('public/src/world.js').toString('utf8');
 assert.match(world,/new THREE\.WebGLRenderer/);
 assert.doesNotMatch(world,/new THREE\.WebGPURenderer/);
});

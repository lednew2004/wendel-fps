import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=rel=>readFileSync(new URL(rel,root),'utf8');
// Import pure math without requiring the Three.js browser import map or WebGL.
const source=read('public/src/thirdPersonCamera.js');
const helper=source.substring(source.indexOf('export function rayBoxEntry'),source.indexOf('export class ThirdPersonCamera'));
const {rayBoxEntry,unobstructedCameraDistance,cameraPreference}=await import('data:text/javascript,'+encodeURIComponent(helper));
const pt=(x,y,z)=>({x,y,z});
test('terceira pessoa é padrão, primeira pessoa salva permanece disponível',()=>{
 assert.equal(cameraPreference(null),'third');
 assert.equal(cameraPreference({getItem:()=>null}),'third');
 assert.equal(cameraPreference({getItem:()=> 'first'}),'first');
 assert.equal(cameraPreference({getItem:()=> 'third'}),'third');
});
test('ray de câmera evita atravessar paredes e respeita portas abertas',()=>{
 const from=pt(0,1.75,0),dir=pt(0,0,1);
 const wall={x:0,z:2,hx:2,hz:.2,minY:0,maxY:4,active:true};
 assert.ok(rayBoxEntry(from,dir,wall,5)>1.5);
 const safe=unobstructedCameraDistance(from,dir,4.15,[wall]);
 assert.ok(safe>1&&safe<2.2,`safe distance ${safe}`);
 assert.equal(unobstructedCameraDistance(from,dir,4.15,[{...wall,active:false}]),4.15);
 assert.equal(unobstructedCameraDistance(from,dir,4.15,[{...wall,x:10}]),4.15);
});
test('colisão verifica altura: câmera não esbarra em objetos abaixo da mira',()=>{
 const from=pt(0,2.3,0),dir=pt(0,0,1);
 assert.equal(rayBoxEntry(from,dir,{x:0,z:2,hx:1,hz:.2,minY:0,maxY:1},4),null);
});
test('3ª pessoa alternável no jogo, mira e projéteis usam origem do personagem',()=>{
 const game=read('public/src/game.js'),weapon=read('public/src/weapons.js'),powers=read('public/src/powers.js'),ui=read('public/index.html');
 assert.match(game,/new ThirdPersonCamera\(this\)/);
 assert.match(game,/e\.code==='KeyV'/);
 assert.match(game,/this\.thirdPerson\.update\(dt\)/);
 assert.match(ui,/id="camera-mode-switch"/);
 assert.match(weapon,/world\.cameraMode==='third'\?this\.world\.cameraPitch/);
 assert.match(powers,/cameraMode==='third'\?g\.world\.cameraPitch/);
});
test('terceira pessoa anima o próprio herói e não acrescenta modelos externos',()=>{
 const source=read('public/src/thirdPersonCamera.js'),chars=read('public/src/characters.js');
 assert.match(source,/createOperative\(\{role:'player',hero/);
 assert.match(source,/animateOperative\(avatar,dt/);
 assert.match(chars,/dashBlend/);
 assert.match(chars,/airBlend/);
 assert.doesNotMatch(source,/GLTFLoader|new THREE\.TextureLoader/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('3.5.1: modo terceira pessoa e alternância V foram removidos',()=>{
 const game=read('public/src/game.js'),ui=read('public/index.html');
 assert.match(game,/this\.world\.cameraMode='first'/);
 assert.doesNotMatch(game,/ThirdPersonCamera|\.thirdPerson|e\.code==='KeyV'/);
 assert.doesNotMatch(ui,/camera-mode-switch|3ª PESSOA/);
 assert.ok(!existsSync(new URL('../../public/src/thirdPersonCamera.js',import.meta.url)));
});
test('tiros e granadas usam câmera em primeira pessoa',()=>{
 const weapon=read('public/src/weapons.js'),powers=read('public/src/powers.js'),ordnance=read('public/src/ordnance.js');
 assert.match(weapon,/this\.world\.camera\.getWorldPosition\(origin\)/);
 assert.match(weapon,/this\.world\.camera\.getWorldDirection\(base\)/);
 assert.doesNotMatch(weapon,/cameraMode==='third'/);
 assert.match(powers,/const aimNode=g\.world\.camera/);
 assert.match(ordnance,/camera\.getWorldDirection\(dir\)/);
});

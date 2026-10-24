import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {standHeight,intersectLanding,walkableVolumes,solidBlocksCapsule} from '../../public/src/parkourPhysics.js';
import {SQUAD_BLOCKS,SQUAD_DOORS,SQUAD_INTERIORS,interiorColliders} from '../../public/src/squadLayout.js';
import {locationValid} from '../powers.mjs';
const read=(name)=>fs.readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('4.3: todos os objetos fisicos permitem aterrissar exatamente sobre o topo',()=>{
 const crate={x:4,z:6,hx:1,hz:1,minY:0,maxY:1.25};
 const surfaces=walkableVolumes([], [crate]);
 assert.equal(intersectLanding(surfaces,4,6,1.35,1.10),1.25);
 assert.equal(standHeight(surfaces,4,6,1.25,.46),1.25);
 assert.equal(walkableVolumes([], [{...crate,kind:'security'}]).length,1, 'barreiras de seguranca tambem sao superficies');
 assert.equal(intersectLanding(surfaces,5.9,6,1.35,1.10),-Infinity);
 assert.equal(solidBlocksCapsule(crate,4,6,0,1.77,.42),true);
 assert.equal(solidBlocksCapsule(crate,4,6,1.25,1.77,.42),false);
});
test('4.3: porta aberta nao cria piso ou bloqueio invisivel',()=>{
 const door={id:'door1',kind:'door',active:false,x:0,z:0,hx:1.56,hz:.16,minY:0,maxY:2.9};
 assert.equal(walkableVolumes([], [door]).length,0);
});
test('4.3: rampas dos dois lances sobem em sentidos opostos e terminam no patamar',()=>{
 const up={x:0,z:0,hx:1.25,hz:5,ramp:true,axis:'z',from:0,to:4,reverse:true};
 const returnFlight={...up,x:3,from:4,to:8,reverse:false};
 assert.ok(standHeight([up],0,-4,4.0,.48)>3.4);
 assert.ok(standHeight([up],0,4,0,.48)<.5);
 assert.ok(standHeight([returnFlight],3,-4,4.4,.48)>4);
 assert.ok(standHeight([returnFlight],3,4,7.6,.48)>7);
});
test('4.3: oito portas e patamares possuem colisoes no servidor',()=>{
 assert.equal(SQUAD_INTERIORS.length,8);
 assert.equal(SQUAD_DOORS.length,8);
 for(const b of SQUAD_INTERIORS){assert.equal(interiorColliders(b).filter(s=>s.interiorPart==='landing').length,1);}
 const colliders=JSON.parse(read('server/colliders.json'));
 assert.equal(colliders.length,SQUAD_BLOCKS.length);
 assert.deepEqual(JSON.parse(read('server/interactables.json')),SQUAD_DOORS);
});
test('4.3: mira optica ampliada, feedback e renderização equilibrada',()=>{
 const weapons=read('public/src/weapons.js'),game=read('public/src/game.js');
 assert.match(weapons,/index===2\?24/);
 assert.match(game,/updateAimFocus\(dt\)/);
 assert.match(game,/mode==='multiplayer'/);
 assert.match(game,/setQuality\('medium'\)/);
 assert.match(read('public/src/urban.js'),/new THREE.InstancedMesh/);
 assert.match(read('public/index.html'),/id="aim-optic-label"/);
});

test('4.3: posicao de jogador sobre bloco e valida para o servidor e dentro dele nao e',()=>{
 const box={x:0,z:0,hx:1.1,hz:1.1,minY:0,maxY:1.25};
 assert.equal(locationValid(0,1.25,0,[box]),true);
 assert.equal(locationValid(0,.8,0,[box]),false);
});

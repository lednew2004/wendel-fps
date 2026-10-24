import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HEROES,ACTIVE_HEROES,RESERVED_HERO_IDS,heroById} from '../../public/src/heroRoster.js';
import {SQUAD_BLOCKS,SQUAD_INTERIORS,SQUAD_DOORS,interiorColliders} from '../../public/src/squadLayout.js';

const scene=fs.readFileSync(new URL('../../public/src/squadWorld.js',import.meta.url),'utf8');
const movement=fs.readFileSync(new URL('../../public/src/parkour.js',import.meta.url),'utf8');
const motion=fs.readFileSync(new URL('../../public/src/combatMotion.js',import.meta.url),'utf8');
const ai=fs.readFileSync(new URL('../../public/src/enemies.js',import.meta.url),'utf8');
const serverBlocks=JSON.parse(fs.readFileSync(new URL('../colliders.json',import.meta.url)));
const serverDoors=JSON.parse(fs.readFileSync(new URL('../interactables.json',import.meta.url)));

test('4.2: 20 personagens distintos selecionáveis, legado preservado',()=>{
  assert.equal(ACTIVE_HEROES.length,20);
  assert.equal(new Set(ACTIVE_HEROES.map(h=>h.id)).size,ACTIVE_HEROES.length);
  assert.equal(HEROES.length-ACTIVE_HEROES.length,RESERVED_HERO_IDS.length);
  for(const id of RESERVED_HERO_IDS)assert.ok(heroById(id));
  for(const h of ACTIVE_HEROES)assert.equal(h.skills.length,3);
});
test('4.2: renderização e física compartilham os mesmos 84 obstáculos',()=>{
  assert.equal(SQUAD_BLOCKS.length,84);
  assert.equal(serverBlocks.length,84);
  for(let i=0;i<serverBlocks.length;i++){
    for(const key of ['x','z','hx','hz','minY','maxY'])assert.equal(serverBlocks[i][key],SQUAD_BLOCKS[i][key]);
  }
  assert.match(scene,/SQUAD_INTERIORS/);
  assert.match(scene,/makeStaircase/);
});
test('4.2: quatro edifícios abertos com paredes laterais, fachada vazada, piso e cobertura',()=>{
  assert.equal(SQUAD_INTERIORS.length,4);
  assert.equal(SQUAD_DOORS.length,4);
  for(const b of SQUAD_INTERIORS){
    const coll=interiorColliders(b);
    assert.equal(coll.filter(c=>c.interiorPart==='wall').length,5);
    assert.equal(coll.filter(c=>c.interiorPart==='roof').length,1);
    assert.equal(coll.filter(c=>c.interiorPart==='loft').length,1);
    const door=SQUAD_DOORS.find(d=>d.id===`${b.id}-door`);
    assert.ok(door);
    assert.ok(door.hx>1&&door.hx<2);
    assert.ok(!coll.some(c=>c.minY<=1.7&&c.maxY>=1.7&&Math.abs(c.x-door.x)<c.hx+.45&&Math.abs(c.z-(door.z-0.8))<c.hz+.45), `Espaço interno da porta desobstruído: ${b.id}`);
  }
});
test('4.2: quatro portas interativas mantêm índices autoritativos no servidor',()=>{
  assert.deepEqual(serverDoors,SQUAD_DOORS);
  assert.equal(new Set(serverDoors.map(x=>x.id)).size,4);
});
test('4.2: dash físico reutilizado, sem reposicionamento repetitivo na habilidade',()=>{
  assert.match(movement,/startDirectedDash\(toX,toZ,duration=/);
  assert.match(motion,/parkour\.startDirectedDash/);
  assert.doesNotMatch(motion,/parkour\.spawn\(/);
  assert.match(movement,/this\.city\.canOccupy/);
});
test('4.2: IA offline usa audição, campo de visão e raycast',()=>{
  assert.match(ai,/hearShot\(x,z/);
  assert.match(ai,/canSee\(e,target,dist/);
  assert.match(ai,/this\.world\.raycastDistance/);
  assert.match(ai,/targetMemory/);
});

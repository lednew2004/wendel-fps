import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SQUAD_OBSTACLES,SQUAD_BLOCKS} from '../../public/src/squadLayout.js';
import {planVault,vaultPosition,vaultCameraMotion} from '../../public/src/vaultTraversal.js';
import {isGroundedDestination} from '../powers.mjs';
const blockers=JSON.parse(readFileSync(new URL('../colliders.json',import.meta.url),'utf8'));
test('3.6.1 walls are taller, themed, shared by renderer and server',()=>{
 assert.equal(SQUAD_OBSTACLES.length,24);
 assert.equal(blockers.length,SQUAD_BLOCKS.length);
 assert.ok(SQUAD_OBSTACLES.every(w=>w.maxY>=3.4&&w.maxY<=5.7));
 assert.deepEqual(new Set(SQUAD_OBSTACLES.map(w=>w.kind)),new Set(['security','industrial','construction','concrete']));
});
test('VEX follows physical takeoff, crest crossing and descent instead of teleporting',()=>{
 const plan=planVault({x:-15,y:0,z:-112,yaw:0},SQUAD_OBSTACLES,
 (x,y,z)=>isGroundedDestination(x,y,z,blockers));
 assert.ok(plan);
 assert.ok(plan.duration>=1200);
 const takeoff=vaultPosition(plan,0),rise=vaultPosition(plan,.25),crest=vaultPosition(plan,.55),land=vaultPosition(plan,1);
 assert.deepEqual(takeoff,plan.from);
 assert.ok(rise.y>0&&rise.y<plan.crest,`intermediate y=${rise.y}`);
 assert.ok(crest.y>plan.wallTop+.3,`must CLEAR wall, y=${crest.y}`);
 assert.ok(crest.z<rise.z&&land.z<crest.z,'must move continuously over the wall');
 assert.deepEqual(land,plan.to);
 assert.ok(vaultCameraMotion(.5).headDip>0);
 assert.ok(vaultCameraMotion(.25).roll!==0);
 for(let i=0;i<=100;i++){
  const pt=vaultPosition(plan,i/100);
  assert.ok(Number.isFinite(pt.x+pt.y+pt.z));
  assert.ok(pt.y>=-.001&&pt.y<7);
  for(const wall of SQUAD_OBSTACLES){
   const overlap=Math.abs(pt.x-wall.x)<wall.hx+.39&&Math.abs(pt.z-wall.z)<wall.hz+.39;
   if(overlap)assert.ok(pt.y>=wall.maxY-.09,`wall collision at ${i/100}`);
  }
 }
});
test('VEX rejects non-vaultable buildings, blocked landing and walls behind the player',()=>{
 const p={x:-15,y:0,z:-112,yaw:0};
 assert.equal(planVault(p,SQUAD_OBSTACLES,()=>false),null);
 assert.equal(planVault({...p,yaw:Math.PI},SQUAD_OBSTACLES,()=>true),null);
 assert.equal(planVault(p,SQUAD_OBSTACLES,()=>true,{maxHeight:3}),null);
});
test('client + server integrate smooth traversal, weapon animation and remote replication',()=>{
 const src=(file)=>readFileSync(new URL('../../public/src/'+file,import.meta.url),'utf8');
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(src('parkour.js'),/this\.advanceVault\(dt\)/);
 assert.match(src('parkour.js'),/this\.game\.player\.eyeY=this\.y\+head/);
 assert.match(src('weapons.js'),/this\.vaultAnim\|\|0/);
 assert.match(src('multiplayer.js'),/vaultPosition\(m\.vault,u\)/);
 assert.match(server,/p\.vaultTrack=\{\.\.\.plannedVault,started:now\}/);
 assert.match(server,/const q=vaultPosition\(move,t\)/);
 assert.doesNotMatch(src('powers.js'),/p\.spawn\(dest\.x,dest\.y,dest\.z\);this\.motion\.teleport\(from,dest,0x65edff\)/);
});

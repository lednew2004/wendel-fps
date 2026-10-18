import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {MOBA_BASES,MOBA_LANES,JUNGLE_CAMPS,protectedRoute,distanceToLane} from '../../public/src/mobaLayout.js';
import {HEROES,heroLoadout,heroAllows} from '../../public/src/heroRoster.js';
import {COMBO_IDS,dashVector,orbitLocation} from '../../public/src/heroCombos.js';
import {POWER_RULES} from '../powers.mjs';
import {readFileSync} from 'node:fs';

test('MOBA has 3 continuous paths, jungle camps, separate bases, and safe collision routes',()=>{
 assert.deepEqual(Object.keys(MOBA_LANES).sort(),['adc','mid','top']);
 assert.equal(JUNGLE_CAMPS.length,6);
 for(const [name,pts] of Object.entries(MOBA_LANES)){
  assert.ok(pts.length>=4,name);
  assert.ok(Math.hypot(pts[0][0]-MOBA_BASES.blue.x,pts[0][1]-MOBA_BASES.blue.z)<28);
  assert.ok(Math.hypot(pts.at(-1)[0]-MOBA_BASES.red.x,pts.at(-1)[1]-MOBA_BASES.red.z)<28);
  assert.equal(distanceToLane(pts[1][0],pts[1][1],name),0);
  for(const pt of pts)assert.equal(protectedRoute(...pt),true);
 }
 const colliders=JSON.parse(readFileSync(new URL('../colliders.json',import.meta.url),'utf8'));
 for(const side of Object.values(MOBA_BASES))assert.ok(!colliders.some(c=>Math.abs(c.x-side.x)<c.hx+1&&Math.abs(c.z-side.z)<c.hz+1&&c.minY<1));
});

test('13 independent characters, 39 powers and all nine real combo definitions',()=>{
 assert.equal(HEROES.length,13);
 assert.equal(new Set(HEROES.flatMap(h=>h.skills)).size,39);
 for(const h of HEROES){assert.equal(h.skills.length,3);assert.deepEqual(heroLoadout(h.id),h.skills);for(const power of h.skills)assert.ok(heroAllows(h.id,power)&&POWER_RULES[power]);}
 assert.equal(COMBO_IDS.length,9);
 assert.deepEqual(heroLoadout('shiro'),['shiro_step','shiro_retreat','shiro_ricochet']);
 assert.deepEqual(heroLoadout('leo'),['leo_dash','leo_immunity','leo_barrage']);
 assert.deepEqual(heroLoadout('butterfly'),['butterfly_dash','butterfly_orbit','butterfly_launch']);
 assert.deepEqual(dashVector(0,0,0,8),{x:0,z:-8});
 assert.ok(Math.hypot(...Object.values(orbitLocation(0,0,1000,1000)))===8);
 const game=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
 for(const code of ['Digit1','Digit2','Digit3'])assert.ok(game.includes(code));
 assert.ok(!game.includes("if(e.code==='KeyZ')this.powers.useSlot"));
 const powers=readFileSync(new URL('../../public/src/powers.js',import.meta.url),'utf8');
 assert.match(powers,/this\.loadout=\[\.\.\.kit\]/);
});

process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const address=`ws://127.0.0.1:${server.address().port}/ws`;
const all=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(address);all.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
const send=(ws,msg)=>ws.send(JSON.stringify(msg));
function wait(ws,pred,timeout=3500){return new Promise((resolve,reject)=>{
 const to=setTimeout(()=>{ws.removeEventListener('message',listener);reject(new Error('Timed out waiting for '+pred.toString()));},timeout);
 function listener(ev){let m;try{m=JSON.parse(ev.data);}catch{return;}if(pred(m)){clearTimeout(to);ws.removeEventListener('message',listener);resolve(m);}}
 ws.addEventListener('message',listener);
});}
async function cast(ws,id){const response=wait(ws,m=>(m.type==='power-state'||m.type==='power-error'));send(ws,{type:'power',id});return response;}

test('actual WebSocket combos: shiro two advances, leo double dash/return, butterfly orb reactivation',async t=>{
 t.after(async()=>{for(const s of all)try{s.close();}catch{}await new Promise(r=>setTimeout(r,85));await new Promise(r=>server.close(r));});
 const shiro=await connect();const aWait=wait(shiro,m=>m.type==='welcome');send(shiro,{type:'join',create:true,room:'MOBA30',name:'Shiro',hero:'shiro'});const a=await aWait;
 const leo=await connect();const bWait=wait(leo,m=>m.type==='welcome');send(leo,{type:'join',room:'MOBA30',name:'Leo',hero:'leo'});const b=await bWait;
 const butterfly=await connect();const cWait=wait(butterfly,m=>m.type==='welcome');send(butterfly,{type:'join',room:'MOBA30',name:'Butterfly',hero:'butterfly'});const c=await cWait;
 const s=[...players.values()].find(p=>p.id===a.id), l=[...players.values()].find(p=>p.id===b.id), f=[...players.values()].find(p=>p.id===c.id);
 Object.assign(s,{x:0,y:0,z:0,yaw:0,spawnUntil:0,lastMove:Date.now()-3000});
 Object.assign(l,{x:0,y:0,z:-16,yaw:0,spawnUntil:0,lastMove:Date.now()-3000});
 Object.assign(f,{x:32,y:0,z:0,yaw:0,spawnUntil:0,lastMove:Date.now()-3000});
 let msg=await cast(shiro,'shiro_step');assert.equal(msg.type,'power-state');assert.equal(msg.powers.combo.shiro_step.step,1);assert.ok(s.z<-3);
 msg=await cast(shiro,'shiro_step');assert.equal(msg.type,'power-state');assert.equal(msg.powers.combo.shiro_step,undefined);assert.ok(s.z<-10);assert.ok(l.hp<100||l.shield<40);
 msg=await cast(shiro,'shiro_step');assert.equal(msg.type,'power-error');assert.match(msg.message,/recarregando/);
 Object.assign(l,{x:0,y:0,z:0,yaw:0,spawnUntil:0});
 msg=await cast(leo,'leo_dash');assert.equal(msg.powers.combo.leo_dash.step,1);
 msg=await cast(leo,'leo_dash');assert.equal(msg.powers.combo.leo_dash.step,2);
 msg=await cast(leo,'leo_dash');assert.equal(msg.powers.combo.leo_dash,undefined);assert.equal(l.z,0);
 Object.assign(f,{x:0,y:0,z:0,yaw:0,spawnUntil:0});
 msg=await cast(butterfly,'butterfly_orbit');assert.equal(msg.powers.combo.butterfly_orbit.step,1);
 msg=await cast(butterfly,'butterfly_orbit');assert.equal(msg.type,'power-state');assert.equal(msg.powers.combo.butterfly_orbit,undefined);assert.ok(Math.hypot(f.x,f.z)>4);
 msg=await cast(butterfly,'butterfly_orbit');assert.equal(msg.type,'power-error');
});

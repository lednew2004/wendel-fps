import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {dashVector,directionForDash,HERO_COMBOS} from '../../public/src/heroCombos.js';
import {POWER_VARIANTS} from '../../public/src/heroRoster.js';
import {POWER_RULES} from '../powers.mjs';

const source=(file)=>readFileSync(new URL('../../public/src/'+file,import.meta.url),'utf8');
test('movement-relative dash accepts side, reverse, diagonal and velocity fallback',()=>{
  assert.deepEqual(dashVector(0,0,0,7),{x:0,z:-7});
  assert.deepEqual(dashVector(1,2,0,7,{x:1,z:0}),{x:8,z:2});
  assert.deepEqual(dashVector(0,0,0,7,{x:0,z:1}),{x:0,z:7});
  const diag=directionForDash({x:1,z:-1});
  assert.ok(Math.abs(Math.hypot(diag.x,diag.z)-1)<1e-10);
  const pt=dashVector(0,0,0,8,diag);
  assert.ok(pt.x>5&&pt.z< -5);
  assert.deepEqual(directionForDash({x:0,z:0},{x:-3,z:0}),{x:-1,z:0});
  assert.deepEqual(directionForDash({x:0,z:0},{x:0,z:0}),{x:0,z:0});
  // Missing/spoofed direction must fall back to player's last aim, not NaN or a remote target.
  assert.deepEqual(dashVector(0,0,0,7,{x:999,z:0}),{x:0,z:-7});
  assert.match(source('parkour.js'),/directionForDash\(this.direction\(\),\{x:this.vx,z:this.vz\}\)/);
  assert.match(source('powers.js'),/id,dx:dir.x,dz:dir.z/);
});
test('balanced cooldowns are identical in client UI and server for all 39 skills',()=>{
  const client=source('powers.js');
  const keys=[...Object.keys(POWER_RULES)];
  assert.equal(keys.length,45);
  for(const id of keys){
    const cd=POWER_RULES[id].cooldown;
    assert.ok(cd>=12000&&cd<=60000,`${id} has an unreasonable cooldown: ${cd}`);
    if(POWER_VARIANTS[id])assert.equal(cd,POWER_VARIANTS[id].cool*1000,id);
    else assert.match(client,new RegExp(`\\b${id}:\\{[^\\n]*?cool:${cd/1000}\\b`),id);
  }
  for(const id of ['shiro_step','leo_dash','butterfly_orbit'])assert.ok(HERO_COMBOS[id].cool>=15);
  assert.ok(POWER_RULES.leo_barrage.cooldown>POWER_RULES.leo_dash.cooldown);
  assert.ok(POWER_RULES.resurrection.cooldown>POWER_RULES.shield.cooldown);
});
test('optimized squad city reuses GPU objects and does not add expensive realtime lights',()=>{
  const s=source('squadWorld.js');
  assert.match(s,/InstancedMesh/);
  assert.match(s,/instanceMatrix\.needsUpdate/);
  assert.match(s,/city\.solids\.push\(\{\.\.\.b\}\)/);
  assert.doesNotMatch(s,/new THREE\.(PointLight|SpotLight|DirectionalLight|EffectComposer)/);
  assert.doesNotMatch(s,/MOBA_LANES|JUNGLE_CAMPS|TOWER_DEFENSE/);
});

process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const wsURL=`ws://127.0.0.1:${server.address().port}/ws`,sockets=[];
const connect=()=>new Promise((resolve,reject)=>{const socket=new WebSocket(wsURL);sockets.push(socket);socket.addEventListener('open',()=>resolve(socket),{once:true});socket.addEventListener('error',reject,{once:true});});
const send=(ws,obj)=>ws.send(JSON.stringify(obj));
const wait=(ws,pred,ms=2500)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.removeEventListener('message',handle);reject(new Error('Timed out waiting for multiplayer movement'));},ms);function handle(e){let m;try{m=JSON.parse(e.data);}catch{return;}if(!pred(m))return;clearTimeout(timer);ws.removeEventListener('message',handle);resolve(m);}ws.addEventListener('message',handle);});

test('online Shiro and Leo directional dashes preserve stage order and collision validation',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close();}catch{}await new Promise(r=>setTimeout(r,100));await new Promise(r=>server.close(r));});
 const a=await connect(),aw=wait(a,m=>m.type==='welcome');send(a,{type:'join',create:true,room:'MOVE32',name:'Shiro',hero:'shiro'});const shiroWelcome=await aw;
 const b=await connect(),bw=wait(b,m=>m.type==='welcome');send(b,{type:'join',room:'MOVE32',name:'Leo',hero:'leo'});const leoWelcome=await bw;
 const s=[...players.values()].find(p=>p.id===shiroWelcome.id),l=[...players.values()].find(p=>p.id===leoWelcome.id);
 Object.assign(s,{x:0,y:0,z:0,yaw:0,spawnUntil:0});
 const side=wait(b,m=>m.type==='power-effect'&&m.kind==='combo-dash'&&m.player===s.id);
 const state=wait(a,m=>m.type==='power-state'&&m.powers.combo?.shiro_step?.step===1);
 send(a,{type:'power',id:'shiro_step',dx:1,dz:0});const [stepOne,stepState]=await Promise.all([side,state]);
 assert.ok(stepOne.to.x>5&&Math.abs(stepOne.to.z)<.1);
 assert.ok(stepState.powers.combo.shiro_step.until>Date.now()+10000);
 const backward=wait(b,m=>m.type==='power-effect'&&m.kind==='combo-dash'&&m.player===s.id);
 send(a,{type:'power',id:'shiro_step',dx:-1,dz:0});const stepTwo=await backward;
 assert.ok(stepTwo.to.x<stepOne.to.x);
 Object.assign(l,{x:0,y:0,z:0,yaw:0,spawnUntil:0});
 const later=wait(a,m=>m.type==='power-effect'&&m.kind==='combo-dash'&&m.player===l.id);
 send(b,{type:'power',id:'leo_dash',dx:0,dz:1});const leoForward=await later;
 assert.ok(leoForward.to.z>3);
 const sideLeo=wait(a,m=>m.type==='power-effect'&&m.kind==='combo-dash'&&m.player===l.id);
 send(b,{type:'power',id:'leo_dash',dx:1,dz:0});const leoSide=await sideLeo;
 assert.ok(leoSide.to.x>leoForward.to.x+3);
 const returnEvent=wait(b,m=>m.type==='power-state'&&!m.powers.combo?.leo_dash);
 send(b,{type:'power',id:'leo_dash',dx:0,dz:0});await returnEvent;
 assert.ok(Math.hypot(l.x,l.z)<.2);
});

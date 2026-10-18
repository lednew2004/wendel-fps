import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs';
import {POWER_RULES,isGroundedDestination} from '../powers.mjs';
import {PowerMenu} from '../../public/src/powerMenu.js';

const colliders=JSON.parse(fs.readFileSync(new URL('../colliders.json',import.meta.url)));
test('16 skills, map distance and collision-checked destinations',()=>{
 assert.equal(Object.keys(POWER_RULES).length,18);
 assert.equal(POWER_RULES.teleport.range,700);
 assert.equal(POWER_RULES.teleport.returnWindow,15000);
 assert.ok(isGroundedDestination(-135,.09,-135,colliders));
 assert.equal(isGroundedDestination(230,0,0,colliders),false);
 assert.equal(isGroundedDestination(0,22,0,colliders),false);
 const m=Object.create(PowerMenu.prototype);
 m.map={width:560,height:560,getBoundingClientRect(){return {left:0,top:0,width:280,height:280};}};
 assert.deepEqual(m.worldAt({clientX:140,clientY:140}),{x:0,z:0});
 assert.deepEqual(m.worldAt({clientX:0,clientY:0}),{x:-218,z:-218});
 assert.ok(Math.abs(m.convert(219,219).x-560)<.00001);
});

process.env.PORT='0';
const {server,players,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const wsURL=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
const connect=()=>new Promise((resolve,reject)=>{
 const ws=new WebSocket(wsURL);sockets.push(ws);
 ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});
});
const read=(ws,pred,timeout=3000)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.removeEventListener('message',listen);reject(new Error('Esperava mensagem do servidor'));},timeout);
 function listen(e){let m;try{m=JSON.parse(e.data);}catch{return;}if(!pred(m))return;clearTimeout(timer);ws.removeEventListener('message',listen);resolve(m);}
 ws.addEventListener('message',listen);
});
const send=(ws,obj)=>ws.send(JSON.stringify(obj));

test('2 online clients: long teleport, rewind, shield, black hole, chain, gravity, clones',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,80));await new Promise(r=>server.close(r));});
 const a=await connect(),w1=read(a,m=>m.type==='welcome');send(a,{type:'join',create:true,room:'ULT321',name:'Alpha',loadout:['teleport','shield']});const wa=await w1;
 const b=await connect(),w2=read(b,m=>m.type==='welcome');send(b,{type:'join',room:'ULT321',name:'Bravo',loadout:['shield','push']});const wb=await w2;
 const p=[...players.values()].find(x=>x.id===wa.id),q=[...players.values()].find(x=>x.id===wb.id);
 Object.assign(p,{x:0,y:0,z:18,yaw:0,pitch:0,lastMove:Date.now()-1000});Object.assign(q,{x:0,y:0,z:11,yaw:Math.PI,pitch:0,lastMove:Date.now()-1000});
 const tp=read(a,m=>m.type==='power-effect'&&m.kind==='teleport');send(a,{type:'power',id:'teleport',target:{x:-135,y:.09,z:-135}});
 const traveled=await tp;assert.equal(traveled.x,-135);assert.ok(Math.hypot(p.x,p.z-18)>150);
 const back=read(a,m=>m.type==='power-effect'&&m.kind==='teleport-back');send(a,{type:'power',id:'teleport',back:true});await back;assert.equal(p.x,0);
 // Both players can choose different loadouts during a room.
 const equipA=async ids=>{const event=read(a,m=>m.type==='power-state'&&m.powers.loadout[0]===ids[0]);send(a,{type:'equip',loadout:ids});await event;};
 const equipB=async ids=>{const event=read(b,m=>m.type==='power-state'&&m.powers.loadout[0]===ids[0]);send(b,{type:'equip',loadout:ids});await event;};
 const shield=read(b,m=>m.type==='power-state'&&m.powers.shieldUntil>Date.now());send(b,{type:'power',id:'shield'});await shield;
 const original=q.hp,originalShield=q.shield;
 send(a,{type:'fire'});await new Promise(r=>setTimeout(r,70));assert.equal(q.hp,original);assert.equal(q.shield,originalShield);
 await equipA(['blackhole','rewind']);
 const hole=read(a,m=>m.type==='power-vfx'&&m.kind==='blackhole');send(a,{type:'power',id:'blackhole'});await hole;assert.equal(rooms.get('ULT321').hazards.length,1);
 // Rewind restores the server's historical state, never client-supplied life values.
 p.powers.history=[{t:Date.now()-10000,x:0,y:0,z:18,hp:58,shield:15}];Object.assign(p,{x:2,y:0,z:22,hp:9,shield:0});
 const rewind=read(a,m=>m.type==='power-effect'&&m.kind==='rewind');send(a,{type:'power',id:'rewind'});await rewind;
 assert.equal(p.hp,58);assert.equal(p.shield,15);assert.equal(p.x,0);
 await equipA(['chain','gravity']);
 q.powers.shieldUntil=0;Object.assign(q,{x:0,y:0,z:11,hp:100,shield:40});
 const electric=read(a,m=>m.type==='power-vfx'&&m.kind==='chain');send(a,{type:'power',id:'chain'});const chaining=await electric;
 assert.ok(chaining.targets.length>=1);assert.ok(q.hp<100||q.shield<40);
 const lifted=read(a,m=>m.type==='power-vfx'&&m.kind==='gravity');send(a,{type:'power',id:'gravity'});await lifted;
 assert.ok(q.y>0);assert.ok(q.powers.gravityUntil>Date.now());
 await equipA(['clones','shield']);
 const clones=read(a,m=>m.type==='power-vfx'&&m.kind==='clones');send(a,{type:'power',id:'clones'});const created=await clones;
 assert.ok(created.clones.length>=1);assert.ok(rooms.get('ULT321').clones.length>=1);
 const fail=read(a,m=>m.type==='power-error');send(a,{type:'power',id:'clones'});assert.match((await fail).message,/recarregando/i);
});

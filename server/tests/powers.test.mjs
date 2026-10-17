import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {POWER_RULES,sanitizeLoadout,locationValid,freshPowerState,canCast} from '../powers.mjs';

test('six playable abilities and two-slot loadouts are bounded',()=>{
 assert.deepEqual(Object.keys(POWER_RULES),['push','freeze','teleport','flight','invisible','phase','blackhole','rewind','chain','gravity','clones','shield','swap']);
 assert.deepEqual(sanitizeLoadout(['teleport','phase']),['teleport','phase']);
 assert.deepEqual(sanitizeLoadout(['flight','flight']),['flight','push']);
 const p={alive:true,powers:freshPowerState()};assert.equal(canCast(p,'push'),null);
 assert.match(canCast(p,'flight'),/não equipada/i);
 assert.equal(locationValid(5,0,5,[]),true);
 assert.equal(locationValid(150,0,0,[]),false);
});

process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
function connect(){return new Promise((resolve,reject)=>{const ws=new WebSocket(url);sockets.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});}
function read(ws,pred,timeout=3000){return new Promise((resolve,reject)=>{const tm=setTimeout(()=>{ws.removeEventListener('message',on);reject(new Error('timeout '+pred));},timeout);function on(e){let m;try{m=JSON.parse(e.data)}catch{return;}if(!pred(m))return;clearTimeout(tm);ws.removeEventListener('message',on);resolve(m)}ws.addEventListener('message',on);});}
function send(ws,v){ws.send(JSON.stringify(v));}

test('network power system: push, freeze, flight, invisibility, phase and teleport/return',async t=>{
 t.after(async()=>{for(const ws of sockets){try{ws.close();}catch{}}await new Promise(r=>setTimeout(r,100));await new Promise(r=>server.close(r));});
 const a=await connect(),joinA=read(a,m=>m.type==='welcome');
 send(a,{type:'join',create:true,room:'POW200',name:'A',loadout:['push','freeze']});const wa=await joinA;
 const b=await connect(),joinB=read(b,m=>m.type==='welcome');
 send(b,{type:'join',room:wa.room,name:'B',loadout:['push','freeze']});const wb=await joinB;
 const aa=[...players.values()].find(p=>p.id===wa.id),bb=[...players.values()].find(p=>p.id===wb.id);
 Object.assign(aa,{x:0,y:0,z:18,yaw:0,pitch:0});Object.assign(bb,{x:0,y:0,z:11,yaw:Math.PI,pitch:0});
 const pushed=read(b,m=>m.type==='power-effect'&&m.kind==='push'&&m.player===wb.id);
 send(a,{type:'power',id:'push'});const push=await pushed;
 assert.ok(push.z<11,'server moves victim away');
 assert.ok(aa.powers.cooldowns.push>Date.now());
 const fail=read(a,m=>m.type==='power-error');send(a,{type:'power',id:'push'});assert.match((await fail).message,/recarregando/i);
 const freeze=read(b,m=>m.type==='power-effect'&&m.kind==='freeze'&&m.player===wb.id);
 send(a,{type:'power',id:'freeze'});await freeze;
 assert.ok(bb.powers.frozenUntil>Date.now());
 const oldZ=bb.z;send(b,{type:'move',x:0,y:0,z:oldZ-.3,yaw:0,pitch:0,weapon:0});await new Promise(r=>setTimeout(r,60));assert.equal(bb.z,oldZ);
 // Equip is synchronized through the room; swapping powers doesn't change prior cooldown.
 const equip=read(a,m=>m.type==='power-state'&&m.powers.loadout[0]==='flight');send(a,{type:'equip',loadout:['flight','invisible']});await equip;
 const fly=read(a,m=>m.type==='power-state'&&m.powers.flightUntil>Date.now());send(a,{type:'power',id:'flight'});await fly;
 assert.ok(aa.powers.flightUntil>Date.now());
 const inv=read(a,m=>m.type==='power-state'&&m.powers.invisibleUntil>Date.now());send(a,{type:'power',id:'invisible'});await inv;
 assert.ok(aa.powers.invisibleUntil>Date.now());
 // Phase prevents hits; active phase ends when timer runs out.
 const equip2=read(a,m=>m.type==='power-state'&&m.powers.loadout[0]==='phase');send(a,{type:'equip',loadout:['phase','teleport']});await equip2;
 const phase=read(a,m=>m.type==='power-state'&&m.powers.phaseUntil>Date.now());send(a,{type:'power',id:'phase'});await phase;
 assert.ok(aa.powers.phaseUntil>Date.now());
 // Clear phase to test teleport in a controlled sequence.
 aa.powers.phaseUntil=0;
 const tel=read(a,m=>m.type==='power-effect'&&m.kind==='teleport'&&m.player===wa.id);
 send(a,{type:'power',id:'teleport',target:{x:0,y:0,z:26}});
 const teleported=await tel;assert.equal(teleported.z,26);
 assert.equal(aa.z,26);
 const back=read(a,m=>m.type==='power-effect'&&m.kind==='teleport-back'&&m.player===wa.id);
 send(a,{type:'power',id:'teleport',back:true});const returned=await back;assert.equal(returned.z,18);
});

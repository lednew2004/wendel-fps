import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs';
import {POWER_RULES} from '../powers.mjs';

const base=new URL('../../public/src/',import.meta.url);
const src=n=>fs.readFileSync(new URL(n,base),'utf8');
test('18 combat powers, removed web, 10 second rewind, copy on marked elimination and hardcore black hole',()=>{
 assert.equal(Object.keys(POWER_RULES).length,18);
 assert.equal(POWER_RULES.rewind.history,10000);
 assert.equal(POWER_RULES.web,undefined);
 assert.equal(POWER_RULES.copy.markDuration,18000);
 assert.equal(POWER_RULES.copy.stealDuration,30000);
 assert.equal(POWER_RULES.blackhole.radius,18);
 assert.ok(POWER_RULES.rewind.cooldown>=40000);
 assert.match(src('powers.js'),/timestamp=now\(\)-10000/);
 assert.doesNotMatch(src('powers.js'),/findWebAnchor/);
 assert.match(src('powers.js'),/this\.copyMark=\{enemy:target\.e/);
 assert.match(src('powers.js'),/this\.moveLocalClone\(d,dt\)/);
 assert.doesNotMatch(src('parkour.js'),/Elastic rope/);
 assert.match(src('multiplayer.js'),/case 'clone-move'/);
 assert.match(src('game.js'),/onCasualEnemyKill\(e\)/);
 const ui=fs.readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 assert.equal((ui.match(/value="web"/g)||[]).length,0);
 assert.equal((ui.match(/value="copy"/g)||[]).length,8);
});

process.env.PORT='0';
const {server,players,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`,sockets=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(url);sockets.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
const send=(ws,payload)=>ws.send(JSON.stringify(payload));
const receive=(ws,check,ms=2200)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.removeEventListener('message',listener);reject(new Error('Timed out waiting for '+check));},ms);
 function listener(e){let m;try{m=JSON.parse(e.data);}catch{return;}if(!check(m))return;clearTimeout(timer);ws.removeEventListener('message',listener);resolve(m);}
 ws.addEventListener('message',listener);
});
const equip=async(ws,powers)=>{const event=receive(ws,m=>m.type==='power-state'&&m.powers.loadout[0]===powers[0]);send(ws,{type:'equip',loadout:powers});return event;};
test('online removed web is rejected; copy only after a marked kill and auto-restore',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,100));await new Promise(r=>server.close(r));});
 const a=await connect(),joinedA=receive(a,m=>m.type==='welcome');send(a,{type:'join',create:true,room:'V23WEB',name:'Ninja',loadout:['push','copy']});const wa=await joinedA;
 const b=await connect(),joinedB=receive(b,m=>m.type==='welcome');send(b,{type:'join',room:'V23WEB',name:'Tempo',loadout:['flight','shield']});const wb=await joinedB;
 const p=[...players.values()].find(p=>p.id===wa.id),q=[...players.values()].find(p=>p.id===wb.id);
 // This is a known real wall in colliders.json, next to the player.
 Object.assign(p,{x:-100,y:0,z:-59,yaw:0,pitch:0,lastMove:Date.now()-1000});
 const invalid=receive(a,m=>m.type==='power-error');send(a,{type:'power',id:'web',anchor:{x:0,y:20,z:0}});assert.match((await invalid).message,/desconhecida/i);
 assert.equal(p.powers.cooldowns.web,undefined,'Removed power has no cooldown');
 Object.assign(p,{x:0,y:0,z:18,yaw:0,pitch:0,lastMove:Date.now()-1000});
 Object.assign(q,{x:0,y:0,z:11,yaw:Math.PI,pitch:0,lastMove:Date.now()-1000,hp:100,shield:0,spawnUntil:0});
 const marked=receive(a,m=>m.type==='power-effect'&&m.kind==='copy-mark');send(a,{type:'power',id:'copy'});const mark=await marked;
 assert.equal(mark.target,q.id);
 assert.deepEqual(p.powers.loadout,['push','copy'],'Marking alone must not steal abilities');
 // Only the marked victim's death by this attacker triggers stealing.
 q.hp=19;
 const stolen=receive(a,m=>m.type==='power-copy');send(a,{type:'fire'});const event=await stolen;
 assert.equal(event.from,'Tempo');assert.deepEqual(event.powers.loadout,['flight','shield']);assert.ok(p.powers.copiedUntil>Date.now()+24000);
 assert.deepEqual(p.powers.originalLoadout,['push','copy']);
 // Simulate the end of the copy window without waiting 25 real seconds.
 p.powers.copiedUntil=Date.now()-10;
 const restored=receive(a,m=>m.type==='power-state'&&m.powers.loadout[0]==='push');const ret=await restored;
 assert.deepEqual(ret.powers.loadout,['push','copy']);
});

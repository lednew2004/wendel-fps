import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs';
import {HEROES,heroLoadout} from '../../public/src/heroRoster.js';
import {SQUAD_BLOCKS,SQUAD_OBSTACLES} from '../../public/src/squadLayout.js';
import {prepareAdaptation,observeAdaptation,learned,startUltimate} from '../../public/src/adaptation.js';

const code=n=>fs.readFileSync(new URL(`../../public/src/${n}`,import.meta.url),'utf8');
test('3.6.1: 14 heroes, animated VEX and ADAPT, 24 urban barriers',()=>{
 assert.equal(HEROES.length,25);
 assert.deepEqual(heroLoadout('striker'),['vault','wallrun_boost','vex_ultimate']);
 assert.deepEqual(heroLoadout('adaptomega'),['adapt_scan','adapt_counter','adapt_ultimate']);
 assert.equal(SQUAD_OBSTACLES.length,24);
 for(const o of SQUAD_OBSTACLES)assert.ok(SQUAD_BLOCKS.includes(o));
 const colliders=JSON.parse(fs.readFileSync(new URL('../colliders.json',import.meta.url),'utf8'));
 assert.equal(colliders.length,SQUAD_BLOCKS.length);
 assert.match(code('powers.css'),/z-index:145!important/);
 assert.match(code('powers.js'),/document\.addEventListener\('touchstart'/);
 assert.match(code('powers.js'),/this\.copyBuff\?\.until>now\(\)&&this\.loadout\.includes\(id\)/);
 assert.match(code('powers.js'),/createOperative\(\{role:'scout',hero:'echo'/);
});
test('manual adaptation learns one event, auto adaptation can learn 3 and expires',()=>{
 const t=10_000,state=prepareAdaptation({});
 state.adaptScanUntil=t+8000;
 assert.deepEqual(observeAdaptation(state,'freeze',t+1000),{blocked:false,learned:true});
 assert.equal(learned(state,'freeze',t+1100),true);
 assert.deepEqual(observeAdaptation(state,'freeze',t+1100),{blocked:true,learned:false});
 assert.equal(state.adaptations[0].until,t+13000);
 assert.equal(learned(state,'freeze',t+13001),false);
 startUltimate(state,t+15000);
 for(const ev of ['kinetic','gravity','explosion'])assert.equal(observeAdaptation(state,ev,t+15100).blocked,true);
 assert.equal(state.adaptations.length,3);
 assert.equal(observeAdaptation(state,'energy',t+15200).blocked,true);
 assert.deepEqual(state.adaptations.map(a=>a.kind),['gravity','explosion','energy']);
 assert.equal(state.adaptations[0].until,t+30000);
 assert.equal(learned(state,'energy',t+30001),false);
});

process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
const connect=()=>new Promise((resolve,reject)=>{
 const ws=new WebSocket(url);sockets.push(ws);
 ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});
});
const send=(ws,payload)=>ws.send(JSON.stringify(payload));
const recv=(ws,pred,timeout=2500)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.removeEventListener('message',onMsg);reject(Error('Missing expected message'));},timeout);
 function onMsg(e){let x;try{x=JSON.parse(e.data)}catch{return};if(!pred(x))return;clearTimeout(timer);ws.removeEventListener('message',onMsg);resolve(x)}
 ws.addEventListener('message',onMsg);
});

test('online VEX vaults a collision wall and clone avatars advance on server',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,80));await new Promise(r=>server.close(r));});
 const vx=await connect();const j=recv(vx,m=>m.type==='welcome');send(vx,{type:'join',name:'Vex',hero:'striker',room:'EV3601',create:true});const welcome=await j;
 const player=[...players.values()].find(p=>p.id===welcome.id);
 assert.ok(player);
 Object.assign(player,{x:-15,y:0,z:-112,yaw:0,pitch:0,lastMove:Date.now()-500,spawnUntil:0});
 const crossing=recv(vx,m=>m.type==='power-effect'&&m.kind==='vault');send(vx,{type:'power',id:'vault'});
 const v=await crossing;assert.ok(v.to.z<-116.8,`destination incorrectly at ${v.to.z}`);
 assert.ok(player.powers.cooldowns.vault>Date.now());
 assert.ok(player.vaultTrack,'vault traversal must be active, not an instant teleport');
 assert.equal(player.z,-112,'player must not teleport on cast');
 await new Promise(r=>setTimeout(r,v.duration+160));
 assert.ok(Math.abs(player.z-v.to.z)<.1,'server vault must finish at the destination');
 const echo=await connect();const ej=recv(echo,m=>m.type==='welcome');send(echo,{type:'join',name:'Mimico',hero:'echo',room:'EV3601'});const echoWelcome=await ej;
 const mimic=[...players.values()].find(p=>p.id===echoWelcome.id);
 Object.assign(mimic,{x:-143,y:0,z:-143,yaw:0,pitch:0,spawnUntil:0});
 const clones=recv(echo,m=>m.type==='power-vfx'&&m.kind==='clones');send(echo,{type:'power',id:'clones'});
 const event=await clones;
 assert.ok(event.clones.length>=1);
 const initial=event.clones[0];
 const moved=recv(echo,m=>m.type==='clone-move'&&m.id===initial.id,3000);
 const updated=await moved;assert.ok(Math.hypot(updated.x-initial.x,updated.z-initial.z)>.05,'regular clone must move');
 // Mark a hero, eliminate the target and cast a stolen skill the original echo
 // is never authorized to equip. This reproduces the previously broken path.
 Object.assign(mimic,{x:-143,y:0,z:-143,yaw:0,pitch:-.11,lastFire:0});
 Object.assign(player,{x:-143,y:0,z:-148,hp:1,shield:0,alive:true,spawnUntil:0});
 const mark=recv(echo,m=>m.type==='power-effect'&&m.kind==='copy-mark');
 send(echo,{type:'power',id:'copy'});await mark;
 const copied=recv(echo,m=>m.type==='power-copy',2500);
 send(echo,{type:'fire'});
 const stolen=await copied;
 assert.deepEqual(stolen.powers.loadout,heroLoadout('striker'));
 const cast=recv(echo,m=>m.type==='power-state'&&m.powers?.cooldowns?.wallrun_boost>Date.now());
 send(echo,{type:'power',id:'wallrun_boost'});
 const activated=await cast;
 assert.ok(activated.powers.cooldowns.wallrun_boost>Date.now(),'copied skill must be usable in multiplayer');
});

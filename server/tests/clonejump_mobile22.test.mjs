import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs';
import {POWER_RULES,powerSnapshot,sanitizeLoadout} from '../powers.mjs';

const root=new URL('../../',import.meta.url);
const source=fs.readFileSync(new URL('../../public/src/powers.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../../public/src/styles.css',import.meta.url),'utf8');
const mobileCss=fs.readFileSync(new URL('../../public/src/powers.css',import.meta.url),'utf8');
const multiplayerSource=fs.readFileSync(new URL('../../public/src/multiplayer.js',import.meta.url),'utf8');

test('18 powers, scaled cooldowns and mobile powers',()=>{
 assert.equal(Object.keys(POWER_RULES).length,48);
 assert.ok(Object.values(POWER_RULES).every(p=>p.cooldown>=12000));
 assert.deepEqual(sanitizeLoadout(['clonejump','freeze']),['clonejump','freeze']);
 assert.match(source,/clonejump:\{label:'CLONE MÓVEL'/);
});
test('touch aiming: hold, drag, release, cancel; only two skill buttons; fire moved above/left of jump',()=>{
 assert.match(source,/const cast=touch\.skillShot&&!touch\.cancelled&&!aborted/);
 assert.match(source,/touch\.cancelled=totalY< -100/);
 assert.match(source,/this\.showAimGuide\(id\)/);
 assert.match(source,/if\(cast\)/);
 assert.match(source,/\(liveMs\/1000\)\.toFixed\(1\)/);
 assert.match(mobileCss,/#power-hud\{left:auto!important;top:auto!important;bottom:/);
 assert.match(styles,/\.touch-playing #m-fire\{left:auto!important;right:clamp\(106px/);
 assert.match(styles,/\.touch-playing #m-jump\{left:auto!important;right:max\(12px/);
 assert.match(multiplayerSource,/onServerClones\(msg\)/);
});

process.env.PORT='0';
const {server,players,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(url);sockets.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
function listen(ws,accept,timeout=3000){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.removeEventListener('message',handler);reject(Error('Timed out: '+accept.toString()));},timeout);
 function handler(e){let m;try{m=JSON.parse(e.data);}catch{return;}if(!accept(m))return;clearTimeout(timer);ws.removeEventListener('message',handler);resolve(m);}
 ws.addEventListener('message',handler);
});}
const send=(ws,msg)=>ws.send(JSON.stringify(msg));
test('two online connections: one running clone, server-side movement, position swap and cooldown',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,80));await new Promise(r=>server.close(r));});
 const a=await connect(),j=listen(a,m=>m.type==='welcome');send(a,{type:'join',create:true,room:'CLN222',name:'Salto',loadout:['clonejump','flight']});const welcome=await j;
 const b=await connect(),j2=listen(b,m=>m.type==='welcome');send(b,{type:'join',room:'CLN222',name:'Visitante',loadout:['push','freeze']});await j2;
 const p=[...players.values()].find(x=>x.id===welcome.id);
 Object.assign(p,{x:0,y:0,z:18,yaw:0,pitch:0,lastMove:Date.now()-1000});
 const summoned=listen(b,m=>m.type==='power-vfx'&&m.kind==='clones'&&m.player===welcome.id);
 send(a,{type:'power',id:'clonejump'});const msg=await summoned;
 assert.equal(msg.clones.length,1,'One moving clone is spawned');
 assert.ok(msg.clones.every(c=>c.power==='clonejump'));
 assert.ok(p.powers.cooldowns.clonejump>Date.now());
 const own=rooms.get('CLN222').clones.filter(c=>c.owner===welcome.id);
 const choice=own[0];
 const startingZ=choice.z;
 const cloneMove=await listen(b,m=>m.type==='clone-move'&&m.id===choice.id&&Math.abs(m.z-startingZ)>.2);
 assert.ok(Math.hypot(cloneMove.x-choice.x,cloneMove.z-startingZ)>.19 || Math.abs(cloneMove.z-startingZ)>.2,'The hologram is not static');
 const oldPosition={x:p.x,y:p.y,z:p.z};
 const jumped=listen(b,m=>m.type==='power-effect'&&m.kind==='clonejump'&&m.player===welcome.id);
 send(a,{type:'power',id:'clonejump',jump:true,index:choice.slot});const warp=await jumped;
 assert.ok(Math.hypot(warp.x-oldPosition.x,warp.z-oldPosition.z)>1,'The player moves to the running clone');
 assert.ok(Math.hypot(choice.x-oldPosition.x,choice.z-oldPosition.z)<1,'The clone trades places with the player');
 const fail=listen(a,m=>m.type==='power-error');send(a,{type:'power',id:'clonejump',jump:true,index:choice.slot});assert.match((await fail).message,/Clone móvel/i);
 assert.ok(powerSnapshot(p).cloneJumpUsed);
 // The 10-second recharge cannot be bypassed just by equipping a power again.
 const equipped=listen(a,m=>m.type==='power-state'&&m.powers.loadout[0]==='flight');send(a,{type:'equip',loadout:['flight','clonejump']});await equipped;
 const again=listen(a,m=>m.type==='power-error');send(a,{type:'power',id:'clonejump'});assert.match((await again).message,/recarregando/i);
});

test('personalized buttons save size and offsets, aiming helper displays range',()=>{
 assert.match(source,/POWER_DATA\[id\]\.help\.toUpperCase\(\)/);
 const revised=fs.readFileSync(new URL('../../public/src/powers.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../../public/src/powers.css',import.meta.url),'utf8');
 assert.match(revised,/initTouchLayout\(\)/);
 assert.match(revised,/titan-power-touch-layout/);
 assert.match(revised,/data-power-layout="size"/);
 assert.match(css,/--power-horizontal-shift/);
 assert.match(css,/--power-size-scale/);
});

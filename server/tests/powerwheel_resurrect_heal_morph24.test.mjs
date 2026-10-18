import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs';
import {POWER_RULES,nearbyMorphObject,canAutoResurrect,canCast,powerSnapshot,freshPowerState} from '../powers.mjs';

const read=name=>fs.readFileSync(new URL('../../public/src/'+name,import.meta.url),'utf8');
test('18 selectable skills, safe objects and four seconds of automatic resurrection',()=>{
 assert.equal(Object.keys(POWER_RULES).length,18);
 assert.ok(POWER_RULES.resurrection.cooldown>=60000);
 assert.equal(POWER_RULES.resurrection.duration,4000);
 assert.equal(POWER_RULES.heal.health,70);
 assert.equal(POWER_RULES.morph.range,6);
 assert.equal(nearbyMorphObject(-14,-18)?.type,'barrel');
 assert.equal(nearbyMorphObject(0,0),null);
 assert.equal(nearbyMorphObject(85,93)?.type,'truck');
 assert.equal(nearbyMorphObject(-22,-104)?.type,'forklift');
 const p={alive:true,powers:freshPowerState()};p.powers.loadout=['resurrection','heal'];
 assert.equal(canAutoResurrect(p),true);
 assert.match(canCast(p,'resurrection'),/automática/);
 p.powers.cooldowns.resurrection=Date.now()+5000;
 assert.equal(canAutoResurrect(p),false);
 assert.equal(powerSnapshot(p).propType,null);
});
test('radial wheel accessible on PC and touch, resurrection + morph in both casual and online',()=>{
 const html=fs.readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 for(const id of ['titan-wheel-center','titan-wheel-prev','titan-wheel-next','titan-abilities-wheel','titan-power-picker'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const power of ['resurrection','heal','morph'])assert.equal((html.match(new RegExp('value="'+power+'"','g'))||[]).length,8);
 assert.match(read('game.js'),/this\.powers\.tryResurrection\(\)/);
 assert.match(read('powerMenu.js'),/releaseWheel\(\)/);
 assert.match(read('powers.js'),/findMorphObject\(\)/);
 assert.match(read('multiplayer.js'),/setDisguise\(entry\.group/);
 const css=read('powers.css');assert.match(css,/radial-gradient/);
});

process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const wsURL=`ws://127.0.0.1:${server.address().port}/ws`,sockets=[];
function connect(){return new Promise((resolve,reject)=>{const ws=new WebSocket(wsURL);sockets.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});}
const send=(ws,msg)=>ws.send(JSON.stringify(msg));
const wait=(ws,pred,ms=3000)=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{ws.removeEventListener('message',on);reject(new Error('Timed out on WebSocket event'));},ms);function on(e){let m;try{m=JSON.parse(e.data);}catch{return;}if(pred(m)){clearTimeout(timeout);ws.removeEventListener('message',on);resolve(m);}}ws.addEventListener('message',on);});
const equip=async(ws,first,second)=>{const resp=wait(ws,m=>m.type==='power-state'&&m.powers.loadout[0]===first);send(ws,{type:'equip',loadout:[first,second]});return resp;};
test('real online players: passive revival prevents a kill, grants immunity, healing and barrel disguise are authoritative',async t=>{
 t.after(async()=>{for(const s of sockets)try{s.close();}catch{};await new Promise(r=>setTimeout(r,90));await new Promise(r=>server.close(r));});
 const a=await connect();const aj=wait(a,m=>m.type==='welcome');send(a,{type:'join',create:true,room:'PW24AA',name:'Atacante',loadout:['push','heal']});const wa=await aj;
 const b=await connect();const bj=wait(b,m=>m.type==='welcome');send(b,{type:'join',room:'PW24AA',name:'Defensor',loadout:['resurrection','heal']});const wb=await bj;
 const p=[...players.values()].find(x=>x.id===wa.id),q=[...players.values()].find(x=>x.id===wb.id);
 Object.assign(p,{x:0,y:0,z:18,yaw:0,pitch:0,lastFire:0});Object.assign(q,{x:0,y:0,z:11,yaw:Math.PI,pitch:0,hp:10,shield:0,spawnUntil:0});
 const event=wait(b,m=>m.type==='power-vfx'&&m.kind==='resurrection');send(a,{type:'fire'});const revived=await event;
 assert.equal(revived.player,wb.id);assert.equal(q.hp,100);assert.equal(q.shield,40);assert.equal(q.deaths,0);assert.equal(p.kills,0);
 assert.ok(q.powers.resurrectionUntil>Date.now()+3600);
 const previous=q.hp;send(a,{type:'fire'});await new Promise(r=>setTimeout(r,100));assert.equal(q.hp,previous,'Immortal player never takes a second hit');
 await equip(b,'heal','morph');Object.assign(q,{hp:22,shield:0});
 const healed=wait(b,m=>m.type==='power-state'&&m.powers.cooldowns.heal>Date.now());send(b,{type:'power',id:'heal'});await healed;
 assert.equal(q.hp,92);assert.equal(q.shield,25);
 const rejected=wait(b,m=>m.type==='power-error');send(b,{type:'power',id:'morph'});const error=await rejected;
 assert.match(error.message,/tambor/i);assert.equal(q.powers.cooldowns.morph,undefined,'Invalid disguise does not consume the skill');
 // A real authored street barrel, not an arbitrary client-supplied prop location.
 Object.assign(q,{x:-15,y:0,z:-18,lastMove:Date.now()});
 const transformed=wait(a,m=>m.type==='power-status'&&m.player===wb.id&&m.powers.propType==='barrel');send(b,{type:'power',id:'morph'});await transformed;
 assert.equal(q.powers.propType,'barrel');assert.equal(q.powers.propUntil>Date.now(),true);
 const cancel=wait(a,m=>m.type==='power-status'&&m.player===wb.id&&m.powers.propType===null);send(b,{type:'power',id:'morph',cancel:true});await cancel;
 assert.equal(q.powers.propType,null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {WORLD_HALF} from '../../public/src/worldLayout.js';
import {SQUAD_BLOCKS,SQUAD_START,SQUAD_POINTS,roleForHero,ROLE_INFO} from '../../public/src/squadLayout.js';
import {locationValid} from '../powers.mjs';
import {MAP_HALF,projectPlayer} from '../../public/src/minimap.js';
const colliders=JSON.parse(fs.readFileSync(new URL('../colliders.json',import.meta.url),'utf8'));
const interactive=JSON.parse(fs.readFileSync(new URL('../interactables.json',import.meta.url),'utf8'));
test('new tactical map retains synchronized browser/server collision boundaries',()=>{
 assert.equal(WORLD_HALF,219);assert.equal(MAP_HALF,WORLD_HALF);
 assert.equal(colliders.length,SQUAD_BLOCKS.length);assert.equal(interactive.length,8);
 assert.ok(projectPlayer(-215,0).x<20&&projectPlayer(215,0).x>220);
 assert.equal(locationValid(222,0,0,colliders),false);
 assert.equal(locationValid(SQUAD_START.x,0,SQUAD_START.z,colliders),true);
 for(const p of Object.values(SQUAD_POINTS))assert.equal(locationValid(p.x,0,p.z,colliders),true,p.label);
});
test('13 heroes distributed into all four squad specialties',async()=>{
 const {HEROES}=await import('../../public/src/heroRoster.js');
 const counts={front:0,support:0,sniper:0,bomber:0};
 for(const hero of HEROES){counts[roleForHero(hero.id)]++;assert.equal(hero.skills.length,3);}
 for(const role of Object.keys(ROLE_INFO))assert.ok(counts[role]>=3,role);
});
process.env.PORT='0';
const {server,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const all=[];
async function connect(){return new Promise((resolve,reject)=>{const ws=new WebSocket(url);all.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});}
function next(ws,filter,ms=2300){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.removeEventListener('message',listen);reject(Error('Timeout waiting for message'));},ms);const listen=e=>{let m;try{m=JSON.parse(e.data)}catch{return;}if(!filter(m))return;clearTimeout(timer);ws.removeEventListener('message',listen);resolve(m);};ws.addEventListener('message',listen);});}
test('online PvP spawns players across outpost and assigns individual FFA teams',async t=>{
 t.after(async()=>{for(const ws of all)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,60));await new Promise(r=>server.close(r));});
 const a=await connect();const entryA=next(a,m=>m.type==='welcome');a.send(JSON.stringify({type:'join',create:true,room:'SQUAD3',name:'Um',hero:'shiro'}));const wa=await entryA;
 const b=await connect();const entryB=next(b,m=>m.type==='welcome');b.send(JSON.stringify({type:'join',room:'SQUAD3',name:'Dois',hero:'atlas'}));const wb=await entryB;
 const room=rooms.get('SQUAD3');assert.ok(room);
 const p1=room.players.get(wa.id),p2=room.players.get(wb.id);
 assert.notEqual(p1.team,p2.team);
 assert.equal(locationValid(p1.x,0,p1.z,colliders),true);
 assert.equal(locationValid(p2.x,0,p2.z,colliders),true);
 assert.notEqual(p1.x,p2.x);
 assert.equal(room.openInteractions.size,0);
});

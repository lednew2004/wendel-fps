import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {WORLD_HALF,HOMES,INTERACTABLES,expandedBuildings,homeStaticColliders,homeFurniture} from '../../public/src/worldLayout.js';
import {locationValid,isGroundedDestination} from '../powers.mjs';
import {MAP_HALF,projectPlayer} from '../../public/src/minimap.js';
const colliders=JSON.parse(fs.readFileSync(new URL('../colliders.json',import.meta.url),'utf8'));
const interactive=JSON.parse(fs.readFileSync(new URL('../interactables.json',import.meta.url),'utf8'));

test('city expansion shares its new bounds, buildings and interactive openings with server and minimap',()=>{
 assert.equal(WORLD_HALF,219);assert.equal(MAP_HALF,WORLD_HALF);
 assert.ok(expandedBuildings().length>=60,'new neighborhoods with real building footprints');
 assert.equal(HOMES.length,6);assert.equal(INTERACTABLES.length,18);
 assert.equal(interactive.length,18);assert.ok(colliders.length>=230);
 assert.ok(projectPlayer(-215,0).x<20&&projectPlayer(215,0).x>220);
 assert.equal(locationValid(222,0,0,colliders),false);
 assert.equal(isGroundedDestination(-205,0,-175,colliders),true);
});

test('houses have front openings, actual room furniture collision, roofs and doorway apertures',()=>{
 for(const h of HOMES){
  const opening=INTERACTABLES.find(e=>e.id===`${h.id}-door`);
  const window=INTERACTABLES.find(e=>e.id===`${h.id}-window-l`);
  assert.ok(opening&&window);
  const walls=homeStaticColliders(h);
  assert.ok(walls.length>=9);assert.equal(homeFurniture(h).length,4);
  assert.equal(locationValid(opening.x,0,opening.z,walls),true,'an opened door is a true hole');
  assert.equal(locationValid(opening.x,0,opening.z,[...walls,opening]),false,'closed panel blocks door');
  assert.equal(locationValid(window.x,1.2,window.z,walls),true,'opened window has a climbable opening at height');
  assert.equal(locationValid(window.x,1.2,window.z,[...walls,window]),false,'closed window blocks passage');
  assert.ok(isGroundedDestination(h.x,h.h+.42,h.z,[...walls,{x:h.x,z:h.z,hx:h.w/2,hz:h.d/2,minY:h.h,maxY:h.h+.34}]),'roof remains walkable');
 }
});

process.env.PORT='0';
const {server,players,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const all=[];
async function connect(){return new Promise((resolve,reject)=>{const ws=new WebSocket(url);all.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});}
function next(ws,filter,ms=2300){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.removeEventListener('message',listen);reject(Error('Timeout waiting for message'));},ms);const listen=e=>{let m;try{m=JSON.parse(e.data)}catch{return;}if(!filter(m))return;clearTimeout(timer);ws.removeEventListener('message',listen);resolve(m);};ws.addEventListener('message',listen);});}
function send(ws,m){ws.send(JSON.stringify(m));}
test('online: a nearby player opens a house door, everybody sees it and late joiners inherit the state',async t=>{
 t.after(async()=>{for(const ws of all)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,60));await new Promise(r=>server.close(r));});
 const a=await connect();const enter=next(a,m=>m.type==='welcome');send(a,{type:'join',create:true,room:'HOUSE6',name:'Construtor'});const welcome=await enter;
 const b=await connect();const entry=next(b,m=>m.type==='welcome');send(b,{type:'join',room:'HOUSE6',name:'Visitante'});const wb=await entry;
 const room=rooms.get('HOUSE6'),p=room.players.get(welcome.id),other=room.players.get(wb.id);
 const door=INTERACTABLES.find(o=>o.kind==='door');
 const allDoors=room.openInteractions;
 const invalid=next(a,m=>m.type==='world-error');send(a,{type:'world-interact',id:door.id});assert.match((await invalid).message,/perto/i);
 assert.equal(allDoors.size,0);
 Object.assign(p,{x:door.x,y:0,z:door.z+2,lastMove:Date.now()-1000});
 const opened=next(b,m=>m.type==='world-interaction'&&m.id===door.id&&m.open);
 send(a,{type:'world-interact',id:door.id});await opened;assert.ok(allDoors.has(door.id));
 const c=await connect();const late=next(c,m=>m.type==='welcome');send(c,{type:'join',room:'HOUSE6',name:'Novo'});const w3=await late;assert.ok(w3.openInteractions.includes(door.id));
 // Occupied doorway cannot be slammed shut on a player.
 Object.assign(other,{x:door.x,y:0,z:door.z});
 const occupied=next(a,m=>m.type==='world-error');send(a,{type:'world-interact',id:door.id});assert.match((await occupied).message,/passagem/i);
 assert.ok(allDoors.has(door.id));
 Object.assign(other,{x:38,y:0,z:18});
 const closed=next(b,m=>m.type==='world-interaction'&&m.id===door.id&&!m.open);
 send(a,{type:'world-interact',id:door.id});await closed;assert.equal(allDoors.has(door.id),false);
 // The server still rejects an old disconnected client's custom session assumptions.
 assert.equal(room.players.size,3);
});

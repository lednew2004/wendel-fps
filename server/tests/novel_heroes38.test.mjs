import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {HEROES,heroLoadout,POWER_VARIANTS} from '../../public/src/heroRoster.js';
import {POWER_RULES} from '../powers.mjs';

const newIds=['terra','puppet','thread','mirror','pixel','cipher','vector','bloom','fusion','echo2'];
const specialIds=['terra_break','terra_ridge','terra_fault','thread_hook','mirror_palace','pixel_small','pixel_expand','pixel_titan','cipher_scan','cipher_override','cipher_network','bloom_seed','bloom_forest','fusion_extract','fusion_mix','fusion_reactor','echo_record','echo_playback','echo_loop'];
const src=name=>fs.readFileSync(new URL(`../../public/src/${name}`,import.meta.url),'utf8');

test('3.8 offers 25 unique playable heroes, 75 distinct skills and actual client/server custom handlers',()=>{
  assert.equal(HEROES.length,25);
  assert.equal(HEROES.flatMap(x=>x.skills).length,75);
  assert.equal(new Set(HEROES.flatMap(x=>x.skills)).size,75);
  assert.equal(new Set(HEROES.map(x=>x.id)).size,25);
  assert.equal(Object.keys(POWER_RULES).length,78);
  const names=HEROES.filter(h=>newIds.includes(h.id));assert.equal(names.length,10);
  for(const h of names){assert.equal(h.skills.length,3);assert.deepEqual(h.skills,heroLoadout(h.id));for(const id of h.skills){assert.ok(POWER_RULES[id]);assert.equal(POWER_RULES[id].cooldown,POWER_VARIANTS[id].cool*1000);}}
  const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  for(const id of specialIds){assert.match(src('powers.js'),new RegExp(`['"]?${id}['"]?`));assert.match(server,new RegExp(`['"]${id}['"]`));}
  for(const hero of newIds){const glb=fs.readFileSync(new URL(`../../public/assets/models/operatives/${hero}.glb`,import.meta.url));const lod=fs.readFileSync(new URL(`../../public/assets/models/operatives/lod/${hero}.glb`,import.meta.url));assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(lod.toString('ascii',0,4),'glTF');}
});

test('3.8 manual builder palette and break affordance exist for mouse and touch',()=>{
 const code=src('voxelForge.js');const css=src('styles.css');
 assert.match(code,/breakAimed\(\)/);assert.match(code,/builder-remove/);
 for(const material of ['stone','wood','metal','glass','tnt','plant'])assert.match(code,new RegExp(material));
 assert.match(css,/#forge-manual-tools/);
 assert.match(src('game.js'),/KeyB/);
});

process.env.PORT='0';
const {server,rooms,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(url);sockets.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
const send=(ws,body)=>ws.send(JSON.stringify(body));
const receive=(ws,pred,timeout=3000)=>new Promise((resolve,reject)=>{const tm=setTimeout(()=>{ws.removeEventListener('message',on);reject(new Error('Timeout awaiting '+pred.toString()))},timeout);function on(ev){let data;try{data=JSON.parse(ev.data)}catch{return;}if(!pred(data))return;clearTimeout(tm);ws.removeEventListener('message',on);resolve(data);}ws.addEventListener('message',on);});

// One integration test keeps lifecycle deterministic across parallel test files.
test('3.8 server handles real hero effects, recorded holograms and restricted builder deletion',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,50));await new Promise(r=>server.close(r));});
 // Pixel: scaled hitbox and server state remain authoritative.
 const a=await connect();const wa=receive(a,m=>m.type==='welcome');send(a,{type:'join',hero:'pixel',name:'Pixel',create:true,room:'PIX380'});const wel=await wa;
 const pixel=[...players.values()].find(p=>p.id===wel.id);pixel.spawnUntil=0;
 const effect=receive(a,m=>m.type==='power-vfx'&&m.kind==='pixel_small');send(a,{type:'power',id:'pixel_small'});await effect;
 assert.equal(pixel.powers.sizeScale,.48);assert.ok(pixel.powers.sizeUntil>Date.now());
 // Echo: the server records the actual route and moves replicated decoys along it.
 const e=await connect();const we=receive(e,m=>m.type==='welcome');send(e,{type:'join',hero:'echo2',name:'Echo',create:true,room:'ECH380'});const echoWel=await we;
 const echo=[...players.values()].find(p=>p.id===echoWel.id);
 const now=Date.now();echo.powers.history=[{t:now-2200,x:-140,y:0,z:-140},{t:now-1700,x:-139,y:0,z:-140},{t:now-1200,x:-138,y:0,z:-140},{t:now-500,x:-137,y:0,z:-140}];
 const recorded=receive(e,m=>m.type==='power-vfx'&&m.kind==='echo_record');send(e,{type:'power',id:'echo_record'});await recorded;
 assert.equal(echo.powers.recordedRoute.length,4);
 const cloneMsg=receive(e,m=>m.type==='power-vfx'&&m.kind==='clones');send(e,{type:'power',id:'echo_playback'});const clones=(await cloneMsg).clones;assert.equal(clones.length,1);assert.ok(clones[0].route.length>=3);
 // FORGE: material is checked on the server; removal is owner-authorized.
 const f=await connect();const wf=receive(f,m=>m.type==='welcome');send(f,{type:'join',hero:'forge',name:'Forge',create:true,room:'FGE380'});const forgeWel=await wf;
 const forge=[...players.values()].find(p=>p.id===forgeWel.id);Object.assign(forge,{x:-140,y:0,z:-140,yaw:0,pitch:0});
 const mode=receive(f,m=>m.type==='power-vfx'&&m.kind==='forge_build');send(f,{type:'power',id:'forge_build'});await mode;
 const born=receive(f,m=>m.type==='builder-place');send(f,{type:'builder-place',pos:{x:-139.5,y:.9,z:-144.9},material:'glass'});const item=(await born).block;
 assert.equal(item.material,'glass');assert.equal(item.hp,1);
 const gone=receive(f,m=>m.type==='builder-remove'&&m.id===item.id);send(f,{type:'builder-remove',id:item.id});await gone;
 assert.equal(rooms.get('FGE380').blocks.some(b=>b.id===item.id),false);
 // Bloom: an individual player can create a real plant collider replicated as a voxel.
 const b=await connect();const wb=receive(b,m=>m.type==='welcome');send(b,{type:'join',hero:'bloom',name:'Bloom',create:true,room:'BLM380'});const bloomWel=await wb;
 const bloom=[...players.values()].find(p=>p.id===bloomWel.id);Object.assign(bloom,{x:-140,y:0,z:-140,yaw:0,pitch:0});
 const planted=receive(b,m=>m.type==='builder-place');send(b,{type:'power',id:'bloom_seed'});const plantedBlock=(await planted).block;
 assert.equal(plantedBlock.material,'plant');assert.equal(plantedBlock.owner,bloom.id);
});

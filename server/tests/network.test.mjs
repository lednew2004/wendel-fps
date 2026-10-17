import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
process.env.PORT='0';
const {server,players,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const port=server.address().port;
const endpoint=`ws://127.0.0.1:${port}/ws`;
const clients=[];
async function connect(){const s=new WebSocket(endpoint);clients.push(s);await new Promise((resolve,reject)=>{s.addEventListener('open',resolve,{once:true});s.addEventListener('error',reject,{once:true});});return s;}
function next(ws,type,timeout=2500){return new Promise((resolve,reject)=>{let timer;const cb=e=>{let data;try{data=JSON.parse(e.data);}catch{return;}if(data.type!==type)return;clearTimeout(timer);ws.removeEventListener('message',cb);resolve(data);};timer=setTimeout(()=>{ws.removeEventListener('message',cb);reject(new Error(`Timeout ${type}`));},timeout);ws.addEventListener('message',cb);});}
function send(ws,obj){ws.send(JSON.stringify(obj));}
test('HTTP health, WebSocket room, positions, authoritative hit and respawn',async t=>{
  t.after(async()=>{for(const c of clients)c.close();await new Promise(r=>setTimeout(r,50));server.close();});
  const health=await fetch(`http://127.0.0.1:${port}/health`);assert.equal(health.status,200);assert.equal((await health.json()).ok,true);
  const first=await connect();const welcomeA=next(first,'welcome');send(first,{type:'join',create:true,name:'Jogador 1'});const a=await welcomeA;
  assert.match(a.room,/^[A-F0-9]{6}$/);assert.equal(a.players.length,1);
  const second=await connect();const welcomeB=next(second,'welcome');const joinedA=next(first,'joined');send(second,{type:'join',room:a.room,name:'Jogador 2'});const b=await welcomeB;await joinedA;
  assert.equal(b.room,a.room);assert.equal(b.players.length,2);
  assert.equal(players.size,2);assert.equal(rooms.size,1);
  // Place player pair in a straight unobstructed street. This bypasses input deliberately
  // to isolate server-side ray/hit/death logic from the movement limiter.
  const p1=players.get([...players.keys()][0]);const p2=players.get([...players.keys()][1]);
  Object.assign(p1,{x:0,y:0,z:18,yaw:0,pitch:0,weapon:2,lastFire:0});
  Object.assign(p2,{x:0,y:0,z:11,shield:0,hp:70,spawnUntil:0});
  const healthMsg=next(first,'health');const killMsg=next(first,'kill');const respawnMsg=next(second,'respawn',3800);
  send(first,{type:'fire'});
  const update=await healthMsg;assert.equal(update.id,p2.id);assert.equal(update.hp,0);
  const kill=await killMsg;assert.equal(kill.attacker,p1.id);assert.equal(kill.victim,p2.id);assert.equal(p1.kills,1);
  const respawn=await respawnMsg;assert.equal(respawn.hp,100);assert.equal(respawn.shield,40);
  const s=next(second,'snapshot');assert.equal((await s).players.length,2);
  const gone=next(first,'left');second.close();assert.equal((await gone).id,p2.id);
});

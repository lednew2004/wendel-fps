import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const endpoint=`ws://127.0.0.1:${server.address().port}/ws`;
const clients=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(endpoint);clients.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
const send=(ws,obj)=>ws.send(JSON.stringify(obj));
function wait(ws,predicate){return new Promise((resolve,reject)=>{const tm=setTimeout(()=>{ws.removeEventListener('message',receive);reject(new Error('Timeout esperando mensagem'));},2600);function receive(e){let m;try{m=JSON.parse(e.data)}catch{return;}if(predicate(m)){clearTimeout(tm);ws.removeEventListener('message',receive);resolve(m)}}ws.addEventListener('message',receive);});}
test('online authoritative dash: allowed once, repeated input gets remaining cooldown',async t=>{
 
 const ws=await connect(),welcome=wait(ws,m=>m.type==='welcome');send(ws,{type:'join',create:true,room:'CD25AB',name:'Dash'});const joined=await welcome;
 const p=[...players.values()].find(v=>v.id===joined.id);
 const first=wait(ws,m=>m.type==='dash-state');send(ws,{type:'dash'});assert.equal((await first).ok,true);
 assert.ok(Date.now()-p.lastDash<300);
 const second=wait(ws,m=>m.type==='dash-state');send(ws,{type:'dash'});const denied=await second;
 assert.equal(denied.ok,false);assert.ok(denied.remaining>4000);
 p.lastDash=Date.now()-4900;
 const third=wait(ws,m=>m.type==='dash-state');send(ws,{type:'dash'});assert.equal((await third).ok,true);
});
test('online critical healing: near-death heal has longer authoritative cooldown',async t=>{
 
 const ws=await connect(),welcome=wait(ws,m=>m.type==='welcome');send(ws,{type:'join',create:true,room:'CD25BC',name:'Curandeiro',loadout:['heal','push']});const joined=await welcome;
 const p=[...players.values()].find(v=>v.id===joined.id);p.hp=20;p.shield=0;
 const state=wait(ws,m=>m.type==='power-state'&&m.powers.cooldowns.heal>Date.now());send(ws,{type:'power',id:'heal'});const result=await state;
 assert.ok(result.powers.cooldowns.heal-Date.now()>22500);
 assert.equal(p.hp,90);assert.equal(p.shield,25);
});

after(async()=>{for(const ws of clients)try{ws.close()}catch{};await new Promise(r=>setTimeout(r,75));await new Promise(r=>server.close(r));});

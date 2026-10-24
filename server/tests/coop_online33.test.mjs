import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {SQUAD_POINTS,roleForHero} from '../../public/src/squadLayout.js';
import {newCoop,advanceCoop,coopSnapshot,coopFire,coopSupportPulse,COOP_STAGES} from '../coopEngine.mjs';

test('server cooperative engine waits for one hero from each position, then advances multi-stage mission',()=>{
 const list=[['a','shiro'],['b','guardian'],['c','riftwalker'],['d','leo']].map(([id,hero])=>({id,hero,x:0,z:-155,hp:100,shield:40,alive:true,socket:{},y:0}));
 const room={coop:newCoop(),players:new Map(list.map(p=>[p.id,p]))};
 const start=advanceCoop(room,.1);assert.ok(start.some(a=>a.phase==='defend'));
 assert.equal(room.coop.phase,'defend');assert.deepEqual(new Set(list.map(p=>roleForHero(p.hero))),new Set(['front','support','sniper','bomber']));
 list.find(p=>roleForHero(p.hero)==='support').x=SQUAD_POINTS.defense.x;
 list.find(p=>roleForHero(p.hero)==='support').z=SQUAD_POINTS.defense.z;
 advanceCoop(room,35);assert.equal(room.coop.phase,'recon');
 const sniper=list.find(p=>roleForHero(p.hero)==='sniper');sniper.x=SQUAD_POINTS.reconnaissance.x;sniper.z=SQUAD_POINTS.reconnaissance.z;
 advanceCoop(room,5);assert.equal(room.coop.phase,'sabotage');
 const bomber=list.find(p=>roleForHero(p.hero)==='bomber');bomber.x=SQUAD_POINTS.sabotage.x;bomber.z=SQUAD_POINTS.sabotage.z;
 advanceCoop(room,6);assert.equal(room.coop.phase,'boss');assert.ok(room.coop.enemies.some(e=>e.type==='boss'));
 const boss=room.coop.enemies.find(e=>e.type==='boss');
 assert.ok(boss.hp>0);room.coop.enemies=room.coop.enemies.filter(e=>e!==boss);
 advanceCoop(room,.1);assert.equal(room.coop.phase,'extract');
 for(const p of list){p.x=SQUAD_POINTS.extraction.x;p.z=SQUAD_POINTS.extraction.z;}
 advanceCoop(room,4);assert.equal(room.coop.phase,'victory');assert.ok(room.coop.finished);
 assert.equal(coopSnapshot(room).phase,'victory');assert.deepEqual(COOP_STAGES,['waiting','defend','recon','sabotage','boss','extract','victory']);
});

test('cooperative firearm damage is server-side, hitbox constrained and does not affect teammates',()=>{
 const p={id:'a',hero:'shiro',alive:true,x:0,z:0,kills:0};
 const room={coop:newCoop(),players:new Map([[p.id,p]])};room.coop.phase='boss';room.coop.enemies=[{id:'m1',type:'gunner',x:0,z:-12,hp:36,maxHp:36,v:{range:20}}];
 const rifle={id:0,damage:21,range:140};
 assert.equal(coopFire(room,p,[1,0,0],[0,1.65,0],rifle,()=>false),null);
 const hit=coopFire(room,p,[0,-.024,-.999],[0,1.65,0],rifle,()=>false);
 assert.equal(hit.id,'m1');assert.equal(hit.hp,15);
 const killed=coopFire(room,p,[0,-.024,-.999],[0,1.65,0],rifle,()=>false);
 assert.equal(killed.dead,true);assert.equal(p.kills,1);assert.equal(room.coop.enemies.length,0);
});


test('support healing reinforces only living allies in range and never heals enemies or other classes',()=>{
 const s={id:'s',hero:'guardian',socket:{},alive:true,x:0,z:0,hp:100,shield:40};
 const nearby={id:'a',hero:'shiro',socket:{},alive:true,x:12,z:4,hp:55,shield:10};
 const far={id:'b',hero:'leo',socket:{},alive:true,x:60,z:0,hp:55,shield:10};
 const room={coop:newCoop(),players:new Map([[s.id,s],[nearby.id,nearby],[far.id,far]])};
 assert.deepEqual(coopSupportPulse(room,s,'heal'),[{id:'a',hp:85,shield:30}]);
 assert.equal(far.hp,55);
 assert.deepEqual(coopSupportPulse(room,nearby,'heal'),[]);
 assert.deepEqual(coopSupportPulse(room,s,'shield'),[{id:'a',hp:85,shield:40}]);
});

process.env.PORT='0';
const {server,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const address=`ws://127.0.0.1:${server.address().port}/ws`;
const peers=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(address);peers.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
const wait=(ws,pred,timeout=3600)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.removeEventListener('message',handler);reject(Error('Coop WS timeout'));},timeout);
 const handler=e=>{let msg;try{msg=JSON.parse(e.data)}catch{return;}if(pred(msg)){clearTimeout(timer);ws.removeEventListener('message',handler);resolve(msg);}};ws.addEventListener('message',handler);
});

test('real WS coop room accepts four unique roles, rejects duplicate classes, replicates objectives and enemy hits',async t=>{
 t.after(async()=>{for(const ws of peers)try{ws.close()}catch{}await new Promise(r=>setTimeout(r,80));await new Promise(r=>server.close(r));});
 const slots=[['shiro','FRONT'],['guardian','SUPPORT'],['riftwalker','SNIPER'],['leo','BOMBER']];
 const join=async(hero,create=false)=>{const ws=await connect();const response=wait(ws,m=>m.type==='welcome'||m.type==='error');ws.send(JSON.stringify({type:'join',room:'COOP33',mode:'coop',create,hero,name:hero}));return {ws,response:await response};};
 const first=await join(slots[0][0],true);assert.equal(first.response.mode,'coop');
 const duplicate=await join('striker');assert.equal(duplicate.response.type,'error');assert.match(duplicate.response.message,/função diferente/i);
 const b=await join(slots[1][0]),c=await join(slots[2][0]),d=await join(slots[3][0]);
 const room=rooms.get('COOP33');assert.ok(room);assert.equal(room.players.size,4);
 assert.deepEqual(new Set([...room.players.values()].map(p=>roleForHero(p.hero))),new Set(['front','support','sniper','bomber']));
 // Four-player preparation activates shared PvE and the objective stream.
 const started=await wait(first.ws,m=>m.type==='coop-state'&&m.phase==='defend');assert.equal(started.roles.length,4);
 const p=room.players.get(first.response.id);Object.assign(p,{x:0,y:0,z:-145,yaw:0,pitch:-.02,lastFire:0});
 room.coop.enemies.push({id:'test-mob',type:'gunner',x:0,z:-157,hp:18,maxHp:18,cool:4,v:{hp:18,speed:0,damage:0,range:1}});
 const hitWait=wait(first.ws,m=>m.type==='coop-hit'&&m.id==='test-mob');first.ws.send(JSON.stringify({type:'fire'}));const hit=await hitWait;assert.equal(hit.dead,true);
 assert.equal(room.coop.enemies.some(e=>e.id==='test-mob'),false);
 assert.notEqual(room.mode,'ffa');
});

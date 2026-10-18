import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {HEROES,POWER_VARIANTS,heroById,heroLoadout,heroAllows} from '../../public/src/heroRoster.js';
import {POWER_RULES,sanitizeLoadout} from '../powers.mjs';
import {POWER_PRICES} from '../../public/src/casualEconomy.js';

test('thirteen authored characters have 39 distinct, functional techniques and clear low-detail identities',()=>{
 assert.equal(HEROES.length,14);
 const ids=HEROES.flatMap(h=>h.skills);
 assert.equal(ids.length,42);
 assert.equal(new Set(ids).size,42);
 assert.equal(Object.keys(POWER_VARIANTS).length,21);
 assert.equal(new Set(HEROES.map(h=>h.name)).size,14);
 assert.equal(new Set(HEROES.map(h=>h.color)).size,14);
 for(const h of HEROES){
  assert.equal(h.skills.length,3);
  assert.equal(heroById(h.id),h);
  assert.deepEqual(heroLoadout(h.id),h.skills);
  assert.ok(Number.isInteger(h.weapon)&&h.weapon>=0&&h.weapon<4);
  for(const id of h.skills){assert.ok(heroAllows(h.id,id));assert.ok(POWER_RULES[id],id);assert.ok(POWER_RULES[id].cooldown>=1000);assert.ok(id in POWER_RULES);}
 }
 assert.deepEqual(sanitizeLoadout(HEROES[0].skills),HEROES[0].skills);
 assert.equal(POWER_RULES.iceburst.duration,2400);
 assert.equal(POWER_RULES.chronoback.history,5000);
 assert.equal(POWER_RULES.pulsegravity.radius,17);
});

test('third power and chosen starting weapon exist in desktop and phone UI',()=>{
 const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 const game=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
 const powers=readFileSync(new URL('../../public/src/powers.js',import.meta.url),'utf8');
 const selection=readFileSync(new URL('../../public/src/heroSelection.js',import.meta.url),'utf8');
 assert.match(html,/id="power-c"/);
 assert.match(html,/data-power-target-slot="2"/);
 for(const key of ['Digit1','Digit2','Digit3'])assert.match(game,new RegExp(key));
 assert.match(game,/this\.weapons\.switchTo\(this\.heroSelection\?\.weapon/);
 assert.match(powers,/for\(let slot=0;slot<3;slot\+\+\)/);
 assert.match(selection,/hero-roster/);
 assert.match(selection,/hero-weapon/);
 assert.doesNotMatch(selection,/id="hero-starter"/);
});

process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(url);sockets.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
const send=(ws,data)=>ws.send(JSON.stringify(data));
const receive=(ws,pred,timeout=2800)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.removeEventListener('message',handler);reject(new Error('Timed out waiting for hero event'));},timeout);function handler(e){let m;try{m=JSON.parse(e.data);}catch{return;}if(pred(m)){clearTimeout(timer);ws.removeEventListener('message',handler);resolve(m);}}ws.addEventListener('message',handler);});

test('online hero, third ability, selected weapon and kit lock are validated by server',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close();}catch{}await new Promise(r=>setTimeout(r,60));await new Promise(r=>server.close(r));});
 const a=await connect();const joined=receive(a,m=>m.type==='welcome');
 send(a,{type:'join',create:true,room:'HERO29',name:'Escolha',hero:'cryomancer',weapon:2,loadout:['push','heal']});const welcome=await joined;
 assert.deepEqual(welcome.powers.loadout,HEROES[1].skills);
 const player=[...players.values()].find(x=>x.id===welcome.id);
 assert.equal(player.hero,'cryomancer');assert.equal(player.weapon,2);
 const b=await connect();const joinB=receive(b,m=>m.type==='welcome');
 send(b,{type:'join',room:'HERO29',name:'Outro',hero:'guardian',weapon:3});const other=await joinB;
 const match=other.players.find(x=>x.id===welcome.id);assert.equal(match.hero,'cryomancer');
 // Arbitrary powers from another character cannot overwrite the selected kit.
 const reply=receive(a,m=>m.type==='power-state');
 send(a,{type:'equip',loadout:['blackhole','flight','teleport']});const state=await reply;
 assert.deepEqual(state.powers.loadout,HEROES[1].skills);
 // New variants in the hero kit use real server-side effects and cooldowns.
 const enemy=[...players.values()].find(x=>x.id===other.id);
 Object.assign(player,{x:0,y:0,z:18,yaw:0,pitch:0});Object.assign(enemy,{x:0,y:0,z:11,spawnUntil:0});
 const applied=receive(a,m=>m.type==='power-state'&&m.powers.cooldowns.iceburst>Date.now());
 send(a,{type:'power',id:'iceburst'});const result=await applied;
 assert.ok(enemy.powers.frozenUntil>Date.now()+1300);
 assert.ok(result.powers.cooldowns.iceburst>Date.now());
 const failed=receive(a,m=>m.type==='power-error');send(a,{type:'power',id:'blackhole'});
 assert.match((await failed).message,/não equipada/i);
});

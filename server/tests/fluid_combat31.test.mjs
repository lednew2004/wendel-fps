import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {HERO_COMBOS} from '../../public/src/heroCombos.js';
import {POWER_RULES} from '../powers.mjs';

const motionSource=readFileSync(new URL('../../public/src/combatMotion.js',import.meta.url),'utf8');
const motionOnly=motionSource.split('export class CombatMotion')[0].replace("import * as THREE from 'three';",'');
const motion=await import('data:text/javascript,'+encodeURIComponent(motionOnly));
test('Shiro/Leo dash paths are eased, not instant teleports; Butterfly remains a teleport with portals',()=>{
 const from={x:0,y:0,z:0},to={x:0,y:0,z:-9};
 assert.deepEqual(motion.motionPoint(from,to,0),from);
 assert.deepEqual(motion.motionPoint(from,to,1),to);
 const mid=motion.motionPoint(from,to,.5);
 assert.ok(mid.z<0&&mid.z>-9);
 assert.ok(motion.DASH_DURATION_MS>=250&&motion.DASH_DURATION_MS<=500);
 assert.ok(motion.isAnimatedDash('shiro_step'));
 assert.ok(motion.isAnimatedDash('shiro_retreat'));
 assert.ok(motion.isAnimatedDash('leo_dash'));
 assert.ok(!motion.isAnimatedDash('butterfly_dash'));
});
test('recast windows last at least ten seconds and cooldown is separate',()=>{
 assert.ok(motion.COMBO_WINDOW_MS>=10000);
 for(const id of ['shiro_step','leo_dash','butterfly_dash','butterfly_orbit','butterfly_launch']){
   assert.ok(POWER_RULES[id].cooldown>=12000);
 }
 assert.ok(HERO_COMBOS.leo_dash.returnWindow>=10000);
 const serverCode=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(serverCode,/until:now\+12000/);
 assert.match(serverCode,/next\.until\+rule\.cooldown/);
 assert.match(serverCode,/kind:'combo-dash'/);
 assert.match(serverCode,/comboDashUntil/);
 const client=readFileSync(new URL('../../public/src/powers.js',import.meta.url),'utf8');
 const mp=readFileSync(new URL('../../public/src/multiplayer.js',import.meta.url),'utf8');
 assert.match(client,/motion\.startDash/);
 assert.match(client,/motion\.teleport/);
 assert.match(mp,/entry\.motion/);
});
process.env.PORT='0';
const {server,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const address=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
const connect=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(address);sockets.push(ws);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});});
function wait(ws,pred,timeout=3500){return new Promise((resolve,reject)=>{
 const to=setTimeout(()=>{ws.removeEventListener('message',f);reject(Error('Timeout waiting for effect'));},timeout);
 function f(event){let msg;try{msg=JSON.parse(event.data);}catch{return;}if(pred(msg)){clearTimeout(to);ws.removeEventListener('message',f);resolve(msg);}}
 ws.addEventListener('message',f);
});}
const send=(ws,msg)=>ws.send(JSON.stringify(msg));
test('online movement events contain complete dash path; Leo can return after a ten-second-equivalent stage',async t=>{
 t.after(async()=>{for(const ws of sockets)try{ws.close();}catch{}await new Promise(r=>setTimeout(r,65));await new Promise(r=>server.close(r));});
 const s=await connect();const welcomeS=wait(s,m=>m.type==='welcome');send(s,{type:'join',create:true,room:'DASH31',name:'Shiro',hero:'shiro'});const a=await welcomeS;
 const l=await connect();const welcomeL=wait(l,m=>m.type==='welcome');send(l,{type:'join',room:'DASH31',name:'Leo',hero:'leo'});const b=await welcomeL;
 const shiro=[...players.values()].find(p=>p.id===a.id),leo=[...players.values()].find(p=>p.id===b.id);
 Object.assign(shiro,{x:0,y:0,z:0,yaw:0,spawnUntil:0});
 const movement=wait(l,m=>m.type==='power-effect'&&m.kind==='combo-dash'&&m.player===a.id);
 const shiroState=wait(s,m=>m.type==='power-state'&&m.powers.combo.shiro_step?.step===1);
 send(s,{type:'power',id:'shiro_step'});
 const [dash,state]=await Promise.all([movement,shiroState]);
 assert.equal(dash.duration,motion.DASH_DURATION_MS);
 assert.deepEqual(dash.from,{x:0,y:0,z:0});
 assert.ok(dash.to.z<-3);
 assert.ok(state.powers.combo.shiro_step.until-Date.now()>10000);
 assert.ok(state.powers.cooldowns.shiro_step>state.powers.combo.shiro_step.until);
 Object.assign(leo,{x:0,y:0,z:0,yaw:0,spawnUntil:0});
 const cast=async()=>{const w=wait(l,m=>m.type==='power-state'&&m.powers.combo?.leo_dash!==undefined||m.type==='power-state'&&!m.powers.combo?.leo_dash);send(l,{type:'power',id:'leo_dash'});return w;};
 let msg=await cast();assert.equal(msg.powers.combo.leo_dash.step,1);
 // Simulate an eleven-second-old combo without waiting in wall-clock time.
 leo.powers.combo.leo_dash.until=Date.now()+850;
 msg=await cast();assert.equal(msg.powers.combo.leo_dash.step,2);
 msg=await cast();assert.equal(msg.powers.combo.leo_dash,undefined);
 assert.equal(leo.z,0);
 assert.ok(leo.powers.cooldowns.leo_dash-Date.now()>10000);
});

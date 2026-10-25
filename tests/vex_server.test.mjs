import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {findGrappleAnchor,targetScore,lineOfSight,VEX_TUNING} from '../public/src/vexPhysics.js';
const source=fs.readFileSync(new URL('../server/server.mjs',import.meta.url),'utf8');
const chunk=source.slice(source.indexOf('function vexState(p){'),source.indexOf('function onMessage(ws,data){'));
const messages=[],events=[];
const box={x:14,z:0,hx:2,hz:5,minY:0,maxY:20};
const sandbox={Math,Date,findGrappleAnchor,targetScore,lineOfSight,VEX_TUNING,
 roomColliders(){return [box];},send(_ws,pkt){messages.push(pkt);},broadcast(_room,pkt){events.push(pkt);},
 applyAbilityDamage(_caster,enemy,damage){enemy.hp-=damage;},console};
const context=vm.createContext(sandbox);vm.runInContext(chunk+'\nglobalThis.activate=vexActivation;globalThis.bladeHit=vexBladeHit;',context);
const foe={id:'enemy',x:9,y:0,z:0,team:1,alive:true,hp:100};
const players=new Map([[foe.id,foe]]);
const p={id:'vex',hero:'striker',x:0,y:0,z:0,yaw:-Math.PI/2,pitch:0,alive:true,team:0,room:{mode:'ffa',players},socket:{},powers:{loadout:['vault','wallrun_boost','vex_ultimate'],frozenUntil:0,gravityUntil:0}};
// Three authorized grapples; fourth must fail server-side.
for(let i=0;i<3;i++){context.activate(p,{skill:'vault',anchor:{x:12,y:1.5,z:0}});assert.equal(messages.at(-1).ok,true);}
context.activate(p,{skill:'vault',anchor:{x:12,y:1.5,z:0}});
assert.equal(messages.at(-1).ok,false,'server denies exceeding max stacks');
context.activate(p,{skill:'vex_ultimate',target:'enemy'});
assert.equal(messages.at(-1).ok,true,'server accepts valid blades');
assert.equal(p.vex.bladeTarget,'enemy','server validates aim before target lock');
// A fake remote hit must never cause damage, even if the user claims target ID.
context.bladeHit(p,{target:'random'});
assert.equal(foe.hp,100,'invalid hit does not deal damage');
// Fresh cast for next test (simulate recovered cooldown) and physical contact.
p.vex.bladeReadyAt=0;p.x=6.5;
context.activate(p,{skill:'vex_ultimate',target:'enemy'});
assert.equal(messages.at(-1).ok,true);
p.x=8.0;
context.bladeHit(p,{target:'enemy'});
assert.equal(foe.hp,15,'valid collision deals exactly 85 server-authoritative damage');
assert.equal(messages.at(-1).ok,true,'server confirms hit and immediate re-arm');
assert.ok(p.vex.bladeReadyAt-Date.now()<350,'confirmed hit restores ultimate');
console.log('PASS: server-authorized grapple stacks, aim lock, denied fake hit, 85 actual damage, re-arm');

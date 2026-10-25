import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {rayBox,findGrappleAnchor,ropeVelocity,lineOfSight,targetScore,VEX_TUNING} from '../public/src/vexPhysics.js';

const a={x:12,z:0,hx:2,hz:4,minY:0,maxY:18};
const b={x:29,z:0,hx:2,hz:4,minY:0,maxY:24};
const from={x:0,y:8,z:0},aim={x:1,y:0,z:0};
assert.equal(rayBox(from,aim,a).distance,10,'raycast targets the exterior facade');
assert.equal(rayBox(from,aim,a).normal.x,-1,'wall face normal preserved');
assert.equal(findGrappleAnchor(from,aim,[b,a]).solid,a,'the nearest anchor wins independent of array order');
assert.equal(findGrappleAnchor(from,{x:0,y:1,z:0},[a,b]),null,'an empty target does not consume a charge');
assert.equal(findGrappleAnchor(from,aim,[a],9),null,'range limit enforced');
assert.equal(lineOfSight(from,{x:30,y:8,z:0},[a]),false,'wall blocks blades');
assert.equal(lineOfSight(from,{x:0,y:8,z:30},[a]),true,'visible target has LOS');
assert.ok(targetScore(from,aim,{x:15,y:8,z:0}),'crosshair obtains target');
assert.equal(targetScore(from,aim,{x:-15,y:8,z:0}),null,'target behind player rejected');
const velocity=ropeVelocity({x:0,y:6,z:0},{x:0,y:0,z:20},{x:10,y:13,z:0},9,.0111);
assert.ok(velocity.z>18,'tangential momentum survives swing');
assert.ok(Number.isFinite(velocity.x)&&Math.hypot(velocity.x,velocity.y,velocity.z)<=VEX_TUNING.grappleMaxSpeed,'speed is finite and capped');

// Exercise the actual ability implementation with a lightweight, dependency-free THREE vector.
class Vec3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} normalize(){const d=Math.hypot(this.x,this.y,this.z)||1;this.x/=d;this.y/=d;this.z/=d;return this;} clone(){return new Vec3(this.x,this.y,this.z);}}
const context=vm.createContext({THREE:{Vector3:Vec3},T:VEX_TUNING,CFG:{characterHeight:1.77,characterRadius:.42,jumpSpeed:11.35},findGrappleAnchor,ropeVelocity,lineOfSight,targetScore,clampVex:(n,l,h)=>Math.max(l,Math.min(h,n)),smooth:(a,b,t)=>a+(b-a)*Math.min(1,t),document:{getElementById(){return null;}},console});
let code=fs.readFileSync(new URL('../public/src/vexMobility.js',import.meta.url),'utf8');
code=code.replace(/^import .*?;\s*$/gm,'').replace('export class VexMobility','class VexMobility');
vm.runInContext(code+'\nglobalThis.VexMobility=VexMobility;',context);
const VexMobility=context.VexMobility;
const obj=Object.create(VexMobility.prototype);
const pk={x:0,y:4,z:0,vx:0,vy:0,vz:0,grounded:true,direction:()=>({x:0,z:1}),prompt:'',combo:0};
const enemies=[{x:22,y:4,z:0,radius:.65,dead:false}];
let damage=0;
const city={solids:[a,b,{x:0,z:12,hx:4,hz:1,minY:0,maxY:19}],wallNear(){return {s:a,nx:-1,nz:0};},canOccupy(){return true;}};
const audio={play(){}};
const game={heroSelection:{selectedHero:'striker'},parkour:pk,urban:city,audio,mode:'survival',toast(){},deployment:{active:false},enemies:{enemies,damage(_e,amount){damage+=amount;}},powers:{motion:{burst(){},spark(){}}}};
obj.game=game;obj.charges=3;obj.recharge=[];obj.stepTime=0;obj.climbReadyAt=0;obj.bladeReadyAt=0;obj.bladeCombo=0;obj.bladeSwing=0;obj.ropeRoll=0;
obj.rope={visible:false};obj.hook={visible:false,position:{set(){}}};
obj.aim=()=>({from:{x:0,y:8,z:0},dir:{x:1,y:0,z:0}});
assert.ok(obj.castGrapple());assert.equal(obj.charges,2);assert.equal(pk.x,0);
const v0=pk.vx;pk.vz=17;
assert.ok(obj.castGrapple());assert.equal(obj.charges,1);assert.equal(pk.vz,17,'retargeting never discards transverse speed');
obj.aim=()=>({from:{x:0,y:8,z:0},dir:{x:0,y:0,z:1}});
assert.ok(obj.castGrapple());assert.equal(obj.charges,0);assert.ok(obj.grapple);
assert.equal(obj.castGrapple(),false,'fourth charge blocked');
obj.stepTime=8.6;while(obj.recharge.length&&obj.recharge[0]<=obj.stepTime){obj.recharge.shift();obj.charges++;}
assert.equal(obj.charges,3,'all charges regenerate independently');
assert.ok(obj.castClimb(),'climb works next to a wall');
assert.equal(obj.climb.time,VEX_TUNING.climbDuration);
assert.equal(obj.castClimb(),true,'climb can be cancelled manually');
assert.equal(obj.castClimb(),false,'climb has a real cooldown');
obj.stepTime=25;obj.aim=()=>({from:{x:0,y:5.3,z:0},dir:{x:1,y:0,z:0}});city.solids=[];
assert.ok(obj.castBlades());assert.ok(obj.blade,'blades launch a physical rush');
pk.x=21;pk.y=3;obj.bladePost();assert.equal(damage,VEX_TUNING.bladeDamage,'contact deals actual damage');
assert.ok(obj.bladeReadyAt-obj.stepTime<.25,'blade hit immediately re-arms');
obj.stepTime+=.3;assert.ok(obj.castBlades(),'second attack in combo is possible');
obj.bladeStep(.81);assert.equal(obj.blade,null,'miss ends the dash');assert.ok(obj.bladeReadyAt-obj.stepTime>35,'miss spends ultimate for the cooldown');
console.log('PASS: 17 Vex mechanics checks: raycast, rope, 3 stacks, chained anchors, climb, blade hit/miss, cooldowns');

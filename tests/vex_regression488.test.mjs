import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {VEX_TUNING,findGrappleAnchor,ropeVelocity,lineOfSight,targetScore,clampVex} from '../public/src/vexPhysics.js';
class Vec3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} normalize(){let d=Math.hypot(this.x,this.y,this.z)||1;this.x/=d;this.y/=d;this.z/=d;return this;} clone(){return new Vec3(this.x,this.y,this.z);}}
const context=vm.createContext({THREE:{Vector3:Vec3},T:VEX_TUNING,CFG:{characterHeight:1.77,characterRadius:.42,jumpSpeed:11.35},findGrappleAnchor,ropeVelocity,lineOfSight,targetScore,clampVex,smooth:(a,b,t)=>a+(b-a)*Math.min(1,t),document:{getElementById(){return null;}},console});
let code=fs.readFileSync(new URL('../public/src/vexMobility.js',import.meta.url),'utf8');
code=code.replace(/^import .*?;\s*$/gm,'').replace('export class VexMobility','class VexMobility');
vm.runInContext(code+'\nglobalThis.VexMobility=VexMobility;',context);
const VexMobility=context.VexMobility;
const box={x:12,z:0,hx:2,hz:5,minY:0,maxY:20};
const pk={x:0,y:5,z:0,vx:0,vy:0,vz:0,grounded:false,prompt:'',direction:()=>({x:0,z:0}),combo:0};
const city={solids:[box],wallNear(){return {s:box,nx:-1,nz:0};},canOccupy(x,z,y){return !((x>9.58&&x<14.42)&&(z>-5.42&&z<5.42)&&y<20-0.08);}};
const game={heroSelection:{selectedHero:'striker'},parkour:pk,urban:city,keys:{},audio:{play(){}},toast(){},mode:'survival',enemies:{enemies:[],damage(){}},powers:{motion:{burst(){},spark(){}}},deployment:{active:false}};
const v=Object.create(VexMobility.prototype); Object.assign(v,{game,stepTime:0,charges:3,recharge:[],climbReadyAt:0,bladeReadyAt:0,bladeCombo:0,bladeSwing:0,ropeRoll:0,rope:{visible:false},hook:{visible:false,position:{set(){}}}});
// Grapple must reel in toward the actual anchor without holding W.
v.grapple={anchor:{x:10,y:17,z:0},length:15,life:0};
const start=Math.hypot(10-pk.x,17-(pk.y+1.05));
for(let i=0;i<115;i++){
 const dt=1/90;
 pk.vy-=25*dt;
 v.ropeStep(dt);
 const nx=pk.x+pk.vx*dt, ny=Math.max(.03,pk.y+pk.vy*dt);
 // Simulation holds the world collision out, to verify inward drive separately.
 pk.x=nx;pk.y=ny;
 v.ropePost(dt);
}
const end=Math.hypot(10-pk.x,17-(pk.y+1.05));
assert.ok(end<start*.58,`the grapple should really pull to the anchor: ${start.toFixed(2)} -> ${end.toFixed(2)}`);
assert.ok(v.grapple?.length<10,'cable auto-reels while travelling');
// Switching a grapple may not erase momentum.
const oldV=pk.vz=12;v.aim=()=>({from:{x:0,y:7,z:0},dir:{x:1,y:0,z:0}});v.castGrapple();assert.equal(pk.vz,oldV);
// Climbing cannot warp player to the centre of a building, even huge ones.
const huge={x:135,z:0,hx:126,hz:35,minY:0,maxY:29};city.solids=[huge];pk.x=8.50;pk.y=6;pk.z=0;pk.vy=0;
city.wallNear=()=>({s:huge,nx:-1,nz:0});
city.canOccupy=()=>true;
assert.equal(v.castClimb(),true,'climb starts from an adjacent wall');
const startX=pk.x;
for(let i=0;i<20;i++){game.keys.KeyW=true;v.climbStep(1/90);assert.ok(Math.abs(pk.x-startX)<.2,'climb never teleports x across the building');}
assert.ok(pk.y>6.5,'climb increases vertical distance');
// Hitting during the offline blade rush immediately rewards another dash.
city.solids=[];v.climb=null;pk.x=0;pk.y=0;pk.z=0;game.keys={};v.bladeReadyAt=0;v.stepTime=100;
const foe={x:9,z:0,y:1.45,dead:false,radius:.7};let damage=0;game.enemies.enemies=[foe];game.enemies.damage=(_e,amt)=>{damage+=amt;};
v.aim=()=>({from:{x:0,y:1.72,z:0},dir:new Vec3(1,0,0)});
assert.equal(v.castBlades(),true);
pk.x=8.25;pk.y=0;
v.bladePost();assert.equal(damage,VEX_TUNING.bladeDamage);
assert.ok(v.bladeReadyAt-v.stepTime<=.08+.001);
v.stepTime+=.1;assert.equal(v.castBlades(),true,'successful blade attack becomes available again');
console.log('PASS: real grapple inward motion, anchor retarget momentum, no wall teleport, climb progress, repeatable blade hit');

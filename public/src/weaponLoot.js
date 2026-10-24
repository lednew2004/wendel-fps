import * as THREE from 'three';
import {WEAPONS} from './constants.js';
import {SQUAD_POINTS,SQUAD_START} from './squadLayout.js';

/** Armas representadas fisicamente no chão, adquiridas ao chegar perto ou apertar E. */
export class WeaponLoot{
 constructor(game){
  this.game=game;this.drops=[];this.unlocked=new Set([game.weapons?.index??0]);this.time=0;
  this.geometry={receiver:new THREE.BoxGeometry(.23,.16,.8),barrel:new THREE.CylinderGeometry(.042,.042,.7,8),mag:new THREE.BoxGeometry(.13,.28,.2),glow:new THREE.TorusGeometry(.6,.045,7,24)};
  this.materials=WEAPONS.map(w=>new THREE.MeshStandardMaterial({color:w.color,emissive:w.color,emissiveIntensity:.20,metalness:.50,roughness:.42}));
  this.labels=WEAPONS.map(w=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#061924e8';ctx.fillRect(0,0,256,64);ctx.strokeStyle='#7dece6';ctx.strokeRect(2,2,252,60);ctx.fillStyle='#e9ffff';ctx.font='bold 28px Arial';ctx.textAlign='center';ctx.fillText(w.name,128,41);return new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false});});
 }
 resetInventory(mode,starting){this.unlocked=new Set(WEAPONS.map((_,i)=>i));}
 clear(){for(const drop of this.drops)this.game.world.scene.remove(drop.mesh);this.drops.length=0;}
 findGround(x,z){
  const city=this.game.urban;
  for(let radius=0;radius<=14;radius+=2.5)for(let step=0;step<(radius===0?1:10);step++){
   const ang=step*Math.PI*2/10,px=x+radius*Math.cos(ang),pz=z+radius*Math.sin(ang);
   const y=city.floorAt(px,pz,0,.5);
   if(y>=0&&city.canOccupy(px,pz,y+.05,2,.8))return {x:px,y,z:pz};
  }return null;
 }
 spawn(index,x,z,life=0){
  if(this.game.mode==='multiplayer'||this.drops.length>=18||index<0||index>=WEAPONS.length)return false;
  const spot=this.findGround(x,z);if(!spot)return false;
  const mat=this.materials[index],mesh=new THREE.Group();
  const gun=new THREE.Mesh(this.geometry.receiver,mat);gun.rotation.x=-Math.PI/2;mesh.add(gun);
  const barrel=new THREE.Mesh(this.geometry.barrel,mat);barrel.rotation.x=Math.PI/2;barrel.position.z=-.65;mesh.add(barrel);
  const mag=new THREE.Mesh(this.geometry.mag,mat);mag.position.set(0,-.18,.02);mesh.add(mag);
  const ring=new THREE.Mesh(this.geometry.glow,mat);ring.rotation.x=Math.PI/2;ring.position.y=-.10;mesh.add(ring);
  const label=new THREE.Sprite(this.labels[index]);label.position.y=.95;label.scale.set(1.7,.45,1);mesh.add(label);
  mesh.position.set(spot.x,spot.y+.62,spot.z);this.game.world.scene.add(mesh);
  this.drops.push({index,mesh,spot,life,age:0});return true;
 }
 populate(){
  this.clear();if(this.game.mode==='multiplayer')return;
  const around=[
   [0,SQUAD_START.x+8,SQUAD_START.z+7],
   [1,SQUAD_START.x-9,SQUAD_START.z+9],
   [2,SQUAD_POINTS.defense.x+7,SQUAD_POINTS.defense.z+6],
   [3,SQUAD_POINTS.defense.x-8,SQUAD_POINTS.defense.z-6],
   [2,SQUAD_POINTS.reconnaissance.x+7,SQUAD_POINTS.reconnaissance.z+8],
   [3,SQUAD_POINTS.sabotage.x-6,SQUAD_POINTS.sabotage.z+8],
   [1,SQUAD_POINTS.boss.x+12,SQUAD_POINTS.boss.z-9]
  ];
  for(const [i,x,z] of around)this.spawn(i,x,z);
 }
 spawnNear(x,z,boss=false){
  if(this.drops.length>=14)return false;
  const missing=WEAPONS.map((_,i)=>i).filter(i=>!this.unlocked.has(i));
  const index=missing.length?missing[Math.floor(Math.random()*missing.length)]:Math.floor(Math.random()*WEAPONS.length);
  return this.spawn(index,x+(Math.random()-.5)*3,z+(Math.random()-.5)*3,boss?90:50);
 }
 collect(drop,equip=false){
  const i=drop.index;this.unlocked.add(i);
  const w=this.game.weapons.state[i];w.reserve=Math.max(w.reserve,WEAPONS[i].clip*3);w.clip=WEAPONS[i].clip;
  if(equip)this.game.weapons.switchTo(i);this.game.updateHud();this.game.toast('SUPRIMENTO: '+WEAPONS[i].name+' · F / 4 / RODA DO MOUSE PARA TROCAR');
  this.game.audio.play('pickup');this.game.world.scene.remove(drop.mesh);
  const pos=this.drops.indexOf(drop);if(pos!==-1)this.drops.splice(pos,1);
 }
 nearest(range=2.1){
  const p=this.game.parkour;
  return this.drops.filter(d=>Math.hypot(d.spot.x-p.x,d.spot.z-p.z)<range&&Math.abs(d.spot.y-p.y)<1.6).sort((a,b)=>Math.hypot(a.spot.x-p.x,a.spot.z-p.z)-Math.hypot(b.spot.x-p.x,b.spot.z-p.z))[0]||null;
 }
 interact(){
  if(this.game.state!=='playing'||this.game.mode==='multiplayer'||this.game.deployment?.active)return false;
  const item=this.nearest(2.3);if(!item)return false;this.collect(item,true);return true;
 }
 update(dt){
  if(this.game.state!=='playing')return;this.time+=dt;
  for(let i=this.drops.length-1;i>=0;i--){const d=this.drops[i];d.age+=dt;
   if(d.life&&d.age>d.life){this.game.world.scene.remove(d.mesh);this.drops.splice(i,1);continue;}
   d.mesh.rotation.y+=dt*.48;d.mesh.position.y=d.spot.y+.64+Math.sin(this.time*2+i)*.065;
  }
  if(this.game.deployment?.active)return;
  const item=this.nearest(1.25);if(item)this.collect(item,false);
 }
}

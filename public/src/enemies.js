import * as THREE from 'three';
import {ENEMY_TYPES,rand} from './constants.js';
import {createOperative,animateOperative,disposeOperative} from './characters.js';
import {CHARACTER_STYLES} from './characterIdentity.js';
import {SQUAD_INTERIORS,SQUAD_DOORS} from './squadLayout.js';
import {PROJECTILE_LIMIT,SPAWN_RADIUS,fireInterval,segmentSphereHit,steerVelocity} from './combatTactics.js';
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);


export class EnemySystem {
  constructor(world,audio,hooks){this.world=world;this.audio=audio;this.hooks=hooks;this.enemies=[];this.projectiles=[];this.particles=[];this.pickups=[];this.allies=[];this.time=0;this.maxParticles=260;this.particleGeo=new THREE.TetrahedronGeometry(.1);this.particleMaterials=new Map();this.projectileMat=new THREE.MeshBasicMaterial({color:0xffe2aa,toneMapped:false,depthWrite:false});this.projectileBossMat=new THREE.MeshBasicMaterial({color:0xe9aaff,toneMapped:false,depthWrite:false});this.tracerMat=new THREE.MeshBasicMaterial({color:0xffdfa4,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});this.bossTracerMat=new THREE.MeshBasicMaterial({color:0xc987ff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});this.projectileGeom=new THREE.SphereGeometry(.12,8,6);this.projectileBossGeom=new THREE.SphereGeometry(.20,8,6);this.tracerGeom=new THREE.CylinderGeometry(.027,.085,1,6,1);this.muzzleGeom=new THREE.SphereGeometry(.22,7,5);}
  clear(){for(const e of this.enemies){this.world.scene.remove(e.group);this.disposeEnemy(e);if(e.laser)this.world.scene.remove(e.laser);if(e.warning)this.world.scene.remove(e.warning);}for(const b of this.projectiles)this.removeProjectile(b);for(const p of this.particles)this.world.scene.remove(p.mesh);for(const d of this.pickups)this.world.scene.remove(d.mesh);this.enemies=[];this.projectiles=[];this.particles=[];this.pickups=[];}
  count(){return this.enemies.length;}
  disposeEnemy(e){
    if(!e?.body)return;
    disposeOperative(e.body);
    e.bar?.geometry?.dispose();e.barBg?.geometry?.dispose();
    e.bar?.material?.dispose();e.barBg?.material?.dispose();
    e.nameTag?.material?.map?.dispose();e.nameTag?.material?.dispose();e.muzzleFlash?.material?.dispose();
    if(e.laser){e.laser.geometry.dispose();e.laser.material.dispose();}
    if(e.warning){e.warning.geometry.dispose();e.warning.material.dispose();}
  }


  spawn(type,pos,wave=1){
    const cfg=ENEMY_TYPES[type];
    const group=new THREE.Group(); group.position.set(pos[0],0,pos[1]);
    const size=cfg.scale;
    // Dedicated humanoid character renderer: organic silhouette, facial features,
    // jointed limbs, class-colored armor and fully modeled weapons.
    const body=createOperative({role:type,size});
    group.add(body);
    const title=document.createElement('canvas');title.width=256;title.height=38;
    const labelCtx=title.getContext('2d');
    labelCtx.font='bold 23px Arial';labelCtx.textAlign='center';
    labelCtx.shadowColor='#101923';labelCtx.shadowBlur=6;
    labelCtx.fillStyle='#f4f7ef';
    labelCtx.fillText(CHARACTER_STYLES[type]?.name||'INIMIGO',128,27,248);
    const nameMap=new THREE.CanvasTexture(title);nameMap.colorSpace=THREE.SRGBColorSpace;
    const nameTag=new THREE.Sprite(new THREE.SpriteMaterial({map:nameMap,transparent:true,depthWrite:false}));
    nameTag.position.y=3.26*size;nameTag.scale.set(1.95*size,.28*size,1);group.add(nameTag);
    const barBg=new THREE.Mesh(new THREE.PlaneGeometry(1.85*size,.12),new THREE.MeshBasicMaterial({color:0x281c26,side:THREE.DoubleSide,depthWrite:false})); barBg.position.y=2.95*size; group.add(barBg);
    const bar=new THREE.Mesh(new THREE.PlaneGeometry(1.85*size,.085),new THREE.MeshBasicMaterial({color:cfg.color,side:THREE.DoubleSide,depthWrite:false})); bar.position.y=2.95*size; bar.position.z=.008; group.add(bar);
    this.world.scene.add(group);
    const hp=cfg.hp*(1+(wave-1)*.105);
    const tunedCfg={...cfg,speed:cfg.speed*(type==='boss'?1.20:1.14),fire:fireInterval(type,cfg.fire),damage:cfg.damage*(type==='boss'?.78:type==='gunner'?.75:1)};
    const enemy={type,cfg:tunedCfg,group,body,barBg,bar,nameTag,hp,maxHp:hp,x:pos[0],z:pos[1],y:1.45*size,radius:cfg.radius,fireTimer:rand(.16,.58),burstLeft:0,velocityX:0,velocityZ:0,coverHold:0,coverFlank:0,strafe:Math.random()>.5?1:-1,strafeChange:rand(.7,2.0),dodgeTime:0,flash:0,fireVisual:0,lastMoving:0,phase:rand(0,6.3),boss:type==='boss',phaseIndex:0,telegraph:0,blastTimer:8,blastCharge:0,dead:false};
    if(!['scout','hunter','tank'].includes(type)){
      const flash=new THREE.Mesh(this.muzzleGeom,new THREE.MeshBasicMaterial({color:type==='boss'?0xec8cff:0xffd18a,transparent:true,opacity:.88,depthWrite:false}));
      flash.position.set(0,enemy.y,-.75*size);flash.visible=false;group.add(flash);enemy.muzzleFlash=flash;
    }
    if(type==='sniper'){
      const geometry=new THREE.BufferGeometry().setFromPoints([vec(),vec()]);
      const material=new THREE.LineBasicMaterial({color:0xffd7b3,transparent:true,opacity:.72,depthTest:true});
      enemy.laser=new THREE.Line(geometry,material); enemy.laser.visible=false; this.world.scene.add(enemy.laser);
    }
    if(type==='boss'){
      const material=new THREE.MeshBasicMaterial({color:0xc36f50,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false});
      enemy.warning=new THREE.Mesh(new THREE.RingGeometry(1.0,1.1,64),material); enemy.warning.rotation.x=-Math.PI/2; enemy.warning.visible=false; this.world.scene.add(enemy.warning);
    }
    this.enemies.push(enemy); return enemy;
  }

  /** Place reinforcements within fighting range without materializing inside walls or on top of the player. */
  spawnAt(type,player,wave){
    const radius=ENEMY_TYPES[type].radius+.30,city=this.world.city;
    const clear=(x,z)=>city?.canOccupy(x,z,0,1.9,radius)??this.world.canMove(x,z,radius);
    const valid=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&clear(x,z)&&Math.hypot(x-player.x,z-player.z)>SPAWN_RADIUS.min;
    const taken=(x,z)=>this.enemies.some(e=>Math.hypot(e.x-x,e.z-z)<5.5);
    const spots=[];
    for(let i=0;i<26;i++){
      const a=Math.random()*Math.PI*2,dist=rand(SPAWN_RADIUS.min,SPAWN_RADIUS.max);
      const x=player.x+Math.cos(a)*dist,z=player.z+Math.sin(a)*dist;
      if(valid(x,z)&&!taken(x,z))spots.push([x,z]);
    }
    // Real-city geography and original arena both have their own collision-safe spawn lists.
    for(const [x,z] of this.world.spawnPoints||[]){if(valid(x,z)&&!taken(x,z))spots.push([x,z]);}
    // Dense neighborhoods can have very little free ground: widen the search instead of stalling the wave.
    if(!spots.length)for(let i=0;i<55;i++){
      const angle=rand(-Math.PI,Math.PI),r=rand(12,95),x=player.x+Math.cos(angle)*r,z=player.z+Math.sin(angle)*r;
      if(clear(x,z)&&Math.hypot(x-player.x,z-player.z)>12&&!taken(x,z))spots.push([x,z]);
    }
    if(!spots.length)return null;
    spots.sort((a,b)=>Math.abs(Math.hypot(a[0]-player.x,a[1]-player.z)-35)-Math.abs(Math.hypot(b[0]-player.x,b[1]-player.z)-35));
    const eligible=spots.slice(0,Math.min(spots.length,12));
    // Prefer cover between the spawn and the player: enemies advance into view naturally.
    const sheltered=eligible.filter(([x,z])=>{
      const eye=vec(player.x,player.eyeY||1.7,player.z),delta=vec(x,1.5,z).sub(eye),d=delta.length();
      return this.world.raycastDistance(eye,delta.normalize(),d-.12)<d-.25;
    });
    const choices=sheltered.length?sheltered:eligible;
    const enemy=this.spawn(type,choices[Math.floor(Math.random()*Math.min(choices.length,5))],wave);
    // Radio alert contains the last reported player location, not an updating through-wall lock.
    enemy.targetMemory={x:player.x,z:player.z,eyeY:player.eyeY??1.65,until:this.time+4.6,kind:'alert'};
    enemy.alertness=.24;
    return enemy;
  }
  spawnParticles(at,color,count=10,power=1){let mat=this.particleMaterials.get(color);if(!mat){mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85});this.particleMaterials.set(color,mat);}for(let i=0;i<count;i++){if(this.particles.length>=this.maxParticles){const old=this.particles.shift();this.world.scene.remove(old.mesh);}const mesh=new THREE.Mesh(this.particleGeo,mat);mesh.position.copy(at);mesh.scale.setScalar(rand(.6,1.6)*power);this.world.scene.add(mesh);const life=rand(.25,.85);this.particles.push({mesh,velocity:vec(rand(-7,7),rand(0,9),rand(-7,7)).multiplyScalar(power),life,maxLife:life,scale:mesh.scale.x});}}
  hearShot(x,z,loudness=1){
    const time=this.time;
    for(const enemy of this.enemies){
      if(Math.hypot(enemy.x-x,enemy.z-z)>(enemy.boss?110:55)*loudness)continue;
      // Hearing offers a SEARCH POSITION, not an invisible wallhack or hit lock.
      enemy.targetMemory={x,z,eyeY:1.65,until:time+3.8,kind:'noise'};
    }
  }
  canSee(e,target,dist){
    if(dist>Math.max(45,e.cfg.range*1.12))return false;
    const dx=(target.x-e.x)/Math.max(.01,dist),dz=(target.z-e.z)/Math.max(.01,dist);
    if(e.facingX!==undefined&&dx*e.facingX+dz*e.facingZ<-.30)return false;
    const from=vec(e.x,(e.floorY||0)+1.52,e.z);
    const to=vec(target.x,target.eyeY??1.65,target.z);
    const delta=to.sub(from),length=delta.length();
    return length>0.2&&this.world.raycastDistance(from,delta.normalize(),length-.15)>=length-.30;
  }
  // Small shared-door navigation plan: investigate a sound inside a building,
  // move toward the public entrance, and use the actual opening. It does not
  // reveal the hidden player's position and never ghosts through a closed door.
  navigateTo(e,target){
    const city=this.world.city;
    if(!city||!target||city.isGeoCity)return target;
    for(const b of SQUAD_INTERIORS){
      const within=p=>Math.abs(p.x-b.x)<b.hx-.55&&Math.abs(p.z-b.z)<b.hz-.55;
      const inMe=within(e),inTarget=within(target);
      if(inMe===inTarget)continue;
      const door=SQUAD_DOORS.find(d=>d.id===`${b.id}-door`);
      if(Math.hypot(e.x-door.x,e.z-door.z)<3.4){
        const nearby=city.nearestInteractable(e.x,e.z,e.floorY||0,3.5);
        if(nearby?.id===door.id&&!nearby.open)city.toggleInteractable(door.id,true);
      }
      if(inMe)return {x:door.x,z:door.z+2.0};
      const entryDistance=Math.hypot(e.x-door.x,e.z-(door.z+1.5));
      // The first stage guides the bot around the rear corners when required.
      if(e.z<b.z-b.hz-1.2&&Math.abs(e.x-b.x)<b.hx+2){
        return {x:b.x+(e.x>b.x?1:-1)*(b.hx+2.1),z:door.z+2.7};
      }
      return entryDistance<2.1?{x:door.x,z:door.z-2.7}:{x:door.x,z:door.z+1.5};
    }
    return target;
  }
  /** Seek actual solid cover: requires a blocker between the target and the hiding spot. */
  findCover(e,target){
    const city=this.world.city,world=this.world;
    if(!target||!city?.solids)return null;
    let best=null,bestScore=Infinity,checked=0;
    const obstacles=city.solids;
    const origin=vec(target.x,target.eyeY??1.65,target.z);
    for(const o of obstacles){
      if(++checked>2000)break;
      if(o.active===false||o.maxY!==undefined&&o.maxY<1.5||o.h!==undefined&&o.h<1.5)continue;
      const ox=o.x??0,oz=o.z??0;
      const separation=Math.hypot(ox-e.x,oz-e.z);
      if(separation>21||separation<2||Math.hypot(ox-target.x,oz-target.z)<3)continue;
      const ux=ox-target.x,uz=oz-target.z,len=Math.hypot(ux,uz);
      if(len<.1)continue;
      const hx=o.hx??((o.w??2)/2),hz=o.hz??((o.d??2)/2);
      const r=(Math.abs(ux/len)*hx+Math.abs(uz/len)*hz)+e.radius+1.1;
      const x=ox+ux/len*r,z=oz+uz/len*r;
      if(!city.canOccupy(x,z,e.floorY||0,1.85,e.radius))continue;
      const delta=vec(x,1.48,z).sub(origin),dist=delta.length();
      if(dist<2||world.raycastDistance(origin,delta.normalize(),dist-.12)>dist-.35)continue;
      const score=separation+Math.hypot(x-e.x,z-e.z)*.75+Math.random()*1.2;
      if(score<bestScore){bestScore=score;best={x,z,eyeY:1.6};}
    }
    return best;
  }
  removeProjectile(b){this.world.scene.remove(b.mesh);if(b.tracer)this.world.scene.remove(b.tracer);}
  /** Distinct muzzle flash + emissive moving round + visible trail (not hitscan damage). */
  spawnProjectile(e,target,angle=0){
    if(this.projectiles.length>=PROJECTILE_LIMIT){this.removeProjectile(this.projectiles.shift());}
    const start=e.group.position.clone().add(vec(0,e.y,0));
    const aim=vec(target.x,target.eyeY??1.65,target.z);
    const spread=e.boss?.040:e.type==='sniper'?.010:.052;
    const dir=aim.sub(start).normalize().applyAxisAngle(vec(0,1,0),angle+rand(-spread,spread));
    start.addScaledVector(dir,.85*e.cfg.scale);
    const boss=e.boss,mesh=new THREE.Mesh(boss?this.projectileBossGeom:this.projectileGeom,boss?this.projectileBossMat:this.projectileMat);
    mesh.position.copy(start);
    const tracer=new THREE.Mesh(this.tracerGeom,boss?this.bossTracerMat:this.tracerMat);
    tracer.quaternion.setFromUnitVectors(vec(0,1,0),dir);tracer.scale.y=boss?2.1:1.50;
    tracer.position.copy(start).addScaledVector(dir,boss?-1.05:-.75);
    this.world.scene.add(mesh,tracer);
    if(e.muzzleFlash){e.muzzleFlash.visible=true;e.muzzleFlash.scale.setScalar(rand(1,1.5));}
    e.fireVisual=.16;
    const speed=boss?39:e.type==='sniper'?72:49;
    this.projectiles.push({mesh,tracer,vel:dir.multiplyScalar(speed),life:e.cfg.range/speed+.4,damage:e.cfg.damage,boss,target});
  }
  raycast(origin,dir,maxDist){let hit=null;let dist=maxDist;for(const e of this.enemies){const center=e.group.position.clone().add(vec(0,e.y,0));const radius=e.boss?2.75:e.radius*1.12;const oc=origin.clone().sub(center);const b=oc.dot(dir),c=oc.lengthSq()-radius*radius,discriminant=b*b-c;if(discriminant<0)continue;const t=-b-Math.sqrt(discriminant);if(t>0&&t<dist){dist=t;hit={enemy:e,distance:t,point:origin.clone().addScaledVector(dir,t),headshot:!e.boss&&origin.y+dir.y*t>e.y+.52};}}return hit;}
  damage(e,amount,point,source='shot'){if(!e||e.dead)return false;e.hp-=amount;e.flash=.10;if(!e.boss&&e.dodgeTime<=0){e.strafe*=-1;e.strafeChange=rand(.18,.55);e.dodgeTime=rand(.35,.7);}if(e.boss&&e.hp>0){const stage=e.hp/e.maxHp<.25?2:e.hp/e.maxHp<.56?1:0;if(stage>e.phaseIndex){e.phaseIndex=stage;e.cfg={...e.cfg,speed:e.cfg.speed*(stage===2?1.32:1.18),fire:e.cfg.fire*(stage===2?.66:.78)};this.spawnParticles(e.group.position.clone().add(vec(0,e.y,0)),0xb1674a,38,2);if(this.currentPlayer){this.spawnAt('hunter',this.currentPlayer,this.currentWave||1);this.spawnAt('scout',this.currentPlayer,this.currentWave||1);this.hooks.onSummon?.(2);}}}this.spawnParticles(point||e.group.position.clone().add(vec(0,e.y,0)),0xd7c1a1,source==='pulse'?12:3,source==='pulse'?1.2:.5);if(e.hp<=0){e.dead=true;this.kill(e);return true;}return false;}
  kill(e){this.world.scene.remove(e.group);this.disposeEnemy(e);if(e.laser)this.world.scene.remove(e.laser);if(e.warning)this.world.scene.remove(e.warning);const ix=this.enemies.indexOf(e);if(ix!==-1)this.enemies.splice(ix,1);this.spawnParticles(e.group.position.clone().add(vec(0,e.y,0)),0xb79774,e.boss?45:17,e.boss?2.2:1.2);this.audio.play('kill');this.hooks.onKill(e);if(e.boss||Math.random()<.35)this.drop(e.group.position,e.boss?'medkit':Math.random()<.72?'ammo':'medkit');}
  drop(position,type){const mat=new THREE.MeshStandardMaterial({color:type==='medkit'?0x7ea58b:0xffc458,metalness:.13,roughness:.48,emissive:type==='medkit'?0x203829:0x8e4e17,emissiveIntensity:type==='ammo'?.82:.55});const mesh=new THREE.Group();const core=new THREE.Mesh(new THREE.BoxGeometry(.55,.3,.55),mat);mesh.add(core);const ring=new THREE.Mesh(new THREE.TorusGeometry(.52,.04,8,24),mat);ring.rotation.x=Math.PI/2;mesh.add(ring);mesh.position.set(position.x,.75,position.z);this.world.scene.add(mesh);this.pickups.push({mesh,type,life:type==='ammo'?35:18,phase:rand(0,7)});}
  update(dt,player,wave=1){this.currentPlayer=player;this.currentWave=wave;this.time+=dt;for(const e of [...this.enemies]){e.flash=Math.max(0,e.flash-dt);e.fireVisual=Math.max(0,(e.fireVisual||0)-dt);if(e.muzzleFlash)e.muzzleFlash.visible=e.fireVisual>0;
      animateOperative(e.body,dt,{moving:e.lastMoving||0,firing:e.fireVisual>0,frozen:e.frozenUntil>Date.now(),hit:e.flash>0,distance:Math.hypot(e.x-player.x,e.z-player.z)});
      e.phase+=dt*(e.boss?1.7:3.2);e.group.position.y=e.gravityUntil>Date.now()?2.7+Math.sin(e.phase)*.15:Math.sin(e.phase)*.04; e.bar.scale.x=Math.max(0,e.hp/e.maxHp);e.bar.position.x=-(1-e.bar.scale.x)*.925*e.cfg.scale;const camPos=new THREE.Vector3();this.world.camera.getWorldPosition(camPos);e.bar.lookAt(camPos);e.barBg.lookAt(camPos);if(e.frozenUntil>Date.now()){e.fireTimer=Math.max(.15,e.fireTimer);continue;}const decoy=this.decoys?.find(d=>d.until>Date.now()&&Math.hypot(d.mesh.position.x-e.x,d.mesh.position.z-e.z)<24);
      const viable=[...(this.hiddenPlayer?[]:[player]),...(this.allies||[]).filter(a=>!a.downed)];
      e.perceptionDelay=(e.perceptionDelay||0)-dt;
      if(e.perceptionDelay<=0){
        e.perceptionDelay=rand(.12,.23);e.visibleTarget=null;
        const visible=viable.filter(t=>this.canSee(e,t,Math.hypot(t.x-e.x,t.z-e.z)));
        visible.sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-(a.role==='front'?4:0)-Math.hypot(b.x-e.x,b.z-e.z)+(b.role==='front'?4:0));
        if(visible.length){
          const t=visible[0];e.visibleTarget=t;
          e.targetMemory={x:t.x,z:t.z,eyeY:t.eyeY||1.65,until:this.time+3.2,kind:'sighted'};
          e.alertness=Math.min(1,(e.alertness||0)+.43);
        }else e.alertness=Math.max(0,(e.alertness||0)-.23);
      }
      const remembered=e.targetMemory&&e.targetMemory.until>this.time?e.targetMemory:null;
      if(!e.patrolPoint||Math.hypot(e.x-e.patrolPoint.x,e.z-e.patrolPoint.z)<2){
        e.patrolPoint={x:(e.homeX??e.x)+rand(-13,13),z:(e.homeZ??e.z)+rand(-13,13),eyeY:1.65};
      }
      e.homeX??=e.x;e.homeZ??=e.z;
      const targetVisible=!!e.visibleTarget;
      const chase=decoy?{x:decoy.mesh.position.x,z:decoy.mesh.position.z,eyeY:decoy.mesh.position.y}:e.visibleTarget||remembered||e.patrolPoint;
      if(remembered&&Math.hypot(e.x-remembered.x,e.z-remembered.z)<2&&!targetVisible)e.targetMemory=null;
      e.coverCheck=(e.coverCheck||0)-dt;
      const ranged=!['scout','tank','hunter'].includes(e.type);
      if(e.coverCheck<=0){
        e.coverCheck=rand(1.7,2.8);
        // Shooters actively use buildings and barriers; wounded bots prioritize cover.
        if(targetVisible&&ranged&&!e.boss&&Math.hypot(e.x-chase.x,e.z-chase.z)<34&&(!e.coverSpot||e.hp/e.maxHp<.55))
          e.coverSpot=this.findCover(e,chase);
        if(!targetVisible&&!remembered)e.coverSpot=null;
      }
      if(e.coverSpot&&Math.hypot(e.x-e.coverSpot.x,e.z-e.coverSpot.z)<1.55){e.coverSpot=null;e.coverHold=rand(.65,1.3);}
      e.coverHold=Math.max(0,(e.coverHold||0)-dt);
      const nav=this.navigateTo(e,e.coverSpot||chase);const dx=nav.x-e.x,dz=nav.z-e.z,dist=Math.max(.0001,Math.hypot(dx,dz)),nx=dx/dist,nz=dz/dist;const faceX=(targetVisible?chase.x:nav.x)-e.x,faceZ=(targetVisible?chase.z:nav.z)-e.z,faceLen=Math.max(.001,Math.hypot(faceX,faceZ));e.group.rotation.y=Math.atan2(-faceX,-faceZ);e.facingX=faceX/faceLen;e.facingZ=faceZ/faceLen;e.fireTimer-=dt;e.strafeChange-=dt;if(e.strafeChange<0){e.strafe*=-1;e.strafeChange=rand(.75,2.2);}let fx=0,fz=0;const melee=e.type==='scout'||e.type==='tank'||e.type==='hunter';const optimal=e.boss?20:e.type==='sniper'?33:e.type==='gunner'?19:melee?e.cfg.range*.9:7;if(e.coverSpot){fx+=nx;fz+=nz;}else if(e.coverHold>0){fx=0;fz=0;}else if(targetVisible&&e.hp/e.maxHp<.3&&!e.boss){fx-=nx;fz-=nz;}else if(dist>optimal+2){fx+=nx;fz+=nz;}else if(dist<optimal-4&&!melee){fx-=nx*.65;fz-=nz*.65;}if(!e.coverSpot&&(!melee||dist<optimal+8)){const flank=e.coverHold>0?0:e.dodgeTime>0?1.6:(e.boss?.7:.82);fx+=(-nz)*e.strafe*flank;fz+=nx*e.strafe*flank;}e.dodgeTime=Math.max(0,(e.dodgeTime||0)-dt);const desired=steerVelocity(e.velocityX||0,e.velocityZ||0,fx,fz,e.cfg.speed,dt);e.velocityX=desired.x;e.velocityZ=desired.z;
      const canStep=(x,z)=>this.world.city?.canOccupy(x,z,e.floorY||0,1.8,e.radius)??this.world.canMove(x,z,e.radius);
      // Sweep the body in small increments; slide along walls rather than tunnelling or teleporting.
      const steps=Math.max(1,Math.ceil(Math.hypot(e.velocityX,e.velocityZ)*dt/.32));let moved=false;
      for(let j=0;j<steps;j++){
        const sx=e.velocityX*dt/steps,sz=e.velocityZ*dt/steps;
        if(canStep(e.x+sx,e.z+sz)){e.x+=sx;e.z+=sz;moved=true;}
        else if(canStep(e.x+sx,e.z)){e.x+=sx;e.velocityZ*=.2;moved=true;}
        else if(canStep(e.x,e.z+sz)){e.z+=sz;e.velocityX*=.2;moved=true;}
        else{e.velocityX*=.25;e.velocityZ*=.25;break;}
      }
      e.group.position.x=e.x;e.group.position.z=e.z;e.lastMoving=Math.min(1,Math.hypot(e.velocityX,e.velocityZ)/Math.max(.1,e.cfg.speed));
      if(this.world.city){
        const floor=this.world.city.floorAt(e.x,e.z,e.floorY||0,.46);
        e.floorY=floor>(e.floorY||0)-.55?floor:Math.max(0,(e.floorY||0)-5*dt);
        e.group.position.y=(e.floorY||0)+Math.sin(e.phase)*.04;
      } if(e.type==='sniper'&&e.laser){const from=e.group.position.clone().add(vec(0,e.y,0));const to=vec(chase.x,chase.eyeY,chase.z);const line=e.laser.geometry.attributes.position;line.setXYZ(0,from.x,from.y,from.z);line.setXYZ(1,to.x,to.y,to.z);line.needsUpdate=true;e.laser.visible=e.fireTimer<.75;}if(e.boss&&e.warning){e.warning.visible=e.blastCharge>0;e.warning.position.set(e.x,.08,e.z);e.warning.scale.setScalar(1+Math.max(0,1-e.blastCharge/1.3)*9);}if(melee){if(targetVisible&&e.alertness>=.40&&dist<e.cfg.range&&e.fireTimer<=0){e.fireVisual=.13;if(chase===player)this.hooks.onPlayerHit(e.cfg.damage);else if(chase?.role)this.hooks.onAllyHit?.(chase,e.cfg.damage);e.fireTimer=e.cfg.fire;this.spawnParticles(vec(chase.x,chase.eyeY,chase.z),0xf0d4c2,4,.5);}}else{if(e.boss){e.blastTimer-=dt;if(e.blastTimer<=0&&e.blastCharge<=0)e.blastCharge=1.3;if(e.blastCharge>0){e.blastCharge-=dt;if(e.blastCharge<=0){e.blastTimer=rand(7,10);if(targetVisible&&Math.hypot(e.x-chase.x,e.z-chase.z)<7){const from=vec(e.x,1.25,e.z),delta=vec(chase.x,1.25,chase.z).sub(from),d=delta.length();if(d>.01&&this.world.raycastDistance(from,delta.normalize(),Math.max(.01,d-.18))>=d-.3){if(chase===player)this.hooks.onPlayerHit(16);else this.hooks.onAllyHit?.(chase,16);}}this.spawnParticles(vec(e.x,.1,e.z),0xc46b4a,34,1.7);}}}
        if(targetVisible&&e.alertness>=.40&&e.fireTimer<=0&&dist<e.cfg.range){
          const from=e.group.position.clone().add(vec(0,e.y,0));
          const to=vec(chase.x,chase.eyeY,chase.z);
          const shotDir=to.sub(from),shotDistance=shotDir.length();
          if(this.world.raycastDistance(from,shotDir.normalize(),shotDistance-.12)<shotDistance-.2){e.fireTimer=.20;e.burstLeft=0;continue;}if(e.type==='gunner'){if(e.burstLeft>0){e.burstLeft--;e.fireTimer=e.cfg.fire*rand(.91,1.12);}else{e.burstLeft=1;e.fireTimer=.18;}}else e.fireTimer=e.cfg.fire*rand(.92,1.13);if(e.boss){for(const ang of [-.1,0,.1])this.spawnProjectile(e,chase,ang);}else this.spawnProjectile(e,chase);}}
    }
    for(let i=this.projectiles.length-1;i>=0;i--){
      const b=this.projectiles[i],old=b.mesh.position.clone();b.life-=dt;
      const next=old.clone().addScaledVector(b.vel,dt),segment=next.clone().sub(old),stepLength=segment.length();
      if(stepLength<.0001)continue;
      const dir=segment.clone().divideScalar(stepLength);
      // A ray through the entire travel step prevents rounds passing through thin walls at low FPS.
      const wall=this.world.raycastSurface(old,dir,stepLength+.05),wallT=wall?wall.distance/stepLength:Infinity;
      const target=b.target?.downed?player:b.target||player;
      const center=vec(target.x,(target.eyeY??1.65)-.27,target.z);
      const hitT=segmentSphereHit(old,next,center,b.boss?.93:.66);
      if(hitT!==null&&hitT<wallT){
        b.mesh.position.copy(old).addScaledVector(segment,hitT);
        if(target===player)this.hooks.onPlayerHit(b.damage);else this.hooks.onAllyHit?.(target,b.damage);
        this.spawnParticles(b.mesh.position.clone(),b.boss?0xc88cff:0xffc8a7,b.boss?10:5,b.boss?1.3:.6);
        this.removeProjectile(b);this.projectiles.splice(i,1);continue;
      }
      if(wall||b.life<=0){
        b.mesh.position.copy(wall?.point||next);
        if(wall)this.world.addImpact?.(wall);
        this.spawnParticles(b.mesh.position.clone(),b.boss?0xca9bff:0xffd0a0,b.boss?8:4,b.boss?1:.55);
        this.removeProjectile(b);this.projectiles.splice(i,1);continue;
      }
      b.mesh.position.copy(next);
      b.tracer.position.copy(next).addScaledVector(dir,b.boss?-1.05:-.75);
    }
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.velocity.y-=10*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=dt*6;p.mesh.rotation.z+=dt*5;p.mesh.scale.setScalar(Math.max(.01,p.scale*p.life/p.maxLife));if(p.life<=0){this.world.scene.remove(p.mesh);this.particles.splice(i,1);}}
    for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i];p.life-=dt;p.phase+=dt*2.1;p.mesh.position.y=.8+Math.sin(p.phase)*.18;p.mesh.rotation.y+=dt; if(Math.hypot(player.x-p.mesh.position.x,player.z-p.mesh.position.z)<1.7){if(this.hooks.onPickup(p.type)!==false){this.spawnParticles(p.mesh.position.clone(),p.type==='medkit'?0x7ea58b:0xb79a67,12,.9);this.world.scene.remove(p.mesh);this.pickups.splice(i,1);continue;}} if(p.life<=0){this.world.scene.remove(p.mesh);this.pickups.splice(i,1);}}
  }
}

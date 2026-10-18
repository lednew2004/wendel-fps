import * as THREE from 'three';
import {ENEMY_TYPES,rand} from './constants.js';
import {createOperative,animateOperative,disposeOperative} from './characters.js';
import {CHARACTER_STYLES} from './characterIdentity.js';
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);


export class EnemySystem {
  constructor(world,audio,hooks){this.world=world;this.audio=audio;this.hooks=hooks;this.enemies=[];this.projectiles=[];this.particles=[];this.pickups=[];this.time=0;this.maxParticles=260;this.particleGeo=new THREE.TetrahedronGeometry(.1);this.particleMaterials=new Map();this.projectileMat=new THREE.MeshBasicMaterial({color:0xffd7b3});this.projectileGeom=new THREE.SphereGeometry(.14,8,6);this.projectileBossGeom=new THREE.SphereGeometry(.22,8,6);}
  clear(){for(const e of this.enemies){this.world.scene.remove(e.group);this.disposeEnemy(e);if(e.laser)this.world.scene.remove(e.laser);if(e.warning)this.world.scene.remove(e.warning);}for(const b of this.projectiles)this.world.scene.remove(b.mesh);for(const p of this.particles)this.world.scene.remove(p.mesh);for(const d of this.pickups)this.world.scene.remove(d.mesh);this.enemies=[];this.projectiles=[];this.particles=[];this.pickups=[];}
  count(){return this.enemies.length;}
  disposeEnemy(e){
    if(!e?.body)return;
    disposeOperative(e.body);
    e.bar?.geometry?.dispose();e.barBg?.geometry?.dispose();
    e.bar?.material?.dispose();e.barBg?.material?.dispose();
    e.nameTag?.material?.map?.dispose();e.nameTag?.material?.dispose();
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
    const enemy={type,cfg,group,body,barBg,bar,nameTag,hp,maxHp:hp,x:pos[0],z:pos[1],y:1.45*size,radius:cfg.radius,fireTimer:rand(.25,1.3),strafe:Math.random()>.5?1:-1,strafeChange:rand(1.2,3.5),flash:0,fireVisual:0,lastMoving:0,phase:rand(0,6.3),boss:type==='boss',phaseIndex:0,telegraph:0,blastTimer:8,blastCharge:0,dead:false};
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

  spawnAt(type,player,wave){const radius=ENEMY_TYPES[type].radius+.3;const safe=this.world.spawnPoints.filter(p=>this.world.canMove(p[0],p[1],radius)&&Math.hypot(p[0]-player.x,p[1]-player.z)>20);const base=safe[Math.floor(Math.random()*safe.length)]||this.world.spawnPoints[0];let target=[base[0],base[1]];for(let i=0;i<12;i++){const trial=[base[0]+rand(-3,3),base[1]+rand(-3,3)];if(this.world.canMove(trial[0],trial[1],radius)&&Math.hypot(trial[0]-player.x,trial[1]-player.z)>16){target=trial;break;}}return this.spawn(type,target,wave);}
  spawnParticles(at,color,count=10,power=1){let mat=this.particleMaterials.get(color);if(!mat){mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85});this.particleMaterials.set(color,mat);}for(let i=0;i<count;i++){if(this.particles.length>=this.maxParticles){const old=this.particles.shift();this.world.scene.remove(old.mesh);}const mesh=new THREE.Mesh(this.particleGeo,mat);mesh.position.copy(at);mesh.scale.setScalar(rand(.6,1.6)*power);this.world.scene.add(mesh);const life=rand(.25,.85);this.particles.push({mesh,velocity:vec(rand(-7,7),rand(0,9),rand(-7,7)).multiplyScalar(power),life,maxLife:life,scale:mesh.scale.x});}}
  spawnProjectile(e,player,angle=0){const start=e.group.position.clone().add(vec(0,e.y,.0));const target=vec(player.x,player.eyeY,player.z);const dir=target.sub(start).normalize().applyAxisAngle(vec(0,1,0),angle);const mesh=new THREE.Mesh(e.boss?this.projectileBossGeom:this.projectileGeom,this.projectileMat);mesh.position.copy(start);this.world.scene.add(mesh);e.fireVisual=.13;this.projectiles.push({mesh,vel:dir.multiplyScalar(e.boss?22:e.type==='sniper'?48:16),life:2.8,damage:e.cfg.damage,boss:e.boss});}
  raycast(origin,dir,maxDist){let hit=null;let dist=maxDist;for(const e of this.enemies){const center=e.group.position.clone().add(vec(0,e.y,0));const radius=e.boss?2.75:e.radius*1.12;const oc=origin.clone().sub(center);const b=oc.dot(dir),c=oc.lengthSq()-radius*radius,discriminant=b*b-c;if(discriminant<0)continue;const t=-b-Math.sqrt(discriminant);if(t>0&&t<dist){dist=t;hit={enemy:e,distance:t,point:origin.clone().addScaledVector(dir,t),headshot:!e.boss&&origin.y+dir.y*t>e.y+.52};}}return hit;}
  damage(e,amount,point,source='shot'){if(!e||e.dead)return false;e.hp-=amount;e.flash=.10;if(e.boss&&e.hp>0){const stage=e.hp/e.maxHp<.25?2:e.hp/e.maxHp<.56?1:0;if(stage>e.phaseIndex){e.phaseIndex=stage;e.cfg={...e.cfg,speed:e.cfg.speed*(stage===2?1.32:1.18),fire:e.cfg.fire*(stage===2?.66:.78)};this.spawnParticles(e.group.position.clone().add(vec(0,e.y,0)),0xb1674a,38,2);if(this.currentPlayer){this.spawnAt('hunter',this.currentPlayer,this.currentWave||1);this.spawnAt('scout',this.currentPlayer,this.currentWave||1);this.hooks.onSummon?.(2);}}}this.spawnParticles(point||e.group.position.clone().add(vec(0,e.y,0)),0xd7c1a1,source==='pulse'?12:3,source==='pulse'?1.2:.5);if(e.hp<=0){e.dead=true;this.kill(e);return true;}return false;}
  kill(e){this.world.scene.remove(e.group);this.disposeEnemy(e);if(e.laser)this.world.scene.remove(e.laser);if(e.warning)this.world.scene.remove(e.warning);const ix=this.enemies.indexOf(e);if(ix!==-1)this.enemies.splice(ix,1);this.spawnParticles(e.group.position.clone().add(vec(0,e.y,0)),0xb79774,e.boss?45:17,e.boss?2.2:1.2);this.audio.play('kill');this.hooks.onKill(e);if(e.boss||Math.random()<.21)this.drop(e.group.position,e.boss?'medkit':Math.random()<.6?'medkit':'ammo');}
  drop(position,type){const mat=new THREE.MeshStandardMaterial({color:type==='medkit'?0x7ea58b:0xb79a67,metalness:.08,roughness:.55,emissive:type==='medkit'?0x203829:0x413116,emissiveIntensity:.55});const mesh=new THREE.Group();const core=new THREE.Mesh(new THREE.BoxGeometry(.55,.3,.55),mat);mesh.add(core);const ring=new THREE.Mesh(new THREE.TorusGeometry(.52,.04,8,24),mat);ring.rotation.x=Math.PI/2;mesh.add(ring);mesh.position.set(position.x,.75,position.z);this.world.scene.add(mesh);this.pickups.push({mesh,type,life:16,phase:rand(0,7)});}
  update(dt,player,wave=1){this.currentPlayer=player;this.currentWave=wave;this.time+=dt;for(const e of [...this.enemies]){e.flash=Math.max(0,e.flash-dt);e.fireVisual=Math.max(0,(e.fireVisual||0)-dt);
      animateOperative(e.body,dt,{moving:e.lastMoving||0,firing:e.fireVisual>0,frozen:e.frozenUntil>Date.now(),hit:e.flash>0,distance:Math.hypot(e.x-player.x,e.z-player.z)});
      e.phase+=dt*(e.boss?1.7:3.2);e.group.position.y=e.gravityUntil>Date.now()?2.7+Math.sin(e.phase)*.15:Math.sin(e.phase)*.04; e.bar.scale.x=Math.max(0,e.hp/e.maxHp);e.bar.position.x=-(1-e.bar.scale.x)*.925*e.cfg.scale;const camPos=new THREE.Vector3();this.world.camera.getWorldPosition(camPos);e.bar.lookAt(camPos);e.barBg.lookAt(camPos);if(this.hiddenPlayer||e.frozenUntil>Date.now()){e.fireTimer=Math.max(.15,e.fireTimer);continue;}const decoy=this.decoys?.find(d=>d.until>Date.now()&&Math.hypot(d.mesh.position.x-e.x,d.mesh.position.z-e.z)<24);const chase=decoy?{x:decoy.mesh.position.x,z:decoy.mesh.position.z,eyeY:decoy.mesh.position.y}:player;const dx=chase.x-e.x,dz=chase.z-e.z,dist=Math.max(.0001,Math.hypot(dx,dz)),nx=dx/dist,nz=dz/dist;e.group.rotation.y=Math.atan2(-nx,-nz);e.fireTimer-=dt;e.strafeChange-=dt;if(e.strafeChange<0){e.strafe*=-1;e.strafeChange=rand(1.5,4);}let fx=0,fz=0;const melee=e.type==='scout'||e.type==='tank'||e.type==='hunter';const optimal=e.boss?20:e.type==='sniper'?33:e.type==='gunner'?19:melee?e.cfg.range*.9:7;if(dist>optimal+2){fx+=nx;fz+=nz;}else if(dist<optimal-4&&!melee){fx-=nx*.65;fz-=nz*.65;}if(!melee||dist<optimal+8){fx+=(-nz)*e.strafe*(e.boss?.4:.63);fz+=nx*e.strafe*(e.boss?.4:.63);}const tries=[[fx,fz],[fx+nz*.8*e.strafe,fz-nx*.8*e.strafe],[-nz*e.strafe,nx*e.strafe]];let moved=false;for(const [ax,az] of tries){const mag=Math.hypot(ax,az);if(mag<.05)break;const mx=ax/mag*e.cfg.speed*dt,mz=az/mag*e.cfg.speed*dt;if(this.world.canMove(e.x+mx,e.z+mz,e.radius)){e.x+=mx;e.z+=mz;moved=true;break;}}if(!moved&&dist>optimal+10&&this.world.canMove(e.x+nx*e.cfg.speed*.45*dt,e.z+nz*e.cfg.speed*.45*dt,e.radius)){e.x+=nx*e.cfg.speed*.45*dt;e.z+=nz*e.cfg.speed*.45*dt;}e.group.position.x=e.x;e.group.position.z=e.z;e.lastMoving=moved?1:0; if(e.type==='sniper'&&e.laser){const from=e.group.position.clone().add(vec(0,e.y,0));const to=vec(player.x,player.eyeY,player.z);const line=e.laser.geometry.attributes.position;line.setXYZ(0,from.x,from.y,from.z);line.setXYZ(1,to.x,to.y,to.z);line.needsUpdate=true;e.laser.visible=e.fireTimer<.75;}if(e.boss&&e.warning){e.warning.visible=e.blastCharge>0;e.warning.position.set(e.x,.08,e.z);e.warning.scale.setScalar(1+Math.max(0,1-e.blastCharge/1.3)*9);}if(melee){if(dist<e.cfg.range&&e.fireTimer<=0){e.fireVisual=.13;this.hooks.onPlayerHit(e.cfg.damage);e.fireTimer=e.cfg.fire;this.spawnParticles(vec(player.x,player.eyeY,player.z),0xf0d4c2,4,.5);}}else{if(e.boss){e.blastTimer-=dt;if(e.blastTimer<=0&&e.blastCharge<=0)e.blastCharge=1.3;if(e.blastCharge>0){e.blastCharge-=dt;if(e.blastCharge<=0){e.blastTimer=rand(7,10);if(Math.hypot(e.x-player.x,e.z-player.z)<7)this.hooks.onPlayerHit(16);this.spawnParticles(vec(e.x,.1,e.z),0xc46b4a,34,1.7);}}}
        if(e.fireTimer<=0&&dist<e.cfg.range){
          const from=e.group.position.clone().add(vec(0,e.y,0));
          const to=vec(player.x,player.eyeY,player.z);
          const shotDir=to.sub(from),shotDistance=shotDir.length();
          if(this.world.raycastDistance(from,shotDir.normalize(),shotDistance-.12)<shotDistance-.2){e.fireTimer=.6;continue;}e.fireTimer=e.cfg.fire;if(e.boss){for(const ang of [-.1,0,.1])this.spawnProjectile(e,chase,ang);}else this.spawnProjectile(e,chase);}}
    }
    for(let i=this.projectiles.length-1;i>=0;i--){const b=this.projectiles[i];b.life-=dt;b.mesh.position.addScaledVector(b.vel,dt);const dx=b.mesh.position.x-player.x,dz=b.mesh.position.z-player.z; if(Math.hypot(dx,dz)<(b.boss?1.0:.7)&&Math.abs(b.mesh.position.y-player.eyeY)<1.1){this.hooks.onPlayerHit(b.damage);this.spawnParticles(b.mesh.position.clone(),0xffc8a7,b.boss?12:7,b.boss?1.5:1);this.world.scene.remove(b.mesh);this.projectiles.splice(i,1);continue;} if(!(this.world.urbanActive&&this.world.city?this.world.city.canOccupy(b.mesh.position.x,b.mesh.position.z,b.mesh.position.y-.1,.25,.2):this.world.canMove(b.mesh.position.x,b.mesh.position.z,.2))||b.life<=0){this.spawnParticles(b.mesh.position.clone(),0xe0cab7,b.boss?10:4,b.boss?1.4:.55);this.world.scene.remove(b.mesh);this.projectiles.splice(i,1);}}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.velocity.y-=10*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=dt*6;p.mesh.rotation.z+=dt*5;p.mesh.scale.setScalar(Math.max(.01,p.scale*p.life/p.maxLife));if(p.life<=0){this.world.scene.remove(p.mesh);this.particles.splice(i,1);}}
    for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i];p.life-=dt;p.phase+=dt*2.1;p.mesh.position.y=.8+Math.sin(p.phase)*.18;p.mesh.rotation.y+=dt; if(Math.hypot(player.x-p.mesh.position.x,player.z-p.mesh.position.z)<1.7){if(this.hooks.onPickup(p.type)!==false){this.spawnParticles(p.mesh.position.clone(),p.type==='medkit'?0x7ea58b:0xb79a67,12,.9);this.world.scene.remove(p.mesh);this.pickups.splice(i,1);continue;}} if(p.life<=0){this.world.scene.remove(p.mesh);this.pickups.splice(i,1);}}
  }
}

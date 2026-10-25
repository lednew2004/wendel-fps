import * as THREE from 'three';
import {VEX_TUNING as T,findGrappleAnchor,ropeVelocity,lineOfSight,targetScore,clampVex} from './vexPhysics.js';
import {PARKOUR_TUNING as CFG} from './parkourPhysics.js';
const $=id=>document.getElementById(id);
const smooth=(a,b,t)=>a+(b-a)*Math.min(1,t);
/** Fixed-step traversal/attack state machine. Other operators never enter this controller. */
export class VexMobility{
 constructor(game){
  this.game=game;this.charges=3;this.recharge=[];this.grapple=null;this.climb=null;this.blade=null;
  this.bladeReadyAt=0;this.climbReadyAt=0;this.awaitingBlade=false;this.bladeSwing=0;this.bladeCombo=0;this.stepTime=0;this.ropeRoll=0;this.handPose=0;
  this.ropeGeo=new THREE.BufferGeometry();this.ropePositions=new Float32Array(15*3);
  this.ropeGeo.setAttribute('position',new THREE.BufferAttribute(this.ropePositions,3).setUsage(THREE.DynamicDrawUsage));
  this.rope=new THREE.Line(this.ropeGeo,new THREE.LineBasicMaterial({color:0x80eefa,transparent:true,opacity:.94,depthTest:true}));this.rope.frustumCulled=false;this.rope.visible=false;
  this.hook=new THREE.Mesh(new THREE.OctahedronGeometry(.16),new THREE.MeshBasicMaterial({color:0xc3f6ff,depthTest:true}));this.hook.visible=false;
  game.world.scene.add(this.rope,this.hook);
  this.hands=new THREE.Group();game.world.camera.add(this.hands);
  const armMat=new THREE.MeshStandardMaterial({color:0x242d35,metalness:.64,roughness:.3,depthTest:false,depthWrite:false});
  const bladeMat=new THREE.MeshStandardMaterial({color:0xd7f3f7,metalness:.81,roughness:.18,emissive:0x123a4d,depthTest:false,depthWrite:false});
  const panelMat=new THREE.MeshStandardMaterial({color:0xef765a,metalness:.55,roughness:.35,depthTest:false,depthWrite:false});
  this.bladeMeshes=[];
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.37,-.57,-.69);
   const glove=new THREE.Mesh(new THREE.BoxGeometry(.17,.19,.38),armMat);glove.position.z=-.01;arm.add(glove);
   const armor=new THREE.Mesh(new THREE.BoxGeometry(.20,.08,.22),panelMat);armor.position.y=.10;arm.add(armor);
   const blade=new THREE.Mesh(new THREE.ConeGeometry(.075,.66,4,1),bladeMat);blade.renderOrder=25;blade.rotation.x=-Math.PI/2;blade.position.set(side*.045,.025,-.48);arm.add(blade);
   this.hands.add(arm);this.bladeMeshes.push({arm,side});
  }
  this.hands.visible=false;this.ropeObjectVisible=false;
 }
 get isVex(){return this.game.heroSelection?.selectedHero==='striker';}
 get pk(){return this.game.parkour;}
 reset(){this.charges=3;this.recharge=[];this.grapple=null;this.climb=null;this.blade=null;this.bladeReadyAt=0;this.climbReadyAt=0;this.awaitingBlade=false;this.bladeSwing=0;this.bladeCombo=0;this.stepTime=0;this.ropeRoll=0;this.handPose=0;this.rope.visible=false;this.hook.visible=false;this.hands.visible=false;if(this.game.weapons?.model)this.game.weapons.model.visible=true;}
 onSpawn(){this.grapple=null;this.climb=null;this.blade=null;this.rope.visible=false;this.hook.visible=false;}
 aim(){const camera=this.game.world.camera;camera.updateWorldMatrix(true,false);return {from:camera.getWorldPosition(new THREE.Vector3()),dir:camera.getWorldDirection(new THREE.Vector3())};}
 solids(){return this.game.urban?.solids||[];}
 feedback(message){this.pk.prompt=message;this.game.toast(message);}
 cast(id){if(!this.isVex)return false;
  if(id==='vault')return this.castGrapple();
  if(id==='wallrun_boost')return this.castClimb();
  if(id==='vex_ultimate')return this.castBlades();
  return false;
 }
 castGrapple(){
  if(this.charges<=0){this.feedback('GARRAS RECARREGANDO');return false;}
  const {from,dir}=this.aim(),hit=findGrappleAnchor(from,dir,this.solids(),T.grappleRange);
  if(!hit){this.feedback('MIRE NA FACHADA, BORDA OU TELHADO PARA ANCORAR');return false;}
  const p=this.pk;if(p.vault||this.game.deployment?.active)return false;
  this.charges--;this.recharge.push(this.stepTime+T.grappleRecharge);
  const dist=Math.hypot(hit.x-p.x,hit.y-(p.y+1.05),hit.z-p.z);
  const previous=this.grapple;
  this.grapple={anchor:hit,length:clampVex(dist*.86,3.5,33),life:0,previous:previous?.anchor||null};
  this.climb=null;this.blade=null;p.hanging=null;p.ladder=null;p.grounded=false;p.coyote=0;
  // Velocity is retained on anchor change: a true two-point swing, no teleport.
  const dx=hit.x-p.x,dz=hit.z-p.z,d=Math.hypot(dx,dz)||1;
  p.vx+=dx/d*(previous?1.0:4.1);p.vz+=dz/d*(previous?1.0:4.1);p.vy=Math.max(p.vy,previous?.0:3.0);
  this.rope.visible=true;this.hook.visible=true;this.hook.position.set(hit.x,hit.y,hit.z);
  if(this.game.mode==='multiplayer'){this.game.multiplayer.syncState();this.game.multiplayer.send({type:'vex-activate',skill:'vault',anchor:{x:hit.x,y:hit.y,z:hit.z}});}
  this.game.audio.play('dash');this.feedback(`GARRA ANCORADA · ${this.charges}/3 · MIRE E USE 1 NOVAMENTE`);
  return true;
 }
 releaseGrapple(){if(!this.grapple)return false;this.grapple=null;this.rope.visible=false;this.hook.visible=false;this.pk.prompt='GARRA SOLTA · VELOCIDADE CONSERVADA';return true;}
 castClimb(){
  const p=this.pk,w=this.game.urban.wallNear(p.x,p.z,p.y+1.1,1.7);
  if(this.climb){this.climb=null;this.feedback('ESCALADA INTERROMPIDA');return true;}
  if(this.stepTime<this.climbReadyAt){this.feedback('ESCALADA RECARREGANDO · '+Math.ceil(this.climbReadyAt-this.stepTime)+'S');return false;}
  if(!w||w.s.maxY<p.y+.9){this.feedback('ENCOSTE EM UMA PAREDE PARA ESCALAR');return false;}
  this.releaseGrapple();this.blade=null;this.climbReadyAt=this.stepTime+13;this.climb={wall:w.s,nx:w.nx,nz:w.nz,time:T.climbDuration,progress:0};
  p.hanging=null;p.ladder=null;p.vy=0;p.grounded=false;p.vx=0;p.vz=0;
  this.game.audio.play('dash');if(this.game.mode==='multiplayer'){this.game.multiplayer.syncState();this.game.multiplayer.send({type:'vex-activate',skill:'wallrun_boost'});}
  this.feedback('ESCALADA ATIVA · W SUBIR · A/D LATERAL · ESPAÇO SALTAR');return true;
 }
 climbStep(dt){
  const a=this.climb,p=this.pk;if(!a)return false;
  a.time-=dt;if(a.time<=0){this.climb=null;p.vy=Math.min(p.vy,-.2);this.feedback('FÔLEGO DA ESCALADA ESGOTADO');return false;}
  const s=a.wall;if(s.active===false){this.climb=null;return false;}
  const k=this.game.keys,move=this.game.mobile?.move;
  const vertical=clampVex(Number(!!k.KeyW)-Number(!!k.KeyS)+(move?.y||0),-1,1);
  const side=clampVex(Number(!!k.KeyD)-Number(!!k.KeyA)+(move?.x||0),-1,1);
  const tx=a.nx?(s.x+a.nx*(s.hx+CFG.characterRadius+.08)):clampVex(p.x+side*T.climbSideSpeed*dt,s.x-s.hx+.6,s.x+s.hx-.6);
  const tz=a.nz?(s.z+a.nz*(s.hz+CFG.characterRadius+.08)):clampVex(p.z+side*T.climbSideSpeed*dt,s.z-s.hz+.6,s.z+s.hz-.6);
  const climb=vertical===0?.46:vertical;
  const ty=p.y+climb*T.climbSpeed*dt;
  const roof=s.maxY+.05;
  if(ty>=roof-.22){
   const bx=a.nx?p.x-a.nx*1.15:p.x,bz=a.nz?p.z-a.nz*1.15:p.z;
   if(this.game.urban.canOccupy(bx,bz,roof+.08,CFG.characterHeight,CFG.characterRadius)){
    p.x=bx;p.z=bz;p.y=roof+.08;p.vy=0;p.vx=a.nx*-2;p.vz=a.nz*-2;p.grounded=true;
    this.climb=null;this.pk.combo++;this.feedback('MANTLE · TELHADO CONQUISTADO');this.game.audio.play('dash');return true;
   }
  }
  if(ty<.05||!this.game.urban.canOccupy(tx,tz,ty,CFG.characterHeight,CFG.characterRadius)){
   if(ty<.05){this.climb=null;p.grounded=true;p.vy=0;return false;}
   a.time-=dt*.3;return true;
  }
  p.x=tx;p.z=tz;p.y=ty;p.vx=side*T.climbSideSpeed*(a.nz?1:0);p.vz=side*T.climbSideSpeed*(a.nx?1:0);p.vy=climb*T.climbSpeed;
  a.progress+=dt*Math.abs(climb)*8;
  return true;
 }
 jumpFromClimb(){if(!this.climb)return false;const a=this.climb,p=this.pk;
  p.vx=a.nx*8;p.vz=a.nz*8;p.vy=CFG.jumpSpeed*.96;p.grounded=false;this.climb=null;
  this.game.audio.play('dash');this.feedback('SALTO DA PAREDE · APROVEITE A GARRA');return true;
 }
 ropeStep(dt){
  const g=this.grapple,p=this.pk;if(!g)return;
  g.life+=dt;if(g.life>12||p.y<-.1){this.releaseGrapple();return;}
  if(this.game.keys.KeyW)g.length=Math.max(3.8,g.length-T.ropeReel*dt);
  if(this.game.keys.KeyS)g.length=Math.min(38,g.length+T.ropeReel*dt);
  const dir=p.direction();
  const v=ropeVelocity({x:p.x,y:p.y,z:p.z},{x:p.vx,y:p.vy,z:p.vz},g.anchor,g.length,dt,dir);
  p.vx=v.x;p.vy=v.y;p.vz=v.z;p.grounded=false;
  const dx=g.anchor.x-p.x,dy=g.anchor.y-(p.y+1.05),dz=g.anchor.z-p.z,dist=Math.hypot(dx,dy,dz)||1;
  // Removing only outward velocity at full extension keeps tangential momentum.
  if(dist>=g.length-.08){const nx=dx/dist,ny=dy/dist,nz=dz/dist;const outward=-(p.vx*nx+p.vy*ny+p.vz*nz);
   if(outward>0){p.vx+=nx*outward*.90;p.vy+=ny*outward*.90;p.vz+=nz*outward*.90;}
  }
  this.ropeRoll=smooth(this.ropeRoll,clampVex((p.vx*dz-p.vz*dx)/(dist*45),-.095,.095),dt*7);
 }
 ropePost(dt){
  const g=this.grapple,p=this.pk;if(!g)return;
  // Positional hard limit: correct against the existing capsule collider, never phase through walls.
  const dx=p.x-g.anchor.x,dy=p.y+1.05-g.anchor.y,dz=p.z-g.anchor.z,dist=Math.hypot(dx,dy,dz)||.001;
  if(dist>g.length+.015){const correction=Math.min(1.6,(dist-g.length)*.92),nx=dx/dist,ny=dy/dist,nz=dz/dist;
   const x=p.x-nx*correction,z=p.z-nz*correction,y=Math.max(.03,p.y-ny*correction);
   if(this.game.urban.canOccupy(x,z,y,CFG.characterHeight,CFG.characterRadius)){p.x=x;p.z=z;p.y=y;}
  }
  if(p.grounded&&g.life>.24){this.releaseGrapple();}
 }
 chooseTarget(){
  const {from,dir}=this.aim(),p=this.pk;let best=null;
  const mp=this.game.multiplayer;
  const choices=this.game.mode==='multiplayer'?(mp.roomMode==='coop'?[...mp.coopEntities.values()].filter(e=>!e.dead):(mp.players||[]).filter(e=>e.id!==mp.id&&e.alive&&e.team!==mp.players.find(p=>p.id===mp.id)?.team)):this.game.enemies.enemies.filter(e=>!e.dead);
  for(const enemy of choices){const pos={x:enemy.x,y:(enemy.y||p.y)+.8,z:enemy.z};const score=targetScore(from,dir,pos,T.bladeRange);
   if(!score||!lineOfSight(from,pos,this.solids()))continue;
   if(!best||score.score<best.score.score)best={enemy,score,pos};
  }
  return best;
 }
 castBlades(){
  if(this.stepTime<this.bladeReadyAt){this.feedback('LÂMINAS · '+Math.ceil(this.bladeReadyAt-this.stepTime)+'S PARA RECARREGAR');return false;}
  if(this.blade||this.awaitingBlade)return false;
  const aim=this.aim(),target=this.chooseTarget(),p=this.pk;
  // Missing the target is costly. Firing into empty space still commits the attack.
  const direction=target?new THREE.Vector3(target.pos.x-p.x,target.pos.y-(p.y+1),target.pos.z-p.z).normalize():aim.dir.clone();
  this.releaseGrapple();this.climb=null;
  const speed=T.bladeSpeed;p.vx=direction.x*speed;p.vy=direction.y*speed+2.3;p.vz=direction.z*speed;
  p.grounded=false;p.hanging=null;p.ladder=null;p.coyote=0;
  this.blade={target:target?.enemy||null,age:0,direction:{x:direction.x,y:direction.y,z:direction.z},hit:false,start:{x:p.x,y:p.y,z:p.z}};
  this.bladeReadyAt=this.stepTime+T.bladeCooldown;this.bladeSwing=1;this.game.audio.play('dash');
  if(this.game.mode==='multiplayer'){this.game.multiplayer.syncState();this.game.multiplayer.send({type:'vex-activate',skill:'vex_ultimate',target:target?.enemy?.coopId||target?.enemy?.id||null});}
  this.feedback(target?'LÂMINAS LANÇADAS · CONFIRME O ACERTO':'INVESTIDA SEM ALVO · SE ERRAR, PERDE A CARGA');return true;
 }
 bladeStep(dt){
  const b=this.blade,p=this.pk;if(!b)return;
  b.age+=dt;
  // Steering is intentionally small: aim decides the direction, physics keeps it honest.
  if(b.target&&!b.target.dead&&b.age<.48){const tx=b.target.x-p.x,ty=(b.target.y||1.4)-(p.y+1.05),tz=b.target.z-p.z,dist=Math.hypot(tx,ty,tz)||1;
   const steer=Math.min(1,dt*1.55);p.vx=smooth(p.vx,tx/dist*T.bladeSpeed,steer);p.vy=smooth(p.vy,ty/dist*T.bladeSpeed,steer);p.vz=smooth(p.vz,tz/dist*T.bladeSpeed,steer);
  }
  if(b.age>T.bladeDuration){this.blade=null;this.game.audio.play('empty');this.feedback('LÂMINAS ERRARAM · CARGA PERDIDA');}
 }
 bladePost(){
  const b=this.blade,p=this.pk;if(!b)return;
  const target=b.target;if(!target||target.dead)return;
  const dist=Math.hypot(target.x-p.x,(target.y||1.45)-(p.y+1.05),target.z-p.z);
  if(dist>Math.max(1.45,target.radius||.6)+.8)return;
  if(this.game.mode==='multiplayer'){
   // Damage/recharge require server confirmation; no client-authoritative hits.
   this.awaitingBlade=true;this.blade=null;this.game.multiplayer.syncState();
   this.game.multiplayer.send({type:'vex-blade-hit',target:target.coopId||target.id});return;
  }else{
   this.game.enemies.damage(target,T.bladeDamage,new THREE.Vector3(target.x,target.y||1.2,target.z),'pulse');
  }
  b.hit=true;this.blade=null;this.bladeReadyAt=this.stepTime+.22;this.bladeCombo++;
  const dx=p.x-b.start.x,dz=p.z-b.start.z,len=Math.hypot(dx,dz)||1;
  p.vx=dx/len*10;p.vz=dz/len*10;p.vy=Math.max(5.5,p.vy*.22);p.grounded=false;
  this.bladeSwing=1.45;this.game.powers.motion.burst({x:target.x,y:target.y||1.2,z:target.z},0xff6b73,1.65);
  this.game.powers.motion.spark({x:target.x,y:target.y||1.2,z:target.z},0xcdfaff,.34,.5);
  this.game.audio.play('hit');this.feedback(`ACERTO! LÂMINAS REARMADAS · COMBO ×${this.bladeCombo}`);
 }
 onServerBlade(ok,targetId){if(!this.awaitingBlade)return;this.awaitingBlade=false;if(!ok){this.game.toast('LÂMINAS · GOLPE NÃO CONFIRMADO');return;}
  this.bladeReadyAt=this.stepTime+.22;this.bladeCombo++;this.bladeSwing=1.4;
  const p=this.pk;p.vy=Math.max(5.5,p.vy*.4);p.grounded=false;
  this.game.powers.motion.burst({x:p.x,y:p.y+1.0,z:p.z},0xff6677,1.6);this.game.audio.play('hit');this.feedback('ACERTO CONFIRMADO · LÂMINAS REARMADAS · COMBO ×'+this.bladeCombo);}
 afterMove(dt){if(!this.isVex)return;this.ropePost(dt);this.bladePost();}
 update(dt){
  if(!this.isVex){this.rope.visible=false;this.hook.visible=false;this.hands.visible=false;return;}
  this.stepTime+=Math.max(0,dt);while(this.recharge.length&&this.recharge[0]<=this.stepTime){this.recharge.shift();this.charges=Math.min(T.grappleCharges,this.charges+1);}
  this.bladeSwing=Math.max(0,this.bladeSwing-dt*3.4);
  if(this.awaitingBlade&&this.stepTime>this.bladeReadyAt-T.bladeCooldown+3.5)this.awaitingBlade=false;
  const attack=!!this.blade,climbing=!!this.climb,rope=!!this.grapple;
  const pose=attack?1:climbing?.80:rope?.34:this.bladeSwing>0?.3:0;
  this.handPose=smooth(this.handPose,pose,dt*12);
  this.hands.visible=this.handPose>.015;
  if(this.hands.visible){this.hands.position.set(0,-.06*this.handPose,-.12*this.handPose);
   for(const {arm,side} of this.bladeMeshes){const t=this.stepTime;
    arm.position.set(side*(.37-.12*this.handPose),-.57+.2*this.handPose+Math.sin(t*13+side)*.017,-.69-.10*this.handPose);
    arm.rotation.set(climbing?Math.sin(t*20+side)*.32:attack?-.6-Math.sin(t*23+side)*.28:rope?-.35:0,side*(.13+.12*this.handPose),side*(attack?.38:climbing?.18:rope?.1:0));
   }
  }
  this.rope.visible=rope;this.hook.visible=rope;
  if(rope){const p=this.pk,a=this.grapple.anchor,pos=this.ropePositions;
   // Local cable sag tightens as speed increases; no per-frame geometry allocations.
   const origin={x:p.x+Math.cos(this.game.yaw)*.21,y:p.y+1.35,z:p.z-Math.sin(this.game.yaw)*.21};
   const length=Math.hypot(a.x-origin.x,a.y-origin.y,a.z-origin.z),slack=Math.max(0,this.grapple.length-length);
   for(let i=0;i<15;i++){const f=i/14,curve=Math.sin(f*Math.PI);
    pos[i*3]=origin.x+(a.x-origin.x)*f;
    pos[i*3+1]=origin.y+(a.y-origin.y)*f-curve*slack*.16;
    pos[i*3+2]=origin.z+(a.z-origin.z)*f;
   }
   this.ropeGeo.attributes.position.needsUpdate=true;this.ropeGeo.computeBoundingSphere();this.hook.rotation.y+=dt*8;
  }
  if(this.game.weapons?.model)this.game.weapons.model.visible=!attack&&!climbing;
 }
 hud(id,t){
  if(id==='vault')return this.charges>0?`${'◆'.repeat(this.charges)}${'◇'.repeat(3-this.charges)} · ${this.charges}/3`:`0/3 · ${Math.max(0,Math.ceil(this.recharge[0]-t))}s`;
  if(id==='wallrun_boost')return this.climb?`ESCALANDO ${this.climb.time.toFixed(1)}s`:this.stepTime<this.climbReadyAt?`${Math.ceil(this.climbReadyAt-this.stepTime)}s`:'PRONTO · 5,3s';
  if(id==='vex_ultimate')return this.blade?'INVESTINDO':this.stepTime>=this.bladeReadyAt?`PRONTO · COMBO ×${this.bladeCombo}`:`${Math.ceil(this.bladeReadyAt-this.stepTime)}s`;
  return null;
 }
}

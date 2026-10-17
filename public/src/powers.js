import * as THREE from 'three';
import {PowerMenu} from './powerMenu.js';
export const POWER_DATA={
 push:{label:'REPULSÃO',icon:'◉',cool:14,help:'Empurra inimigos em 11 m'},
 freeze:{label:'CONGELAR',icon:'❄',cool:18,help:'Paralisa por 1 segundo'},
 teleport:{label:'TELEPORTE',icon:'↝',cool:27,help:'Escolha no mapa e retorne em 12 s'},
 flight:{label:'VOAR',icon:'↑',cool:30,help:'Voe durante 5 segundos'},
 invisible:{label:'INVISÍVEL',icon:'◌',cool:24,help:'Desapareça por 3 segundos'},
 phase:{label:'INTANGÍVEL',icon:'◇',cool:38,help:'Atravesse paredes durante 6 segundos'},
 blackhole:{label:'BURACO NEGRO',icon:'◉',cool:39,help:'Atrai adversários em 11 m'},
 rewind:{label:'REWIND',icon:'↶',cool:42,help:'Volte 4 s no tempo e recupere vida'},
 chain:{label:'RAIO',icon:'ϟ',cool:24,help:'Raio que salta entre 3 alvos'},
 gravity:{label:'GRAVIDADE',icon:'↟',cool:33,help:'Lança adversários para cima'},
 clones:{label:'CLONES',icon:'♧',cool:30,help:'Três cópias por 8 segundos'},
 shield:{label:'ESCUDO',icon:'⬡',cool:37,help:'Bloqueia disparos por 5 segundos'},
 swap:{label:'TROCA',icon:'⇄',cool:35,help:'Troque de lugar com quem estiver na mira'}
};
const $=id=>document.getElementById(id);
const now=()=>Date.now();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class PowerSystem {
 constructor(game){
  this.game=game;this.loadout=['push','teleport'];this.cooldowns={};this.status={};this.returnPoint=null;this.targeting=false;
  this.lastSafe={x:0,y:0,z:18};this.teleportMarker=null;this.effects=[];this.flightBefore=false;this.uiTick=0;this.history=[];this.localHazards=[];this.decoys=[];this.prevGravity=null;
  try{const val=JSON.parse(localStorage.getItem('titan-power-loadout')||'null');if(Array.isArray(val)&&POWER_DATA[val[0]]&&POWER_DATA[val[1]]&&val[0]!==val[1])this.loadout=val;}catch{}
  for(const select of document.querySelectorAll('[data-power-slot]')){
   select.addEventListener('change',()=>this.equip(Number(select.dataset.powerSlot),select.value));
  }
  for(let slot=0;slot<2;slot++){
   const button=$('power-'+(slot?'b':'a'));
   button.addEventListener('click',e=>{if(!this.game.mobile?.enabled)this.useSlot(slot);});
   let touch=null;
   button.addEventListener('pointerdown',e=>{
     if(e.pointerType==='mouse')return;
     e.preventDefault();e.stopPropagation();if(this.game.state!=='playing')return;
     touch={id:e.pointerId,x:e.clientX,y:e.clientY};
     try{button.setPointerCapture(e.pointerId);}catch{}
     button.classList.add('pressed');
     const id=this.loadout[slot];this.use(id);
   });
   button.addEventListener('pointermove',e=>{
     if(!touch||touch.id!==e.pointerId||!this.targeting)return;
     const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch.x=e.clientX;touch.y=e.clientY;
     if(Math.abs(dx)>140||Math.abs(dy)>140)return;
     const g=this.game;
     if(g.look.move(dx*g.mobile.touchSensitivity*1.1,dy*g.mobile.touchSensitivity*1.1,g.sensitivity))g.positionCamera();
     this.updateTarget();e.preventDefault();
   });
   const stop=e=>{
     if(!touch||touch.id!==e.pointerId)return;
     touch=null;button.classList.remove('pressed');
     
     e.preventDefault();
   };
   button.addEventListener('pointerup',stop);
   button.addEventListener('pointercancel',()=>{touch=null;button.classList.remove('pressed');this.cancelTargeting();});
  }
  const descend=$('power-descend');
  descend.addEventListener('pointerdown',e=>{e.preventDefault();this.game.keys.ControlLeft=true;try{descend.setPointerCapture(e.pointerId);}catch{}});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])descend.addEventListener(evt,()=>{this.game.keys.ControlLeft=false;});
  this.refreshSelects();this.refreshButtons();this.menu=new PowerMenu(this,POWER_DATA);
 }
 reset(){this.cooldowns={};this.status={};this.returnPoint=null;this.targeting=false;this.cleanupMarker();for(const e of this.effects){this.game.world.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}this.effects=[];this.lastSafe={x:0,y:0,z:18};this.history=[];this.localHazards=[];this.clearDecoys();this.menu?.close();this.refreshButtons();}
 equip(slot,id){
  if(!POWER_DATA[id])return;
  if(this.loadout[1-slot]===id){this.game.toast('EQUIPE DUAS HABILIDADES DIFERENTES');this.refreshSelects();return;}
  this.loadout[slot]=id;this.cancelTargeting();
  try{localStorage.setItem('titan-power-loadout',JSON.stringify(this.loadout));}catch{}
  if(this.game.mode==='multiplayer'&&this.game.multiplayer?.connected)this.game.multiplayer.send({type:'equip',loadout:this.loadout});
  this.refreshSelects();this.refreshButtons();
 }
 refreshSelects(){for(const s of document.querySelectorAll('[data-power-slot]'))s.value=this.loadout[Number(s.dataset.powerSlot)];}
 refreshButtons(){for(let i=0;i<2;i++){const id=this.loadout[i],btn=$('power-'+(i?'b':'a'));btn.querySelector('.power-symbol').textContent=POWER_DATA[id].icon;btn.querySelector('.power-name').textContent=POWER_DATA[id].label;}}
 isActive(id){return (this.status[id]||0)>now();}
 frozen(){return this.isActive('freeze')||this.isActive('gravity');}
 cancelTargeting(){this.targeting=false;this.cleanupMarker();}
 useSlot(i){this.use(this.loadout[i]);}
 use(id){
  const g=this.game;if(g.state!=='playing'||!POWER_DATA[id]||(g.mode==='multiplayer'&&!g.multiplayer.alive))return;
  if(id==='teleport'&&this.returnPoint?.until>now()){this.returnTeleport();return;}

  if(this.frozen()){g.toast('CONGELADO!');return;}
  if((this.cooldowns[id]||0)>now()){g.toast('RECARGA · '+Math.ceil((this.cooldowns[id]-now())/1000)+'s');return;}
  if(this.isActive('phase')&&id!=='phase')return;
  if(id==='teleport'){g.mouseDown=false;this.menu.openTeleport();return;}
  if(g.mode==='multiplayer'){g.multiplayer.send({type:'power',id});return;}
  this.applyLocal(id);this.cooldowns[id]=now()+POWER_DATA[id].cool*1000;
 }
 useTouch(slot,e,release=false){
  const id=this.loadout[slot];
  if(release){if(id==='teleport'&&this.targeting)this.confirmTeleport();return;}
  if(id==='teleport'&&!this.targeting&&!this.returnPoint){this.use(id);return;}
  this.use(id);
 }
 localArea(id,position,range){
  const g=this.game;for(const enemy of [...g.enemies.enemies]){
   const dist=Math.hypot(enemy.x-position.x,enemy.z-position.z);if(dist>range)continue;
   if(id==='push'){
    const dx=(enemy.x-position.x)/(dist||1),dz=(enemy.z-position.z)/(dist||1);
    for(let t=4;t>=1;t--){const x=enemy.x+dx*t,z=enemy.z+dz*t;if(g.world.canMove(x,z,enemy.radius)&&g.urban.canOccupy(x,z,0,2,enemy.radius)){enemy.x=x;enemy.z=z;break;}}
   }
   if(id==='freeze')enemy.frozenUntil=now()+1000;
  }
 }
 applyLocal(id){
  const g=this.game,p=g.parkour;switch(id){
   case 'push':this.localArea('push',p,11);this.flash(0x8fdfff,11);break;
   case 'freeze':this.localArea('freeze',p,25);this.flash(0x9de8ff,6);break;
   case 'flight':this.status.flight=now()+5000;break;
   case 'invisible':this.status.invisible=now()+3000;break;
   case 'phase':this.status.phase=now()+6000;this.lastSafe={x:p.x,y:p.y,z:p.z};break;
   case 'blackhole':{
     const center=this.aimLocal(22);this.localHazards.push({...center,until:now()+4000});this.flash(0x8b7dff,11,center);break;
   }
   case 'rewind':{
     if(!this.history.length){g.toast('HISTÓRICO AINDA INDISPONÍVEL');return;}
     const timestamp=now()-4000;
     const point=this.history.reduce((best,h)=>Math.abs(h.t-timestamp)<Math.abs(best.t-timestamp)?h:best,this.history[0]);
     if(g.urban.canOccupy(point.x,point.z,point.y,1.77,.48)){
       p.spawn(point.x,point.y,point.z);g.player.health=Math.min(g.player.maxHealth,point.hp);g.player.shield=Math.min(g.player.maxShield,point.shield);g.updateHud();this.flash(0xc49aff,7);
     }break;
   }
   case 'chain':{
     const enemies=[...g.enemies.enemies].filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<33).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
     const targets=[];if(enemies.length)targets.push(enemies.shift());
     while(targets.length>0&&targets.length<3){const end=targets[targets.length-1];const next=enemies.find(e=>Math.hypot(e.x-end.x,e.z-end.z)<14);if(!next)break;targets.push(next);enemies.splice(enemies.indexOf(next),1);}
     targets.forEach((e,i)=>g.enemies.damage(e,[75,55,38][i],new THREE.Vector3(e.x,e.y,e.z),'pulse'));
     this.flash(0x7adaff,9);break;
   }
   case 'gravity':{
     const enemies=[...g.enemies.enemies].filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<32).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
     if(enemies.length){const focus=enemies[0];for(const e of g.enemies.enemies)if(Math.hypot(e.x-focus.x,e.z-focus.z)<10){e.frozenUntil=now()+2000;e.gravityUntil=now()+2000;}this.flash(0xd4b2ff,12,{x:focus.x,y:0,z:focus.z});}break;
   }
   case 'clones':this.spawnLocalClones();break;
   case 'shield':this.status.shield=now()+5000;this.flash(0x82ffd0,4);break;
   case 'swap':{
     const candidates=g.enemies.enemies.filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<45).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
     const e=candidates.find(e=>{const dx=e.x-p.x,dz=e.z-p.z,d=Math.hypot(dx,dz)||1;return(dx*(-Math.sin(g.yaw))+dz*(-Math.cos(g.yaw)))/d>.79;});
     if(!e){g.toast('MIRE EM UM INIMIGO PARA TROCAR DE LUGAR');return;}
     const origin={x:p.x,z:p.z,y:p.y};
     if(!g.urban.canOccupy(e.x,e.z,0,1.77,.48)){g.toast('LOCAL DO ALVO BLOQUEADO');return;}
     p.spawn(e.x,0,e.z);e.x=origin.x;e.z=origin.z;this.flash(0xdcb6ff,7);break;
   }
  }
  g.toast('PODER ATIVADO · '+POWER_DATA[id].label);
 }
 flash(color,radius=7,point=null){
  const pos=point||this.game.parkour;
  const geo=new THREE.RingGeometry(.85,1,44);const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false});
  const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(pos.x,pos.y+.08,pos.z);this.game.world.scene.add(mesh);
  this.effects.push({mesh,ttl:.45,radius});
 }
 cleanupMarker(){if(this.teleportMarker){this.game.world.scene.remove(this.teleportMarker);this.teleportMarker.geometry.dispose();this.teleportMarker.material.dispose();this.teleportMarker=null;}}
 validPosition(x,y,z){return this.game.urban.canOccupy(x,z,y,1.77,.48)&&y>=0&&y<=38&&Math.hypot(x-this.game.parkour.x,z-this.game.parkour.z)<=410;}
 findTarget(){
  const g=this.game,pk=g.parkour;
  const origin=new THREE.Vector3(),dir=new THREE.Vector3();g.world.camera.getWorldPosition(origin);g.world.camera.getWorldDirection(dir);
  // First prefer a real downward-facing rooftop intersected by the crosshair.
  const targets=g.urban.rayTargets||[];
  const hits=new THREE.Raycaster(origin,dir,.1,35).intersectObjects(targets,false);
  for(const hit of hits){
   if(hit.face?.normal?.y>.65){const {x,y,z}=hit.point;if(this.validPosition(x,y+.09,z))return {x,y:y+.09,z,valid:true};}
   // Hitting a wall never permits teleporting into that wall.
   break;
  }
  let best=null;
  for(let d=150;d>=4;d-=1){
   const x=pk.x+dir.x*d,z=pk.z+dir.z*d;
   if(Math.abs(x)>142||Math.abs(z)>142)continue;
   const candidateSurfaces=g.urban.surfaces.filter(s=>!s.ramp&&Math.abs(x-s.x)<s.hx-.6&&Math.abs(z-s.z)<s.hz-.6).map(s=>s.y);
   // Prefer the floor nearest the point along the camera ray.
   const aimY=origin.y+dir.y*d;
   const y=candidateSurfaces.sort((a,b)=>Math.abs(a-aimY)-Math.abs(b-aimY))[0]??0;
   if(this.validPosition(x,y+.08,z)){best={x,y:y+.08,z,valid:true};break;}
  }
  return best||{x:pk.x,y:pk.y,z:pk.z,valid:false};
 }
 updateTarget(){if(!this.targeting)return;this.target=this.findTarget();if(!this.teleportMarker){this.teleportMarker=new THREE.Mesh(new THREE.RingGeometry(.65,.88,32),new THREE.MeshBasicMaterial({color:0x75ffc7,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.teleportMarker.rotation.x=-Math.PI/2;this.game.world.scene.add(this.teleportMarker);}this.teleportMarker.position.set(this.target.x,this.target.y+.08,this.target.z);this.teleportMarker.material.color.setHex(this.target.valid?0x68ffd3:0xff6576);}
 confirmTeleport(){this.menu?.confirmTeleport();}
 sendTeleport(dest){
   if(!dest?.valid)return;
   this.game.mouseDown=false;
   if(this.game.mode==='multiplayer'){this.game.multiplayer.send({type:'power',id:'teleport',target:{x:dest.x,y:dest.y,z:dest.z}});return;}
   const pk=this.game.parkour;
   if(!this.game.urban.canOccupy(dest.x,dest.z,dest.y,1.77,.48))return;
   this.returnPoint={x:pk.x,y:pk.y,z:pk.z,until:now()+12000};pk.spawn(dest.x,dest.y,dest.z);this.cooldowns.teleport=now()+27000;this.flash(0xbda7ff,8);
 }
 aimLocal(range){const g=this.game,p=g.parkour;return {x:clamp(p.x-Math.sin(g.yaw)*range,-140,140),y:p.y,z:clamp(p.z-Math.cos(g.yaw)*range,-140,140)};}
 spawnLocalClones(){
   const g=this.game,p=g.parkour;
   const mat=new THREE.MeshStandardMaterial({color:0x70c8dd,metalness:.2,roughness:.6,transparent:true,opacity:.46});
   for(let i=0;i<3;i++){
     const x=p.x+(i-1)*3,z=p.z+(i%2?2:-2);
     if(!g.urban.canOccupy(x,z,p.y,1.77,.4))continue;
     const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.34,1.3,4,8),mat.clone());mesh.position.set(x,p.y+1.05,z);g.world.scene.add(mesh);this.decoys.push({mesh,until:now()+8000});
   }
 }
 clearDecoys(){for(const d of this.decoys){this.game.world.scene.remove(d.mesh);d.mesh.geometry.dispose();d.mesh.material.dispose();}this.decoys=[];}

 returnTeleport(){const pt=this.returnPoint;if(!pt||pt.until<now())return;this.returnPoint=null;if(this.game.mode==='multiplayer'){this.game.multiplayer.send({type:'power',id:'teleport',back:true});return;}this.game.parkour.spawn(pt.x,pt.y,pt.z);this.flash(0xbda7ff,5);}
 onServerState(state){if(!state)return;for(const id of Object.keys(POWER_DATA)){if(state.cooldowns?.[id])this.cooldowns[id]=state.cooldowns[id];}this.status.freeze=state.frozenUntil||0;this.status.flight=state.flightUntil||0;this.status.invisible=state.invisibleUntil||0;this.status.phase=state.phaseUntil||0;this.status.shield=state.shieldUntil||0;this.status.gravity=state.gravityUntil||0;this.returnPoint=state.returnUntil>now()?{until:state.returnUntil}:null;}
 onServerEffect(msg){const g=this.game,pk=g.parkour;if(msg.player!==g.multiplayer.id)return;
  if(msg.kind==='teleport'||msg.kind==='teleport-back'||msg.kind==='rewind'||msg.kind==='swap'){pk.spawn(msg.x,msg.y,msg.z);this.flash(0xbda7ff,5);}
  if(msg.kind==='blackhole-pull'){if(Number.isFinite(msg.x)&&Number.isFinite(msg.z)){pk.x=msg.x;pk.z=msg.z;pk.vx*=.7;pk.vz*=.7;}return;}
  if(msg.kind==='push'){if(Number.isFinite(msg.x))pk.spawn(msg.x,msg.y,msg.z);pk.dashTime=.30;pk.dashVX=msg.dx*24;pk.dashVZ=msg.dz*24;pk.vy=Math.max(pk.vy,5);pk.grounded=false;this.flash(0x80caff,5);}
  if(msg.kind==='freeze'){this.status.freeze=now()+1000;g.mouseDown=false;this.flash(0x8eeaff,3);}
  if(msg.kind==='gravity'&&Array.isArray(msg.affected)&&msg.affected.includes(g.multiplayer.id)){this.status.gravity=now()+2000;this.flash(0xd4b2ff,8);}
  if(msg.kind==='phase-exit'&&Number.isFinite(msg.x))pk.spawn(msg.x,msg.y,msg.z);
 }
 update(dt){const g=this.game,pk=g.parkour,t=now();
  // O mapa interativo controla a escolha do destino sem travar a mira.
  if(!this.targeting&&this.teleportMarker)this.cleanupMarker();
  if(this.returnPoint&&this.returnPoint.until<t)this.returnPoint=null;
  if(g.mode!=='multiplayer'&&g.state==='playing'){
    this.history.push({t,x:pk.x,y:pk.y,z:pk.z,hp:g.player.health,shield:g.player.shield});
    while(this.history.length&&this.history[0].t<t-5100)this.history.shift();
    for(let i=this.localHazards.length-1;i>=0;i--){const h=this.localHazards[i];if(h.until<t){this.localHazards.splice(i,1);continue;}for(const e of g.enemies.enemies){const distance=Math.hypot(e.x-h.x,e.z-h.z);if(distance<.5||distance>11)continue;const nx=e.x+(h.x-e.x)/distance*.26,nz=e.z+(h.z-e.z)/distance*.26;if(g.world.canMove(nx,nz,e.radius)&&g.urban.canOccupy(nx,nz,0,2,e.radius)){e.x=nx;e.z=nz;}}}
  }
  for(let i=this.decoys.length-1;i>=0;i--){const d=this.decoys[i];if(d.until<t){g.world.scene.remove(d.mesh);d.mesh.geometry.dispose();d.mesh.material.dispose();this.decoys.splice(i,1);}else{d.mesh.rotation.y+=dt*.4;}}
  $('titan-power-picker').classList.toggle('hidden',g.state==='menu');
  if(!this.isActive('phase')&&this.status.phase&&this.status.phase<t){
    this.status.phase=0;if(!g.urban.canOccupy(pk.x,pk.z,pk.y,1.77,.42))pk.spawn(this.lastSafe.x,this.lastSafe.y,this.lastSafe.z);
  }
  if(!this.isActive('phase')&&g.urban.canOccupy(pk.x,pk.z,pk.y,1.77,.42))this.lastSafe={x:pk.x,y:pk.y,z:pk.z};
  for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.ttl-=dt;const f=1-e.ttl/.45;e.mesh.scale.setScalar(1+(e.radius-1)*f);e.mesh.material.opacity=Math.max(0,.7*(1-f));if(e.ttl<=0){g.world.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();this.effects.splice(i,1);}}
  $('power-descend').classList.toggle('visible',this.isActive('flight')&&!!g.mobile?.enabled);
  this.uiTick-=dt;if(this.uiTick<0){for(let i=0;i<2;i++){const id=this.loadout[i],btn=$('power-'+(i?'b':'a'));const until=this.cooldowns[id]||0;const left=Math.ceil((until-t)/1000);const active=this.isActive(id);const back=id==='teleport'&&this.returnPoint?.until>t;const label=btn.querySelector('.power-time');label.textContent=back?'VOLTAR':left>0?left+'s':active?'ATIVO':'PRONTO';btn.classList.toggle('cooling',left>0&&!back);btn.classList.toggle('active',active||back);}this.uiTick=.2;}
 }
 resetOnDeath(){this.cancelTargeting();this.returnPoint=null;this.status={};}
}

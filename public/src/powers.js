import * as THREE from 'three';
export const POWER_DATA={
 push:{label:'REPULSÃO',icon:'◉',cool:14,help:'Empurra inimigos em 11 m'},
 freeze:{label:'CONGELAR',icon:'❄',cool:18,help:'Paralisa por 1 segundo'},
 teleport:{label:'TELEPORTE',icon:'↝',cool:25,help:'Escolha um ponto e retorne em 5 s'},
 flight:{label:'VOAR',icon:'↑',cool:30,help:'Voe durante 5 segundos'},
 invisible:{label:'INVISÍVEL',icon:'◌',cool:24,help:'Desapareça por 3 segundos'},
 phase:{label:'INTANGÍVEL',icon:'◇',cool:38,help:'Atravesse paredes durante 6 segundos'}
};
const $=id=>document.getElementById(id);
const now=()=>Date.now();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class PowerSystem {
 constructor(game){
  this.game=game;this.loadout=['push','teleport'];this.cooldowns={};this.status={};this.returnPoint=null;this.targeting=false;
  this.lastSafe={x:0,y:0,z:18};this.teleportMarker=null;this.effects=[];this.flightBefore=false;this.uiTick=0;
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
     const id=this.loadout[slot];
     // Mobile: hold+drag the teleport control to point, release to confirm.
     if(id==='teleport'&&!this.returnPoint)this.use(id);
     else if(id!=='teleport')this.use(id);
     else this.returnTeleport();
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
     if(this.targeting&&this.loadout[slot]==='teleport')this.confirmTeleport();
     e.preventDefault();
   };
   button.addEventListener('pointerup',stop);
   button.addEventListener('pointercancel',()=>{touch=null;button.classList.remove('pressed');this.cancelTargeting();});
  }
  const descend=$('power-descend');
  descend.addEventListener('pointerdown',e=>{e.preventDefault();this.game.keys.ControlLeft=true;try{descend.setPointerCapture(e.pointerId);}catch{}});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])descend.addEventListener(evt,()=>{this.game.keys.ControlLeft=false;});
  this.refreshSelects();this.refreshButtons();
 }
 reset(){this.cooldowns={};this.status={};this.returnPoint=null;this.targeting=false;this.cleanupMarker();for(const e of this.effects){this.game.world.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}this.effects=[];this.lastSafe={x:0,y:0,z:18};this.refreshButtons();}
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
 frozen(){return this.isActive('freeze');}
 cancelTargeting(){this.targeting=false;this.cleanupMarker();}
 useSlot(i){this.use(this.loadout[i]);}
 use(id){
  const g=this.game;if(g.state!=='playing'||!POWER_DATA[id]||(g.mode==='multiplayer'&&!g.multiplayer.alive))return;
  if(id==='teleport'&&this.returnPoint?.until>now()){this.returnTeleport();return;}
  if(id==='teleport'&&this.targeting){this.confirmTeleport();return;}
  if(this.frozen()){g.toast('CONGELADO!');return;}
  if((this.cooldowns[id]||0)>now()){g.toast('RECARGA · '+Math.ceil((this.cooldowns[id]-now())/1000)+'s');return;}
  if(this.isActive('phase')&&id!=='phase')return;
  if(id==='teleport'){
   g.mouseDown=false;this.targeting=true;this.updateTarget();g.toast('TELEPORTE: MIRE NO DESTINO E CONFIRME');return;
  }
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
 validPosition(x,y,z){return this.game.urban.canOccupy(x,z,y,1.77,.48)&&y>=0&&y<=38&&Math.hypot(x-this.game.parkour.x,z-this.game.parkour.z)<=35;}
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
  for(let d=30;d>=4;d-=1){
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
 confirmTeleport(){
  if(!this.targeting)return;
  this.updateTarget();const dest=this.target;
  if(!dest?.valid){this.game.toast('DESTINO BLOQUEADO · MIRE EM UM PISO');return;}
  this.cancelTargeting();this.game.mouseDown=false;
  if(this.game.mode==='multiplayer'){this.game.multiplayer.send({type:'power',id:'teleport',target:{x:dest.x,y:dest.y,z:dest.z}});return;}
  const pk=this.game.parkour;this.returnPoint={x:pk.x,y:pk.y,z:pk.z,until:now()+5000};pk.spawn(dest.x,dest.y,dest.z);this.cooldowns.teleport=now()+25000;this.flash(0xbda7ff,5);
 }
 returnTeleport(){const pt=this.returnPoint;if(!pt||pt.until<now())return;this.returnPoint=null;if(this.game.mode==='multiplayer'){this.game.multiplayer.send({type:'power',id:'teleport',back:true});return;}this.game.parkour.spawn(pt.x,pt.y,pt.z);this.flash(0xbda7ff,5);}
 onServerState(state){if(!state)return;for(const id of Object.keys(POWER_DATA)){if(state.cooldowns?.[id])this.cooldowns[id]=state.cooldowns[id];}this.status.freeze=state.frozenUntil||0;this.status.flight=state.flightUntil||0;this.status.invisible=state.invisibleUntil||0;this.status.phase=state.phaseUntil||0;this.returnPoint=state.returnUntil>now()?{until:state.returnUntil}:null;}
 onServerEffect(msg){const g=this.game,pk=g.parkour;if(msg.player!==g.multiplayer.id)return;
  if(msg.kind==='teleport'||msg.kind==='teleport-back'){pk.spawn(msg.x,msg.y,msg.z);this.flash(0xbda7ff,5);}
  if(msg.kind==='push'){if(Number.isFinite(msg.x))pk.spawn(msg.x,msg.y,msg.z);pk.dashTime=.30;pk.dashVX=msg.dx*24;pk.dashVZ=msg.dz*24;pk.vy=Math.max(pk.vy,5);pk.grounded=false;this.flash(0x80caff,5);}
  if(msg.kind==='freeze'){this.status.freeze=now()+1000;g.mouseDown=false;this.flash(0x8eeaff,3);}
  if(msg.kind==='phase-exit'&&Number.isFinite(msg.x))pk.spawn(msg.x,msg.y,msg.z);
 }
 update(dt){const g=this.game,pk=g.parkour,t=now();
  if(this.targeting)this.updateTarget();
  if(!this.targeting&&this.teleportMarker)this.cleanupMarker();
  if(this.returnPoint&&this.returnPoint.until<t)this.returnPoint=null;
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

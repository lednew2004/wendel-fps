import * as THREE from 'three';
import {createOperative,animateOperative,disposeOperative} from './characters.js';
import {heroById} from './heroRoster.js';

/**
 * TITAN 3.2 — câmera orbital de acompanhamento, sem bibliotecas novas.
 * Os volumes de colisão já utilizados pelo jogo evitam câmera atravessando paredes.
 * A câmera não altera a posição do personagem nem a simulação do servidor.
 */
export function rayBoxEntry(origin, direction, collider, maxDistance, padding=.14){
  if(!collider || collider.active===false)return null;
  const lo=[collider.x-collider.hx-padding,collider.minY??0,collider.z-collider.hz-padding];
  const hi=[collider.x+collider.hx+padding,collider.maxY??18,collider.z+collider.hz+padding];
  let t0=0,t1=maxDistance;
  for(let axis=0;axis<3;axis++){
    const p=axis===0?origin.x:axis===1?origin.y:origin.z;
    const d=axis===0?direction.x:axis===1?direction.y:direction.z;
    if(Math.abs(d)<1e-8){if(p<lo[axis]||p>hi[axis])return null;continue;}
    let a=(lo[axis]-p)/d,b=(hi[axis]-p)/d;
    if(a>b){const temp=a;a=b;b=temp;}
    t0=Math.max(t0,a);t1=Math.min(t1,b);
    if(t0>t1)return null;
  }
  return Math.max(0,t0);
}
export function unobstructedCameraDistance(origin,direction,desired,colliders){
  let nearest=desired;
  for(const c of colliders||[]){
    if(Math.abs(c.x-origin.x)>desired+(c.hx||0)+1||Math.abs(c.z-origin.z)>desired+(c.hz||0)+1)continue;
    const t=rayBoxEntry(origin,direction,c,desired);
    if(t!==null)nearest=Math.min(nearest,Math.max(.42,t-.19));
  }
  return nearest;
}
export function cameraPreference(store){
  try{return store?.getItem('titan-camera-mode')==='first'?'first':'third';}catch{return 'third';}
}

export class ThirdPersonCamera {
  constructor(game){
    this.game=game;
    this.mode=cameraPreference(typeof localStorage!=='undefined'?localStorage:null);
    this.cameraDistance=4.15;
    this.shoulder=.72;
    this.height=.34;
    this.avatar=null;this.morphProp=null;this.morphType='';this.opacity=1;
    this.currentLocal=new THREE.Vector3(this.shoulder,this.height,this.cameraDistance);
    this.currentHero='';this.lastX=null;this.lastZ=null;this.fireTime=0;this.hurtTime=0;this.castTime=0;
    this.pivot=new THREE.Vector3();this.destination=new THREE.Vector3();this.dir=new THREE.Vector3();
    this._quat=new THREE.Quaternion();
    this.syncButton();
    game.world.cameraMode=this.mode;
  }
  syncButton(){
    const b=document.getElementById('camera-mode-switch');if(!b)return;
    b.textContent=this.mode==='third'?'◉ 3ª PESSOA':'◎ 1ª PESSOA';
    b.title=this.mode==='third'?'Alterar para primeira pessoa (V)':'Alterar para terceira pessoa (V)';
    b.setAttribute('aria-label',b.title);
    b.setAttribute('aria-pressed',String(this.mode==='third'));
    document.body.classList.toggle('third-person-view',this.mode==='third');
  }
  setMode(mode){
    if(mode!=='first'&&mode!=='third')return;
    this.mode=mode;this.game.world.cameraMode=mode;
    try{localStorage.setItem('titan-camera-mode',mode);}catch{}
    this.syncButton();
    this.currentLocal.set(this.shoulder,this.height,this.cameraDistance);
    this.update(0,true);
  }
  toggle(){this.setMode(this.mode==='first'?'third':'first');}
  ensureAvatar(){
    const g=this.game;
    const hero=g.heroSelection?.selectedHero||'striker';
    if(this.avatar&&this.currentHero===hero)return this.avatar;
    if(this.avatar){g.world.scene.remove(this.avatar);disposeOperative(this.avatar);this.opacity=1;}
    const data=heroById(hero);
    this.avatar=createOperative({role:'player',hero,size:.78,player:true,tint:data.color});
    this.avatar.name='PERSONAGEM_LOCAL_'+hero.toUpperCase();
    // Texturas caras não são necessárias para a silhueta do jogador local.
    if(g.mobile?.enabled)this.avatar.traverse(obj=>{if(obj.isMesh)obj.castShadow=false;});
    g.world.scene.add(this.avatar);g.world.thirdPersonAvatar=this.avatar;
    this.currentHero=hero;this.lastX=null;this.lastZ=null;
    return this.avatar;
  }
  makeMorphProp(type='barrel'){
    if(this.morphProp){this.game.world.scene.remove(this.morphProp);this.morphProp.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
    const group=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x515f6a,metalness:.5,roughness:.45}),paint=new THREE.MeshStandardMaterial({color:0xb85a4b,metalness:.4,roughness:.5});
    const part=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);};
    if(type==='truck'){
      part(new THREE.BoxGeometry(2,1.15,3.2),paint,0,.95,0);
      part(new THREE.BoxGeometry(1.7,.92,1.2),steel,0,1.75,-.74);
      for(const x of [-.85,.85])for(const z of [-1.05,.95]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.2,10),steel);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.43,z);group.add(wheel);}
    }else if(type==='forklift'){
      part(new THREE.BoxGeometry(1.3,.8,1.6),paint,0,.60,0);
      for(const x of [-.58,.58]){part(new THREE.BoxGeometry(.11,1.7,.12),steel,x,1.45,-.35);part(new THREE.BoxGeometry(.16,.12,1.4),steel,x,.18,-1.2);}
      part(new THREE.BoxGeometry(1.42,.12,1.02),steel,0,2.3,-.35);
    }else{
      part(new THREE.CylinderGeometry(.63,.63,1.38,12),paint,0,.74,0);
      for(const y of [.34,1.24])part(new THREE.CylinderGeometry(.66,.66,.09,12),steel,0,y,0);
    }
    this.morphProp=group;this.morphType=type;this.game.world.scene.add(group);return group;
  }
  emitFire(){this.fireTime=.16;}
  emitCast(){this.castTime=.28;}
  emitHit(){this.hurtTime=.18;}
  update(dt=1/60,instant=false){
    const g=this.game,world=g.world;
    if(!world?.camera||!g.player)return;
    const isActive=g.state==='playing'||g.state==='paused'||g.state==='upgrade';
    if(this.mode!=='third'||!isActive){
      if(this.avatar)this.avatar.visible=false;
      if(this.morphProp)this.morphProp.visible=false;
      if(g.weapons)g.weapons.model.visible=g.state==='playing';
      if(this.mode==='first'&&g.state==='playing')world.camera.position.set(0,0,0);
      return;
    }
    const avatar=this.ensureAvatar();avatar.visible=true;
    const morph=!!g.powers?.isActive?.('morph');
    if(morph){
      const type=g.powers?.morphVisualType||'barrel';
      if(!this.morphProp||this.morphType!==type)this.makeMorphProp(type);
      this.morphProp.visible=true;avatar.visible=false;
    }else if(this.morphProp)this.morphProp.visible=false;
    const p=g.player;
    const groundY=Number.isFinite(g.parkour?.y)?g.parkour.y:Math.max(0,p.eyeY-1.75);
    const feetY=g.mode==='multiplayer' ? Math.max(0,p.eyeY-1.75) : groundY;
    avatar.position.set(p.x,feetY,p.z);avatar.rotation.set(0,g.yaw,0);
    if(morph&&this.morphProp){this.morphProp.position.set(p.x,feetY,p.z);this.morphProp.rotation.y=g.yaw;}
    const opacity=g.powers?.isActive?.('invisible')?.30:g.powers?.isActive?.('phase')?.48:1;
    if(this.opacity!==opacity){
      this.opacity=opacity;
      for(const mat of avatar.userData.rig.materials){mat.transparent=opacity<1;mat.opacity=opacity;mat.depthWrite=opacity>=1;mat.needsUpdate=true;}
    }
    const vX=dt>0&&this.lastX!==null?(p.x-this.lastX)/dt:(p.moveX||0);
    const vZ=dt>0&&this.lastZ!==null?(p.z-this.lastZ)/dt:(p.moveZ||0);
    this.lastX=p.x;this.lastZ=p.z;
    const speed=Math.hypot(vX,vZ);
    const dashing=(g.parkour?.dashTime||0)>0||!!g.powers?.motion?.hasDash?.();
    const jumping=!g.parkour?.grounded;
    const lateral=vX*Math.cos(g.yaw)-vZ*Math.sin(g.yaw);
    animateOperative(avatar,dt,{moving:Math.min(1,speed/7),strafe:Math.max(-1,Math.min(1,lateral/6)),firing:this.fireTime>0,
      casting:this.castTime>0,reloading:g.weapons?.reloadTime>0,hit:this.hurtTime>0,
      dash:!!dashing,airborne:!!jumping,aiming:g.rightDown,crouching:(g.parkour?.slide||0)>0,distance:0});
    const rig=avatar.userData.rig;
    rig.head.rotation.x+=THREE.MathUtils.clamp(g.pitch*.25,-.25,.25);
    // Legacy rig is removed after GLB load, so turn the actual head bone.
    const skeletal=avatar.userData.skeletal;
    if(skeletal){
      const head=skeletal.avatar.getObjectByName('head');
      if(head)head.rotation.x+=THREE.MathUtils.clamp(g.pitch*.20,-.22,.22);
      skeletal.avatar.rotation.z=THREE.MathUtils.clamp(lateral/12,-1,1)*-.055;
    }
    rig.rifle.rotation.x=THREE.MathUtils.clamp(-g.pitch*.45,-.55,.55);
    const strafe=vX*Math.cos(g.yaw)-vZ*Math.sin(g.yaw);
    rig.torso.rotation.z-=THREE.MathUtils.clamp(strafe/11,-1,1)*.12;
    this.fireTime=Math.max(0,this.fireTime-dt);this.hurtTime=Math.max(0,this.hurtTime-dt);this.castTime=Math.max(0,this.castTime-dt);
    // Câmera acompanha por cima do ombro; ADS aproxima sem mudar direção da mira.
    const distance=g.rightDown?2.35:4.15;
    const shoulder=g.rightDown?.44:.72;
    world.cameraRig.updateWorldMatrix(true,true);
    this.pivot.copy(world.cameraPitch.getWorldPosition(new THREE.Vector3()));
    const desired=new THREE.Vector3(shoulder,this.height,distance);
    world.cameraPitch.getWorldQuaternion(this._quat);
    this.destination.copy(desired).applyQuaternion(this._quat).add(this.pivot);
    this.dir.copy(this.destination).sub(this.pivot);
    const total=this.dir.length();this.dir.normalize();
    const safe=unobstructedCameraDistance(this.pivot,this.dir,total,world.city?.solids||world.solids);
    if(safe<total)desired.multiplyScalar(safe/total);
    // Piso não deve sumir através da câmera em ângulos extremos.
    const proposedY=this.pivot.y+desired.clone().applyQuaternion(this._quat).y;
    if(proposedY<Math.max(.28,feetY+.17))desired.multiplyScalar(Math.max(.25,(this.pivot.y-feetY-.17)/Math.max(.01,this.pivot.y-proposedY)));
    const alpha=instant?1:1-Math.exp(-Math.max(0,dt)*13);
    this.currentLocal.lerp(desired,alpha);
    world.camera.position.copy(this.currentLocal);
    // O centro da tela continua quase paralelo ao vetor da mira em 1ª pessoa.
    world.camera.rotation.set(0,0,0);
    world.camera.updateWorldMatrix(true,false);
    if(g.weapons)g.weapons.model.visible=false;
  }
}

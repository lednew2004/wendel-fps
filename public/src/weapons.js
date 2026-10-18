import * as THREE from 'three';
import {WEAPONS,rand,lerp} from './constants.js';

function weaponBox(group,size,pos,mat){
  const m=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),mat);
  m.position.set(pos[0],pos[1],pos[2]);
  m.castShadow=true; m.receiveShadow=true; m.renderOrder=16;
  group.add(m); return m;
}
function weaponCyl(group,rt,rb,h,pos,rot,mat,segments=12){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),mat);
  m.position.set(pos[0],pos[1],pos[2]);
  m.rotation.set(rot[0],rot[1],rot[2]);
  m.castShadow=true; m.receiveShadow=true; m.renderOrder=16;
  group.add(m); return m;
}

export class Weapons {
  constructor(world,audio,hooks){
    this.world=world; this.audio=audio; this.hooks=hooks;
    this.index=0; this.state=WEAPONS.map(w=>({clip:w.clip,reserve:w.reserve}));
    this.fireCooldown=0; this.reloadTime=0; this.recoil=0; this.ads=0; this.reloadingVisual=0; this.bob=0;
    this.tracers=[]; this.muzzleTime=0; this.fireMultiplier=1; this.damageMultiplier=1; this.shooting=false; this.aiming=false;
    this.buildModel(); this.switchTo(0);
  }
  get def(){return WEAPONS[this.index]}
  get ammo(){return this.state[this.index]}
  reset(){this.state=WEAPONS.map(w=>({clip:w.clip,reserve:w.reserve}));this.index=0;this.fireCooldown=0;this.reloadTime=0;this.recoil=0;this.fireMultiplier=1;this.damageMultiplier=1;this.switchTo(0);}

  buildModel(){
    this.model=new THREE.Group();
    this.world.camera.add(this.model);
    this.weaponObjects=[];

    const gunBlack=new THREE.MeshStandardMaterial({color:0x25292d,metalness:.92,roughness:.30,depthTest:false});
    const gunSteel=new THREE.MeshStandardMaterial({color:0x6e7478,metalness:.92,roughness:.23,depthTest:false});
    const polymer=new THREE.MeshStandardMaterial({color:0x373d41,metalness:.48,roughness:.62,depthTest:false});
    const wood=new THREE.MeshStandardMaterial({color:0x785d42,metalness:.12,roughness:.78,depthTest:false});
    const tan=new THREE.MeshStandardMaterial({color:0x6d6559,metalness:.26,roughness:.76,depthTest:false});
    const handMat=new THREE.MeshStandardMaterial({color:0xb48869,metalness:.02,roughness:.96,depthTest:false});
    const gloveMat=new THREE.MeshStandardMaterial({color:0x5f655f,metalness:.12,roughness:.88,depthTest:false});

    const buildHands=(group, forePos=[-.12,-.26,-.07], supportPos=[.15,-.16,-.56])=>{
      const left=new THREE.Group();
      weaponBox(left,[.16,.12,.22],[0,0,0],gloveMat);
      weaponBox(left,[.18,.26,.18],[.04,-.16,.03],handMat);
      weaponCyl(left,.065,.072,.32,[.12,-.32,.06],[0,0,.14],gloveMat,10);
      left.position.set(forePos[0],forePos[1],forePos[2]);
      group.add(left);

      const right=new THREE.Group();
      weaponBox(right,[.16,.12,.20],[0,0,0],gloveMat);
      weaponBox(right,[.17,.24,.17],[.02,-.14,.02],handMat);
      weaponCyl(right,.06,.07,.28,[.05,-.28,.03],[0,0,-.22],gloveMat,10);
      right.position.set(supportPos[0],supportPos[1],supportPos[2]);
      group.add(right);
      return {left,right};
    };

    const buildRifle=()=>{
      const g=new THREE.Group();
      weaponBox(g,[.30,.20,.86],[0,0,-.10],gunBlack); // receiver
      weaponBox(g,[.22,.14,.48],[0,.10,.08],gunSteel); // upper
      weaponBox(g,[.13,.34,.18],[0,-.21,.17],polymer); // grip
      weaponBox(g,[.20,.28,.24],[0,-.25,.00],polymer); // magwell
      weaponBox(g,[.12,.10,.82],[0,.01,-.82],gunSteel); // barrel
      weaponBox(g,[.17,.10,.56],[0,-.02,-.52],polymer); // handguard
      weaponBox(g,[.06,.08,.16],[0,.13,-1.17],gunBlack); // muzzle
      weaponBox(g,[.19,.12,.34],[0,.18,-.32],gunBlack); // top rail
      weaponBox(g,[.10,.12,.20],[0,.28,-.32],gunSteel); // rear sight
      weaponBox(g,[.18,.06,.18],[0,-.16,.25],polymer);
      weaponCyl(g,.035,.035,.30,[.14,-.08,.16],[Math.PI/2,0,0],gunBlack,10); // trigger guard
      const stock=new THREE.Group();
      weaponBox(stock,[.10,.16,.36],[0,.00,.22],tan);
      weaponBox(stock,[.15,.08,.22],[0,.07,.06],tan);
      stock.position.set(0,.02,.34); g.add(stock);
      const hands=buildHands(g,[-.12,-.27,-.02],[.14,-.11,-.44]);
      return g;
    };

    const buildShotgun=()=>{
      const g=new THREE.Group();
      weaponBox(g,[.26,.17,.92],[0,0,-.08],gunBlack);
      weaponBox(g,[.14,.14,1.02],[0,-.12,-.62],gunSteel);
      weaponBox(g,[.12,.12,.98],[0,.00,-.78],gunSteel);
      weaponBox(g,[.20,.16,.40],[0,-.03,-.42],wood);
      weaponBox(g,[.14,.34,.18],[0,-.23,.11],wood);
      weaponBox(g,[.11,.10,.17],[0,.09,-1.22],gunBlack);
      const stock=new THREE.Group();
      weaponBox(stock,[.12,.18,.34],[0,-.03,.25],wood);
      weaponBox(stock,[.18,.08,.18],[0,.03,.09],wood);
      stock.position.set(0,.03,.32); g.add(stock);
      buildHands(g,[-.14,-.25,.02],[.15,-.10,-.49]);
      return g;
    };

    const buildSniper=()=>{
      const g=new THREE.Group();
      weaponBox(g,[.24,.15,.98],[0,0,-.06],gunBlack);
      weaponBox(g,[.12,.12,1.06],[0,.00,-.89],gunSteel);
      weaponBox(g,[.18,.09,.46],[0,.16,-.24],gunBlack);
      weaponBox(g,[.10,.10,.35],[0,.26,-.33],gunSteel);
      weaponBox(g,[.18,.34,.16],[0,-.21,.14],polymer);
      weaponBox(g,[.15,.17,.58],[0,-.02,-.48],polymer);
      weaponBox(g,[.09,.08,.18],[0,.03,-1.30],gunBlack);
      weaponBox(g,[.10,.18,.22],[0,-.17,-.04],gunSteel); // mag
      const scopeBody=weaponCyl(g,.065,.065,.52,[0,.24,-.44],[Math.PI/2,0,0],gunBlack,12);
      weaponBox(g,[.08,.08,.08],[0,.16,-.28],gunSteel); weaponBox(g,[.08,.08,.08],[0,.16,-.60],gunSteel);
      const stock=new THREE.Group();
      weaponBox(stock,[.11,.16,.44],[0,-.02,.27],tan);
      weaponBox(stock,[.18,.08,.20],[0,.06,.07],tan);
      stock.position.set(0,0,.36); g.add(stock);
      buildHands(g,[-.12,-.27,.01],[.15,-.14,-.58]);
      return g;
    };

    const buildLMG=()=>{
      const g=new THREE.Group();
      weaponBox(g,[.34,.22,1.00],[0,0,-.08],gunBlack);
      weaponBox(g,[.20,.18,.50],[0,.12,.07],gunSteel);
      weaponBox(g,[.15,.14,1.02],[0,.02,-.86],gunSteel);
      weaponBox(g,[.28,.16,.65],[0,-.04,-.44],polymer);
      weaponBox(g,[.14,.34,.19],[0,-.23,.14],polymer);
      weaponBox(g,[.25,.20,.44],[0,-.21,-.02],tan); // box mag
      weaponBox(g,[.08,.10,.18],[0,.05,-1.33],gunBlack);
      weaponBox(g,[.20,.10,.22],[0,.22,-.28],gunBlack);
      const stock=new THREE.Group();
      weaponBox(stock,[.12,.18,.40],[0,-.01,.28],tan);
      weaponBox(stock,[.18,.09,.22],[0,.06,.10],tan);
      stock.position.set(0,.02,.36); g.add(stock);
      buildHands(g,[-.12,-.28,.00],[.15,-.12,-.53]);
      return g;
    };

    const builders=[buildRifle,buildShotgun,buildSniper,buildLMG];
    for(const [i,w] of WEAPONS.entries()){
      const group=builders[i]();
      this.weaponObjects.push(group);
      this.model.add(group);
    }

    const flashMat=new THREE.MeshBasicMaterial({color:0xffe8b4,transparent:true,opacity:.95,depthTest:false});
    this.muzzle=new THREE.Mesh(new THREE.ConeGeometry(.16,.62,7),flashMat);
    this.muzzle.rotation.x=-Math.PI/2; this.muzzle.position.set(0,.015,-1.22); this.muzzle.visible=false; this.model.add(this.muzzle);
    this.muzzleLight=new THREE.PointLight(0xffc37b,0,5); this.muzzleLight.position.set(0,.03,-1.06); this.model.add(this.muzzleLight);
  }

  setHeroAccent(hex=0x55e1ea){
    if(!this.heroAccentMaterial){
      this.heroAccentMaterial=new THREE.MeshBasicMaterial({color:hex,depthTest:false});
      this.heroAccents=this.weaponObjects.map((group,index)=>{
        const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.22,3,7),this.heroAccentMaterial);
        mesh.position.set(.17,.10,index===2?-.55:-.32);mesh.rotation.x=Math.PI/2;mesh.renderOrder=18;
        group.add(mesh);return mesh;
      });
    }
    this.heroAccentMaterial.color.setHex(hex);
  }
  switchTo(i){
    if(i<0||i>=WEAPONS.length)return;
    if(this.index===i && this.weaponObjects.length && this.weaponObjects.every((o,j)=>o.visible===(j===i))) return;
    this.index=i; this.reloadTime=0; this.fireCooldown=Math.min(this.fireCooldown,.2);
    for(let j=0;j<this.weaponObjects.length;j++) this.weaponObjects[j].visible=j===i;
    this.hooks.onWeaponChanged?.(); this.audio.play('click');
  }

  reload(){
    const s=this.ammo,d=this.def;
    if(this.reloadTime>0||s.clip===d.clip||s.reserve===0)return false;
    this.reloadTime=d.reload; this.audio.play('reload'); return true;
  }

  fire(){
    const w=this.def,s=this.ammo;
    if(this.fireCooldown>0||this.reloadTime>0)return false;
    if(s.clip<=0){ this.audio.play('empty'); this.fireCooldown=.26; this.reload(); return false; }
    s.clip--; this.fireCooldown=w.interval/this.fireMultiplier; this.recoil=Math.min(.42,this.recoil+w.recoil); this.muzzleTime=.065;
    this.audio.play(w.id==='rifle'?'rifle':w.id==='shotgun'?'shotgun':'rail');
    const origin=new THREE.Vector3(); (this.world.cameraMode==='third'?this.world.cameraPitch:this.world.camera).getWorldPosition(origin);
    const spread=this.aiming?w.spread*.38:w.spread;
    const base=new THREE.Vector3();
    if(this.world.cameraMode==='third')base.set(0,0,-1).applyQuaternion(this.world.cameraPitch.getWorldQuaternion(new THREE.Quaternion()));
    else this.world.camera.getWorldDirection(base);
    let hit=false,killed=false;
    for(let i=0;i<w.pellets;i++){
      const dir=base.clone().add(new THREE.Vector3(rand(-spread,spread),rand(-spread,spread),rand(-spread,spread))).normalize();
      const result=this.hooks.onRay(origin,dir,w.damage*this.damageMultiplier,w.range,w.id);
      if(result?.hit){ hit=true; if(result.killed) killed=true; }
      const end=result?.point || origin.clone().addScaledVector(dir,Math.min(w.range,70));
      const start=new THREE.Vector3();
      if(this.world.cameraMode==='third'&&this.world.thirdPersonAvatar){this.world.thirdPersonAvatar.userData.rig.rifle.getWorldPosition(start);start.addScaledVector(dir,.48);}
      else this.muzzle.getWorldPosition(start);
      this.addTracer(start,end,w.id==='shotgun'?0xffd38a:0xffefe0,w.id==='rail'?.06:.014,w.id==='rail'?.20:.11);
    }
    if(hit){ this.audio.play('hit'); this.hooks.onHitmarker(killed); }
    this.hooks.onFire();
    return true;
  }

  addTracer(start,end,color,width,life){
    const dir=end.clone().sub(start); const len=dir.length(); if(len<.01)return;
    const geom=new THREE.CylinderGeometry(width,width,len,5);
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.92,depthWrite:false});
    const mesh=new THREE.Mesh(geom,mat);
    mesh.position.copy(start).addScaledVector(dir,.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    this.world.scene.add(mesh); this.tracers.push({mesh,life,maxLife:life});
  }

  update(dt,moving,aiming){
    this.fireCooldown=Math.max(0,this.fireCooldown-dt);
    this.aiming=aiming;
    this.ads=lerp(this.ads,aiming?1:0,Math.min(1,dt*13));
    if(this.reloadTime>0){
      this.reloadTime-=dt;
      if(this.reloadTime<=0){
        this.reloadTime=0;
        const s=this.ammo,d=this.def,n=Math.min(d.clip-s.clip,s.reserve);
        s.clip+=n; s.reserve-=n; this.audio.play('click');
      }
    }
    this.reloadingVisual=lerp(this.reloadingVisual,this.reloadTime>0?1:0,Math.min(1,dt*10));
    this.muzzleTime-=dt; this.muzzle.visible=this.muzzleTime>0; this.muzzleLight.intensity=this.muzzleTime>0?8:0;
    this.recoil=Math.max(0,this.recoil-dt*1.7);
    this.bob+=dt*(moving?12:2.1);
    const sway=moving?.0075:0;
    const x=lerp(.41,.055,this.ads)+Math.sin(this.bob)*sway;
    const y=lerp(-.34,-.245,this.ads)-this.reloadingVisual*.35+Math.abs(Math.cos(this.bob))*sway - .016*Math.sin(this.bob*.32);
    const z=lerp(-.71,-.51,this.ads)+this.recoil*.78;
    this.model.position.set(x,y,z);
    this.model.rotation.x=this.recoil*.52 + this.reloadingVisual*.24 + Math.abs(Math.sin(this.bob))*sway*.5;
    this.model.rotation.y=this.recoil*.22 + Math.sin(this.bob*.5)*sway*.4;
    this.model.rotation.z=lerp(-.06,0,this.ads)+Math.sin(this.bob)*sway*.55;
    this.world.camera.fov=lerp(this.world.camera.fov,this.aiming?(this.index===2?34:Math.min(60,this.world.baseFOV-12)):(this.world.baseFOV||78),Math.min(1,dt*8));
    this.world.camera.updateProjectionMatrix();

    for(let i=this.tracers.length-1;i>=0;i--){
      const t=this.tracers[i]; t.life-=dt; t.mesh.material.opacity=Math.max(0,t.life/t.maxLife);
      if(t.life<=0){ this.world.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); this.tracers.splice(i,1); }
    }
  }

  clearTracers(){
    for(const t of this.tracers){ this.world.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }
    this.tracers=[];
  }
}

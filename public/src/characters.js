import * as THREE from 'three';
import {characterStyle} from './characterIdentity.js';

// Titã VOXEL: silhuetas blocadas originais. O GLB com esqueleto assume quando termina de carregar.
// Malhas e posições são relativas aos pivôs para animar sem carregar novos arquivos externos.
const SHAPES={
  orb:new THREE.BoxGeometry(2,2,2),
  capsule:new THREE.BoxGeometry(2,2,2),
  cone:new THREE.BoxGeometry(2,2,2),
  tube:new THREE.BoxGeometry(2,1,2),
  torus:new THREE.TorusGeometry(1,.15,7,20),
  plane:new THREE.PlaneGeometry(1,1)
};
const COLOR=(n,metal=.1,rough=.68)=>new THREE.MeshStandardMaterial({color:n,metalness:metal,roughness:rough});
function piece(parent,geometry,mat,position,scale,rotate){
  const obj=new THREE.Mesh(geometry,mat);
  obj.position.set(...position);obj.scale.set(...scale);
  if(rotate)obj.rotation.set(...rotate);
  obj.castShadow=true;obj.receiveShadow=false;parent.add(obj);return obj;
}
function orb(parent,mat,x,y,z,sx,sy,sz){return piece(parent,SHAPES.orb,mat,[x,y,z],[sx,sy,sz]);}
function tube(parent,mat,x,y,z,rx,ry,rz,length,radius=.08){
  return piece(parent,SHAPES.tube,mat,[x,y,z],[radius,length,radius],[rx,ry,rz]);
}
function capsule(parent,mat,x,y,z,scaleX,scaleY,scaleZ){return piece(parent,SHAPES.capsule,mat,[x,y,z],[scaleX,scaleY,scaleZ]);}

// game root faces negative Z, matching the existing rifle and AI orientation.
export function createOperative({role='scout',size=1,player=false,tint=null,hero=null}={}){
  const style=characterStyle(role,tint);
  const enemyDark=!player&&role!=='player';
  const root=new THREE.Group();root.name=`TITAN_${(hero||role).toUpperCase()}`;
  const visual=new THREE.Group();visual.scale.setScalar(size);root.add(visual);
  const fabric=COLOR(style.uniform,enemyDark?.10:.04,enemyDark?.97:.93);
  const armor=COLOR(style.armor,enemyDark?.82:.48,enemyDark?.24:.42);
  const accent=COLOR(style.accent,enemyDark?.55:.42,enemyDark?.22:.34);
  const black=COLOR(enemyDark?0x070b10:0x161f27,enemyDark?.88:.55,enemyDark?.18:.43);
  const leather=COLOR(enemyDark?0x2a2428:0x4b4040,.12,enemyDark?.72:.84);
  const skin=COLOR(style.skin,.01,.89);
  const helmet=COLOR(style.helmet,enemyDark?.78:.34,enemyDark?.26:.56);
  const glass=new THREE.MeshStandardMaterial({color:style.accent,emissive:style.accent,emissiveIntensity:enemyDark?.58:.22,metalness:.1,roughness:enemyDark?.09:.19});
  const glowing=new THREE.MeshStandardMaterial({color:style.accent,emissive:style.accent,emissiveIntensity:enemyDark?1.8:1.2,metalness:.24,roughness:.34});
  const width=style.build||1;
  const hips=orb(visual,fabric,0,.95,0,.35*width,.26,.24);
  // Rounded, sculpted vest silhouette, front plates and shoulder guards.
  const torso=new THREE.Group();torso.position.y=1.37;visual.add(torso);
  orb(torso,fabric,0,0,0,.44*width,.53,.26);
  orb(torso,armor,0,.09,-.20,.39*width,.39,.15);
  orb(torso,armor,0,-.29,-.18,.31*width,.12,.15);
  orb(torso,accent,0,.11,-.337,.13,.095,.031);
  orb(torso,black,0,.11,-.365,.068,.045,.025);
  for(const s of [-1,1]){
    orb(torso,helmet,s*.285*width,.30,-.12,.17,.16,.21);
    orb(torso,accent,s*.30*width,-.03,-.30,.06,.17,.036);
  }
  // Backpack: layered ovals and luminous insignia, no rectangular body geometry.
  orb(torso,black,0,-.03,.295,.34*width,.43,.19);
  orb(torso,armor,0,-.02,.42,.22,.32,.086);
  orb(torso,glowing,0,.10,.52,.065,.16,.03);
  tube(torso,accent,0,-.33,.50,0,0,Math.PI/2,.35,.04);
  // Head / human face; no cubes. The helmet frames distinct eyes and nose.
  const neck=orb(visual,skin,0,1.925,0,.125,.17,.12);
  const head=new THREE.Group();head.position.set(0,2.16,0);visual.add(head);
  orb(head,skin,0,.02,-.015,.265,.32,.248);
  orb(head,helmet,0,.235,.038,.303,.195,.28); // rounded helmet crown
  orb(head,helmet,0,.14,.18,.27,.17,.19);      // crown rear
  for(const s of [-1,1]){
    orb(head,helmet,s*.258,.045,.02,.07,.20,.19); // ear guards
    orb(head,enemyDark?glass:skin,s*.105,.005,-.246,.052,.034,.015); // eyes
    orb(head,enemyDark?glowing:black,s*.105,.009,-.263,.025,.021,.011);
    orb(head,leather,s*.105,-.10,-.23,.07,.025,.022); // cheek band
  }
  orb(head,skin,0,-.076,-.258,.062,.105,.079); // nose
  orb(head,leather,0,-.17,-.220,.105,.02,.034); // mouth mask edge
  if(style.visor){
    orb(head,glass,0,.060,-.267,.24,.105,.060);
    orb(head,black,0,-.09,-.278,.22,.09,.050);
  }else{
    orb(head,helmet,0,.29,-.14,.29,.045,.19); // cap brim
  }
  if(style.hood){
    orb(head,helmet,0,.145,.20,.325,.30,.17);
    orb(head,accent,0,.25,-.17,.19,.025,.085);
  }
  if(style.scope){
    tube(head,black,.22,.15,-.10,0,0,0,.31,.07);
    orb(head,glass,.22,.31,-.10,.08,.038,.08);
  }
  if(style.commander){
    for(const s of [-1,1]){
      const spike=piece(head,SHAPES.cone,helmet,[s*.25,.40,.035],[.095,.37,.095],[0,0,s*.30]);spike.castShadow=true;
    }
    orb(torso,glowing,0,.09,-.383,.19,.15,.055);
  }
  if(enemyDark){
    orb(torso,black,0,.02,-.29,.43*width,.41,.06);
    orb(torso,glowing,0,.06,-.37,.11,.17,.032);
    orb(torso,glowing,0,-.18,-.35,.07,.10,.028);
    for(const s of [-1,1]){
      orb(torso,black,s*.38*width,.18,-.18,.18,.12,.18);
      orb(head,glowing,s*.16,.08,-.285,.030,.020,.010);
    }
  }
  const arms=[];
  const legs=[];
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.48*width,1.77,0);visual.add(arm);arms.push(arm);
    orb(arm,armor,0,-.01,0,.22*width,.20,.24);
    capsule(arm,fabric,0,-.29,0,.135,.26,.135);
    const elbow=new THREE.Group();elbow.position.y=-.62;arm.add(elbow);
    orb(elbow,black,0,0,0,.145,.145,.145);
    capsule(elbow,armor,0,-.21,-.012,.16,.22,.16);
    orb(elbow,black,0,-.47,-.015,.14,.12,.13);
    orb(elbow,skin,0,-.49,-.015,.12,.11,.11);
    arm.userData.elbow=elbow;
    // Leg pivots, knee pads, boots and foot soles.
    const leg=new THREE.Group();leg.position.set(s*.20*width,.96,0);visual.add(leg);legs.push(leg);
    orb(leg,fabric,0,-.18,0,.20*width,.34,.23);
    const knee=new THREE.Group();knee.position.y=-.46;leg.add(knee);
    orb(knee,armor,0,0,-.145,.16,.145,.12);
    capsule(knee,fabric,0,-.25,.025,.15,.25,.14);
    const foot=new THREE.Group();foot.position.set(0,-.49,-.08);knee.add(foot);
    orb(foot,black,0,-.028,-.12,.18,.125,.31);
    orb(foot,accent,0,-.04,-.30,.145,.025,.09);
    leg.userData.knee=knee;
    leg.userData.foot=foot;
  }
  // Armoured classes carry heavy pauldrons and a distinct torso silhouette.
  if(style.heavy){
    for(const s of [-1,1]){
      orb(torso,armor,s*.47*width,.29,0,.29,.28,.29);
      orb(torso,accent,s*.48*width,.35,-.25,.18,.045,.038);
    }
    orb(torso,helmet,0,-.10,.48,.32,.42,.20);
  }
  if(role==='gunner'){
    for(const x of [-.19,0,.19]){
      orb(torso,leather,x,-.17,-.37,.066,.135,.048);
      orb(torso,accent,x,-.07,-.396,.055,.025,.023);
    }
  }
  if(role==='sniper'){
    const cape=new THREE.Mesh(new THREE.ConeGeometry(.4,.82,10,1,true),fabric);
    cape.position.set(.25,.08,.48);cape.rotation.z=.20;torso.add(cape);
  }
  // 10 operator silhouettes, legible at the lowest quality preset without textures.
  // All parts reuse shared primitive geometry and the existing palette: no fetch or rig overhead.
  if(hero){
    const ornament=(x,y,z,sx,sy,sz,mat=glowing)=>orb(visual,mat,x,y,z,sx,sy,sz);
    switch(hero){
      case 'forge': // voxel builder backpack and projected blocks
        for(const side of [-1,1]){ornament(side*.40,1.60,.50,.17,.38,.18,armor);ornament(side*.53,1.42,-.28,.14,.18,.15,glowing);}
        ornament(0,2.70,-.03,.45,.12,.34,accent);ornament(0,1.51,.58,.32,.35,.24,armor);break;
      case 'shiro': // twin blades and a sharp red striker silhouette
        for(const side of [-1,1]){piece(torso,SHAPES.cone,accent,[side*.58,.34,-.04],[.11,.58,.13],[0,0,side*.52]);orb(torso,glowing,side*.42,-.13,.37,.06,.3,.09);}break;
      case 'leo': // golden temporal crown and dual gyroscopic shoulder rings
        piece(head,SHAPES.torus,glowing,[0,.49,0],[.43,.43,.10],[Math.PI/2,0,0]);
        for(const side of [-1,1])piece(torso,SHAPES.torus,accent,[side*.46,.25,.03],[.25,.27,.11],[.3,0,side*.55]);break;
      case 'butterfly': // curved articulated orbital wings
        for(const side of [-1,1]){piece(torso,SHAPES.cone,glowing,[side*.51,.01,.42],[.17,.82,.19],[.15,0,side*.47]);orb(torso,accent,side*.55,-.25,.48,.12,.18,.12);}break;
      case 'striker': // diagonal impact shoulder spikes
        for(const s of [-1,1])piece(torso,SHAPES.cone,accent,[s*.53,.37,.02],[.17,.34,.15],[0,0,s*.50]);
        break;
      case 'cryomancer': // crystalline helmet and visor peaks
        for(const s of [-1,0,1])piece(head,SHAPES.cone,glass,[s*.17,.42,0],[.13,.34+(.5-Math.abs(s))*.20,.13],[0,0,s*.20]);
        break;
      case 'riftwalker': // luminous portal ring behind the head
        piece(visual,SHAPES.torus,glowing,[0,2.17,.24],[.42,.42,.10],[.15,0,0]);
        break;
      case 'aeronaut': // angled jet fins on the back
        for(const s of [-1,1])piece(torso,SHAPES.cone,armor,[s*.41,-.08,.35],[.22,.72,.20],[0,0,s*.43]);
        break;
      case 'phantom': // deep tactical hood with two optic dots
        ornament(0,2.45,.12,.38,.18,.33,helmet);
        ornament(-.16,2.18,-.31,.068,.05,.025);
        ornament(.16,2.18,-.31,.068,.05,.025);
        break;
      case 'chronos': // chronometer crown
        piece(head,SHAPES.torus,glowing,[0,.48,.04],[.29,.29,.10],[Math.PI/2,0,0]);
        ornament(0,2.80,0,.11,.15,.11,accent);
        break;
      case 'echo': // dual holographic horns
        for(const s of [-1,1]){
          piece(head,SHAPES.cone,accent,[s*.20,.44,.01],[.09,.36,.09],[0,0,s*.10]);
          ornament(s*.32,1.49,.34,.09,.15,.075);
        }
        break;
      case 'storm': // charged tesla antennae
        for(const s of [-1,1]){
          piece(head,SHAPES.tube,glowing,[s*.25,.52,.09],[.04,.42,.04],[0,0,s*.20]);
          orb(head,glowing,s*.32,.75,.10,.11,.12,.11);
        }
        break;
      case 'gravity': // heavy circular gravitic collar
        piece(torso,SHAPES.torus,glowing,[0,.25,0],[.68,.48,.16],[Math.PI/2,0,0]);
        ornament(0,1.15,.62,.18,.24,.08);
        break;
      case 'guardian': // oversized shoulder armor and medical cross
        for(const s of [-1,1])ornament(s*.56,1.71,.05,.30,.22,.31,armor);
        ornament(0,1.41,-.42,.075,.20,.04);ornament(0,1.41,-.45,.19,.07,.04);
        break;
    }
  }
  // Weapon barrel, muzzle and sight. Not used by melee hunters/scouts.
  const isMelee=['hunter','scout'].includes(role);
  const rifle=new THREE.Group();rifle.position.set(.22,1.43,-.45);visual.add(rifle);
  if(isMelee){
    for(const s of [-1,1]){
      const claw=new THREE.Group();claw.position.set(s*.63,1.08,-.20);visual.add(claw);
      for(let i=-1;i<=1;i++){
        const blade=piece(claw,SHAPES.cone,accent,[i*.085,-.08,-.16],[.058,.31,.06],[Math.PI*.5,0,0]);blade.castShadow=true;
      }
    }
    rifle.visible=false;
  }else{
    capsule(rifle,black,0,0,0,.095,.11,.30).rotation.x=Math.PI/2;
    tube(rifle,armor,0,.02,-.38,Math.PI/2,0,0,.55,.065);
    tube(rifle,black,0,.02,-.69,Math.PI/2,0,0,.15,.080);
    orb(rifle,accent,0,.10,-.12,.06,.037,.16);
    orb(rifle,leather,0,-.13,.16,.10,.21,.12);
    orb(rifle,armor,0,.14,.23,.10,.075,.19);
    if(style.heavy){
      tube(rifle,accent,.12,0,-.43,Math.PI/2,0,0,.70,.07);
      tube(rifle,black,-.12,0,-.43,Math.PI/2,0,0,.70,.07);
    }
  }
  // Tiny muzzle glow uses basic material: cheap and visible in daytime.
  const flare=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),new THREE.MeshBasicMaterial({color:style.accent,transparent:true,opacity:.9,depthWrite:false}));
  flare.position.set(0,.02,-.78);flare.visible=false;rifle.add(flare);
  // Subtle contact shadow: first-person scenes stay grounded in the world.
  const disc=new THREE.Mesh(new THREE.CircleGeometry(.53*width,18),new THREE.MeshBasicMaterial({color:0x111920,transparent:true,opacity:.20,depthWrite:false}));
  disc.rotation.x=-Math.PI/2;disc.position.y=.015;disc.receiveShadow=false;disc.castShadow=false;visual.add(disc);
  const materials=[fabric,armor,accent,black,leather,skin,helmet,glass,glowing];
  // Very small details vanish at a distance instead of consuming GPU draw calls.
  const detailMeshes=[];
  visual.traverse(obj=>{
    if(obj.isMesh&&obj!==flare&&obj.geometry===SHAPES.orb&&obj.scale.x*obj.scale.y*obj.scale.z<.0015)detailMeshes.push(obj);
  });
  root.userData.rig={visual,torso,head,arms,legs,rifle,flare,materials,detailMeshes,lodFar:false,walk:0,blend:0,dashBlend:0,airBlend:0,aimBlend:0,flash:0,hit:0,role,player};
  // The old mesh disappears from memory when the GLB has fully loaded.
  // Shared primitive buffers must NOT be disposed: another fallback may use them.
  root.userData.stripLegacy=()=>{
    const r=root.userData.rig;
    if(!r||r.stripped)return;
    r.stripped=true;
    r.visual.traverse(o=>{
      if(o.isMesh&&o.geometry&&!Object.values(SHAPES).includes(o.geometry))o.geometry.dispose();
      if(o.isMesh&&o.material&&!r.materials.includes(o.material))o.material.dispose?.();
    });
    root.remove(r.visual);
    for(const m of r.materials)m.dispose();
    r.materials=[];r.detailMeshes=[];r.arms=[];r.legs=[];
  };
  // GLB is optional and asynchronous: first-frame gameplay is never blocked.
  globalThis.TITAN_SKINNED_RUNTIME?.request?.(root,{role,size,player,tint,hero});
  return root;
}

export function animateOperative(root,dt,{moving=0,firing=false,frozen=false,hit=false,distance=0,dash=false,airborne=false,aiming=false,strafe=0,reloading=false,casting=false,crouching=false}={}){
  const rig=root?.userData?.rig;if(!rig)return;
  if(root.userData.skeletal&&globalThis.TITAN_SKINNED_RUNTIME?.animate?.(root,dt,{moving,firing,frozen,hit,distance,dash,airborne,aiming,strafe,reloading,casting,crouching}))return;
  dt=Math.max(0,Math.min(.06,Number(dt)||0));
  const far=Number(distance)>47;
  if(far!==rig.lodFar){rig.lodFar=far;for(const part of rig.detailMeshes)part.visible=!far;}
  const desired=frozen?0:Math.max(0,Math.min(1,Number(moving)||0));
  rig.blend+=(desired-rig.blend)*Math.min(1,dt*9);
  rig.dashBlend+=((dash?1:0)-rig.dashBlend)*Math.min(1,dt*16);
  rig.airBlend+=((airborne?1:0)-rig.airBlend)*Math.min(1,dt*11);
  rig.aimBlend+=((aiming?1:0)-rig.aimBlend)*Math.min(1,dt*9);
  rig.walk+=dt*(4.7+rig.blend*(7+rig.dashBlend*7));
  const walk=rig.blend;
  const stride=Math.sin(rig.walk);
  rig.legs[0].rotation.x=stride*.69*walk;
  rig.legs[1].rotation.x=-stride*.69*walk;
  for(let i=0;i<2;i++){
    const angle=i===0?stride:-stride;
    const leg=rig.legs[i];
    leg.userData.knee.rotation.x=Math.max(0,-angle)*.40*walk;
    leg.userData.foot.rotation.x=Math.max(0,angle)*.19*walk;
    rig.arms[i].rotation.x=(rig.role==='hunter'||rig.role==='scout'?-0.22:-.78)-angle*.32*walk;
    rig.arms[i].rotation.z=(i===0?-.10:.10)+(rig.role==='tank'?.13:0);
    rig.arms[i].userData.elbow.rotation.x=-.20-walk*.15;
  }
  // Lean into a burst, tuck knees in mid-air, and maintain a readable rifle stance.
  for(const leg of rig.legs){leg.rotation.x*=1-rig.airBlend*.54;leg.userData.knee.rotation.x+=rig.airBlend*.56;}
  rig.legs[0].rotation.x+=rig.dashBlend*.30;rig.legs[1].rotation.x-=rig.dashBlend*.28;
  rig.torso.rotation.z=Math.sin(rig.walk*.5)*.025*walk;
  rig.torso.rotation.x=.04+walk*.07-rig.dashBlend*.38+rig.airBlend*.12;
  if(rig.aimBlend){rig.arms[0].rotation.x-=rig.aimBlend*.13;rig.arms[1].rotation.x-=rig.aimBlend*.15;}
  rig.head.rotation.y=Math.sin(rig.walk*.35)*.045;
  rig.head.rotation.x=Math.sin(rig.walk*.5)*.02*walk;
  if(firing&&(['scout','hunter','tank'].includes(rig.role))){
    rig.arms[0].rotation.x=-1.45;
    rig.torso.rotation.x=-.15;
  }
  if(firing)rig.flash=.12;
  rig.flash=Math.max(0,rig.flash-dt);
  rig.flare.visible=rig.flash>0&&rig.rifle.visible;
  if(hit)rig.hit=.13;
  rig.hit=Math.max(0,rig.hit-dt);
  // Only update one emissive channel, preserving authored faction coloring.
  if(rig.materials[8])rig.materials[8].emissiveIntensity=rig.hit>0?2.7:1.2;
}

export function disposeOperative(root){
  globalThis.TITAN_SKINNED_RUNTIME?.release?.(root);
  const rig=root?.userData?.rig;if(!rig)return;
  // Shared primitive geometries are intentionally never disposed per character.
  const shared=new Set(Object.values(SHAPES));
  root.traverse(obj=>{
    if(obj.isMesh&&obj.geometry&&!shared.has(obj.geometry))obj.geometry.dispose();
    if(obj.isMesh&&obj.material&&!rig.materials.includes(obj.material))obj.material.dispose?.();
  });
  for(const material of rig.materials)material.dispose();
}

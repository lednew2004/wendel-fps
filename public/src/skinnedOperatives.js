import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

/** Skinned GLB character runtime.
 *  The proven procedural renderer stays visible until the optional local asset loads.
 *  Geometry/material data are cached by hero, skeletons are per-instance.
 *  Missing files, broken hardware and slow networks never block main game startup.
 */
const cache=new Map();
const loader=new GLTFLoader();
const ROLES=new Set(['scout','gunner','sniper','hunter','tank','boss','player']);
const ANIM_TRANSITIONS={idle:.20,walk:.18,run:.16,strafe_left:.13,strafe_right:.13,dash:.07,jump:.10,land:.09,crouch:.14,aim:.13,fire:.08,hit:.07,cast:.09,reload:.14};
const UPPER_ANIM_TRANSITIONS={aim_upper:.13,fire_upper:.065,cast_upper:.08,reload:.12};
function requestAsset(id,low=false){
  const key=(low?'lod/':'')+id;
  if(!cache.has(key)){
    const url=`./assets/models/operatives/${key}.glb`;
    cache.set(key,new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject)));
  }
  return cache.get(key);
}
function chooseAsset(opts){return opts.hero|| (ROLES.has(opts.role)?opts.role:'player');}
function setup(root,opts,gltf){
  if(root.userData.disposed)return;
  const avatar=cloneSkeleton(gltf.scene);
  avatar.name='SKINNED_'+chooseAsset(opts).toUpperCase();
  avatar.scale.setScalar(opts.size??1);
  // Per-character tint clones only a small number of shared materials.
  const privateMaterials=[];
  if(opts.tint!=null){
    avatar.traverse(mesh=>{
      if(!mesh.isMesh)return;
      if(mesh.material?.name==='accent'){
        const mat=mesh.material.clone();mat.color.setHex(opts.tint);mat.emissive.setHex(opts.tint);
        mesh.material=mat;privateMaterials.push(mat);
      }
    });
  }
  avatar.traverse(obj=>{
    if(obj.isSkinnedMesh){
      obj.frustumCulled=true;
      obj.geometry.computeBoundingSphere();
      // Head/limb animation margin; the mesh can be safely frustum-culled.
      obj.boundingSphere=obj.geometry.boundingSphere.clone();obj.boundingSphere.radius+=.8;
      obj.castShadow=!matchMedia('(pointer:coarse)').matches;obj.receiveShadow=false;
    }
  });
  const mixer=new THREE.AnimationMixer(avatar);
  const actions={};
  for(const clip of gltf.animations){
    const a=mixer.clipAction(clip);actions[clip.name]=a;
    a.setLoop(['dash','jump','land','hit','cast','cast_upper','reload'].includes(clip.name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);
    a.clampWhenFinished=true;
  }
  // Accurate world-space muzzle for third person. The old procedural rifle
  // will be freed after loading; shots must not use its detached transform.
  const forearm=avatar.getObjectByName('forearm_R');
  const muzzle=new THREE.Object3D();muzzle.name='TITAN_GLB_MUZZLE';
  muzzle.position.set(.04,-.12,-.98);
  (forearm||avatar).add(muzzle);
  root.userData.visualMuzzle=muzzle;
  root.add(avatar);
  root.userData.stripLegacy?.();
  const state={avatar,mixer,actions,current:'idle',currentAction:actions.idle||null,upper:null,upperAction:null,time:0,privateMaterials,frames:0};
  root.userData.skeletal=state;
  state.currentAction?.reset().play();
}
function request(root,opts){
  // Do not load every character before the game is visible. The first instance
  // triggers one cached GLB fetch; remote players/NPCs reuse that cache.
  const low=globalThis.TITAN_VISUAL_QUALITY==='low';
  requestAsset(chooseAsset(opts),low).then(gltf=>setup(root,opts,gltf)).catch(err=>{
    if(!root.userData.disposed)console.warn('TITAN: GLB indisponível; modelo 3D leve preservado',chooseAsset(opts),err);
  });
}
function animate(root,dt,state){
  const s=root.userData.skeletal;
  if(!s)return false;
  dt=Math.min(.06,Math.max(0,Number(dt)||0));
  let target='idle';
  if(state.hit)target='hit';
  else if(state.dash)target='dash';
  else if(state.airborne)target='jump';
  else if(state.crouching)target='crouch';
  else if(state.moving>.72)target='run';
  else if(state.moving>.08)target=state.strafe<-.34?'strafe_left':state.strafe>.34?'strafe_right':'walk';
  if(!s.actions[target])target='idle';
  if(target!==s.current){
    const next=s.actions[target];
    if(next){
      next.reset().setEffectiveWeight(1).play();
      if(s.currentAction&&s.currentAction!==next)next.crossFadeFrom(s.currentAction,ANIM_TRANSITIONS[target]||.14,false);
      s.currentAction=next;s.current=target;
    }
  }
  // Upper-body-only clips contain no leg tracks: moving while firing, aiming
  // or reloading retains locomotion instead of freezing the whole skeleton.
  let upper=null;
  if(state.casting)upper='cast_upper';
  else if(state.reloading)upper='reload';
  else if(state.firing)upper='fire_upper';
  else if(state.aiming)upper='aim_upper';
  if(!s.actions[upper])upper=null;
  if(upper!==s.upper){
    const prior=s.upperAction;
    if(upper){
      const next=s.actions[upper];next.reset().setEffectiveWeight(.90).play();
      if(prior&&prior!==next)next.crossFadeFrom(prior,UPPER_ANIM_TRANSITIONS[upper]||.12,false);
      s.upperAction=next;s.upper=upper;
    }else{
      prior?.fadeOut(.15);s.upperAction=null;s.upper=null;
    }
  }
  s.time+=dt;
  // Update distant actors at lower frequency; continue time accumulation.
  if((state.distance??0)<32 || ++s.frames%3===0){s.mixer.update(s.time);s.time=0;}
  return true;
}
function release(root){
  root.userData.disposed=true;
  const s=root.userData.skeletal;if(!s)return;
  s.mixer.stopAllAction();s.mixer.uncacheRoot(s.avatar);
  root.remove(s.avatar);root.userData.visualMuzzle=null;
  for(const mat of s.privateMaterials)mat.dispose();
  root.userData.skeletal=null;
}
export function installSkinnedOperativeRuntime(){
  globalThis.TITAN_SKINNED_RUNTIME={request,animate,release};
}
export const GLB_CHARACTER_ROSTER=['striker','cryomancer','riftwalker','aeronaut','phantom','chronos','echo','storm','gravity','guardian','shiro','leo','butterfly'];

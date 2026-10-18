import * as THREE from 'three';
import {SQUAD_BLOCKS,SQUAD_POINTS} from './squadLayout.js';
/** Linear FPS mission environment. No lanes, towers, jungle camps or MOBA bases. */
export function createSquadWorld(city){
 const root=city.root;
 const metal=new THREE.MeshStandardMaterial({color:0x465866,metalness:.52,roughness:.53});
 const wall=new THREE.MeshStandardMaterial({color:0x81919b,metalness:.14,roughness:.86});
 const concrete=new THREE.MeshStandardMaterial({color:0x6b787a,roughness:.91});
 const road=new THREE.MeshStandardMaterial({color:0x424c52,roughness:.97});
 const panel=new THREE.MeshStandardMaterial({color:0x5faab0,emissive:0x27828c,emissiveIntensity:.24});
 const orange=new THREE.MeshStandardMaterial({color:0xffa65f,emissive:0xc55b28,emissiveIntensity:.20});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(435,435),new THREE.MeshStandardMaterial({color:0x51685c,roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;root.add(ground);
 // Vehicle road, service roads and open plazas, no colored team lanes.
 const roadGeo=new THREE.PlaneGeometry(17,340);
 const strip=new THREE.Mesh(roadGeo,road);strip.rotation.x=-Math.PI/2;strip.position.set(0,.012,-8);strip.receiveShadow=true;root.add(strip);
 for(const [x,z,w,d] of [[0,-155,58,45],[0,-91,64,52],[70,-16,46,43],[-74,44,50,47],[0,132,99,77],[-85,-148,31,31]]){
   const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),concrete);m.rotation.x=-Math.PI/2;m.position.set(x,.025,z);m.receiveShadow=true;root.add(m);
 }
 for(const [index,b] of SQUAD_BLOCKS.entries()){
   const isShort=b.h<3,material=isShort?concrete:index%3===0?wall:metal;
   const mesh=city.box(b.x,b.h/2,b.z,b.w,b.h,b.d,material);city.rayTargets.push(mesh);
   city.solids.push({...b});
   if(!isShort){
     const roof=city.box(b.x,b.h+.16,b.z,b.w+.45,.32,b.d+.45,metal);city.rayTargets.push(roof);
     city.addSurface(b.x,b.z,b.w,b.d,b.h+.32);
     for(let j=0;j<Math.min(4,Math.floor(b.w/3));j++){
       const win=city.box(b.x-b.w*.32+j*2.3,b.h*.54,b.z+b.d/2+.04,1.0,1.35,.09,panel,false);
       win.castShadow=false;
     }
     if(index%3===0){const ladder={x:b.x,z:b.z+b.d/2+.5,toX:b.x,toZ:b.z+b.d/2-.9,top:b.h+.33,base:0};city.ladders.push(ladder);city.buildLadder(ladder);}
   }else{
     const cap=city.box(b.x,b.h+.04,b.z,b.w+.1,.08,b.d+.1,orange,false);cap.castShadow=false;
   }
 }
 // Landmark rings and readable objective names. No physical invisible walls.
 const rings=[];
 for(const [key,point] of Object.entries(SQUAD_POINTS)){
   const isBoss=key==='boss';const tint=isBoss?orange:panel;
   const ring=new THREE.Mesh(new THREE.RingGeometry(key==='boss'?27:8,key==='boss'?27.5:8.35,48),tint);
   ring.rotation.x=-Math.PI/2;ring.position.set(point.x,.09,point.z);root.add(ring);rings.push(ring);
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=88;
   const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(7,17,25,.88)';ctx.fillRect(0,0,512,88);ctx.fillStyle='#c8f4f5';ctx.font='bold 34px Arial';ctx.textAlign='center';ctx.fillText(point.label,256,59,492);
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
   const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.position.set(point.x,6.9,point.z);s.scale.set(11,1.9,1);root.add(s);
 }
 // Titan extraction craft and radio masts identify the operation site even on LOW.
 for(const [x,z] of [[-85,-148],[0,-155],[70,-16]]){
   const mast=new THREE.Mesh(new THREE.CylinderGeometry(.15,.2,8,8),metal);mast.position.set(x+10,4,z+7);root.add(mast);
   const beacon=new THREE.Mesh(new THREE.SphereGeometry(.46,10,8),orange);beacon.position.set(x+10,8,z+7);root.add(beacon);
 }
 const craft=new THREE.Group();craft.position.set(-85,2.0,-148);root.add(craft);
 const cabin=new THREE.Mesh(new THREE.CapsuleGeometry(2.0,3.7,5,12),metal);cabin.rotation.z=Math.PI/2;craft.add(cabin);
 for(const sign of [-1,1]){const wing=new THREE.Mesh(new THREE.BoxGeometry(4,.2,1.6),panel);wing.position.set(0,-.3,sign*3);craft.add(wing);}
 city.squadLandmarks={rings,craft};
 return SQUAD_POINTS;
}

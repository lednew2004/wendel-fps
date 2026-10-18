import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SQUAD_BLOCKS,SQUAD_POINTS} from './squadLayout.js';
import {installArchitecturalDetails} from './sceneDetails35.js';
/** Linear FPS mission environment. No lanes, towers, jungle camps or MOBA bases. */
export function createSquadWorld(city){
 const root=city.root;
 const metal=new THREE.MeshStandardMaterial({color:0x47779c,metalness:.28,roughness:.59});
 const wall=new THREE.MeshStandardMaterial({color:0x95c9eb,metalness:.08,roughness:.76});
 // Distinct bright districts stay readable without bloom or dynamic light sources.
 const facades=[0x8acbed,0xf2ae81,0xb0d887,0xc9adea,0xffd379,0x79d6d0].map(color=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0}));
 const concrete=new THREE.MeshStandardMaterial({color:0xaabcc2,roughness:.91});
 const road=new THREE.MeshStandardMaterial({color:0x638091,metalness:0,roughness:.85});
 const panel=new THREE.MeshStandardMaterial({color:0x72e8db,emissive:0x238d86,emissiveIntensity:.22});
 const orange=new THREE.MeshStandardMaterial({color:0xffc05f,emissive:0xb96920,emissiveIntensity:.12});
 // Static ground AO is baked offline; zero dynamic light or shadow cost.
 const groundMap=new THREE.TextureLoader().load('./assets/baked/mission_ground_baked.webp');
 groundMap.colorSpace=THREE.SRGBColorSpace;groundMap.anisotropy=2;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(435,435),new THREE.MeshStandardMaterial({map:groundMap,color:0xe8ffe5,metalness:0,roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;root.add(ground);
 // Vehicle road, service roads and open plazas, no colored team lanes.
 const roadGeo=new THREE.PlaneGeometry(17,340);
 const strip=new THREE.Mesh(roadGeo,road);strip.rotation.x=-Math.PI/2;strip.position.set(0,.012,-8);strip.receiveShadow=true;root.add(strip);
 for(const [x,z,w,d] of [[0,-155,58,45],[0,-91,64,52],[70,-16,46,43],[-74,44,50,47],[0,132,99,77],[-85,-148,31,31]]){
   const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),concrete);m.rotation.x=-Math.PI/2;m.position.set(x,.025,z);m.receiveShadow=true;root.add(m);
 }
 for(const [index,b] of SQUAD_BLOCKS.entries()){
   const isShort=b.h<3,material=b.obstacle?(index%2?orange:wall):isShort?concrete:facades[index%facades.length];
   const mesh=city.box(b.x,b.h/2,b.z,b.w,b.h,b.d,material);city.rayTargets.push(mesh);
   city.solids.push({...b});
   if(b.obstacle){
     const top=city.box(b.x,b.h+.07,b.z,b.w+.15,.14,b.d+.15,panel,false);
     city.rayTargets.push(top);city.addSurface(b.x,b.z,b.w,b.d,b.h+.14);
     continue;
   }
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
 // Visual-only city enhancement: shared geometries + InstancedMesh, avoiding hundreds of draw calls,
 // new dynamic lights or extra collision volumes. These details remain visible on LOW.
 const glass=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.43,roughness:.33,emissive:0x173749,emissiveIntensity:.23});
 const trim=new THREE.MeshStandardMaterial({color:0x80f8df,metalness:.56,roughness:.38,emissive:0x123c53,emissiveIntensity:.14});
 const darkMetal=new THREE.MeshStandardMaterial({color:0x334251,metalness:.7,roughness:.44});
 const markMaterial=new THREE.MeshStandardMaterial({color:0xffd49e,roughness:.83});
 const glassGeo=new THREE.BoxGeometry(1.10,1.28,.055);
 const glassMeshes=[new THREE.InstancedMesh(glassGeo,glass,350),new THREE.InstancedMesh(glassGeo,glass,350)];
 const trimGeo=new THREE.BoxGeometry(1,.09,.12);
 const trims=new THREE.InstancedMesh(trimGeo,trim,180);
 const rooftop=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,.65,1.1),darkMetal,72);
 const dummy=new THREE.Object3D();let windows=[0,0],nr=0,nt=0;
 for(const [i,b] of SQUAD_BLOCKS.entries()){
   if(b.h<3||b.obstacle)continue;
   const side=(i%2===0?1:-1),count=Math.min(6,Math.floor((b.w-1)/2.1)),floors=Math.min(3,Math.floor((b.h-1.4)/2.6));
   for(let floor=0;floor<floors;floor++)for(let j=0;j<count;j++){
     const which=(j+i+floor)%2;const k=windows[which];if(k>=350)continue;
     dummy.position.set(b.x+(j-(count-1)/2)*2.1,1.7+floor*2.6,b.z+side*(b.d/2+.045));
     dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();glassMeshes[which].setMatrixAt(k,dummy.matrix);
     glassMeshes[which].setColorAt(k,new THREE.Color(which?0xffdf9c:0x9bdfff));windows[which]++;
   }
   if(nr<180){dummy.position.set(b.x,b.h+.26,b.z+b.d/2+.06);dummy.rotation.set(0,0,0);dummy.scale.set(Math.max(2,b.w-.7),1,1);dummy.updateMatrix();trims.setMatrixAt(nr++,dummy.matrix);}
   for(let j=0;j<2;j++)if(nt<72){dummy.position.set(b.x+(j?-.21:.25)*b.w,b.h+.58,b.z+(j?.18:-.2)*b.d);dummy.rotation.set(0,j*.5,0);dummy.scale.set(1+j*.45,1,1+j*.24);dummy.updateMatrix();rooftop.setMatrixAt(nt++,dummy.matrix);}
 }
 for(let k=0;k<2;k++){const mesh=glassMeshes[k];mesh.count=windows[k];mesh.instanceMatrix.needsUpdate=true;
   if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);}
 trims.count=nr;trims.instanceMatrix.needsUpdate=true;trims.castShadow=false;root.add(trims);
 rooftop.count=nt;rooftop.instanceMatrix.needsUpdate=true;rooftop.castShadow=false;root.add(rooftop);
 // Painted pedestrian crossings and roadside markings improve navigation readability.
 const paint=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1,4.2),markMaterial,80);let stripes=0;
 for(const zz of [-116,-65,36,84,158])for(let j=-5;j<=5;j++){
   dummy.position.set(j*1.65,.052,zz);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();paint.setMatrixAt(stripes++,dummy.matrix);
 }
 paint.count=stripes;paint.instanceMatrix.needsUpdate=true;paint.castShadow=false;root.add(paint);
 // Rounded trees/vegetation for a lived-in city, instanced without per-tree lights or shadows.
 const treeTrunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.22,2.1,7),new THREE.MeshStandardMaterial({color:0x967344,roughness:1}),48);
 const treeCrowns=new THREE.InstancedMesh(new THREE.SphereGeometry(1.2,9,6),new THREE.MeshStandardMaterial({color:0x4ed567,roughness:.9}),48);
 let trees=0;
 for(let i=0;i<56&&trees<48;i++){
   const x=(i%2?1:-1)*(139+(i*7%51));const z=-183+(i*61%367);
   if(SQUAD_BLOCKS.some(b=>Math.abs(x-b.x)<b.hx+4&&Math.abs(z-b.z)<b.hz+4))continue;
   dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.position.set(x,1.05,z);dummy.updateMatrix();treeTrunks.setMatrixAt(trees,dummy.matrix);
   dummy.position.set(x,2.85,z);dummy.scale.set(1.1+(i%3)*.16,.8+(i%4)*.08,1.1+(i%3)*.16);dummy.updateMatrix();treeCrowns.setMatrixAt(trees,dummy.matrix);trees++;
 }
 for(const mesh of [treeTrunks,treeCrowns]){mesh.count=trees;mesh.castShadow=false;mesh.instanceMatrix.needsUpdate=true;root.add(mesh);}
 // Four graphic identity signs use canvas textures; no GLB downloads, no real-time light sources.
 for(const [x,z,label,accent] of [[-84,-50,'SETOR BRAVO','#64d8ff'],[84,-50,'TORRE ZENITH','#ffce74'],[-91,97,'ZONA HOSTIL','#ffa46d'],[91,97,'TITAN LABS','#a3e5ab']]){
   const c=document.createElement('canvas');c.width=512;c.height=112;
   const ctx=c.getContext('2d');ctx.fillStyle='#1e3040';ctx.fillRect(0,0,512,112);
   ctx.fillStyle=accent;ctx.fillRect(0,0,9,112);ctx.fillRect(0,104,512,8);
   ctx.textAlign='center';ctx.fillStyle='#f2f9f9';ctx.font='bold 56px Arial';ctx.fillText(label,260,76,480);
   const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.8,1.5),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
   sign.position.set(x,7.0,z+11);root.add(sign);
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
 // Modular authored GLB landmarks: textured/painted geometry in only three
 // unique files. Placed on existing collision rooftops; no extra colliders.
 const models=new GLTFLoader();
 const roofProps=new THREE.Group();roofProps.name='MODULAR_ARCHITECTURE_GLB';
 root.add(roofProps);city.squadDetailRoot=roofProps;
 roofProps.visible=city.world.quality!=='low';
 for(const [file,spots] of [
   ['relay_tower', [[-84,-50,12],[84,-50,12],[91,97,10]]],
   ['field_station',[[-39,-104,6],[39,-104,6],[-46,145,8]]],
   ['power_generator',[[-91,97,10],[91,97,10],[-105,18,9]]],
 ]){
   models.load(`./assets/models/environment/${file}.glb`,gltf=>{
     for(const [x,z,y] of spots){
       const model=gltf.scene.clone(true);
       model.position.set(x,y+.34,z);
       model.traverse(obj=>{if(obj.isMesh){obj.castShadow=false;obj.receiveShadow=true;}});
       roofProps.add(model);
     }
   },undefined,error=>console.warn('Detalhe GLB indisponível:',file,error));
 }
 // Instance rounded roof ducts, arches and chamfer-like decorative edges.
 // Shared buffers keep repeated geometry at a constant number of draw calls.
 const copingMat=new THREE.MeshStandardMaterial({color:0xb3c2c8,metalness:.34,roughness:.63});
 const cylinders=new THREE.InstancedMesh(new THREE.CylinderGeometry(.30,.30,1,10),copingMat,144);
 const archMat=new THREE.MeshStandardMaterial({color:0x556f80,metalness:.48,roughness:.46});
 const arches=new THREE.InstancedMesh(new THREE.TorusGeometry(1.3,.12,7,18,Math.PI),archMat,45);
 let p=0,a=0;
 for(const b of SQUAD_BLOCKS){
   if(b.h<3||b.obstacle)continue;
   for(let n=0;n<6;n++){
     const k=n%3;
     dummy.position.set(b.x+(k-1)*b.w*.33,b.h+.65,b.z+(n<3?-.26:.26)*b.d);
     dummy.rotation.set(0,0,0);dummy.scale.set(1,1.0+(n%2)*.8,1);dummy.updateMatrix();cylinders.setMatrixAt(p++,dummy.matrix);
   }
   if(a<45){dummy.position.set(b.x,b.h+.28,b.z+b.d/2+.10);dummy.rotation.set(0,0,0);dummy.scale.set(Math.min(2,b.w/8),1,1);dummy.updateMatrix();arches.setMatrixAt(a++,dummy.matrix);}
 }
 cylinders.count=p;cylinders.instanceMatrix.needsUpdate=true;
 arches.count=a;arches.instanceMatrix.needsUpdate=true;
 for(const m of [cylinders,arches]){m.castShadow=false;m.receiveShadow=true;roofProps.add(m);}
 // Titan extraction craft and radio masts identify the operation site even on LOW.
 for(const [x,z] of [[-85,-148],[0,-155],[70,-16]]){
   const mast=new THREE.Mesh(new THREE.CylinderGeometry(.15,.2,8,8),metal);mast.position.set(x+10,4,z+7);root.add(mast);
   const beacon=new THREE.Mesh(new THREE.SphereGeometry(.46,10,8),orange);beacon.position.set(x+10,8,z+7);root.add(beacon);
 }
 const craft=new THREE.Group();craft.position.set(-85,2.0,-148);root.add(craft);
 const cabin=new THREE.Mesh(new THREE.CapsuleGeometry(2.0,3.7,5,12),metal);cabin.rotation.z=Math.PI/2;craft.add(cabin);
 for(const sign of [-1,1]){const wing=new THREE.Mesh(new THREE.BoxGeometry(4,.2,1.6),panel);wing.position.set(0,-.3,sign*3);craft.add(wing);}
 installArchitecturalDetails(city);
 city.squadLandmarks={rings,craft};
 return SQUAD_POINTS;
}

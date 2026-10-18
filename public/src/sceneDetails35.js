import * as THREE from 'three';
import {SQUAD_BLOCKS} from './squadLayout.js';

/** Original 3.5 architecture kit: instanced, decorative-only, no new collisions.
 * All features are in one LOD group, so LOW removes every extra draw call.
 */
export function installArchitecturalDetails(city){
  const root=new THREE.Group();root.name='TITAN_35_ARCHITECTURE_KIT';
  city.squadDetailRoot.add(root);
  const ink=new THREE.MeshStandardMaterial({color:0x233a49,metalness:.54,roughness:.58});
  const metal=new THREE.MeshStandardMaterial({color:0x9fb1b9,metalness:.48,roughness:.42});
  const accent=new THREE.MeshStandardMaterial({color:0x49d6d0,emissive:0x13565c,emissiveIntensity:.30,metalness:.24,roughness:.46});
  const warm=new THREE.MeshStandardMaterial({color:0xf0b56a,emissive:0x5b240e,emissiveIntensity:.26,roughness:.55});
  const glass=new THREE.MeshStandardMaterial({color:0x4b879e,emissive:0x18394d,emissiveIntensity:.19,metalness:.4,roughness:.28});
  const create=(name,geometry,material,max)=>{
    const m=new THREE.InstancedMesh(geometry,material,max);m.name=name;m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;root.add(m);return {mesh:m,n:0};
  };
  const beams=create('STRUCTURAL_BEAMS',new THREE.BoxGeometry(1,1,1),metal,280);
  const fins=create('VERTICAL_FINS',new THREE.BoxGeometry(1,1,1),ink,150);
  const doors=create('TACTICAL_DOORS',new THREE.BoxGeometry(1,1,1),ink,80);
  const lights=create('DECORATIVE_SIGNAL_STRIPS',new THREE.BoxGeometry(1,1,1),accent,110);
  const warnings=create('SAFETY_MARKINGS',new THREE.BoxGeometry(1,1,1),warm,100);
  const awnings=create('ANGLED_AWNINGS',new THREE.BoxGeometry(1,1,1),metal,70);
  const glassParts=create('CONTROL_ROOM_WINDOWS',new THREE.BoxGeometry(1,1,1),glass,110);
  const unit=new THREE.Object3D();
  function put(batch,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
    if(batch.n>=batch.mesh.instanceMatrix.count)return;
    unit.position.set(x,y,z);unit.rotation.set(rx,ry,rz);unit.scale.set(sx,sy,sz);unit.updateMatrix();
    batch.mesh.setMatrixAt(batch.n++,unit.matrix);
  }
  for(const [i,b] of SQUAD_BLOCKS.entries()){
    if(b.h<3.1)continue;
    const f=b.z+b.d*.5+.10,back=b.z-b.d*.5-.10;
    const left=b.x-b.w*.5-.10,right=b.x+b.w*.5+.10;
    const facade=(i%2===0)?f:back;
    const sign=i%2===0?1:-1;
    // Vertical structural columns, bridging top and bottom to visually break
    // rectangular silhouettes without covering the existing windows.
    for(const x of [left,right]){
      put(beams,x,b.h*.52,facade,.22,b.h+.25,.30);
      put(beams,x,b.h+.07,b.z,.25,.25,b.d+.12);
    }
    for(const z of [back,f]){
      put(beams,b.x,b.h+.15,z,b.w+.38,.31,.28);
    }
    const columns=Math.max(2,Math.min(5,Math.floor(b.w/4.6)));
    for(let c=0;c<columns;c++){
      const x=b.x+(c/(columns-1)-.5)*(b.w-2.1);
      put(fins,x,b.h*.62,facade,.11,b.h*.68,.23);
      put(lights,x,b.h-.47,facade+sign*.11,.13,.48,.08);
    }
    // Security/service doors are explicitly decorative: collision layout is
    // unchanged so there are no misleading passages through solid walls.
    const doorX=b.x+((i%3)-1)*b.w*.21;
    put(doors,doorX,1.18,facade+sign*.11,1.85,2.36,.13);
    put(lights,doorX,2.41,facade+sign*.19,2.05,.08,.09);
    for(const side of [-1,1]){
      put(warnings,doorX+side*.86,1.15,facade+sign*.19,.065,2.25,.05);
      put(beams,b.x,1.65,b.z+side*b.d*.5,.13,3.30,.14);
    }
    // Sloped awnings and window trims are actual geometry, not bloom decals.
    put(awnings,doorX,2.69,facade+sign*.62,2.90,.12,1.10,sign*.12);
    put(glassParts,b.x,b.h*.67,facade+sign*.16,Math.min(4.5,b.w*.27),1.18,.08);
    if(b.h>9){
      put(glassParts,b.x,b.h*.36,facade+sign*.16,Math.min(3.8,b.w*.22),1.05,.08);
      put(beams,b.x,b.h*.75,b.z,b.w*.56,.15,b.d*.55);
    }
  }
  for(const batch of [beams,fins,doors,lights,warnings,awnings,glassParts]){
    batch.mesh.count=batch.n;batch.mesh.instanceMatrix.needsUpdate=true;
  }
  // Static, soft radial grounding shadows: no per-frame SSAO requirement.
  const tex=new THREE.TextureLoader().load('./assets/baked/architecture_contact_shadow.webp');
  tex.colorSpace=THREE.SRGBColorSpace;
  const ground=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),SQUAD_BLOCKS.length);
  ground.name='BAKED_CONTACT_SHADOWS';let n=0;
  for(const b of SQUAD_BLOCKS){
    unit.position.set(b.x,.031,b.z);unit.rotation.set(-Math.PI/2,0,0);unit.scale.set(b.w+5,b.d+5,1);unit.updateMatrix();ground.setMatrixAt(n++,unit.matrix);
  }
  ground.count=n;ground.instanceMatrix.needsUpdate=true;ground.frustumCulled=false;root.add(ground);
  return root;
}

import * as THREE from 'three';
import {SQUAD_BLOCKS,SQUAD_POINTS} from './squadLayout.js';

/** TITAN 3.9 — opt-in VISUAL-ONLY city dressing. No collision, damage, physics
 * or gameplay changes. All pieces batch into instanced draw calls. */
export function installGraphicsLab39(city){
  const core=new THREE.Group(), deluxe=new THREE.Group();
  const root=new THREE.Group();root.name='TITAN_GRAPHICS_LAB_39';
  core.name='BAIXO_MEDIO_INSTANCIAS';deluxe.name='ALTO_ULTRA_DETALHES';
  root.add(core,deluxe);city.root.add(root);
  const standard=(color,metalness=0,roughness=.7,emissive=0,emissiveIntensity=0)=>new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
  const dark=standard(0x223c50,.48,.55), aluminum=standard(0x98b2bd,.64,.33);
  const warmLight=standard(0xffe0ab,.13,.52,0xff9d45,.58);
  const coolLight=standard(0xa5f6ff,.2,.43,0x36c5ff,.52);
  const glass=standard(0x9fd4ef,.55,.2,0x162c48,.17);
  const led=standard(0x45e5f2,.18,.42,0x13c8e7,.65);
  const plants=standard(0x397e62,.02,.95);
  const wood=standard(0x986b4b,.05,.85);
  const asphalt=standard(0x394c5a,.07,.85);
  const unit=new THREE.Object3D();
  const batches=[];
  function batch(name,geometry,material,capacity,parent=core){
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);
    mesh.name=name;mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=true;
    // Instance bounding boxes are not computed until render. Frustum culling
    // against a giant origin box could drop some facade pieces unexpectedly.
    mesh.frustumCulled=false;
    parent.add(mesh);const b={mesh,capacity,used:0};batches.push(b);return b;
  }
  function put(b,x,y,z,w,h,d,rotation=0,hex=null){
    if(b.used>=b.capacity)return;
    unit.position.set(x,y,z);unit.rotation.set(0,rotation,0);
    unit.scale.set(w,h,d);unit.updateMatrix();
    b.mesh.setMatrixAt(b.used,unit.matrix);
    if(hex!==null)b.mesh.setColorAt(b.used,new THREE.Color(hex));
    b.used++;
  }
  const cube=new THREE.BoxGeometry(1,1,1);
  const windowGlass=batch('VIDROS_PROFUNDOS',cube,glass,600);
  const windowFrames=batch('MOLDURAS_DE_JANELA',cube,dark,1300);
  const balcony=batch('SACADAS_E_PEITORIS',cube,aluminum,360,deluxe);
  const storefronts=batch('PORTAS_E_ENTRADAS',cube,dark,120);
  const ledBands=batch('FITAS_DE_LED',cube,led,330);
  const yellowWindows=batch('JANELAS_QUENTES',cube,warmLight,250,deluxe);
  const coolWindows=batch('JANELAS_FRIAS',cube,coolLight,250,deluxe);
  const roofUnits=batch('MAQUINARIO_DE_TELHADO',cube,aluminum,150,deluxe);
  const roofGrills=batch('TELHADOS_GRELHAS',cube,dark,280,deluxe);
  const groundLane=batch('FAIXAS_DE_VIA',new THREE.PlaneGeometry(1,1),standard(0xffe8b3,0,.97),190);
  const sidewalks=batch('MEIOS_FIOS_DE_CALCADA',cube,standard(0xa3bec3,0,.96),260);
  const planters=batch('FLOREIRAS_URBANAS',cube,wood,100,deluxe);
  const foliage=batch('ARBUSTOS_INSTANCIADOS',new THREE.IcosahedronGeometry(1,1),plants,90,deluxe);
  const pole=batch('POSTES_DE_LUZ',new THREE.CylinderGeometry(.05,.08,1,8),dark,80);
  const fixtures=batch('LUMINARIAS_DE_RUA',cube,warmLight,80);
  const accent=batch('SINALIZACAO_DE_SETOR',cube,coolLight,100);

  // Each block has preexisting server-side collision. Visual panels deliberately
  // stay flush with its existing envelope (decorative, non-interactive).
  for(const [i,b] of SQUAD_BLOCKS.entries()){
    if(b.obstacle||b.h<3.4)continue;
    const floorN=Math.max(1,Math.floor((b.h-2.0)/2.6));
    const colN=Math.max(2,Math.min(5,Math.floor(b.w/2.75)));
    const sideN=Math.max(1,Math.min(4,Math.floor(b.d/3.2)));
    const facade=b.z+b.hz+.16, rear=b.z-b.hz-.16;
    // Windows on both faces, staggered warm/cool interior silhouettes.
    for(let f=0;f<floorN;f++)for(let c=0;c<colN;c++){
      const x=b.x+(c-(colN-1)/2)*Math.min(2.65,(b.w-1.8)/colN);
      const y=2.85+f*2.55;
      if(y+1>b.h)continue;
      for(const side of [-1,1]){
        const z=side===1?facade:rear;
        put(windowGlass,x,y,z,1.16,1.46,.09);
        put(windowFrames,x,y+.79,z+side*.025,1.4,.13,.12);
        put(windowFrames,x,y-.79,z+side*.025,1.4,.15,.12);
        put(windowFrames,x-.63,y,z+side*.025,.13,1.5,.12);
        put(windowFrames,x+.63,y,z+side*.025,.13,1.5,.12);
        if((c+f+i+side)%4===0)put(yellowWindows,x,y,z+side*.068,.94,1.27,.035);
        else if((c+f+i+side)%5===0)put(coolWindows,x,y,z+side*.068,.94,1.27,.035);
        if(f===0&&(c+i)%2===0)put(balcony,x,y-.99,z+side*.48,1.65,.12,1.08);
      }
    }
    // Narrow side-wall lightboxes add recognizable depth to the silhouette.
    for(const side of [-1,1])for(let c=0;c<sideN;c++){
      const z=b.z+(c-(sideN-1)/2)*Math.min(3,(b.d-2)/sideN);
      if(b.h>5){
        put(windowGlass,b.x+side*(b.hx+.13),b.h*.56,z,.08,1.42,1.06);
        put(windowFrames,b.x+side*(b.hx+.17),b.h*.56+0.77,z,.11,.13,1.33);
      }
    }
    put(storefronts,b.x,1.27,b.z+b.hz+.22,2,2.42,.12);
    put(ledBands,b.x,2.58,b.z+b.hz+.34,2.14,.095,.1);
    put(ledBands,b.x,b.h-.34,b.z+b.hz+.22,Math.min(b.w-.5,10),.10,.11);
    if(i%3===0){put(accent,b.x,3.12,b.z+b.hz+.31,2.8,.25,.12);}
    // Rooftop HVAC clusters are cosmetic and never block roof movement.
    put(roofUnits,b.x-b.w*.2,b.h+.56,b.z-b.d*.17,Math.min(2.6,b.w*.28),.78,Math.min(2.6,b.d*.31));
    put(roofUnits,b.x+b.w*.25,b.h+.44,b.z+b.d*.18,Math.min(1.7,b.w*.19),.55,Math.min(1.8,b.d*.23));
    for(let k=0;k<3;k++)put(roofGrills,b.x-b.w*.2+(k-1)*.54,b.h+.98,b.z-b.d*.17,.10,.045,Math.min(2,b.d*.26));
    // Small planter in unused close-to-facade ornamental space.
    if(i%2===0){
      const x=b.x+(i%3-1)*b.w*.26,z=b.z+b.hz+.48;
      put(planters,x,.27,z,1.1,.5,.58);
      put(foliage,x,.86,z,.48,.58,.38);
    }
  }

  // Lane markings are ground overlays, not drivable geometry or colliders.
  // Rotation: the plane is horizontal, its Y maps onto the world Z axis.
  const roadUnit=new THREE.Object3D();
  for(let i=0;i<65;i++){
    const z=-174+i*5.3;
    if(i%2===0)for(const x of [-5.3,5.3]){
      if(groundLane.used>=groundLane.capacity)break;
      roadUnit.position.set(x,.056,z);roadUnit.rotation.set(-Math.PI/2,0,0);
      roadUnit.scale.set(.14,2.2,1);roadUnit.updateMatrix();
      groundLane.mesh.setMatrixAt(groundLane.used++,roadUnit.matrix);
    }
  }
  // Streetscape against the building faces, avoid mission approach lanes.
  for(let i=0;i<18;i++){
    const z=-170+i*19.5;
    for(const s of [-1,1]){
      const x=s*12.1;
      put(sidewalks,x,.09,z,.38,.18,8.5);
      put(pole,x+s*1.6,2.5,z,.18,5,.18);
      put(fixtures,x+s*1.6,5.05,z,.7,.19,.37);
    }
  }
  // Decorative orientation accents on existing objective points.
  for(const [i,p] of Object.values(SQUAD_POINTS).entries()){
    for(const s of [-1,1])put(accent,p.x+s*5,1.5,p.z+5,.2,3,.2);
  }
  for(const b of batches){b.mesh.count=b.used;b.mesh.instanceMatrix.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;}
  const stats={batches:batches.length,instances:batches.reduce((n,b)=>n+b.used,0),core:core.children.length,deluxe:deluxe.children.length};
  city.graphicsLab={root,core,deluxe,stats};
  return city.graphicsLab;
}

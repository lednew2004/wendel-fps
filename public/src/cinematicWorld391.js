import * as THREE from 'three';
import {SQUAD_BLOCKS,SQUAD_POINTS} from './squadLayout.js';

/** TITAN 3.9.1 | Noninteractive urban art pass.
 * Geometry, materials and decals only. Authoritative navigation and hitboxes stay unchanged.
 * Most meshes are instanced. Details never register as solid or ray target.
 */
export function installCinematicWorld391(city){
  const root=new THREE.Group();root.name='CINEMATIC_391_SCENE_ART';city.root.add(root);
  const core=new THREE.Group(),high=new THREE.Group();core.name='ARCHITECTURE_CORE';high.name='ARCHITECTURE_HIGH';root.add(core,high);
  const materials={
    deep:new THREE.MeshStandardMaterial({color:0x172632,metalness:.42,roughness:.58}),
    slate:new THREE.MeshStandardMaterial({color:0x4a5960,metalness:.26,roughness:.74}),
    silver:new THREE.MeshStandardMaterial({color:0xa2aca8,metalness:.66,roughness:.38}),
    warm:new THREE.MeshStandardMaterial({color:0x9f947f,metalness:.18,roughness:.77}),
    glass:new THREE.MeshPhysicalMaterial({color:0x617d91,metalness:.32,roughness:.14,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:1.3}),
    luminous:new THREE.MeshStandardMaterial({color:0xe5d8b8,metalness:.05,roughness:.5,emissive:0xe3aa59,emissiveIntensity:.43}),
    asphalt:new THREE.MeshStandardMaterial({color:0x36454b,metalness:.12,roughness:.91}),
    wet:new THREE.MeshPhysicalMaterial({color:0x4b606b,metalness:.26,roughness:.19,transparent:true,opacity:.36,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),
    rust:new THREE.MeshStandardMaterial({color:0x805948,metalness:.3,roughness:.92}),
    leaves:new THREE.MeshStandardMaterial({color:0x436452,roughness:.92,side:THREE.DoubleSide})
  };
  const cube=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D(),batches=[];
  function inst(name,geom,mat,max,parent=core){const m=new THREE.InstancedMesh(geom,mat,max);m.name=name;m.count=0;m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;parent.add(m);const item={m,n:0,max};batches.push(item);return item;}
  function add(item,x,y,z,w,h,d,rotY=0,rotX=0){if(item.n>=item.max)return;dummy.position.set(x,y,z);dummy.rotation.set(rotX,rotY,0);dummy.scale.set(w,h,d);dummy.updateMatrix();item.m.setMatrixAt(item.n++,dummy.matrix);}
  const wallStrips=inst('FACADES_PANEL_JOINTS',cube,materials.slate,520);
  const jambs=inst('RECESSED_WINDOW_JAMBS',cube,materials.deep,750);
  const window=inst('REFLECTIVE_GLAZING',cube,materials.glass,390);
  const mullions=inst('GLAZING_MULLIONS',cube,materials.silver,860);
  const cornices=inst('ARCHITECTURAL_CORNICES',cube,materials.warm,180);
  const pilasters=inst('ARCHITECTURAL_PILASTERS',cube,materials.silver,280);
  const shopShade=inst('METAL_SHOP_AWNINGS',cube,materials.slate,65);
  const rainDownspouts=inst('EXTERNAL_DOWNSPOUTS',new THREE.CylinderGeometry(.08,.08,1,10),materials.silver,130,high);
  const roofDucts=inst('ROOF_DUCT_CYLINDERS',new THREE.CylinderGeometry(.48,.48,1,12),materials.silver,100,high);
  const solar=inst('ANGLED_SOLAR_PANELS',cube,materials.glass,150,high);
  const panelFrames=inst('SOLAR_PANEL_EDGES',cube,materials.deep,120,high);
  const shopLamps=inst('WARM_ENTRANCE_LIGHTS',cube,materials.luminous,80);
  const steps=inst('STORE_ENTRANCE_STEPS',cube,materials.warm,65);
  const conduit=inst('EXTERNAL_CONDUITS',cube,materials.rust,260,high);
  const firePlatform=inst('EXTERNAL_FIRE_ESCAPE_PLATFORM',cube,materials.silver,85,high);
  const fireRail=inst('EXTERNAL_FIRE_ESCAPE_RAILS',cube,materials.deep,150,high);
  const fireBraces=inst('EXTERNAL_FIRE_ESCAPE_BRACES',cube,materials.deep,90,high);
  const arch=inst('CURVED_SHOP_ENTRANCE',new THREE.TorusGeometry(1,.085,8,18,Math.PI),materials.slate,35,high);
  const tube=inst('PIPE_ELBOWS',new THREE.TorusGeometry(1,.09,8,14,Math.PI),materials.silver,120,high);
  const drain=inst('DRAINAGE_GRATES',cube,materials.deep,90);
  const roadStuds=inst('ROAD_REFLECTORS',cube,materials.luminous,88);
  const puddles=inst('WET_ASPHALT_PATCHES',new THREE.CircleGeometry(1,16),materials.wet,100,high);
  const bollards=inst('BOLLARDS',new THREE.CylinderGeometry(.10,.13,1,10),materials.slate,80);
  const shrubs=inst('GREENERY_BUSHES',new THREE.DodecahedronGeometry(1,0),materials.leaves,65,high);
  const baseCount=SQUAD_BLOCKS.filter(b=>!b.obstacle&&!b.interiorPart&&b.h>=3).length;
  for(const [i,b] of SQUAD_BLOCKS.entries()){
    if(b.obstacle||b.interiorPart||b.h<3)continue;
    const floors=Math.max(1,Math.floor((b.h-1.6)/2.7));
    const cols=Math.max(2,Math.min(4,Math.floor(b.w/3)));
    for(const dir of [-1,1]){
      const z=b.z+dir*(b.hz+.26);
      const spacing=Math.min(2.7,(b.w-1.8)/cols);
      const floorH=Math.min(2.7,(b.h-1.3)/floors);
      // Panel joints and architectural bands: less 'one huge cube'.
      for(let f=1;f<=floors;f++)add(wallStrips,b.x,f*floorH+.72,z,Math.min(b.w-.4,17),.065,.11);
      for(let c=0;c<=cols;c++){
        const x=b.x+(c-cols/2)*spacing;
        add(pilasters,x,b.h*.5,z,.10,b.h-.45,.15);
      }
      for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){
        const x=b.x+(c-(cols-1)/2)*spacing;
        const y=1.86+f*floorH;
        if(y+.75>b.h-.15)continue;
        // Dark trim creates the impression of a recessed 3D opening.
        add(jambs,x,y,z+dir*.017,1.33,1.65,.11);
        add(window,x,y,z+dir*.087,1.16,1.47,.035);
        add(mullions,x,y,z+dir*.12,.047,1.50,.045);
        add(mullions,x,y-.33,z+dir*.125,1.20,.04,.05);
        if((i+f+c)%4===0) add(shopLamps,x,y,z+dir*.15,.13,.07,.05);
      }
      // A shaded, identifiable front entrance instead of a giant bare face.
      add(shopShade,b.x,2.69,z+dir*.53,Math.min(4.4,b.w*.50),.13,1.22,0,.14*dir);
      add(steps,b.x,.08,z+dir*.55,Math.min(2.9,b.w*.32),.16,.85);
      add(cornices,b.x,b.h-.25,z+dir*.17,b.w+.24,.28,.46);
      add(shopLamps,b.x-1,2.24,z+dir*.21,.16,.12,.08);
      add(shopLamps,b.x+1,2.24,z+dir*.21,.16,.12,.08);
      if(i%3===0 && arch.n<arch.max){
        add(arch,b.x,2.74,z+dir*.42,1.24,.56,1.0,0,0);
      }
    }
    for(const side of [-1,1]){
      const x=b.x+side*(b.hx+.22);
      add(rainDownspouts,x,b.h*.49,b.z-b.d*.34,1,b.h-.5,1);
      for(let f=0;f<Math.min(floors,3);f++){
        const h=2.15+f*2.35;
        if(h>b.h-.55)continue;
        if(i%3===1){
          add(firePlatform,x+side*.75,h,b.z,1.48,.12,2.1);
          add(fireRail,x+side*1.36,h+.52,b.z,.10,1.0,2.1);
          add(fireBraces,x+side*.72,h-.37,b.z+.82,.075,.7,.08,0,side*.37);
        }
      }
    }
    // Sloped rooftop solar fields, pipe elbows, taller mechanical volume.
    for(let j=0;j<Math.min(3,Math.floor(b.w/5));j++){
      const x=b.x+(j-1)*Math.min(3,b.w*.22),z=b.z-b.d*.18;
      add(solar,x,b.h+.62,z,Math.min(2.15,b.w*.24),.07,1.3,0,-.29);
      add(panelFrames,x,b.h+.34,z-.62,.12,.62,.12);
      add(roofDucts,x,b.h+.72,b.z+b.d*.23,1,.42,1);
      add(tube,x,b.h+.95,b.z+b.d*.22,.5,.5,1);
    }
    if(i%2===0){
      add(conduit,b.x-b.w*.27,b.h*.67,b.z+b.hz+.33,.09,1.2,.11);
      add(conduit,b.x-b.w*.27,b.h*.38,b.z+b.hz+.33,.09,1.2,.11);
    }
  }
  for(let i=0;i<45;i++){
    const z=-169+i*7.5;
    for(const s of [-1,1]){
      const x=s*(8.85+(i%3)*.27);
      if(drain.n<drain.max)add(drain,x,.041,z,.34,.028,.86);
      if(i%4===0 && roadStuds.n<roadStuds.max)add(roadStuds,s*7.3,.054,z,.12,.03,.18);
      if(i%3===0 && bollards.n<bollards.max)add(bollards,s*11.8,.48,z,1,.94,1);
      if(i%6===0 && shrubs.n<shrubs.max)add(shrubs,s*14,.42,z,.62,.47,.72);
      if(puddles.n<puddles.max && i%2===0){
        add(puddles,s*(4.5+(i%4)),.055,z+1.25,1.05+(i%4)*.38,.64+(i%3)*.20,1,0,-Math.PI/2);
      }
    }
  }
  // A few hanging lines are actual 3D curves; no new collision surfaces.
  const cablesMat=new THREE.MeshStandardMaterial({color:0x282c2d,roughness:.85,metalness:.2});
  for(let i=0;i<6;i++){
    const z=-131+i*52;
    const pts=[new THREE.Vector3(-20,9.6,z),new THREE.Vector3(-10,7.8,z+.4),new THREE.Vector3(0,7.1,z+.7),new THREE.Vector3(10,8,z+.4),new THREE.Vector3(20,9.6,z)];
    const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),28,.027,5,false),cablesMat);
    high.add(cable);
  }
  for(const b of batches){b.m.count=b.n;b.m.instanceMatrix.needsUpdate=true;}
  const stats={buildings:baseCount,drawBatches:batches.length,instances:batches.reduce((n,b)=>n+b.n,0)};
  city.cinematic391={root,core,high,stats};return city.cinematic391;
}

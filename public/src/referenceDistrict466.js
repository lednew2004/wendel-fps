import * as THREE from 'three';
import {SQUAD_BLOCKS,SQUAD_INTERIORS,SQUAD_COVERS_466} from './squadLayout.js';

/** TITAN 4.6.6 — playable, image-directed environment pass.
 * Palette: cool painted steel & cobalt concrete / warm sunlit plaster & timber.
 * Shapes: corrugated maintenance walls, structural frames, deep window recesses,
 * sheltered alleys, hanging services, and grounded tactical cover.
 * Physics: every crate / barrier is ALSO in shared squadLayout.js; architectural
 * ornamentation cannot create invisible blocking walls or misleading entrances.
 */
const BASE='./assets/reference466/';
let cachedMaterials466=null;
export function makeReferenceMaterials466(){
  if(cachedMaterials466)return cachedMaterials466;
  const loader=new THREE.TextureLoader();
  const texture=(id,{linear=false}={})=>{
    const t=loader.load(`${BASE}${id}.webp`);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.anisotropy=4;
    if(!linear)t.colorSpace=THREE.SRGBColorSpace;
    return t;
  };
  const material=(id,{metalness=.08,roughness=.78,normalScale=.20,emissive=0,emissiveIntensity=0}={})=>new THREE.MeshStandardMaterial({
    map:texture(id),normalMap:texture(`${id}_normal`,{linear:true}),normalScale:new THREE.Vector2(normalScale,normalScale),
    metalness,roughness,color:0xffffff,emissive,emissiveIntensity
  });
  const result={
    cyan:material('cyan_metal',{metalness:.49,roughness:.52,normalScale:.4}),
    marine:material('marine_metal',{metalness:.53,roughness:.48,normalScale:.44}),
    blue:material('blue_plaster',{roughness:.88,normalScale:.19}),
    cream:material('cream_concrete',{roughness:.91,normalScale:.22}),
    warm:material('warm_plaster',{roughness:.85,normalScale:.23}),
    orange:material('rust_orange',{metalness:.38,roughness:.62,normalScale:.38}),
    wood:material('wood_crate',{roughness:.83,normalScale:.30}),
    paving:material('paving',{roughness:.95,normalScale:.32}),
    asphalt:material('asphalt',{roughness:.94,normalScale:.16}),
    dark:material('dark_metal',{metalness:.62,roughness:.52,normalScale:.32}),
    frame:new THREE.MeshStandardMaterial({color:0x2b3c49,metalness:.72,roughness:.41}),
    trim:new THREE.MeshStandardMaterial({color:0xcbd4d2,metalness:.43,roughness:.58}),
    glass:new THREE.MeshPhysicalMaterial({color:0x77b8d3,metalness:.18,roughness:.20,clearcoat:.8,clearcoatRoughness:.16,envMapIntensity:.6}),
    warmGlass:new THREE.MeshStandardMaterial({color:0xf8ce8a,metalness:.13,roughness:.4,emissive:0x9a591e,emissiveIntensity:.26}),
    lamp:new THREE.MeshStandardMaterial({color:0xffdf9b,emissive:0xffbd69,emissiveIntensity:.70,roughness:.35}),
    paintedYellow:new THREE.MeshStandardMaterial({color:0xe7af59,metalness:.20,roughness:.76}),
    asphaltStripe:new THREE.MeshStandardMaterial({color:0xe7dac2,roughness:.94,polygonOffset:true,polygonOffsetFactor:-2})
  };
  for(const mat of Object.values(result))mat.userData.referenceShared466=true;
  cachedMaterials466=result;
  return result;
}
export function installReferenceDistrict466(city,mats){
  const root=new THREE.Group();root.name='TITAN_466_URBAN_RECONSTRUCTION';city.root.add(root);
  const core=new THREE.Group();core.name='PLAYABLE_ARCHITECTURE';root.add(core);
  const detail=new THREE.Group();detail.name='CINEMATIC_DETAILS';root.add(detail);
  const batches=[];const unit=new THREE.Object3D();
  const cube=new THREE.BoxGeometry(1,1,1);
  const newBatch=(name,mat,max,parent=core,geo=cube)=>{
    const mesh=new THREE.InstancedMesh(geo,mat,max);
    mesh.name=name;mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=true;
    mesh.frustumCulled=false;parent.add(mesh);
    const batch={mesh,n:0,max};batches.push(batch);return batch;
  };
  const put=(b,x,y,z,w,h,d,ry=0,rx=0,rz=0)=>{
    if(b.n>=b.max||Math.min(w,h,d)<=0)return;
    unit.position.set(x,y,z);unit.rotation.set(rx,ry,rz);unit.scale.set(w,h,d);unit.updateMatrix();b.mesh.setMatrixAt(b.n++,unit.matrix);
  };
  const panels=[mats.cyan,mats.marine,mats.blue,mats.cream,mats.warm,mats.orange]
    .map((m,i)=>newBatch(`ACTUAL_PBR_FACADE_PANEL_${i}`,m,380));
  const ridges=newBatch('CORRUGATED_SHEET_RIBS',mats.trim,1600,detail);
  const support=newBatch('STRUCTURAL_METAL_FRAMES',mats.frame,900);
  const lintels=newBatch('CONCRETE_SPANDRELS',mats.cream,500);
  const recesses=newBatch('WINDOW_RECESSED_SURROUNDS',mats.frame,1900);
  const windows=newBatch('GLASS_WINDOW_CELLS',mats.glass,1800);
  const reflected=newBatch('SUNLIT_WINDOW_CELLS',mats.warmGlass,650);
  const glazingBars=newBatch('WINDOW_STEEL_MULLIONS',mats.trim,2100,detail);
  const shutters=newBatch('TEXTURED_METAL_SHUTTERS',mats.marine,400,detail);
  const cornices=newBatch('ROOF_PARAPETS',mats.trim,320);
  const balconies=newBatch('PROJECTING_WALKABLE_BALCONY_EDGES',mats.dark,150);
  const rails=newBatch('OPEN_AIR_STAIR_RAILS',mats.frame,300);
  const pipes=newBatch('FACADE_PLUMBING',mats.dark,500,detail,new THREE.CylinderGeometry(.065,.075,1,6));
  const ducts=newBatch('VENTILATION_METAL_DUCTS',mats.marine,370,detail);
  const vents=newBatch('SLATTED_AIR_CONDITIONING',mats.frame,480,detail);
  const doorFrames=newBatch('ARCHITECTURAL_SERVICE_DOOR_FRAMES',mats.frame,220);
  const entranceLights=newBatch('INDUSTRIAL_WARM_COURTYARD_LIGHTS',mats.lamp,140);
  const awnings=newBatch('CAST_METAL_ENTRANCE_AWNINGS',mats.cyan,165);
  const roofMachinery=newBatch('REAL_SCALED_ROOF_MACHINERY',mats.dark,175,detail);
  const gutters=newBatch('METAL_GUTTERS',mats.trim,250,detail);
  const bridgeBeams=newBatch('OVERHEAD_SERVICE_BRIDGES',mats.dark,120);
  const bridgeLamps=newBatch('SERVICE_BRIDGE_LAMPS',mats.lamp,110);
  const pavement=newBatch('PAVED_CITY_SIDEWALKS',mats.paving,140);
  const curb=newBatch('STREET_CURBS',mats.cream,290);
  const marking=newBatch('ROAD_SURFACE_MARKINGS',mats.asphaltStripe,190);
  const crateFrames=newBatch('REINFORCED_TIMBER_FRAMES',mats.dark,460);
  const cratePlanks=newBatch('RAISED_TIMBER_PLANKS',mats.wood,380);
  const hazard=newBatch('PAINTED_COVER_WARNING_STRIPES',mats.paintedYellow,175);
  const brokenTile=newBatch('SIDEWALK_PATCHES',mats.warm,180,detail);

  // The reference reads as a narrow combat alley with blue metal and
  // sand-coloured sunlit walls. Overlay real geometry in depth on each existing
  // COLLIDABLE building, without duplicating its collision volumes.
  const valid=SQUAD_BLOCKS.filter(b=>!b.obstacle&&!b.referenceCover&&!b.interiorPart&&b.h>=3.1);
  for(const [i,b] of valid.entries()){
    const scheme=i%6;
    const floors=Math.max(1,Math.min(6,Math.floor((b.h-1.1)/2.55)));
    const frontWindow=b.z+b.d/2+.07,backWindow=b.z-b.d/2-.07;
    const facadePalette=panels[scheme];
    for(const side of [-1,1]){
      const z=side>0?frontWindow:backWindow;
      // Real 3D relief — not a flat paint tint. Panels are thin enough not to
      // lie about cover location; the underlying wall has the real hitbox.
      const fullWidth=Math.max(2,b.w-.42);
      for(let col=0;col<Math.ceil(b.w/3);col++){
        const count=Math.ceil(b.w/3),w=fullWidth/count-.055;
        const x=b.x+(col-(count-1)/2)*(fullWidth/count);
        put(facadePalette,x,b.h*.5,z+side*.020,w,b.h-.44,.11);
      }
      for(let floor=1;floor<floors;floor++){
        const h=floor*2.55;
        if(h+.10>b.h)continue;
        put(lintels,b.x,h,z+side*.112,fullWidth,.13,.13);
      }
      for(let p=-1;p<=1;p+=2){
        put(support,b.x+p*(b.w/2-.22),b.h/2,z+side*.11,.13,b.h-.16,.16);
      }
      // Large recessed glazed bays separated by steel mullions.
      const cols=Math.min(5,Math.max(2,Math.floor((b.w-1.1)/2.6)));
      const spacing=Math.min(2.65,(b.w-1.7)/cols);
      for(let floor=0;floor<floors;floor++)for(let col=0;col<cols;col++){
        const xx=b.x+(col-(cols-1)/2)*spacing;
        const yy=1.76+floor*2.55;
        if(yy+.90>b.h-.2)continue;
        const variant=(i*11+floor*7+col*3)%12;
        put(recesses,xx,yy,z+side*.145,1.72,1.67,.11);
        put(variant<4?reflected:windows,xx,yy,z+side*.210,1.49,1.46,.055);
        put(glazingBars,xx,yy,z+side*.26,.07,1.52,.065);
        put(glazingBars,xx,yy-.28,z+side*.26,1.55,.055,.070);
        put(lintels,xx,yy-.87,z+side*.205,1.9,.14,.25);
        if(variant===9){put(shutters,xx,yy,z+side*.275,1.49,1.46,.12);}
      }
      const doorAt=b.x+(((i%3)-1)*Math.min(2.3,b.w*.20));
      // On buildings without real doors this is a clearly shut service shutter;
      // no false openings are displayed.
      put(doorFrames,doorAt,1.29,z+side*.19,2.14,2.56,.19);
      put(shutters,doorAt,1.29,z+side*.29,1.83,2.34,.15);
      put(awnings,doorAt,2.75,z+side*.66,3.1,.14,1.22,0,side*.07);
      put(entranceLights,doorAt,2.51,z+side*.80,1.3,.10,.13);
      put(cornices,b.x,b.h-.07,z+side*.25,b.w+.38,.25,.38);
      if(i%2===0){
        // Deep industrial cladding ribs are restricted to non-window corners.
        for(const sign of [-1,1]){
          for(let ry=1.0;ry<b.h-.3;ry+=1.1)
            put(ridges,b.x+sign*(b.w/2-.52),ry,z+side*.13,.05,.86,.16);
        }
      }
      if(i%3===1){
        put(ducts,b.x-b.w*.27,b.h*.60,z+side*.37,.42,Math.min(b.h*.45,4.6),.36);
        for(let p=0;p<3;p++)put(vents,b.x-b.w*.27,b.h*.60+(p-1)*.39,z+side*.6,.35,.045,.035);
      }
    }
    for(const side of [-1,1]){
      const wallX=b.x+side*(b.w/2+.15);
      put(pipes,wallX,b.h*.5,b.z-b.d*.21,1,Math.max(1,b.h-.65),1);
      put(pipes,wallX,b.h*.5,b.z+b.d*.24,1,Math.max(1,b.h-.65),1);
      put(gutters,wallX,b.h+.12,b.z,.19,.18,b.d+.35);
      if(i%4===0){
        // Steel service balconies at actual building floor elevations; not
        // advertised as new accessible surfaces (routes remain unchanged).
        const alt=Math.min(b.h-1.4,4.5);
        put(balconies,wallX+side*.57,alt,b.z,1.1,.18,Math.min(3.8,b.d*.70));
        put(rails,wallX+side*1.07,alt+.55,b.z,.10,1.1,Math.min(3.8,b.d*.70));
      }
    }
    for(let n=0;n<Math.min(2,Math.floor(b.w/6)+1);n++){
      const xx=b.x+(n-.5)*Math.min(4,b.w*.31);
      put(roofMachinery,xx,b.h+.45,b.z-b.d*.2,1.2,.9,1.15);
      put(vents,xx,b.h+.96,b.z-b.d*.2,1.10,.06,1.10);
    }
  }
  // Doorframe surrounds on genuinely OPEN interiors. Door system stays
  // authoritative and animated by UrbanDoors / the existing controller.
  for(const b of SQUAD_INTERIORS){
    const z=b.z+b.d/2+.24;
    for(const sign of [-1,1]){
      const x=b.x+sign*(1.65+.06);
      put(support,x,1.55,z,.20,3.1,.35);
    }
    put(support,b.x,3.05,z,3.48,.23,.34);
    put(entranceLights,b.x,3.28,z+.25,1.35,.13,.26);
    put(cornices,b.x,b.h+.2,b.z+b.d/2+.25,b.w+.28,.30,.55);
    // Steel-clad exterior shells on accessible shops. Keep the central front
    // door EMPTY so it remains a genuine doorway, not painted-on geometry.
    for(const sign of [-1,1]){
      const xx=b.x+sign*(b.w/2+.27);
      for(let layer=0;layer<Math.ceil(b.h/2.4);layer++){
        const hh=Math.min(2.35,b.h-layer*2.4-.12);
        if(hh<.15)continue;
        for(let bay=0;bay<3;bay++){
          const zz=b.z+(bay-1)*(b.d/3.15);
          put(panels[(Math.floor(b.x+b.z)+bay+2*layer+10)%panels.length],xx,layer*2.4+hh/2+.08,zz,.14,hh,b.d/3.25);
        }
      }
      for(let zf=-1;zf<=1;zf++){
        const zz=b.z+zf*(b.d*.37);
        put(support,xx+sign*.12,b.h*.5,zz,.14,b.h+.08,.14);
      }
      for(let floor=0;floor<Math.min(3,Math.floor(b.h/2.4));floor++){
        const yy=1.82+floor*2.4;
        if(yy+.72>b.h-.3)continue;
        put(recesses,xx+sign*.08,yy,b.z,.13,1.65,1.95);
        put(windows,xx+sign*.15,yy,b.z,.06,1.50,1.78);
        put(glazingBars,xx+sign*.19,yy,b.z,.06,1.55,.075);
      }
      put(gutters,xx+sign*.13,b.h+.20,b.z,.2,.25,b.d+.4);
    }
    const zz=b.z-b.d/2-.25;
    for(let col=0;col<3;col++){
      const xx=b.x+(col-1)*b.w*.31;
      put(panels[(b.h>9?0:1)+col],xx,b.h*.50,zz,b.w*.30,b.h-.44,.14);
      for(let floor=0;floor<Math.min(3,Math.floor(b.h/2.6));floor++){
        const yy=1.73+floor*2.60;if(yy+.80>b.h-.28)continue;
        put(recesses,xx,yy,zz-.11,1.4,1.52,.12);
        put(reflected,xx,yy,zz-.20,1.21,1.31,.05);
      }
    }
    for(const sx of [-1,1]){
      const xx=b.x+sx*(b.w/2-.15);
      put(support,xx,b.h*.5,zz,.20,b.h+.16,.24);
    }
    for(let floor=1;floor<Math.ceil(b.h/2.6);floor++)
      put(lintels,b.x,floor*2.6,zz-.12,b.w+.15,.15,.22);
    for(let i=0;i<2;i++)put(roofMachinery,b.x+((i?1:-1)*b.w*.25),b.h+.52,b.z-b.d*.2,1.2,.87,1.25);
    const floor=b.h/2;
    // Add handrails exactly where an actual walkable balcony already exists.
    put(rails,b.x,floor+.65,b.z+b.d/2+1.21,b.w*.42,1.08,.10);
    put(rails,b.x-b.w*.21,floor+.65,b.z+b.d/2+.65,.10,1.08,1.18);
    put(rails,b.x+b.w*.21,floor+.65,b.z+b.d/2+.65,.10,1.08,1.18);
    put(lintels,b.x,3.1,b.z-b.d/2-.16,b.w-.65,.17,.2);
  }
  // Road geometry no longer consists of an unbroken flat grey carpet.
  // All of these parts are walk-through detailing at ground height.
  for(let z=-188;z<=184;z+=6.2){
    for(const side of [-1,1]){
      const xx=side*(11.0+(Math.round(z*7)%3)*.20);
      put(pavement,xx,.052,z,3.05,.06,5.9);
      put(curb,side*9.28,.12,z,.22,.24,5.95);
    }
    if((Math.round(z/6.2)%4)===0){
      put(marking,0,.062,z,3.5,.012,.10);
      for(const sign of [-1,1])put(brokenTile,sign*11.65,.095,z+1.6,.7,.012,.46);
    }
  }
  for(let z of [-94,-21,51,116]){
    for(let c=-6;c<=6;c++)put(marking,c*1.25,.075,z,1.03,.013,2.35);
  }
  // Physical tactical cover: shapes are the exact shared collision AABBs.
  const coverBodies=[];
  for(const c of SQUAD_COVERS_466){
    const isWood=c.style==='crate';
    const material=isWood?mats.wood:mats.cream;
    const body=new THREE.Mesh(new THREE.BoxGeometry(c.w,c.h,c.d),material);
    body.name=`COLLIDABLE_COVER_${c.index}`;body.position.set(c.x,c.h/2,c.z);
    body.castShadow=true;body.receiveShadow=true;core.add(body);
    city.rayTargets.push(body);coverBodies.push(body);
    city.addSurface(c.x,c.z,c.w,c.d,c.h+.02);
    if(isWood){
      const sx=c.w/2,sz=c.d/2;
      for(const side of [-1,1]){
        for(const x of [-sx+.15,sx-.15])put(crateFrames,c.x+x,c.h/2,c.z+side*(sz+.045),.14,c.h+.04,.13);
        for(const h of [.13,c.h-.13])put(crateFrames,c.x,h,c.z+side*(sz+.045),c.w-.04,.14,.14);
        put(cratePlanks,c.x,c.h*.53,c.z+side*(sz+.11),c.w*.64,.29,.12,0,0,side*.32);
      }
      for(const h of [.15,c.h-.15])for(const side of [-1,1])put(crateFrames,c.x+side*(sx+.05),h,c.z,.14,.14,c.d+.08);
      put(crateFrames,c.x,c.h+.055,c.z,c.w+.11,.11,c.d+.11);
    }else{
      put(crateFrames,c.x,c.h+.03,c.z,c.w+.10,.12,c.d+.10);
      for(const side of [-1,1]){
        for(let n=-1;n<=1;n++)put(hazard,c.x+n*c.w*.27,c.h*.5,c.z+side*(c.d/2+.08),.25,c.h*.67,.04,0,0,-.24);
      }
    }
  }
  // Transverse service walkways above gun height; hanging lamps pick up the
  // warm sunrise of the reference. Beams never obstruct ground-floor paths.
  for(const z of [-82,-4,67,155]){
    put(bridgeBeams,0,10.15,z,18.3,.54,1.52);
    for(const sign of [-1,1]){
      put(bridgeBeams,sign*9,11.32,z,.35,2.33,1.64);
      put(bridgeBeams,sign*6.1,10.48,z,.19,.65,1.72);
    }
    put(bridgeLamps,0,9.72,z,2.4,.14,.40);
    put(bridgeBeams,0,9.9,z+1.1,14,.16,.13);
  }
  for(const z of [-82,-4,67,155]){
    const lamp=new THREE.PointLight(0xffc78e,.95,14,2);
    lamp.name='SUNLIT_PASSAGE_LIGHT';lamp.position.set(0,9.15,z);
    lamp.castShadow=false;detail.add(lamp);
  }
  // Original mural decals (transparent WEBP), placed on actual solid facades.
  const wallCandidates=valid.filter(b=>b.w>13&&b.h>5);
  const muralTex=new THREE.TextureLoader().load(BASE+'mural.webp');
  muralTex.colorSpace=THREE.SRGBColorSpace;muralTex.anisotropy=4;
  const muralMat=new THREE.MeshBasicMaterial({map:muralTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,side:THREE.DoubleSide});
  wallCandidates.slice(0,5).forEach((b,i)=>{
    const mural=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6.8,b.w*.55),3.0),muralMat);
    mural.position.set(b.x+((i%2)?1.5:-1.5),Math.min(3.1,b.h*.56),b.z+b.d/2+.35);
    mural.name='ORIGINAL_ENVIRONMENT_MURAL';detail.add(mural);
  });
  // Shared material / geometry batches. LOW only hides cosmetic parts; cover,
  // architecture and walkable surfaces are identical at every graphics preset.
  for(const b of batches){b.mesh.count=b.n;b.mesh.instanceMatrix.needsUpdate=true;}
  const stats={solidCovers:SQUAD_COVERS_466.length,buildings:valid.length,instances:batches.reduce((a,b)=>a+b.n,0),drawBatches:batches.length};
  city.reference466={root,core,detail,stats,coverBodies};
  return city.reference466;
}

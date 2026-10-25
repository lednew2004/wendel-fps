import * as THREE from 'three';
import {ARENA_BOUNDS,SQUAD_BLOCKS,SQUAD_INTERIORS,SQUAD_OBSTACLES,SQUAD_POINTS,SQUAD_BRIDGES,SQUAD_BRIDGE_BLOCKS} from './squadLayout.js';

/** TITAN PROTOCOL 4.7 – PORT ZENITH.
 * A NEW authored arena; it never invokes the old city/graphics-lab/466 renderers.
 * Collision volumes are authored in squadLayout.js and shared with the server.
 */
const palette={azure:0x2792c5,cyan:0x3aaab7,marine:0x335a7a,cream:0xddd0b6,concrete:0xaebfca};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const hash=(x,y=0)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
function paintedTexture(base='#62bbdf',accent='#9dd2df',seed=7){
 const c=document.createElement('canvas');c.width=c.height=512;
 const q=c.getContext('2d');q.fillStyle=base;q.fillRect(0,0,512,512);
 for(let i=0;i<2600;i++){
  const x=hash(i+seed,1)*512,y=hash(i+seed,2)*512,grey=hash(i+seed,3)*255|0;
  q.fillStyle=`rgba(${grey},${grey},${grey},${.012+hash(i,4)*.045})`;
  q.fillRect(x,y,1+hash(i,5)*6,1+hash(i,6)*4);
 }
 for(let y=0;y<512;y+=26){
  q.fillStyle='rgba(255,255,255,.072)';q.fillRect(0,y,512,2);
  q.fillStyle='rgba(8,30,39,.085)';q.fillRect(0,y+23,512,2);
 }
 for(let x=22;x<512;x+=125){q.strokeStyle='rgba(7,38,52,.20)';q.lineWidth=2;q.strokeRect(x,10,107,484);}
 q.fillStyle=accent;q.globalAlpha=.06;q.fillRect(15,30,482,220);q.globalAlpha=1;
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function concreteTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 g.fillStyle='#bec6c6';g.fillRect(0,0,512,512);
 for(let i=0;i<8600;i++){const h=hash(i,19);g.fillStyle=h>.5?'rgba(45,66,76,.055)':'rgba(255,255,255,.063)';g.fillRect(hash(i,17)*512,hash(i,18)*512,1+h*5,1+h*3);}
 g.strokeStyle='rgba(57,72,75,.18)';g.lineWidth=2;for(let i=0;i<512;i+=128){g.beginPath();g.moveTo(i,0);g.lineTo(i,512);g.stroke();}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;return tex;
}
function makeSign(text,color='#f6e5bb'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');
 c.fillStyle='#263c49';c.fillRect(0,0,1024,256);c.fillStyle=color;c.fillRect(0,0,15,256);
 c.fillStyle='rgba(255,255,255,.1)';c.fillRect(28,19,970,7);
 c.font='bold 108px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f4f2df';c.fillText(text,512,134,958);
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
}
function graffitiTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
 g.clearRect(0,0,1024,512);g.lineCap='round';g.lineJoin='round';
 const colors=['#31b3b3','#6ab66d','#b5d156','#e7a5aa','#a27ddd','#267aa2'];
 for(let k=0;k<29;k++){
  const x=110+hash(k,2)*830,y=90+hash(k,8)*300;
  g.strokeStyle=colors[k%colors.length];g.globalAlpha=.68;g.lineWidth=6+hash(k,3)*28;
  g.beginPath();g.moveTo(x-60,y+30);g.bezierCurveTo(x+90,y-160,x-85,y+120,x+90,y-15);g.stroke();
 }
 g.globalAlpha=.9;g.font='italic 900 130px Arial';g.fillStyle='#77c871';g.rotate(-.07);g.fillText('ZENITH',195,315);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.83,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
}
export function createSquadWorld(city){
 const root=city.root;
 const std=(color,metalness=0,roughness=.7,more={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...more});
 const m={
  floor:std(0xe1d7c5,.06,.94,{map:concreteTexture()}),
  asphalt:city.world.mat(0x9d9f9d,.04,.93,city.world.textures.asphalt),
  blue:std(0xcce9ff,.30,.52,{map:paintedTexture('#397fa9','#75c8e0',1)}),
  cyan:std(0xe9f9ff,.27,.55,{map:paintedTexture('#5dbacc','#b8eeeb',6)}),
  marine:std(0xb4d5ee,.36,.56,{map:paintedTexture('#335a7e','#72b5d8',12)}),
  cream:std(0xfff2dd,.04,.85,{map:paintedTexture('#d4c6b0','#f5e9d0',16)}),
  trim:std(0x375b72,.66,.43),steel:std(0x546777,.71,.39),dark:std(0x293943,.55,.5),
  orange:std(0xda8a38,.24,.54),wood:std(0xd5b587,.02,.85,{map:city.world.textures.wood}),
  glass:new THREE.MeshPhysicalMaterial({color:0xb5e8f7,metalness:.2,roughness:.18,transparent:true,opacity:.58,depthWrite:false,side:THREE.DoubleSide}),
  white:std(0xf9e8c5,.02,.82),mark:std(0xebd8a2,0,.87),green:std(0x5c805a,.05,.89),
  lamp:new THREE.MeshBasicMaterial({color:0xffd08a,toneMapped:false})
 };
 const solid=(x,y,z,w,h,d,material,shadow=true)=>{const mesh=city.box(x,y,z,w,h,d,material,shadow);mesh.castShadow=shadow;mesh.receiveShadow=true;city.rayTargets.push(mesh);return mesh;};
 const deco=(x,y,z,w,h,d,material)=>{const mesh=city.box(x,y,z,w,h,d,material,false);mesh.castShadow=false;return mesh;};
 const batches=new Map();
 const inst=(key,material,x,y,z,w,h,d,rotation=0)=>{
  if(!batches.has(key))batches.set(key,{mat:material,poses:[]});
  batches.get(key).poses.push({x,y,z,w,h,d,rotation});
 };
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(ARENA_BOUNDS.halfX*2,ARENA_BOUNDS.halfZ*2),m.floor);
 floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;root.add(floor);
 // Asphalt is a connected, deliberately designed street system. All walkable.
 for(const [x,z,w,d] of [[0,0,22,224],[-77,0,14,210],[77,0,14,210],[0,-28,194,14],[0,43,194,14],[0,-94,194,14],[0,100,194,12]]){
  const road=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m.asphalt);road.rotation.x=-Math.PI/2;road.position.set(x,.022,z);road.receiveShadow=true;root.add(road);
  const edgeX=w<d;
  if(edgeX)for(const sx of [-1,1])inst('curb',m.white,x+sx*(w/2+.55),.13,z,.75,.25,d);
  else for(const sz of [-1,1])inst('curb',m.white,x,.13,z+sz*(d/2+.55),w,.25,.65);
 }
 // Broken centre lines, drainage slots, crossings and patchwork.
 for(let z=-103;z<109;z+=12)if(![-28,43,-94,100].some(k=>Math.abs(z-k)<9))inst('roadmark',m.mark,0,.039,z,.18,.015,5);
 for(let z of [-28,43,-94,100])for(let x=-12;x<=12;x+=3.4)inst('roadmark',m.mark,x,.043,z,1.65,.012,3.2);
 for(let z=-105;z<110;z+=17){inst('drain',m.dark,-13,.046,z,1.4,.018,.22);inst('drain',m.dark,13,.046,z,1.4,.018,.22);}
 // Physical buildings are assembled from authored wall/floor COLLIDER segments,
 // not opaque building boxes. This creates real rooms, doorways and roof decks.
 const themes={concrete:m.cream,azure:m.blue,cyan:m.cyan,marine:m.marine,cream:m.cream};
 for(const b of SQUAD_INTERIORS){
  const wall=themes[b.theme]||m.blue;
  const pieces=SQUAD_BLOCKS.filter(p=>p.interiorId===b.id);
  for(const p of pieces){
   const mat=p.interiorPart==='roof'?m.steel:p.interiorPart==='loft'||p.interiorPart==='landing'?m.floor:p.interiorPart==='desk'?m.wood:p.interiorPart==='supply'?m.orange:p.interiorPart==='lintel'?m.trim:wall;
   solid(p.x,(p.minY+p.maxY)/2,p.z,p.w,p.h,p.d,mat,p.interiorPart==='wall'||p.interiorPart==='roof');
   city.solids.push({...p});
   if(['loft','landing','roof'].includes(p.interiorPart))city.addSurface(p.x,p.z,p.w,p.d,p.maxY);
  }
  // Real two-flight indoor access: first to loft, second to the accessible roof.
  const mezz=b.h*.51,roof=b.h+.35;
  city.makeStaircase({x:b.x+b.w*.28,z:b.z,from:0,to:mezz,length:b.d-6.6,width:2.45,axis:'z'});
  city.makeStaircase({x:b.x-b.w*.30,z:b.z,from:mezz,to:roof,length:b.d-6.6,width:2.45,axis:'z',reverse:true});
  // Additional exterior ladder reachable from rear service alley.
  const ladder={x:b.x,z:b.z-b.d/2-.6,toX:b.x,toZ:b.z-b.d/2+1,top:roof,base:0};
  city.ladders.push(ladder);city.buildLadder(ladder);
  // The original reference has folded steel cladding, girders and warm soffits.
  for(const side of [-1,1]){
   const fx=b.x+side*b.w/2;
   for(let z=b.z-b.d/2+1.6;z<b.z+b.d/2-1.0;z+=2.0){
    inst('corrugation',m.trim,fx+side*.26,b.h*.54,z,.14,b.h*.92,.11);
    for(let level=0;level<2;level++){
     inst('seam',m.white,fx+side*.25,level?b.h*.72:b.h*.28,z,.12,.035,1.65);
    }
   }
   for(let y=2.2;y<b.h-1;y+=2.8){
    const pipe=solid(fx+side*.30,y,b.z,b.d*.0+.09,.11,b.d*.85,m.steel,false);
    pipe.visible=true; // pipe is visual; no extra collider
   }
  }
  for(const sz of [-1,1]){
   const fz=b.z+sz*(b.d/2+.28);
   for(let x=b.x-b.w/2+2;x<b.x+b.w/2-1;x+=3){
    if(Math.abs(x-b.x)<2.7)continue; // clear the real door opening
    const rect=deco(x,b.h*.68,fz,1.85,1.18,.065,m.glass);
    rect.rotation.y=sz===1?0:Math.PI;
    inst('windowframe',m.dark,x,b.h*.68,fz+sz*.045,2.06,.10,.15);
    inst('windowframe',m.dark,x,b.h*.68+ .62,fz+sz*.045,2.08,.09,.15);
    inst('windowframe',m.dark,x-1,b.h*.68,fz+sz*.045,.12,1.26,.15);
    inst('windowframe',m.dark,x+1,b.h*.68,fz+sz*.045,.12,1.26,.15);
   }
   // Massive doorway frames; raised sign, emergency light and awning.
   const doorZ=b.z+sz*b.d/2;
   inst('doorframe',m.orange,b.x-1.9,1.55,doorZ+sz*.24,.22,3.18,.36);
   inst('doorframe',m.orange,b.x+1.9,1.55,doorZ+sz*.24,.22,3.18,.36);
   inst('doorframe',m.orange,b.x,3.18,doorZ+sz*.24,4.1,.18,.38);
   deco(b.x,3.48,doorZ+sz*.60,5.9,.20,1.45,m.trim);
   inst('lamp',m.lamp,b.x,3.28,doorZ+sz*.70,.62,.1,.40);
  }
  // Rooftop HVAC, safety rails and structural bracing.
  for(const sign of [-1,1]){
   inst('roofrail',m.trim,b.x+sign*(b.w/2-.34),b.h+1.05,b.z,.11,1.38,b.d-2.3);
   for(let j=-1;j<=1;j++)inst('roofpost',m.dark,b.x+sign*(b.w/2-.34),b.h+.78,b.z+j*(b.d/2-1.8),.16,1.38,.16);
   inst('roofrail',m.trim,b.x,b.h+1.05,b.z+sign*(b.d/2-.35),b.w-2.5,1.38,.10);
  }
  inst('hvac',m.steel,b.x-b.w*.22,b.h+.8,b.z-b.d*.19,3.1,.9,2.3);
  inst('hvac',m.dark,b.x+b.w*.17,b.h+.63,b.z+b.d*.19,2.5,.55,2.2);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(8.8,2.0),makeSign(b.id.toUpperCase().replaceAll('-',' ')));
  sign.position.set(b.x,b.h-.90,b.z+b.d/2+.33);root.add(sign);
  // Vertical reinforcement and translucent interior windows.
  for(let j=-2;j<=2;j++)for(const sz of [-1,1]){
   inst('girders',m.trim,b.x+j*b.w*.18,b.h*.53,b.z+sz*(b.d/2+.12),.21,b.h,.26);
  }
 }
 // Traversable overhead passages link rooftops and create alternate routes.
 // Every deck/rail corresponds to the collision shapes used by the server.
 for(const b of SQUAD_BRIDGE_BLOCKS){
  const mat=b.bridgeRail?m.trim:m.steel;
  solid(b.x,(b.minY+b.maxY)/2,b.z,b.w,b.h,b.d,mat,!b.bridgeRail);
  city.solids.push({...b});
  if(b.bridge)city.addSurface(b.x,b.z,b.w,b.d,b.maxY);
 }
 for(const bridge of SQUAD_BRIDGES){
  for(let z=bridge.z-bridge.d/2+1;z<bridge.z+bridge.d/2;z+=2.2){
   inst('gantryfloor',m.dark,bridge.x,bridge.y+.05,z,bridge.w+.06,.07,.13);
   inst('roofpost',m.orange,bridge.x-bridge.w/2+.11,bridge.y+.65,z,.14,1.35,.14);
   inst('roofpost',m.orange,bridge.x+bridge.w/2-.11,bridge.y+.65,z,.14,1.35,.14);
  }
 }
 // The screenshot's recognizable narrow tactical corridor: towering azure
 // steel walls, cross-beams, warm overhead light and stacks of wooden cargo.
 for(const z of [-71,-39,-7,26,61,92]){
  const y=15+(Math.abs(z)%3)*1.2;
  inst('gantry',m.trim,0,y,z,37,1.15,1.35);
  inst('gantry',m.orange,0,y-.85,z,14,.18,1.22);
  for(const x of [-17.5,17.5])inst('gantry',m.steel,x,y-4.8,z,.34,9.0,.34);
  for(let x=-12;x<=12;x+=4){inst('lamp',m.lamp,x,y-.96,z,.8,.095,.62);}
 }
 // 3D obstacle geometry is driven ONLY by the shared authoritative blockers.
 for(const p of [...SQUAD_OBSTACLES,...SQUAD_BLOCKS.filter(b=>b.perimeter)]){
  let mat=p.perimeter?m.marine:p.kind==='barrier'?m.cream:p.kind==='crate'?m.wood:p.kind==='tower'?m.blue:m.blue;
  const mesh=solid(p.x,p.h/2,p.z,p.w,p.h,p.d,mat,true);city.solids.push({...p});
  if(p.perimeter){
   // Segmented perimeter metal panels and vertical bracing.
   if(p.w>p.d)for(let x=-92;x<94;x+=8)inst('girders',m.trim,x,3.9,p.z+(p.z>0?-.4:.4),.25,7.0,.24);
   else for(let z=-108;z<109;z+=8)inst('girders',m.trim,p.x+(p.x>0?-.4:.4),3.9,z,.24,7.0,.25);
  }else if(p.kind==='crate'){
   for(let sz of [-1,1])for(const sx of [-1,1])inst('crateedge',m.dark,p.x+sx*(p.w/2-.12),p.h/2,p.z+sz*(p.d/2-.08),.22,p.h,.17);
   inst('crateedge',m.wood,p.x,p.h-.08,p.z,p.w,.17,p.d);
  }else if(p.kind==='container'){
   for(let i=0;i<p.w/1.2;i++)inst('containerdetail',m.trim,p.x-p.w/2+.6+i*1.2,p.h/2,p.z+p.d/2+.045,.07,p.h-.16,.08);
   inst('containerdetail',m.orange,p.x,p.h-.14,p.z,p.w,.16,p.d);
  }else if(p.kind==='tower'){
   for(const side of [-1,1]){
    for(let z=p.z-p.d/2+1.4;z<p.z+p.d/2-1;z+=2.4){
      inst('towerframe',m.trim,p.x+side*(p.w/2+.09),p.h/2,z,.12,p.h,.16);
      inst('towerseam',m.white,p.x+side*(p.w/2+.11),p.h*.72,z,.10,.06,1.65);
      inst('towerseam',m.white,p.x+side*(p.w/2+.11),p.h*.36,z,.10,.06,1.65);
    }
   }
   for(const side of [-1,1])for(let x=p.x-p.w/2+1.5;x<p.x+p.w/2-1.2;x+=2.1){
      inst('towerwindow',m.glass,x,p.h*.68,p.z+side*(p.d/2+.05),1.2,1.0,.08);
      inst('towerwindow',m.dark,x,p.h*.68+.54,p.z+side*(p.d/2+.09),1.26,.08,.14);
   }
   inst('towercap',m.steel,p.x,p.h+.16,p.z,p.w+.6,.32,p.d+.6);
   inst('towertrim',m.orange,p.x,p.h-.22,p.z,p.w+.18,.12,p.d+.18);
   inst('warning',m.orange,p.x,p.h*.46,p.z,p.w+.08,.08,.10);
  }else{
   inst('warning',m.orange,p.x,p.h-.14,p.z,p.w+.02,.10,p.d+.02);
  }
 }
 // Urban props kept sparse and useful: service lights, drainage and loading bays.
 const lampPositions=[[-17,-102],[18,-99],[-17,-15],[18,45],[-16,106],[16,102],[-86,1],[84,-24]];
 for(const [x,z] of lampPositions){
  inst('lightpost',m.steel,x,3.3,z,.17,6.6,.17);
  inst('lightpost',m.lamp,x,6.62,z,.75,.17,1.8);
 }
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#c2a985';ctx.fillRect(0,0,256,256);
 const graffiti=new THREE.Mesh(new THREE.PlaneGeometry(19,9),graffitiTexture());
 // The west boundary stands in for the bright painted mural in the reference.
 graffiti.position.set(-95.85,5.2,-5);graffiti.rotation.y=Math.PI/2;root.add(graffiti);
 // The industrial district uses a few local lights; no shadow-casting pointlights.
 for(const [x,z,w,d,h] of [[-60,-109,20,8,30],[-22,-109,18,8,26],[22,-109,18,8,28],[60,-109,20,8,32],[-62,109,18,8,28],[-18,109,22,8,31],[26,109,20,8,29],[66,109,16,8,27]]){
  const shell=deco(x,h/2,z,w,h,d,m.dark);shell.receiveShadow=true;
  inst('skylineTrim',m.trim,x,h-.2,z,w+.2,.1,d+.2);
 }
 // Batched decorations: one draw call per material/geometry class.
 const unit=new THREE.BoxGeometry(1,1,1);const tmp=new THREE.Object3D();
 for(const batch of batches.values()){
  const im=new THREE.InstancedMesh(unit,batch.mat,batch.poses.length);
  for(let i=0;i<batch.poses.length;i++){
   const p=batch.poses[i];tmp.position.set(p.x,p.y,p.z);tmp.scale.set(p.w,p.h,p.d);tmp.rotation.set(0,p.rotation,0);tmp.updateMatrix();im.setMatrixAt(i,tmp.matrix);
  }
  im.instanceMatrix.needsUpdate=true;im.frustumCulled=false;im.castShadow=false;im.receiveShadow=true;root.add(im);
 }
 // Restrained mission markers, no giant neon beacons.
 for(const [key,point] of Object.entries(SQUAD_POINTS)){
  const ring=new THREE.Mesh(new THREE.RingGeometry(3.8,4.0,36),new THREE.MeshBasicMaterial({color:key==='boss'?0xe1b168:0xa0d4d2,side:THREE.DoubleSide,transparent:true,opacity:.42}));
  ring.rotation.x=-Math.PI/2;ring.position.set(point.x,.09,point.z);root.add(ring);
 }
 city.cinematicPalette=null;city.premiumFacadeMeshes=[];city.squadDetailRoot=null;
 root.name='PORT_ZENITH_NEW_ARENA';
 return SQUAD_POINTS;
}

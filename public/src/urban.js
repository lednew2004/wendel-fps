import {createSquadWorld} from './squadWorld.js';
import {SQUAD_ENEMY_SPAWNS} from './squadLayout.js';
import {UrbanDoors} from './urbanDoors.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {solidBlocksCapsule,standHeight,intersectLanding,walkableVolumes} from './parkourPhysics.js';
import {UrbanExpansion} from './urbanExpansion.js';
import {WORLD_HALF} from './worldLayout.js';

const R=(a,b)=>a+Math.random()*(b-a);
const color=(n)=>new THREE.MeshStandardMaterial({color:n,roughness:.86,metalness:.08});

/** Cidade gerada localmente. Geometria visual e volumes de colisão são separados. */
export class UrbanCity {
  constructor(world){
    this.world=world;
    this.root=new THREE.Group();this.root.visible=false;world.scene.add(this.root);
    this.solids=[];this.surfaces=[];this.walkableCache=null;this.walkableUpdatedAt=0;this.ladders=[];this.lowWalls=[];this.courses=[];
    this.rayTargets=[];this.chunks=new Map();this.currentParent=null;this.chunkTick=0;this.routeMarkerGroups=[];this.buildingMaterials=new Map();
    this.materials={
      concrete:world.mat(0xffffff,.1,.93,world.textures.concrete),
      asphalt:world.mat(0xffffff,.2,.94,world.textures.asphalt),
      roof:world.mat(0xffffff,.65,.58,world.textures.roof),
      steel:world.mat(0x4a555d,.78,.48,world.textures.metalBlue),
      brick:color(0xcba38e),glass:new THREE.MeshStandardMaterial({color:0xa3d8f4,metalness:.52,roughness:.24,transparent:true,opacity:.64}),
      edge:color(0x353d45),curb:color(0xaeb0ab),yellow:color(0xd7b478),dark:color(0x2a333b),
      road:color(0x59636b),white:color(0xfff3e4),green:color(0x67c973)
    };
    this.build();
    this.expansion=new UrbanDoors(this);
    this.makeFuelDrums();
    this.spawnPoints=SQUAD_ENEMY_SPAWNS.map(p=>[...p]);
  }
  box(x,y,z,w,h,d,mat,shadow=true,parent=null){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;(parent||this.currentParent||this.root).add(m);return m;
  }
  addSolid(x,z,w,d,height,minY=0){this.solids.push({x,z,hx:w/2,hz:d/2,minY,maxY:height});}
  addSurface(x,z,w,d,y){this.surfaces.push({x,z,hx:w/2,hz:d/2,y});}
  chunkFor(x,z){
    const key=Math.floor(x/52)+','+Math.floor(z/52);
    if(!this.chunks.has(key)){
      const root=new THREE.Group();root.userData.chunkCenter={x:(Math.floor(x/52)+.5)*52,z:(Math.floor(z/52)+.5)*52};
      this.root.add(root);this.chunks.set(key,root);
    }
    return this.chunks.get(key);
  }
  updateVisibility(x,z,maxDistance=135){
    for(const chunk of this.chunks.values()){
      const c=chunk.userData.chunkCenter;
      chunk.visible=Math.hypot(c.x-x,c.z-z)<maxDistance;
    }
  }
  addBuilding(x,z,w,d,h,accent=0x87939b,roofAccess=true){
    if(protectedRoute(x,z))return {x,z,w,d,h:0,roofAccess:false};
    const last=this.currentParent;this.currentParent=this.chunkFor(x,z);
    if(!this.buildingMaterials.has(accent))this.buildingMaterials.set(accent,color(accent));
    const mat=this.buildingMaterials.get(accent);
    this.rayTargets.push(this.box(x,h/2,z,w,h,d,mat));
    this.rayTargets.push(this.box(x,h+.16,z,w+.6,.32,d+.6,this.materials.roof));
    this.addSolid(x,z,w,d,h);
    this.addSurface(x,z,w,d,h+.31);
    for(const side of [-1,1]){
      this.box(x+side*w/2,h/2,z,.18,h,.18,this.materials.edge,false);
      this.box(x,h/2,z+side*d/2,w,.14,.15,this.materials.edge,false);
    }
    // roof equipment/vents are visual only and cannot create invisible collisions
    this.box(x-w*.22,h+.58,z-d*.23,w*.22,.65,d*.19,this.materials.steel,false);
    this.box(x+w*.20,h+.53,z+d*.19,w*.16,.50,d*.15,this.materials.edge,false);
    if(roofAccess){
      const ladder={x,z:z+d/2+.48,toX:x,toZ:z+d/2-1.20,top:h+.33,base:0};
      this.ladders.push(ladder);
      this.buildLadder(ladder);
    }
    this.currentParent=last;
    return {x,z,w,d,h};
  }
  buildLadder(l){
    const z=l.z+0.03,material=this.materials.steel;
    this.box(l.x-.35,l.top/2,z,.1,l.top,.13,material,false);
    this.box(l.x+.35,l.top/2,z,.1,l.top,.13,material,false);
    // Instancing: one draw call instead of 10–40 calls per ladder.
    const N=Math.ceil((l.top-.40)/.38);
    const steps=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.075,.12),material,N);
    const helper=new THREE.Object3D();for(let i=0;i<N;i++){helper.position.set(l.x,.40+i*.38,z);helper.updateMatrix();steps.setMatrixAt(i,helper.matrix);}
    steps.instanceMatrix.needsUpdate=true;steps.castShadow=false;steps.receiveShadow=true;(this.currentParent||this.root).add(steps);
    this.box(l.x,l.top+.48,z,.98,.14,.14,this.materials.yellow,false);
  }
  makeStaircase({x,z,from=0,to=6,length=13,width=2.5,axis='z',reverse=false}){
    const N=Math.max(8,Math.ceil(Math.abs(to-from)/.28));
    const stair=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.materials.concrete,N);
    const dummy=new THREE.Object3D();
    for(let i=0;i<N;i++){
      const t=(i+.5)/N;
      const level=from+(to-from)*(reverse?1-i/N:(i+1)/N);
      const h=Math.max(.04,level);
      if(axis==='z')dummy.position.set(x,h/2,z-length/2+length*t);
      else dummy.position.set(x-length/2+length*t,h/2,z);
      dummy.scale.set(axis==='z'?width:length/N+.025,h,axis==='z'?length/N+.025:width);
      dummy.rotation.set(0,0,0);dummy.updateMatrix();stair.setMatrixAt(i,dummy.matrix);
    }
    stair.instanceMatrix.needsUpdate=true;
    stair.castShadow=false;stair.receiveShadow=true;
    (this.currentParent||this.root).add(stair);
    this.surfaces.push({x,z,hx:axis==='z'?width/2:length/2,hz:axis==='z'?length/2:width/2,ramp:true,axis,from,to,reverse});
    // Handrails do not block the walking volume.
    if(axis==='z')for(const sign of [-1,1])this.box(x+sign*(width/2+.10),(to+1)/2,z,.12,to+1,length,this.materials.edge,false);
  }
  addInterior(x,z,w,d,h=9){
    // open front, enclosed sides and rear, usable ground and accessible second floor
    const wall=this.materials.concrete;
    this.rayTargets.push(this.box(x-w/2,h/2,z,.55,h,d,wall));
    this.rayTargets.push(this.box(x+w/2,h/2,z,.55,h,d,wall));
    this.rayTargets.push(this.box(x,h/2,z-d/2,w,h,.55,wall));
    this.addSolid(x-w/2,z,.55,d,h);this.addSolid(x+w/2,z,.55,d,h);this.addSolid(x,z-d/2,w,.55,h);
    this.rayTargets.push(this.box(x,h+.15,z,w,.35,d,this.materials.roof));
    this.addSurface(x,z,w,d,h+.33);
    this.rayTargets.push(this.box(x-w/5,4.5,z-d*.18,w*.58,.28,d*.64,wall));
    this.addSurface(x-w/5,z-d*.18,w*.58,d*.64,4.64);
    this.makeStaircase({x:x+w*.28,z:z+1.1,from:0,to:4.64,length:13,width:2.35,axis:'z'});
    this.makeStaircase({x:x-w*.31,z:z+1.1,from:4.64,to:h+.33,length:13,width:2.35,axis:'z'});
    this.buildLadder({x:x,z:z+d/2+.5,toX:x,toZ:z+d/2-1.2,top:h+.33});
    this.ladders.push({x,z:z+d/2+.5,toX:x,toZ:z+d/2-1.2,top:h+.33,base:0});
  }
  addLowWall(x,z,w=4,d=.60,h=1.12){
    this.rayTargets.push(this.box(x,h/2,z,w,h,d,this.materials.concrete));
    this.addSolid(x,z,w,d,h);
    this.lowWalls.push({x,z,hx:w/2,hz:d/2,minY:0,maxY:h});
  }
  addFireEscape(b){
    // Uma alternativa física às escadas verticais: rampa com degraus reais,
    // passarela superior e corrimãos. Largura e inclinação compatíveis com a física.
    const x=b.x+b.w/2+3.0,z=b.z;
    this.makeStaircase({x,z,from:0,to:b.h+.31,length:15,width:2.5,axis:'z'});
    const top=b.h+.31;
    const bridgeX=b.x+b.w/2+1.6;
    this.box(bridgeX,top-.14,b.z+7.4,5.0,.28,2.6,this.materials.steel);
    this.addSurface(bridgeX,b.z+7.4,5.0,2.6,top);
    this.box(bridgeX,top+.55,b.z+8.72,5.0,1.1,.10,this.materials.edge,false);
  }
  loadProps(){
    const loader=new GLTFLoader();
    for(const [name,positions] of [
      ['utility_truck',[[-40,0,15,Math.PI/2],[85,0,93,0]]],
      ['forklift',[[1,0,91,Math.PI],[-22,0,-104,0]]]
    ]){
      const url=globalThis.TITAN_EMBEDDED_ASSETS?.[`models/${name}.glb`]||`./assets/models/${name}.glb`;
      loader.load(url,gltf=>{
        for(const [x,y,z,rot] of positions){
          const obj=gltf.scene.clone(true);obj.position.set(x,y,z);obj.rotation.y=rot;
          obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
          this.root.add(obj);
        }
      },undefined,err=>console.warn('Prop urbano indisponível',name,err));
    }
  }
  makeCourse(name,level,buildings,origin){
    const course={name,level,spawn:origin,waypoints:[{x:origin[0],z:origin[1],y:0},...buildings.map(b=>({x:b.x,z:b.z,y:b.h+.32}))],best:null};
    try{const n=Number(localStorage.getItem('titan-v09-route-'+level));if(n>0)course.best=n;}catch{}
    this.courses.push(course);
    // compact rooftop beacons, not giant neon pillars
    const mat=new THREE.MeshBasicMaterial({color:level===1?0x8cc5ad:level===2?0xe0b979:0xe19a83});
    const markers=new THREE.Group();this.root.add(markers);this.routeMarkerGroups.push(markers);markers.visible=false;
    for(let i=0;i<course.waypoints.length;i++){
      const p=course.waypoints[i];
      const ring=new THREE.Mesh(new THREE.TorusGeometry(i===0?1.5:1.25,.075,6,32),mat);
      ring.rotation.x=-Math.PI/2;ring.position.set(p.x,p.y+.10,p.z);markers.add(ring);
      const mast=this.box(p.x,p.y+.6,p.z,.09,.9,.09,mat,false,markers);
    }
  }
  build(){
    this.squad=createSquadWorld(this);
    // Port Zenith is a completely new arena. Do not load legacy visual props.
  }
  makeFuelDrums(){
    const steel=new THREE.MeshStandardMaterial({color:0x48535b,metalness:.68,roughness:.52});
    const fuel=new THREE.MeshStandardMaterial({color:0xa2533d,metalness:.4,roughness:.58});
    for(const [x,z] of [[-15,-18],[15,30],[44,14],[-44,-14],[-60,48],[60,-48],[-12,65],[12,-65],[-100,15],[100,-15]]){
      if(!this.canOccupy(x,z,0,1.6,.9))continue;
      const g=new THREE.Group();g.position.set(x,0,z);
      const drum=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,1.38,12),fuel);
      drum.position.y=.71;drum.castShadow=true;g.add(drum);
      for(const y of [.24,1.22]){const band=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.13,12),steel);band.position.y=y;g.add(band);}
      const lid=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.1,12),steel);lid.position.y=1.43;g.add(lid);
      this.root.add(g);
      const collider={x,z,hx:.72,hz:.72,minY:0,maxY:1.5};
      this.solids.push(collider);
      this.world.barrels.push({mesh:g,collider,home:this.root,health:55,x,z,alive:true});
    }
  }
  setRouteActive(index=-1){for(let i=0;i<this.routeMarkerGroups.length;i++)this.routeMarkerGroups[i].visible=i===index;}
  canOccupy(x,z,y,height=1.77,r=.42){
    if(Math.abs(x)>WORLD_HALF-r||Math.abs(z)>WORLD_HALF-r||y<-.3)return false;
    for(const s of this.solids)if(s.active!==false&&solidBlocksCapsule(s,x,z,y,height,r))return false;
    return true;
  }
  getWalkable(){
    // Stable cached geometry between 90 Hz physics steps; refresh if props change.
    const now=this.world.time||0;
    if(!this.walkableCache||now-this.walkableUpdatedAt>.15||this.walkableSolidCount!==this.solids.length){
      this.walkableCache=walkableVolumes(this.surfaces,this.solids);this.walkableSolidCount=this.solids.length;this.walkableUpdatedAt=now;
    }
    return this.walkableCache;
  }
  floorAt(x,z,feet,step=.46){return standHeight(this.getWalkable(),x,z,feet,step);}
  landingAt(x,z,oldFeet,newFeet){return intersectLanding(this.getWalkable(),x,z,oldFeet,newFeet);}
  wallNear(x,z,y,r=1.0){
    let closest=null,best=Infinity;
    for(const s of this.solids){
      if(y<=s.minY+.5||y>=s.maxY-.65)continue;
      const dx=x-s.x,dz=z-s.z;
      const ax=Math.abs(dx)-s.hx,az=Math.abs(dz)-s.hz;
      const near=Math.max(ax,0)**2+Math.max(az,0)**2;
      if(near>r*r||near>=best)continue;
      let nx=0,nz=0;
      if(ax>az)nx=Math.sign(dx);else nz=Math.sign(dz);
      if(!nx&&!nz)continue;
      best=near;closest={s,nx,nz,dist:Math.sqrt(near)};
    }
    return closest;
  }
  nearestInteractable(x,z,y,maxDistance=2.7){return this.expansion?.nearby(x,z,y,maxDistance)||null;}
  toggleInteractable(id,open){return this.expansion?.setState(id,open)||false;}
  resetInteractions(){this.expansion?.reset();}
  animateEnvironment(dt){this.expansion?.update(dt);}
  nearestLadder(x,z,feet){return this.ladders.find(l=>Math.hypot(x-l.x,z-l.z)<2.2&&feet<l.top+.35)||null;}
  toggle(on){this.root.visible=on;}
}

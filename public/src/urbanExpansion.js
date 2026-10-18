import * as THREE from 'three';
import {WORLD_HALF,expandedBuildings,HOMES,PARK_SPOTS,INTERACTABLES,homeStaticColliders,homeFurniture,furnitureCollider} from './worldLayout.js';

const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0.04,...opts});
/** Decorative extension + actual collision-aware interiors and shared interactive apertures. */
export class UrbanExpansion {
  constructor(city){
    this.city=city;this.nodes=new Map();this.pools=[];this.clouds=[];this.windMeshes=[];this.elapsed=0;
    this.brick=mat(0xf4d9a2);this.trunk=mat(0x80604a);this.leaves=[0x4ab96b,0x60c47d,0x338e58,0x98cc66].map(c=>mat(c));
    this.grass=mat(0x69c67a);this.road=mat(0x535969);this.sidewalk=mat(0xd2d7cb);this.wood=mat(0xa97850);this.floor=mat(0xefd9a7);this.windowGlass=mat(0x94d9f0,{roughness:.17,metalness:.09,transparent:true,opacity:.55,side:THREE.DoubleSide});
    this.roofMats=[0xd87350,0xeb965c,0x9b5d45,0x5a7985,0xa54f67].map(c=>mat(c));
    this.build();
  }
  box(x,y,z,w,h,d,material,solid=false,parent=null){
    const mesh=this.city.box(x,y,z,w,h,d,material,true,parent);
    if(solid){const s={x,z,hx:w/2,hz:d/2,minY:y-h/2,maxY:y+h/2};this.city.solids.push(s);}
    return mesh;
  }
  pathGeometry(){
    const city=this.city;const ground=new THREE.Mesh(new THREE.PlaneGeometry(WORLD_HALF*2,WORLD_HALF*2),this.grass);
    ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.receiveShadow=true;city.root.add(ground);
    // Street mesh is reused, no per-tile geometry, and is kept below existing geometry.
    const horizontal=new THREE.BoxGeometry(WORLD_HALF*2-6,.035,7.5);
    const vertical=new THREE.BoxGeometry(7.5,.035,WORLD_HALF*2-6);
    for(let p=-208;p<=176;p+=32){
      for(const [geo,x,z] of [[horizontal,0,p+32],[vertical,p+32,0]]){
        const road=new THREE.Mesh(geo,this.road);road.position.set(x,.014,z);road.receiveShadow=true;road.castShadow=false;city.root.add(road);
      }
    }
  }
  addHome(h,index){
    const city=this.city,root=city.chunkFor(h.x,h.z),last=city.currentParent;city.currentParent=root;
    const main=mat(h.color),trim=mat(0xf6f3dc),frame=mat(0x5b677d),roof=this.roofMats[index%this.roofMats.length];
    const statics=homeStaticColliders(h);
    for(const s of statics){
      const mesh=this.box(s.x,(s.minY+s.maxY)/2,s.z,s.hx*2,s.maxY-s.minY,s.hz*2,s.x===h.x?trim:main);
      city.rayTargets.push(mesh);city.solids.push(s);
    }
    // Floor, roof, colorful trim and external ladders are real traversable surfaces.
    this.box(h.x,.06,h.z,h.w,.12,h.d,this.floor);
    const roofMesh=this.box(h.x,h.h+.17,h.z,h.w+.8,.34,h.d+.8,roof);
    city.rayTargets.push(roofMesh);city.addSurface(h.x,h.z,h.w,h.d,h.h+.34);
    this.box(h.x,h.h+.37,h.z+h.d/2+.1,h.w+.9,.15,.55,trim);
    this.box(h.x,3.6,h.z+h.d/2,h.w,.14,.3,trim,false);
    city.ladders.push({x:h.x+h.w/2+.48,z:h.z,toX:h.x+h.w/2-.8,toZ:h.z,top:h.h+.34,base:0});
    city.buildLadder(city.ladders.at(-1));
    // Interior furnishing with actual collision shared by server.
    for(const f of homeFurniture(h)){
      const m=f.type==='sofa'?mat(0x4a9fad):f.type==='counter'?mat(0xd8b8a0):f.type==='bed'?mat(0x879ad4):this.wood;
      const piece=this.box(f.x,f.h/2,f.z,f.w,f.h,f.d,m);
      city.rayTargets.push(piece);city.solids.push(furnitureCollider(f));
      if(f.type==='table')for(const ox of [-1,1])for(const oz of [-1,1])this.box(f.x+ox*.87,.4,f.z+oz*.40,.14,.8,.14,frame);
    }
    // Interior sconces: emissive surfaces instead of eight shadow-casting lights.
    const glow=mat(0xffdca3,{emissive:0xffc46b,emissiveIntensity:.8});
    const interiorLight=new THREE.PointLight(0xffedc6,1.1,12,2);interiorLight.position.set(h.x,3.7,h.z);interiorLight.castShadow=false;root.add(interiorLight);
    this.box(h.x,3.7,h.z,.62,.16,.62,glow);
    this.box(h.x,3.45,h.z-h.d/2+.3,1.1,.18,.12,glow);
    const entry=INTERACTABLES.filter(t=>t.id.startsWith(h.id+'-'));
    for(const item of entry){
      const isDoor=item.kind==='door';const pivot=new THREE.Group();pivot.position.set(item.x-(isDoor?item.hx:-item.hx),0,item.z);
      root.add(pivot);
      // Door panel rotates from a genuine hinge; windows pivot open as shutters.
      const panel=new THREE.Mesh(new THREE.BoxGeometry(item.hx*2,item.maxY-item.minY,.18),isDoor?this.wood:this.windowGlass);
      panel.position.set(item.hx,(item.minY+item.maxY)/2,0);panel.castShadow=isDoor;panel.receiveShadow=true;pivot.add(panel);
      const collider={x:item.x,z:item.z,hx:item.hx,hz:item.hz,minY:item.minY,maxY:item.maxY,active:true,interactable:item.id};
      city.solids.push(collider);city.rayTargets.push(panel);
      this.nodes.set(item.id,{...item,pivot,panel,collider,open:false,desired:0});
      if(isDoor){this.box(item.x,3.05,item.z,2.35,.14,.32,trim,false);this.box(item.x-.95,1.48,item.z+.18,.13,.13,.16,glow,false);}
      else{
        this.box(item.x,1.0,item.z+0.03,2.53,.15,.45,trim,false);
        this.box(item.x,3.42,item.z+0.03,2.53,.15,.42,trim,false);
      }
    }
    // Front path, garden, benches and balcony color cues.
    this.box(h.x,.035,h.z+h.d/2+3,2.0,.055,5.8,this.sidewalk);
    for(const sx of [-1,1]){
      this.box(h.x+sx*(h.w*.47),.32,h.z+h.d/2+1.8,.32,.62,1.2,this.wood);
      this.box(h.x+sx*(h.w*.47),.72,h.z+h.d/2+1.8,.18,.4,.16,this.leaves[index%4]);
    }
    city.currentParent=last;
  }
  addPark(x,z,i){
    const city=this.city,root=city.chunkFor(x,z),last=city.currentParent;city.currentParent=root;
    const grass=this.box(x,.06,z,23,.12,23,mat(i%2?0x80cf81:0x9bd57a));
    for(const delta of [-7,0,7]){
      this.box(x+delta,.1,z,1.0,.08,21,this.sidewalk);
      this.box(x,.12,z+delta,21,.09,1.0,this.sidewalk);
    }
    if(i===0||i===2){const pond=this.box(x,.17,z,8,.05,6,mat(0x4bb6de,{metalness:.19,roughness:.17,transparent:true,opacity:.85}));this.pools.push(pond);}
    this.box(x+8,.55,z-8,2.5,.14,.8,this.wood);
    this.box(x+8,.80,z-8,.16,.58,.8,this.wood);
    city.currentParent=last;
  }
  addDistrictSigns(){
    const locations=[[-172,-139,'DISTRITO INDUSTRIAL'],[171,138,'CENTRO ALTO'],[-164,137,'VILA DAS FLORES'],[131,-171,'RUA DO HORIZONTE']];
    for(const [x,z,name] of locations){
      const c=document.createElement('canvas');c.width=512;c.height=128;
      const ctx=c.getContext('2d');ctx.fillStyle='#2d6872';ctx.fillRect(0,0,512,128);
      ctx.strokeStyle='#c5f6dc';ctx.lineWidth=7;ctx.strokeRect(7,7,498,114);
      ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f7fff2';ctx.fillText(name,256,62);
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(8.5,2.1),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
      panel.position.set(x,4.8,z);panel.rotation.y=Math.PI*.22;
      const parent=this.city.chunkFor(x,z);parent.add(panel);
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,3.7,7),this.wood);
      post.position.set(x,1.85,z);parent.add(post);
    }
  }
  scenery(){
    const city=this.city;
    // Tiny number of instanced geometries vs hundreds of standalone tree draw calls.
    const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.27,2.6,6),this.trunk,80);
    const tops=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6,0),this.leaves[0],80);
    trunks.castShadow=false;tops.castShadow=false;trunks.receiveShadow=true;
    const dummy=new THREE.Object3D(),treePositions=[];
    for(let i=0;i<80;i++){
      const x=-211+(i*71%423),z=-210+((i*137+43)%421);
      // Keep paths and homes open. Only plant near park spots and the outer green belt.
      if(Math.abs(x)<148&&Math.abs(z)<148)continue;
      if(this.city.solids.some(s=>Math.abs(x-s.x)<s.hx+2&&Math.abs(z-s.z)<s.hz+2))continue;
      if(Math.abs(x%32-16)<4||Math.abs(z%32-16)<4)continue;
      treePositions.push({x,z});
    }
    const n=Math.min(trunks.count,treePositions.length);
    for(let i=0;i<n;i++){
      const {x,z}=treePositions[i];dummy.position.set(x,1.3,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
      dummy.position.y=3.25;dummy.scale.setScalar(.85+i%4*.11);dummy.updateMatrix();tops.setMatrixAt(i,dummy.matrix);
    }
    trunks.count=tops.count=n;trunks.instanceMatrix.needsUpdate=tops.instanceMatrix.needsUpdate=true;
    city.root.add(trunks,tops);this.treeTops=tops;this.treePositions=treePositions;
    // Small drifting clouds: far enough to keep the urban scene readable.
    const cloudMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.54,depthWrite:false,fog:false});
    const cloudGeo=new THREE.SphereGeometry(1,9,5);
    for(let i=0;i<12;i++){
      const cloud=new THREE.Group();
      for(let k=0;k<4;k++){
        const m=new THREE.Mesh(cloudGeo,cloudMat);
        m.position.set((k-1.5)*8,Math.sin(k*2.2)*1.7,Math.cos(k)*2.8);m.scale.set(8,2.2,3.8);cloud.add(m);
      }
      cloud.position.set(-220+(i*57%440),83+i%4*11,-215+(i*83%420));city.root.add(cloud);this.clouds.push(cloud);
    }
  }
  build(){
    this.pathGeometry();
    for(const b of expandedBuildings())this.city.addBuilding(b.x,b.z,b.w,b.d,b.h,b.accent,b.roofAccess);
    HOMES.forEach((h,i)=>this.addHome(h,i));
    PARK_SPOTS.forEach(([x,z],i)=>this.addPark(x,z,i));
    this.scenery();this.addDistrictSigns();
  }
  nearby(x,z,y,maxDistance=2.7){
    let best=null,dist=Infinity;
    for(const node of this.nodes.values()){
      const dx=x-node.x,dz=z-node.z;
      const d=Math.hypot(dx,dz);
      if(d<Math.min(maxDistance,dist)&&y<node.maxY+1.2){best=node;dist=d;}
    }
    return best;
  }
  setState(id,open){
    const node=this.nodes.get(id);if(!node)return false;
    node.open=!!open;
    node.desired=node.open?(node.kind==='door'?Math.PI*.56:Math.PI*.80):0;
    // While the hinge is moving, the panel still blocks until sufficiently open.
    // The visible panel remains in the raycaster, so bullets hit its actual position.
    return true;
  }
  reset(){for(const node of this.nodes.values())this.setState(node.id,false);}
  update(dt){
    this.elapsed+=dt;
    for(const node of this.nodes.values()){
      // Animate only near enough that the player could see the interaction.
      const delta=node.desired-node.pivot.rotation.y;
      if(Math.abs(delta)>.001)node.pivot.rotation.y+=Math.sign(delta)*Math.min(Math.abs(delta),dt*3.5);
      node.collider.active=Math.abs(node.pivot.rotation.y)<1.23;
    }
    for(let i=0;i<this.clouds.length;i++){
      const c=this.clouds[i];c.position.x+=dt*(.62+i%3*.22);if(c.position.x>240)c.position.x=-240;
    }
    for(const p of this.pools)p.material.opacity=.77+.08*Math.sin(this.elapsed*1.6);
    // Wind sway with zero new per-frame geometry allocations; visible near the player.
    if(this.treeTops&&Math.floor(this.elapsed*8)!==Math.floor((this.elapsed-dt)*8)){
      const dummy=new THREE.Object3D();const n=this.treeTops.count;
      for(let i=0;i<n;i++){
        const v=this.treePositions[i];dummy.position.set(v.x+Math.sin(this.elapsed*1.2+i)*.12,3.25,v.z+Math.cos(this.elapsed+i)*.08);
        dummy.scale.setScalar(.85+i%4*.11);dummy.rotation.set(0,0,0);dummy.updateMatrix();this.treeTops.setMatrixAt(i,dummy.matrix);
      }
      this.treeTops.instanceMatrix.needsUpdate=true;
    }
  }
}

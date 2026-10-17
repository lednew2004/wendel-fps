import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {solidBlocksCapsule,standHeight,intersectLanding} from './parkourPhysics.js';

const R=(a,b)=>a+Math.random()*(b-a);
const color=(n)=>new THREE.MeshStandardMaterial({color:n,roughness:.86,metalness:.08});

/** Cidade gerada localmente. Geometria visual e volumes de colisão são separados. */
export class UrbanCity {
  constructor(world){
    this.world=world;
    this.root=new THREE.Group();this.root.visible=false;world.scene.add(this.root);
    this.solids=[];this.surfaces=[];this.ladders=[];this.lowWalls=[];this.courses=[];
    this.rayTargets=[];this.chunks=new Map();this.currentParent=null;this.chunkTick=0;this.routeMarkerGroups=[];this.buildingMaterials=new Map();
    this.materials={
      concrete:world.mat(0xffffff,.1,.93,world.textures.concrete),
      asphalt:world.mat(0xffffff,.2,.94,world.textures.asphalt),
      roof:world.mat(0xffffff,.65,.58,world.textures.roof),
      steel:world.mat(0x4a555d,.78,.48,world.textures.metalBlue),
      brick:color(0x99867c),glass:new THREE.MeshStandardMaterial({color:0x718b9a,metalness:.52,roughness:.24,transparent:true,opacity:.64}),
      edge:color(0x353d45),curb:color(0xaeb0ab),yellow:color(0xd7b478),dark:color(0x2a333b),
      road:color(0x575d60),white:color(0xe5e1d8),green:color(0x646e60)
    };
    this.build();
    this.makeFuelDrums();
    this.spawnPoints=[[-38,18],[38,18],[-38,-18],[38,-18],[-60,6],[60,6],[0,66],[0,-66],[95,12],[-95,-12],[25,-92],[-25,92]];
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
  makeStaircase({x,z,from=0,to=6,length=13,width=2.5,axis='z'}){
    const N=Math.max(8,Math.ceil((to-from)/.35));
    const mat=this.materials.concrete;
    for(let i=0;i<N;i++){
      const t=(i+.5)/N,h=from+(to-from)*((i+1)/N);
      if(axis==='z')this.box(x,h/2,z-length/2+length*t,width,h,length/N+.025,mat);
      else this.box(x-length/2+length*t,h/2,z,length/N+.025,h,width,mat);
    }
    this.surfaces.push({x,z,hx:axis==='z'?width/2:length/2,hz:axis==='z'?length/2:width/2,ramp:true,axis,from,to});
    if(axis==='z'){
      this.box(x-width/2-.13,(to+1)/2,z,.18,to+1,length,this.materials.edge,false);
      this.box(x+width/2+.13,(to+1)/2,z,.18,to+1,length,this.materials.edge,false);
    }
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
    const sky=new THREE.Mesh(new THREE.SphereGeometry(190,20,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){float h=clamp(v.y/190.*.5+.5,0.,1.);gl_FragColor=vec4(mix(vec3(.78,.79,.77),vec3(.48,.62,.72),pow(h,1.65)),1.);}' }));
    this.root.add(sky);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(298,298),this.materials.asphalt);
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.root.add(floor);
    const edgeMat=this.materials.curb;
    for(let x=-120;x<=120;x+=30){
      this.box(x,.085,0,2.0,.17,284,edgeMat,false);
      const stripe=this.box(x,.12,0,.18,.01,280,this.materials.white,false);
    }
    for(let z=-120;z<=120;z+=30){
      this.box(0,.085,z,284,.17,2.0,edgeMat,false);
      this.box(0,.12,z,280,.01,.16,this.materials.white,false);
    }
    // Routes with reachable 3–5m roof gaps and step-ups of at most 1.5m.
    const a=[[-100,-72,5.2],[-86,-72,6.25],[-72,-72,7.32],[-58,-72,8.35]].map(([x,z,h])=>this.addBuilding(x,z,10.2,10.2,h,0x7e8d95));
    const b=[[-27,36,6.4],[-13,36,7.7],[1,36,8.95],[15,36,10.0]].map(([x,z,h])=>this.addBuilding(x,z,10.2,10.2,h,0x978b82));
    const c=[[54,-25,9],[68,-25,10.55],[82,-25,12.05],[96,-25,13.45]].map(([x,z,h])=>this.addBuilding(x,z,10.2,10.2,h,0x81909a));
    this.addFireEscape(a[0]);this.addFireEscape(b[0]);this.addFireEscape(c[0]);
    this.makeCourse('TELHADOS DO DISTRITO',1,a,[-100,-85]);
    this.makeCourse('TRAVESSIA INDUSTRIAL',2,b,[-27,21]);
    this.makeCourse('LINHA DO HORIZONTE',3,c,[54,-40]);
    // Regular blocks, purposely keep authored parkour lanes unobstructed.
    for(let gx=-116;gx<=116;gx+=29){for(let gz=-112;gz<=116;gz+=29){
      if(Math.abs(gz+72)<20 && gx>-116 && gx<-43)continue;
      if(Math.abs(gz-36)<20 && gx>-44 && gx<31)continue;
      if(Math.abs(gz+25)<20 && gx>40 && gx<111)continue;
      if(Math.abs(gx)<15 && gz>78)continue;
      if(Math.abs(gx)<17 && gz>-20&&gz<18)continue;
      const seed=(gx*13+gz*17)|0;
      const h=6+Math.abs(seed%5)*2.0;
      const w=12+(Math.abs(gx+gz)%4),d=12+(Math.abs(gx-gz)%5);
      this.addBuilding(gx,gz,w,d,h,[0x929b9e,0x938c87,0x838e86][Math.abs(seed)%3],Math.abs(seed)%4===0);
    }}
    this.addInterior(0,102,21,18,9);
    // Accessible ramp / stair platform adjacent to the city park.
    this.rayTargets.push(this.box(-8,4.1,0,10,.28,10,this.materials.roof));
    this.addSurface(-8,0,10,10,4.24);
    this.makeStaircase({x:-8,z:-9,from:0,to:4.24,length:13,width:3.2});
    for(const [x,z] of [[-108,-100],[-50,7],[23,-45],[42,72],[109,44]])this.addLowWall(x,z,5.0,.8,1.15);
    // Instanced facade windows, a lot fewer draw calls than per-window meshes.
    const winGeometry=new THREE.PlaneGeometry(1.25,1.65);
    const inst=new THREE.InstancedMesh(winGeometry,this.materials.glass,Math.min(6500,this.solids.length*100));
    const dummy=new THREE.Object3D();let n=0;
    for(const s of this.solids){
      if(s.maxY<5.0||s.minY>0.1||s.hx<4||s.hz<4)continue;
      const floors=Math.floor((s.maxY-.6)/3.2);
      for(let fy=0;fy<floors;fy++){
        const y=fy*3.2+2.2;
        for(const side of [-1,1]){
          for(let k=-s.hx+2.1;k<s.hx-1;k+=3.05){
            dummy.position.set(s.x+k,y,s.z+side*(s.hz+.025));dummy.rotation.set(0,side===1?0:Math.PI,0);dummy.updateMatrix();inst.setMatrixAt(n++,dummy.matrix);
          }
          for(let k=-s.hz+2.1;k<s.hz-1;k+=3.05){
            dummy.position.set(s.x+side*(s.hx+.025),y,s.z+k);dummy.rotation.set(0,side*Math.PI/2,0);dummy.updateMatrix();inst.setMatrixAt(n++,dummy.matrix);
          }
        }
      }
    }
    inst.count=n;inst.instanceMatrix.needsUpdate=true;inst.castShadow=false;this.root.add(inst);
    // Street fixtures instanced
    const postGeo=new THREE.CylinderGeometry(.11,.13,7.5,7),postMat=this.materials.steel;
    const post=new THREE.InstancedMesh(postGeo,postMat,64);let count=0;
    for(let x=-120;x<=120;x+=30)for(let z=-120;z<=120;z+=30){if(count>=64)break;dummy.position.set(x+5,3.75,z+4);dummy.rotation.set(0,0,0);dummy.updateMatrix();post.setMatrixAt(count++,dummy.matrix);}
    post.count=count;this.root.add(post);
    this.loadProps();
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
    if(Math.abs(x)>143-r||Math.abs(z)>143-r||y<-.3)return false;
    for(const s of this.solids)if(solidBlocksCapsule(s,x,z,y,height,r))return false;
    return true;
  }
  floorAt(x,z,feet,step=.46){return standHeight(this.surfaces,x,z,feet,step);}
  landingAt(x,z,oldFeet,newFeet){return intersectLanding(this.surfaces,x,z,oldFeet,newFeet);}
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
  nearestLadder(x,z,feet){return this.ladders.find(l=>Math.hypot(x-l.x,z-l.z)<2.2&&feet<l.top+.35)||null;}
  toggle(on){this.root.visible=on;}
}

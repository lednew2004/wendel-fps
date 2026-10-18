import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {solidBlocksCapsule,standHeight,intersectLanding} from './parkourPhysics.js';
import {UrbanExpansion} from './urbanExpansion.js';
import {WORLD_HALF} from './worldLayout.js';

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
      concrete:world.mat(0x566072,.18,.74,world.textures.concrete),
      asphalt:world.mat(0x2a2f3d,.42,.28,world.textures.asphalt),
      roof:world.mat(0x3b435d,.78,.24,world.textures.roof),
      steel:world.mat(0x52607a,.88,.25,world.textures.metalBlue),
      brick:color(0x6f5368),glass:new THREE.MeshStandardMaterial({color:0x69d7ff,emissive:0x1dc6ff,emissiveIntensity:.38,metalness:.64,roughness:.14,transparent:true,opacity:.68}),
      edge:color(0x212736),curb:color(0x555d70),yellow:color(0xffba5b),dark:color(0x121827),
      road:color(0x262c38),white:color(0x57ecff),green:color(0x37e6a0)
    };
    this.neonPalette=[0x4df6ff,0xff4db8,0xcc63ff,0xffb347,0x8fff61];
    this.neonMaterials=new Map();
    this.build();
    this.expansion=new UrbanExpansion(this);
    this.makeFuelDrums();
    this.spawnPoints=[[-38,18],[38,18],[-38,-18],[38,-18],[-60,6],[60,6],[0,66],[0,-66],[95,12],[-95,-12],[25,-92],[-25,92],[-176,144],[176,-144],[144,176],[-144,-176],[0,183]];
  }
  box(x,y,z,w,h,d,mat,shadow=true,parent=null){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;(parent||this.currentParent||this.root).add(m);return m;
  }
  neonMat(hex,intensity=1.25,opacity=1){
    const key=hex+'-'+intensity+'-'+opacity;
    if(!this.neonMaterials.has(key))this.neonMaterials.set(key,new THREE.MeshStandardMaterial({color:hex,emissive:hex,emissiveIntensity:intensity,metalness:.22,roughness:.28,transparent:opacity<1,opacity}));
    return this.neonMaterials.get(key);
  }
  makeSignTexture(title,color,bg='#08111d'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
    const ctx=canvas.getContext('2d');
    const glow=ctx.createLinearGradient(0,0,512,192);
    glow.addColorStop(0,bg);glow.addColorStop(1,'#13071d');
    ctx.fillStyle=glow;ctx.fillRect(0,0,512,192);
    ctx.strokeStyle=color;ctx.lineWidth=6;ctx.strokeRect(10,10,492,172);
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(18,18,476,30);
    ctx.font='900 72px Barlow Condensed, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
    ctx.shadowColor=color;ctx.shadowBlur=26;ctx.fillText(title,256,96,468);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  addNeonFacade(x,z,w,d,h){
    const parent=this.currentParent||this.root;
    const accent=this.neonPalette[Math.abs(Math.floor((x+z+h)*3))%this.neonPalette.length];
    const line=this.neonMat(accent,1.55,.96);
    this.box(x,h+.22,z+d/2+.07,w*.84,.06,.08,line,false,parent);
    this.box(x,h+.22,z-d/2-.07,w*.84,.06,.08,line,false,parent);
    this.box(x+w/2+.07,h*.55,z,.08,h*.78,.06,line,false,parent);
    if(((Math.abs(x)+Math.abs(z))|0)%3===0){
      const label=['NOVA','BYTE','SYN','ARAS','ZENITH','HEX'][Math.abs((x*7+z*11)|0)%6];
      const tex=this.makeSignTexture(label,'#'+accent.toString(16).padStart(6,'0'));
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6,w*.52),1.7),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
      sign.position.set(x+w/2+.12,Math.max(3,h*.55),z);sign.rotation.y=-Math.PI/2;parent.add(sign);
      const glow=new THREE.PointLight(accent,.55,18,2);glow.position.set(x+w/2-1.6,Math.max(3,h*.58),z);parent.add(glow);
    }
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
    this.addNeonFacade(x,z,w,d,h);
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
    const sky=new THREE.Mesh(new THREE.SphereGeometry(380,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){float h=clamp(v.y/380.*.5+.5,0.,1.);vec3 top=vec3(.02,.03,.09);vec3 mid=vec3(.10,.04,.17);vec3 base=vec3(.01,.01,.03);vec3 col=mix(base,mid,smoothstep(.0,.55,h));col=mix(col,top,smoothstep(.48,1.,h));gl_FragColor=vec4(col,1.);}' }));
    this.root.add(sky);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(298,298),this.materials.asphalt);
    floor.material.envMapIntensity=1.12;
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.root.add(floor);
    const edgeMat=this.materials.curb;
    for(let x=-120;x<=120;x+=30){
      this.box(x,.085,0,2.0,.17,284,edgeMat,false);
      const stripe=this.box(x,.12,0,.18,.01,280,this.materials.white,false);
    }
    for(let z=-120;z<=120;z+=30){
      this.box(0,.085,z,284,.17,2.0,edgeMat,false);
      this.box(0,.12,z,280,.01,.16,this.neonMat(0xff4db8,1.05,.88),false);
    }
    // Routes with reachable 3–5m roof gaps and step-ups of at most 1.5m.
    const a=[[-100,-72,5.2],[-86,-72,6.25],[-72,-72,7.32],[-58,-72,8.35]].map(([x,z,h])=>this.addBuilding(x,z,10.2,10.2,h,0xb0c5e2));
    const b=[[-27,36,6.4],[-13,36,7.7],[1,36,8.95],[15,36,10.0]].map(([x,z,h])=>this.addBuilding(x,z,10.2,10.2,h,0xe8b87e));
    const c=[[54,-25,9],[68,-25,10.55],[82,-25,12.05],[96,-25,13.45]].map(([x,z,h])=>this.addBuilding(x,z,10.2,10.2,h,0x8fc8ac));
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
      this.addBuilding(gx,gz,w,d,h,[0xedaa86,0x8cbfd3,0xd4b28a,0x91caa8,0xc8a4d2,0xe4b692][Math.abs(seed)%6],Math.abs(seed)%4===0);
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
    this.materials.glass.emissiveIntensity=.62;
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
    for(const [lx,lz,c] of [[-90,-90,0x4df6ff],[90,-90,0xff4db8],[-90,90,0xcc63ff],[90,90,0x8fff61],[0,120,0xffb347],[120,0,0x4df6ff]]){const pole=this.box(lx,4.5,lz,.18,9,.18,this.materials.steel,false);const orb=new THREE.Mesh(new THREE.SphereGeometry(.48,12,10),this.neonMat(c,1.9));orb.position.set(lx,8.8,lz);this.root.add(orb);const light=new THREE.PointLight(c,.9,26,2);light.position.copy(orb.position);this.root.add(light);}
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
    if(Math.abs(x)>WORLD_HALF-r||Math.abs(z)>WORLD_HALF-r||y<-.3)return false;
    for(const s of this.solids)if(s.active!==false&&solidBlocksCapsule(s,x,z,y,height,r))return false;
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
  nearestInteractable(x,z,y,maxDistance=2.7){return this.expansion?.nearby(x,z,y,maxDistance)||null;}
  toggleInteractable(id,open){return this.expansion?.setState(id,open)||false;}
  resetInteractions(){this.expansion?.reset();}
  animateEnvironment(dt){this.expansion?.update(dt);}
  nearestLadder(x,z,feet){return this.ladders.find(l=>Math.hypot(x-l.x,z-l.z)<2.2&&feet<l.top+.35)||null;}
  toggle(on){this.root.visible=on;}
}

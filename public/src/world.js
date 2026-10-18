import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {MAP_HALF,rand} from './constants.js';
import {MaterialLibrary} from './materials.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';

function makeCanvas(size, painter){
  const c=document.createElement('canvas');
  c.width=c.height=size;
  const ctx=c.getContext('2d');
  painter(ctx,size);
  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.anisotropy=8;
  return tex;
}

function makeAsphaltTexture(){
  return makeCanvas(256,(ctx,s)=>{
    ctx.fillStyle='#5f6468'; ctx.fillRect(0,0,s,s);
    for(let i=0;i<2400;i++){
      const g=80+Math.random()*70|0;
      ctx.fillStyle=`rgba(${g},${g},${g},${.18+Math.random()*.18})`;
      const x=Math.random()*s,y=Math.random()*s,r=Math.random()*2.2+.3;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    for(let i=0;i<55;i++){
      ctx.strokeStyle=`rgba(35,35,35,${.12+Math.random()*.14})`;
      ctx.lineWidth=Math.random()*2+1;
      ctx.beginPath();
      ctx.moveTo(Math.random()*s,Math.random()*s);
      ctx.lineTo(Math.random()*s,Math.random()*s);
      ctx.stroke();
    }
  });
}

function makeConcreteTexture(){
  return makeCanvas(256,(ctx,s)=>{
    ctx.fillStyle='#8f969b'; ctx.fillRect(0,0,s,s);
    for(let i=0;i<1900;i++){
      const g=125+Math.random()*50|0;
      ctx.fillStyle=`rgba(${g},${g},${g},${.08+Math.random()*.12})`;
      ctx.fillRect(Math.random()*s,Math.random()*s,Math.random()*4+1,Math.random()*4+1);
    }
    for(let i=0;i<32;i++){
      ctx.strokeStyle=`rgba(255,255,255,${.04+Math.random()*.04})`;
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(Math.random()*s,Math.random()*s);
      ctx.lineTo(Math.random()*s,Math.random()*s);
      ctx.stroke();
    }
  });
}

function makeMetalTexture(base='#66717a', accent='#88939a'){
  return makeCanvas(256,(ctx,s)=>{
    ctx.fillStyle=base; ctx.fillRect(0,0,s,s);
    for(let y=0;y<s;y+=16){
      ctx.fillStyle=`rgba(255,255,255,${y%32===0?.06:.03})`;
      ctx.fillRect(0,y,s,1);
    }
    for(let i=0;i<900;i++){
      ctx.fillStyle=`rgba(0,0,0,${.03+Math.random()*.05})`;
      ctx.fillRect(Math.random()*s,Math.random()*s,Math.random()*6+1,Math.random()*2+1);
    }
    ctx.strokeStyle=accent; ctx.lineWidth=3;
    for(let i=0;i<6;i++){
      const x=22+i*42;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,s); ctx.stroke();
    }
  });
}

function makeRoofTexture(){
  return makeCanvas(256,(ctx,s)=>{
    ctx.fillStyle='#585f65';ctx.fillRect(0,0,s,s);
    for(let x=0;x<s;x+=18){
      ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(x,0,2,s);
      ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(x+8,0,2,s);
    }
  });
}

export class World {
  constructor(mount){
    this.mount=mount;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x83baf1);
    this.scene.fog=new THREE.FogExp2(0xa4d4ed,.0026);
    this.camera=new THREE.PerspectiveCamera(78,1,.07,440);
    this.cameraRig=new THREE.Group();
    this.cameraPitch=new THREE.Group();
    this.scene.add(this.cameraRig);
    this.cameraRig.add(this.cameraPitch);
    this.cameraPitch.add(this.camera);

    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.13;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);

    this.solids=[];
    this.blockers=[];
    this.barrels=[];
    this.decals=[];
    this.animated=[];
    this.time=0;
    this.quality='high';

    // PBR assets generated offline: base color + OpenGL normal + roughness.
    this.materialLibrary=new MaterialLibrary(this.renderer);
    this.textures={
      asphalt:this.materialLibrary.load('asphalt',18,18),
      concrete:this.materialLibrary.load('concrete',10,10),
      soil:this.materialLibrary.load('soil',8,8),
      metalBlue:this.materialLibrary.load('metal_blue',1,1),
      metalGreen:this.materialLibrary.load('metal_green',1,1),
      metalBrown:this.materialLibrary.load('metal_brown',1,1),
      roof:this.materialLibrary.load('roof',8,2),
      wood:this.materialLibrary.load('wood',1,1)
    };
    // PMREM provides roughness-dependent reflections to metal; not real-time SSR.
    this.pmrem=new THREE.PMREMGenerator(this.renderer);
    const envTarget=this.pmrem.fromScene(new RoomEnvironment());
    this.scene.environment=envTarget.texture;
    this.scene.environmentIntensity=.31;
    this.envTarget=envTarget;
    this.baseFOV=78;
    this.renderScale=1;
    this.customFar=260;
    this.vegetation=null;

    const hemi=new THREE.HemisphereLight(0xfff3dd,0x66a279,1.26);
    this.scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xffe9c3,2.32);
    sun.position.set(-48,58,30);
    sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-110;
    sun.shadow.camera.right=110;
    sun.shadow.camera.top=110;
    sun.shadow.camera.bottom=-110;
    sun.shadow.camera.near=.1;
    sun.shadow.camera.far=240;
    sun.shadow.bias=-0.00012;
    sun.shadow.normalBias=.022;
    this.scene.add(sun);
    this.moon=sun;

    // Urban Combat initializes only one playable environment. The historical
    // industrial arena code remains available for a future optional map,
    // but building/loading it here wastes CPU/GPU memory and draw calls.
    this.baseEnvironmentNodes=[];
    this.urbanActive=false;
    this.spawnPoints=[];
    this.makePost();
    this.setQuality('medium');
    this.resize();
    this.onResize=()=>this.resize();
    window.addEventListener('resize',this.onResize);
  }

  mat(color, metalness=.4, roughness=.7, map=null, emissive=0){
    return this.materialLibrary.physical(color,metalness,roughness,map,emissive);
  }

  box(w,h,d,x,y,z,mat,solid=false,cast=true){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);
    m.castShadow=cast;
    m.receiveShadow=true;
    this.scene.add(m);
    if(solid){this.solids.push({x,z,hx:w/2,hz:d/2});this.blockers.push(m);}
    return m;
  }

  addSolid(x,z,hx,hz,mesh){ this.solids.push({x,z,hx,hz}); this.blockers.push(mesh); }

  label(text,x,y,z,width=8,height=1.9,rotation=0){
    const c=document.createElement('canvas'); c.width=1024; c.height=256;
    const a=c.getContext('2d');
    a.fillStyle='rgba(46,52,57,.92)'; a.fillRect(0,0,1024,256);
    a.strokeStyle='#ddd5c5'; a.lineWidth=8; a.strokeRect(12,12,1000,232);
    a.fillStyle='#f6efe2'; a.textAlign='center'; a.font='800 96px Arial'; a.fillText(text,512,154);
    const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
    m.position.set(x,y,z); m.rotation.y=rotation; this.scene.add(m); return m;
  }

  makeSky(){
    const sky=new Sky();
    sky.scale.setScalar(310);
    const u=sky.material.uniforms;
    u.turbidity.value=7.5;
    u.rayleigh.value=1.9;
    u.mieCoefficient.value=.005;
    u.mieDirectionalG.value=.78;
    u.sunPosition.value.set(-48,58,30).normalize();
    this.scene.add(sky);
    this.sky=sky;
  }

  warehouse(x,z,w,d,h,door='front'){
    const wallMat=this.mat(0xe5e5e5,.12,.88,this.textures.concrete);
    const frameMat=this.mat(0xb0b6b9,.72,.46,this.textures.metalBlue);
    const roofMat=this.mat(0xffffff,.68,.48,this.textures.roof);
    const group=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat); body.position.y=h/2; body.castShadow=true; body.receiveShadow=true; group.add(body);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(w+1.2,.45,d+1.2),roofMat); roof.position.y=h+.25; roof.castShadow=true; roof.receiveShadow=true; group.add(roof);
    const ridge=new THREE.Mesh(new THREE.BoxGeometry(w*.94,.2,.55),frameMat); ridge.position.y=h+.48; group.add(ridge);
    for(let i=-1;i<=1;i++){
      const vent=new THREE.Mesh(new THREE.BoxGeometry(1.8,.45,.9),frameMat);
      vent.position.set(i*(w*0.26),h+.62,0); group.add(vent);
    }
    for(let side of [-1,1]){
      for(let i=-1;i<=1;i++){
        const win=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.15),new THREE.MeshBasicMaterial({color:0xcad7df,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
        win.position.set(i*(w*0.22),h*.68,side*(d/2+.02)); group.add(win);
      }
    }
    if(door==='front'||door==='back'){
      const sign = door==='front'?1:-1;
      const roller=new THREE.Mesh(new THREE.BoxGeometry(w*.28,h*.66,.25),frameMat);
      roller.position.set(0,h*.33,sign*(d/2+.13)); group.add(roller);
      const lintel=new THREE.Mesh(new THREE.BoxGeometry(w*.34,.35,.45),frameMat);
      lintel.position.set(0,h*.7,sign*(d/2+.14)); group.add(lintel);
    }
    group.position.set(x,0,z); this.scene.add(group);
    this.addSolid(x,z,w/2,d/2,group);
    return group;
  }

  addContainer(x,z,len=7.5,h=2.6,color='blue',rot=0,stack=1){
    const map=color==='green'?this.textures.metalGreen:color==='brown'?this.textures.metalBrown:this.textures.metalBlue;
    const mat=this.mat(0xffffff,.82,.46,map);
    const edgeMat=this.mat(0x272b2f,.72,.44);
    for(let i=0;i<stack;i++){
      const y=h/2+i*h;
      const group=new THREE.Group();
      const body=new THREE.Mesh(new THREE.BoxGeometry(len,h,2.9),mat); body.castShadow=true; body.receiveShadow=true; group.add(body);
      for(const sx of [-1,1]) for(const sz of [-1,1]){
        const edge=new THREE.Mesh(new THREE.BoxGeometry(.12,h+.05,.12),edgeMat);
        edge.position.set(sx*(len/2-.08),0,sz*(2.9/2-.08)); group.add(edge);
      }
      for(let p=-2;p<=2;p++){
        const rib=new THREE.Mesh(new THREE.BoxGeometry(.09,h-.12,2.74),edgeMat);
        rib.position.set(p*(len/5),0,0); group.add(rib);
      }
      group.position.set(x,y,z);
      group.rotation.y=rot;
      this.scene.add(group);
      if(i===0){const quarter=Math.abs(Math.sin(rot))>.707; this.solids.push({x,z,hx:quarter?1.45:len/2,hz:quarter?len/2:1.45});}
      this.blockers.push(group);
    }
  }

  addCrateStack(x,z,count=3){
    const wood=this.mat(0x8b6f53,.18,.86);
    for(let i=0;i<count;i++){
      const w=1.35+Math.random()*.35,d=1.2+Math.random()*.35,h=1.1+Math.random()*.25;
      const oy=i*(h*0.95);
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wood);
      mesh.position.set(x+(Math.random()-.5)*.45,oy+h/2,z+(Math.random()-.5)*.45);
      mesh.castShadow=true; mesh.receiveShadow=true; this.scene.add(mesh);
    }
    this.solids.push({x,z,hx:1.4,hz:1.2});
    // Stack meshes already exist in the scene; avoid invalid non-Object3D blockers.
  }

  makeEnvironment(){
    this.makeSky();

    const asphaltMat=this.mat(0xffffff,.24,.94,this.textures.asphalt);
    const concreteMat=this.mat(0xffffff,.16,.9,this.textures.concrete);
    const steelDark=this.mat(0x3a4046,.82,.44,this.textures.metalBlue);
    const steelGreen=this.mat(0xffffff,.8,.46,this.textures.metalGreen);
    const steelBrown=this.mat(0xffffff,.8,.46,this.textures.metalBrown);
    const barrierMat=this.mat(0x9ba2a8,.14,.88,this.textures.concrete);
    const paintedMat=new THREE.MeshBasicMaterial({color:0xded4b7,transparent:true,opacity:.78,depthWrite:false});

    const yard=new THREE.Mesh(new THREE.PlaneGeometry(156,156),asphaltMat);
    yard.rotation.x=-Math.PI/2; yard.receiveShadow=true; this.scene.add(yard);

    const centerStrip=new THREE.Mesh(new THREE.PlaneGeometry(18,156),concreteMat);
    centerStrip.rotation.x=-Math.PI/2; centerStrip.position.y=.005; centerStrip.receiveShadow=true; this.scene.add(centerStrip);

    const outer=new THREE.Mesh(new THREE.PlaneGeometry(176,176),this.mat(0xa9a59c,.08,.98,this.textures.soil));
    outer.rotation.x=-Math.PI/2; outer.position.y=-.06; this.scene.add(outer);

    const helipadRing=new THREE.Mesh(new THREE.RingGeometry(9.2,9.85,72),paintedMat);
    helipadRing.rotation.x=-Math.PI/2; helipadRing.position.set(0,.03,18); this.scene.add(helipadRing);
    const h1=new THREE.Mesh(new THREE.PlaneGeometry(1.3,11),paintedMat); h1.rotation.x=-Math.PI/2; h1.position.set(0,.03,18); this.scene.add(h1);
    const h2=new THREE.Mesh(new THREE.PlaneGeometry(10.8,1.3),paintedMat); h2.rotation.x=-Math.PI/2; h2.position.set(0,.03,18); this.scene.add(h2);

    for(let z=-66; z<=66; z+=11){
      const line=new THREE.Mesh(new THREE.PlaneGeometry(6.4,.28),paintedMat);
      line.rotation.x=-Math.PI/2; line.position.set(0,.03,z); this.scene.add(line);
    }

    // fences
    const fenceMat=this.mat(0x4c565d,.82,.45,this.textures.metalBlue);
    for(let x=-74;x<=74;x+=6){
      for(const z of [-76,76]){
        const post=this.box(.22,4.2,.22,x,2.1,z,fenceMat,false,false);
        const lampTop=this.box(.16,.16,.16,x,4.5,z,fenceMat,false,false);
      }
    }
    for(let z=-74;z<=74;z+=6){
      for(const x of [-76,76]) this.box(.22,4.2,.22,x,2.1,z,fenceMat,false,false);
    }
    this.box(152,.15,.15,0,3.4,-76,fenceMat,true,false);
    this.box(152,.15,.15,0,2.2,-76,fenceMat,true,false);
    this.box(152,.15,.15,0,3.4,76,fenceMat,true,false);
    this.box(152,.15,.15,0,2.2,76,fenceMat,true,false);
    this.box(.15,.15,152,-76,3.4,0,fenceMat,true,false);
    this.box(.15,.15,152,-76,2.2,0,fenceMat,true,false);
    this.box(.15,.15,152,76,3.4,0,fenceMat,true,false);
    this.box(.15,.15,152,76,2.2,0,fenceMat,true,false);

    // perimeter buildings / scenery
    for(let i=0;i<34;i++){
      const side=i%4;
      const x=side===0?-96:side===1?96:rand(-92,92);
      const z=side===2?-96:side===3?96:rand(-92,92);
      const w=rand(6,13), d=rand(6,13), h=rand(8,28);
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(0x7d8489,.28,.88,this.textures.concrete));
      mesh.position.set(x,h/2-1,z); mesh.receiveShadow=true; this.scene.add(mesh);
    }

    // warehouses / map landmarks
    this.warehouse(0,-54,40,18,11,'front');
    this.warehouse(-52,2,22,36,10,'front');
    this.warehouse(52,2,22,36,10,'front');
    this.warehouse(0,58,48,17,9,'back');

    // command bunker and side annexes
    this.box(18,6,16,0,3,-3,steelDark,true);
    this.box(20,.45,18,0,6.25,-3,this.mat(0xffffff,.82,.46,this.textures.roof),false,false);
    this.box(7.6,2.4,.9,0,2.2,5.7,this.mat(0x292f34,.6,.55),false,false);
    for(const s of [-1,1]){
      this.box(.28,2.4,.28,s*8.2,6.8,4.5,steelDark,false,false);
      const spot=new THREE.SpotLight(0xfff0d8,12,34,Math.PI/6,.55,1);
      spot.position.set(s*8.2,7.1,4.8); spot.target.position.set(s*4,0,22); this.scene.add(spot,spot.target);
    }

    // container zones and cover
    const specs=[
      [-24,-18,7.5,2.6,'blue',Math.PI/2,1],[-24,18,7.5,2.6,'green',Math.PI/2,2],[24,-18,7.5,2.6,'brown',Math.PI/2,1],[24,18,7.5,2.6,'blue',Math.PI/2,2],
      [-50,28,8.5,2.6,'brown',0,1],[50,-28,8.5,2.6,'blue',0,1],[-8,38,7.5,2.6,'green',0,1],[8,-38,7.5,2.6,'brown',0,1],
      [0,28,8.5,2.6,'green',0,1],[0,-28,8.5,2.6,'brown',0,1],[-58,-16,8.5,2.6,'blue',0,2],[58,16,8.5,2.6,'green',0,2]
    ];
    for(const c of specs) this.addContainer(...c);

    // concrete barriers
    for(const [x,z,w,d] of [[-35,-30,11,2],[-35,30,11,2],[35,-30,11,2],[35,30,11,2],[-18,0,3,10],[18,0,3,10],[0,-12,12,2],[0,12,12,2],[-58,0,2.2,12],[58,0,2.2,12]]){
      this.box(w,2.15,d,x,1.08,z,barrierMat,true);
      this.box(w,.15,d+.14,x,2.15,z,this.mat(0x737b82,.16,.76),false,false);
    }

    // stacked pallets / crates small detail
    for(const [x,z] of [[-43,18],[-39,22],[39,-22],[43,-18],[-11,52],[11,-52],[61,28],[-61,-28]]){
      const pallet=this.box(2.2,.22,1.4,x,.11,z,this.mat(0xffffff,.22,.92,this.textures.wood),false,false);
      this.box(1.7,1.05,1.05,x,.75,z,this.mat(0xd8b99c,.2,.86,this.textures.wood),true);
    }

    // watch towers and floodlights
    const towerMat=this.mat(0x555e66,.82,.45,this.textures.metalBlue);
    for(const [x,z] of [[-62,-62],[62,-62],[-62,62],[62,62]]){
      this.box(2.8,.45,2.8,x,9.45,z,towerMat,true,false);
      for(let y=0;y<9;y+=3){
        this.box(.3,3,.3,x-1.05,y+1.5,z-1.05,towerMat,false,false);
        this.box(.3,3,.3,x+1.05,y+1.5,z-1.05,towerMat,false,false);
        this.box(.3,3,.3,x-1.05,y+1.5,z+1.05,towerMat,false,false);
        this.box(.3,3,.3,x+1.05,y+1.5,z+1.05,towerMat,false,false);
      }
      const floodBar=this.box(1.7,.22,.8,x,10.2,z,towerMat,false,false);
      const light=new THREE.SpotLight(0xfff2df,14,60,Math.PI/7,.55,1);
      light.position.set(x,10.3,z);
      light.target.position.set(x*.35,0,z*.35);
      this.scene.add(light,light.target);
    }

    for(const [x,z] of [[-44,-8],[44,8],[-8,44],[8,-44]]){
      this.box(.55,9.8,.55,x,4.9,z,towerMat,false,false);
      this.box(1.45,.25,.8,x,9.75,z,towerMat,false,false);
      const flood=new THREE.PointLight(0xfff1da,8,28,2); flood.position.set(x,10,z); this.scene.add(flood);
    }

    // signs
    this.label('FORWARD OPERATING BASE',0,7.5,-72.2,23,2.3,0);
    this.label('LOGISTICS YARD',0,6.8,72.2,16,1.8,Math.PI);
    this.label('EAST CHECKPOINT',72.2,7.1,0,13,1.8,-Math.PI/2);
    this.label('WEST CHECKPOINT',-72.2,7.1,0,13,1.8,Math.PI/2);

    // dust particles
    const dustGeom=new THREE.BufferGeometry();
    const positions=new Float32Array(340*3);
    for(let i=0;i<340;i++){
      positions[i*3]=rand(-78,78); positions[i*3+1]=rand(1.2,18); positions[i*3+2]=rand(-78,78);
    }
    dustGeom.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const dust=new THREE.Points(dustGeom,new THREE.PointsMaterial({color:0xd9d3c4,size:.16,transparent:true,opacity:.20,depthWrite:false}));
    this.scene.add(dust);
    this.animated.push({update:t=>{dust.rotation.y=t*.002; dust.position.x=Math.sin(t*.00033)*2.2;}});

    this.makeVegetation();
    this.makeBarrels();
    this.spawnPoints=[[66,66],[-66,-66],[-66,66],[66,-66],[65,0],[-65,0],[0,65],[0,-65],[54,28],[-54,-28],[27,58],[-27,-58],[58,-27],[-58,27]];
  }

  makeBarrels(){
    const steel=this.mat(0x50585f,.8,.38);
    const fuel=this.mat(0xa75139,.28,.42,null,0x40170d);
    const positions=[[-33,-10],[-31,11],[31,-11],[33,10],[-5,-37],[5,37],[-60,17],[60,-17],[-16,-58],[16,58],[-49,-6],[49,6]];
    for(const [x,z] of positions){
      if(!this.canMove(x,z,.9))continue;
      const group=new THREE.Group(); group.position.set(x,0,z);
      const drum=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,1.35,12),steel); drum.position.y=.72; drum.castShadow=true; group.add(drum);
      for(const y of [.27,1.16]){ const band=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.17,12),fuel); band.position.y=y; group.add(band); }
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.73,.73,.13,12),steel); cap.position.y=1.43; group.add(cap);
      this.scene.add(group);
      const collider={x,z,hx:.7,hz:.7};
      this.solids.push(collider); this.blockers.push(group);
      this.barrels.push({mesh:group,collider,health:55,x,z,alive:true});
    }
  }

  resetBarrels(){
    for(const b of this.barrels){
      if(!b.alive){
        b.alive=true;(b.home||this.scene).add(b.mesh);
        const colliders=b.home&&this.city?this.city.solids:this.solids;
        if(!colliders.includes(b.collider))colliders.push(b.collider);
        if(!b.home&&!this.blockers.includes(b.mesh))this.blockers.push(b.mesh);
      }
      b.health=55;
    }
  }
  findBarrelHit(origin,dir,range){
    const meshes=this.barrels.filter(b=>b.alive).map(b=>b.mesh);
    if(!meshes.length)return null;
    const hits=new THREE.Raycaster(origin,dir,.01,range).intersectObjects(meshes,true);
    if(!hits.length)return null;
    let item=hits[0].object;
    while(item.parent && !meshes.includes(item)) item=item.parent;
    return {barrel:this.barrels.find(b=>b.mesh===item),point:hits[0].point,distance:hits[0].distance};
  }

  damageBarrel(b,damage){
    if(!b||!b.alive)return false;
    b.health-=damage;
    if(b.health>0)return false;
    b.alive=false;
    b.mesh.parent?.remove(b.mesh);
    const colliders=b.home&&this.city?this.city.solids:this.solids;
    const index=colliders.indexOf(b.collider);if(index>=0)colliders.splice(index,1);
    const blocker=this.blockers.indexOf(b.mesh);if(blocker>=0)this.blockers.splice(blocker,1);
    return true;
  }

  loadSceneryModels(){
    // Local, self-authored GLB props. Failure is nonfatal.
    const loader=new GLTFLoader();
    const instances=[
      ['utility_truck',[-37,0,47],Math.PI*.08,1],
      ['utility_truck',[38,0,-48],Math.PI,1],
      ['forklift',[-17,0,49],Math.PI*.2,1],
      ['forklift',[19,0,-48],-Math.PI*.25,1]
    ];
    const models=new Map();
    for(const name of new Set(instances.map(i=>i[0]))){
      const url=globalThis.TITAN_EMBEDDED_ASSETS?.[`models/${name}.glb`]||`./assets/models/${name}.glb`;
      loader.load(url, gltf=>{
        models.set(name,gltf.scene);
        for(const [kind,pos,rotation,scale] of instances){
          if(kind!==name)continue;
          const o=gltf.scene.clone(true);
          o.position.set(...pos);o.rotation.y=rotation;o.scale.setScalar(scale);
          o.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;}});
          this.scene.add(o);
          this.baseEnvironmentNodes.push(o);o.visible=!this.urbanActive;
          // Keep lightweight non-rotated navigation footprints separate from detailed raycast.
          const hx=name==='utility_truck'?1.55:1.1;
          const hz=name==='utility_truck'?3.4:1.6;
          const swap=Math.abs(Math.sin(rotation))>.707;
          this.solids.push({x:pos[0],z:pos[2],hx:swap?hz:hx,hz:swap?hx:hz});
          this.blockers.push(o);
        }
      },undefined,err=>console.warn('Modelo GLB indisponível:',name,err));
    }
  }

  makeVegetation(){
    // Instanced sparse weeds at perimeter; no costly animated individual meshes.
    const geometry=new THREE.ConeGeometry(.085,.9,3);
    geometry.translate(0,.45,0);
    const material=new THREE.MeshStandardMaterial({color:0x797e59,roughness:.96,metalness:0,side:THREE.DoubleSide});
    const count=680;
    const grass=new THREE.InstancedMesh(geometry,material,count);
    const helper=new THREE.Object3D();
    for(let i=0;i<count;i++){
      const side=i%4;let x,z;
      if(side===0){x=rand(-70,-62);z=rand(-70,70);}
      else if(side===1){x=rand(62,70);z=rand(-70,70);}
      else if(side===2){x=rand(-70,70);z=rand(-70,-62);}
      else {x=rand(-70,70);z=rand(62,70);}
      helper.position.set(x,0,z);
      helper.rotation.set(rand(-.13,.13),rand(0,Math.PI*2),rand(-.18,.18));
      helper.scale.setScalar(rand(.35,1.35));
      helper.updateMatrix();grass.setMatrixAt(i,helper.matrix);
    }
    grass.instanceMatrix.needsUpdate=true;
    grass.frustumCulled=false;
    grass.castShadow=false;grass.receiveShadow=true;
    this.scene.add(grass);
    this.vegetation=grass;
  }

  makePost(){
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.ssao=new SSAOPass(this.scene,this.camera,window.innerWidth,window.innerHeight,16);
    this.ssao.kernelRadius=8;
    this.ssao.minDistance=.001;
    this.ssao.maxDistance=.06;
    this.ssao.enabled=false;
    this.composer.addPass(this.ssao);
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.1,.3,.92);
    this.composer.addPass(this.bloom);
    this.smaa=new SMAAPass();
    this.composer.addPass(this.smaa);
    this.composer.addPass(new OutputPass());
  }

  setQuality(q){
    const profiles={
      low:{ratio:.65,shadow:0,far:150,vegetation:.15,ao:false,smaa:false,bloom:false,env:.14},
      medium:{ratio:.85,shadow:1024,far:190,vegetation:.5,ao:false,smaa:false,bloom:false,env:.23},
      high:{ratio:1,shadow:2048,far:250,vegetation:.85,ao:false,smaa:true,bloom:false,env:.32},
      ultra:{ratio:1.1,shadow:3072,far:290,vegetation:1,ao:true,smaa:true,bloom:true,env:.45},
      cinematic:{ratio:1.2,shadow:4096,far:320,vegetation:1,ao:true,smaa:true,bloom:true,env:.5}
    };
    const p=profiles[q]||profiles.high;
    this.quality=q;
    this.profile=p;
    this.renderer.shadowMap.enabled=p.shadow>0;
    this.moon.castShadow=p.shadow>0;
    if(p.shadow){this.moon.shadow.mapSize.set(p.shadow,p.shadow);this.moon.shadow.dispose();this.moon.shadow.camera.updateProjectionMatrix();}
    this.renderer.shadowMap.needsUpdate=true;
    this.bloom.enabled=p.bloom;
    this.ssao.enabled=p.ao;
    this.smaa.enabled=p.smaa;
    this.scene.environmentIntensity=p.env;
    this.customFar=p.far;
    this.camera.far=p.far;
    this.camera.updateProjectionMatrix();
    if(this.vegetation)this.vegetation.count=Math.floor(this.vegetation.instanceMatrix.count*p.vegetation);
    this.resize();
  }

  setRenderScale(scale){this.renderScale=Math.min(1.35,Math.max(.5,Number(scale)||1));this.resize();}
  setFOV(v){this.baseFOV=Math.min(105,Math.max(65,Number(v)||78));this.camera.fov=this.baseFOV;this.camera.updateProjectionMatrix();}
  setDrawDistance(v){this.customFar=Math.max(140,Math.min(320,Number(v)||250));this.camera.far=this.customFar;this.camera.updateProjectionMatrix();}
  setAO(on){this.ssao.enabled=!!on && this.quality!=='low';}
  setAntialias(on){this.smaa.enabled=!!on && this.quality!=='low';}
  setBloom(on){this.bloom.enabled=!!on && this.quality!=='low';}
  setReflections(on){this.scene.environmentIntensity=on?(this.profile?.env||.3):0;}
  setShadowLevel(level){
    const n=Math.max(0,Math.min(4096,Number(level)||0));
    this.moon.castShadow=n>0;this.renderer.shadowMap.enabled=n>0;
    if(n>0){this.moon.shadow.mapSize.set(n,n);this.moon.shadow.dispose();}
    this.renderer.shadowMap.needsUpdate=true;
  }
  setVegetation(value){if(this.vegetation)this.vegetation.count=Math.floor(this.vegetation.instanceMatrix.count*Math.max(0,Math.min(1,Number(value))));}
  setTextureQuality(value){
    const max=this.renderer.capabilities.getMaxAnisotropy();
    for(const t of this.materialLibrary.textures){t.anisotropy=Math.min(max,Math.max(1,Number(value)||1));t.needsUpdate=true;}
  }
  resize(){
    const w=window.innerWidth,h=window.innerHeight;
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    const ratio=Math.min(devicePixelRatio||1,1.7)*(this.profile?.ratio||1)*this.renderScale;
    const px=Math.min(2.2,Math.max(.45,ratio));
    this.renderer.setPixelRatio(px);this.renderer.setSize(w,h);
    if(this.composer){this.composer.setPixelRatio(px);this.composer.setSize(w,h);}
  }
  setFPSCamera(x,y,z,yaw,pitch){
    this.cameraRig.position.set(x,0,z);
    this.cameraRig.rotation.set(0,yaw,0);
    this.cameraPitch.position.set(0,y,0);
    this.cameraPitch.rotation.set(pitch,0,0);
    this.camera.position.set(0,0,0);
    this.camera.rotation.set(0,0,0);
    this.camera.updateWorldMatrix(true,false);
  }

  setMenuCamera(time){
    this.cameraRig.position.set(0,0,0);
    this.cameraRig.rotation.set(0,0,0);
    this.cameraPitch.position.set(0,0,0);
    this.cameraPitch.rotation.set(0,0,0);
    this.camera.position.set(Math.sin(time)*44,20,Math.cos(time)*44);
    this.camera.lookAt(0,6,4);
  }

  setUrbanMode(enabled){
    this.urbanActive=!!enabled;
    const span=enabled?75:110;
    this.moon.shadow.camera.left=-span;this.moon.shadow.camera.right=span;
    this.moon.shadow.camera.top=span;this.moon.shadow.camera.bottom=-span;
    this.moon.shadow.camera.updateProjectionMatrix();
    for(const node of this.baseEnvironmentNodes)node.visible=!enabled;
    if(!enabled){this.scene.background.setHex(0xc0c9cf);this.scene.fog.color.setHex(0xb7c0c7);}
    else{this.scene.background.setHex(0x87c3f2);this.scene.fog.color.setHex(0xb3d8f0);}
  }
  canMove(x,z,r=.5){
    if(this.urbanActive && this.city) return this.city.canOccupy(x,z,0,1.65,r);
    if(x<-MAP_HALF+r||x>MAP_HALF-r||z<-MAP_HALF+r||z>MAP_HALF-r)return false;
    for(const s of this.solids){
      const dx=Math.max(Math.abs(x-s.x)-s.hx,0), dz=Math.max(Math.abs(z-s.z)-s.hz,0);
      if(dx*dx+dz*dz<r*r) return false;
    }
    return true;
  }

  raycastSurface(origin,dir,maxDist=160){
    const targets=this.urbanActive&&this.city?this.city.rayTargets:this.blockers;
    const hits=new THREE.Raycaster(origin,dir,.01,maxDist).intersectObjects(targets,true);
    return hits[0]||null;
  }
  raycastDistance(origin,dir,maxDist=160){
    return this.raycastSurface(origin,dir,maxDist)?.distance??maxDist;
  }
  addImpact(hit){
    if(!hit?.face||!hit?.object)return;
    if(!this.decalMaterial){
      const size=64,c=document.createElement('canvas');c.width=c.height=size;
      const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,1,32,32,27);
      g.addColorStop(0,'rgba(20,18,16,.84)');g.addColorStop(.27,'rgba(22,20,18,.72)');
      g.addColorStop(.70,'rgba(34,29,24,.27)');g.addColorStop(1,'rgba(35,30,24,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,size,size);
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      this.decalMaterial=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide});
      this.decalGeometry=new THREE.PlaneGeometry(.31,.31);
    }
    const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const mark=new THREE.Mesh(this.decalGeometry,this.decalMaterial);
    mark.position.copy(hit.point).addScaledVector(normal,.018);
    mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    mark.rotateZ(Math.random()*Math.PI*2);
    mark.scale.setScalar(.55+Math.random()*.75);
    this.scene.add(mark);this.decals.push(mark);
    if(this.decals.length>90)this.scene.remove(this.decals.shift());
  }

  update(dt){
    this.time+=dt;
    if(!this.urbanActive)for(const a of this.animated) a.update(this.time);
  }

  render(){
    // No post passes active: render directly, avoiding expensive intermediate targets.
    if(!this.ssao.enabled&&!this.bloom.enabled&&!this.smaa.enabled) this.renderer.render(this.scene,this.camera);
    else this.composer.render();
  }
}

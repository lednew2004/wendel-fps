import * as THREE from 'three';

/** Original 3D geometry for three visually distinct arena champions. No external assets. */
export function createChampionModel(champion){
  const root=new THREE.Group();root.userData.championModel=true;root.userData.parts=[];
  const shell=new THREE.MeshStandardMaterial({color:champion.id==='arachnex'?0x141018:champion.id==='colossus'?0x14191c:0x111a24,metalness:champion.id==='colossus'?.48:.82,roughness:.28});
  const panels=new THREE.MeshStandardMaterial({color:champion.color,metalness:.78,roughness:.21,emissive:champion.color,emissiveIntensity:.08});
  const steel=new THREE.MeshStandardMaterial({color:0x060a11,metalness:.94,roughness:.18});
  const glow=new THREE.MeshBasicMaterial({color:champion.color,toneMapped:false});
  const add=(parent,geom,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(parent,mat,x,y,z,w,h,d)=>add(parent,new THREE.BoxGeometry(1,1,1),mat,x,y,z,w,h,d);
  const ball=(parent,mat,x,y,z,a,b,c)=>add(parent,new THREE.SphereGeometry(1,12,9),mat,x,y,z,a,b,c);
  const link=(parent,mat,a,b,width)=>{const d=new THREE.Vector3().subVectors(b,a),mesh=add(parent,new THREE.CylinderGeometry(width*.8,width,d.length(),7),mat,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());return mesh;};
  if(champion.id==='arachnex'){
    ball(root,shell,0,2.25,.55,1.65,.87,1.95);ball(root,panels,0,2.55,.4,1.35,.44,1.44);
    ball(root,shell,0,1.95,-1.25,1.12,.72,.95);
    for(const x of [-.75,-.25,.25,.75])ball(root,glow,x,2.05,-2.05,.13,.16,.15);
    for(let side of [-1,1])for(let i=0;i<4;i++){
      const z=-1.3+i*.93,pivot=new THREE.Group();pivot.position.set(side*1.1,2.2,z);root.add(pivot);
      const spread=1.25+i*.16,a=new THREE.Vector3(0,0,0),b=new THREE.Vector3(side*spread,1.00,i<2?-.60:.35),c=new THREE.Vector3(side*(spread+1.5),-1.9,i<2?-1.0:1.0);
      link(pivot,steel,a,b,.18);link(pivot,shell,b,c,.12);ball(pivot,panels,b.x,b.y,b.z,.18,.19,.18);
      root.userData.parts.push({mesh:pivot,side,index:i,kind:'leg'});
    }
    for(let i=0;i<5;i++)box(root,steel,-.85+i*.42,2.95,.68,.12,.28,.58);
  } else {
    const giant=champion.id==='colossus',height=giant?5.7:5.1;
    box(root,shell,0,height*.62,0,giant?2.35:1.65,giant?2.45:2.05,giant?1.32:1.03);
    box(root,panels,0,height*.67,-.62,giant?1.9:1.35,.84,.19);
    const head=ball(root,shell,0,height*.89,0,.63,.66,.55);
    box(root,glow,0,height*.90,-.53,giant?.9:1.05,.19,.1);
    ball(root,glow,0,height*.64,-.77,.31,.33,.11);
    for(const side of [-1,1]){
      const shoulder=new THREE.Group();shoulder.position.set(side*(giant?1.62:1.17),height*.77,0);root.add(shoulder);
      ball(shoulder,panels,0,0,0,giant?.66:.50,giant?.65:.48,.58);
      box(shoulder,shell,side*.13,-.89,0,giant?.86:.64,1.85,.78);
      ball(shoulder,shell,side*.13,-1.82,-.16,giant?.62:.43,giant?.64:.38,giant?.62:.40);
      root.userData.parts.push({mesh:shoulder,side,kind:'arm'});
      const leg=new THREE.Group();leg.position.set(side*(giant?.73:.57),height*.44,0);root.add(leg);
      box(leg,shell,0,-.76,0,giant?.87:.70,1.66,.89);
      box(leg,steel,0,-1.65,-.27,giant?.94:.75,.35,1.20);
      root.userData.parts.push({mesh:leg,side,kind:'leg'});
    }
    if(!giant){
      for(const side of [-1,1]){
        box(root,steel,side*.84,height*.64,.37,.18,1.6,.23);
        box(root,panels,side*1.6,height*.54,-.15,.22,.7,.65);
      }
      box(root,panels,0,height*.48,-.62,1.3,.15,.17);
    }else{
      for(let i=-2;i<=2;i++)ball(root,shell,i*.37,height*.82,.48,.24,.32,.35);
      ball(root,panels,0,height*.9,.32,.49,.2,.3);
    }
    head.rotation.z=giant?.05:0;
  }
  root.userData.glow=glow;root.userData.baseGlowColor=champion.color;return root;
}
export function animateChampionModel(root,time,movement=0,phase=0){
  if(!root?.userData?.championModel)return;
  const motion=Math.min(1,Math.max(0,movement)),tick=time*(phase>0?10:6);
  for(const part of root.userData.parts){
    if(part.kind==='leg'){
      part.mesh.rotation.z=Math.sin(tick+part.index*1.6+(part.side<0?Math.PI:0))*.24*motion;
      part.mesh.rotation.y=Math.cos(tick+part.index*1.5)*.10*motion;
    }else{
      part.mesh.rotation.x=Math.sin(tick+(part.side<0?Math.PI:0))*(part.kind==='arm'?.20:.13)*motion;
    }
  }
  if(root.userData.glow)root.userData.glow.color.setHex(root.userData.baseGlowColor).offsetHSL(0,0,Math.sin(time*5)*.045);
}
export function disposeChampionModel(root){
  if(!root)return;const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}

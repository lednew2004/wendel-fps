import * as THREE from 'three';
import {MOBA_BASES,MOBA_LANES,JUNGLE_CAMPS} from './mobaLayout.js';
/** Three lightweight lanes, two spawn sanctuaries, jungle camps and towers. Geometry is visual only. */
export function createMobaWorld(city){
 const root=city.root;
 const mat=(color,em=0)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:em,roughness:.84,metalness:.1});
 const laneColors={top:0x6094db,mid:0xd7b56e,adc:0x70d2a1};
 const pad=mat(0x3a4844),edge=mat(0xadb39b),jungle=mat(0x355d46),stone=mat(0x787b76),blue=mat(0x55b7ff,.4),red=mat(0xff7584,.4),tower=mat(0x626c70);
 const geom=new THREE.CylinderGeometry(1,1,1,8);
 for(const [lane,pts] of Object.entries(MOBA_LANES)){
  const trim=mat(laneColors[lane],.42);
  for(let i=1;i<pts.length;i++){
   const [ax,az]=pts[i-1],[bx,bz]=pts[i],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
   const plate=new THREE.Mesh(new THREE.BoxGeometry(17,.095,length+2),pad);plate.position.set((ax+bx)/2,.065,(az+bz)/2);plate.rotation.y=angle;plate.receiveShadow=true;root.add(plate);
   for(const side of [-1,1]){
    const border=new THREE.Mesh(new THREE.BoxGeometry(.29,.10,length),trim);
    const offset=new THREE.Vector3(side*8.2,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
    border.position.set((ax+bx)/2+offset.x,.15,(az+bz)/2+offset.z);border.rotation.y=angle;root.add(border);
   }
   const arrows=Math.floor(length/24);
   for(let k=0;k<arrows;k++){
    const t=(k+.5)/(arrows||1),arrow=new THREE.Mesh(new THREE.ConeGeometry(.85,2,3),trim);
    arrow.rotation.set(-Math.PI/2,0,angle);arrow.position.set(ax+dx*t,.24,az+dz*t);root.add(arrow);
   }
  }
 }
 for(const [side,p] of Object.entries(MOBA_BASES)){
  const accent=side==='blue'?blue:red;
  const base=new THREE.Group();base.position.set(p.x,0,p.z);root.add(base);
  const ring=new THREE.Mesh(new THREE.RingGeometry(9,13,48),accent);ring.rotation.x=-Math.PI/2;ring.position.y=.17;base.add(ring);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(8.4,8.4,.4,24),stone);platform.position.y=.07;base.add(platform);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(2.8),accent);core.position.y=6;base.add(core);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.19,.5,5,10),accent);beam.position.y=3.1;base.add(beam);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;const col=new THREE.Mesh(new THREE.CylinderGeometry(.65,1,6,8),tower);col.position.set(Math.cos(a)*7,3,Math.sin(a)*7);base.add(col);}
  const glow=new THREE.PointLight(side==='blue'?0x55b7ff:0xff7584,1.6,33);glow.position.y=7;base.add(glow);
  const label=makeText(side==='blue'?'BASE ALIADA':'BASE ADVERSÁRIA',side==='blue'?'#9ce9ff':'#ffb3bb');label.position.set(0,11,0);base.add(label);
  city.mobaBases??={};city.mobaBases[side]=base;
 }
 for(const camp of JUNGLE_CAMPS){
  const g=new THREE.Group();g.position.set(camp.x,0,camp.z);root.add(g);
  const disc=new THREE.Mesh(new THREE.RingGeometry(4.3,5.5,24),jungle);disc.rotation.x=-Math.PI/2;disc.position.y=.2;g.add(disc);
  const relic=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2,0),camp.level===3?red:blue);relic.position.y=2.9;g.add(relic);
  for(let k=0;k<4;k++){const a=k*Math.PI/2,rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2,0),stone);rock.scale.set(1,.7,1);rock.position.set(Math.cos(a)*5.8,.65,Math.sin(a)*5.8);g.add(rock);}
  const text=makeText(`JUNGLE · NV ${camp.level}`,'#c6f6cb');text.position.y=5.2;g.add(text);
 }
 function makeText(value,color){const canvas=document.createElement('canvas');canvas.width=420;canvas.height=76;const ctx=canvas.getContext('2d');ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.fillStyle='#0a1524aa';ctx.fillRect(0,0,420,76);ctx.fillStyle=color;ctx.fillText(value,210,50);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.scale.set(10,1.82,1);return s;}
 return {lanes:MOBA_LANES,camps:JUNGLE_CAMPS,bases:MOBA_BASES};
}

import * as THREE from 'three';
/** Shared, glowing voxel ammo supplies. Actual online collection is server-authoritative. */
export class MapSupplies {
 constructor(game){
  this.game=game;this.crates=new Map();
  this.geometry=new THREE.BoxGeometry(.88,.52,.75);
  this.material=new THREE.MeshStandardMaterial({color:0xffc458,metalness:.27,roughness:.41,emissive:0x8e490e,emissiveIntensity:.83});
  this.frameGeometry=new THREE.EdgesGeometry(this.geometry);
  this.frameMaterial=new THREE.LineBasicMaterial({color:0xffe99a,transparent:true,opacity:.75});
  this.ringGeometry=new THREE.TorusGeometry(.69,.045,6,28);
  this.ringMaterial=new THREE.MeshBasicMaterial({color:0xffd979,transparent:true,opacity:.65,depthWrite:false});
 }
 spawn(data){
  if(!data||this.crates.has(data.id))return;
  const mesh=new THREE.Group();
  mesh.add(new THREE.Mesh(this.geometry,this.material));
  mesh.add(new THREE.LineSegments(this.frameGeometry,this.frameMaterial));
  const ring=new THREE.Mesh(this.ringGeometry,this.ringMaterial);ring.rotation.x=Math.PI/2;ring.position.y=-.32;mesh.add(ring);
  mesh.position.set(data.x,.8,data.z);this.game.world.scene.add(mesh);
  this.crates.set(data.id,{...data,mesh,phase:Math.random()*Math.PI*2});
 }
 remove(id){const c=this.crates.get(id);if(!c)return;this.game.world.scene.remove(c.mesh);this.crates.delete(id);}
 clear(){for(const id of [...this.crates.keys()])this.remove(id);}
 update(dt){for(const item of this.crates.values()){item.phase+=dt*1.8;item.mesh.position.y=.8+Math.sin(item.phase)*.13;item.mesh.rotation.y+=dt*.5;}}
}

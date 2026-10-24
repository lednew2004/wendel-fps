import * as THREE from 'three';
import {SQUAD_DOORS} from './squadLayout.js';

/** Interactables share coordinates/collision shape with server/interactables.json.
 * No hidden walls: open doors disable only their own AABB.
 */
export class UrbanDoors{
  constructor(city){
    this.city=city;this.items=new Map();
    const panel=new THREE.MeshStandardMaterial({color:0xc57e55,metalness:.14,roughness:.64});
    const steel=new THREE.MeshStandardMaterial({color:0x334e5c,metalness:.67,roughness:.36});
    for(const d of SQUAD_DOORS){
      const pivot=new THREE.Group();pivot.position.set(d.x-d.hx,d.maxY/2,d.z);
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(d.hx*2,d.maxY,d.hz*2),panel);
      mesh.position.x=d.hx;mesh.castShadow=true;mesh.receiveShadow=true;pivot.add(mesh);
      const handle=new THREE.Mesh(new THREE.BoxGeometry(.13,.20,.19),steel);
      handle.position.set(d.hx*1.72,-.17,d.hz+.10);pivot.add(handle);
      city.root.add(pivot);city.rayTargets.push(mesh);
      const collider={...d,active:true};city.solids.push(collider);
      this.items.set(d.id,{...d,pivot,collider,open:false,target:0});
    }
  }
  nearby(x,z,y,maxDistance=2.7){
    let selected=null,best=maxDistance;
    for(const it of this.items.values()){
      const distance=Math.hypot(it.x-x,it.z-z);
      if(distance<best&&y<it.maxY+.8){selected=it;best=distance;}
    }
    return selected;
  }
  setState(id,open){
    const it=this.items.get(id);if(!it)return false;
    it.open=Boolean(open);it.collider.active=!it.open;
    it.target=it.open?-Math.PI*.53:0;
    return true;
  }
  reset(){for(const it of this.items.values())this.setState(it.id,false);}
  update(dt){
    for(const it of this.items.values()){
      const t=Math.min(1,Math.max(0,dt)*10);
      it.pivot.rotation.y+=(it.target-it.pivot.rotation.y)*t;
    }
  }
}

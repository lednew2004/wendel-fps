import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export class OperatorPreview{
  constructor(parent){
    this.parent=parent;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(31,1,.1,100);this.camera.position.set(0,1.6,5.5);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0,0);parent.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xc2ddff,0x242236,2));const key=new THREE.DirectionalLight(0xbad7ff,3.5);key.position.set(-2,4,5);this.scene.add(key);const rim=new THREE.DirectionalLight(0x8b66ff,4);rim.position.set(3,3,-3);this.scene.add(rim);
    this.loader=new GLTFLoader();this.model=null;this.selected=null;this.seq=0;this.running=true;this.visible=false;this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);this.resize();this.loop();
  }
  resize(){const r=this.parent.getBoundingClientRect();const w=Math.max(60,r.width),h=Math.max(60,r.height);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  setVisible(v){this.visible=v;this.parent.classList.toggle('preview-idle',!v);if(v)this.resize();}
  show(id){if(this.selected===id)return;this.selected=id;const token=++this.seq;this.loader.load(`/assets/models/operatives/${encodeURIComponent(id)}.glb`,g=>{
    if(token!==this.seq)return;if(this.model)this.scene.remove(this.model);const obj=g.scene;const b=new THREE.Box3().setFromObject(obj),sz=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
    const height=Math.max(sz.y,.1),scale=3.6/height;obj.scale.setScalar(scale);obj.position.set(-center.x*scale,-b.min.y*scale-2.05,-center.z*scale);this.model=obj;this.scene.add(obj);this.camera.position.set(0,.25,7.3);this.camera.lookAt(0,.05,0);
  },undefined,()=>{/* Existing initials remain as accessible fallback. */});}
  loop(){if(!this.running)return;requestAnimationFrame(()=>this.loop());if(!this.visible||document.hidden)return;if(this.model)this.model.rotation.y=Math.sin(performance.now()*.00036)*.28+.14;this.renderer.render(this.scene,this.camera);}
}

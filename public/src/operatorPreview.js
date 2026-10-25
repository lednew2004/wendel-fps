import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** Optional preview: one WebGL context, <=16 FPS, <=440px internal resolution. */
export class OperatorPreview{
  constructor(parent){
    this.parent=parent;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(31,1,.1,100);this.camera.position.set(0,1.6,5.5);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0,0);
    this.renderer.domElement.classList.add('entry-preview-canvas');parent.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xc2ddff,0x242236,1.8));
    const key=new THREE.DirectionalLight(0xbad7ff,2.8);key.position.set(-2,4,5);this.scene.add(key);
    this.loader=new GLTFLoader();this.model=null;this.selected=null;this.seq=0;this.visible=false;
    this.models=new Map();this.pending=new Map();this.frameHandle=0;this.frameTimer=0;
    this.onResize=()=>{if(this.visible)this.resize();};
    this.onVisibility=()=>{if(document.hidden)this.stopLoop();else if(this.visible)this.beginLoop();};
    window.addEventListener('resize',this.onResize);
    document.addEventListener('visibilitychange',this.onVisibility);
  }
  resize(){
    const r=this.parent.getBoundingClientRect();
    const scale=Math.min(1,440/Math.max(r.width||1,r.height||1));
    const w=Math.max(60,Math.round(r.width*scale)),h=Math.max(60,Math.round(r.height*scale));
    if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  setVisible(v){
    this.visible=Boolean(v);this.parent.classList.toggle('preview-idle',!v);
    if(this.visible){this.resize();this.beginLoop();}else{clearTimeout(this.loadDelay);this.stopLoop();}
  }
  beginLoop(){if(!this.visible||document.hidden||this.frameHandle)return;this.frameHandle=requestAnimationFrame(t=>this.draw(t));}
  stopLoop(){
    if(this.frameHandle)cancelAnimationFrame(this.frameHandle);
    if(this.frameTimer)clearTimeout(this.frameTimer);
    this.frameHandle=0;this.frameTimer=0;
  }
  draw(t){
    this.frameHandle=0;
    if(!this.visible||document.hidden)return;
    if(this.model)this.model.rotation.y=Math.sin(t*.00036)*.28+.14;
    this.renderer.render(this.scene,this.camera);
    // Truly throttle the callback too, not just the WebGL draw calls.
    this.frameTimer=setTimeout(()=>{this.frameTimer=0;this.beginLoop();},62);
  }
  show(id){
    if(this.selected===id){
      if(this.models.has(id))this.useModel(this.models.get(id));
      return;
    }
    this.selected=id;const token=++this.seq;
    if(this.models.has(id)){this.useModel(this.models.get(id));return;}
    // Coalesce fast clicks so scrolling through operators doesn't flood decoding or network.
    clearTimeout(this.loadDelay);
    this.loadDelay=setTimeout(()=>{
      if(this.pending.has(id))return;
      const request=new Promise((resolve,reject)=>this.loader.load(`/assets/models/operatives/${encodeURIComponent(id)}.glb`,g=>resolve(g.scene),undefined,reject));
      this.pending.set(id,request);
      request.then(model=>{
        this.models.set(id,model);
        if(token===this.seq&&this.visible)this.useModel(model);
      }).catch(error=>console.warn('Modelo do operador indisponível:',id,error))
        .finally(()=>this.pending.delete(id));
    },110);
  }
  useModel(obj){
    if(this.model===obj)return;
    if(this.model)this.scene.remove(this.model);
    const b=new THREE.Box3().setFromObject(obj),sz=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
    const height=Math.max(sz.y,.1),scale=3.6/height;
    obj.scale.setScalar(scale);obj.position.set(-center.x*scale,-b.min.y*scale-2.05,-center.z*scale);
    this.model=obj;this.scene.add(obj);this.camera.position.set(0,.25,7.3);this.camera.lookAt(0,.05,0);
  }
}

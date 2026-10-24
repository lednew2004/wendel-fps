import * as THREE from 'three';

/** Author-generated, locally bundled PBR triplets. Falls back to flat color if an image fails. */
export class MaterialLibrary {
  constructor(renderer){
    this.renderer=renderer;
    this.loader=new THREE.TextureLoader();
    this.pairs=new Map();
    this.textures=[];
    this.failed=0;
  }
  path(name,kind){
    const filename=`${name}_${kind}.webp`;
    return globalThis.TITAN_EMBEDDED_ASSETS?.[`pbr/${filename}`] || `./assets/pbr/${filename}`;
  }
  load(name,repeatX=1,repeatY=1){
    const textures={};
    for(const kind of ['albedo','normal','roughness']){
      const tex=this.loader.load(this.path(name,kind),undefined,undefined,err=>{this.failed++;console.warn('Material',name,kind,err);});
      tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
      tex.repeat.set(repeatX,repeatY);
      tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      tex.generateMipmaps=true;
      tex.minFilter=THREE.LinearMipmapLinearFilter;
      tex.magFilter=THREE.LinearFilter;
      if(kind==='albedo')tex.colorSpace=THREE.SRGBColorSpace;
      this.textures.push(tex);
      textures[kind]=tex;
    }
    this.pairs.set(textures.albedo.uuid,textures);
    return textures.albedo;
  }
  physical(color,metalness,roughness,diffuse,emissive=0){
    const maps=this.pairs.get(diffuse?.uuid);
    return new THREE.MeshStandardMaterial({
      color,metalness,roughness,
      map:diffuse||null,
      normalMap:maps?.normal||null,
      normalScale:new THREE.Vector2(.62,.62),
      roughnessMap:maps?.roughness||null,
      emissive, emissiveIntensity:emissive ? 0.25 : 0
    });
  }
}

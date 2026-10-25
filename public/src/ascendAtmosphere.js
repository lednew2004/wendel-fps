import * as THREE from 'three';

/** ASCEND visual language for Titan FPS: one cheap sky shader, zero external assets. */
export function createAscendSky(){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(108,32,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
    uniforms:{zenith:{value:new THREE.Color(0x244763)},horizon:{value:new THREE.Color(0xa9c9dc)},sun:{value:new THREE.Vector3(-.4,.53,-.75).normalize()}},
    vertexShader:`varying vec3 vDir; void main(){vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vDir;uniform vec3 zenith;uniform vec3 horizon;uniform vec3 sun;void main(){vec3 d=normalize(vDir);float h=smoothstep(-.08,.70,d.y);vec3 col=mix(horizon,zenith,h);float halo=pow(max(dot(d,sun),0.),22.);float glow=pow(max(dot(d,sun),0.),460.);col+=vec3(.35,.20,.08)*halo+vec3(.26,.20,.12)*glow;gl_FragColor=vec4(col,1.);}`
  }));
  mesh.name='ASCEND_CAMERA_RELATIVE_SKY';mesh.frustumCulled=false;mesh.renderOrder=-100;
  return mesh;
}

/** Física cinemática de parkour em passos fixos. Sem dependência de Three.js. */
export const PARKOUR_TUNING=Object.freeze({
  fixedStep:1/90,gravity:23.5,jumpSpeed:11.5,walkSpeed:7.9,sprintSpeed:13.1,
  accelGround:34,accelAir:11,frictionGround:9.5,frictionAir:.7,
  coyote:.15,jumpBuffer:.18,characterRadius:.42,characterHeight:1.77,
  stairStep:.48,wallRunTime:.78,wallRunGravity:5.6,ledgeReach:1.72,
  ladderSpeed:5.4,slideTime:.70,slideSpeed:15.1
});
export const approach=(v,target,maxDelta)=>v<target?Math.min(v+maxDelta,target):Math.max(v-maxDelta,target);
export const sphereIntersectsXZ=(x,z,r,s)=>Math.max(Math.abs(x-s.x)-s.hx,0)**2+Math.max(Math.abs(z-s.z)-s.hz,0)**2<r*r;
export function solidBlocksCapsule(s,x,z,feet,height,r){
  return sphereIntersectsXZ(x,z,r,s) && feet<s.maxY-.09 && feet+height>s.minY+.1;
}
/** Returns highest standable surface no higher than feet+step. */
export function standHeight(surfaces,x,z,feet,step=.45){
  let best=0;
  for(const s of surfaces){
    if(s.active===false||x<s.x-s.hx||x>s.x+s.hx||z<s.z-s.hz||z>s.z+s.hz)continue;
    const fraction=Math.max(0,Math.min(1,(s.axis==='x'?(x-(s.x-s.hx))/(2*s.hx):(z-(s.z-s.hz))/(2*s.hz))));
    const h=s.ramp?s.from+(s.to-s.from)*(s.reverse?1-fraction:fraction):s.y;
    if(h>best && h<=feet+step)best=h;
  }
  return best;
}
export function intersectLanding(surfaces,x,z,oldFeet,nextFeet){
  let best=nextFeet<=0 && oldFeet>=-.1?0:-Infinity;
  for(const s of surfaces){
    if(s.active===false||x<s.x-s.hx||x>s.x+s.hx||z<s.z-s.hz||z>s.z+s.hz)continue;
    const fraction=Math.max(0,Math.min(1,(s.axis==='x'?(x-(s.x-s.hx))/(2*s.hx):(z-(s.z-s.hz))/(2*s.hz))));
    const h=s.ramp?s.from+(s.to-s.from)*(s.reverse?1-fraction:fraction):s.y;
    if(oldFeet>=h-.08 && nextFeet<=h && h>best)best=h;
  }
  return best;
}
export function jumpDistance(v=13.1,j=10.9,g=23.5){return 2*v*j/g;}

/** Static collision volumes are also real platforms. This prevents walking through
 * a crate, barrel or obstacle after jumping over its top. Door panels excluded. */
export function walkableVolumes(surfaces,solids){
  return [...surfaces,...solids.filter(s=>s.active!==false && s.kind!=='door' && s.kind!=='window' && !s.interactable && Number.isFinite(s.maxY) && Number.isFinite(s.hx) && Number.isFinite(s.hz) && s.hx>.13 && s.hz>.13).map(s=>({x:s.x,z:s.z,hx:s.hx,hz:s.hz,y:s.maxY}))];
}

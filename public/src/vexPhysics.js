/** TITAN 4.8.7: math-only, deterministic Vex movement helpers. Units: meters/seconds. */
export const VEX_TUNING=Object.freeze({
 grappleRange:42,grappleCharges:3,grappleRecharge:8.5,grappleMaxSpeed:34,
 ropeGravity:25,ropeSpring:76,ropeDamping:8.8,ropeReel:12.0,ropeAutoReel:8.2,ropePull:20,
 climbDuration:5.3,climbSpeed:7.3,climbSideSpeed:4.4,
 bladeRange:28,bladeSpeed:38,bladeDuration:.78,bladeCooldown:40,bladeDamage:85
});
export const clampVex=(n,min,max)=>Math.max(min,Math.min(max,n));
/** Ray vs finite AABB. Returns the first actual wall/roof face, never its center. */
export function rayBox(origin,dir,s,maxDist=42){
 const min=[s.x-s.hx,s.minY,s.z-s.hz],max=[s.x+s.hx,s.maxY,s.z+s.hz],o=[origin.x,origin.y,origin.z],d=[dir.x,dir.y,dir.z];
 let near=-Infinity,far=Infinity,normal={x:0,y:0,z:0};
 for(let a=0;a<3;a++){
  if(Math.abs(d[a])<1e-9){if(o[a]<min[a]||o[a]>max[a])return null;continue;}
  const t1=(min[a]-o[a])/d[a],t2=(max[a]-o[a])/d[a],enter=Math.min(t1,t2),exit=Math.max(t1,t2);
  if(enter>near){near=enter;normal={x:0,y:0,z:0};normal[['x','y','z'][a]]=t1<t2?-1:1;}
  far=Math.min(far,exit);if(far<near)return null;
 }
 if(near<.15||near>maxDist)return null;
 return {x:o[0]+d[0]*near,y:o[1]+d[1]*near,z:o[2]+d[2]*near,normal,distance:near,solid:s};
}
export function findGrappleAnchor(origin,dir,solids,range=42){
 let result=null;
 for(const s of solids){if(s.active===false||!Number.isFinite(s.maxY)||s.maxY-s.minY<1.4)continue;
  const hit=rayBox(origin,dir,s,range);if(hit&&(!result||hit.distance<result.distance))result=hit;
 }
 return result;
}
/** Radial rope spring, tangential steering and velocity preserved across re-hooking. */
export function ropeVelocity(feet,velocity,anchor,length,dt,steer={x:0,z:0}){
 const dx=anchor.x-feet.x,dy=anchor.y-(feet.y+1.05),dz=anchor.z-feet.z;
 const dist=Math.hypot(dx,dy,dz)||.001,nx=dx/dist,ny=dy/dist,nz=dz/dist;
 const outward=-(velocity.x*nx+velocity.y*ny+velocity.z*nz);
 const extension=Math.max(0,dist-length);
 const force=clampVex(extension*VEX_TUNING.ropeSpring+Math.max(0,outward)*VEX_TUNING.ropeDamping,0,175);
 const tangent=(steer.x*nx+steer.z*nz);
 const x=velocity.x+(nx*force+(steer.x-nx*tangent)*7.2)*dt;
 const y=velocity.y+ny*force*dt;
 const z=velocity.z+(nz*force+(steer.z-nz*tangent)*7.2)*dt;
 const speed=Math.hypot(x,y,z),scale=speed>VEX_TUNING.grappleMaxSpeed?VEX_TUNING.grappleMaxSpeed/speed:1;
 return {x:x*scale,y:y*scale,z:z*scale,dist,tension:extension};
}
export function lineOfSight(from,to,solids,ignore=null){
 const d={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},length=Math.hypot(d.x,d.y,d.z);
 if(length<.01)return true;const dir={x:d.x/length,y:d.y/length,z:d.z/length};
 return !solids.some(s=>s!==ignore&&s.active!==false&&rayBox(from,dir,s,length-.45));
}
/** Aim cone checks 3D point alignment: target cannot lock through a building. */
export function targetScore(origin,direction,target,maxRange=28){
 const x=target.x-origin.x,y=target.y-origin.y,z=target.z-origin.z;
 const distance=Math.hypot(x,y,z);if(distance>.01&&distance<=maxRange){
  const dot=(x*direction.x+y*direction.y+z*direction.z)/distance;
  if(dot>.92)return {distance,dot,score:(1-dot)*16+distance*.009};
 }
 return null;
}

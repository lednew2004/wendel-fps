/** FPS bot combat tuning and continuous projectile collision, independent of Three.js. */
export const BOT_LIMIT = 12;
export const PROJECTILE_LIMIT = 100;
export const SPAWN_RADIUS = Object.freeze({min:18,max:52});
export const FIRE_MULTIPLIER = Object.freeze({scout:.76,gunner:.39,sniper:.56,hunter:.73,tank:.72,boss:.91});
export function fireInterval(type,base){return Math.max(.42,base*(FIRE_MULTIPLIER[type]??.67));}
export function spawnInterval(wave=1){return Math.max(.12,.28-Math.min(7,wave)*.012);}
/** Earliest point along a moving bullet where it intersects a physical target. */
export function segmentSphereHit(from,to,center,radius){
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
 const mx=from.x-center.x,my=from.y-center.y,mz=from.z-center.z;
 const a=dx*dx+dy*dy+dz*dz,b=2*(mx*dx+my*dy+mz*dz),c=mx*mx+my*my+mz*mz-radius*radius;
 if(c<=0)return 0;
 if(a<=1e-8)return null;
 const discriminant=b*b-4*a*c;
 if(discriminant<0)return null;
 const t=(-b-Math.sqrt(discriminant))/(2*a);
 return t>=0&&t<=1?t:null;
}
/** Frame-rate independent inertial steering (acceleration + controlled braking). */
export function steerVelocity(vx,vz,wishX,wishZ,speed,dt){
 const mag=Math.hypot(wishX,wishZ),tx=mag>.01?wishX/mag*speed:0,tz=mag>.01?wishZ/mag*speed:0;
 const alpha=1-Math.exp(-(mag>.01?8.5:12)*Math.min(.1,Math.max(0,dt)));
 return {x:vx+(tx-vx)*alpha,z:vz+(tz-vz)*alpha};
}

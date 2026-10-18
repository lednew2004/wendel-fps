/** VEX 3.6.1: shared parkour planning and smooth cinematic traversal.
 * Pure functions: the server and the client use the very same movement arc.
 * Never accept a client-supplied endpoint in an online match.
 */
const clamp01=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp01(x);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
function rayAabb(ox,oz,dx,dz,b,r=.48){
 let entry=-Infinity,exit=Infinity;
 for(const [o,d,c,half] of [[ox,dx,b.x,b.hx+r],[oz,dz,b.z,b.hz+r]]){
  if(Math.abs(d)<1e-5){if(o<c-half||o>c+half)return null;continue;}
  const a=(c-half-o)/d,bb=(c+half-o)/d;
  entry=Math.max(entry,Math.min(a,bb));exit=Math.min(exit,Math.max(a,bb));
 }
 return exit>Math.max(0,entry)?{entry,exit}:null;
}
/** Geometry must be a wall, not a building; obstacle surfaces never move. */
export function planVault(position,walls,canLand,{reach=5.4,minHeight=1.7,maxHeight=6.4}={}){
 const fx=-Math.sin(position.yaw),fz=-Math.cos(position.yaw);
 const from={x:position.x,y:position.y,z:position.z};
 let choice=null;
 for(const wall of walls){
  if(wall.active===false)continue;
  const rise=wall.maxY-position.y;
  if(rise<minHeight||rise>maxHeight)continue;
  const hit=rayAabb(position.x,position.z,fx,fz,wall);
  if(!hit||hit.entry<.4||hit.entry>reach||hit.exit-hit.entry>3.8)continue;
  const landingDistance=hit.exit+1.12;
  const to={x:from.x+fx*landingDistance,y:from.y,z:from.z+fz*landingDistance};
  if(!canLand(to.x,to.y,to.z))continue;
  const plan={from,to,
   front:{x:from.x+fx*Math.max(0,hit.entry-.12),y:from.y,z:from.z+fz*Math.max(0,hit.entry-.12)},
   back:{x:from.x+fx*(hit.exit+.16),y:from.y,z:from.z+fz*(hit.exit+.16)},
   crest:wall.maxY+.65,wallTop:wall.maxY,kind:wall.kind||'concrete',
   duration:Math.round(940+rise*110)};
  if(!choice||hit.entry<choice.distance)choice={plan,distance:hit.entry};
 }
 return choice?.plan||null;
}
/** Starts grounded, rises in front of the wall, travels ABOVE it, then lands. */
export function vaultPosition(plan,progress){
 const t=clamp01(progress);
 if(t<=.43){
  const a=smooth(t/.43);
  return {x:lerp(plan.from.x,plan.front.x,a),y:lerp(plan.from.y,plan.crest,a),z:lerp(plan.from.z,plan.front.z,a)};
 }
 if(t<=.72){
  const u=(t-.43)/.29,a=smooth(u);
  return {x:lerp(plan.front.x,plan.back.x,a),y:plan.crest+Math.sin(u*Math.PI)*.15,z:lerp(plan.front.z,plan.back.z,a)};
 }
 const a=smooth((t-.72)/.28);
 return {x:lerp(plan.back.x,plan.to.x,a),y:lerp(plan.crest,plan.to.y,a),z:lerp(plan.back.z,plan.to.z,a)};
}
export function vaultCameraMotion(progress){
 const t=clamp01(progress);
 return {headDip:Math.sin(t*Math.PI)*.11+((t<.16)?Math.sin(t/.16*Math.PI)*.08:0),
  roll:Math.sin(t*Math.PI*2)*.035,
  fovBoost:Math.sin(t*Math.PI)*5};
}
/** 3.7: super leap onto virtually any reachable rooftop; no instant position changes.
 * Big buildings are landing platforms, not walls to teleport through. */
export function planSkyLeap(position,solids,canLand,{reach=17,maxHeight=34}={}){
 const fx=-Math.sin(position.yaw),fz=-Math.cos(position.yaw);
 let selected=null;
 for(const b of solids){
  if(b.active===false||b.maxY===undefined)continue;
  const rise=b.maxY-position.y;
  if(rise<1.4||rise>maxHeight)continue;
  const hit=rayAabb(position.x,position.z,fx,fz,b,.2);
  if(!hit||hit.entry<.25||hit.entry>reach)continue;
  const targetY=b.maxY+.1;
  // Aim slightly inside the rooftop rather than hopping past a whole building.
  // Land far enough inside the platform for the full player capsule to be supported.
  // The AABB ray adds 0.68 m of player/aim margin, so +0.75 could land on an unsupported ledge.
  const inside=Math.min(hit.entry+1.75,hit.exit-.7);
  if(inside<=hit.entry+.95)continue;
  const to={x:position.x+fx*inside,y:targetY,z:position.z+fz*inside};
  if(!canLand(to.x,to.y,to.z))continue;
  const frontT=Math.max(0,hit.entry-1.0);
  const front={x:position.x+fx*frontT,y:position.y,z:position.z+fz*frontT};
  const back={x:position.x+fx*(hit.entry+.4),y:targetY,z:position.z+fz*(hit.entry+.4)};
  const plan={from:{x:position.x,y:position.y,z:position.z},front,back,to,crest:targetY+Math.max(1.2,Math.min(2.5,rise*.12)),wallTop:b.maxY,kind:'sky-leap',duration:Math.min(3000,1000+rise*52)};
  if(!selected||hit.entry<selected.dist)selected={dist:hit.entry,plan};
 }
 return selected?.plan||null;
}

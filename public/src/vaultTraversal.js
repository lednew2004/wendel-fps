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

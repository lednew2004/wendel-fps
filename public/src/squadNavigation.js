/** 2D A* over a coarse local grid. Geometry-independent and safe for Node tests. */
const roundGrid=(n,step)=>Math.round(n/step);
export function findSquadPath(start,goal,canWalk,options={}){
 const step=options.step||6,limit=options.limit||4200,bound=options.bound||209;
 const sx=roundGrid(start.x,step),sz=roundGrid(start.z,step),gx=roundGrid(goal.x,step),gz=roundGrid(goal.z,step);
 const key=(x,z)=>x+','+z,open=[{x:sx,z:sz,g:0,f:0}],seen=new Map([[key(sx,sz),0]]),prev=new Map(),closed=new Set();
 let end=null,count=0;
 while(open.length&&count++<limit){
  open.sort((a,b)=>b.f-a.f);const n=open.pop(),id=key(n.x,n.z);if(closed.has(id))continue;closed.add(id);
  if(Math.hypot(n.x-gx,n.z-gz)<=1.1){end=id;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=n.x+dx,z=n.z+dz,px=x*step,pz=z*step,k=key(x,z);
   if(Math.abs(px)>bound||Math.abs(pz)>bound||closed.has(k)||!canWalk(px,pz))continue;
   if(dx&&dz&&(!canWalk((n.x+dx)*step,n.z*step)||!canWalk(n.x*step,(n.z+dz)*step)))continue;
   const g=n.g+Math.hypot(dx,dz),old=seen.get(k);
   if(old!==undefined&&g>=old)continue;
   seen.set(k,g);prev.set(k,id);open.push({x,z,g,f:g+Math.hypot(gx-x,gz-z)});
  }
 }
 if(!end)return [];
 const result=[];let pos=end;
 for(let i=0;i<limit&&pos;i++){
  const [x,z]=pos.split(',').map(Number);result.push({x:x*step,z:z*step});pos=prev.get(pos);
 }
 result.reverse();if(result.length>1)result.shift();
 return [...result,goal];
}

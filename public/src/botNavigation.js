/** Multi-level pathfinding for the authored FPS arena. No Three.js dependency.
 * All nodes are checked against the actual collision volumes used by the game.
 */
import {ARENA_BOUNDS} from './squadLayout.js';

const STEP=3.2;
const width=Math.floor((ARENA_BOUNDS.halfX*2-7)/STEP)+1;
const height=Math.floor((ARENA_BOUNDS.halfZ*2-7)/STEP)+1;
const xmin=-ARENA_BOUNDS.halfX+3.5,zmin=-ARENA_BOUNDS.halfZ+3.5;
const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const id=(i,j)=>j*width+i;
const at=(i,j)=>({x:xmin+i*STEP,z:zmin+j*STEP});
const cell=(x,z)=>({i:Math.min(width-1,Math.max(0,Math.round((x-xmin)/STEP))),j:Math.min(height-1,Math.max(0,Math.round((z-zmin)/STEP)))});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function botCanWalk(city,x,z,feet=0,radius=.75){
  if(!city?.canOccupy?.(x,z,feet,1.80,radius))return false;
  if(feet<2.5||!city.floorAt)return true;
  // A rooftop bot must not plan its route through empty air between roofs.
  for(const [dx,dz] of [[0,0],[radius*.65,0],[-radius*.65,0],[0,radius*.65],[0,-radius*.65]]){
    const floor=city.floorAt(x+dx,z+dz,feet,.65);
    if(Math.abs(floor-feet)>1.15)return false;
  }
  return true;
}

export function lineWalkable(from,to,city,radius=.75,feet=0){
  if(!city?.canOccupy)return false;
  const len=distance(from,to);
  for(let k=1,n=Math.max(1,Math.ceil(len/1.5));k<=n;k++){
    const t=k/n,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
    if(!botCanWalk(city,x,z,feet,radius))return false;
  }
  return true;
}

/** Return a short series of waypoints, or [] when no legal route exists. */
export function findGroundRoute(start,goal,city,radius=.75,maxVisited=2300,feet=0){
  if(!city?.canOccupy)return [];
  if(lineWalkable(start,goal,city,radius,feet))return [{x:goal.x,z:goal.z}];
  const from=cell(start.x,start.z),target=cell(goal.x,goal.z);
  const allowed=new Map();
  const free=(i,j)=>{
    if(i<0||j<0||i>=width||j>=height)return false;
    const key=id(i,j);
    if(!allowed.has(key)){const pos=at(i,j);allowed.set(key,botCanWalk(city,pos.x,pos.z,feet,radius));}
    return allowed.get(key);
  };
  // Find the nearest standable grid node around each endpoint.
  const nearest=({i,j})=>{
    if(free(i,j))return {i,j};
    for(let ring=1;ring<=4;ring++)for(let dj=-ring;dj<=ring;dj++)for(let di=-ring;di<=ring;di++){
      if(Math.max(Math.abs(di),Math.abs(dj))!==ring)continue;
      if(free(i+di,j+dj))return {i:i+di,j:j+dj};
    }
    return null;
  };
  const origin=nearest(from),finish=nearest(target);
  if(!origin||!finish)return [];
  const startId=id(origin.i,origin.j),goalId=id(finish.i,finish.j);
  const dist=new Map([[startId,0]]),came=new Map(),open=[{i:origin.i,j:origin.j,g:0,f:Math.hypot(origin.i-finish.i,origin.j-finish.j)}];
  let visited=0;
  while(open.length&&visited++<maxVisited){
    let best=0;for(let k=1;k<open.length;k++)if(open[k].f<open[best].f)best=k;
    const n=open.splice(best,1)[0],current=id(n.i,n.j);
    if(n.g>dist.get(current)+1e-6)continue;
    if(current===goalId){
      const nodes=[];let key=goalId;
      while(key!==startId&&nodes.length<160){
        nodes.push(at(key%width,Math.floor(key/width)));
        key=came.get(key);if(key==null)return [];
      }
      nodes.reverse();
      // Reduce the path while maintaining actual collision clearance.
      const reduced=[];let eye=start;
      for(let k=0;k<nodes.length;){
        let last=k;
        for(let j=Math.min(nodes.length-1,k+12);j>=k;j--){if(lineWalkable(eye,nodes[j],city,radius,feet)){last=j;break;}}
        reduced.push(nodes[last]);eye=nodes[last];k=last+1;
      }
      if(lineWalkable(eye,goal,city,radius,feet))reduced.push({x:goal.x,z:goal.z});
      return reduced;
    }
    for(const [di,dj] of dirs){const ni=n.i+di,nj=n.j+dj;
      if(!free(ni,nj))continue;
      if(di&&dj&&(!free(n.i+di,n.j)||!free(n.i,n.j+dj)))continue;
      const key=id(ni,nj),next=n.g+(di&&dj?Math.SQRT2:1);
      if(next>= (dist.get(key)??Infinity))continue;
      dist.set(key,next);came.set(key,current);
      open.push({i:ni,j:nj,g:next,f:next+Math.hypot(ni-finish.i,nj-finish.j)});
    }
  }
  return [];
}

export function botNextWaypoint(enemy,goal,city,time){
  if(!city?.canOccupy||city.isGeoCity)return goal;
  const cache=enemy.groundRoute,feet=enemy.floorY||0;
  if(!cache||time>cache.expiry||distance(cache.target,goal)>7||Math.abs((cache.feet||0)-feet)>1){
    const route=findGroundRoute(enemy,goal,city,enemy.radius+.1,2300,feet);
    enemy.groundRoute={route,index:0,feet,target:{x:goal.x,z:goal.z},expiry:time+1.8};
  }
  const state=enemy.groundRoute;
  while(state.index<state.route.length-1&&distance(enemy,state.route[state.index])<2.5)state.index++;
  return state.route[state.index]||goal;
}

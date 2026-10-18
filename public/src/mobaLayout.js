/** MOBA tactical geography shared by browser and server; distances in metres. */
export const MOBA_BASES=Object.freeze({blue:{x:0,z:-180},red:{x:0,z:180}});
export const MOBA_LANES=Object.freeze({
 top:[[-12,-180],[-146,-164],[-146,147],[-12,180]],
 mid:[[0,-180],[0,-90],[0,0],[0,90],[0,180]],
 adc:[[12,-180],[146,-164],[146,147],[12,180]]
});
export const JUNGLE_CAMPS=Object.freeze([
 {id:'bosque-oeste',x:-77,z:-116,level:1},{id:'bosque-leste',x:77,z:-116,level:1},
 {id:'caçadores-oeste',x:-77,z:35,level:2},{id:'caçadores-leste',x:77,z:35,level:2},
 {id:'guardião-norte',x:-76,z:117,level:3},{id:'guardião-sul',x:76,z:117,level:3}
]);
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1];const u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz);}
export function distanceToLane(x,z,id){const points=MOBA_LANES[id];return Math.min(...points.slice(1).map((p,i)=>segmentDistance(x,z,points[i],p)));}
export function onLane(x,z,width=13){return Object.keys(MOBA_LANES).some(id=>distanceToLane(x,z,id)<width);}
export function inBase(x,z,range=21){return Object.values(MOBA_BASES).some(p=>Math.hypot(x-p.x,z-p.z)<range);}
export function protectedRoute(x,z){return onLane(x,z,11)||inBase(x,z,23);}
export function preferredEnemySpawns(){return [...JUNGLE_CAMPS.map(p=>[p.x,p.z]),[-145,-56],[145,-56],[-145,70],[145,70],[0,95]];}

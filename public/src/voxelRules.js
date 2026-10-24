/** FORGE 3.7: light, bounded voxel structures shared by solo and online scenes. */
export const BLOCK_SIZE=1.8;
export const FORGE_LIMIT=36;
export const FORGE_LIFETIME=42000;
export const FORGE_RANGE=13;
export const snapVoxel=v=>Math.round((v-BLOCK_SIZE/2)/BLOCK_SIZE)*BLOCK_SIZE+BLOCK_SIZE/2;
export const blockKey=(x,y,z)=>`${snapVoxel(x).toFixed(2)}|${snapVoxel(y).toFixed(2)}|${snapVoxel(z).toFixed(2)}`;
export function blockCollider(b){return {x:b.x,z:b.z,hx:BLOCK_SIZE/2,hz:BLOCK_SIZE/2,minY:b.y-BLOCK_SIZE/2,maxY:b.y+BLOCK_SIZE/2};}
export function validVoxelPlacement(candidate,origin,blocks=[],solids=[]){
 if(!candidate||!['x','y','z'].every(k=>Number.isFinite(candidate[k])))return false;
 const {x,y,z}=candidate;
 if(Math.abs(x)>215||Math.abs(z)>215||y<.75||y>29||Math.hypot(x-origin.x,z-origin.z)>FORGE_RANGE+1)return false;
 if(Math.abs(x-origin.x)<1.45&&Math.abs(z-origin.z)<1.45&&Math.abs(y-(origin.y+1))<2.2)return false;
 const box=blockCollider(candidate);
 for(const b of [...blocks,...solids]){
   if(b.active===false)continue;
   const a=b.minY===undefined?blockCollider(b):b;
   if(Math.abs(box.x-a.x)<box.hx+a.hx-.05&&Math.abs(box.z-a.z)<box.hz+a.hz-.05&&box.minY<a.maxY-.05&&box.maxY>a.minY+.05)return false;
 }
 return true;
}

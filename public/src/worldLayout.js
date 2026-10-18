// Legacy housing data retained for compatibility with offline asset tools. Not loaded into Squad Operations.
const protectedRoute=()=>false;
/** Deterministic extension shared by the browser renderer and authoritative Node server.
 * Coordinates are in meters; no Three.js dependency. */
export const WORLD_HALF = 219;
export const EXPANSION_SPOTS = [
  [-160,-192],[-192,0],[160,192],[192,0],[-32,192],[96,-160],[-96,160],[160,-96]
];
export const PARK_SPOTS = [[-192,192],[192,-192],[0,-192],[0,160]];
export const isSpot = (x,z,spots)=>spots.some(([sx,sz])=>sx===x&&sz===z);
export function expandedBuildings(){
  const result=[];
  for(let x=-192;x<=192;x+=32){
    for(let z=-192;z<=192;z+=32){
      if(Math.abs(x)<160&&Math.abs(z)<160)continue;
      if(isSpot(x,z,EXPANSION_SPOTS)||isSpot(x,z,PARK_SPOTS))continue;
      if(Math.abs(x)===192&&Math.abs(z)===192)continue;
      if(protectedRoute(x,z))continue;
      const n=Math.abs(x*31+z*17),zone=(x>100?'centro':z>140?'residencial':z< -140?'industrial':'bairro');
      const w=11+(n%3),d=11+((n>>2)%3);
      const h=zone==='centro'?12+(n%5)*2.7:zone==='industrial'?7+(n%4)*1.9:5.6+(n%5)*1.75;
      const palette=[0xf3b27b,0x81bfd3,0xf1d28a,0x94cbb6,0xce9cc5,0xe3a5a0,0xb3c4ef,0xf4c1a0];
      result.push({x,z,w,d,h,accent:palette[n%palette.length],zone,roofAccess:n%3===0});
    }
  }
  return result;
}
export const HOMES = EXPANSION_SPOTS.filter(([x,z])=>!protectedRoute(x,z)).map(([x,z],i)=>({id:`home-${i+1}`,x,z,w:14,d:12,h:5.6,color:[0xf5cd87,0xa9cfeb,0xf6b7a8,0xa9d4ad,0xe5b5db,0xf4d6a5,0x9dbbe4,0xffb899][i]}));
export const homeDoor = home=>({id:`${home.id}-door`,kind:'door',x:home.x,z:home.z+home.d/2,minY:0,maxY:2.9,hx:1.05,hz:.16});
export const homeWindow = (home,side)=>({id:`${home.id}-window-${side<0?'l':'r'}`,kind:'window',x:home.x+side*home.w*.32,z:home.z+home.d/2,minY:1.02,maxY:3.38,hx:1.16,hz:.16});
export const INTERACTABLES=HOMES.flatMap(h=>[homeDoor(h),homeWindow(h,-1),homeWindow(h,1)]);
/** Fixed wall spans around a wide central doorway and two usable windows. */
export function homeStaticColliders(h){
  const walls=[];const add=(x,z,w,d,minY=0,maxY=h.h)=>walls.push({x,z,hx:w/2,hz:d/2,minY,maxY});
  const front=h.z+h.d/2;
  add(h.x-h.w/2,h.z,.36,h.d);add(h.x+h.w/2,h.z,.36,h.d);
  add(h.x,h.z-h.d/2,h.w,.36);
  // Windows centered at ±.32w, door at 0. Segment front wall with real openings.
  const cuts=[-h.w/2,-h.w*.32-1.16,-h.w*.32+1.16,-1.05,1.05,h.w*.32-1.16,h.w*.32+1.16,h.w/2];
  for(let i=0;i<cuts.length-1;i++){
    if(i===1||i===3||i===5)continue;
    const a=cuts[i],b=cuts[i+1];if(b-a>.01)add(h.x+(a+b)/2,front,b-a,.36);
  }
  add(h.x,front,2.10,.36,2.9,h.h);
  for(const side of [-1,1]){
    const x=h.x+side*h.w*.32;
    add(x,front,2.32,.36,0,1.02);add(x,front,2.32,.36,3.38,h.h);
  }
  // Partition with a wide walk-through opening between the living room and kitchen.
  const innerZ=h.z-.5;
  const span=h.w/2-1.2;
  for(const side of [-1,1])add(h.x+side*(1.2+span/2),innerZ,span,.18,0,3.25);
  return walls;
}
export function homeFurniture(h){
  return [
    {type:'sofa',x:h.x-h.w*.32,z:h.z+h.d*.17,w:2.7,d:1.15,h:.95},
    {type:'table',x:h.x,z:h.z+h.d*.05,w:2.35,d:1.35,h:.85},
    {type:'counter',x:h.x+h.w*.30,z:h.z-h.d*.33,w:3,d:.72,h:1.04},
    {type:'bed',x:h.x-h.w*.25,z:h.z-h.d*.30,w:2.1,d:2.35,h:.65}
  ];
}
export const furnitureCollider=f=>({x:f.x,z:f.z,hx:f.w/2,hz:f.d/2,minY:0,maxY:f.h});

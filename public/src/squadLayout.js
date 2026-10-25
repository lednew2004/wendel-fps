/** PORT ZENITH: new authored, compact multiplayer arena (metres, no Three.js).
 * Browser and server import exactly the same blocker and door definitions.
 */
export const SQUAD_ROLES=Object.freeze(['front','support','sniper','bomber']);
export const ROLE_INFO=Object.freeze({
 front:{name:'FRENTE',description:'Avança, abre passagem e absorve a pressão do combate.',icon:'⚔',weapons:[1,0]},
 support:{name:'SUPORTE',description:'Protege aliados, cura e segura invasores.',icon:'✚',weapons:[3,0]},
 sniper:{name:'SNIPER',description:'Reconhece ameaças e elimina alvos de longe.',icon:'⌖',weapons:[2,0]},
 bomber:{name:'BOMBER',description:'Controla áreas, sabota e surpreende com combos.',icon:'✦',weapons:[0,2,3]}
});
export const ARENA_BOUNDS=Object.freeze({halfX:98,halfZ:116});
export const SQUAD_START=Object.freeze({x:0,z:-94});
export const SQUAD_POINTS=Object.freeze({
 insertion:{x:0,z:-94,label:'PONTO DE INSERÇÃO'},
 defense:{x:0,z:-48,label:'PÁTIO DE CARGA'},
 reconnaissance:{x:38,z:-9,label:'POSTO DE OBSERVAÇÃO'},
 sabotage:{x:-37,z:34,label:'SUBESTAÇÃO'},
 boss:{x:0,z:84,label:'PRAÇA DE CONFRONTO'},
 extraction:{x:-34,z:-93,label:'PORTÃO DE EXTRAÇÃO'}
});
// Spatial layout: three longitudinal lanes, cross-connections, two plazas and six
// enterable industrial buildings. These structures are NOT from the old map.
export const SQUAD_INTERIORS=Object.freeze([
 {id:'port-office',x:-54,z:-59,w:30,d:29,h:9.0,theme:'concrete'},
 {id:'blue-terminal',x:54,z:-53,w:30,d:32,h:10.6,theme:'cyan'},
 {id:'power-house',x:-55,z:9,w:30,d:32,h:9.5,theme:'marine'},
 {id:'freight-office',x:54,z:16,w:32,d:30,h:11.2,theme:'azure'},
 {id:'control-station',x:-54,z:75,w:32,d:28,h:9.4,theme:'cream'},
 {id:'rooftop-labs',x:56,z:77,w:30,d:28,h:10.0,theme:'cyan'}
].map(b=>Object.freeze({...b,hx:b.w/2,hz:b.d/2})));

const freezeBlock=(x,z,w,d,h,extra={})=>Object.freeze({x,z,w,d,h,hx:w/2,hz:d/2,minY:extra.minY??0,maxY:(extra.minY??0)+h,...extra});
// Front is +Z; rear -Z. Both have true 3.4-metre openings; front door is hinged.
// Window apertures are holes in the actual wall collider, not painted rectangles.
export function interiorColliders(b){
 const result=[],add=(ox,oz,w,d,h,y=0,part='wall')=>result.push(freezeBlock(b.x+ox,b.z+oz,w,d,h,{minY:y,interiorPart:part,interiorId:b.id}));
 for(const sx of [-1,1])add(sx*b.w/2,0,.42,b.d,b.h);
 for(const sz of [-1,1]){
   const wing=(b.w-3.4)/2;
   for(const sx of [-1,1])add(sx*(1.7+wing/2),sz*b.d/2,wing,.42,b.h);
   add(0,sz*b.d/2,3.4,.42,b.h-3.05,3.05,'lintel');
   for(const sx of [-1,1]){
     const cx=sx*(b.w*.34);
     // Wall section coincides with wing. Split true window openings vertically
     // only in the decorative front panels; side wing is a full physical wall.
     void cx;
   }
 }
 add(0,0,b.w,b.d,.34,b.h,'roof');
 // Mezzanine is a U-shaped floor; central void and both stair flights stay open.
 add(-b.w*.18,-b.d*.14,b.w*.48,b.d*.47,.28,b.h*.51,'loft');
 add(-b.w*.30,b.d*.24,b.w*.24,b.d*.18,.28,b.h*.51,'landing');
 // Furniture is real cover for both offline players and server clients.
 add(-b.w*.29,-b.d*.31,3.6,1.3,1.36,0,'desk');
 add(b.w*.27,b.d*.18,2.4,1.4,1.12,0,'supply');
 return result;
}
export const SQUAD_DOORS=Object.freeze(SQUAD_INTERIORS.map(b=>Object.freeze({id:`${b.id}-door`,kind:'door',x:b.x,z:b.z+b.d/2,hx:1.7,hz:.21,minY:0,maxY:3.05})));
const obstacles=[
 // Layered low walls, loading pallets and container bunkers on side routes.
 [-21,-84,6.0,1.4,1.35,'barrier'],[21,-80,6.2,1.5,1.55,'barrier'],
 [-7,-69,5.0,2.6,2.45,'crate'],[8,-66,4.1,2.5,1.80,'crate'],
 [-22,-39,7.2,2.0,2.1,'container'],[21,-32,6.5,2.0,1.50,'barrier'],
 [-6,-28,4.0,3.5,1.6,'crate'],[7,-16,5.0,2.3,2.2,'crate'],
 [-23,8,6.5,2.0,1.5,'barrier'],[22,8,5.4,2.8,2.5,'container'],
 [-7,30,4.2,3.3,2.10,'crate'],[8,39,6.0,2.0,1.65,'barrier'],
 [-21,53,6.0,2.7,2.25,'container'],[23,53,6.6,2.3,1.45,'barrier'],
 [-7,71,3.2,3.2,1.75,'crate'],[8,69,4.8,2.8,2.35,'crate'],
 [-19,93,4.0,2.6,1.55,'crate'],[19,96,5.0,2.2,1.30,'barrier'],
 // Side-street cover, recessed loading docks and short cross-lane walls.
 [-35,-20,1.4,7.0,2.1,'barrier'],[36,-13,1.6,7.8,2.35,'barrier'],
 [-36,55,1.4,7.5,1.6,'barrier'],[37,52,1.4,6.6,1.7,'barrier'],
 [-76,-20,6.0,2.4,2.2,'container'],[78,0,5.2,3,1.85,'crate'],
 [-79,46,5.0,2.5,1.45,'barrier'],[80,47,5.6,2.6,2.1,'container'],
 // Medium-range sight-breaks with entry and flank clearances.
 [-16,-3,2.5,7.2,2.15,'barrier'],[16,23,2.4,8.0,1.70,'barrier'],
 // New canyoning blocks: tall masses close the arena and create true alleys.
 [-18,-57,11.5,18,22,'tower'],[18,-55,11.5,18,23,'tower'],
 [18,-6,12.0,22,24,'tower'],[-18,11,12.0,22,24,'tower'],
 [-18,59,12.0,22,25,'tower'],[18,58,12.0,22,25,'tower'],
 [-87,-60,12,34,28,'tower'],[87,-60,12,34,28,'tower'],
 [-87,10,12,38,30,'tower'],[87,14,12,38,30,'tower'],
 [-87,79,12,34,28,'tower'],[87,79,12,34,28,'tower'],
 // Alley pinch points and diagonal blockers to reduce long open sightlines.
 [-2,-42,8.4,2.0,3.2,'container'],[2,41,8.4,2.0,3.2,'container'],
 [-33,-60,10.5,1.8,3.6,'barrier'],[33,-18,10.5,1.8,3.6,'barrier'],
 [-33,28,10.5,1.8,3.6,'barrier'],[33,77,10.5,1.8,3.6,'barrier']
];
export const SQUAD_OBSTACLES=Object.freeze(obstacles.map(([x,z,w,d,h,kind])=>freezeBlock(x,z,w,d,h,{obstacle:true,kind})));
// Edge walls prevent falling off the authored combat arena. Breaks at front and
// rear are visual gates, but their walkable area is always inside the boundary.
export const SQUAD_PERIMETER=Object.freeze([
 freezeBlock(-97,0,2,232,8,{perimeter:true}),freezeBlock(97,0,2,232,8,{perimeter:true}),
 freezeBlock(0,-115,194,2,7,{perimeter:true}),freezeBlock(0,115,194,2,7,{perimeter:true})
]);
// Roof-to-roof pedestrian links. Their horizontal decks and guardrails exist in
// the authoritative collision map as well as in the rendered Three.js scene.
export const SQUAD_BRIDGES=Object.freeze([
 {x:-54,z:-25.75,w:4.0,d:40.2,y:9.56},
 {x:-54.5,z:43.2,w:4.0,d:38.2,y:9.74},
 {x:54,z:-18,w:4.0,d:41.4,y:11.22},
 {x:55,z:47,w:4.0,d:35.2,y:10.76}
].map((b,index)=>Object.freeze({...b,id:`skybridge-${index}`})));
export const SQUAD_BRIDGE_BLOCKS=Object.freeze(SQUAD_BRIDGES.flatMap(b=>[
 freezeBlock(b.x,b.z,b.w,b.d,.30,{minY:b.y-.30,bridge:true}),
 freezeBlock(b.x-b.w/2+.10,b.z,.16,b.d,1.03,{minY:b.y,bridgeRail:true}),
 freezeBlock(b.x+b.w/2-.10,b.z,.16,b.d,1.03,{minY:b.y,bridgeRail:true})
]));
export const SQUAD_BLOCKS=Object.freeze([
 ...SQUAD_INTERIORS.flatMap(interiorColliders),...SQUAD_OBSTACLES,
 ...SQUAD_BRIDGE_BLOCKS,...SQUAD_PERIMETER
]);
export const SQUAD_ENEMY_SPAWNS=Object.freeze([
 [-72,-91],[72,-91],[-41,-73],[41,-73],[-72,-30],[72,-28],
 [-42,-6],[42,-7],[-72,24],[72,25],[-42,49],[42,50],
 [-72,90],[72,90],[-18,103],[18,103],[0,71],[-57,8],[57,10]
]);
export const FFA_SPAWNS=Object.freeze([[-9,-99],[11,99],[-33,-93],[35,92],[-80,-44],[84,60],[-8,13],[4,-49]]);
export function roleForHero(id){return ({striker:'front',cryomancer:'support',riftwalker:'sniper',aeronaut:'sniper',phantom:'sniper',chronos:'bomber',echo:'support',storm:'bomber',gravity:'front',guardian:'support',shiro:'front',leo:'bomber',butterfly:'bomber',adaptomega:'front',forge:'bomber',terra:'front',puppet:'support',thread:'front',mirror:'sniper',pixel:'front',cipher:'sniper',vector:'front',bloom:'support',fusion:'bomber',echo2:'support'})[id]||'front';}
export function safeSpawnNear(world,x,z,r=1.1){
 if(world.canMove(x,z,r))return {x,z};
 for(let dist=2;dist<=24;dist+=2)for(let n=0;n<16;n++){
  const a=n*Math.PI/8,tx=x+Math.cos(a)*dist,tz=z+Math.sin(a)*dist;
  if(world.canMove(tx,tz,r))return {x:tx,z:tz};
 }
 return {x:SQUAD_START.x,z:SQUAD_START.z};
}
// Compatibility export for the independent geographic-city material module.
// The new FPS arena does not reuse the previous 4.6.6 cover meshes.
export const SQUAD_COVERS_466=Object.freeze([]);

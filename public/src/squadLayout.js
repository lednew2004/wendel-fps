/** Squad Operations: shared collision/navigation/mission layout, independent of WebGL. */
export const SQUAD_ROLES=Object.freeze(['front','support','sniper','bomber']);
export const ROLE_INFO=Object.freeze({
 front:{name:'FRENTE',description:'Avança, abre passagem e absorve a pressão do combate.',icon:'⚔',weapons:[1,0]},
 support:{name:'SUPORTE',description:'Protege aliados, cura e segura invasores.',icon:'✚',weapons:[3,0]},
 sniper:{name:'SNIPER',description:'Reconhece ameaças e elimina alvos de longe.',icon:'⌖',weapons:[2,0]},
 bomber:{name:'BOMBER',description:'Controla áreas, sabota e surpreende com combos.',icon:'✦',weapons:[0,2,3]}
});
export const SQUAD_START=Object.freeze({x:0,z:-155});
export const SQUAD_POINTS=Object.freeze({
 insertion:{x:0,z:-155,label:'BASE DE OPERAÇÕES'},
 defense:{x:0,z:-91,label:'PERÍMETRO DELTA'},
 reconnaissance:{x:70,z:-16,label:'TORRE DE OBSERVAÇÃO'},
 sabotage:{x:-74,z:44,label:'GERADORES HOSTIS'},
 boss:{x:0,z:132,label:'ARENA TITÃ'},
 extraction:{x:-85,z:-148,label:'EXTRAÇÃO'}
});
// Low-cost fixed geometry and shared server-side blockers; critical objective zones stay open.
// 3.6: shared navigable city obstacles. Geometry and PvP collision use the same array.
export const SQUAD_OBSTACLES=Object.freeze([
 // Cidade: muros de segurança, tapumes de obras, muros de contenção e barreiras industriais.
 [-15,-116,13,1.5,4.4,'security'],[14,-114,11,1.4,3.8,'construction'],[-24,-63,1.5,11,5.2,'concrete'],
 [24,-52,1.4,13,4.7,'security'],[-12,-30,13,1.5,5.5,'concrete'],[19,-27,9,1.5,3.4,'industrial'],
 [-62,14,1.5,12,5.6,'construction'],[63,43,12,1.5,4.5,'security'],[-19,77,13,1.5,4.2,'concrete'],
 [17,87,1.5,14,5.7,'industrial'],[-54,117,9,1.5,3.7,'construction'],[53,117,10,1.5,4.0,'security'],
 [-24,162,1.4,12,5.1,'concrete'],[23,166,12,1.6,4.8,'construction'],
 [-14,-144,10,1.6,4.7,'security'],[15,-137,9,1.6,5.1,'industrial'],
 [-73,-86,12,1.4,5.2,'concrete'],[74,-88,11,1.4,5.2,'industrial'],
 [29,-13,1.6,9,5.3,'security'],[-20,35,10,1.5,5.6,'construction'],
 [27,49,12,1.5,5.2,'concrete'],[-78,83,1.5,10,5.7,'security'],
 [78,82,1.5,10,5.4,'industrial'],[-28,-89,1.4,13,4.8,'construction']
].map(([x,z,w,d,h,kind])=>Object.freeze({x,z,w,d,h,hx:w/2,hz:d/2,minY:0,maxY:h,obstacle:true,kind})));
const SQUAD_RAW_BLOCKS=Object.freeze([
 [-39,-104,16,9,6], [39,-104,16,9,6],[-31,-76,12,7,4],[31,-76,12,7,4],
 [-84,-50,19,14,12],[84,-50,19,14,12],[-46,-16,14,17,8],[46,-16,14,17,8],
 [-105,18,18,16,9],[103,25,21,14,8],[-36,62,16,9,7],[37,62,16,9,7],
 [-91,97,23,16,10],[91,97,23,16,10],[-46,145,15,22,8],[48,145,15,22,8],
 [-23,5,3.2,8,1.3],[21,12,3.2,8,1.3],[-15,96,6,2.5,1.3],[20,105,6,2.5,1.3],
 [-58,-128,8,3,2], [57,-123,8,3,2],[-83,65,3,6,1.8],[82,-1,3,6,1.8]
].map(([x,z,w,d,h])=>Object.freeze({x,z,w,d,h,hx:w/2,hz:d/2,minY:0,maxY:h})).concat(SQUAD_OBSTACLES));

// Four former solid building blocks become navigable structures. Client and server
// use the same shell, intermediate floor, roof and furnishing collision volumes.
export const SQUAD_INTERIORS=Object.freeze([0,1,4,5,12,13,14,15].map(i=>Object.freeze({...SQUAD_RAW_BLOCKS[i],id:`interior-${i}`})));
export const SQUAD_DOORS=Object.freeze(SQUAD_INTERIORS.map(b=>Object.freeze({id:`${b.id}-door`,kind:'door',x:b.x,z:b.z+b.d/2-.01,hx:1.56,hz:.16,minY:0,maxY:2.9})));
export function interiorColliders(b){
 const w=b.w,d=b.d,h=b.h,mid=h/2,gap=3.2,front=(w-gap)/2;
 const defs=[
  [-w/2,0,.40,d,h,0,'wall'],[w/2,0,.40,d,h,0,'wall'],
  [0,-d/2,w,.40,h,0,'wall'],
  [-(gap/2+front/2),d/2,front,.40,h,0,'wall'],
  [gap/2+front/2,d/2,front,.40,h,0,'wall'],
  [0,0,w,d,.34,h,'roof'],
  [-w*.18,0,w*.60,d*.66,.30,mid,'loft'],
  [-w*.25,-d*.19,w*.15,.80,1.45,0,'cover'],
  [w*.25,-d*.18,w*.12,1.12,1.12,0,'cover'],
  [-w*.1,-d*.18,.34,d*.31,3.0,0,'partition'],
  [0,-d/2+1.12,w*.84,2.55,.28,mid-.28,'landing']
 ];
 return defs.map(([ox,oz,cw,cd,ch,base,part])=>Object.freeze({x:b.x+ox,z:b.z+oz,w:cw,d:cd,h:ch,hx:cw/2,hz:cd/2,minY:base,maxY:base+ch,interiorPart:part,interiorId:b.id}));
}
const interiorIndexes=new Set([0,1,4,5,12,13,14,15]);
export const SQUAD_BLOCKS=Object.freeze(SQUAD_RAW_BLOCKS.flatMap((b,i)=>interiorIndexes.has(i)?interiorColliders(b):[b]));
export const SQUAD_ENEMY_SPAWNS=Object.freeze([
 [-59,-76],[58,-79],[-32,-50],[31,-47],[-98,-16],[96,-1],[-93,63],[-46,81],
 [47,77],[71,96],[-72,116],[0,158],[51,156],[-46,152],[-105,111],[104,117]
]);
export const FFA_SPAWNS=Object.freeze([[-140,-140],[139,139],[-139,139],[139,-140],[-110,0],[111,1],[0,72],[5,-125]]);
export function roleForHero(id){return ({striker:'front',cryomancer:'support',riftwalker:'sniper',aeronaut:'sniper',phantom:'sniper',chronos:'bomber',echo:'support',storm:'bomber',gravity:'front',guardian:'support',shiro:'front',leo:'bomber',butterfly:'bomber',adaptomega:'front',forge:'bomber',terra:'front',puppet:'support',thread:'front',mirror:'sniper',pixel:'front',cipher:'sniper',vector:'front',bloom:'support',fusion:'bomber',echo2:'support'})[id]||'front';}
export function safeSpawnNear(world,x,z,r=1.1){
 if(world.canMove(x,z,r))return {x,z};
 for(let dist=2;dist<=24;dist+=2)for(let n=0;n<16;n++){
  const a=n*Math.PI/8,tx=x+Math.cos(a)*dist,tz=z+Math.sin(a)*dist;
  if(world.canMove(tx,tz,r))return {x:tx,z:tz};
 }
 return {x:SQUAD_START.x,z:SQUAD_START.z};
}

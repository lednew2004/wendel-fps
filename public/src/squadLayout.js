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
export const SQUAD_BLOCKS=Object.freeze([
 [-39,-104,16,9,6], [39,-104,16,9,6],[-31,-76,12,7,4],[31,-76,12,7,4],
 [-84,-50,19,14,12],[84,-50,19,14,12],[-46,-16,14,17,8],[46,-16,14,17,8],
 [-105,18,18,16,9],[103,25,21,14,8],[-36,62,16,9,7],[37,62,16,9,7],
 [-91,97,23,16,10],[91,97,23,16,10],[-46,145,15,22,8],[48,145,15,22,8],
 [-23,5,3.2,8,1.3],[21,12,3.2,8,1.3],[-15,96,6,2.5,1.3],[20,105,6,2.5,1.3],
 [-58,-128,8,3,2], [57,-123,8,3,2],[-83,65,3,6,1.8],[82,-1,3,6,1.8]
].map(([x,z,w,d,h])=>Object.freeze({x,z,w,d,h,hx:w/2,hz:d/2,minY:0,maxY:h})));
export const SQUAD_ENEMY_SPAWNS=Object.freeze([
 [-59,-76],[58,-79],[-32,-50],[31,-47],[-98,-16],[96,-1],[-93,63],[-46,81],
 [47,77],[71,96],[-72,116],[0,158],[51,156],[-46,152],[-105,111],[104,117]
]);
export const FFA_SPAWNS=Object.freeze([[-140,-140],[139,139],[-139,139],[139,-140],[-110,0],[111,1],[0,72],[5,-125]]);
export function roleForHero(id){return ({striker:'front',cryomancer:'support',riftwalker:'sniper',aeronaut:'sniper',phantom:'sniper',chronos:'bomber',echo:'support',storm:'bomber',gravity:'front',guardian:'support',shiro:'front',leo:'bomber',butterfly:'bomber'})[id]||'front';}
export function safeSpawnNear(world,x,z,r=1.1){
 if(world.canMove(x,z,r))return {x,z};
 for(let dist=2;dist<=24;dist+=2)for(let n=0;n<16;n++){
  const a=n*Math.PI/8,tx=x+Math.cos(a)*dist,tz=z+Math.sin(a)*dist;
  if(world.canMove(tx,tz,r))return {x:tx,z:tz};
 }
 return {x:SQUAD_START.x,z:SQUAD_START.z};
}

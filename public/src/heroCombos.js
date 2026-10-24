/** Combo abilities: pure, shared definitions. The server owns displacement/damage. */
export const HERO_COMBOS=Object.freeze({
 shiro_step:{base:'push',label:'LÂMINAS DUPLAS',icon:'⚔',cool:16,help:'Dash frontal em duas etapas; segundo avanço causa dano.',range:10},
 shiro_retreat:{base:'flight',label:'RECUO LETAL',icon:'↩',cool:15,help:'Dash para trás e próximo tiro fortalecido.',duration:6000},
 shiro_ricochet:{base:'chain',label:'CHUVA RICOCHETE',icon:'✴',cool:32,help:'Rajada que ricocheteia entre inimigos e concede escudo.',range:45},
 leo_dash:{base:'teleport',label:'TRÊS TEMPOS',icon:'➲',cool:19,help:'Avança duas vezes; terceira ativação retorna à origem.',returnWindow:12000},
 leo_immunity:{base:'shield',label:'PARADOXO',icon:'◈',cool:16,help:'Imunidade total por 1 segundo.',duration:1000},
 leo_barrage:{base:'chain',label:'CHUVA PLANETÁRIA',icon:'✹',cool:35,help:'Bombas globais sequenciais; imune durante a invocação.',duration:2800},
 butterfly_dash:{base:'teleport',label:'ASAS DE RETORNO',icon:'➶',cool:16,help:'Teleporte curto; reativação volta à origem.',returnWindow:12000},
 butterfly_orbit:{base:'clonejump',label:'SATÉLITE ORBITAL',icon:'◎',cool:18,help:'Orbe gira a 8 m do jogador; reative para trocar de posição.',duration:12000},
 butterfly_launch:{base:'push',label:'COMETA ERRANTE',icon:'❖',cool:30,help:'Lança orbe que empurra inimigos; reative para teleportar.',duration:12000}
});
export const COMBO_IDS=Object.freeze(Object.keys(HERO_COMBOS));
export const COMBO_STAGES=Object.freeze({shiro_step:2,leo_dash:3,butterfly_dash:2,butterfly_orbit:2,butterfly_launch:2});
export function nextComboStep(id,previous=0){const max=COMBO_STAGES[id]||1;return previous>=max?0:previous+1;}
/** Snapshot the direction of travel when dash is triggered. Active steering wins;
 * when releasing controls mid-slide, preserve momentum. Zero means aim forward. */
export function directionForDash(input=null,velocity=null){
 const a=Number(input?.x),b=Number(input?.z),mag=Math.hypot(a,b);
 if(Number.isFinite(mag)&&mag>.12)return {x:a/mag,z:b/mag};
 const x=Number(velocity?.x),z=Number(velocity?.z),speed=Math.hypot(x,z);
 if(Number.isFinite(speed)&&speed>1.4)return {x:x/speed,z:z/speed};
 return {x:0,z:0};
}
/** Dash follows the CURRENT movement input; only defaults to aim forward when stationary.
 * The server receives input direction, but never accepts an arbitrary target position. */
export function dashVector(x,z,yaw,metres,direction=null){
 const dx=Number(direction?.x),dz=Number(direction?.z),m=Math.hypot(dx,dz);
 const valid=Number.isFinite(m)&&m>.12&&Math.abs(dx)<=1.01&&Math.abs(dz)<=1.01;
 const ux=valid?dx/m:-Math.sin(yaw),uz=valid?dz/m:-Math.cos(yaw);
 return {x:x+ux*metres,z:z+uz*metres};
}
export function orbitLocation(x,z,start,now,radius=8){const angle=(now-start)/1000*2.5;return {x:x+Math.cos(angle)*radius,z:z+Math.sin(angle)*radius};}
export function segmentDistance2D(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,u=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(px-ax-u*dx,pz-az-u*dz);}

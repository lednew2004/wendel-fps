/** Combo abilities: pure, shared definitions. The server owns displacement/damage. */
export const HERO_COMBOS=Object.freeze({
 shiro_step:{base:'push',label:'LÂMINAS DUPLAS',icon:'⚔',cool:19,help:'Dash frontal em duas etapas; segundo avanço causa dano.',range:10},
 shiro_retreat:{base:'flight',label:'RECUO LETAL',icon:'↩',cool:20,help:'Dash para trás e próximo tiro fortalecido.',duration:6000},
 shiro_ricochet:{base:'chain',label:'CHUVA RICOCHETE',icon:'✴',cool:43,help:'Rajada que ricocheteia entre inimigos e concede escudo.',range:45},
 leo_dash:{base:'teleport',label:'TRÊS TEMPOS',icon:'➲',cool:25,help:'Avança duas vezes; terceira ativação retorna à origem.',returnWindow:12000},
 leo_immunity:{base:'shield',label:'PARADOXO',icon:'◈',cool:20,help:'Imunidade total por 1 segundo.',duration:1000},
 leo_barrage:{base:'chain',label:'CHUVA PLANETÁRIA',icon:'✹',cool:49,help:'Bombas globais sequenciais; imune durante a invocação.',duration:2800},
 butterfly_dash:{base:'teleport',label:'ASAS DE RETORNO',icon:'➶',cool:18,help:'Teleporte curto; reativação volta à origem.',returnWindow:12000},
 butterfly_orbit:{base:'clonejump',label:'SATÉLITE ORBITAL',icon:'◎',cool:25,help:'Orbe gira a 8 m do jogador; reative para trocar de posição.',duration:12000},
 butterfly_launch:{base:'push',label:'COMETA ERRANTE',icon:'❖',cool:41,help:'Lança orbe que empurra inimigos; reative para teleportar.',duration:12000}
});
export const COMBO_IDS=Object.freeze(Object.keys(HERO_COMBOS));
export const COMBO_STAGES=Object.freeze({shiro_step:2,leo_dash:3,butterfly_dash:2,butterfly_orbit:2,butterfly_launch:2});
export function nextComboStep(id,previous=0){const max=COMBO_STAGES[id]||1;return previous>=max?0:previous+1;}
export function dashVector(x,z,yaw,metres){return {x:x-Math.sin(yaw)*metres,z:z-Math.cos(yaw)*metres};}
export function orbitLocation(x,z,start,now,radius=8){const angle=(now-start)/1000*2.5;return {x:x+Math.cos(angle)*radius,z:z+Math.sin(angle)*radius};}
export function segmentDistance2D(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,u=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(px-ax-u*dx,pz-az-u*dz);}

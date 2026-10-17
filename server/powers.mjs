/** Regras de poderes autoritativas e testáveis, compartilhadas por todas as salas. */
export const POWER_RULES=Object.freeze({
  push:{name:'Repulsão',cooldown:14000,range:11},
  freeze:{name:'Congelar',cooldown:18000,range:25,duration:1000},
  teleport:{name:'Teleporte / retorno',cooldown:25000,range:35,returnWindow:5000},
  flight:{name:'Voo',cooldown:30000,duration:5000},
  invisible:{name:'Invisibilidade',cooldown:24000,duration:3000},
  phase:{name:'Intangibilidade',cooldown:38000,duration:6000}
});
export const VALID_POWERS=Object.keys(POWER_RULES);
export function sanitizeLoadout(input){
  const a=Array.isArray(input)?input:[];
  const first=VALID_POWERS.includes(a[0])?a[0]:'push';
  let second=VALID_POWERS.includes(a[1])?a[1]:'freeze';
  if(second===first)second=VALID_POWERS.find(x=>x!==first);
  return [first,second];
}
export function freshPowerState(){return {loadout:['push','freeze'],cooldowns:{},frozenUntil:0,flightUntil:0,invisibleUntil:0,phaseUntil:0,teleportReturn:null,safe:null};}
export function powerSnapshot(p,now=Date.now()){
  const s=p.powers;
  return {loadout:s.loadout,cooldowns:s.cooldowns,frozenUntil:s.frozenUntil,flightUntil:s.flightUntil,
    invisibleUntil:s.invisibleUntil,phaseUntil:s.phaseUntil,returnUntil:s.teleportReturn?.until||0,
    frozen:s.frozenUntil>now,flying:s.flightUntil>now,invisible:s.invisibleUntil>now,phased:s.phaseUntil>now};
}
export function within(x,z,p,range){return Math.hypot(x-p.x,z-p.z)<=range;}
export function locationValid(x,y,z,colliders,rangeBox=143){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||Math.abs(x)>rangeBox-.6||Math.abs(z)>rangeBox-.6||y<0||y>38)return false;
  return !colliders.some(b=>Math.abs(x-b.x)<b.hx+.42&&Math.abs(z-b.z)<b.hz+.42&&y<b.maxY+.04&&y+1.75>b.minY);
}
export function canCast(p,id,now=Date.now()){
  if(!POWER_RULES[id]||!p.alive||!p.powers.loadout.includes(id))return 'Habilidade não equipada.';
  if(p.powers.frozenUntil>now)return 'Você está congelado.';
  if(p.powers.phaseUntil>now&&id!=='phase')return 'Saia da intangibilidade antes.';
  if((p.powers.cooldowns[id]||0)>now)return 'Habilidade recarregando.';
  return null;
}

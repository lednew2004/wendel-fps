/** Regras de habilidades autoritativas; compartilhadas com os testes do servidor. */
export const POWER_RULES=Object.freeze({
 push:{name:'Repulsão',cooldown:14000,range:11},
 freeze:{name:'Congelar',cooldown:18000,range:25,duration:1000},
 teleport:{name:'Teleporte estratégico',cooldown:27000,range:410,returnWindow:12000},
 flight:{name:'Voo',cooldown:30000,duration:5000},
 invisible:{name:'Invisibilidade',cooldown:24000,duration:3000},
 phase:{name:'Intangibilidade',cooldown:38000,duration:6000},
 blackhole:{name:'Buraco Negro',cooldown:39000,range:30,duration:4000,radius:11},
 rewind:{name:'Reverter o Tempo',cooldown:42000,history:4000},
 chain:{name:'Corrente Elétrica',cooldown:24000,range:33,chainRadius:14},
 gravity:{name:'Gravidade Invertida',cooldown:33000,range:32,radius:10,duration:2000},
 clones:{name:'Clones Fantasmas',cooldown:30000,duration:8000},
 shield:{name:'Escudo Absoluto',cooldown:37000,duration:5000},
 swap:{name:'Troca Dimensional',cooldown:35000,range:45}
});
export const VALID_POWERS=Object.keys(POWER_RULES);
export function sanitizeLoadout(input){
 const a=Array.isArray(input)?input:[];
 const first=VALID_POWERS.includes(a[0])?a[0]:'push';
 let second=VALID_POWERS.includes(a[1])?a[1]:'freeze';
 if(second===first)second=VALID_POWERS.find(x=>x!==first);
 return [first,second];
}
export function freshPowerState(){return {loadout:['push','freeze'],cooldowns:{},frozenUntil:0,flightUntil:0,invisibleUntil:0,phaseUntil:0,shieldUntil:0,gravityUntil:0,teleportReturn:null,safe:null,history:[]};}
export function powerSnapshot(p,now=Date.now()){
 const s=p.powers;
 return {loadout:s.loadout,cooldowns:s.cooldowns,frozenUntil:s.frozenUntil,flightUntil:s.flightUntil,
 invisibleUntil:s.invisibleUntil,phaseUntil:s.phaseUntil,shieldUntil:s.shieldUntil,gravityUntil:s.gravityUntil,
 returnUntil:s.teleportReturn?.until||0,frozen:s.frozenUntil>now||s.gravityUntil>now,
 flying:s.flightUntil>now,invisible:s.invisibleUntil>now,phased:s.phaseUntil>now,shielded:s.shieldUntil>now};
}
export function within(x,z,p,range){return Math.hypot(x-p.x,z-p.z)<=range;}
export function locationValid(x,y,z,colliders,rangeBox=143){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||Math.abs(x)>rangeBox-.6||Math.abs(z)>rangeBox-.6||y<0||y>38)return false;
 return !colliders.some(b=>Math.abs(x-b.x)<b.hx+.42&&Math.abs(z-b.z)<b.hz+.42&&y<b.maxY+.04&&y+1.75>b.minY);
}
export function isGroundedDestination(x,y,z,colliders){
 if(!locationValid(x,y,z,colliders))return false;
 if(y<=.55)return !colliders.some(b=>Math.abs(x-b.x)<b.hx+.42&&Math.abs(z-b.z)<b.hz+.42&&b.minY<1&&b.maxY>1);
 return colliders.some(b=>Math.abs(x-b.x)<b.hx-.65&&Math.abs(z-b.z)<b.hz-.65&&Math.abs(y-b.maxY)<.65);
}
export function canCast(p,id,now=Date.now()){
 if(!POWER_RULES[id]||!p.alive||!p.powers.loadout.includes(id))return 'Habilidade não equipada.';
 if(p.powers.frozenUntil>now||p.powers.gravityUntil>now)return 'Você está imobilizado.';
 if(p.powers.phaseUntil>now&&id!=='phase')return 'Saia da intangibilidade antes.';
 if((p.powers.cooldowns[id]||0)>now)return 'Habilidade recarregando.';
 return null;
}

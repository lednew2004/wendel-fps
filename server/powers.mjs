import {POWER_VARIANTS} from '../public/src/heroRoster.js';
/** Regras de habilidades autoritativas; compartilhadas com os testes do servidor. */
const BASE_POWER_RULES=Object.freeze({
 push:{name:'Repulsão',cooldown:12000,range:16},
 freeze:{name:'Congelar',cooldown:18000,range:35,duration:1500},
 teleport:{name:'Teleporte estratégico',cooldown:28000,range:700,returnWindow:15000},
 flight:{name:'Voo',cooldown:21000,duration:7000},
 invisible:{name:'Invisibilidade',cooldown:24000,duration:5000},
 phase:{name:'Intangibilidade',cooldown:30000,duration:7000},
 blackhole:{name:'Buraco Negro',cooldown:38000,range:36,duration:5500,radius:18},
 rewind:{name:'Reverter o Tempo',cooldown:42000,history:10000},
 chain:{name:'Corrente Elétrica',cooldown:20000,range:42,chainRadius:18},
 gravity:{name:'Gravidade Invertida',cooldown:28000,range:40,radius:13,duration:2700},
 clones:{name:'Clones Fantasmas',cooldown:19000,duration:10000},
 clonejump:{name:'Salto dos Clones',cooldown:26000,duration:14000},
 shield:{name:'Escudo Absoluto',cooldown:31000,duration:7000},
 swap:{name:'Troca Dimensional',cooldown:28000,range:60},
 copy:{name:'Roubo de Habilidades',cooldown:36000,range:60,markDuration:18000,stealDuration:30000},
 resurrection:{name:'Ressurreição',cooldown:65000,duration:4000},
 heal:{name:'Cura',cooldown:22000,health:70,shield:25},
 morph:{name:'Disfarce em Objeto',cooldown:24000,duration:10000,range:6}
});
export const POWER_RULES=Object.freeze({...BASE_POWER_RULES,...Object.fromEntries(Object.entries(POWER_VARIANTS).map(([id,v])=>[id,{...BASE_POWER_RULES[v.base],...v,name:v.label,cooldown:v.cool*1000}]))});
export const VALID_POWERS=Object.keys(POWER_RULES);
export function sanitizeLoadout(input){
 const a=Array.isArray(input)?input:[];
 const first=VALID_POWERS.includes(a[0])?a[0]:'push';
 let second=VALID_POWERS.includes(a[1])?a[1]:'freeze';
 if(second===first)second=VALID_POWERS.find(x=>x!==first);
 if(a.length>=3){let third=VALID_POWERS.includes(a[2])?a[2]:'heal';if(third===first||third===second)third=VALID_POWERS.find(x=>x!==first&&x!==second);return [first,second,third];}
 return [first,second];
}
export function freshPowerState(){return {combo:{},empoweredUntil:0,loadout:['push','freeze'],cooldowns:{},activeUntil:{},cloneJumpUsed:false,copyMark:null,copiedUntil:0,originalLoadout:null,frozenUntil:0,flightUntil:0,invisibleUntil:0,phaseUntil:0,shieldUntil:0,gravityUntil:0,resurrectionUntil:0,propUntil:0,propType:null,teleportReturn:null,safe:null,history:[]};}
export function powerSnapshot(p,now=Date.now()){
 const s=p.powers;
 return {loadout:s.loadout,cooldowns:s.cooldowns,activeUntil:s.activeUntil,combo:s.combo||{},empoweredUntil:s.empoweredUntil||0,cloneJumpUsed:s.cloneJumpUsed,copiedUntil:s.copiedUntil,copyMarkUntil:s.copyMark?.until||0,frozenUntil:s.frozenUntil,flightUntil:s.flightUntil,
 invisibleUntil:s.invisibleUntil,phaseUntil:s.phaseUntil,shieldUntil:s.shieldUntil,gravityUntil:s.gravityUntil,
 returnUntil:s.teleportReturn?.until||0,resurrectionUntil:s.resurrectionUntil||0,propUntil:s.propUntil||0,propType:s.propUntil>now?s.propType:null,invulnerable:s.resurrectionUntil>now,
 frozen:s.frozenUntil>now||s.gravityUntil>now,
 flying:s.flightUntil>now,invisible:s.invisibleUntil>now,phased:s.phaseUntil>now,shielded:s.shieldUntil>now};
}
export function within(x,z,p,range){return Math.hypot(x-p.x,z-p.z)<=range;}
export function locationValid(x,y,z,colliders,rangeBox=219){
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
 if(id==='resurrection')return 'Ressurreição automática: aguarde um dano fatal.';
 if(p.powers.frozenUntil>now||p.powers.gravityUntil>now)return 'Você está imobilizado.';
 if(p.powers.phaseUntil>now&&id!=='phase')return 'Saia da intangibilidade antes.';
 if((p.powers.cooldowns[id]||0)>now)return 'Habilidade recarregando.';
 return null;
}

// Deterministic authored props: both the city client and server know these exact positions.
export const MORPH_BARRELS=Object.freeze([[-15,-18],[15,30],[44,14],[-44,-14],[-60,48],[-12,65],[12,-65],[-100,15],[100,-15]]);
export const MORPH_VEHICLES=Object.freeze([
 {x:-40,z:15,type:'truck'},{x:85,z:93,type:'truck'},
 {x:1,z:91,type:'forklift'},{x:-22,z:-104,type:'forklift'}
]);
export function nearbyMorphObject(x,z,range=POWER_RULES.morph.range){
 let best=null,distance=range;
 for(const [bx,bz] of MORPH_BARRELS){const d=Math.hypot(x-bx,z-bz);if(d<distance){distance=d;best={x:bx,z:bz,type:'barrel'};}}
 for(const obj of MORPH_VEHICLES){const d=Math.hypot(x-obj.x,z-obj.z);if(d<distance){distance=d;best={...obj};}}
 return best;
}
export const nearbyMorphBarrel=nearbyMorphObject;
// Automatic passive: never requires a manual cast, and never creates a kill for the opponent.
export function canAutoResurrect(p,now=Date.now()){
 const s=p.powers;return !!(p.alive&&s.loadout.includes('resurrection')&&(s.cooldowns.resurrection||0)<=now&&s.resurrectionUntil<=now);
}

/** High-impact activations incur additional recharge time. */
export function criticalPowerPenalty(id,{hpRatio=1,nearbyTargets=0,restoredHealth=0}={}){
 if(id==='heal'&&hpRatio<=.3)return 6000;
 if(id==='blackhole'&&nearbyTargets>=2)return 7000;
 if(id==='rewind'&&restoredHealth>=35)return 9000;
 return 0;
}

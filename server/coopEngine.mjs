import {SQUAD_POINTS,SQUAD_ENEMY_SPAWNS,roleForHero} from '../public/src/squadLayout.js';
const ENEMIES={scout:{hp:58,speed:5,damage:7,range:2.2},gunner:{hp:95,speed:3.2,damage:8,range:21},hunter:{hp:105,speed:6.1,damage:9,range:2.7},sniper:{hp:70,speed:2.8,damage:12,range:55},tank:{hp:230,speed:2.8,damage:16,range:2.8},boss:{hp:2500,speed:1.7,damage:17,range:29}};
export const COOP_STAGES=['waiting','defend','recon','sabotage','boss','extract','victory'];
export const COOP_LOCATIONS={defend:SQUAD_POINTS.defense,recon:SQUAD_POINTS.reconnaissance,sabotage:SQUAD_POINTS.sabotage,boss:SQUAD_POINTS.boss,extract:SQUAD_POINTS.extraction};
export function newCoop(){return {phase:'waiting',elapsed:0,defense:29,integrity:100,progress:0,enemies:[],nextId:0,spawnIn:1.4,round:1,extractProgress:0,finished:false};}
export function coopSnapshot(room){const c=room.coop;return {type:'coop-state',phase:c.phase,defense:Math.ceil(c.defense),integrity:Math.round(c.integrity),progress:Math.min(100,Math.round(c.progress)),roles:[...room.players.values()].filter(p=>p.socket).map(p=>({id:p.id,hero:p.hero,role:roleForHero(p.hero),alive:p.alive})),enemies:c.enemies.map(e=>({id:e.id,type:e.type,x:e.x,z:e.z,hp:Math.ceil(e.hp),maxHp:e.maxHp})),elapsed:Math.round(c.elapsed),waiting:Math.max(0,4-[...room.players.values()].filter(p=>p.socket).length)};}
function spawn(c,type,x,z){const conf=ENEMIES[type];if(!conf)return;const e={id:'c'+(++c.nextId),type,x,z,hp:conf.hp,maxHp:conf.hp,cool:1+Math.random(),v:conf};c.enemies.push(e);}
function phase(c,to){c.phase=to;c.elapsed=0;c.progress=0;c.spawnIn=2;c.enemies=[];if(to==='defend'){c.defense=29;c.integrity=100;}if(to==='boss'){spawn(c,'boss',SQUAD_POINTS.boss.x,SQUAD_POINTS.boss.z);spawn(c,'hunter',-31,124);spawn(c,'sniper',38,136);}if(to==='victory')c.finished=true;}
function nearRole(room,role,pos,range=22){return [...room.players.values()].some(p=>p.socket&&p.alive&&roleForHero(p.hero)===role&&Math.hypot(p.x-pos.x,p.z-pos.z)<range);}
function live(room){return [...room.players.values()].filter(p=>p.socket&&p.alive);}
function injure(p,dmg,actions){if(!p.alive)return;let left=dmg;const absorb=Math.min(p.shield,left);p.shield-=absorb;left-=absorb;p.hp=Math.max(0,p.hp-left);actions.push({kind:'damage',id:p.id,hp:p.hp,shield:p.shield});if(p.hp<=0){p.alive=false;p.coopReviveAt=Date.now()+7000;actions.push({kind:'down',id:p.id});}}
/** Drives one shared server-authoritative PvE operation for four unique roles. */
export function advanceCoop(room,dt,walkable=()=>true){const c=room.coop;if(!c)return[];const actions=[];
 const connected=[...room.players.values()].filter(p=>p.socket);
 if(c.phase==='waiting'){
   if(connected.length===4&&new Set(connected.map(p=>roleForHero(p.hero))).size===4){phase(c,'defend');actions.push({kind:'phase',phase:'defend'});}
   return actions;
 }
 if(c.finished)return actions;
 c.elapsed+=dt;
 for(const p of connected)if(!p.alive&&Date.now()>p.coopReviveAt){p.alive=true;p.hp=100;p.shield=40;const s=SQUAD_POINTS.insertion;Object.assign(p,{x:s.x,y:0,z:s.z,lastMove:Date.now(),spawnUntil:Date.now()+1800});actions.push({kind:'revive',id:p.id,x:p.x,z:p.z});}
 const members=live(room),pos=COOP_LOCATIONS[c.phase];
 if(c.phase==='defend'){
   c.defense=Math.max(0,c.defense-dt*(nearRole(room,'support',SQUAD_POINTS.defense,25)?1:.72));
   c.integrity=Math.min(100,c.integrity+(nearRole(room,'support',SQUAD_POINTS.defense,25)?dt*1.5:0));
   for(const e of c.enemies)if(Math.hypot(e.x-pos.x,e.z-pos.z)<16)c.integrity-=dt*1.1;
   if(c.integrity<=0){c.integrity=60;c.defense+=7;actions.push({kind:'overrun'});}
   if(c.defense<=0){phase(c,'recon');actions.push({kind:'phase',phase:'recon'});}
 }
 if(c.phase==='recon'||c.phase==='sabotage'){
   const role=c.phase==='recon'?'sniper':'bomber';
   if(nearRole(room,role,pos,17))c.progress+=dt*(role==='sniper'?23:19);
   else c.progress=Math.max(0,c.progress-dt*2);
   if(c.progress>=100){phase(c,role==='sniper'?'sabotage':'boss');actions.push({kind:'phase',phase:c.phase});}
 }
 if(c.phase==='boss'&&!c.enemies.some(e=>e.type==='boss')){phase(c,'extract');actions.push({kind:'phase',phase:'extract'});}
 if(c.phase==='extract'){
   const close=members.filter(p=>Math.hypot(p.x-pos.x,p.z-pos.z)<10).length;
   if(close>=Math.min(4,connected.length)&&close>=2)c.progress+=dt*34;else c.progress=Math.max(0,c.progress-dt*8);
   if(c.progress>=100){phase(c,'victory');actions.push({kind:'phase',phase:'victory'});}
 }
 if(!['defend','recon','sabotage','boss'].includes(c.phase))return actions;
 if(c.phase!=='boss'){
   c.spawnIn-=dt;if(c.spawnIn<=0&&c.enemies.length<6){const types=c.phase==='defend'?['scout','gunner','hunter']:c.phase==='recon'?['sniper','gunner']:['gunner','tank','hunter'];const type=types[Math.floor(Math.random()*types.length)],spots=SQUAD_ENEMY_SPAWNS.filter(([x,z])=>Math.hypot(x-pos.x,z-pos.z)<105);const s=spots[Math.floor(Math.random()*spots.length)]||SQUAD_ENEMY_SPAWNS[0];spawn(c,type,s[0],s[1]);c.spawnIn=3+Math.random()*1.6;}
 }
 for(const e of c.enemies){const options=members.length?members:[];let target=options[0],best=Infinity;
   for(const p of options){const d=Math.hypot(e.x-p.x,e.z-p.z)-(roleForHero(p.hero)==='front'?9:0);if(d<best){best=d;target=p;}}
   if(!target)continue;const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;
   if(d>Math.min(e.v.range*.80,e.type==='boss'?16:8)){const step=e.v.speed*dt,tx=e.x+dx/d*step,tz=e.z+dz/d*step;if(walkable(tx,tz)) {e.x=tx;e.z=tz;}else if(walkable(e.x+dz/d*step,e.z-dx/d*step)){e.x+=dz/d*step;e.z-=dx/d*step;}}
   e.cool-=dt;if(e.cool<=0&&d<e.v.range){injure(target,e.v.damage,actions);e.cool=e.type==='boss'?1.5:e.type==='sniper'?2.1:1.3;}
 }
 return actions;
}
export function coopFire(room,p,dir,origin,weapon,obscured){const c=room.coop;if(!c||!p.alive||['waiting','victory'].includes(c.phase))return null;
 let best=null,dist=weapon.range;
 for(const e of c.enemies){const y=e.type==='boss'?3.2:1.35,r=e.type==='boss'?4.0:1.15;
  const t=[e.x-origin[0],y-origin[1],e.z-origin[2]],proj=t[0]*dir[0]+t[1]*dir[1]+t[2]*dir[2],rad=t[0]*t[0]+t[1]*t[1]+t[2]*t[2]-proj*proj;
  if(proj<=0||proj>=dist||rad>r*r||obscured(origin,dir,proj,room))continue;dist=proj;best=e;
 }
 if(!best)return null;
 const damage=weapon.id===1?Math.max(12,Math.round(weapon.damage*(1-dist/45))):weapon.damage;
 best.hp=Math.max(0,best.hp-damage);if(best.hp<=0){c.enemies=c.enemies.filter(e=>e!==best);p.kills++;}
 return {id:best.id,hp:best.hp,dead:best.hp<=0,score:p.kills};
}
export function coopAbility(room,p,power){const c=room.coop;if(!c||['waiting','victory'].includes(c.phase))return 0;
 const targets=c.enemies.filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<(power==='shiro_ricochet'||power==='leo_barrage'?35:22));
 let hits=0;
 for(const e of targets){if(e.type==='boss'&&power==='copy')continue;e.hp=Math.max(0,e.hp-(power==='leo_barrage'?115:power==='shiro_ricochet'?90:power==='blackhole'?80:37));hits++;if(e.hp<=0){c.enemies=c.enemies.filter(v=>v!==e);p.kills++;}}
 return hits;
}

/** Cooperative support powers repair teammates inside the tactical radius. */
export function coopSupportPulse(room,caster,effect){
 if(!room?.coop||roleForHero(caster?.hero)!=='support'||!['heal','shield'].includes(effect))return [];
 const helped=[];
 for(const teammate of room.players.values()){
  if(teammate.id===caster.id||!teammate.socket||!teammate.alive||Math.hypot(teammate.x-caster.x,teammate.z-caster.z)>24)continue;
  const hp=Math.min(100,teammate.hp+(effect==='heal'?30:0));
  const shield=Math.min(40,teammate.shield+(effect==='heal'?20:28));
  if(hp!==teammate.hp||shield!==teammate.shield){teammate.hp=hp;teammate.shield=shield;helped.push({id:teammate.id,hp,shield});}
 }
 return helped;
}

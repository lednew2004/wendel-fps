import {HERO_COMBOS,dashVector,orbitLocation,segmentDistance2D} from '../public/src/heroCombos.js';
import {POWER_VARIANTS,heroById,heroLoadout,heroAllows,HEROES} from '../public/src/heroRoster.js';
/** TITAN PROTOCOL rooms + PvP. Node 22+, zero npm dependencies.
 * Designed for 2-8 players per room, authoritative health/kills, basic aim, rate and speed checks.
 * Deploy behind an HTTPS reverse proxy to expose WSS to browsers.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WORLD_HALF} from '../public/src/worldLayout.js';
import {observeAdaptation,learned,startUltimate,ADAPT_LABELS} from '../public/src/adaptation.js';
import {FFA_SPAWNS,SQUAD_START,roleForHero,ROLE_INFO,SQUAD_OBSTACLES} from '../public/src/squadLayout.js';
import {planVault,planSkyLeap,vaultPosition} from '../public/src/vaultTraversal.js';
import {FORGE_LIMIT,FORGE_LIFETIME,FORGE_RANGE,BLOCK_SIZE,snapVoxel,validVoxelPlacement,blockCollider} from '../public/src/voxelRules.js';
import {newCoop,advanceCoop,coopSnapshot,coopFire,coopAbility,coopSupportPulse} from './coopEngine.mjs';
import {POWER_RULES,sanitizeLoadout,freshPowerState,powerSnapshot,canCast,locationValid,isGroundedDestination,within,nearbyMorphObject,canAutoResurrect,criticalPowerPenalty} from './powers.mjs';

const root=path.resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const port=Number(process.env.PORT||3000);
const maxPlayers=8;
const RECONNECT_GRACE_MS=90000;
const WS_HEARTBEAT_MS=15000;
const WS_DEAD_MS=75000;
const rooms=new Map();
const players=new Map();
const SPAWNS=FFA_SPAWNS;
const AMMO_LOCATIONS=[...FFA_SPAWNS,...SQUAD_OBSTACLES.slice(0,8).map(b=>[b.x+8,b.z+8]),[-8,-155],[10,-150],[-5,-90],[60,-15],[-70,48],[0,130]];
const WEAPONS=[{id:0,damage:21,interval:.12,range:140},{id:1,damage:55,interval:.85,range:34},{id:2,damage:80,interval:1.24,range:180},{id:3,damage:17,interval:.095,range:130}];
const colliders=JSON.parse(fs.readFileSync(new URL('colliders.json',import.meta.url),'utf8'));
const interactions=JSON.parse(fs.readFileSync(new URL('interactables.json',import.meta.url),'utf8'));
const interactionIndex=new Map(interactions.map(x=>[x.id,x]));
function roomColliders(room){return room?[...colliders,...interactions.filter(o=>!room.openInteractions.has(o.id)),...(room.blocks||[]).map(blockCollider)]:colliders;}
function openList(room){return [...room.openInteractions];}
const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
const encode=data=>{
  const body=Buffer.from(JSON.stringify(data));
  let head;
  if(body.length<126){head=Buffer.from([0x81,body.length]);}
  else if(body.length<=65535){head=Buffer.alloc(4);head[0]=0x81;head[1]=126;head.writeUInt16BE(body.length,2);}
  else return null;
  return Buffer.concat([head,body]);
};
function send(ws,data){
  if(!ws||ws.destroyed||!ws.writable)return;
  // Do not queue seconds of old position snapshots on congested mobile links.
  if(data.type==='snapshot'&&ws.writableLength>40000)return;
  const buf=encode(data);if(buf&&ws.writableLength<320_000)ws.write(buf);
}
function broadcast(room,msg,except=null){for(const p of room.players.values())if(p.socket&&p.socket!==except)send(p.socket,msg);}
const cleanName=n=>String(n||'Operador').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18)||'Operador';
const cleanRoom=n=>String(n||'').replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,6);
function createRoom(preferredCode='',mode='ffa'){let code=preferredCode;if(!code){do{code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));}const room={code,mode,coop:mode==='coop'?newCoop():null,nextTeam:0,players:new Map(),born:Date.now(),hazards:[],clones:[],blocks:[],blockSequence:0,ammoCrates:[],ammoSerial:0,nextSupply:Date.now()+9000,openInteractions:new Set()};rooms.set(code,room);for(const [x,z] of AMMO_LOCATIONS.slice(0,6))if(locationValid(x,0,z,colliders))room.ammoCrates.push({id:'ammo-'+(++room.ammoSerial),x,z});return room;}
function spawn(i){const [x,z]=SPAWNS[i%SPAWNS.length];return {x,y:0,z};}
function publicPlayer(p){const powers=powerSnapshot(p);return {id:p.id,name:p.name,hero:p.hero||null,team:p.team??0,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,weapon:p.weapon,hp:p.hp,shield:p.shield,kills:p.kills,deaths:p.deaths,alive:p.alive,shielded:powers.shielded,invisible:powers.invisible,phased:powers.phased,flying:powers.flying,frozen:powers.frozen,prop:powers.propType,immortal:powers.invulnerable};}
const livePlayers=room=>[...room.players.values()].filter(p=>p.socket);
const cleanSession=s=>typeof s==='string'&&/^[a-zA-Z0-9-]{20,100}$/.test(s)?s:null;
function join(ws,data){
  if(players.has(ws))return;
  const name=cleanName(data.name);
  const hero=HEROES.some(h=>h.id===data.hero)?data.hero:null;
  const requestedMode=data.mode==='coop'?'coop':'ffa';
  const session=cleanSession(data.session);
  let room;
  if(data.create===true){
    const requested=typeof data.room==='string'?data.room.trim():'';
    if(requested&&!/^[A-Za-z0-9]{6}$/.test(requested)){
      send(ws,{type:'error',message:'Para criar uma sala com código próprio, use exatamente 6 letras ou números.'});return;
    }
    const code=requested.toUpperCase();
    if(code&&rooms.has(code)){
      send(ws,{type:'error',message:'Este código já está em uso. Escolha outro ou clique em ENTRAR NA SALA.'});return;
    }
    room=createRoom(code,requestedMode);
  }else room=rooms.get(cleanRoom(data.room));
  if(!room){send(ws,{type:'error',message:'Sala não encontrada ou expirada. Peça um novo código ao anfitrião.'});return;}
  if(room.mode!==requestedMode){send(ws,{type:'error',message:'Modo diferente do modo da sala. Selecione PVP ou COOP corretamente.'});return;}

  // The session token lives only on the player's browser, never in public room snapshots.
  // A temporary network loss does not erase the room, score or available slot.
  const existing=session?[...room.players.values()].find(p=>p.session===session):null;
  if(existing){
    const old=existing.socket;
    if(old&&old!==ws){players.delete(old);old.destroy();}
    existing.socket=ws;existing.disconnectedAt=0;
    existing.lastMove=Date.now();existing.lastSeen=Date.now();
    players.set(ws,existing);
    send(ws,{type:'welcome',id:existing.id,room:room.code,
      spawn:{x:existing.x,y:existing.y,z:existing.z},resumed:true,
      players:livePlayers(room).map(publicPlayer),powers:powerSnapshot(existing),blocks:room.blocks,supplies:room.ammoCrates,openInteractions:openList(room),builderUntil:existing.builderUntil||0,builderUltimateUntil:existing.builderUltimateUntil||0,mode:room.mode,coop:room.coop?coopSnapshot(room):null});
    broadcast(room,{type:'joined',player:publicPlayer(existing)},ws);
    return;
  }

  if(room.players.size>=(room.mode==='coop'?4:maxPlayers)){send(ws,{type:'error',message:room.mode==='coop'?'Esquadrão completo (4 jogadores).':'Esta sala está cheia (8 jogadores).'});return;}
  if(room.mode==='coop'&&(!hero||[...room.players.values()].some(p=>roleForHero(p.hero)===roleForHero(hero)))){send(ws,{type:'error',message:'O COOP exige um herói de função diferente: Frente, Suporte, Sniper e Bomber.'});return;}
  const id=crypto.randomBytes(5).toString('hex');
  const s=room.mode==='coop'?{x:SQUAD_START.x+(room.players.size%2?3:-3),y:0,z:SQUAD_START.z+Math.floor(room.players.size/2)*3}:spawn(room.players.size);
  const p={id,name,session,socket:ws,room,team:room.mode==='coop'?0:room.nextTeam++,x:s.x,y:s.y,z:s.z,yaw:0,pitch:0,
    hero,weapon:Number.isInteger(data.weapon)&&data.weapon>=0&&data.weapon<4&&(room.mode!=='coop'||ROLE_INFO[roleForHero(hero)]?.weapons.includes(data.weapon))?data.weapon:0,hp:100,shield:40,kills:0,deaths:0,alive:true,spawnUntil:Date.now()+1200,
    lastMove:Date.now(),lastFire:0,lastDash:0,lastSeen:Date.now(),disconnectedAt:0,powers:freshPowerState()};
  p.powers.loadout=hero?heroLoadout(hero):sanitizeLoadout(data.loadout);
  room.players.set(id,p);players.set(ws,p);
  send(ws,{type:'welcome',id,room:room.code,spawn:s,
    players:livePlayers(room).map(publicPlayer),powers:powerSnapshot(p),blocks:room.blocks,supplies:room.ammoCrates,openInteractions:openList(room),mode:room.mode,coop:room.coop?coopSnapshot(room):null});
  broadcast(room,{type:'joined',player:publicPlayer(p)},ws);
}
function interactWorld(p,id){
  const item=interactionIndex.get(id);
  if(!item||!p.alive||!p.socket){send(p.socket,{type:'world-error',message:'Objeto indisponível.'});return;}
  if(Math.hypot(item.x-p.x,item.z-p.z)>3.2||p.y>item.maxY+1.1){send(p.socket,{type:'world-error',message:'Chegue mais perto para interagir.'});return;}
  const room=p.room,closing=room.openInteractions.has(id);
  if(closing){
    const blocked=[...room.players.values()].some(other=>other.alive&&!locationValid(other.x,other.y,other.z,[item]));
    if(blocked){send(p.socket,{type:'world-error',message:'Há alguém na passagem.'});return;}
    room.openInteractions.delete(id);
  }else room.openInteractions.add(id);
  broadcast(room,{type:'world-interaction',id,kind:item.kind,open:!closing});
}
function depart(ws,manual=false){
  const p=players.get(ws);if(!p)return;
  players.delete(ws);
  if(p.socket!==ws)return;
  p.socket=null;
  // Explicit leave always removes the slot. Network loss retains it briefly.
  if(manual||!p.session){
    p.room.players.delete(p.id);
  }else{
    p.disconnectedAt=Date.now();
  }
  broadcast(p.room,{type:'left',id:p.id});
  if(p.room.players.size===0)rooms.delete(p.room.code);
}
function hitBox(origin,dir,max,box){
  const min=[box.x-box.hx,box.minY,box.z-box.hz],maxs=[box.x+box.hx,box.maxY,box.z+box.hz];
  let lo=0,hi=max;
  for(let i=0;i<3;i++){
    if(Math.abs(dir[i])<1e-7){if(origin[i]<min[i]||origin[i]>maxs[i])return false;continue;}
    let a=(min[i]-origin[i])/dir[i],b=(maxs[i]-origin[i])/dir[i];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;
  }
  return lo<max&&hi>=0;
}
function obscured(origin,dir,dist,room){
  for(const box of roomColliders(room))if(hitBox(origin,dir,dist-.15,box))return true;
  return false;
}
function dropForgeBlock(room,block){
 room.blocks=room.blocks.filter(b=>b.id!==block.id);
 broadcast(room,{type:'builder-remove',id:block.id});
}
function blastForgeBlock(room,start,attacker=null){
 const q=[start],visited=new Set();
 while(q.length&&visited.size<14){const b=q.shift();if(!b||visited.has(b.id))continue;visited.add(b.id);
  if(b.armed){for(const other of room.blocks)if(other.armed&&!visited.has(other.id)&&Math.hypot(other.x-b.x,other.z-b.z,other.y-b.y)<4.8)q.push(other);}
  dropForgeBlock(room,b);
  if(b.armed&&attacker)for(const victim of room.players.values())if(victim.alive&&victim.id!==attacker.id&&victim.team!==attacker.team){const distance=Math.hypot(victim.x-b.x,victim.z-b.z,victim.y+1-b.y);if(distance<5.7)applyAbilityDamage(attacker,victim,Math.round(90*(1-distance/6)),Date.now(),'explosion');}
  broadcast(room,{type:'builder-blast',x:b.x,y:b.y,z:b.z,armed:b.armed});
 }
}
function rayBoxDistance(o,d,b,reach){const box=blockCollider(b),bounds=[[box.x-box.hx,box.x+box.hx],[box.minY,box.maxY],[box.z-box.hz,box.z+box.hz]];let t0=0,t1=reach;
 for(let i=0;i<3;i++){const [min,max]=bounds[i];if(Math.abs(d[i])<1e-8){if(o[i]<min||o[i]>max)return Infinity;continue;}let a=(min-o[i])/d[i],c=(max-o[i])/d[i];if(a>c)[a,c]=[c,a];t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return Infinity;}
 return t0;
}
function placeForgeBlock(p,pos){
 const t=Date.now(),room=p.room;
 if(!p.alive||p.hero!=='forge'||(p.builderUntil||0)<=t&&(p.builderUltimateUntil||0)<=t)return;
 if(t-(p.lastBuild||0)<((p.builderUltimateUntil||0)>t?125:210))return;
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||!Number.isFinite(pos.z))return;
 const candidate={x:snapVoxel(pos.x),y:snapVoxel(pos.y),z:snapVoxel(pos.z)};
 const solids=roomColliders(room);
 if(!validVoxelPlacement(candidate,p,[],solids)||Math.abs(candidate.y-(p.y+1))>FORGE_RANGE)return;
 if([...room.players.values()].some(other=>other.alive&&Math.abs(other.x-candidate.x)<1.15&&Math.abs(other.z-candidate.z)<1.15&&other.y<candidate.y+1.1&&other.y+1.8>candidate.y-.9))return;
 const forward=[-Math.sin(p.yaw),-Math.cos(p.yaw)];const dx=candidate.x-p.x,dz=candidate.z-p.z,len=Math.hypot(dx,dz)||1;
 if((dx*forward[0]+dz*forward[1])/len<.28)return;
 const capacity=(p.builderUltimateUntil||0)>t?60:FORGE_LIMIT;
 const mine=room.blocks.filter(b=>b.owner===p.id);
 if(mine.length>=capacity)dropForgeBlock(room,mine[0]);
 if(room.blocks.length>=180)dropForgeBlock(room,room.blocks[0]);
 const b={id:p.id+'-'+(++room.blockSequence),owner:p.id,...candidate,armed:false,hp:3,until:t+FORGE_LIFETIME};room.blocks.push(b);p.lastBuild=t;
 broadcast(room,{type:'builder-place',block:b});
}
function move(p,data){
  if(!p.alive||p.vaultTrack||p.powers.frozenUntil>Date.now()||p.powers.gravityUntil>Date.now()||(p.comboDashUntil||0)>Date.now())return;
  const {x,y,z,yaw,pitch,weapon}=data;
  if(!finite(x,-WORLD_HALF,WORLD_HALF)||!finite(z,-WORLD_HALF,WORLD_HALF)||!finite(y,-1,40)||!finite(yaw,-1e7,1e7)||!finite(pitch,-1.48,1.48)||!Number.isInteger(weapon)||weapon<0||weapon>3)return;
  if(p.room.mode==='coop'&&!ROLE_INFO[roleForHero(p.hero)]?.weapons.includes(weapon))return;
  const now=Date.now();const dt=limit((now-p.lastMove)/1000,.01,.35);
  const distance=Math.hypot(x-p.x,z-p.z);
  const dy=Math.abs(y-p.y);
  const flying=p.powers.flightUntil>now;const phased=p.powers.phaseUntil>now;
  // Client dash has a cooldown; authoritative speed checks still reject invalid teleports.
  if(distance>Math.max(3.2,(flying?35:42)*dt+1.0)||dy>Math.max(2.4,(flying?22:17)*dt+1.0))return;
  if(!phased&&!flying&&!locationValid(x,y,z,roomColliders(p.room)))return;
  if(!phased&&!flying)p.powers.safe={x,y,z};
  p.x=x;p.y=y;p.z=z;p.yaw=yaw;p.pitch=pitch;p.weapon=weapon;p.lastMove=now;p.lastSeen=now;
 for(const crate of [...p.room.ammoCrates])if(Math.hypot(p.x-crate.x,p.z-crate.z)<1.9&&p.y<3){p.room.ammoCrates=p.room.ammoCrates.filter(b=>b!==crate);broadcast(p.room,{type:'ammo-remove',id:crate.id});send(p.socket,{type:'ammo-refill'});}
}
function fire(p,data){
  if(!p.alive)return;
  const now=Date.now();
  if(p.powers.frozenUntil>now||p.powers.gravityUntil>now||p.powers.phaseUntil>now)return;
  if(p.powers.invisibleUntil>now||p.powers.propUntil>now){p.powers.invisibleUntil=0;p.powers.propUntil=0;p.powers.propType=null;broadcast(p.room,{type:'power-status',player:p.id,powers:powerSnapshot(p)});}
  const w=WEAPONS[p.weapon];
  if(now-p.lastFire<Math.max(45,w.interval*1000*.85))return;
  p.lastFire=now;
  // Aim is based on server's last received yaw/pitch, not on client-provided hit IDs.
  const cp=Math.cos(p.pitch),dir=[-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp];
  const origin=[p.x,p.y+1.65,p.z];
  let voxel=null,hitDistance=w.range;for(const b of p.room.blocks){const distance=rayBoxDistance(origin,dir,b,w.range);if(distance<hitDistance){hitDistance=distance;voxel=b;}}
  let staticDepth=w.range;
  if(voxel){for(const box of colliders){staticDepth=Math.min(staticDepth,rayBoxDistance(origin,dir,box,w.range));if(staticDepth<hitDistance-.01)break;}
    if(staticDepth>=hitDistance-.01)for(const box of interactions)if(!p.room.openInteractions.has(box.id)){staticDepth=Math.min(staticDepth,rayBoxDistance(origin,dir,box,w.range));if(staticDepth<hitDistance-.01)break;}}
  if(voxel&&hitDistance<=staticDepth+.01){if(voxel.armed){blastForgeBlock(p.room,voxel,p.room.players.get(voxel.owner)||p);}else{voxel.hp--;if(voxel.hp<=0)dropForgeBlock(p.room,voxel);}broadcast(p.room,{type:'shot',id:p.id,weapon:p.weapon});return;}
  if(p.room.mode==='coop'){
    const hit=coopFire(p.room,p,dir,origin,w,obscured);
    broadcast(p.room,{type:'shot',id:p.id,weapon:p.weapon});
    if(hit){send(p.socket,{type:'coop-hit',...hit});if(hit.dead)broadcast(p.room,{type:'coop-kill',owner:p.id,enemy:hit.id});}
    return;
  }
  let victim=null,nearest=w.range;
  for(const target of p.room.players.values()){
    if(target.id===p.id||target.team===p.team||!target.alive||now<target.spawnUntil||target.powers.phaseUntil>now)continue;
    // sphere approximation at torso. Aiming at head counts via the same hit body volume.
    const to=[target.x-origin[0],target.y+1.08-origin[1],target.z-origin[2]];
    const projection=to[0]*dir[0]+to[1]*dir[1]+to[2]*dir[2];
    if(projection<0||projection>nearest)continue;
    const side=(to[0]**2+to[1]**2+to[2]**2)-projection**2;
    if(side>.82**2||obscured(origin,dir,projection,p.room))continue;
    nearest=projection;victim=target;
  }
  // A decoy intercepts hits before an actual player if it is closer to the shooter.
  let cloneHit=null,cloneDistance=nearest;
  for(const clone of p.room.clones){
    if(clone.owner===p.id||clone.until<now)continue;
    const diff=[clone.x-origin[0],clone.y+1.08-origin[1],clone.z-origin[2]];
    const proj=diff[0]*dir[0]+diff[1]*dir[1]+diff[2]*dir[2];
    const side=diff[0]**2+diff[1]**2+diff[2]**2-proj**2;
    if(proj>0&&proj<cloneDistance&&side<.82**2&&!obscured(origin,dir,proj,p.room)){cloneDistance=proj;cloneHit=clone;}
  }
  broadcast(p.room,{type:'shot',id:p.id,weapon:p.weapon});
  if(cloneHit){p.room.clones=p.room.clones.filter(c=>c!==cloneHit);broadcast(p.room,{type:'clone-destroy',id:cloneHit.id});return;}
  if(!victim)return;
  let damage=w.damage;
  if(p.powers.empoweredUntil>Date.now()){damage=Math.round(damage*1.9);p.powers.empoweredUntil=0;notifyPower(p,'shiro_retreat');}
  // Shotgun is strong at close range and weaker at distance.
  if(p.weapon===1)damage=Math.max(12,Math.round(damage*(1-nearest/45)));
  if(victim.powers.resurrectionUntil>now)return;
  if(adaptedAgainst(victim,'kinetic',now))return;
  if(victim.powers.shieldUntil>now){send(p.socket,{type:'power-vfx',kind:'shield-hit',player:victim.id,x:victim.x,y:victim.y,z:victim.z});return;}
  // One emergency fatal prevention per absolute evolution, never unlimited invulnerability.
  if(victim.hero==='adaptomega'&&victim.powers.adaptUltimateUntil>now&&victim.powers.adaptFatalBlock&&damage>=victim.hp+victim.shield){
    victim.powers.adaptFatalBlock=false;victim.powers.adaptLast='kinetic';notifyPower(victim,'adaptation');
    broadcast(victim.room,{type:'power-vfx',kind:'adaptation',player:victim.id,x:victim.x,y:victim.y,z:victim.z});return;
  }
  const absorbed=Math.min(victim.shield,damage);victim.shield-=absorbed;victim.hp=Math.max(0,victim.hp-(damage-absorbed));
  if(victim.hp<=0&&autoResurrect(victim,now)){send(p.socket,{type:'hit',victim:victim.id,hp:victim.hp,shield:victim.shield});return;}
  send(p.socket,{type:'hit',victim:victim.id,hp:victim.hp,shield:victim.shield});
  broadcast(p.room,{type:'health',id:victim.id,hp:victim.hp,shield:victim.shield});
  if(victim.hp>0){send(victim.socket,{type:'damaged',hp:victim.hp,shield:victim.shield,attacker:p.name});return;}
  victim.alive=false;victim.deaths++;p.kills++;completeMarkedCopy(p,victim,now);
  const death={type:'kill',attacker:p.id,attackerName:p.name,victim:victim.id,victimName:victim.name,kills:p.kills,deaths:victim.deaths};
  broadcast(p.room,death);
  setTimeout(()=>{
    if(victim.room.players.get(victim.id)!==victim||victim.alive)return;
    const s=spawn(victim.deaths%SPAWNS.length);Object.assign(victim,s,{hp:100,shield:40,alive:true,spawnUntil:Date.now()+1600,lastMove:Date.now()});
    victim.vaultTrack=null;victim.powers.flightUntil=0;victim.powers.phaseUntil=0;victim.powers.invisibleUntil=0;victim.powers.frozenUntil=0;victim.powers.teleportReturn=null;victim.powers.shieldUntil=0;victim.powers.gravityUntil=0;victim.powers.history=[];victim.powers.copyMark=null;victim.powers.copiedUntil=0;victim.powers.propUntil=0;victim.powers.propType=null;victim.powers.resurrectionUntil=0;victim.powers.combo={};victim.powers.empoweredUntil=0;if(victim.powers.originalLoadout){victim.powers.loadout=sanitizeLoadout(victim.powers.originalLoadout);victim.powers.originalLoadout=null;}
    send(victim.socket,{type:'respawn',spawn:s,hp:100,shield:40,powers:powerSnapshot(victim)});
    broadcast(p.room,{type:'revived',player:publicPlayer(victim)},victim.socket);
  },2200);
}
function adaptedAgainst(victim,kind,now=Date.now()){
 if(victim.hero!=='adaptomega' || !victim.alive)return false;
 const result=observeAdaptation(victim.powers,kind,now);
 if(result.learned){
   notifyPower(victim,'adaptation');
   broadcast(victim.room,{type:'power-vfx',kind:'adaptation',player:victim.id,x:victim.x,y:victim.y,z:victim.z,event:kind});
   send(victim.socket,{type:'adapt-learned',event:kind,blocked:result.blocked});
 }
 return result.blocked;
}
function vaultEndpoint(p){
 // Roof vaults are server planned: no client-chosen teleport destinations.
 const origin={x:p.x,y:p.y,z:p.z,yaw:p.yaw};
 return planSkyLeap(origin,roomColliders(p.room),(x,y,z)=>isGroundedDestination(x,y,z,roomColliders(p.room))) ||
        planVault(origin,SQUAD_OBSTACLES,(x,y,z)=>isGroundedDestination(x,y,z,roomColliders(p.room))); 
}
function autoResurrect(p,now=Date.now()){
 if(!canAutoResurrect(p,now))return false;
 const state=p.powers;state.cooldowns.resurrection=now+POWER_RULES.resurrection.cooldown;
 state.resurrectionUntil=now+POWER_RULES.resurrection.duration;state.activeUntil.resurrection=state.resurrectionUntil;
 p.hp=100;p.shield=40;p.alive=true;p.spawnUntil=state.resurrectionUntil;
 state.propUntil=0;state.propType=null;
 broadcast(p.room,{type:'health',id:p.id,hp:p.hp,shield:p.shield});
 broadcast(p.room,{type:'power-vfx',kind:'resurrection',player:p.id,x:p.x,y:p.y,z:p.z,until:state.resurrectionUntil});
 notifyPower(p,'resurrection');return true;
}
function projectedVictim(p,range,angle=.55){
  const now=Date.now();const cp=Math.cos(p.pitch),dir=[-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp];
  let nearest=null,minDist=Infinity;
  for(const v of p.room.players.values()){
    if(v.id===p.id||v.team===p.team||!v.alive||v.powers.phaseUntil>now)continue;
    const dx=v.x-p.x,dz=v.z-p.z,dist=Math.hypot(dx,dz);if(dist>range||dist<.01)continue;
    const dot=(dx*(-Math.sin(p.yaw))+dz*(-Math.cos(p.yaw)))/dist;
    if(dot<angle||obscured([p.x,p.y+1.4,p.z],dir,dist))continue;
    if(dist<minDist){minDist=dist;nearest=v;}
  }
  return nearest;
}
function notifyPower(p,id){send(p.socket,{type:'power-state',powers:powerSnapshot(p)});broadcast(p.room,{type:'power-status',player:p.id,powers:powerSnapshot(p)},p.socket);}
function applyAbilityDamage(attacker,victim,damage,now=Date.now(),kind='energy'){
 if(attacker.team===victim.team||!victim.alive||victim.powers.phaseUntil>now||victim.powers.shieldUntil>now||victim.powers.resurrectionUntil>now)return false;
 if(adaptedAgainst(victim,kind,now))return false;
 if(victim.hero==='adaptomega'&&victim.powers.adaptUltimateUntil>now&&victim.powers.adaptFatalBlock&&damage>=victim.hp+victim.shield){victim.powers.adaptFatalBlock=false;notifyPower(victim,'adaptation');return false;}
 const absorbed=Math.min(victim.shield,damage);victim.shield-=absorbed;victim.hp=Math.max(0,victim.hp-damage+absorbed);
 if(victim.hp===0&&autoResurrect(victim,now))return true;
 broadcast(attacker.room,{type:'health',id:victim.id,hp:victim.hp,shield:victim.shield});
 send(victim.socket,{type:'damaged',hp:victim.hp,shield:victim.shield,attacker:attacker.name});
 if(victim.hp===0){
   victim.alive=false;victim.deaths++;attacker.kills++;completeMarkedCopy(attacker,victim,now);
   broadcast(attacker.room,{type:'kill',attacker:attacker.id,attackerName:attacker.name,victim:victim.id,victimName:victim.name,kills:attacker.kills,deaths:victim.deaths});
   setTimeout(()=>{
     if(victim.room.players.get(victim.id)!==victim||victim.alive)return;
     const sp=spawn(victim.deaths%SPAWNS.length);Object.assign(victim,sp,{hp:100,shield:40,alive:true,spawnUntil:Date.now()+1600,lastMove:Date.now()});
     const selected=victim.powers.originalLoadout||victim.powers.loadout;victim.powers=freshPowerState();victim.powers.loadout=sanitizeLoadout(selected);
     send(victim.socket,{type:'respawn',spawn:sp,hp:100,shield:40,powers:powerSnapshot(victim)});
     broadcast(attacker.room,{type:'revived',player:publicPlayer(victim)},victim.socket);
   },2200);
 }
 return true;
}
function completeMarkedCopy(attacker,victim,now){
 const state=attacker.powers,mark=state.copyMark;
 if(!mark||mark.id!==victim.id||mark.until<now)return;
 state.copyMark=null;
 if(!state.originalLoadout)state.originalLoadout=[...state.loadout];
 // Copied skills come from the defeated player's actual server-side equipped powers.
 state.loadout=sanitizeLoadout([...victim.powers.loadout]);
 state.copiedUntil=now+POWER_RULES.copy.stealDuration;
 send(attacker.socket,{type:'power-copy',from:victim.name,until:state.copiedUntil,powers:powerSnapshot(attacker)});
 notifyPower(attacker,'copy');
}
function advanceClone(c,dt,room){
 let nextX=c.x+Math.sin(c.angle)*c.speed*dt;
 let nextZ=c.z+Math.cos(c.angle)*c.speed*dt;
 if(!locationValid(nextX,c.y,nextZ,roomColliders(room))){
   c.angle+=(c.turn||1)*Math.PI*.55;c.turn=-(c.turn||1);
   nextX=c.x+Math.sin(c.angle)*c.speed*dt;nextZ=c.z+Math.cos(c.angle)*c.speed*dt;
 }
 if(locationValid(nextX,c.y,nextZ,roomColliders(room))){c.x=nextX;c.z=nextZ;}
}
function aimPoint(p,range){
 const cp=Math.cos(p.pitch),distance=Math.min(range,20);
 return {x:limit(p.x-Math.sin(p.yaw)*cp*distance,-WORLD_HALF+4,WORLD_HALF-4),z:limit(p.z-Math.cos(p.yaw)*cp*distance,-WORLD_HALF+4,WORLD_HALF-4)};
}
function comboDash(p,metres,now,backward=false,direction=null){
 const dir=backward?-1:1,from={x:p.x,y:p.y,z:p.z};let to={...from};
 for(let step=.5;step<=metres;step+=.5){const target=dashVector(from.x,from.z,p.yaw,step*dir,direction);if(!locationValid(target.x,p.y,target.z,roomColliders(p.room)))break;to={x:target.x,y:p.y,z:target.z};}
 Object.assign(p,to,{lastMove:now});
 p.comboDashUntil=now+340;
 broadcast(p.room,{type:'power-effect',kind:'combo-dash',player:p.id,id:p._currentCombo||'',from,to,duration:340});
 return {from,to};
}
function comboDamageNear(p,x,z,radius,damage,now){
 for(const other of p.room.players.values())if(other.id!==p.id&&other.team!==p.team&&other.alive&&Math.hypot(other.x-x,other.z-z)<=radius)applyAbilityDamage(p,other,damage,now);
}
/** Three-stage ability combos. The client never supplies a destination or a victim ID. */
function castHeroCombo(p,data,now=Date.now()){
 const id=data.id,rule=POWER_RULES[id],s=p.powers;
 if(!HERO_COMBOS[id])return false;
 if(!p.alive||!s.loadout.includes(id)||s.frozenUntil>now||s.gravityUntil>now||s.phaseUntil>now){send(p.socket,{type:'power-error',message:'Habilidade não equipada ou personagem impedido.'});return true;}
 s.combo||={};const previous=s.combo[id];const phase=previous?.until>now?previous:null;
 if(!phase&&(s.cooldowns[id]||0)>now){send(p.socket,{type:'power-error',message:'Habilidade recarregando.'});return true;}
 let next=null,kind=id,point=null;
 const start=()=>{s.cooldowns[id]=now+rule.cooldown;s.activeUntil[id]=now+(rule.duration||2000);};
 const move=(n,back=false)=>{p._currentCombo=id;const result=comboDash(p,n,now,back,{x:data.dx,z:data.dz});delete p._currentCombo;point=result.to;return result;};
 if(id==='shiro_step'){
  if(!phase){move(7);next={step:1,until:now+12000};s.cooldowns[id]=next.until+rule.cooldown;}
  else{move(9);comboDamageNear(p,p.x,p.z,4.8,56,now);next=null;s.cooldowns[id]=now+rule.cooldown;}
 }else if(id==='shiro_retreat'){
  move(8,true);s.empoweredUntil=now+6000;start();s.activeUntil[id]=s.empoweredUntil;
 }else if(id==='shiro_ricochet'){
  const victims=[...p.room.players.values()].filter(t=>t.id!==p.id&&t.alive&&Math.hypot(t.x-p.x,t.z-p.z)<45).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,5);
  victims.forEach((t,i)=>applyAbilityDamage(p,t,Math.max(18,64-i*9),now));
  s.shieldUntil=now+5000;s.activeUntil[id]=s.shieldUntil;start();s.activeUntil[id]=s.shieldUntil;
  broadcast(p.room,{type:'power-vfx',kind:'chain',player:p.id,targets:victims.map(t=>({x:t.x,y:t.y,z:t.z,id:t.id}))});
 }else if(id==='leo_dash'){
  if(!phase){next={step:1,until:now+12000,origin:{x:p.x,y:p.y,z:p.z}};move(7);s.cooldowns[id]=next.until+rule.cooldown;}
  else if(phase.step===1){move(8);next={...phase,step:2};}
  else{const origin=phase.origin;if(origin&&locationValid(origin.x,origin.y,origin.z,roomColliders(p.room))){Object.assign(p,origin,{lastMove:now});point=origin;broadcast(p.room,{type:'power-effect',kind:'combo-move',player:p.id,...origin});}s.cooldowns[id]=now+rule.cooldown;}
 }else if(id==='leo_immunity'){
  s.shieldUntil=now+1000;s.activeUntil[id]=s.shieldUntil;start();s.activeUntil[id]=s.shieldUntil;
 }else if(id==='leo_barrage'){
  start();s.shieldUntil=now+2800;s.activeUntil[id]=s.shieldUntil;
  // Three global telegraphed strikes; server applies damage even if attackers disconnect.
  for(let i=0;i<3;i++)setTimeout(()=>{
   if(!p.room.players.has(p.id))return;
   const t=Date.now();for(const enemy of p.room.players.values())if(enemy.id!==p.id&&enemy.team!==p.team&&enemy.alive)applyAbilityDamage(p,enemy,26,t);
   broadcast(p.room,{type:'power-vfx',kind:'leo-barrage',player:p.id,x:p.x,y:p.y,z:p.z,wave:i+1});
  },i*540);
 }else if(id==='butterfly_dash'){
  if(!phase){const origin={x:p.x,y:p.y,z:p.z};let to=origin;for(let k=.5;k<=10;k+=.5){const q=dashVector(origin.x,origin.z,p.yaw,k,{x:data.dx,z:data.dz});if(!locationValid(q.x,p.y,q.z,roomColliders(p.room)))break;to={x:q.x,y:p.y,z:q.z};}Object.assign(p,to,{lastMove:now});broadcast(p.room,{type:'power-effect',kind:'combo-move',player:p.id,...to});next={step:1,until:now+12000,origin};s.cooldowns[id]=next.until+rule.cooldown;}
  else{if(phase.origin&&locationValid(phase.origin.x,phase.origin.y,phase.origin.z,roomColliders(p.room))){Object.assign(p,phase.origin,{lastMove:now});point=phase.origin;broadcast(p.room,{type:'power-effect',kind:'combo-move',player:p.id,...point});}s.cooldowns[id]=now+rule.cooldown;}
 }else if(id==='butterfly_orbit'){
  if(!phase){next={step:1,until:now+12000,started:now};s.cooldowns[id]=next.until+rule.cooldown;s.activeUntil[id]=next.until;}
  else{const dest=orbitLocation(p.x,p.z,phase.started,now,8);if(locationValid(dest.x,p.y,dest.z,roomColliders(p.room))){Object.assign(p,{x:dest.x,z:dest.z,lastMove:now});point={x:p.x,y:p.y,z:p.z};broadcast(p.room,{type:'power-effect',kind:'combo-move',player:p.id,...point});}s.cooldowns[id]=now+rule.cooldown;}
 }else if(id==='butterfly_launch'){
  if(!phase){const origin={x:p.x,y:p.y,z:p.z},endpoint=dashVector(p.x,p.z,p.yaw,27);let result=origin;
   for(let k=1;k<=27;k++){const q=dashVector(p.x,p.z,p.yaw,k);if(!locationValid(q.x,p.y,q.z,roomColliders(p.room)))break;result={x:q.x,y:p.y,z:q.z};}
   for(const enemy of p.room.players.values())if(enemy.id!==p.id&&enemy.team!==p.team&&enemy.alive&&segmentDistance2D(enemy.x,enemy.z,p.x,p.z,result.x,result.z)<5){const dx=enemy.x-p.x,dz=enemy.z-p.z,d=Math.hypot(dx,dz)||1;for(let n=1;n<=8;n++){const nx=enemy.x+dx/d*n,nz=enemy.z+dz/d*n;if(!locationValid(nx,enemy.y,nz,roomColliders(p.room)))break;Object.assign(enemy,{x:nx,z:nz,lastMove:now});}applyAbilityDamage(p,enemy,34,now);broadcast(p.room,{type:'power-effect',kind:'push',player:enemy.id,x:enemy.x,y:enemy.y,z:enemy.z});}
   next={step:1,until:now+12000,orb:result};s.cooldowns[id]=next.until+rule.cooldown;point=result;
  }else{const orb=phase.orb;if(orb&&locationValid(orb.x,orb.y,orb.z,roomColliders(p.room))){Object.assign(p,orb,{lastMove:now});point=orb;broadcast(p.room,{type:'power-effect',kind:'combo-move',player:p.id,...orb});}s.cooldowns[id]=now+rule.cooldown;}
 }
 if(next)s.combo[id]=next;else delete s.combo[id];
 broadcast(p.room,{type:'power-vfx',kind,id,phase:next?.step||0,player:p.id,x:p.x,y:p.y,z:p.z,point});
 notifyPower(p,id);return true;
}
function castPower(p,data){
  if(HERO_COMBOS[data.id]){castHeroCombo(p,data);return;}
  const id=data.id,effect=POWER_VARIANTS[id]?.base||id,now=Date.now(),state=p.powers,rule=POWER_RULES[id];
  if(!rule){send(p.socket,{type:'power-error',message:'Habilidade desconhecida.'});return;}
  // Reativação autorizada: escolha apenas clones seus, existentes e ainda ativos.
  if(effect==='morph'&&data.cancel===true){if(state.propUntil>now){state.propUntil=0;state.propType=null;notifyPower(p,id);}return;}
  if(effect==='clonejump'&&data.jump===true){
    const clone=p.room.clones.find(c=>c.owner===p.id&&c.power==='clonejump'&&c.until>now);
    if(!p.alive||state.frozenUntil>now||state.gravityUntil>now||state.phaseUntil>now||!state.loadout.includes(id)||state.cloneJumpUsed||!clone){send(p.socket,{type:'power-error',message:'Clone móvel indisponível.'});return;}
    if(!locationValid(clone.x,clone.y,clone.z,roomColliders(p.room))){send(p.socket,{type:'power-error',message:'O clone está em uma posição bloqueada.'});return;}
    const origin={x:p.x,y:p.y,z:p.z};
    Object.assign(p,{x:clone.x,y:clone.y,z:clone.z,lastMove:now});
    Object.assign(clone,origin);state.cloneJumpUsed=true;state.activeUntil.clonejump=0;
    broadcast(p.room,{type:'clone-move',id:clone.id,x:clone.x,y:clone.y,z:clone.z,until:clone.until});
    broadcast(p.room,{type:'power-effect',kind:'clonejump',player:p.id,x:p.x,y:p.y,z:p.z});
    notifyPower(p,id);return;
  }
  if(effect==='teleport'&&data.back===true){
    const ret=state.teleportReturn;
    if(!ret||ret.until<now){send(p.socket,{type:'power-error',message:'Tempo de retorno expirou.'});return;}
    state.teleportReturn=null;
    if(isGroundedDestination(ret.x,ret.y,ret.z,roomColliders(p.room))){
      Object.assign(p,{x:ret.x,y:ret.y,z:ret.z,lastMove:now});
      broadcast(p.room,{type:'power-effect',kind:'teleport-back',player:p.id,x:p.x,y:p.y,z:p.z});
    }
    notifyPower(p,id);return;
  }
  const error=canCast(p,id,now);
  if(error){send(p.socket,{type:'power-error',message:error});return;}
  let target=null;
  if(effect==='teleport'){
    const t=data.target||{};
    if(!within(Number(t.x),Number(t.z),p,rule.range)||!isGroundedDestination(t.x,t.y,t.z,roomColliders(p.room))){
      send(p.socket,{type:'power-error',message:'Destino inválido ou longe demais.'});return;
    }
    target={x:t.x,y:t.y,z:t.z};
  }
  if(effect==='freeze'||effect==='chain'||effect==='gravity'||effect==='swap'||effect==='copy'){
    target=projectedVictim(p,rule.range,.77);
    if(!target){send(p.socket,{type:'power-error',message:'Mire em um adversário próximo.'});return;}
  }
  if(effect==='swap'&&(!isGroundedDestination(p.x,p.y,p.z,roomColliders(p.room))||!isGroundedDestination(target.x,target.y,target.z,roomColliders(p.room)))){send(p.socket,{type:'power-error',message:'Troca indisponível nestas posições.'});return;}
  if(effect==='morph'&&!nearbyMorphObject(p.x,p.z,rule.range)){send(p.socket,{type:'power-error',message:'Aproxime-se de um tambor, caminhão ou empilhadeira.'});return;}
  if(effect==='rewind'&&(!state.history.length||state.history[0].t>now-rule.history+600)){send(p.socket,{type:'power-error',message:'Aguarde para acumular o histórico temporal.'});return;}
  const hpRatio=p.hp/100;
  const blackholeCenter=effect==='blackhole'?aimPoint(p,rule.range):null;
  const nearbyTargets=blackholeCenter?[...p.room.players.values()].filter(v=>v.id!==p.id&&v.alive&&Math.hypot(v.x-blackholeCenter.x,v.z-blackholeCenter.z)<rule.radius).length:0;
  const pendingRewind=effect==='rewind'&&state.history.length?state.history.reduce((best,h)=>Math.abs(h.t-(now-rule.history))<Math.abs(best.t-(now-rule.history))?h:best,state.history[0]):null;
  const restoredHealth=pendingRewind?Math.max(0,pendingRewind.hp-p.hp):0;
  if(effect==='adapt_counter'&&(!state.adaptLast||!learned(state,state.adaptLast,now))){send(p.socket,{type:'power-error',message:'Aprenda um ataque antes de contra-atacar.'});return;}
  if(effect==='forge_redstone'&&!p.room.blocks.some(b=>b.owner===p.id)){send(p.socket,{type:'power-error',message:'Construa ao menos um bloco antes de armar a Redstone.'});return;}
  const plannedVault=effect==='vault'?vaultEndpoint(p):null;
  if(effect==='vault'&&(!plannedVault||p.vaultTrack)){send(p.socket,{type:'power-error',message:'Aproxime-se e mire para um muro alto do mapa.'});return;}
  state.cooldowns[id]=now+rule.cooldown+criticalPowerPenalty(effect,{hpRatio,nearbyTargets,restoredHealth});
  if(rule.duration)state.activeUntil[id]=now+rule.duration;
  if(effect==='vault'){
    p.vaultTrack={...plannedVault,started:now};
    broadcast(p.room,{type:'power-effect',...plannedVault,kind:'vault',player:p.id});
  }else if(effect==='forge_build'){
    p.builderUntil=now+rule.duration;broadcast(p.room,{type:'power-vfx',kind:'forge_build',player:p.id});
  }else if(effect==='forge_ultimate'){
    p.builderUltimateUntil=now+rule.duration;broadcast(p.room,{type:'power-vfx',kind:'forge_ultimate',player:p.id});
  }else if(effect==='forge_redstone'){
    const blocks=p.room.blocks.filter(b=>b.owner===p.id);for(const b of blocks)b.armed=true;
    p.builderUntil=now;p.builderUltimateUntil=now;
    broadcast(p.room,{type:'builder-arm',owner:p.id});
  }else if(effect==='wallrun_boost'||effect==='vex_ultimate'){
    broadcast(p.room,{type:'power-vfx',kind:effect,player:p.id,x:p.x,y:p.y,z:p.z});
  }else if(effect==='adapt_scan'){
    state.adaptScanUntil=now+8000;
  }else if(effect==='adapt_ultimate'){
    startUltimate(state,now);
    broadcast(p.room,{type:'power-vfx',kind:'adapt_ultimate',player:p.id,x:p.x,y:p.y,z:p.z});
  }else if(effect==='adapt_counter'){
    const kind=state.adaptLast;
    const enemyList=[...p.room.players.values()].filter(q=>q!==p&&q.team!==p.team&&q.alive&&Math.hypot(q.x-p.x,q.z-p.z)<=15);
    for(const enemy of enemyList)applyAbilityDamage(p,enemy,kind==='explosion'?85:55,now);
    broadcast(p.room,{type:'power-vfx',kind:'adapt_counter',player:p.id,x:p.x,y:p.y,z:p.z,event:kind});
  }else if(effect==='heal'){
    p.hp=Math.min(100,p.hp+rule.health);p.shield=Math.min(40,p.shield+rule.shield);
    broadcast(p.room,{type:'health',id:p.id,hp:p.hp,shield:p.shield});
    broadcast(p.room,{type:'power-vfx',kind:'heal',player:p.id,x:p.x,y:p.y,z:p.z});
  }else if(effect==='morph'){
    const object=nearbyMorphObject(p.x,p.z,rule.range);state.propType=object.type;state.propUntil=now+rule.duration;
    broadcast(p.room,{type:'power-vfx',kind:'morph',player:p.id,x:p.x,y:p.y,z:p.z});
  }else if(effect==='push'){
    for(const v of p.room.players.values()){
      if(v.id===p.id||v.team===p.team||!v.alive||v.powers.phaseUntil>now||!within(v.x,v.z,p,rule.range)||adaptedAgainst(v,'push',now))continue;
      const dist=Math.hypot(v.x-p.x,v.z-p.z)||1,dx=(v.x-p.x)/dist,dz=(v.z-p.z)/dist;
      let pos={x:v.x,y:v.y,z:v.z};
      // Move only along collision-free samples: no wall clipping.
      for(let step=.65;step<=9;step+=.65){const x=v.x+dx*step,z=v.z+dz*step;if(!locationValid(x,v.y,z,roomColliders(p.room)))break;pos={x,y:v.y,z};}
      Object.assign(v,pos,{lastMove:now});
      broadcast(p.room,{type:'power-effect',kind:'push',player:v.id,dx,dz,x:v.x,y:v.y,z:v.z});
    }
    broadcast(p.room,{type:'power-vfx',kind:'push',player:p.id,x:p.x,y:p.y,z:p.z});
  }else if(effect==='freeze'){
    if(adaptedAgainst(target,'freeze',now)){}else target.powers.frozenUntil=now+rule.duration;
    if(target.powers.frozenUntil>now)broadcast(p.room,{type:'power-effect',kind:'freeze',player:target.id,until:target.powers.frozenUntil});
  }else if(effect==='teleport'){
    state.teleportReturn={x:p.x,y:p.y,z:p.z,until:now+rule.returnWindow};
    Object.assign(p,target,{lastMove:now});
    broadcast(p.room,{type:'power-effect',kind:'teleport',player:p.id,...target});
  }else if(effect==='copy'){
    state.copyMark={id:target.id,until:now+rule.markDuration};
    state.activeUntil.copy=state.copyMark.until;
    send(p.socket,{type:'power-effect',kind:'copy-mark',player:p.id,target:target.id,until:state.copyMark.until});
    broadcast(p.room,{type:'power-vfx',kind:'copy-mark',player:p.id,x:target.x,y:target.y,z:target.z},p.socket);
  }else if(effect==='blackhole'){
    const center=aimPoint(p,rule.range);const hazard={id:crypto.randomBytes(4).toString('hex'),x:center.x,z:center.z,until:now+rule.duration,radius:rule.radius,owner:p.id};
    p.room.hazards.push(hazard);broadcast(p.room,{type:'power-vfx',kind:'blackhole',player:p.id,...hazard});
  }else if(effect==='rewind'){
    const targetTime=now-rule.history;
    const point=state.history.reduce((best,h)=>Math.abs(h.t-targetTime)<Math.abs(best.t-targetTime)?h:best,state.history[0]);
    if(point&&isGroundedDestination(point.x,point.y,point.z,roomColliders(p.room))){
      Object.assign(p,{x:point.x,y:point.y,z:point.z,hp:Math.min(100,point.hp),shield:Math.min(40,point.shield),lastMove:now});
      send(p.socket,{type:'health',id:p.id,hp:p.hp,shield:p.shield});
      broadcast(p.room,{type:'health',id:p.id,hp:p.hp,shield:p.shield});
      broadcast(p.room,{type:'power-effect',kind:'rewind',player:p.id,x:p.x,y:p.y,z:p.z});
    }
  }else if(effect==='chain'){
    const victims=[target];const dealt=new Set([p.id,target.id]);
    while(victims.length<(rule.targets||3)){let next=null,dist=Infinity;const prev=victims[victims.length-1];
      for(const q of p.room.players.values()){const d=Math.hypot(q.x-prev.x,q.z-prev.z);if(!dealt.has(q.id)&&q.alive&&q.powers.phaseUntil<now&&d<rule.chainRadius&&d<dist){next=q;dist=d;}}
      if(!next)break;victims.push(next);dealt.add(next.id);
    }
    victims.forEach((v,i)=>applyAbilityDamage(p,v,(rule.damage||[85,64,46])[i],now));
    broadcast(p.room,{type:'power-vfx',kind:'chain',player:p.id,targets:victims.map(v=>({x:v.x,y:v.y,z:v.z,id:v.id}))});
  }else if(effect==='gravity'){
    const affected=[];
    for(const q of p.room.players.values())if(q.id!==p.id&&q.team!==p.team&&q.alive&&q.powers.phaseUntil<now&&Math.hypot(q.x-target.x,q.z-target.z)<=rule.radius){
      if(adaptedAgainst(q,'gravity',now))continue;
      q.powers.gravityUntil=now+rule.duration;q.powers.gravityOrigin=q.y;q.y=Math.min(37,q.y+3.5);q.lastMove=now;
      affected.push(q.id);
    }
    broadcast(p.room,{type:'power-vfx',kind:'gravity',player:p.id,x:target.x,y:target.y,z:target.z,affected});
  }else if(effect==='swap'){
    const origin={x:p.x,y:p.y,z:p.z};const destination={x:target.x,y:target.y,z:target.z};
    Object.assign(p,destination,{lastMove:now});Object.assign(target,origin,{lastMove:now});
    broadcast(p.room,{type:'power-effect',kind:'swap',player:p.id,...destination});
    broadcast(p.room,{type:'power-effect',kind:'swap',player:target.id,...origin});
  }else if(effect==='clones'||effect==='clonejump'){
    const clones=[];
    if(effect==='clonejump'){
      state.cloneJumpUsed=false;
      for(const old of p.room.clones.filter(c=>c.owner===p.id&&c.power==='clonejump'))broadcast(p.room,{type:'clone-destroy',id:old.id});
      p.room.clones=p.room.clones.filter(c=>c.owner!==p.id||c.power!=='clonejump');
    }
    const count=effect==='clonejump'?1:3;
    for(let i=0;i<count;i++){
      const forwardX=-Math.sin(p.yaw),forwardZ=-Math.cos(p.yaw),sideX=-forwardZ,sideZ=forwardX;
      const distance=effect==='clonejump'?4:2,lateral=effect==='clonejump'?0:(i-1)*3;
      const x=limit(p.x+forwardX*distance+sideX*lateral,-WORLD_HALF+4,WORLD_HALF-4);
      const z=limit(p.z+forwardZ*distance+sideZ*lateral,-WORLD_HALF+4,WORLD_HALF-4);
      if(locationValid(x,p.y,z,roomColliders(p.room))){
        const clone={id:crypto.randomBytes(4).toString('hex'),owner:p.id,power:id,slot:i,x,z,y:p.y,until:now+rule.duration,angle:p.yaw+Math.PI,speed:effect==='clonejump'?7.5:6.3,turn:1};
        p.room.clones.push(clone);clones.push(clone);
      }
    }
    if(effect==='clonejump'&&!clones.length){delete state.cooldowns[id];delete state.activeUntil[id];send(p.socket,{type:'power-error',message:'Sem espaço para criar o clone móvel.'});return;}
    broadcast(p.room,{type:'power-vfx',kind:'clones',player:p.id,clones});
  }else if(effect==='shield'){state.shieldUntil=now+rule.duration;
  }else if(effect==='flight'){state.flightUntil=now+rule.duration;
  }else if(effect==='invisible'){state.invisibleUntil=now+rule.duration;
  }else if(effect==='phase'){state.phaseUntil=now+rule.duration;state.safe=locationValid(p.x,p.y,p.z,roomColliders(p.room))?{x:p.x,y:p.y,z:p.z}:state.safe;}
  notifyPower(p,id);
}
function onMessage(ws,data){
  if(!data||typeof data!=='object'||typeof data.type!=='string')return;
  if(data.type==='join'){join(ws,data);return;}
  const p=players.get(ws);if(!p)return;
  if(data.type==='ping'){
    p.lastSeen=Date.now();
    send(ws,{type:'pong',t:Number.isFinite(data.t)?data.t:0});
  }
  else if(data.type==='move')move(p,data);
  else if(data.type==='fire')fire(p,data);
  else if(data.type==='world-interact')interactWorld(p,data.id);
  else if(data.type==='builder-place')placeForgeBlock(p,data.pos);
  else if(data.type==='dash'){const now=Date.now(),cooldown=4800;const left=Math.max(0,cooldown-(now-p.lastDash));if(!p.alive||p.powers.frozenUntil>now||p.powers.gravityUntil>now){send(ws,{type:'dash-state',ok:false,remaining:Math.max(left,500)});}else if(left>0){send(ws,{type:'dash-state',ok:false,remaining:left});}else{p.lastDash=now;send(ws,{type:'dash-state',ok:true,remaining:cooldown});}}
  else if(data.type==='equip'){p.powers.loadout=p.hero?heroLoadout(p.hero):sanitizeLoadout(data.loadout);p.powers.copiedUntil=0;p.powers.originalLoadout=null;p.powers.copyMark=null;send(ws,{type:'power-state',powers:powerSnapshot(p)});}
  else if(data.type==='power'){
    if(p.room.mode==='coop'){
      const id=data.id,rule=POWER_RULES[id],effect=POWER_VARIANTS[id]?.base||id,now=Date.now();
      const needsTarget=['freeze','chain','gravity','swap','copy'].includes(effect);
      if(needsTarget&&rule){
        const error=canCast(p,id,now);
        if(error)send(p.socket,{type:'power-error',message:error});
        else {p.powers.cooldowns[id]=now+rule.cooldown;const hits=coopAbility(p.room,p,id);send(p.socket,{type:'power-state',powers:powerSnapshot(p)});broadcast(p.room,{type:'power-vfx',kind:effect,player:p.id,x:p.x,y:p.y,z:p.z,hits});}
      }else{
        const before=p.powers.cooldowns[id]||0;castPower(p,data);
        if(id&&p.powers.cooldowns[id]>before){
          const hits=coopAbility(p.room,p,id);if(hits)broadcast(p.room,{type:'power-vfx',kind:id,player:p.id,x:p.x,y:p.y,z:p.z,hits});
          // A Support specialist heals/reinforces nearby squad members as well as themself.
          const helped=coopSupportPulse(p.room,p,effect);
          for(const ally of helped)broadcast(p.room,{type:'health',id:ally.id,hp:ally.hp,shield:ally.shield});
        }
      }
    }else castPower(p,data);
  }
  else if(data.type==='leave'){depart(ws,true);ws.end(Buffer.from([0x88,0x00]));}
}
function setupSocket(ws){
  ws._buffer=Buffer.alloc(0);let closed=false;
  ws.setNoDelay(true);
  ws.setKeepAlive(true,30000);
  ws._lastAlive=Date.now();
  // Ping/pong is independent of game FPS and browser render throttling.
  ws._heartbeat=setInterval(()=>{
    if(ws.destroyed){clearInterval(ws._heartbeat);return;}
    if(Date.now()-ws._lastAlive>WS_DEAD_MS){ws.destroy();return;}
    if(ws.writable&&ws.writableLength<160000)ws.write(Buffer.from([0x89,0x00]));
  },WS_HEARTBEAT_MS);
  ws._heartbeat.unref();
  ws.on('data',data=>{
    ws._lastAlive=Date.now();
    if(ws._buffer.length+data.length>64000){ws.destroy();return;}
    ws._buffer=Buffer.concat([ws._buffer,data]);
    let offset=0;
    while(ws._buffer.length-offset>=2){
      const a=ws._buffer[offset],b=ws._buffer[offset+1];
      const opcode=a&0x0f, masked=(b&128)!==0;
      let length=b&127,header=2;
      if(length===126){if(ws._buffer.length-offset<4)break;length=ws._buffer.readUInt16BE(offset+2);header=4;}
      if(length===127||!masked||length>8192){ws.destroy();return;}
      if(ws._buffer.length-offset<header+4+length)break;
      const mask=ws._buffer.subarray(offset+header,offset+header+4);
      const payload=Buffer.from(ws._buffer.subarray(offset+header+4,offset+header+4+length));
      for(let i=0;i<length;i++)payload[i]^=mask[i%4];
      offset+=header+4+length;
      if(opcode===8){ws.end(Buffer.from([0x88,0x00]));return;}
      if(opcode===9){const pong=Buffer.from([0x8a,payload.length]);ws.write(Buffer.concat([pong,payload]));continue;}
      if(opcode===10){ws._lastAlive=Date.now();continue;}
      if(opcode!==1)continue;
      try{onMessage(ws,JSON.parse(payload.toString('utf8')));}catch{send(ws,{type:'error',message:'Mensagem inválida.'});}
    }
    ws._buffer=ws._buffer.subarray(offset);
  });
  ws.once('close',()=>{clearInterval(ws._heartbeat);if(!closed){closed=true;depart(ws);}});
  ws.once('error',()=>{ws.destroy();});
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.glb':'model/gltf-binary','.json':'application/json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  if(['/health','/api/health'].includes(req.url?.split('?')[0])){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,rooms:rooms.size,players:players.size,uptimeSeconds:Math.floor(process.uptime()),version:'3.7.0'}));return;}
  let relative;
  try{relative=decodeURIComponent((req.url||'/').split('?')[0]);}catch{res.writeHead(400);res.end();return;}
  if(relative==='/')relative='/index.html';
  const abs=path.resolve(root,'.'+relative);
  if(!abs.startsWith(root+path.sep)||relative.split('/').some(s=>s.startsWith('.')&&s.length>1)||abs.includes(path.sep+'server'+path.sep)||abs.includes(path.sep+'tests'+path.sep)){
    res.writeHead(403);res.end('Forbidden');return;
  }
  fs.stat(abs,(err,st)=>{
    if(err||!st.isFile()){res.writeHead(404);res.end('Not found');return;}
    const ext=path.extname(abs);
    const cache=['.html','.js','.css'].includes(ext)?'no-store':'public, max-age=3600';
    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':cache});
    fs.createReadStream(abs).pipe(res);
  });
});
server.on('upgrade',(req,socket)=>{
  if(!['/ws','/api/ws'].includes(req.url?.split('?')[0])||req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||!req.headers['sec-websocket-key']){socket.destroy();return;}
  if(process.env.ALLOWED_ORIGIN && req.headers.origin!==process.env.ALLOWED_ORIGIN){socket.destroy();return;}
  const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  setupSocket(socket);
});
const tick=setInterval(()=>{
  for(const room of rooms.values()){
    const now=Date.now();
    for(const b of [...room.blocks])if(b.until<now)dropForgeBlock(room,b);
    if(room.nextSupply<=now){room.nextSupply=now+10000;if(room.ammoCrates.length<10){const [x,z]=AMMO_LOCATIONS[(room.ammoSerial+3)%AMMO_LOCATIONS.length];if(locationValid(x,0,z,colliders)){const crate={id:'ammo-'+(++room.ammoSerial),x,z};room.ammoCrates.push(crate);broadcast(room,{type:'ammo-spawn',crate});}}}
    for(const p of room.players.values()){
      if(p.vaultTrack&&!p.alive)p.vaultTrack=null;
      if(p.vaultTrack){
        const move=p.vaultTrack;const t=Math.min(1,(now-move.started)/move.duration);
        const q=vaultPosition(move,t);p.x=q.x;p.y=q.y;p.z=q.z;p.lastMove=now;
        if(t>=1){p.vaultTrack=null;p.powers.safe={x:p.x,y:p.y,z:p.z};}
      }
      if(p.powers.phaseUntil&&p.powers.phaseUntil<=now){p.powers.phaseUntil=0;const safe=p.powers.safe;if(!locationValid(p.x,p.y,p.z,roomColliders(p.room))&&safe&&locationValid(safe.x,safe.y,safe.z,roomColliders(room))){Object.assign(p,safe,{lastMove:now});broadcast(room,{type:'power-effect',kind:'phase-exit',player:p.id,...safe});}}}
    for(const p of room.players.values()){
      if(p.powers.gravityUntil&&p.powers.gravityUntil<=now){
        p.powers.gravityUntil=0;
        if(Number.isFinite(p.powers.gravityOrigin)){p.y=p.powers.gravityOrigin;p.powers.gravityOrigin=null;}
        p.lastMove=now;
        broadcast(room,{type:'power-effect',kind:'gravity-land',player:p.id,x:p.x,y:p.y,z:p.z});
      }
      if(!p.alive)continue;
      const hist=p.powers.history;
      hist.push({t:now,x:p.x,y:p.y,z:p.z,hp:p.hp,shield:p.shield});
      while(hist.length>0&&hist[0].t<now-11500)hist.shift();
    }
    for(let i=room.hazards.length-1;i>=0;i--){
      const h=room.hazards[i];if(h.until<now){room.hazards.splice(i,1);continue;}
      for(const q of room.players.values()){
        if(q.id===h.owner||!q.alive||q.powers.phaseUntil>now)continue;
        const distance=Math.hypot(q.x-h.x,q.z-h.z);
        if(distance<.6||distance>h.radius)continue;
        // Strong implosion: ~15-23 meters / second; obey the map's collision volumes.
        const pull=Math.min(2.2,Math.max(.8,(h.radius-distance)*.18));
        let px=q.x,pz=q.z;
        const travelSteps=Math.ceil(pull/.30);
        for(let j=0;j<travelSteps;j++){
          const remain=Math.hypot(h.x-px,h.z-pz);
          if(remain<=.65)break;
          const step=Math.min(.30,pull/travelSteps,remain-.65);
          const nx=px+(h.x-px)/remain*step,nz=pz+(h.z-pz)/remain*step;
          if(!locationValid(nx,q.y,nz,roomColliders(room)))break;
          px=nx;pz=nz;
        }
        if(px!==q.x||pz!==q.z){q.x=px;q.z=pz;q.lastMove=now;broadcast(room,{type:'power-effect',kind:'blackhole-pull',player:q.id,x:q.x,y:q.y,z:q.z});}
      }
    }
    for(const clone of room.clones){if(clone.until>now){advanceClone(clone,.1,room);broadcast(room,{type:'clone-move',id:clone.id,x:clone.x,y:clone.y,z:clone.z,until:clone.until});}}
    const expired=room.clones.filter(c=>c.until<=now);
    room.clones=room.clones.filter(c=>c.until>now);
    for(const clone of expired)broadcast(room,{type:'clone-destroy',id:clone.id});
    for(const player of room.players.values()){
      const powers=player.powers;
      if(powers.copyMark?.until<=now)powers.copyMark=null;
      if(powers.adaptations?.length)powers.adaptations=powers.adaptations.filter(a=>a.until>now);
      if(powers.copiedUntil&&powers.copiedUntil<=now){powers.loadout=sanitizeLoadout(powers.originalLoadout);powers.originalLoadout=null;powers.copiedUntil=0;notifyPower(player,'copy');}
    }
    if(room.mode==='coop'){
      const actions=advanceCoop(room,.1,(x,z)=>locationValid(x,0,z,colliders));
      for(const action of actions){
        if(action.kind==='damage'||action.kind==='down'){
          const victim=room.players.get(action.id);if(victim){send(victim.socket,{type:'damaged',hp:victim.hp,shield:victim.shield});broadcast(room,{type:'health',id:victim.id,hp:victim.hp,shield:victim.shield});if(action.kind==='down')send(victim.socket,{type:'coop-downed'});}
        }else if(action.kind==='revive'){
          const revived=room.players.get(action.id);if(revived){send(revived.socket,{type:'respawn',spawn:{x:action.x,y:0,z:action.z},hp:100,shield:40,powers:powerSnapshot(revived)});broadcast(room,{type:'revived',player:publicPlayer(revived)},revived.socket);}
        }else if(action.kind==='phase')broadcast(room,{type:'coop-phase',phase:action.phase});
      }
      if(Math.floor(now/200)!==Math.floor((now-100)/200))broadcast(room,coopSnapshot(room));
    }
    const list=livePlayers(room).map(publicPlayer);
    broadcast(room,{type:'snapshot',players:list});
  }
},100);tick.unref();
// Expire only abandoned sessions, not the whole room on the first transient drop.
const cleanup=setInterval(()=>{
  const now=Date.now();
  for(const room of rooms.values()){
    for(const p of room.players.values()){
      if(!p.socket&&p.disconnectedAt&&now-p.disconnectedAt>RECONNECT_GRACE_MS){
        room.players.delete(p.id);
      }
    }
    if(!room.players.size)rooms.delete(room.code);
  }
},10000);cleanup.unref();
server.listen(port,'0.0.0.0',()=>console.log(`TITAN MULTIPLAYER HTTP + WS em http://localhost:${port}`));
export {server,rooms,players};

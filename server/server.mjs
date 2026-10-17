/** TITAN PROTOCOL rooms + PvP. Node 22+, zero npm dependencies.
 * Designed for 2-8 players per room, authoritative health/kills, basic aim, rate and speed checks.
 * Deploy behind an HTTPS reverse proxy to expose WSS to browsers.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {POWER_RULES,sanitizeLoadout,freshPowerState,powerSnapshot,canCast,locationValid,isGroundedDestination,within} from './powers.mjs';

const root=path.resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const port=Number(process.env.PORT||3000);
const maxPlayers=8;
const RECONNECT_GRACE_MS=90000;
const WS_HEARTBEAT_MS=15000;
const WS_DEAD_MS=75000;
const rooms=new Map();
const players=new Map();
const SPAWNS=[[-38,18],[38,18],[-38,-18],[38,-18],[-60,6],[60,6],[0,66],[0,-66]];
const WEAPONS=[{id:0,damage:21,interval:.12,range:140},{id:1,damage:55,interval:.85,range:34},{id:2,damage:80,interval:1.24,range:180},{id:3,damage:17,interval:.095,range:130}];
const colliders=JSON.parse(fs.readFileSync(new URL('colliders.json',import.meta.url),'utf8'));
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
function createRoom(preferredCode=''){let code=preferredCode;if(!code){do{code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));}const room={code,players:new Map(),born:Date.now(),hazards:[],clones:[]};rooms.set(code,room);return room;}
function spawn(i){const [x,z]=SPAWNS[i%SPAWNS.length];return {x,y:0,z};}
function publicPlayer(p){const powers=powerSnapshot(p);return {id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,weapon:p.weapon,hp:p.hp,shield:p.shield,kills:p.kills,deaths:p.deaths,alive:p.alive,shielded:powers.shielded,invisible:powers.invisible,phased:powers.phased,flying:powers.flying,frozen:powers.frozen};}
const livePlayers=room=>[...room.players.values()].filter(p=>p.socket);
const cleanSession=s=>typeof s==='string'&&/^[a-zA-Z0-9-]{20,100}$/.test(s)?s:null;
function join(ws,data){
  if(players.has(ws))return;
  const name=cleanName(data.name);
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
    room=createRoom(code);
  }else room=rooms.get(cleanRoom(data.room));
  if(!room){send(ws,{type:'error',message:'Sala não encontrada ou expirada. Peça um novo código ao anfitrião.'});return;}

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
      players:livePlayers(room).map(publicPlayer),powers:powerSnapshot(existing)});
    broadcast(room,{type:'joined',player:publicPlayer(existing)},ws);
    return;
  }

  if(room.players.size>=maxPlayers){send(ws,{type:'error',message:'Esta sala está cheia (8 jogadores).'});return;}
  const id=crypto.randomBytes(5).toString('hex');
  const s=spawn(room.players.size);
  const p={id,name,session,socket:ws,room,x:s.x,y:s.y,z:s.z,yaw:0,pitch:0,
    weapon:0,hp:100,shield:40,kills:0,deaths:0,alive:true,spawnUntil:Date.now()+1200,
    lastMove:Date.now(),lastFire:0,lastDash:0,lastSeen:Date.now(),disconnectedAt:0,powers:freshPowerState()};
  p.powers.loadout=sanitizeLoadout(data.loadout);
  room.players.set(id,p);players.set(ws,p);
  send(ws,{type:'welcome',id,room:room.code,spawn:s,
    players:livePlayers(room).map(publicPlayer),powers:powerSnapshot(p)});
  broadcast(room,{type:'joined',player:publicPlayer(p)},ws);
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
function obscured(origin,dir,dist){
  for(const box of colliders)if(hitBox(origin,dir,dist-.15,box))return true;
  return false;
}
function move(p,data){
  if(!p.alive||p.powers.frozenUntil>Date.now()||p.powers.gravityUntil>Date.now())return;
  const {x,y,z,yaw,pitch,weapon}=data;
  if(!finite(x,-143,143)||!finite(z,-143,143)||!finite(y,-1,40)||!finite(yaw,-1e7,1e7)||!finite(pitch,-1.48,1.48)||!Number.isInteger(weapon)||weapon<0||weapon>3)return;
  const now=Date.now();const dt=limit((now-p.lastMove)/1000,.01,.35);
  const distance=Math.hypot(x-p.x,z-p.z);
  const dy=Math.abs(y-p.y);
  const flying=p.powers.flightUntil>now;const phased=p.powers.phaseUntil>now;
  // Allow the existing unlimited dash, but reject large discontinuities/teleports.
  if(distance>Math.max(3.2,(flying?35:42)*dt+1.0)||dy>Math.max(2.4,(flying?22:17)*dt+1.0))return;
  if(!phased&&!flying&&!locationValid(x,y,z,colliders))return;
  if(!phased&&!flying)p.powers.safe={x,y,z};
  p.x=x;p.y=y;p.z=z;p.yaw=yaw;p.pitch=pitch;p.weapon=weapon;p.lastMove=now;p.lastSeen=now;
}
function fire(p,data){
  if(!p.alive)return;
  const now=Date.now();
  if(p.powers.frozenUntil>now||p.powers.gravityUntil>now||p.powers.phaseUntil>now)return;
  if(p.powers.invisibleUntil>now){p.powers.invisibleUntil=0;broadcast(p.room,{type:'power-status',player:p.id,powers:powerSnapshot(p)});}
  const w=WEAPONS[p.weapon];
  if(now-p.lastFire<Math.max(45,w.interval*1000*.85))return;
  p.lastFire=now;
  // Aim is based on server's last received yaw/pitch, not on client-provided hit IDs.
  const cp=Math.cos(p.pitch),dir=[-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp];
  const origin=[p.x,p.y+1.65,p.z];
  let victim=null,nearest=w.range;
  for(const target of p.room.players.values()){
    if(target.id===p.id||!target.alive||now<target.spawnUntil||target.powers.phaseUntil>now)continue;
    // sphere approximation at torso. Aiming at head counts via the same hit body volume.
    const to=[target.x-origin[0],target.y+1.08-origin[1],target.z-origin[2]];
    const projection=to[0]*dir[0]+to[1]*dir[1]+to[2]*dir[2];
    if(projection<0||projection>nearest)continue;
    const side=(to[0]**2+to[1]**2+to[2]**2)-projection**2;
    if(side>.82**2||obscured(origin,dir,projection))continue;
    nearest=projection;victim=target;
  }
  // A decoy intercepts hits before an actual player if it is closer to the shooter.
  let cloneHit=null,cloneDistance=nearest;
  for(const clone of p.room.clones){
    if(clone.owner===p.id||clone.until<now)continue;
    const diff=[clone.x-origin[0],clone.y+1.08-origin[1],clone.z-origin[2]];
    const proj=diff[0]*dir[0]+diff[1]*dir[1]+diff[2]*dir[2];
    const side=diff[0]**2+diff[1]**2+diff[2]**2-proj**2;
    if(proj>0&&proj<cloneDistance&&side<.82**2&&!obscured(origin,dir,proj)){cloneDistance=proj;cloneHit=clone;}
  }
  broadcast(p.room,{type:'shot',id:p.id,weapon:p.weapon});
  if(cloneHit){p.room.clones=p.room.clones.filter(c=>c!==cloneHit);broadcast(p.room,{type:'clone-destroy',id:cloneHit.id});return;}
  if(!victim)return;
  let damage=w.damage;
  // Shotgun is strong at close range and weaker at distance.
  if(p.weapon===1)damage=Math.max(12,Math.round(damage*(1-nearest/45)));
  if(victim.powers.shieldUntil>now){send(p.socket,{type:'power-vfx',kind:'shield-hit',player:victim.id,x:victim.x,y:victim.y,z:victim.z});return;}
  const absorbed=Math.min(victim.shield,damage);victim.shield-=absorbed;victim.hp=Math.max(0,victim.hp-(damage-absorbed));
  send(p.socket,{type:'hit',victim:victim.id,hp:victim.hp,shield:victim.shield});
  broadcast(p.room,{type:'health',id:victim.id,hp:victim.hp,shield:victim.shield});
  if(victim.hp>0){send(victim.socket,{type:'damaged',hp:victim.hp,shield:victim.shield,attacker:p.name});return;}
  victim.alive=false;victim.deaths++;p.kills++;
  const death={type:'kill',attacker:p.id,attackerName:p.name,victim:victim.id,victimName:victim.name,kills:p.kills,deaths:victim.deaths};
  broadcast(p.room,death);
  setTimeout(()=>{
    if(victim.room.players.get(victim.id)!==victim||victim.alive)return;
    const s=spawn(victim.deaths%SPAWNS.length);Object.assign(victim,s,{hp:100,shield:40,alive:true,spawnUntil:Date.now()+1600,lastMove:Date.now()});
    victim.powers.flightUntil=0;victim.powers.phaseUntil=0;victim.powers.invisibleUntil=0;victim.powers.frozenUntil=0;victim.powers.teleportReturn=null;victim.powers.shieldUntil=0;victim.powers.gravityUntil=0;victim.powers.history=[];
    send(victim.socket,{type:'respawn',spawn:s,hp:100,shield:40,powers:powerSnapshot(victim)});
    broadcast(p.room,{type:'revived',player:publicPlayer(victim)},victim.socket);
  },2200);
}
function projectedVictim(p,range,angle=.55){
  const now=Date.now();const cp=Math.cos(p.pitch),dir=[-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp];
  let nearest=null,minDist=Infinity;
  for(const v of p.room.players.values()){
    if(v.id===p.id||!v.alive||v.powers.phaseUntil>now)continue;
    const dx=v.x-p.x,dz=v.z-p.z,dist=Math.hypot(dx,dz);if(dist>range||dist<.01)continue;
    const dot=(dx*(-Math.sin(p.yaw))+dz*(-Math.cos(p.yaw)))/dist;
    if(dot<angle||obscured([p.x,p.y+1.4,p.z],dir,dist))continue;
    if(dist<minDist){minDist=dist;nearest=v;}
  }
  return nearest;
}
function notifyPower(p,id){send(p.socket,{type:'power-state',powers:powerSnapshot(p)});broadcast(p.room,{type:'power-status',player:p.id,powers:powerSnapshot(p)},p.socket);}
function applyAbilityDamage(attacker,victim,damage,now=Date.now()){
 if(!victim.alive||victim.powers.phaseUntil>now||victim.powers.shieldUntil>now)return false;
 const absorbed=Math.min(victim.shield,damage);victim.shield-=absorbed;victim.hp=Math.max(0,victim.hp-damage+absorbed);
 broadcast(attacker.room,{type:'health',id:victim.id,hp:victim.hp,shield:victim.shield});
 send(victim.socket,{type:'damaged',hp:victim.hp,shield:victim.shield,attacker:attacker.name});
 if(victim.hp===0){
   victim.alive=false;victim.deaths++;attacker.kills++;
   broadcast(attacker.room,{type:'kill',attacker:attacker.id,attackerName:attacker.name,victim:victim.id,victimName:victim.name,kills:attacker.kills,deaths:victim.deaths});
   setTimeout(()=>{
     if(victim.room.players.get(victim.id)!==victim||victim.alive)return;
     const sp=spawn(victim.deaths%SPAWNS.length);Object.assign(victim,sp,{hp:100,shield:40,alive:true,spawnUntil:Date.now()+1600,lastMove:Date.now()});
     const selected=victim.powers.loadout;victim.powers=freshPowerState();victim.powers.loadout=sanitizeLoadout(selected);
     send(victim.socket,{type:'respawn',spawn:sp,hp:100,shield:40,powers:powerSnapshot(victim)});
     broadcast(attacker.room,{type:'revived',player:publicPlayer(victim)},victim.socket);
   },2200);
 }
 return true;
}
function aimPoint(p,range){
 const cp=Math.cos(p.pitch),distance=Math.min(range,20);
 return {x:limit(p.x-Math.sin(p.yaw)*cp*distance,-139,139),z:limit(p.z-Math.cos(p.yaw)*cp*distance,-139,139)};
}
function castPower(p,data){
  const id=data.id,now=Date.now(),state=p.powers,rule=POWER_RULES[id];
  if(!rule){send(p.socket,{type:'power-error',message:'Habilidade desconhecida.'});return;}
  if(id==='teleport'&&data.back===true){
    const ret=state.teleportReturn;
    if(!ret||ret.until<now){send(p.socket,{type:'power-error',message:'Tempo de retorno expirou.'});return;}
    state.teleportReturn=null;
    if(isGroundedDestination(ret.x,ret.y,ret.z,colliders)){
      Object.assign(p,{x:ret.x,y:ret.y,z:ret.z,lastMove:now});
      broadcast(p.room,{type:'power-effect',kind:'teleport-back',player:p.id,x:p.x,y:p.y,z:p.z});
    }
    notifyPower(p,id);return;
  }
  const error=canCast(p,id,now);
  if(error){send(p.socket,{type:'power-error',message:error});return;}
  let target=null;
  if(id==='teleport'){
    const t=data.target||{};
    if(!within(Number(t.x),Number(t.z),p,rule.range)||!isGroundedDestination(t.x,t.y,t.z,colliders)){
      send(p.socket,{type:'power-error',message:'Destino inválido ou longe demais.'});return;
    }
    target={x:t.x,y:t.y,z:t.z};
  }
  if(id==='freeze'||id==='chain'||id==='gravity'||id==='swap'){
    target=projectedVictim(p,rule.range,.77);
    if(!target){send(p.socket,{type:'power-error',message:'Mire em um adversário próximo.'});return;}
  }
  if(id==='swap'&&(!isGroundedDestination(p.x,p.y,p.z,colliders)||!isGroundedDestination(target.x,target.y,target.z,colliders))){send(p.socket,{type:'power-error',message:'Troca indisponível nestas posições.'});return;}
  if(id==='rewind'&&!state.history.length){send(p.socket,{type:'power-error',message:'Histórico ainda indisponível.'});return;}
  state.cooldowns[id]=now+rule.cooldown;
  if(id==='push'){
    for(const v of p.room.players.values()){
      if(v.id===p.id||!v.alive||v.powers.phaseUntil>now||!within(v.x,v.z,p,rule.range))continue;
      const dist=Math.hypot(v.x-p.x,v.z-p.z)||1,dx=(v.x-p.x)/dist,dz=(v.z-p.z)/dist;
      let pos={x:v.x,y:v.y,z:v.z};
      // Move only along collision-free samples: no wall clipping.
      for(let step=.65;step<=6.5;step+=.65){const x=v.x+dx*step,z=v.z+dz*step;if(!locationValid(x,v.y,z,colliders))break;pos={x,y:v.y,z};}
      Object.assign(v,pos,{lastMove:now});
      broadcast(p.room,{type:'power-effect',kind:'push',player:v.id,dx,dz,x:v.x,y:v.y,z:v.z});
    }
    broadcast(p.room,{type:'power-vfx',kind:'push',player:p.id,x:p.x,y:p.y,z:p.z});
  }else if(id==='freeze'){
    target.powers.frozenUntil=now+rule.duration;
    broadcast(p.room,{type:'power-effect',kind:'freeze',player:target.id,until:target.powers.frozenUntil});
  }else if(id==='teleport'){
    state.teleportReturn={x:p.x,y:p.y,z:p.z,until:now+rule.returnWindow};
    Object.assign(p,target,{lastMove:now});
    broadcast(p.room,{type:'power-effect',kind:'teleport',player:p.id,...target});
  }else if(id==='blackhole'){
    const center=aimPoint(p,rule.range);const hazard={id:crypto.randomBytes(4).toString('hex'),x:center.x,z:center.z,until:now+rule.duration,radius:rule.radius,owner:p.id};
    p.room.hazards.push(hazard);broadcast(p.room,{type:'power-vfx',kind:'blackhole',player:p.id,...hazard});
  }else if(id==='rewind'){
    const targetTime=now-rule.history;
    const point=state.history.reduce((best,h)=>Math.abs(h.t-targetTime)<Math.abs(best.t-targetTime)?h:best,state.history[0]);
    if(point&&isGroundedDestination(point.x,point.y,point.z,colliders)){
      Object.assign(p,{x:point.x,y:point.y,z:point.z,hp:Math.min(100,point.hp),shield:Math.min(40,point.shield),lastMove:now});
      send(p.socket,{type:'health',id:p.id,hp:p.hp,shield:p.shield});
      broadcast(p.room,{type:'health',id:p.id,hp:p.hp,shield:p.shield});
      broadcast(p.room,{type:'power-effect',kind:'rewind',player:p.id,x:p.x,y:p.y,z:p.z});
    }
  }else if(id==='chain'){
    const victims=[target];const dealt=new Set([p.id,target.id]);
    while(victims.length<3){let next=null,dist=Infinity;const prev=victims[victims.length-1];
      for(const q of p.room.players.values()){const d=Math.hypot(q.x-prev.x,q.z-prev.z);if(!dealt.has(q.id)&&q.alive&&q.powers.phaseUntil<now&&d<rule.chainRadius&&d<dist){next=q;dist=d;}}
      if(!next)break;victims.push(next);dealt.add(next.id);
    }
    victims.forEach((v,i)=>applyAbilityDamage(p,v,[65,48,32][i],now));
    broadcast(p.room,{type:'power-vfx',kind:'chain',player:p.id,targets:victims.map(v=>({x:v.x,y:v.y,z:v.z,id:v.id}))});
  }else if(id==='gravity'){
    const affected=[];
    for(const q of p.room.players.values())if(q.id!==p.id&&q.alive&&q.powers.phaseUntil<now&&Math.hypot(q.x-target.x,q.z-target.z)<=rule.radius){
      q.powers.gravityUntil=now+rule.duration;q.powers.gravityOrigin=q.y;q.y=Math.min(37,q.y+3.5);q.lastMove=now;
      affected.push(q.id);
    }
    broadcast(p.room,{type:'power-vfx',kind:'gravity',player:p.id,x:target.x,y:target.y,z:target.z,affected});
  }else if(id==='swap'){
    const origin={x:p.x,y:p.y,z:p.z};const destination={x:target.x,y:target.y,z:target.z};
    Object.assign(p,destination,{lastMove:now});Object.assign(target,origin,{lastMove:now});
    broadcast(p.room,{type:'power-effect',kind:'swap',player:p.id,...destination});
    broadcast(p.room,{type:'power-effect',kind:'swap',player:target.id,...origin});
  }else if(id==='clones'){
    const clones=[];
    for(let i=0;i<3;i++){const x=limit(p.x+(i-1)*3,-140,140),z=limit(p.z+((i%2)*2-1)*2,-140,140);
      if(locationValid(x,p.y,z,colliders)){const clone={id:crypto.randomBytes(4).toString('hex'),owner:p.id,x,z,y:p.y,until:now+rule.duration};p.room.clones.push(clone);clones.push(clone);}
    }
    broadcast(p.room,{type:'power-vfx',kind:'clones',player:p.id,clones});
  }else if(id==='shield'){state.shieldUntil=now+rule.duration;
  }else if(id==='flight'){state.flightUntil=now+rule.duration;
  }else if(id==='invisible'){state.invisibleUntil=now+rule.duration;
  }else if(id==='phase'){state.phaseUntil=now+rule.duration;state.safe=locationValid(p.x,p.y,p.z,colliders)?{x:p.x,y:p.y,z:p.z}:state.safe;}
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
  else if(data.type==='equip'){p.powers.loadout=sanitizeLoadout(data.loadout);send(ws,{type:'power-state',powers:powerSnapshot(p)});}
  else if(data.type==='power')castPower(p,data);
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
  if(['/health','/api/health'].includes(req.url?.split('?')[0])){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,rooms:rooms.size,players:players.size,uptimeSeconds:Math.floor(process.uptime()),version:'2.1.0'}));return;}
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
    const cache=['.html','.js','.css'].includes(ext)?'no-cache, must-revalidate':'public, max-age=3600';
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
    for(const p of room.players.values()){if(p.powers.phaseUntil&&p.powers.phaseUntil<=now){p.powers.phaseUntil=0;const safe=p.powers.safe;if(!locationValid(p.x,p.y,p.z,colliders)&&safe&&locationValid(safe.x,safe.y,safe.z,colliders)){Object.assign(p,safe,{lastMove:now});broadcast(room,{type:'power-effect',kind:'phase-exit',player:p.id,...safe});}}}
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
      while(hist.length>0&&hist[0].t<now-5200)hist.shift();
    }
    for(let i=room.hazards.length-1;i>=0;i--){
      const h=room.hazards[i];if(h.until<now){room.hazards.splice(i,1);continue;}
      for(const q of room.players.values()){
        if(q.id===h.owner||!q.alive||q.powers.phaseUntil>now)continue;
        const distance=Math.hypot(q.x-h.x,q.z-h.z);
        if(distance<.6||distance>h.radius)continue;
        const step=Math.min(.28,(h.radius-distance)*.035);
        const x=q.x+(h.x-q.x)/distance*step,z=q.z+(h.z-q.z)/distance*step;
        if(locationValid(x,q.y,z,colliders)){q.x=x;q.z=z;q.lastMove=now;send(q.socket,{type:'power-effect',kind:'blackhole-pull',player:q.id,x:q.x,y:q.y,z:q.z});}
      }
    }
    const expired=room.clones.filter(c=>c.until<=now);
    room.clones=room.clones.filter(c=>c.until>now);
    for(const clone of expired)broadcast(room,{type:'clone-destroy',id:clone.id});
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

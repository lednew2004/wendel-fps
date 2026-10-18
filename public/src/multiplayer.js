import {heroById} from './heroRoster.js';
import * as THREE from 'three';
import {MultiplayerMinimap} from './minimap.js';
import {createOperative,animateOperative,disposeOperative} from './characters.js';
import {colorForName} from './characterIdentity.js';

const byId=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

function remoteAvatar(name,hero=null){
  const root=new THREE.Group();
  const profile=hero?heroById(hero):null;const body=createOperative({role:profile?.role||'player',size:.91,player:true,tint:profile?.color??colorForName(name),hero:profile?.id||null});
  root.add(body);
  const flashMat=new THREE.MeshBasicMaterial({color:0xffdb8c,transparent:true,opacity:.85,depthWrite:false});
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.16,6,5),flashMat);flash.position.set(.18,1.22,-.86);flash.visible=false;body.add(flash);root.userData.flash=flash;
  // Screen-facing health and shield bars; updated from server-authoritative state.
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=128;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false,transparent:true,depthTest:true}));
  tag.position.set(0,2.83,0);tag.scale.set(2.6,.87,1);root.add(tag);root.userData.lifeSprite=tag;
  // Persistent shield aura from server-authoritative status.
  const shieldBubble=new THREE.Mesh(new THREE.SphereGeometry(1.23,14,10),new THREE.MeshBasicMaterial({color:0x73e8c7,transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide}));
  shieldBubble.position.y=1.15;shieldBubble.visible=false;root.add(shieldBubble);root.userData.shieldBubble=shieldBubble;
  // Ice marker is local 3D feedback only; authoritative frozen state comes from the server.
  const iceMat=new THREE.MeshBasicMaterial({color:0x83e8ff,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide});
  const ice=new THREE.Mesh(new THREE.CylinderGeometry(.56,.56,2.35,9,1,true),iceMat);
  ice.position.y=1.15;ice.visible=false;root.add(ice);root.userData.ice=ice;
  // Transformed players look like a real drum prop, not an invisible avatar.
  const barrel=new THREE.Group();
  const steel=new THREE.MeshStandardMaterial({color:0x48545c,metalness:.62,roughness:.45});
  const paint=new THREE.MeshStandardMaterial({color:0xa2543f,metalness:.34,roughness:.58});
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,1.38,12),paint);drum.position.y=.71;barrel.add(drum);
  for(const y of [.24,1.22]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.13,12),steel);ring.position.y=y;barrel.add(ring);}
  barrel.visible=false;root.add(barrel);
  const truck=new THREE.Group();
  const truckMat=new THREE.MeshStandardMaterial({color:0x536b70,metalness:.32,roughness:.63});
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(2.2,2,1.9),truckMat);cabin.position.set(0,1.1,-1.3);truck.add(cabin);
  const cargo=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.3,3.4),new THREE.MeshStandardMaterial({color:0x82908b,metalness:.22,roughness:.71}));cargo.position.set(0,1.28,1.1);truck.add(cargo);
  const forklift=new THREE.Group();
  const frame=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.12,1.7),new THREE.MeshStandardMaterial({color:0xc9a04a,metalness:.38,roughness:.51}));frame.position.set(0,.8,0);forklift.add(frame);
  const mast=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.55,.2),truckMat);mast.position.set(0,1.4,-1.0);forklift.add(mast);
  truck.visible=false;forklift.visible=false;root.add(truck,forklift);
  root.userData.disguises={barrel,truck,forklift};root.userData.body=body;
  root.userData.lifeTag={ctx,texture,name:name.slice(0,18),hp:-1,shield:-1};
  updateLifeTag(root,100,40);
  return root;
}

function setDisguise(group,type){
  if(!group?.userData?.body)return;
  const active=['barrel','truck','forklift'].includes(type)?type:null;
  group.userData.body.visible=!active;
  for(const [name,mesh] of Object.entries(group.userData.disguises))mesh.visible=active===name;
  group.userData.lifeSprite.visible=!active;
  group.userData.ice.visible=!active&&group.userData.ice.visible;
}
function updateLifeTag(group,hp,shield){
  const v=group.userData.lifeTag;
  if(!v)return;
  hp=clamp(Number(hp)||0,0,100);shield=clamp(Number(shield)||0,0,40);
  if(v.hp===hp&&v.shield===shield)return;
  v.hp=hp;v.shield=shield;
  const ctx=v.ctx;
  ctx.clearRect(0,0,384,128);
  ctx.fillStyle='rgba(6,16,22,.88)';ctx.fillRect(7,3,370,122);
  ctx.fillStyle='#f4f0dc';ctx.font='bold 37px Arial';ctx.textAlign='center';
  ctx.fillText(v.name,192,42,350);
  ctx.fillStyle='#1d2c2e';ctx.fillRect(25,53,334,30);
  ctx.fillStyle=hp>35?'#62da8d':'#e76d55';ctx.fillRect(27,55,330*hp/100,26);
  ctx.fillStyle='#e7f4d9';ctx.font='bold 19px Arial';ctx.fillText(`${Math.ceil(hp)} HP`,192,76);
  ctx.fillStyle='#1b303f';ctx.fillRect(25,91,334,15);
  ctx.fillStyle='#78bddf';ctx.fillRect(27,93,330*shield/40,11);
  v.texture.needsUpdate=true;
}

export class MultiplayerClient {
  constructor(game){
    this.game=game;this.minimap=new MultiplayerMinimap(game);this.socket=null;this.connected=false;this.id=null;this.room='';this.alive=true;
    this.others=new Map();this.decoys=new Map();this.syncTick=0;this.isJoining=false;this.players=[];this.heartbeat=0;this.reconnectAttempts=0;this.reconnectTimer=null;this.reconnectSession=(globalThis.crypto?.randomUUID?.()||('titan-'+Date.now()+'-'+Math.random().toString(36).slice(2)));this.wantReconnect=false;
    // Keep the reconnect token on the same tab if the mobile browser reloads it.
    try{
      const saved=sessionStorage.getItem('titan-online-session');
      if(saved&&/^[a-zA-Z0-9-]{20,100}$/.test(saved))this.reconnectSession=saved;
      sessionStorage.setItem('titan-online-session',this.reconnectSession);
    }catch{}
    this.panelOpen=false;this.lastRoomFocus=null;this.keepAliveTimer=null;this.lastServerMessage=0;this.pingMs=null;this.joinStarted=0;
    const presetRoom=new URLSearchParams(location.search).get('room');
    if(presetRoom&&/^[A-Za-z0-9]{6}$/.test(presetRoom))byId('mp-code').value=presetRoom.toUpperCase();
    else try{const savedRoom=sessionStorage.getItem('titan-online-room');if(savedRoom&&/^[A-Za-z0-9]{6}$/.test(savedRoom))byId('mp-code').value=savedRoom;}catch{}
    const presetServer=new URLSearchParams(location.search).get('server');
    if(presetServer)byId('mp-server').value=presetServer;
    byId('mp-open').addEventListener('click',()=>this.openLobby());
    byId('mp-close').addEventListener('click',()=>this.closeLobby());
    byId('mp-create').addEventListener('click',()=>this.connect(true));
    byId('mp-join').addEventListener('click',()=>this.connect(false));
    // Dedicated clear controls help on mobile, even when the virtual keyboard is hidden.
    byId('mp-name-clear').addEventListener('click',()=>this.clearLobbyField('mp-name'));
    byId('mp-code-clear').addEventListener('click',()=>this.clearLobbyField('mp-code'));
    byId('mp-name').addEventListener('focus',e=>{
      if(e.target.value==='Operador')e.target.select();
    });
    byId('mp-room-open').addEventListener('click',()=>this.openRoomPanel());
    byId('mp-room-close').addEventListener('click',()=>this.closeRoomPanel());
    byId('mp-room-resume').addEventListener('click',()=>this.closeRoomPanel());
    byId('mp-room-leave').addEventListener('click',()=>this.leaveRoom());
    byId('mp-copy').addEventListener('click',()=>this.copyRoomCode());
    byId('mp-share').addEventListener('click',()=>this.shareRoomInvite());
  }
  clearLobbyField(id){
    const input=byId(id);
    input.value='';
    input.focus({preventScroll:true});
  }
  setStatus(message,isError=false){const el=byId('mp-status');el.textContent=message;el.classList.toggle('error',isError);}
  roomInviteURL(){
    const url=new URL(window.location.pathname,window.location.origin);
    url.searchParams.set('room',this.room);
    return url.toString();
  }
  shareStatus(text,error=false){
    const status=byId('mp-share-status');status.textContent=text;status.classList.toggle('error',error);
  }
  async copyText(text){
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}
    }catch{}
    // Older browsers: copy the actual invite text (not merely the room code).
    const fallback=document.createElement('textarea');
    fallback.value=text;fallback.setAttribute('readonly','');
    fallback.style.position='fixed';fallback.style.opacity='0';
    document.body.appendChild(fallback);
    fallback.focus();fallback.select();
    try{return !!document.execCommand('copy');}
    catch{return false;}
    finally{fallback.remove();}
  }
  async copyRoomCode(){
    if(!this.room)return;
    const done=await this.copyText(this.room);
    this.shareStatus(done?'CÓDIGO COPIADO!':'SELECIONE E COPIE O CÓDIGO ACIMA.',!done);
  }
  async shareRoomInvite(){
    if(!this.room)return;
    const url=this.roomInviteURL();
    const data={title:'TITAN PROTOCOL — Multiplayer',text:`Entre na minha sala ${this.room} no TITAN PROTOCOL!`,url};
    if(navigator.share){
      try{await navigator.share(data);this.shareStatus('CONVITE ENVIADO!');return;}
      catch(err){if(err?.name==='AbortError')return;}
    }
    const done=await this.copyText(`${data.text} ${url}`);
    this.shareStatus(done?'LINK DE CONVITE COPIADO!':'COMPARTILHE O CÓDIGO ACIMA.',!done);
  }
  openRoomPanel(){
    if(!this.connected||this.game.mode!=='multiplayer'||this.panelOpen)return;
    this.panelOpen=true;
    this.lastRoomFocus=document.activeElement;
    const game=this.game;
    game.setState('paused');
    game.mouseDown=false;game.rightDown=false;game.mobile?.clear();
    byId('mp-room-panel').classList.remove('hidden');
    byId('mp-hud').classList.add('hidden');
    byId('mp-room-code-input').value=this.room;
    this.shareStatus('');
    this.connectionStatus();
    this.updateScore();
    if(document.pointerLockElement)document.exitPointerLock();
    byId('mp-room-resume').focus({preventScroll:true});
  }
  closeRoomPanel(){
    if(!this.panelOpen)return;
    this.panelOpen=false;
    byId('mp-room-panel').classList.add('hidden');
    if(this.connected&&this.game.mode==='multiplayer'){
      byId('mp-hud').classList.remove('hidden');
      this.game.setState('playing');
      this.game.requestLock();
      if(this.game.mobile?.enabled)this.game.mobile.sync();
    }
  }
  leaveRoom(){
    if(!this.panelOpen&&!this.connected)return;
    if(!window.confirm('Deseja sair da sala e voltar ao menu principal?'))return;
    this.panelOpen=false;
    byId('mp-room-panel').classList.add('hidden');
    this.disconnect();
    this.game.menu();
  }
  openLobby(){
    byId('multiplayer-lobby').classList.remove('hidden');
    this.setStatus('Criar: código opcional (6 caracteres). Entrar: informe o código enviado pelo amigo.');
    fetch('/api/health',{cache:'no-store'}).then(r=>r.json()).then(info=>{
      if(info.ok===false)this.setStatus(info.message||'Servidor multiplayer indisponível. Aguarde o servidor gratuito iniciar e tente novamente.',true);
    }).catch(()=>{}); // Health check é servido pelo mesmo servidor Node.js.
  }
  closeLobby(){if(!this.connected){this.disconnect();byId('multiplayer-lobby').classList.add('hidden');}}
  url(){
    const custom=byId('mp-server').value.trim()||new URL('/ws',location.href).href.replace(/^http/,'ws');
    const url=new URL(custom);
    if(!['ws:','wss:'].includes(url.protocol))throw new Error('Use ws:// ou wss:// no endereço do servidor.');
    if(location.protocol==='https:'&&url.protocol!=='wss:')throw new Error('O site usa HTTPS: configure o servidor com WSS.');
    return url.href;
  }
  connect(create,isReconnect=false){
    if(this.isJoining||this.connected)return;
    if(!isReconnect){this.wantReconnect=false;this.reconnectAttempts=0;}
    let url;try{url=this.url();}catch(err){this.setStatus(err.message,true);return;}
    const name=(byId('mp-name').value.trim()||'Operador').slice(0,18);
    const room=byId('mp-code').value.trim().toUpperCase();
    if((!create||room.length>0)&&!/^[A-Z0-9]{6}$/.test(room)){
      this.setStatus(create?'Use 6 letras ou números para criar com um código próprio, ou deixe em branco para gerar automaticamente.':'Digite um código válido de 6 letras ou números para entrar.',true);
      return;
    }
    // Show the exact code requested by the player, instead of silently removing characters.
    byId('mp-code').value=room;
    this.disconnect(false);this.isJoining=true;this.joinStarted=Date.now();this.setStatus('Conectando ao servidor...');
    if(isReconnect){byId('mp-respawn').textContent='REESTABELECENDO CONEXÃO...';byId('mp-respawn').classList.remove('hidden');}
    let socket;try{socket=new WebSocket(url);}catch(err){this.isJoining=false;this.setStatus('Não foi possível abrir a conexão.',true);return;}
    this.socket=socket;
    const watchdog=setTimeout(()=>{if(this.socket===socket&&!this.connected){this.setStatus('Servidor não respondeu. Aguarde ou tente novamente.',true);socket.close();}},isReconnect?20000:45000);
    socket.addEventListener('open',()=>{
      this.lastServerMessage=Date.now();
      this.startKeepAlive(socket);
      this.setStatus('Entrando na sala...');
      socket.send(JSON.stringify({type:'join',name,create,room,session:this.reconnectSession,loadout:this.game.powers?.loadout||['push','freeze'],hero:this.game.heroSelection?.selectedHero||'striker',weapon:this.game.heroSelection?.weapon??0}));
    });
    socket.addEventListener('message',e=>{
      if(this.socket!==socket)return;
      let msg;try{msg=JSON.parse(e.data);}catch{return;}
      this.lastServerMessage=Date.now();
      this.receive(msg);
    });
    socket.addEventListener('close',()=>{
      clearTimeout(watchdog);this.stopKeepAlive();
      if(this.socket!==socket)return;
      const shouldRetry=this.wantReconnect && this.room && this.game.mode==='multiplayer';
      this.connected=false;this.isJoining=false;this.socket=null;this.alive=false;
      this.minimap.hide();this.removeAll();
      if(shouldRetry){
        if(this.panelOpen){this.panelOpen=false;byId('mp-room-panel').classList.add('hidden');this.game.setState('playing');}
        byId('mp-respawn').textContent='REESTABELECENDO CONEXÃO...';
        byId('mp-respawn').classList.remove('hidden');
        this.reconnectAttempts++;
        this.reconnectTimer=setTimeout(()=>{
          this.reconnectTimer=null;
          byId('mp-code').value=this.room;
          this.connect(false,true);
        },Math.min(1000*Math.pow(1.5,this.reconnectAttempts-1),6500));
      }else{
        byId('mp-hud').classList.add('hidden');
        this.panelOpen=false;byId('mp-room-panel').classList.add('hidden');
        if(this.game.mode==='multiplayer'&&this.game.state!=='menu'){
          this.game.menu();this.openLobby();this.setStatus('Conexão encerrada. Tente novamente.',true);
        }else this.setStatus('Servidor desconectado.',true);
      }
    });
    socket.addEventListener('error',()=>{if(this.socket===socket)this.setStatus('Conexão instável. Tentando novamente quando possível...',true);});
  }
  startKeepAlive(socket){
    this.stopKeepAlive();
    this.keepAliveTimer=setInterval(()=>{
      if(this.socket!==socket||socket.readyState!==WebSocket.OPEN)return;
      // A network watchdog must not depend on requestAnimationFrame (mobile screens sleep).
      if(this.lastServerMessage&&Date.now()-this.lastServerMessage>55000){
        socket.close();return;
      }
      if(socket.bufferedAmount<40000)socket.send(JSON.stringify({type:'ping',t:Date.now()}));
    },8000);
  }
  stopKeepAlive(){if(this.keepAliveTimer){clearInterval(this.keepAliveTimer);this.keepAliveTimer=null;}}
  send(data){
    if(this.socket?.readyState!==WebSocket.OPEN)return;
    if(data.type==='move'&&this.socket.bufferedAmount>30000)return;
    this.socket.send(JSON.stringify(data));
  }
  receive(msg){
    if(!msg||typeof msg.type!=='string')return;
    switch(msg.type){
      case 'error':this.setStatus(msg.message||'Erro na sala.',true);if(this.isJoining){this.disconnect();byId('multiplayer-lobby').classList.remove('hidden');}break;
      case 'welcome':{
        this.connected=true;this.isJoining=false;this.wantReconnect=true;this.reconnectAttempts=0;this.id=msg.id;this.room=msg.room;byId('mp-code').value=msg.room;try{sessionStorage.setItem('titan-online-room',this.room);}catch{}
        // On automatic reconnect do not restart the whole game/camera.
        if(this.game.mode!=='multiplayer')this.game.start('multiplayer');
        else if(this.game.state!=='playing'&&!this.panelOpen)this.game.setState('playing');
        this.game.parkour.spawn(msg.spawn.x,msg.spawn.y,msg.spawn.z);
        const self=msg.players.find(p=>p.id===msg.id);
        this.game.player.health=self?.hp??100;this.game.player.shield=self?.shield??40;
        this.alive=self?.alive!==false;
        if(msg.powers){this.game.powers.onServerState(msg.powers);this.game.powers.loadout=msg.powers.loadout||this.game.powers.loadout;this.game.powers.refreshSelects();this.game.powers.refreshButtons();}
        byId('multiplayer-lobby').classList.add('hidden');
        byId('mp-hud').classList.remove('hidden');
        this.minimap.show();
        byId('mp-respawn').classList.toggle('hidden',this.alive);
        byId('mp-room-code-input').value=this.room;
        if(this.panelOpen){byId('mp-hud').classList.add('hidden');byId('mp-room-panel').classList.remove('hidden');}
        this.game.urban.resetInteractions();
        for(const id of msg.openInteractions||[])this.game.urban.toggleInteractable(id,true);
        this.receive({type:'snapshot',players:msg.players});
        this.game.toast(msg.resumed?'CONEXÃO RESTABELECIDA · PARTIDA RETOMADA':'PARTIDA ONLINE · TOQUE EM SALA PARA CONVIDAR');
        break;
      }
      case 'world-interaction':{
        if(this.game.urban.toggleInteractable(msg.id,!!msg.open)){
          this.game.parkour.prompt=(msg.open?'ABERTO · ':'FECHADO · ')+(msg.kind==='door'?'PORTA':'JANELA');
        }break;
      }
      case 'world-error':this.game.toast(msg.message||'INTERAÇÃO INDISPONÍVEL');break;
      case 'dash-state':if(!msg.ok){this.game.player.dashDuration=0;this.game.parkour.dashTime=0;this.game.player.dashCd=Math.max(this.game.player.dashCd,Number(msg.remaining||0)/1000);this.game.toast('DASH EM RECARGA');}break;
      case 'power-state':this.game.powers.onServerState(msg.powers);break;
      case 'power-error':this.game.toast(msg.message||'PODER NÃO ATIVADO');break;
      case 'power-copy':this.game.powers.onServerState(msg.powers);this.game.toast('PODERES COPIADOS DE '+msg.from+' · 30 SEGUNDOS');break;
      case 'power-effect':{
        this.game.powers.onServerEffect(msg);
        if(msg.kind==='combo-dash'&&msg.player!==this.id){const entry=this.others.get(msg.player);if(entry){entry.motion={from:msg.from,to:msg.to,elapsed:0,duration:Math.max(.08,(msg.duration||340)/1000)};entry.group.position.set(msg.from.x,msg.from.y,msg.from.z);entry.target.set(msg.to.x,msg.to.y,msg.to.z);}break;}
        if(msg.kind==='gravity'&&Array.isArray(msg.affected)&&msg.affected.includes(this.id)){this.game.powers.status.gravity=Date.now()+2700;this.game.parkour.y+=3.5;this.game.parkour.vy=0;}
        if((msg.kind==='gravity-land'||msg.kind==='combo-move')&&msg.player===this.id&&Number.isFinite(msg.y))this.game.parkour.spawn(msg.x,msg.y,msg.z);
        if(msg.player!==this.id&&['combo-move','teleport','teleport-back','swap','clonejump','rewind'].includes(msg.kind)){const remote=this.others.get(msg.player);if(remote&&Number.isFinite(msg.x)){this.game.powers.motion.teleport({x:remote.group.position.x,y:remote.group.position.y,z:remote.group.position.z},{x:msg.x,y:msg.y,z:msg.z},0xb77dff);}}
        if(msg.kind==='push'){const entry=this.others.get(msg.player);if(entry&&Number.isFinite(msg.x))entry.target.set(msg.x,msg.y,msg.z);}
        if(msg.kind==='teleport'||msg.kind==='teleport-back'||msg.kind==='clonejump'||msg.kind==='rewind'||msg.kind==='swap'||msg.kind==='phase-exit'||msg.kind==='gravity-land'||msg.kind==='combo-move'){const entry=this.others.get(msg.player);if(entry&&Number.isFinite(msg.x)){entry.target.set(msg.x,msg.y,msg.z);entry.group.position.copy(entry.target);}}
        break;
      }
      case 'power-vfx':{
        if(msg.kind==='resurrection'&&msg.player===this.id)this.game.toast('RESSURREIÇÃO AUTOMÁTICA · IMORTAL POR 4S');
        if(msg.kind==='heal'&&msg.player===this.id)this.game.toast('CURA · VIDA E ESCUDO RESTAURADOS');
        if(msg.kind==='morph'&&msg.player===this.id)this.game.toast('DISFARCE DE OBJETO ATIVADO');
        if(msg.kind==='clones'){
          this.game.powers.onServerClones(msg);
          for(const clone of msg.clones||[]){
            if(this.decoys.has(clone.id))continue;
            const root=remoteAvatar('HOLOGRAMA');root.position.set(clone.x,clone.y,clone.z);
            // Reuse one semi-transparent material per original surface; holograms remain cheap on mobile.
            const clonedMaterials=new Map();
            root.userData.body.traverse(o=>{
              if(!o.isMesh||!o.material?.clone)return;
              if(!clonedMaterials.has(o.material)){
                const mat=o.material.clone();mat.transparent=true;mat.opacity=.47;mat.depthWrite=false;
                clonedMaterials.set(o.material,mat);
              }
              o.material=clonedMaterials.get(o.material);
            });
            this.game.world.scene.add(root);this.decoys.set(clone.id,{group:root,until:clone.until,target:new THREE.Vector3(clone.x,clone.y,clone.z)});
          }
        }else if(msg.kind==='copy-mark'){
          this.game.powers.flash(0xff7dda,6,msg);
        }else if(msg.kind==='chain'){
          for(const v of msg.targets||[])this.game.powers.flash(0x76eaff,4,v);
        }else if(msg.kind==='leo-barrage'){this.game.powers.motion.ultimate(msg,0xffa561,17);this.game.powers.flash(0xffb35e,18,msg);}
        else if(msg.kind==='shiro_ricochet'){this.game.powers.motion.ultimate(msg,0xff557a,14);this.game.powers.flash(0xff557a,12,msg);}
        else if(msg.kind==='butterfly_launch'){this.game.powers.motion.ultimate(msg,0xd36dff,9);this.game.powers.flash(0xd36dff,8,msg);}
        else if(msg.kind==='blackhole')this.game.powers.flash(0x997bff,11,msg);
        else if(msg.kind==='gravity')this.game.powers.flash(0xdab8ff,10,msg);
        else if(msg.kind==='shield-hit')this.game.powers.flash(0x8af8cd,4,msg);
        else this.game.powers.flash(0x80dbff,9,msg);
        break;
      }
      case 'clone-move':{
        const decoy=this.decoys.get(msg.id);if(decoy){if(!decoy.target)decoy.target=new THREE.Vector3();decoy.target.set(msg.x,msg.y,msg.z);decoy.until=msg.until;}
        const own=this.game.powers.cloneTargets.find(c=>c.id===msg.id);if(own){own.x=msg.x;own.y=msg.y;own.z=msg.z;}
        break;
      }
      case 'clone-destroy':this.removeDecoy(msg.id);this.game.powers.onCloneDestroy(msg.id);break;
      case 'power-status':{
        if(msg.player===this.id)this.game.powers.onServerState(msg.powers);
        const entry=this.others.get(msg.player);if(entry){entry.group.visible=(!msg.powers.invisible&&!msg.powers.phased);setDisguise(entry.group,msg.powers.propType);entry.group.userData.ice.visible=!!msg.powers.frozen&&!msg.powers.propType;entry.group.userData.shieldBubble.visible=!!msg.powers.shielded;}
        break;
      }
      case 'pong':
        if(Number.isFinite(msg.t))this.pingMs=Math.max(0,Date.now()-msg.t);
        this.connectionStatus();
        break;
      case 'snapshot':
        if(!this.connected)return;
        this.players=Array.isArray(msg.players)?msg.players:[];
        for(const p of this.players){
          if(p.id===this.id){this.game.player.health=p.hp;this.game.player.shield=p.shield;continue;}
          this.setRemote(p);
        }
        for(const [id,entry] of this.others)if(!this.players.some(p=>p.id===id))this.removeRemote(id);
        this.updateScore();break;
      case 'joined':if(this.connected){this.setRemote(msg.player);const i=this.players.findIndex(p=>p.id===msg.player.id);if(i>=0)this.players[i]=msg.player;else this.players.push(msg.player);this.updateScore();this.game.toast(`${msg.player.name} ENTROU NA PARTIDA`);}break;
      case 'moved':if(this.connected){this.setRemote(msg.player);const i=this.players.findIndex(p=>p.id===msg.player.id);if(i>=0)this.players[i]=msg.player;else this.players.push(msg.player);}break;
      case 'left':this.removeRemote(msg.id);this.players=this.players.filter(p=>p.id!==msg.id);this.updateScore();break;
      case 'health':{
        const p=this.players.find(p=>p.id===msg.id);if(p){p.hp=msg.hp;p.shield=msg.shield;}
        if(msg.id===this.id){this.game.player.health=msg.hp;this.game.player.shield=msg.shield;this.game.updateHud();}
        else{const remote=this.others.get(msg.id);if(remote)updateLifeTag(remote.group,msg.hp,msg.shield);}
        break;
      }
      case 'damaged':this.game.player.health=msg.hp;this.game.player.shield=msg.shield;this.game.damageFlash=.8;this.game.audio.play('hurt');this.game.updateHud();break;
      case 'hit':this.game.hitmarker(msg.hp<=0);break;
      case 'kill':{
        const attacker=this.players.find(p=>p.id===msg.attacker);if(attacker)attacker.kills=msg.kills;
        const dead=this.players.find(p=>p.id===msg.victim);if(dead){dead.deaths=msg.deaths;dead.alive=false;}
        this.updateScore();
        if(msg.attacker===this.id){this.game.score+=100;this.game.kills++;this.game.toast(`VOCÊ ELIMINOU ${msg.victimName} · +100`);}
        if(msg.victim===this.id){this.alive=false;this.game.mouseDown=false;byId('mp-respawn').classList.remove('hidden');}
        const entry=this.others.get(msg.victim);if(entry)entry.group.visible=false;
        this.setStatus(`${msg.attackerName} eliminou ${msg.victimName}`);
        break;
      }
      case 'respawn':{
        this.game.parkour.spawn(msg.spawn.x,msg.spawn.y,msg.spawn.z);
        this.game.player.health=msg.hp;this.game.player.shield=msg.shield;
        this.alive=true;byId('mp-respawn').textContent='VOCÊ FOI ELIMINADO · REAPARECENDO...';byId('mp-respawn').classList.add('hidden');
        this.game.toast('RETORNOU AO COMBATE');this.game.updateHud();break;
      }
      case 'revived':{this.setRemote(msg.player);const pos=this.players.findIndex(p=>p.id===msg.player.id);if(pos>=0)this.players[pos]=msg.player;else this.players.push(msg.player);this.updateScore();break;}
      case 'shot':{
        const entry=this.others.get(msg.id);
        if(entry){entry.flash=.11;}
        break;
      }
    }
  }
  connectionStatus(){
    const el=byId('mp-connection-status');if(!el)return;
    if(!this.connected){el.textContent='RECONECTANDO À SALA...';return;}
    if(this.pingMs===null){el.textContent='CONECTADO · SINCRONIZANDO';return;}
    const label=this.pingMs<120?'BOA':this.pingMs<250?'REGULAR':'LENTA';
    el.textContent=`CONEXÃO ${label} · ${this.pingMs} ms`;
  }
  updateScore(){
    if(!this.connected)return;
    byId('mp-count').textContent=this.players.length+'/8';
    byId('mp-roster-count').textContent=this.players.length+'/8';
    const sorted=[...this.players].sort((a,b)=>b.kills-a.kills);
    byId('mp-scores').replaceChildren(...sorted.map(p=>{
      const item=document.createElement('div');item.setAttribute('role','listitem');item.textContent=`${p.id===this.id?'VOCÊ':p.name} · ${p.kills} eliminações`;
      if(p.id===this.id)item.classList.add('self');return item;
    }));
  }
  setRemote(data){
    if(!data||!data.id||data.id===this.id)return;
    let entry=this.others.get(data.id);
    if(!entry){
      const group=remoteAvatar(data.name||'Jogador',data.hero);this.game.world.scene.add(group);
      entry={group,target:new THREE.Vector3(data.x||0,data.y||0,data.z||0),yaw:0,flash:0,lastX:data.x||0,lastZ:data.z||0};
      group.position.copy(entry.target);this.others.set(data.id,entry);
    }
    if(Number.isFinite(data.x)&&Number.isFinite(data.y)&&Number.isFinite(data.z))entry.target.set(data.x,data.y,data.z);
    entry.yaw=Number.isFinite(data.yaw)?data.yaw:0;
    entry.group.visible=data.alive!==false&&data.invisible!==true&&data.phased!==true;
    setDisguise(entry.group,data.prop);
    entry.group.userData.ice.visible=data.frozen===true&&!data.prop;entry.group.userData.shieldBubble.visible=data.shielded===true;
    if(Number.isFinite(data.hp))updateLifeTag(entry.group,data.hp,data.shield);
  }
  removeRemote(id){const entry=this.others.get(id);if(!entry)return;this.game.world.scene.remove(entry.group);this.disposeAvatar(entry.group);this.others.delete(id);}
  removeDecoy(id){const item=this.decoys.get(id);if(!item)return;this.game.world.scene.remove(item.group);this.disposeAvatar(item.group);this.decoys.delete(id);}
  disposeAvatar(root){
    const character=root.userData.body;
    const characterItems=new Set();
    character?.traverse(o=>characterItems.add(o));
    if(character)disposeOperative(character);
    root.traverse(o=>{
      if(characterItems.has(o))return;
      if(o.isMesh){o.geometry?.dispose();o.material?.dispose?.();}
      if(o.isSprite){o.material?.map?.dispose();o.material?.dispose();}
    });
  }
  removeAll(){for(const id of [...this.others.keys()])this.removeRemote(id);for(const id of [...this.decoys.keys()])this.removeDecoy(id);this.players=[];}
  syncState(){
    const pk=this.game.parkour;
    if(this.game.powers?.motion?.hasDash())return;
    this.send({type:'move',x:pk.x,y:pk.y,z:pk.z,yaw:this.game.yaw,pitch:this.game.pitch,weapon:this.game.weapons.index});
  }
  fire(){if(this.connected&&this.alive&&!this.game.powers.frozen()&&!this.game.powers.isActive('phase')){this.syncState();this.send({type:'fire'});}}
  drawMinimap(){
    if(this.connected&&this.game.mode==='multiplayer')this.minimap.draw(this.players,this.id);
  }
  update(dt){
    if(!this.connected||this.game.mode!=='multiplayer')return;
    this.syncTick-=dt;
    if(this.syncTick<=0 && this.game.state==='playing'&&this.alive){
      this.syncTick=.09;
      this.syncState();
    }
    for(const [id,item] of this.decoys){if(item.until<Date.now())this.removeDecoy(id);else if(item.target){
      const delta=item.target.distanceTo(item.group.position);
      item.group.position.lerp(item.target,Math.min(1,dt*13));
      animateOperative(item.group.userData.body,dt,{moving:Math.min(1,delta/Math.max(.01,dt*6)),distance:Math.hypot(item.group.position.x-this.game.player.x,item.group.position.z-this.game.player.z)});
    }}
    // Keepalive now runs on a separate timer; do not depend on the render loop.
    for(const entry of this.others.values()){
      entry.flash=Math.max(0,entry.flash-dt);entry.group.userData.flash.visible=entry.flash>0;
      const dx=entry.target.x-entry.group.position.x;
      const dz=entry.target.z-entry.group.position.z;
      const movement=Math.min(1,Math.hypot(dx,dz)/Math.max(.02,dt*5));
      if(entry.motion){const m=entry.motion;m.elapsed+=dt;const u=Math.min(1,m.elapsed/m.duration),ease=1-Math.pow(1-u,2.6);entry.group.position.set(m.from.x+(m.to.x-m.from.x)*ease,m.from.y+(m.to.y-m.from.y)*ease,m.from.z+(m.to.z-m.from.z)*ease);if(u>=1)entry.motion=null;}
      else entry.group.position.lerp(entry.target,Math.min(1,dt*12));
      entry.group.rotation.y=entry.yaw;
      animateOperative(entry.group.userData.body,dt,{moving:movement,firing:entry.flash>0,distance:Math.hypot(entry.group.position.x-this.game.player.x,entry.group.position.z-this.game.player.z)});
    }
  }
  disconnect(manual=true){
    if(manual){this.wantReconnect=false;clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    this.stopKeepAlive();
    this.connected=false;this.isJoining=false;this.alive=false;this.id=null;
    if(this.socket){const old=this.socket;this.socket=null;try{if(manual&&old.readyState===WebSocket.OPEN)old.send(JSON.stringify({type:'leave'}));old.close();}catch{}}
    this.game.powers?.resetOnDeath();this.removeAll();this.minimap.hide();this.panelOpen=false;byId('mp-room-panel').classList.add('hidden');byId('mp-respawn').classList.add('hidden');byId('mp-hud').classList.add('hidden');
  }
}

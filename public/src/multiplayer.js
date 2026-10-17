import * as THREE from 'three';

const byId=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

function remoteAvatar(name){
  const root=new THREE.Group();
  const suit=new THREE.MeshStandardMaterial({color:0x6a7f74,roughness:.87,metalness:.06});
  const vest=new THREE.MeshStandardMaterial({color:0x242e32,roughness:.83,metalness:.17});
  const helmet=new THREE.MeshStandardMaterial({color:0x3c4846,roughness:.78});
  const skin=new THREE.MeshStandardMaterial({color:0xb08d72,roughness:.92});
  function block(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=false;root.add(m);return m;}
  block(.65,.84,.36,0,1.15,0,suit);
  block(.76,.61,.42,0,1.37,.04,vest);
  block(.36,.39,.37,0,1.85,0,skin);
  block(.51,.18,.51,0,2.05,0,helmet);
  for(const s of [-1,1]){
    block(.22,.78,.25,s*.46,1.32,-.02,suit);
    block(.27,.83,.27,s*.19,.46,.00,suit);
    block(.30,.17,.43,s*.19,.10,-.055,vest);
  }
  block(.11,.14,.70,.18,1.22,-.46,vest);
  const flashMat=new THREE.MeshBasicMaterial({color:0xffdb8c,transparent:true,opacity:.85,depthWrite:false});
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.16,6,5),flashMat);flash.position.set(.18,1.22,-.86);flash.visible=false;root.add(flash);root.userData.flash=flash;
  // Screen-facing health and shield bars; updated from server-authoritative state.
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=128;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false,transparent:true,depthTest:true}));
  tag.position.set(0,2.83,0);tag.scale.set(2.6,.87,1);root.add(tag);
  root.userData.lifeTag={ctx,texture,name:name.slice(0,18),hp:-1,shield:-1};
  updateLifeTag(root,100,40);
  return root;
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
    this.game=game;this.socket=null;this.connected=false;this.id=null;this.room='';this.alive=true;
    this.others=new Map();this.syncTick=0;this.isJoining=false;this.players=[];this.heartbeat=0;this.reconnectAttempts=0;this.reconnectTimer=null;this.reconnectSession=(globalThis.crypto?.randomUUID?.()||('titan-'+Date.now()+'-'+Math.random().toString(36).slice(2)));this.wantReconnect=false;
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
      socket.send(JSON.stringify({type:'join',name,create,room,session:this.reconnectSession}));
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
      this.removeAll();
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
        byId('multiplayer-lobby').classList.add('hidden');
        byId('mp-hud').classList.remove('hidden');
        byId('mp-respawn').classList.toggle('hidden',this.alive);
        byId('mp-room-code-input').value=this.room;
        if(this.panelOpen){byId('mp-hud').classList.add('hidden');byId('mp-room-panel').classList.remove('hidden');}
        this.receive({type:'snapshot',players:msg.players});
        this.game.toast(msg.resumed?'CONEXÃO RESTABELECIDA · PARTIDA RETOMADA':'PARTIDA ONLINE · TOQUE EM SALA PARA CONVIDAR');
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
      const group=remoteAvatar(data.name||'Jogador');this.game.world.scene.add(group);
      entry={group,target:new THREE.Vector3(data.x||0,data.y||0,data.z||0),yaw:0,flash:0};
      group.position.copy(entry.target);this.others.set(data.id,entry);
    }
    if(Number.isFinite(data.x)&&Number.isFinite(data.y)&&Number.isFinite(data.z))entry.target.set(data.x,data.y,data.z);
    entry.yaw=Number.isFinite(data.yaw)?data.yaw:0;
    entry.group.visible=data.alive!==false;
    if(Number.isFinite(data.hp))updateLifeTag(entry.group,data.hp,data.shield);
  }
  removeRemote(id){const entry=this.others.get(id);if(!entry)return;this.game.world.scene.remove(entry.group);entry.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});this.others.delete(id);}
  removeAll(){for(const id of [...this.others.keys()])this.removeRemote(id);this.players=[];}
  syncState(){
    const pk=this.game.parkour;
    this.send({type:'move',x:pk.x,y:pk.y,z:pk.z,yaw:this.game.yaw,pitch:this.game.pitch,weapon:this.game.weapons.index});
  }
  fire(){if(this.connected&&this.alive){this.syncState();this.send({type:'fire'});}}
  update(dt){
    if(!this.connected||this.game.mode!=='multiplayer')return;
    this.syncTick-=dt;
    if(this.syncTick<=0 && this.game.state==='playing'&&this.alive){
      this.syncTick=.09;
      this.syncState();
    }
    // Keepalive now runs on a separate timer; do not depend on the render loop.
    for(const entry of this.others.values()){
      entry.flash=Math.max(0,entry.flash-dt);entry.group.userData.flash.visible=entry.flash>0;
      entry.group.position.lerp(entry.target,Math.min(1,dt*12));
      entry.group.rotation.y=entry.yaw;
    }
  }
  disconnect(manual=true){
    if(manual){this.wantReconnect=false;clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    this.stopKeepAlive();
    this.connected=false;this.isJoining=false;this.alive=false;this.id=null;
    if(this.socket){const old=this.socket;this.socket=null;try{if(manual&&old.readyState===WebSocket.OPEN)old.send(JSON.stringify({type:'leave'}));old.close();}catch{}}
    this.removeAll();this.panelOpen=false;byId('mp-room-panel').classList.add('hidden');byId('mp-respawn').classList.add('hidden');byId('mp-hud').classList.add('hidden');
  }
}

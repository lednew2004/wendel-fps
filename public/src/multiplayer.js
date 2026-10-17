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
  // Screen-facing name tag, readable in the distance.
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(8,21,25,.8)';ctx.fillRect(0,0,256,64);
  ctx.fillStyle='#f3e1bd';ctx.font='bold 29px Arial';ctx.textAlign='center';ctx.fillText(name.slice(0,16),128,42);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false,transparent:true}));tag.position.set(0,2.55,0);tag.scale.set(2.25,.57,1);root.add(tag);
  return root;
}

export class MultiplayerClient {
  constructor(game){
    this.game=game;this.socket=null;this.connected=false;this.id=null;this.room='';this.alive=true;
    this.others=new Map();this.syncTick=0;this.isJoining=false;this.players=[];this.heartbeat=0;this.reconnectAttempts=0;this.reconnectTimer=null;this.reconnectSession=(globalThis.crypto?.randomUUID?.()||('titan-'+Date.now()+'-'+Math.random().toString(36).slice(2)));this.wantReconnect=false;
    const presetServer=new URLSearchParams(location.search).get('server');
    if(presetServer)byId('mp-server').value=presetServer;
    byId('mp-open').addEventListener('click',()=>this.openLobby());
    byId('mp-close').addEventListener('click',()=>this.closeLobby());
    byId('mp-create').addEventListener('click',()=>this.connect(true));
    byId('mp-join').addEventListener('click',()=>this.connect(false));
    byId('mp-copy').addEventListener('click',()=>{
      if(navigator.clipboard&&this.room)navigator.clipboard.writeText(this.room).catch(()=>{});
      this.setStatus('CÓDIGO DA SALA: '+this.room);
    });
  }
  setStatus(message,isError=false){const el=byId('mp-status');el.textContent=message;el.classList.toggle('error',isError);}
  openLobby(){
    byId('multiplayer-lobby').classList.remove('hidden');
    this.setStatus('Crie uma sala ou digite o código enviado por um amigo.');
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
    const name=(byId('mp-name').value||'Operador').trim().slice(0,18);
    const room=byId('mp-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(!create && room.length!==6){this.setStatus('Digite um código de 6 caracteres.',true);return;}
    this.disconnect(false);this.isJoining=true;this.setStatus('Conectando ao servidor...');
    if(isReconnect){byId('mp-respawn').textContent='REESTABELECENDO CONEXÃO...';byId('mp-respawn').classList.remove('hidden');}
    let socket;try{socket=new WebSocket(url);}catch(err){this.isJoining=false;this.setStatus('Não foi possível abrir a conexão.',true);return;}
    this.socket=socket;
    const watchdog=setTimeout(()=>{if(this.socket===socket&&!this.connected){this.setStatus('Servidor não respondeu. Verifique se ele está online.',true);socket.close();}},9000);
    socket.addEventListener('open',()=>{
      this.setStatus('Entrando na sala...');
      socket.send(JSON.stringify({type:'join',name,create,room,session:this.reconnectSession}));
    });
    socket.addEventListener('message',e=>{
      if(this.socket!==socket)return;
      let msg;try{msg=JSON.parse(e.data);}catch{return;}
      this.receive(msg);
    });
    socket.addEventListener('close',()=>{
      clearTimeout(watchdog);
      if(this.socket!==socket)return;
      const shouldRetry=this.wantReconnect && this.room && this.game.mode==='multiplayer';
      this.connected=false;this.isJoining=false;this.socket=null;this.alive=false;
      this.removeAll();
      if(shouldRetry){
        byId('mp-respawn').textContent='REESTABELECENDO CONEXÃO...';
        byId('mp-respawn').classList.remove('hidden');
        this.reconnectAttempts++;
        this.reconnectTimer=setTimeout(()=>{
          this.reconnectTimer=null;
          byId('mp-code').value=this.room;
          this.connect(false,true);
        },Math.min(1000*Math.pow(1.6,this.reconnectAttempts-1),8000));
      }else{
        byId('mp-hud').classList.add('hidden');
        if(this.game.mode==='multiplayer'&&this.game.state!=='menu'){
          this.game.menu();this.openLobby();this.setStatus('Conexão encerrada. Tente novamente.',true);
        }else this.setStatus('Servidor desconectado.',true);
      }
    });
    socket.addEventListener('error',()=>{if(this.socket===socket)this.setStatus('Falha de conexão: servidor indisponível ou WSS não configurado.',true);});
  }
  send(data){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(data));}
  receive(msg){
    if(!msg||typeof msg.type!=='string')return;
    switch(msg.type){
      case 'error':this.setStatus(msg.message||'Erro na sala.',true);if(this.isJoining)this.disconnect();break;
      case 'welcome':{
        this.connected=true;this.isJoining=false;this.wantReconnect=true;this.reconnectAttempts=0;this.id=msg.id;this.room=msg.room;byId('mp-code').value=msg.room;
        // On automatic reconnect do not restart the whole game/camera.
        if(this.game.mode!=='multiplayer'||this.game.state!=='playing')this.game.start('multiplayer');
        this.game.parkour.spawn(msg.spawn.x,msg.spawn.y,msg.spawn.z);
        const self=msg.players.find(p=>p.id===msg.id);
        this.game.player.health=self?.hp??100;this.game.player.shield=self?.shield??40;
        this.alive=self?.alive!==false;
        byId('multiplayer-lobby').classList.add('hidden');
        byId('mp-hud').classList.remove('hidden');
        byId('mp-respawn').classList.toggle('hidden',this.alive);
        byId('mp-code-visible').textContent=this.room;
        this.receive({type:'snapshot',players:msg.players});
        this.game.toast('SALA '+this.room+' · MULTIPLAYER ONLINE');
        break;
      }
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
  updateScore(){
    if(!this.connected)return;
    byId('mp-count').textContent=this.players.length+' / 8';
    const sorted=[...this.players].sort((a,b)=>b.kills-a.kills);
    byId('mp-scores').replaceChildren(...sorted.map(p=>{
      const item=document.createElement('span');item.textContent=`${p.id===this.id?'VOCÊ':p.name}: ${p.kills}`;
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
      this.syncTick=.065;
      this.syncState();
    }
    this.heartbeat+=dt;
    if(this.heartbeat>=6){this.heartbeat=0;this.send({type:'ping'});}
    for(const entry of this.others.values()){
      entry.flash=Math.max(0,entry.flash-dt);entry.group.userData.flash.visible=entry.flash>0;
      entry.group.position.lerp(entry.target,Math.min(1,dt*12));
      entry.group.rotation.y=entry.yaw;
    }
  }
  disconnect(manual=true){
    if(manual){this.wantReconnect=false;clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    this.connected=false;this.isJoining=false;this.alive=false;this.id=null;
    if(this.socket){const old=this.socket;this.socket=null;try{old.send(JSON.stringify({type:'leave'}));old.close();}catch{}}
    this.removeAll();byId('mp-respawn').classList.add('hidden');byId('mp-hud').classList.add('hidden');
  }
}

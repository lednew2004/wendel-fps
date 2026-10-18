import {SQUAD_START,ROLE_INFO,roleForHero} from './squadLayout.js';
import {SquadAI} from './squadAI.js';
import * as THREE from 'three';
import {HeroSelection} from './heroSelection.js';
import {heroLoadout,heroById} from './heroRoster.js';
import {isTypingIntoField,handlePowerWheelTab} from './keyboard.js';
import {World} from './world.js';
import {EnemySystem} from './enemies.js';
import {Weapons} from './weapons.js';
import {AudioEngine} from './audio.js';
import {LookController} from './look.js';
import {ThirdPersonCamera} from './thirdPersonCamera.js';
import {Ordnance} from './ordnance.js';
import {Campaign,MISSIONS} from './campaign.js';
import {UrbanCity} from './urban.js';
import {ParkourController} from './parkour.js';
import {MobileControls} from './mobile.js';
import {MultiplayerClient} from './multiplayer.js';
import {PowerSystem} from './powers.js';
import {WEAPONS,UPGRADES,PLAYER_HEIGHT,clamp,lerp,rand} from './constants.js';
const el=id=>document.getElementById(id);
const fmt=n=>String(Math.floor(n)).padStart(2,'0');
const num=n=>String(Math.floor(n)).padStart(6,'0');

export class Game {
  constructor(){
    this.world=new World(el('viewport'));this.audio=new AudioEngine();this.clock=new THREE.Clock();this.look=new LookController();this.state='menu';this.keys={};this.mouseDown=false;this.rightDown=false;this.yaw=0;this.pitch=0;this.sensitivity=1;this.invertY=false;this.grenadeCd=0;this.fps=60;this.fpsTick=0;this.fpsCount=0;this.damageFlash=0;this.hitmarkTimer=0;this.toastTimer=0;this.calloutTimer=0;this.uiTick=0;this.radarTick=0;this.animTime=0;this.fx=[];this.pendingSpawns=[];this.spawnTimer=0;this.waveCount=0;this.waveKilled=0;this.wave=0;this.score=0;this.kills=0;this.combo=0;this.comboTimer=0;this.best=this.loadBest();this.player={x:0,z:13,eyeY:PLAYER_HEIGHT,radius:.48,health:100,maxHealth:100,shield:60,maxShield:60,lastDamage:0,velY:0,jump:0,moveX:0,moveZ:0,dashCd:0,pulseCd:0,dashDuration:0,slideDuration:0,invulnerable:0,speedBonus:1,killsHeal:0,dashFactor:1};
    this.enemies=new EnemySystem(this.world,this.audio,{onKill:e=>this.onEnemyKill(e),onPlayerHit:(d,p)=>this.takeDamage(d,p),onAllyHit:(ally,damage)=>this.squad?.damage(ally,damage),onPickup:t=>this.pickup(t),onSummon:n=>{this.waveCount+=n;this.toast('REFORÇOS HOSTIS!');},onBossWarning:()=>this.toast('ALERTA: ONDA DE CHOQUE — AFASTE-SE!')});
    this.ordnance=new Ordnance(this.world,this.audio,this.enemies);
    this.weapons=new Weapons(this.world,this.audio,{onRay:(origin,dir,damage,range,weapon)=>this.shootRay(origin,dir,damage,range,weapon),onHitmarker:k=>this.hitmarker(k),onFire:()=>{this.thirdPerson?.emitFire();if(this.mode==='multiplayer')this.multiplayer?.fire();},onWeaponChanged:()=>this.updateHud()});
    this.fpsLimit=0;this.lastDraw=0;this.mode='campaign';this.campaign=new Campaign(this);this.urban=new UrbanCity(this.world);this.world.city=this.urban;this.world.spawnPoints=this.urban.spawnPoints;this.world.setUrbanMode(true);this.urban.toggle(true);this.urban.updateVisibility(0,18,138);this.parkour=new ParkourController(this,this.urban);this.adaptiveFPS=true;this.lowFPSTime=0;this.highFPSTime=0;this.cityTick=0;this.nativeScale=1;this.mobile=new MobileControls(this);this.multiplayer=new MultiplayerClient(this);this.powers=new PowerSystem(this);this.heroSelection=new HeroSelection(this);this.thirdPerson=new ThirdPersonCamera(this);this.squad=new SquadAI(this);this.weapons.setHeroAccent(heroById(this.heroSelection.selectedHero).color);this.powers.loadout=heroLoadout(this.heroSelection.selectedHero);this.powers.menuLoadout=[...this.powers.loadout];this.powers.refreshButtons();
    if(this.mobile.enabled){
      // Coarse-pointer phones default to lean rendering while all PC presets remain available.
      this.world.setQuality('low');
      this.world.setRenderScale(.75);
      this.world.setDrawDistance(150);
      this.world.setVegetation(.35);
      this.world.setShadowLevel(0);
      el('quality').value='low';
      el('render-scale').value='75';el('render-scale-label').textContent='75%';
      el('draw-distance').value='150';el('shadows').value='0';
      el('vegetation').value='35';el('vegetation-label').textContent='35%';
    }
    this.bind();this.positionCamera();el('menu-best').textContent=num(this.best);el('loading').classList.add('hidden');this.mobile.sync();this.loop();
  }
  get yaw(){return this.look.yaw;}
  set yaw(v){this.look.yaw=v;}
  get pitch(){return this.look.pitch;}
  set pitch(v){this.look.pitch=v;}
  loadBest(){try{return Number(localStorage.getItem('titan-protocol-best')||0)||0;}catch{return 0}}
  saveBest(){if(this.score>this.best){this.best=this.score;try{localStorage.setItem('titan-protocol-best',String(this.best));}catch{}return true;}return false;}
  bind(){
    el('start-btn').addEventListener('click',()=>this.campaign.confirmNew());el('retry-btn').addEventListener('click',()=>this.start(this.mode,this.campaign.index));el('back-menu-btn').addEventListener('click',()=>this.menu());el('resume-btn').addEventListener('click',()=>this.resume());el('hud-pause').addEventListener('click',()=>this.pause());el('restart-from-pause').addEventListener('click',()=>this.start(this.mode,this.campaign.index));el('survival-btn').addEventListener('click',()=>this.start('survival')); 
    el('camera-mode-switch').addEventListener('click',()=>{this.thirdPerson.toggle();this.toast(this.thirdPerson.mode==='third'?'CÂMERA · TERCEIRA PESSOA':'CÂMERA · PRIMEIRA PESSOA');});
    el('adaptive-fps').addEventListener('change',e=>{this.adaptiveFPS=e.target.checked;this.lowFPSTime=0;this.highFPSTime=0;});
    el('sensitivity').addEventListener('input',e=>{this.sensitivity=Number(e.target.value);el('sensitivity-value').textContent=this.sensitivity.toFixed(1)+'×';});
    el('quality').addEventListener('change',e=>{
      const q=e.target.value;
      this.world.setQuality(q);
      const presets={low:[0,150,false,false,false,15],medium:[1024,190,false,false,false,50],high:[2048,250,true,false,false,85],ultra:[3072,290,true,true,true,100],cinematic:[4096,320,true,true,true,100]};
      const p=presets[q]||presets.high;
      el('shadows').value=String(p[0]);el('draw-distance').value=String(p[1]);el('enable-smaa').checked=p[2];el('enable-ao').checked=p[3];el('enable-bloom').checked=p[4];el('enable-reflections').checked=true;el('vegetation').value=String(p[5]);el('vegetation-label').textContent=p[5]+'%';
      // The preset updates active render passes and GPU allocations.
    });
    el('invert-y').addEventListener('change',e=>{this.invertY=e.target.checked;});
    el('render-scale').addEventListener('input',e=>{this.world.setRenderScale(Number(e.target.value)/100);el('render-scale-label').textContent=e.target.value+'%';});
    el('fov').addEventListener('input',e=>{this.world.setFOV(Number(e.target.value));el('fov-label').textContent=e.target.value+'°';});
    el('draw-distance').addEventListener('change',e=>this.world.setDrawDistance(Number(e.target.value)));
    el('shadows').addEventListener('change',e=>this.world.setShadowLevel(Number(e.target.value)));
    el('vegetation').addEventListener('input',e=>{this.world.setVegetation(Number(e.target.value)/100);el('vegetation-label').textContent=e.target.value+'%';});
    el('texture-quality').addEventListener('change',e=>this.world.setTextureQuality(Number(e.target.value)));
    el('fps-limit').addEventListener('change',e=>{this.fpsLimit=Number(e.target.value)||0;});
    el('enable-smaa').addEventListener('change',e=>this.world.setAntialias(e.target.checked));
    el('enable-ao').addEventListener('change',e=>this.world.setAO(e.target.checked));
    el('enable-reflections').addEventListener('change',e=>this.world.setReflections(e.target.checked));
    el('enable-bloom').addEventListener('change',e=>this.world.setBloom(e.target.checked));
    window.addEventListener('keydown',e=>{if(isTypingIntoField(e.target)||isTypingIntoField(document.activeElement))return;if(handlePowerWheelTab(e,this.state,this.powers?.menu?.mode,document.activeElement,()=>this.powers.menu.openWheel()))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backspace'].includes(e.code))e.preventDefault();this.keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape'&&this.powers?.menu?.mode){this.powers.menu.close();return;}if(e.code==='Escape'){if(this.state==='playing')this.pause();else if(this.state==='paused')this.resume();return;}if(this.state!=='playing')return;
      if(e.code==='Space')this.parkour.jump();
      if(e.code==='KeyE')this.parkour.interact();
      if(e.code==='KeyT'){const active=this.parkour.toggleTrial();document.body.classList.toggle('trial-active',active);this.toast(active?'PERCURSO OPCIONAL ATIVADO':'PERCURSO DESATIVADO');}
      if(e.code==='ControlLeft'||e.code==='ControlRight'||e.code==='KeyC')this.parkour.crouch();
      if(e.code==='KeyR')this.weapons.reload();
      if(e.code==='Digit1'){e.preventDefault();this.powers.useSlot(0);}
      if(e.code==='Digit2'){e.preventDefault();this.powers.useSlot(1);}
      if(e.code==='Digit3'){e.preventDefault();this.powers.useSlot(2);}
      if(e.code==='Digit4'||e.code==='KeyF')this.cycleWeapon();
      if(e.code==='KeyQ')this.pulse();
      if(e.code==='KeyG'){if(this.mode==='campaign')this.squad.toggleOrders();else this.grenade();}
      if(e.code==='KeyH'&&this.mode==='campaign')this.grenade();
      if(e.code==='KeyX')this.dash();
      if(e.code==='KeyV'){e.preventDefault();this.thirdPerson.toggle();this.toast(this.thirdPerson.mode==='third'?'CÂMERA · TERCEIRA PESSOA':'CÂMERA · PRIMEIRA PESSOA');}

      if(e.code==='Backspace')this.parkour.resetCheckpoint();
    },true);
    window.addEventListener('keyup',e=>{if(handlePowerWheelTab(e,this.state,this.powers?.menu?.mode,document.activeElement)){this.keys.Tab=false;return;}this.keys[e.code]=false;},true);window.addEventListener('blur',()=>{if(this.state==='playing')this.pause();});
    document.addEventListener('mousemove',e=>{if(this.state!=='playing'||document.pointerLockElement!==this.world.renderer.domElement)return;if(this.look.move(e.movementX,this.invertY?-e.movementY:e.movementY,this.sensitivity)){this.positionCamera();}});
    const canvas=this.world.renderer.domElement;canvas.addEventListener('mousedown',e=>{if(this.mobile?.enabled)return;if(this.state!=='playing')return;if(document.pointerLockElement!==canvas){this.requestLock();return;}if(e.button===0){if(this.powers?.targeting){this.powers.confirmTeleport();return;}this.mouseDown=true;}if(e.button===2)this.rightDown=true;});document.addEventListener('mouseup',e=>{if(e.button===0)this.mouseDown=false;if(e.button===2)this.rightDown=false;});document.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{if(this.state==='playing'){e.preventDefault();this.cycleWeapon(e.deltaY>0?1:-1);}}, {passive:false});
    document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===canvas){this.look.onLock(performance.now());this.positionCamera();}else if(this.state==='playing'&&!this.mobile?.enabled){this.pause();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='playing')this.pause();});
    const rs=el('radar');this.radarCtx=rs.getContext('2d');
  }
  requestLock(){if(this.mobile?.enabled)return;const canvas=this.world.renderer.domElement;if(document.pointerLockElement===canvas)return;const result=canvas.requestPointerLock?.();if(result?.catch)result.catch(()=>{if(this.state==='playing')this.toast('PERMISSÃO DE MOUSE NECESSÁRIA — CLIQUE NA ARENA');});}
  hideScreens(){for(const id of ['start-screen','pause-screen','upgrade-screen','death-screen','chapter-complete-screen','victory-screen'])el(id).classList.add('hidden');}
  setState(state){
    this.state=state;
    const inGame=state!=='menu';
    document.body.classList.toggle('unified-play',inGame);
    document.body.classList.toggle('playing',state==='playing');
    document.body.classList.toggle('mode-multiplayer',inGame&&this.mode==='multiplayer');
    document.body.classList.toggle('reloading',state==='playing'&&this.weapons.reloadTime>0);
    document.body.classList.toggle('trial-active',this.parkour.trialActive&&inGame);
    el('parkour-hud').classList.toggle('hidden',!inGame);
    el('titan-power-picker').classList.toggle('hidden',!inGame);
    el('hud').classList.toggle('hidden',!inGame);
    this.mobile?.sync();this.squad?.syncUI();
  }
  start(mode='campaign',index=this.campaign.index){
    this.mode=mode;
    this.powers.reset();
    this.powers.startRun(mode);
    this.campaign.disposeSector();this.squad.clear();
    this.audio.unlock();this.hideScreens();
    this.enemies.clear();this.ordnance.clear();this.ordnance.damageMultiplier=1;
    this.world.resetBarrels();this.urban.resetInteractions();this.weapons.clearTracers();this.weapons.reset();this.weapons.switchTo(this.heroSelection?.weapon??0);
    this.fx.forEach(f=>this.world.scene.remove(f.mesh));this.fx=[];
    this.keys={};this.mouseDown=false;this.rightDown=false;this.look.reset();
    this.grenadeCd=0;this.wave=0;this.score=0;this.kills=0;this.combo=0;this.comboTimer=0;
    this.pendingSpawns=[];this.spawnTimer=0;this.animTime=0;
    Object.assign(this.player,{x:SQUAD_START.x,z:SQUAD_START.z,eyeY:PLAYER_HEIGHT,health:100,maxHealth:100,shield:60,maxShield:60,lastDamage:-100,velY:0,jump:0,moveX:0,moveZ:0,dashCd:0,pulseCd:0,dashDuration:0,slideDuration:0,invulnerable:0,speedBonus:1,killsHeal:0,dashFactor:1});
    this.world.setUrbanMode(true);
    this.world.spawnPoints=this.urban.spawnPoints;
    this.parkour.startCombat(SQUAD_START.x,SQUAD_START.z);
    this.setState('playing');this.powers.updateEconomyHUD();el('power-hud').classList.remove('hidden');
    if(mode==='campaign'){
      this.campaign.applyArmory();this.campaign.configure(index);
      el('wave').classList.add('hidden');
    }else if(mode==='multiplayer'){
      this.campaign.active=false;document.body.dataset.sector='0';
      this.pendingSpawns=[];this.enemies.clear();el('wave').classList.add('hidden');
      this.player.maxShield=40;this.player.shield=40;
      el('objective').textContent='TODOS CONTRA TODOS · ELIMINAÇÕES';
    }else{
      this.campaign.active=false;document.body.dataset.sector='0';
      this.beginWave();
    }
    this.world.update(0);
    this.positionCamera();this.updateHud();this.requestLock();
  }
  menu(){this.powers?.reset();el('power-hud').classList.add('hidden');if(this.mode==='multiplayer'&&this.multiplayer?.connected)this.multiplayer.disconnect();this.parkour.stop();this.world.setUrbanMode(true);this.urban.toggle(true);this.urban.updateVisibility(0,18,138);this.urban.resetInteractions();document.body.classList.remove('trial-active');this.campaign.disposeSector();this.hideScreens();el('start-screen').classList.remove('hidden');this.enemies.clear();this.ordnance.clear();this.pendingSpawns=[];this.setState('menu');this.powers.restoreMenuLoadout();el('menu-best').textContent=num(this.best);if(document.pointerLockElement)document.exitPointerLock();}
  pause(){if(this.state!=='playing')return;if(this.mode==='multiplayer'){this.multiplayer.openRoomPanel();return;}this.setState('paused');this.mobile?.clear();this.mouseDown=false;this.rightDown=false;el('pause-screen').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();}
  resume(){if(this.state!=='paused')return;if(this.mode==='multiplayer'&&this.multiplayer?.panelOpen){this.multiplayer.closeRoomPanel();return;}this.hideScreens();this.setState('playing');this.requestLock();}
  beginWave(){this.wave++;this.waveKilled=0;this.waveCount=4+this.wave*2+(this.wave%4===0?1:0);this.pendingSpawns=[];if(this.wave%4===0){this.pendingSpawns.push('boss');this.audio.play('boss');}
    for(let i=this.pendingSpawns.length;i<this.waveCount;i++){const roll=Math.random();let type='scout';if(this.wave>=2&&roll>.48)type='gunner';if(this.wave>=3&&roll>.82)type='tank';if(this.wave>=4&&roll>.67&&roll<=.82)type='sniper';if(this.wave>=5&&roll>.33&&roll<=.46)type='hunter';this.pendingSpawns.push(type);}
    this.spawnTimer=.14;el('wave-callout').querySelector('small').textContent=this.wave%4===0?'ALERTA · ASSINATURA TITAN':'AMEAÇA DETECTADA';el('wave-callout').querySelector('strong').textContent='ONDA '+fmt(this.wave);el('wave-callout').querySelector('span').textContent=this.wave%4===0?'COLOSSUS NO SETOR':'ELIMINE OS HOSTIS';el('wave-callout').classList.add('active');this.calloutTimer=2.4;this.toast(this.wave%4===0?'CONTATO COM ALVO DE CLASSE TITAN':'SINAIS HOSTIS DETECTADOS');this.updateHud();}
  waveComplete(){if(this.state!=='playing')return;this.setState('upgrade');this.mouseDown=false;this.rightDown=false;if(document.pointerLockElement)document.exitPointerLock();const options=[...UPGRADES].sort(()=>Math.random()-.5).slice(0,3);el('upgrade-choices').replaceChildren();for(const opt of options){const b=document.createElement('button');b.type='button';b.className='upgrade-choice';b.innerHTML=`<span class="upgrade-icon">${opt.icon}</span><small>${opt.tag}</small><strong>${opt.name}</strong><p>${opt.desc}</p>`;b.addEventListener('click',()=>this.applyUpgrade(opt.id));el('upgrade-choices').appendChild(b);}el('upgrade-screen').classList.remove('hidden');this.audio.play('pickup');}
  applyUpgrade(id){const p=this.player,w=this.weapons;if(id==='damage')w.damageMultiplier*=1.25;if(id==='speed')p.speedBonus*=1.17;if(id==='health'){p.maxHealth+=25;p.health=p.maxHealth;}if(id==='shield'){p.maxShield+=25;p.shield=p.maxShield;}if(id==='rapid')w.fireMultiplier*=1.14;if(id==='heal')p.killsHeal+=8;if(id==='ammo')for(const [i,s] of w.state.entries())s.reserve+=Math.ceil(WEAPONS[i].reserve*.5);if(id==='dash')p.dashFactor*=.7;if(id==='grenade')this.ordnance.damageMultiplier*=1.28;
    this.hideScreens();this.setState('playing');this.beginWave();this.requestLock();}
  cycleWeapon(direction=1){
    const squadMatch=this.mode==='campaign'||this.mode==='survival'||(this.mode==='multiplayer'&&this.multiplayer?.roomMode==='coop');
    const allowed=squadMatch?ROLE_INFO[roleForHero(this.heroSelection?.selectedHero)]?.weapons:[0,1,2,3];
    if(!allowed?.length)return;
    const current=allowed.indexOf(this.weapons.index);
    const next=allowed[((current<0?0:current)+ (direction<0?-1:1)+allowed.length)%allowed.length];
    this.weapons.switchTo(next);
  }
  grenade(){if(this.mode==='multiplayer')return;if(this.state!=='playing'||this.grenadeCd>0)return;this.grenadeCd=7.5;this.ordnance.throw(this.thirdPerson?.mode==='third'?this.world.cameraPitch:this.world.camera);this.toast('GRANADA DE PLASMA LANÇADA');}
  dash(){const p=this.player;if(this.state!=='playing'||p.dashCd>0||this.powers.frozen())return;p.dashDuration=.21;p.invulnerable=.26;p.dashCd=Math.max(2.5,4.8*p.dashFactor);if(this.mode==='multiplayer')this.multiplayer.send({type:'dash'});this.audio.play('dash');this.parkour.tacticalDash();this.toast('DASH · RECARGA '+p.dashCd.toFixed(1)+'S');}
  pulse(){if(this.mode==='multiplayer')return;const p=this.player;if(this.state!=='playing'||p.pulseCd>0)return;p.pulseCd=12;const center=new THREE.Vector3(p.x,1.1,p.z);const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.08,8,90),new THREE.MeshBasicMaterial({color:0x73fff0,transparent:true,opacity:1,depthWrite:false}));ring.position.copy(center);ring.rotation.x=Math.PI/2;this.world.scene.add(ring);this.fx.push({mesh:ring,life:.65,max:.65,type:'ring'});for(const e of [...this.enemies.enemies]){const dist=Math.hypot(e.x-p.x,e.z-p.z);if(dist<13){const scale=1-dist/18;const k=this.enemies.damage(e,120*scale*this.weapons.damageMultiplier,new THREE.Vector3(e.x,e.y,e.z),'pulse');if(!k){const dx=(e.x-p.x)/Math.max(.1,dist),dz=(e.z-p.z)/Math.max(.1,dist),nx=e.x+dx*3,nz=e.z+dz*3;if(this.world.canMove(nx,nz,e.radius)) {e.x=nx;e.z=nz;}}}}this.audio.play('pulse');this.toast('PULSO ELETROMAGNÉTICO · ÁREA LIMPA');}
  onEnemyKill(e){this.powers?.onCasualEnemyKill(e);this.kills++;this.waveKilled++;this.combo++;this.comboTimer=4;const multiplier=1+Math.min(5,Math.floor(this.combo/4))*.25;const parkourBonus=this.parkour?.y>3||this.parkour&&!this.parkour.grounded?1.5:1;const points=Math.round(e.cfg.points*multiplier*parkourBonus);this.score+=points;const combatCredits=this.powers?.earnKillCredit(e)||0;if(parkourBonus>1)this.parkour.prompt='ELIMINAÇÃO AÉREA · BÔNUS 50%';if(this.player.killsHeal)this.player.health=Math.min(this.player.maxHealth,this.player.health+this.player.killsHeal);const feed=el('killfeed'),d=document.createElement('div');d.innerHTML=`ALVO ${e.type.toUpperCase()} ELIMINADO <b>+${points} PTS · +${combatCredits} CR</b>`;feed.prepend(d);while(feed.children.length>4)feed.lastChild.remove();setTimeout(()=>d.remove(),3500);if(e.boss)this.toast('COLOSSUS NEUTRALIZADO · +'+points+' XP');this.updateHud();}
  pickup(type){const p=this.player;if(type==='medkit'){p.health=Math.min(p.maxHealth,p.health+36);p.shield=Math.min(p.maxShield,p.shield+13);this.toast('KIT DE REPARO · +36 INTEGRIDADE');}else{for(const [i,s] of this.weapons.state.entries())s.reserve+=Math.ceil(WEAPONS[i].clip*1.5);this.toast('MUNIÇÃO REABASTECIDA');}this.updateHud();}
  takeDamage(damage){const p=this.player;if(this.state!=='playing'||p.invulnerable>0||(this.powers?.isActive('phase')||this.powers?.isActive('shield')))return;p.lastDamage=this.animTime;p.invulnerable=.25;let left=damage;if(p.shield>0){const absorbed=Math.min(p.shield,left);p.shield-=absorbed;left-=absorbed;}if(left>0)p.health=Math.max(0,p.health-left);this.damageFlash=.75;this.thirdPerson?.emitHit();this.audio.play('hurt');if(p.health<=0){if(!this.powers.tryResurrection())this.die();}this.updateHud();}
  die(){const record=this.saveBest();this.mouseDown=false;this.setState('dead');this.hideScreens();el('death-screen').classList.remove('hidden');el('final-wave').textContent=this.wave;el('final-kills').textContent=this.kills;el('final-score').textContent=this.score.toLocaleString('pt-BR');el('new-record').classList.toggle('hidden',!record||this.score===0);if(document.pointerLockElement)document.exitPointerLock();}
  shootRay(origin,dir,damage,range,weapon){
    if(this.mode==='multiplayer'){
      const wall=this.world.raycastSurface(origin,dir,range);
      return {hit:false,killed:false,point:wall?.point??origin.clone().addScaledVector(dir,range)};
    }
    const surface=this.world.raycastSurface(origin,dir,range);
    const wallDist=surface?.distance??range;
    const barrelHit=this.world.findBarrelHit(origin,dir,wallDist+.02);
    const enemyHit=this.enemies.raycast(origin,dir,wallDist);
    // Resolve the nearest hit, not the barrel first if a soldier is in front.
    if(barrelHit?.barrel && (!enemyHit || barrelHit.distance<enemyHit.distance)){
      if(this.world.damageBarrel(barrelHit.barrel,damage))this.barrelBlast(barrelHit.barrel);
      else this.enemies.spawnParticles(barrelHit.point,0xffb588,6,.65);
      return {hit:false,killed:false,point:barrelHit.point};
    }
    if(enemyHit){
      const multiplier=enemyHit.headshot?1.75:1;
      const killed=this.enemies.damage(enemyHit.enemy,damage*multiplier,enemyHit.point);
      return {hit:true,killed,point:enemyHit.point};
    }
    const end=origin.clone().addScaledVector(dir,wallDist);
    if(surface){
      this.world.addImpact(surface);
      this.enemies.spawnParticles(end,0xc8beb0,4,.38);
    }
    return {hit:false,killed:false,point:end};
  }
  barrelBlast(b){const pos=new THREE.Vector3(b.x,1,b.z);this.enemies.spawnParticles(pos,0xff944e,42,1.6);this.audio.play('shotgun');
    this.score+=35;for(const e of [...this.enemies.enemies]){const dist=Math.hypot(e.x-b.x,e.z-b.z);if(dist<8)this.enemies.damage(e,Math.max(15,165*(1-dist/9)),pos,'pulse');}
    const dist=Math.hypot(this.player.x-b.x,this.player.z-b.z);if(dist<7)this.takeDamage(Math.max(5,42*(1-dist/8)));this.toast('TANQUE DE COMBUSTÍVEL DETONADO · +35');
  }
  hitmarker(kill){const h=el('hitmarker');h.classList.add('active');h.classList.toggle('kill',kill);this.hitmarkTimer=.13;}
  toast(text){el('toast').textContent=text;el('toast').classList.add('active');this.toastTimer=2.1;}
  positionCamera(){const p=this.player;this.world.setFPSCamera(p.x,p.eyeY,p.z,this.yaw,this.pitch);}
  updatePlayer(dt){const p=this.player;p.dashCd=Math.max(0,p.dashCd-dt);this.grenadeCd=Math.max(0,this.grenadeCd-dt);p.pulseCd=Math.max(0,p.pulseCd-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.dashDuration=Math.max(0,p.dashDuration-dt);p.slideDuration=Math.max(0,p.slideDuration-dt);
    if(this.animTime-p.lastDamage>4&&p.shield<p.maxShield)p.shield=Math.min(p.maxShield,p.shield+dt*13);
    let f=Number(!!(this.keys.KeyW||this.keys.ArrowUp))-Number(!!(this.keys.KeyS||this.keys.ArrowDown)),r=Number(!!(this.keys.KeyD||this.keys.ArrowRight))-Number(!!(this.keys.KeyA||this.keys.ArrowLeft));const mag=Math.hypot(f,r);if(mag>0){f/=mag;r/=mag;}const nx=-Math.sin(this.yaw)*f+Math.cos(this.yaw)*r,nz=-Math.cos(this.yaw)*f-Math.sin(this.yaw)*r;const sprint=this.keys.ShiftLeft||this.keys.ShiftRight;const speed=(p.dashDuration>0?33:p.slideDuration>0?15:sprint?11.1:7.1)*p.speedBonus;
    const accel=Math.min(1,dt*(p.dashDuration>0?21:10));p.moveX=lerp(p.moveX,nx*speed,accel);p.moveZ=lerp(p.moveZ,nz*speed,accel);
    if(p.dashDuration>0&&mag===0){p.moveX=-Math.sin(this.yaw)*speed;p.moveZ=-Math.cos(this.yaw)*speed;}
    const dx=p.moveX*dt,dz=p.moveZ*dt;if(this.world.canMove(p.x+dx,p.z,p.radius))p.x+=dx;else p.moveX=0;if(this.world.canMove(p.x,p.z+dz,p.radius))p.z+=dz;else p.moveZ=0;
    if(p.jump>0||p.velY>0){p.velY-=24*dt;p.jump=Math.max(0,p.jump+p.velY*dt);if(p.jump===0)p.velY=0;}
    const eye=PLAYER_HEIGHT+p.jump-(p.slideDuration>0?.48:0);p.eyeY=lerp(p.eyeY,eye,Math.min(1,dt*16));this.positionCamera();return Math.hypot(p.moveX,p.moveZ)>1;
  }
  updateRadar(){
    if(this.mode==='multiplayer'){this.multiplayer?.drawMinimap();return;}
    const ctx=this.radarCtx;if(!ctx)return;const canvas=ctx.canvas,w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(6,25,33,.85)';ctx.beginPath();ctx.arc(cx,cy,80,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#285764';ctx.lineWidth=1;for(const r of [25,50,75]){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(10,cy);ctx.lineTo(170,cy);ctx.moveTo(cx,10);ctx.lineTo(cx,170);ctx.stroke();ctx.strokeStyle='#4bd9bd30';ctx.fillStyle='#5bfbe833';ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,80,-Math.PI/2-.35,-Math.PI/2+.35);ctx.closePath();ctx.fill();const scale=1.25;
    for(const e of this.enemies.enemies){const dx=e.x-this.player.x,dz=e.z-this.player.z;const x=dx*Math.cos(this.yaw)-dz*Math.sin(this.y),z=dx*Math.sin(this.y)+dz*Math.cos(this.y);const rx=cx+x*scale,ry=cy+z*scale;if(Math.hypot(rx-cx,ry-cy)>77)continue;ctx.fillStyle=e.boss?'#ffbf69':'#ff607b';ctx.beginPath();ctx.arc(rx,ry,e.boss?5:3,0,Math.PI*2);ctx.fill();}
    if(this.mode==='campaign'&&this.campaign.active){for(const obj of this.campaign.objectives){if(obj.done)continue;const dx=obj.x-this.player.x,dz=obj.z-this.player.z;const x=dx*Math.cos(this.yaw)-dz*Math.sin(this.yaw),z=dx*Math.sin(this.yaw)+dz*Math.cos(this.yaw);const rx=cx+x*scale,ry=cy+z*scale;if(Math.hypot(rx-cx,ry-cy)<78){ctx.fillStyle='#f8d17e';ctx.fillRect(rx-4,ry-4,8,8);}}}
    if(this.mode==='multiplayer')for(const entry of this.multiplayer.others.values()){const dx=entry.group.position.x-this.player.x,dz=entry.group.position.z-this.player.z;const rx=cx+(dx*Math.cos(this.yaw)-dz*Math.sin(this.y))*scale,ry=cy+(dx*Math.sin(this.y)+dz*Math.cos(this.y))*scale;if(Math.hypot(rx-cx,ry-cy)<78){ctx.fillStyle='#ff956a';ctx.beginPath();ctx.arc(rx,ry,4,0,Math.PI*2);ctx.fill();}}
    ctx.fillStyle='#72ffde';ctx.beginPath();ctx.moveTo(cx,cy-7);ctx.lineTo(cx-4,cy+6);ctx.lineTo(cx+4,cy+6);ctx.closePath();ctx.fill();}
  updateHud(){if(!this.weapons)return;const p=this.player,w=this.weapons,s=w.ammo;el('health-number').textContent=Math.ceil(p.health);el('health-bar').style.width=(p.health/p.maxHealth*100)+'%';el('health-number').nextElementSibling.textContent='/'+Math.ceil(p.maxHealth);el('shield-number').textContent=Math.ceil(p.shield);el('shield-bar').style.width=(p.shield/p.maxShield*100)+'%';el('wave').textContent=fmt(this.wave);el('hostiles').textContent=fmt(this.enemies.count()+this.pendingSpawns.length);el('wave-progress').style.width=(this.waveCount?this.waveKilled/this.waveCount*100:0)+'%';el('score').textContent=num(this.score);el('weapon-name').textContent=w.def.name;el('weapon-sub').textContent=w.def.sub;el('weapon-type').textContent=w.def.type;el('ammo').textContent=fmt(s.clip);el('reserve').textContent=s.reserve;el('combo').textContent=this.combo>2?'COMBO ×'+this.combo:'';
    const dashReady=1-p.dashCd/Math.max(2.5,4.8*p.dashFactor),pulseReady=1-p.pulseCd/12;el('grenade-fill').style.width=(100*Math.max(0,1-this.grenadeCd/7.5))+'%';el('grenade-label').textContent=this.grenadeCd>0?this.grenadeCd.toFixed(1)+' S':'PRONTO';el('grenade-ui').classList.toggle('cooling',this.grenadeCd>0);el('dash-fill').style.width=(Math.max(0,dashReady)*100)+'%';el('pulse-fill').style.width=(Math.max(0,pulseReady)*100)+'%';el('dash-label').textContent=p.dashCd>0?p.dashCd.toFixed(1)+' S':'PRONTO';el('pulse-label').textContent=p.pulseCd>0?p.pulseCd.toFixed(1)+' S':'PRONTO';el('dash-ui').classList.toggle('cooling',p.dashCd>0);el('pulse-ui').classList.toggle('cooling',p.pulseCd>0);if(this.mode==='multiplayer'){el('objective').textContent=this.multiplayer.roomMode==='coop'?this.multiplayer.coopObjectiveLabel():'TODOS CONTRA TODOS · ELIMINAÇÕES';el('hostiles').textContent=fmt(this.multiplayer.roomMode==='coop'?this.multiplayer.coopState?.enemies?.length||0:Math.max(0,this.multiplayer.players.length-1));}else if(this.mode!=='campaign')el('objective').textContent=this.wave%4===0?'NEUTRALIZE O COLOSSUS':'ELIMINE OS HOSTIS';document.body.classList.toggle('reloading',this.state==='playing'&&w.reloadTime>0);
    const boss=this.enemies.enemies.find(e=>e.boss);el('boss-hud').classList.toggle('hidden',!boss);if(boss)el('boss-fill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';if(this.mode==='campaign'&&this.campaign.active)this.campaign.refreshHUD();else if(this.mode==='multiplayer'){el('mission-id').textContent='MULTIPLAYER · SALA '+this.multiplayer.room;el('chapter-label').textContent=this.multiplayer.roomMode==='coop'?'COOP · OPERAÇÃO':'PVP · TODOS CONTRA TODOS';el('wave').classList.add('hidden');el('mission-progress-label').textContent='JOGADORES';}else{el('mission-id').textContent='MODO SOBREVIVÊNCIA';el('chapter-label').textContent='ONDA';el('wave').classList.remove('hidden');el('mission-progress-label').textContent='ONDA';}}
  dieFxUpdate(dt){for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;const t=1-f.life/f.max;if(f.type==='ring'){const s=1+t*12;f.mesh.scale.set(s,s,s);f.mesh.material.opacity=Math.max(0,1-t);}if(f.life<=0){this.world.scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();this.fx.splice(i,1);}}}
  updateCombatTimers(dt){
    const p=this.player;
    p.dashCd=Math.max(0,p.dashCd-dt);
    this.grenadeCd=Math.max(0,this.grenadeCd-dt);
    p.pulseCd=Math.max(0,p.pulseCd-dt);
    p.invulnerable=Math.max(0,p.invulnerable-dt);
    p.dashDuration=Math.max(0,p.dashDuration-dt);
    if(this.mode!=='multiplayer'&&this.animTime-p.lastDamage>4&&p.shield<p.maxShield)
      p.shield=Math.min(p.maxShield,p.shield+dt*13);
    this.comboTimer=Math.max(0,this.comboTimer-dt);
    if(this.comboTimer===0)this.combo=0;
  }
  optimizeFPS(interval){
    if(!this.adaptiveFPS||this.state!=='playing')return;
    const lowTarget=this.mobile?.enabled?29:43;const highTarget=this.mobile?.enabled?39:58;
    if(this.fps<lowTarget){this.lowFPSTime+=interval;this.highFPSTime=0;}
    else if(this.fps>highTarget){this.highFPSTime+=interval;this.lowFPSTime=0;}
    else{this.lowFPSTime=0;this.highFPSTime=0;}
    const floor=this.mobile?.enabled ? 0.55 : 0.63;
    if(this.lowFPSTime>=2.1 && this.world.renderScale>floor){
      this.world.setRenderScale(Math.max(floor,this.world.renderScale-.08));
      el('render-scale').value=Math.round(this.world.renderScale*100);
      el('render-scale-label').textContent=Math.round(this.world.renderScale*100)+'%';
      this.lowFPSTime=0;
    }else if(this.highFPSTime>=7.0 && this.world.renderScale<1){
      this.world.setRenderScale(Math.min(1,this.world.renderScale+.05));
      el('render-scale').value=Math.round(this.world.renderScale*100);
      el('render-scale-label').textContent=Math.round(this.world.renderScale*100)+'%';
      this.highFPSTime=0;
    }
  }
  loop(){requestAnimationFrame(()=>this.loop());let dt=Math.min(.04,this.clock.getDelta());this.animTime+=dt;this.world.update(dt);this.urban.animateEnvironment(dt);if(this.campaign)for(const a of this.campaign.artifacts)if(a.mesh.parent)a.mesh.rotation.y+=a.rotation*dt;this.dieFxUpdate(dt);this.fpsTick+=dt;if(this.fpsTick>=.7){this.fps=Math.round(this.fpsCount/this.fpsTick);el('perf-fps').textContent=this.fps+' FPS · '+this.world.renderer.info.render.calls+' DRAWS · '+Math.round(this.world.renderScale*100)+'%';this.optimizeFPS(.7);this.fpsCount=0;this.fpsTick=0;}
    if(this.state==='playing'){
      this.updateCombatTimers(dt);
      this.powers.update(dt);
      if((this.mode!=='multiplayer'||this.multiplayer.alive)&&!this.powers.frozen()&&!this.powers.motion.hasDash())this.parkour.update(dt);
      else if(this.powers.frozen())this.positionCamera();
      this.multiplayer.update(dt);
      this.cityTick-=dt;
      if(this.cityTick<=0){this.urban.updateVisibility(this.player.x,this.player.z,this.world.quality==='low'?105:this.world.quality==='medium'?138:190);this.cityTick=.55;}
      const moving=Math.hypot(this.parkour.vx,this.parkour.vz)>1;
      this.weapons.update(dt,moving,this.rightDown);
      if(this.mouseDown&&!this.powers.frozen()&&!this.powers.targeting&&!this.powers.isActive('phase')&&(this.mode!=='multiplayer'||this.multiplayer.alive)&&(this.mobile?.enabled||document.pointerLockElement===this.world.renderer.domElement)){if(this.mode!=='multiplayer'&&this.powers.isActive('invisible'))this.powers.status.invisible=0;if(this.mode!=='multiplayer'&&this.powers.isActive('morph'))this.powers.cancelMorph();this.weapons.fire();}
      if(this.mode!=='multiplayer'){this.enemies.decoys=this.powers.decoys;this.enemies.hiddenPlayer=this.powers.isActive('invisible');this.enemies.allies=this.mode==='campaign'?this.squad.members:[];this.enemies.update(dt,this.player,this.wave);this.ordnance.update(dt);}
      if(this.mode==='campaign'){this.squad.update(dt);this.campaign.update(dt);}
      if(this.state==='playing'&&this.mode!=='multiplayer'){if(this.pendingSpawns.length){this.spawnTimer-=dt;if(this.spawnTimer<=0&&this.enemies.count()<7){this.enemies.spawnAt(this.pendingSpawns.shift(),this.player,this.wave);this.spawnTimer=rand(.65,1.3);}}else if(this.enemies.count()===0){if(this.mode==='campaign'){if(this.campaign.phase==='clear'||this.campaign.phase==='boss')this.campaign.onCleared();}else this.waveComplete();}
        this.uiTick-=dt;if(this.uiTick<=0){this.updateHud();this.uiTick=.095;}this.radarTick-=dt;if(this.radarTick<=0){this.updateRadar();this.radarTick=.12;}}
      else if(this.state==='playing'){this.uiTick-=dt;if(this.uiTick<=0){this.updateHud();this.uiTick=.15;}this.radarTick-=dt;if(this.radarTick<=0){this.updateRadar();this.radarTick=.2;}}
    }else if(this.mode==='multiplayer'&&this.state==='paused'){this.multiplayer.update(dt);this.mouseDown=false;}else if(this.state==='menu'){const t=this.animTime*.095;this.world.setMenuCamera(t);this.weapons.model.visible=false;}else if(this.state==='paused'||this.state==='upgrade'||this.state==='dead'){/* Keep last camera frame and scene. */}
    if(this.state==='playing')this.weapons.model.visible=this.thirdPerson.mode==='first';
    if(this.calloutTimer>0){this.calloutTimer-=dt;if(this.calloutTimer<=0)el('wave-callout').classList.remove('active');}
    if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)el('toast').classList.remove('active');}
    if(this.hitmarkTimer>0){this.hitmarkTimer-=dt;if(this.hitmarkTimer<=0){el('hitmarker').classList.remove('active','kill');}}
    if(this.damageFlash>0)this.damageFlash=Math.max(0,this.damageFlash-dt*1.7);el('damage-vignette').style.opacity=(this.damageFlash*.75).toFixed(3);
    this.thirdPerson.update(dt);
    if(this.state==='playing'&&this.powers.motion.shake>0){const strength=this.powers.motion.shake*(this.mobile?.enabled ? .012 : .020);this.world.camera.position.x+=(Math.random()-.5)*strength;this.world.camera.position.y+=(Math.random()-.5)*strength;}
    const now=performance.now();if((!this.mobile?.enabled||this.mobile.landscape)&&(!this.fpsLimit||now-this.lastDraw>=1000/this.fpsLimit)){this.world.render();this.fpsCount++;this.lastDraw=now;}}
}

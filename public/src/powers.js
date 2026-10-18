import {HERO_COMBOS,dashVector,orbitLocation,segmentDistance2D} from './heroCombos.js';
import {CombatMotion,DASH_DURATION_MS,COMBO_WINDOW_MS} from './combatMotion.js';
import * as THREE from 'three';
import {POWER_VARIANTS,heroAllows,heroLoadout} from './heroRoster.js';
import {WORLD_HALF} from './worldLayout.js';
import {PowerMenu} from './powerMenu.js';
import {createOperative,animateOperative,disposeOperative} from './characters.js';
import {observeAdaptation,learned,startUltimate,ADAPT_LABELS} from './adaptation.js';
import {CasualEconomy,STARTING_POWER} from './casualEconomy.js';
import {planVault,planSkyLeap} from './vaultTraversal.js';
import {SQUAD_OBSTACLES} from './squadLayout.js';
export const POWER_DATA={
 push:{label:'REPULSÃO',icon:'◉',cool:12,help:'Empurrão extremo em 16 m'},
 freeze:{label:'CONGELAR',icon:'❄',cool:14,help:'Congela por 1,5 s em até 35 m'},
 teleport:{label:'TELEPORTE',icon:'↝',cool:22,help:'Mapa inteiro; retorno em 15 segundos'},
 flight:{label:'VOAR',icon:'↑',cool:16,duration:7000,help:'Voe durante 7 segundos'},
 invisible:{label:'INVISÍVEL',icon:'◌',cool:17,duration:5000,help:'Invisível por 5 segundos'},
 phase:{label:'INTANGÍVEL',icon:'◇',cool:23,duration:7000,help:'Atravesse paredes por 7 segundos'},
 blackhole:{label:'BURACO NEGRO',icon:'◉',cool:28,duration:5500,help:'Sucção extrema de 18 m por 5,5 s'},
 rewind:{label:'REWIND 10S',icon:'↶',cool:32,help:'Reverte posição e vida de 10 segundos'},
 chain:{label:'RAIO',icon:'ϟ',cool:13,help:'Raio fortalecido até 42 m'},
 gravity:{label:'GRAVIDADE',icon:'↟',cool:20,help:'Área de 13 m; suspende 2,7 s'},
 vault:{label:'SALTO ABSOLUTO',icon:'↥',cool:12,help:'Super salto cinematográfico até telhados e estruturas a 17 m de distância'},
 wallrun_boost:{label:'PROPULSOR INFINITO',icon:'↗',cool:16,duration:8000,help:'Impulso aéreo + corrida vertical ampliada por 8 s'},
 vex_ultimate:{label:'SEM LIMITES',icon:'✦',cool:48,duration:18000,help:'18 s de parkour extremo, saltos aéreos e impulsos gigantes'},
 forge_build:{label:'MODO CRIATIVO',icon:'▦',cool:23,duration:12000,help:'12 s colocando blocos pela mira com o botão de atirar'},
 forge_redstone:{label:'REDSTONE EXPLOSIVA',icon:'✹',cool:26,help:'Arma seus blocos, detone ao atirar e crie reações em cadeia'},
 forge_ultimate:{label:'DOMÍNIO VOXEL',icon:'▩',cool:55,duration:16000,help:'16 s de construção acelerada e até 60 blocos ativos'},
 adapt_scan:{label:'EVOLUÇÃO FORÇADA',icon:'⟁',cool:22,duration:8000,help:'Aprende o próximo evento sofrido; imune ao repetir'},
 adapt_counter:{label:'CONTRAEVOLUÇÃO',icon:'⇄',cool:28,help:'Transforma adaptação recente em contra-ataque'},
 adapt_ultimate:{label:'ADAPTAÇÃO ABSOLUTA',icon:'◎',cool:60,duration:15000,help:'Aprende automaticamente três eventos e bloqueia um golpe fatal'},
 clones:{label:'CLONES',icon:'♧',cool:15,duration:10000,help:'Três cópias por 10 segundos'},
 clonejump:{label:'CLONE MÓVEL',icon:'✧',cool:20,duration:14000,help:'Clone corre por 14 s; reative para trocar'},
 shield:{label:'ESCUDO',icon:'⬡',cool:23,duration:7000,help:'Proteção por 7 segundos'},
 swap:{label:'TROCA',icon:'⇄',cool:21,help:'Troca dimensional até 60 m'},
 copy:{label:'COPIAR',icon:'⧉',cool:27,help:'Marque e elimine em 18s; copie por 30s'},
 resurrection:{label:'RESSURREIÇÃO',icon:'✚',cool:48,duration:4000,help:'Passiva: renasce automaticamente; imortal 4s'},
 heal:{label:'CURA',icon:'♥',cool:17,help:'Recupera 70 HP e 25 de escudo'},
 morph:{label:'VIRAR OBJETO',icon:'▣',cool:18,duration:10000,help:'Copie tambor, caminhão ou empilhadeira por 10s'},
 ...POWER_VARIANTS
};
const $=id=>document.getElementById(id);
const now=()=>Date.now();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class PowerSystem {
 constructor(game){
  this.game=game;this.motion=new CombatMotion(game);this.comboStages={};this.comboVisual=null;this.economy=new CasualEconomy();this.loadout=['push','teleport','heal'];this.cooldowns={};this.status={};this.returnPoint=null;this.targeting=false;
  this.lastSafe={x:0,y:0,z:18};this.teleportMarker=null;this.effects=[];this.flightBefore=false;this.uiTick=0;this.history=[];this.localHazards=[];this.decoys=[];this.cloneTargets=[];this.cloneJumpUsed=false;this.aimTouch=null;this.prevGravity=null;this.copyMark=null;this.copyBuff=null;this.propLabel=null;this.adaptive={};
  try{const val=JSON.parse(localStorage.getItem('titan-power-loadout')||'null');if(Array.isArray(val)&&POWER_DATA[val[0]]&&POWER_DATA[val[1]]&&val[0]!==val[1])this.loadout=val;}catch{}
  this.menuLoadout=[...this.loadout];
  for(const select of document.querySelectorAll('[data-power-slot]')){
   select.addEventListener('change',()=>this.equip(Number(select.dataset.powerSlot),select.value));
  }
  for(let slot=0;slot<3;slot++){
   const button=$('power-'+['a','b','c'][slot]);
   // Mouse/keyboard: fire immediately in crosshair direction. Touch: skill-shot joystick.
   button.addEventListener('click',()=>{if(!this.game.mobile?.enabled)this.useSlot(slot);});
   let touch=null;
   button.addEventListener('pointerdown',e=>{
     if(e.pointerType==='mouse'||this.game.state!=='playing')return;
     if(e.pointerType==='touch'&&('ontouchstart' in window))return;
     e.preventDefault();e.stopPropagation();
     const id=this.loadout[slot],skillShot=!!id&&this.needsAim(id);
     touch={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,slot,skillShot,cancelled:false};
     try{button.setPointerCapture(e.pointerId);}catch{}
     button.classList.add('pressed');
     if(skillShot){this.aimTouch=touch;this.showAimGuide(id);}
     else this.useSlot(slot);
   });
   button.addEventListener('pointermove',e=>{
     if(!touch||touch.id!==e.pointerId||!touch.skillShot)return;
     e.preventDefault();e.stopPropagation();
     const totalX=e.clientX-touch.startX,totalY=e.clientY-touch.startY;
     // Drag up into CANCEL zone. Release there: zero cost / no cooldown.
     touch.cancelled=totalY< -100&&Math.abs(totalX)<65;
     const dx=e.clientX-touch.x,dy=e.clientY-touch.y;
     touch.x=e.clientX;touch.y=e.clientY;
     if(!touch.cancelled&&Math.abs(dx)<130&&Math.abs(dy)<130){
       const g=this.game;
       if(g.look.move(dx*g.mobile.touchSensitivity*.86,dy*g.mobile.touchSensitivity*.86,g.sensitivity))g.positionCamera();
     }
     this.showAimGuide(this.loadout[slot],touch);
   });
   const release=(e,aborted=false)=>{
     if(!touch||touch.id!==e.pointerId)return;
     e.preventDefault();e.stopPropagation();
     const cast=touch.skillShot&&!touch.cancelled&&!aborted;
     const id=this.loadout[slot],dx=(e.clientX??touch.x)-touch.startX;
     touch=null;button.classList.remove('pressed');this.aimTouch=null;this.hideAimGuide();
     if(cast){
       if(id==='clonejump'&&this.cloneAvailable())this.jumpClone(dx);
       else this.use(id);
     }
   };
   button.addEventListener('pointerup',e=>release(e));
   button.addEventListener('pointercancel',e=>release(e,true));
   button.addEventListener('lostpointercapture',e=>release(e,true));
  }
  // Real mobile browsers can dispatch touch events to the look overlay, even
  // when the skill HUD is visible. Capture finger coordinates at document level.
  this.abilityTouches=new Map();
  const hitSkill=(x,y)=>{
    for(let i=0;i<3;i++){
      const b=$('power-'+['a','b','c'][i]);if(!b)continue;
      const r=b.getBoundingClientRect();if(r.width&&r.height&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return i;
    }
    return -1;
  };
  document.addEventListener('touchstart',e=>{
    if(!this.game.mobile?.enabled||this.game.state!=='playing'||!this.game.mobile.landscape)return;
    let claimed=false;
    for(const t of e.changedTouches){
      const i=hitSkill(t.clientX,t.clientY);
      if(i<0||this.abilityTouches.has(t.identifier))continue;
      const target=t.target?.closest?.('button,input,select,textarea,a');
      if(target&&!target.classList?.contains('power-slot'))continue;
      const id=this.loadout[i],aim=!!id&&this.needsAim(id);
      this.abilityTouches.set(t.identifier,{i,id,aim,x:t.clientX,y:t.clientY,startX:t.clientX,startY:t.clientY,cancelled:false});
      $('power-'+['a','b','c'][i]).classList.add('pressed');
      if(aim)this.showAimGuide(id);
      else this.useSlot(i);
      claimed=true;
    }
    if(claimed){e.preventDefault();e.stopImmediatePropagation();}
  },{capture:true,passive:false});
  document.addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){const a=this.abilityTouches.get(t.identifier);if(!a)continue;
      const dx=t.clientX-a.x,dy=t.clientY-a.y;a.x=t.clientX;a.y=t.clientY;
      a.cancelled=t.clientY-a.startY< -100&&Math.abs(t.clientX-a.startX)<65;
      if(a.aim&&!a.cancelled&&Math.abs(dx)<130&&Math.abs(dy)<130){
        const g=this.game;if(g.look.move(dx*g.mobile.touchSensitivity*.75,dy*g.mobile.touchSensitivity*.75,g.sensitivity))g.positionCamera();
      }
      if(a.aim)this.showAimGuide(a.id,a);
    }
  },{capture:true,passive:false});
  const endSkill=e=>{
    let handled=false;
    for(const t of e.changedTouches){const a=this.abilityTouches.get(t.identifier);if(!a)continue;
      this.abilityTouches.delete(t.identifier);$('power-'+['a','b','c'][a.i]).classList.remove('pressed');
      if(a.aim&&!a.cancelled&&e.type!=='touchcancel'){
        if(a.id==='clonejump'&&this.cloneAvailable())this.jumpClone(t.clientX-a.startX);
        else this.use(a.id);
      }
      handled=true;
    }
    if(handled){this.hideAimGuide();e.preventDefault();}
  };
  document.addEventListener('touchend',endSkill,{capture:true,passive:false});
  document.addEventListener('touchcancel',endSkill,{capture:true,passive:false});
  const descend=$('power-descend');
  descend.addEventListener('pointerdown',e=>{e.preventDefault();this.game.keys.ControlLeft=true;try{descend.setPointerCapture(e.pointerId);}catch{}});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])descend.addEventListener(evt,()=>{this.game.keys.ControlLeft=false;});
  this.refreshSelects();this.refreshButtons();this.menu=new PowerMenu(this,POWER_DATA);this.initTouchLayout();
 }
 initTouchLayout(){
  // Personalização local: tamanho e deslocamento dos poderes sem novos botões no combate.
  const saved={size:1,x:0,y:0};
  try{Object.assign(saved,JSON.parse(localStorage.getItem('titan-power-touch-layout')||'{}'));}catch{}
  const valid={size:clamp(Number(saved.size)||1,.85,1.15),x:clamp(Number(saved.x)||0,-25,75),y:clamp(Number(saved.y)||0,0,75)};
  const apply=()=>{
    const root=document.documentElement;
    root.style.setProperty('--power-size-scale',String(valid.size));
    root.style.setProperty('--power-horizontal-shift',valid.x+'px');
    root.style.setProperty('--power-vertical-shift',valid.y+'px');
    try{localStorage.setItem('titan-power-touch-layout',JSON.stringify(valid));}catch{}
    for(const field of document.querySelectorAll('[data-power-layout]')){
      const key=field.dataset.powerLayout;
      if(field!==document.activeElement)field.value=String(valid[key]);
      const label=field.parentNode?.querySelector('.power-layout-value');
      if(label)label.textContent=key==='size'?Math.round(valid.size*100)+'%':(valid[key]>0?'+':'')+valid[key]+'px';
    }
  };
  const targets=[document.querySelector('#pause-screen .dialog'),document.querySelector('#mp-room-panel .mp-room-main')].filter(Boolean);
  for(const target of targets){
    const box=document.createElement('div');box.className='power-touch-settings';
    box.innerHTML='<strong>AJUSTAR BOTÕES DE HABILIDADES (CELULAR)</strong><label>Tamanho <output class="power-layout-value"></output><input type="range" data-power-layout="size" min="0.85" max="1.15" step="0.05"></label><label>Esquerda / direita <output class="power-layout-value"></output><input type="range" data-power-layout="x" min="-25" max="75" step="5"></label><label>Altura <output class="power-layout-value"></output><input type="range" data-power-layout="y" min="0" max="75" step="5"></label>';
    target.appendChild(box);
    for(const field of box.querySelectorAll('input'))field.addEventListener('input',()=>{valid[field.dataset.powerLayout]=Number(field.value);apply();});
  }
  apply();
 }
 reset(){this.motion.clear();this.comboStages={};this.clearComboVisual();if(this.copyBuff?.original){this.loadout=[...this.copyBuff.original];this.refreshSelects();this.refreshButtons();}this.cooldowns={};this.status={};this.returnPoint=null;this.targeting=false;this.cleanupMarker();for(const e of this.effects){this.game.world.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}this.effects=[];this.lastSafe={x:0,y:0,z:18};this.history=[];this.localHazards=[];this.cloneTargets=[];this.cloneJumpUsed=false;this.copyMark=null;this.copyBuff=null;this.adaptive={};this.status.resurrection=0;this.status.morph=0;this.aimTouch=null;this.hideAimGuide();this.clearDecoys();this.menu?.close();this.refreshButtons();}
 restoreMenuLoadout(){this.loadout=[...this.menuLoadout];this.refreshSelects();this.refreshButtons();this.updateEconomyHUD();}
 startRun(mode){this.motion.clear();const kit=heroLoadout(this.game.heroSelection?.selectedHero);this.economy.reset(kit[0]);this.economy.owned=new Set(kit);this.loadout=[...kit];this.comboStages={};this.refreshButtons();this.refreshSelects();this.updateEconomyHUD();}
 isCasualRun(){return this.game.mode!=='multiplayer'&&this.game.mode!==undefined&&this.game.state!=='menu';}
 earnKillCredit(enemy){return 0;}
 updateEconomyHUD(){const hud=$('titan-economy-hud');if(!hud)return;const active=this.isCasualRun();hud.classList.toggle('hidden',!active);if(active)hud.textContent='✦ KIT COMPLETO · 3 PODERES LIBERADOS';}
 isUnlocked(id){return heroAllows(this.game.heroSelection?.selectedHero,id)||!!(this.copyBuff?.until>now()&&this.loadout.includes(id));}
 acquire(slot,id){return this.equip(slot,id);}
 equip(slot,id){
  if(!POWER_DATA[id]||!heroAllows(this.game.heroSelection?.selectedHero,id))return false;

  if(this.loadout.some((power,i)=>i!==slot&&power===id)){this.game.toast('EQUIPE HABILIDADES DIFERENTES');this.refreshSelects();return false;}
  if(this.copyBuff){this.copyBuff=null;this.copyMark=null;}this.loadout[slot]=id;this.cancelTargeting();
  if(!this.isCasualRun()){this.menuLoadout=[...this.loadout];try{localStorage.setItem('titan-power-loadout',JSON.stringify(this.loadout));}catch{}}
  if(this.game.mode==='multiplayer'&&this.game.multiplayer?.connected)this.game.multiplayer.send({type:'equip',loadout:this.loadout});
  this.refreshSelects();this.refreshButtons();return true;
 }
 refreshSelects(){for(const s of document.querySelectorAll('[data-power-slot]'))s.value=this.loadout[Number(s.dataset.powerSlot)]||'';}
 refreshButtons(){for(let i=0;i<3;i++){const id=this.loadout[i],btn=$('power-'+['a','b','c'][i]);btn.querySelector('.power-symbol').textContent=id?POWER_DATA[id]?.icon||'◇':'＋';btn.querySelector('.power-name').textContent=id?POWER_DATA[id]?.label||'PODER':'LIVRE';btn.classList.toggle('power-empty',!id);}}
 isActive(id){return (this.status[id]||0)>now();}
 frozen(){return this.isActive('freeze')||this.isActive('gravity');}
 cancelTargeting(){this.targeting=false;this.cleanupMarker();}
 useSlot(i){this.use(this.loadout[i]);}
 use(id){
  const g=this.game;if(g.state!=='playing'||!POWER_DATA[id]||(g.mode==='multiplayer'&&!g.multiplayer.alive))return;
  if(!this.isUnlocked(id)){g.toast('PODER EXCLUSIVO DO SEU PERSONAGEM');return;}
  if(HERO_COMBOS[id]){this.useCombo(id);return;}
  if(id==='teleport'&&this.returnPoint?.until>now()){this.returnTeleport();return;}
  if(id==='clonejump'&&this.cloneAvailable()){this.jumpClone();return;}
  if(id==='resurrection'){g.toast('RESSURREIÇÃO É AUTOMÁTICA AO MORRER');return;}
  if(id==='morph'&&this.isActive('morph')){this.cancelMorph();return;}

  if(this.frozen()){g.toast('CONGELADO!');return;}
  if((this.cooldowns[id]||0)>now()){g.toast('RECARGA · '+Math.ceil((this.cooldowns[id]-now())/1000)+'s');return;}
  if(this.isActive('phase')&&id!=='phase')return;
  if(id==='teleport'){g.mouseDown=false;this.menu.openTeleport();return;}
  if(id==='morph'){const target=this.findMorphObject();if(target)this.morphVisualType=target.type;if(!target){g.toast('APROXIME-SE DE UM TAMBOR, CAMINHÃO OU EMPILHADEIRA');return;}if(g.mode==='multiplayer'){g.multiplayer.syncState();g.multiplayer.send({type:'power',id});}else{this.status.morph=now()+10000;this.cooldowns.morph=now()+POWER_DATA.morph.cool*1000;g.toast('DISFARCE DE '+({barrel:'TAMBOR',truck:'CAMINHÃO',forklift:'EMPILHADEIRA'})[target.type]+' · 10S');}return;}
  if(g.mode==='multiplayer'){g.multiplayer.syncState();g.multiplayer.send({type:'power',id});return;}
  const hpRatioBefore=g.player.health/Math.max(1,g.player.maxHealth);this.lastCastPenalty=0;
  if(this.applyLocal(id)!==false){const hpRatio=hpRatioBefore;const blackholeCenter=(POWER_VARIANTS[id]?.base||id)==='blackhole'?this.aimLocal(28):null;const nearby=blackholeCenter?g.enemies.enemies.filter(e=>Math.hypot(e.x-blackholeCenter.x,e.z-blackholeCenter.z)<18).length:0;const penalty=((POWER_VARIANTS[id]?.base||id)==='heal'&&hpRatio<=.3?6000:0)+((POWER_VARIANTS[id]?.base||id)==='blackhole'&&nearby>=2?7000:0)+this.lastCastPenalty;this.cooldowns[id]=now()+POWER_DATA[id].cool*1000+penalty;}
 }
 useTouch(slot,e,release=false){
  const id=this.loadout[slot];
  if(release){if(id==='teleport'&&this.targeting)this.confirmTeleport();return;}
  if(id==='teleport'&&!this.targeting&&!this.returnPoint){this.use(id);return;}
  this.use(id);
 }

 clearComboVisual(){if(!this.comboVisual)return;this.game.world.scene.remove(this.comboVisual);this.comboVisual.geometry.dispose();this.comboVisual.material.dispose();this.comboVisual=null;}
 showComboVisual(color=0xff9fe6){
  this.clearComboVisual();const orb=new THREE.Mesh(new THREE.SphereGeometry(.45,12,10),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.77,depthWrite:false}));
  this.game.world.scene.add(orb);this.comboVisual=orb;
 }
 useCombo(id){
  const g=this.game,t=now(),data=POWER_DATA[id],stage=this.comboStages[id];
  if(this.frozen())return;
  if(this.motion.hasDash()){g.toast('CONCLUA O DASH PARA REATIVAR');return;}
  if(!(stage?.until>t)&&(this.cooldowns[id]||0)>t){g.toast('RECARGA · '+Math.ceil((this.cooldowns[id]-t)/1000)+'s');return;}
  
  if(g.mode==='multiplayer'){
   const dir=g.parkour.dashDirection();
   g.multiplayer.syncState();g.multiplayer.send({type:'power',id,dx:dir.x,dz:dir.z});return;
  }
  const p=g.parkour,valid=(x,z)=>g.urban.canOccupy(x,z,p.y,1.8,.48);
  const origin={x:p.x,y:p.y,z:p.z};
  const dash=(distance,back=false)=>{let last=origin;for(let n=.5;n<=distance;n+=.5){const q=dashVector(origin.x,origin.z,g.yaw,n*(back?-1:1),p.dashDirection());if(!valid(q.x,q.z))break;last={x:q.x,y:p.y,z:q.z};}this.motion.startDash(origin,last,{duration:DASH_DURATION_MS,color:back?0xffb368:0x67eaff});return last;};
  const damage=(x,z,r,amount)=>{for(const enemy of [...g.enemies.enemies])if(!enemy.dead&&Math.hypot(enemy.x-x,enemy.z-z)<r)g.enemies.damage(enemy,amount,new THREE.Vector3(enemy.x,1,enemy.z),'pulse');};
  let next=null;
  if(id==='shiro_step'){
   if(!stage?.until||stage.until<=t){dash(7);next={step:1,until:t+COMBO_WINDOW_MS};this.cooldowns[id]=next.until+data.cool*1000;}
   else{const pt=dash(9);damage(pt.x,pt.z,5,75);this.cooldowns[id]=t+data.cool*1000;this.motion.ultimate(pt,0xff657b,5);}
  }else if(id==='shiro_retreat'){
   dash(8,true);this.status.shiro_retreat=t+6000;g.weapons.damageMultiplier*=1.35;
   setTimeout(()=>{g.weapons.damageMultiplier/=1.35;},6000);this.cooldowns[id]=t+data.cool*1000;
  }else if(id==='shiro_ricochet'){
   const foes=[...g.enemies.enemies].filter(e=>!e.dead&&Math.hypot(e.x-p.x,e.z-p.z)<45).slice(0,5);
   foes.forEach((e,i)=>g.enemies.damage(e,Math.max(35,115-i*15),new THREE.Vector3(e.x,1,e.z),'pulse'));
   this.status.shield=t+5000;this.status[id]=t+5000;this.cooldowns[id]=t+data.cool*1000;this.motion.ultimate({x:p.x,y:p.y,z:p.z},0xff487d,17);this.flash(0xff647c,14);
  }else if(id==='leo_dash'){
   if(!stage?.until||stage.until<=t){next={step:1,origin,until:t+COMBO_WINDOW_MS};dash(7);this.cooldowns[id]=next.until+data.cool*1000;}
   else if(stage.step===1){dash(8);next={...stage,step:2};}
   else{if(valid(stage.origin.x,stage.origin.z)){const old={x:p.x,y:p.y,z:p.z};p.spawn(stage.origin.x,stage.origin.y,stage.origin.z);this.motion.teleport(old,stage.origin,0xffc56c);}this.cooldowns[id]=t+data.cool*1000;}
  }else if(id==='leo_immunity'){
   this.status.shield=t+1000;this.status[id]=t+1000;this.cooldowns[id]=t+data.cool*1000;this.motion.burst({x:p.x,y:p.y,z:p.z},0xffd470,3);this.flash(0xf7cf74,4);
  }else if(id==='leo_barrage'){
   this.status.shield=t+2800;this.status[id]=t+2800;this.cooldowns[id]=t+data.cool*1000;this.motion.ultimate({x:p.x,y:p.y,z:p.z},0xffa45f,15);
   for(let i=0;i<3;i++)setTimeout(()=>{if(g.state==='playing'){for(const enemy of [...g.enemies.enemies])if(!enemy.dead)g.enemies.damage(enemy,65,new THREE.Vector3(enemy.x,1,enemy.z),'pulse');this.flash(0xffb35e,18);this.motion.ultimate({x:p.x,y:p.y,z:p.z},0xffaf62,17);}},i*500);
  }else if(id==='butterfly_dash'){
   if(!stage?.until||stage.until<=t){let last=origin;for(let n=.5;n<=10;n+=.5){const q=dashVector(origin.x,origin.z,g.yaw,n,p.dashDirection());if(!valid(q.x,q.z))break;last={x:q.x,y:p.y,z:q.z};}p.spawn(last.x,last.y,last.z);this.motion.teleport(origin,last,0xe0a0ff);next={step:1,origin,until:t+COMBO_WINDOW_MS};this.cooldowns[id]=next.until+data.cool*1000;}
   else{if(valid(stage.origin.x,stage.origin.z)){const old={x:p.x,y:p.y,z:p.z};p.spawn(stage.origin.x,stage.origin.y,stage.origin.z);this.motion.teleport(old,stage.origin,0xe0a0ff);}this.cooldowns[id]=t+data.cool*1000;}
  }else if(id==='butterfly_orbit'){
   if(!stage?.until||stage.until<=t){next={step:1,started:t,until:t+COMBO_WINDOW_MS};this.cooldowns[id]=next.until+data.cool*1000;this.status[id]=next.until;this.showComboVisual(0xae94ff);}
   else{const q=orbitLocation(p.x,p.z,stage.started,t);if(valid(q.x,q.z)){const old={x:p.x,y:p.y,z:p.z};p.spawn(q.x,p.y,q.z);this.motion.teleport(old,{x:q.x,y:p.y,z:q.z},0xb084ff);}this.cooldowns[id]=t+data.cool*1000;this.clearComboVisual();}
  }else if(id==='butterfly_launch'){
   if(!stage?.until||stage.until<=t){const target=dashVector(p.x,p.z,g.yaw,27);let last=origin;for(let k=1;k<=27;k++){const q=dashVector(p.x,p.z,g.yaw,k);if(!valid(q.x,q.z))break;last={x:q.x,y:p.y,z:q.z};}
    for(const enemy of [...g.enemies.enemies])if(segmentDistance2D(enemy.x,enemy.z,p.x,p.z,last.x,last.z)<5){g.enemies.damage(enemy,55,new THREE.Vector3(enemy.x,1,enemy.z),'pulse');const dx=enemy.x-p.x,dz=enemy.z-p.z,len=Math.hypot(dx,dz)||1;const nx=enemy.x+dx/len*6,nz=enemy.z+dz/len*6;if(g.urban.canOccupy(nx,nz,0,2,enemy.radius)){enemy.x=nx;enemy.z=nz;}}
    next={step:1,orb:last,until:t+COMBO_WINDOW_MS};this.cooldowns[id]=next.until+data.cool*1000;this.status[id]=next.until;this.showComboVisual(0xff9edc);this.motion.ultimate(origin,0xf579df,10);
   }else{if(valid(stage.orb.x,stage.orb.z)){const old={x:p.x,y:p.y,z:p.z};p.spawn(stage.orb.x,stage.orb.y,stage.orb.z);this.motion.teleport(old,stage.orb,0xff9edc);}this.cooldowns[id]=t+data.cool*1000;this.clearComboVisual();}
  }
  if(next)this.comboStages[id]=next;else delete this.comboStages[id];g.toast(data.label+' · '+(next?'REATIVÁVEL':'ATIVADA'));
 }

 localArea(id,position,range,duration=1500){
  const g=this.game;for(const enemy of [...g.enemies.enemies]){
   const dist=Math.hypot(enemy.x-position.x,enemy.z-position.z);if(dist>range)continue;
   if(id==='push'){
    const dx=(enemy.x-position.x)/(dist||1),dz=(enemy.z-position.z)/(dist||1);
    for(let t=7;t>=1;t--){const x=enemy.x+dx*t,z=enemy.z+dz*t;if(g.world.canMove(x,z,enemy.radius)&&g.urban.canOccupy(x,z,0,2,enemy.radius)){enemy.x=x;enemy.z=z;break;}}
   }
   if(id==='freeze')enemy.frozenUntil=now()+duration;
  }
 }
 applyLocal(id){
  const g=this.game,p=g.parkour,effect=POWER_VARIANTS[id]?.base||id;
  if(effect==='vault'){
    const plan=this.findVaultDestination();if(!plan||!p.startVault(plan)){g.toast('MIRE PARA UM OBSTÁCULO OU TELHADO PRÓXIMO');return false;}
    g.toast('VEX · ESCALADA INICIADA');return true;
  }
  if(effect==='wallrun_boost'){this.status.wallrun_boost=now()+8000;p.vy=Math.max(p.vy,16);g.toast('PROPULSOR · 8S · PULE E CORRA POR PAREDES');return true;}
  if(effect==='vex_ultimate'){this.status.vex_ultimate=now()+18000;p.vy=Math.max(p.vy,19);g.toast('SEM LIMITES · 18S · PARKOUR EXTREMO');return true;}
  if(effect==='forge_build'){g.forge.enable(12000);this.status.forge_build=now()+12000;g.toast('MODO CRIATIVO · ATIRAR PARA COLOCAR BLOCOS');return true;}
  if(effect==='forge_redstone'){const n=g.forge.arm('local');if(!n){g.toast('CONSTRUA BLOCOS ANTES DE ARMAR');return false;}g.forge.buildUntil=0;g.forge.ultimateUntil=0;this.status.forge_build=0;this.status.forge_ultimate=0;g.toast(n+' BLOCOS ARMADOS · ATIRE PARA DETONAR');this.flash(0xffb05c,7);return true;}
  if(effect==='forge_ultimate'){g.forge.enable(16000,true);this.status.forge_ultimate=now()+16000;g.toast('DOMÍNIO VOXEL · CONSTRUÇÃO ULTRARRÁPIDA');this.flash(0x40ffec,10);return true;}
  if(effect==='adapt_scan'){this.adaptive.adaptScanUntil=now()+8000;this.status.adapt_scan=now()+8000;g.toast('ANALISANDO PRÓXIMO EVENTO');return true;}
  if(effect==='adapt_ultimate'){startUltimate(this.adaptive,now());this.status.adapt_ultimate=now()+15000;g.toast('ADAPTAÇÃO ABSOLUTA · APRENDIZADO AUTOMÁTICO');return true;}
  if(effect==='adapt_counter'){
    const kind=this.adaptive.adaptLast;if(!kind||!learned(this.adaptive,kind)){g.toast('APRENDA UM EVENTO ANTES DE CONTRA-ATACAR');return false;}
    const near=[...g.enemies.enemies].filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<=15);
    for(const enemy of near)g.enemies.damage(enemy,Math.round(55+(kind==='explosion'?35:0)),new THREE.Vector3(enemy.x,enemy.y,enemy.z),'pulse');
    this.motion.ultimate({x:p.x,y:p.y,z:p.z},0xc08aff,11);this.flash(0xc08aff,12);g.toast('CONTRAEVOLUÇÃO · '+ADAPT_LABELS[kind]);return true;
  }
  switch(effect){
   case 'push':this.localArea('push',p,POWER_DATA[id].range||16);this.flash(0x8fdfff,POWER_DATA[id].range||16);break;
   case 'freeze':this.localArea('freeze',p,POWER_DATA[id].range||35,POWER_DATA[id].duration||1500);this.flash(0x9de8ff,6);break;
   case 'flight':this.status.flight=now()+(POWER_DATA[id].duration||7000);this.status[id]=this.status.flight;break;
   case 'invisible':this.status.invisible=now()+(POWER_DATA[id].duration||5000);this.status[id]=this.status.invisible;break;
   case 'phase':this.status.phase=now()+(POWER_DATA[id].duration||7000);this.status[id]=this.status.phase;this.lastSafe={x:p.x,y:p.y,z:p.z};break;
   case 'blackhole':{
     const center=this.aimLocal(28);this.localHazards.push({...center,until:now()+(POWER_DATA[id].duration||5500),radius:POWER_DATA[id].radius||18});this.status.blackhole=now()+(POWER_DATA[id].duration||5500);this.status[id]=this.status.blackhole;this.flash(0x8b7dff,18,center);break;
   }
   case 'rewind':{
     if(!this.history.length||this.history[0].t>now()-(POWER_DATA[id].history||10000)+600){g.toast('AGUARDE O HISTÓRICO TEMPORAL');return false;}
     const timestamp=now()-(POWER_DATA[id].history||10000);
     const point=this.history.reduce((best,h)=>Math.abs(h.t-timestamp)<Math.abs(best.t-timestamp)?h:best,this.history[0]);
     if(g.urban.canOccupy(point.x,point.z,point.y,1.77,.48)){
       if(point.hp-g.player.health>=35)this.lastCastPenalty=9000;
       const previous={x:p.x,y:p.y,z:p.z};p.spawn(point.x,point.y,point.z);this.motion.teleport(previous,point,0xd1a1ff);g.player.health=Math.min(g.player.maxHealth,point.hp);g.player.shield=Math.min(g.player.maxShield,point.shield);g.updateHud();this.flash(0xc49aff,7);
     }break;
   }
   case 'chain':{
     const enemies=[...g.enemies.enemies].filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<(POWER_DATA[id].range||42)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
     const targets=[];if(enemies.length)targets.push(enemies.shift());
     while(targets.length>0&&targets.length<(POWER_DATA[id].targets||3)){const end=targets[targets.length-1];const next=enemies.find(e=>Math.hypot(e.x-end.x,e.z-end.z)<(POWER_DATA[id].chainRadius||18));if(!next)break;targets.push(next);enemies.splice(enemies.indexOf(next),1);}
     targets.forEach((e,i)=>g.enemies.damage(e,(POWER_DATA[id].damage||[95,72,51])[i],new THREE.Vector3(e.x,e.y,e.z),'pulse'));
     this.motion.ultimate({x:p.x,y:p.y,z:p.z},0x75eaff,8);this.flash(0x7adaff,9);break;
   }
   case 'gravity':{
     const enemies=[...g.enemies.enemies].filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<40).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
     if(enemies.length){const focus=enemies[0];for(const e of g.enemies.enemies)if(Math.hypot(e.x-focus.x,e.z-focus.z)<(POWER_DATA[id].radius||13)){e.frozenUntil=now()+(POWER_DATA[id].duration||2700);e.gravityUntil=now()+(POWER_DATA[id].duration||2700);}this.motion.ultimate({x:focus.x,y:0,z:focus.z},0xd4b2ff,13);this.flash(0xd4b2ff,12,{x:focus.x,y:0,z:focus.z});}break;
   }
   case 'clones':this.spawnLocalClones();this.status.clones=now()+10000;break;
   case 'clonejump':this.spawnLocalClones(true);this.status.clonejump=now()+14000;this.cloneJumpUsed=false;break;
   case 'copy':{
     const pk=g.parkour;const fx=-Math.sin(g.yaw),fz=-Math.cos(g.yaw);
     const target=g.enemies.enemies.filter(e=>!e.dead&&Math.hypot(e.x-pk.x,e.z-pk.z)<60).map(e=>{const dx=e.x-pk.x,dz=e.z-pk.z,d=Math.hypot(dx,dz)||1;return {e,d,dot:(dx*fx+dz*fz)/d};}).filter(a=>a.dot>.75).sort((a,b)=>a.d-b.d)[0];
     if(!target){g.toast('MIRE EM UM INIMIGO PARA MARCAR');return false;}
     this.copyMark={enemy:target.e,until:now()+18000};this.status.copy=now()+18000;this.flash(0xf7a0e7,5,{x:target.e.x,y:0,z:target.e.z});g.toast('MARCA ATIVA · ELIMINE O ALVO EM 18 S');break;
   }
   case 'shield':this.status.shield=now()+7000;this.motion.burst({x:p.x,y:p.y,z:p.z},0x82ffd0,4);this.flash(0x82ffd0,4);break;
   case 'heal':{g.player.health=Math.min(g.player.maxHealth,g.player.health+(POWER_DATA[id].health||70));g.player.shield=Math.min(g.player.maxShield,g.player.shield+(POWER_DATA[id].shield||25));g.updateHud();this.motion.burst({x:p.x,y:p.y,z:p.z},0x82ffb6,5);this.flash(0x82ffb6,5);break;}
   case 'swap':{
     const candidates=g.enemies.enemies.filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<60).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
     const e=candidates.find(e=>{const dx=e.x-p.x,dz=e.z-p.z,d=Math.hypot(dx,dz)||1;return(dx*(-Math.sin(g.yaw))+dz*(-Math.cos(g.yaw)))/d>.79;});
     if(!e){g.toast('MIRE EM UM INIMIGO PARA TROCAR DE LUGAR');return false;}
     const origin={x:p.x,z:p.z,y:p.y};
     if(!g.urban.canOccupy(e.x,e.z,0,1.77,.48)){g.toast('LOCAL DO ALVO BLOQUEADO');return false;}
     p.spawn(e.x,0,e.z);this.motion.teleport(origin,{x:e.x,y:0,z:e.z},0xdcb6ff);e.x=origin.x;e.z=origin.z;this.flash(0xdcb6ff,7);break;
   }
  }
  g.toast('PODER ATIVADO · '+POWER_DATA[id].label);
 }
 flash(color,radius=7,point=null){
  const pos=point||this.game.parkour;
  const geo=new THREE.RingGeometry(.85,1,44);const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false});
  const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(pos.x,pos.y+.08,pos.z);this.game.world.scene.add(mesh);
  this.effects.push({mesh,ttl:.45,radius});
 }
 cleanupMarker(){if(this.teleportMarker){this.game.world.scene.remove(this.teleportMarker);this.teleportMarker.geometry.dispose();this.teleportMarker.material.dispose();this.teleportMarker=null;}}
 validPosition(x,y,z){return this.game.urban.canOccupy(x,z,y,1.77,.48)&&y>=0&&y<=38&&Math.hypot(x-this.game.parkour.x,z-this.game.parkour.z )<=700;}
 findTarget(){
  const g=this.game,pk=g.parkour;
  const origin=new THREE.Vector3(),dir=new THREE.Vector3();
  const aimNode=g.world.camera;
  aimNode.getWorldPosition(origin);
  aimNode.getWorldDirection(dir);
  // First prefer a real downward-facing rooftop intersected by the crosshair.
  const targets=g.urban.rayTargets||[];
  const hits=new THREE.Raycaster(origin,dir,.1,35).intersectObjects(targets,false);
  for(const hit of hits){
   if(hit.face?.normal?.y>.65){const {x,y,z}=hit.point;if(this.validPosition(x,y+.09,z))return {x,y:y+.09,z,valid:true};}
   // Hitting a wall never permits teleporting into that wall.
   break;
  }
  let best=null;
  for(let d=150;d>=4;d-=1){
   const x=pk.x+dir.x*d,z=pk.z+dir.z*d;
   if(Math.abs(x)>WORLD_HALF-2||Math.abs(z)>WORLD_HALF-2)continue;
   const candidateSurfaces=g.urban.surfaces.filter(s=>!s.ramp&&Math.abs(x-s.x)<s.hx-.6&&Math.abs(z-s.z)<s.hz-.6).map(s=>s.y);
   // Prefer the floor nearest the point along the camera ray.
   const aimY=origin.y+dir.y*d;
   const y=candidateSurfaces.sort((a,b)=>Math.abs(a-aimY)-Math.abs(b-aimY))[0]??0;
   if(this.validPosition(x,y+.08,z)){best={x,y:y+.08,z,valid:true};break;}
  }
  return best||{x:pk.x,y:pk.y,z:pk.z,valid:false};
 }
 updateTarget(){if(!this.targeting)return;this.target=this.findTarget();if(!this.teleportMarker){this.teleportMarker=new THREE.Mesh(new THREE.RingGeometry(.65,.88,32),new THREE.MeshBasicMaterial({color:0x75ffc7,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.teleportMarker.rotation.x=-Math.PI/2;this.game.world.scene.add(this.teleportMarker);}this.teleportMarker.position.set(this.target.x,this.target.y+.08,this.target.z);this.teleportMarker.material.color.setHex(this.target.valid?0x68ffd3:0xff6576);}
 confirmTeleport(){this.menu?.confirmTeleport();}
 sendTeleport(dest){
   if(!dest?.valid)return;
   this.game.mouseDown=false;
   if(this.game.mode==='multiplayer'){this.game.multiplayer.syncState();this.game.multiplayer.send({type:'power',id:'teleport',target:{x:dest.x,y:dest.y,z:dest.z}});return;}
   const pk=this.game.parkour;
   if(!this.game.urban.canOccupy(dest.x,dest.z,dest.y,1.77,.48))return;
   const previous={x:pk.x,y:pk.y,z:pk.z};this.returnPoint={...previous,until:now()+15000};pk.spawn(dest.x,dest.y,dest.z);this.motion.teleport(previous,dest,0xbda7ff);this.cooldowns.teleport=now()+POWER_DATA.teleport.cool*1000;this.flash(0xbda7ff,8);
 }
  findVaultDestination(){
    const g=this.game,p=g.parkour;
    const pos={x:p.x,y:p.y,z:p.z,yaw:g.yaw};
    return planSkyLeap(pos,g.urban.solids,(x,y,z)=>g.urban.canOccupy(x,z,y,1.77,.48))
       || planVault(pos,SQUAD_OBSTACLES,(x,y,z)=>g.urban.canOccupy(x,z,y,1.77,.48));
  }
  observeLocalEvent(kind){
    if(this.game.heroSelection?.selectedHero!=='adaptomega')return false;
    const result=observeAdaptation(this.adaptive,kind,now());
    if(result.learned){this.game.toast('ADAPTADO: '+(ADAPT_LABELS[kind]||kind));this.flash(0xc28dff,5);}
    return result.blocked;
  }
  aimLocal(range){const g=this.game,p=g.parkour;return {x:clamp(p.x-Math.sin(g.yaw)*range,-WORLD_HALF+3,WORLD_HALF-3),y:p.y,z:clamp(p.z-Math.cos(g.yaw)*range,-WORLD_HALF+3,WORLD_HALF-3)};}
 spawnLocalClones(jumping=false){
   const g=this.game,p=g.parkour;
   const mat=new THREE.MeshStandardMaterial({color:jumping?0xbca2ff:0x70c8dd,metalness:.2,roughness:.6,transparent:true,opacity:.55});
   if(jumping){this.cloneTargets=[];this.clearDecoys();}
   for(let i=0;i<(jumping?1:3);i++){
     const forwardX=-Math.sin(g.yaw),forwardZ=-Math.cos(g.yaw),sideX=-forwardZ,sideZ=forwardX;
     const distance=jumping?4:2,lateral=jumping?0:(i-1)*3;
     const x=p.x+forwardX*distance+sideX*lateral,z=p.z+forwardZ*distance+sideZ*lateral;
     if(!g.urban.canOccupy(x,z,p.y,1.77,.4))continue;
     const mesh=createOperative({role:'scout',hero:'echo',player:true,tint:jumping?0xbca2ff:0x70c8dd,size:.94});mesh.position.set(x,p.y,z);g.world.scene.add(mesh);
     const item={mesh,x,y:p.y,z,angle:g.yaw+Math.PI,turn:1,speed:jumping?7.5:6.3,moving:true,until:now()+(jumping?14000:10000)};this.decoys.push(item);
     if(jumping)this.cloneTargets.push({slot:i,x,y:p.y,z,until:item.until,decoy:item});
   }
   mat.dispose();
 }
 cloneAvailable(){return !this.cloneJumpUsed&&this.cloneTargets.some(c=>c.until>now());}
 needsAim(id){id=POWER_VARIANTS[id]?.base||id;return ['push','freeze','chain','gravity','blackhole','swap','copy'].includes(id)||(id==='clonejump'&&this.cloneAvailable());}
 showAimGuide(id,touch=null){
   let guide=$('power-aim-guide');if(!guide){guide=document.createElement('div');guide.id='power-aim-guide';document.body.appendChild(guide);}
   guide.classList.add('visible');document.body.classList.add('power-targeting');const pick=id==='clonejump'&&this.cloneAvailable();
   guide.textContent=touch?.cancelled?'✕ SOLTE PARA CANCELAR':pick?'✧ TOQUE PARA TROCAR COM O CLONE EM MOVIMENTO':`◎ ${POWER_DATA[id].label} · ${POWER_DATA[id].help.toUpperCase()} · ARRASTE PARA MIRAR · SOLTE PARA USAR · ↑ CANCELAR`;
   guide.classList.toggle('cancel',!!touch?.cancelled);
 }
 hideAimGuide(){$('power-aim-guide')?.classList.remove('visible','cancel');document.body.classList.remove('power-targeting');}
 jumpClone(dx=null){
   if(!this.cloneAvailable())return;
   const live=this.cloneTargets.filter(c=>c.until>now());
   let preferred=dx === null ? 1 : dx < -30 ? 0 : dx > 30 ? 2 : 1;
   // Desktop: look at the desired hologram, then press the same power again.
   if(dx===null){
     const pk=this.game.parkour,frontX=-Math.sin(this.game.yaw),frontZ=-Math.cos(this.game.yaw);
     const closest=live.map(c=>({c,angle:((c.x-pk.x)*frontX+(c.z-pk.z)*frontZ)/(Math.hypot(c.x-pk.x,c.z-pk.z)||1)})).sort((a,b)=>b.angle-a.angle)[0];
     if(closest)preferred=closest.c.slot;
   }
   const chosen=live.find(c=>c.slot===preferred)||live[0];
   if(!chosen)return;
   this.cloneJumpUsed=true;this.status.clonejump=0;
   if(this.game.mode==='multiplayer'){
     this.game.multiplayer.syncState();this.game.multiplayer.send({type:'power',id:'clonejump',jump:true,index:chosen.slot});
   }else if(this.game.urban.canOccupy(chosen.x,chosen.z,chosen.y,1.77,.48)){
     const previous={x:this.game.parkour.x,y:this.game.parkour.y,z:this.game.parkour.z};
     this.game.parkour.spawn(chosen.x,chosen.y,chosen.z);this.motion.teleport(previous,chosen,0xc6a5ff);
     if(chosen.decoy){Object.assign(chosen.decoy,previous);Object.assign(chosen,previous);chosen.decoy.mesh.position.set(previous.x,previous.y,previous.z);}
     this.flash(0xc6a5ff,6);
   }
 }

  moveLocalClone(item,dt){
    const city=this.game.urban;let x=item.x+Math.sin(item.angle)*item.speed*dt,z=item.z+Math.cos(item.angle)*item.speed*dt;
    if(!city.canOccupy(x,z,item.y,1.77,.4)){item.angle+=item.turn*Math.PI*.55;item.turn*=-1;x=item.x+Math.sin(item.angle)*item.speed*dt;z=item.z+Math.cos(item.angle)*item.speed*dt;}
    if(city.canOccupy(x,z,item.y,1.77,.4)){item.x=x;item.z=z;const track=this.cloneTargets.find(c=>c.decoy===item);if(track){track.x=x;track.z=z;}}
    item.mesh.rotation.y=item.angle;
  }
  onCasualEnemyKill(enemy){
    if(!this.copyMark||this.copyMark.enemy!==enemy||this.copyMark.until<now())return;
    this.copyMark=null;const origin=[...this.loadout];
    const abilities={scout:['flight','push'],gunner:['chain','shield'],sniper:['teleport','invisible'],tank:['shield','gravity'],hunter:['clonejump','phase'],boss:['blackhole','rewind']};
    const stolen=abilities[enemy.type]||(enemy.boss?abilities.boss:['freeze','push']);
    this.loadout=[...stolen,origin[2]||'copy'];this.copyBuff={until:now()+30000,original:origin};this.status.copy=0;this.refreshButtons();this.refreshSelects();
    this.game.toast('HABILIDADES COPIADAS · '+POWER_DATA[stolen[0]].label+' + '+POWER_DATA[stolen[1]].label+' · 30S');
  }
  findMorphObject(){
    const p=this.game.parkour;
    const objects=(this.game.world.barrels||[]).filter(b=>b.alive).map(b=>({...b,type:'barrel'}));
    for(const [type,sites] of [['truck',[[-40,15],[85,93]]],['forklift',[[1,91],[-22,-104]]]]){
      for(const [x,z] of sites)objects.push({x,z,type});
    }
    let chosen=null,best=6;
    for(const obj of objects){const d=Math.hypot(obj.x-p.x,obj.z-p.z);if(d<best){best=d;chosen=obj;}}
    return chosen;
  }
  cancelMorph(){
    this.status.morph=0;
    if(this.game.mode==='multiplayer')this.game.multiplayer.send({type:'power',id:'morph',cancel:true});
    this.game.toast('DISFARCE ENCERRADO');
  }
  tryResurrection(){
    if(!this.loadout.includes('resurrection')||(this.cooldowns.resurrection||0)>now())return false;
    this.cooldowns.resurrection=now()+POWER_DATA.resurrection.cool*1000;
    this.status.resurrection=now()+4000;
    const pl=this.game.player;pl.health=pl.maxHealth;pl.shield=pl.maxShield;
    pl.invulnerable=4;this.flash(0x9effd8,11);this.game.updateHud();
    this.game.toast('RESSURREIÇÃO · IMORTAL POR 4 SEGUNDOS');return true;
  }
  clearDecoys(){for(const d of this.decoys){this.game.world.scene.remove(d.mesh);disposeOperative(d.mesh);}this.decoys=[];}

 returnTeleport(){const pt=this.returnPoint;if(!pt||pt.until<now())return;this.returnPoint=null;if(this.game.mode==='multiplayer'){this.game.multiplayer.send({type:'power',id:'teleport',back:true});return;}const from={x:this.game.parkour.x,y:this.game.parkour.y,z:this.game.parkour.z};this.game.parkour.spawn(pt.x,pt.y,pt.z);this.motion.teleport(from,pt,0xbda7ff);this.flash(0xbda7ff,5);}
 onServerState(state){if(!state)return;this.comboStages={...(state.combo||{})};for(const id of Object.keys(POWER_DATA)){if(state.cooldowns?.[id])this.cooldowns[id]=state.cooldowns[id];}this.status.freeze=state.frozenUntil||0;this.status.flight=state.flightUntil||0;this.status.invisible=state.invisibleUntil||0;this.status.phase=state.phaseUntil||0;this.status.shield=state.shieldUntil||0;this.status.gravity=state.gravityUntil||0;this.status.resurrection=state.resurrectionUntil||0;this.status.morph=state.propUntil||0;for(const [id,until] of Object.entries(state.activeUntil||{}))this.status[id]=until;this.cloneJumpUsed=!!state.cloneJumpUsed;if(Array.isArray(state.loadout)&&state.loadout.every(id=>POWER_DATA[id])){if(state.loadout.some((id,i)=>this.loadout[i]!==id)){this.loadout=[...state.loadout];this.refreshButtons();this.refreshSelects();}}this.copyBuff=state.copiedUntil>now()?{until:state.copiedUntil}:null;this.adaptive={adaptations:state.adaptations||[],adaptScanUntil:state.adaptScanUntil||0,adaptUltimateUntil:state.adaptUltimateUntil||0,adaptLast:state.adaptLast||null};this.returnPoint=state.returnUntil>now()?{until:state.returnUntil}:null;}
 onServerClones(msg){
  if(msg.player!==this.game.multiplayer?.id)return;
  const incoming=(msg.clones||[]).filter(c=>c.power==='clonejump');
  if(incoming.length){this.cloneTargets=incoming.map(c=>({id:c.id,slot:c.slot,x:c.x,y:c.y,z:c.z,until:c.until}));this.cloneJumpUsed=false;}
 }
 onCloneDestroy(id){this.cloneTargets=this.cloneTargets.filter(c=>c.id!==id);}
 onServerEffect(msg){const g=this.game,pk=g.parkour;if(msg.kind==='vault'){if(msg.player===g.multiplayer.id){pk.startVault(msg);g.toast('VEX · ESCALADA INICIADA');}return;}if(msg.kind==='combo-dash'){if(msg.player===g.multiplayer.id){this.motion.startDash(msg.from,msg.to,{duration:msg.duration||DASH_DURATION_MS,color:msg.id==='shiro_retreat'?0xffb368:0x67eaff});}return;}if(msg.player!==g.multiplayer.id)return;
  if(msg.kind==='teleport'||msg.kind==='teleport-back'||msg.kind==='rewind'||msg.kind==='swap'||msg.kind==='clonejump'||msg.kind==='combo-move'){if(msg.kind==='clonejump')this.cloneJumpUsed=true;const from={x:pk.x,y:pk.y,z:pk.z};pk.spawn(msg.x,msg.y,msg.z);this.motion.teleport(from,{x:msg.x,y:msg.y,z:msg.z});this.flash(0xbda7ff,5);}
  if(msg.kind==='blackhole-pull'){if(Number.isFinite(msg.x)&&Number.isFinite(msg.z)){pk.x=msg.x;pk.z=msg.z;pk.vx*=.16;pk.vz*=.16;}return;}
  if(msg.kind==='push'){if(Number.isFinite(msg.x))pk.spawn(msg.x,msg.y,msg.z);pk.dashTime=.30;pk.dashVX=msg.dx*24;pk.dashVZ=msg.dz*24;pk.vy=Math.max(pk.vy,5);pk.grounded=false;this.flash(0x80caff,5);}
  if(msg.kind==='copy-mark'){g.toast('ALVO MARCADO · ELIMINE EM 18S PARA COPIAR');return;}
  if(msg.kind==='freeze'){this.status.freeze=now()+1500;g.mouseDown=false;this.flash(0x8eeaff,3);}
  if(msg.kind==='gravity'&&Array.isArray(msg.affected)&&msg.affected.includes(g.multiplayer.id)){this.status.gravity=now()+2700;this.flash(0xd4b2ff,8);}
  if(msg.kind==='phase-exit'&&Number.isFinite(msg.x))pk.spawn(msg.x,msg.y,msg.z);
 }
 update(dt){this.motion.update(dt);const g=this.game,pk=g.parkour,t=now();
  if(!this.comboVisual&&this.comboStages.butterfly_orbit?.until>t)this.showComboVisual(0xae94ff);
  if(!this.comboVisual&&this.comboStages.butterfly_launch?.until>t)this.showComboVisual(0xff9edc);
  if(this.comboVisual){const orbital=this.comboStages.butterfly_orbit,launch=this.comboStages.butterfly_launch;if(orbital?.until>t){const q=orbitLocation(pk.x,pk.z,orbital.started,t);this.comboVisual.position.set(q.x,pk.y+1.5,q.z);}else if(launch?.until>t){this.comboVisual.position.set(launch.orb.x,launch.orb.y+1.5,launch.orb.z);}else this.clearComboVisual();}
  // O mapa interativo controla a escolha do destino sem travar a mira.
  if(!this.targeting&&this.teleportMarker)this.cleanupMarker();
  if(this.returnPoint&&this.returnPoint.until<t)this.returnPoint=null;
  document.body.classList.toggle('titan-morphed',this.status.morph>t);document.body.classList.toggle('titan-resurrected',this.status.resurrection>t);
  if(this.cloneTargets.length&&!this.cloneTargets.some(c=>c.until>t))this.cloneTargets=[];
  if(this.copyMark?.until<t)this.copyMark=null;
  if(this.copyBuff?.until<t){if(this.copyBuff.original){this.loadout=[...this.copyBuff.original];this.refreshButtons();this.refreshSelects();g.toast('CÓPIA ENCERRADA · PODERES ORIGINAIS');}this.copyBuff=null;}
  if(g.mode!=='multiplayer'&&g.state==='playing'){
    this.history.push({t,x:pk.x,y:pk.y,z:pk.z,hp:g.player.health,shield:g.player.shield});
    while(this.history.length&&this.history[0].t<t-11500)this.history.shift();
    for(let i=this.localHazards.length-1;i>=0;i--){const h=this.localHazards[i];if(h.until<t){this.localHazards.splice(i,1);continue;}for(const e of g.enemies.enemies){const distance=Math.hypot(e.x-h.x,e.z-h.z);if(distance<.65||distance>h.radius)continue;let mx=e.x,mz=e.z;const pull=Math.min(2.9,Math.max(1,(h.radius-distance)*.2))*Math.min(.5,dt/.1),steps=Math.ceil(pull/.30);for(let step=0;step<steps;step++){const d=Math.hypot(h.x-mx,h.z-mz);if(d<=.65)break;const speed=Math.min(.30,pull/steps,d-.65),nx=mx+(h.x-mx)/d*speed,nz=mz+(h.z-mz)/d*speed;if(!g.world.canMove(nx,nz,e.radius)||!g.urban.canOccupy(nx,nz,0,2,e.radius))break;mx=nx;mz=nz;}e.x=mx;e.z=mz;}}
  }
  for(let i=this.decoys.length-1;i>=0;i--){const d=this.decoys[i];if(d.moving&&d.until>t){this.moveLocalClone(d,dt);d.mesh.position.set(d.x,d.y,d.z);}if(d.until<t){g.world.scene.remove(d.mesh);disposeOperative(d.mesh);this.decoys.splice(i,1);}else{d.mesh.rotation.y+=dt*.4;}animateOperative(d.mesh,dt,{moving:d.moving?1:0,distance:Math.hypot(d.x-pk.x,d.z-pk.z)});}
  $('titan-power-picker').classList.toggle('hidden',g.state==='menu');
  if(!this.isActive('phase')&&this.status.phase&&this.status.phase<t){
    this.status.phase=0;if(!g.urban.canOccupy(pk.x,pk.z,pk.y,1.77,.42))pk.spawn(this.lastSafe.x,this.lastSafe.y,this.lastSafe.z);
  }
  if(!this.isActive('phase')&&g.urban.canOccupy(pk.x,pk.z,pk.y,1.77,.42))this.lastSafe={x:pk.x,y:pk.y,z:pk.z};
  for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.ttl-=dt;const f=1-e.ttl/.45;e.mesh.scale.setScalar(1+(e.radius-1)*f);e.mesh.material.opacity=Math.max(0,.7*(1-f));if(e.ttl<=0){g.world.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();this.effects.splice(i,1);}}
  $('power-descend').classList.toggle('visible',this.isActive('flight')&&!!g.mobile?.enabled);
  this.uiTick-=dt;if(this.uiTick<0){for(let i=0;i<3;i++){const id=this.loadout[i],btn=$('power-'+['a','b','c'][i]);const until=id?(this.cooldowns[id]||0):0;const left=Math.ceil((until-t)/1000);const active=id&&this.isActive(id);const back=id==='teleport'&&this.returnPoint?.until>t;const combo=this.comboStages[id]?.until>t;const jump=id==='clonejump'&&this.cloneAvailable();const liveMs=Math.max(0,(id?this.status[id]||0:0)-t);
    const label=btn.querySelector('.power-time');label.textContent=!id?'BLOQUEADO':id==='resurrection'&&!active&&left<=0?'AUTO':back?'↶ '+Math.ceil((this.returnPoint.until-t)/1000)+'s':jump?'TROCAR '+Math.ceil((Math.max(...this.cloneTargets.map(c=>c.until))-t)/1000)+'s':combo?'REATIVE '+Math.ceil((this.comboStages[id].until-t)/1000)+'s':active?('ATIVO '+(liveMs/1000).toFixed(1)+'s'):left>0?left+'s':'PRONTO';
    btn.classList.toggle('cooling',left>0&&!back&&!jump&&!combo&&!active);btn.classList.toggle('active',active||back||jump);
    btn.style.setProperty('--power-progress',active?Math.max(0,Math.min(100,liveMs/(POWER_DATA[id]?.duration||((id==='copy')?18000:3000))*100))+'%':left>0?Math.max(0,100-(until-t)/((POWER_DATA[id]?.cool||1)*10))+'%':'100%');}this.uiTick=.2;}
 }
 resetOnDeath(){this.abilityTouches?.clear();this.adaptive={};this.motion.clear();this.comboStages={};this.cancelTargeting();this.returnPoint=null;this.status={};this.copyMark=null;this.copyBuff=null;document.body.classList.remove('titan-morphed','titan-resurrected');}
}

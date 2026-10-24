import {SQUAD_START,SQUAD_POINTS,ROLE_INFO,roleForHero,safeSpawnNear} from './squadLayout.js';
import * as THREE from 'three';
import {clamp,rand,WEAPONS} from './constants.js';

export const MISSIONS=[
 {id:'M01',name:'A INVASÃO TITÃ',sector:'INSTALAÇÃO DELTA',chapter:'01 / PRIMEIRO CONTATO',defend:12,prize:400},
 {id:'M02',name:'CORTINA DE FERRO',sector:'ESTAÇÃO DE ENERGIA',chapter:'02 / CONTRA-ATAQUE',defend:15,prize:560},
 {id:'M03',name:'PROTOCOLO EXTINÇÃO',sector:'NÚCLEO TITÃ',chapter:'03 / CERCO FINAL',defend:18,prize:900}
];
const SAVE_KEY='titan-protocol-campaign-v06';
const ARMORY=[
 {id:'armor',label:'PLACAS CERÂMICAS',description:'+20 de vida máxima por nível.',icon:'✚',base:160},
 {id:'shield',label:'KIT MÉDICO AVANÇADO',description:'+15 de defesa máxima por nível.',icon:'⬡',base:175},
 {id:'damage',label:'MUNIÇÃO REFORÇADA',description:'+10% de dano das armas por nível.',icon:'⌁',base:210},
 {id:'mobility',label:'TREINO DE ASSALTO',description:'+7% de velocidade por nível.',icon:'➜',base:180}
];
const defaults=()=>({checkpoint:0,credits:0,completed:false,armory:{armor:0,shield:0,damage:0,mobility:0}});
function readSave(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!saved||typeof saved!=='object')return defaults();const armory={};for(const a of ARMORY)armory[a.id]=clamp(Number(saved.armory?.[a.id])||0,0,3);return {checkpoint:clamp(Number(saved.checkpoint)||0,0,2),credits:clamp(Number(saved.credits)||0,0,99999),completed:!!saved.completed,armory};}catch{return defaults();}}
function persist(save){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));return true;}catch{return false;}}

export class Campaign{
 constructor(game){this.game=game;this.save=readSave();this.active=false;this.index=0;this.phase='';this.phaseElapsed=0;this.objectives=[];this.artifacts=[];this.phaseProgress=0;this.defenseRemaining=0;this.integrity=100;this.hold=0;this.enemyTick=2.5;this.deco=new THREE.Group();game.world.scene.add(this.deco);this.renderMenu();this.bind();}
 bind(){const $=id=>document.getElementById(id);
  $('campaign-continue').addEventListener('click',()=>this.game.start('campaign',this.save.checkpoint));
  $('armory-btn').addEventListener('click',()=>this.showArmory());$('armory-close').addEventListener('click',()=>this.hideArmory());
  $('next-mission').addEventListener('click',()=>this.nextMission());$('chapter-menu').addEventListener('click',()=>this.game.menu());$('victory-menu').addEventListener('click',()=>this.game.menu());$('victory-replay').addEventListener('click',()=>this.game.start('campaign',0));
  $('victory-finish').addEventListener('click',()=>{$('chapter-complete-screen').classList.add('hidden');$('victory-screen').classList.remove('hidden');});
 }
 confirmNew(){this.game.start('campaign',0);}
 updateSave(){persist(this.save);this.renderMenu();}
 renderMenu(){const $=id=>document.getElementById(id);$('campaign-continue').classList.toggle('hidden',this.save.checkpoint===0&&!this.save.completed);$('campaign-continue').querySelector('span').textContent=this.save.completed?'REJOGAR MISSÃO FINAL':'CONTINUAR · OPERAÇÃO '+String(this.save.checkpoint+1).padStart(2,'0');$('menu-credits').textContent=this.save.credits.toLocaleString('pt-BR');$('menu-chapter').textContent=this.save.completed?'OPERAÇÕES CONCLUÍDAS':'CHECKPOINT: '+MISSIONS[this.save.checkpoint].sector;}
 showArmory(){this.renderArmory();document.getElementById('armory-screen').classList.remove('hidden');}
 hideArmory(){document.getElementById('armory-screen').classList.add('hidden');}
 renderArmory(){const $=id=>document.getElementById(id);$('armory-credits').textContent=this.save.credits.toLocaleString('pt-BR');const root=$('armory-list');root.replaceChildren();for(const item of ARMORY){const level=this.save.armory[item.id],cost=Math.round(item.base*(1+level*.85)),max=level===3;const card=document.createElement('div');card.className='armory-item';card.innerHTML=`<div class="armory-item-icon">${item.icon}</div><div><small>APRENDIZADO · NV ${level}/3</small><strong>${item.label}</strong><p>${item.description}</p></div>`;const button=document.createElement('button');button.textContent=max?'MÁXIMO':cost+' CR';button.disabled=max||this.save.credits<cost;button.className='armory-buy';button.addEventListener('click',()=>this.buy(item.id));card.append(button);root.append(card);}}
 buy(id){const item=ARMORY.find(a=>a.id===id);if(!item)return;const level=this.save.armory[id];if(level>=3)return;const cost=Math.round(item.base*(1+level*.85));if(this.save.credits<cost)return;this.save.credits-=cost;this.save.armory[id]++;this.updateSave();this.renderArmory();}
 applyArmory(){const p=this.game.player,a=this.save.armory;p.maxHealth=100+a.armor*20;p.health=p.maxHealth;p.maxShield=60+a.shield*15;p.shield=p.maxShield;p.speedBonus=1+a.mobility*.07;this.game.weapons.damageMultiplier=1+a.damage*.10;}
 configure(index){this.index=clamp(index,0,MISSIONS.length-1);this.active=true;this.clearObjectives();this.phase='';this.phaseElapsed=0;this.hold=0;this.integrity=100;
  const g=this.game;g.enemies.clear();g.pendingSpawns=[];g.wave=this.index+1;g.waveKilled=0;g.waveCount=0;document.body.dataset.sector=String(this.index);
  const {x,z}=SQUAD_START;Object.assign(g.player,{x,z,eyeY:1.75,jump:0,velY:0});g.player.shield=Math.min(g.player.maxShield,g.player.shield+30);g.player.health=Math.min(g.player.maxHealth,g.player.health+45);
  for(const [i,w] of g.weapons.state.entries()){w.clip=WEAPONS[i].clip;w.reserve=Math.min(w.reserve+WEAPONS[i].clip*3,WEAPONS[i].reserve*2);}
  g.parkour.spawn(x,0,z);g.positionCamera();g.squad.start();this.startDefend();
  if(g.weaponLoot){g.weaponLoot.populate();}
 }
 primaryPoint(){return ({defend:SQUAD_POINTS.defense,recon:SQUAD_POINTS.reconnaissance,sabotage:SQUAD_POINTS.sabotage,boss:SQUAD_POINTS.boss,extract:SQUAD_POINTS.extraction})[this.phase]||SQUAD_POINTS.insertion;}
 clearObjectives(){for(const o of this.objectives){this.deco.remove(o.group);o.group.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});}this.objectives=[];this.hold=0;document.getElementById('interaction').classList.add('hidden');}
 addObjective(point,label,role=null){const world=this.game.world;
  const safe=safeSpawnNear(world,point.x,point.z,1.15),{x,z}=safe;
  const group=new THREE.Group();group.position.set(x,0,z);const mat=new THREE.MeshStandardMaterial({color:0x526673,metalness:.6,roughness:.4});const glow=new THREE.MeshStandardMaterial({color:role==='bomber'?0xf2b35f:0x79e4e3,emissive:role==='bomber'?0xc76b25:0x3d9aaf,emissiveIntensity:.65});
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.45,.6,2.3,10),mat);pillar.position.y=1.15;group.add(pillar);const sphere=new THREE.Mesh(new THREE.OctahedronGeometry(.52),glow);sphere.position.y=2.55;group.add(sphere);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.9,2.35,32),new THREE.MeshBasicMaterial({color:role==='bomber'?0xffab6c:0x66f4e0,transparent:true,opacity:.4,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.1;group.add(ring);
  this.deco.add(group);const o={x,z,label,role,ring,group,done:false};this.objectives.push(o);return o;
 }
 notify(kicker,headline,detail){const root=document.getElementById('wave-callout');root.querySelector('small').textContent=kicker;root.querySelector('strong').textContent=headline;root.querySelector('span').textContent=detail;root.classList.add('active');this.game.calloutTimer=3;this.game.toast(detail);}
 phaseBegin(phase){this.clearObjectives();this.phase=phase;this.phaseElapsed=0;this.phaseProgress=0;this.hold=0;this.enemyTick=.38;this.refreshHUD();}
 startDefend(){this.phaseBegin('defend');this.defenseRemaining=MISSIONS[this.index].defend;this.integrity=100;this.addObjective(SQUAD_POINTS.defense,'REATOR DO PERÍMETRO','support');this.notify('OPERAÇÃO DELTA','DEFENDER PERÍMETRO','PROTEJA A INSTALAÇÃO · O SUPORTE SEGURA A POSIÇÃO');}
 startRecon(){this.phaseBegin('recon');this.addObjective(SQUAD_POINTS.reconnaissance,'ANTENA DE OBSERVAÇÃO','sniper');this.notify('RECONHECIMENTO','IDENTIFIQUE A AMEAÇA','SNIPER: ALCANCE A TORRE E IDENTIFIQUE OS ALVOS');}
 startSabotage(){this.phaseBegin('sabotage');this.addObjective(SQUAD_POINTS.sabotage,'GERADORES HOSTIS','bomber');this.notify('SABOTAGEM','CORTE A ENERGIA','BOMBER: DESATIVE OS GERADORES INIMIGOS');}
 startBoss(){this.phaseBegin('boss');const g=this.game;this.addObjective(SQUAD_POINTS.boss,'COLOSSO TITÃ');g.waveCount=4;g.waveKilled=0;g.pendingSpawns=['hunter','gunner','sniper'];g.spawnTimer=.12;g.enemies.spawn('boss',[SQUAD_POINTS.boss.x,SQUAD_POINTS.boss.z],Math.max(2,this.index+2));g.audio.play('boss');this.notify('ALERTA DE INVASÃO','COLOSSO TITÃ','FRENTE CONTÉM · SUPORTE PROTEGE · SNIPER MIRA · BOMBER ATACA');}
 startExtract(){this.phaseBegin('extract');this.game.pendingSpawns=[];this.addObjective(SQUAD_POINTS.extraction,'PONTO DE EXTRAÇÃO');this.notify('MISSÃO CONCLUINDO','EVACUAÇÃO TÁTICA','REÚNA O ESQUADRÃO NA ZONA DE EXTRAÇÃO');}
 onCleared(){if(this.phase==='boss')this.startExtract();}
 nearbyRole(role,point,range=17){return this.game.squad.roleNear(role,point.x,point.z,range);}
 update(dt){if(!this.active||this.game.state!=='playing')return;this.phaseElapsed+=dt;const g=this.game,m=MISSIONS[this.index],point=this.primaryPoint();
  for(const o of this.objectives){o.group.rotation.y+=dt*.35;o.ring.material.opacity=.30+.10*Math.sin(g.animTime*2);}
  const ui=document.getElementById('interaction');
  if(this.phase==='defend'){
    const inZone=Math.hypot(g.player.x-point.x,g.player.z-point.z)<22;
    const held=this.nearbyRole('support',point,25);
    this.defenseRemaining=Math.max(0,this.defenseRemaining-dt*(held?1.45:1.2));
    // Structural damage derives from intruding enemies; active support repairs it.
    for(const e of g.enemies.enemies)if(Math.hypot(e.x-point.x,e.z-point.z)<17)this.integrity=Math.max(0,this.integrity-dt*(e.boss?5:1.8));
    if(held)this.integrity=Math.min(100,this.integrity+dt*1.7);
    if(this.integrity<=0){g.toast('PERÍMETRO PERDIDO · MISSÃO FALHOU');g.die();return;}
    this.enemyTick-=dt;if(this.enemyTick<=0&&g.enemies.count()+g.pendingSpawns.length<Math.min(6,3+this.index)){
      g.pendingSpawns.push(['scout','gunner','hunter','tank'][Math.floor(Math.random()*(this.index+3))]);g.spawnTimer=.13;this.enemyTick=1.05+Math.random()*.65;
    }
    ui.classList.remove('hidden');ui.querySelector('strong').textContent='INTEGRIDADE DO PERÍMETRO: '+Math.round(this.integrity)+'%';ui.querySelector('small').textContent='SUSTENTE A DEFESA · '+Math.ceil(this.defenseRemaining)+'S';ui.querySelector('.interact-track > i').style.width=this.integrity+'%';
    if(this.defenseRemaining<=0){g.pendingSpawns=[];this.startRecon();}
  }else if(this.phase==='recon'||this.phase==='sabotage'){
    const role=this.phase==='recon'?'sniper':'bomber',near=this.nearbyRole(role,point,18),playerNear=Math.hypot(g.player.x-point.x,g.player.z-point.z)<4.2;
    const isRole=roleForHero(g.heroSelection.selectedHero)===role;
    const assist=playerNear&&g.keys.KeyF&&this.phaseElapsed>5;
    if(near&&(!isRole||playerNear))this.phaseProgress+=dt;
    else if(assist)this.phaseProgress+=dt*1.0;
    else if(this.phaseElapsed>5)this.phaseProgress+=dt*.34;
    else this.phaseProgress=Math.max(0,this.phaseProgress-dt*.25);
    const needed=this.phase==='recon'?2.1:2.7;
    ui.classList.remove('hidden');ui.querySelector('strong').textContent=(this.phase==='recon'?'VARREDURA DE LONGO ALCANCE':'DESATIVANDO GERADORES')+' · '+Math.floor(this.phaseProgress/needed*100)+'%';
    ui.querySelector('small').textContent=near?'FUNÇÃO '+ROLE_INFO[role].name+' NO OBJETIVO':'AGUARDANDO '+ROLE_INFO[role].name+' · USE F PARA AUXILIAR';ui.querySelector('.interact-track > i').style.width=Math.min(100,100*this.phaseProgress/needed)+'%';
    this.enemyTick-=dt;if(this.enemyTick<=0&&g.enemies.count()<3){g.pendingSpawns.push(this.phase==='recon'?'sniper':'gunner');g.spawnTimer=.12;this.enemyTick=3.7+Math.random()*1.3;}
    if(this.phaseProgress>=needed){this.game.score+=220;this.game.toast('OBJETIVO CONCLUÍDO · +220');if(this.phase==='recon')this.startSabotage();else this.startBoss();}
  }else if(this.phase==='boss'){
    ui.classList.remove('hidden');ui.querySelector('strong').textContent='COLÔSSO TITÃ · ZONA DE EXTERMÍNIO';ui.querySelector('small').textContent='DERROTE O CHEFE E PROTEJA O ESQUADRÃO';ui.querySelector('.interact-track > i').style.width='65%';
  }else if(this.phase==='extract'){
    const near=Math.hypot(g.player.x-point.x,g.player.z-point.z)<6;
    const allies=g.squad.members.filter(b=>!b.downed&&Math.hypot(b.x-point.x,b.z-point.z)<12).length;
    if(near&&allies>=2)this.hold+=dt;else this.hold=Math.max(0,this.hold-dt);
    ui.classList.remove('hidden');ui.querySelector('strong').textContent=near?`EXTRAÇÃO · ${allies+1}/4 INTEGRANTES`:'RETORNE À ZONA DE EXTRAÇÃO';ui.querySelector('small').textContent=allies<2?'REAGRUPAR AO MENOS DOIS ALIADOS':'MANTENHA POSIÇÃO PARA EXTRAIR';ui.querySelector('.interact-track > i').style.width=Math.min(100,this.hold/1.8*100)+'%';
    if(this.hold>=1.8)this.complete();
  }
  this.refreshHUD();
 }
 refreshHUD(){if(!this.active)return;const g=this.game,m=MISSIONS[this.index];const names={defend:'DEFENDA O PERÍMETRO',recon:'RECONHECIMENTO · SNIPER',sabotage:'SABOTAGEM · BOMBER',boss:'DERROTE O TITÃ',extract:'REAGRUPAR E EXTRAIR'};document.getElementById('objective').textContent=names[this.phase]||'OPERAÇÃO';document.getElementById('mission-id').textContent=m.id+' · '+m.sector;document.getElementById('chapter-label').textContent=m.chapter;document.getElementById('wave-progress').style.width= Math.max(0,Math.min(100,this.phase==='defend'?100*(1-this.defenseRemaining/m.defend):this.phase==='recon'?100*this.phaseProgress/2.1:this.phase==='sabotage'?100*this.phaseProgress/2.7:this.phase==='extract'?100*this.hold/1.8:g.waveKilled/g.waveCount*100||0))+'%';document.getElementById('mission-progress-label').textContent='SQUAD · '+(this.phase||'MISSÃO').toUpperCase();}
 complete(){const g=this.game,m=MISSIONS[this.index];this.clearObjectives();g.pendingSpawns=[];g.enemies.clear();g.mouseDown=false;g.setState('chapter-complete');g.squad?.syncUI();if(document.pointerLockElement)document.exitPointerLock();g.audio.play('pickup');g.score+=m.prize*5;g.saveBest();this.save.credits=clamp(this.save.credits+m.prize,0,99999);if(this.index<MISSIONS.length-1)this.save.checkpoint=Math.max(this.save.checkpoint,this.index+1);else this.save.completed=true;this.updateSave();const $=id=>document.getElementById(id);$('chapter-complete-screen').classList.remove('hidden');$('chapter-name').textContent=m.name;$('chapter-summary').textContent='ESQUADRÃO EXTRAÍDO. O PERÍMETRO FOI PROTEGIDO, A AMEAÇA RECONHECIDA E O TITÃ NEUTRALIZADO.';$('chapter-reward').textContent='+'+m.prize+' CRÉDITOS';$('next-mission').classList.toggle('hidden',this.index===MISSIONS.length-1);$('victory-finish').classList.toggle('hidden',this.index!==MISSIONS.length-1);}
 nextMission(){if(this.index>=MISSIONS.length-1)return;document.getElementById('chapter-complete-screen').classList.add('hidden');this.game.hideScreens();this.game.setState('playing');this.configure(this.index+1);this.game.deployment?.begin(SQUAD_START.x,SQUAD_START.z);this.game.requestLock();}
 disposeSector(){this.active=false;this.clearObjectives();this.deco.clear();this.game.squad?.clear();document.getElementById('interaction').classList.add('hidden');}
}

import * as THREE from 'three';
import {HEROES,ACTIVE_HEROES,heroById} from './heroRoster.js';
import {SQUAD_ROLES,ROLE_INFO,SQUAD_POINTS,roleForHero,safeSpawnNear} from './squadLayout.js';
import {createOperative,animateOperative,disposeOperative} from './characters.js';
import {findSquadPath} from './squadNavigation.js';
const POS={front:[-3,6],support:[-6,-6],sniper:[10,-12],bomber:[7,4]};
/** Three allied bots, one per missing role. Separate from multiplayer remote avatars. */
export class SquadAI{
 constructor(game){this.game=game;this.members=[];this.order='follow';this.target=null;this.updateTime=0;this.playerSupportPulse=6;this.ui=null;this.buildOrders();}
 buildOrders(){
  const btn=document.createElement('button');btn.id='squad-command-button';btn.type='button';btn.textContent='☷ SQUAD · G';btn.title='Comandar esquadrão';btn.addEventListener('click',()=>this.toggleOrders());document.body.append(btn);
  const panel=document.createElement('section');panel.id='squad-orders';panel.className='hidden';panel.setAttribute('aria-label','Ordens ao esquadrão');panel.innerHTML='<strong>COMANDAR ESQUADRÃO</strong><p>Escolha a tática dos três aliados.</p><div class="squad-order-grid"></div><small id="squad-orders-status">SEGUINDO O OPERADOR</small>';
  for(const [id,label] of [['follow','SEGUIR'],['hold','DEFENDER'],['attack','ATACAR'],['position','IR AO OBJETIVO']]){
   const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{this.command(id);this.toggleOrders(false);});panel.querySelector('.squad-order-grid').append(b);
  }
  document.body.append(panel);this.ui=panel;this.button=btn;this.syncUI();
 }
 syncUI(){const visible=this.game?.mode==='campaign'&&this.game?.state==='playing';this.button?.classList.toggle('hidden',!visible);document.getElementById('squad-status')?.classList.toggle('hidden',!visible);if(!visible)this.ui?.classList.add('hidden');}
 toggleOrders(force){if(this.game.state!=='playing'||this.game.mode!=='campaign')return;const open=typeof force==='boolean'?force:this.ui.classList.contains('hidden');this.ui.classList.toggle('hidden',!open);if(open&&document.pointerLockElement)document.exitPointerLock();else if(!open)this.game.requestLock();}
 command(id){if(!['follow','hold','attack','position'].includes(id))return;this.order=id;if(id==='hold')this.target={x:this.game.player.x,z:this.game.player.z};if(id==='position'){const goal=this.game.campaign?.primaryPoint?.()||SQUAD_POINTS.defense;this.target={x:goal.x,z:goal.z};}document.getElementById('squad-orders-status').textContent='ORDEM: '+id.toUpperCase();this.game.toast('ESQUADRÃO · '+({follow:'SEGUIR',hold:'DEFENDER',attack:'ATACAR',position:'IR AO OBJETIVO'})[id]);}
 start(){this.clear();const chosen=roleForHero(this.game.heroSelection.selectedHero);const available=new Set([this.game.heroSelection.selectedHero]);const start=SQUAD_POINTS.insertion;
  for(const role of SQUAD_ROLES){if(role===chosen)continue;const hero=ACTIVE_HEROES.find(h=>roleForHero(h.id)===role&&!available.has(h.id));if(!hero)continue;available.add(hero.id);
   const body=createOperative({role:hero.role,hero:hero.id,tint:hero.color,size:.93});const root=new THREE.Group();root.add(body);
   const spot=safeSpawnNear(this.game.world,start.x+POS[role][0],start.z+POS[role][1]);root.position.set(spot.x,0,spot.z);
   const badge=document.createElement('canvas');badge.width=256;badge.height=75;const ctx=badge.getContext('2d');ctx.fillStyle='rgba(9,24,35,.87)';ctx.fillRect(0,0,256,75);ctx.fillStyle='#b3f7e9';ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.fillText(hero.name,128,27);ctx.fillStyle='#e4f1e9';ctx.font='bold 18px Arial';ctx.fillText(ROLE_INFO[role].name,128,55);
   const texture=new THREE.CanvasTexture(badge);const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));tag.position.y=3.15;tag.scale.set(2.5,.72,1);root.add(tag);
   this.game.world.scene.add(root);this.members.push({role,hero,root,body,tag,texture,x:spot.x,z:spot.z,eyeY:1.7,hp:100,shield:45,maxShield:45,downed:false,fire:0,heal:0,lastMoving:0,revive:0,skill:0,path:[],pathGoal:null,pathTimer:0});
  }
  this.order='follow';this.target=null;this.playerSupportPulse=6;this.syncUI();}
 clear(){for(const b of this.members){this.game.world.scene.remove(b.root);disposeOperative(b.body);b.texture.dispose();b.tag.material.dispose();}this.members=[];this.ui?.classList.add('hidden');this.syncUI();}
 member(role){return this.members.find(b=>b.role===role)||null;}
 roleNear(role,x,z,range=17){const isPlayer=roleForHero(this.game.heroSelection.selectedHero)===role;const p=isPlayer?this.game.player:this.member(role);return !!p&&!p.downed&&Math.hypot(p.x-x,p.z-z)<=range;}
 damage(member,amount){if(!member||member.downed)return;const absorb=Math.min(member.shield,amount);member.shield-=absorb;member.hp-=amount-absorb;if(member.hp<=0){member.hp=0;member.downed=true;member.revive=13;member.root.visible=false;this.game.toast(member.hero.name+' CAIU · REAGRUPAMENTO AUTOMÁTICO');}}
 objectiveGoal(role){const mission=this.game.campaign;const p=SQUAD_POINTS;
  if(mission?.phase==='defend'){if(role==='front')return {x:p.defense.x,z:p.defense.z+12};if(role==='support')return {x:p.defense.x-8,z:p.defense.z-3};if(role==='sniper')return {x:p.defense.x+18,z:p.defense.z-16};return {x:p.defense.x+13,z:p.defense.z+8};}
  if(mission?.phase==='recon'){if(role==='sniper')return p.reconnaissance;if(role==='front')return {x:p.reconnaissance.x-12,z:p.reconnaissance.z+9};if(role==='support')return {x:p.reconnaissance.x-14,z:p.reconnaissance.z-4};return {x:p.reconnaissance.x-6,z:p.reconnaissance.z+15};}
  if(mission?.phase==='sabotage'){if(role==='bomber')return p.sabotage;if(role==='front')return {x:p.sabotage.x+10,z:p.sabotage.z+7};if(role==='support')return {x:p.sabotage.x+14,z:p.sabotage.z-7};return {x:p.sabotage.x+14,z:p.sabotage.z-20};}
  if(mission?.phase==='boss'){if(role==='front')return {x:p.boss.x,z:p.boss.z-8};if(role==='sniper')return {x:p.boss.x+40,z:p.boss.z-21};if(role==='support')return {x:p.boss.x-30,z:p.boss.z-22};return {x:p.boss.x+25,z:p.boss.z+10};}
  if(mission?.phase==='extract')return p.extraction;
  return this.game.player;
 }
 update(dt){if(this.game.state!=='playing'||this.game.mode!=='campaign')return;
  this.updateTime+=dt;const player=this.game.player,enemies=this.game.enemies.enemies;
  // Support remains meaningful even when the human chooses Atlas/Nyra/Mímico:
  // a lightweight medical pulse benefits wounded teammates rather than only the player.
  if(roleForHero(this.game.heroSelection.selectedHero)==='support'){
    this.playerSupportPulse-=dt;
    if(this.playerSupportPulse<=0){
      const wounded=this.members.filter(b=>!b.downed&&b.hp<88&&Math.hypot(b.x-player.x,b.z-player.z)<17);
      if(wounded.length){for(const b of wounded)b.hp=Math.min(100,b.hp+16);this.game.enemies.spawnParticles(new THREE.Vector3(player.x,1,player.z),0x7effac,8,.48);this.playerSupportPulse=11;}
      else this.playerSupportPulse=2;
    }
  }
  for(const b of this.members){
    if(b.downed){b.revive-=dt;if(b.revive<=0){b.downed=false;b.hp=70;b.shield=25;b.root.visible=true;const spot=safeSpawnNear(this.game.world,player.x+POS[b.role][0],player.z+POS[b.role][1]);b.x=spot.x;b.z=spot.z;b.path=[];b.pathGoal=null;b.pathTimer=0;}continue;}
    let target=null,best=Infinity;
    for(const e of enemies){if(e.dead)continue;const d=Math.hypot(e.x-b.x,e.z-b.z),bias=b.role==='sniper'&&(e.type==='sniper'||e.boss)?-.35*d:0;if(d+bias<best){best=d+bias;target=e;}}
    let goal=this.order==='position'&&this.target?this.target:this.order==='hold'&&this.target?this.target:this.objectiveGoal(b.role);
    if(this.order==='attack'&&target)goal=target;
    if(this.order==='follow'){const mission=this.game.campaign;if(mission?.phase==='extract')goal=SQUAD_POINTS.extraction;else if(Math.hypot(player.x-b.x,player.z-b.z)>62)goal={x:player.x+POS[b.role][0],z:player.z+POS[b.role][1]};}
    if(target&&b.role==='front'&&Math.hypot(target.x-b.x,target.z-b.z)<22)goal=target;
    // Recompute a low-cost A* route only when the destination changes or the cached route expires.
    b.pathTimer-=dt;const walking=this.game.world.canMove.bind(this.game.world);
    if(b.pathTimer<=0||!b.pathGoal||Math.hypot(goal.x-b.pathGoal.x,goal.z-b.pathGoal.z)>18){
      b.path=findSquadPath({x:b.x,z:b.z},goal,(x,z)=>walking(x,z,.62));
      b.pathGoal={x:goal.x,z:goal.z};b.pathTimer=2.8+(this.members.indexOf(b)*.3);
    }
    while(b.path.length&&Math.hypot(b.x-b.path[0].x,b.z-b.path[0].z)<2.9)b.path.shift();
    if(b.path.length)goal=b.path[0];
    const dx=goal.x-b.x,dz=goal.z-b.z,d=Math.hypot(dx,dz),speed=b.role==='front'?7.0:b.role==='bomber'?7.3:5.4;
    let moved=false;
    if(d>Math.max(2.6,b.role==='sniper'&&target?8:2.2)){
      const nx=dx/d,nz=dz/d,step=Math.min(d,speed*dt);
      for(const [ax,az] of [[nx,nz],[nz,-nx],[-nz,nx],[nx*.5+nz*.5,nz*.5-nx*.5]]){
        const tx=b.x+ax*step,tz=b.z+az*step;
        if(this.game.world.canMove(tx,tz,.6)){b.x=tx;b.z=tz;moved=true;break;}
      }
    }
    b.root.position.set(b.x,0,b.z);b.lastMoving=moved?1:0;
    if(target)b.root.rotation.y=Math.atan2(b.x-target.x,b.z-target.z);
    else if(d>.01)b.root.rotation.y=Math.atan2(-dx,-dz);
    b.fire=Math.max(0,b.fire-dt);b.heal=Math.max(0,b.heal-dt);b.skill=Math.max(0,b.skill-dt);
    const distance=target?Math.hypot(target.x-b.x,target.z-b.z):Infinity;
    const range=b.role==='sniper'?115:b.role==='front'?18:66;
    let fired=false;
    if(target&&distance<range&&b.fire<=0){
      const from=new THREE.Vector3(b.x,1.6,b.z),to=new THREE.Vector3(target.x,target.y,target.z);const ray=to.clone().sub(from);const len=ray.length();
      if(len>0.2&&this.game.world.raycastDistance(from,ray.normalize(),Math.max(.1,len-.4))>=len-.8){
       const dmg=b.role==='sniper'?50:b.role==='bomber'?35:b.role==='front'?31:19;
       this.game.enemies.damage(target,dmg,to,'ally');b.fire=b.role==='sniper'?1.9:b.role==='front'?.72:b.role==='bomber'?1.2:.48;fired=true;
       this.game.enemies.spawnParticles(to, b.hero.color,2,.24);
      }
    }
    // Support operates a cooldown-limited squad repair pulse.
    if(b.role==='support'&&b.heal<=0){const wounded=[player,...this.members].filter(a=>!a.downed&&Math.hypot(a.x-b.x,a.z-b.z)<18&&(a.health??a.hp)<(a.maxHealth||100)*.75);
      if(wounded.length){for(const a of wounded){if(a===player)a.health=Math.min(a.maxHealth,a.health+22);else a.hp=Math.min(100,a.hp+22);}b.heal=12;this.game.enemies.spawnParticles(new THREE.Vector3(b.x,1.2,b.z),0x7effac,9,.5);}
    }
    animateOperative(b.body,dt,{moving:b.lastMoving,firing:fired,distance:Math.hypot(b.x-player.x,b.z-player.z)});
  }
  if(this.updateTime>.25){this.updateTime=0;this.refreshHUD();}
 }
 refreshHUD(){const el=document.getElementById('squad-status');if(!el)return;const current=roleForHero(this.game.heroSelection.selectedHero);el.innerHTML=`<strong>ESQUADRÃO DELTA · 4/4</strong><div class="squad-member-grid">${['front','support','sniper','bomber'].map(role=>{const p=role===current?this.game.player:this.member(role);const hero=role===current?heroById(this.game.heroSelection.selectedHero):p?.hero;return `<span class="${p?.downed?'downed':''}"><b>${ROLE_INFO[role].icon} ${hero?.name||'—'}</b><small>${ROLE_INFO[role].name} · ${p?.downed?'REAGRUPANDO':Math.ceil(p?.health??p?.hp??0)+' HP'}</small></span>`;}).join('')}</div>`;}
}

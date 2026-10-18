import {MOBA_LANES,MOBA_BASES,JUNGLE_CAMPS} from './mobaLayout.js';
import {heroLoadout} from './heroRoster.js';
import {WORLD_HALF} from './worldLayout.js';
/** Seleção de habilidades e teleporte tático, comuns a PC e telas sensíveis ao toque. */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class PowerMenu{
 constructor(system,abilities){
  this.system=system;this.game=system.game;this.abilities=abilities;this.mode=null;this.slot=0;this.target=null;
  this.page=0;this.pageSize=8;this.hoverIndex=-1;this.dialog=$('titan-abilities-dialog');this.wheel=$('titan-abilities-wheel');this.map=$('titan-teleport-map');this.ctx=this.map.getContext('2d');
  this.map.addEventListener('pointerdown',e=>{this.map.setPointerCapture?.(e.pointerId);this.selectPoint(e);});
  this.map.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')this.selectPoint(e);});
  $('titan-power-pick').addEventListener('click',()=>this.confirmTeleport());
  $('titan-power-cancel').addEventListener('click',()=>this.close());
  $('titan-wheel-close').addEventListener('click',()=>this.close());
  $('titan-power-picker').addEventListener('click',()=>this.openWheel());
  $('titan-wheel-prev').addEventListener('click',()=>this.setPage(this.page-1));
  $('titan-wheel-next').addEventListener('click',()=>this.setPage(this.page+1));
  this.wheel.addEventListener('pointermove',e=>{
    if(this.mode!=='wheel')return;
    const rect=this.wheel.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const dx=e.clientX-cx,dy=e.clientY-cy,r=Math.hypot(dx,dy);
    if(r<rect.width*.13||r>rect.width*.49)return;
    const index=(Math.round((Math.atan2(dy,dx)+Math.PI/2)/(Math.PI/4))+8)%8;
    this.setHovered(index);
  });
  this.wheel.addEventListener('pointerup',e=>{if(this.mode==='wheel'&&e.pointerType==='touch'&&this.hoverIndex>=0){e.preventDefault();this.releaseWheel();}});
  this.shopInfo=document.createElement('div');this.shopInfo.id='titan-wheel-credits';this.shopInfo.setAttribute('role','status');this.shopInfo.className='titan-wheel-credits';const wheelStage=this.wheel.closest('.titan-wheel-stage');wheelStage.parentNode.insertBefore(this.shopInfo,wheelStage);
  for(const b of document.querySelectorAll('[data-power-target-slot]'))b.addEventListener('click',()=>{this.slot=Number(b.dataset.powerTargetSlot);this.renderWheel();});
 }
 open(mode){
  if(this.game.state!=='playing'||this.mode)return;
  this.mode=mode;this.game.mouseDown=false;this.game.rightDown=false;this.game.keys={};this.game.mobile?.clear?.();
  this.game.setState('paused');if(document.pointerLockElement)document.exitPointerLock();
  this.dialog.classList.remove('hidden');this.dialog.classList.toggle('is-teleport',mode==='teleport');this.dialog.classList.toggle('is-wheel',mode==='wheel');
  if(mode==='teleport'){this.target=null;this.updateInfo();this.renderMap();}
  else this.renderWheel();
 }
 openWheel(){if(this.mode==='wheel'){this.close();return;}if(!this.mode)this.open('wheel');}
 entries(){return heroLoadout(this.game.heroSelection?.selectedHero).map(id=>[id,this.abilities[id]]).filter(x=>x[1]);}
 setPage(next){const max=Math.ceil(this.entries().length/this.pageSize);this.page=(next+max)%max;this.renderWheel();}
 setHovered(index){this.hoverIndex=index;for(const b of this.wheel.querySelectorAll('.titan-power-option'))b.classList.toggle('hovered',Number(b.dataset.index)===index);const item=this.entries()[this.page*this.pageSize+index];$('titan-wheel-center').textContent=item?(this.system.isUnlocked(item[0])?item[1].label:item[1].label+' · '+this.system.economy.price(item[0])+' CR'):'ESCOLHA O PODER';}
 releaseWheel(){if(this.mode!=='wheel')return;const entry=this.entries()[this.page*this.pageSize+this.hoverIndex];if(entry&&this.system.acquire(this.slot,entry[0])){this.game.toast(entry[1].label+' EQUIPADO EM PODER '+(this.slot+1));this.close();}else this.renderWheel();}
 openTeleport(){this.open('teleport');}
 close(){
  if(!this.mode)return;
  this.mode=null;this.dialog.classList.add('hidden');this.dialog.classList.remove('is-teleport','is-wheel');
  this.game.setState('playing');this.game.requestLock();
 }
 renderWheel(){
  const entries=this.entries(),max=Math.ceil(entries.length/this.pageSize);
  const frag=document.createDocumentFragment();this.hoverIndex=-1;
  $('titan-wheel-center').textContent='ESCOLHA O PODER';
  const start=this.page*this.pageSize;
  for(let i=0;i<this.pageSize;i++){
   const entry=entries[start+i];if(!entry)continue;
   const [id,p]=entry;
   const button=document.createElement('button');button.type='button';button.className='titan-power-option';button.dataset.index=String(i);
   button.style.setProperty('--sector',String(i));
   if(this.system.loadout.includes(id))button.classList.add('equipped');
   const unlocked=true;
   const icon=document.createElement('span');icon.textContent=p.icon;
   const name=document.createElement('strong');name.textContent=p.label;
   button.append(icon,name);button.title=p.help;

   button.addEventListener('pointerenter',()=>this.setHovered(i));
   button.addEventListener('click',()=>{if(this.mode!=='wheel')return;if(this.system.acquire(this.slot,id)){this.close();this.game.toast(p.label+' EQUIPADO EM PODER '+(this.slot+1));}else this.renderWheel();});
   frag.appendChild(button);
  }
  this.wheel.replaceChildren(frag);
  $('titan-wheel-page').textContent=`${this.page+1} / ${max}`;
  this.shopInfo.textContent='KIT FIXO · TRÊS HABILIDADES SEM CUSTO · TECLAS 1, 2 e 3';
  for(const b of document.querySelectorAll('[data-power-target-slot]'))b.classList.toggle('selected',Number(b.dataset.powerTargetSlot)===this.slot);
 }

 convert(x,z){return {x:(x+WORLD_HALF)/(2*WORLD_HALF)*this.map.width,y:(z+WORLD_HALF)/(2*WORLD_HALF)*this.map.height};}
 worldAt(e){const rect=this.map.getBoundingClientRect();return {x:clamp((e.clientX-rect.left)/rect.width*(2*WORLD_HALF)-WORLD_HALF,-WORLD_HALF+1,WORLD_HALF-1),z:clamp((e.clientY-rect.top)/rect.height*(2*WORLD_HALF)-WORLD_HALF,-WORLD_HALF+1,WORLD_HALF-1)};}
 findLanding(x,z){
  const city=this.game.urban;let y=.09;
  const surfaces=city.surfaces.filter(s=>!s.ramp&&Math.abs(x-s.x)<s.hx-.75&&Math.abs(z-s.z)<s.hz-.75&&Number.isFinite(s.y));
  if(surfaces.length)y=Math.max(...surfaces.map(s=>s.y))+.08;
  const valid=city.canOccupy(x,z,y,1.77,.48)&&Math.hypot(x-this.game.parkour.x,z-this.game.parkour.z)<=700;
  return {x,y,z,valid};
 }
 selectPoint(e){if(this.mode!=='teleport')return;e.preventDefault();const {x,z}=this.worldAt(e);this.target=this.findLanding(x,z);this.updateInfo();this.renderMap();}
 updateInfo(){const t=this.target;const text=$('titan-map-feedback');text.textContent=!t?'TOQUE OU CLIQUE NO MAPA PARA ESCOLHER':t.valid?`DESTINO CONFIRMÁVEL · ${Math.round(Math.hypot(t.x-this.game.parkour.x,t.z-this.game.parkour.z))} m · ALTURA ${t.y.toFixed(1)} m`:'LOCAL BLOQUEADO — ESCOLHA UMA RUA OU TELHADO';text.classList.toggle('invalid',!!t&&!t.valid);$('titan-power-pick').disabled=!t?.valid;}
 renderMap(){
  const ctx=this.ctx,w=this.map.width,h=this.map.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#18242b';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#44555a';ctx.lineWidth=9;
  for(let x=-208;x<=208;x+=32){let q=this.convert(x,0).x;ctx.beginPath();ctx.moveTo(q,0);ctx.lineTo(q,h);ctx.stroke();}
  for(let z=-208;z<=208;z+=32){let q=this.convert(0,z).y;ctx.beginPath();ctx.moveTo(0,q);ctx.lineTo(w,q);ctx.stroke();}
  for(const [name,points] of Object.entries(MOBA_LANES)){
    ctx.beginPath();points.forEach(([x,z],i)=>{const q=this.convert(x,z);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle={top:'#8bb8ff',mid:'#ffcf8a',adc:'#86ffc0'}[name];ctx.lineWidth=15;ctx.stroke();
  }
  for(const p of JUNGLE_CAMPS){const q=this.convert(p.x,p.z);ctx.beginPath();ctx.arc(q.x,q.y,8,0,Math.PI*2);ctx.fillStyle='#4eb979';ctx.fill();}
  for(const [team,p] of Object.entries(MOBA_BASES)){const q=this.convert(p.x,p.z);ctx.beginPath();ctx.arc(q.x,q.y,17,0,Math.PI*2);ctx.fillStyle=team==='blue'?'#49d8ff':'#ff698b';ctx.fill();}
  const city=this.game.urban;ctx.fillStyle='rgba(114,133,140,.55)';ctx.strokeStyle='#a2b7ba';ctx.lineWidth=1;
  for(const s of city.surfaces){if(s.ramp)continue;const p=this.convert(s.x,s.z);const sw=s.hx/WORLD_HALF*w,sh=s.hz/WORLD_HALF*h;ctx.fillRect(p.x-sw/2,p.y-sh/2,sw,sh);ctx.strokeRect(p.x-sw/2,p.y-sh/2,sw,sh);}
  ctx.fillStyle='#f2b26b';for(const p of this.game.multiplayer?.players||[]){if(p.id===this.game.multiplayer.id||p.alive===false||p.invisible||p.phased)continue;const q=this.convert(p.x,p.z);ctx.beginPath();ctx.arc(q.x,q.y,4,0,Math.PI*2);ctx.fill();}
  const own=this.game.parkour;const loc=this.convert(own.x,own.z);
  ctx.fillStyle='#8dffd0';ctx.beginPath();ctx.arc(loc.x,loc.y,6,0,Math.PI*2);ctx.fill();
  if(this.target){const q=this.convert(this.target.x,this.target.z);ctx.strokeStyle=this.target.valid?'#72ffd5':'#ff7083';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,10,0,Math.PI*2);ctx.moveTo(q.x-16,q.y);ctx.lineTo(q.x+16,q.y);ctx.moveTo(q.x,q.y-16);ctx.lineTo(q.x,q.y+16);ctx.stroke();}
 }
 confirmTeleport(){if(this.mode!=='teleport'||!this.target?.valid)return;const destination={...this.target};this.close();this.system.sendTeleport(destination);}
}

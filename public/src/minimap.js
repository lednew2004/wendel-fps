import {MOBA_LANES,MOBA_BASES,JUNGLE_CAMPS} from './mobaLayout.js';
/** Minimapa tático multiplayer: cidade inteira, norte fixo e posições da sala.
 * Nenhuma consulta ao servidor: os dados são os snapshots/movimentos WebSocket
 * já recebidos pelo cliente. Desenho em canvas 2D (baixo custo no celular).
 */
import {WORLD_HALF} from './worldLayout.js';
const SIZE=240;
export const MAP_HALF=WORLD_HALF;
const PADDING=15;

export function projectPlayer(x,z,size=SIZE){
  const usable=size-2*PADDING;
  const scale=usable/(2*MAP_HALF);
  return {
    x:Math.max(PADDING,Math.min(size-PADDING,size/2+x*scale)),
    y:Math.max(PADDING,Math.min(size-PADDING,size/2+z*scale))
  };
}

function playerTriangle(ctx,x,y,yaw,color){
  ctx.save();ctx.translate(x,y);ctx.rotate(-yaw);
  ctx.fillStyle=color;
  ctx.strokeStyle='#08232d';ctx.lineWidth=2.4;
  ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(-8,9);ctx.lineTo(0,5);ctx.lineTo(8,9);ctx.closePath();
  ctx.stroke();ctx.fill();ctx.restore();
}

export class MultiplayerMinimap {
  constructor(game){
    this.game=game;
    this.root=document.getElementById('mp-minimap');
    this.canvas=document.getElementById('mp-minimap-canvas');
    this.count=document.getElementById('mp-minimap-count');
    this.ctx=this.canvas.getContext('2d',{alpha:true});
    this.base=document.createElement('canvas');
    this.base.width=this.base.height=SIZE;
    this.paintCity();
  }
  show(){this.root.classList.remove('hidden');}
  hide(){this.root.classList.add('hidden');}
  paintCity(){
    const ctx=this.base.getContext('2d');
    ctx.fillStyle='#101d25';ctx.fillRect(0,0,SIZE,SIZE);
    // Three continuous MOBAs lanes and jungle are always represented even at low graphics quality.
    ctx.fillStyle='#193225';ctx.fillRect(PADDING,PADDING,SIZE-2*PADDING,SIZE-2*PADDING);
    for(const [name,points] of Object.entries(MOBA_LANES)){
      ctx.beginPath();ctx.lineJoin='round';ctx.lineCap='round';
      points.forEach(([x,z],i)=>{const q=projectPlayer(x,z);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});
      ctx.lineWidth=12;ctx.strokeStyle='#34484b';ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle={top:'#84bafa',mid:'#f3d88a',adc:'#7de8ad'}[name];ctx.stroke();
    }
    for(const camp of JUNGLE_CAMPS){const q=projectPlayer(camp.x,camp.z);ctx.fillStyle='#477d58';ctx.beginPath();ctx.arc(q.x,q.y,4,0,Math.PI*2);ctx.fill();}
    for(const [team,p] of Object.entries(MOBA_BASES)){const q=projectPlayer(p.x,p.z);ctx.fillStyle=team==='blue'?'#4fc8ff':'#ff7285';ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.fill();ctx.font='bold 8px sans-serif';ctx.fillText(team==='blue'?'B':'R',q.x-2,q.y+3);}
    // Building footprints, separated from their collision geometry and GPU assets.
    ctx.fillStyle='rgba(112,122,116,.45)';
    ctx.strokeStyle='rgba(160,163,160,.4)';ctx.lineWidth=.75;
    for(const s of this.game.urban?.solids||[]){
      if(!Number.isFinite(s.x)||!Number.isFinite(s.z)||!Number.isFinite(s.hx)||!Number.isFinite(s.hz))continue;
      const lo=projectPlayer(s.x-s.hx,s.z-s.hz);
      const hi=projectPlayer(s.x+s.hx,s.z+s.hz);
      const w=hi.x-lo.x,h=hi.y-lo.y;
      if(w<3.4||h<3.4||s.active!==undefined)continue;
      ctx.fillRect(lo.x,lo.y,w,h);
      if(w>5&&h>5)ctx.strokeRect(lo.x+.5,lo.y+.5,w-1,h-1);
    }
    ctx.strokeStyle='#8eabac';ctx.lineWidth=1.4;
    ctx.strokeRect(PADDING,PADDING,SIZE-PADDING*2,SIZE-PADDING*2);
    ctx.fillStyle='#c9d9d8';ctx.textAlign='center';ctx.font='800 12px sans-serif';
    ctx.fillText('N',SIZE/2,11);
  }
  draw(players,selfId){
    if(this.root.classList.contains('hidden')||!this.ctx)return;
    const ctx=this.ctx;
    ctx.clearRect(0,0,SIZE,SIZE);
    ctx.drawImage(this.base,0,0);
    const ids=new Set();let active=0;
    for(const p of players){
      if(!p||!p.id||ids.has(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
      ids.add(p.id);active++;
      if(p.id===selfId||p.invisible||p.phased)continue;
      const at=projectPlayer(p.x,p.z);
      const alive=p.alive!==false;
      ctx.beginPath();ctx.arc(at.x,at.y,alive?7.8:5.7,0,Math.PI*2);
      ctx.fillStyle=!alive?'#677680':(p.team===this.game.multiplayer?.players?.find(v=>v.id===selfId)?.team?'#72eac0':'#fb886c');ctx.strokeStyle='#111923';ctx.lineWidth=2.7;
      ctx.stroke();ctx.fill();
      if(alive){
        ctx.fillStyle='#fff9e9';ctx.textAlign='center';ctx.font='bold 10px sans-serif';
        ctx.fillText(String(p.name||'?').trim().slice(0,1).toUpperCase(),at.x,at.y+3.5);
      }
    }
    // The local marker always uses the live parkour position and camera heading.
    const pk=this.game.parkour;
    const local=(pk&&Number.isFinite(pk.x)&&Number.isFinite(pk.z))?pk:players.find(p=>p.id===selfId);
    if(local&&Number.isFinite(local.x)&&Number.isFinite(local.z)){
      const at=projectPlayer(local.x,local.z);
      ctx.beginPath();ctx.arc(at.x,at.y,15,0,Math.PI*2);
      ctx.fillStyle='rgba(106,242,199,.15)';ctx.fill();
      playerTriangle(ctx,at.x,at.y,Number.isFinite(this.game.yaw)?this.game.yaw:0,'#74ffe0');
    }
    this.count.textContent=String(active||1);
  }
}

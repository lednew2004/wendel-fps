import {HEROES,POWER_VARIANTS,heroById,heroLoadout} from './heroRoster.js';
import {WEAPONS} from './constants.js';
import {POWER_DATA} from './powers.js';
/** Lightweight DOM roster: no extra GPU draw calls or downloaded image assets. */
export class HeroSelection {
 constructor(game){
  this.game=game;this.selectedHero='striker';this.weapon=0;this.starter='push';
  try{const s=JSON.parse(localStorage.getItem('titan-hero-selection')||'{}');if(HEROES.some(h=>h.id===s.hero))this.selectedHero=s.hero;if(Number.isInteger(s.weapon)&&s.weapon>=0&&s.weapon<WEAPONS.length)this.weapon=s.weapon;if(heroById(this.selectedHero).skills.includes(s.starter))this.starter=s.starter;else this.starter=heroById(this.selectedHero).skills[0];}catch{}
  this.mount();this.render();
 }
 persist(){try{localStorage.setItem('titan-hero-selection',JSON.stringify({hero:this.selectedHero,weapon:this.weapon,starter:this.starter}));}catch{}}
 mount(){
  const menu=document.getElementById('start-screen');
  const anchor=menu?.querySelector('#start-btn');
  if(!anchor)return;
  for(const old of document.querySelectorAll('#start-screen .power-loadout, #pause-screen .power-loadout'))old.remove();
  const section=document.createElement('section');section.className='hero-selector';section.id='hero-selector';
  section.innerHTML=`<div class="hero-select-heading"><strong>SELECIONE SEU OPERADOR</strong><small>13 PERSONAGENS · 3 HABILIDADES POR PERSONAGEM</small></div><div class="hero-roster" id="hero-roster" role="group" aria-label="Personagens jogáveis"></div><div id="hero-profile" class="hero-profile"></div><div class="hero-loadout-config"><label>ARMA INICIAL<select id="hero-weapon"></select></label></div><p class="hero-loadout-note">CASUAL E ONLINE: as três habilidades do personagem ficam liberadas desde o início. Armas podem ser trocadas durante a partida.</p>`;
  anchor.parentNode.insertBefore(section,anchor);
  const select=section.querySelector('#hero-weapon');for(let i=0;i<WEAPONS.length;i++){const option=document.createElement('option');option.value=String(i);option.textContent=`${WEAPONS[i].name} · ${WEAPONS[i].sub}`;select.appendChild(option);}
  select.addEventListener('change',()=>{this.weapon=Number(select.value);this.persist();this.render();});

  const lobby=document.getElementById('multiplayer-lobby');
  const box=document.createElement('div');box.id='hero-lobby-badge';box.className='hero-lobby-badge';
  const first=lobby?.querySelector('.power-loadout');if(first)first.replaceWith(box);else lobby?.appendChild(box);
  const room=document.querySelector('#mp-room-panel .power-loadout');if(room)room.replaceWith(document.createElement('div'));
 }
 choose(id){
  const hero=heroById(id);this.selectedHero=hero.id;this.starter=hero.skills[0];this.weapon=hero.weapon;
  this.persist();this.render();this.game.weapons?.setHeroAccent(hero.color);
  if(this.game.powers){this.game.powers.loadout=heroLoadout(hero.id);this.game.powers.menuLoadout=[...this.game.powers.loadout];this.game.powers.refreshSelects();this.game.powers.refreshButtons();}
 }
 render(){
  const parent=document.getElementById('hero-roster');if(!parent)return;
  const frag=document.createDocumentFragment();
  for(const h of HEROES){const b=document.createElement('button');b.type='button';b.className='hero-choice'+(h.id===this.selectedHero?' chosen':'');b.style.setProperty('--hero-accent','#'+h.color.toString(16).padStart(6,'0'));b.setAttribute('aria-pressed',String(h.id===this.selectedHero));b.innerHTML=`<span class="hero-emblem">✦</span><strong>${h.name}</strong><small>${h.class}</small>`;b.addEventListener('click',()=>this.choose(h.id));frag.append(b);}parent.replaceChildren(frag);
  const h=heroById(this.selectedHero), accent='#'+h.color.toString(16).padStart(6,'0');
  const profile=document.getElementById('hero-profile');profile.style.borderColor=accent+'77';
  profile.innerHTML=`<div><strong style="color:${accent}">${h.name} · ${h.title}</strong><small>${h.description}</small></div><div class="hero-powers">${h.skills.map((id,i)=>{const d=POWER_DATA[id]||POWER_VARIANTS[id];return `<span><b>${i+1} · ${d.icon} ${d.label}</b><small>${d.help}</small></span>`;}).join('')}</div>`;

  document.getElementById('hero-weapon').value=String(this.weapon);
  const badge=document.getElementById('hero-lobby-badge');if(badge)badge.innerHTML=`<strong style="color:${accent}">${h.name} — ${h.class.toUpperCase()}</strong><span>Arma inicial: ${WEAPONS[this.weapon].name} · Poderes: ${h.skills.map(id=>(POWER_DATA[id]||POWER_VARIANTS[id]).label).join(' / ')}</span><small>Para alterar personagem ou arma, volte ao menu inicial.</small>`;
 }
}

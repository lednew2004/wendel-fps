/** TITAN 3.5.1 — Configuração de HUD para FPS, mouse e telas sensíveis ao toque.
 * A prévia é isolada: editar o layout não dispara ações de combate.
 * Valores são armazenados como porcentagens do viewport, garantindo rotação responsiva.
 */
export const HUD_STORAGE_KEY='titan-hud-layout-v1';
export const HUD_ITEMS=Object.freeze([
  {id:'hud-pause',label:'Pausa',x:95,y:8,essential:true},
  {id:'hud-config-top',label:'Config. HUD',x:86,y:8,essential:true},
  {id:'crosshair',label:'Mira central',x:50,y:50,essential:true,fixedCenter:true},
  {id:'mobile-move',label:'Analógico',x:14,y:75,essential:true,mobile:true},
  {id:'m-fire',label:'Atirar',x:79,y:69,essential:true,mobile:true},
  {id:'m-jump',label:'Pular',x:94,y:85,essential:true,mobile:true},
  {id:'m-dash',label:'Dash',x:82,y:86,essential:true,mobile:true},
  {id:'m-aim',label:'Mira',x:34,y:82,mobile:true},
  {id:'m-reload',label:'Recarregar',x:34,y:20,mobile:true},
  {id:'m-interact',label:'Interagir',x:25,y:72,mobile:true},
  {id:'m-weapon',label:'Trocar arma',x:25,y:21,mobile:true},
  {id:'m-more',label:'Mais',x:35,y:36,mobile:true},
  {id:'m-objective',label:'Objetivo',x:69,y:17,mobile:true},
  {id:'m-sprint',label:'Correr',x:40,y:68,mobile:true},
  {id:'m-slide',label:'Deslizar',x:71,y:37,mobile:true},
  {id:'m-grenade',label:'Granada',x:75,y:26,mobile:true},
  {id:'m-pulse',label:'Pulso',x:81,y:24,mobile:true},
  {id:'m-trial',label:'Desafio',x:76,y:45,mobile:true},
  {id:'power-hud',label:'Poderes 1/2/3',x:51,y:79},
  {id:'squad-status',label:'Equipe',x:12,y:33},
  {id:'radar',target:'.radar-card',label:'Radar',x:88,y:32},
  {id:'vitals',target:'.vitals',label:'Vida e escudo',x:16,y:87},
  {id:'weapons',target:'.weapons',label:'Arma e munição',x:86,y:88},
  {id:'abilities',target:'.abilities',label:'Dash / Granada',x:51,y:91},
  {id:'mission-chip',target:'.mission-chip',label:'Missão',x:50,y:9},
  {id:'wave-strip',target:'.wave-strip',label:'Progresso',x:50,y:21},
  {id:'score',target:'.score',label:'Placar',x:73,y:9},
]);
const query=id=>HUD_ITEMS.find(x=>x.id===id);
const clip=(number,min,max)=>Math.max(min,Math.min(max,number));
export function sanitizeHudLayout(input){
  const result={};
  if(!input||typeof input!=='object'||Array.isArray(input))return result;
  for(const item of HUD_ITEMS){
    const v=input[item.id];if(!v||typeof v!=='object')continue;
    const pos={};
    if(!item.fixedCenter&&Number.isFinite(Number(v.x)))pos.x=clip(Number(v.x),4,96);
    if(!item.fixedCenter&&Number.isFinite(Number(v.y)))pos.y=clip(Number(v.y),5,95);
    if(Number.isFinite(Number(v.size)))pos.size=clip(Number(v.size),65,150);
    if(Number.isFinite(Number(v.opacity)))pos.opacity=clip(Number(v.opacity),35,100);
    if(typeof v.visible==='boolean'&&!item.essential)pos.visible=v.visible;
    if(Object.keys(pos).length)result[item.id]=pos;
  }
  return result;
}
const defaults=item=>({x:item.x,y:item.y,size:100,opacity:100,visible:true});
export class HudCustomizer {
  constructor(game){
    this.game=game;this.selected='m-fire';this.layout={};this.draft={};this.tiles=new Map();
    try{this.layout=sanitizeHudLayout(JSON.parse(localStorage.getItem(HUD_STORAGE_KEY)||'{}'));}catch{}
  }
  attach(){
    for(const id of ['hud-config-top','hud-config-pause','hud-config-menu','hud-config-mp']){
      document.getElementById(id)?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.open();});
    }
    for(const id of ['hud-editor-close','hud-editor-cancel'])document.getElementById(id).addEventListener('click',()=>this.close());
    document.getElementById('hud-editor-save').addEventListener('click',()=>this.save());
    document.getElementById('hud-editor-reset').addEventListener('click',()=>{this.draft={};this.render();});
    const select=document.getElementById('hud-editor-item');
    for(const item of HUD_ITEMS){const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.label;select.add(opt);}
    select.addEventListener('change',()=>this.select(select.value));
    for(const [input,field] of [['hud-editor-size','size'],['hud-editor-opacity','opacity']]){
      document.getElementById(input).addEventListener('input',e=>{const entry=this.current();entry[field]=Number(e.target.value);this.renderTiles();this.syncControls();});
    }
    document.getElementById('hud-editor-visible').addEventListener('change',e=>{const item=query(this.selected);if(!item.essential){this.current().visible=!!e.target.checked;this.renderTiles();}});
    this.apply();
  }
  current(){const item=query(this.selected);return this.draft[item.id]??=(defaults(item));}
  open(){
    const game=this.game;
    if(game.state==='playing'){
      // Multiplayer rooms remain live. The editable dialog blocks input; no gameplay is paused on the server.
      if(game.mode==='multiplayer'){game.mouseDown=false;game.rightDown=false;game.mobile?.clear();}
      else game.pause();
    }
    if(document.pointerLockElement)document.exitPointerLock();
    this.draft=JSON.parse(JSON.stringify(this.layout));
    const editor=document.getElementById('hud-editor');editor.classList.remove('hidden');
    this.render();
  }
  close(){document.getElementById('hud-editor').classList.add('hidden');this.draft={};}
  save(){
    this.layout=sanitizeHudLayout(this.draft);
    try{localStorage.setItem(HUD_STORAGE_KEY,JSON.stringify(this.layout));}catch{}
    this.apply();this.close();this.game.toast?.('HUD PERSONALIZADO SALVO');
  }
  select(id){if(!query(id))return;this.selected=id;this.syncControls();this.renderTiles();}
  syncControls(){
    const item=query(this.selected),value={...defaults(item),...(this.draft[item.id]||{})};
    document.getElementById('hud-editor-item').value=item.id;
    document.getElementById('hud-editor-size').value=String(value.size);
    document.getElementById('hud-editor-size-value').value=value.size+'%';document.getElementById('hud-editor-size-value').textContent=value.size+'%';
    document.getElementById('hud-editor-opacity').value=String(value.opacity);
    document.getElementById('hud-editor-opacity-value').value=value.opacity+'%';document.getElementById('hud-editor-opacity-value').textContent=value.opacity+'%';
    const visible=document.getElementById('hud-editor-visible');visible.checked=value.visible!==false;visible.disabled=!!item.essential;
  }
  render(){
    const prev=document.getElementById('hud-editor-preview');
    for(const b of prev.querySelectorAll('.hud-editor-tile'))b.remove();
    this.tiles.clear();
    for(const item of HUD_ITEMS){
      const button=document.createElement('button');button.type='button';button.className='hud-editor-tile';button.textContent=item.label;button.dataset.item=item.id;
      button.setAttribute('aria-label','Arrastar '+item.label);
      prev.appendChild(button);this.tiles.set(item.id,button);
      button.addEventListener('click',()=>this.select(item.id));
      button.addEventListener('pointerdown',e=>{
        if(e.button!==0||e.target!==button)return;
        this.select(item.id);e.preventDefault();
        if(item.fixedCenter)return;
        try{button.setPointerCapture(e.pointerId);}catch{}
        const update=evt=>{
          const bounds=prev.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
          const current=this.current();current.x=clip((evt.clientX-bounds.left)/bounds.width*100,4,96);current.y=clip((evt.clientY-bounds.top)/bounds.height*100,5,95);
          this.renderTiles();
        };
        update(e);
        const move=evt=>{if(evt.pointerId===e.pointerId)update(evt);};
        const stop=evt=>{if(evt.pointerId!==e.pointerId)return;button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',stop);button.removeEventListener('pointercancel',stop);};
        button.addEventListener('pointermove',move);button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);
      });
    }
    this.syncControls();this.renderTiles();
  }
  renderTiles(){
    for(const item of HUD_ITEMS){
      const b=this.tiles.get(item.id);if(!b)continue;
      const v={...defaults(item),...(this.draft[item.id]||{})};
      b.style.left=v.x+'%';b.style.top=v.y+'%';b.style.scale=String(v.size/100);
      b.style.opacity=String((v.opacity/100)*(v.visible===false?.3:1));
      b.classList.toggle('inactive',v.visible===false);b.classList.toggle('selected',item.id===this.selected);
    }
  }
  apply(){
    // First clean every previous override, including reset-to-default actions.
    for(const item of HUD_ITEMS){
      const node=document.querySelector(item.target||('#'+item.id));if(!node)continue;
      for(const attr of ['left','right','top','bottom','position','transform','opacity','display','z-index'])node.style.removeProperty(attr);
      const v=this.layout[item.id];if(!v)continue;
      const opts={...defaults(item),...v};
      if(item.fixedCenter){
        node.style.setProperty('transform',`translate(-50%, -50%) scale(${opts.size/100})`,'important');
        node.style.setProperty('opacity',String(opts.opacity/100),'important');
        continue;
      }
      if(v.x!==undefined||v.y!==undefined){
        node.style.setProperty('position','fixed','important');
        node.style.setProperty('left',opts.x+'%','important');node.style.setProperty('top',opts.y+'%','important');
        node.style.setProperty('right','auto','important');node.style.setProperty('bottom','auto','important');
        node.style.setProperty('transform',`translate(-50%, -50%) scale(${opts.size/100})`,'important');
        node.style.setProperty('z-index','200','important');
      }else if(v.size!==undefined){node.style.setProperty('transform',`scale(${opts.size/100})`,'important');}
      node.style.setProperty('opacity',String(opts.opacity/100),'important');
      if(opts.visible===false&&!item.essential)node.style.setProperty('display','none','important');
      else if(item.mobile&&['m-objective','m-sprint','m-slide','m-grenade','m-pulse','m-trial'].includes(item.id)&&(v.x!==undefined||v.y!==undefined))node.style.setProperty('display','grid','important');
      else if(item.id==='radar'&&(v.x!==undefined||v.y!==undefined))node.style.setProperty('display','block','important');
      else if(item.id==='abilities'&&(v.x!==undefined||v.y!==undefined))node.style.setProperty('display','flex','important');
    }
  }
}

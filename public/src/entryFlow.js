import {heroById} from './heroRoster.js';

const modes = Object.freeze([
  {id:'league',icon:'⚔',number:'01',name:'LIGA DOS TITÃS',subtitle:'PVP CONTRA BOTS',description:'Enfrente classificatórias sucessivas, derrote campeões e domine a arena.',tag:'COMBATE CONTÍNUO'},
  {id:'campaign',icon:'◈',number:'02',name:'TREINO TÁTICO',subtitle:'TREINAMENTO CONTRA IA',description:'Teste armas e poderes em missões contra IA e avance pelos setores.',tag:'TREINO / CAMPANHA'},
  {id:'online',icon:'◎',number:'03',name:'MULTIJOGADOR',subtitle:'SALAS ONLINE',description:'Crie uma sala ou use o código de um amigo para jogar online.',tag:'CONEXÃO NECESSÁRIA'}
]);

/** Fullscreen boot / mode / operator flow, integrated without changing any match rules. */
export class EntryFlow {
  constructor(game){
    this.game=game;this.mode='league';this.currentStage='intro';this.introTimer=null;this.launching=false;this.previewRequested=false;this.previewPromise=null;
    const root=document.createElement('div');root.id='titan-entry';root.className='titan-entry';root.setAttribute('aria-label','Início do Titan Protocol');
    root.innerHTML=`
      <div class="entry-ambient" aria-hidden="true"><div class="entry-skyline"></div><div class="entry-light-beam"></div><div class="entry-noise"></div></div>
      <header class="entry-header"><div class="entry-brand">T<span> / </span>P <small>TITAN PROTOCOL</small></div><div class="entry-server"><span></span> BUILD 4.8.6 · SISTEMAS ONLINE</div><button id="entry-fullscreen" type="button" title="Alternar tela cheia">⛶ <span>TELA CHEIA</span></button></header>
      <section data-stage="intro" class="entry-stage entry-intro" aria-label="Introdução cinematográfica">
        <div class="intro-reveal"><div class="intro-overline">UNIDADE TÁTICA / PROTOCOLO DE DEFESA</div><h1>TITAN<br><em>PROTOCOL</em><i>.</i></h1><p>O CONFLITO NÃO ESPERA.</p><div class="intro-subtitle">ESCOLHA SUA MISSÃO. DEFINA SEU OPERADOR.</div></div>
        <div class="intro-loading"><div class="intro-loading-row"><span id="entry-boot-status">SINCRONIZANDO SISTEMAS...</span><span id="entry-boot-pct">0%</span></div><div class="intro-progress"><div id="entry-progress-bar"></div></div><small>BOOT SEQUENCE / TACTICAL ENGINE</small></div>
        <button id="entry-skip" type="button" class="entry-text-button">PULAR INTRODUÇÃO <b>↗</b></button>
      </section>
      <section data-stage="modes" class="entry-stage entry-modes hidden" aria-label="Escolher modo de jogo">
        <div class="entry-section-heading"><div><p class="entry-kicker">ETAPA 01 / 02 — SELECIONE A OPERAÇÃO</p><h2>ESCOLHA <span>SEU MODO.</span></h2><p>Uma operação. Seu estilo. Sua decisão.</p></div><span class="entry-index">01 <b>/ 02</b></span></div>
        <div class="entry-mode-grid">${modes.map(m=>`<button type="button" class="entry-mode-card" data-entry-mode="${m.id}" aria-label="${m.name}"><span class="entry-mode-number">${m.number} / OPERAÇÃO</span><span class="entry-mode-icon" aria-hidden="true">${m.icon}</span><span class="entry-mode-sub">${m.subtitle}</span><strong>${m.name}</strong><span class="entry-mode-description">${m.description}</span><span class="entry-mode-bottom"><small>${m.tag}</small><span aria-hidden="true">↗</span></span></button>`).join('')}</div>
        <div class="entry-mode-utilities"><button type="button" id="entry-armory">◈ ARSENAL E MELHORIAS</button><button type="button" id="entry-hud-config">⚙ CONFIGURAR CONTROLES / HUD</button></div>
      </section>
      <section data-stage="operators" class="entry-stage entry-operators hidden" aria-label="Seleção de personagens">
        <div class="entry-section-heading"><div><p class="entry-kicker">ETAPA 02 / 02 — MONTE SUA IDENTIDADE TÁTICA</p><h2>ESCOLHA <span>SEU OPERADOR.</span></h2><p id="entry-mode-recap">LIGA DOS TITÃS / PVP CONTRA BOTS</p></div><span class="entry-index">02 <b>/ 02</b></span></div>
        <div class="entry-operative-layout"><div class="entry-operative-visual"><div class="entry-preview-glow"></div><div id="entry-3d-portrait" class="entry-3d-portrait" aria-label="Modelo 3D opcional do personagem selecionado"><div id="entry-portrait-fallback" class="entry-portrait-fallback" aria-hidden="true"><span id="entry-hero-initials">VX</span><small>OPERADOR TÁTICO</small></div></div><button type="button" id="entry-preview-toggle" class="entry-preview-toggle" aria-pressed="false">◈ ATIVAR PRÉVIA 3D</button><div class="entry-visual-caption"><small>OPERADOR SELECIONADO</small><strong id="entry-hero-name">VEX</strong><span id="entry-hero-title">IMPACTO CINÉTICO</span></div></div><div class="entry-operative-selection" id="entry-roster-mount"></div></div>
        <div class="entry-operator-actions"><button type="button" id="entry-back" class="entry-ghost-btn">← VOLTAR AOS MODOS</button><div class="entry-launch-box"><span id="entry-action-hint">PRONTO PARA ENTRAR EM COMBATE</span><button type="button" id="entry-confirm" class="entry-main-btn">CONFIRMAR OPERADOR <b>↗</b></button></div></div>
      </section>
      <section data-stage="launch" class="entry-stage entry-launch hidden" aria-live="polite"><div class="entry-launch-mark">T<span>/</span>P</div><p class="entry-kicker">INICIALIZANDO OPERAÇÃO</p><h2 id="entry-launch-status">PREPARANDO SETOR...</h2><div class="entry-launch-line"><i></i></div><p id="entry-launch-error" role="status"></p><button id="entry-launch-back" type="button" class="entry-ghost-btn hidden">← VOLTAR AO OPERADOR</button></section>
      <footer class="entry-footer"><small>THREE.JS · TITAN COMBAT ENGINE</small><small id="entry-mode-footer">ESCOLHA O MODO PARA CONTINUAR</small></footer>`;
    document.body.appendChild(root);this.root=root;
    const old=document.getElementById('hero-selector');if(old)root.querySelector('#entry-roster-mount').appendChild(old);
    root.querySelector('#entry-skip').addEventListener('click',()=>{this.game.audio.unlock();this.game.audio.play('click');this.showModes();});
    root.querySelectorAll('[data-entry-mode]').forEach(b=>b.addEventListener('click',()=>this.chooseMode(b.dataset.entryMode)));
    root.querySelector('#entry-back').addEventListener('click',()=>this.showModes());
    root.querySelector('#entry-confirm').addEventListener('click',()=>this.confirm());
    root.querySelector('#entry-launch-back').addEventListener('click',()=>this.showOperators());
    root.querySelector('#entry-fullscreen').addEventListener('click',()=>this.toggleFullscreen());
    root.querySelector('#entry-preview-toggle').addEventListener('click',()=>this.togglePreview());
    root.querySelector('#entry-armory').addEventListener('click',()=>{this.hide();document.getElementById('armory-btn')?.click();});
    root.querySelector('#entry-hud-config').addEventListener('click',()=>{this.hide();document.getElementById('hud-config-menu')?.click();});
    document.getElementById('armory-close')?.addEventListener('click',()=>{setTimeout(()=>{if(game.state==='menu')this.showModes();},0);});
    for(const id of ['hud-editor-close','hud-editor-cancel','hud-editor-save'])document.getElementById(id)?.addEventListener('click',()=>{setTimeout(()=>{if(game.state==='menu')this.showModes();},0);});
    if(game.multiplayer?.closeLobby){const close=game.multiplayer.closeLobby.bind(game.multiplayer);game.multiplayer.closeLobby=(...args)=>{const result=close(...args);if(!game.multiplayer.connected&&game.state==='menu')this.showModes();return result;};}
    root.querySelector('#hero-roster')?.addEventListener('click',()=>requestAnimationFrame(()=>this.syncHero()));
    root.querySelector('#squad-role-tabs')?.addEventListener('click',()=>requestAnimationFrame(()=>this.syncHero()));
    window.addEventListener('keydown',e=>{if(this.root.classList.contains('hidden'))return;if(e.code==='Escape'&&this.currentStage==='operators'){e.preventDefault();this.showModes();}else if(e.code==='Enter'&&this.currentStage==='intro'){this.showModes();}},true);
    const originalMenu=game.menu.bind(game);
    game.menu=(...args)=>{const result=originalMenu(...args);this.showModes();return result;};
    // Preview starts only on character selection, saving WebGL resources during boot.
    this.preview=null;
    game.entryFlow=this; // Give the game loop a reliable signal to suspend hidden 3D rendering.
    this.showIntro();
  }
  async toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen?.();}catch{/* Browsers may block fullscreen depending on platform. */}}
  isCoveringGame(){return !this.root.classList.contains('hidden');}
  stage(name){this.currentStage=name;this.root.classList.remove('hidden');this.root.querySelectorAll('[data-stage]').forEach(s=>s.classList.toggle('hidden',s.dataset.stage!==name));this.root.dataset.stage=name;this.preview?.setVisible(this.previewRequested && name==='operators');}
  async togglePreview(){
    this.previewRequested=!this.previewRequested;
    const b=this.root.querySelector('#entry-preview-toggle');
    b.setAttribute('aria-pressed',String(this.previewRequested));
    b.textContent=this.previewRequested?'◈ DESATIVAR PRÉVIA 3D':'◈ ATIVAR PRÉVIA 3D';
    this.root.classList.toggle('entry-preview-active',this.previewRequested);
    if(!this.previewRequested){this.preview?.setVisible(false);return;}
    if(!this.previewPromise){
      this.previewPromise=import('./operatorPreview.js').then(({OperatorPreview})=>{
        if(!this.preview)this.preview=new OperatorPreview(this.root.querySelector('#entry-3d-portrait'));
        return this.preview;
      }).catch(error=>{
        console.warn('Preview 3D indisponível:',error);
        this.previewPromise=null;this.previewRequested=false;
        this.root.classList.remove('entry-preview-active');
        b.setAttribute('aria-pressed','false');b.textContent='◈ PRÉVIA 3D INDISPONÍVEL';
      });
    }
    const preview=await this.previewPromise;
    if(preview&&this.previewRequested&&this.currentStage==='operators'){
      preview.show(this.game.heroSelection.selectedHero);
      preview.setVisible(true);
    }
  }
  showIntro(){
    this.stage('intro');this.root.classList.add('cinematic-running');const started=performance.now();clearInterval(this.introTimer);
    this.introTimer=setInterval(()=>{if(this.currentStage!=='intro'){clearInterval(this.introTimer);return;}const p=Math.min(100,Math.floor((performance.now()-started)/54));this.root.querySelector('#entry-boot-pct').textContent=`${p}%`;this.root.querySelector('#entry-progress-bar').style.width=`${p}%`;
      this.root.querySelector('#entry-boot-status').textContent=p<28?'INICIALIZANDO MOTOR GRÁFICO...':p<65?'CARREGANDO OPERADORES E CENÁRIOS...':p<95?'CALIBRANDO SISTEMAS TÁTICOS...':'SISTEMA PRONTO';
      if(p===100){clearInterval(this.introTimer);this.introTimer=null;setTimeout(()=>{if(this.currentStage==='intro')this.showModes();},350);}
    },55);
  }
  showModes(){clearInterval(this.introTimer);this.introTimer=null;this.game.audio?.play('click');this.launching=false;this.root.classList.remove('cinematic-running');this.stage('modes');this.root.querySelector('#entry-mode-footer').textContent='03 MODOS DISPONÍVEIS';}
  chooseMode(id){if(!modes.some(m=>m.id===id))return;this.game.audio.unlock();this.game.audio.play('click');this.mode=id;const m=modes.find(x=>x.id===id);this.root.querySelector('#entry-mode-recap').textContent=`${m.name} / ${m.subtitle}`;this.showOperators();}
  showOperators(){this.launching=false;this.stage('operators');this.root.querySelector('#entry-mode-footer').textContent='08 OPERADORES · 03 HABILIDADES CADA';this.syncHero();}
  syncHero(){
    const h=heroById(this.game.heroSelection.selectedHero);
    this.root.querySelector('#entry-hero-name').textContent=h.name;
    this.root.querySelector('#entry-hero-title').textContent=h.title;
    this.root.querySelector('#entry-hero-initials').textContent=h.name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
    this.root.style.setProperty('--selected-accent','#'+h.color.toString(16).padStart(6,'0'));
    if(this.previewRequested)this.preview?.show(h.id);
  }
  async confirm(){
    if(this.launching)return;this.launching=true;this.game.audio.unlock();this.game.audio.play('click');this.stage('launch');
    const mode=this.mode,m=modes.find(x=>x.id===mode);this.root.querySelector('#entry-launch-status').textContent=`CARREGANDO ${m.name}...`;this.root.querySelector('#entry-launch-error').textContent='';this.root.querySelector('#entry-launch-back').classList.add('hidden');
    // requestFullscreen must be called synchronously during an actual click.
    if(!document.fullscreenElement&&this.game.mobile?.enabled){try{void document.documentElement.requestFullscreen?.();}catch{}}
    try{
      if(mode==='online') {this.hide();this.game.multiplayer.openLobby();return;}
      if(mode==='campaign')this.game.start('campaign',0);
      else this.game.start('survival');
      this.hide();
    }catch(error){console.error('Falha ao iniciar operação',error);this.root.querySelector('#entry-launch-status').textContent='FALHA NA OPERAÇÃO';this.root.querySelector('#entry-launch-error').textContent=error?.message||'Não foi possível iniciar.';this.root.querySelector('#entry-launch-back').classList.remove('hidden');this.launching=false;}
  }
  hide(){this.root.classList.add('hidden');this.preview?.setVisible(false);this.launching=false;}
}

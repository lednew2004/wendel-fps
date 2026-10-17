/**
 * Touch-first controls, preserving desktop input.
 * No fake mouse events: mobile movement is blended into ParkourController,
 * touch aim updates the exact same LookController as pointer lock.
 */
export class MobileControls {
  constructor(game) {
    this.game=game;
    this.enabled=matchMedia('(pointer: coarse)').matches || ((navigator.maxTouchPoints||0)>0 && Math.min(window.innerWidth,window.innerHeight)<=600);
    this.move={x:0,y:0};
    this.activeMove=null;
    this.activeLook=null;
    this.aimFingers=new Map();
    let savedSensitivity=3.8;
    try{savedSensitivity=Number(localStorage.getItem('titan-touch-sensitivity')||3.8);}catch{}
    this.touchSensitivity=Math.max(.8,Math.min(6,Number.isFinite(savedSensitivity)?savedSensitivity:3.8));
    this.moveBase=null;this.sprintTouch=false;this.lookFilter={x:0,y:0};
    this.moreOpen=false;this.aimToggle=false;
    this.landscape=true;
    if(!this.enabled)return;
    document.documentElement.classList.add('is-touch');
    this.root=document.getElementById('mobile-controls');
    this.rotate=document.getElementById('rotate-screen');
    this.moveElement=document.getElementById('mobile-move');
    this.lookElement=document.getElementById('mobile-look');
    this.knob=document.getElementById('mobile-move-knob');
    this.attach();
    this.updateOrientation();
    window.addEventListener('resize',()=>this.updateOrientation(),{passive:true});
    window.addEventListener('orientationchange',()=>this.updateOrientation(),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  }
  updateOrientation(){
    if(!this.enabled)return;
    this.landscape=window.innerWidth>window.innerHeight;
    const blocked=!this.landscape;
    document.documentElement.classList.toggle('needs-landscape',blocked);
    this.rotate.setAttribute('aria-hidden',String(!blocked));
    if(blocked){this.clear();if(this.game.state==='playing')this.game.pause();}
    // Keep UI available after a rotation back; do not automatically resume a paused game.
    this.sync();
  }
  sync(){
    if(!this.enabled)return;
    const active=this.landscape && this.game.state==='playing';
    this.root.setAttribute('aria-hidden',String(!active));
    document.documentElement.classList.toggle('touch-playing',active);
    if(!active)this.clear();
  }
  clear(){
    if(!this.enabled)return;
    this.move.x=this.move.y=0;this.lookFilter.x=this.lookFilter.y=0;
    this.activeMove=null;this.activeLook=null;this.moveBase=null;this.aimFingers.clear();
    this.game.mouseDown=false;this.game.rightDown=false;
    this.game.keys.Space=false;this.game.keys.KeyF=false;
    this.sprintTouch=false;this.aimToggle=false;this.moreOpen=false;
    this.root?.classList.remove('more-open');
    const more=document.getElementById('m-more');if(more)more.setAttribute('aria-expanded','false');
    document.getElementById('m-aim')?.classList.remove('selected');
    if(this.knob)this.knob.style.transform='translate(0px,0px)';
    if(this.moveElement)this.moveElement.querySelector('.stick-ring').style.transform='translate(0px,0px)';
    if(this.root)this.root.querySelectorAll('.pressed').forEach(x=>x.classList.remove('pressed'));
  }
  bindAction(id,down,up){
    const button=document.getElementById(id);
    button.addEventListener('pointerdown',e=>{
      if(this.game.state!=='playing'||!this.landscape)return;
      e.preventDefault();e.stopPropagation();
      try{button.setPointerCapture(e.pointerId);}catch{}
      button.classList.add('pressed');
      down?.();
    });
    const release=e=>{
      e.preventDefault();e.stopPropagation();
      button.classList.remove('pressed');
      up?.();
    };
    button.addEventListener('pointerup',release);
    button.addEventListener('pointercancel',release);
    button.addEventListener('lostpointercapture',()=>{button.classList.remove('pressed');up?.();});
    button.addEventListener('contextmenu',e=>e.preventDefault());
  }
  attach(){
    const pad=this.moveElement;
    const ring=pad.querySelector('.stick-ring');
    const updateMove=e=>{
      if(!this.moveBase)return;
      const radius=this.moveBase.radius;
      let x=(e.clientX-this.moveBase.x)/radius;
      let y=(this.moveBase.y-e.clientY)/radius;
      const mag=Math.hypot(x,y);
      if(mag>1){x/=mag;y/=mag;}
      this.move.x=Math.abs(x)<.035?0:x;
      this.move.y=Math.abs(y)<.035?0:y;
      this.knob.style.transform=`translate(${this.move.x*radius*.78}px,${-this.move.y*radius*.78}px)`;
    };
    pad.addEventListener('pointerdown',e=>{
      if(this.activeMove!==null||this.game.state!=='playing')return;
      e.preventDefault();e.stopPropagation();this.activeMove=e.pointerId;
      const box=pad.getBoundingClientRect();
      const centerX=box.left+box.width/2,centerY=box.top+box.height*.43;
      const radius=Math.max(32,Math.min(box.width,box.height)*.43);
      // Floating joystick centre: touch anywhere inside the pad, then drag naturally.
      this.moveBase={x:e.clientX,y:e.clientY,radius};
      ring.style.transform=`translate(${e.clientX-centerX}px,${e.clientY-centerY}px)`;
      try{pad.setPointerCapture(e.pointerId);}catch{}
      this.move.x=this.move.y=0;
    });
    pad.addEventListener('pointermove',e=>{if(this.activeMove===e.pointerId){e.preventDefault();updateMove(e);}});
    const stopMove=e=>{if(this.activeMove!==e.pointerId)return;this.activeMove=null;this.moveBase=null;this.move.x=this.move.y=0;this.knob.style.transform='translate(0,0)';ring.style.transform='translate(0,0)';};
    pad.addEventListener('pointerup',stopMove);pad.addEventListener('pointercancel',stopMove);
    pad.addEventListener('lostpointercapture',stopMove);

    // Independent pointer tracking: right-side swipes continue even when a
    // second finger moves the left joystick or presses FIRE.
    // The fire finger itself can drag to aim, FPS-style.
    const isPlayable=e=>this.landscape&&this.game.state==='playing'&&e.pointerType!=='mouse';
    const isOtherButton=e=>e.target?.closest?.('button')&&e.target.id!=='m-fire';
    document.addEventListener('pointerdown',e=>{
      if(!isPlayable(e)||e.clientX<window.innerWidth*.44||isOtherButton(e))return;
      if(e.target?.closest?.('.screen, .dialog, #multiplayer-lobby'))return;
      if(e.target?.closest?.('#mobile-move'))return;
      this.aimFingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      this.game.look.armed=true;
      // Capture pointer on its real origin; global capture-phase listeners track its motion.
      try{e.target.setPointerCapture?.(e.pointerId);}catch{}
      e.preventDefault();
    },true);
    document.addEventListener('pointermove',e=>{
      const previous=this.aimFingers.get(e.pointerId);
      if(!previous||!isPlayable(e))return;
      let dx=e.clientX-previous.x,dy=e.clientY-previous.y;
      previous.x=e.clientX;previous.y=e.clientY;
      // Ignore implausible touch deltas after device rotation or browser gesture.
      if(Math.abs(dx)>180||Math.abs(dy)>180)return;
      // Predictable 1:1 aim: no variable speed boost or artificial delay.
      // A light 85/15 filter suppresses finger jitter while keeping fast turns responsive.
      const smooth=.85;
      const sx=dx*smooth+this.lookFilter.x*(1-smooth);
      const sy=dy*smooth+this.lookFilter.y*(1-smooth);
      this.lookFilter.x=dx;this.lookFilter.y=dy;
      // Touch pixels are scaled relative to viewport height so small phones are usable.
      const screenFactor=Math.max(.85,Math.min(1.32,390/window.innerHeight));
      const scale=this.touchSensitivity*1.32*screenFactor;
      if(this.game.look.move(sx*scale,this.game.invertY?-sy*scale:sy*scale,this.game.sensitivity))this.game.positionCamera();
      e.preventDefault();
    },true);
    const release=e=>{this.aimFingers.delete(e.pointerId);if(this.aimFingers.size===0){this.lookFilter.x=0;this.lookFilter.y=0;}};
    document.addEventListener('pointerup',release,true);
    document.addEventListener('pointercancel',release,true);
    document.addEventListener('lostpointercapture',release,true);
    // A visible right-side look region remains accessible but is no longer a restriction.
    this.lookElement.style.touchAction='none';

    this.bindAction('m-fire',()=>{this.game.mouseDown=true;},()=>{this.game.mouseDown=false;});
    this.bindAction('m-aim',()=>{this.aimToggle=!this.aimToggle;this.game.rightDown=this.aimToggle;document.getElementById('m-aim').classList.toggle('selected',this.aimToggle);});
    this.bindAction('m-jump',()=>{this.game.keys.Space=true;this.game.parkour.jump();},()=>{this.game.keys.Space=false;});
    this.bindAction('m-dash',()=>this.game.dash());
    this.bindAction('m-reload',()=>this.game.weapons.reload());
    // One contextual USAR button handles ladders, ledges and mission objectives.
    this.bindAction('m-interact',()=>{this.game.parkour.interact();this.game.keys.KeyF=true;},()=>{this.game.keys.KeyF=false;});
    this.bindAction('m-objective',()=>{this.game.keys.KeyF=true;},()=>{this.game.keys.KeyF=false;});
    this.bindAction('m-sprint',()=>{this.sprintTouch=true;},()=>{this.sprintTouch=false;});
    this.bindAction('m-more',()=>{this.moreOpen=!this.moreOpen;this.root.classList.toggle('more-open',this.moreOpen);document.getElementById('m-more').setAttribute('aria-expanded',String(this.moreOpen));});
    this.bindAction('m-slide',()=>this.game.parkour.crouch());
    this.bindAction('m-grenade',()=>this.game.grenade());
    this.bindAction('m-pulse',()=>this.game.pulse());
    this.bindAction('m-weapon',()=>this.game.weapons.switchTo((this.game.weapons.index+1)%this.game.weapons.state.length));
    this.bindAction('m-trial',()=>{
      const active=this.game.parkour.toggleTrial();
      document.body.classList.toggle('trial-active',active);
      this.game.toast(active?'DESAFIO ATIVADO':'DESAFIO DESATIVADO');
    });
    const touchSlider=document.getElementById('touch-sensitivity');
    const roomSlider=document.getElementById('mp-touch-sensitivity');
    const setTouchSensitivity=value=>{
      this.touchSensitivity=Math.max(.8,Math.min(6,Number(value)||3.8));
      try{localStorage.setItem('titan-touch-sensitivity',String(this.touchSensitivity));}catch{}
      for(const slider of [touchSlider,roomSlider])if(slider)slider.value=String(this.touchSensitivity);
      for(const id of ['touch-sensitivity-label','mp-touch-sensitivity-label']){
        const label=document.getElementById(id);if(label)label.textContent=this.touchSensitivity.toFixed(1)+'×';
      }
    };
    touchSlider?.addEventListener('input',e=>setTouchSensitivity(e.target.value));
    roomSlider?.addEventListener('input',e=>setTouchSensitivity(e.target.value));
    setTouchSensitivity(this.touchSensitivity);
    document.getElementById('mobile-fullscreen').addEventListener('click',async()=>{
      try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();}catch{}
      try{await screen.orientation?.lock?.('landscape');}catch{}
      this.updateOrientation();
    });
    // Do not let touches scroll the page while playing.
    this.root.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  }
}

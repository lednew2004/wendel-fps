import {PARKOUR_TUNING as CFG,approach} from './parkourPhysics.js';
import {SQUAD_START} from './squadLayout.js';

const fmtTime=t=>Number(t).toFixed(2)+' s';
const $=id=>document.getElementById(id);

/** Character controller cinemático (colisão cápsula/AABB aproximada, 90Hz). */
export class ParkourController {
  constructor(game,city){
    this.game=game;this.city=city;this.accumulator=0;
    this.current=0;this.progress=0;this.elapsed=0;this.running=false;this.combat=false;this.trialActive=false;
    this.x=-100;this.z=-85;this.y=0;this.vx=0;this.vz=0;this.vy=0;
    this.grounded=true;this.coyote=0;this.buffer=0;this.slide=0;this.wallRun=0;this.dashTime=0;this.dashVX=0;this.dashVZ=0;
    this.ladder=null;this.hanging=null;this.lastGroundedY=0;this.checkpoint=null;this.combo=0;
    this.prompt='APROXIME-SE DA ESCADA AMARELA E PRESSIONE E';
    this.updateHud();
  }
  start(course=0){
    // A operação Squad não possui os percursos cronometrados da antiga cidade.
    if(!this.city.courses?.length){this.startCombat(SQUAD_START.x,SQUAD_START.z);return;}
    this.combat=false;this.trialActive=true;this.city.toggle(true);this.selectCourse(course);
  }
  startCombat(x=0,z=18){
    this.combat=true;this.trialActive=false;this.running=false;this.progress=0;
    this.city.toggle(true);this.city.setRouteActive?.(-1);this.spawn(x,0,z);
    this.prompt='COMBATE + PARKOUR · E ESCADAS · ESPAÇO PULAR · T DESAFIO';
    this.updateHud();
  }
  toggleTrial(){
    // O mapa tático substituiu os percursos urbanos. Nunca ativar um desafio sem checkpoints.
    if(!this.city.courses?.length){
      this.trialActive=false;this.running=false;this.progress=0;
      this.prompt='PARKOUR LIVRE · SEM DESAFIOS CRONOMETRADOS NESTE MAPA';
      this.updateHud();return false;
    }
    this.trialActive=!this.trialActive;this.running=false;this.elapsed=0;this.progress=0;
    if(this.trialActive){
      // Nearest course gets activated without teleporting during combat.
      const nearest=this.city.courses.map((c,i)=>({i,dist:Math.hypot(c.spawn[0]-this.x,c.spawn[1]-this.z)})).sort((a,b)=>a.dist-b.dist)[0];
      this.current=nearest?.i||0;this.city.setRouteActive?.(this.current);this.prompt='DESAFIO ATIVO · SIGA O MARCADOR INICIAL';
    }else{this.city.setRouteActive?.(-1);this.prompt='DESAFIO DESLIGADO · COMBATE CONTINUA';}
    this.updateHud();return this.trialActive;
  }
  stop(){this.city.toggle(false);this.city.setRouteActive?.(-1);this.accumulator=0;this.trialActive=false;}
  selectCourse(index){
    if(!this.city.courses?.length){this.trialActive=false;this.updateHud();return false;}
    this.current=Math.max(0,Math.min(this.city.courses.length-1,index));this.trialActive=true;this.city.setRouteActive?.(this.current);
    this.progress=0;this.elapsed=0;this.running=false;this.combo=0;this.checkpoint=null;
    this.spawn(this.city.courses[this.current].spawn[0],0,this.city.courses[this.current].spawn[1]);
    this.prompt='SIGA O MARCADOR NO SOLO PARA INICIAR O PERCURSO';
    this.updateHud();return true;
  }
  spawn(x,y,z){
    this.x=x;this.z=z;this.y=y;this.vx=0;this.vz=0;this.vy=0;this.grounded=true;
    this.coyote=0;this.buffer=0;this.wallRun=0;this.slide=0;this.dashTime=0;this.ladder=null;this.hanging=null;
    this.game.player.x=x;this.game.player.z=z;this.game.player.eyeY=y+1.75;
    this.game.positionCamera();
  }
  resetCheckpoint(){
    const route=this.city.courses?.[this.current];
    const safeStart={x:SQUAD_START.x,y:0,z:SQUAD_START.z};
    const p=this.checkpoint||(this.combat||!route?safeStart:{x:route.spawn[0],y:0,z:route.spawn[1]});
    this.spawn(p.x,p.y,p.z);this.prompt='REINICIADO NO ÚLTIMO CHECKPOINT';
  }
  jump(){
    if(this.hanging){this.mantle();return;}
    if(this.ladder){this.dismountLadder();return;}
    this.buffer=CFG.jumpBuffer;
    if(this.grounded){
      const dir=this.direction();
      const window=this.city.nearestInteractable(this.x,this.z,this.y,1.65);
      if(window?.kind==='window'&&window.open&&dir.mag>.2){
        this.vy=CFG.jumpSpeed*1.07;this.vx=dir.x*CFG.sprintSpeed;this.vz=dir.z*CFG.sprintSpeed;
        this.grounded=false;this.buffer=0;this.prompt='VAULT · JANELA ABERTA';return;
      }
      for(const w of this.city.lowWalls){
        const px=this.x+dir.x*1.2,pz=this.z+dir.z*1.2;
        if(Math.abs(px-w.x)<w.hx+.75&&Math.abs(pz-w.z)<w.hz+.75){
          this.combo++;this.prompt='VAULT — OBSTÁCULO SUPERADO';
          this.vy=CFG.jumpSpeed*.82;this.grounded=false;this.buffer=0;return;
        }
      }
    }
  }
  interact(){
    if(this.ladder){this.dismountLadder();return;}
    if(this.hanging){this.hanging=null;this.vy=-1.3;this.prompt='BORDA SOLTA';return;}
    const interaction=this.city.nearestInteractable(this.x,this.z,this.y);
    if(interaction){
      if(this.game.mode==='multiplayer'&&this.game.multiplayer?.connected){this.game.multiplayer.send({type:'world-interact',id:interaction.id});this.prompt='AGUARDANDO ABERTURA · '+(interaction.kind==='door'?'PORTA':'JANELA');}
      else{const opening=!interaction.open;if(!opening&&Math.abs(this.x-interaction.x)<interaction.hx+.42&&Math.abs(this.z-interaction.z)<interaction.hz+.42){this.prompt='A PASSAGEM ESTÁ OCUPADA';return;}if(this.city.toggleInteractable(interaction.id,opening)){this.prompt=(opening?'ABERTO · ':'FECHADO · ')+(interaction.kind==='door'?'PORTA':'JANELA');this.game.audio?.play?.('door');}}
      return;
    }
    const l=this.city.nearestLadder(this.x,this.z,this.y);
    if(l){
      this.ladder=l;this.hanging=null;this.vx=0;this.vy=0;this.vz=0;
      this.x=l.x;this.z=l.z;this.y=Math.max(l.base,this.y);
      this.prompt='ESCADA — W SUBIR · S DESCER · ESPAÇO SAIR';
      return;
    }
    const w=this.city.wallNear(this.x,this.z,this.y,1.05);
    if(w){
      const top=w.s.maxY+.31;
      if(top>this.y+.40&&top<this.y+CFG.ledgeReach+.9&&this.vy<=0){
        this.hanging={wall:w,top};this.vx=0;this.vy=0;this.vz=0;
        this.y=top-1.28;this.grounded=false;
        this.prompt='BORDA AGARRADA — ESPAÇO SUBIR · E SOLTAR';
      }
    }
  }
  mantle(){
    if(!this.hanging)return;
    const {wall,top}=this.hanging;
    const nx=wall.nx,nz=wall.nz;
    const targetX=this.x-nx*1.18,targetZ=this.z-nz*1.18;
    this.x=targetX;this.z=targetZ;this.y=top+.04;
    this.vx=0;this.vz=0;this.vy=0;this.grounded=true;this.hanging=null;
    this.combo++;this.prompt='MANTLE — TELHADO ALCANÇADO';
  }
  dismountLadder(){
    if(!this.ladder)return;
    this.z+=1.5;this.ladder=null;this.vy=4.2;this.grounded=false;
    this.prompt='ESCADA ABANDONADA';
  }
  crouch(){
    if(this.grounded&&Math.hypot(this.vx,this.vz)>5.5){this.slide=CFG.slideTime;this.prompt='DESLIZAMENTO';}
  }
  tacticalDash(){
    const dir=this.direction(),yaw=this.game.yaw;
    const x=dir.mag?dir.x:-Math.sin(yaw),z=dir.mag?dir.z:-Math.cos(yaw);
    this.dashTime=.22;this.dashVX=x*25;this.dashVZ=z*25;
  }
  direction(){
    const k=this.game.keys;
    let f=Number(!!(k.KeyW||k.ArrowUp))-Number(!!(k.KeyS||k.ArrowDown));
    let r=Number(!!(k.KeyD||k.ArrowRight))-Number(!!(k.KeyA||k.ArrowLeft));
    // Joystick é contínuo; combina com teclado sem duplicar velocidades.
    const mobile=this.game.mobile;
    if(mobile?.enabled){f+=mobile.move.y;r+=mobile.move.x;}
    const mag=Math.hypot(f,r);
    if(mag>1){f/=mag;r/=mag;}
    const yaw=this.game.yaw;
    return {x:-Math.sin(yaw)*f+Math.cos(yaw)*r,z:-Math.cos(yaw)*f-Math.sin(yaw)*r,mag};
  }
  update(dt){
    this.accumulator=Math.min(.15,this.accumulator+Math.max(0,dt));
    let steps=0;
    while(this.accumulator>=CFG.fixedStep&&steps<11){this.step(CFG.fixedStep);this.accumulator-=CFG.fixedStep;steps++;}
    this.game.player.x=this.x;
    this.game.player.z=this.z;
    const head=1.72-(this.slide>0?.54:0);
    const speed=Math.hypot(this.vx,this.vz);
    const bob=this.grounded&&speed>.4?Math.sin(this.game.animTime*12)*Math.min(.035,speed*.0025):0;
    this.game.player.eyeY=this.y+head+bob;
    this.game.player.moveX=this.vx;this.game.player.moveZ=this.vz;
    this.game.positionCamera();
    const cam=this.game.world.camera;
    const fov=this.game.world.baseFOV+Math.min(7,speed*.45);
    cam.fov+=Math.min(1,dt*7)*(fov-cam.fov);
    cam.updateProjectionMatrix();
    this.game.world.cameraPitch.rotation.z=0; // yaw/pitch remain owned by LookController
    this.hudCooldown=(this.hudCooldown||0)-dt;
    if(this.hudCooldown<=0){this.updateHud();this.hudCooldown=.095;}
  }
  step(dt){
    const powers=this.game.powers;
    const phased=!!powers?.isActive('phase');
    const flying=!!powers?.isActive('flight');
    const k=this.game.keys;
    const dir=this.direction();
    if(this.running)this.elapsed+=dt;
    if(this.ladder){
      const climb=Math.max(-1,Math.min(1,Number(!!k.KeyW)-Number(!!k.KeyS)+(this.game.mobile?.move.y||0)));
      this.y=Math.max(this.ladder.base,Math.min(this.ladder.top,this.y+climb*CFG.ladderSpeed*dt));
      if(this.y>=this.ladder.top-.05){
        this.x=this.ladder.toX;this.z=this.ladder.toZ;this.y=this.ladder.top+.05;
        this.ladder=null;this.grounded=true;this.vy=0;
        this.prompt='TELHADO ALCANÇADO — CORRA E SALTE ATÉ O PRÓXIMO';
      }
      this.checkCourse();return;
    }
    if(this.hanging){this.checkCourse();return;}
    this.slide=Math.max(0,this.slide-dt);
    this.buffer=Math.max(0,this.buffer-dt);
    this.coyote=Math.max(0,this.coyote-dt);
    const isSprint=!!(k.ShiftLeft||k.ShiftRight||this.game.mobile?.sprintTouch)||(!!this.game.mobile?.enabled&&this.game.mobile.move.y>.72&&Math.abs(this.game.mobile.move.x)<.65);
    const speed=(this.slide>0?CFG.slideSpeed:isSprint?CFG.sprintSpeed:CFG.walkSpeed)*(this.game.player.speedBonus||1);
    const ax=dir.x*speed,az=dir.z*speed;
    const accel=(this.grounded?CFG.accelGround:CFG.accelAir)*dt;
    if(this.dashTime>0){this.dashTime=Math.max(0,this.dashTime-dt);this.vx=this.dashVX;this.vz=this.dashVZ;}
    else {this.vx=approach(this.vx,ax,accel);this.vz=approach(this.vz,az,accel);}
    if(!dir.mag && this.dashTime<=0){
      const fric=(this.grounded?CFG.frictionGround:CFG.frictionAir)*dt;
      this.vx=approach(this.vx,0,fric);this.vz=approach(this.vz,0,fric);
    }
    if(flying){this.grounded=false;this.vy=(k.Space?9:0)-(k.ControlLeft||k.ControlRight||k.KeyC?9:0);if(!k.Space&&!k.ControlLeft&&!k.ControlRight&&!k.KeyC)this.vy=1.0;}
    if(!flying&&this.buffer>0&&(this.grounded||this.coyote>0)){
      this.vy=CFG.jumpSpeed+(isSprint?0.4:0);
      this.grounded=false;this.coyote=0;this.buffer=0;
      this.prompt=isSprint?'SALTO COM IMPULSO':'SALTO';
    }
    if(!this.grounded&&!flying){
      const wall=this.city.wallNear(this.x,this.z,this.y,.76);
      const canRun=!!wall&&isSprint&&dir.mag>0&&Math.hypot(this.vx,this.vz)>5&&this.vy<3;
      if(canRun&&this.wallRun<CFG.wallRunTime){
        this.wallRun+=dt;this.vy=Math.max(this.vy,-2.0);
        const dot=this.vx*wall.nx+this.vz*wall.nz;
        if(dot<0){this.vx-=dot*wall.nx;this.vz-=dot*wall.nz;}
        this.vy-=CFG.wallRunGravity*dt;
        this.prompt='WALL RUN — ESPAÇO PARA IMPULSO';
        if(this.buffer>0){
          this.vy=CFG.jumpSpeed*.92;this.vx+=wall.nx*7;this.vz+=wall.nz*7;
          this.buffer=0;this.wallRun=CFG.wallRunTime;this.combo++;this.prompt='WALL JUMP!';
        }
      }else{
        // Salto variável: segurar espaço prolonga discretamente a subida.
        const lift=this.vy>0&&(k.Space?0.78:1.22);
        this.vy-=CFG.gravity*dt*(lift||1);
      }
    }
    const prevY=this.y;
    const height=this.slide>0?1.08:CFG.characterHeight;
    const radius=CFG.characterRadius;
    const nx=this.x+this.vx*dt,nz=this.z+this.vz*dt;
    if(phased||this.city.canOccupy(nx,this.z,this.y,height,radius))this.x=nx;else this.vx=0;
    if(phased||this.city.canOccupy(this.x,nz,this.y,height,radius))this.z=nz;else this.vz=0;
    // Degraus/rampas só elevam o jogador quando ele está realmente no solo;
    // evita snap vertical através de telhados ou paredes.
    if(this.grounded && this.vy<=0&&!flying){
      const stairY=this.city.floorAt(this.x,this.z,this.y,CFG.stairStep);
      if(stairY>=this.y-.47 && stairY<=this.y+CFG.stairStep){
        this.y=stairY;this.vy=0;this.coyote=CFG.coyote;
        this.checkCourse();return;
      }
      this.grounded=false;this.coyote=CFG.coyote;
    }
    const nextY=this.y+this.vy*dt;
    const landed=!flying&&this.vy<=0?this.city.landingAt(this.x,this.z,prevY,nextY):-Infinity;
    if(landed!==-Infinity){
      this.y=landed;this.vy=0;this.grounded=true;this.wallRun=0;this.coyote=CFG.coyote;
      if(prevY-landed>2.0)this.prompt='ATERRISSAGEM — SEGURE CTRL PARA DESLIZAR';
      if((k.ControlLeft||k.ControlRight)&&this.slide<=0)this.slide=.34;
    }else{
      this.y=Math.min(37,Math.max(-12,nextY));
      if(this.grounded){
        const ground=this.city.floorAt(this.x,this.z,this.y,CFG.stairStep);
        if(ground>=this.y-.50&&ground<=this.y+CFG.stairStep&&this.vy<=0){
          this.y=ground;this.vy=0;this.coyote=CFG.coyote;
        }else{
          this.grounded=false;this.coyote=CFG.coyote;
        }
      }
    }
    if(this.y<-.6)this.resetCheckpoint();
    this.checkCourse();
  }
  checkCourse(){
    if(!this.trialActive)return;
    const route=this.city.courses?.[this.current];
    if(!route?.waypoints?.length){this.trialActive=false;return;}
    const target=route.waypoints[this.progress];
    if(!target)return;
    if(Math.hypot(this.x-target.x,this.z-target.z)>2.7||Math.abs(this.y-target.y)>1.05)return;
    if(!this.running){this.running=true;this.elapsed=0;this.prompt='CRONÔMETRO INICIADO — SIGA OS TELHADOS';}
    this.progress++;
    this.checkpoint={x:target.x,z:target.z,y:target.y};
    if(this.progress>=route.waypoints.length){
      this.running=false;this.combo+=this.progress;
      if(!route.best||this.elapsed<route.best){
        route.best=this.elapsed;
        try{localStorage.setItem('titan-v09-route-'+route.level,String(route.best));}catch{}
        this.prompt='NOVO RECORDE — '+fmtTime(this.elapsed);
      }else this.prompt='PERCURSO CONCLUÍDO — '+fmtTime(this.elapsed);
      if(this.combat){this.game.score+=350;this.game.player.health=Math.min(this.game.player.maxHealth,this.game.player.health+25);this.game.toast('PARKOUR CONCLUÍDO · +350 PONTOS / +25 VIDA');}
      this.progress=0;
      this.checkpoint=null;this.trialActive=false;this.city.setRouteActive?.(-1);document.body?.classList?.remove('trial-active');
    }else this.prompt=`CHECKPOINT ${this.progress}/${route.waypoints.length-1} — CONTINUE`;
  }
  updateHud(){
    const route=this.city.courses?.[this.current];
    // O mapa Squad possui combate e objetivos, mas não rotas de parkour cronometradas.
    // Este HUD ainda é usado durante a inicialização e nunca pode depender de uma rota.
    $('pk-route').textContent=route?.name||'OPERAÇÃO SQUAD';
    $('pk-level').textContent=route?'NÍVEL '+route.level:'COMBATE TÁTICO';
    $('pk-progress').textContent=route?this.progress+'/'+(route.waypoints.length-1):'—';
    $('pk-time').textContent=route?fmtTime(this.elapsed):'—';
    $('pk-best').textContent=route?.best?fmtTime(route.best):'—';
    $('pk-height').textContent=Math.max(0,this.y).toFixed(1)+' m';
    $('pk-speed').textContent=(Math.hypot(this.vx,this.vz)*3.6).toFixed(0)+' km/h';
    const interaction=this.city.nearestInteractable(this.x,this.z,this.y);
    $('pk-prompt').textContent=interaction?(interaction.open?'E · FECHAR ':'E · ABRIR ')+(interaction.kind==='door'?'PORTA':'JANELA')+' · MOBILE: USAR':this.prompt;
    const target=route?.waypoints?.[this.progress];
    if(target&&this.trialActive){
      const dx=target.x-this.x,dz=target.z-this.z;
      const dist=Math.hypot(dx,dz);
      const yaw=this.game.yaw;
      const dotRight=dx*Math.cos(yaw)-dz*Math.sin(yaw);
      const dotForward=-dx*Math.sin(yaw)-dz*Math.cos(yaw);
      const angle=Math.atan2(dotRight,dotForward);
      $('pk-direction').style.transform=`rotate(${angle}rad)`;
      $('pk-target-dist').textContent=dist.toFixed(0)+' m';
    }else{ $('pk-target-dist').textContent='—';$('pk-direction').style.transform='rotate(0rad)'; }
  }
}

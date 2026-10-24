import * as THREE from 'three';
import {SQUAD_START} from './squadLayout.js';
import {fallSpeed,mustDeploy,landingDamage} from './airPhysics.js';

/** Intro aérea offline. Câmara, física e pouso usam o mesmo ParkourController. */
export class AirDeployment{
  constructor(game){
    this.game=game;this.active=false;this.open=false;this.time=0;this.vy=0;
    this.rig=new THREE.Group();
    this.canopy=new THREE.Mesh(new THREE.SphereGeometry(2.5,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x1caebd,side:THREE.DoubleSide,roughness:.8,transparent:true,opacity:.90}));
    this.canopy.scale.set(1,.37,1);this.rig.add(this.canopy);
    const ropeMaterial=new THREE.LineBasicMaterial({color:0xeffcfc,transparent:true,opacity:.75});
    for(const x of [-1.8,1.8])for(const z of [-1.2,1.2]){
      const rope=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x*.08,-3.5,z*.1),new THREE.Vector3(x,-.1,z)]),ropeMaterial);this.rig.add(rope);
    }
    this.rig.visible=false;this.game.world.scene.add(this.rig);
    // Plane departing after insertion: intentionally lightweight geometry.
    this.plane=new THREE.Group();const fuselage=new THREE.MeshStandardMaterial({color:0x405662,metalness:.25,roughness:.7});
    const hull=new THREE.Mesh(new THREE.BoxGeometry(2,1.1,10),fuselage);this.plane.add(hull);
    const wing=new THREE.Mesh(new THREE.BoxGeometry(16,.24,1.75),fuselage);wing.position.z=-.5;this.plane.add(wing);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(5,.2,1.4),fuselage);tail.position.z=4.1;this.plane.add(tail);
    this.plane.visible=false;this.game.world.scene.add(this.plane);
  }
  begin(x=SQUAD_START.x,z=SQUAD_START.z){
    this.reset();const p=this.game.parkour;
    p.spawn(x,0,z);p.y=82;p.vy=-7;p.vx=0;p.vz=0;p.grounded=false;p.accumulator=0;
    this.vy=-7;this.time=0;this.active=true;this.open=false;
    this.plane.visible=true;this.plane.position.set(x,90,z+18);
    this.game.pitch=-.64;this.game.player.eyeY=p.y+1.72;this.game.positionCamera();
    document.body.classList.add('dropping');this.updateHud();
    this.game.toast('SALTO TÁTICO · ESPAÇO OU E PARA ABRIR PARAQUEDAS');
  }
  deploy(){
    if(!this.active||this.open)return false;
    this.open=true;this.rig.visible=true;this.game.toast('PARAQUEDAS ABERTO · DIRECIONE COM WASD');this.updateHud();return true;
  }
  update(dt){
    if(!this.active)return;
    const g=this.game,p=g.parkour;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;
    const feet=p.y;
    if(mustDeploy(feet,this.open))this.deploy();
    const control=p.direction();
    const horizontalSpeed=this.open?6:9;
    p.vx+=(control.x*horizontalSpeed-p.vx)*Math.min(1,dt*(this.open?1.9:1.1));
    p.vz+=(control.z*horizontalSpeed-p.vz)*Math.min(1,dt*(this.open?1.9:1.1));
    const nx=p.x+p.vx*dt,nz=p.z+p.vz*dt;
    if(g.urban.canOccupy(nx,p.z,p.y,1.8,.48))p.x=nx;else p.vx=0;
    if(g.urban.canOccupy(p.x,nz,p.y,1.8,.48))p.z=nz;else p.vz=0;
    this.vy=fallSpeed(this.vy,dt,this.open);
    const ny=feet+this.vy*dt;
    const landed=g.urban.landingAt(p.x,p.z,feet,ny);
    p.y=landed!==-Infinity?landed:Math.max(0,ny);
    p.vy=this.vy;
    g.player.x=p.x;g.player.z=p.z;g.player.eyeY=p.y+1.72;
    g.positionCamera();
    if(this.open){this.rig.position.set(p.x,p.y+5.1,p.z);this.rig.rotation.z=Math.sin(this.time*1.5)*.04;}
    if(this.plane.visible){this.plane.position.z+=28*dt;if(this.time>5)this.plane.visible=false;}
    this.updateHud();
    if(landed!==-Infinity||p.y<=0.01)this.land();
  }
  land(){
    if(!this.active)return;
    const g=this.game,p=g.parkour,impact=Math.abs(this.vy);
    this.active=false;this.open=false;this.rig.visible=false;this.plane.visible=false;
    p.vy=0;p.vx*=.55;p.vz*=.55;p.grounded=true;p.accumulator=0;p.coyote=.12;
    p.y=Math.max(0,p.y);g.player.eyeY=p.y+1.72;g.positionCamera();
    document.body.classList.remove('dropping');
    g.toast('POUSO CONCLUÍDO · PROCURE ARMAS NO SOLO');
    if(impact>17)g.takeDamage(landingDamage(impact));
  }
  updateHud(){
    if(typeof document==='undefined')return;
    const alt=document.getElementById('drop-altitude');
    const guide=document.getElementById('drop-instruction');
    if(alt)alt.textContent=`ALTITUDE ${Math.ceil(Math.max(0,this.game.parkour.y))} M · ${Math.round(Math.abs(this.vy))} M/S`;
    if(guide)guide.textContent=this.open?'PARAQUEDAS ABERTO · WASD PARA CONTROLAR':'ESPAÇO / E · ABRIR PARAQUEDAS';
  }
  reset(){this.active=false;this.open=false;this.rig.visible=false;this.plane.visible=false;document.body.classList.remove('dropping');}
}

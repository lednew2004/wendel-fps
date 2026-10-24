import * as THREE from 'three';

// A dash traverses real space in a short animation; an actual teleport blinks
// with separate departure and arrival cues. Both are visually different.
export const DASH_DURATION_MS = 340;
export const DASH_RETURN_MS = 390;
export const COMBO_WINDOW_MS = 12000;
export function motionEase(t){const x=Math.max(0,Math.min(1,t));return 1-Math.pow(1-x,2.6);}
export function motionPoint(from,to,progress){const t=motionEase(progress);return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t};}
export const isAnimatedDash=id=>['shiro_step','shiro_retreat','leo_dash'].includes(id);

export class CombatMotion {
  constructor(game){this.game=game;this.dash=null;this.fx=[];this.shake=0;}
  clear(){this.dash=null;for(const f of this.fx){this.game.world.scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();}this.fx=[];this.shake=0;}
  hasDash(){return !!this.dash;}
  startDash(from,to,{duration=DASH_DURATION_MS,color=0x5cf1ff,remote=false}={}){
    if(!remote){this.dash={from:{...from},to:{...to},elapsed:0,duration:duration/1000};this.game.parkour.spawn(from.x,from.y,from.z);}
    this.burst(from,color,.7);this.shake=Math.max(this.shake,.20);
    // The trail uses a few lightweight spheres and disappears quickly.
    for(let i=1;i<=5;i++){const q=motionPoint(from,to,i/6);this.spark(q,color,.18+i*.08,.43-i*.04);}
    this.burst(to,color,1.25);
  }
  spark(pos,color,size=.35,ttl=.34){
    if(this.fx.length>90)return;
    const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(size,0),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.70,depthWrite:false,blending:THREE.AdditiveBlending}));
    mesh.position.set(pos.x,(pos.y||0)+1.1,pos.z);mesh.rotation.set(.2,.7,.3);this.game.world.scene.add(mesh);
    this.fx.push({mesh,ttl,total:ttl,kind:'spark'});
  }
  burst(pos,color=0xae7bff,scale=1){
    if(this.fx.length>90)return;
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(scale,.075,5,28),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(pos.x,(pos.y||0)+.12,pos.z);this.game.world.scene.add(mesh);
    this.fx.push({mesh,ttl:.48,total:.48,kind:'ring'});
  }
  teleport(from,to,color=0xb77dff){
    this.burst(from,color,1.7);this.burst(to,color,2.15);
    for(let i=0;i<6;i++){const angle=i*Math.PI/3;this.spark({x:to.x+Math.cos(angle)*1.25,y:(to.y||0)+Math.sin(i*3)*.35,z:to.z+Math.sin(angle)*1.25},color,.23,.52);}
    this.shake=Math.max(this.shake,.24);
  }
  ultimate(pos,color=0xff6b7b,radius=10){
    this.burst(pos,color,radius*.35);this.burst(pos,color,radius*.7);
    for(let i=0;i<12;i++){const angle=i*Math.PI/6;this.spark({x:pos.x+Math.cos(angle)*radius*.58,y:pos.y||0,z:pos.z+Math.sin(angle)*radius*.58},color,.36,.66);}
    this.shake=Math.max(this.shake,.55);
  }
  update(dt){
    const pk=this.game.parkour;
    if(this.dash){
      const d=this.dash;d.elapsed+=dt;const q=motionPoint(d.from,d.to,d.elapsed/d.duration);
      pk.spawn(q.x,q.y,q.z);
      if(d.elapsed>=d.duration){pk.spawn(d.to.x,d.to.y,d.to.z);this.dash=null;}
    }
    if(this.shake>0)this.shake=Math.max(0,this.shake-dt*1.5);
    for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.ttl-=dt;const p=1-Math.max(0,f.ttl)/f.total;
      f.mesh.material.opacity=Math.max(0,(1-p)*.76);f.mesh.scale.setScalar(1+p*(f.kind==='ring'?2.2:.85));
      if(f.kind==='spark')f.mesh.rotation.y+=dt*5;
      if(f.ttl<=0){this.game.world.scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();this.fx.splice(i,1);}
    }
  }
}

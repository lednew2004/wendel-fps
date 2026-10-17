/** Orientação FPS é a fonte única da câmera. Sem interpolação nem retorno ao ângulo anterior. */
export class LookController {
  constructor(){this.yaw=0;this.pitch=0;this.lockedAt=0;this.armed=false;}
  reset(){this.yaw=0;this.pitch=0;this.armed=false;}
  onLock(now){this.lockedAt=now;this.armed=false;}
  move(dx,dy,sensitivity=1,now=performance.now()){
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return false;
    // O primeiro delta depois de capturar o cursor pode vir da posição antiga.
    if(!this.armed){this.armed=true;return false;}
    // Filtra saltos impossíveis, sem suavização que possa causar 'snapback'.
    if(Math.abs(dx)>350||Math.abs(dy)>350)return false;
    const s=.0021*sensitivity;
    this.yaw-=dx*s;
    this.pitch=Math.max(-1.43,Math.min(1.43,this.pitch-dy*s));
    if(Math.abs(this.yaw)>Math.PI*2)this.yaw%=Math.PI*2;
    return true;
  }
}

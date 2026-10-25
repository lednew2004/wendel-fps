/** Audio engine using decoded WAV samples with concurrency-safe polyphony.
 *  Real, CC0 sound recordings can be installed locally via npm install or npm run sfx:install.
 *  Bundled acoustic fallback WAVs work offline without Web Audio oscillator beeps.
 */
const CLIPS={
 rifle:['rifle.wav',.64],shotgun:['shotgun.wav',.83],rail:['rail.wav',.7],
 reload:['reload.wav',.57],empty:['empty.wav',.37],hit:['hit.wav',.4],kill:['kill.wav',.5],
 hurt:['hurt.wav',.53],dash:['dash.wav',.4],grenade:['grenade.wav',.7],pulse:['pulse.wav',.55],
 pickup:['pickup.wav',.5],boss:['boss.wav',.72],click:['click.wav',.38],door:['door.wav',.5]
};
export class AudioEngine{
  constructor(){this.ctx=null;this.enabled=true;this.samples=new Map();this.loading=null;this.voices=0;this.last=new Map();this.volume=.83;}
  getContext(){try{if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});return this.ctx;}catch(e){console.warn('Áudio indisponível:',e);return null;}}
  preload(){
    if(this.loading)return this.loading;const ctx=this.getContext();if(!ctx)return Promise.resolve();
    this.loading=Promise.all(Object.entries(CLIPS).map(async([name,[file]])=>{
      try{const response=await fetch('/assets/sfx/'+file,{cache:'force-cache'});if(!response.ok)throw new Error('HTTP '+response.status);
        const bytes=await response.arrayBuffer();const buffer=await ctx.decodeAudioData(bytes);this.samples.set(name,buffer);
      }catch(e){console.warn('Sem amostra sonora de',name,e.message);}
    }));return this.loading;
  }
  unlock(){const ctx=this.getContext();if(!ctx)return;ctx.resume().catch(()=>{});void this.preload();}
  play(type){
    if(!this.enabled)return;const ctx=this.getContext();if(!ctx)return;if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
    if(!this.loading)void this.preload();const spec=CLIPS[type]||CLIPS.click,buf=this.samples.get(type)||this.samples.get('click');
    if(!buf)return;
    // Caps extreme spam (overlapping bullets / impact particles), without throttling rifle fire-rate.
    const now=ctx.currentTime,last=this.last.get(type)||-1;
    if(type==='hit'&&now-last<.032)return;
    if(type==='click'&&now-last<.05)return;
    this.last.set(type,now);
    try{
      const source=ctx.createBufferSource();source.buffer=buf;
      const gain=ctx.createGain();const isWeapon=['rifle','shotgun','rail'].includes(type);
      gain.gain.value=spec[1]*this.volume*(isWeapon?.84+Math.random()*.20:1);
      source.playbackRate.value=isWeapon?.95+Math.random()*.10:1;
      if(ctx.createStereoPanner){const pan=ctx.createStereoPanner();pan.pan.value=isWeapon?(Math.random()-.5)*.1:0;source.connect(gain);gain.connect(pan);pan.connect(ctx.destination);}else{source.connect(gain);gain.connect(ctx.destination);}
      source.start();source.onended=()=>{try{source.disconnect();gain.disconnect();}catch{}};
    }catch(e){console.warn('Falha ao reproduzir amostra:',e);}
  }
}

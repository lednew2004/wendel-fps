/* Fetch genuine CC0 firearm / gun-handling recordings to override bundled
   offline acoustic WAV effects. Never makes npm install fail if the network is blocked. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const TARGET=path.resolve('public/assets/sfx');
const SOURCES=[
 {target:'rifle.wav',url:'https://opengameart.org/sites/default/files/22%20Pistol.wav',trim:.32},
 {target:'shotgun.wav',url:'https://opengameart.org/sites/default/files/Black%20Powder.wav',trim:.65},
 {target:'rail.wav',url:'https://opengameart.org/sites/default/files/22%20Magnum.wav',trim:.40},
 {target:'reload.wav',url:'https://opengameart.org/sites/default/files/assaultriflereload1_0.wav',trim:1.30},
 {target:'door.wav',url:'https://opengameart.org/sites/default/files/shotguncock_0.wav',trim:.60}
];
// Preserve source as WAV when unable to parse (but never replace fallback with invalid data).
function trimWave(data,seconds){
 if(data.length<60||data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE')throw Error('Invalid WAV');
 let pos=12,fmt=null,bytes=null;
 while(pos+8<=data.length){const name=data.toString('ascii',pos,pos+4),len=data.readUInt32LE(pos+4),off=pos+8;
   if(name==='fmt ')fmt={format:data.readUInt16LE(off),channels:data.readUInt16LE(off+2),rate:data.readUInt32LE(off+4),bits:data.readUInt16LE(off+14)};
   if(name==='data')bytes=data.subarray(off,Math.min(off+len,data.length));pos=off+len+(len%2);
 }
 if(!fmt||!bytes||![1,3].includes(fmt.format)||![16,24,32].includes(fmt.bits))throw Error('WAV encoding unsupported');
 const stride=fmt.bits/8*fmt.channels,frames=Math.floor(bytes.length/stride),rate=fmt.rate;
 if(frames<300)return data;
 const n=Math.min(frames,Math.floor(rate*Math.min(seconds,3)));
 const samples=new Float32Array(frames);
 for(let i=0;i<frames;i++){
   let sum=0;for(let j=0;j<fmt.channels;j++){
     const p=i*stride+j*(fmt.bits/8);
     if(fmt.format===3)sum+=bytes.readFloatLE(p);
     else if(fmt.bits===16)sum+=bytes.readInt16LE(p)/32768;
     else if(fmt.bits===24){let v=bytes[p]|bytes[p+1]<<8|bytes[p+2]<<16;if(v&0x800000)v|=~0xffffff;sum+=v/8388608;}
     else sum+=bytes.readInt32LE(p)/2147483648;
   }samples[i]=sum/fmt.channels;
 }
 // Locate an onset by short-window energy, avoiding the ambient pre-roll of field recordings.
 const win=Math.max(1,Math.floor(rate*.012));let best=0,bestE=0;
 for(let i=0;i<frames;i+=win){let e=0;for(let j=i;j<Math.min(i+win,frames);j++)e+=samples[j]*samples[j];if(e>bestE){bestE=e;best=i;}}
 const begin=Math.max(0,Math.min(frames-n,best-Math.floor(rate*.012)));
 const out=Buffer.alloc(44+n*2);out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(n*2,40);
 let peak=.02;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(samples[begin+i]));const gain=Math.min(3,.88/peak);
 for(let i=0;i<n;i++){
  const fi=Math.min(1,i/Math.max(1,rate*.005)),fo=Math.min(1,(n-1-i)/Math.max(1,rate*.04));
  const v=Math.max(-1,Math.min(1,samples[begin+i]*gain*fi*fo));out.writeInt16LE(Math.round(v*32767),44+i*2);
 }return out;
}
await mkdir(TARGET,{recursive:true});
const downloads=await Promise.allSettled(SOURCES.map(async(s)=>{
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
 try{const r=await fetch(s.url,{signal:ctrl.signal,headers:{'User-Agent':'TitanProtocolGame/4.8.4 (CC0 audio downloader)'}});if(!r.ok)throw Error('HTTP '+r.status);const data=Buffer.from(await r.arrayBuffer());const wav=trimWave(data,s.trim);await writeFile(path.join(TARGET,s.target),wav);console.log(`SFX real: ${s.target} (${(wav.length/1024).toFixed(0)} KB)`);return s.target;
 }finally{clearTimeout(timeout);}
}));
let good=0;for(let i=0;i<downloads.length;i++){const d=downloads[i];if(d.status==='fulfilled')good++;else console.warn('SFX mantendo reserva:',SOURCES[i].target,'-',d.reason?.message||'sem conexão');}
console.log(`${good}/${SOURCES.length} gravações CC0 instaladas. Sons locais de reserva preservados.`);

import * as THREE from 'three';

import {BLOCK_SIZE,FORGE_LIMIT,FORGE_LIFETIME,FORGE_RANGE,snapVoxel,validVoxelPlacement,blockCollider} from './voxelRules.js';
export class VoxelForge{
 constructor(game){this.game=game;this.blocks=[];this.readyAt=0;this.buildUntil=0;this.ultimateUntil=0;this.serial=0;this.preview=null;this.previewAt=0;this.selectedMaterial='stone';this.ui=null;this.materialMaps={};
   this.geometry=new THREE.BoxGeometry(BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
   this.materials={plain:new THREE.MeshStandardMaterial({color:0x57cadf,map:this.voxelTexture(false),roughness:.72,metalness:.08,emissive:0x0e3844,emissiveIntensity:.24}),armed:new THREE.MeshStandardMaterial({color:0xffbe62,map:this.voxelTexture(true),roughness:.64,metalness:.08,emissive:0xb23607,emissiveIntensity:.46})};
   this.createPreview();this.mountPalette();
 }
 voxelTexture(explosive){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle=explosive?'#c66832':'#267c92';ctx.fillRect(0,0,64,64);
   for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){const t=(x*7+y*13)%5;ctx.fillStyle=explosive?['#e58c41','#d17336','#f09a4b','#a94924','#f7a852'][t]:['#49a5b1','#3d92a9','#69b8c2','#2d829b','#5fb1bd'][t];ctx.fillRect(x+1,y+1,14,14);}
   ctx.strokeStyle=explosive?'#ffdb7f':'#a2f1dc';ctx.lineWidth=2;ctx.strokeRect(2,2,60,60);
   if(explosive){ctx.fillStyle='#411710';ctx.font='bold 35px monospace';ctx.textAlign='center';ctx.fillText('✹',32,44);}
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestMipmapLinearFilter;texture.anisotropy=1;return texture;
 }
 createPreview(){this.preview=new THREE.Mesh(this.geometry,new THREE.MeshBasicMaterial({color:0x62fff0,transparent:true,opacity:.27,depthWrite:false,wireframe:true}));this.preview.visible=false;this.game.world.scene.add(this.preview);}
 get active(){return this.game.heroSelection.selectedHero==='forge'&&(Date.now()<this.buildUntil||Date.now()<this.ultimateUntil);}
 get isUltimate(){return Date.now()<this.ultimateUntil;}
 enable(duration=12000,ultimate=false){if(ultimate)this.ultimateUntil=Date.now()+duration;else this.buildUntil=Date.now()+duration;this.readyAt=0;}
 disable(){this.buildUntil=0;this.ultimateUntil=0;if(this.preview)this.preview.visible=false;this.updatePalette();}
 clear(){for(const b of [...this.blocks])this.remove(b.id);this.disable();}
 // Only this class owns removable voxel colliders; rebuild to avoid leaving invisible walls.
 syncColliders(){const city=this.game.urban;city.solids=city.solids.filter(s=>!s.forgeBlock);city.surfaces=city.surfaces.filter(s=>!s.forgeBlock);for(const b of this.blocks){city.solids.push({...blockCollider(b),forgeBlock:true});city.surfaces.push({x:b.x,z:b.z,hx:BLOCK_SIZE/2,hz:BLOCK_SIZE/2,y:b.y+BLOCK_SIZE/2,forgeBlock:true});}}
 remove(id){const i=this.blocks.findIndex(b=>b.id===id);if(i===-1)return;const [b]=this.blocks.splice(i,1);this.game.world.scene.remove(b.mesh);b.mesh.material.dispose();this.syncColliders();}
 spawn(data){if(!data||this.blocks.some(b=>b.id===data.id))return;const {x,y,z}=data;const mesh=new THREE.Mesh(this.geometry,this.materials[data.armed?'armed':'plain'].clone());mesh.position.set(x,y,z);this.decorateMaterial(mesh,data.material||'stone',data.armed);mesh.castShadow=this.game.world.quality!=='low';mesh.receiveShadow=true;this.game.world.scene.add(mesh);this.blocks.push({...data,mesh,until:data.until||Date.now()+FORGE_LIFETIME});mesh.userData.voxelId=data.id;this.syncColliders();}
 materialTexture(type){
   if(this.materialMaps[type])return this.materialMaps[type];
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
   const ctx=canvas.getContext('2d');
   const base={stone:'#89959a',wood:'#a47b47',metal:'#718d9b',glass:'#c1e6fa',tnt:'#b84436',plant:'#49884a'}[type]||'#89959a';
   ctx.fillStyle=base;ctx.fillRect(0,0,64,64);
   // Deterministic pixel-art; no dependency on downloaded textures.
   const rnd=(x,y)=>((x*137+y*71+(x^y)*13)%101+101)%101;
   for(let y=0;y<64;y+=8)for(let x=0;x<64;x+=8){
     const n=rnd(x,y);
     if(type==='stone'){ctx.fillStyle=n>45?'#a1a9aa':'#69767a';ctx.globalAlpha=.43;ctx.fillRect(x+1,y+1,7,7);}
     if(type==='wood'){ctx.fillStyle=n>45?'#d5a568':'#79542d';ctx.globalAlpha=.43;ctx.fillRect(x,y+1,8,3);}
     if(type==='plant'){ctx.fillStyle=n>45?'#79be63':'#285e39';ctx.globalAlpha=.7;ctx.fillRect(x+1,y+1,6,6);}
     if(type==='metal'){ctx.fillStyle=n>55?'#afcbd4':'#486474';ctx.globalAlpha=.38;ctx.fillRect(x+1,y+1,6,6);}
   }
   ctx.globalAlpha=1;ctx.lineWidth=2;
   if(type==='wood'){ctx.strokeStyle='#684522';for(let y=0;y<64;y+=16){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(64,y+.5);ctx.stroke();ctx.fillStyle='#e9bd7b';ctx.fillRect((y*3)%51+5,y+6,3,3);}}
   if(type==='stone'){ctx.strokeStyle='#57646a';for(let y=0;y<64;y+=16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(64,y);ctx.stroke();for(let x=(y%32?8:0);x<64;x+=24){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+16);ctx.stroke();}}}
   if(type==='metal'){ctx.strokeStyle='#425866';ctx.strokeRect(2,2,60,60);ctx.beginPath();ctx.moveTo(32,2);ctx.lineTo(32,62);ctx.moveTo(2,32);ctx.lineTo(62,32);ctx.stroke();ctx.fillStyle='#d4e1e6';for(const x of [6,58])for(const y of [6,58])ctx.fillRect(x-2,y-2,4,4);}
   if(type==='glass'){ctx.strokeStyle='#79c9ed';ctx.strokeRect(2,2,60,60);ctx.beginPath();ctx.moveTo(32,0);ctx.lineTo(32,64);ctx.moveTo(0,32);ctx.lineTo(64,32);ctx.stroke();ctx.fillStyle='#ffffff';ctx.globalAlpha=.52;ctx.fillRect(10,8,9,34);ctx.globalAlpha=1;}
   if(type==='tnt'){ctx.fillStyle='#f6e7cf';ctx.fillRect(2,23,60,20);ctx.fillStyle='#6d1417';ctx.font='bold 19px monospace';ctx.textAlign='center';ctx.fillText('TNT',32,40);ctx.strokeStyle='#661c23';ctx.strokeRect(2,2,60,60);}
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipmapLinearFilter;
   return this.materialMaps[type]=tex;
 }
 decorateMaterial(mesh,type='stone',armed=false){if(armed)return;const properties={stone:[0x8a969a,.89,.03],wood:[0xba8d52,.92,.02],metal:[0x8dabb7,.38,.72],glass:[0x9ac9e4,.2,.11],tnt:[0xe66a48,.65,.08],plant:[0x63ad61,.91,.02]};const [color,roughness,metalness]=properties[type]||properties.stone;mesh.material.color.setHex(0xffffff);mesh.material.map=this.materialTexture(type);mesh.material.roughness=roughness;mesh.material.metalness=metalness;mesh.material.needsUpdate=true;mesh.material.transparent=type==='glass';mesh.material.opacity=type==='glass'?.55:1;mesh.material.depthWrite=type!=='glass';}
 mountPalette(){if(typeof document==='undefined'||!document.body)return;const hud=document.createElement('div');hud.id='forge-manual-tools';hud.setAttribute('role','group');hud.setAttribute('aria-label','Construção manual FORGE');hud.innerHTML='<div class="forge-tools-heading">FORGE · CRIAR BLOCO A BLOCO</div><div class="forge-materials"></div><div class="forge-actions"><button type="button" data-forge-action="place">▣ COLOCAR</button><button type="button" data-forge-action="break">⌫ REMOVER</button><button type="button" data-forge-action="exit">✕ SAIR</button></div>';document.body.append(hud);this.ui=hud;const names={stone:'PEDRA',wood:'MADEIRA',metal:'METAL',glass:'VIDRO',tnt:'TNT',plant:'FOLHAS'};for(const [key,label] of Object.entries(names)){const b=document.createElement('button');b.type='button';b.dataset.forgeMaterial=key;b.textContent=label;b.addEventListener('pointerdown',e=>{e.stopPropagation();});b.addEventListener('click',e=>{e.stopPropagation();this.selectedMaterial=key;this.updatePalette();});hud.querySelector('.forge-materials').append(b);}for(const b of hud.querySelectorAll('[data-forge-action]')){b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(b.dataset.forgeAction==='place')this.place();if(b.dataset.forgeAction==='break')this.breakAimed();if(b.dataset.forgeAction==='exit')this.disable();});}this.updatePalette();}
 updatePalette(){if(!this.ui)return;this.ui.classList.toggle('forge-tools-visible',!!this.active&&this.game.state==='playing');for(const btn of this.ui.querySelectorAll('[data-forge-material]')){btn.classList.toggle('selected',btn.dataset.forgeMaterial===this.selectedMaterial);btn.setAttribute('aria-pressed',String(btn.dataset.forgeMaterial===this.selectedMaterial));}}
 breakAimed(){if(!this.active)return false;const g=this.game;const origin=new THREE.Vector3(),dir=new THREE.Vector3();g.world.camera.getWorldPosition(origin);g.world.camera.getWorldDirection(dir);const ray=new THREE.Raycaster(origin,dir,.05,FORGE_RANGE+2);const hit=ray.intersectObjects(this.blocks.map(b=>b.mesh),false)[0];if(!hit){g.toast('MIRE EM UM BLOCO PARA REMOVER');return false;}const block=this.blocks.find(b=>b.id===hit.object.userData.voxelId);if(!block||block.owner!==(g.mode==='multiplayer'?g.multiplayer.id:'local')){g.toast('SÓ É POSSÍVEL REMOVER SEUS BLOCOS');return false;}if(g.mode==='multiplayer')g.multiplayer.send({type:'builder-remove',id:block.id});else this.remove(block.id);return true;}
 disarm(id){const b=this.blocks.find(b=>b.id===id);if(!b)return false;b.armed=false;b.mesh.material.dispose();b.mesh.material=this.materials.plain.clone();this.decorateMaterial(b.mesh,b.material,false);return true;}
 arm(owner){let count=0;for(const b of this.blocks)if(b.owner===owner){b.armed=true;b.mesh.material.color.setHex(0xffbe62);b.mesh.material.map=this.materials.armed.map;b.mesh.material.transparent=false;b.mesh.material.opacity=1;b.mesh.material.depthWrite=true;b.mesh.material.emissive.setHex(0xaa300c);b.mesh.material.needsUpdate=true;count++;}return count;}
 aim(){const g=this.game,origin=new THREE.Vector3(),dir=new THREE.Vector3();g.world.camera.getWorldPosition(origin);g.world.camera.getWorldDirection(dir);
   const ray=new THREE.Raycaster(origin,dir,.1,FORGE_RANGE+1);
   const hits=ray.intersectObjects([...this.blocks.map(b=>b.mesh),...g.urban.rayTargets],true);
   let spot;
   if(hits.length){const h=hits[0];const norm=h.face?.normal?.clone().transformDirection(h.object.matrixWorld)||new THREE.Vector3(0,1,0);spot=h.point.clone().addScaledVector(norm,BLOCK_SIZE*.59);}
   else{const t=dir.y<-.12?Math.min(FORGE_RANGE,(.05-origin.y)/dir.y):Math.min(FORGE_RANGE,6);spot=origin.clone().addScaledVector(dir,Math.max(2,t));}
   return {x:snapVoxel(spot.x),y:snapVoxel(Math.max(.9,spot.y)),z:snapVoxel(spot.z)};
 }
 place(){if(!this.active||Date.now()<this.readyAt)return false;
  const pos=this.aim(),g=this.game,owner=g.mode==='multiplayer'?g.multiplayer.id:'local';
  if(!validVoxelPlacement(pos,g.parkour,this.blocks,g.urban.solids.filter(s=>!s.forgeBlock))){g.toast('BLOCO BLOQUEADO · MIRE PARA OUTRA SUPERFÍCIE');this.readyAt=Date.now()+400;return false;}
  this.readyAt=Date.now()+(this.isUltimate?130:220);
  if(g.mode==='multiplayer'){g.multiplayer.send({type:'builder-place',pos,material:this.selectedMaterial});return true;}
  const own=this.blocks.filter(b=>b.owner==='local');if(own.length>=(g.mode==='survival'?160:FORGE_LIMIT+(this.isUltimate?24:0)))this.remove(own[0].id);
  this.spawn({...pos,id:'local-'+(++this.serial),owner,material:this.selectedMaterial,armed:false,until:g.mode==='survival'?Date.now()+3600000:Date.now()+FORGE_LIFETIME});return true;
 }
 hitFromShot(origin,dir,damage,commit=false){const ray=new THREE.Raycaster(origin,dir,.08,170);const hits=ray.intersectObjects(this.blocks.map(b=>b.mesh),false);if(!hits.length)return null;const hit=hits[0],b=this.blocks.find(b=>b.id===hit.object.userData.voxelId);if(!b)return null;
   if(this.game.mode!=='multiplayer'&&commit){b.hp=(b.hp??(b.armed?1:3))-1;if(b.hp<=0){if(b.armed)this.detonate(b.id);else this.remove(b.id);}}
   return {point:hit.point,distance:hit.distance,hit:true,killed:false};
 }
 detonate(id){const start=this.blocks.find(b=>b.id===id);if(!start)return;const queue=[start],done=new Set();while(queue.length&&done.size<14){const b=queue.shift();if(done.has(b.id))continue;done.add(b.id);if(b.armed){for(const other of this.blocks)if(other.armed&&!done.has(other.id)&&Math.hypot(other.x-b.x,other.z-b.z,other.y-b.y)<4.8)queue.push(other);}
  if(this.game.mode!=='multiplayer'){for(const e of [...this.game.enemies.enemies])if(Math.hypot(e.x-b.x,e.z-b.z)<5)this.game.enemies.damage(e,Math.max(12,75*(1-Math.hypot(e.x-b.x,e.z-b.z)/6)),new THREE.Vector3(e.x,e.y,e.z),'pulse');}
  this.game.enemies.spawnParticles(new THREE.Vector3(b.x,b.y,b.z),0xffb35b,18,1.3);this.remove(b.id);
 }}
 update(){const t=Date.now();for(const b of [...this.blocks])if(b.until<t)this.remove(b.id);this.updatePalette();if(this.preview){this.preview.visible=this.active&&this.game.state==='playing';if(this.preview.visible&&t>=this.previewAt){this.previewAt=t+90;const p=this.aim(),g=this.game;this.preview.position.set(p.x,p.y,p.z);this.preview.material.color.setHex(validVoxelPlacement(p,g.parkour,this.blocks,g.urban.solids.filter(s=>!s.forgeBlock))?({stone:0x9aa8ae,wood:0xcaa06a,metal:0x9cb5c4,glass:0x79d6fc,tnt:0xff985c,plant:0x72ef8a}[this.selectedMaterial]||0x62fff0):0xff5959);}}}
}

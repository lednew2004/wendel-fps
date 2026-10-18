import * as THREE from 'three';

import {BLOCK_SIZE,FORGE_LIMIT,FORGE_LIFETIME,FORGE_RANGE,snapVoxel,validVoxelPlacement,blockCollider} from './voxelRules.js';
export class VoxelForge{
 constructor(game){this.game=game;this.blocks=[];this.readyAt=0;this.buildUntil=0;this.ultimateUntil=0;this.serial=0;this.preview=null;this.previewAt=0;
   this.geometry=new THREE.BoxGeometry(BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
   this.materials={plain:new THREE.MeshStandardMaterial({color:0x57cadf,map:this.voxelTexture(false),roughness:.72,metalness:.08,emissive:0x0e3844,emissiveIntensity:.24}),armed:new THREE.MeshStandardMaterial({color:0xffbe62,map:this.voxelTexture(true),roughness:.64,metalness:.08,emissive:0xb23607,emissiveIntensity:.46})};
   this.createPreview();
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
 clear(){for(const b of [...this.blocks])this.remove(b.id);this.buildUntil=0;this.ultimateUntil=0;this.preview.visible=false;}
 // Only this class owns removable voxel colliders; rebuild to avoid leaving invisible walls.
 syncColliders(){const city=this.game.urban;city.solids=city.solids.filter(s=>!s.forgeBlock);city.surfaces=city.surfaces.filter(s=>!s.forgeBlock);for(const b of this.blocks){city.solids.push({...blockCollider(b),forgeBlock:true});city.surfaces.push({x:b.x,z:b.z,hx:BLOCK_SIZE/2,hz:BLOCK_SIZE/2,y:b.y+BLOCK_SIZE/2,forgeBlock:true});}}
 remove(id){const i=this.blocks.findIndex(b=>b.id===id);if(i===-1)return;const [b]=this.blocks.splice(i,1);this.game.world.scene.remove(b.mesh);b.mesh.material.dispose();this.syncColliders();}
 spawn(data){if(!data||this.blocks.some(b=>b.id===data.id))return;const {x,y,z}=data;const mesh=new THREE.Mesh(this.geometry,this.materials[data.armed?'armed':'plain'].clone());mesh.position.set(x,y,z);mesh.castShadow=this.game.world.quality!=='low';mesh.receiveShadow=true;this.game.world.scene.add(mesh);this.blocks.push({...data,mesh,until:data.until||Date.now()+FORGE_LIFETIME});mesh.userData.voxelId=data.id;this.syncColliders();}
 arm(owner){let count=0;for(const b of this.blocks)if(b.owner===owner){b.armed=true;b.mesh.material.color.setHex(0xffbe62);b.mesh.material.map=this.materials.armed.map;b.mesh.material.emissive.setHex(0xaa300c);b.mesh.material.needsUpdate=true;count++;}return count;}
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
  if(g.mode==='multiplayer'){g.multiplayer.send({type:'builder-place',pos});return true;}
  const own=this.blocks.filter(b=>b.owner==='local');if(own.length>=FORGE_LIMIT+(this.isUltimate?24:0))this.remove(own[0].id);
  this.spawn({...pos,id:'local-'+(++this.serial),owner,armed:false,until:Date.now()+FORGE_LIFETIME});return true;
 }
 hitFromShot(origin,dir,damage,commit=false){const ray=new THREE.Raycaster(origin,dir,.08,170);const hits=ray.intersectObjects(this.blocks.map(b=>b.mesh),false);if(!hits.length)return null;const hit=hits[0],b=this.blocks.find(b=>b.id===hit.object.userData.voxelId);if(!b)return null;
   if(this.game.mode!=='multiplayer'&&commit){b.hp=(b.hp??(b.armed?1:3))-1;if(b.hp<=0){if(b.armed)this.detonate(b.id);else this.remove(b.id);}}
   return {point:hit.point,distance:hit.distance,hit:true,killed:false};
 }
 detonate(id){const start=this.blocks.find(b=>b.id===id);if(!start)return;const queue=[start],done=new Set();while(queue.length&&done.size<14){const b=queue.shift();if(done.has(b.id))continue;done.add(b.id);if(b.armed){for(const other of this.blocks)if(other.armed&&!done.has(other.id)&&Math.hypot(other.x-b.x,other.z-b.z,other.y-b.y)<4.8)queue.push(other);}
  if(this.game.mode!=='multiplayer'){for(const e of [...this.game.enemies.enemies])if(Math.hypot(e.x-b.x,e.z-b.z)<5)this.game.enemies.damage(e,Math.max(12,75*(1-Math.hypot(e.x-b.x,e.z-b.z)/6)),new THREE.Vector3(e.x,e.y,e.z),'pulse');}
  this.game.enemies.spawnParticles(new THREE.Vector3(b.x,b.y,b.z),0xffb35b,18,1.3);this.remove(b.id);
 }}
 update(){const t=Date.now();for(const b of [...this.blocks])if(b.until<t)this.remove(b.id);if(this.preview){this.preview.visible=this.active&&this.game.state==='playing';if(this.preview.visible&&t>=this.previewAt){this.previewAt=t+90;const p=this.aim(),g=this.game;this.preview.position.set(p.x,p.y,p.z);this.preview.material.color.setHex(validVoxelPlacement(p,g.parkour,this.blocks,g.urban.solids.filter(s=>!s.forgeBlock))?0x62fff0:0xff5959);}}}
}

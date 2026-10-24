import * as THREE from 'three';
import {projectGeo,geoPolyline,nearPolyline,nearestRoadPoint} from './geoProjection.js';
import {tileBounds} from './geoVectorParser.js';

const makeMat=color=>new THREE.MeshStandardMaterial({color,roughness:.86,metalness:.08});
const bannedRoads=new Set(['footway','cycleway','path','steps','bridleway','pedestrian','corridor','construction','proposed']);
function roadWidth(kind){if(['motorway','trunk'].includes(kind))return 12;if(['primary','secondary'].includes(kind))return 10;if(['tertiary','residential','unclassified'].includes(kind))return 7;if(['service','living_street'].includes(kind))return 4.6;return 2.8;}
/** Actual OpenStreetMap street alignments and building footprints, rendered using the game's visual style.
 * Offline exploration only: the online server still uses its own authoritative tactical map.
 */
export class GeoCity {
  constructor(world,data,userLocation){
    this.isGeoCity=true;this.world=world;this.root=new THREE.Group();this.root.name='REAL_OSM_CITY';world.scene.add(this.root);
    this.center=data.center;this.cityName=data.city;this.solids=[];this.surfaces=[];this.ladders=[];this.lowWalls=[];this.courses=[];this.rayTargets=[];this.spawnPoints=[];this.polygons=[];
    this.visibilityRadius=245;
    const terrain=new THREE.Mesh(new THREE.PlaneGeometry(512,512),makeMat(0x899a91));terrain.rotation.x=-Math.PI/2;terrain.position.y=-.023;terrain.receiveShadow=true;this.root.add(terrain);
    if(data.rasterOnly){
      // Emergency map mode: authentic OSM streets are drawn on the ground in geographic positions.
      // No made-up building footprints or road geometry are substituted.
      for(const tile of data.rasterTiles){
        const b=tileBounds(tile.z,tile.x,tile.y);
        const nw=projectGeo(b.north,b.west,this.center),se=projectGeo(b.south,b.east,this.center);
        const texture=new THREE.Texture(tile.image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
        const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
        const segment=new THREE.Mesh(new THREE.PlaneGeometry(se.x-nw.x,se.z-nw.z),mat);
        segment.rotation.x=-Math.PI/2;segment.position.set((nw.x+se.x)/2,.012,(nw.z+se.z)/2);
        this.root.add(segment);
      }
    }
    const roadMat=makeMat(0x444654),walkMat=makeMat(0x7d818c),parkMat=makeMat(0x608a68);
    const facades=[0x413950,0x5c526d,0x6d647c,0x68738f,0x9b859a,0x514f61,0x826f92].map(makeMat);
    const roof=makeMat(0x403a51);
    const urbanPoints=[],streetLabels=new Map(),roadInstances={road:[],walk:[]};
    let roads=[];
    for(const feature of data.roads){
      const poly=geoPolyline(feature.points,this.center);
      if(poly.length<2)continue;
      if(poly.every(p=>Math.abs(p.x)>245||Math.abs(p.z)>245))continue;
      const width=roadWidth(feature.class),roadKind=bannedRoads.has(feature.class)?walkMat:roadMat;
      for(let i=1;i<poly.length;i++){
        const a=poly[i-1],b=poly[i],len=Math.hypot(b.x-a.x,b.z-a.z);
        if(len<.3||len>400)continue;
        const group=roadKind===walkMat?'walk':'road';
        roadInstances[group].push({x:(a.x+b.x)/2,z:(a.z+b.z)/2,width,len,angle:-Math.atan2(b.x-a.x,b.z-a.z)});
      }
      if(!bannedRoads.has(feature.class)){roads.push(poly);urbanPoints.push(...poly);}
      if(feature.name&&poly.length>1&&!streetLabels.has(feature.name)&&streetLabels.size<16){
        const mid=poly[Math.floor(poly.length/2)];
        if(Math.abs(mid.x)<190&&Math.abs(mid.z)<190)streetLabels.set(feature.name,mid);
      }
    }
    // One draw call per road category (instanced), instead of thousands of draw calls per street segment.
    const plane=new THREE.PlaneGeometry(1,1),dummy=new THREE.Object3D();
    for(const [kind,material] of [['road',roadMat],['walk',walkMat]]){
      const pieces=roadInstances[kind];if(!pieces.length)continue;
      const mesh=new THREE.InstancedMesh(plane,material,pieces.length);
      for(let i=0;i<pieces.length;i++){
        const segment=pieces[i];dummy.position.set(segment.x,.019,segment.z);
        dummy.rotation.set(-Math.PI/2,0,segment.angle);dummy.scale.set(segment.width,segment.len,1);dummy.updateMatrix();
        mesh.setMatrixAt(i,dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.receiveShadow=true;this.root.add(mesh);
    }
    for(const feature of data.parks){
      const polygon=geoPolyline(feature.points,this.center);
      if(polygon.length<3)continue;
      const s=new THREE.Shape();polygon.forEach((pt,i)=>(i?s.lineTo(pt.x,-pt.z):s.moveTo(pt.x,-pt.z)));
      const mesh=new THREE.Mesh(new THREE.ShapeGeometry(s),parkMat);mesh.rotation.x=-Math.PI/2;mesh.position.y=.026;this.root.add(mesh);
    }
    for(let i=0;i<data.buildings.length;i++){
      const feature=data.buildings[i],polygon=geoPolyline(feature.points,this.center);
      if(polygon.length<4)continue;
      const xs=polygon.map(p=>p.x),zs=polygon.map(p=>p.z);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
      if(minX < -255||maxX > 255||minZ < -255||maxZ > 255||maxX-minX<1.4||maxZ-minZ<1.4)continue;
      const height=Math.max(3,Math.min(100,feature.height||feature.levels*3||((i%5)+1)*3.2));
      const shape=new THREE.Shape();polygon.forEach((pt,i)=>(i?shape.lineTo(pt.x,-pt.z):shape.moveTo(pt.x,-pt.z)));
      const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:1,steps:1});geo.rotateX(-Math.PI/2);
      const mesh=new THREE.Mesh(geo,facades[i%facades.length]);mesh.castShadow=false;mesh.receiveShadow=true;this.root.add(mesh);this.rayTargets.push(mesh);
      const collider={x:(minX+maxX)/2,z:(minZ+maxZ)/2,hx:(maxX-minX)/2,hz:(maxZ-minZ)/2,minY:0,maxY:height};
      this.solids.push(collider);this.polygons.push({collider,polygon});
      const top=new THREE.Mesh(new THREE.ShapeGeometry(shape),roof);top.rotation.x=-Math.PI/2;top.position.y=height+.006;this.root.add(top);
      // Roofing is visual only. Rectangular roof walking would otherwise extend outside complex footprints.
    }
    // Signs carry actual street names from OSM, so the setting is recognizable even with original game graphics.
    for(const [name,p] of streetLabels){
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=120;
      const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(26,20,39,.89)';ctx.fillRect(0,0,640,120);
      ctx.strokeStyle='#ae86ec';ctx.strokeRect(4,4,632,112);
      ctx.fillStyle='#f9f5ff';ctx.font='bold 38px Arial';ctx.textAlign='center';ctx.fillText(name,320,76,600);
      const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
      sprite.position.set(p.x,5.2,p.z);sprite.scale.set(12,2.2,1);this.root.add(sprite);
    }
    if(roads.length===0&&!data.rasterOnly)throw new Error('Não há ruas mapeadas nesta região.');
    const gps=projectGeo(userLocation.lat,userLocation.lon,this.center);
    const near=roads.length?nearestRoadPoint(gps,roads):gps;
    this.entry=this.findFreeNear(near.x,near.z)||this.findFreeNear(0,0)||{x:0,z:0};
    const candidate=[];
    for(const p of urbanPoints){
      if(Math.abs(p.x)>225||Math.abs(p.z)>225||Math.hypot(p.x-this.entry.x,p.z-this.entry.z)<35)continue;
      if(this.canOccupy(p.x,p.z,0,2.2,1.5))candidate.push([p.x,p.z]);
    }
    candidate.sort((a,b)=>Math.hypot(a[0]-this.entry.x,a[1]-this.entry.z)-Math.hypot(b[0]-this.entry.x,b[1]-this.entry.z));
    const seen=[];for(const p of candidate){if(seen.every(v=>Math.hypot(v[0]-p[0],v[1]-p[1])>25))seen.push(p);if(seen.length>=24)break;}
    // Raster mode is still tied to true map coordinates, but individual road footprints are unavailable.
    if(data.rasterOnly){
      this.spawnPoints=Array.from({length:16},(_,i)=>{const a=i*Math.PI*2/16,d=55+(i%4)*32;return [Math.max(-222,Math.min(222,this.entry.x+Math.cos(a)*d)),Math.max(-222,Math.min(222,this.entry.z+Math.sin(a)*d))];});
    }else this.spawnPoints=seen.length?seen:[[this.entry.x+35,this.entry.z+35]];
  }
  findFreeNear(x,z){
    for(let d=0;d<38;d+=2.5)for(let a=0;a<16;a++){
      const px=x+Math.cos(a*Math.PI/8)*d,pz=z+Math.sin(a*Math.PI/8)*d;
      if(this.canOccupy(px,pz,0,1.9,.65))return {x:px,z:pz};
    }
    return null;
  }
  canOccupy(x,z,feet=0,height=1.77,r=.48){
    if(Math.abs(x)>248-r||Math.abs(z)>248-r||feet<-.3)return false;
    for(const b of this.polygons){
      const c=b.collider;
      if(x+r<c.x-c.hx||x-r>c.x+c.hx||z+r<c.z-c.hz||z-r>c.z+c.hz||feet>=c.maxY-.09||feet+height<=c.minY+.1)continue;
      if(nearPolyline(x,z,b.polygon,r))return false;
    }
    return true;
  }
  floorAt(){return 0;}
  landingAt(x,z,prev,next){return next<=0&&prev>=-.1?0:-Infinity;}
  getWalkable(){return [];}
  wallNear(){return null;}
  nearestInteractable(){return null;}
  toggleInteractable(){return false;}
  resetInteractions(){}
  animateEnvironment(){}
  nearestLadder(){return null;}
  setRouteActive(){}
  updateVisibility(){}
  toggle(on){this.root.visible=!!on;}
  dispose(){
    this.root.traverse(obj=>{if(obj.isMesh){obj.geometry?.dispose?.();if(obj.material?.map)obj.material.map.dispose();if(obj.material?.dispose)obj.material.dispose();}});
    this.world.scene.remove(this.root);
  }
}

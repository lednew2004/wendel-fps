import * as THREE from 'three';
import {GeoCity} from './geoCity.js';
import {projectGeo,unprojectGeo} from './geoProjection.js';
import {geoCacheKey} from './geoFallback.js';

/** A sliding window of real OSM sectors. All local coordinates are anchored
 * to the player's original position; walking never teleports the camera.
 * Sectors outside the window are evicted to bound Three.js GPU memory.
 */
export class GeoCityStream {
  constructor(world,data,location,loadSector,onStatus=()=>{}){
    this.isGeoCity=true;this.world=world;this.origin={...data.center};this.center=this.origin;
    this.cityName=data.city;this.loadSector=loadSector;this.onStatus=onStatus;
    this.root=new THREE.Group();this.root.name='OSM_STREAMED_CITY';world.scene.add(this.root);
    this.sectors=new Map();this.loading=null;this.lastErrorAt=0;this.streetName='RUA SEM NOME CADASTRADO';
    this.loadedCount=0;this.rayTargets=[];this.solids=[];this.ladders=[];this.lowWalls=[];this.courses=[];this.spawnPoints=[];
    this.install(data,true,location);
  }
  install(data,first=false,location=data.center){
    const key=geoCacheKey(data.center.lat,data.center.lon);
    if(this.sectors.has(key))return false;
    const city=new GeoCity(this.world,data,location);
    const offset=projectGeo(data.center.lat,data.center.lon,this.origin);
    this.root.add(city.root);city.root.position.set(offset.x,0,offset.z);
    this.sectors.set(key,{city,offset,data,when:Date.now()});
    if(first){this.entry={x:city.entry.x+offset.x,z:city.entry.z+offset.z};}
    this.prune(this.lastX||this.entry.x,this.lastZ||this.entry.z);
    this.reindex();this.loadedCount=this.sectors.size;
    return true;
  }
  prune(x,z){
    const all=[...this.sectors.values()].sort((a,b)=>
      Math.hypot(a.offset.x-x,a.offset.z-z)-Math.hypot(b.offset.x-x,b.offset.z-z));
    // At most six adjacent sectors, each of which may have many buildings.
    for(const section of all.slice(6)){
      this.root.remove(section.city.root);section.city.dispose();
      for(const [key,value] of this.sectors)if(value===section)this.sectors.delete(key);
    }
  }
  reindex(){
    this.rayTargets=[];this.solids=[];this.spawnPoints=[];
    let approximate=0,footprints=0,roads=0,source='';
    for(const {city,offset,data} of this.sectors.values()){
      this.rayTargets.push(...city.rayTargets);
      this.solids.push(...city.solids.map(s=>({...s,x:s.x+offset.x,z:s.z+offset.z})));
      this.spawnPoints.push(...city.spawnPoints.map(p=>[p[0]+offset.x,p[1]+offset.z]));
      approximate+=city.approximateBuildings||0;footprints+=data.buildings.length;roads+=data.roads.length;source=data.provider||source;
    }
    this.stats={approximate,footprints,roads,source,sectors:this.sectors.size};
    this.world.spawnPoints=this.spawnPoints;
  }
  get coords(){return unprojectGeo(this.lastX||0,this.lastZ||0,this.origin);}
  canOccupy(x,z,feet=0,height=1.77,r=.48){
    let covered=false;
    for(const {city,offset} of this.sectors.values()){
      const lx=x-offset.x,lz=z-offset.z;
      if(Math.abs(lx)>247-r||Math.abs(lz)>247-r)continue;
      covered=true;
      if(!city.canOccupy(lx,lz,feet,height,r))return false;
    }
    return covered;
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
  toggle(on){this.root.visible=!!on;}
  /** Return the nearest real, named street, not a randomly invented name. */
  streetAt(x,z){
    let best=Infinity,label='RUA SEM NOME CADASTRADO';
    for(const {city,offset} of this.sectors.values()){
      for(const {name,points} of city.streetPaths){
        for(let j=1;j<points.length;j++){
          const a=points[j-1],b=points[j],dx=b.x-a.x,dz=b.z-a.z;
          const px=x-offset.x-a.x,pz=z-offset.z-a.z;
          const t=Math.max(0,Math.min(1,(px*dx+pz*dz)/(dx*dx+dz*dz||1)));
          const d=Math.hypot(px-t*dx,pz-t*dz);
          if(d<best){best=d;label=name;}
        }
      }
    }
    return best<75?label:'RUA SEM NOME CADASTRADO';
  }
  updateVisibility(x,z){
    this.lastX=x;this.lastZ=z;
    this.streetName=this.streetAt(x,z);
    const nearest=Math.min(...[...this.sectors.values()].map(s=>Math.hypot(s.offset.x-x,s.offset.z-z)));
    if(nearest<145||this.loading||Date.now()-this.lastErrorAt<11000)return;
    const geo=unprojectGeo(x,z,this.origin);
    const key=geoCacheKey(geo.lat,geo.lon);
    if(this.sectors.has(key))return;
    this.onStatus('CARREGANDO OUTRO TRECHO DA CIDADE...');
    this.loading=this.loadSector(geo.lat,geo.lon).then(data=>{
      // A failed raster request should not replace an existing fully modeled sector.
      this.install(data,false,data.center);
      this.prune(x,z);this.reindex();
      this.onStatus(data.rasterOnly?'MAPA CARTOGRÁFICO · PRÉDIOS REAIS NÃO DISPONÍVEIS':
        `${this.sectors.size} SETORES · ${this.stats.roads} RUAS · ${this.stats.footprints} PRÉDIOS MAPEADOS`);
    }).catch(()=>{
      this.lastErrorAt=Date.now();
      this.onStatus('SEM CONEXÃO COM O MAPA · USANDO OS SETORES JÁ CARREGADOS');
    }).finally(()=>{this.loading=null;});
  }
  dispose(){
    for(const {city} of this.sectors.values())city.dispose();
    this.sectors.clear();this.world.scene.remove(this.root);
  }
}

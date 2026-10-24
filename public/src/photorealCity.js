import {unprojectGeo} from './geoProjection.js';

// TITAN PROTOCOL: Google Photorealistic 3D Tiles is a VISUAL layer only.
// Three.js still owns weapon rendering, controls, enemies and OSM-based collisions.
// Browser keys are public credentials: restrict to the site's HTTP referrers and Map Tiles API.
const CESIUM_VERSION='1.136.0';
const CESIUM_URL=`https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/Cesium.js`;
const CSS_URL=`https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/Widgets/widgets.css`;
let sdkPromise;
export function usableGoogleKey(value){return typeof value==='string'&&/^[a-zA-Z0-9_-]{20,160}$/.test(value.trim());}
export async function getPhotorealConfig(){
  const controller=new AbortController(),id=setTimeout(()=>controller.abort(),4500);
  try{
    const response=await fetch('/api/maps/config',{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('Configuração de mapas não acessível');
    const json=await response.json();
    return {key:usableGoogleKey(json.key)?json.key:''};
  }catch{return {key:''};}
  finally{clearTimeout(id);}
}
function injectSDK(){
  if(window.Cesium)return Promise.resolve(window.Cesium);
  if(sdkPromise)return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
    window.CESIUM_BASE_URL=`https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;
    if(!document.querySelector('[data-titan-cesium-css]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href=CSS_URL;css.dataset.titanCesiumCss='1';document.head.append(css);
    }
    const script=document.createElement('script');script.src=CESIUM_URL;script.async=true;
    const watchdog=setTimeout(()=>reject(Error('CesiumJS demorou demais para carregar')),15000);
    script.crossOrigin='anonymous';
    script.onload=()=>{clearTimeout(watchdog);window.Cesium?resolve(window.Cesium):reject(Error('Biblioteca CesiumJS não iniciou'));};
    script.onerror=()=>{clearTimeout(watchdog);reject(Error('Não foi possível carregar CesiumJS pela rede'));};
    document.head.append(script);
  }).catch(err=>{sdkPromise=null;throw err;});
  return sdkPromise;
}
/** Responsible for Cesium's lifecycle, calibrated geodetic camera and attribution. */
export class PhotorealCity {
  constructor(world,geoCity,{key,onStatus=()=>{},onFallback=()=>{},location={}}={}){
    this.world=world;this.city=geoCity;this.key=key;this.onStatus=onStatus;
    this.onFallback=onFallback;this.location=location;
    this.active=false;this.disposed=false;this.viewer=null;this.tileset=null;
    this.groundHeight=Number.isFinite(location.altitude)?location.altitude:null;
    this.hasGround=false;this.hasTile=false;this.tileCount=0;
    this.lastHeightQuery=0;this.lastRender=0;this.heightPending=false;this.latestAltitude=null;
  }
  static async config(){return getPhotorealConfig();}
  async start(){
    if(!usableGoogleKey(this.key))throw Error('Falta GOOGLE_MAPS_API_KEY no Render. Ative a Map Tiles API no Google Cloud.');
    const Cesium=await injectSDK();
    if(this.disposed)throw Error('Modo fotorrealista cancelado');
    // Cesium and Three.js render in separate GPU contexts; the Three canvas is transparent.
    const mount=this.world.mount;
    const layer=document.createElement('div');layer.id='titan-cesium-layer';
    layer.setAttribute('aria-label','Cidade fotorrealista do Google Maps');
    mount.insertBefore(layer,mount.firstChild);this.layer=layer;
    const credit=document.createElement('div');credit.id='titan-cesium-credits';document.body.append(credit);
    this.credits=credit;
    try{
      this.viewer=new Cesium.Viewer(layer,{
        animation:false,timeline:false,geocoder:false,homeButton:false,infoBox:false,
        selectionIndicator:false,baseLayerPicker:false,sceneModePicker:false,
        navigationHelpButton:false,fullscreenButton:false,
        baseLayer:false,imageryProvider:false,
        terrainProvider:new Cesium.EllipsoidTerrainProvider(),
        creditContainer:credit,creditViewport:document.body,requestRenderMode:true,maximumRenderTimeChange:Infinity,
        shouldAnimate:false,useDefaultRenderLoop:true
      });
      const viewer=this.viewer;
      viewer.scene.globe.show=false;
      viewer.scene.skyAtmosphere.show=false;
      viewer.scene.backgroundColor=Cesium.Color.fromCssColorString('#152033');
      viewer.scene.fog.enabled=false;
      viewer.scene.screenSpaceCameraController.enableInputs=false;
      viewer.scene.screenSpaceCameraController.enableCollisionDetection=false;
      // Show Google and third-party attributions. Never remove/hide these credits.
      const url=`https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(this.key)}`;
      let timeoutId;
      try{this.tileset=await Promise.race([
        Cesium.Cesium3DTileset.fromUrl(url,{
          showCreditsOnScreen:true,maximumScreenSpaceError:17,maximumMemoryUsage:320
        }),
        new Promise((_,reject)=>{timeoutId=setTimeout(()=>reject(Error('Google 3D não respondeu dentro do prazo')),16000);})
      ]);}finally{clearTimeout(timeoutId);}
      if(this.disposed)throw Error('Modo fotorrealista cancelado');
      viewer.scene.primitives.add(this.tileset);
      this.tileset.tileVisible.addEventListener(()=>{this.hasTile=true;this.tileCount++;});
      // Original Three city still handles physics, but its meshes no longer obscure Google imagery.
      this.world.setPhotorealMode(true,()=>this.combatNodes());
      this.active=true;this.startedAt=performance.now();
      document.body.classList.add('photo-city-active');
      this.onStatus('CIDADE FOTORREALISTA · CARREGANDO FACHADAS E TERRENO DO GOOGLE...');
      this.update(0,0,0);
      return true;
    }catch(err){this.stop();throw err;}
  }
  combatNodes(){
    const game=this.world.gameInstance;
    if(!game)return [];
    const nodes=[];
    for(const e of game.enemies.enemies){nodes.push(e.group,e.laser,e.warning);}
    for(const group of [game.enemies.projectiles,game.enemies.particles,game.enemies.pickups,game.weapons.tracers,game.fx]){
      if(!Array.isArray(group))continue;
      for(const entity of group)nodes.push(entity?.mesh||entity?.line||entity?.group);
    }
    return nodes.filter(Boolean);
  }
  update(x,z,eyeY=1.75){
    if(!this.active||this.disposed||!this.viewer)return;
    const now=performance.now();
    if(now-this.lastRender<32)return; // Cesium at ~30fps, game can run at its own rate.
    this.lastRender=now;
    const Cesium=window.Cesium;
    const here=unprojectGeo(x,z,this.city.origin);
    const H=this.hasGround?this.groundHeight:
      Number.isFinite(this.location.altitude)?this.location.altitude:180;
    const loadingHeight=!this.hasGround?Math.max(300,H+150):H;
    const y=loadingHeight+Math.max(.6,eyeY);
    const canvas=this.world.renderer.domElement;
    const aspect=Math.max(.2,canvas.clientWidth)/Math.max(1,canvas.clientHeight);
    const vFov=Cesium.Math.toRadians(this.world.camera.fov);
    const cesiumFov=aspect>1?2*Math.atan(Math.tan(vFov/2)*aspect):vFov;
    try{
      const frustum=this.viewer.camera.frustum;
      if(frustum.fov!==undefined)frustum.fov=cesiumFov;
      this.viewer.camera.setView({
        destination:Cesium.Cartesian3.fromDegrees(here.lon,here.lat,y),
        orientation:{heading:-this.world.gameInstance.yaw,pitch:this.world.gameInstance.pitch,roll:0}
      });
      this.viewer.scene.requestRender();
    }catch(err){this.onStatus('Não foi possível atualizar a câmera fotorrealista.');return;}
    // Sample the photogrammetry surface to align 1.75m eye height with real terrain.
    // This is visual calibration only: geometric collision remains the OSM footprint approximation.
    if(now-this.lastHeightQuery>3000&&!this.heightPending){
      this.lastHeightQuery=now;
      const point=Cesium.Cartographic.fromDegrees(here.lon,here.lat);
      if(this.viewer.scene.sampleHeightMostDetailed && this.viewer.scene.sampleHeightSupported){
        this.heightPending=true;
        try{
          const positions=[point];
          Promise.resolve(this.viewer.scene.sampleHeightMostDetailed(positions)).then(results=>{
            const h=results?.[0]?.height;
            if(!this.disposed&&Number.isFinite(h)){
              this.groundHeight=this.hasGround?this.groundHeight*.65+h*.35:h;
              this.hasGround=true;
              this.onStatus('CIDADE REAL EM 3D · RENDERIZAÇÃO FOTORREALISTA ATIVA');
            }
          }).catch(()=>{}).finally(()=>{this.heightPending=false;});
        }catch{this.heightPending=false;}
      }else if(this.hasTile){
        try{
          const h=this.viewer.scene.sampleHeight(point);
          if(Number.isFinite(h)){
            this.groundHeight=h;this.hasGround=true;
            this.onStatus('CIDADE REAL EM 3D · RENDERIZAÇÃO FOTORREALISTA ATIVA');
          }
        }catch{}
      }
    }
    if(this.hasTile&&!this.hasGround&&!Number.isFinite(this.location.altitude)&&now-this.startedAt>25000){
      this.onFallback('Não foi possível calcular a altura do terreno para FPS');
      return;
    }
    if(!this.hasTile&&now-this.startedAt>18000){
      this.onStatus('Não há blocos 3D disponíveis nesta região ou a rede não conseguiu carregar. Usando mapa 3D próprio.');
      this.onFallback('Sem blocos fotorrealistas visíveis após o tempo limite');
    }else if(this.hasTile&&!this.hasGround&&now-this.startedAt>15000){
      this.onStatus('BLOCOS 3D VISÍVEIS · ALTITUDE ESTIMADA, COLISÕES BASEADAS NO OSM');
    }
  }
  stop(){
    if(this.disposed)return;
    this.disposed=true;this.active=false;
    if(this.world.photorealMode)this.world.setPhotorealMode(false);
    document.body.classList.remove('photo-city-active');
    try{this.viewer?.destroy();}catch{}
    this.viewer=null;this.layer?.remove();this.credits?.remove();this.layer=null;this.credits=null;
  }
}

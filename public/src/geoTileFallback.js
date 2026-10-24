/** Browser-only alternative to Overpass.
 * First try static OSM vector tiles; if blocked, render actual OSM raster
 * map tiles as a walkable surface. Raster mode does not invent buildings.
 */
import {parseVectorTile,relevantTiles,geometryFromVectorTiles} from './geoVectorParser.js';
const VECTORS='https://tiles.openfreemap.org/planet/latest';
export async function loadBrowserVectorCity(lat,lon){
  const tiles=relevantTiles(lat,lon,14,265).slice(0,4);
  const results=await Promise.allSettled(tiles.map(async t=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
    try{
      const r=await fetch(`${VECTORS}/${t.z}/${t.x}/${t.y}.pbf`,{signal:controller.signal});
      if(!r.ok)throw new Error(`Tile HTTP ${r.status}`);
      const b=await r.arrayBuffer();return {...t,layers:parseVectorTile(b)};
    }finally{clearTimeout(timer);}
  }));
  const loaded=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  if(!loaded.length)throw new Error('OpenFreeMap não pôde ser acessado deste navegador');
  return geometryFromVectorTiles(loaded,lat,lon);
}
function loadImageTile(tile){return new Promise((resolve,reject)=>{
  const image=new Image();image.crossOrigin='anonymous';
  const timeout=setTimeout(()=>{image.onload=image.onerror=null;reject(new Error('Tile não respondeu'));},6500);
  image.onload=()=>{clearTimeout(timeout);resolve({...tile,image});};
  image.onerror=()=>{clearTimeout(timeout);reject(new Error('Tile indisponível'));};
  image.src=`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
});}
export async function loadRasterGeoCity(lat,lon){
  // Only the 500m currently visible area is requested (no bulk download).
  const t=relevantTiles(lat,lon,16,265).slice(0,4);
  const r=await Promise.allSettled(t.map(loadImageTile));
  const valid=r.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(!valid.length)throw new Error('Os mapas vetoriais e as imagens cartográficas estão indisponíveis nesta conexão');
  return {source:'© OpenStreetMap contributors · ODbL',city:'MINHA CIDADE',provider:'OpenStreetMap · mapa cartográfico',rasterOnly:true,rasterTiles:valid,center:{lat,lon},roads:[],buildings:[],parks:[],loadedAt:new Date().toISOString()};
}

/** Fast, geometry-preserving map loader using pre-generated OpenFreeMap vector tiles.
 * These are static map tiles (not rate-limited Overpass database queries).
 * At most four simultaneous downloads and no exact device GPS leaves our app.
 */
import {parseVectorTile,relevantTiles,geometryFromVectorTiles} from '../public/src/geoVectorParser.js';
export const VECTOR_TILE_URL='https://tiles.openfreemap.org/planet/latest';
const AGENT='TITAN-Protocol/4.6.2 (+https://github.com/lednew2004/wendel-fps)';
const timeoutMs=7800;
export async function fetchVectorTile(t,{fetchImpl=fetch,base=VECTOR_TILE_URL}={}){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetchImpl(`${base}/${t.z}/${t.x}/${t.y}.pbf`,{headers:{'User-Agent':AGENT,'Accept':'application/x-protobuf,application/octet-stream'},signal:controller.signal});
    if(!r.ok)throw Error(`Vetor HTTP ${r.status}`);
    const buf=await r.arrayBuffer();
    if(buf.byteLength>3_500_000)throw Error('Tile vetorial excede o limite');
    return {...t,layers:parseVectorTile(buf)};
  } finally{clearTimeout(timeout);}
}
export async function loadVectorCity(lat,lon,options={}){
  const tiles=relevantTiles(lat,lon,14,265);
  if(tiles.length>4)throw Error('Excesso de tiles para este setor');
  const results=await Promise.allSettled(tiles.map(t=>fetchVectorTile(t,options)));
  const loaded=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  if(!loaded.length)throw Error('OpenFreeMap inacessível: '+results.map(r=>r.reason?.message||'erro').join('; ').slice(0,180));
  return geometryFromVectorTiles(loaded,lat,lon);
}

/** OSM geographical sector service. Queries only on explicit browser GPS permission.
 * A short-lived in-memory cache prevents repeatedly hitting the community Overpass API.
 */
const sectors=new Map();
const MAX_CACHE=80;
const CITY_AGENT='TITAN-PROTOCOL/4.6 (browser-based geodata scene; https://github.com/lednew2004/wendel-fps)';
let lastUncached=0;
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, max-age=120','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function bounds(lat,lon){
  const delta=.00225;const longitudinal=delta/Math.max(.22,Math.cos(lat*Math.PI/180));
  return [lat-delta,lon-longitudinal,lat+delta,lon+longitudinal];
}
export function sectorKey(lat,lon){return `${Math.round(lat*1000)/1000}:${Math.round(lon*1000)/1000}`;}
export function safeCoordinates(query){
  const lat=Number(query.get('lat')),lon=Number(query.get('lon'));
  if(!query.has('lat')||!query.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>80||Math.abs(lon)>180)return null;
  // Quantization ensures requests and the cache do not store a user's exact GPS fix.
  return {lat:Math.round(lat*1000)/1000,lon:Math.round(lon*1000)/1000};
}
export async function handleGeoArea(req,res){
  if(req.method!=='GET'){reply(res,405,{error:'Método não permitido.'});return;}
  const p=new URL(req.url,'http://localhost').searchParams;
  const coords=safeCoordinates(p);
  if(!coords){reply(res,400,{error:'Coordenadas inválidas.'});return;}
  const key=sectorKey(coords.lat,coords.lon),hit=sectors.get(key);
  if(hit?.data && Date.now()-hit.at<60*60*1000){reply(res,200,hit.data);return;}
  if(hit?.promise){try{reply(res,200,await hit.promise);}catch{reply(res,502,{error:'Serviço geográfico temporariamente indisponível.'});}return;}
  if(Date.now()-lastUncached<4500){reply(res,429,{error:'Aguarde alguns segundos antes de carregar outro setor.'});return;}
  lastUncached=Date.now();
  const job=loadArea(coords.lat,coords.lon);
  sectors.set(key,{promise:job,at:Date.now()});
  try{
    const data=await job;
    sectors.set(key,{data,at:Date.now()});
    while(sectors.size>MAX_CACHE)sectors.delete(sectors.keys().next().value);
    reply(res,200,data);
  }catch(error){sectors.delete(key);console.warn('OSM sector:',String(error?.message||error));reply(res,502,{error:'Não foi possível carregar o mapa geográfico. Tente novamente.'});}
}
async function loadArea(lat,lon){
  const [s,w,n,e]=bounds(lat,lon);
  const q=`[out:json][timeout:22];(way["highway"]["area"!="yes"](${s},${w},${n},${e});way["building"](${s},${w},${n},${e});way["leisure"="park"](${s},${w},${n},${e}););out geom;`;
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),32000);
  let payload;
  try{
    const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':CITY_AGENT},body:new URLSearchParams({data:q}),signal:ctrl.signal});
    if(!r.ok)throw new Error('Overpass '+r.status);
    payload=await r.json();
  }finally{clearTimeout(timeout);}
  if(!Array.isArray(payload.elements))throw new Error('Resposta geográfica inválida');
  const roads=[],buildings=[],parks=[];
  for(const item of payload.elements){
    if(!Array.isArray(item.geometry)||item.geometry.length<2)continue;
    const tags=item.tags||{};
    const points=item.geometry.slice(0,200).filter(pt=>Number.isFinite(pt.lat)&&Number.isFinite(pt.lon)).map(pt=>[Math.round(pt.lat*1e7)/1e7,Math.round(pt.lon*1e7)/1e7]);
    if(points.length<2)continue;
    const feature={id:item.id,points,name:String(tags.name||'').slice(0,70)};
    if(tags.highway&&roads.length<380){feature.class=String(tags.highway).slice(0,30);roads.push(feature);}
    else if(tags.building&&buildings.length<400&&points.length>=4){
      feature.levels=Number(tags['building:levels'])||0;
      feature.height=Number.parseFloat(tags.height)||0;
      buildings.push(feature);
    }else if(tags.leisure==='park'&&parks.length<35)parks.push(feature);
  }
  if(roads.length===0)throw new Error('Região sem ruas cadastradas');
  // A single reverse lookup per uncached sector, no GPS coordinates or personal info persisted.
  let city='MINHA CIDADE';
  try{
    const c=new AbortController();const t=setTimeout(()=>c.abort(),5500);
    try{
      const link=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=pt-BR`;
      const r=await fetch(link,{headers:{'User-Agent':CITY_AGENT,'Accept-Language':'pt-BR'},signal:c.signal});
      if(r.ok){const addr=(await r.json()).address||{};city=String(addr.city||addr.town||addr.village||addr.municipality||addr.county||city).slice(0,80);}
    }finally{clearTimeout(t);}
  }catch{/* City name can be unavailable while actual OSM geometry still loads. */}
  return {source:'© OpenStreetMap contributors · ODbL',city,center:{lat,lon},roads,buildings,parks,loadedAt:new Date().toISOString()};
}

/** Real OpenStreetMap geometry for the 3D city mode.
 * Only approximate GPS positions are accepted and cached. No fake city generation.
 * External public Overpass servers are independent and occasionally unavailable.
 */
import {loadVectorCity} from './geoVector.mjs';
const sectors = new Map();
const MAX_CACHE = 90;
const CACHE_MS = 6 * 60 * 60 * 1000;
const FAIL_COOLDOWN_MS = 8000;
const CITY_AGENT = 'TITAN-Protocol/4.6.4 (+https://github.com/lednew2004/wendel-fps; real OSM city FPS)';
const SOURCES = [
  {name: 'Private.coffee', url: 'https://overpass.private.coffee/api/interpreter', timeoutMs: 6800},
  {name: 'FOSSGIS', url: 'https://overpass-api.de/api/interpreter', timeoutMs: 6500},
  {name: 'VK Maps', url: 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', timeoutMs: 6500},
];

function send(res, status, data, ttl = 0) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `private, max-age=${ttl}`,
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}
export function safeCoordinates(query) {
  if (!query.has('lat') || !query.has('lon')) return null;
  const lat = Number(query.get('lat'));
  const lon = Number(query.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 80 || Math.abs(lon) > 180) return null;
  // Round to ~110m grid before external requests; exact GPS is never stored.
  return {lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000};
}
export function sectorKey(lat, lon) { return `${lat.toFixed(3)}:${lon.toFixed(3)}`; }
function bounds(lat, lon) {
  const delta = .00235;
  const longitudinal = delta / Math.max(.22, Math.cos(lat * Math.PI / 180));
  return [lat - delta, lon - longitudinal, lat + delta, lon + longitudinal];
}
export function overpassQuery(lat, lon) {
  const [s, w, n, e] = bounds(lat, lon).map(x => x.toFixed(6));
  // Query only essential features to keep runtime and public server load low.
  return `[out:json][timeout:16];(way["highway"]["area"!="yes"](${s},${w},${n},${e});way["building"](${s},${w},${n},${e});way["leisure"="park"](${s},${w},${n},${e}););out geom;`;
}
export function normalizeOsmElements(payload, center, city = 'MINHA CIDADE') {
  if (!payload || !Array.isArray(payload.elements)) throw new Error('Resposta OSM sem elementos válidos');
  if (payload.remark && /error|timeout|memory|limit/i.test(payload.remark)) throw new Error(String(payload.remark).slice(0, 120));
  const roads = [], buildings = [], parks = [];
  for (const item of payload.elements) {
    if (!Array.isArray(item.geometry) || item.geometry.length < 2) continue;
    const tags = item.tags || {};
    const points = item.geometry.slice(0, 220)
      .filter(pt => Number.isFinite(pt.lat) && Number.isFinite(pt.lon))
      .map(pt => [Math.round(pt.lat * 1e7) / 1e7, Math.round(pt.lon * 1e7) / 1e7]);
    if (points.length < 2) continue;
    const feature = {id: item.id, points, name: String(tags.name || '').slice(0, 70)};
    if (tags.highway && roads.length < 480) {
      feature.class = String(tags.highway).slice(0, 30);
      roads.push(feature);
    } else if (tags.building && buildings.length < 480 && points.length >= 4) {
      feature.levels = Math.max(0, Math.min(35, Number(tags['building:levels']) || 0));
      feature.height = Math.max(0, Math.min(125, Number.parseFloat(tags.height) || 0));
      buildings.push(feature);
    } else if (tags.leisure === 'park' && parks.length < 40 && points.length >= 3) {
      parks.push(feature);
    }
  }
  if (!roads.length) throw new Error('A consulta não retornou ruas nesta região');
  return {source: '© OpenStreetMap contributors · ODbL', city, center, roads, buildings, parks, loadedAt: new Date().toISOString()};
}
async function querySource(source, q) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), source.timeoutMs);
  try {
    const response = await fetch(source.url, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'Accept': 'application/json', 'User-Agent': CITY_AGENT},
      body: new URLSearchParams({data: q}),
      signal: ctrl.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function cityName(lat, lon) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3200);
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({format: 'jsonv2', lat: String(lat), lon: String(lon), zoom: '10', addressdetails: '1', 'accept-language': 'pt-BR'}).toString();
    const response = await fetch(url, {headers: {'User-Agent': CITY_AGENT, 'Accept-Language': 'pt-BR'}, signal: ctrl.signal});
    if (!response.ok) return 'MINHA CIDADE';
    const address = (await response.json())?.address || {};
    return String(address.city || address.town || address.village || address.municipality || address.county || 'MINHA CIDADE').slice(0, 80);
  } catch {return 'MINHA CIDADE';} finally {clearTimeout(timer);}
}
export async function loadArea(lat, lon) {
  const center = {lat, lon};
  const errors = [];
  // Primary: static vector tiles, not Overpass's live query API.
  try {
    const data = await loadVectorCity(lat,lon);
    // City-name lookup is optional and must not delay map geometry.
    return data;
  } catch (error) { errors.push(`OpenFreeMap: ${error.message}`); }
  const q = overpassQuery(lat, lon);
  for (const source of SOURCES.slice(0, 2)) {
    try {
      const payload = await querySource(source, q);
      const data = normalizeOsmElements(payload, center);
      // Failure of the optional city-label lookup must never invalidate real roads.
      data.city = await cityName(lat, lon);
      data.provider = source.name;
      return data;
    } catch (error) {
      errors.push(`${source.name}: ${error?.name === 'AbortError' ? 'timeout' : (error?.message || error)}`);
    }
  }
  // Do not log exact GPS, API bodies or browser device locations.
  console.warn('[GEO] Provedores de mapas indisponíveis:', errors.join(' | '));
  throw new Error('Não foi possível consultar o mapa vetorial ou as vias OSM pelo servidor.');
}
export async function handleGeoArea(req, res) {
  if (req.method !== 'GET') {send(res, 405, {error: 'Método não permitido.'}); return;}
  const params = new URL(req.url, 'http://localhost').searchParams;
  const coords = safeCoordinates(params);
  if (!coords) {send(res, 400, {error: 'Coordenadas inválidas.'}); return;}
  const key = sectorKey(coords.lat, coords.lon);
  const hit = sectors.get(key);
  if (hit?.data && Date.now() - hit.at < CACHE_MS) {send(res, 200, hit.data, 300); return;}
  if (hit?.promise) {
    try {send(res, 200, await hit.promise, 300);} catch (error) {send(res, 502, {error: error.message});}
    return;
  }
  if (hit?.error && Date.now() - hit.at < FAIL_COOLDOWN_MS) {send(res, 503, {error: hit.error}); return;}
  const task = loadArea(coords.lat, coords.lon);
  sectors.set(key, {promise: task, at: Date.now()});
  try {
    const data = await task;
    sectors.set(key, {data, at: Date.now()});
    while (sectors.size > MAX_CACHE) sectors.delete(sectors.keys().next().value);
    send(res, 200, data, 300);
  } catch (error) {
    sectors.set(key, {error: error.message, at: Date.now()});
    send(res, 502, {error: error.message});
  }
}

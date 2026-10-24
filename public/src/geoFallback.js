/** Browser recovery for the real OSM city: previously downloaded real roads, or a
 * direct fallback if the game hosting server cannot reach the Overpass API.
 * No generic or invented roads are generated. No exact device GPS is stored.
 */
const STORAGE_PREFIX = 'titan-real-osm-v2:';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export function geoCacheKey(lat, lon) {
  return `${(Math.round(lat * 1000) / 1000).toFixed(3)}:${(Math.round(lon * 1000) / 1000).toFixed(3)}`;
}
export function saveGeoSector(key, data) {
  if (!data?.roads?.length || !data.center) return;
  try {
    const value = JSON.stringify({savedAt: Date.now(), data});
    if (value.length < 2_600_000) localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {/* Storage can be disabled or full; the game stays playable. */}
}
export function readGeoSector(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) || 'null');
    if (stored?.data?.roads?.length && Date.now() - stored.savedAt < MAX_AGE) return stored.data;
  } catch {/* No cache. */}
  return null;
}
function directQuery(lat, lon) {
  const delta = .00235;
  const dlon = delta / Math.max(.22, Math.cos(lat * Math.PI / 180));
  const [s, w, n, e] = [lat - delta, lon - dlon, lat + delta, lon + dlon].map(x => x.toFixed(6));
  return `[out:json][timeout:15];(way["highway"]["area"!="yes"](${s},${w},${n},${e});way["building"](${s},${w},${n},${e});way["leisure"="park"](${s},${w},${n},${e}););out geom;`;
}
function normalizeDirectOSM(json, lat, lon) {
  if (!Array.isArray(json?.elements)) throw new Error('Resposta OSM inválida');
  const roads = [], buildings = [], parks = [];
  for (const item of json.elements) {
    if (!Array.isArray(item.geometry) || item.geometry.length < 2) continue;
    const tags = item.tags || {};
    const points = item.geometry.slice(0, 220)
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map(p => [Math.round(p.lat * 1e7) / 1e7, Math.round(p.lon * 1e7) / 1e7]);
    if (points.length < 2) continue;
    const f = {id: item.id, points, name: String(tags.name || '').slice(0, 70)};
    if (tags.highway && roads.length < 480) {f.class = String(tags.highway).slice(0, 30);roads.push(f);}
    else if (tags.building && buildings.length < 480 && points.length >= 4) {
      f.levels = Math.max(0, Math.min(35, Number(tags['building:levels']) || 0));
      f.height = Math.max(0, Math.min(125, Number.parseFloat(tags.height) || 0));
      buildings.push(f);
    } else if (tags.leisure === 'park' && parks.length < 40 && points.length >= 3) parks.push(f);
  }
  if (!roads.length) throw new Error('Nenhuma via real disponível na região');
  return {source: '© OpenStreetMap contributors · ODbL', city: 'MINHA CIDADE', center: {lat, lon}, roads, buildings, parks, loadedAt: new Date().toISOString(), provider: 'Consulta direta'};
}
/** Last-chance fetch from the player's browser. Some hosting networks block
 * outgoing requests but the player's internet connection may reach Overpass.
 * If CORS is disabled on the public endpoint, returns null without crashing.
 */
export async function fetchGeoDirect(lat, lon) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('https://overpass.private.coffee/api/interpreter', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'Accept': 'application/json'},
      body: new URLSearchParams({data: directQuery(lat, lon)}),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`OSM HTTP ${response.status}`);
    return normalizeDirectOSM(await response.json(), lat, lon);
  } finally {clearTimeout(timeout);}
}

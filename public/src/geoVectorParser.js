/** Minimal Mapbox Vector Tile reader for OSM/OpenMapTiles geometry.
 * Standard protobuf and MVT commands, with no external dependency; safe in Node and browsers.
 */
class Reader {
  constructor(data){this.a=data instanceof Uint8Array?data:new Uint8Array(data);this.i=0;this.end=this.a.length;}
  number(){let n=0,p=1;for(let j=0;j<10;j++){if(this.i>=this.end)throw Error('MVT truncado');const b=this.a[this.i++];n+=(b&127)*p;if(!(b&128))return n;p*=128;}throw Error('MVT varint inválido');}
  bytes(){const n=this.number();if(!Number.isSafeInteger(n)||n<0||n>this.end-this.i)throw Error('MVT tamanho inválido');const b=this.a.subarray(this.i,this.i+n);this.i+=n;return b;}
  skip(w){if(w===0){this.number();return;}if(w===2){this.bytes();return;}const n=w===1?8:w===5?4:-1;if(n<0||this.i+n>this.end)throw Error('MVT wire inválido');this.i+=n;}
  fields(cb){while(this.i<this.end){const tag=this.number();const field=Math.floor(tag/8),wire=tag%8;if(!field)throw Error('MVT campo inválido');cb(field,wire,this);}}
}
const decoder=new TextDecoder();
const zig=n=>n%2===0?n/2:-(n+1)/2;
const packed=b=>{const r=new Reader(b),out=[];while(r.i<r.end)out.push(r.number());return out;};
function valueMsg(bytes){let out=null;const r=new Reader(bytes);r.fields((f,w,p)=>{if(f===1&&w===2)out=decoder.decode(p.bytes());else if(f===2&&w===5){out=new DataView(p.a.buffer,p.a.byteOffset+p.i,4).getFloat32(0,true);p.i+=4;}else if(f===3&&w===1){out=new DataView(p.a.buffer,p.a.byteOffset+p.i,8).getFloat64(0,true);p.i+=8;}else if(w===0&&[4,5,6,7].includes(f)){const n=p.number();out=f===6?zig(n):f===7?Boolean(n):n;}else p.skip(w);});return out;}
function featureMsg(bytes){const f={id:0,tagList:[],geometry:[],type:0};const r=new Reader(bytes);r.fields((id,w,p)=>{if(id===1&&w===0)f.id=p.number();else if(id===2&&w===2)f.tagList=packed(p.bytes());else if(id===3&&w===0)f.type=p.number();else if(id===4&&w===2)f.geometry=packed(p.bytes());else p.skip(w);});return f;}
function layerMsg(bytes){const layer={name:'',extent:4096,keys:[],values:[],features:[]};const r=new Reader(bytes);r.fields((id,w,p)=>{if(id===1&&w===2)layer.name=decoder.decode(p.bytes());else if(id===2&&w===2)layer.features.push(featureMsg(p.bytes()));else if(id===3&&w===2)layer.keys.push(decoder.decode(p.bytes()));else if(id===4&&w===2)layer.values.push(valueMsg(p.bytes()));else if(id===5&&w===0)layer.extent=p.number();else p.skip(w);});return layer;}
export function parseVectorTile(buffer){const r=new Reader(buffer),layers=[];if(r.end>3_500_000)throw Error('Tile geográfico muito grande');r.fields((f,w,p)=>{if(f===3&&w===2)layers.push(layerMsg(p.bytes()));else p.skip(w);});return layers;}
function pathsFromCommands(ops){let x=0,y=0,idx=0,paths=[],path=null;while(idx<ops.length){const cmd=ops[idx++],code=cmd%8,count=Math.floor(cmd/8);if(count>100000)throw Error('MVT geometria inválida');if(code===1||code===2){for(let k=0;k<count;k++){if(idx+1>=ops.length)throw Error('MVT linha incompleta');x+=zig(ops[idx++]);y+=zig(ops[idx++]);if(code===1){path=[];paths.push(path);}if(path)path.push({x,y});}}else if(code===7){if(path&&path.length>2){const p=path[0];const q=path[path.length-1];if(q.x!==p.x||q.y!==p.y)path.push({...p});}}else break;}return paths;}
function latLonAt(x,y,z,extent,tx,ty){const n=2**z;const lon=(tx+x/extent)/n*360-180;const merc=Math.PI*(1-2*(ty+y/extent)/n);const lat=Math.atan(Math.sinh(merc))*180/Math.PI;return [Math.round(lat*1e7)/1e7,Math.round(lon*1e7)/1e7];}
export function tilePosition(lat,lon,z=14){const n=2**z;const x=(lon+180)/360*n;const y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;return {x,y};}
export function tileBounds(z,x,y){const sw=latLonAt(0,4096,z,4096,x,y),ne=latLonAt(4096,0,z,4096,x,y);return {north:ne[0],west:sw[1],south:sw[0],east:ne[1]};}
export function relevantTiles(lat,lon,z=14,halfMeters=265){const dLat=halfMeters/111320,dLon=halfMeters/(111320*Math.max(.22,Math.cos(lat*Math.PI/180)));const a=tilePosition(lat+dLat,lon-dLon,z),b=tilePosition(lat-dLat,lon+dLon,z);const tiles=[];for(let y=Math.floor(a.y);y<=Math.floor(b.y);y++)for(let x=Math.floor(a.x);x<=Math.floor(b.x);x++)tiles.push({z,x,y});return tiles;}
const aliases={street:'residential',minor:'residential',path:'footway',track:'service',pedestrian:'pedestrian'};
const forbidden=new Set(['rail','railway','aerialway','ferry','busway','subway','tram','funicular']);
/** Convert OpenMapTiles vector streets/buildings into the same data the existing Three.js world consumes. */
export function geometryFromVectorTiles(tiles,lat,lon){const roads=[],buildings=[],parks=[],labels=[],ids={roads:new Set(),buildings:new Set(),parks:new Set(),labels:new Set()};const dLat=.0025,dLon=dLat/Math.max(.22,Math.cos(lat*Math.PI/180));const clip=paths=>paths.some(path=>path.some(p=>Math.abs(p[0]-lat)<dLat&&Math.abs(p[1]-lon)<dLon));
  for(const item of tiles){const {z,x,y,layers}=item;for(const layer of layers){const kind=layer.name==='transportation'?'roads':layer.name==='transportation_name'?'labels':layer.name==='building'?'buildings':layer.name==='park'||layer.name==='landuse'?'parks':null;if(!kind)continue;
      for(const f of layer.features){if(((kind==='roads'||kind==='labels')&&f.type!==2)||((kind==='buildings'||kind==='parks')&&f.type!==3))continue;const tags={};for(let i=0;i+1<f.tagList.length;i+=2){const k=layer.keys[f.tagList[i]],v=layer.values[f.tagList[i+1]];if(k)tags[k]=v;}
        const className=String(tags.class||tags.subclass||'');if(kind==='roads'&&(forbidden.has(className)||forbidden.has(String(tags.subclass||''))))continue;
        if(kind==='parks'&&!['park','grass','recreation_ground','village_green','garden'].includes(className))continue;
        const paths=pathsFromCommands(f.geometry).filter(p=>p.length>1).map(path=>path.map(p=>latLonAt(p.x,p.y,z,layer.extent||4096,x,y))).filter(p=>clip([p]));
        for(let n=0;n<paths.length;n++){if(!paths[n].length)continue;const key=`${kind}:${z}:${x}:${y}:${f.id}:${n}`;if(ids[kind].has(key))continue;ids[kind].add(key);
          const obj={id:key,points:paths[n],name:String(tags.name||'').slice(0,70)};
          if(kind==='roads'){if(roads.length>=520)break;obj.class=aliases[className]||className||'residential';roads.push(obj);}
          else if(kind==='labels'){if(labels.length>=200)break;if(obj.name)labels.push(obj);}
          else if(kind==='buildings'){if(buildings.length>=800)break;if(paths[n].length<4)continue;obj.height=Number(tags.render_height||tags.height)||0;obj.levels=Number(tags['building:levels']||tags.levels)||0;buildings.push(obj);}
          else {if(parks.length>=60)break;parks.push(obj);}
        }
      }
    }}
  if(!roads.length)throw Error('As peças vetoriais não continham ruas para sua região');
  return {source:'OpenFreeMap © OpenMapTiles · Dados © OpenStreetMap contributors (ODbL)',city:'MINHA CIDADE',center:{lat,lon},roads,buildings,parks,labels,loadedAt:new Date().toISOString(),provider:'OpenFreeMap · ruas vetoriais'};
}

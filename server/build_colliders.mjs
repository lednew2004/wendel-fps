import {protectedRoute} from '../public/src/mobaLayout.js';
/** Run from project root: node server/build_colliders.mjs */
import fs from 'node:fs';
import {expandedBuildings,HOMES,homeStaticColliders,homeFurniture,furnitureCollider,INTERACTABLES} from '../public/src/worldLayout.js';
const base=JSON.parse(fs.readFileSync(new URL('colliders_base.json',import.meta.url),'utf8'));
const extension=expandedBuildings().map(b=>({x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,minY:0,maxY:b.h}));
for(const home of HOMES){
  extension.push(...homeStaticColliders(home));
  extension.push(...homeFurniture(home).map(furnitureCollider));
  extension.push({x:home.x,z:home.z,hx:home.w/2,hz:home.d/2,minY:home.h,maxY:home.h+.34});
}
const all=[...base.filter(c=>!protectedRoute(c.x,c.z)),...extension];
fs.writeFileSync(new URL('colliders.json',import.meta.url),JSON.stringify(all));
fs.writeFileSync(new URL('interactables.json',import.meta.url),JSON.stringify(INTERACTABLES));
console.log(`Colliders: ${base.length} originais + ${extension.length} novos = ${all.length}; interações: ${INTERACTABLES.length}`);

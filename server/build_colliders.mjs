import fs from 'node:fs';
import {SQUAD_BLOCKS,SQUAD_DOORS} from '../public/src/squadLayout.js';
const all=SQUAD_BLOCKS.map(({x,z,hx,hz,minY,maxY})=>({x,z,hx,hz,minY,maxY}));
fs.writeFileSync(new URL('colliders.json',import.meta.url),JSON.stringify(all));
fs.writeFileSync(new URL('interactables.json',import.meta.url),JSON.stringify(SQUAD_DOORS));
console.log(`Map: ${all.length} squad operation colliders; ${SQUAD_DOORS.length} synchronized interactive doors.`);

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('powers 2.0: two configurable slots exist in casual/lobby/room screens and in mobile HUD',()=>{
 const html=read('../../public/index.html');
 assert.equal((html.match(/data-power-slot="0"/g)||[]).length,4);
 assert.equal((html.match(/data-power-slot="1"/g)||[]).length,4);
 for(const id of ['power-a','power-b','power-hud','power-descend','mp-minimap','mp-name-clear','mp-code-clear'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const id of ['push','freeze','teleport','flight','invisible','phase'])assert.ok(html.includes('value="'+id+'"'));
 const game=read('../../public/src/game.js');assert.match(game,/this\.powers\.update\(dt\)/);
 assert.match(game,/e\.code==='KeyZ'/);assert.match(game,/e\.code==='KeyV'/);
 const client=read('../../public/src/multiplayer.js');assert.match(client,/case 'power-state'/);assert.match(client,/case 'power-effect'/);
 const map=read('../../public/src/minimap.js');assert.match(map,/p\.invisible\|\|p\.phased/);
});

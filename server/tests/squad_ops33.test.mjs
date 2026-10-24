import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findSquadPath} from '../../public/src/squadNavigation.js';
import {SQUAD_START,SQUAD_BLOCKS,SQUAD_POINTS,SQUAD_ROLES,ROLE_INFO,roleForHero} from '../../public/src/squadLayout.js';
import {HEROES} from '../../public/src/heroRoster.js';
const read=file=>readFileSync(new URL('../../public/src/'+file,import.meta.url),'utf8');

test('13 operators share four distinct 4-person squad jobs and keep their three signature skills',()=>{
 const counts=Object.fromEntries(SQUAD_ROLES.map(r=>[r,0]));
 for(const hero of HEROES){const role=roleForHero(hero.id);counts[role]++;assert.ok(ROLE_INFO[role].weapons.length>=2);assert.equal(hero.skills.length,3);}
 for(const role of SQUAD_ROLES)assert.ok(counts[role]>=3,role+' has no coverage');
 assert.equal(SQUAD_ROLES.length,4);
});

test('A* bots can reach each mission location without walking through scene or server colliders',()=>{
 const free=(x,z)=>Math.abs(x)<210&&Math.abs(z)<210&&!SQUAD_BLOCKS.some(b=>Math.abs(b.x-x)<b.hx+.7&&Math.abs(b.z-z)<b.hz+.7);
 for(const point of Object.values(SQUAD_POINTS)){
   const path=findSquadPath(SQUAD_START,point,free);
   assert.ok(path.length>0,point.label+' unreachable');
   assert.ok(Math.hypot(path.at(-1).x-point.x,path.at(-1).z-point.z)<.001);
   assert.ok(path.every(p=>free(p.x,p.z)),point.label+' goes through cover');
 }
});

test('legacy MOBA presentation removed from client render and tactical teleport display',()=>{
 assert.doesNotMatch(read('urban.js'),/MOBA_|createMobaWorld|JUNGLE_CAMPS/);
 assert.doesNotMatch(read('powerMenu.js'),/MOBA_LANES|JUNGLE_CAMPS/);
 assert.doesNotMatch(read('minimap.js'),/MOBA_LANES|JUNGLE_CAMPS/);
 assert.match(read('squadWorld.js'),/createSquadWorld/);
 assert.equal(SQUAD_BLOCKS.length,48);
});

test('Squad PvE progresses through perimeter, sniper reconnaissance, bomber sabotage, boss and extraction',()=>{
 const campaign=read('campaign.js'),game=read('game.js'),ai=read('squadAI.js');
 for(const name of ['defend','recon','sabotage','boss','extract'])assert.match(campaign,new RegExp(`phaseBegin\\('${name}'\\)`));
 assert.match(campaign,/this\.nearbyRole\('support'/);
 assert.match(campaign,/this\.nearbyRole\(role,point/);
 assert.match(campaign,/this\.game\.squad\.roleNear/);
 assert.match(game,/this\.squad\.update\(dt\)/);
 assert.match(game,/onAllyHit:/);
 assert.match(ai,/findSquadPath/);
 assert.match(ai,/onKill|enemies\.damage/);
 assert.match(ai,/this\.game\.world\.canMove/);
});

test('PvP remains free-for-all, 1/2/3 skills and the HUD configurator are available',()=>{
 const game=read('game.js');
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(server,/team:room\.mode==='coop'\?0:room\.nextTeam\+\+/ );
 assert.doesNotMatch(server,/MOBA_BASES/);
 for(const code of ['Digit1','Digit2','Digit3'])assert.match(game,new RegExp(`e\\.code==='${code}'`));
 assert.match(game,/new HudCustomizer\(this\)/);
 assert.match(game,/this\.squad\.toggleOrders/);
});

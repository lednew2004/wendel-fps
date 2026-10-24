import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fallSpeed,landingDamage,mustDeploy,FREEFALL_TERMINAL,PARACHUTE_TERMINAL} from '../../public/src/airPhysics.js';
const read=name=>fs.readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('4.4: queda acelera com gravidade e respeita velocidade terminal',()=>{
 let vy=-7;for(let i=0;i<180;i++)vy=fallSpeed(vy,1/60,false);
 assert.equal(vy,FREEFALL_TERMINAL);
 assert.equal(fallSpeed(-20,0,false),-20);
});
test('4.4: paraquedas freia ate velocidade segura, abertura manual e automatica',()=>{
 let vy=-37;for(let i=0;i<260;i++)vy=fallSpeed(vy,1/60,true);
 assert.ok(Math.abs(vy-PARACHUTE_TERMINAL)<.02);
 assert.equal(mustDeploy(40,false),false);
 assert.equal(mustDeploy(32,false),true);
 assert.equal(mustDeploy(12,true),false);
 assert.equal(landingDamage(6.5),0);
 assert.ok(landingDamage(38)>0);
});
test('4.4: game usa entrada aérea, paraquedas via teclado e nao afeta PvP',()=>{
 const g=read('public/src/game.js'),air=read('public/src/airDeployment.js');
 assert.match(g,/if\(mode!=='multiplayer'\).*deployment\.begin/);
 assert.match(g,/this\.deployment\.active\)this\.deployment\.update\(dt\)/);
 assert.match(g,/this\.deployment\?\.active\)this\.deployment\.deploy\(\)/);
 assert.match(air,/landingAt\(/);
 assert.match(air,/this\.open=true/);
 assert.match(read('public/index.html'),/id="drop-hud"/);
});
test('4.4: zoom mais proximo e sem arma bloqueando campo de visao',()=>{
 const w=read('public/src/weapons.js'),g=read('public/src/game.js');
 assert.match(w,/index===2\?11/);
 assert.match(w, /index===3\?22:18/);
 assert.match(g,/this\.weapons\.model\.visible=this\.weapons\.ads<\.55/);
 assert.match(g,/updateAimFocus\(dt\)/);
});
test('4.4: armas aparecem no chao e precisam ser coletadas fora do PvP',()=>{
 const loot=read('public/src/weaponLoot.js'),g=read('public/src/game.js');
 assert.match(loot,/this\.drops\.push/);
 assert.match(loot,/this\.unlocked\.add\(i\)/);
 assert.match(loot,/this\.game\.weapons\.switchTo\(i\)/);
 assert.match(g,/\[\.\.\.this\.weaponLoot\.unlocked\]/);
 assert.match(loot,/SQUAD_POINTS\.boss/);
});
test('4.4: progressao acelerada ate chefes e inimigos podem buscar cobertura',()=>{
 const camp=read('public/src/campaign.js'),game=read('public/src/game.js'),bots=read('public/src/enemies.js');
 assert.match(camp,/defend:12/);
 assert.match(camp,/this\.phaseElapsed>5/);
 assert.match(game,/this\.wave%3===0/);
 assert.match(bots,/findCover\(e,target\)/);
 assert.match(bots,/this\.findCover\(e,chase\)/);
 assert.match(bots,/raycastDistance\(eye/);
});

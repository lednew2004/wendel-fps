import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CasualEconomy,POWER_PRICES,STARTING_POWER,ENEMY_CREDITS} from '../../public/src/casualEconomy.js';
import {POWER_RULES,criticalPowerPenalty,sanitizeLoadout} from '../powers.mjs';

const source=name=>fs.readFileSync(new URL('../../public/src/'+name,import.meta.url),'utf8');

test('casual economy: one starting power, distinct prices, monster credits, no negative balance and reset per run',()=>{
 const economy=new CasualEconomy();
 assert.deepEqual([...economy.owned],[STARTING_POWER]);assert.equal(economy.credits,0);
 assert.equal(economy.owns('heal'),false);assert.equal(economy.price('heal'),170);
 assert.equal(economy.buy('resurrection').ok,false);assert.equal(economy.credits,0);
 assert.equal(economy.reward('scout'),55);assert.equal(economy.reward('gunner'),75);assert.equal(economy.reward('boss',true),450);
 assert.equal(economy.credits,580);assert.equal(economy.buy('heal').ok,true);
 assert.equal(economy.credits,410);assert.equal(economy.buy('heal').already,true);assert.equal(economy.credits,410);
 assert.equal(economy.buy('unknown').ok,false);
 assert.ok(Object.keys(POWER_PRICES).length===18);assert.equal(new Set(Object.values(POWER_PRICES)).size>10,true);
 assert.ok(ENEMY_CREDITS.boss>ENEMY_CREDITS.scout);
 economy.reset();assert.equal(economy.credits,0);assert.deepEqual([...economy.owned],[STARTING_POWER]);
});

test('removed web is unavailable in server, client wheel and HTML, and outdated loadouts sanitize',()=>{
 assert.equal(POWER_RULES.web,undefined);
 assert.deepEqual(sanitizeLoadout(['web','teleport']),['push','teleport']);
 assert.doesNotMatch(source('powers.js'),/web:\{label:/);
 assert.doesNotMatch(fs.readFileSync(new URL('../../public/index.html',import.meta.url),'utf8'),/value="web"/);
 assert.doesNotMatch(source('parkour.js'),/Elastic rope/);
});

test('combat and critical cooldowns: higher severity and conditional extensions',()=>{
 assert.ok(POWER_RULES.push.cooldown>=12000);
 assert.ok(POWER_RULES.blackhole.cooldown>POWER_RULES.freeze.cooldown);
 assert.ok(POWER_RULES.rewind.cooldown>POWER_RULES.teleport.cooldown);
 assert.ok(POWER_RULES.resurrection.cooldown>POWER_RULES.blackhole.cooldown);
 assert.equal(criticalPowerPenalty('heal',{hpRatio:.25}),6000);
 assert.equal(criticalPowerPenalty('heal',{hpRatio:.75}),0);
 assert.equal(criticalPowerPenalty('blackhole',{nearbyTargets:3}),7000);
 assert.equal(criticalPowerPenalty('blackhole',{nearbyTargets:1}),0);
 assert.equal(criticalPowerPenalty('rewind',{restoredHealth:60}),9000);
 assert.equal(criticalPowerPenalty('rewind',{restoredHealth:10}),0);
});

test('game and wheel enforce purchase before equipping, display cost and remaining dash recharge',()=>{
 const p=source('powers.js'),g=source('game.js'),m=source('powerMenu.js');
 assert.match(g,/this\.powers\.startRun\(mode\)/);
 assert.match(g,/this\.powers\?\.earnKillCredit\(e\)/);
 assert.match(g,/p\.dashCd>0/);
 assert.match(g,/p\.dashCd=Math\.max\(2\.5,4\.8\*p\.dashFactor\)/);
 assert.match(p,/if\(this\.isCasualRun\(\)&&!this\.isUnlocked\(id\)\)/);
 assert.match(p,/this\.economy\.buy\(id\)/);
 assert.match(m,/this\.system\.acquire\(this\.slot,id\)/);
 assert.match(m,/this\.system\.economy\.price\(id\)/);
 const html=fs.readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 assert.match(html,/id="titan-economy-hud"/);
});

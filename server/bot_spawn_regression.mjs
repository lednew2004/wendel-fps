import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SQUAD_START,SQUAD_BLOCKS,SQUAD_DOORS,ARENA_BOUNDS} from '../public/src/squadLayout.js';
import {solidBlocksCapsule} from '../public/src/parkourPhysics.js';
import {ENEMY_TYPES} from '../public/src/constants.js';
import {CHAMPIONS,leagueWave} from '../public/src/titanLeague.js';
import {SPAWN_RADIUS} from '../public/src/combatTactics.js';
import {lineWalkable,findGroundRoute} from '../public/src/botNavigation.js';

class V3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
 length(){return Math.hypot(this.x,this.y,this.z);}
 normalize(){const d=this.length()||1;this.x/=d;this.y/=d;this.z/=d;return this;}
}
const blocked=[...SQUAD_BLOCKS,...SQUAD_DOORS];
const arena={
  canOccupy(x,z,y,height,r){
    if(Math.abs(x)>ARENA_BOUNDS.halfX-2-r||Math.abs(z)>ARENA_BOUNDS.halfZ-2-r)return false;
    return blocked.every(s=>!solidBlocksCapsule(s,x,z,y,height,r));
  }
};
const ctx=vm.createContext({THREE:{Vector3:V3},ENEMY_TYPES,CHAMPIONS,SPAWN_RADIUS,Math,
  rand:(a,b)=>a+Math.random()*(b-a),console});
let source=fs.readFileSync(new URL('../public/src/enemies.js',import.meta.url),'utf8');
source=source.replace(/^import .*?;\s*$/gm,'').replace('export class EnemySystem','class EnemySystem');
vm.runInContext(source+'\nglobalThis.EnemySystem=EnemySystem;',ctx);
const EnemySystem=ctx.EnemySystem;
let total=0;
for(const start of [{...SQUAD_START,eyeY:1.75},{x:0,z:-39,eyeY:1.75},{x:0,z:35,eyeY:1.75},{x:20,z:94,eyeY:1.75}]){
  const fake={world:{city:arena,spawnPoints:[[-72,-91],[72,-91],[0,71]],camera:{getWorldDirection:v=>v},
      raycastDistance:(_eye,_direction,far)=>far},enemies:[],time:0,
      spawn(type,[x,z],wave,champ){
        assert.ok(arena.canOccupy(x,z,0,1.9,(champ?.radius??ENEMY_TYPES[type].radius)+.16),'bot placed inside blocker or beyond arena');
        const e={x,z,radius:champ?.radius??ENEMY_TYPES[type].radius,champion:champ};this.enemies.push(e);return e;
      }};
  const order=['scout','gunner','hunter','tank','boss','gunner'];
  for(const [i,type] of order.entries()){
    const e=EnemySystem.prototype.spawnAt.call(fake,type,start,1,type==='boss'?CHAMPIONS[0]:null);
    assert.ok(e,`spawn failed for ${type} at ${start.x},${start.z}`);
    const dist=Math.hypot(e.x-start.x,e.z-start.z);
    assert.ok(dist>=13.5&&dist<65,`spawn not in combat range ${dist}`);
    const nav=findGroundRoute(e,start,arena,e.radius+.1);
    assert.ok(nav.length>0,`spawned enemy cannot navigate toward player ${type}`);
    total++;
  }
}
assert.equal(leagueWave(1).spawns.length,4);
assert.equal(leagueWave(2).champion.id,'arachnex');
console.log(`PASS: ${total} bots spawned inside accessible arena, routeable to the player, across four player positions; first boss progression valid`);

// Verify the actual Game PvP-bot round releases enemies immediately on start.
let gameSource=fs.readFileSync(new URL('../public/src/game.js',import.meta.url),'utf8');
gameSource=gameSource.replace(/^import .*?;\s*$/gm,'').replace('export class Game','class Game');
const elements=new Map();
const el=id=>{
  if(!elements.has(id))elements.set(id,{
    textContent:'',classList:{add(){},remove(){},toggle(){}},
    querySelector(){return {textContent:''};}
  });
  return elements.get(id);
};
const ctxGame=vm.createContext({document:{getElementById:el},console,
  leagueWave,BOT_LIMIT:12,spawnInterval:()=>.2,fmt:n=>String(n).padStart(2,'0')});
vm.runInContext(gameSource+'\nglobalThis.Game=Game;',ctxGame);
const Game=ctxGame.Game;
const fakeGame={mode:'survival',wave:0,pendingSpawns:[],spawnTimer:0,enemies:{list:[],
 count(){return this.list.length;},spawnAt(type,player,wave,champ){const e={type,champ};this.list.push(e);return e;}},
 player:{x:0,z:-94},leagueRound:null,league:{unlocked:0,totalWins:0},spawnFailureCount:0,
 audio:{play(){}},toast(){},updateHud(){},releaseQueuedBots(max){return Game.prototype.releaseQueuedBots.call(this,max);}};
Game.prototype.beginWave.call(fakeGame);
assert.equal(fakeGame.wave,1);
assert.equal(fakeGame.enemies.count(),2,'initial round must spawn 2 live bots instantly');
assert.equal(fakeGame.pendingSpawns.length,2,'remaining 2 challengers stay queued');
fakeGame.pendingSpawns=[];
Game.prototype.beginWave.call(fakeGame);
assert.equal(fakeGame.leagueRound.champion.id,'arachnex');
assert.equal(fakeGame.enemies.list.at(-1).type,'boss','champion must spawn immediately on wave 2');
console.log('PASS: PvP bot round starts with 2 live enemies and championship boss spawns immediately on the next round');

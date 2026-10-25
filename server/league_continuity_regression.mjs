import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SQUAD_BLOCKS,SQUAD_DOORS,SQUAD_INTERIORS,ARENA_BOUNDS,SQUAD_ENEMY_SPAWNS} from '../public/src/squadLayout.js';
import {solidBlocksCapsule,standHeight,walkableVolumes} from '../public/src/parkourPhysics.js';
import {ENEMY_TYPES,UPGRADES} from '../public/src/constants.js';
import {CHAMPIONS,leagueWave} from '../public/src/titanLeague.js';
import {SPAWN_RADIUS,spawnInterval,BOT_LIMIT} from '../public/src/combatTactics.js';
import {botCanWalk,lineWalkable} from '../public/src/botNavigation.js';

const parts=[...SQUAD_BLOCKS,...SQUAD_DOORS];
const surfaces=walkableVolumes([],SQUAD_BLOCKS);
const city={
  canOccupy(x,z,y,h,r){
    if(Math.abs(x)>ARENA_BOUNDS.halfX-2-r||Math.abs(z)>ARENA_BOUNDS.halfZ-2-r||y<-.3)return false;
    return parts.every(s=>!solidBlocksCapsule(s,x,z,y,h,r));
  },
  floorAt(x,z,feet,step=.46){return standHeight(surfaces,x,z,feet,step);},
};
class V3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  normalize(){const n=this.length()||1;this.x/=n;this.y/=n;this.z/=n;return this;}
}
const enemyCtx=vm.createContext({THREE:{Vector3:V3},ENEMY_TYPES,CHAMPIONS,SPAWN_RADIUS,Math,console,rand:(a,b)=>a+Math.random()*(b-a)});
const loadClass=(file,oldName,newName,ctx)=>{
  let source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  source=source.replace(/^import .*?;\s*$/gm,'').replace(oldName,newName);
  vm.runInContext(source+`\nglobalThis.__CLASS=${newName.split(' ').at(-1)};`,ctx);
  return ctx.__CLASS;
};
const EnemySystem=loadClass('../public/src/enemies.js','export class EnemySystem','class EnemySystem',enemyCtx);
// Use actual roof/ground blocker heights, rather than a toy flat-floor geometry.
let roofs=0;
for(const building of SQUAD_INTERIORS){
  const foot=building.h+.34;
  const player={x:building.x,z:building.z,eyeY:foot+1.75};
  assert.ok(city.floorAt(building.x,building.z,foot,.65)>building.h,'real roof exists');
  const fake={
    world:{city,spawnPoints:SQUAD_ENEMY_SPAWNS,camera:{getWorldDirection:v=>v},raycastDistance:(_a,_b,d)=>d},enemies:[],time:0,
    spawn(type,[x,z],wave,champ){
      const e={type,x,z,radius:champ?.radius??ENEMY_TYPES[type].radius,group:{position:{y:0}}};
      this.enemies.push(e);return e;
    }
  };
  const enemy=EnemySystem.prototype.spawnAt.call(fake,'gunner',player,3,null);
  assert.ok(enemy,`Rooftop reinforcement must spawn on ${building.id}`);
  assert.ok(Math.abs(enemy.floorY-foot)<2.4,`Enemy did not spawn at player level on ${building.id}`);
  assert.ok(city.canOccupy(enemy.x,enemy.z,enemy.floorY,1.9,enemy.radius+.16),'Roof spawn must be collision free');
  assert.ok(botCanWalk(city,enemy.x,enemy.z,enemy.floorY,enemy.radius),'Rooftop combatant must have walkable footing');
  assert.ok(!lineWalkable({x:building.x,z:building.z},{x:building.x+building.w,z:building.z},city,enemy.radius,foot), 'Rooftop route cannot cross empty air');
  roofs++;
}
console.log(`PASS: ${roofs} elevated buildings support real collision-safe rooftop spawns and height-aware navigation`);

const elements=new Map();
const el=id=>{
  if(!elements.has(id))elements.set(id,{textContent:'',classList:{add(){},remove(){}},querySelector(){return {textContent:''}},replaceChildren(){}});
  return elements.get(id);
};
const ctx=vm.createContext({console,document:{getElementById:el},UPGRADES,BOT_LIMIT,leagueWave,spawnInterval,fmt:n=>String(n).padStart(2,'0'),Math});
const Game=loadClass('../public/src/game.js','export class Game','class Game',ctx);
const fake={mode:'survival',state:'playing',wave:0,intermissionTimer:0,pendingSpawns:[],spawnTimer:0,spawnFailureTime:0,spawnFailureCount:0,
  player:{health:55,maxHealth:100,shield:20,maxShield:60},
  enemies:{list:[],count(){return this.list.length;},spawnAt(type,player,wave,champ){const e={type,champ,wave};this.list.push(e);return e}},
  audio:{play(){}},leagueRound:null,toast(){},updateHud(){},
  grantUpgrade(id){assert.ok(UPGRADES.some(u=>u.id===id));this.rewardCount=(this.rewardCount??0)+1},
  releaseQueuedBots(max){return Game.prototype.releaseQueuedBots.call(this,max)},
  beginWave(){return Game.prototype.beginWave.call(this)}
};
fake.beginWave();
assert.equal(fake.wave,1);
for(let finished=1;finished<=7;finished++){
  fake.enemies.list=[];fake.pendingSpawns=[];
  Game.prototype.waveComplete.call(fake);
  assert.equal(fake.state,'playing','League must not lock in upgrade state');
  assert.ok(fake.intermissionTimer>0,'league transition must schedule automatically');
  for(let i=0;i<12;i++)Game.prototype.tickLeagueIntermission.call(fake,.22);
  assert.equal(fake.wave,finished+1,'next League round must start automatically');
  assert.ok(fake.enemies.list.length>0,'next League round must have enemies');
  assert.ok(fake.intermissionTimer===0);
}
assert.equal(fake.rewardCount,7,'every round offers automatic reward without interrupting play');
assert.equal(fake.wave,8);
assert.equal(fake.leagueRound.champion.id,'arachnex');
console.log('PASS: seven consecutive transitions automatically spawn enemies through champions and tiers, without modal or pointer-lock interruption');

// Regression: an already-spawned opponent stuck below the player's roof
// must be recovered without counting as a kill or clearing the wave.
let removed=0,notices=0;
const original={x:-42,z:-62,type:'gunner',floorY:0,hp:31,maxHp:90,radius:.7,phaseIndex:0,
  group:{},elevationStall:0};
const arenaRecovery={
  enemies:[original],roofRecoveryClock:0,world:{scene:{remove(){removed++}}},hooks:{onBossWarning(){notices++}},
  canSee(){return false},disposeEnemy(){},
  spawnAt(type,player,wave){
    const enemy={type,x:player.x+10,z:player.z+3,floorY:player.eyeY-1.75,
      hp:90,maxHp:90,radius:.7,phaseIndex:0,group:{},bar:{scale:{x:1}}};
    this.enemies.push(enemy);return enemy;
  }
};
const roofPlayer={x:-54,z:-59,eyeY:11.09};
for(let t=0;t<3;t++)EnemySystem.prototype.recoverElevatedCombat.call(arenaRecovery,roofPlayer,3,2.5);
assert.equal(arenaRecovery.enemies.length,1,'recovery must not duplicate or delete a live combatant');
assert.ok(arenaRecovery.enemies[0].floorY>9,'stuck enemy must join the roof fight');
assert.equal(arenaRecovery.enemies[0].hp,31,'recovery must preserve damage already dealt');
assert.ok(removed>=1&&notices===1,'recovery must remove the old scene object and announce reinforcements');
console.log('PASS: stranded lower-floor enemy joins a rooftop fight without resetting its health or wave count');

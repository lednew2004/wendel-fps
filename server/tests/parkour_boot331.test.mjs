import test from 'node:test';
import assert from 'node:assert/strict';
import {ParkourController} from '../../public/src/parkour.js';
import {SQUAD_START} from '../../public/src/squadLayout.js';

// Reproduces the Chrome error from v3.3.0: the Squad map has ZERO old rooftop courses.
function setup(courses=[]){
  const elements=new Map();
  globalThis.document={
    getElementById(id){
      if(!elements.has(id))elements.set(id,{textContent:'',style:{transform:''}});
      return elements.get(id);
    },
    body:{classList:{remove(){},toggle(){}}}
  };
  const city={courses,lowWalls:[],ladders:[],solids:[],toggle(){},setRouteActive(){},nearestInteractable(){return null;},nearestLadder(){return null;},wallNear(){return null;}};
  const game={player:{x:0,z:0,eyeY:1.75},yaw:0,positionCamera(){},mode:'campaign'};
  return {controller:new ParkourController(game,city),elements,city,game};
}
test('Squad map with zero rooftop courses does not crash when Game constructs ParkourController',()=>{
  const {controller:pk,elements}=setup();
  assert.equal(pk.trialActive,false);
  assert.equal(elements.get('pk-route').textContent,'OPERAÇÃO SQUAD');
  assert.equal(elements.get('pk-level').textContent,'COMBATE TÁTICO');
  assert.equal(elements.get('pk-progress').textContent,'—');
  assert.equal(elements.get('pk-target-dist').textContent,'—');
  assert.equal(pk.toggleTrial(),false);
  assert.equal(pk.selectCourse(0),false);
  assert.doesNotThrow(()=>pk.checkCourse());
  pk.startCombat(SQUAD_START.x,SQUAD_START.z);
  assert.equal(pk.x,SQUAD_START.x);
  assert.equal(pk.z,SQUAD_START.z);
  assert.doesNotThrow(()=>pk.updateHud());
  pk.x=90;pk.z=90;
  assert.doesNotThrow(()=>pk.resetCheckpoint());
  assert.equal(pk.x,SQUAD_START.x);
  assert.equal(pk.z,SQUAD_START.z);
});
test('old optional parkour route continues to work when a course is actually present',()=>{
  const courses=[{name:'ROTA TESTE',level:1,spawn:[3,4],waypoints:[{x:3,z:4,y:0},{x:4,z:5,y:0}],best:null}];
  const {controller:pk,elements}=setup(courses);
  assert.equal(elements.get('pk-route').textContent,'ROTA TESTE');
  assert.equal(pk.selectCourse(0),true);
  assert.equal(pk.x,3);
  assert.equal(pk.z,4);
  assert.equal(pk.trialActive,true);
  assert.equal(elements.get('pk-level').textContent,'NÍVEL 1');
});

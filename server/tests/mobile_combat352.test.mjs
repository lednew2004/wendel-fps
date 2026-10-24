import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MobileControls,responsiveJoystick} from '../../public/src/mobile.js';

const read=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');

class StubNode {
  constructor(id){
    this.id=id;this.handlers={};this.style={};this.value='';this.textContent='';
    this.classList={add(){},remove(){},toggle(){}};
  }
  addEventListener(event,fn){(this.handlers[event]??=[]).push(fn);}
  emit(event,properties={}){for(const fn of this.handlers[event]??[])fn({pointerId:1,pointerType:'touch',clientX:0,clientY:0,preventDefault(){},stopPropagation(){},target:this,...properties});}
  setPointerCapture(){}
  setAttribute(){}
  querySelector(){return this.ring??=new StubNode('ring');}
  querySelectorAll(){return [];}
  getBoundingClientRect(){return {left:0,top:180,width:155,height:155};}
}
function touchGame(){
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,new StubNode(id));return nodes.get(id);};
  globalThis.matchMedia=()=>({matches:true});
  globalThis.document={documentElement:{classList:{add(){},toggle(){}}},getElementById:node,addEventListener(){},hidden:false};
  globalThis.window={innerWidth:850,innerHeight:390,addEventListener(){}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{maxTouchPoints:5}});
  globalThis.localStorage={getItem(){return null;},setItem(){}};
  const game={state:'playing',keys:{},mouseDown:false,rightDown:false,shots:0,tryFire(){this.shots++;return true;},
    look:{move(){return false;}},sensitivity:1,invertY:false,positionCamera(){},
    parkour:{jump(){},interact(){},crouch(){},toggleTrial(){return false;}},dash(){},pulse(){},grenade(){},cycleWeapon(){},
    weapons:{reload(){}},toast(){}};
  return {game,node,mobile:new MobileControls(game)};
}

test('touch aiming layer stays behind actionable fire and movement controls',()=>{
  const css=read('public/src/styles.css');
  assert.match(css,/touch-playing #mobile-look\{z-index:1!important\}/);
  assert.match(css,/touch-playing #mobile-actions\{z-index:3\}/);
  assert.match(css,/touch-playing #mobile-move\{z-index:4\}/);
  assert.doesNotMatch(css,/touch-playing #mobile-look\{z-index:20!important\}/);
});
test('rapid fire tap shoots immediately and holding shoots until the correct pointer is released',()=>{
  const {game,node,mobile}=touchGame();
  const fire=node('m-fire');
  fire.emit('pointerdown',{pointerId:9});
  assert.equal(game.shots,1,'shot must not wait for a render frame');
  assert.equal(game.mouseDown,true);
  fire.emit('pointerdown',{pointerId:10});
  assert.equal(game.shots,1,'second finger must not trigger an extra shot');
  fire.emit('pointerup',{pointerId:10});
  assert.equal(game.mouseDown,true,'second finger must not cancel the first finger');
  fire.emit('pointerup',{pointerId:9});
  assert.equal(game.mouseDown,false);
  fire.emit('lostpointercapture',{pointerId:9});
  assert.equal(game.shots,1);
  fire.emit('pointerdown',{pointerId:11});
  assert.equal(game.shots,2);
  mobile.clear();
  assert.equal(game.mouseDown,false,'clearing mobile controls must stop firing');
  assert.equal(mobile.activeButtons.size,0);
});
test('responsive stick reacts to small thumb swipes without exceeding normalized speed',()=>{
  assert.deepEqual(responsiveJoystick(0,0),{x:0,y:0});
  const short=responsiveJoystick(0,.27);
  assert.ok(short.y>.27,'a modest swipe must get stronger response');
  const long=responsiveJoystick(.9,.9);
  assert.ok(Math.abs(Math.hypot(long.x,long.y)-1)<1e-9,'diagonal is capped at 1');
  const {node,mobile}=touchGame();
  node('mobile-move').emit('pointerdown',{pointerId:1,clientX:75,clientY:258});
  node('mobile-move').emit('pointermove',{pointerId:1,clientX:75,clientY:240});
  assert.ok(mobile.move.y>.29,'small upward swipe moves perceptibly');
  node('mobile-move').emit('pointerup',{pointerId:1});
  assert.deepEqual(mobile.move,{x:0,y:0});
});
test('touch physics compensates low frame rates, while desktop remains unchanged',()=>{
  const game=read('public/src/game.js'),parkour=read('public/src/parkour.js');
  assert.match(game,/Math\.min\(this\.mobile\?\.enabled \? \.09 : \.04,this\.clock\.getDelta\(\)\)/);
  assert.match(parkour,/mobile\?\.enabled&&this\.slide<=0\?\(isSprint\?1\.10:1\.18\):1/);
  assert.match(parkour,/stickMagnitude>\.72/);
  assert.match(game,/if\(this\.mouseDown\|\|this\.mobile\?\.isFiring\(\)\)this\.tryFire\(\)/);
});

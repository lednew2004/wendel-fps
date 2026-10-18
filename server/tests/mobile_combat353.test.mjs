import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MobileControls} from '../../public/src/mobile.js';
class Node{
  constructor(id){this.id=id;this.listeners={};this.style={};this.value='';this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(){}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  querySelector(){return new Node('ring');}
  querySelectorAll(){return [];}
  getBoundingClientRect(){return {left:0,top:180,width:155,height:155,right:155,bottom:335};}
  setPointerCapture(){}
}
function boot(){
  const nodes=new Map(),listeners=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
  globalThis.window={innerWidth:844,innerHeight:390,addEventListener(){}};
  globalThis.matchMedia=()=>({matches:true});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{maxTouchPoints:5}});
  globalThis.localStorage={getItem(){return null;},setItem(){}};
  globalThis.document={documentElement:{classList:{add(){},toggle(){}}},getElementById:node,addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},hidden:false};
  const game={state:'playing',mode:'survival',keys:{},mouseDown:false,rightDown:false,shots:0,
    look:{move(){return false;}},positionCamera(){},sensitivity:1,invertY:false,
    parkour:{jump(){},interact(){},crouch(){},toggleTrial(){return false;}},
    weapons:{reload(){}},dash(){},pulse(){},grenade(){},cycleWeapon(){},toast(){},
    tryFire(){this.shots++;return true;}};
  const mobile=new MobileControls(game);
  const overlay=new Node('look-overlay');
  const emit=(type,touches)=>{
    const event={target:overlay,changedTouches:touches.map(([identifier,clientX,clientY])=>({identifier,clientX,clientY,target:overlay})),preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
    for(const cb of listeners.get(type)??[])cb(event);
    return event;
  };
  return {mobile,game,emit,node};
}

test('touch trigger receives starts even when aim overlay is the event target',()=>{
  const {game,mobile,emit}=boot();
  const e=emit('touchstart',[[101,70,225]]);
  assert.equal(e.prevented,true);
  assert.equal(game.shots,1);
  assert.equal(game.mouseDown,true);
  assert.equal(mobile.isFiring(),true);
  emit('touchstart',[[102,650,210]]);
  assert.equal(game.shots,1,'second finger aiming cannot create extra shots');
  emit('touchend',[[102,650,210]]);
  assert.equal(game.mouseDown,true,'unrelated finger cannot release the trigger');
  game.mouseDown=false;
  assert.equal(mobile.isFiring(),true,'gameplay frame can still shoot despite unrelated mouseup');
  emit('touchend',[[101,70,225]]);
  assert.equal(mobile.isFiring(),false);
  assert.equal(game.mouseDown,false);
});

test('cancel and clear leave no stuck firing; quick subsequent taps still shoot',()=>{
  const {game,mobile,emit}=boot();
  emit('touchstart',[[10,40,245]]);
  emit('touchcancel',[[10,40,245]]);
  assert.equal(game.mouseDown,false);
  emit('touchstart',[[11,55,255]]);
  assert.equal(game.shots,2);
  mobile.clear();
  assert.equal(mobile.isFiring(),false);
  assert.equal(game.mouseDown,false);
});

test('version and combat loop are updated without requiring pointer lock on touch',()=>{
  const game=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../../public/src/styles.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
  assert.match(game,/this\.mouseDown\|\|this\.mobile\?\.isFiring\(\)/);
  assert.match(css,/html\.is-touch\.touch-playing #mobile-controls\{z-index:90!important\}/);
  assert.match(html,/BUILD 3\.8\.0/);
});

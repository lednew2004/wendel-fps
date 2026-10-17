import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../../public/src/mobile.js',import.meta.url),'utf8');
const {MobileControls}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
class FakeElement{
  constructor(id){this.id=id;this.style={};this.handlers={};this.classList={add(){},remove(){},toggle(){}};this.value='';this.textContent='';}
  setAttribute(){}
  addEventListener(event,fn){(this.handlers[event]??=[]).push(fn);}
  emit(event,props={}){for(const fn of this.handlers[event]??[])fn({pointerType:'touch',clientX:0,clientY:0,pointerId:1,preventDefault(){},stopPropagation(){},target:this,...props});}
  setPointerCapture(){}
  querySelector(){return this.ring??=new FakeElement('ring');}
  querySelectorAll(){return [];}
  getBoundingClientRect(){return {left:0,top:180,width:155,height:155};}
}

function setup(){
  const events={};const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,new FakeElement(id));return nodes.get(id);};
  globalThis.matchMedia=()=>({matches:true});
  globalThis.document={documentElement:{classList:{add(){},toggle(){}}},
    getElementById:node,addEventListener:(type,cb)=>{(events[type]??=[]).push(cb);},hidden:false};
  globalThis.window={innerWidth:844,innerHeight:390,addEventListener(){}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{maxTouchPoints:5}});
  const stored={};
  globalThis.localStorage={getItem:key=>stored[key]??null,setItem:(key,value)=>{stored[key]=value;}};
  const moveRecords=[];
  const game={state:'playing',mode:'multiplayer',keys:{},look:{armed:false,move(dx,dy,sens){moveRecords.push({dx,dy,sens});return true;}},
    sensitivity:1,invertY:false,positionCamera(){},parkour:{jump(){},interact(){},crouch(){}},dash(){},weapons:{reload(){},switchTo(){},state:[1,2,3,4]},toast(){}};
  const mobile=new MobileControls(game);
  const emitDoc=(type,props)=>{for(const cb of events[type]??[])cb({pointerType:'touch',preventDefault(){},clientX:0,clientY:0,pointerId:1,target:node('mobile-look'),...props});};
  return {mobile,game,node,emitDoc,moveRecords,stored};
}

test('mobile camera: faster right swipe, simultaneous moving, saved sensitivity',()=>{
  const {mobile,node,emitDoc,moveRecords,stored}=setup();
  assert.equal(mobile.touchSensitivity,3.3);
  emitDoc('pointerdown',{pointerId:101,clientX:620,clientY:120});
  emitDoc('pointermove',{pointerId:101,clientX:645,clientY:118});
  assert.equal(moveRecords.length,1);
  assert.ok(moveRecords[0].dx>25*3.3,'swipe receives acceleration and higher base sensitivity');
  const pad=node('mobile-move');
  pad.emit('pointerdown',{pointerId:102,clientX:76,clientY:280});
  pad.emit('pointermove',{pointerId:102,clientX:109,clientY:247});
  assert.ok(mobile.move.x>0.4);
  assert.ok(mobile.move.y>0.4);
  emitDoc('pointermove',{pointerId:101,clientX:677,clientY:119});
  assert.equal(moveRecords.length,2,'look and movement remain independent');
  node('mp-touch-sensitivity').emit('input',{target:{value:'4.6'}});
  assert.equal(mobile.touchSensitivity,4.6);
  assert.equal(stored['titan-touch-sensitivity'],'4.6');
  assert.equal(node('touch-sensitivity').value,'4.6');
  pad.emit('pointerup',{pointerId:102});
  assert.equal(mobile.move.x,0);
  assert.equal(mobile.move.y,0);
});

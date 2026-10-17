import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAP_HALF,projectPlayer,MultiplayerMinimap} from '../../public/src/minimap.js';

function testDOM(){
  const paths=[];
  const ctx=new Proxy({}, {get(target,key){if(key in target)return target[key];return (...args)=>{paths.push({op:String(key),args});};},set(target,key,value){target[key]=value;return true;}});
  const visible=new Set(['hidden']);
  const node={classList:{contains:c=>visible.has(c),remove:c=>visible.delete(c),add:c=>visible.add(c)}};
  const canvas={getContext:()=>ctx};
  const count={textContent:''};
  const elements={'mp-minimap':node,'mp-minimap-canvas':canvas,'mp-minimap-count':count};
  const before=globalThis.document;
  globalThis.document={getElementById:id=>elements[id],createElement:()=>({getContext:()=>ctx})};
  return {paths,node,count,restore:()=>{globalThis.document=before;}};
}

test('fixed city map covers the full multiplayer boundary, not just nearby players',()=>{
  assert.equal(MAP_HALF,143);
  assert.deepEqual(projectPlayer(0,0),{x:120,y:120});
  assert.ok(projectPlayer(-143,0).x<=16);
  assert.ok(projectPlayer(143,0).x>=224);
  assert.ok(projectPlayer(0,-143).y<=16);
  assert.ok(projectPlayer(0,143).y>=224);
  assert.ok(projectPlayer(9999,0).x<=225);
});

test('minimap draws all remote players and the local direction indicator',()=>{
  const ui=testDOM();
  try{
    const game={urban:{solids:[{x:25,z:35,hx:9,hz:10}]},parkour:{x:0,z:0},yaw:Math.PI/4};
    const radar=new MultiplayerMinimap(game);
    radar.show();
    radar.draw([
      {id:'me',name:'EU',x:0,z:0,alive:true},
      {id:'away-left',name:'Joana',x:-140,z:-137,alive:true},
      {id:'away-right',name:'Carlos',x:139,z:140,alive:true},
      {id:'dead',name:'Amigo',x:65,z:44,alive:false}
    ],'me');
    assert.equal(ui.count.textContent,'4');
    assert.equal(ui.node.classList.contains('hidden'),false);
    const dots=ui.paths.filter(p=>p.op==='arc');
    assert.ok(dots.length>=4); // three remote markers + local indicator
    const left=dots.find(p=>p.args[0]<25&&p.args[1]<25);
    const right=dots.find(p=>p.args[0]>210&&p.args[1]>210);
    assert.ok(left,'remote at far northwest must not disappear');
    assert.ok(right,'remote at far southeast must not disappear');
    const rotate=ui.paths.find(p=>p.op==='rotate');
    assert.ok(rotate);
    assert.ok(Math.abs(rotate.args[0]+Math.PI/4)<.001);
    radar.hide();assert.equal(ui.node.classList.contains('hidden'),true);
  }finally{ui.restore();}
});

test('multiplayer radar is visible only in multiplayer and never intercepts phone touches',()=>{
  const css=readFileSync(new URL('../../public/src/styles.css',import.meta.url),'utf8');
  const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
  const game=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
  const multiplayer=readFileSync(new URL('../../public/src/multiplayer.js',import.meta.url),'utf8');
  assert.match(css,/#mp-minimap\{[\s\S]*?pointer-events:none/);
  assert.match(css,/@media \(pointer:coarse\) and \(orientation:landscape\)\{\s*#mp-minimap/);
  assert.match(html,/id="mp-minimap-canvas"/);
  assert.match(game,/this\.multiplayer\?\.drawMinimap\(\);return;/);
  assert.match(multiplayer,/this\.minimap\.show\(\)/);
  assert.match(multiplayer,/this\.minimap\.hide\(\)/);
  for(const id of ['mp-name-clear','mp-code-clear','mp-room-open','mp-copy']) assert.ok(html.includes(`id="${id}"`));
});

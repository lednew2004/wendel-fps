import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const uiFile=new URL('../../public/src/multiplayer.js',import.meta.url);
const source=readFileSync(uiFile,'utf8')
  .replace(/^import \* as THREE from 'three';/m, 'const THREE={};')
  .replace("import {vaultPosition} from './vaultTraversal.js';",'const vaultPosition=()=>({x:0,y:0,z:0});')
  .replace("import {MultiplayerMinimap} from './minimap.js';", 'class MultiplayerMinimap {show(){} hide(){} draw(){}}')
  .replace("import {createOperative,animateOperative,disposeOperative} from './characters.js';", 'const createOperative=()=>({});const animateOperative=()=>{};const disposeOperative=()=>{};')
  .replace("import {colorForName} from './characterIdentity.js';", 'const colorForName=()=>0x59dce8;')
  .replace("import {heroById} from './heroRoster.js';", "const heroById=()=>({role:'player',color:0x59dce8});");
const {MultiplayerClient}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));

class FakeClassList {
  constructor(initial=[]){this.classes=new Set(initial);}
  add(...xs){xs.forEach(x=>this.classes.add(x));}
  remove(...xs){xs.forEach(x=>this.classes.delete(x));}
  contains(x){return this.classes.has(x);}
  toggle(x,force){if(force===undefined)force=!this.contains(x);force?this.add(x):this.remove(x);return force;}
}
class FakeElement {
  constructor(){this.value='';this.textContent='';this.classList=new FakeClassList(['hidden']);this.handlers={};this.items=[];}
  addEventListener(event,cb){(this.handlers[event]??=[]).push(cb);}
  click(){for(const cb of this.handlers.click??[])cb({});}
  setAttribute(){}
  focus(){}
  select(){}
  replaceChildren(...items){this.items=items;}
}

const keys=['mp-server','mp-open','mp-close','mp-create','mp-join','mp-copy','mp-name','mp-name-clear','mp-code','mp-code-clear',
  'mp-status','multiplayer-lobby','mp-hud','mp-room-panel','mp-room-code-input','mp-room-resume',
  'mp-room-open','mp-room-close','mp-room-leave','mp-share','mp-share-status',
  'mp-count','mp-roster-count','mp-scores','mp-respawn'];

function createEnvironment(){
  const elements=Object.fromEntries(keys.map(key=>[key,new FakeElement()]));
  const writes=[];const events=[];
  globalThis.document={
    getElementById:id=>elements[id],
    activeElement:{id:'viewport'},
    pointerLockElement:{id:'game-canvas'},
    exitPointerLock(){this.pointerLockElement=null;events.push('unlock');},
    createElement:()=>new FakeElement(),
    body:{appendChild(){}},
  };
  globalThis.window={location:{pathname:'/jogar/index.html',origin:'https://game.onrender.com'},confirm:()=>true};
  globalThis.location={search:''};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>writes.push(text)}}});
  const game={mode:'multiplayer',state:'playing',mouseDown:true,rightDown:true,
    setState(x){this.state=x;events.push(x);},requestLock(){events.push('lock');},mobile:{clear(){events.push('clear');},sync(){}},menu(){events.push('menu');}};
  const client=new MultiplayerClient(game);
  client.room='AB12CD';client.connected=true;client.id='me';
  client.players=[{id:'me',name:'Teste',kills:2},{id:'other',name:'Amigo',kills:1}];
  client.updateScore();
  return {client,elements,events,writes,game};
}

test('room button opens an accessible room panel without disconnecting multiplayer',()=>{
  const {client,elements,events,game}=createEnvironment();
  elements['mp-room-open'].click();
  assert.equal(client.connected,true);
  assert.equal(client.panelOpen,true);
  assert.equal(game.state,'paused');
  assert.equal(elements['mp-room-panel'].classList.contains('hidden'),false);
  assert.equal(elements['mp-hud'].classList.contains('hidden'),true);
  assert.equal(elements['mp-room-code-input'].value,'AB12CD');
  assert.equal(elements['mp-count'].textContent,'2/8');
  assert.equal(elements['mp-scores'].items.length,2);
  assert.ok(events.includes('unlock'));
  assert.ok(!events.includes('menu'));
});

test('copy and invite use code/link and returning to game restores controls',async()=>{
  const {client,elements,writes,events,game}=createEnvironment();
  client.openRoomPanel();
  await client.copyRoomCode();
  assert.equal(writes.at(-1),'AB12CD');
  assert.match(elements['mp-share-status'].textContent,/COPIADO/);
  await client.shareRoomInvite();
  assert.match(writes.at(-1),/https:\/\/game\.onrender\.com\/jogar\/index\.html\?room=AB12CD/);
  elements['mp-room-resume'].click();
  assert.equal(client.panelOpen,false);
  assert.equal(client.connected,true);
  assert.equal(game.state,'playing');
  assert.ok(events.includes('lock'));
  assert.ok(!events.includes('menu'));
});

test('leaving room is an explicit action and returns to menu',()=>{
  const {client,elements,events}=createEnvironment();
  client.openRoomPanel();
  elements['mp-room-leave'].click();
  assert.equal(client.connected,false);
  assert.equal(client.panelOpen,false);
  assert.ok(events.includes('menu'));
});

test('game pause delegates to room panel rather than disconnect',()=>{
  const gameSource=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
  assert.match(gameSource,/pause\(\)\{[^}]*this\.mode==='multiplayer'\)\{this\.multiplayer\.openRoomPanel\(\);return;/);
  assert.match(gameSource,/resume\(\)\{[^}]*this\.multiplayer\.closeRoomPanel\(\)/);
});


test('lobby clear buttons erase nickname and room code without changing multiplayer state',()=>{
  const {elements,client}=createEnvironment();
  elements['mp-name'].value='Pessoa 12';
  elements['mp-code'].value='ABC123';
  elements['mp-name-clear'].click();
  assert.equal(elements['mp-name'].value,'');
  elements['mp-code-clear'].click();
  assert.equal(elements['mp-code'].value,'');
  assert.equal(client.connected,true);
});

test('creating a room keeps the exact custom code and validates it without silently modifying input',()=>{
  const {elements,client}=createEnvironment();
  elements['mp-code'].value='ab12cd';
  elements['mp-name'].value='Eu';
  let sent=null;
  client.url=()=> 'ws://localhost/ws';
  client.connected=false;
  const originalDisconnect=client.disconnect.bind(client);
  client.disconnect=()=>{};
  // A fake WebSocket captures the join message when the server handshake opens.
  const previous=globalThis.WebSocket;
  class FakeWebSocket {
    constructor(){this.events={};FakeWebSocket.last=this;}
    addEventListener(name,fn){this.events[name]=fn;}
    send(raw){sent=JSON.parse(raw);}
    close(){}
  }
  globalThis.WebSocket=FakeWebSocket;
  try{
    client.connect(true);
    assert.equal(elements['mp-code'].value,'AB12CD');
    FakeWebSocket.last.events.open();
    assert.equal(sent.create,true);
    assert.equal(sent.room,'AB12CD');
    client.stopKeepAlive();
    client.socket=null;
    FakeWebSocket.last.events.close(); // clears the connection timeout, without reconnecting
    client.disconnect=originalDisconnect;
  }finally{globalThis.WebSocket=previous;client.stopKeepAlive();}
});

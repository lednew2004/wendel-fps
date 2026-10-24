import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';

process.env.PORT='0';
const {server,rooms,players}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const connections=[];

function onceType(ws,type,timeout=3500){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.removeEventListener('message',onMessage);reject(new Error('Esperando '+type));},timeout);
    const onMessage=e=>{
      let data;try{data=JSON.parse(e.data);}catch{return;}
      if(data.type!==type)return;
      clearTimeout(timer);ws.removeEventListener('message',onMessage);resolve(data);
    };
    ws.addEventListener('message',onMessage);
  });
}
async function connect(){
  const ws=new WebSocket(url); connections.push(ws);
  await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true});});
  return ws;
}
function send(ws,obj){ws.send(JSON.stringify(obj));}
async function waitUntil(fn,timeout=1200){
  const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw new Error('Timeout aguardando estado do servidor');await new Promise(r=>setTimeout(r,10));}
}
async function close(ws){
  if(ws.readyState>=WebSocket.CLOSING)return;
  const done=new Promise(resolve=>ws.addEventListener('close',resolve,{once:true}));
  ws.close();await done;
}

test('three players preserve room, stable ID, score after two drop/reconnect',async t=>{
  t.after(async()=>{await Promise.all(connections.map(async ws=>{try{await close(ws);}catch{}}));await new Promise(res=>server.close(res));});
  const sessions=['titan-session-reconnect-aaaaaaaaaa','titan-session-reconnect-bbbbbbbbbb','titan-session-reconnect-cccccccccc'];
  const [a,b,c]=await Promise.all([connect(),connect(),connect()]);
  const aWelcome=onceType(a,'welcome');send(a,{type:'join',create:true,name:'A',session:sessions[0]});
  const first=await aWelcome;const room=first.room;
  const bWelcome=onceType(b,'welcome');send(b,{type:'join',room,name:'B',session:sessions[1]});const second=await bWelcome;
  const cWelcome=onceType(c,'welcome');send(c,{type:'join',room,name:'C',session:sessions[2]});const third=await cWelcome;
  assert.equal(rooms.get(room).players.size,3);
  assert.equal(players.size,3);
  const oldB=rooms.get(room).players.get(second.id),oldC=rooms.get(room).players.get(third.id);
  oldB.kills=5;oldB.deaths=2;oldC.kills=1;

  // Network drops, not explicit leave: slot retained for reconnect grace.
  await Promise.all([close(b),close(c)]);
  await waitUntil(()=>players.size===1);
  assert.equal(players.size,1);
  assert.equal(rooms.get(room).players.size,3);
  const pong=onceType(a,'pong');send(a,{type:'ping',t:123});assert.equal((await pong).t,123);

  const [b2,c2]=await Promise.all([connect(),connect()]);
  const wB=onceType(b2,'welcome'),wC=onceType(c2,'welcome');
  send(b2,{type:'join',room,name:'B',session:sessions[1]});
  send(c2,{type:'join',room,name:'C',session:sessions[2]});
  const [rB,rC]=await Promise.all([wB,wC]);
  assert.equal(rB.id,second.id);assert.equal(rC.id,third.id);
  assert.equal(rB.resumed,true);assert.equal(rC.resumed,true);
  assert.equal(rB.players.find(p=>p.id===second.id).kills,5);
  assert.equal(rooms.get(room).players.size,3);assert.equal(players.size,3);
  const snapshot=onceType(a,'snapshot');assert.equal((await snapshot).players.length,3);
  
  // Every player disconnects temporarily, then the original host can restore the room.
  await Promise.all([close(a),close(b2),close(c2)]);
  await waitUntil(()=>players.size===0);
  assert.equal(players.size,0);assert.ok(rooms.has(room));
  const a2=await connect(),resume=onceType(a2,'welcome');
  send(a2,{type:'join',room,name:'A',session:sessions[0]});
  assert.equal((await resume).id,first.id);
  assert.equal(players.size,1);
  const leave=onceType(a2,'snapshot');await leave;
  // Explicit leaving removes the player and releases a room with no retained sessions.
  const solo=await connect(),w=onceType(solo,'welcome');send(solo,{type:'join',create:true,name:'S',session:'titan-session-explicit-leave-001'});const welcome=await w;
  await new Promise(res=>{solo.addEventListener('close',res,{once:true});send(solo,{type:'leave'});});
  await waitUntil(()=>!rooms.has(welcome.room));
  assert.equal(rooms.has(welcome.room),false);
});

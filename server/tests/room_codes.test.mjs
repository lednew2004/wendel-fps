import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';

process.env.PORT='0';
const {server,rooms}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const sockets=[];
async function connect(){
  const socket=new WebSocket(url);sockets.push(socket);
  await new Promise((resolve,reject)=>{
    socket.addEventListener('open',resolve,{once:true});
    socket.addEventListener('error',reject,{once:true});
  });
  return socket;
}
function next(ws,kind,timeout=2000){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.removeEventListener('message',listener);reject(new Error(`No ${kind}`));},timeout);
    const listener=e=>{
      let data;try{data=JSON.parse(e.data);}catch{return;}
      if(data.type===kind){clearTimeout(timer);ws.removeEventListener('message',listener);resolve(data);}
    };
    ws.addEventListener('message',listener);
  });
}
function send(ws,obj){ws.send(JSON.stringify(obj));}
test('custom room code, join existing, code collisions, invalid code, and auto-generated code',async t=>{
  t.after(async()=>{
    for(const ws of sockets)try{ws.close();}catch{}
    await new Promise(resolve=>server.close(resolve));
  });

  const a=await connect();const w1=next(a,'welcome');
  send(a,{type:'join',create:true,room:'c0d3a1',name:'Host'});
  const room=await w1;
  assert.equal(room.room,'C0D3A1');
  assert.ok(rooms.has('C0D3A1'));

  const b=await connect();const w2=next(b,'welcome');
  send(b,{type:'join',create:false,room:'c0d3a1',name:'Amigo'});
  const guest=await w2;
  assert.equal(guest.room,'C0D3A1');
  assert.equal(guest.players.length,2);

  const c=await connect();const duplicate=next(c,'error');
  send(c,{type:'join',create:true,room:'C0D3A1',name:'Intruso'});
  assert.match((await duplicate).message,/já está em uso/i);
  assert.equal(rooms.size,1);

  const malformed=next(c,'error');
  send(c,{type:'join',create:true,room:'BAD!',name:'Teste'});
  assert.match((await malformed).message,/6 letras ou números/i);
  assert.equal(rooms.size,1);

  const automatic=next(c,'welcome');
  send(c,{type:'join',create:true,room:'',name:'Automático'});
  const random=await automatic;
  assert.match(random.room,/^[A-F0-9]{6}$/);
  assert.notEqual(random.room,'C0D3A1');
  assert.equal(rooms.size,2);
});

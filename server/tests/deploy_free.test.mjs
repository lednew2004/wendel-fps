import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
process.env.PORT='0';
const {server}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
test('same-origin free deployment serves game, assets and health endpoints',async t=>{
  t.after(()=>server.close());
  const [index,css,model,health,compat]=await Promise.all([
    fetch(base+'/'),fetch(base+'/src/styles.css'),fetch(base+'/assets/models/forklift.glb'),
    fetch(base+'/health'),fetch(base+'/api/health')
  ]);
  assert.equal(index.status,200);
  assert.match(await index.text(),/TITAN PROTOCOL/);
  assert.equal(css.status,200);
  assert.match(css.headers.get('content-type')||'',/text\/css/);
  assert.equal(model.status,200);
  assert.match(model.headers.get('content-type')||'',/model\/gltf-binary/);
  assert.equal(health.status,200);
  assert.equal(compat.status,200);
  assert.equal((await compat.json()).ok,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(relative)=>fs.readFileSync(new URL('../../'+relative,import.meta.url),'utf8');
const mapOf=(file)=>{
  const html=read('public/'+file);
  const json=html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json, `${file}: importmap presente`);
  return JSON.parse(json).imports;
};
test('4.2.1: game, WebGPU e comparativo importam Three.js local',()=>{
 for(const name of ['index.html','webgpu-lab.html','comparativo-grafico.html']){
   const imp=mapOf(name);
   for(const alias of ['three','three/addons/','three/webgpu','three/tsl','three/core']){
     assert.match(imp[alias], /^\/vendor\/three\//,`${name}: ${alias}`);
   }
 }
});
test('4.2.1: instala Three.js 0.180.0 com lockfile e integra rota local',()=>{
 const pkg=JSON.parse(read('package.json'));
 const lock=JSON.parse(read('package-lock.json'));
 assert.equal(pkg.dependencies.three,'0.180.0');
 assert.equal(lock.packages['node_modules/three'].version,'0.180.0');
 assert.equal(lock.packages[''].dependencies.three,'0.180.0');
 const s=read('server/server.mjs');
 assert.match(s,/relative.startsWith\('\/vendor\/three\/'\)/);
 assert.match(s,/!abs.startsWith\(targetRoot\+path.sep\)/);
 assert.match(read('render.yaml'),/buildCommand: npm ci/);
});
test('4.2.1: carregamento mostra falha em vez de culpar internet indistintamente',()=>{
 const html=read('public/index.html');
 assert.match(html,/__titanReportBootError/);
 assert.match(html,/unhandledrejection/);
 assert.doesNotMatch(html,/O motor 3D não carregou\. Verifique sua conexão com a internet/);
});

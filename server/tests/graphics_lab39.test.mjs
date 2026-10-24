import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const file=f=>readFileSync(new URL('../../'+f,import.meta.url),'utf8');
test('3.9: o motor do jogo continua Three.js, com a cidade instanciada separada da fisica',()=>{
 const lab=file('public/src/graphicsLab39.js'),world=file('public/src/world.js'),city=file('public/src/squadWorld.js');
 assert.match(lab,/InstancedMesh/);
 assert.match(lab,/new THREE\.MeshStandardMaterial/);
 assert.match(lab,/TITAN_GRAPHICS_LAB_39/);
 assert.doesNotMatch(lab,/\.solids\.push|\.rayTargets\.push|\.addSolid\(/);
 assert.doesNotMatch(lab,/new THREE\.PointLight|new THREE\.SpotLight/);
 assert.match(city,/installGraphicsLab39\(city\)/);
 assert.match(world,/setGraphicsLabEnabled\(enabled\)/);
});
test('3.9: alternar A/B nao afeta comandos de tiro, poderes e movimento',()=>{
 const ui=file('public/src/graphicsLabControls39.js');
 assert.match(ui,/F8/);
 assert.doesNotMatch(ui,/KeyG|KeyX|Digit1|Digit2|Digit3/);
 assert.match(ui,/setGraphicsLabEnabled/);
 assert.match(file('public/src/main.js'),/installGraphicsLabControls39\(game\)/);
});
test('3.9: comparador separado, inicializador localhost e material documentado',()=>{
 assert.ok(existsSync(new URL('../../INICIAR_LOCALHOST_WINDOWS.bat',import.meta.url)));
 assert.ok(existsSync(new URL('../../TESTAR_GRAFICOS_LOCALHOST.md',import.meta.url)));
 const comparison=file('public/comparativo-grafico.html');
 assert.match(comparison,/three-canvas/);
 assert.match(comparison,/pc-canvas/);
 assert.match(comparison,/playcanvas@2\.23\.3/);
 assert.match(file('public/index.html'),/BUILD 3\.9\.1/);
});

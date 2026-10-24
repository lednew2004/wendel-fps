import {Game} from './game.js';
import {installGraphicsLabControls39} from './graphicsLabControls39.js';
import {installSkinnedOperativeRuntime} from './skinnedOperatives.js';
try{
  installSkinnedOperativeRuntime();
  const game=new Game();
  installGraphicsLabControls39(game);
  clearTimeout(window.__titanBootTimer);
}catch(err){
  console.error('Falha ao iniciar TITAN PROTOCOL:',err);
  const box=document.getElementById('loading');box.classList.remove('hidden');box.classList.add('error');
  document.getElementById('loading-status').textContent='FALHA AO INICIAR TITAN PROTOCOL: '+String(err?.message||err)+' · Abra F12 → Console para detalhes.';
}

import {Game} from './game.js';
try{
  new Game();
  clearTimeout(window.__titanBootTimer);
}catch(err){
  console.error('Falha ao iniciar TITAN PROTOCOL:',err);
  const box=document.getElementById('loading');box.classList.remove('hidden');box.classList.add('error');
  document.getElementById('loading-status').textContent='FALHA AO INICIAR TITAN PROTOCOL: '+String(err?.message||err)+' · Abra F12 → Console para detalhes.';
}

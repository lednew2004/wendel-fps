import {Game} from './game.js';
try{
  new Game();
  clearTimeout(window.__titanBootTimer);
}catch(err){
  console.error('Falha ao iniciar TITAN PROTOCOL:',err);
  const box=document.getElementById('loading');box.classList.remove('hidden');box.classList.add('error');document.getElementById('loading-status').textContent='ERRO AO INICIAR O MOTOR 3D. Verifique se o navegador suporta WebGL e se o Three.js carregou pela internet.';
}

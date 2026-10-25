import {Game} from './game.js';
import {EntryFlow} from './entryFlow.js';
import {installGraphicsLabControls39} from './graphicsLabControls39.js';
import {installSkinnedOperativeRuntime} from './skinnedOperatives.js';
try{
  installSkinnedOperativeRuntime();
  const game=new Game();
  new EntryFlow(game);
  installGraphicsLabControls39(game);
  clearTimeout(window.__titanBootTimer);
  window.__titanBootReady=true;
}catch(err){
  console.error('Falha ao iniciar TITAN PROTOCOL:',err);
  document.getElementById('loading')?.classList.remove('hidden');
  window.__titanReportBootError?.(err?.message || String(err));
}

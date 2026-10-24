/** A/B compositor for the actual match. F8 is intentionally chosen to avoid
 * existing character keys such as G (grenade), 1/2/3 (powers), and P. */
export function installGraphicsLabControls39(game){
  const world=game.world;
  const button=document.createElement('button');
  button.type='button';button.id='titan-graphics-ab';
  button.setAttribute('aria-label','Alternar gráficos originais e versão experimental');
  button.title='Comparar gráficos (F8)';
  button.style.cssText='position:fixed;z-index:42;right:12px;top:88px;min-height:32px;padding:6px 11px;border-radius:2px;border:1px solid #7adcef88;background:#081722df;color:#c9f5ff;font:700 11px system-ui,sans-serif;letter-spacing:.4px;cursor:pointer;touch-action:manipulation;box-shadow:0 4px 14px #0006;';
  document.body.appendChild(button);
  function update(){button.textContent=world.graphicsLabEnabled?'3.9.1 · CINEMATICO':'VISUAL ORIGINAL';button.style.borderColor=world.graphicsLabEnabled?'#61e8d6':'#d5a75f';}
  function toggle(){world.setGraphicsLabEnabled(!world.graphicsLabEnabled);update();}
  button.addEventListener('click',event=>{event.stopPropagation();toggle();});
  button.addEventListener('pointerdown',event=>event.stopPropagation());
  button.addEventListener('touchstart',event=>event.stopPropagation(),{passive:true});
  window.addEventListener('keydown',event=>{if(event.code!=='F8'||event.repeat)return;event.preventDefault();event.stopImmediatePropagation();toggle();},true);
  update();
  return {button,toggle};
}

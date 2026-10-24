/** Controls for the FPS must never intercept keystrokes intended for text fields. */
export function isTypingIntoField(target){
  if(!target)return false;
  if(target.isContentEditable)return true;
  if(['INPUT','TEXTAREA','SELECT'].includes(String(target.tagName||'').toUpperCase()))return true;
  return Boolean(target.closest?.('[contenteditable="true"], [contenteditable=""]'));
}

/**
 * TAB belongs to the radial wheel only during an active game or while that wheel
 * is displayed. Never intercept text editing, other screens or browser hotkeys.
 * Call on both keydown and keyup so the browser never advances focus mid-game.
 * Repeated keydowns and keyup MUST NOT toggle the panel.
 */
export function handlePowerWheelTab(event, gameState, menuMode, activeElement, toggle){
  if(event?.code!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return false;
  if(isTypingIntoField(event.target)||isTypingIntoField(activeElement))return false;
  if(gameState!=='playing'&&menuMode!=='wheel')return false;
  event.preventDefault();
  event.stopPropagation?.();
  if(event.type==='keydown'&&!event.repeat)toggle?.();
  return true;
}

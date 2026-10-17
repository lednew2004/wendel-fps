/** Controls for the FPS must never intercept keystrokes intended for text fields. */
export function isTypingIntoField(target){
  if(!target)return false;
  if(target.isContentEditable)return true;
  if(['INPUT','TEXTAREA','SELECT'].includes(String(target.tagName||'').toUpperCase()))return true;
  return Boolean(target.closest?.('[contenteditable="true"], [contenteditable=""]'));
}

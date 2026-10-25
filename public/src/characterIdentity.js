// TITAN PROTOCOL — facções e silhuetas. Dados independentes de WebGL para teste.
export const CHARACTER_STYLES = Object.freeze({
  scout:  {name:'CORREDOR RUBRO', uniform:0x0f141a, armor:0x090c11, accent:0xff6556, helmet:0x181e26, skin:0xb88970, build:.91, visor:true},
  gunner: {name:'VANGUARDA',uniform:0x12150f, armor:0x0b0e10, accent:0xffc765, helmet:0x1a1d20, skin:0x946d54, build:1.06, visor:false},
  sniper: {name:'VIGIA AZUL',uniform:0x101722, armor:0x090d13, accent:0x75d6ff, helmet:0x182434, skin:0xa77c60, build:.91, visor:true, scope:true},
  hunter: {name:'CAÇADOR',uniform:0x0f1711, armor:0x0a0f0b, accent:0xa8f56b, helmet:0x1b261d, skin:0xb08a6d, build:.87, visor:true, hood:true},
  tank:   {name:'COLOSSO',uniform:0x171412, armor:0x0c0d0f, accent:0xffab69, helmet:0x202226, skin:0x98765a, build:1.28, heavy:true},
  boss:   {name:'COMANDANTE TITÃ',uniform:0x17111f, armor:0x0a0911, accent:0xfb67ff, helmet:0x221a2d, skin:0x8c6b66, build:1.2, heavy:true, commander:true},
  player: {name:'OPERADOR TITAN',uniform:0x343f4c, armor:0x202e3a, accent:0x59dce8, helmet:0x202936, skin:0xad8268, build:1, visor:true}
});
export function characterStyle(role='scout',tint){
  const style=CHARACTER_STYLES[role]||CHARACTER_STYLES.scout;
  return tint==null?style:{...style,accent:tint};
}
export function colorForName(name='Operador'){
  let h=2166136261;
  for(const ch of String(name)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return [0x57dce6,0xf3b45c,0xd782e2,0x7fe3a6,0xf77c73,0x8daeff][(h>>>0)%6];
}

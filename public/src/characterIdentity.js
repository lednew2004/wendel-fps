// TITAN PROTOCOL — facções e silhuetas. Dados independentes de WebGL para teste.
export const CHARACTER_STYLES = Object.freeze({
  scout:  {name:'CORREDOR RUBRO', uniform:0x713b44, armor:0x292d38, accent:0xff614d, helmet:0x262d36, skin:0xb88970, build:.91, visor:true},
  gunner: {name:'VANGUARDA',uniform:0x686751, armor:0x30383a, accent:0xf0b756, helmet:0x373b36, skin:0x946d54, build:1.06, visor:false},
  sniper: {name:'VIGIA AZUL',uniform:0x324c62, armor:0x26343f, accent:0x79ccf4, helmet:0x202f41, skin:0xa77c60, build:.91, visor:true, scope:true},
  hunter: {name:'CAÇADOR',uniform:0x405747, armor:0x273630, accent:0x9bd66a, helmet:0x304639, skin:0xb08a6d, build:.87, visor:true, hood:true},
  tank:   {name:'COLOSSO',uniform:0x655346, armor:0x3e4145, accent:0xffa65c, helmet:0x393c40, skin:0x98765a, build:1.28, heavy:true},
  boss:   {name:'COMANDANTE TITÃ',uniform:0x553b54, armor:0x333043, accent:0xed68fe, helmet:0x28283a, skin:0x8c6b66, build:1.2, heavy:true, commander:true},
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

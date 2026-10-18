// TITAN PROTOCOL — facções e silhuetas. Dados independentes de WebGL para teste.
export const CHARACTER_STYLES = Object.freeze({
  scout:  {name:'NEON RUNNER', uniform:0x41273d, armor:0x1f2430, accent:0xff4db8, helmet:0x1d2430, skin:0xb88970, build:.91, visor:true},
  gunner: {name:'CHROME VANGUARD',uniform:0x5b5647, armor:0x2c3139, accent:0xffbf4d, helmet:0x2b3037, skin:0x946d54, build:1.06, visor:false},
  sniper: {name:'GLASS PHANTOM',uniform:0x214b5b, armor:0x1d2b38, accent:0x53e9ff, helmet:0x162532, skin:0xa77c60, build:.91, visor:true, scope:true},
  hunter: {name:'VOID STALKER',uniform:0x2e4d37, armor:0x21322a, accent:0x8fff61, helmet:0x23352b, skin:0xb08a6d, build:.87, visor:true, hood:true},
  tank:   {name:'IRON COLOSSUS',uniform:0x5f4238, armor:0x343a42, accent:0xff7c48, helmet:0x343840, skin:0x98765a, build:1.28, heavy:true},
  boss:   {name:'TITAN OVERSEER',uniform:0x472a57, armor:0x28273b, accent:0xcc63ff, helmet:0x222438, skin:0x8c6b66, build:1.2, heavy:true, commander:true},
  player: {name:'TITAN OPERATIVE',uniform:0x283646, armor:0x182230, accent:0x43efff, helmet:0x152130, skin:0xad8268, build:1, visor:true}
});
export function characterStyle(role='scout',tint){
  const style=CHARACTER_STYLES[role]||CHARACTER_STYLES.scout;
  return tint==null?style:{...style,accent:tint};
}
export function colorForName(name='Operador'){
  let h=2166136261;
  for(const ch of String(name)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return [0x43efff,0xffbf4d,0xcc63ff,0x8fff61,0xff7c48,0xff4db8][(h>>>0)%6];
}

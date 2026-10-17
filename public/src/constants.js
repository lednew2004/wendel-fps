export const MAP_HALF = 72;
export const PLAYER_HEIGHT = 1.75;
export const WEAPONS = [
  {id:'rifle',name:'M4A1',sub:'RIFLE DE ASSALTO',type:'5.56MM · AUTOMÁTICA',clip:30,reserve:210,damage:20,interval:.09,reload:1.6,spread:.008,pellets:1,range:100,recoil:.055,color:0x9fb0b7},
  {id:'shotgun',name:'M870',sub:'ESCOPETA TÁTICA',type:'12 GAUGE · IMPACTO',clip:8,reserve:56,damage:12,interval:.72,reload:2.0,spread:.07,pellets:9,range:30,recoil:.20,color:0xb89c76},
  {id:'rail',name:'M24',sub:'RIFLE DE PRECISÃO',type:'7.62MM · PRECISÃO',clip:5,reserve:35,damage:135,interval:1.15,reload:2.25,spread:.001,pellets:1,range:145,recoil:.26,color:0x8ca4b8},
  {id:'helios',name:'M249',sub:'METRALHADORA LEVE',type:'5.56MM · SUPRESSÃO',clip:75,reserve:300,damage:14,interval:.068,reload:2.9,spread:.02,pellets:1,range:95,recoil:.038,color:0x9a9483}
];
export const ENEMY_TYPES = {
  scout:{hp:60,speed:6.0,damage:9,range:2.15,fire:1.1,points:110,radius:.65,color:0xc66d54,scale:.82},
  gunner:{hp:118,speed:3.2,damage:9,range:24,fire:1.6,points:180,radius:.83,color:0xb69a5e,scale:1},
  sniper:{hp:90,speed:2.7,damage:23,range:48,fire:3.15,points:290,radius:.8,color:0x6c8ea8,scale:.95},
  hunter:{hp:78,speed:7.6,damage:13,range:2.3,fire:.92,points:210,radius:.7,color:0x7b8a64,scale:.8},
  tank:{hp:295,speed:2.0,damage:18,range:4.0,fire:1.9,points:360,radius:1.13,color:0x8c6b54,scale:1.33},
  boss:{hp:2100,speed:2.7,damage:18,range:30,fire:.65,points:3200,radius:2.35,color:0x9f7058,scale:2.6}
};
export const UPGRADES = [
  {id:'damage',icon:'⌁',name:'MUNIÇÃO DE ALTO IMPACTO',desc:'+25% de dano para todas as armas.',tag:'OFENSIVA'},
  {id:'speed',icon:'➜',name:'COLETE LEVE',desc:'+17% de velocidade de movimento.',tag:'MOBILIDADE'},
  {id:'health',icon:'✚',name:'PLACAS BALÍSTICAS',desc:'+25 de vida máxima e restauração total.',tag:'SOBREVIVÊNCIA'},
  {id:'shield',icon:'◈',name:'KIT DE TRAUMA',desc:'+25 de capacidade defensiva.',tag:'DEFESA'},
  {id:'rapid',icon:'◉',name:'GATILHO AJUSTADO',desc:'+14% na cadência das armas.',tag:'OFENSIVA'},
  {id:'heal',icon:'✜',name:'ADRENALINA',desc:'Cure 8 de vida por eliminação.',tag:'SOBREVIVÊNCIA'},
  {id:'ammo',icon:'▤',name:'CARGA EXTRA',desc:'+50% de munição de reserva em todas as armas.',tag:'ARMAMENTO'},
  {id:'grenade',icon:'◈',name:'FRAGMENTAÇÃO',desc:'+28% de dano para granadas.',tag:'EXPLOSIVOS'},
  {id:'dash',icon:'⚡',name:'MOVIMENTO TÁTICO',desc:'Reduz a recarga do dash em 30%.',tag:'MOBILIDADE'},
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rand=(a,b)=>a+Math.random()*(b-a);
export const lerp=(a,b,t)=>a+(b-a)*t;

import {NOVEL_SKILLS,NOVEL_HEROES} from './novelHeroes38.js';
import {HERO_COMBOS} from './heroCombos.js';
/** TITAN PROTOCOL — vinte e cinco identidades jogáveis com três técnicas exclusivas cada; dados puros compartilhados com o servidor. */
export const POWER_VARIANTS=Object.freeze({
 shockwave:{base:'push',label:'PULSO TITÂNICO',icon:'◎',cool:17,range:22,help:'Onda de impacto de grande alcance.'},
 overclock:{base:'flight',label:'SOBRECARGA',icon:'✦',cool:15,duration:3500,help:'Propulsão de combate por 3,5 s.'},
 iceburst:{base:'freeze',label:'CRIOPRISÃO',icon:'❄',cool:17,range:24,duration:2400,help:'Congelamento mais longo, alcance menor.'},
 stasis:{base:'freeze',label:'TOQUE DE ESTASE',icon:'◈',cool:12,range:46,duration:900,help:'Paralisação curta a longa distância.'},
 jetburst:{base:'flight',label:'PROPULSÃO VETORIAL',icon:'↥',cool:12,duration:4200,help:'Voo rápido e curto.'},
 pulsegravity:{base:'gravity',label:'ONDA ANTIGRAVIDADE',icon:'⇧',cool:23,range:35,radius:17,duration:1800,help:'Eleva adversários numa área ampla.'},
 smoke:{base:'invisible',label:'CAMUFLAGEM ÓPTICA',icon:'◌',cool:23,duration:7000,help:'Invisibilidade prolongada.'},
 chronoback:{base:'rewind',label:'RETROCESSO RÁPIDO',icon:'↶',cool:22,history:5000,help:'Volta cinco segundos no tempo.'},
 skyfire:{base:'chain',label:'RAIO CIRÚRGICO',icon:'ϟ',cool:13,range:50,chainRadius:12,targets:2,damage:[80,42],help:'Raio preciso de longo alcance.'},
 thunderstorm:{base:'chain',label:'TEMPESTADE ELETRO',icon:'⚡',cool:25,range:36,chainRadius:20,targets:4,damage:[65,51,39,30],help:'Raio atinge quatro adversários.'},
 voidtrap:{base:'blackhole',label:'ARMADILHA DO VAZIO',icon:'⬡',cool:22,range:28,radius:12,duration:3200,help:'Vórtice compacto com sucção extrema.'},
 lifedrain:{base:'heal',label:'NANOCURA',icon:'✚',cool:16,health:42,shield:38,help:'Repara vida e recarrega o escudo.'},
 ...HERO_COMBOS,
 ...NOVEL_SKILLS
});
export const HEROES=Object.freeze([
 {id:'striker',name:'VEX',title:'IMPACTO CINÉTICO',class:'Assalto',color:0xff735f,role:'scout',weapon:0,skills:['vault','wallrun_boost','vex_ultimate'],description:'Salta muros, corre por paredes e domina o parkour vertical.'},
 {id:'cryomancer',name:'NYRA',title:'ARQUITETA DO GELO',class:'Controle',color:0x80dfff,role:'sniper',weapon:2,skills:['freeze','iceburst','stasis'],description:'Três formas de congelar, isolar e interromper alvos.'},
 {id:'riftwalker',name:'KAIROS',title:'NAVEGADOR DIMENSIONAL',class:'Mobilidade',color:0xbb8aff,role:'hunter',weapon:0,skills:['teleport','swap','phase'],description:'Teleporte pelo mapa, troca de lugar e intangibilidade.'},
 {id:'aeronaut',name:'ÍCARO',title:'PREDADOR AÉREO',class:'Mobilidade',color:0x5affdf,role:'scout',weapon:0,skills:['flight','jetburst','pulsegravity'],description:'Voo livre, impulsos e domínio aéreo.'},
 {id:'phantom',name:'SOMBRA',title:'INFILTRADOR',class:'Furtividade',color:0xf18bff,role:'hunter',weapon:1,skills:['invisible','morph','smoke'],description:'Infiltração, disfarce e camuflagem avançada.'},
 {id:'chronos',name:'ÉON',title:'GUARDIÃO TEMPORAL',class:'Tempo',color:0xffc86d,role:'boss',weapon:2,skills:['rewind','resurrection','chronoback'],description:'Volta ao passado e evita uma eliminação fatal.'},
 {id:'echo',name:'MÍMICO',title:'MESTRE DAS CÓPIAS',class:'Ilusão',color:0x75c2ff,role:'scout',weapon:0,skills:['clones','clonejump','copy'],description:'Hologramas, troca com o clone e roubo de poderes.'},
 {id:'storm',name:'VOLTA',title:'CONDUTOR ELÉTRICO',class:'Dano',color:0xffe065,role:'gunner',weapon:3,skills:['chain','skyfire','thunderstorm'],description:'Descargas em cadeia e tempestades elétricas.'},
 {id:'gravity',name:'NEXUS',title:'ENGENHEIRO GRAVITACIONAL',class:'Controle',color:0xbc86ff,role:'tank',weapon:3,skills:['blackhole','gravity','voidtrap'],description:'Buracos negros e campos de gravidade.'},
 {id:'guardian',name:'ATLAS',title:'PROTETOR BIÔNICO',class:'Suporte',color:0x83efa5,role:'gunner',weapon:3,skills:['heal','shield','lifedrain'],description:'Cura, armadura e sobrevivência em combate.'},
 {id:'shiro',name:'SHIRO',title:'LÂMINA CARMESIM',class:'Assassino',color:0xff526b,role:'hunter',weapon:1,skills:['shiro_step','shiro_retreat','shiro_ricochet'],description:'Dois avanços, recuo com tiro melhorado e ricochetes com escudo.'},
 {id:'leo',name:'LEO',title:'ARQUITETO DO CAOS',class:'Assassino',color:0xf5c35a,role:'boss',weapon:0,skills:['leo_dash','leo_immunity','leo_barrage'],description:'Dois avanços com retorno, imunidade instantânea e chuva de bombas.'},
 {id:'adaptomega',name:'ADAPT-Ω',title:'EVOLUÇÃO INTELIGENTE',class:'Adaptativo',color:0xa17aff,role:'tank',weapon:0,skills:['adapt_scan','adapt_counter','adapt_ultimate'],description:'Aprende ataques, desenvolve imunidades e evolui em combate.'},
 {id:'forge',name:'FORGE',title:'ARQUITETO EXPLOSIVO',class:'Construção',color:0x48f0e1,role:'gunner',weapon:0,skills:['forge_build','forge_redstone','forge_ultimate'],description:'Constrói blocos livremente, arma bombas e cria fortalezas explosivas.'},
 {id:'butterfly',name:'BUTTERFLY',title:'ORBE ERRANTE',class:'Mobilidade',color:0xae94ff,role:'scout',weapon:2,skills:['butterfly_dash','butterfly_orbit','butterfly_launch'],description:'Dash de retorno, satélite orbital e cometa que repele e teleporta.'},
 ...NOVEL_HEROES
]);
// Hide near-duplicate kits from new character selection without deleting old
// profiles or breaking multiplayer/saved character IDs.
// Only eight tactically distinct characters are shown. Legacy heroes remain in
// HEROES so existing character IDs, saves and multiplayer sessions still resolve.
export const SELECTABLE_HERO_IDS=Object.freeze(['striker','shiro','guardian','echo','riftwalker','phantom','storm','forge']);
export const ACTIVE_HEROES=Object.freeze(SELECTABLE_HERO_IDS.map(id=>HEROES.find(h=>h.id===id)));
export const RESERVED_HERO_IDS=Object.freeze(HEROES.filter(h=>!SELECTABLE_HERO_IDS.includes(h.id)).map(h=>h.id));
export const heroById=id=>HEROES.find(h=>h.id===id)||HEROES[0];
export const heroLoadout=id=>[...heroById(id).skills];
export const heroAllows=(hero,id)=>heroById(hero).skills.includes(id);
export const heroColor=id=>heroById(id).color;

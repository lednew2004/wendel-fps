import {HERO_COMBOS} from './heroCombos.js';
/** TITAN PROTOCOL — dez identidades jogáveis e 30 técnicas; dados puros compartilhados com o servidor. */
export const POWER_VARIANTS=Object.freeze({
 shockwave:{base:'push',label:'PULSO TITÂNICO',icon:'◎',cool:23,range:22,help:'Onda de impacto de grande alcance.'},
 overclock:{base:'flight',label:'SOBRECARGA',icon:'✦',cool:18,duration:3500,help:'Propulsão de combate por 3,5 s.'},
 iceburst:{base:'freeze',label:'CRIOPRISÃO',icon:'❄',cool:25,range:24,duration:2400,help:'Congelamento mais longo, alcance menor.'},
 stasis:{base:'freeze',label:'TOQUE DE ESTASE',icon:'◈',cool:13,range:46,duration:900,help:'Paralisação curta a longa distância.'},
 jetburst:{base:'flight',label:'PROPULSÃO VETORIAL',icon:'↥',cool:15,duration:4200,help:'Voo rápido e curto.'},
 pulsegravity:{base:'gravity',label:'ONDA ANTIGRAVIDADE',icon:'⇧',cool:30,range:35,radius:17,duration:1800,help:'Eleva adversários numa área ampla.'},
 smoke:{base:'invisible',label:'CAMUFLAGEM ÓPTICA',icon:'◌',cool:32,duration:7000,help:'Invisibilidade prolongada.'},
 chronoback:{base:'rewind',label:'RETROCESSO RÁPIDO',icon:'↶',cool:26,history:5000,help:'Volta cinco segundos no tempo.'},
 skyfire:{base:'chain',label:'RAIO CIRÚRGICO',icon:'ϟ',cool:17,range:50,chainRadius:12,targets:2,damage:[80,42],help:'Raio preciso de longo alcance.'},
 thunderstorm:{base:'chain',label:'TEMPESTADE ELETRO',icon:'⚡',cool:34,range:36,chainRadius:20,targets:4,damage:[65,51,39,30],help:'Raio atinge quatro adversários.'},
 voidtrap:{base:'blackhole',label:'ARMADILHA DO VAZIO',icon:'⬡',cool:28,range:28,radius:12,duration:3200,help:'Vórtice compacto com sucção extrema.'},
 lifedrain:{base:'heal',label:'NANOCURA',icon:'✚',cool:19,health:42,shield:38,help:'Repara vida e recarrega o escudo.'},
 ...HERO_COMBOS
});
export const HEROES=Object.freeze([
 {id:'striker',name:'VEX',title:'IMPACTO CINÉTICO',class:'Assalto',color:0xff735f,role:'scout',weapon:0,skills:['push','shockwave','overclock'],description:'Força brutal, deslocamento e combate próximo.'},
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
 {id:'butterfly',name:'BUTTERFLY',title:'ORBE ERRANTE',class:'Mobilidade',color:0xae94ff,role:'scout',weapon:2,skills:['butterfly_dash','butterfly_orbit','butterfly_launch'],description:'Dash de retorno, satélite orbital e cometa que repele e teleporta.'}
]);
export const heroById=id=>HEROES.find(h=>h.id===id)||HEROES[0];
export const heroLoadout=id=>[...heroById(id).skills];
export const heroAllows=(hero,id)=>heroById(hero).skills.includes(id);
export const heroColor=id=>heroById(id).color;

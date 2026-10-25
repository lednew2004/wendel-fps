/** Liga dos Titãs: pure progression rules, shared by PvP-bots and tests. */
export const CHAMPIONS=Object.freeze([
  Object.freeze({id:'arachnex',name:'ARACHNEX',title:'ARANHA MECÂNICA',level:5,rarity:'RARO',color:0xe35676,health:0.84,speed:1.85,damage:0.95,radius:1.48,range:15,attack:'SALTO PREDADOR'}),
  Object.freeze({id:'colossus',name:'COLOSSUS',title:'GIGANTE DE FERRO',level:10,rarity:'ÉPICO',color:0xffbc64,health:1.35,speed:0.90,damage:1.35,radius:1.52,range:13,attack:'TERREMOTO'}),
  Object.freeze({id:'reaper',name:'IRON REAPER',title:'ROBÔ DE GUERRA',level:15,rarity:'LENDÁRIO',color:0x77dafa,health:1.08,speed:1.23,damage:1.06,radius:1.35,range:33,attack:'SALVA DE PLASMA'})
]);
export const isChampionWave=wave=>Number.isInteger(wave)&&wave>0&&wave%2===0;
export function championForWave(wave){
  if(!isChampionWave(wave))return null;
  const index=Math.floor(wave/2)-1,base=CHAMPIONS[index%CHAMPIONS.length],tier=Math.floor(index/CHAMPIONS.length);
  return {...base,level:base.level+tier*15,tier,health:base.health*(1+tier*.30),damage:base.damage*(1+tier*.16)};
}
export function leagueWave(wave,random=Math.random){
  const champion=championForWave(wave);
  if(champion)return {kind:'champion',champion,spawns:[{type:'boss',champion:champion.id,level:champion.level}],label:`DESAFIO · ${champion.name}`};
  const count=Math.min(9,4+Math.floor((wave-1)/2));const spawns=[];
  for(let i=0;i<count;i++){
    const roll=random();let type=roll<.28?'scout':roll<.70?'gunner':roll<.83?'hunter':roll<.94?'tank':'sniper';
    if(wave===1&&['tank','sniper'].includes(type))type='gunner';
    spawns.push({type});
  }
  return {kind:'qualifier',champion:null,spawns,label:'ELIMINE OS DESAFIANTES'};
}
const STORAGE_KEY='titan-protocol-league-v1';
export class LeagueProgress{
  constructor(storage=typeof localStorage==='undefined'?null:localStorage){
    this.storage=storage;this.records={};
    try{const data=JSON.parse(storage?.getItem(STORAGE_KEY)||'{}');for(const c of CHAMPIONS){const v=data[c.id];if(v&&Number.isFinite(v.wins)&&v.wins>0)this.records[c.id]={wins:Math.min(9999,Math.floor(v.wins)),bestLevel:Math.max(1,Math.floor(v.bestLevel||c.level))};}}catch{}
  }
  win(champion){if(!champion||!CHAMPIONS.some(c=>c.id===champion.id))return false;
    const prev=this.records[champion.id]||{wins:0,bestLevel:0};this.records[champion.id]={wins:prev.wins+1,bestLevel:Math.max(prev.bestLevel,champion.level)};
    try{this.storage?.setItem(STORAGE_KEY,JSON.stringify(this.records));}catch{}return prev.wins===0;
  }
  get unlocked(){return CHAMPIONS.filter(c=>this.records[c.id]?.wins).length;}
  get totalWins(){return Object.values(this.records).reduce((sum,v)=>sum+v.wins,0);}
}

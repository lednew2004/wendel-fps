/** Economy is per-run, earned from AI kills. Never uses PvP currency or persistent armory credits. */
export const STARTING_POWER='push';
export const POWER_PRICES=Object.freeze({
 push:0,freeze:140,teleport:430,flight:260,invisible:300,phase:390,
 blackhole:600,rewind:660,chain:270,gravity:380,clones:180,clonejump:360,
 shield:440,swap:340,copy:490,resurrection:850,heal:170,morph:210
});
export const ENEMY_CREDITS=Object.freeze({scout:55,gunner:75,sniper:90,tank:125,hunter:115,boss:450});
export class CasualEconomy {
 constructor(){this.reset();}
 reset(){this.credits=0;this.earned=0;this.purchases=0;this.owned=new Set([STARTING_POWER]);}
 reward(type,boss=false){const base=ENEMY_CREDITS[boss?'boss':type]??55;this.credits+=base;this.earned+=base;return base;}
 price(id){return Object.hasOwn(POWER_PRICES,id)?POWER_PRICES[id]:null;}
 owns(id){return this.owned.has(id);}
 buy(id){const price=this.price(id);if(price===null)return {ok:false,reason:'Habilidade indisponível.'};
  if(this.owns(id))return {ok:true,already:true,paid:0};
  if(this.credits<price)return {ok:false,reason:`FALTAM ${price-this.credits} CR`,paid:0};
  this.credits-=price;this.purchases++;this.owned.add(id);return {ok:true,already:false,paid:price};
 }
}

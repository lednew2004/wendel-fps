/** Shared deterministic adaptive event model. No player-supplied damage classification. */
export const ADAPT_EVENTS=Object.freeze(['kinetic','freeze','gravity','explosion','energy','push']);
export const ADAPT_LABELS=Object.freeze({kinetic:'PROJÉTEIS',freeze:'CONGELAMENTO',gravity:'GRAVIDADE',explosion:'EXPLOSÕES',energy:'ENERGIA',push:'EMPURRÕES'});
export function prepareAdaptation(state){state.adaptations??=[];state.adaptScanUntil??=0;state.adaptUltimateUntil??=0;state.adaptLast??=null;state.adaptFatalBlock??=false;return state;}
export function learned(state,kind,t=Date.now()){return !!prepareAdaptation(state).adaptations.some(x=>x.kind===kind&&x.until>t);}
/** Returns {blocked, learned}. Manual analysis learns after the first exposure; auto-ultimate learns immediately. */
export function observeAdaptation(state,kind,t=Date.now()){
 prepareAdaptation(state);
 if(!ADAPT_EVENTS.includes(kind))return {blocked:false,learned:false};
 state.adaptations=state.adaptations.filter(x=>x.until>t);
 if(learned(state,kind,t))return {blocked:true,learned:false};
 const automatic=state.adaptUltimateUntil>t,scanning=state.adaptScanUntil>t;
 if(!automatic&&!scanning)return {blocked:false,learned:false};
 const max=automatic?3:1;
 if(!automatic)state.adaptations=[];
 state.adaptations=state.adaptations.filter(x=>x.kind!==kind);
 if(state.adaptations.length>=max)state.adaptations.shift();
 state.adaptations.push({kind,until:automatic?state.adaptUltimateUntil:t+12000});
 state.adaptLast=kind;
 if(!automatic)state.adaptScanUntil=0;
 return {blocked:automatic,learned:true};
}
export function startUltimate(state,t=Date.now()){
 prepareAdaptation(state);state.adaptUltimateUntil=t+15000;state.adaptFatalBlock=true;state.adaptations=[];return state.adaptUltimateUntil;
}

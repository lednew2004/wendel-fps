/** Deterministic air insertion tuning; no renderer dependency (unit-testable). */
export const FREEFALL_GRAVITY=18.5;
export const FREEFALL_TERMINAL=-43;
export const PARACHUTE_TERMINAL=-6.5;
export const AUTO_CHUTE_ALTITUDE=32;
export function fallSpeed(vy,dt,deployed){
  const step=Math.max(0,Math.min(.05,dt));
  return deployed?vy+(PARACHUTE_TERMINAL-vy)*Math.min(1,step*2.9):Math.max(FREEFALL_TERMINAL,vy-FREEFALL_GRAVITY*step);
}
export function mustDeploy(altitude,deployed){return !deployed&&altitude<=AUTO_CHUTE_ALTITUDE;}
export function landingDamage(speed){return Math.min(70,Math.max(0,(Math.abs(speed)-17)*1.8));}

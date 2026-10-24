import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handlePowerWheelTab} from '../../public/src/keyboard.js';

function keyboard(type='keydown',extra={}){
  const result={prevented:0,stopped:0};
  const event={type,code:'Tab',repeat:false,target:{tagName:'BODY'},ctrlKey:false,altKey:false,metaKey:false,
    preventDefault(){result.prevented++;},stopPropagation(){result.stopped++;},...extra};
  return {event,result};
}

test('TAB is a one-press toggle, without navigation or keyup closing the wheel',()=>{
  let state='playing',mode=null,toggles=0;
  const toggle=()=>{toggles++;mode=mode==='wheel'?null:'wheel';state=mode?'paused':'playing';};
  const emit=(type,extra={})=>{
    const {event,result}=keyboard(type,extra);
    const caught=handlePowerWheelTab(event,state,mode,null,toggle);
    return {...result,caught};
  };
  let r=emit('keydown');assert.equal(r.caught,true);assert.equal(r.prevented,1);assert.equal(r.stopped,1);
  assert.equal(mode,'wheel');assert.equal(toggles,1);
  r=emit('keydown',{repeat:true});assert.equal(r.caught,true);assert.equal(toggles,1);
  r=emit('keyup');assert.equal(r.caught,true);assert.equal(r.prevented,1);assert.equal(mode,'wheel');
  r=emit('keydown');assert.equal(r.caught,true);assert.equal(mode,null);assert.equal(toggles,2);
  r=emit('keyup');assert.equal(r.caught,true);assert.equal(toggles,2);
});

test('TAB is left to the browser outside the game, in fields and with browser shortcut modifiers',()=>{
  for(const state of ['menu','dead','upgrade','paused']){
    let count=0;
    const {event,result}=keyboard();
    assert.equal(handlePowerWheelTab(event,state,null,null,()=>count++),false);
    assert.equal(result.prevented,0);assert.equal(count,0);
  }
  for(const tagName of ['INPUT','TEXTAREA','SELECT']){
    const {event,result}=keyboard('keydown',{target:{tagName}});
    assert.equal(handlePowerWheelTab(event,'playing',null,null,()=>assert.fail('Toggle in text field')),false);
    assert.equal(result.prevented,0);
  }
  const focused={tagName:'INPUT'};
  const {event:focusedEvent,result:focusedResult}=keyboard();
  assert.equal(handlePowerWheelTab(focusedEvent,'paused','wheel',focused,()=>assert.fail('Toggle with focused field')),false);
  assert.equal(focusedResult.prevented,0);
  for(const modifier of ['ctrlKey','altKey','metaKey']){
    const {event,result}=keyboard('keydown',{[modifier]:true});
    assert.equal(handlePowerWheelTab(event,'playing',null,null,()=>assert.fail('Toggle modified shortcut')),false);
    assert.equal(result.prevented,0);
  }
});

test('The game uses capture-phase interception and no longer closes the wheel on TAB keyup',()=>{
  const game=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
  const menu=readFileSync(new URL('../../public/src/powerMenu.js',import.meta.url),'utf8');
  assert.match(game,/keydown',e=>\{if\(isTypingIntoField\(e\.target\)\|\|isTypingIntoField\(document\.activeElement\)\)return;if\(handlePowerWheelTab/);
  assert.match(game,/keyup',e=>\{if\(handlePowerWheelTab/);
  assert.doesNotMatch(game,/e\.code==='Tab'.*releaseWheel\(/);
  assert.doesNotMatch(game,/openWheel\(true\)/);
  assert.match(menu,/openWheel\(\)\{if\(this\.mode==='wheel'\)\{this\.close\(\);return;\}if\(!this\.mode\)this\.open\('wheel'\);\}/);
});

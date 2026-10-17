import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isTypingIntoField} from '../../public/src/keyboard.js';

test('text fields receive editing keys while canvas still receives controls',()=>{
  for(const tagName of ['INPUT','TEXTAREA','SELECT']){
    assert.equal(isTypingIntoField({tagName}),true);
  }
  assert.equal(isTypingIntoField({tagName:'DIV',isContentEditable:true}),true);
  assert.equal(isTypingIntoField({tagName:'CANVAS'}),false);
  assert.equal(isTypingIntoField({tagName:'BUTTON'}),false);
  assert.equal(isTypingIntoField(null),false);
});

test('game keydown handler checks focused input before blocking Backspace',()=>{
  const source=readFileSync(new URL('../../public/src/game.js',import.meta.url),'utf8');
  assert.match(source,/keydown',e=>\{if\(isTypingIntoField\(e.target\)\|\|isTypingIntoField\(document.activeElement\)\)return;/);
  assert.match(source,/\['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backspace'\]/);
});

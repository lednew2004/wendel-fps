import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHARACTER_STYLES,characterStyle,colorForName} from '../../public/src/characterIdentity.js';

const source=readFileSync(new URL('../../public/src/characters.js',import.meta.url),'utf8')
  .replace("import * as THREE from 'three';",'const THREE=globalThis.__THREE_CHARACTER_TEST__')
  .replace("import {characterStyle} from './characterIdentity.js';",'const characterStyle=globalThis.__CHARACTER_STYLE_TEST__');

class FakeVector {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(v){return this.set(v,v,v);}
}
class FakeObject {
  constructor(){this.children=[];this.position=new FakeVector();this.rotation=new FakeVector();this.scale=new FakeVector(1,1,1);this.userData={};this.visible=true;}
  add(...objects){this.children.push(...objects);return this;}
  traverse(fn){fn(this);for(const child of this.children)child.traverse(fn);}
}
class FakeGeometry {constructor(...args){this.args=args;this.disposed=false;}dispose(){this.disposed=true;}}
class FakeMaterial {constructor(options){Object.assign(this,options);this.disposed=false;}dispose(){this.disposed=true;}}
class FakeMesh extends FakeObject {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}}
const geometries=['SphereGeometry','CapsuleGeometry','ConeGeometry','CylinderGeometry','TorusGeometry','PlaneGeometry','CircleGeometry'];
const THREE={Group:FakeObject,Mesh:FakeMesh,MeshStandardMaterial:FakeMaterial,MeshBasicMaterial:FakeMaterial};
for(const name of geometries)THREE[name]=FakeGeometry;
globalThis.__THREE_CHARACTER_TEST__=THREE;
globalThis.__CHARACTER_STYLE_TEST__=characterStyle;
const {createOperative,animateOperative,disposeOperative}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));

test('the entire bestiary renders as humanoid Three.js characters instead of cubes',()=>{
  for(const role of ['scout','gunner','sniper','hunter','tank','boss','player']){
    const root=createOperative({role,size:1});
    const rig=root.userData.rig;
    assert.ok(rig,`${role} must have an animated rig`);
    assert.equal(rig.arms.length,2);assert.equal(rig.legs.length,2);
    assert.ok(root.name.startsWith('TITAN_'));
    const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});
    assert.ok(meshes.length>=40,`${role} had ${meshes.length} parts`);
    assert.ok(!meshes.some(o=>o.geometry.constructor.name==='BoxGeometry'));
    const original=rig.legs[0].rotation.x;
    animateOperative(root,1/30,{moving:1,firing:true,hit:true});
    assert.notEqual(rig.legs[0].rotation.x,original);
    if(role!=='scout'&&role!=='hunter')assert.equal(rig.flare.visible,true);
    disposeOperative(root);
    assert.ok(rig.materials.every(m=>m.disposed));
  }
});
test('enemy classes use distinct palette, silhouettes and headwear',()=>{
  const classes=Object.values(CHARACTER_STYLES);
  assert.equal(new Set(classes.map(c=>c.name)).size,classes.length);
  assert.ok(new Set(classes.map(c=>c.accent)).size>=6);
  assert.ok(CHARACTER_STYLES.tank.heavy&&CHARACTER_STYLES.boss.commander);
  assert.ok(CHARACTER_STYLES.sniper.scope&&CHARACTER_STYLES.hunter.hood);
  assert.notEqual(colorForName('Jogador Um'),colorForName('Jogador Dois'));
});
test('casual enemies and multiplayer avatars both instantiate the same humanoid renderer',()=>{
  const enemy=readFileSync(new URL('../../public/src/enemies.js',import.meta.url),'utf8');
  const multiplayer=readFileSync(new URL('../../public/src/multiplayer.js',import.meta.url),'utf8');
  assert.match(enemy,/createOperative\(\{role:type,size\}\)/);
  assert.match(enemy,/animateOperative\(e\.body/);
  assert.doesNotMatch(enemy.slice(enemy.indexOf('  spawn(type,pos,wave=1)'),enemy.indexOf('  spawnAt(type')), /new THREE\.BoxGeometry\(/);
  assert.match(multiplayer,/createOperative\(\{role:'player'/);
  assert.match(multiplayer,/animateOperative\(entry\.group\.userData\.body/);
});

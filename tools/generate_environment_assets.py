#!/usr/bin/env python3
"""Original modular science-fiction props and precomputed ground occlusion.
Geometry is exportable glTF 2.0; no runtime Blender dependency.
"""
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image,ImageDraw,ImageFilter
import re, json
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/assets/models/environment';DEST.mkdir(parents=True,exist_ok=True)
TEX=ROOT/'public/assets/baked';TEX.mkdir(parents=True,exist_ok=True)

C={ 'steel':[63,83,103,255], 'concrete':[132,149,161,255], 'glass':[83,182,201,255], 'warning':[244,167,80,255], 'shadow':[36,46,66,255], 'titan':[134,214,207,255]}
def put(scene,mesh,kind,pos=None):
    mesh=mesh.copy()
    mesh.visual.vertex_colors=np.tile(C[kind],(len(mesh.vertices),1))
    if pos:mesh.apply_translation(pos)
    scene.add_geometry(mesh)
def box(scene,kind,size,pos):put(scene,trimesh.creation.box(size),kind,pos)
def pole(scene,kind,radius,length,pos,segments=12):put(scene,trimesh.creation.cylinder(radius=radius,height=length,sections=segments),kind,pos)
def dome(scene,kind,radius,pos,sub=1):put(scene,trimesh.creation.icosphere(subdivisions=sub,radius=radius),kind,pos)

s=trimesh.Scene()
# Signal relay with exposed support struts and three luminous antenna tips.
for x in [-1.2,1.2]:
 for z in [-1.2,1.2]:
  box(s,'steel',[.24,6,.24],[x,3,z]);box(s,'concrete',[.45,.25,.45],[x,.14,z])
for y in [2.2,4.8,6.2]:
 box(s,'steel',[3.15,.22,3.15],[0,y,0]);box(s,'shadow',[2.5,.22,.4],[0,y,.95])
box(s,'concrete',[2.1,2.2,2.15],[0,3.7,0]);box(s,'glass',[1.6,.65,.075],[0,4.1,-1.1]);
for x in [-1,0,1]:
 pole(s,'steel',.09,3.1,[x,7.6,.2]);dome(s,'titan',.19,[x,9.2,.2])
s.export(DEST/'relay_tower.glb',file_type='glb')

s=trimesh.Scene()
# Reinforced military checkpoint with proper rounded pillars and a profiled roof.
box(s,'concrete',[6.7,.25,5.7],[0,.14,0])
for x in [-2.7,2.7]:
 for z in [-2.2,2.2]:pole(s,'steel',.18,3.6,[x,1.9,z])
box(s,'steel',[7.3,.2,6.3],[0,3.85,0]);box(s,'shadow',[6.7,.15,.45],[0,3.8,-3.0])
for x in [-2,0,2]:
 box(s,'glass',[1.5,1.15,.085],[x,2.5,-2.20]);
 box(s,'titan',[.9,.08,.09],[x,3.2,-2.3]);
for z in [-1.4,1.4]: box(s,'warning',[.25,.45,1.8],[3.2,.48,z])
s.export(DEST/'field_station.glb',file_type='glb')

s=trimesh.Scene()
# Generators have rounded bodies, distinct pipes, and energy rings.
box(s,'concrete',[4.1,.25,3.2],[0,.14,0])
for x in [-1.2,1.2]:
 pole(s,'steel',.69,2.2,[x,1.4,0],16)
 pole(s,'glass',.56,1.4,[x,1.5,0],16)
for z in [-1,1]:
 for x in [-1.2,1.2]:dome(s,'warning',.17,[x,2.4,z])
box(s,'shadow',[3.4,.18,.7],[0,2.15,0]);box(s,'titan',[.9,.09,.1],[0,1.4,-1.3])
s.export(DEST/'power_generator.glb',file_type='glb')

# Prebaked diffuse ambient shadows for 435x435 terrain. Dynamic shadowing is
# retained only for close characters on medium/high presets.
src=(ROOT/'public/src/squadLayout.js').read_text()
arr=src.split('export const SQUAD_BLOCKS=Object.freeze([',1)[1].split('].map',1)[0]
blocks=[]
for line in arr.splitlines():
 m=re.findall(r'\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\]',line)
 blocks.extend(tuple(map(float,item)) for item in m)
size=768
img=Image.new('RGB',(size,size),(99,121,117))
d=ImageDraw.Draw(img)
# low-key terrain tint to keep old level readable
for y in range(0,size,8):
 tone=int(6*np.sin(y/30))
 d.rectangle((0,y,size,y+7),fill=(99+tone,121+tone,117+tone))
shade=Image.new('L',(size,size),0);p=ImageDraw.Draw(shade)
for x,z,w,l,h in blocks:
 px=(x+217.5)/435*size
 py=(z+217.5)/435*size
 rx=w/435*size/2;ry=l/435*size/2
 # subtle offset of static shadow; calculated once at build time
 p.rounded_rectangle((px-rx+3,py-ry+6,px+rx+8,py+ry+12),radius=4,fill=105 if h>3 else 40)
shade=shade.filter(ImageFilter.GaussianBlur(13))
a=np.asarray(img,dtype=np.float32);b=np.asarray(shade,dtype=np.float32)/255
a*=1-b[:,:,None]*.37
Image.fromarray(a.astype('uint8'),'RGB').save(TEX/'mission_ground_baked.webp','WEBP',quality=80,method=5)
print('baked occlusion for',len(blocks),'structures; assets:',*[f'{p.name} {p.stat().st_size//1024}KB' for p in list(DEST.glob('*.glb'))+[TEX/'mission_ground_baked.webp']])

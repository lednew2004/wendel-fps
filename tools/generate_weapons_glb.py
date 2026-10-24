#!/usr/bin/env python3
"""Original lightweight GLB tactical firearms (fictional designs, no downloads).
Weapon axis: -Z forward; designed to drop into the existing FPS viewmodel group.
Meshes are batched by PBR material for a small number of draw calls.
"""
from pathlib import Path
import numpy as np
import trimesh

OUT=Path(__file__).resolve().parents[1]/'public/assets/models/weapons'
OUT.mkdir(parents=True,exist_ok=True)
PALETTE=[(31,39,49,255),(77,91,106,255),(18,24,32,255),(121,112,94,255),(59,172,181,255),(236,181,103,255)]

class Gun:
 def __init__(self,kind):self.kind=kind;self.parts={i:[] for i in range(len(PALETTE))}
 def add(self,mesh,mat=0):self.parts[mat].append(mesh)
 def box(self,center,size,mat=0):
  m=trimesh.creation.box(extents=size);m.apply_translation(center);self.add(m,mat)
 def tube(self,a,b,radius,mat=1,sections=12):
  a=np.array(a);b=np.array(b);d=b-a
  m=trimesh.creation.cylinder(radius=radius,height=float(np.linalg.norm(d)),sections=sections)
  m.apply_transform(trimesh.geometry.align_vectors([0,0,1],d/np.linalg.norm(d)));m.apply_translation((a+b)/2)
  self.add(m,mat)
 def ring(self,z,y,r,mat=4):
  m=trimesh.creation.annulus(r_min=r-.013,r_max=r,height=.035,sections=12)
  m.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]));m.apply_translation([0,y,z]);self.add(m,mat)
 def make(self):
  g=self
  length={'rifle':1.34,'shotgun':1.16,'sniper':1.64,'lmg':1.42}[self.kind]
  heavy=self.kind=='lmg';sniper=self.kind=='sniper';shotgun=self.kind=='shotgun'
  receiver=.36 if heavy else .30
  g.box((0,0,-.10),(receiver,.24,.72),0)
  g.box((0,.11,-.20),(.21,.10,.58),1)
  g.box((0,-.25,.10),(.16,.39,.19),2) # hand grip
  g.box((0,-.14,-.11),(.20,.27,.24),2) # magazine interface
  g.box((0,.015,-.64),(.19,.16,.65),0)
  for s in (-1,1):
   g.box((s*.097,.04,-.67),(.018,.09,.54),1)
   g.box((s*.105,.02,-.34),(.02,.12,.12),4)
  for i in range(7): # perforated handguard rib / thermal break
   g.box((0,.13,-.40-i*.075),(.18,.014,.018),2)
  g.tube((0,.03,-.75),(0,.03,-length),.056 if heavy else .044,1)
  g.tube((0,.03,-length+.16),(0,.03,-length-.07),.075,2)
  for i in range(3):g.box((0,.098,-length-.04+i*.045),(.065,.012,.014),4)
  g.box((0,-.035,.37),(.17,.18,.40),3) # stock
  g.box((0,-.02,.58),(.22,.23,.065),2)
  for side in (-1,1):
   g.box((side*.11,-.07,-.01),(.015,.16,.40),1)
  if shotgun:
   g.tube((0,-.07,-.36),(0,-.07,-1.08),.068,1)
   g.box((0,-.10,-.61),(.24,.18,.31),3)
   for side in (-1,1):g.box((side*.13,-.06,-.60),(.019,.08,.24),4)
  elif sniper:
   g.box((0,.23,-.38),(.13,.12,.48),2)
   g.tube((0,.26,-.05),(0,.26,-.65),.075,2)
   g.tube((0,.26,-.68),(0,.26,-.74),.095,4)
   g.tube((0,.26,-.02),(0,.26,.03),.095,5)
   for z in (-.12,-.56):g.box((0,.16,z),(.11,.11,.07),1)
   g.box((0,-.24,.03),(.18,.35,.12),2)
   for side in (-1,1):g.tube((side*.10,-.08,-.63),(side*.22,-.41,-.73),.027,1)
  elif heavy:
   g.box((0,-.24,-.12),(.34,.37,.48),3)
   for z in (-.25,-.55,-.85):g.box((0,-.03,z),(.30,.16,.065),1)
   for side in (-1,1):g.tube((side*.11,-.09,-.58),(side*.23,-.32,-1.08),.025,1)
   g.box((0,.26,-.31),(.19,.10,.25),2)
  else:
   g.box((0,-.20,-.10),(.22,.35,.17),3)
   g.box((0,.24,-.20),(.12,.13,.19),2)
  for z in (-.25,-.50):
   g.box((0,.15,z),(.10,.023,.09),4)
  scene=trimesh.Scene()
  for mat,parts in self.parts.items():
   if not parts:continue
   mesh=trimesh.util.concatenate(parts)
   color=PALETTE[mat]
   mesh.visual=trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
     name=['CARBON','TITANIUM','MATTE','CERAMIC','EMISSIVE','GOLD'][mat],baseColorFactor=color,
     metallicFactor=.68 if mat in (0,1,2) else .24,roughnessFactor=.42 if mat in (0,1) else .65,
     emissiveFactor=(.04,.27,.29) if mat==4 else (.2,.08,.02) if mat==5 else (0,0,0)))
   scene.add_geometry(mesh,node_name='body_material_'+str(mat))
  output=OUT/(self.kind+'.glb');scene.export(output)
  print(self.kind,output.stat().st_size)

if __name__=='__main__':
 for name in ('rifle','shotgun','sniper','lmg'):Gun(name).make()

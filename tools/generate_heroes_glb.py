#!/usr/bin/env python3
"""Create original lightweight glTF 2.0 .glb skinned character assets.
No third-party character IP, downloads, proprietary assets or npm dependencies.
Mesh surfaces are manufactured with trimesh and baked into material-grouped
skinned meshes. glTF animation clips contain joint quaternion tracks.
"""
from pathlib import Path
import json, struct, math, sys
import numpy as np
import trimesh

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/models/operatives'
OUT.mkdir(parents=True,exist_ok=True)

HEROES={
'striker': ('scout',0xff735f,1), 'cryomancer':('sniper',0x80dfff,2),'riftwalker':('hunter',0xbb8aff,3),
'aeronaut':('scout',0x5affdf,4),'phantom':('hunter',0xf18bff,5),'chronos':('boss',0xffc86d,6),
'echo':('scout',0x75c2ff,7),'storm':('gunner',0xffe065,8),'gravity':('tank',0xbc86ff,9),
'guardian':('gunner',0x83efa5,10),'shiro':('hunter',0xff526b,11),'leo':('boss',0xf5c35a,12),
'butterfly':('scout',0xae94ff,13),'adaptomega':('tank',0xa17aff,14),
'scout':('scout',0xff614d,0),'gunner':('gunner',0xf0b756,0),'sniper':('sniper',0x79ccf4,0),
'hunter':('hunter',0x9bd66a,0),'tank':('tank',0xffa65c,0),'boss':('boss',0xed68fe,0),'player':('scout',0x59dce8,0)
}
JOINTS=[
 ('hips',-1,(0,1.00,0)),
 ('spine',0,(0,.52,0)),
 ('head',1,(0,.66,0)),
 ('upper_arm_L',1,(-.46,.29,0)), ('forearm_L',3,(-.06,-.49,-.035)),
 ('upper_arm_R',1,(.46,.29,0)), ('forearm_R',5,(.06,-.49,-.035)),
 ('upper_leg_L',0,(-.19,-.10,0)), ('lower_leg_L',7,(0,-.48,0)),
 ('upper_leg_R',0,(.19,-.10,0)), ('lower_leg_R',9,(0,-.48,0))]

# Material slots are consistent across the hero roster.
SLOTS=['fabric','armor','accent','dark','skin','visor','trim','leather','lamp']

def tint(hexcolor):return [(hexcolor>>16)/255,(hexcolor>>8&255)/255,(hexcolor&255)/255,1]

def colors(accent,role):
    uniforms={'scout':0x4c3b47,'gunner':0x6c6457,'sniper':0x304d59,'hunter':0x354b3b,'tank':0x59515a,'boss':0x524258}
    return [tint(uniforms[role]),tint(0x303949),tint(accent),tint(0x131c26),tint(0xb58d70),tint(0x65d6e7),tint(0x738394),tint(0x6f5646),tint(0xffeeae)]

class Writer:
 def __init__(self):
    self.doc={'asset':{'version':'2.0','generator':'Titan Voxel Squad 3.5.1'},'scene':0,'scenes':[{'nodes':[]}],
         'nodes':[],'meshes':[],'materials':[],'skins':[],'animations':[],'bufferViews':[],'accessors':[],'buffers':[{'byteLength':0}]}
    self.data=bytearray()
 def add_buffer(self,payload,target=None):
    while len(self.data)%4:self.data.append(0)
    ofs=len(self.data);self.data.extend(payload)
    d={'buffer':0,'byteOffset':ofs,'byteLength':len(payload)}
    if target:d['target']=target
    self.doc['bufferViews'].append(d)
    return len(self.doc['bufferViews'])-1
 def accessor(self,array,component=5126,type_='VEC3',target=None,minmax=False):
    arr=np.asarray(array)
    if component==5126: arr=np.ascontiguousarray(arr,dtype='<f4')
    elif component==5123:arr=np.ascontiguousarray(arr,dtype='<u2')
    elif component==5121:arr=np.ascontiguousarray(arr,dtype='u1')
    else:raise ValueError(component)
    v=self.add_buffer(arr.tobytes(),target)
    a={'bufferView':v,'componentType':component,'count':len(arr),'type':type_}
    if minmax and len(arr):a['min']=np.asarray(arr.min(axis=0)).reshape(-1).astype(float).tolist();a['max']=np.asarray(arr.max(axis=0)).reshape(-1).astype(float).tolist()
    self.doc['accessors'].append(a);return len(self.doc['accessors'])-1
 def finish(self,dest):
    while len(self.data)%4:self.data.append(0)
    self.doc['buffers'][0]['byteLength']=len(self.data)
    j=json.dumps(self.doc,separators=(',',':'),ensure_ascii=False).encode('utf-8')
    while len(j)%4:j+=b' '
    body=struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(self.data),b'BIN\x00')+bytes(self.data)
    dest.write_bytes(struct.pack('<4sII',b'glTF',2,12+len(body))+body)

# Animation clips use fully looped rotation tracks, not procedurally rotating the whole character.
def rx(angle):return [math.sin(angle*.5),0,0,math.cos(angle*.5)]
def rz(angle):return [0,0,math.sin(angle*.5),math.cos(angle*.5)]
def pose(name,t):
    phase=t*math.tau
    v={}
    if name in ('idle','aim'):
        v[1]=rz(math.sin(phase)*.025)
        v[3]=rx(-.22 if name=='idle' else -.85);v[5]=rx(-.22 if name=='idle' else -.90)
    if name in ('walk','run'):
        amp=.48 if name=='walk' else .72
        v[7]=rx(math.sin(phase)*amp);v[9]=rx(-math.sin(phase)*amp)
        v[8]=rx(max(0,math.cos(phase))*.26);v[10]=rx(max(0,-math.cos(phase))*.26)
        v[3]=rx(-math.sin(phase)*amp*.75-.2);v[5]=rx(math.sin(phase)*amp*.75-.2)
        v[1]=rx(.12 if name=='run' else .045)
    if name=='dash':
        v[1]=rx(.38*math.sin(math.pi*t));v[3]=rx(-1.1);v[5]=rx(-1.1)
        v[7]=rx(.4);v[9]=rx(-.4)
    if name=='jump':
        v[7]=rx(-.28);v[9]=rx(-.28);v[8]=rx(.75);v[10]=rx(.75)
        v[3]=rx(-.55);v[5]=rx(-.55)
    if name=='fire':
        v[3]=rx(-1.1+math.sin(phase)*.11);v[5]=rx(-1.08+math.sin(phase)*.15);v[1]=rx(-.06)
    if name=='hit':
        v[1]=rx(-.26*math.sin(math.pi*t));v[3]=rz(.2*math.sin(math.pi*t))
    if name=='cast':
        v[1]=rx(-.16);v[3]=rx(-1.0-1.1*math.sin(math.pi*t));v[5]=rx(-1.0-1.1*math.sin(math.pi*t))
    if name in ('strafe_left','strafe_right'):
        side=-1 if name=='strafe_left' else 1
        v[1]=rz(side*.10)
        v[7]=rz(side*.16);v[9]=rz(side*.13)
        v[3]=rx(-.55-math.sin(phase)*.28);v[5]=rx(-.65+math.sin(phase)*.28)
        v[7]=rx(math.sin(phase)*.35);v[9]=rx(-math.sin(phase)*.35)
    if name=='crouch':
        v[1]=rx(.18);v[7]=rx(-.52);v[9]=rx(-.52)
        v[8]=rx(.85);v[10]=rx(.85)
    if name=='land':
        v[1]=rx(.28*math.sin(math.pi*t));v[7]=rx(-.38*math.sin(math.pi*t));v[9]=rx(-.38*math.sin(math.pi*t))
        v[8]=rx(.55*math.sin(math.pi*t));v[10]=rx(.55*math.sin(math.pi*t))
    if name=='reload':
        v[3]=rx(-.9-.15*math.sin(phase));v[5]=rx(-1.15+.42*math.sin(math.pi*t))
        v[4]=rx(.45*math.sin(math.pi*t));v[6]=rx(-.7*math.sin(math.pi*t))
    if name=='aim_upper':
        v[3]=rx(-1.05);v[5]=rx(-1.18);v[4]=rx(-.16);v[6]=rx(-.23)
    if name=='fire_upper':
        v[3]=rx(-1.05+.17*math.sin(phase));v[5]=rx(-1.15+.12*math.sin(phase));v[1]=rx(-.045)
    if name=='cast_upper':
        v[3]=rx(-1.30-.75*math.sin(math.pi*t));v[5]=rx(-1.25-.75*math.sin(math.pi*t))
    return v

# geometry all world-space rest coordinates, weighted to joint; inverse-bind matrices account for rest transforms.
REST=[]
for i,(name,parent,off) in enumerate(JOINTS):
    pos=np.asarray(off,dtype=float)+(REST[parent] if parent>=0 else 0)
    REST.append(pos)

def manufacture(hero,role,accent,variant):
    writer=Writer();doc=writer.doc
    cols=colors(accent,role)
    for name,colour in zip(SLOTS,cols):
        mat={'name':name,'pbrMetallicRoughness':{'baseColorFactor':colour,'metallicFactor':.6 if name in ('armor','trim') else .1,'roughnessFactor':.38 if name in ('armor','trim','visor') else .76},'doubleSided':False}
        if name=='visor':mat['emissiveFactor']=[.14,.52,.56]
        if name=='lamp':mat['emissiveFactor']=[.85,.64,.24]
        if name=='accent':mat['emissiveFactor']=[min(1,c*.3) for c in colour[:3]]
        doc['materials'].append(mat)
    per={i:[] for i in range(len(SLOTS))}
    def append(shape,joint,slot,center,scale,rot=None):
        mesh=shape.copy()
        mesh.apply_scale(scale)
        if rot is not None:
            mat=trimesh.transformations.rotation_matrix(rot[0],rot[1]);mesh.apply_transform(mat)
        mesh.apply_translation(center)
        per[slot].append((mesh,joint))
    def sphere(joint,slot,center,scale,detail=1):
        # Original blocky human proportions, inspired by voxel adventure aesthetics.
        # Each torso/head/limb is a hard-edged rectangular volume; never a sphere.
        append(trimesh.creation.box(extents=[float(v)*2 for v in scale]),joint,slot,center,(1,1,1))
    def barrel(joint,slot,a,b,r1,r2,section=9):
        a=np.asarray(a,float);b=np.asarray(b,float);delta=b-a
        # Square barrel and gunstock match the rest of the block-art direction.
        cyl=trimesh.creation.box(extents=(r1*2,r1*2,np.linalg.norm(delta)))
        # cylinder initially aligns Z; rotate Z to direction of a-b
        v=np.asarray([0.,0.,1.]);t=delta/np.linalg.norm(delta)
        mat=trimesh.geometry.align_vectors(v,t);cyl.apply_transform(mat);cyl.apply_translation((a+b)/2)
        per[slot].append((cyl,joint))
    width={'scout':1,'hunter':.94,'sniper':.98,'gunner':1.1,'tank':1.35,'boss':1.2}[role]
    sphere(0,0,(0,1.02,0),(.28*width,.20,.23),1)
    sphere(1,0,(0,1.54,0),(.39*width,.46,.23),2)
    sphere(1,1,(0,1.60,-.21),(.34*width,.39,.10),1)
    sphere(1,1,(0,1.43,.27),(.30*width,.32,.10),1)
    sphere(1,2,(0,1.68,-.315),(.14,.035,.026),1)
    sphere(2,4,(0,2.28,-.01),(.285,.29,.273),0)
    sphere(2,1,(0,2.53,.07),(.299,.135,.295),0)
    sphere(2,5,(0,2.32,-.290),(.250,.083,.028),0)
    # Recognisable pixel eyes above a small pixel mouth, visible on the visor plane.
    for eye_x in (-.115,.115):
        append(trimesh.creation.box(extents=(.068,.066,.022)),2,3,(eye_x,2.335,-.327),(1,1,1))
        append(trimesh.creation.box(extents=(.032,.032,.024)),2,2,(eye_x,2.343,-.342),(1,1,1))
    append(trimesh.creation.box(extents=(.115,.024,.025)),2,3,(0,2.197,-.296),(1,1,1))
    sphere(2,3,(0,2.145,-.205),(.19,.055,.035),1)
    sphere(2,6,(0,2.27,-.247),(.06,.045,.04),1)
    for s,jup,jlow,jleg,jshin in [(-1,3,4,7,8),(1,5,6,9,10)]:
        sphere(jup,1,(s*.49*width,1.78,0),(.20*width,.19,.23),1)
        sphere(jup,0,(s*.50*width,1.53,0),(.145,.31,.15),1)
        sphere(jlow,1,(s*.51*width,1.13,-.06),(.145,.27,.145),1)
        sphere(jlow,3,(s*.52*width,.91,-.07),(.13,.13,.14),1)
        sphere(jleg,0,(s*.20*width,.74,0),(.20,.31,.22),1)
        sphere(jshin,1,(s*.20*width,.32,-.02),(.145,.27,.17),1)
        sphere(jshin,3,(s*.20*width,.10,-.13),(.19,.12,.28),1)
        sphere(jshin,2,(s*.20*width,.13,-.32),(.12,.025,.075),1)
    # Weapon: asymmetrically worn on right, connected to forearm joint.
    barrel(6,3,(.57,1.22,-.26),(.57,1.22,-.98),.055,.045)
    sphere(6,1,(.57,1.24,-.54),(.12,.12,.32),1)
    sphere(6,2,(.57,1.32,-.53),(.05,.04,.18),1)
    sphere(6,5,(.57,1.20,-1.0),(.065,.065,.05),1)
    # Unique silhouette accents: visible across quality presets, no shader-only identity.
    if variant in (4,13):
        for s in (-1,1):
            sphere(1,2,(s*.54,1.58,.37),(.13,.4,.12),1)
            sphere(1,6,(s*.62,1.27,.35),(.17,.22,.09),1)
    if variant in (10,9) or role=='tank':
        for s in (-1,1):sphere(1,1,(s*.56*width,1.80,-.07),(.29,.27,.26),1)
    if variant in (6,12):
        for s in (-1,1):sphere(2,2,(s*.20,2.61,.025),(.07,.20,.08),1)
    if variant in (11,3,5):
        for s in (-1,1):sphere(2,2,(s*.27,2.39,.15),(.06,.17,.09),1)
    if variant in (2,8):
        for s in (-1,1):sphere(1,5,(s*.37,1.80,-.23),(.085,.11,.035),1)
    if variant in (1,7):
        for s in (-1,1):sphere(1,2,(s*.24,1.55,-.29),(.07,.24,.035),1)
    if role=='sniper':sphere(2,5,(.23,2.35,-.04),(.075,.08,.12),1)
    if role=='boss':sphere(2,2,(0,2.67,0),(.09,.2,.09),1)

    # v3.5: hand-authored original hero silhouettes. Equipment is welded to
    # the proper skin joints, and therefore follows the existing animations.
    # Box details are intentionally low-poly; texture and silhouette do the
    # visual work instead of subdividing every surface into costly polygons.
    def panel(joint,slot,center,scale,angle=0):
        shape=trimesh.creation.box(extents=scale)
        if angle:shape.apply_transform(trimesh.transformations.rotation_matrix(angle,[0,0,1]))
        shape.apply_translation(center)
        per[slot].append((shape,joint))
    # Universal visible combat equipment: breastplate outline, belt clasps,
    # boot buckles, reinforced fingers and readable backpack straps.
    for side in (-1,1):
        panel(1,6,(side*.22*width,1.62,-.328),(.065,.35,.033),side*.14)
        panel(1,3,(side*.27*width,1.27,-.248),(.19,.14,.075))
        panel(1,6,(side*.27*width,1.34,-.298),(.17,.025,.036))
        panel(1,7,(side*.29*width,1.60,.238),(.105,.57,.063),side*.20)
        panel(4 if side<0 else 6,6,(side*.51*width,1.05,-.194),(.105,.15,.026))
        panel(8 if side<0 else 10,6,(side*.20*width,.15,-.342),(.20,.037,.042))
        panel(7 if side<0 else 9,3,(side*.20*width,.70,-.223),(.13,.20,.052))
    panel(1,6,(0,1.43,-.352),(.29,.040,.05))
    panel(0,3,(0,.995,-.240),(.62*width,.09,.09))
    panel(0,2,(0,.999,-.306),(.11,.075,.045))
    panel(2,6,(0,2.55,-.13),(.27,.032,.18))
    panel(2,5,(0,2.30,-.244),(.38,.105,.028))
    # Original character specific shape language (not color-only identity).
    if hero=='shiro':
        for side in (-1,1):
            panel(1,2,(side*.48,1.79,.0),(.15,.08,.48),side*.18)
            panel(2,2,(side*.29,2.52,.11),(.09,.32,.11),side*.30)
        panel(1,3,(0,1.58,.345),(.30,.55,.18))
        panel(1,2,(0,1.49,-.35),(.06,.27,.065))
    elif hero=='leo':
        for side in (-1,1):
            sphere(1,2,(side*.44,1.75,.10),(.15,.20,.29),1)
            panel(1,8,(side*.24,1.5,-.343),(.18,.08,.045),side*.3)
        sphere(1,6,(0,1.54,-.38),(.14,.14,.04),1)
        panel(1,1,(0,1.61,.38),(.55,.63,.24))
    elif hero=='butterfly':
        for side in (-1,1):
            panel(1,2,(side*.50,1.57,.47),(.12,.65,.045),side*.43)
            panel(1,5,(side*.73,1.59,.43),(.11,.37,.045),side*.75)
            sphere(3 if side<0 else 5,2,(side*.50,1.50,.04),(.17,.045,.17),1)
        sphere(1,5,(0,1.63,-.35),(.12,.12,.04),1)
    elif hero=='guardian':
        panel(1,3,(0,1.59,.38),(.64,.80,.31))
        panel(1,2,(0,1.62,.56),(.34,.13,.07))
        for side in (-1,1):
            panel(1,8,(side*.25,1.48,-.35),(.14,.08,.04))
            sphere(3 if side<0 else 5,2,(side*.67,1.67,0),(.19,.26,.22),1)
    elif hero in ('cryomancer','storm'):
        for side in (-1,1):
            panel(1,5,(side*.37,1.55,-.305),(.07,.42,.06),side*.22)
            sphere(3 if side<0 else 5,5,(side*.52,1.78,-.04),(.12,.13,.12),1)
        panel(2,5,(0,2.32,-.275),(.36,.075,.055))
    elif hero in ('phantom','riftwalker'):
        panel(1,3,(0,1.56,.36),(.42,.85,.25))
        for side in (-1,1):
            panel(2,3,(side*.26,2.48,.05),(.14,.25,.29),side*.35)
            panel(1,2,(side*.33,1.13,.10),(.10,.28,.18),side*.4)
    elif hero in ('gravity','chronos'):
        for side in (-1,1):
            sphere(1,2,(side*.41,1.64,.36),(.16,.29,.20),1)
            panel(1,5,(side*.21,1.5,-.34),(.10,.28,.04))
        sphere(1,5,(0,1.60,-.37),(.18,.15,.045),1)
    elif hero in ('aeronaut','echo'):
        for side in (-1,1):
            panel(1,6,(side*.35,1.66,.37),(.15,.64,.22),side*.20)
            sphere(1,5,(side*.34,1.65,.57),(.12,.19,.08),1)
    elif hero in ('striker',):
        for side in (-1,1):
            panel(1,2,(side*.42,1.77,-.12),(.25,.13,.30),side*.19)
            panel(7 if side<0 else 9,1,(side*.2,.59,-.2),(.21,.21,.055))
    # Common NPCs receive the same protective boot and vest detail without
    # elite equipment. Unique bosses gain a visually prominent shoulder rig.
    if role=='boss':
        for side in (-1,1):panel(1,2,(side*.63,1.95,.04),(.16,.28,.30),side*.18)

    # prepare skinned mesh primitives grouped by materials
    primitives=[]
    for slot,shapes in per.items():
        if not shapes:continue
        p=[];n=[];ix=[];jw=[];ww=[];uv=[];count=0
        for shape,joint in shapes:
            verts=np.asarray(shape.vertices,dtype=np.float32)
            norms=np.asarray(shape.vertex_normals,dtype=np.float32)
            inds=np.asarray(shape.faces,dtype=np.uint16).reshape(-1)+count
            p.append(verts);n.append(norms);ix.append(inds)
            jw.append(np.tile(np.array([joint,0,0,0],np.uint8),(len(verts),1)))
            ww.append(np.tile(np.array([1,0,0,0],np.float32),(len(verts),1)))
            count+=len(verts)
        positions=np.concatenate(p)
        if count>=65535:raise RuntimeError('too many vertices')
        primitives.append({'attributes':{
           'POSITION':writer.accessor(positions,target=34962,minmax=True),
           'NORMAL':writer.accessor(np.concatenate(n),target=34962),
           'JOINTS_0':writer.accessor(np.concatenate(jw),component=5121,type_='VEC4',target=34962),
           'WEIGHTS_0':writer.accessor(np.concatenate(ww),type_='VEC4',target=34962),
        },'indices':writer.accessor(np.concatenate(ix),component=5123,type_='SCALAR',target=34963),'material':slot})
    doc['meshes'].append({'name':hero+'_skinned','primitives':primitives})
    for j,(name,parent,off) in enumerate(JOINTS):
        doc['nodes'].append({'name':name,'translation':list(off),'children':[]})
    for j,(_,parent,_) in enumerate(JOINTS):
        if parent>=0:doc['nodes'][parent]['children'].append(j)
    doc['nodes'].append({'name':'character_skin','mesh':0,'skin':0})
    doc['scenes'][0]['nodes']=[0,len(doc['nodes'])-1]
    matrices=[]
    for pos in REST:
        m=np.eye(4,dtype=np.float32)
        m[:3,3]=-pos
        matrices.append(m.T.reshape(-1))
    doc['skins'].append({'name':'TitanRig','joints':list(range(len(JOINTS))),'inverseBindMatrices':writer.accessor(np.stack(matrices),type_='MAT4'),'skeleton':0})
    for name in ['idle','walk','run','dash','jump','fire','aim','hit','cast','strafe_left','strafe_right','crouch','land','reload','aim_upper','fire_upper','cast_upper']:
        times=np.linspace(0,1,5 if name in ('walk','run') else 3,dtype=np.float32)
        clip={'name':name,'samplers':[],'channels':[]}
        time_id=writer.accessor(times,type_='SCALAR',minmax=True)
        for joint in range(len(JOINTS)):
            if name.endswith('_upper') and joint not in (1,3,4,5,6):continue
            rotations=np.asarray([pose(name,float(t)).get(joint,[0,0,0,1]) for t in times],np.float32)
            if np.allclose(rotations,np.tile([0,0,0,1],(len(times),1))):continue
            output=writer.accessor(rotations,type_='VEC4')
            sample=len(clip['samplers']);clip['samplers'].append({'input':time_id,'output':output,'interpolation':'LINEAR'})
            clip['channels'].append({'sampler':sample,'target':{'node':joint,'path':'rotation'}})
        if clip['channels']:doc['animations'].append(clip)
    return writer

if __name__=='__main__':
    size=0
    for key,(role,accent,variant) in HEROES.items():
        out=OUT/f'{key}.glb'
        manufacture(key,role,accent,variant).finish(out)
        size+=out.stat().st_size
        print(f'{key:16s} {out.stat().st_size//1024:4d} KB')
    print('total',round(size/1024/1024,2),'MiB')

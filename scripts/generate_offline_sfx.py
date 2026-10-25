"""Bundled offline fallback Foley-style samples for unreliable/offline networks.
Filenames are overwritten by genuine CC0 recordings when npm install can reach source.
"""
import numpy as np
from scipy import signal
from scipy.io.wavfile import write
from pathlib import Path
out=Path(__file__).resolve().parent.parent/'public/assets/sfx';out.mkdir(parents=True,exist_ok=True)
sr=22050
rng=np.random.default_rng(408)

def filtered_noise(n,lo=80,hi=7500):
  x=rng.standard_normal(n)
  if hi < sr/2-10:
    sos=signal.butter(3,hi,btype='lowpass',fs=sr,output='sos');x=signal.sosfilt(sos,x)
  if lo>0:
    sos=signal.butter(2,lo,btype='highpass',fs=sr,output='sos');x=signal.sosfilt(sos,x)
  return x/(max(1.0,np.std(x)))

def boom(duration,low=65,noise_hi=9200,tail=.22,echo=True,metal=False):
 n=int(sr*duration);t=np.arange(n)/sr
 attack=np.exp(-t/(duration*.24))*filtered_noise(n,low,noise_hi)
 pop=np.exp(-t/.0025)*filtered_noise(n,500,9200)*1.0
 bass=np.sin(2*np.pi*(low*.57*t+100*np.minimum(t,.045)**2))*np.exp(-t/.058)
 y=attack*.56+pop*.45+bass*.41
 if metal:
  y+=.2*np.sin(2*np.pi*1860*t)*np.exp(-t/.032)
 if echo:
  for delay,gain in [(.073,.14),(.151,.08),(.28,.045)]:
    i=int(sr*delay)
    if i<n:y[i:]+=y[:n-i]*gain
 return y

def swoosh(duration,lo=90,hi=6800,reverse=False):
 n=int(duration*sr);t=np.linspace(0,1,n);env=np.sin(np.pi*t)**1.7
 if reverse:env=env[::-1]
 return filtered_noise(n,lo,hi)*env

def clicks(duration,pattern,metal=False):
 n=int(sr*duration);y=np.zeros(n)
 for where,strength,freq in pattern:
  start=int(sr*where);length=min(int(sr*.045),n-start)
  if length<=0:continue
  t=np.arange(length)/sr
  x=filtered_noise(length,900,min(sr*.49,6000))*np.exp(-t/.008)*strength
  x+=.2*np.sin(2*np.pi*freq*t)*np.exp(-t/.016)
  y[start:start+length]+=x
 return y

samples={
 'rifle':boom(.37,76,8300,metal=True),
 'shotgun':boom(.83,43,7200)+np.pad(boom(.30,48,7000)*.2,(int(sr*.09),int(sr*.83)-int(sr*.09)-int(sr*.30))),
 'rail':boom(.47,95,9800,metal=True),
 'reload':clicks(.95,[(.02,.55,900),(.12,.35,1600),(.36,.8,1200),(.65,.32,1900)],metal=True),
 'empty':clicks(.20,[(.02,.5,1600)]),
 'hit':boom(.20,125,4100,echo=False)*.25+clicks(.20,[(.012,.35,1800)]),
 'kill':clicks(.36,[(.012,.42,1300),(.10,.54,2200)])+np.sin(2*np.pi*1400*np.arange(int(sr*.36))/sr)*np.exp(-np.arange(int(sr*.36))/sr/.06)*.07,
 'hurt':boom(.36,46,1500,echo=False)*.38,
 'dash':swoosh(.30,210,8500)*.66,
 'grenade':boom(.88,36,9000,metal=False),
 'pulse':swoosh(.52,70,9500)*.50+np.sin(2*np.pi*(110*np.arange(int(sr*.52))/sr+250*(np.arange(int(sr*.52))/sr)**2))*np.exp(-np.arange(int(sr*.52))/sr/.19)*.18,
 'pickup':clicks(.34,[(.0,.3,1300),(.10,.35,1900),(.2,.27,2500)]),
 'boss':boom(1.12,33,2700),
 'click':clicks(.12,[(.01,.37,1450)]),
 'door':clicks(.54,[(.0,.4,750),(.27,.49,640)])+swoosh(.54,30,1300)*.16,
}
for name,y in samples.items():
 y=np.asarray(y);n=len(y);y-=np.mean(y);peak=max(1e-4,np.max(np.abs(y)));y=y/peak*.79
 fade=min(int(sr*.04),n//5);y[-fade:]*=np.linspace(1,0,fade);y[:min(50,n)]*=np.linspace(0,1,min(50,n))
 write(out/(name+'.wav'),sr,(np.clip(y,-1,1)*32767).astype('<i2'))
 print(name,len(y))

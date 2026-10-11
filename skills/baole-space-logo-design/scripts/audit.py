from pathlib import Path
import re,json,math,xml.etree.ElementTree as E,zipfile
import argparse
p=argparse.ArgumentParser();p.add_argument('directory',type=Path);p.add_argument('--manifest',type=Path);p.add_argument('--report',type=Path);args=p.parse_args();root=args.directory;ns={'s':'http://www.w3.org/2000/svg'}
files=list(root.glob('*.svg'));assert files, 'No SVGs found'
if args.manifest:
 keys=json.loads(args.manifest.read_text());files=[root/(k+s+'.svg') for k in keys for s in ['', '-mono']]
 assert all(f.is_file() for f in files), 'Missing color/mono file'
reports={}
for f in files:
 e=E.parse(f).getroot();assert e.attrib.get('viewBox')=='0 0 100 100';ps=e.findall('s:path',ns);assert len(ps)==1
 assert all('stroke' not in x.attrib and 'transform' not in x.attrib for x in e.iter())
 assert not any(x.tag.split('}')[-1] in ['mask','clipPath','image','script'] for x in e.iter())
 ids=[x.attrib['id'] for x in e.iter() if 'id' in x.attrib];assert len(ids)==len(set(ids)),f
 for pair in re.findall(r'(-?\d+(?:\.\d+)?)', ps[0].attrib['d']): assert math.isfinite(float(pair))
 if f.stem.endswith('-mono'):continue
 assert ps[0].attrib['d']==E.parse(root/(f.stem+'-mono.svg')).getroot().find('s:path',ns).attrib['d']
 d=ps[0].attrib['d'];assert set(re.findall('[A-Za-z]',d))<=set('MCZ'), 'Expected closed cubic paths';contours=[];seg=[];p0=None;first=None
 for cmd,vals in re.findall(r'([MCZ])([^MCZ]*)',d):
  v=[float(n) for n in re.findall(r'-?\d+(?:\.\d+)?',vals)]
  if cmd=='M':p0=v;first=v;seg=[]
  if cmd=='C':
   assert len(v)==6;seg.append([p0,v[:2],v[2:4],v[4:6]]);p0=v[4:6]
  if cmd=='Z':
   assert max(abs(p0[j]-first[j]) for j in [0,1])<.0002;contours.append(seg)
 assert contours and all(contours), (f,'empty contours')
 tang=0;curv=0
 for seg in contours:
  for i,s in enumerate(seg):
   q=seg[(i+1)%len(seg)]
   for j in [0,1]:
    tang=max(tang,abs(3*(s[3][j]-s[2][j])-3*(q[1][j]-q[0][j])))
    curv=max(curv,abs(6*(s[3][j]-2*s[2][j]+s[1][j])-6*(q[2][j]-2*q[1][j]+q[0][j])))
 assert tang<.0013,(f,tang);assert curv<.004,(f,curv)
 reports[f.stem]=dict(contours=len(contours),cubicSegments=sum(map(len,contours)),maxTangentDelta=round(tang,7),maxSecondDerivativeDelta=round(curv,7),oneFilledPath=True)

if args.report:args.report.write_text(json.dumps(reports,indent=2)+'\n')
print(f'{len(reports)} marks / {len(files)} SVGs: matching color/mono geometry, single path, closed contours, C2 continuity within rounding tolerances.')

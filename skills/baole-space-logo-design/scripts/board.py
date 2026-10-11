#!/usr/bin/env python3
"""Make an SVG contact sheet from actual exported color and mono SVGs."""
from pathlib import Path
import argparse,json,math,html,xml.etree.ElementTree as E
E.register_namespace('','http://www.w3.org/2000/svg')
p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('icons',type=Path);p.add_argument('output',type=Path);p.add_argument('--title',default='baole.space / Logo collection');p.add_argument('--columns',type=int,default=4);p.add_argument('--dark',action='store_true');p.add_argument('--mono',action='store_true');a=p.parse_args()
items=json.loads(a.manifest.read_text());cols=a.columns;cellw=300;cellh=265;w=cols*cellw+80;h=math.ceil(len(items)/cols)*cellh+190
fg='#F1F3FA' if a.dark else '#273147';muted='#AFBBD1' if a.dark else '#627189';bg='#141E30' if a.dark else '#F5F6F9'
out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="{bg}"/><g font-family="Helvetica,Arial,sans-serif"><text x="40" y="43" fill="{muted}" font-size="12" letter-spacing="2">BAOLE.SPACE / FLUID — SILK</text><text x="40" y="99" fill="{fg}" font-size="38">{html.escape(a.title)}</text><text x="40" y="132" fill="{muted}" font-size="14">{len(items)} symbols · Color / Monochrome / 16 / 24 / 32 px</text>']
def symbol(key,mode,stamp):
 mode=mode or a.mono
 root=E.parse(a.icons/(key+('-mono' if mode else '')+'.svg')).getroot()
 for e in root.iter():
  if 'id' in e.attrib:e.attrib['id']+='-'+stamp
  if 'fill' in e.attrib:
   if e.attrib['fill'].startswith('url(#'):e.attrib['fill']=e.attrib['fill'][:-1]+'-'+stamp+')'
   elif mode and e.tag.endswith('path'):e.attrib['fill']=fg
 return ''.join(E.tostring(e,encoding='unicode') for e in root if e.tag.split('}')[-1] in ['defs','path'])
for i,(key,item) in enumerate(items.items()):
 x=40+(i%cols)*cellw;y=165+(i//cols)*cellh
 out.append(f'<g transform="translate({x+20} {y}) scale(1.45)">{symbol(key,False,"hero")}</g><g transform="translate({x+178} {y+46}) scale(.65)">{symbol(key,True,"mono")}</g>')
 out.append(f'<text x="{x+20}" y="{y+174}" fill="{fg}" font-size="19">{html.escape(item["name"])}</text>')
 for j,size in enumerate([16,24,32]):out.append(f'<g transform="translate({x+20+j*40} {y+192}) scale({size/100})">{symbol(key,False,str(j))}</g>')
 tag='RESERVE / HYPOTHETICAL' if item.get('kind')=='reserve' else 'ECOSYSTEM'
 out.append(f'<text x="{x+145}" y="{y+213}" fill="{muted}" font-size="8" letter-spacing=".7">{tag}</text>')
out.append('</g></svg>');a.output.write_text(''.join(out));print(str(a.output))

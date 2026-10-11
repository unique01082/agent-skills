#!/usr/bin/env node
// npm install --prefix <skill-folder> before first use.
const fs=require('fs'),path=require('path');
const args=process.argv.slice(2);
if(args.length<2){console.error('Usage: node compile.cjs SOURCE.json OUTPUT_DIR [--overwrite]');process.exit(2);}
const records=JSON.parse(fs.readFileSync(args[0],'utf8')),output=path.resolve(args[1]);
const moduleFile=require.resolve('pathkit-wasm/bin/pathkit.js'),dir=path.dirname(moduleFile)+path.sep;
const {svgPathProperties}=require('svg-path-properties');
const hex=/^#[0-9a-f]{6}$/i;
// Preflight the entire batch before writing any assets.
for(const [key,v] of Object.entries(records)){
 if(!/^[a-z][a-z0-9-]*$/.test(key))throw Error('Unsafe key: '+key);
 if(!v.name||!v.idea||!hex.test(v.p)||!hex.test(v.q)||!v.elements?.length)throw Error(key+' missing metadata');
 for(const e of v.elements){
  if(!['path','circle','ellipse'].includes(e.tag))throw Error(key+' unsupported shape');
  if(e.tag==='path'&&!e.d)throw Error(key+' missing path');
  if(e.stroke&&!(Number(e['stroke-width'])>0))throw Error(key+' invalid stroke width');
  if(e.transform&&!/^(rotate\([-\d.]+ [-\d.]+ [-\d.]+\)|translate\([-\d.]+ [-\d.]+\))$/.test(e.transform))throw Error(key+' unsupported transform');
 }
 for(const suffix of ['', '-mono'])if(fs.existsSync(path.join(output,key+suffix+'.svg'))&&!args.includes('--overwrite'))throw Error(key+' exists; back up selected files and pass --overwrite');
}
fs.mkdirSync(output,{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;');
require(dir+'pathkit.js')({wasmBinary:fs.readFileSync(dir+'pathkit.wasm')}).then(P=>{
const report={};
for(const [key,v] of Object.entries(records)){
 let ink=null; const cuts=[];
 for(const e of v.elements){
  let d=e.d;
  if(e.tag==='circle'||e.tag==='ellipse'){
   const cx=+e.cx,cy=+e.cy,rx=+(e.r||e.rx),ry=+(e.r||e.ry);
   d=`M${cx-rx} ${cy}A${rx} ${ry} 0 1 0 ${cx+rx} ${cy}A${rx} ${ry} 0 1 0 ${cx-rx} ${cy}Z`;
  }
  let p=P.FromSVGString(d);if(!p)throw Error(key+' parse');
  if(e.stroke){if(!p.stroke({width:+e['stroke-width'],cap:P.StrokeCap.ROUND,join:P.StrokeJoin.ROUND}))throw Error(key+' stroke');}
  if(e.transform){
   let z=e.transform.match(/rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)/);
   if(z){const t=+z[1]*Math.PI/180,c=Math.cos(t),s=Math.sin(t),x=+z[2],y=+z[3];p.transform(c,-s,x-c*x+s*y,s,c,y-s*x-c*y,0,0,1);}
   else {z=e.transform.match(/translate\(([-\d.]+) ([-\d.]+)\)/);if(!z)throw Error('unknown transform');p.transform(1,0,+z[1],0,1,+z[2],0,0,1);}
  }
  if(!p.simplify())throw Error(key+' simplify');
  if(e['data-op']==='cut')cuts.push(p);
  else if(!ink)ink=p;else{if(!ink.op(p,P.PathOp.UNION))throw Error(key+' union');p.delete();}
 }
 for(const p of cuts){if(!ink.op(p,P.PathOp.DIFFERENCE))throw Error(key+' cut');p.delete();}
 if(!ink.simplify())throw Error(key+' final simplify');
 // Convert any even-odd result to one winding path to retain transparent holes.
 const fillRule=ink.getFillType()===P.FillType.EVENODD?'evenodd':'nonzero';
 // Light contour fairing removes cusp artifacts left by Boolean intersections.
 const contours=ink.toSVGString().match(/M[^M]+/g)||[];
 let out=[];
 const fmt=v=>v.map(x=>String(+x.toFixed(4))).join(' ');
 for(const contour of contours){
  const c=new svgPathProperties(contour),len=c.getTotalLength(),n=Math.max(20,Math.ceil(len/1.7));
  let pts=Array.from({length:n},(_,i)=>{const p=c.getPointAtLength(i*len/n);return [p.x,p.y]});
  for(let pass=0;pass<2;pass++)pts=pts.map((_,i)=>[0,1].map(j=>[-2,-1,0,1,2].reduce((sum,off,z)=>sum+pts[(i+off+n)%n][j]*[1,4,6,4,1][z]/16,0)));
  let d='';
  for(let i=0;i<n;i++){
   const p0=pts[(i+n-1)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
   const b0=[0,1].map(j=>(p0[j]+4*p1[j]+p2[j])/6),b1=[0,1].map(j=>(4*p1[j]+2*p2[j])/6),b2=[0,1].map(j=>(2*p1[j]+4*p2[j])/6),b3=[0,1].map(j=>(p1[j]+4*p2[j]+p3[j])/6);
   if(i===0)d='M'+fmt(b0);
   d+='C'+fmt(b1)+' '+fmt(b2)+' '+fmt(b3);
  }
  out.push(d+'Z');
 }
 let d=out.join('');
 // Re-read deliverable geometry to reject unparseable or empty marks.
 const check=P.FromSVGString(d);check.setFillType(ink.getFillType());
 if(!check.simplify() || !check.toSVGString().trim())throw Error(key+' empty result');
 check.delete();
 const gradient=`<defs><linearGradient id="${key}-ink" x1="12" y1="18" x2="82" y2="87" gradientUnits="userSpaceOnUse"><stop stop-color="${v.p}"/><stop offset="1" stop-color="${v.q}"/></linearGradient></defs>`;
 for(const mono of [false,true]){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${esc(v.name)}">\n  <title>${esc(v.name)} — Fluid — Silk</title>\n  <desc>${esc(v.idea)}. Continuous cubic contours, expanded and boolean-unioned into one compound path.</desc>\n  ${mono?'':gradient}\n  <path fill="${mono?'#272633':`url(#${key}-ink)`}" fill-rule="${fillRule}" d="${d}"/>\n</svg>\n`;
  fs.writeFileSync(path.join(output,key+(mono?'-mono':'')+'.svg'),svg);
 }
 report[key]={name:v.name,constructionShapes:v.elements.length,outputPaths:1,strokeElements:0,cuts:cuts.length,fillRule,bytes:d.length};
 ink.delete();
}
fs.writeFileSync(path.join(output,'geometry-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(Object.keys(records).length+' marks exported in color and mono.');
}).catch(error=>{console.error(error);process.exitCode=1;});

#!/usr/bin/env node
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const args=process.argv.slice(2);
if(!args.length){console.error('Usage: node render.cjs FILE.svg OUTPUT.png | ICON_DIR --sizes');process.exit(2);}
(async()=>{
 if(args[1]==='--sizes'){
  const files=fs.readdirSync(args[0]).filter(n=>n.endsWith('.svg'));
  for(const f of files)for(const size of [16,24,32,128])await sharp(path.join(args[0],f)).resize(size,size).png().toBuffer();
  console.log(files.length+' SVGs rendered at 16 / 24 / 32 / 128 px');
 }else {await sharp(args[0]).png().toFile(args[1]);console.log(args[1]);}
})().catch(e=>{console.error(e);process.exitCode=1;});

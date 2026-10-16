import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
await mkdir('work',{recursive:true});
await build({entryPoints:['components/legacy-buildings.tsx'],outfile:'work/legacy-buildings.mjs',bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external'});
const {LegacyBuildingDrawing}=await import(pathToFileURL(path.resolve('work/legacy-buildings.mjs')));
const {renderToStaticMarkup}=await import('react-dom/server');
await mkdir('public/models',{recursive:true});
for(const type of ['chale','vila','prefeitura','edificio','metropole']){
  const svg=renderToStaticMarkup(LegacyBuildingDrawing({type})).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
  await writeFile('public/models/legacy-'+type+'.svg',svg+'\n');
}
console.log('Five original SVG designs exported.');

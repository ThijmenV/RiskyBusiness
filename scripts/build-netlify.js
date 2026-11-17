const fs=require('node:fs/promises');const path=require('node:path');
async function buildNetlify() {
  const root=path.resolve(__dirname,'..');const site=path.join(root,'dist','site');
  await fs.rm(path.join(root,'dist'),{recursive:true,force:true});
  await fs.mkdir(site,{recursive:true});
  for(const file of ['index.html','css','js']) await fs.cp(path.join(root,'public',file),path.join(site,file),{recursive:true});
  await fs.mkdir(path.join(site,'vendor'));
  for(const [src,dest] of [['d3/dist/d3.min.js','d3.min.js'],['topojson-client/dist/topojson-client.min.js','topojson-client.min.js'],['world-atlas/countries-110m.json','countries-110m.json']]) await fs.copyFile(path.join(root,'node_modules',src),path.join(site,'vendor',dest));
  const {zipFunctions}=await import('@netlify/zip-it-and-ship-it');
  const result=await zipFunctions(path.join(root,'netlify','functions'),path.join(root,'dist','functions'),{basePath:root,config:{'*':{nodeBundler:'esbuild',includedFiles:['public/game.html'],nodeVersion:'24.x'}}});
  if(result.length!==1 || result[0].name!=='app') throw new Error('Unexpected function package');
  console.log('Netlify package ready: dist/site (static files), dist/functions/app.zip (Node function). No player data is included.');
}
if(require.main===module) buildNetlify().catch(e=>{console.error('Build failed:',e.message);process.exitCode=1;});
module.exports={buildNetlify};

// Recovery only: read the original external store. Never ship the historical API key to a browser.
const fs=require('node:fs');const path=require('node:path');const {spawnSync,execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
function historicalSettings() {
  const html=execFileSync('git',['show','74c626c:Risky_business-Thoms-Laptop.html'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
  const extract=name=>{const match=html.match(new RegExp(`const ${name} = '([^']+)'`));if(!match) throw new Error('Historical connection settings not found');return match[1];};
  const block=html.match(/const PLAYERS = (\[[\s\S]*?\]);/)?.[1];
  const players=[...(block || '').matchAll(/id:\s*(\d+),\s*name:\s*'([^']+)',\s*color:\s*'([^']+)'/g)].map(m=>({id:Number(m[1]),name:m[2],color:m[3]}));
  if(players.length!==6) throw new Error('Unexpected historical roster');
  return {key:process.env.JSONBIN_READ_KEY || extract('JSONBIN_KEY'),bin:extract('JSONBIN_ID'),players};
}
function recover(output, {input} = {}) {
  if(fs.existsSync(output)) throw new Error('Output exists; refusing to overwrite a recovered snapshot');
  const {key,bin,players}=historicalSettings();
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const temp=output+'.download';
  fs.writeFileSync(temp,'',{flag:'wx',mode:0o600});
  try {
    const config='url = '+JSON.stringify('https://api.jsonbin.io/v3/b/'+bin+'/latest')+'\nheader = '+JSON.stringify('X-Master-Key: '+key)+'\n';
    const result=input?{status:0,stdout:'200'}:spawnSync('curl',['--config','-','--silent','--show-error','--proto','=https','--max-time','30','--output',temp,'--write-out','%{http_code}'],{input:config,encoding:'utf8'});
    if(result.status!==0 || result.stdout!=='200') throw new Error(`JSONBin could not be read (HTTP ${result.stdout || 'unknown'}, curl ${result.status}). Check network access and read credentials.`);
    if(input) fs.copyFileSync(input,temp);
    // Preserve the exact HTTP response before interpreting legacy fields.
    fs.copyFileSync(temp,output+'.raw.json',fs.constants.COPYFILE_EXCL);
    fs.chmodSync(output+'.raw.json',0o600);
    const json=JSON.parse(fs.readFileSync(temp,'utf8'));const originalGame=json.record || json;
    const {game,report}=require('./normalize-legacy-game').normalizeLegacyGame(originalGame);
    require('../src/game/validate').validateGame({...game,players},players);
    const data={format:'risky-business-recovered',schemaVersion:1,source:'jsonbin',revision:'74c626c',normalization:report,originalGame,recoveredAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(JSON.stringify(originalGame)).digest('hex'),players,game};
    fs.writeFileSync(output,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});
    return {players:players.map(p=>({name:p.name,entries:(game.kissLog || []).filter(e=>e.playerId===p.id).length})),countries:Object.keys(game.troops || {}).length};
  } finally{fs.rmSync(temp,{force:true});}
}
if(require.main===module) {
  try {
    const args=process.argv.slice(2);const index=args.indexOf('--input');
    const input=index>=0?args.splice(index,2)[1]:undefined;
    console.log('Recovered:',recover(args[0] || path.resolve(__dirname,'../data/recovered-jsonbin.json'),{input}));
  }
  catch(error){console.error('Recovery failed:',error.message);process.exitCode=1;}
}
module.exports={historicalSettings,recover};

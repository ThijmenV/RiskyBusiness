const fs=require('node:fs');const crypto=require('node:crypto');
const {atomicWrite,validateStore}=require('../src/storage');
function importRecovered(store,recovered,ownerId) {
  validateStore(store);
  if(recovered.format!=='risky-business-recovered' || recovered.schemaVersion!==1) throw new Error('Invalid recovered snapshot');
  if(!store.users.some(u=>u.id===ownerId)) throw new Error('Choose an existing owner account id');
  const game={...structuredClone(recovered.game),players:structuredClone(recovered.players),recoverySha256:recovered.sha256};
  require('../src/game/validate').validateGame(game,recovered.players);
  if(store.game_state.some(s=>JSON.parse(s.payload).recoverySha256===recovered.sha256)) return store;
  const result=structuredClone(store);const next=rows=>Math.max(0,...rows.map(r=>r.id))+1;
  const gid=next(result.groups);const now=new Date().toISOString();
  result.groups.push({id:gid,name:'Risky Business — Original',code:crypto.randomBytes(6).toString('hex').toUpperCase(),owner_id:ownerId,created_at:now});
  result.group_members.push({id:next(result.group_members),group_id:gid,user_id:ownerId,role:'owner',joined_at:now});
  result.game_state.push({id:next(result.game_state),group_id:gid,payload:JSON.stringify(game),version:0,updated_at:now});
  return result;
}
if(require.main===module) {
  try {
    const [source,owner,output=require('../src/config').databasePath]=process.argv.slice(2);
    if(!source || !owner) throw new Error('Usage: npm run import:recovered -- snapshot.json OWNER_USER_ID [local-database.json]');
    const original=validateStore(JSON.parse(fs.readFileSync(output,'utf8')));
    const recovered=JSON.parse(fs.readFileSync(source,'utf8'));
    const result=importRecovered(original,recovered,Number(owner));
    if(result===original) console.log('Already imported; destination unchanged');
    else {
      // Keep a private, exclusive, pre-import backup.
      fs.copyFileSync(output,output+'.before-recovery-'+Date.now()+'.json',fs.constants.COPYFILE_EXCL);
      atomicWrite(output,result);
      console.log('Recovered group imported:',{players:recovered.players.length,logEntries:recovered.game.kissLog?.length || 0});
    }
  }catch(error){console.error('Import failed:',error.message);process.exitCode=1;}
}
module.exports={importRecovered};

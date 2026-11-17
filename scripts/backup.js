const fs=require('node:fs');
const path=require('node:path');
const {createStorage,validateStore}=require('../src/storage');
async function backup(output,{databaseUrl=process.env.DATABASE_URL,databasePath=require('../src/config').databasePath}={}) {
  if(!output) throw new Error('Supply a private output filename; backups contain account data and password hashes');
  let data;
  if(!databaseUrl) data=validateStore(JSON.parse(fs.readFileSync(databasePath,'utf8')));
  else {
    const storage=createStorage({databaseUrl});
    try {
      const client=await storage.pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        data={};
        for(const table of ['users','groups','group_members','game_state','game_history']) data[table]=(await client.query(`SELECT * FROM ${table} ORDER BY ${table==='game_history'?'group_id,version':'id'}`)).rows;
        await client.query('COMMIT');
      } catch(error){await client.query('ROLLBACK');throw error;}
      finally{client.release();}
    } finally{await storage.close();}
  }
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});
  return {counts:Object.fromEntries(['users','groups','group_members','game_state','game_history'].map(t=>[t,data[t].length]))};
}
if(require.main===module) backup(process.argv[2]).then(r=>console.log('Backup written:',r)).catch(e=>{console.error('Backup failed:',e.code || e.message);process.exitCode=1;});
module.exports={backup};

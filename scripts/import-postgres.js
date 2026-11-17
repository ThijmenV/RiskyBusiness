const fs=require('node:fs');
const {createStorage,validateStore}=require('../src/storage');
async function importPostgres(file,databaseUrl) {
  if(!databaseUrl) throw new Error('DATABASE_URL is required');
  const data=validateStore(JSON.parse(fs.readFileSync(file,'utf8')));
  const storage=createStorage({databaseUrl,schemaMode:'migrate'});
  try {
    await storage.ensureReady();
    const client=await storage.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('LOCK TABLE users, groups, group_members, game_state IN ACCESS EXCLUSIVE MODE');
      const counts=(await client.query('SELECT (SELECT count(*) FROM users)+(SELECT count(*) FROM groups)+(SELECT count(*) FROM group_members)+(SELECT count(*) FROM game_state)+(SELECT count(*) FROM game_history) AS count')).rows[0];
      if(Number(counts.count)!==0) throw new Error('Destination is not empty; refusing to overwrite or duplicate player data');
      const columns={users:['id','username','email','password_hash','created_at'],groups:['id','name','code','owner_id','created_at'],group_members:['id','group_id','user_id','role','joined_at'],game_state:['id','group_id','payload','updated_at','version'],game_history:['group_id','version','payload','created_at']};
      for(const [table,fields] of Object.entries(columns)) {
        for(const row of data[table]) await client.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map((_,i)=>'$'+(i+1)).join(',')})`,fields.map(f=>f==='version'?row[f] || 0:row[f]));
        const count=Number((await client.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
        if(count!==data[table].length) throw new Error('Row count mismatch: '+table);
        const rows=(await client.query(`SELECT * FROM ${table}`)).rows;
        // Verify raw strings and payloads, including password hashes. Timestamps are normalized by PostgreSQL.
        for(const row of rows) {
          const expected=data[table].find(r=>table==='game_history'?r.group_id===row.group_id && r.version===row.version:r.id===row.id);
          for(const field of fields.filter(f=>!['created_at','joined_at','updated_at','version'].includes(f))) if(row[field]!==expected[field]) throw new Error('Value mismatch in '+table+'.'+field);
        }
        if(table!=='game_history') await client.query(`SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT max(id) FROM ${table}),1), EXISTS(SELECT 1 FROM ${table}))`);
      }
      await client.query('COMMIT');
      return Object.fromEntries(Object.keys(columns).map(t=>[t,data[t].length]));
    } catch(error) { await client.query('ROLLBACK');throw error; }
    finally { client.release(); }
  } finally { await storage.close(); }
}
if(require.main===module) importPostgres(process.argv[2] || require('../src/config').databasePath,process.env.DATABASE_URL).then(counts=>console.log('Import verified:',counts)).catch(error=>{console.error('Import failed:',error.code || error.message);process.exitCode=1;});
module.exports={importPostgres};

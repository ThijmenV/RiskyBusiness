// Synthetic migration fixtures. Never copy real account data into CI or Git.
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
function createLegacySources(directory=fs.mkdtempSync(path.join(os.tmpdir(),'risky-fixtures-'))) {
 fs.mkdirSync(directory,{recursive:true});
 const files=[path.join(directory,'fixture.json'),path.join(directory,'fixture.sqlite')];
 const store=(label,entries,hash)=>({
  users:[{id:1,username:`Fixture ${label}`,email:`fixture-${label}@example.invalid`,password_hash:hash,created_at:'2026-01-01T12:00:00Z'}],
  groups:[{id:1,name:`Fixture group ${label}`,code:`FIXTURE${label}`,owner_id:1,created_at:'2026-01-01T12:00:00Z'}],
  group_members:[{id:1,group_id:1,user_id:1,role:'owner',joined_at:'2026-01-01T12:00:00Z'}],
  game_state:[{id:1,group_id:1,payload:JSON.stringify({troops:{528:{1:entries}},tiebreakers:{528:{1:1}},lastUpdated:{528:{1:1767268800000}},selectedPlayer:1,playerColors:{1:'#123456'},kissLog:Array.from({length:entries},(_,i)=>({id:1767268800000+i,name:`Synthetic entry ${i+1}`,age:20,date:'2026-01-01',playerId:1,country:'528',countryName:'Netherlands'}))}),updated_at:'2026-01-01T12:00:00Z'}]
 });
 const salt='1234567890abcdef1234567890abcdef';
 fs.writeFileSync(files[0],JSON.stringify(store('JSON',1,salt+':'+crypto.pbkdf2Sync('fixture-password',salt,310000,32,'sha256').toString('hex'))));
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(files[1]);
 try {
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT, password_hash TEXT, created_at TEXT); CREATE TABLE groups (id INTEGER PRIMARY KEY,name TEXT,code TEXT,owner_id INTEGER,created_at TEXT); CREATE TABLE group_members (id INTEGER PRIMARY KEY,group_id INTEGER,user_id INTEGER,role TEXT,joined_at TEXT); CREATE TABLE game_state (id INTEGER PRIMARY KEY,group_id INTEGER,payload TEXT,updated_at TEXT);');
  const data=store('SQLITE',4,require('bcryptjs').hashSync('fixture-password',4));
  for(const [table,rows] of Object.entries(data)) for(const row of rows) db.prepare(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row));
 }finally{db.close();}
 return {files,cleanup:()=>fs.rmSync(directory,{recursive:true,force:true})};
}
module.exports={createLegacySources};

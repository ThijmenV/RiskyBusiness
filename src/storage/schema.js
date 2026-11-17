const SCHEMA_VERSION=2;
const migrations=[
  `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS groups (id SERIAL PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, owner_id INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS group_members (id SERIAL PRIMARY KEY, group_id INTEGER NOT NULL, user_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'member', joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(group_id,user_id));
   CREATE TABLE IF NOT EXISTS game_state (id SERIAL PRIMARY KEY, group_id INTEGER NOT NULL UNIQUE, payload TEXT NOT NULL DEFAULT '{}', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, version INTEGER NOT NULL DEFAULT 0);
   ALTER TABLE game_state ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
   CREATE TABLE IF NOT EXISTS session (sid VARCHAR PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMP(6) NOT NULL);
   CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);`,
  `CREATE TABLE IF NOT EXISTS game_history (group_id INTEGER NOT NULL REFERENCES groups(id),version INTEGER NOT NULL,payload TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(group_id,version));`
];
async function migrateSchema(pool) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(73322,4615)');
    await client.query('CREATE TABLE IF NOT EXISTS risky_schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const applied=new Set((await client.query('SELECT version FROM risky_schema_migrations')).rows.map(r=>r.version));
    if([...applied].some(v=>v>SCHEMA_VERSION)) throw new Error('Database schema is newer than this application');
    for(let i=0;i<migrations.length;i++) if(!applied.has(i+1)) {
      await client.query(migrations[i]);
      await client.query('INSERT INTO risky_schema_migrations (version) VALUES ($1)',[i+1]);
    }
    await client.query('COMMIT');
    return SCHEMA_VERSION;
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
async function verifySchema(pool) {
  const exists=(await pool.query("SELECT to_regclass('risky_schema_migrations') AS name")).rows[0].name;
  if(!exists) throw new Error('Database requires migration. Run npm run db:migrate before deployment.');
  const versions=(await pool.query('SELECT version FROM risky_schema_migrations ORDER BY version')).rows.map(r=>r.version);
  if(versions.length!==SCHEMA_VERSION || versions.some((v,i)=>v!==i+1)) throw new Error('Database schema does not match this app. Run npm run db:migrate.');
}
module.exports={migrateSchema,verifySchema,SCHEMA_VERSION};

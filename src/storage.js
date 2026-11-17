const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');

function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(temp, file);
  } finally { fs.rmSync(temp, { force: true }); }
}
const HISTORY_LIMIT=20;
function validateStore(store) {
  for (const key of ['users', 'groups', 'group_members', 'game_state']) {
    if (!Array.isArray(store[key])) throw new Error(`Invalid database collection: ${key}`);
  }
  const ids = {};
  for (const key of ['users','groups','group_members','game_state']) {
    ids[key]=new Set();
    for(const row of store[key]) {
      if(!row || !Number.isSafeInteger(row.id) || row.id<=0 || ids[key].has(row.id)) throw new Error('Invalid or duplicate database id in '+key);
      ids[key].add(row.id);
    }
  }
  const emails=new Set();const codes=new Set();const memberships=new Set();const games=new Set();
  for(const u of store.users) {
    if(typeof u.email!=='string' || typeof u.username!=='string' || typeof u.password_hash!=='string' || emails.has(u.email.toLowerCase())) throw new Error('Invalid or duplicate account');
    emails.add(u.email.toLowerCase());
  }
  for(const g of store.groups) {
    if(!ids.users.has(g.owner_id) || typeof g.name!=='string' || typeof g.code!=='string' || codes.has(g.code)) throw new Error('Invalid group reference or invite code');
    codes.add(g.code);
  }
  for(const m of store.group_members) {
    const key=m.group_id+':'+m.user_id;
    if(!ids.groups.has(m.group_id) || !ids.users.has(m.user_id) || memberships.has(key)) throw new Error('Invalid group membership');
    memberships.add(key);
  }
  for(const g of store.groups) if(!memberships.has(g.id+':'+g.owner_id)) throw new Error('Group owner is not a member');
  for(const state of store.game_state) {
    if(state.version!==undefined && (!Number.isSafeInteger(state.version) || state.version<0)) throw new Error('Invalid game version');
    if(!ids.groups.has(state.group_id) || games.has(state.group_id)) throw new Error('Invalid or duplicate game reference');
    const parsed=JSON.parse(state.payload);
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw new Error('Invalid game payload');
    games.add(state.group_id);
  }
  if(store.game_history===undefined) store.game_history=[];
  if(!Array.isArray(store.game_history)) throw new Error('Invalid game history');
  const historyKeys=new Set();
  for(const row of store.game_history) {
    const key=row.group_id+':'+row.version;
    if(!ids.groups.has(row.group_id) || !Number.isSafeInteger(row.version) || row.version<0 || historyKeys.has(key)) throw new Error('Invalid history reference or version');
    const current=store.game_state.find(s=>s.group_id===row.group_id);
    if(!current || row.version>=(current.version || 0)) throw new Error('History is not older than the current game');
    const parsed=JSON.parse(row.payload);
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw new Error('Invalid history payload');
    historyKeys.add(key);
  }
  return store;
}
const initialStore = () => ({ users: [], groups: [], group_members: [], game_state: [], game_history: [] });
const nextId = items => items.length ? Math.max(...items.map(item => Number(item.id))) + 1 : 1;
const conflict = () => Object.assign(new Error('Game changed in another session. Export your changes, then reload.'), { status: 409 });

function createStorage({ databasePath = config.databasePath, databaseUrl = config.databaseUrl, schemaMode = config.production ? 'verify' : 'migrate' } = {}) {
  const pool = databaseUrl ? new (require('pg').Pool)({ connectionString: databaseUrl, max:2, connectionTimeoutMillis:5000, idleTimeoutMillis:10000, statement_timeout:10000, allowExitOnIdle:true }) : null;
  // pg respects sslmode in DATABASE_URL. Never disable certificate verification here.
  if(pool) pool.on('error',error=>console.error('Idle database connection:',error.code || error.name));
  let store;
  let ready;
  function ensureReady() {
    if (!ready) ready = initialize().catch(error => { ready = null; throw error; });
    return ready;
  }
  async function initialize() {
    if (!pool) {
      if (fs.existsSync(databasePath)) store = validateStore(JSON.parse(fs.readFileSync(databasePath, 'utf8')));
      else { store = initialStore(); atomicWrite(databasePath, store); }
      return;
    }
    const {migrateSchema,verifySchema}=require('./storage/schema');
    if(schemaMode==='migrate') await migrateSchema(pool);
    else await verifySchema(pool);
  }
  // Mutate a copy so failed disk writes cannot leave unpersisted in-memory changes.
  function mutate(fn) {
    const copy = structuredClone(store);
    const result = fn(copy);
    atomicWrite(databasePath, copy);
    store = copy;
    return result;
  }
  async function one(sql, params, collection, predicate) {
    await ensureReady();
    return pool ? (await pool.query(sql, params)).rows[0] || null : store[collection].find(predicate) || null;
  }
  const getUserByEmail = email => one('SELECT * FROM users WHERE lower(email) = lower($1)', [email], 'users', user => user.email.toLowerCase() === email.toLowerCase());
  const getUserById = id => one('SELECT * FROM users WHERE id = $1', [id], 'users', user => user.id === Number(id));
  const getGroupById = id => one('SELECT * FROM groups WHERE id = $1', [id], 'groups', group => group.id === Number(id));
  const getGroupByCode = code => one('SELECT * FROM groups WHERE code = $1', [code.toUpperCase()], 'groups', group => group.code === code.toUpperCase());
  const getGroupMembership = (gid, uid) => one('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [gid, uid], 'group_members', m => m.group_id === Number(gid) && m.user_id === Number(uid));
  async function createUser(username, email, passwordHash) {
    await ensureReady();
    if (pool) return (await pool.query('INSERT INTO users (username,email,password_hash) VALUES ($1,$2,$3) RETURNING *', [username,email,passwordHash])).rows[0];
    return mutate(s => {
      if (s.users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw Object.assign(new Error('Email already registered'), { status:409 });
      const user = { id:nextId(s.users), username, email, password_hash:passwordHash, created_at:new Date().toISOString() };
      s.users.push(user); return user;
    });
  }
  async function createGroup(name, ownerId) {
    await ensureReady();
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    if (!pool) return mutate(s => {
      const group = { id:nextId(s.groups),name,code,owner_id:ownerId,created_at:new Date().toISOString() };
      s.groups.push(group);
      s.group_members.push({id:nextId(s.group_members),group_id:group.id,user_id:ownerId,role:'owner',joined_at:new Date().toISOString()});
      s.game_state.push({id:nextId(s.game_state),group_id:group.id,payload:'{}',version:0,updated_at:new Date().toISOString()});
      return group;
    });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const group = (await client.query('INSERT INTO groups (name,code,owner_id) VALUES ($1,$2,$3) RETURNING *',[name,code,ownerId])).rows[0];
      await client.query("INSERT INTO group_members (group_id,user_id,role) VALUES ($1,$2,'owner')",[group.id,ownerId]);
      await client.query("INSERT INTO game_state (group_id,payload) VALUES ($1,'{}')",[group.id]);
      await client.query('COMMIT'); return group;
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async function joinGroup(gid, uid) {
    await ensureReady();
    if (pool) return (await pool.query('INSERT INTO group_members (group_id,user_id) VALUES ($1,$2) ON CONFLICT (group_id,user_id) DO NOTHING',[gid,uid])).rowCount > 0;
    if (store.group_members.some(m => m.group_id === Number(gid) && m.user_id === Number(uid))) return false;
    return mutate(s => { s.group_members.push({id:nextId(s.group_members),group_id:Number(gid),user_id:Number(uid),role:'member',joined_at:new Date().toISOString()}); return true; });
  }
  async function getGroupMembers(gid) {
    await ensureReady();
    if (pool) return (await pool.query("SELECT u.id,u.username,gm.role FROM group_members gm JOIN users u ON u.id=gm.user_id WHERE gm.group_id=$1 ORDER BY CASE WHEN gm.role='owner' THEN 0 ELSE 1 END,u.username",[gid])).rows;
    return store.group_members.filter(m => m.group_id === Number(gid)).map(m => {
      const u = store.users.find(u => u.id === m.user_id); return u && {id:u.id,username:u.username,role:m.role};
    }).filter(Boolean).sort((a,b) => a.role === b.role ? a.username.localeCompare(b.username) : a.role === 'owner' ? -1 : 1);
  }
  async function getGameSnapshot(gid) {
    const row = await one('SELECT * FROM game_state WHERE group_id=$1',[gid],'game_state',s => s.group_id === Number(gid));
    return { game: row ? JSON.parse(row.payload) : {}, version:row?.version || 0 };
  }
  async function getGameState(gid) { return (await getGameSnapshot(gid)).game; }
  async function saveGameState(gid, payload, expectedVersion) {
    await ensureReady();
    const serialized = JSON.stringify(payload);
    if (pool) {
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        const row=(await client.query('SELECT payload,version FROM game_state WHERE group_id=$1 FOR UPDATE',[gid])).rows[0];
        if(!row || row.version!==expectedVersion) throw conflict();
        await client.query('INSERT INTO game_history (group_id,version,payload) VALUES ($1,$2,$3)',[gid,row.version,row.payload]);
        const result=await client.query('UPDATE game_state SET payload=$1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE group_id=$2 RETURNING version',[serialized,gid]);
        await client.query('DELETE FROM game_history WHERE group_id=$1 AND version NOT IN (SELECT version FROM game_history WHERE group_id=$1 ORDER BY version DESC LIMIT $2)',[gid,HISTORY_LIMIT]);
        await client.query('COMMIT');
        return result.rows[0].version;
      }catch(error){await client.query('ROLLBACK');throw error;}
      finally{client.release();}
    }
    return mutate(s => {
      const row = s.game_state.find(g => g.group_id === Number(gid));
      if (!row || (row.version || 0) !== expectedVersion) throw conflict();
      s.game_history ||= [];
      s.game_history.push({group_id:Number(gid),version:row.version || 0,payload:row.payload,created_at:new Date().toISOString()});
      const retained=s.game_history.filter(h=>h.group_id===Number(gid)).sort((a,b)=>b.version-a.version).slice(0,HISTORY_LIMIT);
      s.game_history=s.game_history.filter(h=>h.group_id!==Number(gid)).concat(retained);
      row.payload=serialized; row.version=(row.version || 0)+1; row.updated_at=new Date().toISOString(); return row.version;
    });
  }
  async function listUserGroups(uid) {
    await ensureReady();
    if (pool) return (await pool.query('SELECT g.*,COUNT(gm.id)::integer AS member_count FROM groups g JOIN group_members me ON me.group_id=g.id AND me.user_id=$1 LEFT JOIN group_members gm ON gm.group_id=g.id GROUP BY g.id ORDER BY g.created_at DESC',[uid])).rows;
    const ids = new Set(store.group_members.filter(m => m.user_id === Number(uid)).map(m=>m.group_id));
    return store.groups.filter(g=>ids.has(g.id)).map(g=>({...g,member_count:store.group_members.filter(m=>m.group_id===g.id).length})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  }
  async function getGameHistory(gid) {
    await ensureReady();
    if(pool) return (await pool.query('SELECT version,created_at FROM game_history WHERE group_id=$1 ORDER BY version DESC',[gid])).rows;
    return (store.game_history || []).filter(h=>h.group_id===Number(gid)).sort((a,b)=>b.version-a.version).map(h=>({version:h.version,created_at:h.created_at}));
  }
  async function getHistoricalGame(gid,version) {
    const row=await one('SELECT payload,version FROM game_history WHERE group_id=$1 AND version=$2',[gid,version],'game_history',h=>h.group_id===Number(gid) && h.version===version);
    return row?{game:JSON.parse(row.payload),version:row.version}:null;
  }
  async function checkHealth() {
    await ensureReady();
    if(pool) await pool.query('SELECT 1');
    return {ok:true,storage:pool?'postgres':'json'};
  }
  return { getGameHistory,getHistoricalGame,checkHealth,type:pool?'postgres':'json',pool,ensureReady,getUserByEmail,getUserById,getGroupById,getGroupByCode,getGroupMembership,createUser,createGroup,joinGroup,getGroupMembers,getGameSnapshot,getGameState,saveGameState,listUserGroups,close:async()=>pool?.end() };
}
module.exports = { ...createStorage(), createStorage, atomicWrite, validateStore, HISTORY_LIMIT };

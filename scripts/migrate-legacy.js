// Sources are opened read-only. Never overwrite the original databases.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {atomicWrite,validateStore}=require('../src/storage');
const tables=['users','groups','group_members','game_state'];
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function readSource(file) {
  if(file.endsWith('.json')) return validateStore(JSON.parse(fs.readFileSync(file,'utf8')));
  const {DatabaseSync}=require('node:sqlite');
  const db=new DatabaseSync(file,{readOnly:true});
  try { return Object.fromEntries(tables.map(t=>[t,db.prepare(`SELECT * FROM ${t} ORDER BY id`).all().map(row=>({...row}))])); }
  finally { db.close(); }
}
function remapGame(game,userIds) {
  const copy=structuredClone(game);
  const id=old=>{
    if(!userIds[old]) throw new Error('State references an unknown player');
    return userIds[old];
  };
  for(const field of ['troops','tiebreakers','lastUpdated']) if(copy[field]) {
    copy[field]=Object.fromEntries(Object.entries(copy[field]).map(([cid,values])=>[cid,Object.fromEntries(Object.entries(values).map(([pid,value])=>[id(pid),value]))]));
  }
  if(copy.playerColors) copy.playerColors=Object.fromEntries(Object.entries(copy.playerColors).map(([pid,color])=>[id(pid),color]));
  if(copy.selectedPlayer!=null) copy.selectedPlayer=id(copy.selectedPlayer);
  if(copy.kissLog) copy.kissLog=copy.kissLog.map(e=>({...e,playerId:id(e.playerId)}));
  return copy;
}
function mergeSources(files) {
  const result={users:[],groups:[],group_members:[],game_state:[]};
  const sources=[];
  for(const file of files) {
    const data=readSource(file);
    const userIds={},groupIds={};
    for(const user of data.users) {
      if(result.users.some(u=>u.email.toLowerCase()===user.email.toLowerCase())) throw new Error('Duplicate email across sources: explicit reconciliation required');
      if(userIds[user.id]) throw new Error('Duplicate source user id');
      const id=result.users.length+1;userIds[user.id]=id;
      result.users.push({...user,id});
    }
    for(const group of data.groups) {
      if(!userIds[group.owner_id]) throw new Error('Unknown group owner');
      if(result.groups.some(g=>g.code===group.code)) throw new Error('Duplicate invite code across sources');
      const id=result.groups.length+1;groupIds[group.id]=id;
      result.groups.push({...group,id,owner_id:userIds[group.owner_id]});
    }
    for(const member of data.group_members) {
      if(!groupIds[member.group_id] || !userIds[member.user_id]) throw new Error('Unknown group member reference');
      result.group_members.push({...member,id:result.group_members.length+1,group_id:groupIds[member.group_id],user_id:userIds[member.user_id]});
    }
    for(const state of data.game_state) {
      if(!groupIds[state.group_id]) throw new Error('Unknown game group');
      const game=JSON.parse(state.payload);
      result.game_state.push({...state,id:result.game_state.length+1,group_id:groupIds[state.group_id],version:state.version || 0,payload:JSON.stringify(remapGame(game,userIds))});
    }
    sources.push({file:path.basename(file),sha256:digest(file),counts:Object.fromEntries(tables.map(t=>[t,data[t].length])),userIds,groupIds});
  }
  // Verify every value with an inverse player mapping, not just row counts.
  for(let index=0,offset=0;index<files.length;index++) {
    const original=readSource(files[index]);
    const inverse=Object.fromEntries(Object.entries(sources[index].userIds).map(([a,b])=>[b,Number(a)]));
    for(const [i,row] of original.game_state.entries()) {
      if(!isDeepStrictEqual(JSON.parse(row.payload),remapGame(JSON.parse(result.game_state[offset+i].payload),inverse))) throw new Error('Game verification failed');
    }
    offset+=original.game_state.length;
  }
  validateStore(result);
  result._migration={schemaVersion:1,sources};
  return result;
}
function migrate(files,output) {
  const merged=mergeSources(files);
  if(fs.existsSync(output)) {
    const existing=JSON.parse(fs.readFileSync(output,'utf8'));
    if(!isDeepStrictEqual(existing._migration,merged._migration)) throw new Error('Destination exists with a different migration; refusing to overwrite');
    // Runtime state may legitimately have changed since import. Never rewrite it.
    return {status:'already-migrated',counts:Object.fromEntries(tables.map(t=>[t,existing[t].length]))};
  }
  atomicWrite(output,merged);
  if(!isDeepStrictEqual(JSON.parse(fs.readFileSync(output,'utf8')),merged)) throw new Error('Destination verification failed');
  return {status:'migrated',counts:Object.fromEntries(tables.map(t=>[t,merged[t].length]))};
}
if(require.main===module) {
  const args=process.argv.slice(2);const at=args.indexOf('--output');
  const output=at>=0?args.splice(at,2)[1]:process.env.DB_PATH || path.resolve(__dirname,'../data/app.json');
  const files=args.length?args:[path.resolve(__dirname,'../risky-business-data.json'),path.resolve(__dirname,'../risky-business.sqlite')];
  try { console.log(JSON.stringify(migrate(files,output))); }
  catch(error) { console.error('Migration failed:',error.message);process.exitCode=1; }
}
module.exports={readSource,mergeSources,migrate,remapGame};

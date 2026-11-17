const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {mergeSources,migrate,readSource,remapGame}=require('../scripts/migrate-legacy');
const fixture=require('../fixtures/legacy-sources.cjs').createLegacySources();
const sources=fixture.files;
test.after(fixture.cleanup);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('synthetic JSON and SQLite datasets migrate without modifying sources or losing any fields',()=>{
  const hashes=sources.map(sha);const data=mergeSources(sources);
  assert.equal(data.users.length,2);assert.equal(data.groups.length,2);
  assert.equal(new Set(data.users.map(u=>u.id)).size,2);
  assert.equal(data.game_state.reduce((n,row)=>n+JSON.parse(row.payload).kissLog.length,0),5);
  for(const [i,source] of sources.entries()) {
    const original=readSource(source);const m=data._migration.sources[i];
    const user=data.users.find(u=>u.id===m.userIds[original.users[0].id]);
    assert.equal(user.password_hash,original.users[0].password_hash);
    const state=data.game_state.find(r=>r.group_id===m.groupIds[original.groups[0].id]);
    assert.deepEqual(JSON.parse(state.payload),remapGame(JSON.parse(original.game_state[0].payload),m.userIds));
    assert.equal(data.groups.find(g=>g.id===state.group_id).owner_id,user.id);
  }
  assert.deepEqual(sources.map(sha),hashes);
});
test('repeat migration preserves subsequent edits; foreign destinations and duplicate sources are refused',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'risky-migration-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'app.json');assert.equal(migrate(sources,file).status,'migrated');
  const data=JSON.parse(fs.readFileSync(file));data.groups[0].name='Changed later';fs.writeFileSync(file,JSON.stringify(data));
  assert.equal(migrate(sources,file).status,'already-migrated');assert.equal(JSON.parse(fs.readFileSync(file)).groups[0].name,'Changed later');
  assert.throws(()=>migrate([sources[0]],file),/different migration/);
  assert.throws(()=>mergeSources([sources[0],sources[0]]),/Duplicate email/);
});
test('historical six-player roster is recoverable without executing old code or inventing accounts',()=>{
  const {historicalSettings}=require('../scripts/recover-jsonbin');
  const {importRecovered}=require('../scripts/import-recovered');
  const {players}=historicalSettings();
  assert.deepEqual(players.map(p=>p.name),['Thom','Thijmen','Thijs','Aidan','Jorik','Chris']);
  const store=mergeSources(sources);
  const recovered={format:'risky-business-recovered',schemaVersion:1,sha256:'synthetic-test-fingerprint',players,game:{troops:{528:{1:4,2:2,3:1}},tiebreakers:{},lastUpdated:{},kissLog:[]}};
  const result=importRecovered(store,recovered,2);
  assert.equal(result.users.length,2); // Players are not fake login identities.
  assert.equal(result.groups.length,3);
  const state=JSON.parse(result.game_state[2].payload);
  assert.equal(state.players.length,6);assert.deepEqual(state.troops,recovered.game.troops);
  assert.equal(result.group_members.at(-1).user_id,2);
  assert.equal(importRecovered(result,recovered,2),result);
  assert.throws(()=>importRecovered(store,recovered,999),/existing owner/);
});

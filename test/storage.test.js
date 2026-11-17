const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createStorage}=require('../src/storage');
test('JSON persists through restarts, rejects stale saves and never overwrites malformed data',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'risky-storage-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'data.json');
  const a=createStorage({databasePath:file,databaseUrl:''});
  const user=await a.createUser('Test','storage@example.invalid','hash');
  const group=await a.createGroup('Test',user.id);
  assert.equal(await a.saveGameState(group.id,{troops:{528:{1:5}}},0),1);
  await assert.rejects(a.saveGameState(group.id,{troops:{}},0),{status:409});
  const b=createStorage({databasePath:file,databaseUrl:''});assert.deepEqual(await b.getGameSnapshot(group.id),{version:1,game:{troops:{528:{1:5}}}});
  fs.writeFileSync(file,'{broken');
  const c=createStorage({databasePath:file,databaseUrl:''});await assert.rejects(c.ensureReady(),SyntaxError);
  assert.equal(fs.readFileSync(file,'utf8'),'{broken');
});

const test=require('node:test');const assert=require('node:assert/strict');const {spawnSync}=require('node:child_process');
test('production refuses ephemeral JSON and a missing or short session secret',()=>{
  function run(extra){return spawnSync(process.execPath,['-e',"require('./src/config').validateProductionConfig()"],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,NODE_ENV:'production',DATABASE_URL:'',SESSION_SECRET:'',...extra},encoding:'utf8'});}
  assert.notEqual(run({}).status,0);
  assert.notEqual(run({DATABASE_URL:'postgresql://localhost/test',SESSION_SECRET:'short'}).status,0);
  assert.notEqual(run({DATABASE_URL:'postgresql://example.invalid/test',SESSION_SECRET:'test-only-'.repeat(4)}).status,0);
  assert.equal(run({DATABASE_URL:'postgresql://example.invalid/test?sslmode=verify-full',SESSION_SECRET:'test-only-'.repeat(4)}).status,0);
  assert.equal(run({DATABASE_URL:'postgresql://localhost/test',SESSION_SECRET:'test-only-'.repeat(4)}).status,0);
});

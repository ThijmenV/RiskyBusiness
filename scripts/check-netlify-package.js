// Runs the actual built function in separate Lambda-like processes against disposable PostgreSQL schemas.
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawnSync}=require('node:child_process');const assert=require('node:assert/strict');const {Pool}=require('pg');const {createStorage}=require('../src/storage');
async function checkPackage(databaseUrl=process.env.TEST_DATABASE_URL) {
 if(!databaseUrl) throw new Error('TEST_DATABASE_URL is required for a disposable schema');
 const root=path.resolve(__dirname,'..');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'risky-netlify-package-'));
 const schema='risky_package_'+process.pid;const admin=new Pool({connectionString:databaseUrl});let storage;
 try {
  const unpack=spawnSync('python3',['-c',"import zipfile,sys,pathlib; z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); assert not any(n.startswith(('data/','.git/')) or n.endswith(('.sqlite','.env')) or 'recovered-jsonbin' in n or 'risky-business-data.json' in n or '..' in pathlib.PurePosixPath(n).parts for n in names); z.extractall(sys.argv[2])",path.join(root,'dist/functions/app.zip'),temp],{encoding:'utf8'});
  assert.equal(unpack.status,0,'Package privacy/extraction check failed');
  assert.ok(fs.existsSync(path.join(temp,'public/game.html')));
  assert.ok(!fs.existsSync(path.join(root,'dist/site/game.html')),'Game HTML must go through the authenticated function route');
  await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(databaseUrl);url.searchParams.set('options','-c search_path='+schema);
  storage=createStorage({databaseUrl:url.toString(),schemaMode:'migrate'});await storage.ensureReady();
  function invoke(route,method='GET',body,cookie) {
   const event={path:'/.netlify/functions/app'+route,httpMethod:method,headers:{host:'risky.example','x-forwarded-proto':'https','x-nf-client-connection-ip':'203.0.113.10','content-type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):null,isBase64Encoded:false,queryStringParameters:{}};
   const code="const fs=require('node:fs');const {handler}=require(process.env.LAMBDA_TASK_ROOT+'/app.js');handler(JSON.parse(fs.readFileSync(0,'utf8')),{}).then(r=>{console.log(JSON.stringify(r));process.exit(0)}).catch(()=>process.exit(1));";
   const result=spawnSync(process.execPath,['-e',code],{cwd:temp,env:{...process.env,NODE_ENV:'production',NETLIFY:'true',CONTEXT:'production',LAMBDA_TASK_ROOT:temp,DATABASE_URL:url.toString(),SESSION_SECRET:'disposable-package-test-only-'.repeat(2)},input:JSON.stringify(event),encoding:'utf8',timeout:20000});
   assert.equal(result.status,0,'Packaged function execution failed');return JSON.parse(result.stdout.trim());
  }
  assert.equal(invoke('/api/health').statusCode,200);
  const signup=invoke('/api/auth/signup','POST',{username:'Package check',email:'package-check@example.invalid',password:'package-test123'});assert.equal(signup.statusCode,201);
  const cookie=signup.multiValueHeaders['set-cookie'][0];assert.match(cookie,/Secure/i);assert.match(cookie,/HttpOnly/i);
  assert.equal(invoke('/api/auth/me','GET',null,cookie.split(';')[0]).statusCode,200,'Session must survive a cold function instance');
  const created=invoke('/api/groups','POST',{name:'Packaged game'},cookie.split(';')[0]);assert.equal(created.statusCode,201);const group=JSON.parse(created.body).group;
  assert.equal(invoke(`/groups/${group.id}/play`,'GET',null,cookie.split(';')[0]).statusCode,200,'Bundled game page must exist at runtime');
  assert.equal(invoke('/risky-business-data.json').statusCode,404);
  console.log('Built ZIP verified: no private files, runtime health, HTTPS cookies, shared PostgreSQL sessions across cold instances and authenticated game HTML.');
 }finally{if(storage)await storage.close();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module) checkPackage().catch(error=>{console.error('Package check failed:',error.message);process.exitCode=1;});
module.exports={checkPackage};

const assert=require('node:assert/strict');
async function checkHosting(address) {
 const origin=new URL(address);
 if(origin.protocol!=='https:' || origin.username || origin.password || origin.pathname!=='/' || origin.search) throw new Error('Use a public HTTPS origin without credentials, path or query');
 const get=async route=>fetch(new URL(route,origin),{signal:AbortSignal.timeout(30000),redirect:'manual'});
 let response=await get('/');assert.equal(response.status,200,'Dashboard failed');assert.match(await response.text(),/Risky Business/);
 response=await get('/api/health');assert.equal(response.status,200,'Database readiness failed');assert.deepEqual(await response.json(),{ok:true,storage:'postgres'});
 for(const route of ['/css/game.css','/js/game.js','/vendor/countries-110m.json']) assert.equal((await get(route)).status,200,'Static asset failed');
 assert.equal((await get('/api/groups')).status,401,'Unauthenticated API access must be refused');
 for(const route of ['/data/app.json','/risky-business-data.json','/.env','/risky-business.sqlite']) assert.equal((await get(route)).status,404,'Private path must not be published');
 console.log('Public HTTPS smoke passed: dashboard, database, static assets and private-path protection. No writes performed.');
}
if(require.main===module) checkHosting(process.argv[2]).catch(error=>{console.error('Hosting check failed:',error.message);process.exitCode=1;});
module.exports={checkHosting};

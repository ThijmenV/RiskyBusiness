const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createStorage}=require('../src/storage');const {createApp}=require('../src/app');const {createHandler}=require('../netlify/functions/app');
test('Netlify handler supports original and rewritten paths, errors and cookies',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'risky-function-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const storage=createStorage({databasePath:path.join(dir,'app.json'),databaseUrl:''});const handler=createHandler(createApp({storage}));
 const event=(url,method='GET',data,headers={})=>({path:url,httpMethod:method,headers:{host:'local.example','content-type':'application/json',...headers},body:data?JSON.stringify(data):null,isBase64Encoded:false,queryStringParameters:{},requestContext:{identity:{sourceIp:'127.0.0.1'}}});
 for(const url of ['/api/health','/.netlify/functions/app/api/health']) {
  const response=await handler(event(url),{});assert.equal(response.statusCode,200);assert.equal(JSON.parse(response.body).ok,true);
 }
 const signup=await handler(event('/.netlify/functions/app/api/auth/signup','POST',{username:'Serverless',email:'serverless@example.invalid',password:'serverless-test123'}),{});
 assert.equal(signup.statusCode,201);const cookie=signup.multiValueHeaders['set-cookie'][0].split(';')[0];
 const me=await handler(event('/api/auth/me','GET',null,{cookie}),{});assert.equal(me.statusCode,200);
 const original=storage.checkHealth;storage.checkHealth=async()=>{throw new Error('Simulated database outage');};
 assert.equal((await handler(event('/api/health'),{})).statusCode,503);storage.checkHealth=original;
 assert.equal((await handler(event('/api/not-found'),{})).statusCode,404);
});
test('real Netlify events without API Gateway context validate signup instead of failing rate limiting',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'risky-netlify-event-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const storage=createStorage({databasePath:path.join(dir,'app.json'),databaseUrl:''});const handler=createHandler(createApp({storage}));
 const event={path:'/api/auth/signup',httpMethod:'POST',headers:{host:'local.example','content-type':'application/json','x-nf-client-connection-ip':'203.0.113.10'},body:'{}',isBase64Encoded:false};
 assert.equal((await handler(event,{})).statusCode,400);
 const signup=await handler({...event,body:JSON.stringify({username:'Real Netlify event',email:'netlify-event@example.invalid',password:'netlify-event-test123'})},{});
 assert.equal(signup.statusCode,201);
});
test('Netlify client IP takes precedence over spoofed forwarded headers, including IPv6',async()=>{
 const express=require('express');const app=express();app.set('trust proxy',1);app.get('/ip',(req,res)=>res.json({ip:req.ip}));const handler=createHandler(app);
 const event={path:'/ip',httpMethod:'GET',headers:{'X-Nf-Client-Connection-Ip':'2001:db8::1','X-Forwarded-For':'198.51.100.99'},body:''};
 const response=await handler(event,{});assert.equal(JSON.parse(response.body).ip,'2001:db8::1');
 const unknown=await handler({...event,headers:{'x-forwarded-for':'198.51.100.99'}},{});assert.equal(JSON.parse(unknown.body).ip,'0.0.0.0');
});

const serverless=require('serverless-http');
const {isIP}=require('node:net');
const {createApp}=require('../../src/app');
function createHandler(app) {
  const proxy=serverless(app);
  return async(event,context={})=>{
    context.callbackWaitsForEmptyEventLoop=false;
    const prefix='/.netlify/functions/app';
    const path=event.path?.startsWith(prefix)?event.path.slice(prefix.length) || '/':event.path;
    // Netlify's Lambda events do not provide API Gateway's sourceIp. The edge
    // overwrites this header; use it rather than a visitor-supplied X-Forwarded-For.
    const headers=Object.fromEntries(Object.entries(event.headers || {}).map(([key,value])=>[key.toLowerCase(),value]));
    const candidate=[headers['x-nf-client-connection-ip'],context.ip,event.requestContext?.identity?.sourceIp].find(ip=>typeof ip==='string' && isIP(ip));
    // Unknown clients share a rate-limit bucket instead of causing a 500 or
    // accepting an untrusted forwarded address.
    const sourceIp=candidate || '0.0.0.0';
    delete headers['x-forwarded-for'];
    const requestContext={...event.requestContext,identity:{...event.requestContext?.identity,sourceIp}};
    if(requestContext.http) requestContext.http={...requestContext.http,sourceIp};
    return proxy({...event,path,headers,requestContext},context);
  };
}
let handler;
exports.handler=async(event,context)=>{
  handler ||= createHandler(createApp());
  return handler(event,context);
};
exports.createHandler=createHandler;

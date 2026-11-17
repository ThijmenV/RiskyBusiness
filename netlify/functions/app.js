const serverless=require('serverless-http');
const {createApp}=require('../../src/app');
function createHandler(app) {
  const proxy=serverless(app);
  return async(event,context={})=>{
    context.callbackWaitsForEmptyEventLoop=false;
    const prefix='/.netlify/functions/app';
    const path=event.path?.startsWith(prefix)?event.path.slice(prefix.length) || '/':event.path;
    return proxy({...event,path},context);
  };
}
let handler;
exports.handler=async(event,context)=>{
  handler ||= createHandler(createApp());
  return handler(event,context);
};
exports.createHandler=createHandler;

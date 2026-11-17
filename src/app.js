const express=require('express');
const session=require('express-session');
const path=require('node:path');
const {rootDirectory,sessionSecret,production,validateProductionConfig}=require('./config');
const defaultStorage=require('./storage');
const {createAuthRouter}=require('./routes/auth');
const {createGroupsRouter}=require('./routes/groups');
const {asyncRoute,fail}=require('./http');
function createApp({storage=defaultStorage}={}) {
  validateProductionConfig();
  const app=express();app.disable('x-powered-by');
  if(production) app.set('trust proxy',1);
  app.use((req,res,next)=>{
    res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'});
    if(req.path.startsWith('/api/') || req.path.startsWith('/groups/')) res.set('Cache-Control','no-store');
    if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.get('Origin')) {
      let origin;
      try { origin=new URL(req.get('Origin')); } catch { return next(Object.assign(new Error('Invalid origin'),{status:403})); }
      if(origin.origin!==`${req.protocol}://${req.get('host')}`) return next(Object.assign(new Error('Cross-origin writes are not allowed'),{status:403}));
    }
    next();
  });
  app.use(express.json({limit:'2mb'}));
  app.use((req,res,next)=>{
    if(['POST','PUT','PATCH'].includes(req.method) && !req.is('application/json')) return res.status(415).json({error:'Use application/json'});
    next();
  });
  const sessionStore=storage.pool ? new (require('connect-pg-simple')(session))({pool:storage.pool,createTableIfMissing:false,pruneSessionInterval:false}) : undefined;
  app.use(session({name:'risky.sid',store:sessionStore,secret:sessionSecret,resave:false,saveUninitialized:false,cookie:{secure:production,httpOnly:true,sameSite:'lax',maxAge:7*24*60*60*1000}}));
  app.get('/api/health',asyncRoute(async(req,res)=>{try { res.json(await storage.checkHealth()); } catch { res.status(503).json({ok:false,error:'Database unavailable or migration required'}); }}));
  app.use('/api/auth',createAuthRouter(storage));
  app.use('/api/groups',createGroupsRouter(storage));
  app.use('/api',(req,res)=>res.status(404).json({error:'API route not found'}));
  app.get('/groups/:id/play',asyncRoute(async(req,res)=>{
    if(!req.session.userId) return res.redirect('/');
    if(!/^\d+$/.test(req.params.id)) fail(400,'Invalid group id');
    const group=await storage.getGroupById(req.params.id);
    if(!group) fail(404,'Group not found');
    if(!await storage.getGroupMembership(group.id,req.session.userId)) fail(403,'Not a member of this group');
    res.sendFile(path.join(rootDirectory,'public','game.html'));
  }));
  app.get('/Risky_business-Thoms-Laptop.html',(req,res)=>res.redirect('/'));
  app.get('/game.html',(req,res)=>res.redirect('/'));
  const vendors={
    'd3.min.js':'d3/dist/d3.min.js',
    'topojson-client.min.js':'topojson-client/dist/topojson-client.min.js',
    'countries-110m.json':'world-atlas/countries-110m.json'
  };
  for(const [name,file] of Object.entries(vendors)) app.get(`/vendor/${name}`,(req,res)=>res.sendFile(path.join(rootDirectory,'node_modules',file)));
  app.use(express.static(path.join(rootDirectory,'public')));
  app.use((req,res)=>res.status(404).send('Not found'));
  app.use((error,req,res,next)=>{
    const status=error.code==='23505'?409:error.status || 500;
    if(status>=500) console.error('Request failed:',error.code || error.name);
    res.status(status).json({error:status>=500?'Internal server error':error.message});
  });
  app.locals.storage=storage;app.locals.sessionStore=sessionStore;
  return app;
}
module.exports={createApp};

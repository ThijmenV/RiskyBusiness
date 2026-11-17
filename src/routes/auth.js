const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { requireAuth } = require('../middleware/require-auth');
const { hashPassword,verifyPassword } = require('../security/passwords');
const { asyncRoute,fail,text } = require('../http');
const publicUser = u => ({id:u.id,username:u.username,email:u.email});
const regenerate = req => new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
function createAuthRouter(storage) {
  const router=express.Router();
  router.use(rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Try again later.'}}));
  router.post('/signup',asyncRoute(async(req,res)=>{
    const username=text(req.body.username,'username',80);
    const email=text(req.body.email,'email',254).toLowerCase();
    const password=req.body.password;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password!=='string' || password.length<8 || password.length>256) fail(400,'Use a valid email and a password of 8–256 characters');
    if(await storage.getUserByEmail(email)) fail(409,'Email already registered');
    const user=await storage.createUser(username,email,await hashPassword(password));
    await regenerate(req);req.session.userId=user.id;
    res.status(201).json({user:publicUser(user)});
  }));
  router.post('/login',asyncRoute(async(req,res)=>{
    const email=text(req.body.email,'email',254).toLowerCase();
    const password=req.body.password;
    if(typeof password!=='string' || password.length>256) fail(400,'Invalid password');
    const user=await storage.getUserByEmail(email);
    if(!user || !await verifyPassword(password,user.password_hash)) fail(401,'Invalid credentials');
    await regenerate(req);req.session.userId=user.id;
    res.json({user:publicUser(user)});
  }));
  router.post('/logout',asyncRoute(async(req,res)=>{
    await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()));
    res.clearCookie('risky.sid');res.json({ok:true});
  }));
  router.get('/me',requireAuth,asyncRoute(async(req,res)=>{
    const user=await storage.getUserById(req.session.userId);
    if(!user) fail(404,'User not found');
    res.json({user:publicUser(user)});
  }));
  return router;
}
module.exports={createAuthRouter};

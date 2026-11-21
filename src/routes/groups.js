const express = require('express');
const { requireAuth } = require('../middleware/require-auth');
const { asyncRoute,fail,text,requireGameVersion } = require('../http');
const { validateGame } = require('../game/validate');
function createGroupsRouter(storage) {
  const router=express.Router(); router.use(requireAuth);
  router.get('/',asyncRoute(async(req,res)=>res.json({groups:await storage.listUserGroups(req.session.userId)})));
  router.post('/',asyncRoute(async(req,res)=>{
    const group=await storage.createGroup(text(req.body.name,'group name'),req.session.userId);
    res.status(201).json({group:{id:group.id,name:group.name,code:group.code}});
  }));
  router.post('/join',asyncRoute(async(req,res)=>{
    const group=await storage.getGroupByCode(text(req.body.code,'invite code',32));
    if(!group) fail(404,'Group not found');
    await storage.joinGroup(group.id,req.session.userId);
    res.json({group:{id:group.id,name:group.name,code:group.code}});
  }));
  router.use('/:id',asyncRoute(async(req,res,next)=>{
    if(!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) fail(400,'Invalid group id');
    const group=await storage.getGroupById(req.params.id);
    if(!group) fail(404,'Group not found');
    if(!await storage.getGroupMembership(group.id,req.session.userId)) fail(403,'Not a member of this group');
    req.group=group;next();
  }));
  router.get('/:id',asyncRoute(async(req,res)=>{
    const members=await storage.getGroupMembers(req.group.id);
    const snapshot=await storage.getGameSnapshot(req.group.id);
    res.json({group:{...req.group,members,players:snapshot.game.players || members,state:snapshot.game,version:snapshot.version}});
  }));
  router.get('/:id/game',asyncRoute(async(req,res)=>res.json(await storage.getGameSnapshot(req.group.id))));
  router.post('/:id/game',asyncRoute(async(req,res)=>{
    const version=requireGameVersion(req);
    const members=await storage.getGroupMembers(req.group.id);
    validateGame(req.body,members);
    const nextVersion=await storage.saveGameState(req.group.id,req.body,version);
    res.json({ok:true,version:nextVersion});
  }));
  router.get('/:id/history',asyncRoute(async(req,res)=>res.json({history:await storage.getGameHistory(req.group.id)})));
  router.post('/:id/history/:version/restore',asyncRoute(async(req,res)=>{
    if(!/^\d+$/.test(req.params.version) || !Number.isSafeInteger(Number(req.params.version))) fail(400,'Invalid history version');
    const expected=requireGameVersion(req);
    const past=await storage.getHistoricalGame(req.group.id,Number(req.params.version));
    if(!past) fail(404,'Historical version not found');
    validateGame(past.game,await storage.getGroupMembers(req.group.id));
    const version=await storage.saveGameState(req.group.id,past.game,expected);
    res.json({ok:true,version,game:past.game});
  }));
  router.get('/:id/backup',asyncRoute(async(req,res)=>{
    const members=await storage.getGroupMembers(req.group.id);
    const snapshot=await storage.getGameSnapshot(req.group.id);
    // Export no emails, password hashes or session secrets.
    res.set('Content-Disposition',`attachment; filename="risky-business-group-${req.group.id}.json"`);
    res.json({format:'risky-business-group',schemaVersion:1,exportedAt:new Date().toISOString(),group:{id:req.group.id,name:req.group.name},members,...snapshot});
  }));
  return router;
}
module.exports={createGroupsRouter};

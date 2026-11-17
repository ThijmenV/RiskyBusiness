const { fail } = require('../http');
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const positiveId = x => /^\d+$/.test(String(x)) && Number.isSafeInteger(Number(x)) && Number(x)>0;
function validateGame(game, members) {
  if (!object(game)) fail(400,'Invalid game state');
  if (game.players !== undefined) {
    if (!Array.isArray(game.players) || game.players.length<1 || game.players.length>100) fail(400,'Invalid player roster');
    const ids=new Set();
    for(const p of game.players) {
      if(!object(p) || !positiveId(p.id) || ids.has(String(p.id)) || typeof p.name!=='string' || !p.name.trim() || p.name.length>80 || typeof p.color!=='string' || !/^#[0-9a-f]{6}$/i.test(p.color)) fail(400,'Invalid roster player');
      ids.add(String(p.id));
    }
  }
  const players = new Set((game.players || members).map(m=>String(m.id)));
  const player = id => positiveId(id) && players.has(String(id));
  for (const field of ['troops','tiebreakers','lastUpdated']) {
    if (game[field] === undefined) continue;
    if (!object(game[field])) fail(400,`Invalid ${field}`);
    for (const [cid,values] of Object.entries(game[field])) {
      if (!positiveId(cid) || Number(cid)>999 || !object(values)) fail(400,`Invalid ${field} country`);
      for (const [pid,value] of Object.entries(values)) {
        if (!player(pid) || !(Number.isSafeInteger(value) && value>=0 || field==='tiebreakers' && typeof value==='boolean')) fail(400,`Invalid ${field} value`);
      }
    }
  }
  if (game.selectedPlayer != null && !player(game.selectedPlayer)) fail(400,'Invalid selected player');
  if (game.playerColors !== undefined) {
    if (!object(game.playerColors)) fail(400,'Invalid player colors');
    for (const [pid,color] of Object.entries(game.playerColors)) if (!player(pid) || typeof color!=='string' || !/^#[0-9a-f]{6}$/i.test(color)) fail(400,'Invalid player color');
  }
  if (game.kissLog !== undefined) {
    if (!Array.isArray(game.kissLog) || game.kissLog.length>10000) fail(400,'Invalid log');
    const ids = new Set();
    for (const e of game.kissLog) {
      if (!object(e) || !Number.isSafeInteger(e.id) || e.id<=0 || ids.has(e.id) || !player(e.playerId) || typeof e.name!=='string' || !e.name.trim() || e.name.length>200) fail(400,'Invalid log entry');
      ids.add(e.id);
      if (e.age!=null && (!Number.isInteger(e.age) || e.age<0 || e.age>150)) fail(400,'Invalid age');
      if (e.country!=null && e.country!=='' && (!positiveId(e.country) || Number(e.country)>999)) fail(400,'Invalid entry country');
      if (typeof e.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !Number.isFinite(Date.parse(e.date)) || new Date(e.date).toISOString().slice(0,10)!==e.date) fail(400,'Invalid date');
      if (e.countryName!=null && (typeof e.countryName!=='string' || e.countryName.length>120)) fail(400,'Invalid country name');
    }
  }
  return game;
}
module.exports = { validateGame };

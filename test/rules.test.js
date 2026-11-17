const test=require('node:test');
const assert=require('node:assert/strict');
const {winner,continentController}=require('../public/js/game-rules');
test('territory scoring preserves troop, tiebreaker, newest-update and exact tie order',()=>{
  const s={troops:{'528':{'1':2,'2':3}},tiebreakers:{},lastUpdated:{}};
  assert.equal(winner(s,'1'),null);
  assert.equal(winner(s,'528'),2);
  s.troops['528']['1']=3;assert.equal(winner(s,'528'),1);
  s.lastUpdated['528']={'1':10,'2':20};assert.equal(winner(s,'528'),2);
  s.tiebreakers['528']={'1':2,'2':1};assert.equal(winner(s,'528'),1);
  s.tiebreakers['528']={'1':true,'2':false};assert.equal(winner(s,'528'),1);
  s.troops['528']={'1':0,'2':0};assert.equal(winner(s,'528'),null);
});
test('continent requires three territories and a unique leader; historical membership retained',()=>{
  const s={troops:{'36':{1:1},'554':{1:1}}};
  assert.equal(continentController(s,'Oceania'),null);
  s.troops['598']={1:1};assert.equal(continentController(s,'Oceania'),1);
  const europe={troops:{8:{1:1},40:{1:1},56:{1:1},100:{2:1},191:{2:1},196:{2:1}}};
  assert.equal(continentController(europe,'Europe'),null);
});

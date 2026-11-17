const test=require('node:test');const assert=require('node:assert/strict');
const {normalizeLegacyGame}=require('../scripts/normalize-legacy-game');
test('legacy country aliases preserve scores, merge distinct players and keep the newest timestamp',()=>{
 const original={troops:{36:{4:1},'036':{4:1},'056':{1:2},56:{2:3},undefined:{}},tiebreakers:{528:{1:2},undefined:{}},lastUpdated:{36:{4:200},'036':{4:100}},kissLog:[{id:1,country:'056',playerId:1}],extra:{retained:true}};
 const before=structuredClone(original);const {game,report}=normalizeLegacyGame(original);
 assert.deepEqual(original,before);
 assert.deepEqual(game.troops['36'],{4:1});
 assert.deepEqual(game.troops['56'],{1:2,2:3});
 assert.equal(game.troops.undefined,undefined);
 assert.equal(game.lastUpdated['36'][4],200);
 assert.equal(game.kissLog[0].country,'56');
 assert.deepEqual(game.extra,{retained:true});
 assert.equal(report.emptyInvalidKeys.length,2);
 assert.equal(report.timestampAliases.length,1);
 assert.equal(normalizeLegacyGame(game).report.countryAliases.length,0);
});
test('legacy data conflicts cannot silently discard or sum scores',()=>{
 assert.throws(()=>normalizeLegacyGame({troops:{36:{4:1},'036':{4:2}}}),/Conflicting legacy counters/);
 assert.throws(()=>normalizeLegacyGame({troops:{undefined:{4:1}}}),/manual reconciliation/);
 assert.throws(()=>normalizeLegacyGame({troops:{36:[]}}),/container/);
});

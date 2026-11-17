const {isDeepStrictEqual}=require('node:util');
function normalizeLegacyGame(original) {
  const game=structuredClone(original);
  const report={countryAliases:[],emptyInvalidKeys:[],timestampAliases:[]};
  for(const field of ['troops','tiebreakers','lastUpdated']) {
    const normalized={};
    for(const [country,values] of Object.entries(game[field] || {})) {
      if(!values || typeof values!=='object' || Array.isArray(values)) throw new Error('Invalid legacy country container');
      const number=/^\d+$/.test(country)?Number(country):NaN;
      if(!Number.isSafeInteger(number) || number<1 || number>999) {
        if(Object.keys(values).length) throw new Error('Invalid country key contains player data; manual reconciliation required');
        report.emptyInvalidKeys.push({field,country});continue;
      }
      const canonical=String(number);
      if(canonical!==country) report.countryAliases.push({field,from:country,to:canonical});
      normalized[canonical] ||= {};
      for(const [player,value] of Object.entries(values)) {
        const existing=normalized[canonical][player];
        if(existing!==undefined && !isDeepStrictEqual(existing,value)) {
          if(field!=='lastUpdated' || !Number.isSafeInteger(value) || !Number.isSafeInteger(existing)) throw new Error(`Conflicting legacy counters for ${field}/${canonical}/${player}; manual reconciliation required`);
          report.timestampAliases.push({country:canonical,player,kept:Math.max(existing,value),older:Math.min(existing,value)});
          normalized[canonical][player]=Math.max(existing,value);
        } else normalized[canonical][player]=value;
      }
    }
    game[field]=normalized;
  }
  game.kissLog=(game.kissLog || []).map(entry=>{
    if(entry.country==null || entry.country==='') return entry;
    if(!/^\d+$/.test(String(entry.country))) throw new Error('Invalid legacy entry country');
    return {...entry,country:String(Number(entry.country))};
  });
  return {game,report};
}
module.exports={normalizeLegacyGame};

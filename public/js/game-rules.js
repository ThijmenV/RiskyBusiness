// Shared, deterministic rules. Historical continent membership is deliberately preserved.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GameRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CONTINENTS = {
  'Europe': [8,40,56,100,191,196,203,208,246,250,276,300,348,372,380,440,442,528,578,616,620,642,703,705,724,752,756,804,826],
  'Asia': [4,50,64,104,116,156,356,360,364,368,392,398,400,408,410,414,418,422,524,586,608,643,682,760,764,784,800,860,704,887],
  'Africa': [12,24,120,180,208,231,288,404,426,434,450,454,504,508,562,566,646,686,694,706,710,736,768,788,800,894,716],
  'North America': [124,192,214,222,320,332,340,484,558,591,840,630],
  'South America': [32,68,76,152,170,218,600,604,858,862,858],
  'Oceania': [36,554,598],
};
  function winner(state, cid) {
    const t = state.troops?.[cid];
    if (!t) return null;
    const best = Math.max(0, ...Object.values(t));
    if (!best) return null;
    let tied = Object.keys(t).filter(id => t[id] === best).map(Number);
    const tb = state.tiebreakers?.[cid] || {};
    const max = Math.max(0, ...tied.map(id => Number(tb[id]) || 0));
    if (max > 0) tied = tied.filter(id => Number(tb[id]) === max);
    const times = state.lastUpdated?.[cid] || {};
    return tied.reduce((latest, id) => (times[id] || 0) > (times[latest] || 0) ? id : latest);
  }
  function continentController(state, name) {
    const counts = {};
    for (const cid of CONTINENTS[name] || []) {
      const id = winner(state, String(cid));
      if (id) counts[id] = (counts[id] || 0) + 1;
    }
    const ranked = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    if (!ranked.length || ranked[0][1] < 3 || ranked[1]?.[1] === ranked[0][1]) return null;
    return Number(ranked[0][0]);
  }
  return { CONTINENTS, winner, continentController };
});

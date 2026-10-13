/* Print pool candidates side by side: map | goal | solved board.  usage: node tools/review.js <recipe> [n] */
'use strict';
const Sim = require('../js/sim.js');
const name = process.argv[2], n = +(process.argv[3] || 12);
const pool = require('./pool/' + name + '.json');
pool.forEach((p, k) => p.k = k);
pool.sort((a, b) => a.stats.diff - b.stats.diff);
for (const p of pool.slice(0, n)) {
  const L = Sim.parse(p.def), r = Sim.run(L, p.def.sol);
  const fin = [];
  for (let y = 0; y < L.h; y++) { let s = ''; for (let x = 0; x < L.w; x++) { const i = y * L.w + x; s += L.terrain[i] === 1 ? '#' : (r.state.col[i] ? Sim.NAME[r.state.col[i]] : (r.state.sd[i] ? Sim.NAME[r.state.sd[i]].toLowerCase() : '.')); } fin.push(s); }
  const st = p.stats;
  console.log(`#${p.k} seed=${p.seed} sol=${st.solutions} dist=${st.distinct} diff=${st.diff} tg=${st.targets} first=${st.firstCells} offs=${st.offsetKinds} inks=${p.def.inks.join(',')} plan=${JSON.stringify(p.def.sol.map(d => [d.x, d.y, d.t]))}`);
  for (let y = 0; y < L.h; y++) console.log('   ' + p.def.map[y] + '   ' + p.def.goal[y] + '   ' + fin[y]);
}

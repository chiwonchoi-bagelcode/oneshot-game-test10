// Verify the daily sheet for ~3 years of dates: recoloured + mirrored puzzle must replay its solution.
const vm = require('vm'), fs = require('fs'), path = require('path');
const Sim = require('../js/sim.js');
const ctx = { window: { InkSim: Sim }, Date, Math };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'daily.js'), 'utf8'), ctx);
const D = ctx.window.InkDaily;
let bad = 0, n = 0; const seen = new Map(); let repeatsWithin30 = 0;
const start = new Date(2026, 0, 1);
for (let k = 0; k < 1100; k++) {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
  const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const def = D.get(key), L = Sim.parse(def), r = Sim.run(L, def.sol);
  n++; if (!r.ok) { bad++; console.log('BAD', key, r.error); }
  const sig = def.map.join('/') + def.goal.join('/') + def.inks.join();
  if (seen.has(sig) && k - seen.get(sig) < 30) repeatsWithin30++;
  seen.set(sig, k);
}
console.log(`daily: ${n} dates, ${bad} unsolvable, ${seen.size} distinct sheets, ${repeatsWithin30} exact repeats within 30 days, pool ${D.size}`);
process.exit(bad ? 1 : 0);

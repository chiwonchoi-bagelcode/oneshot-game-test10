/* Generate a candidate pool for a set of recipes.
 * usage: node tools/pool.js <recipeName,...> <count> <seedBase> [outDir]
 * Writes tools/pool/<recipe>.json (appends to existing).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { generate } = require('./gen.js');
const RECIPES = require('./recipes.js');

const names = process.argv[2].split(',');
const count = +(process.argv[3] || 10);
const base = +(process.argv[4] || 1);
const outDir = process.argv[5] || path.join(__dirname, 'pool');
fs.mkdirSync(outDir, { recursive: true });

for (const name of names) {
  const rc = RECIPES[name];
  if (!rc) { console.error('unknown recipe', name); continue; }
  const file = path.join(outDir, name + '.json');
  const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const seen = new Set(out.map(o => o.def.map.join('/') + '|' + o.def.goal.join('/')));
  for (let s = 0; s < count; s++) {
    const seed = base + s * 104729;
    const t0 = Date.now();
    let g = null;
    try { g = generate(rc, seed); } catch (e) { console.error(name, seed, e.message); }
    if (!g) { console.log(name, seed, 'none', Date.now() - t0 + 'ms'); continue; }
    const key = g.def.map.join('/') + '|' + g.def.goal.join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ recipe: name, seed, stats: g.stats, def: g.def });
    console.log(name, seed, JSON.stringify(g.stats), Date.now() - t0 + 'ms');
    fs.writeFileSync(file, JSON.stringify(out));
  }
}

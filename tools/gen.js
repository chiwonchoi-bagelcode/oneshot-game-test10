/* Solution-first level generator.
 * 1. build terrain from a recipe, 2. play a random (human-friendly) drop plan,
 * 3. pick goal cells greedily until the plan is (nearly) forced, 4. measure difficulty.
 */
'use strict';
const Sim = require('../js/sim.js');
const { solve } = require('./solver.js');

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
function wpick(r, weights) { let tot = 0; for (const w of weights) tot += w; let x = r() * tot; for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; } return weights.length - 1; }

function grid(w, h, ch) { const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(ch)); return g; }

function connected(g) {
  const h = g.length, w = g[0].length; let start = -1, total = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] !== '#') { total++; if (start < 0) start = y * w + x; }
  if (start < 0) return false;
  const seen = new Uint8Array(w * h), st = [start]; seen[start] = 1; let c = 0;
  while (st.length) { const i = st.pop(); c++; const x = i % w, y = (i - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (!seen[j] && g[ny][nx] !== '#') { seen[j] = 1; st.push(j); } } }
  return c === total;
}

function buildTerrain(rc, r) {
  const { w, h } = rc;
  for (let attempt = 0; attempt < 200; attempt++) {
    const g = grid(w, h, '.');
    const sym = rc.sym && r() < (rc.symP == null ? 0.7 : rc.symP);
    const put = (x, y, ch) => { g[y][x] = ch; if (sym) g[y][w - 1 - x] = ch; };
    const half = sym ? Math.ceil(w / 2) : w;
    const style = rc.walls || 'none';
    if (style === 'scatter') {
      const n = Math.round(w * h * (rc.wallDensity || 0.1) / (sym ? 2 : 1));
      for (let k = 0; k < n; k++) put(Math.floor(r() * half), Math.floor(r() * h), '#');
    } else if (style === 'segments') {
      const n = rc.segments || 3;
      for (let k = 0; k < n; k++) {
        const len = 2 + Math.floor(r() * (rc.segLen || 3)), horiz = r() < 0.5;
        let x = Math.floor(r() * half), y = Math.floor(r() * h);
        for (let s = 0; s < len; s++) { if (x >= 0 && y >= 0 && x < w && y < h) put(x, y, '#'); if (horiz) x++; else y++; }
      }
    } else if (style === 'rooms') {
      // a few full walls with gaps
      const n = rc.segments || 2;
      for (let k = 0; k < n; k++) {
        if (r() < 0.5) { const y = 1 + Math.floor(r() * (h - 2)); const gap = Math.floor(r() * w); for (let x = 0; x < w; x++) if (Math.abs(x - gap) > (rc.gap || 0)) g[y][x] = '#'; }
        else { const x = 1 + Math.floor(r() * (w - 2)); const gap = Math.floor(r() * h); for (let y = 0; y < h; y++) if (Math.abs(y - gap) > (rc.gap || 0)) g[y][x] = '#'; }
      }
    }
    if (rc.thick) {
      const blobs = rc.thick;
      for (let k = 0; k < blobs; k++) {
        let x = Math.floor(r() * half), y = Math.floor(r() * h); const len = 2 + Math.floor(r() * (rc.thickLen || 3));
        for (let s = 0; s < len; s++) { if (g[y][x] === '.') put(x, y, '~'); const d = Math.floor(r() * 4); x = Math.max(0, Math.min(half - 1, x + [1, -1, 0, 0][d])); y = Math.max(0, Math.min(h - 1, y + [0, 0, 1, -1][d])); }
      }
    }
    if (!connected(g)) continue;
    // count open cells
    let open = 0; for (const row of g) for (const ch of row) if (ch !== '#') open++;
    if (open < w * h * 0.45) continue;
    const free = () => { const c = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.') c.push([x, y]); return c; };
    for (const c of (rc.seeds || [])) { const f = free(); if (!f.length) break; const [x, y] = pick(r, f); g[y][x] = c.toLowerCase(); }
    for (const c of (rc.blots || [])) { const f = free(); if (!f.length) break; const [x, y] = pick(r, f); g[y][x] = c.toUpperCase(); }
    if (rc.wells) {
      for (let k = 0; k < rc.wells; k++) { const f = free(); if (!f.length) break; const [x, y] = pick(r, f); g[y][x] = 'o'; }
    }
    return g.map(row => row.join(''));
  }
  return null;
}

function randomPlan(L, rc, r) {
  const drops = []; let S = new Sim.State(L); let t = 0;
  const offW = rc.offsetWeights || [1, 3, 3, 2, 1, 1];
  for (let k = 0; k < L.inks.length; k++) {
    if (k > 0) {
      let off = wpick(r, offW);
      if (off === 0 && S.perBeat >= 2) off = 1;
      if (rc.noSameBeat && off === 0) off = 1;
      for (let s = 0; s < off; s++) { if (!Sim.active(L, S)) break; Sim.step(L, S, null); }
      t = S.t;
    }
    const opts = []; for (let i = 0; i < L.n; i++) if (Sim.canDrop(L, S, i)) opts.push(i);
    if (!opts.length) return null;
    const i = pick(r, opts);
    Sim.drop(L, S, i); drops.push({ i, t: S.t });
  }
  let guard = 0; while (Sim.active(L, S) && guard++ < 300) Sim.step(L, S, null);
  return { drops, S };
}

function interesting(L, S, rc) {
  const n = L.n; const count = {};
  for (let i = 0; i < n; i++) { const c = S.col[i]; count[c] = (count[c] || 0) + 1; }
  // every ink colour must hold some ground
  const used = new Set(L.inks.map(k => k.c));
  for (const c of used) if ((count[c] || 0) < (rc.minRegion || 2)) return false;
  let mixed = 0; for (const c of [3, 5, 6]) mixed += count[c] || 0;
  if (rc.mix && (mixed < rc.mix[0] || mixed > rc.mix[1])) return false;
  if ((count[7] || 0) > (rc.maxMud == null ? 0 : rc.maxMud)) return false;
  if (rc.dry) {
    let empty = 0; for (let i = 0; i < n; i++) if (L.terrain[i] !== Sim.WALL && S.col[i] === 0 && !S.sd[i]) empty++;
    if (empty < rc.dry) return false;
  }
  if (rc.seedsMustWake) { for (const sd of L.seeds) if (S.col[sd.i] !== sd.c) return false; }
  return true;
}

function goalFrom(L, set, final) {
  const rows = [];
  for (let y = 0; y < L.h; y++) {
    let s = '';
    for (let x = 0; x < L.w; x++) { const i = y * L.w + x; s += set.has(i) ? (final[i] === 0 ? 'x' : Sim.NAME[final[i]]) : '.'; }
    rows.push(s);
  }
  return rows;
}

function manhattan(L, a, b) { return Math.abs(a % L.w - b % L.w) + Math.abs(((a / L.w) | 0) - ((b / L.w) | 0)); }

function chooseTargets(map, L, plan, rc, r) {
  const final = plan.S.col;
  const cand = { mix: [], prim: [], dry: [] };
  for (let i = 0; i < L.n; i++) {
    if (L.terrain[i] === Sim.WALL) continue;
    if (L.seeds.some(s => s.i === i) && final[i] === 0) continue;
    if (L.blots.some(s => s.i === i)) continue;
    const c = final[i];
    if (c === 0) { if (rc.dry) cand.dry.push(i); }
    else if (c === 7) continue;
    else if (Sim.isPrimary(c)) cand.prim.push(i);
    else cand.mix.push(i);
  }
  // initial set: a couple of mixed cells (meeting points) or one primary per colour
  const T = new Set();
  const mixes = cand.mix.slice().sort(() => r() - 0.5);
  for (const i of mixes) { if (T.size >= (rc.initMix || 1)) break; T.add(i); }
  if (rc.dry) { const d = cand.dry.slice().sort(() => r() - 0.5); for (let k = 0; k < Math.min(rc.dry, d.length); k++) T.add(d[k]); }
  if (!T.size) T.add(pick(r, cand.prim));
  let res, tries = 0;
  for (;;) {
    const def = { id: 'g', map, goal: goalFrom(L, T, final), inks: rc.inks };
    res = solve(def, { keepBoards: true, cap: rc.enumCap || 400000, leafCap: rc.leafCap || 6e6 });
    if (!res.aborted) break;
    if (++tries > 6) return null;
    // add a primary far from current targets to cut the space
    let best = -1, bd = -1;
    for (const i of cand.prim.concat(cand.mix)) { if (T.has(i)) continue; let d = 1e9; for (const j of T) d = Math.min(d, manhattan(L, i, j)); if (d > bd) { bd = d; best = i; } }
    if (best < 0) return null; T.add(best);
  }
  const baseLeaves = res.leaves;
  const T0 = new Set(T);
  let boards = res.boards;
  const sMax = rc.sMax || 3, maxT = rc.maxTargets || 8;
  const pool = cand.mix.concat(cand.prim, rc.dry ? cand.dry : []);
  const weight = i => final[i] === 0 ? 1.15 : (Sim.isPrimary(final[i]) ? (rc.primW || 0.8) : 1.6);
  while (boards.length > sMax) {
    if (T.size >= maxT) return null;
    let best = -1, bs = 0;
    for (const i of pool) {
      if (T.has(i)) continue;
      let elim = 0; for (const b of boards) if (b[i] !== final[i]) elim++;
      if (!elim) continue;
      let near = 0; for (const j of T) if (manhattan(L, i, j) <= 1) near++;
      const s = elim * weight(i) * (near ? 0.55 : 1) * (0.9 + r() * 0.2);
      if (s > bs) { bs = s; best = i; }
    }
    if (best < 0) return null;
    T.add(best);
    boards = boards.filter(b => b[best] === final[best]);
  }
  // prune redundant targets added by the greedy pass (initial ones are baked into the enumeration)
  const all = res.boards;
  for (const i of Array.from(T).sort(() => r() - 0.5)) {
    if (T0.has(i) || T.size <= (rc.minTargets || 2)) continue;
    T.delete(i);
    let cnt = 0;
    for (const b of all) { let m = true; for (const j of T) if (b[j] !== final[j]) { m = false; break; } if (m && ++cnt > sMax) break; }
    if (cnt > sMax) T.add(i);
  }
  return { T, baseLeaves };
}

function generate(rc, seed) {
  const r = rng(seed);
  for (let attempt = 0; attempt < (rc.attempts || 60); attempt++) {
    const map = buildTerrain(rc, r);
    if (!map) continue;
    const L = Sim.parse({ id: 'g', map, inks: rc.inks });
    const plan = randomPlan(L, rc, r);
    if (!plan) continue;
    if (!interesting(L, plan.S, rc)) continue;
    const tg = chooseTargets(map, L, plan, rc, r);
    if (!tg) continue;
    const goal = goalFrom(L, tg.T, plan.S.col);
    const def = { map, goal, inks: rc.inks.slice() };
    const fin = solve(def, { cap: 1e6, leafCap: 2e7 });
    if (!fin.solutions || fin.aborted) continue;
    if (rc.requireDistinct && !fin.distinctOnly) continue;
    const stats = {
      solutions: fin.solutions, distinct: fin.distinctOnly, leaves: fin.leaves, baseLeaves: tg.baseLeaves,
      firstCells: fin.firstCells, offsetKinds: Object.keys(fin.offsets).length,
      zeroOffsetOnly: Object.keys(fin.offsets).every(k => k.split(',').every(v => v === '0')),
      targets: tg.T.size, diff: +(Math.log2(Math.max(2, tg.baseLeaves) / fin.solutions)).toFixed(2)
    };
    def.sol = fin.best.map(d => ({ x: d.x, y: d.y, t: d.t }));
    return { def, stats, seed, attempt };
  }
  return null;
}

module.exports = { generate, buildTerrain, rng };

if (require.main === module) {
  const rc = JSON.parse(process.argv[2]);
  const n = +(process.argv[3] || 5), base = +(process.argv[4] || 1);
  for (let s = 0; s < n; s++) {
    const t0 = Date.now();
    const g = generate(rc, base + s * 7919);
    if (!g) { console.log('seed', base + s * 7919, 'none'); continue; }
    console.log(JSON.stringify({ seed: g.seed, stats: g.stats, ms: Date.now() - t0 }));
    console.log(g.def.map.map((row, y) => row + '   ' + g.def.goal[y]).join('\n'));
    console.log(JSON.stringify(g.def.sol));
  }
}

/* Exhaustive solver for Inkbloom levels (Node).
 * Enumerates drop sequences (cell, beat) in ink order, pruning as soon as a goal cell breaks.
 * Counts solutions and leaves, and keeps a "human friendly" canonical solution
 * (prefers drops on distinct beats, then the earliest/simplest timing).
 */
'use strict';
const Sim = require('../js/sim.js');

function solve(defOrL, opts) {
  opts = opts || {};
  const L = defOrL.nb ? defOrL : Sim.parse(defOrL);
  const K = L.inks.length;
  const cap = opts.cap || 1e9;            // stop after this many solutions
  const leafCap = opts.leafCap || 5e8;    // safety
  const maxPerBeat = opts.maxPerBeat || 2;
  const tMax = opts.tMax || 40;
  const keepBoards = !!opts.keepBoards;
  const res = { solutions: 0, leaves: 0, nodes: 0, best: null, bestScore: Infinity, boards: keepBoards ? [] : null,
    distinctOnly: 0, firstCells: new Set(), aborted: false, minGap: Infinity, sameBeatNeeded: true, offsets: {} };
  const path = [];

  function score(p) {
    // lower is friendlier: penalise same-beat pairs heavily, then total waiting
    let s = 0;
    for (let a = 1; a < p.length; a++) { if (p[a].t === p[a - 1].t) s += 100; }
    s += p[p.length - 1].t;
    return s;
  }

  function finish(S) {
    res.leaves++;
    let guard = 0;
    while (Sim.active(L, S) && guard++ < 200) {
      Sim.step(L, S, null);
      if (Sim.broken(L, S) >= 0) return;
    }
    if (!Sim.solved(L, S)) return;
    res.solutions++;
    let distinct = true;
    for (let a = 1; a < path.length; a++) if (path[a].t === path[a - 1].t) distinct = false;
    if (distinct) { res.distinctOnly++; res.sameBeatNeeded = false; }
    res.firstCells.add(path[0].i);
    if (path.length > 1) {
      const key = path.slice(1).map((d, a) => d.t - path[a].t).join(',');
      res.offsets[key] = (res.offsets[key] || 0) + 1;
    }
    const sc = score(path);
    if (sc < res.bestScore) { res.bestScore = sc; res.best = path.map(d => ({ i: d.i, x: d.i % L.w, y: (d.i / L.w) | 0, t: d.t })); }
    if (keepBoards) res.boards.push(S.col.slice());
  }

  function dfs(S) {
    if (res.solutions >= cap || res.leaves >= leafCap) { res.aborted = true; return; }
    res.nodes++;
    const k = S.k;
    if (k === K) { finish(S); return; }
    // drop ink k now
    if (!(S.lastDropT === S.t && S.perBeat >= maxPerBeat)) {
      for (let i = 0; i < L.n; i++) {
        if (!Sim.canDrop(L, S, i)) continue;
        const s2 = S.clone();
        Sim.drop(L, s2, i);
        if (L.target[i] && L.target[i] !== s2.col[i]) continue;
        path.push({ i: i, t: S.t });
        dfs(s2);
        path.pop();
        if (res.aborted) return;
      }
    }
    // or wait a beat (time only starts with the first drop)
    if (k > 0 && S.t < tMax && (Sim.active(L, S) || (S.lastDropT === S.t && S.perBeat >= maxPerBeat))) {
      const s2 = S.clone();
      Sim.step(L, s2, null);
      if (Sim.broken(L, s2) < 0) dfs(s2);
    }
  }

  dfs(new Sim.State(L));
  res.firstCells = res.firstCells.size;
  return res;
}

module.exports = { solve };

if (require.main === module) {
  const def = JSON.parse(process.argv[2]);
  const t0 = Date.now();
  const r = solve(def, { cap: 1e7 });
  console.log(JSON.stringify({ solutions: r.solutions, leaves: r.leaves, nodes: r.nodes, best: r.best, ms: Date.now() - t0 }));
}

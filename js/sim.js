/* Inkbloom — deterministic simulation core.
 * Shared by the browser game and the Node level tools (solver, generator, verifier).
 *
 * Rules
 *  - Time is counted in beats. Time starts with the player's first drop (beat 0).
 *  - On every beat each active ink cell bleeds into its empty orthogonal neighbours.
 *  - A drop made between beat t and beat t+1 is born at beat t and bleeds from beat t+1.
 *  - If two different colours reach an empty cell on the same beat they mix there.
 *    A mixed cell is a seam: it never bleeds further.
 *  - First come, first served: a coloured cell never changes again.
 *
 * Map legend   . paper   # wall   ~ thick paper (ink rests one extra beat)
 *              o well (if a level has wells, drops are only allowed on wells)
 *              R Y B  wet blot (starts bleeding when time starts)
 *              r y b  sleeping ink (wakes when any ink touches it)
 * Goal legend  . none   R Y B O G P  colour target   x must stay dry
 * Inks         'R' bleeds forever, 'R3' bleeds 3 steps then stops.
 */
(function (root) {
  'use strict';

  var R = 1, Y = 2, B = 4;
  var CODE = { R: 1, Y: 2, B: 4, O: 3, P: 5, G: 6, K: 7 };
  var NAME = ['', 'R', 'Y', 'O', 'B', 'P', 'G', 'K'];
  var WALL = 1, THICK = 2;
  var DRY = 8;
  var UNL = 255;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  function isPrimary(c) { return c === 1 || c === 2 || c === 4; }
  function bits(c) { return (c & 1) + ((c >> 1) & 1) + ((c >> 2) & 1); }

  function parseInk(s) {
    var m = /^([RYB])(\d*)$/.exec(String(s).trim());
    if (!m) throw new Error('bad ink: ' + s);
    return { c: CODE[m[1]], r: m[2] ? parseInt(m[2], 10) : UNL };
  }

  function parse(def) {
    var map = def.map, goal = def.goal || null;
    var h = map.length, w = map[0].length, n = w * h;
    var terrain = new Uint8Array(n), well = new Uint8Array(n), target = new Uint8Array(n);
    var blots = [], seeds = [], wells = 0, targets = [], dries = [];
    for (var y = 0; y < h; y++) {
      if (map[y].length !== w) throw new Error((def.id || '?') + ': ragged map row ' + y);
      if (goal && goal[y].length !== w) throw new Error((def.id || '?') + ': ragged goal row ' + y);
      for (var x = 0; x < w; x++) {
        var i = y * w + x, ch = map[y][x];
        if (ch === '#') terrain[i] = WALL;
        else if (ch === '~') terrain[i] = THICK;
        else if (ch === 'o') { well[i] = 1; wells++; }
        else if (ch === 'R' || ch === 'Y' || ch === 'B') blots.push({ i: i, c: CODE[ch] });
        else if (ch === 'r' || ch === 'y' || ch === 'b') seeds.push({ i: i, c: CODE[ch.toUpperCase()] });
        else if (ch !== '.') throw new Error((def.id || '?') + ': unknown map char ' + ch);
        var g = goal ? goal[y][x] : '.';
        if (g === 'x') { target[i] = DRY; dries.push(i); }
        else if (g !== '.') {
          if (!CODE[g] || g === 'K') throw new Error((def.id || '?') + ': unknown goal char ' + g);
          target[i] = CODE[g]; targets.push(i);
        }
        if (target[i] && terrain[i] === WALL) throw new Error((def.id || '?') + ': goal on wall');
      }
    }
    var nb = new Int16Array(n * 4);
    for (var j = 0; j < n; j++) {
      var jx = j % w, jy = (j - jx) / w;
      for (var d = 0; d < 4; d++) {
        var nx = jx + DX[d], ny = jy + DY[d];
        nb[j * 4 + d] = (nx < 0 || ny < 0 || nx >= w || ny >= h) ? -1 : ny * w + nx;
      }
    }
    return {
      id: def.id, w: w, h: h, n: n, terrain: terrain, well: well, hasWells: wells > 0,
      blots: blots, seeds: seeds, target: target, targets: targets, dries: dries,
      inks: (def.inks || []).map(parseInk), nb: nb
    };
  }

  function State(L) {
    if (!L) return;
    var n = L.n;
    this.col = new Uint8Array(n);   // colour bits, 0 = dry paper
    this.rdy = new Uint8Array(n);   // first beat at which the cell may bleed
    this.rng = new Uint8Array(n);   // remaining bleed steps (255 = unlimited)
    this.sd = new Uint8Array(n);    // sleeping ink colour
    this.t = 0; this.k = 0; this.lastDropT = -1; this.perBeat = 0;
    for (var a = 0; a < L.blots.length; a++) {
      var bl = L.blots[a];
      this.col[bl.i] = bl.c; this.rdy[bl.i] = L.terrain[bl.i] === THICK ? 2 : 1; this.rng[bl.i] = UNL;
    }
    for (var s = 0; s < L.seeds.length; s++) this.sd[L.seeds[s].i] = L.seeds[s].c;
  }
  State.prototype.clone = function () {
    var o = new State(null);
    o.col = this.col.slice(); o.rdy = this.rdy.slice(); o.rng = this.rng.slice(); o.sd = this.sd.slice();
    o.t = this.t; o.k = this.k; o.lastDropT = this.lastDropT; o.perBeat = this.perBeat;
    return o;
  };

  function canDrop(L, S, i) {
    return S.k < L.inks.length && i >= 0 && i < L.n && L.terrain[i] !== WALL &&
      S.col[i] === 0 && S.sd[i] === 0 && (!L.hasWells || L.well[i] === 1);
  }

  function drop(L, S, i) {
    if (!canDrop(L, S, i)) return false;
    var ink = L.inks[S.k++];
    S.col[i] = ink.c; S.rdy[i] = S.t + (L.terrain[i] === THICK ? 2 : 1); S.rng[i] = ink.r;
    if (S.lastDropT === S.t) S.perBeat++; else { S.perBeat = 1; S.lastDropT = S.t; }
    return true;
  }

  /* Advance one beat. If `ev` is an array, per-cell events are pushed for the renderer:
     { i, c, mixed, wake, from: [[dir, colour], ...] }  (dir = side the ink came from) */
  function step(L, S, ev) {
    var n = L.n, col = S.col, rdy = S.rdy, rng = S.rng, sd = S.sd, nb = L.nb, terrain = L.terrain;
    var t = S.t + 1;
    var nc = null, nr = null, nw = null, cnt = 0;
    for (var i = 0; i < n; i++) {
      if (col[i] !== 0 || terrain[i] === WALL) continue;
      var m = 0, best = 0, from = null;
      for (var d = 0; d < 4; d++) {
        var j = nb[i * 4 + d];
        if (j < 0) continue;
        var cj = col[j];
        if ((cj === 1 || cj === 2 || cj === 4) && rng[j] > 0 && rdy[j] <= t) {
          m |= cj;
          var r = rng[j] === UNL ? UNL : rng[j] - 1;
          if (r > best) best = r;
          if (ev) (from || (from = [])).push([d, cj]);
        }
      }
      if (!m) continue;
      if (!nc) { nc = []; nr = []; nw = []; }
      nc.push(i); nr.push(m); nw.push(best);
      if (ev) {
        if (sd[i]) ev.push({ i: i, c: sd[i], mixed: false, wake: true, from: from });
        else ev.push({ i: i, c: m, mixed: !isPrimary(m), wake: false, from: from });
      }
      cnt++;
    }
    for (var a = 0; a < cnt; a++) {
      var ci = nc[a], extra = terrain[ci] === THICK ? 1 : 0;
      if (sd[ci]) {
        col[ci] = sd[ci]; sd[ci] = 0; rdy[ci] = t + 1 + extra; rng[ci] = UNL;
      } else if (isPrimary(nr[a])) {
        col[ci] = nr[a]; rdy[ci] = t + 1 + extra; rng[ci] = nw[a];
      } else {
        col[ci] = nr[a]; rdy[ci] = 0; rng[ci] = 0;
      }
    }
    S.t = t;
    return cnt;
  }

  /* True while some ink can still bleed somewhere. */
  function active(L, S) {
    var n = L.n, col = S.col, rng = S.rng, nb = L.nb, terrain = L.terrain;
    for (var i = 0; i < n; i++) {
      var c = col[i];
      if ((c === 1 || c === 2 || c === 4) && rng[i] > 0) {
        for (var d = 0; d < 4; d++) {
          var j = nb[i * 4 + d];
          if (j >= 0 && col[j] === 0 && terrain[j] !== WALL) return true;
        }
      }
    }
    return false;
  }

  function hasDropSpot(L, S) {
    if (S.k >= L.inks.length) return false;
    for (var i = 0; i < L.n; i++) if (canDrop(L, S, i)) return true;
    return false;
  }

  /* Index of the first broken goal cell, or -1. */
  function broken(L, S) {
    var tg = L.target, col = S.col;
    for (var a = 0; a < L.targets.length; a++) {
      var i = L.targets[a];
      if (col[i] !== 0 && col[i] !== tg[i]) return i;
    }
    for (var b = 0; b < L.dries.length; b++) if (col[L.dries[b]] !== 0) return L.dries[b];
    return -1;
  }

  function allTargetsMet(L, S) {
    for (var a = 0; a < L.targets.length; a++) {
      var i = L.targets[a];
      if (S.col[i] !== L.target[i]) return false;
    }
    return true;
  }

  function solved(L, S) {
    if (!allTargetsMet(L, S)) return false;
    for (var b = 0; b < L.dries.length; b++) if (S.col[L.dries[b]] !== 0) return false;
    return true;
  }

  /* With no further drops, will this state end up solved? (used for early success) */
  function settlesSolved(L, S) {
    if (!allTargetsMet(L, S)) return false;
    if (!L.dries.length) return true;
    var s = S.clone(), guard = 0;
    while (active(L, s) && guard++ < 400) {
      step(L, s, null);
      if (broken(L, s) >= 0) return false;
    }
    return solved(L, s);
  }

  /* Run a drop list [{i|x,y, t}] from scratch. Returns { ok, state, ticks, error }. */
  function run(L, drops, opts) {
    opts = opts || {};
    var S = new State(L), list = drops.map(function (d) {
      return { i: d.i != null ? d.i : d.y * L.w + d.x, t: d.t };
    });
    var p = 0, guard = 0, error = null;
    while (guard++ < 600) {
      while (p < list.length && list[p].t <= S.t) {
        if (list[p].t < S.t) { error = 'drop ' + p + ' is in the past'; break; }
        if (!drop(L, S, list[p].i)) { error = 'drop ' + p + ' at ' + list[p].i + ' not allowed (t=' + S.t + ')'; break; }
        p++;
      }
      if (error) break;
      if (p >= list.length && !active(L, S)) break;
      if (!active(L, S) && p < list.length) { S.t = list[p].t; continue; } // idle beats
      step(L, S, null);
    }
    return { ok: !error && p === list.length && solved(L, S), state: S, error: error };
  }

  /* Re-colour a level definition with a colour permutation and/or mirror (used by the daily puzzle). */
  function transform(def, perm, mirror) {
    // perm maps primary letters, e.g. { R: 'B', Y: 'R', B: 'Y' }
    function pc(code) {
      var out = 0;
      if (code & 1) out |= CODE[perm.R];
      if (code & 2) out |= CODE[perm.Y];
      if (code & 4) out |= CODE[perm.B];
      return out;
    }
    function mapCh(ch, isGoal) {
      if (isGoal) {
        if (ch === '.' || ch === 'x') return ch;
        return NAME[pc(CODE[ch])];
      }
      if (ch === 'R' || ch === 'Y' || ch === 'B') return NAME[pc(CODE[ch])];
      if (ch === 'r' || ch === 'y' || ch === 'b') return NAME[pc(CODE[ch.toUpperCase()])].toLowerCase();
      return ch;
    }
    function row(s, isGoal) {
      var o = s.split('').map(function (ch) { return mapCh(ch, isGoal); });
      if (mirror) o.reverse();
      return o.join('');
    }
    var w = def.map[0].length;
    var out = JSON.parse(JSON.stringify(def));
    out.map = def.map.map(function (s) { return row(s, false); });
    if (def.goal) out.goal = def.goal.map(function (s) { return row(s, true); });
    out.inks = def.inks.map(function (s) { return perm[s[0]] + s.slice(1); });
    if (def.sol) out.sol = def.sol.map(function (d) { return { x: mirror ? w - 1 - d.x : d.x, y: d.y, t: d.t }; });
    return out;
  }

  var api = {
    R: R, Y: Y, B: B, CODE: CODE, NAME: NAME, WALL: WALL, THICK: THICK, DRY: DRY, UNL: UNL, DX: DX, DY: DY,
    isPrimary: isPrimary, bits: bits, parse: parse, State: State, canDrop: canDrop, drop: drop, step: step,
    active: active, hasDropSpot: hasDropSpot, broken: broken, allTargetsMet: allTargetsMet, solved: solved,
    settlesSolved: settlesSolved, run: run, transform: transform
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.InkSim = api;
})(typeof window !== 'undefined' ? window : this);

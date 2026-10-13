/* Inkbloom — watercolor board renderer (Canvas 2D).
 * Ink is painted into its own layer, textured with grain + wash, edge-darkened,
 * then multiplied onto the paper so fibres show through like real watercolor. */
(function () {
  'use strict';
  var Sim = window.InkSim;

  var PAL = {
    normal: { 1: '#e8463d', 2: '#f7c52e', 4: '#2f7de0', 3: '#f38a2b', 5: '#8f57d1', 6: '#36a866', 7: '#4b3f37' },
    cb: { 1: '#e3621b', 2: '#f6d84a', 4: '#1c73bd', 3: '#f1a51f', 5: '#c66aa8', 6: '#0fa17b', 7: '#3c3834' }
  };
  var PAPERS = {
    cream: { base: '#f4ecdf', fiber: 'rgba(150,120,80,', speck: 0.05 },
    hanji: { base: '#f8f6f0', fiber: 'rgba(130,120,100,', speck: 0.09, long: true },
    kraft: { base: '#e7d4b0', fiber: 'rgba(120,85,40,', speck: 0.12 },
    sage: { base: '#ebefe4', fiber: 'rgba(90,110,80,', speck: 0.05 },
    rose: { base: '#f7eae6', fiber: 'rgba(150,90,90,', speck: 0.05 },
    mist: { base: '#e9eef3', fiber: 'rgba(80,100,130,', speck: 0.05 },
    gold: { base: '#f6eedb', fiber: 'rgba(150,120,60,', speck: 0.05, gold: true }
  };
  var PAPER_ORDER = ['cream', 'hanji', 'kraft', 'sage', 'rose', 'mist', 'gold'];

  var palette = PAL.normal, cbMode = false;

  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(h, k) { // k<0 darker, k>0 lighter
    var c = hexRgb(h), t = k < 0 ? 0 : 255, p = Math.abs(k);
    return 'rgb(' + Math.round(c[0] + (t - c[0]) * p) + ',' + Math.round(c[1] + (t - c[1]) * p) + ',' + Math.round(c[2] + (t - c[2]) * p) + ')';
  }
  function rgba(h, a) { var c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lum(h) { var c = hexRgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function hash(i, k) { var x = Math.sin(i * 127.1 + (k || 0) * 311.7) * 43758.5453; return x - Math.floor(x); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

  /* ---------- textures ---------- */
  var texCache = {};
  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function paperTexture(name) {
    if (texCache['p' + name]) return texCache['p' + name];
    var P = PAPERS[name] || PAPERS.cream, S = 320, c = makeCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = P.base; g.fillRect(0, 0, S, S);
    var rnd = seeded(name.length * 97 + 13);
    var img = g.getImageData(0, 0, S, S), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (rnd() - 0.5) * 14 * (P.speck * 6);
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    var fibers = P.long ? 260 : 140;
    for (var f = 0; f < fibers; f++) {
      var x = rnd() * S, y = rnd() * S, len = (P.long ? 18 : 6) + rnd() * (P.long ? 40 : 14), a = rnd() * Math.PI * 2;
      g.strokeStyle = P.fiber + (0.05 + rnd() * 0.08) + ')'; g.lineWidth = 0.6 + rnd() * 0.6;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * len * 0.5, y + Math.sin(a + 0.6) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    if (P.gold) {
      for (var k = 0; k < 60; k++) {
        g.fillStyle = 'rgba(205,160,60,' + (0.25 + rnd() * 0.4) + ')';
        g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.6, 0, 7); g.fill();
      }
    }
    texCache['p' + name] = c;
    return c;
  }
  function grainTexture() {
    if (texCache.grain) return texCache.grain;
    var S = 160, c = makeCanvas(S, S), g = c.getContext('2d'), rnd = seeded(7);
    var img = g.createImageData(S, S), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = rnd();
      if (v < 0.5) { d[i] = d[i + 1] = d[i + 2] = 40; d[i + 3] = Math.floor(rnd() * 60); }
      else { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.floor(rnd() * 70); }
    }
    g.putImageData(img, 0, 0);
    texCache.grain = c; return c;
  }
  function washTexture() {
    if (texCache.wash) return texCache.wash;
    var S = 256, c = makeCanvas(S, S), g = c.getContext('2d'), rnd = seeded(29);
    for (var k = 0; k < 46; k++) {
      var x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 70, light = rnd() < 0.55;
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, light ? 'rgba(255,255,255,0.32)' : 'rgba(30,20,10,0.22)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }
    texCache.wash = c; return c;
  }
  function seeded(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  /* ---------- geometry helpers ---------- */
  function roundRectPath(g, x, y, w, h, rTL, rTR, rBR, rBL) {
    g.moveTo(x + rTL, y);
    g.lineTo(x + w - rTR, y); if (rTR) g.arcTo(x + w, y, x + w, y + rTR, rTR);
    g.lineTo(x + w, y + h - rBR); if (rBR) g.arcTo(x + w, y + h, x + w - rBR, y + h, rBR);
    g.lineTo(x + rBL, y + h); if (rBL) g.arcTo(x, y + h, x, y + h - rBL, rBL);
    g.lineTo(x, y + rTL); if (rTL) g.arcTo(x, y, x + rTL, y, rTL);
    g.closePath();
  }

  /* Full settled shape of one ink cell: merges with same-colour neighbours, leaves a hairline of paper elsewhere. */
  function cellShape(g, L, col, i, x0, y0, s, gap) {
    var c = col[i], same = [false, false, false, false];
    for (var d = 0; d < 4; d++) { var j = L.nb[i * 4 + d]; same[d] = j >= 0 && col[j] === c; }
    var ins = [same[0] ? -0.6 : gap, same[1] ? -0.6 : gap, same[2] ? -0.6 : gap, same[3] ? -0.6 : gap];
    var r = s * 0.2;
    var x = x0 + ins[3], y = y0 + ins[0], w = s - ins[1] - ins[3], h = s - ins[0] - ins[2];
    roundRectPath(g, x, y, w, h,
      (!same[0] && !same[3]) ? r : 0, (!same[0] && !same[1]) ? r : 0,
      (!same[2] && !same[1]) ? r : 0, (!same[2] && !same[3]) ? r : 0);
  }

  /* Ink flowing in from side d: a soft round front centred on that edge, reaching depth e (0..1+). */
  function tonguePath(g, d, x0, y0, s, e, seed) {
    var cx = x0 + s / 2, cy = y0 + s / 2;
    if (d === 0) cy = y0; else if (d === 2) cy = y0 + s; else if (d === 3) cx = x0; else cx = x0 + s;
    blobPath(g, cx, cy, Math.max(0.5, e * s * 1.16), seed * 7 + d);
  }
  function blobPath(g, cx, cy, r, seed) {
    g.beginPath();
    var n = 14;
    for (var k = 0; k <= n; k++) {
      var a = k / n * Math.PI * 2, w = 1 + 0.09 * Math.sin(a * 3 + seed * 5) + 0.06 * Math.cos(a * 5 + seed * 3);
      var px = cx + Math.cos(a) * r * w, py = cy + Math.sin(a) * r * w;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }

  /* Colour mark: three dot positions (top = red, lower-left = yellow, lower-right = blue). */
  function glyph(g, cx, cy, size, code, fill, hollow) {
    var r = size * 0.15, dx = size * 0.27, dyT = -size * 0.24, dyB = size * 0.2;
    var pos = [[1, cx, cy + dyT], [2, cx - dx, cy + dyB], [4, cx + dx, cy + dyB]];
    for (var k = 0; k < 3; k++) {
      var on = (code & pos[k][0]) !== 0;
      g.beginPath(); g.arc(pos[k][1], pos[k][2], on ? r : r * 0.55, 0, Math.PI * 2);
      if (on) { g.fillStyle = fill; g.fill(); }
      else if (hollow) { g.strokeStyle = hollow; g.lineWidth = Math.max(1, size * 0.05); g.stroke(); }
    }
  }

  /* ---------- Board ---------- */
  function Board(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.ink = makeCanvas(4, 4); this.ig = this.ink.getContext('2d');
    this.stat = makeCanvas(4, 4); this.sg = this.stat.getContext('2d');
    this.gridC = makeCanvas(4, 4); this.wallC = makeCanvas(4, 4); this.peelC = makeCanvas(4, 4);
    this.dpr = 1; this.W = 0; this.H = 0; this.s = 40; this.ox = 0; this.oy = 0;
    this.L = null; this.anim = []; this.fx = []; this.tfx = {}; this.paper = 'cream';
    this.finish = null; this.failAt = null; this.shake = 0; this.dropFx = [];
  }
  var BP = Board.prototype;

  BP.setLevel = function (L, paper) {
    this.L = L; this.paper = paper || 'cream';
    this.resetAnim();
    this.resize();
  };
  BP.resetAnim = function () {
    var n = this.L ? this.L.n : 0;
    this.anim = new Array(n); this.fx = []; this.tfx = {}; this.finish = null; this.failAt = null; this.dropFx = [];
    if (this.L) for (var b = 0; b < this.L.blots.length; b++) this.anim[this.L.blots[b].i] = { t: -1e9, kind: 'blot', from: null, dur: 1 };
  };
  BP.resize = function () {
    var cv = this.cv, rect = cv.parentElement.getBoundingClientRect();
    var W = Math.max(100, Math.floor(rect.width)), H = Math.max(100, Math.floor(rect.height));
    var dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.dpr = dpr; this.W = W; this.H = H;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    [this.ink, this.stat, this.gridC, this.wallC, this.peelC].forEach(function (c) { c.width = cv.width; c.height = cv.height; });
    if (!this.L) return;
    var L = this.L;
    var s = Math.floor(Math.min((W - 20) / (L.w + 0.5), (H - 20) / (L.h + 0.5), 84));
    this.s = s; this.ox = Math.round((W - s * L.w) / 2); this.oy = Math.round((H - s * L.h) * 0.64);
    this.drawStatic();
  };
  BP.cellXY = function (i) { var x = i % this.L.w, y = (i - x) / this.L.w; return [this.ox + x * this.s, this.oy + y * this.s]; };
  BP.cellAt = function (clientX, clientY) {
    if (!this.L) return -1;
    var r = this.cv.getBoundingClientRect();
    var fx = (clientX - r.left - this.ox) / this.s, fy = (clientY - r.top - this.oy) / this.s;
    var x = Math.floor(fx), y = Math.floor(fy);
    if (x < 0 || y < 0 || x >= this.L.w || y >= this.L.h) return -1;
    return y * this.L.w + x;
  };

  BP.sheetRect = function () {
    var L = this.L, s = this.s, m = Math.max(6, Math.round(s * 0.22));
    return [this.ox - m, this.oy - m, s * L.w + m * 2, s * L.h + m * 2];
  };

  BP.drawStatic = function () {
    var g = this.sg, L = this.L, s = this.s, dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    var sr = this.sheetRect();
    // sheet with soft shadow
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.fillStyle = PAPERS[this.paper] ? PAPERS[this.paper].base : '#f4ecdf';
    g.beginPath(); roundRectPath(g, sr[0], sr[1], sr[2], sr[3], 6, 6, 6, 6); g.fill();
    g.restore();
    g.save();
    g.beginPath(); roundRectPath(g, sr[0], sr[1], sr[2], sr[3], 6, 6, 6, 6); g.clip();
    g.fillStyle = g.createPattern(paperTexture(this.paper), 'repeat');
    g.fillRect(sr[0], sr[1], sr[2], sr[3]);
    // gentle vignette
    var vg = g.createRadialGradient(sr[0] + sr[2] / 2, sr[1] + sr[3] / 2, Math.min(sr[2], sr[3]) * 0.3, sr[0] + sr[2] / 2, sr[1] + sr[3] / 2, Math.max(sr[2], sr[3]) * 0.75);
    vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(120,90,50,0.10)');
    g.fillStyle = vg; g.fillRect(sr[0], sr[1], sr[2], sr[3]);
    g.restore();
    // thick paper
    for (var i = 0; i < L.n; i++) {
      var p = this.cellXY(i), x0 = p[0], y0 = p[1];
      if (L.terrain[i] === Sim.THICK) {
        g.save();
        g.beginPath(); roundRectPath(g, x0 + 1.5, y0 + 1.5, s - 3, s - 3, s * 0.16, s * 0.16, s * 0.16, s * 0.16);
        g.fillStyle = 'rgba(150,120,80,0.16)'; g.fill(); g.clip();
        g.strokeStyle = 'rgba(120,90,55,0.22)'; g.lineWidth = Math.max(1, s * 0.025);
        for (var k = -s; k < s * 2; k += s * 0.2) { g.beginPath(); g.moveTo(x0 + k, y0); g.lineTo(x0 + k + s, y0 + s); g.stroke(); }
        for (var k2 = -s; k2 < s * 2; k2 += s * 0.2) { g.beginPath(); g.moveTo(x0 + k2 + s, y0); g.lineTo(x0 + k2, y0 + s); g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1; }
        g.restore();
      }
    }
    // walls: dark slate blocks merging with neighbours (own layer, drawn over the pencil grid)
    var sgPaper = g;
    g = this.wallC.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, this.W, this.H);
    var wallRects = [];
    for (var w = 0; w < L.n; w++) {
      if (L.terrain[w] !== Sim.WALL) continue;
      var q = this.cellXY(w);
      var sameW = [0, 1, 2, 3].map(function (d) { var j = L.nb[w * 4 + d]; return j >= 0 && L.terrain[j] === Sim.WALL; });
      var r = s * 0.22, ins = s * 0.06;
      var x = q[0] + (sameW[3] ? -0.5 : ins), y = q[1] + (sameW[0] ? -0.5 : ins);
      var ww = q[0] + s + (sameW[1] ? 0.5 : -ins) - x, hh = q[1] + s + (sameW[2] ? 0.5 : -ins) - y;
      wallRects.push([x, y, ww, hh, (!sameW[0] && !sameW[3]) ? r : 0, (!sameW[0] && !sameW[1]) ? r : 0, (!sameW[2] && !sameW[1]) ? r : 0, (!sameW[2] && !sameW[3]) ? r : 0, sameW[0]]);
    }
    if (wallRects.length) {
      g.save();
      g.shadowColor = 'rgba(40,30,20,0.35)'; g.shadowBlur = s * 0.12; g.shadowOffsetY = s * 0.05;
      g.fillStyle = '#34303a';
      g.beginPath();
      wallRects.forEach(function (a) { roundRectPath(g, a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]); });
      g.fill();
      g.restore();
      g.fillStyle = 'rgba(255,255,255,0.10)';
      wallRects.forEach(function (a) { if (!a[8]) g.fillRect(a[0] + Math.max(a[4], 2), a[1] + 1, a[2] - Math.max(a[4], 2) - Math.max(a[5], 2), Math.max(1.5, s * 0.05)); });
      // the same shapes as clean paper, revealed when the masking is peeled off a finished painting
      var pg = this.peelC.getContext('2d');
      pg.setTransform(dpr, 0, 0, dpr, 0, 0); pg.clearRect(0, 0, this.W, this.H);
      pg.save();
      pg.shadowColor = 'rgba(90,70,40,0.18)'; pg.shadowBlur = s * 0.08; pg.shadowOffsetY = s * 0.02;
      pg.fillStyle = '#fbf7ef';
      pg.beginPath();
      wallRects.forEach(function (a) { roundRectPath(pg, a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]); });
      pg.fill();
      pg.restore();
    } else { this.peelC.getContext('2d').clearRect(0, 0, this.peelC.width, this.peelC.height); }
    g = sgPaper;
    // pencil grid (separate so it can fade when the painting is finished)
    var gg = this.gridC.getContext('2d');
    gg.setTransform(dpr, 0, 0, dpr, 0, 0); gg.clearRect(0, 0, this.W, this.H);
    gg.strokeStyle = 'rgba(95,75,50,0.13)'; gg.lineWidth = 1;
    gg.beginPath();
    for (var gx = 0; gx <= L.w; gx++) { gg.moveTo(this.ox + gx * s + 0.5, this.oy); gg.lineTo(this.ox + gx * s + 0.5, this.oy + L.h * s); }
    for (var gy = 0; gy <= L.h; gy++) { gg.moveTo(this.ox, this.oy + gy * s + 0.5); gg.lineTo(this.ox + L.w * s, this.oy + gy * s + 0.5); }
    gg.stroke();
  };

  /* ---------- events from the game ---------- */
  BP.onDrop = function (i, c, now, beat) {
    this.anim[i] = { t: now + 70, kind: 'drop', from: null, dur: 300 };
    var p = this.cellXY(i), s = this.s, cx = p[0] + s / 2, cy = p[1] + s / 2;
    if (beat != null) this.fx.push({ k: 'label', x: cx, y: cy - s * 0.45, c: c, t: now + 60, dur: 900, text: String(beat) });
    this.dropFx.push({ x: cx, y: cy, c: c, t: now });
    this.fx.push({ k: 'ring', x: cx, y: cy, c: c, t: now + 70, dur: 520, r0: s * 0.2, r1: s * 0.95, w: 3 });
    for (var k = 0; k < 7; k++) {
      var a = hash(i, k) * Math.PI * 2, sp = s * (0.6 + hash(i, k + 9) * 0.9);
      this.fx.push({ k: 'drop', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: c, t: now + 70, dur: 380, size: s * (0.04 + hash(i, k + 3) * 0.05) });
    }
  };
  BP.onBeat = function (events, now, period, L) {
    var thick = L.terrain;
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      var slow = thick[ev.i] === Sim.THICK;
      var dur = Math.min(period * 0.62, 380) * (slow ? 2.6 : 1);
      this.anim[ev.i] = { t: now, kind: ev.wake ? 'wake' : (ev.mixed ? 'mix' : 'spread'), from: ev.from, dur: ev.mixed ? Math.max(dur, 420) : dur, c: ev.c };
      var p = this.cellXY(ev.i), s = this.s, cx = p[0] + s / 2, cy = p[1] + s / 2;
      if (ev.mixed && ev.c !== 7) {
        this.fx.push({ k: 'bloom', x: cx, y: cy, c: ev.c, t: now + dur * 0.5, dur: 700, r0: s * 0.3, r1: s * 0.9 });
        for (var k = 0; k < 6; k++) {
          var a = (k / 6) * Math.PI * 2 + hash(ev.i, 2) * 3;
          this.fx.push({ k: 'spark', x: cx, y: cy, vx: Math.cos(a) * s * 0.9, vy: Math.sin(a) * s * 0.9, c: ev.c, t: now + dur * 0.5, dur: 600, size: s * 0.09 });
        }
      } else if (ev.wake) {
        this.fx.push({ k: 'ring', x: cx, y: cy, c: ev.c, t: now, dur: 600, r0: s * 0.15, r1: s * 1.2, w: 2.5 });
      }
    }
  };
  BP.goalFx = function (i, ok, now) {
    this.tfx[i] = { t: now, ok: ok };
    var p = this.cellXY(i), s = this.s, cx = p[0] + s / 2, cy = p[1] + s / 2;
    if (ok) {
      for (var k = 0; k < 10; k++) {
        var a = (k / 10) * Math.PI * 2;
        this.fx.push({ k: 'spark', x: cx, y: cy, vx: Math.cos(a) * s * 1.3, vy: Math.sin(a) * s * 1.3, c: null, t: now, dur: 650, size: s * 0.08 });
      }
      this.fx.push({ k: 'ring', x: cx, y: cy, c: null, t: now, dur: 600, r0: s * 0.3, r1: s * 0.85, w: 3 });
    } else {
      this.shake = now;
    }
  };
  BP.startFinish = function (now) { this.finish = { t: now }; };
  BP.setFail = function (i, now) { this.failAt = { i: i, t: now }; };

  /* ---------- per-frame drawing ---------- */
  // view: { S, period, phase, preview, goals, ghosts, hints, mode, cueTap, cb }
  BP.draw = function (now, view) {
    var g = this.g, L = this.L; if (!L) return;
    var dpr = this.dpr, s = this.s, S = view.S;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.cv.width, this.cv.height);
    var shakeX = 0;
    if (this.shake && now - this.shake < 380) { var k = (now - this.shake) / 380; shakeX = Math.sin(k * 40) * 5 * (1 - k); }
    g.setTransform(dpr, 0, 0, dpr, shakeX * dpr, 0);
    g.drawImage(this.stat, 0, 0, this.W, this.H);
    var fin = this.finish ? clamp01((now - this.finish.t) / 900) : 0;
    g.globalAlpha = 1 - fin * 0.85; g.drawImage(this.gridC, 0, 0, this.W, this.H); g.globalAlpha = 1;
    var peel = this.finish ? clamp01((now - this.finish.t - 250) / 650) : 0;
    if (peel < 1) { g.globalAlpha = 1 - peel; g.drawImage(this.wallC, 0, 0, this.W, this.H); }
    if (peel > 0) { g.globalAlpha = peel; g.drawImage(this.peelC, 0, 0, this.W, this.H); }
    g.globalAlpha = 1;

    // wells
    for (var wi = 0; wi < L.n; wi++) {
      if (!L.well[wi] || S.col[wi]) continue;
      var wp = this.cellXY(wi), wcx = wp[0] + s / 2, wcy = wp[1] + s / 2;
      var glow = view.mode === 'ready' || view.mode === 'run' ? 0.5 + 0.5 * Math.sin(now / 380 + wi) : 0;
      g.fillStyle = 'rgba(70,55,40,0.10)'; g.beginPath(); g.arc(wcx, wcy, s * 0.34, 0, 7); g.fill();
      var wg = g.createRadialGradient(wcx, wcy - s * 0.05, s * 0.05, wcx, wcy, s * 0.3);
      wg.addColorStop(0, 'rgba(60,45,35,0.42)'); wg.addColorStop(1, 'rgba(60,45,35,0.08)');
      g.fillStyle = wg; g.beginPath(); g.arc(wcx, wcy, s * 0.27, 0, 7); g.fill();
      g.strokeStyle = 'rgba(80,60,40,' + (0.35 + 0.25 * glow) + ')'; g.lineWidth = Math.max(1.5, s * 0.04);
      g.beginPath(); g.arc(wcx, wcy, s * 0.34, 0, 7); g.stroke();
    }

    this.drawInk(now, view);
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.drawImage(this.ink, 0, 0, this.W, this.H);
    g.restore();

    this.drawSheen(now, view);
    this.drawSeeds(now, view);
    if (cbMode || view.cb) this.drawMarks(view);
    if (!this.finish) {
      this.drawGoals(now, view);
      this.drawGhosts(now, view);
      this.drawHints(now, view);
    } else this.drawGoalsFading(now, view, fin);
    this.drawDrops(now);
    this.drawFx(now);
    if (this.finish) this.drawFinish(now);
    if (view.cueTap != null) this.drawTapCue(now, view.cueTap, view.cueLabel);
  };

  BP.drawInk = function (now, view) {
    var ig = this.ig, L = this.L, S = view.S, s = this.s, col = S.col, dpr = this.dpr;
    ig.setTransform(1, 0, 0, 1, 0, 0);
    ig.clearRect(0, 0, this.ink.width, this.ink.height);
    ig.setTransform(dpr, 0, 0, dpr, 0, 0);
    var gap = Math.max(1, s * 0.03);
    for (var i = 0; i < L.n; i++) {
      var c = col[i];
      if (!c) continue;
      var p = this.cellXY(i), x0 = p[0], y0 = p[1], a = this.anim[i];
      var color = palette[c];
      var prog = a ? clamp01((now - a.t) / a.dur) : 1;
      if (prog >= 1) {
        ig.fillStyle = color;
        ig.beginPath(); cellShape(ig, L, col, i, x0, y0, s, gap); ig.fill();
        continue;
      }
      var e = easeOut(prog);
      ig.save();
      ig.beginPath(); cellShape(ig, L, col, i, x0, y0, s, gap); ig.clip();
      if (a.kind === 'drop' || a.kind === 'wake' || a.kind === 'blot') {
        ig.fillStyle = color;
        blobPath(ig, x0 + s / 2, y0 + s / 2, s * (0.12 + 0.72 * e), i);
        ig.fill();
      } else if (a.kind === 'mix') {
        var k1 = clamp01(prog / 0.5), e1 = easeOut(k1);
        for (var f = 0; a.from && f < a.from.length; f++) {
          ig.fillStyle = palette[a.from[f][1]];
          tonguePath(ig, a.from[f][0], x0, y0, s, 0.2 + 0.4 * e1, hash(i, f));
          ig.fill();
        }
        if (prog > 0.35) {
          ig.globalAlpha = clamp01((prog - 0.35) / 0.4);
          ig.fillStyle = color;
          blobPath(ig, x0 + s / 2, y0 + s / 2, s * (0.3 + 0.5 * easeOut(clamp01((prog - 0.35) / 0.65))), i + 3);
          ig.fill();
          ig.globalAlpha = 1;
        }
      } else {
        ig.fillStyle = color;
        for (var f2 = 0; a.from && f2 < a.from.length; f2++) {
          tonguePath(ig, a.from[f2][0], x0, y0, s, 0.2 + 0.85 * e, hash(i, f2));
          ig.fill();
        }
      }
      ig.restore();
    }
    // anticipation: ink seeping toward the cells it will take on the next beat
    if (view.preview && view.phase != null && !this.finish) {
      var ph = view.phase, reach = s * (0.12 + 0.42 * ph * ph);
      for (var q = 0; q < view.preview.length; q++) {
        var pv = view.preview[q], pp = this.cellXY(pv.i);
        if (col[pv.i]) continue;
        ig.save();
        ig.beginPath(); ig.rect(pp[0], pp[1], s, s); ig.clip();
        for (var f3 = 0; f3 < pv.from.length; f3++) {
          var d3 = pv.from[f3][0], ex = pp[0] + s / 2, ey = pp[1] + s / 2;
          if (d3 === 0) ey = pp[1]; else if (d3 === 2) ey = pp[1] + s; else if (d3 === 3) ex = pp[0]; else ex = pp[0] + s;
          var pc = palette[pv.from[f3][1]], gr = ig.createRadialGradient(ex, ey, 0, ex, ey, reach);
          gr.addColorStop(0, rgba(pc, 0.75)); gr.addColorStop(0.55, rgba(pc, 0.4)); gr.addColorStop(1, rgba(pc, 0));
          ig.fillStyle = gr; ig.beginPath(); ig.arc(ex, ey, reach, 0, 7); ig.fill();
        }
        ig.restore();
      }
    }
    // texture the ink: wash + grain, only where there is ink
    ig.save();
    ig.globalCompositeOperation = 'source-atop';
    ig.globalAlpha = 0.55;
    var sr = this.sheetRect();
    ig.drawImage(washTexture(), sr[0], sr[1], sr[2], sr[3]);
    ig.globalAlpha = 0.6;
    ig.fillStyle = ig.createPattern(grainTexture(), 'repeat');
    ig.fillRect(0, 0, this.W, this.H);
    ig.restore();
    // edge darkening along colour boundaries of settled cells
    ig.lineWidth = Math.max(1.4, s * 0.045); ig.lineCap = 'round';
    for (var j = 0; j < L.n; j++) {
      var cj = col[j]; if (!cj) continue;
      var aj = this.anim[j]; if (aj && now - aj.t < aj.dur) continue;
      var pj = this.cellXY(j), x = pj[0], y = pj[1], o = gap + ig.lineWidth * 0.5, rr = s * 0.2;
      ig.strokeStyle = shade(palette[cj], -0.28);
      ig.globalAlpha = 0.42;
      for (var d = 0; d < 4; d++) {
        var nj = L.nb[j * 4 + d];
        if (nj >= 0 && col[nj] === cj) continue;
        ig.beginPath();
        if (d === 0) { ig.moveTo(x + rr, y + o); ig.lineTo(x + s - rr, y + o); }
        else if (d === 2) { ig.moveTo(x + rr, y + s - o); ig.lineTo(x + s - rr, y + s - o); }
        else if (d === 3) { ig.moveTo(x + o, y + rr); ig.lineTo(x + o, y + s - rr); }
        else { ig.moveTo(x + s - o, y + rr); ig.lineTo(x + s - o, y + s - rr); }
        ig.stroke();
      }
    }
    ig.globalAlpha = 1;
  };

  BP.drawSheen = function (now, view) {
    if (this.finish) return;
    var g = this.g, L = this.L, s = this.s, S = view.S, period = view.period || 600;
    for (var i = 0; i < L.n; i++) {
      var c = S.col[i];
      if (!Sim.isPrimary(c)) continue;
      var a = this.anim[i];
      var age = a ? (now - a.t) : 1e9;
      var wetness = a && a.kind === 'blot' && view.mode === 'ready' ? 0.8 : clamp01(1 - age / (period * 2.2));
      if (wetness <= 0.02) continue;
      var p = this.cellXY(i), cx = p[0] + s * 0.38, cy = p[1] + s * 0.34;
      var gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.42);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.28 * wetness) + ')');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(p[0], p[1], s, s);
    }
    // blots before time starts: breathing ring
    if (view.mode === 'ready') {
      for (var b = 0; b < L.blots.length; b++) {
        var bp = this.cellXY(L.blots[b].i), k = (now % 1600) / 1600;
        g.strokeStyle = rgba(palette[L.blots[b].c], 0.5 * (1 - k)); g.lineWidth = 2;
        g.beginPath(); g.arc(bp[0] + s / 2, bp[1] + s / 2, s * (0.45 + 0.4 * k), 0, 7); g.stroke();
      }
    }
  };

  BP.drawSeeds = function (now, view) {
    var g = this.g, L = this.L, s = this.s, S = view.S;
    for (var i = 0; i < L.n; i++) {
      var c = S.sd[i]; if (!c) continue;
      var p = this.cellXY(i), cx = p[0] + s / 2, cy = p[1] + s / 2;
      var br = 1 + 0.06 * Math.sin(now / 520 + i);
      var r = s * 0.2 * br;
      g.fillStyle = rgba(palette[c], 0.18); g.beginPath(); g.arc(cx, cy, s * 0.36, 0, 7); g.fill();
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = s * 0.08; g.shadowOffsetY = s * 0.03;
      g.fillStyle = palette[c]; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.restore();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.28, 0, 7); g.fill();
      // closed-eye arcs: sleeping
      g.strokeStyle = 'rgba(40,30,30,0.55)'; g.lineWidth = Math.max(1, s * 0.03);
      g.beginPath(); g.arc(cx - r * 0.38, cy + r * 0.1, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.beginPath(); g.arc(cx + r * 0.38, cy + r * 0.1, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    }
  };

  BP.drawMarks = function (view) {
    var g = this.g, L = this.L, s = this.s, S = view.S;
    for (var i = 0; i < L.n; i++) {
      var c = S.col[i]; if (!c || L.target[i]) continue;
      var a = this.anim[i]; if (a && a.t > performance.now() - a.dur * 0.6) continue;
      var p = this.cellXY(i), light = lum(palette[c]) > 0.6;
      glyph(g, p[0] + s / 2, p[1] + s / 2, s * 0.46, c, light ? 'rgba(40,30,20,0.7)' : 'rgba(255,255,255,0.85)', light ? 'rgba(40,30,20,0.35)' : 'rgba(255,255,255,0.45)');
    }
  };

  BP.drawGoals = function (now, view) {
    var g = this.g, L = this.L, s = this.s, S = view.S, warn = view.warn || {};
    var lw = Math.max(2, s * 0.065);
    for (var a = 0; a < L.targets.length; a++) {
      var i = L.targets[a], tc = L.target[i], c = S.col[i];
      var p = this.cellXY(i), cx = p[0] + s / 2, cy = p[1] + s / 2, r = s * 0.3;
      var fxr = this.tfx[i];
      if (c && c === tc) {
        var k = fxr ? clamp01((now - fxr.t) / 320) : 1, sc = 1 + 0.45 * (1 - easeOut(k));
        g.save(); g.translate(cx, cy); g.scale(sc, sc);
        g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 4;
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = lw;
        g.beginPath(); g.arc(0, 0, r * 0.92, 0, 7); g.stroke();
        g.lineWidth = lw * 1.05; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-r * 0.42, 0); g.lineTo(-r * 0.1, r * 0.32); g.lineTo(r * 0.45, -r * 0.34); g.stroke();
        g.restore();
      } else if (c) {
        var jit = fxr && now - fxr.t < 400 ? Math.sin((now - fxr.t) / 18) * 3 * (1 - (now - fxr.t) / 400) : 0;
        g.save(); g.translate(cx + jit, cy);
        g.fillStyle = 'rgba(255,255,255,0.88)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.strokeStyle = '#3a2e2a'; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
        glyph(g, 0, -r * 0.02, r * 1.25, tc, palette[tc], 'rgba(60,45,35,0.4)');
        g.strokeStyle = 'rgba(58,46,42,0.9)'; g.lineWidth = lw * 0.9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-r * 0.75, -r * 0.75); g.lineTo(r * 0.75, r * 0.75); g.stroke();
        g.restore();
      } else {
        var w8 = warn[i], jitter = w8 === 'bad' ? Math.sin(now / 30 + i) * 1.6 : 0;
        var pulse = 1 + 0.04 * Math.sin(now / 420 + i * 0.7);
        g.save(); g.translate(cx + jitter, cy); g.scale(pulse, pulse);
        if (w8 === 'good') {
          var gk = view.phase || 0;
          g.fillStyle = rgba(palette[tc], 0.25 * gk); g.beginPath(); g.arc(0, 0, r * 1.45, 0, 7); g.fill();
        }
        if (w8 === 'bad') {
          g.save(); g.rotate(now / 600);
          g.setLineDash([r * 0.32, r * 0.22]); g.strokeStyle = 'rgba(40,30,25,' + (0.35 + 0.5 * (view.phase || 0)) + ')'; g.lineWidth = lw * 0.8;
          g.beginPath(); g.arc(0, 0, r * 1.38, 0, 7); g.stroke(); g.restore();
        }
        g.fillStyle = 'rgba(255,253,248,0.9)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.strokeStyle = shade(palette[tc], -0.12); g.lineWidth = lw;
        g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
        glyph(g, 0, -r * 0.02, r * 1.25, tc, shade(palette[tc], -0.08), 'rgba(80,60,45,0.35)');
        g.restore();
      }
    }
    for (var b = 0; b < L.dries.length; b++) {
      var di = L.dries[b], dc = S.col[di], dp = this.cellXY(di);
      var inset = s * 0.14, wet = !!dc, bad = (view.warn || {})[di] === 'bad';
      var jx = bad ? Math.sin(now / 30 + di) * 1.5 : 0;
      g.save(); g.translate(jx, 0);
      g.setLineDash([Math.max(3, s * 0.08), Math.max(3, s * 0.07)]);
      g.strokeStyle = wet || bad ? '#3a2e2a' : 'rgba(110,90,65,0.75)'; g.lineWidth = Math.max(1.5, s * 0.045);
      g.beginPath(); roundRectPath(g, dp[0] + inset, dp[1] + inset, s - inset * 2, s - inset * 2, s * 0.12, s * 0.12, s * 0.12, s * 0.12);
      if (!wet) { g.fillStyle = 'rgba(255,253,248,0.55)'; g.fill(); }
      g.stroke(); g.setLineDash([]);
      if (wet) {
        g.strokeStyle = 'rgba(58,46,42,0.9)'; g.lineWidth = Math.max(2, s * 0.06); g.lineCap = 'round';
        g.beginPath(); g.moveTo(dp[0] + s * 0.3, dp[1] + s * 0.3); g.lineTo(dp[0] + s * 0.7, dp[1] + s * 0.7);
        g.moveTo(dp[0] + s * 0.7, dp[1] + s * 0.3); g.lineTo(dp[0] + s * 0.3, dp[1] + s * 0.7); g.stroke();
      } else {
        g.strokeStyle = 'rgba(110,90,65,0.3)'; g.lineWidth = 1;
        g.beginPath(); roundRectPath(g, dp[0] + inset, dp[1] + inset, s - inset * 2, s - inset * 2, s * 0.12, s * 0.12, s * 0.12, s * 0.12); g.clip();
        for (var h = -s; h < s; h += s * 0.16) { g.beginPath(); g.moveTo(dp[0] + h, dp[1] + s); g.lineTo(dp[0] + h + s, dp[1]); g.stroke(); }
      }
      g.restore();
    }
  };
  BP.drawGoalsFading = function (now, view, fin) {
    var g = this.g; g.save(); g.globalAlpha = 1 - fin; this.drawGoals(now, view); g.restore();
  };

  function dropletPath(g, cx, cy, r) {
    g.beginPath();
    g.moveTo(cx, cy - r * 1.35);
    g.bezierCurveTo(cx + r * 0.25, cy - r * 0.8, cx + r, cy - r * 0.2, cx + r, cy + r * 0.25);
    g.arc(cx, cy + r * 0.25, r, 0, Math.PI, false);
    g.bezierCurveTo(cx - r, cy - r * 0.2, cx - r * 0.25, cy - r * 0.8, cx, cy - r * 1.35);
    g.closePath();
  }

  BP.drawGhosts = function (now, view) {
    var gh = view.ghosts; if (!gh || !gh.length) return;
    var g = this.g, s = this.s;
    for (var k = 0; k < gh.length; k++) {
      var d = gh[k], p = this.cellXY(d.i), cx = p[0] + s / 2, cy = p[1] + s / 2;
      if (view.S.col[d.i] && view.mode !== 'ready') continue;
      g.save();
      g.globalAlpha = 0.55;
      g.setLineDash([3, 3]); g.strokeStyle = shade(palette[d.c], -0.25); g.lineWidth = 1.6;
      dropletPath(g, cx, cy + s * 0.05, s * 0.2); g.stroke();
      g.setLineDash([]);
      g.fillStyle = shade(palette[d.c], -0.35); g.font = '700 ' + Math.round(s * 0.22) + 'px system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(d.t + 1), cx, cy + s * 0.1);
      g.restore();
    }
  };

  BP.drawHints = function (now, view) {
    var hs = view.hints; if (!hs || !hs.length) return;
    var g = this.g, s = this.s, S = view.S;
    for (var k = 0; k < hs.length; k++) {
      var h = hs[k];
      if (h.used) continue;
      var p = this.cellXY(h.i), cx = p[0] + s / 2, cy = p[1] + s / 2, col = palette[h.c];
      var state = h.state; // 'wait' | 'now' | 'later' | 'missed' | 'first'
      g.save();
      if (state === 'now' || state === 'first') {
        var k2 = (now % 700) / 700;
        g.strokeStyle = rgba(col, 0.9 * (1 - k2)); g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, s * (0.3 + 0.35 * k2), 0, 7); g.stroke();
      }
      g.globalAlpha = state === 'missed' ? 0.35 : (state === 'later' ? 0.6 : 0.95);
      g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 4;
      g.fillStyle = state === 'missed' ? '#8a8078' : col;
      dropletPath(g, cx, cy + s * 0.04, s * 0.22); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = lum(col) > 0.6 ? '#3a2e2a' : '#fff';
      g.font = '800 ' + Math.round(s * 0.22) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(h.t + 1), cx, cy + s * 0.1);
      if (state === 'wait' && h.left > 0) {
        for (var q = 0; q < Math.min(h.left, 8); q++) {
          var aa = -Math.PI / 2 + q * 0.42;
          g.fillStyle = col; g.beginPath(); g.arc(cx + Math.cos(aa) * s * 0.42, cy + Math.sin(aa) * s * 0.42, s * 0.045, 0, 7); g.fill();
        }
      }
      g.restore();
      void S;
    }
  };

  BP.drawTapCue = function (now, i, label) {
    var g = this.g, s = this.s, p = this.cellXY(i), cx = p[0] + s / 2, cy = p[1] + s / 2;
    var k = (now % 1400) / 1400;
    g.save();
    for (var r = 0; r < 2; r++) {
      var kk = (k + r * 0.5) % 1;
      g.strokeStyle = 'rgba(60,45,35,' + (0.55 * (1 - kk)) + ')'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(cx, cy, s * (0.2 + 0.55 * kk), 0, 7); g.stroke();
    }
    var press = k < 0.25 ? easeOut(k / 0.25) : 1 - clamp01((k - 0.25) / 0.5);
    g.fillStyle = 'rgba(60,45,35,0.22)'; g.beginPath(); g.arc(cx, cy, s * (0.16 + 0.04 * press), 0, 7); g.fill();
    if (label) {
      var L = this.L, y = Math.floor(i / L.w), below = y + 1 < L.h ? i + L.w : -1;
      var up = below < 0 || L.target[below] || L.terrain[below] === Sim.WALL;
      g.font = '700 ' + Math.max(12, Math.round(s * 0.26)) + 'px system-ui, sans-serif'; g.textAlign = 'center';
      g.textBaseline = up ? 'bottom' : 'top';
      var ty = up ? cy - s * 0.62 : cy + s * 0.62;
      g.lineWidth = 4; g.strokeStyle = 'rgba(244,236,223,0.9)'; g.strokeText(label, cx, ty);
      g.fillStyle = '#3a2e2a'; g.fillText(label, cx, ty);
    }
    g.restore();
  };

  BP.drawDrops = function (now) {
    var g = this.g, s = this.s;
    this.dropFx = this.dropFx.filter(function (d) { return now - d.t < 90; });
    for (var k = 0; k < this.dropFx.length; k++) {
      var d = this.dropFx[k], q = clamp01((now - d.t) / 70);
      var y = d.y - s * 0.9 * (1 - q);
      g.fillStyle = 'rgba(0,0,0,' + (0.15 * q) + ')'; g.beginPath(); g.ellipse(d.x, d.y + s * 0.05, s * 0.14 * q + 0.1, s * 0.06 * q + 0.1, 0, 0, 7); g.fill();
      g.fillStyle = palette[d.c]; dropletPath(g, d.x, y, s * 0.13); g.fill();
    }
  };

  BP.drawFx = function (now) {
    var g = this.g;
    this.fx = this.fx.filter(function (f) { return now - f.t < f.dur; });
    for (var k = 0; k < this.fx.length; k++) {
      var f = this.fx[k], q = (now - f.t) / f.dur;
      if (q < 0) continue;
      var col = f.c ? palette[f.c] : '#ffffff';
      if (f.k === 'ring') {
        g.strokeStyle = f.c ? rgba(col, 0.7 * (1 - q)) : 'rgba(255,255,255,' + (0.9 * (1 - q)) + ')';
        g.lineWidth = f.w * (1 - q * 0.6);
        g.beginPath(); g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * easeOut(q), 0, 7); g.stroke();
      } else if (f.k === 'bloom') {
        var rr = f.r0 + (f.r1 - f.r0) * easeOut(q);
        var gr = g.createRadialGradient(f.x, f.y, rr * 0.2, f.x, f.y, rr);
        gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.7, rgba(col, 0.28 * (1 - q))); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, rr, 0, 7); g.fill();
      } else if (f.k === 'drop') {
        var e = easeOut(q), x = f.x + f.vx * e * 0.6, y = f.y + f.vy * e * 0.6;
        g.fillStyle = rgba(col, 0.85 * (1 - q * q)); g.beginPath(); g.arc(x, y, f.size * (1 - q * 0.4), 0, 7); g.fill();
      } else if (f.k === 'label') {
        var ly = f.y - this.s * 0.35 * easeOut(q);
        g.globalAlpha = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
        g.font = '800 ' + Math.round(this.s * 0.3) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = 'rgba(255,250,240,0.95)'; g.strokeText(f.text, f.x, ly);
        g.fillStyle = shade(col, -0.35); g.fillText(f.text, f.x, ly);
        g.globalAlpha = 1;
      } else if (f.k === 'spark') {
        var e2 = easeOut(q), sx = f.x + f.vx * e2 * 0.6, sy = f.y + f.vy * e2 * 0.6, sz = f.size * (1 - q * 0.7);
        g.fillStyle = f.c ? shade(col, 0.45) : '#ffffff';
        g.globalAlpha = (1 - q) * 0.95;
        g.beginPath();
        g.moveTo(sx, sy - sz); g.quadraticCurveTo(sx, sy, sx + sz, sy); g.quadraticCurveTo(sx, sy, sx, sy + sz);
        g.quadraticCurveTo(sx, sy, sx - sz, sy); g.quadraticCurveTo(sx, sy, sx, sy - sz);
        g.fill();
        g.globalAlpha = 1;
      }
    }
  };

  BP.drawFinish = function (now) {
    var g = this.g, sr = this.sheetRect(), k = (now - this.finish.t) / 1100;
    if (k > 0 && k < 1.2) {
      var x = sr[0] - sr[2] * 0.4 + (sr[2] * 1.8) * k;
      g.save();
      g.beginPath(); roundRectPath(g, sr[0], sr[1], sr[2], sr[3], 6, 6, 6, 6); g.clip();
      var gr = g.createLinearGradient(x - 80, sr[1], x + 80, sr[1] + sr[3] * 0.3);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.33)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(sr[0], sr[1], sr[2], sr[3]);
      g.restore();
    }
    var f = clamp01((now - this.finish.t - 500) / 700);
    if (f > 0) {
      g.save();
      g.strokeStyle = 'rgba(196,160,92,' + (0.9 * f) + ')'; g.lineWidth = 2;
      g.beginPath(); roundRectPath(g, sr[0] + 4, sr[1] + 4, sr[2] - 8, sr[3] - 8, 4, 4, 4, 4); g.stroke();
      g.restore();
    }
  };

  /* ---------- static painting (sketchbook thumbnails, diary, viewer) ---------- */
  function paint(canvas, L, col, opts) {
    opts = opts || {};
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = opts.w || canvas.clientWidth || 120, H = opts.h || canvas.clientHeight || 120;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pad = opts.pad != null ? opts.pad : 6;
    var s = Math.min((W - pad * 2) / L.w, (H - pad * 2) / L.h), ox = (W - s * L.w) / 2, oy = (H - s * L.h) / 2;
    var paperName = opts.paper || 'cream';
    g.fillStyle = PAPERS[paperName].base; g.fillRect(0, 0, W, H);
    g.fillStyle = g.createPattern(paperTexture(paperName), 'repeat'); g.fillRect(0, 0, W, H);
    // ink layer
    var ink = makeCanvas(canvas.width, canvas.height), ig = ink.getContext('2d');
    ig.setTransform(dpr, 0, 0, dpr, 0, 0);
    var gap = Math.max(0.6, s * 0.03);
    for (var i = 0; i < L.n; i++) {
      var c = col[i]; if (!c) continue;
      var x = i % L.w, y = (i - x) / L.w;
      ig.fillStyle = palette[c]; ig.beginPath(); cellShape(ig, L, col, i, ox + x * s, oy + y * s, s, gap); ig.fill();
    }
    ig.globalCompositeOperation = 'source-atop';
    ig.globalAlpha = 0.55; ig.drawImage(washTexture(), 0, 0, W, H);
    ig.globalAlpha = 0.5; ig.fillStyle = ig.createPattern(grainTexture(), 'repeat'); ig.fillRect(0, 0, W, H);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.drawImage(ink, 0, 0); g.restore();
    for (var w = 0; w < L.n; w++) {
      if (L.terrain[w] !== Sim.WALL) continue;
      var wx = w % L.w, wy = (w - wx) / L.w;
      g.fillStyle = 'rgba(90,70,40,0.10)'; g.fillRect(ox + wx * s, oy + wy * s + 0.6, s, s);
      g.fillStyle = '#fbf7ef'; g.fillRect(ox + wx * s, oy + wy * s, s, s);
    }
    if (opts.seeds) for (var sd = 0; sd < L.n; sd++) {
      // unwoken sleeping ink stays as a bead in the painting
      if (opts.seeds[sd]) { var sx = sd % L.w, sy = (sd - sx) / L.w; g.fillStyle = palette[opts.seeds[sd]]; g.beginPath(); g.arc(ox + (sx + 0.5) * s, oy + (sy + 0.5) * s, s * 0.2, 0, 7); g.fill(); }
    }
  }

  window.Render = {
    Board: Board, paint: paint, glyph: glyph, PAPERS: PAPERS, PAPER_ORDER: PAPER_ORDER,
    setCB: function (on) { cbMode = !!on; palette = on ? PAL.cb : PAL.normal; },
    color: function (c) { return palette[c]; },
    get palette() { return palette; },
    shade: shade, lum: lum, dropletPath: dropletPath
  };
})();

/* Inkbloom — play controller: beat clock, drops, goals, hints, failure reasons. */
(function () {
  'use strict';
  var Sim = window.InkSim, T = window.I18N.T, I = window.I18N, Snd = window.Sound, Icons = window.Icons;
  var $ = function (id) { return document.getElementById(id); };

  var P = {
    board: null, def: null, L: null, S: null, meta: null,
    mode: 'idle',            // ready | run | won | lost | done
    t0: 0, period: 650, lastBeatAt: 0, ffPeriod: 110,
    history: [], ghosts: [], hintsShown: 0, attempts: 0, hintsEver: false,
    preview: null, warn: {}, goalsHit: 0, failInfo: null, settledAt: 0,
    pausedAt: 0, idleSince: 0, wonAt: 0
  };

  function el() {
    return {
      num: $('pl-num'), name: $('pl-name'), beat: $('pl-beat-val'), beatBox: $('pl-beat'), queue: $('pl-queue'),
      msg: $('pl-msg'), m1: $('pl-m1'), m2: $('pl-m2'), retry: $('pl-retry'), hint: $('pl-hint'),
      bigRetry: $('pl-bigretry'), bottom: $('pl-bottom'), win: $('pl-win'), winTitle: $('pl-win-title'),
      winSub: $('pl-win-sub'), seal: $('pl-seal'), intro: $('pl-intro'), hintBadge: $('pl-hint-badge')
    };
  }
  var E = null;

  /* ---------- lifecycle ---------- */
  P.init = function () {
    E = el();
    P.board = new window.Render.Board($('board'));
    var cv = $('board');
    cv.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      Snd.unlock();
      P.tap(ev.clientX, ev.clientY);
    });
    cv.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
    E.retry.addEventListener('click', function () { Snd.ui(); P.retry(); });
    E.bigRetry.addEventListener('click', function () { Snd.ui(); P.retry(); });
    E.hint.addEventListener('click', function () { P.hint(); });
    window.addEventListener('resize', function () { if (P.L) { P.board.resize(); positionSeal(); } });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) P.pause();
      else if (!document.querySelector('.sheet.open')) P.resume();
    });
  };

  P.start = function (def, meta) {
    P.def = def; P.meta = meta || {};
    P.L = Sim.parse(def);
    var st = window.Store.d;
    var base = def.tempo || 650;
    P.period = base * (st.tempo === 'relaxed' ? 1.45 : 1);
    P.attempts = 0; P.ghosts = []; P.hintsShown = 0; P.hintsEver = false;
    P.board.setLevel(P.L, st.paper);
    E.num.textContent = meta.label || '';
    E.name.textContent = I.name(def.name);
    showIntro(meta.intro || (meta.readyHint ? 'ready' : null));
    renderRecipes();
    P.reset();
  };

  P.reset = function () {
    P.S = new Sim.State(P.L);
    P.mode = 'ready'; P.history = []; P.goalsHit = 0; P.failInfo = null; P.warn = {}; P.warned = {}; P.settledAt = 0;
    P.idleSince = performance.now();
    P.board.resetAnim();
    computePreview();
    E.msg.classList.remove('show', 'bad');
    E.bottom.classList.remove('lost');
    E.bottom.hidden = false; E.win.hidden = true;
    E.seal.className = 'seal'; E.seal.innerHTML = '';
    E.beat.textContent = ''; E.beatBox.classList.add('idle');
    renderQueue();
    updateHintBtn();
  };

  P.retry = function () {
    if (P.mode === 'won' || P.mode === 'done') return;
    if (P.history.length) P.ghosts = P.history.slice();
    P.attempts++;
    Snd.page();
    P.reset();
  };

  P.stop = function () { P.mode = 'idle'; };
  P.pause = function () { if (!P.pausedAt && (P.mode === 'run' || P.mode === 'won' || P.mode === 'lost')) P.pausedAt = performance.now(); };
  P.resume = function () {
    if (!P.pausedAt) return;
    var d = performance.now() - P.pausedAt; P.t0 += d; P.lastBeatAt += d; P.pausedAt = 0;
  };
  /* settings changed while on the play screen: re-skin without touching the run */
  P.applySettings = function () {
    if (!P.L) return;
    var st = window.Store.d;
    P.period = (P.def.tempo || 650) * (st.tempo === 'relaxed' ? 1.45 : 1);
    if (P.mode === 'run' || P.mode === 'lost') P.t0 = P.lastBeatAt - P.S.t * P.period;
    P.board.paper = st.paper; P.board.drawStatic();
    renderQueue(); renderRecipes();
  };

  /* ---------- input ---------- */
  P.tap = function (cx, cy) {
    if (P.mode !== 'ready' && P.mode !== 'run') return;
    var i = P.board.cellAt(cx, cy);
    if (i < 0) return;
    var L = P.L, S = P.S, now = performance.now();
    if (!Sim.canDrop(L, S, i)) {
      if (S.k >= L.inks.length) return;
      Snd.deny();
      if (L.hasWells && !L.well[i] && L.terrain[i] !== Sim.WALL && !S.col[i]) flashMsg(T('mWell'));
      return;
    }
    var c = L.inks[S.k].c;
    if (P.mode === 'ready') {
      P.mode = 'run'; P.t0 = now; P.lastBeatAt = now;
      E.intro.classList.add('fade'); E.beatBox.classList.remove('idle');
    }
    Sim.drop(L, S, i);
    P.history.push({ i: i, t: S.t, c: c });
    window.Store.d.totalDrops++;
    P.board.onDrop(i, c, now, S.t + 1);
    Snd.drop(c);
    renderQueue();
    E.beat.textContent = String(S.t + 1);
    if (L.target[i] && L.target[i] !== c) { fail(i); return; }
    if (L.target[i] === c) { P.goalsHit++; P.board.goalFx(i, true, now + 120); Snd.goal(P.goalsHit); }
    computePreview();
    checkEnd(now);
  };

  /* ---------- hints ---------- */
  P.hint = function () {
    var sol = P.def.sol || [];
    if (P.mode === 'won' || P.mode === 'done' || !sol.length) return;
    if (P.hintsShown >= sol.length) { flashMsg(T('hintAll')); return; }
    P.hintsShown++; P.hintsEver = true;
    Snd.hint();
    updateHintBtn();
    // a revealed plan is easiest to follow from a clean sheet
    if (P.mode === 'lost') P.retry();
  };
  function updateHintBtn() {
    var sol = P.def && P.def.sol ? P.def.sol.length : 0;
    E.hintBadge.textContent = P.hintsShown ? (P.hintsShown + '/' + sol) : '';
    E.hint.classList.toggle('glow', P.attempts >= 3 && P.hintsShown < sol && !P.hintsShown);
  }
  function hintView() {
    var sol = P.def.sol || [], out = [], S = P.S;
    for (var k = 0; k < P.hintsShown && k < sol.length; k++) {
      var h = sol[k], i = h.y * P.L.w + h.x, st;
      if (k < S.k) { out.push({ i: i, t: h.t, c: P.L.inks[k].c, used: true }); continue; }
      if (P.mode === 'ready') st = k === 0 ? 'first' : 'later';
      else if (k > S.k) st = 'later';
      else if (S.t < h.t) st = 'wait';
      else if (S.t === h.t) st = 'now';
      else st = 'missed';
      out.push({ i: i, t: h.t, c: P.L.inks[k].c, state: st, left: h.t - S.t });
    }
    return out;
  }

  /* ---------- the beat ---------- */
  function computePreview() {
    if (P.mode === 'won' || P.mode === 'done') { P.preview = null; P.warn = {}; return; }
    var s2 = P.S.clone(), ev = [];
    Sim.step(P.L, s2, ev);
    P.preview = ev; P.warn = {};
    for (var k = 0; k < ev.length; k++) {
      var e = ev[k], tg = P.L.target[e.i];
      if (!tg) continue;
      if (tg === Sim.DRY) P.warn[e.i] = 'bad';
      else P.warn[e.i] = e.c === tg ? 'good' : 'bad';
      if (P.warn[e.i] === 'bad' && P.mode === 'run' && !P.warned[e.i]) { P.warned[e.i] = 1; Snd.warn(); }
    }
  }

  function doBeat(at) {
    var L = P.L, S = P.S, ev = [];
    Sim.step(L, S, ev);
    P.lastBeatAt = at;
    var period = P.mode === 'won' ? P.ffPeriod * 2 : P.period;
    P.board.onBeat(ev, at, period, L);
    E.beat.textContent = String(S.t + 1);
    E.beatBox.classList.remove('pulse'); void E.beatBox.offsetWidth; E.beatBox.classList.add('pulse');
    // sound: one voice per colour wave + events
    var groups = {}, mixed = 0, mud = false, wakes = [];
    for (var k = 0; k < ev.length; k++) {
      var e = ev[k];
      if (e.wake) wakes.push(e.c);
      else if (e.mixed) { if (e.c === 7) mud = true; else mixed = e.c; }
      else { var g = groups[e.c] || (groups[e.c] = { c: e.c, count: 0, gen: S.t }); g.count++; }
    }
    var list = Object.keys(groups).map(function (c) { return groups[c]; });
    if (P.mode !== 'won' || S.t % 2 === 0) Snd.spread(list);
    if (!ev.length && P.mode === 'run') Snd.tick(S.t % 4 === 0);
    if (mixed) { Snd.mix(mixed); window.Sound.haptic([6, 30, 6]); }
    if (mud) Snd.mud();
    wakes.forEach(function (c) { Snd.wake(c); });
    // goals reached this beat
    var bad = -1;
    for (var q = 0; q < ev.length; q++) {
      var i = ev[q].i, tg = L.target[i];
      if (!tg) continue;
      if (tg !== Sim.DRY && S.col[i] === tg) {
        P.goalsHit++; P.board.goalFx(i, true, at + Math.min(260, period * 0.45));
        if (P.mode !== 'lost') Snd.goal(P.goalsHit);
      } else if (bad < 0) bad = i;
    }
    if (P.mode === 'run' && bad >= 0) { fail(bad); return; }
    if (P.mode === 'run') checkEnd(at);
    computePreview();
  }

  function checkEnd(at) {
    var L = P.L, S = P.S;
    var br = Sim.broken(L, S);
    if (br >= 0) { fail(br); return; }
    if (Sim.allTargetsMet(L, S) && Sim.settlesSolved(L, S)) { win(at); return; }
    if (!Sim.active(L, S)) {
      // settled with ink left: can what remains still finish the picture?
      var avail = 0;
      for (var k = S.k; k < L.inks.length; k++) avail |= L.inks[k].c;
      for (var q = 0; q < L.n; q++) avail |= S.sd[q];
      for (var b = 0; b < L.targets.length; b++) {
        var ti = L.targets[b], need = L.target[ti];
        if (S.col[ti]) continue;
        var mixNeeded = !Sim.isPrimary(need), colours = Sim.bits(avail & need);
        if ((mixNeeded && (colours < 2 || S.k >= L.inks.length)) || (!mixNeeded && !(avail & need))) { fail(ti); return; }
      }
    }
    if (!Sim.active(L, S) && !Sim.hasDropSpot(L, S)) {
      // nothing will move again
      var miss = -1;
      for (var a = 0; a < L.targets.length; a++) if (S.col[L.targets[a]] !== L.target[L.targets[a]]) { miss = L.targets[a]; break; }
      fail(miss);
    }
  }

  P.update = function (now) {
    if (!P.L || P.pausedAt) return;
    var S = P.S;
    if (P.mode === 'run' || P.mode === 'lost') {
      var guard = 0;
      while (now >= P.t0 + (S.t + 1) * P.period && guard++ < 8) {
        if (P.mode === 'lost' && !Sim.active(P.L, S)) break;
        doBeat(P.t0 + (S.t + 1) * P.period);
        if (P.mode === 'won') break;
      }
      if (P.mode === 'run' && !Sim.active(P.L, S) && S.k < P.L.inks.length) {
        E.queue.classList.add('nudge');
      } else E.queue.classList.remove('nudge');
    } else if (P.mode === 'won') {
      if (Sim.active(P.L, S)) {
        if (now >= P.lastBeatAt + P.ffPeriod) doBeat(now);
      } else if (!P.settledAt) {
        P.settledAt = now;
        P.board.startFinish(now);
        Snd.win();
        showWin();
      }
    }
    // beat ring on the next-ink chip
    var ring = document.querySelector('#pl-queue .next .ring-fg');
    if (ring) {
      var ph = P.mode === 'run' ? Math.min(1, (now - P.lastBeatAt) / P.period) : 0;
      ring.style.strokeDashoffset = String(113 * (1 - ph));
    }
  };

  P.draw = function (now) {
    if (!P.L) return;
    var phase = P.mode === 'run' ? Math.min(1, (now - P.lastBeatAt) / P.period) : (P.mode === 'lost' ? 0.5 : 0);
    var cue = null, label = null;
    if (P.mode === 'ready' && P.meta.tapCue && !P.history.length) {
      var s0 = P.def.sol && P.def.sol[0];
      if (s0 && (P.attempts === 0 || now - P.idleSince > 5000)) { cue = s0.y * P.L.w + s0.x; label = T(P.L.hasWells ? 'tapWell' : 'tapHere'); }
    }
    P.board.draw(now, {
      S: P.S, period: P.period, phase: phase, mode: P.mode,
      preview: (P.mode === 'run' || P.mode === 'lost') ? P.preview : null,
      warn: P.mode === 'run' ? P.warn : {},
      ghosts: (P.mode === 'ready' || P.mode === 'run') && !P.hintsShown ? P.ghosts : null,
      hints: P.mode === 'ready' || P.mode === 'run' ? hintView() : null,
      cueTap: cue, cueLabel: label, cb: window.Store.d.cb
    });
  };

  /* ---------- end states ---------- */
  function explain(i) {
    var L = P.L, S = P.S, cn = I.colorName, ga = I.ga;
    if (i < 0) return [T('fEmpty'), T('fEmptySub')];
    var tg = L.target[i], c = S.col[i];
    var N = function (code) { return cn(Sim.NAME[code]); };
    // which of the player's drops made a colour (-1: wet blot, sleeping ink, or not dropped yet)
    var firstDrop = function (code) { for (var k = 0; k < P.history.length; k++) if (P.history[k].c === code) return k; return -1; };
    var queued = function (code) { for (var k = P.S.k; k < L.inks.length; k++) if (L.inks[k].c === code) return true; return false; };
    // advice for "colour a arrived before colour b"
    var advise = function (a, b) {
      var ia = firstDrop(a), ib = firstDrop(b);
      if (ia >= 0 && ib >= 0) return ia > ib ? T('fLater', { x: N(a) }) : T('fSooner', { x: N(b) });
      if (ib < 0 && queued(b)) return T('fSooner', { x: N(b) });
      if (ia >= 0) return T('fLater', { x: N(a) });
      if (ib >= 0) return T('fSooner', { x: N(b) });
      return T('fGenericSub');
    };
    if (tg === Sim.DRY) return [T('fDry'), T('fGenericSub')];
    if (!c) return [T('fEmpty'), T('fEmptySub')];
    if (c === 7) return [T('fMud'), T('fMudSub')];
    if (Sim.isPrimary(tg)) {
      if (Sim.isPrimary(c)) return [T('fFirst', { c: N(c), ga: ga(N(c)), t: N(tg) }), advise(c, tg)];
      return [T('fAlone', { t: N(tg), ga2: ga(N(tg)) }), T('fAloneSub', { t: N(tg), ga2: ga(N(tg)) })];
    }
    if (Sim.isPrimary(c)) {
      if (tg & c) return [T('fEarly', { c: N(c), ga: ga(N(c)) }), advise(c, tg & ~c)];
      return [T('fTook', { c: N(c), ga: ga(N(c)) }), T('fGenericSub')];
    }
    return [T('fPair', { c: N(c), ga: ga(N(c)) }), T('fGenericSub')];
  }

  function fail(i) {
    if (P.mode !== 'run') return;
    P.mode = 'lost';
    var now = performance.now();
    if (i >= 0) { P.board.goalFx(i, false, now); P.board.setFail(i, now); }
    Snd.fail();
    var why = explain(i);
    E.m1.textContent = why[0]; E.m2.textContent = why[1];
    E.msg.classList.add('show', 'bad');
    E.bottom.classList.add('lost');
    if (P.attempts >= 2 && !P.hintsShown) { E.m2.textContent = why[1] + ' · ' + T('hintTip'); }
    updateHintBtn();
    if (P.meta.onFail) P.meta.onFail();
  }

  function win(at) {
    P.mode = 'won'; P.wonAt = at;
    P.lastBeatAt = at;
    E.msg.classList.remove('show', 'bad');
    // final painting: let the ink settle in a copy
    var fin = P.S.clone(), guard = 0;
    while (Sim.active(P.L, fin) && guard++ < 400) Sim.step(P.L, fin, null);
    var result = {
      board: window.Store.encodeBoard(fin.col), seeds: Array.prototype.slice.call(fin.sd),
      seal: !P.hintsEver, tries: P.attempts + 1, hints: P.hintsShown
    };
    if (P.meta.onWin) P.meta.onWin(result);
    P.result = result;
  }

  function showWin() {
    P.mode = 'done';
    var r = P.result || {};
    E.bottom.hidden = true; E.win.hidden = false;
    E.winTitle.textContent = r.seal ? T('winSeal') : T('winHint');
    E.winSub.textContent = r.tries === 1 ? T('firstTry') : T('solvedIn', { n: r.tries });
    if (P.meta.winNote) E.winSub.textContent += ' · ' + P.meta.winNote;
    E.seal.innerHTML = Icons.seal(!r.seal);
    E.seal.className = 'seal stamp';
    positionSeal();
    if (P.meta.afterWin) P.meta.afterWin(r);
  }

  function positionSeal() {
    if (!P.board || !P.board.L) return;
    var sr = P.board.sheetRect(), size = Math.max(30, Math.min(48, P.board.s * 0.7));
    E.seal.style.width = size + 'px'; E.seal.style.height = size + 'px';
    E.seal.style.left = (sr[0] + sr[2] - size - 8) + 'px';
    E.seal.style.top = (sr[1] + sr[3] - size - 8) + 'px';
  }

  /* ---------- HUD ---------- */
  function renderQueue() {
    var L = P.L, S = P.S, pal = window.Render.palette, html = '';
    for (var k = 0; k < L.inks.length; k++) {
      var ink = L.inks[k], cls = k < S.k ? 'used' : (k === S.k ? 'next' : 'later');
      var hex = pal[ink.c], light = window.Render.lum(hex) > 0.62;
      html += '<div class="ink ' + cls + '" aria-label="' + I.colorName(Sim.NAME[ink.c]) + '">';
      if (cls === 'next') html += '<svg class="ring" viewBox="0 0 40 40"><circle class="ring-bg" cx="20" cy="20" r="18"/><circle class="ring-fg" cx="20" cy="20" r="18"/></svg>';
      html += '<div class="ink-chip">' + Icons.chip(hex, ink.c, light) + '</div>';
      if (ink.r !== Sim.UNL) html += '<span class="range">' + ink.r + '</span>';
      html += '</div>';
    }
    E.queue.innerHTML = html;
  }

  var flashTimer = 0;
  function flashMsg(text) {
    if (P.mode === 'lost') return;
    E.m1.textContent = text; E.m2.textContent = '';
    E.msg.classList.add('show'); E.msg.classList.remove('bad');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { if (P.mode !== 'lost') E.msg.classList.remove('show'); }, 1800);
  }

  function showIntro(kind) {
    if (!kind) { E.intro.className = 'pl-intro'; E.intro.innerHTML = ''; return; }
    var key = { ready: 'ready', wall: 'mWall', well: 'mWell', seed: 'mSeed', short: 'mShort', dry: 'mDry', thick: 'mThick', blot: 'mBlot', mix: 'mMix', seam: 'mSeam' }[kind];
    E.intro.innerHTML = '<span class="intro-ic intro-' + kind + '"></span><span>' + T(key) + '</span>';
    E.intro.className = 'pl-intro show';
  }

  /* "red + blue = purple" for every mixed colour this sheet asks for */
  function renderRecipes() {
    var L = P.L, seen = {}, html = '', pal = window.Render.palette;
    var chip = function (c) { var hex = pal[c]; return Icons.chip(hex, c, window.Render.lum(hex) > 0.62); };
    L.targets.forEach(function (i) {
      var c = L.target[i];
      if (Sim.isPrimary(c) || seen[c]) return;
      seen[c] = 1;
      var parts = [1, 2, 4].filter(function (b) { return c & b; });
      html += '<span class="recipe">' + chip(parts[0]) + '+' + chip(parts[1]) + '=' + chip(c) + '</span>';
    });
    $('pl-recipes').innerHTML = html;
  }
  P.refreshQueue = function () { if (P.L) { renderQueue(); renderRecipes(); } };
  window.Play = P;
})();

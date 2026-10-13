/* Inkbloom — screens, progression and meta (sketchbook, diary, papers). */
(function () {
  'use strict';
  var Sim = window.InkSim, T = window.I18N.T, I = window.I18N, St = window.Store, Snd = window.Sound, Icons = window.Icons, R = window.Render;
  var $ = function (id) { return document.getElementById(id); };
  var LV = window.INK_LEVELS, CH = LV.chapters;
  var FLAT = [];
  CH.forEach(function (ch, ci) { ch.levels.forEach(function (lv, li) { FLAT.push({ def: lv, ci: ci, li: li, g: FLAT.length }); }); });
  var parsedCache = {};
  function parsed(def) { var k = def.id; return parsedCache[k] || (parsedCache[k] = Sim.parse(def)); }

  var screen = 'home', bookChapter = 0, bookChapterHome = 0, diaryMonth = null, current = null;

  /* ---------- progression ---------- */
  function done(g) { return !!St.d.levels[FLAT[g].def.id]; }
  function playable(g) { return g === 0 || done(g - 1) || (g >= 2 && done(g - 2)); }
  function nextTarget() {
    for (var g = 0; g < FLAT.length; g++) if (!done(g) && playable(g)) return g;
    return -1;
  }
  function chapterDone(ci) { return CH[ci].levels.every(function (lv) { return !!St.d.levels[lv.id]; }); }
  function chapterUnlocked(ci) { var g0 = FLAT.findIndex(function (f) { return f.ci === ci; }); return playable(g0); }
  function countDone() { var n = 0, s = 0; FLAT.forEach(function (f) { var r = St.d.levels[f.def.id]; if (r) { n++; if (r.seal) s++; } }); return { n: n, s: s }; }
  function label(f) { return (f.ci + 1) + '-' + (f.li + 1); }

  /* ---------- navigation ---------- */
  function show(id) {
    ['home', 'play', 'book', 'diary'].forEach(function (s) { $('scr-' + s).classList.toggle('active', s === id); });
    screen = id;
    if (id !== 'play') window.Play.stop();
    if (id === 'home') renderHome();
    if (id === 'book') renderBook();
    if (id === 'diary') renderDiary();
  }
  function openSheet(id) { $(id).classList.add('open'); }
  function closeSheet(id) { $(id).classList.remove('open'); }

  /* ---------- play ---------- */
  function startLevel(g) {
    var f = FLAT[g]; if (!f) return;
    current = { kind: 'level', g: g };
    var def = f.def;
    show('play');
    var meta = {
      label: label(f), intro: def.intro || null,
      tapCue: !!def.tapCue, readyHint: f.ci === 0 && !def.tapCue,
      onWin: function (res) { onLevelWin(f, res); },
      afterWin: function () { afterLevelWin(f); }
    };
    window.Play.start(def, meta);
    setWinButtons('level');
  }
  function onLevelWin(f, res) {
    var prev = St.d.levels[f.def.id];
    var rec = { board: res.board, seeds: res.seeds, seal: res.seal || !!(prev && prev.seal), tries: res.tries, hints: res.hints, at: Date.now() };
    if (prev && prev.seal && !res.seal) { rec.board = prev.board; rec.seeds = prev.seeds; }
    St.d.levels[f.def.id] = rec;
    St.d.seen[f.def.id] = 1;
    var note = '';
    if (chapterDone(f.ci) && CH[f.ci].paper && !St.d.papers[CH[f.ci].paper]) {
      St.d.papers[CH[f.ci].paper] = true;
      note = T('unlockPaper', { p: T('paperNames')[CH[f.ci].paper] });
    }
    var all = countDone();
    if (all.n === FLAT.length && all.s === FLAT.length && !St.d.papers.gold) { St.d.papers.gold = true; note = T('unlockPaper', { p: T('paperNames').gold }); }
    window.Play.meta.winNote = note;
    St.save();
  }
  function afterLevelWin(f) {
    var nb = $('pl-next');
    nb.querySelector('span').textContent = f.g + 1 < FLAT.length ? T('next') : T('sketchbook');
  }
  function startDaily(key) {
    var def = window.InkDaily.get(key);
    current = { kind: 'daily', key: key };
    show('play');
    var p = key.split('-');
    var lab = I.lang === 'ko' ? T('dailyLevel', { m: +p[1], d: +p[2] }) : T('dailyLevel', { mn: T('months')[+p[1] - 1].slice(0, 3), d: +p[2] });
    window.Play.start(def, {
      label: lab, intro: null,
      onWin: function (res) {
        var late = key !== St.dayKey();
        St.d.daily[key] = { board: res.board, seeds: res.seeds, tries: res.tries, hints: res.hints, at: Date.now(), late: late || undefined };
        St.save();
        window.Play.meta.winNote = late ? '' : T('streak', { n: St.streak() });
      }
    });
    setWinButtons('daily');
  }
  function setWinButtons(kind) {
    var nb = $('pl-next'), rb = $('pl-replay');
    nb.querySelector('span').textContent = kind === 'daily' ? T('diary') : T('next');
    rb.textContent = kind === 'daily' ? T('home') : T('replay');
  }

  /* ---------- home ---------- */
  function renderHome() {
    var t = nextTarget(), c = countDone();
    var cont = $('home-continue');
    if (t >= 0) {
      var f = FLAT[t];
      cont.querySelector('.big').textContent = c.n ? T('continue') : T('start');
      cont.querySelector('.small').textContent = label(f) + '  ' + I.name(f.def.name);
    } else {
      cont.querySelector('.big').textContent = T('sketchbook');
      cont.querySelector('.small').textContent = T('allDone');
    }
    $('home-progress').textContent = T('paintings', { n: c.n, m: FLAT.length }) + '  ·  ' + T('seals', { n: c.s });
    // current sketchbook as a strip of little paintings
    var ci = t >= 0 ? FLAT[t].ci : CH.length - 1, ch = CH[ci], tiles = $('strip-tiles');
    $('strip-title').textContent = T('chapter', { n: ci + 1 }) + ' · ' + I.name(ch.name);
    $('strip-count').textContent = ch.levels.filter(function (lv) { return St.d.levels[lv.id]; }).length + '/' + ch.levels.length;
    tiles.innerHTML = '';
    ch.levels.forEach(function (lv) {
      var rec = St.d.levels[lv.id];
      if (rec) {
        var cv = document.createElement('canvas'); tiles.appendChild(cv);
        requestAnimationFrame(function () { R.paint(cv, parsed(lv), St.decodeBoard(rec.board), { paper: St.d.paper, pad: 1, seeds: rec.seeds }); });
      } else {
        var i = document.createElement('i');
        if (t >= 0 && FLAT[t].def.id === lv.id) i.className = 'next';
        tiles.appendChild(i);
      }
    });
    bookChapterHome = ci;
    var key = St.dayKey(), dd = St.d.daily[key], sk = St.streak();
    $('home-daily-title').textContent = T('daily');
    $('home-daily-sub').textContent = dd ? T('dailyDone') + ' · ' + T('tomorrow') : T('dailyNew') + ' · ' + T('diff')[window.InkDaily.tier(key)];
    $('home-streak').innerHTML = Icons.icon('flame') + '<b>' + sk + '</b>';
    $('home-streak').classList.toggle('lit', sk > 0);
    var thumb = $('home-daily-thumb');
    if (dd) { thumb.classList.add('has'); paintDaily(thumb, key, dd); }
    else { thumb.classList.remove('has'); var ctx = thumb.getContext('2d'); ctx.clearRect(0, 0, thumb.width, thumb.height); }
    $('home-daily').classList.toggle('done', !!dd);
  }
  function paintDaily(canvas, key, rec) {
    var def = window.InkDaily.get(key), L = Sim.parse(def);
    R.paint(canvas, L, St.decodeBoard(rec.board), { paper: St.d.paper, pad: 3, seeds: rec.seeds });
  }

  /* ambient blooms behind the title */
  var amb = { blobs: [], last: 0 };
  function ambient(now) {
    var cv = $('home-bg'); if (!cv) return;
    var W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (now - amb.last > 900 && amb.blobs.length < 9) {
      amb.last = now;
      var cs = [1, 2, 4];
      amb.blobs.push({ x: W * (0.1 + Math.random() * 0.8), y: H * (0.08 + Math.random() * 0.5), c: cs[Math.floor(Math.random() * 3)], t: now, r: 40 + Math.random() * 70, life: 7000 + Math.random() * 4000 });
    }
    amb.blobs = amb.blobs.filter(function (b) { return now - b.t < b.life; });
    g.globalCompositeOperation = 'lighter';
    amb.blobs.forEach(function (b) {
      var k = (now - b.t) / b.life, e = 1 - Math.pow(1 - Math.min(1, k * 3), 3);
      var a = (k < 0.7 ? 0.32 : 0.32 * (1 - (k - 0.7) / 0.3)) * Math.min(1, k * 6);
      var r = b.r * (0.2 + 0.8 * e);
      var gr = g.createRadialGradient(b.x, b.y, r * 0.1, b.x, b.y, r);
      var col = R.color(b.c);
      gr.addColorStop(0, hexA(col, a * 0.6)); gr.addColorStop(0.8, hexA(col, a * 0.5)); gr.addColorStop(1, hexA(col, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, r, 0, 7); g.fill();
    });
    g.globalCompositeOperation = 'source-over';
  }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /* ---------- sketchbook ---------- */
  function renderBook() {
    var tabs = $('book-tabs'), html = '';
    CH.forEach(function (ch, ci) {
      var unlocked = chapterUnlocked(ci), cdone = ch.levels.filter(function (lv) { return St.d.levels[lv.id]; }).length;
      html += '<button class="tab' + (ci === bookChapter ? ' on' : '') + (unlocked ? '' : ' locked') + '" data-ci="' + ci + '">' +
        '<span class="tab-n">' + (ci + 1) + '</span><span class="tab-p">' + (unlocked ? cdone + '/' + ch.levels.length : Icons.icon('lock')) + '</span></button>';
    });
    tabs.innerHTML = html;
    var ch = CH[bookChapter];
    $('book-ch-name').textContent = T('chapter', { n: bookChapter + 1 }) + ' · ' + I.name(ch.name);
    var reward = ch.paper ? T('newPaper', { p: T('paperNames')[ch.paper] }) : '';
    $('book-ch-sub').textContent = I.name(ch.desc) + (reward ? '  ·  ' + reward + (St.d.papers[ch.paper] ? ' (' + T('owned') + ')' : '') : '');
    var grid = $('book-grid'); grid.innerHTML = '';
    ch.levels.forEach(function (lv, li) {
      var g = FLAT.findIndex(function (f) { return f.def.id === lv.id; });
      var rec = St.d.levels[lv.id], can = playable(g);
      var b = document.createElement('button');
      b.className = 'tile' + (rec ? ' done' : '') + (can ? '' : ' locked') + (!rec && can && g === nextTarget() ? ' current' : '');
      b.innerHTML = '<canvas></canvas><span class="tile-n">' + (bookChapter + 1) + '-' + (li + 1) + '</span>' +
        (rec ? '<span class="tile-seal">' + Icons.seal(!rec.seal) + '</span>' : '') +
        (!can ? '<span class="tile-lock">' + Icons.icon('lock') + '</span>' : '') +
        '<span class="tile-name">' + (can ? I.name(lv.name) : '') + '</span>';
      grid.appendChild(b);
      var cv = b.querySelector('canvas');
      requestAnimationFrame(function () {
        if (rec) R.paint(cv, parsed(lv), St.decodeBoard(rec.board), { paper: St.d.paper, pad: 4, seeds: rec.seeds });
        else blankTile(cv, parsed(lv), can);
      });
      b.addEventListener('click', function () {
        if (!can) { Snd.deny(); return; }
        Snd.ui();
        if (rec) openViewer({ title: I.name(lv.name), sub: T('chapter', { n: bookChapter + 1 }) + ' · ' + (li + 1), L: parsed(lv), rec: rec, play: function () { startLevel(g); } });
        else startLevel(g);
      });
    });
  }
  function blankTile(cv, L, can) {
    var W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = can ? '#efe6d6' : '#cfc6b7'; g.fillRect(0, 0, W, H);
    var pad = 10, s = Math.min((W - pad * 2) / L.w, (H - pad * 2) / L.h), ox = (W - s * L.w) / 2, oy = (H - s * L.h) / 2;
    g.strokeStyle = 'rgba(90,70,45,0.12)'; g.lineWidth = 1;
    for (var x = 0; x <= L.w; x++) { g.beginPath(); g.moveTo(ox + x * s, oy); g.lineTo(ox + x * s, oy + L.h * s); g.stroke(); }
    for (var y = 0; y <= L.h; y++) { g.beginPath(); g.moveTo(ox, oy + y * s); g.lineTo(ox + L.w * s, oy + y * s); g.stroke(); }
    for (var i = 0; i < L.n; i++) {
      var cx = ox + (i % L.w + 0.5) * s, cy = oy + (Math.floor(i / L.w) + 0.5) * s;
      if (L.terrain[i] === Sim.WALL) { g.fillStyle = 'rgba(52,48,58,' + (can ? 0.8 : 0.4) + ')'; g.fillRect(cx - s / 2 + 0.5, cy - s / 2 + 0.5, s - 1, s - 1); }
      if (can && L.target[i] && L.target[i] !== Sim.DRY) { g.strokeStyle = R.color(L.target[i]); g.lineWidth = Math.max(1, s * 0.12); g.beginPath(); g.arc(cx, cy, s * 0.28, 0, 7); g.stroke(); }
    }
  }

  /* ---------- diary ---------- */
  function renderDiary() {
    var today = new Date();
    if (!diaryMonth) diaryMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var y = diaryMonth.getFullYear(), m = diaryMonth.getMonth();
    $('diary-month').textContent = I.lang === 'ko' ? y + '년 ' + T('months')[m] : T('months')[m] + ' ' + y;
    var sk = St.streak(), best = St.bestStreak();
    $('diary-streak').innerHTML = Icons.icon('flame') + '<b>' + T('streak', { n: sk }) + '</b><span>' + T('bestStreak', { n: best }) + '</span>';
    var grid = $('diary-grid'); grid.innerHTML = '';
    T('weekdays').forEach(function (w) { var d = document.createElement('div'); d.className = 'dow'; d.textContent = w; grid.appendChild(d); });
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    for (var e = 0; e < first; e++) { var sp = document.createElement('div'); sp.className = 'day empty'; grid.appendChild(sp); }
    var todayKey = St.dayKey(today);
    for (var d = 1; d <= days; d++) {
      (function (d) {
        var date = new Date(y, m, d), key = St.dayKey(date), rec = St.d.daily[key];
        var future = date > today && key !== todayKey;
        var b = document.createElement('button');
        b.className = 'day' + (rec ? ' done' : '') + (key === todayKey ? ' today' : '') + (future ? ' future' : '') + (rec && rec.late ? ' late' : '');
        b.innerHTML = '<canvas></canvas><span>' + d + '</span>';
        grid.appendChild(b);
        if (rec) requestAnimationFrame(function () { paintDaily(b.querySelector('canvas'), key, rec); });
        b.addEventListener('click', function () {
          if (future) { Snd.deny(); return; }
          Snd.ui();
          if (rec) {
            var def = window.InkDaily.get(key);
            openViewer({ title: T('daily'), sub: key, L: Sim.parse(def), rec: rec, play: function () { startDaily(key); } });
          } else startDaily(key);
        });
      })(d);
    }
    var tk = St.d.daily[todayKey];
    $('diary-play').querySelector('span').textContent = tk ? T('viewToday') : T('playToday');
    $('diary-note').textContent = tk ? T('streakKeep', { n: sk + 1 }) : T('diff')[window.InkDaily.tier(todayKey)];
  }

  /* ---------- viewer ---------- */
  var viewerPlay = null;
  function openViewer(o) {
    $('vw-title').textContent = o.title; $('vw-sub').textContent = o.sub;
    var r = o.rec;
    $('vw-stats').innerHTML = '<span class="vw-seal">' + Icons.seal(!r.seal) + '</span>' +
      '<span>' + (r.tries === 1 ? T('firstTry') : T('solvedIn', { n: r.tries })) + '</span>';
    viewerPlay = o.play;
    openSheet('sheet-viewer');
    requestAnimationFrame(function () { R.paint($('vw-canvas'), o.L, St.decodeBoard(r.board), { paper: St.d.paper, pad: 14, seeds: r.seeds }); });
  }

  /* ---------- settings ---------- */
  function renderSettings() {
    var d = St.d;
    function seg(id, opts, val, fn) {
      var box = $(id); box.innerHTML = '';
      opts.forEach(function (o) {
        var b = document.createElement('button'); b.textContent = o[1]; b.className = o[0] === val ? 'on' : '';
        b.addEventListener('click', function () { fn(o[0]); Snd.ui(); renderSettings(); });
        box.appendChild(b);
      });
    }
    $('set-title').textContent = T('settings');
    $('lbl-lang').textContent = T('sLang'); $('lbl-sound').textContent = T('sSound'); $('lbl-vibe').textContent = T('sVibe');
    $('lbl-cb').textContent = T('sCB'); $('desc-cb').textContent = T('sCBDesc'); $('lbl-tempo').textContent = T('sTempo'); $('lbl-paper').textContent = T('sPaper');
    seg('set-lang', [['ko', '한국어'], ['en', 'English']], I.lang, function (v) { d.lang = v; I.set(v); St.save(); applyLang(); });
    seg('set-sound', [[true, T('on')], [false, T('off')]], d.sound, function (v) { d.sound = v; Snd.setEnabled(v); St.save(); });
    seg('set-vibe', [[true, T('on')], [false, T('off')]], d.vibe, function (v) { d.vibe = v; Snd.setVibe(v); St.save(); if (v) Snd.haptic(20); });
    seg('set-cb', [[true, T('on')], [false, T('off')]], d.cb, function (v) { d.cb = v; R.setCB(v); St.save(); window.Play.refreshQueue(); });
    seg('set-tempo', [['normal', T('tempoNormal')], ['relaxed', T('tempoRelaxed')]], d.tempo, function (v) { d.tempo = v; St.save(); });
    var pbox = $('set-paper'); pbox.innerHTML = '';
    R.PAPER_ORDER.forEach(function (p) {
      var have = !!d.papers[p], b = document.createElement('button');
      b.className = 'swatch' + (d.paper === p ? ' on' : '') + (have ? '' : ' locked');
      b.style.background = R.PAPERS[p].base;
      b.innerHTML = have ? '<span>' + T('paperNames')[p] + '</span>' : Icons.icon('lock');
      b.addEventListener('click', function () { if (!have) { Snd.deny(); return; } d.paper = p; St.save(); Snd.ui(); renderSettings(); });
      pbox.appendChild(b);
    });
    // colour legend
    var lg = $('set-legend'); lg.innerHTML = '';
    ['R', 'Y', 'B', 'O', 'G', 'P'].forEach(function (k) {
      var code = Sim.CODE[k], hex = R.color(code);
      var it = document.createElement('div'); it.className = 'lg';
      it.innerHTML = '<div class="lg-chip">' + Icons.chip(hex, code, R.lum(hex) > 0.62) + '</div><span>' + I.colorName(k) + '</span>';
      lg.appendChild(it);
    });
    $('lbl-legend').textContent = T('legendTitle'); $('desc-legend').textContent = T('legendDesc');
    var rs = $('set-reset'); rs.textContent = T('sReset'); rs.dataset.armed = '';
  }

  function closeSettings() {
    closeSheet('sheet-settings');
    if (screen === 'play') { window.Play.applySettings(); window.Play.resume(); }
    else show(screen);
  }

  function applyLang() {
    document.querySelectorAll('[data-t]').forEach(function (n) { n.textContent = T(n.getAttribute('data-t')); });
    document.title = I.lang === 'ko' ? '번짐 · Inkbloom' : 'Inkbloom · 번짐';
    $('logo-main').textContent = T('title'); $('logo-sub').textContent = T('subtitle');
    if (screen === 'home') renderHome();
    if (screen === 'book') renderBook();
    if (screen === 'diary') renderDiary();
    if (screen === 'play' && window.Play.def) { $('pl-name').textContent = I.name(window.Play.def.name); }
  }

  /* ---------- wiring ---------- */
  function wire() {
    function on(id, fn) { $(id).addEventListener('click', function (e) { Snd.unlock(); fn(e); }); }
    on('home-continue', function () { Snd.ui(); var t = nextTarget(); if (t >= 0) startLevel(t); else show('book'); });
    on('home-daily', function () { Snd.ui(); var k = St.dayKey(); if (St.d.daily[k]) show('diary'); else startDaily(k); });
    on('home-strip', function () { Snd.ui(); bookChapter = bookChapterHome; show('book'); });
    on('home-book', function () { Snd.ui(); var t = nextTarget(); bookChapter = t >= 0 ? FLAT[t].ci : 0; show('book'); });
    on('home-diary', function () { Snd.ui(); diaryMonth = null; show('diary'); });
    on('home-settings', function () { Snd.ui(); renderSettings(); openSheet('sheet-settings'); });
    on('pl-home', function () { Snd.ui(); show(current && current.kind === 'daily' ? 'diary' : 'home'); });
    on('pl-settings', function () { Snd.ui(); window.Play.pause(); renderSettings(); openSheet('sheet-settings'); });
    on('book-back', function () { Snd.ui(); show('home'); });
    on('diary-back', function () { Snd.ui(); show('home'); });
    on('diary-prev', function () { Snd.ui(); diaryMonth = new Date(diaryMonth.getFullYear(), diaryMonth.getMonth() - 1, 1); renderDiary(); });
    on('diary-next', function () { Snd.ui(); diaryMonth = new Date(diaryMonth.getFullYear(), diaryMonth.getMonth() + 1, 1); renderDiary(); });
    on('diary-play', function () {
      Snd.ui(); var k = St.dayKey(), rec = St.d.daily[k];
      if (rec) openViewer({ title: T('daily'), sub: k, L: Sim.parse(window.InkDaily.get(k)), rec: rec, play: function () { startDaily(k); } });
      else startDaily(k);
    });
    on('set-close', function () { Snd.ui(); closeSettings(); });
    on('vw-close', function () { Snd.ui(); closeSheet('sheet-viewer'); });
    on('vw-play', function () { Snd.ui(); closeSheet('sheet-viewer'); if (viewerPlay) viewerPlay(); });
    on('set-reset', function () {
      var rs = $('set-reset');
      if (!rs.dataset.armed) { rs.dataset.armed = '1'; rs.textContent = T('sResetConfirm'); return; }
      St.reset(); closeSheet('sheet-settings'); show('home');
    });
    on('pl-next', function () {
      Snd.ui();
      if (!current) return show('home');
      if (current.kind === 'daily') { diaryMonth = null; return show('diary'); }
      var g = current.g + 1;
      if (g < FLAT.length) startLevel(g); else { bookChapter = CH.length - 1; show('book'); }
    });
    on('pl-replay', function () {
      Snd.ui();
      if (current && current.kind === 'daily') return show('home');
      startLevel(current.g);
    });
    $('book-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b) return;
      var ci = +b.dataset.ci;
      if (!chapterUnlocked(ci)) { Snd.deny(); return; }
      Snd.page(); bookChapter = ci; renderBook();
    });
    document.querySelectorAll('.sheet').forEach(function (sh) {
      sh.addEventListener('click', function (e) { if (e.target === sh) { if (sh.id === 'sheet-settings') closeSettings(); else sh.classList.remove('open'); } });
    });
    // icons
    document.querySelectorAll('[data-ic]').forEach(function (n) { n.insertAdjacentHTML('afterbegin', Icons.icon(n.getAttribute('data-ic'))); });
  }

  function loop(now) {
    requestAnimationFrame(loop);
    // rAF stamps can trail performance.now() slightly; never let time run backwards
    now = Math.max(now, performance.now());
    try {
      if (screen === 'play') { window.Play.update(now); window.Play.draw(now); }
      else if (screen === 'home') ambient(now);
    } catch (e) { if (window.console) console.error(e); }
  }

  function boot() {
    St.load();
    var d = St.d;
    I.set(d.lang || I.detect());
    R.setCB(d.cb); Snd.setEnabled(d.sound); Snd.setVibe(d.vibe);
    wire();
    window.Play.init();
    applyLang();
    // first launch: straight onto the paper, no menus
    var fresh = !Object.keys(d.levels).length && !Object.keys(d.daily).length;
    var params = new URLSearchParams(location.search);
    if (params.get('level')) { var g = +params.get('level') - 1; if (FLAT[g]) { startLevel(g); requestAnimationFrame(loop); return; } }
    if (fresh) startLevel(0); else show('home');
    requestAnimationFrame(loop);
    window.InkUI = { startLevel: startLevel, startDaily: startDaily, show: show, FLAT: FLAT };
  }
  boot();
})();

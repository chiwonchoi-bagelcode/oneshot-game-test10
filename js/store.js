/* Inkbloom — persistent progress (localStorage, fails soft) */
(function () {
  'use strict';
  var KEY = 'inkbloom.save.v1';
  var data = null;

  function fresh() {
    return {
      v: 1, lang: null, sound: true, vibe: true, cb: false, tempo: 'normal', paper: 'cream',
      levels: {},          // id -> { board, seal, tries, hints, at }
      daily: {},           // 'YYYY-MM-DD' -> { board, tries, hints, at }
      papers: { cream: true },
      seen: {},            // mechanic intros already shown
      totalDrops: 0, created: Date.now()
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      data = raw ? JSON.parse(raw) : fresh();
      var f = fresh();
      for (var k in f) if (data[k] === undefined) data[k] = f[k];
    } catch (e) { data = fresh(); }
    return data;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ } }

  function encodeBoard(col) { var s = ''; for (var i = 0; i < col.length; i++) s += col[i]; return s; }
  function decodeBoard(s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = +s[i]; return a; }

  function dayKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }

  function streak() {
    var today = new Date(), d = today, n = 0;
    if (!data.daily[dayKey(today)]) d = addDays(today, -1);
    while (data.daily[dayKey(d)]) { n++; d = addDays(d, -1); }
    return n;
  }
  function bestStreak() {
    var keys = Object.keys(data.daily).sort(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
      if (prev && dayKey(addDays(prev, 1)) === k) run++; else run = 1;
      if (run > best) best = run; prev = d;
    });
    return best;
  }

  window.Store = {
    load: load, save: save, encodeBoard: encodeBoard, decodeBoard: decodeBoard,
    dayKey: dayKey, addDays: addDays, streak: streak, bestStreak: bestStreak,
    get d() { return data; },
    reset: function () { var keep = { lang: data.lang }; data = fresh(); data.lang = keep.lang; save(); }
  };
})();

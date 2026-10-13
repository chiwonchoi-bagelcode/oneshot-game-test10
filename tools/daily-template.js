/* Daily sheet: one puzzle per calendar day, the same for everyone.
 * Weekdays start light and the weekend is tricky. Each base puzzle is re-coloured
 * and mirrored by a date hash, so the pool goes a long way before anything repeats. */
(function () {
  'use strict';
  var POOL = /*POOL*/[];
  var PERMS = [
    { R: 'R', Y: 'Y', B: 'B' }, { R: 'Y', Y: 'B', B: 'R' }, { R: 'B', Y: 'R', B: 'Y' },
    { R: 'R', Y: 'B', B: 'Y' }, { R: 'B', Y: 'Y', B: 'R' }, { R: 'Y', Y: 'R', B: 'B' }
  ];
  function dayNumber(key) { var p = key.split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function mix(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }
  function tier(key) {
    var p = key.split('-'), dow = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
    return dow === 0 || dow === 6 ? 2 : (dow === 1 || dow === 2 ? 0 : 1);
  }
  // a fixed shuffle of each tier, walked one sheet per matching weekday
  var tiers = [[], [], []];
  POOL.forEach(function (e, k) { tiers[e.tier].push(k); });
  tiers.forEach(function (list, t) {
    var s = 1234 + t * 77;
    for (var i = list.length - 1; i > 0; i--) { s = mix(s + i); var j = s % (i + 1), tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
  });
  var cache = {};
  function get(key) {
    if (cache[key]) return cache[key];
    var d = dayNumber(key), p = key.split('-'), dow = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
    var t = tier(key);
    // Mon/Tue -> light (2 per week), Wed/Thu/Fri -> medium (3), Sat/Sun -> tricky (2)
    var slot = { 1: 0, 2: 1, 3: 0, 4: 1, 5: 2, 6: 0, 0: 1 }[dow], per = t === 1 ? 3 : 2;
    var week = Math.floor((d + 3) / 7);
    var list = tiers[t].length ? tiers[t] : POOL.map(function (e, k) { return k; });
    var base = POOL[list[(week * per + slot) % list.length]];
    var h = mix(d * 31 + 7);
    var def = window.InkSim.transform(base, PERMS[h % 6], ((h >>> 3) & 1) === 1);
    def.id = 'daily-' + key;
    def.name = { ko: '오늘의 한 장', en: 'Daily Sheet' };
    def.tempo = 640;
    cache[key] = def;
    return def;
  }
  window.InkDaily = { get: get, tier: tier, size: POOL.length };
})();

/* Inkbloom — synthesized sound (Web Audio, no assets) and haptics.
 * Everything is tuned to D major pentatonic so overlapping inks always sound like music. */
(function () {
  'use strict';
  var ctx = null, master = null, wet = null, enabled = true, vibe = true, noiseBuf = null;
  // D major pentatonic, MIDI numbers from D3 upward
  var SCALE = [50, 52, 54, 57, 59];
  function note(deg) { var o = Math.floor(deg / 5), d = ((deg % 5) + 5) % 5; return SCALE[d] + 12 * o; }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // each primary owns a degree; mixing them gives a consonant interval
  var BASE = { 1: 5, 2: 8, 4: 7 }; // R = D4, Y = A4, B = F#4

  function init() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = enabled ? 0.8 : 0;
    master.connect(comp); comp.connect(ctx.destination);
    // small room reverb from decaying noise
    var conv = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 1.6);
    var ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    conv.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = 0.28;
    wet.connect(conv); conv.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    return ctx;
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }
  function ok() { return enabled && ctx && ctx.state === 'running'; }
  function out(g, send) { g.connect(master); if (send) { var s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(wet); } }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  // soft mallet: fundamental + inharmonic overtone
  function pluck(m, vol, t, dec) {
    t = t || ctx.currentTime; dec = dec || 0.7;
    var f = hz(m), g = ctx.createGain(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = 'sine'; o1.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 3.93; g2.gain.value = 0.18;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    env(g, t, 0.004, vol, dec);
    out(g, 0.5);
    o1.start(t); o2.start(t); o1.stop(t + dec + 0.05); o2.stop(t + 0.25);
  }
  function bell(m, vol, t, dec) {
    t = t || ctx.currentTime; dec = dec || 1.6;
    var f = hz(m), parts = [[1, 1], [2.0, 0.35], [2.76, 0.22], [5.4, 0.08]];
    parts.forEach(function (p, idx) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * p[0];
      o.connect(g); env(g, t, 0.003, vol * p[1], dec / (1 + idx * 0.7));
      out(g, 0.9); o.start(t); o.stop(t + dec + 0.1);
    });
  }
  function drip(pitch, vol) {
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.exponentialRampToValueAtTime(pitch * 2.6, t + 0.06);
    o.connect(g); env(g, t, 0.002, vol, 0.13);
    out(g, 0.6); o.start(t); o.stop(t + 0.2);
  }
  function noise(dur, vol, freq, q, t) {
    t = t || ctx.currentTime;
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 0.8;
    src.connect(f); f.connect(g); env(g, t, 0.01, vol, dur);
    out(g, 0.3); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function thud() {
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.25);
    f.type = 'lowpass'; f.frequency.value = 500;
    o.connect(f); f.connect(g); env(g, t, 0.005, 0.5, 0.35);
    out(g, 0.15); o.start(t); o.stop(t + 0.45);
    noise(0.12, 0.08, 300, 0.6, t);
  }

  var A = {
    unlock: unlock,
    setEnabled: function (v) { enabled = v; if (master) master.gain.value = v ? 0.8 : 0; },
    setVibe: function (v) { vibe = v; },
    haptic: function (p) { if (vibe && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } },
    tick: function (accent) {
      if (!ok()) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = accent ? 1560 : 1180;
      o.connect(g); env(g, t, 0.002, accent ? 0.05 : 0.03, 0.05);
      out(g, 0); o.start(t); o.stop(t + 0.08);
    },
    drop: function (c) {
      if (!ok()) return;
      drip({ 1: 520, 2: 700, 4: 430 }[c] || 520, 0.42);
      pluck(note(BASE[c] || 5), 0.18, ctx.currentTime + 0.03, 0.9);
      A.haptic(12);
    },
    // one call per beat with the colours that spread and how far each wave has travelled
    spread: function (list) {
      if (!ok() || !list.length) return;
      var t = ctx.currentTime;
      list.forEach(function (s, idx) {
        var deg = (BASE[s.c] || 5) + (s.gen % 6);
        var v = Math.min(0.16, 0.06 + 0.012 * s.count);
        pluck(note(deg), v, t + idx * 0.012, 0.55);
      });
      noise(0.18, 0.025 + Math.min(0.03, list.length * 0.008), 2400, 0.5, t);
    },
    mix: function (c) {
      if (!ok()) return;
      var t = ctx.currentTime, bitsList = [1, 2, 4].filter(function (b) { return c & b; });
      bitsList.forEach(function (b, k) { bell(note(BASE[b] + 5), 0.11, t + k * 0.03, 1.2); });
      noise(0.35, 0.03, 5200, 1.5, t);
    },
    mud: function () { if (!ok()) return; thud(); },
    wake: function (c) {
      if (!ok()) return;
      var t = ctx.currentTime;
      bell(note((BASE[c] || 5) + 10), 0.09, t, 0.8);
      bell(note((BASE[c] || 5) + 12), 0.06, t + 0.06, 0.8);
    },
    goal: function (n) {
      if (!ok()) return;
      bell(note(10 + n), 0.16, ctx.currentTime, 1.8);
      A.haptic(16);
    },
    warn: function () {
      if (!ok()) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = hz(note(3)); o.connect(g); env(g, t, 0.01, 0.06, 0.25);
      out(g, 0.2); o.start(t); o.stop(t + 0.3);
    },
    fail: function () { if (!ok()) return; thud(); A.haptic([30, 50, 30]); },
    deny: function () {
      if (!ok()) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 180; o.connect(g); env(g, t, 0.005, 0.12, 0.09);
      out(g, 0); o.start(t); o.stop(t + 0.12);
      A.haptic(8);
    },
    win: function () {
      if (!ok()) return;
      var t = ctx.currentTime;
      [0, 2, 4, 5, 7, 9, 10, 12].forEach(function (d, k) { bell(note(10 + d), 0.12, t + k * 0.085, 2.2); });
      // warm pad: D add9
      [note(5), note(7), note(8), note(11)].forEach(function (m) {
        var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = hz(m) / 2;
        f.type = 'lowpass'; f.frequency.value = 1200;
        o.connect(f); f.connect(g);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
        out(g, 0.8); o.start(t); o.stop(t + 3.3);
      });
      A.haptic([20, 40, 20, 40, 60]);
    },
    ui: function () {
      if (!ok()) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; o.connect(g); env(g, t, 0.002, 0.04, 0.06);
      out(g, 0); o.start(t); o.stop(t + 0.08);
    },
    hint: function () { if (!ok()) return; bell(note(12), 0.08, ctx.currentTime, 1.0); bell(note(14), 0.06, ctx.currentTime + 0.08, 1.0); },
    page: function () { if (!ok()) return; noise(0.22, 0.05, 1800, 0.4); }
  };
  window.Sound = A;
})();

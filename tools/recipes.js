/* Generator recipes, one per kind of puzzle slot. */
'use strict';
module.exports = {
  // ---- Chapter 1: open paper -------------------------------------------------
  c1_rb: { w: 5, h: 6, inks: ['R', 'B'], mix: [1, 12], sMax: 5, maxTargets: 5, primW: 1.3, requireDistinct: true },
  c1_yb: { w: 6, h: 6, inks: ['Y', 'B'], mix: [1, 12], sMax: 3, maxTargets: 5, requireDistinct: true },
  c1_ry: { w: 5, h: 6, inks: ['R', 'Y'], mix: [1, 12], sMax: 3, maxTargets: 5, requireDistinct: true },
  c1_race: { w: 5, h: 6, inks: ['B', 'R'], mix: [0, 2], sMax: 4, maxTargets: 5, primW: 2.5, requireDistinct: true },
  c1_ryb: { w: 6, h: 6, inks: ['R', 'Y', 'B'], mix: [2, 16], sMax: 3, maxTargets: 6, requireDistinct: true, initMix: 2 },
  c1_wells: { w: 6, h: 6, inks: ['R', 'B'], wells: 3, mix: [1, 12], sMax: 2, maxTargets: 4, requireDistinct: true },
  // ---- Chapter 2: walls ------------------------------------------------------
  c2_rb: { w: 6, h: 7, inks: ['R', 'B'], walls: 'segments', segments: 3, sym: true, mix: [1, 12], sMax: 3, maxTargets: 5, requireDistinct: true },
  c2_yb: { w: 6, h: 7, inks: ['Y', 'B'], walls: 'scatter', wallDensity: 0.14, sym: true, mix: [1, 12], sMax: 3, maxTargets: 5, requireDistinct: true },
  c2_rooms: { w: 6, h: 8, inks: ['R', 'Y'], walls: 'rooms', segments: 2, gap: 0, mix: [1, 12], sMax: 3, maxTargets: 5, requireDistinct: true },
  c2_ryb: { w: 6, h: 8, inks: ['R', 'Y', 'B'], walls: 'segments', segments: 4, sym: true, mix: [2, 16], sMax: 3, maxTargets: 6, requireDistinct: true, initMix: 2 },
  c2_wells: { w: 6, h: 7, inks: ['Y', 'R', 'B'], walls: 'segments', segments: 3, wells: 4, mix: [2, 16], sMax: 2, maxTargets: 5, requireDistinct: true },
  c2_big: { w: 7, h: 8, inks: ['B', 'Y', 'R'], walls: 'rooms', segments: 2, gap: 1, mix: [2, 16], sMax: 2, maxTargets: 6, requireDistinct: true, initMix: 2 },
  // ---- Chapter 3: sleeping ink -----------------------------------------------
  c3_one: { w: 6, h: 7, inks: ['R'], seeds: ['b', 'b'], mix: [1, 12], sMax: 2, maxTargets: 5, seedsMustWake: true },
  c3_two: { w: 6, h: 7, inks: ['Y', 'R'], seeds: ['b'], walls: 'scatter', wallDensity: 0.08, sym: true, mix: [2, 16], sMax: 3, maxTargets: 6, seedsMustWake: true, requireDistinct: true },
  c3_chain: { w: 6, h: 8, inks: ['B', 'R'], seeds: ['y', 'y', 'r'], walls: 'segments', segments: 2, mix: [2, 18], sMax: 2, maxTargets: 6, seedsMustWake: true, requireDistinct: true },
  c3_mixed: { w: 7, h: 8, inks: ['R', 'B'], seeds: ['y', 'b', 'r'], walls: 'segments', segments: 3, sym: true, mix: [2, 18], sMax: 2, maxTargets: 6, seedsMustWake: true, requireDistinct: true, maxMud: 1 },
  c3_three: { w: 7, h: 8, inks: ['Y', 'B', 'R'], seeds: ['r', 'b'], walls: 'scatter', wallDensity: 0.08, mix: [2, 18], sMax: 2, maxTargets: 6, requireDistinct: true, initMix: 2 },
  // ---- Chapter 4: keep it white (short inks + dry spots) -----------------------
  c4_short: { w: 6, h: 7, inks: ['R3', 'B3'], dry: 2, mix: [1, 10], sMax: 3, maxTargets: 6, requireDistinct: true },
  c4_mixed: { w: 6, h: 7, inks: ['Y', 'B2'], dry: 2, walls: 'segments', segments: 3, sym: true, mix: [1, 10], sMax: 3, maxTargets: 6, requireDistinct: true },
  c4_three: { w: 6, h: 8, inks: ['R4', 'Y3', 'B4'], dry: 2, walls: 'scatter', wallDensity: 0.08, mix: [1, 12], sMax: 2, maxTargets: 7, requireDistinct: true },
  c4_seal: { w: 7, h: 8, inks: ['R', 'B'], dry: 3, walls: 'rooms', segments: 2, gap: 0, mix: [1, 12], sMax: 2, maxTargets: 7, requireDistinct: true },
  c4_seed: { w: 6, h: 8, inks: ['Y3', 'R'], seeds: ['b'], dry: 2, walls: 'segments', segments: 3, mix: [1, 12], sMax: 2, maxTargets: 7, requireDistinct: true },
  // ---- Chapter 5: thick paper -------------------------------------------------
  c5_rb: { w: 6, h: 7, inks: ['R', 'B'], thick: 3, thickLen: 4, mix: [1, 12], sMax: 3, maxTargets: 5, requireDistinct: true },
  c5_walls: { w: 6, h: 8, inks: ['Y', 'B'], thick: 3, walls: 'segments', segments: 3, sym: true, mix: [1, 12], sMax: 2, maxTargets: 6, requireDistinct: true },
  c5_ryb: { w: 7, h: 8, inks: ['R', 'Y', 'B'], thick: 4, walls: 'scatter', wallDensity: 0.06, mix: [2, 16], sMax: 2, maxTargets: 6, requireDistinct: true, initMix: 2 },
  c5_seed: { w: 7, h: 8, inks: ['B', 'R'], thick: 3, seeds: ['y'], walls: 'segments', segments: 2, mix: [2, 16], sMax: 2, maxTargets: 6, requireDistinct: true, seedsMustWake: true },
  // ---- Chapter 6: masterworks ---------------------------------------------------
  c6_a: { w: 7, h: 9, inks: ['R', 'Y', 'B'], thick: 2, seeds: ['b'], walls: 'segments', segments: 4, sym: true, mix: [2, 18], sMax: 1, maxTargets: 7, requireDistinct: true, initMix: 2 },
  c6_b: { w: 7, h: 9, inks: ['Y4', 'B', 'R3'], dry: 2, walls: 'rooms', segments: 2, gap: 1, mix: [2, 18], sMax: 1, maxTargets: 8, requireDistinct: true, initMix: 2 },
  c6_c: { w: 7, h: 9, inks: ['B4', 'R', 'Y4'], thick: 3, dry: 2, walls: 'scatter', wallDensity: 0.08, sym: true, mix: [2, 18], sMax: 1, maxTargets: 8, requireDistinct: true, initMix: 2 },
  c6_d: { w: 7, h: 8, inks: ['R', 'B', 'Y', 'B'], wells: 5, walls: 'segments', segments: 3, mix: [2, 18], sMax: 1, maxTargets: 7, requireDistinct: true, initMix: 2, leafCap: 1.2e7 },
  // ---- Breathers: lighter levels that keep the rhythm of each chapter ----------
  b2: { w: 5, h: 6, inks: ['B', 'Y'], walls: 'segments', segments: 2, sym: true, mix: [1, 10], sMax: 6, maxTargets: 4, requireDistinct: true },
  b3: { w: 5, h: 6, inks: ['Y'], seeds: ['r'], walls: 'scatter', wallDensity: 0.06, mix: [1, 10], sMax: 5, maxTargets: 4, seedsMustWake: true },
  b4: { w: 5, h: 6, inks: ['B3', 'R2'], dry: 2, mix: [0, 6], sMax: 5, maxTargets: 5, requireDistinct: true },
  b5: { w: 5, h: 6, inks: ['R', 'Y'], thick: 2, mix: [1, 10], sMax: 5, maxTargets: 4, requireDistinct: true },
  b6: { w: 6, h: 7, inks: ['R', 'B'], thick: 2, seeds: ['y'], walls: 'segments', segments: 2, mix: [2, 14], sMax: 3, maxTargets: 5, requireDistinct: true, seedsMustWake: true },
  // ---- Daily pool ---------------------------------------------------------------
  d_open: { w: 6, h: 7, inks: ['R', 'Y', 'B'], mix: [2, 16], sMax: 3, maxTargets: 6, requireDistinct: true, initMix: 2 },
  d_walls: { w: 6, h: 7, inks: ['Y', 'B', 'R'], walls: 'segments', segments: 3, sym: true, mix: [2, 16], sMax: 3, maxTargets: 6, requireDistinct: true, initMix: 2 },
  d_seed: { w: 6, h: 7, inks: ['B', 'R'], seeds: ['y'], walls: 'scatter', wallDensity: 0.08, mix: [2, 16], sMax: 3, maxTargets: 6, requireDistinct: true, seedsMustWake: true },
  d_thick: { w: 6, h: 7, inks: ['R', 'B'], thick: 3, walls: 'segments', segments: 2, mix: [1, 14], sMax: 3, maxTargets: 6, requireDistinct: true },
  d_dry: { w: 6, h: 7, inks: ['Y3', 'B', 'R3'], dry: 2, walls: 'scatter', wallDensity: 0.06, mix: [1, 14], sMax: 3, maxTargets: 7, requireDistinct: true }
};

// Core rule tests for js/sim.js.  usage: node tests/sim-test.js
const assert = require('assert');
const Sim = require('../js/sim.js');

function board(def, drops) {
  const L = Sim.parse(def), r = Sim.run(L, drops);
  const rows = [];
  for (let y = 0; y < L.h; y++) {
    let s = '';
    for (let x = 0; x < L.w; x++) { const i = y * L.w + x; s += L.terrain[i] === Sim.WALL ? '#' : (r.state.col[i] ? Sim.NAME[r.state.col[i]] : (r.state.sd[i] ? Sim.NAME[r.state.sd[i]].toLowerCase() : '.')); }
    rows.push(s);
  }
  return { rows, r };
}
const tests = {
  'same beat mixes, the seam does not spread': () => {
    const b = board({ map: ['.......'], inks: ['R', 'B'] }, [{ x: 0, y: 0, t: 0 }, { x: 6, y: 0, t: 0 }]);
    assert.deepStrictEqual(b.rows, ['RRRPBBB']);
  },
  'a later drop moves the meeting point': () => {
    const b = board({ map: ['.......'], inks: ['R', 'B'] }, [{ x: 0, y: 0, t: 0 }, { x: 6, y: 0, t: 2 }]);
    assert.deepStrictEqual(b.rows, ['RRRRPBB']);
  },
  'odd distance: colours touch without mixing': () => {
    const b = board({ map: ['......'], inks: ['R', 'B'] }, [{ x: 0, y: 0, t: 0 }, { x: 5, y: 0, t: 0 }]);
    assert.deepStrictEqual(b.rows, ['RRRBBB']);
  },
  'three colours at once turn to mud': () => {
    const b = board({ map: ['...', '...', '...'], inks: ['R', 'Y', 'B'] }, [{ x: 1, y: 0, t: 0 }, { x: 0, y: 1, t: 0 }, { x: 2, y: 1, t: 0 }]);
    assert.strictEqual(b.rows[1][1], 'K');
  },
  'walls block and lengthen the path': () => {
    const b = board({ map: ['...', '.#.', '...'], inks: ['R'] }, [{ x: 0, y: 1, t: 0 }]);
    assert.deepStrictEqual(b.rows, ['RRR', 'R#R', 'RRR']);
  },
  'sleeping ink wakes in its own colour when touched': () => {
    const b = board({ map: ['..b..'], inks: ['R'] }, [{ x: 0, y: 0, t: 0 }]);
    assert.deepStrictEqual(b.rows, ['RRBBB']);
  },
  'thick paper holds ink one extra beat': () => {
    const L = Sim.parse({ map: ['.~..'], inks: ['R'] }), S = new Sim.State(L);
    Sim.drop(L, S, 0);
    Sim.step(L, S); assert.strictEqual(S.col[1], 1);
    Sim.step(L, S); assert.strictEqual(S.col[2], 0, 'still resting on thick paper');
    Sim.step(L, S); assert.strictEqual(S.col[2], 1);
  },
  'short ink stops after its number of steps': () => {
    const b = board({ map: ['......'], inks: ['R2'] }, [{ x: 0, y: 0, t: 0 }]);
    assert.deepStrictEqual(b.rows, ['RRR...']);
  },
  'drops land only on empty cells (and only wells if a sheet has wells)': () => {
    const L = Sim.parse({ map: ['o..'], inks: ['R', 'B'] }), S = new Sim.State(L);
    assert.strictEqual(Sim.canDrop(L, S, 1), false);
    assert.strictEqual(Sim.drop(L, S, 0), true);
    assert.strictEqual(Sim.canDrop(L, S, 0), false);
  },
  'goals: broken, solved, dry': () => {
    const def = { map: ['.....'], goal: ['P...x'], inks: ['R', 'B'] };
    assert.strictEqual(Sim.run(Sim.parse(def), [{ x: 2, y: 0, t: 0 }, { x: 4, y: 0, t: 0 }]).ok, false);
    const def2 = { map: ['..#..'], goal: ['R..x.'], inks: ['R'] };
    assert.strictEqual(Sim.run(Sim.parse(def2), [{ x: 1, y: 0, t: 0 }]).ok, true);
  },
  'colour permutation + mirror keeps a solution valid': () => {
    const def = { map: ['.R...'], goal: ['..P..'], inks: ['B'], sol: [{ x: 3, y: 0, t: 0 }] };
    const t = Sim.transform(def, { R: 'Y', Y: 'B', B: 'R' }, true);
    assert.deepStrictEqual(t.goal, ['..O..']);
    assert.strictEqual(Sim.run(Sim.parse(t), t.sol).ok, true);
  }
};
let fail = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); }
}
process.exit(fail ? 1 : 0);

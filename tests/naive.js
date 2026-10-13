// A careless first-timer: drops every ink on random free cells, one per beat.
// Every level must end (win or a clear failure message) and never hang.
// usage: NODE_PATH=$(npm root -g) node tests/naive.js <from> <to> [seed]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const from = +(process.argv[2] || 1), to = +(process.argv[3] || from);
  let seed = +(process.argv[4] || 7);
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  let hung = 0;
  const msgs = {};
  for (let n = from; n <= to; n++) {
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?level=' + n);
    await page.waitForTimeout(200);
    const K = await page.evaluate(() => window.Play.L.inks.length);
    for (let k = 0; k < K; k++) {
      const cells = await page.evaluate(() => { const L = window.Play.L, S = window.Play.S, out = []; for (let i = 0; i < L.n; i++) if (window.InkSim.canDrop(L, S, i)) out.push(i); return { out, mode: window.Play.mode, w: L.w }; });
      if (cells.mode !== 'ready' && cells.mode !== 'run') break;
      if (!cells.out.length) break;
      const i = cells.out[Math.floor(rnd() * cells.out.length)];
      const pos = await page.evaluate(([x, y]) => { const b = window.Play.board, r = b.cv.getBoundingClientRect(); return { x: r.left + b.ox + (x + 0.5) * b.s, y: r.top + b.oy + (y + 0.5) * b.s }; }, [i % cells.w, Math.floor(i / cells.w)]);
      await page.mouse.click(pos.x, pos.y);
      await page.waitForTimeout(250 + rnd() * 700);
    }
    let end;
    try {
      await page.waitForFunction(() => window.Play.mode === 'done' || window.Play.mode === 'lost', null, { timeout: 25000, polling: 100 });
      end = await page.evaluate(() => ({ mode: window.Play.mode, m1: document.getElementById('pl-m1').textContent, m2: document.getElementById('pl-m2').textContent }));
    } catch (e) {
      end = await page.evaluate(() => ({ mode: 'HUNG:' + window.Play.mode, k: window.Play.S.k, active: window.InkSim.active(window.Play.L, window.Play.S) }));
      hung++;
    }
    const key = end.m1 || end.mode;
    msgs[key] = (msgs[key] || 0) + 1;
    console.log(`L${n}: ${JSON.stringify(end)}`);
  }
  console.log('hung:', hung);
  console.log(JSON.stringify(msgs, null, 1));
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  process.exit(hung || errors.length ? 1 : 0);
})();

// Automated player: solves levels through the real UI by tapping the canvas on the right beat.
// usage: NODE_PATH=$(npm root -g) node tests/play.js <from> <to> [shotDir] [--relaxed] [--fail]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const from = +(process.argv[2] || 1), to = +(process.argv[3] || from);
  const shotDir = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : null;
  const relaxed = process.argv.includes('--relaxed');
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let pass = 0, failN = 0;
  for (let n = from; n <= to; n++) {
    await page.goto(url + '?level=' + n);
    if (relaxed) await page.evaluate(() => { window.Store.d.tempo = 'relaxed'; });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => ({ sol: window.Play.def.sol, id: window.Play.def.id, w: window.Play.L.w }));
    for (let k = 0; k < info.sol.length; k++) {
      const d = info.sol[k];
      // wait for the drop's beat
      await page.waitForFunction(t => window.Play.mode === 'ready' || (window.Play.mode === 'run' && window.Play.S.t >= t), d.t, { timeout: 20000, polling: 10 });
      const pos = await page.evaluate(([x, y]) => {
        const b = window.Play.board, r = b.cv.getBoundingClientRect();
        return { x: r.left + b.ox + (x + 0.5) * b.s, y: r.top + b.oy + (y + 0.5) * b.s, t: window.Play.S.t };
      }, [d.x, d.y]);
      if (pos.t > d.t) { console.log('  late for drop', k, 'beat', pos.t, '>', d.t); }
      await page.mouse.click(pos.x, pos.y);
      if (shotDir && k === info.sol.length - 1) { await page.waitForTimeout(400); await page.screenshot({ path: `${shotDir}/L${n}-mid.png` }); }
    }
    let res;
    try {
      await page.waitForFunction(() => window.Play.mode === 'done' || window.Play.mode === 'lost', null, { timeout: 30000, polling: 50 });
      res = await page.evaluate(() => window.Play.mode);
    } catch (e) { res = 'timeout:' + await page.evaluate(() => window.Play.mode); }
    if (shotDir) { await page.waitForTimeout(1300); await page.screenshot({ path: `${shotDir}/L${n}-end.png` }); }
    const ok = res === 'done';
    if (ok) pass++; else failN++;
    console.log(`L${n} ${info.id}: ${ok ? 'WIN' : 'FAIL (' + res + ')'}`);
  }
  console.log(`pass ${pass}/${pass + failN}`);
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  process.exit(failN ? 1 : 0);
})();

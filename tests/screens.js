// Screenshots of meta screens with seeded progress. usage: NODE_PATH=$(npm root -g) node tests/screens.js <outdir> [locale]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2], locale = process.argv[3] || 'ko-KR';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(url);
  await page.waitForTimeout(300);
  // seed progress: solve first 14 levels + some dailies by replaying stored solutions in the sim
  await page.evaluate(() => {
    const Sim = window.InkSim, St = window.Store, flat = window.InkUI.FLAT;
    for (let g = 0; g < 14; g++) {
      const def = flat[g].def, L = Sim.parse(def), r = Sim.run(L, def.sol);
      St.d.levels[def.id] = { board: St.encodeBoard(r.state.col), seeds: Array.from(r.state.sd), seal: g % 4 !== 2, tries: 1 + (g % 3), hints: g % 4 === 2 ? 1 : 0, at: Date.now() };
    }
    const today = new Date();
    for (let k = 0; k < 6; k++) {
      if (k === 3) continue;
      const key = St.dayKey(St.addDays(today, -k)), def = window.InkDaily.get(key), L = Sim.parse(def), r = Sim.run(L, def.sol);
      St.d.daily[key] = { board: St.encodeBoard(r.state.col), seeds: Array.from(r.state.sd), tries: 2, hints: 0, at: Date.now() };
    }
    St.save();
  });
  await page.goto(url);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + '/home.png' });
  await page.click('#home-book'); await page.waitForTimeout(700);
  await page.screenshot({ path: out + '/book.png' });
  await page.click('#book-back'); await page.waitForTimeout(300);
  await page.click('#home-diary'); await page.waitForTimeout(700);
  await page.screenshot({ path: out + '/diary.png' });
  await page.click('#diary-back'); await page.waitForTimeout(300);
  await page.click('#home-settings'); await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/settings.png' });
  await browser.close();
})();

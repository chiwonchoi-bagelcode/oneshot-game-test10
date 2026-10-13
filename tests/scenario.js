// Scripted scenarios with screenshots. usage: NODE_PATH=$(npm root -g) node tests/scenario.js <level> '<json drops [[x,y,beat],...]>' <out-prefix> [waitMs]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const n = +process.argv[2], drops = JSON.parse(process.argv[3]), out = process.argv[4], wait = +(process.argv[5] || 2500);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: process.env.LOCALE || 'ko-KR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?level=' + n);
  await page.waitForTimeout(300);
  for (const [x, y, t] of drops) {
    await page.waitForFunction(t => window.Play.mode === 'ready' || (window.Play.S.t >= t), t, { polling: 10 });
    const pos = await page.evaluate(([x, y]) => { const b = window.Play.board, r = b.cv.getBoundingClientRect(); return { x: r.left + b.ox + (x + 0.5) * b.s, y: r.top + b.oy + (y + 0.5) * b.s }; }, [x, y]);
    await page.mouse.click(pos.x, pos.y);
  }
  await page.waitForTimeout(wait);
  await page.screenshot({ path: out + '.png' });
  console.log(await page.evaluate(() => JSON.stringify({ mode: window.Play.mode, t: window.Play.S.t, m1: document.getElementById('pl-m1').textContent, m2: document.getElementById('pl-m2').textContent })));
  await browser.close();
})();

// usage: NODE_PATH=$(npm root -g) node tests/smoke.js [query] [out.png]
const { chromium } = require('playwright');
(async () => {
  const url = 'file://' + process.cwd() + '/index.html';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto(url + (process.argv[2] || ''));
  await page.waitForTimeout(900);
  await page.screenshot({ path: process.argv[3] || '/tmp/claude-0/shot1.png' });
  console.log(errors.join('\n') || 'no errors');
  await browser.close();
})();

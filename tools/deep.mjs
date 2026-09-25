// Longer play session for one game: node tools/deep.mjs <slug> <seconds> [keys...]
// Randomly clicks and presses the given keys, then reports errors and takes screenshots.
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const root = new URL('..', import.meta.url).pathname;
const [g, secs = '20', ...keys] = process.argv.slice(2);
const srv = await serve(root, 8124);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const vp = process.env.MOB ? { width: 390, height: 780 } : { width: 1280, height: 720 };
const page = await (await browser.newContext({ viewport: vp, hasTouch: !!process.env.MOB })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' ' + e.stack));
await page.goto(`http://localhost:8124/games/${g}/index.html`);
await page.waitForSelector('[data-play]');
if (process.env.PRE) await page.evaluate(process.env.PRE);
await page.click('[data-play]');
const end = Date.now() + secs * 1000;
let shot = 0;
while (Date.now() < end) {
  if (keys.length && Math.random() < 0.6) await page.keyboard.press(keys[Math.floor(Math.random() * keys.length)]);
  else { await page.mouse.click(30 + Math.random() * (vp.width - 60), 90 + Math.random() * (vp.height - 180)); }
  if (process.env.CLICKALL) { for (const sel of process.env.CLICKALL.split(',')) { const el = await page.$(sel); if (el && Math.random() < 0.3) await el.click().catch(() => {}); } }
  await page.waitForTimeout(120);
  if (Date.now() > end - secs * 1000 + (shot + 1) * (secs * 1000 / 3)) { shot++; await page.screenshot({ path: `${root}tools/shots/${g}-deep${shot}.png` }); }
}
await page.screenshot({ path: `${root}tools/shots/${g}-deepEnd.png` });
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 10).join('\n') : 'no errors');
await browser.close(); srv.close();

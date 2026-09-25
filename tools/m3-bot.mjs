// Plays Fruit Orchard with hint moves to exercise cascades/specials.
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const root = new URL('..', import.meta.url).pathname;
const srv = await serve(root, 8128);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message + e.stack));
await page.goto('http://localhost:8128/games/fruit-orchard/index.html');
await page.waitForSelector('[data-play]'); await page.click('[data-play]');
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(async () => { const d = Kit.debug; for (let k = 0; k < 50 && d.state().busy; k++) await new Promise((r) => setTimeout(r, 100)); const h = d.hint(); if (h && d.state().playing) d.swap(h[0], h[1]); return d.state(); });
  if (!st.playing) { console.log('level ended', JSON.stringify(st)); await page.evaluate(() => { const b = [...document.querySelectorAll('.kit-layer .kit-btn')].find((x) => !x.classList.contains('ad')); b && b.click(); }); await page.waitForTimeout(3000); }
  await page.waitForTimeout(400);
}
await page.screenshot({ path: root + 'tools/shots/m3.png' });
console.log(errs.length ? errs.slice(0, 3) : 'no errors');
await browser.close(); srv.close();

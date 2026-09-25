// Smoke test: loads each game in Chromium, starts a run, plays with random input,
// fails on any console error / page error. Saves screenshots to tools/shots/.
// usage: node tools/test.mjs [slug ...]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { serve } from './serve.mjs';
const root = new URL('..', import.meta.url).pathname;
const games = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(root + 'games');
const srv = await serve(root);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
fs.mkdirSync(root + 'tools/shots', { recursive: true });
let failed = 0;
for (const g of games) {
  for (const vp of [{ w: 1280, h: 720, n: 'desk' }, { w: 390, h: 780, n: 'mob', touch: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.touch, isMobile: !!vp.touch });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver Message')) errs.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + e.stack));
    const t0 = Date.now();
    await page.goto(`http://localhost:8123/games/${g}/index.html`);
    await page.waitForFunction(() => document.querySelector('[data-play]'), null, { timeout: 10000 }).catch(() => errs.push('no [data-play] button'));
    const loadMs = Date.now() - t0;
    await page.screenshot({ path: `${root}tools/shots/${g}-${vp.n}-menu.png` });
    await page.click('[data-play]').catch((e) => errs.push('click play: ' + e.message));
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW'];
    for (let i = 0; i < 60; i++) {
      const r = Math.random();
      if (r < 0.4) await page.keyboard.press(keys[Math.floor(Math.random() * keys.length)]).catch(() => {});
      else if (r < 0.8) { const x = 40 + Math.random() * (vp.w - 80), y = 120 + Math.random() * (vp.h - 200); await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); }
      else await page.waitForTimeout(150);
      if (i === 30) await page.screenshot({ path: `${root}tools/shots/${g}-${vp.n}-play.png` });
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${root}tools/shots/${g}-${vp.n}-end.png` });
    const scroll = await page.evaluate(() => [document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight > innerHeight]);
    if (scroll[0] || scroll[1]) errs.push('scrollbars: ' + scroll);
    console.log(`${errs.length ? 'FAIL' : 'ok  '} ${g} [${vp.n}] load ${loadMs}ms`);
    errs.slice(0, 8).forEach((e) => console.log('   ' + e));
    if (errs.length) failed++;
    await ctx.close();
  }
}
await browser.close(); srv.close();
process.exit(failed ? 1 : 0);

// Captures store covers (16:9 1280x720 and square 720x720) from real gameplay, with a big title overlay.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { serve } from './serve.mjs';
const root = new URL('..', import.meta.url).pathname;
const CFG = {
  'bakery-empire': { t: 'Bakery Empire', keys: ['Space'], secs: 6, col: '#ff48b0', sh: '#0078bf' },
  'azulejo-2048': { t: 'Azulejo 2048', keys: ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown'], secs: 8, col: '#1f4fa3', sh: '#f4f1e8' },
  'noodle-arena': { t: 'Noodle Arena', keys: [], secs: 6, col: '#f25f5c', sh: '#2b2d42' },
  'crayon-lands': { t: 'Crayon Lands', keys: ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'], secs: 7, col: '#e63946', sh: '#2b2b2b' },
  'garden-siege': { t: 'Garden Siege', keys: ['Digit1', 'Digit2', 'Space'], secs: 16, col: '#f6ecd6', sh: '#3b2b24', clicks: true },
  'ink-swing': { t: 'Ink Swing', keys: ['Space'], secs: 3, col: '#ff6a2b', sh: '#1c1a17' },
  'neon-descent': { t: 'Neon Descent', keys: ['ArrowLeft', 'ArrowRight'], secs: 5, col: '#ffffff', sh: '#ff3bd4' },
  'rooftop-rush': { t: 'Rooftop Rush', keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp'], secs: 4, col: '#ffd23f', sh: '#1d3557' },
  'hop-street': { t: 'Hop Street', keys: ['ArrowUp'], secs: 3, col: '#ffffff', sh: '#2d3436' },
  'lantern-night': { t: 'Lantern Night', keys: ['KeyW', 'KeyD'], secs: 4, pre: 'Kit.debug.busy()', col: '#ffb347', sh: '#000000', clickSel: '.up' },
};
const extra = JSON.parse(fs.readFileSync(new URL('./new-titles.json', import.meta.url)));
const SPECIAL = {
  'jelly-blocks': { pre: 'Kit.debug.fill()', secs: 1, clicks: false, drags: false, keys: [] },
  'fruit-slash': { pre: 'Kit.debug.burst()', secs: 0.4, clicks: false, drags: false, keys: [] },
  'planet-merge': { pre: 'Kit.debug.fill()', secs: 2.5, clicks: false, drags: false, keys: [] },
  'candy-rope': { secs: 0.8, clicks: false, drags: false, keys: [] },
  'arrow-hero': { secs: 1.2, clicks: false, drags: false, keys: [] },
  'stack-tower': { pre: "(async()=>{for(let n=0;n<14;){const d=Kit.debug();if(d.cur){const off=d.dir==='x'?d.cur.x-d.top.x:d.cur.z-d.top.z;if(Math.abs(off)<0.25){d.drop();n++;}}await new Promise(r=>setTimeout(r,16));}})()", secs: 1, clicks: false, drags: false, keys: [] },
  'color-gate': { secs: 1.2, keys: ['Space'], clicks: false, drags: false },
};
for (const [slug, t] of Object.entries(extra)) if (!CFG[slug]) CFG[slug] = Object.assign({ t, keys: ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp'], secs: 5, col: '#ffffff', sh: '#1d1d1d', clicks: true, drags: true }, SPECIAL[slug] || {});
const only = process.argv.slice(2);
const srv = await serve(root, 8127);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [g, c] of Object.entries(CFG)) {
  if (only.length && !only.includes(g)) continue;
  fs.mkdirSync(`${root}store/${g}`, { recursive: true });
  for (const vp of [{ w: 1280, h: 720, n: 'cover-1280x720' }, { w: 720, h: 720, n: 'cover-square-720' }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(`http://localhost:8127/games/${g}/index.html`);
    await page.waitForSelector('[data-play]'); await page.click('[data-play]');
    await page.evaluate(() => document.querySelectorAll('.kit-layer').forEach((l) => l.remove()));
    if (c.pre) await page.evaluate(c.pre);
    if (g === 'stack-tower') await page.waitForTimeout(9000);
    const end = Date.now() + c.secs * 1000;
    let i = 0;
    while (Date.now() < end) {
      if (c.keys.length) { const k = c.keys[i++ % c.keys.length]; await page.keyboard.down(k); await page.waitForTimeout(g === 'ink-swing' ? 500 : 120); await page.keyboard.up(k); }
      if (c.clicks) await page.mouse.click(100 + Math.random() * (vp.w - 200), 150 + Math.random() * (vp.h - 300));
      if (c.drags) { await page.mouse.move(vp.w / 2 + (Math.random() - 0.5) * 200, vp.h * 0.75); await page.mouse.down(); await page.mouse.move(vp.w / 2 + (Math.random() - 0.5) * 300, vp.h * 0.35, { steps: 5 }); await page.mouse.up(); }
      await page.evaluate(() => document.querySelectorAll('.kit-layer').forEach((l) => l.remove()));
      if (c.clickSel) { const el = await page.$(c.clickSel); if (el) await el.click().catch(() => {}); }
      if (g === 'noodle-arena') await page.mouse.move(vp.w / 2 + Math.cos(i / 5) * 200, vp.h / 2 + Math.sin(i++ / 5) * 200);
      await page.waitForTimeout(150);
    }
    await page.evaluate(({ t, col, sh }) => {
      document.querySelectorAll('.kit-ui > *').forEach((e) => (e.style.visibility = 'hidden'));
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:0;right:0;bottom:6%;text-align:center;z-index:999;font:900 ${innerWidth > innerHeight ? 96 : 80}px/1 ${getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif'};color:${col};-webkit-text-stroke:3px ${sh};text-shadow:0 7px 0 ${sh},0 0 30px rgba(0,0,0,.35);letter-spacing:-1px`;
      d.textContent = t; document.body.appendChild(d);
    }, c);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${root}store/${g}/${vp.n}.png` });
    await page.close();
  }
  console.log('cover', g);
}
await browser.close(); srv.close();

// Auto-player that checks Ink Swing levels are beatable with a simple hold/release policy.
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const root = new URL('..', import.meta.url).pathname;
const srv = await serve(root, 8125);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
const lvls = process.argv.slice(2).map(Number);
for (const lv of lvls) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8125/games/ink-swing/index.html');
  await page.waitForSelector('[data-play]'); await page.click('[data-play]');
  const res = await page.evaluate(async (lv) => {
    // run the policy inside the page for speed
    const K = window.Kit; document.querySelectorAll('.kit-layer').forEach((l) => l.remove());
    K.debug().start(lv);
    const ev = (t) => window.dispatchEvent(new KeyboardEvent(t, { code: 'Space' }));
    // start level via level select is internal; emulate by pressing R after setting? use startLevel through retry key
    return new Promise((resolve) => {
      let holding = false, t = 0;
      const iv = setInterval(() => {
        const d = K.debug(); t++;
        if (d.won || d.dead || t > 4000) { clearInterval(iv); if (holding) ev('keyup'); resolve({ won: d.won, dead: d.dead, x: Math.round(d.P.x), fin: d.L.finish }); return; }
        const P = d.P;
        if (!holding) {
          const peg = d.L.pegs.find((p) => p.x > P.x + 40 && p.x < P.x + 380 && p.y < P.y + 60);
          if (peg && (P.vy > -100 || P.y > 560)) { ev('keydown'); holding = true; }
        } else if (d.hookPeg) {
          const a = Math.atan2(P.y - d.hookPeg.y, P.x - d.hookPeg.x);
          if (P.x > d.hookPeg.x + 20 && P.vy < 0 && a < 1.0) { ev('keyup'); holding = false; }
        } else { ev('keyup'); holding = false; }
      }, 16);
    });
  }, lv);
  console.log('level', lv, JSON.stringify(res));
  await page.close();
}
console.log(errs.length ? errs : 'no errors');
await browser.close(); srv.close();

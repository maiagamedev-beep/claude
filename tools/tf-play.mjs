// Plays Tasty Factory through real clicks (tap line, buy, hire, build, claim goals, open panels).
// node tools/tf-play.mjs [viewport] [simulated minutes]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const [vp = '1280x720', mins = '20'] = process.argv.slice(2);
const [W, H] = vp.split('x').map(Number);
const srv = await serve(new URL('../games/tasty-factory/', import.meta.url).pathname, 8132);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: H > W, isMobile: H > W });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await p.goto('http://localhost:8132/index.html');
await p.waitForSelector('#btnPlay:not(.hidden)', { timeout: 30000 });
await p.click('#btnPlay');
await p.waitForTimeout(500);
const state = () => p.evaluate(() => { const S = TF.S(), M = TF.M(); return { cash: S.cash, lv: S.lines.map((l) => l.lvl), mgr: S.lines.map((l) => +l.mgr), goal: M.goal, tut: M.tut, taps: M.taps, ups: Object.keys(S.ups).length, stars: S.stars }; });
const machineXY = (i) => p.evaluate((i) => { const w = TF.world; const q = w.project(0.5, 0.8, w.lineZ(i)); return [q.x, q.y]; }, i);
const log = (...a) => console.log(...a);
// 1) tap the cookie machine a few times
for (let k = 0; k < 6; k++) { const [x, y] = await machineXY(0); await p.mouse.click(x, y); await p.evaluate(() => TF.advance(1.2)); }
log('after taps', JSON.stringify(await state()));
await p.screenshot({ path: `tools/shots/play-${vp}-a.png` });
// 2) main loop: click visible enabled buttons like a player would
const t0 = Date.now();
for (let minute = 0; minute < +mins; minute++) {
  for (let sec = 0; sec < 60; sec += 5) {
    await p.evaluate(() => TF.advance(5));
    // tap idle manual lines
    const idle = await p.evaluate(() => TF.S().lines.map((l, i) => (l.lvl > 0 && !l.mgr && !l.run ? i : -1)).filter((i) => i >= 0));
    for (const i of idle.slice(0, 2)) { await p.evaluate((i) => { const w = TF.world; w.targetZ = Math.max(0, w.lineZ(i) - 2); w.camZ = w.targetZ; }, i); await p.evaluate(() => TF.advance(0.05)); const [x, y] = await machineXY(i); if (y > 60 && y < H - 90) await p.mouse.click(x, y); }
    // claim goal
    const g = await p.$('#goalClaim'); if (g) await g.click().catch(() => {});
    // click affordable card buttons (build/upgrade/hire)
    const btns = await p.$$('.card:not([style*="hidden"]) .btn:not(.off)');
    for (const b of btns.slice(0, 6)) { if (await b.isVisible()) await b.click({ timeout: 500 }).catch(() => {}); }
  }
  // every 3 minutes: open upgrades, buy what's affordable, close
  if (minute % 3 === 2) {
    await p.click('.tab[data-tab="up"]'); await p.waitForTimeout(350);
    for (let k = 0; k < 5; k++) { const b = await p.$('#shBody .btn:not(.off)[data-act^="up:"]'); if (!b) break; await b.click().catch(() => {}); await p.waitForTimeout(80); }
    await p.click('#shClose'); await p.waitForTimeout(350);
  }
  const s = await state();
  log(`min ${minute + 1}: cash ${s.cash.toExponential(2)} lv ${s.lv.join(',')} mgr ${s.mgr.join('')} goal ${s.goal} tut ${s.tut} ups ${s.ups}`);
}
await p.screenshot({ path: `tools/shots/play-${vp}-b.png` });
for (const tab of ['mgr', 'up', 'boost', 'star']) { await p.click(`.tab[data-tab="${tab}"]`); await p.waitForTimeout(400); await p.screenshot({ path: `tools/shots/play-${vp}-tab-${tab}.png` }); await p.click('#shClose'); await p.waitForTimeout(300); }
log('errors:', errs.length ? errs.slice(0, 10) : 'none', 'real s', ((Date.now() - t0) / 1000).toFixed(0));
await browser.close(); srv.close();

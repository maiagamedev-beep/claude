// Checks the meta flows of Tasty Factory: prestige, rewarded boosts, offline earnings, reset.
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve(new URL('../games/tasty-factory/', import.meta.url).pathname, 8134);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text() + ' @ ' + (m.location().url || '')); });
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
ctx.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
const ok = (c, msg) => console.log((c ? 'PASS ' : 'FAIL ') + msg);
const boot = async () => { await p.goto('http://localhost:8134/index.html'); await p.waitForSelector('#btnPlay:not(.hidden)', { timeout: 30000 }); await p.click('#btnPlay'); await p.waitForTimeout(400); };
await boot();
// prestige
await p.evaluate(() => { const S = TF.S(); S.lines.forEach((l, i) => { l.lvl = 30 + i; l.mgr = true; }); S.lifetime = 4e13; S.earned = 4e13; S.cash = 1e12; });
await p.click('.tab[data-tab="star"]'); await p.waitForTimeout(500);
const pend = await p.evaluate(() => document.querySelector('.sellbox .claim').textContent);
await p.click('[data-act="sell"]'); await p.waitForTimeout(800);
let s = await p.evaluate(() => { const S = TF.S(); return { resets: S.resets, stars: S.stars, lv: S.lines.map((l) => l.lvl).join(','), cash: S.cash, mgr: S.lines.some((l) => l.mgr) }; });
ok(s.resets === 1 && s.stars === 100 && s.lv === '1,0,0,0,0,0,0,0,0,0' && !s.mgr, `prestige (${pend}) -> ${JSON.stringify(s)}`);
// stars bonus applies
const mulv = await p.evaluate(() => { const S = TF.S(); return S.stars - S.starsSpent; });
ok(mulv === 100, 'stars kept after sale');
// perk purchase
await p.click('.tab[data-tab="star"]'); await p.waitForTimeout(400);
await p.click('[data-act="perk:offline"]'); await p.waitForTimeout(300);
s = await p.evaluate(() => ({ spent: TF.S().starsSpent, perk: TF.S().perks.offline }));
ok(s.spent === 5 && s.perk === 1, 'perk bought ' + JSON.stringify(s));
await p.click('#shClose'); await p.waitForTimeout(300);
// rush boost via rewarded ad (local stand-in: 2 s)
await p.click('.tab[data-tab="boost"]'); await p.waitForTimeout(400);
await p.click('[data-act="rush"]'); await p.waitForTimeout(3000);
s = await p.evaluate(() => (TF.S().rushUntil - Date.now()) / 60000);
ok(s > 9.5 && s <= 10.1, `rush active for ${s.toFixed(1)} min`);
// time warp
const c0 = await p.evaluate(() => TF.S().cash);
await p.click('[data-act="warp"]'); await p.waitForTimeout(3000);
const c1 = await p.evaluate(() => TF.S().cash);
ok(c1 > c0, `time warp paid ${c0} -> ${c1}`);
await p.click('#shClose'); await p.waitForTimeout(300);
// offline earnings on reload
await p.evaluate(() => { const S = TF.S(); S.lines[0].lvl = 50; S.lines[0].mgr = true; TF.save(); });
// leave the game (it saves on pagehide), then pretend 3 hours passed
await p.goto('http://localhost:8134/assets/CREDITS.txt');
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('tasty_factory_v1')); raw.s.t = Date.now() - 3 * 3600e3; localStorage.setItem('tasty_factory_v1', JSON.stringify(raw)); });
errs.length = 0; // the plain-text page asks for a favicon; not part of the game
await boot();
const modal = await p.$('.modal');
ok(!!modal, 'welcome back modal shown');
if (modal) {
  const before = await p.evaluate(() => TF.S().cash);
  await p.click('#offX2'); await p.waitForTimeout(3000);
  const after = await p.evaluate(() => TF.S().cash);
  ok(after > before, `offline x2 collected ${before.toFixed(0)} -> ${after.toFixed(0)}`);
  await p.screenshot({ path: 'tools/shots/flow-offline.png' });
}
// reset from settings (double tap)
await p.click('#btnSet'); await p.waitForTimeout(400);
await p.click('[data-act="reset"]'); await p.waitForTimeout(200);
await p.click('[data-act="reset"]'); await p.waitForTimeout(500);
s = await p.evaluate(() => ({ resets: TF.S().resets, lv: TF.S().lines[0].lvl, stars: TF.S().stars }));
ok(s.resets === 0 && s.lv === 1 && s.stars === 0, 'reset ' + JSON.stringify(s));
ok(errs.length === 0, 'no console errors ' + errs.slice(0, 5).join(' | '));
await browser.close(); srv.close();

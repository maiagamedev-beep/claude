// Screenshot helper for Tasty Factory.
// node tools/tf-shot.mjs <page.html> <out-prefix> [wait ms] [js to eval before shot] [sizes e.g. 1280x720,390x780]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const [page = 'index.html', out = 'tools/shots/tf', wait = '4000', js = '', sizes = '1280x720,390x780'] = process.argv.slice(2);
const srv = await serve(new URL('../games/tasty-factory/', import.meta.url).pathname, 8131);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
for (const sz of sizes.split(',')) {
  const [w, h] = sz.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: h > w, isMobile: h > w, locale: process.env.LOCALE || 'en-US' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.goto(`http://localhost:8131/${page}`);
  await p.waitForTimeout(+wait);
  if (js) { try { console.log('eval:', await p.evaluate(js)); } catch (e) { console.log('eval error', e.message); } await p.waitForTimeout(1500); }
  await p.screenshot({ path: `${out}-${sz}.png` });
  const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
  console.log(sz, 'fps~', fps, errs.filter((e) => !/GPU stall|Automatic fallback|WebGL|GL_|swiftshader/i.test(e)).slice(0, 10).join('\n'));
  await ctx.close();
}
await browser.close(); srv.close();

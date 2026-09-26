// Store covers for Tasty Factory: a busy mid-game factory with the logo.
// node tools/tf-cover.mjs
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve(new URL('../games/tasty-factory/', import.meta.url).pathname, 8133);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h, name] of [[1280, 720, 'cover-1280x720'], [720, 720, 'cover-square-720']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8133/index.html');
  await p.waitForSelector('#btnPlay:not(.hidden)', { timeout: 30000 });
  await p.evaluate(() => {
    document.getElementById('btnPlay').click();
    const S = TF.S();
    [320, 210, 160, 110, 80, 55, 30, 12, 0, 0].forEach((l, i) => { S.lines[i].lvl = l; S.lines[i].mgr = l > 0; });
    S.lines.forEach((st, i) => TF.world.setLine(i, st.lvl, st.mgr));
    TF.M().tut = 9;
    TF.advance(12);
  });
  await p.evaluate(({ w, h }) => {
    const hide = ['labels', 'floats', 'hud', 'goal', 'tr', 'bottom', 'buymode', 'toasts'];
    hide.forEach((id) => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
    const t = document.getElementById('title');
    t.classList.remove('hidden');
    t.style.background = w > h ? 'linear-gradient(90deg, rgba(255,246,232,.92) 0%, rgba(255,246,232,.55) 34%, rgba(255,246,232,0) 55%)' : 'linear-gradient(180deg, rgba(255,246,232,.9) 0%, rgba(255,246,232,.35) 38%, rgba(255,246,232,0) 55%)';
    t.style.justifyContent = w > h ? 'center' : 'flex-start';
    t.style.alignItems = w > h ? 'flex-start' : 'center';
    t.style.padding = w > h ? '0 0 40px 70px' : '50px 0 0';
    ['load', 'loadT', 'btnPlay', 'howto'].forEach((id) => document.getElementById(id).classList.add('hidden'));
    t.querySelector('.logo').style.fontSize = w > h ? '120px' : '104px';
    const W = TF.world; W.targetZ = w > h ? 2.2 : 1.2; W.camZ = W.targetZ;
  }, { w, h });
  await p.evaluate(() => TF.advance(0.2));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `store/tasty-factory/${name}-2x.png` });
  await ctx.close();
}
await browser.close(); srv.close();

/* Bakery Empire — idle clicker. Risograph print look: 3 inks, misregistration, grain. */
(function () {
  const K = window.Kit;
  const INK = { pink: '#ff48b0', blue: '#0078bf', yellow: '#ffd800', paper: '#f5eedc', dark: '#2b2340' };
  K.fontFamily = 'Georgia, "Times New Roman", serif';

  const B = [
    { n: ['Apprentice', 'Aprendiz'], c: 15, p: 0.2 },
    { n: ['Brick oven', 'Forno de tijolo'], c: 100, p: 1 },
    { n: ['Stand mixer', 'Batedeira'], c: 1100, p: 8 },
    { n: ['Street stall', 'Barraquinha'], c: 12000, p: 47 },
    { n: ['Patisserie', 'Confeitaria'], c: 130000, p: 260 },
    { n: ['Windmill', 'Moinho'], c: 1.4e6, p: 1400 },
    { n: ['Wheat farm', 'Fazenda de trigo'], c: 2e7, p: 7800 },
    { n: ['Bread factory', 'Fábrica de pão'], c: 3.3e8, p: 44000 },
    { n: ['Cake castle', 'Castelo de bolo'], c: 5.1e9, p: 260000 },
    { n: ['Sugar mine', 'Mina de açúcar'], c: 7.5e10, p: 1.6e6 },
    { n: ['Dough portal', 'Portal de massa'], c: 1e12, p: 1e7 },
    { n: ['Moon oven', 'Forno lunar'], c: 1.4e13, p: 6.5e7 },
  ];
  const MILESTONES = [10, 25, 50, 100, 150, 200, 300];

  K.boot('bakery_empire', { g: { owned: B.map(() => 0), tapLvl: 0, total: 0, runTotal: 0, stars: 0, last: 0, boostUntil: 0, frenzyUntil: 0, taps: 0 } }, main);
  function main() {
  const G = K.save.data.g;
  if (G.owned.length < B.length) while (G.owned.length < B.length) G.owned.push(0);

  /* ---------- economy ---------- */
  const starMult = () => 1 + G.stars * 0.1;
  const bMult = (i) => { let m = 1; for (const ms of MILESTONES) if (G.owned[i] >= ms) m *= 2; return m; };
  const boostMult = () => (Date.now() < G.boostUntil ? 2 : 1) * (Date.now() < G.frenzyUntil ? 7 : 1);
  const cpsBase = () => B.reduce((s, b, i) => s + b.p * G.owned[i] * bMult(i), 0) * starMult();
  const cps = () => cpsBase() * boostMult();
  const tapPower = () => Math.max(1, (1 + G.tapLvl) * Math.pow(1.6, Math.floor(G.tapLvl / 5)) + cpsBase() * 0.04 * Math.min(1, G.tapLvl / 10)) * starMult() * boostMult();
  const tapCost = () => Math.round(50 * Math.pow(1.55, G.tapLvl));
  const cost = (i, n) => { let c = 0; for (let k = 0; k < (n || 1); k++) c += B[i].c * Math.pow(1.15, G.owned[i] + k); return Math.ceil(c); };
  const starsAvail = () => Math.floor(Math.sqrt(G.runTotal / 1e6)) - 0;
  const earn = (v) => { K.meta.s.coins += v; G.total += v; G.runTotal += v; K.meta.track('_coins', v); };

  /* ---------- canvas / scene ---------- */
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, wide = true, loaf = { x: 0, y: 0, r: 100, sq: 0, rot: 0 };

  // pre-render riso halftone background
  let bgPat = null;
  function makeBg() {
    const c = document.createElement('canvas'); c.width = c.height = 40;
    const g = c.getContext('2d');
    g.fillStyle = INK.paper; g.fillRect(0, 0, 40, 40);
    g.fillStyle = 'rgba(255,72,176,.18)';
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.beginPath(); g.arc(10 + x * 20 + (y % 2) * 10, 10 + y * 20, 2.2, 0, 7); g.fill(); }
    bgPat = ctx.createPattern(c, 'repeat');
  }
  makeBg();

  function riso(fn, off) {
    // draw shape twice: offset blue plate then main plate (misregistration)
    ctx.save(); ctx.translate(off || 3, (off || 3) * 0.6); ctx.globalAlpha = 0.85; fn(INK.blue, true); ctx.restore();
    fn(null, false);
  }

  function drawLoaf(x, y, r) {
    const sx = 1 + loaf.sq * 0.18, sy = 1 - loaf.sq * 0.14;
    ctx.save(); ctx.translate(x, y); ctx.rotate(loaf.rot); ctx.scale(sx, sy);
    // plate
    ctx.fillStyle = 'rgba(0,120,191,.18)'; ctx.beginPath(); ctx.ellipse(0, r * 0.75, r * 1.25, r * 0.28, 0, 0, 7); ctx.fill();
    riso((over) => {
      ctx.fillStyle = over || INK.yellow;
      K.draw.wobbleCircle(ctx, 0, 0, r, 1.3, 0.05); ctx.fill();
      if (!over) {
        ctx.save(); ctx.clip();
        ctx.fillStyle = INK.pink; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.35, r * 1.05, r * 0.7, -0.2, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        // halftone highlight
        ctx.fillStyle = INK.yellow;
        for (let yy = -r; yy < 0; yy += 9) for (let xx = -r; xx < r * 0.2; xx += 9) {
          const d = Math.hypot(xx + r * 0.45, yy + r * 0.55) / r;
          const s = Math.max(0, 0.45 - d) * 9; if (s > 0.2) { ctx.beginPath(); ctx.arc(xx, yy, s, 0, 7); ctx.fill(); }
        }
        ctx.restore();
      }
    }, 5);
    // scoring cuts
    ctx.strokeStyle = INK.dark; ctx.lineWidth = Math.max(3, r * 0.05); ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.5 + i * r * 0.35, -r * 0.55); ctx.quadraticCurveTo(i * r * 0.35, -r * 0.2, r * 0.3 + i * r * 0.35, -r * 0.5); ctx.stroke(); }
    ctx.lineWidth = Math.max(3, r * 0.04); ctx.strokeStyle = INK.dark;
    K.draw.wobbleCircle(ctx, 0, 0, r, 1.3, 0.05); ctx.stroke();
    // sesame
    ctx.fillStyle = INK.paper;
    for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r * (0.25 + (i % 3) * 0.18); ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d * 0.7 + r * 0.15); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.05, r * 0.025, 0, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }

  /* building icons, drawn once into data URLs */
  function iconFor(i, size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); const s = size / 48;
    g.scale(s, s); g.lineWidth = 2.5; g.lineJoin = 'round'; g.lineCap = 'round';
    const plate = (col, f) => { g.save(); g.translate(2, 1.5); g.globalAlpha = 0.8; g.fillStyle = INK.blue; f(); g.fill(); g.restore(); g.fillStyle = col; f(); g.fill(); g.strokeStyle = INK.dark; g.stroke(); };
    const R = (x, y, w, h) => () => { g.beginPath(); g.rect(x, y, w, h); };
    const C = (x, y, r) => () => { g.beginPath(); g.arc(x, y, r, 0, 7); };
    switch (i) {
      case 0: plate(INK.paper, C(24, 18, 9)); plate(INK.pink, R(13, 27, 22, 16)); g.fillStyle = INK.paper; g.fillRect(16, 5, 16, 6); g.strokeRect(16, 5, 16, 6); break; // chef
      case 1: plate(INK.pink, () => { g.beginPath(); g.moveTo(6, 42); g.lineTo(6, 22); g.arc(24, 22, 18, Math.PI, 0); g.lineTo(42, 42); g.closePath(); }); g.fillStyle = INK.dark; g.beginPath(); g.arc(24, 30, 8, Math.PI, 0); g.fill(); g.fillStyle = INK.yellow; g.fillRect(17, 30, 14, 4); break;
      case 2: plate(INK.yellow, R(10, 36, 28, 8)); plate(INK.pink, () => { g.beginPath(); g.moveTo(12, 34); g.lineTo(12, 10); g.lineTo(36, 10); g.lineTo(36, 18); g.lineTo(20, 18); g.lineTo(20, 34); g.closePath(); }); plate(INK.paper, C(28, 30, 6)); break;
      case 3: plate(INK.paper, R(8, 22, 32, 20)); plate(INK.pink, () => { g.beginPath(); g.moveTo(4, 22); g.lineTo(10, 8); g.lineTo(38, 8); g.lineTo(44, 22); g.closePath(); }); g.fillStyle = INK.yellow; g.fillRect(14, 28, 20, 6); break;
      case 4: plate(INK.pink, R(10, 28, 28, 14)); plate(INK.paper, R(13, 17, 22, 11)); plate(INK.yellow, R(17, 9, 14, 8)); plate(INK.pink, C(24, 6, 3)); break;
      case 5: plate(INK.paper, () => { g.beginPath(); g.moveTo(14, 44); g.lineTo(18, 16); g.lineTo(30, 16); g.lineTo(34, 44); g.closePath(); }); g.strokeStyle = INK.pink; g.lineWidth = 4; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(24, 16); g.lineTo(24 + Math.cos(k * 1.57 + 0.4) * 16, 16 + Math.sin(k * 1.57 + 0.4) * 16); g.stroke(); } break;
      case 6: g.strokeStyle = INK.dark; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(12 + k * 12, 44); g.lineTo(12 + k * 12, 16); g.stroke(); plate(INK.yellow, () => { g.beginPath(); g.ellipse(12 + k * 12, 14, 4, 9, 0, 0, 7); }); } break;
      case 7: plate(INK.blue, R(6, 22, 36, 20)); plate(INK.pink, R(30, 6, 8, 18)); g.fillStyle = INK.yellow; for (let k = 0; k < 3; k++) g.fillRect(10 + k * 8, 28, 5, 6); break;
      case 8: plate(INK.pink, R(8, 20, 32, 22)); plate(INK.yellow, R(6, 12, 8, 12)); plate(INK.yellow, R(34, 12, 8, 12)); plate(INK.paper, () => { g.beginPath(); g.arc(24, 42, 6, Math.PI, 0); g.closePath(); }); break;
      case 9: plate(INK.dark, () => { g.beginPath(); g.moveTo(4, 44); g.lineTo(24, 8); g.lineTo(44, 44); g.closePath(); }); plate(INK.pink, () => { g.beginPath(); g.moveTo(18, 30); g.lineTo(24, 22); g.lineTo(30, 30); g.lineTo(24, 38); g.closePath(); }); break;
      case 10: plate(INK.pink, C(24, 24, 18)); plate(INK.yellow, C(24, 24, 11)); plate(INK.paper, C(24, 24, 5)); break;
      default: plate(INK.yellow, C(24, 24, 18)); g.fillStyle = INK.dark; g.globalAlpha = 0.4; g.beginPath(); g.arc(18, 18, 4, 0, 7); g.arc(30, 30, 5, 0, 7); g.fill(); g.globalAlpha = 1; plate(INK.pink, R(18, 34, 12, 8));
    }
    return c.toDataURL();
  }

  /* ---------- UI: HUD + shop (DOM) ---------- */
  K.meta.init({
    coinScale: () => Math.max(1, cpsBase() * 3 / 10),
    howTo: { en: 'Tap the bread to bake coins. Buy bakers and machines to earn automatically. Catch the golden croissant for frenzy. Franchise to earn stars that multiply everything.', pt: 'Toque no pão para ganhar moedas. Compre padeiros e máquinas para ganhar sozinho. Pegue o croissant dourado para o frenesi. Franqueie para ganhar estrelas que multiplicam tudo.' },
    missions: [
      { stat: 'taps', base: 150, reward: 80, text: { en: 'Tap the bread {n} times', pt: 'Toque no pão {n} vezes' } },
      { stat: 'buy', base: 15, reward: 100, text: { en: 'Buy {n} buildings', pt: 'Compre {n} construções' } },
      { stat: '_coins', base: 5000, reward: 60, text: { en: 'Bake {n} coins', pt: 'Asse {n} moedas' } },
      { stat: 'golden', base: 2, reward: 150, text: { en: 'Catch {n} golden croissants', pt: 'Pegue {n} croissants dourados' } },
      { stat: 'tapup', base: 3, reward: 90, text: { en: 'Upgrade your rolling pin {n} times', pt: 'Melhore o rolo {n} vezes' } },
      { stat: '_ads', base: 2, reward: 120, text: { en: 'Use {n} boosts or bonuses', pt: 'Use {n} turbos ou bônus' } },
    ],
  });
  // _coins missions should scale with progress
  K.meta.s.missions.forEach((m) => { if (m.stat === '_coins' && m.p === 0) m.target = Math.max(m.target, Math.round(cpsBase() * 120)); });
  K.meta.buildHud({ gems: true });
  const hudC = K.meta.hud.coins;
  const cpsPill = K.ui.hudPill('<b style="font-family:Georgia">/s</b>', 'cps');
  K.ui.top.insertBefore(cpsPill.el, K.ui.top.children[2]);
  cpsPill.el.classList.add('kit-hide-narrow');

  const shop = K.el('div', 'shop');
  document.querySelector('.kit-ui').appendChild(shop);
  const boostBar = K.el('div', 'boostbar');
  document.querySelector('.kit-ui').appendChild(boostBar);
  const icons = B.map((b, i) => iconFor(i, 96));
  let buyN = 1;

  function layoutShop() {
    shop.className = 'shop ' + (wide ? 'side' : 'bottom');
    boostBar.className = 'boostbar ' + (wide ? 'side' : 'bottom');
  }
  layoutShop();
  K.fit(cv, (w, h, d) => {
    W = w; H = h; DPR = d; wide = w > h * 1.05;
    loaf.x = wide ? w * 0.33 : w / 2;
    loaf.y = wide ? h * 0.52 : h * 0.3;
    loaf.r = Math.min(wide ? w * 0.18 : w * 0.3, h * (wide ? 0.25 : 0.16));
    layoutShop();
  });

  function buildShop() {
    shop.innerHTML = '';
    const head = K.el('div', 'shead');
    const tabs = K.el('div', 'buyn');
    [1, 10, 'max'].forEach((n) => {
      const b = K.el('button', 'bn' + (buyN === n ? ' on' : ''), 'x' + n);
      if (n === 'max') b.textContent = K.t('max');
      b.onclick = () => { buyN = n; K.audio.play('click'); buildShop(); };
      tabs.appendChild(b);
    });
    head.appendChild(K.el('b', '', K.t(['Bakery', 'Padaria'])));
    head.appendChild(tabs);
    shop.appendChild(head);
    const list = K.el('div', 'slist');
    // rolling pin (tap upgrade)
    const tr = K.el('div', 'item tap');
    tr.innerHTML = `<div class="ico pin"></div><div class="info"><b>${K.t(['Rolling pin', 'Rolo de massa'])} ${G.tapLvl + 1}</b><small>${K.t(['per tap', 'por toque'])}: <span class="tp"></span></small></div><div class="price"></div>`;
    tr.onclick = () => {
      if (!K.meta.spend(tapCost())) return;
      G.tapLvl++; K.meta.track('tapup', 1); K.save.mark(); pulse(tr); buildShop();
    };
    list.appendChild(tr);
    B.forEach((b, i) => {
      const visible = i === 0 || G.owned[i - 1] > 0 || G.owned[i] > 0;
      if (!visible) { if (i === 0 || G.owned[i - 2] > 0 || i === 1) { const lk = K.el('div', 'item locked', `<div class="ico">?</div><div class="info"><b>???</b><small>${K.t('locked')}</small></div><div class="price">${K.fmt(b.c)}</div>`); list.appendChild(lk); } return; }
      const it = K.el('div', 'item');
      it.dataset.i = i;
      const next = MILESTONES.find((m) => m > G.owned[i]);
      it.innerHTML = `<div class="ico"><img src="${icons[i]}" alt=""></div><div class="info"><b>${K.t(b.n)}</b><small>${K.fmt(b.p * bMult(i) * starMult())}/s ${next ? '· x2 @' + next : ''}</small></div><div class="own">${G.owned[i]}</div><div class="price"></div>`;
      it.onclick = () => buy(i, it);
      list.appendChild(it);
    });
    shop.appendChild(list);
    // prestige
    const pr = K.el('div', 'item prest');
    pr.innerHTML = `<div class="ico">★</div><div class="info"><b>${K.t(['Franchise', 'Franquia'])}</b><small class="ps"></small></div>`;
    pr.onclick = openPrestige;
    list.appendChild(pr);
    refreshShop();
  }
  function maxBuy(i) { let n = 0, c = 0; while (n < 500) { const nc = B[i].c * Math.pow(1.15, G.owned[i] + n); if (c + nc > K.meta.s.coins) break; c += nc; n++; } return Math.max(1, n); }
  function buy(i, elx) {
    const n = buyN === 'max' ? maxBuy(i) : buyN;
    const c = cost(i, n);
    if (!K.meta.spend(c)) return;
    const before = bMult(i);
    G.owned[i] += n; K.meta.track('buy', n); K.meta.addXp(3 * n + i * 2); K.save.mark();
    pulse(elx);
    const r = elx.getBoundingClientRect();
    for (let k = 0; k < 6; k++) K.fx.burst(r.left + 30, r.top + r.height / 2, { n: 3, colors: [INK.pink, INK.yellow, INK.blue], speed: 250, g: 400, shape: 'square', size: 5 });
    if (bMult(i) > before) { K.audio.play('levelup'); K.ui.toast(K.t(B[i].n) + ' x2!'); K.fx.shake(6); }
    if (G.owned[i] === n && i > 0) { K.audio.play('power'); K.game.happy(); }
    buildShop();
  }
  function pulse(e) { e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); }
  function refreshShop() {
    const coins = K.meta.s.coins;
    shop.querySelectorAll('.item[data-i]').forEach((it) => {
      const i = +it.dataset.i, n = buyN === 'max' ? maxBuy(i) : buyN, c = cost(i, n);
      it.querySelector('.price').innerHTML = (n > 1 ? `<small>x${n}</small> ` : '') + K.fmt(c);
      it.classList.toggle('cant', c > coins);
    });
    const tp = shop.querySelector('.tap');
    if (tp) { tp.querySelector('.tp').textContent = K.fmt(tapPower()); tp.querySelector('.price').textContent = K.fmt(tapCost()); tp.classList.toggle('cant', tapCost() > coins); }
    const ps = shop.querySelector('.ps');
    if (ps) ps.textContent = `★ ${G.stars} (+${G.stars * 10}%) · ${K.t(['next', 'próx'])}: +${Math.max(0, starsAvail() - G.stars)}`;
  }

  /* boosts: rewarded ads */
  function buildBoosts() {
    boostBar.innerHTML = '';
    const b2 = K.ui.adBtn(K.t(['x2 income 5 min', 'Renda x2 5 min']), () => {
      G.boostUntil = Math.max(Date.now(), G.boostUntil) + 5 * 60000; K.save.mark(); K.audio.play('power'); K.fx.flash(INK.yellow, 0.4); K.game.happy();
    }, 'sm');
    b2.classList.add('b2');
    const fr = K.ui.adBtn(K.t(['Golden frenzy', 'Frenesi dourado']), () => { startFrenzy(); }, 'sm');
    boostBar.appendChild(b2); boostBar.appendChild(fr);
    const st = K.el('div', 'bstat'); boostBar.appendChild(st);
  }
  function updateBoostBar() {
    const st = boostBar.querySelector('.bstat'); if (!st) return;
    const parts = [];
    if (Date.now() < G.boostUntil) parts.push('x2 ' + K.fmtTime((G.boostUntil - Date.now()) / 1000));
    if (Date.now() < G.frenzyUntil) parts.push('x7 ' + K.fmtTime((G.frenzyUntil - Date.now()) / 1000));
    st.textContent = parts.join(' · ');
  }
  function startFrenzy() {
    G.frenzyUntil = Date.now() + 30000; K.save.mark();
    K.audio.play('levelup'); K.fx.flash(INK.pink, 0.5); K.fx.shake(10); K.game.happy();
    K.fx.text(loaf.x, loaf.y - loaf.r - 20, K.t(['FRENZY x7!', 'FRENESI x7!']), { color: INK.pink, size: 40, life: 1.8 });
  }

  function openPrestige() {
    const gain = Math.max(0, starsAvail() - G.stars);
    const body = `<p>${K.t(['Sell your bakery and open a franchise. You keep stars, gems and level. Each star gives +10% to everything.', 'Venda sua padaria e abra uma franquia. Você mantém estrelas, gemas e nível. Cada estrela dá +10% em tudo.'])}</p><div class="kit-big">★ +${gain}</div><p class="kit-note">${K.t(['Needs 1M coins baked this run for the first star.', 'Precisa de 1M de moedas assadas nesta rodada para a primeira estrela.'])}</p>`;
    const p = K.ui.panel({ title: K.t(['Franchise', 'Franquia']), body });
    const go = K.ui.btn(K.t(['Franchise!', 'Franquear!']), '', () => {
      if (gain <= 0) { K.audio.play('error'); return; }
      G.stars += gain; G.owned = B.map(() => 0); G.tapLvl = 0; G.runTotal = 0; K.meta.s.coins = 0;
      K.meta.addGems(gain * 2); K.save.mark(); K.meta.updateHud(); p.close(); buildShop();
      K.audio.play('win'); K.fx.flash('#fff', 0.8); K.game.happy();
    });
    if (gain <= 0) go.disabled = true;
    p.foot.appendChild(go); p.foot.appendChild(K.ui.btn(K.t('close'), 'ghost', () => p.close())); p.panel.appendChild(p.foot);
  }

  /* ---------- golden croissant ---------- */
  let gold = null, goldTimer = K.rand(40, 80);
  function spawnGold() {
    const m = 60;
    gold = { x: K.rand(m, (wide ? W * 0.62 : W) - m), y: K.rand(90, wide ? H - m : H * 0.55), t: 0, life: 12 };
  }
  function drawCroissant(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3) * 0.2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,216,0,.35)'; ctx.beginPath(); ctx.arc(0, 0, 46 + Math.sin(t * 8) * 4, 0, 7); ctx.fill();
    const shape = () => { ctx.beginPath(); ctx.moveTo(-34, 8); ctx.quadraticCurveTo(-20, -26, 0, -22); ctx.quadraticCurveTo(20, -26, 34, 8); ctx.quadraticCurveTo(0, -4, -34, 8); ctx.closePath(); };
    ctx.save(); ctx.translate(3, 2); ctx.fillStyle = INK.blue; ctx.globalAlpha = 0.7; shape(); ctx.fill(); ctx.restore();
    ctx.fillStyle = INK.yellow; shape(); ctx.fill(); ctx.strokeStyle = INK.dark; ctx.lineWidth = 3; ctx.stroke();
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 10, -20 + Math.abs(k) * 3); ctx.lineTo(k * 12, -2); ctx.stroke(); }
    ctx.restore();
  }

  /* ---------- input ---------- */
  let started = false;
  cv.addEventListener('pointerdown', (e) => {
    if (!started || K.ui.anyOpen()) return;
    const x = e.clientX, y = e.clientY;
    if (gold && K.dist(x, y, gold.x, gold.y) < 55) { catchGold(); return; }
    if (K.dist(x, y, loaf.x, loaf.y) < loaf.r * 1.15) tap(x, y);
  });
  window.addEventListener('keydown', (e) => { if (started && (e.code === 'Space' || e.code === 'Enter') && !K.ui.anyOpen()) { e.preventDefault(); tap(loaf.x + K.rand(-30, 30), loaf.y + K.rand(-30, 30)); } });
  let combo = 0, comboT = 0;
  function tap(x, y) {
    const v = tapPower() * (combo > 30 ? 1.5 : 1);
    earn(v); G.taps++; K.meta.track('taps', 1);
    combo++; comboT = 0.6;
    loaf.sq = 1; loaf.rot = K.rand(-0.06, 0.06);
    K.audio.play('pop', 0.8 + Math.min(combo, 40) * 0.015);
    K.fx.burst(x, y, { n: 6, colors: [INK.yellow, INK.pink, '#e6b35c'], speed: 280, g: 700, size: 5, shape: 'square' });
    K.fx.text(x + K.rand(-20, 20), y - 20, '+' + K.fmt(v), { color: combo > 30 ? INK.pink : INK.dark, stroke: INK.paper, size: 24 + Math.min(combo, 30) * 0.4 });
    if (combo === 30) { K.fx.text(loaf.x, loaf.y - loaf.r - 30, 'COMBO x1.5', { color: INK.blue, stroke: INK.paper, size: 34, life: 1.4 }); K.audio.play('combo'); }
    hudC.bump();
    if (G.taps % 25 === 0) K.meta.addXp(2);
  }
  function catchGold() {
    const g = gold; gold = null; goldTimer = K.rand(60, 120);
    K.meta.track('golden', 1); K.meta.addXp(15);
    K.fx.burst(g.x, g.y, { n: 40, colors: [INK.yellow, INK.pink, '#fff'], speed: 500, g: 300, shape: 'star', size: 9, life: 1 });
    K.fx.shake(8); K.fx.hitstop(0.06);
    if (Math.random() < 0.5) startFrenzy();
    else {
      const v = Math.max(tapPower() * 50, cpsBase() * 90);
      earn(v); K.audio.play('win');
      K.fx.text(g.x, g.y, '+' + K.fmt(v), { color: INK.pink, stroke: INK.paper, size: 42, life: 1.6 });
    }
  }

  /* ---------- title & offline ---------- */
  const title = K.el('div', 'title');
  title.innerHTML = `<div class="logo"><span>Bakery</span><span>Empire</span></div><p class="sub">${K.t(['Bake. Tap. Build a bread empire.', 'Asse. Toque. Construa um império do pão.'])}</p>`;
  const playB = K.ui.btn(K.t('play'), 'big', () => startGame());
  playB.dataset.play = '1';
  title.appendChild(playB);
  document.querySelector('.kit-ui').appendChild(title);
  K.meta.setMenuButtonsVisible(false);
  shop.style.display = 'none'; boostBar.style.display = 'none';

  function startGame() {
    title.remove(); started = true;
    shop.style.display = ''; boostBar.style.display = '';
    K.meta.setMenuButtonsVisible(true);
    buildShop(); buildBoosts();
    K.game.start();
    K.music.set({ bpm: 92, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]], bass: true, pad: true, arp: [1, 0, 1, 0, 1, 0, 1, 1], arpWave: 'triangle', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    // offline earnings
    if (G.last && cpsBase() > 0) {
      const secs = Math.min(8 * 3600, (Date.now() - G.last) / 1000);
      if (secs > 60) {
        const v = cpsBase() * secs * 0.5;
        const pnl = K.ui.panel({ title: K.t('welcomeBack'), body: `<p>${K.t('offline')} (${K.fmtTime(secs)})</p><div class="kit-big">${K.icon.coin} ${K.fmt(v)}</div>`, closable: false });
        const take = (m) => { const r = pnl.panel.getBoundingClientRect(); G.total += v * m; G.runTotal += v * m; K.meta.addCoins(v * m, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); pnl.close(); };
        pnl.foot.appendChild(K.ui.adBtn(K.t('x3'), () => take(3)));
        pnl.foot.appendChild(K.ui.btn(K.t('collect'), '', () => take(1)));
        pnl.panel.appendChild(pnl.foot);
      }
    }
    G.last = Date.now();
  }

  /* ---------- loop ---------- */
  let acc = 0, uiAcc = 0, t = 0;
  K.onSystemPause((p) => { if (!p) G.last = Date.now(); });
  K.loop((dt) => {
    t += dt;
    K.fx.update(dt);
    loaf.sq *= Math.pow(0.0005, dt); loaf.rot *= Math.pow(0.01, dt);
    if (!started) return;
    comboT -= dt; if (comboT <= 0) combo = 0;
    acc += dt;
    if (acc >= 0.1) { earn(cps() * acc); acc = 0; }
    goldTimer -= dt;
    if (!gold && goldTimer <= 0) spawnGold();
    if (gold) { gold.t += dt; if (gold.t > gold.life) { gold = null; goldTimer = K.rand(50, 100); } }
    uiAcc += dt;
    if (uiAcc > 0.2) {
      uiAcc = 0; K.meta.updateHud(); cpsPill.set(K.fmt(cps()) + '/s'); refreshShop(); updateBoostBar();
      G.last = Date.now(); K.save.mark(); K.meta.trackMax('cps', cps());
    }
  }, () => {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = bgPat; ctx.fillRect(0, 0, W, H);
    // sunburst behind loaf
    ctx.save(); ctx.translate(loaf.x, loaf.y); ctx.rotate(t * 0.08);
    const fr = Date.now() < G.frenzyUntil;
    ctx.fillStyle = fr ? 'rgba(255,72,176,.28)' : 'rgba(255,216,0,.35)';
    for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, loaf.r * 2.6, (i / 16) * 6.283, ((i + 0.5) / 16) * 6.283); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
    // shelf with owned buildings as little stamps
    drawShelf();
    const bob = Math.sin(t * 2) * 4;
    drawLoaf(loaf.x, loaf.y + bob, loaf.r);
    if (gold) drawCroissant(gold.x, gold.y + Math.sin(gold.t * 4) * 8, 1 + Math.sin(gold.t * 6) * 0.06, gold.t);
    K.fx.draw(ctx);
    ctx.restore();
    if (started && W > 0) {
      ctx.font = '700 ' + Math.round(Math.min(40, loaf.r * 0.32)) + 'px Georgia';
      ctx.textAlign = 'center'; ctx.fillStyle = INK.dark;
      ctx.fillText(K.fmt(K.meta.s.coins), loaf.x, loaf.y - loaf.r - 34);
      ctx.font = '600 15px Georgia'; ctx.fillStyle = INK.blue;
      ctx.fillText(K.fmt(cps()) + ' ' + K.t(['per second', 'por segundo']), loaf.x, loaf.y - loaf.r - 10);
    }
    K.draw.grain(ctx, 0.07);
    K.fx.drawFlash(ctx, W * DPR, H * DPR);
  });

  const stampCache = {};
  function drawShelf() {
    const y0 = wide ? H - 70 : loaf.y + loaf.r + 60;
    const x0 = 12, x1 = wide ? W * 0.62 : W - 12;
    ctx.fillStyle = 'rgba(0,120,191,.25)'; ctx.fillRect(x0, y0 + 30, x1 - x0, 6);
    let x = x0 + 10;
    for (let i = 0; i < B.length; i++) {
      if (!G.owned[i]) continue;
      if (!stampCache[i]) { const im = new Image(); im.src = icons[i]; stampCache[i] = im; }
      const n = Math.min(4, 1 + Math.floor(Math.log10(G.owned[i] + 1) * 1.5));
      for (let k = 0; k < n && x < x1 - 30; k++) { if (stampCache[i].complete) ctx.drawImage(stampCache[i], x, y0 - 2 + Math.sin(t * 3 + i + k) * 1.5, 30, 30); x += 24; }
      x += 8;
    }
  }
  }
})();

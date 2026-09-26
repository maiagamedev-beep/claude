/* Deep Mine Tycoon — idle mining: shafts dig ore, an elevator hauls it up, a cart sells it. Managers automate, new
   shafts go deeper, new mines multiply everything. Cut-away diorama view drawn in chunky pixel-ish shapes. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const MINES = [
    { n: ['Coal Hills', 'Colinas de Carvão'], ore: '#3d3d3d', rock: '#8d6e63', mult: 1 },
    { n: ['Copper Canyon', 'Cânion de Cobre'], ore: '#d9822b', rock: '#a1887f', mult: 25 },
    { n: ['Silver Peaks', 'Picos de Prata'], ore: '#cfd8dc', rock: '#78909c', mult: 600 },
    { n: ['Gold Gorge', 'Garganta de Ouro'], ore: '#ffd54f', rock: '#6d4c41', mult: 15000 },
    { n: ['Crystal Core', 'Núcleo de Cristal'], ore: '#80deea', rock: '#4a4e69', mult: 400000 },
  ];
  const MAXSHAFTS = 12;
  const shaftCost = (i) => Math.round(50 * Math.pow(9, i));
  const shaftBase = (i) => 1.2 * Math.pow(6.5, i);

  K.boot('deep_mine', { g: { mine: 0, mines: {}, last: 0, boostUntil: 0, cash: 0, total: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const M = () => (G.mines[G.mine] = G.mines[G.mine] || { shafts: [{ lvl: 1, mgr: false, stock: 0 }], elev: { lvl: 1, mgr: false }, ware: { lvl: 1, mgr: false }, top: 0, sold: 0 });
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, scroll = 0, rowH = 110;
    /* ---------- economy ---------- */
    const mineMult = () => MINES[G.mine].mult * (Date.now() < G.boostUntil ? 2 : 1);
    const shaftRate = (i, s) => shaftBase(i) * s.lvl * Math.pow(2, Math.floor(s.lvl / 25)) * mineMult(); // ore/sec when working
    const upCost = (base, lvl) => Math.round(base * Math.pow(1.13, lvl - 1));
    const elevCap = () => 20 * Math.pow(1.35, M().elev.lvl) * mineMult();
    const wareCap = () => 20 * Math.pow(1.35, M().ware.lvl) * mineMult();
    const mgrCost = (k) => Math.round(100 * Math.pow(12, k) * MINES[G.mine].mult);
    const cash = () => K.meta.s.coins;
    /* ---------- workers (visual + logic) ---------- */
    const miners = [], elev = { y: 0, load: 0, state: 'idle', t: 0, target: 0, stops: [] }, cart = { x: 0, load: 0, state: 'idle', t: 0 };
    function syncMiners() { while (miners.length < M().shafts.length) miners.push({ t: 0, state: 'idle', carry: 0 }); miners.length = M().shafts.length; }
    function tapShaft(i) { const m = miners[i]; if (m.state === 'idle') { m.state = 'dig'; m.t = 0; K.audio.play('tap', 1.2); } }
    function tapElev() { if (elev.state === 'idle') { elev.state = 'down'; elev.t = 0; elev.stop = 0; K.audio.play('click'); } }
    function tapCart() { if (cart.state === 'idle') { cart.state = 'go'; cart.t = 0; K.audio.play('click'); } }
    function stepWorkers(dt) {
      const mm = M();
      mm.shafts.forEach((s, i) => {
        const m = miners[i]; if (!m) return;
        if (m.state === 'idle' && s.mgr) m.state = 'dig';
        if (m.state === 'dig') { m.t += dt; if (m.t >= 2) { m.state = 'back'; m.t = 0; m.carry = shaftRate(i, s) * 2; } }
        else if (m.state === 'back') { m.t += dt; if (m.t >= 1) { s.stock += m.carry; m.carry = 0; m.state = 'idle'; m.t = 0; } }
      });
      if (elev.state === 'idle' && mm.elev.mgr && mm.shafts.some((s) => s.stock > 0)) tapElev();
      if (elev.state === 'down') {
        elev.t += dt * 1.6; const stopY = elev.stop + 1; elev.y = K.lerp(elev.y, stopY, Math.min(1, dt * 6));
        if (Math.abs(elev.y - stopY) < 0.05) { const s = mm.shafts[elev.stop]; const take = Math.min(s.stock, elevCap() - elev.load); s.stock -= take; elev.load += take; if (take > 0) K.audio.play('coin', 0.7); if (elev.stop < mm.shafts.length - 1 && elev.load < elevCap()) elev.stop++; else elev.state = 'up'; }
      } else if (elev.state === 'up') { elev.y = K.lerp(elev.y, 0, Math.min(1, dt * 4)); if (elev.y < 0.05) { elev.y = 0; mm.top += elev.load; elev.load = 0; elev.state = 'idle'; } }
      if (cart.state === 'idle' && mm.ware.mgr && mm.top > 0) tapCart();
      if (cart.state === 'go') { cart.t += dt; if (cart.t < 0.5) cart.x = cart.t / 0.5; else if (cart.t < 0.8) { if (!cart.loaded) { const take = Math.min(mm.top, wareCap()); mm.top -= take; cart.load = take; cart.loaded = true; } } else { cart.x = Math.max(0, 1 - (cart.t - 0.8) / 0.6); if (cart.x <= 0) { sell(cart.load); cart.load = 0; cart.loaded = false; cart.state = 'idle'; } } }
    }
    function sell(v) {
      if (v <= 0) return; K.meta.s.coins += v; G.total += v; M().sold += v; K.meta.track('_coins', v); K.meta.track('sold', 1); K.save.mark();
      K.fx.text(W * 0.78, 70, '+' + K.fmt(v), { color: '#ffd54f', stroke: '#3e2723', size: 26 }); K.audio.play('coin', 1.1);
      K.meta.updateHud(); K.meta.hud.coins && K.meta.hud.coins.bump();
    }
    function idleRate() { const mm = M(); const prod = mm.shafts.reduce((a, s, i) => a + (s.mgr ? shaftRate(i, s) * 2 / 3 : 0), 0); const lim = Math.min(prod, mm.elev.mgr ? elevCap() / (1 + mm.shafts.length * 0.6) : 0, mm.ware.mgr ? wareCap() / 1.4 : 0); return lim; }

    /* ---------- UI ---------- */
    K.meta.init({
      coinScale: () => Math.max(1, idleRate() * 20 / 10),
      howTo: { en: 'Tap the miners, the elevator and the cart to move ore up and sell it. Upgrade each level to produce and carry more. Hire managers to automate them. Dig new shafts deeper for richer ore and open new mines to multiply everything.', pt: 'Toque nos mineiros, no elevador e no carrinho para levar o minério e vender. Melhore cada nível para produzir e carregar mais. Contrate gerentes para automatizar. Abra poços mais fundos e novas minas para multiplicar tudo.' },
      missions: [{ stat: 'sold', base: 40, reward: 80, text: { en: 'Sell {n} cart loads', pt: 'Venda {n} carregamentos' } }, { stat: 'upg', base: 15, reward: 90, text: { en: 'Buy {n} upgrades', pt: 'Compre {n} melhorias' } }, { stat: 'shaft', base: 1, reward: 120, text: { en: 'Open {n} new shaft(s)', pt: 'Abra {n} poço(s) novo(s)' } }],
    });
    K.meta.buildHud({});
    const side = K.el('div', 'dmside'); K.ui.root.appendChild(side);
    function panelFor(kind, i) {
      const mm = M(), body = K.el('div');
      const p = K.ui.panel({ title: kind === 'shaft' ? K.t(['Shaft', 'Poço']) + ' ' + (i + 1) : kind === 'elev' ? K.t(['Elevator', 'Elevador']) : K.t(['Warehouse', 'Armazém']), body });
      const render = () => {
        const o = kind === 'shaft' ? mm.shafts[i] : mm[kind], base = kind === 'shaft' ? shaftCost(i) * 0.4 * MINES[G.mine].mult + 10 : 40 * MINES[G.mine].mult, stat = kind === 'shaft' ? K.fmt(shaftRate(i, o)) + '/s' : K.fmt(kind === 'elev' ? elevCap() : wareCap()) + ' ' + K.t(['per trip', 'por viagem']);
        body.innerHTML = `<div class="kit-big">Lv ${o.lvl}</div><p>${stat}</p>`;
        const buy = (n) => { let c = 0; for (let k = 0; k < n; k++) c += upCost(base, o.lvl + k); return c; };
        const row = K.el('div', 'kit-pf');
        [1, 10].forEach((n) => row.appendChild(K.ui.btn(`+${n} · ${K.icon.coin} ${K.fmt(buy(n))}`, 'sm', () => { if (K.meta.spend(buy(n))) { o.lvl += n; K.meta.track('upg', n); K.meta.addXp(n); K.save.mark(); render(); } })));
        body.appendChild(row);
        if (!o.mgr) { const mk = kind === 'shaft' ? i + 1 : kind === 'elev' ? 1 : 1; body.appendChild(K.el('p', 'kit-note', K.t(['Managers work while you are away.', 'Gerentes trabalham enquanto você está fora.']))); const r2 = K.el('div', 'kit-pf'); r2.appendChild(K.ui.btn('👔 ' + K.icon.coin + ' ' + K.fmt(mgrCost(mk)), '', () => { if (K.meta.spend(mgrCost(mk))) { o.mgr = true; K.audio.play('levelup'); K.save.mark(); render(); } })); r2.appendChild(K.ui.adBtn('👔 ' + K.t('free'), () => { o.mgr = true; K.save.mark(); render(); })); body.appendChild(r2); }
        else body.appendChild(K.el('p', '', '👔 ✓ ' + K.t(['Manager hired', 'Gerente contratado'])));
      };
      render(); void p;
    }
    function renderSide() {
      const mm = M();
      side.innerHTML = `<div class="rate">${K.fmt(idleRate())}/s</div>`;
      const b = K.el('div', 'btns');
      if (mm.shafts.length < MAXSHAFTS) { const c = shaftCost(mm.shafts.length) * MINES[G.mine].mult; b.appendChild(K.ui.btn('⛏ +' + K.t(['Shaft', 'Poço']) + ' ' + K.icon.coin + ' ' + K.fmt(c), 'sm', () => { if (K.meta.spend(c)) { mm.shafts.push({ lvl: 1, mgr: false, stock: 0 }); syncMiners(); K.meta.track('shaft', 1); K.audio.play('explode', 1.4); K.fx.shake(8); K.save.mark(); renderSide(); } })); }
      b.appendChild(K.ui.adBtn(K.t(['x2 cash 10 min', 'Dinheiro x2 10 min']), () => { G.boostUntil = Math.max(Date.now(), G.boostUntil) + 600000; K.audio.play('power'); K.save.mark(); }, 'sm'));
      b.appendChild(K.ui.btn('🗺 ' + K.t(['Mines', 'Minas']), 'sm', openMines));
      side.appendChild(b);
    }
    function openMines() {
      const body = K.el('div');
      const p = K.ui.panel({ title: K.t(['Mines', 'Minas']), body });
      MINES.forEach((mn, i) => {
        const own = !!G.mines[i], cost = Math.round(250000 * Math.pow(40, i - 1));
        const row = K.el('div', 'kit-row', `<div style="width:26px;height:26px;border-radius:6px;background:${mn.ore};border:3px solid ${mn.rock}"></div><div class="grow"><b>${K.t(mn.n)}</b><div class="kit-note">x${K.fmt(mn.mult)}</div></div>`);
        row.appendChild(own ? K.ui.btn(G.mine === i ? '✓' : '▶', 'sm', () => { G.mine = i; syncMiners(); K.save.mark(); p.close(); renderSide(); }) : i === 0 ? K.el('b', '', '') : K.ui.btn(K.icon.coin + ' ' + K.fmt(cost), 'sm', () => { if (K.meta.spend(cost)) { G.mine = i; M(); syncMiners(); K.audio.play('win'); K.game.happy(); K.save.mark(); p.close(); renderSide(); } }));
        body.appendChild(row);
      });
    }
    function showTitle() {
      K.std.menu({ title: 'Deep Mine<span>Tycoon</span>', sub: K.t(MINES[G.mine].n), onPlay: begin });
    }
    function begin() {
      side.style.display = ''; K.game.start(); syncMiners(); renderSide(); K.meta.setMenuButtonsVisible(true);
      // offline earnings
      if (G.last) { const secs = Math.min(8 * 3600, (Date.now() - G.last) / 1000), v = idleRate() * secs * 0.8; if (secs > 60 && v > 0) { const pnl = K.ui.panel({ title: K.t('welcomeBack'), body: `<p>${K.t('offline')} (${K.fmtTime(secs)})</p><div class="kit-big">${K.icon.coin} ${K.fmt(v)}</div>`, closable: false }); const take = (m) => { const r = pnl.panel.getBoundingClientRect(); K.meta.addCoins(v * m, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); pnl.close(); }; pnl.foot.appendChild(K.ui.adBtn(K.t('x3'), () => take(3))); pnl.foot.appendChild(K.ui.btn(K.t('collect'), '', () => take(1))); pnl.panel.appendChild(pnl.foot); } }
      started = true;
    }
    let started = false;
    side.style.display = 'none';
    /* ---------- input: tap on scene ---------- */
    const layoutY = (i) => 250 + i * rowH - scroll; // shaft row y
    cv.addEventListener('pointerdown', (e) => {
      if (!started || K.ui.anyOpen()) return;
      const x = e.clientX, y = e.clientY, ex = W * 0.2;
      dragY = y; dragS = scroll; moved = false;
      pending = () => {
        const sy = (v) => v - scroll, wbx = Math.min(W * 0.82 + 70, W - 30);
        if (Math.hypot(x - (ex - 62), y - sy(112)) < 28) return panelFor('elev');
        if (Math.hypot(x - wbx, y - sy(120)) < 28) return panelFor('ware');
        if (y < sy(170) && x > W * 0.4) return tapCart();
        if (x < ex + 40 && x > ex - 40) return tapElev();
        const i = Math.floor((y + scroll - 250 + rowH / 2) / rowH); if (i >= 0 && i < M().shafts.length) { if (x > W - 70) panelFor('shaft', i); else tapShaft(i); }
      };
    });
    let dragY = 0, dragS = 0, moved = false, pending = null;
    window.addEventListener('pointermove', (e) => { if (pending && Math.abs(e.clientY - dragY) > 8) { moved = true; scroll = K.clamp(dragS - (e.clientY - dragY), 0, Math.max(0, 250 + M().shafts.length * rowH - H + 80)); } });
    window.addEventListener('pointerup', () => { if (pending && !moved) pending(); pending = null; });
    window.addEventListener('wheel', (e) => { scroll = K.clamp(scroll + e.deltaY, 0, Math.max(0, 250 + M().shafts.length * rowH - H + 80)); }, { passive: true });
    window.addEventListener('keydown', (e) => { if (!started) return; if (e.code === 'Space') { e.preventDefault(); M().shafts.forEach((s, i) => tapShaft(i)); tapElev(); tapCart(); } });

    /* ---------- render ---------- */
    function btnUp(x, y, s) { ctx.fillStyle = '#43a047'; K.draw.rrect(ctx, x - 22, y - 22, 44, 44, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '900 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⬆', x, y + 1); if (s) { ctx.font = '700 11px sans-serif'; ctx.fillText(s, x, y + 32); } }
    function miner(x, y, t, carry, face) {
      ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
      const sw = Math.sin(t * 12) * 0.6;
      ctx.fillStyle = '#1565c0'; ctx.fillRect(-7, -20, 14, 16); ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.arc(0, -27, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fdd835'; ctx.beginPath(); ctx.arc(0, -30, 8, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff59d'; ctx.fillRect(4, -33, 4, 3);
      ctx.fillStyle = '#37474f'; ctx.fillRect(-6, -4, 5, 8); ctx.fillRect(1, -4, 5, 8);
      ctx.save(); ctx.translate(6, -16); ctx.rotate(carry ? 0 : sw - 0.6); ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -10); ctx.stroke(); if (!carry) { ctx.strokeStyle = '#9e9e9e'; ctx.beginPath(); ctx.moveTo(8, -18); ctx.quadraticCurveTo(18, -12, 20, -2); ctx.stroke(); } ctx.restore();
      if (carry) { ctx.fillStyle = MINES[G.mine].ore; ctx.beginPath(); ctx.arc(-8, -22, 7, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    let tt = 0;
    K.loop((dt) => { tt += dt; K.fx.update(dt); if (started) { stepWorkers(dt); G.last = Date.now(); K.save.mark(); } }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const Mn = MINES[G.mine];
      // sky & surface
      const sky = ctx.createLinearGradient(0, 0, 0, 170 - scroll); sky.addColorStop(0, '#81d4fa'); sky.addColorStop(1, '#e1f5fe'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, Math.max(0, 170 - scroll));
      ctx.fillStyle = '#7cb342'; ctx.fillRect(0, 150 - scroll, W, 16);
      ctx.fillStyle = Mn.rock; ctx.fillRect(0, 166 - scroll, W, H + scroll);
      // strata texture
      ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 180 - scroll; y < H; y += 26) for (let x = ((y * 7) % 40) - 40; x < W; x += 80) { ctx.fillRect(x, y, 40, 8); }
      const ex = W * 0.2, mm = M();
      // elevator shaft
      ctx.fillStyle = '#3e2723'; ctx.fillRect(ex - 30, 120 - scroll, 60, 180 + mm.shafts.length * rowH);
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3; for (let y = 130 - scroll; y < 180 + mm.shafts.length * rowH - scroll; y += 20) { ctx.beginPath(); ctx.moveTo(ex - 30, y); ctx.lineTo(ex - 22, y); ctx.moveTo(ex + 22, y); ctx.lineTo(ex + 30, y); ctx.stroke(); }
      // headframe
      ctx.fillStyle = '#5d4037'; ctx.fillRect(ex - 40, 60 - scroll, 80, 14); ctx.fillRect(ex - 40, 60 - scroll, 10, 100); ctx.fillRect(ex + 30, 60 - scroll, 10, 100); ctx.fillStyle = '#bdbdbd'; ctx.beginPath(); ctx.arc(ex, 60 - scroll, 14, 0, 6.283); ctx.fill();
      // warehouse & cart
      const wx = W * 0.82; ctx.fillStyle = '#d84315'; ctx.fillRect(wx - 50, 90 - scroll, 100, 60); ctx.fillStyle = '#bf360c'; ctx.beginPath(); ctx.moveTo(wx - 60, 90 - scroll); ctx.lineTo(wx, 60 - scroll); ctx.lineTo(wx + 60, 90 - scroll); ctx.fill(); ctx.fillStyle = '#ffe0b2'; ctx.fillRect(wx - 14, 115 - scroll, 28, 35);
      ctx.fillStyle = Mn.ore; for (let k = 0; k < Math.min(8, Math.ceil(Math.log10(mm.top + 1))); k++) { ctx.beginPath(); ctx.arc(ex + 55 + (k % 4) * 12, 142 - scroll - Math.floor(k / 4) * 10, 7, 0, 6.283); ctx.fill(); }
      const cx = K.lerp(ex + 110, wx - 70, cart.x); ctx.fillStyle = '#546e7a'; ctx.fillRect(cx - 24, 128 - scroll, 48, 20); ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(cx - 14, 150 - scroll, 6, 0, 6.283); ctx.arc(cx + 14, 150 - scroll, 6, 0, 6.283); ctx.fill(); if (cart.load) { ctx.fillStyle = Mn.ore; ctx.beginPath(); ctx.arc(cx, 126 - scroll, 12, Math.PI, 0); ctx.fill(); }
      miner(cx - 34, 150 - scroll, tt * (cart.state === 'go' ? 1 : 0), 0, cart.x < 0.5 ? 1 : -1);
      ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(K.fmt(mm.top), ex + 70, 110 - scroll);
      btnUp(wx + 70 > W - 26 ? W - 30 : wx + 70, 120 - scroll, 'Lv ' + mm.ware.lvl); if (!mm.ware.mgr && cart.state === 'idle' && mm.top > 0) { ctx.fillStyle = '#ffeb3b'; ctx.fillText('👆', cx, 110 - scroll + Math.sin(tt * 6) * 4); }
      // shafts
      mm.shafts.forEach((s, i) => {
        const y = layoutY(i); if (y < -rowH || y > H + rowH) return;
        ctx.fillStyle = '#4e342e'; ctx.fillRect(ex + 30, y - 40, W - ex - 30, 60);
        ctx.fillStyle = Mn.ore; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(W - 150 + (k % 3) * 18, y - 20 + Math.floor(k / 3) * 16, 8, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(ex + 30, y + 16, W - ex - 30, 4);
        const m = miners[i] || { state: 'idle', t: 0 }, digX = W - 180, dropX = ex + 60;
        const mx = m.state === 'dig' ? digX : m.state === 'back' ? K.lerp(digX, dropX, m.t) : dropX;
        miner(mx, y + 16, m.state === 'dig' ? m.t : m.state === 'back' ? m.t * 2 : 0, m.state === 'back', m.state === 'back' ? -1 : 1);
        if (m.state === 'dig' && Math.random() < 0.1) K.fx.burst(digX + 20, y, { n: 2, colors: [Mn.ore, '#999'], speed: 90, g: 400, size: 3, life: 0.3, shape: 'square' });
        ctx.fillStyle = '#fff'; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${K.t(['Shaft', 'Poço'])} ${i + 1} · ${K.fmt(s.stock)}`, ex + 40, y - 26);
        if (s.mgr) { ctx.fillText('👔', ex + 36, y + 6); } else if (m.state === 'idle') { ctx.fillStyle = '#ffeb3b'; ctx.fillText('👆', W / 2, y - 4 + Math.sin(tt * 6 + i) * 4); }
        btnUp(W - 40, y - 12, 'Lv ' + s.lvl);
      });
      // elevator cabin
      const ey = (elev.y <= 1 ? 150 + elev.y * 116 : 266 + (elev.y - 1) * rowH) - scroll;
      ctx.fillStyle = '#fbc02d'; ctx.fillRect(ex - 24, ey - 40, 48, 44); ctx.strokeStyle = '#212121'; ctx.lineWidth = 3; ctx.strokeRect(ex - 24, ey - 40, 48, 44);
      ctx.strokeStyle = '#9e9e9e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, 60 - scroll); ctx.lineTo(ex, ey - 40); ctx.stroke();
      if (elev.load) { ctx.fillStyle = Mn.ore; ctx.beginPath(); ctx.arc(ex, ey - 12, 12, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = '#212121'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Lv ' + mm.elev.lvl + (mm.elev.mgr ? ' 👔' : ''), ex, ey + 18);
      btnUp(ex - 62, 112 - scroll, '');
      if (!mm.elev.mgr && elev.state === 'idle' && mm.shafts.some((s) => s.stock > 0)) { ctx.fillText('👆', ex, ey - 50 + Math.sin(tt * 6) * 4); }
      K.fx.draw(ctx); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; rowH = Math.max(90, Math.min(120, h / 7)); });
    K.music.set({ bpm: 92, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]], bass: true, arp: [1, 0, 1, 0, 1, 0, 1, 0], arpWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showTitle();
  }
})();

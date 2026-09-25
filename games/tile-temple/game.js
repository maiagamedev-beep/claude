/* Tile Temple — tap free tiles, collect three of a kind in the tray. Layered ivory tiles, 60 levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = 'Georgia, "Times New Roman", serif';
  const ICONS = 14, SLOTS = 7, LEVELS = 60;
  const ICOL = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#d35400', '#2c3e50', '#e84393', '#00b894', '#6c5ce7', '#fd79a8', '#0984e3'];

  K.boot('tile_temple', { g: { lvl: 0, stars: {}, bo: { undo: 2, shuffle: 1, pull: 1 } } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, ts = 50, ox = 0, oy = 0, trayY = 0, trayX = 0, slotW = 50;
    const COLS = 7, ROWS = 8;
    function layout() {
      ts = Math.min((W - 30) / (COLS + 0.6), (H - 260) / (ROWS * 1.1 + 0.6), 78);
      ox = (W - ts * COLS) / 2; oy = 110;
      slotW = Math.min((W - 30) / SLOTS, 72); trayX = (W - slotW * SLOTS) / 2; trayY = Math.min(H - slotW - 80, oy + ts * 1.1 * ROWS + 30);
    }

    /* ---------- icons painted in ink ---------- */
    const cache = {};
    function tileImg(k, size, dim) {
      const key = k + '_' + size + (dim ? 'd' : ''); if (cache[key]) return cache[key];
      const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), s = size;
      // tile body: ivory with jade side
      K.draw.rrect(g, s * 0.04, s * 0.1, s * 0.92, s * 0.88, s * 0.14); g.fillStyle = '#3f8f6b'; g.fill();
      K.draw.rrect(g, s * 0.04, s * 0.02, s * 0.92, s * 0.86, s * 0.14); g.fillStyle = dim ? '#c9c3b0' : '#fbf6e6'; g.fill();
      g.strokeStyle = 'rgba(80,60,30,.25)'; g.lineWidth = s * 0.02; g.stroke();
      g.save(); g.translate(s / 2, s * 0.45); const r = s * 0.28; g.lineWidth = s * 0.05; g.lineCap = g.lineJoin = 'round';
      const col = dim ? '#8a8474' : ICOL[k]; g.fillStyle = col; g.strokeStyle = col;
      switch (k) {
        case 0: g.beginPath(); g.arc(0, 0, r * 0.5, 0, 6.283); g.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); } break; // sun
        case 1: g.beginPath(); g.arc(0, 0, r * 0.8, 0.6, 5.7); g.arc(r * 0.35, 0, r * 0.6, 5.2, 1.1, true); g.fill(); break; // moon
        case 2: K.draw.star(g, 0, 0, r, r * 0.45, 5); g.fill(); break;
        case 3: g.beginPath(); g.ellipse(0, 0, r * 0.45, r, 0.6, 0, 6.283); g.fill(); g.strokeStyle = dim ? '#c9c3b0' : '#fbf6e6'; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(-r * 0.5, r * 0.7); g.lineTo(r * 0.5, -r * 0.7); g.stroke(); break; // leaf
        case 4: g.beginPath(); g.ellipse(-r * 0.1, 0, r * 0.7, r * 0.4, 0, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(r * 0.5, 0); g.lineTo(r, -r * 0.4); g.lineTo(r, r * 0.4); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.45, -r * 0.08, r * 0.1, 0, 6.283); g.fill(); break; // fish
        case 5: for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * r * 0.45, i === 0 ? -r * 0.2 : 0, r * 0.42, 0, 6.283); g.fill(); } g.fillRect(-r * 0.85, 0, r * 1.7, r * 0.35); break; // cloud
        case 6: for (let i = 0; i < 5; i++) { g.save(); g.rotate((i / 5) * 6.283); g.beginPath(); g.ellipse(0, -r * 0.5, r * 0.28, r * 0.5, 0, 0, 6.283); g.fill(); g.restore(); } g.fillStyle = '#f1c40f'; g.beginPath(); g.arc(0, 0, r * 0.22, 0, 6.283); g.fill(); break; // flower
        case 7: g.beginPath(); g.moveTo(-r, r * 0.7); g.lineTo(-r * 0.2, -r * 0.8); g.lineTo(r * 0.2, -r * 0.1); g.lineTo(r * 0.5, -r * 0.5); g.lineTo(r, r * 0.7); g.closePath(); g.fill(); break; // mountain
        case 8: for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-r * 0.5 + i * r * 0.5, i * r * 0.3 - r * 0.2, r * 0.3, Math.PI, 0); g.stroke(); } break; // waves
        case 9: g.beginPath(); g.moveTo(0, r * 0.8); g.bezierCurveTo(-r * 1.2, -r * 0.2, -r * 0.4, -r, 0, -r * 0.35); g.bezierCurveTo(r * 0.4, -r, r * 1.2, -r * 0.2, 0, r * 0.8); g.fill(); break; // heart
        case 10: g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.8, 0, 0, r); g.quadraticCurveTo(-r * 0.8, 0, 0, -r); g.fill(); break; // drop
        case 11: g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(-r * 0.3, -r * 0.8, 0, 0); g.quadraticCurveTo(r * 0.3, -r * 0.8, r, 0); g.stroke(); g.beginPath(); g.arc(0, r * 0.1, r * 0.15, 0, 6.283); g.fill(); break; // bird
        case 12: for (let i = 0; i < 3; i++) { g.save(); g.rotate(-0.7 + i * 0.7); g.beginPath(); g.ellipse(0, -r * 0.35, r * 0.3, r * 0.65, 0, 0, 6.283); g.fill(); g.restore(); } g.fillRect(-r * 0.8, r * 0.3, r * 1.6, r * 0.15); break; // lotus
        default: g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.8, 0); g.lineTo(0, r); g.lineTo(-r * 0.8, 0); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -r * 0.6); g.lineTo(r * 0.3, 0); g.lineTo(0, -r * 0.1); g.fill(); // gem
      }
      g.restore();
      return (cache[key] = c);
    }

    /* ---------- state ---------- */
    let tiles = [], tray = [], history = [], lvIdx = 0, playing = false, revived = false, parked = [], combo = 0, flying = [];
    function levelCfg(i) {
      const kinds = Math.min(ICONS, 5 + Math.floor(i / 3)), layers = Math.min(6, 2 + Math.floor(i / 6)), triples = Math.min(33, 7 + Math.floor(i * 0.6));
      return { kinds, layers, triples };
    }
    function startLevel(i) {
      lvIdx = i; const L = levelCfg(i), r = K.rng(i * 17 + 5);
      const icons = []; for (let t = 0; t < L.triples; t++) { const k = t % L.kinds; icons.push(k, k, k); }
      // positions: layered pyramid on a 7x8 grid with half offsets
      const pos = [];
      for (let l = 0; l < L.layers && pos.length < icons.length * 2; l++) {
        const o = (l % 2) * 0.5, inset = Math.floor(l / 2);
        for (let y = inset; y < ROWS - inset - (o ? 1 : 0); y++) for (let x = inset; x < COLS - inset - (o ? 1 : 0); x++) if (r() < 0.62 - l * 0.05) pos.push({ x: x + o, y: y + o, l });
      }
      pos.sort((a, b) => a.l - b.l || r() - 0.5);
      while (pos.length < icons.length) pos.push({ x: Math.floor(r() * COLS), y: Math.floor(r() * ROWS), l: L.layers });
      // keep the lowest layers filled first, top layer exposed
      const chosen = pos.slice(0, icons.length);
      icons.sort(() => r() - 0.5);
      tiles = chosen.map((p, k) => ({ id: k, k: icons[k], x: p.x, y: p.y, l: p.l, s: 0, gone: false }));
      tiles.forEach((t) => K.tween(t, { s: 1 }, 0.3 + t.l * 0.1 + Math.random() * 0.2, 'outBack'));
      tray = []; history = []; parked = []; revived = false; combo = 0; playing = true;
      K.std.hideMenu(); hud.style.display = bar.style.display = ''; K.game.start(); renderHud();
    }
    const blocked = (t) => tiles.some((o) => !o.gone && o.l > t.l && Math.abs(o.x - t.x) < 1 && Math.abs(o.y - t.y) < 1);
    const tilePos = (t) => ({ x: ox + t.x * ts, y: oy + t.y * ts * 1.1 - t.l * ts * 0.1 });
    function pick(t) {
      if (!playing || t.gone || blocked(t) || tray.length >= SLOTS || K.ui.anyOpen()) return;
      t.gone = true; history.push(t);
      // insert next to same kind
      let at = tray.length; for (let i = tray.length - 1; i >= 0; i--) if (tray[i].k === t.k) { at = i + 1; break; }
      const p = tilePos(t);
      const item = { k: t.k, t, fx: p.x, fy: p.y, a: 0 };
      tray.splice(at, 0, item); K.tween(item, { a: 1 }, 0.22, 'outQuad');
      K.audio.play('tap', 1 + Math.random() * 0.2);
      setTimeout(check, 240); renderHud();
    }
    function check() {
      const counts = {}; tray.forEach((it) => (counts[it.k] = (counts[it.k] || 0) + 1));
      const k = Object.keys(counts).find((q) => counts[q] >= 3);
      if (k != null) {
        let n = 0; const idxs = [];
        tray.forEach((it, i) => { if (it.k == k && n < 3) { idxs.push(i); n++; } });
        const mid = idxs[1];
        const sx = trayX + (mid + 0.5) * slotW, sy = trayY + slotW / 2;
        K.fx.burst(sx, sy, { n: 26, colors: [ICOL[k], '#ffd34d', '#fff'], speed: 300, shape: 'star', size: 6, life: 0.7 });
        tray = tray.filter((_, i) => !idxs.includes(i)); history = history.filter((t) => t.k != k || !idxs.length);
        combo++; K.audio.play('merge', 1 + Math.min(0.6, combo * 0.08)); K.meta.track('triples', 1);
        if (combo >= 3) K.fx.text(W / 2, trayY - 30, 'Combo x' + combo, { color: '#fbf6e6', stroke: '#3f8f6b', size: 30 });
      } else if (tray.length >= SLOTS) { return lose(); }
      if (tiles.every((t) => t.gone) && !tray.length) return win();
      renderHud();
    }
    setInterval(() => { combo = Math.max(0, combo - 1); }, 2500);
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(ICOL);
      const stars = revived ? 1 : G.bo._used ? 2 : 3; G.bo._used = 0;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars); if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(15); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Temple cleared!', 'Templo limpo!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), coins: 30 + lvIdx * 5 + stars * 15, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 700);
    }
    function lose() {
      playing = false; K.audio.play('lose');
      setTimeout(() => K.std.end({ text: K.t(['The tray is full!', 'A bandeja encheu!']), coins: 8, revive: revived ? null : () => { revived = true; pullOut(); playing = true; K.game.start(); renderHud(); }, reviveLabel: K.t(['Move 3 tiles out', 'Tirar 3 peças']), restart: () => startLevel(lvIdx), menu: showMenu }), 500);
    }
    function pullOut() {
      const out = tray.splice(0, 3);
      out.forEach((it, i) => { it.t.gone = false; it.t.l = 9; it.t.x = COLS / 2 - 1.5 + i * 1.05; it.t.y = -0.9; it.t.s = 0; K.tween(it.t, { s: 1 }, 0.3, 'outBack'); history = history.filter((h) => h !== it.t); });
    }

    /* ---------- boosters ---------- */
    const BO = { undo: { ic: '↶', n: ['Undo', 'Desfazer'], p: 150 }, pull: { ic: '⇪', n: ['Take out 3', 'Tirar 3'], p: 250 }, shuffle: { ic: '⟳', n: ['Shuffle', 'Embaralhar'], p: 200 } };
    function useBo(k) {
      if (!playing) return;
      if (G.bo[k] <= 0) {
        const pnl = K.ui.panel({ title: BO[k].ic + ' ' + K.t(BO[k].n), body: `<p>${K.t(['Get more boosters', 'Ganhe mais itens'])}</p>` });
        pnl.foot.appendChild(K.ui.adBtn('+1 ' + K.t('free'), () => { G.bo[k]++; K.save.mark(); renderHud(); pnl.close(); }));
        pnl.foot.appendChild(K.ui.btn('+3 · ' + K.icon.coin + ' ' + BO[k].p * 2, '', () => { if (K.meta.spend(BO[k].p * 2)) { G.bo[k] += 3; renderHud(); pnl.close(); } }));
        pnl.panel.appendChild(pnl.foot); return;
      }
      if (k === 'undo') { const t = history.pop(); if (!t) return K.audio.play('error'); const i = tray.findIndex((it) => it.t === t); if (i >= 0) tray.splice(i, 1); t.gone = false; t.s = 0.6; K.tween(t, { s: 1 }, 0.25, 'outBack'); }
      if (k === 'pull') { if (!tray.length) return K.audio.play('error'); pullOut(); }
      if (k === 'shuffle') { const left = tiles.filter((t) => !t.gone), ks = left.map((t) => t.k).sort(() => Math.random() - 0.5); left.forEach((t, i) => { t.k = ks[i]; t.s = 0.3; K.tween(t, { s: 1 }, 0.35, 'outBack'); }); }
      G.bo[k]--; G.bo._used = 1; K.meta.track('boosters', 1); K.save.mark(); K.audio.play('power'); renderHud();
    }

    /* ---------- input ---------- */
    cv.addEventListener('pointerdown', (e) => {
      if (!playing) return;
      const cand = tiles.filter((t) => !t.gone).sort((a, b) => b.l - a.l);
      for (const t of cand) { const p = tilePos(t); if (e.clientX >= p.x && e.clientX <= p.x + ts && e.clientY >= p.y && e.clientY <= p.y + ts) { if (blocked(t)) { K.audio.play('error'); t.s = 0.9; K.tween(t, { s: 1 }, 0.2, 'outBack'); } else pick(t); return; } }
    });

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap tiles that are not covered to move them to the tray. Three identical tiles in the tray disappear. Clear the whole temple before the 7-slot tray fills up.', pt: 'Toque nas peças que não estão cobertas para levá-las à bandeja. Três peças iguais na bandeja somem. Limpe o templo inteiro antes das 7 vagas encherem.' },
      missions: [
        { stat: 'triples', base: 40, reward: 80, text: { en: 'Match {n} triples', pt: 'Forme {n} trincas' } },
        { stat: 'levels', base: 3, reward: 110, text: { en: 'Clear {n} temples', pt: 'Limpe {n} templos' } },
        { stat: 'boosters', base: 2, reward: 60, text: { en: 'Use {n} boosters', pt: 'Use {n} itens' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'ttbar'); K.ui.root.appendChild(bar);
    Object.keys(BO).forEach((k) => { const b = K.el('button', 'bo', `<span>${BO[k].ic}</span><small>${K.t(BO[k].n)}</small><i></i>`); b.dataset.k = k; b.onclick = (e) => { e.stopPropagation(); K.audio.play('click'); useBo(k); }; bar.appendChild(b); });
    const home = K.el('button', 'bo', `<span>⌂</span><small>${K.t('menu')}</small>`); home.onclick = () => { K.audio.play('click'); showMenu(); }; bar.appendChild(home);
    function renderHud() {
      hud.innerHTML = `<span class="chip">${K.t('level')} ${lvIdx + 1}</span><span class="chip">🀄 ${tiles.filter((t) => !t.gone).length}</span>`;
      bar.querySelectorAll('.bo[data-k]').forEach((b) => (b.querySelector('i').textContent = G.bo[b.dataset.k] > 0 ? G.bo[b.dataset.k] : '+'));
      bar.style.top = trayY + slotW + 16 + 'px';
    }
    function showMenu() {
      playing = false; hud.style.display = bar.style.display = 'none';
      K.std.menu({ title: 'Tile<span>Temple</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => startLevel(G.lvl), buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); startLevel(i); }))] });
    }

    /* ---------- render ---------- */
    let tt = 0;
    K.loop((dt) => { tt += dt; K.fx.update(dt); }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, Math.max(W, H)); gr.addColorStop(0, '#2f6f55'); gr.addColorStop(1, '#16382c'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // lattice pattern
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2;
      for (let x = -H; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.moveTo(x + H, 0); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      const sz = Math.round(ts * DPR);
      const vis = tiles.filter((t) => !t.gone).sort((a, b) => a.l - b.l || a.y - b.y);
      for (const t of vis) {
        const p = tilePos(t), b = blocked(t);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; K.draw.rrect(ctx, p.x + 3, p.y + 6, ts * 0.94, ts * 0.92, ts * 0.14); ctx.fill();
        ctx.save(); ctx.translate(p.x + ts / 2, p.y + ts / 2); ctx.scale(t.s, t.s); ctx.drawImage(tileImg(t.k, sz, b), -ts / 2, -ts / 2, ts, ts); ctx.restore();
      }
      // tray
      ctx.fillStyle = '#6b4a2b'; K.draw.rrect(ctx, trayX - 8, trayY - 8, slotW * SLOTS + 16, slotW + 16, 16); ctx.fill();
      ctx.fillStyle = '#8a6440'; K.draw.rrect(ctx, trayX - 4, trayY - 4, slotW * SLOTS + 8, slotW + 8, 12); ctx.fill();
      for (let i = 0; i < SLOTS; i++) { ctx.fillStyle = i >= SLOTS - 2 && tray.length >= SLOTS - 2 ? `rgba(200,40,40,${0.3 + Math.sin(tt * 8) * 0.15})` : 'rgba(0,0,0,.25)'; K.draw.rrect(ctx, trayX + i * slotW + 3, trayY + 3, slotW - 6, slotW - 6, 8); ctx.fill(); }
      const ssz = Math.round(slotW * DPR);
      tray.forEach((it, i) => { const tx = trayX + i * slotW, x = K.lerp(it.fx, tx, it.a), y = K.lerp(it.fy, trayY, it.a), s = K.lerp(ts, slotW, it.a); ctx.drawImage(tileImg(it.k, ssz), x, y, s, s); });
      K.fx.draw(ctx);
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); for (const k in cache) delete cache[k]; if (tiles.length) renderHud(); });
    K.music.set({ bpm: 72, chords: [[62, 65, 69], [60, 64, 67], [58, 62, 65], [57, 60, 64]], pad: true, padWave: 'triangle', lead: [74, 0, 0, 72, 0, 69, 0, 0, 67, 0, 69, 0, 0, 0, 0, 0], leadWave: 'sine', bass: true });
    showMenu();
  }
})();

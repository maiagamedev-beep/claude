/* Potion Sort — pour colored layers between flasks until each holds one color. Alchemist's shelf, 100 levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = 'Georgia, "Palatino Linotype", serif';
  const CAP = 4, LEVELS = 100;
  const COL = ['#ff4d6d', '#ffb703', '#8ac926', '#1982c4', '#9b5de5', '#f15bb5', '#00bbf9', '#fb8500', '#6a994e', '#e9c46a', '#8d99ae', '#ff006e', '#3a86ff', '#b5838d'];

  K.boot('potion_sort', { g: { lvl: 0, stars: {}, undo: 5, extra: 1 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, tw = 50, th = 170;
    let tubes = [], sel = -1, lvIdx = 0, playing = false, hist = [], pour = null, moves = 0, done = new Set(), bubbles = [];
    function levelCfg(i) { const colors = Math.min(COL.length, 3 + Math.floor(i / 6)), empty = colors > 9 ? 2 : 2; return { colors, empty }; }
    function startLevel(i) {
      lvIdx = i; const L = levelCfg(i), r = K.rng(i * 101 + 3);
      for (let tries = 0; tries < 50; tries++) {
        const pool = []; for (let c = 0; c < L.colors; c++) for (let k = 0; k < CAP; k++) pool.push(c);
        for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
        tubes = []; for (let c = 0; c < L.colors; c++) tubes.push(pool.slice(c * CAP, c * CAP + CAP));
        for (let e = 0; e < L.empty; e++) tubes.push([]);
        if (!tubes.some((t) => t.length === CAP && t.every((x) => x === t[0]))) break;
      }
      tubes = tubes.map((t) => ({ c: t, x: 0, y: 0, lift: 0, tilt: 0 }));
      sel = -1; hist = []; pour = null; moves = 0; done = new Set(); playing = true;
      K.std.hideMenu(); hud.style.display = bar.style.display = ''; K.game.start(); layout(); renderBar();
    }
    function layout() {
      const n = tubes.length || 6, perRow = n > 7 ? Math.ceil(n / 2) : n, rows = Math.ceil(n / perRow);
      tw = Math.min(64, (W - 20) / perRow - 14); th = Math.min(tw * 3.6, (H - 250) / rows - 40);
      const gapX = (W - perRow * tw) / (perRow + 1);
      tubes.forEach((t, i) => { const row = Math.floor(i / perRow), col = i % perRow, inRow = Math.min(perRow, n - row * perRow), gx = (W - inRow * tw) / (inRow + 1); t.x = gx + col * (tw + gx); t.y = 140 + row * (th + 50) + (H - 250 - rows * (th + 50)) / 2 + 20; });
      void gapX;
    }
    const top = (t) => t.c[t.c.length - 1];
    const topCount = (t) => { let n = 0; for (let i = t.c.length - 1; i >= 0 && t.c[i] === top(t); i--) n++; return n; };
    function canPour(a, b) { if (a === b || !tubes[a].c.length || tubes[b].c.length >= CAP) return false; return !tubes[b].c.length || top(tubes[b]) === top(tubes[a]); }
    function doPour(a, b) {
      hist.push(tubes.map((t) => t.c.slice()));
      const A = tubes[a], B = tubes[b], c = top(A), n = Math.min(topCount(A), CAP - B.c.length);
      pour = { a, b, c, n, t: 0 }; moves++;
      K.audio.play('whoosh', 0.8);
    }
    function finishPour() {
      const { a, b, c, n } = pour; pour = null;
      for (let k = 0; k < n; k++) { tubes[a].c.pop(); tubes[b].c.push(c); }
      K.audio.play('pop', 0.8 + tubes[b].c.length * 0.1);
      const B = tubes[b];
      if (B.c.length === CAP && B.c.every((x) => x === B.c[0]) && !done.has(b)) {
        done.add(b); K.meta.track('flasks', 1); K.audio.play('coin', 1.3);
        K.fx.burst(B.x + tw / 2, B.y, { n: 24, colors: [COL[c], '#fff', '#ffe08a'], speed: 260, shape: 'star', size: 6, life: 0.8 });
        B.cork = 0; K.tween(B, { cork: 1 }, 0.4, 'outBounce');
      }
      if (tubes.every((t) => !t.c.length || (t.c.length === CAP && t.c.every((x) => x === t.c[0])))) win();
      else if (!anyMove()) K.ui.toast(K.t(['No moves! Undo or add a flask.', 'Sem jogadas! Desfaça ou adicione um frasco.']));
    }
    function anyMove() { for (let a = 0; a < tubes.length; a++) for (let b = 0; b < tubes.length; b++) if (canPour(a, b) && !(tubes[b].c.length === 0 && topCount(tubes[a]) === tubes[a].c.length)) return true; return false; }
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(COL);
      const L = levelCfg(lvIdx), par = L.colors * 2 + 2, stars = moves <= par ? 3 : moves <= par * 1.5 ? 2 : 1;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars); if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(12); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Potions sorted!', 'Poções separadas!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t(['Moves', 'Jogadas']), moves]], coins: 20 + lvIdx * 3 + stars * 10, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 900);
    }
    function undo() {
      if (pour || !hist.length) return K.audio.play('error');
      if (G.undo <= 0) return offer('undo', 5);
      G.undo--; const s = hist.pop(); tubes.forEach((t, i) => (t.c = s[i])); done = new Set([...done].filter((i) => tubes[i].c.length === CAP)); K.audio.play('whoosh'); renderBar(); K.save.mark();
    }
    function addFlask() {
      if (tubes.length >= 16 || tubes.some((t) => t.small)) return K.audio.play('error');
      if (G.extra <= 0) return offer('extra', 1);
      G.extra--; tubes.push({ c: [], x: 0, y: 0, lift: 0, tilt: 0, small: true }); layout(); K.audio.play('power'); renderBar(); K.save.mark();
    }
    function offer(k, n) {
      const p = K.ui.panel({ title: k === 'undo' ? '↶' : '⚗', body: `<p>${K.t(['Get more', 'Ganhe mais'])}</p>` });
      p.foot.appendChild(K.ui.adBtn('+' + n + ' ' + K.t('free'), () => { G[k] += n; K.save.mark(); p.close(); renderBar(); }));
      p.foot.appendChild(K.ui.btn('+' + n + ' · ' + K.icon.coin + ' ' + (k === 'undo' ? 150 : 250), '', () => { if (K.meta.spend(k === 'undo' ? 150 : 250)) { G[k] += n; p.close(); renderBar(); } }));
      p.panel.appendChild(p.foot);
    }
    cv.addEventListener('pointerdown', (e) => {
      if (!playing || pour || K.ui.anyOpen()) return;
      const i = tubes.findIndex((t) => e.clientX >= t.x - 8 && e.clientX <= t.x + tw + 8 && e.clientY >= t.y - 30 && e.clientY <= t.y + th + 10);
      if (i < 0) { if (sel >= 0) { tubes[sel].lift = 0; sel = -1; } return; }
      if (sel < 0) { if (!tubes[i].c.length || done.has(i)) return K.audio.play('error'); sel = i; K.tween(tubes[i], { lift: 1 }, 0.15, 'outBack'); K.audio.play('tap', 1.3); return; }
      if (sel === i) { K.tween(tubes[i], { lift: 0 }, 0.15); sel = -1; return; }
      if (canPour(sel, i)) { const a = sel; sel = -1; doPour(a, i); }
      else { K.audio.play('error'); K.tween(tubes[sel], { lift: 0 }, 0.15); sel = tubes[i].c.length && !done.has(i) ? i : -1; if (sel >= 0) K.tween(tubes[sel], { lift: 1 }, 0.15, 'outBack'); }
    });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap a flask, then another, to pour the top color. You can only pour onto the same color or into an empty flask. Sort each color into its own flask.', pt: 'Toque num frasco e depois em outro para despejar a cor de cima. Só dá para despejar sobre a mesma cor ou num frasco vazio. Separe cada cor no seu frasco.' },
      missions: [{ stat: 'flasks', base: 20, reward: 80, text: { en: 'Fill {n} flasks', pt: 'Complete {n} frascos' } }, { stat: 'levels', base: 4, reward: 110, text: { en: 'Clear {n} levels', pt: 'Complete {n} fases' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'psbar'); K.ui.root.appendChild(bar);
    function renderBar() {
      bar.innerHTML = '';
      bar.appendChild(K.ui.btn('↶ ' + G.undo, 'sm', undo));
      bar.appendChild(K.ui.btn('⚗+ ' + G.extra, 'sm', addFlask));
      bar.appendChild(K.ui.btn('⟲', 'sm', () => startLevel(lvIdx)));
      bar.appendChild(K.ui.btn('⌂', 'sm', showMenu));
    }
    function showMenu() {
      playing = false; hud.style.display = bar.style.display = 'none';
      K.std.menu({ title: 'Potion<span>Sort</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => startLevel(G.lvl), buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); startLevel(i); }))] });
    }

    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      if (pour) { pour.t += dt / 0.55; if (pour.t >= 1) finishPour(); }
      if (playing) hud.innerHTML = `<span class="chip">${K.t('level')} ${lvIdx + 1}</span><span class="chip">${K.t(['Moves', 'Jogadas'])} ${moves}</span>`;
      if (Math.random() < dt * 6 && tubes.length) { const t = K.pick(tubes); if (t.c.length) bubbles.push({ t, x: K.rand(0.2, 0.8), y: 1, v: K.rand(0.2, 0.5), r: K.rand(1.5, 3) }); }
      bubbles.forEach((b) => (b.y -= b.v * dt)); bubbles = bubbles.filter((b) => b.y > 1 - b.t.c.length / CAP);
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b1e3a'); gr.addColorStop(1, '#4b2e3f'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // shelves & candles
      tubes.forEach((t) => {});
      const shelfYs = [...new Set(tubes.map((t) => Math.round(t.y + th)))];
      shelfYs.forEach((y) => { ctx.fillStyle = '#6b4226'; ctx.fillRect(0, y + 8, W, 14); ctx.fillStyle = '#4a2c18'; ctx.fillRect(0, y + 22, W, 6); });
      for (const cx of [30, W - 30]) { ctx.fillStyle = '#f3e3c3'; ctx.fillRect(cx - 6, 90, 12, 40); const f = 1 + Math.sin(tt * 12 + cx) * 0.15; const g2 = ctx.createRadialGradient(cx, 84, 0, cx, 84, 60 * f); g2.addColorStop(0, 'rgba(255,200,100,.35)'); g2.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = g2; ctx.fillRect(cx - 60, 24, 120, 120); ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.ellipse(cx, 84, 4, 9 * f, 0, 0, 6.283); ctx.fill(); }
      if (!tubes.length) return;
      const segH = (th - 16) / CAP;
      tubes.forEach((t, i) => {
        let x = t.x, y = t.y - t.lift * 26, ang = 0;
        const pouringFrom = pour && pour.a === i;
        if (pouringFrom) { const B = tubes[pour.b], k = Math.min(1, pour.t * 3), bk = pour.t > 0.75 ? (1 - pour.t) * 4 : 1; x = K.lerp(t.x, B.x + (B.x > t.x ? -tw * 0.9 : tw * 0.9), k * bk); y = K.lerp(t.y, B.y - th * 0.55, k * bk); ang = (B.x > t.x ? 1 : -1) * 1.15 * k * bk; }
        ctx.save(); ctx.translate(x + tw / 2, y); ctx.rotate(ang);
        // liquid (clipped to tube)
        ctx.save(); K.draw.rrect(ctx, -tw / 2 + 4, 4, tw - 8, th - 8, tw * 0.4); ctx.clip();
        let layers = t.c.slice();
        if (pour && pour.a === i && pour.t > 0.33) { const drain = Math.min(1, (pour.t - 0.33) / 0.4) * pour.n; for (let k = 0; k < Math.floor(drain); k++) layers.pop(); }
        const bottom = (th - 6) * Math.cos(ang) + (tw / 2) * Math.abs(Math.sin(ang)), sh = segH * Math.max(0.3, Math.cos(ang));
        ctx.rotate(-ang); // keep liquid level horizontal
        layers.forEach((c, k) => { ctx.fillStyle = COL[c]; ctx.fillRect(-th, bottom - (k + 1) * sh - (k === layers.length - 1 ? 2 : 0), th * 2, sh + 1); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-th, bottom - (k + 1) * sh, th * 2, 3); });
        if (pour && pour.b === i && pour.t > 0.33) { const add = Math.min(1, (pour.t - 0.33) / 0.4) * pour.n; ctx.fillStyle = COL[pour.c]; ctx.fillRect(-tw, bottom - (layers.length + add) * segH, tw * 2, add * segH); }
        bubbles.forEach((b) => { if (b.t === t) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(-tw / 2 + b.x * tw, 6 + b.y * (th - 12), b.r, 0, 6.283); ctx.fill(); } });
        ctx.restore();
        // glass
        ctx.strokeStyle = 'rgba(230,240,255,.85)'; ctx.lineWidth = 3; K.draw.rrect(ctx, -tw / 2 + 2, 0, tw - 4, th, tw * 0.42); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-tw / 2 + 7, 10, 6, th - 30);
        ctx.fillStyle = 'rgba(230,240,255,.9)'; ctx.fillRect(-tw / 2 - 2, -4, tw + 4, 8);
        if (t.cork) { ctx.fillStyle = '#b07d4f'; ctx.fillRect(-tw / 2 + 6, -14 * t.cork - 4, tw - 12, 14); }
        ctx.restore();
        // pouring stream
        if (pouringFrom && pour.t > 0.33 && pour.t < 0.75) { const B = tubes[pour.b]; ctx.strokeStyle = COL[pour.c]; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(B.x + tw / 2 + (B.x > t.x ? -tw * 0.25 : tw * 0.25), B.y - th * 0.55 + 6); ctx.lineTo(B.x + tw / 2, B.y + th - 10 - (B.c.length + 0.5) * segH); ctx.stroke(); }
      });
      K.fx.draw(ctx); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); });
    K.music.set({ bpm: 76, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], pad: true, padWave: 'triangle', arp: [1, 0, 1, 0, 0, 1, 0, 0], arpWave: 'sine', bass: true });
    renderBar(); showMenu();
  }
})();

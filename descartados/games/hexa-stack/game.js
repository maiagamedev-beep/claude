/* Hexa Stack — drop stacks of hex tiles, same colors slide together, 10 on top clears. 50 levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const COL = ['#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5', '#f78c6b', '#ef476f', '#83c5be'];
  const CLEAR = 10, LEVELS = 50;

  K.boot('hexa_stack', { g: { lvl: 0, stars: {}, hammer: 2, swap: 2 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, R = 30, cx0 = 0, cy0 = 0, TH = 5;
    let cells = [], tray = [], lvIdx = 0, goal = 0, cleared = 0, playing = false, busy = false, drag = null, moving = [], colors = 4, tool = null;
    const levelCfg = (i) => ({ radius: i < 6 ? 2 : 3, colors: Math.min(COL.length, 3 + Math.floor(i / 5)), goal: 40 + i * 12, blocked: Math.min(6, Math.floor(i / 7)) });
    function axial(q, r) { return { x: cx0 + R * 1.5 * q, y: cy0 + R * Math.sqrt(3) * (r + q / 2) * 0.72 }; }
    function layout() { const L = levelCfg(lvIdx); const n = L.radius * 2 + 1; R = Math.min((W - 30) / (n * 1.5 + 0.5), (H - 330) / (n * 1.25 + 2), 46); TH = R * 0.16; cx0 = W / 2; cy0 = 120 + R * n * 0.72 * 0.9 + R; }
    function startLevel(i) {
      lvIdx = i; const L = levelCfg(i), r = K.rng(i * 37 + 1); colors = L.colors; goal = L.goal; cleared = 0;
      cells = [];
      for (let q = -L.radius; q <= L.radius; q++) for (let rr = -L.radius; rr <= L.radius; rr++) if (Math.abs(q + rr) <= L.radius) cells.push({ q, r: rr, s: [], lock: false });
      for (let b = 0; b < L.blocked; b++) { const c = cells[Math.floor(r() * cells.length)]; if (c.q || c.r) c.lock = true; }
      // a few starting stacks
      for (let k = 0; k < 3 + Math.floor(i / 10); k++) { const c = K.pick(cells.filter((x) => !x.lock && !x.s.length)); if (c) c.s = makeStack(2, 4); }
      layout(); refill(); playing = true; busy = false; tool = null;
      K.std.hideMenu(); hud.style.display = bar.style.display = ''; K.game.start(); renderBar();
    }
    function makeStack(min, max) { const n = K.randi(min, max), s = []; let c = Math.floor(Math.random() * colors); const parts = K.randi(1, 3); for (let p = 0; p < parts; p++) { const len = p === parts - 1 ? n - s.length : Math.max(1, Math.floor(n / parts)); for (let k = 0; k < len; k++) s.push(c); c = (c + K.randi(1, colors - 1)) % colors; } return s.slice(0, Math.max(1, n)); }
    function refill() { tray = [0, 1, 2].map(() => ({ s: makeStack(2, 6), a: 0 })); tray.forEach((t, i) => K.tween(t, { a: 1 }, 0.3 + i * 0.08, 'outBack')); }
    const neighbors = (c) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].map(([dq, dr]) => cells.find((x) => x.q === c.q + dq && x.r === c.r + dr)).filter(Boolean);
    const top = (c) => c.s[c.s.length - 1];
    const run = (c) => { let n = 0; for (let i = c.s.length - 1; i >= 0 && c.s[i] === top(c); i--) n++; return n; };
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    async function resolve(start) {
      busy = true; const q = [start]; let combo = 0;
      while (q.length) {
        const c = q.shift(); if (!c.s.length) continue;
        // pull matching runs from neighbors into this cell (prefer merging into the taller mixed stack)
        for (const n of neighbors(c)) {
          if (!n.s.length || n.lock || top(n) !== top(c)) continue;
          const k = run(n);
          for (let j = 0; j < k; j++) { const col = n.s.pop(); moving.push({ col, from: n, to: c, fromH: n.s.length + 1, toH: c.s.length + 1, t: -j * 0.06 }); c.s.push(col); }
          K.audio.play('swing', 1 + c.s.length * 0.03);
          await wait(160 + k * 60);
          q.push(n, c);
        }
        if (run(c) >= CLEAR) {
          const k = run(c); combo++;
          const p = axial(c.q, c.r);
          for (let j = 0; j < k; j++) { const col = c.s.pop(); K.fx.burst(p.x, p.y - (c.s.length + 1) * TH, { n: 3, colors: [COL[col], '#fff'], speed: 250, g: 300, size: R * 0.12, life: 0.6, shape: 'square' }); }
          cleared += k; K.meta.track('tiles', k);
          K.audio.play('merge', 1 + combo * 0.1); K.fx.shake(5 + combo * 2);
          K.fx.text(p.x, p.y - 40, '+' + k * (combo), { color: '#fff', stroke: '#2b2d42', size: 30 + combo * 4 });
          if (combo >= 2) K.fx.text(W / 2, 100, 'Combo x' + combo, { color: '#ffd166', stroke: '#2b2d42', size: 36 });
          q.push(...neighbors(c), c);
          await wait(250);
        }
      }
      busy = false; renderBar();
      if (cleared >= goal) return win();
      if (!cells.some((c) => !c.lock && !c.s.length)) return lose();
    }
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(COL);
      const free = cells.filter((c) => !c.lock && !c.s.length).length, stars = free >= cells.length * 0.5 ? 3 : free >= cells.length * 0.25 ? 2 : 1;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars); if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(15); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Level complete!', 'Fase completa!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), coins: 30 + lvIdx * 5 + stars * 12, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 800);
    }
    let revived = false;
    function lose() {
      playing = false; K.audio.play('lose');
      setTimeout(() => K.std.end({ text: K.t(['The board is full!', 'O tabuleiro encheu!']), rows: [[K.t(['Cleared', 'Limpos']), cleared + '/' + goal]], coins: 5 + Math.floor(cleared / 10),
        revive: revived ? null : () => { revived = true; cells.filter((c) => c.s.length).sort((a, b) => b.s.length - a.s.length).slice(0, 4).forEach((c) => (c.s = [])); playing = true; K.game.start(); }, reviveLabel: K.t(['Clear 4 stacks', 'Limpar 4 pilhas']), restart: () => { revived = false; startLevel(lvIdx); }, menu: showMenu }), 600);
    }

    /* ---------- input ---------- */
    const trayPos = (i) => ({ x: W / 2 + (i - 1) * Math.min(W / 3.2, R * 4), y: H - 90 });
    function cellAt(x, y) { let best = null, bd = R * 0.9; cells.forEach((c) => { const p = axial(c.q, c.r), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = c; } }); return best; }
    cv.addEventListener('pointerdown', (e) => {
      if (!playing || busy || K.ui.anyOpen()) return;
      if (tool) { const c = cellAt(e.clientX, e.clientY); if (!c || !c.s.length) return; if (tool === 'hammer') { c.s = []; G.hammer--; K.audio.play('explode'); K.fx.shake(8); const p = axial(c.q, c.r); K.fx.burst(p.x, p.y, { n: 30, colors: COL, speed: 300, shape: 'square', size: 6 }); } tool = null; K.save.mark(); renderBar(); return; }
      for (let i = 0; i < 3; i++) { const t = tray[i]; if (!t) continue; const p = trayPos(i); if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < R * 1.4) { drag = { i, x: e.clientX, y: e.clientY }; K.audio.play('tap', 1.3); return; } }
    });
    window.addEventListener('pointermove', (e) => { if (drag) { drag.x = e.clientX; drag.y = e.clientY; } });
    window.addEventListener('pointerup', () => {
      if (!drag) return; const d = drag; drag = null;
      const c = cellAt(d.x, d.y - R * 1.2);
      if (!c || c.lock || c.s.length) { K.audio.play('error'); return; }
      c.s = tray[d.i].s.slice(); tray[d.i] = null; c.drop = 1; K.tween(c, { drop: 0 }, 0.25, 'outBounce');
      K.audio.play('thud', 1.2); K.meta.track('placed', 1);
      if (tray.every((t) => !t)) refill();
      resolve(c);
    });

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Drag a stack from the bottom onto an empty hex. Neighbouring stacks with the same top color slide together. 10 or more tiles of one color on top disappear. Reach the goal before the board fills up.', pt: 'Arraste uma pilha de baixo para um hexágono vazio. Pilhas vizinhas com a mesma cor no topo se juntam. 10 ou mais peças da mesma cor no topo somem. Cumpra a meta antes do tabuleiro encher.' },
      missions: [{ stat: 'tiles', base: 150, reward: 80, text: { en: 'Clear {n} tiles', pt: 'Limpe {n} peças' } }, { stat: 'levels', base: 3, reward: 110, text: { en: 'Clear {n} levels', pt: 'Complete {n} fases' } }, { stat: 'placed', base: 40, reward: 60, text: { en: 'Place {n} stacks', pt: 'Coloque {n} pilhas' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'hxbar'); K.ui.root.appendChild(bar);
    function renderBar() {
      bar.innerHTML = '';
      bar.appendChild(K.ui.btn('🔨 ' + G.hammer, 'sm' + (tool === 'hammer' ? ' on' : ''), () => { if (G.hammer <= 0) { const p = K.ui.panel({ title: '🔨', body: '' }); p.foot.appendChild(K.ui.adBtn('+1 ' + K.t('free'), () => { G.hammer++; K.save.mark(); p.close(); renderBar(); })); p.foot.appendChild(K.ui.btn('+3 · ' + K.icon.coin + ' 300', '', () => { if (K.meta.spend(300)) { G.hammer += 3; p.close(); renderBar(); } })); p.panel.appendChild(p.foot); return; } tool = tool ? null : 'hammer'; renderBar(); }));
      bar.appendChild(K.ui.btn('🔄 ' + G.swap, 'sm', () => { if (G.swap <= 0) { const p = K.ui.panel({ title: '🔄', body: '' }); p.foot.appendChild(K.ui.adBtn('+1 ' + K.t('free'), () => { G.swap++; K.save.mark(); p.close(); renderBar(); })); p.panel.appendChild(p.foot); return; } G.swap--; refill(); K.audio.play('whoosh'); K.save.mark(); renderBar(); }));
      bar.appendChild(K.ui.btn('⌂', 'sm', showMenu));
    }
    function showMenu() {
      playing = false; hud.style.display = bar.style.display = 'none';
      K.std.menu({ title: 'Hexa<span>Stack</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => { revived = false; startLevel(G.lvl); }, buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); startLevel(i); }))] });
    }

    /* ---------- render ---------- */
    function hexPath(x, y, r, sq) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * sq); } ctx.closePath(); }
    function shade(hex, f) { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`; }
    function drawStack(x, y, s, r) {
      s.forEach((c, k) => { const yy = y - k * TH; hexPath(x, yy + TH * 0.6, r * 0.92, 0.72); ctx.fillStyle = shade(COL[c], 0.7); ctx.fill(); hexPath(x, yy, r * 0.92, 0.72); ctx.fillStyle = COL[c]; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); });
      if (s.length) { const yy = y - (s.length - 1) * TH; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `800 ${r * 0.45}px "Trebuchet MS"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let n = 0; for (let i = s.length - 1; i >= 0 && s[i] === s[s.length - 1]; i--) n++; if (n > 1) ctx.fillText(n, x, yy); }
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt); moving.forEach((m) => (m.t += dt * 5)); moving = moving.filter((m) => m.t < 1);
      if (playing) hud.innerHTML = `<span class="chip">${K.t('level')} ${lvIdx + 1}</span><span class="big">${Math.min(cleared, goal)}/${goal}</span>`;
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#caf0f8'); gr.addColorStop(1, '#90e0ef'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      if (!cells.length) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // board
      const sorted = cells.slice().sort((a, b) => axial(a.q, a.r).y - axial(b.q, b.r).y);
      sorted.forEach((c) => { const p = axial(c.q, c.r); hexPath(p.x, p.y + R * 0.18, R * 0.98, 0.72); ctx.fillStyle = '#5aa9c9'; ctx.fill(); hexPath(p.x, p.y, R * 0.98, 0.72); ctx.fillStyle = c.lock ? '#6c757d' : '#e8f7fb'; ctx.fill(); if (c.lock) { ctx.fillStyle = '#fff'; ctx.font = `${R * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔒', p.x, p.y); } });
      // hover highlight
      if (drag) { const c = cellAt(drag.x, drag.y - R * 1.2); if (c && !c.lock && !c.s.length) { const p = axial(c.q, c.r); hexPath(p.x, p.y, R * 0.98, 0.72); ctx.fillStyle = 'rgba(255,209,102,.6)'; ctx.fill(); } }
      sorted.forEach((c) => { const p = axial(c.q, c.r), movingTo = moving.filter((m) => m.to === c).length; drawStack(p.x, p.y - (c.drop || 0) * 40, c.s.slice(0, c.s.length - movingTo), R); });
      moving.forEach((m) => { if (m.t < 0) return; const a = axial(m.from.q, m.from.r), b = axial(m.to.q, m.to.r), k = K.ease.inOutQuad(Math.min(1, m.t)); const x = K.lerp(a.x, b.x, k), y = K.lerp(a.y - m.fromH * TH, b.y - m.toH * TH, k) - Math.sin(k * Math.PI) * 40; hexPath(x, y, R * 0.92, 0.72); ctx.fillStyle = COL[m.col]; ctx.fill(); });
      if (tool) { ctx.strokeStyle = '#ef476f'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.strokeRect(10, 100, W - 20, H - 220); ctx.setLineDash([]); }
      // tray
      for (let i = 0; i < 3; i++) { const t = tray[i]; if (!t) continue; const dragging = drag && drag.i === i; const p = dragging ? { x: drag.x, y: drag.y - R * 1.2 } : trayPos(i); ctx.globalAlpha = dragging ? 0.9 : 1; const sc = dragging ? 1 : t.a * 0.85; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sc, sc); drawStack(0, 0, t.s, R); ctx.restore(); ctx.globalAlpha = 1; }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); });
    K.music.set({ bpm: 98, chords: [[62, 66, 69], [59, 62, 66], [64, 67, 71], [57, 61, 64]], pad: true, arp: [1, 0, 1, 0, 1, 1, 0, 0], arpWave: 'sine', bass: true, drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    renderBar(); showMenu();
  }
})();

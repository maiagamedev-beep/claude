/* Bubble Bay — bubble shooter under the sea. Hex grid, bank shots, falling clusters, 50 levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const COLS = 11, S3 = Math.sqrt(3);
  const COL = ['#ff5e7e', '#ffc93c', '#4ecdc4', '#6c8cff', '#b77dff', '#7ddc6f'];
  const LEVELS = 50;
  function levelCfg(i) {
    const r = K.rng(i * 97 + 5), colors = Math.min(6, 3 + Math.floor(i / 6)), rows = Math.min(11, 5 + Math.floor(i / 5));
    const pattern = i % 5;
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < COLS - (y % 2); x++) {
      let on = true;
      if (pattern === 1) on = (x + y) % 4 !== 0;
      if (pattern === 2) on = Math.abs(x - 5) <= Math.max(1, 5 - Math.floor(y / 2)) + 1;
      if (pattern === 3) on = y < 2 || x % 3 !== 1;
      if (pattern === 4) on = !(y > 2 && y < rows - 1 && x > 2 && x < 8);
      if (!on) continue;
      // clusters of same color for satisfying pops
      const c = r() < 0.55 && cells.length ? cells[cells.length - 1].c : Math.floor(r() * colors);
      cells.push({ x, y, c });
    }
    return { cells, colors, shots: Math.max(22, Math.round(cells.length * 0.55)), drop: Math.max(5, 9 - Math.floor(i / 8)) };
  }

  K.boot('bubble_bay', { g: { lvl: 0, stars: {}, bo: { bomb: 1, rainbow: 1, aim: 2 } } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, R = 20, bx = 0, by = 0, bw = 0, bh = 0;
    function layout() { bw = Math.min(W - 16, (H - 150) * 0.66, 560); R = bw / (COLS * 2); bx = (W - bw) / 2; by = 110; bh = H - by - 20; }

    /* ---------- bubble painter ---------- */
    const cache = {};
    function bub(c) {
      const s = Math.round(R * 2 * DPR), key = c + '_' + s;
      if (cache[key]) return cache[key];
      const cn = document.createElement('canvas'); cn.width = cn.height = s; const g = cn.getContext('2d'), r = s / 2;
      if (c === 'bomb') { g.fillStyle = '#2b2d42'; g.beginPath(); g.arc(r, r, r * 0.92, 0, 6.283); g.fill(); g.fillStyle = '#ffb703'; K.draw.star(g, r, r, r * 0.55, r * 0.25, 8); g.fill(); }
      else if (c === 'rainbow') { for (let i = 0; i < 6; i++) { g.fillStyle = COL[i]; g.beginPath(); g.moveTo(r, r); g.arc(r, r, r * 0.92, (i / 6) * 6.283, ((i + 1) / 6) * 6.283); g.fill(); } }
      else {
        const gr = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
        gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, COL[c]); gr.addColorStop(1, shade(COL[c], -0.35));
        g.fillStyle = gr; g.beginPath(); g.arc(r, r, r * 0.92, 0, 6.283); g.fill();
        // tiny creature face inside each bubble (a different sea friend per color)
        g.fillStyle = 'rgba(30,20,50,.75)'; g.beginPath(); g.arc(r * 0.78, r * 1.05, r * 0.09, 0, 6.283); g.arc(r * 1.22, r * 1.05, r * 0.09, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(30,20,50,.6)'; g.lineWidth = r * 0.07; g.beginPath(); g.arc(r, r * 1.2, r * 0.16, 0.3, Math.PI - 0.3); g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(r * 0.62, r * 0.5, r * 0.22, r * 0.12, -0.6, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(r, r, r * 0.9, 0, 6.283); g.stroke();
      return (cache[key] = cn);
    }
    function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let rr = n >> 16, gg = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return `rgb(${f(rr)},${f(gg)},${f(b)})`; }

    /* ---------- grid ---------- */
    let grid = new Map(), parity = 0, L = null, lvIdx = 0, shots = 0, shotsSinceDrop = 0, cur = null, next = null, flying = null, falling = [], popping = [], playing = false, score = 0, aimA = -Math.PI / 2, aiming = false, revived = false, special = null, longAim = 0;
    const key = (x, y) => y * 100 + x;
    const odd = (y) => (y + parity) % 2 === 1;
    const cellPos = (x, y) => ({ x: bx + R + x * 2 * R + (odd(y) ? R : 0), y: by + R + y * R * S3 });
    const maxX = (y) => COLS - 1 - (odd(y) ? 1 : 0);
    function neighbors(x, y) { const o = odd(y); return [[x - 1, y], [x + 1, y], [x + (o ? 0 : -1), y - 1], [x + (o ? 1 : 0), y - 1], [x + (o ? 0 : -1), y + 1], [x + (o ? 1 : 0), y + 1]].filter(([a, b]) => b >= 0 && a >= 0 && a <= maxX(b)); }
    function colorsLeft() { const s = new Set(); grid.forEach((b) => s.add(b.c)); return [...s]; }
    function newBubble() { const cl = colorsLeft(); return { c: cl.length ? K.pick(cl) : 0 }; }
    function startLevel(i) {
      lvIdx = i; L = levelCfg(i); grid = new Map(); parity = 0;
      L.cells.forEach((c) => grid.set(key(c.x, c.y), { x: c.x, y: c.y, c: c.c, s: 0 }));
      grid.forEach((b) => K.tween(b, { s: 1 }, 0.3 + b.y * 0.04, 'outBack'));
      shots = L.shots; shotsSinceDrop = 0; flying = null; falling = []; popping = []; score = 0; revived = false; special = null; longAim = 0;
      cur = newBubble(); next = newBubble(); playing = true;
      K.std.hideMenu(); hud.style.display = bar.style.display = ''; K.game.start(); renderHud();
    }

    /* ---------- shooting ---------- */
    const shooter = () => ({ x: W / 2, y: H - 70 });
    function shoot() {
      if (!playing || flying || K.ui.anyOpen()) return;
      const a = K.clamp(aimA, -Math.PI + 0.12, -0.12), sp = 1100, s = shooter();
      flying = { x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: special || cur.c };
      if (special) { special = null; } else { cur = next; next = newBubble(); }
      shots--; shotsSinceDrop++; longAim = Math.max(0, longAim - 1);
      K.audio.play('shoot', 0.9); renderHud();
    }
    function stepFlying(dt) {
      if (!flying) return;
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        flying.x += (flying.vx * dt) / steps; flying.y += (flying.vy * dt) / steps;
        if (flying.x < bx + R) { flying.x = bx + R; flying.vx = Math.abs(flying.vx); K.audio.play('tick'); }
        if (flying.x > bx + bw - R) { flying.x = bx + bw - R; flying.vx = -Math.abs(flying.vx); K.audio.play('tick'); }
        let hit = flying.y < by + R;
        if (!hit) for (const b of grid.values()) { const p = cellPos(b.x, b.y); if ((p.x - flying.x) ** 2 + (p.y - flying.y) ** 2 < (R * 1.75) ** 2) { hit = true; break; } }
        if (hit) { snap(); return; }
      }
    }
    function snap() {
      const f = flying; flying = null;
      let y = Math.max(0, Math.round((f.y - by - R) / (R * S3)));
      let best = null, bd = 1e9;
      for (let yy = Math.max(0, y - 1); yy <= y + 1; yy++) for (let xx = 0; xx <= maxX(yy); xx++) {
        if (grid.has(key(xx, yy))) continue;
        if (yy > 0 && !neighbors(xx, yy).some(([a, b]) => grid.has(key(a, b)))) continue;
        const p = cellPos(xx, yy), d = (p.x - f.x) ** 2 + (p.y - f.y) ** 2; if (d < bd) { bd = d; best = [xx, yy]; }
      }
      if (!best) best = [Math.round((f.x - bx - R) / (2 * R)), y];
      const b = { x: K.clamp(best[0], 0, maxX(best[1])), y: best[1], c: f.c, s: 1.2 };
      grid.set(key(b.x, b.y), b); K.tween(b, { s: 1 }, 0.2, 'outBack');
      K.audio.play('land', 1.5);
      // jiggle neighbors
      neighbors(b.x, b.y).forEach(([a, c]) => { const n = grid.get(key(a, c)); if (n) { n.s = 0.9; K.tween(n, { s: 1 }, 0.25, 'outElastic'); } });
      resolve(b);
    }
    function resolve(b) {
      let popped = [];
      if (b.c === 'bomb') { popped = [b]; neighbors(b.x, b.y).forEach(([a, c]) => { const n = grid.get(key(a, c)); if (n) { popped.push(n); neighbors(a, c).forEach(([d, e]) => { const m = grid.get(key(d, e)); if (m && !popped.includes(m)) popped.push(m); }); } }); K.fx.shake(10); K.audio.play('explode'); }
      else {
        let color = b.c;
        if (color === 'rainbow') { const ns = neighbors(b.x, b.y).map(([a, c]) => grid.get(key(a, c))).filter((n) => n && typeof n.c === 'number'); color = ns.length ? ns[0].c : 0; b.c = color; }
        const seen = new Set([key(b.x, b.y)]), q = [b];
        while (q.length) { const c = q.pop(); popped.push(c); neighbors(c.x, c.y).forEach(([a, d]) => { const k = key(a, d), n = grid.get(k); if (n && !seen.has(k) && n.c === color) { seen.add(k); q.push(n); } }); }
        if (popped.length < 3) popped = [];
      }
      if (popped.length) {
        popped.forEach((p, i) => { grid.delete(key(p.x, p.y)); popping.push({ b: p, t: -i * 0.03 }); });
        score += popped.length * 10;
        K.meta.track('pops', popped.length);
        setTimeout(() => K.audio.play('pop', 1 + Math.min(1, popped.length * 0.05)), 0);
        // floating clusters
        const conn = new Set(), q = [];
        grid.forEach((n, k) => { if (n.y === 0) { conn.add(k); q.push(n); } });
        while (q.length) { const c = q.pop(); neighbors(c.x, c.y).forEach(([a, d]) => { const k = key(a, d); if (grid.has(k) && !conn.has(k)) { conn.add(k); q.push(grid.get(k)); } }); }
        const drop = []; grid.forEach((n, k) => { if (!conn.has(k)) drop.push(n); });
        drop.forEach((n) => { grid.delete(key(n.x, n.y)); const p = cellPos(n.x, n.y); falling.push({ c: n.c, x: p.x, y: p.y, vx: K.rand(-80, 80), vy: K.rand(-200, 0) }); });
        if (drop.length) { score += drop.length * 25; K.fx.text(W / 2, H * 0.45, K.t(['Drop!', 'Queda!']) + ' +' + drop.length * 25, { color: '#ffc93c', stroke: '#1b3a5b', size: 30 + Math.min(20, drop.length) }); K.audio.play('combo'); K.meta.track('drops', drop.length); if (drop.length > 8) { K.fx.shake(8); K.game.happy(); } }
        shotsSinceDrop = Math.max(0, shotsSinceDrop - 1);
      }
      if (!grid.size) return win();
      if (shotsSinceDrop >= L.drop) { shotsSinceDrop = 0; pushRow(); }
      if (lowest() >= maxRows()) return lose(K.t(['The bubbles reached the reef!', 'As bolhas chegaram ao recife!']));
      if (shots <= 0) return lose(K.t(['Out of bubbles!', 'Acabaram as bolhas!']));
      if (!colorsLeft().includes(cur.c) && typeof cur.c === 'number') cur = newBubble();
      if (!colorsLeft().includes(next.c) && typeof next.c === 'number') next = newBubble();
      renderHud();
    }
    function pushRow() {
      const nm = new Map(); grid.forEach((b) => { b.y++; nm.set(key(b.x, b.y), b); }); grid = nm; parity = 1 - parity;
      const cl = colorsLeft();
      for (let x = 0; x <= maxX(0); x++) { const b = { x, y: 0, c: K.pick(cl.length ? cl : [0]), s: 0 }; grid.set(key(x, 0), b); K.tween(b, { s: 1 }, 0.3, 'outBack'); }
      K.fx.shake(6); K.audio.play('thud');
    }
    const lowest = () => { let m = -1; grid.forEach((b) => (m = Math.max(m, b.y))); return m; };
    const maxRows = () => Math.floor((H - 70 - R * 3 - by) / (R * S3));
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(COL);
      const bonus = shots * 50; score += bonus;
      const stars = shots >= L.shots * 0.4 ? 3 : shots >= L.shots * 0.2 ? 2 : 1;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars);
      if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(20); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Bay cleared!', 'Baía limpa!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t('score'), score], [K.t(['Bubbles left', 'Bolhas sobrando']), shots]], coins: 40 + lvIdx * 6 + stars * 20, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 900);
    }
    function lose(text) {
      playing = false; K.audio.play('lose');
      setTimeout(() => K.std.end({ text, rows: [[K.t('score'), score]], coins: 10 + Math.floor(score / 50), revive: revived ? null : () => { revived = true; shots += 8; const ks = [...grid.values()].sort((a, b) => b.y - a.y).slice(0, COLS * 2); ks.forEach((b) => { grid.delete(key(b.x, b.y)); const p = cellPos(b.x, b.y); falling.push({ c: b.c, x: p.x, y: p.y, vx: 0, vy: 0 }); }); playing = true; K.game.start(); renderHud(); if (!grid.size) win(); }, reviveLabel: K.t(['+8 bubbles & clear 2 rows', '+8 bolhas e limpa 2 fileiras']), restart: () => startLevel(lvIdx), menu: showMenu }), 700);
    }

    /* ---------- input ---------- */
    const aimAt = (x, y) => { const s = shooter(); aimA = Math.atan2(Math.min(y, s.y - 20) - s.y, x - s.x); };
    cv.addEventListener('pointerdown', (e) => { if (!playing) return; aiming = true; aimAt(e.clientX, e.clientY); });
    window.addEventListener('pointermove', (e) => { if (playing && (aiming || e.pointerType === 'mouse')) aimAt(e.clientX, e.clientY); });
    window.addEventListener('pointerup', (e) => { if (!aiming) return; aiming = false; const s = shooter(); if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 40) { swap(); return; } shoot(); });
    window.addEventListener('keydown', (e) => { if (!playing) return; if (e.code === 'ArrowLeft') aimA -= 0.06; if (e.code === 'ArrowRight') aimA += 0.06; if (e.code === 'Space') { e.preventDefault(); shoot(); } if (e.code === 'KeyS') swap(); aimA = K.clamp(aimA, -Math.PI + 0.12, -0.12); });
    function swap() { if (!playing || special) return; const t = cur; cur = next; next = t; K.audio.play('swing'); }

    /* ---------- boosters ---------- */
    const BO = { bomb: { ic: '💣', n: ['Bomb', 'Bomba'], p: 250 }, rainbow: { ic: '🌈', n: ['Rainbow', 'Arco-íris'], p: 250 }, aim: { ic: '🎯', n: ['Long aim', 'Mira longa'], p: 150 } };
    function useBo(k) {
      if (!playing || flying) return;
      if (G.bo[k] <= 0) {
        const pnl = K.ui.panel({ title: BO[k].ic + ' ' + K.t(BO[k].n), body: `<p>${K.t(['Get more boosters', 'Ganhe mais itens'])}</p>` });
        pnl.foot.appendChild(K.ui.adBtn('+1 ' + K.t('free'), () => { G.bo[k]++; K.save.mark(); renderHud(); pnl.close(); }));
        pnl.foot.appendChild(K.ui.btn('+3 · ' + K.icon.coin + ' ' + BO[k].p * 2, '', () => { if (K.meta.spend(BO[k].p * 2)) { G.bo[k] += 3; renderHud(); pnl.close(); } }));
        pnl.panel.appendChild(pnl.foot); return;
      }
      G.bo[k]--; K.meta.track('boosters', 1); K.save.mark(); K.audio.play('power');
      if (k === 'aim') longAim = 6; else special = k;
      renderHud();
    }

    /* ---------- meta & HUD ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Aim with the mouse or finger and release to shoot (or arrows + Space). Match 3 or more bubbles of the same color. Bank shots off the walls. Tap the launcher (or S) to swap bubbles. Clear the bay before the bubbles reach the reef.', pt: 'Mire com o mouse ou dedo e solte para atirar (ou setas + Espaço). Junte 3 ou mais bolhas da mesma cor. Use as paredes para tabelas. Toque no lançador (ou S) para trocar. Limpe a baía antes das bolhas chegarem ao recife.' },
      missions: [
        { stat: 'pops', base: 200, reward: 80, text: { en: 'Pop {n} bubbles', pt: 'Estoure {n} bolhas' } },
        { stat: 'drops', base: 40, reward: 90, text: { en: 'Drop {n} bubbles', pt: 'Derrube {n} bolhas' } },
        { stat: 'levels', base: 3, reward: 110, text: { en: 'Clear {n} levels', pt: 'Complete {n} fases' } },
        { stat: 'boosters', base: 2, reward: 70, text: { en: 'Use {n} boosters', pt: 'Use {n} itens' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'bbar'); K.ui.root.appendChild(bar);
    Object.keys(BO).forEach((k) => { const b = K.el('button', 'bo', `<span>${BO[k].ic}</span><i></i>`); b.dataset.k = k; b.title = K.t(BO[k].n); b.onclick = (e) => { e.stopPropagation(); K.audio.play('click'); useBo(k); }; bar.appendChild(b); });
    const home = K.el('button', 'bo', '<span>⌂</span>'); home.onclick = () => { K.audio.play('click'); showMenu(); }; bar.appendChild(home);
    function renderHud() {
      hud.innerHTML = `<span class="chip">${K.t('level')} ${lvIdx + 1}</span><span class="big">${score}</span><span class="chip">◯ ${shots}</span>`;
      bar.querySelectorAll('.bo[data-k]').forEach((b) => { const n = G.bo[b.dataset.k]; b.querySelector('i').textContent = n > 0 ? n : '+'; });
    }
    function showMenu() {
      playing = false; hud.style.display = bar.style.display = 'none';
      K.std.menu({ title: 'Bubble<span>Bay</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => startLevel(G.lvl), buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); startLevel(i); }))] });
      if (!L) { L = levelCfg(G.lvl); grid = new Map(); L.cells.forEach((c) => grid.set(key(c.x, c.y), { x: c.x, y: c.y, c: c.c, s: 1 })); cur = newBubble(); next = newBubble(); }
    }

    /* ---------- render ---------- */
    let tt = 0;
    const fishes = Array.from({ length: 7 }, () => ({ x: Math.random(), y: 0.3 + Math.random() * 0.6, s: 0.5 + Math.random(), v: 0.02 + Math.random() * 0.04, c: K.pick(['rgba(255,255,255,.12)', 'rgba(255,201,60,.18)', 'rgba(255,94,126,.15)']) }));
    K.loop((dt) => {
      tt += dt; K.fx.update(dt); stepFlying(dt);
      for (const f of falling) { f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
      falling = falling.filter((f) => f.y < H + 50);
      popping.forEach((p) => (p.t += dt));
      popping = popping.filter((p) => { if (p.t > 0 && !p.done) { p.done = true; const q = cellPos(p.b.x, p.b.y); K.fx.burst(q.x, q.y, { n: 8, colors: [typeof p.b.c === 'number' ? COL[p.b.c] : '#fff', '#fff'], speed: 220, g: 200, size: R * 0.25, life: 0.45 }); } return p.t < 0.15; });
      fishes.forEach((f) => { f.x += f.v * dt; if (f.x > 1.2) f.x = -0.2; });
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5ec8e5'); gr.addColorStop(0.6, '#2a7fb8'); gr.addColorStop(1, '#1b3a5b');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // light rays
      ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) { const x = ((i / 6) * W + Math.sin(tt * 0.3 + i) * 40); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 200, H); ctx.lineTo(x + 100, H); ctx.fill(); }
      ctx.restore();
      fishes.forEach((f) => { const x = f.x * W, y = f.y * H + Math.sin(tt + f.s * 5) * 10, s = 18 * f.s; ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.5, 0, 0, 6.283); ctx.moveTo(x - s, y); ctx.lineTo(x - s * 1.6, y - s * 0.5); ctx.lineTo(x - s * 1.6, y + s * 0.5); ctx.fill(); });
      // reef at bottom
      ctx.fillStyle = '#e8866a'; for (let i = 0; i < 9; i++) { const x = (i / 8) * W; ctx.beginPath(); ctx.ellipse(x, H + 10, 60, 40 + (i % 3) * 14, 0, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = '#f4b183'; for (let i = 0; i < 9; i++) { const x = (i / 8) * W + 40; ctx.beginPath(); ctx.ellipse(x, H + 20, 40, 30 + (i % 2) * 18, 0, 0, 6.283); ctx.fill(); }
      if (!L) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; K.draw.rrect(ctx, bx - 6, by - 6, bw + 12, H - by - 60, 20); ctx.fill();
      // danger line
      const dl = by + R + maxRows() * R * S3 - R;
      ctx.strokeStyle = lowest() >= maxRows() - 2 ? `rgba(255,94,126,${0.5 + Math.sin(tt * 8) * 0.3})` : 'rgba(255,255,255,.2)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, dl); ctx.lineTo(bx + bw, dl); ctx.stroke(); ctx.setLineDash([]);
      grid.forEach((b) => { const p = cellPos(b.x, b.y), s = R * 2 * b.s, bob = Math.sin(tt * 2 + b.x + b.y) * 1.2; ctx.drawImage(bub(b.c), p.x - s / 2, p.y - s / 2 + bob, s, s); });
      popping.forEach((p) => { if (p.t < 0) { const q = cellPos(p.b.x, p.b.y); ctx.drawImage(bub(p.b.c), q.x - R, q.y - R, R * 2, R * 2); } else { const q = cellPos(p.b.x, p.b.y), k = p.t / 0.15; ctx.globalAlpha = 1 - k; ctx.drawImage(bub(p.b.c), q.x - R * (1 + k), q.y - R * (1 + k), R * 2 * (1 + k), R * 2 * (1 + k)); ctx.globalAlpha = 1; } });
      falling.forEach((f) => ctx.drawImage(bub(f.c), f.x - R, f.y - R, R * 2, R * 2));
      if (playing) {
        // aim guide with wall bounce
        const s = shooter(), a = K.clamp(aimA, -Math.PI + 0.12, -0.12);
        let x = s.x, y = s.y, vx = Math.cos(a), vy = Math.sin(a), len = longAim > 0 ? 1600 : 420;
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        for (let d = 0; d < len; d += 4) {
          x += vx * 4; y += vy * 4;
          if (x < bx + R || x > bx + bw - R) vx = -vx;
          if (y < by) break;
          let hit = false; for (const b of grid.values()) { const p = cellPos(b.x, b.y); if ((p.x - x) ** 2 + (p.y - y) ** 2 < (R * 1.75) ** 2) { hit = true; break; } }
          if (hit) break;
          if (d % 24 === 0) { ctx.beginPath(); ctx.arc(x, y, 3 - (d / len) * 1.5, 0, 6.283); ctx.fill(); }
        }
        // launcher: a friendly turtle shell
        ctx.fillStyle = '#3aa76d'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 22, 58, 26, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#2d8657'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(s.x + k * 26, s.y + 12, 10, 0, 6.283); ctx.fill(); }
        const c = special || cur.c; ctx.drawImage(bub(c), s.x - R * 1.1, s.y - R * 1.1, R * 2.2, R * 2.2);
        if (!special) ctx.drawImage(bub(next.c), s.x + 60, s.y + 4, R * 1.3, R * 1.3);
      }
      if (flying) ctx.drawImage(bub(flying.c), flying.x - R, flying.y - R, R * 2, R * 2);
      K.fx.draw(ctx);
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
    });

    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); for (const k in cache) delete cache[k]; });
    K.music.set({ bpm: 88, chords: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], bass: true, pad: true, padWave: 'sine', arp: [1, 0, 0, 1, 0, 0, 1, 0], arpWave: 'sine', drums: { k: [1, 0, 0, 0, 0, 0, 1, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

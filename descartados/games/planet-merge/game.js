/* Planet Merge — drop space bodies into the jar; two equal ones merge into the next size, up to the Sun. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const BODIES = [
    { n: 'Pebble', r: 0.045, c: '#b8b8c8', d: '#8a8aa0' }, { n: 'Moonlet', r: 0.06, c: '#d9d4c7', d: '#aaa391' }, { n: 'Comet', r: 0.078, c: '#9ee7ff', d: '#4cc3e8' },
    { n: 'Mercury', r: 0.096, c: '#c9a27e', d: '#8e6b4c' }, { n: 'Mars', r: 0.118, c: '#e2673c', d: '#a8401f' }, { n: 'Venus', r: 0.14, c: '#f2c879', d: '#c9953f' },
    { n: 'Earth', r: 0.165, c: '#3a86ff', d: '#2bb673', earth: true }, { n: 'Neptune', r: 0.19, c: '#4361ee', d: '#3046b0' }, { n: 'Uranus', r: 0.215, c: '#8fe3e3', d: '#5cbcbc' },
    { n: 'Saturn', r: 0.24, c: '#e9c46a', d: '#c49a3a', ring: true }, { n: 'Jupiter', r: 0.27, c: '#e0a877', d: '#b5703c', bands: true }, { n: 'Sun', r: 0.3, c: '#ffd60a', d: '#ff8800', sun: true },
  ];

  K.boot('planet_merge', { g: { best: 0, top: 0, cur: null } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, JW = 300, JH = 400, jx = 0, jy = 0;
    let balls = [], nextK = 0, curK = 0, dropX = 0, canDrop = true, score = 0, playing = false, overT = 0, revived = false, stars = [];
    const rad = (k) => BODIES[k].r * JW;
    function layout() { JW = Math.min(W - 40, (H - 210) * 0.78, 460); JH = JW * 1.25; jx = (W - JW) / 2; jy = H - JH - 30; }
    function start() { balls = []; score = 0; curK = K.randi(0, 2); nextK = K.randi(0, 3); dropX = jx + JW / 2; canDrop = true; overT = 0; revived = false; playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    function drop() {
      if (!playing || !canDrop || K.ui.anyOpen()) return;
      const r = rad(curK); const x = K.clamp(dropX, jx + r, jx + JW - r);
      balls.push({ k: curK, x, y: jy - r - 4, px: x, py: jy - r - 4, s: 1, age: 0 });
      curK = nextK; nextK = K.randi(0, Math.min(4, 1 + Math.floor(maxK() / 2)));
      canDrop = false; setTimeout(() => (canDrop = true), 450);
      K.audio.play('whoosh', 1.2);
    }
    const maxK = () => balls.reduce((m, b) => Math.max(m, b.k), 0);
    function physics(dt) {
      const sub = 4, h = dt / sub, g = 1600 * (JW / 400);
      for (let s = 0; s < sub; s++) {
        for (const b of balls) { const vx = (b.x - b.px) * 0.995, vy = (b.y - b.py) * 0.995; b.px = b.x; b.py = b.y; b.x += vx; b.y += vy + g * h * h; }
        for (let it = 0; it < 3; it++) {
          for (let i = 0; i < balls.length; i++) {
            const a = balls[i], ra = rad(a.k);
            for (let j = i + 1; j < balls.length; j++) {
              const b = balls[j], rb = rad(b.k), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, m = ra + rb;
              if (d < m) {
                if (a.k === b.k && !a.dead && !b.dead && a.k < BODIES.length - 1) { merge(a, b); continue; }
                const push = (m - d) / d * 0.5, wa = rb * rb / (ra * ra + rb * rb), wb = 1 - wa;
                a.x -= dx * push * wa * 2; a.y -= dy * push * wa * 2; b.x += dx * push * wb * 2; b.y += dy * push * wb * 2;
              }
            }
            if (a.x < jx + ra) a.x = jx + ra; if (a.x > jx + JW - ra) a.x = jx + JW - ra; if (a.y > jy + JH - ra) { a.y = jy + JH - ra; }
          }
        }
        balls = balls.filter((b) => !b.dead);
      }
    }
    function merge(a, b) {
      a.dead = b.dead = true;
      const k = a.k + 1, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      const nb = { k, x, y, px: x, py: y + 2, s: 0.6, age: 1 }; balls.push(nb); K.tween(nb, { s: 1 }, 0.3, 'outBack');
      score += (k + 1) * (k + 2); K.meta.track('merges', 1); K.meta.trackMax('planet', k + 1);
      K.audio.play('merge', 0.6 + k * 0.08); K.fx.burst(x, y, { n: 10 + k * 3, colors: [BODIES[k].c, BODIES[k].d, '#fff'], speed: 200 + k * 30, g: 0, shape: 'star', size: 4 + k * 0.5, life: 0.6 });
      if (k >= 6) { K.fx.shake(4 + k); K.fx.text(x, y - rad(k) - 10, BODIES[k].n + '!', { color: '#fff', stroke: '#1a1033', size: 24 + k * 2 }); }
      if (k > G.top) { G.top = k; if (k >= 5) { K.audio.play('levelup'); K.game.happy(); } }
      if (k === BODIES.length - 1) { K.fx.flash('#ffd60a', 0.6); K.audio.play('win'); K.meta.addGems(5); }
      if (score > G.best) G.best = score; K.save.mark();
    }
    function checkOver(dt) {
      const over = balls.some((b) => b.age > 1.5 && b.y - rad(b.k) < jy);
      overT = over ? overT + dt : Math.max(0, overT - dt * 2);
      if (overT > 2.2) {
        playing = false; K.game.stop(); K.audio.play('lose'); K.meta.track('games', 1); K.meta.addXp(Math.floor(score / 50));
        setTimeout(() => K.std.end({ newBest: score >= G.best && score > 0, rows: [[K.t('score'), score], [K.t('best'), G.best], [K.t(['Biggest', 'Maior']), BODIES[maxK()].n]], coins: Math.floor(score / 20) + 5,
          revive: revived ? null : () => { revived = true; balls = balls.sort((p, q) => p.y - q.y).slice(5); overT = 0; playing = true; K.game.start(); },
          reviveLabel: K.t(['Remove the top 5', 'Remover os 5 de cima']), restart: start, menu: showMenu }), 500);
      }
    }
    cv.addEventListener('pointermove', (e) => { dropX = e.clientX; });
    cv.addEventListener('pointerdown', (e) => { dropX = e.clientX; });
    cv.addEventListener('pointerup', () => drop());
    const keys = {}; window.addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'Space' || e.code === 'ArrowDown') { e.preventDefault(); if (!e.repeat) drop(); } }); window.addEventListener('keyup', (e) => (keys[e.code] = false));

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Move and tap/click (or arrows + Space) to drop a body into the jar. Two equal bodies merge into the next one: pebble → moon → … → Earth → … → Sun. Do not let the jar overflow.', pt: 'Mova e toque/clique (ou setas + Espaço) para soltar um astro no pote. Dois iguais se fundem no próximo: pedra → lua → … → Terra → … → Sol. Não deixe o pote transbordar.' },
      missions: [{ stat: 'merges', base: 60, reward: 80, text: { en: 'Merge {n} times', pt: 'Funda {n} vezes' } }, { stat: 'planet', base: 7, type: 'max', cap: 12, reward: 130, text: { en: 'Create body #{n} (Earth = 7)', pt: 'Crie o astro nº {n} (Terra = 7)' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() { playing = false; hud.style.display = 'none'; K.std.menu({ title: 'Planet<span>Merge</span>', sub: K.t('best') + ': ' + G.best + ' · ' + BODIES[G.top].n, onPlay: start, buttons: [K.ui.btn('🪐 ' + K.t(['Collection', 'Coleção']), '', openCol)] }); }
    function openCol() {
      const body = K.el('div', 'kit-grid');
      BODIES.forEach((b, i) => { const c = K.el('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); if (i <= G.top) { const o = ctx; drawBody(g, 32, 32, 26, i, 0); } else { g.fillStyle = '#ccc'; g.beginPath(); g.arc(32, 32, 26, 0, 6.283); g.fill(); } const cell = K.el('div', 'kit-cell'); cell.appendChild(c); cell.appendChild(K.el('div', '', i <= G.top ? b.n : '???')); body.appendChild(cell); });
      K.ui.panel({ title: K.t(['Collection', 'Coleção']), body, cls: 'wide' });
    }
    function drawBody(g, x, y, r, k, t) {
      const B = BODIES[k];
      if (B.sun) { const gl = g.createRadialGradient(x, y, r * 0.5, x, y, r * 1.5); gl.addColorStop(0, 'rgba(255,214,10,.6)'); gl.addColorStop(1, 'rgba(255,136,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 1.5, 0, 6.283); g.fill(); }
      if (B.ring) { g.strokeStyle = '#f4e1a1'; g.lineWidth = r * 0.14; g.beginPath(); g.ellipse(x, y, r * 1.45, r * 0.38, -0.3, Math.PI, 2 * Math.PI); g.stroke(); }
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.2, B.c); gr.addColorStop(1, B.d);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      g.save(); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.clip();
      if (B.earth) { g.fillStyle = '#2bb673'; [[-0.3, -0.2, 0.4], [0.35, 0.25, 0.3], [0.1, -0.5, 0.2]].forEach(([a, b, s]) => { g.beginPath(); g.ellipse(x + a * r, y + b * r, s * r, s * r * 0.7, 0.5, 0, 6.283); g.fill(); }); }
      if (B.bands) { g.fillStyle = 'rgba(150,80,40,.45)'; for (let k2 = -2; k2 <= 2; k2++) g.fillRect(x - r, y + k2 * r * 0.32, r * 2, r * 0.12); g.fillStyle = '#c0504d'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.3, r * 0.18, r * 0.1, 0, 0, 6.283); g.fill(); }
      if (k <= 4 && !B.earth) { g.fillStyle = 'rgba(0,0,0,.15)'; [[-0.3, 0.2, 0.18], [0.3, -0.25, 0.14], [0.2, 0.4, 0.1]].forEach(([a, b, s]) => { g.beginPath(); g.arc(x + a * r, y + b * r, s * r, 0, 6.283); g.fill(); }); }
      g.restore();
      if (B.ring) { g.strokeStyle = '#f4e1a1'; g.lineWidth = r * 0.14; g.beginPath(); g.ellipse(x, y, r * 1.45, r * 0.38, -0.3, 0, Math.PI); g.stroke(); }
      // cute face
      g.fillStyle = 'rgba(26,16,51,.75)'; g.beginPath(); g.arc(x - r * 0.25, y, Math.max(1.5, r * 0.07), 0, 6.283); g.arc(x + r * 0.25, y, Math.max(1.5, r * 0.07), 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(26,16,51,.7)'; g.lineWidth = Math.max(1, r * 0.05); g.beginPath(); g.arc(x, y + r * 0.12, r * 0.14, 0.2, Math.PI - 0.2); g.stroke();
    }
    let tt = 0;
    for (let i = 0; i < 120; i++) stars.push({ x: Math.random(), y: Math.random(), s: Math.random() * 1.8 + 0.3, p: Math.random() * 6 });
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      if (keys.ArrowLeft || keys.KeyA) dropX -= 500 * dt; if (keys.ArrowRight || keys.KeyD) dropX += 500 * dt;
      if (playing) { physics(dt); balls.forEach((b) => (b.age += dt)); checkOver(dt); hud.innerHTML = `<span class="big">${score}</span><span class="chip">👑 ${G.best}</span>`; }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a1033'); gr.addColorStop(1, '#3b1f5e'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      stars.forEach((s) => { ctx.globalAlpha = 0.4 + Math.sin(tt * 2 + s.p) * 0.3; ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.s, s.s); }); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // jar
      ctx.fillStyle = 'rgba(255,255,255,.06)'; K.draw.rrect(ctx, jx - 8, jy - 8, JW + 16, JH + 16, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(190,220,255,.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(jx - 4, jy - 10); ctx.lineTo(jx - 4, jy + JH + 4); ctx.lineTo(jx + JW + 4, jy + JH + 4); ctx.lineTo(jx + JW + 4, jy - 10); ctx.stroke();
      ctx.strokeStyle = overT > 0 ? `rgba(255,77,109,${0.5 + Math.sin(tt * 12) * 0.4})` : 'rgba(255,255,255,.2)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(jx + JW, jy); ctx.stroke(); ctx.setLineDash([]);
      balls.forEach((b) => drawBody(ctx, b.x, b.y, rad(b.k) * b.s, b.k, tt));
      if (playing) {
        const r = rad(curK), x = K.clamp(dropX, jx + r, jx + JW - r);
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(x, jy - r - 4); ctx.lineTo(x, jy + JH); ctx.stroke(); ctx.setLineDash([]);
        if (canDrop) drawBody(ctx, x, jy - r - 14, r, curK, tt);
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '700 13px "Trebuchet MS"'; ctx.textAlign = 'center'; ctx.fillText(K.t(['NEXT', 'PRÓX']), jx + JW - 30, jy - 70);
        drawBody(ctx, jx + JW - 30, jy - 45, Math.min(18, rad(nextK)), nextK, tt);
      }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.debug = { fill() { for (let i = 0; i < 16; i++) { const k = K.randi(0, 7), r = rad(k), x = jx + r + Math.random() * (JW - 2 * r), y = jy + JH - r - Math.random() * JH * 0.6; balls.push({ k, x, y, px: x, py: y, s: 1, age: 0 }); } } };
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; const oj = { jx, jy, JW }; layout(); if (oj.JW && balls.length) { const f = JW / oj.JW; balls.forEach((b) => { b.x = jx + (b.x - oj.jx) * f; b.y = jy + (b.y - oj.jy) * f; b.px = b.x; b.py = b.y; }); } });
    K.music.set({ bpm: 74, chords: [[60, 64, 67, 71], [65, 69, 72, 76], [62, 65, 69, 72], [67, 71, 74, 77]], pad: true, padWave: 'sine', arp: [1, 0, 0, 1, 0, 0, 1, 0], arpWave: 'sine', bass: true });
    showMenu();
  }
})();

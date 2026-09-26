/* Color Gate — tap to hop upward; pass only through the part of each spinning gate that matches your color. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Futura", "Century Gothic", "Trebuchet MS", sans-serif';
  const PALETTES = [
    { n: ['Classic', 'Clássico'], c: ['#32e0c4', '#f7d002', '#ff3c83', '#8c52ff'], bg: '#1d1f2f', p: 0 },
    { n: ['Sorbet', 'Sorvete'], c: ['#ff9aa2', '#ffdac1', '#b5ead7', '#c7ceea'], bg: '#3a2e39', p: 500 },
    { n: ['Retro', 'Retrô'], c: ['#f94144', '#f9c74f', '#43aa8b', '#577590'], bg: '#231f20', p: 800 },
    { n: ['Neon', 'Neon'], c: ['#39ff14', '#ff073a', '#00f0ff', '#fffb00'], bg: '#0a0a0a', p: 1200 },
    { n: ['Ocean', 'Oceano'], c: ['#0077b6', '#00b4d8', '#90e0ef', '#f4a261'], bg: '#03045e', gems: 30 },
  ];

  K.boot('color_gate', { g: { best: 0, pal: 0, pals: [0], stars: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, S = 1;
    let B = null, obs = [], pickups = [], camY = 0, score = 0, playing = false, started = false, revived = false, shards = [];
    const PC = () => PALETTES[G.pal].c;
    function start() {
      B = { y: 0, vy: 0, c: 0 }; obs = []; pickups = []; camY = 0; score = 0; started = false; revived = false; shards = []; lastY = -300;
      for (let i = 0; i < 4; i++) addObstacle();
      playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start();
    }
    let lastY = -300;
    function addObstacle() {
      const kinds = score < 3 ? ['ring'] : score < 8 ? ['ring', 'bar', 'cross'] : ['ring', 'bar', 'cross', 'double', 'square'];
      const k = K.pick(kinds), y = lastY, speed = (0.9 + Math.min(1.6, score * 0.05)) * (Math.random() < 0.5 ? 1 : -1);
      obs.push({ k, y, a: Math.random() * 6.283, speed, r: 110 });
      pickups.push({ y: y - 170, t: 'switch', got: false });
      pickups.push({ y, t: 'star', got: false });
      lastY -= 380;
    }
    function hop() { if (!playing || K.ui.anyOpen()) return; started = true; B.vy = -560; K.audio.play('tick', 1.8); }
    function die() {
      if (!playing) return;
      playing = false; K.game.stop(); K.audio.play('explode'); K.fx.shake(10);
      for (let i = 0; i < 40; i++) shards.push({ x: 0, y: B.y, vx: K.rand(-400, 400), vy: K.rand(-600, 200), c: K.pick(PC()), r: K.rand(3, 8) });
      K.meta.track('games', 1); const nb = score > G.best; if (nb) G.best = score; K.save.mark(); K.meta.addXp(score);
      setTimeout(() => K.std.end({ newBest: nb, rows: [[K.t('score'), score], [K.t('best'), G.best]], coins: score * 2 + 3,
        revive: revived ? null : () => { revived = true; shards = []; const next = obs.find((o) => o.y < B.y); B.y = next ? next.y + 200 : B.y; B.vy = 0; started = false; playing = true; K.game.start(); }, restart: start, menu: showMenu }), 900);
    }
    // collision: which color segment is at the ball's position for each obstacle
    function colorAt(o, bx, by) {
      const dy = by - o.y, cols = PC();
      if (o.k === 'ring' || o.k === 'double') {
        const rings = o.k === 'double' ? [o.r, o.r * 0.72] : [o.r];
        for (let ri = 0; ri < rings.length; ri++) {
          const r = rings[ri], d = Math.hypot(bx, dy); if (Math.abs(d - r) > 14 + 9) continue;
          let a = Math.atan2(dy, bx) - o.a * (ri ? -1 : 1); a = ((a % 6.283) + 6.283) % 6.283;
          return cols[Math.floor(a / (Math.PI / 2)) % 4];
        }
        return null;
      }
      if (o.k === 'cross') { const L = 100; for (let q = 0; q < 4; q++) { const a = o.a + (q * Math.PI) / 2, ex = -60 + Math.cos(a) * L, ey = Math.sin(a) * L; const t = K.clamp(((bx + 60) * ex + dy * ey) / (L * L), 0, 1); if (Math.hypot(bx + 60 - ex * t, dy - ey * t) < 9 + 9) return cols[q]; } return null; }
      if (o.k === 'bar') { if (Math.abs(dy) > 9 + 9) return null; const seg = 110, off = (((o.a * 60) % (seg * 4)) + seg * 4) % (seg * 4); const q = Math.floor((((bx + W / S) - off) % (seg * 4) + seg * 4) % (seg * 4) / seg); return cols[q]; }
      if (o.k === 'square') { const s = 90; const rot = (p) => [p[0] * Math.cos(o.a) - p[1] * Math.sin(o.a), p[0] * Math.sin(o.a) + p[1] * Math.cos(o.a)]; const pts = [[-s, -s], [s, -s], [s, s], [-s, s]].map(rot); for (let q = 0; q < 4; q++) { const a = pts[q], b = pts[(q + 1) % 4], ex = b[0] - a[0], ey = b[1] - a[1], t = K.clamp(((bx - a[0]) * ex + (dy - a[1]) * ey) / (ex * ex + ey * ey), 0, 1); if (Math.hypot(bx - a[0] - ex * t, dy - a[1] - ey * t) < 9 + 9) return cols[q]; } return null; }
      return null;
    }
    function update(dt) {
      obs.forEach((o) => (o.a += o.speed * dt));
      if (!playing || !B) return;
      if (started) { B.vy += 1500 * dt; B.y += B.vy * dt; }
      const cols = PC();
      for (const o of obs) { const c = colorAt(o, 0, B.y); if (c && c !== cols[B.c]) return die(); }
      for (const p of pickups) {
        if (p.got || Math.abs(p.y - B.y) > 22) continue; p.got = true;
        if (p.t === 'star') { score++; G.stars++; K.meta.track('gates', 1); K.meta.trackMax('score', score); K.audio.play('coin', 1 + (score % 8) * 0.05); K.fx.burst(W / 2, (p.y - camY) * S + H * 0.6, { n: 14, colors: ['#fff', cols[B.c]], speed: 200, g: 0, shape: 'star', size: 5, life: 0.5 }); addObstacle(); if (score % 10 === 0) { K.audio.play('levelup'); K.game.happy(); } }
        else { let n; do n = Math.floor(Math.random() * 4); while (n === B.c); B.c = n; K.audio.play('power', 1.4); K.fx.burst(W / 2, (p.y - camY) * S + H * 0.6, { n: 20, colors: cols, speed: 260, g: 0, size: 5, life: 0.5 }); }
      }
      const target = B.y; if (target < camY) camY = K.lerp(camY, target, 0.2);
      if ((B.y - camY) * S > H * 0.42) die();
      obs = obs.filter((o) => o.y < camY + 600); pickups = pickups.filter((p) => p.y < camY + 600);
    }
    cv.addEventListener('pointerdown', hop);
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!e.repeat) hop(); } });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap or press Space to hop up. You can only pass through parts of a gate that match your color. Touch the rainbow orb to change color. Collect the star inside every gate.', pt: 'Toque ou aperte Espaço para pular. Você só atravessa as partes do portal da sua cor. Toque na esfera arco-íris para mudar de cor. Pegue a estrela dentro de cada portal.' },
      missions: [{ stat: 'gates', base: 30, reward: 80, text: { en: 'Pass {n} gates', pt: 'Passe {n} portais' } }, { stat: 'score', base: 10, type: 'max', cap: 80, reward: 110, text: { en: 'Score {n} in one run', pt: 'Faça {n} numa partida' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() { playing = false; hud.style.display = 'none'; K.std.menu({ title: 'Color<span>Gate</span>', sub: K.t('best') + ': ' + G.best + ' · ★ ' + G.stars, onPlay: start, buttons: [K.ui.btn('🎨 ' + K.t(['Palettes', 'Paletas']), '', () => K.std.shop(K.t(['Palettes', 'Paletas']), PALETTES.map((p, i) => ({ id: i, name: K.t(p.n), price: p.p, gems: p.gems, html: `<div style="width:44px;height:44px;border-radius:50%;background:conic-gradient(${p.c[0]} 0 25%,${p.c[1]} 0 50%,${p.c[2]} 0 75%,${p.c[3]} 0);border:6px solid ${p.bg}"></div>` })), { owned: G.pals, get: () => G.pal, set: (i) => (G.pal = i) }))] }); if (!obs.length) { B = { y: 0, vy: 0, c: 0 }; lastY = -300; for (let i = 0; i < 3; i++) addObstacle(); } }
    let tt = 0;
    K.loop((dt) => { tt += dt; update(dt); K.fx.update(dt); shards.forEach((s) => { s.vy += 1200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }); if (playing) hud.innerHTML = `<span class="big">${score}</span>`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); const P = PALETTES[G.pal], cols = P.c;
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2 + K.fx.shakeX, H * 0.6 + K.fx.shakeY); ctx.scale(S, S); ctx.translate(0, -camY);
      ctx.lineCap = 'butt';
      for (const o of obs) {
        ctx.save(); ctx.translate(0, o.y);
        if (o.k === 'ring' || o.k === 'double') { const rings = o.k === 'double' ? [o.r, o.r * 0.72] : [o.r]; rings.forEach((r, ri) => { for (let q = 0; q < 4; q++) { ctx.strokeStyle = cols[q]; ctx.lineWidth = 18; ctx.beginPath(); const a0 = o.a * (ri ? -1 : 1) + (q * Math.PI) / 2; ctx.arc(0, 0, r, a0 + 0.02, a0 + Math.PI / 2 - 0.02); ctx.stroke(); } }); }
        if (o.k === 'cross') { ctx.lineCap = 'round'; for (let q = 0; q < 4; q++) { const a = o.a + (q * Math.PI) / 2; ctx.strokeStyle = cols[q]; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-60 + Math.cos(a) * 100, Math.sin(a) * 100); ctx.stroke(); } ctx.lineCap = 'butt'; }
        if (o.k === 'bar') { const seg = 110, off = (((o.a * 60) % (seg * 4)) + seg * 4) % (seg * 4); const L = -W / S; for (let x = L - seg * 4 + off; x < W / S; x += seg) { const q = Math.floor(((x - L - off + W / S * 0 + seg * 8) % (seg * 4)) / seg); ctx.fillStyle = cols[Math.floor((((x + W / S) - off) % (seg * 4) + seg * 4) % (seg * 4) / seg)]; ctx.fillRect(x, -9, seg - 2, 18); void q; } }
        if (o.k === 'square') { ctx.rotate(o.a); const s = 90; const pts = [[-s, -s], [s, -s], [s, s], [-s, s]]; for (let q = 0; q < 4; q++) { ctx.strokeStyle = cols[q]; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(...pts[q]); ctx.lineTo(...pts[(q + 1) % 4]); ctx.stroke(); } }
        ctx.restore();
      }
      for (const p of pickups) {
        if (p.got) continue;
        if (p.t === 'star') { ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(0, p.y); ctx.rotate(Math.sin(tt * 2) * 0.2); ctx.scale(1 + Math.sin(tt * 5) * 0.08, 1 + Math.sin(tt * 5) * 0.08); K.draw.star(ctx, 0, 0, 16, 7, 5); ctx.fill(); ctx.restore(); }
        else { for (let q = 0; q < 4; q++) { ctx.fillStyle = cols[q]; ctx.beginPath(); ctx.moveTo(0, p.y); ctx.arc(0, p.y, 13, tt * 2 + (q * Math.PI) / 2, tt * 2 + ((q + 1) * Math.PI) / 2); ctx.fill(); } }
      }
      if (B && playing) { ctx.fillStyle = cols[B.c]; ctx.shadowColor = cols[B.c]; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(0, B.y, 11, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
      shards.forEach((s) => { ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); });
      if (B && !started && playing) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '700 18px "Futura","Trebuchet MS"'; ctx.textAlign = 'center'; ctx.fillText(K.t(['TAP TO JUMP', 'TOQUE PARA PULAR']), 0, B.y + 60); }
      ctx.restore(); K.fx.draw(ctx); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; S = Math.min(1.3, Math.min(w / 380, h / 700)); });
    K.music.set({ bpm: 120, chords: [[64, 67, 71], [60, 64, 67], [62, 65, 69], [59, 62, 67]], bass: true, busy: true, arp: [1, 1, 1, 1, 1, 1, 1, 1], arpWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 1, 0, 1, 0, 1, 0, 1] } });
    showMenu();
  }
})();

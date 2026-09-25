/* Fruit Slash — swipe to slice flying fruit, avoid bombs. Classic (3 misses) and 60-second Arcade. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const FRUITS = [
    { n: 'apple', c: '#e63946', in: '#fff1d6', r: 30, j: '#e63946' }, { n: 'orange', c: '#ff8c1a', in: '#ffc56b', r: 30, j: '#ff9f1c' },
    { n: 'lime', c: '#6cc24a', in: '#d4f5a3', r: 26, j: '#8ac926' }, { n: 'melon', c: '#2d6a4f', in: '#ff5d73', r: 44, j: '#ff5d73', stripe: '#52b788' },
    { n: 'plum', c: '#7b2cbf', in: '#f3d5ff', r: 26, j: '#9d4edd' }, { n: 'kiwi', c: '#8b5e34', in: '#9ef01a', r: 27, j: '#70e000' },
    { n: 'coco', c: '#6f4518', in: '#ffffff', r: 32, j: '#f1f1f1' }, { n: 'peach', c: '#ffad8a', in: '#ffe0b5', r: 29, j: '#ffb38a' },
  ];
  const TRAILS = [{ n: ['Classic', 'Clássico'], c: ['#ffffff'], p: 0 }, { n: ['Fire', 'Fogo'], c: ['#ffba08', '#e85d04', '#9d0208'], p: 400 }, { n: ['Ice', 'Gelo'], c: ['#caf0f8', '#48cae4'], p: 600 }, { n: ['Rainbow', 'Arco-íris'], c: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'], p: 1000 }, { n: ['Toxic', 'Tóxico'], c: ['#b9fbc0', '#38b000'], p: 1400 }, { n: ['Royal', 'Real'], c: ['#ffd166', '#9b5de5'], gems: 30 }];
  const WALLS = [{ n: ['Dojo', 'Dojô'], a: '#8b5a2b', b: '#6b4423', p: 0 }, { n: ['Bamboo', 'Bambu'], a: '#588157', b: '#3a5a40', p: 500 }, { n: ['Night', 'Noite'], a: '#22223b', b: '#4a4e69', p: 800 }, { n: ['Sakura', 'Sakura'], a: '#ffb3c6', b: '#fb6f92', p: 1200 }];

  K.boot('fruit_slash', { g: { bestC: 0, bestA: 0, trail: 0, trails: [0], wall: 0, walls: [0] } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, S = 1;
    let items = [], halves = [], splats = [], trail = [], mode = 'classic', score = 0, misses = 0, time = 60, playing = false, waveT = 0, combo = 0, comboT = 0, revived = false, frenzy = 0, sliced = 0;
    function start(m) { mode = m; items = []; halves = []; splats = []; score = 0; misses = 0; time = 60; waveT = 1; combo = 0; revived = false; frenzy = 0; sliced = 0; playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    function launch(type, x) {
      const fromX = x != null ? x : K.rand(W * 0.15, W * 0.85), targetX = K.rand(W * 0.25, W * 0.75);
      const peak = K.rand(H * 0.1, H * 0.4), vy = -Math.sqrt(2 * 1100 * S * (H - peak)), tFlight = -vy / (1100 * S);
      items.push({ t: type, x: fromX, y: H + 50, vx: (targetX - fromX) / tFlight * 0.8, vy, rot: 0, vr: K.rand(-3, 3), f: type === 'bomb' ? null : K.pick(FRUITS), r: 0, special: type });
      K.audio.play('whoosh', 0.7 + Math.random() * 0.3);
    }
    function wave() {
      const lvl = Math.min(10, sliced / 15);
      const n = K.randi(1, 2 + Math.floor(lvl / 2)), pattern = Math.random();
      const bombChance = mode === 'arcade' ? 0.12 : 0.1 + lvl * 0.015;
      for (let i = 0; i < n; i++) setTimeout(() => { if (!playing) return; launch(Math.random() < bombChance && i === 0 && sliced > 3 ? 'bomb' : Math.random() < 0.04 ? 'gold' : Math.random() < (mode === 'arcade' ? 0.05 : 0) ? 'banana' : 'fruit', pattern < 0.3 ? W * (0.2 + (i / n) * 0.6) : null); }, pattern < 0.5 ? i * 120 : i * 380);
      waveT = Math.max(0.8, 2.4 - lvl * 0.12) * (frenzy > 0 ? 0.3 : 1);
    }
    function slice(it, ang) {
      it.dead = true;
      if (it.t === 'bomb') {
        K.audio.play('explode'); K.fx.shake(20); K.fx.flash('#fff', 0.9);
        if (mode === 'classic') { playing = false; K.game.stop(); setTimeout(() => end(K.t(['You sliced a bomb!', 'Você cortou uma bomba!'])), 900); }
        else { score = Math.max(0, score - 10); K.fx.text(it.x, it.y, '-10', { color: '#ff4d6d', size: 40 }); }
        return;
      }
      const f = it.f, pts = it.t === 'gold' ? 10 : 1;
      score += pts; sliced++; K.meta.track('fruit', 1);
      combo++; comboT = 0.25;
      if (it.t === 'banana') { frenzy = 5; K.audio.play('power'); K.fx.text(W / 2, H * 0.3, K.t(['FRENZY!', 'FRENESI!']), { color: '#ffd166', stroke: '#6b4423', size: 50 }); }
      if (it.t === 'gold') { K.audio.play('coin'); K.fx.text(it.x, it.y - 40, '+10', { color: '#ffd166', stroke: '#6b4423', size: 40 }); }
      K.audio.play('pop', 0.8 + Math.random() * 0.4); K.audio.play('swing', 1.5);
      for (const side of [-1, 1]) halves.push({ f, x: it.x, y: it.y, vx: it.vx * 0.5 + Math.cos(ang + Math.PI / 2) * side * 140, vy: it.vy * 0.4 - 80, rot: ang, vr: side * 4, side, gold: it.t === 'gold' });
      K.fx.burst(it.x, it.y, { n: 18, colors: [f.j, f.in], speed: 380, g: 900, size: 5, life: 0.7 });
      splats.push({ x: it.x, y: it.y, c: f.j, r: f.r * S * K.rand(1.4, 2.2), a: 0.6, seed: Math.random() * 10 });
      if (splats.length > 25) splats.shift();
    }
    function end(text) {
      K.meta.track('games', 1);
      const best = mode === 'classic' ? 'bestC' : 'bestA'; const nb = score > G[best]; if (nb) G[best] = score; K.save.mark();
      K.meta.trackMax('score', score); K.meta.addXp(Math.floor(score / 8));
      K.std.end({ newBest: nb, text, rows: [[K.t('score'), score], [K.t('best'), G[best]]], coins: Math.floor(score / 2) + 5,
        revive: mode === 'classic' && !revived ? () => { revived = true; misses = 0; items = []; playing = true; K.game.start(); waveT = 1; } : null, restart: () => start(mode), menu: showMenu });
    }
    /* ---------- input: swipe trail ---------- */
    let down = false;
    const addPt = (x, y) => { trail.push({ x, y, t: 0 }); if (trail.length > 2 && playing) testSlice(trail[trail.length - 2], trail[trail.length - 1]); };
    cv.addEventListener('pointerdown', (e) => { down = true; trail = []; addPt(e.clientX, e.clientY); });
    window.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse' && e.buttons) addPt(e.clientX, e.clientY); });
    window.addEventListener('pointerup', () => { down = false; if (combo >= 3) { const bonus = combo; score += bonus; K.fx.text(W / 2, H * 0.4, combo + ' ' + K.t(['FRUIT COMBO', 'FRUTAS COMBO']) + ' +' + bonus, { color: '#ffd166', stroke: '#6b4423', size: 34, life: 1.3 }); K.audio.play('combo'); K.meta.track('combos', 1); K.game.happy(); } combo = 0; });
    function testSlice(a, b) {
      const len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 4) return;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      for (const it of items) {
        if (it.dead) continue;
        const r = (it.f ? it.f.r : 30) * S * (it.t === 'banana' ? 1.2 : 1);
        // distance from item to segment
        const t = K.clamp(((it.x - a.x) * (b.x - a.x) + (it.y - a.y) * (b.y - a.y)) / (len * len), 0, 1);
        if (Math.hypot(a.x + (b.x - a.x) * t - it.x, a.y + (b.y - a.y) * t - it.y) < r) slice(it, ang);
      }
    }

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Swipe (drag the mouse or your finger) through fruit to slice it. Slice several with one swipe for combos. Never slice bombs. Classic: 3 dropped fruits and it is over. Arcade: 60 seconds, go wild.', pt: 'Deslize (arraste o mouse ou o dedo) pelas frutas para cortá-las. Corte várias num só gesto para combos. Nunca corte bombas. Clássico: 3 frutas perdidas e acabou. Arcade: 60 segundos, corte tudo.' },
      missions: [{ stat: 'fruit', base: 150, reward: 80, text: { en: 'Slice {n} fruits', pt: 'Corte {n} frutas' } }, { stat: 'combos', base: 5, reward: 90, text: { en: 'Make {n} combos', pt: 'Faça {n} combos' } }, { stat: 'score', base: 60, type: 'max', cap: 500, reward: 110, text: { en: 'Score {n} in one game', pt: 'Faça {n} pontos numa partida' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'fshud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Fruit<span>Slash</span>', sub: `${K.t(['Classic', 'Clássico'])} ${G.bestC} · Arcade ${G.bestA}`, playLabel: K.t(['Classic', 'Clássico']), onPlay: () => start('classic'),
        buttons: [K.ui.btn('⏱ Arcade', '', () => { K.std.hideMenu(); start('arcade'); }),
          K.ui.btn('✦ ' + K.t(['Blades', 'Lâminas']), '', () => K.std.shop(K.t(['Blade trails', 'Rastros']), TRAILS.map((t, i) => ({ id: i, name: K.t(t.n), price: t.p, gems: t.gems, html: `<div style="width:60px;height:10px;border-radius:5px;background:linear-gradient(90deg,${t.c.join(',')});margin:14px 0"></div>` })), { owned: G.trails, get: () => G.trail, set: (i) => (G.trail = i) })),
          K.ui.btn('🏯 ' + K.t(['Walls', 'Paredes']), '', () => K.std.shop(K.t(['Walls', 'Paredes']), WALLS.map((t, i) => ({ id: i, name: K.t(t.n), price: t.p, html: `<div style="width:56px;height:40px;border-radius:6px;background:repeating-linear-gradient(90deg,${t.a} 0 10px,${t.b} 10px 12px)"></div>` })), { owned: G.walls, get: () => G.wall, set: (i) => (G.wall = i) }))] });
    }
    function drawFruit(f, x, y, rot, r, half, gold) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      if (half) { ctx.beginPath(); ctx.arc(0, 0, r, half > 0 ? 0 : Math.PI, half > 0 ? Math.PI : 2 * Math.PI); ctx.closePath(); ctx.clip(); }
      ctx.fillStyle = gold ? '#ffd166' : f.c; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      if (f.stripe) { ctx.strokeStyle = f.stripe; ctx.lineWidth = r * 0.12; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(k * r * 0.35, 0, r * 0.12, r * 0.95, 0, 0, 6.283); ctx.stroke(); } }
      if (half) { ctx.fillStyle = f.in; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.88, r * 0.22, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(k * r * 0.25, 0, 2, 3, 0, 0, 6.283); ctx.fill(); } }
      else { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.25, r * 0.15, -0.7, 0, 6.283); ctx.fill(); ctx.fillStyle = '#4a3b2a'; ctx.fillRect(-2, -r - 6, 4, 10); ctx.fillStyle = '#6cc24a'; ctx.beginPath(); ctx.ellipse(8, -r - 2, 9, 4, -0.4, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    function drawBomb(x, y, rot, r, t) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `900 ${r * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✕', 0, 1);
      ctx.strokeStyle = '#8b5e34'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(10, -r - 14, 18, -r - 10); ctx.stroke();
      ctx.fillStyle = Math.sin(t * 40) > 0 ? '#ffd166' : '#ff4d6d'; ctx.beginPath(); ctx.arc(18, -r - 10, 6, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    function drawBanana(x, y, rot, r) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = r * 0.55; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -r * 0.4, r, 0.4, Math.PI - 0.4); ctx.stroke(); ctx.strokeStyle = '#8b5e34'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -r * 0.4, r, 0.35, 0.45); ctx.stroke(); ctx.restore(); }

    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      trail.forEach((p) => (p.t += dt)); trail = trail.filter((p) => p.t < 0.15);
      comboT -= dt; frenzy = Math.max(0, frenzy - dt);
      splats.forEach((s) => (s.a = Math.max(0, s.a - dt * 0.05)));
      if (playing) {
        if (mode === 'arcade') { time -= dt; if (time <= 0) { time = 0; playing = false; K.game.stop(); K.audio.play('win'); setTimeout(() => end(K.t(["Time's up!", 'Acabou o tempo!'])), 600); } }
        waveT -= dt; if (waveT <= 0) wave();
      }
      const g = 1100 * S;
      for (const it of items) { if (it.dead) continue; it.vy += g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt; if (it.y > H + 80 && it.vy > 0) { it.dead = true; if (it.t !== 'bomb' && playing && mode === 'classic') { misses++; K.audio.play('hurt'); K.fx.flash('#ff4d6d', 0.2); if (misses >= 3) { playing = false; K.game.stop(); setTimeout(() => end(K.t(['Three fruits dropped!', 'Três frutas caíram!'])), 600); } } } }
      items = items.filter((i) => !i.dead);
      halves.forEach((h) => { h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }); halves = halves.filter((h) => h.y < H + 100);
      if (playing) hud.innerHTML = `<div class="sc">${score}</div><div class="rt">${mode === 'classic' ? [0, 1, 2].map((i) => `<i class="${i < misses ? 'x' : ''}">✕</i>`).join('') : '⏱ ' + Math.ceil(time)}</div>`;
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const Wl = WALLS[G.wall];
      ctx.fillStyle = Wl.a; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = Wl.b; for (let x = 0; x < W; x += 90) ctx.fillRect(x, 0, 6, H);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < H; y += 140) ctx.fillRect(0, y, W, 3);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, Math.max(W, H) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      splats.forEach((s) => { ctx.globalAlpha = s.a; ctx.fillStyle = s.c; ctx.beginPath(); for (let k = 0; k <= 32; k++) { const a = (k / 32) * 6.283, rr = s.r * (0.75 + 0.12 * Math.sin(a * 3 + s.seed) + 0.1 * Math.sin(a * 7 + s.seed * 2) + (k % 5 === 0 ? 0.25 : 0)); ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); } ctx.fill(); ctx.globalAlpha = 1; });
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      halves.forEach((h) => drawFruit(h.f, h.x, h.y, h.rot, h.f.r * S, h.side, h.gold));
      items.forEach((it) => { const r = (it.f ? it.f.r : 30) * S; if (it.t === 'bomb') drawBomb(it.x, it.y, it.rot, r, tt); else if (it.t === 'banana') drawBanana(it.x, it.y, it.rot, r); else { if (it.t === 'gold') { ctx.fillStyle = 'rgba(255,209,102,.35)'; ctx.beginPath(); ctx.arc(it.x, it.y, r * 1.5, 0, 6.283); ctx.fill(); } drawFruit(it.f, it.x, it.y, it.rot, r, 0, it.t === 'gold'); } });
      K.fx.draw(ctx); ctx.restore();
      // blade trail
      if (trail.length > 1) { const cols = TRAILS[G.trail].c; ctx.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { const k = i / trail.length; ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 2 + k * 12; ctx.globalAlpha = k; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke(); } ctx.globalAlpha = 1; }
      if (frenzy > 0) { ctx.fillStyle = `rgba(255,209,102,${0.1 + Math.sin(tt * 10) * 0.05})`; ctx.fillRect(0, 0, W, H); }
      K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; S = Math.max(0.8, Math.min(1.4, Math.min(w, h) / 600)); });
    K.music.set({ bpm: 116, chords: [[62, 65, 69], [60, 64, 67], [58, 62, 65], [57, 61, 64]], bass: true, arp: [1, 0, 0, 1, 0, 1, 0, 0], arpWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 1], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 0, 1, 0, 1, 0, 1, 0] } });
    showMenu();
  }
})();

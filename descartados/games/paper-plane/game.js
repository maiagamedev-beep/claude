/* Paper Plane — tap to lift, glide through the gaps. Folded-paper diorama style with parallax layers. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Gill Sans", "Trebuchet MS", sans-serif';
  const WORLDS = [
    { n: ['Meadow', 'Campo'], sky: ['#bde0fe', '#fef9ef'], l: ['#a7c957', '#6a994e', '#386641'], ob: '#f2e8cf', obS: '#bc6c25' },
    { n: ['Desert', 'Deserto'], sky: ['#ffd6a5', '#fff1e6'], l: ['#e9c46a', '#f4a261', '#e76f51'], ob: '#fefae0', obS: '#9c6644' },
    { n: ['Snow', 'Neve'], sky: ['#caf0f8', '#ffffff'], l: ['#e0fbfc', '#98c1d9', '#3d5a80'], ob: '#ffffff', obS: '#5c677d' },
    { n: ['Dusk', 'Crepúsculo'], sky: ['#6d597a', '#ffb4a2'], l: ['#b56576', '#6d597a', '#355070'], ob: '#fdf0d5', obS: '#355070' },
    { n: ['Night', 'Noite'], sky: ['#0b132b', '#3a506b'], l: ['#1c2541', '#3a506b', '#5bc0be'], ob: '#e0e1dd', obS: '#1b263b' },
  ];
  const PLANES = [{ n: ['Classic', 'Clássico'], c: '#ffffff', f: '#dfe7fd', p: 0 }, { n: ['Sunny', 'Solar'], c: '#ffe066', f: '#f4a261', p: 300 }, { n: ['Mint', 'Menta'], c: '#b7efc5', f: '#6fcf97', p: 500 }, { n: ['Rose', 'Rosa'], c: '#ffc8dd', f: '#ff8fab', p: 700 }, { n: ['Sky', 'Céu'], c: '#a2d2ff', f: '#5390d9', p: 900 }, { n: ['Newspaper', 'Jornal'], c: '#e5e5e5', f: '#9a9a9a', p: 1200, news: true }, { n: ['Origami crane', 'Tsuru'], c: '#ef233c', f: '#8d0801', gems: 30 }];

  K.boot('paper_plane', { g: { best: 0, plane: 0, planes: [0], flights: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, S = 1;
    let P = null, pipes = [], coins = [], pus = [], score = 0, dist = 0, playing = false, started = false, revived = false, runCoins = 0, speed = 200, shield = 0, magnet = 0, world = 0, puffs = [];
    function start() {
      P = { x: W * 0.3, y: H * 0.45, vy: 0, rot: 0 }; pipes = []; coins = []; pus = []; puffs = []; score = 0; dist = 0; runCoins = 0; speed = 210 * S; shield = 0; magnet = 0; world = 0; revived = false;
      playing = true; started = false; K.std.hideMenu(); hud.style.display = ''; K.game.start(); nextX = W + 100;
    }
    let nextX = 0;
    function spawnPipe() {
      const gap = Math.max(150, 220 - score * 1.2) * S, cy = K.rand(H * 0.25, H * 0.75), moving = score > 15 && Math.random() < 0.25;
      pipes.push({ x: nextX, cy, gap, w: 70 * S, passed: false, moving, ph: Math.random() * 6 });
      if (Math.random() < 0.6) for (let k = 0; k < 3; k++) coins.push({ x: nextX + 140 * S + k * 36 * S, y: cy + Math.sin(k) * 20, got: false });
      if (Math.random() < 0.12) pus.push({ x: nextX + 200 * S, y: cy, k: K.pick(['shield', 'magnet']), got: false });
      nextX += K.rand(250, 320) * S;
    }
    function flap() {
      if (!playing || K.ui.anyOpen()) return;
      if (!started) started = true;
      P.vy = -420 * S; K.audio.play('swing', 1.3); puffs.push({ x: P.x - 20, y: P.y + 6, t: 0 });
    }
    function crash() {
      if (shield > 0) { shield = 0; K.audio.play('explode', 1.4); K.fx.flash('#fff', 0.5); pipes = pipes.filter((p) => Math.abs(p.x - P.x) > 150); P.vy = -300 * S; return; }
      playing = false; K.game.stop(); K.audio.play('hit'); K.audio.play('lose'); K.fx.shake(10); K.fx.flash('#fff', 0.5);
      K.meta.track('flights', 1); G.flights++; const nb = score > G.best; if (nb) G.best = score; K.save.mark(); K.meta.addXp(Math.floor(score / 3));
      setTimeout(() => K.std.end({ newBest: nb, rows: [[K.t('score'), score], [K.t('best'), G.best], ['●', runCoins]], coins: runCoins + Math.floor(score / 2),
        revive: revived ? null : () => { revived = true; pipes = pipes.filter((p) => p.x > P.x + 250 * S); P.y = H * 0.45; P.vy = 0; shield = 3; playing = true; started = false; K.game.start(); }, restart: start, menu: showMenu }), 700);
    }
    cv.addEventListener('pointerdown', flap);
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); if (!e.repeat) flap(); } });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap, click or press Space to give your paper plane a lift. Glide through the gaps, collect coins, grab shields and magnets. The world changes every 25 points.', pt: 'Toque, clique ou aperte Espaço para dar impulso ao avião de papel. Passe pelos vãos, pegue moedas, escudos e ímãs. O mundo muda a cada 25 pontos.' },
      missions: [{ stat: 'gates', base: 40, reward: 80, text: { en: 'Fly through {n} gaps', pt: 'Passe por {n} vãos' } }, { stat: 'score', base: 15, type: 'max', cap: 150, reward: 110, text: { en: 'Score {n} in one flight', pt: 'Faça {n} pontos num voo' } }, { stat: 'coins', base: 40, reward: 70, text: { en: 'Collect {n} coins in flight', pt: 'Pegue {n} moedas voando' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'pphud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Paper<span>Plane</span>', sub: K.t('best') + ': ' + G.best, onPlay: start,
        buttons: [K.ui.btn('✈ ' + K.t(['Planes', 'Aviões']), '', () => K.std.shop(K.t(['Planes', 'Aviões']), PLANES.map((p, i) => ({ id: i, name: K.t(p.n), price: p.p, gems: p.gems, html: `<canvas width="70" height="44" data-p="${i}"></canvas>` })), { owned: G.planes, get: () => G.plane, set: (i) => (G.plane = i) }))] });
      if (!P) P = { x: W * 0.3, y: H * 0.45, vy: 0, rot: 0 };
    }
    new MutationObserver(() => document.querySelectorAll('canvas[data-p]').forEach((c) => { if (c.dataset.d) return; c.dataset.d = 1; const g = c.getContext('2d'); drawPlane(g, 35, 22, 0, PLANES[+c.dataset.p], 0.9); })).observe(document.body, { childList: true, subtree: true });
    function drawPlane(g, x, y, rot, Pl, s) {
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(30, 8); g.lineTo(-26, -6); g.lineTo(-18, 14); g.closePath(); g.fill();
      g.fillStyle = Pl.f; g.beginPath(); g.moveTo(28, 0); g.lineTo(-24, 12); g.lineTo(-14, 2); g.closePath(); g.fill();
      g.fillStyle = Pl.c; g.beginPath(); g.moveTo(28, 0); g.lineTo(-26, -14); g.lineTo(-14, 2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(28, 0); g.lineTo(-14, 2); g.stroke();
      if (Pl.news) { g.strokeStyle = 'rgba(0,0,0,.3)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-18 + k * 8, -8 + k * 2); g.lineTo(-6 + k * 8, -6 + k * 2); g.stroke(); } }
      g.restore();
    }
    const Wd = () => WORLDS[world % WORLDS.length];
    function hills(off, col, amp, base, freq) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) { const wx = x + off; ctx.lineTo(x, H - base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3 + 1) * amp * 0.4); }
      ctx.lineTo(W, H); ctx.fill();
      // folded paper crease highlight
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= W + 20; x += 20) { const wx = x + off; const y = H - base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3 + 1) * amp * 0.4; x ? ctx.lineTo(x, y + 3) : ctx.moveTo(x, y + 3); }
      ctx.stroke();
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      puffs.forEach((p) => (p.t += dt)); puffs = puffs.filter((p) => p.t < 0.6);
      if (!P) return;
      if (playing && started) {
        P.vy += 1300 * S * dt; P.y += P.vy * dt; P.rot = K.clamp(P.vy / (600 * S), -0.5, 0.9);
        const move = speed * dt; dist += move; speed = Math.min(360 * S, speed + dt * 2 * S);
        if (nextX - dist < W + 200) spawnPipe();
        shield = Math.max(0, shield - dt); magnet = Math.max(0, magnet - dt);
        for (const p of pipes) {
          const x = p.x - dist, cy = p.cy + (p.moving ? Math.sin(tt * 1.5 + p.ph) * 50 * S : 0);
          if (!p.passed && x + p.w < P.x) { p.passed = true; score++; K.meta.track('gates', 1); K.meta.trackMax('score', score); K.audio.play('tick', 1.5); if (score % 25 === 0) { world++; K.audio.play('levelup'); K.game.happy(); K.fx.text(W / 2, H * 0.3, K.t(Wd().n), { color: '#fff', stroke: '#333', size: 40, life: 1.6 }); } else if (score % 10 === 0) K.fx.text(P.x, P.y - 40, score + '!', { color: '#fff', stroke: '#333', size: 30 }); }
          if (P.x + 18 * S > x && P.x - 18 * S < x + p.w && (P.y - 10 * S < cy - p.gap / 2 || P.y + 10 * S > cy + p.gap / 2)) { crash(); break; }
        }
        coins.forEach((c) => { if (c.got) return; const x = c.x - dist, d = Math.hypot(x - P.x, c.y - P.y); if (magnet > 0 && d < 180 * S) { c.x += (P.x - x) * dt * 8 / 1; c.y += (P.y - c.y) * dt * 8; } if (d < 26 * S) { c.got = true; runCoins++; K.meta.track('coins', 1); K.audio.play('coin', 1 + (runCoins % 6) * 0.05); } });
        pus.forEach((u) => { if (u.got) return; const x = u.x - dist; if (Math.hypot(x - P.x, u.y - P.y) < 30 * S) { u.got = true; K.audio.play('power'); if (u.k === 'shield') shield = 8; else magnet = 10; K.fx.text(P.x, P.y - 40, u.k === 'shield' ? K.t(['SHIELD', 'ESCUDO']) : K.t(['MAGNET', 'ÍMÃ']), { color: '#fff', stroke: '#333', size: 26 }); } });
        pipes = pipes.filter((p) => p.x - dist > -200); coins = coins.filter((c) => c.x - dist > -50);
        if (P.y > H - 40 * S || P.y < -60) crash();
      } else if (playing) { P.y = H * 0.45 + Math.sin(tt * 3) * 12; P.rot = Math.sin(tt * 3) * 0.1; }
      else if (!K.game._playing && P && !started) { P.y = H * 0.45 + Math.sin(tt * 2) * 14; }
      if (playing) hud.innerHTML = `<b>${score}</b>${shield > 0 ? '<i>⛨</i>' : ''}${magnet > 0 ? '<i>⊃</i>' : ''}${!started ? `<small>${K.t(['Tap to fly', 'Toque para voar'])}</small>` : ''}`;
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const Wo = Wd(), gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, Wo.sky[0]); gr.addColorStop(1, Wo.sky[1]); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // paper clouds
      for (let i = 0; i < 5; i++) { const x = ((i * 300 - dist * 0.15 - tt * 10) % (W + 300) + W + 300) % (W + 300) - 150, y = 60 + i * 40; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x, y, 60, 16, 0, 0, 6.283); ctx.ellipse(x + 30, y - 10, 34, 14, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(x - 60, y + 6, 120, 4); }
      hills(dist * 0.2, Wo.l[0], 40 * S, H * 0.22, 0.006);
      hills(dist * 0.45, Wo.l[1], 30 * S, H * 0.12, 0.01);
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // obstacles: folded paper towers
      for (const p of pipes) {
        const x = p.x - dist, cy = p.cy + (p.moving ? Math.sin(tt * 1.5 + p.ph) * 50 * S : 0), top = cy - p.gap / 2, bot = cy + p.gap / 2;
        for (const [y0, y1] of [[-10, top], [bot, H + 10]]) {
          ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + 8, y0, p.w, y1 - y0);
          ctx.fillStyle = Wo.ob; ctx.fillRect(x, y0, p.w, y1 - y0);
          ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x + p.w * 0.5, y0, p.w * 0.5, y1 - y0);
          ctx.fillStyle = Wo.obS; const capY = y0 === -10 ? y1 - 16 * S : y0; ctx.fillRect(x - 6, capY, p.w + 12, 16 * S);
        }
      }
      coins.forEach((c) => { if (c.got) return; const x = c.x - dist, sq = Math.abs(Math.sin(tt * 4 + c.x)); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(x, c.y, 11 * S * sq + 2, 11 * S, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#e09f3e'; ctx.lineWidth = 2; ctx.stroke(); });
      pus.forEach((u) => { if (u.got) return; const x = u.x - dist; ctx.fillStyle = u.k === 'shield' ? '#48cae4' : '#ff4d6d'; ctx.beginPath(); ctx.arc(x, u.y + Math.sin(tt * 4) * 5, 16 * S, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `900 ${16 * S}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(u.k === 'shield' ? '⛨' : '⊃', x, u.y + Math.sin(tt * 4) * 5); });
      hills(dist, Wo.l[2], 12 * S, 20 * S, 0.02);
      puffs.forEach((p) => { ctx.globalAlpha = 1 - p.t / 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - p.t * 60, p.y, 6 + p.t * 16, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; });
      if (P) { drawPlane(ctx, P.x, P.y, P.rot, PLANES[G.plane], 1.2 * S); if (shield > 0) { ctx.strokeStyle = `rgba(72,202,228,${0.5 + Math.sin(tt * 10) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, 38 * S, 0, 6.283); ctx.stroke(); } }
      K.fx.draw(ctx); ctx.restore(); K.draw.grain(ctx, 0.05); K.fx.drawFlash(ctx, W * DPR, H * DPR);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; S = Math.max(0.8, Math.min(1.3, h / 720)); });
    K.music.set({ bpm: 104, chords: [[67, 71, 74], [64, 67, 71], [60, 64, 67], [62, 66, 69]], bass: true, arp: [1, 0, 1, 0, 1, 0, 0, 1], arpWave: 'triangle', lead: [79, 0, 0, 76, 0, 74, 0, 0, 72, 0, 74, 0, 0, 0, 0, 0], leadWave: 'sine', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

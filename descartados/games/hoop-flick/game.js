/* Hoop Flick — flick the ball into the hoop. 60-second rounds, swish streaks set the ball on fire, moving hoops later. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Impact", "Arial Black", sans-serif';
  const BALLS = [{ n: ['Classic', 'Clássica'], c: '#e76f51', l: '#1d1d1d', p: 0 }, { n: ['Street', 'Rua'], c: '#f4a261', l: '#264653', p: 300 }, { n: ['Retro', 'Retrô'], c: '#e63946', l: '#f1faee', p: 500 }, { n: ['Night', 'Noite'], c: '#3a0ca3', l: '#f72585', p: 800 }, { n: ['Gold', 'Ouro'], c: '#ffd166', l: '#6b4226', p: 1200 }, { n: ['Watermelon', 'Melancia'], c: '#38b000', l: '#ff5d73', gems: 30 }];
  const COURTS = [{ n: ['Park', 'Praça'], floor: '#c97c5d', wall: '#6d9dc5', p: 0 }, { n: ['Gym', 'Ginásio'], floor: '#d4a373', wall: '#3d405b', p: 500 }, { n: ['Rooftop', 'Terraço'], floor: '#5c677d', wall: '#ffb4a2', p: 800 }, { n: ['Beach', 'Praia'], floor: '#e9c46a', wall: '#48cae4', p: 1100 }];

  K.boot('hoop_flick', { g: { best: 0, ball: 0, balls: [0], court: 0, courts: [0] } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, S = 1;
    let ball = null, hoop = { x: 0, y: 0, vx: 0 }, score = 0, time = 60, streak = 0, playing = false, flick = null, net = 0, revived = false, touchedRim = false, scoredThis = false, level = 0, trail = [];
    const BR = () => 24 * S, RIM = () => 46 * S;
    function resetBall() { ball = { x: K.rand(W * 0.3, W * 0.7), y: H - 110 * S, vx: 0, vy: 0, live: false, r: 0, z: 1 }; touchedRim = false; scoredThis = false; trail = []; }
    function start() { score = 0; time = 60; streak = 0; revived = false; level = 0; hoop = { x: W / 2, y: H * 0.3, vx: 0 }; resetBall(); playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    function launch(dx, dy, dt) {
      const sp = Math.min(1.6, Math.hypot(dx, dy) / Math.max(0.06, dt) / 1600);
      if (dy > -30) return;
      ball.vx = (dx / Math.hypot(dx, dy)) * 900 * S * sp * 0.55; ball.vy = -Math.max(900, 1500 * sp) * S; ball.live = true; ball.z = 1;
      K.audio.play('whoosh', 1.2);
    }
    function scored() {
      const swish = !touchedRim; streak++; const pts = (swish ? 3 : 2) * (streak >= 3 ? 2 : 1); score += pts; scoredThis = true; net = 1;
      K.meta.track('baskets', 1); if (swish) K.meta.track('swish', 1);
      K.audio.play(swish ? 'combo' : 'coin', 1 + streak * 0.05);
      K.fx.text(hoop.x, hoop.y - 60 * S, (swish ? K.t(['SWISH! ', 'LIMPA! ']) : '') + '+' + pts, { color: streak >= 3 ? '#ff9f1c' : '#fff', stroke: '#1d1d1d', size: 34 });
      K.fx.burst(hoop.x, hoop.y + 20 * S, { n: 18, colors: streak >= 3 ? ['#ff9f1c', '#ffd166', '#e63946'] : ['#fff', '#ffd166'], speed: 240, shape: 'star', size: 5, life: 0.6 });
      if (streak === 3) { K.audio.play('power'); K.fx.text(W / 2, H * 0.5, K.t(['ON FIRE! x2', 'EM CHAMAS! x2']), { color: '#ff9f1c', stroke: '#1d1d1d', size: 44 }); K.game.happy(); }
      time += swish ? 2 : 1;
      if (score >= (level + 1) * 20) { level++; K.fx.text(W / 2, H * 0.4, K.t(['The hoop starts moving!', 'A cesta começou a se mover!']), { color: '#fff', stroke: '#1d1d1d', size: 26 }); }
    }
    function update(dt) {
      if (!playing) return;
      time -= dt; if (time <= 0) { time = 0; return end(); }
      // moving hoop
      if (level > 0) { hoop.vx = hoop.vx || 90 * S; hoop.x += hoop.vx * dt * Math.min(3, level); if (hoop.x < W * 0.2 || hoop.x > W * 0.8) hoop.vx *= -1; hoop.y = H * 0.3 + (level > 2 ? Math.sin(Date.now() / 700) * 40 * S : 0); }
      net = Math.max(0, net - dt * 2);
      if (!ball.live) return;
      const steps = 4, h = dt / steps, r = BR();
      for (let s = 0; s < steps; s++) {
        const prevY = ball.y;
        ball.vy += 2400 * S * h; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.r += ball.vx * h * 0.02;
        ball.z = K.clamp(1 - (H - 110 * S - ball.y) / (H * 1.6), 0.62, 1); // shrink as it travels "into" the court
        if (ball.vy > 0) {
          // rims: two points
          for (const rx of [hoop.x - RIM(), hoop.x + RIM()]) {
            const dx = ball.x - rx, dy = ball.y - hoop.y, d = Math.hypot(dx, dy), rr = r * ball.z;
            if (d < rr + 4) { const nx = dx / d, ny = dy / d, vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 1.6 * vn * nx; ball.vy -= 1.6 * vn * ny; ball.x = rx + nx * (rr + 4); ball.y = hoop.y + ny * (rr + 4); touchedRim = true; K.audio.play('thud', 1.4); } }
          }
          // backboard
          if (ball.y < hoop.y && ball.y > hoop.y - 120 * S && Math.abs(ball.x - hoop.x) < 80 * S && ball.z < 0.75 && prevY < hoop.y - 60 * S && false) ball.vx *= -1;
          if (!scoredThis && prevY <= hoop.y && ball.y > hoop.y && Math.abs(ball.x - hoop.x) < RIM() - r * ball.z * 0.5) scored();
        }
        if (ball.x < r || ball.x > W - r) { ball.vx *= -0.6; ball.x = K.clamp(ball.x, r, W - r); }
      }
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 10) trail.shift();
      if (ball.y > H + 60) { if (!scoredThis) { streak = 0; K.audio.play('error'); } resetBall(); }
    }
    function end() {
      playing = false; K.game.stop(); K.audio.play('win'); K.meta.track('games', 1); K.meta.trackMax('score', score);
      const nb = score > G.best; if (nb) G.best = score; K.save.mark(); K.meta.addXp(Math.floor(score / 3));
      K.std.end({ newBest: nb, title: K.t(["Time's up!", 'Acabou o tempo!']), rows: [[K.t('score'), score], [K.t('best'), G.best]], coins: score * 2,
        revive: revived ? null : () => { revived = true; time = 20; playing = true; K.game.start(); resetBall(); }, reviveLabel: K.t(['+20 seconds', '+20 segundos']), restart: start, menu: showMenu });
    }
    cv.addEventListener('pointerdown', (e) => { if (!playing || ball.live || K.ui.anyOpen()) return; if (Math.hypot(e.clientX - ball.x, e.clientY - ball.y) < BR() * 3) flick = { x: e.clientX, y: e.clientY, t: performance.now(), pts: [] }; });
    window.addEventListener('pointermove', (e) => { if (flick) { flick.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (flick.pts.length > 6) flick.pts.shift(); ball.x += (e.clientX - (flick.lx || flick.x)) * 0.2; flick.lx = e.clientX; } });
    window.addEventListener('pointerup', (e) => { if (!flick) return; const f = flick; flick = null; const p0 = f.pts[0] || f; launch(e.clientX - p0.x, e.clientY - p0.y, (performance.now() - (p0.t || f.t)) / 1000); });
    window.addEventListener('keydown', (e) => { if (!playing || ball.live) return; if (e.code === 'Space') { e.preventDefault(); const dx = hoop.x - ball.x; ball.vx = dx * 1.14 + K.rand(-75, 75) * S; ball.vy = -1500 * S; ball.live = true; K.audio.play('whoosh'); } if (e.code === 'ArrowLeft') ball.x -= 20; if (e.code === 'ArrowRight') ball.x += 20; });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Swipe the ball upward toward the hoop — the direction and speed of your flick matter. Clean swishes give 3 points and extra time. Three in a row sets you on fire for double points. Keyboard: arrows to move, Space to shoot.', pt: 'Deslize a bola para cima em direção à cesta — direção e velocidade importam. Cestas limpas valem 3 pontos e dão tempo extra. Três seguidas deixam você em chamas com pontos em dobro. Teclado: setas movem, Espaço arremessa.' },
      missions: [{ stat: 'baskets', base: 25, reward: 80, text: { en: 'Score {n} baskets', pt: 'Faça {n} cestas' } }, { stat: 'swish', base: 10, reward: 90, text: { en: 'Hit {n} swishes', pt: 'Acerte {n} cestas limpas' } }, { stat: 'score', base: 30, type: 'max', cap: 200, reward: 110, text: { en: 'Score {n} in one round', pt: 'Faça {n} pontos numa rodada' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'hfhud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Hoop<span>Flick</span>', sub: K.t('best') + ': ' + G.best, onPlay: start, buttons: [
        K.ui.btn('🏀 ' + K.t(['Balls', 'Bolas']), '', () => K.std.shop(K.t(['Balls', 'Bolas']), BALLS.map((b, i) => ({ id: i, name: K.t(b.n), price: b.p, gems: b.gems, html: `<div style="width:42px;height:42px;border-radius:50%;background:${b.c};box-shadow:inset 0 0 0 3px ${b.l}"></div>` })), { owned: G.balls, get: () => G.ball, set: (i) => (G.ball = i) })),
        K.ui.btn('🏟 ' + K.t(['Courts', 'Quadras']), '', () => K.std.shop(K.t(['Courts', 'Quadras']), COURTS.map((c, i) => ({ id: i, name: K.t(c.n), price: c.p, html: `<div style="width:56px;height:40px;border-radius:6px;background:linear-gradient(${c.wall} 55%,${c.floor} 55%)"></div>` })), { owned: G.courts, get: () => G.court, set: (i) => (G.court = i) }))] });
      if (!ball) { hoop = { x: W / 2, y: H * 0.3 }; resetBall(); }
    }
    function drawBall(x, y, r, rot, fire) {
      const B = BALLS[G.ball];
      if (fire) { for (let k = 0; k < 3; k++) { ctx.fillStyle = ['rgba(255,159,28,.5)', 'rgba(230,57,70,.4)', 'rgba(255,209,102,.5)'][k]; ctx.beginPath(); ctx.arc(x + K.rand(-4, 4), y + r * 0.6 + k * 6, r * (1 - k * 0.2), 0, 6.283); ctx.fill(); } }
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = B.c; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = B.l; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * 1.1, 0, r * 0.75, -1, 1); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.1, 0, r * 0.75, Math.PI - 1, Math.PI + 1); ctx.stroke();
      ctx.restore();
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    }
    let tt = 0;
    K.loop((dt) => { tt += dt; update(dt); K.fx.update(dt); if (playing) hud.innerHTML = `<div class="sb"><span>${K.t('score').toUpperCase()}</span><b>${score}</b></div><div class="sb t ${time < 10 ? 'low' : ''}"><span>${K.t(['TIME', 'TEMPO'])}</span><b>${Math.ceil(time)}</b></div>${streak >= 3 ? '<div class="fire">🔥 x2</div>' : ''}`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); const C = COURTS[G.court];
      ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, H * 0.62);
      ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 30, H * 0.62);
      ctx.fillStyle = C.floor; ctx.fillRect(0, H * 0.62, W, H * 0.38);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.62, W * 0.35, H * 0.12, 0, 0, Math.PI); ctx.stroke();
      if (!ball) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // backboard & pole
      const hx = hoop.x, hy = hoop.y, rim = RIM();
      ctx.fillStyle = '#6c757d'; ctx.fillRect(hx - 6 * S, hy - 40 * S, 12 * S, H * 0.62 - hy + 40 * S);
      ctx.fillStyle = 'rgba(255,255,255,.92)'; K.draw.rrect(ctx, hx - 90 * S, hy - 130 * S, 180 * S, 110 * S, 8); ctx.fill(); ctx.strokeStyle = '#e63946'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeRect(hx - 36 * S, hy - 80 * S, 72 * S, 55 * S);
      const behind = ball.live && ball.vy > 0 && ball.y < hy + 10 && ball.z < 0.8;
      const drawRimFront = () => { ctx.strokeStyle = '#e85d04'; ctx.lineWidth = 6 * S; ctx.beginPath(); ctx.moveTo(hx - rim, hy); ctx.lineTo(hx + rim, hy); ctx.stroke(); };
      // net
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
      const stretch = 1 + net * 0.4;
      for (let k = 0; k <= 6; k++) { const t = k / 6, x0 = hx - rim + t * rim * 2, x1 = hx - rim * 0.6 + t * rim * 1.2; ctx.beginPath(); ctx.moveTo(x0, hy); ctx.lineTo(x1 + Math.sin(tt * 8 + k) * net * 6, hy + 60 * S * stretch); ctx.stroke(); }
      for (let r2 = 1; r2 <= 3; r2++) { const y = hy + r2 * 20 * S * stretch, w = rim * (1 - r2 * 0.13); ctx.beginPath(); ctx.moveTo(hx - w, y); ctx.lineTo(hx + w, y); ctx.stroke(); }
      if (behind) { drawBall(ball.x, ball.y, BR() * ball.z, ball.r, streak >= 3); drawRimFront(); }
      else { drawRimFront(); trail.forEach((p, i) => { ctx.globalAlpha = (i / trail.length) * 0.25; ctx.fillStyle = streak >= 3 ? '#ff9f1c' : '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, BR() * ball.z * 0.7, 0, 6.283); ctx.fill(); }); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(ball.x, H - 80 * S, BR() * 0.9, 8, 0, 0, 6.283); ctx.fill(); drawBall(ball.x, ball.y, BR() * ball.z, ball.r, streak >= 3); }
      if (playing && !ball.live) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `700 ${16 * S}px "Impact","Arial Black"`; ctx.textAlign = 'center'; ctx.fillText('⇡ ' + K.t(['FLICK UP', 'DESLIZE PARA CIMA']), ball.x, ball.y + 50 * S + Math.sin(tt * 5) * 4); }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; S = Math.max(0.75, Math.min(1.3, Math.min(w / 420, h / 760))); if (!playing) hoop = { x: w / 2, y: h * 0.3 }; });
    K.music.set({ bpm: 96, chords: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bass: true, busy: true, drums: { k: [1, 0, 0, 1, 0, 0, 1, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] }, arp: [1, 0, 0, 0, 1, 0, 0, 0], arpWave: 'square' });
    showMenu();
  }
})();

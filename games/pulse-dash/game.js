/* Pulse Dash — auto-running cube, tap to jump over spikes, onto blocks, off pads and orbs. 30 rhythmic levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const U = 40, SPEED = 9 * U, GRAV = 95 * U, JUMP = 21 * U;
  const ICONS = [{ c: '#ffd60a', e: '#00f5d4', p: 0 }, { c: '#ff006e', e: '#ffbe0b', p: 300 }, { c: '#3a86ff', e: '#ffffff', p: 500 }, { c: '#8338ec', e: '#3a86ff', p: 700 }, { c: '#06d6a0', e: '#073b4c', p: 1000 }, { c: '#ffffff', e: '#ff006e', p: 1400 }, { c: '#fb5607', e: '#ffbe0b', gems: 30 }];
  const HUES = [200, 280, 330, 20, 140, 50];
  const LEVELS = 30;

  K.boot('pulse_dash', { g: { lvl: 0, prog: {}, icon: 0, icons: [0], attempts: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, S = 1;
    // level building blocks (x in units, relative)
    const CHUNKS = [
      (o) => [['s', 0]], (o) => [['s', 0], ['s', 1]], (o) => [['s', 0], ['s', 1], ['s', 2]],
      (o) => [['b', 0, 1], ['b', 1, 1], ['s', 2], ['b', 3, 1]], (o) => [['b', 0, 1], ['b', 1, 2], ['b', 2, 3], ['s', 3], ['s', 4]],
      (o) => [['p', 0], ['s', 2], ['s', 3], ['s', 4]], (o) => [['s', 0], ['o', 3, 3], ['s', 3], ['s', 4], ['s', 5], ['s', 6]],
      (o) => [['b', 0, 2], ['b', 1, 2], ['b', 2, 2], ['s', 1, 0, 'top']], (o) => [['b', 0, 1], ['b', 1, 1], ['b', 2, 1], ['b', 3, 1], ['s', 4], ['s', 5]],
      (o) => [['p', 0], ['b', 3, 3], ['b', 4, 3], ['b', 5, 3], ['s', 3], ['s', 4], ['s', 5]],
    ];
    function buildLevel(i) {
      const r = K.rng(i * 7919 + 17), objs = []; let x = 14;
      const len = 120 + i * 12, pool = Math.min(CHUNKS.length, 2 + Math.floor(i / 2));
      while (x < len) {
        const ch = CHUNKS[Math.floor(r() * pool)]();
        let w = 0;
        ch.forEach(([t, dx, h, mod]) => { objs.push({ t, x: x + dx, h: h || 0, top: mod === 'top' }); w = Math.max(w, dx + 1); });
        x += w + Math.max(3, 7 - Math.floor(i / 6)) + Math.floor(r() * 3);
      }
      return { objs, end: x + 8, hue: HUES[i % HUES.length] };
    }
    let L = null, lvIdx = 0, P = null, cam = 0, playing = false, dead = false, attempt = 1, trail = [], checkpoint = 0, practice = false, beatT = 0, pulse = 0;
    function startLevel(i, fromCheckpoint) {
      lvIdx = i; L = buildLevel(i);
      P = { x: fromCheckpoint ? checkpoint : 0, y: 0, vy: 0, rot: 0, ground: true };
      cam = P.x; dead = false; trail = []; playing = true; if (!fromCheckpoint) { checkpoint = 0; attempt = 1; }
      K.std.hideMenu(); hud.style.display = ''; K.game.start();
    }
    const holdJump = { on: false };
    function jumpPress() { if (!playing) return; holdJump.on = true; tryJump(); }
    function tryJump() {
      if (!P || dead) return;
      // orbs: mid-air jump when overlapping
      const orb = L.objs.find((o) => o.t === 'o' && !o.used && Math.abs(o.x * U - P.x) < U * 0.9 && Math.abs(-o.h * U - U / 2 - P.y) < U * 1.1);
      if (orb) { orb.used = true; P.vy = -JUMP * 1.05; K.audio.play('power', 1.5); pulse = 1; return; }
      if (P.ground) { P.vy = -JUMP; P.ground = false; K.audio.play('jump', 1.3); }
    }
    cv.addEventListener('pointerdown', jumpPress); window.addEventListener('pointerup', () => (holdJump.on = false));
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); if (!e.repeat) jumpPress(); } });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') holdJump.on = false; });
    function die() {
      if (dead) return; dead = true; G.attempts++; K.meta.track('attempts', 1);
      K.audio.play('explode', 1.3); K.fx.shake(10);
      const sx = (P.x - cam) * S + W * 0.3, sy = groundY() + P.y * S - U * S / 2;
      K.fx.burst(sx, sy, { n: 30, colors: [ICONS[G.icon].c, ICONS[G.icon].e, '#fff'], speed: 400, g: 400, shape: 'square', size: 6, life: 0.8 });
      const pct = Math.floor((P.x / (L.end * U)) * 100); if (pct > (G.prog[lvIdx] || 0)) G.prog[lvIdx] = pct; K.save.mark();
      if (practice) { setTimeout(() => startLevel(lvIdx, true), 600); return; }
      if (attempt % 4 === 0 || !K.meta.s) { playing = false; K.game.stop(); setTimeout(() => panel(pct), 700); }
      else setTimeout(() => { attempt++; startLevel(lvIdx, false); attempt; }, 700);
    }
    function panel(pct) {
      K.std.end({ title: K.t(['Attempt', 'Tentativa']) + ' ' + attempt, text: pct + '%', coins: Math.floor(pct / 10),
        revive: () => { practice = true; playing = true; K.game.start(); startLevel(lvIdx, true); K.ui.toast(K.t(['Checkpoints on for this level!', 'Checkpoints ligados nesta fase!'])); }, reviveLabel: K.t(['Checkpoints', 'Checkpoints']),
        restart: () => { attempt++; startLevel(lvIdx, false); }, menu: showMenu });
    }
    function win() {
      playing = false; K.game.stop(); practice = false; K.audio.play('win'); K.std.confetti(['#ffd60a', '#00f5d4', '#ff006e', '#fff']);
      G.prog[lvIdx] = 100; if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(25); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Level complete!', 'Fase completa!']), rows: [[K.t(['Attempts', 'Tentativas']), attempt]], coins: 50 + lvIdx * 10, gems: attempt <= 3 ? 2 : 0, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 900);
    }
    const groundY = () => H * 0.72;
    function update(dt) {
      if (!playing || !P || dead) return;
      const prevY = P.y; P.x += SPEED * dt; P.vy += GRAV * dt; P.y += P.vy * dt;
      let floor = 0; // y is negative going up
      const px0 = P.x - U / 2 + 4, px1 = P.x + U / 2 - 4;
      for (const o of L.objs) {
        const ox = o.x * U; if (ox > P.x + U * 2 || ox < P.x - U * 2) continue;
        if (o.t === 'b') {
          const top = -o.h * U, bx0 = ox - U / 2, bx1 = ox + U / 2;
          if (px1 > bx0 && px0 < bx1) {
            if (P.vy >= 0 && prevY <= top + 4 && P.y >= top - 1) floor = Math.min(floor, top);
            else if (P.y > top + 4 && P.y - U < 0) return die(); // ran into the side
          }
        }
        if (o.t === 's') { const base = o.top ? -o.h * U - 0 : 0, sx = ox, h = U * 0.8; if (Math.abs(P.x - sx) < U * 0.42 && P.y > base - h * 0.55 && P.y - U < base) return die(); }
        if (o.t === 'p' && Math.abs(P.x - ox) < U * 0.6 && P.y > -12) { P.vy = -JUMP * 1.45; P.ground = false; K.audio.play('jump', 0.7); pulse = 1; }
      }
      if (P.y >= floor) { if (!P.ground) { P.rot = Math.round(P.rot / (Math.PI / 2)) * (Math.PI / 2); } P.y = floor; P.vy = 0; P.ground = true; if (holdJump.on) tryJump(); }
      else { P.ground = false; P.rot += dt * 7.5; }
      // fell off a block edge: floor becomes 0 naturally
      cam = P.x;
      if (practice && P.ground && P.x - checkpoint > U * 12) { checkpoint = P.x; K.fx.text(W * 0.3, groundY() - 120, '◆', { color: '#00f5d4', size: 26 }); }
      trail.push({ x: P.x, y: P.y }); if (trail.length > 14) trail.shift();
      if (P.x >= L.end * U) win();
      beatT += dt; if (beatT > 60 / 128) { beatT = 0; pulse = Math.max(pulse, 0.5); }
      pulse = Math.max(0, pulse - dt * 3);
    }

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Your cube runs by itself. Tap, click or press Space to jump (hold to keep jumping). Avoid spikes, land on blocks, touch yellow pads to launch and tap in the air on rings to double-jump. Turn on checkpoints to practice.', pt: 'O cubo corre sozinho. Toque, clique ou aperte Espaço para pular (segure para continuar pulando). Evite espinhos, pouse nos blocos, toque nas plataformas amarelas e toque no ar nos anéis para pulo duplo. Ligue checkpoints para treinar.' },
      missions: [{ stat: 'levels', base: 2, reward: 130, text: { en: 'Complete {n} levels', pt: 'Complete {n} fases' } }, { stat: 'attempts', base: 25, reward: 60, text: { en: 'Make {n} attempts', pt: 'Faça {n} tentativas' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'pdhud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; practice = false; hud.style.display = 'none';
      K.std.menu({ title: 'Pulse<span>Dash</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => startLevel(G.lvl),
        buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, null, (i) => { K.std.hideMenu(); startLevel(i); }, (i) => (G.prog[i] || 0) + '%')),
          K.ui.btn('■ ' + K.t(['Icons', 'Ícones']), '', () => K.std.shop(K.t(['Icons', 'Ícones']), ICONS.map((c, i) => ({ id: i, price: c.p, gems: c.gems, html: `<div style="width:40px;height:40px;background:${c.c};border:4px solid #111;box-shadow:inset 0 0 0 6px ${c.e}"></div>` })), { owned: G.icons, get: () => G.icon, set: (i) => (G.icon = i) }))] });
      if (!L) { L = buildLevel(G.lvl); P = { x: 0, y: 0, vy: 0, rot: 0 }; }
    }
    function drawCube(x, y, rot, s) {
      const I = ICONS[G.icon];
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = '#111'; ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.fillStyle = I.c; ctx.fillRect(-s / 2 + 3, -s / 2 + 3, s - 6, s - 6);
      ctx.fillStyle = I.e; ctx.fillRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.56);
      ctx.fillStyle = '#111'; ctx.fillRect(-s * 0.2, -s * 0.12, s * 0.12, s * 0.12); ctx.fillRect(s * 0.08, -s * 0.12, s * 0.12, s * 0.12); ctx.fillRect(-s * 0.16, s * 0.08, s * 0.32, s * 0.06);
      ctx.restore();
    }
    let tt = 0;
    K.loop((dt) => { tt += dt; update(dt); K.fx.update(dt); if (playing && L) hud.innerHTML = `<div class="bar"><i style="width:${Math.min(100, (P.x / (L.end * U)) * 100)}%"></i></div><small>${K.t(['Attempt', 'Tentativa'])} ${attempt}${practice ? ' · ◆' : ''}</small>`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (!L) return;
      const hue = L.hue, gy = groundY();
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, `hsl(${hue},70%,${18 + pulse * 6}%)`); gr.addColorStop(1, `hsl(${hue + 30},80%,${35 + pulse * 6}%)`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // parallax squares
      ctx.fillStyle = `hsla(${hue},80%,70%,.08)`; for (let i = 0; i < 12; i++) { const s = 60 + (i % 4) * 30, x = ((i * 211 - cam * 0.2 * S) % (W + 200) + W + 200) % (W + 200) - 100, y = (i * 97) % (gy - 80); ctx.fillRect(x, y, s, s); }
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      const toX = (x) => (x - cam) * S + W * 0.3;
      // ground
      ctx.fillStyle = `hsl(${hue},60%,12%)`; ctx.fillRect(0, gy, W, H - gy);
      ctx.strokeStyle = `hsl(${hue},100%,75%)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      ctx.strokeStyle = `hsla(${hue},100%,75%,.15)`; ctx.lineWidth = 1; for (let x = -((cam * S) % (U * S)); x < W; x += U * S) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, H); ctx.stroke(); }
      const us = U * S;
      for (const o of L.objs) {
        const x = toX(o.x * U); if (x < -us * 2 || x > W + us * 2) continue;
        if (o.t === 'b') { const y = gy - o.h * us; ctx.fillStyle = `hsl(${hue},50%,14%)`; ctx.fillRect(x - us / 2, y, us, o.h * us); ctx.strokeStyle = `hsl(${hue},100%,78%)`; ctx.lineWidth = 2.5; ctx.strokeRect(x - us / 2 + 1, y + 1, us - 2, us - 2); ctx.strokeStyle = `hsla(${hue},100%,78%,.3)`; ctx.strokeRect(x - us / 2 + 6, y + 6, us - 12, us - 12); }
        if (o.t === 's') { const base = gy - (o.top ? o.h * us : 0), h = us * 0.8; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x - us * 0.45, base); ctx.lineTo(x, base - h); ctx.lineTo(x + us * 0.45, base); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        if (o.t === 'p') { ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.ellipse(x, gy - 4, us * 0.45, 7 + pulse * 3, 0, Math.PI, 0); ctx.fill(); }
        if (o.t === 'o') { const y = gy - o.h * us - us / 2; ctx.strokeStyle = o.used ? 'rgba(255,255,255,.2)' : '#ffd60a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, us * 0.35 + pulse * 4, 0, 6.283); ctx.stroke(); ctx.fillStyle = o.used ? 'rgba(255,255,255,.1)' : 'rgba(255,214,10,.4)'; ctx.fill(); }
      }
      // finish wall
      const fx = toX(L.end * U); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(fx, 0, W, gy); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, gy); ctx.stroke();
      if (P && !dead) {
        trail.forEach((t, i) => { ctx.globalAlpha = (i / trail.length) * 0.4; ctx.fillStyle = ICONS[G.icon].c; const s = us * 0.4 * (i / trail.length); ctx.fillRect(toX(t.x) - s / 2 - us * 0.3, gy + t.y * S - us / 2 - s / 2, s, s); }); ctx.globalAlpha = 1;
        drawCube(toX(P.x), gy + P.y * S - us / 2, P.rot, us);
        if (P.ground && Math.random() < 0.5) K.fx.burst(toX(P.x) - us / 2, gy - 2, { n: 1, colors: ['#fff'], speed: 60, angle: Math.PI, spread: 0.5, g: -50, size: 3, life: 0.3, shape: 'square' });
      }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; S = Math.max(0.7, Math.min(1.3, h / 720)); });
    K.music.set({ bpm: 128, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], bass: true, busy: true, bassWave: 'sawtooth', arp: [1, 1, 1, 1, 1, 1, 1, 1], arpWave: 'square', lead: [69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 71, 0, 67, 0, 71, 0], leadWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    showMenu();
  }
})();

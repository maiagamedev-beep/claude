/* Dirt Flip — side-scrolling dirt bike with verlet physics. Gas, brake, lean; flips shave time off. 30 tracks. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const BIKES = [{ n: ['Scrambler', 'Scrambler'], c: '#e63946', p: 0, pw: 1 }, { n: ['Hornet', 'Vespa'], c: '#ffb703', p: 800, pw: 1.08 }, { n: ['Viper', 'Víbora'], c: '#2a9d8f', p: 1600, pw: 1.15 }, { n: ['Phantom', 'Fantasma'], c: '#3d405b', p: 2600, pw: 1.22 }, { n: ['Blaze', 'Chama'], c: '#ff5400', gems: 40, pw: 1.3 }];
  const LEVELS = 30;

  K.boot('dirt_flip', { g: { lvl: 0, best: {}, stars: {}, bike: 0, bikes: [0] } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, S = 1;
    let T = null, lvIdx = 0, wheels = null, head = null, playing = false, time = 0, flips = 0, rotAcc = 0, lastAng = 0, crashed = false, finished = false, camX = 0, camY = 0, checkpoint = 0, revived = false, airT = 0;
    function track(i) {
      const r = K.rng(i * 313 + 7), pts = [[-200, 0], [300, 0]]; let x = 300, y = 0;
      const len = 3500 + i * 250, diff = Math.min(1, i / 25);
      while (x < len) {
        const kind = r();
        if (kind < 0.3) { // ramp + gap-ish drop
          const h = 50 + r() * (60 + diff * 90); pts.push([x + 220, y - h]); pts.push([x + 250, y - h + 10]); x += 250; y = y - h + 10;
          const drop = 40 + r() * 100; pts.push([x + 180, y + drop]); x += 180; y += drop;
        } else if (kind < 0.55) { // bumps
          for (let k = 0; k < 4; k++) { pts.push([x + 50, y - 30 - r() * 20 * (1 + diff)]); pts.push([x + 100, y]); x += 100; }
        } else if (kind < 0.75) { // hill
          const h = 60 + r() * 110; for (let k = 1; k <= 8; k++) pts.push([x + k * 50, y - Math.sin((k / 8) * Math.PI) * h]); x += 400;
        } else { // slope change
          const dy = (r() - 0.5) * 220; pts.push([x + 260, y + dy]); x += 260; y += dy;
        }
        pts.push([x + 80, y]); x += 80;
      }
      pts.push([x + 600, y]); pts.push([x + 1200, y]);
      return { pts, finish: x + 200, sky: ['#ffcf99', '#ffe8d6', '#bde0fe', '#d8f3dc', '#ffd6e0'][i % 5], ground: ['#9c6644', '#7f5539', '#6a994e', '#b08968', '#8d6e63'][i % 5] };
    }
    function groundAt(x) { const p = T.pts; let lo = 0, hi = p.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= x) lo = m; else hi = m; } const a = p[lo], b = p[hi], t = (x - a[0]) / (b[0] - a[0] || 1); return { y: a[1] + (b[1] - a[1]) * t, nx: b[1] - a[1], ny: -(b[0] - a[0]) }; }
    const WR = 18, WB = 62;
    function spawn(x) { const g = groundAt(x); wheels = [{ x: x - WB / 2, y: g.y - WR - 5, px: x - WB / 2, py: g.y - WR - 5, spin: 0 }, { x: x + WB / 2, y: g.y - WR - 5, px: x + WB / 2, py: g.y - WR - 5, spin: 0 }]; head = { x, y: g.y - WR - 60, px: x, py: g.y - WR - 60 }; }
    function startLevel(i) { lvIdx = i; T = track(i); spawn(100); time = 0; flips = 0; rotAcc = 0; crashed = false; finished = false; checkpoint = 100; revived = false; lastAng = 0; camX = 0; playing = true; K.std.hideMenu(); hud.style.display = pad.style.display = ''; K.game.start(); }
    const input = { gas: false, brake: false, left: false, right: false };
    function physics(dt) {
      const steps = 6, h = dt / steps, g = 1500;
      for (let s = 0; s < steps; s++) {
        const pts = [wheels[0], wheels[1], head];
        const ang = Math.atan2(wheels[1].y - wheels[0].y, wheels[1].x - wheels[0].x);
        const grounded = wheels.map((w) => { const gg = groundAt(w.x); return w.y + WR >= gg.y - 2; });
        for (const p of pts) { const vx = (p.x - p.px) * 0.999, vy = (p.y - p.py) * 0.999; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g * h * h; }
        // motor: push along the frame direction when the rear wheel touches the ground
        const pw = BIKES[G.bike].pw;
        const spd = Math.hypot(wheels[0].x - wheels[0].px, wheels[0].y - wheels[0].py) / h;
        const rg = groundAt(wheels[0].x), gA = Math.atan2(rg.nx, -rg.ny); // ground tangent angle at the rear wheel
        if (input.gas && grounded[0] && spd < 820) { const f = 1700 * pw * h * h, tx = Math.cos(gA), ty = Math.sin(gA); wheels.forEach((w) => { w.x += tx * f; w.y += ty * f; }); head.x += tx * f; head.y += ty * f; }
        if (input.brake && (grounded[0] || grounded[1])) { wheels.forEach((w) => { w.px = K.lerp(w.px, w.x, 0.08); w.py = K.lerp(w.py, w.y, 0.02); }); }
        // lean (rotate around the middle)
        let lean = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (grounded[0] && !grounded[1] && ang - gA < -0.45 && !input.left) lean = Math.max(lean, 1.4); // anti-wheelie assist
        if (!lean && !grounded[0] && !grounded[1] && Math.abs(ang) > 0.15 && Math.abs(ang) < 2.2) lean = -Math.sign(ang) * 0.35; // gentle auto-level in the air
        if (lean) { const cx = (wheels[0].x + wheels[1].x) / 2, cy = (wheels[0].y + wheels[1].y) / 2, k = lean * (grounded[0] || grounded[1] ? 1.5 : 4.5) * h; [wheels[0], wheels[1], head].forEach((p) => { const dx = p.x - cx, dy = p.y - cy; p.x = cx + dx * Math.cos(k) - dy * Math.sin(k); p.y = cy + dx * Math.sin(k) + dy * Math.cos(k); }); }
        // constraints: rigid triangle
        for (let it = 0; it < 4; it++) {
          link(wheels[0], wheels[1], WB); link(wheels[0], head, Math.hypot(WB / 2, 60)); link(wheels[1], head, Math.hypot(WB / 2, 60));
          for (const w of wheels) {
            const gg = groundAt(w.x), pen = w.y + WR - gg.y; if (pen <= 0) continue;
            const nl = Math.hypot(gg.nx, gg.ny) || 1, nx = gg.nx / nl, ny = gg.ny / nl;
            let vx = w.x - w.px, vy = w.y - w.py; w.y -= pen;
            const vn = vx * nx + vy * ny; if (vn < 0) { vx -= 1.1 * vn * nx; vy -= 1.1 * vn * ny; }
            w.px = w.x - vx * 0.999; w.py = w.y - vy * 0.999;
          }
        }
        // head crash
        const gh = groundAt(head.x); if (head.y + 10 > gh.y && !crashed) crash();
      }
      wheels.forEach((w) => (w.spin += (w.x - w.px) * 0.08));
      // flip counting
      const ang = Math.atan2(wheels[1].y - wheels[0].y, wheels[1].x - wheels[0].x);
      let d = ang - lastAng; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; lastAng = ang;
      const air = !wheels.some((w) => w.y + WR >= groundAt(w.x).y - 3);
      if (air) { rotAcc += d; airT += dt; } else { if (Math.abs(rotAcc) > 5.2) { const n = Math.round(Math.abs(rotAcc) / 6.283) || 1; flips += n; time = Math.max(0, time - 1.5 * n); K.meta.track('flips', n); K.audio.play('combo'); K.fx.text(W / 2, H * 0.3, (rotAcc < 0 ? K.t(['BACKFLIP', 'MORTAL P/ TRÁS']) : K.t(['FRONTFLIP', 'MORTAL P/ FRENTE'])) + (n > 1 ? ' x' + n : '') + '  -1.5s', { color: '#ffd60a', stroke: '#1d1d1d', size: 30, life: 1.3 }); K.game.happy(); } else if (airT > 0.9) K.audio.play('land'); rotAcc = 0; airT = 0; }
      if (!air && wheels[0].x > checkpoint + 900) { checkpoint = wheels[0].x; }
      if (wheels[0].x > T.finish && !finished) finish();
      if (wheels[0].y > 3000) crash();
    }
    function link(a, b, len) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - len) / d / 2; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; }
    function crash() {
      crashed = true; playing = false; K.game.stop(); K.audio.play('hit'); K.audio.play('lose'); K.fx.shake(14); K.fx.flash('#fff', 0.4);
      const s = toS(head.x, head.y); K.fx.burst(s.x, s.y, { n: 24, colors: [BIKES[G.bike].c, '#fff', '#9c6644'], speed: 300, size: 6, shape: 'square' });
      setTimeout(() => K.std.end({ text: K.t(['Wipeout!', 'Tombou!']), rows: [[K.t(['Progress', 'Progresso']), Math.floor((wheels[0].x / T.finish) * 100) + '%']], coins: 5,
        revive: () => { revived = true; spawn(checkpoint); crashed = false; playing = true; K.game.start(); lastAng = 0; rotAcc = 0; }, reviveLabel: K.t(['Checkpoint', 'Checkpoint']), restart: () => startLevel(lvIdx), menu: showMenu }), 900);
    }
    function finish() {
      finished = true; playing = false; K.game.stop(); K.audio.play('win'); K.std.confetti(['#ffd60a', '#e63946', '#fff']);
      const par = 25 + lvIdx * 1.8, stars = time <= par * 0.8 ? 3 : time <= par ? 2 : 1;
      if (!G.best[lvIdx] || time < G.best[lvIdx]) G.best[lvIdx] = +time.toFixed(2); G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars);
      if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++; K.meta.track('tracks', 1); K.meta.addXp(20); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Finish!', 'Chegada!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t(['Time', 'Tempo']), time.toFixed(2) + 's'], [K.t(['Flips', 'Mortais']), flips]], coins: 40 + lvIdx * 8 + stars * 15 + flips * 5, mult: 3, next: { fn: () => startLevel(G.lvl) }, restart: () => startLevel(lvIdx), menu: showMenu }), 900);
    }
    const toS = (x, y) => ({ x: (x - camX) * S + W * 0.35, y: (y - camY) * S + H * 0.6 });
    // input
    const keyMap = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', (e) => { const k = keyMap[e.code]; if (k) { e.preventDefault(); input[k] = true; if (k === 'right' && !e.shiftKey) input.gas = input.gas || false; } });
    window.addEventListener('keyup', (e) => { const k = keyMap[e.code]; if (k) input[k] = false; });
    const pad = K.el('div', 'dfpad'); K.ui.root.appendChild(pad);
    [['brake', '◀◀'], ['left', '↺'], ['right', '↻'], ['gas', '▶▶']].forEach(([k, lb]) => { const b = K.el('button', 'db ' + k, lb); const on = (v) => (e) => { e.preventDefault(); input[k] = v; b.classList.toggle('on', v); }; b.addEventListener('pointerdown', on(true)); b.addEventListener('pointerup', on(false)); b.addEventListener('pointerleave', on(false)); b.addEventListener('pointercancel', on(false)); pad.appendChild(b); });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Up/W = gas, Down/S = brake, Left/Right (A/D) = lean back/forward (spin in the air). On touch use the four buttons. Land on your wheels — flips take 1.5 s off your time!', pt: 'Cima/W = acelerar, Baixo/S = frear, Esquerda/Direita (A/D) = inclinar (girar no ar). No toque use os quatro botões. Caia sobre as rodas — mortais tiram 1,5 s do seu tempo!' },
      missions: [{ stat: 'flips', base: 6, reward: 90, text: { en: 'Land {n} flips', pt: 'Acerte {n} mortais' } }, { stat: 'tracks', base: 3, reward: 110, text: { en: 'Finish {n} tracks', pt: 'Termine {n} pistas' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = pad.style.display = 'none';
      K.std.menu({ title: 'Dirt<span>Flip</span>', sub: K.t(['Track', 'Pista']) + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => startLevel(G.lvl),
        buttons: [K.ui.btn('▦ ' + K.t(['Tracks', 'Pistas']), '', () => K.std.levels(K.t(['Tracks', 'Pistas']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); startLevel(i); }, (i) => (G.best[i] ? G.best[i].toFixed(1) + 's' : ''))),
          K.ui.btn('🏍 ' + K.t(['Bikes', 'Motos']), '', () => K.std.shop(K.t(['Bikes', 'Motos']) , BIKES.map((b, i) => ({ id: i, name: K.t(b.n) + ` · ${Math.round(b.pw * 100)}%`, price: b.p, gems: b.gems, html: `<div style="width:56px;height:28px;border-radius:14px 14px 4px 4px;background:${b.c};border:3px solid #1d1d1d"></div>` })), { owned: G.bikes, get: () => G.bike, set: (i) => (G.bike = i) }))] });
      if (!T) { T = track(G.lvl); spawn(100); }
    }
    function drawBike() {
      const [a, b] = wheels, ang = Math.atan2(b.y - a.y, b.x - a.x), c = toS((a.x + b.x) / 2, (a.y + b.y) / 2), hs = toS(head.x, head.y), col = BIKES[G.bike].c;
      wheels.forEach((w) => { const s = toS(w.x, w.y); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(w.spin); ctx.fillStyle = '#1d1d1d'; ctx.beginPath(); ctx.arc(0, 0, WR * S, 0, 6.283); ctx.fill(); ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(0, 0, WR * S * 0.55, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * 1.57) * WR * S * 0.55, Math.sin(k * 1.57) * WR * S * 0.55); ctx.stroke(); } ctx.restore(); });
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang); const u = S;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-26 * u, -8 * u); ctx.lineTo(18 * u, -14 * u); ctx.lineTo(30 * u, -4 * u); ctx.lineTo(4 * u, 4 * u); ctx.lineTo(-20 * u, 2 * u); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.moveTo(-31 * u, 0); ctx.lineTo(-10 * u, -6 * u); ctx.moveTo(31 * u, 0); ctx.lineTo(20 * u, -18 * u); ctx.lineTo(12 * u, -24 * u); ctx.stroke();
      ctx.fillStyle = '#343a40'; ctx.fillRect(-14 * u, -14 * u, 18 * u, 6 * u);
      ctx.restore();
      // rider
      const hip = toS((a.x + b.x) / 2 - Math.cos(ang) * 6, (a.y + b.y) / 2 - Math.sin(ang) * 6 - 18);
      ctx.strokeStyle = '#264653'; ctx.lineWidth = 7 * S; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(hs.x, hs.y + 10 * S); ctx.stroke();
      const hand = toS((a.x + b.x) / 2 + Math.cos(ang) * 16, (a.y + b.y) / 2 + Math.sin(ang) * 16 - 22); ctx.lineWidth = 5 * S; ctx.beginPath(); ctx.moveTo((hip.x + hs.x) / 2, (hip.y + hs.y) / 2); ctx.lineTo(hand.x, hand.y); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hs.x, hs.y, 11 * S, 0, 6.283); ctx.fill(); ctx.fillStyle = '#1d1d1d'; ctx.fillRect(hs.x - 2 * S, hs.y - 4 * S, 12 * S, 6 * S); ctx.lineCap = 'butt';
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      if (playing && T) { time += dt; physics(dt); if (input.gas && Math.random() < 0.3) { const s = toS(wheels[0].x, wheels[0].y + WR); K.fx.burst(s.x, s.y, { n: 1, colors: ['#c9a27e'], speed: 90, angle: Math.PI + 0.3, spread: 0.4, g: 200, size: 4, life: 0.4 }); } }
      if (wheels) { const cx = (wheels[0].x + wheels[1].x) / 2, cy = (wheels[0].y + wheels[1].y) / 2; camX = K.lerp(camX, cx + 120, Math.min(1, dt * 4)); camY = K.lerp(camY, cy, Math.min(1, dt * 3)); }
      if (playing) hud.innerHTML = `<span class="chip">${K.t(['Track', 'Pista'])} ${lvIdx + 1}</span><span class="big">${time.toFixed(1)}s</span><span class="chip">${Math.min(100, Math.floor((wheels[0].x / T.finish) * 100))}%</span>`;
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (!T) return;
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, T.sky); gr.addColorStop(1, '#fff'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // distant mesas
      ctx.fillStyle = 'rgba(156,102,68,.25)'; for (let i = 0; i < 8; i++) { const x = ((i * 400 - camX * 0.2 * S) % (W + 400) + W + 400) % (W + 400) - 200; ctx.fillRect(x, H * 0.45, 180, H); ctx.fillRect(x + 20, H * 0.4, 140, 20); }
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // ground polygon
      ctx.fillStyle = T.ground; ctx.beginPath(); const x0 = camX - W / S, x1 = camX + W / S * 1.2; let started = false;
      for (const [x, y] of T.pts) { if (x < x0 - 200 || x > x1 + 200) continue; const s = toS(x, y); started ? ctx.lineTo(s.x, s.y) : (ctx.moveTo(s.x, H + 50), ctx.lineTo(s.x, s.y), (started = true)); }
      ctx.lineTo(W + 50, H + 50); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6a994e'; ctx.lineWidth = 8 * S; ctx.beginPath(); started = false; for (const [x, y] of T.pts) { if (x < x0 - 200 || x > x1 + 200) continue; const s = toS(x, y); started ? ctx.lineTo(s.x, s.y) : (ctx.moveTo(s.x, s.y), (started = true)); } ctx.stroke();
      // finish gate
      const f = toS(T.finish, groundAt(T.finish).y); for (let r = 0; r < 8; r++) for (let c = 0; c < 2; c++) { ctx.fillStyle = (r + c) % 2 ? '#fff' : '#1d1d1d'; ctx.fillRect(f.x + c * 12 * S, f.y - 150 * S + r * 12 * S, 12 * S, 12 * S); }
      const cp = toS(checkpoint, groundAt(checkpoint).y); ctx.fillStyle = '#2a9d8f'; ctx.fillRect(cp.x, cp.y - 60 * S, 4, 60 * S); ctx.beginPath(); ctx.moveTo(cp.x + 4, cp.y - 60 * S); ctx.lineTo(cp.x + 24 * S, cp.y - 52 * S); ctx.lineTo(cp.x + 4, cp.y - 44 * S); ctx.fill();
      if (wheels) drawBike();
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; S = Math.max(0.7, Math.min(1.2, h / 720)); });
    K.music.set({ bpm: 140, chords: [[52, 55, 59], [48, 52, 55], [50, 53, 57], [47, 50, 54]], bass: true, busy: true, bassWave: 'sawtooth', arp: [1, 0, 1, 1, 0, 1, 1, 0], arpWave: 'square', drums: { k: [1, 0, 1, 0, 1, 0, 1, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    showMenu();
  }
})();

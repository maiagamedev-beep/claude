/* Mini Putt — top-down mini golf. Drag back from the ball to putt. Walls, sand, water, bumpers and windmills. 36 holes. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const BALLS = [{ c: '#ffffff', p: 0 }, { c: '#ff5d8f', p: 300 }, { c: '#ffd60a', p: 400 }, { c: '#4cc9f0', p: 500 }, { c: '#80ed99', p: 700 }, { c: '#9b5de5', p: 900 }, { c: '#ff7b00', gems: 25 }];
  const HOLES = 36;
  // course generator: build from room shapes in a 600x900 logical field
  function course(i) {
    const r = K.rng(i * 431 + 19), shapes = ['I', 'L', 'Z', 'U', 'O', 'S'];
    const sh = i < 3 ? 'I' : shapes[Math.floor(r() * shapes.length)];
    const walls = [], sand = [], water = [], bumpers = [], mills = [], movers = [];
    let tee, cup, poly;
    const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    switch (sh) {
      case 'I': poly = box(150, 60, 450, 840); tee = [300, 760]; cup = [300, 150]; break;
      case 'L': poly = [[80, 60], [520, 60], [520, 300], [300, 300], [300, 840], [80, 840]]; tee = [190, 760]; cup = [440, 150]; break;
      case 'Z': poly = [[80, 60], [360, 60], [360, 360], [520, 360], [520, 840], [240, 840], [240, 540], [80, 540]]; tee = [380, 760]; cup = [200, 140]; break;
      case 'U': poly = [[60, 60], [540, 60], [540, 840], [380, 840], [380, 300], [220, 300], [220, 840], [60, 840]]; tee = [140, 760]; cup = [460, 760]; break;
      case 'O': poly = box(70, 60, 530, 840); tee = [300, 770]; cup = [300, 130]; walls.push([[200, 330], [400, 330]], [[400, 330], [400, 570]], [[400, 570], [200, 570]], [[200, 570], [200, 330]]); break;
      default: poly = [[60, 60], [540, 60], [540, 840], [60, 840]]; tee = [140, 770]; cup = [460, 130]; walls.push([[60, 320], [400, 320]], [[200, 580], [540, 580]]);
    }
    for (let k = 0; k < poly.length; k++) walls.push([poly[k], poly[(k + 1) % poly.length]]);
    const n = Math.min(4, Math.floor(i / 4) + 1);
    const inside = (x, y) => { let c = false; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const [xi, yi] = poly[a], [xj, yj] = poly[b]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const free = (x, y, rad) => inside(x, y) && Math.hypot(x - tee[0], y - tee[1]) > rad + 60 && Math.hypot(x - cup[0], y - cup[1]) > rad + 60;
    for (let k = 0; k < n; k++) {
      const t = r(), x = 100 + r() * 400, y = 180 + r() * 540;
      if (!free(x, y, 60)) continue;
      if (t < 0.3 && i > 1) sand.push([x, y, 45 + r() * 25]);
      else if (t < 0.5 && i > 5) water.push([x, y, 40 + r() * 20]);
      else if (t < 0.75) bumpers.push([x, y, 22]);
      else if (i > 8) mills.push([x, y, 70, r() * 6]);
      else bumpers.push([x, y, 22]);
    }
    if (i > 12 && r() < 0.5) movers.push({ y: 450, x0: 120, x1: 480, w: 90, ph: r() * 6 });
    const par = 2 + Math.floor(n / 2) + (sh === 'U' || sh === 'S' ? 1 : 0);
    return { walls, sand, water, bumpers, mills, movers, tee, cup, poly, par, hue: [110, 140, 90, 160, 120, 100][i % 6] };
  }

  K.boot('mini_putt', { g: { hole: 0, best: {}, ball: 0, balls: [0], mull: 3 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, sc = 1, ox = 0, oy = 0;
    const LW = 600, LH = 900, BR = 11;
    let C = null, holeIdx = 0, ball = null, strokes = 0, playing = false, aim = null, moving = false, sunk = false, lastPos = null, t0 = 0, roundTotal = 0;
    const toS = (x, y) => ({ x: ox + x * sc, y: oy + y * sc });
    const toL = (x, y) => ({ x: (x - ox) / sc, y: (y - oy) / sc });
    function startHole(i) { holeIdx = i; C = course(i); ball = { x: C.tee[0], y: C.tee[1], vx: 0, vy: 0, s: 1 }; strokes = 0; sunk = false; moving = false; lastPos = null; playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    function putt(dx, dy) { const pow = Math.min(1100, Math.hypot(dx, dy) * 5); if (pow < 30) return; const a = Math.atan2(dy, dx); lastPos = { x: ball.x, y: ball.y }; ball.vx = Math.cos(a) * pow; ball.vy = Math.sin(a) * pow; strokes++; moving = true; K.audio.play('tap', 0.8 + pow / 1500); K.meta.track('putts', 1); }
    function segHit(b, a, c, rad) { const dx = c[0] - a[0], dy = c[1] - a[1], t = K.clamp(((b.x - a[0]) * dx + (b.y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1), px = a[0] + dx * t, py = a[1] + dy * t, d = Math.hypot(b.x - px, b.y - py); return d < rad ? { nx: (b.x - px) / (d || 1), ny: (b.y - py) / (d || 1), pen: rad - d } : null; }
    function bounce(h, k) { const vn = ball.vx * h.nx + ball.vy * h.ny; if (vn < 0) { ball.vx -= (1 + k) * vn * h.nx; ball.vy -= (1 + k) * vn * h.ny; } ball.x += h.nx * h.pen; ball.y += h.ny * h.pen; }
    function physics(dt) {
      if (!moving || sunk) return;
      const steps = 6, h = dt / steps;
      for (let s = 0; s < steps; s++) {
        ball.x += ball.vx * h; ball.y += ball.vy * h;
        const inSand = C.sand.some(([x, y, r]) => Math.hypot(ball.x - x, ball.y - y) < r);
        const fr = inSand ? 900 : 170, sp = Math.hypot(ball.vx, ball.vy); if (sp > 0) { const f = Math.max(0, sp - fr * h) / sp; ball.vx *= f; ball.vy *= f; }
        for (const w of C.walls) { const hh = segHit(ball, w[0], w[1], BR); if (hh) { bounce(hh, 0.75); if (sp > 80) K.audio.play('thud', 1.6); } }
        for (const [x, y, r] of C.bumpers) { const d = Math.hypot(ball.x - x, ball.y - y); if (d < r + BR) { bounce({ nx: (ball.x - x) / d, ny: (ball.y - y) / d, pen: r + BR - d }, 1.1); K.audio.play('pop', 1.4); bump = { x, y, t: 0.2 }; } }
        for (const m of C.mills) { const t = performance.now() / 1000 * 1.5 + m[3]; for (let k = 0; k < 2; k++) { const a = t + k * Math.PI / 2, e0 = [m[0] - Math.cos(a) * m[2], m[1] - Math.sin(a) * m[2]], e1 = [m[0] + Math.cos(a) * m[2], m[1] + Math.sin(a) * m[2]]; const hh = segHit(ball, e0, e1, BR + 5); if (hh) { bounce(hh, 0.9); K.audio.play('hit', 1.8); } } }
        for (const mv of C.movers) { const x = K.lerp(mv.x0, mv.x1, (Math.sin(performance.now() / 900 + mv.ph) + 1) / 2); const hh = segHit(ball, [x - mv.w / 2, mv.y], [x + mv.w / 2, mv.y], BR + 6); if (hh) bounce(hh, 0.8); }
        // cup
        const dc = Math.hypot(ball.x - C.cup[0], ball.y - C.cup[1]), spd = Math.hypot(ball.vx, ball.vy);
        if (dc < 14 && spd < 520) return sink();
        if (dc < 26 && spd < 300) { ball.vx += (C.cup[0] - ball.x) * 6 * h; ball.vy += (C.cup[1] - ball.y) * 6 * h; }
        if (C.water.some(([x, y, r]) => Math.hypot(ball.x - x, ball.y - y) < r - 4)) { K.audio.play('whoosh', 0.5); K.fx.burst(toS(ball.x, ball.y).x, toS(ball.x, ball.y).y, { n: 16, colors: ['#90e0ef', '#fff'], speed: 160, size: 4, life: 0.5 }); strokes++; ball.x = lastPos.x; ball.y = lastPos.y; ball.vx = ball.vy = 0; moving = false; K.ui.toast(K.t(['Splash! +1 stroke', 'Tchibum! +1 tacada'])); return; }
      }
      if (Math.hypot(ball.vx, ball.vy) < 6) { ball.vx = ball.vy = 0; moving = false; if (strokes >= 10) finishHole(); }
    }
    let bump = null;
    function sink() {
      sunk = true; moving = false; K.tween(ball, { s: 0 }, 0.3); K.audio.play(strokes === 1 ? 'win' : 'coin');
      const s = toS(C.cup[0], C.cup[1]); K.fx.burst(s.x, s.y, { n: 30, colors: ['#ffd166', '#fff', '#80ed99'], speed: 280, shape: 'star', size: 6, life: 0.8 });
      const rel = strokes - C.par, name = strokes === 1 ? K.t(['HOLE IN ONE!', 'HOLE IN ONE!']) : rel <= -2 ? 'Eagle!' : rel === -1 ? 'Birdie!' : rel === 0 ? 'Par' : rel === 1 ? 'Bogey' : '+' + rel;
      K.fx.text(W / 2, H * 0.35, name, { color: '#fff', stroke: '#1b4332', size: strokes === 1 ? 50 : 38, life: 1.6 });
      if (strokes === 1) { K.meta.track('aces', 1); K.fx.flash('#fff', 0.5); K.game.happy(); }
      if (rel <= 0) K.meta.track('underpar', 1);
      setTimeout(finishHole, 1200);
    }
    function finishHole() {
      playing = false; K.game.stop();
      const prev = G.best[holeIdx]; if (!prev || strokes < prev) G.best[holeIdx] = strokes;
      if (holeIdx === G.hole && G.hole < HOLES - 1) G.hole++;
      const stars = strokes <= C.par - 1 ? 3 : strokes <= C.par ? 2 : 1;
      K.meta.track('holes', 1); K.meta.addXp(10); K.save.mark();
      K.std.end({ win: sunk, title: K.t(['Hole', 'Buraco']) + ' ' + (holeIdx + 1), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t(['Strokes', 'Tacadas']), strokes], ['Par', C.par]], coins: sunk ? 15 + stars * 10 + (strokes === 1 ? 50 : 0) : 5, mult: 3,
        revive: !sunk || strokes > C.par ? () => { if (G.mull > 0) G.mull--; startHole(holeIdx); } : null, reviveLabel: K.t(['Mulligan (replay)', 'Mulligan (repetir)']), next: { fn: () => startHole(Math.min(HOLES - 1, holeIdx + 1)) }, menu: showMenu });
    }
    cv.addEventListener('pointerdown', (e) => { if (!playing || moving || sunk || K.ui.anyOpen()) return; aim = { x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY }; });
    window.addEventListener('pointermove', (e) => { if (aim) { aim.cx = e.clientX; aim.cy = e.clientY; } });
    window.addEventListener('pointerup', () => { if (!aim) return; const a = aim; aim = null; putt((a.x - a.cx) / sc, (a.y - a.cy) / sc); });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Press anywhere and drag backward (like a slingshot) — the arrow shows direction and power. Release to putt. Sand slows you down, water costs a stroke, bumpers and windmills bounce you around.', pt: 'Pressione em qualquer lugar e arraste para trás (como estilingue) — a seta mostra direção e força. Solte para tacar. Areia freia, água custa uma tacada, bumpers e moinhos rebatem.' },
      missions: [{ stat: 'holes', base: 6, reward: 90, text: { en: 'Play {n} holes', pt: 'Jogue {n} buracos' } }, { stat: 'underpar', base: 3, reward: 100, text: { en: 'Finish {n} holes at par or better', pt: 'Termine {n} buracos no par ou melhor' } }, { stat: 'aces', base: 1, reward: 200, text: { en: 'Get {n} hole-in-one', pt: 'Faça {n} hole-in-one' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Mini<span>Putt</span>', sub: K.t(['Hole', 'Buraco']) + ' ' + (G.hole + 1) + ' / ' + HOLES, onPlay: () => startHole(G.hole),
        buttons: [K.ui.btn('⛳ ' + K.t(['Holes', 'Buracos']), '', () => K.std.levels(K.t(['Holes', 'Buracos']), HOLES, G.hole, null, (i) => { K.std.hideMenu(); startHole(i); }, (i) => (G.best[i] ? G.best[i] + '/' + course(i).par : 'par ' + course(i).par))),
          K.ui.btn('● ' + K.t(['Balls', 'Bolas']), '', () => K.std.shop(K.t(['Balls', 'Bolas']), BALLS.map((b, i) => ({ id: i, price: b.p, gems: b.gems, html: `<div style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,${b.c} 60%);border:2px solid rgba(0,0,0,.2)"></div>` })), { owned: G.balls, get: () => G.ball, set: (i) => (G.ball = i) }))] });
      if (!C) { C = course(G.hole); ball = { x: C.tee[0], y: C.tee[1], s: 1 }; }
    }
    let tt = 0;
    K.loop((dt) => { tt += dt; if (playing) physics(dt); if (bump) { bump.t -= dt; if (bump.t <= 0) bump = null; } K.fx.update(dt); if (playing) hud.innerHTML = `<span class="chip">${K.t(['Hole', 'Buraco'])} ${holeIdx + 1}</span><span class="chip">Par ${C.par}</span><span class="big">${strokes}</span>`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (!C) { ctx.fillStyle = '#2d6a4f'; ctx.fillRect(0, 0, W, H); return; }
      // surrounding landscape
      ctx.fillStyle = `hsl(${C.hue},35%,28%)`; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { const x = ((i * 137) % 100) / 100 * W, y = ((i * 71) % 100) / 100 * H; ctx.fillStyle = `hsla(${C.hue},40%,${20 + (i % 3) * 5}%,.9)`; ctx.beginPath(); ctx.arc(x, y, 14 + (i % 4) * 6, 0, 6.283); ctx.fill(); }
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // green with stripes
      const path = () => { ctx.beginPath(); C.poly.forEach(([x, y], k) => { const s = toS(x, y); k ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.closePath(); };
      ctx.save(); ctx.translate(0, 8); path(); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill(); ctx.restore();
      path(); ctx.fillStyle = `hsl(${C.hue},55%,48%)`; ctx.fill();
      ctx.save(); path(); ctx.clip(); for (let y = 0; y < LH; y += 60) { const a = toS(0, y), b = toS(LW, y + 30); ctx.fillStyle = `hsla(${C.hue},55%,58%,.35)`; ctx.fillRect(0, a.y, W, b.y - a.y); } ctx.restore();
      C.sand.forEach(([x, y, r]) => { const s = toS(x, y); ctx.fillStyle = '#e9d8a6'; ctx.beginPath(); ctx.ellipse(s.x, s.y, r * sc, r * sc * 0.85, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.05)'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(s.x + Math.cos(k * 2.3) * r * sc * 0.5, s.y + Math.sin(k * 1.7) * r * sc * 0.4, 2, 0, 6.283); ctx.fill(); } });
      C.water.forEach(([x, y, r]) => { const s = toS(x, y); ctx.fillStyle = '#48cae4'; ctx.beginPath(); ctx.ellipse(s.x, s.y, r * sc, r * sc * 0.9, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x - r * sc * 0.3, s.y, r * sc * 0.3, Math.sin(tt) * 0.5, 2 + Math.sin(tt) * 0.5); ctx.stroke(); });
      // walls (wood rails)
      ctx.lineCap = 'round';
      C.walls.forEach(([a, b]) => { const s0 = toS(a[0], a[1]), s1 = toS(b[0], b[1]); ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 16 * sc; ctx.beginPath(); ctx.moveTo(s0.x, s0.y + 3); ctx.lineTo(s1.x, s1.y + 3); ctx.stroke(); ctx.strokeStyle = '#b07d4f'; ctx.lineWidth = 12 * sc; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke(); });
      C.bumpers.forEach(([x, y, r]) => { const s = toS(x, y), k = bump && bump.x === x && bump.y === y ? 1 + bump.t * 2 : 1; ctx.fillStyle = '#ff5d8f'; ctx.beginPath(); ctx.arc(s.x, s.y, r * sc * k, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffd6e0'; ctx.beginPath(); ctx.arc(s.x, s.y, r * sc * 0.5, 0, 6.283); ctx.fill(); });
      C.mills.forEach((m) => { const s = toS(m[0], m[1]), t = performance.now() / 1000 * 1.5 + m[3]; ctx.strokeStyle = '#f1faee'; ctx.lineWidth = 10 * sc; for (let k = 0; k < 2; k++) { const a = t + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(s.x - Math.cos(a) * m[2] * sc, s.y - Math.sin(a) * m[2] * sc); ctx.lineTo(s.x + Math.cos(a) * m[2] * sc, s.y + Math.sin(a) * m[2] * sc); ctx.stroke(); } ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(s.x, s.y, 12 * sc, 0, 6.283); ctx.fill(); });
      C.movers.forEach((mv) => { const x = K.lerp(mv.x0, mv.x1, (Math.sin(performance.now() / 900 + mv.ph) + 1) / 2), a = toS(x - mv.w / 2, mv.y), b = toS(x + mv.w / 2, mv.y); ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 12 * sc; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
      ctx.lineCap = 'butt';
      // tee & cup
      const tS = toS(C.tee[0], C.tee[1]); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(tS.x - 22 * sc, tS.y - 14 * sc, 44 * sc, 28 * sc);
      const cS = toS(C.cup[0], C.cup[1]); ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(cS.x, cS.y, 15 * sc, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cS.x, cS.y); ctx.lineTo(cS.x, cS.y - 60 * sc); ctx.stroke(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(cS.x, cS.y - 60 * sc); ctx.lineTo(cS.x + (26 + Math.sin(tt * 4) * 4) * sc, cS.y - 52 * sc); ctx.lineTo(cS.x, cS.y - 44 * sc); ctx.fill();
      // aim arrow
      if (aim && ball) { const dx = aim.x - aim.cx, dy = aim.y - aim.cy, pow = Math.min(1, Math.hypot(dx, dy) * 5 / sc / 1100), a = Math.atan2(dy, dx), b = toS(ball.x, ball.y), len = 40 + pow * 160; ctx.strokeStyle = `hsl(${120 - pow * 120},90%,55%)`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(a) * len, b.y + Math.sin(a) * len); ctx.stroke(); ctx.save(); ctx.translate(b.x + Math.cos(a) * len, b.y + Math.sin(a) * len); ctx.rotate(a); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -9); ctx.lineTo(-6, 9); ctx.fill(); ctx.restore(); }
      if (ball) { const b = toS(ball.x, ball.y), r = BR * sc * ball.s; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(b.x + 3, b.y + 4, r, 0, 6.283); ctx.fill(); const g = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, 1, b.x, b.y, r); g.addColorStop(0, '#fff'); g.addColorStop(1, BALLS[G.ball].c); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 6.283); ctx.fill(); }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; sc = Math.min(w / (LW + 40), (h - 110) / (LH + 20)); ox = (w - LW * sc) / 2; oy = 90 + (h - 110 - LH * sc) / 2; });
    K.music.set({ bpm: 88, chords: [[67, 71, 74], [60, 64, 67], [62, 66, 69], [67, 71, 74]], pad: true, arp: [1, 0, 1, 0, 0, 1, 0, 0], arpWave: 'triangle', bass: true, lead: [79, 0, 76, 0, 74, 0, 72, 0, 74, 0, 0, 0, 0, 0, 0, 0], leadWave: 'sine' });
    showMenu();
  }
})();

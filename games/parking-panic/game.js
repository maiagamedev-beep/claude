/* Parking Panic — swipe (or tap) cars to drive them out of a jammed lot. Every level is checked solvable. 60 levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const CARC = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#9b5de5', '#00bbf9', '#fb5607', '#8ac926', '#ff006e'];
  const LEVELS = 60;

  K.boot('parking_panic', { g: { lvl: 0, stars: {} } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, cs = 50, bx = 0, by = 0;
    let N = 6, cars = [], lvIdx = 0, playing = false, moves = 0, anim = [], drag = null, busy = false;
    function levelCfg(i) { return { n: Math.min(9, 6 + Math.floor(i / 12)), cars: Math.min(26, 6 + Math.floor(i * 0.45)) }; }
    const occ = (list, skip) => { const o = new Map(); list.forEach((c, k) => { if (k === skip || c.out) return; for (let j = 0; j < c.len; j++) o.set(c.dir === 'h' ? c.y * 100 + c.x + j : (c.y + j) * 100 + c.x, k); }); return o; };
    function pathClear(list, k, sgn) { const c = list[k], o = occ(list, k); if (c.dir === 'h') { for (let x = sgn > 0 ? c.x + c.len : c.x - 1; x >= 0 && x < N; x += sgn) if (o.has(c.y * 100 + x)) return false; } else { for (let y = sgn > 0 ? c.y + c.len : c.y - 1; y >= 0 && y < N; y += sgn) if (o.has(y * 100 + c.x)) return false; } return true; }
    function solvable(list) { const L = list.map((c) => ({ ...c, out: false })); let progress = true; while (progress) { progress = false; for (let k = 0; k < L.length; k++) if (!L[k].out && (pathClear(L, k, 1) || pathClear(L, k, -1))) { L[k].out = true; progress = true; } } return L.every((c) => c.out); }
    function generate(i) {
      const cfg = levelCfg(i), r = K.rng(i * 577 + 13);
      for (let tries = 0; tries < 400; tries++) {
        N = cfg.n; const list = [];
        for (let a = 0; a < cfg.cars * 6 && list.length < cfg.cars; a++) {
          const dir = r() < 0.5 ? 'h' : 'v', len = r() < 0.25 ? 3 : 2, x = Math.floor(r() * (dir === 'h' ? N - len + 1 : N)), y = Math.floor(r() * (dir === 'v' ? N - len + 1 : N));
          const c = { x, y, dir, len, col: CARC[list.length % CARC.length], out: false, face: r() < 0.5 ? 1 : -1 };
          const o = occ(list); let ok = true; for (let j = 0; j < len; j++) if (o.has(dir === 'h' ? y * 100 + x + j : (y + j) * 100 + x)) ok = false;
          if (ok) list.push(c);
        }
        // require some interlocking: at least a few cars must start blocked
        const blocked = list.filter((c, k) => !pathClear(list, k, 1) && !pathClear(list, k, -1)).length;
        if (list.length >= cfg.cars * 0.8 && blocked >= Math.min(list.length * 0.4, 2 + i / 3) && solvable(list)) return list;
      }
      return [{ x: 0, y: 0, dir: 'h', len: 2, col: CARC[0], out: false, face: 1 }];
    }
    function startLevel(i) { lvIdx = i; cars = generate(i).map((c) => ({ ...c, ox: 0, oy: 0, shake: 0 })); moves = 0; anim = []; busy = false; playing = true; layout(); K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    function layout() { cs = Math.min((W - 40) / (N + 1), (H - 190) / (N + 1), 80); bx = (W - cs * N) / 2; by = 110 + (H - 150 - cs * N) / 2; }
    function drive(k, sgn) {
      if (busy) return; const c = cars[k]; moves++;
      if (pathClear(cars, k, sgn)) {
        c.out = true; busy = false; K.audio.play('whoosh', 1.3); K.meta.track('cars', 1);
        const dist = (N + 3) * cs * sgn; c.face = sgn; anim.push({ c, t: 0, dx: c.dir === 'h' ? dist : 0, dy: c.dir === 'v' ? dist : 0 });
        const s = cellC(c); K.fx.burst(s.x, s.y, { n: 8, colors: ['#ddd', '#fff'], speed: 120, angle: c.dir === 'h' ? (sgn > 0 ? Math.PI : 0) : sgn > 0 ? -Math.PI / 2 : Math.PI / 2, spread: 0.6, g: 0, size: 5, life: 0.4 });
        if (cars.every((q) => q.out)) setTimeout(win, 600);
      } else {
        // bump forward until the blocker, then honk
        const o = occ(cars, k); let free = 0; if (c.dir === 'h') { for (let x = sgn > 0 ? c.x + c.len : c.x - 1; x >= 0 && x < N && !o.has(c.y * 100 + x); x += sgn) free++; } else { for (let y = sgn > 0 ? c.y + c.len : c.y - 1; y >= 0 && y < N && !o.has(y * 100 + c.x); y += sgn) free++; }
        if (free) { if (c.dir === 'h') c.x += free * sgn; else c.y += free * sgn; c.ox = -free * sgn * cs * (c.dir === 'h' ? 1 : 0); c.oy = -free * sgn * cs * (c.dir === 'v' ? 1 : 0); K.tween(c, { ox: 0, oy: 0 }, 0.18, 'outQuad'); }
        setTimeout(() => { c.shake = 0.3; K.audio.play('hit', 1.5); K.audio.play('error'); const blocker = o.get(c.dir === 'h' ? c.y * 100 + (sgn > 0 ? c.x + c.len : c.x - 1) : (sgn > 0 ? c.y + c.len : c.y - 1) * 100 + c.x); if (blocker != null) cars[blocker].shake = 0.3; }, free ? 180 : 0);
        c.face = sgn;
      }
    }
    const cellC = (c) => ({ x: bx + (c.x + (c.dir === 'h' ? c.len / 2 : 0.5)) * cs + c.ox, y: by + (c.y + (c.dir === 'v' ? c.len / 2 : 0.5)) * cs + c.oy });
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(CARC);
      const par = cars.length + 2, stars = moves <= par ? 3 : moves <= par * 1.5 ? 2 : 1;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars); if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(12); K.save.mark();
      K.std.end({ win: true, title: K.t(['Lot cleared!', 'Estacionamento livre!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t(['Moves', 'Jogadas']), moves]], coins: 20 + lvIdx * 4 + stars * 10, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu });
    }
    function carAt(x, y) { const gx = Math.floor((x - bx) / cs), gy = Math.floor((y - by) / cs); return cars.findIndex((c) => !c.out && (c.dir === 'h' ? c.y === gy && gx >= c.x && gx < c.x + c.len : c.x === gx && gy >= c.y && gy < c.y + c.len)); }
    cv.addEventListener('pointerdown', (e) => { if (!playing || K.ui.anyOpen()) return; const k = carAt(e.clientX, e.clientY); if (k >= 0) drag = { k, x: e.clientX, y: e.clientY }; });
    window.addEventListener('pointerup', (e) => {
      if (!drag) return; const d = drag; drag = null; const c = cars[d.k]; if (c.out) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y, along = c.dir === 'h' ? dx : dy;
      drive(d.k, Math.abs(along) > 12 ? Math.sign(along) : c.face);
    });
    function hint() { const k = cars.findIndex((c, i) => !c.out && (pathClear(cars, i, 1) || pathClear(cars, i, -1))); if (k >= 0) { cars[k].hint = 2; K.audio.play('power'); } }

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Swipe a car forward or backward along its lane (or tap to drive where its nose points). It leaves the lot if nothing is in the way. Clear every car in as few moves as you can.', pt: 'Deslize um carro para frente ou para trás na direção dele (ou toque para ir para onde o bico aponta). Ele sai se nada estiver no caminho. Libere todos com o mínimo de jogadas.' },
      missions: [{ stat: 'cars', base: 60, reward: 80, text: { en: 'Drive {n} cars out', pt: 'Tire {n} carros' } }, { stat: 'levels', base: 4, reward: 110, text: { en: 'Clear {n} lots', pt: 'Libere {n} estacionamentos' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'ppbar'); K.ui.root.appendChild(bar);
    bar.appendChild(K.ui.btn('⟲', 'sm', () => startLevel(lvIdx))); bar.appendChild(K.ui.adBtn('💡', hint, 'sm')); bar.appendChild(K.ui.btn('⌂', 'sm', () => showMenu()));
    function showMenu() { playing = false; hud.style.display = bar.style.display = 'none'; K.std.menu({ title: 'Parking<span>Panic</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => { bar.style.display = ''; startLevel(G.lvl); }, buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); bar.style.display = ''; startLevel(i); }))] }); }
    function drawCar(c, x, y, t) {
      const horiz = c.dir === 'h', w = (horiz ? c.len : 1) * cs - 8, h = (horiz ? 1 : c.len) * cs - 8, sh = c.shake > 0 ? Math.sin(t * 60) * 4 * c.shake : 0;
      ctx.save(); ctx.translate(x + (horiz ? sh : 0), y + (horiz ? 0 : sh)); if (!horiz) ctx.rotate(Math.PI / 2); if (c.face < 0) ctx.rotate(Math.PI);
      const L = horiz ? w : h, Wd = horiz ? h : w;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; K.draw.rrect(ctx, -L / 2 + 3, -Wd / 2 + 5, L, Wd, 10); ctx.fill();
      ctx.fillStyle = c.col; K.draw.rrect(ctx, -L / 2, -Wd / 2, L, Wd, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; K.draw.rrect(ctx, -L / 2 + 4, -Wd / 2 + 3, L - 8, Wd * 0.25, 6); ctx.fill();
      ctx.fillStyle = '#bde0fe'; K.draw.rrect(ctx, L / 2 - L * 0.34, -Wd / 2 + 6, L * 0.16, Wd - 12, 4); ctx.fill(); K.draw.rrect(ctx, -L / 2 + L * 0.12, -Wd / 2 + 6, L * 0.12, Wd - 12, 4); ctx.fill();
      ctx.fillStyle = '#fff3b0'; ctx.fillRect(L / 2 - 5, -Wd / 2 + 4, 4, 7); ctx.fillRect(L / 2 - 5, Wd / 2 - 11, 4, 7);
      ctx.fillStyle = '#e63946'; ctx.fillRect(-L / 2 + 1, -Wd / 2 + 4, 3, 6); ctx.fillRect(-L / 2 + 1, Wd / 2 - 10, 3, 6);
      if (c.len === 3) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(-L * 0.1, -Wd / 2 + 4, 3, Wd - 8); }
      ctx.restore();
      if (c.hint > 0) { ctx.strokeStyle = `rgba(255,209,102,${0.5 + Math.sin(t * 10) * 0.4})`; ctx.lineWidth = 4; K.draw.rrect(ctx, x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 12); ctx.stroke(); }
    }
    let tt = 0;
    K.loop((dt) => { tt += dt; K.fx.update(dt); cars.forEach((c) => { c.shake = Math.max(0, c.shake - dt); if (c.hint) c.hint = Math.max(0, c.hint - dt); }); anim.forEach((a) => (a.t += dt)); anim = anim.filter((a) => a.t < 0.8); if (playing) hud.innerHTML = `<span class="chip">${K.t('level')} ${lvIdx + 1}</span><span class="chip">🚗 ${cars.filter((c) => !c.out).length}</span><span class="chip">${K.t(['Moves', 'Jogadas'])} ${moves}</span>`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = '#8ecae6'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#90be6d'; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 30; i++) { ctx.fillStyle = '#6a994e'; ctx.beginPath(); ctx.arc(((i * 173) % 1000) / 1000 * W, ((i * 311) % 1000) / 1000 * H, 20 + (i % 3) * 10, 0, 6.283); ctx.fill(); }
      if (!cars.length) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // asphalt lot + exit roads
      ctx.fillStyle = '#495057'; ctx.fillRect(bx - cs * 0.6, by - cs * 0.6, cs * (N + 1.2), cs * (N + 1.2));
      ctx.fillStyle = '#343a40'; ctx.fillRect(bx - cs * 0.6, by - cs * 0.6, cs * (N + 1.2), cs * 0.4); ctx.fillRect(bx - cs * 0.6, by + cs * (N + 0.2), cs * (N + 1.2), cs * 0.4); ctx.fillRect(bx - cs * 0.6, by - cs * 0.6, cs * 0.4, cs * (N + 1.2)); ctx.fillRect(bx + cs * (N + 0.2), by - cs * 0.6, cs * 0.4, cs * (N + 1.2));
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([cs * 0.3, cs * 0.2]);
      for (let k = 0; k <= N; k++) { ctx.beginPath(); ctx.moveTo(bx + k * cs, by); ctx.lineTo(bx + k * cs, by + N * cs); ctx.stroke(); }
      ctx.setLineDash([]);
      cars.forEach((c) => { if (c.out) return; const p = cellC(c); drawCar(c, p.x, p.y, tt); });
      anim.forEach((a) => { const k = K.ease.inQuad(Math.min(1, a.t / 0.8)); const p = { x: bx + (a.c.x + (a.c.dir === 'h' ? a.c.len / 2 : 0.5)) * cs + a.dx * k, y: by + (a.c.y + (a.c.dir === 'v' ? a.c.len / 2 : 0.5)) * cs + a.dy * k }; drawCar(a.c, p.x, p.y, tt); });
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); });
    K.music.set({ bpm: 108, chords: [[60, 64, 67], [62, 65, 69], [64, 67, 71], [65, 69, 72]], bass: true, arp: [1, 0, 1, 0, 1, 1, 0, 1], arpWave: 'triangle', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 1, 0, 1, 0, 1, 0, 1] } });
    showMenu();
  }
})();

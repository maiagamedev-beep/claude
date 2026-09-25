/* Brick Bloom — aim and fire a volley of balls; numbered bricks lose a point per hit and step down every turn. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const COLS = 7, ROWS = 9;
  const THEMES = [{ n: ['Garden', 'Jardim'], hue: 140, p: 0 }, { n: ['Candy', 'Doce'], hue: 320, p: 500 }, { n: ['Ocean', 'Oceano'], hue: 200, p: 800 }, { n: ['Sunset', 'Pôr do sol'], hue: 20, p: 1200 }, { n: ['Galaxy', 'Galáxia'], hue: 260, gems: 30 }];

  K.boot('brick_bloom', { g: { best: 0, theme: 0, themes: [0], cur: null } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, bw = 50, fx0 = 0, fy0 = 0, FW = 350, FH = 500;
    let bricks = [], items = [], balls = [], nBalls = 1, launchX = 0, nextLaunchX = null, turn = 1, aiming = false, aimA = -Math.PI / 2, firing = false, fireQ = 0, fireT = 0, playing = false, revived = false, speedUp = 0, returned = 0, flowers = [];
    function layout() { FW = Math.min(W - 20, (H - 200) * 0.72, 480); bw = FW / COLS; FH = bw * (ROWS + 1.6); fx0 = (W - FW) / 2; fy0 = 100; }
    function start() { bricks = []; items = []; balls = []; nBalls = 1; turn = 1; launchX = FW / 2; nextLaunchX = null; revived = false; playing = true; addRow(); K.std.hideMenu(); hud.style.display = bar.style.display = ''; K.game.start(); }
    function addRow() {
      bricks.forEach((b) => { b.row++; K.tween(b, { dy: 0 }, 0.2); b.dy = -1; });
      items.forEach((it) => it.row++);
      const slots = [...Array(COLS).keys()].sort(() => Math.random() - 0.5);
      const n = K.randi(2, Math.min(6, 3 + Math.floor(turn / 8)));
      for (let k = 0; k < n; k++) { const hp = Math.random() < 0.15 ? turn * 2 : turn; bricks.push({ col: slots[k], row: 1, hp, max: hp, dy: -1, tri: turn > 15 && Math.random() < 0.15 ? K.randi(0, 3) : -1, hit: 0 }); }
      if (slots[n] != null) items.push({ col: slots[n], row: 1, k: 'ball' });
      if (slots[n + 1] != null && Math.random() < 0.35) items.push({ col: slots[n + 1], row: 1, k: 'coin' });
      if (slots[n + 2] != null && turn > 5 && Math.random() < 0.12) items.push({ col: slots[n + 2], row: 1, k: K.pick(['laserH', 'laserV']) });
      items = items.filter((it) => it.row < ROWS);
      if (bricks.some((b) => b.row >= ROWS)) return lose();
      G.cur = { bricks, items, nBalls, turn, launchX }; K.save.mark();
    }
    const cellX = (c) => fx0 + c * bw, cellY = (r) => fy0 + r * bw;
    function fire() {
      if (!playing || firing || K.ui.anyOpen()) return;
      firing = true; fireQ = nBalls; fireT = 0; returned = 0; nextLaunchX = null; speedUp = 0;
      K.audio.play('shoot', 1.2);
    }
    function stepBalls(dt) {
      const spd = 900 * (bw / 50) * (1 + Math.min(2, speedUp / 4));
      if (fireQ > 0) { fireT -= dt; if (fireT <= 0) { fireT = 0.06; fireQ--; balls.push({ x: fx0 + launchX, y: fy0 + FH - 8, vx: Math.cos(aimA) * spd, vy: Math.sin(aimA) * spd }); } }
      for (const b of balls) {
        const steps = 4;
        for (let s = 0; s < steps; s++) {
          b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps;
          const r = bw * 0.14;
          if (b.x < fx0 + r) { b.x = fx0 + r; b.vx = Math.abs(b.vx); } if (b.x > fx0 + FW - r) { b.x = fx0 + FW - r; b.vx = -Math.abs(b.vx); } if (b.y < fy0 + r) { b.y = fy0 + r; b.vy = Math.abs(b.vy); }
          if (b.y > fy0 + FH - 8 && b.vy > 0) { b.done = true; if (nextLaunchX === null) nextLaunchX = K.clamp(b.x - fx0, 10, FW - 10); returned++; break; }
          for (const br of bricks) {
            if (br.hp <= 0) continue;
            const x0 = cellX(br.col) + 3, y0 = cellY(br.row) + 3, x1 = x0 + bw - 6, y1 = y0 + bw - 6;
            const cx = K.clamp(b.x, x0, x1), cy = K.clamp(b.y, y0, y1), dx = b.x - cx, dy = b.y - cy;
            if (dx * dx + dy * dy < r * r) {
              if (Math.abs(dx) > Math.abs(dy)) { b.vx = Math.sign(dx || -b.vx) * Math.abs(b.vx); b.x = cx + Math.sign(dx || 1) * r; } else { b.vy = Math.sign(dy || -b.vy) * Math.abs(b.vy); b.y = cy + Math.sign(dy || 1) * r; }
              hitBrick(br, 1); break;
            }
          }
          for (const it of items) {
            if (it.got) continue; const ix = cellX(it.col) + bw / 2, iy = cellY(it.row) + bw / 2;
            if (Math.hypot(b.x - ix, b.y - iy) < bw * 0.3) {
              if (it.k === 'ball') { it.got = true; nBalls++; K.audio.play('pop', 1.4); K.fx.text(ix, iy, '+1', { color: '#fff', size: 20 }); }
              else if (it.k === 'coin') { it.got = true; K.meta.addCoins(2, { x: ix, y: iy }); }
              else if (!it.cool || it.cool < performance.now()) { it.cool = performance.now() + 120; it.used = true; bricks.forEach((br) => { if ((it.k === 'laserH' && br.row === it.row) || (it.k === 'laserV' && br.col === it.col)) hitBrick(br, 1); }); lasers.push({ it, t: 0.2 }); K.audio.play('laser'); }
            }
          }
        }
      }
      balls = balls.filter((b) => !b.done);
      if (firing && fireQ === 0 && !balls.length) endTurn();
    }
    let lasers = [];
    function hitBrick(br, d) {
      br.hp -= d; br.hit = 0.1; K.audio.play('tick', 1 + Math.random() * 0.5);
      if (br.hp <= 0) {
        const x = cellX(br.col) + bw / 2, y = cellY(br.row) + bw / 2, hue = THEMES[G.theme].hue;
        K.fx.burst(x, y, { n: 14, colors: [`hsl(${hue},70%,60%)`, `hsl(${hue + 40},80%,70%)`, '#fff'], speed: 260, shape: 'square', size: 5, life: 0.6 });
        flowers.push({ x, y, t: 0, hue }); K.audio.play('pop', 0.8); K.meta.track('bricks', 1); K.fx.shake(2);
      }
    }
    function endTurn() {
      firing = false; bricks = bricks.filter((b) => b.hp > 0); items = items.filter((it) => !it.got && !(it.used && it.k.startsWith('laser')));
      if (nextLaunchX !== null) launchX = nextLaunchX;
      turn++; K.meta.trackMax('turn', turn); if (turn > G.best) G.best = turn;
      if (!bricks.length) { K.fx.text(W / 2, H * 0.4, K.t(['Clean sweep! +10', 'Tudo limpo! +10']), { color: '#fff', stroke: '#1b4332', size: 34 }); K.meta.addCoins(10); K.audio.play('win'); }
      addRow(); K.save.mark();
    }
    function lose() {
      playing = false; K.game.stop(); G.cur = null; K.audio.play('lose'); K.meta.track('games', 1); K.meta.addXp(turn);
      setTimeout(() => K.std.end({ newBest: turn >= G.best, rows: [[K.t(['Turns', 'Rodadas']), turn], [K.t(['Balls', 'Bolas']), nBalls]], coins: turn * 2,
        revive: revived ? null : () => { revived = true; bricks = bricks.filter((b) => b.row < ROWS - 3); playing = true; K.game.start(); }, reviveLabel: K.t(['Clear bottom 3 rows', 'Limpar 3 fileiras']), restart: start, menu: showMenu }), 600);
    }
    // input
    const launch = () => ({ x: fx0 + launchX, y: fy0 + FH - 8 });
    const aimAt = (x, y) => { const l = launch(); const a = Math.atan2(y - l.y, x - l.x); aimA = K.clamp(a, -Math.PI + 0.12, -0.12); };
    cv.addEventListener('pointerdown', (e) => { if (!playing || firing) return; aiming = true; aimAt(e.clientX, e.clientY); });
    window.addEventListener('pointermove', (e) => { if (aiming) aimAt(e.clientX, e.clientY); });
    window.addEventListener('pointerup', () => { if (aiming) { aiming = false; fire(); } });
    window.addEventListener('keydown', (e) => { if (!playing) return; if (e.code === 'ArrowLeft') aimA = Math.max(-Math.PI + 0.12, aimA - 0.05); if (e.code === 'ArrowRight') aimA = Math.min(-0.12, aimA + 0.05); if (e.code === 'Space') { e.preventDefault(); fire(); } });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Drag to aim and release to fire all your balls (or arrows + Space). Each hit takes one point off a brick. Collect green rings for extra balls. Bricks move down every turn — do not let them reach the bottom.', pt: 'Arraste para mirar e solte para disparar todas as bolas (ou setas + Espaço). Cada batida tira um ponto do tijolo. Pegue anéis verdes para ganhar bolas. Os tijolos descem a cada rodada — não deixe chegarem embaixo.' },
      missions: [{ stat: 'bricks', base: 60, reward: 80, text: { en: 'Break {n} bricks', pt: 'Quebre {n} tijolos' } }, { stat: 'turn', base: 25, type: 'max', cap: 150, reward: 110, text: { en: 'Survive {n} turns', pt: 'Sobreviva {n} rodadas' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'bbbar'); K.ui.root.appendChild(bar);
    bar.appendChild(K.ui.btn('⏩', 'sm', () => { if (firing) speedUp += 4; }));
    bar.appendChild(K.ui.btn('⌂', 'sm', () => showMenu()));
    function showMenu() {
      playing = false; hud.style.display = bar.style.display = 'none';
      K.std.menu({ title: 'Brick<span>Bloom</span>', sub: K.t('best') + ': ' + G.best, playLabel: G.cur ? K.t('continue') : K.t('play'), onPlay: () => { if (G.cur) { ({ bricks, items, nBalls, turn, launchX } = G.cur); balls = []; firing = false; playing = true; hud.style.display = bar.style.display = ''; K.game.start(); } else start(); },
        buttons: [K.ui.btn('🎨 ' + K.t(['Themes', 'Temas']), '', () => K.std.shop(K.t(['Themes', 'Temas']), THEMES.map((t, i) => ({ id: i, name: K.t(t.n), price: t.p, gems: t.gems, html: `<div style="display:flex;gap:3px">${[0, 1, 2].map((k) => `<div style="width:16px;height:16px;border-radius:4px;background:hsl(${t.hue + k * 25},70%,60%)"></div>`).join('')}</div>` })), { owned: G.themes, get: () => G.theme, set: (i) => (G.theme = i) })), K.ui.btn(K.t(['New game', 'Novo jogo']), '', () => { G.cur = null; K.std.hideMenu(); start(); })] });
    }
    let tt = 0;
    K.loop((dt) => { tt += dt; K.fx.update(dt); if (playing) stepBalls(dt); lasers.forEach((l) => (l.t -= dt)); lasers = lasers.filter((l) => l.t > 0); flowers.forEach((f) => (f.t += dt)); flowers = flowers.filter((f) => f.t < 0.8); bricks.forEach((b) => (b.hit = Math.max(0, b.hit - dt))); if (playing) hud.innerHTML = `<span class="chip">${K.t(['Turn', 'Rodada'])} ${turn}</span><span class="chip">● ${nBalls}</span><span class="chip">👑 ${G.best}</span>`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const hue = THEMES[G.theme].hue;
      ctx.fillStyle = `hsl(${hue},35%,14%)`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `hsl(${hue},30%,19%)`; K.draw.rrect(ctx, fx0, fy0, FW, FH, 14); ctx.fill();
      ctx.strokeStyle = `hsla(${hue},60%,70%,.12)`; ctx.lineWidth = 1; for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(cellX(c), fy0); ctx.lineTo(cellX(c), fy0 + FH); ctx.stroke(); }
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // danger line
      ctx.strokeStyle = bricks.some((b) => b.row >= ROWS - 1) ? `rgba(255,80,80,${0.5 + Math.sin(tt * 8) * 0.4})` : 'rgba(255,255,255,.1)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(fx0, cellY(ROWS)); ctx.lineTo(fx0 + FW, cellY(ROWS)); ctx.stroke(); ctx.setLineDash([]);
      for (const b of bricks) {
        if (b.hp <= 0) continue;
        const x = cellX(b.col) + 3, y = cellY(b.row + (b.dy || 0)) + 3, s = bw - 6, k = Math.min(1, b.hp / Math.max(10, turn * 1.5));
        const col = `hsl(${hue + (1 - k) * 60},${60 + k * 20}%,${48 + (1 - k) * 12}%)`;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; K.draw.rrect(ctx, x + 2, y + 4, s, s, 8); ctx.fill();
        ctx.fillStyle = b.hit > 0 ? '#fff' : col; K.draw.rrect(ctx, x, y, s, s, 8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.2)'; K.draw.rrect(ctx, x + 4, y + 3, s - 8, s * 0.25, 5); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `800 ${bw * 0.34}px "Trebuchet MS"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.hp, x + s / 2, y + s / 2 + 1);
      }
      for (const it of items) { if (it.got) continue; const x = cellX(it.col) + bw / 2, y = cellY(it.row) + bw / 2; if (it.k === 'ball') { ctx.strokeStyle = '#80ed99'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, bw * 0.18 + Math.sin(tt * 6) * 2, 0, 6.283); ctx.stroke(); ctx.fillStyle = '#80ed99'; ctx.beginPath(); ctx.arc(x, y, bw * 0.08, 0, 6.283); ctx.fill(); } else if (it.k === 'coin') { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x, y, bw * 0.14, 0, 6.283); ctx.fill(); } else { ctx.strokeStyle = '#ff5d8f'; ctx.lineWidth = 3; ctx.beginPath(); if (it.k === 'laserH') { ctx.moveTo(x - bw * 0.25, y); ctx.lineTo(x + bw * 0.25, y); } else { ctx.moveTo(x, y - bw * 0.25); ctx.lineTo(x, y + bw * 0.25); } ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, bw * 0.12, 0, 6.283); ctx.stroke(); } }
      lasers.forEach((l) => { ctx.fillStyle = `rgba(255,93,143,${l.t * 4})`; if (l.it.k === 'laserH') ctx.fillRect(fx0, cellY(l.it.row) + bw * 0.4, FW, bw * 0.2); else ctx.fillRect(cellX(l.it.col) + bw * 0.4, fy0, bw * 0.2, FH); });
      flowers.forEach((f) => { const k = f.t / 0.8; ctx.globalAlpha = 1 - k; for (let p = 0; p < 5; p++) { const a = (p / 5) * 6.283 + k; ctx.fillStyle = `hsl(${f.hue + 40},90%,75%)`; ctx.beginPath(); ctx.ellipse(f.x + Math.cos(a) * 12 * (1 + k), f.y + Math.sin(a) * 12 * (1 + k) - k * 20, 6, 10, a, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; });
      const l = launch();
      if (playing && !firing) {
        ctx.fillStyle = 'rgba(255,255,255,.65)'; let x = l.x, y = l.y, vx = Math.cos(aimA), vy = Math.sin(aimA);
        for (let d = 0; d < 520; d += 6) { x += vx * 6; y += vy * 6; if (x < fx0 || x > fx0 + FW) vx = -vx; if (y < fy0) break; if (bricks.some((b) => x > cellX(b.col) && x < cellX(b.col) + bw && y > cellY(b.row) && y < cellY(b.row) + bw)) break; if (d % 18 === 0) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.283); ctx.fill(); } }
      }
      if (!firing || fireQ > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(l.x, l.y, bw * 0.14, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('x' + (firing ? fireQ : nBalls), l.x, l.y + 22); }
      ctx.fillStyle = '#fff'; balls.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, bw * 0.14, 0, 6.283); ctx.fill(); });
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; const old = FW; layout(); if (old && launchX) launchX = launchX * FW / old; });
    K.music.set({ bpm: 92, chords: [[60, 64, 67, 71], [62, 65, 69, 72], [64, 67, 71, 74], [65, 69, 72, 76]], pad: true, arp: [1, 0, 1, 0, 1, 0, 1, 0], arpWave: 'triangle', bass: true, drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

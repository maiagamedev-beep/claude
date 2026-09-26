/* Jelly Blocks — drag pieces onto an 8x8 board, clear rows and columns. Classic + 40 adventure levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const N = 8;
  const COLS = ['#ff5d73', '#ffb13d', '#ffe156', '#5ee07a', '#3fc5ff', '#8c7bff', '#ff7bd5'];
  const SHAPES = [
    [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[1, 0], [1, 1], [1, 2], [0, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ];
  const ADV = 40;

  K.boot('jelly_blocks', { g: { best: 0, adv: 0, stars: {}, cur: null } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, bx = 0, by = 0, cs = 40, trayY = 0;
    function layout() { const portrait = H > W; const size = Math.min(W - 24, (H - 130) * (portrait ? 0.62 : 0.72), 520); cs = size / N; bx = (W - size) / 2; by = portrait ? 120 : 95; trayY = by + size + (portrait ? 30 : 20); if (!portrait && trayY + cs * 3 > H) { bx = W / 2 - size - 20; trayY = -1; } }
    const cache = {};
    function block(col, size) {
      const k = col + size; if (cache[k]) return cache[k];
      const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), s = size;
      K.draw.rrect(g, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.2); g.fillStyle = col; g.fill();
      const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; K.draw.rrect(g, s * 0.16, s * 0.12, s * 0.4, s * 0.14, s * 0.07); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(s * 0.72, s * 0.2, s * 0.05, 0, 6.283); g.fill();
      return (cache[k] = c);
    }
    function gemImg(size) {
      const k = 'gem' + size; if (cache[k]) return cache[k];
      const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), s = size;
      K.draw.rrect(g, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.2); g.fillStyle = '#3a2f6b'; g.fill();
      g.translate(s / 2, s / 2); g.fillStyle = '#5ff2ff'; g.beginPath(); g.moveTo(0, -s * 0.3); g.lineTo(s * 0.28, 0); g.lineTo(0, s * 0.3); g.lineTo(-s * 0.28, 0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(0, -s * 0.3); g.lineTo(s * 0.1, -s * 0.05); g.lineTo(-s * 0.12, -s * 0.02); g.fill();
      return (cache[k] = c);
    }

    /* ---------- state ---------- */
    let grid = [], tray = [], score = 0, streak = 0, mode = 'classic', adv = 0, gemsLeft = 0, playing = false, drag = null, revived = false, clearing = [], moves = 0;
    const idx = (x, y) => y * N + x;
    function randPiece() {
      const wts = SHAPES.map((s) => (s.length === 1 ? 0.6 : s.length >= 9 ? 0.4 : s.length === 5 ? 0.7 : 1));
      let r = Math.random() * wts.reduce((a, b) => a + b), i = 0; while ((r -= wts[i]) > 0) i++;
      return { cells: SHAPES[i], col: K.pick(COLS), s: 0 };
    }
    function fits(p, gx, gy) { return p.cells.every(([x, y]) => { const X = gx + x, Y = gy + y; return X >= 0 && Y >= 0 && X < N && Y < N && !grid[idx(X, Y)]; }); }
    function canPlaceAny(p) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(p, x, y)) return true; return false; }
    function refill() {
      // bias toward at least one piece that fits
      for (let t = 0; t < 12; t++) { tray = [randPiece(), randPiece(), randPiece()]; if (tray.some(canPlaceAny)) break; }
      tray.forEach((p, i) => K.tween(p, { s: 1 }, 0.35 + i * 0.08, 'outBack'));
    }
    function start(m, lv) {
      mode = m; adv = lv || 0; grid = new Array(N * N).fill(null); score = 0; streak = 0; revived = false; clearing = []; moves = 0;
      if (m === 'adventure') {
        const r = K.rng(adv * 71 + 9), n = 4 + Math.min(18, adv);
        // prefilled rubble + gems
        for (let k = 0; k < n + 6; k++) { const c = Math.floor(r() * N * N); if (!grid[c]) grid[c] = { col: '#6b6490' }; }
        let gi = 0; while (gi < Math.min(3 + Math.floor(adv / 4), 14)) { const c = Math.floor(r() * N * N); if (grid[c] && !grid[c].gem) { grid[c] = { col: '#3a2f6b', gem: true }; gi++; } }
        gemsLeft = gi;
      } else if (G.cur) { grid = G.cur.grid; score = G.cur.score; }
      refill(); playing = true;
      K.std.hideMenu(); hud.style.display = ''; K.game.start(); renderHud();
    }

    /* ---------- placing ---------- */
    function place(p, gx, gy) {
      p.cells.forEach(([x, y]) => (grid[idx(gx + x, gy + y)] = { col: p.col, s: 1.25 }));
      p.cells.forEach(([x, y]) => K.tween(grid[idx(gx + x, gy + y)], { s: 1 }, 0.25, 'outBack'));
      score += p.cells.length; moves++;
      K.audio.play('thud', 1.3); K.meta.track('blocks', p.cells.length);
      tray[tray.indexOf(p)] = null;
      // lines
      const rows = [], cols = [];
      for (let y = 0; y < N; y++) { let f = true; for (let x = 0; x < N; x++) if (!grid[idx(x, y)]) { f = false; break; } if (f) rows.push(y); }
      for (let x = 0; x < N; x++) { let f = true; for (let y = 0; y < N; y++) if (!grid[idx(x, y)]) { f = false; break; } if (f) cols.push(x); }
      const lines = rows.length + cols.length;
      if (lines) {
        streak++;
        const set = new Set(); rows.forEach((y) => { for (let x = 0; x < N; x++) set.add(idx(x, y)); }); cols.forEach((x) => { for (let y = 0; y < N; y++) set.add(idx(x, y)); });
        const pts = (lines * 10 + (lines - 1) * 20) * N * Math.min(8, streak);
        score += pts;
        let k = 0;
        set.forEach((c) => {
          const b = grid[c]; if (b && b.gem) { gemsLeft--; K.meta.track('gems', 1); }
          clearing.push({ c, b, t: -((k++ % N) * 0.025) }); grid[c] = null;
        });
        K.meta.track('lines', lines);
        const cxy = [...set].reduce((a, c) => [a[0] + (c % N), a[1] + ((c / N) | 0)], [0, 0]).map((v) => v / set.size);
        K.fx.text(bx + (cxy[0] + 0.5) * cs, by + (cxy[1] + 0.5) * cs, '+' + pts, { color: '#fff', stroke: '#2a1f55', size: 30 + lines * 4 });
        const words = [null, K.t(['Nice!', 'Boa!']), K.t(['Great!', 'Ótimo!']), K.t(['Amazing!', 'Incrível!']), K.t(['Unbelievable!', 'Inacreditável!'])];
        if (lines >= 2 || streak >= 3) { K.fx.text(W / 2, by - 10, (words[Math.min(4, lines)] || words[1]) + (streak >= 2 ? ' x' + streak : ''), { color: '#ffe156', stroke: '#2a1f55', size: 40, life: 1.2 }); K.audio.play('combo'); K.fx.shake(4 + lines * 3); if (lines >= 3) { K.fx.flash('#fff', 0.35); K.game.happy(); } }
        K.audio.play('merge', 0.9 + lines * 0.15);
        if (grid.every((b) => !b)) { score += 300; K.fx.text(W / 2, H * 0.4, K.t(['BOARD CLEAR! +300', 'TABULEIRO LIMPO! +300']), { color: '#5ff2ff', stroke: '#2a1f55', size: 36, life: 1.6 }); K.audio.play('win'); }
      } else streak = 0;
      if (tray.every((t) => !t)) refill();
      if (score > G.best && mode === 'classic') G.best = score;
      K.meta.trackMax('score', score);
      if (mode === 'classic') G.cur = { grid: grid.slice(), score };
      K.save.mark(); renderHud();
      if (mode === 'adventure' && gemsLeft <= 0) return advWin();
      if (!tray.some((t) => t && canPlaceAny(t))) setTimeout(gameOver, 500);
    }
    function gameOver() {
      playing = false; K.audio.play('lose'); K.meta.track('games', 1);
      if (mode === 'classic') G.cur = null; K.save.mark();
      // grey-out animation
      grid.forEach((b) => b && (b.col = '#8b87a8'));
      const isNew = mode === 'classic' && score >= G.best && score > 0;
      setTimeout(() => K.std.end({ newBest: isNew, text: K.t(['No space left!', 'Sem espaço!']), rows: [[K.t('score'), score], [K.t('best'), G.best]], coins: Math.floor(score / 40) + 5,
        revive: revived ? null : () => { revived = true; for (let y = 2; y < 6; y++) for (let x = 0; x < N; x++) if (grid[idx(x, y)]) { clearing.push({ c: idx(x, y), b: grid[idx(x, y)], t: 0 }); grid[idx(x, y)] = null; } tray = [{ cells: [[0, 0]], col: COLS[0], s: 1 }, { cells: [[0, 0], [1, 0]], col: COLS[4], s: 1 }, { cells: [[0, 0]], col: COLS[3], s: 1 }]; playing = true; K.game.start(); renderHud(); },
        reviveLabel: K.t(['Clear the middle', 'Limpar o meio']), restart: () => start(mode, adv), menu: showMenu }), 700);
    }
    function advWin() {
      playing = false; K.audio.play('win'); K.std.confetti(COLS);
      const stars = moves <= 12 ? 3 : moves <= 22 ? 2 : 1;
      G.stars[adv] = Math.max(G.stars[adv] || 0, stars); if (adv === G.adv && G.adv < ADV - 1) G.adv++;
      K.meta.track('levels', 1); K.meta.addXp(20); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Gems freed!', 'Gemas libertadas!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t(['Moves', 'Jogadas']), moves]], coins: 40 + adv * 6 + stars * 15, gems: stars === 3 ? 2 : 0, mult: 3, next: { fn: () => start('adventure', G.adv) }, menu: showMenu }), 900);
    }

    /* ---------- input: drag from tray ---------- */
    const traySlot = (i) => { if (trayY < 0) { const x = bx + N * cs + 60, h = (H - 140) / 3; return { x: x + 90, y: 110 + h * i + h / 2 }; } return { x: W / 2 + (i - 1) * Math.min(W / 3, 160), y: trayY + cs * 1.6 }; };
    const trayScale = () => Math.min(0.6, (W / 3 - 20) / (cs * 5));
    const lift = () => (H > W ? cs * 1.8 : 0);
    function pieceAt(x, y) { for (let i = 0; i < 3; i++) { const p = tray[i]; if (!p) continue; const s = traySlot(i); if (Math.abs(x - s.x) < Math.max(60, cs * 1.4) && Math.abs(y - s.y) < Math.max(60, cs * 1.4)) return i; } return -1; }
    function dims(p) { return [Math.max(...p.cells.map((c) => c[0])) + 1, Math.max(...p.cells.map((c) => c[1])) + 1]; }
    function snapPos(p, x, y) { const [w, h] = dims(p); const gx = Math.round((x - bx) / cs - w / 2), gy = Math.round((y - lift() - by) / cs - h / 2); return [gx, gy]; }
    cv.addEventListener('pointerdown', (e) => { if (!playing || K.ui.anyOpen()) return; const i = pieceAt(e.clientX, e.clientY); if (i < 0) return; drag = { i, x: e.clientX, y: e.clientY }; K.audio.play('tap', 1.3); });
    window.addEventListener('pointermove', (e) => { if (drag) { drag.x = e.clientX; drag.y = e.clientY; } });
    window.addEventListener('pointerup', () => {
      if (!drag) return; const p = tray[drag.i]; const [gx, gy] = snapPos(p, drag.x, drag.y); drag = null;
      if (fits(p, gx, gy)) place(p, gx, gy); else K.audio.play('error');
    });

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Drag the pieces onto the board. Fill a whole row or column to clear it. Clearing several lines at once or in a row builds combos. The game ends when no piece fits. In Adventure, clear the lines holding gems.', pt: 'Arraste as peças para o tabuleiro. Complete uma linha ou coluna para limpá-la. Limpar várias linhas de uma vez ou seguidas gera combos. O jogo acaba quando nenhuma peça cabe. No Aventura, limpe as linhas com gemas.' },
      missions: [
        { stat: 'lines', base: 25, reward: 80, text: { en: 'Clear {n} lines', pt: 'Limpe {n} linhas' } },
        { stat: 'score', base: 1500, type: 'max', cap: 20000, reward: 110, text: { en: 'Score {n} in one game', pt: 'Faça {n} pontos numa partida' } },
        { stat: 'blocks', base: 300, reward: 70, text: { en: 'Place {n} blocks', pt: 'Coloque {n} blocos' } },
        { stat: 'gems', base: 10, reward: 90, text: { en: 'Free {n} gems', pt: 'Liberte {n} gemas' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function renderHud() {
      hud.innerHTML = mode === 'classic' ? `<span class="chip">👑 ${G.best}</span><span class="big">${score}</span>${streak > 1 ? `<span class="chip">🔥 x${streak}</span>` : ''}` : `<span class="chip">${K.t('level')} ${adv + 1}</span><span class="big">💎 ${Math.max(0, gemsLeft)}</span><span class="chip">${score}</span>`;
      const home = K.el('span', 'chip home', '⌂'); home.style.pointerEvents = 'auto'; home.style.cursor = 'pointer'; home.onclick = () => { K.audio.play('click'); showMenu(); }; hud.appendChild(home);
    }
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Jelly<span>Blocks</span>', sub: K.t('best') + ': ' + G.best, playLabel: G.cur ? K.t('continue') : K.t('play'), onPlay: () => start('classic'),
        buttons: [K.ui.btn('💎 ' + K.t(['Adventure', 'Aventura']) + ' ' + (G.adv + 1), '', () => { K.std.hideMenu(); start('adventure', G.adv); }), K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Adventure', 'Aventura']), ADV, G.adv, G.stars, (i) => { K.std.hideMenu(); start('adventure', i); }))] });
      if (!grid.length) grid = new Array(N * N).fill(null);
    }

    /* ---------- render ---------- */
    let tt = 0;
    K.loop((dt) => { tt += dt; K.fx.update(dt); clearing.forEach((c) => (c.t += dt)); clearing = clearing.filter((c) => { if (c.t > 0 && !c.fx) { c.fx = true; K.fx.burst(bx + (c.c % N + 0.5) * cs, by + (((c.c / N) | 0) + 0.5) * cs, { n: 5, colors: [c.b.col, '#fff'], speed: 200, g: 500, shape: 'square', size: cs * 0.1, life: 0.5 }); } return c.t < 0.25; }); }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a1f55'); gr.addColorStop(1, '#46307d'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + (i % 3) * 0.02) + ')'; ctx.beginPath(); ctx.arc(((i * 137) % 1000) / 1000 * W, ((i * 311 + tt * 8) % 1000) / 1000 * H, 2 + (i % 4), 0, 6.283); ctx.fill(); }
      if (!grid.length) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; K.draw.rrect(ctx, bx - 10, by - 6, N * cs + 20, N * cs + 20, 18); ctx.fill();
      ctx.fillStyle = '#1c1540'; K.draw.rrect(ctx, bx - 10, by - 10, N * cs + 20, N * cs + 20, 18); ctx.fill();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = 'rgba(255,255,255,.05)'; K.draw.rrect(ctx, bx + x * cs + 2, by + y * cs + 2, cs - 4, cs - 4, cs * 0.18); ctx.fill(); }
      // ghost + line preview while dragging
      let ghost = null;
      if (drag && tray[drag.i]) { const p = tray[drag.i]; const [gx, gy] = snapPos(p, drag.x, drag.y); if (fits(p, gx, gy)) ghost = { p, gx, gy }; }
      const hl = new Set();
      if (ghost) {
        const tmp = grid.slice(); ghost.p.cells.forEach(([x, y]) => (tmp[idx(ghost.gx + x, ghost.gy + y)] = 1));
        for (let y = 0; y < N; y++) { let f = true; for (let x = 0; x < N; x++) if (!tmp[idx(x, y)]) f = false; if (f) for (let x = 0; x < N; x++) hl.add(idx(x, y)); }
        for (let x = 0; x < N; x++) { let f = true; for (let y = 0; y < N; y++) if (!tmp[idx(x, y)]) f = false; if (f) for (let y = 0; y < N; y++) hl.add(idx(x, y)); }
      }
      const sz = Math.round(cs * DPR);
      for (let i = 0; i < N * N; i++) {
        const b = grid[i]; if (!b) continue;
        const x = bx + (i % N) * cs, y = by + ((i / N) | 0) * cs, s = b.s || 1;
        ctx.save(); ctx.translate(x + cs / 2, y + cs / 2); ctx.scale(s, s);
        ctx.drawImage(b.gem ? gemImg(sz) : block(hl.has(i) && ghost ? ghost.p.col : b.col, sz), -cs / 2, -cs / 2, cs, cs);
        if (hl.has(i)) { ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.sin(tt * 12) * 0.15) + ')'; K.draw.rrect(ctx, -cs / 2 + 2, -cs / 2 + 2, cs - 4, cs - 4, cs * 0.18); ctx.fill(); }
        ctx.restore();
      }
      if (ghost) { ctx.globalAlpha = 0.45; ghost.p.cells.forEach(([x, y]) => ctx.drawImage(block(ghost.p.col, sz), bx + (ghost.gx + x) * cs, by + (ghost.gy + y) * cs, cs, cs)); ctx.globalAlpha = 1; }
      for (const c of clearing) { if (c.t < 0) { ctx.drawImage(c.b.gem ? gemImg(sz) : block(c.b.col, sz), bx + (c.c % N) * cs, by + ((c.c / N) | 0) * cs, cs, cs); continue; } const k = c.t / 0.25; ctx.globalAlpha = 1 - k; const s = cs * (1 - k * 0.6); ctx.drawImage(block('#ffffff', sz), bx + (c.c % N) * cs + (cs - s) / 2, by + ((c.c / N) | 0) * cs + (cs - s) / 2, s, s); ctx.globalAlpha = 1; }
      // tray
      const ts = trayScale();
      for (let i = 0; i < 3; i++) {
        const p = tray[i]; if (!p) continue;
        const [w, h] = dims(p); const dragging = drag && drag.i === i;
        const sc = dragging ? 1 : ts * p.s, s = trayScale ? cs * sc : cs;
        let ox, oy;
        if (dragging) { ox = drag.x - (w * cs) / 2; oy = drag.y - lift() - (h * cs) / 2; }
        else { const t = traySlot(i); ox = t.x - (w * s) / 2; oy = t.y - (h * s) / 2 + Math.sin(tt * 2 + i) * 2; }
        const can = canPlaceAny(p);
        if (!can && !dragging) ctx.globalAlpha = 0.35;
        p.cells.forEach(([x, y]) => ctx.drawImage(block(p.col, sz), ox + x * s, oy + y * s, s, s));
        ctx.globalAlpha = 1;
      }
      K.fx.draw(ctx);
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
    });

    K.debug = { fill() { for (let i = 0; i < N * N; i++) if (Math.random() < 0.45 && (i % N) !== 3 && ((i / N) | 0) !== 5) grid[i] = { col: K.pick(COLS), s: 1 }; } };
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); for (const k in cache) delete cache[k]; });
    K.music.set({ bpm: 100, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]], bass: true, pad: true, arp: [1, 0, 1, 1, 0, 1, 0, 1], arpWave: 'sine', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 1, 0, 1, 0, 1, 0, 1] } });
    showMenu();
  }
})();

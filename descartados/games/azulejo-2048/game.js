/* Azulejo 2048 — merge puzzle with hand-painted ceramic tiles. Classic, level mode and power-ups. */
(function () {
  const K = window.Kit;
  K.fontFamily = 'Georgia, serif';
  const SKINS = [
    { id: 'lisboa', n: ['Lisbon', 'Lisboa'], bg: '#f4f1e8', a: '#1f4fa3', b: '#e0a526', c: '#3e7d4f', board: '#d9d1bd', grout: '#bfb49a', price: 0 },
    { id: 'sevilla', n: ['Seville', 'Sevilha'], bg: '#fbf3df', a: '#b8452c', b: '#e8a524', c: '#2f6e8e', board: '#e6d2ae', grout: '#c8ad7e', price: 2500 },
    { id: 'delft', n: ['Delft', 'Delft'], bg: '#f7f7f4', a: '#27468f', b: '#6d86c4', c: '#1b2d5e', board: '#cfd6e6', grout: '#a9b3cc', price: 4000 },
    { id: 'zellige', n: ['Zellige', 'Zellige'], bg: '#f1ece0', a: '#1b7a6e', b: '#c7502f', c: '#e3b23c', board: '#cdbfa3', grout: '#a8987a', price: 6000, gem: 0 },
    { id: 'talavera', n: ['Talavera', 'Talavera'], bg: '#fffaf0', a: '#2c3f9e', b: '#f2b632', c: '#d9432e', board: '#e8dcc2', grout: '#cbbb98', price: 0, gems: 40 },
    { id: 'noite', n: ['Night glaze', 'Esmalte noturno'], bg: '#1f2433', a: '#7fb2ff', b: '#ffcf5a', c: '#ff7a8a', board: '#10131c', grout: '#2c3246', price: 0, gems: 80, dark: true },
  ];
  const LEVELS = [];
  (function genLevels() {
    const r = K.rng(2048);
    for (let i = 0; i < 40; i++) {
      const size = i < 8 ? 4 : i < 20 ? (i % 3 === 0 ? 5 : 4) : i % 2 ? 5 : 4;
      const target = [64, 64, 128, 128, 128, 256, 256, 256, 256, 512][Math.min(9, Math.floor(i / 3))] * (i >= 30 ? 2 : 1);
      const walls = i < 3 ? 0 : Math.min(size === 5 ? 4 : 2, Math.floor((i - 1) / 5));
      const moves = Math.round((target / 2.1) * (size === 5 ? 1.35 : 1.5) + 25);
      const wallCells = [];
      while (wallCells.length < walls) {
        const c = [Math.floor(r() * size), Math.floor(r() * size)];
        if (!wallCells.some((w) => w[0] === c[0] && w[1] === c[1])) wallCells.push(c);
      }
      LEVELS.push({ size, target, moves, walls: wallCells });
    }
  })();

  K.boot('azulejo_2048', { g: { best: 0, bestTile: 0, skin: 'lisboa', skins: ['lisboa'], pw: { undo: 2, hammer: 1, swap: 1, shuffle: 1 }, lvl: 0, stars: {}, sizes: [4], size: 4, cur: null } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    let N = 4, grid = [], tiles = [], nextId = 1, score = 0, runCoins = 0, moves = 0, mode = 'classic', level = null, over = false, won = false, anim = 0, undoSnap = null, tool = null, swapSel = null, revived = false, inGame = false;
    let bx = 0, by = 0, bs = 0, cs = 0, gap = 0;
    const skin = () => SKINS.find((s) => s.id === G.skin) || SKINS[0];

    /* ---------- tile painter (cached) ---------- */
    const cache = {};
    function tileImg(v, size, plain) {
      const sk = skin(), key = sk.id + v + '_' + size + (plain ? 'p' : '');
      if (cache[key]) return cache[key];
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'), s = size, L = v > 0 ? Math.log2(v) : 0;
      const rr = K.rng(v * 31 + 7);
      // glaze
      K.draw.rrect(g, 0, 0, s, s, s * 0.08); g.fillStyle = v < 0 ? sk.grout : sk.bg; g.fill();
      g.save(); K.draw.rrect(g, 0, 0, s, s, s * 0.08); g.clip();
      if (v < 0) {
        // wall: rough terracotta block
        g.fillStyle = sk.dark ? '#3a3f52' : '#b9764a'; g.fillRect(0, 0, s, s);
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = s * 0.03;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(rr() * s, rr() * s); g.lineTo(rr() * s, rr() * s); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, 0, s, s * 0.12);
      } else {
        const col = [sk.a, sk.b, sk.c];
        const main = L >= 7 ? sk.b : sk.a;
        g.lineCap = 'round'; g.lineJoin = 'round';
        // corner quarter circles (classic azulejo tiling motif)
        const cr = s * (0.18 + Math.min(L, 11) * 0.012);
        g.fillStyle = main; g.globalAlpha = 0.9;
        [[0, 0], [s, 0], [0, s], [s, s]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, cr, 0, 7); g.fill(); });
        g.globalAlpha = 1;
        if (L >= 3) { g.strokeStyle = sk.c; g.lineWidth = s * 0.025; [[0, 0], [s, 0], [0, s], [s, s]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, cr * 1.35, 0, 7); g.stroke(); }); }
        // central rosette: petals grow with value
        const petals = 4 + (L % 4) * 2, pr = s * (0.16 + Math.min(L, 12) * 0.018);
        g.save(); g.translate(s / 2, s / 2);
        if (L >= 5) { g.fillStyle = col[(L + 1) % 3]; g.globalAlpha = 0.35; g.beginPath(); g.arc(0, 0, pr * 1.55, 0, 7); g.fill(); g.globalAlpha = 1; }
        for (let i = 0; i < petals; i++) {
          g.rotate((Math.PI * 2) / petals);
          g.fillStyle = i % 2 && L >= 4 ? sk.b : main;
          g.beginPath(); g.ellipse(0, -pr * 0.75, pr * 0.28, pr * 0.62, 0, 0, 7); g.fill();
        }
        g.fillStyle = L >= 6 ? sk.c : sk.b; g.beginPath(); g.arc(0, 0, pr * 0.32, 0, 7); g.fill();
        g.restore();
        // lattice for high tiles
        if (L >= 9) { g.strokeStyle = sk.b; g.lineWidth = s * 0.02; g.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88); }
        if (L >= 11) { g.strokeStyle = sk.c; g.setLineDash([s * 0.04, s * 0.03]); g.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8); g.setLineDash([]); }
        // brush imperfections + crackle
        g.globalAlpha = 0.12; g.strokeStyle = sk.a; g.lineWidth = 1;
        for (let i = 0; i < 5; i++) { g.beginPath(); let x = rr() * s, y = rr() * s; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rr() - 0.5) * s * 0.3; y += (rr() - 0.5) * s * 0.3; g.lineTo(x, y); } g.stroke(); }
        g.globalAlpha = 1;
        // number plaque
        const txt = v < 100000 ? String(v) : K.fmt(v);
        if (!plain) {
        const fs = s * (txt.length <= 2 ? 0.36 : txt.length === 3 ? 0.3 : txt.length === 4 ? 0.24 : 0.2);
        g.font = `900 ${fs}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const tw = g.measureText(txt).width;
        g.fillStyle = sk.bg; g.globalAlpha = 0.9;
        K.draw.rrect(g, s / 2 - tw / 2 - s * 0.06, s / 2 - fs * 0.62, tw + s * 0.12, fs * 1.24, s * 0.05); g.fill();
        g.globalAlpha = 1;
        g.lineWidth = s * 0.015; g.strokeStyle = main; g.stroke();
        g.fillStyle = sk.dark ? '#fff' : L >= 7 ? sk.a : '#1d2a44'; g.fillText(txt, s / 2, s / 2 + fs * 0.05);
        }
      }
      g.restore();
      // glossy rim
      const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(0.35, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.12)');
      K.draw.rrect(g, 0, 0, s, s, s * 0.08); g.fillStyle = gr; g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = Math.max(1, s * 0.012); g.stroke();
      cache[key] = c;
      return c;
    }

    /* ---------- layout ---------- */
    K.fit(cv, (w, h, d) => {
      W = w; H = h; DPR = d;
      bs = Math.min(w - 24, h - 250, 560);
      bx = (w - bs) / 2; by = Math.max(120, (h - bs) / 2 + 20);
      if (by + bs > h - 90) by = h - 90 - bs;
      relayout();
    });
    function relayout() { gap = bs * 0.025; cs = (bs - gap * (N + 1)) / N; for (const k in cache) delete cache[k]; tiles.forEach((t) => { t.x = t.c; t.y = t.r; }); }
    const cellX = (c) => bx + gap + c * (cs + gap), cellY = (r) => by + gap + r * (cs + gap);

    /* ---------- game logic ---------- */
    function newTile(r, c, v, pop) {
      const t = { id: nextId++, r, c, v, dv: v, x: c, y: r, s: pop ? 0 : 1, dying: false };
      grid[r][c] = t; tiles.push(t);
      if (pop) K.tween(t, { s: 1 }, 0.25, 'outBack');
      return t;
    }
    function empty() { const out = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) out.push([r, c]); return out; }
    function spawn() { const e = empty(); if (!e.length) return; const [r, c] = K.pick(e); newTile(r, c, Math.random() < 0.9 ? 2 : 4, true); }
    function setup(m, lv) {
      mode = m; level = lv; N = lv ? lv.size : G.size;
      grid = Array.from({ length: N }, () => Array(N).fill(null)); tiles = [];
      score = 0; runCoins = 0; moves = 0; over = false; won = false; undoSnap = null; tool = null; swapSel = null; revived = false;
      relayout();
      if (lv) lv.walls.forEach(([r, c]) => { const t = newTile(r, c, -1, true); t.wall = true; });
      spawn(); spawn();
      inGame = true; K.game.start(); updateHud(); saveCur();
    }
    function snapshot() { return { g: grid.map((row) => row.map((t) => (t ? t.v : 0))), score, moves, runCoins }; }
    function restore(s) {
      grid = Array.from({ length: N }, () => Array(N).fill(null)); tiles = [];
      s.g.forEach((row, r) => row.forEach((v, c) => { if (v) { const t = newTile(r, c, v, false); if (v < 0) t.wall = true; } }));
      score = s.score; moves = s.moves; runCoins = s.runCoins || 0;
    }
    function saveCur() {
      if (mode === 'classic' && !over) G.cur = Object.assign(snapshot(), { N }); else G.cur = null;
      K.save.mark();
    }
    function lineCells(dir, i) {
      const out = [];
      for (let k = 0; k < N; k++) {
        if (dir === 0) out.push([i, k]); else if (dir === 1) out.push([i, N - 1 - k]);
        else if (dir === 2) out.push([k, i]); else out.push([N - 1 - k, i]);
      }
      return out;
    }
    function canMove() {
      if (empty().length) return true;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = grid[r][c]; if (!t || t.wall) continue;
        if (c + 1 < N && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
        if (r + 1 < N && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
      }
      return false;
    }
    function move(dir) {
      if (!inGame || over || anim > 0 || tool || K.ui.anyOpen()) return;
      const snap = snapshot();
      let moved = false, merges = [], gained = 0;
      tiles.forEach((t) => (t.merged = false));
      for (let i = 0; i < N; i++) {
        const cells = lineCells(dir, i);
        let pos = 0, last = null;
        for (let k = 0; k < N; k++) {
          const [r, c] = cells[k], t = grid[r][c];
          if (!t) continue;
          if (t.wall) { pos = k + 1; last = null; continue; }
          grid[r][c] = null;
          if (last && last.v === t.v && !last.merged) {
            last.v *= 2; last.merged = true; t.dying = true; t.r = last.r; t.c = last.c; t.into = last;
            merges.push(last); gained += last.v; moved = true;
            last = null;
          } else {
            const [nr, nc] = cells[pos]; pos++;
            if (nr !== r || nc !== c) moved = true;
            t.r = nr; t.c = nc; grid[nr][nc] = t; last = t;
          }
        }
      }
      if (!moved) { K.audio.play('thud', 0.8); nudge(dir); return; }
      undoSnap = snap; moves++;
      K.audio.play('whoosh');
      anim = 0.12;
      tiles.forEach((t) => K.tween(t, { x: t.c, y: t.r }, 0.12, 'outQuad'));
      setTimeout(() => finishMove(merges, gained), 125);
    }
    let nudgeX = 0, nudgeY = 0;
    function nudge(dir) { const d = 8; nudgeX = dir === 0 ? -d : dir === 1 ? d : 0; nudgeY = dir === 2 ? -d : dir === 3 ? d : 0; }
    function finishMove(merges, gained) {
      tiles = tiles.filter((t) => !t.dying);
      let maxV = 0;
      merges.forEach((t, i) => {
        t.dv = t.v; t.s = 1.25; K.tween(t, { s: 1 }, 0.25, 'outBack');
        const x = cellX(t.c) + cs / 2, y = cellY(t.r) + cs / 2, sk = skin();
        K.fx.burst(x, y, { n: 6 + Math.log2(t.v), colors: [sk.a, sk.b, sk.c, sk.bg], speed: 180 + t.v * 0.2, g: 500, shape: 'square', size: cs * 0.05, life: 0.6 });
        maxV = Math.max(maxV, t.v);
        setTimeout(() => K.audio.play('merge', 0.7 + Math.log2(t.v) * 0.06), i * 40);
      });
      if (merges.length) {
        score += gained;
        const coinGain = Math.max(1, Math.round(gained / 12));
        runCoins += coinGain;
        K.meta.track('merges', merges.length);
        K.meta.trackMax('tile', maxV);
        if (merges.length >= 3) { K.fx.text(W / 2, by - 12, K.t(['Combo', 'Combo']) + ' x' + merges.length + '!', { color: skin().b, size: 30, stroke: '#1d2a44' }); K.audio.play('combo'); K.fx.shake(3 + merges.length); }
        if (maxV >= 256) { K.fx.shake(Math.log2(maxV)); K.fx.hitstop(0.04); }
        if (maxV > G.bestTile) {
          if (G.bestTile >= 64) { K.fx.text(W / 2, by + bs / 2, K.t(['New tile', 'Nova peça']) + ' ' + maxV + '!', { color: '#fff', stroke: skin().a, size: 44, life: 1.6 }); K.audio.play('levelup'); K.game.happy(); K.fx.flash('#fff', 0.35); }
          G.bestTile = maxV;
        }
        K.meta.addXp(merges.length);
      }
      spawn();
      anim = 0;
      if (score > G.best) G.best = score;
      updateHud();
      if (mode === 'level') {
        if (!won && tiles.some((t) => t.v >= level.target)) { won = true; return levelWin(); }
        if (moves >= level.moves) return gameOver(K.t(['Out of moves', 'Sem movimentos']));
      }
      if (!canMove()) return gameOver(K.t(['No moves left', 'Sem jogadas']));
      saveCur();
    }

    /* ---------- power-ups ---------- */
    const PW = {
      undo: { ic: '↶', n: ['Undo', 'Voltar'], price: 150 },
      hammer: { ic: '⚒', n: ['Hammer', 'Martelo'], price: 250 },
      swap: { ic: '⇄', n: ['Swap', 'Trocar'], price: 200 },
      shuffle: { ic: '⟳', n: ['Shuffle', 'Embaralhar'], price: 300 },
    };
    function usePw(k) {
      if (!inGame || over || anim > 0) return;
      if (G.pw[k] <= 0) return buyPw(k);
      if (k === 'undo') {
        if (!undoSnap) { K.audio.play('error'); return; }
        restore(undoSnap); undoSnap = null; G.pw.undo--; K.audio.play('whoosh'); after();
      } else if (k === 'shuffle') {
        const vals = tiles.filter((t) => !t.wall).map((t) => t.v);
        const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c] || !grid[r][c].wall) cells.push([r, c]);
        tiles = tiles.filter((t) => t.wall);
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] && !grid[r][c].wall) grid[r][c] = null;
        vals.sort(() => Math.random() - 0.5).forEach((v) => { const i = Math.floor(Math.random() * cells.length); const [r, c] = cells.splice(i, 1)[0]; newTile(r, c, v, true); });
        G.pw.shuffle--; K.audio.play('power'); K.fx.shake(5); after();
      } else { tool = k; swapSel = null; K.ui.toast(K.t(k === 'hammer' ? ['Tap a tile to smash it', 'Toque numa peça para quebrar'] : ['Tap two tiles to swap', 'Toque em duas peças para trocar'])); }
      updateHud();
    }
    function after() { K.meta.track('powerups', 1); updateHud(); saveCur(); }
    function buyPw(k) {
      const p = PW[k];
      const pnl = K.ui.panel({ title: p.ic + ' ' + K.t(p.n), body: `<p>${K.t(['Get more power-ups', 'Ganhe mais power-ups'])}</p>` });
      pnl.foot.appendChild(K.ui.adBtn('+1 ' + K.t('free'), () => { G.pw[k]++; K.save.mark(); updateHud(); pnl.close(); K.audio.play('power'); }));
      pnl.foot.appendChild(K.ui.btn('+3 · ' + K.icon.coin + ' ' + p.price * 2, '', () => { if (K.meta.spend(p.price * 2)) { G.pw[k] += 3; updateHud(); pnl.close(); } }));
      pnl.panel.appendChild(pnl.foot);
    }
    function boardTap(x, y) {
      if (!tool) return;
      const c = Math.floor((x - bx - gap / 2) / (cs + gap)), r = Math.floor((y - by - gap / 2) / (cs + gap));
      if (r < 0 || c < 0 || r >= N || c >= N) { tool = null; return; }
      const t = grid[r][c];
      if (!t) return;
      if (tool === 'hammer') {
        undoSnap = snapshot();
        grid[r][c] = null; tiles = tiles.filter((q) => q !== t);
        const sk = skin(); const px = cellX(c) + cs / 2, py = cellY(r) + cs / 2;
        K.fx.burst(px, py, { n: 26, colors: [sk.a, sk.bg, sk.b, sk.grout], speed: 420, g: 900, shape: 'square', size: cs * 0.07, life: 0.9 });
        K.audio.play('explode'); K.fx.shake(10); K.fx.hitstop(0.05);
        G.pw.hammer--; tool = null; after();
      } else if (tool === 'swap' && !t.wall) {
        if (!swapSel) { swapSel = t; K.audio.play('click'); return; }
        if (swapSel === t) { swapSel = null; return; }
        undoSnap = snapshot();
        const a = swapSel, b = t, ar = a.r, ac = a.c;
        a.r = b.r; a.c = b.c; b.r = ar; b.c = ac; grid[a.r][a.c] = a; grid[b.r][b.c] = b;
        K.tween(a, { x: a.c, y: a.r }, 0.2, 'outBack'); K.tween(b, { x: b.c, y: b.r }, 0.2, 'outBack');
        K.audio.play('swing'); G.pw.swap--; tool = null; swapSel = null; after();
      }
    }

    /* ---------- end states ---------- */
    function gameOver(reason) {
      over = true; K.game.stop(); K.audio.play('lose');
      K.meta.track('games', 1);
      G.cur = null; K.save.mark();
      setTimeout(() => endPanel(reason), 500);
    }
    function endPanel(reason) {
      const isLevel = mode === 'level';
      const coins = runCoins;
      const body = `<p>${reason}</p><div class="kit-big">${score}</div><p class="kit-note">${K.t('best')}: ${G.best} · ${K.t(['Best tile', 'Maior peça'])}: ${G.bestTile}</p><div class="kit-big">${K.icon.coin} ${coins}</div>`;
      const pnl = K.ui.panel({ title: K.t('gameOver'), body, closable: false });
      const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      let paid = false;
      const pay = (m) => { if (paid) return; paid = true; K.meta.addCoins(coins * m, pt()); };
      if (!revived && !isLevel) {
        pnl.foot.appendChild(K.ui.adBtn(K.t(['Continue: clear small tiles', 'Continuar: limpa peças pequenas']), () => { pnl.close(); revive(); }));
      } else if (!revived && isLevel) {
        pnl.foot.appendChild(K.ui.adBtn(K.t(['+15 moves', '+15 movimentos']), () => { pnl.close(); revived = true; level = Object.assign({}, level, { moves: level.moves + 15 }); over = false; K.game.start(); updateHud(); if (!canMove()) revive(); }));
      }
      pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), (b) => { pay(2); b.remove(); }));
      pnl.foot.appendChild(K.ui.btn(K.t('restart'), '', () => { pay(1); pnl.close(); K.meta.showPending(() => K.ads.midgame().then(() => (isLevel ? startLevel(curLevel) : setup('classic')))); }));
      pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pay(1); pnl.close(); showMenu(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    function revive() {
      revived = true; over = false;
      const small = tiles.filter((t) => !t.wall).sort((a, b) => a.v - b.v).slice(0, Math.ceil(N * N * 0.4));
      small.forEach((t, i) => setTimeout(() => {
        grid[t.r][t.c] = null; tiles = tiles.filter((q) => q !== t);
        K.fx.burst(cellX(t.c) + cs / 2, cellY(t.r) + cs / 2, { n: 12, colors: [skin().a, skin().bg], speed: 300, shape: 'square', size: 5 });
        K.audio.play('pop', 1 + i * 0.05);
      }, i * 70));
      K.game.start(); setTimeout(saveCur, small.length * 70 + 50);
    }
    function levelWin() {
      K.game.stop(); K.game.happy(); K.audio.play('win');
      const left = level.moves - moves, stars = left > level.moves * 0.3 ? 3 : left > level.moves * 0.12 ? 2 : 1;
      const idx = curLevel;
      const prev = G.stars[idx] || 0;
      G.stars[idx] = Math.max(prev, stars);
      if (idx === G.lvl && G.lvl < LEVELS.length - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(20);
      const reward = 60 + idx * 20 + stars * 30 + runCoins;
      K.fx.flash('#fff', 0.6);
      for (let i = 0; i < 5; i++) setTimeout(() => K.fx.burst(K.rand(0, W), K.rand(0, H * 0.5), { n: 30, colors: [skin().a, skin().b, skin().c, '#fff'], speed: 400, shape: 'star', size: 8, life: 1.2 }), i * 150);
      setTimeout(() => {
        const body = `<div class="kit-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><p>${K.t(['Level', 'Nível'])} ${idx + 1}</p><div class="kit-big">${K.icon.coin} ${reward}</div>`;
        const pnl = K.ui.panel({ title: K.t(['Level complete!', 'Nível completo!']), body, closable: false });
        const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        let paid = false;
        const go = (m, next) => { if (!paid) { paid = true; K.meta.addCoins(reward * m, pt()); } pnl.close(); K.meta.showPending(() => (next ? K.ads.midgame().then(() => startLevel(G.lvl)) : showMenu())); };
        pnl.foot.appendChild(K.ui.adBtn(K.t('x3'), () => go(3, true)));
        pnl.foot.appendChild(K.ui.btn(K.t(['Next', 'Próximo']), '', () => go(1, true)));
        pnl.panel.appendChild(pnl.foot);
      }, 900);
      K.save.mark();
    }
    function startLevel(i) { curLevel = Math.min(i, G.lvl, LEVELS.length - 1); setup('level', LEVELS[curLevel]); }
    let curLevel = 0;

    /* ---------- HUD (DOM) ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Swipe or use the arrow keys to slide all tiles. Equal tiles merge. Reach 2048! Walls never move. Use power-ups when you are stuck.', pt: 'Deslize ou use as setas para mover as peças. Peças iguais se juntam. Chegue ao 2048! Paredes não se movem. Use power-ups quando travar.' },
      missions: [
        { stat: 'merges', base: 80, reward: 80, text: { en: 'Merge {n} times', pt: 'Junte peças {n} vezes' } },
        { stat: 'tile', base: 256, type: 'max', cap: 2048, reward: 120, text: { en: 'Make a {n} tile', pt: 'Crie uma peça {n}' } },
        { stat: 'games', base: 2, reward: 70, text: { en: 'Finish {n} games', pt: 'Termine {n} partidas' } },
        { stat: 'powerups', base: 2, reward: 70, text: { en: 'Use {n} power-ups', pt: 'Use {n} power-ups' } },
        { stat: 'levels', base: 2, reward: 120, text: { en: 'Clear {n} levels', pt: 'Complete {n} níveis' } },
        { stat: '_coins', base: 400, reward: 60, text: { en: 'Earn {n} coins', pt: 'Ganhe {n} moedas' } },
      ],
    });
    K.meta.buildHud({ extra: [{ id: 'home', icon: '⌂', fn: () => { if (inGame && !over) saveCur(); showMenu(); }, title: 'Menu' }] });
    const home = K.meta.buttons.home;

    const hud = K.el('div', 'hud');
    hud.innerHTML = `<div class="box"><small>${K.t('score')}</small><b class="sc">0</b></div><div class="box mid"><small class="mt"></small><b class="mv"></b></div><div class="box"><small>${K.t('best')}</small><b class="bs">0</b></div>`;
    K.ui.root.appendChild(hud);
    const pwBar = K.el('div', 'pwbar');
    K.ui.root.appendChild(pwBar);
    Object.keys(PW).forEach((k) => {
      const b = K.el('button', 'pw', `<span class="pi">${PW[k].ic}</span><span class="pn">${K.t(PW[k].n)}</span><span class="pc"></span>`);
      b.dataset.k = k;
      b.onclick = (e) => { e.stopPropagation(); K.audio.play('click'); usePw(k); };
      pwBar.appendChild(b);
    });
    function updateHud() {
      hud.querySelector('.sc').textContent = score;
      hud.querySelector('.bs').textContent = G.best;
      if (mode === 'level' && level) { hud.querySelector('.mt').textContent = K.t('level') + ' ' + (curLevel + 1) + ' · ' + K.t(['goal', 'meta']) + ' ' + level.target; hud.querySelector('.mv').textContent = Math.max(0, level.moves - moves) + ' ' + K.t(['moves', 'jogadas']); }
      else { hud.querySelector('.mt').textContent = K.t(['Classic', 'Clássico']) + ' ' + N + '×' + N; hud.querySelector('.mv').textContent = '+' + runCoins + ' ◉'; }
      pwBar.querySelectorAll('.pw').forEach((b) => { const n = G.pw[b.dataset.k]; b.querySelector('.pc').textContent = n > 0 ? n : '+'; b.classList.toggle('empty', n <= 0); b.classList.toggle('on', tool === b.dataset.k); });
      const vis = inGame ? '' : 'none';
      hud.style.display = pwBar.style.display = vis;
      home.style.display = inGame ? '' : 'none';
      K.meta.setMenuButtonsVisible(!inGame);
      positionDom();
    }
    function positionDom() {
      hud.style.top = Math.max(56, by - 70) + 'px';
      pwBar.style.top = by + bs + 14 + 'px';
    }

    /* ---------- menu ---------- */
    const menu = K.el('div', 'menu');
    K.ui.root.appendChild(menu);
    function showMenu() {
      inGame = false; K.game.stop(); updateHud();
      menu.style.display = '';
      menu.innerHTML = `<div class="logo"><div class="lt"></div><h1>Azulejo<br><span>2048</span></h1></div>`;
      const lt = menu.querySelector('.lt');
      [2, 16, 128, 2048].forEach((v) => { const im = tileImg(v, 96); const i = new Image(); i.src = im.toDataURL(); lt.appendChild(i); });
      const play = K.ui.btn(G.cur ? K.t('continue') : K.t('play'), 'big', () => { menu.style.display = 'none'; if (G.cur && G.cur.N === G.size) { N = G.cur.N; mode = 'classic'; level = null; relayout(); restore(G.cur); over = false; undoSnap = null; tool = null; revived = false; inGame = true; K.game.start(); updateHud(); } else setup('classic'); });
      play.dataset.play = '1';
      const lv = K.ui.btn(K.t('level') + ' ' + (G.lvl + 1) + ' ▸', '', () => { menu.style.display = 'none'; openLevels(); });
      const th = K.ui.btn('🎨 ' + K.t(['Tiles', 'Azulejos']), '', () => openSkins());
      const sz = K.ui.btn('▦ ' + G.size + '×' + G.size, '', () => openSizes());
      const row = K.el('div', 'mrow'); [lv, th, sz].forEach((b) => row.appendChild(b));
      menu.appendChild(play); menu.appendChild(row);
      K.meta.showPending();
    }
    function openLevels() {
      const body = K.el('div', 'lvgrid');
      LEVELS.forEach((L, i) => {
        const b = K.el('button', 'lv' + (i > G.lvl ? ' lock' : '') + (i === G.lvl ? ' cur' : ''), `<b>${i + 1}</b><small>${L.target}</small><i>${'★'.repeat(G.stars[i] || 0)}</i>`);
        b.onclick = () => { if (i > G.lvl) { K.audio.play('error'); return; } K.audio.play('click'); pnl.close(); startLevel(i); };
        body.appendChild(b);
      });
      const pnl = K.ui.panel({ title: K.t(['Levels', 'Níveis']), body, cls: 'wide', onClose: () => { if (!inGame) showMenu(); } });
    }
    function openSkins() {
      const body = K.el('div', 'kit-grid');
      const pnl = K.ui.panel({ title: K.t(['Tile styles', 'Estilos de azulejo']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        SKINS.forEach((sk) => {
          const own = G.skins.includes(sk.id);
          const prevSkin = G.skin; G.skin = sk.id; const src = tileImg(64, 80).toDataURL(); G.skin = prevSkin;
          const cell = K.el('div', 'kit-cell' + (G.skin === sk.id ? ' on' : ''), `<img src="${src}" width="64" height="64" alt=""><div>${K.t(sk.n)}</div>`);
          const b = own ? K.ui.btn(G.skin === sk.id ? K.t('equipped') : K.t('equip'), 'sm', () => { G.skin = sk.id; K.save.mark(); render(); showMenu(); })
            : sk.gems ? K.ui.btn(K.icon.gem + ' ' + sk.gems, 'sm', () => { if (K.meta.spendGems(sk.gems)) { G.skins.push(sk.id); G.skin = sk.id; K.save.mark(); render(); showMenu(); } })
              : K.ui.btn(K.icon.coin + ' ' + sk.price, 'sm', () => { if (K.meta.spend(sk.price)) { G.skins.push(sk.id); G.skin = sk.id; K.save.mark(); render(); showMenu(); } });
          cell.appendChild(b); body.appendChild(cell);
        });
      };
      render();
    }
    function openSizes() {
      const SIZES = [{ n: 3, p: 1500 }, { n: 4, p: 0 }, { n: 5, p: 3000 }, { n: 6, p: 6000 }];
      const body = K.el('div', 'kit-grid');
      const pnl = K.ui.panel({ title: K.t(['Board size', 'Tamanho do tabuleiro']), body });
      const render = () => {
        body.innerHTML = '';
        SIZES.forEach((s) => {
          const own = G.sizes.includes(s.n);
          const cell = K.el('div', 'kit-cell' + (G.size === s.n ? ' on' : ''), `<div style="font-size:26px">${s.n}×${s.n}</div>`);
          cell.appendChild(own ? K.ui.btn(G.size === s.n ? K.t('equipped') : K.t('equip'), 'sm', () => { G.size = s.n; G.cur = null; K.save.mark(); render(); showMenu(); })
            : K.ui.btn(K.icon.coin + ' ' + s.p, 'sm', () => { if (K.meta.spend(s.p)) { G.sizes.push(s.n); G.size = s.n; G.cur = null; K.save.mark(); render(); showMenu(); } }));
          body.appendChild(cell);
        });
      };
      render();
      void pnl;
    }

    /* ---------- input ---------- */
    let sx = 0, sy = 0, down = false;
    window.addEventListener('keydown', (e) => {
      const m = { ArrowLeft: 0, KeyA: 0, ArrowRight: 1, KeyD: 1, ArrowUp: 2, KeyW: 2, ArrowDown: 3, KeyS: 3 }[e.code];
      if (m != null) { e.preventDefault(); move(m); }
      if (e.code === 'KeyZ' && inGame) usePw('undo');
    });
    cv.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; down = true; });
    window.addEventListener('pointerup', (e) => {
      if (!down) return; down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { if (inGame) boardTap(e.clientX, e.clientY); return; }
      if (tool) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 1) : dy < 0 ? 2 : 3);
    });

    /* ---------- render ---------- */
    let t = 0;
    K.loop((dt) => {
      t += dt; K.fx.update(dt);
      nudgeX *= Math.pow(0.001, dt); nudgeY *= Math.pow(0.001, dt);
    }, () => {
      const sk = skin();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // wall of background tiles (large faint azulejo pattern)
      ctx.fillStyle = sk.dark ? '#171a26' : '#e9e3d3'; ctx.fillRect(0, 0, W, H);
      const bt = 90, bimg = tileImg(sk.dark ? 4 : 8, bt, true);
      ctx.globalAlpha = sk.dark ? 0.12 : 0.18;
      const off = (t * 6) % bt;
      for (let y = -bt; y < H + bt; y += bt) for (let x = -bt; x < W + bt; x += bt) ctx.drawImage(bimg, x + off, y + off * 0.5, bt, bt);
      ctx.globalAlpha = 1;
      if (!inGame && menu.style.display !== 'none') { K.fx.draw(ctx); return; }
      ctx.save(); ctx.translate(K.fx.shakeX + nudgeX, K.fx.shakeY + nudgeY);
      // board
      ctx.fillStyle = 'rgba(0,0,0,.18)'; K.draw.rrect(ctx, bx + 4, by + 8, bs, bs, 16); ctx.fill();
      ctx.fillStyle = sk.board; K.draw.rrect(ctx, bx, by, bs, bs, 16); ctx.fill();
      ctx.strokeStyle = sk.grout; ctx.lineWidth = 3; ctx.stroke();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { ctx.fillStyle = sk.grout; K.draw.rrect(ctx, cellX(c), cellY(r), cs, cs, cs * 0.08); ctx.fill(); }
      const sorted = tiles.slice().sort((a, b) => (a.dying ? -1 : 0) - (b.dying ? -1 : 0));
      for (const tl of sorted) {
        const x = bx + gap + tl.x * (cs + gap), y = by + gap + tl.y * (cs + gap);
        const s = tl.s, img = tileImg(tl.dv, Math.round(cs * DPR));
        ctx.save(); ctx.translate(x + cs / 2, y + cs / 2); ctx.scale(s, s);
        if (swapSel === tl) { ctx.rotate(Math.sin(t * 20) * 0.06); }
        ctx.fillStyle = 'rgba(0,0,0,.2)'; K.draw.rrect(ctx, -cs / 2 + 2, -cs / 2 + 4, cs, cs, cs * 0.08); ctx.fill();
        ctx.drawImage(img, -cs / 2, -cs / 2, cs, cs);
        if (tool && !tl.wall) { ctx.strokeStyle = tool === 'hammer' ? '#e0452f' : '#2c8a4a'; ctx.lineWidth = 3 + Math.sin(t * 8) * 1.5; K.draw.rrect(ctx, -cs / 2, -cs / 2, cs, cs, cs * 0.08); ctx.stroke(); }
        ctx.restore();
      }
      K.fx.draw(ctx);
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
    });

    K.music.set({ bpm: 76, chords: [[62, 65, 69], [60, 64, 67], [58, 62, 65], [57, 61, 64]], bass: true, pad: true, padWave: 'triangle', lead: [74, 0, 72, 0, 69, 0, 0, 0, 72, 0, 70, 0, 69, 0, 67, 0, 69, 0, 0, 0, 65, 0, 67, 0, 69, 0, 0, 0, 0, 0, 0, 0], leadWave: 'sine' });
    showMenu();
  }
})();

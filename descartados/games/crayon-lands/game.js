/* Crayon Lands — territory capture drawn in wax crayon on sketchbook paper. 40 stages. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", "Trebuchet MS", sans-serif';
  const COLORS = [
    { c: '#e63946', n: ['Cherry', 'Cereja'], p: 0 }, { c: '#1d7ed6', n: ['Sky', 'Céu'], p: 0 }, { c: '#2a9d4b', n: ['Leaf', 'Folha'], p: 400 },
    { c: '#f4a300', n: ['Honey', 'Mel'], p: 600 }, { c: '#8e44ad', n: ['Grape', 'Uva'], p: 800 }, { c: '#ff6fa8', n: ['Bubblegum', 'Chiclete'], p: 1000 },
    { c: '#00a6a6', n: ['Teal', 'Turquesa'], p: 1400 }, { c: '#6d4c41', n: ['Cocoa', 'Cacau'], p: 1800 }, { c: '#ff7b25', n: ['Tangerine', 'Tangerina'], p: 2200 },
    { c: '#3d405b', n: ['Graphite', 'Grafite'], p: 2600 }, { c: '#9ccc3d', n: ['Lime', 'Limão'], p: 3000, }, { c: '#c1121f', n: ['Ruby', 'Rubi'], gems: 30 },
  ];
  const BOTC = ['#f4a300', '#8e44ad', '#2a9d4b', '#ff6fa8', '#00a6a6', '#6d4c41', '#ff7b25', '#3d405b', '#1d7ed6', '#e63946', '#9ccc3d', '#c1121f'];
  const FACES = ['•ᴗ•', '◕‿◕', '•̀ᴗ•́', 'ᵔᴥᵔ', '^_^', '˘ᵕ˘'];
  const UPG = [
    { id: 'speed', n: ['Speed', 'Velocidade'], max: 8, base: 200 },
    { id: 'home', n: ['Start land', 'Terra inicial'], max: 6, base: 250 },
    { id: 'shield', n: ['Eraser shield', 'Escudo borracha'], max: 3, base: 800 },
    { id: 'coin', n: ['Coin bonus', 'Bônus de moedas'], max: 10, base: 220 },
  ];
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  K.boot('crayon_lands', { g: { stage: 0, best: 0, color: 0, owned: [0, 1], up: { speed: 0, home: 0, shield: 0, coin: 0 }, stars: {} } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; });
    const CP = 10; // px per cell on territory canvas
    let N = 60, grid, trailMap, ents = [], player = null, playing = false, stage = null, stageIdx = 0, won = false, revived = false, shield = 0, runKills = 0, snapshot = null;
    const terr = document.createElement('canvas'), tctx = terr.getContext('2d');
    const pats = {};
    function crayonPattern(col) {
      if (pats[col]) return pats[col];
      const c = document.createElement('canvas'); c.width = c.height = 48;
      const g = c.getContext('2d'); const r = K.rng(col.length * 99 + col.charCodeAt(1));
      g.globalAlpha = 0.28; g.fillStyle = col; g.fillRect(0, 0, 48, 48);
      g.globalAlpha = 0.55; g.strokeStyle = col; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let i = -48; i < 96; i += 5) { g.beginPath(); g.moveTo(i + r() * 2, 0); g.lineTo(i + 30 + r() * 3, 48); g.stroke(); }
      g.globalAlpha = 0.25; g.lineWidth = 1;
      for (let i = 0; i < 40; i++) { g.beginPath(); const x = r() * 48, y = r() * 48; g.moveTo(x, y); g.lineTo(x + r() * 8, y + r() * 3); g.stroke(); }
      return (pats[col] = tctx.createPattern(c, 'repeat'));
    }
    const paperTile = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'); g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(80,120,200,.18)'; g.lineWidth = 1;
      for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(256, y + 0.5); g.stroke(); }
      const r = K.rng(3); g.fillStyle = 'rgba(0,0,0,.035)'; for (let i = 0; i < 600; i++) g.fillRect(r() * 256, r() * 256, 1.5, 1.5);
      return c;
    })();
    const paperPat = ctx.createPattern(paperTile, 'repeat');

    /* ---------- stages ---------- */
    function stageCfg(i) {
      return { n: Math.min(110, 56 + i * 2), bots: Math.min(12, 3 + Math.floor(i / 2)), target: Math.min(62, 18 + Math.round(i * 1.2)), aggro: Math.min(0.9, 0.15 + i * 0.03), botSpeed: Math.min(6.8, 5 + i * 0.06) };
    }

    /* ---------- territory ---------- */
    const idx = (x, y) => y * N + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
    function paintCells(x0, y0, x1, y1) {
      x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(N - 1, x1 + 1); y1 = Math.min(N - 1, y1 + 1);
      tctx.clearRect(x0 * CP, y0 * CP, (x1 - x0 + 1) * CP, (y1 - y0 + 1) * CP);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const o = grid[idx(x, y)]; if (!o) continue;
        tctx.fillStyle = crayonPattern(ents[o - 1].col); tctx.fillRect(x * CP, y * CP, CP, CP);
      }
      tctx.lineCap = 'round';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const o = grid[idx(x, y)]; if (!o) continue;
        tctx.strokeStyle = ents[o - 1].col; tctx.lineWidth = 2.5;
        const X = x * CP, Y = y * CP;
        tctx.beginPath();
        if (!inb(x, y - 1) || grid[idx(x, y - 1)] !== o) { tctx.moveTo(X, Y + 1); tctx.lineTo(X + CP, Y + 1); }
        if (!inb(x - 1, y) || grid[idx(x - 1, y)] !== o) { tctx.moveTo(X + 1, Y); tctx.lineTo(X + 1, Y + CP); }
        if (!inb(x + 1, y) || grid[idx(x + 1, y)] !== o) { tctx.moveTo(X + CP - 1, Y); tctx.lineTo(X + CP - 1, Y + CP); }
        tctx.stroke();
        if (!inb(x, y + 1) || grid[idx(x, y + 1)] !== o) { tctx.lineWidth = 5; tctx.beginPath(); tctx.moveTo(X, Y + CP - 2); tctx.lineTo(X + CP, Y + CP - 2); tctx.stroke(); }
      }
    }
    function claimSquare(e, cx, cy, r) {
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inb(x, y)) { const i = idx(x, y); if (grid[i]) cellCount[grid[i]]--; grid[i] = e.id; cellCount[e.id]++; }
      paintCells(cx - r, cy - r, cx + r, cy + r);
    }
    let cellCount = [];
    function capture(e) {
      const id = e.id;
      let x0 = N, y0 = N, x1 = 0, y1 = 0;
      // bbox of own territory + trail
      for (const t of e.trail) { const x = t % N, y = (t / N) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const bb = e.bb; x0 = Math.min(x0, bb[0]); y0 = Math.min(y0, bb[1]); x1 = Math.max(x1, bb[2]); y1 = Math.max(y1, bb[3]);
      x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(N - 1, x1 + 1); y1 = Math.min(N - 1, y1 + 1);
      for (const t of e.trail) { trailMap[t] = 0; setCell(t, id); }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, seen = new Uint8Array(bw * bh), q = [];
      const push = (x, y) => { const k = (y - y0) * bw + (x - x0); if (seen[k] || grid[idx(x, y)] === id) return; seen[k] = 1; q.push(x, y); };
      for (let x = x0; x <= x1; x++) { push(x, y0); push(x, y1); }
      for (let y = y0; y <= y1; y++) { push(x0, y); push(x1, y); }
      while (q.length) { const y = q.pop(), x = q.pop(); if (x > x0) push(x - 1, y); if (x < x1) push(x + 1, y); if (y > y0) push(x, y - 1); if (y < y1) push(x, y + 1); }
      let gained = e.trail.length;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = (y - y0) * bw + (x - x0), i = idx(x, y);
        if (!seen[k] && grid[i] !== id) { setCell(i, id); gained++; }
      }
      e.trail = [];
      e.bb = [Math.min(bb[0], x0 + 1), Math.min(bb[1], y0 + 1), Math.max(bb[2], x1 - 1), Math.max(bb[3], y1 - 1)];
      paintCells(x0, y0, x1, y1);
      // eliminate anyone who lost all land
      ents.forEach((o) => { if (o.alive && o !== e && cellCount[o.id] <= 0) killEnt(o, e); });
      return gained;
    }
    function setCell(i, id) { const o = grid[i]; if (o) cellCount[o]--; grid[i] = id; cellCount[id]++; }

    /* ---------- entities ---------- */
    function makeEnt(col, bot, name) {
      const e = { id: ents.length + 1, col, bot, name, alive: true, cx: 0, cy: 0, t: 0, dir: 0, next: 0, trail: [], speed: 6.5, bb: [0, 0, 0, 0], plan: null, face: K.pick(FACES), respawn: 0 };
      ents.push(e); cellCount[e.id] = 0; return e;
    }
    function placeEnt(e, r) {
      for (let k = 0; k < 60; k++) {
        const cx = K.randi(r + 3, N - r - 4), cy = K.randi(r + 3, N - r - 4);
        let free = true;
        for (let y = cy - r - 2; y <= cy + r + 2 && free; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) if (grid[idx(x, y)] || trailMap[idx(x, y)]) { free = false; break; }
        if (free || k === 59) { e.cx = cx; e.cy = cy; e.t = 0; e.dir = K.randi(0, 3); e.next = e.dir; claimSquare(e, cx, cy, r); e.bb = [cx - r, cy - r, cx + r, cy + r]; e.alive = true; e.trail = []; e.plan = null; return; }
      }
    }
    function killEnt(e, by) {
      if (!e.alive) return;
      e.alive = false;
      for (const t of e.trail) trailMap[t] = 0;
      const px = e.cx, py = e.cy;
      e.trail = [];
      // erase territory
      let x0 = N, y0 = N, x1 = 0, y1 = 0;
      if (e === player) snapshot = { cells: [] };
      for (let i = 0; i < grid.length; i++) if (grid[i] === e.id) { if (e === player) snapshot.cells.push(i); grid[i] = 0; const x = i % N, y = (i / N) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      cellCount[e.id] = 0;
      if (x1 >= x0) paintCells(x0, y0, x1, y1);
      const s = toScreen(px + 0.5, py + 0.5);
      K.fx.burst(s.x, s.y, { n: 36, colors: [e.col, '#fff', '#222'], speed: 420, g: 200, shape: 'square', size: 6, life: 0.9 });
      if (by === player) {
        runKills++; K.meta.track('kills', 1); K.meta.addXp(6); K.fx.shake(10); K.fx.hitstop(0.08); K.audio.play('explode');
        K.fx.text(W / 2, H * 0.3, K.pick(['SCRIBBLED!', 'ERASED!', 'CUT!']), { color: e.col, stroke: '#fff', size: 44, life: 1.2 });
      } else K.audio.play('hit', 0.8);
      if (e === player) { onPlayerDeath(by); }
      else e.respawn = 3 + Math.random() * 3;
    }

    /* ---------- movement ---------- */
    function stepEnt(e, dt) {
      e.t += e.speed * dt;
      while (e.t >= 1 && e.alive) {
        e.t -= 1;
        const d = DIRS[e.dir];
        e.cx += d[0]; e.cy += d[1];
        enterCell(e);
        if (!e.alive) return;
        if (e.bot) botDecide(e);
        if ((e.next + 2) % 4 !== e.dir) e.dir = e.next;
      }
    }
    function enterCell(e) {
      if (!inb(e.cx, e.cy)) { e.cx = K.clamp(e.cx, 0, N - 1); e.cy = K.clamp(e.cy, 0, N - 1); if (e === player && shield > 0) return useShield(); return killEnt(e, null); }
      const i = idx(e.cx, e.cy), tr = trailMap[i];
      if (tr === e.id) { if (e === player && shield > 0) return useShield(); return killEnt(e, null); }
      if (tr && tr !== e.id) {
        const victim = ents[tr - 1];
        if (victim === player && shield > 0) { useShield(); }
        else killEnt(victim, e);
      }
      if (grid[i] !== e.id) {
        trailMap[i] = e.id; e.trail.push(i);
        if (e === player && e.trail.length === 1) K.audio.play('swing');
      } else if (e.trail.length) {
        const g = capture(e);
        if (e === player) {
          const pct = (cellCount[e.id] / (N * N)) * 100;
          K.meta.track('cells', g);
          const s = toScreen(e.cx + 0.5, e.cy + 0.5);
          K.fx.text(s.x, s.y - 30, '+' + g, { color: e.col, stroke: '#fff', size: 22 + Math.min(30, g / 8) });
          K.fx.burst(s.x, s.y, { n: Math.min(40, 8 + g / 4), colors: [e.col, '#fff'], speed: 300, shape: 'star', size: 7, life: 0.8 });
          K.audio.play(g > 80 ? 'win' : 'coin', 0.9 + Math.min(0.5, g / 400));
          if (g > 120) { K.fx.shake(8); K.game.happy(); K.fx.text(W / 2, H * 0.25, K.t(['HUGE GRAB!', 'SUPER CAPTURA!']), { color: '#f4a300', stroke: '#3d405b', size: 40, life: 1.3 }); }
          K.meta.trackMax('pct', Math.floor(pct));
          K.meta.addXp(Math.ceil(g / 30));
        }
      }
    }
    function useShield() {
      shield--; K.audio.play('power'); K.fx.flash('#fff', 0.6); K.ui.toast(K.t(['Eraser shield saved you!', 'O escudo borracha te salvou!']));
      for (const t of player.trail) trailMap[t] = 0;
      player.trail = [];
      // teleport home
      const cells = []; for (let i = 0; i < grid.length; i++) if (grid[i] === player.id) cells.push(i);
      if (cells.length) { const c = K.pick(cells); player.cx = c % N; player.cy = (c / N) | 0; player.t = 0; }
    }

    /* ---------- bot AI ---------- */
    function botDecide(e) {
      const home = grid[idx(e.cx, e.cy)] === e.id;
      // attack nearby player trail
      if (player && player.alive && player.trail.length > 2 && Math.random() < stage.aggro) {
        let best = null, bd = 12;
        for (let k = 0; k < player.trail.length; k += 2) { const t = player.trail[k], d = Math.abs(t % N - e.cx) + Math.abs(((t / N) | 0) - e.cy); if (d < bd) { bd = d; best = t; } }
        if (best !== null) { e.plan = { tx: best % N, ty: (best / N) | 0, ret: false }; }
      }
      if (!e.plan) {
        if (home) {
          const len = K.randi(4, 8 + Math.floor(stage.aggro * 8));
          const d = K.randi(0, 3), d2 = (d + (Math.random() < 0.5 ? 1 : 3)) % 4;
          e.plan = { tx: K.clamp(e.cx + DIRS[d][0] * len + DIRS[d2][0] * len, 1, N - 2), ty: K.clamp(e.cy + DIRS[d][1] * len + DIRS[d2][1] * len, 1, N - 2), ret: false };
        } else e.plan = { ret: true };
      }
      if (e.trail.length > 26 + stage.aggro * 20) e.plan = { ret: true };
      let tx, ty;
      if (e.plan.ret) {
        // nearest own cell in bbox
        let bd = 1e9; const bb = e.bb;
        for (let y = bb[1]; y <= bb[3]; y += 1) for (let x = bb[0]; x <= bb[2]; x += 1) { if (grid[idx(x, y)] !== e.id) continue; const d = Math.abs(x - e.cx) + Math.abs(y - e.cy); if (d < bd) { bd = d; tx = x; ty = y; } }
        if (tx === undefined) { tx = e.cx; ty = e.cy; }
        if (home) e.plan = null;
      } else { tx = e.plan.tx; ty = e.plan.ty; if (e.cx === tx && e.cy === ty) e.plan = { ret: true }; }
      // choose best direction
      let best = e.dir, bs = -1e9;
      for (let d = 0; d < 4; d++) {
        if ((d + 2) % 4 === e.dir) continue;
        const nx = e.cx + DIRS[d][0], ny = e.cy + DIRS[d][1];
        let s = -(Math.abs(nx - tx) + Math.abs(ny - ty));
        if (!inb(nx, ny)) s -= 1000;
        else {
          if (trailMap[idx(nx, ny)] === e.id) s -= 1000;
          const nx2 = nx + DIRS[d][0], ny2 = ny + DIRS[d][1];
          if (inb(nx2, ny2) && trailMap[idx(nx2, ny2)] === e.id) s -= 30;
          if (player && player.alive && K.dist(nx, ny, player.cx, player.cy) < 2 && e.trail.length > 0) s -= 5;
        }
        s += Math.random() * 0.6;
        if (s > bs) { bs = s; best = d; }
      }
      e.next = best;
    }

    /* ---------- run flow ---------- */
    let cam = { x: 0, y: 0, z: 24 };
    const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });
    function startStage(i) {
      stageIdx = i; stage = stageCfg(i); N = stage.n;
      grid = new Uint8Array(N * N); trailMap = new Uint8Array(N * N); ents = []; cellCount = [];
      terr.width = N * CP; terr.height = N * CP; tctx.clearRect(0, 0, terr.width, terr.height);
      for (const k in pats) delete pats[k];
      player = makeEnt(COLORS[G.color].c, false, K.t(['You', 'Você']));
      player.speed = 7 + G.up.speed * 0.3;
      placeEnt(player, 2 + G.up.home);
      const used = new Set([player.col]);
      for (let b = 0; b < stage.bots; b++) {
        const col = BOTC.find((c) => !used.has(c)) || K.pick(BOTC); used.add(col);
        const e = makeEnt(col, true, 'Bot'); e.speed = stage.botSpeed; placeEnt(e, 2);
      }
      shield = G.up.shield; won = false; revived = false; runKills = 0; playing = true;
      cam.x = player.cx; cam.y = player.cy;
      K.game.start(); K.audio.play('power');
      menu.style.display = 'none'; hud.style.display = '';
      K.meta.setMenuButtonsVisible(false);
    }
    function pct() { return player ? (cellCount[player.id] / (N * N)) * 100 : 0; }
    function onPlayerDeath(by) {
      playing = false; K.game.stop();
      K.audio.play('lose'); K.fx.shake(16); K.fx.flash('#e63946', 0.4);
      setTimeout(() => endPanel(by), 900);
    }
    function endPanel(by) {
      K.meta.track('games', 1);
      const p = Math.max(snapshotPct, 0);
      const coins = Math.round((p * 6 + runKills * 15) * (1 + G.up.coin * 0.1));
      const body = `<p>${by ? K.t(['A rival crossed your line!', 'Um rival cruzou sua linha!']) : K.t(['You crossed your own line!', 'Você cruzou sua própria linha!'])}</p><div class="kit-row"><div class="grow">${K.t(['Land', 'Terra'])}</div><b>${p.toFixed(1)}%</b></div><div class="kit-row"><div class="grow">${K.t(['Goal', 'Meta'])}</div><b>${stage.target}%</b></div><div class="kit-big">${K.icon.coin} ${coins}</div>`;
      const pnl = K.ui.panel({ title: K.t('stage') + ' ' + (stageIdx + 1), body, closable: false });
      const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      let paid = false; const pay = (m) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } };
      if (!revived) pnl.foot.appendChild(K.ui.adBtn(K.t(['Revive with your land', 'Reviver com sua terra']), () => { pnl.close(); revive(); }));
      pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), (b) => { pay(2); b.remove(); }));
      pnl.foot.appendChild(K.ui.btn(K.t(['Retry', 'Tentar de novo']), '', () => { pay(1); pnl.close(); K.meta.showPending(() => K.ads.midgame().then(() => startStage(stageIdx))); }));
      pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pay(1); pnl.close(); showMenu(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    let snapshotPct = 0;
    function revive() {
      revived = true;
      const cells = snapshot ? snapshot.cells.filter((i) => !grid[i]) : [];
      cells.forEach((i) => setCell(i, player.id));
      if (cells.length) { const c = K.pick(cells); player.cx = c % N; player.cy = (c / N) | 0; player.bb = [0, 0, N - 1, N - 1]; }
      else placeEnt(player, 2);
      player.alive = true; player.trail = []; player.t = 0; paintCells(0, 0, N - 1, N - 1);
      playing = true; shield = Math.max(shield, 1); K.game.start(); K.audio.play('power');
    }
    function stageWin() {
      won = true; playing = false; K.game.stop(); K.game.happy(); K.audio.play('win'); K.fx.flash('#fff', 0.6);
      const stars = runKills >= 3 ? 3 : runKills >= 1 ? 2 : 1;
      G.stars[stageIdx] = Math.max(G.stars[stageIdx] || 0, stars);
      if (stageIdx === G.stage) G.stage = Math.min(39, G.stage + 1);
      K.meta.track('stages', 1); K.meta.addXp(25); K.save.mark();
      for (let i = 0; i < 6; i++) setTimeout(() => K.fx.burst(K.rand(0, W), K.rand(0, H / 2), { n: 30, colors: [player.col, '#f4a300', '#1d7ed6', '#fff'], speed: 380, shape: 'star', size: 8, life: 1.2 }), i * 120);
      const coins = Math.round((80 + stageIdx * 25 + runKills * 15) * (1 + G.up.coin * 0.1));
      setTimeout(() => {
        const body = `<div class="kit-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><p>${pct().toFixed(1)}% · ${runKills} ${K.t(['kills', 'abates'])}</p><div class="kit-big">${K.icon.coin} ${coins}</div>`;
        const pnl = K.ui.panel({ title: K.t(['Stage clear!', 'Fase completa!']), body, closable: false });
        const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        let paid = false; const go = (m) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } pnl.close(); K.meta.showPending(() => K.ads.midgame().then(() => startStage(G.stage))); };
        pnl.foot.appendChild(K.ui.adBtn(K.t('x3'), () => go(3)));
        pnl.foot.appendChild(K.ui.btn(K.t(['Next stage', 'Próxima fase']), '', () => go(1)));
        pnl.panel.appendChild(pnl.foot);
      }, 1000);
    }

    /* ---------- input ---------- */
    const setDir = (d) => { if (player && playing) player.next = d; };
    window.addEventListener('keydown', (e) => {
      const m = { ArrowRight: 0, KeyD: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2, ArrowUp: 3, KeyW: 3 }[e.code];
      if (m != null) { e.preventDefault(); setDir(m); }
    });
    let sx = 0, sy = 0, sid = null;
    cv.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
    window.addEventListener('pointermove', (e) => {
      if (sid !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.hypot(dx, dy) > 22) { setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3); sx = e.clientX; sy = e.clientY; }
    });
    window.addEventListener('pointerup', (e) => {
      if (sid !== e.pointerId) return; sid = null;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.hypot(dx, dy) < 12 && player && playing) {
        // tap: turn toward tap relative to the player
        const p = toScreen(player.cx + 0.5, player.cy + 0.5), tx = e.clientX - p.x, ty = e.clientY - p.y;
        const horiz = player.dir % 2 === 1;
        setDir(horiz ? (tx > 0 ? 0 : 2) : ty > 0 ? 1 : 3);
      }
    });

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Steer with arrows/WASD, swipe, or tap the side you want to turn to. Leave your land to draw a line and come back to capture everything inside. If anyone touches your line, you lose it all. Reach the goal % to clear the stage.', pt: 'Guie com setas/WASD, deslizando ou tocando no lado para onde quer virar. Saia da sua terra para desenhar uma linha e volte para capturar tudo dentro. Se alguém tocar sua linha, você perde. Chegue à meta % para passar de fase.' },
      missions: [
        { stat: 'cells', base: 800, reward: 80, text: { en: 'Capture {n} squares', pt: 'Capture {n} quadrados' } },
        { stat: 'kills', base: 3, reward: 100, text: { en: 'Cut {n} rival lines', pt: 'Corte {n} linhas rivais' } },
        { stat: 'stages', base: 2, reward: 120, text: { en: 'Clear {n} stages', pt: 'Complete {n} fases' } },
        { stat: 'pct', base: 25, type: 'max', cap: 60, reward: 100, text: { en: 'Own {n}% of a map', pt: 'Domine {n}% de um mapa' } },
        { stat: 'games', base: 3, reward: 50, text: { en: 'Play {n} rounds', pt: 'Jogue {n} rodadas' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'hud'); K.ui.root.appendChild(hud);
    hud.innerHTML = '<div class="stg"></div><div class="bar"><i></i><b class="goal"></b></div><div class="pc"></div>';
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    function showMenu() {
      playing = false; K.game.stop();
      hud.style.display = 'none'; menu.style.display = '';
      K.meta.setMenuButtonsVisible(true);
      menu.innerHTML = `<h1>Crayon<br><span>Lands</span></h1><p class="sub">${K.t('stage')} ${G.stage + 1} / 40</p>`;
      const play = K.ui.btn(K.t('play'), 'big', () => startStage(G.stage));
      play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.btn('🖍 ' + K.t(['Crayons', 'Gizes']), '', openColors));
      row.appendChild(K.ui.btn('⬆ ' + K.t('upgrade'), '', openUpgrades));
      row.appendChild(K.ui.btn('▦ ' + K.t(['Stages', 'Fases']), '', openStages));
      menu.appendChild(row);
      K.meta.showPending();
      if (!player) demo();
    }
    function demo() { startStage(0); playing = false; K.game.stop(); player.alive = false; hud.style.display = 'none'; menu.style.display = ''; K.meta.setMenuButtonsVisible(true); }
    function openStages() {
      const body = K.el('div', 'lvgrid');
      for (let i = 0; i < 40; i++) {
        const b = K.el('button', 'lv' + (i > G.stage ? ' lock' : '') + (i === G.stage ? ' cur' : ''), `<b>${i + 1}</b><small>${stageCfg(i).target}%</small><i>${'★'.repeat(G.stars[i] || 0)}</i>`);
        b.onclick = () => { if (i > G.stage) return K.audio.play('error'); pnl.close(); startStage(i); };
        body.appendChild(b);
      }
      const pnl = K.ui.panel({ title: K.t(['Stages', 'Fases']), body, cls: 'wide' });
    }
    function openColors() {
      const body = K.el('div', 'kit-grid');
      K.ui.panel({ title: K.t(['Crayons', 'Gizes']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        COLORS.forEach((c, i) => {
          const own = G.owned.includes(i);
          const cell = K.el('div', 'kit-cell' + (G.color === i ? ' on' : ''), `<div class="swatch" style="--c:${c.c}"></div><div>${K.t(c.n)}</div>`);
          cell.appendChild(own ? K.ui.btn(G.color === i ? '✓' : K.t('equip'), 'sm', () => { G.color = i; K.save.mark(); render(); })
            : c.gems ? K.ui.btn(K.icon.gem + ' ' + c.gems, 'sm', () => { if (K.meta.spendGems(c.gems)) { G.owned.push(i); G.color = i; K.save.mark(); render(); } })
              : K.ui.btn(K.icon.coin + ' ' + c.p, 'sm', () => { if (K.meta.spend(c.p)) { G.owned.push(i); G.color = i; K.save.mark(); render(); } }));
          body.appendChild(cell);
        });
      };
      render();
    }
    function openUpgrades() {
      const body = K.el('div');
      K.ui.panel({ title: K.t('upgrade'), body });
      const render = () => {
        body.innerHTML = '';
        UPG.forEach((u) => {
          const l = G.up[u.id], cost = Math.round(u.base * Math.pow(1.6, l));
          const row = K.el('div', 'kit-row', `<div class="grow"><b>${K.t(u.n)}</b><div class="kit-bar"><i style="width:${(100 * l) / u.max}%"></i></div></div>`);
          row.appendChild(l >= u.max ? K.el('b', '', K.t('max')) : K.ui.btn(K.icon.coin + ' ' + K.fmt(cost), 'sm', () => { if (K.meta.spend(cost)) { G.up[u.id]++; K.save.mark(); render(); } }));
          body.appendChild(row);
        });
      };
      render();
    }
    let hudAcc = 0;
    function updateHud(dt) {
      hudAcc += dt; if (hudAcc < 0.15 || !stage) return; hudAcc = 0;
      const p = pct();
      if (player && player.alive) snapshotPct = p;
      hud.querySelector('.stg').textContent = K.t('stage') + ' ' + (stageIdx + 1) + (shield ? ' · 🧽' + shield : '');
      hud.querySelector('.bar i').style.width = Math.min(100, (p / stage.target) * 100) + '%';
      hud.querySelector('.bar i').style.background = player ? player.col : '#e63946';
      hud.querySelector('.goal').textContent = stage.target + '%';
      hud.querySelector('.pc').textContent = p.toFixed(1) + '%';
      if (playing && !won && p >= stage.target) stageWin();
    }

    /* ---------- render ---------- */
    function drawAvatar(e, x, y, s, t) {
      const bob = Math.sin(t * 12 + e.id) * s * 0.06;
      ctx.save(); ctx.translate(x, y + bob);
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.5, s * 0.15, 0, 0, 6.283); ctx.fill();
      ctx.rotate(Math.sin(t * 10 + e.id) * 0.08);
      ctx.fillStyle = e.col; K.draw.rrect(ctx, -s * 0.5, -s * 0.5, s, s, s * 0.22); ctx.fill();
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; K.draw.rrect(ctx, -s * 0.38, -s * 0.4, s * 0.35, s * 0.18, s * 0.08); ctx.fill();
      const d = DIRS[e.dir];
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = Math.max(1.5, s * 0.05);
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(k * s * 0.18 + d[0] * s * 0.08, -s * 0.05 + d[1] * s * 0.06, s * 0.14, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(k * s * 0.18 + d[0] * s * 0.13, -s * 0.05 + d[1] * s * 0.1, s * 0.06, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; }
      ctx.restore();
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt;
      if (grid) {
        for (const e of ents) {
          if (e.alive && (playing || e.bot)) stepEnt(e, dt);
          else if (!e.alive && e.bot) { e.respawn -= dt; if (e.respawn <= 0) placeEnt(e, 2); }
        }
        // head-to-head
        for (const a of ents) for (const b of ents) {
          if (a === b || !a.alive || !b.alive || a.id > b.id) continue;
          const ax = a.cx + DIRS[a.dir][0] * a.t, ay = a.cy + DIRS[a.dir][1] * a.t, bx = b.cx + DIRS[b.dir][0] * b.t, by = b.cy + DIRS[b.dir][1] * b.t;
          if (Math.abs(ax - bx) < 0.7 && Math.abs(ay - by) < 0.7 && (a.trail.length || b.trail.length)) { const loser = a.trail.length >= b.trail.length ? a : b; killEnt(loser, loser === a ? b : a); }
        }
        const focus = player && (player.alive || !playing) ? player : null;
        if (focus) {
          const d = DIRS[focus.dir];
          cam.x = K.lerp(cam.x, focus.cx + 0.5 + d[0] * focus.t, Math.min(1, dt * 6)); cam.y = K.lerp(cam.y, focus.cy + 0.5 + d[1] * focus.t, Math.min(1, dt * 6));
        }
        cam.z = K.lerp(cam.z, Math.max(13, Math.min(W, H) / 32), dt * 3);
      }
      K.fx.update(dt); updateHud(dt);
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = '#d9d2c0'; ctx.fillRect(0, 0, W, H);
      if (!grid) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      const o = toScreen(0, 0), z = cam.z;
      ctx.save(); ctx.translate(o.x, o.y);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(6, 8, N * z, N * z);
      ctx.fillStyle = paperPat; ctx.fillRect(0, 0, N * z, N * z);
      ctx.strokeStyle = '#8a7f6a'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, N * z, N * z);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(terr, 0, 0, N * z, N * z);
      // trails
      for (const e of ents) {
        if (!e.alive || !e.trail.length) continue;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = e.col; ctx.globalAlpha = pass ? 0.9 : 0.35; ctx.lineWidth = z * (pass ? 0.42 : 0.7);
          ctx.beginPath();
          e.trail.forEach((t, k) => { const x = (t % N) + 0.5, y = ((t / N) | 0) + 0.5, j = pass ? Math.sin(k * 1.7) * 0.05 : 0; k ? ctx.lineTo((x + j) * z, (y - j) * z) : ctx.moveTo((x + j) * z, (y + j) * z); });
          const d = DIRS[e.dir]; ctx.lineTo((e.cx + 0.5 + d[0] * e.t) * z, (e.cy + 0.5 + d[1] * e.t) * z);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      for (const e of ents) if (e.alive) { const d = DIRS[e.dir]; drawAvatar(e, (e.cx + 0.5 + d[0] * e.t) * z, (e.cy + 0.5 + d[1] * e.t) * z, z * 1.1, tt); }
      if (playing && shield && player.alive) { const d = DIRS[player.dir]; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc((player.cx + 0.5 + d[0] * player.t) * z, (player.cy + 0.5 + d[1] * player.t) * z, z * 1.1, tt * 3, tt * 3 + 6.283); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
      K.fx.draw(ctx);
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
    });

    K.music.set({ bpm: 120, chords: [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74]], bass: true, arp: [1, 0, 1, 1, 0, 1, 1, 0], arpWave: 'square', lead: [72, 0, 74, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0], leadWave: 'triangle', drums: { k: [1, 0, 0, 1, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

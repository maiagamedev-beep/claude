/* Fruit Orchard — match-3 with specials, jelly, goals and 60 levels. Botanical watercolor style. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Palatino Linotype", Palatino, Georgia, serif';
  const N = 8;
  const FRUITS = [
    { n: 'cherry', c: '#d7263d', l: '#ff7b8a' }, { n: 'lemon', c: '#f4c20d', l: '#fff08a' }, { n: 'plum', c: '#7b3fa0', l: '#c79be6' },
    { n: 'leaf', c: '#3a9d4a', l: '#9be08a' }, { n: 'orange', c: '#f07f13', l: '#ffc27a' }, { n: 'berry', c: '#2f6fd6', l: '#8ab8ff' },
  ];
  const LEVELS = 60;
  function levelCfg(i) {
    const r = K.rng(i * 131 + 7);
    const kinds = i < 3 ? 5 : i < 25 ? 6 : 6;
    const goalType = i % 3 === 0 ? 'score' : i % 3 === 1 ? 'collect' : 'jelly';
    const moves = Math.max(16, 30 - Math.floor(i / 6));
    const holes = [];
    if (i >= 8 && i % 4 === 0) { const pat = Math.floor(r() * 3); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (pat === 0 && (x === 0 || x === N - 1) && (y === 0 || y === N - 1)) holes.push(y * N + x); if (pat === 1 && (x === 3 || x === 4) && (y === 3 || y === 4)) holes.push(y * N + x); if (pat === 2 && x === y && (x < 2 || x > 5)) holes.push(y * N + x); } }
    const jelly = [];
    if (goalType === 'jelly') { const n = 10 + Math.min(34, i); while (jelly.length < n) { const c = Math.floor(r() * N * N); if (!jelly.includes(c) && !holes.includes(c)) jelly.push(c); } }
    return { kinds, goalType, moves, holes, jelly, score: 2500 + i * 450, collect: { t: Math.floor(r() * kinds), n: 18 + i }, stars: [1, 1.5, 2] };
  }

  K.boot('fruit_orchard', { g: { lvl: 0, stars: {}, bo: { hammer: 2, shuffle: 1, bomb: 1 } } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, bx = 0, by = 0, cs = 50;
    function layout() { const size = Math.min(W - 20, H - 240, 600); cs = size / N; bx = (W - size) / 2; by = Math.max(130, (H - size) / 2 + 30); if (by + size > H - 90) by = H - 90 - size; }

    /* ---------- fruit painter ---------- */
    const cache = {};
    function fruitImg(t, sp) {
      const size = Math.round(cs * DPR), key = t + '_' + sp + '_' + size;
      if (cache[key]) return cache[key];
      const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), s = size, F = FRUITS[t];
      g.translate(s / 2, s / 2);
      const R = s * 0.36;
      if (sp === 'rainbow') {
        for (let i = 0; i < 6; i++) { g.fillStyle = FRUITS[i].c; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * 1.05, (i / 6) * 6.283, ((i + 1) / 6) * 6.283); g.fill(); }
        g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, R * 0.4, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = s * 0.03; g.beginPath(); g.arc(0, 0, R * 1.05, 0, 6.283); g.stroke();
        cache[key] = c; return c;
      }
      // watercolor wash: several translucent blobs
      const rr = K.rng(t * 17 + 3);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = F.c; g.globalAlpha = 0.35;
        g.beginPath();
        for (let a = 0; a <= 24; a++) { const an = (a / 24) * 6.283, rad = R * (0.92 + rr() * 0.12) * (F.n === 'lemon' ? (1 + Math.cos(an * 2) * 0.12) : F.n === 'leaf' ? (1 - Math.abs(Math.sin(an)) * 0.3) : 1); g.lineTo(Math.cos(an) * rad, Math.sin(an) * rad * (F.n === 'plum' ? 1.1 : 1)); }
        g.fill();
      }
      g.globalAlpha = 1;
      const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R);
      gr.addColorStop(0, F.l); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.fill();
      // details
      g.strokeStyle = 'rgba(50,35,20,.55)'; g.lineWidth = s * 0.025; g.lineCap = 'round';
      if (F.n === 'cherry' || F.n === 'plum' || F.n === 'orange') { g.beginPath(); g.moveTo(0, -R * 0.85); g.quadraticCurveTo(R * 0.1, -R * 1.2, R * 0.35, -R * 1.25); g.stroke(); g.fillStyle = '#3a9d4a'; g.beginPath(); g.ellipse(R * 0.3, -R * 1.05, R * 0.28, R * 0.12, -0.5, 0, 6.283); g.fill(); }
      if (F.n === 'leaf') { g.beginPath(); g.moveTo(-R * 0.7, 0); g.lineTo(R * 0.7, 0); for (let k = -2; k <= 2; k++) { g.moveTo(k * R * 0.25, 0); g.lineTo(k * R * 0.25 + R * 0.15, -R * 0.4); g.moveTo(k * R * 0.25, 0); g.lineTo(k * R * 0.25 + R * 0.15, R * 0.4); } g.stroke(); }
      if (F.n === 'berry') { g.fillStyle = 'rgba(20,40,90,.35)'; for (let k = 0; k < 7; k++) { const a = k * 0.9; g.beginPath(); g.arc(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.14, 0, 6.283); g.fill(); } }
      if (F.n === 'orange') { g.fillStyle = 'rgba(120,50,0,.25)'; for (let k = 0; k < 12; k++) { g.beginPath(); g.arc(Math.cos(k) * R * 0.6, Math.sin(k * 1.7) * R * 0.6, 1.2, 0, 6.283); g.fill(); } }
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-R * 0.35, -R * 0.35, R * 0.18, R * 0.1, -0.7, 0, 6.283); g.fill();
      if (sp === 'h' || sp === 'v') {
        g.save(); if (sp === 'v') g.rotate(Math.PI / 2);
        g.strokeStyle = '#fff'; g.lineWidth = s * 0.06; g.globalAlpha = 0.9;
        for (const yy of [-R * 0.35, 0, R * 0.35]) { g.beginPath(); g.moveTo(-R * 0.8, yy); g.lineTo(R * 0.8, yy); g.stroke(); }
        g.restore();
      }
      if (sp === 'bomb') { g.strokeStyle = '#fff'; g.lineWidth = s * 0.05; g.beginPath(); g.arc(0, 0, R * 0.55, 0, 6.283); g.stroke(); g.fillStyle = '#fff'; K.draw.star(g, 0, 0, R * 0.35, R * 0.15, 6); g.fill(); }
      cache[key] = c; return c;
    }

    /* ---------- board ---------- */
    let grid = [], jelly = [], holes = new Set(), L = null, lvIdx = 0, moves = 0, score = 0, collected = 0, busy = false, playing = false, combo = 0, sel = null, hint = null, idleT = 0, tool = null, revived = false, runCoins = 0;
    const idx = (x, y) => y * N + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !holes.has(idx(x, y));
    function rndType(x, y) {
      for (let k = 0; k < 20; k++) {
        const t = Math.floor(Math.random() * L.kinds);
        const h = x >= 2 && grid[idx(x - 1, y)] && grid[idx(x - 2, y)] && grid[idx(x - 1, y)].t === t && grid[idx(x - 2, y)].t === t;
        const v = y >= 2 && grid[idx(x, y - 1)] && grid[idx(x, y - 2)] && grid[idx(x, y - 1)].t === t && grid[idx(x, y - 2)].t === t;
        if (!h && !v) return t;
      }
      return Math.floor(Math.random() * L.kinds);
    }
    const piece = (t, x, y, fromY) => ({ t, sp: null, x, y: fromY != null ? fromY : y, s: 1, a: 1 });
    function startLevel(i) {
      lvIdx = i; L = levelCfg(i); holes = new Set(L.holes);
      grid = new Array(N * N).fill(null); jelly = new Array(N * N).fill(0);
      L.jelly.forEach((c) => (jelly[c] = 1));
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!holes.has(idx(x, y))) grid[idx(x, y)] = piece(rndType(x, y), x, y, y - N - 1);
      grid.forEach((p) => { if (p) K.tween(p, { y: p.y + N + 1 }, 0.5 + p.x * 0.03, 'outBounce'); });
      moves = L.moves; score = 0; collected = 0; busy = false; combo = 0; sel = null; tool = null; revived = false; runCoins = 0; playing = true; idleT = 0;
      K.std.hideMenu(); hud.style.display = bar.style.display = ''; K.game.start(); renderHud();
      if (!hasMoves()) shuffle();
    }

    /* ---------- matching ---------- */
    function findMatches() {
      const runs = [];
      for (let y = 0; y < N; y++) { let x = 0; while (x < N) { const p = grid[idx(x, y)]; if (!p || p.sp === 'rainbow') { x++; continue; } let e = x + 1; while (e < N && grid[idx(e, y)] && grid[idx(e, y)].sp !== 'rainbow' && grid[idx(e, y)].t === p.t) e++; if (e - x >= 3) runs.push({ dir: 'h', cells: Array.from({ length: e - x }, (_, k) => idx(x + k, y)), t: p.t }); x = e; } }
      for (let x = 0; x < N; x++) { let y = 0; while (y < N) { const p = grid[idx(x, y)]; if (!p || p.sp === 'rainbow') { y++; continue; } let e = y + 1; while (e < N && grid[idx(x, e)] && grid[idx(x, e)].sp !== 'rainbow' && grid[idx(x, e)].t === p.t) e++; if (e - y >= 3) runs.push({ dir: 'v', cells: Array.from({ length: e - y }, (_, k) => idx(x, y + k)), t: p.t }); y = e; } }
      return runs;
    }
    function hasMoves() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const p = grid[idx(x, y)]; if (!p) continue; if (p.sp === 'rainbow') return [idx(x, y), idx(x, y)];
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          if (!inb(x + dx, y + dy) || !grid[idx(x + dx, y + dy)]) continue;
          swapCells(idx(x, y), idx(x + dx, y + dy));
          const ok = findMatches().length > 0;
          swapCells(idx(x, y), idx(x + dx, y + dy));
          if (ok) return [idx(x, y), idx(x + dx, y + dy)];
        }
      }
      return null;
    }
    function swapCells(a, b) { const t = grid[a]; grid[a] = grid[b]; grid[b] = t; }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function trySwap(a, b) {
      if (busy || !playing) return;
      busy = true; hint = null; idleT = 0;
      const pa = grid[a], pb = grid[b];
      swapCells(a, b);
      K.tween(pa, { x: b % N, y: (b / N) | 0 }, 0.16, 'outQuad'); K.tween(pb, { x: a % N, y: (a / N) | 0 }, 0.16, 'outQuad');
      K.audio.play('swing', 1.4);
      await wait(170);
      // rainbow combos
      if (pa.sp === 'rainbow' || pb.sp === 'rainbow') {
        moves--; combo = 0;
        const rb = pa.sp === 'rainbow' ? pa : pb, other = rb === pa ? pb : pa, rbIdx = rb === pa ? b : a;
        const clear = new Set([rbIdx]);
        if (other.sp === 'rainbow') grid.forEach((p, i) => p && clear.add(i));
        else grid.forEach((p, i) => { if (p && p.t === other.t) { clear.add(i); if (other.sp === 'h' || other.sp === 'v') p.sp = Math.random() < 0.5 ? 'h' : 'v'; } });
        K.audio.play('power'); K.fx.shake(10); K.fx.flash('#fff', 0.4);
        await clearCells(clear, true);
        await settle();
        return endTurn();
      }
      const runs = findMatches();
      if (!runs.length) {
        swapCells(a, b);
        K.tween(pa, { x: a % N, y: (a / N) | 0 }, 0.16, 'outQuad'); K.tween(pb, { x: b % N, y: (b / N) | 0 }, 0.16, 'outQuad');
        K.audio.play('error'); await wait(170); busy = false; return;
      }
      moves--; combo = 0;
      await resolve(runs, [a, b]);
      await settle();
      endTurn();
    }
    async function resolve(runs, swapPos) {
      const clear = new Set(), create = [];
      // specials from run shapes
      const cellRuns = {};
      runs.forEach((r) => r.cells.forEach((c) => { (cellRuns[c] = cellRuns[c] || []).push(r); clear.add(c); }));
      const used = new Set();
      runs.forEach((r) => {
        if (used.has(r)) return;
        const inter = r.cells.find((c) => cellRuns[c].length > 1);
        const at = (swapPos && r.cells.find((c) => swapPos.includes(c))) ?? r.cells[Math.floor(r.cells.length / 2)];
        if (r.cells.length >= 5) create.push({ c: at, t: r.t, sp: 'rainbow' });
        else if (inter != null) { create.push({ c: inter, t: r.t, sp: 'bomb' }); cellRuns[inter].forEach((q) => used.add(q)); }
        else if (r.cells.length === 4) create.push({ c: at, t: r.t, sp: r.dir === 'h' ? 'v' : 'h' });
        used.add(r);
      });
      combo++;
      const gained = clear.size * 20 * combo;
      score += gained;
      const cx = [...clear].reduce((s, c) => s + (c % N), 0) / clear.size, cy = [...clear].reduce((s, c) => s + ((c / N) | 0), 0) / clear.size;
      K.fx.text(bx + (cx + 0.5) * cs, by + (cy + 0.5) * cs, '+' + gained, { color: '#fff', stroke: '#5a3d2b', size: 22 + combo * 3 });
      if (combo >= 3) { K.fx.text(W / 2, by - 20, [K.t(['Sweet!', 'Doce!']), K.t(['Juicy!', 'Suculento!']), K.t(['Delicious!', 'Delicioso!']), K.t(['Fruitastic!', 'Frutástico!'])][Math.min(3, combo - 3)], { color: '#f4c20d', stroke: '#5a3d2b', size: 38, life: 1.2 }); K.audio.play('combo'); K.fx.shake(4 + combo); }
      await clearCells(clear, false, create);
      create.forEach((cr) => { const p = piece(cr.t, cr.c % N, (cr.c / N) | 0); p.sp = cr.sp; p.s = 0; K.tween(p, { s: 1 }, 0.3, 'outBack'); grid[cr.c] = p; });
      if (create.length) K.audio.play('power');
    }
    async function clearCells(set, big, create) {
      // chain specials
      const queue = [...set], seen = new Set();
      while (queue.length) {
        const c = queue.pop(); if (seen.has(c)) continue; seen.add(c); set.add(c);
        const p = grid[c]; if (!p) continue;
        if (create && create.some((cr) => cr.c === c) && !p.sp) continue;
        const x = c % N, y = (c / N) | 0;
        if (p.sp === 'h') { for (let k = 0; k < N; k++) if (inb(k, y)) queue.push(idx(k, y)); beam(y, 'h'); }
        if (p.sp === 'v') { for (let k = 0; k < N; k++) if (inb(x, k)) queue.push(idx(x, k)); beam(x, 'v'); }
        if (p.sp === 'bomb') { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) queue.push(idx(x + dx, y + dy)); K.fx.shake(8); K.audio.play('explode', 1.2); }
        if (p.sp === 'rainbow' && !big) { const t = Math.floor(Math.random() * L.kinds); grid.forEach((q, i) => q && q.t === t && queue.push(i)); }
      }
      let i = 0;
      set.forEach((c) => {
        const p = grid[c]; if (!p) return;
        if (create && create.some((cr) => cr.c === c) && !p.sp) { grid[c] = null; }
        else grid[c] = null;
        if (L.goalType === 'collect' && p.t === L.collect.t) { collected++; }
        if (jelly[c]) { jelly[c] = 0; K.meta.track('jelly', 1); }
        K.meta.track('fruit', 1);
        const px = bx + (c % N + 0.5) * cs, py = by + (((c / N) | 0) + 0.5) * cs;
        K.fx.burst(px, py, { n: 7, colors: [FRUITS[p.t].c, FRUITS[p.t].l, '#fff'], speed: 220, g: 400, size: cs * 0.08, life: 0.5 });
        dying.push({ p, c, t: 0 });
        i++;
      });
      K.audio.play('pop', 0.9 + Math.min(0.8, combo * 0.1));
      await wait(160);
    }
    let beams = [];
    function beam(k, dir) { beams.push({ k, dir, t: 0.35 }); K.audio.play('laser'); }
    let dying = [];
    async function settle() {
      for (;;) {
        // gravity
        let moved = false;
        for (let x = 0; x < N; x++) {
          let write = N - 1;
          for (let y = N - 1; y >= 0; y--) {
            if (holes.has(idx(x, y))) { write = y - 1; continue; }
            const p = grid[idx(x, y)];
            if (p) { while (holes.has(idx(x, write))) write--; if (write !== y) { grid[idx(x, write)] = p; grid[idx(x, y)] = null; K.tween(p, { y: write }, 0.08 + (write - y) * 0.04, 'outBounce'); moved = true; } write--; }
          }
          let spawnY = -1;
          for (let y = N - 1; y >= 0; y--) if (!holes.has(idx(x, y)) && !grid[idx(x, y)]) {
            // refill only if column above is open to the top
            let open = true; for (let k = y - 1; k >= 0; k--) if (holes.has(idx(x, k))) { open = false; break; }
            if (!open) continue;
            const p = piece(Math.floor(Math.random() * L.kinds), x, y, spawnY--); grid[idx(x, y)] = p; K.tween(p, { y }, 0.15 + (y - p.y) * 0.035, 'outBounce'); moved = true;
          }
        }
        if (moved) await wait(260);
        const runs = findMatches();
        if (!runs.length) break;
        await resolve(runs, null);
      }
    }
    function goalDone() {
      if (L.goalType === 'score') return score >= L.score;
      if (L.goalType === 'collect') return collected >= L.collect.n;
      return jelly.every((j) => !j);
    }
    function endTurn() {
      busy = false; renderHud();
      if (goalDone()) return win();
      if (moves <= 0) return lose();
      if (!hasMoves()) shuffle();
    }
    function shuffle() {
      const ps = grid.filter(Boolean);
      for (let k = 0; k < 50; k++) {
        ps.sort(() => Math.random() - 0.5);
        let j = 0; grid = grid.map((p, i) => (holes.has(i) ? null : ps[j++]));
        if (!findMatches().length && hasMoves()) break;
      }
      grid.forEach((p, i) => { if (p) K.tween(p, { x: i % N, y: (i / N) | 0 }, 0.4, 'outBack'); });
      K.ui.toast(K.t(['Shuffling!', 'Embaralhando!'])); K.audio.play('whoosh');
    }
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(FRUITS.map((f) => f.c));
      // leftover moves become bonus points
      const left = moves;
      score += left * 150;
      const target = L.goalType === 'score' ? L.score : 3000 + lvIdx * 200;
      const stars = score >= target * 2 ? 3 : score >= target * 1.4 ? 2 : 1;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars);
      if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(20); K.save.mark();
      const coins = 40 + lvIdx * 6 + stars * 20 + left * 3;
      setTimeout(() => K.std.end({ win: true, title: K.t(['Level complete!', 'Fase completa!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t('score'), score], [K.t(['Moves left', 'Jogadas sobrando']), left]], coins, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 900);
    }
    function lose() {
      playing = false; K.audio.play('lose');
      setTimeout(() => K.std.end({ text: K.t(['Out of moves!', 'Acabaram as jogadas!']), rows: [[K.t('score'), score]], coins: 10 + Math.floor(score / 400), revive: revived ? null : () => { revived = true; moves += 5; playing = true; K.game.start(); renderHud(); }, reviveLabel: K.t(['+5 moves', '+5 jogadas']), restart: () => startLevel(lvIdx), menu: showMenu }), 600);
    }

    /* ---------- boosters ---------- */
    const BO = { hammer: { ic: '🔨', n: ['Hammer', 'Martelo'], p: 200 }, bomb: { ic: '💥', n: ['Bomb', 'Bomba'], p: 300 }, shuffle: { ic: '🔀', n: ['Shuffle', 'Embaralhar'], p: 150 } };
    function useBooster(k) {
      if (busy || !playing) return;
      if (G.bo[k] <= 0) {
        const pnl = K.ui.panel({ title: BO[k].ic + ' ' + K.t(BO[k].n), body: `<p>${K.t(['Get more boosters', 'Ganhe mais itens'])}</p>` });
        pnl.foot.appendChild(K.ui.adBtn('+1 ' + K.t('free'), () => { G.bo[k]++; K.save.mark(); renderHud(); pnl.close(); }));
        pnl.foot.appendChild(K.ui.btn('+3 · ' + K.icon.coin + ' ' + BO[k].p * 2, '', () => { if (K.meta.spend(BO[k].p * 2)) { G.bo[k] += 3; renderHud(); pnl.close(); } }));
        pnl.panel.appendChild(pnl.foot); return;
      }
      if (k === 'shuffle') { G.bo.shuffle--; shuffle(); K.meta.track('boosters', 1); renderHud(); return; }
      tool = tool === k ? null : k; renderHud();
      if (tool) K.ui.toast(K.t(['Tap a fruit', 'Toque numa fruta']));
    }
    async function applyTool(c) {
      const k = tool; tool = null; G.bo[k]--; K.meta.track('boosters', 1); busy = true; renderHud();
      const x = c % N, y = (c / N) | 0, set = new Set([c]);
      if (k === 'bomb') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) set.add(idx(x + dx, y + dy));
      K.fx.shake(8); K.audio.play('explode');
      combo = 1; await clearCells(set, false); await settle(); endTurn();
    }

    /* ---------- input ---------- */
    let down = null;
    const cellAt = (px, py) => { const x = Math.floor((px - bx) / cs), y = Math.floor((py - by) / cs); return inb(x, y) ? idx(x, y) : -1; };
    cv.addEventListener('pointerdown', (e) => {
      if (!playing || busy || K.ui.anyOpen()) return;
      const c = cellAt(e.clientX, e.clientY); if (c < 0 || !grid[c]) return;
      if (tool) return applyTool(c);
      down = { c, x: e.clientX, y: e.clientY };
      if (sel != null && sel !== c && Math.abs((sel % N) - (c % N)) + Math.abs(((sel / N) | 0) - ((c / N) | 0)) === 1) { const s = sel; sel = null; down = null; trySwap(s, c); return; }
      sel = c; K.audio.play('tap', 1.2); grid[c].s = 1.15; K.tween(grid[c], { s: 1 }, 0.2, 'outBack');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > cs * 0.35) {
        const x = down.c % N, y = (down.c / N) | 0;
        const [nx, ny] = Math.abs(dx) > Math.abs(dy) ? [x + Math.sign(dx), y] : [x, y + Math.sign(dy)];
        const c = down.c; down = null; sel = null;
        if (inb(nx, ny) && grid[idx(nx, ny)]) trySwap(c, idx(nx, ny));
      }
    });
    window.addEventListener('pointerup', () => (down = null));

    /* ---------- meta / HUD ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Swap neighbouring fruits to line up 3 or more. Match 4 for a striped fruit, L/T shapes for a bomb, 5 in a row for a rainbow. Reach the level goal before you run out of moves.', pt: 'Troque frutas vizinhas para alinhar 3 ou mais. 4 fazem uma fruta listrada, formatos L/T fazem uma bomba, 5 em linha fazem um arco-íris. Cumpra a meta antes de acabar as jogadas.' },
      missions: [
        { stat: 'fruit', base: 300, reward: 80, text: { en: 'Pop {n} fruits', pt: 'Estoure {n} frutas' } },
        { stat: 'levels', base: 3, reward: 110, text: { en: 'Clear {n} levels', pt: 'Complete {n} fases' } },
        { stat: 'jelly', base: 30, reward: 80, text: { en: 'Clear {n} jelly tiles', pt: 'Limpe {n} geleias' } },
        { stat: 'boosters', base: 2, reward: 70, text: { en: 'Use {n} boosters', pt: 'Use {n} itens' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'm3hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'm3bar'); K.ui.root.appendChild(bar);
    Object.keys(BO).forEach((k) => { const b = K.el('button', 'bo', `<span>${BO[k].ic}</span><small>${K.t(BO[k].n)}</small><i></i>`); b.dataset.k = k; b.onclick = (e) => { e.stopPropagation(); K.audio.play('click'); useBooster(k); }; bar.appendChild(b); });
    const home = K.el('button', 'bo', `<span>⌂</span><small>${K.t('menu')}</small>`); home.onclick = () => { K.audio.play('click'); showMenu(); }; bar.appendChild(home);
    function renderHud() {
      if (!L) return;
      let goal = '';
      if (L.goalType === 'score') goal = `${K.t(['Score', 'Pontos'])} ${Math.min(score, L.score)}/${L.score}`;
      else if (L.goalType === 'collect') goal = `<canvas class="gi" width="40" height="40"></canvas> ${Math.min(collected, L.collect.n)}/${L.collect.n}`;
      else goal = `${K.t(['Jelly', 'Geleia'])} ${jelly.filter(Boolean).length}`;
      hud.innerHTML = `<div class="c"><small>${K.t('level')}</small><b>${lvIdx + 1}</b></div><div class="c goal"><small>${K.t(['Goal', 'Meta'])}</small><b>${goal}</b></div><div class="c"><small>${K.t(['Moves', 'Jogadas'])}</small><b class="${moves <= 5 ? 'low' : ''}">${moves}</b></div>`;
      const gi = hud.querySelector('.gi'); if (gi) gi.getContext('2d').drawImage(fruitImg(L.collect.t, null), 0, 0, 40, 40);
      bar.querySelectorAll('.bo[data-k]').forEach((b) => { const n = G.bo[b.dataset.k]; b.querySelector('i').textContent = n > 0 ? n : '+'; b.classList.toggle('on', tool === b.dataset.k); });
      hud.style.top = Math.max(56, by - 78) + 'px'; bar.style.top = by + N * cs + 12 + 'px';
    }
    function showMenu() {
      playing = false; hud.style.display = bar.style.display = 'none';
      K.std.menu({
        title: 'Fruit<span>Orchard</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => startLevel(G.lvl),
        buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); startLevel(i); }))],
      });
      if (!L) { L = levelCfg(G.lvl); holes = new Set(L.holes); jelly = new Array(N * N).fill(0); grid = new Array(N * N).fill(null); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!holes.has(idx(x, y))) grid[idx(x, y)] = piece(rndType(x, y), x, y); }
    }

    /* ---------- render ---------- */
    let tt = 0;
    const paper = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f7efdc'; g.fillRect(0, 0, 256, 256); const r = K.rng(4); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${150 + r() * 60},${170 + r() * 40},${120 + r() * 40},.06)`; g.beginPath(); g.arc(r() * 256, r() * 256, 20 + r() * 50, 0, 6.283); g.fill(); } return c; })();
    const paperPat = ctx.createPattern(paper, 'repeat');
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      dying.forEach((d) => (d.t += dt)); dying = dying.filter((d) => d.t < 0.2);
      beams.forEach((b) => (b.t -= dt)); beams = beams.filter((b) => b.t > 0);
      if (playing && !busy) { idleT += dt; if (idleT > 5 && !hint) hint = hasMoves(); }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = paperPat; ctx.fillRect(0, 0, W, H);
      // hanging leaves decoration
      ctx.fillStyle = 'rgba(58,157,74,.18)';
      for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate((i / 12) * W + 20, 10 + Math.sin(tt + i) * 4); ctx.rotate(0.6 + Math.sin(i) * 0.4); ctx.beginPath(); ctx.ellipse(0, 20, 14, 34, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      if (!L) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // board: wooden crate with soft cells
      ctx.fillStyle = 'rgba(90,61,43,.25)'; K.draw.rrect(ctx, bx - 8, by - 4, N * cs + 16, N * cs + 20, 18); ctx.fill();
      ctx.fillStyle = '#b9895b'; K.draw.rrect(ctx, bx - 8, by - 8, N * cs + 16, N * cs + 16, 18); ctx.fill();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (holes.has(idx(x, y))) continue;
        ctx.fillStyle = (x + y) % 2 ? '#f3e6c9' : '#ead9b6'; ctx.fillRect(bx + x * cs, by + y * cs, cs, cs);
        if (jelly[idx(x, y)]) { ctx.fillStyle = 'rgba(255,120,170,.45)'; K.draw.rrect(ctx, bx + x * cs + 3, by + y * cs + 3, cs - 6, cs - 6, 8); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke(); }
      }
      ctx.save(); ctx.beginPath(); ctx.rect(bx, by, N * cs, N * cs); ctx.clip();
      for (let i = 0; i < N * N; i++) {
        const p = grid[i]; if (!p) continue;
        let s = p.s;
        if (hint && hint.includes(i)) s *= 1 + Math.sin(tt * 10) * 0.08;
        const px = bx + (p.x + 0.5) * cs, py = by + (p.y + 0.5) * cs;
        ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
        if (sel === i) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(0, 0, cs * 0.48, 0, 6.283); ctx.fill(); }
        if (p.sp) ctx.rotate(Math.sin(tt * 3 + i) * 0.08);
        ctx.drawImage(fruitImg(p.t, p.sp), -cs / 2, -cs / 2, cs, cs);
        ctx.restore();
      }
      for (const d of dying) { const k = d.t / 0.2, px = bx + ((d.c % N) + 0.5) * cs, py = by + (((d.c / N) | 0) + 0.5) * cs; ctx.globalAlpha = 1 - k; ctx.save(); ctx.translate(px, py); ctx.scale(1 + k * 0.6, 1 + k * 0.6); ctx.drawImage(fruitImg(d.p.t, null), -cs / 2, -cs / 2, cs, cs); ctx.restore(); ctx.globalAlpha = 1; }
      ctx.restore();
      for (const b of beams) { ctx.globalAlpha = b.t / 0.35; ctx.fillStyle = '#fff'; if (b.dir === 'h') ctx.fillRect(bx, by + (b.k + 0.35) * cs, N * cs, cs * 0.3); else ctx.fillRect(bx + (b.k + 0.35) * cs, by, cs * 0.3, N * cs); ctx.globalAlpha = 1; }
      if (tool) { ctx.strokeStyle = '#d7263d'; ctx.lineWidth = 3 + Math.sin(tt * 8) * 1.5; K.draw.rrect(ctx, bx - 4, by - 4, N * cs + 8, N * cs + 8, 14); ctx.stroke(); }
      K.fx.draw(ctx);
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
    });

    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); if (L) renderHud(); for (const k in cache) delete cache[k]; });
    K.music.set({ bpm: 96, chords: [[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]], bass: true, pad: true, arp: [1, 0, 1, 0, 1, 0, 1, 0], arpWave: 'triangle', lead: [77, 0, 76, 0, 72, 0, 0, 0, 74, 0, 72, 0, 69, 0, 0, 0], leadWave: 'sine' });
    K.debug = { hint: () => hasMoves(), swap: (a, b) => trySwap(a, b), state: () => ({ busy, playing, moves, score, lvIdx }) };
    showMenu();
  }
})();

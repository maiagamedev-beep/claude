/* Sudoku Garden — generated puzzles with unique solutions, notes, hints, mistakes, daily puzzle. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  const DIFF = [{ n: ['Easy', 'Fácil'], holes: 38, c: 30 }, { n: ['Medium', 'Médio'], holes: 46, c: 60 }, { n: ['Hard', 'Difícil'], holes: 52, c: 100 }, { n: ['Expert', 'Especialista'], holes: 57, c: 160 }];

  K.boot('sudoku_garden', { g: { solved: [0, 0, 0, 0], best: [0, 0, 0, 0], daily: -1, hints: 3, cur: null, flowers: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, bx = 0, by = 0, cs = 40;
    function layout() { const size = Math.min(W - 20, H - 250, 560); cs = size / 9; bx = (W - size) / 2; by = 110; pad.style.top = by + size + 12 + 'px'; pad.style.width = Math.min(W - 20, 560) + 'px'; }

    /* ---------- generator ---------- */
    function solve(b, count) {
      let sol = 0;
      const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
      for (let i = 0; i < 81; i++) if (b[i]) { const v = 1 << b[i]; rows[(i / 9) | 0] |= v; cols[i % 9] |= v; boxes[(((i / 27) | 0) * 3) + (((i % 9) / 3) | 0)] |= v; }
      const rec = () => {
        let best = -1, bm = 0, bc = 10;
        for (let i = 0; i < 81; i++) if (!b[i]) { const r = (i / 9) | 0, c = i % 9, x = ((r / 3) | 0) * 3 + ((c / 3) | 0); const m = ~(rows[r] | cols[c] | boxes[x]) & 0x3fe; let n = 0; for (let v = m; v; v &= v - 1) n++; if (n < bc) { bc = n; best = i; bm = m; if (n === 0) return; } }
        if (best < 0) { sol++; return; }
        const r = (best / 9) | 0, c = best % 9, x = ((r / 3) | 0) * 3 + ((c / 3) | 0);
        const vals = []; for (let v = 1; v <= 9; v++) if (bm & (1 << v)) vals.push(v);
        if (count === 'rand') vals.sort(() => Math.random() - 0.5);
        for (const v of vals) { b[best] = v; rows[r] |= 1 << v; cols[c] |= 1 << v; boxes[x] |= 1 << v; rec(); if (sol && count === 'rand') return; if (sol > 1) return; rows[r] &= ~(1 << v); cols[c] &= ~(1 << v); boxes[x] &= ~(1 << v); b[best] = 0; }
      };
      rec(); return sol;
    }
    function generate(d, seed) {
      const rnd = seed != null ? K.rng(seed) : Math.random;
      const full = new Array(81).fill(0);
      const old = Math.random; if (seed != null) Math.random = rnd; solve(full, 'rand'); Math.random = old;
      const puzzle = full.slice(), order = [...Array(81).keys()].sort(() => rnd() - 0.5);
      let removed = 0;
      for (const i of order) { if (removed >= DIFF[d].holes) break; const v = puzzle[i]; puzzle[i] = 0; const t = puzzle.slice(); if (solve(t, 'count') !== 1) puzzle[i] = v; else removed++; }
      return { puzzle, sol: full };
    }

    /* ---------- state ---------- */
    let S = null, sel = -1, notesMode = false, playing = false, flash = [], mode = 0, daily = false;
    const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    function start(d, isDaily) {
      mode = d; daily = !!isDaily;
      const g = generate(d, isDaily ? today() * 7 + 1 : null);
      S = { d, puzzle: g.puzzle, sol: g.sol, val: g.puzzle.slice(), notes: new Array(81).fill(0), mistakes: 0, time: 0, daily: !!isDaily, hist: [] };
      begin();
    }
    function begin() { sel = -1; notesMode = false; playing = true; K.std.hideMenu(); hud.style.display = pad.style.display = ''; K.game.start(); renderPad(); G.cur = S; K.save.mark(); }
    const peers = (i) => { const r = (i / 9) | 0, c = i % 9, out = []; for (let k = 0; k < 81; k++) { const r2 = (k / 9) | 0, c2 = k % 9; if (k !== i && (r2 === r || c2 === c || (((r2 / 3) | 0) === ((r / 3) | 0) && ((c2 / 3) | 0) === ((c / 3) | 0)))) out.push(k); } return out; };
    function input(v) {
      if (!playing || sel < 0 || S.puzzle[sel]) return;
      if (notesMode && v) { S.hist.push([sel, S.val[sel], S.notes[sel]]); S.notes[sel] ^= 1 << v; K.audio.play('tick', 1.5); save(); return; }
      if (S.val[sel] === v) return;
      S.hist.push([sel, S.val[sel], S.notes[sel]]);
      S.val[sel] = v; S.notes[sel] = 0;
      if (!v) { K.audio.play('click'); save(); return; }
      if (v !== S.sol[sel]) {
        S.mistakes++; K.audio.play('error'); K.fx.shake(6); wrong = { i: sel, t: 0.6 };
        if (S.mistakes >= 3) return lose();
      } else {
        peers(sel).forEach((p) => (S.notes[p] &= ~(1 << v)));
        K.audio.play('pop', 0.9 + v * 0.05); K.meta.track('cells', 1);
        const px = bx + (sel % 9 + 0.5) * cs, py = by + (((sel / 9) | 0) + 0.5) * cs;
        K.fx.burst(px, py, { n: 6, colors: ['#f7a8b8', '#ffd6a5', '#caffbf'], speed: 120, g: 0, shape: 'star', size: 4, life: 0.5 });
        // completed units bloom
        const r = (sel / 9) | 0, c = sel % 9, bxI = ((r / 3) | 0) * 3 + ((c / 3) | 0);
        const units = [[...Array(9)].map((_, k) => r * 9 + k), [...Array(9)].map((_, k) => k * 9 + c), [...Array(9)].map((_, k) => (((bxI / 3) | 0) * 3 + ((k / 3) | 0)) * 9 + (bxI % 3) * 3 + (k % 3))];
        units.forEach((u) => { if (u.every((k) => S.val[k] === S.sol[k])) { u.forEach((k, j) => flash.push({ k, t: -j * 0.04 })); K.audio.play('combo'); } });
        if (S.val.every((x, k) => x === S.sol[k])) return win();
      }
      save();
    }
    let wrong = null;
    const save = () => { G.cur = S; K.save.mark(); };
    function undo() { const h = S.hist.pop(); if (!h) return; S.val[h[0]] = h[1]; S.notes[h[0]] = h[2]; sel = h[0]; K.audio.play('whoosh'); save(); }
    function hint() {
      if (!playing) return;
      if (G.hints <= 0) { const p = K.ui.panel({ title: '💡', body: `<p>${K.t(['Out of hints', 'Sem dicas'])}</p>` }); p.foot.appendChild(K.ui.adBtn('+2 ' + K.t('free'), () => { G.hints += 2; K.save.mark(); p.close(); renderPad(); })); p.foot.appendChild(K.ui.btn('+3 · ' + K.icon.coin + ' 200', '', () => { if (K.meta.spend(200)) { G.hints += 3; p.close(); renderPad(); } })); p.panel.appendChild(p.foot); return; }
      let i = sel >= 0 && !S.puzzle[sel] && S.val[sel] !== S.sol[sel] ? sel : -1;
      if (i < 0) { const empty = []; for (let k = 0; k < 81; k++) if (S.val[k] !== S.sol[k]) empty.push(k); if (!empty.length) return; i = K.pick(empty); }
      G.hints--; sel = i; notesMode = false; input(S.sol[i]); K.audio.play('power'); renderPad();
    }
    function win() {
      playing = false; G.cur = null; K.game.stop();
      G.solved[mode]++; const t = Math.floor(S.time); const nb = !G.best[mode] || t < G.best[mode]; if (nb) G.best[mode] = t;
      if (S.daily) { G.daily = today(); K.meta.addGems(3); }
      G.flowers++; K.meta.track('solved', 1); K.meta.addXp(20 + mode * 10); K.save.mark();
      K.audio.play('win'); for (let k = 0; k < 81; k++) flash.push({ k, t: -((k % 9) + ((k / 9) | 0)) * 0.05 });
      K.std.confetti(['#f7a8b8', '#ffd6a5', '#caffbf', '#9bf6ff']);
      setTimeout(() => K.std.end({ win: true, newBest: nb, title: K.t(['Solved!', 'Resolvido!']), rows: [[K.t(DIFF[mode].n), K.fmtTime(t)], [K.t(['Mistakes', 'Erros']), S.mistakes + '/3']], coins: DIFF[mode].c + (S.daily ? 100 : 0), mult: 3, next: { label: K.t(['New puzzle', 'Novo desafio']), fn: () => start(mode) }, menu: showMenu }), 1500);
    }
    function lose() {
      playing = false; K.audio.play('lose');
      setTimeout(() => K.std.end({ text: K.t(['3 mistakes — the garden wilted!', '3 erros — o jardim murchou!']), coins: 5, revive: () => { S.mistakes = 2; playing = true; K.game.start(); }, reviveLabel: K.t(['Keep playing', 'Continuar jogando']), restart: () => start(mode), menu: () => { G.cur = null; showMenu(); } }), 500);
    }

    /* ---------- input ---------- */
    cv.addEventListener('pointerdown', (e) => { if (!playing) return; const c = Math.floor((e.clientX - bx) / cs), r = Math.floor((e.clientY - by) / cs); if (c >= 0 && r >= 0 && c < 9 && r < 9) { sel = r * 9 + c; K.audio.play('tap', 1.4); } });
    window.addEventListener('keydown', (e) => {
      if (!playing) return;
      const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) input(n);
      if (e.code === 'Backspace' || e.code === 'Delete' || e.key === '0') input(0);
      if (e.code === 'KeyN') { notesMode = !notesMode; renderPad(); }
      if (e.code === 'KeyZ') undo();
      const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.code];
      if (mv) { e.preventDefault(); sel = sel < 0 ? 40 : Math.max(0, Math.min(80, sel + mv)); }
    });

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Fill every row, column and 3×3 box with the numbers 1 to 9 without repeating. Tap a cell, then a number. Use notes (N) for candidates, Z to undo. Three mistakes and the round ends.', pt: 'Preencha cada linha, coluna e quadrado 3×3 com os números de 1 a 9 sem repetir. Toque numa casa e depois num número. Use anotações (N), Z desfaz. Três erros e a rodada acaba.' },
      missions: [{ stat: 'solved', base: 1, reward: 150, text: { en: 'Solve {n} puzzle(s)', pt: 'Resolva {n} desafio(s)' } }, { stat: 'cells', base: 120, reward: 70, text: { en: 'Fill {n} correct cells', pt: 'Preencha {n} casas certas' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const pad = K.el('div', 'sgpad'); K.ui.root.appendChild(pad);
    function renderPad() {
      pad.innerHTML = '';
      const nums = K.el('div', 'nums');
      for (let v = 1; v <= 9; v++) {
        const left = S ? 9 - S.val.filter((x, k) => x === v && x === S.sol[k]).length : 9;
        const b = K.el('button', 'n' + (left <= 0 ? ' done' : ''), `${v}<small>${left > 0 ? left : '✓'}</small>`); b.onclick = () => { input(v); renderPad(); }; nums.appendChild(b);
      }
      pad.appendChild(nums);
      const tools = K.el('div', 'tools');
      [['↶', K.t(['Undo', 'Desfazer']), () => { undo(); renderPad(); }], ['⌫', K.t(['Erase', 'Apagar']), () => { input(0); renderPad(); }], ['✎', K.t(['Notes', 'Notas']) + (notesMode ? ' ON' : ''), () => { notesMode = !notesMode; renderPad(); }], ['💡', K.t(['Hint', 'Dica']) + ' ' + G.hints, hint], ['⌂', K.t('menu'), showMenu]].forEach(([ic, lb, fn]) => { const b = K.el('button', 't' + (ic === '✎' && notesMode ? ' on' : ''), `<span>${ic}</span><small>${lb}</small>`); b.onclick = () => { K.audio.play('click'); fn(); }; tools.appendChild(b); });
      pad.appendChild(tools);
    }
    function showMenu() {
      playing = false; hud.style.display = pad.style.display = 'none';
      const btns = DIFF.map((d, i) => K.ui.btn(K.t(d.n) + (G.solved[i] ? ` · ${G.solved[i]}` : ''), i === 0 ? '' : '', () => { K.std.hideMenu(); start(i); }));
      const dailyDone = G.daily === today();
      btns.unshift(K.ui.btn('📅 ' + K.t(['Daily puzzle', 'Desafio do dia']) + (dailyDone ? ' ✓' : ' +' + '💎3'), '', () => { if (dailyDone) return K.ui.toast(K.t(['Come back tomorrow!', 'Volte amanhã!'])); K.std.hideMenu(); start(1, true); }));
      K.std.menu({ title: 'Sudoku<span>Garden</span>', sub: '🌸 ' + G.flowers, playLabel: G.cur ? K.t('continue') : K.t('play'), onPlay: () => { if (G.cur) { S = G.cur; mode = S.d; begin(); } else start(0); }, buttons: btns });
    }

    /* ---------- render ---------- */
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt); if (playing) S.time += dt;
      flash.forEach((f) => (f.t += dt)); flash = flash.filter((f) => f.t < 0.6); if (wrong) { wrong.t -= dt; if (wrong.t <= 0) wrong = null; }
      if (playing) hud.innerHTML = `<span class="chip">${K.t(DIFF[S.d].n)}${S.daily ? ' 📅' : ''}</span><span class="chip">⏱ ${K.fmtTime(S.time)}</span><span class="chip">${'✿'.repeat(3 - S.mistakes)}${'·'.repeat(S.mistakes)}</span>`;
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#fdf6ec'); gr.addColorStop(1, '#f1e4f3'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // pressed flowers decoration
      for (let i = 0; i < 10; i++) { const x = ((i * 373) % 1000) / 1000 * W, y = ((i * 619) % 1000) / 1000 * H; ctx.save(); ctx.translate(x, y); ctx.rotate(i + tt * 0.05); ctx.globalAlpha = 0.18; for (let p = 0; p < 5; p++) { ctx.rotate(1.2566); ctx.fillStyle = ['#f7a8b8', '#ffd6a5', '#bdb2ff'][i % 3]; ctx.beginPath(); ctx.ellipse(0, -14, 8, 14, 0, 0, 6.283); ctx.fill(); } ctx.restore(); }
      ctx.globalAlpha = 1;
      if (!S) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      ctx.fillStyle = 'rgba(120,80,120,.15)'; K.draw.rrect(ctx, bx - 6, by - 2, cs * 9 + 12, cs * 9 + 12, 16); ctx.fill();
      ctx.fillStyle = '#fffdf8'; K.draw.rrect(ctx, bx - 6, by - 6, cs * 9 + 12, cs * 9 + 12, 16); ctx.fill();
      const sv = sel >= 0 ? S.val[sel] : 0, sr = (sel / 9) | 0, sc = sel % 9;
      for (let i = 0; i < 81; i++) {
        const r = (i / 9) | 0, c = i % 9, x = bx + c * cs, y = by + r * cs;
        let bg = null;
        if (sel >= 0 && (r === sr || c === sc || (((r / 3) | 0) === ((sr / 3) | 0) && ((c / 3) | 0) === ((sc / 3) | 0)))) bg = '#f3eaf7';
        if (sv && S.val[i] === sv) bg = '#e3d4f0';
        if (i === sel) bg = '#cdb4e8';
        if (bg) { ctx.fillStyle = bg; ctx.fillRect(x, y, cs, cs); }
        const f = flash.find((q) => q.k === i && q.t > 0); if (f) { ctx.fillStyle = `rgba(255,214,165,${1 - f.t / 0.6})`; ctx.fillRect(x, y, cs, cs); }
        if (wrong && wrong.i === i) { ctx.fillStyle = `rgba(255,90,110,${wrong.t})`; ctx.fillRect(x, y, cs, cs); }
        const v = S.val[i];
        if (v) { ctx.font = `${S.puzzle[i] ? 700 : 500} ${cs * 0.58}px "Avenir Next","Segoe UI",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = S.puzzle[i] ? '#3d2c4f' : v === S.sol[i] ? '#7b4fb0' : '#e0455e'; ctx.fillText(v, x + cs / 2, y + cs / 2 + 1); }
        else if (S.notes[i]) { ctx.font = `600 ${cs * 0.24}px sans-serif`; ctx.fillStyle = '#8f7aa8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let n = 1; n <= 9; n++) if (S.notes[i] & (1 << n)) ctx.fillText(n, x + (((n - 1) % 3) + 0.5) * cs / 3, y + (((n - 1) / 3 | 0) + 0.5) * cs / 3); }
      }
      for (let k = 0; k <= 9; k++) { ctx.strokeStyle = k % 3 ? 'rgba(61,44,79,.15)' : '#6d5a86'; ctx.lineWidth = k % 3 ? 1 : 2.5; ctx.beginPath(); ctx.moveTo(bx + k * cs, by); ctx.lineTo(bx + k * cs, by + cs * 9); ctx.moveTo(bx, by + k * cs); ctx.lineTo(bx + cs * 9, by + k * cs); ctx.stroke(); }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); });
    K.music.set({ bpm: 66, chords: [[65, 69, 72, 76], [62, 65, 69, 72], [67, 71, 74, 77], [64, 67, 71, 74]], pad: true, padWave: 'sine', lead: [81, 0, 0, 0, 79, 0, 76, 0, 0, 0, 0, 0, 74, 0, 0, 0], leadWave: 'sine' });
    showMenu();
  }
})();

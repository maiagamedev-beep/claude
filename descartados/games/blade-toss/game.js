/* Blade Toss — throw blades into a spinning log without hitting the ones already stuck. Boss logs every 5 stages. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const BLADES = [
    { n: ['Kitchen', 'Cozinha'], blade: '#d8dee9', handle: '#5e3b1f', p: 0 }, { n: ['Hunter', 'Caçador'], blade: '#c0c6cf', handle: '#2e7d32', p: 250 },
    { n: ['Ruby', 'Rubi'], blade: '#ff4d6d', handle: '#3b0a14', p: 500 }, { n: ['Gold', 'Ouro'], blade: '#ffd166', handle: '#7a4f00', p: 900 },
    { n: ['Ice', 'Gelo'], blade: '#a8e6ff', handle: '#1d4e89', p: 1200 }, { n: ['Shadow', 'Sombra'], blade: '#2b2d42', handle: '#8d99ae', p: 1600 },
    { n: ['Candy', 'Doce'], blade: '#ff8fd8', handle: '#ffffff', p: 2000 }, { n: ['Laser', 'Laser'], blade: '#39ff14', handle: '#111', gems: 30 },
    { n: ['Dragon', 'Dragão'], blade: '#ff7b00', handle: '#5a0000', gems: 50 },
  ];
  const BOSSES = [
    { n: ['Cheese Wheel', 'Roda de Queijo'], c: '#ffd166', d: '#e0a526' }, { n: ['Orange Slice', 'Fatia de Laranja'], c: '#ff9f1c', d: '#ffbf69' },
    { n: ['Donut', 'Rosquinha'], c: '#f4a3c4', d: '#c97b52' }, { n: ['Watermelon', 'Melancia'], c: '#ff5d73', d: '#38b000' }, { n: ['Pizza', 'Pizza'], c: '#ffcf56', d: '#d7263d' },
  ];

  K.boot('blade_toss', { g: { stage: 0, best: 0, blade: 0, blades: [0], apples: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, R = 100, cx = 0, cy = 0;
    let stage = 0, stuck = [], apples = [], toThrow = 0, flying = [], rot = 0, spin = 0, spinT = 0, pattern = 0, playing = false, hitT = 0, broken = null, revived = false, runApples = 0, shake = 0;
    const isBoss = () => stage % 5 === 4;
    function setupStage() {
      const r = K.rng(stage * 13 + 1);
      toThrow = Math.min(12, 5 + Math.floor(stage / 2)) + (isBoss() ? 2 : 0);
      stuck = []; apples = []; flying = []; broken = null; hitT = 0;
      const pre = Math.min(4, Math.floor(stage / 3));
      for (let k = 0; k < pre; k++) stuck.push({ a: r() * 6.283, pre: true });
      const na = r() < 0.6 ? 1 + (r() < 0.3 ? 1 : 0) : 0;
      for (let k = 0; k < na; k++) { let a; do a = r() * 6.283; while (stuck.some((s) => Math.abs(angDiff(s.a, a)) < 0.4)); apples.push({ a }); }
      pattern = isBoss() ? 3 : stage < 3 ? 0 : stage % 3; spinT = 0;
      K.fx.text(W / 2, H * 0.25, isBoss() ? K.t(['BOSS: ', 'CHEFE: ']) + K.t(BOSSES[Math.floor(stage / 5) % BOSSES.length].n) : K.t('stage') + ' ' + (stage + 1), { color: isBoss() ? '#ff4d6d' : '#fff', stroke: '#1b1b2f', size: 34, life: 1.6 });
      if (isBoss()) K.audio.play('explode', 0.6);
    }
    function startRun(from) { stage = from || 0; revived = false; runApples = 0; setupStage(); playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    const angDiff = (a, b) => { let d = (a - b) % 6.283; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; return d; };
    function spinSpeed(dt) {
      spinT += dt;
      switch (pattern) {
        case 0: return 1.8;
        case 1: return 2.2 * Math.sin(spinT * 0.9) + (Math.sin(spinT * 0.9) > 0 ? 0.6 : -0.6);
        case 2: return (Math.floor(spinT / 1.6) % 2 ? -1 : 1) * (1.5 + (spinT % 1.6) * 1.2);
        default: return 2.8 * Math.sin(spinT * 1.3) + 1.2 * Math.sin(spinT * 3.1);
      }
    }
    function throwBlade() {
      if (!playing || K.ui.anyOpen() || toThrow <= 0 || flying.length || broken) return;
      flying.push({ y: H - 130, v: 2600 }); toThrow--; K.audio.play('whoosh', 1.4);
    }
    function land() {
      const a = (Math.PI / 2 - rot) % 6.283; // blade hits the bottom of the log
      if (stuck.some((s) => Math.abs(angDiff(s.a, a)) < 0.16)) return fail();
      stuck.push({ a, wob: 1 }); hitT = 0.12; K.audio.play('thud', 1.2 + Math.random() * 0.2); K.fx.shake(3);
      K.fx.burst(cx, cy + R, { n: 8, colors: isBoss() ? [BOSSES[Math.floor(stage / 5) % BOSSES.length].d, '#fff'] : ['#c8935a', '#8a5a2b'], speed: 200, g: 500, shape: 'square', size: 4, life: 0.5 });
      K.meta.track('blades', 1);
      const ap = apples.findIndex((p) => Math.abs(angDiff(p.a, a)) < 0.22);
      if (ap >= 0) { apples.splice(ap, 1); G.apples++; runApples++; K.audio.play('coin', 1.3); K.fx.text(cx, cy - R - 20, '+🍎', { color: '#ff4d6d', stroke: '#fff', size: 30 }); K.fx.burst(cx, cy + R, { n: 16, colors: ['#ff4d6d', '#fff', '#8ac926'], speed: 300, size: 6 }); K.meta.track('apples', 1); }
      if (toThrow <= 0) breakLog();
    }
    function breakLog() {
      broken = { t: 0, parts: [0, 1, 2, 3].map((k) => ({ a: (k / 4) * 6.283, vx: Math.cos(k * 1.57 + 0.7) * 300, vy: -300 - Math.random() * 200, r: 0 })) };
      K.audio.play('explode'); K.fx.shake(14); K.fx.flash('#fff', 0.4); K.game.happy();
      K.meta.track('logs', 1); K.meta.trackMax('stage', stage + 1);
      if (isBoss()) { K.audio.play('win'); K.meta.track('bosses', 1); const unlocked = BLADES.findIndex((b, i) => !G.blades.includes(i) && !b.gems); if (unlocked > 0) { G.blades.push(unlocked); K.ui.toast(K.t(['Boss reward: new blade!', 'Prêmio do chefe: nova lâmina!'])); } }
      setTimeout(() => { stage++; if (stage > G.best) G.best = stage; K.save.mark(); if (isBoss() || stage % 5 === 0) K.meta.addXp(15); setupStage(); }, 1100);
    }
    function fail() {
      playing = false; K.game.stop(); K.audio.play('hit'); K.audio.play('lose'); K.fx.shake(12); K.fx.flash('#ff4d6d', 0.35);
      bounce = { x: cx, y: cy + R + 10, vx: K.rand(-200, 200), vy: 300, r: 0 };
      K.meta.track('runs', 1);
      setTimeout(() => K.std.end({ text: K.t(['Blades clashed!', 'As lâminas bateram!']), rows: [[K.t('stage'), stage + 1], [K.t('best'), G.best], ['🍎', runApples]], coins: stage * 8 + runApples * 5,
        revive: revived ? null : () => { revived = true; bounce = null; playing = true; K.game.start(); }, reviveLabel: K.t(['Continue this stage', 'Continuar esta fase']), restart: () => startRun(0), menu: showMenu }), 900);
    }
    let bounce = null;
    cv.addEventListener('pointerdown', throwBlade);
    window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) throwBlade(); } });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap or press Space to throw a blade into the spinning log. Do not hit the blades already stuck. Hit apples for bonus. Use all blades to split the log; every 5th stage is a boss.', pt: 'Toque ou aperte Espaço para lançar uma lâmina no tronco giratório. Não acerte as lâminas já cravadas. Acerte maçãs para bônus. Use todas para partir o tronco; a cada 5 fases vem um chefe.' },
      missions: [{ stat: 'blades', base: 80, reward: 70, text: { en: 'Throw {n} blades', pt: 'Lance {n} lâminas' } }, { stat: 'apples', base: 8, reward: 80, text: { en: 'Slice {n} apples', pt: 'Corte {n} maçãs' } }, { stat: 'bosses', base: 1, reward: 150, text: { en: 'Beat {n} boss(es)', pt: 'Vença {n} chefe(s)' } }, { stat: 'stage', base: 8, type: 'max', cap: 60, reward: 110, text: { en: 'Reach stage {n}', pt: 'Chegue à fase {n}' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Blade<span>Toss</span>', sub: K.t('best') + ': ' + K.t('stage') + ' ' + G.best + ' · 🍎 ' + G.apples, onPlay: () => startRun(0),
        buttons: [K.ui.btn('🗡 ' + K.t(['Blades', 'Lâminas']), '', () => K.std.shop(K.t(['Blades', 'Lâminas']), BLADES.map((b, i) => ({ id: i, name: K.t(b.n), price: b.p, gems: b.gems, html: `<canvas width="30" height="90" data-b="${i}"></canvas>` })), { owned: G.blades, get: () => G.blade, set: (i) => (G.blade = i) })) ] });
    }
    // draw blade previews inside shop cells when they appear
    new MutationObserver(() => document.querySelectorAll('canvas[data-b]').forEach((c) => { if (c.dataset.d) return; c.dataset.d = 1; const g = c.getContext('2d'); g.translate(15, 45); drawBlade(g, BLADES[+c.dataset.b], 0.9); })).observe(document.body, { childList: true, subtree: true });
    function drawBlade(g, B, s) {
      g.save(); g.scale(s, s);
      g.fillStyle = B.blade; g.beginPath(); g.moveTo(0, -44); g.lineTo(8, -10); g.lineTo(8, 4); g.lineTo(-8, 4); g.lineTo(-8, -30); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(0, -42); g.lineTo(3, -10); g.lineTo(-2, -10); g.closePath(); g.fill();
      g.fillStyle = '#6b6b6b'; g.fillRect(-11, 4, 22, 5);
      g.fillStyle = B.handle; K.draw.rrect(g, -6, 9, 12, 32, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-4, 12, 2, 26);
      g.restore();
    }
    function drawLog(t) {
      const boss = isBoss(), Bo = BOSSES[Math.floor(stage / 5) % BOSSES.length];
      ctx.save(); ctx.translate(cx, cy + (hitT > 0 ? -6 : 0)); ctx.rotate(rot);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(6, 10, R, 0, 6.283); ctx.fill();
      if (boss) {
        ctx.fillStyle = Bo.d; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
        ctx.fillStyle = Bo.c; ctx.beginPath(); ctx.arc(0, 0, R * 0.86, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 0.8) * R * 0.5, Math.sin(k * 1.3) * R * 0.5, R * 0.08, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(-R * 0.25, -R * 0.1, R * 0.08, 0, 6.283); ctx.arc(R * 0.25, -R * 0.1, R * 0.08, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#1b1b2f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, R * 0.15, R * 0.2, 0.2, Math.PI - 0.2); ctx.stroke();
      } else {
        ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#c8935a'; ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(138,90,43,.55)'; ctx.lineWidth = 3; for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(R * 0.03 * k, 0, R * 0.19 * k, 0, 6.283); ctx.stroke(); }
        ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(0, 0, R * 0.08, 0, 6.283); ctx.fill();
      }
      apples.forEach((p) => { ctx.save(); ctx.rotate(p.a - Math.PI / 2); ctx.translate(0, R + 16); ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(-6, 0, 12, 0, 6.283); ctx.arc(6, 0, 12, 0, 6.283); ctx.fill(); ctx.fillStyle = '#8ac926'; ctx.beginPath(); ctx.ellipse(4, -16, 6, 3, -0.5, 0, 6.283); ctx.fill(); ctx.restore(); });
      stuck.forEach((s) => { ctx.save(); ctx.rotate(s.a - Math.PI / 2); ctx.translate(0, R + 36); ctx.rotate((s.wob || 0) * Math.sin(t * 60) * 0.08); drawBlade(ctx, BLADES[s.pre ? 0 : G.blade], 1.1); ctx.restore(); });
      ctx.restore();
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt); hitT -= dt;
      if (!broken && (playing || !K.game._playing)) { spin = spinSpeed(dt); rot += spin * dt; }
      stuck.forEach((s) => { if (s.wob) s.wob = Math.max(0, s.wob - dt * 5); });
      for (let i = flying.length - 1; i >= 0; i--) { const f = flying[i]; f.y -= f.v * dt; if (f.y <= cy + R + 36) { flying.splice(i, 1); land(); } }
      if (broken) { broken.t += dt; broken.parts.forEach((p) => { p.vy += 1200 * dt; p.r += dt * 4; }); }
      if (bounce) { bounce.vy += 1500 * dt; bounce.x += bounce.vx * dt; bounce.y += bounce.vy * dt; bounce.r += dt * 12; }
      if (playing) hud.innerHTML = `<span class="chip">${K.t('stage')} ${stage + 1}${isBoss() ? ' 👑' : ''}</span><span class="chip">🍎 ${G.apples}</span>`;
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createRadialGradient(W / 2, H * 0.35, 20, W / 2, H * 0.35, Math.max(W, H)); gr.addColorStop(0, isBoss() ? '#4a1030' : '#2d3561'); gr.addColorStop(1, '#1b1b2f'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      if (broken) {
        broken.parts.forEach((p, k) => { ctx.save(); ctx.translate(cx + p.vx * broken.t, cy + p.vy * broken.t + 600 * broken.t * broken.t); ctx.rotate(p.r + rot); ctx.fillStyle = '#c8935a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, p.a, p.a + 1.57); ctx.closePath(); ctx.fill(); ctx.restore(); });
      } else if (P()) drawLog(tt);
      flying.forEach((f) => { ctx.save(); ctx.translate(cx, f.y); drawBlade(ctx, BLADES[G.blade], 1.1); ctx.restore(); });
      if (bounce) { ctx.save(); ctx.translate(bounce.x, bounce.y); ctx.rotate(bounce.r); drawBlade(ctx, BLADES[G.blade], 1.1); ctx.restore(); }
      // ready blade + remaining counter
      if (playing && !flying.length && toThrow > 0 && !broken) { ctx.save(); ctx.translate(cx, H - 130); drawBlade(ctx, BLADES[G.blade], 1.1); ctx.restore(); }
      for (let k = 0; k < toThrow; k++) { ctx.save(); ctx.translate(24, H - 40 - k * 22); ctx.rotate(Math.PI / 2); ctx.globalAlpha = 0.9; drawBlade(ctx, BLADES[G.blade], 0.35); ctx.restore(); }
      ctx.globalAlpha = 1;
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    const P = () => true;
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; R = Math.min(w * 0.3, h * 0.17, 130); cx = w / 2; cy = h * 0.36; });
    K.music.set({ bpm: 128, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], bass: true, busy: true, arp: [1, 0, 1, 0, 1, 0, 1, 1], arpWave: 'square', drums: { k: [1, 0, 0, 1, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    showMenu();
  }
})();

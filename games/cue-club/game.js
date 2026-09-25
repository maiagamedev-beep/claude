/* Cue Club — 8-ball pool against an AI. Drag back from the cue ball to aim and set power, release to shoot. */
(function () {
  const K = window.Kit;
  K.fontFamily = 'Georgia, "Times New Roman", serif';
  const BALLC = ['#fff', '#f9c80e', '#1d4ed8', '#dc2626', '#6d28d9', '#f97316', '#15803d', '#7f1d1d', '#111', '#f9c80e', '#1d4ed8', '#dc2626', '#6d28d9', '#f97316', '#15803d', '#7f1d1d'];
  const CUES = [{ n: ['Maple', 'Bordo'], c: '#d4a373', t: '#6b4226', p: 0 }, { n: ['Ebony', 'Ébano'], c: '#2b2b2b', t: '#d4af37', p: 600 }, { n: ['Ruby', 'Rubi'], c: '#9d0208', t: '#ffba08', p: 900 }, { n: ['Ice', 'Gelo'], c: '#caf0f8', t: '#0077b6', p: 1300 }, { n: ['Royal', 'Real'], c: '#5a189a', t: '#ffd60a', gems: 30 }];
  const CLOTH = [{ n: ['Green', 'Verde'], c: '#1f7a4c', p: 0 }, { n: ['Blue', 'Azul'], c: '#1d4e89', p: 500 }, { n: ['Red', 'Vermelho'], c: '#8d1b3d', p: 700 }, { n: ['Purple', 'Roxo'], c: '#4a2c6d', p: 900 }];
  const AIS = [{ n: ['Rookie Rita', 'Rita Novata'], err: 0.12 }, { n: ['Steady Sam', 'Sam Firme'], err: 0.07 }, { n: ['Sharp Sofia', 'Sofia Afiada'], err: 0.04 }, { n: ['Master Max', 'Mestre Max'], err: 0.02 }];

  K.boot('cue_club', { g: { wins: 0, ai: 0, cue: 0, cues: [0], cloth: 0, cloths: [0] } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, TW = 800, TH = 400, tx = 0, ty = 0, R = 10, portrait = false;
    // table in logical units 1000 x 500, rendered rotated in portrait
    const LW = 1000, LH = 500, BR = 13, POCK = [[0, 0], [500, -8], [1000, 0], [0, 500], [500, 508], [1000, 500]];
    let balls = [], turn = 0, groups = [null, null], moving = false, playing = false, aim = null, firstHit = null, pocketed = [], foul = false, ballInHand = false, aiT = 0, msg = '', msgT = 0, gameOver = false;
    function layout() { portrait = H > W; const aw = portrait ? H - 170 : W - 30, ah = portrait ? W - 30 : H - 150; const sc = Math.min(aw / (LW + 80), ah / (LH + 80)); TW = LW * sc; TH = LH * sc; R = sc; }
    const toScreen = (x, y) => (portrait ? { x: W / 2 + (y - LH / 2) * R, y: H / 2 + 20 - (x - LW / 2) * R } : { x: W / 2 + (x - LW / 2) * R, y: H / 2 + 30 + (y - LH / 2) * R });
    const toLogic = (sx, sy) => (portrait ? { x: LW / 2 - (sy - H / 2 - 20) / R, y: LH / 2 + (sx - W / 2) / R } : { x: LW / 2 + (sx - W / 2) / R, y: LH / 2 + (sy - H / 2 - 30) / R });
    function rack() {
      balls = [{ n: 0, x: 250, y: 250, vx: 0, vy: 0, in: false }];
      const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15], pos = []; let i = 0;
      for (let col = 0; col < 5; col++) for (let r = 0; r <= col; r++) pos.push([700 + col * BR * 1.75, 250 + (r - col / 2) * BR * 2.02]);
      order.sort(() => Math.random() - 0.5); const eightIdx = order.indexOf(8); [order[4], order[eightIdx]] = [order[eightIdx], order[4]];
      pos.forEach((p) => balls.push({ n: order[i++], x: p[0], y: p[1], vx: 0, vy: 0, in: false, rot: 0 }));
    }
    function start() { rack(); turn = 0; groups = [null, null]; moving = false; ballInHand = false; gameOver = false; playing = true; say(K.t(['Your break!', 'Sua saída!'])); K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    const say = (m) => { msg = m; msgT = 2.2; };
    const cue = () => balls[0];
    const groupOf = (n) => (n === 8 ? 'eight' : n < 8 ? 'solid' : 'stripe');
    const left = (p) => balls.filter((b) => !b.in && b.n && groupOf(b.n) === groups[p]).length;
    function shoot(ang, pow) {
      const c = cue(); c.vx = Math.cos(ang) * pow; c.vy = Math.sin(ang) * pow;
      moving = true; firstHit = null; pocketed = []; foul = false; ballInHand = false;
      K.audio.play('hit', 0.6 + pow / 2000);
    }
    function physics(dt) {
      const steps = 8, h = dt / steps;
      for (let s = 0; s < steps; s++) {
        for (const b of balls) {
          if (b.in) continue;
          b.x += b.vx * h; b.y += b.vy * h; b.rot = (b.rot || 0) + Math.hypot(b.vx, b.vy) * h * 0.05;
          const sp = Math.hypot(b.vx, b.vy); if (sp > 0) { const f = Math.max(0, sp - 190 * h) / sp; b.vx *= f; b.vy *= f; }
          // pockets
          for (const [px, py] of POCK) if (Math.hypot(b.x - px, b.y - py) < 26) { b.in = true; b.vx = b.vy = 0; pocketed.push(b.n); K.audio.play('thud', 0.8); const s2 = toScreen(px, py); K.fx.burst(s2.x, s2.y, { n: 10, colors: [BALLC[b.n], '#fff'], speed: 120, g: 0, size: 4, life: 0.4 }); break; }
          if (b.in) continue;
          // cushions (with pocket mouths open)
          const nearPocket = POCK.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < 40);
          if (!nearPocket) {
            if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * 0.8; cush(); } if (b.x > LW - BR) { b.x = LW - BR; b.vx = -Math.abs(b.vx) * 0.8; cush(); }
            if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy) * 0.8; cush(); } if (b.y > LH - BR) { b.y = LH - BR; b.vy = -Math.abs(b.vy) * 0.8; cush(); }
          }
        }
        for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], b = balls[j]; if (a.in || b.in) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < BR * 2 && d > 0) {
            const nx = dx / d, ny = dy / d, ov = BR * 2 - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { const imp = -rv * 0.97; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; if (Math.abs(rv) > 40) K.audio.play('tick', 1 + Math.min(1, Math.abs(rv) / 800)); }
            if (firstHit === null && (a.n === 0 || b.n === 0)) firstHit = a.n === 0 ? b.n : a.n;
          }
        }
      }
      if (moving && balls.every((b) => b.in || Math.hypot(b.vx, b.vy) < 4)) { balls.forEach((b) => (b.vx = b.vy = 0)); moving = false; resolveTurn(); }
    }
    let lastCush = 0; function cush() { if (performance.now() - lastCush > 60) { lastCush = performance.now(); K.audio.play('land', 1.6); } }
    function resolveTurn() {
      const me = turn, cueIn = pocketed.includes(0), eightIn = pocketed.includes(8);
      if (cueIn) { const c = cue(); c.in = false; c.x = 250; c.y = 250; foul = true; }
      if (firstHit === null) foul = true;
      else if (groups[me] && groupOf(firstHit) !== groups[me] && !(groups[me] && left(me) === 0 && firstHit === 8)) foul = true;
      const own = pocketed.filter((n) => n && n !== 8);
      if (!groups[me] && own.length && !foul) { const g = groupOf(own[0]); groups[me] = g; groups[1 - me] = g === 'solid' ? 'stripe' : 'solid'; say((me === 0 ? K.t(['You are ', 'Você é ']) : AIS[G.ai].n[K.lang === 'pt' ? 1 : 0] + ': ') + (g === 'solid' ? K.t(['solids', 'lisas']) : K.t(['stripes', 'listradas']))); }
      if (eightIn) { const legal = groups[me] && left(me) === 0 && !foul; return finish(legal ? me : 1 - me); }
      const scored = own.some((n) => groups[me] && groupOf(n) === groups[me]);
      if (me === 0 && scored) K.meta.track('pots', own.filter((n) => groupOf(n) === groups[0]).length);
      if (foul) { say(K.t(['Foul! Ball in hand.', 'Falta! Bola na mão.'])); ballInHand = true; turn = 1 - me; K.audio.play('error'); }
      else if (!scored || !own.length) turn = 1 - me;
      else { say(me === 0 ? K.pick([K.t(['Nice shot!', 'Bela tacada!']), K.t(['Keep going!', 'Continue!'])]) : ''); if (me === 0) K.audio.play('coin'); }
      aiT = 1.1;
    }
    function finish(winner) {
      gameOver = true; playing = false; K.game.stop();
      const won = winner === 0; if (won) { G.wins++; K.meta.track('wins', 1); if (G.ai < AIS.length - 1 && G.wins % 2 === 0) G.ai++; K.audio.play('win'); K.std.confetti(['#f9c80e', '#fff', '#1d4ed8']); } else K.audio.play('lose');
      K.meta.addXp(won ? 30 : 8); K.save.mark();
      setTimeout(() => K.std.end({ win: won, title: won ? K.t(['You win!', 'Você venceu!']) : K.t(['You lose', 'Você perdeu']), text: won ? '' : K.t(['The 8-ball decided it.', 'A bola 8 decidiu.']), rows: [[K.t(['Wins', 'Vitórias']), G.wins]], coins: won ? 60 + G.ai * 30 : 10, mult: won ? 3 : 2, restart: start, menu: showMenu }), 800);
    }
    // AI: ghost-ball aiming at the best pocket
    function aiShot() {
      const c = cue(), mine = balls.filter((b) => !b.in && b.n && (groups[1] ? (left(1) ? groupOf(b.n) === groups[1] : b.n === 8) : b.n !== 8));
      if (ballInHand) { c.x = K.rand(150, 350); c.y = K.rand(100, 400); }
      let best = null, bs = -1e9;
      for (const b of mine) for (const [px, py] of POCK) {
        const tx2 = px - b.x, ty2 = py - b.y, td = Math.hypot(tx2, ty2), gx = b.x - (tx2 / td) * BR * 2, gy = b.y - (ty2 / td) * BR * 2;
        const cx2 = gx - c.x, cy2 = gy - c.y, cd = Math.hypot(cx2, cy2), cut = (cx2 * tx2 + cy2 * ty2) / (cd * td);
        if (cut < 0.3) continue;
        const blocked = balls.some((o) => !o.in && o !== c && o !== b && distToSeg(o, c.x, c.y, gx, gy) < BR * 2);
        const sc = cut * 2 - (cd + td) / 1000 - (blocked ? 3 : 0);
        if (sc > bs) { bs = sc; best = { a: Math.atan2(cy2, cx2), pow: Math.min(1300, 350 + (cd + td) * 0.9) }; }
      }
      if (!best) { const t = K.pick(mine.length ? mine : balls.filter((b) => !b.in && b.n)); best = { a: Math.atan2(t.y - c.y, t.x - c.x), pow: 900 }; }
      const err = AIS[G.ai].err; aiAnim = { a: best.a + K.rand(-err, err), pow: best.pow * K.rand(0.95, 1.05), t: 0 };
    }
    let aiAnim = null;
    function distToSeg(p, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, t = K.clamp(((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(p.x - x1 - dx * t, p.y - y1 - dy * t); }
    // input
    cv.addEventListener('pointerdown', (e) => {
      if (!playing || moving || turn !== 0 || K.ui.anyOpen()) return;
      const p = toLogic(e.clientX, e.clientY), c = cue();
      if (ballInHand && Math.hypot(p.x - c.x, p.y - c.y) < 40) { aim = { drag: 'place' }; return; }
      aim = { sx: p.x, sy: p.y, x: p.x, y: p.y };
    });
    window.addEventListener('pointermove', (e) => { if (!aim) { if (playing && turn === 0 && !moving && e.pointerType === 'mouse') hover = toLogic(e.clientX, e.clientY); return; } const p = toLogic(e.clientX, e.clientY); if (aim.drag === 'place') { const c = cue(); c.x = K.clamp(p.x, BR, LW - BR); c.y = K.clamp(p.y, BR, LH - BR); return; } aim.x = p.x; aim.y = p.y; });
    window.addEventListener('pointerup', () => {
      if (!aim) return; const a = aim; aim = null; if (a.drag === 'place') { ballInHand = false; return; }
      const c = cue(), dx = c.x - a.x, dy = c.y - a.y, pull = Math.hypot(a.x - a.sx, a.y - a.sy);
      // direction: from pointer toward cue ball (drag back to shoot forward); tap = aim at tap point with medium power
      if (pull < 8) { const ang = Math.atan2(a.sy - c.y, a.sx - c.x); aimLock = ang; return; }
      const ang = aimLock !== null ? aimLock : Math.atan2(dy, dx), pow = Math.min(1400, pull * 6);
      if (pow < 60) return; aimLock = null; shoot(ang, pow);
    });
    let hover = null, aimLock = null;

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap the table to set your aim, then drag anywhere and pull back to set power; release to shoot (or drag back directly from the cue ball). Pot all your group (solids or stripes), then the 8-ball. Fouls give ball in hand: drag the cue ball to place it.', pt: 'Toque na mesa para mirar, depois arraste e puxe para trás para a força; solte para tacar (ou puxe direto da bola branca). Encaçape seu grupo (lisas ou listradas) e depois a bola 8. Faltas dão bola na mão: arraste a branca para posicionar.' },
      missions: [{ stat: 'pots', base: 15, reward: 80, text: { en: 'Pot {n} of your balls', pt: 'Encaçape {n} bolas suas' } }, { stat: 'wins', base: 1, reward: 150, text: { en: 'Win {n} match(es)', pt: 'Vença {n} partida(s)' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Cue<span>Club</span>', sub: K.t(['Opponent', 'Oponente']) + ': ' + K.t(AIS[G.ai].n) + ' · ' + K.t(['Wins', 'Vitórias']) + ' ' + G.wins, onPlay: start,
        buttons: [K.ui.btn('🎱 ' + K.t(['Cues', 'Tacos']), '', () => K.std.shop(K.t(['Cues', 'Tacos']), CUES.map((c, i) => ({ id: i, name: K.t(c.n), price: c.p, gems: c.gems, html: `<div style="width:70px;height:8px;border-radius:4px;background:linear-gradient(90deg,${c.t} 0 25%,${c.c} 25%);margin:16px 0"></div>` })), { owned: G.cues, get: () => G.cue, set: (i) => (G.cue = i) })),
          K.ui.btn('▭ ' + K.t(['Cloth', 'Feltro']), '', () => K.std.shop(K.t(['Cloth', 'Feltro']), CLOTH.map((c, i) => ({ id: i, name: K.t(c.n), price: c.p, html: `<div style="width:56px;height:34px;border-radius:6px;border:5px solid #5b3a24;background:${c.c}"></div>` })), { owned: G.cloths, get: () => G.cloth, set: (i) => (G.cloth = i) })),
          K.ui.btn('🤖 ' + K.t(['Opponent', 'Oponente']), '', () => { const body = K.el('div'); const p = K.ui.panel({ title: K.t(['Opponent', 'Oponente']), body }); AIS.forEach((a, i) => { const unlocked = i <= Math.floor(G.wins / 2); const row = K.el('div', 'kit-row', `<div class="grow"><b>${K.t(a.n)}</b></div>`); row.appendChild(unlocked ? K.ui.btn(G.ai === i ? '✓' : '▶', 'sm', () => { G.ai = i; K.save.mark(); p.close(); showMenu(); }) : K.el('b', '', '🔒')); body.appendChild(row); }); })] });
      if (!balls.length) rack();
    }
    function drawBall(b) {
      const s = toScreen(b.x, b.y), r = BR * R;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(s.x + r * 0.2, s.y + r * 0.3, r, 0, 6.283); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.283); ctx.clip();
      ctx.fillStyle = b.n > 8 ? '#fff' : BALLC[b.n]; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      if (b.n > 8) { ctx.fillStyle = BALLC[b.n]; ctx.fillRect(s.x - r, s.y - r * 0.55 + Math.sin(b.rot || 0) * r * 0.2, r * 2, r * 1.1); }
      if (b.n) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.45, 0, 6.283); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = `700 ${r * 0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.n, s.x, s.y + 1); }
      const g = ctx.createRadialGradient(s.x - r * 0.35, s.y - r * 0.4, 1, s.x, s.y, r); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = g; ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      ctx.restore();
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt); msgT -= dt;
      if (playing) physics(dt);
      if (playing && !moving && turn === 1 && !gameOver) { aiT -= dt; if (aiT <= 0 && !aiAnim) aiShot(); if (aiAnim) { aiAnim.t += dt; if (aiAnim.t > 0.9) { shoot(aiAnim.a, aiAnim.pow); aiAnim = null; } } }
      if (playing) { const g0 = groups[0] ? (groups[0] === 'solid' ? '●' : '◐') + ' ' + left(0) : '—', g1 = groups[1] ? (groups[1] === 'solid' ? '●' : '◐') + ' ' + left(1) : '—'; hud.innerHTML = `<span class="chip ${turn === 0 ? 'on' : ''}">${K.t(['You', 'Você'])} ${g0}</span><span class="chip ${turn === 1 ? 'on' : ''}">${K.t(AIS[G.ai].n)} ${g1}</span>`; }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H)); bg.addColorStop(0, '#3a2a1e'); bg.addColorStop(1, '#120c08'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // lamp glow
      const lg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(TW, TH) * 0.7); lg.addColorStop(0, 'rgba(255,220,150,.18)'); lg.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      const c0 = toScreen(-35, -35), c1 = toScreen(LW + 35, LH + 35), x0 = Math.min(c0.x, c1.x), y0 = Math.min(c0.y, c1.y), x1 = Math.max(c0.x, c1.x), y1 = Math.max(c0.y, c1.y);
      ctx.fillStyle = '#5b3a24'; K.draw.rrect(ctx, x0, y0, x1 - x0, y1 - y0, 20 * R); ctx.fill();
      ctx.strokeStyle = '#7a5236'; ctx.lineWidth = 4; ctx.stroke();
      const i0 = toScreen(0, 0), i1 = toScreen(LW, LH);
      ctx.fillStyle = CLOTH[G.cloth].c; ctx.fillRect(Math.min(i0.x, i1.x), Math.min(i0.y, i1.y), Math.abs(i1.x - i0.x), Math.abs(i1.y - i0.y));
      const cg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(TW, TH) * 0.6); cg.addColorStop(0, 'rgba(255,255,255,.08)'); cg.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = cg; ctx.fillRect(Math.min(i0.x, i1.x), Math.min(i0.y, i1.y), Math.abs(i1.x - i0.x), Math.abs(i1.y - i0.y));
      [[250, 0], [750, 0], [250, LH], [750, LH], [0, 250], [LW, 250]].forEach(([x, y]) => { const s = toScreen(x, y); ctx.fillStyle = '#e9d8a6'; ctx.beginPath(); ctx.arc(s.x, s.y + (y === 0 ? -18 * R : y === LH ? 18 * R : 0) * (portrait ? 0 : 1), 3, 0, 6.283); ctx.fill(); });
      POCK.forEach(([x, y]) => { const s = toScreen(x, y); ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(s.x, s.y, 24 * R, 0, 6.283); ctx.fill(); });
      const hs = toScreen(250, 0), he = toScreen(250, LH); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hs.x, hs.y); ctx.lineTo(he.x, he.y); ctx.stroke();
      balls.forEach((b) => { if (!b.in) drawBall(b); });
      // aiming guide & cue stick
      const c = cue();
      let ang = null, pow = 0;
      if (playing && !moving && turn === 0) {
        if (aim && aim.drag !== 'place') { ang = aimLock !== null ? aimLock : Math.atan2(c.y - aim.y, c.x - aim.x); pow = Math.min(1400, Math.hypot(aim.x - aim.sx, aim.y - aim.sy) * 6); }
        else if (aimLock !== null) ang = aimLock; else if (hover) ang = Math.atan2(hover.y - c.y, hover.x - c.x);
      }
      if (aiAnim) { ang = aiAnim.a; pow = aiAnim.pow * Math.min(1, aiAnim.t / 0.7); }
      if (ang !== null && !c.in) {
        // trajectory to first contact
        let x = c.x, y = c.y, hit = null; const dx = Math.cos(ang), dy = Math.sin(ang);
        for (let d = 0; d < 1200; d += 3) { x += dx * 3; y += dy * 3; if (x < BR || x > LW - BR || y < BR || y > LH - BR) break; hit = balls.find((b) => b !== c && !b.in && Math.hypot(b.x - x, b.y - y) < BR * 2); if (hit) break; }
        const a0 = toScreen(c.x, c.y), a1 = toScreen(x, y);
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(a1.x, a1.y, BR * R, 0, 6.283); ctx.stroke();
        if (hit) { const nx = hit.x - x, ny = hit.y - y, nd = Math.hypot(nx, ny), h1 = toScreen(hit.x, hit.y), h2 = toScreen(hit.x + (nx / nd) * 80, hit.y + (ny / nd) * 80); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(h1.x, h1.y); ctx.lineTo(h2.x, h2.y); ctx.stroke(); }
        // stick
        const back = 20 + pow / 20, s0 = toScreen(c.x - dx * (BR + back), c.y - dy * (BR + back)), s1 = toScreen(c.x - dx * (BR + back + 320), c.y - dy * (BR + back + 320)), CU = CUES[G.cue];
        ctx.lineCap = 'round'; ctx.strokeStyle = CU.c; ctx.lineWidth = 7 * R + 2; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
        const sm = toScreen(c.x - dx * (BR + back + 240), c.y - dy * (BR + back + 240)); ctx.strokeStyle = CU.t; ctx.beginPath(); ctx.moveTo(sm.x, sm.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
        ctx.strokeStyle = '#f1faee'; ctx.lineWidth = 5 * R + 2; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); const st = toScreen(c.x - dx * (BR + back + 6), c.y - dy * (BR + back + 6)); ctx.lineTo(st.x, st.y); ctx.stroke(); ctx.lineCap = 'butt';
        if (pow > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W - 30, H * 0.3, 14, H * 0.4); ctx.fillStyle = pow > 1100 ? '#ff4d6d' : '#ffd166'; ctx.fillRect(W - 30, H * 0.7 - H * 0.4 * (pow / 1400), 14, H * 0.4 * (pow / 1400)); }
      }
      if (ballInHand && turn === 0 && !moving) { const s = toScreen(c.x, c.y); ctx.strokeStyle = `rgba(255,209,102,${0.5 + Math.sin(tt * 6) * 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, BR * R + 8, 0, 6.283); ctx.stroke(); }
      if (msgT > 0 && msg) { ctx.globalAlpha = Math.min(1, msgT); ctx.fillStyle = 'rgba(0,0,0,.55)'; K.draw.rrect(ctx, W / 2 - 170, H - 70, 340, 40, 20); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 17px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(msg, W / 2, H - 50); ctx.globalAlpha = 1; }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); });
    K.music.set({ bpm: 84, chords: [[57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71]], bass: true, pad: true, padWave: 'triangle', lead: [76, 0, 74, 72, 0, 0, 69, 0, 72, 0, 0, 0, 0, 0, 0, 0], leadWave: 'sine', drums: { h: [0, 0, 1, 0, 0, 0, 1, 1] } });
    showMenu();
  }
})();

/* Penalty Star — swipe to shoot (curve the swipe to bend it), then dive to save. Knockout cup against 8 teams.
   Fictional teams only. Pseudo-3D pitch drawn in canvas. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const TEAMS = [
    { n: 'Harbor City', c: ['#1d3557', '#f1faee'] }, { n: 'Sunvale', c: ['#ffb703', '#023047'] }, { n: 'Redwood FC', c: ['#9d0208', '#ffba08'] }, { n: 'Northwind', c: ['#caf0f8', '#0077b6'] },
    { n: 'Lagoa Azul', c: ['#00b4d8', '#ffffff'] }, { n: 'Iron Hills', c: ['#495057', '#f8f9fa'] }, { n: 'Mango Bay', c: ['#fb8500', '#219ebc'] }, { n: 'Violet Park', c: ['#7209b7', '#f72585'] },
  ];
  const KITS = [{ n: ['Home', 'Casa'], c: ['#2a9d8f', '#ffffff'], p: 0 }, { n: ['Classic', 'Clássico'], c: ['#e63946', '#ffffff'], p: 400 }, { n: ['Canary', 'Canário'], c: ['#ffd60a', '#2b9348'], p: 600 }, { n: ['Night', 'Noite'], c: ['#14213d', '#fca311'], p: 900 }, { n: ['Legend', 'Lenda'], c: ['#d4af37', '#111111'], gems: 30 }];

  K.boot('penalty_star', { g: { cups: 0, stage: 0, kit: 0, kits: [0], best: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    // goal in "world": x -1..1 across mouth, y 0..1 up; projection to screen
    let gx = 0, gy = 0, gw = 300, gh = 110, spot = { x: 0, y: 0 };
    function layout() { gw = Math.min(W * 0.8, 520); gh = gw * 0.36; gx = W / 2; gy = H * 0.34; spot = { x: W / 2, y: H * 0.82 }; }
    const toG = (x, y) => ({ x: gx + x * gw / 2, y: gy - y * gh }); // goal plane coords
    let match = null, ball = null, keeper = null, phase = 'menu', swipe = [], playing = false, result = '', resT = 0, opp = 0, revived = false, streak = 0;
    function startCup() { G.stage = 0; nextMatch(); }
    function nextMatch() { opp = (G.stage + G.cups) % TEAMS.length; match = { me: [], them: [], round: 0, turn: 'shoot' }; revived = false; playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); prep(); K.fx.text(W / 2, H * 0.3, ['Quarter-final', 'Semi-final', 'FINAL'][G.stage] ? K.t([['Quarter-final', 'Quartas'], ['Semi-final', 'Semifinal'], ['FINAL', 'FINAL']][G.stage]) : '', { color: '#fff', stroke: '#1d1d1d', size: 40, life: 1.6 }); }
    const skill = () => 0.35 + G.stage * 0.18 + G.cups * 0.05;
    function prep() {
      ball = { x: 0, y: 0, z: 0, t: 0, flying: false, tx: 0, ty: 0, curve: 0, speed: 1 };
      keeper = { x: 0, y: 0, dive: 0, tx: 0, ty: 0, t: 0, reaction: 0 };
      phase = match.turn; swipe = []; result = '';
    }
    // shooting: swipe from ball toward the goal
    function shoot(pts) {
      const a = pts[0], b = pts[pts.length - 1], dur = Math.max(0.05, (b.t - a.t) / 1000);
      const dy = a.y - b.y; if (dy < 40) return;
      const mid = pts[Math.floor(pts.length / 2)], lineX = (a.x + b.x) / 2, bend = (mid.x - lineX) / 60; // curve from swipe arc
      const tx = K.clamp(((b.x - spot.x) / (gw / 2)) * 1.3 + bend * 0.2, -1.4, 1.4), ty = K.clamp((dy / (spot.y - gy)) * 1.25 - 0.1 + (0.15 - dur) * 0.8, -0.1, 1.6);
      ball.flying = true; ball.tx = tx; ball.ty = ty; ball.curve = -bend * 0.35; ball.speed = K.clamp(0.9 / Math.max(0.12, dur * 2.2), 0.8, 1.8);
      // keeper guesses
      const good = Math.random() < skill() * 0.6;
      keeper.tx = good ? K.clamp(tx + K.rand(-0.25, 0.25), -1, 1) : K.rand(-1, 1); keeper.ty = good ? K.clamp(ty, 0, 0.9) : K.rand(0, 0.8); keeper.reaction = K.rand(0.08, 0.2);
      K.audio.play('hit', 0.8); phase = 'flight';
    }
    // saving: tap where you want to dive before the ball arrives
    function oppShoot() {
      const sk = skill(); ball.flying = true; ball.tx = K.rand(-0.95, 0.95) * (0.7 + sk * 0.3); ball.ty = K.rand(0.05, 0.85); ball.curve = K.rand(-0.3, 0.3) * sk; ball.speed = 0.9 + sk * 0.5; ball.miss = Math.random() < 0.12 - sk * 0.06;
      if (ball.miss) ball.tx = (Math.random() < 0.5 ? -1 : 1) * K.rand(1.1, 1.4);
      keeper.tx = 0; keeper.ty = 0.2; keeper.reaction = 99; phase = 'flight'; K.audio.play('hit', 0.8);
    }
    function dive(x, y) { if (phase !== 'flight' || match.turn !== 'save' || keeper.locked) return; const p = { x: (x - gx) / (gw / 2), y: (gy - y) / gh }; keeper.tx = K.clamp(p.x, -1, 1); keeper.ty = K.clamp(p.y, 0, 0.9); keeper.reaction = 0; keeper.locked = true; K.audio.play('whoosh'); }
    function resolve() {
      const bx = ball.tx + ball.curve, by = ball.ty, inGoal = Math.abs(bx) < 1 && by >= 0 && by < 1, post = Math.abs(Math.abs(bx) - 1) < 0.05 || Math.abs(by - 1) < 0.05;
      const kd = Math.hypot((keeper.x - bx) * 1.1, keeper.y - by), saved = inGoal && kd < 0.3;
      const scored = inGoal && !saved && !post;
      result = scored ? 'goal' : saved ? 'save' : post ? 'post' : 'miss';
      const mine = match.turn === 'shoot';
      (mine ? match.me : match.them).push(scored);
      if (mine) { if (scored) { streak++; K.meta.track('goals', 1); K.audio.play('win'); K.fx.flash('#fff', 0.3); K.game.happy(); if (Math.abs(bx) > 0.8 && by > 0.7) { K.meta.track('corners', 1); K.fx.text(W / 2, H * 0.5, K.t(['TOP CORNER!', 'NO ÂNGULO!']), { color: '#ffd60a', stroke: '#1d1d1d', size: 36 }); } } else { streak = 0; K.audio.play('lose'); } }
      else { if (!scored) { K.meta.track('saves', 1); K.audio.play('win'); K.fx.shake(6); } else K.audio.play('hurt'); }
      K.fx.text(W / 2, H * 0.45, { goal: K.t(['GOAL!', 'GOL!']), save: K.t(['SAVED!', 'DEFENDEU!']), post: K.t(['POST!', 'TRAVE!']), miss: K.t(['WIDE!', 'PRA FORA!']) }[result], { color: result === 'goal' ? (mine ? '#06d6a0' : '#ef476f') : mine ? '#ef476f' : '#06d6a0', stroke: '#1d1d1d', size: 54, life: 1.2 });
      phase = 'result'; resT = 1.4;
    }
    function afterResult() {
      const me = match.me, th = match.them, n = Math.max(me.length, th.length), goalsMe = me.filter(Boolean).length, goalsThem = th.filter(Boolean).length;
      // standard 5 each then sudden death
      const done = (() => { if (me.length === th.length) { if (me.length >= 5 && goalsMe !== goalsThem) return true; } const left = (k) => Math.max(0, 5 - k.length); if (me.length <= 5 && th.length <= 5) { if (goalsMe > goalsThem + left(th)) return true; if (goalsThem > goalsMe + left(me)) return true; } return false; })();
      void n;
      if (done) return endMatch(goalsMe > goalsThem);
      match.turn = match.turn === 'shoot' ? 'save' : 'shoot'; prep();
      if (match.turn === 'save') setTimeout(() => { if (phase === 'save') oppShoot(); }, 1200);
    }
    function endMatch(won) {
      playing = false; K.game.stop(); K.meta.track('matches', 1);
      if (won) { K.audio.play('win'); K.std.confetti([...KITS[G.kit].c, '#ffd60a']); G.stage++; if (G.stage >= 3) { G.cups++; G.stage = 0; K.meta.track('cups', 1); K.meta.addGems(5); } } else G.stage = 0;
      K.meta.addXp(won ? 20 : 6); K.save.mark();
      const cup = won && G.stage === 0;
      setTimeout(() => K.std.end({ win: won, title: cup ? K.t(['CHAMPIONS!', 'CAMPEÕES!']) : won ? K.t(['You win!', 'Você venceu!']) : K.t(['Knocked out', 'Eliminado']), text: `${match.me.filter(Boolean).length} - ${match.them.filter(Boolean).length} · ${TEAMS[opp].n}`, rows: [['🏆', G.cups]], coins: cup ? 200 : won ? 60 + G.stage * 20 : 15, mult: won ? 3 : 2,
        revive: !won && !revived ? () => { revived = true; playing = true; K.game.start(); match.me.pop(); match.turn = 'shoot'; prep(); } : null, reviveLabel: K.t(['Retake last kick', 'Repetir última cobrança']),
        next: won && !cup ? { label: K.t(['Next match', 'Próximo jogo']), fn: nextMatch } : null, restart: cup || !won ? startCup : null, menu: showMenu }), 900);
    }
    // input
    cv.addEventListener('pointerdown', (e) => { if (!playing || K.ui.anyOpen()) return; if (phase === 'shoot' && Math.hypot(e.clientX - spot.x, e.clientY - spot.y) < 120) swipe = [{ x: e.clientX, y: e.clientY, t: performance.now() }]; else if (match && match.turn === 'save') dive(e.clientX, e.clientY); });
    window.addEventListener('pointermove', (e) => { if (swipe.length) swipe.push({ x: e.clientX, y: e.clientY, t: performance.now() }); });
    window.addEventListener('pointerup', () => { if (swipe.length > 2 && phase === 'shoot') shoot(swipe); swipe = []; });
    window.addEventListener('keydown', (e) => { if (!playing) return; const m = { ArrowLeft: [-0.7, 0.3], ArrowRight: [0.7, 0.3], ArrowUp: [0, 0.75], KeyQ: [-0.8, 0.8], KeyE: [0.8, 0.8], ArrowDown: [0, 0.1] }[e.code]; if (!m) return; e.preventDefault(); if (phase === 'shoot') { const t = performance.now(), sx = spot.x, sy = spot.y; shoot([{ x: sx, y: sy, t }, { x: sx + m[0] * gw * 0.35, y: sy - (sy - gy) * (0.5 + m[1] * 0.6), t: t + 60 }, { x: sx + m[0] * gw * 0.38, y: sy - (sy - gy) * (0.7 + m[1] * 0.55), t: t + 120 }]); } else if (match.turn === 'save') { const p = toG(m[0], m[1]); dive(p.x, p.y); } });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Shooting: swipe from the ball toward the goal — faster swipes shoot harder, curved swipes bend the ball. Saving: tap where you want the keeper to dive before the ball arrives. Keyboard: arrows/Q/E aim or dive. Win 3 knockout matches to lift the cup.', pt: 'Chutar: deslize da bola em direção ao gol — mais rápido chuta mais forte, deslizar em curva faz a bola curvar. Defender: toque onde o goleiro deve pular antes da bola chegar. Teclado: setas/Q/E miram ou pulam. Vença 3 jogos para levantar a taça.' },
      missions: [{ stat: 'goals', base: 10, reward: 80, text: { en: 'Score {n} penalties', pt: 'Marque {n} pênaltis' } }, { stat: 'saves', base: 5, reward: 90, text: { en: 'Make {n} saves', pt: 'Faça {n} defesas' } }, { stat: 'corners', base: 2, reward: 100, text: { en: 'Hit the top corner {n} times', pt: 'Acerte o ângulo {n} vezes' } }, { stat: 'cups', base: 1, reward: 200, text: { en: 'Win {n} cup(s)', pt: 'Ganhe {n} taça(s)' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'pshud'); K.ui.root.appendChild(hud);
    function showMenu() { playing = false; hud.style.display = 'none'; K.std.menu({ title: 'Penalty<span>Star</span>', sub: '🏆 ' + G.cups + ' · ' + K.t(['Stage', 'Fase']) + ' ' + (G.stage + 1) + '/3', onPlay: () => (G.stage ? nextMatch() : startCup()), buttons: [K.ui.btn('👕 ' + K.t(['Kits', 'Uniformes']), '', () => K.std.shop(K.t(['Kits', 'Uniformes']), KITS.map((k, i) => ({ id: i, name: K.t(k.n), price: k.p, gems: k.gems, html: `<div style="width:40px;height:44px;border-radius:8px 8px 4px 4px;background:linear-gradient(90deg,${k.c[0]} 0 40%,${k.c[1]} 40% 60%,${k.c[0]} 60%)"></div>` })), { owned: G.kits, get: () => G.kit, set: (i) => (G.kit = i) }))] }); }
    function drawPlayer(x, y, s, col, pose) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#1d1d1d'; ctx.fillRect(-7, -22, 5, 22); ctx.fillRect(2, -22, 5, 22);
      ctx.fillStyle = col[0]; ctx.fillRect(-10, -48, 20, 28); ctx.fillStyle = col[1]; ctx.fillRect(-2, -48, 4, 28);
      ctx.fillStyle = '#f4c7a1'; ctx.beginPath(); ctx.arc(0, -56, 8, 0, 6.283); ctx.fill();
      if (pose === 'gk') { ctx.strokeStyle = col[0]; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-10, -44); ctx.lineTo(-22, -60); ctx.moveTo(10, -44); ctx.lineTo(22, -60); ctx.stroke(); ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.arc(-22, -62, 5, 0, 6.283); ctx.arc(22, -62, 5, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      if (phase === 'flight') {
        ball.t += dt * ball.speed * 1.4;
        if (keeper.reaction < 99) { keeper.reaction -= dt; if (keeper.reaction <= 0) { keeper.x = K.lerp(keeper.x, keeper.tx, Math.min(1, dt * 7)); keeper.y = K.lerp(keeper.y, keeper.ty, Math.min(1, dt * 7)); keeper.dive = Math.min(1, keeper.dive + dt * 5); } }
        if (ball.t >= 1) { ball.t = 1; resolve(); }
      } else if (phase === 'result') { resT -= dt; if (resT <= 0) { keeper.locked = false; afterResult(); } }
      if (playing && match) { const dots = (arr) => [0, 1, 2, 3, 4].map((k) => `<i class="${arr[k] === undefined ? '' : arr[k] ? 'g' : 'x'}"></i>`).join('') + (arr.length > 5 ? `<b>+${arr.slice(5).filter(Boolean).length}</b>` : ''); hud.innerHTML = `<div class="row"><span style="background:${KITS[G.kit].c[0]}"></span>${K.t(['You', 'Você'])}<em>${dots(match.me)}</em></div><div class="row"><span style="background:${TEAMS[opp].c[0]}"></span>${TEAMS[opp].n}<em>${dots(match.them)}</em></div>${phase === 'shoot' ? `<p>${K.t(['Swipe to shoot!', 'Deslize para chutar!'])}</p>` : match.turn === 'save' && !keeper.locked && phase !== 'result' ? `<p>${K.t(['Tap to dive!', 'Toque para defender!'])}</p>` : ''}`; }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // stands & crowd
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.3); sky.addColorStop(0, '#1b263b'); sky.addColorStop(1, '#415a77'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (let row = 0; row < 6; row++) for (let k = 0; k < W / 12; k++) { ctx.fillStyle = ['#e63946', '#f1faee', '#a8dadc', '#ffd60a', '#457b9d'][(k * 7 + row * 3) % 5]; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(k * 12 + (row % 2) * 6, H * 0.06 + row * 11 + Math.sin(tt * 6 + k + row) * (result === 'goal' ? 3 : 0.8), 4, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
      // lights glow
      [W * 0.1, W * 0.9].forEach((x) => { const g = ctx.createRadialGradient(x, 10, 0, x, 10, 160); g.addColorStop(0, 'rgba(255,255,220,.5)'); g.addColorStop(1, 'rgba(255,255,220,0)'); ctx.fillStyle = g; ctx.fillRect(x - 160, 0, 320, 200); });
      // pitch stripes with perspective
      const top = H * 0.2; for (let k = 0; k < 10; k++) { const y0 = top + (H - top) * Math.pow(k / 10, 1.4), y1 = top + (H - top) * Math.pow((k + 1) / 10, 1.4); ctx.fillStyle = k % 2 ? '#2d6a4f' : '#40916c'; ctx.fillRect(0, y0, W, y1 - y0 + 1); }
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - gw * 0.9, gy + 4); ctx.lineTo(gx + gw * 0.9, gy + 4); ctx.lineTo(gx + gw * 1.2, H * 0.62); ctx.lineTo(gx - gw * 1.2, H * 0.62); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(spot.x, spot.y + 8, 6, 3, 0, 0, 6.283); ctx.fill();
      // goal net
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(gx - gw / 2, gy - gh, gw, gh);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; for (let k = 0; k <= 20; k++) { ctx.beginPath(); ctx.moveTo(gx - gw / 2 + (gw * k) / 20, gy - gh); ctx.lineTo(gx - gw / 2 + (gw * k) / 20, gy); ctx.stroke(); } for (let k = 0; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(gx - gw / 2, gy - gh + (gh * k) / 8); ctx.lineTo(gx + gw / 2, gy - gh + (gh * k) / 8); ctx.stroke(); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(gx - gw / 2, gy); ctx.lineTo(gx - gw / 2, gy - gh); ctx.lineTo(gx + gw / 2, gy - gh); ctx.lineTo(gx + gw / 2, gy); ctx.stroke();
      if (!match) { drawPlayer(gx, gy, gh / 105, TEAMS[0].c, "gk"); return; }
      // keeper
      const kCol = match.turn === 'save' ? KITS[G.kit].c : TEAMS[opp].c, kp = toG(keeper.x, keeper.y * 0.7);
      ctx.save(); ctx.translate(kp.x, gy - keeper.y * gh * 0.5); ctx.rotate(keeper.x * keeper.dive * 1.1); drawPlayer(0, 0, gh / 105, kCol, "gk"); ctx.restore();
      // ball
      if (ball) {
        const k = K.ease.outQuad(Math.min(1, ball.t)), bxw = ball.tx + ball.curve * Math.sin(k * Math.PI) * 0 + ball.curve * k, gp = toG(bxw, ball.ty), x = K.lerp(spot.x, gp.x, k) + Math.sin(k * Math.PI) * ball.curve * -60, y = K.lerp(spot.y, gp.y, k) - Math.sin(k * Math.PI) * 40 * (1 - ball.ty * 0.3), r = K.lerp(16, 8, k);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, K.lerp(spot.y + 10, gy, k), r, r * 0.35, 0, 0, 6.283); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(tt * 10 * (ball.flying ? 1 : 0)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.fillStyle = '#1d1d1d'; for (let p = 0; p < 5; p++) { const a = (p / 5) * 6.283; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.22, 0, 6.283); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, 6.283); ctx.fill(); ctx.restore();
      }
      // kicker
      if (phase === 'shoot' || (phase === 'flight' && match.turn === 'shoot')) drawPlayer(spot.x - 50, spot.y + 30, 1.4, KITS[G.kit].c);
      else drawPlayer(spot.x - 50, spot.y + 30, 1.4, TEAMS[opp].c);
      if (swipe.length > 1) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); swipe.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); }
      K.fx.draw(ctx); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); });
    K.music.set({ bpm: 110, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], bass: true, busy: true, drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 0, 1, 0, 1, 0, 1, 0] }, arp: [1, 0, 0, 1, 0, 0, 1, 0], arpWave: 'square' });
    showMenu();
  }
})();

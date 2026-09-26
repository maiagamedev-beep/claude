/* Ink Swing — grapple-and-fling platformer drawn in pen ink with one orange accent. 60 levels. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Courier New", ui-monospace, monospace';
  const INK = '#1c1a17', PAPER = '#f3ede1', ACC = '#ff6a2b', WH = 800, GRAV = 1900;
  const HATS = [
    { id: 'none', n: ['Bare', 'Sem chapéu'], p: 0 }, { id: 'cap', n: ['Cap', 'Boné'], p: 300 }, { id: 'top', n: ['Top hat', 'Cartola'], p: 700 },
    { id: 'band', n: ['Headband', 'Faixa'], p: 500 }, { id: 'crown', n: ['Crown', 'Coroa'], p: 1500 }, { id: 'prop', n: ['Propeller', 'Hélice'], p: 1200 },
    { id: 'horns', n: ['Horns', 'Chifres'], gems: 25 }, { id: 'halo', n: ['Halo', 'Auréola'], gems: 40 },
  ];
  const ACCENTS = [
    { c: '#ff6a2b', p: 0 }, { c: '#2b7bff', p: 400 }, { c: '#1faa59', p: 400 }, { c: '#e0245e', p: 600 }, { c: '#8b3dff', p: 800 }, { c: '#f5b700', p: 800 }, { c: '#00a3a3', gems: 20 },
  ];
  const LEVELS = 60;

  K.boot('ink_swing', { g: { lvl: 0, best: {}, hat: 'none', hats: ['none'], acc: 0, accs: [0] } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, scale = 1;
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; scale = Math.min(h / (WH + 60), w / 620); });
    const accent = () => ACCENTS[G.acc].c;

    /* ---------- level generation ---------- */
    let L = null;
    function genLevel(i) {
      const r = K.rng(i * 977 + 13);
      const len = Math.min(9000, 2600 + i * 110);
      const lv = { pegs: [], pads: [], walls: [], coins: [], finish: len, start: { x: 120, y: 380 } };
      let x = 330;
      const diff = Math.min(1, i / 45);
      while (x < len - 300) {
        const kind = r();
        const y = lv.pegs.length === 0 ? 230 : 150 + r() * (200 + diff * 80);
        const moving = i >= 8 && r() < 0.15 + diff * 0.25;
        lv.pegs.push({ x, y, by: y, amp: moving ? 40 + r() * 70 : 0, ph: r() * 6, spd: 0.8 + r() * 1.2 });
        // coins arc toward next peg
        const gap = 240 + r() * (120 + diff * 170);
        if (r() < 0.7) for (let k = 1; k <= 3; k++) lv.coins.push({ x: x + (gap * k) / 4, y: y + 120 + Math.sin((k / 4) * Math.PI) * -90, got: false });
        if (i >= 2 && kind < 0.18 + diff * 0.12) { lv.pads.push({ x: x + gap * 0.3, y: WH - 90 - r() * 60 * diff, w: 110 - diff * 30, pow: 1.15 + r() * 0.2 }); }
        if (i >= 5 && kind > 0.82 - diff * 0.1) { const wy = r() < 0.5 ? 0 : WH * 0.62; lv.walls.push({ x: x + gap * 0.55, y: wy, w: 40, h: wy === 0 ? 120 + r() * 80 * diff : WH }); }
        x += gap;
      }
      lv.pegs.push({ x: len - 260, y: 240, by: 240, amp: 0, ph: 0, spd: 0 });
      return lv;
    }

    /* ---------- player ---------- */
    let P = null, playing = false, levelIdx = 0, runCoins = 0, flips = 0, spin = 0, spinAcc = 0, hookPeg = null, ropeLen = 0, holding = false, t0 = 0, dead = false, lastPeg = null, camX = 0, camY = 0, trail = [], won = false, contUsed = false;
    function startLevel(i) {
      levelIdx = i; L = genLevel(i);
      P = { x: L.start.x, y: L.start.y, vx: 380, vy: -200, ang: 0 };
      playing = true; dead = false; won = false; hookPeg = null; holding = false; runCoins = 0; flips = 0; spinAcc = 0; spin = 0; trail = []; t0 = performance.now(); lastPeg = null; contUsed = false;
      camX = P.x; camY = WH / 2;
      menu.style.display = 'none'; hud.style.display = ''; K.meta.setMenuButtonsVisible(false);
      K.game.start(); K.audio.play('whoosh');
      K.fx.text(W / 2, H * 0.3, K.t('level') + ' ' + (i + 1), { color: INK, stroke: PAPER, size: 44, life: 1.4 });
    }
    function pegPos(p, t) { p.y = p.by + Math.sin(t * p.spd + p.ph) * p.amp; return p; }
    function grab() {
      if (!playing || dead) return;
      let best = null, bs = 1e9;
      for (const p of L.pegs) {
        const dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy);
        if (d > 440 || dx < -60) continue;
        const s = d - dx * 0.6; // prefer pegs ahead
        if (s < bs) { bs = s; best = p; }
      }
      if (!best) return;
      hookPeg = best; ropeLen = Math.hypot(best.x - P.x, best.y - P.y); lastPeg = best;
      K.audio.play('swing', 1.2);
      K.meta.track('hooks', 1);
    }
    function release() {
      if (hookPeg) {
        hookPeg = null;
        const sp = Math.hypot(P.vx, P.vy);
        spin = K.clamp(P.vx / 260, -8, 8) * (P.vy < 0 ? 1.2 : 0.6);
        if (sp > 900) { K.fx.text(W / 2, H * 0.25, K.t(['WHOOSH!', 'VRUUM!']), { color: accent(), stroke: PAPER, size: 30, life: 0.8 }); }
        K.audio.play('whoosh', 1 + Math.min(0.6, sp / 3000));
      }
    }
    function fail() {
      if (dead) return;
      dead = true; playing = false; K.game.stop();
      K.audio.play('lose'); K.fx.shake(10); K.fx.flash(INK, 0.25);
      setTimeout(failPanel, 600);
    }
    function failPanel() {
      const prog = Math.round(K.clamp(P.x / L.finish, 0, 1) * 100);
      const body = `<p>${K.t(['You fell!', 'Você caiu!'])}</p><div class="prog"><i style="width:${prog}%"></i></div><p>${prog}%</p>`;
      const pnl = K.ui.panel({ title: K.t('level') + ' ' + (levelIdx + 1), body, closable: false });
      if (!contUsed) pnl.foot.appendChild(K.ui.adBtn(K.t(['Continue here', 'Continuar daqui']), () => { pnl.close(); cont(); }));
      pnl.foot.appendChild(K.ui.btn(K.t(['Retry', 'Tentar de novo']), '', () => { pnl.close(); K.meta.track('games', 1); K.meta.showPending(() => K.ads.midgame().then(() => startLevel(levelIdx))); }));
      pnl.foot.appendChild(K.ui.adBtn(K.t(['Skip level', 'Pular fase']), () => { pnl.close(); if (levelIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++; K.save.mark(); startLevel(Math.min(levelIdx + 1, LEVELS - 1)); }));
      pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pnl.close(); showMenu(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    function cont() {
      contUsed = true;
      const peg = lastPeg || L.pegs[0];
      P.x = peg.x - 60; P.y = peg.y + 80; P.vx = 300; P.vy = -300; dead = false; playing = true; hookPeg = null; holding = false;
      K.game.start(); K.audio.play('power');
    }
    function finish() {
      won = true; playing = false; K.game.stop(); K.game.happy();
      const time = (performance.now() - t0) / 1000;
      const best = G.best[levelIdx];
      const newBest = !best || time < best;
      if (newBest) G.best[levelIdx] = time;
      if (levelIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.save.mark(); K.meta.track('levels', 1); K.meta.addXp(15 + levelIdx);
      K.audio.play('win'); K.fx.flash('#fff', 0.5);
      for (let i = 0; i < 5; i++) setTimeout(() => K.fx.burst(K.rand(0, W), K.rand(0, H / 2), { n: 30, colors: [accent(), INK, '#fff'], speed: 400, shape: 'star', size: 8, life: 1.2 }), i * 120);
      const coins = runCoins + 20 + levelIdx * 3 + flips * 5;
      setTimeout(() => {
        const body = `<div class="kit-row"><div class="grow">${K.t(['Time', 'Tempo'])}</div><b>${time.toFixed(2)}s ${newBest ? '★' : ''}</b></div><div class="kit-row"><div class="grow">${K.t(['Flips', 'Mortais'])}</div><b>${flips}</b></div><div class="kit-big">${K.icon.coin} ${coins}</div>`;
        const pnl = K.ui.panel({ title: K.t(['Level clear!', 'Fase completa!']), body, closable: false });
        const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        let paid = false; const go = (m) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } pnl.close(); K.meta.showPending(() => K.ads.midgame().then(() => startLevel(Math.min(levelIdx + 1, LEVELS - 1)))); };
        pnl.foot.appendChild(K.ui.adBtn(K.t('x3'), () => go(3)));
        pnl.foot.appendChild(K.ui.btn(K.t(['Next', 'Próxima']), '', () => go(1)));
        pnl.panel.appendChild(pnl.foot);
      }, 800);
    }

    /* ---------- physics ---------- */
    let tt = 0;
    function physics(dt) {
      const steps = 3, h = dt / steps;
      for (let s = 0; s < steps; s++) {
        P.vy += GRAV * h;
        P.vx *= 1 - 0.02 * h; P.vy *= 1 - 0.02 * h;
        P.x += P.vx * h; P.y += P.vy * h;
        if (hookPeg) {
          const dx = P.x - hookPeg.x, dy = P.y - hookPeg.y, d = Math.hypot(dx, dy);
          ropeLen = Math.max(70, ropeLen - 60 * h); // gentle reel-in adds energy
          if (d > ropeLen) {
            const nx = dx / d, ny = dy / d;
            P.x = hookPeg.x + nx * ropeLen; P.y = hookPeg.y + ny * ropeLen;
            const vr = P.vx * nx + P.vy * ny;
            if (vr > 0) { P.vx -= vr * nx; P.vy -= vr * ny; }
            // swing boost: small tangential push in movement direction
            const tx = -ny, ty = nx, vt = P.vx * tx + P.vy * ty;
            P.vx += tx * Math.sign(vt) * 140 * h; P.vy += ty * Math.sign(vt) * 140 * h;
          }
        }
        for (const pd of L.pads) {
          if (P.x > pd.x - pd.w / 2 - 10 && P.x < pd.x + pd.w / 2 + 10 && P.y > pd.y - 14 && P.y < pd.y + 20 && P.vy > 0) {
            P.vy = -Math.max(900, Math.abs(P.vy) * pd.pow); P.vx = Math.max(P.vx, 350); P.y = pd.y - 15; pd.sq = 1;
            K.audio.play('jump', 0.8); K.fx.shake(4); spin = 6;
            K.meta.track('bounces', 1);
          }
        }
        for (const wl of L.walls) {
          if (P.x > wl.x - 12 && P.x < wl.x + wl.w + 12 && P.y > wl.y - 12 && P.y < wl.y + wl.h + 12) {
            const fromLeft = P.x < wl.x + wl.w / 2;
            const penX = fromLeft ? P.x - (wl.x - 12) : wl.x + wl.w + 12 - P.x;
            const top = wl.y === 0 ? wl.h + 12 - P.y : P.y - (wl.y - 12);
            if (penX < top) { P.x = fromLeft ? wl.x - 12 : wl.x + wl.w + 12; P.vx = -P.vx * 0.45; }
            else if (wl.y === 0) { P.y = wl.h + 12; P.vy = Math.abs(P.vy) * 0.4; } else { P.y = wl.y - 12; P.vy = -Math.abs(P.vy) * 0.6; }
            if (!hitWallT) { K.audio.play('thud'); K.fx.shake(5); hitWallT = 0.2; }
          }
        }
      }
      if (P.y < -300) P.vy = Math.abs(P.vy) * 0.2;
      if (P.y > WH + 80) fail();
      if (P.x >= L.finish) finish();
      // coins
      for (const c of L.coins) if (!c.got && Math.hypot(c.x - P.x, c.y - P.y) < 34) {
        c.got = true; runCoins += 2; K.meta.track('stars', 1); K.audio.play('coin', 1 + Math.random() * 0.2);
        const s = toScreen(c.x, c.y); K.fx.burst(s.x, s.y, { n: 10, colors: [accent(), INK], speed: 200, g: 0, shape: 'star', size: 5, life: 0.4 });
      }
      // body rotation / flips
      if (hookPeg) { const target = Math.atan2(hookPeg.y - P.y, hookPeg.x - P.x) + Math.PI / 2; P.ang = K.lerp(P.ang, target, Math.min(1, dt * 10)); spinAcc = 0; }
      else {
        const d = spin * dt; P.ang += d; spinAcc += d;
        spin *= Math.pow(0.6, dt);
        if (Math.abs(spinAcc) > Math.PI * 2) { spinAcc = 0; flips++; K.meta.track('flips', 1); K.audio.play('combo', 1.2); const s = toScreen(P.x, P.y); K.fx.text(s.x, s.y - 50, K.t(['FLIP!', 'MORTAL!']), { color: accent(), stroke: PAPER, size: 28 }); }
      }
      hitWallT = Math.max(0, hitWallT - dt);
      trail.push({ x: P.x, y: P.y }); if (trail.length > 26) trail.shift();
    }
    let hitWallT = 0;
    const toScreen = (x, y) => ({ x: (x - camX) * scale + W / 2, y: (y - camY) * scale + H / 2 });

    /* ---------- input ---------- */
    const down = () => { if (playing && !K.ui.anyOpen()) { holding = true; grab(); } };
    const up = () => { holding = false; release(); };
    cv.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) { e.preventDefault(); down(); } if (e.code === 'KeyR' && playing) startLevel(levelIdx); });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') up(); });

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Hold the mouse, screen or Space to hook onto the nearest ring and swing. Release to fly. Bounce on springs, avoid falling and reach the flag. R restarts.', pt: 'Segure o mouse, a tela ou Espaço para enganchar no anel mais próximo e balançar. Solte para voar. Pule nas molas, não caia e chegue à bandeira. R reinicia.' },
      missions: [
        { stat: 'levels', base: 3, reward: 90, text: { en: 'Clear {n} levels', pt: 'Complete {n} fases' } },
        { stat: 'flips', base: 10, reward: 80, text: { en: 'Do {n} flips', pt: 'Dê {n} mortais' } },
        { stat: 'stars', base: 40, reward: 70, text: { en: 'Collect {n} ink stars', pt: 'Pegue {n} estrelas' } },
        { stat: 'hooks', base: 80, reward: 60, text: { en: 'Hook {n} rings', pt: 'Enganche {n} anéis' } },
        { stat: 'bounces', base: 5, reward: 70, text: { en: 'Bounce on {n} springs', pt: 'Pule em {n} molas' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'hud'); K.ui.root.appendChild(hud);
    hud.innerHTML = '<div class="lvl"></div><div class="prog"><i></i></div><div class="coins"></div>';
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    function showMenu() {
      playing = false; K.game.stop();
      hud.style.display = 'none'; menu.style.display = ''; K.meta.setMenuButtonsVisible(true);
      menu.innerHTML = `<h1>Ink<br><span>Swing</span></h1><p class="sub">${K.t('level')} ${G.lvl + 1} / ${LEVELS}</p>`;
      const play = K.ui.btn(K.t('play'), 'big', () => startLevel(G.lvl)); play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', openLevels));
      row.appendChild(K.ui.btn('🎩 ' + K.t(['Style', 'Estilo']), '', openStyle));
      menu.appendChild(row);
      K.meta.showPending();
      if (!L) { L = genLevel(G.lvl); P = { x: 200, y: 300, vx: 0, vy: 0, ang: 0 }; camX = 400; camY = WH / 2; }
    }
    function openLevels() {
      const body = K.el('div', 'lvgrid');
      for (let i = 0; i < LEVELS; i++) {
        const b = K.el('button', 'lv' + (i > G.lvl ? ' lock' : '') + (i === G.lvl ? ' cur' : ''), `<b>${i + 1}</b><small>${G.best[i] ? G.best[i].toFixed(1) + 's' : ''}</small>`);
        b.onclick = () => { if (i > G.lvl) return K.audio.play('error'); pnl.close(); startLevel(i); };
        body.appendChild(b);
      }
      const pnl = K.ui.panel({ title: K.t(['Levels', 'Fases']), body, cls: 'wide' });
    }
    function openStyle() {
      const body = K.el('div');
      K.ui.panel({ title: K.t(['Style', 'Estilo']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        const g1 = K.el('div', 'kit-grid'), g2 = K.el('div', 'kit-grid');
        HATS.forEach((h) => {
          const own = G.hats.includes(h.id);
          const c = K.el('canvas'); c.width = 70; c.height = 70; const g = c.getContext('2d');
          g.translate(35, 45); drawHead(g, h.id, 16, 0, accent());
          const cell = K.el('div', 'kit-cell' + (G.hat === h.id ? ' on' : '')); cell.appendChild(c); cell.appendChild(K.el('div', '', K.t(h.n)));
          cell.appendChild(own ? K.ui.btn(G.hat === h.id ? '✓' : K.t('equip'), 'sm', () => { G.hat = h.id; K.save.mark(); render(); })
            : h.gems ? K.ui.btn(K.icon.gem + ' ' + h.gems, 'sm', () => { if (K.meta.spendGems(h.gems)) { G.hats.push(h.id); G.hat = h.id; K.save.mark(); render(); } })
              : K.ui.btn(K.icon.coin + ' ' + h.p, 'sm', () => { if (K.meta.spend(h.p)) { G.hats.push(h.id); G.hat = h.id; K.save.mark(); render(); } }));
          g1.appendChild(cell);
        });
        ACCENTS.forEach((a, i) => {
          const own = G.accs.includes(i);
          const cell = K.el('div', 'kit-cell' + (G.acc === i ? ' on' : ''), `<div style="width:44px;height:44px;border-radius:50%;background:${a.c};border:3px solid ${INK}"></div>`);
          cell.appendChild(own ? K.ui.btn(G.acc === i ? '✓' : K.t('equip'), 'sm', () => { G.acc = i; K.save.mark(); render(); })
            : a.gems ? K.ui.btn(K.icon.gem + ' ' + a.gems, 'sm', () => { if (K.meta.spendGems(a.gems)) { G.accs.push(i); G.acc = i; K.save.mark(); render(); } })
              : K.ui.btn(K.icon.coin + ' ' + a.p, 'sm', () => { if (K.meta.spend(a.p)) { G.accs.push(i); G.acc = i; K.save.mark(); render(); } }));
          g2.appendChild(cell);
        });
        body.appendChild(K.el('h3', '', K.t(['Hats', 'Chapéus']))); body.appendChild(g1);
        body.appendChild(K.el('h3', '', K.t(['Ink color', 'Cor da tinta']))); body.appendChild(g2);
      };
      render();
    }

    /* ---------- drawing ---------- */
    function wobbleLine(x1, y1, x2, y2, seed) {
      const mx = (x1 + x2) / 2 + Math.sin(seed) * 2, my = (y1 + y2) / 2 + Math.cos(seed * 1.3) * 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    }
    function hatch(x, y, w, h, gap) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.beginPath(); for (let i = -h; i < w; i += gap) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); } ctx.stroke(); ctx.restore();
    }
    function drawHead(g, hat, r, ang, acc) {
      g.save(); g.rotate(ang);
      g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(r * 0.35, -r * 0.1, 2.5, 0, 6.283); g.fill();
      g.fillStyle = acc;
      switch (hat) {
        case 'cap': g.beginPath(); g.arc(0, -r * 0.3, r, Math.PI, 0); g.fill(); g.fillRect(0, -r * 0.35, r * 1.6, 5); break;
        case 'top': g.fillStyle = INK; g.fillRect(-r, -r * 0.9, r * 2, 5); g.fillRect(-r * 0.65, -r * 2.2, r * 1.3, r * 1.35); g.fillStyle = acc; g.fillRect(-r * 0.65, -r * 1.2, r * 1.3, 5); break;
        case 'band': g.fillRect(-r, -r * 0.55, r * 2, 6); g.beginPath(); g.moveTo(-r, -r * 0.5); g.lineTo(-r * 1.8, -r * 0.2); g.lineTo(-r * 1.6, r * 0.1); g.fill(); break;
        case 'crown': g.fillStyle = '#f5b700'; g.beginPath(); g.moveTo(-r, -r * 0.7); g.lineTo(-r, -r * 1.6); g.lineTo(-r * 0.5, -r * 1.1); g.lineTo(0, -r * 1.8); g.lineTo(r * 0.5, -r * 1.1); g.lineTo(r, -r * 1.6); g.lineTo(r, -r * 0.7); g.closePath(); g.fill(); g.stroke(); break;
        case 'prop': g.beginPath(); g.arc(0, -r * 0.5, r * 0.9, Math.PI, 0); g.fill(); g.strokeStyle = INK; g.beginPath(); g.moveTo(0, -r * 1.4); g.lineTo(0, -r * 1.8); g.stroke(); const s = Math.sin(performance.now() / 40); g.beginPath(); g.moveTo(-r * s, -r * 1.85); g.lineTo(r * s, -r * 1.85); g.stroke(); break;
        case 'horns': g.fillStyle = INK; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * r * 0.4, -r * 0.8); g.quadraticCurveTo(k * r * 1.2, -r * 1.3, k * r * 1.1, -r * 1.9); g.lineTo(k * r * 0.8, -r * 0.7); g.fill(); } break;
        case 'halo': g.strokeStyle = '#f5b700'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -r * 1.6, r * 0.9, r * 0.3, 0, 0, 6.283); g.stroke(); break;
      }
      g.restore();
    }
    function drawStick(x, y, ang, t) {
      const acc = accent(), sp = Math.hypot(P.vx, P.vy);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const flail = Math.sin(t * 18) * Math.min(1, sp / 900);
      // legs
      wobbleLine(0, 8, -9 + flail * 6, 30, 1); wobbleLine(-9 + flail * 6, 30, -6 + flail * 10, 44, 2);
      wobbleLine(0, 8, 9 - flail * 6, 30, 3); wobbleLine(9 - flail * 6, 30, 12 - flail * 8, 42, 4);
      // body
      wobbleLine(0, -14, 0, 8, 5);
      // arms: one reaches up while hooked
      if (hookPeg) { wobbleLine(0, -10, 0, -34, 6); wobbleLine(0, -10, -16, 2 + flail * 8, 7); }
      else { wobbleLine(0, -10, -16, -18 + flail * 12, 6); wobbleLine(0, -10, 16, -16 - flail * 12, 7); }
      // scarf
      ctx.strokeStyle = acc; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(-14, -16 + flail * 6, -26 - Math.min(20, sp / 60), -10 + flail * 10); ctx.stroke();
      ctx.translate(0, -26); drawHead(ctx, G.hat, 11, 0, acc);
      ctx.restore();
    }
    K.loop((dt) => {
      tt += dt;
      if (playing && P) physics(dt);
      if (L) L.pegs.forEach((p) => pegPos(p, tt));
      if (L) L.pads.forEach((p) => (p.sq = Math.max(0, (p.sq || 0) - dt * 4)));
      if (P) {
        const lead = K.clamp(P.vx * 0.25, -80, 220);
        camX = K.lerp(camX, P.x + lead, Math.min(1, dt * 5));
        const halfH = H / 2 / scale;
        camY = K.lerp(camY, K.clamp(P.y, halfH - 60, WH + 40 - halfH), Math.min(1, dt * 3));
        if (halfH * 2 > WH + 100) camY = WH / 2 - 20;
      }
      K.fx.update(dt);
      if (playing) { hud.querySelector('.lvl').textContent = K.t('level') + ' ' + (levelIdx + 1); hud.querySelector('.prog i').style.width = K.clamp((P.x / L.finish) * 100, 0, 100) + '%'; hud.querySelector('.coins').textContent = '★ ' + runCoins; }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
      if (!L) return;
      ctx.save(); ctx.translate(W / 2 + K.fx.shakeX, H / 2 + K.fx.shakeY); ctx.scale(scale, scale); ctx.translate(-camX, -camY);
      const vx0 = camX - W / 2 / scale - 100, vx1 = camX + W / 2 / scale + 100;
      // background parallax doodles: distant hills in hatching
      ctx.save(); ctx.strokeStyle = 'rgba(28,26,23,.12)'; ctx.lineWidth = 2;
      const px = camX * 0.5;
      for (let i = Math.floor((vx0 - px) / 400) - 1; i < (vx1 - px) / 400 + 1; i++) {
        const hx = i * 400 + px, hh = 120 + ((i * 7919) % 5) * 30;
        ctx.beginPath(); ctx.moveTo(hx - 250, WH + 40); ctx.quadraticCurveTo(hx, WH - hh * 2, hx + 250, WH + 40); ctx.stroke();
      }
      ctx.restore();
      // ruled lines like a notebook
      ctx.strokeStyle = 'rgba(28,26,23,.06)'; ctx.lineWidth = 1;
      for (let y = 0; y < WH + 100; y += 40) { ctx.beginPath(); ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); ctx.stroke(); }
      // death floor: ink puddle
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(vx0, WH + 60);
      for (let x = vx0; x < vx1; x += 30) ctx.lineTo(x, WH + 52 + Math.sin(x * 0.02 + tt * 2) * 6);
      ctx.lineTo(vx1, WH + 400); ctx.lineTo(vx0, WH + 400); ctx.fill();
      // walls
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      for (const w of L.walls) { if (w.x > vx1 || w.x + w.w < vx0) continue; ctx.fillStyle = PAPER; ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h); ctx.lineWidth = 1.5; hatch(w.x, w.y, w.w, w.h, 8); ctx.lineWidth = 3; }
      // pads (springs)
      for (const p of L.pads) {
        if (p.x > vx1 || p.x < vx0) continue;
        const sq = p.sq || 0, top = p.y - 6 + sq * 10;
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(p.x - 20 + (i % 2) * 40, top + 8 + (i * (WH + 60 - top - 8)) / 6); ctx.stroke();
        ctx.fillStyle = accent(); ctx.fillRect(p.x - p.w / 2, top - 8, p.w, 14); ctx.strokeRect(p.x - p.w / 2, top - 8, p.w, 14);
      }
      // coins as ink stars
      for (const c of L.coins) { if (c.got || c.x < vx0 || c.x > vx1) continue; ctx.save(); ctx.translate(c.x, c.y + Math.sin(tt * 3 + c.x) * 4); ctx.rotate(tt); ctx.fillStyle = accent(); ctx.strokeStyle = INK; ctx.lineWidth = 2; K.draw.star(ctx, 0, 0, 13, 6, 5); ctx.fill(); ctx.stroke(); ctx.restore(); }
      // pegs
      let hint = null;
      if (playing && !hookPeg) { let bs = 1e9; for (const p of L.pegs) { const dx = p.x - P.x, d = Math.hypot(dx, p.y - P.y); if (d > 440 || dx < -60) continue; const s = d - dx * 0.6; if (s < bs) { bs = s; hint = p; } } }
      for (const p of L.pegs) {
        if (p.x < vx0 || p.x > vx1) continue;
        if (p.amp) { ctx.strokeStyle = 'rgba(28,26,23,.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(p.x, p.by - p.amp); ctx.lineTo(p.x, p.by + p.amp); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 6.283); ctx.fillStyle = p === hookPeg || p === hint ? accent() : INK; ctx.fill();
        if (p === hint) { ctx.strokeStyle = accent(); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 22 + Math.sin(tt * 8) * 3, 0, 6.283); ctx.stroke(); }
      }
      // finish flag
      const fx = L.finish;
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, WH + 50); ctx.lineTo(fx, 80); ctx.stroke();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { ctx.fillStyle = (r + c) % 2 ? INK : PAPER; ctx.fillRect(fx + c * 22, 80 + r * 18 + Math.sin(tt * 4 + c) * 3, 22, 18); }
      ctx.strokeRect(fx, 80, 66, 72);
      if (P) {
        // trail
        ctx.strokeStyle = accent(); ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) { ctx.globalAlpha = i / trail.length * 0.5; ctx.lineWidth = (i / trail.length) * 8; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke(); }
        ctx.globalAlpha = 1;
        if (hookPeg) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hookPeg.x, hookPeg.y); const hx = P.x + Math.sin(P.ang) * 34, hy = P.y - Math.cos(P.ang) * 34; ctx.lineTo(hx, hy); ctx.stroke(); }
        if (playing || won || dead || menu.style.display === 'none') drawStick(P.x, P.y, P.ang, tt);
      }
      ctx.restore();
      // speed lines
      if (playing && Math.hypot(P.vx, P.vy) > 1100) { ctx.strokeStyle = 'rgba(28,26,23,.25)'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const y = Math.random() * H, x = Math.random() * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 80, y); ctx.stroke(); } }
      K.fx.draw(ctx);
      K.draw.grain(ctx, 0.06);
      K.fx.drawFlash(ctx, W * DPR, H * DPR);
    });

    K.music.set({ bpm: 128, chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], bass: true, busy: true, arp: [1, 0, 1, 0, 1, 1, 0, 1], arpWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 1, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    K.debug = () => ({ P, L, hookPeg, playing, dead, won, levelIdx, start: startLevel });
    showMenu();
  }
})();

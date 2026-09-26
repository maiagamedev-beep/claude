/* Sky Hopper — bounce ever higher on platforms. Tilt with arrows/drag, springs, rockets, moving and crumbling ledges. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif';
  const HEROES = [{ n: ['Blob', 'Bolha'], c: '#8ac926', p: 0 }, { n: ['Sunny', 'Solzinho'], c: '#ffca3a', p: 300 }, { n: ['Berry', 'Amora'], c: '#ff595e', p: 500 }, { n: ['Aqua', 'Água'], c: '#1982c4', p: 800 }, { n: ['Grape', 'Uva'], c: '#6a4c93', p: 1100 }, { n: ['Ghost', 'Fantasminha'], c: '#f1faee', p: 1500 }, { n: ['Gold', 'Ouro'], c: '#ffd166', gems: 30 }];

  K.boot('sky_hopper', { g: { best: 0, hero: 0, heroes: [0] } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, GW = 400, gx = 0, S = 1;
    let P = null, plats = [], items = [], monsters = [], camY = 0, maxH = 0, playing = false, revived = false, runCoins = 0, rocket = 0, tilt = 0, face = 1, squash = 0;
    function start() {
      P = { x: GW / 2, y: -40, vx: 0, vy: -900 }; plats = []; items = []; monsters = []; camY = 0; maxH = 0; runCoins = 0; rocket = 0; revived = false;
      for (let y = 0; y > -H * 2; y -= 70) addPlat(y);
      plats.push({ x: GW / 2 - 35, y: 0, w: 70, t: 'n' });
      playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start();
    }
    let topY = 0;
    function addPlat(y) {
      const h = -y, diff = Math.min(1, h / 20000), r = Math.random();
      const t = h < 600 ? 'n' : r < 0.1 + diff * 0.2 ? 'm' : r < 0.18 + diff * 0.2 ? 'c' : 'n';
      const p = { x: K.rand(10, GW - 80), y, w: 70, t, dir: Math.random() < 0.5 ? -1 : 1, gone: 0 };
      plats.push(p);
      if (t === 'n' && Math.random() < 0.08) items.push({ x: p.x + 45, y: y - 14, k: 'spring', p });
      else if (t === 'n' && Math.random() < 0.012 + diff * 0.01) items.push({ x: p.x + 35, y: y - 26, k: 'rocket', p });
      else if (Math.random() < 0.25) items.push({ x: p.x + 35, y: y - 40, k: 'coin' });
      if (h > 2500 && Math.random() < 0.02 + diff * 0.04) monsters.push({ x: K.rand(40, GW - 40), y: y - 60, ph: Math.random() * 6 });
      topY = y;
    }
    function die(text) {
      if (!playing) return;
      playing = false; K.game.stop(); K.audio.play('lose'); K.fx.shake(8);
      const sc = Math.floor(maxH / 10); K.meta.track('games', 1); const nb = sc > G.best; if (nb) G.best = sc; K.save.mark(); K.meta.addXp(Math.floor(sc / 100));
      setTimeout(() => K.std.end({ newBest: nb, text, rows: [[K.t(['Height', 'Altura']), sc], [K.t('best'), G.best]], coins: runCoins + Math.floor(sc / 50),
        revive: revived ? null : () => { revived = true; P.y = camY + H * 0.4; P.vy = -1500; rocket = 1.5; monsters = monsters.filter((m) => Math.abs(m.y - P.y) > 400); playing = true; K.game.start(); }, reviveLabel: K.t(['Rocket rescue', 'Resgate de foguete']), restart: start, menu: showMenu }), 900);
    }
    const keys = {};
    window.addEventListener('keydown', (e) => (keys[e.code] = true)); window.addEventListener('keyup', (e) => (keys[e.code] = false));
    let touchX = null;
    cv.addEventListener('pointerdown', (e) => { touchX = e.clientX; }); window.addEventListener('pointermove', (e) => { if (touchX !== null || e.pointerType === 'mouse') touchX = e.clientX; }); window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') touchX = null; });
    function update(dt) {
      if (!playing) return;
      let ax = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      if (!ax && touchX !== null) { const px = gx + P.x * S; ax = K.clamp((touchX - px) / 60, -1, 1); }
      P.vx = K.lerp(P.vx, ax * 420, Math.min(1, dt * 10)); if (Math.abs(ax) > 0.1) face = Math.sign(ax);
      if (rocket > 0) { rocket -= dt; P.vy = -1400; if (Math.random() < 0.6) K.fx.burst(gx + P.x * S, (P.y - camY) * S + 30, { n: 2, colors: ['#ff595e', '#ffca3a', '#fff'], speed: 120, angle: Math.PI / 2, spread: 0.4, g: 0, size: 5, life: 0.4 }); }
      else P.vy += 1800 * dt;
      P.x += P.vx * dt; P.y += P.vy * dt;
      if (P.x < -20) P.x = GW + 20; if (P.x > GW + 20) P.x = -20;
      if (P.vy > 0 && rocket <= 0) for (const p of plats) {
        if (p.gone) continue;
        if (P.x > p.x - 12 && P.x < p.x + p.w + 12 && P.y >= p.y - 2 && P.y - P.vy * dt <= p.y + 4) {
          if (p.t === 'c') { p.gone = 1; K.audio.play('hit', 1.3); continue; }
          P.vy = -900; P.y = p.y; squash = 1; K.audio.play('jump', 1 + Math.random() * 0.2); K.meta.track('jumps', 1);
          break;
        }
      }
      for (const it of items) {
        if (it.got) continue; const iy = it.p ? it.p.y - (it.k === 'spring' ? 14 : 26) : it.y, ix = it.p ? it.p.x + (it.k === 'spring' ? 45 : 35) : it.x;
        if (Math.abs(P.x - ix) < 26 && Math.abs(P.y - iy) < 30) {
          if (it.k === 'coin') { it.got = true; runCoins++; K.meta.track('coins', 1); K.audio.play('coin', 1.2); }
          else if (it.k === 'spring' && P.vy > 0) { P.vy = -1600; it.boing = 1; K.audio.play('jump', 0.6); K.fx.text(gx + P.x * S, (P.y - camY) * S - 30, K.t(['BOING!', 'BOING!']), { color: '#ff595e', stroke: '#fff', size: 26 }); K.meta.track('springs', 1); }
          else if (it.k === 'rocket') { it.got = true; rocket = 2.6; K.audio.play('power'); K.game.happy(); K.meta.track('rockets', 1); }
        }
      }
      for (const m of monsters) {
        if (m.dead) continue; m.x += Math.sin(Date.now() / 600 + m.ph) * 40 * dt;
        if (Math.abs(P.x - m.x) < 34 && Math.abs(P.y - m.y) < 34) {
          if (P.vy > 0 || rocket > 0) { m.dead = true; P.vy = -1100; K.audio.play('pop', 0.7); K.fx.burst(gx + m.x * S, (m.y - camY) * S, { n: 20, colors: ['#6a4c93', '#fff'], speed: 250, size: 6 }); K.meta.track('stomps', 1); }
          else return die(K.t(['A cloud monster got you!', 'Um monstro-nuvem te pegou!']));
        }
      }
      plats.forEach((p) => { if (p.t === 'm') { p.x += p.dir * 80 * dt; if (p.x < 0 || p.x > GW - p.w) p.dir *= -1; } if (p.gone) p.gone += dt; });
      const h = -P.y; if (h > maxH) { const before = Math.floor(maxH / 10000); maxH = h; if (Math.floor(maxH / 10000) > before) { K.audio.play('levelup'); K.fx.text(W / 2, H * 0.3, Math.floor(maxH / 10) + '!', { color: '#ff595e', stroke: '#fff', size: 44 }); } K.meta.trackMax('height', Math.floor(maxH / 10)); }
      const target = P.y - H / S * 0.45; if (target < camY) camY = target;
      while (topY > camY - 200) addPlat(topY - K.rand(55, 70 + Math.min(70, maxH / 400)));
      plats = plats.filter((p) => p.y < camY + H / S + 100); items = items.filter((i) => (i.p ? i.p.y : i.y) < camY + H / S + 100); monsters = monsters.filter((m) => m.y < camY + H / S + 100);
      if (P.y > camY + H / S + 60) die(K.t(['You fell!', 'Você caiu!']));
      squash = Math.max(0, squash - dt * 5);
    }

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Move left/right with the arrow keys/A-D, or hold/drag where you want to go. Bounce on platforms to climb, use springs and rockets, stomp cloud monsters from above. Crumbly ledges break!', pt: 'Mova com as setas/A-D, ou segure/arraste para onde quer ir. Pule nas plataformas para subir, use molas e foguetes, pise nos monstros-nuvem por cima. Plataformas rachadas quebram!' },
      missions: [{ stat: 'height', base: 1500, type: 'max', cap: 20000, reward: 110, text: { en: 'Reach height {n}', pt: 'Chegue à altura {n}' } }, { stat: 'jumps', base: 200, reward: 70, text: { en: 'Bounce {n} times', pt: 'Pule {n} vezes' } }, { stat: 'stomps', base: 3, reward: 90, text: { en: 'Stomp {n} monsters', pt: 'Pise em {n} monstros' } }, { stat: 'rockets', base: 2, reward: 80, text: { en: 'Ride {n} rockets', pt: 'Use {n} foguetes' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Sky<span>Hopper</span>', sub: K.t('best') + ': ' + G.best, onPlay: start, buttons: [K.ui.btn('☺ ' + K.t(['Heroes', 'Heróis']), '', () => K.std.shop(K.t(['Heroes', 'Heróis']), HEROES.map((h, i) => ({ id: i, name: K.t(h.n), price: h.p, gems: h.gems, html: `<div style="width:40px;height:40px;border-radius:50% 50% 45% 45%;background:${h.c};border:3px solid #2b2b2b"></div>` })), { owned: G.heroes, get: () => G.hero, set: (i) => (G.hero = i) }))] });
      if (!P) { P = { x: GW / 2, y: -40, vx: 0, vy: 0 }; for (let y = 0; y > -1600; y -= 70) addPlat(y); }
    }
    function crayonRect(x, y, w, h, col) { ctx.fillStyle = col; K.draw.rrect(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 8, y + 4); ctx.lineTo(x + w - 10, y + 4); ctx.stroke(); }
    let tt = 0;
    K.loop((dt) => { tt += dt; update(dt); K.fx.update(dt); if (playing) hud.innerHTML = `<span class="big">${Math.floor(maxH / 10)}</span><span class="chip">● ${runCoins}</span>`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = '#fdfcf5'; ctx.fillRect(0, 0, W, H);
      // graph paper that scrolls
      const off = (-camY * S) % 24;
      ctx.strokeStyle = 'rgba(80,140,220,.18)'; ctx.lineWidth = 1;
      for (let y = off - 24; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(230,80,80,.3)'; ctx.beginPath(); ctx.moveTo(gx - 10, 0); ctx.lineTo(gx - 10, H); ctx.stroke();
      if (!P) return;
      ctx.save(); ctx.translate(gx + K.fx.shakeX, K.fx.shakeY); ctx.scale(S, S); ctx.translate(0, -camY);
      for (const p of plats) {
        if (p.gone) { ctx.globalAlpha = Math.max(0, 1 - p.gone * 2); crayonRect(p.x - p.gone * 20, p.y + p.gone * 200, p.w / 2, 14, '#b08968'); crayonRect(p.x + p.w / 2 + p.gone * 20, p.y + p.gone * 220, p.w / 2, 14, '#b08968'); ctx.globalAlpha = 1; continue; }
        crayonRect(p.x, p.y, p.w, 14, p.t === 'm' ? '#48cae4' : p.t === 'c' ? '#b08968' : '#8ac926');
        if (p.t === 'c') { ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x + 30, p.y); ctx.lineTo(p.x + 36, p.y + 7); ctx.lineTo(p.x + 32, p.y + 14); ctx.stroke(); }
      }
      for (const it of items) {
        if (it.got) continue; const ix = it.p ? it.p.x + (it.k === 'spring' ? 45 : 35) : it.x, iy = it.p ? it.p.y - (it.k === 'spring' ? 14 : 26) : it.y;
        if (it.k === 'coin') { const sq = Math.abs(Math.sin(tt * 4 + ix)); ctx.fillStyle = '#ffca3a'; ctx.beginPath(); ctx.ellipse(ix, iy, 11 * sq + 2, 11, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.stroke(); }
        if (it.k === 'spring') { const b = it.boing || 0; it.boing = Math.max(0, b - 0.05); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let k = 0; k <= 4; k++) ctx.lineTo(ix - 8 + (k % 2) * 16, iy + 12 - k * (3 + b * 3)); ctx.stroke(); ctx.fillStyle = '#ff595e'; ctx.fillRect(ix - 12, iy - 2 - b * 12, 24, 5); }
        if (it.k === 'rocket') { ctx.fillStyle = '#e5e5e5'; K.draw.rrect(ctx, ix - 9, iy - 18, 18, 32, 8); ctx.fill(); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#ff595e'; ctx.beginPath(); ctx.moveTo(ix - 9, iy - 8); ctx.lineTo(ix, iy - 26); ctx.lineTo(ix + 9, iy - 8); ctx.fill(); ctx.stroke(); }
      }
      for (const m of monsters) { if (m.dead) continue; const bob = Math.sin(tt * 4 + m.ph) * 4; ctx.fillStyle = '#6a4c93'; ctx.beginPath(); for (let k = 0; k < 6; k++) ctx.arc(m.x - 22 + k * 9, m.y + bob + (k % 2 ? -4 : 2), 13, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x - 8, m.y + bob - 2, 5, 0, 6.283); ctx.arc(m.x + 8, m.y + bob - 2, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(m.x - 8 + Math.sign(P.x - m.x) * 2, m.y + bob - 2, 2.5, 0, 6.283); ctx.arc(m.x + 8 + Math.sign(P.x - m.x) * 2, m.y + bob - 2, 2.5, 0, 6.283); ctx.fill(); }
      // hero
      const Hc = HEROES[G.hero].c, sq = squash, x = P.x, y = P.y;
      ctx.save(); ctx.translate(x, y - 20); ctx.scale(face * (1 + sq * 0.25), 1 - sq * 0.25);
      if (rocket > 0) { ctx.fillStyle = '#e5e5e5'; K.draw.rrect(ctx, -26, -10, 12, 26, 5); ctx.fill(); ctx.fillStyle = '#ffca3a'; ctx.beginPath(); ctx.moveTo(-26, 16); ctx.lineTo(-20, 30 + Math.random() * 10); ctx.lineTo(-14, 16); ctx.fill(); }
      ctx.fillStyle = Hc; ctx.beginPath(); ctx.moveTo(-18, 18); ctx.quadraticCurveTo(-22, -20, 0, -22); ctx.quadraticCurveTo(22, -20, 18, 18); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4, -6, 6, 0, 6.283); ctx.arc(14, -6, 5, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(6, -5, 2.5, 0, 6.283); ctx.arc(15, -5, 2.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(10, 5, 4, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, 18); ctx.lineTo(-10, 26); ctx.moveTo(8, 18); ctx.lineTo(10, 26); ctx.stroke();
      ctx.restore();
      ctx.restore();
      K.fx.draw(ctx); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; S = Math.min(w / 400, 1.4); GW = Math.min(400, w / S); gx = (w - GW * S) / 2; });
    K.music.set({ bpm: 132, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], bass: true, arp: [1, 1, 0, 1, 1, 0, 1, 0], arpWave: 'square', lead: [72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 76, 0, 72, 0], leadWave: 'triangle', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

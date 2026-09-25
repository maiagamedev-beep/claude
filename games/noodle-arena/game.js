/* Noodle Arena — grow your noodle, cut off rivals. Gouache-paint look on warm paper. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const WORLD = 2600;
  const PAL = ['#f25f5c', '#ffe066', '#247ba0', '#70c1b3', '#50514f', '#ff9f1c', '#cbf3f0', '#2ec4b6', '#e71d36', '#9b5de5', '#f15bb5', '#fee440', '#00bbf9', '#00f5d4', '#8ac926', '#ff595e', '#6a4c93', '#1982c4', '#ffca3a', '#ffffff'];
  const SKINS = [
    { c: ['#f25f5c', '#ffe066'], p: 0 }, { c: ['#70c1b3', '#247ba0'], p: 0 }, { c: ['#ff9f1c', '#ffbf69', '#ffffff'], p: 300 },
    { c: ['#9b5de5', '#f15bb5', '#fee440'], p: 500 }, { c: ['#00bbf9', '#00f5d4'], p: 500 }, { c: ['#8ac926', '#ffca3a'], p: 700 },
    { c: ['#e71d36', '#ffffff', '#e71d36', '#2b2d42'], p: 900 }, { c: ['#50514f', '#f4f1bb'], p: 900 }, { c: ['#6a4c93', '#1982c4', '#8ac926', '#ffca3a', '#ff595e'], p: 1500 },
    { c: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], p: 1800 }, { c: ['#ffffff', '#ff5d8f'], p: 1200 }, { c: ['#222222', '#fcbf49'], p: 1500 },
    { c: ['#ff006e', '#fb5607', '#ffbe0b', '#3a86ff', '#8338ec'], p: 2500 }, { c: ['#588157', '#a3b18a', '#dad7cd'], p: 2000 }, { c: ['#003049', '#d62828', '#f77f00', '#fcbf49'], p: 3000 },
    { c: ['#f4acb7', '#ffe5d9', '#9d8189'], p: 3000, gems: 0 }, { c: ['#10002b', '#7b2cbf', '#e0aaff'], gems: 30 }, { c: ['#ffd60a', '#000814'], gems: 40 },
    { c: ['#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'], gems: 60 }, { c: ['#ffffff', '#ffffff', '#f25f5c'], gems: 80 },
  ];
  const UPG = [
    { id: 'start', n: ['Start size', 'Tamanho inicial'], max: 10, base: 120 },
    { id: 'magnet', n: ['Food magnet', 'Ímã de comida'], max: 10, base: 150 },
    { id: 'boost', n: ['Boost efficiency', 'Eficiência do turbo'], max: 8, base: 200 },
    { id: 'value', n: ['Food value', 'Valor da comida'], max: 10, base: 180 },
    { id: 'coin', n: ['Coin bonus', 'Bônus de moedas'], max: 10, base: 250 },
  ];
  const NAMES = ['Ramen Rex', 'Udon Knot', 'Sobaworm', 'Macaroni', 'Fusilli', 'Lo Mein', 'Pho Real', 'Tagliatella', 'Spaghetto', 'Penne Pal', 'Wiggles', 'Linguine', 'Rigatoni', 'Noodlini', 'Ziti Zoom', 'Orzo', 'Vermicelli', 'Gnocchi', 'Capellini', 'Farfalle', 'Big Bowl', 'Slurp', 'Chopstix', 'Brothy', 'Miso Moe'];

  K.boot('noodle_arena', { g: { best: 0, skin: 0, owned: [0, 1], up: { start: 0, magnet: 0, boost: 0, value: 0, coin: 0 }, games: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; }, 1.5);

    /* ---------- background: gouache paper tile ---------- */
    const bgTile = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d'); const r = K.rng(9);
      g.fillStyle = '#f3e9d2'; g.fillRect(0, 0, 512, 512);
      const cols = ['rgba(242,95,92,.06)', 'rgba(112,193,179,.08)', 'rgba(255,224,102,.12)', 'rgba(36,123,160,.04)'];
      for (let i = 0; i < 22; i++) {
        g.fillStyle = cols[i % 4]; const x = r() * 512, y = r() * 512, s = 20 + r() * 60;
        g.beginPath(); for (let k = 0; k <= 12; k++) { const a = (k / 12) * 6.283, rr = s * (0.8 + r() * 0.4); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
      }
      g.strokeStyle = 'rgba(80,81,79,.07)'; g.lineWidth = 2;
      for (let i = 0; i < 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      return c;
    })();
    const bgPat = ctx.createPattern(bgTile, 'repeat');

    /* ---------- world state ---------- */
    let worms = [], food = [], player = null, cam = { x: 0, y: 0, z: 1 }, playing = false, deadT = 0, runKills = 0, revived = false, runTime = 0, maxLen = 0;
    const segR = (w) => Math.min(34, 9 + Math.sqrt(w.len) * 0.9);
    function makeWorm(x, y, len, skin, name, bot) {
      const w = { x, y, a: Math.random() * 6.283, ta: 0, len, skin, name, bot, alive: true, boost: false, pts: [], kills: 0, think: 0, aggro: Math.random(), turnBias: 0 };
      w.ta = w.a;
      for (let i = 0; i < len; i++) w.pts.push({ x: x - Math.cos(w.a) * i * 5, y: y - Math.sin(w.a) * i * 5 });
      worms.push(w); return w;
    }
    function addFood(x, y, v, col) { if (food.length > 1400) food.shift(); food.push({ x, y, v, r: 4.5 + v * 1.8, col: col || K.pick(PAL), ph: Math.random() * 6, vx: 0, vy: 0 }); }
    function randPos(m) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * (WORLD - (m || 200)); return [Math.cos(a) * d, Math.sin(a) * d]; }
    function spawnBot() {
      let p; for (let k = 0; k < 20; k++) { p = randPos(); if (!player || K.dist(p[0], p[1], player.x, player.y) > 700) break; }
      const len = Math.floor(K.rand(12, 60) + (runTime > 60 ? K.rand(0, 120) : 0));
      makeWorm(p[0], p[1], len, Math.floor(Math.random() * SKINS.length), K.pick(NAMES), true);
    }
    function reset() {
      worms = []; food = []; K.fx.clear(); runKills = 0; revived = false; runTime = 0;
      for (let i = 0; i < 700; i++) { const p = randPos(20); addFood(p[0], p[1], Math.random() < 0.9 ? 1 : 3); }
      player = makeWorm(0, 0, 20 + G.up.start * 8 + startBonus, G.skin, K.t(['You', 'Você']), false);
      startBonus = 0;
      for (let i = 0; i < 22; i++) spawnBot();
      maxLen = player.len;
      cam.x = 0; cam.y = 0;
    }
    let startBonus = 0;

    /* ---------- spatial hash for bodies ---------- */
    const CELL = 80; let hash = new Map();
    const hk = (cx, cy) => cx * 73856093 ^ cy * 19349663;
    function buildHash() {
      hash = new Map();
      for (const w of worms) {
        if (!w.alive) continue;
        const r = segR(w);
        for (let i = 0; i < w.pts.length; i += 2) {
          const p = w.pts[i], k = hk(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
          let b = hash.get(k); if (!b) hash.set(k, (b = [])); b.push(w, p, r);
        }
      }
    }
    function hitBody(x, y, r, self) {
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const b = hash.get(hk(cx + i, cy + j)); if (!b) continue;
        for (let k = 0; k < b.length; k += 3) {
          const w = b[k]; if (w === self) continue;
          const p = b[k + 1], rr = b[k + 2] * 0.9 + r * 0.6;
          const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy < rr * rr) return w;
        }
      }
      return null;
    }

    /* ---------- update ---------- */
    function steer(w, dt) {
      let d = w.ta - w.a; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
      const turn = (4.2 - Math.min(2.2, w.len / 300)) * dt;
      w.a += K.clamp(d, -turn, turn);
    }
    function botThink(w) {
      const r = segR(w), look = 90 + r * 3;
      // danger ahead?
      for (const off of [0, -0.5, 0.5]) {
        const ax = w.x + Math.cos(w.a + off) * look, ay = w.y + Math.sin(w.a + off) * look;
        if (hitBody(ax, ay, r, w) || Math.hypot(ax, ay) > WORLD - 60) { w.ta = w.a + (off <= 0 ? 1.6 : -1.6) * (Math.random() < 0.5 ? 1 : 1); w.boost = w.len > 40 && Math.random() < 0.3; w.think = 0.25; return; }
      }
      w.boost = false;
      // aggressive: cut in front of player
      if (player && player.alive && w.aggro > 0.6 && w.len > player.len * 0.6) {
        const dp = K.dist(w.x, w.y, player.x, player.y);
        if (dp < 380) {
          const tx = player.x + Math.cos(player.a) * 140, ty = player.y + Math.sin(player.a) * 140;
          w.ta = Math.atan2(ty - w.y, tx - w.x); w.boost = dp < 220 && w.len > 30; w.think = 0.2; return;
        }
      }
      // go to best food nearby
      let best = null, bs = 0;
      for (let i = 0; i < food.length; i += 3) {
        const f = food[i], d = Math.abs(f.x - w.x) + Math.abs(f.y - w.y);
        if (d < 450) { const sc = f.v / (d + 30); if (sc > bs) { bs = sc; best = f; } }
      }
      if (best) w.ta = Math.atan2(best.y - w.y, best.x - w.x);
      else w.ta += K.rand(-0.8, 0.8);
      if (Math.hypot(w.x, w.y) > WORLD - 300) w.ta = Math.atan2(-w.y, -w.x);
      w.think = K.rand(0.15, 0.4);
    }
    function kill(w, by) {
      if (!w.alive) return;
      w.alive = false;
      const r = segR(w);
      const per = Math.max(1, Math.round(w.len / w.pts.length * 1.6));
      w.pts.forEach((p, i) => { if (i % 2 === 0) addFood(p.x + K.rand(-r, r) * 0.6, p.y + K.rand(-r, r) * 0.6, Math.min(6, per + 1), SKINS[w.skin].c[i % SKINS[w.skin].c.length]); });
      if (by) by.kills++;
      const onScreen = Math.abs(w.x - cam.x) * cam.z < W / 2 + 100 && Math.abs(w.y - cam.y) * cam.z < H / 2 + 100;
      if (onScreen) {
        const sx = (w.x - cam.x) * cam.z + W / 2, sy = (w.y - cam.y) * cam.z + H / 2;
        K.fx.burst(sx, sy, { n: 30, colors: SKINS[w.skin].c, speed: 420, g: 0, drag: 0.85, size: 7, life: 0.8 });
        K.audio.play(by === player ? 'explode' : 'hit', 0.9);
      }
      if (by === player) {
        runKills++; K.meta.track('kills', 1); K.meta.addXp(5);
        K.fx.shake(10); K.fx.hitstop(0.07);
        K.fx.text(W / 2, H / 2 - 80, K.pick(['SLURP!', 'CRUNCH!', 'NOODLED!', 'TANGLED!']), { color: '#f25f5c', stroke: '#fff', size: 46, life: 1.2 });
        K.audio.play('combo');
        if (runKills % 5 === 0) { K.fx.text(W / 2, H / 2 - 130, runKills + ' ' + K.t(['kills!', 'abates!']), { color: '#247ba0', stroke: '#fff', size: 34, life: 1.4 }); K.game.happy(); }
      }
      if (w === player) die(by);
    }
    function die(by) {
      playing = false; K.game.stop();
      K.audio.play('lose'); K.fx.shake(18); K.fx.flash('#f25f5c', 0.5);
      deadT = 1.2;
      setTimeout(() => endPanel(by), 1100);
    }
    let foodAcc = 0, spawnAcc = 0;
    function update(dt) {
      if (!player) return;
      buildHash();
      if (playing) { runTime += dt; }
      for (const w of worms) {
        if (!w.alive) continue;
        if (w.bot) { w.think -= dt; if (w.think <= 0) botThink(w); }
        else if (playing) { w.ta = inputAngle(); w.boost = boostHeld && w.len > 12; }
        steer(w, dt);
        const sp = (w.boost ? 330 : 165) * (w.bot ? 0.95 : 1);
        w.x += Math.cos(w.a) * sp * dt; w.y += Math.sin(w.a) * sp * dt;
        if (w.boost) {
          w.dropT = (w.dropT || 0) + dt;
          const cost = w.bot ? 0.08 : 0.08 * (1 - G.up.boost * 0.08);
          if (w.dropT > 0.1) { w.dropT = 0; w.len -= cost * 10; const t = w.pts[w.pts.length - 1]; addFood(t.x, t.y, 1, SKINS[w.skin].c[0]); }
        }
        // body follow
        const r = segR(w), spc = r * 0.45;
        const pts = w.pts; pts[0].x = w.x; pts[0].y = w.y;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
          if (d > spc) { b.x = a.x + (dx / d) * spc; b.y = a.y + (dy / d) * spc; }
        }
        const want = Math.max(6, Math.floor(w.len));
        while (pts.length < want) { const t = pts[pts.length - 1]; pts.push({ x: t.x, y: t.y }); }
        while (pts.length > want) pts.pop();
        // eat
        const mr = r + 14 + (w === player ? G.up.magnet * 7 : 6);
        for (let i = food.length - 1; i >= 0; i--) {
          const f = food[i], dx = w.x - f.x, dy = w.y - f.y;
          if (Math.abs(dx) > mr + 30 || Math.abs(dy) > mr + 30) continue;
          const d = Math.hypot(dx, dy);
          if (d < r + f.r) {
            food.splice(i, 1);
            const gain = f.v * (w === player ? 1 + G.up.value * 0.1 : 1);
            w.len += gain;
            if (w === player) { K.audio.play('pop', 1 + Math.random() * 0.4); K.meta.track('food', 1); eatPulse = 1; }
          } else if (d < mr) { f.x += (dx / d) * 260 * dt; f.y += (dy / d) * 260 * dt; }
        }
        // walls
        if (Math.hypot(w.x, w.y) > WORLD) kill(w, null);
      }
      // collisions
      for (const w of worms) {
        if (!w.alive) continue;
        const other = hitBody(w.x, w.y, segR(w), w);
        if (other && !(w === player && invuln > 0)) kill(w, other);
      }
      if (invuln > 0) invuln -= dt;
      worms = worms.filter((w) => w.alive || w === player);
      // keep world populated
      spawnAcc += dt; if (spawnAcc > 1) { spawnAcc = 0; if (worms.filter((w) => w.bot).length < 22 + Math.min(8, Math.floor(runTime / 60))) spawnBot(); }
      foodAcc += dt; if (foodAcc > 0.1) { foodAcc = 0; if (food.length < 800) for (let i = 0; i < 5; i++) { const p = randPos(20); addFood(p[0], p[1], Math.random() < 0.92 ? 1 : 3); } }
      if (player.alive) {
        maxLen = Math.max(maxLen, player.len);
        K.meta.trackMax('length', Math.floor(player.len));
        if (Math.floor(player.len / 100) > Math.floor(lastMilestone / 100)) { K.fx.text(W / 2, H * 0.3, Math.floor(player.len / 100) * 100 + '!', { color: '#ffe066', stroke: '#50514f', size: 44 }); K.audio.play('levelup'); K.game.happy(); }
        lastMilestone = player.len;
      }
      // camera
      const tz = K.clamp(1.15 - segR(player) * 0.012, 0.55, 1) * Math.min(1, Math.max(W, H) / 1100 + 0.3);
      cam.z = K.lerp(cam.z, tz, dt * 2);
      cam.x = K.lerp(cam.x, player.x, Math.min(1, dt * 8)); cam.y = K.lerp(cam.y, player.y, Math.min(1, dt * 8));
      eatPulse *= Math.pow(0.02, dt);
    }
    let lastMilestone = 0, eatPulse = 0, invuln = 0;

    /* ---------- input ---------- */
    let mx = 0, my = 0, boostHeld = false, joy = null, useJoy = false, keyTurn = 0, keyAngle = null;
    const boostBtn = K.el('button', 'boostbtn', '⚡');
    K.ui.root.appendChild(boostBtn);
    boostBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); boostHeld = true; });
    boostBtn.addEventListener('pointerup', () => (boostHeld = false));
    boostBtn.addEventListener('pointerleave', () => (boostHeld = false));
    function inputAngle() {
      if (keyAngle !== null) return keyAngle;
      if (useJoy) return joy && joy.a != null ? joy.a : player.ta;
      return Math.atan2(my - H / 2, mx - W / 2);
    }
    cv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { useJoy = true; joy = { id: e.pointerId, x: e.clientX, y: e.clientY, a: null, cx: e.clientX, cy: e.clientY }; }
      else { boostHeld = true; mx = e.clientX; my = e.clientY; useJoy = false; }
      keyAngle = null;
    });
    window.addEventListener('pointermove', (e) => {
      if (joy && e.pointerId === joy.id) { const dx = e.clientX - joy.x, dy = e.clientY - joy.y; joy.cx = e.clientX; joy.cy = e.clientY; if (Math.hypot(dx, dy) > 8) joy.a = Math.atan2(dy, dx); }
      else if (e.pointerType !== 'touch') { mx = e.clientX; my = e.clientY; useJoy = false; keyAngle = null; }
    });
    window.addEventListener('pointerup', (e) => { if (joy && e.pointerId === joy.id) { joy = null; } else if (e.pointerType !== 'touch') boostHeld = false; });
    const keys = {};
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft') { boostHeld = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space' || e.code === 'ShiftLeft') boostHeld = false; });
    function keyUpdate(dt) {
      const l = keys.ArrowLeft || keys.KeyA, r = keys.ArrowRight || keys.KeyD;
      if (l || r) { if (keyAngle === null) keyAngle = player.a; keyAngle += (r ? 1 : -1) * 3.6 * dt; }
    }

    /* ---------- meta ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Move the mouse (or drag on touch, or A/D keys) to steer. Hold click, Space or ⚡ to boost. Eat pellets to grow. Make rivals crash into your body; do not touch theirs.', pt: 'Mova o mouse (ou arraste no toque, ou A/D) para guiar. Segure o clique, Espaço ou ⚡ para acelerar. Coma bolinhas para crescer. Faça rivais baterem no seu corpo; não toque no deles.' },
      missions: [
        { stat: 'kills', base: 3, reward: 100, text: { en: 'Take down {n} noodles', pt: 'Derrube {n} macarrões' } },
        { stat: 'length', base: 250, type: 'max', cap: 2000, reward: 120, text: { en: 'Reach length {n}', pt: 'Chegue ao tamanho {n}' } },
        { stat: 'food', base: 300, reward: 70, text: { en: 'Eat {n} pellets', pt: 'Coma {n} bolinhas' } },
        { stat: 'games', base: 3, reward: 60, text: { en: 'Play {n} rounds', pt: 'Jogue {n} rodadas' } },
        { stat: 'top', base: 1, reward: 150, text: { en: 'Reach #1 on the board {n} time(s)', pt: 'Fique em 1º no placar {n} vez(es)' } },
        { stat: '_coins', base: 500, reward: 60, text: { en: 'Earn {n} coins', pt: 'Ganhe {n} moedas' } },
      ],
    });
    K.meta.buildHud({});

    /* ---------- DOM: menu / leaderboard ---------- */
    const lb = K.el('div', 'lb'); K.ui.root.appendChild(lb);
    const stat = K.el('div', 'stat'); K.ui.root.appendChild(stat);
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    let wasTop = false;
    function showMenu() {
      playing = false; K.game.stop();
      menu.style.display = ''; lb.style.display = stat.style.display = boostBtn.style.display = 'none';
      K.meta.setMenuButtonsVisible(true);
      menu.innerHTML = `<h1><span>Noodle</span><span>Arena</span></h1><p class="best">${K.t('best')}: ${Math.floor(G.best)}</p>`;
      const play = K.ui.btn(K.t('play'), 'big', () => startRun());
      play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.adBtn(K.t(['Start x3 size', 'Começar 3x maior']), () => { startBonus = 80; startRun(); }));
      row.appendChild(K.ui.btn('🎨 ' + K.t(['Skins', 'Visuais']), '', openSkins));
      row.appendChild(K.ui.btn('⬆ ' + K.t('upgrade'), '', openUpgrades));
      menu.appendChild(row);
      if (!player) { reset(); player.alive = false; playing = false; }
      K.meta.showPending();
    }
    function startRun() {
      menu.style.display = 'none'; lb.style.display = stat.style.display = '';
      boostBtn.style.display = 'ontouchstart' in window || navigator.maxTouchPoints ? '' : 'none';
      K.meta.setMenuButtonsVisible(false);
      reset(); playing = true; invuln = 1.5; lastMilestone = player.len; wasTop = false;
      K.game.start(); K.audio.play('power');
      G.games++; K.save.mark();
    }
    function endPanel(by) {
      K.meta.track('games', 1);
      const len = Math.floor(maxLen);
      const newBest = len > G.best; if (newBest) { G.best = len; K.game.happy(); }
      const coins = Math.round((len / 6 + runKills * 12) * (1 + G.up.coin * 0.1));
      K.meta.addXp(Math.floor(len / 20) + runKills * 3);
      const body = `${newBest ? `<div class="kit-big" style="color:#f25f5c">${K.t('newBest')}</div>` : ''}<p>${by ? K.t(['Crashed into', 'Bateu em']) + ' <b>' + by.name + '</b>' : K.t(['Hit the edge', 'Bateu na borda'])}</p>
        <div class="kit-row"><div class="grow">${K.t(['Length', 'Tamanho'])}</div><b>${len}</b></div><div class="kit-row"><div class="grow">${K.t(['Kills', 'Abates'])}</div><b>${runKills}</b></div><div class="kit-big">${K.icon.coin} ${coins}</div>`;
      const pnl = K.ui.panel({ title: K.t('gameOver'), body, closable: false });
      const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      let paid = false;
      const pay = (m) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } };
      if (!revived) pnl.foot.appendChild(K.ui.adBtn(K.t('revive'), () => { pnl.close(); revive(); }));
      pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), (b) => { pay(2); b.remove(); }));
      pnl.foot.appendChild(K.ui.btn(K.t('restart'), '', () => { pay(1); pnl.close(); K.meta.showPending(() => K.ads.midgame().then(startRun)); }));
      pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pay(1); pnl.close(); showMenu(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    function revive() {
      revived = true;
      const keep = Math.max(20, maxLen * 0.9);
      const p = randPos(400);
      worms = worms.filter((w) => w !== player);
      const pl = makeWorm(p[0], p[1], keep, G.skin, player.name, false);
      player = pl; invuln = 3; playing = true; K.game.start(); K.audio.play('power');
      cam.x = pl.x; cam.y = pl.y;
    }
    function openSkins() {
      const body = K.el('div', 'kit-grid');
      const pnl = K.ui.panel({ title: K.t(['Skins', 'Visuais']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        SKINS.forEach((s, i) => {
          const own = G.owned.includes(i);
          const prev = K.el('canvas'); prev.width = 90; prev.height = 40;
          const g = prev.getContext('2d');
          for (let k = 9; k >= 0; k--) { g.fillStyle = s.c[k % s.c.length]; g.beginPath(); g.arc(12 + k * 7, 20 + Math.sin(k * 0.8) * 5, 9, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.2)'; g.stroke(); }
          const cell = K.el('div', 'kit-cell' + (G.skin === i ? ' on' : ''));
          cell.appendChild(prev);
          cell.appendChild(own ? K.ui.btn(G.skin === i ? '✓' : K.t('equip'), 'sm', () => { G.skin = i; K.save.mark(); render(); })
            : s.gems ? K.ui.btn(K.icon.gem + ' ' + s.gems, 'sm', () => { if (K.meta.spendGems(s.gems)) { G.owned.push(i); G.skin = i; K.save.mark(); render(); } })
              : K.ui.btn(K.icon.coin + ' ' + s.p, 'sm', () => { if (K.meta.spend(s.p)) { G.owned.push(i); G.skin = i; K.save.mark(); render(); } }));
          body.appendChild(cell);
        });
      };
      render(); void pnl;
    }
    function openUpgrades() {
      const body = K.el('div');
      const pnl = K.ui.panel({ title: K.t('upgrade'), body });
      const render = () => {
        body.innerHTML = '';
        UPG.forEach((u) => {
          const l = G.up[u.id], cost = Math.round(u.base * Math.pow(1.55, l));
          const row = K.el('div', 'kit-row', `<div class="grow"><b>${K.t(u.n)}</b><div class="kit-bar"><i style="width:${(100 * l) / u.max}%"></i></div></div>`);
          row.appendChild(l >= u.max ? K.el('b', '', K.t('max')) : K.ui.btn(K.icon.coin + ' ' + K.fmt(cost), 'sm', () => { if (K.meta.spend(cost)) { G.up[u.id]++; K.save.mark(); K.meta.track('upg', 1); render(); } }));
          body.appendChild(row);
        });
      };
      render(); void pnl;
    }
    let lbAcc = 0;
    function updateDom(dt) {
      lbAcc += dt; if (lbAcc < 0.3 || !playing) return; lbAcc = 0;
      const top = worms.filter((w) => w.alive).sort((a, b) => b.len - a.len);
      const rank = top.indexOf(player) + 1;
      if (rank === 1 && !wasTop) { wasTop = true; K.meta.track('top', 1); K.fx.text(W / 2, H * 0.22, K.t(['#1 NOODLE!', '#1 MACARRÃO!']), { color: '#ffe066', stroke: '#50514f', size: 40, life: 1.5 }); K.audio.play('win'); K.game.happy(); }
      lb.innerHTML = '<b>' + K.t(['Top noodles', 'Top macarrões']) + '</b>' + top.slice(0, 6).map((w, i) => `<div class="${w === player ? 'me' : ''}"><span>${i + 1}. ${w.name}</span><span>${Math.floor(w.len)}</span></div>`).join('') + (rank > 6 ? `<div class="me"><span>${rank}. ${player.name}</span><span>${Math.floor(player.len)}</span></div>` : '');
      stat.innerHTML = `${K.t(['Length', 'Tamanho'])} <b>${Math.floor(player.len)}</b> · ${K.t(['Kills', 'Abates'])} <b>${runKills}</b>`;
    }

    /* ---------- render ---------- */
    function drawWorm(w) {
      const r = segR(w), cols = SKINS[w.skin].c, pts = w.pts, z = cam.z;
      const vis = (p) => Math.abs(p.x - cam.x) * z < W / 2 + r * z * 2 && Math.abs(p.y - cam.y) * z < H / 2 + r * z * 2;
      // shadow
      ctx.fillStyle = 'rgba(60,40,20,.13)';
      for (let i = pts.length - 1; i >= 0; i -= 2) { const p = pts[i]; if (!vis(p)) continue; ctx.beginPath(); ctx.arc(p.x + 4, p.y + 6, r, 0, 6.283); ctx.fill(); }
      const glow = w.boost;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i]; if (!vis(p)) continue;
        const band = Math.floor(i / 3) % cols.length;
        const rr = r * (i === 0 ? 1.08 : 1 - (i / pts.length) * 0.25) * (w === player && i < 8 ? 1 + eatPulse * 0.12 : 1);
        ctx.fillStyle = cols[band];
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fill();
        if (glow && i % 2 === 0) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke(); }
        // painted highlight stroke
        if (i % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(p.x - rr * 0.3, p.y - rr * 0.35, rr * 0.4, rr * 0.22, -0.5, 0, 6.283); ctx.fill(); }
      }
      // head face
      const h = pts[0];
      if (!vis(h)) return;
      const a = w.a, ex = Math.cos(a + 1.57) * r * 0.45, ey = Math.sin(a + 1.57) * r * 0.45, fx = Math.cos(a) * r * 0.35, fy = Math.sin(a) * r * 0.35;
      for (const s of [-1, 1]) {
        const x = h.x + fx + ex * s, y = h.y + fy + ey * s;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.stroke();
        const la = w === player ? inputAngleSafe() : w.ta;
        ctx.fillStyle = '#2b2d42'; ctx.beginPath(); ctx.arc(x + Math.cos(la) * r * 0.14, y + Math.sin(la) * r * 0.14, r * 0.18, 0, 6.283); ctx.fill();
      }
      // name
      if (w.bot && z > 0.5) { ctx.font = '700 ' + Math.round(12 / z) + 'px ' + K.fontFamily; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(43,45,66,.55)'; ctx.fillText(w.name, h.x, h.y - r - 10 / z); }
    }
    const inputAngleSafe = () => (player && playing ? inputAngle() : player ? player.a : 0);
    let tt = 0;
    K.loop((dt) => {
      tt += dt;
      if (playing && player) keyUpdate(dt);
      update(dt);
      K.fx.update(dt);
      updateDom(dt);
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = '#e9dcbc'; ctx.fillRect(0, 0, W, H);
      if (!player) return;
      ctx.save();
      ctx.translate(W / 2 + K.fx.shakeX, H / 2 + K.fx.shakeY); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
      // world disc
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, WORLD, 0, 6.283); ctx.clip();
      ctx.fillStyle = bgPat; ctx.fillRect(cam.x - W / cam.z, cam.y - H / cam.z, (W / cam.z) * 2, (H / cam.z) * 2);
      ctx.restore();
      ctx.strokeStyle = '#f25f5c'; ctx.lineWidth = 16; ctx.setLineDash([40, 24]); ctx.beginPath(); ctx.arc(0, 0, WORLD, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      // food
      const vw = W / 2 / cam.z + 20, vh = H / 2 / cam.z + 20;
      for (const f of food) {
        if (Math.abs(f.x - cam.x) > vw || Math.abs(f.y - cam.y) > vh) continue;
        const s = f.r * (1 + Math.sin(tt * 4 + f.ph) * 0.15);
        ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, s, 0, 6.283); ctx.fill();
        if (f.v > 1) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(f.x - s * 0.3, f.y - s * 0.3, s * 0.35, 0, 6.283); ctx.fill(); }
      }
      worms.slice().sort((a, b) => a.len - b.len).forEach((w) => { if (w.alive) drawWorm(w); });
      if (invuln > 0 && player.alive) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + Math.sin(tt * 20) * 0.3) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(player.x, player.y, segR(player) * 2, 0, 6.283); ctx.stroke(); }
      ctx.restore();
      K.fx.draw(ctx);
      // joystick
      if (joy && playing) { ctx.strokeStyle = 'rgba(43,45,66,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(joy.x, joy.y, 44, 0, 6.283); ctx.stroke(); ctx.fillStyle = 'rgba(43,45,66,.35)'; const dx = joy.cx - joy.x, dy = joy.cy - joy.y, d = Math.min(44, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); ctx.beginPath(); ctx.arc(joy.x + Math.cos(a) * d, joy.y + Math.sin(a) * d, 20, 0, 6.283); ctx.fill(); }
      // minimap
      if (playing) {
        const mr = 48, mx0 = 14 + mr, my0 = H - 14 - mr;
        ctx.fillStyle = 'rgba(243,233,210,.85)'; ctx.strokeStyle = '#50514f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx0, my0, mr, 0, 6.283); ctx.fill(); ctx.stroke();
        for (const w of worms) if (w.alive && w.len > 80) { ctx.fillStyle = w === player ? '#f25f5c' : 'rgba(80,81,79,.5)'; ctx.beginPath(); ctx.arc(mx0 + (w.x / WORLD) * mr, my0 + (w.y / WORLD) * mr, w === player ? 4 : 2.5, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = '#f25f5c'; ctx.beginPath(); ctx.arc(mx0 + (player.x / WORLD) * mr, my0 + (player.y / WORLD) * mr, 4, 0, 6.283); ctx.fill();
      }
      K.draw.grain(ctx, 0.05);
      K.fx.drawFlash(ctx, W * DPR, H * DPR);
    });

    K.music.set({ bpm: 112, chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]], bass: true, busy: true, arp: [1, 1, 0, 1, 1, 0, 1, 0], arpWave: 'triangle', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    showMenu();
  }
})();

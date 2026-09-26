/* Garden Siege — tower defense in layered cut-paper style. Plants defend the garden from bugs. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", Verdana, sans-serif';
  const FW = 1600, FH = 900; // logical field (landscape); transposed in portrait

  const PATHS = [
    [[-0.05, 0.2], [0.3, 0.2], [0.3, 0.75], [0.62, 0.75], [0.62, 0.3], [0.85, 0.3], [0.85, 0.85], [1.05, 0.85]],
    [[-0.05, 0.5], [0.2, 0.5], [0.2, 0.15], [0.5, 0.15], [0.5, 0.85], [0.8, 0.85], [0.8, 0.5], [1.05, 0.5]],
    [[0.1, -0.05], [0.1, 0.8], [0.4, 0.8], [0.4, 0.2], [0.7, 0.2], [0.7, 0.8], [0.9, 0.8], [0.9, -0.05]],
    [[-0.05, 0.85], [0.25, 0.85], [0.25, 0.5], [0.12, 0.5], [0.12, 0.15], [0.55, 0.15], [0.55, 0.6], [0.88, 0.6], [0.88, 0.2], [1.05, 0.2]],
    [[-0.05, 0.3], [0.45, 0.3], [0.45, 0.12], [0.75, 0.12], [0.75, 0.88], [0.3, 0.88], [0.3, 0.6], [1.05, 0.6]],
    [[0.5, -0.05], [0.5, 0.25], [0.15, 0.25], [0.15, 0.7], [0.4, 0.7], [0.4, 0.5], [0.65, 0.5], [0.65, 0.85], [0.9, 0.85], [0.9, 0.4], [1.05, 0.4]],
  ];
  const THEMES = [
    { grass: '#8dbf5a', grass2: '#76a94a', path: '#e8c98f', edge: '#c9a46a', deco: ['#4f8a3c', '#3e7431', '#f2d24b'] },
    { grass: '#a5c96a', grass2: '#8db457', path: '#ead7b0', edge: '#c8b085', deco: ['#6b9e46', '#d9674f', '#f6e27f'] },
    { grass: '#7fb77e', grass2: '#6aa36a', path: '#dcc39a', edge: '#b79c70', deco: ['#3f7a4f', '#e98fb0', '#fff1a8'] },
    { grass: '#c0c96a', grass2: '#a9b357', path: '#e9d3a4', edge: '#c4a877', deco: ['#8b9e3c', '#e3813b', '#fff'] },
    { grass: '#9fd0b0', grass2: '#86bb99', path: '#f0dcb8', edge: '#cdb48a', deco: ['#4e9b7a', '#8a6cc9', '#ffe08a'] },
    { grass: '#b9b27a', grass2: '#a39b63', path: '#e3cfa6', edge: '#bfa577', deco: ['#6f7a3a', '#c9563c', '#f5c451'] },
  ];
  const EN = {
    ant: { hp: 30, sp: 70, rw: 4, r: 11, col: '#3b2b24', armor: 0 },
    beetle: { hp: 90, sp: 44, rw: 8, r: 15, col: '#2f5f8a', armor: 3 },
    snail: { hp: 260, sp: 26, rw: 14, r: 18, col: '#c27b4a', armor: 1 },
    wasp: { hp: 45, sp: 88, rw: 7, r: 12, col: '#f2c230', air: true, armor: 0 },
    cater: { hp: 120, sp: 38, rw: 8, r: 15, col: '#7cb342', armor: 0, split: 3 },
    stag: { hp: 1900, sp: 28, rw: 120, r: 30, col: '#5a2f1d', armor: 5, boss: true },
  };
  const TW = {
    pea: { n: ['Pea pod', 'Ervilheira'], cost: 60, range: 135, rate: 0.55, dmg: 11, air: true, col: '#6cbf4a', unlock: 0, desc: ['Fast single shots', 'Tiros rápidos'] },
    thorn: { n: ['Thorn bush', 'Espinheiro'], cost: 80, range: 78, rate: 1, dmg: 14, air: false, col: '#8a5a3c', unlock: 0, desc: ['Hurts all nearby ground bugs', 'Fere todos os insetos de chão perto'] },
    frost: { n: ['Frost mint', 'Hortelã gelada'], cost: 90, range: 115, rate: 0.25, dmg: 1.2, air: true, col: '#7fd6e0', unlock: 1, desc: ['Slows everything in range', 'Deixa tudo lento na área'] },
    mortar: { n: ['Puffball', 'Cogumelo-bomba'], cost: 120, range: 210, rate: 2.1, dmg: 34, air: false, col: '#d9674f', unlock: 3, splash: 60, desc: ['Spore bombs with splash', 'Bombas de esporos em área'] },
    beam: { n: ['Sunflower', 'Girassol'], cost: 150, range: 165, rate: 0.1, dmg: 5, air: true, col: '#f2c230', unlock: 6, desc: ['Focused sun beam, ramps up', 'Raio de sol que esquenta'] },
    hive: { n: ['Bee hive', 'Colmeia'], cost: 180, range: 190, rate: 1.4, dmg: 18, air: true, col: '#e8a33d', unlock: 10, desc: ['Homing bees', 'Abelhas teleguiadas'] },
  };
  const TKEYS = Object.keys(TW);
  const META = [
    { id: 'dmg', n: ['Plant power +6%', 'Força das plantas +6%'], max: 10, base: 200 },
    { id: 'seeds', n: ['Starting seeds +25', 'Sementes iniciais +25'], max: 8, base: 180 },
    { id: 'lives', n: ['Garden hearts +3', 'Corações do jardim +3'], max: 6, base: 220 },
    { id: 'bounty', n: ['Bug bounty +8%', 'Recompensa +8%'], max: 8, base: 260 },
    { id: 'range', n: ['Plant reach +4%', 'Alcance +4%'], max: 6, base: 300 },
  ];
  const LEVELS = 30;
  const levelCfg = (i) => ({ path: i % PATHS.length, theme: Math.floor(i / 5) % THEMES.length, waves: Math.min(24, 10 + Math.floor(i / 2)), hpMul: 1 + i * 0.16, seeds: 200 + Math.floor(i / 3) * 20 });

  K.boot('garden_siege', { g: { lvl: 0, stars: {}, up: { dmg: 0, seeds: 0, lives: 0, bounty: 0, range: 0 }, speed: 1 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, portrait = false, sc = 1, ox = 0, oy = 0, LW = FW, LH = FH;
    const toLogic = (x, y) => ({ x: (x - ox) / sc, y: (y - oy) / sc });

    /* ---------- level state ---------- */
    let lv = null, lvIdx = 0, path = [], segs = [], pathLen = 0, towers = [], enemies = [], shots = [], seeds = 0, lives = 0, wave = 0, waveActive = false, spawnQ = [], spawnT = 0, playing = false, sel = null, placing = null, revived = false, earned = 0, bgCanvas = null, decos = [], speed = G.speed || 1, kills = 0, leaked = 0;
    K.fit(cv, (w, h, d) => {
      W = w; H = h; DPR = d; const wasP = portrait; portrait = h > w * 1.1;
      LW = portrait ? FH : FW; LH = portrait ? FW : FH;
      const topPad = 56, botPad = portrait ? 96 : 84;
      sc = Math.min(w / LW, (h - topPad - botPad) / LH);
      ox = (w - LW * sc) / 2; oy = topPad + (h - topPad - botPad - LH * sc) / 2;
      if (wasP !== portrait && lv) buildPath();
      bgCanvas = null;
    });
    const dmgMul = () => 1 + G.up.dmg * 0.06, rangeMul = () => 1 + G.up.range * 0.04, bounty = () => 1 + G.up.bounty * 0.08;
    function buildPath() {
      const raw = PATHS[lv.path];
      path = raw.map(([x, y]) => (portrait ? { x: y * LW, y: x * LH } : { x: x * LW, y: y * LH }));
      segs = []; pathLen = 0;
      for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y); segs.push({ a, b, l, s: pathLen }); pathLen += l; }
      const r = K.rng(lvIdx * 7 + 3); decos = [];
      for (let i = 0; i < 70; i++) { const x = r() * LW, y = r() * LH; if (distToPath(x, y) > 70) decos.push({ x, y, s: 10 + r() * 22, k: Math.floor(r() * 3), rot: r() * 6 }); }
      bgCanvas = null;
    }
    function posAt(d) {
      for (const s of segs) if (d <= s.s + s.l) { const t = (d - s.s) / s.l; return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, a: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) }; }
      const s = segs[segs.length - 1]; return { x: s.b.x, y: s.b.y, a: 0 };
    }
    function distToPath(x, y) {
      let m = 1e9;
      for (const s of segs) { const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, t = K.clamp(((x - s.a.x) * dx + (y - s.a.y) * dy) / (dx * dx + dy * dy), 0, 1); m = Math.min(m, Math.hypot(x - s.a.x - dx * t, y - s.a.y - dy * t)); }
      return m;
    }
    function startLevel(i) {
      lvIdx = i; lv = levelCfg(i); buildPath();
      towers = []; enemies = []; shots = []; spawnQ = []; wave = 0; waveActive = false; sel = null; placing = null; revived = false; earned = 0; kills = 0; leaked = 0;
      seeds = lv.seeds + G.up.seeds * 25; lives = 20 + G.up.lives * 3;
      playing = true; menu.style.display = 'none'; bar.style.display = ''; K.meta.setMenuButtonsVisible(false);
      K.game.start(); renderBar(); K.audio.play('power');
      K.fx.text(W / 2, H / 2, K.t('stage') + ' ' + (i + 1), { color: '#fff', stroke: '#3b2b24', size: 50, life: 1.6 });
    }

    /* ---------- waves ---------- */
    function makeWave(w) {
      const types = ['ant'];
      if (w >= 2 || lvIdx >= 2) types.push('beetle');
      if (w >= 4 || lvIdx >= 5) types.push('wasp');
      if (w >= 5 || lvIdx >= 4) types.push('snail');
      if (w >= 6 || lvIdx >= 8) types.push('cater');
      let budget = 12 + w * 7 + lvIdx * 3;
      const q = [];
      const cost = { ant: 1, beetle: 2.5, wasp: 2, snail: 5, cater: 4 };
      const main = K.pick(types);
      while (budget > 0) { const t = Math.random() < 0.55 ? main : K.pick(types); q.push({ t, gap: t === 'ant' || t === 'wasp' ? 0.45 : 0.8 }); budget -= cost[t]; }
      if ((w + 1) % 5 === 0 || w === lv.waves - 1) q.push({ t: 'stag', gap: 1.5 });
      return q;
    }
    function nextWave() {
      if (!playing || wave >= lv.waves) return;
      if (waveActive) {
        // call early: bonus seeds
        const bonus = 10 + wave * 2; seeds += bonus; K.fx.text(W / 2, 100, '+' + bonus + ' 🌱', { color: '#f2d24b', stroke: '#3b2b24', size: 28 });
      }
      spawnQ = spawnQ.concat(makeWave(wave)); wave++; waveActive = true; spawnT = 0;
      K.audio.play('whoosh'); renderBar();
      K.fx.text(W / 2, H * 0.3, K.t('wave') + ' ' + wave + '/' + lv.waves, { color: '#fff', stroke: '#3b2b24', size: 40, life: 1.3 });
    }
    function spawn(t, d) {
      const e = EN[t], hpM = lv.hpMul * (1 + (wave - 1) * 0.07);
      enemies.push({ t, d: d || 0, hp: e.hp * hpM, max: e.hp * hpM, sp: e.sp, r: e.r, air: !!e.air, armor: e.armor, slow: 0, anim: Math.random() * 6, rw: e.rw, boss: e.boss, split: e.split, hitT: 0, off: K.rand(-10, 10) });
    }

    /* ---------- towers ---------- */
    function towerStats(t) {
      const b = TW[t.k], m = [1, 1.6, 2.6, 4][t.lvl], rm = [1, 1.1, 1.2, 1.3][t.lvl];
      return { range: b.range * rm * rangeMul(), dmg: b.dmg * m * dmgMul(), rate: b.rate * (t.lvl >= 2 && t.k === 'pea' ? 0.75 : 1), air: b.air, splash: b.splash };
    }
    const upCost = (t) => Math.round(TW[t.k].cost * [0.9, 1.6, 3][t.lvl]);
    function canPlace(x, y) {
      if (x < 25 || y < 25 || x > LW - 25 || y > LH - 25) return false;
      if (distToPath(x, y) < 58) return false;
      return !towers.some((t) => Math.hypot(t.x - x, t.y - y) < 62);
    }
    function place(k, x, y) {
      const c = TW[k].cost;
      if (seeds < c) { K.audio.play('error'); K.ui.toast(K.t(['Not enough seeds', 'Sementes insuficientes'])); return; }
      if (!canPlace(x, y)) { K.audio.play('error'); return; }
      seeds -= c;
      towers.push({ k, x, y, lvl: 0, cd: 0, rot: 0, spent: c, pop: 0, heat: 0, target: null });
      const s = scr(x, y);
      K.fx.burst(s.x, s.y, { n: 18, colors: [TW[k].col, '#fff', '#5b8a3a'], speed: 260, shape: 'square', size: 6 });
      K.audio.play('thud'); K.fx.shake(3);
      K.meta.track('build', 1);
      placing = null; renderBar();
    }
    const scr = (x, y) => ({ x: ox + x * sc, y: oy + y * sc });
    function inRange(t, st, e) { return (st.air || !e.air) && Math.hypot(e.x - t.x, e.y - t.y) < st.range + e.r; }
    function hurt(e, dmg, src) {
      const d = Math.max(dmg * 0.25, dmg - e.armor);
      e.hp -= d; e.hitT = 0.1;
      if (e.hp <= 0 && !e.dead) {
        e.dead = true; kills++;
        const rw = Math.round(e.rw * bounty());
        seeds += rw; earned += e.boss ? 25 : 1;
        const s = scr(e.x, e.y);
        K.fx.burst(s.x, s.y, { n: e.boss ? 40 : 10, colors: [EN[e.t].col, '#fff8e0', '#e8c98f'], speed: e.boss ? 400 : 220, shape: 'square', size: e.boss ? 9 : 5, life: 0.6 });
        K.fx.text(s.x, s.y - 16, '+' + rw, { color: '#f2d24b', stroke: '#3b2b24', size: 18, life: 0.7 });
        K.audio.play(e.boss ? 'explode' : 'pop', 0.8 + Math.random() * 0.4);
        if (e.boss) { K.fx.shake(14); K.fx.hitstop(0.1); K.game.happy(); }
        K.meta.track('kills', 1);
        if (e.split) for (let i = 0; i < e.split; i++) { spawn('ant', Math.max(0, e.d - i * 14)); }
      }
      void src;
    }
    function updateTowers(dt) {
      for (const t of towers) {
        const st = towerStats(t);
        t.cd -= dt; t.pop = Math.max(0, t.pop - dt * 4);
        if (t.k === 'thorn') {
          if (t.cd <= 0) { let hit = false; for (const e of enemies) if (!e.dead && inRange(t, st, e)) { hurt(e, st.dmg); hit = true; } if (hit) { t.cd = st.rate; t.pop = 1; K.audio.play('hit', 1.4); const s = scr(t.x, t.y); K.fx.burst(s.x, s.y, { n: 8, colors: ['#8a5a3c', '#c9a46a'], speed: 200, g: 0, shape: 'square', size: 4, life: 0.3 }); } }
          continue;
        }
        if (t.k === 'frost') { for (const e of enemies) if (!e.dead && inRange(t, st, e)) { e.slow = Math.max(e.slow, 0.35 + t.lvl * 0.08); hurt(e, st.dmg * dt * 4); } continue; }
        // target: furthest along path in range
        let best = null;
        for (const e of enemies) if (!e.dead && inRange(t, st, e) && (!best || e.d > best.d)) best = e;
        t.target = best;
        if (!best) { t.heat = Math.max(0, t.heat - dt); continue; }
        t.rot = Math.atan2(best.y - t.y, best.x - t.x);
        if (t.k === 'beam') { t.heat = Math.min(3, t.heat + dt); hurt(best, st.dmg * 10 * dt * (1 + t.heat)); if (Math.random() < dt * 6) K.audio.play('laser', 1.5); continue; }
        if (t.cd > 0) continue;
        t.cd = st.rate; t.pop = 1;
        if (t.k === 'pea') { shots.push({ k: 'pea', x: t.x, y: t.y, tg: best, sp: 700, dmg: st.dmg, r: 6 }); K.audio.play('shoot', 1.2); }
        else if (t.k === 'mortar') { shots.push({ k: 'mortar', x: t.x, y: t.y, sx: t.x, sy: t.y, tx: best.x, ty: best.y, t: 0, dur: 0.8, dmg: st.dmg, splash: st.splash * (1 + t.lvl * 0.15) }); K.audio.play('thud', 1.3); }
        else if (t.k === 'hive') { for (let i = 0; i <= t.lvl; i++) shots.push({ k: 'bee', x: t.x, y: t.y, tg: best, sp: 320, dmg: st.dmg, r: 5, a: t.rot + K.rand(-1.5, 1.5), life: 3 }); K.audio.play('swing', 2); }
      }
    }
    function updateShots(dt) {
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (s.k === 'mortar') {
          s.t += dt / s.dur;
          s.x = K.lerp(s.sx, s.tx, s.t); s.y = K.lerp(s.sy, s.ty, s.t);
          if (s.t >= 1) {
            for (const e of enemies) if (!e.dead && !e.air && Math.hypot(e.x - s.tx, e.y - s.ty) < s.splash) hurt(e, s.dmg);
            const p = scr(s.tx, s.ty);
            K.fx.burst(p.x, p.y, { n: 22, colors: ['#d9674f', '#f6e27f', '#fff'], speed: 300, g: 100, size: 7, life: 0.5 });
            K.fx.burst(p.x, p.y, { n: 1, colors: ['#fff'], shape: 'ring', size: s.splash * sc / 4, life: 0.35, speed: 0 });
            K.audio.play('explode', 1.4); K.fx.shake(3);
            shots.splice(i, 1);
          }
          continue;
        }
        if (s.tg.dead) { const alt = enemies.find((e) => !e.dead && Math.hypot(e.x - s.x, e.y - s.y) < 200); if (alt) s.tg = alt; else { shots.splice(i, 1); continue; } }
        const dx = s.tg.x - s.x, dy = s.tg.y - s.y, d = Math.hypot(dx, dy);
        if (s.k === 'bee') { const ta = Math.atan2(dy, dx); let da = ta - s.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; s.a += K.clamp(da, -8 * dt, 8 * dt); s.x += Math.cos(s.a) * s.sp * dt; s.y += Math.sin(s.a) * s.sp * dt; s.life -= dt; if (s.life <= 0) { shots.splice(i, 1); continue; } }
        else { s.x += (dx / d) * s.sp * dt; s.y += (dy / d) * s.sp * dt; }
        if (d < s.tg.r + s.r) { hurt(s.tg, s.dmg); shots.splice(i, 1); }
      }
    }
    function updateEnemies(dt) {
      for (const e of enemies) {
        if (e.dead) continue;
        const sp = e.sp * (1 - e.slow);
        e.slow = Math.max(0, e.slow - dt * 1.5);
        e.d += sp * dt; e.anim += dt * sp * 0.12; e.hitT -= dt;
        const p = posAt(e.d); e.x = p.x + Math.cos(p.a + 1.57) * e.off; e.y = p.y + Math.sin(p.a + 1.57) * e.off; e.a = p.a;
        if (e.d >= pathLen) {
          e.dead = true; e.leak = true; const dmg = e.boss ? 10 : 1;
          lives -= dmg; leaked += dmg;
          K.audio.play('hurt'); K.fx.shake(8); K.fx.flash('#d9674f', 0.3);
          if (lives <= 0) { lives = 0; lose(); }
        }
      }
      enemies = enemies.filter((e) => !e.dead);
    }
    function update(dt) {
      if (!playing) return;
      for (let step = 0; step < speed; step++) {
        if (spawnQ.length) { spawnT -= dt; if (spawnT <= 0) { const s = spawnQ.shift(); spawn(s.t); spawnT = s.gap; } }
        updateEnemies(dt); updateTowers(dt); updateShots(dt);
        if (!playing) return;
        if (waveActive && !spawnQ.length && !enemies.length) {
          waveActive = false;
          const bonus = 20 + wave * 4; seeds += bonus;
          K.audio.play('coin'); K.fx.text(W / 2, H * 0.3, K.t(['Wave cleared!', 'Onda vencida!']) + ' +' + bonus, { color: '#f2d24b', stroke: '#3b2b24', size: 32 });
          K.meta.track('waves', 1);
          if (wave >= lv.waves) return win();
          renderBar();
        }
      }
    }

    /* ---------- end states ---------- */
    function lose() {
      playing = false; K.game.stop(); K.audio.play('lose');
      setTimeout(() => {
        const coins = Math.round(earned * 2 + wave * 6);
        const body = `<p>${K.t(['The bugs reached the garden!', 'Os insetos chegaram à horta!'])}</p><p>${K.t('wave')} ${wave}/${lv.waves}</p><div class="kit-big">${K.icon.coin} ${coins}</div>`;
        const pnl = K.ui.panel({ title: K.t('gameOver'), body, closable: false });
        const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        let paid = false; const pay = (m) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } };
        if (!revived) pnl.foot.appendChild(K.ui.adBtn(K.t(['Continue +10 hearts', 'Continuar +10 corações']), () => { pnl.close(); revived = true; lives = 10; enemies = enemies.filter((e) => e.d < pathLen * 0.7); playing = true; K.game.start(); renderBar(); }));
        pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), (b) => { pay(2); b.remove(); }));
        pnl.foot.appendChild(K.ui.btn(K.t(['Retry', 'Tentar de novo']), '', () => { pay(1); pnl.close(); K.meta.showPending(() => K.ads.midgame().then(() => startLevel(lvIdx))); }));
        pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pay(1); pnl.close(); showMenu(); }));
        pnl.panel.appendChild(pnl.foot);
      }, 700);
    }
    function win() {
      playing = false; K.game.stop(); K.game.happy(); K.audio.play('win'); K.fx.flash('#fff', 0.5);
      const stars = leaked === 0 ? 3 : lives >= 10 ? 2 : 1;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars);
      if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.trackMax('stars3', stars); K.meta.addXp(30); K.save.mark();
      for (let i = 0; i < 6; i++) setTimeout(() => K.fx.burst(K.rand(0, W), K.rand(0, H / 2), { n: 28, colors: ['#f2d24b', '#6cbf4a', '#d9674f', '#fff'], speed: 380, shape: 'star', size: 8, life: 1.2 }), i * 130);
      const coins = Math.round(earned * 2 + 100 + lvIdx * 30 + stars * 40);
      setTimeout(() => {
        const unlocked = TKEYS.find((k) => TW[k].unlock === G.lvl && G.lvl === lvIdx + 1);
        const body = `<div class="kit-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>${unlocked ? `<p><b>${K.t(['New plant:', 'Nova planta:'])} ${K.t(TW[unlocked].n)}</b></p>` : ''}<div class="kit-big">${K.icon.coin} ${coins}</div>`;
        const pnl = K.ui.panel({ title: K.t(['Garden saved!', 'Horta salva!']), body, closable: false });
        const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        let paid = false; const go = (m, next) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } pnl.close(); K.meta.showPending(() => (next ? K.ads.midgame().then(() => startLevel(G.lvl)) : showMenu())); };
        pnl.foot.appendChild(K.ui.adBtn(K.t('x3'), () => go(3, true)));
        pnl.foot.appendChild(K.ui.btn(K.t(['Next', 'Próxima']), '', () => go(1, true)));
        pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => go(1, false)));
        pnl.panel.appendChild(pnl.foot);
      }, 900);
    }

    /* ---------- input ---------- */
    cv.addEventListener('pointerdown', (e) => {
      if (!playing || K.ui.anyOpen()) return;
      const p = toLogic(e.clientX, e.clientY);
      if (placing) { place(placing, p.x, p.y); return; }
      const t = towers.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 34);
      if (t) { sel = t; K.audio.play('click'); openTower(t); return; }
      sel = null; closeTowerPanel();
      if (canPlace(p.x, p.y)) openBuild(p.x, p.y);
    });
    window.addEventListener('keydown', (e) => {
      if (!playing) return;
      if (e.code === 'Space') { e.preventDefault(); nextWave(); }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 6) { const k = TKEYS[n - 1]; if (TW[k].unlock <= G.lvl) { placing = k; renderBar(); } }
      if (e.code === 'Escape') { placing = null; sel = null; closeTowerPanel(); renderBar(); }
    });
    let pop = null;
    function closeTowerPanel() { if (pop) { pop.remove(); pop = null; } }
    function popAt(x, y) {
      closeTowerPanel();
      pop = K.el('div', 'pop'); K.ui.root.appendChild(pop);
      const s = scr(x, y);
      requestAnimationFrame(() => { if (!pop) return; const r = pop.getBoundingClientRect(); pop.style.left = K.clamp(s.x - r.width / 2, 6, W - r.width - 6) + 'px'; pop.style.top = K.clamp(s.y - r.height - 30, 60, H - r.height - 6) + 'px'; });
      return pop;
    }
    function openBuild(x, y) {
      const p = popAt(x, y);
      buildSpot = { x, y };
      TKEYS.forEach((k) => {
        const T = TW[k], lock = T.unlock > G.lvl;
        const b = K.el('button', 'tb' + (lock ? ' lock' : seeds < T.cost ? ' poor' : ''), `<canvas width="44" height="44"></canvas><small>${lock ? '🔒 ' + (T.unlock + 1) : T.cost}</small>`);
        drawTowerIcon(b.querySelector('canvas').getContext('2d'), k);
        b.onclick = (ev) => { ev.stopPropagation(); if (lock) { K.ui.toast(K.t(['Unlocks at stage', 'Libera na fase']) + ' ' + (T.unlock + 1)); return; } closeTowerPanel(); place(k, x, y); };
        b.title = K.t(T.n) + ' — ' + K.t(T.desc);
        p.appendChild(b);
      });
    }
    let buildSpot = null;
    function openTower(t) {
      const p = popAt(t.x, t.y);
      const st = towerStats(t);
      p.innerHTML = `<div class="tinfo"><b>${K.t(TW[t.k].n)} ${'★'.repeat(t.lvl + 1)}</b><small>${K.t(TW[t.k].desc)}</small><small>${K.t(['Damage', 'Dano'])} ${Math.round(st.dmg)} · ${K.t(['Range', 'Alcance'])} ${Math.round(st.range)}</small></div>`;
      if (t.lvl < 3) {
        const c = upCost(t);
        const ub = K.ui.btn('⬆ ' + c + ' 🌱', 'sm', () => { if (seeds < c) { K.audio.play('error'); return; } seeds -= c; t.spent += c; t.lvl++; t.pop = 1.5; K.audio.play('levelup'); K.meta.track('upgrades', 1); const s = scr(t.x, t.y); K.fx.burst(s.x, s.y, { n: 24, colors: ['#f2d24b', '#fff', TW[t.k].col], speed: 300, shape: 'star', size: 7 }); openTower(t); renderBar(); });
        p.appendChild(ub);
      }
      const sell = K.ui.btn(K.t(['Sell', 'Vender']) + ' ' + Math.round(t.spent * 0.7), 'sm', () => { seeds += Math.round(t.spent * 0.7); towers = towers.filter((q) => q !== t); sel = null; closeTowerPanel(); K.audio.play('coin'); renderBar(); });
      p.appendChild(sell);
    }

    /* ---------- DOM bar ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap the grass to plant a defender, tap a plant to upgrade or sell it. Press ▶ (or Space) to send the next wave early for bonus seeds. Keys 1-6 pick plants. Stop the bugs before they reach the garden!', pt: 'Toque na grama para plantar um defensor, toque numa planta para melhorar ou vender. Aperte ▶ (ou Espaço) para chamar a próxima onda e ganhar sementes. Teclas 1-6 escolhem plantas. Pare os insetos antes da horta!' },
      missions: [
        { stat: 'kills', base: 150, reward: 80, text: { en: 'Stop {n} bugs', pt: 'Pare {n} insetos' } },
        { stat: 'waves', base: 15, reward: 80, text: { en: 'Clear {n} waves', pt: 'Vença {n} ondas' } },
        { stat: 'levels', base: 2, reward: 120, text: { en: 'Save {n} gardens', pt: 'Salve {n} hortas' } },
        { stat: 'upgrades', base: 6, reward: 70, text: { en: 'Upgrade plants {n} times', pt: 'Melhore plantas {n} vezes' } },
        { stat: 'build', base: 12, reward: 60, text: { en: 'Plant {n} defenders', pt: 'Plante {n} defensores' } },
        { stat: 'stars3', base: 3, type: 'max', cap: 3, reward: 150, text: { en: 'Win a stage with {n} stars', pt: 'Vença uma fase com {n} estrelas' } },
      ],
    });
    K.meta.buildHud({});
    const bar = K.el('div', 'bar'); K.ui.root.appendChild(bar);
    function renderBar() {
      if (!lv) return;
      bar.innerHTML = '';
      const info = K.el('div', 'binfo', `<span>❤ ${lives}</span><span>🌱 ${Math.floor(seeds)}</span><span>${K.t('wave')} ${wave}/${lv.waves}</span>`);
      bar.appendChild(info);
      const acts = K.el('div', 'bacts');
      const nb = K.ui.btn(waveActive ? '▶▶ +' + (10 + wave * 2) : '▶ ' + K.t('wave'), 'sm go', nextWave);
      if (wave >= lv.waves) nb.disabled = true;
      acts.appendChild(nb);
      acts.appendChild(K.ui.btn(speed + 'x', 'sm', () => { speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; G.speed = speed; K.save.mark(); renderBar(); }));
      acts.appendChild(K.ui.adBtn('+150 🌱', () => { seeds += 150; K.audio.play('coin'); renderBar(); K.fx.text(W / 2, H - 120, '+150 🌱', { color: '#f2d24b', stroke: '#3b2b24', size: 30 }); }, 'sm'));
      acts.appendChild(K.ui.btn(K.icon.pause, 'sm', () => { const was = playing; playing = false; K.game.stop(); const p = K.meta.openSettings([K.ui.btn(K.t('menu'), 'ghost', () => { p.close(); showMenu(); })]); const oc = p.close; p.close = () => { oc(); if (was && lv && menu.style.display === 'none') { playing = true; K.game.start(); } }; }));
      bar.appendChild(acts);
    }
    let barAcc = 0;

    /* ---------- menu ---------- */
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    function showMenu() {
      playing = false; K.game.stop(); closeTowerPanel();
      bar.style.display = 'none'; menu.style.display = ''; K.meta.setMenuButtonsVisible(true);
      menu.innerHTML = `<h1><span>Garden</span><span>Siege</span></h1><p class="sub">${K.t('stage')} ${G.lvl + 1} / ${LEVELS}</p>`;
      const play = K.ui.btn(K.t('play'), 'big', () => startLevel(G.lvl)); play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.btn('▦ ' + K.t(['Stages', 'Fases']), '', openStages));
      row.appendChild(K.ui.btn('⬆ ' + K.t(['Greenhouse', 'Estufa']), '', openMeta));
      menu.appendChild(row);
      K.meta.showPending();
      if (!lv) { lv = levelCfg(G.lvl); lvIdx = G.lvl; buildPath(); }
    }
    function openStages() {
      const body = K.el('div', 'lvgrid');
      for (let i = 0; i < LEVELS; i++) {
        const b = K.el('button', 'lv' + (i > G.lvl ? ' lock' : '') + (i === G.lvl ? ' cur' : ''), `<b>${i + 1}</b><i>${'★'.repeat(G.stars[i] || 0)}</i>`);
        b.onclick = () => { if (i > G.lvl) return K.audio.play('error'); pnl.close(); startLevel(i); };
        body.appendChild(b);
      }
      const pnl = K.ui.panel({ title: K.t(['Stages', 'Fases']), body, cls: 'wide' });
    }
    function openMeta() {
      const body = K.el('div');
      K.ui.panel({ title: K.t(['Greenhouse', 'Estufa']), body });
      const render = () => {
        body.innerHTML = '';
        META.forEach((u) => {
          const l = G.up[u.id], cost = Math.round(u.base * Math.pow(1.55, l));
          const row = K.el('div', 'kit-row', `<div class="grow"><b>${K.t(u.n)}</b><div class="kit-bar"><i style="width:${(100 * l) / u.max}%"></i></div></div>`);
          row.appendChild(l >= u.max ? K.el('b', '', K.t('max')) : K.ui.btn(K.icon.coin + ' ' + K.fmt(cost), 'sm', () => { if (K.meta.spend(cost)) { G.up[u.id]++; K.save.mark(); render(); } }));
          body.appendChild(row);
        });
      };
      render();
    }

    /* ---------- drawing ---------- */
    function paperShadow(fn, off) { ctx.save(); ctx.translate(off || 4, (off || 4) * 1.2); ctx.fillStyle = 'rgba(40,30,10,.25)'; fn(true); ctx.restore(); fn(false); }
    function drawTowerIcon(g, k) {
      g.save(); g.translate(22, 22); g.scale(0.55, 0.55);
      const ctx0 = ctxRef; ctxRef = g; drawTowerBody({ k, lvl: 0, rot: -0.6, pop: 0, heat: 0 }, 0, 0, 0); ctxRef = ctx0; g.restore();
    }
    let ctxRef = ctx;
    function drawTowerBody(t, x, y, tt) {
      const g = ctxRef, T = TW[t.k], s = 1 + t.pop * 0.12;
      g.save(); g.translate(x, y); g.scale(s, s);
      // base: layered paper pot
      g.fillStyle = 'rgba(40,30,10,.25)'; g.beginPath(); g.ellipse(4, 22, 30, 12, 0, 0, 6.283); g.fill();
      g.fillStyle = '#b86b3e'; g.beginPath(); g.moveTo(-24, 0); g.lineTo(24, 0); g.lineTo(18, 24); g.lineTo(-18, 24); g.closePath(); g.fill();
      g.fillStyle = '#d98b57'; g.fillRect(-27, -6, 54, 10);
      for (let i = 0; i < t.lvl; i++) { g.fillStyle = '#f2d24b'; g.beginPath(); g.arc(-12 + i * 12, 14, 4, 0, 6.283); g.fill(); }
      g.translate(0, -8);
      switch (t.k) {
        case 'pea':
          g.fillStyle = '#4f8a3c'; g.beginPath(); g.ellipse(-10, 0, 10, 5, -0.6, 0, 6.283); g.ellipse(10, 0, 10, 5, 0.6, 0, 6.283); g.fill();
          g.rotate(t.rot); g.fillStyle = T.col; g.beginPath(); g.ellipse(4, 0, 22, 12, 0, 0, 6.283); g.fill();
          g.fillStyle = '#9ad86f'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-6 + i * 10, -1, 5, 0, 6.283); g.fill(); }
          g.fillStyle = '#3e7431'; g.beginPath(); g.arc(26, 0, 6, 0, 6.283); g.fill();
          break;
        case 'thorn':
          g.fillStyle = '#5b3a26';
          for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 + (tt || 0) * 0.3; g.beginPath(); g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12 - 6); g.lineTo(Math.cos(a) * 30, Math.sin(a) * 30 - 6); g.lineTo(Math.cos(a + 0.25) * 12, Math.sin(a + 0.25) * 12 - 6); g.fill(); }
          g.fillStyle = '#6b8e3a'; g.beginPath(); g.arc(0, -6, 18, 0, 6.283); g.fill();
          g.fillStyle = '#e98fb0'; g.beginPath(); g.arc(-6, -12, 5, 0, 6.283); g.arc(7, -3, 4, 0, 6.283); g.fill();
          break;
        case 'frost':
          for (let i = 0; i < 6; i++) { g.save(); g.rotate((i / 6) * 6.283 + (tt || 0) * 0.5); g.fillStyle = i % 2 ? '#7fd6e0' : '#b8eef2'; g.beginPath(); g.ellipse(0, -16, 8, 16, 0, 0, 6.283); g.fill(); g.restore(); }
          g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 7, 0, 6.283); g.fill();
          break;
        case 'mortar':
          g.fillStyle = '#f3e3c8'; g.fillRect(-8, -14, 16, 20);
          g.rotate(K.clamp(t.rot, -0.5, 0.5) * 0.3);
          g.fillStyle = T.col; g.beginPath(); g.arc(0, -16, 24, Math.PI, 0); g.closePath(); g.fill();
          g.fillStyle = '#fff'; [[-12, -24, 5], [4, -30, 4], [12, -20, 5], [-2, -20, 3]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 6.283); g.fill(); });
          break;
        case 'beam':
          g.fillStyle = '#4f8a3c'; g.fillRect(-3, -4, 6, 16);
          g.rotate(t.rot + 1.57);
          for (let i = 0; i < 12; i++) { g.save(); g.rotate((i / 12) * 6.283); g.fillStyle = i % 2 ? '#f2c230' : '#f6d860'; g.beginPath(); g.ellipse(0, -20, 6, 12, 0, 0, 6.283); g.fill(); g.restore(); }
          g.fillStyle = '#6b4226'; g.beginPath(); g.arc(0, 0, 12 + t.heat, 0, 6.283); g.fill();
          g.fillStyle = '#3b2b24'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(Math.cos(i) * 6, Math.sin(i * 1.3) * 6, 1.6, 0, 6.283); g.fill(); }
          break;
        case 'hive':
          for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f6c860' : T.col; g.beginPath(); g.ellipse(0, -2 - i * 8, 22 - i * 4, 7, 0, 0, 6.283); g.fill(); }
          g.fillStyle = '#3b2b24'; g.beginPath(); g.arc(0, 0, 5, 0, 6.283); g.fill();
          break;
      }
      g.restore();
    }
    function drawBug(e, tt) {
      const E = EN[e.t], x = e.x, y = e.y;
      ctx.save(); ctx.translate(x, y);
      if (e.air) { ctx.fillStyle = 'rgba(40,30,10,.18)'; ctx.beginPath(); ctx.ellipse(6, 26, e.r, e.r * 0.4, 0, 0, 6.283); ctx.fill(); ctx.translate(0, -8 + Math.sin(e.anim * 2) * 3); }
      else { ctx.fillStyle = 'rgba(40,30,10,.22)'; ctx.beginPath(); ctx.ellipse(3, 4, e.r * 1.1, e.r * 0.8, 0, 0, 6.283); ctx.fill(); }
      ctx.rotate(e.a);
      const flash = e.hitT > 0;
      const col = flash ? '#fff' : e.slow > 0.1 ? '#9fdbe6' : E.col;
      const leg = Math.sin(e.anim * 3) * 0.4;
      ctx.strokeStyle = '#2a1d17'; ctx.lineWidth = 2;
      if (!e.air && e.t !== 'snail' && e.t !== 'cater') for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(i * e.r * 0.5, 0); ctx.lineTo(i * e.r * 0.5 + Math.cos(leg * sd * (i % 2 ? 1 : -1)) * 3, sd * e.r * 1.1); ctx.stroke(); }
      if (e.t === 'snail') {
        ctx.fillStyle = flash ? '#fff' : '#d8b48a'; ctx.beginPath(); ctx.ellipse(2, 0, e.r * 1.3, e.r * 0.5, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-3, 0, e.r * 0.9, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#8a4f2a'; ctx.lineWidth = 3; ctx.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = a * 1.2; ctx.lineTo(-3 + Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
      } else if (e.t === 'cater') {
        for (let i = 3; i >= 0; i--) { ctx.fillStyle = i % 2 ? '#9ccc65' : col; ctx.beginPath(); ctx.arc(-i * 9, Math.sin(e.anim * 3 + i) * 3, e.r * 0.7, 0, 6.283); ctx.fill(); }
      } else {
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-e.r * 0.3, 0, e.r, e.r * 0.72, 0, 0, 6.283); ctx.fill();
        if (e.t === 'wasp') { ctx.fillStyle = '#2a1d17'; for (let i = 0; i < 3; i++) ctx.fillRect(-e.r * 1.1 + i * 6, -e.r * 0.6, 3, e.r * 1.2); ctx.fillStyle = 'rgba(255,255,255,.7)'; const f = Math.sin(e.anim * 20) * 0.5; ctx.beginPath(); ctx.ellipse(-2, -e.r, 8, 4, -0.5 + f, 0, 6.283); ctx.ellipse(-2, e.r, 8, 4, 0.5 - f, 0, 6.283); ctx.fill(); }
        if (e.t === 'beetle' || e.t === 'stag') { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-e.r * 1.2, 0); ctx.lineTo(e.r * 0.4, 0); ctx.stroke(); }
        if (e.t === 'stag') { ctx.strokeStyle = '#2a1d17'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.r * 1.1, -8, 12, -1.2, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(e.r * 1.1, 8, 12, -0.6, 1.2); ctx.stroke(); }
      }
      ctx.fillStyle = flash ? '#fff' : '#2a1d17'; ctx.beginPath(); ctx.arc(e.r * 0.65, 0, e.r * 0.45, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.r * 0.8, -3, 2.4, 0, 6.283); ctx.arc(e.r * 0.8, 3, 2.4, 0, 6.283); ctx.fill();
      ctx.restore();
      if (e.hp < e.max) { const w = e.r * 2; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - w / 2, y - e.r - 14, w, 5); ctx.fillStyle = e.boss ? '#d9674f' : '#6cbf4a'; ctx.fillRect(x - w / 2, y - e.r - 14, w * Math.max(0, e.hp / e.max), 5); }
    }
    function buildBg() {
      const th = THEMES[lv.theme];
      bgCanvas = document.createElement('canvas'); bgCanvas.width = Math.ceil(LW * sc * DPR); bgCanvas.height = Math.ceil(LH * sc * DPR);
      const g = bgCanvas.getContext('2d'); g.scale(sc * DPR, sc * DPR);
      g.fillStyle = th.grass; g.fillRect(0, 0, LW, LH);
      const r = K.rng(lvIdx + 11);
      // torn paper patches
      for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? th.grass2 : 'rgba(255,255,255,.08)'; const x = r() * LW, y = r() * LH, s = 60 + r() * 140; g.beginPath(); for (let k = 0; k <= 16; k++) { const a = (k / 16) * 6.283, rr = s * (0.75 + r() * 0.35); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6); } g.fill(); }
      // path: shadow, edge, fill (three paper layers)
      g.lineCap = 'round'; g.lineJoin = 'round';
      const stroke = (w, c, dx, dy) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); path.forEach((p, i) => (i ? g.lineTo(p.x + dx, p.y + dy) : g.moveTo(p.x + dx, p.y + dy))); g.stroke(); };
      stroke(96, 'rgba(40,30,10,.28)', 6, 9); stroke(96, th.edge, 0, 0); stroke(78, th.path, 0, 0);
      g.setLineDash([4, 18]); stroke(3, 'rgba(120,90,50,.35)', 0, 0); g.setLineDash([]);
      // decorations: layered paper bushes and flowers
      for (const d of decos) {
        g.save(); g.translate(d.x, d.y); g.rotate(d.rot * 0.2);
        g.fillStyle = 'rgba(40,30,10,.22)'; g.beginPath(); g.arc(4, 5, d.s, 0, 6.283); g.fill();
        if (d.k === 2) { for (let i = 0; i < 5; i++) { g.fillStyle = th.deco[1]; g.beginPath(); g.ellipse(Math.cos(i * 1.256) * d.s * 0.4, Math.sin(i * 1.256) * d.s * 0.4, d.s * 0.35, d.s * 0.22, i * 1.256, 0, 6.283); g.fill(); } g.fillStyle = th.deco[2]; g.beginPath(); g.arc(0, 0, d.s * 0.25, 0, 6.283); g.fill(); }
        else { g.fillStyle = th.deco[d.k]; g.beginPath(); g.arc(0, 0, d.s, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(-d.s * 0.3, -d.s * 0.3, d.s * 0.5, 0, 6.283); g.fill(); }
        g.restore();
      }
      // garden house at the end
      const end = path[path.length - 1], pre = path[path.length - 2];
      const hx = K.clamp(end.x, 60, LW - 60), hy = K.clamp(end.y, 60, LH - 60);
      g.save(); g.translate(hx - Math.sign(end.x - pre.x) * 10, hy - Math.sign(end.y - pre.y) * 10);
      g.fillStyle = 'rgba(40,30,10,.3)'; g.fillRect(-36, -26, 80, 70);
      g.fillStyle = '#f3e3c8'; g.fillRect(-40, -30, 80, 64); g.fillStyle = '#d9674f'; g.beginPath(); g.moveTo(-50, -30); g.lineTo(0, -70); g.lineTo(50, -30); g.fill();
      g.fillStyle = '#8a5a3c'; g.fillRect(-10, 4, 20, 30); g.fillStyle = '#7fd6e0'; g.fillRect(16, -16, 16, 14);
      g.restore();
    }
    let tt = 0;
    K.loop((dt) => {
      tt += dt; update(dt); K.fx.update(dt);
      barAcc += dt; if (barAcc > 0.25 && playing) { barAcc = 0; const inf = bar.querySelector('.binfo'); if (inf) inf.innerHTML = `<span>❤ ${lives}</span><span>🌱 ${Math.floor(seeds)}</span><span>${K.t('wave')} ${wave}/${lv.waves}</span>`; }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = '#5d7d3a'; ctx.fillRect(0, 0, W, H);
      if (!lv) return;
      if (!bgCanvas) buildBg();
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      ctx.drawImage(bgCanvas, ox, oy, LW * sc, LH * sc);
      ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
      // ranges
      if (sel) { const st = towerStats(sel); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sel.x, sel.y, st.range, 0, 6.283); ctx.fill(); ctx.stroke(); }
      const drawList = [];
      towers.forEach((t) => drawList.push({ y: t.y, f: () => { if (t.k === 'beam' && t.target) { ctx.strokeStyle = 'rgba(255,230,120,.8)'; ctx.lineWidth = 4 + t.heat * 2 + Math.sin(tt * 40) * 1.5; ctx.beginPath(); ctx.moveTo(t.x, t.y - 10); ctx.lineTo(t.target.x, t.target.y); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } drawTowerBody(t, t.x, t.y, tt); } }));
      enemies.forEach((e) => drawList.push({ y: e.y + (e.air ? 100 : 0), f: () => drawBug(e, tt) }));
      drawList.sort((a, b) => a.y - b.y).forEach((d) => d.f());
      for (const s of shots) {
        if (s.k === 'mortar') { const h = Math.sin(s.t * Math.PI) * 120; ctx.fillStyle = 'rgba(40,30,10,.2)'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 6.283); ctx.fill(); ctx.fillStyle = '#d9674f'; ctx.beginPath(); ctx.arc(s.x, s.y - h, 10, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x - 3, s.y - h - 3, 3, 0, 6.283); ctx.fill(); }
        else if (s.k === 'bee') { ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 6, 4, s.a, 0, 6.283); ctx.fill(); ctx.fillStyle = '#2a1d17'; ctx.fillRect(s.x - 1, s.y - 3, 2, 6); }
        else { ctx.fillStyle = '#3e7431'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 6.283); ctx.fill(); ctx.fillStyle = '#9ad86f'; ctx.beginPath(); ctx.arc(s.x - 2, s.y - 2, 3, 0, 6.283); ctx.fill(); }
      }
      if (placing && hoverP) { const ok = canPlace(hoverP.x, hoverP.y); ctx.globalAlpha = 0.6; drawTowerBody({ k: placing, lvl: 0, rot: 0, pop: 0, heat: 0 }, hoverP.x, hoverP.y, tt); ctx.globalAlpha = 1; ctx.strokeStyle = ok ? '#fff' : '#d9674f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hoverP.x, hoverP.y, TW[placing].range * rangeMul(), 0, 6.283); ctx.stroke(); }
      ctx.restore();
      K.fx.draw(ctx);
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
    });
    let hoverP = null;
    cv.addEventListener('pointermove', (e) => { hoverP = toLogic(e.clientX, e.clientY); });

    K.music.set({ bpm: 100, chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 62, 66]], bass: true, pad: true, arp: [1, 0, 0, 1, 0, 0, 1, 0], arpWave: 'triangle', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 1] } });
    showMenu();
  }
})();

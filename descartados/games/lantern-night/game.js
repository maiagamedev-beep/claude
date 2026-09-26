/* Lantern Night — survive the night against shadow creatures. Auto-attacks, level-up choices, dawn at 10:00. */
(function () {
  const K = window.Kit;
  K.fontFamily = 'Georgia, "Palatino Linotype", serif';
  const WARM = '#ffb347', DAWN = 600;
  const STAGES = [
    { n: ['Whisper Woods', 'Bosque dos Sussurros'], ground: '#1d2a22', dot: '#2a3b2f', hp: 1, need: 0 },
    { n: ['Old Mill Fields', 'Campos do Moinho'], ground: '#2a2419', dot: '#3a3222', hp: 1.6, need: 1 },
    { n: ['Misty Marsh', 'Pântano da Névoa'], ground: '#19252b', dot: '#24343c', hp: 2.4, need: 2 },
    { n: ['Moonless Peak', 'Pico sem Lua'], ground: '#221c2b', dot: '#2f2640', hp: 3.5, need: 3 },
  ];
  const HEROES = [
    { id: 'keeper', n: ['Lamp Keeper', 'Guardiã da Lamparina'], w: 'bolt', col: '#c96b3c', p: 0 },
    { id: 'kid', n: ['Firefly Kid', 'Menino Vaga-lume'], w: 'orbit', col: '#5aa469', p: 1500 },
    { id: 'monk', n: ['Ember Monk', 'Monge da Brasa'], w: 'aura', col: '#b04a5a', p: 3000 },
    { id: 'owl', n: ['Owl Scout', 'Batedora Coruja'], w: 'boom', col: '#6a6fb5', gems: 50 },
  ];
  const WEAPONS = {
    bolt: { n: ['Lantern Bolt', 'Raio da Lanterna'], d: ['Shoots the nearest shadow', 'Atira na sombra mais próxima'] },
    orbit: { n: ['Fireflies', 'Vaga-lumes'], d: ['Fireflies circle around you', 'Vaga-lumes giram ao seu redor'] },
    aura: { n: ['Warm Glow', 'Brilho Quente'], d: ['Burns shadows near you', 'Queima sombras perto de você'] },
    spark: { n: ['Sparks', 'Faíscas'], d: ['Bouncing sparks', 'Faíscas que ricocheteiam'] },
    beam: { n: ['Sunbeam', 'Raio de Sol'], d: ['Piercing beam in your direction', 'Raio que atravessa na sua direção'] },
    boom: { n: ['Moon Boomerang', 'Bumerangue Lunar'], d: ['Flies out and comes back', 'Vai e volta'] },
  };
  const PASSIVES = {
    might: { n: ['Brighter Flame', 'Chama Mais Forte'], d: ['+15% damage', '+15% dano'] },
    haste: { n: ['Quick Wick', 'Pavio Rápido'], d: ['-10% cooldowns', '-10% recarga'] },
    boots: { n: ['Soft Boots', 'Botas Leves'], d: ['+10% speed', '+10% velocidade'] },
    heart: { n: ['Warm Heart', 'Coração Quente'], d: ['+20 max health, heal', '+20 vida máx., cura'] },
    magnet: { n: ['Moth Charm', 'Amuleto da Mariposa'], d: ['+40% pickup range', '+40% alcance de coleta'] },
    area: { n: ['Wide Halo', 'Halo Amplo'], d: ['+12% area', '+12% área'] },
  };
  const META = [
    { id: 'might', n: ['Power +5%', 'Poder +5%'], max: 10, base: 200 },
    { id: 'hp', n: ['Health +10', 'Vida +10'], max: 10, base: 180 },
    { id: 'speed', n: ['Speed +4%', 'Velocidade +4%'], max: 6, base: 250 },
    { id: 'greed', n: ['Coin find +10%', 'Moedas +10%'], max: 10, base: 220 },
    { id: 'magnet', n: ['Pickup range +10%', 'Alcance de coleta +10%'], max: 6, base: 200 },
    { id: 'armor', n: ['Armor +1', 'Armadura +1'], max: 5, base: 400 },
  ];

  K.boot('lantern_night', { g: { stage: 0, cleared: 0, hero: 'keeper', heroes: ['keeper'], up: { might: 0, hp: 0, speed: 0, greed: 0, magnet: 0, armor: 0 }, bestT: {} } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    const dark = document.createElement('canvas'), dctx = dark.getContext('2d');
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; dark.width = Math.ceil(w / 2); dark.height = Math.ceil(h / 2); }, 1.5);
    const zoom = () => Math.min(1.1, Math.max(0.7, Math.min(W, H) / 600));

    /* ---------- state ---------- */
    let P = null, enemies = [], shots = [], gems = [], coinsD = [], chests = [], time = 0, kills = 0, runCoins = 0, playing = false, paused = false, stage = 0, revived = false, spawnAcc = 0, bossT = 0, cam = { x: 0, y: 0 }, rerolls = 0;
    function newRun(si) {
      stage = si; const h = HEROES.find((x) => x.id === G.hero) || HEROES[0];
      P = { x: 0, y: 0, vx: 0, vy: 0, r: 14, hp: 100 + G.up.hp * 10, max: 100 + G.up.hp * 10, lvl: 1, xp: 0, need: 5, face: 1, fx: 1, fy: 0, inv: 0, weapons: {}, passives: {}, col: h.col, walk: 0 };
      P.weapons[h.w] = { lvl: 1, cd: 0 };
      enemies = []; shots = []; gems = []; coinsD = []; chests = []; time = 0; kills = 0; runCoins = 0; revived = false; spawnAcc = 0; bossT = 0; rerolls = 0; K.fx.clear();
    }
    const pas = (k) => P.passives[k] || 0;
    const mightM = () => (1 + pas('might') * 0.15) * (1 + G.up.might * 0.05);
    const cdM = () => Math.pow(0.9, pas('haste'));
    const areaM = () => 1 + pas('area') * 0.12;
    const speedM = () => (1 + pas('boots') * 0.1) * (1 + G.up.speed * 0.04);
    const magR = () => 90 * (1 + pas('magnet') * 0.4) * (1 + G.up.magnet * 0.1);

    /* ---------- enemies ---------- */
    const ETYPES = {
      blob: { hp: 8, sp: 55, r: 12, dmg: 6, xp: 1, col: '#0b0d10' },
      bat: { hp: 5, sp: 95, r: 9, dmg: 4, xp: 1, col: '#131018', fly: true },
      moth: { hp: 14, sp: 70, r: 12, dmg: 7, xp: 2, col: '#1a1520', fly: true },
      ghost: { hp: 30, sp: 45, r: 16, dmg: 10, xp: 3, col: '#101418' },
      brute: { hp: 90, sp: 38, r: 22, dmg: 16, xp: 8, col: '#08090b' },
      boss: { hp: 900, sp: 42, r: 42, dmg: 25, xp: 60, col: '#050507', boss: true },
    };
    function spawn(type, near) {
      const E = ETYPES[type], a = Math.random() * 6.283, d = Math.max(W, H) / zoom() * 0.62 + 40;
      const hpM = STAGES[stage].hp * (1 + time / 150);
      enemies.push({ t: type, x: P.x + Math.cos(a) * (near || d), y: P.y + Math.sin(a) * (near || d), hp: E.hp * hpM, max: E.hp * hpM, sp: E.sp * (1 + time / 1200), r: E.r, dmg: E.dmg * (1 + time / 400), xp: E.xp, boss: E.boss, fly: E.fly, hit: 0, kb: 0, kx: 0, ky: 0, ph: Math.random() * 6 });
    }
    function spawnWave(dt) {
      const m = time / 60;
      const rate = 1.2 + m * 1.6 + Math.pow(m, 1.6) * 0.4;
      spawnAcc += dt * rate;
      while (spawnAcc > 1 && enemies.length < 380) {
        spawnAcc--;
        const r = Math.random();
        const t = m < 1 ? (r < 0.8 ? 'blob' : 'bat') : m < 3 ? (r < 0.5 ? 'blob' : r < 0.8 ? 'bat' : 'moth') : m < 6 ? (r < 0.35 ? 'bat' : r < 0.65 ? 'moth' : r < 0.9 ? 'ghost' : 'brute') : (r < 0.3 ? 'moth' : r < 0.65 ? 'ghost' : 'brute');
        spawn(t);
      }
      // swarm ring events
      if (Math.floor(time / 45) !== Math.floor((time - dt) / 45) && time > 10) { for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; enemies.push(Object.assign({}, { t: 'bat', x: P.x + Math.cos(a) * 420, y: P.y + Math.sin(a) * 420, hp: 5 * STAGES[stage].hp, max: 5, sp: 70, r: 9, dmg: 4, xp: 1, fly: true, hit: 0, kb: 0, kx: 0, ky: 0, ph: 0 })); } K.audio.play('whoosh', 0.6); }
      bossT += dt;
      if (bossT > 120) { bossT = 0; spawn('boss'); K.audio.play('explode', 0.5); K.fx.shake(10); K.fx.text(W / 2, H * 0.3, K.t(['A great shadow comes!', 'Uma grande sombra chega!']), { color: '#ff6b6b', stroke: '#000', size: 32, life: 2 }); }
    }

    /* ---------- weapons ---------- */
    function wStats(k, l) {
      const m = mightM(), a = areaM(), c = cdM();
      switch (k) {
        case 'bolt': return { cd: Math.max(0.25, 0.9 - l * 0.08) * c, dmg: (9 + l * 4) * m, n: 1 + Math.floor(l / 3), sp: 520 };
        case 'orbit': return { n: 1 + l, dmg: (7 + l * 3) * m, rad: (60 + l * 6) * a, spd: 2.6 + l * 0.2 };
        case 'aura': return { dmg: (8 + l * 5) * m, rad: (55 + l * 10) * a, tick: 0.5 * c };
        case 'spark': return { cd: Math.max(0.6, 2 - l * 0.18) * c, dmg: (10 + l * 4) * m, n: 1 + Math.floor(l / 2), bounces: 2 + l };
        case 'beam': return { cd: Math.max(0.6, 2.2 - l * 0.2) * c, dmg: (20 + l * 8) * m, len: (240 + l * 30) * a, w: (14 + l * 2) * a };
        case 'boom': return { cd: Math.max(0.5, 1.6 - l * 0.12) * c, dmg: (12 + l * 5) * m, n: 1 + Math.floor(l / 3), range: 220 + l * 20 };
      }
    }
    function nearest(x, y, maxD) { let b = null, bd = maxD * maxD; for (const e of enemies) { const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; } } return b; }
    function hurt(e, dmg, kx, ky) {
      if (e.dead) return;
      e.hp -= dmg; e.hit = 0.1;
      if (!e.boss) { e.kb = 0.12; e.kx = kx || 0; e.ky = ky || 0; }
      if (Math.random() < 0.3) { const s = toS(e.x, e.y); K.fx.text(s.x, s.y - e.r, Math.round(dmg), { color: '#ffe8b0', stroke: '#000', size: 14, life: 0.5, vy: -40 }); }
      if (e.hp <= 0) {
        e.dead = true; kills++; K.meta.track('kills', 1);
        gems.push({ x: e.x, y: e.y, v: e.xp, big: e.xp >= 8 });
        if (Math.random() < 0.06 * (1 + G.up.greed * 0.1)) coinsD.push({ x: e.x + 8, y: e.y, v: e.boss ? 25 : 1 });
        if (e.boss) { chests.push({ x: e.x, y: e.y }); K.fx.shake(14); K.fx.hitstop(0.1); K.audio.play('explode'); K.meta.track('bosses', 1); }
        if (Math.random() < 0.004) coinsD.push({ x: e.x, y: e.y, heal: true });
        const s = toS(e.x, e.y);
        K.fx.burst(s.x, s.y, { n: e.boss ? 40 : 6, colors: ['#1a1a22', '#3a3346', WARM], speed: e.boss ? 300 : 140, g: 0, size: e.boss ? 8 : 4, life: 0.5 });
        if (kills % 3 === 0) K.audio.play('pop', 0.6 + Math.random() * 0.5);
      }
    }
    function fireWeapons(dt) {
      for (const k in P.weapons) {
        const w = P.weapons[k], s = wStats(k, w.lvl);
        w.cd -= dt;
        if (k === 'orbit') { w.a = (w.a || 0) + s.spd * dt; for (let i = 0; i < s.n; i++) { const a = w.a + (i / s.n) * 6.283, x = P.x + Math.cos(a) * s.rad, y = P.y + Math.sin(a) * s.rad; for (const e of enemies) { if ((e.x - x) ** 2 + (e.y - y) ** 2 < (e.r + 9) ** 2 && (!e.oh || e.oh < time)) { e.oh = time + 0.35; hurt(e, s.dmg, Math.cos(a) * 4, Math.sin(a) * 4); } } } continue; }
        if (k === 'aura') { if (w.cd <= 0) { w.cd = s.tick; for (const e of enemies) if ((e.x - P.x) ** 2 + (e.y - P.y) ** 2 < (s.rad + e.r) ** 2) hurt(e, s.dmg * 0.5); } continue; }
        if (w.cd > 0) continue;
        w.cd = s.cd;
        if (k === 'bolt') { for (let i = 0; i < s.n; i++) { const t = nearest(P.x, P.y, 500); if (!t) break; const a = Math.atan2(t.y - P.y, t.x - P.x) + (i - (s.n - 1) / 2) * 0.15; shots.push({ k, x: P.x, y: P.y, vx: Math.cos(a) * s.sp, vy: Math.sin(a) * s.sp, dmg: s.dmg, life: 1.2, r: 6, pierce: 1 }); } K.audio.play('shoot', 1.3); }
        if (k === 'spark') { for (let i = 0; i < s.n; i++) { const a = Math.random() * 6.283; shots.push({ k, x: P.x, y: P.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dmg: s.dmg, life: 2.5, r: 5, bounces: s.bounces, pierce: 99 }); } K.audio.play('laser', 1.8); }
        if (k === 'beam') { const a = Math.atan2(P.fy, P.fx); shots.push({ k, x: P.x, y: P.y, a, len: s.len, w: s.w, dmg: s.dmg, life: 0.25, done: false }); K.audio.play('laser', 0.8); }
        if (k === 'boom') { for (let i = 0; i < s.n; i++) { const t = nearest(P.x, P.y, 400); const a = t ? Math.atan2(t.y - P.y, t.x - P.x) + i * 0.6 : Math.atan2(P.fy, P.fx) + i * 0.6; shots.push({ k, x: P.x, y: P.y, a, t: 0, range: s.range, dmg: s.dmg, life: 2, r: 12, hitSet: new Set() }); } K.audio.play('swing', 1.2); }
      }
    }
    function updateShots(dt) {
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; s.life -= dt;
        if (s.k === 'beam') {
          if (!s.done) { s.done = true; const cx = Math.cos(s.a), cy = Math.sin(s.a); for (const e of enemies) { const dx = e.x - P.x, dy = e.y - P.y, t = dx * cx + dy * cy; if (t < 0 || t > s.len) continue; const perp = Math.abs(dx * cy - dy * cx); if (perp < s.w + e.r) hurt(e, s.dmg, cx * 6, cy * 6); } }
          s.x = P.x; s.y = P.y;
        } else if (s.k === 'boom') {
          s.t += dt; const out = Math.sin(Math.min(1, s.t / 1.6) * Math.PI) * s.range;
          s.x = P.x + Math.cos(s.a) * out; s.y = P.y + Math.sin(s.a) * out; s.spin = (s.spin || 0) + dt * 18;
          for (const e of enemies) if (!s.hitSet.has(e) && (e.x - s.x) ** 2 + (e.y - s.y) ** 2 < (e.r + s.r) ** 2) { s.hitSet.add(e); hurt(e, s.dmg); }
          if (s.t > 0.8 && !s.back) { s.back = true; s.hitSet.clear(); }
        } else {
          s.x += s.vx * dt; s.y += s.vy * dt;
          for (const e of enemies) {
            if (e.dead || (s.hitE && s.hitE.has(e))) continue;
            if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < (e.r + s.r) ** 2) {
              const sp = Math.hypot(s.vx, s.vy); hurt(e, s.dmg, (s.vx / sp) * 5, (s.vy / sp) * 5);
              (s.hitE = s.hitE || new Set()).add(e);
              if (s.bounces) { s.bounces--; const n = enemies.find((q) => !q.dead && !s.hitE.has(q) && (q.x - s.x) ** 2 + (q.y - s.y) ** 2 < 250 ** 2); if (n) { const a = Math.atan2(n.y - s.y, n.x - s.x); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; } }
              if (--s.pierce <= 0 && !s.bounces) { s.life = 0; break; }
            }
          }
        }
        if (s.life <= 0) shots.splice(i, 1);
      }
    }

    /* ---------- level up ---------- */
    function options() {
      const pool = [];
      for (const k in WEAPONS) { const w = P.weapons[k]; if (w && w.lvl < 8) pool.push({ t: 'w', k, lvl: w.lvl + 1 }); else if (!w && Object.keys(P.weapons).length < 5) pool.push({ t: 'w', k, lvl: 1 }); }
      for (const k in PASSIVES) { const l = pas(k); if (l < 5) pool.push({ t: 'p', k, lvl: l + 1 }); }
      pool.sort(() => Math.random() - 0.5);
      const out = pool.slice(0, 3);
      if (!out.length) out.push({ t: 'gold' });
      return out;
    }
    function levelUp() {
      paused = true; K.game.stop(); K.audio.play('levelup'); K.fx.flash(WARM, 0.35);
      const body = K.el('div', 'ups');
      const pnl = K.ui.panel({ title: K.t('levelUp') + ' ' + P.lvl, body, closable: false });
      const render = () => {
        body.innerHTML = '';
        options().forEach((o) => {
          let name, desc, tag;
          if (o.t === 'gold') { name = K.t(['Pouch of coins', 'Bolsa de moedas']); desc = '+25'; tag = ''; }
          else if (o.t === 'w') { name = K.t(WEAPONS[o.k].n); desc = K.t(WEAPONS[o.k].d); tag = o.lvl === 1 ? K.t(['NEW', 'NOVO']) : 'Lv ' + o.lvl; }
          else { name = K.t(PASSIVES[o.k].n); desc = K.t(PASSIVES[o.k].d); tag = 'Lv ' + o.lvl; }
          const b = K.el('button', 'up' + (o.t === 'w' ? ' wpn' : ''), `<i>${tag}</i><b>${name}</b><small>${desc}</small>`);
          b.onclick = () => { K.audio.play('power'); apply(o); pnl.close(); paused = false; K.game.start(); };
          body.appendChild(b);
        });
      };
      render();
      if (rerolls < 3) pnl.foot.appendChild(K.ui.adBtn(K.t(['Reroll', 'Sortear de novo']), () => { rerolls++; render(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    function apply(o) {
      if (o.t === 'gold') runCoins += 25;
      else if (o.t === 'w') { if (P.weapons[o.k]) P.weapons[o.k].lvl++; else P.weapons[o.k] = { lvl: 1, cd: 0 }; }
      else { P.passives[o.k] = pas(o.k) + 1; if (o.k === 'heart') { P.max += 20; P.hp = Math.min(P.max, P.hp + 40); } }
      K.meta.track('upgrades', 1);
    }
    function openChest() {
      paused = true; K.game.stop();
      const opts = options().slice(0, 2);
      opts.forEach(apply);
      const gold = 40 + Math.floor(time / 10);
      runCoins += gold;
      K.meta.chest(K.t(['Shadow chest', 'Baú das sombras']), gold, 0, () => { paused = false; K.game.start(); });
    }

    /* ---------- update ---------- */
    const keys = {};
    window.addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'Escape' && playing) pauseMenu(); });
    window.addEventListener('keyup', (e) => (keys[e.code] = false));
    let joy = null;
    cv.addEventListener('pointerdown', (e) => { joy = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY }; });
    window.addEventListener('pointermove', (e) => { if (joy && joy.id === e.pointerId) { joy.cx = e.clientX; joy.cy = e.clientY; } });
    window.addEventListener('pointerup', (e) => { if (joy && joy.id === e.pointerId) joy = null; });
    const toS = (x, y) => ({ x: (x - cam.x) * zoom() + W / 2, y: (y - cam.y) * zoom() + H / 2 });
    function update(dt) {
      if (!playing || paused || !P) return;
      time += dt;
      let mx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), my = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      if (joy) { const dx = joy.cx - joy.x, dy = joy.cy - joy.y, d = Math.hypot(dx, dy); if (d > 8) { mx = dx / Math.max(d, 50); my = dy / Math.max(d, 50); } }
      const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
      const sp = 150 * speedM();
      P.x += mx * sp * dt; P.y += my * sp * dt;
      if (ml > 0.1) { P.fx = mx; P.fy = my; if (mx) P.face = Math.sign(mx); P.walk += dt * 10; }
      P.inv = Math.max(0, P.inv - dt);
      spawnWave(dt); fireWeapons(dt); updateShots(dt);
      // enemies
      for (const e of enemies) {
        if (e.dead) continue;
        e.hit -= dt;
        if (e.kb > 0) { e.kb -= dt; e.x += e.kx * 60 * dt; e.y += e.ky * 60 * dt; continue; }
        const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
        const wob = e.fly ? Math.sin(time * 5 + e.ph) * 0.6 : 0;
        e.x += ((dx / d) * Math.cos(wob) - (dy / d) * Math.sin(wob)) * e.sp * dt; e.y += ((dy / d) * Math.cos(wob) + (dx / d) * Math.sin(wob)) * e.sp * dt;
        if (d < e.r + P.r && P.inv <= 0) {
          const dmg = Math.max(1, e.dmg - G.up.armor); P.hp -= dmg; P.inv = 0.5;
          K.audio.play('hurt'); K.fx.shake(6); K.fx.flash('#7a1f2b', 0.25);
          if (P.hp <= 0) { P.hp = 0; return die(); }
        }
        if (d > 1400) { const a = Math.random() * 6.283; e.x = P.x + Math.cos(a) * 700; e.y = P.y + Math.sin(a) * 700; }
      }
      // separation (cheap, grid)
      const grid = new Map(), C = 40;
      for (const e of enemies) { const k = ((e.x / C) | 0) * 7919 + ((e.y / C) | 0); let b = grid.get(k); if (!b) grid.set(k, (b = [])); b.push(e); }
      for (const b of grid.values()) for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const a = b[i], c = b[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1, m = a.r + c.r; if (d < m) { const push = (m - d) * 0.5 / d; a.x -= dx * push; a.y -= dy * push; c.x += dx * push; c.y += dy * push; } }
      enemies = enemies.filter((e) => !e.dead);
      // pickups
      const mr = magR();
      for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i], dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1;
        if (d < mr || g.pull) { g.pull = true; g.x += (dx / d) * 480 * dt; g.y += (dy / d) * 480 * dt; }
        if (d < P.r + 6) { gems.splice(i, 1); P.xp += g.v; K.audio.play('tick', 1 + Math.random() * 0.5); }
      }
      if (gems.length > 400) { const merged = gems.splice(0, 100).reduce((a, g) => a + g.v, 0); gems.push({ x: P.x + 200, y: P.y, v: merged, big: true }); }
      for (let i = coinsD.length - 1; i >= 0; i--) {
        const c = coinsD[i], dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1;
        if (d < mr) { c.x += (dx / d) * 400 * dt; c.y += (dy / d) * 400 * dt; }
        if (d < P.r + 8) { coinsD.splice(i, 1); if (c.heal) { P.hp = Math.min(P.max, P.hp + 30); K.audio.play('power'); } else { runCoins += c.v; K.audio.play('coin'); } }
      }
      for (let i = chests.length - 1; i >= 0; i--) if (Math.hypot(P.x - chests[i].x, P.y - chests[i].y) < 30) { chests.splice(i, 1); openChest(); }
      while (P.xp >= P.need) { P.xp -= P.need; P.lvl++; P.need = Math.floor(5 + P.lvl * 4 + Math.pow(P.lvl, 1.35)); levelUp(); break; }
      cam.x = K.lerp(cam.x, P.x, Math.min(1, dt * 8)); cam.y = K.lerp(cam.y, P.y, Math.min(1, dt * 8));
      if (time >= DAWN) win();
      K.meta.trackMax('survive', Math.floor(time));
    }
    function die() {
      playing = false; K.game.stop(); K.audio.play('lose'); K.fx.shake(14);
      setTimeout(() => endPanel(false), 900);
    }
    function win() {
      playing = false; K.game.stop(); K.game.happy(); K.audio.play('win'); K.fx.flash('#fff3d0', 0.9);
      if (stage >= G.cleared) G.cleared = stage + 1; K.meta.track('dawns', 1); K.save.mark();
      runCoins += 150 + stage * 100;
      setTimeout(() => endPanel(true), 1200);
    }
    function endPanel(won) {
      K.meta.track('runs', 1);
      const coins = Math.round((runCoins + kills / 10) * (1 + G.up.greed * 0.1));
      G.bestT[stage] = Math.max(G.bestT[stage] || 0, Math.floor(time)); K.save.mark();
      K.meta.addXp(Math.floor(time / 10) + P.lvl);
      const body = `<p>${won ? K.t(['The sun rises. You made it!', 'O sol nasceu. Você conseguiu!']) : K.t(['Your lantern went out...', 'Sua lanterna apagou...'])}</p><div class="kit-row"><div class="grow">${K.t(['Survived', 'Sobreviveu'])}</div><b>${K.fmtTime(time)}</b></div><div class="kit-row"><div class="grow">${K.t(['Shadows cleared', 'Sombras dissipadas'])}</div><b>${kills}</b></div><div class="kit-row"><div class="grow">${K.t('level')}</div><b>${P.lvl}</b></div><div class="kit-big">${K.icon.coin} ${coins}</div>`;
      const pnl = K.ui.panel({ title: won ? K.t(['Dawn!', 'Amanheceu!']) : K.t('gameOver'), body, closable: false });
      const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      let paid = false; const pay = (m) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } };
      if (!won && !revived) pnl.foot.appendChild(K.ui.adBtn(K.t('revive'), () => { pnl.close(); revived = true; P.hp = P.max; P.inv = 3; enemies = enemies.filter((e) => Math.hypot(e.x - P.x, e.y - P.y) > 250); playing = true; K.game.start(); K.audio.play('power'); K.fx.flash('#fff', 0.6); }));
      pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), (b) => { pay(2); b.remove(); }));
      pnl.foot.appendChild(K.ui.btn(K.t('restart'), '', () => { pay(1); pnl.close(); K.meta.showPending(() => K.ads.midgame().then(() => startRun(stage))); }));
      pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pay(1); pnl.close(); showMenu(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    function pauseMenu() {
      if (paused) return; paused = true; K.game.stop();
      const p = K.meta.openSettings([K.ui.btn(K.t('menu'), 'ghost', () => { p.close(); showMenu(); })]);
      const oc = p.close; p.close = () => { oc(); if (playing) { paused = false; K.game.start(); } };
    }

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Move with WASD/arrows or drag anywhere on touch. Your weapons fire on their own. Collect sparks of light to level up and pick upgrades. Survive until dawn (10:00).', pt: 'Mova com WASD/setas ou arraste na tela. Suas armas atiram sozinhas. Pegue faíscas de luz para subir de nível e escolher melhorias. Sobreviva até o amanhecer (10:00).' },
      missions: [
        { stat: 'kills', base: 400, reward: 90, text: { en: 'Clear {n} shadows', pt: 'Dissipe {n} sombras' } },
        { stat: 'survive', base: 180, type: 'max', cap: 600, reward: 110, text: { en: 'Survive {n} seconds in one night', pt: 'Sobreviva {n} segundos numa noite' } },
        { stat: 'upgrades', base: 12, reward: 70, text: { en: 'Pick {n} upgrades', pt: 'Escolha {n} melhorias' } },
        { stat: 'bosses', base: 1, reward: 150, text: { en: 'Defeat {n} great shadow(s)', pt: 'Derrote {n} grande(s) sombra(s)' } },
        { stat: 'runs', base: 3, reward: 50, text: { en: 'Play {n} nights', pt: 'Jogue {n} noites' } },
      ],
    });
    K.meta.buildHud({ onSettings: () => (playing ? pauseMenu() : K.meta.openSettings()) });
    const hud = K.el('div', 'hud'); K.ui.root.appendChild(hud);
    hud.innerHTML = '<div class="xp"><i></i><b></b></div><div class="row"><span class="tm"></span><span class="kl"></span><span class="cn"></span></div>';
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    let selStage = Math.min(G.cleared, STAGES.length - 1);
    function showMenu() {
      playing = false; paused = false; K.game.stop();
      hud.style.display = 'none'; menu.style.display = ''; K.meta.setMenuButtonsVisible(true);
      const S = STAGES[selStage];
      menu.innerHTML = `<h1>Lantern<span>Night</span></h1><p class="sub">${K.t(S.n)} · ${K.t('best')} ${K.fmtTime(G.bestT[selStage] || 0)}</p>`;
      const play = K.ui.btn(K.t('play'), 'big', () => startRun(selStage)); play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.btn('☾ ' + K.t(['Stage', 'Fase']), '', openStages));
      row.appendChild(K.ui.btn('☺ ' + K.t(['Heroes', 'Heróis']), '', openHeroes));
      row.appendChild(K.ui.btn('✦ ' + K.t(['Blessings', 'Bênçãos']), '', openMeta));
      menu.appendChild(row);
      K.meta.showPending();
      if (!P) newRun(selStage);
    }
    function startRun(si) {
      newRun(si); playing = true; paused = false;
      menu.style.display = 'none'; hud.style.display = ''; K.meta.setMenuButtonsVisible(false);
      K.game.start(); K.audio.play('power');
      K.fx.text(W / 2, H * 0.3, K.t(STAGES[si].n), { color: WARM, stroke: '#000', size: 34, life: 2 });
    }
    function openStages() {
      const body = K.el('div');
      const pnl = K.ui.panel({ title: K.t(['Stage', 'Fase']), body });
      STAGES.forEach((s, i) => {
        const lock = i > G.cleared;
        const row = K.el('div', 'kit-row', `<div class="grow"><b>${K.t(s.n)}</b><div class="kit-note">${lock ? K.t(['Reach dawn on the previous stage', 'Sobreviva até o amanhecer na fase anterior']) : K.t('best') + ' ' + K.fmtTime(G.bestT[i] || 0)}</div></div>`);
        if (!lock) row.appendChild(K.ui.btn(selStage === i ? '✓' : '▶', 'sm', () => { selStage = i; pnl.close(); showMenu(); }));
        else row.appendChild(K.el('b', '', '🔒'));
        body.appendChild(row);
      });
    }
    function openHeroes() {
      const body = K.el('div', 'kit-grid');
      K.ui.panel({ title: K.t(['Heroes', 'Heróis']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        HEROES.forEach((h) => {
          const own = G.heroes.includes(h.id);
          const c = K.el('canvas'); c.width = 70; c.height = 80; const g = c.getContext('2d'); g.translate(35, 55); drawHero(g, h.col, 0, 1, 1.4);
          const cell = K.el('div', 'kit-cell' + (G.hero === h.id ? ' on' : '')); cell.appendChild(c);
          cell.appendChild(K.el('div', '', `${K.t(h.n)}<br><small>${K.t(WEAPONS[h.w].n)}</small>`));
          cell.appendChild(own ? K.ui.btn(G.hero === h.id ? '✓' : K.t('equip'), 'sm', () => { G.hero = h.id; K.save.mark(); render(); })
            : h.gems ? K.ui.btn(K.icon.gem + ' ' + h.gems, 'sm', () => { if (K.meta.spendGems(h.gems)) { G.heroes.push(h.id); G.hero = h.id; K.save.mark(); render(); } })
              : K.ui.btn(K.icon.coin + ' ' + h.p, 'sm', () => { if (K.meta.spend(h.p)) { G.heroes.push(h.id); G.hero = h.id; K.save.mark(); render(); } }));
          body.appendChild(cell);
        });
      };
      render();
    }
    function openMeta() {
      const body = K.el('div');
      K.ui.panel({ title: K.t(['Blessings', 'Bênçãos']), body });
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
    function drawHero(g, col, walk, face, s) {
      g.save(); g.scale(face * (s || 1), s || 1);
      const b = Math.abs(Math.sin(walk)) * 2;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 14, 11, 4, 0, 0, 6.283); g.fill();
      g.fillStyle = '#2a2233'; g.fillRect(-6, 4 - b, 4, 10); g.fillRect(2, 4 - b, 4, 10);
      g.fillStyle = col; g.beginPath(); g.moveTo(-10, 6 - b); g.lineTo(10, 6 - b); g.lineTo(7, -12 - b); g.lineTo(-7, -12 - b); g.closePath(); g.fill();
      g.fillStyle = '#f2d6b3'; g.beginPath(); g.arc(0, -17 - b, 7, 0, 6.283); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(0, -19 - b, 8, Math.PI, 0); g.fill(); // hood
      g.fillStyle = '#2a2233'; g.fillRect(2, -18 - b, 2, 2);
      // lantern
      g.strokeStyle = '#3a2f22'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, -2 - b); g.lineTo(14, -6 - b); g.stroke();
      g.fillStyle = WARM; g.fillRect(12, -5 - b, 6, 8); g.strokeRect(12, -5 - b, 6, 8);
      g.restore();
    }
    function drawEnemy(e) {
      const s = toS(e.x, e.y), z = zoom(), r = e.r * z;
      ctx.save(); ctx.translate(s.x, s.y);
      ctx.fillStyle = e.hit > 0 ? '#ffe8b0' : ETYPES[e.t].col;
      const t = time * 6 + e.ph;
      if (e.t === 'bat') { const f = Math.sin(t * 3) * 0.6; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.5, 0, 0, 6.283); ctx.fill(); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * r * 1.4, -r * (0.8 + f), sd * r * 1.8, r * 0.2); ctx.quadraticCurveTo(sd * r, 0, 0, r * 0.3); ctx.fill(); } }
      else if (e.t === 'moth') { const f = Math.sin(t * 2.5) * 0.3; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * r * 0.6, -r * 0.2, r * 0.8, r * (0.6 + f), sd * 0.5, 0, 6.283); ctx.fill(); } ctx.fillStyle = '#2b2436'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.7, 0, 0, 6.283); ctx.fill(); }
      else if (e.t === 'ghost') { ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(0, -r * 0.2, r, Math.PI, 0); for (let i = 0; i <= 4; i++) ctx.lineTo(r - (i / 4) * r * 2, r * 0.8 + (i % 2 ? -r * 0.3 : 0) + Math.sin(t + i) * 2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
      else { const wob = 1 + Math.sin(t) * 0.08; ctx.beginPath(); ctx.ellipse(0, 0, r * wob, r / wob, 0, 0, 6.283); ctx.fill(); if (e.t === 'brute' || e.boss) { for (let i = 0; i < 5; i++) { const a = -2.4 + i * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); ctx.lineTo(Math.cos(a + 0.2) * r * 0.8, Math.sin(a + 0.2) * r * 0.8); ctx.fill(); } } }
      // glowing eyes
      const ex = Math.sign(P.x - e.x) * r * 0.2;
      ctx.fillStyle = e.boss ? '#ff4d4d' : '#ffd36b'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(ex - r * 0.25, -r * 0.15, Math.max(1.5, r * 0.13), 0, 6.283); ctx.arc(ex + r * 0.25, -r * 0.15, Math.max(1.5, r * 0.13), 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0;
      if (e.boss) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(-r, -r - 12, r * 2, 5); ctx.fillStyle = '#ff4d4d'; ctx.fillRect(-r, -r - 12, r * 2 * (e.hp / e.max), 5); }
      ctx.restore();
    }
    let tt = 0;
    const lights = [];
    K.loop((dt) => {
      tt += dt; update(dt); K.fx.update(dt);
      if (playing && P) {
        hud.querySelector('.xp i').style.width = (100 * P.xp) / P.need + '%';
        hud.querySelector('.xp b').textContent = K.t('level') + ' ' + P.lvl;
        hud.querySelector('.tm').textContent = K.fmtTime(time) + ' / 10:00';
        hud.querySelector('.kl').textContent = '✦ ' + kills;
        hud.querySelector('.cn').textContent = '● ' + runCoins;
      }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const S = STAGES[stage] || STAGES[0];
      ctx.fillStyle = S.ground; ctx.fillRect(0, 0, W, H);
      if (!P) return;
      const z = zoom();
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      // ground: scattered grass tufts and stones (deterministic by cell)
      const cs = 90, x0 = Math.floor((cam.x - W / 2 / z) / cs) - 1, x1 = Math.ceil((cam.x + W / 2 / z) / cs) + 1, y0 = Math.floor((cam.y - H / 2 / z) / cs) - 1, y1 = Math.ceil((cam.y + H / 2 / z) / cs) + 1;
      for (let gx = x0; gx < x1; gx++) for (let gy = y0; gy < y1; gy++) {
        const h = Math.abs((gx * 73856093) ^ (gy * 19349663)) % 1000;
        const s = toS(gx * cs + (h % 70), gy * cs + ((h * 7) % 70));
        ctx.fillStyle = S.dot;
        if (h < 300) { ctx.beginPath(); ctx.ellipse(s.x, s.y, 10 * z, 6 * z, 0, 0, 6.283); ctx.fill(); }
        else if (h < 700) { ctx.strokeStyle = S.dot; ctx.lineWidth = 2; ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(s.x + k * 4 * z, s.y); ctx.lineTo(s.x + k * 7 * z, s.y - 10 * z); } ctx.stroke(); }
        else if (h < 730) { ctx.fillStyle = '#0a0c0e'; ctx.beginPath(); ctx.moveTo(s.x, s.y - 60 * z); ctx.lineTo(s.x - 24 * z, s.y + 10 * z); ctx.lineTo(s.x + 24 * z, s.y + 10 * z); ctx.fill(); ctx.fillRect(s.x - 3 * z, s.y + 10 * z, 6 * z, 12 * z); }
      }
      // pickups
      for (const g of gems) { const s = toS(g.x, g.y); if (s.x < -20 || s.y < -20 || s.x > W + 20 || s.y > H + 20) continue; ctx.fillStyle = g.big ? '#ffd36b' : '#9fe3ff'; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(0.785); const q = (g.big ? 6 : 4) * z; ctx.fillRect(-q, -q, q * 2, q * 2); ctx.restore(); }
      for (const c of coinsD) { const s = toS(c.x, c.y); ctx.fillStyle = c.heal ? '#ff7b8a' : '#f6c343'; ctx.beginPath(); ctx.arc(s.x, s.y, 6 * z, 0, 6.283); ctx.fill(); }
      for (const c of chests) { const s = toS(c.x, c.y); ctx.fillStyle = '#b8692c'; ctx.fillRect(s.x - 14, s.y - 10, 28, 20); ctx.fillStyle = '#f6d45e'; ctx.fillRect(s.x - 3, s.y - 4, 6, 8); }
      // enemies & hero, sorted by y
      const list = enemies.slice(); list.push({ hero: true, y: P.y });
      list.sort((a, b) => a.y - b.y);
      for (const e of list) {
        if (e.hero) { const s = toS(P.x, P.y); ctx.save(); ctx.translate(s.x, s.y); if (P.inv > 0 && Math.floor(tt * 20) % 2) ctx.globalAlpha = 0.5; drawHero(ctx, P.col, P.walk, P.face, z * 1.2); ctx.restore(); continue; }
        const s = toS(e.x, e.y); if (s.x < -60 || s.y < -60 || s.x > W + 60 || s.y > H + 60) continue;
        drawEnemy(e);
      }
      // weapons
      for (const k in P.weapons) {
        const w = P.weapons[k], st = wStats(k, w.lvl);
        if (k === 'orbit') for (let i = 0; i < st.n; i++) { const a = (w.a || 0) + (i / st.n) * 6.283, s = toS(P.x + Math.cos(a) * st.rad, P.y + Math.sin(a) * st.rad); ctx.fillStyle = '#e8ff8a'; ctx.shadowColor = '#e8ff8a'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(s.x, s.y, 5 * z, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
        if (k === 'aura') { const s = toS(P.x, P.y); ctx.strokeStyle = 'rgba(255,140,60,' + (0.25 + Math.sin(tt * 6) * 0.1) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, st.rad * z, 0, 6.283); ctx.stroke(); ctx.fillStyle = 'rgba(255,140,60,.07)'; ctx.fill(); }
      }
      for (const sh of shots) {
        const s = toS(sh.x, sh.y);
        if (sh.k === 'beam') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(sh.a); ctx.globalAlpha = sh.life / 0.25; ctx.fillStyle = '#fff3c0'; ctx.fillRect(0, -sh.w * z / 2, sh.len * z, sh.w * z); ctx.restore(); ctx.globalAlpha = 1; continue; }
        if (sh.k === 'boom') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(sh.spin); ctx.fillStyle = '#d6dcff'; ctx.beginPath(); ctx.arc(0, 0, 12 * z, 0.3, 5.6); ctx.arc(4 * z, 0, 9 * z, 5.6, 0.3, true); ctx.fill(); ctx.restore(); continue; }
        ctx.fillStyle = sh.k === 'spark' ? '#ffe36b' : WARM; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(s.x, s.y, sh.r * z, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      }
      // darkness with lantern light hole
      const dawnK = K.clamp((time - DAWN + 60) / 60, 0, 1);
      dctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
      dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H);
      dctx.fillStyle = `rgba(4,4,12,${0.78 * (1 - dawnK)})`; dctx.fillRect(0, 0, W, H);
      dctx.globalCompositeOperation = 'destination-out';
      const light = (x, y, r) => { const gr = dctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(x, y, r, 0, 6.283); dctx.fill(); };
      const ps = toS(P.x, P.y);
      light(ps.x, ps.y, (230 + Math.sin(tt * 9) * 6 + pas('area') * 20) * z);
      for (const sh of shots) if (sh.k !== 'beam') { const s = toS(sh.x, sh.y); light(s.x, s.y, 40 * z); }
      if (P.weapons.orbit) { const w = P.weapons.orbit, st = wStats('orbit', w.lvl); for (let i = 0; i < st.n; i++) { const a = (w.a || 0) + (i / st.n) * 6.283; const s = toS(P.x + Math.cos(a) * st.rad, P.y + Math.sin(a) * st.rad); light(s.x, s.y, 45 * z); } }
      ctx.drawImage(dark, 0, 0, W, H);
      // warm tint
      ctx.globalCompositeOperation = 'lighter'; const wg = ctx.createRadialGradient(ps.x, ps.y, 0, ps.x, ps.y, 200 * z); wg.addColorStop(0, 'rgba(255,170,80,.12)'); wg.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      if (dawnK > 0) { ctx.fillStyle = `rgba(255,200,140,${dawnK * 0.25})`; ctx.fillRect(0, 0, W, H); }
      K.fx.draw(ctx);
      // health bar under hero
      if (playing) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(ps.x - 20, ps.y + 22 * z, 40, 5); ctx.fillStyle = '#e8505b'; ctx.fillRect(ps.x - 20, ps.y + 22 * z, 40 * (P.hp / P.max), 5); }
      if (joy && playing) { ctx.strokeStyle = 'rgba(255,179,71,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.x, joy.y, 44, 0, 6.283); ctx.stroke(); const dx = joy.cx - joy.x, dy = joy.cy - joy.y, d = Math.min(44, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); ctx.fillStyle = 'rgba(255,179,71,.4)'; ctx.beginPath(); ctx.arc(joy.x + Math.cos(a) * d, joy.y + Math.sin(a) * d, 18, 0, 6.283); ctx.fill(); }
      ctx.restore();
      K.fx.drawFlash(ctx, W, H);
      void lights;
    });

    K.debug = { busy() { time = 240; P.weapons.orbit = { lvl: 3, cd: 0 }; P.weapons.aura = { lvl: 2, cd: 0 }; P.weapons.spark = { lvl: 3, cd: 0 }; for (let i = 0; i < 120; i++) spawn(K.pick(['blob', 'bat', 'moth', 'ghost']), K.rand(200, 520)); } };
    K.music.set({ bpm: 84, chords: [[57, 60, 64], [53, 57, 60], [55, 58, 62], [52, 56, 59]], bass: true, pad: true, padWave: 'triangle', lead: [69, 0, 0, 72, 0, 0, 71, 0, 69, 0, 0, 0, 64, 0, 0, 0, 65, 0, 0, 69, 0, 0, 68, 0, 64, 0, 0, 0, 0, 0, 0, 0], leadWave: 'sine', drums: { k: [1, 0, 0, 0, 0, 0, 1, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

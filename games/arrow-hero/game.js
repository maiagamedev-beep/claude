/* Arrow Hero — room-by-room roguelite archer. Move to dodge, stand still to shoot. Pick skills between rooms.
   5 chapters x 10 rooms with a boss every 5th room. Stylised tabletop-miniature look. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const SKILLS = {
    multi: { n: ['Multishot', 'Tiro múltiplo'], d: ['+1 arrow forward', '+1 flecha para frente'], ic: '⋙' },
    diag: { n: ['Diagonal arrows', 'Flechas diagonais'], d: ['+2 angled arrows', '+2 flechas em ângulo'], ic: '⋎' },
    rear: { n: ['Rear arrow', 'Flecha traseira'], d: ['+1 arrow backward', '+1 flecha para trás'], ic: '⇆' },
    ricochet: { n: ['Ricochet', 'Ricochete'], d: ['Arrows bounce to another enemy', 'Flechas pulam para outro inimigo'], ic: '↯' },
    pierce: { n: ['Piercing', 'Perfurante'], d: ['Arrows go through enemies', 'Flechas atravessam inimigos'], ic: '➶' },
    atk: { n: ['Attack boost', 'Ataque +'], d: ['+25% damage', '+25% dano'], ic: '⚔' },
    spd: { n: ['Attack speed', 'Velocidade de ataque'], d: ['+20% fire rate', '+20% cadência'], ic: '⚡' },
    hp: { n: ['Heart boost', 'Coração +'], d: ['+30% max HP and heal', '+30% vida máx. e cura'], ic: '❤' },
    fire: { n: ['Blaze', 'Chama'], d: ['Arrows set enemies on fire', 'Flechas incendeiam'], ic: '🔥' },
    orb: { n: ['Guardian orb', 'Orbe guardião'], d: ['An orb circles you and hurts foes', 'Um orbe gira e fere inimigos'], ic: '◎' },
  };
  const CH = [{ n: ['Mossy Ruins', 'Ruínas Musgosas'], floor: '#8fb996', wall: '#4f6d57' }, { n: ['Desert Tomb', 'Tumba do Deserto'], floor: '#e9c46a', wall: '#a47148' }, { n: ['Frost Hall', 'Salão Gelado'], floor: '#caf0f8', wall: '#5e81ac' }, { n: ['Lava Keep', 'Forte de Lava'], floor: '#d8a48f', wall: '#6d2e46' }, { n: ['Sky Temple', 'Templo Celeste'], floor: '#e0c3fc', wall: '#5a4e8c' }];
  const META = [{ id: 'atk', n: ['Base attack +8%', 'Ataque base +8%'], max: 10, base: 200 }, { id: 'hp', n: ['Base health +10%', 'Vida base +10%'], max: 10, base: 200 }, { id: 'spd', n: ['Base fire rate +5%', 'Cadência base +5%'], max: 8, base: 250 }, { id: 'luck', n: ['Coin luck +10%', 'Sorte de moedas +10%'], max: 8, base: 220 }];

  K.boot('arrow_hero', { g: { ch: 0, best: {}, up: { atk: 0, hp: 0, spd: 0, luck: 0 } } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, sc = 1, ox = 0, oy = 0;
    const RW = 540, RH = 800;
    let P = null, foes = [], arrows = [], shots = [], drops = [], room = 0, ch = 0, playing = false, paused = false, door = false, skills = {}, runCoins = 0, revived = false, joy = null, orbA = 0;
    const toS = (x, y) => ({ x: ox + x * sc, y: oy + y * sc });
    function newRun(c) { ch = c; room = 0; skills = {}; runCoins = 0; revived = false; const hpMax = 100 * (1 + G.up.hp * 0.1); P = { x: RW / 2, y: RH - 90, hp: hpMax, max: hpMax, cd: 0, face: -Math.PI / 2, inv: 0, moving: false, bob: 0 }; nextRoom(); playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    function nextRoom() {
      room++; foes = []; arrows = []; shots = []; drops = []; door = false; P.x = RW / 2; P.y = RH - 90;
      const boss = room % 5 === 0, r = K.rng(ch * 1000 + room * 17 + Date.now() % 997), lvl = ch * 10 + room;
      if (boss) foes.push(foe(boss ? 'boss' : 'slime', RW / 2, 200, lvl));
      else { const n = 3 + Math.floor(room / 2) + ch; for (let k = 0; k < n; k++) foes.push(foe(K.pick(['slime', 'bat', 'archer', 'golem'].slice(0, 2 + Math.min(2, Math.floor((room + ch * 3) / 3)))), 60 + r() * (RW - 120), 90 + r() * 380, lvl)); }
      obstacles = []; if (!boss) for (let k = 0; k < 2 + (room % 3); k++) { const x = 60 + r() * (RW - 160), y = 250 + r() * 300; obstacles.push({ x, y, w: 60 + r() * 60, h: 40 }); }
      K.fx.text(W / 2, H * 0.3, boss ? K.t(['BOSS!', 'CHEFE!']) : K.t(['Room', 'Sala']) + ' ' + room, { color: boss ? '#ff4d6d' : '#fff', stroke: '#1d1d1d', size: boss ? 50 : 34, life: 1.4 });
    }
    let obstacles = [];
    function foe(t, x, y, lvl) {
      const k = 1 + lvl * 0.18, T = { slime: { hp: 40, sp: 60, r: 18, col: '#6ab04c' }, bat: { hp: 25, sp: 120, r: 14, col: '#6a4c93' }, archer: { hp: 35, sp: 40, r: 16, col: '#e76f51' }, golem: { hp: 120, sp: 35, r: 26, col: '#8d99ae' }, boss: { hp: 900, sp: 50, r: 46, col: '#d62828' } }[t];
      return { t, x, y, hp: T.hp * k, max: T.hp * k, sp: T.sp, r: T.r, col: T.col, cd: K.rand(1, 2.5), burn: 0, hit: 0, ph: Math.random() * 6, dmg: (t === 'boss' ? 25 : 12) * (1 + lvl * 0.06) };
    }
    const lvlOf = (k) => skills[k] || 0;
    const dmg = () => 20 * (1 + G.up.atk * 0.08) * (1 + lvlOf('atk') * 0.25);
    const rate = () => 0.7 / ((1 + G.up.spd * 0.05) * (1 + lvlOf('spd') * 0.2));
    function fire() {
      const t = nearest(); if (!t) return; P.face = Math.atan2(t.y - P.y, t.x - P.x);
      const dirs = [0]; for (let k = 0; k < lvlOf('multi'); k++) dirs.push(0); for (let k = 0; k < lvlOf('diag'); k++) dirs.push(-0.45, 0.45); for (let k = 0; k < lvlOf('rear'); k++) dirs.push(Math.PI);
      let multiIdx = 0;
      dirs.forEach((d, i) => { const a = P.face + d, off = d === 0 ? (multiIdx++ - lvlOf('multi') / 2) * 12 : 0; arrows.push({ x: P.x + Math.cos(a + 1.57) * off, y: P.y + Math.sin(a + 1.57) * off, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, bounces: lvlOf('ricochet'), pierce: lvlOf('pierce') ? 2 : 0, hitSet: new Set(), life: 1.4 }); });
      K.audio.play('shoot', 1.3);
    }
    const nearest = () => { let b = null, bd = 1e9; foes.forEach((f) => { const d = Math.hypot(f.x - P.x, f.y - P.y); if (d < bd) { bd = d; b = f; } }); return b; };
    function hurtFoe(f, d) {
      f.hp -= d; f.hit = 0.1; if (lvlOf('fire')) f.burn = 2;
      if (Math.random() < 0.35) { const s = toS(f.x, f.y); K.fx.text(s.x, s.y - f.r * sc, Math.round(d), { color: '#fff', stroke: '#1d1d1d', size: 16, life: 0.5 }); }
      if (f.hp <= 0 && !f.dead) {
        f.dead = true; const s = toS(f.x, f.y); K.fx.burst(s.x, s.y, { n: f.t === 'boss' ? 40 : 12, colors: [f.col, '#fff'], speed: 260, size: 6, shape: 'square', life: 0.6 }); K.audio.play(f.t === 'boss' ? 'explode' : 'pop', 0.9); K.meta.track('kills', 1);
        const coins = f.t === 'boss' ? 30 : Math.random() < 0.5 * (1 + G.up.luck * 0.1) ? 2 : 0; for (let k = 0; k < coins; k += 2) drops.push({ x: f.x + K.rand(-20, 20), y: f.y + K.rand(-20, 20), k: 'c' }); if (Math.random() < 0.08) drops.push({ x: f.x, y: f.y, k: 'h' });
        if (f.t === 'boss') { K.fx.shake(14); K.game.happy(); K.meta.track('bosses', 1); }
      }
    }
    function update(dt) {
      if (!playing || paused) return;
      const keys = K._keys || {}; let mx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), my = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      if (joy) { const dx = joy.cx - joy.x, dy = joy.cy - joy.y, d = Math.hypot(dx, dy); if (d > 8) { mx = dx / Math.max(d, 40); my = dy / Math.max(d, 40); } }
      const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
      P.moving = ml > 0.1;
      if (P.moving) { const nx = K.clamp(P.x + mx * 230 * dt, 24, RW - 24), ny = K.clamp(P.y + my * 230 * dt, 24, RH - 24); if (!obstacles.some((o) => nx > o.x - 14 && nx < o.x + o.w + 14 && ny > o.y - 14 && ny < o.y + o.h + 14)) { P.x = nx; P.y = ny; } P.face = Math.atan2(my, mx); P.bob += dt * 12; }
      P.cd -= dt; if (!P.moving && P.cd <= 0 && foes.length) { fire(); P.cd = rate(); }
      P.inv = Math.max(0, P.inv - dt); orbA += dt * 3;
      // orbs
      for (let k = 0; k < lvlOf('orb'); k++) { const a = orbA + (k * 6.283) / lvlOf('orb'), x = P.x + Math.cos(a) * 60, y = P.y + Math.sin(a) * 60; foes.forEach((f) => { if (Math.hypot(f.x - x, f.y - y) < f.r + 12 && (!f.orbT || f.orbT < performance.now())) { f.orbT = performance.now() + 300; hurtFoe(f, dmg() * 0.6); } }); }
      // foes
      for (const f of foes) {
        f.hit -= dt; if (f.burn > 0) { f.burn -= dt; hurtFoe(f, dmg() * 0.25 * dt); }
        const dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy) || 1; f.cd -= dt;
        if (f.t === 'slime' || f.t === 'golem') { f.x += (dx / d) * f.sp * dt; f.y += (dy / d) * f.sp * dt; }
        else if (f.t === 'bat') { f.x += (dx / d) * f.sp * dt + Math.cos(performance.now() / 200 + f.ph) * 60 * dt; f.y += (dy / d) * f.sp * dt + Math.sin(performance.now() / 180 + f.ph) * 60 * dt; }
        else if (f.t === 'archer') { if (d > 260) { f.x += (dx / d) * f.sp * dt; f.y += (dy / d) * f.sp * dt; } if (f.cd <= 0) { f.cd = 2.2; shots.push({ x: f.x, y: f.y, vx: (dx / d) * 260, vy: (dy / d) * 260, r: 7 }); } }
        else if (f.t === 'boss') { f.x += Math.sin(performance.now() / 900) * 80 * dt; f.y = 200 + Math.sin(performance.now() / 1300) * 60; if (f.cd <= 0) { f.cd = 1.6; const n = 10 + ch * 2; for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + performance.now() / 700; shots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 9 }); } K.audio.play('laser', 0.6); } }
        f.x = K.clamp(f.x, f.r, RW - f.r); f.y = K.clamp(f.y, f.r, RH - f.r);
        if (d < f.r + 16 && P.inv <= 0) hurtP(f.dmg);
      }
      for (const a of arrows) {
        a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        if (a.x < 0 || a.x > RW || a.y < 0 || a.y > RH || obstacles.some((o) => a.x > o.x && a.x < o.x + o.w && a.y > o.y && a.y < o.y + o.h)) a.life = 0;
        for (const f of foes) { if (f.dead || a.hitSet.has(f)) continue; if (Math.hypot(f.x - a.x, f.y - a.y) < f.r + 6) { hurtFoe(f, dmg()); a.hitSet.add(f); if (a.bounces > 0) { a.bounces--; const n = foes.find((q) => !q.dead && !a.hitSet.has(q)); if (n) { const an = Math.atan2(n.y - a.y, n.x - a.x); a.vx = Math.cos(an) * 700; a.vy = Math.sin(an) * 700; continue; } } if (a.pierce > 0) { a.pierce--; continue; } a.life = 0; break; } }
      }
      arrows = arrows.filter((a) => a.life > 0);
      for (const s of shots) { s.x += s.vx * dt; s.y += s.vy * dt; if (Math.hypot(s.x - P.x, s.y - P.y) < s.r + 12 && P.inv <= 0) { s.dead = true; hurtP(10 * (1 + ch * 0.3 + room * 0.03)); } }
      shots = shots.filter((s) => !s.dead && s.x > -20 && s.x < RW + 20 && s.y > -20 && s.y < RH + 20);
      foes = foes.filter((f) => !f.dead);
      drops.forEach((dr) => { const d = Math.hypot(dr.x - P.x, dr.y - P.y); if (!foes.length || d < 60) { dr.x += (P.x - dr.x) * dt * 8; dr.y += (P.y - dr.y) * dt * 8; } if (d < 20) { dr.got = true; if (dr.k === 'c') { runCoins += 2; K.audio.play('coin', 1.3); } else { P.hp = Math.min(P.max, P.hp + P.max * 0.2); K.audio.play('power'); } } });
      drops = drops.filter((d) => !d.got);
      if (!foes.length && !door) { door = true; K.audio.play('levelup'); setTimeout(() => { if (playing) skillPick(); }, 700); }
      if (door && P.y < 50 && Math.abs(P.x - RW / 2) < 50 && !paused && choseSkill) { choseSkill = false; if (room >= 10) chapterWin(); else nextRoom(); }
    }
    let choseSkill = false;
    function hurtP(d) { P.hp -= d; P.inv = 0.6; K.audio.play('hurt'); K.fx.shake(6); K.fx.flash('#ff4d6d', 0.25); if (P.hp <= 0) { P.hp = 0; die(); } }
    function skillPick() {
      paused = true; K.game.stop();
      const opts = Object.keys(SKILLS).sort(() => Math.random() - 0.5).slice(0, 3);
      const body = K.el('div', 'ahsk');
      const p = K.ui.panel({ title: K.t(['Choose a skill', 'Escolha uma habilidade']), body, closable: false });
      const render = (list) => { body.innerHTML = ''; list.forEach((k) => { const S = SKILLS[k]; const b = K.el('button', 'sk', `<i>${S.ic}</i><b>${K.t(S.n)}${lvlOf(k) ? ' +' + (lvlOf(k) + 1) : ''}</b><small>${K.t(S.d)}</small>`); b.onclick = () => { skills[k] = lvlOf(k) + 1; if (k === 'hp') { P.max *= 1.3; P.hp = Math.min(P.max, P.hp + P.max * 0.3); } K.audio.play('power'); p.close(); paused = false; choseSkill = true; K.game.start(); K.ui.toast(K.t(['Walk through the door ↑', 'Passe pela porta ↑'])); K.meta.track('skills', 1); }; body.appendChild(b); }); };
      render(opts);
      p.foot.appendChild(K.ui.adBtn(K.t(['Reroll', 'Sortear de novo']), () => render(Object.keys(SKILLS).sort(() => Math.random() - 0.5).slice(0, 3))));
      p.panel.appendChild(p.foot);
    }
    function die() {
      playing = false; K.game.stop(); K.audio.play('lose'); K.meta.track('runs', 1); K.meta.addXp(room * 2 + ch * 10);
      const b = G.best[ch] || 0; if (room > b) G.best[ch] = room; K.save.mark();
      setTimeout(() => K.std.end({ text: K.t(CH[ch].n) + ' — ' + K.t(['Room', 'Sala']) + ' ' + room, rows: [[K.t(['Skills', 'Habilidades']), Object.keys(skills).length]], coins: runCoins + room * 5,
        revive: revived ? null : () => { revived = true; P.hp = P.max; P.inv = 2; shots = []; playing = true; K.game.start(); }, restart: () => newRun(ch), menu: showMenu }), 700);
    }
    function chapterWin() {
      playing = false; K.game.stop(); K.audio.play('win'); K.std.confetti(['#ffd166', '#fff', '#06d6a0']);
      G.best[ch] = 10; if (G.ch === ch && G.ch < CH.length - 1) G.ch++; K.meta.track('chapters', 1); K.meta.addXp(60); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Chapter cleared!', 'Capítulo completo!']), rows: [[K.t(CH[ch].n), '10/10']], coins: runCoins + 150 + ch * 100, gems: 5, mult: 3, next: { fn: () => newRun(G.ch) }, menu: showMenu }), 900);
    }
    // input
    K._keys = {}; window.addEventListener('keydown', (e) => (K._keys[e.code] = true)); window.addEventListener('keyup', (e) => (K._keys[e.code] = false));
    cv.addEventListener('pointerdown', (e) => { joy = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY }; });
    window.addEventListener('pointermove', (e) => { if (joy && joy.id === e.pointerId) { joy.cx = e.clientX; joy.cy = e.clientY; } });
    window.addEventListener('pointerup', (e) => { if (joy && joy.id === e.pointerId) joy = null; });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Move with WASD/arrows or drag anywhere. You shoot automatically when you stand still — move to dodge, stop to attack. Clear the room, pick a skill, walk through the door. Beat the boss in room 10.', pt: 'Mova com WASD/setas ou arrastando. Você atira sozinho quando fica parado — mova para desviar, pare para atacar. Limpe a sala, escolha uma habilidade e passe pela porta. Vença o chefe na sala 10.' },
      missions: [{ stat: 'kills', base: 60, reward: 80, text: { en: 'Defeat {n} monsters', pt: 'Derrote {n} monstros' } }, { stat: 'bosses', base: 1, reward: 150, text: { en: 'Defeat {n} boss(es)', pt: 'Derrote {n} chefe(s)' } }, { stat: 'skills', base: 8, reward: 70, text: { en: 'Learn {n} skills', pt: 'Aprenda {n} habilidades' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Arrow<span>Hero</span>', sub: K.t(CH[G.ch].n) + ' · ' + K.t('best') + ' ' + (G.best[G.ch] || 0) + '/10', onPlay: () => newRun(G.ch),
        buttons: [K.ui.btn('🗺 ' + K.t(['Chapters', 'Capítulos']), '', () => { const body = K.el('div'); const p = K.ui.panel({ title: K.t(['Chapters', 'Capítulos']), body }); CH.forEach((c, i) => { const row = K.el('div', 'kit-row', `<div style="width:28px;height:28px;border-radius:6px;background:${c.floor};border:4px solid ${c.wall}"></div><div class="grow"><b>${K.t(c.n)}</b><div class="kit-note">${G.best[i] || 0}/10</div></div>`); row.appendChild(i <= G.ch ? K.ui.btn('▶', 'sm', () => { p.close(); K.std.hideMenu(); newRun(i); }) : K.el('b', '', '🔒')); body.appendChild(row); }); }),
          K.ui.btn('⬆ ' + K.t(['Talents', 'Talentos']), '', () => K.std.upgrades(K.t(['Talents', 'Talentos']), META, G.up))] });
    }
    function drawHero(x, y) {
      const s = toS(x, y), u = sc, b = P.moving ? Math.abs(Math.sin(P.bob)) * 3 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 16 * u, 16 * u, 6 * u, 0, 0, 6.283); ctx.fill();
      ctx.save(); ctx.translate(s.x, s.y - b); if (P.inv > 0 && Math.floor(performance.now() / 60) % 2) ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#2a9d8f'; ctx.beginPath(); ctx.moveTo(-13 * u, 14 * u); ctx.lineTo(13 * u, 14 * u); ctx.lineTo(9 * u, -8 * u); ctx.lineTo(-9 * u, -8 * u); ctx.fill();
      ctx.fillStyle = '#f4d1ae'; ctx.beginPath(); ctx.arc(0, -15 * u, 9 * u, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#264653'; ctx.beginPath(); ctx.arc(0, -18 * u, 10 * u, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(8 * u, -20 * u); ctx.lineTo(16 * u, -28 * u); ctx.lineTo(10 * u, -16 * u); ctx.fill();
      ctx.rotate(P.face); ctx.strokeStyle = '#8d5524'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(14 * u, 0, 12 * u, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#eee'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14 * u + Math.cos(-1.2) * 12 * u, Math.sin(-1.2) * 12 * u); ctx.lineTo(14 * u + Math.cos(1.2) * 12 * u, Math.sin(1.2) * 12 * u); ctx.stroke();
      ctx.restore();
    }
    function drawFoe(f) {
      const s = toS(f.x, f.y), r = f.r * sc, t = performance.now() / 1000 + f.ph;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + r * 0.9, r, r * 0.35, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = f.hit > 0 ? '#fff' : f.burn > 0 ? '#ff9f1c' : f.col;
      if (f.t === 'slime') { const sq = Math.sin(t * 8) * 0.12; ctx.beginPath(); ctx.ellipse(s.x, s.y, r * (1 + sq), r * (1 - sq), 0, Math.PI, 0); ctx.lineTo(s.x + r, s.y + r * 0.6); ctx.lineTo(s.x - r, s.y + r * 0.6); ctx.fill(); }
      else if (f.t === 'bat') { ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.7, 0, 6.283); ctx.fill(); const fl = Math.sin(t * 20) * 0.5; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + sd * r * 1.8, s.y - r * (0.6 + fl)); ctx.lineTo(s.x + sd * r * 1.4, s.y + r * 0.3); ctx.fill(); } }
      else if (f.t === 'golem') { ctx.fillRect(s.x - r, s.y - r, r * 2, r * 1.8); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(s.x - r, s.y, r * 2, 4); }
      else { ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.283); ctx.fill(); if (f.t === 'boss') { ctx.fillStyle = '#ffd166'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(s.x - r * 0.6 + k * r * 0.3, s.y - r * 0.8); ctx.lineTo(s.x - r * 0.45 + k * r * 0.3, s.y - r * 1.25); ctx.lineTo(s.x - r * 0.3 + k * r * 0.3, s.y - r * 0.8); ctx.fill(); } } }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x - r * 0.3, s.y - r * 0.15, r * 0.22, 0, 6.283); ctx.arc(s.x + r * 0.3, s.y - r * 0.15, r * 0.22, 0, 6.283); ctx.fill(); ctx.fillStyle = '#1d1d1d'; ctx.beginPath(); ctx.arc(s.x - r * 0.3 + Math.sign(P.x - f.x) * 2, s.y - r * 0.12, r * 0.1, 0, 6.283); ctx.arc(s.x + r * 0.3 + Math.sign(P.x - f.x) * 2, s.y - r * 0.12, r * 0.1, 0, 6.283); ctx.fill();
      if (f.hp < f.max) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(s.x - r, s.y - r - 12, r * 2, 5); ctx.fillStyle = '#ef476f'; ctx.fillRect(s.x - r, s.y - r - 12, r * 2 * (f.hp / f.max), 5); }
    }
    K.loop((dt) => { update(dt); K.fx.update(dt); if (playing && P) hud.innerHTML = `<span class="chip">${K.t(CH[ch].n)} · ${room}/10</span><span class="chip">❤ ${Math.ceil(P.hp)}/${Math.ceil(P.max)}</span><span class="chip">● ${runCoins}</span>`; }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const C = CH[ch] || CH[0]; ctx.fillStyle = '#1d1d1d'; ctx.fillRect(0, 0, W, H);
      if (!P) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      const a = toS(0, 0); ctx.fillStyle = C.wall; ctx.fillRect(a.x - 20 * sc, a.y - 20 * sc, (RW + 40) * sc, (RH + 40) * sc);
      ctx.fillStyle = C.floor; ctx.fillRect(a.x, a.y, RW * sc, RH * sc);
      ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < RH; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < RW; x += 60) { const s = toS(x, y); ctx.fillRect(s.x, s.y, 58 * sc, 58 * sc); }
      const d = toS(RW / 2 - 40, -20); ctx.fillStyle = door ? '#ffd166' : '#3d3d3d'; ctx.fillRect(d.x, d.y, 80 * sc, 22 * sc); if (door) { ctx.fillStyle = `rgba(255,209,102,${0.3 + Math.sin(performance.now() / 150) * 0.2})`; ctx.fillRect(d.x, d.y + 22 * sc, 80 * sc, 40 * sc); }
      obstacles.forEach((o) => { const s = toS(o.x, o.y); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(s.x + 4, s.y + 8, o.w * sc, o.h * sc); ctx.fillStyle = C.wall; ctx.fillRect(s.x, s.y, o.w * sc, o.h * sc); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(s.x, s.y, o.w * sc, 6 * sc); });
      drops.forEach((dr) => { const s = toS(dr.x, dr.y); ctx.fillStyle = dr.k === 'c' ? '#ffd166' : '#ef476f'; ctx.beginPath(); ctx.arc(s.x, s.y, 7 * sc, 0, 6.283); ctx.fill(); });
      const list = foes.slice().sort((p, q) => p.y - q.y); list.forEach((f) => { if (f.y < P.y) drawFoe(f); }); drawHero(P.x, P.y); list.forEach((f) => { if (f.y >= P.y) drawFoe(f); });
      for (let k = 0; k < lvlOf('orb'); k++) { const an = orbA + (k * 6.283) / lvlOf('orb'), s = toS(P.x + Math.cos(an) * 60, P.y + Math.sin(an) * 60); ctx.fillStyle = '#48cae4'; ctx.beginPath(); ctx.arc(s.x, s.y, 9 * sc, 0, 6.283); ctx.fill(); }
      ctx.strokeStyle = lvlOf('fire') ? '#ff9f1c' : '#fdf0d5'; ctx.lineWidth = 3 * sc; arrows.forEach((ar) => { const s = toS(ar.x, ar.y), an = Math.atan2(ar.vy, ar.vx); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(an) * 18 * sc, s.y - Math.sin(an) * 18 * sc); ctx.stroke(); });
      shots.forEach((s2) => { const s = toS(s2.x, s2.y); ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(s.x, s.y, s2.r * sc, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s2.r * sc * 0.4, 0, 6.283); ctx.fill(); });
      const hs = toS(P.x, P.y); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(hs.x - 22 * sc, hs.y + 22 * sc, 44 * sc, 5); ctx.fillStyle = '#06d6a0'; ctx.fillRect(hs.x - 22 * sc, hs.y + 22 * sc, 44 * sc * (P.hp / P.max), 5);
      if (joy) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.x, joy.y, 44, 0, 6.283); ctx.stroke(); const dx = joy.cx - joy.x, dy = joy.cy - joy.y, dd = Math.min(44, Math.hypot(dx, dy)), an = Math.atan2(dy, dx); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(joy.x + Math.cos(an) * dd, joy.y + Math.sin(an) * dd, 18, 0, 6.283); ctx.fill(); }
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; sc = Math.min((w - 20) / (RW + 40), (h - 90) / (RH + 40)); ox = (w - RW * sc) / 2; oy = 80 + (h - 90 - RH * sc) / 2; });
    K.music.set({ bpm: 124, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], bass: true, busy: true, arp: [1, 0, 1, 1, 0, 1, 1, 0], arpWave: 'square', drums: { k: [1, 0, 0, 1, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    showMenu();
  }
})();

/* Sinkhole City — steer a hole that swallows anything smaller than itself. Grow, beat the rival holes, 2-minute rounds. three.js */
(function () {
  const K = window.Kit, T = window.THREE;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const WORLD = 60, ROUND = 120;
  const SKINS = [{ c: '#2b2d42', r: '#3a86ff', p: 0 }, { c: '#1b1b1b', r: '#ff006e', p: 400 }, { c: '#10002b', r: '#ffbe0b', p: 700 }, { c: '#03071e', r: '#06d6a0', p: 1000 }, { c: '#000', r: '#ffffff', gems: 30 }];
  const UPG = [{ id: 'size', n: ['Starting size', 'Tamanho inicial'], max: 8, base: 200 }, { id: 'speed', n: ['Speed', 'Velocidade'], max: 8, base: 200 }, { id: 'time', n: ['Round time +5s', 'Tempo +5s'], max: 6, base: 300 }];

  K.boot('sinkhole_city', { g: { best: 0, skin: 0, skins: [0], up: { size: 0, speed: 0, time: 0 }, wins: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new T.Scene(); scene.background = new T.Color('#bde0fe');
    const camera = new T.PerspectiveCamera(45, 1, 0.1, 300); let W = 1, H = 1;
    scene.add(new T.HemisphereLight('#ffffff', '#8899aa', 1.5)); const sun = new T.DirectionalLight('#fff4e0', 1.6); sun.position.set(-10, 20, 8); scene.add(sun);
    const mats = {}; const M = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c, flatShading: true }));
    // ground with road grid texture
    const gTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#8ac926'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#6c757d'; for (let k = 0; k < 2; k++) { g.fillRect(k * 256 + 110, 0, 36, 512); g.fillRect(0, k * 256 + 110, 512, 36); } g.fillStyle = '#e9ecef'; for (let k = 0; k < 2; k++) for (let y = 0; y < 512; y += 20) { g.fillRect(k * 256 + 127, y, 2, 10); g.fillRect(y, k * 256 + 127, 10, 2); } const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(WORLD / 16, WORLD / 16); t.colorSpace = T.SRGBColorSpace; return t; })();
    const ground = new T.Mesh(new T.PlaneGeometry(WORLD * 2, WORLD * 2), new T.MeshLambertMaterial({ map: gTex })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // holes are drawn as dark discs slightly above ground + a ring
    function makeHoleMesh(col, ring) { const g = new T.Group(); const d = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({ color: col })); d.rotation.x = -Math.PI / 2; d.position.y = 0.02; g.add(d); const r = new T.Mesh(new T.RingGeometry(1, 1.08, 40), new T.MeshBasicMaterial({ color: ring })); r.rotation.x = -Math.PI / 2; r.position.y = 0.03; g.add(r); scene.add(g); return g; }
    // objects
    const GC = {}; const geo = (k, f) => GC[k] || (GC[k] = f());
    const TYPES = [
      { n: 'cone', size: 0.35, pts: 1, mk: () => { const m = new T.Mesh(geo('Cone0.2, 0.5, 8', () => new T.ConeGeometry(0.2, 0.5, 8)), M('#fb8500')); m.position.y = 0.25; return m; } },
      { n: 'person', size: 0.4, pts: 2, mk: () => { const g = new T.Group(); const b = new T.Mesh(geo('Cylinder0.12, 0.14, 0.45, 6', () => new T.CylinderGeometry(0.12, 0.14, 0.45, 6)), M(K.pick(['#e63946', '#3a86ff', '#ffbe0b', '#8338ec']))); b.position.y = 0.3; const h = new T.Mesh(geo('Sphere0.11, 6, 5', () => new T.SphereGeometry(0.11, 6, 5)), M('#f4d1ae')); h.position.y = 0.62; g.add(b, h); return g; } },
      { n: 'bench', size: 0.8, pts: 3, mk: () => { const m = new T.Mesh(geo('Box1, 0.3, 0.35', () => new T.BoxGeometry(1, 0.3, 0.35)), M('#9c6644')); m.position.y = 0.2; return m; } },
      { n: 'tree', size: 1.1, pts: 5, mk: () => { const g = new T.Group(); const t = new T.Mesh(geo('Cylinder0.1, 0.14, 0.8, 6', () => new T.CylinderGeometry(0.1, 0.14, 0.8, 6)), M('#7f5539')); t.position.y = 0.4; const c = new T.Mesh(geo('Icosahedron0.6, 0', () => new T.IcosahedronGeometry(0.6, 0)), M(K.pick(['#52b788', '#40916c', '#74c69d']))); c.position.y = 1.1; g.add(t, c); return g; } },
      { n: 'car', size: 1.6, pts: 10, mk: () => { const g = new T.Group(); const b = new T.Mesh(geo('Box1.5, 0.45, 0.8', () => new T.BoxGeometry(1.5, 0.45, 0.8)), M(K.pick(['#ef476f', '#118ab2', '#ffd166', '#06d6a0', '#f8f9fa']))); b.position.y = 0.35; const c = new T.Mesh(geo('Box0.8, 0.35, 0.7', () => new T.BoxGeometry(0.8, 0.35, 0.7)), M('#caf0f8')); c.position.set(-0.1, 0.72, 0); g.add(b, c); return g; } },
      { n: 'bus', size: 2.6, pts: 20, mk: () => { const m = new T.Mesh(geo('Box2.6, 1, 1', () => new T.BoxGeometry(2.6, 1, 1)), M('#ffb703')); m.position.y = 0.6; return m; } },
      { n: 'house', size: 3.2, pts: 35, mk: () => { const g = new T.Group(); const b = new T.Mesh(geo('Box2.4, 1.8, 2.4', () => new T.BoxGeometry(2.4, 1.8, 2.4)), M(K.pick(['#fefae0', '#ffe5d9', '#e0fbfc', '#fcd5ce']))); b.position.y = 0.9; const r = new T.Mesh(geo('Cone2, 1.2, 4', () => new T.ConeGeometry(2, 1.2, 4)), M('#bc4749')); r.position.y = 2.4; r.rotation.y = Math.PI / 4; g.add(b, r); return g; } },
      { n: 'tower', size: 4.5, pts: 70, mk: () => { const g = new T.Group(); const h = 4 + Math.floor(Math.random() * 4) * 1.2; const b = new T.Mesh(geo('tw' + h, () => geo('Box3, h, 3', () => new T.BoxGeometry(3, h, 3))), M(K.pick(['#adb5bd', '#8ecae6', '#cdb4db', '#ffc8dd']))); b.position.y = h / 2; g.add(b); for (let k = 1; k < h; k += 1.2) { const w = new T.Mesh(geo('Box3.05, 0.25, 3.05', () => new T.BoxGeometry(3.05, 0.25, 3.05)), M('#495057')); w.position.y = k; g.add(w); } return g; } },
    ];
    let objs = [], holes = [], player = null, time = 0, playing = false, revived = false, joy = null;
    function spawnCity() {
      objs.forEach((o) => scene.remove(o.mesh)); objs = [];
      const r = K.rng(Date.now() % 100000);
      for (let bx = -WORLD + 8; bx < WORLD - 4; bx += 16) for (let bz = -WORLD + 8; bz < WORLD - 4; bz += 16) {
        // each 16x16 block: buildings at center area, trees, people, cars on roads
        const pick = r(); const cx = bx + 8, cz = bz + 8;
        if (pick < 0.3) addObj(7, cx, cz); else if (pick < 0.7) { addObj(6, cx - 2, cz - 2); addObj(6, cx + 2.5, cz + 2.5); addObj(3, cx + 2.5, cz - 2.5); } else { for (let k = 0; k < 5; k++) addObj(3, cx + (r() - 0.5) * 10, cz + (r() - 0.5) * 10); addObj(2, cx, cz); }
        for (let k = 0; k < 4; k++) addObj(1, bx + 1.5 + r() * 13, bz + 1.5 + r() * 13);
        for (let k = 0; k < 3; k++) addObj(0, bx + (r() < 0.5 ? 1.2 : 14.8), bz + r() * 16);
        if (r() < 0.6) addObj(4, bx + (r() < 0.5 ? -0.35 : 0.35), bz + 2 + r() * 12, Math.PI / 2);
        if (r() < 0.15) addObj(5, bx + 2 + r() * 12, bz, 0);
      }
    }
    function addObj(ti, x, z, rot) { const t = TYPES[ti], m = t.mk(); m.position.x = x; m.position.z = z; if (rot != null) m.rotation.y = rot; else m.rotation.y = Math.random() * 6; scene.add(m); objs.push({ t, mesh: m, x, z, fall: 0, gone: false, walk: ti === 1 ? { a: Math.random() * 6 } : null }); }
    function makeHole(col, ring, x, z, bot, name) { const h = { x, z, r: 0.9 + (bot ? 0 : G.up.size * 0.12), score: 0, mesh: makeHoleMesh(col, ring), bot, name, tx: x, tz: z, think: 0 }; holes.push(h); return h; }
    function start() {
      holes.forEach((h) => scene.remove(h.mesh)); holes = []; spawnCity();
      player = makeHole(SKINS[G.skin].c, SKINS[G.skin].r, 0, 0, false, K.t(['You', 'Você']));
      const names = ['Gulpy', 'Void', 'Munch', 'Slurp', 'Drain'], cols = ['#e63946', '#ffbe0b', '#06d6a0', '#8338ec', '#fb5607'];
      for (let k = 0; k < 4; k++) { const a = (k / 4) * 6.283; makeHole('#222', cols[k], Math.cos(a) * 30, Math.sin(a) * 30, true, names[k]); }
      time = ROUND + G.up.time * 5; revived = false; playing = true; K.std.hideMenu(); hud.style.display = board.style.display = ''; K.game.start();
    }
    const growth = (h) => 0.9 + Math.sqrt(h.score) * 0.22;
    function update(dt) {
      if (!playing) return;
      time -= dt; if (time <= 0) { time = 0; return end(); }
      // player move
      let mx = 0, mz = 0; const keys = K._k || {};
      mx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0); mz = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      if (joy) { const dx = joy.cx - joy.x, dy = joy.cy - joy.y, d = Math.hypot(dx, dy); if (d > 6) { mx = dx / Math.max(d, 40); mz = dy / Math.max(d, 40); } }
      const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
      const sp = (6 + G.up.speed * 0.5) * (1 + player.r * 0.04);
      player.x = K.clamp(player.x + mx * sp * dt, -WORLD + player.r, WORLD - player.r); player.z = K.clamp(player.z + mz * sp * dt, -WORLD + player.r, WORLD - player.r);
      // bots
      for (const h of holes) {
        if (!h.bot || h.dead) continue; h.think -= dt;
        if (h.think <= 0) { h.think = 1 + Math.random(); let best = null, bs = -1; for (const o of objs) { if (o.gone || o.t.size > h.r * 1.6) continue; const d = Math.hypot(o.x - h.x, o.z - h.z); const s = o.t.pts / (d + 3); if (s > bs && d < 25) { bs = s; best = o; } } if (player.r < h.r * 0.8 && Math.hypot(player.x - h.x, player.z - h.z) < 18) best = player; h.tx = best ? best.x : h.x + K.rand(-10, 10); h.tz = best ? best.z : h.z + K.rand(-10, 10); }
        const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz) || 1, bsp = 5.2 * (1 + h.r * 0.04); h.x = K.clamp(h.x + (dx / d) * Math.min(bsp * dt, d), -WORLD + h.r, WORLD - h.r); h.z = K.clamp(h.z + (dz / d) * Math.min(bsp * dt, d), -WORLD + h.r, WORLD - h.r);
      }
      // swallowing objects
      for (const o of objs) {
        if (o.gone) continue;
        if (o.walk) { o.walk.a += (Math.random() - 0.5) * dt; o.x += Math.cos(o.walk.a) * 0.8 * dt; o.z += Math.sin(o.walk.a) * 0.8 * dt; o.mesh.position.x = o.x; o.mesh.position.z = o.z; o.mesh.rotation.y = -o.walk.a; }
        if (o.fall > 0) { o.fall += dt; o.mesh.position.y -= dt * (4 + o.fall * 10); o.mesh.rotation.x += dt * 3; o.mesh.position.x = K.lerp(o.mesh.position.x, o.by.x, dt * 4); o.mesh.position.z = K.lerp(o.mesh.position.z, o.by.z, dt * 4); if (o.fall > 1) { o.gone = true; scene.remove(o.mesh); } continue; }
        for (const h of holes) {
          if (h.dead) continue; const d = Math.hypot(o.x - h.x, o.z - h.z);
          if (o.t.size < h.r * 1.6 && d < h.r - o.t.size * 0.25) { o.fall = 0.01; o.by = h; h.score += o.t.pts; h.r = growth(h); if (h === player) { K.audio.play('pop', 1.4 - Math.min(0.8, o.t.size * 0.15)); K.meta.track('eaten', 1); if (o.t.size >= 3) { K.fx.shake(6); K.audio.play('explode', 1.3); K.meta.track('buildings', 1); } } break; }
          else if (d < h.r + o.t.size * 0.3 && o.t.size >= h.r * 1.6 && h === player && Math.random() < dt * 4) { o.mesh.rotation.z = Math.sin(performance.now() / 40) * 0.05; }
        }
      }
      // holes eat holes
      for (const a of holes) for (const b of holes) { if (a === b || a.dead || b.dead) continue; if (a.r > b.r * 1.25 && Math.hypot(a.x - b.x, a.z - b.z) < a.r - b.r * 0.5) { b.dead = true; a.score += Math.max(20, b.score * 0.5); a.r = growth(a); scene.remove(b.mesh); if (a === player) { K.audio.play('win'); K.fx.text(W / 2, H * 0.3, K.t(['Swallowed ', 'Engoliu ']) + b.name + '!', { color: '#fff', stroke: '#1d1d1d', size: 34 }); K.meta.track('holes', 1); K.game.happy(); } if (b === player) { playing = false; K.game.stop(); K.audio.play('lose'); setTimeout(() => end(true), 700); } } }
      K.meta.trackMax('score', Math.floor(player.score));
    }
    function end(eaten) {
      playing = false; K.game.stop();
      const rank = holes.slice().sort((a, b) => b.score - a.score).indexOf(player) + 1, sc = Math.floor(player.score);
      if (!eaten && rank === 1) { G.wins++; K.meta.track('wins', 1); K.audio.play('win'); K.std.confetti(['#3a86ff', '#ffbe0b', '#fff']); }
      const nb = sc > G.best; if (nb) G.best = sc; K.save.mark(); K.meta.track('games', 1); K.meta.addXp(Math.floor(sc / 30));
      K.std.end({ win: !eaten && rank === 1, newBest: nb, title: eaten ? K.t(['Swallowed!', 'Engolido!']) : '#' + rank, rows: [[K.t('score'), sc], [K.t('best'), G.best]], coins: Math.floor(sc / 8) + (rank === 1 ? 50 : 0),
        revive: revived || !eaten ? null : () => { revived = true; player.dead = false; player.mesh = makeHoleMesh(SKINS[G.skin].c, SKINS[G.skin].r); holes.push(player); player.x = K.rand(-40, 40); player.z = K.rand(-40, 40); playing = true; K.game.start(); },
        restart: start, menu: showMenu, mult: rank === 1 ? 3 : 2 });
    }
    K._k = {}; window.addEventListener('keydown', (e) => (K._k[e.code] = true)); window.addEventListener('keyup', (e) => (K._k[e.code] = false));
    cv.addEventListener('pointerdown', (e) => (joy = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY }));
    window.addEventListener('pointermove', (e) => { if (joy && joy.id === e.pointerId) { joy.cx = e.clientX; joy.cy = e.clientY; } });
    window.addEventListener('pointerup', (e) => { if (joy && joy.id === e.pointerId) joy = null; });

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Drag anywhere (or WASD/arrows) to move your hole. Anything smaller than the hole falls in and makes you grow. Swallow smaller rival holes, avoid bigger ones, and be the biggest when the timer ends.', pt: 'Arraste (ou WASD/setas) para mover seu buraco. Tudo menor que ele cai e faz você crescer. Engula buracos rivais menores, fuja dos maiores e seja o maior quando o tempo acabar.' },
      missions: [{ stat: 'eaten', base: 300, reward: 80, text: { en: 'Swallow {n} things', pt: 'Engula {n} coisas' } }, { stat: 'buildings', base: 10, reward: 100, text: { en: 'Swallow {n} buildings', pt: 'Engula {n} prédios' } }, { stat: 'holes', base: 2, reward: 120, text: { en: 'Swallow {n} rival holes', pt: 'Engula {n} buracos rivais' } }, { stat: 'wins', base: 1, reward: 150, text: { en: 'Finish #1 {n} time(s)', pt: 'Termine em 1º {n} vez(es)' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const board = K.el('div', 'shboard'); K.ui.root.appendChild(board);
    function showMenu() {
      playing = false; hud.style.display = board.style.display = 'none';
      K.std.menu({ title: 'Sinkhole<span>City</span>', sub: K.t('best') + ': ' + G.best + ' · 🏆 ' + G.wins, onPlay: start,
        buttons: [K.ui.btn('⬆ ' + K.t('upgrade'), '', () => K.std.upgrades(K.t('upgrade'), UPG, G.up)), K.ui.btn('◉ ' + K.t(['Holes', 'Buracos']), '', () => K.std.shop(K.t(['Holes', 'Buracos']), SKINS.map((s, i) => ({ id: i, price: s.p, gems: s.gems, html: `<div style="width:44px;height:44px;border-radius:50%;background:${s.c};box-shadow:0 0 0 4px ${s.r}"></div>` })), { owned: G.skins, get: () => G.skin, set: (i) => (G.skin = i) }))] });
      if (!objs.length) { spawnCity(); }
    }
    let tt = 0, bAcc = 0; const camPos = new T.Vector3(0, 20, 16);
    K.loop((dt) => { tt += dt; update(dt); K.fx.update(dt); bAcc += dt; if (playing && bAcc > 0.3) { bAcc = 0; hud.innerHTML = `<span class="chip">⏱ ${K.fmtTime(time)}</span><span class="big">${Math.floor(player.score)}</span>`; board.innerHTML = holes.filter((h) => !h.dead).sort((a, b) => b.score - a.score).map((h, i) => `<div class="${h === player ? 'me' : ''}"><span>${i + 1}. ${h.name}</span><b>${Math.floor(h.score)}</b></div>`).join(''); } }, () => {
      holes.forEach((h) => { h.mesh.position.set(h.x, 0, h.z); h.mesh.scale.setScalar(K.lerp(h.mesh.scale.x || 1, h.r, 0.15)); });
      const f = player || { x: 0, z: 0, r: 1 }, zoom = 1 + f.r * 0.22, portrait = W < H;
      camPos.lerp(new T.Vector3(f.x, (portrait ? 26 : 18) * zoom, f.z + (portrait ? 18 : 14) * zoom), 0.1); camera.position.copy(camPos); camera.lookAt(f.x, 0, f.z);
      sun.position.set(f.x - 10, 20, f.z + 8); sun.target.position.set(f.x, 0, f.z); sun.target.updateMatrixWorld();
      renderer.render(scene, camera);
      fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCv.width, fxCv.height); fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0); K.fx.draw(fxCtx); K.fx.drawFlash(fxCtx, W, H);
      if (joy && playing) { fxCtx.strokeStyle = 'rgba(255,255,255,.5)'; fxCtx.lineWidth = 3; fxCtx.beginPath(); fxCtx.arc(joy.x, joy.y, 44, 0, 6.283); fxCtx.stroke(); }
    });
    scene.add(sun.target);
    const fxCv = document.getElementById('fx'), fxCtx = fxCv.getContext('2d'); let fxDpr = 1;
    K.fit(cv, (w, h) => { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 55 : 45; camera.updateProjectionMatrix(); }, 1.75);
    K.fit(fxCv, (w, h, d) => { fxDpr = d; }, 1.5);
    K.music.set({ bpm: 118, chords: [[62, 65, 69], [60, 64, 67], [65, 69, 72], [67, 71, 74]], bass: true, busy: true, arp: [1, 0, 1, 1, 0, 1, 0, 1], arpWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [0, 1, 0, 1, 0, 1, 0, 1] } });
    showMenu();
  }
})();

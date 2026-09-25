/* Rooftop Rush — 3-lane endless runner through a low-poly toy town. three.js. */
(function () {
  const K = window.Kit, T = window.THREE;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const LANE = 2.4, GRAV = 42;
  const OUTFITS = [
    { n: ['Scout', 'Escoteiro'], body: '#ff6b4a', legs: '#2d3a8c', cap: '#ffd23f', p: 0 },
    { n: ['Mint', 'Menta'], body: '#3ec9a7', legs: '#27304f', cap: '#ff6b9a', p: 600 },
    { n: ['Sunny', 'Solar'], body: '#ffd23f', legs: '#5b3a8c', cap: '#3a86ff', p: 900 },
    { n: ['Night', 'Noturno'], body: '#2b2d42', legs: '#8d99ae', cap: '#ef233c', p: 1400 },
    { n: ['Berry', 'Amora'], body: '#9b5de5', legs: '#00bbf9', cap: '#fee440', p: 1800 },
    { n: ['Forest', 'Floresta'], body: '#588157', legs: '#3a5a40', cap: '#dad7cd', p: 2400 },
    { n: ['Royal', 'Real'], body: '#1d3557', legs: '#e63946', cap: '#f1c40f', gems: 40 },
  ];
  const UPG = [
    { id: 'magnet', n: ['Magnet time', 'Tempo do ímã'], max: 8, base: 200 },
    { id: 'jet', n: ['Jetpack time', 'Tempo do jetpack'], max: 8, base: 250 },
    { id: 'shoes', n: ['Spring shoes time', 'Tempo do tênis mola'], max: 8, base: 200 },
    { id: 'mult', n: ['Score multiplier', 'Multiplicador'], max: 10, base: 400 },
  ];

  K.boot('rooftop_rush', { g: { best: 0, outfit: 0, outfits: [0], up: { magnet: 0, jet: 0, shoes: 0, mult: 0 }, boards: 2 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new T.Scene();
    scene.background = new T.Color('#9fd8ff');
    scene.fog = new T.Fog('#bfe6ff', 45, 120);
    const camera = new T.PerspectiveCamera(60, 1, 0.1, 200);
    let W = 1, H = 1;
    K.fit(cv, (w, h) => { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 75 : 60; camera.updateProjectionMatrix(); }, 1.75);
    scene.add(new T.HemisphereLight('#ffffff', '#8a7a6a', 1.6));
    const sunL = new T.DirectionalLight('#fff4dd', 1.6); sunL.position.set(-5, 10, 4); scene.add(sunL);

    const mat = {}; const M = (c) => mat[c] || (mat[c] = new T.MeshLambertMaterial({ color: c, flatShading: true }));
    const box = (w, h, d, c) => new T.Mesh(new T.BoxGeometry(w, h, d), M(c));

    /* ---------- textures ---------- */
    function windowsTex(base, win) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
      g.fillStyle = base; g.fillRect(0, 0, 64, 128);
      for (let y = 8; y < 120; y += 20) for (let x = 6; x < 60; x += 16) { g.fillStyle = Math.random() < 0.3 ? '#fff6c4' : win; g.fillRect(x, y, 10, 12); }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
    }
    function trackTex() {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#c9b89a'; g.fillRect(0, 0, 256, 64);
      for (let l = 0; l < 3; l++) { const x = 256 * (l + 0.5) / 3; g.fillStyle = '#7a5a3a'; for (let y = 4; y < 64; y += 16) g.fillRect(x - 30, y, 60, 7); g.fillStyle = '#6f7684'; g.fillRect(x - 22, 0, 5, 64); g.fillRect(x + 17, 0, 5, 64); }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 60); return t;
    }
    const ground = new T.Mesh(new T.PlaneGeometry(LANE * 3 + 1.4, 240), new T.MeshLambertMaterial({ map: trackTex() }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const side = new T.Mesh(new T.PlaneGeometry(60, 240), M('#8fc16a')); side.rotation.x = -Math.PI / 2; side.position.y = -0.02; scene.add(side);
    const BCOLS = [['#f4a261', '#3d5a80'], ['#e9c46a', '#264653'], ['#e76f51', '#2a3d45'], ['#90be6d', '#33415c'], ['#f2cc8f', '#5a4a78'], ['#a8dadc', '#1d3557'], ['#ffb4a2', '#6d597a']];
    const btex = BCOLS.map(([b, w]) => windowsTex(b, w));

    /* ---------- player ---------- */
    const hero = new T.Group(); scene.add(hero);
    const parts = {};
    function buildHero() {
      hero.clear();
      const o = OUTFITS[G.outfit];
      const body = box(0.7, 0.8, 0.45, o.body); body.position.y = 1.15; hero.add(body);
      const head = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), M('#f1c9a5')); head.position.y = 1.8; hero.add(head);
      const cap = box(0.62, 0.18, 0.62, o.cap); cap.position.set(0, 2.02, 0); hero.add(cap);
      const brim = box(0.5, 0.06, 0.35, o.cap); brim.position.set(0, 1.95, -0.4); hero.add(brim);
      const pack = box(0.5, 0.55, 0.25, o.cap); pack.position.set(0, 1.2, 0.33); hero.add(pack);
      const limb = (x, y, w, h, c) => { const p = new T.Group(); p.position.set(x, y, 0); const m = box(w, h, w, c); m.position.y = -h / 2; p.add(m); hero.add(p); return p; };
      parts.la = limb(-0.47, 1.5, 0.2, 0.65, o.body); parts.ra = limb(0.47, 1.5, 0.2, 0.65, o.body);
      parts.ll = limb(-0.18, 0.75, 0.26, 0.75, o.legs); parts.rl = limb(0.18, 0.75, 0.26, 0.75, o.legs);
      parts.body = body; parts.head = head;
      const board = box(0.8, 0.1, 1.8, '#ff9f1c'); board.position.y = 0.05; board.visible = false; hero.add(board); parts.board = board;
      const jet = box(0.5, 0.7, 0.3, '#adb5bd'); jet.position.set(0, 1.2, 0.45); jet.visible = false; hero.add(jet); parts.jet = jet;
    }
    buildHero();

    /* ---------- world objects ---------- */
    let objs = [], coins = [], buildings = [], genZ = 0, bGenZ = 0;
    const coinGeo = new T.CylinderGeometry(0.35, 0.35, 0.1, 14); coinGeo.rotateX(Math.PI / 2);
    const coinMat = new T.MeshLambertMaterial({ color: '#ffd23f', emissive: '#7a5a00' });
    const PUCOL = { magnet: '#e63946', jet: '#adb5bd', shoes: '#3ec9a7', x2: '#9b5de5', board: '#ff9f1c' };
    function addObj(o, mesh) { o.mesh = mesh; scene.add(mesh); objs.push(o); return o; }
    function train(lane, z, len, moving) {
      const g = new T.Group();
      const col = K.pick(['#e63946', '#3a86ff', '#2a9d8f', '#f4a261', '#8338ec']);
      const b = box(2.1, 3, len, col); b.position.y = 1.6; g.add(b);
      const top = box(2.2, 0.2, len, '#dfe6ee'); top.position.y = 3.15; g.add(top);
      for (let k = 1; k < len / 2.4; k++) { const w = box(2.15, 0.7, 1.1, '#cfe8ff'); w.position.set(0, 2.1, -len / 2 + k * 2.4); g.add(w); }
      const f = box(1.4, 1, 0.1, '#1b263b'); f.position.set(0, 2.2, -len / 2 - 0.02); g.add(f);
      g.position.set((lane - 1) * LANE, 0, z - len / 2);
      return addObj({ t: 'train', lane, z0: z, z1: z - len, top: 3.25, moving: moving ? 8 : 0 }, g);
    }
    function ramp(lane, z) {
      const len = 5, geo = new T.BoxGeometry(2.1, 0.2, Math.hypot(len, 3.2));
      const m = new T.Mesh(geo, M('#8d99ae'));
      const a = Math.atan2(3.2, len);
      m.rotation.x = a; m.position.set((lane - 1) * LANE, 1.6, z - len / 2);
      const g = new T.Group(); g.add(m);
      const s = box(2.1, 3.2, 0.2, '#6c757d'); s.position.set((lane - 1) * LANE, 1.6, z - len); g.add(s);
      return addObj({ t: 'ramp', lane, z0: z, z1: z - len }, g);
    }
    function barrier(lane, z) {
      const g = new T.Group();
      const bar = box(2, 0.45, 0.25, '#ffffff'); bar.position.y = 0.85; g.add(bar);
      for (let k = 0; k < 3; k++) { const s = box(0.35, 0.47, 0.27, '#e63946'); s.position.set(-0.7 + k * 0.7, 0.85, 0); g.add(s); }
      for (const x of [-0.8, 0.8]) { const p = box(0.15, 0.9, 0.15, '#495057'); p.position.set(x, 0.45, 0); g.add(p); }
      g.position.set((lane - 1) * LANE, 0, z);
      return addObj({ t: 'barrier', lane, z0: z + 0.2, z1: z - 0.2, h: 1.1 }, g);
    }
    function overbar(lane, z) {
      const g = new T.Group();
      const bar = box(2.2, 0.5, 0.3, '#ffd23f'); bar.position.y = 1.9; g.add(bar);
      for (let k = 0; k < 4; k++) { const s = box(0.28, 0.52, 0.32, '#2b2d42'); s.position.set(-0.8 + k * 0.55, 1.9, 0); g.add(s); }
      for (const x of [-1.05, 1.05]) { const p = box(0.15, 2.2, 0.15, '#495057'); p.position.set(x, 1.1, 0); g.add(p); }
      g.position.set((lane - 1) * LANE, 0, z);
      return addObj({ t: 'over', lane, z0: z + 0.2, z1: z - 0.2, low: 1.3 }, g);
    }
    function coinRow(lane, z, n, y, arc) {
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(coinGeo, coinMat);
        const yy = (y || 0) + 0.8 + (arc ? Math.sin((i / (n - 1)) * Math.PI) * 2.2 : 0);
        m.position.set((lane - 1) * LANE, yy, z - i * 1.6); scene.add(m);
        coins.push({ m, lane });
      }
    }
    function powerup(lane, z, k) {
      const g = new T.Group();
      const m = new T.Mesh(new T.IcosahedronGeometry(0.45, 0), new T.MeshLambertMaterial({ color: PUCOL[k], emissive: PUCOL[k], emissiveIntensity: 0.35, flatShading: true }));
      g.add(m); g.position.set((lane - 1) * LANE, 1.1, z);
      return addObj({ t: 'pu', k, lane, z0: z + 0.5, z1: z - 0.5 }, g);
    }
    function genChunk() {
      const z = genZ, diff = Math.min(1, -z / 2500);
      const pat = Math.random();
      if (-z < 30) { coinRow(1, z - 5, 8); genZ -= 20; return; }
      if (pat < 0.3) {
        // trains in 1-2 lanes, one with ramp
        const lanes = [0, 1, 2].sort(() => Math.random() - 0.5), n = Math.random() < 0.4 + diff * 0.3 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const l = lanes[i], len = K.pick([12, 16, 20]);
          if (i === 0 && Math.random() < 0.6) { ramp(l, z); train(l, z - 5, len, false); coinRow(l, z - 6, Math.floor(len / 1.6), 3.2); }
          else train(l, z - 3, len, Math.random() < diff * 0.5);
        }
        coinRow(lanes[2], z - 2, 6);
        genZ -= 28;
      } else if (pat < 0.6) {
        const l = K.randi(0, 2); barrier(l, z - 4); coinRow(l, z - 1, 5, 0, true);
        if (Math.random() < 0.5 + diff * 0.4) { const l2 = (l + K.randi(1, 2)) % 3; overbar(l2, z - 10); }
        if (Math.random() < diff) { barrier((l + 1) % 3, z - 16); }
        genZ -= 22;
      } else if (pat < 0.8) {
        for (let l = 0; l < 3; l++) (Math.random() < 0.5 ? barrier : overbar)(l, z - 6);
        coinRow(K.randi(0, 2), z - 10, 6);
        genZ -= 20;
      } else {
        const l = K.randi(0, 2); coinRow(l, z - 2, 10);
        if (Math.random() < 0.55) powerup((l + 1) % 3, z - 8, K.pick(['magnet', 'jet', 'shoes', 'x2', 'magnet', 'board']));
        genZ -= 20;
      }
    }
    function genBuildings(z) {
      while (bGenZ > z) {
        for (const sd of [-1, 1]) {
          const w = K.rand(4, 7), h = K.rand(5, 16), d = K.rand(5, 9), i = K.randi(0, btex.length - 1);
          const t = btex[i].clone(); t.needsUpdate = true; t.repeat.set(Math.round(w / 2), Math.round(h / 4));
          const matB = new T.MeshLambertMaterial({ map: t, flatShading: true });
          const b = new T.Mesh(new T.BoxGeometry(w, h, d), matB);
          b.position.set(sd * (LANE * 1.5 + 6.5 + w / 2 + K.rand(0, 2)), h / 2, bGenZ - d / 2);
          const roof = box(w + 0.3, 0.4, d + 0.3, BCOLS[i][1]); roof.position.y = h / 2 + 0.2; b.add(roof);
          if (Math.random() < 0.4) { const tank = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 1.6, 8), M('#b56576')); tank.position.set(0, h / 2 + 1.2, 0); b.add(tank); }
          scene.add(b); buildings.push({ m: b, z: bGenZ - d, mats: [matB] });
          // trees between
          if (Math.random() < 0.5) { const tr = new T.Group(); const trunk = box(0.3, 1, 0.3, '#7a5a3a'); trunk.position.y = 0.5; tr.add(trunk); const top = new T.Mesh(new T.IcosahedronGeometry(0.9, 0), M('#6a994e')); top.position.y = 1.6; tr.add(top); tr.position.set(sd * (LANE * 1.5 + K.rand(1.6, 4.5)), 0, bGenZ - 2); scene.add(tr); buildings.push({ m: tr, z: bGenZ - 3 }); }
        }
        bGenZ -= K.rand(6, 9);
      }
    }
    function clearWorld() {
      objs.forEach((o) => scene.remove(o.mesh)); coins.forEach((c) => scene.remove(c.m));
      buildings.forEach((b) => { scene.remove(b.m); if (b.mats) b.mats.forEach((m) => { m.map && m.map.dispose(); m.dispose(); }); });
      objs = []; coins = []; buildings = []; genZ = 0; bGenZ = 10;
    }

    /* ---------- run state ---------- */
    let st = null, playing = false, revived = false;
    function newRun() {
      clearWorld();
      st = { lane: 1, x: 0, y: 0, vy: 0, z: 0, speed: 13, dist: 0, coins: 0, roll: 0, ground: 0, stumble: 0, magnet: 0, jet: 0, shoes: 0, x2: 0, board: 0, anim: 0, dead: false, score: 0, jumps: 0, rolls: 0 };
      genBuildings(-110); while (genZ > -110) genChunk();
    }
    function startRun() {
      newRun(); playing = true; revived = false;
      menu.style.display = 'none'; hud.style.display = ''; K.meta.setMenuButtonsVisible(false);
      K.game.start(); K.audio.play('power');
    }
    function crash() {
      if (st.board > 0) { st.board = 0; parts.board.visible = false; K.audio.play('explode'); K.fx.shake(10); K.fx.flash('#fff', 0.5); clearAhead(12); K.ui.toast(K.t(['Board saved you!', 'O skate te salvou!'])); return; }
      st.dead = true; playing = false; K.game.stop();
      K.audio.play('hurt'); K.audio.play('lose'); K.fx.shake(18); K.fx.flash('#e63946', 0.4);
      setTimeout(endPanel, 900);
    }
    function clearAhead(n) { objs = objs.filter((o) => { if (o.t !== 'pu' && o.z0 < st.z + 3 && o.z1 > st.z - n) { scene.remove(o.mesh); return false; } return true; }); }
    function endPanel() {
      const sc = Math.floor(st.score);
      K.meta.track('runs', 1);
      const nb = sc > G.best; if (nb) { G.best = sc; K.game.happy(); } K.save.mark();
      K.meta.addXp(Math.floor(st.dist / 50));
      const body = `${nb ? `<div class="kit-big" style="color:#e63946">${K.t('newBest')}</div>` : ''}<div class="kit-row"><div class="grow">${K.t('score')}</div><b>${sc}</b></div><div class="kit-row"><div class="grow">${K.t('best')}</div><b>${G.best}</b></div><div class="kit-big">${K.icon.coin} ${st.coins}</div>`;
      const pnl = K.ui.panel({ title: K.t(['Busted!', 'Pego!']), body, closable: false });
      const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      let paid = false; const pay = (m) => { if (!paid) { paid = true; K.meta.addCoins(st.coins * m, pt()); } };
      if (!revived) pnl.foot.appendChild(K.ui.adBtn(K.t('revive'), () => { pnl.close(); revive(); }));
      pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), (b) => { pay(2); b.remove(); }));
      pnl.foot.appendChild(K.ui.btn(K.t('restart'), '', () => { pay(1); pnl.close(); K.meta.showPending(() => K.ads.midgame().then(startRun)); }));
      pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pay(1); pnl.close(); showMenu(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    function revive() { revived = true; clearAhead(20); st.dead = false; st.y = 0; st.vy = 0; st.ground = 0; st.stumble = 0; st.board = 0; playing = true; K.game.start(); K.audio.play('power'); }

    /* ---------- controls ---------- */
    function act(a) {
      if (!playing || !st) return;
      if (a === 'L' || a === 'R') {
        const nl = K.clamp(st.lane + (a === 'L' ? -1 : 1), 0, 2);
        if (nl !== st.lane) { st.prevLane = st.lane; st.lane = nl; K.audio.play('whoosh', 1.4); }
        else { K.audio.play('thud'); }
      } else if (a === 'U') {
        if (st.y <= st.ground + 0.05 && !st.jet) { st.vy = st.shoes > 0 ? 19 : 13.5; st.roll = 0; K.audio.play('jump'); K.meta.track('jumps', 1); }
      } else if (a === 'D') {
        if (st.y > st.ground + 0.1) st.vy = -25; st.roll = 0.75; K.audio.play('swing'); K.meta.track('rolls', 1);
      }
    }
    window.addEventListener('keydown', (e) => {
      const m = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', Space: 'U', ArrowDown: 'D', KeyS: 'D' }[e.code];
      if (m) { e.preventDefault(); if (!e.repeat) act(m); }
    });
    let sx = 0, sy = 0, sid = null, swiped = false;
    cv.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; sid = e.pointerId; swiped = false; });
    window.addEventListener('pointermove', (e) => {
      if (sid !== e.pointerId || swiped) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.hypot(dx, dy) > 28) { swiped = true; act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : dy < 0 ? 'U' : 'D'); }
    });
    window.addEventListener('pointerup', (e) => {
      if (sid !== e.pointerId) return; sid = null;
      if (!swiped && e.pointerType === 'mouse') act(e.clientX < W / 3 ? 'L' : e.clientX > (W * 2) / 3 ? 'R' : 'U');
    });

    /* ---------- update ---------- */
    const pBox = () => ({ x: st.x, y0: st.y, y1: st.y + (st.roll > 0 ? 0.9 : 1.9), z: st.z });
    function update(dt) {
      if (!playing || !st) return;
      st.speed = Math.min(32, st.speed + dt * 0.18);
      const sp = st.speed;
      st.z -= sp * dt; st.dist += sp * dt;
      const mult = (1 + G.up.mult) * (st.x2 > 0 ? 2 : 1);
      st.score += sp * dt * mult;
      const tx = (st.lane - 1) * LANE;
      const oldX = st.x; st.x = K.lerp(st.x, tx, Math.min(1, dt * 14));
      st.roll = Math.max(0, st.roll - dt); st.stumble = Math.max(0, st.stumble - dt);
      ['magnet', 'jet', 'shoes', 'x2'].forEach((k) => (st[k] = Math.max(0, st[k] - dt)));
      // ground height from trains / ramps under the player
      let gh = 0;
      for (const o of objs) {
        if (Math.abs((o.lane - 1) * LANE - st.x) > 1.1) continue;
        if (o.t === 'train' && st.z < o.z0 + 0.2 && st.z > o.z1 && st.y >= o.top - 0.6) gh = Math.max(gh, o.top);
        if (o.t === 'ramp' && st.z < o.z0 && st.z > o.z1) gh = Math.max(gh, ((o.z0 - st.z) / (o.z0 - o.z1)) * 3.2 + 0.1);
      }
      st.ground = gh;
      if (st.jet > 0) { st.y = K.lerp(st.y, 7, dt * 3); st.vy = 0; }
      else {
        st.vy -= GRAV * dt; st.y += st.vy * dt;
        if (st.y <= gh) { if (st.vy < -12) { K.audio.play('land'); K.fx.shake(2); } st.y = gh; st.vy = 0; }
      }
      // collisions
      const p = pBox();
      for (const o of objs) {
        const ox = (o.lane - 1) * LANE;
        if (o.moving) { o.z0 += o.moving * dt; o.z1 += o.moving * dt; o.mesh.position.z += o.moving * dt; }
        if (Math.abs(ox - p.x) > 1.2 || p.z > o.z0 + 0.4 || p.z < o.z1 - 0.4) continue;
        if (o.t === 'pu') { scene.remove(o.mesh); o.dead = true; power(o.k); continue; }
        if (st.jet > 0) continue;
        if (o.t === 'barrier' && p.y0 < o.h - 0.1) {
          if (Math.abs(oldX - ox) > 0.6) { sideHit(); continue; }
          return crash();
        }
        if (o.t === 'over' && p.y1 > o.low && p.y0 < 2.2) { if (Math.abs(oldX - ox) > 0.6) { sideHit(); continue; } return crash(); }
        if (o.t === 'train' && p.y0 < o.top - 0.6 && p.z < o.z0 + 0.1) {
          if (p.z > o.z0 - 1.2 && Math.abs(ox - p.x) < 0.9) return crash();
          sideHit();
        }
      }
      objs = objs.filter((o) => { if (o.dead || o.z1 > st.z + 12) { scene.remove(o.mesh); return false; } return true; });
      // coins
      const mr = st.magnet > 0 ? 7 : 0;
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i], m = c.m;
        if (mr && Math.abs(m.position.z - st.z) < mr * 2 && Math.abs(m.position.x - st.x) < mr) { m.position.lerp(new T.Vector3(st.x, st.y + 1, st.z), Math.min(1, dt * 10)); }
        if (Math.abs(m.position.x - st.x) < 0.9 && Math.abs(m.position.z - st.z) < 0.8 && m.position.y > st.y - 0.3 && m.position.y < st.y + 2.2) {
          scene.remove(m); coins.splice(i, 1);
          st.coins += st.x2 > 0 ? 2 : 1; K.meta.track('coins', 1); K.audio.play('coin', 1 + (st.coins % 8) * 0.03);
          continue;
        }
        if (m.position.z > st.z + 10) { scene.remove(m); coins.splice(i, 1); }
      }
      while (genZ > st.z - 110) genChunk();
      genBuildings(st.z - 120);
      buildings = buildings.filter((b) => { if (b.z > st.z + 20) { scene.remove(b.m); if (b.mats) b.mats.forEach((m) => { m.map && m.map.dispose(); m.dispose(); }); b.m.geometry && b.m.geometry.dispose(); return false; } return true; });
      K.meta.trackMax('score', Math.floor(st.score));
    }
    function sideHit() {
      if (st.stumble > 0) return crash();
      st.stumble = 3; st.lane = st.prevLane != null ? st.prevLane : st.lane; K.audio.play('hit'); K.fx.shake(8);
      K.fx.text(W / 2, H * 0.4, K.t(['Stumble!', 'Tropeçou!']), { color: '#e63946', stroke: '#fff', size: 30 });
    }
    function power(k) {
      K.audio.play('power'); K.meta.track('powerups', 1); K.fx.flash(PUCOL[k], 0.3);
      if (k === 'magnet') st.magnet = 10 + G.up.magnet * 1.5;
      if (k === 'jet') { st.jet = 7 + G.up.jet; for (let i = 0; i < 3; i++) coinRow(i, st.z - 20, 30, 6.2); }
      if (k === 'shoes') st.shoes = 10 + G.up.shoes * 1.5;
      if (k === 'x2') st.x2 = 15;
      if (k === 'board') { st.board = 1; }
      const names = { magnet: ['MAGNET', 'ÍMÃ'], jet: ['JETPACK', 'JETPACK'], shoes: ['SPRING SHOES', 'TÊNIS MOLA'], x2: ['DOUBLE COINS', 'MOEDAS x2'], board: ['BOARD', 'SKATE'] };
      K.fx.text(W / 2, H * 0.35, K.t(names[k]), { color: '#fff', stroke: PUCOL[k], size: 36 });
    }

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Swipe or use arrows/WASD: left/right to change lanes, up to jump, down to roll. Jump barriers, roll under yellow bars, run up ramps onto trains. Grab power-ups. A board saves you from one crash.', pt: 'Deslize ou use setas/WASD: esquerda/direita troca de pista, cima pula, baixo rola. Pule barreiras, role sob barras amarelas, suba rampas nos trens. Pegue poderes. O skate te salva de uma batida.' },
      missions: [
        { stat: 'coins', base: 150, reward: 80, text: { en: 'Collect {n} coins', pt: 'Pegue {n} moedas' } },
        { stat: 'jumps', base: 30, reward: 60, text: { en: 'Jump {n} times', pt: 'Pule {n} vezes' } },
        { stat: 'rolls', base: 20, reward: 60, text: { en: 'Roll {n} times', pt: 'Role {n} vezes' } },
        { stat: 'score', base: 3000, type: 'max', cap: 60000, reward: 110, text: { en: 'Score {n} in one run', pt: 'Faça {n} pontos numa corrida' } },
        { stat: 'powerups', base: 4, reward: 70, text: { en: 'Grab {n} power-ups', pt: 'Pegue {n} poderes' } },
        { stat: 'runs', base: 4, reward: 50, text: { en: 'Play {n} runs', pt: 'Jogue {n} corridas' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'hud'); K.ui.root.appendChild(hud);
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    function showMenu() {
      playing = false; K.game.stop();
      hud.style.display = 'none'; menu.style.display = ''; K.meta.setMenuButtonsVisible(true);
      menu.innerHTML = `<h1><span>Rooftop</span><span>Rush</span></h1><p class="sub">${K.t('best')}: ${G.best} · ${K.t(['Boards', 'Skates'])}: ${G.boards}</p>`;
      const play = K.ui.btn(K.t('play'), 'big', () => { startRun(); }); play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.btn('🛹 ' + K.t(['Use board', 'Usar skate']) + ' (' + G.boards + ')', '', () => { if (G.boards <= 0) { K.ui.toast(K.t(['No boards. Watch a video to get one!', 'Sem skates. Assista um vídeo para ganhar!'])); return; } G.boards--; K.save.mark(); startRun(); st.board = 1; }));
      row.appendChild(K.ui.adBtn('+2 🛹', () => { G.boards += 2; K.save.mark(); showMenu(); }));
      row.appendChild(K.ui.btn('👕 ' + K.t(['Outfits', 'Roupas']), '', openOutfits));
      row.appendChild(K.ui.btn('⬆ ' + K.t('upgrade'), '', openUpg));
      menu.appendChild(row);
      K.meta.showPending();
      if (!st) newRun();
    }
    function openOutfits() {
      const body = K.el('div', 'kit-grid');
      K.ui.panel({ title: K.t(['Outfits', 'Roupas']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        OUTFITS.forEach((o, i) => {
          const own = G.outfits.includes(i);
          const cell = K.el('div', 'kit-cell' + (G.outfit === i ? ' on' : ''), `<div class="fig"><i style="background:${o.cap}"></i><b style="background:${o.body}"></b><u style="background:${o.legs}"></u></div><div>${K.t(o.n)}</div>`);
          const eq = () => { G.outfit = i; K.save.mark(); buildHero(); render(); };
          cell.appendChild(own ? K.ui.btn(G.outfit === i ? '✓' : K.t('equip'), 'sm', eq)
            : o.gems ? K.ui.btn(K.icon.gem + ' ' + o.gems, 'sm', () => { if (K.meta.spendGems(o.gems)) { G.outfits.push(i); eq(); } })
              : K.ui.btn(K.icon.coin + ' ' + o.p, 'sm', () => { if (K.meta.spend(o.p)) { G.outfits.push(i); eq(); } }));
          body.appendChild(cell);
        });
      };
      render();
    }
    function openUpg() {
      const body = K.el('div');
      K.ui.panel({ title: K.t('upgrade'), body });
      const render = () => {
        body.innerHTML = '';
        UPG.forEach((u) => {
          const l = G.up[u.id], cost = Math.round(u.base * Math.pow(1.6, l));
          const row = K.el('div', 'kit-row', `<div class="grow"><b>${K.t(u.n)}${u.id === 'mult' ? ' x' + (1 + l) : ''}</b><div class="kit-bar"><i style="width:${(100 * l) / u.max}%"></i></div></div>`);
          row.appendChild(l >= u.max ? K.el('b', '', K.t('max')) : K.ui.btn(K.icon.coin + ' ' + K.fmt(cost), 'sm', () => { if (K.meta.spend(cost)) { G.up[u.id]++; K.save.mark(); render(); } }));
          body.appendChild(row);
        });
      };
      render();
    }

    /* ---------- render ---------- */
    let tt = 0;
    const camPos = new T.Vector3(0, 4.5, 7);
    K.loop((dt) => {
      tt += dt; update(dt); K.fx.update(dt);
      if (playing && st) {
        const pw = ['magnet', 'jet', 'shoes', 'x2'].filter((k) => st[k] > 0).map((k) => `<span class="pw" style="background:${PUCOL[k]}">${Math.ceil(st[k])}</span>`).join('');
        hud.innerHTML = `<b>${Math.floor(st.score)}</b><span>● ${st.coins}</span><span class="mx">x${(1 + G.up.mult) * (st.x2 > 0 ? 2 : 1)}</span>${pw}${st.board ? '<span class="pw" style="background:#ff9f1c">🛹</span>' : ''}`;
      }
    }, (dt) => {
      if (!st) return;
      st.anim += dt * (playing ? st.speed * 0.55 : 3);
      const a = st.anim, air = st.y > st.ground + 0.1;
      hero.position.set(st.x, st.y, st.z);
      const rolling = st.roll > 0;
      hero.scale.set(1, rolling ? 0.5 : 1, 1);
      hero.rotation.x = rolling ? -a * 0.6 : 0;
      hero.rotation.z = (st.x - (st.lane - 1) * LANE) * 0.15;
      const sw = air ? 0.9 : Math.sin(a) * 0.9;
      parts.la.rotation.x = sw; parts.ra.rotation.x = -sw; parts.ll.rotation.x = air ? -0.6 : -sw; parts.rl.rotation.x = air ? 0.3 : sw;
      parts.body.position.y = 1.15 + (air ? 0 : Math.abs(Math.sin(a)) * 0.08);
      parts.board.visible = st.board > 0; parts.jet.visible = st.jet > 0;
      if (st.stumble > 0 && Math.floor(tt * 12) % 2) hero.visible = false; else hero.visible = true;
      coinMat.emissiveIntensity = 0.6 + Math.sin(tt * 6) * 0.3;
      coins.forEach((c) => (c.m.rotation.y = tt * 4));
      objs.forEach((o) => { if (o.t === 'pu') { o.mesh.rotation.y = tt * 3; o.mesh.position.y = 1.1 + Math.sin(tt * 4) * 0.2; } });
      ground.position.set(0, 0, st.z - 90); ground.material.map.offset.y = (-st.z / 240) * 60 % 1;
      side.position.set(0, -0.02, st.z - 90);
      const portrait = W < H;
      const tgt = new T.Vector3(st.x * 0.6, Math.max(st.y * 0.7, 0) + (portrait ? 5.5 : 4.2), st.z + (portrait ? 8.5 : 7));
      camPos.lerp(tgt, Math.min(1, dt * 6));
      const sh = K.fx.shakeAmt * 0.02;
      camera.position.set(camPos.x + (Math.random() - 0.5) * sh, camPos.y + (Math.random() - 0.5) * sh, camPos.z);
      camera.lookAt(st.x * 0.8, st.y * 0.6 + 1.2, st.z - 8);
      sunL.position.set(st.x - 5, 10, st.z + 4); sunL.target.position.set(st.x, 0, st.z); sunL.target.updateMatrixWorld();
      renderer.render(scene, camera);
      fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCv.width, fxCv.height);
      fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0); K.fx.draw(fxCtx); K.fx.drawFlash(fxCtx, W, H);
    });
    const fxCv = document.getElementById('fx'), fxCtx = fxCv.getContext('2d');
    let fxDpr = 1; K.fit(fxCv, (w, h, d) => { fxDpr = d; }, 1.5);

    K.music.set({ bpm: 136, chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], bass: true, busy: true, arp: [1, 0, 1, 1, 0, 1, 1, 0], arpWave: 'square', lead: [72, 0, 72, 74, 76, 0, 74, 0, 72, 0, 69, 0, 67, 0, 0, 0], leadWave: 'triangle', drums: { k: [1, 0, 0, 1, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    showMenu();
  }
})();

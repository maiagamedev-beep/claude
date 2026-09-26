/* Hop Street — hop across roads, rivers and rails. Voxel toy look in three.js. */
(function () {
  const K = window.Kit, T = window.THREE;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const HALF = 5, VIS = 9; // playable columns -HALF..HALF
  const CHARS = [
    { id: 'frog', n: ['Frog', 'Sapo'], c: ['#6ab04c', '#badc58', '#ffffff'] },
    { id: 'duck', n: ['Duck', 'Pato'], c: ['#f9ca24', '#f0932b', '#ffffff'] },
    { id: 'cat', n: ['Cat', 'Gato'], c: ['#f0932b', '#ffbe76', '#2d3436'] },
    { id: 'panda', n: ['Panda', 'Panda'], c: ['#ffffff', '#2d3436', '#2d3436'] },
    { id: 'robot', n: ['Robot', 'Robô'], c: ['#95afc0', '#535c68', '#22a6b3'] },
    { id: 'fox', n: ['Fox', 'Raposa'], c: ['#e67e22', '#ffffff', '#2d3436'] },
    { id: 'pig', n: ['Pig', 'Porco'], c: ['#ffb8b8', '#ff7979', '#2d3436'] },
    { id: 'bunny', n: ['Bunny', 'Coelho'], c: ['#dfe6e9', '#fd79a8', '#2d3436'] },
    { id: 'ghost', n: ['Ghost', 'Fantasma'], c: ['#f5f6fa', '#dcdde1', '#273c75'] },
    { id: 'alien', n: ['Alien', 'Alien'], c: ['#7bed9f', '#2ed573', '#2f3542'] },
    { id: 'gold', n: ['Golden', 'Dourado'], c: ['#f6b93b', '#fad390', '#8a5a00'], gems: 60 },
  ];
  const CAR_COLS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];

  K.boot('hop_street', { g: { best: 0, char: 'frog', chars: ['frog'], runs: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new T.Scene(); scene.background = new T.Color('#7ed6df');
    const camera = new T.PerspectiveCamera(36, 1, 0.1, 200);
    let W = 1, H = 1;
    K.fit(cv, (w, h) => { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 50 : 36; camera.updateProjectionMatrix(); }, 1.75);
    scene.add(new T.HemisphereLight('#ffffff', '#6b7b5a', 1.5));
    const sun = new T.DirectionalLight('#fff3d6', 1.8); sun.position.set(-4, 10, 6); scene.add(sun); scene.add(sun.target);
    const mats = {}; const M = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c, flatShading: true }));
    const geoCache = {}; const BG = (w, h, d) => { const k = w + '_' + h + '_' + d; return geoCache[k] || (geoCache[k] = new T.BoxGeometry(w, h, d)); };
    const box = (w, h, d, c) => new T.Mesh(BG(w, h, d), M(c));
    const shadowMat = new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false });
    const shadowGeo = new T.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2);

    /* ---------- player ---------- */
    const hero = new T.Group(); scene.add(hero);
    const heroShadow = new T.Mesh(shadowGeo, shadowMat); heroShadow.scale.set(0.8, 1, 0.8); scene.add(heroShadow);
    let heroBody = null;
    function buildHero(id) {
      if (heroBody) hero.remove(heroBody);
      const c = (CHARS.find((x) => x.id === id) || CHARS[0]).c, g = new T.Group();
      const add = (w, h, d, col, x, y, z) => { const m = box(w, h, d, col); m.position.set(x, y, z); g.add(m); return m; };
      switch (id) {
        case 'duck': add(0.6, 0.55, 0.7, c[0], 0, 0.3, 0); add(0.45, 0.4, 0.4, c[0], 0, 0.75, -0.1); add(0.3, 0.12, 0.25, c[1], 0, 0.7, -0.4); add(0.1, 0.25, 0.1, c[1], -0.15, 0.02, 0); add(0.1, 0.25, 0.1, c[1], 0.15, 0.02, 0); break;
        case 'cat': add(0.55, 0.45, 0.8, c[0], 0, 0.3, 0.05); add(0.5, 0.45, 0.45, c[0], 0, 0.7, -0.3); add(0.14, 0.18, 0.1, c[0], -0.16, 1.0, -0.3); add(0.14, 0.18, 0.1, c[0], 0.16, 1.0, -0.3); add(0.12, 0.12, 0.5, c[0], 0, 0.55, 0.6); add(0.3, 0.12, 0.05, c[1], 0, 0.62, -0.53); break;
        case 'panda': add(0.7, 0.6, 0.7, c[0], 0, 0.35, 0); add(0.7, 0.2, 0.72, c[1], 0, 0.4, 0); add(0.55, 0.5, 0.5, c[0], 0, 0.9, -0.1); add(0.15, 0.15, 0.1, c[1], -0.22, 1.2, -0.1); add(0.15, 0.15, 0.1, c[1], 0.22, 1.2, -0.1); add(0.14, 0.12, 0.05, c[1], -0.13, 0.95, -0.36); add(0.14, 0.12, 0.05, c[1], 0.13, 0.95, -0.36); break;
        case 'robot': add(0.6, 0.6, 0.55, c[0], 0, 0.4, 0); add(0.5, 0.4, 0.45, c[1], 0, 0.9, 0); add(0.35, 0.1, 0.05, c[2], 0, 0.92, -0.24); add(0.05, 0.3, 0.05, c[1], 0, 1.25, 0); add(0.12, 0.12, 0.12, '#ff4757', 0, 1.42, 0); break;
        case 'fox': add(0.55, 0.5, 0.75, c[0], 0, 0.3, 0.05); add(0.5, 0.45, 0.45, c[0], 0, 0.72, -0.3); add(0.25, 0.2, 0.25, c[1], 0, 0.62, -0.58); add(0.14, 0.22, 0.1, c[0], -0.16, 1.02, -0.3); add(0.14, 0.22, 0.1, c[0], 0.16, 1.02, -0.3); add(0.25, 0.25, 0.5, c[0], 0, 0.5, 0.6); add(0.26, 0.26, 0.15, c[1], 0, 0.5, 0.88); break;
        case 'pig': add(0.7, 0.55, 0.8, c[0], 0, 0.35, 0); add(0.3, 0.22, 0.12, c[1], 0, 0.45, -0.45); add(0.14, 0.14, 0.1, c[1], -0.2, 0.72, -0.3); add(0.14, 0.14, 0.1, c[1], 0.2, 0.72, -0.3); break;
        case 'bunny': add(0.55, 0.5, 0.6, c[0], 0, 0.3, 0); add(0.45, 0.4, 0.4, c[0], 0, 0.72, -0.15); add(0.1, 0.45, 0.12, c[0], -0.12, 1.12, -0.1); add(0.1, 0.45, 0.12, c[0], 0.12, 1.12, -0.1); add(0.06, 0.3, 0.05, c[1], 0.12, 1.12, -0.17); add(0.06, 0.3, 0.05, c[1], -0.12, 1.12, -0.17); break;
        case 'ghost': add(0.65, 0.9, 0.65, c[0], 0, 0.5, 0); add(0.65, 0.1, 0.65, c[1], 0, 0.02, 0); break;
        case 'alien': add(0.5, 0.5, 0.5, c[0], 0, 0.3, 0); add(0.65, 0.5, 0.55, c[0], 0, 0.8, 0); add(0.2, 0.15, 0.05, c[2], -0.15, 0.85, -0.28); add(0.2, 0.15, 0.05, c[2], 0.15, 0.85, -0.28); add(0.04, 0.25, 0.04, c[1], 0, 1.15, 0); add(0.1, 0.1, 0.1, c[1], 0, 1.3, 0); break;
        default: // frog & gold
          add(0.75, 0.45, 0.7, c[0], 0, 0.28, 0); add(0.2, 0.2, 0.2, c[1], -0.22, 0.58, -0.2); add(0.2, 0.2, 0.2, c[1], 0.22, 0.58, -0.2); add(0.1, 0.1, 0.05, c[2] === '#ffffff' ? '#2d3436' : c[2], -0.22, 0.6, -0.31); add(0.1, 0.1, 0.05, '#2d3436', 0.22, 0.6, -0.31); add(0.4, 0.06, 0.05, '#c0392b', 0, 0.3, -0.36);
      }
      if (id !== 'duck' && id !== 'frog' && id !== 'gold' && id !== 'ghost') { const eyeY = { cat: 0.78, panda: 0.97, robot: 0.9, fox: 0.8, pig: 0.55, bunny: 0.8, alien: 0.85 }[id] || 0.8; if (id === 'pig' || id === 'bunny' || id === 'cat' || id === 'fox') { add(0.08, 0.08, 0.05, '#2d3436', -0.12, eyeY, id === 'pig' ? -0.41 : -0.53); add(0.08, 0.08, 0.05, '#2d3436', 0.12, eyeY, id === 'pig' ? -0.41 : -0.53); } }
      if (id === 'duck') { add(0.07, 0.07, 0.05, '#2d3436', -0.14, 0.82, -0.31); add(0.07, 0.07, 0.05, '#2d3436', 0.14, 0.82, -0.31); }
      if (id === 'ghost') { add(0.12, 0.16, 0.05, c[2], -0.14, 0.7, -0.33); add(0.12, 0.16, 0.05, c[2], 0.14, 0.7, -0.33); }
      heroBody = g; hero.add(g);
    }
    buildHero(G.char);

    /* ---------- rows ---------- */
    const rows = new Map();
    let genTo = 0, lastType = 'grass', streak = 0;
    function makeRow(z) {
      const diff = Math.min(1, z / 250);
      let type;
      if (z < 4) type = 'grass';
      else {
        const r = Math.random();
        if (streak >= (lastType === 'grass' ? 2 : 5)) type = lastType === 'grass' ? (r < 0.6 ? 'road' : r < 0.85 ? 'river' : 'rail') : 'grass';
        else type = r < 0.3 - diff * 0.1 ? 'grass' : r < 0.62 ? 'road' : r < 0.85 ? 'river' : 'rail';
      }
      streak = type === lastType ? streak + 1 : 1; lastType = type;
      const row = { z, type, group: new T.Group(), items: [], blocks: new Set(), coin: null };
      row.group.position.z = -z;
      const shade = z % 2 ? 0 : 1;
      const groundCol = { grass: shade ? '#7bc043' : '#6fb23a', road: '#57606f', river: '#3fa7d6', rail: '#8e7f6f' }[type];
      const gnd = box(VIS * 2 + 12, type === 'river' ? 0.4 : 0.5, 1, groundCol); gnd.position.y = type === 'river' ? -0.35 : -0.25; row.group.add(gnd);
      // darker out-of-bounds sides
      for (const sd of [-1, 1]) { const s = box(6, 0.52, 1, type === 'river' ? '#2e86ab' : type === 'grass' ? '#4f8a2a' : '#3d4450'); s.position.set(sd * (HALF + 3.5), -0.24, 0); s.material = M(type === 'river' ? '#2e86ab' : type === 'grass' ? '#4f8a2a' : '#3d4450'); row.group.add(s); }
      if (type === 'grass') {
        const n = z < 4 ? 0 : K.randi(1, 3 + Math.floor(diff * 2));
        for (let i = 0; i < n; i++) {
          const x = K.randi(-HALF, HALF); if (row.blocks.has(x)) continue;
          row.blocks.add(x);
          const tree = new T.Group();
          if (Math.random() < 0.7) { const tr = box(0.3, 0.5, 0.3, '#8d6e63'); tr.position.y = 0.25; tree.add(tr); const h = K.pick([0.8, 1.2, 1.6]); const top = box(0.8, h, 0.8, K.pick(['#2ecc71', '#27ae60', '#6ab04c'])); top.position.y = 0.5 + h / 2; tree.add(top); }
          else { const rock = box(0.8, 0.5, 0.7, '#95a5a6'); rock.position.y = 0.25; tree.add(rock); }
          tree.position.x = x; row.group.add(tree);
        }
        // side decoration trees (blocking)
        for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) { const t = box(0.8, 1.2, 0.8, '#1e8449'); t.position.set(sd * (HALF + 1 + k * 2), 0.6, 0); row.group.add(t); }
        if (z > 3 && Math.random() < 0.3) { let x = K.randi(-HALF, HALF); if (!row.blocks.has(x)) { const c = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 0.08, 10), M('#f9ca24')); c.rotation.x = Math.PI / 2; c.position.set(x, 0.5, 0); row.group.add(c); row.coin = { x, m: c }; } }
      } else if (type === 'road') {
        const dir = Math.random() < 0.5 ? 1 : -1, speed = K.rand(2, 3.5 + diff * 4), truck = Math.random() < 0.3;
        const n = truck ? 2 : K.randi(2, 3), gap = (VIS * 2 + 8) / n;
        for (let i = 0; i < n; i++) {
          const len = truck ? 2.6 : 1.3, car = new T.Group(), col = K.pick(CAR_COLS);
          const b = box(len, 0.55, 0.8, col); b.position.y = 0.35; car.add(b);
          const cab = box(truck ? 0.8 : 0.8, 0.45, 0.7, truck ? col : '#dff9fb'); cab.position.set(truck ? dir * (len / 2 - 0.4) : 0, 0.85, 0); car.add(cab);
          if (truck) { const cargo = box(len - 0.9, 0.9, 0.78, '#ecf0f1'); cargo.position.set(-dir * 0.45, 0.95, 0); car.add(cargo); }
          for (const wx of [-len / 3, len / 3]) for (const wz of [-0.4, 0.4]) { const w = box(0.3, 0.3, 0.1, '#2d3436'); w.position.set(wx, 0.15, wz); car.add(w); }
          const sh = new T.Mesh(shadowGeo, shadowMat); sh.scale.set(len, 1, 0.9); sh.position.y = 0.02; car.add(sh);
          car.position.x = -HALF - 4 + i * gap + K.rand(0, gap * 0.4);
          row.group.add(car); row.items.push({ m: car, len, x: car.position.x });
        }
        row.dir = dir; row.speed = speed;
        const stripe = box(VIS * 2 + 12, 0.02, 0.06, '#dcdde1'); stripe.position.set(0, 0.01, 0.47); row.group.add(stripe);
      } else if (type === 'river') {
        const lily = Math.random() < 0.25 && diff > 0.1;
        if (lily) {
          for (let x = -HALF; x <= HALF; x++) if (Math.random() < 0.45) { const p = box(0.8, 0.1, 0.8, '#27ae60'); p.position.set(x, 0.0, 0); row.group.add(p); row.items.push({ m: p, len: 0.9, x, lily: true }); }
          if (!row.items.length) { const p = box(0.8, 0.1, 0.8, '#27ae60'); row.group.add(p); row.items.push({ m: p, len: 0.9, x: 0, lily: true }); }
          row.speed = 0; row.dir = 1;
        } else {
          const dir = Math.random() < 0.5 ? 1 : -1, speed = K.rand(1.3, 2.4 + diff * 2), n = 3, gap = (VIS * 2 + 8) / n;
          for (let i = 0; i < n; i++) {
            const len = K.pick([2, 3, 3, 4]) - diff; const log = box(len, 0.35, 0.8, '#a0522d'); log.position.y = 0.02;
            const ring = box(0.1, 0.36, 0.7, '#d2a679'); ring.position.x = len / 2 - 0.05; log.add(ring);
            log.position.x = -HALF - 4 + i * gap; row.group.add(log); row.items.push({ m: log, len, x: log.position.x });
          }
          row.dir = dir; row.speed = speed;
        }
      } else if (type === 'rail') {
        for (const zz of [-0.25, 0.25]) { const r = box(VIS * 2 + 12, 0.08, 0.08, '#bdc3c7'); r.position.set(0, 0.05, zz); row.group.add(r); }
        for (let x = -HALF - 5; x <= HALF + 5; x += 0.8) { const s = box(0.2, 0.05, 0.9, '#6d4c41'); s.position.set(x, 0.01, 0); row.group.add(s); }
        const post = box(0.15, 1.3, 0.15, '#2d3436'); post.position.set(HALF + 0.7, 0.65, -0.45); row.group.add(post);
        const light = new T.Mesh(BG(0.25, 0.25, 0.1), new T.MeshBasicMaterial({ color: '#550000' })); light.position.set(HALF + 0.7, 1.3, -0.4); row.group.add(light);
        const trainG = new T.Group(); for (let k = 0; k < 4; k++) { const car = box(3.2, 1.2, 0.9, k ? '#c0392b' : '#2c3e50'); car.position.set(k * 3.35, 0.7, 0); trainG.add(car); const win = box(2.6, 0.3, 0.92, '#f5f6fa'); win.position.set(k * 3.35, 0.95, 0); trainG.add(win); }
        trainG.visible = false; row.group.add(trainG);
        row.train = { g: trainG, t: K.rand(2, 5), x: 999, dir: Math.random() < 0.5 ? 1 : -1, light, len: 13.4 };
      }
      scene.add(row.group); rows.set(z, row);
    }
    function ensureRows(pz) { while (genTo < pz + 26) makeRow(genTo++); for (const [z, r] of rows) if (z < pz - 10) { scene.remove(r.group); rows.delete(z); } }

    /* ---------- state ---------- */
    let st = null, playing = false, revived = false, camZ = 0, idle = 0;
    function newRun() {
      for (const [, r] of rows) scene.remove(r.group); rows.clear(); genTo = -6; lastType = 'grass'; streak = 0;
      st = { gx: 0, gz: 0, x: 0, y: 0, z: 0, hop: 0, from: null, to: null, rot: Math.PI, score: 0, coins: 0, dead: false, queue: [], log: null, squash: 0 };
      camZ = 0; idle = 0; ensureRows(0);
      hero.scale.set(1, 1, 1); hero.visible = true;
    }
    function startRun() {
      newRun(); playing = true; revived = false; menu.style.display = 'none'; hud.style.display = ''; K.meta.setMenuButtonsVisible(false);
      K.game.start(); G.runs++; K.save.mark();
    }
    function blocked(x, z) { if (x < -HALF || x > HALF) return true; const r = rows.get(z); return r && r.type === 'grass' && r.blocks.has(x); }
    function tryHop(dx, dz) {
      if (!playing || st.dead) return;
      if (st.hop > 0) { if (st.queue.length < 1) st.queue.push([dx, dz]); return; }
      st.rot = Math.atan2(dx, -dz) + Math.PI;
      const nx = Math.round(st.x) + dx, nz = st.gz + dz;
      if (blocked(nx, nz) || nz < camZ - 4) { K.audio.play('thud', 1.4); st.squash = 0.5; return; }
      st.from = { x: st.x, z: st.gz }; st.to = { x: nx, z: nz }; st.hop = 1; st.log = null;
      K.audio.play('jump', 1 + Math.random() * 0.2);
      idle = 0;
    }
    function land() {
      st.gz = st.to.z; st.x = st.to.x;
      if (st.gz > st.score) { st.score = st.gz; K.meta.track('hops', 1); if (st.score % 50 === 0) { K.audio.play('levelup'); K.game.happy(); K.fx.text(W / 2, H * 0.25, st.score + '!', { color: '#fff', stroke: '#2d3436', size: 48 }); } }
      const r = rows.get(st.gz);
      if (r && r.coin && Math.round(st.x) === r.coin.x) { r.group.remove(r.coin.m); r.coin = null; st.coins++; K.meta.track('coins', 1); K.audio.play('coin'); K.fx.burst(W / 2, H * 0.55, { n: 10, colors: ['#f9ca24', '#fff'], speed: 200, size: 5, life: 0.4 }); }
      if (r && r.type === 'river') {
        const it = r.items.find((i) => Math.abs(i.m.position.x - st.x) < i.len / 2 + 0.15);
        if (!it) return die('drown');
        st.log = it; st.logOff = st.x - it.m.position.x; K.audio.play('land', 1.4);
      } else K.audio.play('tap', 0.7);
      st.squash = 0.6;
      if (st.queue.length) { const q = st.queue.shift(); tryHop(q[0], q[1]); }
    }
    function die(how) {
      if (st.dead) return;
      st.dead = true; playing = false; K.game.stop(); st.how = how;
      if (how === 'car' || how === 'train') { hero.scale.set(1.3, 0.15, 1.3); K.audio.play('hit'); K.fx.shake(14); K.fx.flash('#fff', 0.5); }
      else if (how === 'drown') { K.audio.play('whoosh', 0.5); K.fx.burst(W / 2, H * 0.55, { n: 20, colors: ['#dff9fb', '#7ed6df'], speed: 260, size: 6 }); }
      else if (how === 'eagle') { K.audio.play('hurt'); K.fx.shake(10); }
      K.audio.play('lose');
      setTimeout(endPanel, 1000);
    }
    function endPanel() {
      K.meta.track('runs', 1); K.meta.trackMax('score', st.score);
      const nb = st.score > G.best; if (nb) { G.best = st.score; K.game.happy(); } K.save.mark();
      K.meta.addXp(Math.floor(st.score / 5));
      const coins = st.coins + Math.floor(st.score / 10);
      const why = { car: ['Splat! Watch the traffic.', 'Splat! Cuidado com o trânsito.'], train: ['The train was faster!', 'O trem foi mais rápido!'], drown: ['Splash! Stay on the logs.', 'Tchibum! Fique nos troncos.'], eagle: ['Too slow! The hawk got you.', 'Muito devagar! O gavião te pegou.'], edge: ['Carried away by the river!', 'O rio te levou!'] }[st.how];
      const body = `<p>${K.t(why)}</p>${nb ? `<div class="kit-big" style="color:#e74c3c">${K.t('newBest')}</div>` : ''}<div class="kit-row"><div class="grow">${K.t('score')}</div><b>${st.score}</b></div><div class="kit-row"><div class="grow">${K.t('best')}</div><b>${G.best}</b></div><div class="kit-big">${K.icon.coin} ${coins}</div>`;
      const pnl = K.ui.panel({ title: K.t('gameOver'), body, closable: false });
      const pt = () => { const r = pnl.panel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      let paid = false; const pay = (m) => { if (!paid) { paid = true; K.meta.addCoins(coins * m, pt()); } };
      if (!revived) pnl.foot.appendChild(K.ui.adBtn(K.t('revive'), () => { pnl.close(); revive(); }));
      pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), (b) => { pay(2); b.remove(); }));
      pnl.foot.appendChild(K.ui.btn(K.t('restart'), '', () => { pay(1); pnl.close(); K.meta.showPending(() => K.ads.midgame().then(startRun)); }));
      pnl.foot.appendChild(K.ui.btn(K.t('menu'), 'ghost', () => { pay(1); pnl.close(); showMenu(); }));
      pnl.panel.appendChild(pnl.foot);
    }
    function revive() {
      revived = true;
      // move to the nearest safe grass row behind or at the player
      let z = st.gz; while (z > camZ - 3 && !(rows.get(z) && rows.get(z).type === 'grass')) z--;
      const r = rows.get(z) || rows.get(st.gz);
      let x = 0; for (let k = 0; k <= HALF; k++) { if (!blocked(k, z)) { x = k; break; } if (!blocked(-k, z)) { x = -k; break; } }
      st.gz = z; st.x = x; st.hop = 0; st.log = null; st.dead = false; st.queue = []; idle = 0; camZ = Math.min(camZ, z);
      hero.scale.set(1, 1, 1); playing = true; K.game.start(); K.audio.play('power'); void r;
    }

    /* ---------- input ---------- */
    window.addEventListener('keydown', (e) => {
      const m = { ArrowUp: [0, 1], KeyW: [0, 1], Space: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[e.code];
      if (m) { e.preventDefault(); if (!e.repeat) tryHop(m[0], m[1]); }
    });
    let sx = 0, sy = 0, sid = null;
    cv.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
    window.addEventListener('pointerup', (e) => {
      if (sid !== e.pointerId) return; sid = null;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.hypot(dx, dy) < 25) return tryHop(0, 1);
      if (Math.abs(dx) > Math.abs(dy)) tryHop(dx > 0 ? 1 : -1, 0); else tryHop(0, dy < 0 ? 1 : -1);
    });

    /* ---------- update ---------- */
    let eagle = null;
    function update(dt) {
      for (const [, r] of rows) {
        if ((r.type === 'road' || r.type === 'river') && r.speed) {
          const span = VIS * 2 + 8;
          for (const it of r.items) { it.m.position.x += r.dir * r.speed * dt; if (it.m.position.x > HALF + 4 + it.len / 2) it.m.position.x -= span; if (it.m.position.x < -HALF - 4 - it.len / 2) it.m.position.x += span; }
        }
        if (r.train) {
          const tr = r.train; tr.t -= dt;
          if (tr.t < 1.2 && tr.t > 0) tr.light.material.color.set(Math.floor(tr.t * 8) % 2 ? '#ff3838' : '#550000');
          if (tr.t <= 0 && tr.x === 999) { tr.x = tr.dir > 0 ? -HALF - 18 : HALF + 5; tr.g.visible = true; if (Math.abs(r.z - (st ? st.gz : 0)) < 6) K.audio.play('whoosh', 0.4); }
          if (tr.x !== 999) { tr.x += tr.dir * 34 * dt; tr.g.position.x = tr.x; if ((tr.dir > 0 && tr.x > HALF + 6) || (tr.dir < 0 && tr.x < -HALF - 20)) { tr.x = 999; tr.g.visible = false; tr.t = K.rand(3, 7); tr.light.material.color.set('#550000'); } }
        }
      }
      if (!playing || !st) return;
      // hop animation
      if (st.hop > 0) {
        st.hop -= dt / 0.13;
        const k = 1 - Math.max(0, st.hop);
        st.x = K.lerp(st.from.x, st.to.x, k); st.z = K.lerp(st.from.z, st.to.z, k); st.y = Math.sin(k * Math.PI) * 0.5;
        if (st.hop <= 0) { st.hop = 0; st.y = 0; land(); }
      } else {
        st.z = st.gz;
        if (st.log) { st.x = st.log.m.position.x + st.logOff; if (Math.abs(st.x) > HALF + 0.6) { die('edge'); return; } }
      }
      if (st.dead) return;
      // collisions with cars / trains on the current row
      const r = rows.get(Math.round(st.z));
      if (r && r.type === 'road' && st.y < 0.4) for (const it of r.items) if (Math.abs(it.m.position.x - st.x) < it.len / 2 + 0.3) return die('car');
      if (r && r.train && r.train.x !== 999) { const a = r.train.x - 1.6, b = r.train.x + r.train.len - 1.6; if (st.x > a - 0.3 && st.x < b + 0.3) return die('train'); }
      // camera creep and idle hawk
      camZ = Math.max(camZ + dt * Math.min(1.2, 0.35 + st.score * 0.004), st.gz - 2.5);
      idle += dt;
      if (st.gz < camZ - 3.5 || idle > 9) { spawnEagle(); return die('eagle'); }
      if (idle > 6 && Math.floor(idle * 4) % 2 === 0) warn.style.opacity = 1; else warn.style.opacity = 0;
      ensureRows(st.gz);
      st.squash = Math.max(0, st.squash - dt * 4);
    }
    function spawnEagle() {
      if (!eagle) { eagle = new T.Group(); const b = box(0.8, 0.5, 1.2, '#6d4c41'); eagle.add(b); const w = box(3, 0.1, 0.8, '#5d4037'); w.position.y = 0.2; eagle.add(w); const h = box(0.4, 0.4, 0.4, '#fff'); h.position.set(0, 0.2, -0.7); eagle.add(h); const bk = box(0.15, 0.15, 0.25, '#f39c12'); bk.position.set(0, 0.15, -1); eagle.add(bk); scene.add(eagle); }
      eagle.visible = true; eagle.position.set(st.x, 3, -st.z - 12); eagle.userData.t = 0;
    }

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap or press Up/W/Space to hop forward, swipe or use arrows to hop sideways and back. Dodge cars and trains, ride logs across rivers, do not stay still too long.', pt: 'Toque ou aperte Cima/W/Espaço para pular para frente, deslize ou use as setas para os lados e para trás. Desvie de carros e trens, use troncos nos rios e não fique parado muito tempo.' },
      missions: [
        { stat: 'hops', base: 120, reward: 80, text: { en: 'Hop forward {n} times', pt: 'Pule para frente {n} vezes' } },
        { stat: 'score', base: 40, type: 'max', cap: 400, reward: 110, text: { en: 'Reach {n} in one run', pt: 'Chegue a {n} numa corrida' } },
        { stat: 'coins', base: 15, reward: 70, text: { en: 'Grab {n} coins on the road', pt: 'Pegue {n} moedas no caminho' } },
        { stat: 'runs', base: 5, reward: 50, text: { en: 'Play {n} runs', pt: 'Jogue {n} corridas' } },
        { stat: 'unlock', base: 1, reward: 100, text: { en: 'Win {n} new character(s)', pt: 'Ganhe {n} personagem(ns) novo(s)' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'hud'); K.ui.root.appendChild(hud);
    const warn = K.el('div', 'warn', '🦅 ' + K.t(['Keep moving!', 'Continue andando!'])); K.ui.root.appendChild(warn);
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    function showMenu() {
      playing = false; K.game.stop();
      hud.style.display = 'none'; menu.style.display = ''; K.meta.setMenuButtonsVisible(true);
      menu.innerHTML = `<h1><span>Hop</span><span>Street</span></h1><p class="sub">${K.t('best')}: ${G.best}</p>`;
      const play = K.ui.btn(K.t('play'), 'big', startRun); play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.btn('🎁 ' + K.t(['Prize machine', 'Máquina de prêmios']) + ' · ' + K.icon.coin + ' 100', '', () => { if (K.meta.spend(100)) prize(); }));
      row.appendChild(K.ui.adBtn(K.t(['Free prize', 'Prêmio grátis']), prize));
      row.appendChild(K.ui.btn('🐸 ' + K.t(['Characters', 'Personagens']), '', openChars));
      menu.appendChild(row);
      K.meta.showPending();
      if (!st) newRun();
    }
    function prize() {
      const locked = CHARS.filter((c) => !c.gems && !G.chars.includes(c.id));
      const body = K.el('div');
      body.innerHTML = '<div class="capsule">?</div>';
      const pnl = K.ui.panel({ title: K.t(['Prize machine', 'Máquina de prêmios']), body, closable: false });
      K.audio.play('chest');
      setTimeout(() => {
        if (locked.length && Math.random() < 0.55) {
          const c = K.pick(locked); G.chars.push(c.id); G.char = c.id; buildHero(c.id); K.meta.track('unlock', 1); K.save.mark();
          body.innerHTML = `<div class="kit-big">${K.t(['New character!', 'Novo personagem!'])}</div><div class="kit-big" style="color:${c.c[0]};-webkit-text-stroke:1px #2d3436">${K.t(c.n)}</div>`;
          K.audio.play('win'); K.game.happy(); K.fx.flash('#fff', 0.5);
        } else {
          const amt = K.pick([40, 60, 80, 150]);
          body.innerHTML = `<div class="kit-big">${K.icon.coin} ${amt}</div>`;
          const r = pnl.panel.getBoundingClientRect(); K.meta.addCoins(amt, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }
        pnl.foot.appendChild(K.ui.btn('OK', '', () => { pnl.close(); showMenu(); })); pnl.panel.appendChild(pnl.foot);
      }, 1200);
    }
    function openChars() {
      const body = K.el('div', 'kit-grid');
      K.ui.panel({ title: K.t(['Characters', 'Personagens']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        CHARS.forEach((c) => {
          const own = G.chars.includes(c.id);
          const cell = K.el('div', 'kit-cell' + (G.char === c.id ? ' on' : ''), `<div class="sw" style="background:${own ? c.c[0] : '#b2bec3'};border-color:${own ? c.c[1] : '#636e72'}">${own ? '' : '?'}</div><div>${own ? K.t(c.n) : '???'}</div>`);
          if (own) cell.appendChild(K.ui.btn(G.char === c.id ? '✓' : K.t('equip'), 'sm', () => { G.char = c.id; buildHero(c.id); K.save.mark(); render(); }));
          else if (c.gems) cell.appendChild(K.ui.btn(K.icon.gem + ' ' + c.gems, 'sm', () => { if (K.meta.spendGems(c.gems)) { G.chars.push(c.id); G.char = c.id; buildHero(c.id); K.save.mark(); render(); } }));
          else cell.appendChild(K.el('small', 'kit-note', K.t(['Prize machine', 'Máquina'])));
          body.appendChild(cell);
        });
      };
      render();
    }

    /* ---------- render ---------- */
    let tt = 0; const camPos = new T.Vector3(2, 9, 6);
    K.loop((dt) => {
      tt += dt; update(dt); K.fx.update(dt);
      if (playing) hud.innerHTML = `<b>${st.score}</b><span>● ${st.coins}</span>`;
      if (eagle && eagle.visible) { eagle.userData.t += dt; eagle.position.z += 30 * dt; eagle.position.y = Math.max(0.6, 3 - eagle.userData.t * 4); if (eagle.position.z > -st.z + 12) eagle.visible = false; }
    }, (dt) => {
      if (!st) return;
      hero.position.set(st.x, st.y, -st.z);
      hero.rotation.y = K.lerp(hero.rotation.y, st.rot, Math.min(1, dt * 20));
      if (!st.dead) { const s = st.squash; hero.scale.set(1 + s * 0.25, 1 - s * 0.35 + (st.hop > 0 ? 0.15 : 0), 1 + s * 0.25); }
      if (st.dead && st.how === 'drown') hero.position.y = -0.6;
      heroShadow.position.set(st.x, 0.02, -st.z); heroShadow.visible = !st.dead;
      const portrait = W < H;
      const tx = K.clamp(st.x * 0.5, -2, 2), tz = -Math.max(camZ, st.z - 1);
      camPos.lerp(new T.Vector3(tx + 3, portrait ? 15 : 12, tz + (portrait ? 9.5 : 8.5)), Math.min(1, dt * 5));
      const sh = K.fx.shakeAmt * 0.02;
      camera.position.set(camPos.x + (Math.random() - 0.5) * sh, camPos.y, camPos.z + (Math.random() - 0.5) * sh);
      camera.lookAt(camPos.x - 3, 0, camPos.z - (portrait ? 9.5 : 8.5) - 2);
      sun.position.set(camPos.x - 4, 10, camPos.z); sun.target.position.set(camPos.x, 0, camPos.z - 6);
      for (const [, r] of rows) if (r.coin) r.coin.m.rotation.y = tt * 3;
      renderer.render(scene, camera);
      fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCv.width, fxCv.height);
      fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0); K.fx.draw(fxCtx); K.fx.drawFlash(fxCtx, W, H);
    });
    const fxCv = document.getElementById('fx'), fxCtx = fxCv.getContext('2d');
    let fxDpr = 1; K.fit(fxCv, (w, h, d) => { fxDpr = d; }, 1.5);

    K.music.set({ bpm: 104, chords: [[60, 64, 67], [65, 69, 72], [60, 64, 67], [67, 71, 74]], bass: true, arp: [1, 0, 1, 0, 1, 0, 1, 1], arpWave: 'triangle', lead: [76, 0, 79, 0, 76, 0, 72, 0, 74, 0, 76, 0, 74, 0, 0, 0], leadWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

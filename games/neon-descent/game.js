/* Neon Descent — roll a ball down an endless glowing slope. three.js, instanced tiles. */
(function () {
  const K = window.Kit, T = window.THREE;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const TILE = 2, DROP = 0.55, LANES = 9, HALF = 4, ROWS = 110, R = 0.45;
  const ZONES = [
    { n: 'Midnight', tile: '#1b1446', edge: '#ff3bd4', sky: ['#07031a', '#3a0a5e', '#ff5f9e'], fog: '#1a0833', obs: '#ff2a2a' },
    { n: 'Lagoon', tile: '#082f3d', edge: '#27f5ff', sky: ['#01101a', '#0a4a63', '#40ffd2'], fog: '#062a36', obs: '#ffb000' },
    { n: 'Ember', tile: '#2b0d06', edge: '#ffb13b', sky: ['#120300', '#5a1402', '#ffcf6a'], fog: '#2a0902', obs: '#ff3b6b' },
    { n: 'Acid', tile: '#0d1f06', edge: '#b6ff3b', sky: ['#030a00', '#153d00', '#e3ff6b'], fog: '#0b1b04', obs: '#ff3bd4' },
    { n: 'Frost', tile: '#10213a', edge: '#e6f3ff', sky: ['#020814', '#1c3c6b', '#c8e6ff'], fog: '#0d1d33', obs: '#ff5a36' },
    { n: 'Void', tile: '#111111', edge: '#ffffff', sky: ['#000000', '#1a1a1a', '#ff3b3b'], fog: '#0a0a0a', obs: '#ff3b3b' },
  ];
  const BALLS = [
    { c: '#27f5ff', p: 0 }, { c: '#ff3bd4', p: 300 }, { c: '#b6ff3b', p: 500 }, { c: '#ffb13b', p: 800 }, { c: '#ffffff', p: 1200 },
    { c: '#8a5bff', p: 1600 }, { c: '#ff3b3b', p: 2000 }, { c: 'rainbow', gems: 40 }, { c: 'gold', gems: 70 },
  ];
  const UPG = [
    { id: 'shield', n: ['Shield time', 'Tempo do escudo'], max: 8, base: 150 },
    { id: 'magnet', n: ['Magnet time', 'Tempo do ímã'], max: 8, base: 150 },
    { id: 'gem', n: ['Gem value', 'Valor da gema'], max: 10, base: 200 },
    { id: 'grip', n: ['Steering grip', 'Controle'], max: 6, base: 250 },
  ];

  K.boot('neon_descent', { g: { best: 0, ball: 0, balls: [0], up: { shield: 0, magnet: 0, gem: 0, grip: 0 }, runs: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(62, 1, 0.1, 400);
    let W = 1, H = 1;
    K.fit(cv, (w, h) => { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 78 : 62; camera.updateProjectionMatrix(); }, 1.75);

    /* ---------- textures ---------- */
    function tileTex(z) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = z.tile; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = z.edge; g.lineWidth = 6; g.shadowColor = z.edge; g.shadowBlur = 14; g.strokeRect(6, 6, 116, 116);
      g.globalAlpha = 0.25; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 118); g.moveTo(10, 64); g.lineTo(118, 64); g.stroke();
      const t = new T.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = T.SRGBColorSpace; return t;
    }
    function skyTex(z) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, z.sky[0]); gr.addColorStop(0.55, z.sky[1]); gr.addColorStop(1, z.sky[2]);
      g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    }
    function sunTex(z) {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, z.sky[2]); gr.addColorStop(1, z.edge);
      g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 120, 0, 6.283); g.fill();
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i++) g.fillRect(0, 140 + i * 13, 256, 3 + i * 0.9);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    }
    function ballTex(col) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
      if (col === 'rainbow') { for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(${i * 45},100%,60%)`; g.fillRect(i * 16, 0, 16, 64); } }
      else if (col === 'gold') { g.fillStyle = '#ffcf40'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#fff3b0'; g.fillRect(0, 26, 128, 12); }
      else { g.fillStyle = col; g.fillRect(0, 0, 128, 64); g.fillStyle = '#0b0b16'; g.fillRect(0, 29, 128, 6); for (let i = 0; i < 4; i++) g.fillRect(i * 32 + 14, 0, 4, 64); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 8, 128, 5); }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    }

    /* ---------- scene objects ---------- */
    let zone = 0;
    const tileMat = new T.MeshBasicMaterial({ map: tileTex(ZONES[0]) });
    const sideMat = new T.MeshBasicMaterial({ color: ZONES[0].edge });
    const tileGeo = new T.BoxGeometry(TILE * 0.96, 0.35, TILE * 0.96);
    const tiles = new T.InstancedMesh(tileGeo, [sideMat, sideMat, tileMat, sideMat, sideMat, sideMat], ROWS * LANES);
    tiles.instanceMatrix.setUsage(T.DynamicDrawUsage);
    scene.add(tiles);
    const obsMat = new T.MeshBasicMaterial({ color: ZONES[0].obs });
    const obsEdge = new T.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.35 });
    const obsGeo = new T.BoxGeometry(TILE * 0.8, 1.3, TILE * 0.8);
    const obs = new T.InstancedMesh(obsGeo, obsMat, ROWS * 2); obs.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(obs);
    const obsW = new T.InstancedMesh(obsGeo, obsEdge, ROWS * 2); obsW.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(obsW);
    const gemGeo = new T.OctahedronGeometry(0.4);
    const gemMat = new T.MeshBasicMaterial({ color: '#fff27a' });
    const gems = new T.InstancedMesh(gemGeo, gemMat, ROWS); gems.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(gems);
    const puGeo = new T.TorusGeometry(0.45, 0.14, 8, 20);
    const puMats = { shield: new T.MeshBasicMaterial({ color: '#27f5ff' }), magnet: new T.MeshBasicMaterial({ color: '#ff3bd4' }), slow: new T.MeshBasicMaterial({ color: '#b6ff3b' }) };
    const puMeshes = {}; for (const k in puMats) { puMeshes[k] = new T.InstancedMesh(puGeo, puMats[k], 20); puMeshes[k].instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(puMeshes[k]); }
    const sky = new T.Mesh(new T.SphereGeometry(300, 24, 16), new T.MeshBasicMaterial({ map: skyTex(ZONES[0]), side: T.BackSide, fog: false, depthWrite: false }));
    scene.add(sky);
    const sun = new T.Mesh(new T.PlaneGeometry(90, 90), new T.MeshBasicMaterial({ map: sunTex(ZONES[0]), transparent: true, fog: false, depthWrite: false }));
    scene.add(sun);
    scene.fog = new T.Fog(ZONES[0].fog, 40, 150);
    // background mountains (wireframe)
    const mtnGeo = new T.PlaneGeometry(400, 60, 40, 6);
    { const p = mtnGeo.attributes.position; const r = K.rng(5); for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > -25) p.setZ(i, (y + 30) * r() * 0.6); } }
    const mtnMat = new T.MeshBasicMaterial({ color: ZONES[0].edge, wireframe: true, transparent: true, opacity: 0.25, fog: false });
    const mtn = new T.Mesh(mtnGeo, mtnMat); mtn.rotation.x = -Math.PI / 2.4; scene.add(mtn);
    const ball = new T.Mesh(new T.SphereGeometry(R, 24, 16), new T.MeshBasicMaterial({ map: ballTex(BALLS[G.ball].c) }));
    scene.add(ball);
    const shieldMesh = new T.Mesh(new T.SphereGeometry(R * 1.6, 16, 12), new T.MeshBasicMaterial({ color: '#27f5ff', transparent: true, opacity: 0.25, wireframe: true }));
    scene.add(shieldMesh);
    const trailN = 18, trail = new T.InstancedMesh(new T.SphereGeometry(R * 0.6, 8, 6), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 }), trailN);
    trail.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(trail);
    const trailPts = [];
    function setZone(z) {
      zone = z; const Z = ZONES[z % ZONES.length];
      tileMat.map.dispose(); tileMat.map = tileTex(Z); tileMat.needsUpdate = true;
      sideMat.color.set(Z.edge); obsMat.color.set(Z.obs); mtnMat.color.set(Z.edge);
      sky.material.map.dispose(); sky.material.map = skyTex(Z); sky.material.needsUpdate = true;
      sun.material.map.dispose(); sun.material.map = sunTex(Z); sun.material.needsUpdate = true;
      scene.fog.color.set(Z.fog);
      document.body.style.background = Z.fog;
    }

    /* ---------- track generation ---------- */
    const rows = []; // ring buffer: {r, lanes:[0|1|2(ramp)], obs:[lane...], gem:lane|-1, pu}
    let genC = 0, genW = 5, genR = 0, gapCool = 0, rng = K.rng(1);
    function genRow(r) {
      const diff = Math.min(1, r / 1400);
      const row = { r, lanes: new Array(LANES).fill(0), obs: [], gem: -1, pu: null, got: false, puGot: false };
      if (r < 12) { for (let l = 2; l <= 6; l++) row.lanes[l] = 1; return row; }
      if (rng() < 0.18) genC += rng() < 0.5 ? -1 : 1;
      genC = K.clamp(genC, -HALF + 1, HALF - 1);
      if (rng() < 0.05) genW = K.randi(Math.max(2, 4 - Math.floor(diff * 2)), 7 - Math.floor(diff * 3));
      const lo = K.clamp(genC - Math.floor(genW / 2), -HALF, HALF), hi = K.clamp(lo + genW - 1, -HALF, HALF);
      gapCool--;
      const gap = gapCool <= 0 && r > 40 && rng() < 0.03 + diff * 0.04;
      if (gap) { gapCool = 14; rows.lastGap = r; return row; }
      for (let l = lo; l <= hi; l++) row.lanes[l + HALF] = 1;
      // ramp two rows before a gap is guaranteed by marking the previous row when generating next gap
      if (rng() < 0.04 + diff * 0.2 && genW >= 2 && r > 20) {
        const n = rng() < 0.7 ? 1 : 2;
        for (let k = 0; k < n; k++) { const l = K.randi(lo, hi) + HALF; if (!row.obs.includes(l)) row.obs.push(l); }
        if (row.obs.length >= hi - lo + 1) row.obs.pop();
      }
      if (rng() < 0.2) { const l = K.randi(lo, hi) + HALF; if (!row.obs.includes(l)) row.gem = l; }
      if (rng() < 0.012) { const l = K.randi(lo, hi) + HALF; if (!row.obs.includes(l) && l !== row.gem) row.pu = { l, k: K.pick(['shield', 'magnet', 'slow']) }; }
      return row;
    }
    function rowAt(r) { const x = rows[r % ROWS]; return x && x.r === r ? x : null; }
    function ensureRows(upTo) {
      while (genR <= upTo) {
        const row = genRow(genR);
        // if this is a gap, turn the two previous rows into a ramp run-up
        if (row.lanes.every((v) => !v)) { const p = rowAt(genR - 1); if (p) { p.lanes = p.lanes.map((v) => (v ? 2 : 0)); p.obs = []; } }
        rows[genR % ROWS] = row; placeRow(row); genR++;
      }
    }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sv = new T.Vector3(), pv = new T.Vector3(), zero = new T.Vector3(0, 0, 0);
    const slopeQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.atan2(DROP, TILE));
    const rampQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.atan2(DROP, TILE) + 0.35);
    const surfY = (z) => (z / TILE) * DROP; // z negative => y negative
    function placeRow(row) {
      const s = row.r % ROWS, z = -row.r * TILE - TILE / 2, y = surfY(z);
      for (let l = 0; l < LANES; l++) {
        const v = row.lanes[l];
        if (v) { pv.set((l - HALF) * TILE, y - 0.18 + (v === 2 ? 0.2 : 0), z); sv.set(1, 1, 1); m4.compose(pv, v === 2 ? rampQ : slopeQ, sv); }
        else m4.compose(pv.set(0, -999, 0), slopeQ, zero);
        tiles.setMatrixAt(s * LANES + l, m4);
      }
      for (let k = 0; k < 2; k++) {
        const l = row.obs[k];
        if (l != null) { pv.set((l - HALF) * TILE, y + 0.65, z); m4.compose(pv, slopeQ, sv.set(1, 1, 1)); }
        else m4.compose(pv.set(0, -999, 0), slopeQ, zero);
        obs.setMatrixAt(s * 2 + k, m4); obsW.setMatrixAt(s * 2 + k, m4);
      }
      tiles.instanceMatrix.needsUpdate = obs.instanceMatrix.needsUpdate = obsW.instanceMatrix.needsUpdate = true;
    }

    /* ---------- run state ---------- */
    let st = null, playing = false, revived = false;
    function newRun() {
      rows.length = 0; genR = 0; genC = 0; genW = 5; gapCool = 20; rng = K.rng((Math.random() * 1e9) | 0);
      setZone(0);
      st = { x: 0, vx: 0, y: 1, vy: 0, z: -2, speed: 15, dist: 0, gems: 0, shield: 0, magnet: 0, slow: 0, near: 0, roll: 0, air: false, dead: false, zoneShown: 0 };
      if (startShield) { st.shield = 8 + G.up.shield; startShield = false; }
      ensureRows(ROWS - 1);
      trailPts.length = 0;
    }
    let startShield = false;
    function startRun() {
      newRun(); playing = true; revived = false;
      menu.style.display = 'none'; hud.style.display = ''; K.meta.setMenuButtonsVisible(false);
      K.game.start(); K.audio.play('power');
      G.runs++; K.save.mark();
    }
    function die(reason) {
      if (st.dead) return;
      if (st.shield > 0 && reason === 'hit') { st.shield = 0; K.audio.play('explode'); K.fx.flash('#27f5ff', 0.5); K.fx.shake(10); clearNear(4); return; }
      st.dead = true; playing = false; K.game.stop();
      K.audio.play(reason === 'fall' ? 'lose' : 'explode'); K.fx.shake(16); K.fx.flash(ZONES[zone % ZONES.length].obs, 0.5);
      setTimeout(endPanel, 900);
    }
    function clearNear(n) { const r0 = Math.floor(-st.z / TILE); for (let r = r0; r < r0 + n; r++) { const row = rowAt(r); if (row) { row.obs = []; placeRow(row); } } }
    function endPanel() {
      const d = Math.floor(st.dist);
      K.meta.track('runs', 1);
      const nb = d > G.best; if (nb) { G.best = d; K.game.happy(); } K.save.mark();
      const coins = Math.round(d / 8 + st.gems * (5 + G.up.gem));
      K.meta.addXp(Math.floor(d / 60));
      const body = `${nb ? `<div class="kit-big nb">${K.t('newBest')}</div>` : ''}<div class="kit-row"><div class="grow">${K.t(['Distance', 'Distância'])}</div><b>${d} m</b></div><div class="kit-row"><div class="grow">${K.t('best')}</div><b>${G.best} m</b></div><div class="kit-row"><div class="grow">${K.t(['Gems', 'Gemas'])}</div><b>${st.gems}</b></div><div class="kit-big">${K.icon.coin} ${coins}</div>`;
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
      // put the ball back on the nearest safe tile ahead
      let r = Math.max(0, Math.floor(-st.z / TILE));
      for (let k = 0; k < 40; k++, r++) { const row = rowAt(r); if (row && row.lanes.some((v) => v === 1)) { const l = row.lanes.findIndex((v, i) => v === 1 && !row.obs.includes(i)); if (l >= 0) { st.x = (l - HALF) * TILE; break; } } }
      st.z = -r * TILE - TILE / 2; st.y = surfY(st.z) + R + 0.5; st.vy = 0; st.vx = 0; st.dead = false; st.air = false;
      st.shield = 3; clearNear(6);
      playing = true; K.game.start(); K.audio.play('power');
    }

    /* ---------- input ---------- */
    let left = false, right = false, touchL = false, touchR = false;
    window.addEventListener('keydown', (e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') left = true; if (e.code === 'ArrowRight' || e.code === 'KeyD') right = true; });
    window.addEventListener('keyup', (e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') left = false; if (e.code === 'ArrowRight' || e.code === 'KeyD') right = false; });
    const touches = new Map();
    const updTouch = () => { touchL = touchR = false; touches.forEach((x) => { if (x < W / 2) touchL = true; else touchR = true; }); };
    cv.addEventListener('pointerdown', (e) => { touches.set(e.pointerId, e.clientX); updTouch(); });
    window.addEventListener('pointermove', (e) => { if (touches.has(e.pointerId)) { touches.set(e.pointerId, e.clientX); updTouch(); } });
    window.addEventListener('pointerup', (e) => { touches.delete(e.pointerId); updTouch(); });
    window.addEventListener('pointercancel', (e) => { touches.delete(e.pointerId); updTouch(); });

    /* ---------- update ---------- */
    const GRAV = 30;
    function update(dt) {
      if (!st || !playing) return;
      const slowF = st.slow > 0 ? 0.6 : 1;
      st.speed = Math.min(42, st.speed + dt * 0.28);
      const sp = st.speed * slowF;
      const dir = (left || touchL ? -1 : 0) + (right || touchR ? 1 : 0);
      const acc = 70 + G.up.grip * 8, maxV = 11 + G.up.grip * 0.6 + st.speed * 0.12;
      st.vx += dir * acc * dt; st.vx *= Math.pow(dir ? 0.2 : 0.0008, dt); st.vx = K.clamp(st.vx, -maxV, maxV);
      st.x += st.vx * dt;
      st.z -= sp * dt; st.dist += sp * dt; st.roll += (sp * dt) / R;
      const r = Math.floor(-st.z / TILE), row = rowAt(r), lane = Math.round(st.x / TILE) + HALF;
      const surface = surfY(st.z) + R;
      const onTile = row && lane >= 0 && lane < LANES && row.lanes[lane] && Math.abs(st.x - (lane - HALF) * TILE) < TILE * 0.55;
      if (onTile && st.y <= surface + 0.05 && st.vy <= 0.5) {
        if (st.air && st.vy < -8) { K.audio.play('land'); K.fx.shake(3); }
        st.y = surface; st.air = false;
        st.vy = -(DROP / TILE) * sp;
        if (row.lanes[lane] === 2) { st.vy = 9.5; st.air = true; K.audio.play('jump'); K.meta.track('jumps', 1); }
      } else {
        st.air = true; st.vy -= GRAV * dt; st.y += st.vy * dt;
        if (onTile && st.y < surface && st.y > surface - 0.8) { st.y = surface; st.vy = -(DROP / TILE) * sp; }
        if (st.y < surface - 4) return die('fall');
      }
      if (!st.air) st.y = surface;
      // obstacles and near misses
      if (row) {
        for (const l of row.obs) {
          const ox = (l - HALF) * TILE, dx = Math.abs(st.x - ox);
          if (dx < TILE * 0.4 + R * 0.8 && st.y - surface < 1.1) return die('hit');
          if (dx < TILE * 1.1 && !row.near) { row.near = true; st.near++; K.meta.track('near', 1); nearFx(); }
        }
        // gem pickup with magnet
        const mr = st.magnet > 0 ? 4.5 : 1.1;
        for (let k = r - 1; k <= r + (st.magnet > 0 ? 3 : 1); k++) {
          const rr = rowAt(k); if (!rr || rr.gem < 0 || rr.got) continue;
          const gx = (rr.gem - HALF) * TILE, gz = -k * TILE - TILE / 2;
          if (Math.abs(gx - st.x) < mr && Math.abs(gz - st.z) < mr + 0.4) { rr.got = true; st.gems++; K.meta.track('gems', 1); K.audio.play('coin', 1 + Math.min(0.5, st.gems * 0.01)); gemFx(); }
          const pu = rr.pu;
          if (pu && !rr.puGot && Math.abs((pu.l - HALF) * TILE - st.x) < 1.2 && Math.abs(gz - st.z) < 1.2) { rr.puGot = true; power(pu.k); }
        }
      }
      st.shield = Math.max(0, st.shield - dt); st.magnet = Math.max(0, st.magnet - dt); st.slow = Math.max(0, st.slow - dt);
      ensureRows(r + ROWS - 12);
      const z = Math.floor(st.dist / 500);
      if (z !== zone) { setZone(z); K.audio.play('levelup'); K.game.happy(); K.fx.flash('#fff', 0.4); K.fx.text(W / 2, H * 0.28, ZONES[z % ZONES.length].n.toUpperCase() + ' · ' + z * 500 + 'm', { color: ZONES[z % ZONES.length].edge, stroke: '#000', size: 34, life: 1.8 }); K.meta.track('zones', 1); }
      K.meta.trackMax('dist', Math.floor(st.dist));
    }
    function power(k) {
      K.audio.play('power'); K.meta.track('powerups', 1); K.fx.flash(k === 'shield' ? '#27f5ff' : k === 'magnet' ? '#ff3bd4' : '#b6ff3b', 0.3);
      if (k === 'shield') st.shield = 6 + G.up.shield; else if (k === 'magnet') st.magnet = 7 + G.up.magnet; else st.slow = 4;
      K.fx.text(W / 2, H * 0.4, { shield: K.t(['SHIELD', 'ESCUDO']), magnet: K.t(['MAGNET', 'ÍMÃ']), slow: K.t(['SLOW-MO', 'CÂMERA LENTA']) }[k], { color: '#fff', stroke: '#000', size: 32 });
    }
    function nearFx() { K.fx.text(W / 2 + K.rand(-60, 60), H * 0.55, K.t(['CLOSE!', 'POR POUCO!']), { color: '#fff27a', stroke: '#000', size: 22, life: 0.6 }); K.audio.play('whoosh', 1.6); }
    function gemFx() { const s = toScreen(ball.position); K.fx.burst(s.x, s.y - 20, { n: 8, colors: ['#fff27a', '#fff'], speed: 220, g: 0, size: 4, life: 0.35 }); }
    const tmpV = new T.Vector3();
    function toScreen(v) { tmpV.copy(v).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * W, y: (-tmpV.y * 0.5 + 0.5) * H }; }

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Steer left and right with the arrow keys, A/D, or by holding the left/right side of the screen. Avoid blocks, do not fall off, use ramps to jump gaps. Grab rings for shield, magnet and slow motion.', pt: 'Vire com as setas, A/D ou segurando o lado esquerdo/direito da tela. Desvie dos blocos, não caia, use rampas para pular buracos. Pegue anéis de escudo, ímã e câmera lenta.' },
      missions: [
        { stat: 'dist', base: 600, type: 'max', cap: 5000, reward: 110, text: { en: 'Roll {n} m in one run', pt: 'Role {n} m numa corrida' } },
        { stat: 'gems', base: 60, reward: 80, text: { en: 'Collect {n} gems', pt: 'Pegue {n} gemas' } },
        { stat: 'near', base: 25, reward: 80, text: { en: 'Pass {n} blocks by a hair', pt: 'Passe raspando em {n} blocos' } },
        { stat: 'jumps', base: 6, reward: 70, text: { en: 'Jump {n} ramps', pt: 'Pule {n} rampas' } },
        { stat: 'powerups', base: 4, reward: 70, text: { en: 'Grab {n} power rings', pt: 'Pegue {n} anéis de poder' } },
        { stat: 'runs', base: 4, reward: 50, text: { en: 'Play {n} runs', pt: 'Jogue {n} corridas' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'hud'); K.ui.root.appendChild(hud);
    const menu = K.el('div', 'menu'); K.ui.root.appendChild(menu);
    function showMenu() {
      playing = false; K.game.stop();
      hud.style.display = 'none'; menu.style.display = ''; K.meta.setMenuButtonsVisible(true);
      menu.innerHTML = `<h1>NEON<span>DESCENT</span></h1><p class="sub">${K.t('best')}: ${G.best} m</p>`;
      const play = K.ui.btn(K.t('play'), 'big', startRun); play.dataset.play = '1';
      menu.appendChild(play);
      const row = K.el('div', 'mrow');
      row.appendChild(K.ui.adBtn(K.t(['Start with shield', 'Começar com escudo']), () => { startShield = true; startRun(); }));
      row.appendChild(K.ui.btn('◉ ' + K.t(['Balls', 'Bolas']), '', openBalls));
      row.appendChild(K.ui.btn('⬆ ' + K.t('upgrade'), '', openUpg));
      menu.appendChild(row);
      K.meta.showPending();
      if (!st) { newRun(); }
    }
    function openBalls() {
      const body = K.el('div', 'kit-grid');
      K.ui.panel({ title: K.t(['Balls', 'Bolas']), body, cls: 'wide' });
      const render = () => {
        body.innerHTML = '';
        BALLS.forEach((b, i) => {
          const own = G.balls.includes(i);
          const bg = b.c === 'rainbow' ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' : b.c === 'gold' ? 'radial-gradient(circle at 35% 35%,#fff3b0,#ffcf40 50%,#a87a00)' : `radial-gradient(circle at 35% 35%,#fff,${b.c} 45%,#0b0b16)`;
          const cell = K.el('div', 'kit-cell' + (G.ball === i ? ' on' : ''), `<div style="width:48px;height:48px;border-radius:50%;background:${bg}"></div>`);
          cell.appendChild(own ? K.ui.btn(G.ball === i ? '✓' : K.t('equip'), 'sm', () => { G.ball = i; K.save.mark(); ball.material.map = ballTex(b.c); ball.material.needsUpdate = true; render(); })
            : b.gems ? K.ui.btn(K.icon.gem + ' ' + b.gems, 'sm', () => { if (K.meta.spendGems(b.gems)) { G.balls.push(i); G.ball = i; ball.material.map = ballTex(b.c); ball.material.needsUpdate = true; K.save.mark(); render(); } })
              : K.ui.btn(K.icon.coin + ' ' + b.p, 'sm', () => { if (K.meta.spend(b.p)) { G.balls.push(i); G.ball = i; ball.material.map = ballTex(b.c); ball.material.needsUpdate = true; K.save.mark(); render(); } }));
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
          const row = K.el('div', 'kit-row', `<div class="grow"><b>${K.t(u.n)}</b><div class="kit-bar"><i style="width:${(100 * l) / u.max}%"></i></div></div>`);
          row.appendChild(l >= u.max ? K.el('b', '', K.t('max')) : K.ui.btn(K.icon.coin + ' ' + K.fmt(cost), 'sm', () => { if (K.meta.spend(cost)) { G.up[u.id]++; K.save.mark(); render(); } }));
          body.appendChild(row);
        });
      };
      render();
    }

    /* ---------- render ---------- */
    let tt = 0, camShake = 0;
    const camPos = new T.Vector3(0, 4, 6);
    K.loop((dt) => {
      tt += dt; update(dt); K.fx.update(dt);
      if (playing && st) hud.innerHTML = `<b>${Math.floor(st.dist)} m</b><span>◆ ${st.gems}</span>${st.shield > 0 ? '<span class="p s">⛨ ' + Math.ceil(st.shield) + '</span>' : ''}${st.magnet > 0 ? '<span class="p m">⊃ ' + Math.ceil(st.magnet) + '</span>' : ''}${st.slow > 0 ? '<span class="p w">◷ ' + Math.ceil(st.slow) + '</span>' : ''}`;
    }, (dt) => {
      if (!st) return;
      ball.position.set(st.x, st.y, st.z);
      ball.rotation.set(-st.roll, 0, -st.vx * 0.03);
      shieldMesh.visible = st.shield > 0; shieldMesh.position.copy(ball.position); shieldMesh.rotation.y = tt * 2;
      // trail
      trailPts.unshift(ball.position.clone()); if (trailPts.length > trailN) trailPts.pop();
      for (let i = 0; i < trailN; i++) { const p = trailPts[i] || ball.position; const s = 1 - i / trailN; m4.compose(p, q.identity(), sv.set(s, s, s)); trail.setMatrixAt(i, m4); }
      trail.instanceMatrix.needsUpdate = true;
      // gems and powerups spin
      const r0 = Math.floor(-st.z / TILE) - 2;
      let gi = 0; const cnt = { shield: 0, magnet: 0, slow: 0 };
      const spinQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), tt * 3);
      for (let r = r0; r < r0 + ROWS - 14; r++) {
        const row = rowAt(r); if (!row) continue;
        const z = -r * TILE - TILE / 2, y = surfY(z) + 0.9 + Math.sin(tt * 4 + r) * 0.15;
        if (row.gem >= 0 && !row.got && gi < ROWS) { m4.compose(pv.set((row.gem - HALF) * TILE, y, z), spinQ, sv.set(1, 1.4, 1)); gems.setMatrixAt(gi++, m4); }
        if (row.pu && !row.puGot && cnt[row.pu.k] < 20) { m4.compose(pv.set((row.pu.l - HALF) * TILE, y + 0.2, z), spinQ, sv.set(1, 1, 1)); puMeshes[row.pu.k].setMatrixAt(cnt[row.pu.k]++, m4); }
      }
      gems.count = gi; gems.instanceMatrix.needsUpdate = true;
      for (const k in puMeshes) { puMeshes[k].count = cnt[k]; puMeshes[k].instanceMatrix.needsUpdate = true; }
      // camera
      const tgt = new T.Vector3(st.x * 0.7, st.y + 3.8 + (W < H ? 1.4 : 0), st.z + 7.5 + (W < H ? 1.5 : 0));
      camPos.lerp(tgt, Math.min(1, dt * 8));
      camShake = K.fx.shakeAmt * 0.02;
      camera.position.set(camPos.x + (Math.random() - 0.5) * camShake, camPos.y + (Math.random() - 0.5) * camShake, camPos.z);
      camera.lookAt(st.x * 0.85, st.y - 0.5, st.z - 8);
      camera.rotateZ(-st.vx * 0.006);
      const fovT = (W < H ? 78 : 62) + Math.min(14, (st.speed - 15) * 0.5);
      camera.fov = K.lerp(camera.fov, fovT, dt * 2); camera.updateProjectionMatrix();
      sky.position.copy(camera.position);
      sun.position.set(camera.position.x, camera.position.y + 10, camera.position.z - 220); sun.lookAt(camera.position);
      mtn.position.set(camera.position.x, camera.position.y - 30, camera.position.z - 200);
      renderer.render(scene, camera);
      fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCv.width, fxCv.height);
      fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
      K.fx.draw(fxCtx); K.fx.drawFlash(fxCtx, W, H);
    });
    // 2D overlay canvas for particles & floating text
    const fxCv = document.getElementById('fx'), fxCtx = fxCv.getContext('2d');
    let fxDpr = 1;
    K.fit(fxCv, (w, h, d) => { fxDpr = d; }, 1.5);

    K.music.set({ bpm: 118, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]], bass: true, busy: true, bassWave: 'sawtooth', pad: true, padWave: 'sawtooth', arp: [1, 1, 1, 1, 1, 1, 1, 1], arpWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [0, 1, 0, 1, 0, 1, 0, 1] } });
    showMenu();
  }
})();

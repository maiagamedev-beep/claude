/* Crowd Rush — steer a running crowd through math gates, clash with rival crowds, climb the finish stairs. three.js */
(function () {
  const K = window.Kit, T = window.THREE;
  K.fontFamily = '"Arial Black", "Segoe UI", sans-serif';
  const TW = 8, MAXV = 400;
  const SKINS = [{ c: '#3a86ff', p: 0 }, { c: '#06d6a0', p: 400 }, { c: '#ffbe0b', p: 600 }, { c: '#8338ec', p: 800 }, { c: '#fb5607', p: 1000 }, { c: '#ff006e', gems: 30 }];
  const UPG = [{ id: 'start', n: ['Starting crowd +2', 'Multidão inicial +2'], max: 15, base: 150 }, { id: 'income', n: ['Coin bonus +10%', 'Bônus de moedas +10%'], max: 10, base: 200 }];

  K.boot('crowd_rush', { g: { lvl: 0, skin: 0, skins: [0], up: { start: 0, income: 0 } } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new T.Scene(); scene.background = new T.Color('#a9def9'); scene.fog = new T.Fog('#a9def9', 40, 110);
    const camera = new T.PerspectiveCamera(55, 1, 0.1, 200); let W = 1, H = 1;
    scene.add(new T.HemisphereLight('#ffffff', '#99aabb', 1.6)); const sun = new T.DirectionalLight('#ffffff', 1.4); sun.position.set(5, 12, 6); scene.add(sun);
    const M = (c) => new T.MeshLambertMaterial({ color: c });
    // runner geometry: capsule-ish body + head merged via group template -> use instanced body & head
    const bodyGeo = new T.CylinderGeometry(0.18, 0.22, 0.6, 8); bodyGeo.translate(0, 0.45, 0);
    const headGeo = new T.SphereGeometry(0.17, 10, 8); headGeo.translate(0, 0.95, 0);
    const legGeo = new T.BoxGeometry(0.1, 0.35, 0.1); legGeo.translate(0, 0.17, 0);
    function crowdMesh(col, n) { const g = new T.Group(); const b = new T.InstancedMesh(bodyGeo, M(col), n), h = new T.InstancedMesh(headGeo, M(col), n), l1 = new T.InstancedMesh(legGeo, M('#333'), n), l2 = new T.InstancedMesh(legGeo, M('#333'), n); [b, h, l1, l2].forEach((m) => { m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.count = 0; g.add(m); }); scene.add(g); return { g, b, h, l1, l2 }; }
    const mine = crowdMesh(SKINS[G.skin].c, MAXV);
    const ground = new T.Mesh(new T.PlaneGeometry(TW + 0.4, 400), M('#f1faee')); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const sides = new T.Mesh(new T.PlaneGeometry(200, 400), M('#80b918')); sides.rotation.x = -Math.PI / 2; sides.position.y = -0.3; scene.add(sides);
    const edgeL = new T.Mesh(new T.BoxGeometry(0.3, 0.4, 400), M('#ff595e')), edgeR = edgeL.clone(); scene.add(edgeL, edgeR);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s1 = new T.Vector3(1, 1, 1);

    /* ---------- level ---------- */
    let L = null, lvIdx = 0, objs = [], count = 1, crowd = [], z = 0, x = 0, targetX = 0, playing = false, phase = 'run', stairs = null, runCoins = 0, revived = false, battle = null;
    function textTex(txt, bg) { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 256, 128); g.fillStyle = '#fff'; g.font = '900 72px "Arial Black",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 68); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }
    function build(i) {
      objs.forEach((o) => scene.remove(o.mesh)); objs = [];
      const r = K.rng(i * 101 + 3), len = 120 + i * 8; let zz = -18;
      while (zz > -len) {
        const kind = r();
        if (kind < 0.6) { // gate pair
          const ops = [['+', K.randi(5, 15 + i)], ['x', K.randi(2, 3)], ['-', K.randi(2, 4 + i)], ['+', K.randi(10, 25 + i)], ['÷', 2]];
          const a = ops[Math.floor(r() * ops.length)], b = ops[Math.floor(r() * 2) * 3]; // at least one good option
          const pair = r() < 0.5 ? [a, b] : [b, a];
          pair.forEach((op, k) => { const good = op[0] === '+' || op[0] === 'x'; const g = new T.Mesh(new T.PlaneGeometry(TW / 2 - 0.3, 1.8), new T.MeshBasicMaterial({ map: textTex(op[0] + op[1], good ? 'rgba(46,196,182,.85)' : 'rgba(239,71,111,.85)'), transparent: true, side: T.DoubleSide })); g.position.set((k ? 1 : -1) * TW / 4, 1.4, zz); scene.add(g); objs.push({ t: 'gate', mesh: g, z: zz, side: k ? 1 : -1, op, used: false }); });
          zz -= 16;
        } else { // rival crowd
          const n = K.randi(5, 12 + i * 3), cm = crowdMesh('#e63946', Math.min(n, 150)); cm.g.position.set(0, 0, zz); objs.push({ t: 'enemy', mesh: cm.g, cm, z: zz, n, pts: spread(n) }); zz -= 18;
        }
      }
      const fz = zz - 6; stairs = { z: fz, steps: [] };
      for (let k = 0; k < 20; k++) { const st = new T.Mesh(new T.BoxGeometry(TW, 0.5, 1.2), M(k % 2 ? '#ffbe0b' : '#fb5607')); st.position.set(0, k * 0.5 + 0.25, fz - k * 1.2); scene.add(st); objs.push({ t: 'stair', mesh: st }); const lb = new T.Mesh(new T.PlaneGeometry(1.6, 0.6), new T.MeshBasicMaterial({ map: textTex('x' + (1 + k * 0.2).toFixed(1), 'rgba(0,0,0,0)'), transparent: true })); lb.position.set(TW / 2 - 1, k * 0.5 + 0.52, fz - k * 1.2); lb.rotation.x = -Math.PI / 2; scene.add(lb); objs.push({ t: 'lbl', mesh: lb }); }
      return { len, finish: fz };
    }
    function spread(n) { const pts = []; for (let k = 0; k < n; k++) { const a = k * 2.399, r = 0.28 * Math.sqrt(k); pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ph: Math.random() * 6 }); } return pts; }
    function setCount(n) { count = Math.max(0, Math.min(MAXV, Math.round(n))); const pts = spread(count); while (crowd.length < count) { const p = pts[crowd.length]; crowd.push({ x: 0, z: 0, tx: p.x, tz: p.z, ph: Math.random() * 6 }); } crowd.length = count; crowd.forEach((c, k) => { c.tx = pts[k].x; c.tz = pts[k].z; }); }
    function startLevel(i) { lvIdx = i; L = build(i); z = 0; x = 0; targetX = 0; crowd = []; setCount(10 + G.up.start * 2); runCoins = 0; phase = 'run'; revived = false; battle = null; playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); }
    function applyGate(op) { const [o, n] = op; const before = count; setCount(o === '+' ? count + n : o === 'x' ? count * n : o === '-' ? count - n : Math.ceil(count / n)); K.audio.play(count > before ? 'power' : 'hurt', 1 + Math.min(0.6, count / 200)); K.fx.text(W / 2, H * 0.4, (count > before ? '+' : '') + (count - before), { color: count > before ? '#06d6a0' : '#ef476f', stroke: '#1d1d1d', size: 40 }); K.meta.track('gates', 1); if (count <= 0) lose(); }
    function update(dt) {
      if (!playing) return;
      if (phase === 'run') {
        z -= 9 * dt; x = K.lerp(x, targetX, Math.min(1, dt * 8));
        const halfW = Math.min(TW / 2 - 0.4, 0.3 + Math.sqrt(count) * 0.2); x = K.clamp(x, -TW / 2 + halfW, TW / 2 - halfW); targetX = K.clamp(targetX, -TW / 2 + halfW, TW / 2 - halfW);
        for (const o of objs) {
          if (o.t === 'gate' && !o.used && z < o.z + 0.3 && z > o.z - 1) { const pair = objs.filter((p) => p.t === 'gate' && p.z === o.z); const side = x >= 0 ? 1 : -1; const chosen = pair.find((p) => p.side === side); pair.forEach((p) => { p.used = true; p.mesh.material.opacity = 0.25; }); if (chosen) applyGate(chosen.op); }
          if (o.t === 'enemy' && !o.done && z < o.z + 2.5) { o.done = true; battle = { o }; phase = 'battle'; K.audio.play('hit'); }
        }
        if (z < L.finish + 1) { phase = 'stairs'; stairs.k = 0; stairs.t = 0; stairs.need = Math.max(1, Math.ceil(count / 22)); K.audio.play('levelup'); }
      } else if (phase === 'battle') {
        battle.t = (battle.t || 0) + dt;
        if (battle.t > 0.06) { battle.t = 0; if (count > 0 && battle.o.n > 0) { setCount(count - 1); battle.o.n--; K.audio.play('pop', 1 + Math.random() * 0.4); if (Math.random() < 0.3) K.fx.burst(W / 2 + K.rand(-60, 60), H * 0.55, { n: 4, colors: ['#e63946', SKINS[G.skin].c, '#fff'], speed: 160, size: 4, life: 0.4 }); } }
        if (battle.o.n <= 0) { scene.remove(battle.o.mesh); battle = null; phase = 'run'; K.meta.track('battles', 1); runCoins += 5; K.fx.text(W / 2, H * 0.35, K.t(['WIN!', 'VENCEU!']), { color: '#06d6a0', stroke: '#1d1d1d', size: 36 }); }
        else if (count <= 0) lose();
      } else if (phase === 'stairs') {
        stairs.t += dt; if (stairs.t > 0.18) { stairs.t = 0; const need = stairs.need; if (count > need && stairs.k < 19) { setCount(count - need); stairs.k++; K.audio.play('tick', 1 + stairs.k * 0.05); } else finish(); }
        z = K.lerp(z, L.finish - stairs.k * 1.2, dt * 6);
      }
    }
    function finish() {
      if (phase === 'done') return; phase = 'done'; playing = false; K.game.stop(); K.audio.play('win'); K.std.confetti(['#ffbe0b', '#fb5607', '#3a86ff', '#fff']);
      const mult = 1 + stairs.k * 0.2, coins = Math.round((20 + lvIdx * 5 + runCoins) * mult * (1 + G.up.income * 0.1));
      if (lvIdx === G.lvl) G.lvl++; K.meta.track('levels', 1); K.meta.trackMax('stairs', stairs.k); K.meta.addXp(15); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Level complete!', 'Fase completa!']), rows: [[K.t(['Multiplier', 'Multiplicador']), 'x' + mult.toFixed(1)]], coins, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 900);
    }
    function lose() { if (phase === 'lost') return; phase = 'lost'; playing = false; K.game.stop(); K.audio.play('lose'); setTimeout(() => K.std.end({ text: K.t(['Your crowd is gone!', 'Sua multidão acabou!']), coins: runCoins, revive: revived ? null : () => { revived = true; setCount(20); if (battle) { scene.remove(battle.o.mesh); battle = null; } phase = 'run'; playing = true; K.game.start(); }, reviveLabel: K.t(['Continue with 20', 'Continuar com 20']), restart: () => startLevel(lvIdx), menu: showMenu }), 600); }
    // input: drag horizontally
    let dragX = null; cv.addEventListener('pointerdown', (e) => (dragX = e.clientX)); window.addEventListener('pointermove', (e) => { if (dragX !== null && playing) { targetX += ((e.clientX - dragX) / Math.min(W, 500)) * TW * 1.2; dragX = e.clientX; } }); window.addEventListener('pointerup', () => (dragX = null));
    const keys = {}; window.addEventListener('keydown', (e) => (keys[e.code] = true)); window.addEventListener('keyup', (e) => (keys[e.code] = false));

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Drag left/right (or use A/D, arrows) to steer your crowd through the best gates: + and x grow it, - and ÷ shrink it. Red crowds fight you one-for-one. Climb as high as you can on the final stairs for a bigger multiplier.', pt: 'Arraste para os lados (ou A/D, setas) para guiar a multidão pelos melhores portões: + e x aumentam, - e ÷ diminuem. Multidões vermelhas lutam um contra um. Suba o máximo possível na escada final para um multiplicador maior.' },
      missions: [{ stat: 'gates', base: 20, reward: 70, text: { en: 'Pass {n} gates', pt: 'Passe por {n} portões' } }, { stat: 'battles', base: 5, reward: 90, text: { en: 'Win {n} crowd battles', pt: 'Vença {n} batalhas' } }, { stat: 'levels', base: 3, reward: 110, text: { en: 'Clear {n} levels', pt: 'Complete {n} fases' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Crowd<span>Rush</span>', sub: K.t('level') + ' ' + (G.lvl + 1), onPlay: () => startLevel(G.lvl),
        buttons: [K.ui.btn('⬆ ' + K.t('upgrade'), '', () => K.std.upgrades(K.t('upgrade'), UPG, G.up)), K.ui.btn('🎨 ' + K.t(['Colors', 'Cores']), '', () => K.std.shop(K.t(['Colors', 'Cores']), SKINS.map((s, i) => ({ id: i, price: s.p, gems: s.gems, html: `<div style="width:34px;height:44px;border-radius:17px 17px 6px 6px;background:${s.c}"></div>` })), { owned: G.skins, get: () => G.skin, set: (i) => { G.skin = i; mine.b.material.color.set(SKINS[i].c); mine.h.material.color.set(SKINS[i].c); } }))] });
      if (!L) { L = build(G.lvl); setCount(5 + G.up.start * 2); }
    }
    function drawCrowd(cm, list, ox, oz, t, running) {
      list.forEach((c, k) => {
        const ph = t * 12 + c.ph, px = ox + c.x, pz = oz + c.z;
        m4.compose(v.set(px, running ? Math.abs(Math.sin(ph)) * 0.08 : 0, pz), q.identity(), s1); cm.b.setMatrixAt(k, m4); cm.h.setMatrixAt(k, m4);
        q.setFromAxisAngle(new T.Vector3(1, 0, 0), running ? Math.sin(ph) * 0.6 : 0); m4.compose(v.set(px - 0.08, 0, pz), q, s1); cm.l1.setMatrixAt(k, m4);
        q.setFromAxisAngle(new T.Vector3(1, 0, 0), running ? -Math.sin(ph) * 0.6 : 0); m4.compose(v.set(px + 0.08, 0, pz), q, s1); cm.l2.setMatrixAt(k, m4);
      });
      [cm.b, cm.h, cm.l1, cm.l2].forEach((m) => { m.count = list.length; m.instanceMatrix.needsUpdate = true; });
    }
    let tt = 0; const camPos = new T.Vector3(0, 9, 10);
    K.loop((dt) => { tt += dt; if (keys.ArrowLeft || keys.KeyA) targetX -= 8 * dt; if (keys.ArrowRight || keys.KeyD) targetX += 8 * dt; update(dt); K.fx.update(dt); crowd.forEach((c) => { c.x = K.lerp(c.x, c.tx, Math.min(1, dt * 8)); c.z = K.lerp(c.z, c.tz, Math.min(1, dt * 8)); }); if (playing) hud.innerHTML = `<span class="chip">${K.t('level')} ${lvIdx + 1}</span><span class="big">👥 ${count}</span>`; }, () => {
      if (!L) return;
      const baseY = phase === 'stairs' || phase === 'done' ? (stairs.k || 0) * 0.5 + 0.5 : 0;
      mine.g.position.set(x, baseY, z); drawCrowd(mine, crowd, 0, 0, tt, playing && phase !== 'battle');
      objs.forEach((o) => { if (o.t === 'enemy' && o.cm) { const n = Math.min(o.n, 150), pts = o.pts.slice(0, n); drawCrowd(o.cm, pts.map((p) => ({ x: p.x, z: p.z, ph: p.ph })), 0, 0, tt, false); if (battle && battle.o === o) o.mesh.position.z = K.lerp(o.mesh.position.z, z - 1.5, 0.1); } });
      ground.position.z = z - 150; sides.position.z = z - 150; edgeL.position.set(-TW / 2 - 0.15, 0.2, z - 150); edgeR.position.set(TW / 2 + 0.15, 0.2, z - 150);
      const portrait = W < H, zoom = 1 + Math.min(0.8, Math.sqrt(count) * 0.04);
      camPos.lerp(new T.Vector3(x * 0.4, (portrait ? 11 : 8) * zoom + baseY, z + (portrait ? 11 : 9) * zoom), Math.min(1, 0.08));
      camera.position.copy(camPos); camera.lookAt(x * 0.5, baseY, z - 6);
      renderer.render(scene, camera);
      fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCv.width, fxCv.height); fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0); K.fx.draw(fxCtx); K.fx.drawFlash(fxCtx, W, H);
    });
    const fxCv = document.getElementById('fx'), fxCtx = fxCv.getContext('2d'); let fxDpr = 1;
    K.fit(cv, (w, h) => { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 65 : 55; camera.updateProjectionMatrix(); }, 1.75);
    K.fit(fxCv, (w, h, d) => { fxDpr = d; }, 1.5);
    K.music.set({ bpm: 128, chords: [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]], bass: true, busy: true, arp: [1, 1, 0, 1, 1, 0, 1, 1], arpWave: 'square', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 1, 0, 0, 0, 1, 0], h: [1, 1, 1, 1, 1, 1, 1, 1] } });
    showMenu();
  }
})();

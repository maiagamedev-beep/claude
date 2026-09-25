/* Helix Drop — spin the tower, let the ball fall through the gaps, avoid red. 100 levels. three.js */
(function () {
  const K = window.Kit, T = window.THREE;
  K.fontFamily = '"Segoe UI", "Helvetica Neue", sans-serif';
  const SEG = 12, GAP = 3.2, RO = 3, RI = 1.1, BALL_R = 0.35, BR = 2.1;
  const BALLS = [{ c: '#ff4f5e', p: 0 }, { c: '#ffd23f', p: 300 }, { c: '#2ec4b6', p: 500 }, { c: '#8f5bff', p: 800 }, { c: '#ffffff', p: 1200 }, { c: '#ff8fd8', p: 1500 }, { c: '#222222', gems: 30 }];
  const PALETTES = [['#ffe5d9', '#a3c4f3', '#ff595e'], ['#fdf0d5', '#88d498', '#e63946'], ['#f1e3ff', '#b8b8ff', '#ff4f79'], ['#e0fbfc', '#98c1d9', '#ee6c4d'], ['#fff1e6', '#fcd5ce', '#9d0208'], ['#edf6f9', '#83c5be', '#e29578']];

  K.boot('helix_drop', { g: { lvl: 0, ball: 0, balls: [0], best: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(50, 1, 0.1, 200);
    let W = 1, H = 1;
    scene.add(new T.HemisphereLight('#ffffff', '#777799', 1.5));
    const dl = new T.DirectionalLight('#ffffff', 1.4); dl.position.set(4, 10, 6); scene.add(dl);

    const segGeo = (() => { const a = (Math.PI * 2) / SEG, sh = new T.Shape(); sh.absarc(0, 0, RO, 0, a, false); sh.absarc(0, 0, RI, a, 0, true); const g = new T.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 6 }); g.rotateX(-Math.PI / 2); return g; })();
    const tower = new T.Group(); scene.add(tower);
    let pole = null, mats = null;
    const ball = new T.Mesh(new T.SphereGeometry(BALL_R, 24, 16), new T.MeshStandardMaterial({ color: BALLS[G.ball].c, roughness: 0.3 }));
    scene.add(ball);
    const splatGeo = new T.CircleGeometry(0.35, 12); splatGeo.rotateX(-Math.PI / 2);

    let L = null, lvIdx = 0, plats = [], by = 0, vy = 0, rot = 0, rotV = 0, streak = 0, fire = false, playing = false, passed = 0, total = 0, revived = false, runCoins = 0, finishY = 0, shield = 0;
    function build(i) {
      tower.clear(); plats = [];
      const pal = PALETTES[i % PALETTES.length];
      mats = { safe: new T.MeshStandardMaterial({ color: pal[1], roughness: 0.6 }), bad: new T.MeshStandardMaterial({ color: pal[2], roughness: 0.4 }), goal: new T.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.4 }) };
      scene.background = new T.Color(pal[0]); scene.fog = new T.Fog(pal[0], 12, 40);
      const r = K.rng(i * 53 + 11), count = Math.min(40, 10 + Math.floor(i * 0.6)), diff = Math.min(1, i / 60);
      for (let p = 0; p < count; p++) {
        const y = -p * GAP, g = new T.Group(); g.position.y = y; g.rotation.y = r() * 6.283;
        const gapStart = Math.floor(r() * SEG), gapLen = p === 0 ? 2 : Math.max(1, Math.round(3 - diff * 1.5 - r()));
        const segs = [];
        for (let s = 0; s < SEG; s++) {
          const inGap = (s - gapStart + SEG) % SEG < gapLen;
          if (inGap) { segs.push(null); continue; }
          const bad = p > 0 && r() < 0.08 + diff * 0.22 && (s - gapStart + SEG) % SEG !== gapLen;
          const m = new T.Mesh(segGeo, bad ? mats.bad : mats.safe); m.rotation.y = (s / SEG) * Math.PI * 2; g.add(m);
          segs.push({ m, bad });
        }
        // extra gaps
        if (p > 0 && r() < 0.3) { const s = Math.floor(r() * SEG); if (segs[s]) { g.remove(segs[s].m); segs[s] = null; } }
        tower.add(g); plats.push({ g, y, segs, done: false, spin: i > 15 && r() < diff * 0.3 ? (r() < 0.5 ? -1 : 1) * 0.6 : 0 });
      }
      finishY = -count * GAP;
      const goal = new T.Mesh(new T.CylinderGeometry(RO, RO, 0.5, 32), mats.goal); goal.position.y = finishY + 0.2; tower.add(goal);
      pole = new T.Mesh(new T.CylinderGeometry(RI * 0.95, RI * 0.95, count * GAP + 10, 24), new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })); pole.position.y = finishY / 2; tower.add(pole);
      total = count;
    }
    function startLevel(i) {
      lvIdx = i; build(i); by = 2; vy = 0; rot = 0; rotV = 0; streak = 0; fire = false; passed = 0; revived = false; runCoins = 0; shield = 0;
      playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start();
    }
    function segAt(p) {
      // ball sits at world angle 0 (x+). Local angle = -(towerRot + platRot)
      let a = -(rot + p.g.rotation.y); a = ((a % 6.283) + 6.283) % 6.283;
      return p.segs[Math.floor(a / (6.283 / SEG)) % SEG];
    }
    function update(dt) {
      if (!playing) return;
      rot += rotV; rotV *= 0.5; tower.rotation.y = rot;
      plats.forEach((p) => { if (p.spin) p.g.rotation.y += p.spin * dt; });
      vy -= 32 * dt; by += vy * dt;
      for (const p of plats) {
        if (p.done) continue;
        const top = p.y + 0.5;
        if (by - BALL_R <= top && by - BALL_R > top - 0.8 && vy < 0) {
          const s = segAt(p);
          if (!s) { p.done = true; passed++; streak++; K.meta.track('floors', 1); K.audio.play('whoosh', 1 + streak * 0.1); if (streak >= 3 && !fire) { fire = true; K.audio.play('power'); } continue; }
          if (fire) { smash(p); fire = false; streak = 0; vy = 9; continue; }
          if (s.bad && shield <= 0) { die(); return; }
          if (s.bad) shield = 0;
          by = top + BALL_R; vy = 9.5; streak = 0;
          splat(p); K.audio.play('land', 1.2);
          squash = 1;
        }
      }
      if (by < finishY + 0.5 + BALL_R) { by = finishY + 0.5 + BALL_R; win(); }
    }
    function smash(p) {
      p.done = true; passed++;
      p.segs.forEach((s) => { if (!s) return; const wp = new T.Vector3(); s.m.getWorldPosition(wp); const wq = new T.Quaternion(); s.m.getWorldQuaternion(wq); p.g.remove(s.m); scene.add(s.m); s.m.position.copy(wp); s.m.quaternion.copy(wq); const a = Math.random() * 6.283; flying.push({ m: s.m, vx: Math.cos(a) * 6, vy: 4 + Math.random() * 4, vz: Math.sin(a) * 6, rx: Math.random() * 6, t: 0 }); });
      K.audio.play('explode', 1.2); K.fx.shake(8); K.meta.track('smash', 1); runCoins += 2;
      K.fx.text(W / 2, H * 0.4, K.t(['SMASH!', 'ESMAGOU!']), { color: '#fff', stroke: '#ff4f5e', size: 40 });
    }
    let flying = [], squash = 0;
    const splats = [];
    function splat(p) {
      const m = new T.Mesh(splatGeo, new T.MeshBasicMaterial({ color: BALLS[G.ball].c, transparent: true, opacity: 0.8 }));
      m.position.set(BR, 0.52, 0); m.scale.setScalar(0.6 + Math.random() * 0.5);
      // attach in platform local space so it spins with it
      const inv = -(rot + p.g.rotation.y); m.position.set(Math.cos(inv) * BR, 0.52, -Math.sin(inv) * BR);
      p.g.add(m); splats.push(m);
    }
    function die() {
      playing = false; K.game.stop(); K.audio.play('hurt'); K.fx.shake(12); K.fx.flash('#ff4f5e', 0.4);
      const prog = Math.round((passed / total) * 100);
      setTimeout(() => K.std.end({ text: K.t(['You hit a red zone!', 'Você bateu na zona vermelha!']) + ` (${prog}%)`, rows: [[K.t('level'), lvIdx + 1]], coins: 5 + runCoins + passed,
        revive: revived ? null : () => { revived = true; shield = 1; vy = 9; playing = true; K.game.start(); }, reviveLabel: K.t(['Continue with shield', 'Continuar com escudo']), restart: () => startLevel(lvIdx), menu: showMenu }), 600);
    }
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(['#ff4f5e', '#ffd23f', '#2ec4b6', '#fff']);
      if (lvIdx === G.lvl) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(12); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['Level complete!', 'Fase completa!']), rows: [[K.t('level'), lvIdx + 1]], coins: 20 + lvIdx * 3 + runCoins, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 900);
    }

    /* ---------- input ---------- */
    let dragX = null;
    cv.addEventListener('pointerdown', (e) => { dragX = e.clientX; });
    window.addEventListener('pointermove', (e) => { if (dragX !== null && playing) { rotV += (e.clientX - dragX) * 0.012; dragX = e.clientX; } });
    window.addEventListener('pointerup', () => (dragX = null));
    const keys = {}; window.addEventListener('keydown', (e) => (keys[e.code] = true)); window.addEventListener('keyup', (e) => (keys[e.code] = false));

    /* ---------- meta ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Drag left/right (or use the arrow keys) to spin the tower. Let the ball drop through the gaps. Never land on red. Fall through 3 floors in a row to become a fireball that smashes anything.', pt: 'Arraste para os lados (ou use as setas) para girar a torre. Deixe a bola cair pelos buracos. Nunca caia no vermelho. Passe 3 andares seguidos para virar uma bola de fogo que quebra tudo.' },
      missions: [
        { stat: 'floors', base: 120, reward: 80, text: { en: 'Fall through {n} floors', pt: 'Passe por {n} andares' } },
        { stat: 'smash', base: 8, reward: 90, text: { en: 'Smash {n} floors with fire', pt: 'Quebre {n} andares com fogo' } },
        { stat: 'levels', base: 4, reward: 100, text: { en: 'Clear {n} levels', pt: 'Complete {n} fases' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'hx-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Helix<span>Drop</span>', sub: K.t('level') + ' ' + (G.lvl + 1), onPlay: () => startLevel(G.lvl),
        buttons: [K.ui.btn('● ' + K.t(['Balls', 'Bolas']), '', () => K.std.shop(K.t(['Balls', 'Bolas']), BALLS.map((b, i) => ({ id: i, price: b.p, gems: b.gems, html: `<div style="width:42px;height:42px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,${b.c} 45%)"></div>` })), { owned: G.balls, get: () => G.ball, set: (i) => { G.ball = i; ball.material.color.set(BALLS[i].c); } }))] });
      if (!L) { L = 1; build(G.lvl); by = 2; }
    }

    /* ---------- loop ---------- */
    let tt = 0, camY = 4;
    K.loop((dt) => {
      tt += dt;
      if (keys.ArrowLeft || keys.KeyA) rotV -= 4 * dt; if (keys.ArrowRight || keys.KeyD) rotV += 4 * dt;
      update(dt); K.fx.update(dt);
      flying = flying.filter((f) => { f.t += dt; f.vy -= 20 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt; f.m.rotation.x += f.rx * dt; if (f.t > 2) { scene.remove(f.m); return false; } return true; });
      squash = Math.max(0, squash - dt * 5);
      if (playing) hud.innerHTML = `<span>${lvIdx + 1}</span><div class="bar"><i style="width:${(passed / total) * 100}%"></i></div><span>${lvIdx + 2}</span>`;
    }, (dt) => {
      ball.position.set(BR, by, 0);
      ball.scale.set(1 + squash * 0.25, 1 - squash * 0.3, 1 + squash * 0.25);
      ball.material.emissive = ball.material.emissive || new T.Color();
      ball.material.emissive.set(fire ? '#ff7a00' : shield ? '#3fc5ff' : '#000000');
      camY = K.lerp(camY, Math.min(camY, by + 4), Math.min(1, dt * 6));
      const portrait = W < H;
      camera.position.set(portrait ? 13 : 10, camY + 3, 0); camera.lookAt(0, camY - 2.5, 0);
      renderer.render(scene, camera);
      fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCv.width, fxCv.height); fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0); K.fx.draw(fxCtx); K.fx.drawFlash(fxCtx, W, H);
      if (!playing && !L) camY = 4;
    });
    const fxCv = document.getElementById('fx'), fxCtx = fxCv.getContext('2d'); let fxDpr = 1;
    K.fit(cv, (w, h) => { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 62 : 50; camera.updateProjectionMatrix(); }, 2);
    K.fit(fxCv, (w, h, d) => { fxDpr = d; }, 1.5);
    const oldStart = startLevel; startLevel = (i) => { camY = 4; oldStart(i); }; // eslint-disable-line no-func-assign
    K.music.set({ bpm: 120, chords: [[60, 64, 67], [65, 69, 72], [57, 60, 64], [67, 71, 74]], bass: true, arp: [1, 1, 0, 1, 1, 0, 1, 0], arpWave: 'triangle', drums: { k: [1, 0, 0, 0, 1, 0, 0, 0], h: [0, 0, 1, 0, 0, 0, 1, 0] } });
    showMenu();
  }
})();

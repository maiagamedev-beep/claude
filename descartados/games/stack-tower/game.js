/* Stack Tower — drop sliding slabs to build the tallest tower. Perfect drops chain and regrow. three.js */
(function () {
  const K = window.Kit, T = window.THREE;
  K.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  const H0 = 0.5, START = 3;
  const THEMES = [
    { n: ['Pastel', 'Pastel'], h0: 180, hs: 6, sat: 55, lig: 62, bg: ['#fbd3e9', '#bbd2f7'], p: 0 },
    { n: ['Sunset', 'Pôr do sol'], h0: 10, hs: 4, sat: 75, lig: 58, bg: ['#ff9a8b', '#6a4c93'], p: 500 },
    { n: ['Ocean', 'Oceano'], h0: 190, hs: 3, sat: 70, lig: 50, bg: ['#a1ffce', '#1d4e89'], p: 800 },
    { n: ['Forest', 'Floresta'], h0: 90, hs: 3, sat: 45, lig: 45, bg: ['#e0eafc', '#3a6b35'], p: 1200 },
    { n: ['Candy', 'Doce'], h0: 300, hs: 12, sat: 80, lig: 65, bg: ['#fff1a8', '#ff7eb3'], p: 1600 },
    { n: ['Mono', 'Mono'], h0: 0, hs: 0, sat: 0, lig: 30, bg: ['#f5f5f5', '#9e9e9e'], p: 2000, mono: true },
    { n: ['Neon', 'Neon'], h0: 260, hs: 9, sat: 100, lig: 55, bg: ['#0f0c29', '#302b63'], gems: 40 },
  ];

  K.boot('stack_tower', { g: { best: 0, theme: 0, themes: [0], games: 0 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new T.Scene();
    let W = 1, H = 1;
    const camera = new T.OrthographicCamera(-5, 5, 5, -5, -100, 200);
    scene.add(new T.HemisphereLight('#ffffff', '#666688', 1.4));
    const dl = new T.DirectionalLight('#ffffff', 1.6); dl.position.set(5, 10, 7); scene.add(dl); scene.add(dl.target);
    const geo = new T.BoxGeometry(1, 1, 1);
    const theme = () => THEMES[G.theme] || THEMES[0];
    const colorAt = (i) => { const t = theme(); return new T.Color().setHSL((((t.h0 + i * t.hs) % 360) + 360) % 360 / 360, t.sat / 100, (t.mono ? 25 + (i % 10) * 6 : t.lig) / 100); };

    let stack = [], debris = [], cur = null, level = 0, playing = false, dir = 'x', speed = 3, perfect = 0, camY = 2, revived = false, lastMissStack = null, score = 0, coinsRun = 0;
    const clearScene = () => { stack.forEach((b) => scene.remove(b.m)); debris.forEach((d) => scene.remove(d.m)); if (cur) scene.remove(cur.m); stack = []; debris = []; cur = null; };
    function slab(w, d, x, z, y, i) {
      const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color: colorAt(i) }));
      m.scale.set(w, H0, d); m.position.set(x, y, z); scene.add(m);
      return { m, w, d, x, z, y };
    }
    function reset() {
      clearScene(); level = 0; perfect = 0; speed = 2.6; revived = false; score = 0; coinsRun = 0;
      const base = slab(START, START, 0, 0, -H0 * 4, 0); base.m.scale.y = H0 * 8; stack.push(base);
      const b1 = slab(START, START, 0, 0, 0, 0); stack.push(b1);
      document.body.style.background = `linear-gradient(${theme().bg[0]},${theme().bg[1]})`;
    }
    function spawn() {
      const top = stack[stack.length - 1]; level++;
      dir = level % 2 ? 'x' : 'z';
      const b = slab(top.w, top.d, top.x, top.z, level * H0, level);
      b.t = -1; b.dirSign = 1;
      if (dir === 'x') b.x = top.x - 6; else b.z = top.z - 6;
      b.m.position.set(b.x, b.y, b.z);
      cur = b; speed = Math.min(6.5, 2.6 + level * 0.05);
    }
    function drop() {
      if (!playing || !cur || K.ui.anyOpen()) return;
      const top = stack[stack.length - 1], b = cur;
      const delta = dir === 'x' ? b.x - top.x : b.z - top.z, size = dir === 'x' ? top.w : top.d;
      const over = size - Math.abs(delta);
      if (over <= 0) { miss(b); return; }
      const tol = 0.1;
      if (Math.abs(delta) < tol) {
        // perfect
        perfect++; b.x = top.x; b.z = top.z; b.m.position.set(b.x, b.y, b.z);
        if (perfect >= 4) { // regrow
          const g = 0.25; if (dir === 'x') b.w = Math.min(START, b.w + g); else b.d = Math.min(START, b.d + g); b.m.scale.set(b.w, H0, b.d);
        }
        K.audio.play('coin', 1 + Math.min(1.5, perfect * 0.09));
        ring(b); K.meta.track('perfect', 1);
        if (perfect % 5 === 0) { K.fx.text(W / 2, H * 0.3, K.t(['PERFECT x', 'PERFEITO x']) + perfect, { color: '#fff', stroke: 'rgba(0,0,0,.35)', size: 34 }); K.game.happy(); coinsRun += 5; }
      } else {
        perfect = 0;
        const cutSize = Math.abs(delta), newSize = over, sgn = Math.sign(delta);
        const center = (dir === 'x' ? top.x : top.z) + delta / 2;
        const cutCenter = center + sgn * (newSize / 2 + cutSize / 2);
        if (dir === 'x') { b.w = newSize; b.x = center; } else { b.d = newSize; b.z = center; }
        b.m.scale.set(b.w, H0, b.d); b.m.position.set(b.x, b.y, b.z);
        const dbr = slab(dir === 'x' ? cutSize : b.w, dir === 'x' ? b.d : cutSize, dir === 'x' ? cutCenter : b.x, dir === 'x' ? b.z : cutCenter, b.y, level);
        dbr.vy = 0; dbr.vx = dir === 'x' ? sgn * 1.5 : 0; dbr.vz = dir === 'z' ? sgn * 1.5 : 0; dbr.rot = sgn * (Math.random() * 2 + 1); debris.push(dbr);
        K.audio.play('thud', 1 + level * 0.01);
      }
      stack.push(b); cur = null; score = level;
      K.meta.track('blocks', 1); K.meta.trackMax('height', level);
      if (level % 10 === 0) { coinsRun += 3; K.audio.play('levelup'); }
      spawn();
    }
    function ring(b) {
      const g = new T.RingGeometry(0.5, 0.56, 4); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 4);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: T.DoubleSide }));
      m.position.set(b.x, b.y - H0 / 2 + 0.01, b.z); m.scale.set(b.w * 1.42, 1, b.d * 1.42); scene.add(m);
      debris.push({ m, ring: true, t: 0, w: b.w, d: b.d });
    }
    function miss(b) {
      cur = null; playing = false; K.game.stop();
      b.vy = 0; b.vx = 0; b.vz = 0; b.rot = 1.5; debris.push(b);
      K.audio.play('lose'); K.fx.shake(10);
      lastMissStack = level;
      zoomOut = true;
      setTimeout(endPanel, 1400);
    }
    let zoomOut = false;
    function endPanel() {
      const h = level - 1; K.meta.track('games', 1); G.games++;
      const nb = h > G.best; if (nb) G.best = h; K.save.mark(); K.meta.addXp(Math.floor(h / 3));
      K.std.end({ newBest: nb, rows: [[K.t(['Height', 'Altura']), h], [K.t('best'), G.best]], coins: Math.floor(h / 2) + coinsRun,
        revive: revived ? null : () => { revived = true; zoomOut = false; level--; playing = true; K.game.start(); spawn(); },
        restart: startGame, menu: showMenu });
    }
    function startGame() { reset(); zoomOut = false; playing = true; K.std.hideMenu(); hud.style.display = ''; K.game.start(); spawn(); }

    /* ---------- input ---------- */
    cv.addEventListener('pointerdown', () => drop());
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) drop(); } });

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Tap, click or press Space to drop the sliding slab. Whatever hangs over is cut off. Land it perfectly to keep its size — 4 perfects in a row make it grow back.', pt: 'Toque, clique ou aperte Espaço para soltar o bloco. O que sobrar para fora é cortado. Acerte em cheio para manter o tamanho — 4 perfeitos seguidos fazem ele crescer.' },
      missions: [
        { stat: 'height', base: 25, type: 'max', cap: 150, reward: 110, text: { en: 'Build {n} floors high', pt: 'Construa {n} andares' } },
        { stat: 'perfect', base: 20, reward: 80, text: { en: 'Land {n} perfect drops', pt: 'Acerte {n} encaixes perfeitos' } },
        { stat: 'blocks', base: 120, reward: 70, text: { en: 'Stack {n} slabs', pt: 'Empilhe {n} blocos' } },
        { stat: 'games', base: 5, reward: 50, text: { en: 'Play {n} games', pt: 'Jogue {n} partidas' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'st-hud'); K.ui.root.appendChild(hud);
    function showMenu() {
      playing = false; hud.style.display = 'none';
      K.std.menu({ title: 'Stack<span>Tower</span>', sub: K.t('best') + ': ' + G.best, onPlay: startGame,
        buttons: [K.ui.btn('🎨 ' + K.t(['Themes', 'Temas']), '', () => K.std.shop(K.t(['Themes', 'Temas']), THEMES.map((t, i) => ({ id: i, name: K.t(t.n), price: t.p, gems: t.gems, html: `<div style="width:60px;height:44px;border-radius:8px;background:linear-gradient(${t.bg[0]},${t.bg[1]});display:flex;align-items:flex-end;justify-content:center"><div style="width:30px;height:22px;background:hsl(${t.h0},${t.sat}%,${t.lig}%)"></div></div>` })), { owned: G.themes, get: () => G.theme, set: (i) => { G.theme = i; reset(); } }))] });
      if (!stack.length) reset();
    }

    /* ---------- loop ---------- */
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt);
      if (cur && playing) {
        cur.t += dt * speed * cur.dirSign * 0.33;
        if (cur.t > 1) { cur.t = 1; cur.dirSign = -1; } if (cur.t < -1) { cur.t = -1; cur.dirSign = 1; }
        const top = stack[stack.length - 1], off = cur.t * 6 * 0.9;
        if (dir === 'x') cur.x = top.x + off; else cur.z = top.z + off;
        cur.m.position.set(cur.x, cur.y, cur.z);
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        if (d.ring) { d.t += dt; d.m.scale.set(d.w * (1.42 + d.t * 1.5), 1, d.d * (1.42 + d.t * 1.5)); d.m.material.opacity = Math.max(0, 0.9 - d.t * 2); if (d.t > 0.5) { scene.remove(d.m); debris.splice(i, 1); } continue; }
        d.vy -= 20 * dt; d.m.position.y += d.vy * dt; d.m.position.x += d.vx * dt; d.m.position.z += d.vz * dt;
        if (dir === 'x') d.m.rotation.z -= d.rot * dt; else d.m.rotation.x += d.rot * dt;
        if (d.m.position.y < camY - 30) { scene.remove(d.m); debris.splice(i, 1); }
      }
      const targetY = zoomOut ? level * H0 * 0.5 : level * H0 + 1;
      camY = K.lerp(camY, targetY, Math.min(1, dt * 3));
      if (playing) hud.innerHTML = `<b>${level > 0 ? level - 1 : 0}</b>${perfect >= 2 ? `<small>${K.t(['perfect', 'perfeito'])} x${perfect}</small>` : ''}`;
    }, () => {
      const aspect = W / H, zoom = zoomOut ? Math.max(6, level * H0 * 0.7 + 4) : (W < H ? 6.5 : 5.5);
      camera.left = -zoom * aspect; camera.right = zoom * aspect; camera.top = zoom; camera.bottom = -zoom; camera.updateProjectionMatrix();
      camera.position.set(10, camY + 10, 10); camera.lookAt(0, camY, 0);
      dl.position.set(5, camY + 10, 7); dl.target.position.set(0, camY, 0);
      renderer.render(scene, camera);
      fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, fxCv.width, fxCv.height); fxCtx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
      fxCtx.save(); fxCtx.translate(K.fx.shakeX, K.fx.shakeY); K.fx.draw(fxCtx); fxCtx.restore(); K.fx.drawFlash(fxCtx, W, H);
    });
    const fxCv = document.getElementById('fx'), fxCtx = fxCv.getContext('2d'); let fxDpr = 1;
    K.fit(cv, (w, h) => { W = w; H = h; renderer.setSize(w, h, false); }, 2);
    K.fit(fxCv, (w, h, d) => { fxDpr = d; }, 1.5);
    K.debug = () => ({ cur, top: stack[stack.length - 1], dir, drop });
    K.music.set({ bpm: 90, chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 62, 66]], pad: true, padWave: 'sine', arp: [1, 0, 0, 1, 0, 1, 0, 0], arpWave: 'sine', bass: true });
    showMenu();
  }
})();

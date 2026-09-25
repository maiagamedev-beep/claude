/* Word Grove — themed word search in English or Portuguese. Drag across letters in any of 8 directions. */
(function () {
  const K = window.Kit;
  K.fontFamily = '"Trebuchet MS", "Segoe UI", sans-serif';
  const THEMES = {
    en: [
      ['Animals', 'TIGER LION ZEBRA HORSE MOUSE EAGLE SHARK WHALE PANDA OTTER RABBIT MONKEY TURTLE PARROT'],
      ['Fruits', 'APPLE MANGO GRAPE LEMON PEACH MELON BANANA CHERRY ORANGE PAPAYA GUAVA KIWI PLUM'],
      ['Colors', 'RED BLUE GREEN YELLOW PURPLE ORANGE PINK BROWN BLACK WHITE GOLD SILVER CORAL'],
      ['Space', 'STAR MOON PLANET COMET ORBIT ROCKET GALAXY SATURN MARS VENUS NEBULA METEOR'],
      ['Ocean', 'WAVE CORAL SQUID CRAB TIDE REEF SHELL SAND PEARL DOLPHIN ANCHOR KELP'],
      ['Kitchen', 'SPOON FORK KNIFE PLATE BOWL OVEN PAN KETTLE WHISK LADLE TOASTER MIXER'],
      ['Weather', 'RAIN SNOW WIND STORM CLOUD SUNNY FOG HAIL THUNDER BREEZE FROST RAINBOW'],
      ['Music', 'PIANO DRUM GUITAR FLUTE VIOLIN SONG RHYTHM BASS HARP TRUMPET CHOIR BEAT'],
      ['Sports', 'SOCCER TENNIS GOLF RUGBY SKATE SURF BOXING HOCKEY CHESS ROWING KARATE SKI'],
      ['Garden', 'ROSE TULIP DAISY SEED ROOT LEAF SOIL WATER SHOVEL BLOOM FERN IVY'],
      ['Travel', 'MAP TICKET TRAIN PLANE HOTEL BEACH PASSPORT BAG CAMERA ISLAND CITY BRIDGE'],
      ['Jobs', 'DOCTOR NURSE CHEF PILOT FARMER TEACHER BAKER JUDGE PAINTER SINGER DENTIST'],
    ],
    pt: [
      ['Animais', 'TIGRE LEAO ZEBRA CAVALO RATO AGUIA TUBARAO BALEIA PANDA LONTRA COELHO MACACO TARTARUGA'],
      ['Frutas', 'MACA MANGA UVA LIMAO PESSEGO MELAO BANANA CEREJA LARANJA MAMAO GOIABA KIWI AMEIXA'],
      ['Cores', 'VERMELHO AZUL VERDE AMARELO ROXO LARANJA ROSA MARROM PRETO BRANCO DOURADO PRATA'],
      ['Espaco', 'ESTRELA LUA PLANETA COMETA ORBITA FOGUETE GALAXIA SATURNO MARTE VENUS NEBULOSA'],
      ['Oceano', 'ONDA CORAL LULA SIRI MARE RECIFE CONCHA AREIA PEROLA GOLFINHO ANCORA ALGA'],
      ['Cozinha', 'COLHER GARFO FACA PRATO TIGELA FORNO PANELA CHALEIRA CONCHA BATEDOR XICARA'],
      ['Clima', 'CHUVA NEVE VENTO TEMPESTADE NUVEM SOL NEBLINA GRANIZO TROVAO BRISA GEADA'],
      ['Musica', 'PIANO TAMBOR VIOLAO FLAUTA VIOLINO CANCAO RITMO BAIXO HARPA TROMPETE CORAL'],
      ['Esportes', 'FUTEBOL TENIS GOLFE RUGBI SKATE SURFE BOXE HOQUEI XADREZ REMO KARATE ESQUI'],
      ['Jardim', 'ROSA TULIPA MARGARIDA SEMENTE RAIZ FOLHA TERRA AGUA PA FLOR SAMAMBAIA HERA'],
      ['Viagem', 'MAPA BILHETE TREM AVIAO HOTEL PRAIA PASSAPORTE MALA CAMERA ILHA CIDADE PONTE'],
      ['Profissoes', 'MEDICO ENFERMEIRA CHEF PILOTO FAZENDEIRO PROFESSOR PADEIRO JUIZ PINTOR CANTOR DENTISTA'],
    ],
  };
  const HUES = ['#ff8fa3', '#ffc971', '#8bd3a0', '#7ec8e3', '#b69cff', '#ff9f68', '#f5d76e', '#6fd6c3'];
  const LEVELS = 60;

  K.boot('word_grove', { g: { lvl: 0, stars: {}, hints: 3, lang: K.lang } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, N = 8, bx = 0, by = 0, cs = 40;
    function layout() { const size = Math.min(W - 20, H - 260, 560); cs = size / N; bx = (W - size) / 2; by = 105; list.style.top = by + size + 14 + 'px'; list.style.width = Math.min(W - 20, 560) + 'px'; }

    let grid = [], words = [], found = [], sel = null, lvIdx = 0, playing = false, theme = '', time = 0, hintCell = -1, hintT = 0;
    const DIRS = [[1, 0], [0, 1], [1, 1], [-1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1]];
    function startLevel(i) {
      lvIdx = i; const r = K.rng(i * 911 + (G.lang === 'pt' ? 7 : 3)), T = THEMES[G.lang][i % 12];
      N = Math.min(12, 7 + Math.floor(i / 8)); theme = T[0];
      const pool = T[1].split(' ').filter((w) => w.length <= N).sort(() => r() - 0.5);
      const count = Math.min(pool.length, 5 + Math.floor(i / 6)), dirs = i < 5 ? DIRS.slice(0, 2) : i < 15 ? DIRS.slice(0, 4) : DIRS;
      for (let tries = 0; tries < 30; tries++) {
        grid = new Array(N * N).fill(''); words = [];
        for (const w of pool) {
          if (words.length >= count) break;
          for (let k = 0; k < 80; k++) {
            const d = dirs[Math.floor(r() * dirs.length)], x = Math.floor(r() * N), y = Math.floor(r() * N);
            const ex = x + d[0] * (w.length - 1), ey = y + d[1] * (w.length - 1);
            if (ex < 0 || ey < 0 || ex >= N || ey >= N) continue;
            let ok = true; for (let j = 0; j < w.length; j++) { const c = grid[(y + d[1] * j) * N + x + d[0] * j]; if (c && c !== w[j]) { ok = false; break; } }
            if (!ok) continue;
            const cells = []; for (let j = 0; j < w.length; j++) { const ci = (y + d[1] * j) * N + x + d[0] * j; grid[ci] = w[j]; cells.push(ci); }
            words.push({ w, cells, found: false, col: HUES[words.length % HUES.length] }); break;
          }
        }
        if (words.length >= Math.min(count, 4)) break;
      }
      const AL = 'ABCDEFGHIJKLMNOPRSTUVAEIOU';
      grid = grid.map((c) => c || AL[Math.floor(r() * AL.length)]);
      found = []; sel = null; time = 0; playing = true;
      K.std.hideMenu(); hud.style.display = list.style.display = ''; K.game.start(); layout(); renderList();
      appear = 0;
    }
    let appear = 0;
    function cellAt(x, y) { const c = Math.floor((x - bx) / cs), r = Math.floor((y - by) / cs); return c >= 0 && r >= 0 && c < N && r < N ? r * N + c : -1; }
    function lineCells(a, b) {
      const ax = a % N, ay = (a / N) | 0, bx2 = b % N, by2 = (b / N) | 0, dx = bx2 - ax, dy = by2 - ay;
      if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
      const n = Math.max(Math.abs(dx), Math.abs(dy)), sx = Math.sign(dx), sy = Math.sign(dy), out = [];
      for (let j = 0; j <= n; j++) out.push((ay + sy * j) * N + ax + sx * j);
      return out;
    }
    cv.addEventListener('pointerdown', (e) => { if (!playing) return; const c = cellAt(e.clientX, e.clientY); if (c >= 0) { sel = { a: c, b: c }; K.audio.play('tap', 1.5); } });
    window.addEventListener('pointermove', (e) => { if (!sel) return; const c = cellAt(e.clientX, e.clientY); if (c >= 0 && c !== sel.b && lineCells(sel.a, c)) { sel.b = c; K.audio.play('tick', 1 + (lineCells(sel.a, c).length) * 0.08); } });
    window.addEventListener('pointerup', () => {
      if (!sel) return; const cells = lineCells(sel.a, sel.b); sel = null; if (!cells || cells.length < 2) return;
      const str = cells.map((c) => grid[c]).join(''), rev = str.split('').reverse().join('');
      const w = words.find((q) => !q.found && (q.w === str || q.w === rev) && (q.cells.join() === cells.join() || q.cells.slice().reverse().join() === cells.join()));
      if (w) {
        w.found = true; found.push(w); K.audio.play('merge', 1 + found.length * 0.06); K.meta.track('words', 1);
        w.cells.forEach((c, j) => setTimeout(() => K.fx.burst(bx + (c % N + 0.5) * cs, by + (((c / N) | 0) + 0.5) * cs, { n: 5, colors: [w.col, '#fff'], speed: 150, g: 0, shape: 'star', size: 4, life: 0.4 }), j * 40));
        K.fx.text(W / 2, by - 16, w.w, { color: w.col, stroke: '#2f4034', size: 30 });
        renderList();
        if (words.every((q) => q.found)) win();
      } else K.audio.play('error');
    });
    function hint() {
      if (!playing) return;
      if (G.hints <= 0) { const p = K.ui.panel({ title: '💡', body: `<p>${K.t(['Out of hints', 'Sem dicas'])}</p>` }); p.foot.appendChild(K.ui.adBtn('+2 ' + K.t('free'), () => { G.hints += 2; K.save.mark(); p.close(); renderList(); })); p.foot.appendChild(K.ui.btn('+3 · ' + K.icon.coin + ' 150', '', () => { if (K.meta.spend(150)) { G.hints += 3; p.close(); renderList(); } })); p.panel.appendChild(p.foot); return; }
      const w = words.find((q) => !q.found); if (!w) return;
      G.hints--; hintCell = w.cells[0]; hintT = 3; K.audio.play('power'); K.save.mark(); renderList();
    }
    function win() {
      playing = false; K.audio.play('win'); K.std.confetti(HUES);
      const stars = time < 40 + N * 5 ? 3 : time < 90 + N * 8 ? 2 : 1;
      G.stars[lvIdx] = Math.max(G.stars[lvIdx] || 0, stars); if (lvIdx === G.lvl && G.lvl < LEVELS - 1) G.lvl++;
      K.meta.track('levels', 1); K.meta.addXp(15); K.save.mark();
      setTimeout(() => K.std.end({ win: true, title: K.t(['All words found!', 'Todas encontradas!']), text: '★'.repeat(stars) + '☆'.repeat(3 - stars), rows: [[K.t(['Time', 'Tempo']), K.fmtTime(time)]], coins: 25 + lvIdx * 5 + stars * 15, mult: 3, next: { fn: () => startLevel(G.lvl) }, menu: showMenu }), 900);
    }

    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Find every word in the list. Press on the first letter and drag to the last one — words can go across, down or diagonally, forwards or backwards.', pt: 'Encontre todas as palavras da lista. Pressione a primeira letra e arraste até a última — as palavras podem estar na horizontal, vertical ou diagonal, em qualquer sentido.' },
      missions: [{ stat: 'words', base: 30, reward: 80, text: { en: 'Find {n} words', pt: 'Encontre {n} palavras' } }, { stat: 'levels', base: 3, reward: 110, text: { en: 'Clear {n} puzzles', pt: 'Complete {n} caça-palavras' } }],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const list = K.el('div', 'wglist'); K.ui.root.appendChild(list);
    function renderList() {
      list.innerHTML = `<div class="theme">${theme}</div><div class="ws">${words.map((w) => `<span class="${w.found ? 'f' : ''}" style="--c:${w.col}">${w.w}</span>`).join('')}</div>`;
      const tools = K.el('div', 'tools');
      tools.appendChild(K.ui.btn('💡 ' + G.hints, 'sm', hint)); tools.appendChild(K.ui.btn('⌂', 'sm', showMenu));
      list.appendChild(tools);
    }
    function showMenu() {
      playing = false; hud.style.display = list.style.display = 'none';
      K.std.menu({ title: 'Word<span>Grove</span>', sub: K.t('level') + ' ' + (G.lvl + 1) + ' / ' + LEVELS, onPlay: () => startLevel(G.lvl),
        buttons: [K.ui.btn('▦ ' + K.t(['Levels', 'Fases']), '', () => K.std.levels(K.t(['Levels', 'Fases']), LEVELS, G.lvl, G.stars, (i) => { K.std.hideMenu(); startLevel(i); }, (i) => THEMES[G.lang][i % 12][0].slice(0, 7))),
          K.ui.btn(G.lang === 'pt' ? '🇧🇷 Português' : '🇬🇧 English', '', (b) => { G.lang = G.lang === 'pt' ? 'en' : 'pt'; K.save.mark(); b.textContent = G.lang === 'pt' ? '🇧🇷 Português' : '🇬🇧 English'; })] });
    }

    let tt = 0;
    K.loop((dt) => { tt += dt; K.fx.update(dt); if (playing) { time += dt; hud.innerHTML = `<span class="chip">${K.t('level')} ${lvIdx + 1}</span><span class="chip">⏱ ${K.fmtTime(time)}</span><span class="chip">${found.length}/${words.length}</span>`; } hintT = Math.max(0, hintT - dt); appear = Math.min(1, appear + dt * 2); }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#dff2e1'); gr.addColorStop(1, '#a8d5b5'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // tree canopy silhouettes
      ctx.fillStyle = 'rgba(47,64,52,.08)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc((i / 7) * W, H + 40, 120 + (i % 3) * 40, 0, 6.283); ctx.fill(); }
      if (!grid.length) return;
      ctx.save(); ctx.translate(K.fx.shakeX, K.fx.shakeY);
      ctx.fillStyle = 'rgba(47,64,52,.18)'; K.draw.rrect(ctx, bx - 8, by - 4, cs * N + 16, cs * N + 16, 18); ctx.fill();
      ctx.fillStyle = '#fdfaf1'; K.draw.rrect(ctx, bx - 8, by - 8, cs * N + 16, cs * N + 16, 18); ctx.fill();
      const pill = (cells, col, a) => { const s = cells[0], e = cells[cells.length - 1]; ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = cs * 0.78; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + (s % N + 0.5) * cs, by + (((s / N) | 0) + 0.5) * cs); ctx.lineTo(bx + (e % N + 0.5) * cs, by + (((e / N) | 0) + 0.5) * cs); ctx.stroke(); ctx.globalAlpha = 1; };
      found.forEach((w) => pill(w.cells, w.col, 0.55));
      if (sel) { const cs2 = lineCells(sel.a, sel.b); if (cs2) pill(cs2, '#7ec8e3', 0.6); }
      if (hintT > 0 && hintCell >= 0) { ctx.fillStyle = `rgba(255,201,113,${0.4 + Math.sin(tt * 10) * 0.3})`; ctx.beginPath(); ctx.arc(bx + (hintCell % N + 0.5) * cs, by + (((hintCell / N) | 0) + 0.5) * cs, cs * 0.45, 0, 6.283); ctx.fill(); }
      ctx.font = `700 ${cs * 0.52}px "Trebuchet MS",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2f4034';
      grid.forEach((c, i) => { const k = K.clamp(appear * 2 - (i / grid.length), 0, 1); ctx.globalAlpha = k; ctx.fillText(c, bx + (i % N + 0.5) * cs, by + (((i / N) | 0) + 0.5) * cs + (1 - k) * 10); });
      ctx.globalAlpha = 1;
      K.fx.draw(ctx); ctx.restore(); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); });
    K.music.set({ bpm: 80, chords: [[67, 71, 74], [64, 67, 71], [60, 64, 67], [62, 66, 69]], pad: true, padWave: 'triangle', arp: [1, 0, 0, 1, 0, 0, 1, 0], arpWave: 'sine' });
    showMenu();
  }
})();

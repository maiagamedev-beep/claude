/* Cozy Solitaire — Klondike with drag & tap-to-move, undo, hints, auto-finish and bouncing win cascade. */
(function () {
  const K = window.Kit;
  K.fontFamily = 'Georgia, "Times New Roman", serif';
  const SUITS = ['h', 'd', 'c', 's'], RED = { h: 1, d: 1 };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const BACKS = [
    { n: ['Forest', 'Floresta'], a: '#2f5d50', b: '#e9d8a6', p: 0 }, { n: ['Berry', 'Amora'], a: '#7b2d4a', b: '#f6c1d0', p: 400 }, { n: ['Ocean', 'Oceano'], a: '#1d4e89', b: '#9ad1ff', p: 600 },
    { n: ['Autumn', 'Outono'], a: '#a0522d', b: '#f4c27a', p: 900 }, { n: ['Night', 'Noite'], a: '#1b1b3a', b: '#c8b6ff', p: 1200 }, { n: ['Gold', 'Ouro'], a: '#6b4e16', b: '#ffd166', gems: 30 },
  ];
  const TABLES = [{ n: ['Felt', 'Feltro'], c: '#2e6b4f', p: 0 }, { n: ['Walnut', 'Nogueira'], c: '#5b3a24', p: 500 }, { n: ['Navy', 'Marinho'], c: '#1f3a5f', p: 500 }, { n: ['Plum', 'Ameixa'], c: '#4a2545', p: 800 }];

  K.boot('cozy_solitaire', { g: { wins: 0, back: 0, backs: [0], table: 0, tables: [0], bestT: 0, draw3: false, undos: 5 } }, main);

  function main() {
    const G = K.save.data.g;
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, cw = 60, ch = 84, gap = 8, top = 110, left = 10;
    function layout() { cw = Math.min((W - 16) / 7 - 6, (H - 150) / 5.2, 100); ch = cw * 1.4; gap = Math.max(4, (W - cw * 7) / 8); left = gap; top = 105; for (const k in cache) delete cache[k]; }

    /* ---------- card art ---------- */
    const cache = {};
    function suitPath(g, s, x, y, r) {
      g.beginPath();
      if (s === 'h') { g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35); g.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9); }
      else if (s === 'd') { g.moveTo(x, y - r); g.lineTo(x + r * 0.75, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.75, y); g.closePath(); }
      else if (s === 'c') { g.arc(x, y - r * 0.45, r * 0.42, 0, 6.283); g.moveTo(x - r * 0.45, y + r * 0.1); g.arc(x - r * 0.45, y + r * 0.1, r * 0.42, 0, 6.283); g.moveTo(x + r * 0.45, y + r * 0.1); g.arc(x + r * 0.45, y + r * 0.1, r * 0.42, 0, 6.283); g.moveTo(x - r * 0.12, y); g.lineTo(x - r * 0.3, y + r); g.lineTo(x + r * 0.3, y + r); g.lineTo(x + r * 0.12, y); }
      else { g.moveTo(x, y - r); g.bezierCurveTo(x + r * 1.4, y + r * 0.1, x + r * 0.6, y + r * 0.9, x, y + r * 0.35); g.bezierCurveTo(x - r * 0.6, y + r * 0.9, x - r * 1.4, y + r * 0.1, x, y - r); g.moveTo(x - r * 0.12, y + r * 0.2); g.lineTo(x - r * 0.3, y + r); g.lineTo(x + r * 0.3, y + r); g.lineTo(x + r * 0.12, y + r * 0.2); }
      g.fill();
    }
    function cardImg(c) {
      const w = Math.round(cw * DPR), h = Math.round(ch * DPR), key = (c ? c.s + c.r : 'back' + G.back) + w;
      if (cache[key]) return cache[key];
      const cn = document.createElement('canvas'); cn.width = w; cn.height = h; const g = cn.getContext('2d');
      K.draw.rrect(g, 1, 1, w - 2, h - 2, w * 0.1);
      if (!c) {
        const B = BACKS[G.back]; g.fillStyle = B.a; g.fill(); g.strokeStyle = B.b; g.lineWidth = w * 0.03; K.draw.rrect(g, w * 0.08, w * 0.08, w * 0.84, h - w * 0.16, w * 0.06); g.stroke();
        g.save(); g.beginPath(); g.rect(w * 0.1, w * 0.1, w * 0.8, h - w * 0.2); g.clip(); g.strokeStyle = B.b; g.globalAlpha = 0.5; g.lineWidth = w * 0.015;
        for (let i = -h; i < w + h; i += w * 0.12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
        g.restore(); g.fillStyle = B.b; g.beginPath(); g.arc(w / 2, h / 2, w * 0.14, 0, 6.283); g.fill();
        return (cache[key] = cn);
      }
      g.fillStyle = '#fffdf6'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.5; g.stroke();
      const col = RED[c.s] ? '#c8323c' : '#1f2430'; g.fillStyle = col;
      g.font = `700 ${w * 0.3}px Georgia, serif`; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText(RANKS[c.r], w * 0.07, w * 0.06);
      suitPath(g, c.s, w * 0.17, w * 0.5, w * 0.1);
      if (c.r >= 10) { // face cards: stylised crest
        g.fillStyle = RED[c.s] ? 'rgba(200,50,60,.12)' : 'rgba(31,36,48,.1)'; K.draw.rrect(g, w * 0.25, h * 0.28, w * 0.5, h * 0.55, w * 0.08); g.fill();
        g.fillStyle = col; g.font = `700 ${w * 0.42}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['J', 'Q', 'K'][c.r - 10], w * 0.5, h * 0.5);
        g.fillStyle = '#d4a017'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(w * (0.38 + i * 0.12), h * 0.33); g.lineTo(w * (0.42 + i * 0.12), h * 0.29); g.lineTo(w * (0.46 + i * 0.12), h * 0.33); g.fill(); }
      } else suitPath(g, c.s, w * 0.55, h * 0.58, w * 0.26);
      return (cache[key] = cn);
    }

    /* ---------- state ---------- */
    let stock = [], waste = [], found = [[], [], [], []], tab = [[], [], [], [], [], [], []], hist = [], moves = 0, time = 0, playing = false, drag = null, anim = [], hint = null, bounce = [], won = false;
    function deal() {
      const deck = []; SUITS.forEach((s) => { for (let r = 0; r < 13; r++) deck.push({ s, r, up: false, x: 0, y: 0 }); });
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      tab = [[], [], [], [], [], [], []]; found = [[], [], [], []]; waste = []; hist = []; moves = 0; time = 0; won = false; bounce = [];
      for (let c = 0; c < 7; c++) for (let r = 0; r <= c; r++) { const card = deck.pop(); card.up = r === c; tab[c].push(card); }
      stock = deck;
      const sp = stockPos(); [...stock, ...tab.flat()].forEach((c) => { c.x = sp.x; c.y = sp.y; });
      let i = 0; tab.forEach((col, ci) => col.forEach((c, ri) => { const p = tabPos(ci, ri); setTimeout(() => { K.tween(c, { x: p.x, y: p.y }, 0.25, 'outQuad'); K.audio.play('tick', 1.5); }, i++ * 30); }));
      playing = true; K.std.hideMenu(); hud.style.display = bar.style.display = ''; K.game.start();
    }
    const stockPos = () => ({ x: left, y: top });
    const wastePos = (k) => ({ x: left + cw + gap + (G.draw3 ? k * cw * 0.25 : 0), y: top });
    const foundPos = (i) => ({ x: left + (cw + gap) * (3 + i), y: top });
    function tabPos(ci, ri) {
      let y = top + ch + gap * 2; const col = tab[ci];
      const avail = H - y - ch - 20, n = col.length, upOff = Math.min(ch * 0.3, n > 1 ? avail / Math.max(1, n - 1) : ch * 0.3), downOff = Math.min(ch * 0.12, upOff);
      for (let k = 0; k < ri; k++) y += col[k] && col[k].up ? upOff : downOff;
      return { x: left + ci * (cw + gap), y };
    }
    function relayoutCards() {
      tab.forEach((col, ci) => col.forEach((c, ri) => { const p = tabPos(ci, ri); K.tween(c, { x: p.x, y: p.y }, 0.14, 'outQuad'); }));
      waste.forEach((c, i) => { const k = G.draw3 ? Math.max(0, i - (waste.length - 3)) : 0; const p = wastePos(k); K.tween(c, { x: p.x, y: p.y }, 0.14, 'outQuad'); });
      found.forEach((f, i) => f.forEach((c) => { const p = foundPos(i); K.tween(c, { x: p.x, y: p.y }, 0.18, 'outQuad'); }));
      stock.forEach((c) => { const p = stockPos(); c.x = p.x; c.y = p.y; });
    }
    function snapshot() { const m = (a) => a.map((c) => ({ c, up: c.up })); return { stock: m(stock), waste: m(waste), found: found.map(m), tab: tab.map(m), moves }; }
    function restore(s) { const u = (a) => a.map((o) => { o.c.up = o.up; return o.c; }); stock = u(s.stock); waste = u(s.waste); found = s.found.map(u); tab = s.tab.map(u); moves = s.moves; relayoutCards(); }
    const canFound = (c, i) => { const f = found[i]; return f.length ? f[f.length - 1].s === c.s && f[f.length - 1].r === c.r - 1 : c.r === 0; };
    const canTab = (c, ci) => { const col = tab[ci]; if (!col.length) return c.r === 12; const t = col[col.length - 1]; return t.up && t.r === c.r + 1 && !!RED[t.s] !== !!RED[c.s]; };
    function draw() {
      hist.push(snapshot());
      if (!stock.length) { stock = waste.reverse().map((c) => { c.up = false; return c; }); waste = []; K.audio.play('whoosh'); }
      else { const n = G.draw3 ? 3 : 1; for (let k = 0; k < n && stock.length; k++) { const c = stock.pop(); c.up = true; waste.push(c); } K.audio.play('swing', 1.5); }
      moves++; relayoutCards(); hint = null;
    }
    function source(c) {
      for (let i = 0; i < 7; i++) { const k = tab[i].indexOf(c); if (k >= 0) return { t: 'tab', i, k }; }
      if (waste[waste.length - 1] === c) return { t: 'waste' };
      for (let i = 0; i < 4; i++) if (found[i][found[i].length - 1] === c) return { t: 'found', i };
      return null;
    }
    function takeCards(src) { if (src.t === 'tab') return tab[src.i].slice(src.k); if (src.t === 'waste') return [waste[waste.length - 1]]; return [found[src.i][found[src.i].length - 1]]; }
    function removeCards(src) { if (src.t === 'tab') { tab[src.i].splice(src.k); const t = tab[src.i][tab[src.i].length - 1]; if (t && !t.up) { t.up = true; K.audio.play('tap', 1.4); score(5); } } else if (src.t === 'waste') waste.pop(); else found[src.i].pop(); }
    function moveTo(src, dest) {
      const cards = takeCards(src); hist.push(snapshot());
      removeCards(src);
      if (dest.t === 'found') { found[dest.i].push(cards[0]); K.audio.play('coin', 1 + found[dest.i].length * 0.04); score(10); K.meta.track('found', 1); const p = foundPos(dest.i); K.fx.burst(p.x + cw / 2, p.y + ch / 2, { n: 10, colors: ['#ffd166', '#fff'], speed: 180, shape: 'star', size: 4, life: 0.5 }); }
      else { tab[dest.i].push(...cards); K.audio.play('land', 1.3); }
      moves++; hint = null; relayoutCards(); checkWin();
    }
    let pts = 0; const score = (n) => (pts += n);
    function autoMove(c) {
      const src = source(c); if (!src) return false;
      const cards = takeCards(src);
      if (cards.length === 1) for (let i = 0; i < 4; i++) if (canFound(c, i)) { moveTo(src, { t: 'found', i }); return true; }
      for (let i = 0; i < 7; i++) if (i !== src.i || src.t !== 'tab') { if (canTab(cards[0], i) && !(src.t === 'tab' && src.k === 0 && !tab[i].length)) { moveTo(src, { t: 'tab', i }); return true; } }
      return false;
    }
    function findHint() {
      const cands = [];
      tab.forEach((col, i) => col.forEach((c, k) => { if (c.up) cands.push(c); }));
      if (waste.length) cands.push(waste[waste.length - 1]);
      for (const c of cands) {
        const src = source(c), cards = takeCards(src);
        if (cards.length === 1) for (let i = 0; i < 4; i++) if (canFound(c, i)) return c;
        for (let i = 0; i < 7; i++) if (!(src.t === 'tab' && src.i === i) && canTab(cards[0], i) && !(src.t === 'tab' && src.k === 0 && !tab[i].length) && !(src.t === 'tab' && src.k > 0 && tab[src.i][src.k - 1].up && !tab[i].length)) return c;
      }
      return stock.length || waste.length ? 'stock' : null;
    }
    function checkWin() {
      if (found.every((f) => f.length === 13)) {
        won = true; playing = false; K.game.stop(); G.wins++; K.meta.track('wins', 1); K.meta.addXp(30);
        const nb = !G.bestT || time < G.bestT; if (nb) G.bestT = Math.floor(time); K.save.mark();
        K.audio.play('win'); K.game.happy();
        // classic bouncing card cascade
        found.forEach((f, i) => f.slice().reverse().forEach((c, k) => setTimeout(() => bounce.push({ c, x: c.x, y: c.y, vx: (Math.random() < 0.5 ? -1 : 1) * K.rand(150, 350), vy: -K.rand(0, 300), trail: [] }), (k * 4 + i) * 90)));
        setTimeout(() => K.std.end({ win: true, title: K.t(['You won!', 'Você venceu!']), newBest: nb, rows: [[K.t(['Time', 'Tempo']), K.fmtTime(time)], [K.t(['Moves', 'Movimentos']), moves], [K.t(['Wins', 'Vitórias']), G.wins]], coins: 80 + Math.max(0, 300 - Math.floor(time)) / 3 | 0, mult: 3, next: { label: K.t(['New deal', 'Nova partida']), fn: deal }, menu: showMenu }), 5500);
      }
    }
    function autoFinish() {
      if (stock.length || waste.length || tab.some((c) => c.some((x) => !x.up))) return;
      const step = () => { for (let i = 0; i < 7; i++) { const c = tab[i][tab[i].length - 1]; if (c) for (let f = 0; f < 4; f++) if (canFound(c, f)) { moveTo({ t: 'tab', i, k: tab[i].length - 1 }, { t: 'found', i: f }); if (!won) setTimeout(step, 90); return; } } };
      step();
    }

    /* ---------- input ---------- */
    function cardAt(x, y) {
      for (let i = 0; i < 7; i++) for (let k = tab[i].length - 1; k >= 0; k--) { const c = tab[i][k]; if (x >= c.x && x <= c.x + cw && y >= c.y && y <= c.y + ch) return c.up ? c : null; }
      const w = waste[waste.length - 1]; if (w && x >= w.x && x <= w.x + cw && y >= w.y && y <= w.y + ch) return w;
      for (let i = 0; i < 4; i++) { const f = found[i][found[i].length - 1]; if (f && x >= f.x && x <= f.x + cw && y >= f.y && y <= f.y + ch) return f; }
      return null;
    }
    cv.addEventListener('pointerdown', (e) => {
      if (!playing || K.ui.anyOpen()) return;
      const x = e.clientX, y = e.clientY, sp = stockPos();
      if (x >= sp.x && x <= sp.x + cw && y >= sp.y && y <= sp.y + ch) { draw(); return; }
      const c = cardAt(x, y); if (!c) return;
      const src = source(c); const cards = takeCards(src);
      drag = { src, cards, ox: x - c.x, oy: y - c.y, sx: x, sy: y, moved: false, x, y };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return; drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 6) drag.moved = true;
      if (drag.moved) drag.cards.forEach((c, i) => { c.x = drag.x - drag.ox; c.y = drag.y - drag.oy + i * ch * 0.28; });
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return; const d = drag; drag = null;
      if (!d.moved) { if (!autoMove(d.cards[0])) { K.audio.play('error'); relayoutCards(); } else autoFinish(); return; }
      const c0 = d.cards[0], cx = c0.x + cw / 2, cy = c0.y + ch / 2;
      let best = null, bd = 1e9;
      for (let i = 0; i < 7; i++) { const last = tab[i].length ? tab[i][tab[i].length - 1] : { x: tabPos(i, 0).x, y: tabPos(i, 0).y }; const dd = Math.hypot(last.x + cw / 2 - cx, last.y + ch / 2 - cy); if (dd < bd && dd < cw * 1.3 && canTab(c0, i) && !(d.src.t === 'tab' && d.src.i === i)) { bd = dd; best = { t: 'tab', i }; } }
      if (d.cards.length === 1) for (let i = 0; i < 4; i++) { const p = foundPos(i), dd = Math.hypot(p.x + cw / 2 - cx, p.y + ch / 2 - cy); if (dd < bd && dd < cw * 1.3 && canFound(c0, i)) { bd = dd; best = { t: 'found', i }; } }
      if (best) { moveTo(d.src, best); autoFinish(); } else { K.audio.play('error'); relayoutCards(); }
    });
    window.addEventListener('keydown', (e) => { if (!playing) return; if (e.code === 'KeyZ') undo(); if (e.code === 'KeyH') doHint(); if (e.code === 'Space') { e.preventDefault(); draw(); } });
    function undo() {
      if (!hist.length) return K.audio.play('error');
      if (G.undos <= 0) { const p = K.ui.panel({ title: '↶ ' + K.t(['Undo', 'Desfazer']), body: `<p>${K.t(['Out of undos', 'Sem desfazer'])}</p>` }); p.foot.appendChild(K.ui.adBtn('+5 ' + K.t('free'), () => { G.undos += 5; K.save.mark(); p.close(); renderBar(); })); p.foot.appendChild(K.ui.btn('+5 · ' + K.icon.coin + ' 150', '', () => { if (K.meta.spend(150)) { G.undos += 5; p.close(); renderBar(); } })); p.panel.appendChild(p.foot); return; }
      G.undos--; restore(hist.pop()); K.audio.play('whoosh'); renderBar(); K.save.mark();
    }
    function doHint() { hint = findHint(); hintT = 2; if (!hint) K.ui.toast(K.t(['No moves — try a new deal', 'Sem jogadas — tente uma nova partida'])); K.audio.play('click'); }
    let hintT = 0;

    /* ---------- meta & DOM ---------- */
    K.meta.init({
      coinScale: () => 1,
      howTo: { en: 'Build four foundation piles from Ace to King by suit. On the table, stack cards in descending order with alternating colors; only Kings go to empty columns. Tap a card to auto-move it, or drag it. Tap the deck to draw. Z = undo, H = hint.', pt: 'Monte quatro pilhas do Ás ao Rei por naipe. Na mesa, empilhe em ordem decrescente alternando cores; só Reis vão para colunas vazias. Toque numa carta para mover sozinha, ou arraste. Toque no monte para comprar. Z = desfazer, H = dica.' },
      missions: [
        { stat: 'wins', base: 1, reward: 150, text: { en: 'Win {n} game(s)', pt: 'Vença {n} partida(s)' } },
        { stat: 'found', base: 40, reward: 80, text: { en: 'Send {n} cards to foundations', pt: 'Mande {n} cartas para as pilhas' } },
      ],
    });
    K.meta.buildHud({});
    const hud = K.el('div', 'kit-hud'); K.ui.root.appendChild(hud);
    const bar = K.el('div', 'solbar'); K.ui.root.appendChild(bar);
    function renderBar() {
      bar.innerHTML = '';
      bar.appendChild(K.ui.btn('↶ ' + G.undos, 'sm', undo));
      bar.appendChild(K.ui.btn('💡', 'sm', doHint));
      bar.appendChild(K.ui.btn(K.t(['New', 'Nova']), 'sm', () => { K.meta.track('games', 1); K.ads.midgame().then(deal); }));
      bar.appendChild(K.ui.btn('⌂', 'sm', showMenu));
    }
    function showMenu() {
      playing = false; hud.style.display = bar.style.display = 'none';
      K.std.menu({ title: 'Cozy<span>Solitaire</span>', sub: K.t(['Wins', 'Vitórias']) + ': ' + G.wins + (G.bestT ? ' · ' + K.t('best') + ' ' + K.fmtTime(G.bestT) : ''), onPlay: deal,
        buttons: [
          K.ui.btn(G.draw3 ? K.t(['Draw 3', 'Comprar 3']) : K.t(['Draw 1', 'Comprar 1']), '', (b) => { G.draw3 = !G.draw3; K.save.mark(); b.textContent = G.draw3 ? K.t(['Draw 3', 'Comprar 3']) : K.t(['Draw 1', 'Comprar 1']); }),
          K.ui.btn('🂠 ' + K.t(['Card backs', 'Versos']), '', () => K.std.shop(K.t(['Card backs', 'Versos']), BACKS.map((b, i) => ({ id: i, name: K.t(b.n), price: b.p, gems: b.gems, html: `<div style="width:40px;height:56px;border-radius:5px;background:repeating-linear-gradient(45deg,${b.a} 0 6px,${b.b} 6px 8px);border:3px solid ${b.a}"></div>` })), { owned: G.backs, get: () => G.back, set: (i) => { G.back = i; for (const k in cache) delete cache[k]; } })),
          K.ui.btn('▭ ' + K.t(['Tables', 'Mesas']), '', () => K.std.shop(K.t(['Tables', 'Mesas']), TABLES.map((t, i) => ({ id: i, name: K.t(t.n), price: t.p, html: `<div style="width:56px;height:40px;border-radius:6px;background:${t.c}"></div>` })), { owned: G.tables, get: () => G.table, set: (i) => (G.table = i) })),
        ] });
    }

    /* ---------- render ---------- */
    let tt = 0;
    K.loop((dt) => {
      tt += dt; K.fx.update(dt); if (playing) time += dt; hintT = Math.max(0, hintT - dt);
      if (playing) hud.innerHTML = `<span class="chip">⏱ ${K.fmtTime(time)}</span><span class="chip">${K.t(['Moves', 'Jogadas'])} ${moves}</span>`;
      for (const b of bounce) { b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y + ch > H) { b.y = H - ch; b.vy *= -0.75; } b.trail.push([b.x, b.y]); if (b.trail.length > 40) b.trail.shift(); }
    }, () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const tc = TABLES[G.table].c; const gr = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H) * 0.8); gr.addColorStop(0, tc); gr.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = tc; ctx.fillRect(0, 0, W, H); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      K.draw.grain(ctx, 0.08);
      const slot = (x, y, label) => { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; K.draw.rrect(ctx, x, y, cw, ch, cw * 0.1); ctx.stroke(); if (label) { ctx.fillStyle = 'rgba(255,255,255,.2)'; suitPath(ctx, label, x + cw / 2, y + ch / 2, cw * 0.2); } };
      const sp = stockPos(); slot(sp.x, sp.y); if (!stock.length) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sp.x + cw / 2, sp.y + ch / 2, cw * 0.2, 0.5, 5.5); ctx.stroke(); }
      for (let i = 0; i < 4; i++) { const p = foundPos(i); slot(p.x, p.y); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.font = '700 ' + cw * 0.35 + 'px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A', p.x + cw / 2, p.y + ch / 2); }
      for (let i = 0; i < 7; i++) { const p = tabPos(i, 0); slot(p.x, p.y); }
      const drawCard = (c) => { ctx.fillStyle = 'rgba(0,0,0,.25)'; K.draw.rrect(ctx, c.x + 1, c.y + 3, cw, ch, cw * 0.1); ctx.fill(); ctx.drawImage(cardImg(c.up ? c : null), c.x, c.y, cw, ch); if (hint === c && hintT > 0) { ctx.strokeStyle = `rgba(255,209,102,${0.5 + Math.sin(tt * 10) * 0.4})`; ctx.lineWidth = 4; K.draw.rrect(ctx, c.x, c.y, cw, ch, cw * 0.1); ctx.stroke(); } };
      if (stock.length) { for (let k = Math.max(0, stock.length - 3); k < stock.length; k++) ctx.drawImage(cardImg(null), sp.x + (k - stock.length + 3) * 1.5, sp.y - (k - stock.length + 3) * 1.5, cw, ch); if (hint === 'stock' && hintT > 0) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4; K.draw.rrect(ctx, sp.x, sp.y, cw, ch, 8); ctx.stroke(); } }
      waste.slice(-3).forEach(drawCard);
      found.forEach((f) => f.slice(-2).forEach(drawCard));
      const dragging = drag && drag.moved ? drag.cards : [];
      tab.forEach((col) => col.forEach((c) => { if (!dragging.includes(c)) drawCard(c); }));
      dragging.forEach(drawCard);
      bounce.forEach((b) => { b.trail.forEach((p, i) => { if (i % 3 === 0) ctx.drawImage(cardImg(b.c), p[0], p[1], cw, ch); }); ctx.drawImage(cardImg(b.c), b.x, b.y, cw, ch); });
      K.fx.draw(ctx); K.fx.drawFlash(ctx, W, H);
    });
    K.fit(cv, (w, h, d) => { W = w; H = h; DPR = d; layout(); relayoutCards(); });
    K.music.set({ bpm: 70, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [65, 69, 72, 76], [62, 65, 69, 72]], pad: true, padWave: 'sine', arp: [1, 0, 0, 0, 1, 0, 0, 0], arpWave: 'triangle', bass: true });
    renderBar(); showMenu();
  }
})();

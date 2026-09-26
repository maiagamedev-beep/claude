import * as THREE from 'three';
import * as A from './assets.js';
import { World, LD, BAY, XM, COLORS } from './world.js';
import * as E from './econ.js';
import { sdk } from './sdk.js';
import { audio, sfx } from './audio.js';
import { fmt, money, time, t, lineName, mgrName, clamp, lang } from './util.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const now = () => Date.now();
const SAVE_KEY = 'tasty_factory_v1';
const N = E.LINES.length;

let S = E.newState();
let M = { sfx: true, music: true, tut: 0, goal: 0, goalBase: 0, goalRw: 0, goalFor: -1, taps: 0, ups: 0, warpAt: 0, mode: 0, played: 0 };
let world, cards = [], thumbs = [], faces = [];
let frenzyUntil = 0;
let started = false;

document.documentElement.lang = lang;
document.querySelectorAll('[data-t]').forEach((e) => (e.textContent = t(e.dataset.t)));

/* ---------------- save ---------------- */
function load() {
  const raw = sdk.get(SAVE_KEY);
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    if (d && d.s && d.s.v === 1) {
      const base = E.newState();
      S = Object.assign(base, d.s);
      S.lines = base.lines.map((l, i) => Object.assign(l, (d.s.lines || [])[i] || {}));
      M = Object.assign(M, d.m || {});
      return true;
    }
  } catch (e) { /* corrupted save: start fresh */ }
  return false;
}
let lastSave = 0;
function save() { S.t = now(); sdk.set(SAVE_KEY, JSON.stringify({ s: S, m: M })); lastSave = now(); }

/* ---------------- helpers ---------------- */
const rushOn = () => now() < S.rushUntil;
const mul = () => (rushOn() ? 2 : 1) * (now() < frenzyUntil ? 3 : 1);
const income = () => E.incomePerSec(S, mul());
const baseIncome = () => Math.max(E.incomePerSec(S, 1), manualIncome());
function manualIncome() { let v = 0; S.lines.forEach((l, i) => { if (l.lvl > 0 && !l.mgr) { const k = E.lineStats(S, i); v += k.rev / Math.max(1, k.time) * 0.3; } }); return v; }
function earn(v) { S.cash += v; S.earned += v; S.lifetime += v; }
function toast(msg, cls = '') { const d = el('div', 'toast ' + cls, msg); $('toasts').appendChild(d); setTimeout(() => d.remove(), 2600); while ($('toasts').children.length > 3) $('toasts').firstChild.remove(); }

const MODES = [1, 10, 'next', 'max'];
function buyCount(i) {
  const st = S.lines[i], m = MODES[M.mode];
  if (m === 'max') return Math.max(1, E.maxBuy(i, st.lvl, S.cash));
  if (m === 'next') return E.nextMilestone(st.lvl).at - st.lvl;
  return m;
}

/* ---------------- thumbnails rendered from the 3D models ---------------- */
function renderThumbs() {
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setSize(128, 128); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight('#ffffff', '#b0a090', 2.2));
  const dl = new THREE.DirectionalLight('#ffffff', 2); dl.position.set(2, 4, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const shot = (obj, size, camPos, look) => {
    sc.add(obj); cam.position.copy(camPos); cam.lookAt(look); r.render(sc, cam); sc.remove(obj);
    return r.domElement.toDataURL('image/png');
  };
  thumbs = E.LINES.map((L) => {
    const g = A.mergedGeo(L.product, 1); const m = new THREE.Mesh(g.geo, g.mat);
    g.geo.computeBoundingBox(); const bb = g.geo.boundingBox;
    const cy = (bb.max.y + bb.min.y) / 2;
    return shot(m, 1, new THREE.Vector3(0, cy + 1.3, 2.1), new THREE.Vector3(0, cy, 0));
  });
  const names = ['employee', 'character-female-a', 'character-male-a', 'character-female-c', 'character-male-c', 'character-female-e', 'character-male-e'];
  faces = names.map((n) => {
    const c = A.character(n); c.play('idle', 0); c.mixer.update(0.1);
    c.obj.rotation.y = 0.35;
    return shot(c.obj, 1, new THREE.Vector3(0.1, 0.62, 0.95), new THREE.Vector3(0, 0.5, 0));
  });
  r.dispose(); r.forceContextLoss && r.forceContextLoss();
}
const faceOf = (i) => faces[i % faces.length];

/* ---------------- line cards ---------------- */
function makeCards() {
  const host = $('labels');
  for (let i = 0; i < N; i++) {
    const c = el('div', 'card');
    c.innerHTML = `<div class="glowring"></div><div class="th" style="background:${COLORS[i]}"><i class="ring"></i><img alt=""><span class="lv"></span></div>
      <div class="mid"><div class="nm"></div><div class="bar"><i></i><span><em class="rv"></em><em class="tm"></em></span></div><div class="ms"><i></i></div><div class="msl"></div><div class="lk"></div></div>
      <button class="btn up"><small></small><b></b></button><button class="btn blue hire"><i class="ico"></i><span></span></button>`;
    c.querySelector('img').src = thumbs[i];
    c.querySelector('.nm').textContent = lineName(E.LINES[i].id);
    host.appendChild(c);
    const o = { c, i, up: c.querySelector('.up'), upS: c.querySelector('.up small'), upB: c.querySelector('.up b'), lv: c.querySelector('.lv'),
      bar: c.querySelector('.bar i'), th: c.querySelector('.th'), rv: c.querySelector('.rv'), tm: c.querySelector('.tm'), ms: c.querySelector('.ms i'), msl: c.querySelector('.msl'),
      lk: c.querySelector('.lk'), hire: c.querySelector('.hire'), hireS: c.querySelector('.hire span'), w: 300, h: 70, vis: true };
    holdButton(o.up, () => buyLine(i));
    o.hire.addEventListener('click', (e) => { e.stopPropagation(); hireMgr(i); });
    o.th.addEventListener('click', () => { if (S.lines[i].lvl > 0) openSheet('line', i); });
    c.querySelector('.mid').addEventListener('click', () => { if (S.lines[i].lvl > 0) openSheet('line', i); });
    c.addEventListener('pointerdown', (e) => e.stopPropagation());
    cards.push(o);
  }
}

// press-and-hold repeats purchases, speeding up
function holdButton(b, fn) {
  let timer = null, n = 0;
  const stop = () => { clearTimeout(timer); timer = null; };
  b.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); audio.unlock(); n = 0;
    if (!fn()) return;
    const rep = () => { n++; if (!fn()) return stop(); timer = setTimeout(rep, Math.max(45, 260 - n * 30)); };
    timer = setTimeout(rep, 380);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
}

function updateCards(full) {
  const portrait = world.portrait;
  const m = mul();
  for (const o of cards) {
    const i = o.i, st = S.lines[i];
    const ln = world.lines[i];
    // position: left of the bay (landscape) or over its front-left corner (portrait)
    const visible = i === 0 || S.lines[i - 1].lvl > 0 || st.lvl > 0;
    if (!visible) { if (o.vis) { o.c.style.display = 'none'; o.vis = false; } continue; }
    if (!o.vis) { o.c.style.display = ''; o.vis = true; full = true; }
    const p = portrait ? world.project(BAY.x0 + 0.1, 0, ln.z + 0.1) : world.project(BAY.x0 - 0.25, 0, ln.z + 0.35);
    if (full || !o.w) { o.w = o.c.offsetWidth; o.h = o.c.offsetHeight; }
    let x = portrait ? p.x : p.x - o.w, y = p.y - o.h / 2;
    x = clamp(x, 8, world.w - o.w - 8);
    const off = y < -o.h || y > world.h;
    o.c.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    o.c.style.visibility = off ? 'hidden' : '';
    if (off) continue;
    const k = E.lineStats(S, i, m);
    const fast = k.time < 0.3 && (st.mgr || st.run);
    if (st.lvl > 0) {
      if (fast !== o.fast) { o.fast = fast; o.bar.classList.toggle('fast', fast); }
      if (!fast) o.bar.style.transform = `scaleX(${clamp(st.p, 0, 1)})`;
      if (portrait) o.th.style.setProperty('--p', fast ? 1 : clamp(st.p, 0, 1).toFixed(3));
    }
    if (!full) continue;
    const locked = st.lvl <= 0;
    o.c.classList.toggle('locked', locked);
    if (locked) {
      const cost = E.lineCost(i, 0);
      o.lv.textContent = ''; o.lv.style.display = 'none';
      o.upS.textContent = t('build'); o.upB.textContent = money(cost);
      o.up.className = 'btn up ' + (S.cash >= cost ? 'orange' : 'off');
      o.lk.innerHTML = `<i class="ico"></i>${money(E.LINES[i].rev)} / ${time(E.LINES[i].time)}`;
      o.bar.parentNode.style.display = 'none'; o.ms.parentNode.style.display = 'none'; o.msl.style.display = 'none'; o.lk.style.display = '';
      o.hire.style.display = 'none';
    } else {
      o.bar.parentNode.style.display = ''; o.ms.parentNode.style.display = ''; o.msl.style.display = ''; o.lk.style.display = 'none';
      o.lv.textContent = `${t('lv')} ${st.lvl}`; o.lv.style.display = '';
      o.rv.textContent = money(k.rev);
      o.tm.textContent = fast ? `${money(k.rev / k.time)}/s` : (st.mgr || st.run ? time(k.time * (1 - st.p)) : time(k.time));
      const n = buyCount(i), cost = E.lineCost(i, st.lvl, n);
      o.upS.textContent = `+${n}`; o.upB.textContent = money(cost);
      o.up.className = 'btn up ' + (S.cash >= cost ? '' : 'off');
      const nm = E.nextMilestone(st.lvl), pm = E.prevMilestoneAt(st.lvl);
      o.ms.style.width = `${((st.lvl - pm) / (nm.at - pm) * 100).toFixed(1)}%`;
      o.msl.textContent = `${nm.at}: ${nm.kind === 'speed' ? t('speedX') : t('profitX')}${nm.x}`;
      if (!st.mgr && S.cash >= E.mgrCost(S, i) * 0.4) {
        const mc = E.mgrCost(S, i);
        o.hire.style.display = ''; o.hireS.textContent = `${t('hire')} ${money(mc)}`;
        o.hire.className = 'btn hire ' + (S.cash >= mc ? 'blue' : 'off');
      } else o.hire.style.display = 'none';
    }
  }
}

/* ---------------- actions ---------------- */
function buyLine(i) {
  const st = S.lines[i];
  if (st.lvl <= 0) {
    const c = E.lineCost(i, 0);
    if (S.cash < c) { sfx.deny(); return false; }
    S.cash -= c; st.lvl = 1; st.run = false; st.p = 0;
    world.setLine(i, 1, st.mgr); sfx.build(); toast(t('newLine'), 'gold'); world.puff(world.lines[i], XM, 1, 20);
    world.targetZ = world.lineZ(i) - (world.portrait ? 2 : 1); updateCards(true); save();
    return false;
  }
  const n = buyCount(i), c = E.lineCost(i, st.lvl, n);
  if (S.cash < c) { sfx.deny(); return false; }
  const before = st.lvl, minBefore = Math.min(...S.lines.map((l) => l.lvl));
  S.cash -= c; st.lvl += n; M.ups++;
  sfx.buy();
  for (const ms of E.MILESTONES) if (before < ms.at && st.lvl >= ms.at) {
    sfx.milestone(); toast(t('milestoneHit', { line: lineName(E.LINES[i].id), what: (ms.kind === 'speed' ? t('speedX') : t('profitX')) + ms.x }), 'gold');
    world.puff(world.lines[i], XM, 1.3, 24, '#ffe27a');
  }
  const minAfter = Math.min(...S.lines.map((l) => l.lvl));
  for (const a of E.ALL_MILESTONES) if (minBefore < a && minAfter >= a) toast(t('allMilestone', { n: a }), 'gold');
  world.setLine(i, st.lvl, st.mgr);
  bump(cards[i].c);
  updateCards(true);
  return MODES[M.mode] === 1;
}
function hireMgr(i) {
  const st = S.lines[i], c = E.mgrCost(S, i);
  if (st.lvl <= 0 || st.mgr) return;
  if (S.cash < c) { sfx.deny(); return; }
  S.cash -= c; st.mgr = true; st.run = true;
  world.setLine(i, st.lvl, true); sfx.hire();
  toast(t('mgrHired', { line: lineName(E.LINES[i].id) }), 'gold');
  updateCards(true); refreshSheet(); save();
}
function tapLine(i) {
  const st = S.lines[i];
  if (i < 0) return;
  if (st.lvl <= 0) { buyLine(i); return; }
  audio.unlock();
  if (!st.mgr && !st.run) { st.run = true; st.p = 0; sfx.tap(); M.taps++; }
  else { st.p += Math.min(0.12, 1 / E.lineStats(S, i).time); sfx.tap(); }
  world.puff(world.lines[i], XM, 1.2, 5, '#ffffff', 0.7);
}
function bump(e) { e.animate([{ transform: e.style.transform + ' scale(1)' }, { transform: e.style.transform + ' scale(1.04)' }, { transform: e.style.transform + ' scale(1)' }], { duration: 160 }); }

/* ---------------- floating income text ---------------- */
const floatAcc = new Array(N).fill(0), floatT = new Array(N).fill(0);
function floatText(x, y, txt, big) {
  const d = el('div', 'float' + (big ? ' big' : ''), txt);
  d.style.left = x + 'px'; d.style.top = y + 'px';
  $('floats').appendChild(d); setTimeout(() => d.remove(), 1150);
}
function coinsFly(x, y, n = 10) {
  const tgt = document.querySelector('#hud .coin').getBoundingClientRect();
  for (let k = 0; k < n; k++) {
    const c = el('div', 'coin flycoin'); document.body.appendChild(c);
    const sx = x + (Math.random() - 0.5) * 80, sy = y + (Math.random() - 0.5) * 60;
    const a = c.animate([
      { transform: `translate(${x - 13}px,${y - 13}px) scale(.4)` },
      { transform: `translate(${sx - 13}px,${sy - 13}px) scale(1)`, offset: 0.3 },
      { transform: `translate(${tgt.x + 4}px,${tgt.y + 4}px) scale(.7)` },
    ], { duration: 700 + k * 40, easing: 'cubic-bezier(.5,0,.6,1)' });
    a.onfinish = () => { c.remove(); if (k % 3 === 0) sfx.coin(1 + k * 0.02); };
  }
  setTimeout(() => { const p = document.querySelector('#hud .pill'); p.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 200 }); }, 700);
}

/* ---------------- goals ---------------- */
const GOALS = [
  { k: 'tap', n: 5 }, { k: 'lvl', i: 0, n: 5 }, { k: 'build', i: 1 }, { k: 'lvl', i: 0, n: 10 }, { k: 'mgr', i: 0 }, { k: 'lvl', i: 1, n: 10 },
  { k: 'build', i: 2 }, { k: 'mgr', i: 1 }, { k: 'lvl', i: 0, n: 25 }, { k: 'up', n: 1 }, { k: 'build', i: 3 }, { k: 'mgr', i: 2 },
  { k: 'lvl', i: 2, n: 25 }, { k: 'build', i: 4 }, { k: 'mgr', i: 3 }, { k: 'mgr', i: 4 }, { k: 'lvl', i: 1, n: 50 }, { k: 'build', i: 5 },
  { k: 'mgr', i: 5 }, { k: 'up', n: 5 }, { k: 'lvl', i: 3, n: 50 }, { k: 'build', i: 6 }, { k: 'mgr', i: 6 }, { k: 'earn', n: 1e10 },
  { k: 'build', i: 7 }, { k: 'mgr', i: 7 }, { k: 'lvl', i: 0, n: 100 }, { k: 'build', i: 8 }, { k: 'mgr', i: 8 }, { k: 'build', i: 9 },
  { k: 'mgr', i: 9 }, { k: 'sell' },
];
function goalAt(g) {
  if (g < GOALS.length) return GOALS[g];
  const k = g - GOALS.length;
  const lv = [25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000][Math.floor(k / 2)] || 1000 + (k - 30) * 50;
  return k % 2 === 0 ? { k: 'all', n: lv } : { k: 'earn', n: Math.pow(10, 12 + k) };
}
function goalProgress(G) {
  switch (G.k) {
    case 'tap': return [M.taps - M.goalBase, G.n];
    case 'lvl': return [S.lines[G.i].lvl, G.n];
    case 'build': return [S.lines[G.i].lvl > 0 ? 1 : 0, 1];
    case 'mgr': return [S.lines[G.i].mgr ? 1 : 0, 1];
    case 'up': return [Object.keys(S.ups).length, G.n];
    case 'earn': return [S.earned, G.n];
    case 'sell': return [S.resets > (M.goalResets || 0) ? 1 : 0, 1];
    case 'all': return [Math.min(...S.lines.map((l) => l.lvl)), G.n];
  }
  return [0, 1];
}
function goalText(G) {
  const ln = G.i != null ? lineName(E.LINES[G.i].id) : '';
  switch (G.k) {
    case 'tap': return t('g_tap', { n: G.n });
    case 'lvl': return t('g_lvl', { line: ln, n: G.n });
    case 'build': return t('g_build', { line: ln });
    case 'mgr': return t('g_mgr', { line: ln });
    case 'up': return G.n === 1 ? t('g_up1') : t('g_up', { n: G.n });
    case 'earn': return t('g_earn', { n: money(G.n) });
    case 'sell': return t('g_sell');
    case 'all': return t('g_lvl', { line: lang === 'pt' ? 'todas as linhas' : 'every line', n: G.n });
  }
  return '';
}
function goalReward() {
  const base = [20, 40, 150, 250, 600, 1500, 4000, 9000, 2e4, 5e4][M.goal] || 0;
  return Math.max(base, baseIncome() * 60);
}
function updateGoal() {
  let G = goalAt(M.goal);
  if (!M.goalRw || M.goalFor !== M.goal) { M.goalRw = goalReward(); M.goalFor = M.goal; M.goalResets = S.resets; }
  const [v, n] = goalProgress(G);
  const done = v >= n;
  const box = $('goal');
  const key = M.goal + ':' + done;
  if (box._k !== key) {
    box._k = key;
    box.classList.add('on'); box.classList.toggle('done', done);
    box.innerHTML = `<div class="gt"><i class="ico"></i>${t('goal')} ${M.goal + 1}</div><div class="gd"></div><div class="gb"><i></i></div>
      <div class="gr"><span class="gp"></span><span>${t('reward')}: <b>${money(M.goalRw)}</b></span></div>${done ? `<button class="btn gold" id="goalClaim">${t('collect')}</button>` : ''}`;
    box.querySelector('.gd').textContent = goalText(G);
    if (done) $('goalClaim').addEventListener('click', (e) => {
      if (box._claimed === M.goal) return; box._claimed = M.goal;
      earn(M.goalRw); const b = e.currentTarget.getBoundingClientRect();
      coinsFly(b.x + b.width / 2, b.y + b.height / 2, 12); sfx.cash();
      M.goal++; M.goalBase = M.taps; M.goalRw = 0; box._k = null; updateGoal(); save();
    });
  }
  box.querySelector('.gb i').style.width = `${Math.min(100, v / n * 100)}%`;
  const pr = G.k === 'earn' ? `${money(Math.min(v, n))} / ${money(n)}` : `${fmt(Math.min(v, n))} / ${fmt(n)}`;
  const gp = box.querySelector('.gp'); if (gp.textContent !== pr) gp.textContent = pr;
}

/* ---------------- tutorial pointer ---------------- */
let tapHint = null;
function updateTutorial() {
  // step 0: tap the cookie line; 1: upgrade; 2: build donuts; 3: hire manager
  const st0 = S.lines[0];
  if (M.tut === 0 && M.taps >= 3) M.tut = 1;
  if (M.tut === 1 && st0.lvl >= 3) M.tut = 2;
  if (M.tut === 2 && S.lines[1].lvl > 0) M.tut = 3;
  if (M.tut === 3 && st0.mgr) M.tut = 4;
  cards.forEach((o) => o.c.classList.remove('hint'));
  let hintTxt = null, hx = 0, hy = 0;
  // "tap me" bubble over any idle manual line
  const idle = S.lines.findIndex((l) => l.lvl > 0 && !l.mgr && !l.run);
  if (idle >= 0 && (M.tut < 4 || idle > 0 || !S.lines[0].mgr)) {
    const p = world.project(XM + 1.2, 2.1, world.lineZ(idle)); hintTxt = t('tapToBake'); hx = p.x; hy = p.y;
  }
  if (M.tut === 1 && S.cash >= E.lineCost(0, st0.lvl)) cards[0].c.classList.add('hint');
  if (M.tut === 2 && S.cash >= E.lineCost(1, 0)) cards[1].c.classList.add('hint');
  if (M.tut === 3 && S.cash >= E.mgrCost(S, 0)) cards[0].c.classList.add('hint');
  if (!tapHint) { tapHint = el('div', 'tapme', '<div></div>'); $('labels').appendChild(tapHint); }
  if (hintTxt && !sheetOpen) { tapHint.style.display = ''; tapHint.firstChild.textContent = hintTxt; tapHint.style.transform = `translate(${hx}px,${hy}px) translate(-50%,-50%)`; }
  else tapHint.style.display = 'none';
}

/* ---------------- golden crate ---------------- */
let golden = null, goldenNext = now() + 120000;
function updateGolden(dt) {
  if (!golden) {
    if (M.tut < 4 || now() < goldenNext || sheetOpen) return;
    const open = S.lines.map((l, i) => (l.lvl > 0 ? i : -1)).filter((i) => i >= 0);
    const i = open[Math.floor(Math.random() * open.length)];
    const box = A.prop('box-small');
    box.traverse((o) => { if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ color: '#ffc83a', emissive: '#7a4a00', emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.3 }); } });
    box.scale.setScalar(1.3);
    world.scene.add(box);
    golden = { box, i, t: 0, x: -2 + Math.random() * 5 };
    $('golden').classList.add('on');
    sfx.golden();
  }
  const g = golden; g.t += dt;
  const z = world.lineZ(g.i) + 0.9;
  const y = 1.6 + Math.sin(g.t * 3) * 0.15 + (g.t > 12 ? (g.t - 12) * 6 : 0);
  g.box.position.set(g.x, y, z); g.box.rotation.y += dt * 1.5; g.box.rotation.z = Math.sin(g.t * 2) * 0.2;
  const p = world.project(g.x, y + 0.3, z);
  $('golden').style.transform = `translate(${p.x}px,${p.y}px)`;
  if (Math.random() < dt * 12) world.fx.push({ p: new THREE.Vector3(g.x + (Math.random() - 0.5), y + Math.random() * 0.8, z + (Math.random() - 0.5)), v: new THREE.Vector3(0, 0.6, 0), life: 0.7, t: 0, s: 0.08, color: '#fff2a8' });
  if (g.t > 13.5) removeGolden();
}
function removeGolden() { if (!golden) return; world.scene.remove(golden.box); golden = null; $('golden').classList.remove('on'); goldenNext = now() + (100 + Math.random() * 110) * 1000; }
function claimGolden(e) {
  if (!golden) return;
  audio.unlock();
  const r = e.target.getBoundingClientRect();
  world.puff(world.lines[golden.i], golden.x, 1.6, 30, '#ffd84a');
  if (Math.random() < 0.55 || baseIncome() <= 0) {
    const v = Math.max(50, baseIncome() * 60 + S.cash * 0.05);
    earn(v); coinsFly(r.x + r.width / 2, r.y + r.height / 2, 14); sfx.cash(); toast(`${t('golden')} +${money(v)}`, 'gold');
  } else { frenzyUntil = now() + 20000; sfx.golden(); toast(t('frenzy'), 'gold'); }
  removeGolden();
}

/* ---------------- sheet panels ---------------- */
let sheetOpen = null;
let sheetArg = 0;
function openSheet(kind, arg = 0) {
  audio.unlock(); sfx.open();
  sheetOpen = kind; sheetArg = arg;
  $('sheet').classList.add('on'); $('shade').classList.add('on');
  $('shTitle').textContent = kind === 'line' ? lineName(E.LINES[arg].id) : { mgr: t('managers'), up: t('upgrades'), boost: t('boosts'), star: t('stars'), set: t('settings') }[kind];
  $('shBody').scrollTop = 0;
  refreshSheet(true);
}
function closeSheet() { if (!sheetOpen) return; sfx.close(); sheetOpen = null; $('sheet').classList.remove('on'); $('shade').classList.remove('on'); }
let sheetKey = '';
function refreshSheet(force) {
  if (!sheetOpen) return;
  const body = $('shBody');
  const build = { mgr: sheetMgr, up: sheetUp, boost: sheetBoost, star: sheetStar, set: sheetSet, line: sheetLine }[sheetOpen];
  const html = build();
  if (!force && html === sheetKey) return;
  sheetKey = html;
  const tpl = document.createElement('div'); tpl.innerHTML = html;
  if (force) { body.replaceChildren(...tpl.childNodes); } else morph(body, tpl);
}
// Patch the live panel in place so buttons under the pointer are never replaced mid-click.
function morph(a, b) {
  const ac = a.childNodes, bc = b.childNodes;
  if (ac.length !== bc.length) { a.replaceChildren(...[...bc]); return; }
  for (let k = 0; k < bc.length; k++) {
    const x = ac[k], y = bc[k];
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y.cloneNode(true), x); continue; }
    if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x.nodeType !== 1) continue;
    for (const at of y.attributes) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    morph(x, y);
  }
}
function sheetLine() {
  const i = sheetArg, st = S.lines[i], k = E.lineStats(S, i, mul());
  let h = `<div class="row"><div class="pic" style="background:${COLORS[i]};width:72px;height:72px"><img src="${thumbs[i]}" alt="" style="width:64px;height:64px"></div><div class="tx"><b>${t('lv')} ${st.lvl}</b><span>${money(k.rev)} · ${time(k.time)}</span><span>${money(k.rev / k.time)}${t('perSec')}</span></div></div>`;
  const opts = [1, 10, E.nextMilestone(st.lvl).at - st.lvl, Math.max(1, E.maxBuy(i, st.lvl, S.cash))];
  h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">` + opts.map((n, j) => {
    const c = E.lineCost(i, st.lvl, n);
    return `<button class="btn ${S.cash >= c ? '' : 'off'}" data-act="lv:${i}:${n}" style="flex-direction:column;gap:0;padding:8px 6px"><small>${[`+1`, `+10`, `${t('next')} (+${n})`, `${t('max')} (+${n})`][j]}</small>${money(c)}</button>`;
  }).join('') + `</div>`;
  const mc = E.mgrCost(S, i);
  h += `<div class="row ${st.mgr ? 'done' : ''}"><div class="pic" style="background:${COLORS[i]}"><img src="${faceOf(i)}" alt=""></div><div class="tx"><b>${mgrName(i)}</b><span>${t('mgrDesc')}</span></div>${st.mgr ? `<button class="btn">${t('hired')}</button>` : `<button class="btn ${S.cash >= mc ? 'blue' : 'off'}" data-act="mgr:${i}">${money(mc)}</button>`}</div>`;
  h += `<div class="h3">${t('milestone')}</div>`;
  const list = E.MILESTONES.filter((m) => m.at > st.lvl).slice(0, 5);
  for (const m of list) h += `<div class="toggle" style="padding:9px 14px"><span>${t('lv')} ${m.at}</span><b style="font-family:var(--display);font-weight:400;color:${m.kind === 'speed' ? 'var(--blue-d)' : 'var(--purple-d)'}">${m.kind === 'speed' ? t('speedX') : t('profitX')}${m.x}</b></div>`;
  return h;
}
function sheetMgr() {
  let h = `<p class="sh-note">${t('mgrDesc')}</p>`;
  S.lines.forEach((st, i) => {
    const c = E.mgrCost(S, i), nm = lineName(E.LINES[i].id);
    const btn = st.mgr ? `<button class="btn">${t('hired')}</button>` : st.lvl <= 0 ? `<button class="btn off">${money(c)}</button>` : `<button class="btn ${S.cash >= c ? 'blue' : 'off'}" data-act="mgr:${i}">${money(c)}</button>`;
    h += `<div class="row ${st.mgr ? 'done' : ''}"><div class="pic" style="background:${COLORS[i]}"><img src="${faceOf(i)}" alt=""></div><div class="tx"><b>${mgrName(i)}</b><span>${nm}${st.lvl <= 0 ? ' · ' + t('lineLocked') : ''}</span></div>${btn}</div>`;
  });
  return h;
}
function sheetUp() {
  const left = E.UPGRADES.filter((u) => !S.ups[u.key]);
  const nb = E.UPGRADES.length - left.length;
  let h = `<p class="sh-note">${nb} ${t('bought')} · ${E.UPGRADES.length - nb} ${lang === 'pt' ? 'restantes' : 'left'}</p>`;
  if (!left.length) h += `<p class="p">${t('noUpgrades')}</p>`;
  left.slice(0, 12).forEach((u) => {
    const all = u.line < 0;
    const pic = all ? `<div class="pic" style="background:linear-gradient(135deg,#ffe28a,#ffb3c8)"><i class="ico" style="--i:url(assets/icons/star.png);width:34px;height:34px;color:#fff"></i></div>` : `<div class="pic" style="background:${COLORS[u.line]}"><img src="${thumbs[u.line]}" alt="" style="width:48px;height:48px"></div>`;
    const title = all ? `${t('allProfitX')}${u.x}` : `${lineName(E.LINES[u.line].id)} ${t('profitX')}${u.x}`;
    const cur = all ? E.incomePerSec(S, 1) : (S.lines[u.line].lvl > 0 ? (() => { const k = E.lineStats(S, u.line); return k.rev / k.time; })() : 0);
    const eff = !all && S.lines[u.line].lvl <= 0 ? t('lineLocked') : `${money(cur)}${t('perSec')} → ${money(cur * u.x)}${t('perSec')}`;
    h += `<div class="row">${pic}<div class="tx"><b>${title}</b><span>${eff}</span></div><button class="btn ${S.cash >= u.cost ? '' : 'off'}" data-act="up:${u.key}">${money(u.cost)}</button></div>`;
  });
  return h;
}
function sheetBoost() {
  const rm = E.rushMinutes(S);
  const left = Math.max(0, S.rushUntil - now());
  const full = left > 4 * 3600e3 - rm * 60e3;
  const warpLeft = Math.max(0, M.warpAt - now());
  let h = `<div class="row"><div class="pic" style="background:linear-gradient(135deg,#ffd27a,#ff9aa8)"><i class="ico" style="--i:url(assets/icons/fastForward.png);width:34px;height:34px;color:#fff"></i></div><div class="tx"><b>${t('rushTitle')}</b><span>${t('rushDesc', { m: Math.round(rm) })}${left > 0 ? ' · ' + time(left / 1000) : ''}</span></div><button class="btn orange ${full ? 'off' : ''}" data-act="rush"><i class="ico ad"></i>${t('watch')}</button></div>`;
  h += `<div class="row"><div class="pic" style="background:linear-gradient(135deg,#9fd8ff,#b9a8ff)"><i class="ico" style="--i:url(assets/icons/return.png);width:32px;height:32px;color:#fff"></i></div><div class="tx"><b>${t('warpTitle')}</b><span>${t('warpDesc')} ${money(Math.max(100, baseIncome() * 1800))}</span></div>${warpLeft > 0 ? `<button class="btn off">${time(warpLeft / 1000)}</button>` : `<button class="btn orange" data-act="warp"><i class="ico ad"></i>${t('watch')}</button>`}</div>`;
  const ci = crateLine(), cn = crateLevels(ci), crLeft = Math.max(0, (M.crateAt || 0) - now());
  if (ci >= 0) h += `<div class="row"><div class="pic" style="background:${COLORS[ci]}"><img src="${thumbs[ci]}" alt="" style="width:48px;height:48px"></div><div class="tx"><b>${t('crateTitle')}</b><span>${t('crateDesc', { n: cn, line: lineName(E.LINES[ci].id) })}</span></div>${crLeft > 0 ? `<button class="btn off">${time(crLeft / 1000)}</button>` : `<button class="btn orange" data-act="crate"><i class="ico ad"></i>${t('watch')}</button>`}</div>`;
  return h;
}
// the newest built line benefits most from free levels
function crateLine() { let r = -1; S.lines.forEach((l, i) => { if (l.lvl > 0) r = i; }); return r; }
function crateLevels(i) { return i < 0 ? 0 : Math.max(5, Math.min(25, Math.round(S.lines[i].lvl * 0.2))); }
function sheetStar() {
  const have = S.stars - S.starsSpent, pend = E.pendingStars(S);
  let h = `<div class="bigstat"><div><small>${t('starsOwned')}</small><b>${fmt(have)}</b></div><div><small>${t('bonus')}</small><b>+${fmt(Math.round((E.globalMul(S) - 1) * 100))}%</b></div></div>`;
  h += `<div class="sellbox"><b style="font-family:var(--display);font-size:20px;font-weight:400">${t('sellTitle')}</b><p class="p" style="margin:6px 0 4px;color:var(--ink2)">${t('sellBody')}</p>
    <div style="text-align:center;font-size:12px;color:var(--ink2);text-transform:uppercase;letter-spacing:1px">${t('claim')}</div><div class="claim"><i class="ico"></i>+${fmt(pend)}</div>
    <button class="btn purple ${pend > 0 ? '' : 'off'}" data-act="sell">${pend > 0 ? t('sellBtn') : t('sellNeed')}</button>
    <div style="text-align:center;font-size:12px;color:var(--ink2);margin-top:10px">${t('nextStar', { n: money(1e13 * Math.pow((S.stars + pend + 1) / 50, 2)) })}</div></div>`;
  h += `<div class="h3">${t('perks')}</div>`;
  for (const p of E.PERKS) {
    const lv = S.perks[p.key] || 0, c = E.perkCost(p, lv), maxed = lv >= p.max;
    h += `<div class="row"><div class="pic" style="background:linear-gradient(135deg,#ffe9a8,#ffc6d9)"><i class="ico" style="--i:url(assets/icons/star.png);width:30px;height:30px;color:#fff"></i></div><div class="tx"><b>${t('perk_' + p.key)} ${lv ? `<small style="font-family:var(--body);font-size:12px;color:var(--ink2)">${lv}/${p.max}</small>` : ''}</b><span>${t('perk_' + p.key + '_d')}</span></div>${maxed ? `<button class="btn">MAX</button>` : `<button class="btn purple ${have >= c ? '' : 'off'}" data-act="perk:${p.key}">★ ${fmt(c)}</button>`}</div>`;
  }
  return h;
}
let resetArm = 0;
function sheetSet() {
  return `<div class="toggle"><span>${t('sound')}</span><button class="btn ${M.sfx ? '' : 'off'}" data-act="sfx">${M.sfx ? t('on') : t('off')}</button></div>
  <div class="toggle"><span>${t('music')}</span><button class="btn ${M.music ? '' : 'off'}" data-act="music">${M.music ? t('on') : t('off')}</button></div>
  <div class="h3">${t('howTo')}</div><p class="p">${t('howToBody')}</p>
  <p class="small">${t('credits')}</p>
  <div class="toggle"><span>${resetArm > now() ? t('resetSure') : t('reset')}</span><button class="btn ${resetArm > now() ? 'orange' : 'off'}" data-act="reset" style="min-width:48px">✕</button></div>`;
}

async function act(a, b) {
  const [k, v] = a.split(':');
  if (k === 'mgr') hireMgr(+v);
  else if (k === 'lv') {
    const [, li, n] = a.split(':').map(Number); const st = S.lines[li]; const c = E.lineCost(li, st.lvl, n);
    if (S.cash < c) { sfx.deny(); return; }
    const saved = M.mode; M.mode = 0; const before = st.lvl;
    // reuse buyLine's milestone handling by buying one level at a time for small n, in bulk otherwise
    S.cash -= c; st.lvl += n; M.ups++; sfx.buy();
    for (const ms of E.MILESTONES) if (before < ms.at && st.lvl >= ms.at) { sfx.milestone(); toast(t('milestoneHit', { line: lineName(E.LINES[li].id), what: (ms.kind === 'speed' ? t('speedX') : t('profitX')) + ms.x }), 'gold'); world.puff(world.lines[li], XM, 1.3, 24, '#ffe27a'); }
    world.setLine(li, st.lvl, st.mgr); M.mode = saved;
  }
  else if (k === 'up') {
    const u = E.UPGRADES.find((x) => x.key === v);
    if (!u || S.ups[v]) return;
    if (S.cash < u.cost) { sfx.deny(); return; }
    S.cash -= u.cost; S.ups[v] = 1; sfx.milestone(); toast((u.line < 0 ? t('allProfitX') : lineName(E.LINES[u.line].id) + ' ' + t('profitX')) + u.x, 'gold');
    if (u.line >= 0) world.puff(world.lines[u.line], XM, 1.3, 16, '#bfe9ff'); else world.lines.forEach((l) => !l.locked && world.puff(l, XM, 1.3, 8, '#bfe9ff'));
    save();
  } else if (k === 'rush') {
    if (b.classList.contains('off')) return;
    const r = await sdk.rewarded();
    if (r === true) { S.rushUntil = Math.min(now() + 4 * 3600e3, Math.max(now(), S.rushUntil) + E.rushMinutes(S) * 60e3); sfx.golden(); toast(t('rushTitle') + '! ×2', 'gold'); save(); }
    else toast(r === 'dismissed' ? t('adSkip') : t('adFail'));
  } else if (k === 'warp') {
    const r = await sdk.rewarded();
    if (r === true) { const v = Math.max(100, baseIncome() * 1800); earn(v); M.warpAt = now() + 15 * 60e3; const bb = b.getBoundingClientRect(); coinsFly(bb.x + bb.width / 2, bb.y, 14); sfx.cash(); toast(`+${money(v)}`, 'gold'); save(); }
    else toast(r === 'dismissed' ? t('adSkip') : t('adFail'));
  } else if (k === 'crate') {
    const i = crateLine(); if (i < 0) return;
    const r = await sdk.rewarded();
    if (r === true) {
      const st = S.lines[i], n = crateLevels(i), before = st.lvl; st.lvl += n; M.crateAt = now() + 20 * 60e3;
      for (const ms of E.MILESTONES) if (before < ms.at && st.lvl >= ms.at) toast(t('milestoneHit', { line: lineName(E.LINES[i].id), what: (ms.kind === 'speed' ? t('speedX') : t('profitX')) + ms.x }), 'gold');
      world.setLine(i, st.lvl, st.mgr); world.puff(world.lines[i], XM, 1.4, 26, '#ffe27a'); sfx.milestone(); toast(`${lineName(E.LINES[i].id)} +${n} ${t('lv')}`, 'gold'); save();
    } else toast(r === 'dismissed' ? t('adSkip') : t('adFail'));
  } else if (k === 'sell') {
    const pend = E.pendingStars(S); if (pend <= 0) return;
    closeSheet(); sell(pend);
    return;
  } else if (k === 'perk') {
    const p = E.PERKS.find((x) => x.key === v); const lv = S.perks[v] || 0; const c = E.perkCost(p, lv);
    if (lv >= p.max || S.stars - S.starsSpent < c) { sfx.deny(); return; }
    S.starsSpent += c; S.perks[v] = lv + 1; sfx.hire(); save();
  } else if (k === 'sfx') { M.sfx = !M.sfx; audio.setSfx(M.sfx); save(); }
  else if (k === 'music') { M.music = !M.music; audio.setMusic(M.music); save(); }
  else if (k === 'reset') {
    if (resetArm > now()) { sdk.remove(SAVE_KEY); S = E.newState(); M = Object.assign(M, { tut: 0, goal: 0, goalBase: 0, taps: 0, ups: 0, warpAt: 0 }); rebuildWorld(); closeSheet(); save(); return; }
    resetArm = now() + 3000; setTimeout(() => refreshSheet(true), 3050);
  }
  refreshSheet(true); updateCards(true);
}

async function sell(pend) {
  sdk.happy();
  save();
  const keepM = { sfx: M.sfx, music: M.music };
  S = E.prestige(S);
  // a new factory starts the build-up goals again (skipping the first tutorial ones)
  M.goal = 2; M.goalRw = 0; M.goalFor = -1; M.goalBase = M.taps; Object.assign(M, keepM);
  rebuildWorld();
  toast(t('soldOut', { n: fmt(pend) }), 'gold'); sfx.milestone();
  save();
  // natural break: a new factory is opening
  await sdk.midgame();
}

function rebuildWorld() {
  S.lines.forEach((st, i) => { const ln = world.lines[i]; if (ln.mgr) { ln.g.remove(ln.mgr.obj); ln.mgr = null; } ln.prodItems.length = 0; ln.onShip = 0; ln.rawItems.length = 0; world.setLine(i, st.lvl, st.mgr); });
  world.targetZ = 0; updateCards(true);
}

/* ---------------- offline earnings ---------------- */
function offlineCheck(sinceMs) {
  const sec = Math.min(sinceMs / 1000, E.offlineCapH(S) * 3600);
  if (sec < 60) return;
  const v = E.incomePerSec(S, 1) * sec;
  if (v <= 0) return;
  const m = el('div', 'modal');
  m.innerHTML = `<div class="box"><h2>${t('welcome')}</h2><p>${t('awayFor', { t: time(sec) })}</p><div class="amt"><div class="coin"></div>${money(v)}</div>
    <div class="btns"><button class="btn orange" id="offX2"><i class="ico ad"></i>${t('collectX2')}</button><button class="btn" id="offOk">${t('collect')}</button></div></div>`;
  $('app').appendChild(m);
  const done = (x, btn) => { earn(v * x); const r = btn.getBoundingClientRect(); coinsFly(r.x + r.width / 2, r.y, 16); sfx.cash(); m.remove(); save(); };
  $('offOk').onclick = (e) => { audio.unlock(); done(1, e.currentTarget); };
  $('offX2').onclick = async (e) => {
    audio.unlock(); const btn = e.currentTarget;
    const r = await sdk.rewarded();
    if (r === true) done(2, btn); else toast(r === 'dismissed' ? t('adSkip') : t('adFail'));
  };
}

/* ---------------- input on the 3D view ---------------- */
function setupInput() {
  const cv = $('c');
  let down = null, lastY = 0, lastT = 0, moved = false;
  cv.addEventListener('pointerdown', (e) => {
    audio.unlock();
    down = { x: e.clientX, y: e.clientY, z: world.targetZ }; lastY = e.clientY; lastT = performance.now(); moved = false;
    world.dragging = true; world.vel = 0; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dy = e.clientY - down.y;
    if (Math.abs(dy) > 8 || Math.abs(e.clientX - down.x) > 8) moved = true;
    if (!moved) return;
    const k = worldPerPx();
    world.targetZ = down.z - dy * k;
    const tt = performance.now(), dt = Math.max(1, tt - lastT);
    world.vel = -(e.clientY - lastY) * k / dt * 1000 * 0.9; lastY = e.clientY; lastT = tt;
  });
  const up = (e) => {
    if (!down) return;
    world.dragging = false;
    if (!moved) { world.vel = 0; tapLine(world.pick(e.clientX, e.clientY)); }
    else if (performance.now() - lastT > 80) world.vel = 0;
    down = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  window.addEventListener('wheel', (e) => { if (sheetOpen) return; world.targetZ += e.deltaY * worldPerPx() * 0.8; }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 's') world.targetZ += LD;
    if (e.key === 'ArrowUp' || e.key === 'w') world.targetZ -= LD;
    if (e.key === 'Escape') closeSheet();
  });
}
function worldPerPx() { const a = world.project(0, 0, world.camZ), b = world.project(0, 0, world.camZ + 1); return 1 / Math.max(1, Math.abs(b.y - a.y)); }

/* ---------------- HUD ---------------- */
let shownCash = 0;
function updateHud(dt) {
  shownCash = shownCash + (S.cash - shownCash) * Math.min(1, dt * 12);
  if (Math.abs(S.cash - shownCash) < Math.max(1, S.cash * 0.001)) shownCash = S.cash;
  $('cash').textContent = money(shownCash);
}
function updateHudSlow() {
  $('inc').textContent = `${money(income() + manualIncome() * (M.tut < 4 ? 1 : 0))}${t('perSec')}`;
  const have = S.stars - S.starsSpent;
  $('starPill').style.display = S.lifetime > 1e11 || S.stars > 0 ? '' : 'none';
  $('stars').textContent = fmt(have); $('starPct').textContent = `+${fmt(Math.round((E.globalMul(S) - 1) * 100))}%`;
  const left = S.rushUntil - now();
  $('rushPill').classList.toggle('on', left > 0 || now() < frenzyUntil);
  $('rushT').textContent = now() < frenzyUntil ? `×3 ${time((frenzyUntil - now()) / 1000)}` : `×2 ${time(left / 1000)}`;
  // tab badges
  const mgrN = S.lines.filter((l, i) => l.lvl > 0 && !l.mgr && S.cash >= E.mgrCost(S, i)).length;
  const upN = E.UPGRADES.filter((u) => !S.ups[u.key] && S.cash >= u.cost).length;
  const pend = E.pendingStars(S);
  badge('mgr', mgrN); badge('up', upN); badge('star', pend >= Math.max(10, (S.stars - S.starsSpent) * 0.5) ? '!' : 0);
  badge('boost', S.rushUntil < now() && M.tut >= 4 ? '!' : 0);
  const bm = MODES[M.mode]; $('btnBuy').lastChild.textContent = bm === 'max' ? t('max') : bm === 'next' ? t('next') : `×${bm}`;
}
function badge(tab, n) { const d = document.querySelector(`.tab[data-tab="${tab}"] .dot`); const on = !!n; if (d.classList.contains('on') !== on) d.classList.toggle('on', on); if (on && d.textContent !== String(n)) d.textContent = n; }

/* ---------------- main loop ---------------- */
function step(dt, render) {
  const m = mul();
  const vis = [];
  for (let i = 0; i < N; i++) {
    const st = S.lines[i];
    if (st.lvl <= 0) { vis.push({ running: false, rate: 0 }); continue; }
    const k = E.lineStats(S, i, m);
    const running = st.mgr || st.run;
    if (running) {
      st.p += dt / k.time;
      if (st.p >= 1) {
        const n = Math.floor(st.p);
        const v = k.rev * (st.mgr ? n : 1);
        earn(v);
        st.p = st.mgr ? st.p - n : 0;
        if (!st.mgr) st.run = false;
        world.cycle(i, 1 / k.time);
        floatAcc[i] += v;
      }
    }
    // floating "+$" over the machine, at most ~1.5 per second per line
    floatT[i] += dt;
    if (!render) floatAcc[i] = 0;
    if (floatAcc[i] > 0 && floatT[i] > (k.time < 0.7 ? 0.9 : 0)) {
      const p = world.project(XM, 1.9, world.lineZ(i));
      if (p.y > 40 && p.y < world.h - 40) floatText(p.x, p.y, '+' + money(floatAcc[i]), floatAcc[i] > S.cash * 0.2 && S.cash > 100);
      floatAcc[i] = 0; floatT[i] = 0;
    }
    vis.push({ running, rate: 1 / k.time });
  }
  world.update(dt, vis, render);
}

let last = performance.now(), slowT = 0, uiT = 0, hiddenAt = 0;
function tick(tNow) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.1, (tNow - last) / 1000); last = tNow;
  if (sdk.paused || !started) { if (!started && world) { world.update(dt, S.lines.map((l) => ({ running: l.mgr, rate: 1 }))); updateCards(true); } return; }
  step(dt, true);
  updateGolden(dt);
  updateCards(false);
  updateHud(dt);
  uiT += dt; slowT += dt;
  if (uiT > 0.15) { uiT = 0; updateCards(true); updateTutorial(); updateGoal(); }
  if (slowT > 0.5) { slowT = 0; updateHudSlow(); refreshSheet(false); }
  if (now() - lastSave > 5000) save();
}

/* ---------------- boot ---------------- */
async function boot() {
  sdk.loadingStart();
  $('loadT').textContent = t('loading');
  await sdk.init();
  const loaded = load();
  audio.setSfx(M.sfx); audio.setMusic(M.music);
  world = new World($('c'));
  const fit = () => { world.resize(window.innerWidth, window.innerHeight); document.body.classList.toggle('portrait', world.portrait && window.innerWidth < 760); if (cards.length) { cards.forEach((o) => (o.w = 0)); updateCards(true); } };
  await A.loadAll((p) => { $('load').firstChild.style.width = `${Math.round(p * 100)}%`; });
  world.build(N);
  renderThumbs();
  makeCards();
  S.lines.forEach((st, i) => world.setLine(i, st.lvl, st.mgr));
  fit(); window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  setupInput();
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => (sheetOpen === b.dataset.tab ? closeSheet() : openSheet(b.dataset.tab))));
  $('btnSet').onclick = () => (sheetOpen === 'set' ? closeSheet() : openSheet('set'));
  $('starPill').onclick = () => openSheet('star');
  $('shClose').onclick = closeSheet; $('shade').onclick = closeSheet;
  $('shBody').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act, b); });
  $('btnBuy').onclick = () => { audio.unlock(); M.mode = (M.mode + 1) % MODES.length; sfx.click(); updateHudSlow(); updateCards(true); };
  $('golden').addEventListener('pointerdown', (e) => { e.stopPropagation(); claimGolden(e); });
  sdk.onPause((p) => {
    audio.setSuspended(p);
    if (p) { hiddenAt = now(); save(); }
    else if (started) { const away = now() - hiddenAt; last = performance.now(); if (away > 60000) offlineCheck(away); }
  });
  window.addEventListener('pagehide', save);
  sdk.loadingStop();
  requestAnimationFrame(tick);
  $('load').classList.add('hidden'); $('loadT').classList.add('hidden');
  const play = $('btnPlay'); play.textContent = t('play'); play.classList.remove('hidden');
  if (!loaded) { const h = $('howto'); h.textContent = t('howToBody'); h.classList.remove('hidden'); }
  play.onclick = () => {
    audio.unlock(); sfx.click();
    $('title').classList.add('hidden');
    started = true; last = performance.now();
    sdk.start();
    if (loaded) offlineCheck(now() - S.t);
    M.played++;
    updateHudSlow(); updateGoal(); updateCards(true);
  };
  window.TF = { S: () => S, M: () => M, world, earn, save, advance: (sec) => { for (let k = 0; k < sec * 20; k++) { step(0.05, false); updateGolden(0.05); } updateCards(true); updateGoal(); updateTutorial(); updateHudSlow(); } };
}
boot();

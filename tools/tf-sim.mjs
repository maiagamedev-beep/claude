// Pacing simulation for Tasty Factory: a greedy "good player" buys whatever pays back fastest.
// node tools/tf-sim.mjs [minutes] [prestigeAtMinutes...]
import * as E from '../src/tasty-factory/econ.js';

const fmt = (n) => { if (n < 1e3) return n.toFixed(0); const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc']; let i = -1; while (n >= 1e3 && i < u.length - 1) { n /= 1e3; i++; } return n.toFixed(2) + u[i]; };
const mins = +process.argv[2] || 120;
const resets = process.argv.slice(3).map(Number);

let s = E.newState();
let log = [];
const tapDelay = 0.6; // seconds a player takes to restart an unmanaged line
const waits = s.lines.map(() => 0);
const dt = 0.1;
let T = 0, runStart = 0;
const events = new Set();
const note = (k, msg) => { if (!events.has(k)) { events.add(k); log.push(`${(T / 60).toFixed(1).padStart(6)}m  ${msg}`); } };

function income(st) { let t = 0; st.lines.forEach((l, i) => { if (l.lvl > 0) { const k = E.lineStats(st, i); t += k.rev / k.time * (l.mgr ? 1 : 0.55); } }); return t; }
function clone(x) { return JSON.parse(JSON.stringify(x)); }

function bestBuy() {
  const base = income(s) + 1e-9;
  let best = null;
  const consider = (cost, apply, label) => {
    if (!isFinite(cost)) return;
    const c = clone(s); apply(c); const gain = income(c) - base; if (gain <= 0) return;
    const score = cost / gain + Math.max(0, cost - s.cash) / base;
    if (!best || score < best.score) best = { score, cost, apply, label };
  };
  s.lines.forEach((l, i) => {
    if (l.lvl === 0) { consider(E.lineCost(i, 0), c => c.lines[i].lvl = 1, `unlock ${E.LINES[i].id}`); return; }
    consider(E.lineCost(i, l.lvl), c => c.lines[i].lvl++, `lvl ${E.LINES[i].id}`);
    const nm = E.nextMilestone(l.lvl); const n = nm.at - l.lvl;
    if (n > 1 && n < 60) consider(E.lineCost(i, l.lvl, n), c => c.lines[i].lvl += n, `ms ${E.LINES[i].id}`);
    if (!l.mgr) consider(E.mgrCost(s, i), c => c.lines[i].mgr = true, `mgr ${E.LINES[i].id}`);
  });
  for (const u of E.UPGRADES) if (!s.ups[u.key]) { consider(u.cost, c => c.ups[u.key] = 1, `up ${u.key}`); break; }
  // also the cheapest few upgrades
  E.UPGRADES.filter(u => !s.ups[u.key]).slice(0, 4).forEach(u => consider(u.cost, c => c.ups[u.key] = 1, `up ${u.key}`));
  return best;
}

const checkpoints = [1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300];
let buys = 0, lastBuyT = 0, gaps = [];
while (T < mins * 60) {
  // produce
  s.lines.forEach((l, i) => {
    if (l.lvl === 0) return;
    const k = E.lineStats(s, i);
    if (!l.mgr && !l.run) { waits[i] += dt; if (waits[i] >= tapDelay) { l.run = true; waits[i] = 0; } return; }
    l.p += dt / k.time;
    while (l.p >= 1) { s.cash += k.rev; s.earned += k.rev; s.lifetime += k.rev; l.p -= 1; if (!l.mgr) { l.run = false; l.p = 0; break; } }
  });
  // buy (a few times per second)
  if (Math.round(T * 10) % 5 === 0) {
    for (let g = 0; g < 50; g++) {
      const b = bestBuy(); if (!b || b.cost > s.cash) break;
      s.cash -= b.cost; b.apply(s); buys++;
      gaps.push(T - lastBuyT); lastBuyT = T;
      if (b.label.startsWith('unlock')) note(b.label, b.label);
      if (b.label.startsWith('mgr')) note(b.label, b.label);
      if (b.label.startsWith('up u0_0')) note('firstup', 'first upgrade');
      if (b.label.includes('_all')) note(b.label, b.label);
    }
  }
  const m = T / 60;
  for (const c of checkpoints) if (Math.abs(m - c) < dt / 120) {
    log.push(`-- ${c}m  cash ${fmt(s.cash)}  inc ${fmt(income(s))}/s  lvls ${s.lines.map(l => l.lvl).join(',')}  stars +${E.pendingStars(s)} (have ${s.stars})  buys ${buys}`);
  }
  if (resets.length && m >= resets[0]) {
    resets.shift();
    log.push(`== PRESTIGE at ${m.toFixed(0)}m: +${E.pendingStars(s)} stars`);
    s = E.prestige(s); runStart = T;
  }
  T += dt;
}
console.log(log.join('\n'));
gaps.sort((a, b) => a - b);
console.log('median gap between purchases', gaps[gaps.length >> 1].toFixed(1), 's; p90', gaps[Math.floor(gaps.length * 0.9)].toFixed(1), 's');

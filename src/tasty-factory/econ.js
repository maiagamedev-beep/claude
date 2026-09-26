// Economy rules for Tasty Factory. Pure functions over a plain state object so the
// same code runs in the game and in tools/tf-sim.mjs (pacing simulation).

export const LINES = [
  // id, product model, raw ingredient model, base cost, cost growth, cycle seconds, revenue per level per cycle, manager cost
  { id: 'cookie',    product: 'cookie-chocolate', raw: 'bag',                  cost: 4,       growth: 1.07, time: 1,   rev: 1,       mgr: 1000 },
  { id: 'donut',     product: 'donut-sprinkles',  raw: 'egg',                  cost: 60,      growth: 1.15, time: 3,   rev: 60,      mgr: 15000 },
  { id: 'cupcake',   product: 'cupcake',          raw: 'strawberry',           cost: 720,     growth: 1.14, time: 6,   rev: 540,     mgr: 100000 },
  { id: 'croissant', product: 'croissant',        raw: 'bag-flat',             cost: 8640,    growth: 1.13, time: 12,  rev: 4320,    mgr: 500000 },
  { id: 'waffle',    product: 'waffle',           raw: 'honey',                cost: 103680,  growth: 1.12, time: 24,  rev: 51840,   mgr: 1.2e+06 },
  { id: 'burger',    product: 'burger-cheese',    raw: 'meat-patty',           cost: 1.24e6,  growth: 1.11, time: 48,  rev: 622080,  mgr: 1e+07 },
  { id: 'pizza',     product: 'pizza',            raw: 'tomato',               cost: 1.49e7,  growth: 1.10, time: 96,  rev: 7.46e6,  mgr: 1.11e+08 },
  { id: 'sushi',     product: 'maki-salmon',      raw: 'fish',                 cost: 1.79e8,  growth: 1.09, time: 192, rev: 8.96e7,  mgr: 5.55e+08 },
  { id: 'sundae',    product: 'sundae',           raw: 'ice-cream-scoop-mint', cost: 2.15e9,  growth: 1.08, time: 384, rev: 1.07e9,  mgr: 1e+10 },
  { id: 'cake',      product: 'cake-birthday',    raw: 'cherries',             cost: 2.58e10, growth: 1.07, time: 768, rev: 2.97e10, mgr: 1e+11 },
];

// Per-line level milestones. speed halves the cycle (below MIN_CYCLE it turns into profit x2).
export const MILESTONES = [
  { at: 10, kind: 'profit', x: 2 },
  { at: 25, kind: 'speed', x: 2 },
  { at: 50, kind: 'speed', x: 2 },
  { at: 75, kind: 'profit', x: 2 },
  { at: 100, kind: 'speed', x: 2 },
  { at: 150, kind: 'profit', x: 2 },
  { at: 200, kind: 'speed', x: 2 },
  { at: 250, kind: 'profit', x: 3 },
  { at: 300, kind: 'speed', x: 2 },
  { at: 400, kind: 'speed', x: 2 },
  { at: 500, kind: 'profit', x: 5 },
  { at: 600, kind: 'profit', x: 2 },
  { at: 700, kind: 'profit', x: 2 },
  { at: 800, kind: 'profit', x: 2 },
  { at: 900, kind: 'profit', x: 2 },
  { at: 1000, kind: 'profit', x: 5 },
];
// When every line reaches the level, all profits x2.
export const ALL_MILESTONES = [25, 100, 250, 500, 1000];
export const MIN_CYCLE = 0.25;

// One-time cash upgrades: tiers of "line i profit x3" and a closing "all profits x3".
const TIER_BASE = [2.5e5, 5e5, 1e6, 5e6, 1e7, 2.5e7, 5e8, 1e10, 5e10, 2.5e11];
export const UPGRADES = [];
for (let t = 0; t < 6; t++) {
  const f = Math.pow(1e4, t);
  LINES.forEach((l, i) => UPGRADES.push({ key: `u${t}_${i}`, line: i, x: 3, cost: TIER_BASE[i] * f }));
  UPGRADES.push({ key: `u${t}_all`, line: -1, x: 3, cost: 1e12 * f });
}
UPGRADES.sort((a, b) => a.cost - b.cost);

// Permanent perks bought with stars (stars also give +2% profit each while unspent).
export const PERKS = [
  { key: 'offline', max: 5, base: 5, grow: 2.2 },   // +2h offline cap per level (base 2h)
  { key: 'mgrcost', max: 3, base: 10, grow: 3 },    // managers -25% per level
  { key: 'rush', max: 3, base: 8, grow: 2.5 },      // rush boost lasts +50% per level
  { key: 'start', max: 4, base: 6, grow: 3 },       // start each factory with more cash
  { key: 'profit', max: 20, base: 15, grow: 1.6 },  // profit x2 per level
];
export const STAR_BONUS = 0.02;

export function newState() {
  return {
    v: 1, cash: 0, earned: 0, lifetime: 0, stars: 0, starsSpent: 0, resets: 0,
    lines: LINES.map((_, i) => ({ lvl: i === 0 ? 1 : 0, mgr: false, p: 0, run: false })),
    ups: {}, perks: {}, rushUntil: 0, t: Date.now(),
  };
}

export const lineCost = (i, lvl, n = 1) => {
  const l = LINES[i], r = l.growth;
  return l.cost * Math.pow(r, lvl) * (Math.pow(r, n) - 1) / (r - 1);
};
export function maxBuy(i, lvl, cash) {
  const l = LINES[i], r = l.growth;
  const n = Math.floor(Math.log(cash * (r - 1) / (l.cost * Math.pow(r, lvl)) + 1) / Math.log(r));
  return Math.max(0, n);
}
export const mgrCost = (s, i) => LINES[i].mgr * Math.pow(0.75, s.perks.mgrcost || 0);
export const perkCost = (p, lvl) => Math.ceil(p.base * Math.pow(p.grow, lvl));

export function lineStats(s, i, rushMul = 1) {
  const L = LINES[i], st = s.lines[i];
  let time = L.time, profit = 1;
  for (const m of MILESTONES) if (st.lvl >= m.at) { if (m.kind === 'speed') time /= m.x; else profit *= m.x; }
  while (time < MIN_CYCLE) { time *= 2; profit *= 2; }
  for (const u of UPGRADES) if (s.ups[u.key] && (u.line === i || u.line === -1)) profit *= u.x;
  const minL = Math.min(...s.lines.map(x => x.lvl));
  for (const a of ALL_MILESTONES) if (minL >= a) profit *= 2;
  profit *= globalMul(s) * rushMul;
  return { time, rev: L.rev * st.lvl * profit };
}
export const globalMul = (s) => (1 + (s.stars - s.starsSpent) * STAR_BONUS) * Math.pow(2, s.perks.profit || 0);

export const nextMilestone = (lvl) => MILESTONES.find(m => m.at > lvl) || { at: Math.ceil((lvl + 1) / 100) * 100, kind: 'profit', x: 3 };
export const prevMilestoneAt = (lvl) => { let p = 0; for (const m of MILESTONES) if (m.at <= lvl) p = m.at; return p; };

// Stars from total lifetime earnings across all factories (cumulative, minus already owned).
export const starsFor = (lifetime) => Math.floor(50 * Math.sqrt(lifetime / 1e13));
export const pendingStars = (s) => Math.max(0, starsFor(s.lifetime) - s.stars);

export const offlineCapH = (s) => 2 + 2 * (s.perks.offline || 0);
export const rushMinutes = (s) => 10 * (1 + 0.5 * (s.perks.rush || 0));
export const startCash = (s) => [0, 1e4, 1e6, 1e8, 1e10][s.perks.start || 0];

// Income per second from managed lines (used for offline earnings and the HUD).
export function incomePerSec(s, rushMul = 1) {
  let t = 0;
  s.lines.forEach((st, i) => { if (st.lvl > 0 && st.mgr) { const k = lineStats(s, i, rushMul); t += k.rev / k.time; } });
  return t;
}

export function prestige(s) {
  const n = newState();
  n.stars = starsFor(s.lifetime); n.starsSpent = s.starsSpent; n.lifetime = s.lifetime;
  n.perks = s.perks; n.resets = s.resets + 1; n.cash = startCash(s);
  return n;
}

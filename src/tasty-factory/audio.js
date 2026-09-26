// Small WebAudio synth: UI and factory sounds plus a soft electric-piano loop.
let ctx = null, master = null, sfxBus = null, musBus = null, comp = null;
let noiseBuf = null;
const st = { sfx: true, music: true, suspended: false, started: false };

function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
  sfxBus = ctx.createGain(); sfxBus.gain.value = st.sfx ? 0.8 : 0; sfxBus.connect(master);
  musBus = ctx.createGain(); musBus.gain.value = st.music ? 0.32 : 0; musBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function tone(freq, t0, dur, { type = 'sine', vol = 0.2, attack = 0.004, slide = 0, bus = sfxBus, detune = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(t0, dur, { vol = 0.1, freq = 2000, q = 1, type = 'bandpass', bus = sfxBus } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
}

let combo = 0, comboT = 0;
const ok = () => ctx && st.sfx && !st.suspended && ctx.state === 'running';
export const sfx = {
  tap() { if (!ok()) return; const t = ctx.currentTime; tone(520, t, 0.09, { type: 'triangle', vol: 0.16, slide: 0.55 }); noise(t, 0.03, { vol: 0.05, freq: 3000 }); },
  click() { if (!ok()) return; const t = ctx.currentTime; tone(880, t, 0.05, { type: 'triangle', vol: 0.08, slide: 0.7 }); },
  coin(pitch = 1) { if (!ok()) return; const t = ctx.currentTime; tone(1568 * pitch, t, 0.12, { vol: 0.07 }); tone(2093 * pitch, t + 0.05, 0.28, { vol: 0.07 }); },
  buy() {
    if (!ok()) return; const t = ctx.currentTime;
    if (t - comboT < 0.6) combo = Math.min(combo + 1, 12); else combo = 0; comboT = t;
    const f = 440 * Math.pow(2, [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21][combo] / 12);
    tone(f, t, 0.12, { type: 'square', vol: 0.045 }); tone(f * 2, t + 0.03, 0.16, { vol: 0.06 });
  },
  milestone() { if (!ok()) return; const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => { tone(f, t + i * 0.08, 0.4, { type: 'triangle', vol: 0.1 }); tone(f * 2, t + i * 0.08, 0.3, { vol: 0.03 }); }); },
  build() { if (!ok()) return; const t = ctx.currentTime; tone(110, t, 0.25, { type: 'sine', vol: 0.3, slide: 0.5 }); noise(t, 0.25, { vol: 0.12, freq: 400, type: 'lowpass' }); [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + 0.12 + i * 0.06, 0.3, { vol: 0.06 })); },
  hire() { if (!ok()) return; const t = ctx.currentTime; [392, 494, 587, 784].forEach((f) => tone(f, t, 0.6, { type: 'triangle', vol: 0.06 })); tone(1568, t + 0.1, 0.4, { vol: 0.05 }); noise(t, 0.3, { vol: 0.04, freq: 5000, q: 0.5 }); },
  open() { if (!ok()) return; const t = ctx.currentTime; noise(t, 0.12, { vol: 0.05, freq: 1200, q: 0.7 }); tone(660, t, 0.08, { type: 'triangle', vol: 0.05, slide: 1.3 }); },
  close() { if (!ok()) return; const t = ctx.currentTime; tone(700, t, 0.08, { type: 'triangle', vol: 0.05, slide: 0.7 }); },
  golden() { if (!ok()) return; const t = ctx.currentTime; [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.05, 0.35, { vol: 0.06 })); },
  deny() { if (!ok()) return; const t = ctx.currentTime; tone(220, t, 0.12, { type: 'square', vol: 0.04 }); tone(196, t + 0.08, 0.14, { type: 'square', vol: 0.04 }); },
  cash() { if (!ok()) return; const t = ctx.currentTime; noise(t, 0.08, { vol: 0.08, freq: 6000, q: 0.8 }); [1319, 1760, 2637].forEach((f, i) => tone(f, t + 0.04 + i * 0.05, 0.3, { vol: 0.06 })); },
};

// --- music: 4-bar electric piano loop with soft bass and brushes ---
const CH = [[48, 52, 55, 59, 62], [45, 48, 52, 55, 60], [41, 45, 48, 52, 57], [43, 47, 50, 55, 57]];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let nextBar = 0, bar = 0, timer = null;
function epiano(freq, t0, dur, vol) {
  const o = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  o.type = 'sine'; m.type = 'sine'; o.frequency.value = freq; m.frequency.value = freq * 2;
  mg.gain.setValueAtTime(freq * 1.4, t0); mg.gain.exponentialRampToValueAtTime(freq * 0.05, t0 + 0.5);
  m.connect(mg); mg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(musBus); o.start(t0); m.start(t0); o.stop(t0 + dur + 0.05); m.stop(t0 + dur + 0.05);
}
function scheduleBar(t0) {
  const beat = 60 / 84, c = CH[bar % 4];
  // chord stabs with a lazy swing
  [0, 1.5, 2.5].forEach((b, k) => c.slice(1).forEach((n, i) => epiano(mtof(n + 12), t0 + b * beat + i * 0.012, k === 0 ? 1.6 : 0.7, 0.028)));
  // bass
  tone(mtof(c[0] - 12), t0, beat * 1.8, { type: 'triangle', vol: 0.11, bus: musBus, attack: 0.02 });
  tone(mtof(c[0] - 5), t0 + beat * 2, beat * 1.5, { type: 'triangle', vol: 0.08, bus: musBus, attack: 0.02 });
  // melody sprinkle on odd bars
  if (bar % 2 === 1) [c[4] + 12, c[3] + 12, c[2] + 12].forEach((n, i) => epiano(mtof(n + 12), t0 + (1 + i * 0.5) * beat, 0.6, 0.018));
  // brushes and a soft kick
  for (let i = 0; i < 8; i++) noise(t0 + i * beat / 2 + (i % 2 ? 0.04 : 0), 0.05, { vol: i % 2 ? 0.012 : 0.02, freq: 7000, q: 0.6, bus: musBus });
  [0, 2].forEach((b) => tone(90, t0 + b * beat, 0.18, { vol: 0.12, slide: 0.45, bus: musBus }));
  bar++;
  return t0 + beat * 4;
}
function musicTick() {
  if (!ctx || st.suspended || ctx.state !== 'running') return;
  if (nextBar < ctx.currentTime + 0.1) nextBar = ctx.currentTime + 0.1;
  while (nextBar < ctx.currentTime + 1.2) nextBar = scheduleBar(nextBar);
}

export const audio = {
  // must be called from a user gesture
  unlock() {
    init(); if (!ctx) return;
    if (ctx.state === 'suspended' && !st.suspended) ctx.resume();
    if (!st.started) { st.started = true; timer = setInterval(musicTick, 250); }
  },
  setSfx(on) { st.sfx = on; if (sfxBus) sfxBus.gain.value = on ? 0.8 : 0; },
  setMusic(on) { st.music = on; if (musBus) musBus.gain.value = on ? 0.32 : 0; },
  get sfxOn() { return st.sfx; }, get musicOn() { return st.music; },
  setSuspended(p) {
    st.suspended = p; if (!ctx) return;
    if (p) ctx.suspend(); else { ctx.resume(); nextBar = 0; }
  },
};

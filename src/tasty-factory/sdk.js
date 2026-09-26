// Tribus SDK wrapper. The portal injects window.TribusSDK; outside the portal a local
// stand-in shows a 2 s test ad and saves to localStorage.

function localSDK() {
  const mem = {};
  const ls = (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; } catch (e) { return null; } })();
  const L = {};
  const emit = (ev) => (L[ev] || []).forEach((f) => { try { f(); } catch (e) { /* */ } });
  let busy = false;
  return {
    environment: 'local',
    init: () => Promise.resolve(),
    on: (ev, cb) => { (L[ev] = L[ev] || []).push(cb); },
    ad: {
      requestAd(type, cbs = {}) {
        return new Promise((resolve, reject) => {
          if (busy) { const e = new Error('busy'); e.code = 'busy'; reject(e); return; }
          busy = true;
          const o = document.createElement('div');
          o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#15121a;color:#eee;display:flex;align-items:center;justify-content:center;flex-direction:column;font:700 18px system-ui,sans-serif;gap:8px';
          o.innerHTML = '<div>Test ad (' + type + ')</div><div style="opacity:.6;font-size:13px">local mode · 2s</div>';
          document.body.appendChild(o);
          emit('adStarted'); cbs.adStarted && cbs.adStarted();
          setTimeout(() => { o.remove(); busy = false; emit('adFinished'); cbs.adFinished && cbs.adFinished(); resolve(type === 'rewarded' ? 'rewarded' : 'finished'); }, 2000);
        });
      },
    },
    game: { loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {}, happytime() {} },
    data: {
      setItem(k, v) { v = String(v); if (ls) { try { ls.setItem(k, v); return; } catch (e) { /* */ } } mem[k] = v; },
      getItem(k) { if (ls) { try { const v = ls.getItem(k); if (v !== null) return v; } catch (e) { /* */ } } return k in mem ? mem[k] : null; },
      removeItem(k) { if (ls) { try { ls.removeItem(k); } catch (e) { /* */ } } delete mem[k]; },
    },
  };
}

const safe = (fn) => { try { return fn(); } catch (e) { return undefined; } };
let S = localSDK();
const pauses = {};
const pauseListeners = [];
export const sdk = {
  paused: false,
  onPause(f) { pauseListeners.push(f); },
  setPause(src, on) {
    if (on) pauses[src] = 1; else delete pauses[src];
    const p = Object.keys(pauses).length > 0;
    if (p === this.paused) return;
    this.paused = p;
    pauseListeners.forEach((f) => safe(() => f(p)));
  },
  async init() {
    if (window.TribusSDK && window.TribusSDK.ad) S = window.TribusSDK;
    try { await (S.init && S.init()); } catch (e) { /* keep going without the SDK */ }
    safe(() => S.on('pause', () => this.setPause('sdk', true)));
    safe(() => S.on('resume', () => this.setPause('sdk', false)));
    safe(() => S.on('adStarted', () => this.setPause('ad', true)));
    safe(() => S.on('adFinished', () => this.setPause('ad', false)));
    document.addEventListener('visibilitychange', () => this.setPause('hidden', document.hidden));
  },
  loadingStart: () => safe(() => S.game.loadingStart()),
  loadingStop: () => safe(() => S.game.loadingStop()),
  _playing: false,
  start() { if (!this._playing) { this._playing = true; safe(() => S.game.gameplayStart()); } },
  stop() { if (this._playing) { this._playing = false; safe(() => S.game.gameplayStop()); } },
  happy: () => safe(() => S.game.happytime()),
  get: (k) => safe(() => S.data.getItem(k)),
  set: (k, v) => safe(() => S.data.setItem(k, v)),
  remove: (k) => safe(() => S.data.removeItem(k)),

  adBusy: false,
  lastMid: Date.now(),
  // Interstitial: only called at natural breaks (after a factory sale). Never blocks the game.
  midgame() {
    return new Promise((resolve) => {
      if (this.adBusy || Date.now() - this.lastMid < 125000) return resolve(false);
      this.adBusy = true; const was = this._playing; this.stop();
      let done = false;
      const fin = (ok) => { if (done) return; done = true; this.adBusy = false; this.lastMid = Date.now(); this.setPause('ad', false); if (was) this.start(); resolve(ok); };
      let p;
      try { p = S.ad.requestAd('midgame', { adStarted: () => this.setPause('ad', true), adFinished: () => fin(true), adError: () => fin(false) }); } catch (e) { fin(false); return; }
      Promise.resolve(p).then(() => fin(true)).catch(() => fin(false));
    });
  },
  // Rewarded: resolves true only when the player earned the reward.
  rewarded() {
    return new Promise((resolve) => {
      if (this.adBusy) return resolve(false);
      this.adBusy = true; const was = this._playing; this.stop(); this.setPause('ad', true);
      let done = false;
      const fin = (ok, err) => { if (done) return; done = true; this.adBusy = false; this.setPause('ad', false); if (was) this.start(); resolve(ok ? true : (err && err.code) || 'fail'); };
      let p;
      try { p = S.ad.requestAd('rewarded'); } catch (e) { fin(false, e); return; }
      Promise.resolve(p).then((r) => fin(r === 'rewarded' || r === undefined || r === true)).catch((e) => fin(false, e));
    });
  },
};

/* Kit — shared runtime for all games in this collection.
 * Tribus SDK wrapper (ads, events, cloud save), WebAudio synth, meta-economy
 * (daily reward, lucky wheel, missions, player level, free gifts), DOM UI and 2D game-feel helpers.
 * Everything is generated in code: no external assets, no network requests. */
(function () {
  'use strict';
  const K = (window.Kit = {});
  const now = () => performance.now();
  K.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.rand = (a, b) => a + Math.random() * (b - a);
  K.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  K.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  K.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  K.rng = function (seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  K.ease = {
    linear: (t) => t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inQuad: (t) => t * t,
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
    outBounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  K.fmt = function (n) {
    if (!isFinite(n)) return '∞';
    n = Math.floor(n);
    if (Math.abs(n) < 1000) return String(n);
    let i = 0;
    while (Math.abs(n) >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
    if (i === SUFFIX.length - 1 && Math.abs(n) >= 1000) return n.toExponential(2);
    return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.0+$|(\.\d*[1-9])0+$/, '$1') + SUFFIX[i];
  };
  K.fmtTime = function (s) {
    s = Math.max(0, Math.ceil(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(ss).padStart(2, '0')}`;
  };

  /* ---------------- i18n ---------------- */
  K.lang = (navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  const DICT = {
    play: ['Play', 'Jogar'], continue: ['Continue', 'Continuar'], restart: ['Play again', 'Jogar de novo'],
    menu: ['Menu', 'Menu'], shop: ['Shop', 'Loja'], daily: ['Daily', 'Diário'], wheel: ['Spin', 'Roleta'],
    missions: ['Missions', 'Missões'], claim: ['Claim', 'Pegar'], close: ['Close', 'Fechar'], free: ['Free', 'Grátis'],
    watch: ['Watch', 'Assistir'], x2: ['x2 reward', 'Prêmio x2'], x3: ['x3 reward', 'Prêmio x3'], revive: ['Revive', 'Reviver'],
    noThanks: ['No thanks', 'Não, obrigado'], gameOver: ['Game over', 'Fim de jogo'], newBest: ['New best!', 'Novo recorde!'],
    best: ['Best', 'Recorde'], score: ['Score', 'Pontos'], level: ['Level', 'Nível'], day: ['Day', 'Dia'],
    spinFree: ['Free spin', 'Giro grátis'], spinAd: ['Spin again', 'Girar de novo'], nextFree: ['Next free spin in', 'Próximo giro grátis em'],
    reroll: ['New mission', 'Nova missão'], done: ['Done', 'Feito'], paused: ['Paused', 'Pausado'], resume: ['Resume', 'Voltar'],
    sound: ['Sound', 'Som'], music: ['Music', 'Música'], settings: ['Settings', 'Ajustes'], gift: ['Gift', 'Presente'],
    freeGift: ['Free gift', 'Presente grátis'], openChest: ['Tap to open', 'Toque para abrir'], levelUp: ['Level up!', 'Subiu de nível!'],
    adFail: ['No video available right now. Try again soon.', 'Nenhum vídeo disponível agora. Tente de novo em breve.'],
    adSkip: ['Watch the whole video to get the reward.', 'Assista ao vídeo inteiro para ganhar o prêmio.'],
    owned: ['Owned', 'Seu'], equip: ['Equip', 'Usar'], equipped: ['Equipped', 'Em uso'], buy: ['Buy', 'Comprar'],
    upgrade: ['Upgrade', 'Melhorar'], max: ['Max', 'Máx'], locked: ['Locked', 'Bloqueado'], tryIt: ['Try', 'Testar'],
    howTo: ['How to play', 'Como jogar'], welcomeBack: ['Welcome back!', 'Bem-vindo de volta!'], offline: ['While you were away', 'Enquanto você esteve fora'],
    collect: ['Collect', 'Coletar'], stage: ['Stage', 'Fase'], wave: ['Wave', 'Onda'], ready: ['Ready!', 'Pronto!'],
    notEnough: ['Not enough coins', 'Moedas insuficientes'], notEnoughGems: ['Not enough gems', 'Gemas insuficientes'], reward: ['Reward', 'Prêmio'],
    streak: ['Come back every day for bigger rewards!', 'Volte todo dia para prêmios maiores!'], allDone: ['All missions done! New ones soon.', 'Missões completas! Novas em breve.'],
    boost: ['Boost', 'Turbo'], start: ['Start', 'Começar'], stats: ['Stats', 'Estatísticas'], tomorrow: ['Tomorrow', 'Amanhã'],
  };
  K.t = function (k, vars) {
    let s;
    if (typeof k === 'string') s = DICT[k] ? DICT[k][K.lang === 'pt' ? 1 : 0] : k;
    else if (Array.isArray(k)) s = k[K.lang === 'pt' ? 1 : 0];
    else s = k[K.lang] || k.en;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };

  /* ---------------- Tribus SDK wrapper ---------------- */
  function makeLocalSDK() {
    const mem = {};
    const ls = (() => { try { const k = '__kit_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
    const listeners = {};
    const emit = (ev) => (listeners[ev] || []).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
    let adBusy = false;
    return {
      environment: 'local',
      init: () => Promise.resolve(),
      on: (ev, cb) => { (listeners[ev] = listeners[ev] || []).push(cb); },
      ad: {
        requestAd(type, cbs) {
          cbs = cbs || {};
          return new Promise((resolve, reject) => {
            if (adBusy) { const e = new Error('busy'); e.code = 'busy'; if (cbs.adError) cbs.adError(e); reject(e); return; }
            adBusy = true;
            const o = document.createElement('div');
            o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#111;color:#eee;display:flex;align-items:center;justify-content:center;flex-direction:column;font:600 18px system-ui,sans-serif;gap:10px';
            o.innerHTML = '<div>Test ad (' + type + ')</div><div style="opacity:.6;font-size:13px">local mode · 2s</div>';
            document.body.appendChild(o);
            emit('adStarted'); if (cbs.adStarted) cbs.adStarted();
            setTimeout(() => {
              o.remove(); adBusy = false; emit('adFinished'); if (cbs.adFinished) cbs.adFinished();
              resolve(type === 'rewarded' ? 'rewarded' : 'finished');
            }, 2000);
          });
        },
        hasAdblock: () => Promise.resolve(false),
      },
      game: { loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {}, happytime() {} },
      data: {
        setItem(k, v) { v = String(v); if (ls) { try { ls.setItem(k, v); return; } catch (e) { /* quota */ } } mem[k] = v; },
        getItem(k) { if (ls) { try { const v = ls.getItem(k); if (v !== null) return v; } catch (e) { /* blocked */ } } return k in mem ? mem[k] : null; },
        removeItem(k) { if (ls) { try { ls.removeItem(k); } catch (e) { /* */ } } delete mem[k]; },
        clear() { if (ls) { try { ls.clear(); } catch (e) { /* */ } } for (const k in mem) delete mem[k]; },
        keys() { const out = Object.keys(mem); if (ls) { try { for (let i = 0; i < ls.length; i++) out.push(ls.key(i)); } catch (e) { /* */ } } return out; },
      },
      user: { getUser: () => Promise.resolve(null), showAuthPrompt: () => Promise.resolve(null) },
    };
  }
  // The portal injects window.TribusSDK; outside the portal a local stand-in simulates it.
  let SDK = makeLocalSDK();
  const safe = (fn) => { try { return fn(); } catch (e) { return undefined; } };
  const domReady = new Promise((r) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r) : r()));
  K.sdkReady = domReady
    .then(() => { if (window.TribusSDK && window.TribusSDK.ad) SDK = window.TribusSDK; K.SDK = SDK; K.environment = SDK.environment || 'local'; })
    .then(() => SDK.init && SDK.init())
    .catch(() => {})
    .then(() => {
      safe(() => SDK.on('pause', () => K.setSystemPause('sdk', true)));
      safe(() => SDK.on('resume', () => K.setSystemPause('sdk', false)));
      safe(() => SDK.on('adStarted', () => K.setSystemPause('ad', true)));
      safe(() => SDK.on('adFinished', () => K.setSystemPause('ad', false)));
    });
  K.game = {
    loadingStart: () => safe(() => SDK.game.loadingStart()),
    loadingStop: () => safe(() => SDK.game.loadingStop()),
    _playing: false,
    start() { if (!this._playing) { this._playing = true; safe(() => SDK.game.gameplayStart()); } },
    stop() { if (this._playing) { this._playing = false; safe(() => SDK.game.gameplayStop()); } },
    happy: () => safe(() => SDK.game.happytime()),
  };

  /* pause handling: system pauses (tab hidden, ad, SDK) stop the loop and audio */
  const sysPause = {};
  K.systemPaused = false;
  K.setSystemPause = function (src, on) {
    if (on) sysPause[src] = 1; else delete sysPause[src];
    const p = Object.keys(sysPause).length > 0;
    if (p === K.systemPaused) return;
    K.systemPaused = p;
    K.audio.setSuspended(p);
    if (p) K.save.flush();
    (K._pauseListeners || []).forEach((f) => safe(() => f(p)));
  };
  K.onSystemPause = (f) => (K._pauseListeners = K._pauseListeners || []).push(f);
  document.addEventListener('visibilitychange', () => K.setSystemPause('hidden', document.hidden));
  window.addEventListener('blur', () => K.audio && K.audio.duck(true));
  window.addEventListener('focus', () => K.audio && K.audio.duck(false));

  /* ads: interstitial at natural breaks, rewarded only on explicit player choice */
  K.ads = {
    lastMid: now(),
    minGap: 125000,
    busy: false,
    midgame() {
      return new Promise((resolve) => {
        if (this.busy || now() - this.lastMid < this.minGap) return resolve(false);
        this.busy = true;
        const wasPlaying = K.game._playing;
        K.game.stop();
        let done = false;
        const fin = (ok) => {
          if (done) return; done = true;
          this.busy = false; this.lastMid = now();
          K.setSystemPause('ad', false);
          if (wasPlaying) K.game.start();
          resolve(ok);
        };
        let p;
        try {
          p = SDK.ad.requestAd('midgame', {
            adStarted: () => K.setSystemPause('ad', true),
            adFinished: () => fin(true),
            adError: () => fin(false),
          });
        } catch (e) { fin(false); return; }
        Promise.resolve(p).then(() => fin(true)).catch(() => fin(false));
      });
    },
    rewarded() {
      return new Promise((resolve) => {
        if (this.busy) return resolve(false);
        this.busy = true;
        const wasPlaying = K.game._playing;
        K.game.stop();
        K.setSystemPause('ad', true);
        let done = false;
        const fin = (ok, err) => {
          if (done) return; done = true;
          this.busy = false;
          K.setSystemPause('ad', false);
          if (wasPlaying) K.game.start();
          if (!ok) K.ui.toast(err && err.code === 'dismissed' ? K.t('adSkip') : K.t('adFail'));
          else { K.meta && K.meta.track('_ads', 1); }
          resolve(ok);
        };
        let p;
        try { p = SDK.ad.requestAd('rewarded'); } catch (e) { fin(false, e); return; }
        Promise.resolve(p).then((r) => fin(r === 'rewarded' || r === undefined || r === true)).catch((e) => fin(false, e));
      });
    },
  };

  /* ---------------- Save (cloud via SDK.data, local fallback) ---------------- */
  K.save = {
    key: 'kit_save',
    data: null,
    dirty: false,
    init(gameId, defaults) {
      this.key = gameId + '_save_v1';
      let d = null;
      const raw = safe(() => SDK.data.getItem(this.key));
      if (raw) d = safe(() => JSON.parse(raw));
      this.data = deepMerge(JSON.parse(JSON.stringify(defaults)), d || {});
      setInterval(() => this.flush(), 4000);
      window.addEventListener('pagehide', () => this.flush());
      return this.data;
    },
    mark() { this.dirty = true; },
    flush() {
      if (!this.dirty || !this.data) return;
      this.dirty = false;
      this.data._t = Date.now();
      safe(() => SDK.data.setItem(this.key, JSON.stringify(this.data)));
    },
  };
  function deepMerge(base, over) {
    for (const k in over) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) deepMerge(base[k], over[k]);
      else base[k] = over[k];
    }
    return base;
  }

  /* ---------------- Audio (all synthesized) ---------------- */
  const A = (K.audio = {
    ctx: null, master: null, sfxBus: null, musicBus: null, noise: null,
    sfxOn: true, musicOn: true, suspended: false, ducked: false,
    ensure() {
      if (this.ctx) { if (this.ctx.state === 'suspended' && !this.suspended) this.ctx.resume().catch(() => {}); return this.ctx; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? 1 : 0; this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.35 : 0; this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      if (this.suspended) this.ctx.suspend().catch(() => {});
      return this.ctx;
    },
    setSuspended(p) {
      this.suspended = p;
      if (!this.ctx) return;
      if (p) this.ctx.suspend().catch(() => {}); else this.ctx.resume().catch(() => {});
    },
    duck(on) { this.ducked = on; },
    setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? 1 : 0; },
    setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.value = on ? 0.35 : 0; },
    // generic voice
    tone(o) {
      const c = this.ctx; if (!c || this.suspended || !this.sfxOn) return;
      const t = c.currentTime + (o.delay || 0);
      const g = c.createGain();
      const vol = (o.vol == null ? 0.3 : o.vol);
      const dur = o.dur || 0.15;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let src;
      if (o.type === 'noise') {
        src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
        src.playbackRate.value = o.rate || 1;
      } else {
        src = c.createOscillator(); src.type = o.type || 'square';
        src.frequency.setValueAtTime(o.f || 440, t);
        if (o.f2) src.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.slide || dur));
      }
      let node = src;
      if (o.filter) {
        const f = c.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1200; f.Q.value = o.q || 1;
        if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t + dur);
        node.connect(f); node = f;
      }
      node.connect(g); g.connect(o.bus || this.sfxBus);
      src.start(t); src.stop(t + dur + 0.05);
    },
    last: {},
    play(name, p) {
      if (!this.ctx) return;
      const t = now();
      if (this.last[name] && t - this.last[name] < 30) return; // voice limiting
      this.last[name] = t;
      p = p || 1;
      const T = (o) => this.tone(o);
      switch (name) {
        case 'click': T({ type: 'triangle', f: 700 * p, f2: 500 * p, dur: 0.06, vol: 0.2 }); break;
        case 'tap': T({ type: 'sine', f: 520 * p, f2: 380 * p, dur: 0.08, vol: 0.25 }); break;
        case 'pop': T({ type: 'sine', f: 300 * p, f2: 900 * p, dur: 0.09, vol: 0.3 }); T({ type: 'noise', dur: 0.04, vol: 0.08, filter: 'highpass', ff: 3000 }); break;
        case 'coin': T({ type: 'square', f: 988 * p, dur: 0.07, vol: 0.12 }); T({ type: 'square', f: 1319 * p, dur: 0.18, vol: 0.12, delay: 0.06 }); break;
        case 'gem': [0, 0.05, 0.1].forEach((d, i) => T({ type: 'sine', f: [1568, 2093, 2637][i] * p, dur: 0.2, vol: 0.14, delay: d })); break;
        case 'jump': T({ type: 'square', f: 260 * p, f2: 620 * p, dur: 0.14, vol: 0.12, filter: 'lowpass', ff: 2400 }); break;
        case 'land': T({ type: 'noise', dur: 0.08, vol: 0.15, filter: 'lowpass', ff: 600 }); break;
        case 'whoosh': T({ type: 'noise', dur: 0.25, vol: 0.12, filter: 'bandpass', ff: 600, ff2: 2600, q: 2 }); break;
        case 'hit': T({ type: 'square', f: 180 * p, f2: 60, dur: 0.12, vol: 0.2 }); T({ type: 'noise', dur: 0.1, vol: 0.18, filter: 'lowpass', ff: 1800 }); break;
        case 'hurt': T({ type: 'sawtooth', f: 220 * p, f2: 80, dur: 0.25, vol: 0.18, filter: 'lowpass', ff: 1500 }); break;
        case 'explode': T({ type: 'noise', dur: 0.5, vol: 0.35, filter: 'lowpass', ff: 1400, ff2: 80 }); T({ type: 'sine', f: 120, f2: 30, dur: 0.4, vol: 0.35 }); break;
        case 'shoot': T({ type: 'square', f: 900 * p, f2: 200, dur: 0.08, vol: 0.08 }); break;
        case 'laser': T({ type: 'sawtooth', f: 1400 * p, f2: 300, dur: 0.12, vol: 0.07, filter: 'lowpass', ff: 3000 }); break;
        case 'power': [0, 0.06, 0.12, 0.18].forEach((d, i) => T({ type: 'square', f: [523, 659, 784, 1047][i] * p, dur: 0.12, vol: 0.1, delay: d })); break;
        case 'levelup': [0, 0.08, 0.16, 0.24, 0.36].forEach((d, i) => T({ type: 'triangle', f: [523, 659, 784, 1047, 1319][i] * p, dur: i === 4 ? 0.5 : 0.14, vol: 0.2, delay: d })); break;
        case 'win': [0, 0.1, 0.2, 0.3, 0.45, 0.6].forEach((d, i) => T({ type: 'square', f: [392, 523, 659, 784, 659, 1047][i] * p, dur: i === 5 ? 0.6 : 0.14, vol: 0.1, delay: d, filter: 'lowpass', ff: 3000 })); break;
        case 'lose': [0, 0.18, 0.36].forEach((d, i) => T({ type: 'triangle', f: [392, 330, 247][i] * p, dur: i === 2 ? 0.6 : 0.2, vol: 0.2, delay: d })); break;
        case 'tick': T({ type: 'square', f: 1800 * p, dur: 0.02, vol: 0.06 }); break;
        case 'buy': T({ type: 'triangle', f: 660 * p, dur: 0.07, vol: 0.2 }); T({ type: 'triangle', f: 990 * p, dur: 0.15, vol: 0.2, delay: 0.07 }); T({ type: 'noise', dur: 0.1, vol: 0.05, filter: 'highpass', ff: 5000, delay: 0.07 }); break;
        case 'error': T({ type: 'square', f: 140, dur: 0.1, vol: 0.12 }); T({ type: 'square', f: 110, dur: 0.14, vol: 0.12, delay: 0.1 }); break;
        case 'merge': T({ type: 'sine', f: 400 * p, f2: 800 * p, dur: 0.12, vol: 0.25 }); T({ type: 'triangle', f: 800 * p, dur: 0.18, vol: 0.12, delay: 0.06 }); break;
        case 'swing': T({ type: 'noise', dur: 0.18, vol: 0.1, filter: 'bandpass', ff: 1200, ff2: 400, q: 3 }); break;
        case 'thud': T({ type: 'sine', f: 110 * p, f2: 50, dur: 0.18, vol: 0.4 }); break;
        case 'chest': T({ type: 'noise', dur: 0.3, vol: 0.2, filter: 'bandpass', ff: 400, ff2: 4000 }); A.play('levelup'); break;
        case 'combo': T({ type: 'square', f: 440 * p, dur: 0.06, vol: 0.12 }); T({ type: 'square', f: 880 * p, dur: 0.1, vol: 0.1, delay: 0.05 }); break;
        default: T({ type: 'sine', f: 600 * p, dur: 0.1 });
      }
    },
  });
  A.sfx = (n, p) => A.play(n, p);

  /* tiny sequencer for procedural background music */
  K.music = {
    song: null, timer: null, step: 0, nextT: 0,
    NOTE: (n) => 440 * Math.pow(2, (n - 69) / 12),
    set(song) { this.song = song; this.step = 0; if (A.ctx) this.nextT = A.ctx.currentTime + 0.1; this.run(); },
    run() {
      if (this.timer) return;
      this.timer = setInterval(() => {
        const c = A.ctx, s = this.song;
        if (!c || !s || A.suspended || !A.musicOn) { if (c) this.nextT = c.currentTime + 0.1; return; }
        if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.05;
        const spb = 60 / s.bpm / 2; // eighth notes
        while (this.nextT < c.currentTime + 0.2) {
          this.playStep(this.step, this.nextT, spb);
          this.nextT += spb; this.step++;
        }
      }, 50);
    },
    playStep(i, t, spb) {
      const s = this.song, bar = Math.floor(i / 8) % s.chords.length, chord = s.chords[bar], k = i % 8;
      const d = t - A.ctx.currentTime;
      const v = (o) => A.tone(Object.assign({ bus: A.musicBus, delay: d }, o));
      if (s.bass && (k === 0 || k === 4 || (s.busy && k % 2 === 0))) v({ type: s.bassWave || 'triangle', f: this.NOTE(chord[0] - 12), dur: spb * 1.8, vol: 0.35, filter: 'lowpass', ff: 700 });
      if (s.pad && k === 0) chord.forEach((n) => v({ type: s.padWave || 'sine', f: this.NOTE(n), dur: spb * 7.5, vol: 0.06, attack: 0.3 }));
      if (s.arp) { const n = chord[(k + (s.arpShift || 0)) % chord.length] + 12; if (s.arp[k]) v({ type: s.arpWave || 'square', f: this.NOTE(n), dur: spb * 0.9, vol: 0.05, filter: 'lowpass', ff: 2200 }); }
      if (s.lead) { const ln = s.lead[(i % s.lead.length)]; if (ln) v({ type: s.leadWave || 'triangle', f: this.NOTE(ln), dur: spb * 1.6, vol: 0.08 }); }
      if (s.drums) {
        if (s.drums.k && s.drums.k[k]) v({ type: 'sine', f: 140, f2: 40, dur: 0.15, vol: 0.5 });
        if (s.drums.s && s.drums.s[k]) v({ type: 'noise', dur: 0.12, vol: 0.14, filter: 'bandpass', ff: 1800 });
        if (s.drums.h && s.drums.h[k]) v({ type: 'noise', dur: 0.03, vol: 0.05, filter: 'highpass', ff: 7000 });
      }
    },
  };

  /* ---------------- Input unlock ---------------- */
  const unlock = () => { A.ensure(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

  /* ---------------- Canvas fitting & loop ---------------- */
  K.fit = function (canvas, onResize, maxDpr) {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr || 2);
      const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      if (onResize) onResize(w, h, dpr);
    };
    window.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', resize);
    resize();
    return resize;
  };
  K.loop = function (update, render) {
    let last = now();
    const frame = () => {
      const t = now();
      let dt = (t - last) / 1000; last = t;
      if (dt > 1 / 20) dt = 1 / 20;
      if (!K.systemPaused) {
        if (K.fx.stop > 0) { K.fx.stop -= dt; dt = 0; }
        K.tweens.update(dt);
        update(dt);
      }
      render(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  /* ---------------- Tweens ---------------- */
  K.tweens = {
    list: [],
    add(obj, props, dur, ease, done) {
      const tw = { obj, from: {}, to: props, t: 0, dur, ease: K.ease[ease] || ease || K.ease.outQuad, done };
      for (const p in props) tw.from[p] = obj[p];
      this.list.push(tw); return tw;
    },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const tw = this.list[i]; tw.t += dt;
        const k = K.clamp(tw.t / tw.dur, 0, 1), e = tw.ease(k);
        for (const p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e;
        if (k >= 1) { this.list.splice(i, 1); if (tw.done) tw.done(); }
      }
    },
  };
  K.tween = (o, p, d, e, cb) => K.tweens.add(o, p, d, e, cb);

  /* ---------------- 2D FX: particles, floating text, shake, hit-stop ---------------- */
  K.fx = {
    parts: [], texts: [], shakeAmt: 0, shakeX: 0, shakeY: 0, stop: 0, flashA: 0, flashC: '#fff', max: 600,
    burst(x, y, o) {
      o = o || {};
      const n = o.n || 12;
      for (let i = 0; i < n; i++) {
        if (this.parts.length >= this.max) this.parts.shift();
        const a = o.angle != null ? o.angle + K.rand(-(o.spread || 0.5), o.spread || 0.5) : Math.random() * Math.PI * 2;
        const sp = K.rand(0.3, 1) * (o.speed || 200);
        const life = K.rand(0.6, 1) * (o.life || 0.6);
        this.parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
          size: K.rand(0.6, 1) * (o.size || 5), color: Array.isArray(o.colors) ? K.pick(o.colors) : o.colors || '#fff',
          g: o.g == null ? 300 : o.g, drag: o.drag == null ? 0.9 : o.drag, shape: o.shape || 'circle', rot: Math.random() * 6, vr: K.rand(-10, 10),
          shrink: o.shrink !== false,
        });
      }
    },
    text(x, y, str, o) {
      o = o || {};
      this.texts.push({ x, y, str, color: o.color || '#fff', size: o.size || 22, life: o.life || 0.9, max: o.life || 0.9, vy: o.vy || -60, stroke: o.stroke || 'rgba(0,0,0,.6)', font: o.font });
    },
    shake(a) { this.shakeAmt = Math.min(30, Math.max(this.shakeAmt, a)); },
    hitstop(s) { this.stop = Math.max(this.stop, s); },
    flash(c, a) { this.flashC = c || '#fff'; this.flashA = a || 0.5; },
    update(dt) {
      this.shakeAmt *= Math.pow(0.001, dt);
      if (this.shakeAmt < 0.3) this.shakeAmt = 0;
      this.shakeX = (Math.random() * 2 - 1) * this.shakeAmt;
      this.shakeY = (Math.random() * 2 - 1) * this.shakeAmt;
      this.flashA = Math.max(0, this.flashA - dt * 2.5);
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) { this.parts.splice(i, 1); continue; }
        const d = Math.pow(p.drag, dt * 10);
        p.vx *= d; p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt; t.y += t.vy * dt; t.vy *= Math.pow(0.1, dt);
        if (t.life <= 0) this.texts.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of this.parts) {
        const k = p.life / p.max, s = p.shrink ? p.size * k : p.size;
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        if (p.shape === 'square') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2); ctx.restore();
        } else if (p.shape === 'star') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); K.draw.star(ctx, 0, 0, s, s * 0.45, 5); ctx.fill(); ctx.restore();
        } else if (p.shape === 'ring') {
          ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k) * 4 + 2, 0, 6.283); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, s), 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of this.texts) {
        const k = t.life / t.max, pop = k > 0.85 ? 1 + (k - 0.85) * 4 : 1;
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.font = (t.font || '900 ') + Math.round(t.size * pop) + 'px ' + (K.fontFamily || 'system-ui, sans-serif');
        ctx.lineWidth = 4; ctx.strokeStyle = t.stroke; ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    drawFlash(ctx, w, h) {
      if (this.flashA <= 0) return;
      ctx.globalAlpha = this.flashA; ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    },
    clear() { this.parts.length = 0; this.texts.length = 0; },
  };

  K.draw = {
    star(ctx, x, y, r1, r2, n) {
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 ? r2 : r1, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
    },
    rrect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    },
    // hand-drawn wobbly circle (gives non-perfect, illustrated look)
    wobbleCircle(ctx, x, y, r, seed, amt) {
      ctx.beginPath();
      const n = 48;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (1 + Math.sin(a * 3 + seed) * (amt || 0.04) + Math.sin(a * 5 + seed * 2) * (amt || 0.04) * 0.5);
        i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    },
    // grain texture pattern for print-like look
    grain(ctx, alpha) {
      if (!K.draw._grain) {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'), id = g.createImageData(128, 128);
        for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
        g.putImageData(id, 0, 0);
        K.draw._grain = c;
      }
      if (!K.draw._grainPat) K.draw._grainPat = ctx.createPattern(K.draw._grain, 'repeat');
      ctx.save(); ctx.globalAlpha = alpha || 0.05; ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = K.draw._grainPat; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    },
  };

  /* ---------------- Icons (hand-made inline SVG) ---------------- */
  K.icon = {
    coin: '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="10" fill="#f6c343" stroke="#9c6a12" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#c98f1b" stroke-width="1.6"/><path d="M8.5 7.5 Q10 6.5 11 7" stroke="#fff6d0" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    gem: '<svg viewBox="0 0 24 24" class="ic"><path d="M6 3h12l4 6-10 12L2 9z" fill="#5fd3e8" stroke="#1d6f86" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6" fill="none" stroke="#1d6f86" stroke-width="1.2"/></svg>',
    ad: '<svg viewBox="0 0 24 24" class="ic"><rect x="2" y="5" width="20" height="14" rx="3" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M10 9v6l5-3z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24" class="ic"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z" fill="#ffd34d" stroke="#a36b00" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    gift: '<svg viewBox="0 0 24 24" class="ic"><rect x="3" y="9" width="18" height="12" rx="1.5" fill="#ef5a5a" stroke="#7a1f1f" stroke-width="1.8"/><rect x="2" y="6" width="20" height="4" rx="1" fill="#ff7b7b" stroke="#7a1f1f" stroke-width="1.8"/><path d="M12 6v15" stroke="#ffd34d" stroke-width="3"/><path d="M12 6c-2-4-6-4-5-1s5 1 5 1c0 0 4 2 5-1s-3-3-5 1" fill="none" stroke="#7a1f1f" stroke-width="1.6"/></svg>',
    wheel: '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="10" fill="#ffd34d" stroke="#6b3f00" stroke-width="1.8"/><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="#e05a47" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="#fff" stroke="#6b3f00" stroke-width="1.5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" class="ic"><rect x="3" y="5" width="18" height="16" rx="2" fill="#fff" stroke="#333" stroke-width="1.8"/><rect x="3" y="5" width="18" height="5" fill="#e05a47"/><path d="M8 3v4M16 3v4" stroke="#333" stroke-width="2" stroke-linecap="round"/><path d="M8 15l3 3 5-6" stroke="#2a9d5c" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    list: '<svg viewBox="0 0 24 24" class="ic"><rect x="4" y="2" width="16" height="20" rx="2" fill="#f4ecd8" stroke="#333" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#333" stroke-width="1.8" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" class="ic"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.6 4.9-.1-2.8 2-1.6-2-3.4-2.4.8-2.3-1.4L15.3 2h-4l-.6 3-2.3 1.4-2.4-.8-2 3.4 2 1.6-.1 2.8-2 1.6 2 3.4 2.4-.8 2.3 1.4.6 2.8h4l.5-2.8 2.4-1.4 2.4.8 2-3.4z" fill="#ddd" stroke="#333" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" class="ic"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor"/></svg>',
    chest: '<svg viewBox="0 0 64 56" class="chest"><path d="M6 22h52v28a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#b8692c" stroke="#4a2408" stroke-width="3"/><path d="M6 22c0-12 8-18 26-18s26 6 26 18z" fill="#d4843c" stroke="#4a2408" stroke-width="3"/><path d="M6 22h52v7H6z" fill="#e8b93e" stroke="#4a2408" stroke-width="3"/><rect x="26" y="24" width="12" height="14" rx="2" fill="#f6d45e" stroke="#4a2408" stroke-width="3"/><path d="M20 4v50M44 4v50" stroke="#4a2408" stroke-width="2" opacity=".35"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" class="ic"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#ffd34d" stroke="#8a5a00" stroke-width="1.6"/><path d="M7 5H3c0 3 2 5 4 5M17 5h4c0 3-2 5-4 5" fill="none" stroke="#8a5a00" stroke-width="1.6"/><path d="M10 13h4v4h-4zM7 21h10v-3H7z" fill="#e0a92a" stroke="#8a5a00" stroke-width="1.6"/></svg>',
  };

  /* ---------------- DOM UI ---------------- */
  const css = `
  .kit-ui{position:fixed;inset:0;pointer-events:none;z-index:50;font-family:var(--font,system-ui,sans-serif);color:var(--ink,#222);user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
  .kit-ui *{box-sizing:border-box}
  .kit-ui .ic{width:1.2em;height:1.2em;vertical-align:-.25em;display:inline-block;flex:none}
  .kit-top{position:absolute;left:0;right:0;top:0;display:flex;gap:8px;padding:10px 12px;align-items:center;pointer-events:none}
  .kit-pill{pointer-events:auto;background:var(--pill,rgba(0,0,0,.45));color:var(--pillInk,#fff);border-radius:999px;padding:5px 12px 5px 6px;font-weight:800;font-size:16px;display:flex;align-items:center;gap:6px;min-width:64px;box-shadow:0 2px 0 rgba(0,0,0,.25)}
  .kit-pill.bump{animation:kitBump .25s}
  @keyframes kitBump{50%{transform:scale(1.18)}}
  .kit-grow{flex:1}
  .kit-ib{pointer-events:auto;border:0;background:var(--pill,rgba(0,0,0,.45));color:var(--pillInk,#fff);width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.25);position:relative}
  .kit-ib:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.25)}
  .kit-dot{position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:#ff3b3b;border:2px solid #fff;animation:kitPulse 1s infinite}
  @keyframes kitPulse{50%{transform:scale(1.25)}}
  .kit-layer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;background:var(--scrim,rgba(10,10,20,.55));animation:kitFade .2s;padding:16px}
  @keyframes kitFade{from{opacity:0}}
  .kit-panel{background:var(--panel,#fff8ea);color:var(--ink,#222);border-radius:var(--radius,18px);border:var(--panelBorder,3px solid #222);box-shadow:var(--panelShadow,0 8px 0 #222);width:min(420px,100%);max-height:min(92vh,100%);display:flex;flex-direction:column;animation:kitPop .35s cubic-bezier(.2,1.6,.4,1);overflow:hidden}
  .kit-panel.wide{width:min(620px,100%)}
  @keyframes kitPop{from{transform:scale(.6);opacity:0}}
  .kit-ph{padding:14px 16px 6px;font-size:24px;font-weight:900;text-align:center;font-family:var(--titleFont,inherit);letter-spacing:.5px}
  .kit-pb{padding:8px 16px;overflow:auto;flex:1;text-align:center;font-size:15px;line-height:1.35}
  .kit-pf{padding:10px 16px 16px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .kit-btn{pointer-events:auto;border:var(--btnBorder,3px solid #222);background:var(--btn,#ffd34d);color:var(--btnInk,#222);font:inherit;font-weight:900;font-size:18px;padding:10px 18px;border-radius:var(--btnRadius,14px);cursor:pointer;box-shadow:0 4px 0 var(--btnShadow,#222);display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;transition:transform .05s}
  .kit-btn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--btnShadow,#222)}
  .kit-btn.ad{background:var(--adBtn,#7ee07e)}
  .kit-btn.ghost{background:transparent;box-shadow:none;border-color:transparent;font-size:15px;opacity:.75;min-height:36px}
  .kit-btn.big{font-size:26px;padding:14px 34px;min-height:64px}
  .kit-btn.sm{font-size:14px;padding:6px 10px;min-height:36px;border-width:2px;box-shadow:0 3px 0 var(--btnShadow,#222)}
  .kit-btn[disabled]{filter:grayscale(1);opacity:.55;pointer-events:none}
  .kit-btn .ic{width:1.1em;height:1.1em}
  .kit-toast{position:absolute;left:50%;top:70px;transform:translateX(-50%);background:rgba(20,20,20,.88);color:#fff;padding:10px 16px;border-radius:12px;font-weight:700;font-size:15px;animation:kitToast 2.4s forwards;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}
  @keyframes kitToast{0%{opacity:0;transform:translate(-50%,-10px)}10%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
  .kit-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
  .kit-cell{border:2px solid rgba(0,0,0,.25);border-radius:12px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:800;font-size:13px;background:rgba(255,255,255,.5)}
  .kit-cell.on{background:var(--good,#b8f0b0);border-color:#2a9d5c}
  .kit-cell.today{outline:3px solid var(--accent,#ff8a3d);animation:kitPulse 1.2s infinite}
  .kit-cell.got{opacity:.5}
  .kit-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;background:rgba(0,0,0,.06);margin:6px 0;text-align:left}
  .kit-row .grow{flex:1}
  .kit-bar{height:10px;border-radius:6px;background:rgba(0,0,0,.15);overflow:hidden;margin-top:4px}
  .kit-bar>i{display:block;height:100%;background:var(--accent,#ff8a3d);border-radius:6px}
  .kit-wheel{width:260px;height:260px;margin:6px auto;position:relative}
  .kit-wheel svg{width:100%;height:100%;transition:transform 4.2s cubic-bezier(.12,.8,.18,1)}
  .kit-wheel .ptr{position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:26px solid #e03a3a;filter:drop-shadow(0 2px 0 #222)}
  .kit-chest{width:140px;margin:10px auto;cursor:pointer;animation:kitWiggle .6s infinite}
  .kit-chest.open{animation:kitPop .4s}
  .kit-chest svg{width:100%}
  @keyframes kitWiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
  .kit-big{font-size:34px;font-weight:900;margin:6px 0}
  .kit-fly{position:absolute;width:26px;height:26px;pointer-events:none;z-index:60}
  .kit-fly svg{width:100%;height:100%}
  .kit-note{font-size:13px;opacity:.7}
  .kit-tabs{display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap}
  .kit-tab{border:2px solid rgba(0,0,0,.3);border-radius:10px;padding:6px 12px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.4);font:inherit;font-weight:800;color:inherit}
  .kit-tab.on{background:var(--accent,#ff8a3d);color:#fff;border-color:transparent}
  @media (max-width:520px){.kit-top{gap:5px;padding:8px}.kit-ib{width:34px;height:34px;font-size:17px;border-radius:10px}.kit-pill{font-size:14px;min-width:0;padding:4px 8px 4px 4px}.kit-hide-narrow{display:none!important}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  K.el = el;
  K.ui = {
    root: null, top: null, layers: [],
    init() {
      this.root = el('div', 'kit-ui');
      document.body.appendChild(this.root);
      this.top = el('div', 'kit-top');
      this.root.appendChild(this.top);
    },
    hudPill(icon, id) {
      const p = el('div', 'kit-pill', icon + '<span></span>');
      p.dataset.id = id; this.top.appendChild(p);
      return { el: p, set: (v) => { p.lastChild.textContent = v; }, bump: () => { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); } };
    },
    iconBtn(icon, onClick, title) {
      const b = el('button', 'kit-ib', icon); b.title = title || '';
      b.addEventListener('click', (e) => { e.stopPropagation(); A.play('click'); onClick(); });
      this.top.appendChild(b);
      b.dot = (on) => { let d = b.querySelector('.kit-dot'); if (on && !d) b.appendChild(el('span', 'kit-dot')); if (!on && d) d.remove(); };
      return b;
    },
    spacer() { this.top.appendChild(el('div', 'kit-grow')); },
    btn(label, cls, onClick) {
      const b = el('button', 'kit-btn ' + (cls || ''), label);
      b.addEventListener('click', (e) => { e.stopPropagation(); A.play('click'); onClick && onClick(b); });
      return b;
    },
    adBtn(label, onReward, cls) {
      const b = this.btn(K.icon.ad + '<span>' + label + '</span>', 'ad ' + (cls || ''), async () => {
        b.disabled = true;
        const ok = await K.ads.rewarded();
        b.disabled = false;
        if (ok) onReward(b);
      });
      return b;
    },
    panel(o) {
      const layer = el('div', 'kit-layer');
      const p = el('div', 'kit-panel ' + (o.cls || ''));
      if (o.title) p.appendChild(el('div', 'kit-ph', o.title));
      const body = el('div', 'kit-pb');
      if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
      p.appendChild(body);
      const foot = el('div', 'kit-pf');
      (o.buttons || []).forEach((b) => foot.appendChild(b));
      if (o.buttons && o.buttons.length) p.appendChild(foot);
      layer.appendChild(p);
      const close = () => { layer.remove(); const i = this.layers.indexOf(api); if (i >= 0) this.layers.splice(i, 1); o.onClose && o.onClose(); };
      if (o.closable !== false) layer.addEventListener('click', (e) => { if (e.target === layer) { A.play('click'); close(); } });
      this.root.appendChild(layer);
      const api = { layer, panel: p, body, foot, close };
      this.layers.push(api);
      return api;
    },
    closeAll() { this.layers.slice().forEach((l) => l.close()); },
    anyOpen() { return this.layers.length > 0; },
    toast(msg) {
      const t = el('div', 'kit-toast'); t.textContent = msg; this.root.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    },
    // coins flying to a HUD pill, from screen point
    fly(icon, x, y, target, n, onEach) {
      const tr = target.getBoundingClientRect();
      n = Math.min(n || 8, 14);
      for (let i = 0; i < n; i++) {
        const f = el('div', 'kit-fly', icon);
        this.root.appendChild(f);
        const sx = x + K.rand(-40, 40), sy = y + K.rand(-40, 40);
        f.style.left = x + 'px'; f.style.top = y + 'px';
        const t0 = now(), d1 = 250, d2 = 450 + i * 40;
        const step = () => {
          const t = now() - t0;
          if (t < d1) { const k = K.ease.outCubic(t / d1); f.style.left = K.lerp(x, sx, k) - 13 + 'px'; f.style.top = K.lerp(y, sy, k) - 13 + 'px'; }
          else {
            const k = K.ease.inQuad(Math.min(1, (t - d1) / d2));
            f.style.left = K.lerp(sx, tr.left + tr.width * 0.2, k) - 13 + 'px'; f.style.top = K.lerp(sy, tr.top + tr.height / 2, k) - 13 + 'px';
            f.style.transform = 'scale(' + (1 - k * 0.4) + ')';
            if (k >= 1) { f.remove(); A.play('coin', 1 + i * 0.03); onEach && onEach(i); return; }
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
  };

  /* ---------------- Meta economy ---------------- */
  const DAY = 86400000;
  const dayIndex = (t) => Math.floor((t - new Date().getTimezoneOffset() * 60000) / DAY);
  K.meta = {
    cfg: null, s: null, hud: {},
    // cfg: {missions:[{stat,base,text:{en,pt},type:'sum'|'max'}], coinScale:()=>number, onChange:()=>{} , wheelIcon}
    init(cfg) {
      this.cfg = cfg;
      const s = (this.s = K.save.data.meta = deepMerge({ coins: 0, gems: 0, xp: 0, lvl: 1, daily: { last: -1, streak: 0 }, wheel: { next: 0, adSpins: 0, adDay: -1 }, gift: { next: 0 }, missions: [], mDone: 0, stats: {}, mDay: -1, sfx: true, music: true, first: Date.now() }, K.save.data.meta || {}));
      A.setSfx(s.sfx); A.setMusic(s.music);
      this.refreshMissions();
      K.save.mark();
    },
    scale() { return this.cfg.coinScale ? Math.max(1, this.cfg.coinScale()) : 1; },
    addCoins(n, from) {
      n = Math.round(n);
      this.s.coins += n; K.save.mark();
      if (n > 0) this.track('_coins', n);
      if (from && this.hud.coins && n > 0) {
        const target = this.hud.coins.el;
        this.hud.coins.set(K.fmt(this.s.coins - n));
        K.ui.fly(K.icon.coin, from.x, from.y, target, Math.min(12, 3 + Math.floor(Math.log2(1 + n))), () => { this.hud.coins.bump(); });
        setTimeout(() => this.updateHud(), 1100);
      } else this.updateHud();
      this.cfg.onChange && this.cfg.onChange();
    },
    spend(n) {
      if (this.s.coins < n) { K.ui.toast(K.t('notEnough')); A.play('error'); return false; }
      this.s.coins -= n; K.save.mark(); this.updateHud(); A.play('buy'); this.cfg.onChange && this.cfg.onChange(); return true;
    },
    addGems(n, from) {
      this.s.gems += n; K.save.mark();
      if (from && this.hud.gems) K.ui.fly(K.icon.gem, from.x, from.y, this.hud.gems.el, Math.min(10, n), () => this.hud.gems.bump());
      setTimeout(() => this.updateHud(), from ? 1000 : 0);
      A.play('gem');
      this.cfg.onChange && this.cfg.onChange();
    },
    spendGems(n) {
      if (this.s.gems < n) { K.ui.toast(K.t('notEnoughGems')); A.play('error'); return false; }
      this.s.gems -= n; K.save.mark(); this.updateHud(); A.play('buy'); this.cfg.onChange && this.cfg.onChange(); return true;
    },
    xpNeed(l) { return Math.floor(60 * Math.pow(l, 1.45)); },
    addXp(n) {
      this.s.xp += n;
      let up = false;
      while (this.s.xp >= this.xpNeed(this.s.lvl)) { this.s.xp -= this.xpNeed(this.s.lvl); this.s.lvl++; up = true; }
      K.save.mark(); this.updateHud();
      if (up) { this.pendingLevelUp = true; }
      return up;
    },
    // call at a natural break (menu/game over) to show pending level-up chest
    showPending(done) {
      if (this.pendingLevelUp) { this.pendingLevelUp = false; this.chest(K.t('levelUp') + ' ' + K.t('level') + ' ' + this.s.lvl, Math.round(40 * this.s.lvl * this.scale()), 1 + Math.floor(this.s.lvl / 3), done); return true; }
      done && done(); return false;
    },
    track(stat, n) {
      const st = this.s.stats; st[stat] = (st[stat] || 0) + n;
      for (const m of this.s.missions) if (m.stat === stat && !m.done && m.type !== 'max') { m.p = Math.min(m.target, m.p + n); if (m.p >= m.target) this.completeMission(m); }
      K.save.mark();
    },
    trackMax(stat, v) {
      const st = this.s.stats; st['max_' + stat] = Math.max(st['max_' + stat] || 0, v);
      for (const m of this.s.missions) if (m.stat === stat && !m.done && m.type === 'max') { m.p = Math.max(m.p, Math.min(v, m.target)); if (m.p >= m.target) this.completeMission(m); }
      K.save.mark();
    },
    completeMission(m) { m.done = true; A.play('power'); K.ui.toast('✔ ' + this.missionText(m)); this.updateDots(); },
    missionText(m) { return K.t(m.text, { n: K.fmt(m.target) }); },
    newMission(exclude) {
      const pool = this.cfg.missions.filter((t) => !exclude.includes(t.stat));
      const tpl = K.pick(pool.length ? pool : this.cfg.missions);
      const tier = 1 + Math.floor(this.s.lvl / 3) * 0.5 + Math.random() * 0.5;
      let target = Math.max(1, Math.round(tpl.base * (tpl.type === 'max' ? Math.min(3, 1 + (tier - 1) * 0.35) : tier)));
      if (tpl.cap) target = Math.min(tpl.cap, target);
      return { stat: tpl.stat, type: tpl.type || 'sum', text: tpl.text, target, p: 0, done: false, claimed: false, r: Math.round((tpl.reward || 60) * tier) };
    },
    refreshMissions() {
      const d = dayIndex(Date.now());
      if (this.s.mDay !== d) { this.s.mDay = d; this.s.missions = []; }
      while (this.s.missions.length < 3) this.s.missions.push(this.newMission(this.s.missions.map((m) => m.stat)));
    },
    // --- availability checks for notification dots
    dailyReady() { return this.s.daily.last !== dayIndex(Date.now()); },
    wheelReady() { return Date.now() >= this.s.wheel.next; },
    giftReady() { return Date.now() >= this.s.gift.next; },
    missionReady() { return this.s.missions.some((m) => m.done && !m.claimed); },
    updateHud() {
      if (this.hud.coins) this.hud.coins.set(K.fmt(this.s.coins));
      if (this.hud.gems) this.hud.gems.set(K.fmt(this.s.gems));
      if (this.hud.lvl) this.hud.lvl.set(this.s.lvl);
    },
    updateDots() {
      const b = this.buttons || {};
      b.daily && b.daily.dot(this.dailyReady());
      b.wheel && b.wheel.dot(this.wheelReady());
      b.missions && b.missions.dot(this.missionReady());
      b.gift && b.gift.dot(this.giftReady());
    },
    // standard HUD: coins, gems + menu buttons
    buildHud(opts) {
      opts = opts || {};
      this.hud.coins = K.ui.hudPill(opts.coinIcon || K.icon.coin, 'coins');
      if (opts.gems !== false) this.hud.gems = K.ui.hudPill(K.icon.gem, 'gems');
      K.ui.spacer();
      this.buttons = {};
      if (opts.extra) opts.extra.forEach((e) => (this.buttons[e.id] = K.ui.iconBtn(e.icon, e.fn, e.title)));
      this.buttons.gift = K.ui.iconBtn(K.icon.gift, () => this.openGift(), K.t('freeGift'));
      this.buttons.daily = K.ui.iconBtn(K.icon.cal, () => this.openDaily(), K.t('daily'));
      this.buttons.wheel = K.ui.iconBtn(K.icon.wheel, () => this.openWheel(), K.t('wheel'));
      this.buttons.missions = K.ui.iconBtn(K.icon.list, () => this.openMissions(), K.t('missions'));
      this.buttons.settings = K.ui.iconBtn(opts.pauseIcon ? K.icon.pause : K.icon.gear, () => (opts.onSettings ? opts.onSettings() : this.openSettings()), K.t('settings'));
      this.updateHud(); this.updateDots();
      setInterval(() => { this.updateDots(); this.refreshMissions(); }, 5000);
    },
    setMenuButtonsVisible(v) { const b = this.buttons || {}; ['gift', 'daily', 'wheel', 'missions'].forEach((k) => b[k] && (b[k].style.display = v ? '' : 'none')); },
    // --- chest (used for level ups and rewards)
    chest(title, coins, gems, done) {
      const body = el('div');
      body.innerHTML = `<div class="kit-chest">${K.icon.chest}</div><div class="kit-note">${K.t('openChest')}</div>`;
      const pnl = K.ui.panel({ title, body, closable: false });
      const chestEl = body.querySelector('.kit-chest');
      A.play('levelup');
      K.game.happy();
      let opened = false;
      chestEl.addEventListener('click', () => {
        if (opened) return; opened = true;
        A.play('chest');
        chestEl.classList.add('open');
        body.innerHTML = `<div class="kit-big">${K.icon.coin} ${K.fmt(coins)}</div>` + (gems ? `<div class="kit-big">${K.icon.gem} ${gems}</div>` : '');
        const r = pnl.panel.getBoundingClientRect();
        const pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const take = (mult) => { this.addCoins(coins * mult, pt); if (gems) this.addGems(gems * mult, pt); pnl.close(); done && done(); };
        pnl.foot.innerHTML = '';
        pnl.foot.appendChild(K.ui.adBtn(K.t('x3'), () => take(3)));
        pnl.foot.appendChild(K.ui.btn(K.t('claim'), '', () => take(1)));
        if (!pnl.foot.parentNode) pnl.panel.appendChild(pnl.foot);
      });
    },
    // --- daily reward (7-day cycle, grows)
    dailyAmount(i) { return Math.round([100, 150, 250, 350, 500, 700, 1200][i % 7] * this.scale()); },
    openDaily() {
      const d = dayIndex(Date.now()), s = this.s.daily;
      if (s.last < d - 1) s.streak = 0;
      const ready = s.last !== d;
      const idx = ready ? s.streak % 7 : (s.streak - 1 + 7) % 7;
      const grid = el('div', 'kit-grid');
      for (let i = 0; i < 7; i++) {
        const c = el('div', 'kit-cell' + (i < idx || (!ready && i === idx) ? ' got on' : '') + (ready && i === idx ? ' today' : ''),
          `<div>${K.t('day')} ${i + 1}</div>${i === 6 ? K.icon.gem + ' 5 +' : ''}${K.icon.coin}<div>${K.fmt(this.dailyAmount(i))}</div>`);
        grid.appendChild(c);
      }
      const body = el('div'); body.appendChild(grid); body.appendChild(el('p', 'kit-note', K.t('streak')));
      const btns = [];
      const pnl = K.ui.panel({ title: K.t('daily'), body, buttons: btns });
      const claim = (mult) => {
        const amt = this.dailyAmount(idx) * mult;
        s.last = d; s.streak++;
        const r = pnl.panel.getBoundingClientRect();
        this.addCoins(amt, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        if (idx === 6) this.addGems(5 * mult);
        K.save.mark(); this.updateDots(); pnl.close();
      };
      if (ready) {
        pnl.foot.appendChild(K.ui.adBtn(K.t('x2'), () => claim(2)));
        pnl.foot.appendChild(K.ui.btn(K.t('claim'), '', () => claim(1)));
      } else pnl.foot.appendChild(K.ui.btn(K.t('tomorrow') + ' ✓', '', () => pnl.close()));
      pnl.panel.appendChild(pnl.foot);
    },
    // --- lucky wheel: free every 4h + up to 6 ad spins per day
    wheelPrizes() {
      const sc = this.scale();
      return [
        { t: 'c', v: Math.round(50 * sc), col: '#f7d154' }, { t: 'g', v: 2, col: '#6fd3e8' }, { t: 'c', v: Math.round(120 * sc), col: '#f59e5b' },
        { t: 'c', v: Math.round(80 * sc), col: '#f7d154' }, { t: 'g', v: 5, col: '#6fd3e8' }, { t: 'c', v: Math.round(300 * sc), col: '#ef6b6b' },
        { t: 'c', v: Math.round(60 * sc), col: '#f7d154' }, { t: 'g', v: 10, col: '#b28cf0' },
      ];
    },
    openWheel() {
      const w = this.s.wheel, d = dayIndex(Date.now());
      if (w.adDay !== d) { w.adDay = d; w.adSpins = 0; }
      const prizes = this.wheelPrizes(), n = prizes.length;
      let svg = '<svg viewBox="-100 -100 200 200">';
      prizes.forEach((p, i) => {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + (Math.PI * 2) / n;
        svg += `<path d="M0 0L${Math.cos(a0) * 95} ${Math.sin(a0) * 95}A95 95 0 0 1 ${Math.cos(a1) * 95} ${Math.sin(a1) * 95}Z" fill="${p.col}" stroke="#222" stroke-width="2"/>`;
        const am = (a0 + a1) / 2, deg = (am * 180) / Math.PI + 90;
        svg += `<g transform="rotate(${deg}) translate(0 -62)"><text text-anchor="middle" font-size="15" font-weight="900" fill="#222" font-family="system-ui">${p.t === 'g' ? '◆' : ''}${K.fmt(p.v)}</text></g>`;
      });
      svg += '<circle r="95" fill="none" stroke="#222" stroke-width="5"/><circle r="12" fill="#fff" stroke="#222" stroke-width="3"/></svg>';
      const body = el('div');
      body.innerHTML = `<div class="kit-wheel"><div class="ptr"></div>${svg}</div><div class="kit-note wn"></div>`;
      const pnl = K.ui.panel({ title: K.t('wheel'), body });
      pnl.panel.appendChild(pnl.foot);
      const svgEl = body.querySelector('svg'), note = body.querySelector('.wn');
      let rot = 0, spinning = false;
      const spin = () => {
        spinning = true; render();
        const idx = Math.floor(Math.random() * n);
        rot += 360 * 6 + (360 - (idx / n) * 360 - (rot % 360));
        svgEl.style.transform = `rotate(${rot}deg)`;
        let ticks = 0;
        const tk = setInterval(() => { A.play('tick', 1 + Math.random() * 0.2); if (++ticks > 26) clearInterval(tk); }, 150);
        setTimeout(() => {
          spinning = false;
          const p = prizes[idx];
          const r = svgEl.getBoundingClientRect(), pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          if (p.t === 'c') this.addCoins(p.v, pt); else this.addGems(p.v, pt);
          A.play('win'); this.updateDots(); render();
        }, 4300);
      };
      const render = () => {
        pnl.foot.innerHTML = '';
        if (spinning) { note.textContent = ''; return; }
        if (this.wheelReady()) {
          pnl.foot.appendChild(K.ui.btn(K.t('spinFree'), 'big', () => { w.next = Date.now() + 4 * 3600000; K.save.mark(); spin(); }));
        } else {
          note.textContent = K.t('nextFree') + ' ' + K.fmtTime((w.next - Date.now()) / 1000);
          if (w.adSpins < 6) pnl.foot.appendChild(K.ui.adBtn(K.t('spinAd') + ` (${6 - w.adSpins})`, () => { w.adSpins++; K.save.mark(); spin(); }));
          pnl.foot.appendChild(K.ui.btn(K.t('close'), 'ghost', () => pnl.close()));
        }
      };
      render();
    },
    // --- free gift: every 8 min via ad
    openGift() {
      const amt = Math.round(150 * this.scale());
      const body = el('div');
      const ready = this.giftReady();
      body.innerHTML = `<div class="kit-chest" style="animation:none">${K.icon.gift.replace('class="ic"', 'style="width:120px;height:120px"')}</div><div class="kit-big">${K.icon.coin} ${K.fmt(amt)} + ${K.icon.gem} 3</div>` +
        (ready ? '' : `<div class="kit-note">${K.fmtTime((this.s.gift.next - Date.now()) / 1000)}</div>`);
      const pnl = K.ui.panel({ title: K.t('freeGift'), body });
      if (ready) pnl.foot.appendChild(K.ui.adBtn(K.t('claim'), () => {
        this.s.gift.next = Date.now() + 8 * 60000; K.save.mark();
        const r = pnl.panel.getBoundingClientRect(), pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        this.addCoins(amt, pt); this.addGems(3, pt); this.updateDots(); pnl.close();
      }));
      pnl.foot.appendChild(K.ui.btn(K.t('close'), 'ghost', () => pnl.close()));
      pnl.panel.appendChild(pnl.foot);
    },
    // --- missions
    openMissions() {
      this.refreshMissions();
      const body = el('div');
      const pnl = K.ui.panel({ title: K.t('missions'), body });
      const render = () => {
        body.innerHTML = '';
        const lv = el('div', 'kit-row', `${K.icon.star}<div class="grow"><b>${K.t('level')} ${this.s.lvl}</b><div class="kit-bar"><i style="width:${(100 * this.s.xp) / this.xpNeed(this.s.lvl)}%"></i></div></div>`);
        body.appendChild(lv);
        this.s.missions.forEach((m, i) => {
          const row = el('div', 'kit-row', `<div class="grow"><b>${this.missionText(m)}</b><div class="kit-bar"><i style="width:${(100 * m.p) / m.target}%"></i></div><div class="kit-note">${K.fmt(m.p)} / ${K.fmt(m.target)} · ${K.icon.coin} ${K.fmt(m.r * this.scale())}</div></div>`);
          if (m.claimed) row.appendChild(el('b', '', '✓'));
          else if (m.done) row.appendChild(K.ui.btn(K.t('claim'), 'sm', (b) => {
            m.claimed = true;
            const r = b.getBoundingClientRect();
            this.addCoins(m.r * this.scale(), { x: r.left, y: r.top });
            this.addXp(25); this.s.mDone++;
            this.s.missions[i] = this.newMission(this.s.missions.map((x) => x.stat));
            K.save.mark(); this.updateDots(); render();
          }));
          else row.appendChild(K.ui.adBtn('', () => { this.s.missions[i] = this.newMission(this.s.missions.map((x) => x.stat)); K.save.mark(); render(); }, 'sm'));
          body.appendChild(row);
        });
        body.appendChild(el('div', 'kit-note', '▶ = ' + K.t('reroll')));
      };
      render();
      pnl.foot.appendChild(K.ui.btn(K.t('close'), '', () => pnl.close()));
      pnl.panel.appendChild(pnl.foot);
    },
    openSettings(extraButtons) {
      const body = el('div');
      const pnl = K.ui.panel({ title: K.t('settings'), body });
      const render = () => {
        body.innerHTML = '';
        const a = K.ui.btn((this.s.sfx ? '🔊 ' : '🔇 ') + K.t('sound'), '', () => { this.s.sfx = !this.s.sfx; A.setSfx(this.s.sfx); K.save.mark(); render(); });
        const m = K.ui.btn((this.s.music ? '♫ ' : '✕ ') + K.t('music'), '', () => { this.s.music = !this.s.music; A.setMusic(this.s.music); K.save.mark(); render(); });
        a.style.margin = m.style.margin = '6px';
        body.appendChild(a); body.appendChild(m);
        const st = this.s.stats;
        body.appendChild(el('div', 'kit-note', `${K.t('level')} ${this.s.lvl} · ${K.t('missions')} ${this.s.mDone}`));
        if (this.cfg.howTo) body.appendChild(el('p', 'kit-note', '<b>' + K.t('howTo') + ':</b> ' + K.t(this.cfg.howTo)));
        void st;
      };
      render();
      (extraButtons || []).forEach((b) => pnl.foot.appendChild(b));
      pnl.foot.appendChild(K.ui.btn(K.t('close'), '', () => pnl.close()));
      pnl.panel.appendChild(pnl.foot);
      return pnl;
    },
  };

  /* ---------------- boot helper ---------------- */
  K.boot = function (gameId, defaults, fn) {
    K.game.loadingStart();
    K.sdkReady.then(() => {
      K.save.init(gameId, defaults);
      K.ui.init();
      try { fn(); } finally { K.game.loadingStop(); }
    });
  };
})();

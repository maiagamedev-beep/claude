import * as THREE from 'three';
import * as A from './assets.js';
import { LINES } from './econ.js';

export const LD = 3.3;             // distance between lines along z
const Y_BELT = 0.4;               // height of the belt surface
const X_HOP = -4.6, X_IN0 = -4.1, X_IN1 = -0.1, X_M = 0.5, X_OUT0 = 1.1, X_OUT1 = 6.1, X_SHIP = 6.6;
const Z_DOCK = -3.2;
export const BAY = { x0: -5.6, x1: 7.4 };
export const COLORS = ['#f2d4a9', '#f6c3d3', '#dccdf2', '#f7e0a0', '#f3c98a', '#f2b59b', '#f5bfa0', '#c6e5da', '#c8def3', '#f8c9d6'];
const RAW_SIZE = [0.46, 0.3, 0.32, 0.5, 0.4, 0.42, 0.38, 0.56, 0.34, 0.38];
const PROD_SIZE = [0.42, 0.5, 0.42, 0.56, 0.58, 0.52, 0.64, 0.4, 0.5, 0.62];
const MAX_PER_LINE = 26;
const MAX_SHIP = 60;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#cfc7ba'; g.fillRect(0, 0, w, h);
    // concrete speckle
    for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(90,80,70,0.05)' : 'rgba(255,255,255,0.06)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // slabs
    g.strokeStyle = 'rgba(95,85,75,0.18)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
  }, [10, 30]);
}

function bayTex(color, locked) {
  return canvasTex(1024, 224, (g, w, h) => {
    const r = 26;
    g.clearRect(0, 0, w, h);
    g.fillStyle = locked ? '#b9b2a7' : color;
    g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, r); g.fill();
    if (locked) {
      g.save(); g.clip();
      g.fillStyle = 'rgba(60,55,50,0.10)';
      for (let x = -h; x < w; x += 44) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + 22, 0); g.lineTo(x + 22, h); g.fill(); }
      g.restore();
    } else {
      // soft tile grid
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
      for (let x = 6 + 64; x < w - 6; x += 64) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, h - 10); g.stroke(); }
      g.beginPath(); g.moveTo(10, h / 2); g.lineTo(w - 10, h / 2); g.stroke();
    }
    g.lineWidth = 8; g.strokeStyle = locked ? 'rgba(80,72,64,0.35)' : 'rgba(255,255,255,0.9)';
    g.setLineDash(locked ? [26, 18] : []);
    g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, r - 8); g.stroke();
  });
}

function hazardTex() {
  return canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#f2b632'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2d2a26';
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + 16, 0); g.lineTo(x + 16, h); g.fill(); }
  }, [1, 1]);
}

export class World {
  constructor(canvas) {
    const lowEnd = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    this.lowEnd = lowEnd;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.75 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9dfcf');
    scene.fog = new THREE.Fog('#e9dfcf', 30, 60);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 120);
    const hemi = new THREE.HemisphereLight('#fff6ea', '#9c8f84', 1.35); scene.add(hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff1dc', 2.2);
    sun.castShadow = true; sun.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
    const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);
    const fill = new THREE.DirectionalLight('#dfe8ff', 0.45); fill.position.set(-8, 6, 10); scene.add(fill);

    this.lines = [];
    this.targetZ = 0; this.camZ = 0; this.vel = 0;
    this.t = 0;
    this.fx = [];
  }

  build(nLines) {
    const scene = this.scene;
    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 180), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 60); floor.receiveShadow = true; scene.add(floor);

    // back wall with windows and the loading door
    const wall = new THREE.Group();
    for (let x = -14; x <= 16; x++) {
      const nm = x === 6 || x === 7 ? null : (x % 3 === 0 ? 'structure-window' : 'structure-wall');
      if (!nm) continue;
      const p = A.prop(nm); p.position.set(x, 0, Z_DOCK - 2.6); wall.add(p);
    }
    const door = A.prop('structure-doorway-wide'); door.position.set(6.5, 0, Z_DOCK - 2.6); wall.add(door);
    scene.add(wall);
    // dock: truck + crates
    this.truck = A.prop('delivery'); this.truck.position.set(X_SHIP + 0.1, 0, Z_DOCK - 1.2); this.truck.rotation.y = Math.PI; this.truck.scale.setScalar(0.9);
    scene.add(this.truck);
    this.truckState = { phase: 'wait', t: 0, load: 0 };
    const deco = [['box-large', -3, Z_DOCK - 0.9, 0.2], ['box-small', -1.8, Z_DOCK - 1.1, -0.3], ['box-small', -2.3, Z_DOCK - 0.5, 0.5], ['box-long', 1.5, Z_DOCK - 1.0, 0],
      ['warning-orange', 5.2, Z_DOCK - 0.3, 0], ['warning-orange', 7.9, Z_DOCK - 0.3, 0], ['cone', 8.6, Z_DOCK + 0.4, 0], ['cone', 8.9, Z_DOCK - 0.1, 0]];
    for (const [n, x, z, ry] of deco) { const p = A.prop(n); p.position.set(x, 0, z); p.rotation.y = ry; scene.add(p); }
    this.beacons = [];

    // hazard strip along the shipping lane
    const hz = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1), new THREE.MeshStandardMaterial({ map: hazardTex(), roughness: 0.9 }));
    hz.rotation.x = -Math.PI / 2; hz.material.map.rotation = Math.PI / 2;
    this.hazard = hz; hz.position.set(X_SHIP + 0.75, 0.005, 0); scene.add(hz);

    // shipping conveyor built lazily as lines unlock
    this.ship = new THREE.Group(); scene.add(this.ship); this.shipLen = 0;
    this.shipItems = [];

    for (let i = 0; i < nLines; i++) this.lines.push(this.makeLine(i));
    // forklift-free logistics: two workers walk crates between the lines and the dock
    this.walkers = ['employee', 'character-male-c'].map((n, k) => {
      const c = A.character(n); c.obj.scale.setScalar(1.55); this.scene.add(c.obj);
      const box = A.prop('box-small'); box.scale.setScalar(0.55); box.position.set(0, 0.62, 0.22); c.obj.add(box);
      c.box = box; c.z = Z_DOCK + 0.8 + k * 3; c.dir = k ? -1 : 1; box.visible = !!k; c.wait = k * 2; c.play('walk', 0);
      return c;
    });
    // instanced products for the shipping conveyor share each line's product mesh
  }

  makeLine(i) {
    const z = i * LD;
    const g = new THREE.Group(); g.position.z = z; this.scene.add(g);
    const L = LINES[i];
    const bayGeo = new THREE.PlaneGeometry(BAY.x1 - BAY.x0, 2.9);
    const bay = new THREE.Mesh(bayGeo, new THREE.MeshStandardMaterial({ map: bayTex(COLORS[i], true), transparent: true, roughness: 0.9 }));
    bay.rotation.x = -Math.PI / 2; bay.position.set((BAY.x0 + BAY.x1) / 2, 0.01, 0); bay.receiveShadow = true;
    g.add(bay);
    const parts = new THREE.Group(); g.add(parts);
    const rawGeo = A.mergedGeo(L.raw, RAW_SIZE[i]);
    const prodGeo = A.mergedGeo(L.product, PROD_SIZE[i]);
    const raw = new THREE.InstancedMesh(rawGeo.geo, rawGeo.mat, MAX_PER_LINE); raw.count = 0; raw.castShadow = true; raw.frustumCulled = false;
    const prod = new THREE.InstancedMesh(prodGeo.geo, prodGeo.mat, MAX_PER_LINE + MAX_SHIP); prod.count = 0; prod.castShadow = true; prod.frustumCulled = false;
    this.scene.add(raw); this.scene.add(prod);
    return { i, z, g, bay, parts, raw, prod, rawItems: [], prodItems: [], onShip: 0, tier: -1, locked: true, mgr: null, mgrOn: false,
      machine: null, pulse: 0, arms: [], cogs: [], spawnAcc: 0, rawAcc: 0, rate: 0, running: false, hint: null };
  }

  // Rebuild a line's machinery for its level (tiers add parts as the line grows).
  setLine(i, lvl, hasMgr) {
    const ln = this.lines[i];
    const locked = lvl <= 0;
    const tier = locked ? -1 : [1, 10, 25, 50, 75, 100, 150, 200, 300].filter((t) => lvl >= t).length;
    ln.g.visible = !locked || i === 0 || !this.lines[i - 1].locked;
    const nx = this.lines[i + 1]; if (nx) nx.g.visible = !nx.locked || !locked;
    if (locked !== ln.locked) {
      ln.locked = locked;
      ln.bay.material.map.dispose(); ln.bay.material.map = bayTex(COLORS[i], locked); ln.bay.material.needsUpdate = true;
      this.rebuildShip();
    }
    if (tier !== ln.tier) {
      const grew = ln.tier >= 0 && tier > ln.tier;
      ln.tier = tier;
      this.buildParts(ln);
      if (grew) this.puff(ln, X_M, 1.2, 14);
    }
    if (hasMgr && !ln.mgr) this.addManager(ln);
  }

  buildParts(ln) {
    const P = ln.parts; while (P.children.length) P.remove(P.children[0]);
    ln.arms = []; ln.cogs = []; ln.beacons = [];
    if (ln.tier < 0) {
      // "for sale" props: a few crates and cones
      const a = A.prop('box-large'); a.position.set(-1.5, 0, -0.3); a.rotation.y = 0.3; P.add(a);
      const b = A.prop('box-small'); b.position.set(-0.5, 0, 0.35); b.rotation.y = -0.4; P.add(b);
      const c = A.prop('cone'); c.position.set(1.4, 0, 0.6); P.add(c);
      const d = A.prop('cone'); d.position.set(2.2, 0, -0.5); P.add(d);
      return;
    }
    const T = ln.tier;
    const add = (name, x, z, ry = 0, s = 1) => { const p = A.prop(name); p.position.set(x, 0, z); p.rotation.y = ry; p.scale.setScalar(s); P.add(p); return p; };
    const belt = T >= 5 ? 'conveyor-long-stripe' : 'conveyor-long';
    add(T >= 7 ? 'hopper-high-square' : 'hopper-high-round', X_HOP, 0);
    add(belt, -3.1, 0); add(belt, -1.1, 0);
    add(belt, 2.1, 0); add(belt, 4.1, 0);
    add(T >= 5 ? 'conveyor-stripe' : 'conveyor', 5.6, 0);
    ln.machine = add(T >= 6 ? 'machine-fortified' : T >= 3 ? 'machine-window' : 'machine', X_M, 0);
    if (T >= 2) { const a = add('robot-arm-a', 2.4, -0.95); ln.arms.push({ o: a, ph: ln.i * 1.7 }); }
    if (T >= 3) add('scanner-low', 4.1, 0);
    if (T >= 4) { const a = add('robot-arm-b', -2.2, -0.95); ln.arms.push({ o: a, ph: ln.i * 1.7 + 2 }); }
    if (T >= 6) { add('box-small', 6.9, -1.0, 0.2); add('box-small', 6.95, -0.45, -0.3); }
    if (T >= 7) { const c = add('cog-a', X_M - 0.95, -0.2); c.rotation.z = Math.PI / 2; c.position.y = 0.62; ln.cogs.push(c); const c2 = add('cog-b', X_M - 0.95, 0.35); c2.rotation.z = Math.PI / 2; c2.position.y = 0.45; ln.cogs.push(c2); }
    if (T >= 8) { add('pipe-glass-large', X_HOP, -1.05, 0, 0.7); add('warning-orange', -5.2, 1.0, 0, 0.8); }
    if (T >= 9) { const a = add('robot-arm-a', 4.2, 1.0, Math.PI); ln.arms.push({ o: a, ph: ln.i + 4 }); }
    // arms: gather joints for procedural animation
    for (const a of ln.arms) {
      a.j = []; a.o.traverse((o) => { if (/^element-/.test(o.name)) a.j.push(o); });
    }
  }

  addManager(ln) {
    const names = ['employee', 'character-female-a', 'character-male-a', 'character-female-c', 'character-male-c', 'character-female-e', 'character-male-e'];
    const nm = names[ln.i % names.length];
    const c = A.character(nm);
    c.obj.scale.setScalar(1.55);
    c.obj.position.set(X_M + 1.0, 0, -1.05); c.obj.rotation.y = -0.35;
    ln.g.add(c.obj);
    ln.mgr = c; c.play('interact-right', 0);
    this.puff(ln, X_M + 1.0, 0.8, 18, '#ffffff');
  }

  rebuildShip() {
    let last = -1; this.lines.forEach((l, i) => { if (!l.locked) last = i; });
    const len = last;
    if (len === this.shipLen) return;
    this.shipLen = len;
    const S = this.ship; while (S.children.length) S.remove(S.children[0]);
    const zEnd = last * LD + 0.5;
    for (let z = Z_DOCK + 0.6; z < zEnd; z += 2) {
      const p = A.prop('conveyor-long'); p.rotation.y = Math.PI / 2; p.position.set(X_SHIP, 0, z + 1); S.add(p);
    }
    this.hazard.scale.y = zEnd - Z_DOCK + 2; this.hazard.position.z = (zEnd + Z_DOCK) / 2;
    this.shipEndZ = zEnd;
  }

  // Called when a line finishes a production cycle.
  cycle(i, speed) {
    const ln = this.lines[i];
    ln.pulse = 1;
    const lastP = ln.prodItems[ln.prodItems.length - 1];
    if (ln.prodItems.length < MAX_PER_LINE && (!lastP || lastP.ship || lastP.x > X_OUT0 - 0.15 + PROD_SIZE[i] * 1.25)) ln.prodItems.push({ x: X_OUT0 - 0.15, z: 0, s: 0, ship: false, rot: Math.random() * 6 });
    if (speed < 2) this.puff(ln, X_M + 0.1, 1.35, 4, '#ffffff', 0.5);
  }

  puff(ln, x, y, n, color = '#fff6e0', size = 1) {
    for (let k = 0; k < n; k++) {
      this.fx.push({ p: new THREE.Vector3(x + (Math.random() - 0.5) * 0.6, y, ln.z + (Math.random() - 0.5) * 0.6),
        v: new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2), life: 0.6 + Math.random() * 0.4, t: 0, s: size * (0.12 + Math.random() * 0.12), color });
    }
  }

  // rate: products per second shown on the line (visual only), running: whether the belt moves
  update(dt, states, render = true) {
    this.t += dt;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), Pp = new THREE.Vector3(), E = new THREE.Euler();
    const beltSpeed = 1.6;
    for (const ln of this.lines) {
      const st = states[ln.i];
      if (ln.locked) { ln.raw.count = 0; ln.prod.count = 0; continue; }
      // raw items flow while the line is running
      if (st.running) {
        ln.rawAcc += dt * Math.min(4, Math.max(0.8, st.rate * 1.2));
        const lastR = ln.rawItems[ln.rawItems.length - 1];
        if (ln.rawAcc >= 1 && ln.rawItems.length < MAX_PER_LINE && (!lastR || lastR.x > X_IN0 - 0.3 + RAW_SIZE[ln.i] * 1.3)) { ln.rawAcc = 0; ln.rawItems.push({ x: X_IN0 - 0.3, y: 1.4, vy: 0, rot: Math.random() * 6 }); }
      }
      let n = 0;
      for (let k = ln.rawItems.length - 1; k >= 0; k--) {
        const it = ln.rawItems[k];
        if (it.y > Y_BELT) { it.vy -= 18 * dt; it.y = Math.max(Y_BELT, it.y + it.vy * dt); it.x += dt * 0.8; }
        else if (st.running || it.x < X_IN1 - 0.6) it.x += beltSpeed * dt * (st.running ? 1 : 0);
        if (it.x > X_IN1 - 0.15) { ln.rawItems.splice(k, 1); continue; }
      }
      for (const it of ln.rawItems) {
        Pp.set(it.x, it.y, ln.z); E.set(0, it.rot, 0); Q.setFromEuler(E); S.setScalar(it.x > X_IN1 - 0.5 ? Math.max(0.01, (X_IN1 - 0.15 - it.x) / 0.35) : 1);
        M.compose(Pp, Q, S); ln.raw.setMatrixAt(n++, M);
      }
      ln.raw.count = n; ln.raw.instanceMatrix.needsUpdate = true;
      // products: out belt, then shipping lane toward the dock
      n = 0;
      for (let k = ln.prodItems.length - 1; k >= 0; k--) {
        const it = ln.prodItems[k];
        it.s = Math.min(1, it.s + dt * 5);
        if (!it.ship) { it.x += beltSpeed * dt; if (it.x >= X_SHIP) { if (ln.onShip >= 3) { ln.prodItems.splice(k, 1); continue; } it.x = X_SHIP; it.ship = true; ln.onShip++; } }
        else { it.z -= beltSpeed * dt; if (ln.z + it.z < Z_DOCK + 0.2) { ln.prodItems.splice(k, 1); ln.onShip--; this.truckState.load++; continue; } }
      }
      for (const it of ln.prodItems) {
        const pop = (it.s < 1 ? 1 + Math.sin(it.s * Math.PI) * 0.35 : 1) * (!it.ship && ln.onShip >= 3 && it.x > X_SHIP - 0.5 ? Math.max(0.05, (X_SHIP - it.x) / 0.5) : 1);
        Pp.set(it.x, Y_BELT, ln.z + it.z); E.set(0, it.rot, 0); Q.setFromEuler(E); S.setScalar(it.s * pop);
        M.compose(Pp, Q, S); ln.prod.setMatrixAt(n++, M);
      }
      ln.prod.count = n; ln.prod.instanceMatrix.needsUpdate = true;
      // machine squash on each cycle
      if (ln.machine) {
        ln.pulse = Math.max(0, ln.pulse - dt * 5);
        const p = ln.pulse, sq = Math.sin(p * Math.PI);
        ln.machine.scale.set(1 + sq * 0.07, 1 - sq * 0.09, 1 + sq * 0.07);
      }
      const spd = st.running ? 1 : 0.15;
      for (const a of ln.arms) {
        a.ph += dt * 1.8 * spd;
        const s = Math.sin(a.ph), c = Math.cos(a.ph * 0.5);
        if (a.j[0]) a.j[0].rotation.y = c * 0.9;
        if (a.j[1]) a.j[1].rotation.x = 0.25 + s * 0.12;
        if (a.j[2]) a.j[2].rotation.x = 0.75 + s * 0.2;
        if (a.j[3]) a.j[3].rotation.x = 0.7 - s * 0.25;
        if (a.j[4]) a.j[4].rotation.x = 0.3;
      }
      for (const c of ln.cogs) c.rotation.x += dt * 2 * spd;
      if (ln.mgr) ln.mgr.mixer.update(dt);
    }
    this.updateTruck(dt);
    const zMax = Math.max(Z_DOCK + 3, (this.shipEndZ || 0) - 0.5);
    for (const w of this.walkers) {
      if (w.wait > 0) { w.wait -= dt; if (w.wait <= 0) { w.dir *= -1; w.play('walk'); } }
      else {
        w.z += w.dir * dt * 1.25;
        if (w.z > zMax || w.z < Z_DOCK + 0.8) { w.z = Math.max(Z_DOCK + 0.8, Math.min(zMax, w.z)); w.wait = 1.2 + Math.random(); w.play('idle'); w.box.visible = w.z > Z_DOCK + 1; }
      }
      w.obj.position.set(8.15, 0, w.z); w.obj.rotation.y = w.dir > 0 ? 0 : Math.PI;
      w.mixer.update(dt);
    }
    this.updateFx(dt);
    this.updateCamera(dt);
    if (render) this.renderer.render(this.scene, this.camera);
  }

  updateTruck(dt) {
    const t = this.truckState, tr = this.truck;
    t.t += dt;
    const z0 = Z_DOCK - 1.2;
    if (t.phase === 'wait') { tr.position.z = z0; if (t.load >= 40 && t.t > 6) { t.phase = 'out'; t.t = 0; } }
    else if (t.phase === 'out') { tr.position.z = z0 - t.t * t.t * 5; if (t.t > 1.6) { t.phase = 'in'; t.t = 0; t.load = 0; } }
    else if (t.phase === 'in') { const k = Math.min(1, t.t / 1.4); tr.position.z = z0 - (1 - k) * (1 - k) * 12; if (k >= 1) { t.phase = 'wait'; t.t = 0; } }
    tr.visible = tr.position.z > Z_DOCK - 10;
  }

  updateFx(dt) {
    if (!this.fxMesh) {
      const geo = new THREE.IcosahedronGeometry(1, 0);
      this.fxMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.9 }), 300);
      this.fxMesh.frustumCulled = false; this.scene.add(this.fxMesh);
    }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    let n = 0; const col = new THREE.Color();
    for (let k = this.fx.length - 1; k >= 0; k--) {
      const f = this.fx[k]; f.t += dt;
      if (f.t >= f.life) { this.fx.splice(k, 1); continue; }
      f.v.y -= 3 * dt; f.v.multiplyScalar(1 - dt * 2); f.p.addScaledVector(f.v, dt);
    }
    for (const f of this.fx) {
      if (n >= 300) break;
      const k = 1 - f.t / f.life; S.setScalar(f.s * (0.4 + k * 0.6));
      M.compose(f.p, Q, S); this.fxMesh.setMatrixAt(n, M); this.fxMesh.setColorAt(n, col.set(f.color)); n++;
    }
    this.fxMesh.count = n; this.fxMesh.instanceMatrix.needsUpdate = true; if (this.fxMesh.instanceColor) this.fxMesh.instanceColor.needsUpdate = true;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep a line fully visible: portrait needs a farther camera
    const portrait = h > w;
    this.portrait = portrait;
    this.camera.fov = portrait ? 34 : 30;
    this.camera.updateProjectionMatrix();
  }

  get minZ() { return -1.5; }
  get maxZ() { let last = 0; this.lines.forEach((l, i) => { if (!l.locked || (i > 0 && !this.lines[i - 1].locked)) last = i; }); return Math.max(this.portrait ? -0.6 : 0, last * LD - (this.portrait ? 3 : 2)); }

  updateCamera(dt) {
    if (!this.dragging) {
      this.targetZ += this.vel * dt; this.vel *= Math.pow(0.02, dt);
    }
    const lo = this.minZ, hi = this.maxZ;
    if (!this.dragging) { if (this.targetZ < lo) this.targetZ += (lo - this.targetZ) * Math.min(1, dt * 8); if (this.targetZ > hi) this.targetZ += (hi - this.targetZ) * Math.min(1, dt * 8); }
    this.camZ += (this.targetZ - this.camZ) * Math.min(1, dt * 10);
    const portrait = this.portrait;
    const aspect = this.camera.aspect;
    // distance chosen so the bay width fits on screen
    const needW = portrait ? 11.6 : 24;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * aspect);
    const dist = Math.max(portrait ? 16 : 17, needW / 2 / Math.tan(hfov / 2) * 1.05);
    const cx = portrait ? 1.3 : -1.6;
    const dir = portrait ? new THREE.Vector3(0.08, 0.9, 0.45).normalize() : new THREE.Vector3(0.14, 0.74, 0.66).normalize();
    const lz = this.camZ + (portrait ? 1.8 : 2.2);
    this.camera.position.set(cx + dir.x * dist, dir.y * dist, lz + dir.z * dist);
    this.camera.lookAt(cx, 0, lz);
    this.sun.position.set(this.camera.position.x * 0 + 6, 16, this.camZ + 10);
    this.sun.target.position.set(0, 0, this.camZ + 1);
  }

  // world (x, y, z) to CSS pixels
  project(x, y, z, out = {}) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    out.x = (v.x + 1) / 2 * this.w; out.y = (1 - v.y) / 2 * this.h; out.vis = v.z < 1;
    return out;
  }

  // CSS pixel -> line index under the pointer (or -1)
  pick(px, py) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(px / this.w * 2 - 1, -(py / this.h) * 2 + 1), this.camera);
    const p = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3), p);
    if (!p) return -1;
    const i = Math.round(p.z / LD);
    if (i < 0 || i >= this.lines.length) return -1;
    if (Math.abs(p.z - i * LD) > 1.5 || p.x < BAY.x0 || p.x > BAY.x1) return -1;
    return i;
  }
  lineZ(i) { return i * LD; }
}
export const XM = X_M;

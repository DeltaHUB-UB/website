// Gura Sfântu Gheorghe — the illustrative flow and the sediment particles (CPU, cheap; see Zăinescu et al. 2019, Fig. 9–11).
// Floods: the river jet leaves the mouth, decelerates on the bar crest and spreads as a plume; sediment settles where it slows.
// Storms: waves break on the bar, the longshore current runs south along the isobaths, the bed is stirred and carried away.
// The field lives on a coarse grid (window W, rebuilt a few times per second); particles sample it bilinearly.
// Speeds are "visual" km/s, not real ones (real: jet ~1–1.8 m/s, longshore current 0.5–2 m/s).
import * as THREE from 'three';
import * as SH from './shaders.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const W = { x0: -5.6, z0: -4.6, n: 128, d: 0.075 };            // field window: 9.6 x 9.6 km
const NP = 4200;                                                  // particle pool
// particle kinds
const RIVER = 0, SED = 1, STIR = 2, LSC = 3;
const COL = [[0.72, 0.86, 0.98], [1.0, 0.88, 0.62], [0.92, 0.72, 0.42], [0.85, 0.95, 1.0]];   // river water, suspended sediment (pale sand), stirred bed, longshore current

export class Flow {
  // channel: [[x, z], …] ending at the mouth; hAt(x, z) → bed height (m); vx: vertical exaggeration
  constructor(channel, hAt, vx) {
    this.ch = channel; this.hAt = hAt; this.vx = vx;
    const n = W.n * W.n;
    this.U = new Float32Array(n); this.V = new Float32Array(n); this.C = new Float32Array(n); this.S = new Float32Array(n);
    this.axis = []; this.sM = 0; this.t = 0; this.acc = [0, 0, 0, 0]; this.next = 0;
    this.q = 1500; this.hs = 1; this.sedMul = 1; this.u0 = 0.2; this.stirCells = [];
    // particles
    const p = this.p = { x: new Float32Array(NP), y: new Float32Array(NP), z: new Float32Array(NP), age: new Float32Array(NP).fill(1e9), life: new Float32Array(NP),
      kind: new Uint8Array(NP), st: new Uint8Array(NP), yb: new Float32Array(NP), sz: new Float32Array(NP), vx: new Float32Array(NP), vz: new Float32Array(NP) };
    // render: instanced quads
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.iP = new THREE.InstancedBufferAttribute(new Float32Array(NP * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iD = new THREE.InstancedBufferAttribute(new Float32Array(NP * 2), 2).setUsage(THREE.DynamicDrawUsage);
    this.iC = new THREE.InstancedBufferAttribute(new Float32Array(NP * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iP', this.iP); g.setAttribute('iD', this.iD); g.setAttribute('iC', this.iC); g.instanceCount = NP;
    this.mat = new THREE.ShaderMaterial({ vertexShader: SH.partVS, fragmentShader: SH.partFS, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide,
      uniforms: { uLen: { value: 0.09 }, uWid: { value: 0.012 } } });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 30;
    // plume texture for the water shader (R = river plume, G = storm-stirred water)
    this.plumeData = new Uint8Array(n * 4);
    this.plume = new THREE.DataTexture(this.plumeData, W.n, W.n, THREE.RGBAFormat);
    this.plume.magFilter = THREE.LinearFilter; this.plume.minFilter = THREE.LinearFilter; this.plume.flipY = false;
    this.rect = new THREE.Vector4(W.x0, W.z0, W.n * W.d, W.n * W.d);
  }
  // forcing: q (m³/s at the mouth), hs (m offshore), sedMul (×3 = before the dams)
  set(q, hs, sedMul = 1) { this.q = q; this.hs = hs; this.sedMul = sedMul; }
  get qf() { return clamp((this.q - 900) / 3100, 0, 1.25); }                 // flood strength 0 … ~1
  get sf() { return clamp((this.hs - 0.9) / 3.6, 0, 1.6); }                  // storm strength 0 … ~1.5
  get qs() { return 1e-5 * Math.pow(Math.max(this.q, 300), 2.0999) / 367 * this.sedMul; }   // suspended load relative to a 4,000 m³/s flood

  /* ---------------------------------------------------------------- the field */
  buildAxis() {
    const ch = this.ch, A = []; let s = 0;
    for (let i = 0; i < ch.length; i++) { if (i) s += Math.hypot(ch[i][0] - ch[i - 1][0], ch[i][1] - ch[i - 1][1]); A.push([ch[i][0], ch[i][1], s]); }
    this.sM = s;
    const a = ch[ch.length - 2], b = ch[ch.length - 1];
    let th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const th0 = th, kap = 0.08 + 0.75 * this.sf - 0.04 * this.qf, ds = 0.1;          // turns right (south) — strongly in storms
    let x = b[0], z = b[1];
    for (let k = 1; k <= 70; k++) {
      th = Math.min(th0 + 1.25, th + kap * ds * (k < 5 ? 0.5 : 1));
      x += Math.cos(th) * ds; z += Math.sin(th) * ds; s += ds; A.push([x, z, s]);
    }
    this.axis = A;
  }
  nearest(x, z) {                       // → [s, n (signed), tx, tz]
    const A = this.axis; let best = 1e9, bs = 0, bn = 0, btx = 1, btz = 0;
    for (let i = 0; i < A.length - 1; i++) {
      const ax = A[i][0], az = A[i][1], dx = A[i + 1][0] - ax, dz = A[i + 1][1] - az, L2 = dx * dx + dz * dz;
      let t = ((x - ax) * dx + (z - az) * dz) / L2; t = clamp(t, 0, 1);
      const px = ax + dx * t, pz = az + dz * t, d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 < best) { best = d2; const L = Math.sqrt(L2); bs = A[i][2] + t * L; btx = dx / L; btz = dz / L; bn = (-(x - px) * btz + (z - pz) * btx) >= 0 ? Math.sqrt(d2) : -Math.sqrt(d2); }
    }
    return [bs, bn, btx, btz];
  }
  buildField(i0 = 0, i1 = W.n) {                // rows i0 … i1-1 (a full pass is spread over a few frames)
    if (i0 === 0) { this.buildAxis(); this.stirNext = []; }
    const { U, V, C, S } = this, qf = this.qf, sf = this.sf, hs = this.hs, qs = Math.min(1.5, this.qs);
    const u0 = this.u0 = 0.1 + 0.32 * Math.pow(qf, 0.7);
    const brk = 1.3 * hs + 0.3, hp = 1.15 * hs + 0.4, lscV = (0.05 + 0.07 * hs) * clamp((hs - 0.7) / 1.5, 0, 1.4);
    const stir = this.stirNext;
    for (let i = i0; i < i1; i++) for (let j = 0; j < W.n; j++) {
      const k = i * W.n + j, x = W.x0 + (j + 0.5) * W.d, z = W.z0 + (i + 0.5) * W.d;
      const h = this.hAt(x, z), d = -h;
      let u = 0, v = 0.012, c = 0, st = 0;                 // weak southward drift everywhere at sea
      if (d > 0.15) {
        // the jet
        const [s, nn, tx, tz] = this.nearest(x, z), sp = s - this.sM;
        let b, U0, prof;
        // past the mouth the jet widens — much faster in a big flood (the plume lifts off past the bar crest and fans out at the surface)
        if (sp < 0) { b = 0.26; U0 = u0 * 0.8; prof = Math.exp(-Math.pow(nn / b, 4)); }
        else { b = 0.3 + (0.34 + 0.46 * qf) * sp * (1 + 0.5 * sf); U0 = u0 * Math.min(1, 1.08 * Math.sqrt(0.3 / b)); prof = Math.exp(-nn * nn / (2 * b * b)); }
        const uj = U0 * prof;
        u += tx * uj; v += tz * uj;
        if (sp > 0) { const spread = (0.4 + 0.45 * qf) * uj * clamp(nn / b, -2.2, 2.2) * Math.min(1, sp / 0.25); u += -tz * spread; v += tx * spread; }   // the jet fans out
        c = (sp < 0 ? 0.55 : Math.exp(-nn * nn / (2 * (1.6 * b) ** 2)) * Math.exp(-sp / (0.9 + 2.4 * qf))) * (0.25 + 0.75 * qs) * (1 - 0.45 * clamp(sf, 0, 1));
        if (sp < -2.5) c *= clamp((sp + 3.5), 0, 1);
        // the longshore current: along the isobaths, southward, strongest around the break depth
        if (lscV > 0 && sp > -0.4) {
          const e = 0.06, gx = (this.hAt(x + e, z) - this.hAt(x - e, z)) / (2 * e), gz = (this.hAt(x, z + e) - this.hAt(x, z - e)) / (2 * e);
          const gl = Math.hypot(gx, gz);
          if (gl > 1e-3) {
            let ttx = -gz / gl, ttz = gx / gl; if (ttz < 0) { ttx = -ttx; ttz = -ttz; }
            const prof2 = Math.exp(-Math.pow((d - hp) / (0.6 * hp + 0.6), 2)) * clamp(d / 0.6, 0, 1);
            u += ttx * lscV * prof2; v += ttz * lscV * prof2;
          }
        }
        // waves stir the bed where they break (and a little beyond)
        st = clamp((hs - 1.0) / 3, 0, 1.3) * Math.exp(-Math.pow(d / (1.5 * brk), 2)) * clamp(d / 0.5, 0, 1);
        if (st > 0.4 && d > 0.4 && d < brk * 1.15 && x > -2.6) stir.push(k);
      }
      U[k] = u; V[k] = v; C[k] = clamp(c, 0, 1); S[k] = clamp(st, 0, 1);
      const o = k * 4; this.plumeData[o] = C[k] * 255; this.plumeData[o + 1] = S[k] * 200; this.plumeData[o + 3] = 255;
    }
    if (i1 >= W.n) { this.stirCells = stir; this.plume.needsUpdate = true; }
  }
  sample(x, z) {
    const fx = (x - W.x0) / W.d - 0.5, fz = (z - W.z0) / W.d - 0.5;
    if (fx < 0 || fz < 0 || fx >= W.n - 1 || fz >= W.n - 1) return [0, 0.012];
    const j = Math.floor(fx), i = Math.floor(fz), a = fx - j, b = fz - i, k = i * W.n + j, n = W.n;
    const U = this.U, V = this.V;
    return [U[k] * (1 - a) * (1 - b) + U[k + 1] * a * (1 - b) + U[k + n] * (1 - a) * b + U[k + n + 1] * a * b,
            V[k] * (1 - a) * (1 - b) + V[k + 1] * a * (1 - b) + V[k + n] * (1 - a) * b + V[k + n + 1] * a * b];
  }

  /* ---------------------------------------------------------------- particles */
  spawn(kind, x, z, y, life, sz) {
    const p = this.p, i = this.next; this.next = (this.next + 1) % NP;
    p.kind[i] = kind; p.x[i] = x; p.z[i] = z; p.y[i] = y; p.age[i] = 0; p.life[i] = life; p.st[i] = 0; p.sz[i] = sz;
    p.yb[i] = this.hAt(x, z) * this.vx / 1000;
  }
  chanPoint(sFromMouth) {                // a point on the channel axis sFromMouth km upstream of the mouth
    const A = this.axis, s = this.sM - sFromMouth;
    for (let i = 0; i < A.length - 1; i++) if (A[i + 1][2] >= s) {
      const t = (s - A[i][2]) / (A[i + 1][2] - A[i][2]), dx = A[i + 1][0] - A[i][0], dz = A[i + 1][1] - A[i][1], L = Math.hypot(dx, dz);
      return [A[i][0] + dx * t, A[i][1] + dz * t, -dz / L, dx / L];
    }
    return [A[0][0], A[0][1], 0, 1];
  }
  update(dt, on = 1) {
    this.t += dt;
    if (this.row == null) { this.buildField(); this.row = 0; }            // first call: the whole field at once
    else { const r1 = Math.min(W.n, this.row + 22); this.buildField(this.row, r1); this.row = r1 >= W.n ? 0 : r1; }
    const qf = this.qf, sf = this.sf, qs = this.qs, p = this.p, Y0 = 0.0015;
    // spawning
    if (on > 0.01) {
      const rate = [(8 + 46 * qf) * on, (10 + 230 * Math.min(1.6, qs)) * on, 80 * sf * sf * on, 36 * sf * on];
      for (let kind = 0; kind < 4; kind++) {
        this.acc[kind] += dt * rate[kind];
        while (this.acc[kind] >= 1) {
          this.acc[kind] -= 1;
          if (kind === RIVER || kind === SED) {
            const [x, z, nx, nz] = this.chanPoint(0.05 + Math.random() * 1.8), o = (Math.random() - 0.5) * (kind === SED ? 0.42 : 0.4);
            this.spawn(kind, x + nx * o, z + nz * o, Y0, kind === RIVER ? 5 + Math.random() * 3 : 9 + Math.random() * 4, kind === RIVER ? 0.8 + Math.random() * 0.5 : 0.7 + Math.random() * 0.6);
          } else if (kind === STIR && this.stirCells.length) {
            const k = this.stirCells[(Math.random() * this.stirCells.length) | 0], x = W.x0 + ((k % W.n) + Math.random()) * W.d, z = W.z0 + (((k / W.n) | 0) + Math.random()) * W.d;
            this.spawn(STIR, x, z, 0, 3 + Math.random() * 3, 0.6 + Math.random() * 0.6);
            const i = (this.next + NP - 1) % NP; p.y[i] = p.yb[i];
          } else if (kind === LSC && this.stirCells.length) {
            const k = this.stirCells[(Math.random() * this.stirCells.length) | 0], x = W.x0 + ((k % W.n) + Math.random()) * W.d, z = W.z0 + (((k / W.n) | 0) + Math.random()) * W.d;
            this.spawn(LSC, x, z, Y0, 2 + Math.random() * 2, 0.9 + Math.random() * 0.6);
          }
        }
      }
    }
    // advection
    const P = this.iP.array, D = this.iD.array, Cc = this.iC.array, vset = 0.42 * this.u0, sedK = this.vx / 1000;
    for (let i = 0; i < NP; i++) {
      if (p.age[i] > p.life[i]) { P[i * 4 + 3] = 0; continue; }
      p.age[i] += dt;
      const kind = p.kind[i];
      let [u, v] = this.sample(p.x[i], p.z[i]);
      if (kind === SED) {
        const sp = Math.hypot(u, v);
        if (p.st[i] === 0 && p.age[i] > 0.6 && sp < vset && Math.random() < dt * 2.2) { p.st[i] = 1; p.yb[i] = this.hAt(p.x[i], p.z[i]) * sedK; }
        if (p.st[i] === 1) {                       // settling: slows down, sinks to the bed
          u *= 0.25; v *= 0.25;
          p.y[i] -= dt * 0.11;
          if (p.y[i] <= p.yb[i] + 0.004) { p.y[i] = p.yb[i] + 0.004; p.st[i] = 2; p.life[i] = p.age[i] + 1.6; }
        }
        if (p.st[i] === 2) { u = 0; v = 0; }
      } else if (kind === STIR) {                  // lifted from the bed, carried by the current
        const top = p.yb[i] * 0.25;
        if (p.y[i] < top) p.y[i] = Math.min(top, p.y[i] + dt * 0.12);
      }
      p.x[i] += u * dt; p.z[i] += v * dt;
      if (kind === RIVER || kind === LSC || (kind === SED && p.st[i] === 0)) {
        const h = this.hAt(p.x[i], p.z[i]); if (h > 0.2) { p.age[i] = 1e9; P[i * 4 + 3] = 0; continue; }
      }
      const f = p.age[i] / p.life[i];
      let a = Math.min(1, p.age[i] * 2.5) * Math.min(1, (1 - f) * 3);
      if (kind === SED && p.st[i] === 2) a *= 0.9;
      P[i * 4] = p.x[i]; P[i * 4 + 1] = p.y[i]; P[i * 4 + 2] = p.z[i]; P[i * 4 + 3] = a * (kind === RIVER ? 0.55 : kind === LSC ? 0.5 : kind === SED ? (p.st[i] === 2 ? 0.55 : 0.22) : 0.95);
      const moving = kind !== SED;                 // sediment = soft round grains (a smooth cloud), the rest = streaks
      D[i * 2] = moving ? u : 0; D[i * 2 + 1] = moving ? v : 0;
      const c = COL[kind], glow = kind === SED && p.st[i] === 2 ? 1.25 : 1;
      Cc[i * 4] = c[0] * glow; Cc[i * 4 + 1] = c[1] * glow; Cc[i * 4 + 2] = c[2] * glow; Cc[i * 4 + 3] = p.sz[i] * (kind === SED ? (p.st[i] ? 0.7 : 0.85 + Math.min(0.8, p.age[i] * 0.2)) : 1);   // sediment clouds spread as they drift
    }
    this.iP.needsUpdate = true; this.iD.needsUpdate = true; this.iC.needsUpdate = true;
  }
  scale(dist) { this.mat.uniforms.uLen.value = 0.0085 * dist; this.mat.uniforms.uWid.value = 0.0012 * dist; }
}

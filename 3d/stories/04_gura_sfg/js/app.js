// Gura Sfântu Gheorghe — "The Battle at the Mouth" — engine (delta-hub). three.js r160, WebGL2.
// The visitor rides on rails through 2004–2017. Time runs with the ride and slows down during big floods and storms;
// the real daily discharge and wave height drive the jet, the waves and the sediment; the sea bed morphs from one yearly
// survey to the next as the floods and storms of the interval happen (morph progress = cumulative "activity").
import * as THREE from 'three';
import { OrbitControls } from '../../../shared/vendor/addons/OrbitControls.js';
import { STOPS, LABELS, ANCHORS, UI, SOURCES, CHANNEL, DAMS, MOUTH_LL, SED } from './story.js';
import { TRIBUTARIES } from '../../01_povestea/js/story.js';
import { EXPO } from '../../../shared/config.js';
import { getLang, toggleLang, onLang, go, startIdle, lastInput, ready, ICON } from '../../../shared/kiosk.js';
import { Bubbles } from '../../../shared/bubbles.js';
import { storyUI } from '../../../shared/storyui.js';
import { cosmos, bgHex } from '../../../shared/cosmos.js';
import * as SH from './shaders.js';
import { Flow } from './flow.js';
import { Chart } from './charts.js';
import { Basin } from './basin.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const Q = new URLSearchParams(location.search);
const HUB = '../../';
const STORY_ID = '04_gura_sfg';
const VX = parseFloat(Q.get('vx')) || 40;        // vertical exaggeration of the bed and the land
const KY = VX / 1000;                             // m → scene km
const CHX = parseFloat(Q.get('cx')) || 2;         // bed change vs the reference survey, drawn ×2 so floods and storms are easy to see
const BX = parseFloat(Q.get('bx')) || 2.2;        // inside the surveyed square: the mouth bar / channel relief against the smooth slope, ×BX
const DMAX = parseFloat(Q.get('dmax')) || 10;     // bed changes are shown between the shore and ~DMAX m depth, where the big ones happen
let LANG = getLang();

/* ------------------------------------------------------------------ data */
async function fetchJSON(name) { const r = await fetch('data/' + name); if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); }
async function fetchBin(name) { const r = await fetch('data/' + name); if (!r.ok) throw new Error(name + ' ' + r.status); return r.arrayBuffer(); }
function setLoad(p, msg) { $('loadbar').style.width = (p * 100).toFixed(0) + '%'; if (msg != null) $('loadmsg').textContent = msg; }
let SD;                                           // story_data.json
let NE, NG, NC, EP, COV, CW, CTX, FOOT, H, BG;       // epochs (Float32 NE·NG·NG, m), cover, context heights, footprint weight, current heights, smooth bed
const OFF = 110;                                  // survey node (0, 0) = context node (110, 110)
const TD = { tday: null, q: null, hs: null, W: null, A: null };   // daily series, story clock, morph activity

function decYear(d) { const y = d.getUTCFullYear(), a = Date.UTC(y, 0, 1), b = Date.UTC(y + 1, 0, 1); return y + (d.getTime() - a) / (b - a); }
function prepSeries() {
  const s = SD.series, n = s.n, t0 = new Date(s.t0 + 'T12:00:00Z');
  TD.tday = new Float64Array(n); TD.q = Float32Array.from(s.q); TD.hs = Float32Array.from(s.hs);
  for (let k = 0; k < n; k++) TD.tday[k] = decYear(new Date(t0.getTime() + k * 864e5));
  // story clock: a day of big flood or storm takes up to ~10× longer on the rail
  TD.W = new Float64Array(n + 1); TD.A = new Float64Array(n + 1);
  for (let k = 0; k < n; k++) {
    const fl = clamp((TD.q[k] - 2600) / 1000, 0, 1), st = clamp((TD.hs[k] - 3.0) / 1.6, 0, 1);
    TD.W[k + 1] = TD.W[k] + 1 + 7 * fl + 10 * st;
    // morph activity: what moves the bed — floods above Q75 and waves above ~2 m (plus a small background)
    TD.A[k + 1] = TD.A[k] + 0.06 + clamp((TD.q[k] - 2200) / 1500, 0, 1.5) + clamp((TD.hs[k] - 2.0) / 2.0, 0, 2);
  }
  // events for the toasts: big floods (peak > 3,300 m³/s) and storms (Hs > 4.4 m)
  EVENTS.length = 0;
  const peak = (arr, thr, sep, kind) => {
    let k = 0;
    while (k < n) {
      if (arr[k] > thr) { let m = k; let e = k; while (e < n && (arr[e] > thr * 0.8 || e - m < sep)) { if (arr[e] > arr[m]) m = e; e++; if (e - m > sep) break; } EVENTS.push({ kind, k: m, t: TD.tday[m], v: arr[m] }); k = e + 1; }
      else k++;
    }
  };
  peak(TD.q, 3300, 60, 'flood'); peak(TD.hs, 4.4, 12, 'storm');
  EVENTS.sort((a, b) => a.t - b.t);
}
const EVENTS = [];
// fractional day of decimal year t
function dayOf(t) {
  const T = TD.tday, n = T.length;
  if (t <= T[0]) return 0; if (t >= T[n - 1]) return n - 1;
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  return lo + (t - T[lo]) / (T[hi] - T[lo]);
}
const cumAt = (C, d) => { const i = Math.floor(d), f = d - i; return lerp(C[clamp(i, 0, C.length - 1)], C[clamp(i + 1, 0, C.length - 1)], f); };
function dayOfCum(C, w) { let lo = 0, hi = C.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= w) lo = m; else hi = m; } return lo + (w - C[lo]) / Math.max(1e-9, C[hi] - C[lo]); }
const tOfDay = d => { const T = TD.tday, i = clamp(Math.floor(d), 0, T.length - 1), j = Math.min(T.length - 1, i + 1); return lerp(T[i], T[j], d - i); };
// bed state at time t: surveys a → b with progress m
function bedAt(t) {
  const E = SD.epochs;
  if (t <= E[0].t) return { a: 0, b: 1, m: 0 };
  if (t >= E[NE - 1].t) return { a: NE - 2, b: NE - 1, m: 1 };
  let e = 0; while (e < NE - 2 && t >= E[e + 1].t) e++;
  const A0 = cumAt(TD.A, dayOf(E[e].t)), A1 = cumAt(TD.A, dayOf(E[e + 1].t)), A = cumAt(TD.A, dayOf(t));
  return { a: e, b: e + 1, m: clamp((A - A0) / Math.max(1e-6, A1 - A0), 0, 1) };
}
// forcing at time t (the max over ±1 day, so a storm stays visible a little longer)
function forcingAt(t) {
  const d = Math.round(dayOf(t)), n = TD.q.length; let q = 0, hs = 0;
  for (let k = Math.max(0, d - 1); k <= Math.min(n - 1, d + 1); k++) { q = Math.max(q, TD.q[k]); hs = Math.max(hs, TD.hs[k]); }
  return { q, hs };
}
const dvSum = (a, b) => SD.periods.slice(a, b).reduce((s, p) => s + p.dv, 0);
function cumAtT(t) {                                // cumulative measured volume change since 2004 at t (morphing interval included)
  const B = bedAt(t); return dvSum(0, B.a) + SD.periods[B.a].dv * B.m;
}

/* ------------------------------------------------------------------ renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = null;
cosmos({ opacity: 0.85 });
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = THREE.MathUtils.degToRad(74);
controls.minDistance = 1.5; controls.maxDistance = 90;
controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.5;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
const shared = { uFogD: { value: 0.02 }, uFogC: { value: new THREE.Color(bgHex()) }, uTime: { value: 0 } };

/* ------------------------------------------------------------------ scene objects */
let terrain, tGeo, tMat, water, wMat, depthTex, depthData, flow, satTex, seaTex, ACT, CO, coast, cMat;
const RECT = new THREE.Vector4();
async function build() {
  setLoad(0.05, '');
  const [sd, eb, cb, xb, fb] = await Promise.all([fetchJSON('story_data.json'), fetchBin('epochs.bin'), fetchBin('cover.bin'), fetchBin('ctx.bin'), fetchBin('foot.bin')]);
  SD = sd; NE = SD.epochs.length; NG = SD.grid.n; NC = SD.ctx.n;
  EP = Float32Array.from(new Int16Array(eb), v => v / 100); COV = new Uint8Array(cb);
  CTX = Float32Array.from(new Int16Array(xb), v => v / 100); FOOT = Float32Array.from(new Uint8Array(fb), v => v / 255);
  H = Float32Array.from(CTX);
  {
    const G2 = NG * NG, R = 3; CW = new Float32Array(NE * G2);
    for (let e = 0; e < NE; e++) for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) {
      let mn = 1;                                   // min over a (2R+1)² window, then a soft ramp → no steps at the edge of a survey
      for (let di = -R; di <= R && mn > 0; di++) for (let dj = -R; dj <= R; dj++) { const ii = i + di, jj = j + dj;
        const c = ii < 0 || jj < 0 || ii >= NG || jj >= NG ? 0 : COV[e * G2 + ii * NG + jj]; if (!c) { const r = Math.hypot(di, dj) / (R + 1); mn = Math.min(mn, smooth(clamp(r, 0, 1))); } }
      CW[e * G2 + i * NG + j] = mn;
    }
  }
  {
    // the smooth bed under the bar (mean of all surveys blended into the context, Gaussian σ ≈ 350 m): the relief above / below it
    // (bar crest, channel, troughs) is what setBed() exaggerates
    const G2 = NG * NG, P = 24, M = NG + 2 * P, a = new Float32Array(M * M), sig = 7, R = 3 * sig, kw = [];
    for (let k = -R; k <= R; k++) kw.push(Math.exp(-k * k / (2 * sig * sig)));
    for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
      const ci = i - P + OFF, cj = j - P + OFF, v = ci * NC + cj, si = i - P, sj = j - P;
      let h = CTX[v];
      if (si >= 0 && sj >= 0 && si < NG && sj < NG && FOOT[v] > 0) { let s = 0; for (let e = 0; e < NE; e++) s += EP[e * G2 + si * NG + sj]; h = h * (1 - FOOT[v]) + s / NE * FOOT[v]; }
      a[i * M + j] = Math.min(h, 0.5);
    }
    const blur = (src, dx, dy) => { const o = new Float32Array(M * M);
      for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) { let s = 0, w = 0;
        for (let k = -R; k <= R; k++) { const ii = i + k * dy, jj = j + k * dx; if (ii < 0 || jj < 0 || ii >= M || jj >= M) continue; s += src[ii * M + jj] * kw[k + R]; w += kw[k + R]; }
        o[i * M + j] = s / w; } return o; };
    const b = blur(blur(a, 1, 0), 0, 1);
    BG = new Float32Array(G2);
    for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) BG[i * NG + j] = b[(i + P) * M + j + P];
  }
  prepSeries();
  setLoad(0.4);
  satTex = await loadTex('data/sat.webp');
  CO = await fetchJSON('coast.json');
  setLoad(0.6);
  const half = SD.ctx.half / 1000, d = SD.ctx.d / 1000;
  RECT.set(-half, -half, 2 * half, 2 * half);
  // ---- terrain: one vertex per context node (50 m); row 0 = south (z = +half)
  const n = NC * NC, P = new Float32Array(n * 3), AH = new Float32Array(n), AD = new Float32Array(n), AF = new Float32Array(n);
  for (let i = 0; i < NC; i++) for (let j = 0; j < NC; j++) { const v = i * NC + j; P[v * 3] = -half + j * d; P[v * 3 + 2] = half - i * d; AF[v] = FOOT[v]; }
  const idx = new Uint32Array((NC - 1) * (NC - 1) * 6); let o = 0;
  for (let i = 0; i < NC - 1; i++) for (let j = 0; j < NC - 1; j++) { const a = i * NC + j, b = a + 1, c = a + NC, e = c + 1; idx[o++] = a; idx[o++] = b; idx[o++] = c; idx[o++] = b; idx[o++] = e; idx[o++] = c; }
  tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
  tGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  tGeo.setAttribute('aH', new THREE.BufferAttribute(AH, 1).setUsage(THREE.DynamicDrawUsage));
  tGeo.setAttribute('aD', new THREE.BufferAttribute(AD, 1).setUsage(THREE.DynamicDrawUsage));
  tGeo.setAttribute('aFoot', new THREE.BufferAttribute(AF, 1));
  ACT = new Float32Array(n); tGeo.setAttribute('aAct', new THREE.BufferAttribute(ACT, 1).setUsage(THREE.DynamicDrawUsage));
  tGeo.setIndex(new THREE.BufferAttribute(idx, 1));
  tMat = new THREE.ShaderMaterial({ vertexShader: SH.terrainVS, fragmentShader: SH.terrainFS, transparent: true, extensions: { derivatives: true },
    uniforms: Object.assign({}, shared, { tSat: { value: satTex }, uDiff: { value: 0 }, uRect: { value: RECT }, uContour: { value: 1 }, uFade: { value: 1 } }) });
  terrain = new THREE.Mesh(tGeo, tMat); terrain.frustumCulled = false; terrain.renderOrder = 0; scene.add(terrain);
  writeHeights(0, NC - 1, true);
  // ---- water depth texture (half float, follows the bed)
  depthData = new Uint16Array(n);
  for (let v = 0; v < n; v++) depthData[v] = THREE.DataUtils.toHalfFloat(H[v]);
  depthTex = new THREE.DataTexture(depthData, NC, NC, THREE.RedFormat, THREE.HalfFloatType);
  depthTex.magFilter = depthTex.minFilter = THREE.LinearFilter; depthTex.flipY = false; depthTex.needsUpdate = true;
  // ---- open-sea mask for the waves: no waves on the Danube, the lakes or the lagoons
  {
    const sea = new Float32Array(n), dd = SD.ctx.d / 1000;
    for (let i = 0; i < NC; i++) { let inland = false; for (let j = NC - 1; j >= 0; j--) { const v = i * NC + j;
      if (CTX[v] > 0.1 && FOOT[v] <= 0) inland = true; sea[v] = H[v] < 0 && !inland ? 1 : 0; } }
    const segD = (x, z) => { let b = 1e9; for (let k = 0; k < CHANNEL.length - 1; k++) { const [ax, az] = CHANNEL[k], [bx, bz] = CHANNEL[k + 1], dx = bx - ax, dz = bz - az;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return b; };
    for (let i = 0; i < NC; i++) for (let j = 0; j < NC; j++) { const v = i * NC + j, x = -half + j * dd, z = half - i * dd;
      if (sea[v] && x < -0.95 && segD(x, z) < 0.4) sea[v] = 0; }                     // the channel up to the mouth
    const blur = a => { const o = new Float32Array(n), R = 3; for (let i = 0; i < NC; i++) for (let j = 0; j < NC; j++) { let s = 0, c = 0;
      for (let di = -R; di <= R; di++) for (let dj = -R; dj <= R; dj++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NC || jj >= NC) continue; s += a[ii * NC + jj]; c++; }
      o[i * NC + j] = s / c; } return o; };
    const sm = blur(sea), u8 = new Uint8Array(n); for (let v = 0; v < n; v++) u8[v] = Math.round(sm[v] * 255);
    seaTex = new THREE.DataTexture(u8, NC, NC, THREE.RedFormat); seaTex.magFilter = seaTex.minFilter = THREE.LinearFilter; seaTex.needsUpdate = true;
  }
  // ---- flow + particles
  flow = new Flow(CHANNEL, hAt, VX); scene.add(flow.mesh);
  // ---- water
  const wg = new THREE.PlaneGeometry(2 * half, 2 * half, 440, 440).rotateX(-Math.PI / 2);
  wMat = new THREE.ShaderMaterial({ vertexShader: SH.waterVS, fragmentShader: SH.waterFS, transparent: true, depthWrite: false,
    uniforms: Object.assign({}, shared, { tDepth: { value: depthTex }, tSea: { value: seaTex }, uRect: { value: RECT }, uAmp: { value: 0 }, uHs: { value: 1 }, uVx: { value: VX }, uClear: { value: 1 }, uFade: { value: 1 },
      tPlume: { value: flow.plume }, uPR: { value: flow.rect } }) });
  water = new THREE.Mesh(wg, wMat); water.renderOrder = 10; water.frustumCulled = false; scene.add(water);
  // ---- the coast 1985 → 2025 (loaded lazily, shown at the coast station)
  {
    const [bx, bz, bw, bh] = CO.bounds_km;
    const cg = new THREE.PlaneGeometry(bw, bh).rotateX(-Math.PI / 2).translate(bx + bw / 2, 0.003, bz + bh / 2);
    cMat = new THREE.ShaderMaterial({ vertexShader: SH.coastVS, fragmentShader: SH.coastFS, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { tA: { value: null }, tB: { value: null }, tC: { value: null }, uP: { value: 0 }, uOp: { value: 0 }, uTime: shared.uTime } });
    coast = new THREE.Mesh(cg, cMat); coast.renderOrder = 40; coast.visible = false; coast.frustumCulled = false; scene.add(coast);
    coast.load = () => coast.loading || (coast.loading = Promise.all([`coast_${CO.years[0]}`, `coast_${CO.years[1]}`, 'coast_change'].map(n => loadTex(`data/${n}.webp`)))
      .then(([a, b, c]) => { for (const t of [a, b, c]) { t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; }
        cMat.uniforms.tA.value = a; cMat.uniforms.tB.value = b; cMat.uniforms.tC.value = c; coast.ready = true; }));
  }
  setLoad(0.9);
}
function loadTex(url) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, t => {
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t);
  }, undefined, rej));
}
// bed height (m) at scene x, z (km), bilinear on the current heights
function hAt(x, z) {
  const d = SD.ctx.d / 1000, half = SD.ctx.half / 1000;
  const fj = (x + half) / d, fi = (half - z) / d;
  if (fj < 0 || fi < 0 || fj >= NC - 1 || fi >= NC - 1) return -25;
  const j = Math.floor(fj), i = Math.floor(fi), a = fj - j, b = fi - i, k = i * NC + j;
  return H[k] * (1 - a) * (1 - b) + H[k + 1] * a * (1 - b) + H[k + NC] * (1 - a) * b + H[k + NC + 1] * a * b;
}

/* ------------------------------------------------------------------ the bed: survey a → b (progress m), colours vs survey ref */
const bed = { a: -1, b: -1, m: -1, ref: -2, depthT: 0 };
function setBed(a, b, m, ref) {
  m = Math.round(m * 2000) / 2000;
  if (a === bed.a && b === bed.b && m === bed.m && ref === bed.ref) return;
  bed.a = a; bed.b = b; bed.m = m; bed.ref = ref;
  const G = NG * NG, AD = tGeo.attributes.aD.array, ZS = bedSmooth(a, b, m);
  for (let si = 0; si < NG; si++) for (let sj = 0; sj < NG; sj++) {
    const g = si * NG + sj, v = (si + OFF) * NC + (sj + OFF), f = FOOT[v];
    if (f <= 0) { AD[v] = 0; continue; }
    const z = zAt(a, g, v) * (1 - m) + zAt(b, g, v) * m, zr = ref == null ? z : zAt(ref, g, v);
    // change counts only where both surveys really measured (carried-forward cells would make fake steps)
    const w = ref == null ? 0 : Math.min(CW[a * G + g] * (1 - m) + CW[b * G + g] * m, CW[ref * G + g]) * f;
    // only the big changes count: from the shore down to ~DMAX m (the shallower of the two beds), larger than ~0.8 m
    const dz = z - zr, dm = 1 - smooth(clamp((-Math.max(z, zr) - DMAX + 1.5) / 3, 0, 1));
    let zv = z + dz * (CHX - 1) * w * dm * smooth(clamp((Math.abs(dz) - 0.5) / 0.5, 0, 1));
    // the mouth bar and the channel stand out: their relief against the smooth bed ×BX (fading in below the waterline); only the
    // gently smoothed bed is stretched, so the survey's own small steps (profile lines, block edges) are not
    if (zv < 0) zv += (ZS[g] - BG[g]) * (BX - 1) * smooth(clamp(-zv / 1.2, 0, 1));
    if (z < -0.05) zv = Math.min(zv, Math.max(z, -0.35)); else zv = z;     // the exaggeration never lifts the sea bed out of the water
    const hNew = CTX[v] * (1 - f) + zv * f;
    if (bed.live) ACT[v] = clamp(ACT[v] + (hNew - H[v]) * 3 * dm, -1, 1);    // changing right now: pulses gold (up) / red (down)
    H[v] = hNew;
    AD[v] = dz * dm * (f > 0 ? w / f : 0);
  }
  writeHeights(OFF - 1, OFF + NG, false);
  tGeo.attributes.aD.needsUpdate = true; tGeo.attributes.aAct.needsUpdate = true; bed.actOn = true;
  bed.dirtyDepth = true;
}
// survey e at node g (context node v): where the survey did not measure, its grid only carries older values (steps of up to ~1 m
// along the edge of each campaign) → fall back to the smooth context bed there
const zAt = (e, g, v) => { const w = CW[e * NG * NG + g]; return CTX[v] + (EP[e * NG * NG + g] - CTX[v]) * w; };
// the bed of surveys a → b (progress m), Gaussian-smoothed (σ = 2 nodes, 100 m) — the part of the relief that setBed() stretches
const ZSa = [], ZSk = [0.1353, 0.3247, 0.6065, 0.8825, 1, 0.8825, 0.6065, 0.3247, 0.1353];
function bedSmooth(a, b, m) {
  const G = NG * NG, R = 4;
  if (!ZSa.length) ZSa.push(new Float32Array(G), new Float32Array(G));
  const [A, T] = ZSa;
  for (let g = 0; g < G; g++) { const v = ((g / NG | 0) + OFF) * NC + (g % NG) + OFF; A[g] = zAt(a, g, v) * (1 - m) + zAt(b, g, v) * m; }
  for (let pass = 0; pass < 2; pass++) {
    const src = pass ? T : A, dst = pass ? A : T;
    for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) { let s = 0, w = 0;
      for (let k = -R; k <= R; k++) { const ii = pass ? i + k : i, jj = pass ? j : j + k; if (ii < 0 || jj < 0 || ii >= NG || jj >= NG) continue; s += src[ii * NG + jj] * ZSk[k + R]; w += ZSk[k + R]; }
      dst[i * NG + j] = s / w; }
  }
  return A;
}
function writeHeights(i0, i1, all) {
  const P = tGeo.attributes.position.array, AH = tGeo.attributes.aH.array, N = tGeo.attributes.normal.array, d = SD.ctx.d / 1000;
  i0 = clamp(i0, 0, NC - 1); i1 = clamp(i1, 0, NC - 1);
  for (let i = i0; i <= i1; i++) for (let j = 0; j < NC; j++) {
    const v = i * NC + j; P[v * 3 + 1] = H[v] * KY; AH[v] = H[v];
    const hl = H[i * NC + Math.max(0, j - 1)], hr = H[i * NC + Math.min(NC - 1, j + 1)], hs = H[Math.max(0, i - 1) * NC + j], hn = H[Math.min(NC - 1, i + 1) * NC + j];
    // x east: dh/dx = (hr − hl) / 2d; z south: row i−1 is south (larger z) → dh/dz = (hs − hn) / 2d
    const nx = -(hr - hl) * KY / (2 * d), nz = -(hs - hn) * KY / (2 * d), L = Math.hypot(nx, 1, nz);
    N[v * 3] = nx / L; N[v * 3 + 1] = 1 / L; N[v * 3 + 2] = nz / L;
  }
  for (const k of ['position', 'aH', 'normal']) { const at = tGeo.attributes[k]; at.needsUpdate = true; }
}
function syncDepth(dt) {
  bed.depthT += dt;
  if (!bed.dirtyDepth || bed.depthT < 0.25) return;
  bed.depthT = 0; bed.dirtyDepth = false;
  for (let i = OFF - 1; i <= OFF + NG; i++) for (let j = OFF - 1; j <= OFF + NG; j++) { const v = i * NC + j; depthData[v] = THREE.DataUtils.toHalfFloat(H[v]); }
  depthTex.needsUpdate = true;
}

/* ------------------------------------------------------------------ story state: the rail */
// u = rail position in stations (0 … n-1); time is a function of u through the story clock
const S = { u: 0, st: 0, card: 0, travel: null, scrub: false, manualCam: false, t: STOPS[0].t, started: false, focus: null, basinMode: 'today' };
const NST = STOPS.length;
function timeAt(u) {
  const k = Math.min(NST - 2, Math.floor(u)), f = clamp(u - k, 0, 1), ta = STOPS[k].t, tb = STOPS[k + 1].t;
  if (Math.abs(tb - ta) < 1e-6) return ta;
  const Wa = cumAt(TD.W, dayOf(ta)), Wb = cumAt(TD.W, dayOf(tb));
  return tOfDay(dayOfCum(TD.W, lerp(Wa, Wb, f)));
}
function uOfTime(t) {
  for (let k = 0; k < NST - 1; k++) {
    const ta = STOPS[k].t, tb = STOPS[k + 1].t;
    if (t <= tb && tb > ta) { const Wa = cumAt(TD.W, dayOf(ta)), Wb = cumAt(TD.W, dayOf(tb)); return k + clamp((cumAt(TD.W, dayOf(t)) - Wa) / (Wb - Wa), 0, 1); }
  }
  return NST - 1;
}
function travelTime(u0, u1) {
  const lo = Math.min(u0, u1), hi = Math.max(u0, u1); let T = 0;
  for (let k = 0; k < NST - 1; k++) T += (STOPS[k + 1].travel || 10) * Math.max(0, Math.min(hi, k + 1) - Math.max(lo, k));
  return u1 < u0 ? T / 2.5 : T;
}
function travelTo(k) {
  k = clamp(k, 0, NST - 1);
  if (S.travel && S.travel.k === k) { S.travel.boost = 4; return; }      // ▶ again while moving = fast-forward
  if (!S.travel && k === S.st) return;
  S.started = true; bubbles.close(); setFocus(null);
  S.travel = { k, u0: S.u, u1: k, T: Math.max(1.2, travelTime(S.u, k)), p: 0, boost: 1 };
  resumeRailCam(); S.card = k; lastCard = -1; charts.setTab(STOPS[k].tab); charts.setTouch(false);
  if (!STOPS[k].basin) basinShow(false);
  document.body.classList.toggle('coast', !!STOPS[k].coast);
  document.body.classList.add('travel');
}
function jumpTo(k) {
  k = clamp(k, 0, NST - 1);
  if (Math.abs(k - (S.travel ? S.travel.k : S.st)) <= 1) return travelTo(k);
  S.started = true; bubbles.close(); setFocus(null);
  document.body.classList.add('dh-out');
  setTimeout(() => { S.travel = null; S.u = k; S.st = k; S.card = k; lastCard = -1; S.manualCam = false; camSmooth = null; arrive();
    document.body.classList.remove('dh-out', 'travel'); }, 420);
}
function stepRail(dt) {
  const tr = S.travel; if (!tr) return;
  // linear progress (the story clock already slows down on events), eased only at the very ends
  tr.p = Math.min(1, tr.p + dt * tr.boost / tr.T);
  const e = tr.p < 0.06 ? smooth(tr.p / 0.06) * 0.03 : tr.p > 0.94 ? 1 - smooth((1 - tr.p) / 0.06) * 0.03 : 0.03 + (tr.p - 0.06) / 0.88 * 0.94;
  S.u = lerp(tr.u0, tr.u1, e);
  if (tr.p >= 1) { S.st = tr.k; S.travel = null; document.body.classList.remove('travel'); arrive(); }
}
let SUI = null;
function arrive() { SUI && SUI.arrived(); arriveBubbles(); charts.setTab(STOPS[S.st].tab); charts.setTouch(!!STOPS[S.st].periods); basinShow(!!STOPS[S.st].basin); lastCard = -1; }

/* ------------------------------------------------------------------ camera (same grammar as the other stories) */
const SK = ['x', 'z', 'tilt', 'head'];
function shotPose(s) {
  const asp = camera.aspect, fit = asp < 1.3 ? Math.min(2.6, 1.3 / asp) : 1;
  const tl = THREE.MathUtils.degToRad(s.tilt), hd = THREE.MathUtils.degToRad(s.head), dist = s.dist * fit;
  const target = new THREE.Vector3(s.x, -0.08, s.z);
  const off = new THREE.Vector3(-Math.sin(hd) * Math.sin(tl), Math.cos(tl), Math.cos(hd) * Math.sin(tl)).multiplyScalar(dist);
  return { target, pos: target.clone().add(off) };
}
function lerpShot(a, b, t) { const o = {}; for (const k of SK) o[k] = lerp(a[k], b[k], t); o.dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)); return o; }
function currentShot() {
  const k = Math.min(NST - 2, Math.floor(S.u)), f = clamp(S.u - k, 0, 1), a = STOPS[k].shot, b = STOPS[k + 1].shot;
  const s = lerpShot(a, b, smooth(f));
  s.dist *= 1 + 0.12 * Math.sin(Math.PI * f);
  s.head += 6 * Math.sin(Math.PI * f);                // a slow sweep while the years pass
  return s;
}
let camSmooth = null, camGlide = 0;
function poseToShot() {
  const asp = camera.aspect, fit = asp < 1.3 ? Math.min(2.6, 1.3 / asp) : 1;
  const t = controls.target, off = camera.position.clone().sub(t), d = off.length();
  return { x: t.x, z: t.z, dist: d / fit, tilt: THREE.MathUtils.radToDeg(Math.acos(clamp(off.y / d, -1, 1))), head: THREE.MathUtils.radToDeg(Math.atan2(-off.x, off.z)) };
}
function resumeRailCam() { if (S.manualCam) { camSmooth = poseToShot(); camGlide = 2.5; } S.manualCam = false; }
function updateCamera(dt) {
  if (S.manualCam) return;
  const want = currentShot();
  if (!camSmooth) camSmooth = { ...want };
  const k = 1 - Math.exp(-dt * (camGlide > 0 ? 0.9 : 1.8)); camGlide = Math.max(0, camGlide - dt);
  while (camSmooth.head - want.head > 180) camSmooth.head -= 360;
  while (want.head - camSmooth.head > 180) camSmooth.head += 360;
  for (const key of SK) camSmooth[key] = lerp(camSmooth[key], want[key], k);
  camSmooth.dist = Math.exp(lerp(Math.log(camSmooth.dist), Math.log(want.dist), k));
  const p = shotPose(camSmooth);
  camera.position.copy(p.pos); controls.target.copy(p.target); camera.lookAt(p.target);
}
const viewDist = () => camera.position.distanceTo(controls.target);

/* ------------------------------------------------------------------ per-frame scene update */
const G = { q: 1500, hs: 1, diff: 0, sedMul: 1, coast: 0, coastT: 0, coastP: 0 };
let focusAnim = 0;
function updateScene(dt) {
  const t = S.t, dist = viewDist(), k = dt === 0 ? 1 : 1 - Math.exp(-dt * 3.5);
  const st = STOPS[S.travel ? S.travel.k : S.st];
  // the bed
  let ref = st.ref;
  if (S.focus) {
    focusAnim = Math.min(1, focusAnim + dt / 2.8);
    const i = S.focus.i; bed.live = bed.ref === i; setBed(i, i + 1, smooth(focusAnim), i);
  } else {
    const B = bedAt(t);
    if (S.travel && S.travel.u1 < S.travel.u0) ref = STOPS[S.travel.k].ref;    // going back: compare with the target's reference
    ref = effRef(ref);
    bed.live = ref === bed.ref && dt > 0;
    setBed(B.a, B.b, B.m, ref);
  }
  if (bed.actOn) {                               // the "happening now" glow fades within ~1 s
    const e = Math.exp(-dt * 1.4); let any = false;
    for (let i = OFF; i < OFF + NG; i++) for (let j = OFF; j < OFF + NG; j++) { const v = i * NC + j; ACT[v] *= e; if (Math.abs(ACT[v]) > 0.004) any = true; }
    tGeo.attributes.aAct.needsUpdate = true; bed.actOn = any;
  }
  G.diff = lerp(G.diff, (S.focus || ref != null) ? 1 : 0, k);
  tMat.uniforms.uDiff.value = G.diff;
  syncDepth(dt);
  // forcing: the real series while riding, the station's picture while standing
  let want;
  if (Q.has('q') || Q.has('hs')) want = { q: parseFloat(Q.get('q')) || 1500, hs: parseFloat(Q.get('hs')) || 1 };
  else if (S.focus) { const p = SD.periods[S.focus.i]; want = p.dv >= 0 ? { q: Math.max(2600, p.qmax), hs: 0.8 } : { q: 1300, hs: Math.max(3, p.hsmax) }; }
  else if (S.travel || S.scrub) want = forcingAt(t);
  else want = st.proc;
  const kk = S.travel || S.scrub ? 1 - Math.exp(-dt * 8) : k;
  G.q = lerp(G.q, want.q, kk); G.hs = lerp(G.hs, want.hs, kk);
  G.sedMul = lerp(G.sedMul, st.basin && S.basinMode === 'before' ? 3 : 1, k);
  // the coast station: the 3D mouth fades out, the 1985 → 2025 map fades in and plays (6 s), holds, replays
  const wantCoast = st.coast ? 1 : 0;
  if (wantCoast) coast.load();
  G.coast = lerp(G.coast, wantCoast && coast.ready ? 1 : 0, dt === 0 ? 1 : 1 - Math.exp(-dt * 2.2));
  coast.visible = G.coast > 0.01;
  if (st.coast && !S.travel && coast.ready) G.coastT += dt; else if (!st.coast) G.coastT = 0;
  const cyc = G.coastT % 13;
  G.coastP = cyc < 1 ? 0 : cyc < 8 ? smooth((cyc - 1) / 7) : cyc < 12 ? 1 : 1 - (cyc - 12);
  cMat.uniforms.uP.value = G.coastP; cMat.uniforms.uOp.value = G.coast;
  tMat.uniforms.uFade.value = wMat.uniforms.uFade.value = 1 - G.coast;
  flow.set(G.q, G.hs, G.sedMul);
  flow.update(dt, 1 - G.coast); flow.mesh.visible = G.coast < 0.98; flow.scale(Math.min(dist, 20));
  // up to the record floods of 2006 the river and its jet dominate the picture: the drawn waves stay very small
  // (the charts and the "river ⟷ sea" panel keep the real wave heights)
  const calm = 0.2 + 0.8 * smooth(clamp((S.t - 2006.6) / 0.5, 0, 1));
  wMat.uniforms.uHs.value = G.hs * calm;
  wMat.uniforms.uAmp.value = 0.5 * G.hs * KY * 0.26 * calm;
  // fog + camera range
  shared.uFogD.value = 0.5 / Math.max(dist * 2.6, 8);
  camera.near = Math.max(0.01, dist * 0.01); camera.far = Math.max(100, dist * 8); camera.updateProjectionMatrix();
}

// a reference survey only counts once the story time has reached it (riding toward it, the colours first fade out)
function effRef(ref) { return ref != null && S.t < SD.epochs[ref].t - 0.005 ? null : ref; }

/* ------------------------------------------------------------------ labels */
const LBL = [];
LABELS.forEach(L => { const d = document.createElement('div'); d.className = 'lbl ' + L[4]; $('labels').appendChild(d); LBL.push({ L, d, on: false }); });
const pv = new THREE.Vector3();
function toScreen(x, z, y = 0) { pv.set(x, y, z).project(camera); return { x: (pv.x + 1) / 2 * innerWidth, y: (1 - pv.y) / 2 * innerHeight, ok: pv.z < 1 && Math.abs(pv.x) < 0.96 && Math.abs(pv.y) < 0.98 }; }
function panelRects() {
  const charts = document.body.matches('.coast,.basin') ? [] : [...document.querySelectorAll('#charts .chart')];    // hidden there (visibility only)
  return [...['card', 'duel', 'bar', 'time', 'basin', 'toast', 'vtick', 'dh-nx', 'dh-sw', 'brand'].map(id => $(id)), ...charts].filter(e => e && e.getClientRects().length && !(e.id === 'dh-nx' && !e.classList.contains('on')))
    .map(e => e.getBoundingClientRect()).filter(r => r.width > 0);
}
const under = (rs, x, y, m = 0) => rs.some(r => x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m);
function updateLabels(rs) {
  const u = innerWidth * 0.0095, bub = bubbles.visible();
  for (const o of LBL) {
    const [ro, en, x, z, , scope] = o.L, txt = LANG === 'ro' ? ro : en;
    let show = scope === 'c' ? G.coast > 0.6 : G.coast < 0.4;
    const p = toScreen(x, z, Math.max(0, hAt(x, z)) * KY);
    if (!show || !p.ok || under(rs, p.x, p.y, u) || bub.some(b => Math.abs(b.x - p.x) < u * 9 && Math.abs(b.y - p.y) < u * 2.4)) show = false;
    else o.d.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) translate(-50%,-50%)`;
    if (o.d.textContent !== txt) o.d.textContent = txt;
    if (show !== o.on) { o.on = show; o.d.classList.toggle('on', show); }
  }
}

/* ------------------------------------------------------------------ UI */
const bubbles = new Bubbles();
let lastCard = -1, basin = null;
const charts = {
  list: [], tab: null,
  setTab(t) { this.tab = t; this.list.forEach(c => c.setActive(c.tab === t)); },
  setLang(l, U) { this.list.forEach(c => c.setLang(l, U)); },
  setTouch(on) { this.list.forEach(c => c.setTouch(on && c.tab === 'dv')); },
  setFocus(i) { this.list.forEach(c => c.setFocus(i)); },
  update(t, x) { this.list.forEach(c => c.update(t, x)); }
};
const fmtN = (v, d = 1) => v.toFixed(d).replace('.', LANG === 'ro' ? ',' : '.');
const fmtInt = v => Math.round(v).toLocaleString(LANG === 'ro' ? 'ro-RO' : 'en-GB');
const fmtDV = v => (v >= 0 ? '+' : '−') + fmtN(Math.abs(v)) + ' ' + (LANG === 'ro' ? 'milioane m³' : 'million m³');
function monthName(t, short) {
  const y = Math.floor(t), m = clamp(Math.floor((t - y) * 12), 0, 11), n = UI[LANG].months[m];
  return (short ? n.slice(0, 3) + '.' : n) + ' ' + y;
}
const epName = i => monthName(SD.epochs[i].t);
function tokens(s) {
  const cs = k => { const o = CO.stats[k === 'cn' ? 'north' : 'sacalin'];
    return { lost: fmtN(o.lost_km2), gain: fmtN(o.gain_km2), max: fmtInt(o.max_m), rate: fmtN(Math.abs(o.net_m_per_yr)) }; };
  return (s || '').replace(/\{dv:(\d+)-(\d+)\}/g, (_, a, b) => fmtDV(dvSum(+a, +b)))
    .replace(/\{(cn|cs):(\w+)\}/g, (_, g, k) => cs(g)[k] ?? '');
}
function stationsDOM() {
  const rail = $('rail'); rail.querySelectorAll('.stn,.anc').forEach(e => e.remove());
  STOPS.forEach((st, k) => {
    const b = document.createElement('button'); b.className = 'stn'; b.style.left = (k / (NST - 1) * 100) + '%';
    const yr = st.label || (k > 0 && STOPS[k - 1].t === st.t ? '' : Math.floor(st.t));
    b.innerHTML = `<span class="a">${yr}</span><span class="d"></span><span class="n">${st.short[LANG]}</span>`;
    rail.appendChild(b);
  });
  ANCHORS.forEach(a => {
    const x = uOfTime(a.t) / (NST - 1);
    if (Math.abs(x * (NST - 1) - Math.round(x * (NST - 1))) < 0.25) return;
    const m = document.createElement('div'); m.className = 'anc'; m.style.left = (x * 100) + '%';
    m.innerHTML = `<i></i><b>${a[LANG]}</b>`; rail.appendChild(m);
  });
}
function setStatic() {
  const U = UI[LANG];
  $('btnLang').textContent = U.lang; $('loadt').textContent = U.title;
  document.title = U.title + ' · DELTA-Hub';
  $('dRiv').textContent = U.river; $('dSea').textContent = U.sea; $('lDep').textContent = U.dep; $('lEro').textContent = U.ero;
  $('bTitle').textContent = U.sedTitle; $('bBefore').textContent = U.before; $('bToday').textContent = U.today;
  $('bvBefore').textContent = '≈ ' + SED.before + ' ' + U.mt; $('bvToday').textContent = '≈ ' + SED.today + ' ' + U.mt;
  $('bTrap').textContent = U.dams + ': ' + U.trapped;
  stationsDOM(); lastCard = -1; arriveBubbles();
  charts.setLang(LANG, U); if (basin) basin.setLang(LANG, U);
}
function setCard() {
  const U = UI[LANG], k = S.card, T = STOPS[k][LANG];
  $('kicker').textContent = T.kicker; $('ctitle').textContent = T.title; $('cbody').textContent = T.body;
  const fact = tokens(T.fact); $('cfact').textContent = fact; $('cfact').style.display = fact ? '' : 'none';
  $('chint').innerHTML = k === 0 ? `<span class="dot"></span>${U.hintStart} ${U.hintBub}` : STOPS[k].periods ? `<span class="dot"></span>${U.period}` : '';
  setFocusInfo();
  const end = $('cend'), last = k === NST - 1;
  end.style.display = last ? '' : 'none';
  if (last) {
    end.innerHTML = `<button class="bt txt go" id="eBasin">↺ ${U.back1}</button><button class="bt txt" id="eMenu">${ICON.home.replace('<svg', '<svg style="width:1.2em;height:1.2em;margin-right:.5em"')}${U.menu}</button>`;
    $('eMenu').onclick = () => go(HUB + 'index.html');
    $('eBasin').onclick = () => go(HUB + 'stories/01_povestea/index.html?st=0');
  }
  const card = $('card'); card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
}
function setFocusInfo() {
  const el = $('cfocus'), U = UI[LANG];
  if (!S.focus) { el.style.display = 'none'; return; }
  const p = SD.periods[S.focus.i], h = LANG === 'ro' ? 'ore' : 'h';
  el.style.display = '';
  el.innerHTML = `<b>${epName(S.focus.i)} → ${epName(S.focus.i + 1)}</b><span class="${p.dv >= 0 ? 'pos' : 'neg'}">${fmtDV(p.dv)}</span>` +
    `<em><i class="sw dep"></i>${fmtInt(p.hq)} ${h} ${LANG === 'ro' ? 'de viitură' : 'of flood'} · <i class="sw sea"></i>${fmtInt(p.hw)} ${h} ${LANG === 'ro' ? 'de furtună' : 'of storm'}</em>`;
}
function setFocus(i) {
  if (i == null || (S.focus && S.focus.i === i)) { S.focus = null; charts.setFocus(-1); setFocusInfo(); return; }
  S.focus = { i }; focusAnim = 0; charts.setFocus(i); setFocusInfo(); bubbles.close();
}
// optional photo on a bubble: 5th element { img, by } → the sheet shows it (tap = full screen)
const photo = o => o && o.img ? { img: o.img, credit: (LANG === 'ro' ? 'Foto: ' : 'Photo: ') + o.by } : {};
function arriveBubbles() {
  if (S.travel) { bubbles.set([]); return; }
  const T = STOPS[S.st][LANG];
  bubbles.set((STOPS[S.st].bubbles || []).map((b, i) => { const d = b[LANG === 'ro' ? 2 : 3]; return { id: S.st + '_' + i, label: d.t, title: d.t, body: tokens(d.b), kicker: T.title, ...photo(b[4]) }; }));
}
function updateBubbles(rs) {
  if (S.travel || S.scrub) { bubbles.hideAll(); return; }
  const u = innerWidth * 0.0095;
  (STOPS[S.st].bubbles || []).forEach((b, i) => {
    const p = toScreen(b[0], b[1], Math.max(0, hAt(b[0], b[1])) * KY);
    const vis = p.ok && p.x > u * 3 && p.x < innerWidth - u * 3 && p.y > u * 6 && p.y < innerHeight - u * 8 && !under(rs, p.x, p.y, u * 1.2) && !under(rs, p.x + u * 9, p.y, u * 0.5);
    bubbles.place(S.st + '_' + i, p.x, p.y, vis);
  });
}
// the duel: who is winning right now
let toastT = 0, lastEvT = null;
function updateDuel() {
  const U = UI[LANG];
  $('dQ').textContent = fmtInt(G.q) + ' ' + U.qUnit; $('dHs').textContent = fmtN(G.hs) + ' ' + U.hsUnit;
  const r = clamp((G.q - 1500) / 2200, 0, 1.3), s = clamp((G.hs - 1.2) / 2.4, 0, 2), b = (r - s) / (r + s + 0.3);
  $('tugknob').style.left = (50 - b * 44) + '%';
  $('tugR').style.opacity = 0.35 + 0.65 * clamp(b * 2, 0, 1); $('tugS').style.opacity = 0.35 + 0.65 * clamp(-b * 2, 0, 1);
  const txt = b > 0.22 ? U.winRiver : b < -0.22 ? U.winSea : U.draw;
  if ($('dState').textContent !== txt) $('dState').textContent = txt;
  $('dState').className = b > 0.22 ? 'riv' : b < -0.22 ? 'sea' : '';
  // legend: what the colours compare with
  const st = STOPS[S.travel ? S.travel.k : S.st], ref = S.focus ? S.focus.i : effRef(st.ref);
  const lt = st.coast ? U.coastLeg : ref == null ? '' : U.legend + ' ' + epName(ref);
  $('legend').style.opacity = ref == null && !st.coast ? 0 : 1;
  if ($('lRef').textContent !== lt) $('lRef').textContent = lt;
}
function updateToast(dt, tPrev) {
  const U = UI[LANG], el = $('toast');
  toastT -= dt;
  if (S.travel && S.travel.u1 > S.travel.u0 && tPrev != null) {
    const ev = EVENTS.find(e => e.t > tPrev && e.t <= S.t);
    if (ev && ev !== lastEvT) {
      lastEvT = ev;
      el.innerHTML = ev.kind === 'flood'
        ? `<i class="sw dep"></i><b>${U.flood}</b> · ${monthName(ev.t)} · ${fmtInt(ev.v)} m³/s <span>(${fmtInt(ev.v / 0.25)} ${U.apex})</span>`
        : `<i class="sw sea"></i><b>${U.storm}</b> · ${monthName(ev.t)} · ${U.waves} ${fmtN(ev.v)} m`;
      toastT = 2.6; el.className = ev.kind;
    }
  }
  el.style.opacity = toastT > 0 ? 1 : 0;
}
function updateUI() {
  if (S.card !== lastCard) { lastCard = S.card; setCard(); }
  const stn = $('rail').querySelectorAll('.stn'), cur = S.travel ? -1 : S.st;
  stn.forEach((b, k) => { b.classList.toggle('cur', k === cur); b.classList.toggle('past', k <= S.u + 1e-6 && k !== cur); });
  const x = S.u / (NST - 1) * 100; $('trackfill').style.width = x + '%'; $('train').style.left = x + '%';
  const U = UI[LANG], t = S.focus ? SD.epochs[S.focus.i + 1].t : S.t;
  const cst = STOPS[S.travel ? S.travel.k : S.st].coast && G.coast > 0.5;
  const big = cst ? String(Math.round(lerp(CO.years[0], CO.years[1], G.coastP))) : S.focus ? `${epName(S.focus.i)} → ${epName(S.focus.i + 1)}` : monthName(t);
  if ($('tbig').textContent !== big) $('tbig').textContent = big;
  $('tbig').classList.toggle('small', !!S.focus);
  const B = bedAt(t), near = SD.epochs.findIndex(e => Math.abs(e.t - t) < 0.03);
  const sm = cst ? U.coastSat : near >= 0 && !S.focus ? `${U.survey} · ${epName(near)}` : '';
  if ($('tsmall').textContent !== sm) $('tsmall').textContent = sm;
  const tgt = S.travel ? S.travel.k : S.st;
  $('btnPrev').disabled = tgt === 0 && !S.travel;
  $('btnNext').disabled = tgt === NST - 1 && !S.travel;
  $('btnNext').classList.toggle('pulse', !S.started);
  SUI && SUI.update({ atStop: !S.travel && !S.scrub, end: S.st === NST - 1, started: S.started, blocked: bubbles.isOpen });
  charts.update(t, { q: G.q, hs: G.hs, cum: S.focus ? dvSum(0, S.focus.i + 1) : cumAtT(t) });
  updateDuel();
  updateTick();
}
// the volume ticker over the bar: how much the mouth gained / lost since the reference survey, live
function updateTick() {
  const el = $('vtick'), st = STOPS[S.travel ? S.travel.k : S.st], ref = S.focus ? S.focus.i : effRef(st.ref);
  const show = ref != null && !st.basin && !st.coast && !S.scrub;
  if (show) {
    const v = S.focus ? SD.periods[S.focus.i].dv * smooth(focusAnim) : cumAtT(S.t) - dvSum(0, ref);
    const U = UI[LANG];
    const txt = `${v >= 0 ? '▲ +' : '▼ −'}${fmtN(Math.abs(v))} ${U.mil}<small>${U.since(epName(ref))}</small>`;
    if (el.dataset.t !== txt) { el.innerHTML = txt; el.dataset.t = txt; }
    el.className = (v >= 0 ? 'pos' : 'neg') + (Math.abs(v) > 0.05 ? ' on' : '');
  } else el.className = '';
}
function basinShow(on) {
  $('basin').classList.toggle('on', on); document.body.classList.toggle('basin', on);
  document.body.classList.toggle('coast', !!STOPS[S.travel ? S.travel.k : S.st].coast);
  if (basin) { basin.on = on; if (on) { basin.fit(); basin.setMode(S.basinMode); } }
}
function setBasinMode(m) {
  S.basinMode = m; $('bBefore').classList.toggle('on', m === 'before'); $('bToday').classList.toggle('on', m === 'today');
  if (basin) basin.setMode(m);
}
const prev = () => travelTo((S.travel ? S.travel.k : S.st) - 1);
const next = () => travelTo((S.travel ? S.travel.k : S.st) + 1);
function wireUI() {
  $('btnHome').innerHTML = ICON.home; $('btnPrev').innerHTML = ICON.prev; $('btnNext').innerHTML = ICON.next; $('btnData').innerHTML = ICON.info;
  $('btnHome').onclick = () => go(HUB + 'index.html');
  $('btnPrev').onclick = prev; $('btnNext').onclick = next;
  $('btnLang').onclick = () => toggleLang();
  onLang(l => { LANG = l; setStatic(); });
  SUI = storyUI({ index: 3, hub: HUB, nextBtn: $('btnNext'), infoBtn: $('btnData'), sources: SOURCES });
  $('card').onclick = () => { if (innerWidth <= 820) $('card').classList.toggle('min'); };
  $('bBefore').onclick = () => setBasinMode('before'); $('bToday').onclick = () => setBasinMode('today');
  wireRail();
  const touches = new Set();             // 3+ contacts on the map = palms resting on the table → ignore
  renderer.domElement.addEventListener('pointerdown', e => { touches.add(e.pointerId); controls.enabled = touches.size <= 2; if (!S.travel) S.manualCam = true; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) renderer.domElement.addEventListener(ev, e => { touches.delete(e.pointerId); if (!touches.size) controls.enabled = true; });
  renderer.domElement.addEventListener('wheel', () => { if (!S.travel) S.manualCam = true; }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === ' ') next(); else if (e.key === 'ArrowLeft') prev(); else if (e.key === 'Home') go(HUB + 'index.html'); });
  const fitView = () => {
    camera.aspect = innerWidth / innerHeight; renderer.setSize(innerWidth, innerHeight);
    if (innerWidth > 820) camera.setViewOffset(innerWidth, innerHeight, -0.03 * innerWidth, 0.06 * innerHeight, innerWidth, innerHeight);
    else camera.setViewOffset(innerWidth, innerHeight, 0, 0.2 * innerHeight, innerWidth, innerHeight);
    camera.updateProjectionMatrix();
    if (basin && basin.on) basin.fit();
  };
  addEventListener('resize', fitView); fitView();
  const CD = { tday: TD.tday, q: TD.q, hs: TD.hs, periods: SD.periods, epochs: SD.epochs };
  charts.list = [...document.querySelectorAll('#charts .chart')].map(box => { const c = new Chart(box, box.dataset.tab, CD); c.onPeriod = i => setFocus(i); return c; });
  charts.setTab(STOPS[S.st].tab);
  basin = new Basin($('bmap'), SD.basin, TRIBUTARIES, DAMS, MOUTH_LL);
  setBasinMode(S.basinMode);
  setStatic();
}
// the timeline: tap = go to the nearest station; drag = scrub through the years, snapping to the nearest station on release
function railFrac(e) { const r = $('track').getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); }
function wireRail() {
  const rail = $('rail'), n = NST - 1; let drag = null;
  rail.addEventListener('pointerdown', e => { e.preventDefault(); rail.setPointerCapture(e.pointerId); drag = { id: e.pointerId, x0: e.clientX, moved: false }; });
  rail.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) < 8) return;
    if (!drag.moved) { drag.moved = true; S.scrub = true; S.started = true; S.travel = null; bubbles.close(); setFocus(null); resumeRailCam(); document.body.classList.add('travel'); basinShow(false); }
    const x = railFrac(e); S.u = x * n; S.card = Math.round(x * n);
  });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const x = railFrac(e), k = Math.round(x * n), moved = drag.moved; drag = null;
    if (!moved) { jumpTo(k); return; }
    S.scrub = false;
    S.travel = { k, u0: S.u, u1: k, T: Math.max(0.5, travelTime(S.u, k) * 0.35), p: 0, boost: 1 };
    S.card = k; lastCard = -1; charts.setTab(STOPS[k].tab);
  };
  rail.addEventListener('pointerup', up); rail.addEventListener('pointercancel', up);
}

/* ------------------------------------------------------------------ main */
const clock = new THREE.Clock();
function frame(dt) {
  const tPrev = S.t;
  stepRail(dt);
  if (S.manualCam && !S.travel && performance.now() - lastInput() > 12000) resumeRailCam();   // free look → back on the rails
  S.t = timeAt(S.u);
  if (!S.manualCam) updateCamera(dt); else controls.update();
  camera.updateMatrixWorld();
  updateScene(dt);
  const rs = panelRects();
  updateLabels(rs); updateUI(); updateBubbles(rs); updateToast(dt, tPrev);
  if (basin) basin.update(dt);
  shared.uTime.value += dt;
  renderer.render(scene, camera);
}
async function main() {
  try { await build(); }
  catch (e) {
    console.error(e);
    $('loadmsg').textContent = location.protocol === 'file:' ? 'Deschide aplicația prin start_kiosk.bat (server local) — browserul nu poate citi datele direct din fișier.' : 'Eroare la încărcarea datelor: ' + e.message;
    return;
  }
  if (Q.has('st')) { const k = clamp(parseInt(Q.get('st')) || 0, 0, NST - 1); S.u = k; S.st = S.card = k; S.started = k > 0; }
  if (Q.has('t')) { S.u = uOfTime(parseFloat(Q.get('t'))); S.st = S.card = Math.round(S.u); S.started = true; S.scrub = true; }   // a frame mid-ride: real forcing
  wireUI(); arrive();
  if (Q.has('period')) setFocus(clamp(parseInt(Q.get('period')) || 0, 0, SD.periods.length - 1));
  if (Q.has('clean')) document.body.classList.add('clean');
  if (Q.has('cp')) G.coastT = 1 + 7 * clamp(parseFloat(Q.get('cp')) || 1, 0, 1);   // captures: the coast map at this progress
  if (Q.has('snap')) document.body.classList.add('snap');
  S.t = timeAt(S.u);
  const st = STOPS[S.st]; G.q = st.proc.q; G.hs = st.proc.hs;
  const warm = parseInt(Q.get('warm')) || 0;
  for (let i = 0; i < warm; i++) { S.t = timeAt(S.u); updateScene(1 / 30); if (basin && basin.on) basin.update(1 / 10); }
  setLoad(1, '');
  frame(0);
  document.body.classList.add('ready'); ready();
  startIdle(() => go(HUB + 'index.html?reset=1'), { busy: () => !!S.travel });
  if (Q.has('ride')) travelTo(S.st + 1);                     // captures: start riding to the next station
  renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 0.1)));
}
main();
window.__story = S; window.__rail = { travelTo, jumpTo, next, prev };
window.__dbg = { scene, camera, renderer, controls, G, get flow() { return flow; }, EVENTS, frame: (dt = 1 / 30, n = 1) => { for (let i = 0; i < n; i++) frame(dt); },
  seek: t => { S.travel = null; S.u = uOfTime(t); S.st = S.card = Math.round(S.u); lastCard = -1; camSmooth = null; arrive(); } };

// Dinamica Sacalinului — engine (delta-hub). three.js r160, WebGL2.
// The year runs with the ride between stations: historical shorelines morph from one map to the next (polar lerp,
// see tools/sacalin/build_shorelines.py), and from 1984 the yearly summer satellite medians take over.
import * as THREE from 'three';
import { OrbitControls } from '../../../shared/vendor/addons/OrbitControls.js';
import { STOPS, LABELS, ANCHORS, UI, SOURCES } from './story.js';
import { EXPO } from '../../../shared/config.js';
import { getLang, toggleLang, onLang, go, startIdle, lastInput, ready, ICON, isPhone } from '../../../shared/kiosk.js';
import { gpuInfo } from '../../../shared/gpu.js';
import { Bubbles } from '../../../shared/bubbles.js';
import { storyUI } from '../../../shared/storyui.js';
import { cosmos, bgHex } from '../../../shared/cosmos.js';
import * as SH from './shaders.js';
import { Chart } from './charts.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a), 0, 1));
const Q = new URLSearchParams(location.search);
const HUB = '../../';
const STORY_ID = '03_sacalin';
let LANG = getLang();

/* ------------------------------------------------------------------ data */
async function fetchJSON(name) { const r = await fetch('data/' + name); if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); }
function setLoad(p, msg) { $('loadbar').style.width = (p * 100).toFixed(0) + '%'; if (msg != null) $('loadmsg').textContent = msg; }
let SL, CH, SI;                                  // shorelines, chart data, satellite index
let RECT;                                        // ground rectangle (km): x0, zN, w, h

// shoreline colours by year (cividis-like sequential ramp: old = blue-grey, recent = bright yellow)
const RAMP = ['#5b78c4', '#7d8aa6', '#a8a07c', '#d8c25e', '#ffe45a'];
const Y_FIRST = 1898, Y_LAST = 2013;            // the digitised shorelines (the colour ramp); later years come from the medians
let Y_END = Y_LAST;                               // last year with a shoreline of any kind
function rampCol(y) {
  const f = clamp((y - Y_FIRST) / (Y_LAST - Y_FIRST), 0, 1) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(f));
  return new THREE.Color(RAMP[i]).lerp(new THREE.Color(RAMP[i + 1]), f - i);
}

/* ------------------------------------------------------------------ polar shorelines */
let PO;                                          // { cx, cz, th0, dth, n, years[], r: {y: Float32Array(n) NaN outside}, i0, i1 }
function buildPolar() {
  const src = Object.assign({}, SL.sat_polar || {}, SL.polar);           // digitised lines win where both exist
  const n = SL.n, years = Object.keys(src).map(Number).sort((a, b) => a - b), r = {}, i0 = {}, i1 = {};
  Y_END = years[years.length - 1];
  for (const y of years) {
    const p = src[y], a = new Float32Array(n).fill(NaN);
    p.r.forEach((v, k) => { a[p.i0 + k] = v / 1000; });
    r[y] = a; i0[y] = p.i0; i1[y] = p.i0 + p.r.length - 1;
  }
  PO = { cx: SL.centre[0], cz: SL.centre[1], th0: SL.theta0, dth: SL.dtheta, n, years, r, i0, i1 };
}
const thetaRad = i => (PO.th0 + i * PO.dth) * Math.PI / 180;
function polarXZ(i, rad) { const t = thetaRad(i); return [PO.cx + rad * Math.sin(t), PO.cz - rad * Math.cos(t)]; }
// the shoreline at (fractional) year t: { a: i0, b: i1 (fractional), r(i) }, or null before the island exists
function liveLine(t) {
  const Y = PO.years;
  if (t < Y[0] - 2) return null;
  if (t <= Y[0]) {                                // 1896 → 1898: the bar emerges from the middle outward
    const y = Y[0], m = (PO.i0[y] + PO.i1[y]) / 2, h = (PO.i1[y] - PO.i0[y]) / 2 * Math.max(0.05, sstep(Y[0] - 2, Y[0], t));
    return { a: m - h, b: m + h, r: i => PO.r[y][clamp(Math.round(i), PO.i0[y], PO.i1[y])], f: sstep(Y[0] - 2, Y[0] - 1, t) };
  }
  let k = 0; while (k < Y.length - 2 && t > Y[k + 1]) k++;
  const A = Y[k], B = Y[k + 1], f = clamp((t - A) / (B - A), 0, 1);
  const rA = PO.r[A], rB = PO.r[B];
  const at = (arr, y, i) => { const c = clamp(i, PO.i0[y], PO.i1[y]), lo = Math.floor(c), hi = Math.min(PO.i1[y], lo + 1); return lerp(arr[lo], arr[hi], c - lo); };
  return { a: lerp(PO.i0[A], PO.i0[B], f), b: lerp(PO.i1[A], PO.i1[B], f), r: i => lerp(at(rA, A, i), at(rB, B, i), f), f: 1 };
}

/* ------------------------------------------------------------------ renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
// phones: 3x screens would cost too much; integrated GPUs (laptops with 150-200 % screens): 1:1 pixels
renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone() ? 1.5 : gpuInfo(renderer.getContext()).weak ? 1 : 2));
renderer.setSize(innerWidth, innerHeight);
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = null;                          // transparent: the shared cosmic background shows behind the scene
cosmos({ opacity: 0.85 });
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 500);
const world = new THREE.Group(); scene.add(world);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
controls.minDistance = 2; controls.maxDistance = 60;
controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.5;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
const shared = { uFogD: { value: 0.02 }, uFogC: { value: new THREE.Color(bgHex()) }, uTime: { value: 0 } };

/* ------------------------------------------------------------------ geometry helpers */
// a ribbon along pts [[x, z], …]: the vertex shader offsets each side by aNrm·uWidth
function ribbonArrays(pts, closed) {
  const n = pts.length, P = new Float32Array(n * 6), NR = new Float32Array(n * 4), SD = new Float32Array(n * 2), S = new Float32Array(n * 2);
  let L = 0;
  for (let i = 0; i < n; i++) {
    if (i) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[i > 0 ? i - 1 : (closed ? n - 2 : 0)], b = pts[i < n - 1 ? i + 1 : (closed ? 1 : n - 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    for (let s = 0; s < 2; s++) {
      const v = i * 2 + s;
      P[v * 3] = pts[i][0]; P[v * 3 + 2] = pts[i][1]; NR[v * 2] = -tz; NR[v * 2 + 1] = tx; SD[v] = s ? 1 : -1; S[v] = L;
    }
  }
  return { P, NR, SD, S, L };
}
function ribbonIndex(n) { const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } return idx; }
function ribbonGeom(pts, closed) {
  const { P, NR, SD, S } = ribbonArrays(pts, closed), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aNrm', new THREE.BufferAttribute(NR, 2));
  g.setAttribute('aSide', new THREE.BufferAttribute(SD, 1)); g.setAttribute('aS', new THREE.BufferAttribute(S, 1));
  g.setIndex(ribbonIndex(pts.length)); return g;
}
function lineMat(col, extra = {}) {
  return new THREE.ShaderMaterial({ vertexShader: SH.ribbonVS, fragmentShader: SH.lineFS, transparent: true, depthTest: false, depthWrite: false,
    uniforms: Object.assign({ uWidth: { value: 0.02 }, uCol: { value: col }, uAlpha: { value: 0 }, uGlow: { value: 0 }, uDash: { value: 0 }, uTime: shared.uTime }, extra) });
}

/* ------------------------------------------------------------------ scene objects */
let ground, groundMat, histTex, bathyTex, blank;
const yearLines = [];                             // static shorelines: { y, mesh, col, tip: [x, z], lbl }
let live, band, breach, drift, roll;
async function build() {
  setLoad(0.05, '');
  [SL, CH, SI] = await Promise.all([fetchJSON('shorelines.json'), fetchJSON('charts.json'), fetchJSON('sat/index.json')]);
  setLoad(0.3);
  buildPolar();
  const [E0, N0] = SL.origin, [bx0, by0, bx1, by1] = SI.bounds;
  RECT = { x0: (bx0 - E0) / 1000, zN: -(by1 - N0) / 1000, w: (bx1 - bx0) / 1000, h: (by1 - by0) / 1000 };
  SAT.list = SI.years.map(o => o.y).sort((a, b) => a - b); SAT.info = Object.fromEntries(SI.years.map(o => [o.y, o]));
  [histTex, bathyTex] = await Promise.all([loadTex('data/hist_base.webp'), loadTex('data/bathy_1898.webp')]);
  blank = new THREE.DataTexture(new Uint8Array([10, 30, 50, 255]), 1, 1); blank.needsUpdate = true;
  setLoad(0.6);
  // ---- ground
  groundMat = new THREE.ShaderMaterial({ vertexShader: SH.groundVS, fragmentShader: SH.groundFS, transparent: true, depthWrite: true,
    uniforms: Object.assign({}, shared, { tHist: { value: histTex }, tBathy: { value: bathyTex }, uBathy: { value: 0 }, uBathyOp: { value: 0 }, tA: { value: blank }, tB: { value: blank }, uAB: { value: 0 }, uSat: { value: 0 }, uWave: { value: 1 },
      uEdge: { value: 4.0 }, uRect: { value: new THREE.Vector4(RECT.x0, RECT.zN, RECT.w, RECT.h) } }) });
  const gg = new THREE.PlaneGeometry(RECT.w, RECT.h, 1, 1).rotateX(-Math.PI / 2).translate(RECT.x0 + RECT.w / 2, 0, RECT.zN + RECT.h / 2);
  ground = new THREE.Mesh(gg, groundMat); ground.renderOrder = 0; world.add(ground);
  // ---- static yearly shorelines
  for (const ys of SL.years) {
    const y = +ys, col = rampCol(y);
    for (const part of SL.lines[ys]) {
      const m = new THREE.Mesh(ribbonGeom(part), lineMat(col)); m.renderOrder = 10 + (y - 1890) / 200; m.frustumCulled = false; world.add(m);
      yearLines.push({ y, mesh: m, col });
    }
    const pts = SL.lines[ys].flat(), tip = pts.reduce((a, p) => (p[1] > a[1] ? p : a), pts[0]);     // southern end
    const d = document.createElement('div'); d.className = 'lbl yr'; d.textContent = y; d.style.background = '#' + col.getHexString();
    $('labels').appendChild(d);
    yearLines.filter(o => o.y === y)[0].lbl = { d, tip, on: false };
  }
  // ---- breach fan outline (dashed)
  breach = new THREE.Mesh(ribbonGeom(SL.breach[0], true), lineMat(new THREE.Color('#ffd27a'), { uDash: { value: 9 } }));
  breach.material.uniforms.uGlow.value = 0.6; breach.renderOrder = 30; breach.frustumCulled = false; world.add(breach);
  // ---- live shoreline + schematic sand barrier (dynamic geometry, rebuilt when the year changes)
  const N = PO.n + 4;
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aNrm', new THREE.BufferAttribute(new Float32Array(N * 4), 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(N * 2), 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(N * 2), 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(ribbonIndex(N));
    const m = new THREE.Mesh(g, lineMat(new THREE.Color('#fff4d6'))); m.material.uniforms.uGlow.value = 1; m.renderOrder = 40; m.frustumCulled = false; world.add(m);
    live = { g, m, N };
  }
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aV', new THREE.BufferAttribute(new Float32Array(N * 2), 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(N * 2), 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(ribbonIndex(N));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: SH.bandVS, fragmentShader: SH.bandFS, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uAlpha: { value: 1 } } }));
    m.renderOrder = 5; m.frustumCulled = false; world.add(m);
    band = { g, m };
  }
  // ---- rollover arrows (dynamic geometry: up to RM arrows, RP vertex pairs each)
  {
    const RM = 16, RP = 26, n = RM * RP, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    for (const [k, c] of [['aS', 1], ['aPh', 1], ['aEnv', 1]]) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n * 2 * c), c).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let m = 0; m < RM; m++) for (let i = 0; i < RP - 1; i++) { const a = (m * RP + i) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    const mat = new THREE.ShaderMaterial({ vertexShader: SH.rollVS, fragmentShader: SH.rollFS, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uAlpha: { value: 0 }, uTime: shared.uTime } });
    const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 45; mesh.frustumCulled = false; mesh.visible = false; world.add(mesh);
    roll = { RM, RP, g, mat, mesh };
  }
  // ---- longshore drift streaks
  {
    const n = 700, qg = new THREE.InstancedBufferGeometry();
    qg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    qg.setIndex([0, 1, 2, 0, 2, 3]);
    const iP = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const iD = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2).setUsage(THREE.DynamicDrawUsage);
    qg.setAttribute('iP', iP); qg.setAttribute('iD', iD); qg.instanceCount = n;
    const mat = new THREE.ShaderMaterial({ vertexShader: SH.driftVS, fragmentShader: SH.driftFS, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uLen: { value: 0.3 }, uWid: { value: 0.03 } } });
    const mesh = new THREE.Mesh(qg, mat); mesh.renderOrder = 20; mesh.frustumCulled = false; world.add(mesh);
    drift = { n, iP, iD, mat, mesh, th: new Float32Array(n), off: new Float32Array(n), age: new Float32Array(n).fill(1e9), life: new Float32Array(n), sz: new Float32Array(n), acc: 0, next: 0, live: 0 };
  }
  setLoad(0.9);
}
function loadTex(url) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, t => {
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; res(t);
  }, undefined, rej));
}

/* ------------------------------------------------------------------ satellite medians: lazy cache */
const SAT = { list: [], info: {}, cache: new Map(), pending: new Map(), shown: [null, null] };
function ensureSat(y) {
  if (y == null) return Promise.resolve(null);
  if (SAT.cache.has(y)) return Promise.resolve(SAT.cache.get(y));
  if (!SAT.pending.has(y)) SAT.pending.set(y, loadTex(`data/sat/${y}.webp`).then(t => { SAT.cache.set(y, t); SAT.pending.delete(y); evictSat(); return t; }).catch(() => { SAT.pending.delete(y); return null; }));
  return SAT.pending.get(y);
}
function evictSat() {
  if (SAT.cache.size <= 8) return;
  const t = S.year, keep = new Set(SAT.shown);
  const far = [...SAT.cache.keys()].filter(y => !keep.has(y)).sort((a, b) => Math.abs(b - t) - Math.abs(a - t));
  while (SAT.cache.size > 8 && far.length) { const y = far.shift(); SAT.cache.get(y).dispose(); SAT.cache.delete(y); }
}
function satPair(t) {                             // the two medians around t and the cross-fade between them
  const L = SAT.list; if (!L.length) return null;
  if (t <= L[0]) return { A: L[0], B: L[0], f: 0 };
  if (t >= L[L.length - 1]) return { A: L[L.length - 1], B: L[L.length - 1], f: 0 };
  let k = 0; while (k < L.length - 2 && t >= L[k + 1]) k++;
  const A = L[k], B = L[k + 1];
  return { A, B, f: sstep(0.3, 0.7, (t - A) / (B - A)) };
}
function sensorName(y) {
  const o = SAT.info[y]; if (!o) return '';
  return o.sensor === 'S2' ? 'Sentinel-2' : 'Landsat';
}

/* ------------------------------------------------------------------ story state: the rail */
// u = rail position in stations (0 … n-1); the year and the camera are functions of u
const S = { u: 0, st: 0, card: 0, travel: null, scrub: false, manualCam: false, year: STOPS[0].year, started: false };
const NST = STOPS.length;
const yearAt = u => { const k = Math.min(NST - 2, Math.floor(u)), f = clamp(u - k, 0, 1); return lerp(STOPS[k].year, STOPS[k + 1].year, f); };
const uOfYear = y => { for (let k = 0; k < NST - 1; k++) if (y <= STOPS[k + 1].year) return k + (y - STOPS[k].year) / (STOPS[k + 1].year - STOPS[k].year); return NST - 1; };
function travelTime(u0, u1) {
  const lo = Math.min(u0, u1), hi = Math.max(u0, u1); let T = 0;
  for (let k = 0; k < NST - 1; k++) T += (STOPS[k + 1].travel || 10) * Math.max(0, Math.min(hi, k + 1) - Math.max(lo, k));
  return u1 < u0 ? T / 2.5 : T;
}
function travelTo(k) {
  k = clamp(k, 0, NST - 1);
  if (S.travel && S.travel.k === k) { S.travel.boost = 4; return; }      // ▶ again while moving = fast-forward
  if (!S.travel && k === S.st) return;
  S.started = true; bubbles.close();
  S.travel = { k, u0: S.u, u1: k, T: Math.max(1.2, travelTime(S.u, k)), p: 0, boost: 1 };
  resumeRailCam(); S.card = k; lastCard = -1; charts.setTab(STOPS[k].tab);
  document.body.classList.add('travel');
}
function jumpTo(k) {                              // tap on a distant station: quick fade, no travel
  k = clamp(k, 0, NST - 1);
  if (Math.abs(k - (S.travel ? S.travel.k : S.st)) <= 1) return travelTo(k);
  S.started = true; bubbles.close();
  document.body.classList.add('dh-out');
  setTimeout(() => { S.travel = null; S.u = k; S.st = k; S.card = k; lastCard = -1; S.manualCam = false; camSmooth = null; arrive();
    document.body.classList.remove('dh-out', 'travel'); }, 420);
}
function stepRail(dt) {
  const tr = S.travel; if (!tr) return;
  tr.p = Math.min(1, tr.p + dt * tr.boost / tr.T);
  S.u = lerp(tr.u0, tr.u1, 0.5 - 0.5 * Math.cos(Math.PI * tr.p));
  if (tr.p >= 1) { S.st = tr.k; S.travel = null; document.body.classList.remove('travel'); arrive(); }
}
let SUI = null;
function arrive() { SUI && SUI.arrived(); arriveBubbles(); charts.setTab(STOPS[S.st].tab); prefetch(); }

/* ------------------------------------------------------------------ camera */
const SK = ['x', 'z', 'tilt', 'head'];
function shotPose(s) {
  const asp = camera.aspect, fit = asp < 1.3 ? Math.min(2.6, 1.3 / asp) : 1;
  const tl = THREE.MathUtils.degToRad(s.tilt), hd = THREE.MathUtils.degToRad(s.head), dist = s.dist * fit;
  const target = new THREE.Vector3(s.x, 0, s.z);
  const off = new THREE.Vector3(-Math.sin(hd) * Math.sin(tl), Math.cos(tl), Math.cos(hd) * Math.sin(tl)).multiplyScalar(dist);
  return { target, pos: target.clone().add(off) };
}
function lerpShot(a, b, t) { const o = {}; for (const k of SK) o[k] = lerp(a[k], b[k], t); o.dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)); return o; }
function currentShot() {
  const k = Math.min(NST - 2, Math.floor(S.u)), f = clamp(S.u - k, 0, 1), a = STOPS[k].shot, b = STOPS[k + 1].shot;
  const s = lerpShot(a, b, smooth(f));
  const pull = Math.max(a.dist, b.dist) / Math.min(a.dist, b.dist) > 1.6 ? 0 : 0.18;   // gentle pull-out on short hops
  s.dist *= 1 + pull * Math.sin(Math.PI * f);
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
let lastLiveT = -1;
function updateLive(t, dist) {
  const L = liveLine(Math.min(t, Y_END));
  const on = L ? L.f * (1 - 0.3 * G.sat) : 0;
  live.m.visible = on > 0.01; band.m.visible = on > 0.01 && G.sat < 0.99;
  live.m.material.uniforms.uAlpha.value = on;
  live.m.material.uniforms.uWidth.value = dist * lerp(0.004, 0.0026, G.sat);
  band.m.material.uniforms.uAlpha.value = on * (1 - G.sat);
  if (!L || Math.abs(t - lastLiveT) < 1e-4) return;
  lastLiveT = t;
  // samples from a to b (fractional ends kept exact)
  const idx = [L.a]; for (let i = Math.ceil(L.a + 1e-6); i < L.b; i++) idx.push(i); idx.push(L.b);
  const pts = idx.map(i => polarXZ(i, L.r(i)));
  const { P, NR, SD, S: SS } = ribbonArrays(pts);
  const g = live.g, n = pts.length;
  g.attributes.position.array.set(P); g.attributes.aNrm.array.set(NR); g.attributes.aSide.array.set(SD); g.attributes.aS.array.set(SS);
  for (const k of ['position', 'aNrm', 'aSide', 'aS']) { g.attributes[k].needsUpdate = true; g.attributes[k].clearUpdateRanges?.(); }
  g.setDrawRange(0, (n - 1) * 6);
  // the schematic barrier: from the shoreline landward, widening as the island matures, tapered at both tips
  const w = lerp(0.12, 0.32, clamp((t - 1898) / 70, 0, 1)), bp = band.g.attributes.position.array, bv = band.g.attributes.aV.array, bt = band.g.attributes.aT.array;
  const span = Math.max(1, L.b - L.a);
  idx.forEach((i, k) => {
    const r = L.r(i), tap = Math.min(1, Math.min(i - L.a, L.b - i) / Math.min(18, span * 0.25));
    const o = polarXZ(i, r), inn = polarXZ(i, r - w * (0.35 + 0.65 * tap));
    bp[k * 6] = o[0]; bp[k * 6 + 2] = o[1]; bp[k * 6 + 3] = inn[0]; bp[k * 6 + 5] = inn[1];
    bv[k * 2] = 0; bv[k * 2 + 1] = 1; bt[k * 2] = bt[k * 2 + 1] = tap;
  });
  for (const k of ['position', 'aV', 'aT']) band.g.attributes[k].needsUpdate = true;
  band.g.setDrawRange(0, (n - 1) * 6);
}
const G = { sat: 0, breach: 0, drift: 0, wave: 1 };
function updateScene(dt) {
  const t = S.year, dist = viewDist(), snap = dt === 0;
  const k = snap ? 1 : 1 - Math.exp(-dt * 1.8);
  // satellite era: the map fades into the medians just before the first image year
  const Y0 = SAT.list[0] || 1984;
  G.sat = sstep(Y0 - 2.5, Y0 + 0.2, t);
  const pair = satPair(t);
  if (pair && G.sat > 0) {
    const tA = SAT.cache.get(pair.A), tB = SAT.cache.get(pair.B);
    if (tA) { groundMat.uniforms.tA.value = tA; SAT.shown[0] = pair.A; }
    if (tB) { groundMat.uniforms.tB.value = tB; SAT.shown[1] = pair.B; groundMat.uniforms.uAB.value = pair.f; }
    else groundMat.uniforms.uAB.value = 0;
    ensureSat(pair.A); ensureSat(pair.B);
    const i = SAT.list.indexOf(pair.B); if (i >= 0) ensureSat(SAT.list[i + 1]);   // one year ahead
  }
  groundMat.uniforms.uSat.value = G.sat;
  // the 1898 platform: a glimpse under the waves before the island, solid at its birth, then it fades (it is a 1898 survey)
  groundMat.uniforms.uBathyOp.value = sstep(1894.5, 1898, t);
  groundMat.uniforms.uBathy.value = 1 - sstep(1905, 1932, t);
  groundMat.uniforms.uWave.value = 1 - G.sat;
  // processes of the target station (fade while travelling)
  const tgt = STOPS[S.travel ? S.travel.k : S.st];
  G.breach = lerp(G.breach, tgt.breach && !S.travel ? 1 : 0, k);
  G.drift = lerp(G.drift, tgt.drift ? 1 : 0, k);
  breach.material.uniforms.uAlpha.value = G.breach; breach.visible = G.breach > 0.01;
  breach.material.uniforms.uWidth.value = dist * 0.003;
  // static shorelines: each appears when the year reaches it; the newest one stays bright, older ones step back
  const visYears = SL.years.map(Number).filter(y => y <= t + 0.2);
  const newest = visYears[visYears.length - 1];
  for (const o of yearLines) {
    const a = sstep(o.y - 0.8, o.y + 0.2, t) * (o.y === newest ? 0.95 : 0.6) * (1 - 0.25 * G.sat);
    o.mesh.material.uniforms.uAlpha.value = a; o.mesh.visible = a > 0.01;
    o.mesh.material.uniforms.uWidth.value = dist * (o.y === newest ? 0.0026 : 0.0018);
  }
  updateLive(t, dist);
  updateDrift(dt, dist, t);
  updateRoll(dist, t);
  // fog + camera range
  shared.uFogD.value = 0.5 / Math.max(dist * 2.6, 8);
  camera.near = Math.max(0.01, dist * 0.01); camera.far = Math.max(100, dist * 8); camera.updateProjectionMatrix();
}
// longshore drift: grains travel along the shoreline of the moment (polar index ↑ = north → south-west) and settle at the tip
function updateDrift(dt, dist, t) {
  const D = drift, on = G.drift * (t >= 1897 ? 1 : 0) * (1 - 0.55 * G.sat);   // quieter over the photos
  D.mesh.visible = on > 0.01 || D.live > 0;
  if (!D.mesh.visible) return;
  const L = liveLine(Math.min(t, Y_END)); if (!L) { D.mesh.visible = false; return; }
  const kk = dist / 20, R = SL.R, dsamp = PO.dth * Math.PI / 180 * R;           // km per polar sample
  const speed = 0.5 * kk / dsamp;                                                 // samples per second
  D.mat.uniforms.uLen.value = 0.55 * kk; D.mat.uniforms.uWid.value = 0.045 * kk;
  if (on > 0.01) {
    D.acc += dt * 70 * on * clamp((L.b - L.a) / 300, 0.15, 1);
    while (D.acc >= 1) {
      D.acc -= 1; const i = D.next; D.next = (D.next + 1) % D.n;
      D.th[i] = lerp(L.a, L.b - 6, Math.random()); D.off[i] = (0.06 + Math.random() * 0.5) * kk;
      D.age[i] = 0; D.life[i] = 3 + Math.random() * 3; D.sz[i] = 0.7 + Math.random() * 0.6;
    }
  }
  const P4 = D.iP.array, D2 = D.iD.array; let live = 0;
  for (let i = 0; i < D.n; i++) {
    if (D.age[i] > D.life[i]) { P4[i * 4 + 2] = 0; continue; }
    const toTip = L.b - D.th[i], end = sstep(0, 25, toTip);                     // slows down and settles near the tip
    D.th[i] += dt * speed * (0.2 + 0.8 * end); D.age[i] += dt * (end < 0.05 ? 4 : 1);
    if (D.th[i] > L.b) { D.age[i] = 1e9; P4[i * 4 + 2] = 0; continue; }
    const r = L.r(D.th[i]) + D.off[i] * (0.4 + 0.6 * end), th = thetaRad(D.th[i]);
    const [x, z] = polarXZ(D.th[i], r);
    const u = D.age[i] / D.life[i], a = Math.min(1, u * 5) * Math.min(1, (1 - u) * 3) * (0.4 + 0.6 * end);
    P4[i * 4] = x; P4[i * 4 + 1] = z; P4[i * 4 + 2] = a * on * 0.9; P4[i * 4 + 3] = D.sz[i];
    D2[i * 2] = Math.cos(th); D2[i * 2 + 1] = Math.sin(th);
    live++;
  }
  D.live = live; D.iP.needsUpdate = true; D.iD.needsUpdate = true;
}
// rollover (1944–1971, the stormy decades): curved arrows coming from the north-east, over the island into the lagoon.
// The arrows sit at fixed places along the coast (fixed polar angles) and only their radius follows the moving island;
// near the two tips they fade out. Each arrow: offshore and to the north at its tail, landward and south at its head.
const ROLL_STEP = 46;                                        // polar samples between arrows (≈ 1.5 km)
function updateRoll(dist, t) {
  const on = sstep(1942, 1946, t) * (1 - sstep(1971.5, 1975, t)) * (1 - G.sat);
  roll.mat.uniforms.uAlpha.value = on; roll.mesh.visible = on > 0.01;
  if (!roll.mesh.visible) return;
  const L = liveLine(t); if (!L) { roll.mesh.visible = false; return; }
  const { RM, RP, g } = roll, P = g.attributes.position.array, AS = g.attributes.aS.array, PH = g.attributes.aPh.array, EN = g.attributes.aEnv.array;
  const w = dist * 0.0052, T = shared.uTime.value, SHAFT = RP - 6;
  const sOf = j => j < SHAFT ? 0.82 * j / (SHAFT - 1) : 0.82 + 0.18 * (j - SHAFT) / (RP - SHAFT - 1);
  for (let k = 0; k < RM; k++) {
    const ic = 24 + k * ROLL_STEP;                           // where the arrow crosses the island
    const ends = sstep(L.a + 8, L.a + 30, ic - 10) * (1 - sstep(L.b - 34, L.b - 8, ic + 10));
    const ph = (k * 0.37) % 1, env = ends * Math.sin(Math.PI * ((T / 3.2 + ph) % 1)) ** 2;
    const pts = [];
    for (let j = 0; j < RP; j++) {
      const s = sOf(j), ii = clamp(ic, L.a, L.b);
      // tail: 0.9 km offshore and ~0.7 km to the north; it bends landward as it reaches the island
      const th = ic - 22 + 30 * Math.sin(Math.PI / 2 * s);
      const r = L.r(ii) + 0.9 - 1.55 * Math.pow(s, 1.35);
      pts.push(polarXZ(th, r));
    }
    for (let j = 0; j < RP; j++) {
      const a = pts[Math.max(0, j - 1)], b = pts[Math.min(RP - 1, j + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const s = sOf(j), hw = j < SHAFT ? w * (0.55 + 0.45 * Math.min(1, s * 3)) : w * 2.4 * (1 - (j - SHAFT) / (RP - SHAFT - 1));
      for (let q = 0; q < 2; q++) {
        const v = (k * RP + j) * 2 + q, sd = q ? 1 : -1;
        P[v * 3] = pts[j][0] - tz * hw * sd; P[v * 3 + 2] = pts[j][1] + tx * hw * sd;
        AS[v] = s; PH[v] = ph; EN[v] = env;
      }
    }
  }
  for (const k of ['position', 'aS', 'aPh', 'aEnv']) g.attributes[k].needsUpdate = true;
}
function prefetch() {                              // the images of the next station, before the visitor presses ▶
  const nx = STOPS[Math.min(NST - 1, S.st + 1)].year, p = satPair(nx);
  if (p) { ensureSat(p.A); ensureSat(p.B); }
}

/* ------------------------------------------------------------------ labels */
const LBL = [];
LABELS.forEach(L => { const d = document.createElement('div'); d.className = 'lbl ' + L[6]; $('labels').appendChild(d); LBL.push({ L, d, on: false }); });
const pv = new THREE.Vector3();
function toScreen(x, z) { pv.set(x, 0, z).applyMatrix4(world.matrixWorld).project(camera); return { x: (pv.x + 1) / 2 * innerWidth, y: (1 - pv.y) / 2 * innerHeight, ok: pv.z < 1 && Math.abs(pv.x) < 1.05 && Math.abs(pv.y) < 1.05 }; }
function panelRects() { return [...['card', 'coast', 'bar', 'time'].map(id => $(id)), ...document.querySelectorAll('#charts .chart')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0); }
const under = (rs, x, y, m = 0) => rs.some(r => x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m);
function updateLabels(rs) {
  const u = innerWidth * 0.0095, bub = bubbles.visible();
  for (const o of LBL) {
    const [ro, en, x, z, yA, yB] = o.L, txt = LANG === 'ro' ? ro : en;
    let show = S.year >= yA && S.year <= yB;
    if (show) {
      const p = toScreen(x, z);
      if (!p.ok || under(rs, p.x, p.y, u) || bub.some(b => Math.abs(b.x - p.x) < u * 9 && Math.abs(b.y - p.y) < u * 2.4)) show = false;
      else o.d.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) translate(-50%,-50%)`;
    }
    if (o.d.textContent !== txt) o.d.textContent = txt;
    if (show !== o.on) { o.on = show; o.d.classList.toggle('on', show); }
  }
  // year chips at the southern tip of each visible shoreline; newer chips win collisions
  const placed = [];
  for (const o of [...yearLines].filter(o => o.lbl).sort((a, b) => b.y - a.y)) {
    const L = o.lbl; let show = o.mesh.visible && o.mesh.material.uniforms.uAlpha.value > 0.3 && !S.travel;
    if (show) {
      const p = toScreen(L.tip[0], L.tip[1]);
      if (!p.ok || under(rs, p.x, p.y, u) || placed.some(q => Math.abs(q.x - p.x) < u * 3.2 && Math.abs(q.y - p.y) < u * 1.6)) show = false;
      else { placed.push(p); L.d.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) translate(-50%,40%)`; }
    }
    if (show !== L.on) { L.on = show; L.d.classList.toggle('on', show); }
  }
}

/* ------------------------------------------------------------------ UI */
const bubbles = new Bubbles();
let lastCard = -1;
// the chart column: every chart is always on screen; the one of the current station is highlighted
const charts = {
  list: [], tab: null,
  setTab(t) { this.tab = t; this.list.forEach(c => c.setActive(c.tab === t)); },
  setLang(l, U) { this.list.forEach(c => c.setLang(l, U)); },
  update(y) { this.list.forEach(c => c.update(y)); }
};
const fmtYear = y => String(Math.round(y));
function stationsDOM() {
  const rail = $('rail'); rail.querySelectorAll('.stn,.anc').forEach(e => e.remove());
  STOPS.forEach((st, k) => {
    const b = document.createElement('button'); b.className = 'stn'; b.style.left = (k / (NST - 1) * 100) + '%';
    b.innerHTML = `<span class="a">${st.year}</span><span class="d"></span><span class="n">${st.short[LANG]}</span>`;
    rail.appendChild(b);
  });
  ANCHORS.forEach(a => {
    const x = uOfYear(a.y) / (NST - 1);
    if (Math.abs(x * (NST - 1) - Math.round(x * (NST - 1))) < 0.3) return;
    const m = document.createElement('div'); m.className = 'anc'; m.style.left = (x * 100) + '%';
    m.innerHTML = `<i></i><b>${a[LANG]}</b>`; rail.appendChild(m);
  });
}
function rampDOM() {
  $('ramp').style.background = `linear-gradient(90deg,${RAMP.join(',')})`;
  $('coastcap').textContent = UI[LANG].coast;
  $('rampticks').innerHTML = [1898, 1944, 1989, 2013].map(y => `<span style="left:${(y - Y_FIRST) / (Y_LAST - Y_FIRST) * 100}%">${y}</span>`).join('');
}
function setStatic() {
  const U = UI[LANG];
  $('btnLang').textContent = U.lang; $('loadt').textContent = U.title;
  document.title = U.title + ' · DELTA-Hub';
  stationsDOM(); rampDOM(); lastCard = -1; arriveBubbles();
  charts.setLang(LANG, U);
}
function setCard() {
  const U = UI[LANG], k = S.card, T = STOPS[k][LANG];
  $('kicker').textContent = T.kicker; $('ctitle').textContent = T.title; $('cbody').textContent = T.body;
  $('cfact').textContent = T.fact || ''; $('cfact').style.display = T.fact ? '' : 'none';
  $('chint').innerHTML = k === 0 ? `<span class="dot"></span>${U.hintStart} ${U.hintBub}` : '';
  const end = $('cend'), last = k === NST - 1;
  end.style.display = last ? '' : 'none';
  if (last) {
    const i = EXPO.stories.findIndex(s => s.id === STORY_ID), nx = EXPO.stories[i + 1];
    end.innerHTML = `<button class="bt txt" id="eMenu">${ICON.home.replace('<svg', '<svg style="width:1.2em;height:1.2em;margin-right:.5em"')}${U.menu}</button>` +
      (nx ? `<button class="bt txt ${nx.ready ? 'go' : ''}" id="eNext" ${nx.ready ? '' : 'disabled'}>${U.nextStory}${nx.ready ? ' →' : ' · ' + U.soon}</button>` : '');
    $('eMenu').onclick = () => go(HUB + 'index.html');
    if (nx) $('eNext').onclick = () => go(HUB + 'stories/' + nx.id + '/index.html');
  }
  const card = $('card'); card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
}
// optional photo on a bubble: 5th element { img, by } → the sheet shows it (tap = full screen)
const photo = o => o && o.img ? { img: o.img, credit: (LANG === 'ro' ? 'Foto: ' : 'Photo: ') + o.by } : {};
function arriveBubbles() {
  if (S.travel) { bubbles.set([]); return; }
  const T = STOPS[S.st][LANG];
  bubbles.set((STOPS[S.st].bubbles || []).map((b, i) => { const d = b[LANG === 'ro' ? 2 : 3]; return { id: S.st + '_' + i, label: d.t, title: d.t, body: d.b, kicker: T.title, ...photo(b[4]) }; }));
}
function updateBubbles(rs) {
  if (S.travel || S.scrub) { bubbles.hideAll(); return; }
  const u = innerWidth * 0.0095;
  (STOPS[S.st].bubbles || []).forEach((b, i) => {
    const p = toScreen(b[0], b[1]);
    const vis = p.ok && p.x > u * 3 && p.x < innerWidth - u * 3 && p.y > u * 6 && p.y < innerHeight - u * 8 && !under(rs, p.x, p.y, u * 1.2) && !under(rs, p.x + u * 9, p.y, u * 0.5);   // the label runs to the right
    bubbles.place(S.st + '_' + i, p.x, p.y, vis);
  });
}
function updateUI() {
  if (S.card !== lastCard) { lastCard = S.card; setCard(); }
  const stn = $('rail').querySelectorAll('.stn'), cur = S.travel ? -1 : S.st;
  stn.forEach((b, k) => { b.classList.toggle('cur', k === cur); b.classList.toggle('past', k <= S.u + 1e-6 && k !== cur); });
  const x = S.u / (NST - 1) * 100; $('trackfill').style.width = x + '%'; $('train').style.left = x + '%';
  const U = UI[LANG], t = S.year;
  $('tbig').textContent = fmtYear(t);
  const Y0 = SAT.list[0] || 1984;
  const era = t < 1897.5 ? U.eraBirth : (t < Y0 - 0.5 ? U.eraMap : U.eraSat(sensorName(satPair(t).f > 0.5 ? satPair(t).B : satPair(t).A)));
  if ($('tsmall').textContent !== era) $('tsmall').textContent = era;
  const rf = (t - Y_FIRST) / (Y_LAST - Y_FIRST);
  $('rampcur').style.left = clamp(rf, 0, 1) * 100 + '%'; $('rampcur').style.opacity = rf >= -0.01 && rf <= 1.01 ? 1 : 0.25;
  const tgt = S.travel ? S.travel.k : S.st;
  $('btnPrev').disabled = tgt === 0 && !S.travel;
  $('btnNext').disabled = tgt === NST - 1 && !S.travel;
  $('btnNext').classList.toggle('pulse', !S.started);
  SUI && SUI.update({ atStop: !S.travel && !S.scrub, end: S.st === NST - 1, started: S.started, blocked: bubbles.isOpen });
  charts.update(t);
}
const prev = () => travelTo((S.travel ? S.travel.k : S.st) - 1);
const next = () => travelTo((S.travel ? S.travel.k : S.st) + 1);
function wireUI() {
  $('btnHome').innerHTML = ICON.home; $('btnPrev').innerHTML = ICON.prev; $('btnNext').innerHTML = ICON.next; $('btnData').innerHTML = ICON.info;
  $('btnHome').onclick = () => go(HUB + 'index.html');
  $('btnPrev').onclick = prev; $('btnNext').onclick = next;
  $('btnLang').onclick = () => toggleLang();
  onLang(l => { LANG = l; setStatic(); });
  SUI = storyUI({ index: 2, hub: HUB, nextBtn: $('btnNext'), infoBtn: $('btnData'), sources: SOURCES });
  $('card').onclick = () => { if (isPhone()) $('card').classList.toggle('min'); };
  wireRail();
  const touches = new Set();             // 3+ contacts on the map = palms resting on the table → ignore
  renderer.domElement.addEventListener('pointerdown', e => { touches.add(e.pointerId); controls.enabled = touches.size <= 2; if (!S.travel) S.manualCam = true; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) renderer.domElement.addEventListener(ev, e => { touches.delete(e.pointerId); if (!touches.size) controls.enabled = true; });
  renderer.domElement.addEventListener('wheel', () => { if (!S.travel) S.manualCam = true; }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === ' ') next(); else if (e.key === 'ArrowLeft') prev(); else if (e.key === 'Home') go(HUB + 'index.html'); });
  const fitView = () => {
    camera.aspect = innerWidth / innerHeight; renderer.setSize(innerWidth, innerHeight);
    if (innerWidth > 820) camera.setViewOffset(innerWidth, innerHeight, 0, 0.07 * innerHeight, innerWidth, innerHeight);   // the map sits above the panels
    else camera.setViewOffset(innerWidth, innerHeight, 0, 0.2 * innerHeight, innerWidth, innerHeight);
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', fitView); fitView();
  charts.list = [...document.querySelectorAll('#charts .chart')].map(box => new Chart(box, box.dataset.tab, CH));
  charts.setTab(STOPS[S.st].tab);
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
    if (!drag.moved) { drag.moved = true; S.scrub = true; S.started = true; S.travel = null; bubbles.close(); resumeRailCam(); document.body.classList.add('travel'); }
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
  stepRail(dt);
  if (S.manualCam && !S.travel && performance.now() - lastInput() > 12000) resumeRailCam();   // free look → back on the rails
  S.year = yearAt(S.u);
  if (!S.manualCam) updateCamera(dt); else controls.update();
  world.updateMatrixWorld(); camera.updateMatrixWorld();
  updateScene(dt);
  const rs = panelRects();
  updateLabels(rs); updateUI(); updateBubbles(rs);
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
  if (Q.has('year')) { const y = parseFloat(Q.get('year')); S.u = uOfYear(y); S.st = S.card = Math.round(S.u); S.started = true; }
  wireUI(); arrive();
  if (Q.has('clean')) document.body.classList.add('clean');
  // the images of the starting year before the first frame
  const p = satPair(yearAt(S.u)); if (p) await Promise.all([ensureSat(p.A), ensureSat(p.B)]);
  setLoad(1, '');
  frame(0);
  document.body.classList.add('ready'); ready();
  startIdle(() => go(HUB + 'index.html?reset=1'), { busy: () => !!S.travel });
  renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 0.1)));
}
main();
window.__story = S; window.__rail = { travelTo, jumpTo, next, prev };
window.__dbg = { scene, camera, renderer, controls, SAT, G, frame: (dt = 1 / 30, n = 1) => { for (let i = 0; i < n; i++) frame(dt); }, seek: y => { S.travel = null; S.u = uOfYear(y); S.st = S.card = Math.round(S.u); lastCard = -1; camSmooth = null; arrive(); } };

// Povestea Deltei — engine (delta-hub). three.js r160, WebGL2, WebXR.
import * as THREE from 'three';
import { OrbitControls } from '../../../shared/vendor/addons/OrbitControls.js';
import { CHAPTERS, LABELS, ANCHORS, UI, SOURCES, MOUTHS, ICE, STOPS, TRAVEL, TRIBUTARIES } from './story.js';
import { CONFIG } from './config.js';
import { makeQR } from './qr.js';
import { EXPO } from '../../../shared/config.js';
import { KIOSK, getLang, toggleLang, onLang, go, startIdle, lastInput, ready, ICON } from '../../../shared/kiosk.js';
import { Bubbles } from '../../../shared/bubbles.js';
import { storyUI } from '../../../shared/storyui.js';
import { cosmos, bgHex } from '../../../shared/cosmos.js';
import * as SH from './shaders.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const HIDE = new Set((new URLSearchParams(location.search).get('hide') || '').split(',').filter(Boolean));   // debug: ?hide=inner,outer,europe,water
const BASIN_NEAR = 1350;            // km: below this view distance the regional + delta grids replace the whole-Europe relief
let LANG = getLang();
const HUB = '../../';
// below the delta apex, when the sea stood low: across the (dry) Danube Bay and the shelf towards the Viteaz canyon head;
// the ribbons hide wherever the water of the moment covers them, so the river always ends at the coast of the moment
const SHELF_LL = [[29.95, 44.72], [30.3, 44.5], [30.6, 44.28], [30.85, 44.08]];

/* ------------------------------------------------------------------ data */
async function fetchBin(name) {
  if (window.EMBED && window.EMBED[name]) {
    const raw = atob(window.EMBED[name]); const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    return name.endsWith('.gz') ? await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : u8.buffer;
  }
  const r = await fetch('data/' + name);
  if (!r.ok) throw new Error(name + ' ' + r.status);
  if (!name.endsWith('.gz')) return r.arrayBuffer();
  return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
async function fetchJSON(name) {
  if (window.EMBED && window.EMBED[name]) return JSON.parse(atob(window.EMBED[name]));
  return (await fetch('data/' + name)).json();
}
function setLoad(p, msg) { $('loadbar').style.width = (p * 100).toFixed(0) + '%'; if (msg) $('loadmsg').textContent = msg; }

/* ------------------------------------------------------------------ helpers */
let META;
function interp(tbl, t) {                  // tbl: [[ka, v...], ...] descending ka -> array of values
  const n = tbl[0].length - 1;
  if (t >= tbl[0][0]) return tbl[0].slice(1);
  for (let i = 0; i < tbl.length - 1; i++) {
    const a = tbl[i], b = tbl[i + 1];
    if (t <= a[0] && t >= b[0]) { const f = (a[0] - t) / (a[0] - b[0]); const o = []; for (let k = 1; k <= n; k++) o.push(a[k] + (b[k] - a[k]) * f); return o; }
  }
  return tbl[tbl.length - 1].slice(1);
}
function seaLevel(t) {
  if (t > 10) return interp(META.sea_level_global.concat([[10, META.sea_level[0][1]]]), t)[0];
  return interp(META.sea_level, t)[0];
}
// EPSG:9809 oblique stereographic (Stereo 70, Krasovsky) — matches pyproj to ~0.1 km after the datum shift
const ST70 = (() => {
  const a = 6378245.0, f = 1 / 298.3, e2 = 2 * f - f * f, e = Math.sqrt(e2), lat0 = 46 * Math.PI / 180, lon0 = 25 * Math.PI / 180, k0 = 0.99975;
  const rho0 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(lat0) ** 2, 1.5), nu0 = a / Math.sqrt(1 - e2 * Math.sin(lat0) ** 2);
  const R = Math.sqrt(rho0 * nu0), n = Math.sqrt(1 + e2 * Math.cos(lat0) ** 4 / (1 - e2));
  const S1 = (1 + Math.sin(lat0)) / (1 - Math.sin(lat0)), S2 = (1 - e * Math.sin(lat0)) / (1 + e * Math.sin(lat0));
  const w1 = Math.pow(S1 * Math.pow(S2, e), n), sc0 = (w1 - 1) / (w1 + 1);
  const c = (n + Math.sin(lat0)) * (1 - sc0) / ((n - Math.sin(lat0)) * (1 + sc0));
  const w2 = c * w1, chi0 = Math.asin((w2 - 1) / (w2 + 1));
  return (lonD, latD) => {
    const lon = lonD * Math.PI / 180, lat = latD * Math.PI / 180, L = n * (lon - lon0) + lon0;
    const sl = Math.sin(lat), Sa = (1 + sl) / (1 - sl), Sb = (1 - e * sl) / (1 + e * sl);
    const w = c * Math.pow(Sa * Math.pow(Sb, e), n), chi = Math.asin((w - 1) / (w + 1));
    const B = 1 + Math.sin(chi) * Math.sin(chi0) + Math.cos(chi) * Math.cos(chi0) * Math.cos(L - lon0);
    return [500000 + 118 + 2 * R * k0 * Math.cos(chi) * Math.sin(L - lon0) / B,
            500000 + 32 + 2 * R * k0 * (Math.sin(chi) * Math.cos(chi0) - Math.cos(chi) * Math.sin(chi0) * Math.cos(L - lon0)) / B];
  };
})();
function chaikin(pts, it) {                // pts: arrays of numbers (all columns smoothed)
  for (let k = 0; k < it; k++) {
    const o = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      o.push(p.map((v, j) => 0.75 * v + 0.25 * q[j]), p.map((v, j) => 0.25 * v + 0.75 * q[j]));
    }
    o.push(pts[pts.length - 1]); pts = o;
  }
  return pts;
}

const ydKm = v => 0.001 * (v >= 0 ? (v <= 3 ? 60 * v : 180 + 1000 * Math.log(1 + (v - 3) / 16.667)) : (-v <= 3 ? 60 * v : -(180 + 400 * Math.log(1 + (-v - 3) / 6.6667))));   // = yd() in shaders.js
function boxBlur(a, w, h, r) {             // separable box blur in place (r cells)
  const t = new Float32Array(a.length), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { const o = y * w; let s = 0; for (let x = -r; x <= r; x++) s += a[o + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) { t[o + x] = s / n; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) { a[y * w + x] = s / n; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
}
// the water level drawn (m): the sea level curve, except that the reconstructed bay floor (−4…−12 m) floods between
// 9.7 and 8.3 ka, ahead of the real curve — one level for every grid, so the flood front follows the bathymetry
const FLOOD = [[9.7, -36], [9.3, -14], [8.3, -3.5]];
function waterLevel(t) { return Math.max(seaLevel(t), t > FLOOD[0][0] ? -999 : pw(FLOOD, t, 0, 1)); }

/* ------------------------------------------------------------------ renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
// quality: integrated / mobile GPUs get the light terrain (lod 2) and 1:1 pixels; ?q=hi | ?q=lo forces it
const GPU = (() => { try { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { return ''; } })();
const QQ = new URLSearchParams(location.search).get('q');
const WEAK = QQ === 'lo' || (QQ !== 'hi' && (/Mobi|Android|Quest|OculusBrowser/i.test(navigator.userAgent) ||
  (/Intel|Radeon\(TM\)|Radeon Graphics|Vega \d|Mali|Adreno|PowerVR|Apple GPU|SwiftShader|llvmpipe|Basic Render/i.test(GPU) && !/RTX|GTX|Quadro|Radeon RX|Radeon Pro|Arc\(TM\) A/i.test(GPU))));
const PR_MAX = WEAK ? 1 : Math.min(devicePixelRatio, 2);
let prNow = PR_MAX;
renderer.setPixelRatio(prNow);
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = null;                          // transparent: the shared cosmic background shows behind the scene
const COSMOS = cosmos({ opacity: 0.85 });
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 60000);
const world = new THREE.Group(); scene.add(world);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = THREE.MathUtils.degToRad(78);
controls.minDistance = 42; controls.maxDistance = 9000;   // = the closest station shot; closer, the 110 m stage maps show their cells
controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.5;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

const shared = {
  uRSL: { value: 0 }, uVX: { value: 1 }, uFogD: { value: 0.002 }, uFogC: { value: new THREE.Color(bgHex()) },
  uLight: { value: new THREE.Vector3(-0.45, 0.8, 0.35) }, uClipR: { value: 0 }, uClipC: { value: new THREE.Vector3() },
  uTime: { value: 0 }, uReal: { value: 0 },
  tSpot: { value: null }, uSpotR: { value: new THREE.Vector4(0, 0, 1, 1) }, uSpotK: { value: 0 }   // the delta in a spotlight, the rest in shade
};
const stageU = { uK: { value: -1 }, uFrac: { value: 0 }, uSpitP: { value: 0 }, uSacP: { value: 0 }, uSpitZ: { value: -99 } };

/* ------------------------------------------------------------------ geometry */
function gridIndex(nc, nr, keep) {
  const idx = [];
  for (let r = 0; r < nr - 1; r++) for (let c = 0; c < nc - 1; c++) {
    const a = r * nc + c, b = a + 1, d = a + nc, e = d + 1;
    if (!keep || keep(a, b, d)) idx.push(a, b, d);
    if (!keep || keep(b, d, e)) idx.push(b, e, d);
  }
  return idx.length > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
}
function ribbonGeom(pts, hs) {             // pts: [[x,z],...] km; hs: heights (m) or null
  const n = pts.length, P = new Float32Array(n * 2 * 3), H = new Float32Array(n * 2), SD = new Float32Array(n * 2), NR = new Float32Array(n * 4), S = new Float32Array(n * 2), LN = new Float32Array(n * 2);
  let L = 0; const cum = [0];
  for (let i = 1; i < n; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    for (let s = 0; s < 2; s++) {
      const v = i * 2 + s;
      P[v * 3] = pts[i][0]; P[v * 3 + 2] = pts[i][1];
      H[v] = hs ? hs[i] : 0; SD[v] = s ? 1 : -1; NR[v * 2] = -tz; NR[v * 2 + 1] = tx; S[v] = cum[i] / L; LN[v] = cum[i];
    }
  }
  const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aH', new THREE.BufferAttribute(H, 1));
  g.setAttribute('aSide', new THREE.BufferAttribute(SD, 1)); g.setAttribute('aNrm', new THREE.BufferAttribute(NR, 2));
  g.setAttribute('aS', new THREE.BufferAttribute(S, 1)); g.setAttribute('aLen', new THREE.BufferAttribute(LN, 1));
  g.setIndex(idx); return { g, L };
}

let ORIGIN, INNER_RECT, OUTER_RECT, innerMat, outerMat, euroMat, waterMesh, euroMesh, euroWhole, outerMesh, innerMesh, riverMesh, tribMat, danMesh = null, sacMesh = null, spitMesh = null, outerHpre = () => 0;
let plumes = null, drift = null, SDF = null, dikeMesh = null, anthT = 0; const tribMeshes = []; let wholeView = false;
let sdRT = null, sdScene = null, sdKey = '';
const sdCam = new THREE.Camera();

async function build() {
  setLoad(0.02, 'Încarc datele…');
  META = await fetchJSON('story_meta.json');
  const I = META.inner, O = META.outer;
  ORIGIN = { e: META.origin[0], n: META.origin[1] };
  const toX = e => (e - ORIGIN.e) / 1000, toZ = n => -(n - ORIGIN.n) / 1000;
  INNER_RECT = { x0: toX(I.e0), x1: toX(I.e0 + (I.ncol - 1) * I.d), z0: toZ(I.n0 + (I.nrow - 1) * I.d), z1: toZ(I.n0) };
  OUTER_RECT = { x0: toX(O.e0), x1: toX(O.e0 + (O.ncol - 1) * O.d), z0: toZ(O.n0 + (O.nrow - 1) * O.d), z1: toZ(O.n0) };
  const lod = CONFIG.lod === 'auto' ? (WEAK ? 2 : 1) : CONFIG.lod;
  const EU = lod >= 2 ? 'europe_lo' : 'europe';
  const names = ['inner_htoday', 'inner_hland', 'inner_zsea', 'inner_cls_a', 'inner_cls_b', 'inner_flip_a', 'inner_flip_b', 'inner_dist_a', 'inner_dist_b',
                 'outer_h', 'outer_hpre', EU + '_h', EU + '_basin'].concat(lod === 1 ? ['inner_nrm55', 'europe_lo_h', 'europe_lo_basin'] : []);
  const B = {}; let done = 0;
  const danubeP = fetchJSON('danube.json'), anthP = fetchJSON('anthropo.json').catch(() => null);
  await Promise.all(names.map(async n => { B[n] = await fetchBin(n + '.bin.gz'); setLoad(0.05 + 0.75 * (++done) / names.length); }));
  const DAN = await danubeP, ANTH = await anthP;

  // ---- inner delta grid
  const NC = I.ncol, NR = I.nrow, dk = I.d / 1000;
  const ht = new Int16Array(B.inner_htoday), hl = new Int16Array(B.inner_hland), zs = new Int16Array(B.inner_zsea);
  const cols = Math.floor((NC - 1) / lod) + 1, rows = Math.floor((NR - 1) / lod) + 1;
  const pos = new Float32Array(cols * rows * 3), aH = new Float32Array(cols * rows * 3);
  for (let r = 0, v = 0; r < rows; r++) for (let c = 0; c < cols; c++, v++) {
    const R = r * lod, C = c * lod, k = R * NC + C;
    pos[v * 3] = INNER_RECT.x0 + C * dk; pos[v * 3 + 2] = INNER_RECT.z1 - R * dk;
    aH[v * 3] = ht[k] / 100; aH[v * 3 + 1] = hl[k] / 100; aH[v * 3 + 2] = zs[k] / 100;
  }
  // smoothed slopes of the present-day relief (display units, sea ~5 m below today), for soft hill shading
  const Yd = new Float32Array(NC * NR); for (let i = 0; i < NC * NR; i++) Yd[i] = ydKm(ht[i] / 100 + 5);
  boxBlur(Yd, NC, NR, 2); boxBlur(Yd, NC, NR, 2);
  const grd = new Float32Array(cols * rows * 2), Yc = (R, C) => Yd[clamp(R, 0, NR - 1) * NC + clamp(C, 0, NC - 1)];
  for (let r = 0, v = 0; r < rows; r++) for (let c = 0; c < cols; c++, v++) {
    const R = r * lod, C = c * lod;
    grd[v * 2] = (Yc(R, C + lod) - Yc(R, C - lod)) / (2 * lod * dk); grd[v * 2 + 1] = -(Yc(R + lod, C) - Yc(R - lod, C)) / (2 * lod * dk);   // row up = north = -z
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aH', new THREE.BufferAttribute(aH, 3));
  g.setAttribute('aGrad', new THREE.BufferAttribute(grd, 2));
  g.setIndex(new THREE.BufferAttribute(gridIndex(cols, rows), 1));
  const tex = (buf, w = NC, h = NR, lin = false) => { const t = new THREE.DataTexture(new Uint8Array(buf), w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.minFilter = t.magFilter = lin ? THREE.LinearFilter : THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true; return t; };
  Object.assign(stageU, {
    tCA: { value: tex(B.inner_cls_a) }, tCB: { value: tex(B.inner_cls_b) }, tFA: { value: tex(B.inner_flip_a) }, tFB: { value: tex(B.inner_flip_b) },
    tDA: { value: tex(B.inner_dist_a) }, tDB: { value: tex(B.inner_dist_b) },
    uC0: { value: new THREE.Vector2(INNER_RECT.x0, INNER_RECT.z1) }, uCD: { value: dk }, uGrid: { value: new THREE.Vector2(NC, NR) }
  });
  SDF = { a: new Uint8Array(B.inner_dist_a), b: new Uint8Array(B.inner_dist_b), fb: new Uint8Array(B.inner_flip_b), cb: new Uint8Array(B.inner_cls_b), NC, NR, x0: INNER_RECT.x0, z1: INNER_RECT.z1, dk,
          cache: new Float32Array(NC * NR), stamp: new Uint32Array(NC * NR), ver: 1 };
  const satTex = new THREE.TextureLoader().load('data/sat_4k.webp');
  const anthTex = new THREE.TextureLoader().load('data/anthropo.png');   // R canals, G dikes, B polders (build_anthropocene.py), 55 m DEM grid
  const anthC = new THREE.TextureLoader().load('data/anthropo_c.png');   // canal animation: distance from the ends, pulse phase (grows downstream)
  const brTex = new THREE.TextureLoader().load('data/branches.png');      // main branches (deep bed in the hydrodynamic model)
  anthTex.colorSpace = anthC.colorSpace = THREE.NoColorSpace; anthTex.anisotropy = 4; anthC.generateMipmaps = false; anthC.minFilter = THREE.LinearFilter;
  satTex.colorSpace = THREE.NoColorSpace; satTex.anisotropy = 4;
  const N5 = META.nrm55;
  const nrmTex = B.inner_nrm55 ? tex(B.inner_nrm55, N5.ncol, N5.nrow, true) : null;
  innerMat = new THREE.ShaderMaterial({
    vertexShader: SH.innerVS, fragmentShader: SH.innerFS, extensions: { derivatives: true },
    uniforms: Object.assign({}, shared, stageU, {
      uSeaClamp: { value: 1 }, uFlood: { value: 0 }, tSat: { value: satTex }, uSatOn: { value: 1 },
      tOut: { value: null }, uOut: { value: new THREE.Vector3() }, uInR: { value: new THREE.Vector4(INNER_RECT.x0, INNER_RECT.x1, INNER_RECT.z0, INNER_RECT.z1) },
      uSat: { value: new THREE.Vector4(toX(N5.e0 - N5.d / 2), toZ(N5.n0 - N5.d / 2 + N5.nrow * N5.d), N5.ncol * N5.d / 1000, N5.nrow * N5.d / 1000) },   // the 55 m DEM grid, edge to edge
      tNrm: { value: nrmTex }, uNrmOn: { value: nrmTex ? 1 : 0 },
      tAnth: { value: anthTex }, tAnthC: { value: anthC }, tBr: { value: brTex }, uAnth: { value: 0 }, uCanal: { value: 0 }, uPolder: { value: 0 },   // Anthropocene (last stop)
      uNrm: { value: new THREE.Vector4(toX(N5.e0 - N5.d / 2), toZ(N5.n0 - N5.d / 2 + N5.nrow * N5.d), N5.ncol * N5.d / 1000, -N5.nrow * N5.d / 1000) }
    })
  });
  // texture row 0 = south; uv.y = (z - zNorth)/(-h) -> 0 at south? keep: v = (z - z_south)/(-h) handled via negative height
  innerMat.uniforms.uNrm.value.set(toX(N5.e0 - N5.d / 2), toZ(N5.n0 - N5.d / 2), N5.ncol * N5.d / 1000, -N5.nrow * N5.d / 1000);
  innerMesh = new THREE.Mesh(g, innerMat); innerMesh.frustumCulled = false; world.add(innerMesh);
  // ---- dikes (Anthropocene): pieces of ~1.5 km, each with its build time, draped on today's relief (highest of the 4 nodes)
  if (ANTH && ANTH.dikes) {
    const hAt = (x, z) => { const c = Math.floor((x - INNER_RECT.x0) / dk), r = Math.floor((INNER_RECT.z1 - z) / dk);
      if (c < 0 || r < 0 || c >= NC - 1 || r >= NR - 1) return 0; const k = r * NC + c; return Math.max(ht[k], ht[k + 1], ht[k + NC], ht[k + NC + 1]) / 100; };
    const P = [], H = [], SD = [], NRM = [], T = [], idx = []; let v0 = 0;
    for (const pc of ANTH.dikes) {
      const t = pc[0], pts = pc.slice(1), n = pts.length; if (n < 2) continue;
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, h = hAt(pts[i][0], pts[i][1]);
        for (const sd of [-1, 1]) { P.push(pts[i][0], 0, pts[i][1]); H.push(h); SD.push(sd); NRM.push(-(b[1] - a[1]) / l, (b[0] - a[0]) / l); T.push(t); }
        if (i < n - 1) { const q = v0 + i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      }
      v0 += n * 2;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); dg.setAttribute('aH', new THREE.Float32BufferAttribute(H, 1));
    dg.setAttribute('aSide', new THREE.Float32BufferAttribute(SD, 1)); dg.setAttribute('aNrm', new THREE.Float32BufferAttribute(NRM, 2));
    dg.setAttribute('aT', new THREE.Float32BufferAttribute(T, 1)); dg.setIndex(idx);
    dikeMesh = new THREE.Mesh(dg, new THREE.ShaderMaterial({ vertexShader: SH.dikeVS, fragmentShader: SH.dikeFS, transparent: true, depthWrite: false,
      uniforms: Object.assign({}, shared, { uWidth: { value: 0.1 }, uLift: { value: 0.05 }, uDike: { value: 0 }, uAlpha: { value: 0 } }) }));
    dikeMesh.renderOrder = 7; dikeMesh.frustumCulled = false; dikeMesh.visible = false; world.add(dikeMesh);
  }

  // ---- outer GEBCO context
  {
    const oh = new Int16Array(B.outer_h), op = new Int16Array(B.outer_hpre), n = O.ncol * O.nrow, od = O.d / 1000;
    const oc = Math.floor((O.ncol - 1) / lod) + 1, orr = Math.floor((O.nrow - 1) / lod) + 1, m = oc * orr;   // mesh: every lod-th node
    const p = new Float32Array(m * 3), h = new Float32Array(m), hp = new Float32Array(m), drop = new Float32Array(m);
    const inn = (x, z, mg) => x > INNER_RECT.x0 + mg && x < INNER_RECT.x1 - mg && z > INNER_RECT.z0 + mg && z < INNER_RECT.z1 - mg;
    for (let r = 0, v = 0; r < orr; r++) for (let c = 0; c < oc; c++, v++) {
      const R = r * lod, C = c * lod, k = R * O.ncol + C;
      const x = OUTER_RECT.x0 + C * od, z = OUTER_RECT.z1 - R * od;
      p[v * 3] = x; p[v * 3 + 2] = z; h[v] = oh[k]; hp[v] = op[k]; drop[v] = inn(x, z, 0.3) ? 0.25 : 0;
    }
    // smooth (per-vertex) slopes of the displayed relief: GEBCO resampled on a finer grid shows its cell facets otherwise
    const gr = new Float32Array(m * 2), sk = od * lod;
    const ydk = v => { const y = v >= 0 ? (v <= 3 ? 60 * v : 180 + 1000 * Math.log(1 + (v - 3) / 16.667)) : (-v <= 3 ? 60 * v : -(180 + 400 * Math.log(1 + (-v - 3) / 6.6667))); return y * 0.001; };
    for (let r = 0; r < orr; r++) for (let c = 0; c < oc; c++) {
      const v = r * oc + c, H = (rr, cc) => ydk(hp[Math.min(orr - 1, Math.max(0, rr)) * oc + Math.min(oc - 1, Math.max(0, cc))] + 6);
      gr[v * 2] = (H(r, c + 1) - H(r, c - 1)) / (2 * sk); gr[v * 2 + 1] = -(H(r + 1, c) - H(r - 1, c)) / (2 * sk);   // d/dx, d/dz (row up = north = -z)
    }
    const og = new THREE.BufferGeometry();
    og.setAttribute('position', new THREE.BufferAttribute(p, 3)); og.setAttribute('aGrad', new THREE.BufferAttribute(gr, 2));
    og.setAttribute('aH', new THREE.BufferAttribute(h, 1)); og.setAttribute('aHpre', new THREE.BufferAttribute(hp, 1)); og.setAttribute('aDrop', new THREE.BufferAttribute(drop, 1));
    og.setIndex(new THREE.BufferAttribute(gridIndex(oc, orr, (a, b, d) => !(inn(p[a * 3], p[a * 3 + 2], 1.2) && inn(p[b * 3], p[b * 3 + 2], 1.2) && inn(p[d * 3], p[d * 3 + 2], 1.2))), 1));
    const ot = new Float32Array(n * 2); for (let i = 0; i < n; i++) { ot[i * 2] = oh[i]; ot[i * 2 + 1] = op[i]; }   // row 0 = south edge
    outerHpre = (x, z) => { const C = clamp(Math.round((x - OUTER_RECT.x0) / od), 0, O.ncol - 1), R = clamp(Math.round((OUTER_RECT.z1 - z) / od), 0, O.nrow - 1); return op[R * O.ncol + C]; };
    const otex = new THREE.DataTexture(ot, O.ncol, O.nrow, THREE.RGFormat, THREE.FloatType);
    otex.minFilter = otex.magFilter = THREE.NearestFilter; otex.generateMipmaps = false; otex.flipY = false; otex.needsUpdate = true;
    innerMat.uniforms.tOut.value = otex; innerMat.uniforms.uOut.value.set(OUTER_RECT.x0, OUTER_RECT.z1, od);
    outerMat = new THREE.ShaderMaterial({ vertexShader: SH.outerVS, fragmentShader: SH.outerFS, extensions: { derivatives: true }, uniforms: Object.assign({}, shared, { uOpacity: { value: 1 } }) });
    outerMesh = new THREE.Mesh(og, outerMat); outerMesh.frustumCulled = false; world.add(outerMesh);
    // the Danube from the regional grid's edge down to the delta grid (GEBCO's floodplain has no channel): a ribbon on the relief
    {
      const RK = DAN.river_km, inO = p => p[0] > OUTER_RECT.x0 + 1 && p[0] < OUTER_RECT.x1 - 1 && p[1] > OUTER_RECT.z0 + 1 && p[1] < OUTER_RECT.z1 - 1;
      let i1 = RK.length - 1; while (i1 > 0 && RK[i1][0] > -50) i1--;
      let i0 = i1; while (i0 > 0 && inO(RK[i0 - 1])) i0--;
      const low = RK.slice(i1 + 1).concat(SHELF_LL.map(p => { const xy = ST70(p[0], p[1]); return [toX(xy[0]), toZ(xy[1])]; }));   // below the apex
      const pts = chaikin(RK.slice(i0, i1 + 1).filter((p, i, A) => i % 2 === 0 || i === A.length - 1).concat(low).map(p => [p[0], p[1]]), 3);
      const samp = (arr, x, z) => {                  // lowest of the 4 surrounding nodes (the river runs in the valley bottom)
        const C = clamp(Math.floor((x - OUTER_RECT.x0) / od), 0, O.ncol - 2), R = clamp(Math.floor((OUTER_RECT.z1 - z) / od), 0, O.nrow - 2), k = R * O.ncol + C;
        return Math.min(arr[k], arr[k + 1], arr[k + O.ncol], arr[k + O.ncol + 1]);
      };
      const { g: dg } = ribbonGeom(pts, pts.map(p => samp(oh, p[0], p[1])));
      dg.setAttribute('aHpre', new THREE.BufferAttribute(new Float32Array(pts.flatMap(p => { const v = samp(op, p[0], p[1]); return [v, v]; })), 1));
      danMesh = new THREE.Mesh(dg, new THREE.ShaderMaterial({ vertexShader: SH.danVS, fragmentShader: SH.danFS, transparent: true, depthWrite: false,
        uniforms: Object.assign({}, shared, { uWidth: { value: 0.3 }, uLift: { value: 0.01 }, uAlpha: { value: 1 }, uXEnd: { value: -51 }, uPre: { value: 1 } }) }));
      danMesh.renderOrder = 6; danMesh.frustumCulled = false; world.add(danMesh);
    }
  }
  // ---- Europe: lon/lat grid projected to Stereo 70 on the fly.
  // Two meshes: the Start view shows ONE whole relief (detailed grid, no hole); everywhere else the regional + delta
  // grids sit in front, so only a light grid with a hole is needed around them (saves ~3.4 M triangles per frame).
  const makeEurope = name => {
    const E = META[name], eh = new Int16Array(B[name + '_h']), eb = new Uint8Array(B[name + '_basin']), n = E.ncol * E.nrow;
    const p = new Float32Array(n * 3), h = new Float32Array(n), ba = new Float32Array(n), ll = new Float32Array(n * 2), drop = new Float32Array(n);
    const ino = (x, z, m) => x > OUTER_RECT.x0 + m && x < OUTER_RECT.x1 - m && z > OUTER_RECT.z0 + m && z < OUTER_RECT.z1 - m;
    const dlon = (E.lon1 - E.lon0) / E.ncol, dlat = (E.lat1 - E.lat0) / E.nrow;
    for (let r = 0, v = 0; r < E.nrow; r++) for (let c = 0; c < E.ncol; c++, v++) {
      const lon = E.lon0 + (c + 0.5) * dlon, lat = E.lat0 + (r + 0.5) * dlat, xy = ST70(lon, lat);
      const x = toX(xy[0]), z = toZ(xy[1]);
      p[v * 3] = x; p[v * 3 + 2] = z; h[v] = eh[v]; ba[v] = eb[v] / 255; ll[v * 2] = lon; ll[v * 2 + 1] = lat; drop[v] = ino(x, z, 1) ? 0.4 : 0;
    }
    // smooth vertex normals of the displayed relief (the 3.7 km cells look faceted with per-triangle normals)
    const nr = new Float32Array(n * 3);
    const yk = v => { v += 60; return 0.001 * (v >= 0 ? (v <= 3 ? 60 * v : 180 + 1000 * Math.log(1 + (v - 3) / 16.667)) : (-v <= 3 ? 60 * v : -(180 + 400 * Math.log(1 + (-v - 3) / 6.6667)))); };
    for (let r = 0; r < E.nrow; r++) for (let c = 0; c < E.ncol; c++) {
      const v = r * E.ncol + c, cl = c > 0 ? v - 1 : v, cr = c < E.ncol - 1 ? v + 1 : v, rd = r > 0 ? v - E.ncol : v, ru = r < E.nrow - 1 ? v + E.ncol : v;
      const ax = p[cr * 3] - p[cl * 3], ay = yk(eh[cr]) - yk(eh[cl]), az = p[cr * 3 + 2] - p[cl * 3 + 2];
      const bx = p[ru * 3] - p[rd * 3], by = yk(eh[ru]) - yk(eh[rd]), bz = p[ru * 3 + 2] - p[rd * 3 + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1; nr[v * 3] = nx / l; nr[v * 3 + 1] = ny / l; nr[v * 3 + 2] = nz / l;
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(p, 3)); eg.setAttribute('aNrm', new THREE.BufferAttribute(nr, 3));
    eg.setAttribute('aH', new THREE.BufferAttribute(h, 1)); eg.setAttribute('aBasin', new THREE.BufferAttribute(ba, 1));
    eg.setAttribute('aLL', new THREE.BufferAttribute(ll, 2)); eg.setAttribute('aDrop', new THREE.BufferAttribute(drop, 1));
    const hole = () => new THREE.BufferAttribute(gridIndex(E.ncol, E.nrow, (a, b, d) => !(ino(p[a * 3], p[a * 3 + 2], 10) && ino(p[b * 3], p[b * 3 + 2], 10) && ino(p[d * 3], p[d * 3 + 2], 10))), 1);
    const full = () => new THREE.BufferAttribute(gridIndex(E.ncol, E.nrow), 1);
    return { E, eh, eg, hole, full };
  };
  euroMat = new THREE.ShaderMaterial({ vertexShader: SH.europeVS, fragmentShader: SH.europeFS, extensions: { derivatives: true },
    uniforms: Object.assign({}, shared, { uIce: { value: new THREE.Vector3(1150, 470, 1) }, uBasin: { value: 0 } }) });
  const EH = makeEurope(EU), EL = EU === 'europe_lo' ? EH : makeEurope('europe_lo');
  const gw = EH.eg; gw.setIndex(EH.full());
  const gh = EL === EH ? EH.eg.clone() : EL.eg; gh.setIndex(EL.hole());             // lod 2: both meshes use the light grid (small copy)
  euroWhole = new THREE.Mesh(gw, euroMat); euroWhole.frustumCulled = false; euroWhole.visible = false; world.add(euroWhole);
  euroMesh = new THREE.Mesh(gh, euroMat); euroMesh.frustumCulled = false; world.add(euroMesh);
  const E = EH.E, euroH = EH.eh;
  // ---- water
  waterMesh = new THREE.Mesh(new THREE.CircleGeometry(12000, 128).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ vertexShader: SH.waterVS, fragmentShader: SH.waterFS, transparent: true, depthWrite: false,
      uniforms: Object.assign({}, shared, stageU, { uWave: { value: 0 }, uViewKm: { value: 100 } }) }));
  waterMesh.renderOrder = 5; waterMesh.frustumCulled = false; world.add(waterMesh);
  // coast-distance field of the moment, one texel per delta cell, re-rendered only when the stage state changes;
  // the water samples it with hardware bilinear filtering (needs float render targets; otherwise the old per-pixel path)
  if (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')) {
    sdRT = new THREE.WebGLRenderTarget(NC, NR, { type: THREE.HalfFloatType, format: THREE.RGFormat,       // r: coast distance, g: spit lee
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: SH.sdFieldVS, fragmentShader: SH.sdFieldFS,
      uniforms: Object.assign({}, shared, stageU), depthTest: false, depthWrite: false }));
    q.frustumCulled = false; sdScene = new THREE.Scene(); sdScene.add(q);
    waterMesh.material.defines = { SD_TEX: 1 }; waterMesh.material.uniforms.tSD = { value: sdRT.texture };
  }

  // ---- Danube trace (draped on the Europe relief)
  {
    const sampleH = (lon, lat) => {
      const c = (lon - E.lon0) / ((E.lon1 - E.lon0) / E.ncol) - 0.5, r = (lat - E.lat0) / ((E.lat1 - E.lat0) / E.nrow) - 0.5;
      const c0 = clamp(Math.floor(c), 0, E.ncol - 2), r0 = clamp(Math.floor(r), 0, E.nrow - 2), fx = clamp(c - c0, 0, 1), fy = clamp(r - r0, 0, 1);
      const v = (rr, cc) => euroH[rr * E.ncol + cc];
      const hh = lerp(lerp(v(r0, c0), v(r0, c0 + 1), fx), lerp(v(r0 + 1, c0), v(r0 + 1, c0 + 1), fx), fy);
      return Math.min(hh, v(r0, c0), v(r0, c0 + 1), v(r0 + 1, c0), v(r0 + 1, c0 + 1));
    };
    let pts = DAN.river_km.map((p, i) => [p[0], p[1], DAN.river_ll[i][0], DAN.river_ll[i][1]]).filter(p => p[2] <= 28.5)   // to the apex (Isaccea) ...
      .filter((p, i, A) => i % 3 === 0 || i === A.length - 1)
      .concat(DAN.river_ll.map((p, i) => [DAN.river_km[i][0], DAN.river_km[i][1], p[0], p[1]]).filter(p => p[2] > 28.5))           // ... then down to the low sea
      .concat(SHELF_LL.map(p => { const xy = ST70(p[0], p[1]); return [toX(xy[0]), toZ(xy[1]), p[0], p[1]]; }));
    pts = chaikin(pts, 2);
    const { g: rg, L } = ribbonGeom(pts.map(p => [p[0], p[1]]), pts.map(p => sampleH(p[2], p[3])));
    riverMesh = new THREE.Mesh(rg, new THREE.ShaderMaterial({ vertexShader: SH.ribbonVS, fragmentShader: SH.riverFS, transparent: true, depthTest: false, depthWrite: false,
      uniforms: Object.assign({}, shared, { uWidth: { value: 4 }, uLift: { value: 0.5 }, uUseH: { value: 1 }, uReveal: { value: 0 }, uAlpha: { value: 0 } }) }));
    riverMesh.renderOrder = 30; riverMesh.frustumCulled = false; riverMesh.visible = false; world.add(riverMesh);
    // schematic tributaries (hand-drawn, source → confluence), thinner than the Danube
    tribMat = riverMesh.material.clone();
    tribMat.uniforms = Object.assign({}, shared, { uWidth: { value: 2 }, uLift: { value: 0.5 }, uUseH: { value: 1 }, uReveal: { value: 1 }, uAlpha: { value: 0 } });
    for (const T of TRIBUTARIES) {
      const ll = chaikin(T.ll.map(p => [p[0], p[1]]), 3);
      const km = ll.map(p => { const xy = ST70(p[0], p[1]); return [toX(xy[0]), toZ(xy[1])]; });
      const { g: tg } = ribbonGeom(km, ll.map(p => sampleH(p[0], p[1])));
      const m = new THREE.Mesh(tg, tribMat); m.renderOrder = 29; m.frustumCulled = false; m.visible = false; world.add(m); tribMeshes.push(m);
      const i = Math.round(T.lbl * (km.length - 1));
      addLabel([T.ro, T.en, km[i][0], km[i][1], 20, 10.9, 'riv']);
    }
  }
  // ---- sediment plumes
  {
    const N = 5000, P = new Float32Array(N * 3), A = new Float32Array(N), SZ = new Float32Array(N);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(P, 3)); pg.setAttribute('aA', new THREE.BufferAttribute(A, 1)); pg.setAttribute('aSize', new THREE.BufferAttribute(SZ, 1));
    const mat = new THREE.ShaderMaterial({ vertexShader: SH.plumeVS, fragmentShader: SH.plumeFS, transparent: true, depthWrite: false,
      uniforms: Object.assign({}, shared, { uScale: { value: 1 }, uPix: { value: innerHeight }, uCol: { value: new THREE.Vector3(0.66, 0.53, 0.33) } }) });
    const pts = new THREE.Points(pg, mat); pts.renderOrder = 8; pts.frustumCulled = false; world.add(pts);
    plumes = { N, P, A, SZ, g: pg, mat, mesh: pts, age: new Float32Array(N).fill(1e9), life: new Float32Array(N), vx: new Float32Array(N), vz: new Float32Array(N), str: new Float32Array(N), next: 0, acc: {} };
  }
  // ---- longshore drift: sand streaks that follow the coast of the moment (instanced quads; heads point downdrift)
  {
    const N = 1400, qg = new THREE.InstancedBufferGeometry();
    qg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    qg.setIndex([0, 1, 2, 0, 2, 3]);
    const iP = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iD = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2);
    iP.setUsage(THREE.DynamicDrawUsage); iD.setUsage(THREE.DynamicDrawUsage);
    qg.setAttribute('iP', iP); qg.setAttribute('iD', iD); qg.instanceCount = N;
    const mat = new THREE.ShaderMaterial({ vertexShader: SH.driftVS, fragmentShader: SH.driftFS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: Object.assign({}, shared, { uLen: { value: 1 }, uWid: { value: 0.2 } }) });
    const mesh = new THREE.Mesh(qg, mat); mesh.renderOrder = 9; mesh.frustumCulled = false; mesh.visible = false; world.add(mesh);
    drift = { N, iP, iD, mat, mesh, x: new Float32Array(N), z: new Float32Array(N), age: new Float32Array(N).fill(1e9), life: new Float32Array(N),
              off: new Float32Array(N), sz: new Float32Array(N), dx: new Float32Array(N), dz: new Float32Array(N), acc: 0, next: 0, live: 0 };
  }
  // ---- smooth sand barriers: the initial spit (grows N -> S) and Sacalin (1897); story_meta.json gives their centrelines
  const barMesh = (L, taper0, taper1) => {      // L: [[x, z, half-width km, t], ...]; taper: length fraction where the crest sinks at each end
    const n = L.length, OFF = [-1.35, -1.0, -0.55, 0, 0.55, 1.0, 1.35], HT = [-1.5, -0.2, 1.0, 1.5, 1.0, -0.2, -1.5], m = OFF.length;
    const P = new Float32Array(n * m * 3), H = new Float32Array(n * m), T = new Float32Array(n * m);
    for (let i = 0; i < n; i++) {
      const a = L[Math.max(0, i - 1)], b = L[Math.min(n - 1, i + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / tl, nz = (b[0] - a[0]) / tl, s = i / (n - 1);
      const e = (taper0 ? smooth(clamp(s / taper0, 0, 1)) : 1) * (taper1 ? smooth(clamp((1 - s) / taper1, 0, 1)) : 1);
      for (let j = 0; j < m; j++) {
        const v = i * m + j, w = L[i][2] * OFF[j];
        P[v * 3] = L[i][0] + nx * w; P[v * 3 + 2] = L[i][1] + nz * w; H[v] = -1.5 + (HT[j] + 1.5) * e; T[v] = L[i][3] || 0;
      }
    }
    const idx = []; for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(P, 3)); bg.setAttribute('aH', new THREE.BufferAttribute(H, 1)); bg.setAttribute('aT', new THREE.BufferAttribute(T, 1)); bg.setIndex(idx);
    const mesh = new THREE.Mesh(bg, new THREE.ShaderMaterial({ vertexShader: SH.sacVS, fragmentShader: SH.sacFS, extensions: { derivatives: true }, side: THREE.DoubleSide,
      uniforms: Object.assign({}, shared, { uGrow: { value: 1 }, uAmp: { value: 0 } }) }));
    mesh.frustumCulled = false; mesh.visible = false; world.add(mesh); return mesh;
  };
  if (META.sacalin && META.sacalin.length > 3) sacMesh = barMesh(META.sacalin.map(p => [p[0], p[1], p[2], 0]), 0.07, 0.07);
  if (META.spit && META.spit.line) {
    // the root continues past the delta grid's edge until it meets the Bugeac shore on the regional relief
    const L = META.spit.line.map(p => [p[0], p[1], 0.22, p[2]]), a = L[0], b = L[3], dl = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const ux = (a[0] - b[0]) / dl, uz = (a[1] - b[1]) / dl, ext = [];
    for (let d = 0.3; d < 6; d += 0.3) { const x = a[0] + ux * d, z = a[1] + uz * d; ext.unshift([x, z, 0.22, -d / 50]); if (outerHpre(x, z) > -3) break; }   // stop on the shore (the drawn level is ≥ −3.5 m then)
    spitMesh = barMesh(ext.concat(L), 0, 0.03);
  }
  // ---- spotlight: the area the delta ever covers (any stage: lake, land, ridge, river), widened and softened over a few km;
  // everything outside it (hills, plateau, open sea, Europe) is drawn darker so the eye stays on the delta
  {
    const ca = new Uint8Array(B.inner_cls_a), cb = new Uint8Array(B.inner_cls_b), m = new Float32Array(NC * NR);
    const body = v => v >= 1 && v <= 4;
    for (let i = 0; i < NC * NR; i++) {
      let b = 0; for (let k = 0; k < 4; k++) if (body(ca[i * 4 + k])) b = 1; for (let k = 0; k < 3; k++) if (body(cb[i * 4 + k])) b = 1;
      m[i] = b * smooth(clamp((INNER_RECT.x0 + (i % NC) * dk + 56) / 10, 0, 1));         // up the valley past the apex, fading towards Isaccea
    }
    for (let k = 0; k < 3; k++) boxBlur(m, NC, NR, 34);              // ≈ 3.7 km boxes: a round, soft-edged spot
    // towards the open sea the light fades out over a longer distance (a wider blur, used on today's sea and blended across the coast)
    const mw = m.slice(); for (let k = 0; k < 3; k++) boxBlur(mw, NC, NR, 110);   // ≈ 12 km boxes
    const sea = new Float32Array(NC * NR); for (let i = 0; i < NC * NR; i++) sea[i] = cb[i * 4 + 2] === 0 ? 1 : 0;
    boxBlur(sea, NC, NR, 3); boxBlur(sea, NC, NR, 3);                   // (just softens the coastline: land keeps the short fade)
    const u8 = new Uint8Array(NC * NR);
    for (let i = 0; i < NC * NR; i++) {
      const near = smooth(clamp((m[i] - 0.04) / 0.36, 0, 1)), far = smooth(clamp(mw[i] / 0.5, 0, 1));
      const c = i % NC, r = (i / NC) | 0;                 // fade out before the west / south / north grid edges (no lit rectangle from afar)
      const edge = smooth(clamp(c * dk / 6, 0, 1)) * smooth(clamp(r * dk / 6, 0, 1)) * smooth(clamp((NR - 1 - r) * dk / 6, 0, 1));
      // + a soft oval around the delta (wide to the south, very wide towards the sea), so the spot stays round from afar
      const ex = INNER_RECT.x0 + c * dk - 12, ez = INNER_RECT.z1 - r * dk + 12;
      const eo = Math.hypot(ex / (ex < 0 ? 66 : 130), ez / (ez < 0 ? 64 : 82)), env = 1 - smooth(clamp((eo - 0.78) / 0.22, 0, 1));
      u8[i] = Math.round(255 * lerp(near, Math.max(near, far), sea[i]) * edge * env);
    }
    const st = new THREE.DataTexture(u8, NC, NR, THREE.RedFormat, THREE.UnsignedByteType);
    st.minFilter = st.magFilter = THREE.LinearFilter; st.generateMipmaps = false; st.flipY = false; st.needsUpdate = true;
    shared.tSpot.value = st; shared.uSpotR.value.set(INNER_RECT.x0 - dk / 2, INNER_RECT.z1 + dk / 2, NC * dk, NR * dk);   // x0, z of the south edge, w, h
  }
  setLoad(0.95, '');
}

/* ------------------------------------------------------------------ story state: the rail */
// u = rail position in chapters (chapter c, fraction tf = u - c). Station k sits at ST_U[k].
const S = { c: 0, tf: 0, u: 0, st: 0, card: 0, travel: null, scrub: false, manualCam: false, t: 20, started: false, playing: false };
const P = { waves: 0, plumes: 0, ice: 0, river: 0, basin: 0, lst: 0 };
const LSTZ = new THREE.Vector2(-999, 999);      // smoothed process intensities
const NCH = CHAPTERS.length;
const ST_U = STOPS.map((s, k) => k === 0 ? 0 : s.ch[s.ch.length - 1] + 1);
const chTravel = c => (TRAVEL[CHAPTERS[c].id] || CHAPTERS[c].dur * 0.5) / CONFIG.speed;
function setU(u) { S.u = u; const c = u <= 0 ? 0 : Math.min(NCH - 1, Math.ceil(u - 1e-9) - 1); S.c = c; S.tf = clamp(u - c, 0, 1); }
function travelTime(u0, u1) {
  const lo = Math.min(u0, u1), hi = Math.max(u0, u1); let T = 0;
  for (let c = 0; c < NCH; c++) T += chTravel(c) * Math.max(0, Math.min(hi, c + 1) - Math.max(lo, c));
  return u1 < u0 ? T / 2.5 : T;
}
function travelTo(k) {
  k = clamp(k, 0, STOPS.length - 1);
  if (S.travel && S.travel.k === k) { S.travel.boost = 4; return; }      // ▶ again while moving = fast-forward
  if (!S.travel && k === S.st) return;
  S.started = true; bubbles.close();
  S.travel = { k, u0: S.u, u1: ST_U[k], T: Math.max(1.2, travelTime(S.u, ST_U[k])), p: 0, boost: 1 };
  resumeRailCam(); S.card = k; lastCard = -1;
  document.body.classList.add('travel');
}
function jumpTo(k) {                              // tap on a distant station: quick fade, no travel
  k = clamp(k, 0, STOPS.length - 1);
  if (Math.abs(k - (S.travel ? S.travel.k : S.st)) <= 1) return travelTo(k);
  S.started = true; bubbles.close();
  document.body.classList.add('dh-out');
  setTimeout(() => { S.travel = null; setU(ST_U[k]); S.st = k; S.card = k; lastCard = -1; S.manualCam = false; camSmooth = null; snapProc = true; arrive();
    document.body.classList.remove('dh-out', 'travel'); }, 420);
}
function stepRail(dt) {
  const tr = S.travel; if (!tr) return;
  tr.p = Math.min(1, tr.p + dt * tr.boost / tr.T);
  const e = 0.5 - 0.5 * Math.cos(Math.PI * tr.p);
  setU(lerp(tr.u0, tr.u1, e));
  if (tr.p >= 1) { S.st = tr.k; S.travel = null; document.body.classList.remove('travel'); arrive(); }
}
function pw(tbl, x, i, j) {
  const asc = tbl[tbl.length - 1][i] > tbl[0][i];
  for (let k = 0; k < tbl.length - 1; k++) {
    const a = tbl[k][i], b = tbl[k + 1][i];
    if ((asc && x >= a && x <= b) || (!asc && x <= a && x >= b)) return b === a ? tbl[k][j] : lerp(tbl[k][j], tbl[k + 1][j], (x - a) / (b - a));
  }
  return asc === (x > tbl[0][i]) ? tbl[tbl.length - 1][j] : tbl[0][j];
}
function chapterTime(c, tf) { const ch = CHAPTERS[c]; return ch.tmap ? pw(ch.tmap, tf, 0, 1) : lerp(ch.t0, ch.t1, tf); }
function chapterTf(c, t) { const ch = CHAPTERS[c]; return ch.tmap ? pw(ch.tmap.filter((p, i, A) => i === 0 || p[1] !== A[i - 1][1]), t, 1, 0) : (ch.t0 - t) / (ch.t0 - ch.t1); }
function stageState(t) {
  const A = META.stage_ages_ka;
  if (t >= A[0]) return { k: -1, f: 0 };
  for (let k = 0; k < A.length - 1; k++) if (t <= A[k] && t >= A[k + 1]) return { k, f: (A[k] - t) / (A[k] - A[k + 1]) };
  return { k: A.length - 2, f: 1 };
}
// text shown on the card for station k (stops without their own text use their chapter's)
function stopText(k) { const st = STOPS[k]; return st[LANG] || CHAPTERS[st.ch[st.ch.length - 1]][LANG]; }

/* ------------------------------------------------------------------ camera */
function shotPose(s) {
  const asp = camera.aspect, fit = asp < 1.3 ? Math.min(2.6, 1.3 / asp) : 1;
  const tl = THREE.MathUtils.degToRad(s.tilt), hd = THREE.MathUtils.degToRad(s.head), dist = s.dist * fit;
  const target = new THREE.Vector3(s.x, 0, s.z);
  const off = new THREE.Vector3(-Math.sin(hd) * Math.sin(tl), Math.cos(tl), Math.cos(hd) * Math.sin(tl)).multiplyScalar(dist);
  return { target, pos: target.clone().add(off) };
}
const SK = ['x', 'z', 'tilt', 'head'];
function lerpShot(a, b, t) { const o = {}; for (const k of SK) o[k] = lerp(a[k], b[k], t); o.dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)); return o; }
function pathShot(path, tf) {              // Catmull-Rom through keyframes (x, z, log dist, tilt, head)
  let i = 0; while (i < path.length - 2 && tf > path[i + 1][0]) i++;
  const [t0, s1] = path[i], [t1, s2] = path[i + 1];
  const s0 = path[Math.max(0, i - 1)][1], s3 = path[Math.min(path.length - 1, i + 2)][1];
  const u = clamp((tf - t0) / Math.max(1e-6, t1 - t0), 0, 1), u2 = u * u, u3 = u2 * u;
  const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  const o = {}; for (const k of SK) o[k] = cr(s0[k], s1[k], s2[k], s3[k]);
  o.dist = Math.exp(cr(Math.log(s0.dist), Math.log(s1.dist), Math.log(s2.dist), Math.log(s3.dist)));
  return o;
}
function currentShot() {
  const ch = CHAPTERS[S.c];
  let s = ch.path ? pathShot(ch.path, S.tf) : lerpShot(ch.shot0, ch.shot1, smooth(S.tf));
  if (ch.zoom) {
    const Z = ch.zoom, z1 = smooth(clamp((S.tf - Z.in[0]) / (Z.in[1] - Z.in[0]), 0, 1)), z2 = smooth(clamp((S.tf - Z.out[0]) / (Z.out[1] - Z.out[0]), 0, 1));
    s = lerpShot(s, Z, z1 * (1 - z2));
  }
  return s;
}
let camSmooth = null, camGlide = 0;
function poseToShot() {                    // inverse of shotPose: current free camera → shot, so the rail camera can glide back from it
  const asp = camera.aspect, fit = asp < 1.3 ? Math.min(2.6, 1.3 / asp) : 1;
  const t = controls.target, off = camera.position.clone().sub(t), d = off.length();
  return { x: t.x, z: t.z, dist: d / fit, tilt: THREE.MathUtils.radToDeg(Math.acos(clamp(off.y / d, -1, 1))), head: THREE.MathUtils.radToDeg(Math.atan2(-off.x, off.z)) };
}
function resumeRailCam() { if (S.manualCam) { camSmooth = poseToShot(); camGlide = 2.5; } S.manualCam = false; }
function updateCamera(dt) {
  if (S.manualCam || renderer.xr.isPresenting) return;
  const want = currentShot();
  if (!camSmooth) camSmooth = { ...want };
  const k = 1 - Math.exp(-dt * (camGlide > 0 ? 0.9 : 1.6)); camGlide = Math.max(0, camGlide - dt);
  while (camSmooth.head - want.head > 180) camSmooth.head -= 360;
  while (want.head - camSmooth.head > 180) camSmooth.head += 360;
  for (const key of SK) camSmooth[key] = lerp(camSmooth[key], want[key], k);
  camSmooth.dist = Math.exp(lerp(Math.log(camSmooth.dist), Math.log(want.dist), k));
  const p = shotPose(camSmooth);
  camera.position.copy(p.pos); controls.target.copy(p.target); camera.lookAt(p.target);
}

/* ------------------------------------------------------------------ labels */
const labelLayer = $('labels');
const LBL = [];
function addLabel(L) { const d = document.createElement('div'); d.className = 'lbl ' + L[6]; labelLayer.appendChild(d); LBL.push({ L, d, on: false }); }
LABELS.forEach(addLabel);
function updateLabels() {
  const dist = camera.position.distanceTo(controls.target);
  const w = innerWidth, h = innerHeight, v = new THREE.Vector3();
  const bub = bubbles.visible(), u = w * 0.0095;
  const cover = ['card', 'time', 'sea'].map(id => $(id).getBoundingClientRect()).filter(r => r.width > 0);   // UI panels: no labels underneath
  for (const o of LBL) {
    const [ro, en, x, z, tA, tB, kind] = o.L;
    let show = S.t <= tA && S.t >= tB && !renderer.xr.isPresenting;
    const far = Math.abs(x) > 250 || Math.abs(z) > 250;
    if (!far && dist > 1500) show = false;
    if (show) {
      v.set(x, kind === 'land' ? 2.5 : 0.6, z).applyMatrix4(world.matrixWorld).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) show = false;
      else {
        const px = (v.x + 1) / 2 * w, py = (1 - v.y) / 2 * h, txt0 = LANG === 'ro' ? ro : en;
        // a bubble already names this place, or would cover the label → hide the label
        if (bub.some(b => b.d.label === txt0 || (Math.abs(b.x - px) < u * 9 && Math.abs(b.y - py) < u * 2.4))) show = false;
        else if (cover.some(r => px > r.left - u * 4 && px < r.right + u * 4 && py > r.top - u && py < r.bottom + u)) show = false;
        else o.d.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) translate(-50%,-50%)`;
      }
    }
    const txt = LANG === 'ro' ? ro : en;
    if (o.d.textContent !== txt) o.d.textContent = txt;
    if (show !== o.on) { o.on = show; o.d.classList.toggle('on', show); }
  }
}

/* ------------------------------------------------------------------ UI */
const bubbles = new Bubbles();
function fmtNum(n) { return LANG === 'ro' ? n.toLocaleString('ro-RO') : n.toLocaleString('en-US'); }
function timeText(t) {
  const U = UI[LANG], yrs = t * 1000;
  if (yrs < 1) return { big: U.today, small: '2026' };
  if (yrs < 400) { const y = Math.round(2026 - yrs); return { big: U.year(y), small: U.ago(fmtNum(Math.round(yrs))) }; }
  const r = yrs >= 2000 ? Math.round(yrs / 100) * 100 : Math.round(yrs / 50) * 50, y = 2026 - r;
  return { big: U.ago(fmtNum(r)), small: y < 0 ? `≈ ${fmtNum(-y)} ${U.bc}` : `≈ ${fmtNum(y)} ${U.ad}` };
}
function stationTime(k) { const u = ST_U[k]; const c = u <= 0 ? 0 : Math.min(NCH - 1, Math.ceil(u) - 1); return chapterTime(c, clamp(u - c, 0, 1)); }
const railX = u => {                      // rail position (chapters) → 0..1 along the track (stations equally spaced)
  for (let k = 0; k < ST_U.length - 1; k++) if (u <= ST_U[k + 1]) return (k + (u - ST_U[k]) / (ST_U[k + 1] - ST_U[k])) / (ST_U.length - 1);
  return 1;
};
function buildRail() {
  const rail = $('rail'); rail.querySelectorAll('.stn,.anc').forEach(e => e.remove());
  STOPS.forEach((st, k) => {
    const b = document.createElement('button'); b.className = 'stn'; b.style.left = (k / (STOPS.length - 1) * 100) + '%';
    const t = stationTime(k), yrs = Math.round(t * 1000);
    b.innerHTML = `<span class="a">${yrs < 1 ? UI[LANG].today : fmtNum(yrs)}</span><span class="d"></span><span class="n">${st.short[LANG]}</span>`;
    rail.appendChild(b);
  });
  ANCHORS.forEach(a => {
    let c = CHAPTERS.findIndex(ch => a.t <= ch.t0 && a.t > ch.t1); if (c < 0) return;
    const x = railX(c + chapterTf(c, a.t)), n = STOPS.length - 1;
    if (Math.abs(x * n - Math.round(x * n)) < 0.3) return;            // too close to a station label
    const m = document.createElement('div'); m.className = 'anc'; m.style.left = (x * 100) + '%';
    m.innerHTML = `<i></i><b>${a[LANG]}</b>`; rail.appendChild(m);
  });
}
function setStatic() {
  const U = UI[LANG];
  $('btnLang').textContent = U.lang;
  $('qrcap').textContent = U.qr; $('seacap').textContent = U.sea; $('loadt').textContent = U.title;
  const lg = $('legend').children; U.legend.forEach((s, i) => lg[i].lastChild.textContent = s);
  const pr = $('procleg').children; U.proc.forEach((s, i) => pr[i].lastChild.textContent = s);
  const al = $('anthleg').children; U.anth.forEach((s, i) => al[i].lastChild.textContent = s);
  buildRail(); lastCard = -1; arriveBubbles();
}
let lastCard = -1;
function setCard() {
  const U = UI[LANG], k = S.card, T = stopText(k);
  $('kicker').textContent = T.kicker; $('ctitle').textContent = T.title; $('cbody').textContent = T.body;
  $('cfact').textContent = T.fact || ''; $('cfact').style.display = T.fact ? '' : 'none';
  $('chint').innerHTML = k === 0 ? `<span class="dot"></span>${U.hintStart} ${U.hintBub}` : '';
  const end = $('cend'), last = k === STOPS.length - 1;
  end.style.display = last ? '' : 'none';
  if (last) {
    const nx = EXPO.stories[1];
    end.innerHTML = `<button class="bt txt" id="eMenu">${ICON.home.replace('<svg', '<svg style="width:1.2em;height:1.2em;margin-right:.5em"')}${U.menu}</button>` +
      `<button class="bt txt ${nx && nx.ready ? 'go' : ''}" id="eNext" ${nx && nx.ready ? '' : 'disabled'}>${U.nextStory}${nx && nx.ready ? ' →' : ' · ' + U.soon}</button>`;
    $('eMenu').onclick = () => go(HUB + 'index.html');
    $('eNext').onclick = () => go(HUB + 'stories/' + nx.id + '/index.html');
  }
  const card = $('card'); card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
}
function arriveBubbles() {
  if (S.travel) { bubbles.set([]); return; }
  bubbles.set((STOPS[S.st].bubbles || []).map((b, i) => ({ id: S.st + '_' + i, label: b[LANG === 'ro' ? 2 : 3].t, title: b[LANG === 'ro' ? 2 : 3].t, body: b[LANG === 'ro' ? 2 : 3].b, kicker: stopText(S.st).title, hint: !!(b[4] && b[4].hint) })));
}
function arrive() { arriveBubbles(); SUI && SUI.arrived(); }
function updateUI() {
  if (S.card !== lastCard) { lastCard = S.card; setCard(); }
  const stn = $('rail').querySelectorAll('.stn'), cur = S.travel ? -1 : S.st;
  stn.forEach((b, k) => { b.classList.toggle('cur', k === cur); b.classList.toggle('past', ST_U[k] <= S.u + 1e-6 && k !== cur); });
  const x = railX(S.u) * 100; $('trackfill').style.width = x + '%'; $('train').style.left = x + '%';
  const tt = timeText(S.t); $('tbig').textContent = tt.big; $('tsmall').textContent = tt.small;
  const sl = seaLevel(S.t);
  $('seaval').textContent = (sl > -0.05 ? '0' : (sl < -10 ? Math.round(sl) : sl.toFixed(1)).toString().replace('-', '−').replace('.', LANG === 'ro' ? ',' : '.')) + ' m';
  $('seafill').style.width = clamp(100 + sl / (CHAPTERS[S.c].europe ? 125 : 40) * 100, 2, 100) + '%';
  const tgt = S.travel ? S.travel.k : S.st;
  $('btnPrev').disabled = tgt === 0 && !S.travel;
  $('btnNext').disabled = tgt === STOPS.length - 1 && !S.travel;
  // Start: ▶ pulses; at any station, after EXPO.nudgeSec without a touch it pulses harder and a red arrow points at it (shared/storyui.js)
  $('btnNext').classList.toggle('pulse', !S.started && S.st === 0 && !S.travel);
  SUI.update({ atStop: !S.travel && !S.scrub, end: S.st === STOPS.length - 1, started: S.started, blocked: bubbles.isOpen });
  const pr = $('procleg').children;
  pr[0].style.opacity = P.waves; pr[1].style.opacity = P.lst; pr[2].style.opacity = P.plumes;
  const an = innerMat.uniforms.uAnth.value; $('anthleg').style.display = an > 0.02 ? '' : 'none'; $('anthleg').style.opacity = an;
  $('procleg').style.display = (P.waves + P.lst + P.plumes) > 0.02 ? '' : 'none';
}
let SUI = null;
const prev = () => travelTo((S.travel ? S.travel.k : S.st) - 1);
const next = () => travelTo((S.travel ? S.travel.k : S.st) + 1);
function wireUI() {
  $('btnHome').innerHTML = ICON.home; $('btnPrev').innerHTML = ICON.prev; $('btnNext').innerHTML = ICON.next; $('btnData').innerHTML = ICON.info;
  $('btnHome').onclick = () => go(HUB + 'index.html');
  $('btnPrev').onclick = prev; $('btnNext').onclick = next;
  $('btnLang').onclick = () => toggleLang();
  onLang(l => { LANG = l; setStatic(); });
  $('card').onclick = () => { if (innerWidth <= 820) $('card').classList.toggle('min'); };
  wireRail();
  const touches = new Set();             // 3+ contacts on the map = palms resting on the table → ignore
  renderer.domElement.addEventListener('pointerdown', e => { touches.add(e.pointerId); controls.enabled = touches.size <= 2; if (!S.travel) S.manualCam = true; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) renderer.domElement.addEventListener(ev, e => { touches.delete(e.pointerId); if (!touches.size) controls.enabled = true; });
  renderer.domElement.addEventListener('wheel', () => { if (!S.travel) S.manualCam = true; }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === ' ') next(); else if (e.key === 'ArrowLeft') prev(); else if (e.key === 'Home') go(HUB + 'index.html'); });
  const fitView = () => {
    camera.aspect = innerWidth / innerHeight; renderer.setSize(innerWidth, innerHeight);
    if (innerWidth > 820) camera.setViewOffset(innerWidth, innerHeight, -0.09 * innerWidth, 0, innerWidth, innerHeight);
    else camera.setViewOffset(innerWidth, innerHeight, 0, 0.2 * innerHeight, innerWidth, innerHeight);
    camera.updateProjectionMatrix();
    if (plumes) plumes.mat.uniforms.uPix.value = innerHeight * renderer.getPixelRatio();
  };
  addEventListener('resize', fitView); fitView(); fitPR = fitView;
  const url = CONFIG.publicUrl || EXPO.publicUrl;
  if (url) { $('qrbox').style.display = ''; $('qr').appendChild(makeQR(url, 4)); }
  SUI = storyUI({ index: 0, hub: HUB, nextBtn: $('btnNext'), infoBtn: $('btnData'), sources: SOURCES });
  setStatic();
}
// the timeline: tap = go to the nearest station; drag = scrub through time, snapping to the nearest station on release
function railFrac(e) { const r = $('track').getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); }
function uFromFrac(x) {
  const n = ST_U.length - 1, seg = Math.min(n - 1, Math.floor(x * n)), f = x * n - seg;
  return ST_U[seg] + clamp(f, 0, 1) * (ST_U[seg + 1] - ST_U[seg]);
}
function wireRail() {
  const rail = $('rail'), n = ST_U.length - 1; let drag = null;
  rail.addEventListener('pointerdown', e => {
    e.preventDefault(); rail.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x0: e.clientX, moved: false };
  });
  rail.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) < 8) return;
    if (!drag.moved) { drag.moved = true; S.scrub = true; S.started = true; S.travel = null; bubbles.close(); resumeRailCam(); document.body.classList.add('travel'); }
    const x = railFrac(e); setU(uFromFrac(x)); S.card = Math.round(x * n);
  });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const x = railFrac(e), k = Math.round(x * n), moved = drag.moved; drag = null;
    if (!moved) { jumpTo(k); return; }
    S.scrub = false;                                   // glide to the nearest station
    S.travel = { k, u0: S.u, u1: ST_U[k], T: Math.max(0.5, travelTime(S.u, ST_U[k]) * 0.35), p: 0, boost: 1 };
    S.card = k; lastCard = -1;
  };
  rail.addEventListener('pointerup', up); rail.addEventListener('pointercancel', up);
}
// bubbles follow their map point; hidden while travelling, in XR or when off screen
const bv = new THREE.Vector3();
function updateBubbles() {
  if (S.travel || S.scrub || renderer.xr.isPresenting) { bubbles.hideAll(); return; }   // the previous station's bubbles fade out as soon as we move
  const list = STOPS[S.st].bubbles || [];
  const w = innerWidth, h = innerHeight, u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 16;
  list.forEach((b, i) => {
    bv.set(b[0], 0.8, b[1]).applyMatrix4(world.matrixWorld).project(camera);
    const x = (bv.x + 1) / 2 * w, y = (1 - bv.y) / 2 * h;
    const vis = bv.z < 1 && x > u * 3 && x < w - u * 3 && y > u * 7 && y < h - u * 8;
    bubbles.place(S.st + '_' + i, x, y, vis);
  });
}

/* ------------------------------------------------------------------ frame update */
function stepStory(dt) {
  stepRail(dt);
  if (S.manualCam && !S.travel && performance.now() - lastInput() > 12000) resumeRailCam();   // free look → back on the rails
  S.t = chapterTime(S.c, S.tf);
}
function viewDist() { return renderer.xr.isPresenting ? xrView.dist : camera.position.distanceTo(controls.target); }
function sdCell(i) {                       // cached per stage state (SDF.ver changes in updateSDField)
  if (SDF.stamp[i] === SDF.ver) return SDF.cache[i];
  const v = sdCellRaw(i); SDF.stamp[i] = SDF.ver; SDF.cache[i] = v; return v;
}
function sdCellRaw(i) {                    // signed km to the open-sea coast in cell i now (CPU twin of the shader's sdNow / sdv)
  const at = s => {
    let v = ((s < 4 ? SDF.a[i * 4 + s] : SDF.b[i * 4 + s - 4]) - 128) * 0.1;
    if (s === 2 && SDF.fb[i * 4 + 2] / 255 <= stageU.uSpitP.value + 0.003) v = Math.min(v, SDF.b[i * 4 + 3] * 0.1 - 0.06);   // growing spit
    if (s === 6 && stageU.uSacP.value > 0.5) v = Math.min(v, SDF.fb[i * 4 + 3] * 0.1 - 0.06);                              // Sacalin
    return v;
  };
  if (shared.uReal.value > 0.5) return at(6);
  const k = stageU.uK.value; let f = stageU.uFrac.value;
  if (k < 0) return at(0);
  if (k === 5) { const wc = (SDF.cb[i * 4 + 3] >> 2) / 63; f = clamp((f - 0.815 * wc) / (1 - 0.815 * wc), 0, 1); }   // = sdOpen(): the late Chilia lobe
  return lerp(at(k), at(k + 1), f);
}
function shelterAt(x, z) {                 // CPU twin of the shader's shelterAt (nearest cell): 1 in the lee of the initial spit
  const k = stageU.uK.value; if (k < 1 || k > 2 || shared.uReal.value > 0.5) return 0;
  const c = Math.round((x - SDF.x0) / SDF.dk), r = Math.round((SDF.z1 - z) / SDF.dk);
  if (c < 0 || r < 0 || c >= SDF.NC || r >= SDF.NR) return 0;
  const i = r * SDF.NC + c; if (!(SDF.cb[i * 4 + 3] & 2)) return 0;
  return k === 2 ? 1 : smooth(clamp((stageU.uSpitP.value + 0.003 - SDF.fb[i * 4 + 2] / 255) / 0.08, 0, 1));
}
function sdNow(x, z) {                     // bilinear; 99 outside the delta grid
  const gx = (x - SDF.x0) / SDF.dk, gy = (SDF.z1 - z) / SDF.dk, c = Math.floor(gx), r = Math.floor(gy);
  if (c < 0 || r < 0 || c >= SDF.NC - 1 || r >= SDF.NR - 1) return 99;
  const fx = gx - c, fy = gy - r, i = r * SDF.NC + c;
  return lerp(lerp(sdCell(i), sdCell(i + 1), fx), lerp(sdCell(i + SDF.NC), sdCell(i + SDF.NC + 1), fx), fy);
}
function mouthAt(m, t) {                   // follow the arm seaward from its anchor until it meets today's (paleo) coast
  const s = interp(m.str, t)[0]; if (s <= 0.01 || t > m.str[0][0] + 0.02) return null;
  const dl = Math.hypot(m.dir[0], m.dir[1]), dx = m.dir[0] / dl, dz = m.dir[1] / dl;
  let land = 0;
  for (let d = 0; d < 90; d += 0.25) { const x = m.anchor[0] + dx * d, z = m.anchor[1] + dz * d, v = sdNow(x, z); if (v < -0.2) land++; else if (v > 0.2 && land > 8) return { x, z, s }; }
  return null;
}
let snapProc = true;                             // after a jump / page load: processes start at their target, no fade-in
function updateProcesses(dt) {
  const ch = CHAPTERS[S.c], pr = ch.proc || {}, k = snapProc ? 1 : 1 - Math.exp(-dt * 1.5); snapProc = false;
  anthT = ch.reveal && S.tf > 0.9 ? anthT + dt : 0;            // Anthropocene clock (see applyTime)
  P.waves = lerp(P.waves, pr.waves || 0, k); P.plumes = lerp(P.plumes, pr.plumes || 0, k);
  P.ice = lerp(P.ice, pr.ice ? 1 : 0, k); P.river = lerp(P.river, pr.river ? 1 : 0, k); P.basin = lerp(P.basin, pr.basin ? 1 : 0, k);
  P.lst = lerp(P.lst, pr.lst ? 1 : 0, k);
  if (pr.lst) {                                   // visible stretch of coast; for the spit: only north of its growing tip
    let z1 = pr.lst.z1;
    if (pr.lst.tip && META.spit) { const st = stageState(S.t); const fr = st.k === 1 ? st.f : (st.k > 1 ? 1 : 0);
      const p = clamp((fr - META.spit.f0) / (META.spit.f1 - META.spit.f0), 0, 1); z1 = Math.min(z1, META.spit.zN + p * (META.spit.zS - META.spit.zN) + 0.5); }
    LSTZ.set(lerp(LSTZ.x, pr.lst.z0, k), lerp(LSTZ.y, z1, Math.min(1, k * 4)));
  }
  const dist = viewDist();
  // ice + basin + river (prologue)
  const ice = interp(ICE, S.t);
  euroMat.uniforms.uIce.value.set(ice[0], ice[1], ice[2]);
  const bvis = P.basin * smooth(clamp((dist - BASIN_NEAR) / 450, 0, 1));   // the schematic basin fades before the regional grids appear
  euroMat.uniforms.uBasin.value = bvis;
  const rvis = P.river * smooth(clamp((dist - 650) / 450, 0, 1));   // the drawn Danube hands over to the real valley when we get close
  riverMesh.visible = rvis > 0.01;
  riverMesh.material.uniforms.uAlpha.value = rvis;
  riverMesh.material.uniforms.uReveal.value = 1;
  riverMesh.material.uniforms.uWidth.value = dist * 0.0042;
  riverMesh.material.uniforms.uLift.value = dist * 0.002;
  const tb = P.river * bvis;                          // tributaries only while the whole basin is on screen
  tribMeshes.forEach(m => { m.visible = tb > 0.01; });
  tribMat.uniforms.uAlpha.value = tb * 0.85; tribMat.uniforms.uWidth.value = dist * 0.0021; tribMat.uniforms.uLift.value = dist * 0.002;
  // waves
  waterMesh.material.uniforms.uWave.value = P.waves * (dist < 600 ? 1 : 0);
  waterMesh.material.uniforms.uViewKm.value = dist;
  // sediment plumes
  const pl = plumes, str = P.plumes;
  pl.mat.uniforms.uScale.value = 1;
  if (str > 0.01 && S.playing !== undefined) {
    for (const m of MOUTHS) {
      const mo = mouthAt(m, S.t); if (!mo) continue;
      pl.acc[m.id] = (pl.acc[m.id] || 0) + dt * 130 * mo.s * str;
      const dl = Math.hypot(m.dir[0], m.dir[1]), dx = m.dir[0] / dl, dz = m.dir[1] / dl;
      while (pl.acc[m.id] >= 1) {
        pl.acc[m.id] -= 1; const i = pl.next; pl.next = (pl.next + 1) % pl.N;
        const sp = 1.6 + Math.random() * 2.2, ang = (Math.random() - 0.5) * 1.3;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        pl.P[i * 3] = mo.x + (Math.random() - 0.5) * 0.8; pl.P[i * 3 + 1] = 0.03; pl.P[i * 3 + 2] = mo.z + (Math.random() - 0.5) * 0.8;
        pl.vx[i] = (dx * ca - dz * sa) * sp; pl.vz[i] = (dz * ca + dx * sa) * sp;
        pl.age[i] = 0; pl.life[i] = 5 + Math.random() * 4; pl.str[i] = mo.s;
      }
    }
  }
  for (let i = 0; i < pl.N; i++) {
    const a = pl.age[i]; if (a > pl.life[i]) { pl.A[i] = 0; continue; }
    const damp = Math.exp(-dt * 0.55);
    pl.vx[i] *= damp; pl.vz[i] = pl.vz[i] * damp + dt * 0.55 * P.waves + dt * 0.12;   // drift south with the longshore current
    pl.P[i * 3] += pl.vx[i] * dt; pl.P[i * 3 + 2] += pl.vz[i] * dt;
    pl.age[i] = a + dt;
    const u = a / pl.life[i];
    pl.A[i] = 0.30 * pl.str[i] * str * Math.min(1, u * 6) * (1 - u);
    pl.SZ[i] = 1.0 + u * 4.5;
  }
  pl.g.attributes.position.needsUpdate = true; pl.g.attributes.aA.needsUpdate = true; pl.g.attributes.aSize.needsUpdate = true;
  pl.mesh.visible = str > 0.01 || pl.A.some(v => v > 0);
  updateDrift(dt, dist);
}
// longshore drift: grains spawn just off the open-sea coast of the moment, keep their distance from it and travel
// along it (towards S-SW); they slow down and settle at the downdrift end of the stretch, e.g. the tip of the growing spit.
// Drawn as soft, thin streaks aligned with the coast (direction = smoothed coast tangent, not the jittery velocity).
const DRIFT_DIR = [-0.3, 0.954];
function updateDrift(dt, dist) {
  const D = drift, on = P.lst * (dist < 600 ? 1 : 0);
  D.mesh.visible = on > 0.01 || D.live > 0;
  if (!D.mesh.visible) return;
  const k = dist / 130, speed = 2.2 * k, b0 = 0.6 * k, b1 = 2.4 * k, h = Math.max(0.5, dist * 0.009);
  D.mat.uniforms.uLen.value = 6.0 * k; D.mat.uniforms.uWid.value = 0.11 * k;   // thin streaks
  if (on > 0.01 && LSTZ.y > LSTZ.x) {
    D.acc += dt * 45 * on * (WEAK ? 0.55 : 1);                         // fewer streaks on integrated GPUs (overdraw)
    for (let tries = 0; D.acc >= 1 && tries < 60; tries++) {
      D.acc -= 1;
      const z = lerp(LSTZ.x, LSTZ.y - 2, Math.random()), off = lerp(b0, b1, Math.random());
      let x = INNER_RECT.x1 - 1, hit = false;
      for (; x > INNER_RECT.x0 + 1; x -= 0.6) if (sdNow(x, z) < off) { hit = true; break; }
      if (!hit || shelterAt(x, z) > 0.3) continue;
      const i = D.next; D.next = (D.next + 1) % D.N;
      D.x[i] = x; D.z[i] = z; D.age[i] = 0; D.life[i] = 5 + Math.random() * 3; D.off[i] = off; D.sz[i] = 0.8 + Math.random() * 0.4;
      D.dx[i] = 0; D.dz[i] = 0;
    }
  }
  const P4 = D.iP.array, D2 = D.iD.array; let live = 0;
  for (let i = 0; i < D.N; i++) {
    if (D.age[i] > D.life[i]) { P4[i * 4 + 2] = 0; P4[i * 4 + 3] = 0; continue; }          // size 0: dead quads draw no pixels
    const x = D.x[i], z = D.z[i], s0 = sdNow(x, z);
    const gx = (sdNow(x + h, z) - sdNow(x - h, z)) / (2 * h), gz = (sdNow(x, z + h) - sdNow(x, z - h)) / (2 * h), gl = Math.hypot(gx, gz);
    if (s0 < 0.02 || s0 > 30 || gl < 1e-4) { D.age[i] = 1e9; P4[i * 4 + 2] = 0; P4[i * 4 + 3] = 0; continue; }       // ashore / lost
    const nx = gx / gl, nz = gz / gl; let tx = -nz, tz = nx;
    let along = tx * DRIFT_DIR[0] + tz * DRIFT_DIR[1];
    if (along < 0) { tx = -tx; tz = -tz; along = -along; }
    if (along < 0.15) D.age[i] += dt * 3;                                   // rounding the tip of the spit: the sand settles there
    if (shelterAt(x, z) > 0.5) D.age[i] += dt * 4;                          // drifted into the lee of the spit: fade out
    if (D.dx[i] || D.dz[i]) { if (tx * D.dx[i] + tz * D.dz[i] < 0.6) D.age[i] += dt * 4; }   // sharp corner: fade instead of swinging round
    else { D.dx[i] = tx; D.dz[i] = tz; }
    const end = smooth(clamp((LSTZ.y - z) / 6, 0, 1));                     // 1 along the stretch, 0 at its downdrift end
    const sp = speed * (0.3 + 0.7 * end), pull = clamp((D.off[i] - s0) / Math.max(b1, 0.3), -1, 1) * speed * 0.5;
    D.x[i] = x + (tx * sp + nx * pull) * dt; D.z[i] = z + (tz * sp + nz * pull) * dt; D.age[i] += dt;
    D.dx[i] = lerp(D.dx[i], tx, 0.08); D.dz[i] = lerp(D.dz[i], tz, 0.08);
    const dl = Math.hypot(D.dx[i], D.dz[i]) || 1;
    const u = D.age[i] / D.life[i], a = Math.min(1, u * 4) * Math.min(1, (1 - u) * 3) * (0.35 + 0.65 * end) * 0.62;
    P4[i * 4] = D.x[i]; P4[i * 4 + 1] = D.z[i]; P4[i * 4 + 2] = a * on; P4[i * 4 + 3] = D.sz[i] * (0.6 + 0.4 * end);
    D2[i * 2] = D.dx[i] / dl; D2[i * 2 + 1] = D.dz[i] / dl;
    live++;
  }
  D.live = live; D.iP.needsUpdate = true; D.iD.needsUpdate = true;
}
function applyTime() {
  const t = S.t, ch = CHAPTERS[S.c];
  shared.uRSL.value = waterLevel(t);
  const st = stageState(t);
  stageU.uK.value = st.k; stageU.uFrac.value = st.f;
  stageU.uSacP.value = (st.k === 5 && st.f > 0.905) || shared.uReal.value > 0.5 ? 1 : 0;
  stageU.uSpitP.value = st.k === 1 ? clamp((st.f - META.spit.f0) / (META.spit.f1 - META.spit.f0), 0, 1) : (st.k > 1 ? 1 : 0);
  stageU.uSpitZ.value = lerp(META.spit.zN, META.spit.zS, stageU.uSpitP.value);   // z of the growing tip (km)
  innerMat.uniforms.uSeaClamp.value = smooth(clamp((8.45 - t) / 0.25, 0, 1));
  innerMat.uniforms.uFlood.value = shared.uRSL.value;                 // the valley's delta cells drown with the bay floor around them
  shared.uReal.value = ch.reveal ? smooth(clamp((S.tf - 0.84) / 0.10, 0, 1)) : 0;
  // the Anthropocene (end of 'azi'): canals are dug from their ends inwards (0-7 s), the dikes rise piece by piece (1.5-7.5 s),
  // then the polders they close fill in; anthT = seconds since the ride reached the overlay (updateProcesses)
  const an = ch.reveal ? smooth(clamp((S.tf - 0.9) / 0.09, 0, 1)) : 0, iu = innerMat.uniforms;
  iu.uAnth.value = an; iu.uCanal.value = 1.03 * Math.pow(clamp(anthT / 7, 0, 1), 1.6);   // slow start: most canals are short
  iu.uPolder.value = smooth(clamp((anthT - 7.5) / 1.5, 0, 1));   // (this line used to sit inside the comment above: the polders never showed)
  if (dikeMesh) { const u = dikeMesh.material.uniforms; u.uDike.value = clamp((anthT - 1.5) / 6, 0, 1.1); u.uAlpha.value = an;
    dikeMesh.visible = an > 0.01 && !HIDE.has('inner'); }
  if (sacMesh) {                                  // Sacalin rises in 1897 and hands over to the satellite image at the end
    const a = smooth(clamp((0.14 - t) / 0.04, 0, 1)) * (1 - shared.uReal.value);
    sacMesh.material.uniforms.uAmp.value = a; sacMesh.visible = a > 0.002 && !HIDE.has('inner');
  }
  if (spitMesh) {                                 // the initial spit grows to its tip (6.7 -> 5.7 ka), then sinks into the 3.5 ka map
    const k = stageU.uK.value, a = k === 1 ? 1 : (k === 2 ? 1 - smooth(clamp((stageU.uFrac.value - 0.05) / 0.3, 0, 1)) : 0), u = spitMesh.material.uniforms;
    u.uGrow.value = k === 1 ? stageU.uSpitP.value : 1.02; u.uAmp.value = a;
    spitMesh.visible = a > 0.002 && (k > 1 || stageU.uSpitP.value > 0) && !HIDE.has('inner');
  }
  updateSDField();
  const dist = viewDist();
  shared.uSpotK.value = 1 - smooth(clamp((dist - BASIN_NEAR) / 450, 0, 1));   // takes over from the Start view's basin highlight as we zoom in
  setCosmos(dist > 3000 && !renderer.xr.isPresenting);   // closer in, the terrain fills the whole screen and hides it
  wholeView = P.basin > 0.01 && dist > BASIN_NEAR && !renderer.xr.isPresenting;   // Start view: one seamless Europe relief
  euroWhole.visible = wholeView;
  euroMesh.visible = !wholeView && (dist > 600 || ch.europe);
  outerMesh.visible = innerMesh.visible = !wholeView;
  if (danMesh) {                                  // the drawn Danube above the delta, on the regional relief
    const a = smooth(clamp((1100 - dist) / 400, 0, 1)), u = danMesh.material.uniforms;
    danMesh.visible = !wholeView && a > 0.01; u.uAlpha.value = a; u.uPre.value = smooth(clamp((t - 8.25) / 0.35, 0, 1));   // below the apex only before the delta
    u.uWidth.value = Math.max(0.28, dist * 0.0016); u.uLift.value = 0.004 + dist * 0.0004;
  }
  if (HIDE.size) { if (HIDE.has('inner')) innerMesh.visible = false; if (HIDE.has('outer')) outerMesh.visible = false; if (HIDE.has('river') && danMesh) danMesh.visible = false; if (HIDE.has('europe')) euroMesh.visible = euroWhole.visible = false; if (HIDE.has('water')) waterMesh.visible = false; }
  if (dikeMesh) { const u = dikeMesh.material.uniforms; u.uWidth.value = Math.max(0.06, dist * 0.0014); u.uLift.value = 0.02 + dist * 0.0003; }
  const fogD = 0.55 / Math.max(dist * 3.2, 60);
  shared.uFogD.value = renderer.xr.isPresenting ? 0 : fogD;
  if (renderer.xr.isPresenting) { camera.near = 0.02; camera.far = 200; } else { camera.near = Math.max(0.02, dist * 0.002); camera.far = Math.max(4000, dist * 12); }
  camera.updateProjectionMatrix();
}

/* ------------------------------------------------------------------ performance */
function updateSDField() {                 // stage state changed → new CPU cache version + re-render the GPU field
  const key = stageU.uK.value + '|' + stageU.uFrac.value.toFixed(4) + '|' + stageU.uSpitP.value.toFixed(4) + '|' + stageU.uSacP.value + '|' + (shared.uReal.value > 0.5 ? 1 : 0);
  if (key === sdKey) return;
  sdKey = key; SDF.ver++;
  if (!sdRT) return;
  const xr = renderer.xr.enabled, prev = renderer.getRenderTarget();
  renderer.xr.enabled = false; renderer.setRenderTarget(sdRT); renderer.render(sdScene, sdCam);
  renderer.setRenderTarget(prev); renderer.xr.enabled = xr;
}
let cosOn = true, cosT = 0;
function setCosmos(on) {                   // the shared particle background only runs while some of it is visible
  if (on === cosOn) return; cosOn = on; clearTimeout(cosT);
  if (on) { COSMOS.start(); COSMOS.setOpacity(0.85); } else { COSMOS.setOpacity(0); cosT = setTimeout(() => { if (!cosOn) COSMOS.stop(); }, 1400); }
}
// frame pacing: at most 60 fps; 30 fps while nothing moves (no travel, no touch for 15 s); never throttled in XR.
// dynamic resolution: if frames keep arriving late, render fewer pixels (down to half), and back up when there is headroom.
const DYN = !new URLSearchParams(location.search).has('clean'), NOCAP = new URLSearchParams(location.search).has('nocap');   // ?nocap: benchmarks
let fitPR = () => {}, lastFrame = 0, slowT = 0, fastT = 0;
function pace(now) {                       // false = skip this display frame
  if (renderer.xr.isPresenting || NOCAP) return true;
  const busy = S.travel || S.scrub || performance.now() - lastInput() < 15000;
  const minI = busy ? 1000 / 60 : 1000 / 30, gap = now - lastFrame;
  if (gap < minI - 2) return false;
  if (DYN && lastFrame && gap < 500) {
    if (gap > minI * 1.6) { slowT += gap; fastT = 0; } else if (gap < minI * 1.15) { fastT += gap; slowT = 0; }
    if (slowT > 1500 && prNow > PR_MAX * 0.5) { prNow = Math.max(PR_MAX * 0.5, prNow * 0.85); renderer.setPixelRatio(prNow); fitPR(); slowT = 0; }
    else if (fastT > 6000 && prNow < PR_MAX) { prNow = Math.min(PR_MAX, prNow * 1.12); renderer.setPixelRatio(prNow); fitPR(); fastT = 0; }
  }
  lastFrame = now; return true;
}

/* ------------------------------------------------------------------ WebXR tabletop */
const xrView = { dist: 130 };
import('./xr.js').then(m => m.initXR({ THREE, renderer, scene, camera, world, shared, S, STOPS, UI, get LANG() { return LANG; }, set LANG(v) { toggleLang(); },
  xrView, currentShot, timeText, seaLevel, stopText, next, prev, jumpTo, railX })).catch(e => console.warn('XR init', e));

/* ------------------------------------------------------------------ main */
const clock = new THREE.Clock();
async function main() {
  try { await build(); }
  catch (e) {
    console.error(e);
    $('loadmsg').textContent = location.protocol === 'file:' ? 'Deschide aplicația prin start_kiosk.bat (server local) — browserul nu poate citi datele direct din fișier.' : 'Eroare la încărcarea datelor: ' + e.message;
    return;
  }
  wireUI();
  const q = new URLSearchParams(location.search);
  if (q.has('st')) { const k = clamp(parseInt(q.get('st')) || 0, 0, STOPS.length - 1); setU(ST_U[k]); S.st = S.card = k; S.started = k > 0; arrive(); }
  if (q.has('u')) window.__dbg.seek(parseFloat(q.get('u')) || 0);   // debug: any moment on the rail (chapters), e.g. ?u=3.6
  if (q.has('clean')) document.body.classList.add('clean');
  if (q.has('warm')) {                            // pre-simulate (particles, fades) before the first frame — for headless captures
    for (let i = 0, n = Math.min(3000, parseInt(q.get('warm')) || 300); i < n; i++) {
      const dt = 1 / 30; stepStory(dt); applyTime(); updateProcesses(dt); updateCamera(dt); shared.uTime.value += dt;
    }
  }
  document.body.classList.add('ready'); ready(); SUI.arrived();
  startIdle(() => go(HUB + 'index.html?reset=1'), { busy: () => !!S.travel });
  renderer.setAnimationLoop(now => {
    if (!pace(now)) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    stepStory(dt);
    applyTime();
    updateProcesses(dt);
    if (!renderer.xr.isPresenting) { updateCamera(dt); if (S.manualCam) controls.update(); }
    window.__xrFrame && window.__xrFrame(dt);
    world.updateMatrixWorld();
    updateLabels(); updateUI(); updateBubbles();
    shared.uTime.value += dt;
    renderer.render(scene, camera);
  });
}
main();
window.__story = S; window.__rail = { travelTo, jumpTo, next, prev, ST_U };
window.__dbg = { get drift() { return drift; }, get quality() { return { GPU, WEAK, PR_MAX, prNow }; }, world, scene, camera, renderer, P, controls, get plumes() { return plumes; }, get water() { return waterMesh; }, get inner() { return innerMesh; }, snap: () => { camSmooth = null; }, warm: (n = 80) => { for (let i = 0; i < n; i++) updateProcesses(0.1); },
  seek: u => { S.travel = null; setU(u); S.st = ST_U.findIndex(v => v >= u - 1e-6); S.card = Math.max(0, S.st); lastCard = -1; S.manualCam = false; camSmooth = null; snapProc = true; arrive(); } };

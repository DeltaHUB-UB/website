// Gura Sfântu Gheorghe — shaders (three.js r160, WebGL2). Units: km; heights in m are scaled by uVx/1000 on the CPU.

const fog = /* glsl */`
uniform vec3 uFogC; uniform float uFogD;
float edgeFade(vec2 xz) { return 1.0 - smoothstep(5.6, 7.3, length(xz)); }
`;

/* ---------------------------------------------------------------- terrain: land drape + sea bed (+ change colours) */
export const terrainVS = /* glsl */`
attribute float aH; attribute float aD; attribute float aFoot; attribute float aAct;
varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vH, vD, vFoot, vDist, vAct;
uniform vec4 uRect;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vUv = vec2((position.x - uRect.x) / uRect.z, 1.0 - (position.z - uRect.y) / uRect.w);
  vH = aH; vD = aD; vFoot = aFoot; vAct = aAct;
  vec4 mv = viewMatrix * w; vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const terrainFS = /* glsl */`
uniform sampler2D tSat; uniform float uDiff; uniform float uTime; uniform float uContour; uniform float uFade;
varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vH, vD, vFoot, vDist, vAct;
${fog}
vec3 bedCol(float h) {                     // sea-bed colour by depth (m, negative down)
  float d = -h;
  vec3 c = vec3(.86, .80, .62);
  c = mix(c, vec3(.70, .70, .52), smoothstep(0.3, 2.0, d));
  c = mix(c, vec3(.42, .58, .52), smoothstep(2.0, 5.0, d));
  c = mix(c, vec3(.20, .43, .52), smoothstep(5.0, 9.0, d));
  c = mix(c, vec3(.10, .26, .44), smoothstep(9.0, 15.0, d));
  c = mix(c, vec3(.06, .14, .30), smoothstep(15.0, 24.0, d));
  return c;
}
void main() {
  vec3 N = normalize(vN);
  vec3 L = normalize(vec3(-0.55, 0.72, -0.42));
  float sh = 0.42 + 0.78 * max(dot(N, L), 0.0);
  sh = mix(sh, 0.22 + 1.05 * max(dot(N, L), 0.0), smoothstep(0.0, -1.0, vH));      // the sea bed: harder relief shading (bar, channel)
  vec4 sat = texture2D(tSat, vUv);
  float landSat = smoothstep(0.35, 0.65, sat.a) * smoothstep(-0.6, 0.0, vH);
  float landSurv = smoothstep(-0.05, 0.15, vH);
  float land = mix(landSat, landSurv, vFoot);
  vec3 bed = bedCol(vH);
  // depth contours every 2 m (subtle), only on the sea bed
  float cl = abs(fract(-vH / 2.0 + 0.5) - 0.5) / max(fwidth(-vH / 2.0), 1e-4);
  bed *= 1.0 - uContour * 0.16 * (1.0 - smoothstep(0.0, 1.2, cl)) * smoothstep(0.6, 1.5, -vH);
  vec3 sand = vec3(.88, .82, .64);
  vec3 lc = mix(sand, pow(sat.rgb, vec3(1.08)), smoothstep(0.35, 0.65, sat.a) * (1.0 - vFoot * 0.7));
  vec3 col = mix(bed, lc, land) * sh;
  // change since the reference survey: gold = deposited, red = eroded; only the big ones (> ~0.8 m; vD is already 0 below ~10 m),
  // deeper tones where the bed moved 2–3 m, a thin dark line at every metre of change
  float ad = abs(vD);
  float t = smoothstep(0.75, 1.1, ad) * mix(0.42, 1.0, smoothstep(1.1, 2.6, ad)) * uDiff * vFoot * (1.0 - land);   // stronger where the bed moved more
  vec3 dc = vD > 0.0 ? mix(vec3(1.0, .80, .36), vec3(1.0, .50, .02), smoothstep(1.0, 2.8, ad))
                     : mix(vec3(1.0, .42, .30), vec3(.80, .06, .05), smoothstep(1.0, 2.8, ad));
  float il = abs(fract(ad + 0.5) - 0.5) / max(fwidth(ad), 1e-4);
  dc *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 1.3, il)) * step(0.9, ad);
  col = mix(col, dc * (0.68 + 0.5 * sh), t * 0.95);
  // changing right now: a pulse over the cells that are rising (gold) or dropping (red)
  // (a slow "breathing" in time only: no spatial waves; mixed, not added, so gold over teal never turns lime)
  float act = smoothstep(0.05, 0.8, abs(vAct)) * vFoot * (1.0 - land);
  float pulse = 0.7 + 0.3 * sin(uTime * 3.5);
  col = mix(col, (vAct > 0.0 ? vec3(1.0, .78, .32) : vec3(1.0, .3, .2)) * (0.75 + 0.35 * sh), act * pulse * 0.6);
  // the surveyed square: thin bright edge
  float fe = abs(vFoot - 0.03) / max(fwidth(vFoot), 1e-4);
  col += vec3(.55, .65, .7) * (1.0 - smoothstep(0.0, 1.0, fe)) * 0.35 * (1.0 - land);
  float a = edgeFade(vW.xz) * uFade;
  col = mix(uFogC, col, exp(-uFogD * vDist));
  gl_FragColor = vec4(col, a);
}`;

/* ---------------------------------------------------------------- water: Gerstner waves from the NE, foam where they break, river plume */
export const waterVS = /* glsl */`
uniform float uTime, uAmp, uHs, uVx; uniform sampler2D tDepth, tSea; uniform vec4 uRect;
varying vec3 vW; varying float vH, vCrest, vDist, vSea; varying vec2 vUv; varying vec3 vN;
float depthAt(vec2 xz) { vec2 uv = vec2((xz.x - uRect.x) / uRect.z, 1.0 - (xz.y - uRect.y) / uRect.w); return texture2D(tDepth, uv).r; }
void main() {
  vec3 p = position;
  float h = depthAt(p.xz);
  vH = h;
  vSea = texture2D(tSea, vec2((p.x - uRect.x) / uRect.z, 1.0 - (p.z - uRect.y) / uRect.w)).r;   // 0 on the Danube, lakes, lagoons
  // shoaling / breaking: waves grow a little toward the break line, then die out in the surf
  float brk = 1.3 * uHs + 0.3;
  float sh = smoothstep(0.0, brk * 0.9, -h) * (1.0 + 0.5 * smoothstep(brk * 2.2, brk, -h)) * mix(0.04, 1.0, vSea);
  vec3 disp = vec3(0.0); float hx = 0.0, hz = 0.0;
  // direction of travel: toward the SW (waves from the NE), with spread
  vec2 dirs[4]; dirs[0] = normalize(vec2(-0.74, 0.67)); dirs[1] = normalize(vec2(-0.55, 0.83)); dirs[2] = normalize(vec2(-0.86, 0.5)); dirs[3] = normalize(vec2(-0.66, 0.75));
  float lam[4]; lam[0] = 0.52; lam[1] = 0.37; lam[2] = 0.27; lam[3] = 0.21;
  float amp[4]; amp[0] = 1.0; amp[1] = 0.5; amp[2] = 0.28; amp[3] = 0.16;
  float crest = 0.0;
  for (int i = 0; i < 4; i++) {
    float k = 6.2831853 / lam[i], om = 6.2831853 / (2.0 + lam[i] * 7.0), A = uAmp * amp[i] * sh;
    float ph = k * dot(dirs[i], p.xz) - om * uTime + float(i) * 1.7;
    float Q = min(0.6 / (k * A * 4.0 + 1e-6), 1.0);
    disp.xz += Q * A * dirs[i] * cos(ph);
    disp.y += A * sin(ph);
    crest += amp[i] * sin(ph);
    hx += A * k * dirs[i].x * cos(ph); hz += A * k * dirs[i].y * cos(ph);
  }
  vCrest = crest / 2.08;
  vN = normalize(vec3(-hx * 0.35, 1.0, -hz * 0.35));
  vec4 w = modelMatrix * vec4(p + disp, 1.0);
  vW = w.xyz; vUv = vec2((p.x - uRect.x) / uRect.z, 1.0 - (p.z - uRect.y) / uRect.w);
  vec4 mv = viewMatrix * w; vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const waterFS = /* glsl */`
uniform float uTime, uHs, uClear, uFade; uniform sampler2D tPlume; uniform vec4 uPR;
varying vec3 vW; varying float vH, vCrest, vDist, vSea; varying vec2 vUv; varying vec3 vN;
${fog}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  float d = -vH;
  if (d < 0.02) discard;
  vec3 N = normalize(mix(vec3(0.0, 1.0, 0.0), vN, vSea));
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec2 pu = (vW.xz - uPR.xy) / uPR.zw;
  vec4 pl = (pu.x > 0.0 && pu.x < 1.0 && pu.y > 0.0 && pu.y < 1.0) ? texture2D(tPlume, pu) : vec4(0.0);
  float C = pl.r, S = pl.g;                         // river plume, storm-stirred water
  vec3 deep = vec3(.03, .13, .24), shal = vec3(.10, .34, .40), mud = vec3(.46, .42, .33), stir = vec3(.55, .53, .45);
  vec3 col = mix(shal, deep, smoothstep(1.0, 14.0, d));
  col = mix(col, mud, C * 0.7);
  col = mix(col, stir, S * 0.6);
  vec3 L = normalize(vec3(-0.55, 0.72, -0.42));
  vec3 Hh = normalize(L + V);
  float spec = pow(max(dot(N, Hh), 0.0), 120.0) * 0.45;
  col += vec3(.75, .85, 1.0) * fres * 0.18 + spec;
  // foam: in the breaker zone and on wave crests when the sea is rough
  float brk = 1.3 * uHs + 0.3;
  float zone = smoothstep(brk * 1.25, brk * 0.55, d) * smoothstep(0.02, 0.4, d) * smoothstep(0.6, 1.4, uHs);
  float n = noise(vW.xz * 34.0 + vec2(uTime * 0.7, -uTime * 0.9)) * 0.6 + noise(vW.xz * 90.0 - uTime * 1.3) * 0.4;
  float foam = zone * smoothstep(0.35, 0.75, n + vCrest * 0.35);
  foam += smoothstep(0.65, 0.95, vCrest) * smoothstep(2.2, 4.5, uHs) * smoothstep(0.45, 0.8, n) * 0.8;
  foam = clamp(foam, 0.0, 1.0) * vSea;
  col = mix(col, vec3(.95, .97, 1.0), foam * 0.9);
  float a = (0.12 + 0.22 * smoothstep(1.0, 14.0, d)) * uClear + fres * 0.18 + C * 0.3 + S * 0.3 + foam * 0.75;
  a = clamp(a, 0.0, 0.93) * smoothstep(0.02, 0.25, d) * edgeFade(vW.xz) * uFade;
  col = mix(uFogC, col, exp(-uFogD * vDist));
  gl_FragColor = vec4(col, a);
}`;

/* ---------------------------------------------------------------- particles: streaks along the flow (iD ≠ 0) or flat dots (iD = 0) */
export const partVS = /* glsl */`
attribute vec4 iP; attribute vec2 iD; attribute vec4 iC;
uniform float uLen, uWid;
varying vec2 vQ; varying vec4 vC; varying float vDot;
void main() {
  vec2 q = position.xy; vQ = q; vC = iC;
  float L = length(iD); vDot = L < 1e-4 ? 1.0 : 0.0;
  vec2 d = L < 1e-4 ? vec2(1.0, 0.0) : iD / L;
  vec2 nrm = vec2(-d.y, d.x);
  float s = iC.w;
  vec2 off = vDot > 0.5 ? (vec2(q.x, q.y) * uWid * 3.2 * s) : (d * q.x * uLen * s + nrm * q.y * uWid * s);
  vec3 p = vec3(iP.x + off.x, iP.y, iP.z + off.y);
  vC.a = iP.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  if (iP.w <= 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;
export const partFS = /* glsl */`
varying vec2 vQ; varying vec4 vC; varying float vDot;
void main() {
  float a;
  if (vDot > 0.5) a = exp(-3.2 * dot(vQ, vQ)) * (1.0 - smoothstep(0.85, 1.0, length(vQ)));
  else a = pow(vQ.x * 0.5 + 0.5, 1.6) * (1.0 - vQ.y * vQ.y);
  gl_FragColor = vec4(vC.rgb * a * vC.a, a * vC.a);
}`;

/* ---------------------------------------------------------------- the coast 1985 → 2025 (Sacalin … Sulina): land lost turns red, land gained gold */
export const coastVS = /* glsl */`
varying vec2 vUv; varying vec3 vW;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
export const coastFS = /* glsl */`
uniform sampler2D tA, tB, tC; uniform float uP, uOp, uTime;
varying vec2 vUv; varying vec3 vW;
void main() {
  vec4 A = texture2D(tA, vUv), B = texture2D(tB, vUv), C = texture2D(tC, vUv);
  vec4 Ch = textureLod(tC, vUv, 4.0);                         // a soft halo so the thin strips read from far away
  float pl = smoothstep(0.15, 0.85, uP), pg = smoothstep(0.3, 1.0, uP);
  vec3 sea = vec3(.04, .12, .24);
  float landA = smoothstep(0.35, 0.65, mix(A.a, B.a, smoothstep(0.4, 0.6, uP)));
  vec3 lc = mix(A.rgb, B.rgb, smoothstep(0.35, 0.65, uP));
  vec3 col = mix(sea, lc * 0.92, landA);
  float lost = C.r, gain = C.g;
  // land lost: still land at the start, it turns red and stays red (land the sea took)
  col = mix(col, mix(A.rgb, vec3(1.0, .2, .12), pl), lost);
  col = mix(col, vec3(1.0, .76, .25), gain * pg);
  float pulse = 0.6 + 0.4 * sin(uTime * 3.0);
  col += vec3(1.0, .25, .15) * Ch.r * 2.2 * pl * pulse + vec3(1.0, .75, .3) * Ch.g * 1.6 * pg;
  // fade out at the edges of the image
  vec2 e = min(vUv, 1.0 - vUv);
  float a = smoothstep(0.0, 0.06, e.x) * smoothstep(0.0, 0.04, e.y) * uOp;
  gl_FragColor = vec4(col, a);
}`;

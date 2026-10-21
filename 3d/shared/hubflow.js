// DELTA-Hub main screen — a "cosmic" delta: the Delta vie flow sparkles at the flood peak drawn as soft drifting stars over a
// nebula shaped like the delta, a deep starfield in three depths (parallax), a few out-of-focus dust motes in front, bloom,
// and a camera that floats slowly over it all (tilt, turn, zoom and drift on long, unrelated periods).
// Data: shared/data/hub_flow.json + hub_flow.bin.gz (tools/hub/build_hub_flow.py, from delta-vie.html):
//   wet mask of the peak frame (uint8, cs m cells) + the velocity samples of that frame (x, z float32; vx, vz int8 × vscale m/s).
// Coordinates: app-local metres on the y = 0 plane, x = E − 827040, z = 390332.5 − N (Stereo 70), as in Delta vie.
import * as THREE from 'three';
import { EffectComposer } from './vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/jsm/postprocessing/OutputPass.js';

const SK = 7;                      // tail slots (ring buffer)
const VCS = 400;                   // velocity grid cell (m)
const DCS = 1500;                  // crowding grid cell (m)
const FOV = 34;

export async function hubFlow(canvasParent, { base = 'shared/data/', count = 24000, onFrame = null } = {}) {
  const meta = await (await fetch(base + 'hub_flow.json')).json();
  const r = await fetch(base + 'hub_flow.bin.gz');
  if (!r.ok) throw new Error('hub_flow.bin.gz ' + r.status);
  const raw = new Uint8Array(await r.arrayBuffer());
  const buf = (raw[0] === 0x1f && raw[1] === 0x8b)
    ? await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : raw.buffer;
  const { cs, x0, z0, nx, nz, P, vscale } = meta;
  let o = 0;
  const wet = new Uint8Array(buf, o, nx * nz); o += nx * nz;
  const f32 = n => { const a = new Float32Array(buf.slice(o, o + 4 * n)); o += 4 * n; return a; };
  const px = f32(P), pz = f32(P);
  const vec = new Int8Array(buf, o, P * 2);

  /* smoothed velocity grid (Gaussian splat of the samples, as velGrid() in Delta vie) */
  let vx0 = 1e30, vx1 = -1e30, vz0 = 1e30, vz1 = -1e30;
  for (let i = 0; i < P; i++) { vx0 = Math.min(vx0, px[i]); vx1 = Math.max(vx1, px[i]); vz0 = Math.min(vz0, pz[i]); vz1 = Math.max(vz1, pz[i]); }
  const G = { mnx: vx0 - 2 * VCS, mnz: vz0 - 2 * VCS, nx: Math.ceil((vx1 - vx0) / VCS) + 5, nz: Math.ceil((vz1 - vz0) / VCS) + 5 };
  const gn = G.nx * G.nz, gvx = new Float32Array(gn), gvz = new Float32Array(gn), gw = new Float32Array(gn);
  const spd = new Float32Array(P);
  for (let i = 0; i < P; i++) {
    const ax = vec[2 * i] * vscale, az = -vec[2 * i + 1] * vscale;      // north → −z
    spd[i] = Math.hypot(ax, az);
    const fx = (px[i] - G.mnx) / VCS, fz = (pz[i] - G.mnz) / VCS, cx = Math.round(fx), cz = Math.round(fz);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const X = cx + dx, Z = cz + dz; if (X < 0 || X >= G.nx || Z < 0 || Z >= G.nz) continue;
      const ex = X - fx, ez = Z - fz, k = Math.exp(-(ex * ex + ez * ez) / (2 * 1.1 * 1.1)), c = Z * G.nx + X;
      gvx[c] += k * ax; gvz[c] += k * az; gw[c] += k;
    }
  }
  for (let c = 0; c < gn; c++) if (gw[c] > 1e-6) { gvx[c] /= gw[c]; gvz[c] /= gw[c]; }
  const _v = { x: 0, z: 0 };
  function vel(x, z) {
    const fx = (x - G.mnx) / VCS, fz = (z - G.mnz) / VCS, X = Math.floor(fx), Z = Math.floor(fz);
    if (X < 0 || Z < 0 || X >= G.nx - 1 || Z >= G.nz - 1) { _v.x = 0; _v.z = 0; return _v; }
    const tx = fx - X, tz = fz - Z, c = Z * G.nx + X, c1 = c + 1, c2 = c + G.nx, c3 = c2 + 1;
    const w00 = (1 - tx) * (1 - tz), w10 = tx * (1 - tz), w01 = (1 - tx) * tz, w11 = tx * tz;
    _v.x = gvx[c] * w00 + gvx[c1] * w10 + gvx[c2] * w01 + gvx[c3] * w11;
    _v.z = gvz[c] * w00 + gvz[c1] * w10 + gvz[c2] * w01 + gvz[c3] * w11;
    return _v;
  }
  const isWet = (x, z) => { const cx = (x - x0) / cs | 0, cz = (z - z0) / cs | 0; return cx >= 0 && cz >= 0 && cx < nx && cz < nz && wet[cz * nx + cx] === 1; };

  /* extent of the water (for framing) */
  let ex0 = 1e30, ex1 = -1e30, ez0 = 1e30, ez1 = -1e30;
  for (let cz = 0; cz < nz; cz++) for (let cx = 0; cx < nx; cx++) if (wet[cz * nx + cx]) {
    const X = x0 + cx * cs, Z = z0 + cz * cs; if (X < ex0) ex0 = X; if (X > ex1) ex1 = X; if (Z < ez0) ez0 = Z; if (Z > ez1) ez1 = Z;
  }
  const EXT = Math.max(ex1 - ex0, ez1 - ez0), MX = (ex0 + ex1) / 2, MZ = (ez0 + ez1) / 2;

  /* renderer, deep-space background, bloom */
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  canvasParent.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  /* deep-space sky: a full-screen shader, slow drifting violet / teal clouds over a deep-blue vignette; it slides a
     little with the camera (parallax). Colours are linear (OutputPass encodes to sRGB). */
  const SKY = { uT: { value: 0 }, uOff: { value: new THREE.Vector2() }, uAsp: { value: innerWidth / innerHeight } };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, uniforms: SKY,
    vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=vec4(position.xy,0.9999,1.0); }`,
    fragmentShader: `uniform float uT,uAsp; uniform vec2 uOff; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int k=0;k<5;k++){ s+=a*n(p); p=p*2.02+vec2(1.7,9.2); a*=0.5; } return s; }
      void main(){
        vec2 p=vec2(vP.x*uAsp,vP.y)+uOff;
        float d=length(vec2(vP.x*0.9,vP.y*1.1)-vec2(-0.05,0.0));
        vec3 c=mix(vec3(0.0045,0.0105,0.050),vec3(0.0006,0.0012,0.0055),smoothstep(0.0,1.45,d));
        float sw=0.10*sin(uT*0.05)+0.35*length(vP);                                       // a slow, wide swirl around the centre
        p=mat2(cos(sw),-sin(sw),sin(sw),cos(sw))*p;
        vec2 q=vec2(fbm(p*0.9+vec2(uT*0.032,0.0)),fbm(p*0.9+vec2(5.2,uT*0.026)));       // domain warp, twice: the clouds flow and curl
        vec2 r2=vec2(fbm(p*1.3+1.6*q+vec2(1.7,9.2)+uT*0.021),fbm(p*1.3+1.6*q+vec2(8.3,2.8)-uT*0.018));
        p+=1.25*(r2-0.5);
        float v=fbm(p*1.1+vec2(uT*0.024,-uT*0.017)), t=fbm(p*1.9-vec2(uT*0.036,uT*0.023)+7.3), b=fbm(p*0.55+vec2(-uT*0.012,uT*0.009)+3.1);
        c+=vec3(0.040,0.010,0.085)*smoothstep(0.48,0.95,v);          // violet clouds
        c+=vec3(0.000,0.028,0.040)*smoothstep(0.52,0.95,t);          // teal wisps
        c+=vec3(0.006,0.014,0.060)*smoothstep(0.35,0.85,b);          // a slow, wide blue swell
        gl_FragColor=vec4(c,1.0);
      }`
  }));
  sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
  const cam = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 1000, 5e6);
  cam.up.set(0, 0, -1);                                                    // north (−z) at the top of the screen
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.62, 0.8, 0.10);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  const TIME = { value: 0 }; SKY.uT = TIME;

  /* starfield: three depths below the delta plane (they slide slower than the delta = parallax) */
  function starLayer(n, depth0, depth1, size0, size1, spread) {
    const p = new Float32Array(n * 3), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const d = depth0 + Math.random() * (depth1 - depth0), s = spread * (1 + d / EXT);
      p[3 * i] = MX + (Math.random() - 0.5) * s * 2.2; p[3 * i + 1] = -d; p[3 * i + 2] = MZ + (Math.random() - 0.5) * s * 1.6;
      a[3 * i] = size0 + Math.pow(Math.random(), 4) * (size1 - size0); a[3 * i + 1] = Math.random(); a[3 * i + 2] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('a', new THREE.BufferAttribute(a, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uT: TIME, uS: { value: 1 } },
      vertexShader: `attribute vec3 a; uniform float uT,uS; varying vec3 vC; varying float vA;
        void main(){
          float tw=0.55+0.45*sin(uT*(0.6+a.y*2.4)+a.z*40.0);
          vC=mix(vec3(0.70,0.80,1.00),a.z>0.93?vec3(1.0,0.85,0.55):vec3(0.55,0.65,1.0),a.y*0.6);
          vA=tw;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          gl_PointSize=a.x*uS;
        }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0)discard; gl_FragColor=vec4(vC*vA*exp(-r*4.0)*0.6,1.0); }`
    });
    const s = new THREE.Points(g, m); s.frustumCulled = false; s.renderOrder = 0; scene.add(s); return s;
  }
  const stars = [starLayer(2600, EXT * 3, EXT * 9, 1.0, 3.0, EXT), starLayer(1200, EXT * 0.8, EXT * 2.5, 1.2, 3.6, EXT), starLayer(500, EXT * 0.15, EXT * 0.6, 1.4, 4.2, EXT)];

  /* nebula: the delta's wet area, blurred twice, coloured blue → violet, with slowly drifting gas */
  const nebTex = (() => {
    const W = nx, H = nz, m = document.createElement('canvas'); m.width = W; m.height = H;
    const g = m.getContext('2d'), img = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const v = wet[i] ? 255 : 0; img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = 255; img.data[4 * i + 3] = v; }
    g.putImageData(img, 0, 0);
    const out = document.createElement('canvas'); out.width = W; out.height = H; const o2 = out.getContext('2d');
    o2.filter = 'blur(26px)'; o2.globalAlpha = 0.9; o2.drawImage(m, 0, 0);                   // wide haze
    o2.filter = 'blur(7px)'; o2.globalAlpha = 0.55; o2.drawImage(m, 0, 0);                    // the delta's shape
    const t = new THREE.CanvasTexture(out); t.colorSpace = THREE.NoColorSpace; return t;
  })();
  const neb = new THREE.Mesh(new THREE.PlaneGeometry(nx * cs, nz * cs), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uMap: { value: nebTex }, uT: TIME },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uT; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int k=0;k<4;k++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        float m=texture2D(uMap,vUv).a;
        vec2 wq=vec2(fbm(vUv*3.0+uT*0.03),fbm(vUv*3.0-uT*0.026+4.0));                     // the nebula gas curls too
        float gas=fbm(vUv*5.0+wq*0.9+vec2(uT*0.036,-uT*0.024))*0.75+fbm(vUv*13.0-wq*0.6-vec2(uT*0.06,uT*0.045))*0.5;
        vec3 c=mix(vec3(0.03,0.20,0.30),vec3(0.08,0.10,0.48),smoothstep(0.25,0.75,vUv.y));          // teal south -> blue north
        c=mix(c,vec3(0.36,0.10,0.52),smoothstep(0.45,0.85,fbm(vUv*3.0+uT*0.004))*0.75);            // violet patches
        c=mix(c,vec3(0.12,0.40,0.85),smoothstep(0.65,0.98,m)*0.45);
        gl_FragColor=vec4(c*m*(0.25+0.75*gas)*0.17,1.0);
      }`
  }));
  neb.rotation.x = -Math.PI / 2; neb.position.set(x0 + nx * cs / 2, 0, z0 + nz * cs / 2); neb.renderOrder = 1; neb.frustumCulled = false; scene.add(neb);

  /* the flow sparkles: soft little stars that drift with the water */
  const N = count, pos = new Float32Array(N * SK * 4), hx = new Float32Array(N), hz = new Float32Array(N);
  const life = new Float32Array(N).fill(-1), l0 = new Float32Array(N);
  const slot = new Float32Array(N * SK), seed = new Float32Array(N * SK), rnd = new Float32Array(N);
  for (let p = 0; p < N; p++) rnd[p] = Math.random();
  for (let j = 0; j < SK; j++) for (let p = 0; p < N; p++) { slot[j * N + p] = j; seed[j * N + p] = rnd[p]; }
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 4); attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr); geo.setAttribute('slot', new THREE.BufferAttribute(slot, 1)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const U = { uHead: { value: 0 }, uK: { value: SK }, uTime: TIME, uPx: { value: 3 }, uVmax: { value: 1.5 } };
  const mat = new THREE.RawShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: U,
    vertexShader: `
      precision highp float;
      uniform mat4 modelViewMatrix,projectionMatrix;
      uniform float uHead,uK,uTime,uPx,uVmax;
      attribute vec4 position; attribute float slot,seed;
      varying vec3 vC;
      void main(){
        float age=mod(uHead-slot+uK,uK);
        float spd=floor(position.w)*0.01, fade=fract(position.w);
        float s=clamp(spd/uVmax,0.0,1.0);
        float tail=1.0-age/uK, head=age<0.5?1.0:0.0;
        float tw=0.45+0.55*pow(0.5+0.5*sin(uTime*(1.2+seed*4.0)+seed*60.0),2.0);     // twinkle like stars
        float ch=smoothstep(0.05,0.40,s);                                              // 0 = wetland (slow), 1 = channel (fast)
        vec3 dust=mix(vec3(0.16,0.50,0.62),vec3(0.42,0.28,0.85),0.5+0.5*sin(position.x*0.00009+position.z*0.00006+seed*1.5));
        dust=mix(dust,vec3(0.18,0.32,0.80),0.5+0.5*sin(position.z*0.00012-position.x*0.00004+1.3));   // a slow gradient over the delta
        vec3 c=mix(dust,mix(vec3(0.62,0.86,1.00),vec3(0.95,0.98,1.00),s),ch);
        if(seed>0.965)c=vec3(1.00,0.82,0.50);                                         // a few golden grains (sediment)
        float br=mix(0.22,0.72,ch)*fade*tail*tail*mix(0.55,1.25*tw,head);               // wetland dust faint, channels bright
        vC=c*br*0.42;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position.x,0.0,position.z,1.0);
        gl_PointSize=fade>0.0?uPx*mix(0.8,1.0,ch)*(1.0+0.9*head*tw)*(0.5+0.5*tail):0.0;
      }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vC;
      void main(){
        vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0;
        if(r>1.0)discard;
        gl_FragColor=vec4(vC*exp(-r*2.2),1.0);                 // soft, blurred disc
      }`
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 2; scene.add(pts);

  /* out-of-focus dust motes between the camera and the delta (bokeh) */
  const nB = 70, bp = new Float32Array(nB * 3), ba = new Float32Array(nB * 3);
  for (let i = 0; i < nB; i++) {
    bp[3 * i] = MX + (Math.random() - 0.5) * EXT * 1.6; bp[3 * i + 1] = EXT * (0.2 + Math.random() * 0.9); bp[3 * i + 2] = MZ + (Math.random() - 0.5) * EXT * 1.1;
    ba[3 * i] = 18 + Math.random() * 60; ba[3 * i + 1] = Math.random(); ba[3 * i + 2] = Math.random();
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('a', new THREE.BufferAttribute(ba, 3));
  const BS = { value: 1 };
  const bokeh = new THREE.Points(bg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uT: TIME, uS: BS },
    vertexShader: `attribute vec3 a; uniform float uT,uS; varying vec3 vC; varying float vA;
      void main(){ vec3 p=position; p.x+=sin(uT*0.05+a.y*30.0)*${(EXT * 0.03).toFixed(0)}.0; p.z+=cos(uT*0.04+a.z*30.0)*${(EXT * 0.03).toFixed(0)}.0;
        vC=a.z>0.8?vec3(1.0,0.8,0.5):(a.z>0.4?vec3(0.5,0.4,1.0):vec3(0.4,0.7,1.0)); vA=0.5+0.5*sin(uT*0.3+a.y*20.0);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); gl_PointSize=a.x*uS; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d)*2.0; if(r>1.0)discard;
        float k=smoothstep(1.0,0.75,r)*(0.55+0.45*r);            // a soft ring-ish disc, like an out-of-focus light
        gl_FragColor=vec4(vC*k*vA*0.022,1.0); }`
  }));
  bokeh.frustumCulled = false; bokeh.renderOrder = 3; scene.add(bokeh);

  /* framing + the slow float of the camera */
  let fit = { tx: MX, tz: MZ, d: EXT };
  function frame(rect) {          // fit the water extent into rect {x, y, w, h} (CSS px) of the window, seen from straight above
    const W = innerWidth, H = innerHeight;
    renderer.setSize(W, H); composer.setSize(W, H); bloom.resolution.set(W / 2, H / 2);
    cam.aspect = W / H; cam.updateProjectionMatrix(); SKY.uAsp.value = W / H;
    const mpp = Math.max((ex1 - ex0) / rect.w, (ez1 - ez0) / rect.h), tanH = Math.tan(FOV * Math.PI / 360);
    fit = { d: mpp * H / (2 * tanH), tx: MX - (rect.x + rect.w / 2 - W / 2) * mpp, tz: MZ - (rect.y + rect.h / 2 - H / 2) * mpp };
    const k = H / 1080;
    U.uPx.value = 3.2 * Math.max(0.6, k);
    stars.forEach(s => s.material.uniforms.uS.value = Math.max(0.6, k)); BS.value = Math.max(0.6, k);
    place(TIME.value);
  }
  const _t = new THREE.Vector3();
  function place(t) {
    // a fluid float: every axis is the sum of two slow sines with unrelated periods (no visible loop, no stop-and-go)
    const w = (a, p1, p2, ph) => a * (0.65 * Math.sin(t / p1 + ph) + 0.35 * Math.sin(t / p2 + ph * 2.3));
    const tilt = (12 + w(7, 23, 37, 0.0)) * Math.PI / 180;                    // never straight down: the stars slide past
    const turn = w(7, 29, 47, 1.3) * Math.PI / 180;
    const d = fit.d * (1 + w(0.09, 21, 33, 0.4));
    _t.set(fit.tx + EXT * w(0.05, 25, 41, 2.0), 0, fit.tz + EXT * w(0.04, 31, 19, 4.1));
    cam.position.set(_t.x + d * Math.sin(tilt) * Math.sin(turn), d * Math.cos(tilt), _t.z + d * Math.sin(tilt) * Math.cos(turn));
    cam.up.set(0, 0, -1); cam.lookAt(_t); cam.updateMatrixWorld();   // toScreen() must see this pose right away
    SKY.uOff.value.set((_t.x - fit.tx) / EXT * 0.8 + turn * 0.9, -(_t.z - fit.tz) / EXT * 0.8 + (tilt - 0.21) * 1.1);
  }
  const _p = new THREE.Vector3();
  const toScreen = (x, z) => { _p.set(x, 0, z).project(cam); return { x: (_p.x * 0.5 + 0.5) * innerWidth, y: (-_p.y * 0.5 + 0.5) * innerHeight }; };

  /* crowding: heads per DCS cell → dim where they pile up (the branches) */
  const DX0 = ex0 - DCS, DZ0 = ez0 - DCS, DNX = Math.ceil((ex1 - ex0) / DCS) + 3, DNZ = Math.ceil((ez1 - ez0) / DCS) + 3;
  let dens = new Float32Array(DNX * DNZ), densN = new Float32Array(DNX * DNZ);
  const dcell = (x, z) => { const X = (x - DX0) / DCS | 0, Z = (z - DZ0) / DCS | 0; return (X < 0 || Z < 0 || X >= DNX || Z >= DNZ) ? -1 : Z * DNX + X; };

  let head = 0, acc = 0, running = true, last = performance.now();
  const SSPEED = 3200;                                      // world metres per second per (m/s): a lively drift
  function step(dt) {
    acc += dt; if (acc >= 1 / 24) { acc = Math.min(acc - 1 / 24, 1 / 24); head = (head + 1) % SK; }
    const dtc = Math.min(dt, 0.05), off = head * N * 4, stepM = SSPEED * dtc;
    densN.fill(0);
    let spawn = Math.max(200, N / 10 | 0);
    for (let p = 0; p < N; p++) {
      const o = off + p * 4;
      if (life[p] <= 0) {
        pos[o + 3] = 0;
        if (spawn-- <= 0) continue;
        for (let t = 0; t < 3; t++) {                     // seed where water flows (faster = more seeds)
          const i = (Math.random() * P) | 0, sp0 = spd[i];
          if (sp0 < 0.008 || Math.random() > 0.16 + sp0 * 2.4) continue;   // fewer seeds on the slow wetlands
          const x = px[i] + (Math.random() - 0.5) * 700, z = pz[i] + (Math.random() - 0.5) * 700;
          if (!isWet(x, z)) continue;
          hx[p] = x; hz[p] = z; life[p] = l0[p] = 3 + Math.random() * 6; break;
        }
        continue;
      }
      let x = hx[p], z = hz[p];
      const v = vel(x, z), sp = Math.hypot(v.x, v.z);
      life[p] -= dtc * (sp < 0.015 ? 1.8 : 1);
      x += v.x * stepM; z += v.z * stepM;
      if (!isWet(x, z)) { life[p] = 0; pos[o + 3] = 0; continue; }
      hx[p] = x; hz[p] = z;
      const c = dcell(x, z); if (c >= 0) densN[c] += 1;
      const age = l0[p] - life[p];
      let fd = Math.max(0, Math.min(1, age / 0.8, life[p] / 1.2));
      pos[o] = x; pos[o + 2] = z;
      pos[o + 3] = Math.min(400, Math.round(sp * 100)) + Math.min(0.999, fd * 0.999);
    }
    const t = dens; dens = densN; densN = t;
    if (attr.addUpdateRange) { attr.clearUpdateRanges(); attr.addUpdateRange(off, N * 4); } else { attr.updateRange.offset = off; attr.updateRange.count = N * 4; }
    attr.needsUpdate = true;
    U.uHead.value = head;
  }
  const T0 = performance.now() / 1000 - Math.random() * 200;   // every visit starts somewhere else on the slow float
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    if (dt >= 1 / 62) {
      last = now; TIME.value = now / 1000 - T0;
      step(dt); place(TIME.value); composer.render();
      onFrame && onFrame();
    }
    requestAnimationFrame(loop);
  }
  for (let i = 0; i < 120; i++) step(1 / 30);                // warm up so the first frame already shows streaming water
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } });
  return { frame, toScreen, world: (E, Nn) => ({ x: E - meta.E0, z: meta.N0 - Nn }), meta, centre: { x: MX, z: MZ }, setOnFrame: f => { onFrame = f; } };
}

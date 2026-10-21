// Povestea Deltei — WebXR tabletop (VR + AR passthrough). The diorama follows the story camera:
// the chapter's shot decides what sits on the table (Europe in the prologue, the delta later).
export function initXR(ctx) {
  const { THREE, renderer, scene, camera, world, shared, S, STOPS, UI, xrView, currentShot, timeText, seaLevel, stopText, next, prev, jumpTo, railX } = ctx;
  const input = () => {};
  if (!navigator.xr) return;
  const box = document.getElementById('xrbtns');
  const R = 0.5;                                    // table radius (m)
  const table = new THREE.Vector3(0, 0.85, -0.9);
  let session = null, mode = null, needPlace = 0, yaw = 0, zoom = 1, distS = null;

  async function addBtn(m, label) {
    try { if (!(await navigator.xr.isSessionSupported(m))) return; } catch { return; }
    const b = document.createElement('button'); b.className = 'glass'; b.textContent = label; b.onclick = () => start(m); box.appendChild(b);
  }
  addBtn('immersive-vr', 'VR'); addBtn('immersive-ar', 'AR');

  // ---- table rim + base
  const rig = new THREE.Group(); scene.add(rig); rig.visible = false;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.006, 8, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8c170 }));
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.02, 0.05, 96), new THREE.MeshBasicMaterial({ color: 0x060d17 }));
  base.position.y = -0.045; rig.add(rim, base);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1); scene.add(hemi);

  // ---- panel (canvas)
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640;
  const g = cv.getContext('2d'); const ptex = new THREE.CanvasTexture(cv); ptex.colorSpace = THREE.SRGBColorSpace;
  const PW = 0.56, PH = PW * 640 / 1024;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: ptex, transparent: true }));
  rig.add(panel);
  const BTN = [['prev', 40], ['next', 150], ['lang', 260]];
  const TL = { x: 40, y: 500, w: 944, h: 40 };
  function wrap(text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW) { g.fillText(line, x, y); y += lh; line = w; } else line = t; }
    if (line) g.fillText(line, x, y); return y;
  }
  let lastDraw = 0;
  function drawPanel() {
    const L = ctx.LANG, T = stopText(S.travel ? S.travel.k : S.st);
    g.clearRect(0, 0, 1024, 640);
    g.fillStyle = 'rgba(8,16,27,0.9)'; g.beginPath(); g.roundRect(0, 0, 1024, 640, 28); g.fill();
    g.fillStyle = '#e8c170'; g.font = '600 24px Segoe UI, sans-serif'; g.fillText(T.kicker.toUpperCase(), 40, 56);
    const tt = timeText(S.t); g.textAlign = 'right'; g.fillStyle = '#eef4f8'; g.font = '300 38px Segoe UI, sans-serif'; g.fillText(tt.big, 984, 58);
    g.font = '22px Segoe UI, sans-serif'; g.fillStyle = '#b8c8d6';
    const sl = seaLevel(S.t); g.fillText(`${UI[L].sea}: ${sl.toFixed(1)} m · ${tt.small}`, 984, 92); g.textAlign = 'left';
    g.fillStyle = '#eef4f8'; g.font = '650 44px Segoe UI, sans-serif'; g.fillText(T.title, 40, 150);
    g.fillStyle = '#b8c8d6'; g.font = '25px Segoe UI, sans-serif'; wrap(T.body, 40, 200, 944, 35);
    // rail with stations
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(TL.x, TL.y + TL.h / 2 - 3, TL.w, 6);
    g.fillStyle = 'rgba(232,193,112,0.85)'; g.fillRect(TL.x, TL.y + TL.h / 2 - 3, TL.w * railX(S.u), 6);
    const n = STOPS.length;
    for (let i = 0; i < n; i++) { const x = TL.x + TL.w * i / (n - 1); g.beginPath(); g.arc(x, TL.y + TL.h / 2, i === S.st && !S.travel ? 16 : 11, 0, Math.PI * 2);
      g.fillStyle = i === S.st && !S.travel ? '#e8c170' : (railX(S.u) * (n - 1) >= i - 1e-6 ? '#8fc24a' : '#1b2c3d'); g.fill(); }
    // buttons
    const lab = { prev: '◀', next: '▶', lang: UI[L].lang };
    g.font = '600 30px Segoe UI, sans-serif'; g.textAlign = 'center';
    for (const [id, x] of BTN) { g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.roundRect(x, 560, 96, 60, 14); g.fill(); g.fillStyle = '#fff'; g.fillText(lab[id], x + 48, 601); }
    g.textAlign = 'left'; ptex.needsUpdate = true;
  }
  function panelHit(uv) {
    const x = uv.x * 1024, y = (1 - uv.y) * 640;
    if (y >= TL.y - 10 && y <= TL.y + TL.h + 10 && x >= TL.x && x <= TL.x + TL.w) {
      const n = STOPS.length; jumpTo(Math.round((x - TL.x) / TL.w * (n - 1))); return;
    }
    for (const [id, bx] of BTN) if (x >= bx && x <= bx + 96 && y >= 560 && y <= 620) {
      if (id === 'prev') prev(); else if (id === 'next') next();
      else if (id === 'lang') ctx.LANG = 'toggle';
    }
  }

  // ---- labels as sprites
  const sprites = [];
  function mkSprite(text, kind) {
    const c = document.createElement('canvas'); const x = c.getContext('2d'); x.font = '600 44px Segoe UI, sans-serif';
    const w = Math.ceil(x.measureText(text).width) + 32; c.width = w; c.height = 64;
    x.font = '600 44px Segoe UI, sans-serif'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,0.8)';
    x.fillStyle = kind === 'feat' || kind === 'age' ? '#e8c170' : kind === 'sea' ? '#a9d3f2' : '#ffffff';
    x.strokeText(text, 16, 34); x.fillText(text, 16, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.userData.aspect = w / 64; sp.renderOrder = 20;
    return sp;
  }
  let spriteLang = null;
  function buildSprites() {
    for (const s of sprites) { world.remove(s.sp); s.sp.material.map.dispose(); }
    sprites.length = 0;
    import('./story.js').then(({ LABELS }) => {
      for (const L of LABELS) { const sp = mkSprite(ctx.LANG === 'ro' ? L[0] : L[1], L[6]); sp.position.set(L[2], 0.8, L[3]); sp.visible = false; world.add(sp); sprites.push({ L, sp }); }
    });
    spriteLang = ctx.LANG;
  }

  // ---- controllers / hands
  const ctrls = [0, 1].map(i => {
    const c = renderer.xr.getController(i); scene.add(c);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xe8c170, transparent: true, opacity: 0.8 }));
    line.scale.z = 1.5; c.add(line); c.userData.line = line;
    c.addEventListener('selectstart', () => onSelect(c));
    c.addEventListener('squeezestart', () => { c.userData.grab = true; c.userData.ang = angleOf(c); c.userData.yaw0 = yaw; });
    c.addEventListener('squeezeend', () => { c.userData.grab = false; });
    const hand = renderer.xr.getHand(i); scene.add(hand);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe8c170 }));
    hand.userData.tip = tip; scene.add(tip); tip.visible = false; c.userData.hand = hand;
    return c;
  });
  const ray = new THREE.Raycaster(), tmpM = new THREE.Matrix4();
  function onSelect(c) {
    input();
    tmpM.identity().extractRotation(c.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
    const hit = ray.intersectObject(panel)[0];
    if (hit) { panelHit(hit.uv); drawPanel(); }
  }
  function angleOf(c) { const p = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld); return Math.atan2(p.x - table.x, p.z - table.z); }

  // ---- session
  const saved = {};
  async function start(m) {
    if (session) { session.end(); return; }
    input();
    const s = await navigator.xr.requestSession(m, { optionalFeatures: ['local-floor', 'hand-tracking'] });
    mode = m; renderer.xr.setReferenceSpaceType('local-floor'); await renderer.xr.setSession(s); session = s;
    saved.bg = scene.background; scene.background = m === 'immersive-ar' ? null : new THREE.Color(0x060d17);
    rig.visible = true; needPlace = 3; distS = null; buildSprites(); document.body.classList.add('xr');
    s.addEventListener('end', () => {
      session = null; rig.visible = false; scene.background = saved.bg; shared.uClipR.value = 0;
      world.scale.setScalar(1); world.position.set(0, 0, 0); world.rotation.set(0, 0, 0);
      for (const sp of sprites) sp.sp.visible = false; document.body.classList.remove('xr');
    });
  }
  function place() {
    const xc = renderer.xr.getCamera(); const p = new THREE.Vector3().setFromMatrixPosition(xc.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(xc.quaternion); fwd.y = 0; fwd.normalize();
    table.copy(p).addScaledVector(fwd, 0.85); table.y = Math.max(0.6, p.y - 0.55);
    yaw = Math.atan2(-fwd.x, -fwd.z);
    rig.position.copy(table); rig.rotation.y = yaw;
    panel.position.set(-0.32, 0.30, R * 0.35); panel.rotation.set(-0.35, 0.55, 0);
  }

  window.__xrFrame = (dt) => {
    if (!session) return;
    if (needPlace > 0 && --needPlace === 0) place();
    // sticks: rotate / zoom
    for (const src of session.inputSources) {
      const a = src.gamepad && src.gamepad.axes; if (!a || a.length < 4) continue;
      if (Math.abs(a[2]) > 0.2) yaw -= a[2] * dt * 1.2;
      if (Math.abs(a[3]) > 0.2) zoom = Math.min(8, Math.max(0.4, zoom * Math.exp(-a[3] * dt * 1.2)));
    }
    for (const c of ctrls) {
      if (c.userData.grab) yaw = c.userData.yaw0 + (angleOf(c) - c.userData.ang);
      const h = c.userData.hand, tip = h.userData.tip, j = h.joints && h.joints['index-finger-tip'];
      tip.visible = !!(j && j.visible); if (tip.visible) tip.position.setFromMatrixPosition(j.matrixWorld);
    }
    const shot = currentShot();
    const d = shot.dist / zoom;
    distS = distS == null ? d : Math.exp(Math.log(distS) + (Math.log(d) - Math.log(distS)) * Math.min(1, dt * 1.5));
    xrView.dist = distS;
    const s = R / (0.62 * distS);
    world.scale.setScalar(s); world.rotation.set(0, yaw, 0);
    const off = new THREE.Vector3(shot.x, 0, shot.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(s);
    world.position.copy(table).sub(off);
    shared.uClipR.value = R; shared.uClipC.value.copy(table);
    rig.position.copy(table);
    // sprites
    if (spriteLang !== ctx.LANG) buildSprites();
    for (const o of sprites) {
      const [, , x, z, tA, tB] = o.L;
      const inT = S.t <= tA && S.t >= tB;
      const wp = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(s).add(world.position);
      const inside = Math.hypot(wp.x - table.x, wp.z - table.z) < R * 0.95;
      o.sp.visible = inT && inside;
      if (o.sp.visible) { const hk = 0.022 / s; o.sp.scale.set(hk * o.sp.userData.aspect, hk, 1); o.sp.position.y = 0.035 / s; }
    }
    const now = performance.now(); if (now - lastDraw > 120) { lastDraw = now; drawPanel(); }
  };
}

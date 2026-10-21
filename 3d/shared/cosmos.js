// DELTA-Hub — the shared "cosmic blue" background: deep blue + slow luminous flow streaks (water drifting to the sea).
// Used by the hub and by every story (behind the 3D scene). Colours come from ui.css (--bg, --flow-a, --flow-b).
//   import { cosmos } from '../../shared/cosmos.js'; const C = cosmos({ opacity: 1, density: 1 }); C.setOpacity(.4);
export function cosmos({ opacity = 1, density = 1 } = {}) {
  const cv = document.createElement('canvas'); cv.id = 'dh-cosmos';
  document.body.insertBefore(cv, document.body.firstChild);
  const g = cv.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const rgb = v => (css.getPropertyValue(v).trim() || '').split(',').map(Number);
  const A = rgb('--flow-a'), B = rgb('--flow-b');            // "r,g,b" triplets
  let W = 0, H = 0, PS = [], run = true, paused = false;     // paused: stopped on purpose (e.g. hidden behind a 3D scene)
  const spawn = p => { p.x = Math.random() * W; p.y = Math.random() * H; p.a = 0; p.l = 4 + Math.random() * 7; p.c = Math.random() < .78 ? 0 : 1; return p; };
  function fit() {
    const k = Math.min(1, 1920 / innerWidth);                // simulate at ≤1920 px wide, CSS scales it up
    W = cv.width = Math.round(innerWidth * k); H = cv.height = Math.round(innerHeight * k);
    PS = Array.from({ length: Math.round(W * H / 1300 * density) }, () => spawn({}));
  }
  const field = (x, y, t) => { const s = 1 / Math.max(W, H);
    return 0.15 + Math.sin(x * s * 5.1 + t * .05) * 1.0 + Math.cos(y * s * 6.3 - t * .04) * 0.9 + Math.sin((x + y) * s * 2.2 + t * .03) * 0.6; };
  let prev = performance.now();
  function frame(now) {
    if (!run) return;
    const dt = Math.min(.05, (now - prev) / 1000); prev = now; const t = now / 1000;
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.065)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter'; g.lineWidth = Math.max(1.2, W / 1400); g.lineCap = 'round';
    const sp = W * 0.028;
    for (const p of PS) {
      const ang = field(p.x, p.y, t), nx = p.x + Math.cos(ang) * sp * dt, ny = p.y + Math.sin(ang) * sp * .7 * dt; p.a += dt;
      const f = Math.min(1, p.a / 1.2) * Math.min(1, (p.l - p.a) / 1.5);
      g.strokeStyle = p.c ? `rgba(${B},${.8 * f})` : `rgba(${A},${.62 * f})`;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(nx, ny); g.stroke();
      p.x = nx; p.y = ny;
      if (p.a > p.l || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) spawn(p);
    }
    requestAnimationFrame(frame);
  }
  addEventListener('resize', fit); fit(); requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { const was = run; run = !document.hidden && !paused; if (run && !was) { prev = performance.now(); requestAnimationFrame(frame); } });
  const api = { canvas: cv, setOpacity(o) { cv.style.opacity = o; }, stop() { paused = true; run = false; },
                start() { paused = false; if (!run && !document.hidden) { run = true; prev = performance.now(); requestAnimationFrame(frame); } } };
  api.setOpacity(opacity);
  return api;
}
// the theme's background colour as a number (for three.js fog / clear colour)
export function bgHex() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  return parseInt(v.replace('#', ''), 16) || 0x070e18;
}

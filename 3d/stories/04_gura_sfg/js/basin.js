// Gura Sfântu Gheorghe — last station: the Danube basin (same river and tributaries as story 1) with the Iron Gates dams.
// Golden grains travel down the rivers to the delta. "Today" most of those from upstream slow down in the Iron Gates I reservoir
// (Baziaș → the dam) and settle there: the lake fills with a golden deposit and a callout says "sediment stops here"; the
// tributaries below the dams (Romania, Bulgaria — most with dams of their own) bring little, so few grains reach the delta.
// "Before the dams" there is no lake and everything flows on. Illustrative: the grain counts follow the ~3-fold drop of the
// suspended load, not a sediment model.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const LON0 = 8.0, LON1 = 30.4, LAT0 = 42.1, LAT1 = 50.6, KX = Math.cos(46.3 * Math.PI / 180);
const RES_LL = [21.38, 44.81];            // Baziaș: where the Iron Gates I reservoir begins
const TRAP = 0.8;                         // today: share of the grains from upstream that settle in the reservoir
const LOW = 0.3;                          // today: grains from the tributaries below the dams, relative to before
const NB = 40;                            // deposit bins along the reservoir

export class Basin {
  constructor(canvas, B, tributaries, dams, mouth) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.B = B; this.dams = dams; this.mouth = mouth;
    this.on = false; this.mode = 'today'; this.t = 0; this.grains = []; this.arrived = []; this.resK = 1;
    this.lang = 'ro'; this.U = null; this.dep = new Float32Array(NB);
    // the Danube as a polyline with cumulative length (projected units)
    this.dan = this.path(B.river);
    this.damIdx = dams.map(d => this.nearestIdx(this.dan, [d[2], d[3]]));
    this.sDam = this.dan.S[this.damIdx[0]]; this.sRes = this.dan.S[this.nearestIdx(this.dan, RES_LL)];
    this.tribs = tributaries.map(T => {
      const p = this.path(T.ll), end = T.ll[T.ll.length - 1], join = this.nearestIdx(this.dan, end);
      return { T, p, join, low: this.dan.S[join] > this.sDam };
    });
  }
  prj(ll) { return [(ll[0] - LON0) * KX, (LAT1 - ll[1])]; }
  path(lls) {
    const P = lls.map(ll => this.prj(ll)), S = [0];
    for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { P, S, L: S[S.length - 1] };
  }
  nearestIdx(path, ll) { const q = this.prj(ll); let b = 0, bd = 1e9; path.P.forEach((p, i) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }
  at(path, s) {
    const S = path.S; let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const f = clamp((s - S[lo]) / Math.max(1e-6, S[hi] - S[lo]), 0, 1);
    return [path.P[lo][0] + (path.P[hi][0] - path.P[lo][0]) * f, path.P[lo][1] + (path.P[hi][1] - path.P[lo][1]) * f];
  }
  setLang(l, U) { this.lang = l; this.U = U; }
  setMode(m) { this.mode = m; }
  fit() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr); this.dpr = dpr;
    this.sc = Math.max(0.6, this.cv.width / 860);                    // drawing scale: the panel is ~860 px wide on a 1920 px screen
    const w = (LON1 - LON0) * KX, h = LAT1 - LAT0, pad = 0.04;
    this.k = Math.min(this.cv.width * (1 - 2 * pad) / w, this.cv.height * (1 - 2 * pad) / h);
    this.ox = (this.cv.width - w * this.k) / 2; this.oy = (this.cv.height - h * this.k) / 2;
  }
  X(p) { return this.ox + p[0] * this.k; } Y(p) { return this.oy + p[1] * this.k; }
  spawn() {
    // a grain starts on a tributary (its share by length) or on the upper Danube
    if (Math.random() < 0.45) {
      const T = this.tribs[(Math.random() * this.tribs.length) | 0];
      if (T.low && this.mode !== 'before' && Math.random() > LOW) return;
      this.grains.push({ on: T, s: Math.random() * T.p.L * 0.4, v: 0.9 + Math.random() * 0.5 });
    } else this.grains.push({ on: null, s: Math.random() * this.sRes * 0.9, v: 0.9 + Math.random() * 0.5 });
  }
  update(dt) {
    if (!this.on) return;
    if (this.cv.width < 4 || Math.abs(this.cv.getBoundingClientRect().width * this.dpr - this.cv.width) > 2) this.fit();   // laid out late / resized
    if (this.cv.width < 4) return;
    this.t += dt;
    const before = this.mode === 'before', rate = 34, sRes = this.sRes, sDam = this.sDam;
    this.resK = clamp(this.resK + (before ? -dt : dt) / 0.8, 0, 1);
    this.acc = (this.acc || 0) + dt * rate;
    while (this.acc >= 1) { this.acc -= 1; if (this.grains.length < 700) this.spawn(); }
    for (const g of this.grains) {
      if (g.dead) continue;
      if (g.settled != null) {                       // lying on the reservoir floor: fades into the deposit
        if (this.t - g.settled > 1.6) { g.dead = true; const b = clamp(Math.floor((g.s - sRes) / (sDam - sRes) * NB), 0, NB - 1); this.dep[b] += 1; }
        continue;
      }
      const inRes = !g.on && g.s > sRes && g.s < sDam;
      g.s += dt * 2.4 * g.v * (inRes ? 1 - 0.6 * this.resK : 1);      // the lake: still water, the grains slow down
      if (g.on) { if (g.s >= g.on.p.L) { g.s = this.dan.S[g.on.join]; g.on = null; g.seen = g.s > sRes; } continue; }
      if (!g.seen && g.s >= sRes) {
        g.seen = true;
        if (!before && g.s < sDam && Math.random() < TRAP) g.stop = sRes + (sDam - sRes) * (0.15 + 0.85 * Math.pow(Math.random(), 0.7));
      }
      if (g.stop != null && g.s >= g.stop) {
        if (before) g.stop = null; else { g.s = g.stop; g.settled = this.t; continue; }
      }
      if (g.s >= this.dan.L) { g.dead = true; this.arrived.push(this.t); }
    }
    this.grains = this.grains.filter(g => !g.dead);
    this.arrived = this.arrived.filter(t => this.t - t < 4);
    const e = Math.exp(-dt * (before ? 1.2 : 0.03));
    for (let b = 0; b < NB; b++) this.dep[b] *= e;
    this.draw();
  }
  draw() {
    const g = this.g, U = this.U, s = this.sc, sRes = this.sRes, sDam = this.sDam, rk = this.resK;
    g.clearRect(0, 0, this.cv.width, this.cv.height);
    const line = (path, s0, s1) => { g.beginPath(); const n = 24; for (let i = 0; i <= n; i++) { const p = this.at(path, s0 + (s1 - s0) * i / n); i ? g.lineTo(this.X(p), this.Y(p)) : g.moveTo(this.X(p), this.Y(p)); } };
    // basin
    g.beginPath(); this.B.outline.forEach((ll, i) => { const p = this.prj(ll); i ? g.lineTo(this.X(p), this.Y(p)) : g.moveTo(this.X(p), this.Y(p)); }); g.closePath();
    g.fillStyle = 'rgba(111,178,232,0.08)'; g.fill(); g.strokeStyle = 'rgba(150,200,240,0.45)'; g.lineWidth = 1.5 * s; g.stroke();
    // rivers
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const T of this.tribs) { g.beginPath(); T.p.P.forEach((p, i) => i ? g.lineTo(this.X(p), this.Y(p)) : g.moveTo(this.X(p), this.Y(p))); g.strokeStyle = 'rgba(120,190,240,0.55)'; g.lineWidth = 1.6 * s; g.stroke(); }
    g.beginPath(); this.dan.P.forEach((p, i) => i ? g.lineTo(this.X(p), this.Y(p)) : g.moveTo(this.X(p), this.Y(p))); g.strokeStyle = 'rgba(140,205,250,0.95)'; g.lineWidth = 3.2 * s; g.stroke();
    // the reservoir (today): a wide lake from Baziaș to the dam, filling with a golden deposit
    if (rk > 0.01) {
      line(this.dan, sRes, sDam); g.strokeStyle = `rgba(70,150,215,${0.3 * rk})`; g.lineWidth = 22 * s; g.stroke();
      g.strokeStyle = `rgba(80,165,230,${0.8 * rk})`; g.lineWidth = 12 * s; g.stroke();
      for (let b = 0; b < NB; b++) {
        const k = clamp(this.dep[b] / 10, 0, 1) * rk; if (k < 0.02) continue;
        line(this.dan, sRes + (sDam - sRes) * b / NB, sRes + (sDam - sRes) * (b + 1.05) / NB);
        g.strokeStyle = `rgba(226,168,72,${0.25 + 0.7 * k})`; g.lineWidth = (3 + 6 * k) * s; g.stroke();
      }
    }
    // grains (settled ones lie still and fade)
    for (const gr of this.grains) {
      const p = gr.on ? this.at(gr.on.p, gr.s) : this.at(this.dan, gr.s), a = gr.settled != null ? clamp(1 - (this.t - gr.settled) / 1.6, 0, 1) : 1;
      g.fillStyle = gr.settled != null ? `rgba(240,180,80,${0.9 * a})` : 'rgba(255,200,90,0.95)';
      g.beginPath(); g.arc(this.X(p), this.Y(p), (gr.settled != null ? 2.6 : 2.3) * s, 0, 6.283); g.fill();
    }
    // dams (faded "before": not built yet), labels to the right, away from the lake
    const fs = Math.round(13 * s);
    g.font = `600 ${fs}px "Segoe UI",system-ui,sans-serif`; g.textBaseline = 'middle';
    this.dams.forEach((d, i) => {
      const p = this.prj([d[2], d[3]]), x = this.X(p), y = this.Y(p);
      g.globalAlpha = 0.35 + 0.65 * rk;
      g.fillStyle = '#fff'; g.strokeStyle = '#060d17'; g.lineWidth = 3 * s;
      g.beginPath(); g.rect(x - 5 * s, y - 9 * s, 10 * s, 18 * s); g.fill(); g.stroke();
      const lbl = (this.lang === 'ro' ? d[0] : d[1]) + ' · ' + d[4], tw = g.measureText(lbl).width, lx = x + 10 * s, ly = y + (i ? 16 : -16) * s;
      g.fillStyle = 'rgba(6,13,23,0.78)'; g.fillRect(lx - 4 * s, ly - fs * 0.75, tw + 8 * s, fs * 1.5);
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(lbl, lx, ly);
      g.globalAlpha = 1;
    });
    // the callout over the lake: "sediment stops here"
    if (rk > 0.01 && U) {
      const m = this.at(this.dan, sRes + (sDam - sRes) * 0.55), mx = this.X(m), my = this.Y(m), pulse = 0.5 + 0.5 * Math.sin(this.t * 3.2);
      const f2 = Math.round(15 * s); g.font = `700 ${f2}px "Segoe UI",system-ui,sans-serif`;
      const txt = U.stopHere, tw = g.measureText(txt).width, bw = tw + 22 * s, bh = f2 * 2, bx = mx - bw / 2, by = my - 64 * s - bh;
      g.globalAlpha = rk;
      g.strokeStyle = '#e8c170'; g.lineWidth = 2 * s;
      g.beginPath(); g.moveTo(mx, by + bh); g.lineTo(mx, my - 9 * s); g.stroke();
      g.fillStyle = '#e8c170'; g.beginPath(); g.moveTo(mx, my - 3 * s); g.lineTo(mx - 6 * s, my - 13 * s); g.lineTo(mx + 6 * s, my - 13 * s); g.closePath(); g.fill();
      g.fillStyle = 'rgba(6,13,23,0.9)'; g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2); g.fill();
      g.strokeStyle = `rgba(232,193,112,${0.55 + 0.45 * pulse})`; g.lineWidth = (2 + 1.5 * pulse) * s; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(txt, mx, by + bh / 2 + 1);
      g.globalAlpha = 1;
    }
    // the mouth: pulses with every grain that arrives
    g.font = `600 ${fs}px "Segoe UI",system-ui,sans-serif`;
    const mo = this.prj(this.mouth), mx = this.X(mo), my = this.Y(mo), n = this.arrived.length;
    g.fillStyle = 'rgba(232,193,112,0.25)'; g.beginPath(); g.arc(mx, my, (8 + Math.min(18, n * 0.9)) * s, 0, 6.283); g.fill();
    g.fillStyle = '#e8c170'; g.beginPath(); g.arc(mx, my, 6 * s, 0, 6.283); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(U ? U.mouth : '', mx + 8 * s, my - 30 * s);
  }
}

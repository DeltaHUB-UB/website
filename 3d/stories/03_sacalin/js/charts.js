// Dinamica Sacalinului — the chart column: three small SVG charts that follow the story year.
// len: length of the spit · ret: shoreline retreat over storm power (two stacked panels, same years, no dual axis)
// wid: width of the central barrier (the breach cycle).
// Touch / drag on a chart reads the values under the finger for a few seconds, then it follows the story again.
const NS = 'http://www.w3.org/2000/svg';
const W = 600, L = 46, R = 588;
const C = { line: '#e8c170', bar: '#6fb2e8', storm: '#f2855a', surf: '#0b1622' };   // storm energy: warm coral, apart from the blue retreat bars

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const lerp = (a, b, t) => a + (b - a) * t;
function interp(pts, x) {                       // pts [[x, y], …] ascending x → y (null outside)
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
  for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    return x1 === x0 ? y1 : lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return pts[pts.length - 1][1];
}
const path = (pts, F) => pts.map((p, i) => (i ? 'L' : 'M') + F.X(p[0]).toFixed(1) + ',' + F.Y(p[1]).toFixed(1)).join('');

export class Chart {
  // box: the .chart element (holds .ctit, .cunit, .cval and the svg); tab: len | ret | wid
  constructor(box, tab, data) {
    this.box = box; this.tab = tab; this.D = data;
    this.svg = box.querySelector('svg'); this.tit = box.querySelector('.ctit'); this.unit = box.querySelector('.cunit'); this.val = box.querySelector('.cval');
    this.H = +this.svg.getAttribute('viewBox').split(' ')[3];
    this.year = 1890; this.peek = null; this.peekT = 0; this.lang = 'ro'; this.U = null;
    const pick = e => { const r = this.svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W; this.peek = this.xYear ? this.xYear(x) : null; this.peekT = performance.now(); this.update(this.year); };
    this.svg.addEventListener('pointerdown', e => { e.stopPropagation(); this.svg.setPointerCapture(e.pointerId); pick(e); });
    this.svg.addEventListener('pointermove', e => { if (e.buttons) pick(e); });
  }
  setLang(lang, U) { this.lang = lang; this.U = U; this.draw(); }
  setActive(on) { this.box.classList.toggle('on', on); }
  fmt(v, d = 1) { return v.toFixed(d).replace('.', this.lang === 'ro' ? ',' : '.'); }
  frame(x0, x1, y0, y1, top, bot, yTicks, fmtY) {
    const X = x => L + (x - x0) / (x1 - x0) * (R - L), Y = y => bot - (y - y0) / (y1 - y0) * (bot - top);
    for (const t of yTicks) {
      el('line', { x1: L, x2: R, y1: Y(t), y2: Y(t), class: t === y0 ? 'ax' : 'grid' }, this.svg);
      const tx = el('text', { x: L - 8, y: Y(t) + 5, 'text-anchor': 'end' }, this.svg); tx.textContent = fmtY ? fmtY(t) : t;
    }
    return { X, Y };
  }
  xAxis(X, years) {
    for (const t of years) { const tx = el('text', { x: X(t), y: this.H - 6, 'text-anchor': 'middle' }, this.svg); tx.textContent = t; }
  }
  // ---------------------------------------------------------------- draw (static part, once per language)
  draw() {
    const s = this.svg, U = this.U, D = this.D; s.innerHTML = '';
    const T = U.chart[this.tab]; this.tit.textContent = T.t; this.unit.textContent = T.u;
    const top = 12, bot = this.H - 30;
    if (this.tab === 'len') {
      const x0 = 1890, x1 = 2026, F = this.frame(x0, x1, 0, 22, top, bot, [0, 10, 20]);
      this.xAxis(F.X, [1900, 1925, 1950, 1975, 2000, 2025]);
      el('rect', { x: F.X(1984), y: top, width: F.X(x1) - F.X(1984), height: bot - top, fill: 'rgba(111,178,232,.07)' }, s);
      const lb = el('text', { x: F.X(1984) + 6, y: top + 16, class: 'lab' }, s); lb.textContent = this.lang === 'ro' ? 'satelit' : 'satellite';
      const pts = D.length.years.map((y, i) => [y, D.length.km[i]]);
      const p = path(pts, F);
      el('path', { d: p + `L${F.X(pts[pts.length - 1][0])},${F.Y(0)}L${F.X(pts[0][0])},${F.Y(0)}Z`, fill: 'rgba(232,193,112,.10)' }, s);
      el('path', { d: p, fill: 'none', stroke: C.line, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, s);
      for (const q of pts) el('circle', { cx: F.X(q[0]), cy: F.Y(q[1]), r: 4.5, fill: C.line, stroke: C.surf, 'stroke-width': 2 }, s);
      // after the last digitised line: lengths measured automatically on the satellite medians (hollow markers)
      const LS = D.length_sat;
      if (LS && LS.years.length) {
        const sp = [pts[pts.length - 1]].concat(LS.years.map((y, i) => [y, LS.km[i]]));
        el('path', { d: path(sp, F), fill: 'none', stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0.8 }, s);
        for (const q of sp.slice(1)) el('circle', { cx: F.X(q[0]), cy: F.Y(q[1]), r: 4, fill: C.surf, stroke: C.line, 'stroke-width': 2 }, s);
        pts.push(...sp.slice(1));
      }
      this.series = { pts, F, x0, x1, top, bot };
    } else if (this.tab === 'ret') {
      const x0 = 1890, x1 = 2026, P = D.periods, mid = top + (bot - top) * 0.46;
      const A = this.frame(x0, x1, 0, 60, top, mid, [0, 30, 60]);
      const B = this.frame(x0, x1, 0, 0.7, mid + 38, bot, [0, 0.6], v => this.fmt(v));
      this.xAxis(A.X, [1900, 1925, 1950, 1975, 2000, 2025]);
      const lb = el('text', { x: L + 6, y: mid + 28, class: 'lab' }, s); lb.textContent = `${U.chart.ret.t2} · ${U.chart.ret.u2}`;
      this.bars = [];
      P.forEach((p, i) => {
        const r = D.retreat4km[i], w = D.pw3[i];
        if (r == null) return;
        const xa = A.X(p[0]) + 1, xb = A.X(p[1]) - 1;
        const b1 = el('rect', { x: xa, y: A.Y(r), width: xb - xa, height: A.Y(0) - A.Y(r), rx: 3, fill: C.bar }, s);
        const b2 = w == null ? null : el('rect', { x: xa, y: B.Y(w), width: xb - xa, height: B.Y(0) - B.Y(w), rx: 3, fill: C.storm }, s);
        this.bars.push({ p, r, w, b1, b2 });
      });
      this.series = { F: A, x0, x1, top, bot };
    } else {
      const x0 = 1966, x1 = 2016, F = this.frame(x0, x1, 0, 700, top, bot, [0, 300, 600]);
      this.xAxis(F.X, [1970, 1980, 1990, 2000, 2010]);
      const pts = D.width[2];
      el('path', { d: path(pts, F), fill: 'none', stroke: C.line, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, s);
      for (const q of pts) {
        const br = q[1] === 0;
        el('circle', { cx: F.X(q[0]), cy: F.Y(q[1]), r: br ? 7 : 4.5, fill: br ? '#fff' : C.line, stroke: C.surf, 'stroke-width': 2 }, s);
        if (br) { const t = el('text', { x: F.X(q[0]), y: F.Y(0) - 14, 'text-anchor': 'middle', class: 'tip' }, s); t.textContent = U.chart.wid.breach; }
      }
      this.series = { pts, F, x0, x1, top, bot };
    }
    this.xYear = x => Math.max(this.series.x0, Math.min(this.series.x1, this.series.x0 + (x - L) / (R - L) * (this.series.x1 - this.series.x0)));
    this.cur = el('line', { y1: top - 4, y2: bot, class: 'cur' }, s);
    this.dot = el('circle', { r: 7, fill: '#fff', stroke: C.surf, 'stroke-width': 2.5 }, s);
    this.update(this.year);
  }
  // ---------------------------------------------------------------- per frame: cursor + readout
  update(year) {
    this.year = year;
    if (!this.series) return;
    if (this.peek != null && performance.now() - this.peekT > 3500) this.peek = null;
    const y = this.peek != null ? this.peek : year, U = this.U, S = this.series, F = S.F;
    const inX = y >= S.x0 && y <= S.x1;
    this.cur.setAttribute('x1', F.X(y)); this.cur.setAttribute('x2', F.X(y)); this.cur.style.opacity = inX ? 1 : 0;
    let txt = '', dy = null;
    if (this.tab === 'len' || this.tab === 'wid') {
      const v = interp(S.pts, y);
      if (v != null) { dy = F.Y(v); txt = this.tab === 'len' ? `${this.fmt(v)} ${U.km}` : `${Math.round(v)} ${U.m}`; }
    } else {
      let hit = null;
      for (const b of this.bars) { const on = y >= b.p[0] && y < b.p[1]; if (on) hit = b; b.b1.style.opacity = on ? 1 : 0.5; if (b.b2) b.b2.style.opacity = on ? 1 : 0.5; }
      if (hit) txt = `${Math.round(hit.r)} ${U.mpy}`;
    }
    this.dot.style.opacity = dy != null && inX ? 1 : 0;
    if (dy != null) { this.dot.setAttribute('cx', F.X(y)); this.dot.setAttribute('cy', dy); }
    const label = (this.peek != null ? Math.round(y) + ' · ' : '') + (txt || '—');
    if (this.val.textContent !== label) this.val.textContent = label;
  }
}

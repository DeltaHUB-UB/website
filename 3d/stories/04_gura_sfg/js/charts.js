// Gura Sfântu Gheorghe — the chart column: the river (discharge), the sea (waves) and the score (volume change per survey interval).
// All three share the time axis 2004.5 → 2017.8; the part already "lived" is bright, the future is dim; a cursor follows the story.
// The score bars can be touched (onPeriod) at the stations that allow it.
const NS = 'http://www.w3.org/2000/svg';
const W = 600, L = 50, R = 590;
export const T0 = 2004.5, T1 = 2017.85;

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const X = t => L + (t - T0) / (T1 - T0) * (R - L);
let uid = 0;

export class Chart {
  // box: .chart element; tab: q | hs | dv; D: {tday[], q[], hs[], periods[], epochs[]}
  constructor(box, tab, D) {
    this.box = box; this.tab = tab; this.D = D; this.id = 'c' + (uid++);
    this.svg = box.querySelector('svg'); this.tit = box.querySelector('.ctit'); this.unit = box.querySelector('.cunit'); this.val = box.querySelector('.cval');
    this.H = +this.svg.getAttribute('viewBox').split(' ')[3];
    this.lang = 'ro'; this.t = T0; this.onPeriod = null; this.touch = false; this.focus = -1;
  }
  setLang(lang, U) { this.lang = lang; this.U = U; this.draw(); }
  setActive(on) { this.box.classList.toggle('on', on); }
  setTouch(on) { this.touch = on; this.box.classList.toggle('touch', on); }
  fmt(v, d = 1) { return v.toFixed(d).replace('.', this.lang === 'ro' ? ',' : '.'); }
  fmtInt(v) { return Math.round(v).toLocaleString(this.lang === 'ro' ? 'ro-RO' : 'en-GB'); }
  // weekly maxima → path points
  weekly(arr) {
    const D = this.D, out = [];
    for (let i = 0; i < arr.length; i += 7) { let m = -1e9; for (let k = i; k < Math.min(arr.length, i + 7); k++) m = Math.max(m, arr[k]); out.push([D.tday[Math.min(arr.length - 1, i + 3)], m]); }
    return out;
  }
  draw() {
    const s = this.svg, U = this.U, D = this.D; s.innerHTML = '';
    const T = U.chart[this.tab]; this.tit.textContent = T.t; this.unit.textContent = T.u;
    const top = 10, bot = this.H - 28;
    const defs = el('defs', {}, s);
    const cp = el('clipPath', { id: this.id + 'p' }, defs); this.clip = el('rect', { x: 0, y: 0, width: X(T0), height: this.H }, cp);
    const grid = (y0, y1, ticks, f) => {
      const Y = y => bot - (y - y0) / (y1 - y0) * (bot - top);
      for (const t of ticks) { el('line', { x1: L, x2: R, y1: Y(t), y2: Y(t), class: t === 0 ? 'ax' : 'grid' }, s); const tx = el('text', { x: L - 8, y: Y(t) + 5, 'text-anchor': 'end' }, s); tx.textContent = f ? f(t) : t; }
      return Y;
    };
    for (const y of [2006, 2009, 2012, 2015]) { const tx = el('text', { x: X(y), y: this.H - 6, 'text-anchor': 'middle' }, s); tx.textContent = y; }
    // survey dates: small ticks on the time axis
    for (const e of D.epochs) el('line', { x1: X(e.t), x2: X(e.t), y1: bot, y2: bot + 6, class: 'srv' }, s);
    if (this.tab === 'q' || this.tab === 'hs') {
      const isQ = this.tab === 'q', arr = isQ ? D.q : D.hs, y1 = isQ ? 4200 : 7, thr = isQ ? 2200 : 2.5;
      const Y = grid(0, y1, isQ ? [0, 2000, 4000] : [0, 2, 4, 6], isQ ? (v => v ? (v / 1000) + 'k' : '0') : null);
      const pts = this.weekly(arr), line = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(Math.min(y1, p[1])).toFixed(1)).join('');
      const area = line + `L${X(pts[pts.length - 1][0]).toFixed(1)},${bot}L${X(pts[0][0]).toFixed(1)},${bot}Z`;
      const col = isQ ? '#e8c170' : '#6fb2e8';
      // above the threshold: the "attack" (flood) or "strike" (storm) moments
      const cpt = el('clipPath', { id: this.id + 't' }, defs); el('rect', { x: 0, y: 0, width: W, height: Y(thr) }, cpt);
      const gDim = el('g', { opacity: 0.28 }, s);
      el('path', { d: area, fill: col, 'fill-opacity': 0.25 }, gDim); el('path', { d: line, fill: 'none', stroke: col, 'stroke-width': 1.5 }, gDim);
      const gOn = el('g', { 'clip-path': `url(#${this.id}p)` }, s);
      el('path', { d: area, fill: col, 'fill-opacity': 0.18 }, gOn);
      el('path', { d: area, fill: col, 'fill-opacity': 0.75, 'clip-path': `url(#${this.id}t)` }, gOn);
      el('path', { d: line, fill: 'none', stroke: col, 'stroke-width': 1.8 }, gOn);
      el('line', { x1: L, x2: R, y1: Y(thr), y2: Y(thr), stroke: '#fff', 'stroke-opacity': 0.5, 'stroke-dasharray': '6 5', 'stroke-width': 1.2 }, s);
    } else {
      const P = D.periods, cum = [0]; P.forEach((p, i) => cum.push(cum[i] + p.dv));
      const y0 = -7, y1 = 8, Y = grid(y0, y1, [-6, -3, 0, 3, 6]);
      this.bars = [];
      const gDim = el('g', { opacity: 0.3 }, s), gOn = el('g', { 'clip-path': `url(#${this.id}p)` }, s);
      P.forEach((p, i) => {
        const xa = X(D.epochs[i].t) + 1.5, xb = X(D.epochs[i + 1].t) - 1.5, y = Y(Math.max(0, p.dv)), h = Math.abs(Y(p.dv) - Y(0));
        const col = p.dv >= 0 ? '#f2b33d' : '#e8452e';
        el('rect', { x: xa, y, width: Math.max(2, xb - xa), height: Math.max(1, h), fill: col }, gDim);
        const r = el('rect', { x: xa, y, width: Math.max(2, xb - xa), height: Math.max(1, h), fill: col, class: 'bar' }, gOn);
        // generous touch target over the whole column
        const hit = el('rect', { x: xa - 3, y: top, width: Math.max(14, xb - xa + 6), height: bot - top, fill: 'transparent', class: 'hit' }, s);
        hit.addEventListener('pointerdown', e => { if (!this.touch || !this.onPeriod) return; e.stopPropagation(); this.onPeriod(i); });
        this.bars.push(r);
      });
      const line = cum.map((v, i) => (i ? 'L' : 'M') + X(D.epochs[i].t).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
      el('path', { d: line, fill: 'none', stroke: '#fff', 'stroke-width': 1.6, 'stroke-dasharray': '3 4' }, gDim);
      el('path', { d: line, fill: 'none', stroke: '#fff', 'stroke-width': 2.2 }, gOn);
      const lb = el('text', { x: R - 4, y: top + 14, 'text-anchor': 'end', class: 'lab' }, s); lb.textContent = this.lang === 'ro' ? '— cumulat din 2004' : '— total since 2004';
      this.cum = cum;
      this.focusRect = el('rect', { x: 0, y: top, width: 0, height: bot - top, fill: 'none', stroke: '#fff', 'stroke-width': 2, rx: 4, opacity: 0 }, s);
    }
    this.cur = el('line', { x1: X(T0), x2: X(T0), y1: top, y2: bot, class: 'cur' }, s);
    this.setFocus(this.focus);
    this.update(this.t, this.extra);
  }
  setFocus(i) {
    this.focus = i;
    if (!this.focusRect) return;
    if (i < 0) { this.focusRect.setAttribute('opacity', 0); return; }
    const D = this.D, xa = X(D.epochs[i].t) - 2, xb = X(D.epochs[i + 1].t) + 2;
    this.focusRect.setAttribute('x', xa); this.focusRect.setAttribute('width', xb - xa); this.focusRect.setAttribute('opacity', 0.9);
  }
  // t: decimal year; extra: { q, hs, cum } current values
  update(t, extra) {
    this.t = t; this.extra = extra;
    if (!this.cur) return;
    const x = X(Math.min(T1, Math.max(T0, t)));
    this.cur.setAttribute('x1', x); this.cur.setAttribute('x2', x); this.clip.setAttribute('width', x);
    if (!extra) return;
    const U = this.U;
    let txt = '';
    if (this.tab === 'q') txt = this.fmtInt(extra.q) + ' m³/s';
    else if (this.tab === 'hs') txt = this.fmt(extra.hs) + ' m';
    else txt = (extra.cum >= 0 ? '+' : '−') + this.fmt(Math.abs(extra.cum)) + ' ' + U.mil;
    if (this.val.textContent !== txt) this.val.textContent = txt;
  }
}

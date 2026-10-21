// DELTA-Hub — "bubbles": pulsing hotspots placed in screen space by the story each frame; tap → info sheet.
// Usage: const B = new Bubbles(); B.set([{id, label, title, body, kicker?, src?}]); every frame B.place(id, x, y, visible);
// Until a visitor has opened one bubble (per visit: the main screen clears 'dh_bubok'), the first visible bubble
// carries a tapping hand and a "touch here" tag.
import { ICON, getLang, onLang, store, isPhone } from './kiosk.js';

const CSS = `
#dh-bubbles{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:6}
.bub{position:absolute;left:0;top:0;width:calc(var(--u)*4);height:calc(var(--u)*4);margin:calc(var(--u)*-2) 0 0 calc(var(--u)*-2);
  pointer-events:auto;opacity:0;transform:scale(.2);transition:opacity .45s,transform .7s cubic-bezier(.34,1.7,.5,1);display:grid;place-items:center;cursor:pointer}
.bub.on{opacity:1;transform:scale(1)}
.bub i{width:50%;height:50%;border-radius:50%;background:radial-gradient(circle at 38% 34%,#fff3cf 0,#f1cd7e 38%,#d9a441 100%);position:relative;z-index:2;
  box-shadow:0 0 0 calc(var(--u)*.22) rgba(6,13,23,.6),0 0 calc(var(--u)*1.4) rgba(255,205,110,.95),0 0 calc(var(--u)*3) rgba(255,190,80,.45);
  animation:bubbeat 1.7s ease-in-out infinite}
.bub i::after{content:'+';position:absolute;inset:0;display:grid;place-items:center;color:#1a1206;font-weight:800;font-size:calc(var(--u)*1.25);line-height:1}
@keyframes bubbeat{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}
.bub::before,.bub::after{content:'';position:absolute;inset:22%;border-radius:50%;border:calc(var(--u)*.16) solid rgba(255,208,120,.95);animation:bubring 2.2s cubic-bezier(.2,.6,.3,1) infinite}
.bub::after{animation-delay:1.1s}
@keyframes bubring{0%{transform:scale(.7);opacity:1}100%{transform:scale(2.3);opacity:0}}
.bub b{position:absolute;left:88%;top:50%;transform:translate(calc(var(--u)*-.8),-50%);opacity:0;white-space:nowrap;font-size:calc(var(--u)*.92);font-weight:650;
  color:var(--ink,#eef4f8);background:rgba(6,13,23,.86);border:1px solid rgba(232,193,112,.55);padding:.3em .75em;border-radius:99px;
  box-shadow:0 2px 12px rgba(0,0,0,.4);transition:opacity .4s .25s,transform .5s .25s cubic-bezier(.2,.7,.2,1);z-index:1}
.bub.on b{opacity:1;transform:translate(0,-50%)}
.bub.open i{background:#fff;animation:none}
.bub.open::before,.bub.open::after{animation:none;opacity:0}
.bub .hint{position:absolute;inset:0;display:none;pointer-events:none;z-index:3}
.bub.hint .hint{display:block}
.bub .hint span{position:absolute;left:50%;bottom:92%;transform:translateX(-50%);white-space:nowrap;font-size:calc(var(--u)*1.0);font-weight:700;color:#fff;
  background:#d8392b;padding:.3em .85em;border-radius:99px;box-shadow:0 4px 16px rgba(0,0,0,.45);animation:bubhb 1.1s ease-in-out infinite}
.bub .hint svg{position:absolute;right:58%;top:58%;width:calc(var(--u)*3.2);height:calc(var(--u)*3.2);
  filter:drop-shadow(0 3px 6px rgba(0,0,0,.55));animation:bubtap 1.1s ease-in-out infinite}
@keyframes bubhb{0%,100%{transform:translate(-50%,calc(var(--u)*-.5))}50%{transform:translate(-50%,calc(var(--u)*-.1))}}
@keyframes bubtap{0%,100%{transform:translate(calc(var(--u)*-.5),calc(var(--u)*.6)) rotate(28deg)}50%{transform:translate(0,0) rotate(28deg) scale(.92)}}
#dh-sheet{position:fixed;z-index:15;width:calc(var(--u)*27);max-width:44vw;padding:calc(var(--u)*1.3) calc(var(--u)*1.5) calc(var(--u)*1.4);
  opacity:0;pointer-events:none;transform:translateY(10px) scale(.98);transition:opacity .35s,transform .35s cubic-bezier(.2,.7,.2,1);
  background:rgba(8,16,27,.86);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(232,193,112,.4);
  border-radius:calc(var(--u)*.9);color:var(--ink,#eef4f8);font-family:"Segoe UI",system-ui,sans-serif}
#dh-sheet.on{opacity:1;pointer-events:auto;transform:none}
#dh-sheet h4{margin:0 0 .45em;font-size:calc(var(--u)*1.35);font-weight:650;line-height:1.15;padding-right:2.2em}
#dh-sheet p{margin:0;font-size:calc(var(--u)*.98);line-height:1.5;color:var(--ink2,#b8c8d6)}
#dh-sheet .k{font-size:calc(var(--u)*.72);letter-spacing:.18em;text-transform:uppercase;color:var(--sand,#e8c170);font-weight:600;margin-bottom:.4em}
#dh-sheet .x{position:absolute;right:calc(var(--u)*.6);top:calc(var(--u)*.6);width:calc(var(--u)*2.8);height:calc(var(--u)*2.8);min-width:0;
  display:grid;place-items:center;border-radius:calc(var(--u)*.75);background:rgba(255,255,255,.07);border:0;color:inherit;cursor:pointer;padding:0}
#dh-sheet .x svg{width:48%;height:48%;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
#dh-sheet .src{margin-top:.8em;font-size:calc(var(--u)*.72);color:var(--ink3,#7f95a8)}
#dh-sheet.photo{width:calc(var(--u)*34);max-width:50vw}
#dh-sheet.photo .x{z-index:3;background:rgba(6,13,23,.72);color:#fff;top:calc(var(--u)*1.0);right:calc(var(--u)*1.0)}
#dh-sheet .ph{display:none;margin:calc(var(--u)*-.2) 0 calc(var(--u)*.9);border-radius:calc(var(--u)*.6);overflow:hidden;position:relative;cursor:zoom-in}
#dh-sheet.photo .ph{display:block}
#dh-sheet .ph img{display:block;width:100%;height:auto;max-height:42vh;object-fit:cover}
#dh-sheet .ph span{position:absolute;right:.6em;bottom:.5em;font-size:calc(var(--u)*.62);color:#fff;background:rgba(0,0,0,.45);padding:.15em .6em;border-radius:99px}
#dh-lbox{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(2,5,12,.88);opacity:0;pointer-events:none;transition:opacity .35s;cursor:zoom-out}
#dh-lbox.on{opacity:1;pointer-events:auto}
#dh-lbox figure{margin:0;max-width:92vw;max-height:88vh;text-align:center}
#dh-lbox img{max-width:92vw;max-height:82vh;border-radius:calc(var(--u)*.6);box-shadow:0 20px 80px rgba(0,0,0,.6)}
#dh-lbox figcaption{margin-top:.8em;font-size:calc(var(--u)*.85);color:#cfdbe6;font-family:"Segoe UI",system-ui,sans-serif}
body.clean #dh-bubbles,body.rendering #dh-bubbles{display:none!important}
@media (max-width:820px), (max-height:500px){#dh-sheet,#dh-sheet.photo{left:8px!important;right:8px;width:auto;max-width:none;bottom:96px;top:auto!important;max-height:calc(100vh - 150px);overflow:auto}
  #dh-sheet .ph img{max-height:28vh}}
@media (max-height:500px){#dh-sheet,#dh-sheet.photo{left:auto!important;right:8px;width:min(60vw,420px);bottom:8px;max-height:calc(100vh - 16px)}}
`;
const HAND = '<svg viewBox="0 0 64 64"><path d="M23 17v22l-5-5c-2-2-5-2-6.5 0s-1 4.5.5 6l12 13c2 2 4.5 3 7.5 3h8c6 0 10-4.5 10-10V32c0-2-1.5-3.5-3.5-3.5S43 30 43 32v-2c0-2-1.5-3.5-3.5-3.5S36 28 36 30v-1.5c0-2-1.5-3.5-3.5-3.5S29 26.5 29 28.5V17c0-2-1.5-3.5-3-3.5S23 15 23 17z" fill="#fff" stroke="#1a1206" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const HINT = { ro: 'Atinge aici', en: 'Touch here' };
let cssOn = false;

export class Bubbles {
  constructor() {
    if (!cssOn) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); cssOn = true; }
    this.layer = document.getElementById('dh-bubbles') || Object.assign(document.createElement('div'), { id: 'dh-bubbles' });
    if (!this.layer.parentNode) document.body.appendChild(this.layer);
    this.sheet = document.createElement('div'); this.sheet.id = 'dh-sheet';
    this.sheet.innerHTML = `<div class="ph"><img alt=""><span></span></div><div class="k"></div><h4></h4><p></p><div class="src"></div><button class="x" aria-label="close">${ICON.close}</button>`;
    // a photo in the sheet opens full screen; any touch closes it
    this.lbox = document.createElement('div'); this.lbox.id = 'dh-lbox'; this.lbox.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(this.lbox);
    this.lbox.addEventListener('pointerdown', e => { e.stopPropagation(); this.lbox.classList.remove('on'); }, true);
    this.sheet.querySelector('.ph img').addEventListener('load', () => { if (this.openId) this.position(); });   // taller once the photo is in
    this.sheet.querySelector('.ph').addEventListener('click', e => {
      e.stopPropagation(); const d = this.openId && this.items.get(this.openId).d; if (!d || !d.img) return;
      this.lbox.querySelector('img').src = d.img; this.lbox.querySelector('figcaption').textContent = (d.imgCap ? d.imgCap + ' · ' : '') + (d.credit || '');
      this.lbox.classList.add('on');
    });
    document.body.appendChild(this.sheet);
    this.sheet.querySelector('.x').onclick = e => { e.stopPropagation(); this.close(); };
    this.items = new Map(); this.openId = null; this.hintId = null;
    this.tapped = store.get('dh_bubok') === '1';
    addEventListener('pointerdown', e => { if (this.openId && !this.sheet.contains(e.target) && !e.target.closest('.bub') && !(this.lbox && this.lbox.contains(e.target))) this.close(); }, true);
    onLang(() => { for (const it of this.items.values()) { const h = it.el.querySelector('.hint span'); if (h) h.textContent = HINT[getLang()]; } });
  }
  set(list) {
    this.close();
    for (const it of this.items.values()) it.el.remove();
    this.items.clear(); this.hintId = null;
    list.forEach((d, k) => {
      const el = document.createElement('div'); el.className = 'bub';
      el.style.transitionDelay = (k * 0.14).toFixed(2) + 's';          // pop in one after another
      el.innerHTML = `<i></i>${d.label ? `<b>${d.label}</b>` : ''}<div class="hint"><span>${HINT[getLang()]}</span>${HAND}</div>`;
      el.addEventListener('pointerdown', e => { e.stopPropagation(); this.openId === d.id ? this.close() : this.open(d.id); });
      this.layer.appendChild(el);
      this.items.set(d.id, { d, el, x: -1e4, y: -1e4, on: false });
    });
  }
  place(id, x, y, visible) {
    const it = this.items.get(id); if (!it) return;
    if (visible) { it.x = x; it.y = y; it.el.style.left = x.toFixed(1) + 'px'; it.el.style.top = y.toFixed(1) + 'px'; }
    if (visible !== it.on) { it.on = visible; it.el.classList.toggle('on', visible); if (!visible && this.openId === id) this.close(); this.updateHint(); }
    if (this.openId === id) this.position();
  }
  updateHint() {                     // the first visible bubble shows the hand until the visitor has opened one
    let want = null;
    if (!this.tapped && !this.openId) {               // a bubble flagged hint:true gets it when visible, else the first one
      for (const [id, it] of this.items) if (it.on && it.d.hint) { want = id; break; }
      if (!want) for (const [id, it] of this.items) if (it.on) { want = id; break; }
    }
    if (want === this.hintId) return;
    if (this.hintId && this.items.get(this.hintId)) this.items.get(this.hintId).el.classList.remove('hint');
    this.hintId = want;
    if (want) this.items.get(want).el.classList.add('hint');
  }
  hideAll() { for (const id of this.items.keys()) this.place(id, 0, 0, false); }      // fade out (e.g. while travelling)
  visible() { return [...this.items.values()].filter(it => it.on); }                    // [{d, x, y}] currently shown
  open(id) {
    const it = this.items.get(id); if (!it) return;
    if (this.openId) this.items.get(this.openId)?.el.classList.remove('open');
    this.openId = id; it.el.classList.add('open');
    if (!this.tapped) { this.tapped = true; store.set('dh_bubok', '1'); }
    this.updateHint();
    const s = this.sheet, d = it.d;
    s.querySelector('.k').textContent = d.kicker || ''; s.querySelector('.k').style.display = d.kicker ? '' : 'none';
    s.querySelector('h4').textContent = d.title; s.querySelector('p').textContent = d.body;
    s.querySelector('.src').textContent = d.src || ''; s.querySelector('.src').style.display = d.src ? '' : 'none';
    s.classList.toggle('photo', !!d.img);                // optional photo: d.img (url), d.imgCap, d.credit
    if (d.img) { s.querySelector('.ph img').src = d.img; s.querySelector('.ph span').textContent = d.credit || ''; }
    this.position(); s.classList.add('on');
    this.onopen && this.onopen(id);
  }
  close() {
    if (this.openId) this.items.get(this.openId)?.el.classList.remove('open');
    this.openId = null; this.sheet.classList.remove('on');
  }
  position() {                       // next to the bubble, on the side with more room, kept on screen and above the bottom bar
    if (isPhone()) return;           // phones: a bottom sheet (CSS)
    const it = this.items.get(this.openId), s = this.sheet, r = s.getBoundingClientRect();
    const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 16;
    const gap = u * 2.6, w = r.width, h = r.height, W = innerWidth, H = innerHeight - u * 6.5;
    let x = it.x > W * 0.55 ? it.x - gap - w : it.x + gap;
    let y = it.y - h * 0.35;
    x = Math.max(u, Math.min(W - w - u, x)); y = Math.max(u * 6, Math.min(H - h, y));
    s.style.left = x + 'px'; s.style.top = y + 'px';
  }
  get isOpen() { return !!this.openId; }
}

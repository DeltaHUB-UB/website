// DELTA-Hub 3D Experience — kiosk layer shared by the hub and every story:
// language, idle return ("are you still here?" popup), page transitions with a loading message, touch guards, copyright line.
// Kiosk mode is switched on by ?kiosk=1 (start_kiosk.bat) and remembered for the browser tab.
// The pages do not all load ui.css (Delta vie is one self-contained file), so the overlays below bring their own CSS.
import { EXPO } from './config.js';
import { gpuInfo } from './gpu.js';

const Q = new URLSearchParams(location.search);
const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { } },
  del(k) { try { sessionStorage.removeItem(k); } catch { } }
};
export const store = ss;
if (Q.get('kiosk') === '1') ss.set('dh_kiosk', '1');
if (Q.get('kiosk') === '0') ss.set('dh_kiosk', '0');
export const KIOSK = ss.get('dh_kiosk') === '1';
// phones (portrait or landscape): CSS width <= 820 px or height <= 500 px. The 43" table (3840×2160) and any PC never match,
// so everything behind this query / isPhone() changes nothing on the big screens.
export const PHONE_MQ = '(max-width: 820px), (max-height: 500px)';
export const isPhone = () => matchMedia(PHONE_MQ).matches;

if (Q.get('scale')) EXPO.uiScale = parseFloat(Q.get('scale')) || 1;
document.documentElement.style.setProperty('--uiScale', EXPO.uiScale);

/* ---- language */
let lang = (Q.get('lang') === 'en' || Q.get('lang') === 'ro') ? Q.get('lang') : (ss.get('dh_lang') || EXPO.lang);
const langCbs = [];
ss.set('dh_lang', lang);
export const getLang = () => lang;
export function setLang(l) { lang = l; ss.set('dh_lang', l); document.documentElement.lang = l; langCbs.forEach(f => f(l)); }
export function toggleLang() { setLang(lang === 'ro' ? 'en' : 'ro'); }
export function onLang(f) { langCbs.push(f); }
export function resetLang() { if (lang !== EXPO.lang) setLang(EXPO.lang); }
document.documentElement.lang = lang;
const TX = {
  ro: { load: 'Se încarcă…', still: 'Mai ești aici?', keep: 'Atinge ecranul ca să continui.', back: s => `Revenim la ecranul principal în ${s} s`,
        copy: '© DELTA-Hub & Water Lab · Universitatea din București · date și modele protejate — reutilizarea doar cu acord',
        soft: 'Browserul desenează 3D-ul fără placa video, așa că totul va merge greu. Pornește accelerarea grafică (Chrome / Edge: Setări → Sistem) și repornește browserul. Dacă e deja pornită, actualizează driverul plăcii video.',
        nogl: 'Browserul nu poate desena 3D: WebGL e oprit. Pornește accelerarea grafică (Chrome / Edge: Setări → Sistem), repornește browserul sau încearcă alt browser.' },
  en: { load: 'Loading…', still: 'Still there?', keep: 'Touch the screen to keep going.', back: s => `Back to the main screen in ${s} s`,
        copy: '© DELTA-Hub & Water Lab · University of Bucharest · protected data and models — reuse only with permission',
        soft: 'Your browser is drawing the 3D without the graphics card, so everything will be slow. Turn on graphics acceleration (Chrome / Edge: Settings → System) and restart the browser. If it is already on, update the graphics driver.',
        nogl: 'Your browser cannot draw 3D: WebGL is turned off. Turn on graphics acceleration (Chrome / Edge: Settings → System), restart the browser or try another one.' }
};

/* ---- CSS for the shared overlays (fade + loading message, idle popup, copyright line) */
const CSS = `
#dh-fade{position:fixed;inset:0;background:#060d17;z-index:100;opacity:1;pointer-events:none;transition:opacity .6s ease;display:grid;place-items:center}
body.dh-in #dh-fade{opacity:0}
body.dh-out #dh-fade{opacity:1;pointer-events:auto}
#dh-fade .dh-ld{text-align:center;opacity:0;transition:opacity .4s .35s;color:#eef4f8;font-family:"Segoe UI",system-ui,sans-serif}
body.dh-out #dh-fade .dh-ld{opacity:1}
.dh-ld .t{font-size:calc(var(--u,16px)*2.2);font-weight:300;margin-bottom:.5em}
.dh-ld .m,#loading .dh-lt{font-size:calc(var(--u,16px)*1.05);color:#b8c8d6;letter-spacing:.08em}
#loading .dh-lt{margin:-.2em 0 .9em}
.dh-ld .b{width:calc(var(--u,16px)*16);height:4px;margin:1.1em auto 0;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;position:relative}
.dh-ld .b::after{content:'';position:absolute;top:0;bottom:0;width:35%;border-radius:99px;background:#e8c170;animation:dhld 1.3s ease-in-out infinite}
@keyframes dhld{0%{left:-35%}100%{left:100%}}
#dh-copy{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--u,16px)*.25);font-size:calc(var(--u,16px)*.6);color:rgba(184,200,214,.45);
  letter-spacing:.06em;pointer-events:none;z-index:4;white-space:nowrap}
#dh-idle{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(3,8,14,.62);opacity:0;pointer-events:none;transition:opacity .45s;
  font-family:"Segoe UI",system-ui,sans-serif;color:#eef4f8;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
#dh-idle.on,#dh-idle.eat{pointer-events:auto}
#dh-idle.on{opacity:1}
#dh-idle .c{text-align:center;padding:calc(var(--u,16px)*2.4) calc(var(--u,16px)*3.4);border-radius:calc(var(--u,16px)*1.6);background:rgba(8,18,31,.93);
  border:2px solid rgba(232,193,112,.75);box-shadow:0 0 calc(var(--u,16px)*4) rgba(232,193,112,.25);transform:scale(.94);transition:transform .45s cubic-bezier(.2,.7,.2,1)}
#dh-idle.on .c{transform:none;animation:dhidle 1.6s ease-in-out infinite}
@keyframes dhidle{0%,100%{box-shadow:0 0 calc(var(--u,16px)*2) rgba(232,193,112,.2)}50%{box-shadow:0 0 calc(var(--u,16px)*5) rgba(232,193,112,.5)}}
#dh-idle svg{width:calc(var(--u,16px)*6);height:calc(var(--u,16px)*6);display:block;margin:0 auto calc(var(--u,16px)*.6);animation:dhtap 1.2s ease-in-out infinite}
@keyframes dhtap{0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(calc(var(--u,16px)*.6)) scale(.94)}}
#dh-idle h2{margin:0;font-size:calc(var(--u,16px)*3.2);font-weight:600;letter-spacing:.01em}
#dh-idle p{margin:.35em 0 0;font-size:calc(var(--u,16px)*1.5);color:#d5e1ea}
#dh-idle .n{margin-top:calc(var(--u,16px)*1.2);font-size:calc(var(--u,16px)*1.05);color:#e8c170;font-variant-numeric:tabular-nums;letter-spacing:.04em}
#dh-idle .bar{width:calc(var(--u,16px)*22);max-width:70vw;height:6px;margin:.7em auto 0;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
#dh-idle .bar i{display:block;height:100%;background:#e8c170;border-radius:99px}
body.rendering #dh-copy,body.clean #dh-idle{display:none!important}
#dh-gpu{position:fixed;top:calc(var(--u,16px)*.8);left:50%;transform:translateX(-50%);z-index:80;display:flex;align-items:center;gap:.9em;
  width:max-content;max-width:min(92vw,46em);padding:.75em .75em .75em 1.15em;border-radius:14px;background:rgba(8,18,31,.95);border:2px solid #e8c170;
  box-shadow:0 8px 30px rgba(0,0,0,.45);color:#eef4f8;font:500 clamp(14px,calc(var(--u,16px)*.95),40px)/1.45 "Segoe UI",system-ui,sans-serif}
#dh-gpu p{margin:0}
#dh-gpu button{flex:none;width:2.3em;height:2.3em;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);
  display:grid;place-items:center;cursor:pointer}
#dh-gpu svg{width:1.1em;height:1.1em;fill:none;stroke:#eef4f8;stroke-width:2.2;stroke-linecap:round}
body.rendering #dh-gpu,body.clean #dh-gpu{display:none!important}
`;
const HAND = '<svg viewBox="0 0 64 64"><circle cx="27" cy="16" r="11" fill="none" stroke="#e8c170" stroke-width="2.5" opacity=".55"/>' +
  '<path d="M23 17v22l-5-5c-2-2-5-2-6.5 0s-1 4.5.5 6l12 13c2 2 4.5 3 7.5 3h8c6 0 10-4.5 10-10V32c0-2-1.5-3.5-3.5-3.5S43 30 43 32v-2c0-2-1.5-3.5-3.5-3.5S36 28 36 30v-1.5c0-2-1.5-3.5-3.5-3.5S29 26.5 29 28.5V17c0-2-1.5-3.5-3-3.5S23 15 23 17z" fill="#fff" stroke="#1a1206" stroke-width="2" stroke-linejoin="round"/></svg>';

/* ---- navigation with a fade (and a loading message if the next page takes a moment) */
export function go(url, title) {
  const ld = document.querySelector('#dh-fade .dh-ld');
  if (ld) { ld.querySelector('.t').textContent = title || ''; ld.querySelector('.t').style.display = title ? '' : 'none'; ld.querySelector('.m').textContent = TX[lang].load; }
  document.body.classList.add('dh-out');
  setTimeout(() => { location.href = url; }, 550);
}
export const hubUrl = base => base + 'index.html';
// open story i (0-based) of EXPO.stories from a page that sits `hub` levels below the app root
export function goStory(i, hub = '../../') { const s = EXPO.stories[i]; if (s && s.ready) go(hub + 'stories/' + s.id + '/index.html', EXPO.names[lang][i]); }

/* ---- idle: any touch / key resets the clock.
   popup (stories): after EXPO.idleSec a big "are you still here?" popup counts EXPO.idleWarnSec down, then onIdle().
   no popup (main screen): onIdle() straight after EXPO.idleSec. busy() = true holds the clock (a guided tour, a ride). */
let last = performance.now(), idleCb = null, idleOn = false, idleSec = EXPO.idleSec, warnSec = EXPO.idleWarnSec, popup = true, busy = null, warnEl = null;
export function touch() {
  last = performance.now();
  if (warnEl && warnEl.classList.contains('on')) {          // keep catching touches a moment, so the dismissing tap does not hit the page below
    warnEl.classList.remove('on'); warnEl.classList.add('eat'); setTimeout(() => warnEl.classList.remove('eat'), 600);
  }
}
export function lastInput() { return last; }
export function startIdle(cb, { force = false, sec, popup: pp = true, busy: bz } = {}) {
  idleCb = cb; idleOn = KIOSK || force || Q.has('idle'); idleSec = sec || parseFloat(Q.get('idle')) || EXPO.idleSec;
  warnSec = parseFloat(Q.get('idlewarn')) || EXPO.idleWarnSec; popup = pp; busy = bz || null;
}
export function setBusy(f) { busy = f; }
for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel']) addEventListener(ev, e => { if (ev !== 'pointermove' || e.buttons) touch(); }, { passive: true, capture: true });
function idleTick() {
  if (!idleOn || !idleCb) return;
  const now = performance.now();
  if (document.body.classList.contains('xr') || (busy && busy())) { last = Math.max(last, now - 1000); }
  const idle = (now - last) / 1000;
  if (!popup) { if (idle > idleSec) { last = now; idleCb(); } return; }
  if (idle <= idleSec) return;
  if (!warnEl) buildWarn();
  const left = idleSec + warnSec - idle, T = TX[lang];
  if (!warnEl.classList.contains('on')) {
    warnEl.querySelector('h2').textContent = T.still; warnEl.querySelector('p').textContent = T.keep;
    warnEl.classList.add('on');
  }
  warnEl.querySelector('.n').textContent = T.back(Math.max(0, Math.ceil(left)));
  warnEl.querySelector('.bar i').style.width = Math.max(0, Math.min(100, left / warnSec * 100)) + '%';
  if (left <= 0) { warnEl.classList.remove('on'); last = now; idleCb(); }
}
function buildWarn() {
  warnEl = document.createElement('div'); warnEl.id = 'dh-idle';
  warnEl.innerHTML = `<div class="c">${HAND}<h2></h2><p></p><div class="n"></div><div class="bar"><i></i></div></div>`;
  // the touch that dismisses the popup must not also act on the page below
  for (const ev of ['pointerdown', 'pointerup', 'click']) warnEl.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); touch(); });
  document.body.appendChild(warnEl);
}
setInterval(idleTick, 250);

/* ---- touch guards for a public touch table */
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('gesturestart', e => e.preventDefault());
addEventListener('dblclick', e => e.preventDefault());
addEventListener('selectstart', e => e.preventDefault());
addEventListener('dragstart', e => e.preventDefault());
if (KIOSK) addEventListener('keydown', e => { if (e.key === 'F5' || (e.ctrlKey && 'rpsu+-='.includes(e.key))) e.preventDefault(); });

/* ---- fade-in + loading message + copyright line */
function dom() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  let f = document.getElementById('dh-fade');
  if (!f) { f = document.createElement('div'); f.id = 'dh-fade'; document.body.appendChild(f); }
  f.innerHTML = '<div class="dh-ld"><div class="t"></div><div class="m"></div><div class="b"></div></div>';
  const c = document.createElement('div'); c.id = 'dh-copy'; c.textContent = TX[lang].copy;
  document.body.appendChild(c);
  const lw = document.querySelector('#loading .w');               // the stories' own loading screens say "loading" too
  let lt = null;
  if (lw) { lt = document.createElement('div'); lt.className = 'dh-lt'; lt.textContent = TX[lang].load; lw.insertBefore(lt, lw.children[1] || null); }
  onLang(l => { c.textContent = TX[l].copy; if (lt) lt.textContent = TX[l].load; });
}
if (document.body) dom(); else addEventListener('DOMContentLoaded', dom);

/* ---- no GPU (web only): tell the visitor why the 3D is slow or missing; closing it hides it for the rest of the visit */
function gpuNote() {
  const g = gpuInfo();
  if (KIOSK || ss.get('dh_gpunote') || !(g.soft || g.none)) return;
  const n = document.createElement('div'); n.id = 'dh-gpu'; n.setAttribute('role', 'alert');
  n.innerHTML = `<p></p><button aria-label="OK">${ICON.close}</button>`;
  const txt = l => { n.querySelector('p').textContent = TX[l][g.none ? 'nogl' : 'soft']; };
  txt(lang); onLang(txt);
  n.querySelector('button').addEventListener('click', () => { n.remove(); ss.set('dh_gpunote', '1'); });
  document.body.appendChild(n);
}
setTimeout(gpuNote, 1200);   // after the fade-in (and after ICON below is defined)
// the page is on screen: from now on the idle clock counts (a slow load must not eat into the visitor's 30 s)
export function ready() { last = performance.now(); requestAnimationFrame(() => document.body.classList.add('dh-in')); }

/* ---- icons (inline SVG, no font needed) */
export const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5.5C6.5 4.2 9.5 4.2 12 5.8c2.5-1.6 5.5-1.6 8 -.3V19c-2.5-1.3-5.5-1.3-8 .3-2.5-1.6-5.5-1.6-8-.3z"/><path d="M12 5.8V19.3"/></svg>'
};

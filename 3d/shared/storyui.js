// DELTA-Hub — UI pieces every story shares (they bring their own CSS: Delta vie does not load ui.css):
//  · story switcher (1 2 3 4) under the brand, top left
//  · end-of-story bar (a long bar hanging from the top edge, over nothing important) 20 s after the visitor reaches the end:
//    "next story" + ⌂ main menu; after the last story only ⌂ back to the main menu
//  · red "press here" arrow over ▶ when the visitor stands at a station without touching anything (EXPO.nudgeSec)
//  · "Method & sources" panel, opened by the labelled ⓘ button
// Usage: const UI = storyUI({ index: 0, nextBtn, infoBtn, sources: { ro: {sections:[{h, html}]}, en: … } });
//        every frame: UI.update({ atStop, end, started, blocked });   on arrival at a station: UI.arrived();
import { EXPO } from './config.js';
import { getLang, onLang, lastInput, goStory, go, ICON, isPhone, store } from './kiosk.js';

const TX = {
  ro: { stories: 'Povești', next: 'Următoarea poveste', go: n => `Mergi la povestea ${n}`, start: 'Apasă aici când ești gata', cont: 'Apasă aici ca să continui',
        src: 'Metodă și surse', close: 'Închide', end: 'Sfârșitul poveștii', menu: 'Meniu', home: 'Înapoi la meniul principal',
        pick: 'Alege altă poveste din meniul principal.' },
  en: { stories: 'Stories', next: 'Next story', go: n => `Go to story ${n}`, start: 'Press here when you’re ready', cont: 'Press here to continue',
        src: 'Method & sources', close: 'Close', end: 'End of the story', menu: 'Menu', home: 'Back to the main menu',
        pick: 'Pick another story on the main menu.' }
};
const CSS = `
#dh-sw{position:fixed;left:var(--sw-x,calc(var(--u)*1.4));top:var(--sw-y,calc(var(--u)*5.3));z-index:8;display:flex;flex-direction:column;gap:calc(var(--u)*.35);
  font-family:"Segoe UI",system-ui,sans-serif}
#dh-sw .h{font-size:calc(var(--u)*.68);letter-spacing:.2em;text-transform:uppercase;color:#7f95a8;margin:0 0 calc(var(--u)*.1) calc(var(--u)*.2);font-weight:600}
#dh-sw button{display:flex;align-items:center;gap:calc(var(--u)*.6);height:calc(var(--u)*2.7);padding:0 calc(var(--u)*1.0) 0 calc(var(--u)*.35);border-radius:99px;
  background:rgba(6,13,23,.72);border:1px solid rgba(190,215,235,.18);color:#c9d7e2;font:inherit;font-size:calc(var(--u)*.88);font-weight:600;cursor:pointer;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:background .2s,transform .15s;white-space:nowrap;width:max-content;touch-action:manipulation}
#dh-sw button:active{transform:scale(.96);background:rgba(232,193,112,.25)}
#dh-sw button i{width:calc(var(--u)*2);height:calc(var(--u)*2);border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:700;
  border:2px solid rgba(232,193,112,.7);color:#e8c170;flex:none}
#dh-sw button.cur{background:rgba(232,193,112,.16);border-color:rgba(232,193,112,.75);color:#fff;pointer-events:none}
#dh-sw button.cur i{background:#e8c170;color:#1a1206;border-color:#e8c170}
#dh-nx{position:fixed;left:50%;top:0;z-index:12;width:min(calc(var(--u)*42),94vw);box-sizing:border-box;display:flex;align-items:center;gap:calc(var(--u)*.9);
  padding:calc(var(--u)*.6) calc(var(--u)*.6) calc(var(--u)*.6) calc(var(--u)*.6);border-radius:0 0 calc(var(--u)*1.1) calc(var(--u)*1.1);
  background:rgba(8,16,27,.94);border:2px solid rgba(232,193,112,.7);border-top:0;box-shadow:0 10px 40px rgba(0,0,0,.5),0 0 calc(var(--u)*2) rgba(232,193,112,.25);
  color:#eef4f8;font-family:"Segoe UI",system-ui,sans-serif;opacity:0;transform:translate(-50%,-110%);pointer-events:none;
  transition:opacity .5s,transform .6s cubic-bezier(.2,.7,.2,1);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#dh-nx.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
#dh-nx .im{flex:none;height:calc(var(--u)*3.4);aspect-ratio:16/9;border-radius:calc(var(--u)*.55);overflow:hidden;position:relative;
  background:radial-gradient(ellipse at 30% 30%,#1d4a6e,#0a1a2c 70%)}
#dh-nx .im img{width:100%;height:100%;object-fit:cover;display:block}
#dh-nx .im b{position:absolute;left:calc(var(--u)*.3);top:calc(var(--u)*.3);width:calc(var(--u)*1.4);height:calc(var(--u)*1.4);border-radius:50%;display:grid;place-items:center;
  background:#e8c170;color:#1a1206;font-size:calc(var(--u)*.75)}
#dh-nx .ic{flex:none;width:calc(var(--u)*3.4);height:calc(var(--u)*3.4);border-radius:50%;display:grid;place-items:center;background:rgba(232,193,112,.14);
  border:2px solid rgba(232,193,112,.6);color:#e8c170}
#dh-nx .ic svg{width:50%;height:50%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#dh-nx .tx{flex:1;min-width:0}
#dh-nx .k{font-size:calc(var(--u)*.62);letter-spacing:.2em;text-transform:uppercase;color:#e8c170;font-weight:700;white-space:nowrap}
#dh-nx h3{margin:.15em 0 0;font-size:calc(var(--u)*1.1);font-weight:650;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dh-nx p{margin:.2em 0 0;font-size:calc(var(--u)*.75);line-height:1.35;color:#b8c8d6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dh-nx .g,#dh-nx .h{flex:none;height:calc(var(--u)*2.9);border-radius:calc(var(--u)*.75);border:0;font:inherit;font-size:calc(var(--u)*.85);font-weight:700;cursor:pointer;
  display:flex;align-items:center;gap:.5em;padding:0 1.1em;white-space:nowrap;touch-action:manipulation}
#dh-nx .g{background:#e8c170;color:#1a1206;animation:dhnxp 2s ease-in-out infinite}
#dh-nx .h{background:rgba(255,255,255,.08);color:#dce8f2;border:1px solid rgba(190,215,235,.25)}
#dh-nx .g svg,#dh-nx .h svg{width:1.3em;height:1.3em;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
@keyframes dhnxp{0%,100%{box-shadow:0 0 0 0 rgba(232,193,112,.55)}60%{box-shadow:0 0 0 calc(var(--u)*.9) rgba(232,193,112,0)}}
#dh-nx .x{flex:none;width:calc(var(--u)*2.4);height:calc(var(--u)*2.4);border-radius:50%;border:0;
  background:rgba(255,255,255,.08);color:#dce8f2;display:grid;place-items:center;cursor:pointer;padding:0}
#dh-nx .x svg,#dh-src .x svg{width:46%;height:46%;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
body.dh-nxon #time,body.dh-nxon #vtick{opacity:0!important;transition:opacity .4s}
#dh-ndg{position:fixed;transform:translate(-50%,-100%);margin-top:calc(var(--u)*-1.1);display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*.3);
  pointer-events:none;opacity:0;transition:opacity .6s;z-index:9;font-family:"Segoe UI",system-ui,sans-serif}
#dh-ndg.on{opacity:1}
#dh-ndg.up{transform:translate(-50%,0);margin-top:calc(var(--u)*1.1);flex-direction:column-reverse}
#dh-ndg.up svg{transform:rotate(180deg)}
#dh-ndg.up.on svg{animation:dhndgu 1.1s ease-in-out infinite}
@keyframes dhndgu{0%,100%{transform:rotate(180deg) translateY(0)}50%{transform:rotate(180deg) translateY(calc(var(--u)*.8))}}
#dh-ndg .t{white-space:nowrap;font-size:calc(var(--u)*1.05);font-weight:700;color:#fff;background:#d8392b;padding:.35em .95em;border-radius:99px;box-shadow:0 4px 18px rgba(0,0,0,.45)}
#dh-ndg svg{width:calc(var(--u)*2.6);height:calc(var(--u)*3.2);filter:drop-shadow(0 3px 8px rgba(0,0,0,.5))}
#dh-ndg.on svg{animation:dhndg 1.1s ease-in-out infinite}
@keyframes dhndg{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--u)*.8))}}
.dh-hard{animation:dhpulse2 1.2s infinite!important}
@keyframes dhpulse2{0%,100%{box-shadow:0 0 0 0 rgba(255,90,60,.75);transform:scale(1)}50%{transform:scale(1.08)}70%{box-shadow:0 0 0 calc(var(--u)*1.6) rgba(255,90,60,0)}}
.dh-srcb{display:flex!important;align-items:center;gap:.5em;padding:0 1em!important;font-size:calc(var(--u)*.86)!important;font-weight:600;letter-spacing:.02em;white-space:nowrap}
.dh-srcb svg{width:1.45em!important;height:1.45em!important;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#dh-src{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:rgba(3,8,14,.66);opacity:0;pointer-events:none;transition:opacity .35s;
  font-family:"Segoe UI",system-ui,sans-serif}
#dh-src.on{opacity:1;pointer-events:auto}
#dh-src .box{position:relative;width:min(calc(var(--u)*60),90vw);max-height:84vh;overflow:auto;padding:calc(var(--u)*1.8) calc(var(--u)*2.2) calc(var(--u)*1.6);
  border-radius:calc(var(--u)*1.1);background:rgba(8,16,27,.95);border:1px solid rgba(190,215,235,.18);color:#b8c8d6;font-size:calc(var(--u)*.95);line-height:1.55;
  box-shadow:0 20px 60px rgba(0,0,0,.6);touch-action:pan-y;overscroll-behavior:contain}
#dh-src .k{font-size:calc(var(--u)*.72);letter-spacing:.2em;text-transform:uppercase;color:#e8c170;font-weight:700}
#dh-src h2{margin:.2em 0 .6em;color:#eef4f8;font-size:calc(var(--u)*1.8);font-weight:650;padding-right:2.5em}
#dh-src h3{margin:1.15em 0 .35em;color:#eef4f8;font-size:calc(var(--u)*1.12);font-weight:650}
#dh-src p{margin:0 0 .55em}
#dh-src ul{margin:0 0 .5em;padding-left:1.2em}
#dh-src li{margin:.25em 0}
#dh-src .ref{font-size:calc(var(--u)*.84);color:#9fb2c2}
#dh-src b{color:#dce8f2}
#dh-src .tag{display:inline-block;font-size:.78em;font-weight:700;color:#1a1206;background:#e8c170;border-radius:99px;padding:.05em .6em;margin-right:.4em}
#dh-src .x{position:sticky;float:right;top:0;margin:calc(var(--u)*-.6) calc(var(--u)*-1) 0 0;width:calc(var(--u)*3);height:calc(var(--u)*3);border-radius:50%;
  border:0;background:rgba(255,255,255,.08);color:#dce8f2;display:grid;place-items:center;cursor:pointer;padding:0}
body.clean #dh-sw,body.clean #dh-nx,body.clean #dh-ndg,body.rendering #dh-sw,body.rendering #dh-nx,body.rendering #dh-ndg{display:none!important}
@media (max-width:820px), (max-height:500px){#dh-nx{width:calc(100vw - 16px);flex-wrap:wrap}#dh-nx .im,#dh-nx p{display:none}
  /* story switcher: four numbered circles down the right edge */
  #dh-sw{left:auto;right:6px;top:32%;gap:6px}
  #dh-sw .h{display:none}
  #dh-sw button{width:34px;height:34px;padding:0;justify-content:center;font-size:0;border-radius:50%;opacity:.72;background:rgba(6,13,23,.55)}
  #dh-sw button.cur{opacity:1}
  #dh-sw button i{width:28px;height:28px;font-size:13px}
  /* the labelled "Method & sources" button becomes an icon */
  .dh-srcb span{display:none}
  .dh-srcb{padding:0!important;min-width:44px!important;justify-content:center}
  #dh-copy{display:none}
  /* the story card: collapsed to its title, a touch opens it */
  #card{cursor:pointer;padding-right:34px!important}
  #card::after{content:'▴';position:absolute;right:12px;top:10px;font-size:16px;color:var(--sand,#e8c170)}
  #card.min::after{content:'▾'}
  #card.min #chint{display:none}
  #dh-ndg .t{font-size:13px}
  #dh-src .box{width:94vw;max-height:86vh;padding:18px 16px}
  #dh-src h2{font-size:22px}
  #dh-rot{position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:30;padding:12px 18px;border-radius:14px;background:rgba(6,13,23,.9);
    color:#eef4f8;font:600 15px 'Segoe UI',system-ui,sans-serif;border:1px solid rgba(232,193,112,.5);text-align:center;transition:opacity .6s;pointer-events:none}
}
/* phones held sideways: the card on the left, the bar on one row */
@media (max-height:500px) and (min-width:560px){
  #card{left:10px!important;right:auto!important;width:44vw!important;bottom:68px!important;max-height:calc(100vh - 140px);overflow:auto}
  #bar{flex-wrap:nowrap!important}
  #rail{order:0!important;flex:1 1 auto!important;height:46px!important;margin:0 10px!important}
  #dh-sw{top:56px}
}
`;
const NEXT_DELAY = /[?&]nx(&|$)/.test(location.search) ? 0 : 20000;   // ms at the end of a story before the end-of-story bar slides down (?nx: at once)
const ARROW = '<svg viewBox="0 0 26 32"><path d="M9 0h8v18h7L13 32 2 18h7z" fill="#e8402f" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';

export function storyUI({ index, hub = '../../', nextBtn, infoBtn, sources, nudgeBelow = false }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const N = EXPO.stories.length, nextI = (index + 1) % N, last = index === N - 1;
  const el = (tag, id, html) => { const e = document.createElement(tag); e.id = id; e.innerHTML = html || ''; document.body.appendChild(e); return e; };

  /* story switcher */
  const sw = el('div', 'dh-sw');
  function buildSwitcher() {
    const L = getLang();
    sw.innerHTML = `<div class="h">${TX[L].stories}</div>` + EXPO.stories.map((s, i) =>
      `<button data-i="${i}" class="${i === index ? 'cur' : ''}"><i>${i + 1}</i>${EXPO.names[L][i]}</button>`).join('');
    sw.querySelectorAll('button').forEach(b => b.onclick = () => goStory(+b.dataset.i, hub));
  }

  /* end-of-story bar: next story + main menu (after the last story: back to the main menu only) */
  const nx = el('div', 'dh-nx');
  let nxShown = false, nxDismissed = false, endSince = 0;
  const homeIcon = ICON.home;
  function buildNext() {
    const L = getLang(), T = TX[L];
    nx.innerHTML = last
      ? `<div class="ic">${homeIcon}</div><div class="tx"><div class="k">${T.end}</div><h3>${EXPO.names[L][index]}</h3><p>${T.pick}</p></div>
         <button class="g" data-a="home">${homeIcon}${T.home}</button><button class="x" aria-label="${T.close}">${ICON.close}</button>`
      : `<div class="im"><img alt="" src="${hub}shared/img/story_${nextI + 1}.webp" onerror="this.remove()"><b>${nextI + 1}</b></div>
         <div class="tx"><div class="k">${T.next}</div><h3>${EXPO.names[L][nextI]}</h3><p>${EXPO.blurbs[L][nextI]}</p></div>
         <button class="g" data-a="next">${T.go(nextI + 1)} →</button><button class="h" data-a="home">${homeIcon}${T.menu}</button>
         <button class="x" aria-label="${T.close}">${ICON.close}</button>`;
    nx.querySelector('.x').onclick = e => { e.stopPropagation(); nxDismissed = true; show(false); };
    nx.querySelectorAll('[data-a]').forEach(b => b.onclick = () => b.dataset.a === 'next' ? goStory(nextI, hub) : go(hub + 'index.html'));
  }
  function show(on) { nxShown = on; nx.classList.toggle('on', on); document.body.classList.toggle('dh-nxon', on); }

  /* nudge arrow over ▶ */
  const ndg = el('div', 'dh-ndg', `<div class="t"></div>${ARROW}`); if (nudgeBelow) ndg.classList.add('up');
  let arrivedAt = performance.now(), ndgOn = false, ndgStart = null;
  const placeNudge = () => { if (!nextBtn) return; const r = nextBtn.getBoundingClientRect(); ndg.style.left = (r.left + r.width / 2) + 'px'; ndg.style.top = (nudgeBelow ? r.bottom + 6 : r.top - 6) + 'px'; };

  /* method & sources panel */
  const src = el('div', 'dh-src', '<div class="box"></div>');
  function buildSources() {
    const L = getLang(), S = sources && (sources[L] || sources.ro);
    if (!S) return;
    src.querySelector('.box').innerHTML = `<button class="x" aria-label="${TX[L].close}">${ICON.close}</button><div class="k">${TX[L].src}</div>
      <h2>${EXPO.names[L][index]}</h2>${S.lead ? `<p>${S.lead}</p>` : ''}` + S.sections.map(s => `<h3>${s.h}</h3>${s.html}`).join('');
    src.querySelector('.x').onclick = e => { e.stopPropagation(); close(); };
  }
  const open = () => { buildSources(); src.classList.add('on'); };
  const close = () => src.classList.remove('on');
  src.addEventListener('pointerdown', e => { if (e.target === src) close(); });
  if (infoBtn) {
    infoBtn.classList.add('dh-srcb'); infoBtn.style.minWidth = 'auto';
    infoBtn.onclick = e => { e.stopPropagation(); src.classList.contains('on') ? close() : open(); };
  }
  function labelInfo() { if (infoBtn) infoBtn.innerHTML = ICON.book + `<span>${TX[getLang()].src}</span>`; }

  function refresh() { buildSwitcher(); buildNext(); labelInfo(); ndg.querySelector('.t').textContent = ndgStart ? TX[getLang()].start : TX[getLang()].cont; if (src.classList.contains('on')) buildSources(); }
  refresh(); onLang(refresh);
  addEventListener('resize', () => { if (ndgOn) placeNudge(); });

  /* phones: the card starts collapsed, a short hint to turn the phone in portrait */
  if (isPhone()) {
    const card = document.getElementById('card'); if (card) card.classList.add('min');
    if (innerHeight > innerWidth && store.get('dh_rot') !== '1') {
      store.set('dh_rot', '1');
      const r = el('div', 'dh-rot', getLang() === 'en' ? '⟲ Turn your phone for a bigger picture' : '⟲ Rotește telefonul pentru o imagine mai mare');
      setTimeout(() => { r.style.opacity = '0'; setTimeout(() => r.remove(), 700); }, 4200);
    }
  }
  return {
    arrived() { arrivedAt = performance.now(); },
    // state: atStop = standing at a station (not riding), end = at the last station, started = the visitor has set off once,
    // blocked = something else needs the attention (an open bubble, a panel, a tour)
    update({ atStop = false, end = false, started = true, blocked = false } = {}) {
      const now = performance.now(), quiet = now - Math.max(lastInput(), arrivedAt);
      // next story: NEXT_DELAY ms after arriving at the end; a dismissed popup comes back after the visitor leaves and returns
      if (end && atStop) { if (!endSince) endSince = now; } else { endSince = 0; nxDismissed = false; }
      const nxWant = !!endSince && now - endSince > NEXT_DELAY && !nxDismissed && !src.classList.contains('on');
      if (nxWant !== nxShown) show(nxWant);
      // nudge
      const want = atStop && !end && !blocked && !src.classList.contains('on') && quiet > EXPO.nudgeSec * 1000;
      if (want !== ndgOn) {
        ndgOn = want; ndgStart = !started;
        ndg.querySelector('.t').textContent = started ? TX[getLang()].cont : TX[getLang()].start;
        if (want) placeNudge();
        ndg.classList.toggle('on', want); nextBtn && nextBtn.classList.toggle('dh-hard', want);
      }
    },
    openSources: open, closeSources: close,
    get sourcesOpen() { return src.classList.contains('on'); },
    get nudging() { return ndgOn; },
    placeNudge
  };
}

// DELTA-Hub 3D Experience — exhibition-wide settings. Edit freely.
export const EXPO = {
  // Seconds without a touch before the "are you still here?" popup (kiosk only)…
  idleSec: 30,
  // …and seconds of countdown on that popup before everything returns to the main screen (the 4 stories).
  idleWarnSec: 15,
  // Seconds a visitor stands at a station without touching anything before a red arrow points at ▶.
  nudgeSec: 8,
  // Default language ('ro' | 'en'); the kiosk falls back to it every time it returns to the main screen.
  lang: 'ro',
  // Public HTTPS address of the hosted version (for story 1's QR code). Empty = no QR.
  publicUrl: '',
  // The 3D Experience page on the DELTA-Hub website: QR code + link in the "Follow DELTA-Hub" box (main screen, bottom left).
  webPage: 'https://delta-hub.unibuc.ro/experience.html',
  // DELTA-Hub on social media, stacked top to bottom in the same box.
  social: [
    { id: 'li', name: 'LinkedIn', handle: 'DELTA-Hub', url: 'https://www.linkedin.com/company/delta-hub-river-delta-science-education-and-modeling-hub/' },
    { id: 'fb', name: 'Facebook', handle: 'DeltaHubUniBuc', url: 'https://www.facebook.com/DeltaHubUniBuc/' },
    { id: 'ig', name: 'Instagram', handle: '@deltahub2025', url: 'https://www.instagram.com/deltahub2025' }
  ],
  // UI size multiplier (1 = ~1 % of the screen width per unit). Raise if the text looks small on the table.
  uiScale: 1,
  // Stories, in the suggested order (also the "next story" order: 1 → 2 → 3 → 4 → 1).
  // ready:false → shown as "coming soon". at = [E, N] Stereo 70 of the story's place on the main-screen map.
  stories: [
    { id: '01_povestea', ready: true, at: [794500, 421000] },   // the apex (Ceatal Izmail)
    { id: '02_delta_vie', ready: true, at: [840000, 411000] },  // the middle of the delta; index.html redirects to delta-vie.html
    { id: '03_sacalin', ready: true, at: [866000, 382000] },    // Sacalin island
    { id: '04_gura_sfg', ready: true, at: [866800, 386800] }    // the Sfântu Gheorghe mouth
  ],
  // Story names, shared by the main screen, the story switcher and the "next story" popup.
  names: {
    ro: ['Povestea Deltei', 'Delta vie', 'Dinamica Sacalinului', 'Lupta de la gură'],
    en: ['The Story of the Delta', 'Living Delta', 'Sacalin on the Move', 'The Battle at the Mouth']
  },
  // One line per story for the "next story" popup.
  blurbs: {
    ro: ['11.700 de ani: cum s-a născut delta din mare.', 'Seceta și viitura: cum respiră delta cu apele Dunării.',
         'O insulă născută în 1898 care se mișcă an de an.', 'La gura Sfântu Gheorghe, viiturile aduc nisip și furtunile îl iau înapoi.'],
    en: ['11,700 years: how the delta rose out of the sea.', 'Drought and flood: how the delta breathes with the Danube.',
         'An island born in 1898 that keeps moving.', 'At the Sfântu Gheorghe mouth, floods bring sand and storms take it back.']
  }
};

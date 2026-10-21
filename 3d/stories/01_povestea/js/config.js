// Povestea Deltei — story settings. Exhibition-wide settings (idle, language, public URL) live in ../../shared/config.js.
export const CONFIG = {
  // QR code address for this story only (empty = use the exhibition-wide one).
  publicUrl: '',
  // Terrain detail: 'auto' (full on desktop, half on phones/headsets), 1 = full (110 m), 2 = half (220 m).
  lod: 'auto',
  // Travel speed multiplier between stations (1 = TRAVEL seconds from story.js).
  speed: 1.0
};
// URL overrides, e.g. index.html?lod=2&speed=1.5
for (const [k, v] of new URLSearchParams(location.search)) {
  if (k === 'lod') CONFIG.lod = v === 'auto' ? 'auto' : Math.max(1, Math.min(4, parseInt(v) || 1));
  else if (k === 'speed') CONFIG.speed = parseFloat(v) || 1;
  else if (k === 'url') CONFIG.publicUrl = v;
}

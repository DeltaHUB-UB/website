// QR code as a canvas (uses vendor/qrcode.js, loaded as a classic script in index.html)
export function makeQR(text, cell = 4) {
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, cv = document.createElement('canvas');
  cv.width = cv.height = (n + m * 2) * cell;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#060d17';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
  return cv;
}

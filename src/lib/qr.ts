import QRCode from 'qrcode';

const cache = new Map<string, string>();

/**
 * Real, scannable QR as an SVG string (error correction M, 4-module quiet zone).
 * Built from QRCode.create so it is synchronous and can render inline.
 */
export function qrSvg(text: string, px = 180, fg = '#101217') {
  const key = `${text}|${px}|${fg}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = modules.size, q = 4, s = n + q * 2;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(x, y)) d += `M${x + q} ${y + q}h1v1h-1z`;
  const label = text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const svg = `<svg width="${px}" height="${px}" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${label}"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="${fg}"/></svg>`;
  cache.set(key, svg);
  return svg;
}

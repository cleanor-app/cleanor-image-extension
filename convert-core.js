// Shared image-conversion core, usable from both the service worker and a document.
// Uses OffscreenCanvas (available in workers and windows). No DOM, no controls.
// HEIC input and PDF output are NOT handled here — the caller falls back to the
// optimizer page for those.

const EXT = { 'image/webp': 'webp', 'image/avif': 'avif', 'image/jpeg': 'jpg', 'image/png': 'png' };
const LOSSY = new Set(['image/webp', 'image/avif', 'image/jpeg']);

let _avifEncode;
async function getAvifEncoder() {
  if (!_avifEncode) { const mod = await import('./vendor/avif/avif-encode.js'); _avifEncode = mod.encodeAvif; }
  return _avifEncode;
}

function computeCrop(w, h, aspect) {
  if (!aspect || aspect === 'off') return { sx: 0, sy: 0, sw: w, sh: h };
  const [aw, ah] = aspect.split(':').map(Number);
  const target = aw / ah;
  let sw = w, sh = Math.round(w / target);
  if (sh > h) { sh = h; sw = Math.round(h * target); }
  return { sx: Math.round((w - sw) / 2), sy: Math.round((h - sh) / 2), sw, sh };
}
function computeResize(w, h, o) {
  const mode = o.resizeMode || 'off';
  if (mode === 'width') { const W = o.resizeW || 0; if (W > 0 && w > W) return { w: W, h: Math.round(h * W / w) }; return { w, h }; }
  if (mode === 'fit') { const W = o.resizeW || 0, H = o.resizeH || 0; if (W > 0 && H > 0) { const s = Math.min(W / w, H / h, 1); return { w: Math.round(w * s), h: Math.round(h * s) }; } return { w, h }; }
  if (mode === 'exact') { const W = o.resizeW || 0, H = o.resizeH || 0; return { w: W > 0 ? W : w, h: H > 0 ? H : h }; }
  if (mode === 'percent') { const p = o.resizePct || 100; return { w: Math.max(1, Math.round(w * p / 100)), h: Math.max(1, Math.round(h * p / 100)) }; }
  return { w, h };
}

async function encodeToTarget(canvas, type, target) {
  let lo = 0.4, hi = 0.98, best = null;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvas.convertToBlob({ type, quality: mid });
    if (blob.size <= target) { best = blob; lo = mid; } else { hi = mid; }
  }
  return best || canvas.convertToBlob({ type, quality: 0.4 });
}

/**
 * @param {Blob} blob source image bytes
 * @param {{format:string, quality?:number, target?:number, resizeMode?:string, resizeW?:number, resizeH?:number, resizePct?:number, cropAspect?:string}} opts
 * @returns {Promise<{blob:Blob, ext:string}>}
 */
export async function convertBlob(blob, opts) {
  const type = opts.format;
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const crop = computeCrop(bitmap.width, bitmap.height, opts.cropAspect);
  const dst = computeResize(crop.sw, crop.sh, opts);
  const canvas = new OffscreenCanvas(Math.max(1, dst.w), Math.max(1, dst.h));
  const ctx = canvas.getContext('2d');
  if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const q = (opts.quality ?? 80) / 100;
  let out;
  if (type === 'image/avif') {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const encodeAvif = await getAvifEncoder();
    out = new Blob([await encodeAvif(imageData, { quality: opts.quality ?? 80 })], { type: 'image/avif' });
  } else if (opts.target > 0 && LOSSY.has(type)) {
    out = await encodeToTarget(canvas, type, opts.target);
  } else {
    out = await canvas.convertToBlob({ type, quality: type === 'image/png' ? undefined : q });
  }
  return { blob: out, ext: EXT[type] };
}

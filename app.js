'use strict';

// Cleanor Image Optimizer — all processing is local (canvas + WASM), nothing is uploaded.

const $ = (id) => document.getElementById(id);
const els = {
  drop: $('drop'), file: $('file'), pick: $('pick'),
  format: $('format'), quality: $('quality'), qval: $('qval'), qualityField: $('qualityField'),
  targetSize: $('targetSize'), tsHint: $('tsHint'), targetField: $('targetField'),
  resizeMode: $('resizeMode'), resizeW: $('resizeW'), resizeH: $('resizeH'), resizePct: $('resizePct'),
  rsInputs: $('rsInputs'), rsX: $('rsX'), rsPresets: $('rsPresets'), cropAspect: $('cropAspect'),
  subfolder: $('subfolder'),
  results: $('results'), list: $('list'), summary: $('summary'),
  downloadAll: $('downloadAll'), clear: $('clear'), expand: $('expand'),
  rowTpl: $('rowTpl'),
};

const EXT = { 'image/webp': 'webp', 'image/avif': 'avif', 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
const LOSSY = new Set(['image/webp', 'image/avif', 'image/jpeg']);

// Brand tag appended to every optimized file's name (e.g. photo-cleanor.app.webp).
const BRAND_TAG = 'cleanor.app';
const SUBFOLDER = 'Cleanor';

const MIME = { webp: 'image/webp', avif: 'image/avif', jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
const IMG_RE = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif|tiff?)$/i;
const HEIC_RE = /\.(heic|heif)$/i;

const params = new URLSearchParams(location.search);
const AUTO = params.get('auto') === '1';

// ---- preferences (remembered across sessions) -------------------------------
const PREFS_KEY = 'cleanor.prefs';
const store = {
  async get() {
    try { if (typeof chrome !== 'undefined' && chrome.storage?.local) { const o = await chrome.storage.local.get(PREFS_KEY); return o[PREFS_KEY] || {}; } } catch {}
    try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
  },
  async set(v) {
    try { if (typeof chrome !== 'undefined' && chrome.storage?.local) { await chrome.storage.local.set({ [PREFS_KEY]: v }); return; } } catch {}
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(v)); } catch {}
  },
};
let prefs = { subfolder: true };

// ---- lazily loaded codecs ---------------------------------------------------
let _avifEncode;
async function getAvifEncoder() {
  if (!_avifEncode) { const mod = await import('./vendor/avif/avif-encode.js'); _avifEncode = mod.encodeAvif; }
  return _avifEncode;
}
let _libheif;
async function getLibheif() {
  if (!_libheif) { const mod = await import('./vendor/heic/libheif-bundle.mjs'); _libheif = await mod.default(); }
  return _libheif;
}
let _jsPDF;
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}
async function getJsPDF() {
  if (!_jsPDF) {
    if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('vendor/jspdf/jspdf.umd.min.js');
    _jsPDF = window.jspdf.jsPDF;
  }
  return _jsPDF;
}

/** @type {{file:File, name:string, base:string, origSize:number, blob?:Blob, outName?:string, outUrl?:string, thumbUrl?:string, error?:string}[]} */
let items = [];
let busy = false;
let autoPending = AUTO;

// ---- helpers ----------------------------------------------------------------
function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}
function baseName(name) { const i = name.lastIndexOf('.'); return i > 0 ? name.slice(0, i) : name; }
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), type, quality);
  });
}
function num(el, def = 0) { const v = Number(el?.value); return Number.isFinite(v) ? v : def; }
function targetBytes() { const kb = num(els.targetSize, 0); return kb > 0 ? kb * 1024 : 0; }

// ---- decoding (incl. HEIC/HEIF input) ---------------------------------------
function isHeic(file) { return /heic|heif/i.test(file.type || '') || HEIC_RE.test(file.name || ''); }
async function decodeHeic(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const lib = await getLibheif();
  const decoder = new lib.HeifDecoder();
  const data = decoder.decode(buf);
  if (!data || !data.length) throw new Error('no HEIC image');
  const img = data[0];
  const width = img.get_width(), height = img.get_height();
  const imageData = new ImageData(width, height);
  await new Promise((resolve, reject) => img.display(imageData, (d) => (d ? resolve() : reject(new Error('HEIF decode error')))));
  return imageData;
}
// Orientation is baked into pixels so stripping EXIF never rotates the result.
async function getBitmap(file) {
  if (isHeic(file)) { const imageData = await decodeHeic(file); return await createImageBitmap(imageData); }
  return await createImageBitmap(file, { imageOrientation: 'from-image' });
}

// ---- geometry: crop + resize ------------------------------------------------
function computeCrop(w, h) {
  const aspect = els.cropAspect?.value || 'off';
  if (aspect === 'off') return { sx: 0, sy: 0, sw: w, sh: h };
  const [aw, ah] = aspect.split(':').map(Number);
  const target = aw / ah;
  let sw = w, sh = Math.round(w / target);
  if (sh > h) { sh = h; sw = Math.round(h * target); }
  return { sx: Math.round((w - sw) / 2), sy: Math.round((h - sh) / 2), sw, sh };
}
function computeResize(w, h) {
  const mode = els.resizeMode?.value || 'off';
  if (mode === 'width') { const W = num(els.resizeW); if (W > 0 && w > W) return { w: W, h: Math.round(h * W / w) }; return { w, h }; }
  if (mode === 'fit') { const W = num(els.resizeW), H = num(els.resizeH); if (W > 0 && H > 0) { const s = Math.min(W / w, H / h, 1); return { w: Math.round(w * s), h: Math.round(h * s) }; } return { w, h }; }
  if (mode === 'exact') { const W = num(els.resizeW), H = num(els.resizeH); return { w: W > 0 ? W : w, h: H > 0 ? H : h }; }
  if (mode === 'percent') { const p = num(els.resizePct, 100); return { w: Math.max(1, Math.round(w * p / 100)), h: Math.max(1, Math.round(h * p / 100)) }; }
  return { w, h };
}
// Decode → crop → resize → a ready-to-encode canvas.
async function buildCanvas(file) {
  const type = els.format.value;
  const bitmap = await getBitmap(file);
  const crop = computeCrop(bitmap.width, bitmap.height);
  const dst = computeResize(crop.sw, crop.sh);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, dst.w);
  canvas.height = Math.max(1, dst.h);
  const ctx = canvas.getContext('2d');
  // JPEG and PDF have no alpha — flatten onto white so transparency doesn't turn black.
  if (type === 'image/jpeg' || type === 'application/pdf') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

// ---- encoding ---------------------------------------------------------------
async function encodeCanvas(canvas, type, q) {
  if (type === 'image/avif') {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const encodeAvif = await getAvifEncoder();
    const buf = await encodeAvif(imageData, { quality: Math.round(q * 100) });
    return new Blob([buf], { type: 'image/avif' });
  }
  const useQuality = type === 'image/png' ? undefined : q;
  return canvasToBlob(canvas, type, useQuality);
}
// Binary-search quality for the highest that fits under targetBytes.
async function encodeToTarget(canvas, type, target) {
  let lo = 0.4, hi = 0.98, best = null;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    const blob = await encodeCanvas(canvas, type, mid);
    if (blob.size <= target) { best = blob; lo = mid; } else { hi = mid; }
  }
  return best || encodeCanvas(canvas, type, 0.4); // even lowest exceeds target → best effort
}
function pdfQuality() { return Math.max(0.5, num(els.quality, 80) / 100); }
async function canvasToPdf(canvas) {
  const JsPDF = await getJsPDF();
  const w = canvas.width, h = canvas.height;
  const pdf = new JsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'px', format: [w, h], compress: true });
  pdf.addImage(canvas.toDataURL('image/jpeg', pdfQuality()), 'JPEG', 0, 0, w, h);
  return pdf.output('blob');
}

async function encodeOne(file) {
  const type = els.format.value;
  const canvas = await buildCanvas(file);
  if (type === 'application/pdf') return canvasToPdf(canvas);
  const target = targetBytes();
  if (target > 0 && LOSSY.has(type)) return encodeToTarget(canvas, type, target);
  return encodeCanvas(canvas, type, num(els.quality, 80) / 100);
}

async function processAll() {
  if (busy || !items.length) return;
  busy = true;
  els.downloadAll.disabled = true;
  const type = els.format.value;

  for (const it of items) {
    if (it.outUrl) URL.revokeObjectURL(it.outUrl);
    it.blob = undefined; it.outUrl = undefined; it.error = undefined;
    try {
      const blob = await encodeOne(it.file);
      it.blob = blob;
      it.outName = `${it.base}-${BRAND_TAG}.${EXT[type]}`;
      it.outUrl = URL.createObjectURL(blob);
    } catch (e) {
      it.error = isHeic(it.file) ? 'Could not decode this HEIC image' : 'Could not read this image';
    }
  }
  busy = false;
  render();

  if (autoPending && items.some((it) => it.blob)) { autoPending = false; saveAll(); }
}

// ---- rendering --------------------------------------------------------------
function render() {
  els.results.hidden = items.length === 0;
  els.list.textContent = '';
  const type = els.format.value;

  let totalIn = 0, totalOut = 0, done = 0;
  for (const it of items) {
    const node = els.rowTpl.content.firstElementChild.cloneNode(true);
    const img = node.querySelector('.thumb');
    if (!it.thumbUrl && !isHeic(it.file)) it.thumbUrl = URL.createObjectURL(it.file);
    if (it.thumbUrl) img.src = it.thumbUrl;
    else if (it.outUrl && type !== 'application/pdf') img.src = it.outUrl;
    node.querySelector('.name').textContent = it.outName || it.file.name;

    const sizesEl = node.querySelector('.sizes');
    const deltaEl = node.querySelector('.delta');
    const dlBtn = node.querySelector('.dl');
    const copyBtn = node.querySelector('.copy');

    if (it.error) {
      sizesEl.textContent = it.error; deltaEl.textContent = '—'; dlBtn.disabled = true; copyBtn.hidden = true;
    } else if (it.blob) {
      done++; totalIn += it.origSize; totalOut += it.blob.size;
      sizesEl.textContent = `${formatBytes(it.origSize)} → ${formatBytes(it.blob.size)}`;
      const pct = Math.round((1 - it.blob.size / it.origSize) * 100);
      if (pct >= 0) { deltaEl.textContent = `−${pct}%`; deltaEl.classList.add('save'); }
      else { deltaEl.textContent = `+${-pct}%`; deltaEl.classList.add('grow'); }
      dlBtn.addEventListener('click', () => saveOne(it));
      // Clipboard image copy applies to raster output only (not PDF).
      if (type === 'application/pdf') copyBtn.hidden = true;
      else copyBtn.addEventListener('click', () => copyToClipboard(it, copyBtn));
    } else {
      sizesEl.textContent = 'working…'; deltaEl.textContent = ''; dlBtn.disabled = true; copyBtn.hidden = true;
    }
    els.list.appendChild(node);
  }

  if (totalIn > 0) {
    const pct = Math.round((1 - totalOut / totalIn) * 100);
    const word = pct >= 0 ? 'saved' : 'larger';
    els.summary.innerHTML = `${items.length} image${items.length > 1 ? 's' : ''} · <b>${Math.abs(pct)}% ${word}</b> (${formatBytes(totalIn)} → ${formatBytes(totalOut)})`;
  } else {
    els.summary.textContent = `${items.length} image${items.length > 1 ? 's' : ''}`;
  }
  els.downloadAll.disabled = done === 0;
  els.downloadAll.textContent = done > 1
    ? (type === 'application/pdf' ? 'Download .pdf' : 'Download .zip')
    : 'Download all';
}

// ---- downloads --------------------------------------------------------------
function outPath(name) { return prefs.subfolder ? `${SUBFOLDER}/${name}` : name; }
function downloadUrl(url, path) {
  if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
    chrome.downloads.download({ url, filename: path, saveAs: false });
    return;
  }
  const a = document.createElement('a');
  a.href = url; a.download = path.split('/').pop(); a.click();
}
function saveOne(it) { if (it.outUrl) downloadUrl(it.outUrl, outPath(it.outName)); }

// Copy the result to the clipboard. Browsers only accept image/png on the clipboard,
// so re-encode whatever we produced (webp/avif/jpeg) to PNG first.
const ICON_CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
async function toPngBlob(blob) {
  if (blob.type === 'image/png') return blob;
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close?.();
  return await new Promise((r) => c.toBlob(r, 'image/png'));
}
async function copyToClipboard(it, btn) {
  if (!it.blob || btn.classList.contains('busy')) return;
  btn.classList.add('busy');
  const orig = btn.dataset.orig || btn.innerHTML;
  btn.dataset.orig = orig;
  try {
    const png = await toPngBlob(it.blob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    btn.innerHTML = ICON_CHECK; btn.classList.add('ok'); btn.title = 'Copied!';
  } catch (e) {
    btn.classList.add('err'); btn.title = 'Copy failed';
  } finally {
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      btn.innerHTML = orig; btn.classList.remove('ok', 'err', 'busy'); btn.title = 'Copy image to clipboard';
    }, 1300);
  }
}

// One click → all results. Multiple images become a single .zip, or a single multi-page .pdf.
async function saveAll() {
  const done = items.filter((it) => it.blob);
  if (!done.length) return;
  const type = els.format.value;

  if (done.length === 1) { saveOne(done[0]); return; }

  if (type === 'application/pdf') {
    els.downloadAll.disabled = true; els.downloadAll.textContent = 'Building PDF…';
    try {
      const JsPDF = await getJsPDF();
      let pdf;
      for (const it of done) {
        const canvas = await buildCanvas(it.file);
        const w = canvas.width, h = canvas.height, o = w >= h ? 'landscape' : 'portrait';
        if (!pdf) pdf = new JsPDF({ orientation: o, unit: 'px', format: [w, h], compress: true });
        else pdf.addPage([w, h], o);
        pdf.addImage(canvas.toDataURL('image/jpeg', pdfQuality()), 'JPEG', 0, 0, w, h);
      }
      const url = URL.createObjectURL(pdf.output('blob'));
      downloadUrl(url, outPath(`cleanor-images-${done.length}.pdf`));
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } finally { els.downloadAll.disabled = false; els.downloadAll.textContent = 'Download .pdf'; }
    return;
  }

  els.downloadAll.disabled = true; els.downloadAll.textContent = 'Zipping…';
  try {
    const zip = new JSZip();
    for (const it of done) zip.file(it.outName, it.blob);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const url = URL.createObjectURL(blob);
    downloadUrl(url, outPath(`cleanor-images-${done.length}.zip`));
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } finally { els.downloadAll.disabled = false; els.downloadAll.textContent = 'Download .zip'; }
}

// ---- input handling ---------------------------------------------------------
function isImageFile(f) { return (f.type && f.type.startsWith('image/')) || IMG_RE.test(f.name || ''); }
function addFiles(fileList) {
  const imgs = [...fileList].filter(isImageFile);
  for (const f of imgs) items.push({ file: f, name: f.name, base: baseName(f.name), origSize: f.size });
  if (imgs.length) processAll();
}
function clearAll() {
  for (const it of items) { if (it.outUrl) URL.revokeObjectURL(it.outUrl); if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl); }
  items = [];
  render();
}

// ---- preferences wiring -----------------------------------------------------
function persist() {
  prefs.format = els.format.value;
  prefs.quality = els.quality.value;
  prefs.target = els.targetSize.value;
  prefs.resizeMode = els.resizeMode.value;
  prefs.resizeW = els.resizeW.value;
  prefs.resizeH = els.resizeH.value;
  prefs.resizePct = els.resizePct.value;
  prefs.crop = els.cropAspect.value;
  if (els.subfolder) prefs.subfolder = els.subfolder.checked;
  store.set(prefs);
}
async function applyPrefs() {
  prefs = Object.assign({ subfolder: true }, await store.get());
  const fmtParam = params.get('format');
  const fmt = fmtParam && MIME[fmtParam] ? MIME[fmtParam] : prefs.format;
  if (fmt && [...els.format.options].some((o) => o.value === fmt)) els.format.value = fmt;
  if (prefs.quality != null) els.quality.value = prefs.quality;
  if (prefs.target != null) els.targetSize.value = prefs.target;
  if (prefs.resizeMode) els.resizeMode.value = prefs.resizeMode;
  if (prefs.resizeW != null) els.resizeW.value = prefs.resizeW;
  if (prefs.resizeH != null) els.resizeH.value = prefs.resizeH;
  if (prefs.resizePct != null) els.resizePct.value = prefs.resizePct;
  if (prefs.crop) els.cropAspect.value = prefs.crop;
  if (els.subfolder) els.subfolder.checked = prefs.subfolder !== false;
  syncControls();
}

// ---- control state ----------------------------------------------------------
function syncControls() {
  const type = els.format.value;
  const target = targetBytes();
  els.qval.textContent = els.quality.value;
  // Quality: hidden for PNG; dimmed & ignored when a target size drives it (lossy only).
  els.qualityField.style.display = type === 'image/png' ? 'none' : '';
  const qAuto = target > 0 && LOSSY.has(type);
  els.qualityField.classList.toggle('is-auto', qAuto);
  // Target size only meaningful for lossy raster formats.
  const targetOk = LOSSY.has(type);
  els.targetField.style.display = targetOk ? '' : 'none';
  els.tsHint.textContent = target > 0 ? `${num(els.targetSize)} KB` : 'off';
  // Resize inputs by mode.
  const mode = els.resizeMode.value;
  const showInputs = mode !== 'off';
  els.rsInputs.hidden = !showInputs;
  const wh = mode === 'fit' || mode === 'exact';
  const widthOnly = mode === 'width';
  const pct = mode === 'percent';
  els.resizeW.hidden = pct;
  els.resizeH.hidden = pct || widthOnly;
  els.rsX.hidden = pct || widthOnly;
  els.resizePct.hidden = !pct;
  els.rsPresets.hidden = !widthOnly;
  els.resizeW.placeholder = widthOnly ? 'Max width (px)' : 'W';
}

// ---- wire up ----------------------------------------------------------------
els.pick.addEventListener('click', () => els.file.click());
els.drop.addEventListener('click', (e) => { if (e.target === els.pick) return; els.file.click(); });
els.drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.file.click(); } });
els.file.addEventListener('change', () => { addFiles(els.file.files); els.file.value = ''; });

['dragenter', 'dragover'].forEach((ev) => els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.remove('drag'); }));
els.drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });

window.addEventListener('paste', (e) => { const files = [...(e.clipboardData?.files || [])]; if (files.length) addFiles(files); });

let reencodeTimer;
const scheduleReencode = () => { clearTimeout(reencodeTimer); reencodeTimer = setTimeout(processAll, 180); };
els.format.addEventListener('change', () => { syncControls(); persist(); processAll(); });
els.quality.addEventListener('input', () => { syncControls(); scheduleReencode(); });
els.quality.addEventListener('change', persist);
for (const el of [els.targetSize, els.resizeW, els.resizeH, els.resizePct]) {
  el.addEventListener('input', () => { syncControls(); scheduleReencode(); });
  el.addEventListener('change', persist);
}
for (const el of [els.resizeMode, els.cropAspect]) {
  el.addEventListener('change', () => { syncControls(); persist(); processAll(); });
}
els.rsPresets.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-w]'); if (!b) return;
  els.resizeW.value = b.dataset.w; syncControls(); persist(); processAll();
});
if (els.subfolder) els.subfolder.addEventListener('change', persist);

els.downloadAll.addEventListener('click', saveAll);
els.clear.addEventListener('click', clearAll);
els.expand.addEventListener('click', () => window.open(location.pathname + '?tab=1'));

if (params.has('tab')) { document.body.classList.add('tab'); els.expand.style.display = 'none'; }

// ---- context-menu entry point (?src=<imageUrl>) -----------------------------
function fileNameFromUrl(url) {
  try {
    if (url.startsWith('data:')) return 'image.png';
    const p = new URL(url).pathname;
    return decodeURIComponent(p.substring(p.lastIndexOf('/') + 1)) || 'image';
  } catch { return 'image'; }
}
async function hasHostPermission(url) {
  if (url.startsWith('data:')) return true;
  if (typeof chrome === 'undefined' || !chrome.permissions) return false;
  try { return await chrome.permissions.contains({ origins: [new URL(url).origin + '/*'] }); } catch { return false; }
}
async function ensureHostPermission(url) {
  if (typeof chrome === 'undefined' || !chrome.permissions) return;
  if (url.startsWith('data:')) return;
  let origin; try { origin = new URL(url).origin + '/*'; } catch { return; }
  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) throw new Error('permission denied');
}

const incomingSrc = params.get('src');
async function loadIncoming(src) {
  const resp = await fetch(src);
  if (!resp.ok) throw new Error('fetch failed');
  const blob = await resp.blob();
  addFiles([new File([blob], fileNameFromUrl(src), { type: blob.type || 'image/png' })]);
}

(function initIncoming() {
  const incoming = $('incoming');
  if (!incomingSrc || !incoming) return;
  let host = incomingSrc; try { host = new URL(incomingSrc).host || 'this page'; } catch {}
  $('incomingText').textContent = `Optimize an image from ${host}?`;
  incoming.hidden = false;
  $('dismissIncoming').addEventListener('click', () => { incoming.hidden = true; });
  $('loadIncoming').addEventListener('click', async () => {
    const btn = $('loadIncoming'); btn.disabled = true; btn.textContent = 'Loading…';
    try {
      await ensureHostPermission(incomingSrc);
      incoming.hidden = true;
      await loadIncoming(incomingSrc);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Load image';
      $('incomingText').textContent = 'Could not load that image (site blocked it or permission denied). Try drag & drop instead.';
    }
  });
})();

// ---- page jobs: "convert all images" / "capture tab" (via ?job=1) -----------
async function fetchListToItems(urls) {
  const files = [];
  let idx = 0;
  async function worker() {
    while (idx < urls.length) {
      const u = urls[idx++];
      try {
        const r = await fetch(u);
        if (!r.ok) continue;
        const b = await r.blob();
        if (!(b.type || '').startsWith('image/') && !IMG_RE.test(u)) continue;
        files.push(new File([b], fileNameFromUrl(u), { type: b.type || 'image/png' }));
      } catch {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, urls.length) }, worker));
  if (files.length) addFiles(files);
  return files.length;
}

function showConvertAllBanner(urls) {
  const el = $('jobBanner'); if (!el) return;
  const setText = (t) => { $('jobText').textContent = t; };
  setText(`Optimize ${urls.length} image${urls.length > 1 ? 's' : ''} from this page?`);
  el.hidden = false;
  $('jobDismiss').onclick = () => { el.hidden = true; };
  $('jobRun').onclick = async () => {
    const btn = $('jobRun'); btn.disabled = true; btn.textContent = 'Loading…';
    try {
      if (typeof chrome !== 'undefined' && chrome.permissions) {
        const ok = await chrome.permissions.request({ origins: ['<all_urls>'] });
        if (!ok) throw new Error('permission denied');
      }
      el.hidden = true;
      const n = await fetchListToItems(urls);
      if (!n) { el.hidden = false; btn.disabled = false; btn.textContent = 'Convert all'; setText('Could not load these images (the site blocked them).'); }
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Convert all';
      setText('Permission denied. Drag & drop the images instead.');
    }
  };
}

async function runJob() {
  if (!params.has('job') || typeof chrome === 'undefined' || !chrome.storage?.local) return;
  let job;
  try { ({ ['cleanor.job']: job } = await chrome.storage.local.get('cleanor.job')); await chrome.storage.local.remove('cleanor.job'); } catch {}
  if (!job) return;
  if (job.type === 'shot' && job.dataUrl) {
    try { const blob = await (await fetch(job.dataUrl)).blob(); addFiles([new File([blob], 'screenshot.png', { type: 'image/png' })]); } catch {}
  } else if (job.type === 'convert-all' && job.urls?.length) {
    showConvertAllBanner(job.urls);
  }
}

// Boot: restore prefs, then auto-run the context-menu conversion / page job if applicable.
applyPrefs().then(async () => {
  await runJob();
  if (AUTO && incomingSrc && await hasHostPermission(incomingSrc)) {
    const incoming = $('incoming'); if (incoming) incoming.hidden = true;
    try { await loadIncoming(incomingSrc); } catch {}
  }
});

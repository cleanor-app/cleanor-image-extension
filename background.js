// Service worker.
// Image context: right-click one image → "Convert image with Cleanor ▸ Save as …".
//   → converts + downloads directly here (OffscreenCanvas), no window, when we already have
//     access to the site; otherwise (or PDF/HEIC/errors) opens the optimizer page.
// Page context:  "Cleanor Image Tools" → convert/download all images + screenshots
//   (visible area / full page via scroll-and-stitch / a selected region). No debugger
//   permission: everything uses activeTab + scripting + captureVisibleTab.

import { convertBlob } from './convert-core.js';

const IMG_PARENT = 'cleanor-img';
const PAGE_PARENT = 'cleanor-page';
const OPEN = 'cleanor-open';
const FMT_PREFIX = 'cleanor-fmt-';
const CONVERT_ALL = 'cleanor-convert-all';
const DOWNLOAD_ALL = 'cleanor-download-all';
const CAP_VISIBLE = 'cleanor-cap-visible';
const CAP_FULL = 'cleanor-cap-full';
const CAP_REGION = 'cleanor-cap-region';

const MIME = { webp: 'image/webp', avif: 'image/avif', jpeg: 'image/jpeg', png: 'image/png' };
const MIME_TYPES = new Set(['image/webp', 'image/avif', 'image/jpeg', 'image/png']);
const FORMATS = [
  ['webp', 'WebP (smallest)'],
  ['avif', 'AVIF (best compression)'],
  ['jpeg', 'JPEG'],
  ['png', 'PNG (lossless)'],
  ['pdf', 'PDF (document)'],
];

function buildMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: IMG_PARENT, title: 'Convert image with Cleanor', contexts: ['image'] });
    for (const [f, label] of FORMATS) {
      chrome.contextMenus.create({ id: FMT_PREFIX + f, parentId: IMG_PARENT, title: 'Save as ' + label, contexts: ['image'] });
    }
    chrome.contextMenus.create({ id: 'cleanor-img-sep', parentId: IMG_PARENT, type: 'separator', contexts: ['image'] });
    chrome.contextMenus.create({ id: OPEN, parentId: IMG_PARENT, title: 'Open in optimizer…', contexts: ['image'] });

    chrome.contextMenus.create({ id: PAGE_PARENT, title: 'Cleanor Image Tools', contexts: ['page'] });
    chrome.contextMenus.create({ id: CONVERT_ALL, parentId: PAGE_PARENT, title: 'Convert all images on this page', contexts: ['page'] });
    chrome.contextMenus.create({ id: DOWNLOAD_ALL, parentId: PAGE_PARENT, title: 'Download all images on this page', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'cleanor-page-sep', parentId: PAGE_PARENT, type: 'separator', contexts: ['page'] });
    chrome.contextMenus.create({ id: CAP_VISIBLE, parentId: PAGE_PARENT, title: 'Screenshot: visible area', contexts: ['page'] });
    chrome.contextMenus.create({ id: CAP_FULL, parentId: PAGE_PARENT, title: 'Screenshot: full page', contexts: ['page'] });
    chrome.contextMenus.create({ id: CAP_REGION, parentId: PAGE_PARENT, title: 'Screenshot: select region', contexts: ['page'] });
  });
}

chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- injected page functions (run in the tab; must be self-contained) --------
function collectImagesInPage() {
  const urls = new Set();
  document.querySelectorAll('img').forEach((img) => { const u = img.currentSrc || img.src; if (u) urls.add(u); });
  document.querySelectorAll('picture source[srcset]').forEach((s) => {
    const first = s.srcset.split(',')[0]?.trim().split(/\s+/)[0]; if (first) urls.add(first);
  });
  return [...urls];
}
function prepareFullPage() {
  const de = document.documentElement;
  const prev = { x: window.scrollX, y: window.scrollY };
  // Force instant scrolling (beats CSS `scroll-behavior:smooth`, which animates and
  // makes the scroll position read stale).
  const style = document.createElement('style');
  style.setAttribute('data-cleanor', '');
  style.textContent = '*{scroll-behavior:auto !important}';
  de.appendChild(style);
  // Find what actually scrolls: the document, or (for SPA layouts like LinkedIn) the
  // tallest inner overflow:scroll/auto element that fills most of the viewport.
  let scroller = 'window';
  const docEl = document.scrollingElement || de;
  if (docEl.scrollHeight <= docEl.clientHeight + 4) {
    let best = null, bestH = 0;
    document.querySelectorAll('*').forEach((el) => {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 50 && el.clientHeight > window.innerHeight * 0.4) {
        if (el.scrollHeight > bestH) { bestH = el.scrollHeight; best = el; }
      }
    });
    if (best) scroller = best;
  }
  window.__cleanorScroller = scroller;
  const hidden = [];
  document.querySelectorAll('*').forEach((el) => {
    const s = getComputedStyle(el);
    if ((s.position === 'fixed' || s.position === 'sticky') && el.offsetHeight > 0) { hidden.push([el, el.style.visibility]); el.style.visibility = 'hidden'; }
  });
  window.__cleanorRestore = () => { hidden.forEach(([el, v]) => { el.style.visibility = v; }); style.remove(); if (scroller !== 'window') try { scroller.scrollTop = 0; } catch {} window.scrollTo(prev.x, prev.y); };
  return { viewportHeight: window.innerHeight, viewportWidth: window.innerWidth, dpr: window.devicePixelRatio || 1 };
}
function selectRegionInPage() {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(20,30,60,.12)';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;border:2px solid #4576fd;background:rgba(69,118,253,.14);pointer-events:none;display:none;box-shadow:0 0 0 100vmax rgba(20,30,60,.25)';
    ov.appendChild(box); document.documentElement.appendChild(ov);
    let sx = 0, sy = 0, drag = false;
    const done = (rect) => { ov.remove(); window.removeEventListener('keydown', onKey, true); resolve(rect); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); done(null); } };
    window.addEventListener('keydown', onKey, true);
    ov.addEventListener('mousedown', (e) => { drag = true; sx = e.clientX; sy = e.clientY; box.style.display = 'block'; box.style.left = sx + 'px'; box.style.top = sy + 'px'; box.style.width = '0px'; box.style.height = '0px'; });
    ov.addEventListener('mousemove', (e) => { if (!drag) return; const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY); box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = Math.abs(e.clientX - sx) + 'px'; box.style.height = Math.abs(e.clientY - sy) + 'px'; });
    ov.addEventListener('mouseup', (e) => {
      if (!drag) { done(null); return; }
      drag = false;
      const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY), w = Math.abs(e.clientX - sx), h = Math.abs(e.clientY - sy);
      if (w < 5 || h < 5) { done(null); return; }
      done({ x, y, w, h, dpr: window.devicePixelRatio || 1 });
    });
  });
}

// ---- helpers ----------------------------------------------------------------
async function collectUrls(tabId) {
  try {
    const res = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: collectImagesInPage });
    const all = new Set();
    for (const r of res) (r.result || []).forEach((u) => all.add(u));
    return [...all].filter((u) => /^https?:\/\//.test(u) || u.startsWith('data:'));
  } catch (e) { return []; }
}
function safeName(url, i) {
  try {
    if (url.startsWith('data:')) { const m = /data:image\/([a-z0-9]+)/i.exec(url); return `image-${i + 1}.${(m && m[1]) || 'png'}`; }
    const p = new URL(url).pathname;
    let n = decodeURIComponent(p.slice(p.lastIndexOf('/') + 1)) || `image-${i + 1}`;
    if (!/\.\w{2,5}$/.test(n)) n += '.img';
    return n;
  } catch { return `image-${i + 1}`; }
}
function flashBadge(n) {
  try {
    chrome.action.setBadgeBackgroundColor({ color: '#4576fd' });
    chrome.action.setBadgeText({ text: n ? String(n) : '' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
  } catch {}
}
async function getPrefs() {
  try { const o = await chrome.storage.local.get('cleanor.prefs'); return o['cleanor.prefs'] || {}; } catch { return {}; }
}
async function hasOrigin(url) {
  if (url.startsWith('data:')) return true;
  try { return await chrome.permissions.contains({ origins: [new URL(url).origin + '/*'] }); } catch { return false; }
}
function toBase64(buf) {
  const u = new Uint8Array(buf); let s = ''; const CH = 0x8000;
  for (let i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
  return btoa(s);
}
async function blobToDataUrl(blob) { return 'data:' + blob.type + ';base64,' + toBase64(await blob.arrayBuffer()); }
function openOptimizer(srcUrl, fmt) {
  const s = encodeURIComponent(srcUrl);
  const u = fmt ? `popup.html?tab=1&auto=1&format=${fmt}&src=${s}` : `popup.html?tab=1&src=${s}`;
  chrome.tabs.create({ url: chrome.runtime.getURL(u) });
}
async function startJob(job) {
  await chrome.storage.local.set({ 'cleanor.job': job });
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1&job=1') });
}
async function captureTab(windowId) {
  for (let i = 0; i < 6; i++) {
    try { return await chrome.tabs.captureVisibleTab(windowId, { format: 'png' }); }
    catch (e) { if (/MAX_CAPTURE/i.test(e.message || '')) { await sleep(600); continue; } throw e; }
  }
  throw new Error('capture failed');
}

// ---- direct image save ------------------------------------------------------
async function directSave(srcUrl, fmt) {
  const type = MIME[fmt];
  const resp = await fetch(srcUrl);
  if (!resp.ok) throw new Error('fetch ' + resp.status);
  const src = await resp.blob();
  const p = await getPrefs();
  const opts = {
    format: type, quality: Number(p.quality) || 80,
    target: Number(p.target) > 0 ? Number(p.target) * 1024 : 0,
    resizeMode: p.resizeMode || 'off', resizeW: Number(p.resizeW) || 0, resizeH: Number(p.resizeH) || 0,
    resizePct: Number(p.resizePct) || 100, cropAspect: p.crop || 'off',
  };
  const { blob, ext } = await convertBlob(src, opts);
  const base = safeName(srcUrl, 0).replace(/\.[^.]+$/, '') || 'image';
  const filename = (p.subfolder !== false ? 'Cleanor/' : '') + `${base}-cleanor.app.${ext}`;
  await chrome.downloads.download({ url: await blobToDataUrl(blob), filename, saveAs: false });
  flashBadge(1);
}

// ---- minimal STORE zip (no lib; images are already compressed) --------------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new Uint8Array(30 + name.length), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, size, true); dv.setUint32(22, size, true); dv.setUint16(26, name.length, true);
    lh.set(name, 30); parts.push(lh, f.data);
    const cd = new Uint8Array(46 + name.length), cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, size, true); cv.setUint32(24, size, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
    cd.set(name, 46); central.push(cd); offset += lh.length + size;
  }
  const cSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cSize, true); ev.setUint32(16, offset, true);
  const all = [...parts, ...central, end], total = all.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total); let p = 0; for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}
function uniqueName(used, base) {
  let n = base, i = 1;
  while (used.has(n)) { const d = base.lastIndexOf('.'); n = d > 0 ? base.slice(0, d) + '-' + i + base.slice(d) : base + '-' + i; i++; }
  used.add(n); return n;
}
async function fetchEach(urls, worker, concurrency = 6) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length || 1) }, async () => {
    while (idx < urls.length) { const i = idx++; try { await worker(urls[i], i); } catch {} }
  }));
}
async function downloadZip(files, name) {
  const p = await getPrefs();
  const dataUrl = 'data:application/zip;base64,' + toBase64(makeZip(files).buffer);
  await chrome.downloads.download({ url: dataUrl, filename: (p.subfolder !== false ? 'Cleanor/' : '') + name, saveAs: false });
  flashBadge(files.length);
}

// ---- page images ------------------------------------------------------------
// Download every image on the page as ONE zip. Fetching needs site access (activeTab
// covers same-origin; the "all sites" toggle covers the rest). If nothing is fetchable,
// fall back to downloading each by URL (works cross-origin without host access).
async function downloadAllOnPage(tabId, pageUrl) {
  const urls = (await collectUrls(tabId)).slice(0, 100).filter((u) => !(u.startsWith('data:') && u.length > 3_000_000));
  const files = [], used = new Set();
  await fetchEach(urls, async (u) => {
    const r = await fetch(u); if (!r.ok) return;
    files.push({ name: uniqueName(used, safeName(u, files.length)), data: new Uint8Array(await r.arrayBuffer()) });
  });
  const total = files.reduce((a, f) => a + f.data.length, 0);
  if (files.length && total <= 45 * 1024 * 1024) { await downloadZip(files, `${hostOf(pageUrl)}-images-${files.length}-cleanor.zip`); return; }
  let n = 0; // fallback: nothing reachable, or archive too large → per-URL downloads
  for (const u of urls) { try { chrome.downloads.download({ url: u, filename: 'Cleanor/' + safeName(u, n), saveAs: false }); n++; } catch {} }
  flashBadge(n);
}

// Convert every image on the page with the user's current settings, into ONE zip.
async function convertAllOnPage(tabId, pageUrl) {
  const urls = (await collectUrls(tabId)).slice(0, 100).filter((u) => !(u.startsWith('data:') && u.length > 3_000_000));
  const p = await getPrefs();
  let type = p.format || 'image/webp';
  if (!MIME_TYPES.has(type)) type = 'image/webp'; // PDF/unknown → WebP for a batch
  const opts = {
    format: type, quality: Number(p.quality) || 80, target: Number(p.target) > 0 ? Number(p.target) * 1024 : 0,
    resizeMode: p.resizeMode || 'off', resizeW: Number(p.resizeW) || 0, resizeH: Number(p.resizeH) || 0,
    resizePct: Number(p.resizePct) || 100, cropAspect: p.crop || 'off',
  };
  const files = [], used = new Set();
  await fetchEach(urls, async (u) => {
    const r = await fetch(u); if (!r.ok) return;
    const { blob, ext } = await convertBlob(await r.blob(), opts);
    const base = (safeName(u, files.length).replace(/\.[^.]+$/, '') || 'image');
    files.push({ name: uniqueName(used, `${base}-cleanor.app.${ext}`), data: new Uint8Array(await blob.arrayBuffer()) });
  }, 4);
  if (files.length) { await downloadZip(files, `${hostOf(pageUrl)}-converted-${files.length}-cleanor.zip`); return; }
  await startJob({ type: 'convert-all', urls }); // nothing fetchable → optimizer page (asks for access)
}

// ---- screenshots (download directly, no window) -----------------------------
// PNG by default; fall back to high-quality WebP if the PNG is huge (very tall pages)
// so the data-URL download stays reliable.
async function canvasToShot(canvas) {
  let blob = await canvas.convertToBlob({ type: 'image/png' });
  let ext = 'png';
  if (blob.size > 5 * 1024 * 1024) { blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.92 }); ext = 'webp'; }
  return { blob, ext };
}
function hostOf(pageUrl) {
  try { return (new URL(pageUrl).hostname.replace(/^www\./, '') || 'page').replace(/[^a-z0-9.-]/gi, ''); } catch { return 'page'; }
}
function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}
// Useful, human-readable filename: <site>-<kind>-<YYYY-MM-DD_HH-mm-ss>.<ext>
async function downloadShot(dataUrl, kind, ext, pageUrl) {
  const p = await getPrefs();
  const filename = (p.subfolder !== false ? 'Cleanor/' : '') + `${hostOf(pageUrl)}-${kind}-${stamp()}-cleanor.app.${ext}`;
  await chrome.downloads.download({ url: dataUrl, filename, saveAs: false });
  flashBadge(1);
}

async function captureVisible(tab, pageUrl) {
  const dataUrl = await captureTab(tab.windowId); // already a PNG data URL
  await downloadShot(dataUrl, 'visible', 'png', pageUrl);
}
const exec = (tabId, func, args) => chrome.scripting.executeScript(args ? { target: { tabId }, func, args } : { target: { tabId }, func });
function readScrollPos() {
  const s = window.__cleanorScroller;
  if (s && s !== 'window') return { y: Math.round(s.scrollTop), max: Math.round(s.scrollHeight - s.clientHeight) };
  const de = document.scrollingElement || document.documentElement;
  return { y: Math.round(window.scrollY), max: Math.round(de.scrollHeight - window.innerHeight) };
}
function scrollTo1(yy) {
  const s = window.__cleanorScroller;
  if (s && s !== 'window') s.scrollTop = yy; else window.scrollTo(0, yy);
}
// Capture the whole scrollable content, one viewport at a time, re-measuring each step so
// lazy/infinite pages (LinkedIn etc.) that grow while scrolling are handled. Stitched after.
async function captureFullPage(tab, pageUrl) {
  const [{ result: m }] = await exec(tab.id, prepareFullPage);
  const scale = m.dpr, vh = m.viewportHeight, vw = m.viewportWidth;
  const MAX_SLICES = 20;
  const slices = [];
  let last = -1;
  try {
    for (let i = 0; i < MAX_SLICES; i++) {
      const [{ result: pos }] = await exec(tab.id, readScrollPos);
      await sleep(260); // let the viewport paint
      slices.push({ y: pos.y, dataUrl: await captureTab(tab.windowId) });
      if (pos.y >= pos.max - 1) break;      // reached the bottom
      if (pos.y <= last) break;             // couldn't advance
      last = pos.y;
      await exec(tab.id, scrollTo1, [pos.y + vh]);
      await sleep(450); // let lazy content load & settle
    }
  } finally {
    await exec(tab.id, () => { window.__cleanorRestore && window.__cleanorRestore(); }).catch(() => {});
  }
  const firstY = slices.length ? slices[0].y : 0;
  const maxY = slices.reduce((a, s) => Math.max(a, s.y), 0);
  const totalCss = Math.min((maxY - firstY) + vh, Math.floor(32000 / scale));
  const canvas = new OffscreenCanvas(Math.round(vw * scale), Math.round(totalCss * scale));
  const ctx = canvas.getContext('2d');
  for (const s of slices) {
    const bmp = await createImageBitmap(await (await fetch(s.dataUrl)).blob());
    ctx.drawImage(bmp, 0, Math.round((s.y - firstY) * scale));
    bmp.close?.();
  }
  const { blob, ext } = await canvasToShot(canvas);
  await downloadShot(await blobToDataUrl(blob), 'full-page', ext, pageUrl);
}
async function captureRegion(tab, pageUrl) {
  const [{ result: rect }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: selectRegionInPage });
  if (!rect) return;
  await sleep(90); // let the overlay clear before capturing
  const shot = await captureTab(tab.windowId);
  const bmp = await createImageBitmap(await (await fetch(shot)).blob());
  const s = rect.dpr;
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(rect.w * s)), Math.max(1, Math.round(rect.h * s)));
  canvas.getContext('2d').drawImage(bmp, Math.round(rect.x * s), Math.round(rect.y * s), Math.round(rect.w * s), Math.round(rect.h * s), 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const { blob, ext } = await canvasToShot(canvas);
  await downloadShot(await blobToDataUrl(blob), 'region', ext, pageUrl);
}

// ---- dispatch ---------------------------------------------------------------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);

  if (info.srcUrl && id === OPEN) { openOptimizer(info.srcUrl); return; }
  if (info.srcUrl && id.startsWith(FMT_PREFIX)) {
    const fmt = id.slice(FMT_PREFIX.length);
    const heic = /\.hei[cf](\?|$)/i.test(info.srcUrl);
    if (fmt !== 'pdf' && !heic && await hasOrigin(info.srcUrl)) {
      try { await directSave(info.srcUrl, fmt); return; } catch (e) { /* fall through */ }
    }
    openOptimizer(info.srcUrl, fmt);
    return;
  }
  if (!tab?.id) return;

  if (id === DOWNLOAD_ALL) { downloadAllOnPage(tab.id, info.pageUrl); return; }
  if (id === CONVERT_ALL) { convertAllOnPage(tab.id, info.pageUrl); return; }
  if (id === CAP_VISIBLE) { try { await captureVisible(tab, info.pageUrl); } catch {} return; }
  if (id === CAP_FULL) { try { await captureFullPage(tab, info.pageUrl); } catch {} return; }
  if (id === CAP_REGION) { try { await captureRegion(tab, info.pageUrl); } catch {} return; }
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'open-optimizer') chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1') });
});

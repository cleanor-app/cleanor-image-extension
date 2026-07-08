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
  const de = document.documentElement, body = document.body;
  const totalHeight = Math.min(30000, Math.max(de.scrollHeight, body ? body.scrollHeight : 0, de.offsetHeight));
  const prev = { x: window.scrollX, y: window.scrollY, behavior: de.style.scrollBehavior };
  de.style.scrollBehavior = 'auto';
  const hidden = [];
  document.querySelectorAll('*').forEach((el) => {
    const s = getComputedStyle(el);
    if ((s.position === 'fixed' || s.position === 'sticky') && el.offsetHeight > 0) { hidden.push([el, el.style.visibility]); el.style.visibility = 'hidden'; }
  });
  window.__cleanorRestore = () => { hidden.forEach(([el, v]) => { el.style.visibility = v; }); de.style.scrollBehavior = prev.behavior; window.scrollTo(prev.x, prev.y); };
  return { totalHeight, viewportHeight: window.innerHeight, viewportWidth: window.innerWidth, dpr: window.devicePixelRatio || 1 };
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

// ---- page images ------------------------------------------------------------
async function downloadAllOnPage(tabId) {
  const urls = (await collectUrls(tabId)).slice(0, 100);
  let n = 0;
  for (const u of urls) {
    if (u.startsWith('data:') && u.length > 3_000_000) continue;
    try { chrome.downloads.download({ url: u, filename: 'Cleanor/' + safeName(u, n), saveAs: false }); n++; } catch {}
  }
  flashBadge(n);
}

// ---- screenshots ------------------------------------------------------------
async function captureVisible(tab) {
  const dataUrl = await captureTab(tab.windowId);
  await startJob({ type: 'shot', dataUrl, name: 'screenshot' });
}
async function captureFullPage(tab) {
  const [{ result: m }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: prepareFullPage });
  const scale = m.dpr;
  const canvas = new OffscreenCanvas(Math.round(m.viewportWidth * scale), Math.round(m.totalHeight * scale));
  const ctx = canvas.getContext('2d');
  let y = 0, guard = 0;
  try {
    while (guard++ < 60) {
      const [{ result: actualY }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (yy) => { window.scrollTo(0, yy); return window.scrollY; }, args: [y] });
      await sleep(220);
      const shot = await captureTab(tab.windowId);
      const bmp = await createImageBitmap(await (await fetch(shot)).blob());
      ctx.drawImage(bmp, 0, Math.round(actualY * scale));
      bmp.close?.();
      if (actualY + m.viewportHeight >= m.totalHeight - 1) break;
      y = actualY + m.viewportHeight;
      await sleep(320); // respect captureVisibleTab rate limit
    }
  } finally {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { window.__cleanorRestore && window.__cleanorRestore(); } }).catch(() => {});
  }
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  await startJob({ type: 'shot', dataUrl: await blobToDataUrl(blob), name: 'full-page' });
}
async function captureRegion(tab) {
  const [{ result: rect }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: selectRegionInPage });
  if (!rect) return;
  await sleep(90); // let the overlay clear before capturing
  const shot = await captureTab(tab.windowId);
  const bmp = await createImageBitmap(await (await fetch(shot)).blob());
  const s = rect.dpr;
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(rect.w * s)), Math.max(1, Math.round(rect.h * s)));
  canvas.getContext('2d').drawImage(bmp, Math.round(rect.x * s), Math.round(rect.y * s), Math.round(rect.w * s), Math.round(rect.h * s), 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  await startJob({ type: 'shot', dataUrl: await blobToDataUrl(blob), name: 'region' });
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

  if (id === DOWNLOAD_ALL) { downloadAllOnPage(tab.id); return; }
  if (id === CONVERT_ALL) { const urls = await collectUrls(tab.id); await startJob({ type: 'convert-all', urls }); return; }
  if (id === CAP_VISIBLE) { try { await captureVisible(tab); } catch {} return; }
  if (id === CAP_FULL) { try { await captureFullPage(tab); } catch {} return; }
  if (id === CAP_REGION) { try { await captureRegion(tab); } catch {} return; }
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'open-optimizer') chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1') });
});

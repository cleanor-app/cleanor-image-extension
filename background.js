// Service worker.
// Image context: right-click one image → "Convert image with Cleanor ▸ Save as …".
//   → When we already have access to that site, the file is converted and downloaded
//     directly here (OffscreenCanvas), with NO window. Otherwise (or for PDF/HEIC/errors)
//     we fall back to opening the optimizer page, which gets permission under a gesture.
// Page context:  right-click the page → convert/download all images, capture the tab.
// The optimizer UI opens only from the toolbar icon (or "Open in optimizer…").

import { convertBlob } from './convert-core.js';

const IMG_PARENT = 'cleanor-img';
const PAGE_PARENT = 'cleanor-page';
const OPEN = 'cleanor-open';
const FMT_PREFIX = 'cleanor-fmt-';
const CONVERT_ALL = 'cleanor-convert-all';
const DOWNLOAD_ALL = 'cleanor-download-all';
const CAPTURE = 'cleanor-capture';

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
    chrome.contextMenus.create({ id: CAPTURE, parentId: PAGE_PARENT, title: 'Capture & optimize this tab', contexts: ['page'] });
  });
}

chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);

// ---- helpers ----------------------------------------------------------------
function collectImagesInPage() {
  const urls = new Set();
  document.querySelectorAll('img').forEach((img) => { const u = img.currentSrc || img.src; if (u) urls.add(u); });
  document.querySelectorAll('picture source[srcset]').forEach((s) => {
    const first = s.srcset.split(',')[0]?.trim().split(/\s+/)[0]; if (first) urls.add(first);
  });
  return [...urls];
}
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
  const u = new Uint8Array(buf);
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
  return btoa(s);
}
function openOptimizer(srcUrl, fmt) {
  const s = encodeURIComponent(srcUrl);
  const u = fmt ? `popup.html?tab=1&auto=1&format=${fmt}&src=${s}` : `popup.html?tab=1&src=${s}`;
  chrome.tabs.create({ url: chrome.runtime.getURL(u) });
}

// Direct, windowless convert + download (SW OffscreenCanvas). Throws on failure so the
// caller can fall back to the optimizer page.
async function directSave(srcUrl, fmt) {
  const type = MIME[fmt];
  const resp = await fetch(srcUrl);
  if (!resp.ok) throw new Error('fetch ' + resp.status);
  const src = await resp.blob();
  const p = await getPrefs();
  const opts = {
    format: type,
    quality: Number(p.quality) || 80,
    target: Number(p.target) > 0 ? Number(p.target) * 1024 : 0,
    resizeMode: p.resizeMode || 'off',
    resizeW: Number(p.resizeW) || 0,
    resizeH: Number(p.resizeH) || 0,
    resizePct: Number(p.resizePct) || 100,
    cropAspect: p.crop || 'off',
  };
  const { blob, ext } = await convertBlob(src, opts);
  const dataUrl = 'data:' + blob.type + ';base64,' + toBase64(await blob.arrayBuffer());
  const base = safeName(srcUrl, 0).replace(/\.[^.]+$/, '') || 'image';
  const filename = (p.subfolder !== false ? 'Cleanor/' : '') + `${base}-cleanor.app.${ext}`;
  await chrome.downloads.download({ url: dataUrl, filename, saveAs: false });
  flashBadge(1);
}

async function downloadAllOnPage(tabId) {
  const urls = (await collectUrls(tabId)).slice(0, 100);
  let n = 0;
  for (const u of urls) {
    if (u.startsWith('data:') && u.length > 3_000_000) continue;
    try { chrome.downloads.download({ url: u, filename: 'Cleanor/' + safeName(u, n), saveAs: false }); n++; } catch {}
  }
  flashBadge(n);
}

async function startJob(job) {
  await chrome.storage.local.set({ 'cleanor.job': job });
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1&job=1') });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);

  // single image
  if (info.srcUrl && id === OPEN) { openOptimizer(info.srcUrl); return; }
  if (info.srcUrl && id.startsWith(FMT_PREFIX)) {
    const fmt = id.slice(FMT_PREFIX.length);
    // PDF (and HEIC input) need the full page pipeline; everything else tries a direct save.
    const heic = /\.hei[cf](\?|$)/i.test(info.srcUrl);
    if (fmt !== 'pdf' && !heic && await hasOrigin(info.srcUrl)) {
      try { await directSave(info.srcUrl, fmt); return; } catch (e) { /* fall through */ }
    }
    openOptimizer(info.srcUrl, fmt); // gets permission under a gesture, then converts + downloads
    return;
  }
  if (!tab?.id) return;

  // whole page
  if (id === DOWNLOAD_ALL) { downloadAllOnPage(tab.id); return; }
  if (id === CONVERT_ALL) { const urls = await collectUrls(tab.id); await startJob({ type: 'convert-all', urls }); return; }
  if (id === CAPTURE) {
    try { const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }); await startJob({ type: 'shot', dataUrl }); } catch {}
    return;
  }
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'open-optimizer') chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1') });
});

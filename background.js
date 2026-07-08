// Service worker.
// Image context: right-click one image → "Convert image with Cleanor ▸ …".
// Page context:  right-click the page  → "Cleanor Image Tools ▸ convert/download all, capture tab".
// The worker never fetches image bytes for conversion; it hands work to the optimizer page,
// which asks for one-time permission and does the fetch under a user gesture (least privilege).

const IMG_PARENT = 'cleanor-img';
const PAGE_PARENT = 'cleanor-page';
const OPEN = 'cleanor-open';
const FMT_PREFIX = 'cleanor-fmt-';
const CONVERT_ALL = 'cleanor-convert-all';
const DOWNLOAD_ALL = 'cleanor-download-all';
const CAPTURE = 'cleanor-capture';

const FORMATS = [
  ['webp', 'WebP (smallest)'],
  ['avif', 'AVIF (best compression)'],
  ['jpeg', 'JPEG'],
  ['png', 'PNG (lossless)'],
  ['pdf', 'PDF (document)'],
];

function buildMenu() {
  chrome.contextMenus.removeAll(() => {
    // --- single image ---
    chrome.contextMenus.create({ id: IMG_PARENT, title: 'Convert image with Cleanor', contexts: ['image'] });
    for (const [f, label] of FORMATS) {
      chrome.contextMenus.create({ id: FMT_PREFIX + f, parentId: IMG_PARENT, title: 'Save as ' + label, contexts: ['image'] });
    }
    chrome.contextMenus.create({ id: 'cleanor-img-sep', parentId: IMG_PARENT, type: 'separator', contexts: ['image'] });
    chrome.contextMenus.create({ id: OPEN, parentId: IMG_PARENT, title: 'Open in optimizer…', contexts: ['image'] });

    // --- whole page ---
    chrome.contextMenus.create({ id: PAGE_PARENT, title: 'Cleanor Image Tools', contexts: ['page'] });
    chrome.contextMenus.create({ id: CONVERT_ALL, parentId: PAGE_PARENT, title: 'Convert all images on this page', contexts: ['page'] });
    chrome.contextMenus.create({ id: DOWNLOAD_ALL, parentId: PAGE_PARENT, title: 'Download all images on this page', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'cleanor-page-sep', parentId: PAGE_PARENT, type: 'separator', contexts: ['page'] });
    chrome.contextMenus.create({ id: CAPTURE, parentId: PAGE_PARENT, title: 'Capture & optimize this tab', contexts: ['page'] });
  });
}

chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);

// Injected into the page (needs activeTab). Collects every rendered image URL, all frames.
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

async function startJob(job) {
  await chrome.storage.local.set({ 'cleanor.job': job });
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1&job=1') });
}

async function downloadAllOnPage(tabId) {
  const urls = (await collectUrls(tabId)).slice(0, 100);
  let n = 0;
  for (const u of urls) {
    if (u.startsWith('data:') && u.length > 3_000_000) continue; // skip huge inline blobs
    try { chrome.downloads.download({ url: u, filename: 'Cleanor/' + safeName(u, n), saveAs: false }); n++; } catch {}
  }
  flashBadge(n);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);

  // single image
  if (info.srcUrl && (id === OPEN || id.startsWith(FMT_PREFIX))) {
    const src = encodeURIComponent(info.srcUrl);
    const url = id === OPEN
      ? chrome.runtime.getURL(`popup.html?tab=1&src=${src}`)
      : chrome.runtime.getURL(`popup.html?tab=1&auto=1&format=${id.slice(FMT_PREFIX.length)}&src=${src}`);
    chrome.tabs.create({ url });
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

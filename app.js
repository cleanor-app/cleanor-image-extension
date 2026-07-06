'use strict';

// Cleanor Image Optimizer — all processing is local (canvas), nothing is uploaded.

const $ = (id) => document.getElementById(id);
const els = {
  drop: $('drop'), file: $('file'), pick: $('pick'),
  format: $('format'), quality: $('quality'), qval: $('qval'), qualityField: $('qualityField'),
  maxw: $('maxw'), mwval: $('mwval'),
  results: $('results'), list: $('list'), summary: $('summary'),
  downloadAll: $('downloadAll'), clear: $('clear'), expand: $('expand'),
  rowTpl: $('rowTpl'),
};

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** @type {{file:File, name:string, base:string, origSize:number, blob?:Blob, outName?:string, outUrl?:string, thumbUrl?:string, error?:string}[]} */
let items = [];
let busy = false;

// ---- helpers ----------------------------------------------------------------
function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}
function baseName(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), type, quality);
  });
}

// ---- core conversion --------------------------------------------------------
async function encodeOne(file) {
  const type = els.format.value;
  const q = Number(els.quality.value) / 100;
  const maxW = Number(els.maxw.value);

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (maxW > 0 && width > maxW) {
    height = Math.round((height * maxW) / width);
    width = maxW;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (type === 'image/jpeg') {
    // JPEG has no alpha — flatten onto white so transparency doesn't turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const useQuality = type === 'image/png' ? undefined : q;
  return canvasToBlob(canvas, type, useQuality);
}

async function processAll() {
  if (busy || !items.length) return;
  busy = true;
  els.downloadAll.disabled = true;
  const type = els.format.value;

  for (const it of items) {
    // revoke old output
    if (it.outUrl) URL.revokeObjectURL(it.outUrl);
    it.blob = undefined;
    it.outUrl = undefined;
    it.error = undefined;
    try {
      const blob = await encodeOne(it.file);
      it.blob = blob;
      it.outName = `${it.base}.${EXT[type]}`;
      it.outUrl = URL.createObjectURL(blob);
    } catch (e) {
      it.error = 'Could not read this image';
    }
  }
  busy = false;
  render();
}

// ---- rendering --------------------------------------------------------------
function render() {
  els.results.hidden = items.length === 0;
  els.list.textContent = '';

  let totalIn = 0;
  let totalOut = 0;
  for (const it of items) {
    const node = els.rowTpl.content.firstElementChild.cloneNode(true);
    const img = node.querySelector('.thumb');
    if (!it.thumbUrl) it.thumbUrl = URL.createObjectURL(it.file);
    img.src = it.thumbUrl;
    node.querySelector('.name').textContent = it.outName || it.file.name;

    const sizesEl = node.querySelector('.sizes');
    const deltaEl = node.querySelector('.delta');
    const dlBtn = node.querySelector('.dl');

    if (it.error) {
      sizesEl.textContent = it.error;
      deltaEl.textContent = '—';
      dlBtn.disabled = true;
    } else if (it.blob) {
      totalIn += it.origSize;
      totalOut += it.blob.size;
      sizesEl.textContent = `${formatBytes(it.origSize)} → ${formatBytes(it.blob.size)}`;
      const pct = Math.round((1 - it.blob.size / it.origSize) * 100);
      if (pct >= 0) {
        deltaEl.textContent = `−${pct}%`;
        deltaEl.classList.add('save');
      } else {
        deltaEl.textContent = `+${-pct}%`;
        deltaEl.classList.add('grow');
      }
      dlBtn.addEventListener('click', () => saveOne(it));
    } else {
      sizesEl.textContent = 'working…';
      deltaEl.textContent = '';
      dlBtn.disabled = true;
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
  els.downloadAll.disabled = !items.some((it) => it.blob);
}

// ---- downloads --------------------------------------------------------------
function saveOne(it) {
  if (!it.outUrl) return;
  const a = document.createElement('a');
  a.href = it.outUrl;
  a.download = it.outName;
  a.click();
}
async function saveAll() {
  for (const it of items) {
    if (!it.blob) continue;
    saveOne(it);
    await new Promise((r) => setTimeout(r, 250)); // let Chrome queue each download
  }
}

// ---- input handling ---------------------------------------------------------
function addFiles(fileList) {
  const imgs = [...fileList].filter((f) => f.type.startsWith('image/'));
  for (const f of imgs) {
    items.push({ file: f, name: f.name, base: baseName(f.name), origSize: f.size });
  }
  if (imgs.length) processAll();
}

function clearAll() {
  for (const it of items) {
    if (it.outUrl) URL.revokeObjectURL(it.outUrl);
    if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
  }
  items = [];
  render();
}

// ---- wire up ----------------------------------------------------------------
function syncControls() {
  els.qval.textContent = els.quality.value;
  els.mwval.textContent = Number(els.maxw.value) === 0 ? 'original' : els.maxw.value + 'px';
  els.qualityField.style.display = els.format.value === 'image/png' ? 'none' : '';
}

els.pick.addEventListener('click', () => els.file.click());
els.drop.addEventListener('click', (e) => {
  if (e.target === els.pick) return;
  els.file.click();
});
els.drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.file.click(); }
});
els.file.addEventListener('change', () => { addFiles(els.file.files); els.file.value = ''; });

['dragenter', 'dragover'].forEach((ev) =>
  els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) =>
  els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.remove('drag'); }));
els.drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });

window.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) addFiles(files);
});

let reencodeTimer;
const scheduleReencode = () => { clearTimeout(reencodeTimer); reencodeTimer = setTimeout(processAll, 120); };
els.format.addEventListener('change', () => { syncControls(); processAll(); });
els.quality.addEventListener('input', () => { syncControls(); scheduleReencode(); });
els.maxw.addEventListener('input', () => { syncControls(); scheduleReencode(); });

els.downloadAll.addEventListener('click', saveAll);
els.clear.addEventListener('click', clearAll);
els.expand.addEventListener('click', () => window.open(location.href + '?tab=1'));

if (new URLSearchParams(location.search).has('tab')) {
  document.body.classList.add('tab');
  els.expand.style.display = 'none';
}

syncControls();

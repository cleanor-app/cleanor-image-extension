# Cleanor Image Optimizer — Chrome extension

**Compress images and convert between WebP, JPEG and PNG, right in your browser.** Drop images into the popup, pick a format and quality, and download the smaller files. Everything runs locally on your device — **nothing is uploaded, no account, no tracking.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-34a853.svg)](manifest.json)
[![Try on the web](https://img.shields.io/badge/or%20use%20it%20online-cleanor.app%2Ftools-0a7cff.svg)](https://cleanor.app/tools)

> 🔒 A privacy-first companion to the free tools at **[cleanor.app/tools](https://cleanor.app/tools)**. Same idea, in your toolbar.

## Features

- **Compress** JPEG / WebP / AVIF with a quality slider, or re-save PNG losslessly.
- **Convert formats** — PNG, JPEG, WebP, AVIF, GIF and BMP go **in**; WebP, AVIF, JPEG or PNG come **out**.
- **Right-click any image** on a page → "Optimize image with Cleanor".
- **Batch** — drop, pick or paste many images at once; see per-image and total savings.
- **Resize** — optional max-width cap.
- **100% local** — WebP/JPEG/PNG use the browser's own Canvas encoder; AVIF uses a bundled WASM codec ([@jsquash/avif](https://github.com/jamsinclair/jSquash)). Nothing is ever uploaded.

## Install

**From the Chrome Web Store:** _(pending review — link here once published)_

**Load unpacked (for development / review):**
1. Clone this repo.
2. Open `chrome://extensions`, enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder.
4. Pin the Cleanor icon and click it — the optimizer opens as a popup. Use **Open larger ↗** for a full-tab workspace.

## How it works

The popup decodes each image with `createImageBitmap()`, draws it to a `<canvas>` (flattening onto white for JPEG), and re-encodes with `canvas.toBlob(type, quality)`. AVIF output — which Canvas cannot produce — is encoded by a vendored single-thread WASM codec loaded on demand (`vendor/avif/`). Files come from drag/drop, the file picker, or clipboard paste and never leave the page.

### Permissions

- `contextMenus` — the one right-click menu entry on images.
- `optional_host_permissions: <all_urls>` — **not granted at install.** Only when you use the right-click entry and confirm "Load image" does it ask for access to that **one site**, to fetch that single image. Drag-and-drop needs no permission.
- `wasm-unsafe-eval` (CSP) — to run the AVIF encoder locally. No network access.
- No tabs, cookies, history, analytics, or data collection.

## Privacy

No data is collected, stored, or transmitted. All image processing happens in the extension page on your machine. Full policy: https://cleanor.app/privacy

## Build the store zip

```bash
zip -r -X cleanor-image-extension.zip . \
  -x '*.git*' -x 'store-listing/*' -x 'README.md' -x 'LICENSE'
```

## License

[MIT](LICENSE) © Cleanor Labs. More at [cleanor.app/tools](https://cleanor.app/tools) and open datasets at [cleanor.app/research](https://cleanor.app/research).

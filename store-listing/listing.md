# Chrome Web Store — listing copy & submission checklist

Everything below is ready to paste into the Chrome Web Store Developer Dashboard.

## Basics

- **Name:** Cleanor Image Optimizer: Compress & Convert
- **Summary (≤132 chars):** Compress and convert images (incl. HEIC & AVIF) right in your browser. Private by design: your files never leave the device.
- **Category:** Productivity (alt: Developer Tools)
- **Language:** English

## Detailed description

Compress and convert images without ever uploading them. Cleanor Image Optimizer shrinks your pictures and converts them between modern formats entirely inside your browser — no account, no servers, no tracking. Perfect for faster websites, smaller email attachments, iPhone HEIC photos, and anyone who works with sensitive or client images.

COMPRESS & CONVERT
• Shrink images up to 90% with a quality slider — or set an exact target like "under 200 KB" and let Cleanor find the best quality automatically.
• Convert to WebP, AVIF, JPEG, PNG or PDF.
• Open HEIC (iPhone) and AVIF photos and save them as universal WebP, JPEG or PNG.
• See exactly how much you saved on every image.

RESIZE, CROP & BATCH
• Resize by max width, fit within W×H, exact dimensions, or a percentage — with one-tap presets (4K, 1920, 1280, 800).
• Crop to an aspect ratio: 1:1, 4:3, 3:2, 16:9 or 9:16.
• Batch-convert a whole folder at once (drag & drop, file picker, or paste) and download everything as a single .zip — or combine images into one multi-page PDF.

RIGHT-CLICK ANYWHERE
• Right-click any image → "Convert image with Cleanor ▸ Save as WebP / AVIF / JPEG / PNG / PDF" — it downloads the converted file instantly, with no extra window.
• Right-click the page → "Convert all images" or "Download all images" in one go.
• Copy any result to your clipboard to paste into a doc, email or chat.

BUILT-IN SCREENSHOTS
• Capture the visible area, the full scrolling page, or a region you draw — then compress or convert the screenshot right away. No screen-recording or debugger permissions.

PRIVATE BY DESIGN
• 100% on-device. Images are processed by your browser (plus small bundled WASM codecs) and never leave your computer.
• EXIF, GPS and camera metadata are stripped automatically on every conversion.
• No account, no ads, no tracking, works offline.

Cleanor asks for no access to your sites at install time. Optional one-time site access is requested only when you use a right-click action, and you can turn on instant saving everywhere from a single checkbox — or never grant it and just drag & drop.

Prefer the web, or need more tools? Visit cleanor.app/tools — the same privacy-first toolkit in your browser.

## Single-purpose statement (required)

This extension has a single purpose: to compress and convert image files locally in the browser.

## Permissions justification

- **`contextMenus`** — adds a right-click submenu, "Convert image with Cleanor", on images so the user can send an image straight to the optimizer in a chosen format. Not a sensitive permission.
- **`downloads`** — used only to save the converted image(s) to the user's Downloads folder (optionally a "Cleanor" subfolder) without a Save dialog per file, and to deliver batch results as a single .zip. No download history is read.
- **`storage`** — stores only the user's own UI preferences (default output format, quality, resize, crop, save-subfolder) locally via `chrome.storage.local`, plus a short-lived hand-off of the current page's image list to the optimizer tab. No personal data; nothing is synced or sent anywhere.
- **`activeTab`** — granted only at the moment the user invokes a page action (context menu or shortcut). Lets the extension read the current tab so it can list the images on that page ("Convert/Download all images") or take a screenshot of it (visible area, full page via scroll-and-stitch, or a region the user draws). No standing access to any site, and no `debugger` permission is used for screenshots.
- **`scripting`** — used with `activeTab` to run a tiny one-off script in the current page that collects the URLs of images already displayed on it. It reads nothing else and runs only on user action.
- **`clipboardWrite`** — used only when the user clicks "Copy" on a converted image, to place that image on the clipboard. Nothing is written to the clipboard without an explicit click.
- **`optional_host_permissions: <all_urls>`** — NOT granted at install. Requested only under a user gesture: when the user picks a right-click "Save as", the extension asks for access to that **single site's** origin so it can fetch that one image's bytes and re-encode them locally (no window needed). Users who want one-click saving everywhere can opt in to all-sites access from a checkbox in the popup; both are optional and revocable. Drag-and-drop needs no host access at all.
- **WebAssembly (`wasm-unsafe-eval` in CSP)** — used only to encode AVIF and to decode HEIC/HEIF, which the browser's Canvas cannot do natively. Both WASM codecs ship inside the extension; they make no network calls.
- No tabs, cookies, browsing data, history, or analytics are accessed. All image processing happens on-device.

## Data usage disclosures (Privacy tab)

- Does this item collect or use user data? **No.**
- The following are all **unchecked / "not collected":** personally identifiable info, health info, financial info, authentication info, personal communications, location, web history, user activity, website content.
- **Privacy policy URL:** https://cleanor.app/privacy
- Certify compliance with the Developer Program Policies: **yes.**

## Assets checklist

- [x] Icon 128×128 (`icons/icon-128.png`) — Cleanor blue app icon
- [x] Screenshots 1280×800 (5, brand style): `screenshot-1-hero.png`, `screenshot-2-formats.png`, `screenshot-3-rightclick.png`, `screenshot-4-controls.png`, `screenshot-5-screenshots.png`
- [x] Small promo tile 440×280 (`store-listing/promo-440x280.png`)
- [ ] Optional: marquee promo 1400×560

## Submission steps

1. Register once at the Chrome Web Store Developer Dashboard (one-time $5 fee): https://chrome.google.com/webstore/devconsole
2. Build the upload zip from the repo root:
   `zip -r -X cleanor-image-extension.zip manifest.json background.js convert-core.js popup.html popup.css app.js icons vendor -x '*.DS_Store'`
3. **New item → Upload** the zip.
4. Fill Store listing (copy above), Privacy (disclosures above), and add the screenshot + promo tile.
5. **Submit for review.** With no permissions and no data collection, review is typically 1–3 days.

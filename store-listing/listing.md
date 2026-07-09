# Chrome Web Store — listing copy & submission checklist

Everything below is ready to paste into the Chrome Web Store Developer Dashboard.
This is an **update** to the existing item (ID `dfclfjboflnefohkjpkjnffpdoelbakk`), version **0.8.2**.

## Basics

- **Name:** Cleanor Image Optimizer: Compress & Convert
- **Summary (≤132 chars):** Compress & convert images (HEIC, AVIF, WebP, PDF), screenshot pages, and grab every image on a site — all on your device.
- **Category:** Productivity (alt: Developer Tools)
- **Language:** English

### Alternate summaries (pick one; all ≤132)
- Compress, convert & resize images, capture full-page screenshots, and save every image on a page — 100% in your browser.
- On-device image compressor & converter (HEIC/AVIF/WebP/PDF) with full-page screenshots and one-click "save all images".

## Detailed description

Cleanor Image Optimizer is a fast, private image toolkit that lives in your toolbar. Compress and convert pictures, resize and crop them, grab screenshots, and save every image on a page — all processed inside your browser. Nothing is ever uploaded: no account, no servers, no tracking. Great for faster websites, smaller email attachments, iPhone HEIC photos, and anyone handling sensitive or client images.

COMPRESS & CONVERT
• Shrink images up to 90% with a quality slider — or set an exact target like "under 200 KB" and Cleanor finds the best quality automatically.
• Convert to WebP, AVIF, JPEG, PNG or PDF.
• Open HEIC (iPhone) and AVIF photos and save them as universal WebP, JPEG or PNG.
• See exactly how much you saved on every image.

RESIZE, CROP & BATCH
• Resize by max width, fit within W×H, exact size, or percentage — with one-tap presets (4K, 1920, 1280, 800).
• Crop to an aspect ratio: 1:1, 4:3, 3:2, 16:9 or 9:16.
• Drop, paste or pick many images at once and download them all as a single .zip — or combine them into one multi-page PDF.

RIGHT-CLICK ANY IMAGE
• Right-click an image → "Convert image with Cleanor ▸ Save as WebP / AVIF / JPEG / PNG / PDF". It converts and downloads instantly, with no extra window.
• Copy any result to your clipboard to paste into a doc, email or chat.

WHOLE-PAGE TOOLS
• "Download all images on this page" and "Convert all images on this page" hand you one clean .zip — not a pile of separate downloads.
• Files are named correctly by type even when the site's image URLs have no extension.

BUILT-IN SCREENSHOTS
• Capture the visible area, the full scrolling page (it scrolls and stitches, like a full-page grabber), or a region you draw.
• Repeating headers are kept to the top only, so full-page shots look clean.
• Shots download instantly, named by site and time, e.g. linkedin.com-full-page-2026-07-09_16-45-03-cleanor.app.jpg. No screen-recording or debugger permissions.

FAST & CONVENIENT
• Open the toolbar popup to compress files, or use its "This page" buttons to screenshot / grab images from the current tab.
• A keyboard shortcut opens the optimizer; your format, quality, resize and crop settings are remembered.

PRIVATE BY DESIGN
• 100% on-device. Images are processed by your browser (plus small bundled WASM codecs) and never leave your computer.
• EXIF, GPS and camera metadata are stripped automatically on every conversion.
• No account, no ads, no tracking. Works offline.

Cleanor requests no access to your websites at install time. Optional, revocable site access is asked for only when you use a right-click or page action; otherwise just drag & drop.

Prefer the web, or need more tools? Visit cleanor.app/tools — the same privacy-first toolkit in your browser.

## Single-purpose statement (required)

Cleanor Image Optimizer has a single purpose: to compress, convert and capture images locally in the browser (including converting/downloading the images on the current page and taking screenshots of it), without uploading anything.

## Permissions justification

- **`contextMenus`** — adds the right-click entries: "Convert image with Cleanor" on images, and "Cleanor Image Tools" (convert/download all images, screenshots) on pages. Not a sensitive permission.
- **`downloads`** — used only to save results to the Downloads folder (optionally a "Cleanor" subfolder) without a per-file Save dialog, and to deliver batch/whole-page results as a single .zip. No download history is read.
- **`storage`** — stores only the user's own UI preferences (default format, quality, resize, crop, save-subfolder) via `chrome.storage.local`, plus a brief hand-off of the current page's image list to the optimizer tab. No personal data; nothing is synced or sent anywhere.
- **`activeTab`** — granted only when the user invokes a page action (context menu, popup button or shortcut). Lets the extension read the current tab to list its images or take a screenshot of it. No standing access to any site; no `debugger` permission is used for screenshots.
- **`scripting`** — used with `activeTab` to run small one-off scripts in the current page: collect the URLs of images already shown on it, scroll for a full-page screenshot, and draw the region-selection overlay. Runs only on user action.
- **`clipboardWrite`** — used only when the user clicks "Copy" on a result, to place that image on the clipboard.
- **`optional_host_permissions: <all_urls>`** — NOT granted at install. Requested only under a user gesture: a right-click "Save as", or "Convert/Download all images", needs to fetch the image bytes so they can be re-encoded/zipped locally. Access can be limited to a single site or granted for all sites via an optional popup checkbox; both are revocable. Drag-and-drop needs no host access.
- **WebAssembly (`wasm-unsafe-eval` in CSP)** — used only to encode AVIF and decode HEIC/HEIF, which the browser's Canvas cannot do natively. Both codecs ship inside the extension and make no network calls.
- No cookies, browsing history, or analytics are accessed. All processing happens on-device.

## Data usage disclosures (Privacy tab)

- Does this item collect or use user data? **No.**
- All categories **unchecked / "not collected":** personally identifiable info, health, financial, authentication, personal communications, location, web history, user activity, website content.
- **Privacy policy URL:** https://cleanor.app/privacy
- Certify compliance with the Developer Program Policies: **yes.**

## Assets checklist

- [x] Icon 128×128 (`icons/icon-128.png`) — Cleanor blue app icon
- [x] Screenshots 1280×800 (5, brand style): `screenshot-1-hero.png`, `screenshot-2-formats.png`, `screenshot-3-rightclick.png`, `screenshot-4-controls.png`, `screenshot-5-screenshots.png`
- [x] Small promo tile 440×280 (`store-listing/promo-440x280.png`)
- [ ] Optional: marquee promo 1400×560

## Submission steps (updating the existing item)

1. Rebuild the upload zip from the repo root:
   `zip -r -X cleanor-image-extension.zip manifest.json background.js convert-core.js popup.html popup.css app.js icons vendor -x '*.DS_Store'`
2. Dev Dashboard → the **Cleanor Image Optimizer** item → **Package → Upload new package** → the zip (v0.8.2).
3. **Store listing** tab → paste the Summary + Detailed description above; upload the 5 screenshots + promo tile.
4. **Privacy practices** tab → paste the Single-purpose statement and each Permission justification; set Data usage to **No data collected**; confirm the privacy policy URL.
5. **Submit for review.** Because this version adds `scripting`, `activeTab`, `clipboardWrite` and optional `<all_urls>`, expect a more thorough review than a no-permission build — the justifications above cover why each is needed and that nothing is uploaded. Review is typically a few days.

## What's new (for your own notes — CWS has no changelog field)

HEIC/AVIF input · PDF output · target file size · resize presets + crop · batch → one .zip or PDF · instant right-click "Save as" (no window) · copy to clipboard · whole-page "convert/download all images" → .zip · full-page / visible / region screenshots · popup "This page" buttons · faster saves + progress loader.

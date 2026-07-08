# Chrome Web Store — listing copy & submission checklist

Everything below is ready to paste into the Chrome Web Store Developer Dashboard.

## Basics

- **Name:** Cleanor Image Optimizer: Compress & Convert
- **Summary (≤132 chars):** Compress and convert images (incl. HEIC & AVIF) right in your browser. Private by design: your files never leave the device.
- **Category:** Productivity (alt: Developer Tools)
- **Language:** English

## Detailed description

Optimize images without uploading them anywhere. Cleanor Image Optimizer compresses your pictures and converts them between modern formats entirely inside your browser, no account, no servers, no tracking.

WHAT IT DOES
• Compress photos with a quality slider, or target an exact file size ("get it under 200 KB").
• Convert to WebP, AVIF, JPEG, PNG or PDF, and open HEIC (iPhone) and AVIF files to save them as universal formats.
• Resize (max width, fit within W×H, exact size, or scale %) and crop to an aspect ratio (1:1, 4:3, 16:9, 9:16…).
• Right-click any image and pick "Convert image with Cleanor ▸ Save as WebP / AVIF / JPEG / PNG / PDF".
• Right-click the page for "Cleanor Image Tools ▸ Convert all images / Download all images / Capture & optimize this tab".
• Batch process: add many images at once (drag & drop, file picker, or paste) and download them all as a single .zip, or combine into one multi-page PDF.
• Copy any result straight to your clipboard to paste into a doc or chat.
• Keyboard shortcut to open the optimizer; remembers your settings between sessions.

WHY IT'S DIFFERENT
• 100% on-device. Images are processed with your browser's own encoder (plus bundled WASM codecs) and never leave your computer.
• Privacy built in. EXIF, GPS and camera metadata are removed automatically on every conversion.
• No account, no ads, no tracking. Fast and lightweight.

Prefer to work on the web, or need more tools? Visit cleanor.app/tools, the same privacy-first toolkit, in your browser.

## Single-purpose statement (required)

This extension has a single purpose: to compress and convert image files locally in the browser.

## Permissions justification

- **`contextMenus`** — adds a right-click submenu, "Convert image with Cleanor", on images so the user can send an image straight to the optimizer in a chosen format. Not a sensitive permission.
- **`downloads`** — used only to save the converted image(s) to the user's Downloads folder (optionally a "Cleanor" subfolder) without a Save dialog per file, and to deliver batch results as a single .zip. No download history is read.
- **`storage`** — stores only the user's own UI preferences (default output format, quality, resize, crop, save-subfolder) locally via `chrome.storage.local`, plus a short-lived hand-off of the current page's image list to the optimizer tab. No personal data; nothing is synced or sent anywhere.
- **`activeTab`** — granted only at the moment the user invokes a page action (context menu or shortcut). Lets the extension read the current tab so it can list the images on that page ("Convert/Download all images") or capture a screenshot of it. No standing access to any site.
- **`scripting`** — used with `activeTab` to run a tiny one-off script in the current page that collects the URLs of images already displayed on it. It reads nothing else and runs only on user action.
- **`clipboardWrite`** — used only when the user clicks "Copy" on a converted image, to place that image on the clipboard. Nothing is written to the clipboard without an explicit click.
- **`optional_host_permissions: <all_urls>`** — NOT granted at install. Only when the user uses the right-click entry and then allows it does the extension request access to that **single site's** origin, solely to download that one image's bytes so it can be re-encoded locally. The user can decline; drag-and-drop needs no permission at all.
- **WebAssembly (`wasm-unsafe-eval` in CSP)** — used only to encode AVIF and to decode HEIC/HEIF, which the browser's Canvas cannot do natively. Both WASM codecs ship inside the extension; they make no network calls.
- No tabs, cookies, browsing data, history, or analytics are accessed. All image processing happens on-device.

## Data usage disclosures (Privacy tab)

- Does this item collect or use user data? **No.**
- The following are all **unchecked / "not collected":** personally identifiable info, health info, financial info, authentication info, personal communications, location, web history, user activity, website content.
- **Privacy policy URL:** https://cleanor.app/privacy
- Certify compliance with the Developer Program Policies: **yes.**

## Assets checklist

- [x] Icon 128×128 (`icons/icon-128.png`) — Cleanor blue app icon
- [x] Screenshots 1280×800 (3): `screenshot-1-hero.png`, `screenshot-2-formats.png`, `screenshot-3-privacy.png`
- [x] Small promo tile 440×280 (`store-listing/promo-440x280.png`)
- [ ] Optional: marquee promo 1400×560

## Submission steps

1. Register once at the Chrome Web Store Developer Dashboard (one-time $5 fee): https://chrome.google.com/webstore/devconsole
2. Build the upload zip from the repo root:
   `zip -r -X cleanor-image-extension.zip manifest.json background.js popup.html popup.css app.js icons vendor -x '*.DS_Store'`
3. **New item → Upload** the zip.
4. Fill Store listing (copy above), Privacy (disclosures above), and add the screenshot + promo tile.
5. **Submit for review.** With no permissions and no data collection, review is typically 1–3 days.

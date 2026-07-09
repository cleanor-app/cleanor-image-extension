# Chrome Web Store — listing copy & submission checklist

Everything below is ready to paste into the Chrome Web Store Developer Dashboard.
This is an **update** to the existing item (ID `dfclfjboflnefohkjpkjnffpdoelbakk`), version **0.8.3**.
Verified CRX Uploads is enabled → upload the signed `.crx` (see SIGNING.md / `pack-crx.sh`), not the plain zip.

## Basics

- **Name / Title (from manifest):** Cleanor: Image Compressor, Converter & Screenshots
- **Summary (from manifest, ≤132):** Compress & convert images (HEIC, AVIF, WebP, PDF), take screenshots, and save every image on a page. On your device, private.
- **Category:** Productivity (alt: Developer Tools)
- **Language:** English

### Alternate titles / summaries (all fit; no em dashes)
- Title: Cleanor Image Optimizer: Compress, Convert, Capture
- Title: Cleanor: Compress, Convert & Screenshot Images
- Summary: Image compressor & converter (HEIC, AVIF, WebP, PDF) with full-page screenshots and one-tap save all images. 100% on-device.
- Summary: Compress, convert & resize images, screenshot any page, and grab all its images. Runs on your device, nothing uploaded.

## Detailed description

Cleanor is a fast, private image toolkit that lives in your browser toolbar. Compress and convert your pictures, resize and crop them, capture screenshots, and save every image on a page, all without uploading a single file. There is no account, no server, and no tracking: your images are processed on your own device and never leave your computer.

Whether you are speeding up a website, shrinking a photo to fit an email limit, turning iPhone HEIC pictures into JPG, or grabbing a full page screenshot, Cleanor gets it done in a couple of clicks.

WHAT YOU CAN DO

Compress images
Reduce image file size by up to 90% with a simple quality slider, or set an exact target like "under 200 KB" and let Cleanor find the best quality for you automatically. Every result shows exactly how much you saved, so you can compress images with confidence.

Convert between formats
Convert images to WebP, AVIF, JPEG, PNG, or PDF. Open HEIC (iPhone) and AVIF photos and save them as universal WebP, JPEG, or PNG that opens anywhere. It doubles as a reliable HEIC to JPG converter and a WebP converter that runs completely offline.

Resize and crop
Resize by maximum width, fit within set dimensions, an exact width by height, or a percentage, with one tap presets (4K, 1920, 1280, 800). Crop to a fixed aspect ratio such as 1:1, 4:3, 3:2, 16:9, or 9:16 for avatars, thumbnails, and social posts.

Batch process
Add many images at once by drag and drop, the file picker, or paste from the clipboard, then download them all as a single ZIP archive, or combine them into one multi page PDF.

Right click any image
Right click a picture on any web page and choose "Convert image with Cleanor", then pick WebP, AVIF, JPEG, PNG, or PDF. The converted file downloads instantly with no extra window. You can also copy any result straight to your clipboard to paste it into a document, email, or chat.

Save every image on a page
Right click a page and choose "Download all images" to grab them as one tidy ZIP, or "Convert all images" to compress an entire page into a single archive. Files are named correctly by type, even when the site's image links have no file extension.

Built in screenshots
Capture the visible area, the full scrolling page (Cleanor scrolls and stitches it for you, like a dedicated full page screenshot tool), or a region you draw with your mouse. Screenshots download instantly, named by site and time, with no screen recording and no debugger permissions.

WHY CHOOSE CLEANOR

100% on device
Your images are processed by your browser plus small bundled offline codecs. Nothing is uploaded, which makes Cleanor ideal for private, confidential, or client work. EXIF, GPS, and camera metadata are stripped automatically on every conversion.

Private by default
Cleanor asks for no access to your websites when you install it. Optional, revocable access is requested only when you use a right click or page action, and you can always just drag and drop instead.

Fast and free
No sign in, no ads, no tracking. It works offline and remembers your preferred format, quality, resize, and crop settings between sessions. There is even a keyboard shortcut to open the optimizer instantly.

WHO IT IS FOR

Web developers and site owners who want smaller WebP and AVIF images for faster page loads and better Core Web Vitals.
Bloggers, writers, and marketers who need quick screenshots and lighter images.
iPhone users converting HEIC photos to JPG or PNG for sharing.
Designers and social media managers cropping to 1:1, 16:9, and 9:16.
Anyone emailing or uploading photos that must stay under a size limit.

HOW IT WORKS

Open Cleanor from the toolbar and drop in your images, or right click any picture on the web. Everything runs locally in your browser using its own image encoder plus small bundled WebAssembly codecs for AVIF and HEIC. Your files never touch a server, so your photos stay yours.

Prefer to work on the web, or need more tools? Visit cleanor.app/tools, the same privacy first toolkit, right in your browser.

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

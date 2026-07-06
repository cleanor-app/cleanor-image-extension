# Chrome Web Store — listing copy & submission checklist

Everything below is ready to paste into the Chrome Web Store Developer Dashboard.

## Basics

- **Name:** Cleanor Image Optimizer — Compress & Convert
- **Summary (≤132 chars):** Compress images and convert between WebP, JPEG and PNG in your browser. Private: your files never leave the device.
- **Category:** Productivity (alt: Developer Tools)
- **Language:** English

## Detailed description

Optimize images without uploading them anywhere. Cleanor Image Optimizer compresses your pictures and converts them between modern formats entirely inside your browser — no account, no servers, no tracking.

WHAT IT DOES
• Compress JPEG and WebP with a quality slider, or re-save PNG losslessly.
• Convert formats: drop PNG, JPEG, WebP, AVIF, GIF or BMP, and export WebP, JPEG or PNG.
• Batch process: add many images at once (drag & drop, file picker, or paste) and see per-image and total savings.
• Optional max-width resize.

WHY IT'S DIFFERENT
• 100% on-device. Images are processed with your browser's own encoder and never leave your computer.
• No permissions. The extension requests no browsing access and collects no data.
• Fast and lightweight. No sign-in, no ads.

Prefer to work on the web, or need HEIC/AVIF output and dozens more tools? Visit cleanor.app/tools — the same privacy-first toolkit, in your browser.

## Single-purpose statement (required)

This extension has a single purpose: to compress and convert image files locally in the browser.

## Permissions justification

- **Permissions requested:** none.
- **Host permissions:** none.
- The extension does not access web pages, tabs, browsing data, cookies, or the network. All work happens in the extension's own popup using the Canvas API. No justification for sensitive permissions is needed because none are requested.

## Data usage disclosures (Privacy tab)

- Does this item collect or use user data? **No.**
- The following are all **unchecked / "not collected":** personally identifiable info, health info, financial info, authentication info, personal communications, location, web history, user activity, website content.
- **Privacy policy URL:** https://cleanor.app/privacy
- Certify compliance with the Developer Program Policies: **yes.**

## Assets checklist

- [x] Icon 128×128 (`icons/icon-128.png`)
- [x] Screenshot 1280×800 (`store-listing/screenshot-1280x800.png`)
- [x] Small promo tile 440×280 (`store-listing/promo-440x280.png`)
- [ ] Optional: marquee promo 1400×560

## Submission steps

1. Register once at the Chrome Web Store Developer Dashboard (one-time $5 fee): https://chrome.google.com/webstore/devconsole
2. Build the upload zip from the repo root:
   `zip -r -X cleanor-image-extension.zip . -x '*.git*' -x 'store-listing/*' -x 'README.md' -x 'LICENSE'`
3. **New item → Upload** the zip.
4. Fill Store listing (copy above), Privacy (disclosures above), and add the screenshot + promo tile.
5. **Submit for review.** With no permissions and no data collection, review is typically 1–3 days.

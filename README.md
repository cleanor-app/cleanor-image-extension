# Image Compressor & Converter for Chrome (WebP, AVIF, HEIC, JPEG, PNG, PDF)

**Compress, convert and resize images without uploading them. A Chrome extension that runs entirely on your device: no account, no server, no tracking.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-34a853.svg)](manifest.json)
[![Try on the web](https://img.shields.io/badge/or%20use%20it%20online-cleanor.app%2Ftools-0a7cff.svg)](https://cleanor.app/tools)

Drop images into the toolbar popup, pick a format and a quality, and download the smaller files. Every conversion happens in your own browser, using Canvas plus small bundled WASM codecs, so your pictures never leave your computer. It also converts every image on a page, and takes full page screenshots.

## Install

**Chrome Web Store:** [Cleanor: Image Compressor, Converter & Screenshots](https://chromewebstore.google.com/detail/cleanor-image-compressor/dfclfjboflnefohkjpkjnffpdoelbakk)

**Load unpacked (development or code review):**

1. Clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the repo folder.
4. Pin the Cleanor icon and click it. The optimizer opens as a popup, and **Open larger ↗** moves it into a full tab. **Alt+Shift+C** opens that tab from anywhere.

Works in Chrome and in other Chromium browsers that support Manifest V3 (Edge, Brave, Opera, Vivaldi).

## Compress images in the browser

Drop, pick or paste images, then move the **Quality** slider (40 to 100). Each row shows the original size, the new size and the percentage saved, with a total for the whole batch. Change the format or the quality and the batch re-encodes on the spot.

- Lossy output: **WebP**, **AVIF**, **JPEG**.
- Lossless output: **PNG** (the quality slider hides itself, because PNG ignores it).
- Save one result, copy it to the clipboard as a PNG, or download the batch as a single `.zip`.

## Convert HEIC, AVIF and WebP to JPG or PNG

Formats the extension reads: **HEIC / HEIF** (iPhone photos, via a bundled `libheif` build), **AVIF**, **WebP**, **JPEG**, **PNG**, **GIF** and **BMP**.

Formats it writes: **WebP**, **AVIF**, **JPEG**, **PNG** and **PDF**.

AVIF output comes from a bundled single thread WASM encoder ([@jsquash/avif](https://github.com/jamsinclair/jSquash)), because Chrome's Canvas cannot write AVIF. Everything else uses the browser's own encoder. HEIC is read only: you can open an iPhone photo, you cannot save one, which is the direction people actually need.

## Resize an image to a target file size

Type a number of KB into **Target size** and the extension searches for the quality instead of making you guess: 7 encodes, binary searched between quality 0.4 and 0.98, keeping the largest file that still fits under your limit. It applies to the lossy formats (WebP, AVIF, JPEG). PNG has no target field, because lossless encoding has no quality dial to turn.

## Resize and crop

Open **Resize & crop**:

- **Resize:** max width (with 4K, 1920, 1280 and 800 presets), fit within W×H, exact W×H, or scale by percent.
- **Crop to aspect:** 1:1, 4:3, 3:2, 16:9 or 9:16, taken from the centre.

Both are applied before encoding, so they stack with quality and with target size.

## Right click any image to convert it

Right click a picture on any page and choose **Convert image with Cleanor ▸ Save as WebP / AVIF / JPEG / PNG / PDF**. When the extension already has access to that site, the service worker fetches, converts and downloads the file directly, without opening a window. Otherwise it opens the optimizer tab and asks for access to that one site first. **Open in optimizer…** always opens the tab.

## Save or convert every image on a page

Right click a page and open **Cleanor Image Tools**:

- **Download all images on this page** collects up to 100 images (from `<img>` and `<picture><source srcset>`, across frames), fetches them and packs them into one `.zip`, naming each file by its real type even when the URL carries no extension. If nothing is fetchable, or the archive would pass 45 MB, it falls back to downloading the images one by one.
- **Convert all images on this page** does the same, but re-encodes every image with your current settings first, into a single `.zip`.

## Full page screenshot

Also under **Cleanor Image Tools**, and in the popup's **This page** section:

- **Visible area.**
- **Full page**, captured by scrolling and stitching (up to 14 viewport slices), hiding fixed and sticky bars so headers do not repeat on every slice, and following inner scroll containers on app style layouts.
- **Select region**, drawn with the mouse.

Captures over 2.5 megapixels are saved as JPEG, smaller ones as PNG, named `<site>-<kind>-<timestamp>`. There is no `debugger` permission and no screen recording: this is `activeTab` plus `scripting` plus `captureVisibleTab`.

## Privacy and permissions

No image is ever uploaded. There is no analytics, no account, and no network call anywhere in the conversion path. Re-encoding also strips EXIF, GPS and camera metadata from every file, with orientation baked into the pixels first, so a stripped photo never comes out rotated.

| Permission | Why it is there |
| --- | --- |
| `contextMenus` | The right click entries on images and on pages. |
| `downloads` | Saving results (into `Downloads/Cleanor` by default). |
| `storage` | Remembering your format, quality, resize and crop settings. |
| `scripting`, `activeTab` | Collecting image URLs, and scrolling for a full page screenshot, on the tab you act on. |
| `clipboardWrite` | The "copy image" button. |
| `optional_host_permissions: <all_urls>` | **Not granted at install.** Requested only when you use a right click or a page action, and revocable. Drag and drop needs no site access at all. |
| `wasm-unsafe-eval` (CSP) | Running the AVIF encoder and the HEIC decoder locally. Neither one touches the network. |

Full policy: <https://cleanor.app/privacy>

## Docs

| Guide | What it answers |
| --- | --- |
| [Convert HEIC to JPG in Chrome](docs/convert-heic-to-jpg-in-chrome.md) | Opening an iPhone photo and saving it in a format everything reads. |
| [Compress images without uploading them](docs/compress-images-without-uploading-them.md) | What local compression means, and how this extension does it. |
| [WebP vs AVIF: which should you use](docs/webp-vs-avif-which-should-you-use.md) | Choosing the output format, and measuring it on your own file. |
| [Resize an image to a target file size](docs/resize-an-image-to-a-target-file-size.md) | Hitting "under 200 KB" without hunting along the quality slider. |

## FAQ

### Does this image compressor upload my images?

No. Every image is decoded, resized and re-encoded inside the extension page on your own machine, using the browser's Canvas encoder plus two bundled WASM codecs (AVIF encoding, HEIC decoding). Nothing in that path makes a network request, so it works with the network off. There is no account and no analytics.

### Can it convert HEIC to JPG?

Yes. HEIC and HEIF files are decoded by a bundled `libheif` build and then re-encoded as JPEG, PNG, WebP, AVIF or PDF. HEIC is input only: the extension will not write a HEIC file, because the reason to touch one is almost always that something else refuses to open it.

### What image formats does it support?

In: HEIC, HEIF, AVIF, WebP, JPEG, PNG, GIF and BMP. Out: WebP, AVIF, JPEG, PNG and PDF. Convert several images to PDF at once and you get one multi page PDF; convert several to any other format and you get one `.zip`.

### Can I compress an image to an exact file size?

Close to it. Enter a limit in KB in **Target size** and the extension runs a 7 step binary search on encoder quality, keeping the best quality that still lands under the limit. It works for the lossy formats (WebP, AVIF, JPEG). If even the lowest quality cannot reach your target, you get that lowest quality result, and the real fix is then to resize the image smaller.

### Does it remove EXIF and GPS data?

Yes, as a consequence of how it works. The image is decoded to pixels and re-encoded from scratch, so EXIF, GPS coordinates and camera metadata are never carried across. Orientation is applied to the pixels before the metadata disappears, so photos do not end up sideways.

### Does it need access to all my websites?

Not at install. `<all_urls>` is an *optional* host permission, so a fresh install has access to nothing. Chrome asks only when you use a right click or a page action, and only for the site you used it on, unless you tick the "all sites" toggle in the popup yourself. Drag and drop, the file picker and paste never need any site access.

### Is it free and open source?

Yes, MIT licensed, with the whole source in this repo. The same conversions also run in the browser at [cleanor.app/tools](https://cleanor.app/tools), with nothing to install.

## Related projects

| Project | What it is |
| --- | --- |
| [browser-image-tools](https://github.com/cleanor-app/browser-image-tools) | The client side image library on npm: compress and convert inside any web app. |
| [cleanor-mcp](https://github.com/cleanor-app/cleanor-mcp) | MCP server that hands AI agents image optimization and dev utilities. |
| [cleanor-storage-lab](https://github.com/cleanor-app/cleanor-storage-lab) | Open compression benchmarks and datasets. |
| [gif-compressor-chrome-extension](https://github.com/cleanor-app/gif-compressor-chrome-extension) | GIF toolkit for Chrome. |
| [qr-code-generator-chrome-extension](https://github.com/cleanor-app/qr-code-generator-chrome-extension) | QR code generator for Chrome. |
| [figma-image-compressor](https://github.com/cleanor-app/figma-image-compressor) | The same compression, inside Figma. |
| [wordpress-image-optimizer](https://github.com/cleanor-app/wordpress-image-optimizer) | The WordPress plugin: optimize an entire media library. |

## Build the store zip

```bash
zip -r -X cleanor-image-extension.zip . \
  -x '*.git*' -x 'store-listing/*' -x 'docs/*' -x 'README.md' -x 'LICENSE'
```

See [SIGNING.md](SIGNING.md) for the signed `.crx` flow.

## License

[MIT](LICENSE) © Cleanor Labs. More free tools at [cleanor.app/tools](https://cleanor.app/tools), the extension's landing page at [cleanor.app/chrome](https://cleanor.app/chrome), and open datasets at [cleanor.app/research](https://cleanor.app/research).

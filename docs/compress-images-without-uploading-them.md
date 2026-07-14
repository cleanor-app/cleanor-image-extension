# How to compress images without uploading them

Compress images without uploading them by doing the work in the browser itself: a Chrome extension can decode, resize and re-encode a picture with the same codecs Chrome already ships, so the file never touches a server. That is exactly what the [Cleanor image compressor](https://chromewebstore.google.com/detail/cleanor-image-compressor/dfclfjboflnefohkjpkjnffpdoelbakk) does, and you can read every line of the code that does it in this repo.

## Why "no upload" is a real requirement, not a slogan

Most free image compressors are web services. You hand them the file, they process it on their machine and hand you back a smaller one. For a meme, fine. For anything else, you have just published the original: NDA'd design comps, medical scans, passport photos, client screenshots with credentials on them, family pictures carrying GPS coordinates in their EXIF. You inherit the service's retention policy, its breach history and its terms, and you often cannot even tell what they are.

Doing it locally removes the question instead of answering it. If no bytes leave the machine, there is nothing to retain, nothing to leak and nothing to agree to.

## How local compression actually works

Chrome already contains the encoders. The pipeline in this extension is short enough to describe completely:

1. `createImageBitmap()` decodes the file you dropped in, honouring its EXIF orientation.
2. The bitmap is drawn to a `<canvas>` at the size you asked for, cropped first if you set an aspect ratio. For JPEG and PDF output the canvas is filled white first, so transparency does not turn black.
3. `canvas.toBlob(type, quality)` re-encodes it as WebP, JPEG or PNG.
4. Two formats Canvas cannot handle get bundled WASM codecs instead: AVIF is encoded by a vendored build of [@jsquash/avif](https://github.com/jamsinclair/jSquash), and HEIC input is decoded by a vendored `libheif`. Both are loaded on demand, both run offline, and neither has network access.
5. The result becomes a blob URL, and `chrome.downloads` saves it.

There is no fetch, no XHR and no telemetry anywhere along that path. Unplug the network and the extension keeps working. The `wasm-unsafe-eval` entry in the manifest's CSP is there to run those two codecs and nothing else.

## Compress a batch, locally

1. Click the toolbar icon, or press **Alt+Shift+C** for the full tab view.
2. Drag in your images, choose files, or paste from the clipboard. Formats read: HEIC, HEIF, AVIF, WebP, JPEG, PNG, GIF, BMP.
3. Pick **Convert to** (WebP, AVIF, JPEG, PNG or PDF) and drag the **Quality** slider. Every image re-encodes as you move it.
4. Read the numbers. Each row shows `original → new` and the percentage saved, and the header shows the batch total. This is measured on your files, not promised in advance.
5. **Download all** saves one `.zip` (or one multi page PDF if you chose PDF).

Nothing here needs a site permission. Drag and drop, the file picker and paste all work on a fresh install that has been granted access to precisely zero websites.

## The privacy side effects worth knowing

- **EXIF and GPS are gone.** Re-encoding from decoded pixels means camera model, timestamps and location are simply never written into the new file. Orientation is baked into the pixels first, so the photo does not rotate when the tag vanishes.
- **Site access is optional.** `<all_urls>` is declared as an *optional* host permission. It is not granted at install. Chrome asks only if you use the right click "convert this image" entry or a whole page action, and only for the site in question.
- **The clipboard copy is local too.** Browsers only accept `image/png` on the clipboard, so the result is re-encoded to PNG in the page before being written.

## When local is not the right answer

Client side compression uses your CPU and your RAM. AVIF encoding in particular is a single thread WASM build and is noticeably slower than WebP or JPEG, which the browser encodes natively. A hundred large photos to AVIF will make your fan spin. That is the honest trade: you pay in seconds instead of paying in privacy. If you need thousands of images optimized on a schedule, that is a server job, and the [WordPress plugin](https://github.com/cleanor-app/wordpress-image-optimizer) or the [MCP server](https://github.com/cleanor-app/cleanor-mcp) is the better shape for it.

---

More about the extension in the [README](../README.md). The same compressors run with no install at [cleanor.app/tools](https://cleanor.app/tools), and the extension has a landing page at [cleanor.app/chrome](https://cleanor.app/chrome).

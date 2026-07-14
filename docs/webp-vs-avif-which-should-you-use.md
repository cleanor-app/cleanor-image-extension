# WebP vs AVIF: which should you use?

Use **WebP** when the file has to work everywhere and be produced quickly, and **AVIF** when the smallest possible file matters more than encode time. Both beat JPEG and PNG for photographs on the web, both keep transparency, and the honest answer for any specific image is to encode it both ways and compare the two numbers, which the [Cleanor image compressor extension](https://chromewebstore.google.com/detail/cleanor-image-compressor/dfclfjboflnefohkjpkjnffpdoelbakk) shows you directly.

## What they actually are

Both are modern formats derived from video codecs, which is where the compression advantage comes from: a video encoder's intra frame prediction is far more sophisticated than JPEG's 1992 vintage DCT blocks.

- **WebP** came out of Google's VP8 codec. It has been in Chrome for over a decade and is now supported by every current browser. It does lossy and lossless, transparency, and animation.
- **AVIF** comes from AV1, a much newer codec. It also does lossy and lossless, transparency and animation, and it adds things WebP cannot express: 10 and 12 bit depth, wide colour gamut and HDR. It is supported by current Chrome, Firefox and Safari, though it arrived years later, so it is the format more likely to embarrass you in something old.

## The trade you are actually making

| | WebP | AVIF |
| --- | --- | --- |
| Typical file size | Smaller than JPEG | Usually smaller than WebP |
| Encode speed in this extension | Fast: Chrome's native Canvas encoder | Slower: a bundled single thread WASM encoder |
| Browser support | Universal in current browsers | Current browsers, but newer, so more gaps in old software |
| Desktop app support | Good | Patchier |
| HDR, 10/12 bit, wide gamut | No | Yes |
| Best for | The default web format, anything at volume | Hero images, large photos, when bytes are the constraint |

The encode speed line is the one people are surprised by. Chrome cannot write AVIF from a canvas, so this extension ships its own WASM AVIF encoder ([@jsquash/avif](https://github.com/jamsinclair/jSquash)) and runs it on a single thread. WebP, JPEG and PNG go straight through `canvas.toBlob()` and are effectively instant. Converting one hero image to AVIF is nothing. Converting a hundred photos to AVIF is a coffee break, and the same hundred to WebP is not.

## Do not trust a table, measure your own file

Compression ratios depend enormously on the image: a flat illustration, a noisy night photo and a screenshot full of text all behave differently, and any blanket "AVIF is X% smaller" is an average over someone else's corpus. The extension makes measuring trivial.

1. Drop the image into the popup.
2. Choose **Convert to → WebP** at your target quality. Read the `original → new` size and the percent saved on the row.
3. Switch **Convert to → AVIF**, same quality. The batch re-encodes and the row updates.
4. Compare the two numbers, and look at the two results at full size before you decide the smaller one is good enough.

That comparison, on your image, at your quality, beats any general claim. If you want compression data measured over real corpora rather than a single file, the open benchmarks live at [cleanor.app/research](https://cleanor.app/research) and in [cleanor-storage-lab](https://github.com/cleanor-app/cleanor-storage-lab).

## A practical rule

- **Website images at volume:** WebP. Universal support, fast to produce, a large win over JPEG. This is the boring correct default.
- **A hero image, a big background, a photo gallery:** AVIF is worth the encode time, because the bytes are paid for by every visitor and encoded only once.
- **Serving both:** a `<picture>` element with an AVIF `<source>`, a WebP `<source>` and a JPEG fallback lets each browser take the best one it understands.
- **Anything leaving the web:** email attachments, upload forms, print shops, someone else's desktop software. Use JPEG, or PNG for flat graphics and screenshots. Compatibility beats cleverness the moment the file leaves a browser.
- **Transparency:** both do it. Note that if you then export to JPEG or PDF, the extension flattens onto white, because neither format has an alpha channel.

## Quality settings

The **Quality** slider runs 40 to 100 and maps to both encoders, so a like for like comparison at the same number is fair enough to act on. If you care about a byte budget rather than a quality number, set a **Target size** in KB instead and let the extension binary search the quality for you: it works for WebP, AVIF and JPEG alike. See [resize an image to a target file size](resize-an-image-to-a-target-file-size.md).

---

More about the extension in the [README](../README.md). Free WebP and AVIF converters also run in the browser, with no install, at [cleanor.app/tools](https://cleanor.app/tools), and the extension's landing page is [cleanor.app/chrome](https://cleanor.app/chrome).

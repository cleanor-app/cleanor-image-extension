# How to convert HEIC to JPG in Chrome

You can convert a HEIC photo to JPG directly inside Chrome, with no upload and no online converter, by installing the [Cleanor image compressor extension](https://chromewebstore.google.com/detail/cleanor-image-compressor/dfclfjboflnefohkjpkjnffpdoelbakk) and dragging the file into its popup. The conversion runs in your browser: the HEIC is decoded by a bundled WASM build of `libheif` and re-encoded as a JPEG by Chrome's own Canvas encoder, so the photo never leaves your computer.

## Why HEIC needs converting at all

HEIC (High Efficiency Image Container) is what an iPhone saves by default. It stores the same photo in roughly half the bytes of a JPEG, which is exactly why Apple picked it. The problem is everything downstream: plenty of Windows apps, older photo editors, upload forms, print shops and web CMSes still reject a `.heic` file outright. The usual fix, uploading holiday photos or client work to a random "HEIC converter" website, means handing your originals plus their embedded GPS coordinates to a server you know nothing about.

## Convert one HEIC file

1. Install the extension, then click its toolbar icon (or press **Alt+Shift+C** to open the full tab view).
2. Drag the `.heic` file onto the drop zone. You can also use **choose files**, or paste with Ctrl/Cmd+V. Add as many files as you like at once.
3. Set **Convert to** → **JPEG**.
4. Set the **Quality** slider. 80 is the default and is a sensible starting point for photos.
5. Each row shows the original size, the new size and the percent saved. Click **Save** on a row, or **Download all** for the whole batch.

Files land in `Downloads/Cleanor` by default, with a `-cleanor.app` suffix on the name. Untick the checkbox in the popup if you want them straight in `Downloads`.

## Convert a folder of HEIC photos at once

Select every `.heic` file and drop them in together. The extension encodes them one at a time, updating each row as it finishes, so a large batch gives you feedback rather than a frozen window. When more than one file is done, **Download all** becomes **Download .zip** and you get a single archive. If you pick **PDF** as the output format instead, the same batch becomes one multi page PDF, one photo per page.

## What happens to the EXIF and GPS data

It is dropped. The extension decodes the HEIC to raw pixels and encodes a brand new JPEG from those pixels, so nothing from the original container is carried across: no camera model, no timestamps, no GPS coordinates. Orientation is applied to the pixels *before* the metadata disappears, which is the detail that stops "stripped" photos coming out sideways. If you needed the metadata preserved, this is the wrong tool.

## Choosing JPG, or not

JPG is the safe answer: it opens everywhere, which is the whole reason you are converting. But the extension also writes **PNG** (lossless, good for screenshots and flat graphics, large for photos), **WebP** and **AVIF** (both usually much smaller than JPEG at the same visual quality, and both fine for the web but not universally accepted by desktop apps). If the file is going into an email, a form or a print shop, pick JPEG. If it is going onto a website, read [WebP vs AVIF](webp-vs-avif-which-should-you-use.md).

## Shrink it while you convert

Since the photo is being re-encoded anyway, this is the moment to make it smaller:

- **Target size:** type a KB limit and the extension binary searches the quality for you until the JPEG fits. See [resizing to a target file size](resize-an-image-to-a-target-file-size.md).
- **Resize & crop:** cap the width (4K, 1920, 1280 and 800 presets), fit within a box, set exact dimensions, or scale by percent. A 12 megapixel iPhone photo does not need to stay 12 megapixels to be an email attachment.
- **Crop to aspect:** 1:1, 4:3, 3:2, 16:9 or 9:16, from the centre.

## One thing it will not do

It does not *write* HEIC. Input only. In practice that has never been the request: people convert HEIC because something refuses to open it, not because they want more of it.

## Also worth knowing

Right clicking a `.heic` image on a web page and choosing **Convert image with Cleanor** works too, but it opens the optimizer tab rather than downloading silently, because HEIC decoding needs the WASM decoder that only the extension page loads.

---

More about the extension in the [README](../README.md). The same HEIC conversion also runs on the web, with nothing to install, at [cleanor.app/tools](https://cleanor.app/tools), and the extension's landing page is [cleanor.app/chrome](https://cleanor.app/chrome).

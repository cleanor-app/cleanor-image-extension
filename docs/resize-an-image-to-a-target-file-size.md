# How to resize an image to a target file size

To hit a file size limit like "under 200 KB", stop dragging the quality slider and let the encoder search for you: type the limit into the **Target size** field of the [Cleanor image compressor extension](https://chromewebstore.google.com/detail/cleanor-image-compressor/dfclfjboflnefohkjpkjnffpdoelbakk) and it binary searches the encoder quality until the file fits underneath. It runs 7 encodes locally, in your browser, and keeps the best quality that still lands under your number.

## Why the quality slider alone is the wrong tool

Quality is not size. There is no fixed relationship between "quality 80" and any number of kilobytes: the same setting can produce 90 KB from a flat illustration and 2 MB from a noisy photograph, because the encoder is spending bits on detail that is actually there. So when an upload form says "maximum 500 KB", the slider gives you no way to aim. You export, you check, you nudge, you export again. Doing that by hand is the problem the target size field exists to remove.

## Hit a size limit in four steps

1. Open the extension (toolbar icon, or **Alt+Shift+C** for the full tab view).
2. Drop in the image. HEIC, HEIF, AVIF, WebP, JPEG, PNG, GIF and BMP all go in.
3. Choose a lossy output format: **WebP**, **AVIF** or **JPEG**.
4. Type your limit into **Target size**, in KB. Entering `200` means "under 200 KB".

The image re-encodes immediately and the row shows what you actually got: `original → new`, plus the percent saved. The quality slider dims itself, because the target is now driving it.

## What it is doing underneath

A binary search over encoder quality, between 0.4 and 0.98, seven iterations. Each round it encodes at the midpoint quality and checks the resulting blob's size: too big, and the upper bound comes down; small enough, and it keeps that result as the best so far and pushes the lower bound up. After seven rounds it returns the largest file it found that still fits under your target, which is the highest quality that fits. It is measuring real encoded bytes each time, not estimating from a formula, which is why it works on any image.

If even quality 0.4 cannot get under your limit, you get the 0.4 result anyway, as a best effort. That is not a bug, it is the honest signal: the image has too many pixels to reach that size at any acceptable quality, and the fix is dimensions, not quality.

## When quality alone cannot reach the target: resize

Halving an image's width and height quarters its pixel count, and that is usually a far bigger lever than the quality dial. Open **Resize & crop**:

- **Max width**, with one click presets at 4K, 1920, 1280 and 800. Only shrinks: an image already narrower than the cap is left alone.
- **Fit within W×H**, scaling down to fit inside a box while keeping the aspect ratio.
- **Exact W×H**, if you need precise dimensions and do not mind the distortion.
- **Scale %**, from 1 to 500.

Resize and crop are applied *before* encoding, so they combine with the target size search: cap the width at 1280, keep the 200 KB target, and the search now has an easy job at a quality that still looks good. As a rule of thumb, if the target search is coming back visibly soft, you are asking a too-large image to fit a too-small budget. Resize first, then let the search finish the job.

**Crop to aspect** (1:1, 4:3, 3:2, 16:9, 9:16) crops from the centre and also removes pixels, so it helps too, at the cost of composition.

## Why PNG has no target size field

Because PNG is lossless, there is no quality dial to search. Select PNG as the output and the target field hides itself, along with the quality slider. If you need a PNG under a size limit, your only levers are fewer pixels (resize) or a different format. For photographs, switching to WebP or JPEG will beat any amount of PNG tuning, and it is not close.

## Practical limits people are aiming at

The usual cases are an email attachment cap, a job application portal, a forum avatar, a CMS upload limit, or a page performance budget. All of them are size caps, not quality caps, which is exactly what this field is for. And since every conversion runs on your own machine, a CV photo or a scanned document never gets uploaded to a compression service on the way to meeting the limit.

---

More about the extension in the [README](../README.md). The same target size compression runs in the browser, with no install, at [cleanor.app/tools](https://cleanor.app/tools), and the extension's landing page is [cleanor.app/chrome](https://cleanor.app/chrome).

// Thin AVIF encoder wrapper around the vendored @jsquash/avif single-thread codec.
// We compile the .wasm ourselves and hand it to the emscripten factory, which lets us
// avoid the package's `wasm-feature-detect` dependency and its multi-threaded path
// (that path needs cross-origin isolation, which a browser extension does not have).
//
// Vendored files (Apache-2.0, see ./LICENSE): avif_enc.js, avif_enc.wasm, utils.js, meta.js
// from @jsquash/avif.

import { initEmscriptenModule } from './utils.js';
import { defaultOptions } from './meta.js';
import avifEncoderFactory from './avif_enc.js';

let modulePromise;

async function getModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const wasmUrl = new URL('./avif_enc.wasm', import.meta.url);
      const bytes = await (await fetch(wasmUrl)).arrayBuffer();
      const wasmModule = await WebAssembly.compile(bytes);
      return initEmscriptenModule(avifEncoderFactory, wasmModule);
    })();
  }
  return modulePromise;
}

/**
 * Encode ImageData to AVIF.
 * @param {ImageData} imageData
 * @param {{quality?: number, speed?: number}} options  quality 0-100, speed 0-10 (higher = faster/worse)
 * @returns {Promise<ArrayBuffer>}
 */
export async function encodeAvif(imageData, options = {}) {
  const module = await getModule();
  const opts = { ...defaultOptions, ...options };
  const output = module.encode(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height,
    opts,
  );
  if (!output) throw new Error('AVIF encoding failed');
  return output.buffer;
}

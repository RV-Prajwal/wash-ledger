import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';

// Use the non-threaded WASM build so the app does not need cross-origin isolation 
// (COOP/COEP) headers. Firebase Hosting and dev server work without special headers.
ort.env.wasm.numThreads = 1;

// Use Vite's asset URLs so it knows how to serve them in dev and build
(ort.env.wasm as any).wasmPaths = {
  'ort-wasm-simd-threaded.wasm': wasmUrl,
  'ort-wasm-simd-threaded.mjs': mjsUrl
};

export { ort };

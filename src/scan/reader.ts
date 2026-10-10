import * as ort from 'onnxruntime-web/wasm';
import type { BoundingBox } from './detector';

export interface Reader {
  init: () => Promise<void>;
  read: (canvas: HTMLCanvasElement, box: BoundingBox) => Promise<string | null>;
}

// Standard character map for License Plate OCR
const CHAR_MAP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'; 
const BLANK_INDEX = CHAR_MAP.length; // usually the last index is CTC blank

export const createReader = (): Reader => {
  let session: ort.InferenceSession | null = null;
  const INPUT_W = 100;
  const INPUT_H = 32;

  return {
    init: async () => {
      ort.env.wasm.wasmPaths = '/';
      ort.env.wasm.numThreads = 1;
      try {
        session = await ort.InferenceSession.create('/models/reader.onnx', {
          executionProviders: ['wasm']
        });
      } catch (err) {
        console.warn('Reader model not found in /models/reader.onnx, waiting for user to upload it.');
      }
    },
    read: async (canvas: HTMLCanvasElement, box: BoundingBox) => {
      if (!session) return null;

      // 1. Crop and Resize
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = INPUT_W;
      tmpCanvas.height = INPUT_H;
      const tmpCtx = tmpCanvas.getContext('2d');
      if (!tmpCtx) return null;

      // Draw the cropped area, resizing it to 100x32
      tmpCtx.drawImage(
        canvas,
        box.x, box.y, box.width, box.height,
        0, 0, INPUT_W, INPUT_H
      );

      const imgData = tmpCtx.getImageData(0, 0, INPUT_W, INPUT_H);
      
      // 2. Grayscale & Normalize to [1, 1, 32, 100]
      const input = new Float32Array(INPUT_W * INPUT_H);
      for (let i = 0; i < INPUT_W * INPUT_H; i++) {
        const r = imgData.data[i * 4];
        const g = imgData.data[i * 4 + 1];
        const b = imgData.data[i * 4 + 2];
        const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        input[i] = (gray - 0.5) / 0.5; // standard norm (mean 0.5, std 0.5)
      }

      const tensor = new ort.Tensor('float32', input, [1, 1, INPUT_H, INPUT_W]);
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = tensor;

      const results = await session.run(feeds);
      const output = results[session.outputNames[0]]; // Shape: [T, 1, num_classes] or [1, num_classes, T]
      
      // 3. CTC Greedy Decoding
      const data = output.data as Float32Array;
      // Assuming shape [T, num_classes] flattened
      const T = output.dims[0] > 1 ? output.dims[0] : output.dims[2];
      const numClasses = output.dims.reduce((a, b) => a * b) / T;

      let decodedStr = '';
      let prevIndex = -1;

      for (let t = 0; t < T; t++) {
        let maxScore = -Infinity;
        let maxIndex = 0;
        for (let c = 0; c < numClasses; c++) {
          const score = data[t * numClasses + c];
          if (score > maxScore) {
            maxScore = score;
            maxIndex = c;
          }
        }
        
        // CTC rule: Ignore blanks and consecutive duplicates
        if (maxIndex !== BLANK_INDEX && maxIndex !== prevIndex) {
          if (maxIndex < CHAR_MAP.length) {
            decodedStr += CHAR_MAP[maxIndex];
          }
        }
        prevIndex = maxIndex;
      }

      return decodedStr || null;
    }
  };
};

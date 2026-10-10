import * as ort from 'onnxruntime-web/wasm';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detector {
  init: () => Promise<void>;
  detect: (canvas: HTMLCanvasElement) => Promise<BoundingBox | null>;
}

export const createDetector = (): Detector => {
  let session: ort.InferenceSession | null = null;
  const MODEL_SIZE = 640;
  
  return {
    init: async () => {
      // Set wasm paths and disable threads to prevent Vite bundler errors with .mjs files
      ort.env.wasm.wasmPaths = '/';
      ort.env.wasm.numThreads = 1;
      try {
        session = await ort.InferenceSession.create('/models/detector.onnx', { 
          executionProviders: ['wasm']
        });
      } catch (err) {
        console.warn('Detector model not found in /models/detector.onnx, waiting for user to upload it.');
      }
    },
    detect: async (canvas: HTMLCanvasElement) => {
      if (!session) return null;
      
      // 1. Preprocess: Resize canvas to MODEL_SIZE x MODEL_SIZE and extract float array
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      // Draw onto a temporary 640x640 canvas
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = MODEL_SIZE;
      tmpCanvas.height = MODEL_SIZE;
      const tmpCtx = tmpCanvas.getContext('2d');
      tmpCtx?.drawImage(canvas, 0, 0, MODEL_SIZE, MODEL_SIZE);
      
      const imgData = tmpCtx?.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
      if (!imgData) return null;

      // Convert to CHW [1, 3, 640, 640] normalized [0,1]
      const input = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE);
      for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
        input[i] = imgData.data[i * 4] / 255.0; // R
        input[MODEL_SIZE * MODEL_SIZE + i] = imgData.data[i * 4 + 1] / 255.0; // G
        input[2 * MODEL_SIZE * MODEL_SIZE + i] = imgData.data[i * 4 + 2] / 255.0; // B
      }

      const tensor = new ort.Tensor('float32', input, [1, 3, MODEL_SIZE, MODEL_SIZE]);
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = tensor;

      const results = await session.run(feeds);
      const output = results[session.outputNames[0]]; // Shape typically [1, 5, 8400] for 1-class YOLOv8
      
      // Postprocess YOLOv8 output
      const data = output.data as Float32Array;
      const numBoxes = output.dims[2];
      const numClasses = output.dims[1] - 4; // index 4 to end are class scores
      
      let bestScore = 0;
      let bestBox: number[] = [];

      for (let i = 0; i < numBoxes; i++) {
        // Find max class score
        let maxClassScore = 0;
        for (let c = 0; c < numClasses; c++) {
          const score = data[(4 + c) * numBoxes + i];
          if (score > maxClassScore) maxClassScore = score;
        }

        if (maxClassScore > 0.5 && maxClassScore > bestScore) {
          bestScore = maxClassScore;
          const cx = data[0 * numBoxes + i];
          const cy = data[1 * numBoxes + i];
          const w = data[2 * numBoxes + i];
          const h = data[3 * numBoxes + i];
          bestBox = [cx, cy, w, h];
        }
      }

      if (bestScore > 0.5) {
        // Scale back to original canvas size
        const scaleX = canvas.width / MODEL_SIZE;
        const scaleY = canvas.height / MODEL_SIZE;
        
        const [cx, cy, w, h] = bestBox;
        return {
          x: (cx - w / 2) * scaleX,
          y: (cy - h / 2) * scaleY,
          width: w * scaleX,
          height: h * scaleY
        };
      }

      return null;
    }
  };
};

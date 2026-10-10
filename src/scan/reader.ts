import { ort } from './ort';
import type { BoundingBox } from './detector';

export interface ReadResult {
  text: string;
  confidences: number[];
}

export interface Reader {
  init: () => Promise<void>;
  read: (canvas: HTMLCanvasElement, box: BoundingBox) => Promise<ReadResult | null>;
}

// Standard character map for License Plate OCR
const CHAR_MAP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'; 
const BLANK_INDEX = CHAR_MAP.length - 1; // 36 is '-' or blank padding in fixed length decoders

export const preprocessImage = (imgData: ImageData): ort.Tensor => {
  const INPUT_W = 128;
  const INPUT_H = 64;
  
  // NHWC: [1, 64, 128, 3] uint8
  const input = new Uint8Array(INPUT_H * INPUT_W * 3);
  for (let i = 0; i < INPUT_H * INPUT_W; i++) {
    input[i * 3 + 0] = imgData.data[i * 4 + 0]; // R
    input[i * 3 + 1] = imgData.data[i * 4 + 1]; // G
    input[i * 3 + 2] = imgData.data[i * 4 + 2]; // B
  }

  return new ort.Tensor('uint8', input, [1, INPUT_H, INPUT_W, 3]);
};

export const createReader = (): Reader => {
  let session: ort.InferenceSession | null = null;
  const INPUT_W = 128;
  const INPUT_H = 64;

  return {
    init: async () => {
      const modelUrl = '/models/reader.onnx';
      const res = await fetch(modelUrl, { method: 'HEAD' });
      if (!res.ok) {
        throw new Error(`Reader model not found at ${modelUrl}`);
      }
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm']
      });

      console.log('--- Reader Model Metadata ---');
      console.log('Input Names:', session.inputNames);
      console.log('Output Names:', session.outputNames);
      
      try {
        const dummyInput = new Uint8Array(INPUT_H * INPUT_W * 3);
        const dummyTensor = new ort.Tensor('uint8', dummyInput, [1, INPUT_H, INPUT_W, 3]);
        const dummyResults = await session.run({ [session.inputNames[0]]: dummyTensor });
        const output = dummyResults[session.outputNames[0]];
        const numSlots = output.dims[1]; // Shape: [1, 9, 37]
        
        if (numSlots < 10) {
          console.warn(`Reader has ${numSlots} slots; 10-character single-line plates cannot be read.`);
        }
      } catch (e) {
        console.warn('Could not determine model slot count during init.', e);
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

      // We stretch the plate to 128x64 without letterboxing, 
      // as most OCR models are trained on stretched characters to preserve maximum resolution.
      tmpCtx.drawImage(
        canvas,
        box.x, box.y, box.width, box.height,
        0, 0, INPUT_W, INPUT_H
      );

      const imgData = tmpCtx.getImageData(0, 0, INPUT_W, INPUT_H);
      const tensor = preprocessImage(imgData);
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = tensor;

      const results = await session.run(feeds);
      const output = results[session.outputNames[0]]; // Shape: [1, 9, 37]
      
      const data = output.data as Float32Array;
      const numSlots = output.dims[1]; // 9
      const numClasses = output.dims[2]; // 37

      let decodedStr = '';
      const confidences: number[] = [];

      for (let t = 0; t < numSlots; t++) {
        let maxScore = -Infinity;
        let maxIndex = 0;
        
        for (let c = 0; c < numClasses; c++) {
          const score = data[t * numClasses + c];
          if (score > maxScore) {
            maxScore = score;
            maxIndex = c;
          }
        }
        
        // Fixed-length decoding: just take the max at each position, ignore padding/blank
        if (maxIndex !== BLANK_INDEX && maxIndex < CHAR_MAP.length) {
          decodedStr += CHAR_MAP[maxIndex];
          confidences.push(maxScore);
        }
      }

      return decodedStr ? { text: decodedStr, confidences } : null;
    }
  };
};

export const testReaderImage = async (file: File) => {
  const imgUrl = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgUrl;
  });
  
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0);
  
  // Create an explicit dev session just for logging
  const modelUrl = '/models/reader.onnx';
  const session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
  
  const INPUT_W = 128;
  const INPUT_H = 64;

  const aspectRatio = img.width / img.height;
  const isTwoLine = aspectRatio < 2.2;
  console.log('--- Dev Test Inference ---');
  console.log('Testing image with size:', img.width, 'x', img.height);
  console.log('Aspect Ratio:', aspectRatio.toFixed(2));
  console.log('Is Two-Line Path:', isTwoLine);

  const runAndLog = async (cropCanvas: HTMLCanvasElement, title: string) => {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = INPUT_W;
    tmpCanvas.height = INPUT_H;
    const tmpCtx = tmpCanvas.getContext('2d');
    
    // Stretch
    tmpCtx?.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, 0, 0, INPUT_W, INPUT_H);
    document.body.appendChild(tmpCanvas); // append for visual debug
    
    const imgData = tmpCtx!.getImageData(0, 0, INPUT_W, INPUT_H);
    const tensor = preprocessImage(imgData);
    
    const results = await session.run({ [session.inputNames[0]]: tensor });
    const output = results[session.outputNames[0]];
    const data = output.data as Float32Array;
    const numSlots = output.dims[1];
    const numClasses = output.dims[2];

    let decodedStr = '';
    console.log(`\n-- ${title} --`);
    
    for (let t = 0; t < numSlots; t++) {
      const candidates = [];
      for (let c = 0; c < numClasses; c++) {
        candidates.push({ char: c === BLANK_INDEX ? '-' : CHAR_MAP[c], score: data[t * numClasses + c] });
      }
      candidates.sort((a, b) => b.score - a.score);
      const top3 = candidates.slice(0, 3);
      
      const best = top3[0];
      if (best.char !== '-') {
        decodedStr += best.char;
      }
      console.log(`Slot ${t}:`, top3.map(c => `${c.char}(${c.score.toFixed(2)})`).join(', '));
    }
    console.log('Decoded text:', decodedStr);
    return decodedStr;
  };

  if (!isTwoLine) {
    await runAndLog(canvas, "Single Line");
  } else {
    // Top crop
    const topCanvas = document.createElement('canvas');
    topCanvas.width = img.width; topCanvas.height = img.height * 0.55;
    topCanvas.getContext('2d')?.drawImage(canvas, 0, 0, img.width, img.height * 0.55, 0, 0, img.width, img.height * 0.55);
    await runAndLog(topCanvas, "Top Half");

    // Bottom crop
    const bottomCanvas = document.createElement('canvas');
    bottomCanvas.width = img.width; bottomCanvas.height = img.height * 0.55;
    bottomCanvas.getContext('2d')?.drawImage(canvas, 0, img.height * 0.45, img.width, img.height * 0.55, 0, 0, img.width, img.height * 0.55);
    await runAndLog(bottomCanvas, "Bottom Half");
    
    await runAndLog(canvas, "Whole Crop (Fallback)");
  }

  URL.revokeObjectURL(imgUrl);
};

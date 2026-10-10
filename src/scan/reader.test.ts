import { describe, it, expect } from 'vitest';
import { preprocessImage } from './reader';

describe('reader preprocessImage', () => {
  it('should format ImageData into an NHWC uint8 tensor of shape [1, 64, 128, 3]', () => {
    const width = 128;
    const height = 64;
    // Create dummy ImageData. 4 bytes per pixel (RGBA)
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Fill with some pattern
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 0] = 100; // R
      data[i * 4 + 1] = 150; // G
      data[i * 4 + 2] = 200; // B
      data[i * 4 + 3] = 255; // A
    }

    const imgData = {
      data,
      width,
      height,
      colorSpace: 'srgb' as PredefinedColorSpace
    };

    const tensor = preprocessImage(imgData);

    // Validate type and shape
    expect(tensor.type).toBe('uint8');
    expect(tensor.dims).toEqual([1, 64, 128, 3]);

    // Validate values (first pixel should be [100, 150, 200])
    const tensorData = tensor.data as Uint8Array;
    expect(tensorData[0]).toBe(100); // R
    expect(tensorData[1]).toBe(150); // G
    expect(tensorData[2]).toBe(200); // B
    
    // Validate length (64 * 128 * 3 = 24576)
    expect(tensorData.length).toBe(64 * 128 * 3);
  });
});

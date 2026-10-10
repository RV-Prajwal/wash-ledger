import { describe, it, expect } from 'vitest';
import { normalizePlate, isValidPlate } from './normalize';

describe('isValidPlate', () => {
  it('should reject invalid Indian plates like MH14J711', () => {
    expect(isValidPlate('MH14J711')).toBe(false);
  });
  
  it('should accept valid Indian plates like MH14JN9711', () => {
    expect(isValidPlate('MH14JN9711')).toBe(true);
  });
});

describe('normalizePlate', () => {
  it('should not add or remove characters, only replace them', () => {
    const input1 = 'MH14J711';
    const out1 = normalizePlate(input1);
    expect(out1.length).toBe(input1.length);
    expect(out1).toBe('MH14J711'); // 711 is last 4? No, it's 8 chars. Wait, length 8 logic applies: first 2 letter, next 2 digit, last 4 digit -> MH 14 J711 (J becomes letter, 7 digit... wait, the logic replaces look-alikes, not characters that don't match exactly. J is left as J since it is a letter, 7 is left as 7). 

    const input2 = 'MH14JN9711';
    const out2 = normalizePlate(input2);
    expect(out2.length).toBe(input2.length);
    expect(out2).toBe('MH14JN9711');
    
    // Lookalike test
    const input3 = 'MH14JN97II';
    const out3 = normalizePlate(input3);
    expect(out3).toBe('MH14JN9711');
  });
});

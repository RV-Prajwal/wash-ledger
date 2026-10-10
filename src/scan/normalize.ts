// Fixes common OCR look-alikes based on expected type (letter or digit)
const fixLookAlikes = (char: string, expectedType: 'letter' | 'digit'): string => {
  if (expectedType === 'letter') {
    if (char === '0') return 'O';
    if (char === '1') return 'I';
    if (char === '8') return 'B';
    if (char === '5') return 'S';
  } else {
    if (char === 'O') return '0';
    if (char === 'I') return '1';
    if (char === 'B') return '8';
    if (char === 'S') return '5';
  }
  return char;
};

export const normalizePlate = (rawText: string): string => {
  // Uppercase and strip all non-alphanumeric characters
  let clean = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Strip 'IND' which is commonly misread from the blue strip/hologram
  clean = clean.replace(/IND/g, '');
  
  if (clean.length < 8 || clean.length > 11) {
    return clean; // Cannot reliably map positions if length is completely wrong, return as-is
  }

  // Indian plates: 
  // 1-2: State letters
  // 3-4: RTO digits
  // Middle: 1 to 3 letters
  // Last 4: Digits
  
  let normalized = '';
  const len = clean.length;
  
  for (let i = 0; i < len; i++) {
    let expectedType: 'letter' | 'digit';
    
    if (i === 0 || i === 1) {
      expectedType = 'letter';
    } else if (i === 2 || i === 3) {
      expectedType = 'digit';
    } else if (i >= len - 4) {
      expectedType = 'digit';
    } else {
      expectedType = 'letter'; // Middle part (series)
    }
    
    normalized += fixLookAlikes(clean[i], expectedType);
  }
  
  return normalized;
};

export const isValidPlate = (plate: string): boolean => {
  return /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(plate);
};

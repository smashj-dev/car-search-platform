/**
 * VIN Validation Utilities
 * Implements complete VIN validation including check digit calculation
 */

const VIN_LENGTH = 17;
const INVALID_CHARS = ['I', 'O', 'Q'];

// Weight factors for check digit calculation (position 1-17)
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// Character to numeric value mapping for check digit
const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

export interface VINValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedVIN?: string;
}

/**
 * Validates VIN format and structure
 */
export function validateVIN(vin: string): VINValidationResult {
  const errors: string[] = [];

  // Normalize input
  const normalizedVIN = vin.toUpperCase().trim();

  // Check length
  if (normalizedVIN.length !== VIN_LENGTH) {
    errors.push(`VIN must be exactly ${VIN_LENGTH} characters (got ${normalizedVIN.length})`);
  }

  // Check for invalid characters
  for (const char of INVALID_CHARS) {
    if (normalizedVIN.includes(char)) {
      errors.push(`VIN cannot contain the letter '${char}' (looks like 1, 0, or O)`);
    }
  }

  // Check alphanumeric
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(normalizedVIN)) {
    errors.push('VIN must contain only letters (A-H, J-N, P-R, Z) and numbers (0-9)');
  }

  // If basic validation fails, return early
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  // Validate check digit (position 9)
  const checkDigitValid = validateCheckDigit(normalizedVIN);
  if (!checkDigitValid) {
    errors.push('VIN check digit validation failed');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedVIN: normalizedVIN,
  };
}

/**
 * Validates VIN check digit using ISO 3779 standard
 */
function validateCheckDigit(vin: string): boolean {
  if (vin.length !== VIN_LENGTH) {
    return false;
  }

  let sum = 0;

  for (let i = 0; i < VIN_LENGTH; i++) {
    const char = vin[i];
    const value = TRANSLITERATION[char];

    if (value === undefined) {
      return false;
    }

    sum += value * WEIGHTS[i];
  }

  const checkDigit = sum % 11;
  const expectedChar = checkDigit === 10 ? 'X' : checkDigit.toString();

  return vin[8] === expectedChar;
}

/**
 * Extracts basic VIN information without API call
 */
export interface VINBasicInfo {
  wmi: string; // World Manufacturer Identifier (positions 1-3)
  vds: string; // Vehicle Descriptor Section (positions 4-9)
  vis: string; // Vehicle Identifier Section (positions 10-17)
  modelYear: number | null;
  plantCode: string;
  sequentialNumber: string;
}

const YEAR_CODE: Record<string, number> = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017,
  J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025,
  T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
  // Numeric codes
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
};

export function parseVINBasics(vin: string): VINBasicInfo | null {
  const validation = validateVIN(vin);
  if (!validation.isValid || !validation.sanitizedVIN) {
    return null;
  }

  const sanitized = validation.sanitizedVIN;

  const wmi = sanitized.substring(0, 3);
  const vds = sanitized.substring(3, 9);
  const vis = sanitized.substring(9, 17);
  const yearChar = sanitized[9];
  const plantCode = sanitized[10];
  const sequentialNumber = sanitized.substring(11, 17);

  return {
    wmi,
    vds,
    vis,
    modelYear: YEAR_CODE[yearChar] || null,
    plantCode,
    sequentialNumber,
  };
}

/**
 * Quick VIN format check (does not validate check digit)
 */
export function isValidVINFormat(vin: string): boolean {
  const normalized = vin.toUpperCase().trim();

  if (normalized.length !== VIN_LENGTH) {
    return false;
  }

  for (const char of INVALID_CHARS) {
    if (normalized.includes(char)) {
      return false;
    }
  }

  return /^[A-HJ-NPR-Z0-9]+$/.test(normalized);
}

/**
 * Normalizes VIN to uppercase and trims whitespace
 */
export function normalizeVIN(vin: string): string {
  return vin.toUpperCase().trim();
}

/**
 * NHTSA vPIC API VIN Decoder Service
 * Decodes VINs and enriches vehicle data using the free NHTSA API
 */

import type { Env } from '../types/env';
import { validateVIN, normalizeVIN } from '../utils/vin-validator';

const NHTSA_API_BASE = 'https://vpic.nhtsa.dot.gov/api';
const CACHE_TTL = 60 * 60 * 24 * 365; // 1 year (VINs don't change)

export interface NHTSAVariable {
  Variable: string;
  Value: string | null;
  ValueId: string | null;
}

export interface NHTSAResponse {
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: NHTSAVariable[];
}

export interface DecodedVINData {
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
  bodyType: string | null;
  engine: string | null;
  engineCylinders: number | null;
  engineDisplacementL: number | null;
  transmission: string | null;
  drivetrain: string | null;
  fuelType: string | null;
  msrp: number | null;
  doors: number | null;
  seatingCapacity: number | null;
  vehicleType: string | null;
  plantCountry: string | null;
  manufacturer: string | null;
  rawData?: NHTSAVariable[]; // Store raw NHTSA response for debugging
}

export interface VINEnrichmentResult {
  success: boolean;
  data?: DecodedVINData;
  error?: {
    code: string;
    message: string;
  };
  source: 'cache' | 'api';
}

/**
 * Decodes a VIN using NHTSA vPIC API
 */
export async function decodeVIN(env: Env, vin: string): Promise<VINEnrichmentResult> {
  // Validate VIN first
  const validation = validateVIN(vin);
  if (!validation.isValid) {
    return {
      success: false,
      error: {
        code: 'INVALID_VIN',
        message: validation.errors.join(', '),
      },
      source: 'api',
    };
  }

  const sanitizedVIN = validation.sanitizedVIN!;
  const cacheKey = `vin:decoded:${sanitizedVIN}`;

  // Check cache first (VINs never change)
  try {
    const cached = await env.CACHE.get(cacheKey, 'json');
    if (cached) {
      return {
        success: true,
        data: cached as DecodedVINData,
        source: 'cache',
      };
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  // Call NHTSA API
  try {
    const url = `${NHTSA_API_BASE}/vehicles/DecodeVin/${sanitizedVIN}?format=json`;
    console.log(`Calling NHTSA API: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CarSearchPlatform/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`);
    }

    const data: NHTSAResponse = await response.json();

    if (!data.Results || data.Results.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_DATA',
          message: 'No data returned from NHTSA API',
        },
        source: 'api',
      };
    }

    // Parse the response
    const decodedData = parseNHTSAResponse(sanitizedVIN, data.Results);

    // Cache the result
    try {
      await env.CACHE.put(cacheKey, JSON.stringify(decodedData), {
        expirationTtl: CACHE_TTL,
      });
    } catch (error) {
      console.warn('Cache write error:', error);
    }

    return {
      success: true,
      data: decodedData,
      source: 'api',
    };
  } catch (error: any) {
    console.error('VIN decode error:', error);
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error.message || 'Failed to decode VIN',
      },
      source: 'api',
    };
  }
}

/**
 * Parses NHTSA API response into structured data
 */
function parseNHTSAResponse(vin: string, results: NHTSAVariable[]): DecodedVINData {
  const getValue = (variableName: string): string | null => {
    const item = results.find(r => r.Variable === variableName);
    return item?.Value || null;
  };

  const getNumericValue = (variableName: string): number | null => {
    const value = getValue(variableName);
    if (!value) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  };

  // Engine description parsing
  const engineInfo = getValue('Engine Model') || getValue('Engine Configuration') || null;
  const cylinders = getNumericValue('Engine Number of Cylinders');
  const displacementCC = getNumericValue('Displacement (CC)');
  const displacementL = getNumericValue('Displacement (L)');

  // Build engine string
  let engine: string | null = null;
  if (displacementL && cylinders) {
    engine = `${displacementL}L ${cylinders}-Cylinder`;
    if (engineInfo) {
      engine += ` ${engineInfo}`;
    }
  } else if (engineInfo) {
    engine = engineInfo;
  }

  // Transmission
  const transmissionStyle = getValue('Transmission Style');
  const transmissionSpeeds = getValue('Transmission Speeds');
  let transmission: string | null = null;
  if (transmissionStyle) {
    transmission = transmissionStyle;
    if (transmissionSpeeds) {
      transmission = `${transmissionSpeeds}-Speed ${transmissionStyle}`;
    }
  }

  // Drivetrain mapping
  const driveType = getValue('Drive Type');
  let drivetrain: string | null = null;
  if (driveType) {
    const driveMap: Record<string, string> = {
      'FWD': 'FWD',
      'Front-Wheel Drive': 'FWD',
      'RWD': 'RWD',
      'Rear-Wheel Drive': 'RWD',
      'AWD': 'AWD',
      'All-Wheel Drive': 'AWD',
      '4WD': '4WD',
      '4X4': '4WD',
      'Four-Wheel Drive': '4WD',
    };
    drivetrain = driveMap[driveType] || driveType;
  }

  // Fuel type
  const primaryFuel = getValue('Fuel Type - Primary');
  let fuelType: string | null = null;
  if (primaryFuel) {
    const fuelMap: Record<string, string> = {
      'Gasoline': 'Gasoline',
      'Diesel': 'Diesel',
      'Electric': 'Electric',
      'Plug-in Hybrid': 'Plug-in Hybrid',
      'Hybrid': 'Hybrid',
      'Flex Fuel': 'Flex Fuel',
      'Natural Gas': 'Natural Gas',
    };
    fuelType = fuelMap[primaryFuel] || primaryFuel;
  }

  return {
    vin,
    make: getValue('Make'),
    model: getValue('Model'),
    year: getNumericValue('Model Year'),
    trim: getValue('Trim') || getValue('Series'),
    bodyType: getValue('Body Class'),
    engine,
    engineCylinders: cylinders,
    engineDisplacementL: displacementL,
    transmission,
    drivetrain,
    fuelType,
    msrp: getNumericValue('Base Price') || getNumericValue('Suggested VIN'),
    doors: getNumericValue('Doors'),
    seatingCapacity: getNumericValue('Seats') || getNumericValue('Seating Capacity'),
    vehicleType: getValue('Vehicle Type'),
    plantCountry: getValue('Plant Country'),
    manufacturer: getValue('Manufacturer Name'),
    rawData: results,
  };
}

/**
 * Batch decode multiple VINs with rate limiting
 */
export async function batchDecodeVINs(
  env: Env,
  vins: string[],
  batchSize: number = 10,
  delayMs: number = 1000
): Promise<Map<string, VINEnrichmentResult>> {
  const results = new Map<string, VINEnrichmentResult>();

  // Process in batches to avoid rate limiting
  for (let i = 0; i < vins.length; i += batchSize) {
    const batch = vins.slice(i, i + batchSize);

    console.log(`Processing VIN batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vins.length / batchSize)}`);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (vin) => {
        const normalized = normalizeVIN(vin);
        const result = await decodeVIN(env, normalized);
        return { vin: normalized, result };
      })
    );

    // Store results
    for (const { vin, result } of batchResults) {
      results.set(vin, result);
    }

    // Delay between batches (except for last batch)
    if (i + batchSize < vins.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Compares decoded VIN data with scraped data to identify discrepancies
 */
export interface DataComparison {
  field: string;
  scrapedValue: any;
  vinValue: any;
  matches: boolean;
}

export function compareVINData(
  scrapedData: { make?: string; model?: string; year?: number },
  vinData: DecodedVINData
): DataComparison[] {
  const comparisons: DataComparison[] = [];

  // Compare make
  if (scrapedData.make) {
    comparisons.push({
      field: 'make',
      scrapedValue: scrapedData.make,
      vinValue: vinData.make,
      matches: scrapedData.make.toLowerCase() === vinData.make?.toLowerCase(),
    });
  }

  // Compare model
  if (scrapedData.model) {
    comparisons.push({
      field: 'model',
      scrapedValue: scrapedData.model,
      vinValue: vinData.model,
      matches: scrapedData.model.toLowerCase() === vinData.model?.toLowerCase(),
    });
  }

  // Compare year
  if (scrapedData.year) {
    comparisons.push({
      field: 'year',
      scrapedValue: scrapedData.year,
      vinValue: vinData.year,
      matches: scrapedData.year === vinData.year,
    });
  }

  return comparisons;
}

/**
 * Determines which fields should be enriched from VIN data
 */
export interface EnrichmentPlan {
  field: string;
  currentValue: any;
  newValue: any;
  shouldEnrich: boolean;
  reason: string;
}

export function planEnrichment(
  currentData: Record<string, any>,
  vinData: DecodedVINData
): EnrichmentPlan[] {
  const plan: EnrichmentPlan[] = [];

  const fieldsToCheck = [
    { field: 'engine', vinField: 'engine' as keyof DecodedVINData },
    { field: 'transmission', vinField: 'transmission' as keyof DecodedVINData },
    { field: 'drivetrain', vinField: 'drivetrain' as keyof DecodedVINData },
    { field: 'fuelType', vinField: 'fuelType' as keyof DecodedVINData },
    { field: 'bodyType', vinField: 'bodyType' as keyof DecodedVINData },
    { field: 'cylinders', vinField: 'engineCylinders' as keyof DecodedVINData },
    { field: 'doors', vinField: 'doors' as keyof DecodedVINData },
    { field: 'seatingCapacity', vinField: 'seatingCapacity' as keyof DecodedVINData },
    { field: 'baseMsrp', vinField: 'msrp' as keyof DecodedVINData },
  ];

  for (const { field, vinField } of fieldsToCheck) {
    const currentValue = currentData[field];
    const newValue = vinData[vinField];

    let shouldEnrich = false;
    let reason = '';

    if (newValue === null || newValue === undefined) {
      shouldEnrich = false;
      reason = 'No VIN data available';
    } else if (currentValue === null || currentValue === undefined || currentValue === '') {
      shouldEnrich = true;
      reason = 'Missing data - will fill';
    } else {
      shouldEnrich = false;
      reason = 'Already has value - skip';
    }

    plan.push({
      field,
      currentValue,
      newValue,
      shouldEnrich,
      reason,
    });
  }

  return plan;
}

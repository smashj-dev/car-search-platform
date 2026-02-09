/**
 * Helper utilities for working with the Search API
 * Can be used in both frontend and backend contexts
 */

import type { SearchFilters, SearchQueryParams } from '../types/search';

/**
 * Convert a SearchFilters object to URL query parameters
 * Arrays are converted to comma-separated strings
 * Booleans are converted to 'true' or 'false' strings
 */
export function filtersToQueryParams(filters: SearchFilters): SearchQueryParams {
  const params: any = {};

  // Helper to add param if value exists
  const addParam = (key: string, value: any) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params[key] = value.join(',');
      }
    } else if (typeof value === 'boolean') {
      params[key] = value ? 'true' : 'false';
    } else {
      params[key] = String(value);
    }
  };

  // Multi-select filters
  addParam('make', filters.make);
  addParam('model', filters.model);
  addParam('trim', filters.trim);

  // Range filters
  addParam('year_min', filters.year_min);
  addParam('year_max', filters.year_max);
  addParam('price_min', filters.price_min);
  addParam('price_max', filters.price_max);
  addParam('miles_min', filters.miles_min);
  addParam('miles_max', filters.miles_max);

  // Condition filters
  addParam('condition', filters.condition);
  addParam('is_certified', filters.is_certified);

  // Spec filters
  addParam('exterior_color', filters.exterior_color);
  addParam('interior_color', filters.interior_color);
  addParam('drivetrain', filters.drivetrain);
  addParam('transmission', filters.transmission);
  addParam('fuel_type', filters.fuel_type);

  // Dealer filters
  addParam('dealer_type', filters.dealer_type);

  // Geographic filters
  addParam('zip_code', filters.zip_code);
  addParam('radius', filters.radius);

  // Pagination and sorting
  addParam('page', filters.page);
  addParam('per_page', filters.per_page);
  addParam('sort_by', filters.sort_by);
  addParam('sort_order', filters.sort_order);

  // Feature flags
  addParam('include_facets', filters.include_facets);
  addParam('include_stats', filters.include_stats);
  addParam('include_buckets', filters.include_buckets);

  return params;
}

/**
 * Build a complete search URL with query parameters
 */
export function buildSearchUrl(baseUrl: string, filters: SearchFilters): string {
  const params = filtersToQueryParams(filters);
  const queryString = new URLSearchParams(params as any).toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Parse URL query parameters back into SearchFilters object
 */
export function queryParamsToFilters(params: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};

  // Helper to parse array params
  const parseArray = (value: string | null): string[] | undefined => {
    if (!value) return undefined;
    return value.split(',').map(v => v.trim()).filter(Boolean);
  };

  // Helper to parse number
  const parseNumber = (value: string | null): number | undefined => {
    if (!value) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  };

  // Helper to parse boolean
  const parseBoolean = (value: string | null): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  };

  // Multi-select filters
  filters.make = parseArray(params.get('make'));
  filters.model = parseArray(params.get('model'));
  filters.trim = parseArray(params.get('trim'));

  // Range filters
  filters.year_min = parseNumber(params.get('year_min'));
  filters.year_max = parseNumber(params.get('year_max'));
  filters.price_min = parseNumber(params.get('price_min'));
  filters.price_max = parseNumber(params.get('price_max'));
  filters.miles_min = parseNumber(params.get('miles_min'));
  filters.miles_max = parseNumber(params.get('miles_max'));

  // Condition filters
  const condition = parseArray(params.get('condition'));
  if (condition) {
    filters.condition = condition.filter(c =>
      ['new', 'used', 'certified'].includes(c)
    ) as ('new' | 'used' | 'certified')[];
  }
  filters.is_certified = parseBoolean(params.get('is_certified'));

  // Spec filters
  filters.exterior_color = parseArray(params.get('exterior_color'));
  filters.interior_color = parseArray(params.get('interior_color'));

  const drivetrain = parseArray(params.get('drivetrain'));
  if (drivetrain) {
    filters.drivetrain = drivetrain.filter(d =>
      ['fwd', 'rwd', 'awd', '4wd'].includes(d)
    ) as ('fwd' | 'rwd' | 'awd' | '4wd')[];
  }

  const transmission = parseArray(params.get('transmission'));
  if (transmission) {
    filters.transmission = transmission.filter(t =>
      ['automatic', 'manual'].includes(t)
    ) as ('automatic' | 'manual')[];
  }

  const fuelType = parseArray(params.get('fuel_type'));
  if (fuelType) {
    filters.fuel_type = fuelType.filter(f =>
      ['gas', 'diesel', 'hybrid', 'electric'].includes(f)
    ) as ('gas' | 'diesel' | 'hybrid' | 'electric')[];
  }

  // Dealer filters
  const dealerType = parseArray(params.get('dealer_type'));
  if (dealerType) {
    filters.dealer_type = dealerType.filter(d =>
      ['franchise', 'independent'].includes(d)
    ) as ('franchise' | 'independent')[];
  }

  // Geographic filters
  const zipCode = params.get('zip_code');
  if (zipCode) filters.zip_code = zipCode;
  filters.radius = parseNumber(params.get('radius'));

  // Pagination and sorting
  filters.page = parseNumber(params.get('page'));
  filters.per_page = parseNumber(params.get('per_page'));

  const sortBy = params.get('sort_by');
  if (sortBy && ['price', 'miles', 'year', 'days_on_lot', 'distance'].includes(sortBy)) {
    filters.sort_by = sortBy as any;
  }

  const sortOrder = params.get('sort_order');
  if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
    filters.sort_order = sortOrder as 'asc' | 'desc';
  }

  // Feature flags
  filters.include_facets = parseBoolean(params.get('include_facets'));
  filters.include_stats = parseBoolean(params.get('include_stats'));
  filters.include_buckets = parseBoolean(params.get('include_buckets'));

  return filters;
}

/**
 * Get a human-readable description of active filters
 */
export function getFilterDescription(filters: SearchFilters): string {
  const parts: string[] = [];

  if (filters.make?.length) {
    parts.push(`Make: ${filters.make.join(', ')}`);
  }

  if (filters.model?.length) {
    parts.push(`Model: ${filters.model.join(', ')}`);
  }

  if (filters.year_min || filters.year_max) {
    if (filters.year_min && filters.year_max) {
      parts.push(`Year: ${filters.year_min}-${filters.year_max}`);
    } else if (filters.year_min) {
      parts.push(`Year: ${filters.year_min}+`);
    } else if (filters.year_max) {
      parts.push(`Year: up to ${filters.year_max}`);
    }
  }

  if (filters.price_min || filters.price_max) {
    if (filters.price_min && filters.price_max) {
      parts.push(`Price: $${filters.price_min.toLocaleString()}-$${filters.price_max.toLocaleString()}`);
    } else if (filters.price_min) {
      parts.push(`Price: $${filters.price_min.toLocaleString()}+`);
    } else if (filters.price_max) {
      parts.push(`Price: up to $${filters.price_max.toLocaleString()}`);
    }
  }

  if (filters.miles_max) {
    parts.push(`Mileage: under ${filters.miles_max.toLocaleString()} miles`);
  }

  if (filters.condition?.length) {
    parts.push(`Condition: ${filters.condition.join(', ')}`);
  }

  if (filters.fuel_type?.length) {
    parts.push(`Fuel: ${filters.fuel_type.join(', ')}`);
  }

  if (filters.drivetrain?.length) {
    parts.push(`Drivetrain: ${filters.drivetrain.join(', ')}`);
  }

  if (filters.zip_code) {
    parts.push(`Within ${filters.radius || 100} miles of ${filters.zip_code}`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'All listings';
}

/**
 * Count how many filters are currently active
 */
export function getActiveFilterCount(filters: SearchFilters): number {
  let count = 0;

  // Count each filter category
  if (filters.make?.length) count++;
  if (filters.model?.length) count++;
  if (filters.trim?.length) count++;
  if (filters.year_min || filters.year_max) count++;
  if (filters.price_min || filters.price_max) count++;
  if (filters.miles_min || filters.miles_max) count++;
  if (filters.condition?.length) count++;
  if (filters.is_certified) count++;
  if (filters.exterior_color?.length) count++;
  if (filters.interior_color?.length) count++;
  if (filters.drivetrain?.length) count++;
  if (filters.transmission?.length) count++;
  if (filters.fuel_type?.length) count++;
  if (filters.dealer_type?.length) count++;
  if (filters.zip_code) count++;

  return count;
}

/**
 * Clear all filters and return a clean state
 */
export function clearAllFilters(): SearchFilters {
  return {
    page: 1,
    per_page: 25,
    sort_by: 'price',
    sort_order: 'asc',
  };
}

/**
 * Toggle a value in a multi-select filter array
 */
export function toggleFilterValue<T extends string>(
  current: T[] | undefined,
  value: T
): T[] {
  const arr = current || [];

  if (arr.includes(value)) {
    return arr.filter(v => v !== value);
  } else {
    return [...arr, value];
  }
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 1) return '<1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

/**
 * Format mileage for display
 */
export function formatMileage(miles: number): string {
  return `${miles.toLocaleString()} mi`;
}

/**
 * Calculate price per mile (for comparing value)
 */
export function calculatePricePerMile(price: number, miles: number): number {
  if (miles === 0) return price;
  return price / miles;
}

/**
 * Determine if a listing is a good deal based on price vs MSRP
 */
export function isGoodDeal(price: number, msrp: number | null, threshold = 0.9): boolean {
  if (!msrp || msrp === 0) return false;
  return price / msrp < threshold;
}

/**
 * Get suggested radius based on population density (simple heuristic)
 */
export function getSuggestedRadius(zipCode: string): number {
  // Urban areas (major cities) - smaller radius
  const urbanZips = ['10001', '90001', '60601', '77001', '19101'];
  if (urbanZips.some(z => zipCode.startsWith(z.substring(0, 3)))) {
    return 25;
  }

  // Suburban areas - medium radius
  return 50;

  // Rural areas would use larger radius (100+)
  // This could be enhanced with a proper ZIP code database
}

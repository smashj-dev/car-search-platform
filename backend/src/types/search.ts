/**
 * TypeScript types for the Advanced Search API
 * Use these types in your frontend application for type safety
 */

// Search request types
export interface SearchFilters {
  // Multi-select filters
  make?: string[];
  model?: string[];
  trim?: string[];

  // Range filters
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  miles_min?: number;
  miles_max?: number;

  // Condition filters
  condition?: ('new' | 'used' | 'certified')[];
  is_certified?: boolean;

  // Spec filters
  exterior_color?: string[];
  interior_color?: string[];
  drivetrain?: ('fwd' | 'rwd' | 'awd' | '4wd')[];
  transmission?: ('automatic' | 'manual')[];
  fuel_type?: ('gas' | 'diesel' | 'hybrid' | 'electric')[];

  // Dealer filters
  dealer_type?: ('franchise' | 'independent')[];

  // Geographic filters
  zip_code?: string;
  radius?: number;

  // Pagination and sorting
  page?: number;
  per_page?: number;
  sort_by?: 'price' | 'miles' | 'year' | 'days_on_lot' | 'distance';
  sort_order?: 'asc' | 'desc';

  // Feature flags
  include_facets?: boolean;
  include_stats?: boolean;
  include_buckets?: boolean;
}

// Search response types
export interface SearchResponse {
  success: true;
  data: ListingWithDealer[];
  meta: PaginationMeta;
  facets?: SearchFacets;
  stats?: SearchStats;
  buckets?: SearchBuckets;
  performance?: PerformanceMetrics;
}

export interface ListingWithDealer extends Listing {
  dealer?: Dealer | null;
  distance?: number; // Distance in miles (only if geographic search)
}

export interface Listing {
  id: string;
  vin: string;

  // Vehicle identification
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  version?: string | null;
  bodyType?: string | null;

  // Specs
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  cylinders?: number | null;
  doors?: number | null;
  seatingCapacity?: number | null;

  // Colors
  exteriorColor?: string | null;
  interiorColor?: string | null;

  // Pricing
  price?: number | null;
  baseMsrp?: number | null;
  combinedMsrp?: number | null;
  priceMsrpDiscount?: number | null;

  // Condition
  miles?: number | null;
  condition?: string | null;
  isCertified?: number;

  // Status
  isActive: number;
  isSold?: number;
  soldDate?: string | null;
  inTransit?: number;

  // Timing
  firstSeenAt: string;
  lastSeenAt: string;

  // Source
  source: string;
  sourceUrl: string;
  imageUrl?: string | null;

  // Relations
  dealerId?: string | null;

  // Metadata
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Dealer {
  id: string;
  name: string;
  website?: string | null;

  // Location
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Type
  dealerType?: string | null;

  // Metadata
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface SearchFacets {
  make?: FacetValue[];
  model?: FacetValue[];
  trim?: FacetValue[];
  year?: FacetValue[];
  condition?: FacetValue[];
  exterior_color?: FacetValue[];
  interior_color?: FacetValue[];
  drivetrain?: FacetValue[];
  transmission?: FacetValue[];
  fuel_type?: FacetValue[];
  dealer_type?: FacetValue[];
}

export interface FacetValue {
  value: string | number | null;
  count: number;
}

export interface SearchStats {
  price: StatsValues;
  miles: StatsValues;
  year: YearStats;
}

export interface StatsValues {
  min: number;
  max: number;
  avg: number;
  median?: number;
}

export interface YearStats {
  min: number;
  max: number;
}

export interface SearchBuckets {
  price: BucketValue[];
  miles: BucketValue[];
  year: BucketValue[];
}

export interface BucketValue {
  label: string;
  min?: number;
  max?: number;
  count: number;
}

export interface PerformanceMetrics {
  query_time_ms: number;
  cached_facets: boolean;
}

// Error response type
export interface SearchErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

// Filter options response (for building filter UI)
export interface FilterOptionsResponse {
  success: true;
  data: FilterOptions;
  source: 'cache' | 'database';
}

export interface FilterOptions {
  makes: FacetValue[];
  conditions: FacetValue[];
  drivetrains: FacetValue[];
  transmissions: FacetValue[];
  fuel_types: FacetValue[];
  dealer_types: FacetValue[];
  ranges: {
    year: { min: number; max: number };
    price: { min: number; max: number };
    miles: { min: number; max: number };
  };
}

// Cache invalidation types
export interface CacheInvalidationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Helper type for URL query params
export type SearchQueryParams = {
  [K in keyof SearchFilters]: SearchFilters[K] extends (infer U)[]
    ? string // Array types become comma-separated strings
    : SearchFilters[K] extends boolean
    ? 'true' | 'false'
    : SearchFilters[K] extends number | undefined
    ? string | undefined
    : SearchFilters[K];
};

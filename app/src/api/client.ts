const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://car-search-api.joshm-e13.workers.dev/api/v1';

export interface Listing {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price?: number;
  miles?: number;
  condition: string;
  exteriorColor?: string;
  interiorColor?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  imageUrl?: string;
  source: string;
  sourceUrl: string;
  dealerId?: string;
  isActive: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface SearchParams {
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  miles_max?: number;
  condition?: 'new' | 'used' | 'certified';
  drivetrain?: string;
  fuel_type?: string;
  exterior_color?: string;
  page?: number;
  per_page?: number;
  sort_by?: 'price' | 'miles' | 'year';
  sort_order?: 'asc' | 'desc';
}

export interface SearchResponse {
  success: boolean;
  data: Listing[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface PriceHistory {
  id: string;
  listingId: string;
  vin: string;
  price?: number;
  miles?: number;
  source: string;
  recordedAt: string;
}

export async function searchListings(params: SearchParams): Promise<SearchResponse> {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });

  const response = await fetch(`${API_BASE_URL}/listings?${queryParams}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getListingByVin(vin: string): Promise<Listing> {
  const response = await fetch(`${API_BASE_URL}/listings/${vin}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

export async function getPriceHistory(vin: string): Promise<PriceHistory[]> {
  const response = await fetch(`${API_BASE_URL}/listings/${vin}/history`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

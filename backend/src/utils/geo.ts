/**
 * Geographic utilities for distance calculations and ZIP code lookups
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bounding box for a given point and radius
 * Returns min/max lat/lon for efficient database filtering
 */
export function getBoundingBox(
  lat: number,
  lon: number,
  radiusMiles: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  const latChange = radiusMiles / 69; // 1 degree lat = ~69 miles
  const lonChange = radiusMiles / (Math.cos(toRadians(lat)) * 69); // Adjust for latitude

  return {
    minLat: lat - latChange,
    maxLat: lat + latChange,
    minLon: lon - lonChange,
    maxLon: lon + lonChange,
  };
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Simple ZIP code to coordinates lookup
 * In production, this should use a proper geocoding service or database
 * For now, we'll use a minimal US ZIP code database
 */
const ZIP_COORDS: Record<string, Coordinates> = {
  // Major US cities for testing
  '10001': { lat: 40.7506, lon: -73.9971 }, // New York, NY
  '90001': { lat: 33.9731, lon: -118.2479 }, // Los Angeles, CA
  '60601': { lat: 41.8859, lon: -87.6181 }, // Chicago, IL
  '77001': { lat: 29.7589, lon: -95.3677 }, // Houston, TX
  '85001': { lat: 33.4484, lon: -112.0741 }, // Phoenix, AZ
  '19101': { lat: 39.9526, lon: -75.1652 }, // Philadelphia, PA
  '78201': { lat: 29.4252, lon: -98.4946 }, // San Antonio, TX
  '92101': { lat: 32.7157, lon: -117.1611 }, // San Diego, CA
  '75201': { lat: 32.7767, lon: -96.7970 }, // Dallas, TX
  '95101': { lat: 37.3382, lon: -121.8863 }, // San Jose, CA
  '98101': { lat: 47.6062, lon: -122.3321 }, // Seattle, WA
  '80201': { lat: 39.7392, lon: -104.9903 }, // Denver, CO
  '20001': { lat: 38.9072, lon: -77.0369 }, // Washington, DC
  '02101': { lat: 42.3601, lon: -71.0589 }, // Boston, MA
  '33101': { lat: 25.7617, lon: -80.1918 }, // Miami, FL
  '30301': { lat: 33.7490, lon: -84.3880 }, // Atlanta, GA
  '48201': { lat: 42.3314, lon: -83.0458 }, // Detroit, MI
  '55401': { lat: 44.9778, lon: -93.2650 }, // Minneapolis, MN
  '63101': { lat: 38.6270, lon: -90.1994 }, // St. Louis, MO
  '97201': { lat: 45.5152, lon: -122.6784 }, // Portland, OR
};

/**
 * Get coordinates for a ZIP code
 * In production, integrate with a geocoding API or full ZIP database
 */
export async function getCoordinatesFromZip(zipCode: string): Promise<Coordinates | null> {
  // Normalize ZIP code (remove +4 extension if present)
  const normalizedZip = zipCode.split('-')[0].padStart(5, '0');

  // Check our local database
  const coords = ZIP_COORDS[normalizedZip];
  if (coords) {
    return coords;
  }

  // In production, you would call a geocoding service here:
  // - Google Maps Geocoding API
  // - Mapbox Geocoding API
  // - US Census Geocoding Services
  // - ZIPCodeAPI.com
  // - PostGIS with full ZIP code database

  // For now, return null if not in our limited database
  return null;
}

/**
 * Filter results by radius from a ZIP code
 * This is an application-layer filter when database doesn't support geographic queries
 */
export function filterByRadius<T extends { dealer?: { latitude?: number | null; longitude?: number | null } }>(
  listings: T[],
  centerLat: number,
  centerLon: number,
  radiusMiles: number
): T[] {
  return listings.filter(listing => {
    if (!listing.dealer?.latitude || !listing.dealer?.longitude) {
      return false;
    }

    const distance = calculateDistance(
      centerLat,
      centerLon,
      listing.dealer.latitude,
      listing.dealer.longitude
    );

    return distance <= radiusMiles;
  });
}

/**
 * Sort results by distance from a point
 */
export function sortByDistance<T extends { dealer?: { latitude?: number | null; longitude?: number | null } }>(
  listings: T[],
  centerLat: number,
  centerLon: number
): (T & { distance?: number })[] {
  return listings
    .map(listing => {
      if (!listing.dealer?.latitude || !listing.dealer?.longitude) {
        return { ...listing, distance: Infinity };
      }

      const distance = calculateDistance(
        centerLat,
        centerLon,
        listing.dealer.latitude,
        listing.dealer.longitude
      );

      return { ...listing, distance };
    })
    .sort((a, b) => {
      const distA = a.distance ?? Infinity;
      const distB = b.distance ?? Infinity;
      return distA - distB;
    });
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 1) {
    return '<1 mi';
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

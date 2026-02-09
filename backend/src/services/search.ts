import { eq, and, gte, lte, sql, desc, asc, inArray, or } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { calculateDistance } from '../utils/geo';

export interface SearchFilters {
  // Basic filters
  make?: string[];
  model?: string[];
  trim?: string[];
  year_min?: number;
  year_max?: number;

  // Price and mileage
  price_min?: number;
  price_max?: number;
  miles_min?: number;
  miles_max?: number;

  // Condition and status
  condition?: ('new' | 'used' | 'certified')[];
  is_certified?: boolean;

  // Specs
  exterior_color?: string[];
  interior_color?: string[];
  drivetrain?: ('fwd' | 'rwd' | 'awd' | '4wd')[];
  transmission?: ('automatic' | 'manual')[];
  fuel_type?: ('gas' | 'diesel' | 'hybrid' | 'electric')[];

  // Dealer
  dealer_type?: ('franchise' | 'independent')[];

  // Geographic
  zip_code?: string;
  radius?: number;

  // Pagination and sorting
  page?: number;
  per_page?: number;
  sort_by?: 'price' | 'miles' | 'year' | 'days_on_lot' | 'distance';
  sort_order?: 'asc' | 'desc';
}

export interface SearchResults {
  data: any[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  facets: Record<string, FacetValue[]>;
  stats: {
    price: StatsValues;
    miles: StatsValues;
    year: YearStats;
  };
  buckets?: {
    price: BucketValue[];
    miles: BucketValue[];
    year: BucketValue[];
  };
}

export interface FacetValue {
  value: string | number | null;
  count: number;
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

export interface BucketValue {
  label: string;
  min?: number;
  max?: number;
  count: number;
}

export class SearchService {
  constructor(private db: DrizzleD1Database<typeof schema>) {}

  async search(filters: SearchFilters, userZipLocation?: { lat: number; lon: number }): Promise<SearchResults> {
    const page = filters.page || 1;
    const perPage = filters.per_page || 25;
    const offset = (page - 1) * perPage;

    // Build WHERE conditions
    const conditions = this.buildWhereConditions(filters);

    // Build ORDER BY clause
    const orderBy = this.buildOrderBy(filters, userZipLocation);

    // Execute main query with joins
    const results = await this.db
      .select({
        listing: schema.listings,
        dealer: schema.dealers,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(perPage)
      .offset(offset);

    // Flatten results and add distance if geographic search
    const flatResults = results.map(r => {
      const listing = { ...r.listing, dealer: r.dealer };

      if (userZipLocation && r.dealer?.latitude && r.dealer?.longitude) {
        const distance = calculateDistance(
          userZipLocation.lat,
          userZipLocation.lon,
          r.dealer.latitude,
          r.dealer.longitude
        );
        return { ...listing, distance: Math.round(distance) };
      }

      return listing;
    });

    // Get total count
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions));

    // Get facets, stats, and buckets in parallel
    const [facets, stats, buckets] = await Promise.all([
      this.getFacets(conditions),
      this.getStats(conditions),
      this.getBuckets(conditions),
    ]);

    return {
      data: flatResults,
      meta: {
        page,
        per_page: perPage,
        total: count,
        total_pages: Math.ceil(count / perPage),
      },
      facets,
      stats,
      buckets,
    };
  }

  private buildWhereConditions(filters: SearchFilters) {
    const conditions = [eq(schema.listings.isActive, 1)];

    // Multi-select filters
    if (filters.make && filters.make.length > 0) {
      conditions.push(inArray(schema.listings.make, filters.make));
    }
    if (filters.model && filters.model.length > 0) {
      conditions.push(inArray(schema.listings.model, filters.model));
    }
    if (filters.trim && filters.trim.length > 0) {
      conditions.push(inArray(schema.listings.trim, filters.trim));
    }

    // Range filters
    if (filters.year_min) {
      conditions.push(gte(schema.listings.year, filters.year_min));
    }
    if (filters.year_max) {
      conditions.push(lte(schema.listings.year, filters.year_max));
    }
    if (filters.price_min) {
      conditions.push(gte(schema.listings.price, filters.price_min));
    }
    if (filters.price_max) {
      conditions.push(lte(schema.listings.price, filters.price_max));
    }
    if (filters.miles_min) {
      conditions.push(gte(schema.listings.miles, filters.miles_min));
    }
    if (filters.miles_max) {
      conditions.push(lte(schema.listings.miles, filters.miles_max));
    }

    // Condition filters
    if (filters.condition && filters.condition.length > 0) {
      conditions.push(inArray(schema.listings.condition, filters.condition));
    }
    if (filters.is_certified !== undefined) {
      conditions.push(eq(schema.listings.isCertified, filters.is_certified ? 1 : 0));
    }

    // Multi-select spec filters
    if (filters.exterior_color && filters.exterior_color.length > 0) {
      conditions.push(inArray(schema.listings.exteriorColor, filters.exterior_color));
    }
    if (filters.interior_color && filters.interior_color.length > 0) {
      conditions.push(inArray(schema.listings.interiorColor, filters.interior_color));
    }
    if (filters.drivetrain && filters.drivetrain.length > 0) {
      conditions.push(inArray(schema.listings.drivetrain, filters.drivetrain));
    }
    if (filters.transmission && filters.transmission.length > 0) {
      conditions.push(inArray(schema.listings.transmission, filters.transmission));
    }
    if (filters.fuel_type && filters.fuel_type.length > 0) {
      conditions.push(inArray(schema.listings.fuelType, filters.fuel_type));
    }

    // Dealer type filter
    if (filters.dealer_type && filters.dealer_type.length > 0) {
      conditions.push(inArray(schema.dealers.dealerType, filters.dealer_type));
    }

    // Geographic filter - handled by filtering in application layer after distance calculation
    // For SQL efficiency, we could add a bounding box filter here if we had indexed lat/lon

    return conditions;
  }

  private buildOrderBy(filters: SearchFilters, userZipLocation?: { lat: number; lon: number }) {
    const sortOrder = filters.sort_order === 'desc' ? desc : asc;

    switch (filters.sort_by) {
      case 'miles':
        return sortOrder(schema.listings.miles);
      case 'year':
        return sortOrder(schema.listings.year);
      case 'days_on_lot':
        return sortOrder(sql`julianday('now') - julianday(${schema.listings.firstSeenAt})`);
      case 'distance':
        // Distance sorting requires post-processing in application layer
        // Default to price for now
        return sortOrder(schema.listings.price);
      case 'price':
      default:
        return sortOrder(schema.listings.price);
    }
  }

  private async getFacets(conditions: any[]): Promise<Record<string, FacetValue[]>> {
    const facets: Record<string, FacetValue[]> = {};

    // Make facet
    const makes = await this.db
      .select({
        value: schema.listings.make,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions))
      .groupBy(schema.listings.make)
      .orderBy(desc(sql`count(*)`))
      .limit(50);
    facets.make = makes;

    // Model facet
    const models = await this.db
      .select({
        value: schema.listings.model,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions))
      .groupBy(schema.listings.model)
      .orderBy(desc(sql`count(*)`))
      .limit(50);
    facets.model = models;

    // Trim facet
    const trims = await this.db
      .select({
        value: schema.listings.trim,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.trim} IS NOT NULL`))
      .groupBy(schema.listings.trim)
      .orderBy(desc(sql`count(*)`))
      .limit(50);
    facets.trim = trims;

    // Year facet
    const years = await this.db
      .select({
        value: schema.listings.year,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions))
      .groupBy(schema.listings.year)
      .orderBy(desc(schema.listings.year))
      .limit(20);
    facets.year = years;

    // Condition facet
    const conditionFacets = await this.db
      .select({
        value: schema.listings.condition,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.condition} IS NOT NULL`))
      .groupBy(schema.listings.condition);
    facets.condition = conditionFacets;

    // Exterior color facet
    const exteriorColors = await this.db
      .select({
        value: schema.listings.exteriorColor,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.exteriorColor} IS NOT NULL`))
      .groupBy(schema.listings.exteriorColor)
      .orderBy(desc(sql`count(*)`))
      .limit(20);
    facets.exterior_color = exteriorColors;

    // Interior color facet
    const interiorColors = await this.db
      .select({
        value: schema.listings.interiorColor,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.interiorColor} IS NOT NULL`))
      .groupBy(schema.listings.interiorColor)
      .orderBy(desc(sql`count(*)`))
      .limit(20);
    facets.interior_color = interiorColors;

    // Drivetrain facet
    const drivetrains = await this.db
      .select({
        value: schema.listings.drivetrain,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.drivetrain} IS NOT NULL`))
      .groupBy(schema.listings.drivetrain);
    facets.drivetrain = drivetrains;

    // Transmission facet
    const transmissions = await this.db
      .select({
        value: schema.listings.transmission,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.transmission} IS NOT NULL`))
      .groupBy(schema.listings.transmission);
    facets.transmission = transmissions;

    // Fuel type facet
    const fuelTypes = await this.db
      .select({
        value: schema.listings.fuelType,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.fuelType} IS NOT NULL`))
      .groupBy(schema.listings.fuelType);
    facets.fuel_type = fuelTypes;

    // Dealer type facet
    const dealerTypes = await this.db
      .select({
        value: schema.dealers.dealerType,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.dealers.dealerType} IS NOT NULL`))
      .groupBy(schema.dealers.dealerType);
    facets.dealer_type = dealerTypes;

    return facets;
  }

  private async getStats(conditions: any[]): Promise<any> {
    // Price stats
    const [priceStats] = await this.db
      .select({
        min: sql<number>`MIN(${schema.listings.price})`,
        max: sql<number>`MAX(${schema.listings.price})`,
        avg: sql<number>`ROUND(AVG(${schema.listings.price}))`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.price} IS NOT NULL`));

    // Miles stats
    const [milesStats] = await this.db
      .select({
        min: sql<number>`MIN(${schema.listings.miles})`,
        max: sql<number>`MAX(${schema.listings.miles})`,
        avg: sql<number>`ROUND(AVG(${schema.listings.miles}))`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.miles} IS NOT NULL`));

    // Year stats
    const [yearStats] = await this.db
      .select({
        min: sql<number>`MIN(${schema.listings.year})`,
        max: sql<number>`MAX(${schema.listings.year})`,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions));

    // Calculate median by fetching sorted prices (simpler for D1)
    const prices = await this.db
      .select({
        price: schema.listings.price,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.price} IS NOT NULL`))
      .orderBy(schema.listings.price);

    let median = priceStats.avg;
    if (prices.length > 0) {
      const midpoint = Math.floor(prices.length / 2);
      if (prices.length % 2 === 0) {
        median = (prices[midpoint - 1].price + prices[midpoint].price) / 2;
      } else {
        median = prices[midpoint].price;
      }
    }

    return {
      price: {
        ...priceStats,
        median,
      },
      miles: milesStats,
      year: yearStats,
    };
  }

  private async getBuckets(conditions: any[]): Promise<any> {
    // Price buckets - fetch raw prices and calculate buckets in JS (D1 doesn't support CASE in GROUP BY)
    const prices = await this.db
      .select({
        price: schema.listings.price,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.price} IS NOT NULL`));

    // Calculate price buckets
    const priceBucketMap = new Map<string, number>();
    for (const { price } of prices) {
      let bucket: string;
      if (price < 20000) bucket = 'Under $20k';
      else if (price < 30000) bucket = '$20k-$30k';
      else if (price < 40000) bucket = '$30k-$40k';
      else if (price < 50000) bucket = '$40k-$50k';
      else bucket = '$50k+';

      priceBucketMap.set(bucket, (priceBucketMap.get(bucket) || 0) + 1);
    }

    // Convert to array and sort
    const priceBuckets = Array.from(priceBucketMap.entries())
      .map(([label, count]) => ({ bucket: label, count }))
      .sort((a, b) => {
        const order = ['Under $20k', '$20k-$30k', '$30k-$40k', '$40k-$50k', '$50k+'];
        return order.indexOf(a.bucket) - order.indexOf(b.bucket);
      });

    // Mileage buckets - fetch raw miles and calculate buckets in JS
    const miles = await this.db
      .select({
        miles: schema.listings.miles,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions, sql`${schema.listings.miles} IS NOT NULL`));

    // Calculate miles buckets
    const milesBucketMap = new Map<string, number>();
    for (const { miles: m } of miles) {
      let bucket: string;
      if (m < 10000) bucket = 'Under 10k';
      else if (m < 25000) bucket = '10k-25k';
      else if (m < 50000) bucket = '25k-50k';
      else if (m < 75000) bucket = '50k-75k';
      else bucket = '75k+';

      milesBucketMap.set(bucket, (milesBucketMap.get(bucket) || 0) + 1);
    }

    // Convert to array and sort
    const milesBuckets = Array.from(milesBucketMap.entries())
      .map(([label, count]) => ({ bucket: label, count }))
      .sort((a, b) => {
        const order = ['Under 10k', '10k-25k', '25k-50k', '50k-75k', '75k+'];
        return order.indexOf(a.bucket) - order.indexOf(b.bucket);
      });

    // Year buckets - fetch raw years and calculate buckets in JS
    const years = await this.db
      .select({
        year: schema.listings.year,
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(...conditions));

    // Calculate year buckets
    const yearBucketMap = new Map<string, number>();
    for (const { year } of years) {
      let bucket: string;
      if (year === 2024) bucket = '2024';
      else if (year === 2023) bucket = '2023';
      else if (year === 2022) bucket = '2022';
      else if (year === 2021) bucket = '2021';
      else bucket = '2020 and older';

      yearBucketMap.set(bucket, (yearBucketMap.get(bucket) || 0) + 1);
    }

    // Convert to array and sort
    const yearBuckets = Array.from(yearBucketMap.entries())
      .map(([label, count]) => ({ bucket: label, count }))
      .sort((a, b) => {
        const order = ['2024', '2023', '2022', '2021', '2020 and older'];
        return order.indexOf(a.bucket) - order.indexOf(b.bucket);
      });

    return {
      price: priceBuckets.map(b => ({ label: b.bucket, count: b.count })),
      miles: milesBuckets.map(b => ({ label: b.bucket, count: b.count })),
      year: yearBuckets.map(b => ({ label: b.bucket, count: b.count })),
    };
  }
}

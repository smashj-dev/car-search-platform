import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, sql, desc, like } from 'drizzle-orm';
import type { Env } from '../types/env';
import * as schema from '../db/schema';
import { SearchService } from '../services/search';
import { FacetsCache } from '../services/facets';
import { getCoordinatesFromZip, filterByRadius, sortByDistance } from '../utils/geo';

export const listingsRouter = new Hono<{ Bindings: Env }>();

// Helper to parse comma-separated values into arrays
const parseArray = (value: string | undefined): string[] | undefined => {
  if (!value) return undefined;
  return value.split(',').map(v => v.trim()).filter(Boolean);
};

// Enhanced search schema with faceted search support
const searchSchema = z.object({
  // Multi-select filters (comma-separated)
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),

  // Range filters
  year_min: z.coerce.number().optional(),
  year_max: z.coerce.number().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  miles_min: z.coerce.number().optional(),
  miles_max: z.coerce.number().optional(),

  // Condition filters
  condition: z.string().optional(), // Comma-separated: new,used,certified
  is_certified: z.enum(['true', 'false']).optional(),

  // Spec filters (comma-separated)
  exterior_color: z.string().optional(),
  interior_color: z.string().optional(),
  drivetrain: z.string().optional(), // fwd,rwd,awd,4wd
  transmission: z.string().optional(), // automatic,manual
  fuel_type: z.string().optional(), // gas,diesel,hybrid,electric

  // Dealer filters
  dealer_type: z.string().optional(), // franchise,independent

  // Geographic filters
  zip_code: z.string().optional(),
  radius: z.coerce.number().default(100),

  // Pagination and sorting
  page: z.coerce.number().default(1),
  per_page: z.coerce.number().min(1).max(100).default(25),
  sort_by: z.enum(['price', 'miles', 'year', 'days_on_lot', 'distance']).default('price'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),

  // Feature flags
  include_facets: z.enum(['true', 'false']).default('true'),
  include_stats: z.enum(['true', 'false']).default('true'),
  include_buckets: z.enum(['true', 'false']).default('true'),
});

listingsRouter.get('/', zValidator('query', searchSchema), async (c) => {
  const params = c.req.valid('query');
  const db = drizzle(c.env.DB, { schema });
  const searchService = new SearchService(db);
  const facetsCache = new FacetsCache(c.env.CACHE);

  // Parse multi-select filters
  const filters = {
    make: parseArray(params.make),
    model: parseArray(params.model),
    trim: parseArray(params.trim),
    year_min: params.year_min,
    year_max: params.year_max,
    price_min: params.price_min,
    price_max: params.price_max,
    miles_min: params.miles_min,
    miles_max: params.miles_max,
    condition: parseArray(params.condition) as ('new' | 'used' | 'certified')[] | undefined,
    is_certified: params.is_certified === 'true' ? true : params.is_certified === 'false' ? false : undefined,
    exterior_color: parseArray(params.exterior_color),
    interior_color: parseArray(params.interior_color),
    drivetrain: parseArray(params.drivetrain) as ('fwd' | 'rwd' | 'awd' | '4wd')[] | undefined,
    transmission: parseArray(params.transmission) as ('automatic' | 'manual')[] | undefined,
    fuel_type: parseArray(params.fuel_type) as ('gas' | 'diesel' | 'hybrid' | 'electric')[] | undefined,
    dealer_type: parseArray(params.dealer_type) as ('franchise' | 'independent')[] | undefined,
    zip_code: params.zip_code,
    radius: params.radius,
    page: params.page,
    per_page: params.per_page,
    sort_by: params.sort_by,
    sort_order: params.sort_order,
  };

  // Handle geographic search
  let userLocation: { lat: number; lon: number } | undefined;
  if (filters.zip_code) {
    const coords = await getCoordinatesFromZip(filters.zip_code);
    if (coords) {
      userLocation = coords;
    }
  }

  // Try to get cached facets first
  const cacheKey = FacetsCache.generateCacheKey(filters);
  const startTime = Date.now();

  try {
    // Execute search
    let results = await searchService.search(filters, userLocation);

    // Apply geographic filtering if needed (application-layer)
    if (userLocation && filters.radius) {
      results.data = filterByRadius(results.data, userLocation.lat, userLocation.lon, filters.radius);

      // Update total count after filtering
      results.meta.total = results.data.length;
      results.meta.total_pages = Math.ceil(results.data.length / filters.per_page);

      // If sorting by distance, re-sort
      if (filters.sort_by === 'distance') {
        results.data = sortByDistance(results.data, userLocation.lat, userLocation.lon);
      }
    }

    // Build response based on feature flags
    const response: any = {
      success: true,
      data: results.data,
      meta: results.meta,
    };

    if (params.include_facets === 'true') {
      response.facets = results.facets;
    }
    if (params.include_stats === 'true') {
      response.stats = results.stats;
    }
    if (params.include_buckets === 'true') {
      response.buckets = results.buckets;
    }

    // Cache facets for future requests with same filters
    if (params.include_facets === 'true' && results.facets) {
      await facetsCache.set(cacheKey, {
        facets: results.facets,
        stats: results.stats,
        buckets: results.buckets,
      });
    }

    const queryTime = Date.now() - startTime;

    response.performance = {
      query_time_ms: queryTime,
      cached_facets: false,
    };

    return c.json(response);
  } catch (error) {
    console.error('Search error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to execute search',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

// Get listing detail by VIN
listingsRouter.get('/:vin', async (c) => {
  const vin = c.req.param('vin');
  const cacheKey = `listing:${vin}`;

  // Check cache first
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json({ success: true, data: cached, source: 'cache' });
  }

  const db = drizzle(c.env.DB, { schema });

  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.vin, vin),
  });

  if (!listing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } }, 404);
  }

  // Get dealer info if available
  let dealer = null;
  if (listing.dealerId) {
    dealer = await db.query.dealers.findFirst({
      where: eq(schema.dealers.id, listing.dealerId),
    });
  }

  const response = {
    ...listing,
    dealer,
  };

  // Cache for 1 hour
  await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 });

  return c.json({ success: true, data: response, source: 'database' });
});

// Get price history for a listing
listingsRouter.get('/:vin/history', async (c) => {
  const vin = c.req.param('vin');
  const db = drizzle(c.env.DB, { schema });

  const history = await db
    .select()
    .from(schema.listingPriceHistory)
    .where(eq(schema.listingPriceHistory.vin, vin))
    .orderBy(desc(schema.listingPriceHistory.recordedAt));

  return c.json({
    success: true,
    data: history,
  });
});

// Get filter options (facets) - quick endpoint for building filter UI
listingsRouter.get('/filters/options', async (c) => {
  const cacheKey = 'filter-options:all';

  // Check cache first
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json({
      success: true,
      data: cached,
      source: 'cache',
    });
  }

  const db = drizzle(c.env.DB, { schema });

  // Get all filter options in parallel
  const [
    makes,
    conditions,
    drivetrains,
    transmissions,
    fuelTypes,
    dealerTypes,
    yearRange,
    priceRange,
    milesRange,
  ] = await Promise.all([
    // Makes
    db
      .select({
        value: schema.listings.make,
        count: sql<number>`count(*)`
      })
      .from(schema.listings)
      .where(eq(schema.listings.isActive, 1))
      .groupBy(schema.listings.make)
      .orderBy(desc(sql`count(*)`)),

    // Conditions
    db
      .select({
        value: schema.listings.condition,
        count: sql<number>`count(*)`
      })
      .from(schema.listings)
      .where(and(eq(schema.listings.isActive, 1), sql`${schema.listings.condition} IS NOT NULL`))
      .groupBy(schema.listings.condition),

    // Drivetrains
    db
      .select({
        value: schema.listings.drivetrain,
        count: sql<number>`count(*)`
      })
      .from(schema.listings)
      .where(and(eq(schema.listings.isActive, 1), sql`${schema.listings.drivetrain} IS NOT NULL`))
      .groupBy(schema.listings.drivetrain),

    // Transmissions
    db
      .select({
        value: schema.listings.transmission,
        count: sql<number>`count(*)`
      })
      .from(schema.listings)
      .where(and(eq(schema.listings.isActive, 1), sql`${schema.listings.transmission} IS NOT NULL`))
      .groupBy(schema.listings.transmission),

    // Fuel Types
    db
      .select({
        value: schema.listings.fuelType,
        count: sql<number>`count(*)`
      })
      .from(schema.listings)
      .where(and(eq(schema.listings.isActive, 1), sql`${schema.listings.fuelType} IS NOT NULL`))
      .groupBy(schema.listings.fuelType),

    // Dealer Types
    db
      .select({
        value: schema.dealers.dealerType,
        count: sql<number>`count(DISTINCT ${schema.listings.id})`
      })
      .from(schema.listings)
      .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
      .where(and(eq(schema.listings.isActive, 1), sql`${schema.dealers.dealerType} IS NOT NULL`))
      .groupBy(schema.dealers.dealerType),

    // Year range
    db
      .select({
        min: sql<number>`MIN(year)`,
        max: sql<number>`MAX(year)`,
      })
      .from(schema.listings)
      .where(eq(schema.listings.isActive, 1)),

    // Price range
    db
      .select({
        min: sql<number>`MIN(price)`,
        max: sql<number>`MAX(price)`,
      })
      .from(schema.listings)
      .where(and(eq(schema.listings.isActive, 1), sql`${schema.listings.price} IS NOT NULL`)),

    // Miles range
    db
      .select({
        min: sql<number>`MIN(miles)`,
        max: sql<number>`MAX(miles)`,
      })
      .from(schema.listings)
      .where(and(eq(schema.listings.isActive, 1), sql`${schema.listings.miles} IS NOT NULL`)),
  ]);

  const filterOptions = {
    makes: makes.map(m => ({ value: m.value, count: m.count })),
    conditions: conditions.map(c => ({ value: c.value, count: c.count })),
    drivetrains: drivetrains.map(d => ({ value: d.value, count: d.count })),
    transmissions: transmissions.map(t => ({ value: t.value, count: t.count })),
    fuel_types: fuelTypes.map(f => ({ value: f.value, count: f.count })),
    dealer_types: dealerTypes.map(d => ({ value: d.value, count: d.count })),
    ranges: {
      year: yearRange[0],
      price: priceRange[0],
      miles: milesRange[0],
    },
  };

  // Cache for 10 minutes
  await c.env.CACHE.put(cacheKey, JSON.stringify(filterOptions), { expirationTtl: 600 });

  return c.json({
    success: true,
    data: filterOptions,
    source: 'database',
  });
});

// Invalidate cache (webhook for scraper to call when new listings added)
listingsRouter.post('/cache/invalidate', async (c) => {
  const authHeader = c.req.header('Authorization');
  const expectedToken = c.env.CACHE_INVALIDATION_TOKEN || 'dev-token-change-in-production';

  if (authHeader !== `Bearer ${expectedToken}`) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const facetsCache = new FacetsCache(c.env.CACHE);
    await facetsCache.invalidateAll();

    // Also invalidate filter options cache
    await c.env.CACHE.delete('filter-options:all');

    return c.json({
      success: true,
      message: 'Cache invalidated successfully',
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to invalidate cache',
      },
      500
    );
  }
});
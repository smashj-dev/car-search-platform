import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, sql, desc, like } from 'drizzle-orm';
import type { Env } from '../types/env';
import * as schema from '../db/schema';

export const listingsRouter = new Hono<{ Bindings: Env }>();

// Search listings with filters
const searchSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year_min: z.coerce.number().optional(),
  year_max: z.coerce.number().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  miles_max: z.coerce.number().optional(),
  condition: z.enum(['new', 'used', 'certified']).optional(),
  drivetrain: z.string().optional(),
  fuel_type: z.string().optional(),
  exterior_color: z.string().optional(),
  zip_code: z.string().optional(),
  radius: z.coerce.number().default(100),
  page: z.coerce.number().default(1),
  per_page: z.coerce.number().default(25),
  sort_by: z.enum(['price', 'miles', 'year']).default('price'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

listingsRouter.get('/', zValidator('query', searchSchema), async (c) => {
  const params = c.req.valid('query');
  const db = drizzle(c.env.DB, { schema });

  // Build where conditions
  const conditions = [eq(schema.listings.isActive, 1)];

  if (params.make) {
    conditions.push(like(schema.listings.make, `%${params.make}%`));
  }
  if (params.model) {
    conditions.push(like(schema.listings.model, `%${params.model}%`));
  }
  if (params.year_min) {
    conditions.push(gte(schema.listings.year, params.year_min));
  }
  if (params.year_max) {
    conditions.push(lte(schema.listings.year, params.year_max));
  }
  if (params.price_min) {
    conditions.push(gte(schema.listings.price, params.price_min));
  }
  if (params.price_max) {
    conditions.push(lte(schema.listings.price, params.price_max));
  }
  if (params.miles_max) {
    conditions.push(lte(schema.listings.miles, params.miles_max));
  }
  if (params.condition) {
    conditions.push(eq(schema.listings.condition, params.condition));
  }
  if (params.drivetrain) {
    conditions.push(eq(schema.listings.drivetrain, params.drivetrain));
  }
  if (params.fuel_type) {
    conditions.push(eq(schema.listings.fuelType, params.fuel_type));
  }
  if (params.exterior_color) {
    conditions.push(like(schema.listings.exteriorColor, `%${params.exterior_color}%`));
  }

  // Calculate offset
  const offset = (params.page - 1) * params.per_page;

  // Determine sort column
  let sortColumn;
  switch (params.sort_by) {
    case 'miles':
      sortColumn = schema.listings.miles;
      break;
    case 'year':
      sortColumn = schema.listings.year;
      break;
    default:
      sortColumn = schema.listings.price;
  }

  // Query with pagination, sorting, and dealer join
  const results = await db
    .select({
      listing: schema.listings,
      dealer: schema.dealers,
    })
    .from(schema.listings)
    .leftJoin(schema.dealers, eq(schema.listings.dealerId, schema.dealers.id))
    .where(and(...conditions))
    .orderBy(params.sort_order === 'desc' ? desc(sortColumn) : sortColumn)
    .limit(params.per_page)
    .offset(offset);

  // Flatten results
  const flatResults = results.map(r => ({
    ...r.listing,
    dealer: r.dealer,
  }));

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.listings)
    .where(and(...conditions));

  return c.json({
    success: true,
    data: flatResults,
    meta: {
      page: params.page,
      per_page: params.per_page,
      total: count,
      total_pages: Math.ceil(count / params.per_page),
    },
  });
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

// Get filter options (facets)
listingsRouter.get('/filters/options', async (c) => {
  const db = drizzle(c.env.DB, { schema });

  // Get unique makes
  const makes = await db
    .select({ value: schema.listings.make })
    .from(schema.listings)
    .where(eq(schema.listings.isActive, 1))
    .groupBy(schema.listings.make);

  // Get year range
  const [yearRange] = await db
    .select({
      min: sql<number>`MIN(year)`,
      max: sql<number>`MAX(year)`,
    })
    .from(schema.listings)
    .where(eq(schema.listings.isActive, 1));

  // Get price range
  const [priceRange] = await db
    .select({
      min: sql<number>`MIN(price)`,
      max: sql<number>`MAX(price)`,
    })
    .from(schema.listings)
    .where(eq(schema.listings.isActive, 1));

  return c.json({
    success: true,
    data: {
      makes: makes.map(m => m.value),
      year_range: yearRange,
      price_range: priceRange,
    },
  });
});

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { Env } from '../types/env';
import * as schema from '../db/schema';
import { generateNormalizedKey } from '../utils/helpers';

export const carsRouter = new Hono<{ Bindings: Env }>();

// Get car by normalized key (e.g., "genesis_gv80_2021")
carsRouter.get('/:key', async (c) => {
  const key = c.req.param('key');
  const cacheKey = `car:${key}`;

  // Check KV cache first
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json({ data: cached, source: 'cache' });
  }

  // Query D1
  const db = drizzle(c.env.DB, { schema });
  const car = await db.query.cars.findFirst({
    where: eq(schema.cars.normalizedKey, key),
  });

  if (!car) {
    return c.json({ error: 'Car not found' }, 404);
  }

  // Cache for 1 hour
  await c.env.CACHE.put(cacheKey, JSON.stringify(car), { expirationTtl: 3600 });

  return c.json({ data: car, source: 'database' });
});

// Get car with all insights
carsRouter.get('/:key/full', async (c) => {
  const key = c.req.param('key');
  const cacheKey = `car_full:${key}`;

  // Check KV cache first
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json({ data: cached, source: 'cache' });
  }

  const db = drizzle(c.env.DB, { schema });

  // Get car
  const car = await db.query.cars.findFirst({
    where: eq(schema.cars.normalizedKey, key),
  });

  if (!car) {
    return c.json({ error: 'Car not found' }, 404);
  }

  // Get insights
  const insights = await db.query.carInsights.findMany({
    where: eq(schema.carInsights.carId, car.id),
  });

  // Get forum threads
  const threads = await db.query.forumThreads.findMany({
    where: eq(schema.forumThreads.carId, car.id),
  });

  const result = {
    car,
    insights,
    forumThreads: threads,
    enrichmentStatus: car.enrichmentStatus,
    lastUpdated: car.updatedAt,
  };

  // Cache for 30 minutes
  await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 });

  return c.json({ data: result, source: 'database' });
});

// Create or get car (upsert)
const createCarSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2030),
  generation: z.string().optional(),
});

carsRouter.post('/', zValidator('json', createCarSchema), async (c) => {
  const { make, model, year, generation } = c.req.valid('json');
  const normalizedKey = generateNormalizedKey(make, model, year);

  const db = drizzle(c.env.DB, { schema });

  // Check if exists
  const existing = await db.query.cars.findFirst({
    where: eq(schema.cars.normalizedKey, normalizedKey),
  });

  if (existing) {
    return c.json({ data: existing, created: false });
  }

  // Create new car
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO cars (id, make, model, year, generation, normalized_key, enrichment_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(id, make, model, year, generation || null, normalizedKey, now, now).run();

  const newCar = {
    id,
    make,
    model,
    year,
    generation,
    normalizedKey,
    enrichmentStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  // Trigger background enrichment
  await c.env.SCRAPE_QUEUE.send({
    carId: id,
    source: 'all',
  });

  return c.json({ data: newCar, created: true }, 201);
});

// List all cars (paginated)
carsRouter.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  const db = drizzle(c.env.DB, { schema });
  const cars = await db.query.cars.findMany({
    limit,
    offset,
    orderBy: (cars, { desc }) => [desc(cars.createdAt)],
  });

  return c.json({ data: cars, limit, offset });
});

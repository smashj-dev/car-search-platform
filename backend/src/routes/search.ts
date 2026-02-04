import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../types/env';
import * as schema from '../db/schema';
import { parseCarQuery, generateNormalizedKey } from '../utils/helpers';

export const searchRouter = new Hono<{ Bindings: Env }>();

// Main search endpoint - the core of the app
const searchSchema = z.object({
  query: z.string().min(2), // "2021 Genesis GV80"
  email: z.string().email().optional(), // For notification when enrichment completes
});

searchRouter.post('/', zValidator('json', searchSchema), async (c) => {
  const { query, email } = c.req.valid('json');

  // Parse the query into make/model/year
  const parsed = parseCarQuery(query);

  if (!parsed.make || !parsed.model) {
    return c.json({
      error: 'Could not parse car from query. Try format: "2021 Genesis GV80"',
      parsed
    }, 400);
  }

  const normalizedKey = generateNormalizedKey(parsed.make, parsed.model, parsed.year);
  const cacheKey = `search:${normalizedKey}`;

  // Check KV hot cache first
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json({
      data: cached,
      status: 'complete',
      source: 'cache',
      message: 'Results from cache',
    });
  }

  const db = drizzle(c.env.DB, { schema });

  // Check if car exists in D1
  const existingCar = await db.query.cars.findFirst({
    where: eq(schema.cars.normalizedKey, normalizedKey),
  });

  if (existingCar && existingCar.enrichmentStatus === 'complete') {
    // Get full data
    const insights = await db.query.carInsights.findMany({
      where: eq(schema.carInsights.carId, existingCar.id),
    });

    const threads = await db.query.forumThreads.findMany({
      where: eq(schema.forumThreads.carId, existingCar.id),
    });

    const result = {
      car: existingCar,
      insights,
      forumThreads: threads,
    };

    // Cache it
    await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 });

    return c.json({
      data: result,
      status: 'complete',
      source: 'database',
    });
  }

  // Car doesn't exist or isn't enriched - create search request
  const searchRequestId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create or get car record
  let carId = existingCar?.id;

  if (!existingCar) {
    carId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO cars (id, make, model, year, normalized_key, enrichment_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'processing', ?, ?)
    `).bind(carId, parsed.make, parsed.model, parsed.year || 0, normalizedKey, now, now).run();
  } else {
    // Update status to processing
    await c.env.DB.prepare(`
      UPDATE cars SET enrichment_status = 'processing', updated_at = ? WHERE id = ?
    `).bind(now, carId).run();
  }

  // Create search request record
  await c.env.DB.prepare(`
    INSERT INTO search_requests (id, user_email, car_query, parsed_make, parsed_model, parsed_year, car_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(searchRequestId, email || null, query, parsed.make, parsed.model, parsed.year || null, carId, now).run();

  // Queue background enrichment
  await c.env.SCRAPE_QUEUE.send({
    carId,
    searchRequestId,
    email,
    source: 'all',
  });

  // Return partial data if we have the car record
  const partialData = existingCar ? {
    car: existingCar,
    insights: [],
    forumThreads: [],
  } : {
    car: {
      id: carId,
      make: parsed.make,
      model: parsed.model,
      year: parsed.year,
      normalizedKey,
      enrichmentStatus: 'processing',
    },
    insights: [],
    forumThreads: [],
  };

  return c.json({
    data: partialData,
    status: 'enriching',
    searchRequestId,
    message: email
      ? `We're researching the ${parsed.year || ''} ${parsed.make} ${parsed.model}. You'll receive an email at ${email} when ready.`
      : `We're researching the ${parsed.year || ''} ${parsed.make} ${parsed.model}. Check back soon or provide an email for notification.`,
  });
});

// Check status of a search request
searchRouter.get('/status/:id', async (c) => {
  const id = c.req.param('id');

  const db = drizzle(c.env.DB, { schema });
  const request = await db.query.searchRequests.findFirst({
    where: eq(schema.searchRequests.id, id),
  });

  if (!request) {
    return c.json({ error: 'Search request not found' }, 404);
  }

  if (request.status === 'completed' && request.carId) {
    // Get full data
    const car = await db.query.cars.findFirst({
      where: eq(schema.cars.id, request.carId),
    });

    const insights = await db.query.carInsights.findMany({
      where: eq(schema.carInsights.carId, request.carId),
    });

    const threads = await db.query.forumThreads.findMany({
      where: eq(schema.forumThreads.carId, request.carId),
    });

    return c.json({
      status: 'completed',
      data: {
        car,
        insights,
        forumThreads: threads,
      },
    });
  }

  return c.json({
    status: request.status,
    message: request.status === 'processing'
      ? 'Still gathering information from forums and reviews...'
      : request.status === 'failed'
      ? 'Research failed. Please try again.'
      : 'Queued for research.',
  });
});

// Quick search - just checks cache, doesn't trigger enrichment
searchRouter.get('/quick', async (c) => {
  const query = c.req.query('q');

  if (!query) {
    return c.json({ error: 'Query parameter q is required' }, 400);
  }

  const parsed = parseCarQuery(query);

  if (!parsed.make || !parsed.model) {
    return c.json({ error: 'Could not parse car query', parsed }, 400);
  }

  const normalizedKey = generateNormalizedKey(parsed.make, parsed.model, parsed.year);
  const cacheKey = `search:${normalizedKey}`;

  const cached = await c.env.CACHE.get(cacheKey, 'json');

  if (cached) {
    return c.json({ data: cached, available: true });
  }

  // Check DB without triggering enrichment
  const db = drizzle(c.env.DB, { schema });
  const car = await db.query.cars.findFirst({
    where: eq(schema.cars.normalizedKey, normalizedKey),
  });

  return c.json({
    available: car?.enrichmentStatus === 'complete',
    status: car?.enrichmentStatus || 'not_found',
    parsed,
  });
});

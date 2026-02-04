import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../types/env';
import * as schema from '../db/schema';

export const insightsRouter = new Hono<{ Bindings: Env }>();

// Get insights by car ID
insightsRouter.get('/car/:carId', async (c) => {
  const carId = c.req.param('carId');
  const category = c.req.query('category');

  const db = drizzle(c.env.DB, { schema });

  let insights;
  if (category) {
    insights = await db.query.carInsights.findMany({
      where: and(
        eq(schema.carInsights.carId, carId),
        eq(schema.carInsights.category, category)
      ),
    });
  } else {
    insights = await db.query.carInsights.findMany({
      where: eq(schema.carInsights.carId, carId),
    });
  }

  // Group by category for easier consumption
  const grouped = insights.reduce((acc, insight) => {
    const cat = insight.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(insight);
    return acc;
  }, {} as Record<string, typeof insights>);

  return c.json({ data: insights, grouped });
});

// Get insights by category across all cars (for discovery)
insightsRouter.get('/category/:category', async (c) => {
  const category = c.req.param('category');
  const limit = parseInt(c.req.query('limit') || '20');

  const db = drizzle(c.env.DB, { schema });

  const insights = await db.query.carInsights.findMany({
    where: eq(schema.carInsights.category, category),
    limit,
    orderBy: (insights, { desc }) => [desc(insights.confidenceScore)],
  });

  return c.json({ data: insights });
});

// Add insight (internal use - called by scraper)
const addInsightSchema = z.object({
  carId: z.string().uuid(),
  category: z.enum([
    'driving_feel', 'common_issues', 'ownership_costs', 'buy_avoid_years',
    'mod_support', 'real_world_mpg', 'character', 'comparison',
    'long_term_ownership', 'dealer_experience'
  ]),
  insight: z.string().min(10),
  sourceUrl: z.string().url().optional(),
  sourceName: z.string(),
  confidenceScore: z.number().min(0).max(1).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
});

insightsRouter.post('/', zValidator('json', addInsightSchema), async (c) => {
  const data = c.req.valid('json');

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO car_insights (id, car_id, category, insight, source_url, source_name, confidence_score, sentiment, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.carId,
    data.category,
    data.insight,
    data.sourceUrl || null,
    data.sourceName,
    data.confidenceScore || 0.5,
    data.sentiment || 'neutral',
    now,
    now
  ).run();

  // Invalidate cache for this car
  const db = drizzle(c.env.DB, { schema });
  const car = await db.query.cars.findFirst({
    where: eq(schema.cars.id, data.carId),
  });

  if (car) {
    await c.env.CACHE.delete(`car:${car.normalizedKey}`);
    await c.env.CACHE.delete(`car_full:${car.normalizedKey}`);
    await c.env.CACHE.delete(`search:${car.normalizedKey}`);
  }

  return c.json({ id, created: true }, 201);
});

// Bulk add insights (for scraper efficiency)
const bulkInsightSchema = z.object({
  carId: z.string().uuid(),
  insights: z.array(addInsightSchema.omit({ carId: true })),
});

insightsRouter.post('/bulk', zValidator('json', bulkInsightSchema), async (c) => {
  const { carId, insights } = c.req.valid('json');

  const now = new Date().toISOString();
  const ids: string[] = [];

  // Use a batch for efficiency
  const statements = insights.map(insight => {
    const id = crypto.randomUUID();
    ids.push(id);
    return c.env.DB.prepare(`
      INSERT INTO car_insights (id, car_id, category, insight, source_url, source_name, confidence_score, sentiment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      carId,
      insight.category,
      insight.insight,
      insight.sourceUrl || null,
      insight.sourceName,
      insight.confidenceScore || 0.5,
      insight.sentiment || 'neutral',
      now,
      now
    );
  });

  await c.env.DB.batch(statements);

  // Invalidate cache
  const db = drizzle(c.env.DB, { schema });
  const car = await db.query.cars.findFirst({
    where: eq(schema.cars.id, carId),
  });

  if (car) {
    await c.env.CACHE.delete(`car:${car.normalizedKey}`);
    await c.env.CACHE.delete(`car_full:${car.normalizedKey}`);
    await c.env.CACHE.delete(`search:${car.normalizedKey}`);
  }

  return c.json({ ids, created: insights.length }, 201);
});

// Get insight categories with counts for a car
insightsRouter.get('/car/:carId/summary', async (c) => {
  const carId = c.req.param('carId');

  const result = await c.env.DB.prepare(`
    SELECT category, COUNT(*) as count, AVG(confidence_score) as avg_confidence,
           SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
           SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
           SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
           SUM(CASE WHEN sentiment = 'mixed' THEN 1 ELSE 0 END) as mixed
    FROM car_insights
    WHERE car_id = ?
    GROUP BY category
  `).bind(carId).all();

  return c.json({ data: result.results });
});

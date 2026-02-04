import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { Env } from '../types/env';
import * as schema from '../db/schema';

export const scrapeRouter = new Hono<{ Bindings: Env }>();

// Trigger scrape for a car (manual trigger)
const triggerScrapeSchema = z.object({
  carId: z.string().uuid(),
  sources: z.array(z.string()).optional(), // Specific sources or 'all'
});

scrapeRouter.post('/trigger', zValidator('json', triggerScrapeSchema), async (c) => {
  const { carId, sources } = c.req.valid('json');

  const db = drizzle(c.env.DB, { schema });

  // Verify car exists
  const car = await db.query.cars.findFirst({
    where: eq(schema.cars.id, carId),
  });

  if (!car) {
    return c.json({ error: 'Car not found' }, 404);
  }

  // Get forum sources
  const forumSources = await db.query.forumSources.findMany({
    where: eq(schema.forumSources.isActive, 1),
  });

  const now = new Date().toISOString();

  // Create scrape jobs for each source
  const jobIds: string[] = [];

  for (const source of forumSources) {
    // Check if this source covers this make
    const makes = JSON.parse(source.carMakes || '[]');
    if (makes.length > 0 && !makes.includes(car.make)) {
      continue;
    }

    const jobId = crypto.randomUUID();
    jobIds.push(jobId);

    await c.env.DB.prepare(`
      INSERT INTO scrape_jobs (id, car_id, source_type, source_url, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(jobId, carId, 'forum', source.baseUrl, now).run();

    // Queue the job
    await c.env.SCRAPE_QUEUE.send({
      jobId,
      carId,
      source: source.id,
      sourceUrl: source.baseUrl,
      searchQuery: `${car.year} ${car.make} ${car.model}`,
    });
  }

  // Update car status
  await c.env.DB.prepare(`
    UPDATE cars SET enrichment_status = 'processing', updated_at = ? WHERE id = ?
  `).bind(now, carId).run();

  return c.json({
    message: 'Scrape jobs queued',
    jobIds,
    jobCount: jobIds.length,
  });
});

// Get scrape job status
scrapeRouter.get('/job/:id', async (c) => {
  const id = c.req.param('id');

  const db = drizzle(c.env.DB, { schema });
  const job = await db.query.scrapeJobs.findFirst({
    where: eq(schema.scrapeJobs.id, id),
  });

  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }

  return c.json({ data: job });
});

// Get all scrape jobs for a car
scrapeRouter.get('/car/:carId', async (c) => {
  const carId = c.req.param('carId');

  const db = drizzle(c.env.DB, { schema });
  const jobs = await db.query.scrapeJobs.findMany({
    where: eq(schema.scrapeJobs.carId, carId),
    orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
  });

  // Summary
  const summary = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return c.json({ data: jobs, summary });
});

// Mark job complete (called by scraper worker)
const completeJobSchema = z.object({
  jobId: z.string().uuid(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  insightsAdded: z.number().optional(),
  threadsAdded: z.number().optional(),
});

scrapeRouter.post('/complete', zValidator('json', completeJobSchema), async (c) => {
  const { jobId, success, errorMessage, insightsAdded, threadsAdded } = c.req.valid('json');

  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    UPDATE scrape_jobs
    SET status = ?, error_message = ?, completed_at = ?
    WHERE id = ?
  `).bind(
    success ? 'completed' : 'failed',
    errorMessage || null,
    now,
    jobId
  ).run();

  // Check if all jobs for this car are complete
  const db = drizzle(c.env.DB, { schema });
  const job = await db.query.scrapeJobs.findFirst({
    where: eq(schema.scrapeJobs.id, jobId),
  });

  if (job) {
    const pendingJobs = await db.query.scrapeJobs.findMany({
      where: eq(schema.scrapeJobs.carId, job.carId),
    });

    const allComplete = pendingJobs.every(j =>
      j.status === 'completed' || j.status === 'failed'
    );

    if (allComplete) {
      // Update car status
      const anySuccess = pendingJobs.some(j => j.status === 'completed');
      await c.env.DB.prepare(`
        UPDATE cars SET enrichment_status = ?, updated_at = ? WHERE id = ?
      `).bind(anySuccess ? 'complete' : 'failed', now, job.carId).run();

      // TODO: Send notification email if there's a pending search request
      // This would call the email service
    }
  }

  return c.json({
    success: true,
    insightsAdded,
    threadsAdded,
  });
});

// Get forum sources
scrapeRouter.get('/sources', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const sources = await db.query.forumSources.findMany({
    orderBy: (sources, { desc }) => [desc(sources.scrapePriority)],
  });

  return c.json({ data: sources });
});

// Add forum source
const addSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string().url(),
  searchUrlTemplate: z.string().optional(),
  carMakes: z.array(z.string()),
  scrapePriority: z.number().min(1).max(10).optional(),
});

scrapeRouter.post('/sources', zValidator('json', addSourceSchema), async (c) => {
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO forum_sources (id, name, base_url, search_url_template, car_makes, scrape_priority, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    data.id,
    data.name,
    data.baseUrl,
    data.searchUrlTemplate || null,
    JSON.stringify(data.carMakes),
    data.scrapePriority || 5,
    now
  ).run();

  return c.json({ success: true, id: data.id }, 201);
});

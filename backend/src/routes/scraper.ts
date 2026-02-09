import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { scrapeCarsComSearch, saveListingsToDB } from '../services/scraper-cars-com';

export const scraperRouter = new Hono<{ Bindings: Env }>();

const scrapeSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  zipCode: z.string().length(5),
  radius: z.coerce.number().default(100),
});

// Trigger scrape job
scraperRouter.post('/trigger', zValidator('json', scrapeSchema), async (c) => {
  const { make, model, zipCode, radius } = c.req.valid('json');

  try {
    // Scrape Cars.com
    console.log(`Starting scrape: ${make} ${model} near ${zipCode}`);
    const listings = await scrapeCarsComSearch(c.env, make, model, zipCode, radius);

    if (listings.length === 0) {
      return c.json({
        success: true,
        message: 'No listings found',
        data: { count: 0 },
      });
    }

    // Save to database
    await saveListingsToDB(c.env, listings);

    return c.json({
      success: true,
      message: `Scraped and saved ${listings.length} listings`,
      data: {
        count: listings.length,
        make,
        model,
        zipCode,
      },
    });

  } catch (error: any) {
    console.error('Scrape error:', error);
    return c.json({
      success: false,
      error: {
        code: 'SCRAPE_ERROR',
        message: error.message || 'Failed to scrape listings',
      },
    }, 500);
  }
});

// Get scraper status
scraperRouter.get('/status', async (c) => {
  return c.json({
    success: true,
    data: {
      status: 'operational',
      browser: 'cloudflare-puppeteer',
      sources: ['cars.com'],
    },
  });
});

// Queue a scrape job
scraperRouter.post('/queue', zValidator('json', scrapeSchema), async (c) => {
  const { make, model, zipCode, radius } = c.req.valid('json');

  try {
    // Send job to queue for background processing
    await c.env.SCRAPE_QUEUE.send({
      make,
      model,
      zipCode,
      radius,
      queuedAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: 'Scrape job queued successfully',
      data: { make, model, zipCode, radius },
    });

  } catch (error: any) {
    console.error('Queue error:', error);
    return c.json({
      success: false,
      error: {
        code: 'QUEUE_ERROR',
        message: error.message || 'Failed to queue scrape job',
      },
    }, 500);
  }
});

// Get scraper stats
scraperRouter.get('/stats', async (c) => {
  try {
    const db = c.env.DB;

    // Total listings
    const totalResult = await db.prepare('SELECT COUNT(*) as count FROM listings').first();
    const totalListings = totalResult?.count || 0;

    // Active listings
    const activeResult = await db.prepare('SELECT COUNT(*) as count FROM listings WHERE is_active = 1').first();
    const activeListings = activeResult?.count || 0;

    // Listings by source
    const sourceResult = await db.prepare(`
      SELECT source, COUNT(*) as count
      FROM listings
      WHERE is_active = 1
      GROUP BY source
    `).all();
    const bySource = sourceResult.results || [];

    // Recent scrapes (listings added in last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE created_at > ?
    `).bind(twentyFourHoursAgo).first();
    const recentListings = recentResult?.count || 0;

    // Price history count
    const historyResult = await db.prepare('SELECT COUNT(*) as count FROM listing_price_history').first();
    const priceHistoryCount = historyResult?.count || 0;

    // Latest scrape timestamp
    const latestResult = await db.prepare(`
      SELECT MAX(created_at) as latest
      FROM listings
    `).first();
    const latestScrape = latestResult?.latest || null;

    // Popular makes
    const popularMakesResult = await db.prepare(`
      SELECT make, COUNT(*) as count
      FROM listings
      WHERE is_active = 1
      GROUP BY make
      ORDER BY count DESC
      LIMIT 10
    `).all();
    const popularMakes = popularMakesResult.results || [];

    return c.json({
      success: true,
      data: {
        overview: {
          totalListings,
          activeListings,
          recentListings,
          priceHistoryCount,
          latestScrape,
        },
        bySource,
        popularMakes,
      },
    });

  } catch (error: any) {
    console.error('Stats error:', error);
    return c.json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error.message || 'Failed to fetch stats',
      },
    }, 500);
  }
});

// Get scraper metrics summary
scraperRouter.get('/metrics', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7');
    const { getScraperSummary } = await import('../services/scraper-utils');

    const summary = await getScraperSummary(c.env, days);

    return c.json({
      success: true,
      data: {
        summary,
        period: `${days} days`,
      },
    });

  } catch (error: any) {
    console.error('Metrics error:', error);
    return c.json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: error.message || 'Failed to fetch metrics',
      },
    }, 500);
  }
});

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

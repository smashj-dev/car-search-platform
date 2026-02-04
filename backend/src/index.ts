import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { listingsRouter } from './routes/listings';
import { scraperRouter } from './routes/scraper';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://carsearch.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Car Search Platform API',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
  });
});

// Mount routers
app.route('/api/v1/listings', listingsRouter);

// Scraper endpoints (inline for now)
app.get('/api/v1/scraper/status', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'operational',
      browser: 'cloudflare-puppeteer',
      sources: ['cars.com'],
    },
  });
});

app.post('/api/v1/scraper/trigger', async (c) => {
  const body = await c.req.json();
  const { make, model, zipCode, radius = 100 } = body;

  try {
    const { scrapeCarsComSearch, saveListingsToDB } = await import('./services/scraper-cars-com');

    console.log(`Starting scrape: ${make} ${model} near ${zipCode}`);
    const listings = await scrapeCarsComSearch(c.env, make, model, zipCode, radius);

    if (listings.length === 0) {
      return c.json({
        success: true,
        message: 'No listings found',
        data: { count: 0 },
      });
    }

    await saveListingsToDB(c.env, listings);

    return c.json({
      success: true,
      message: `Scraped and saved ${listings.length} listings`,
      data: { count: listings.length, make, model, zipCode },
    });
  } catch (error: any) {
    console.error('Scrape error:', error);
    return c.json({
      success: false,
      error: { code: 'SCRAPE_ERROR', message: error.message },
    }, 500);
  }
});

// Queue consumer for background scraping
export default {
  fetch: app.fetch,

  // Handle background scrape jobs from the queue
  async queue(batch: MessageBatch<{ make: string; model: string; zipCode: string }>, env: Env) {
    console.log(`Processing ${batch.messages.length} scrape jobs`);

    for (const message of batch.messages) {
      const { make, model, zipCode } = message.body;
      console.log(`Scraping ${make} ${model} near ${zipCode}`);

      // TODO: Implement scraper
      // Will be done in scraper service

      message.ack();
    }
  },
};

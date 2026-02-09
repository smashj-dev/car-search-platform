import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { listingsRouter } from './routes/listings';
import { scraperRouter } from './routes/scraper';
import { chatRouter } from './routes/chat';
import { listingInsightsRouter } from './routes/listing-insights';
import { marketRouter } from './routes/market';
import { vinRouter } from './routes/vin';
import { genesisRouter } from './routes/genesis';
import * as schema from './db/schema';
import { drizzle } from 'drizzle-orm/d1';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://carsearch.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Root - HTML welcome page for browsers
app.get('/', (c) => {
  const userAgent = c.req.header('user-agent') || '';
  const isBrowser = userAgent.includes('Mozilla') && !userAgent.includes('curl');

  if (isBrowser) {
    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Car Search Platform API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 800px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .status {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    h2 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    .endpoint {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 10px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    .method {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 5px;
      font-weight: bold;
      margin-right: 10px;
      font-size: 0.85em;
    }
    .get { background: #3b82f6; color: white; }
    .post { background: #10b981; color: white; }
    .url { color: #666; }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .feature {
      background: #f9fafb;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    .feature-icon {
      font-size: 2em;
      margin-bottom: 10px;
    }
    .feature-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .feature-desc {
      font-size: 0.9em;
      color: #666;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin-top: 20px;
    }
    .stat {
      flex: 1;
      background: #667eea;
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 0.9em;
      opacity: 0.9;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    footer {
      margin-top: 40px;
      text-align: center;
      color: #999;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚗 Car Search Platform API</h1>
    <span class="status">✓ LIVE & OPERATIONAL</span>

    <div class="section">
      <h2>🎯 Core Features</h2>
      <div class="features">
        <div class="feature">
          <div class="feature-icon">🤖</div>
          <div class="feature-title">AI Chat</div>
          <div class="feature-desc">Natural language car search</div>
        </div>
        <div class="feature">
          <div class="feature-icon">🔍</div>
          <div class="feature-title">VIN Decoder</div>
          <div class="feature-desc">Decode & validate VINs</div>
        </div>
        <div class="feature">
          <div class="feature-icon">📊</div>
          <div class="feature-title">Analytics</div>
          <div class="feature-desc">Market insights & trends</div>
        </div>
        <div class="feature">
          <div class="feature-icon">🔎</div>
          <div class="feature-title">Advanced Search</div>
          <div class="feature-desc">Faceted filtering</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>📡 API Endpoints</h2>

      <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/v1/chat</span>
        <div style="margin-top: 8px; font-size: 0.85em; color: #666;">AI-powered car search assistant</div>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/v1/listings</span>
        <div style="margin-top: 8px; font-size: 0.85em; color: #666;">Search vehicle listings with filters</div>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/v1/vin/decode/:vin</span>
        <div style="margin-top: 8px; font-size: 0.85em; color: #666;">Decode VIN using NHTSA database</div>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/v1/market/trends</span>
        <div style="margin-top: 8px; font-size: 0.85em; color: #666;">Market statistics & price trends</div>
      </div>
    </div>

    <div class="section">
      <h2>📈 Platform Stats</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">27+</div>
          <div class="stat-label">API Endpoints</div>
        </div>
        <div class="stat">
          <div class="stat-value">8</div>
          <div class="stat-label">Seed Listings</div>
        </div>
        <div class="stat">
          <div class="stat-value">5</div>
          <div class="stat-label">Core Services</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🛠️ Try It Out</h2>
      <p style="color: #666; margin-bottom: 15px;">
        Test the AI chat endpoint:
      </p>
      <div style="background: #1f2937; color: #10b981; padding: 15px; border-radius: 10px; font-family: 'Monaco', monospace; font-size: 0.85em; overflow-x: auto;">
curl -X POST https://car-search-api.joshm-e13.workers.dev/api/v1/chat \\<br>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;-d '{"message":"Help me find a car"}'
      </div>
    </div>

    <footer>
      <p>Built with Cloudflare Workers • Deployed ${new Date().toLocaleDateString()}</p>
      <p style="margin-top: 5px;">Version 1.0.0 • Environment: ${c.env.ENVIRONMENT}</p>
    </footer>
  </div>
</body>
</html>
    `);
  }

  // JSON response for API clients
  return c.json({
    name: 'Car Search Platform API',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
  });
});

// Mount routers
app.route('/api/v1/listings', listingsRouter);
app.route('/api/v1/listings', listingInsightsRouter);
app.route('/api/v1/market', marketRouter);
app.route('/api/v1/scraper', scraperRouter);
app.route('/api/v1/chat', chatRouter);
app.route('/api/v1/vin', vinRouter);
app.route('/api/v1/genesis', genesisRouter);

// Dealers endpoint
app.get('/api/v1/dealers', async (c) => {
  try {
    const db = drizzle(c.env.DB, { schema });
    const dealers = await db.select()
      .from(schema.dealers);

    return c.json({
      success: true,
      data: dealers,
      count: dealers.length,
    });
  } catch (error) {
    console.error('Error fetching dealers:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch dealers',
      },
      500
    );
  }
});

// Admin endpoints for batch VIN processing
app.post('/api/v1/admin/decode-vins', async (c) => {
  const { batchDecodeListings } = await import('./workers/batch-decode');

  const body = await c.req.json().catch(() => ({}));
  const config = {
    batchSize: body.batchSize || 10,
    delayBetweenBatchesMs: body.delayBetweenBatchesMs || 2000,
    delayBetweenRequestsMs: body.delayBetweenRequestsMs || 500,
    dryRun: body.dryRun || false,
  };

  try {
    const result = await batchDecodeListings(c.env, config);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Batch decode error:', error);
    return c.json({
      success: false,
      error: {
        code: 'BATCH_DECODE_ERROR',
        message: error.message || 'Failed to batch decode VINs',
      },
    }, 500);
  }
});

app.get('/api/v1/admin/decode-vins/status', async (c) => {
  // Count listings with missing specs
  const result = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total_listings,
      SUM(CASE WHEN engine IS NULL THEN 1 ELSE 0 END) as missing_engine,
      SUM(CASE WHEN transmission IS NULL THEN 1 ELSE 0 END) as missing_transmission,
      SUM(CASE WHEN drivetrain IS NULL THEN 1 ELSE 0 END) as missing_drivetrain,
      SUM(CASE WHEN fuel_type IS NULL THEN 1 ELSE 0 END) as missing_fuel_type,
      SUM(CASE WHEN body_type IS NULL THEN 1 ELSE 0 END) as missing_body_type,
      SUM(CASE WHEN cylinders IS NULL THEN 1 ELSE 0 END) as missing_cylinders,
      SUM(CASE WHEN doors IS NULL THEN 1 ELSE 0 END) as missing_doors,
      SUM(CASE WHEN seating_capacity IS NULL THEN 1 ELSE 0 END) as missing_seating_capacity,
      SUM(CASE WHEN base_msrp IS NULL THEN 1 ELSE 0 END) as missing_base_msrp,
      SUM(CASE WHEN
        engine IS NULL OR
        transmission IS NULL OR
        drivetrain IS NULL OR
        fuel_type IS NULL OR
        body_type IS NULL OR
        cylinders IS NULL
      THEN 1 ELSE 0 END) as listings_needing_enrichment
    FROM listings
    WHERE is_active = 1
  `).first();

  return c.json({
    success: true,
    data: result,
  });
});

// Queue consumer for background scraping
interface ScrapeJob {
  make: string;
  model: string;
  zipCode: string;
  radius?: number;
  queuedAt?: string;
}

export default {
  fetch: app.fetch,

  // Handle background scrape jobs from the queue
  async queue(batch: MessageBatch<ScrapeJob>, env: Env) {
    console.log(`[Queue Consumer] Processing batch of ${batch.messages.length} scrape jobs`);

    const batchStartTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    const { ScraperLogger, shouldRetryError, getRandomDelay, delay } = await import('./services/scraper-utils');

    for (const message of batch.messages) {
      const { make, model, zipCode, radius = 100, queuedAt } = message.body;
      const jobId = message.id;

      const logger = new ScraperLogger(env, jobId);
      const jobStartTime = Date.now();

      try {
        logger.log(`Starting: ${make} ${model} near ${zipCode} (queued: ${queuedAt})`);

        const { scrapeCarsComSearch, saveListingsToDB } = await import('./services/scraper-cars-com');

        // Add delay between jobs to respect rate limits (2-3 seconds)
        if (successCount + failCount > 0) {
          const delayMs = getRandomDelay(2000, 3000);
          logger.log(`Rate limiting: waiting ${Math.round(delayMs)}ms`);
          await delay(delayMs);
        }

        // Scrape listings
        const listings = await scrapeCarsComSearch(env, make, model, zipCode, radius);
        const listingsFound = listings.length;

        if (listingsFound === 0) {
          logger.warn(`No listings found for ${make} ${model} near ${zipCode}`);
          const duration = Date.now() - jobStartTime;

          await logger.recordMetrics({
            make,
            model,
            zipCode,
            listingsFound: 0,
            listingsSaved: 0,
            duration,
            status: 'success',
          });

          message.ack();
          successCount++;
          continue;
        }

        // Save to database
        await saveListingsToDB(env, listings);

        const duration = Date.now() - jobStartTime;
        logger.log(`✓ Success: Scraped and saved ${listingsFound} listings in ${duration}ms`);

        await logger.recordMetrics({
          make,
          model,
          zipCode,
          listingsFound,
          listingsSaved: listingsFound,
          duration,
          status: 'success',
        });

        successCount++;
        message.ack();

      } catch (error: any) {
        failCount++;
        const duration = Date.now() - jobStartTime;
        logger.error(`✗ Failed: ${error.message}`);

        await logger.recordMetrics({
          make,
          model,
          zipCode,
          listingsFound: 0,
          listingsSaved: 0,
          duration,
          status: 'failed',
          error: error.message,
        });

        // Retry logic: only retry on certain errors
        const shouldRetry = shouldRetryError(error);

        if (shouldRetry && message.attempts < 3) {
          logger.log(`Will retry (attempt ${message.attempts + 1}/3)`);
          message.retry();
        } else {
          logger.error(`Max retries exceeded or non-retryable error, giving up`);
          message.ack(); // Acknowledge to remove from queue
        }
      }
    }

    const batchDuration = Date.now() - batchStartTime;
    console.log(`[Queue Consumer] Batch complete: ${successCount} success, ${failCount} failed, ${batchDuration}ms`);
  },

  // Scheduled worker for automated scraping
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('[Scheduled Worker] Starting automated scrape jobs');

    const startTime = Date.now();

    try {
      // Popular makes and models to scrape
      const scrapeTargets = [
        { make: 'Tesla', models: ['Model 3', 'Model Y'] },
        { make: 'Honda', models: ['Civic', 'Accord'] },
        { make: 'Toyota', models: ['Camry', 'RAV4'] },
        { make: 'Ford', models: ['F-150', 'Mustang'] },
        { make: 'Chevrolet', models: ['Silverado', 'Malibu'] },
      ];

      // Key ZIP codes (LA, NYC, Chicago, Houston, Phoenix)
      const zipCodes = ['90001', '10001', '60601', '77001', '85001'];

      let jobsQueued = 0;

      // Queue jobs for each combination
      for (const target of scrapeTargets) {
        for (const model of target.models) {
          for (const zipCode of zipCodes) {
            await env.SCRAPE_QUEUE.send({
              make: target.make,
              model: model,
              zipCode: zipCode,
              radius: 100,
              queuedAt: new Date().toISOString(),
            });

            jobsQueued++;
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Scheduled Worker] ✓ Queued ${jobsQueued} scrape jobs in ${duration}ms`);

    } catch (error: any) {
      console.error('[Scheduled Worker] ✗ Error:', error.message);
    }
  },
};

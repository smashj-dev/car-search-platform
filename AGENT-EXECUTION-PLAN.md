# Agent Execution Plan - Core MVP Backend

## Decisions Made

✅ **Database:** Supabase (team familiarity + built-in features)
✅ **Scrapers:** Cloudflare Workers + Browser Rendering API
✅ **AI Chat:** Cloudflare Workers AI (Qwen/DeepSeek models)
✅ **Focus:** Core agents first (1-4), defer auth and chat

---

## Agent 1: Database Setup (Supabase)

### Configuration

**Tools:** Supabase CLI, Drizzle ORM, PostgreSQL

**Timeline:** 3-5 days

### Tasks

1. **Supabase Project Setup**
   ```bash
   # Initialize Supabase project
   npx supabase init
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```

2. **Schema Design** (from PRD Section 10.1)

Create tables:
- `listings` - Core vehicle listings
- `dealers` - Dealer information with PostGIS
- `listing_price_history` - Price tracking
- `users` - User accounts (Supabase Auth handles most of this)
- `user_favorites` - Saved listings
- `saved_searches` - Alert configuration

3. **Drizzle ORM Setup**

```typescript
// backend/db/schema.ts
import { pgTable, uuid, varchar, integer, timestamp, decimal, boolean, text } from 'drizzle-orm/pg-core';

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  vin: varchar('vin', { length: 17 }).unique().notNull(),

  // Vehicle info
  year: integer('year').notNull(),
  make: varchar('make', { length: 50 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  trim: varchar('trim', { length: 100 }),

  // Pricing
  price: integer('price'),
  baseMsrp: integer('base_msrp'),
  combinedMsrp: integer('combined_msrp'),

  // Condition
  miles: integer('miles'),
  condition: varchar('condition', { length: 20 }),
  isCertified: boolean('is_certified').default(false),

  // Status
  isActive: boolean('is_active').default(true),
  isSold: boolean('is_sold').default(false),

  // Timing
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),

  // Source
  source: varchar('source', { length: 100 }).notNull(),
  sourceUrl: text('source_url').notNull(),

  // Relations
  dealerId: integer('dealer_id').references(() => dealers.id),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const dealers = pgTable('dealers', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 200 }).notNull(),
  website: varchar('website', { length: 255 }),

  // Location
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zipCode: varchar('zip_code', { length: 10 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),

  dealerType: varchar('dealer_type', { length: 20 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const listingPriceHistory = pgTable('listing_price_history', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  vin: varchar('vin', { length: 17 }).notNull(),

  price: integer('price'),
  miles: integer('miles'),
  source: varchar('source', { length: 100 }),

  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});
```

4. **Migrations**

```bash
# Generate migration
npx drizzle-kit generate:pg

# Apply to Supabase
npx drizzle-kit push:pg
```

5. **Enable PostGIS** (for geospatial queries)

```sql
-- Run in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to dealers
ALTER TABLE dealers ADD COLUMN location GEOGRAPHY(Point, 4326);

-- Create index
CREATE INDEX idx_dealers_location ON dealers USING GIST(location);

-- Populate from lat/lng
UPDATE dealers SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
```

6. **Seed Data**

```typescript
// backend/db/seed.ts
import { db } from './client';
import { dealers, listings } from './schema';

async function seed() {
  // Insert sample dealers
  await db.insert(dealers).values([
    {
      name: 'AutoNation Honda',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      latitude: 34.0522,
      longitude: -118.2437,
      dealerType: 'franchise'
    }
  ]);

  // Insert sample listings
  // ... (generate realistic test data)
}

seed();
```

### Deliverables

- ✅ Supabase project configured
- ✅ `backend/db/schema.ts` - Drizzle schema
- ✅ Migrations applied
- ✅ PostGIS enabled
- ✅ Seed data loaded (100+ test listings)
- ✅ `DATABASE.md` - Setup guide

---

## Agent 2: API Layer (Cloudflare Workers + Hono.js)

### Configuration

**Tools:** Cloudflare Workers, Hono.js, Wrangler, Drizzle ORM

**Timeline:** 4-6 days

### Tasks

1. **Wrangler Setup**

```bash
# Initialize Workers project
cd backend
npm create cloudflare@latest
# Choose: "Hello World" Worker → TypeScript → Yes to Git

# Install dependencies
npm install hono @hono/zod-validator zod drizzle-orm
npm install --save-dev @cloudflare/workers-types
```

2. **Configure `wrangler.toml`**

```toml
name = "car-search-api"
main = "src/index.ts"
compatibility_date = "2026-02-04"
compatibility_flags = ["nodejs_compat"]

# Environment variables
[vars]
ENVIRONMENT = "production"

# KV Namespaces
[[kv_namespaces]]
binding = "CACHE"
id = "xxx"  # Create via: wrangler kv:namespace create "CACHE"

[[kv_namespaces]]
binding = "SESSIONS"
id = "xxx"

# Supabase connection
[env.production.vars]
DATABASE_URL = "postgresql://..."  # From Supabase dashboard

# Browser Rendering (for scrapers)
[[browser]]
binding = "BROWSER"
```

3. **Hono.js API Structure**

```typescript
// backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { listingsRouter } from './routes/listings';
import { filtersRouter } from './routes/filters';

type Bindings = {
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  BROWSER: Fetcher;
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message,
    }
  }, 500);
});

// Routes
app.route('/api/v1/listings', listingsRouter);
app.route('/api/v1/filters', filtersRouter);

export default app;
```

4. **Core Endpoints**

```typescript
// backend/src/routes/listings.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../db/client';
import { listings } from '../db/schema';

const app = new Hono();

// Search listings
const searchSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year_min: z.coerce.number().optional(),
  year_max: z.coerce.number().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  miles_max: z.coerce.number().optional(),
  zip_code: z.string().optional(),
  radius: z.coerce.number().default(100),
  page: z.coerce.number().default(1),
  per_page: z.coerce.number().default(25),
});

app.get('/', zValidator('query', searchSchema), async (c) => {
  const params = c.req.valid('query');
  const db = getDb(c.env.DATABASE_URL);

  // Build query
  let query = db.select().from(listings).where(/* filters */);

  // Pagination
  const offset = (params.page - 1) * params.per_page;
  const results = await query.limit(params.per_page).offset(offset);

  return c.json({
    success: true,
    data: results,
    meta: {
      page: params.page,
      per_page: params.per_page,
      total: results.length,
    }
  });
});

// Get listing detail
app.get('/:vin', async (c) => {
  const vin = c.req.param('vin');
  const db = getDb(c.env.DATABASE_URL);

  const listing = await db.select()
    .from(listings)
    .where(eq(listings.vin, vin))
    .limit(1);

  if (!listing.length) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Listing not found' }
    }, 404);
  }

  return c.json({
    success: true,
    data: listing[0]
  });
});

// Get price history
app.get('/:vin/history', async (c) => {
  const vin = c.req.param('vin');
  const db = getDb(c.env.DATABASE_URL);

  const history = await db.select()
    .from(listingPriceHistory)
    .where(eq(listingPriceHistory.vin, vin))
    .orderBy(desc(listingPriceHistory.recordedAt));

  return c.json({
    success: true,
    data: history
  });
});

export { app as listingsRouter };
```

5. **Caching Strategy**

```typescript
// backend/src/middleware/cache.ts
import { Context, Next } from 'hono';

export const cacheMiddleware = (ttl: number = 300) => {
  return async (c: Context, next: Next) => {
    const cacheKey = `cache:${c.req.url}`;

    // Check KV cache
    const cached = await c.env.CACHE.get(cacheKey, 'json');
    if (cached) {
      return c.json(cached);
    }

    // Execute handler
    await next();

    // Cache response
    const response = await c.res.clone().json();
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: ttl
    });
  };
};
```

### Deliverables

- ✅ Cloudflare Workers API running
- ✅ Hono.js routes implemented
- ✅ `/api/v1/listings` - Search endpoint
- ✅ `/api/v1/listings/:vin` - Detail endpoint
- ✅ `/api/v1/listings/:vin/history` - Price history
- ✅ `/api/v1/filters` - Filter options
- ✅ KV caching for common queries
- ✅ Error handling and validation
- ✅ `API.md` - Endpoint documentation

---

## Agent 3: Scraper Infrastructure (Cloudflare Browser Rendering)

### Configuration

**Tools:** Cloudflare Browser Rendering, Puppeteer, Cloudflare Queues

**Timeline:** 7-10 days

### Tasks

1. **Browser Rendering Setup**

```bash
# Enable Browser Rendering in wrangler.toml
# Add to wrangler.toml:
# browser = { binding = "BROWSER" }

# Install Puppeteer for Workers
npm install @cloudflare/puppeteer
```

2. **Cars.com Scraper**

```typescript
// backend/src/scrapers/cars-com.ts
import puppeteer from '@cloudflare/puppeteer';

interface ScrapedListing {
  vin: string;
  price: number | null;
  miles: number | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  exteriorColor: string | null;
  dealerName: string;
  dealerCity: string;
  dealerState: string;
  sourceUrl: string;
}

export async function scrapeCarsComSearch(
  browser: Fetcher,
  make: string,
  model: string,
  zipCode: string,
  radius: number = 100
): Promise<ScrapedListing[]> {

  const browserInstance = await puppeteer.launch(browser);
  const page = await browserInstance.newPage();

  try {
    // Navigate to Cars.com search
    const url = `https://www.cars.com/shopping/results/?` +
      `stock_type=used&makes[]=${make}&models[]=${model}&` +
      `zip=${zipCode}&maximum_distance=${radius}`;

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extract listings
    const listings = await page.evaluate(() => {
      const results: ScrapedListing[] = [];
      const cards = document.querySelectorAll('.vehicle-card');

      cards.forEach((card) => {
        const vin = card.getAttribute('data-vin') || '';
        const price = card.querySelector('.primary-price')?.textContent;
        const miles = card.querySelector('.mileage')?.textContent;
        const year = card.querySelector('.year')?.textContent;
        const make = card.querySelector('.make')?.textContent;
        const model = card.querySelector('.model')?.textContent;
        const trim = card.querySelector('.trim')?.textContent;
        const dealerName = card.querySelector('.dealer-name')?.textContent;
        const dealerLocation = card.querySelector('.dealer-location')?.textContent;
        const url = card.querySelector('a')?.href;

        if (vin && year && make && model) {
          results.push({
            vin,
            price: price ? parseInt(price.replace(/[^0-9]/g, '')) : null,
            miles: miles ? parseInt(miles.replace(/[^0-9]/g, '')) : null,
            year: parseInt(year),
            make,
            model,
            trim: trim || null,
            exteriorColor: null, // Extract from detail page
            dealerName: dealerName || '',
            dealerCity: dealerLocation?.split(',')[0] || '',
            dealerState: dealerLocation?.split(',')[1]?.trim() || '',
            sourceUrl: url || '',
          });
        }
      });

      return results;
    });

    return listings;

  } finally {
    await page.close();
    await browserInstance.close();
  }
}

export async function scrapeListingDetails(
  browser: Fetcher,
  url: string
): Promise<Partial<ScrapedListing>> {
  const browserInstance = await puppeteer.launch(browser);
  const page = await browserInstance.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    const details = await page.evaluate(() => {
      return {
        vin: document.querySelector('[data-vin]')?.getAttribute('data-vin'),
        exteriorColor: document.querySelector('.exterior-color')?.textContent,
        interiorColor: document.querySelector('.interior-color')?.textContent,
        engine: document.querySelector('.engine')?.textContent,
        transmission: document.querySelector('.transmission')?.textContent,
        drivetrain: document.querySelector('.drivetrain')?.textContent,
        fuelType: document.querySelector('.fuel-type')?.textContent,
      };
    });

    return details;

  } finally {
    await page.close();
    await browserInstance.close();
  }
}
```

3. **Queue Worker**

```typescript
// backend/src/workers/scraper-queue.ts
import { Hono } from 'hono';
import { scrapeCarsComSearch } from '../scrapers/cars-com';
import { getDb } from '../db/client';
import { listings, dealers } from '../db/schema';

interface ScraperJob {
  type: 'search' | 'detail';
  make?: string;
  model?: string;
  zipCode?: string;
  url?: string;
}

const app = new Hono();

app.post('/queue', async (c) => {
  const jobs: ScraperJob[] = await c.req.json();

  for (const job of jobs) {
    if (job.type === 'search') {
      const listings = await scrapeCarsComSearch(
        c.env.BROWSER,
        job.make!,
        job.model!,
        job.zipCode!
      );

      // Save to database
      const db = getDb(c.env.DATABASE_URL);

      for (const listing of listings) {
        await db.insert(listings).values({
          ...listing,
          source: 'cars.com',
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        }).onConflictDoUpdate({
          target: listings.vin,
          set: {
            price: listing.price,
            miles: listing.miles,
            lastSeenAt: new Date(),
          }
        });
      }
    }
  }

  return c.json({ success: true, processed: jobs.length });
});

export default app;
```

4. **Scheduled Scraper**

```typescript
// backend/src/workers/scheduled-scraper.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Queue scraper jobs for popular makes/models
    const jobs = [
      { type: 'search', make: 'Toyota', model: 'Camry', zipCode: '90001' },
      { type: 'search', make: 'Honda', model: 'Civic', zipCode: '90001' },
      { type: 'search', make: 'Tesla', model: 'Model 3', zipCode: '90001' },
      // ... more jobs
    ];

    // Send to queue
    await fetch(`${env.SCRAPER_API}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobs),
    });
  }
};
```

5. **Add Cron Trigger in `wrangler.toml`**

```toml
[triggers]
crons = ["0 */4 * * *"]  # Every 4 hours
```

### Deliverables

- ✅ Cars.com scraper working
- ✅ Browser Rendering integrated
- ✅ Queue system for scraper jobs
- ✅ Scheduled scraper (cron)
- ✅ Database upsert logic (dedup by VIN)
- ✅ Price history tracking
- ✅ `SCRAPER.md` - Scraper guide

---

## Agent 4: Search Infrastructure (Meilisearch)

### Configuration

**Tools:** Meilisearch Cloud, Meilisearch SDK

**Timeline:** 3-5 days

### Tasks

1. **Meilisearch Setup**

```bash
# Option 1: Meilisearch Cloud (recommended)
# Sign up at: https://www.meilisearch.com/cloud

# Option 2: Self-hosted on Fly.io or Railway
# Deploy Meilisearch container

# Install SDK
npm install meilisearch
```

2. **Index Configuration**

```typescript
// backend/src/search/setup.ts
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: 'https://your-instance.meilisearch.io',
  apiKey: 'YOUR_API_KEY',
});

async function setupIndex() {
  const index = client.index('listings');

  // Configure searchable attributes
  await index.updateSearchableAttributes([
    'make',
    'model',
    'trim',
    'version',
    'exterior_color',
    'interior_color',
    'dealer_name',
    'dealer_city',
  ]);

  // Configure filterable attributes
  await index.updateFilterableAttributes([
    'year',
    'make',
    'model',
    'trim',
    'price',
    'miles',
    'condition',
    'exterior_color',
    'interior_color',
    'drivetrain',
    'fuel_type',
    'dealer_type',
    'state',
    'is_active',
    'days_on_lot',
  ]);

  // Configure sortable attributes
  await index.updateSortableAttributes([
    'price',
    'miles',
    'year',
    'days_on_lot',
    'first_seen_at',
  ]);

  // Configure ranking rules
  await index.updateRankingRules([
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ]);

  // Configure faceting
  await index.updateFaceting({
    maxValuesPerFacet: 100,
  });
}

setupIndex();
```

3. **Sync Worker**

```typescript
// backend/src/workers/meilisearch-sync.ts
import { MeiliSearch } from 'meilisearch';
import { getDb } from '../db/client';
import { listings } from '../db/schema';

export async function syncToMeilisearch(env: Env) {
  const client = new MeiliSearch({
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_API_KEY,
  });

  const db = getDb(env.DATABASE_URL);
  const index = client.index('listings');

  // Get all active listings
  const allListings = await db.select().from(listings).where(eq(listings.isActive, true));

  // Transform for Meilisearch
  const documents = allListings.map(listing => ({
    id: listing.vin,
    vin: listing.vin,
    year: listing.year,
    make: listing.make,
    model: listing.model,
    trim: listing.trim,
    price: listing.price,
    miles: listing.miles,
    condition: listing.condition,
    exterior_color: listing.exteriorColor,
    interior_color: listing.interiorColor,
    dealer_name: listing.dealerName,
    state: listing.state,
    is_active: listing.isActive,
    // ... more fields
  }));

  // Batch upload
  await index.addDocuments(documents, { primaryKey: 'vin' });

  console.log(`Synced ${documents.length} listings to Meilisearch`);
}

// Run daily via cron
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await syncToMeilisearch(env);
  }
};
```

4. **Search API Integration**

```typescript
// backend/src/routes/search.ts
import { Hono } from 'hono';
import { MeiliSearch } from 'meilisearch';

const app = new Hono();

app.get('/', async (c) => {
  const client = new MeiliSearch({
    host: c.env.MEILISEARCH_HOST,
    apiKey: c.env.MEILISEARCH_API_KEY,
  });

  const index = client.index('listings');

  const { q, ...filters } = c.req.query();

  // Build filter string
  const filterParts = [];
  if (filters.make) filterParts.push(`make = "${filters.make}"`);
  if (filters.price_max) filterParts.push(`price <= ${filters.price_max}`);
  if (filters.year_min) filterParts.push(`year >= ${filters.year_min}`);

  const results = await index.search(q || '', {
    filter: filterParts.join(' AND '),
    facets: ['make', 'model', 'year', 'state', 'condition'],
    limit: 25,
    offset: (parseInt(filters.page || '1') - 1) * 25,
    sort: filters.sort_by ? [`${filters.sort_by}:${filters.sort_order || 'asc'}`] : [],
  });

  return c.json({
    success: true,
    data: results.hits,
    meta: {
      total: results.estimatedTotalHits,
      page: parseInt(filters.page || '1'),
      per_page: 25,
    },
    facets: results.facetDistribution,
  });
});

export { app as searchRouter };
```

### Deliverables

- ✅ Meilisearch instance running
- ✅ Index configured with facets
- ✅ Sync worker (daily cron)
- ✅ Search API endpoint
- ✅ Faceted search working
- ✅ Geo search (radius from zip)
- ✅ `SEARCH.md` - Search guide

---

## Parallel Execution Timeline

### Week 1-2: Foundation

**Day 1-2:** Agent 1 starts (Database)
**Day 3-4:** Agent 2 starts (API)
**Day 5-10:** Both agents continue in parallel

### Week 3-4: Data & Search

**Day 11-14:** Agent 3 starts (Scrapers)
**Day 11-14:** Agent 4 starts (Search)
**Day 15-21:** Integration testing

---

## Success Criteria

### Backend MVP Complete When:

- ✅ Database has 1,000+ listings from Cars.com
- ✅ API responds to search queries in <200ms
- ✅ Scraper runs every 4 hours successfully
- ✅ Price history tracking works
- ✅ Meilisearch faceted search returns accurate results
- ✅ Geo search (radius from zip code) functional
- ✅ All endpoints documented
- ✅ Error handling on all routes

---

## Next Steps

1. **Start Agent 1** - Database setup (blocking, start immediately)
2. **Start Agent 2** - API layer (can start in parallel)
3. **Wait for 1 & 2** - Then start Agents 3 & 4
4. **Integration Testing** - Week 3-4
5. **Deploy to Production** - End of Week 4

Ready to start? Let me know which agent you'd like to kick off first!

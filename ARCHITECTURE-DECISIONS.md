# Architecture Decision Record (ADR)

## Date: February 4, 2026

---

## Decision 1: Database - Supabase

### Status: ✅ Accepted

### Context

Need a PostgreSQL database to store vehicle listings, dealers, price history, and user data.

**Options considered:**
1. Neon - Optimized for Cloudflare Workers
2. Supabase - Full-featured platform with auth, storage, dashboard

### Decision

**Use Supabase**

### Rationale

**Pros:**
- Team is already familiar with Supabase
- Built-in authentication (Google OAuth, Apple Sign-In)
- Admin dashboard for database management
- Built-in storage (alternative to R2 for images)
- Realtime subscriptions (WebSocket support for live price updates)
- PostgREST API auto-generated from schema (bonus)

**Cons:**
- Slightly higher latency from Cloudflare Workers (~20-30ms)
- Requires connection pooler for Workers compatibility

**Trade-off accepted:**
- The 20-30ms latency difference vs Neon is negligible compared to the development time saved by using built-in features
- Using Supabase's connection pooler (`supabase.co:6543`) resolves Workers compatibility

### Implementation

```typescript
// Use Supabase connection pooler for Workers
const DATABASE_URL = "postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true"
```

---

## Decision 2: Scrapers - Cloudflare Workers + Browser Rendering

### Status: ✅ Accepted

### Context

Need to scrape Cars.com and other automotive listing sites every 4 hours.

**Options considered:**
1. Python workers (BeautifulSoup, Playwright) - Separate infrastructure
2. Cloudflare Workers with Browser Rendering API - Integrated

### Decision

**Use Cloudflare Workers + Browser Rendering**

### Rationale

**Pros:**
- All code in TypeScript (same language as API)
- No separate infrastructure to maintain
- Cloudflare Puppeteer integration (`@cloudflare/puppeteer`)
- Built-in scheduling with cron triggers
- Rate limiting and IP rotation built-in
- Same deployment pipeline as API

**Cons:**
- Slightly less mature scraping ecosystem than Python
- CPU time limits (may need to batch jobs)

**Trade-off accepted:**
- Unified codebase and deployment is worth more than Python's scraping advantages
- Cloudflare's Browser Rendering is production-ready and handles JavaScript-heavy sites

### Implementation

```typescript
import puppeteer from '@cloudflare/puppeteer';

export async function scrapeCarsComSearch(browser: Fetcher) {
  const browserInstance = await puppeteer.launch(browser);
  const page = await browserInstance.newPage();

  await page.goto('https://www.cars.com/shopping/results/...');
  const listings = await page.evaluate(() => {
    // Extract data from DOM
  });

  await browserInstance.close();
  return listings;
}
```

### References

- [Cloudflare Browser Rendering Docs](https://developers.cloudflare.com/browser-rendering/)
- [Puppeteer on Workers](https://developers.cloudflare.com/workers/examples/puppeteer/)

---

## Decision 3: AI Chat - Cloudflare Workers AI (Qwen/DeepSeek)

### Status: ✅ Accepted

### Context

Need AI chatbot to help users research vehicles, compare models, and answer questions with citations.

**Options considered:**
1. OpenAI GPT-4 - Industry standard, $$$
2. Anthropic Claude - Better citations, $$$
3. Cloudflare Workers AI (Qwen, DeepSeek) - Open source, $/cheaper

### Decision

**Use Cloudflare Workers AI with Qwen/DeepSeek models**

### Rationale

**Pros:**
- **Cost:** Much cheaper than OpenAI/Anthropic (~$0.001 vs $0.03 per 1K tokens)
- **Privacy:** Data stays on Cloudflare infrastructure
- **Integration:** Native Workers AI binding, no external API
- **Performance:** Low latency from edge
- **Models available:**
  - **DeepSeek-R1-Distill-Qwen-32B** - Best for complex reasoning (comparable to GPT-4-mini)
  - **Qwen2.5-Coder-7B** - Fast, good for structured data
  - **QwQ-32B** - Reasoning model for comparisons

**Cons:**
- Less "polished" than OpenAI for natural language
- Smaller context windows (but sufficient for our use case)
- Newer models, less battle-tested

**Trade-off accepted:**
- For an MVP chatbot answering car questions, Qwen/DeepSeek are more than capable
- Cost savings are significant at scale
- Can always upgrade to OpenAI/Claude later if needed

### Implementation

```typescript
import { Ai } from '@cloudflare/ai';

export default {
  async fetch(request, env) {
    const ai = new Ai(env.AI);

    const response = await ai.run('@cf/qwen/qwen1.5-7b-chat-awq', {
      messages: [
        {
          role: 'system',
          content: 'You are a car shopping assistant. Use the provided listings data to answer questions. Always cite sources.'
        },
        { role: 'user', content: 'What SUV under $35k?' }
      ]
    });

    return Response.json(response);
  }
};
```

### References

- [Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [DeepSeek-R1-Distill-Qwen-32B](https://developers.cloudflare.com/workers-ai/models/deepseek-r1-distill-qwen-32b/)

**Sources:**
- [Cloudflare Workers AI docs](https://developers.cloudflare.com/workers-ai/)
- [DeepSeek models on Cloudflare](https://developers.cloudflare.com/workers-ai/models/deepseek-r1-distill-qwen-32b/)

---

## Decision 4: Search - Meilisearch

### Status: ✅ Accepted

### Context

Need fast, faceted search for vehicle listings with filters (make, model, year, price, location).

**Options considered:**
1. PostgreSQL full-text search
2. Meilisearch - Dedicated search engine
3. Elasticsearch - Enterprise search
4. Algolia - Hosted search SaaS

### Decision

**Use Meilisearch**

### Rationale

**Pros:**
- **Fast:** Sub-100ms search with typo tolerance
- **Faceted search:** Built-in support for facets (critical for our filters)
- **Simple setup:** Easier than Elasticsearch
- **Cost:** Self-hostable or cheap cloud ($29/mo for 10M docs)
- **API-first:** Clean REST API
- **Geo search:** Built-in support for radius searches

**Cons:**
- Another service to manage (if self-hosted)
- Sync lag with PostgreSQL (need sync worker)

**Trade-off accepted:**
- Dedicated search engine provides much better UX than PostgreSQL full-text
- Sync lag is acceptable (can be <1 minute with efficient worker)

### Implementation

**Index Configuration:**
```json
{
  "searchableAttributes": ["make", "model", "trim", "dealer_name"],
  "filterableAttributes": ["year", "price", "miles", "state", "condition"],
  "sortableAttributes": ["price", "miles", "year", "days_on_lot"],
  "faceting": { "maxValuesPerFacet": 100 }
}
```

**Sync Strategy:**
- Incremental sync on scraper runs (new/updated listings)
- Full reindex daily (via cron)
- Monitor sync lag with Grafana

---

## Decision 5: Frontend - Deferred to Phase 2

### Status: ⏸️ Deferred

### Context

Need to decide on frontend framework (TanStack Start, Next.js, etc.)

### Decision

**Defer frontend to Phase 2, focus on backend API first**

### Rationale

- Backend is the critical path (data acquisition, search, API)
- Once backend is stable, frontend can be built quickly
- API-first approach allows flexibility (web, iOS, Android all use same API)
- Can test API with Postman/curl before building UI

### Next Steps

- Build backend API completely
- Document all endpoints
- Create OpenAPI spec
- Then choose frontend framework based on latest best practices

---

## Decision 6: Image Storage - Proxy URLs (for MVP)

### Status: ✅ Accepted (MVP only)

### Context

Cars.com listings have vehicle images. Need to decide where to store them.

**Options:**
1. Download and store in Cloudflare R2
2. Proxy original URLs from source sites
3. Hybrid (cache in R2, fallback to original)

### Decision

**For MVP: Proxy original URLs**
**For Production: Hybrid (cache + fallback)**

### Rationale

**MVP:**
- Faster to implement (no download/upload pipeline)
- Reduces storage costs initially
- Links may break, but acceptable for MVP

**Production:**
- Download images to R2 during scraper run
- Serve from R2 for speed and reliability
- Fallback to original URL if R2 fails
- Add image optimization (resize, WebP conversion)

### Implementation (MVP)

```typescript
// Just store the original URL
interface Listing {
  imageUrl: string;  // https://static.cargurus.com/...
}
```

### Implementation (Production)

```typescript
// Download and cache
async function downloadImage(url: string, vin: string, env: Env) {
  const response = await fetch(url);
  const blob = await response.blob();

  await env.IMAGES.put(`${vin}/main.jpg`, blob, {
    httpMetadata: { contentType: 'image/jpeg' }
  });

  return `https://images.yoursite.com/${vin}/main.jpg`;
}
```

---

## Decision 7: VIN Decoding - NHTSA API (Free)

### Status: ✅ Accepted

### Context

Need to decode VINs to get vehicle specs (engine, transmission, etc.)

**Options:**
1. NHTSA vPIC API (free, official)
2. CARFAX API (paid, includes history)
3. Build offline VIN decoder

### Decision

**Use NHTSA vPIC API**

### Rationale

**Pros:**
- Free, unlimited API
- Official government data
- Comprehensive vehicle specs
- No API key required

**Cons:**
- No vehicle history (need CARFAX for that)
- Rate limits (can work around with batching)

**Trade-off:**
- For MVP, free official data is ideal
- Can integrate CARFAX later for premium features

### Implementation

```typescript
async function decodeVIN(vin: string): Promise<VehicleSpecs> {
  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
  );

  const data = await response.json();

  return {
    make: findValue(data, 'Make'),
    model: findValue(data, 'Model'),
    year: findValue(data, 'ModelYear'),
    engine: findValue(data, 'EngineConfiguration'),
    transmission: findValue(data, 'TransmissionStyle'),
    drivetrain: findValue(data, 'DriveType'),
  };
}
```

---

## Summary of Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Database | Supabase (PostgreSQL) | Team familiarity, built-in auth |
| API Runtime | Cloudflare Workers | Edge computing, low latency |
| API Framework | Hono.js | Lightweight, Workers-native |
| Scrapers | CF Workers + Browser Rendering | Unified codebase, integrated |
| Search | Meilisearch | Fast faceted search |
| AI Chat | Workers AI (Qwen/DeepSeek) | Cost-effective, integrated |
| Cache | Cloudflare KV | Edge caching |
| Storage | Cloudflare R2 (deferred) | S3-compatible, no egress |
| Queue | Cloudflare Queues | Job processing |
| VIN Decoder | NHTSA vPIC API | Free, official |

---

## Open Questions / Future Decisions

### 1. Frontend Framework (deferred to Phase 2)
- TanStack Start (as per PRD)
- Next.js App Router
- Remix

### 2. YouTube Integration
- When to add video reviews/transcripts?
- Phase 2 or Phase 3?

### 3. Analytics
- PostHog (as per PRD)
- Plausible
- Google Analytics

### 4. Error Tracking
- Sentry (as per PRD)
- Cloudflare Workers Analytics

### 5. Monitoring
- Grafana Cloud (as per PRD)
- Datadog
- New Relic

---

*Last updated: February 4, 2026*

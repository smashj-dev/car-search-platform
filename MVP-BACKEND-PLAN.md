# MVP Backend Implementation Plan

## Overview

This document outlines the backend-first MVP development strategy for the Car Search Platform. We'll build the foundation with parallel agent tasks before moving to frontend development.

---

## Timeline: 6 Weeks to Backend MVP

```
Week 1-2: Core Infrastructure
Week 3-4: Data Ingestion
Week 5-6: Enhanced Features & Testing
```

---

## Agent Task Assignment

### Agent 1: Database & Schema Setup

**Duration:** 1-2 weeks
**Priority:** Critical (blocking)

#### Tasks

1. **Database Selection & Setup**
   - Choose between Neon or Supabase PostgreSQL
   - Set up production and development databases
   - Configure connection pooling

2. **Schema Implementation**
   - Create core tables from PRD Section 10.1:
     - `listings` - Vehicle listings with full specs
     - `dealers` - Dealer information with geolocation
     - `listing_price_history` - Price tracking over time
     - `users` - User accounts
     - `user_favorites` - Saved listings
     - `saved_searches` - Alert configuration
   - Add proper indexes for performance
   - Set up PostGIS for geospatial queries

3. **Migration System**
   - Set up Drizzle ORM
   - Create migration files
   - Document rollback procedures

4. **Seed Data**
   - Create sample dealers
   - Generate test listings for development
   - Add reference data (makes, models)

#### Deliverables

- `backend/db/schema.ts` - Drizzle schema definitions
- `backend/db/migrations/` - Migration files
- `backend/db/seed.ts` - Seed data script
- `DATABASE-SETUP.md` - Setup documentation

---

### Agent 2: API Layer & Core Endpoints

**Duration:** 1-2 weeks
**Priority:** Critical (blocking)

#### Tasks

1. **Cloudflare Workers Setup**
   - Initialize Wrangler project
   - Configure `wrangler.toml` with bindings
   - Set up KV namespaces for caching
   - Configure environment variables

2. **Hono.js API Framework**
   - Set up routing structure
   - Add middleware (CORS, auth, logging)
   - Implement error handling
   - Add request validation with Zod

3. **Core API Endpoints** (from PRD Section 9.1)
   ```
   GET  /api/v1/listings           # Search with filters
   GET  /api/v1/listings/:vin      # Detail page
   GET  /api/v1/listings/:vin/history  # Price history
   GET  /api/v1/filters            # Available filters
   GET  /api/v1/facets             # Dynamic facet counts
   ```

4. **Response Standardization**
   - Implement APIResponse/APIError types
   - Add pagination helpers
   - Cache strategy for common queries

#### Deliverables

- `backend/src/index.ts` - Main Workers entry
- `backend/src/routes/` - Route handlers
- `backend/src/middleware/` - Middleware
- `backend/src/types/` - TypeScript types
- `API-DOCUMENTATION.md` - Endpoint documentation

---

### Agent 3: Scraper Infrastructure

**Duration:** 2-3 weeks
**Priority:** High (data dependency)

#### Tasks

1. **Scraper Architecture**
   - Design queue-based scraper system
   - Implement rate limiting per domain
   - Set up Cloudflare Queues for job processing
   - Create scraper worker template

2. **Cars.com Scraper** (Primary source)
   - Search results page scraper
   - Listing detail page scraper
   - VIN extraction
   - Price, mileage, specs parsing
   - Image URL extraction
   - Dealer information extraction
   - Anti-bot detection handling

3. **VIN Decoder Integration**
   - NHTSA vPIC API client
   - Batch VIN decoding
   - Cache decoded VINs to avoid re-lookups
   - Fallback logic for API failures

4. **Data Pipeline**
   - Deduplication logic (by VIN)
   - Data normalization/transformation
   - Price history delta detection
   - Database insertion with error handling

5. **Scheduling**
   - Cron triggers (every 4 hours)
   - Job queue management
   - Failure retry logic
   - Monitoring/alerting

#### Deliverables

- `backend/scrapers/cars-com.ts` - Cars.com scraper
- `backend/scrapers/vin-decoder.ts` - VIN decoding
- `backend/scrapers/queue-worker.ts` - Queue consumer
- `backend/scrapers/scheduler.ts` - Cron scheduler
- `SCRAPER-GUIDE.md` - Scraper documentation

---

### Agent 4: Search Infrastructure

**Duration:** 1-2 weeks
**Priority:** High

#### Tasks

1. **Meilisearch Setup**
   - Deploy Meilisearch instance (Cloud or self-hosted)
   - Configure index settings from PRD Section 10.2
   - Set searchable/filterable/sortable attributes
   - Configure ranking rules

2. **Sync Pipeline**
   - Create database → Meilisearch sync worker
   - Incremental sync for new/updated listings
   - Full reindex capability
   - Monitor sync lag

3. **Search API Implementation**
   - Faceted search with counts
   - Range filters (price, miles, year)
   - Geographic search (radius from zip)
   - Sorting options
   - Pagination

4. **Search Optimization**
   - Query performance tuning
   - Facet caching strategy
   - Common query caching in KV
   - Search analytics logging

#### Deliverables

- `backend/src/services/search.ts` - Search service
- `backend/src/workers/meilisearch-sync.ts` - Sync worker
- `meilisearch-config.json` - Index configuration
- `SEARCH-SETUP.md` - Search documentation

---

### Agent 5: Authentication & User Management

**Duration:** 1 week
**Priority:** Medium

#### Tasks

1. **Google OAuth Integration**
   - Set up Google OAuth credentials
   - Implement OAuth flow with Arctic library
   - JWT token generation/validation
   - Session management in KV

2. **User Endpoints** (from PRD Section 9.1)
   ```
   GET    /api/v1/user/profile
   PUT    /api/v1/user/profile
   GET    /api/v1/user/favorites
   POST   /api/v1/user/favorites/:vin
   DELETE /api/v1/user/favorites/:vin
   GET    /api/v1/user/searches
   POST   /api/v1/user/searches
   DELETE /api/v1/user/searches/:id
   ```

3. **Authorization Middleware**
   - JWT validation middleware
   - User session loading
   - Rate limiting per user

4. **User Profile Management**
   - Profile creation on first login
   - Preferences storage (JSONB)
   - Last login tracking

#### Deliverables

- `backend/src/auth/oauth.ts` - OAuth implementation
- `backend/src/auth/jwt.ts` - JWT utilities
- `backend/src/routes/user.ts` - User endpoints
- `AUTH-GUIDE.md` - Authentication guide

---

### Agent 6: AI Chat & Citations

**Duration:** 1-2 weeks
**Priority:** Medium (can be Phase 2)

#### Tasks

1. **Chat Context Management**
   - Store conversation history per user
   - Track active search context
   - User preference tracking

2. **LLM Integration**
   - OpenAI GPT-4 or Anthropic Claude client
   - System prompt engineering
   - Context window management
   - Streaming responses

3. **Citation System**
   - Citation data structure (PRD Section 6.2)
   - Citation extraction from responses
   - Link to source listings/videos
   - Citation ranking by relevance

4. **Chat API** (from PRD Section 9.1)
   ```
   POST   /api/v1/chat            # Send message
   GET    /api/v1/chat/history    # Get history
   DELETE /api/v1/chat/history    # Clear history
   ```

5. **RAG Implementation** (future enhancement)
   - Vector embeddings for listings
   - Semantic search for context
   - Video transcript search

#### Deliverables

- `backend/src/services/chat.ts` - Chat service
- `backend/src/services/citations.ts` - Citation logic
- `backend/src/routes/chat.ts` - Chat endpoints
- `CHAT-IMPLEMENTATION.md` - Chat documentation

---

## Parallel Execution Strategy

### Week 1-2: Foundation

**Run in parallel:**
- Agent 1: Database setup → Start immediately
- Agent 2: API layer → Start immediately
- Agent 5: Auth setup → Start day 3

**Why parallel:** These have minimal dependencies. Database and API can be built simultaneously.

### Week 3-4: Data & Search

**Run in parallel:**
- Agent 3: Scraper infrastructure → Start week 3
- Agent 4: Search setup → Start week 3

**Why parallel:** Both depend on database schema from Agent 1, but are independent of each other.

### Week 5-6: Enhancement

**Run in parallel:**
- Agent 6: AI Chat → Start week 5
- All agents: Integration testing, bug fixes

**Why parallel:** Chat is an enhancement that can run while we stabilize core features.

---

## Dependencies Graph

```
Agent 1 (Database)
  ↓
  ├──→ Agent 2 (API) ──→ Agent 5 (Auth)
  ├──→ Agent 3 (Scrapers)
  └──→ Agent 4 (Search)
       ↓
       Agent 6 (Chat)
```

---

## Testing Strategy

### Unit Tests
- Database models and queries
- API endpoint logic
- Scraper parsing functions
- Auth token generation

### Integration Tests
- End-to-end API flows
- Scraper → Database → Search pipeline
- OAuth flow
- Chat with citations

### Load Tests
- API throughput (target: >1000 req/s)
- Search performance (target: <200ms p95)
- Scraper queue processing

---

## Monitoring & Observability

### Metrics to Track (Grafana)

1. **API Performance**
   - Request latency by endpoint
   - Error rates
   - Cache hit rates

2. **Scraper Health**
   - Success/failure rates
   - Records processed per hour
   - Queue depth

3. **Database**
   - Query performance
   - Connection pool usage
   - Table sizes

4. **Search**
   - Search latency
   - Sync lag
   - Popular queries

### Alerts

- API error rate >1%
- Scraper failure rate >5%
- Database connections >80%
- Search sync lag >30 minutes

---

## Deployment Plan

### Environments

1. **Development** - Local Wrangler dev server
2. **Staging** - Cloudflare preview deployments
3. **Production** - Cloudflare Workers production

### Deployment Pipeline

```yaml
# .github/workflows/backend-deploy.yml
on:
  push:
    branches: [main]
    paths: [backend/**]

jobs:
  - test          # Run tests
  - deploy-api    # Deploy Workers
  - deploy-scrapers  # Deploy scraper workers
  - run-migrations   # Run database migrations
```

---

## Open Questions

1. **Database Choice:** Neon vs Supabase?
   - Neon: Better Cloudflare integration, cheaper
   - Supabase: Built-in auth, realtime, storage

2. **Scraper Approach:** Cloudflare Workers vs dedicated Python workers?
   - CF Workers: JavaScript-based, integrated
   - Python: Better scraping libraries (BeautifulSoup, Playwright)

3. **Image Storage:** Where to store scraped images?
   - Option 1: R2 (store locally)
   - Option 2: Proxy original URLs
   - Option 3: Hybrid (cache in R2, fallback to original)

4. **AI Model Choice:** OpenAI vs Anthropic Claude?
   - OpenAI: Better market data
   - Claude: Better citations, longer context

---

## Success Criteria (Backend MVP)

### Functional Requirements

- ✅ Database with 10K+ test listings
- ✅ Search API with facets and filters working
- ✅ Cars.com scraper running every 4 hours
- ✅ Price history tracking operational
- ✅ Google OAuth login working
- ✅ User favorites and saved searches functional
- ✅ Basic AI chat responding with context

### Performance Requirements

- ✅ API latency <200ms (p95)
- ✅ Search results in <100ms
- ✅ Scraper success rate >95%
- ✅ Database queries <50ms (p95)

### Quality Requirements

- ✅ 80%+ test coverage
- ✅ All endpoints documented
- ✅ Error handling on all routes
- ✅ Monitoring dashboards live

---

## Next Steps

1. **Approve this plan** - Confirm approach and timeline
2. **Answer open questions** - Make architectural decisions
3. **Start Agent 1** - Database setup (critical path)
4. **Provision resources** - Cloudflare account, database, etc.
5. **Set up CI/CD** - GitHub Actions for automated deploys

---

*Created: February 4, 2026*

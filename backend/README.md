# Car Search Platform - Backend API

A production-ready Cloudflare Workers API for car listing search, scraping, and analysis.

## Features

- **RESTful API** - Listings, search, filters, insights
- **Web Scraper** - Automated Cars.com scraping with queue system
- **VIN Decoder** - NHTSA integration for vehicle specifications
- **AI Chat** - Cloudflare Workers AI for natural language queries
- **Market Analysis** - Price trends and availability insights
- **D1 Database** - SQLite-based storage with Drizzle ORM

## Quick Start

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Deploy to production
npm run deploy
```

## Project Structure

```
backend/
├── src/
│   ├── db/
│   │   └── schema.ts           # Database schema (Drizzle ORM)
│   ├── routes/
│   │   ├── listings.ts         # Listing CRUD operations
│   │   ├── scraper.ts          # Scraper endpoints
│   │   ├── chat.ts             # AI chat interface
│   │   ├── market.ts           # Market analysis
│   │   ├── vin.ts              # VIN decoding
│   │   └── listing-insights.ts # Individual listing insights
│   ├── services/
│   │   ├── scraper-cars-com.ts # Cars.com scraper
│   │   └── scraper-utils.ts    # Scraper utilities
│   ├── workers/
│   │   └── batch-decode.ts     # Batch VIN processing
│   ├── types/
│   │   └── env.ts              # Environment bindings
│   └── index.ts                # Main application entry
├── wrangler.toml               # Cloudflare Workers config
├── drizzle.config.ts           # Drizzle ORM config
├── package.json
└── Documentation:
    ├── SCRAPER_GUIDE.md            # Comprehensive scraper guide
    ├── SCRAPER_IMPLEMENTATION.md   # Technical implementation details
    ├── SCRAPER_QUICK_REFERENCE.md  # Quick commands and tips
    ├── SCRAPER_VALIDATION.md       # Testing checklist
    └── test-scraper.sh             # Automated test script
```

## API Endpoints

### Listings
- `GET /api/v1/listings` - Search and filter listings
- `GET /api/v1/listings/:vin` - Get listing details
- `GET /api/v1/listings/:vin/price-history` - Get price history

### Scraper
- `POST /api/v1/scraper/trigger` - Trigger immediate scrape
- `POST /api/v1/scraper/queue` - Queue background scrape job
- `GET /api/v1/scraper/status` - Check scraper status
- `GET /api/v1/scraper/stats` - Get database statistics
- `GET /api/v1/scraper/metrics` - Get scraper performance metrics

### VIN Decoding
- `GET /api/v1/vin/:vin/decode` - Decode single VIN
- `POST /api/v1/admin/decode-vins` - Batch decode VINs

### Chat
- `POST /api/v1/chat` - AI-powered chat queries

### Market Analysis
- `GET /api/v1/market/trends` - Price and availability trends
- `GET /api/v1/market/summary` - Market overview

## Scraper System

The scraper system is a complete, production-ready solution for automated Cars.com scraping.

### Features
- ✅ Queue-based background processing
- ✅ Scheduled scraping every 4 hours
- ✅ Rate limiting (2-3 seconds between requests)
- ✅ Anti-bot detection and handling
- ✅ Automatic retry logic (3 attempts)
- ✅ Comprehensive monitoring and metrics
- ✅ Auto-enrichment with VIN data

### Quick Test
```bash
# Run automated test suite
./test-scraper.sh http://localhost:8787

# Or test individual endpoints
curl -X POST http://localhost:8787/api/v1/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{"make":"Tesla","model":"Model 3","zipCode":"90001"}'
```

### Documentation
For complete scraper documentation, see:
- **[SCRAPER_GUIDE.md](./SCRAPER_GUIDE.md)** - Comprehensive user guide
- **[SCRAPER_QUICK_REFERENCE.md](./SCRAPER_QUICK_REFERENCE.md)** - Quick commands
- **[SCRAPER_VALIDATION.md](./SCRAPER_VALIDATION.md)** - Testing checklist

## Environment Setup

### Cloudflare Bindings

The application uses the following Cloudflare bindings:

1. **D1 Database** (`DB`) - SQLite database
2. **KV Namespace** (`CACHE`) - Caching layer
3. **R2 Bucket** (`STORAGE`) - Object storage
4. **Workers AI** (`AI`) - AI models
5. **Browser Rendering** (`BROWSER`) - Puppeteer for scraping
6. **Queue** (`SCRAPE_QUEUE`) - Job queue system

### First-Time Setup

```bash
# Create D1 database
wrangler d1 create car-search-db

# Update database_id in wrangler.toml with the output

# Run migrations
npm run db:migrate

# Create KV namespace
wrangler kv:namespace create CACHE

# Update id in wrangler.toml

# Create R2 bucket
wrangler r2 bucket create kemi-scrapes

# Create queues
wrangler queues create kemi-scrape-queue
wrangler queues create kemi-scrape-dlq
```

### Secrets Management

Set secrets using Wrangler:

```bash
# Supabase (if using)
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Email (if using)
wrangler secret put MAILCHANNELS_API_KEY
```

## Database Schema

### Tables

1. **listings** - Vehicle listings
   - VIN, year, make, model, trim
   - Price, miles, condition
   - Dealer information
   - Specs (engine, transmission, drivetrain)
   - Timestamps (first_seen_at, last_seen_at)

2. **listing_price_history** - Price tracking
   - Listing ID, VIN
   - Price, miles, source
   - Timestamp

3. **dealers** - Dealer information
   - Name, location
   - Contact information

4. **users** - User accounts (optional)
5. **user_favorites** - Saved listings
6. **saved_searches** - Search alerts

### Migrations

```bash
# Generate new migration
npm run db:generate

# Apply migrations locally
npm run db:migrate

# Apply migrations to production
npm run db:migrate:prod

# Open Drizzle Studio
npm run db:studio
```

## Development

### Local Development

```bash
# Start dev server
npm run dev

# The API will be available at http://localhost:8787

# Tail logs
npx wrangler tail
```

### Testing

```bash
# Run scraper test suite
./test-scraper.sh http://localhost:8787

# Test specific endpoints
curl http://localhost:8787/api/v1/listings
curl http://localhost:8787/api/v1/scraper/status
```

## Deployment

### Deploy to Production

```bash
# Deploy
npm run deploy

# Verify deployment
npx wrangler deployments list

# Monitor production
npx wrangler tail
```

### Post-Deployment Checklist

1. ✅ Verify worker is active in Cloudflare dashboard
2. ✅ Test API endpoints with production URL
3. ✅ Check queue is processing jobs
4. ✅ Verify scheduled worker runs (wait for cron)
5. ✅ Monitor error rates and performance
6. ✅ Check database has data

## Monitoring

### Cloudflare Dashboard

Navigate to: Workers & Pages > your-worker

Monitor:
- Invocations per minute
- Error rate
- Duration (P50, P95, P99)
- CPU time
- Queue depth

### API Endpoints

```bash
# Database statistics
curl https://your-worker.workers.dev/api/v1/scraper/stats

# Performance metrics
curl https://your-worker.workers.dev/api/v1/scraper/metrics?days=7

# Health check
curl https://your-worker.workers.dev/api/v1/scraper/status
```

### Logs

```bash
# Real-time logs
npx wrangler tail

# Filter for errors
npx wrangler tail | grep ERROR

# Filter for specific component
npx wrangler tail | grep "Queue Consumer"
```

## Architecture

### Technology Stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Hono (lightweight web framework)
- **ORM**: Drizzle ORM
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2
- **Queue**: Cloudflare Queues
- **AI**: Cloudflare Workers AI
- **Scraping**: Cloudflare Browser Rendering (Puppeteer)

### Request Flow

```
Client Request
    ↓
Cloudflare Edge
    ↓
Hono Router
    ↓
Route Handler
    ↓
Service Layer (Scraper, VIN Decoder, etc.)
    ↓
Database / External APIs
    ↓
Response
```

### Scraper Flow

```
Scheduled Worker (every 4 hours)
    ↓
Queue 50 scrape jobs
    ↓
Queue Consumer (batch processing)
    ↓
Scraper Service (Puppeteer)
    ↓
Cars.com → Extract listings
    ↓
Save to D1 Database
    ↓
Auto-enrich with VIN data (background)
    ↓
Record metrics to KV
```

## Performance

### Expected Metrics

- **API Response Time**: <100ms (listings endpoint)
- **Scrape Duration**: 10-15 seconds per search
- **Listings per Scrape**: 20-50
- **Queue Throughput**: 5-10 jobs per minute
- **Success Rate**: >95%

### Optimization Tips

1. **Caching**: Popular searches cached in KV
2. **Pagination**: Use offset/limit for large result sets
3. **Indexing**: VIN, make/model indexed in D1
4. **Rate Limiting**: Built into scraper (2-3s delays)

## Troubleshooting

### Common Issues

1. **Scraper Not Finding Listings**
   - Check Cars.com HTML structure hasn't changed
   - Verify search parameters are valid
   - Review logs for selector warnings

2. **Queue Not Processing**
   - Verify queue exists: `npx wrangler queues list`
   - Check worker is deployed
   - Review logs for errors

3. **Database Errors**
   - Verify migrations are applied
   - Check D1 database exists
   - Review schema matches code

4. **Anti-Bot Detection**
   - Increase delays between requests
   - Reduce scraping frequency
   - Check IP isn't blocked

### Debug Commands

```bash
# Check D1 database
wrangler d1 execute car-search-db --local \
  --command "SELECT COUNT(*) FROM listings"

# List queues
wrangler queues list

# View queue metrics
# Go to Cloudflare Dashboard > Queues

# Check worker deployments
npx wrangler deployments list

# Force redeploy
npx wrangler deploy --force
```

## Contributing

### Code Style

- Use TypeScript for type safety
- Follow existing naming conventions
- Add JSDoc comments for functions
- Use descriptive variable names

### Adding a New Endpoint

1. Create route handler in `src/routes/`
2. Define types/schemas with Zod
3. Mount router in `src/index.ts`
4. Add tests
5. Update documentation

### Adding a New Scraper Source

1. Create scraper in `src/services/scraper-{source}.ts`
2. Implement `scrape()` and `saveListingsToDB()` functions
3. Add to scheduled worker
4. Update scraper router
5. Document in SCRAPER_GUIDE.md

## License

[Your License Here]

## Support

For issues or questions:
1. Check documentation in `/backend/SCRAPER_*.md`
2. Review logs: `npx wrangler tail`
3. Check Cloudflare dashboard for metrics
4. Test with `./test-scraper.sh`

---

**Built with** Cloudflare Workers, Hono, Drizzle ORM, and Puppeteer

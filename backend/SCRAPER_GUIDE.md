# Cars.com Scraper System Guide

## Overview

The scraper system is built on Cloudflare Workers with the following components:
- **Scraper Service**: Puppeteer-based scraping using Cloudflare Browser Rendering
- **Queue System**: Background job processing with retry logic
- **Scheduled Worker**: Automated scraping every 4 hours
- **Monitoring**: Metrics tracking and stats endpoints

## Architecture

```
┌─────────────────┐
│  API Endpoints  │
│  /api/v1/scraper│
└────────┬────────┘
         │
         ├─► POST /trigger (immediate scrape)
         ├─► POST /queue (queue for background)
         ├─► GET  /status
         ├─► GET  /stats
         └─► GET  /metrics
              ┌──────────────┐
              │ Queue System │
              │ SCRAPE_QUEUE │
              └──────┬───────┘
                     │
              ┌──────▼───────────┐
              │ Queue Consumer   │
              │ - Batch processing│
              │ - Retry logic    │
              │ - Rate limiting  │
              └──────┬───────────┘
                     │
              ┌──────▼───────────┐
              │ Scraper Service  │
              │ - Puppeteer      │
              │ - Multi-selector │
              │ - Anti-bot       │
              └──────┬───────────┘
                     │
              ┌──────▼───────────┐
              │  D1 Database     │
              │  - Listings      │
              │  - Price History │
              └──────────────────┘
```

## API Endpoints

### 1. Trigger Immediate Scrape

```bash
POST /api/v1/scraper/trigger
Content-Type: application/json

{
  "make": "Tesla",
  "model": "Model 3",
  "zipCode": "90001",
  "radius": 100
}
```

Response:
```json
{
  "success": true,
  "message": "Scraped and saved 25 listings",
  "data": {
    "count": 25,
    "make": "Tesla",
    "model": "Model 3",
    "zipCode": "90001"
  }
}
```

### 2. Queue Background Scrape

```bash
POST /api/v1/scraper/queue
Content-Type: application/json

{
  "make": "Honda",
  "model": "Civic",
  "zipCode": "10001",
  "radius": 50
}
```

Response:
```json
{
  "success": true,
  "message": "Scrape job queued successfully",
  "data": {
    "make": "Honda",
    "model": "Civic",
    "zipCode": "10001",
    "radius": 50
  }
}
```

### 3. Get Scraper Status

```bash
GET /api/v1/scraper/status
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "browser": "cloudflare-puppeteer",
    "sources": ["cars.com"]
  }
}
```

### 4. Get Database Stats

```bash
GET /api/v1/scraper/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalListings": 1250,
      "activeListings": 1180,
      "recentListings": 125,
      "priceHistoryCount": 3420,
      "latestScrape": "2024-02-05T10:30:00.000Z"
    },
    "bySource": [
      { "source": "cars.com", "count": 1180 }
    ],
    "popularMakes": [
      { "make": "Tesla", "count": 245 },
      { "make": "Honda", "count": 189 },
      { "make": "Toyota", "count": 176 }
    ]
  }
}
```

### 5. Get Scraper Metrics

```bash
GET /api/v1/scraper/metrics?days=7
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "date": "2024-02-05",
        "totalJobs": 50,
        "successJobs": 48,
        "failedJobs": 2,
        "totalListings": 1250,
        "totalDuration": 125000
      }
    ],
    "period": "7 days"
  }
}
```

## Testing the Scraper

### Local Development Testing

```bash
# Install dependencies
cd backend
npm install

# Run local development server
npx wrangler dev

# Test immediate scrape (in another terminal)
curl -X POST http://localhost:8787/api/v1/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Tesla",
    "model": "Model 3",
    "zipCode": "90001",
    "radius": 100
  }'

# Check stats
curl http://localhost:8787/api/v1/scraper/stats
```

### Testing Queue System

```bash
# Queue a job
curl -X POST http://localhost:8787/api/v1/scraper/queue \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Honda",
    "model": "Civic",
    "zipCode": "10001"
  }'

# Check queue processing in logs
# Watch the console output for queue consumer logs
```

### Testing with Multiple Makes/Models

```bash
# Test script for multiple combinations
for make in Tesla Honda Toyota; do
  for model in "Model 3" Civic Camry; do
    curl -X POST http://localhost:8787/api/v1/scraper/queue \
      -H "Content-Type: application/json" \
      -d "{
        \"make\": \"$make\",
        \"model\": \"$model\",
        \"zipCode\": \"90001\"
      }"
    sleep 1
  done
done
```

## Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy
cd backend
npx wrangler deploy

# Check deployed URL
npx wrangler deployments list

# View logs
npx wrangler tail
```

### Setup Queue (First Time)

```bash
# Create queue
npx wrangler queues create kemi-scrape-queue

# Create dead letter queue
npx wrangler queues create kemi-scrape-dlq

# Verify queues
npx wrangler queues list
```

### Setup Scheduled Worker

The scheduled worker is configured in `wrangler.toml`:

```toml
[triggers]
crons = ["0 */4 * * *"]  # Every 4 hours
```

To test the scheduled worker manually:

```bash
# Trigger cron locally for testing
curl http://localhost:8787/__scheduled?cron=0+*/4+*+*+*
```

## Monitoring

### View Real-Time Logs

```bash
# Tail logs from deployed worker
npx wrangler tail

# Filter for queue consumer logs
npx wrangler tail --format=pretty | grep "Queue Consumer"

# Filter for errors
npx wrangler tail --format=pretty | grep "ERROR"
```

### Check Metrics

```bash
# Get last 7 days of metrics
curl https://your-worker.workers.dev/api/v1/scraper/metrics?days=7

# Get database stats
curl https://your-worker.workers.dev/api/v1/scraper/stats
```

## Rate Limiting & Best Practices

### Built-in Rate Limiting

The scraper includes several rate limiting mechanisms:

1. **Between Jobs**: 2-3 second random delay
2. **Retry Delays**: Exponential backoff on retries
3. **Batch Processing**: Max 10 jobs per batch
4. **Timeout**: 30 seconds per page load

### Respecting robots.txt

The scraper includes a `checkRobotsConsent()` function that:
- Fetches `/robots.txt` from the target site
- Checks for disallowed paths
- Proceeds only if allowed

### Anti-Bot Detection

The scraper handles anti-bot detection by:
- Setting realistic user agent
- Random delays between requests
- Detecting "Access Denied" or "captcha" pages
- Automatic retry with backoff

## Troubleshooting

### Common Issues

#### 1. No Listings Found

**Problem**: Scraper returns 0 listings

**Solutions**:
- Check if Cars.com changed their HTML structure
- Verify the search URL is correct
- Check console logs for selector warnings
- Test the URL manually in a browser

#### 2. Timeout Errors

**Problem**: Page load times out

**Solutions**:
- Increase timeout in `page.goto()` (currently 30s)
- Check network connectivity
- Verify Cars.com is accessible
- Try different ZIP codes

#### 3. Anti-Bot Detection Triggered

**Problem**: "Access Denied" or captcha detected

**Solutions**:
- Increase delays between requests
- Reduce frequency of scheduled scrapes
- Check if IP is blocked
- Contact Cars.com for scraping permission

#### 4. Queue Jobs Not Processing

**Problem**: Jobs queued but not executing

**Solutions**:
- Check queue consumer is deployed
- Verify queue binding in wrangler.toml
- Check worker logs for errors
- Ensure queue exists: `npx wrangler queues list`

### Debug Mode

Enable verbose logging by checking the console output:

```javascript
// In scraper-cars-com.ts, the page.evaluate() function logs:
console.log(`Found ${cards.length} cards with selector: ${selector}`);
console.warn(`Card ${index}: No VIN found, skipping`);
```

## Performance Metrics

### Expected Performance

- **Scrape Time**: 10-15 seconds per search
- **Listings per Search**: 20-50 listings
- **Success Rate**: >95% under normal conditions
- **Queue Processing**: 5-10 jobs per minute (with rate limiting)

### Optimization Tips

1. **Batch Queuing**: Queue multiple jobs at once
2. **Strategic ZIP Codes**: Use major metro areas
3. **Popular Models**: Focus on high-volume vehicles
4. **Off-Peak Hours**: Schedule during low-traffic times

## Scheduled Worker Configuration

### Current Schedule

The worker runs every 4 hours with the following configuration:

- **Makes**: Tesla, Honda, Toyota, Ford, Chevrolet
- **Models**: Model 3, Model Y, Civic, Accord, Camry, RAV4, F-150, Mustang, Silverado, Malibu
- **ZIP Codes**: 90001 (LA), 10001 (NYC), 60601 (Chicago), 77001 (Houston), 85001 (Phoenix)
- **Total Jobs per Run**: 50 jobs (5 makes × 2 models × 5 ZIPs)

### Customizing the Schedule

Edit `/backend/src/index.ts` in the `scheduled()` function:

```typescript
const scrapeTargets = [
  { make: 'Tesla', models: ['Model 3', 'Model Y'] },
  // Add more makes/models here
];

const zipCodes = ['90001', '10001', '60601'];
// Add more ZIP codes here
```

## Data Storage

### Database Schema

Scraped data is stored in D1 tables:

1. **listings**: Vehicle listings
   - VIN, year, make, model, trim
   - Price, miles, condition
   - Dealer info
   - Source URL and timestamp

2. **listing_price_history**: Price tracking
   - Listing ID, VIN
   - Price, miles, source
   - Timestamp

3. **dealers**: Dealer information
   - Name, location
   - Contact info

### Price History Tracking

The scraper automatically:
- Records initial price on first scrape
- Updates price/miles on subsequent scrapes
- Creates price history entries when price changes
- Tracks `first_seen_at` and `last_seen_at`

## Support

For issues or questions:
1. Check logs: `npx wrangler tail`
2. Review this guide
3. Check Cloudflare Workers dashboard
4. Inspect queue metrics in dashboard

# Scraper Quick Reference

## Quick Start

```bash
# 1. Start local development
cd backend
npx wrangler dev

# 2. Run test suite
./test-scraper.sh http://localhost:8787

# 3. Deploy to production
npx wrangler deploy

# 4. Monitor logs
npx wrangler tail
```

## API Endpoints Cheat Sheet

### Trigger Immediate Scrape
```bash
curl -X POST http://localhost:8787/api/v1/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{"make":"Tesla","model":"Model 3","zipCode":"90001","radius":100}'
```

### Queue Background Job
```bash
curl -X POST http://localhost:8787/api/v1/scraper/queue \
  -H "Content-Type: application/json" \
  -d '{"make":"Honda","model":"Civic","zipCode":"10001"}'
```

### Get Stats
```bash
curl http://localhost:8787/api/v1/scraper/stats | jq
```

### Get Metrics
```bash
curl http://localhost:8787/api/v1/scraper/metrics?days=7 | jq
```

## Common Operations

### Setup Queues (First Time)
```bash
npx wrangler queues create kemi-scrape-queue
npx wrangler queues create kemi-scrape-dlq
```

### Test Scheduled Worker Locally
```bash
curl "http://localhost:8787/__scheduled?cron=0+*/4+*+*+*"
```

### View Queue Status
```bash
# Via Cloudflare dashboard
# Workers & Pages > your-worker > Queues
```

### Check Database
```bash
# List all listings
wrangler d1 execute car-search-db --local \
  --command "SELECT COUNT(*) as count FROM listings"

# Recent scrapes
wrangler d1 execute car-search-db --local \
  --command "SELECT make, model, COUNT(*) as count FROM listings GROUP BY make, model ORDER BY count DESC LIMIT 10"
```

## Troubleshooting Commands

### View Real-Time Logs
```bash
npx wrangler tail --format=pretty
```

### Filter Logs
```bash
# Queue consumer only
npx wrangler tail | grep "Queue Consumer"

# Errors only
npx wrangler tail | grep "ERROR"

# Specific job
npx wrangler tail | grep "Job abc123"
```

### Force Redeploy
```bash
npx wrangler deploy --force
```

### Clear KV Cache
```bash
# List keys
wrangler kv:key list --binding=CACHE

# Delete specific key
wrangler kv:key delete "scraper:summary:2024-02-05" --binding=CACHE
```

## Configuration Quick Edits

### Change Scrape Frequency
Edit `backend/wrangler.toml`:
```toml
[triggers]
crons = ["0 */6 * * *"]  # Change to every 6 hours
```

### Add More Makes/Models
Edit `backend/src/index.ts` in the `scheduled()` function:
```typescript
const scrapeTargets = [
  { make: 'Tesla', models: ['Model 3', 'Model Y'] },
  { make: 'BMW', models: ['3 Series', 'X5'] },  // Add new makes
];
```

### Adjust Rate Limiting
Edit `backend/src/services/scraper-utils.ts`:
```typescript
export function getRandomDelay(min: number = 3000, max: number = 5000) {
  // Increase from 2-3s to 3-5s
  return min + Math.random() * (max - min);
}
```

## Environment Variables

### Set Production Secrets
```bash
# Supabase (if used)
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Email (if used)
wrangler secret put MAILCHANNELS_API_KEY
```

## Performance Monitoring

### Key Metrics to Watch

1. **Success Rate**: Should be >95%
   - Check: `/api/v1/scraper/metrics`

2. **Average Duration**: Should be 10-15s per job
   - Check: `/api/v1/scraper/metrics`

3. **Listings per Scrape**: Should be 20-50
   - Check: `/api/v1/scraper/stats`

4. **Queue Depth**: Should stay near 0
   - Check: Cloudflare Dashboard > Queues

### Alert Thresholds

- Success rate <90%: Investigate selectors or anti-bot
- Duration >30s: Check network or timeout settings
- Listings <5: Search parameters may be too restrictive
- Queue depth >100: Consumer may be stuck

## Emergency Procedures

### Scraper Stuck or Failing

1. Check recent errors:
   ```bash
   npx wrangler tail | grep "ERROR" | tail -20
   ```

2. Test single scrape:
   ```bash
   curl -X POST http://localhost:8787/api/v1/scraper/trigger \
     -H "Content-Type: application/json" \
     -d '{"make":"Honda","model":"Civic","zipCode":"10001"}'
   ```

3. If anti-bot detected:
   - Increase delays in scraper-utils.ts
   - Reduce scheduled frequency
   - Contact Cars.com for permission

### Queue Consumer Not Processing

1. Verify queue exists:
   ```bash
   npx wrangler queues list
   ```

2. Check consumer logs:
   ```bash
   npx wrangler tail | grep "Queue Consumer"
   ```

3. Redeploy worker:
   ```bash
   npx wrangler deploy --force
   ```

4. Manually trigger queue drain:
   - Cloudflare Dashboard > Queues > kemi-scrape-queue > Retry all

### Database Issues

1. Check connection:
   ```bash
   wrangler d1 execute car-search-db --local --command "SELECT 1"
   ```

2. Verify schema:
   ```bash
   wrangler d1 execute car-search-db --local --command ".schema listings"
   ```

3. Run migrations:
   ```bash
   npm run db:migrate:prod
   ```

## Best Practices

### DO
- ✅ Test locally before deploying
- ✅ Monitor logs after deployment
- ✅ Use queue for bulk scraping
- ✅ Check stats regularly
- ✅ Keep rate limits reasonable

### DON'T
- ❌ Scrape more frequently than every 4 hours
- ❌ Remove rate limiting delays
- ❌ Ignore anti-bot detection
- ❌ Queue hundreds of jobs at once
- ❌ Scrape the same URL repeatedly

## Support Resources

- **Full Documentation**: `SCRAPER_GUIDE.md`
- **Implementation Details**: `SCRAPER_IMPLEMENTATION.md`
- **Test Script**: `test-scraper.sh`
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Puppeteer Docs**: https://developers.cloudflare.com/browser-rendering/

## Contact

For issues or questions:
1. Check logs: `npx wrangler tail`
2. Review documentation files
3. Inspect Cloudflare dashboard
4. Test with `test-scraper.sh`

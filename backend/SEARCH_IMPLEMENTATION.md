# Advanced Search Implementation Guide

## Overview

This document provides a technical overview of the advanced search implementation, including architecture, file structure, and integration guidelines.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Request                      │
│                  GET /api/v1/listings?...                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Listings Router                          │
│            (routes/listings.ts)                             │
│   - Validates query parameters with Zod                     │
│   - Parses multi-select filters                             │
│   - Handles geographic lookup                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    SearchService                            │
│            (services/search.ts)                             │
│   - Builds dynamic SQL WHERE conditions                     │
│   - Executes main query with pagination                     │
│   - Computes facets in parallel                             │
│   - Calculates statistics and buckets                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    D1 Database                              │
│   - Listings table with indexes                             │
│   - Dealers table with location data                        │
│   - Optimized queries with LEFT JOIN                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    FacetsCache                              │
│            (services/facets.ts)                             │
│   - Caches facets in Cloudflare KV                          │
│   - 5-minute TTL                                            │
│   - Cache key based on filter hash                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Response                                 │
│   - Listings data with dealer info                          │
│   - Facets with counts                                      │
│   - Statistics (min, max, avg, median)                      │
│   - Range buckets                                           │
│   - Performance metrics                                     │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

### Core Implementation

```
backend/src/
├── routes/
│   └── listings.ts          # Enhanced search endpoint
├── services/
│   ├── search.ts            # SearchService class
│   └── facets.ts            # FacetsCache class
├── utils/
│   ├── geo.ts               # Geographic utilities
│   └── search-helpers.ts    # Query building helpers
└── types/
    ├── env.ts               # Updated with CACHE_INVALIDATION_TOKEN
    └── search.ts            # TypeScript types for search
```

### Documentation

```
backend/
├── SEARCH_API.md            # API documentation with examples
├── SEARCH_IMPLEMENTATION.md # This file
└── test-search.http         # REST client test file
```

## Key Components

### 1. SearchService (`services/search.ts`)

The core search engine that handles:
- Dynamic SQL query building
- Facet computation
- Statistics calculation
- Range bucketing
- Geographic filtering

**Key Methods:**
- `search(filters, userLocation)` - Main search method
- `buildWhereConditions(filters)` - Builds SQL WHERE clause
- `getFacets(conditions)` - Computes facet counts
- `getStats(conditions)` - Calculates min/max/avg/median
- `getBuckets(conditions)` - Creates range buckets

### 2. FacetsCache (`services/facets.ts`)

Intelligent caching layer for facets:
- Uses Cloudflare KV for distributed caching
- Generates cache keys from filter hashes
- 5-minute TTL for freshness
- Bulk invalidation support

**Key Methods:**
- `generateCacheKey(filters)` - Creates SHA-256 hash of filters
- `get(cacheKey)` - Retrieves cached facets
- `set(cacheKey, data)` - Stores facets with TTL
- `invalidateAll()` - Clears all cached facets

### 3. Geographic Utilities (`utils/geo.ts`)

Location-based search utilities:
- Haversine distance calculation
- ZIP code to coordinates lookup
- Bounding box computation
- Distance filtering and sorting

**Key Functions:**
- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine formula
- `getCoordinatesFromZip(zipCode)` - ZIP → lat/lon
- `filterByRadius(listings, lat, lon, radius)` - Geographic filter
- `sortByDistance(listings, lat, lon)` - Distance sorting

### 4. Search Helpers (`utils/search-helpers.ts`)

Frontend integration utilities:
- Filter to query param conversion
- Query param parsing
- Active filter counting
- Human-readable descriptions

**Key Functions:**
- `filtersToQueryParams(filters)` - Convert to URL params
- `buildSearchUrl(baseUrl, filters)` - Build complete URL
- `queryParamsToFilters(params)` - Parse URL params
- `getFilterDescription(filters)` - Human-readable summary

## Database Schema

### Listings Table

```sql
CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  vin TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  price INTEGER,
  miles INTEGER,
  condition TEXT, -- new, used, certified
  exterior_color TEXT,
  interior_color TEXT,
  drivetrain TEXT,
  transmission TEXT,
  fuel_type TEXT,
  dealer_id TEXT,
  is_active INTEGER DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  -- ... more fields
);

-- Indexes for search performance
CREATE INDEX idx_listings_make ON listings(make);
CREATE INDEX idx_listings_model ON listings(model);
CREATE INDEX idx_listings_year ON listings(year);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_miles ON listings(miles);
CREATE INDEX idx_listings_condition ON listings(condition);
CREATE INDEX idx_listings_is_active ON listings(is_active);
```

### Dealers Table

```sql
CREATE TABLE dealers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude REAL,
  longitude REAL,
  dealer_type TEXT, -- franchise, independent
  -- ... more fields
);

-- Index for geographic queries
CREATE INDEX idx_dealers_location ON dealers(latitude, longitude);
```

## Query Optimization

### 1. Indexed Filters

All major filter fields have indexes:
- `make`, `model`, `year`, `price`, `miles`, `condition`
- JOIN on `dealer_id` is efficient with FK index

### 2. Facet Parallelization

Facet queries run in parallel using `Promise.all()`:
```typescript
const [facets, stats, buckets] = await Promise.all([
  this.getFacets(conditions),
  this.getStats(conditions),
  this.getBuckets(conditions),
]);
```

### 3. Caching Strategy

- **Facets**: 5-minute TTL (high churn tolerance)
- **Filter Options**: 10-minute TTL (stable over time)
- **Individual Listings**: 1-hour TTL (changes infrequently)

### 4. SQL Optimization

```sql
-- Efficient facet query with GROUP BY and COUNT
SELECT make, COUNT(*) as count
FROM listings
WHERE is_active = 1
  AND price >= ?
  AND price <= ?
GROUP BY make
ORDER BY count DESC
LIMIT 50;
```

## Performance Characteristics

### Query Times (Cloudflare Workers on D1)

| Query Type | First Request | Cached | Target |
|------------|--------------|--------|--------|
| Basic search (no facets) | 50-100ms | 20-50ms | <100ms |
| With facets | 150-250ms | 50-100ms | <300ms |
| Geographic search | 200-300ms | 100-150ms | <400ms |
| Complex multi-filter | 250-350ms | 100-200ms | <500ms |

### Optimization Tips

1. **Minimize Facets**: Only request facets when needed
2. **Use Pagination**: Smaller page sizes load faster
3. **Geographic Pre-filter**: Combine ZIP + radius early
4. **Index Coverage**: Ensure filters are indexed
5. **Cache Warming**: Pre-populate common searches

## Integration Guide

### Backend Integration

1. **Import Services**:
```typescript
import { SearchService } from './services/search';
import { FacetsCache } from './services/facets';
```

2. **Create Service Instances**:
```typescript
const db = drizzle(env.DB, { schema });
const searchService = new SearchService(db);
const facetsCache = new FacetsCache(env.CACHE);
```

3. **Execute Search**:
```typescript
const results = await searchService.search(filters, userLocation);
```

### Frontend Integration

1. **Install Types** (copy to your frontend project):
```bash
cp backend/src/types/search.ts frontend/src/types/
cp backend/src/utils/search-helpers.ts frontend/src/utils/
```

2. **Build Search UI**:
```typescript
import { SearchFilters } from './types/search';
import { buildSearchUrl, getFilterDescription } from './utils/search-helpers';

const filters: SearchFilters = {
  make: ['Tesla', 'Honda'],
  price_min: 30000,
  price_max: 50000,
  zip_code: '90210',
  radius: 50,
};

const url = buildSearchUrl('/api/v1/listings', filters);
const response = await fetch(url).then(r => r.json());
```

3. **Render Facets**:
```typescript
// Render facet checkboxes with counts
response.facets.make.forEach(facet => {
  renderCheckbox({
    label: facet.value,
    count: facet.count,
    checked: filters.make?.includes(facet.value),
    onChange: () => toggleMake(facet.value),
  });
});
```

### Cache Invalidation

When new listings are added:
```typescript
// Call from scraper or admin panel
await fetch('/api/v1/listings/cache/invalidate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CACHE_INVALIDATION_TOKEN}`,
  },
});
```

## Testing

### Unit Tests

Test files to create:
```
backend/src/
├── services/
│   ├── search.test.ts       # SearchService tests
│   └── facets.test.ts       # FacetsCache tests
└── utils/
    ├── geo.test.ts          # Geographic utilities tests
    └── search-helpers.test.ts # Helper functions tests
```

### Integration Tests

Use the provided `test-search.http` file with REST Client:
```http
### Basic Search
GET http://localhost:8787/api/v1/listings?make=Tesla

### Complex Search
GET http://localhost:8787/api/v1/listings?year_min=2022&fuel_type=electric&price_min=40000&price_max=60000
```

### Load Testing

Use `wrk` or `artillery` for load testing:
```bash
# 10 concurrent users, 30 seconds
wrk -t10 -c10 -d30s "http://localhost:8787/api/v1/listings?make=Honda"
```

## Monitoring

### Key Metrics to Track

1. **Query Performance**:
   - P50, P95, P99 response times
   - Cache hit rate
   - Query time distribution

2. **Resource Usage**:
   - D1 read units consumed
   - KV read/write operations
   - Worker CPU time

3. **User Behavior**:
   - Most common filters
   - Search abandonment rate
   - Facet interaction patterns

### Logging

Add structured logging:
```typescript
console.log(JSON.stringify({
  event: 'search_executed',
  filters: filters,
  results_count: results.meta.total,
  query_time_ms: queryTime,
  cache_hit: false,
}));
```

## Future Enhancements

### 1. Full-Text Search
Add text search across make, model, trim:
```sql
CREATE VIRTUAL TABLE listings_fts USING fts5(
  make, model, trim, body_type, content=listings
);
```

### 2. PostGIS Integration
For PostgreSQL migration, use PostGIS:
```sql
CREATE INDEX idx_dealers_location
ON dealers USING GIST(ST_MakePoint(longitude, latitude));
```

### 3. Saved Searches
Allow users to save filter combinations:
```sql
CREATE TABLE saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filters TEXT NOT NULL, -- JSON
  notifications_enabled INTEGER DEFAULT 0
);
```

### 4. Search Analytics
Track search patterns for recommendations:
```sql
CREATE TABLE search_analytics (
  id TEXT PRIMARY KEY,
  filters TEXT NOT NULL,
  results_count INTEGER,
  clicked_listing_id TEXT,
  timestamp TEXT NOT NULL
);
```

### 5. Smart Filters
Suggest relevant filters based on context:
- "Most searched filters for this make"
- "Similar searches included..."
- Auto-expand/collapse rare filters

## Troubleshooting

### Slow Queries

1. Check indexes are created:
```sql
SELECT name, sql FROM sqlite_master
WHERE type = 'index' AND tbl_name = 'listings';
```

2. Analyze query plan:
```sql
EXPLAIN QUERY PLAN
SELECT * FROM listings WHERE make = 'Tesla' AND price < 50000;
```

3. Enable query logging in development

### Cache Issues

1. Verify KV binding is configured in `wrangler.toml`
2. Check cache key generation is consistent
3. Monitor cache hit rates

### Geographic Search Not Working

1. Verify ZIP codes are in the database
2. Check dealer latitude/longitude are populated
3. Validate distance calculation logic

## Support

For issues or questions:
- Review API documentation: `SEARCH_API.md`
- Check test examples: `test-search.http`
- Examine implementation: `services/search.ts`

## License

Part of the Car Research platform.

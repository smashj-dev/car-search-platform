# Migration Guide: Legacy Search to Advanced Search

This guide helps you migrate from the basic search implementation to the new advanced faceted search API.

## What Changed?

### API Endpoints

| Old | New | Status |
|-----|-----|--------|
| `GET /api/v1/listings` | `GET /api/v1/listings` | ✅ Backwards Compatible |
| `GET /api/v1/listings/filters/options` | `GET /api/v1/listings/filters/options` | ✅ Enhanced |

**Good News**: The endpoint paths haven't changed. Your existing queries will continue to work!

## Backwards Compatibility

### Old Query (Still Works)

```bash
GET /api/v1/listings?make=Tesla&model=Model%203&price_max=50000
```

### Response Format

The response format is enhanced but backwards compatible:

**Old Response Structure** (still present):
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 245,
    "total_pages": 10
  }
}
```

**New Fields Added** (optional):
```json
{
  "success": true,
  "data": [...],
  "meta": {...},
  "facets": {...},      // NEW
  "stats": {...},       // NEW
  "buckets": {...},     // NEW
  "performance": {...}  // NEW
}
```

## Migration Steps

### Step 1: No Changes Required (Basic Search)

If you're only using basic search, no changes needed:

```typescript
// This continues to work exactly as before
const response = await fetch('/api/v1/listings?make=Honda');
```

### Step 2: Opt-In to New Features

Add new parameters to enable advanced features:

```typescript
// Enable facets, stats, and buckets (default: true)
const response = await fetch(
  '/api/v1/listings?make=Honda&include_facets=true&include_stats=true'
);

// Access new data
const facets = response.facets;
const stats = response.stats;
```

### Step 3: Update Filter UI (Optional)

Take advantage of multi-select and new filters:

**Before:**
```typescript
// Single make only
fetch('/api/v1/listings?make=Tesla');
```

**After:**
```typescript
// Multiple makes
fetch('/api/v1/listings?make=Tesla,Honda,Toyota');

// Multiple conditions
fetch('/api/v1/listings?condition=new,certified');

// Multiple fuel types
fetch('/api/v1/listings?fuel_type=electric,hybrid');
```

## Common Migration Scenarios

### Scenario 1: Basic Listing Page

**Before:**
```typescript
async function fetchListings(make: string, page: number) {
  const response = await fetch(
    `/api/v1/listings?make=${make}&page=${page}`
  );
  return response.json();
}
```

**After** (no changes required, but you can enhance):
```typescript
async function fetchListings(filters: SearchFilters) {
  const url = buildSearchUrl('/api/v1/listings', filters);
  const response = await fetch(url);
  return response.json();
}

// Usage
const results = await fetchListings({
  make: ['Tesla', 'Honda'], // Now supports multiple
  page: 1,
  per_page: 25,
});
```

### Scenario 2: Filter Sidebar

**Before:**
```typescript
// Hardcoded filter options
const makes = ['Tesla', 'Honda', 'Toyota', 'Ford'];
const conditions = ['new', 'used', 'certified'];
```

**After** (dynamic with counts):
```typescript
// Fetch dynamic filter options with counts
const options = await fetch('/api/v1/listings/filters/options')
  .then(r => r.json());

// Render with counts
options.data.makes.forEach(make => {
  console.log(`${make.value} (${make.count})`);
  // Output: "Tesla (245)"
});
```

### Scenario 3: Search Results

**Before:**
```typescript
interface SearchResponse {
  success: boolean;
  data: Listing[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
```

**After** (enhanced types):
```typescript
import type { SearchResponse } from './types/search';

// SearchResponse now includes:
// - data: ListingWithDealer[] (includes dealer object)
// - facets?: SearchFacets
// - stats?: SearchStats
// - buckets?: SearchBuckets
// - performance?: PerformanceMetrics

function renderResults(response: SearchResponse) {
  // Render listings
  response.data.forEach(listing => {
    console.log(listing.make, listing.model);
    console.log(listing.dealer?.name); // NEW: Dealer info included
  });

  // Render facets (NEW)
  if (response.facets) {
    response.facets.make?.forEach(facet => {
      console.log(`${facet.value}: ${facet.count}`);
    });
  }

  // Show stats (NEW)
  if (response.stats) {
    console.log(`Price range: $${response.stats.price.min} - $${response.stats.price.max}`);
  }
}
```

## New Features to Adopt

### 1. Multi-Select Filters

**Old Way:**
```typescript
// Had to make multiple requests or use OR logic manually
```

**New Way:**
```typescript
const filters: SearchFilters = {
  make: ['Tesla', 'Honda', 'Toyota'],
  fuel_type: ['electric', 'hybrid'],
  condition: ['new', 'certified'],
};
```

### 2. Range Filters

**Old Way:**
```typescript
// Only max filters
fetch('/api/v1/listings?price_max=50000&miles_max=30000');
```

**New Way:**
```typescript
// Both min and max
fetch('/api/v1/listings?price_min=30000&price_max=50000&miles_min=0&miles_max=30000');
```

### 3. Geographic Search

**Old Way:**
```typescript
// Not available
```

**New Way:**
```typescript
fetch('/api/v1/listings?zip_code=90210&radius=50&sort_by=distance');

// Response includes distance
response.data[0].distance; // 5 (miles)
```

### 4. Faceted Navigation

**Old Way:**
```typescript
// Manual counting required
const teslaCount = listings.filter(l => l.make === 'Tesla').length;
```

**New Way:**
```typescript
// Automatic facet counts
response.facets.make.forEach(facet => {
  console.log(`${facet.value}: ${facet.count} vehicles`);
});
```

### 5. Statistics Display

**Old Way:**
```typescript
// Manual calculation
const prices = listings.map(l => l.price);
const minPrice = Math.min(...prices);
const maxPrice = Math.max(...prices);
```

**New Way:**
```typescript
// Automatic statistics
const { min, max, avg, median } = response.stats.price;
console.log(`Price range: $${min} - $${max}`);
console.log(`Average: $${avg}, Median: $${median}`);
```

## Breaking Changes

### None!

There are no breaking changes. All existing queries continue to work.

### Optional Enhancements

These changes are optional but recommended:

1. **Type Definitions**: Import new TypeScript types
2. **Helper Functions**: Use search-helpers.ts utilities
3. **Error Handling**: Handle new error response format
4. **Caching**: Leverage intelligent caching

## Code Examples

### Before: Legacy Implementation

```typescript
// Old search component
function SearchPage() {
  const [make, setMake] = useState('');
  const [priceMax, setPriceMax] = useState(50000);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const url = `/api/v1/listings?make=${make}&price_max=${priceMax}`;
      const response = await fetch(url);
      const json = await response.json();
      setResults(json.data);
    };
    fetchData();
  }, [make, priceMax]);

  return (
    <div>
      <input value={make} onChange={e => setMake(e.target.value)} />
      <input
        type="number"
        value={priceMax}
        onChange={e => setPriceMax(Number(e.target.value))}
      />
      {results.map(listing => (
        <div key={listing.id}>{listing.make} {listing.model}</div>
      ))}
    </div>
  );
}
```

### After: Enhanced Implementation

```typescript
import { buildSearchUrl } from './utils/search-helpers';
import type { SearchFilters, SearchResponse } from './types/search';

function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    make: [],
    price_max: 50000,
    page: 1,
    per_page: 25,
  });
  const [results, setResults] = useState<SearchResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const url = buildSearchUrl('/api/v1/listings', filters);
      const response = await fetch(url);
      const json = await response.json();
      setResults(json);
    };
    fetchData();
  }, [filters]);

  return (
    <div>
      {/* Multi-select make filter */}
      <select
        multiple
        value={filters.make}
        onChange={e => setFilters({
          ...filters,
          make: Array.from(e.target.selectedOptions, option => option.value)
        })}
      >
        {results?.facets?.make?.map(facet => (
          <option key={facet.value} value={facet.value}>
            {facet.value} ({facet.count})
          </option>
        ))}
      </select>

      {/* Price range slider */}
      <input
        type="range"
        min={results?.stats?.price.min}
        max={results?.stats?.price.max}
        value={filters.price_max}
        onChange={e => setFilters({
          ...filters,
          price_max: Number(e.target.value)
        })}
      />

      {/* Results with dealer info */}
      {results?.data.map(listing => (
        <div key={listing.id}>
          <h3>{listing.make} {listing.model}</h3>
          <p>${listing.price?.toLocaleString()}</p>
          {listing.dealer && (
            <p>{listing.dealer.name} - {listing.dealer.city}</p>
          )}
          {listing.distance && <p>{listing.distance} miles away</p>}
        </div>
      ))}
    </div>
  );
}
```

## Performance Considerations

### Old Implementation

- No caching
- Manual filter counting
- Separate queries for filter options

### New Implementation

- Intelligent caching (5-min TTL)
- Automatic facet computation
- Single query for filters and results
- Sub-300ms response times

### Migration Tip

If you're doing client-side filtering, you can now remove that code:

```typescript
// Before: Client-side filtering
const filtered = listings.filter(l =>
  l.make === selectedMake &&
  l.price <= maxPrice
);

// After: Server-side filtering
const url = buildSearchUrl('/api/v1/listings', {
  make: [selectedMake],
  price_max: maxPrice,
});
```

## Testing Your Migration

### 1. Test Existing Queries

```bash
# Your old queries should still work
curl "http://localhost:8787/api/v1/listings?make=Tesla"

# Verify response has data array
```

### 2. Test New Features

```bash
# Try multi-select
curl "http://localhost:8787/api/v1/listings?make=Tesla,Honda"

# Try facets
curl "http://localhost:8787/api/v1/listings?make=Tesla&include_facets=true"

# Try geographic
curl "http://localhost:8787/api/v1/listings?zip_code=90210&radius=50"
```

### 3. Verify Types

```typescript
// Copy types to your project
import type { SearchResponse } from './types/search';

const response: SearchResponse = await fetch('/api/v1/listings')
  .then(r => r.json());

// TypeScript should validate the response structure
```

## Rollback Plan

If you need to rollback:

1. **Frontend Only**: Simply don't use new query parameters
2. **Backend**: Revert the routes/listings.ts file changes
3. **Database**: No schema changes required

The API is designed to be backwards compatible, so rollback should be seamless.

## Getting Help

1. **API Documentation**: See [SEARCH_API.md](./SEARCH_API.md)
2. **Implementation Guide**: See [SEARCH_IMPLEMENTATION.md](./SEARCH_IMPLEMENTATION.md)
3. **Quick Start**: See [SEARCH_QUICKSTART.md](./SEARCH_QUICKSTART.md)
4. **Test Examples**: See [test-search.http](./test-search.http)

## Checklist

Before going live with the new search:

- [ ] Review backwards compatibility guarantees
- [ ] Test existing queries still work
- [ ] Update TypeScript types in frontend
- [ ] Copy search-helpers.ts to frontend
- [ ] Test multi-select filters
- [ ] Test geographic search
- [ ] Verify facet counts are accurate
- [ ] Check response times meet SLA
- [ ] Set up cache invalidation webhook
- [ ] Update frontend UI to use facets
- [ ] Add error handling for new response format
- [ ] Monitor performance metrics

## Timeline Recommendation

### Week 1: Backend Deployment
- Deploy new search API
- Verify backwards compatibility
- Monitor performance

### Week 2: Frontend Gradual Rollout
- Update types and helpers
- A/B test new UI with facets
- Monitor user engagement

### Week 3: Full Rollout
- Enable for all users
- Remove old client-side filtering
- Optimize based on metrics

## Support

For migration assistance:
- Check documentation in backend/ folder
- Review code examples above
- Test with test-search.http file

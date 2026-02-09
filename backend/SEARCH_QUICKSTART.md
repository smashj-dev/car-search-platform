# Advanced Search - Quick Start Guide

Get the advanced search API up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Wrangler CLI installed (`npm install -g wrangler`)
- D1 database created and migrated
- KV namespace bound

## Setup

### 1. Install Dependencies

Already done if you've set up the backend:
```bash
cd backend
npm install
```

### 2. Configure Environment

Ensure `wrangler.toml` has the KV binding:
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

Add optional cache invalidation token:
```bash
wrangler secret put CACHE_INVALIDATION_TOKEN
# Enter: your-secure-token-here
```

### 3. Verify Database Schema

Ensure listings and dealers tables exist:
```bash
wrangler d1 execute DB --command "SELECT COUNT(*) FROM listings;"
wrangler d1 execute DB --command "SELECT COUNT(*) FROM dealers;"
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:8787`

## Quick Test

### 1. Basic Search

```bash
curl "http://localhost:8787/api/v1/listings?make=Tesla&per_page=10"
```

### 2. Filter Options

```bash
curl "http://localhost:8787/api/v1/listings/filters/options"
```

### 3. Advanced Search

```bash
curl "http://localhost:8787/api/v1/listings?make=Honda&model=Civic&price_min=20000&price_max=30000&condition=new,used&sort_by=price"
```

## Example Responses

### Basic Search Response

```json
{
  "success": true,
  "data": [
    {
      "id": "listing-123",
      "vin": "5YJ3E1EA1JF000001",
      "year": 2024,
      "make": "Tesla",
      "model": "Model 3",
      "price": 42990,
      "miles": 150,
      "condition": "new",
      "dealer": {
        "name": "Tesla Downtown",
        "city": "Los Angeles",
        "state": "CA"
      }
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 245,
    "total_pages": 25
  },
  "facets": {
    "make": [
      { "value": "Tesla", "count": 245 },
      { "value": "Honda", "count": 189 }
    ]
  },
  "stats": {
    "price": {
      "min": 15000,
      "max": 95000,
      "avg": 42500,
      "median": 38000
    }
  },
  "performance": {
    "query_time_ms": 145,
    "cached_facets": false
  }
}
```

## Common Use Cases

### 1. Find Electric Vehicles Under $50k

```bash
curl "http://localhost:8787/api/v1/listings?fuel_type=electric&price_max=50000"
```

### 2. Search Near ZIP Code

```bash
curl "http://localhost:8787/api/v1/listings?zip_code=90210&radius=25&sort_by=distance"
```

### 3. Multiple Makes and Models

```bash
curl "http://localhost:8787/api/v1/listings?make=Tesla,Honda&model=Model%203,Civic"
```

### 4. Low Mileage Certified

```bash
curl "http://localhost:8787/api/v1/listings?condition=certified&miles_max=20000"
```

### 5. Year Range

```bash
curl "http://localhost:8787/api/v1/listings?year_min=2022&year_max=2024"
```

## Frontend Integration

### React Example

```tsx
import { useState, useEffect } from 'react';
import { buildSearchUrl } from './utils/search-helpers';
import type { SearchFilters, SearchResponse } from './types/search';

function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    page: 1,
    per_page: 25,
    sort_by: 'price',
    sort_order: 'asc',
  });

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const url = buildSearchUrl('/api/v1/listings', filters);
      const response = await fetch(url).then(r => r.json());
      setResults(response);
      setLoading(false);
    };

    fetchResults();
  }, [filters]);

  return (
    <div>
      {/* Filter UI */}
      <div>
        <select onChange={(e) => setFilters({ ...filters, make: [e.target.value] })}>
          <option value="">All Makes</option>
          {results?.facets?.make?.map(facet => (
            <option key={facet.value} value={facet.value}>
              {facet.value} ({facet.count})
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          results?.data.map(listing => (
            <div key={listing.id}>
              <h3>{listing.year} {listing.make} {listing.model}</h3>
              <p>${listing.price?.toLocaleString()}</p>
              <p>{listing.miles?.toLocaleString()} miles</p>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div>
        <button
          disabled={filters.page === 1}
          onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
        >
          Previous
        </button>
        <span>Page {results?.meta.page} of {results?.meta.total_pages}</span>
        <button
          disabled={filters.page === results?.meta.total_pages}
          onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Vue Example

```vue
<template>
  <div>
    <div class="filters">
      <select v-model="filters.make" multiple>
        <option v-for="facet in results?.facets?.make" :key="facet.value" :value="facet.value">
          {{ facet.value }} ({{ facet.count }})
        </option>
      </select>
    </div>

    <div class="results">
      <div v-if="loading">Loading...</div>
      <div v-else v-for="listing in results?.data" :key="listing.id" class="listing">
        <h3>{{ listing.year }} {{ listing.make }} {{ listing.model }}</h3>
        <p>${{ listing.price?.toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { buildSearchUrl } from './utils/search-helpers';
import type { SearchFilters, SearchResponse } from './types/search';

const filters = ref<SearchFilters>({
  page: 1,
  per_page: 25,
});

const results = ref<SearchResponse | null>(null);
const loading = ref(false);

watch(filters, async () => {
  loading.value = true;
  const url = buildSearchUrl('/api/v1/listings', filters.value);
  results.value = await fetch(url).then(r => r.json());
  loading.value = false;
}, { deep: true });
</script>
```

## Testing with REST Client

If you use VS Code, install the REST Client extension and open `test-search.http`:

```http
### Basic Search
GET http://localhost:8787/api/v1/listings?make=Tesla

### Click "Send Request" above the line
```

## Debugging

### Enable Verbose Logging

Add to your search route:
```typescript
console.log('Search filters:', JSON.stringify(filters, null, 2));
console.log('Query time:', queryTime, 'ms');
console.log('Results count:', results.data.length);
```

### Check D1 Query Performance

```bash
wrangler d1 execute DB --command "EXPLAIN QUERY PLAN SELECT * FROM listings WHERE make = 'Tesla';"
```

### Verify Cache

Check if KV is storing facets:
```bash
wrangler kv:key list --binding CACHE
```

## Performance Tips

1. **Start Small**: Request 10-25 results initially
2. **Disable Facets**: Use `include_facets=false` when not needed
3. **Use Pagination**: Don't load all results at once
4. **Cache on Frontend**: Store filter options in local state
5. **Debounce Searches**: Wait for user to finish typing

## Next Steps

1. Read full API docs: [SEARCH_API.md](./SEARCH_API.md)
2. Review implementation: [SEARCH_IMPLEMENTATION.md](./SEARCH_IMPLEMENTATION.md)
3. Explore test cases: [test-search.http](./test-search.http)
4. Build your UI components
5. Add analytics tracking

## Common Issues

### "No results found"

- Check if listings table has data: `wrangler d1 execute DB --command "SELECT COUNT(*) FROM listings;"`
- Verify filters aren't too restrictive
- Check spelling of make/model names

### "Cache not working"

- Verify KV namespace is bound in `wrangler.toml`
- Check namespace ID is correct
- Ensure cache invalidation isn't running too frequently

### "Slow queries"

- Add indexes to frequently filtered columns
- Reduce number of facets requested
- Use smaller `per_page` values
- Enable facet caching

## Support

- API Documentation: [SEARCH_API.md](./SEARCH_API.md)
- Implementation Guide: [SEARCH_IMPLEMENTATION.md](./SEARCH_IMPLEMENTATION.md)
- GitHub Issues: Create issue with `[search]` prefix

## Example Project Structure

```
your-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchFilters.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   └── FacetList.tsx
│   │   ├── types/
│   │   │   └── search.ts           # Copy from backend
│   │   └── utils/
│   │       └── search-helpers.ts   # Copy from backend
│   └── package.json
└── backend/
    ├── src/
    │   ├── routes/
    │   │   └── listings.ts
    │   ├── services/
    │   │   ├── search.ts
    │   │   └── facets.ts
    │   └── utils/
    │       ├── geo.ts
    │       └── search-helpers.ts
    └── wrangler.toml
```

Happy searching!

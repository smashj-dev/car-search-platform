# Advanced Search API Documentation

## Overview

The Car Research platform provides a powerful faceted search API with advanced filtering, range buckets, geographic search, and comprehensive statistics. This API is optimized for sub-300ms response times and includes intelligent caching.

## Base Endpoint

```
GET /api/v1/listings
```

## Features

- **Faceted Search**: Dynamic filter counts that update based on current search criteria
- **Multi-Select Filters**: Apply multiple values for make, model, color, etc.
- **Range Filters**: Price, mileage, and year ranges with min/max
- **Geographic Search**: ZIP code + radius filtering with distance sorting
- **Smart Caching**: 5-minute TTL on facets, 10-minute on filter options
- **Range Buckets**: Pre-calculated buckets for price, mileage, and year
- **Comprehensive Stats**: Min, max, average, and median for numeric fields
- **Fast Performance**: Optimized SQL queries with proper indexing

## Query Parameters

### Basic Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `make` | string | Comma-separated makes | `Tesla,Honda,Toyota` |
| `model` | string | Comma-separated models | `Model 3,Civic,Camry` |
| `trim` | string | Comma-separated trims | `Limited,Premium,Sport` |

### Range Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `year_min` | number | Minimum year | `2020` |
| `year_max` | number | Maximum year | `2024` |
| `price_min` | number | Minimum price in dollars | `20000` |
| `price_max` | number | Maximum price in dollars | `50000` |
| `miles_min` | number | Minimum mileage | `0` |
| `miles_max` | number | Maximum mileage | `30000` |

### Condition Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `condition` | string | Comma-separated conditions | `new,certified` |
| `is_certified` | boolean | Certified pre-owned only | `true` |

### Specification Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `exterior_color` | string | Comma-separated colors | `Black,White,Red` |
| `interior_color` | string | Comma-separated colors | `Black,Tan` |
| `drivetrain` | string | Comma-separated drivetrains | `awd,4wd` |
| `transmission` | string | Comma-separated transmissions | `automatic,manual` |
| `fuel_type` | string | Comma-separated fuel types | `electric,hybrid` |

### Dealer Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `dealer_type` | string | Comma-separated dealer types | `franchise,independent` |

### Geographic Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `zip_code` | string | ZIP code for location search | `90210` |
| `radius` | number | Radius in miles (default: 100) | `50` |

### Pagination & Sorting

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `2` |
| `per_page` | number | Results per page (default: 25, max: 100) | `50` |
| `sort_by` | string | Sort field | `price`, `miles`, `year`, `days_on_lot`, `distance` |
| `sort_order` | string | Sort order (default: `asc`) | `asc`, `desc` |

### Feature Flags

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `include_facets` | boolean | Include facet counts (default: true) | `true` |
| `include_stats` | boolean | Include statistics (default: true) | `true` |
| `include_buckets` | boolean | Include range buckets (default: true) | `true` |

## Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "listing-123",
      "vin": "1HGBH41JXMN109186",
      "year": 2024,
      "make": "Tesla",
      "model": "Model 3",
      "trim": "Long Range",
      "price": 42990,
      "miles": 150,
      "condition": "new",
      "exterior_color": "Pearl White Multi-Coat",
      "interior_color": "Black",
      "drivetrain": "awd",
      "transmission": "automatic",
      "fuel_type": "electric",
      "dealer": {
        "id": "dealer-456",
        "name": "Tesla of Beverly Hills",
        "dealer_type": "franchise",
        "city": "Beverly Hills",
        "state": "CA",
        "zip_code": "90210"
      },
      "distance": 5
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 245,
    "total_pages": 10
  },
  "facets": {
    "make": [
      { "value": "Tesla", "count": 245 },
      { "value": "Honda", "count": 189 },
      { "value": "Toyota", "count": 167 }
    ],
    "model": [
      { "value": "Model 3", "count": 156 },
      { "value": "Civic", "count": 142 },
      { "value": "Camry", "count": 134 }
    ],
    "year": [
      { "value": 2024, "count": 423 },
      { "value": 2023, "count": 389 },
      { "value": 2022, "count": 267 }
    ],
    "condition": [
      { "value": "new", "count": 567 },
      { "value": "used", "count": 342 },
      { "value": "certified", "count": 156 }
    ],
    "exterior_color": [
      { "value": "Black", "count": 234 },
      { "value": "White", "count": 198 },
      { "value": "Gray", "count": 145 }
    ],
    "drivetrain": [
      { "value": "awd", "count": 456 },
      { "value": "fwd", "count": 234 },
      { "value": "rwd", "count": 123 }
    ],
    "transmission": [
      { "value": "automatic", "count": 987 },
      { "value": "manual", "count": 45 }
    ],
    "fuel_type": [
      { "value": "gas", "count": 678 },
      { "value": "electric", "count": 245 },
      { "value": "hybrid", "count": 123 }
    ],
    "dealer_type": [
      { "value": "franchise", "count": 756 },
      { "value": "independent", "count": 289 }
    ]
  },
  "stats": {
    "price": {
      "min": 15000,
      "max": 95000,
      "avg": 42500,
      "median": 38000
    },
    "miles": {
      "min": 500,
      "max": 85000,
      "avg": 24500
    },
    "year": {
      "min": 2018,
      "max": 2024
    }
  },
  "buckets": {
    "price": [
      { "label": "Under $20k", "count": 45 },
      { "label": "$20k-$30k", "count": 123 },
      { "label": "$30k-$40k", "count": 234 },
      { "label": "$40k-$50k", "count": 189 },
      { "label": "$50k+", "count": 167 }
    ],
    "miles": [
      { "label": "Under 10k", "count": 234 },
      { "label": "10k-25k", "count": 189 },
      { "label": "25k-50k", "count": 156 },
      { "label": "50k-75k", "count": 89 },
      { "label": "75k+", "count": 45 }
    ],
    "year": [
      { "label": "2024", "count": 423 },
      { "label": "2023", "count": 389 },
      { "label": "2022", "count": 267 },
      { "label": "2021", "count": 178 },
      { "label": "2020 and older", "count": 89 }
    ]
  },
  "performance": {
    "query_time_ms": 145,
    "cached_facets": false
  }
}
```

## Example Queries

### Basic Search

Find all Tesla Model 3s:
```
GET /api/v1/listings?make=Tesla&model=Model%203
```

### Price Range Search

Find electric vehicles under $50k:
```
GET /api/v1/listings?fuel_type=electric&price_max=50000
```

### Multi-Filter Search

Find new or certified AWD SUVs with low mileage:
```
GET /api/v1/listings?condition=new,certified&drivetrain=awd&miles_max=10000
```

### Geographic Search

Find cars within 50 miles of ZIP 90210:
```
GET /api/v1/listings?zip_code=90210&radius=50&sort_by=distance
```

### Complex Search

Find 2022+ electric vehicles, priced $40k-$60k, within 25 miles, sorted by price:
```
GET /api/v1/listings?year_min=2022&fuel_type=electric&price_min=40000&price_max=60000&zip_code=90210&radius=25&sort_by=price&sort_order=asc
```

### Search with Minimal Response

Get listings without facets/stats (faster):
```
GET /api/v1/listings?make=Honda&include_facets=false&include_stats=false&include_buckets=false
```

## Filter Options Endpoint

Get available filter options with counts:

```
GET /api/v1/listings/filters/options
```

### Response

```json
{
  "success": true,
  "data": {
    "makes": [
      { "value": "Tesla", "count": 245 },
      { "value": "Honda", "count": 189 }
    ],
    "conditions": [
      { "value": "new", "count": 567 },
      { "value": "used", "count": 342 }
    ],
    "drivetrains": [
      { "value": "awd", "count": 456 },
      { "value": "fwd", "count": 234 }
    ],
    "transmissions": [
      { "value": "automatic", "count": 987 },
      { "value": "manual", "count": 45 }
    ],
    "fuel_types": [
      { "value": "gas", "count": 678 },
      { "value": "electric", "count": 245 }
    ],
    "dealer_types": [
      { "value": "franchise", "count": 756 },
      { "value": "independent", "count": 289 }
    ],
    "ranges": {
      "year": { "min": 2018, "max": 2024 },
      "price": { "min": 15000, "max": 95000 },
      "miles": { "min": 500, "max": 85000 }
    }
  },
  "source": "cache"
}
```

## Cache Invalidation

When new listings are added, invalidate the cache:

```
POST /api/v1/listings/cache/invalidate
Authorization: Bearer YOUR_CACHE_INVALIDATION_TOKEN
```

### Response

```json
{
  "success": true,
  "message": "Cache invalidated successfully"
}
```

## Performance Characteristics

- **Query Time**: < 300ms for most searches
- **With Facets**: 150-250ms (first request), 50-100ms (cached)
- **Without Facets**: 50-150ms
- **Cache TTL**:
  - Facets: 5 minutes
  - Filter Options: 10 minutes
  - Individual Listings: 1 hour

## Optimization Tips

1. **Use Multi-Select**: Combine filters in a single request instead of multiple requests
2. **Disable Facets**: If you don't need them, set `include_facets=false` for faster responses
3. **Smaller Page Size**: Use `per_page=10` for initial loads, then paginate
4. **Geographic Bounding**: Combine `zip_code` + `radius` before other filters
5. **Sort by Indexed Fields**: `price`, `miles`, `year` are indexed and sort faster

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": "year_min must be a number"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "SEARCH_ERROR",
    "message": "Failed to execute search",
    "details": "Database connection error"
  }
}
```

## Implementation Notes

### Geographic Search

The geographic search uses the Haversine formula for distance calculation. For better performance with large datasets, consider:

1. Adding bounding box pre-filtering in SQL
2. Using PostGIS if migrating to PostgreSQL
3. Caching common ZIP code coordinates

### Facet Computation

Facets are computed dynamically based on the current filter set. This provides accurate "faceted navigation" where users can see how many results each filter option will yield.

### Distance Sorting

When sorting by distance, the application layer computes distances after the database query. For large result sets, this may require optimization.

## Frontend Integration Example

```typescript
// Build query string from filter state
const buildSearchUrl = (filters: SearchFilters) => {
  const params = new URLSearchParams();

  if (filters.make?.length) params.set('make', filters.make.join(','));
  if (filters.model?.length) params.set('model', filters.model.join(','));
  if (filters.priceMin) params.set('price_min', filters.priceMin.toString());
  if (filters.priceMax) params.set('price_max', filters.priceMax.toString());
  if (filters.zipCode) params.set('zip_code', filters.zipCode);
  if (filters.radius) params.set('radius', filters.radius.toString());

  params.set('page', filters.page.toString());
  params.set('per_page', '25');
  params.set('sort_by', filters.sortBy);
  params.set('sort_order', filters.sortOrder);

  return `/api/v1/listings?${params.toString()}`;
};

// Fetch results
const searchResults = await fetch(buildSearchUrl(filters))
  .then(res => res.json());

// Update UI with facets
searchResults.facets.make.forEach(facet => {
  renderFacetCheckbox(facet.value, facet.count);
});
```

## Migration from Legacy Search

If you have existing code using the old search endpoint, update as follows:

**Old:**
```
GET /api/v1/listings?make=Tesla&model=Model%203&miles_max=30000
```

**New:**
```
GET /api/v1/listings?make=Tesla&model=Model%203&miles_max=30000&include_facets=true
```

The API is backwards compatible. The main difference is the enhanced response format with facets, stats, and buckets.

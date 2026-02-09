# Analytics API Quick Reference

## Endpoints

### 1. Listing Deal Analysis
```
GET /api/v1/listings/:vin/insights
```

**Example:**
```bash
curl http://localhost:8787/api/v1/listings/1HGCM82633A004352/insights
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dealScore": {
      "score": 8.5,
      "grade": "exceptional",
      "reasoning": ["Price is 15.2% below market average", "..."]
    },
    "priceComparison": "$3,200 below market average",
    "daysOnLot": 65
  }
}
```

### 2. Market Trends
```
GET /api/v1/market/trends?make={make}&model={model}&year={year}
```

**Example:**
```bash
curl "http://localhost:8787/api/v1/market/trends?make=Tesla&model=Model%203&year=2024"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "averagePrice": 42350,
      "activeListings": 156
    },
    "priceTrend": "decreasing"
  }
}
```

### 3. Dashboard Analytics
```
GET /api/v1/market/analytics
```

**Example:**
```bash
curl http://localhost:8787/api/v1/market/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalActiveListings": 12543,
      "averageDaysOnMarket": 38
    },
    "topMakes": [...],
    "priceDistribution": [...]
  }
}
```

### 4. Market Overview (Light)
```
GET /api/v1/market/overview
```

**Example:**
```bash
curl http://localhost:8787/api/v1/market/overview
```

## Deal Score Grades

| Grade | Score | Meaning |
|-------|-------|---------|
| exceptional | 8.5-10 | Outstanding deal, strong buy |
| great | 7.0-8.4 | Very good value |
| good | 5.5-6.9 | Fair market value |
| fair | 4.0-5.4 | Slightly above market |
| below_average | 1.0-3.9 | Poor value |

## Caching

| Endpoint | TTL | Cache Key |
|----------|-----|-----------|
| Listing Insights | 30 min | `insights:{vin}` |
| Market Trends | 1 hour | `trends:{make}:{model}:{year}` |
| Dashboard Analytics | 15 min | `analytics:dashboard` |

## Frontend Integration

```typescript
// React Hook
function useListingInsights(vin: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/listings/${vin}/insights`)
      .then(r => r.json())
      .then(({ data }) => setData(data));
  }, [vin]);

  return data;
}

// Usage
function ListingCard({ vin }) {
  const insights = useListingInsights(vin);

  return (
    <div>
      <h2>Deal Score: {insights?.dealScore.score}/10</h2>
      <span>{insights?.dealScore.grade}</span>
      <p>{insights?.priceComparison}</p>
    </div>
  );
}
```

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| NOT_FOUND | 404 | Listing or market data not found |
| INTERNAL_ERROR | 500 | Server error |

## Testing

Run algorithm tests:
```bash
npx tsx src/test-analytics.ts
```

## Documentation

- Full API Docs: `ANALYTICS_API.md`
- Implementation: `ANALYTICS_IMPLEMENTATION_SUMMARY.md`
- Usage Examples: `examples/analytics-usage.ts`

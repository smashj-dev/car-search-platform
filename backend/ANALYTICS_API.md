# Price Analytics and Market Insights API

Comprehensive analytics endpoints for vehicle listings with deal scoring, market trends, and dashboard analytics.

## Endpoints

### 1. Listing Insights

**GET** `/api/v1/listings/:vin/insights`

Returns comprehensive deal analysis for a specific listing.

#### Response

```json
{
  "success": true,
  "data": {
    "vin": "1HGCM82633A004352",
    "dealScore": {
      "score": 8.5,
      "grade": "exceptional",
      "breakdown": {
        "priceScore": 9.2,
        "mileageScore": 7.8,
        "daysOnLotScore": 8.0,
        "priceDropScore": 10.0,
        "msrpScore": 9.5
      },
      "reasoning": [
        "Price is 15.2% below market average",
        "Lower mileage than average (12.3% below)",
        "On lot for 65 days - dealer may be motivated",
        "Price dropped 2 times",
        "18.5% discount from MSRP"
      ]
    },
    "marketPosition": "below_average",
    "priceComparison": "$3,200 below market average",
    "daysOnLot": 65,
    "priceHistory": {
      "totalDrops": 2,
      "totalIncrease": 0,
      "firstPrice": 28995,
      "currentPrice": 25795,
      "biggestDrop": -2000,
      "mostRecentChange": {
        "amount": -1200,
        "date": "2026-01-25T10:30:00Z"
      }
    },
    "msrpComparison": {
      "baseMsrp": 29800,
      "combinedMsrp": 31650,
      "currentPrice": 25795,
      "discountAmount": 5855,
      "discountPercent": 18.5
    },
    "marketStats": {
      "averagePrice": 28995,
      "averageMiles": 42300,
      "sampleSize": 47
    }
  }
}
```

#### Deal Score Grades

- **exceptional** (8.5-10): Outstanding deal, strong buy signal
- **great** (7.0-8.4): Very good value
- **good** (5.5-6.9): Fair market value
- **fair** (4.0-5.4): Slightly above market
- **below_average** (1.0-3.9): Poor value

#### Score Calculation Factors

1. **Price vs Market** (40% weight)
   - Compares price to similar vehicles (same make/model/year ±1)
   - Below market = higher score

2. **Mileage vs Market** (20% weight)
   - Compares mileage to similar vehicles
   - Lower mileage = higher score

3. **Days on Lot** (15% weight)
   - 0-14 days: 4 points (fresh)
   - 15-30 days: 6 points (normal)
   - 31-60 days: 8 points (good)
   - 61+ days: 10 points (excellent - dealer motivated)

4. **Price Drops** (15% weight)
   - Number of price reductions
   - Amount of recent drops
   - Recent large drops = motivated seller

5. **MSRP Discount** (10% weight, if available)
   - Percentage off MSRP
   - 20%+ discount = excellent

#### Caching

- Cached for 30 minutes
- Cache key: `insights:{vin}`

---

### 2. Market Trends

**GET** `/api/v1/market/trends`

Returns market trends and statistics for a specific vehicle.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| make | string | Yes | Vehicle make (e.g., "Tesla") |
| model | string | Yes | Vehicle model (e.g., "Model 3") |
| year | number | No | Vehicle year (filters to specific year) |

#### Example Request

```
GET /api/v1/market/trends?make=Tesla&model=Model%203&year=2024
```

#### Response

```json
{
  "success": true,
  "data": {
    "make": "Tesla",
    "model": "Model 3",
    "year": 2024,
    "stats": {
      "averagePrice": 42350,
      "priceRange": {
        "min": 35900,
        "max": 52000,
        "median": 41500
      },
      "averageMileage": 8500,
      "mileageRange": {
        "min": 1200,
        "max": 25000,
        "median": 7800
      },
      "daysOnMarket": {
        "average": 32,
        "median": 28
      },
      "activeListings": 156
    },
    "priceTrend": "decreasing",
    "trendDetails": {
      "changePercent": -7.2,
      "changeAmount": -3200
    }
  }
}
```

#### Price Trends

- **increasing**: Prices rising over last 30 days (>5% increase)
- **decreasing**: Prices falling over last 30 days (>5% decrease)
- **stable**: Prices relatively flat (±5%)

#### Caching

- Cached for 1 hour
- Cache key: `trends:{make}:{model}:{year}`

---

### 3. Dashboard Analytics

**GET** `/api/v1/market/analytics`

Returns aggregate analytics across all active listings.

#### Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalActiveListings": 12543,
      "averageDaysOnMarket": 38,
      "totalListingValue": 425847300
    },
    "topMakes": [
      {
        "make": "Tesla",
        "count": 1247,
        "averagePrice": 45200
      },
      {
        "make": "Toyota",
        "count": 1156,
        "averagePrice": 32100
      }
    ],
    "topModels": [
      {
        "make": "Tesla",
        "model": "Model 3",
        "count": 687,
        "averagePrice": 42300
      },
      {
        "make": "Toyota",
        "model": "RAV4",
        "count": 542,
        "averagePrice": 35800
      }
    ],
    "priceDistribution": [
      {
        "segment": "Under $20k",
        "count": 2145,
        "percentage": 17.1
      },
      {
        "segment": "$20k - $40k",
        "count": 5234,
        "percentage": 41.7
      },
      {
        "segment": "$40k - $60k",
        "count": 3456,
        "percentage": 27.5
      },
      {
        "segment": "$60k - $80k",
        "count": 1234,
        "percentage": 9.8
      },
      {
        "segment": "$80k+",
        "count": 474,
        "percentage": 3.8
      }
    ],
    "conditionBreakdown": [
      {
        "condition": "used",
        "count": 9234,
        "averagePrice": 32400
      },
      {
        "condition": "new",
        "count": 2145,
        "averagePrice": 48700
      },
      {
        "condition": "certified",
        "count": 1164,
        "averagePrice": 36900
      }
    ]
  }
}
```

#### Caching

- Cached for 15 minutes
- Cache key: `analytics:dashboard`

---

### 4. Market Overview (Light)

**GET** `/api/v1/market/overview`

Returns a lightweight version of dashboard analytics for quick loading.

#### Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalActiveListings": 12543,
      "averageDaysOnMarket": 38,
      "totalListingValue": 425847300
    },
    "topMakes": [
      {
        "make": "Tesla",
        "count": 1247,
        "averagePrice": 45200
      }
    ],
    "priceDistribution": [
      {
        "segment": "Under $20k",
        "count": 2145,
        "percentage": 17.1
      }
    ]
  }
}
```

---

## Error Responses

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Listing not found or inactive"
  }
}
```

### 500 Internal Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to calculate insights"
  }
}
```

---

## Usage Examples

### Get Deal Analysis for a Listing

```javascript
const response = await fetch('/api/v1/listings/1HGCM82633A004352/insights');
const { data } = await response.json();

console.log(`Deal Score: ${data.dealScore.score}/10`);
console.log(`Grade: ${data.dealScore.grade}`);
console.log(`Market Position: ${data.priceComparison}`);
console.log(`Days on Lot: ${data.daysOnLot}`);
```

### Check Market Trends

```javascript
const response = await fetch('/api/v1/market/trends?make=Tesla&model=Model%203');
const { data } = await response.json();

console.log(`Average Price: $${data.stats.averagePrice.toLocaleString()}`);
console.log(`Price Trend: ${data.priceTrend}`);
console.log(`Active Listings: ${data.stats.activeListings}`);
```

### Get Dashboard Analytics

```javascript
const response = await fetch('/api/v1/market/analytics');
const { data } = await response.json();

console.log(`Total Listings: ${data.overview.totalActiveListings}`);
console.log(`Top Make: ${data.topMakes[0].make}`);
console.log(`Most Popular: ${data.topModels[0].make} ${data.topModels[0].model}`);
```

---

## Performance Notes

1. **Caching Strategy**
   - Listing insights: 30 minutes (frequently viewed, changes slowly)
   - Market trends: 1 hour (aggregate data, less volatile)
   - Dashboard analytics: 15 minutes (global stats, needs freshness)

2. **Query Optimization**
   - Market stats use indexed queries on make/model/year
   - Price history queries limited to relevant timeframes
   - Dashboard uses aggregated SQL for performance

3. **Sample Sizes**
   - Market comparisons require minimum 3 similar vehicles
   - Returns sampleSize in response for transparency
   - Trends require 30+ days of price history data

---

## Implementation Details

### Files Created

1. **`src/utils/deal-score.ts`**
   - Deal scoring algorithm
   - Market position calculator
   - Price formatting utilities

2. **`src/services/analytics.ts`**
   - Core analytics logic
   - Database queries
   - Caching layer

3. **`src/routes/listing-insights.ts`**
   - Listing insights endpoint

4. **`src/routes/market.ts`**
   - Market trends endpoint
   - Dashboard analytics endpoint
   - Market overview endpoint

5. **`src/db/schema.ts`** (updated)
   - Added `cars` and `carInsights` tables for enthusiast data

6. **`src/index.ts`** (updated)
   - Mounted new routes

### Testing

Run the test script to verify the deal score algorithm:

```bash
npx tsx src/test-analytics.ts
```

This tests various scenarios:
- Exceptional deals (below market, low miles, long time on lot)
- Average deals (near market value)
- Poor deals (above market, high miles)
- Price drop scenarios

---

## Future Enhancements

1. **Predictive Analytics**
   - ML model to predict future price drops
   - Optimal buying time recommendations

2. **Comparison Tools**
   - Side-by-side listing comparisons
   - Best deals in market segment

3. **Alerts**
   - Price drop notifications
   - New exceptional deals alerts
   - Market trend changes

4. **Historical Data**
   - Price trends over 6-12 months
   - Seasonal patterns
   - Depreciation curves

5. **Location-Based Insights**
   - Regional price differences
   - Shipping cost calculations
   - Local market trends

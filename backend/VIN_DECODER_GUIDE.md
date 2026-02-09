# VIN Decoder Integration Guide

## Overview

This guide explains how to use the NHTSA vPIC API integration for VIN decoding and vehicle data enrichment.

## Features

1. **VIN Validation** - Format validation and check digit verification
2. **VIN Decoding** - Decode VINs using NHTSA vPIC API
3. **Data Enrichment** - Auto-fill missing vehicle specifications
4. **Batch Processing** - Process multiple VINs with rate limiting
5. **Auto-Enrichment** - Automatically enrich new listings from scraper
6. **KV Caching** - Cache decoded VIN data (VINs never change)

## API Endpoints

### 1. Validate VIN

**Endpoint:** `GET /api/v1/vin/validate/:vin`

Validates VIN format, check digit, and returns basic VIN info.

```bash
# Example
curl https://api.carsearch.app/api/v1/vin/validate/1HGBH41JXMN109186

# Response
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "vin": "1HGBH41JXMN109186",
    "basics": {
      "wmi": "1HG",
      "vds": "BH41JX",
      "vis": "MN109186",
      "modelYear": 2021,
      "plantCode": "N",
      "sequentialNumber": "109186"
    }
  }
}
```

### 2. Decode VIN

**Endpoint:** `GET /api/v1/vin/decode/:vin`

Decodes VIN using NHTSA API and returns full vehicle specifications.

```bash
# Example
curl https://api.carsearch.app/api/v1/vin/decode/1HGBH41JXMN109186

# Response
{
  "success": true,
  "data": {
    "vin": "1HGBH41JXMN109186",
    "make": "Honda",
    "model": "Accord",
    "year": 2021,
    "trim": "Sport",
    "bodyType": "Sedan",
    "engine": "1.5L 4-Cylinder Turbocharged",
    "engineCylinders": 4,
    "engineDisplacementL": 1.5,
    "transmission": "CVT",
    "drivetrain": "FWD",
    "fuelType": "Gasoline",
    "msrp": 26270,
    "doors": 4,
    "seatingCapacity": 5,
    "vehicleType": "Passenger Car",
    "plantCountry": "United States",
    "manufacturer": "Honda Motor Company"
  },
  "meta": {
    "source": "api"  // or "cache" if from KV
  }
}
```

### 3. Decode Listing VIN

**Endpoint:** `GET /api/v1/vin/listing/:vin/decode`

Decodes VIN and compares with existing listing data to identify discrepancies and enrichment opportunities.

```bash
# Example
curl https://api.carsearch.app/api/v1/vin/listing/1HGBH41JXMN109186/decode

# Response
{
  "success": true,
  "data": {
    "listing": {
      "vin": "1HGBH41JXMN109186",
      "year": 2021,
      "make": "Honda",
      "model": "Accord",
      "trim": "Sport"
    },
    "decodedVIN": { /* Full VIN data */ },
    "comparisons": [
      {
        "field": "make",
        "scrapedValue": "Honda",
        "vinValue": "Honda",
        "matches": true
      },
      {
        "field": "model",
        "scrapedValue": "Accord",
        "vinValue": "Accord",
        "matches": true
      },
      {
        "field": "year",
        "scrapedValue": 2021,
        "vinValue": 2021,
        "matches": true
      }
    ],
    "enrichmentPlan": [
      {
        "field": "engine",
        "currentValue": null,
        "newValue": "1.5L 4-Cylinder Turbocharged",
        "shouldEnrich": true,
        "reason": "Missing data - will fill"
      },
      {
        "field": "transmission",
        "currentValue": null,
        "newValue": "CVT",
        "shouldEnrich": true,
        "reason": "Missing data - will fill"
      }
    ]
  },
  "meta": {
    "source": "cache"
  }
}
```

### 4. Enrich Listing

**Endpoint:** `POST /api/v1/vin/listing/:vin/enrich`

Enriches a listing by filling missing fields with VIN decoded data.

```bash
# Example
curl -X POST https://api.carsearch.app/api/v1/vin/listing/1HGBH41JXMN109186/enrich

# Response
{
  "success": true,
  "message": "Enriched 6 field(s)",
  "data": {
    "enrichedFields": 6,
    "updates": {
      "engine": "1.5L 4-Cylinder Turbocharged",
      "transmission": "CVT",
      "drivetrain": "FWD",
      "fuelType": "Gasoline",
      "cylinders": 4,
      "doors": 4
    }
  }
}
```

### 5. Batch Decode VINs

**Endpoint:** `POST /api/v1/vin/batch-decode`

Decodes multiple VINs with rate limiting.

```bash
# Example
curl -X POST https://api.carsearch.app/api/v1/vin/batch-decode \
  -H "Content-Type: application/json" \
  -d '{
    "vins": [
      "1HGBH41JXMN109186",
      "5YJSA1E26HF123456",
      "1FTFW1E84MFA00001"
    ]
  }'

# Response
{
  "success": true,
  "data": [
    {
      "vin": "1HGBH41JXMN109186",
      "success": true,
      "data": { /* VIN data */ }
    },
    {
      "vin": "5YJSA1E26HF123456",
      "success": true,
      "data": { /* VIN data */ }
    },
    {
      "vin": "1FTFW1E84MFA00001",
      "success": false,
      "error": {
        "code": "INVALID_VIN",
        "message": "VIN check digit validation failed"
      }
    }
  ],
  "meta": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

### 6. Admin: Batch Decode All Listings

**Endpoint:** `POST /api/v1/admin/decode-vins`

Processes all listings with missing specs and enriches them with VIN data.

```bash
# Example
curl -X POST https://api.carsearch.app/api/v1/admin/decode-vins \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "delayBetweenBatchesMs": 2000,
    "delayBetweenRequestsMs": 500,
    "dryRun": false
  }'

# Response
{
  "success": true,
  "data": {
    "totalListings": 150,
    "processedCount": 150,
    "enrichedCount": 142,
    "failedCount": 5,
    "skippedCount": 3,
    "errors": [
      {
        "vin": "INVALID12345678910",
        "error": "VIN check digit validation failed"
      }
    ],
    "enrichedFields": {
      "engine": 138,
      "transmission": 140,
      "drivetrain": 135,
      "fuelType": 142,
      "bodyType": 130,
      "cylinders": 138,
      "doors": 125,
      "seatingCapacity": 120
    },
    "durationMs": 185000
  }
}
```

### 7. Admin: Check Enrichment Status

**Endpoint:** `GET /api/v1/admin/decode-vins/status`

Returns statistics about listings with missing specs.

```bash
# Example
curl https://api.carsearch.app/api/v1/admin/decode-vins/status

# Response
{
  "success": true,
  "data": {
    "total_listings": 1250,
    "missing_engine": 320,
    "missing_transmission": 285,
    "missing_drivetrain": 410,
    "missing_fuel_type": 190,
    "missing_body_type": 450,
    "missing_cylinders": 380,
    "missing_doors": 520,
    "missing_seating_capacity": 600,
    "missing_base_msrp": 890,
    "listings_needing_enrichment": 650
  }
}
```

## VIN Validation

The system validates VINs using ISO 3779 standard:

1. **Length:** Must be exactly 17 characters
2. **Characters:** Alphanumeric (A-H, J-N, P-Z, 0-9) - no I, O, or Q
3. **Check Digit:** Position 9 must match calculated check digit

### Valid VIN Examples

```
1HGBH41JXMN109186  ✓ Valid
5YJSA1E26HF123456  ✓ Valid
1FTFW1E84MFA12345  ✓ Valid
```

### Invalid VIN Examples

```
1HGBH41JXMN10918   ✗ Too short (16 chars)
1HGBH41JXMN1091866 ✗ Too long (18 chars)
1OGBH41JXMN109186  ✗ Contains 'O' (looks like 0)
1HGBH41JXMN109187  ✗ Check digit mismatch
```

## Auto-Enrichment Pipeline

When the scraper saves a new listing, it automatically:

1. Saves listing to D1 database
2. Triggers background VIN enrichment (non-blocking)
3. Decodes VIN using NHTSA API
4. Fills missing fields only (preserves scraped data)
5. Updates listing in database
6. Invalidates cache

```typescript
// In scraper-cars-com.ts
await saveListingsToDB(env, listings);
// ↓ Automatically enriches new listings
// ↓ enrichListingInBackground() called for each new VIN
```

## Rate Limiting

The system respects NHTSA API rate limits:

- **Batch Processing:** 10 VINs per batch, 2 second delay between batches
- **Request Delay:** 500ms between individual requests
- **Auto-Enrichment:** 1 second delay per new listing

## Caching Strategy

VIN decoded data is cached in Cloudflare KV with:

- **Key:** `vin:decoded:{VIN}`
- **TTL:** 1 year (VINs never change)
- **Cache Hit:** Returns instantly from KV
- **Cache Miss:** Calls NHTSA API, then caches result

## Data Mapping

NHTSA API fields mapped to database fields:

| NHTSA Variable | Database Field | Example |
|----------------|----------------|---------|
| Make | make | "Honda" |
| Model | model | "Accord" |
| Model Year | year | 2021 |
| Trim / Series | trim | "Sport" |
| Body Class | body_type | "Sedan" |
| Engine Model + Cylinders + Displacement | engine | "1.5L 4-Cylinder Turbocharged" |
| Engine Number of Cylinders | cylinders | 4 |
| Transmission Style + Speeds | transmission | "CVT" |
| Drive Type | drivetrain | "FWD" |
| Fuel Type - Primary | fuel_type | "Gasoline" |
| Doors | doors | 4 |
| Seats | seating_capacity | 5 |
| Base Price | base_msrp | 26270 |

## Error Handling

The system handles various error scenarios:

### Invalid VIN Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_VIN",
    "message": "VIN must be exactly 17 characters (got 16)"
  }
}
```

### NHTSA API Error

```json
{
  "success": false,
  "error": {
    "code": "API_ERROR",
    "message": "NHTSA API error: 503 Service Unavailable"
  }
}
```

### No Data Available

```json
{
  "success": false,
  "error": {
    "code": "NO_DATA",
    "message": "No data returned from NHTSA API"
  }
}
```

### Listing Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Listing not found"
  }
}
```

## Testing

### Test VINs

Use these real VINs for testing:

```bash
# Honda Accord 2021
curl /api/v1/vin/decode/1HGBH41JXMN109186

# Tesla Model 3 2020
curl /api/v1/vin/decode/5YJ3E1EA5LF123456

# Ford F-150 2021
curl /api/v1/vin/decode/1FTFW1E84MFA12345

# Toyota RAV4 2022
curl /api/v1/vin/decode/2T3P1RFV9NC123456

# Chevrolet Silverado 2021
curl /api/v1/vin/decode/1GCUYDE88NF123456
```

### Dry Run Mode

Test batch processing without updating the database:

```bash
curl -X POST /api/v1/admin/decode-vins \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

## Performance

Typical performance metrics:

- **Single VIN decode (cache miss):** ~500-800ms
- **Single VIN decode (cache hit):** ~10-50ms
- **Batch processing (100 VINs):** ~2-3 minutes
- **Full database enrichment (1000 listings):** ~20-30 minutes

## Best Practices

1. **Always check cache first** - VINs never change, use cache when possible
2. **Use batch processing for bulk operations** - Respects rate limits
3. **Don't override scraped data** - Only fill missing fields
4. **Monitor NHTSA API status** - Check for service disruptions
5. **Log enrichment results** - Track success/failure rates
6. **Handle errors gracefully** - Some VINs may not decode successfully

## Troubleshooting

### VIN won't decode

- Verify VIN format with `/validate/:vin` endpoint
- Check NHTSA API status: https://vpic.nhtsa.dot.gov/api/
- Look for VIN in NHTSA database (may be too old/new)

### Batch processing slow

- Reduce `batchSize` to avoid timeouts
- Increase `delayBetweenRequestsMs` if hitting rate limits
- Check Cloudflare Worker CPU limits

### Cache not working

- Verify KV namespace is bound in wrangler.toml
- Check KV quota limits
- Ensure cache keys are consistent (uppercase VINs)

## NHTSA API Reference

- **API Documentation:** https://vpic.nhtsa.dot.gov/api/
- **Endpoint:** https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{VIN}?format=json
- **Rate Limits:** No official limit, but respect fair use (we use 500ms delay)
- **Free:** Yes, completely free API

## Integration with Existing Features

### Scraper Integration

VIN enrichment is automatically triggered when the scraper saves new listings:

```typescript
// backend/src/services/scraper-cars-com.ts
await saveListingsToDB(env, listings);
// ↓ Auto-enriches VINs in background
```

### Listing Detail Pages

Display VIN decoded data alongside scraped data:

```typescript
// GET /api/v1/listings/:vin
const listing = await getListingByVIN(vin);
const vinData = await decodeVIN(env, vin);

return {
  listing,
  vinData,
  enrichmentStatus: compareData(listing, vinData)
};
```

### Search Filters

Use enriched data for better filtering:

```typescript
// Filter by engine type
WHERE engine LIKE '%Turbo%'

// Filter by drivetrain
WHERE drivetrain = 'AWD'

// Filter by fuel type
WHERE fuel_type = 'Electric'
```

## Next Steps

1. **Enable auto-enrichment** - Already integrated in scraper
2. **Run batch enrichment** - Process existing listings
3. **Monitor results** - Check enrichment success rates
4. **Add to UI** - Display enriched specs on listing pages
5. **Analytics** - Track which fields are most frequently enriched

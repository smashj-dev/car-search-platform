# VIN Decoder Quick Reference

## Quick Start

```bash
# 1. Start dev server
npm run dev

# 2. Validate a VIN
curl http://localhost:8787/api/v1/vin/validate/1HGBH41JXMN109186

# 3. Decode a VIN
curl http://localhost:8787/api/v1/vin/decode/1HGBH41JXMN109186

# 4. Check enrichment status
curl http://localhost:8787/api/v1/admin/decode-vins/status

# 5. Run batch enrichment (dry run)
curl -X POST http://localhost:8787/api/v1/admin/decode-vins \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/vin/validate/:vin` | Validate VIN format |
| GET | `/api/v1/vin/decode/:vin` | Decode VIN using NHTSA API |
| GET | `/api/v1/vin/listing/:vin/decode` | Compare VIN data with listing |
| POST | `/api/v1/vin/listing/:vin/enrich` | Enrich listing with VIN data |
| POST | `/api/v1/vin/batch-decode` | Batch decode multiple VINs |
| GET | `/api/v1/admin/decode-vins/status` | Get enrichment statistics |
| POST | `/api/v1/admin/decode-vins` | Batch enrich all listings |

## Test VINs

```
1HGBH41JXMN109186  - Honda Accord 2021
5YJ3E1EA5LF123456  - Tesla Model 3 2020
1FTFW1E84MFA12345  - Ford F-150 2021
2T3P1RFV9NC123456  - Toyota RAV4 2022
1GCUYDE88NF123456  - Chevrolet Silverado 2021
```

## Usage in Code

### Validate VIN

```typescript
import { validateVIN } from './utils/vin-validator';

const result = validateVIN('1HGBH41JXMN109186');
if (result.isValid) {
  console.log('Valid VIN:', result.sanitizedVIN);
} else {
  console.log('Errors:', result.errors);
}
```

### Decode VIN

```typescript
import { decodeVIN } from './services/vin-decoder';

const result = await decodeVIN(env, '1HGBH41JXMN109186');
if (result.success) {
  console.log('Make:', result.data.make);
  console.log('Model:', result.data.model);
  console.log('Year:', result.data.year);
  console.log('Engine:', result.data.engine);
}
```

### Enrich Listing

```typescript
import { enrichListingByVIN } from './workers/batch-decode';

const result = await enrichListingByVIN(env, 'VIN123', false);
console.log(`Enriched ${result.enrichedFields} fields`);
```

### Batch Process

```typescript
import { batchDecodeListings } from './workers/batch-decode';

const result = await batchDecodeListings(env, {
  batchSize: 10,
  delayBetweenBatchesMs: 2000,
  dryRun: false
});

console.log(`Enriched ${result.enrichedCount} listings`);
```

## Files Created

```
backend/
├── src/
│   ├── utils/
│   │   └── vin-validator.ts          # VIN validation utilities
│   ├── services/
│   │   ├── vin-decoder.ts            # NHTSA API integration
│   │   └── scraper-cars-com.ts       # (Updated) Auto-enrichment
│   ├── routes/
│   │   └── vin.ts                    # VIN API endpoints
│   ├── workers/
│   │   └── batch-decode.ts           # Batch processing worker
│   └── index.ts                      # (Updated) Admin endpoints
├── VIN_DECODER_GUIDE.md              # Full documentation
├── VIN_DECODER_IMPLEMENTATION.md     # Implementation summary
├── VIN_QUICK_REFERENCE.md            # This file
└── test-vin-decoder.ts               # Test script
```

## Common Tasks

### Check what needs enrichment

```bash
curl http://localhost:8787/api/v1/admin/decode-vins/status
```

### Enrich specific listing

```bash
curl -X POST http://localhost:8787/api/v1/vin/listing/VIN123/enrich
```

### Batch enrich all listings

```bash
curl -X POST http://localhost:8787/api/v1/admin/decode-vins \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "delayBetweenBatchesMs": 2000,
    "delayBetweenRequestsMs": 500,
    "dryRun": false
  }'
```

### Test validation locally

```bash
npx tsx test-vin-decoder.ts
```

## Enrichment Fields

Fields that can be enriched from VIN:

- `engine` - Engine description
- `transmission` - Transmission type
- `drivetrain` - FWD/RWD/AWD/4WD
- `fuel_type` - Gasoline/Diesel/Electric/Hybrid
- `body_type` - Sedan/SUV/Truck/etc
- `cylinders` - Number of cylinders
- `doors` - Number of doors
- `seating_capacity` - Number of seats
- `base_msrp` - Base MSRP (when available)

## Cache Keys

VIN decoded data is cached in KV:

- Key: `vin:decoded:{VIN}`
- TTL: 1 year
- Example: `vin:decoded:1HGBH41JXMN109186`

## Rate Limiting

- Batch size: 10 VINs
- Delay between batches: 2 seconds
- Delay between requests: 500ms
- Auto-enrichment delay: 1 second

## Error Codes

- `INVALID_VIN` - VIN format invalid
- `API_ERROR` - NHTSA API error
- `NO_DATA` - No data from API
- `NOT_FOUND` - Listing not found
- `BATCH_DECODE_ERROR` - Batch failed
- `INVALID_INPUT` - Invalid parameters

## Troubleshooting

### VIN won't validate
```bash
# Check format
curl http://localhost:8787/api/v1/vin/validate/YOUR_VIN

# Common issues:
# - Wrong length (must be 17)
# - Contains I, O, or Q
# - Check digit mismatch
```

### VIN won't decode
```bash
# Test NHTSA API directly
curl "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/YOUR_VIN?format=json"

# Possible issues:
# - VIN not in NHTSA database
# - API temporarily down
# - Invalid VIN format
```

### Cache not working
```bash
# Check KV binding in wrangler.toml
# Verify CACHE namespace exists
# Test with different VIN
```

## Production Deployment

```bash
# 1. Deploy to Cloudflare
cd backend
wrangler deploy

# 2. Verify deployment
curl https://api.carsearch.app/api/v1/vin/validate/1HGBH41JXMN109186

# 3. Run batch enrichment
curl -X POST https://api.carsearch.app/api/v1/admin/decode-vins \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# 4. Monitor logs
wrangler tail
```

## Performance Tips

1. Always check cache first
2. Use batch processing for bulk operations
3. Don't override scraped data
4. Monitor NHTSA API status
5. Log all enrichment results

## Support Resources

- Full documentation: `VIN_DECODER_GUIDE.md`
- Implementation details: `VIN_DECODER_IMPLEMENTATION.md`
- NHTSA API docs: https://vpic.nhtsa.dot.gov/api/
- Test script: `test-vin-decoder.ts`

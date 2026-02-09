/**
 * VIN API Routes
 * Endpoints for VIN validation, decoding, and enrichment
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { validateVIN, parseVINBasics } from '../utils/vin-validator';
import {
  decodeVIN,
  compareVINData,
  planEnrichment,
  type DecodedVINData,
} from '../services/vin-decoder';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

export const vinRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/vin/validate/:vin
 * Validates VIN format and check digit
 */
vinRouter.get('/validate/:vin', (c) => {
  const vin = c.req.param('vin');

  const validation = validateVIN(vin);
  const basics = validation.isValid ? parseVINBasics(vin) : null;

  return c.json({
    success: true,
    data: {
      isValid: validation.isValid,
      errors: validation.errors,
      vin: validation.sanitizedVIN,
      basics,
    },
  });
});

/**
 * GET /api/v1/vin/decode/:vin
 * Decodes VIN using NHTSA API
 */
vinRouter.get('/decode/:vin', async (c) => {
  const vin = c.req.param('vin');

  const result = await decodeVIN(c.env, vin);

  if (!result.success) {
    return c.json({
      success: false,
      error: result.error,
    }, 400);
  }

  return c.json({
    success: true,
    data: result.data,
    meta: {
      source: result.source,
    },
  });
});

/**
 * GET /api/v1/vin/listing/:vin/decode
 * Decodes VIN and compares with existing listing data
 */
vinRouter.get('/listing/:vin/decode', async (c) => {
  const vin = c.req.param('vin');
  const db = drizzle(c.env.DB, { schema });

  // Get existing listing
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.vin, vin.toUpperCase()),
  });

  if (!listing) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found',
      },
    }, 404);
  }

  // Decode VIN
  const result = await decodeVIN(c.env, vin);

  if (!result.success) {
    return c.json({
      success: false,
      error: result.error,
    }, 400);
  }

  // Compare data
  const comparisons = compareVINData(
    {
      make: listing.make,
      model: listing.model,
      year: listing.year,
    },
    result.data!
  );

  // Plan enrichment
  const enrichmentPlan = planEnrichment(
    {
      engine: listing.engine,
      transmission: listing.transmission,
      drivetrain: listing.drivetrain,
      fuelType: listing.fuelType,
      bodyType: listing.bodyType,
      cylinders: listing.cylinders,
      doors: listing.doors,
      seatingCapacity: listing.seatingCapacity,
      baseMsrp: listing.baseMsrp,
    },
    result.data!
  );

  return c.json({
    success: true,
    data: {
      listing: {
        vin: listing.vin,
        year: listing.year,
        make: listing.make,
        model: listing.model,
        trim: listing.trim,
      },
      decodedVIN: result.data,
      comparisons,
      enrichmentPlan,
    },
    meta: {
      source: result.source,
    },
  });
});

/**
 * POST /api/v1/vin/listing/:vin/enrich
 * Enriches a listing with VIN decoded data
 */
vinRouter.post('/listing/:vin/enrich', async (c) => {
  const vin = c.req.param('vin');
  const db = drizzle(c.env.DB, { schema });

  // Get existing listing
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.vin, vin.toUpperCase()),
  });

  if (!listing) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found',
      },
    }, 404);
  }

  // Decode VIN
  const result = await decodeVIN(c.env, vin);

  if (!result.success) {
    return c.json({
      success: false,
      error: result.error,
    }, 400);
  }

  const vinData = result.data!;

  // Build update object (only fill missing fields)
  const updates: Record<string, any> = {};
  let enrichedFields = 0;

  if (!listing.engine && vinData.engine) {
    updates.engine = vinData.engine;
    enrichedFields++;
  }

  if (!listing.transmission && vinData.transmission) {
    updates.transmission = vinData.transmission;
    enrichedFields++;
  }

  if (!listing.drivetrain && vinData.drivetrain) {
    updates.drivetrain = vinData.drivetrain;
    enrichedFields++;
  }

  if (!listing.fuelType && vinData.fuelType) {
    updates.fuelType = vinData.fuelType;
    enrichedFields++;
  }

  if (!listing.bodyType && vinData.bodyType) {
    updates.bodyType = vinData.bodyType;
    enrichedFields++;
  }

  if (!listing.cylinders && vinData.engineCylinders) {
    updates.cylinders = vinData.engineCylinders;
    enrichedFields++;
  }

  if (!listing.doors && vinData.doors) {
    updates.doors = vinData.doors;
    enrichedFields++;
  }

  if (!listing.seatingCapacity && vinData.seatingCapacity) {
    updates.seatingCapacity = vinData.seatingCapacity;
    enrichedFields++;
  }

  if (!listing.baseMsrp && vinData.msrp) {
    updates.baseMsrp = vinData.msrp;
    enrichedFields++;
  }

  // If no fields to enrich, return early
  if (enrichedFields === 0) {
    return c.json({
      success: true,
      message: 'No fields to enrich - listing already complete',
      data: {
        enrichedFields: 0,
        updates: {},
      },
    });
  }

  // Update database
  const now = new Date().toISOString();
  updates.updatedAt = now;

  // Build SQL dynamically
  const setClause = Object.keys(updates)
    .map(key => {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      return `${snakeKey} = ?`;
    })
    .join(', ');

  const values = Object.values(updates);
  values.push(vin.toUpperCase());

  await c.env.DB.prepare(`
    UPDATE listings
    SET ${setClause}
    WHERE vin = ?
  `).bind(...values).run();

  // Invalidate cache
  const cacheKey = `listing:${vin.toUpperCase()}`;
  await c.env.CACHE.delete(cacheKey);

  return c.json({
    success: true,
    message: `Enriched ${enrichedFields} field(s)`,
    data: {
      enrichedFields,
      updates,
    },
  });
});

/**
 * POST /api/v1/vin/batch-decode
 * Batch decode multiple VINs
 */
vinRouter.post('/batch-decode', async (c) => {
  const body = await c.req.json();
  const { vins } = body as { vins: string[] };

  if (!vins || !Array.isArray(vins)) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'vins must be an array',
      },
    }, 400);
  }

  if (vins.length === 0) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'vins array cannot be empty',
      },
    }, 400);
  }

  if (vins.length > 100) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Maximum 100 VINs per batch',
      },
    }, 400);
  }

  // Decode VINs sequentially with delay to avoid rate limiting
  const results: Array<{ vin: string; success: boolean; data?: DecodedVINData; error?: any }> = [];

  for (let i = 0; i < vins.length; i++) {
    const vin = vins[i];
    const result = await decodeVIN(c.env, vin);

    results.push({
      vin: vin.toUpperCase().trim(),
      success: result.success,
      data: result.data,
      error: result.error,
    });

    // Delay between requests (except last one)
    if (i < vins.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return c.json({
    success: true,
    data: results,
    meta: {
      total: vins.length,
      successful: successCount,
      failed: failCount,
    },
  });
});

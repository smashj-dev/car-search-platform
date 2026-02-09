/**
 * Batch VIN Decoder Worker
 * Processes VIN enrichment for all listings with missing specs
 */

import type { Env } from '../types/env';
import { drizzle } from 'drizzle-orm/d1';
import { isNull, eq, or } from 'drizzle-orm';
import * as schema from '../db/schema';
import { decodeVIN } from '../services/vin-decoder';
import { normalizeVIN } from '../utils/vin-validator';

export interface BatchDecodeConfig {
  batchSize: number;
  delayBetweenBatchesMs: number;
  delayBetweenRequestsMs: number;
  dryRun?: boolean;
}

export interface BatchDecodeResult {
  totalListings: number;
  processedCount: number;
  enrichedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ vin: string; error: string }>;
  enrichedFields: Record<string, number>;
  durationMs: number;
}

const DEFAULT_CONFIG: BatchDecodeConfig = {
  batchSize: 10,
  delayBetweenBatchesMs: 2000,
  delayBetweenRequestsMs: 500,
  dryRun: false,
};

/**
 * Batch processes VIN decoding for all listings with missing specs
 */
export async function batchDecodeListings(
  env: Env,
  config: Partial<BatchDecodeConfig> = {}
): Promise<BatchDecodeResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const db = drizzle(env.DB, { schema });

  const result: BatchDecodeResult = {
    totalListings: 0,
    processedCount: 0,
    enrichedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    errors: [],
    enrichedFields: {},
    durationMs: 0,
  };

  console.log('Starting batch VIN decode...');
  console.log('Config:', cfg);

  // Find all listings with missing specs
  const listingsWithMissingSpecs = await db
    .select({
      id: schema.listings.id,
      vin: schema.listings.vin,
      year: schema.listings.year,
      make: schema.listings.make,
      model: schema.listings.model,
      engine: schema.listings.engine,
      transmission: schema.listings.transmission,
      drivetrain: schema.listings.drivetrain,
      fuelType: schema.listings.fuelType,
      bodyType: schema.listings.bodyType,
      cylinders: schema.listings.cylinders,
      doors: schema.listings.doors,
      seatingCapacity: schema.listings.seatingCapacity,
      baseMsrp: schema.listings.baseMsrp,
    })
    .from(schema.listings)
    .where(
      or(
        isNull(schema.listings.engine),
        isNull(schema.listings.transmission),
        isNull(schema.listings.drivetrain),
        isNull(schema.listings.fuelType),
        isNull(schema.listings.bodyType),
        isNull(schema.listings.cylinders)
      )
    );

  result.totalListings = listingsWithMissingSpecs.length;
  console.log(`Found ${result.totalListings} listings with missing specs`);

  if (result.totalListings === 0) {
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // Process in batches
  const batches = Math.ceil(listingsWithMissingSpecs.length / cfg.batchSize);

  for (let i = 0; i < listingsWithMissingSpecs.length; i += cfg.batchSize) {
    const batch = listingsWithMissingSpecs.slice(i, i + cfg.batchSize);
    const batchNum = Math.floor(i / cfg.batchSize) + 1;

    console.log(`Processing batch ${batchNum}/${batches} (${batch.length} listings)`);

    for (const listing of batch) {
      result.processedCount++;

      try {
        // Decode VIN
        const vinResult = await decodeVIN(env, listing.vin);

        if (!vinResult.success) {
          result.failedCount++;
          result.errors.push({
            vin: listing.vin,
            error: vinResult.error?.message || 'Unknown error',
          });
          console.log(`  ✗ ${listing.vin}: ${vinResult.error?.message}`);
          continue;
        }

        const vinData = vinResult.data!;

        // Build update object (only fill missing fields)
        const updates: Record<string, any> = {};
        let enrichedFieldCount = 0;

        if (!listing.engine && vinData.engine) {
          updates.engine = vinData.engine;
          enrichedFieldCount++;
          result.enrichedFields.engine = (result.enrichedFields.engine || 0) + 1;
        }

        if (!listing.transmission && vinData.transmission) {
          updates.transmission = vinData.transmission;
          enrichedFieldCount++;
          result.enrichedFields.transmission = (result.enrichedFields.transmission || 0) + 1;
        }

        if (!listing.drivetrain && vinData.drivetrain) {
          updates.drivetrain = vinData.drivetrain;
          enrichedFieldCount++;
          result.enrichedFields.drivetrain = (result.enrichedFields.drivetrain || 0) + 1;
        }

        if (!listing.fuelType && vinData.fuelType) {
          updates.fuelType = vinData.fuelType;
          enrichedFieldCount++;
          result.enrichedFields.fuelType = (result.enrichedFields.fuelType || 0) + 1;
        }

        if (!listing.bodyType && vinData.bodyType) {
          updates.bodyType = vinData.bodyType;
          enrichedFieldCount++;
          result.enrichedFields.bodyType = (result.enrichedFields.bodyType || 0) + 1;
        }

        if (!listing.cylinders && vinData.engineCylinders) {
          updates.cylinders = vinData.engineCylinders;
          enrichedFieldCount++;
          result.enrichedFields.cylinders = (result.enrichedFields.cylinders || 0) + 1;
        }

        if (!listing.doors && vinData.doors) {
          updates.doors = vinData.doors;
          enrichedFieldCount++;
          result.enrichedFields.doors = (result.enrichedFields.doors || 0) + 1;
        }

        if (!listing.seatingCapacity && vinData.seatingCapacity) {
          updates.seatingCapacity = vinData.seatingCapacity;
          enrichedFieldCount++;
          result.enrichedFields.seatingCapacity = (result.enrichedFields.seatingCapacity || 0) + 1;
        }

        if (!listing.baseMsrp && vinData.msrp) {
          updates.baseMsrp = vinData.msrp;
          enrichedFieldCount++;
          result.enrichedFields.baseMsrp = (result.enrichedFields.baseMsrp || 0) + 1;
        }

        // Skip if no fields to enrich
        if (enrichedFieldCount === 0) {
          result.skippedCount++;
          console.log(`  - ${listing.vin}: No fields to enrich`);
          continue;
        }

        // Update database (unless dry run)
        if (!cfg.dryRun) {
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
          values.push(listing.vin);

          await env.DB.prepare(`
            UPDATE listings
            SET ${setClause}
            WHERE vin = ?
          `).bind(...values).run();

          // Invalidate cache
          const cacheKey = `listing:${listing.vin}`;
          await env.CACHE.delete(cacheKey);
        }

        result.enrichedCount++;
        console.log(
          `  ✓ ${listing.vin}: Enriched ${enrichedFieldCount} field(s) ${cfg.dryRun ? '(dry run)' : ''}`
        );

        // Delay between requests
        if (cfg.delayBetweenRequestsMs > 0) {
          await new Promise(resolve => setTimeout(resolve, cfg.delayBetweenRequestsMs));
        }
      } catch (error: any) {
        result.failedCount++;
        result.errors.push({
          vin: listing.vin,
          error: error.message || 'Unknown error',
        });
        console.error(`  ✗ ${listing.vin}:`, error);
      }
    }

    // Delay between batches (except last batch)
    if (i + cfg.batchSize < listingsWithMissingSpecs.length && cfg.delayBetweenBatchesMs > 0) {
      console.log(`Waiting ${cfg.delayBetweenBatchesMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, cfg.delayBetweenBatchesMs));
    }
  }

  result.durationMs = Date.now() - startTime;

  console.log('\nBatch decode complete!');
  console.log(`Total: ${result.totalListings}`);
  console.log(`Processed: ${result.processedCount}`);
  console.log(`Enriched: ${result.enrichedCount}`);
  console.log(`Skipped: ${result.skippedCount}`);
  console.log(`Failed: ${result.failedCount}`);
  console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log('Enriched fields:', result.enrichedFields);

  return result;
}

/**
 * Enriches a single listing by VIN
 */
export async function enrichListingByVIN(
  env: Env,
  vin: string,
  force: boolean = false
): Promise<{
  success: boolean;
  enrichedFields: number;
  updates: Record<string, any>;
  error?: string;
}> {
  const db = drizzle(env.DB, { schema });
  const normalizedVIN = normalizeVIN(vin);

  // Get listing
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.vin, normalizedVIN),
  });

  if (!listing) {
    return {
      success: false,
      enrichedFields: 0,
      updates: {},
      error: 'Listing not found',
    };
  }

  // Decode VIN
  const vinResult = await decodeVIN(env, normalizedVIN);

  if (!vinResult.success) {
    return {
      success: false,
      enrichedFields: 0,
      updates: {},
      error: vinResult.error?.message || 'Failed to decode VIN',
    };
  }

  const vinData = vinResult.data!;

  // Build update object
  const updates: Record<string, any> = {};
  let enrichedFieldCount = 0;

  if ((force || !listing.engine) && vinData.engine) {
    updates.engine = vinData.engine;
    enrichedFieldCount++;
  }

  if ((force || !listing.transmission) && vinData.transmission) {
    updates.transmission = vinData.transmission;
    enrichedFieldCount++;
  }

  if ((force || !listing.drivetrain) && vinData.drivetrain) {
    updates.drivetrain = vinData.drivetrain;
    enrichedFieldCount++;
  }

  if ((force || !listing.fuelType) && vinData.fuelType) {
    updates.fuelType = vinData.fuelType;
    enrichedFieldCount++;
  }

  if ((force || !listing.bodyType) && vinData.bodyType) {
    updates.bodyType = vinData.bodyType;
    enrichedFieldCount++;
  }

  if ((force || !listing.cylinders) && vinData.engineCylinders) {
    updates.cylinders = vinData.engineCylinders;
    enrichedFieldCount++;
  }

  if ((force || !listing.doors) && vinData.doors) {
    updates.doors = vinData.doors;
    enrichedFieldCount++;
  }

  if ((force || !listing.seatingCapacity) && vinData.seatingCapacity) {
    updates.seatingCapacity = vinData.seatingCapacity;
    enrichedFieldCount++;
  }

  if ((force || !listing.baseMsrp) && vinData.msrp) {
    updates.baseMsrp = vinData.msrp;
    enrichedFieldCount++;
  }

  // Update database if needed
  if (enrichedFieldCount > 0) {
    const now = new Date().toISOString();
    updates.updatedAt = now;

    // Build SQL dynamically
    const setClause = Object.keys(updates)
      .map(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${snakeKey} = ?`;
      })
      .join(', ');

    const values = Object.values(updates);
    values.push(normalizedVIN);

    await env.DB.prepare(`
      UPDATE listings
      SET ${setClause}
      WHERE vin = ?
    `).bind(...values).run();

    // Invalidate cache
    const cacheKey = `listing:${normalizedVIN}`;
    await env.CACHE.delete(cacheKey);
  }

  return {
    success: true,
    enrichedFields: enrichedFieldCount,
    updates,
  };
}

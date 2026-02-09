import type { KVNamespace } from '@cloudflare/workers-types';
import { createHash } from 'crypto';

export interface CachedFacets {
  facets: Record<string, any[]>;
  stats: any;
  buckets: any;
  cachedAt: number;
}

export class FacetsCache {
  private static readonly TTL = 300; // 5 minutes
  private static readonly KEY_PREFIX = 'facets:';

  constructor(private kv: KVNamespace) {}

  /**
   * Generate a cache key based on filter parameters
   */
  static generateCacheKey(filters: Record<string, any>): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(filters).sort();
    const canonicalString = sortedKeys
      .map(key => `${key}=${JSON.stringify(filters[key])}`)
      .join('&');

    // Create hash
    const hash = createHash('sha256').update(canonicalString).digest('hex').substring(0, 16);
    return `${this.KEY_PREFIX}${hash}`;
  }

  /**
   * Get cached facets if available and not expired
   */
  async get(cacheKey: string): Promise<CachedFacets | null> {
    try {
      const cached = await this.kv.get(cacheKey, 'json');

      if (!cached) {
        return null;
      }

      const data = cached as CachedFacets;

      // Check if expired (additional safety check)
      const age = Date.now() - data.cachedAt;
      if (age > FacetsCache.TTL * 1000) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading from facets cache:', error);
      return null;
    }
  }

  /**
   * Store facets in cache
   */
  async set(cacheKey: string, data: Omit<CachedFacets, 'cachedAt'>): Promise<void> {
    try {
      const cachedData: CachedFacets = {
        ...data,
        cachedAt: Date.now(),
      };

      await this.kv.put(cacheKey, JSON.stringify(cachedData), {
        expirationTtl: FacetsCache.TTL,
      });
    } catch (error) {
      console.error('Error writing to facets cache:', error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Invalidate cache for a specific pattern or all facets
   */
  async invalidate(pattern?: string): Promise<void> {
    try {
      if (!pattern) {
        // Invalidate all facets - list all keys with prefix and delete
        const list = await this.kv.list({ prefix: FacetsCache.KEY_PREFIX });

        const deletePromises = list.keys.map(key => this.kv.delete(key.name));
        await Promise.all(deletePromises);

        return;
      }

      // Invalidate specific pattern (if needed in future)
      // For now, just delete the exact key
      await this.kv.delete(pattern);
    } catch (error) {
      console.error('Error invalidating facets cache:', error);
    }
  }

  /**
   * Invalidate all cached facets
   * Call this when new listings are added or updated
   */
  async invalidateAll(): Promise<void> {
    return this.invalidate();
  }
}

/**
 * Helper to determine if facets should be computed or cached
 */
export function shouldComputeFacets(filters: Record<string, any>): boolean {
  // Compute facets if there are any active filters
  // This gives users real-time feedback on how filters affect results
  const filterKeys = Object.keys(filters).filter(
    key => !['page', 'per_page', 'sort_by', 'sort_order'].includes(key)
  );

  return filterKeys.length > 0;
}

/**
 * Helper to merge cached facets with fresh data
 * Useful when only partial cache invalidation is needed
 */
export function mergeFacets(
  cached: CachedFacets | null,
  fresh: Omit<CachedFacets, 'cachedAt'>
): Omit<CachedFacets, 'cachedAt'> {
  if (!cached) {
    return fresh;
  }

  // If cache is recent enough, use it
  const age = Date.now() - cached.cachedAt;
  const halfTTL = 150000; // Half of 5 minutes (300 seconds) in milliseconds
  if (age < halfTTL) {
    return {
      facets: cached.facets,
      stats: cached.stats,
      buckets: cached.buckets,
    };
  }

  // Otherwise use fresh data
  return fresh;
}

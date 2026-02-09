import type { D1Database, KVNamespace, R2Bucket, Queue } from '@cloudflare/workers-types';

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV for hot cache
  CACHE: KVNamespace;

  // R2 for raw scrape storage
  STORAGE: R2Bucket;

  // Workers AI
  AI: Ai;

  // Queue for background scraping
  SCRAPE_QUEUE: Queue;

  // Browser Rendering for scraping
  BROWSER: any; // Cloudflare Browser Rendering binding

  // Environment variables
  ENVIRONMENT: string;

  // Secrets (added via wrangler secret put)
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  MAILCHANNELS_API_KEY?: string;
  CACHE_INVALIDATION_TOKEN?: string;
}

// AI binding type (Cloudflare Workers AI)
interface Ai {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

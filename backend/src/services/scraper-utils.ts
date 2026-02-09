import type { Env } from '../types/env';

export interface ScraperMetrics {
  jobId: string;
  make: string;
  model: string;
  zipCode: string;
  listingsFound: number;
  listingsSaved: number;
  duration: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
  timestamp: string;
}

export class ScraperLogger {
  private env: Env;
  private jobId: string;

  constructor(env: Env, jobId: string) {
    this.env = env;
    this.jobId = jobId;
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Job ${this.jobId}] ${message}`, data || '');
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [Job ${this.jobId}] ERROR: ${message}`, error || '');
  }

  warn(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [Job ${this.jobId}] WARN: ${message}`, data || '');
  }

  async recordMetrics(metrics: Omit<ScraperMetrics, 'jobId' | 'timestamp'>) {
    const fullMetrics: ScraperMetrics = {
      ...metrics,
      jobId: this.jobId,
      timestamp: new Date().toISOString(),
    };

    // Log to console
    this.log('Metrics', fullMetrics);

    try {
      // Store metrics in KV with 7-day expiration
      const key = `scraper:metrics:${this.jobId}`;
      await this.env.CACHE.put(key, JSON.stringify(fullMetrics), {
        expirationTtl: 7 * 24 * 60 * 60, // 7 days
      });

      // Also store in a daily summary key
      const dateKey = new Date().toISOString().split('T')[0];
      const summaryKey = `scraper:summary:${dateKey}`;

      const existingSummary = await this.env.CACHE.get(summaryKey, 'json') as any;
      const summary = existingSummary || {
        date: dateKey,
        totalJobs: 0,
        successJobs: 0,
        failedJobs: 0,
        totalListings: 0,
        totalDuration: 0,
      };

      summary.totalJobs++;
      if (metrics.status === 'success') summary.successJobs++;
      if (metrics.status === 'failed') summary.failedJobs++;
      summary.totalListings += metrics.listingsFound;
      summary.totalDuration += metrics.duration;

      await this.env.CACHE.put(summaryKey, JSON.stringify(summary), {
        expirationTtl: 30 * 24 * 60 * 60, // 30 days
      });

    } catch (error: any) {
      this.error('Failed to record metrics', error);
    }
  }
}

export async function getScraperSummary(env: Env, days: number = 7): Promise<any[]> {
  const summaries: any[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const summaryKey = `scraper:summary:${dateKey}`;

    const summary = await env.CACHE.get(summaryKey, 'json');
    if (summary) {
      summaries.push(summary);
    }
  }

  return summaries;
}

export function shouldRetryError(error: Error): boolean {
  const retryablePatterns = [
    'timeout',
    'network',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'No listings found, retrying',
    'navigation',
  ];

  const errorMessage = error.message.toLowerCase();
  return retryablePatterns.some(pattern => errorMessage.includes(pattern.toLowerCase()));
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomDelay(min: number = 2000, max: number = 3000): number {
  return min + Math.random() * (max - min);
}

export async function checkRobotsConsent(url: string): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', url).toString();
    const response = await fetch(robotsUrl);

    if (!response.ok) {
      // If robots.txt doesn't exist, assume scraping is allowed
      return true;
    }

    const robotsTxt = await response.text();

    // Simple check for disallowed paths
    const disallowedPaths = robotsTxt
      .split('\n')
      .filter(line => line.trim().toLowerCase().startsWith('disallow:'))
      .map(line => line.split(':')[1].trim());

    // Check if /shopping or /vehicledetail are disallowed
    const pathname = new URL(url).pathname;
    const isDisallowed = disallowedPaths.some(path => {
      if (path === '/') return true; // Everything disallowed
      return pathname.startsWith(path);
    });

    return !isDisallowed;

  } catch (error) {
    // On error, be conservative and allow scraping
    console.warn('Could not check robots.txt, proceeding with caution');
    return true;
  }
}

import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { Listing } from '../db/schema';
import {
  calculateDealScore,
  getMarketPosition,
  formatPriceDifference,
  type DealScoreFactors,
  type DealScoreResult,
} from '../utils/deal-score';

export interface ListingInsights {
  vin: string;
  dealScore: DealScoreResult;
  marketPosition: string;
  priceComparison: string;
  daysOnLot: number;
  priceHistory: {
    totalDrops: number;
    totalIncrease: number;
    firstPrice: number | null;
    currentPrice: number;
    biggestDrop: number;
    mostRecentChange: {
      amount: number;
      date: string;
    } | null;
  };
  msrpComparison?: {
    baseMsrp: number;
    combinedMsrp: number;
    currentPrice: number;
    discountAmount: number;
    discountPercent: number;
  };
  marketStats: {
    averagePrice: number;
    averageMiles: number;
    sampleSize: number;
  };
}

export interface MarketTrends {
  make: string;
  model: string;
  year?: number;
  stats: {
    averagePrice: number;
    priceRange: {
      min: number;
      max: number;
      median: number;
    };
    averageMileage: number;
    mileageRange: {
      min: number;
      max: number;
      median: number;
    };
    daysOnMarket: {
      average: number;
      median: number;
    };
    activeListings: number;
  };
  priceTrend: 'increasing' | 'decreasing' | 'stable';
  trendDetails?: {
    changePercent: number;
    changeAmount: number;
  };
}

export interface DashboardAnalytics {
  overview: {
    totalActiveListings: number;
    averageDaysOnMarket: number;
    totalListingValue: number;
  };
  topMakes: Array<{
    make: string;
    count: number;
    averagePrice: number;
  }>;
  topModels: Array<{
    make: string;
    model: string;
    count: number;
    averagePrice: number;
  }>;
  priceDistribution: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;
  conditionBreakdown: Array<{
    condition: string;
    count: number;
    averagePrice: number;
  }>;
}

/**
 * Get comprehensive insights for a specific listing
 */
export async function getListingInsights(
  db: D1Database,
  cache: KVNamespace,
  vin: string
): Promise<ListingInsights | null> {
  const cacheKey = `insights:${vin}`;

  // Check cache first (30 minutes TTL)
  const cached = await cache.get(cacheKey, 'json');
  if (cached) {
    return cached as ListingInsights;
  }

  const orm = drizzle(db, { schema });

  // Get the listing
  const listing = await orm.query.listings.findFirst({
    where: eq(schema.listings.vin, vin),
  });

  if (!listing || !listing.isActive) {
    return null;
  }

  // Get price history
  const priceHistory = await orm
    .select()
    .from(schema.listingPriceHistory)
    .where(eq(schema.listingPriceHistory.vin, vin))
    .orderBy(desc(schema.listingPriceHistory.recordedAt));

  // Calculate price history stats
  const priceHistoryStats = calculatePriceHistoryStats(listing, priceHistory);

  // Get market stats for comparison
  const marketStats = await getMarketStatsForListing(orm, listing);

  // Calculate deal score factors
  const priceVsMarket = marketStats.averagePrice > 0
    ? ((listing.price - marketStats.averagePrice) / marketStats.averagePrice) * 100
    : 0;

  const mileageVsMarket = marketStats.averageMiles > 0
    ? ((listing.miles - marketStats.averageMiles) / marketStats.averageMiles) * 100
    : 0;

  const daysOnLot = calculateDaysOnLot(listing.firstSeenAt);

  const dealScoreFactors: DealScoreFactors = {
    priceVsMarket,
    mileageVsMarket,
    daysOnLot,
    totalPriceDrops: priceHistoryStats.totalDrops,
    recentPriceDropAmount: Math.abs(priceHistoryStats.mostRecentChange?.amount || 0),
  };

  // Add MSRP discount if available
  if (listing.combinedMsrp && listing.price) {
    dealScoreFactors.msrpDiscount = ((listing.combinedMsrp - listing.price) / listing.combinedMsrp) * 100;
  }

  const dealScore = calculateDealScore(dealScoreFactors);
  const marketPosition = getMarketPosition(priceVsMarket);
  const priceComparison = formatPriceDifference(listing.price - marketStats.averagePrice);

  // Build MSRP comparison
  let msrpComparison;
  if (listing.baseMsrp && listing.combinedMsrp && listing.price) {
    const discountAmount = listing.combinedMsrp - listing.price;
    const discountPercent = (discountAmount / listing.combinedMsrp) * 100;

    msrpComparison = {
      baseMsrp: listing.baseMsrp,
      combinedMsrp: listing.combinedMsrp,
      currentPrice: listing.price,
      discountAmount,
      discountPercent,
    };
  }

  const insights: ListingInsights = {
    vin,
    dealScore,
    marketPosition,
    priceComparison,
    daysOnLot,
    priceHistory: priceHistoryStats,
    msrpComparison,
    marketStats,
  };

  // Cache for 30 minutes
  await cache.put(cacheKey, JSON.stringify(insights), { expirationTtl: 1800 });

  return insights;
}

/**
 * Get market trends for a specific make/model/year combination
 */
export async function getMarketTrends(
  db: D1Database,
  cache: KVNamespace,
  make: string,
  model: string,
  year?: number
): Promise<MarketTrends | null> {
  const cacheKey = `trends:${make}:${model}:${year || 'all'}`;

  // Check cache (1 hour TTL)
  const cached = await cache.get(cacheKey, 'json');
  if (cached) {
    return cached as MarketTrends;
  }

  const orm = drizzle(db, { schema });

  // Build where conditions
  const conditions = [
    eq(schema.listings.isActive, 1),
    eq(schema.listings.make, make),
    eq(schema.listings.model, model),
  ];

  if (year) {
    conditions.push(eq(schema.listings.year, year));
  }

  // Get all matching listings
  const listings = await orm
    .select()
    .from(schema.listings)
    .where(and(...conditions));

  if (listings.length === 0) {
    return null;
  }

  // Calculate statistics
  const prices = listings.map(l => l.price).filter(p => p !== null) as number[];
  const mileages = listings.map(l => l.miles).filter(m => m !== null) as number[];

  // Calculate days on market for each listing
  const daysOnMarketArray = listings.map(l => calculateDaysOnLot(l.firstSeenAt));

  const stats = {
    averagePrice: average(prices),
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      median: median(prices),
    },
    averageMileage: average(mileages),
    mileageRange: {
      min: Math.min(...mileages),
      max: Math.max(...mileages),
      median: median(mileages),
    },
    daysOnMarket: {
      average: average(daysOnMarketArray),
      median: median(daysOnMarketArray),
    },
    activeListings: listings.length,
  };

  // Determine price trend by analyzing price history
  const priceTrendResult = await analyzePriceTrend(orm, make, model, year);

  const trends: MarketTrends = {
    make,
    model,
    year,
    stats,
    priceTrend: priceTrendResult.trend,
    trendDetails: priceTrendResult.details,
  };

  // Cache for 1 hour
  await cache.put(cacheKey, JSON.stringify(trends), { expirationTtl: 3600 });

  return trends;
}

/**
 * Get dashboard analytics with aggregate statistics
 */
export async function getDashboardAnalytics(
  db: D1Database,
  cache: KVNamespace
): Promise<DashboardAnalytics> {
  const cacheKey = 'analytics:dashboard';

  // Check cache (15 minutes TTL)
  const cached = await cache.get(cacheKey, 'json');
  if (cached) {
    return cached as DashboardAnalytics;
  }

  const orm = drizzle(db, { schema });

  // Overview stats
  const [overviewResult] = await orm
    .select({
      totalActiveListings: count(),
      totalListingValue: sql<number>`SUM(price)`,
      averageDaysOnMarket: sql<number>`AVG(julianday('now') - julianday(first_seen_at))`,
    })
    .from(schema.listings)
    .where(eq(schema.listings.isActive, 1));

  // Top makes
  const topMakes = await orm
    .select({
      make: schema.listings.make,
      count: sql<number>`count(*)`,
      averagePrice: sql<number>`AVG(price)`,
    })
    .from(schema.listings)
    .where(eq(schema.listings.isActive, 1))
    .groupBy(schema.listings.make)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Top models
  const topModels = await orm
    .select({
      make: schema.listings.make,
      model: schema.listings.model,
      count: sql<number>`count(*)`,
      averagePrice: sql<number>`AVG(price)`,
    })
    .from(schema.listings)
    .where(eq(schema.listings.isActive, 1))
    .groupBy(schema.listings.make, schema.listings.model)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Price distribution
  const priceSegments = [
    { segment: 'Under $20k', min: 0, max: 20000 },
    { segment: '$20k - $40k', min: 20000, max: 40000 },
    { segment: '$40k - $60k', min: 40000, max: 60000 },
    { segment: '$60k - $80k', min: 60000, max: 80000 },
    { segment: '$80k+', min: 80000, max: Number.MAX_SAFE_INTEGER },
  ];

  const priceDistribution = await Promise.all(
    priceSegments.map(async segment => {
      const [result] = await orm
        .select({ count: sql<number>`count(*)` })
        .from(schema.listings)
        .where(
          and(
            eq(schema.listings.isActive, 1),
            gte(schema.listings.price, segment.min),
            lte(schema.listings.price, segment.max)
          )
        );

      return {
        segment: segment.segment,
        count: result.count,
        percentage: (result.count / overviewResult.totalActiveListings) * 100,
      };
    })
  );

  // Condition breakdown
  const conditionBreakdown = await orm
    .select({
      condition: schema.listings.condition,
      count: sql<number>`count(*)`,
      averagePrice: sql<number>`AVG(price)`,
    })
    .from(schema.listings)
    .where(eq(schema.listings.isActive, 1))
    .groupBy(schema.listings.condition);

  const analytics: DashboardAnalytics = {
    overview: {
      totalActiveListings: overviewResult.totalActiveListings,
      averageDaysOnMarket: Math.round(overviewResult.averageDaysOnMarket),
      totalListingValue: overviewResult.totalListingValue,
    },
    topMakes: topMakes.map(m => ({
      make: m.make,
      count: m.count,
      averagePrice: Math.round(m.averagePrice),
    })),
    topModels: topModels.map(m => ({
      make: m.make,
      model: m.model,
      count: m.count,
      averagePrice: Math.round(m.averagePrice),
    })),
    priceDistribution,
    conditionBreakdown: conditionBreakdown.map(c => ({
      condition: c.condition || 'unknown',
      count: c.count,
      averagePrice: Math.round(c.averagePrice),
    })),
  };

  // Cache for 15 minutes
  await cache.put(cacheKey, JSON.stringify(analytics), { expirationTtl: 900 });

  return analytics;
}

/**
 * Helper: Calculate price history statistics
 */
function calculatePriceHistoryStats(listing: Listing, history: any[]) {
  let totalDrops = 0;
  let totalIncrease = 0;
  let biggestDrop = 0;
  let mostRecentChange = null;

  if (history.length > 0) {
    // Sort by date ascending
    const sortedHistory = [...history].sort((a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    // Calculate changes
    for (let i = 1; i < sortedHistory.length; i++) {
      const change = sortedHistory[i].price - sortedHistory[i - 1].price;

      if (change < 0) {
        totalDrops++;
        if (Math.abs(change) > Math.abs(biggestDrop)) {
          biggestDrop = change;
        }
      } else if (change > 0) {
        totalIncrease++;
      }
    }

    // Most recent change
    if (sortedHistory.length >= 2) {
      const latest = sortedHistory[sortedHistory.length - 1];
      const previous = sortedHistory[sortedHistory.length - 2];
      mostRecentChange = {
        amount: latest.price - previous.price,
        date: latest.recordedAt,
      };
    }
  }

  return {
    totalDrops,
    totalIncrease,
    firstPrice: history.length > 0 ? history[history.length - 1].price : null,
    currentPrice: listing.price,
    biggestDrop,
    mostRecentChange,
  };
}

/**
 * Helper: Get market stats for a listing
 */
async function getMarketStatsForListing(orm: ReturnType<typeof drizzle>, listing: Listing) {
  // Get similar vehicles (same make, model, within 1 year)
  const similarVehicles = await orm
    .select({
      price: schema.listings.price,
      miles: schema.listings.miles,
    })
    .from(schema.listings)
    .where(
      and(
        eq(schema.listings.isActive, 1),
        eq(schema.listings.make, listing.make),
        eq(schema.listings.model, listing.model),
        gte(schema.listings.year, listing.year - 1),
        lte(schema.listings.year, listing.year + 1)
      )
    );

  const prices = similarVehicles.map(v => v.price).filter(p => p !== null) as number[];
  const mileages = similarVehicles.map(v => v.miles).filter(m => m !== null) as number[];

  return {
    averagePrice: prices.length > 0 ? average(prices) : 0,
    averageMiles: mileages.length > 0 ? average(mileages) : 0,
    sampleSize: similarVehicles.length,
  };
}

/**
 * Helper: Calculate days on lot
 */
function calculateDaysOnLot(firstSeenAt: string): number {
  const firstSeen = new Date(firstSeenAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - firstSeen.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Helper: Analyze price trend over time
 */
async function analyzePriceTrend(
  orm: ReturnType<typeof drizzle>,
  make: string,
  model: string,
  year?: number
): Promise<{ trend: 'increasing' | 'decreasing' | 'stable'; details?: { changePercent: number; changeAmount: number } }> {
  // Get price history for the last 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const conditions = [
    eq(schema.listings.make, make),
    eq(schema.listings.model, model),
  ];

  if (year) {
    conditions.push(eq(schema.listings.year, year));
  }

  // Get current average
  const currentListings = await orm
    .select({ price: schema.listings.price })
    .from(schema.listings)
    .where(and(...conditions, eq(schema.listings.isActive, 1)));

  const currentPrices = currentListings.map(l => l.price).filter(p => p !== null) as number[];
  const currentAvg = currentPrices.length > 0 ? average(currentPrices) : 0;

  // Get historical average from price history
  const historicalPrices = await orm
    .select({ price: schema.listingPriceHistory.price })
    .from(schema.listingPriceHistory)
    .where(
      sql`recorded_at < datetime('now', '-30 days')`
    )
    .limit(100);

  const histPrices = historicalPrices.map(h => h.price).filter(p => p !== null) as number[];
  const historicalAvg = histPrices.length > 0 ? average(histPrices) : 0;

  if (historicalAvg === 0 || currentAvg === 0) {
    return { trend: 'stable' };
  }

  const changeAmount = currentAvg - historicalAvg;
  const changePercent = (changeAmount / historicalAvg) * 100;

  if (changePercent > 5) {
    return { trend: 'increasing', details: { changePercent, changeAmount } };
  } else if (changePercent < -5) {
    return { trend: 'decreasing', details: { changePercent, changeAmount } };
  }

  return { trend: 'stable', details: { changePercent, changeAmount } };
}

/**
 * Helper: Calculate average
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
}

/**
 * Helper: Calculate median
 */
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

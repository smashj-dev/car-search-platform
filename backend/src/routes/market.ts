import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { getMarketTrends, getDashboardAnalytics } from '../services/analytics';

export const marketRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/market/trends
 *
 * Returns market trends for a specific make/model/year combination:
 * - Average price
 * - Price range (min, max, median)
 * - Average mileage
 * - Days on market statistics
 * - Active listings count
 * - Price trend (increasing/decreasing/stable)
 *
 * Query params:
 * - make (required): Vehicle make
 * - model (required): Vehicle model
 * - year (optional): Vehicle year
 */
const trendsSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().optional(),
});

marketRouter.get('/trends', zValidator('query', trendsSchema), async (c) => {
  const params = c.req.valid('query');

  try {
    const trends = await getMarketTrends(
      c.env.DB,
      c.env.CACHE,
      params.make,
      params.model,
      params.year
    );

    if (!trends) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No market data available for the specified vehicle',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: trends,
    });
  } catch (error: any) {
    console.error('Market trends error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to calculate market trends',
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/market/analytics
 *
 * Returns aggregate analytics dashboard data:
 * - Total active listings
 * - Average days on market
 * - Most common makes/models
 * - Price distribution by segments
 * - Condition breakdown
 */
marketRouter.get('/analytics', async (c) => {
  try {
    const analytics = await getDashboardAnalytics(c.env.DB, c.env.CACHE);

    return c.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to calculate analytics',
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/market/overview
 *
 * Returns a quick market overview with key metrics.
 * This is a lighter version of /analytics for dashboard previews.
 */
marketRouter.get('/overview', async (c) => {
  try {
    const analytics = await getDashboardAnalytics(c.env.DB, c.env.CACHE);

    // Return just the overview section for quick loading
    return c.json({
      success: true,
      data: {
        overview: analytics.overview,
        topMakes: analytics.topMakes.slice(0, 5),
        priceDistribution: analytics.priceDistribution,
      },
    });
  } catch (error: any) {
    console.error('Market overview error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to load market overview',
        },
      },
      500
    );
  }
});

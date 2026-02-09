import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getListingInsights } from '../services/analytics';

export const listingInsightsRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/listings/:vin/insights
 *
 * Returns comprehensive deal analysis for a specific listing:
 * - Deal score (1-10)
 * - Market position
 * - Price comparison vs market average
 * - Days on lot
 * - Price drop history
 * - MSRP comparison (if available)
 */
listingInsightsRouter.get('/:vin/insights', async (c) => {
  const vin = c.req.param('vin');

  try {
    const insights = await getListingInsights(c.env.DB, c.env.CACHE, vin);

    if (!insights) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Listing not found or inactive',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    console.error('Insights error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to calculate insights',
        },
      },
      500
    );
  }
});

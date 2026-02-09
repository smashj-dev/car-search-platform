/**
 * Analytics API Usage Examples
 *
 * Example TypeScript code showing how to use the analytics endpoints
 * from a frontend application.
 */

// Type definitions for API responses
interface DealScore {
  score: number;
  grade: 'exceptional' | 'great' | 'good' | 'fair' | 'below_average';
  breakdown: {
    priceScore: number;
    mileageScore: number;
    daysOnLotScore: number;
    priceDropScore: number;
    msrpScore?: number;
  };
  reasoning: string[];
}

interface ListingInsights {
  vin: string;
  dealScore: DealScore;
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

interface MarketTrends {
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

interface DashboardAnalytics {
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

// API client
const API_BASE = '/api/v1';

/**
 * Example 1: Get deal insights for a listing
 */
async function showListingInsights(vin: string) {
  try {
    const response = await fetch(`${API_BASE}/listings/${vin}/insights`);
    const { data } = await response.json() as { success: boolean; data: ListingInsights };

    console.log('=== Deal Analysis ===');
    console.log(`VIN: ${data.vin}`);
    console.log(`\nDeal Score: ${data.dealScore.score}/10 (${data.dealScore.grade})`);
    console.log(`Market Position: ${data.priceComparison}`);
    console.log(`Days on Lot: ${data.daysOnLot} days`);

    console.log('\nScore Breakdown:');
    console.log(`  Price: ${data.dealScore.breakdown.priceScore.toFixed(1)}`);
    console.log(`  Mileage: ${data.dealScore.breakdown.mileageScore.toFixed(1)}`);
    console.log(`  Days on Lot: ${data.dealScore.breakdown.daysOnLotScore.toFixed(1)}`);
    console.log(`  Price Drops: ${data.dealScore.breakdown.priceDropScore.toFixed(1)}`);
    if (data.dealScore.breakdown.msrpScore) {
      console.log(`  MSRP Discount: ${data.dealScore.breakdown.msrpScore.toFixed(1)}`);
    }

    console.log('\nKey Insights:');
    data.dealScore.reasoning.forEach(reason => {
      console.log(`  • ${reason}`);
    });

    if (data.msrpComparison) {
      console.log('\nMSRP Comparison:');
      console.log(`  Original MSRP: $${data.msrpComparison.combinedMsrp.toLocaleString()}`);
      console.log(`  Current Price: $${data.msrpComparison.currentPrice.toLocaleString()}`);
      console.log(`  Discount: ${data.msrpComparison.discountPercent.toFixed(1)}% ($${data.msrpComparison.discountAmount.toLocaleString()})`);
    }

    if (data.priceHistory.totalDrops > 0) {
      console.log('\nPrice History:');
      console.log(`  Total Drops: ${data.priceHistory.totalDrops}`);
      console.log(`  First Price: $${data.priceHistory.firstPrice?.toLocaleString()}`);
      console.log(`  Current Price: $${data.priceHistory.currentPrice.toLocaleString()}`);
      console.log(`  Biggest Drop: $${Math.abs(data.priceHistory.biggestDrop).toLocaleString()}`);
    }

    console.log('\nMarket Comparison:');
    console.log(`  Average Price: $${data.marketStats.averagePrice.toLocaleString()}`);
    console.log(`  Average Miles: ${data.marketStats.averageMiles.toLocaleString()}`);
    console.log(`  Sample Size: ${data.marketStats.sampleSize} similar vehicles`);

  } catch (error) {
    console.error('Error fetching insights:', error);
  }
}

/**
 * Example 2: Get market trends
 */
async function showMarketTrends(make: string, model: string, year?: number) {
  try {
    const params = new URLSearchParams({ make, model });
    if (year) params.append('year', year.toString());

    const response = await fetch(`${API_BASE}/market/trends?${params}`);
    const { data } = await response.json() as { success: boolean; data: MarketTrends };

    console.log(`\n=== Market Trends: ${data.make} ${data.model} ${data.year || 'All Years'} ===`);

    console.log('\nActive Listings:', data.stats.activeListings);

    console.log('\nPrice Statistics:');
    console.log(`  Average: $${data.stats.averagePrice.toLocaleString()}`);
    console.log(`  Range: $${data.stats.priceRange.min.toLocaleString()} - $${data.stats.priceRange.max.toLocaleString()}`);
    console.log(`  Median: $${data.stats.priceRange.median.toLocaleString()}`);

    console.log('\nMileage Statistics:');
    console.log(`  Average: ${data.stats.averageMileage.toLocaleString()} miles`);
    console.log(`  Range: ${data.stats.mileageRange.min.toLocaleString()} - ${data.stats.mileageRange.max.toLocaleString()} miles`);
    console.log(`  Median: ${data.stats.mileageRange.median.toLocaleString()} miles`);

    console.log('\nTime on Market:');
    console.log(`  Average: ${data.stats.daysOnMarket.average} days`);
    console.log(`  Median: ${data.stats.daysOnMarket.median} days`);

    console.log(`\nPrice Trend: ${data.priceTrend.toUpperCase()}`);
    if (data.trendDetails) {
      const direction = data.trendDetails.changePercent > 0 ? 'increased' : 'decreased';
      console.log(`  Prices have ${direction} by ${Math.abs(data.trendDetails.changePercent).toFixed(1)}%`);
      console.log(`  That's ${Math.abs(data.trendDetails.changeAmount).toLocaleString()} dollars on average`);
    }

  } catch (error) {
    console.error('Error fetching market trends:', error);
  }
}

/**
 * Example 3: Get dashboard analytics
 */
async function showDashboardAnalytics() {
  try {
    const response = await fetch(`${API_BASE}/market/analytics`);
    const { data } = await response.json() as { success: boolean; data: DashboardAnalytics };

    console.log('\n=== Market Dashboard ===');

    console.log('\nOverview:');
    console.log(`  Total Active Listings: ${data.overview.totalActiveListings.toLocaleString()}`);
    console.log(`  Average Days on Market: ${data.overview.averageDaysOnMarket} days`);
    console.log(`  Total Listing Value: $${(data.overview.totalListingValue / 1000000).toFixed(1)}M`);

    console.log('\nTop 5 Makes:');
    data.topMakes.slice(0, 5).forEach((make, i) => {
      console.log(`  ${i + 1}. ${make.make}: ${make.count} listings ($${make.averagePrice.toLocaleString()} avg)`);
    });

    console.log('\nTop 5 Models:');
    data.topModels.slice(0, 5).forEach((model, i) => {
      console.log(`  ${i + 1}. ${model.make} ${model.model}: ${model.count} listings ($${model.averagePrice.toLocaleString()} avg)`);
    });

    console.log('\nPrice Distribution:');
    data.priceDistribution.forEach(segment => {
      const bar = '█'.repeat(Math.round(segment.percentage / 2));
      console.log(`  ${segment.segment.padEnd(15)}: ${bar} ${segment.percentage.toFixed(1)}% (${segment.count.toLocaleString()})`);
    });

    console.log('\nCondition Breakdown:');
    data.conditionBreakdown.forEach(condition => {
      console.log(`  ${condition.condition.padEnd(10)}: ${condition.count.toLocaleString()} listings ($${condition.averagePrice.toLocaleString()} avg)`);
    });

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
  }
}

/**
 * Example 4: React component using the insights
 */
function ListingDetailCard({ vin }: { vin: string }) {
  const [insights, setInsights] = React.useState<ListingInsights | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadInsights() {
      try {
        const response = await fetch(`${API_BASE}/listings/${vin}/insights`);
        const { data } = await response.json();
        setInsights(data);
      } catch (error) {
        console.error('Failed to load insights:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, [vin]);

  if (loading) return <div>Loading deal analysis...</div>;
  if (!insights) return <div>No insights available</div>;

  // Get deal badge color
  const getBadgeColor = (grade: string) => {
    switch (grade) {
      case 'exceptional': return 'bg-green-500';
      case 'great': return 'bg-blue-500';
      case 'good': return 'bg-yellow-500';
      case 'fair': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Deal Score Badge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-3xl font-bold">{insights.dealScore.score}/10</div>
          <div className={`inline-block px-3 py-1 rounded-full text-white text-sm ${getBadgeColor(insights.dealScore.grade)}`}>
            {insights.dealScore.grade.toUpperCase()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Market Position</div>
          <div className="text-lg font-semibold">{insights.priceComparison}</div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="border-t pt-4 mb-4">
        <h3 className="font-semibold mb-2">Why this is a good deal:</h3>
        <ul className="space-y-1">
          {insights.dealScore.reasoning.map((reason, i) => (
            <li key={i} className="text-sm text-gray-700">• {reason}</li>
          ))}
        </ul>
      </div>

      {/* Price History */}
      {insights.priceHistory.totalDrops > 0 && (
        <div className="border-t pt-4 mb-4">
          <h3 className="font-semibold mb-2">Price History</h3>
          <div className="text-sm">
            <div>Price dropped {insights.priceHistory.totalDrops} times</div>
            <div>
              From ${insights.priceHistory.firstPrice?.toLocaleString()} to $
              {insights.priceHistory.currentPrice.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* MSRP Comparison */}
      {insights.msrpComparison && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">MSRP Discount</h3>
          <div className="text-sm">
            <div>Original MSRP: ${insights.msrpComparison.combinedMsrp.toLocaleString()}</div>
            <div className="text-green-600 font-semibold">
              Save {insights.msrpComparison.discountPercent.toFixed(1)}% ($
              {insights.msrpComparison.discountAmount.toLocaleString()})
            </div>
          </div>
        </div>
      )}

      {/* Days on Lot */}
      <div className="mt-4 text-xs text-gray-500">
        On lot for {insights.daysOnLot} days
      </div>
    </div>
  );
}

/**
 * Example 5: Market comparison widget
 */
function MarketComparisonWidget({ make, model, year }: { make: string; model: string; year?: number }) {
  const [trends, setTrends] = React.useState<MarketTrends | null>(null);

  React.useEffect(() => {
    async function loadTrends() {
      const params = new URLSearchParams({ make, model });
      if (year) params.append('year', year.toString());

      const response = await fetch(`${API_BASE}/market/trends?${params}`);
      const { data } = await response.json();
      setTrends(data);
    }

    loadTrends();
  }, [make, model, year]);

  if (!trends) return <div>Loading market data...</div>;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Market Insights</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Average Price</div>
          <div className="font-semibold">${trends.stats.averagePrice.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500">Active Listings</div>
          <div className="font-semibold">{trends.stats.activeListings}</div>
        </div>
        <div>
          <div className="text-gray-500">Avg Days on Market</div>
          <div className="font-semibold">{trends.stats.daysOnMarket.average} days</div>
        </div>
        <div>
          <div className="text-gray-500">Price Trend</div>
          <div className={`font-semibold ${
            trends.priceTrend === 'decreasing' ? 'text-green-600' :
            trends.priceTrend === 'increasing' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {trends.priceTrend === 'decreasing' ? '↓' :
             trends.priceTrend === 'increasing' ? '↑' : '→'}
            {trends.priceTrend}
          </div>
        </div>
      </div>

      {trends.trendDetails && (
        <div className="mt-3 pt-3 border-t text-xs text-gray-600">
          Prices have {trends.trendDetails.changePercent > 0 ? 'increased' : 'decreased'} by{' '}
          {Math.abs(trends.trendDetails.changePercent).toFixed(1)}% in the last 30 days
        </div>
      )}
    </div>
  );
}

// Run examples
if (typeof process !== 'undefined' && process.argv) {
  // Example usage
  console.log('Analytics API Usage Examples\n');

  // Example VIN (replace with real VIN in production)
  const exampleVin = '1HGCM82633A004352';

  showListingInsights(exampleVin);
  showMarketTrends('Tesla', 'Model 3', 2024);
  showDashboardAnalytics();
}

// Export for use in frontend
export {
  showListingInsights,
  showMarketTrends,
  showDashboardAnalytics,
  ListingDetailCard,
  MarketComparisonWidget,
};

export type {
  DealScore,
  ListingInsights,
  MarketTrends,
  DashboardAnalytics,
};

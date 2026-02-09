/**
 * Deal Score Algorithm
 *
 * Calculates a deal score (1-10) based on multiple factors:
 * - Price vs market average
 * - Mileage vs market average
 * - Days on lot (longer = better deal potential)
 * - Price drop history (recent drops = motivated seller)
 */

export interface DealScoreFactors {
  priceVsMarket: number; // Percentage difference from market average
  mileageVsMarket: number; // Percentage difference from market average
  daysOnLot: number;
  totalPriceDrops: number;
  recentPriceDropAmount: number; // Amount of most recent drop
  msrpDiscount?: number; // Percentage discount from MSRP
}

export interface DealScoreResult {
  score: number; // 1-10
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

/**
 * Calculate deal score based on multiple factors
 */
export function calculateDealScore(factors: DealScoreFactors): DealScoreResult {
  const breakdown = {
    priceScore: calculatePriceScore(factors.priceVsMarket),
    mileageScore: calculateMileageScore(factors.mileageVsMarket),
    daysOnLotScore: calculateDaysOnLotScore(factors.daysOnLot),
    priceDropScore: calculatePriceDropScore(factors.totalPriceDrops, factors.recentPriceDropAmount),
    msrpScore: factors.msrpDiscount ? calculateMsrpScore(factors.msrpDiscount) : undefined,
  };

  // Weighted average of scores
  const weights = {
    price: 0.40,     // Most important
    mileage: 0.20,
    daysOnLot: 0.15,
    priceDrop: 0.15,
    msrp: 0.10,      // Only if available
  };

  let totalWeight = weights.price + weights.mileage + weights.daysOnLot + weights.priceDrop;
  let rawScore =
    breakdown.priceScore * weights.price +
    breakdown.mileageScore * weights.mileage +
    breakdown.daysOnLotScore * weights.daysOnLot +
    breakdown.priceDropScore * weights.priceDrop;

  if (breakdown.msrpScore !== undefined) {
    totalWeight += weights.msrp;
    rawScore += breakdown.msrpScore * weights.msrp;
  }

  // Normalize to 1-10 scale
  const score = Math.round((rawScore / totalWeight) * 10) / 10;

  // Determine grade
  let grade: DealScoreResult['grade'];
  if (score >= 8.5) grade = 'exceptional';
  else if (score >= 7.0) grade = 'great';
  else if (score >= 5.5) grade = 'good';
  else if (score >= 4.0) grade = 'fair';
  else grade = 'below_average';

  // Generate reasoning
  const reasoning: string[] = [];

  if (factors.priceVsMarket <= -10) {
    reasoning.push(`Price is ${Math.abs(factors.priceVsMarket).toFixed(1)}% below market average`);
  } else if (factors.priceVsMarket >= 10) {
    reasoning.push(`Price is ${factors.priceVsMarket.toFixed(1)}% above market average`);
  } else {
    reasoning.push('Price is near market average');
  }

  if (factors.mileageVsMarket <= -15) {
    reasoning.push(`Lower mileage than average (${Math.abs(factors.mileageVsMarket).toFixed(1)}% below)`);
  } else if (factors.mileageVsMarket >= 15) {
    reasoning.push(`Higher mileage than average (${factors.mileageVsMarket.toFixed(1)}% above)`);
  }

  if (factors.daysOnLot >= 60) {
    reasoning.push(`On lot for ${factors.daysOnLot} days - dealer may be motivated`);
  }

  if (factors.totalPriceDrops > 0) {
    reasoning.push(`Price dropped ${factors.totalPriceDrops} time${factors.totalPriceDrops > 1 ? 's' : ''}`);
  }

  if (factors.msrpDiscount && factors.msrpDiscount >= 15) {
    reasoning.push(`${factors.msrpDiscount.toFixed(1)}% discount from MSRP`);
  }

  return {
    score,
    grade,
    breakdown,
    reasoning,
  };
}

/**
 * Price score: Lower than market = better score
 */
function calculatePriceScore(priceVsMarket: number): number {
  // Perfect score at -20% or better
  // Linear scale from -20% (10) to +20% (1)
  if (priceVsMarket <= -20) return 10;
  if (priceVsMarket >= 20) return 1;

  // Linear interpolation
  return 5.5 - (priceVsMarket * 0.225);
}

/**
 * Mileage score: Lower than average = better score
 */
function calculateMileageScore(mileageVsMarket: number): number {
  // Perfect score at -30% or better
  // Linear scale from -30% (10) to +30% (1)
  if (mileageVsMarket <= -30) return 10;
  if (mileageVsMarket >= 30) return 1;

  // Linear interpolation
  return 5.5 - (mileageVsMarket * 0.15);
}

/**
 * Days on lot score: More days = better negotiating position
 */
function calculateDaysOnLotScore(daysOnLot: number): number {
  // 0-14 days: 4 points (fresh listing)
  // 15-30 days: 6 points (normal)
  // 31-60 days: 8 points (good)
  // 61+ days: 10 points (excellent - dealer motivated)

  if (daysOnLot <= 14) return 4;
  if (daysOnLot <= 30) return 6;
  if (daysOnLot <= 60) return 8;
  return 10;
}

/**
 * Price drop score: Recent drops indicate motivated seller
 */
function calculatePriceDropScore(totalDrops: number, recentDropAmount: number): number {
  let score = 5; // Base score

  // Add points for number of drops
  score += Math.min(totalDrops * 1.5, 3);

  // Add points for recent drop amount
  if (recentDropAmount >= 2000) score += 2;
  else if (recentDropAmount >= 1000) score += 1;
  else if (recentDropAmount >= 500) score += 0.5;

  return Math.min(score, 10);
}

/**
 * MSRP discount score: Bigger discount = better score
 */
function calculateMsrpScore(discountPercent: number): number {
  // 0% discount: 5 points (market rate)
  // 10%+ discount: 8 points (good)
  // 20%+ discount: 10 points (excellent)

  if (discountPercent >= 20) return 10;
  if (discountPercent >= 10) return 8;
  if (discountPercent >= 5) return 6.5;
  if (discountPercent >= 0) return 5 + (discountPercent * 0.1);
  return 5 - Math.abs(discountPercent * 0.1); // Negative discount (above MSRP)
}

/**
 * Calculate market position category
 */
export function getMarketPosition(priceVsMarket: number): 'well_below_average' | 'below_average' | 'average' | 'above_average' | 'well_above_average' {
  if (priceVsMarket <= -15) return 'well_below_average';
  if (priceVsMarket <= -5) return 'below_average';
  if (priceVsMarket <= 5) return 'average';
  if (priceVsMarket <= 15) return 'above_average';
  return 'well_above_average';
}

/**
 * Format price difference for display
 */
export function formatPriceDifference(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(absAmount);

  if (amount < 0) {
    return `${formatted} below market average`;
  } else if (amount > 0) {
    return `${formatted} above market average`;
  }
  return 'at market average';
}

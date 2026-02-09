/**
 * Test script for analytics API
 * Run with: npx tsx src/test-analytics.ts
 */

import { calculateDealScore, getMarketPosition, formatPriceDifference } from './utils/deal-score';

console.log('Testing Deal Score Algorithm...\n');

// Test 1: Exceptional deal (below market, low miles, on lot for long time)
console.log('Test 1: Exceptional Deal');
const test1 = calculateDealScore({
  priceVsMarket: -22, // 22% below market
  mileageVsMarket: -15, // 15% below average miles
  daysOnLot: 90, // 3 months on lot
  totalPriceDrops: 2,
  recentPriceDropAmount: 2500,
  msrpDiscount: 25, // 25% off MSRP
});
console.log('Score:', test1.score);
console.log('Grade:', test1.grade);
console.log('Breakdown:', test1.breakdown);
console.log('Reasoning:', test1.reasoning);
console.log('');

// Test 2: Average deal
console.log('Test 2: Average Deal');
const test2 = calculateDealScore({
  priceVsMarket: 2, // 2% above market
  mileageVsMarket: 5, // 5% above average miles
  daysOnLot: 20, // 20 days on lot
  totalPriceDrops: 0,
  recentPriceDropAmount: 0,
});
console.log('Score:', test2.score);
console.log('Grade:', test2.grade);
console.log('Breakdown:', test2.breakdown);
console.log('Reasoning:', test2.reasoning);
console.log('');

// Test 3: Poor deal (above market, high miles, new listing)
console.log('Test 3: Below Average Deal');
const test3 = calculateDealScore({
  priceVsMarket: 18, // 18% above market
  mileageVsMarket: 25, // 25% above average miles
  daysOnLot: 5, // Fresh listing
  totalPriceDrops: 0,
  recentPriceDropAmount: 0,
  msrpDiscount: -5, // 5% above MSRP (dealer markup)
});
console.log('Score:', test3.score);
console.log('Grade:', test3.grade);
console.log('Breakdown:', test3.breakdown);
console.log('Reasoning:', test3.reasoning);
console.log('');

// Test 4: Great deal with recent price drop
console.log('Test 4: Great Deal with Price Drop');
const test4 = calculateDealScore({
  priceVsMarket: -12, // 12% below market
  mileageVsMarket: 0, // Average miles
  daysOnLot: 45, // 1.5 months on lot
  totalPriceDrops: 3,
  recentPriceDropAmount: 3000,
  msrpDiscount: 18, // 18% off MSRP
});
console.log('Score:', test4.score);
console.log('Grade:', test4.grade);
console.log('Breakdown:', test4.breakdown);
console.log('Reasoning:', test4.reasoning);
console.log('');

// Test market position
console.log('Testing Market Position...');
console.log('-20% below market:', getMarketPosition(-20));
console.log('-8% below market:', getMarketPosition(-8));
console.log('0% from market:', getMarketPosition(0));
console.log('+8% above market:', getMarketPosition(8));
console.log('+20% above market:', getMarketPosition(20));
console.log('');

// Test price difference formatting
console.log('Testing Price Difference Formatting...');
console.log('$3200 below:', formatPriceDifference(-3200));
console.log('$1500 above:', formatPriceDifference(1500));
console.log('$0 difference:', formatPriceDifference(0));

console.log('\nAll tests completed!');

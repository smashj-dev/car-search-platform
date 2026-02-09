/**
 * VIN Decoder Test Script
 * Run this locally to test VIN validation and decoding
 */

import { validateVIN, parseVINBasics } from './src/utils/vin-validator';

// Test VINs (real examples)
const testVINs = [
  { vin: '1HGBH41JXMN109186', description: 'Honda Accord 2021 - Valid' },
  { vin: '5YJ3E1EA5LF123456', description: 'Tesla Model 3 2020 - Valid' },
  { vin: '1FTFW1E84MFA12345', description: 'Ford F-150 2021 - Valid' },
  { vin: '2T3P1RFV9NC123456', description: 'Toyota RAV4 2022 - Valid' },
  { vin: '1GCUYDE88NF123456', description: 'Chevrolet Silverado 2021 - Valid' },
  { vin: '1HGBH41JXMN10918', description: 'Too short - Invalid' },
  { vin: '1HGBH41JXMN1091866', description: 'Too long - Invalid' },
  { vin: '1OGBH41JXMN109186', description: 'Contains O - Invalid' },
  { vin: '1HGBH41JXMN109187', description: 'Check digit mismatch - Invalid' },
];

console.log('='.repeat(80));
console.log('VIN DECODER TEST SUITE');
console.log('='.repeat(80));
console.log();

// Test 1: VIN Validation
console.log('TEST 1: VIN Validation');
console.log('-'.repeat(80));
for (const test of testVINs) {
  const result = validateVIN(test.vin);
  const status = result.isValid ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} | ${test.vin.padEnd(20)} | ${test.description}`);
  if (!result.isValid) {
    console.log(`      Errors: ${result.errors.join(', ')}`);
  }
}
console.log();

// Test 2: Parse VIN Basics
console.log('TEST 2: Parse VIN Basics');
console.log('-'.repeat(80));
const validVINs = testVINs.filter(t => validateVIN(t.vin).isValid);
for (const test of validVINs) {
  const basics = parseVINBasics(test.vin);
  if (basics) {
    console.log(`VIN: ${test.vin}`);
    console.log(`  WMI (Manufacturer): ${basics.wmi}`);
    console.log(`  Model Year: ${basics.modelYear}`);
    console.log(`  Plant Code: ${basics.plantCode}`);
    console.log(`  Sequential Number: ${basics.sequentialNumber}`);
    console.log();
  }
}

// Test 3: NHTSA API Call Example
console.log('TEST 3: NHTSA API Example Call');
console.log('-'.repeat(80));
console.log('To test the NHTSA API, run:');
console.log();
console.log('curl "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/1HGBH41JXMN109186?format=json"');
console.log();
console.log('Or use the API endpoint:');
console.log();
console.log('curl http://localhost:8787/api/v1/vin/decode/1HGBH41JXMN109186');
console.log();

// Test 4: Validation Performance
console.log('TEST 4: Validation Performance');
console.log('-'.repeat(80));
const iterations = 10000;
const startTime = Date.now();
for (let i = 0; i < iterations; i++) {
  validateVIN('1HGBH41JXMN109186');
}
const endTime = Date.now();
const duration = endTime - startTime;
const avgTime = duration / iterations;
console.log(`Validated ${iterations.toLocaleString()} VINs in ${duration}ms`);
console.log(`Average: ${avgTime.toFixed(3)}ms per VIN`);
console.log(`Rate: ${Math.round(iterations / (duration / 1000)).toLocaleString()} VINs/second`);
console.log();

console.log('='.repeat(80));
console.log('TESTS COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('Next steps:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Test API endpoints using curl or Postman');
console.log('3. Check VIN_DECODER_GUIDE.md for full API documentation');
console.log();

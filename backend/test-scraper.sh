#!/bin/bash

# Test script for Cars.com scraper
# Usage: ./test-scraper.sh [API_URL]

API_URL="${1:-http://localhost:8787}"

echo "Testing Cars.com Scraper System"
echo "================================"
echo "API URL: $API_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check scraper status
echo -e "${YELLOW}Test 1: Checking scraper status...${NC}"
response=$(curl -s "$API_URL/api/v1/scraper/status")
if echo "$response" | grep -q '"status":"operational"'; then
    echo -e "${GREEN}✓ Status check passed${NC}"
    echo "$response" | jq .
else
    echo -e "${RED}✗ Status check failed${NC}"
    echo "$response"
fi
echo ""

# Test 2: Trigger immediate scrape for Tesla Model 3
echo -e "${YELLOW}Test 2: Triggering immediate scrape (Tesla Model 3, LA)...${NC}"
response=$(curl -s -X POST "$API_URL/api/v1/scraper/trigger" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Tesla",
    "model": "Model 3",
    "zipCode": "90001",
    "radius": 100
  }')

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Immediate scrape succeeded${NC}"
    echo "$response" | jq .
else
    echo -e "${RED}✗ Immediate scrape failed${NC}"
    echo "$response" | jq .
fi
echo ""

# Test 3: Queue a scrape job
echo -e "${YELLOW}Test 3: Queueing scrape job (Honda Civic, NYC)...${NC}"
response=$(curl -s -X POST "$API_URL/api/v1/scraper/queue" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Honda",
    "model": "Civic",
    "zipCode": "10001",
    "radius": 50
  }')

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Job queued successfully${NC}"
    echo "$response" | jq .
else
    echo -e "${RED}✗ Job queue failed${NC}"
    echo "$response" | jq .
fi
echo ""

# Test 4: Get database stats
echo -e "${YELLOW}Test 4: Fetching database stats...${NC}"
response=$(curl -s "$API_URL/api/v1/scraper/stats")
if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Stats retrieved${NC}"
    echo "$response" | jq .
else
    echo -e "${RED}✗ Stats retrieval failed${NC}"
    echo "$response"
fi
echo ""

# Test 5: Get scraper metrics
echo -e "${YELLOW}Test 5: Fetching scraper metrics (7 days)...${NC}"
response=$(curl -s "$API_URL/api/v1/scraper/metrics?days=7")
if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Metrics retrieved${NC}"
    echo "$response" | jq .
else
    echo -e "${RED}✗ Metrics retrieval failed${NC}"
    echo "$response"
fi
echo ""

# Test 6: Queue multiple jobs (batch test)
echo -e "${YELLOW}Test 6: Queueing multiple jobs (batch test)...${NC}"
success_count=0
fail_count=0

# Array of test cases
declare -a makes=("Toyota" "Ford" "Chevrolet")
declare -a models=("Camry" "F-150" "Silverado")
declare -a zips=("60601" "77001" "85001")

for i in {0..2}; do
    response=$(curl -s -X POST "$API_URL/api/v1/scraper/queue" \
      -H "Content-Type: application/json" \
      -d "{
        \"make\": \"${makes[$i]}\",
        \"model\": \"${models[$i]}\",
        \"zipCode\": \"${zips[$i]}\",
        \"radius\": 75
      }")

    if echo "$response" | grep -q '"success":true'; then
        ((success_count++))
        echo -e "${GREEN}✓${NC} Queued: ${makes[$i]} ${models[$i]} near ${zips[$i]}"
    else
        ((fail_count++))
        echo -e "${RED}✗${NC} Failed: ${makes[$i]} ${models[$i]}"
    fi

    sleep 0.5
done

echo ""
echo "Batch test results: $success_count succeeded, $fail_count failed"
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo "All tests completed. Check the results above."
echo ""
echo "Next steps:"
echo "1. Check worker logs: npx wrangler tail"
echo "2. Monitor queue processing in Cloudflare dashboard"
echo "3. Query database to verify scraped listings"
echo ""

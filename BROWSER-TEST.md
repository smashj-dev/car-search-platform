# Browser Testing Checklist

**Date:** February 4, 2026
**Status:** Ready for Manual Testing

---

## 🌐 URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8790

---

## ✅ Pre-Test Verification (Completed)

### Backend API
- ✅ Health check: `GET /` working
- ✅ Listings endpoint: Returns 8 listings with dealer info
- ✅ Detail endpoint: `GET /api/v1/listings/:vin` working
- ✅ Price history: Returns 2 records for Model S (price drop $76,990 → $74,990)
- ✅ Scraper status: Endpoint operational
- ✅ Filter options: Returns 5 makes (Honda, Jeep, Tesla, Toyota, Volkswagen)
- ✅ Dealer joins: All listings include full dealer object

### Database
- ✅ 8 listings loaded
- ✅ 3 dealers loaded
- ✅ Price history tracking functional

### Code Pushed
- ✅ GitHub repo created: https://github.com/smashj-dev/car-search-platform
- ✅ All 240 files committed and pushed

---

## 🧪 Manual Browser Tests

### 1. Initial Page Load
**Test:** Open http://localhost:5173

**Check:**
- [ ] Page loads without errors
- [ ] Hero section appears with search bar
- [ ] "Featured Listings" section visible
- [ ] 6-8 car cards displayed
- [ ] Car images load (or show placeholder)
- [ ] No console errors in DevTools

**Expected Result:** Clean page load with all listings visible

---

### 2. Car Cards Display
**Test:** Inspect each car card

**Check:**
- [ ] Car title shows: Year + Make + Model (e.g., "2023 Tesla Model S")
- [ ] Price displays correctly formatted (e.g., "$74,990")
- [ ] Specs show: Year, Mileage, Fuel Type
- [ ] Location/dealer info visible
- [ ] Favorite heart icon appears
- [ ] Hover animation works smoothly

**Expected Result:** All 8 cars displayed with complete information

---

### 3. API Network Calls
**Test:** Open DevTools → Network tab, reload page

**Check:**
- [ ] Request to `http://localhost:8790/api/v1/listings?per_page=6`
- [ ] Status code: 200 OK
- [ ] Response contains array of listings
- [ ] Each listing has dealer object
- [ ] No CORS errors
- [ ] Response time < 500ms

**Expected Result:** Successful API call with dealer data included

---

### 4. Car Detail Modal (CRITICAL TEST)
**Test:** Click any car card

**Check:**
- [ ] Modal opens smoothly (no crash)
- [ ] Car title correct: "Year Make Model Trim"
- [ ] VIN number displayed
- [ ] Price shows correctly
- [ ] All specs visible: Year, Mileage, Fuel Type, Transmission
- [ ] Vehicle details section shows: Exterior/Interior Color, Engine, Drivetrain, Condition
- [ ] "View on Cars.com" button present
- [ ] Button links to car.sourceUrl
- [ ] Close button (X) works
- [ ] Click outside modal closes it
- [ ] No console errors

**Expected Result:** Modal displays all listing data without crashing

**Example Data to Verify:**
```
Title: 2023 Tesla Model S Long Range
VIN: 5YJSA1E26HF123456
Price: $74,990
Mileage: 12,500 mi
Dealer: AutoNation Toyota
```

---

### 5. Search Bar (UI Only - Not Connected)
**Test:** Type in search bar

**Check:**
- [ ] Can type in "Make" field
- [ ] Can type in "Model" field
- [ ] Filters button appears
- [ ] Search button present
- [ ] UI responsive

**Known Issue:** Search does not trigger API call yet (needs to be connected)

---

### 6. Filter Modal (UI Only - Not Connected)
**Test:** Click "Filters" button

**Check:**
- [ ] Filter modal opens
- [ ] All filter fields visible: Make, Model, Year Range, Price Range
- [ ] Can interact with all inputs
- [ ] "Apply Filters" button present
- [ ] Modal closes properly

**Known Issue:** Filters do not trigger API call yet (needs to be connected)

---

### 7. Responsive Design
**Test:** Resize browser window

**Check:**
- [ ] Desktop (>1024px): 3 columns of car cards
- [ ] Tablet (768-1024px): 2 columns
- [ ] Mobile (<768px): 1 column
- [ ] Header remains visible and functional
- [ ] Modal adjusts to screen size

---

### 8. Console Error Check
**Test:** Open DevTools → Console

**Check:**
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No CORS errors
- [ ] No 404 errors for API calls

**If errors appear:** Document them for fixing

---

### 9. Favorites (Local State Only)
**Test:** Click heart icon on car cards

**Check:**
- [ ] Heart icon toggles filled/unfilled
- [ ] State persists while on page
- [ ] Multiple cards can be favorited

**Known Issue:** Favorites not saved to backend (local state only)

---

### 10. Navigation & Links
**Test:** Click various UI elements

**Check:**
- [ ] Logo in header (if exists)
- [ ] Menu items (if exist)
- [ ] Footer links (if exist)
- [ ] "View on Cars.com" opens in new tab
- [ ] All links functional

---

## 🐛 Known Issues (Expected)

### Non-Breaking:
1. **Search not connected** - UI only, needs API integration
2. **Filters not connected** - UI only, needs API integration
3. **Favorites not persisted** - Local state only, needs backend
4. **No pagination** - Shows first 6-8 listings only
5. **Placeholder images** - Test data uses example.com URLs
6. **No error handling UI** - Only console.error() on API failure

### If These Occur (Unexpected):
- **Modal crashes on click** → Check if CarDetailModal.tsx rewrite was saved
- **API returns empty array** → Check if database seed data loaded
- **404 on API calls** → Verify backend is on port 8790 (not 8787)
- **Dealer info missing** → Check if dealer LEFT JOIN is in listings.ts

---

## 📊 Success Criteria

### ✅ Passing Grade:
- Page loads without errors
- All 8 listings display
- Modal opens and shows data correctly
- API calls succeed with dealer info
- No console errors

### 🎯 Perfect Score:
- All above +
- Smooth animations
- Fast page load (<2s)
- Responsive on all screen sizes
- Clean, professional UI

---

## 🔧 If Issues Found

### Modal Crash
```bash
# Verify CarDetailModal type fix
cat app/src/components/CarDetailModal.tsx | grep "car: Listing"
```

### API Not Responding
```bash
# Restart backend
cd backend
npm run dev
```

### Database Empty
```bash
# Reload seed data
cd backend
npx wrangler d1 execute car-search-db --local --file=./seed-data.sql
```

### Wrong Port
```bash
# Check API URL in frontend
cat app/src/api/client.ts | grep API_BASE_URL
# Should be: http://localhost:8790/api/v1
```

---

## 🚀 Next Test: Real Scraper

After browser testing passes, test the scraper:

```bash
# Trigger Cars.com scrape
curl -X POST http://localhost:8790/api/v1/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Tesla",
    "model": "Model 3",
    "zipCode": "90001",
    "radius": 50
  }'

# Check if new listings added
curl "http://localhost:8790/api/v1/listings?make=Tesla" | jq '.meta.total'
```

**Expected:** Scraper extracts 10-50 real listings from Cars.com

---

## 📝 Test Results

Fill in after testing:

**Date Tested:** _______________
**Browser:** _______________
**Screen Size:** _______________

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Initial Load | ☐ | ☐ | |
| Car Cards | ☐ | ☐ | |
| API Calls | ☐ | ☐ | |
| Modal Open | ☐ | ☐ | |
| Modal Data | ☐ | ☐ | |
| Search UI | ☐ | ☐ | |
| Filter UI | ☐ | ☐ | |
| Responsive | ☐ | ☐ | |
| Console Clean | ☐ | ☐ | |

**Overall Status:** ☐ PASS | ☐ FAIL

**Issues Found:**
```
(List any issues discovered during testing)
```

**Screenshots:**
```
(Attach screenshots if needed)
```

---

**Ready to test!** Open http://localhost:5173 and follow the checklist above.

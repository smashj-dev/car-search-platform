# Quick Start Guide

**Car Search Platform MVP**

---

## 🚀 Already Running!

Your servers are currently active:
- **Backend:** http://localhost:8790 ✅
- **Frontend:** http://localhost:5173 ✅

---

## 🌐 Open in Browser

```bash
open http://localhost:5173
```

You should see:
- Hero section with search bar
- 6-8 car listings from database
- Click any car to open detail modal

---

## 🧪 Test the API

```bash
# See all listings
curl http://localhost:8790/api/v1/listings | jq

# Filter Tesla cars
curl "http://localhost:8790/api/v1/listings?make=Tesla" | jq

# Get specific car
curl http://localhost:8790/api/v1/listings/5YJSA1E26HF123456 | jq

# Price history
curl http://localhost:8790/api/v1/listings/5YJSA1E26HF123456/history | jq

# Scraper status
curl http://localhost:8790/api/v1/scraper/status | jq
```

---

## 🤖 Test Real Scraper

```bash
# Scrape Tesla Model 3 listings from Cars.com
curl -X POST http://localhost:8790/api/v1/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Tesla",
    "model": "Model 3",
    "zipCode": "90001",
    "radius": 50
  }' | jq

# Check if new listings added
curl "http://localhost:8790/api/v1/listings?make=Tesla" | jq '.meta.total'
```

---

## 🔄 Restart Servers

If needed:

```bash
# Backend
cd backend
npm run dev

# Frontend (new terminal)
cd app
npm run dev
```

---

## 📊 View Database

```bash
cd backend
npx wrangler d1 execute car-search-db --local --command="SELECT make, model, price FROM listings"
```

---

## 🐛 If Something's Wrong

### Frontend not loading?
```bash
cd app
npm run dev
open http://localhost:5173
```

### API not responding?
```bash
cd backend
npm run dev
curl http://localhost:8790/
```

### Database empty?
```bash
cd backend
npx wrangler d1 execute car-search-db --local --file=./seed-data.sql
```

### Modal crashing?
```bash
# Verify type fix
grep "car: Listing" app/src/components/CarDetailModal.tsx
# Should see: "car: Listing | null;"
```

---

## 📁 Key Files

```
backend/
  src/
    index.ts              # Main API server
    routes/listings.ts    # Listings endpoints
    services/scraper-cars-com.ts  # Scraper
    db/schema.ts          # Database schema

app/
  src/
    App.tsx               # Main app
    sections/FeaturedListings.tsx  # Listings display
    components/CarDetailModal.tsx  # Car details
    api/client.ts         # API client (port 8790)
```

---

## 🎯 What to Test

1. **Browser Test:**
   - Open http://localhost:5173
   - Click car cards → modal should open
   - Check DevTools console for errors

2. **Real Scraper:**
   - Run scraper command above
   - Should fetch 10-50 real Cars.com listings
   - Reload frontend to see new listings

3. **API Filters:**
   ```bash
   # By price
   curl "http://localhost:8790/api/v1/listings?price_max=50000" | jq

   # By year
   curl "http://localhost:8790/api/v1/listings?year_min=2023" | jq

   # Sort by miles
   curl "http://localhost:8790/api/v1/listings?sort_by=miles&sort_order=asc" | jq
   ```

---

## 📝 Next Steps

See `DEPLOYMENT-READY.md` for:
- Detailed next steps
- Deployment instructions
- Feature roadmap

---

## 🎉 You're Ready!

Everything is built and working. Just open your browser and start testing!

**Frontend:** http://localhost:5173
**Backend:** http://localhost:8790

For detailed testing checklist, see: `BROWSER-TEST.md`

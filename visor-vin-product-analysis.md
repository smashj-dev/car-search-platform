# Visor VIN Product Analysis Report

**Analysis Date:** February 2, 2026
**Website:** https://visor.vin
**Company:** Currents Systems Inc.
**Tagline:** "See the whole market. (not just pages of listings)"

---

## Executive Summary

Visor VIN is a consumer-focused automotive search platform built by two brothers (Craig and Cole) from Los Altos, CA and Columbus, OH. The platform differentiates itself by prioritizing car buyers over dealers, offering advanced filtering, market analytics, and price tracking that traditional sites like Autotrader and Cars.com lack.

---

## 1. Technical Architecture

### 1.1 Frontend Framework & Build System

| Component | Technology |
|-----------|------------|
| **Build Tool** | Vite (evidenced by `/assets/` URL structure with hash-based cache busting) |
| **UI Framework** | Likely SolidJS or similar (uses server functions pattern `/_serverFn/`) |
| **UI Components** | Radix UI (data-radix-collection-item attributes detected) |
| **Styling** | Tailwind CSS (dark:bg-background classes, font-inter) |
| **Fonts** | Inter (primary), Mulish (secondary via Google Fonts) |
| **Theme** | Dark mode default with light mode support |

### 1.2 JavaScript Assets Structure
```
/assets/main-oN4JZ1bK.js          - Core application bundle
/assets/index-B01513sk.js         - Route/page index
/assets/HomeFooter-BFl_KMHF.js    - Footer component
/assets/AccountPopover-Dc2sv2GP.js - Account menu component
/assets/SavedFavorites-DVom_wX9.js - Saved searches feature
/assets/tags-qA6hK2O8.js          - Tag/filter system
/assets/testimonials-NDqlT_uy.js  - Social proof section
/assets/CountrySwitcher-BIKlRYFQ.js - US/Canada toggle
```

### 1.3 Backend Architecture

| Component | Technology/Pattern |
|-----------|-------------------|
| **API Pattern** | Server Functions (`/_serverFn/{hash}?createServerFn`) |
| **Data API** | REST endpoints (`/api/data/filters`, `/api/data/listings`) |
| **CDN** | Cloudflare (cloudflareinsights, cloudflareimages) |
| **Analytics** | PostHog (tollbooth.visor.vin subdomain, data-posthog-event attributes) |
| **Feature Flags** | PostHog feature flags (`/flags/` endpoint) |
| **Error Tracking** | PostHog exception autocapture |
| **Surveys** | PostHog surveys integration |

### 1.4 API Endpoints Identified

```
GET  /api/data/filters?make={make}&model={model}&agnostic={bool}
POST /_serverFn/{hash}?createServerFn  (multiple hashed endpoints)
POST https://tollbooth.visor.vin/e/     (analytics events)
POST https://tollbooth.visor.vin/flags/ (feature flags)
```

---

## 2. Data Sources & External Integrations

### 2.1 Vehicle Image Sources (Dealer Networks)

Visor aggregates images from multiple dealer inventory systems:

| Source Domain | Provider Type |
|---------------|---------------|
| `pictures.dealer.com` | Dealer.com (Cox Automotive) |
| `vehicle-images.dealerinspire.com` | Dealer Inspire |
| `images.dealer.com` | Dealer.com stock photos |
| `content.homenetiol.com` | HomeNet Automotive |
| `cloudflareimages.dealereprocess.com` | DealerEProcess |
| `media.rti.toyota.com` | Toyota OEM direct |
| `service.secureoffersites.com` | Evox Images (GetEvoxImage API) |
| `stock.visor.vin` | Visor's own stock image CDN |
| Various dealer websites | Direct dealership inventory systems |

### 2.2 Third-Party Services

| Service | Purpose | Domain |
|---------|---------|--------|
| **PostHog** | Analytics, Feature Flags, Surveys | tollbooth.visor.vin |
| **Cloudflare** | CDN, Security, Insights | cloudflareinsights.com |
| **Google Fonts** | Typography (Mulish) | fonts.googleapis.com |
| **OpenStreetMap** | Map tiles/data | OpenStreetMap attribution |
| **CARFAX** | Vehicle history reports | Integration shown in UI |
| **Delivrd** | Vehicle negotiation service | Partner integration |

### 2.3 Likely Backend Data Sources

Based on the data richness and functionality:

1. **Vehicle Listing Aggregation**: Likely pulls from major aggregator APIs or direct dealer feeds
2. **MSRP/Options Data**: Toyota OEM data integration (detailed installed options with pricing)
3. **VIN Decoder**: Full VIN decoding with trim, options, colors
4. **Warranty Data**: Manufacturer warranty databases (time/mileage calculations)
5. **Market Analytics**: Proprietary calculations based on sold listings data

---

## 3. Core Features & Functionality

### 3.1 Search & Filtering System

**Filter Categories:**
- Condition (New, Used, Certified)
- List Price (histogram with slider)
- Total MSRP (Plus feature)
- Mileage (histogram with slider)
- Search Radius / States / Drive Distance / Drive Time
- Days on Lot (histogram)
- Keywords (excludes/includes patterns)
- Model Year / Reliability
- Trim / Version
- Installed Options (Plus feature - with MSRP values)
- Fuel Type / Engine / Cylinders
- Seats / Doors
- Exterior/Interior Color (general + specific)
- Top Features (Plus feature)
- Dealer Type (Franchise/Independent)
- Availability (On Lot/In Transit)
- Drivetrain / Transmission
- Vehicle Type

**Dynamic Filter Behavior:**
- Filters show live inventory counts
- Zero-result filters are hidden/disabled
- Counts update as filters are applied

### 3.2 Pricing & Market Analytics

#### Current Pricing Display:
```
Current Price: $42,991
MSRP w/ options: $44,220 (Toyota logo indicator)
```

**Calculation: MSRP Discount**
```
Discount = MSRP w/ options - List Price
Discount % = (MSRP - Price) / MSRP * 100

Example:
MSRP: $44,220
Price: $42,991
Discount: $1,229 (2.78% below MSRP)
```

#### Days Listed Calculation:
```
Days Listed = Current Date - First Listing Date
Display: "Listed X day(s) ago"
History: Full price change timeline with dates
```

#### Market Velocity Metrics:
```
- Added in past two weeks: 10,419
- Sold in past two weeks: 8,176 (Plus feature)
- Average days for sale: 26
- Market days supply: 54 (Plus feature)
```

#### Per-Listing Market Velocity:
```
- Vehicles sold (same model): 110 nationwide
- Average days for sale: 18 days
- This vehicle: 1 day
- Demand probability: "11% chance this vehicle sells in the next 7 days"
```

### 3.3 Warranty Status Calculator

**Calculation Logic:**
```
Based on:
- Vehicle's current mileage
- Likely original purchase date (estimated from VIN/registration)

Warranty Types Tracked:
1. Basic: Time remaining / Miles remaining (e.g., 2yr 2mo / 28k mi)
2. Powertrain: Time remaining / Miles remaining (e.g., 4yr 2mo / 52k mi)
3. Rust/Corrosion: Time remaining / Unlimited miles
```

### 3.4 Geolocation & Map Features

**Map Technology:** OpenStreetMap

**Search Radius Options:**
- Radius (miles from zip code)
- Drive Distance (actual driving miles)
- Drive Time (minutes/hours)
- State-based filtering

**Map Display:**
- Clustered markers showing inventory count
- Price labels on individual listings
- Pan/zoom to filter by map area

### 3.5 Shipping Estimate Calculator

```
Input: Destination zip code
Output: Estimated shipping cost from dealer to buyer
```

---

## 4. User Flows

### 4.1 Primary Search Flow
```
1. Homepage → Search bar (model, VIN, or "see everything")
2. Command Palette opens with suggestions
3. Select make/model → Filters page
4. Apply filters → Show Listings
5. Listings page with map view option
6. Click listing → Detail modal/page
7. Actions: Favorite, Save, Report, Visit Dealer Site
```

### 4.2 Account Features
```
- Saved Searches (with alerts)
- Favorites (individual vehicles)
- Settings/Preferences
- Visor Plus subscription management
```

### 4.3 Listing Detail Flow
```
1. Vehicle images carousel
2. Key specs (VIN, Color, Drivetrain, Transmission, Engine)
3. Installed Options with MSRP values
4. CARFAX link (Plus feature)
5. Dealer information
6. Delivrd partner integration
7. Pricing section with MSRP comparison
8. History tab (price changes, seller history)
9. Leaderboard tab
10. Deal Check tab (NEW feature)
11. Market Velocity section
12. Warranty Status visualization
13. Shipping Estimate calculator
```

---

## 5. Monetization Model

### 5.1 Visor Plus Subscription
**Pricing:** Starting at $5/month

**Plus Features:**
- Installed Options filter (with MSRP values)
- Top Features filter
- Sold listings data
- Market days supply metrics
- Previous sellers history
- CARFAX integration
- Inventory level metrics
- Advanced market analytics

### 5.2 Partner Integrations
- **Delivrd**: "Hire a professional vehicle negotiator" - likely affiliate/referral revenue

### 5.3 Stated Philosophy
> "This allows Visor to be supported by car buyers rather than car dealers."

No dealer advertising or lead generation revenue model.

---

## 6. UI Components Library

### 6.1 Core Components (Radix UI based)
- Command Palette (search)
- Accordion (filter sections)
- Tabs (Home/Filters/Listings, History/Leaderboard/Deal Check)
- Slider (price/mileage ranges)
- Toggle buttons (filter chips)
- Combobox (zip code input with suggestions)
- Radio groups (search type selection)
- Modal/Dialog (listing details)
- Tooltip (info icons)
- Progress indicators (warranty status bars)

### 6.2 Custom Components
- Histogram bars (price/mileage distribution)
- Map with clustering (OpenStreetMap + custom layer)
- Vehicle cards (image, price, specs, location)
- Market velocity dashboard
- Price history timeline
- Warranty status cards with visual progress

---

## 7. Mobile & Apps

- **iOS App**: Available on App Store (ID: 6742114429)
- **Android App**: Available on Google Play
- **PWA**: Site manifest present (`/site.webmanifest`)

---

## 8. Regional Support

- **US Market**: Primary (🇺🇸)
- **Canada Market**: Supported (🇨🇦)
- Country switcher in footer

---

## 9. Key Differentiators vs. Competitors

| Feature | Visor | Autotrader/Cars.com |
|---------|-------|---------------------|
| Map-based search | Full map with clustering | Zip code radius only |
| Price history | Full timeline | Limited/none |
| Market velocity | Detailed analytics | None |
| MSRP comparison | Yes with options | Limited |
| Warranty calculator | Detailed breakdown | None |
| Dealer lead focus | None (buyer-first) | Primary revenue |
| Ad prioritization | None | Heavy |
| Sold listings data | Yes (Plus) | None |

---

## 10. Technical Observations for Replication

### 10.1 Data Requirements
1. **Listing Aggregation**: Need access to dealer inventory feeds or aggregator APIs
2. **VIN Decoding**: NHTSA API + commercial decoder for options
3. **MSRP Database**: Manufacturer pricing data including options
4. **Warranty Database**: OEM warranty terms by model year
5. **Market Analytics**: Historical sold data (challenging to obtain)
6. **Geolocation**: Zip code database with coordinates

### 10.2 Key Technical Challenges
1. Real-time inventory syncing across thousands of dealers
2. Accurate VIN decoding with installed options
3. Price history tracking (requires continuous monitoring)
4. Sold listings detection (listings disappearing)
5. Map clustering performance at scale (31K+ listings)

### 10.3 Estimated Data Volume
- ~180,000+ Ford F-150 listings nationwide
- ~31,000+ Toyota 4Runner listings
- Likely millions of total active listings
- Historical data for sold vehicles

---

## 11. Appendix: URL Structure

```
/                                    - Homepage
/search/filters?make=X&model=Y       - Filter configuration
/search/listings?make=X&model=Y      - Listings grid/map
/search/listings/{VIN}?make=X&model=Y - Individual listing
/account/saved                       - Saved searches
/account/favorites                   - Favorited vehicles
/account/settings                    - Account settings
/subscribe                           - Visor Plus signup
/redirect/changelog                  - What's new
/redirect/roadmap                    - Product roadmap
/redirect/photos                     - User photo submissions
```

---

## 12. Contact & Company Info

- **Company**: Currents Systems Inc.
- **Founders**: Craig and Cole (brothers)
- **Locations**: Los Altos, CA & Columbus, OH
- **Email**: brothers@visor.vin
- **Social**: LinkedIn, YouTube, Reddit (r/VisorCarSearch)

---

*Report generated from live site analysis on February 2, 2026*

---

## 13. Source Code Analysis (DevTools Inspection)

### 13.1 Confirmed Framework Stack

| Component | Technology | Evidence |
|-----------|------------|----------|
| **Meta-Framework** | TanStack Start | `__TSS_START_OPTIONS__` global, `/_serverFn/` pattern |
| **Router** | TanStack Router | `__TSR_ROUTER__`, `__TSR_ROUTER_CONTEXT__` globals |
| **Build Tool** | Vite | `/assets/` with content-hashed filenames |
| **UI Components** | Radix UI | `data-radix-collection-item` attributes |
| **Analytics** | PostHog | `_POSTHOG_REMOTE_CONFIG`, `tollbooth.visor.vin` |
| **Maps** | Protomaps + MapLibre | `map.visor.vin/earth.json`, `/protomaps/` assets |

### 13.2 Complete Route Tree (40 routes)

```
/                           - Homepage
/account                    - Account root
/account/favorites          - Favorited vehicles
/account/favorites/$vin     - Favorite detail
/account/hides              - Hidden vehicles
/account/hides/$vin         - Hidden detail
/account/saved              - Saved searches list
/account/saved/$id          - Saved search detail
/account/saved/$id/listings - Saved search listings
/account/saved/$id/listings/$vin - Listing in saved search
/account/saved/$id/stats    - Saved search statistics
/account/settings           - User settings
/dealcheck                  - Deal check feature root
/dealcheck/deal             - Deal check list
/dealcheck/deal/$vin        - Check specific deal
/dealcheck/edit             - Edit deal check
/search                     - Search root
/search/filters             - Filter configuration
/search/listings            - Listings grid/map
/search/listings/$vin       - Individual listing detail
/subscribe                  - Subscription root
/subscribe/checkout         - Checkout flow
/subscribe/finish           - Post-checkout
/signin                     - Authentication
/obs                        - OBS/streaming mode (?)
/spottingdebug              - Debug/spotting tool
/vote                       - Voting feature
/cookies                    - Cookie policy
/privacy                    - Privacy policy
/terms                      - Terms of service
/redirect/changelog         - External changelog
/redirect/manual            - Manual/docs
/redirect/photos            - Photo submissions
/redirect/rewrite           - URL rewrite handler
/redirect/roadmap           - External roadmap
/v/$id                      - Short URL handler
```

### 13.3 API Data Structures

#### Filters API Response (`/api/data/filters`)

```typescript
interface FiltersResponse {
  num_found: number;           // Total matching listings (e.g., 31820)

  stats: {
    price: StatBlock;
    miles: StatBlock;
    msrp: StatBlock;
    dos_active: StatBlock;     // Days on sale
  };

  range_facets: {
    miles: RangeFacet;
    dos_active: RangeFacet;
    price: RangeFacet;
    msrp: RangeFacet;
  };

  facets: {
    year: FacetItem[];
    base_exterior_color: FacetItem[];
    base_interior_color: FacetItem[];
    exterior_color: FacetItem[];
    interior_color: FacetItem[];
    trim: FacetItem[];
    version: FacetItem[];
    engine: FacetItem[];
    drivetrain: FacetItem[];
    transmission: FacetItem[];
    fuel_type: FacetItem[];
    powertrain_type: FacetItem[];
    seating_capacity: FacetItem[];
    car_type: FacetItem[];
    state: FacetItem[];
    options_packages: FacetItem[];
    features: FacetItem[];
    dealer_type: FacetItem[];
    in_transit: FacetItem[];
    cylinders: FacetItem[];
    doors: FacetItem[];
    body_type: FacetItem[];
    keywords: FacetItem[];
  };
}

interface StatBlock {
  min: number;
  max: number;
  count: number;
  missing: number;
  mean: number;
  stddev: number;
  median: number;
}

interface RangeFacet {
  counts: { lower_bound: number; upper_bound: number; count: number }[];
  interval: number;
  start: number;
  end: number;
}

interface FacetItem {
  item: string;
  count: number;
}
```

#### Listing Data Structure (from Router State)

```typescript
interface Listing {
  // Identifiers
  id: string;                    // UUID "0a57c84d-0aad"
  vin: string;                   // "JTEVA5BR7S5014295"
  stock_no: string;

  // Pricing
  price: number;                 // 42991
  base_msrp: number | null;
  combined_msrp: number;         // 44220 (MSRP + options)
  price_msrp_discount: number;   // -0.0278 (negative = below MSRP)
  fees: object;

  // Vehicle Details
  miles: number;                 // 7054
  is_certified: boolean;
  exterior_color: string;
  interior_color: string;
  base_ext_color: string;
  base_int_color: string;

  // Status
  dos_active: number;            // Days on sale (1)
  inventory_type: string;
  in_transit: boolean;
  is_favorite: boolean;
  is_hidden: boolean;
  is_inactive: boolean;
  is_sold: boolean;
  sold_date: string | null;
  last_seen_at: string;

  // Warranty (calculated from in_service_date)
  in_service_date: string;       // "2025-04-26T08:47:11+00:00"
  has_in_service_date: boolean;
  warranty: WarrantyItem[];

  // History
  history: HistoryEntry[];

  // Related Data
  dealer: Dealer;
  build: VehicleBuild;
  media: MediaObject;
  extra: object;
  notes: Note[];

  // External Links
  vdp_url: string;               // Dealer vehicle detail page
  source: string;
  window_sticker_verified: boolean;
  dist: number | null;           // Distance from user
}

interface WarrantyItem {
  type: "Basic" | "Powertrain" | "Rust";
  miles: number | "unlimited";
  originalMiles: number;
  months: number;
  originalMonths: number;
  isExpired: boolean;
}

interface HistoryEntry {
  change_date: string;           // "2026-02-02 11:42:50.469278"
  price: number;
  miles: number;
  source: string;                // "northparktoyota.com"
  vin: string;
  last_price: number | null;
}

interface Dealer {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  city: string;
  state: string;
  website: string;
  dealer_type: "franchise" | "independent";
}

interface VehicleBuild {
  year: number;
  make: string;
  model: string;
  trim: string;
  version: string;
  body_type: string;
  transmission: string;
  drivetrain: string;
  fuel_type: string;
  engine: string;
  doors: number;
  cylinders: number;
  seating_capacity: number;
  powertrain_type: string;
  options_packages: string[];    // ["040", "FA20"]
  features: string[];
}
```

### 13.4 User Data Structure (from Root Loader)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  zipcode: string;
  created_at: string;

  // Subscription
  subscription_status: string;
  subscription_id: string;
  customer_id: string;

  // Notification Preferences
  saved_search_notifications_enabled: boolean;
  product_notifications_enabled: boolean;
  favorites_notifications_enabled: boolean;

  // UI Preferences
  private_listings_enabled: boolean;
  table_column_visibility: object;
  is_map_open: boolean;
  is_map_maximized: boolean;
  is_table_open: boolean;
  sidebar_items_open: object;
  filter_defaults: object;
  is_sidebar_closed: boolean;
  hide_chart_instructions: boolean;
  favorites_show_sold: boolean;
}

interface RootLoaderData {
  isCanada: boolean;
  user: User | null;
  isSubscribed: boolean;
  views: { vin: string }[];      // Recently viewed VINs
}
```

### 13.5 Exact Calculation Formulas

#### MSRP Discount Percentage
```javascript
// From listing data
price_msrp_discount = (price - combined_msrp) / combined_msrp

// Example: price=42991, combined_msrp=44220
// discount = (42991 - 44220) / 44220 = -0.0278 (-2.78%)
// Negative value = price below MSRP (good for buyer)
// Positive value = markup above MSRP
```

#### Warranty Remaining Calculation
```javascript
// Input: in_service_date, current mileage, warranty terms
// Toyota 4Runner warranty terms:
// - Basic: 36 months / 36,000 miles
// - Powertrain: 60 months / 60,000 miles
// - Rust: 60 months / unlimited miles

warranty_months_remaining = originalMonths - monthsSince(in_service_date)
warranty_miles_remaining = originalMiles - currentMiles

// Example for Basic warranty:
// in_service_date: 2025-04-26
// current_date: 2026-02-02 (10 months elapsed)
// current_miles: 7054
// months_remaining = 36 - 10 = 26 months
// miles_remaining = 36000 - 7054 = 28946 miles
```

#### Days on Sale (DOS)
```javascript
// dos_active = days since first listing date
// Tracked in history array, first entry is original listing

dos_active = daysBetween(history[0].change_date, currentDate)
```

### 13.6 Map Infrastructure

| Component | Source |
|-----------|--------|
| **Tile Server** | `map.visor.vin` (self-hosted Protomaps) |
| **Base Map Data** | `/earth.json` (PMTiles format) |
| **Sprites** | `/protomaps/sprites/v4/dark@2x.{json,png}` |
| **Fonts** | `/protomaps/fonts/Noto Sans {variant}/{range}.pbf` |
| **Library** | MapLibre GL JS (inferred from Protomaps usage) |

### 13.7 JavaScript Bundle Analysis

**Core Bundles:**
```
main-oN4JZ1bK.js       - TanStack Start runtime, router
index-B01513sk.js      - Route definitions, loaders
useQuery-HxoT2MoT.js   - TanStack Query integration
command-CD1OVqDe.js    - Command palette (search)
utils-BJzG_i0J.js      - Shared utilities
badge-DPq5fAw0.js      - Badge component
```

**Feature Bundles:**
```
AccountPopover-Dc2sv2GP.js  - User account menu
SavedFavorites-DVom_wX9.js  - Saved/favorites management
CountrySwitcher-BIKlRYFQ.js - US/CA toggle
HomeFooter-BFl_KMHF.js      - Footer with links
testimonials-NDqlT_uy.js    - Social proof carousel
tags-qA6hK2O8.js            - Filter tag system
```

**Icon Bundles (Lucide Icons):**
```
chevrons-up-down-DZsIY7Wd.js
chevron-right-Dpdx5VOc.js
menu-CeCWIwmq.js
heart-BewSxrff.js
bookmark-Ch7Y1YF1.js
reddit-DANYDlm6.js
```

### 13.8 PostHog Configuration

```javascript
{
  token: "phc_Bs6hpc4GFUdv0KzCnReFutOBa0x41mWyfO5XrInX7VE",
  supportedCompression: ["gzip", "gzip-js"],
  hasFeatureFlags: false,
  captureDeadClicks: false,
  capturePerformance: {
    network_timing: true,
    web_vitals: false
  },
  autocaptureExceptions: true,
  sessionRecording: {
    sampleRate: "0.05",           // 5% of sessions recorded
    minimumDurationMilliseconds: 30000
  }
}
```

---

## 14. Database Schema Inference

Based on the API responses, the likely database schema includes:

### Core Tables
- `listings` - Vehicle listings with pricing, status
- `dealers` - Dealer information with geocoding
- `listing_history` - Price/status changes over time
- `users` - User accounts and preferences
- `saved_searches` - User saved search criteria
- `favorites` - User favorited vehicles
- `views` - User view history

### Likely Search Infrastructure
- **Solr/Elasticsearch**: Faceted search with stats (evidenced by `stats`, `facets`, `range_facets` response structure)
- **PostGIS or similar**: Geospatial queries for radius/distance search

---

*Source code analysis completed via browser DevTools inspection on February 2, 2026*

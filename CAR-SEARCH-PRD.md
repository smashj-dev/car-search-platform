# Car Search Platform - Product Requirements Document

**Version:** 1.0
**Created:** February 2, 2026
**Last Updated:** February 2, 2026
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Phased Roadmap](#3-phased-roadmap)
4. [Technical Architecture](#4-technical-architecture)
5. [Data Infrastructure](#5-data-infrastructure)
6. [Feature Specifications](#6-feature-specifications)
7. [Security & Authentication](#7-security--authentication)
8. [Open Source Dependencies](#8-open-source-dependencies)
9. [API Specifications](#9-api-specifications)
10. [Database Schema](#10-database-schema)
11. [UI/UX Requirements](#11-uiux-requirements)
12. [Analytics & Monitoring](#12-analytics--monitoring)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Competitive Analysis](#14-competitive-analysis)
15. [Success Metrics](#15-success-metrics)

---

## 1. Executive Summary

### 1.1 Product Overview

A consumer-first automotive search platform that aggregates vehicle listings nationwide, provides market analytics, price tracking, and AI-powered research assistance. The platform prioritizes transparency and buyer empowerment over dealer-centric models.

### 1.2 Key Differentiators

- **AI-Powered Research Assistant**: Chat interface with citation-backed responses
- **YouTube Integration**: Video reviews with transcripts, summarization, and citation
- **Market Analytics**: Real-time pricing trends, depreciation curves, and demand signals
- **Price History Tracking**: Full timeline of price changes per listing
- **MSRP Transparency**: Actual MSRP with installed options vs. dealer markup
- **No Lead Generation**: Consumer-first, not dealer-first

### 1.3 Target Platforms

| Phase | Platform | Technology |
|-------|----------|------------|
| MVP 1 | Web Application | TanStack Start + Cloudflare |
| MVP 2 | iOS App | Swift/SwiftUI + Xcode |
| Future | Android App | React Native or Native |

---

## 2. Product Vision

### 2.1 Mission Statement

> Empower car buyers with comprehensive, transparent market data and AI-assisted research to make informed purchasing decisions.

### 2.2 Core Principles

1. **Transparency First**: All data sources cited, no hidden agendas
2. **Buyer Empowerment**: Tools that benefit consumers, not dealers
3. **Data Accuracy**: Real-time, verified information
4. **AI Augmentation**: Intelligence that enhances, not replaces, human judgment

### 2.3 User Personas

#### Primary: Active Car Shopper
- Actively searching for a vehicle
- Values data-driven decisions
- Willing to pay for premium insights
- Tech-savvy, uses multiple devices

#### Secondary: Research-Phase Buyer
- 3-12 months from purchase
- Gathering information
- Comparing makes/models
- Heavy content consumer (videos, reviews)

#### Tertiary: Enthusiast/Hobbyist
- Tracks market for interest
- May not be actively buying
- High engagement, lower conversion

---

## 3. Phased Roadmap

### Phase 1: MVP Web (Months 1-4)

#### Core Features
- [ ] Vehicle search with advanced filters
- [ ] Listing detail pages with full specs
- [ ] Price history tracking
- [ ] MSRP comparison
- [ ] Map-based search (Protomaps/MapLibre)
- [ ] User accounts (Google Auth)
- [ ] Saved searches with alerts
- [ ] Favorites/watchlist
- [ ] Basic AI chatbot with citation

#### Technical Deliverables
- [ ] TanStack Start web application
- [ ] Cloudflare Workers backend
- [ ] PostgreSQL database (Supabase or Neon)
- [ ] Scraper infrastructure (Cloudflare Workers)
- [ ] Basic analytics (PostHog)

#### Data Requirements
- [ ] Cars.com scraper
- [ ] Autotrader scraper
- [ ] VIN decoder integration (NHTSA)
- [ ] Basic MSRP database

---

### Phase 2: Enhanced Web + iOS Foundation (Months 5-8)

#### New Web Features
- [ ] YouTube video integration with transcripts
- [ ] Advanced market analytics dashboard (Grafana)
- [ ] Dealer reputation scoring
- [ ] Price prediction model
- [ ] Enhanced AI chatbot with video context
- [ ] Warranty calculator
- [ ] Shipping cost estimator

#### iOS App (MVP)
- [ ] SwiftUI native application
- [ ] Shared API with web
- [ ] Core search functionality
- [ ] Push notifications for alerts
- [ ] Offline favorites caching
- [ ] Apple Sign-In

#### Technical Deliverables
- [ ] YouTube transcript integration
- [ ] Grafana dashboards
- [ ] iOS app in App Store
- [ ] Enhanced scraper coverage
- [ ] Citation system for AI responses

---

### Phase 3: Full Platform (Months 9-12)

#### Advanced Features
- [ ] Depreciation curve analysis
- [ ] Total cost of ownership calculator
- [ ] Insurance estimate integration
- [ ] Financing calculator
- [ ] Vehicle history report integration
- [ ] Community features (reviews, tips)
- [ ] Dealer inventory direct feeds

#### Platform Expansion
- [ ] Android app consideration
- [ ] API for third-party integrations
- [ ] Premium subscription tiers
- [ ] Enterprise/fleet features

---

## 4. Technical Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web App       │    iOS App      │     Future: Android         │
│ (TanStack Start)│  (SwiftUI)      │     (React Native)          │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                     CLOUDFLARE EDGE                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Workers       │      KV         │        R2 Storage           │
│  (API/SSR)      │   (Cache)       │    (Images/Assets)          │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   PostgreSQL    │  Search Engine  │      Vector DB              │
│   (Primary)     │   (Meilisearch) │    (Embeddings)             │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                    SCRAPER LAYER                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Scheduled     │    Queue        │      Rate Limiter           │
│   Workers       │  (Cloudflare)   │     (Per Domain)            │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 4.2 Technology Stack

#### Frontend (Web)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | TanStack Start | Full-stack React-like with SSR |
| Router | TanStack Router | Type-safe, file-based routing |
| State | TanStack Query | Server state management |
| UI Components | Radix UI | Accessible, unstyled primitives |
| Styling | Tailwind CSS | Utility-first, performant |
| Maps | MapLibre GL + Protomaps | Self-hosted, no API costs |
| Charts | Recharts or Tremor | React-native charting |
| Icons | Lucide Icons | Consistent, tree-shakeable |

#### Frontend (iOS)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | SwiftUI | Native iOS, declarative |
| Architecture | MVVM | Clean separation |
| Networking | URLSession + Async/Await | Native, performant |
| Storage | SwiftData/CoreData | Offline support |
| Maps | MapKit | Native iOS maps |
| Auth | AuthenticationServices | Apple Sign-In |

#### Backend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Cloudflare Workers | Edge computing, low latency |
| Framework | Hono.js | Lightweight, Workers-native |
| Database | PostgreSQL (Neon/Supabase) | Relational, scalable |
| Search | Meilisearch | Fast, typo-tolerant search |
| Cache | Cloudflare KV | Edge caching |
| Storage | Cloudflare R2 | S3-compatible, no egress |
| Queue | Cloudflare Queues | Async job processing |
| AI | OpenAI GPT-4 / Claude | Chatbot intelligence |

#### DevOps

| Component | Technology | Rationale |
|-----------|------------|-----------|
| CI/CD | GitHub Actions | Integrated with repo |
| Monitoring | Grafana Cloud | Dashboards, alerts |
| Error Tracking | Sentry | Real-time error monitoring |
| Analytics | PostHog | Product analytics |
| Secrets | Cloudflare Secrets | Secure credential storage |

### 4.3 Cloudflare Infrastructure

```yaml
# wrangler.toml structure
name = "car-search-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

# KV Namespaces
[[kv_namespaces]]
binding = "CACHE"
id = "xxx"

[[kv_namespaces]]
binding = "SESSIONS"
id = "xxx"

# R2 Buckets
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "car-images"

# D1 Database (or external PostgreSQL)
[[d1_databases]]
binding = "DB"
database_name = "car-search"
database_id = "xxx"

# Queues
[[queues.producers]]
queue = "scraper-jobs"
binding = "SCRAPER_QUEUE"

[[queues.consumers]]
queue = "scraper-jobs"
max_batch_size = 10
max_batch_timeout = 30

# Cron Triggers (Scrapers)
[triggers]
crons = [
  "0 */4 * * *",  # Every 4 hours
  "0 0 * * *"     # Daily cleanup
]
```

---

## 5. Data Infrastructure

### 5.1 Scraper Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCRAPER ORCHESTRATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Scheduler   │───▶│   Queue     │───▶│  Workers    │         │
│  │ (Cron)      │    │ (CF Queues) │    │ (Scrapers)  │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│                                               │                 │
│                                               ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Rate        │◀───│  Parser     │◀───│   Raw       │         │
│  │ Limiter     │    │  Pipeline   │    │   HTML      │         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Dedup       │───▶│ Normalize   │───▶│  Database   │         │
│  │ Check       │    │ Transform   │    │  Insert     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Sources

#### Primary Listing Sources

| Source | Method | Frequency | Priority |
|--------|--------|-----------|----------|
| Cars.com | Scraper | Every 4 hours | High |
| Autotrader | Scraper | Every 4 hours | High |
| CarGurus | Scraper | Every 6 hours | Medium |
| Dealer Websites | Direct crawl | Daily | Medium |
| Manufacturer Sites | API/Scraper | Daily | Low |

#### Enrichment Sources

| Source | Data Type | Method |
|--------|-----------|--------|
| NHTSA vPIC | VIN Decode | API |
| EPA | Fuel Economy | API |
| YouTube | Video Reviews | API + Transcript |
| CARFAX | History Reports | Partner API |
| Edmunds | Reviews/Specs | Scraper |

### 5.3 Open Source Scrapers to Integrate

#### Automotive Scrapers

| Repository | Purpose | Stars | License |
|------------|---------|-------|---------|
| [mboles01/Cars](https://github.com/mboles01/Cars) | Autotrader scraper + depreciation | - | MIT |
| [MariusBelciug/Scrape_Cars](https://github.com/MariusBelciug/Scrape_Cars) | Cars.com dealer scraper | - | MIT |
| [oliver-kuo/scraper](https://github.com/oliver-kuo/scraper) | Multi-dealer inventory | - | MIT |
| [UCDavisZEM/Dealership-Scraping](https://github.com/UCDavisZEM/Dealership-Scraping) | Manufacturer dealer data | - | MIT |
| [vcavanna/scrapers](https://github.com/vcavanna/scrapers) | Edmunds scraper | - | MIT |

#### VIN Decoder

| Repository | Purpose | Integration |
|------------|---------|-------------|
| [Wal33D/nhtsa-vin-decoder](https://github.com/Wal33D/nhtsa-vin-decoder) | Offline VIN decode | Python worker |
| [ShaggyTech/nhtsa-api-wrapper](https://github.com/ShaggyTech/nhtsa-api-wrapper) | JS NHTSA wrapper | Direct import |
| [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/) | Official API | REST calls |

#### YouTube Transcripts

| Repository | Purpose | Integration |
|------------|---------|-------------|
| [jdepoix/youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) | Get transcripts | Python worker |
| [danielcliu/youtube-channel-transcript-api](https://github.com/danielcliu/youtube-channel-transcript-api) | Bulk channel transcripts | Batch jobs |

### 5.4 Scraper Implementation

```python
# Example scraper structure (Python worker)
# Located in: /scrapers/cars_com.py

from dataclasses import dataclass
from bs4 import BeautifulSoup
import httpx
import asyncio

@dataclass
class VehicleListing:
    vin: str
    price: int | None
    miles: int | None
    year: int
    make: str
    model: str
    trim: str | None
    exterior_color: str | None
    interior_color: str | None
    dealer_name: str
    dealer_city: str
    dealer_state: str
    source_url: str
    scraped_at: str

class CarsComScraper:
    BASE_URL = "https://www.cars.com"
    RATE_LIMIT = 2  # requests per second

    async def search_listings(
        self,
        make: str,
        model: str,
        zip_code: str,
        radius: int = 100
    ) -> list[VehicleListing]:
        """Scrape listings for a make/model search."""
        # Implementation with rate limiting
        pass

    async def get_listing_details(self, url: str) -> VehicleListing:
        """Get full details for a single listing."""
        pass

    def parse_listing_card(self, html: str) -> VehicleListing:
        """Parse a listing card from search results."""
        soup = BeautifulSoup(html, 'html.parser')
        # Extract fields
        pass
```

### 5.5 YouTube Integration

```python
# YouTube transcript + video metadata
# Located in: /scrapers/youtube_reviews.py

from youtube_transcript_api import YouTubeTranscriptApi
from dataclasses import dataclass

@dataclass
class VideoReview:
    video_id: str
    title: str
    channel: str
    published_at: str
    duration: int
    transcript: str
    summary: str | None  # AI-generated
    vehicle_make: str | None
    vehicle_model: str | None
    vehicle_year: int | None
    sentiment: str | None  # positive/neutral/negative

class YouTubeReviewScraper:
    CHANNELS = [
        "TheStraightPipes",
        "SavageGeese",
        "caraborat",
        "DougDeMuro",
        "Redline Reviews"
    ]

    async def get_transcript(self, video_id: str) -> str:
        """Fetch transcript with citation timestamps."""
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return self._format_with_timestamps(transcript)

    def _format_with_timestamps(self, transcript: list) -> str:
        """Format transcript with timestamps for citation."""
        formatted = []
        for entry in transcript:
            timestamp = self._seconds_to_timestamp(entry['start'])
            formatted.append(f"[{timestamp}] {entry['text']}")
        return "\n".join(formatted)

    @staticmethod
    def _seconds_to_timestamp(seconds: float) -> str:
        """Convert seconds to HH:MM:SS format."""
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
```

---

## 6. Feature Specifications

### 6.1 Search & Filtering

#### Filter Categories

```typescript
interface SearchFilters {
  // Vehicle Identification
  make?: string[];
  model?: string[];
  year_min?: number;
  year_max?: number;
  trim?: string[];

  // Pricing
  price_min?: number;
  price_max?: number;
  msrp_min?: number;
  msrp_max?: number;

  // Condition
  condition?: ('new' | 'used' | 'certified')[];
  miles_min?: number;
  miles_max?: number;

  // Location
  zip_code?: string;
  radius_miles?: number;
  radius_type?: 'straight' | 'driving';
  states?: string[];

  // Features
  exterior_color?: string[];
  interior_color?: string[];
  drivetrain?: ('fwd' | 'rwd' | 'awd' | '4wd')[];
  transmission?: ('automatic' | 'manual')[];
  fuel_type?: ('gas' | 'diesel' | 'hybrid' | 'electric')[];
  engine?: string[];

  // Market
  days_on_lot_min?: number;
  days_on_lot_max?: number;
  price_drop?: boolean;

  // Dealer
  dealer_type?: ('franchise' | 'independent')[];

  // Sorting
  sort_by?: 'price' | 'miles' | 'year' | 'days_listed' | 'distance';
  sort_order?: 'asc' | 'desc';
}
```

#### Search Response

```typescript
interface SearchResponse {
  total_count: number;
  page: number;
  per_page: number;

  listings: Listing[];

  facets: {
    year: FacetItem[];
    make: FacetItem[];
    model: FacetItem[];
    trim: FacetItem[];
    exterior_color: FacetItem[];
    interior_color: FacetItem[];
    drivetrain: FacetItem[];
    fuel_type: FacetItem[];
    dealer_type: FacetItem[];
    state: FacetItem[];
  };

  stats: {
    price: StatBlock;
    miles: StatBlock;
    msrp: StatBlock;
    days_on_lot: StatBlock;
  };

  range_facets: {
    price: RangeBucket[];
    miles: RangeBucket[];
    year: RangeBucket[];
    days_on_lot: RangeBucket[];
  };
}

interface FacetItem {
  value: string;
  count: number;
}

interface StatBlock {
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  count: number;
}

interface RangeBucket {
  lower: number;
  upper: number;
  count: number;
}
```

### 6.2 AI Chatbot with Citations

#### Chatbot Architecture

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  created_at: string;
}

interface Citation {
  id: string;
  type: 'listing' | 'video' | 'article' | 'spec';
  source_url: string;
  source_title: string;
  excerpt: string;
  timestamp?: string;  // For video citations
  confidence: number;
}

interface ChatContext {
  // Current search context
  active_search?: SearchFilters;
  viewed_listings?: string[];  // VINs

  // User preferences
  budget_range?: [number, number];
  preferred_makes?: string[];

  // Conversation history
  messages: ChatMessage[];
}
```

#### Citation System

```typescript
// Citation formatting in responses
const formatCitedResponse = (
  response: string,
  citations: Citation[]
): string => {
  // Format: "The 2024 Toyota Camry has excellent fuel economy [1]..."
  // Where [1] links to source

  let formatted = response;
  citations.forEach((citation, index) => {
    const marker = `[${index + 1}]`;
    // Insert citation markers at relevant positions
  });

  // Append citation list
  const citationList = citations.map((c, i) =>
    `[${i + 1}] ${c.source_title} - ${c.source_url}`
  ).join('\n');

  return `${formatted}\n\n---\nSources:\n${citationList}`;
};
```

#### Example Chat Interactions

```
User: "What's a good reliable SUV under $35,000?"
Assistant: "Based on reliability data and current listings, here are my top recommendations [1][2]:

**1. Toyota RAV4 (2021-2024)** - 4,234 listings under $35K
- Excellent reliability scores from Consumer Reports [1]
- Average price: $28,500 | Average miles: 35,000
- Doug DeMuro calls it "the sensible choice that's actually good to drive" [3]

**2. Honda CR-V (2021-2024)** - 3,891 listings under $35K
- Top Safety Pick+ rating [2]
- Average price: $29,200 | Average miles: 28,000

**3. Mazda CX-5 (2021-2024)** - 2,156 listings under $35K
- Best driving dynamics in class [4]
- Average price: $27,800 | Average miles: 32,000

Would you like me to show current listings for any of these?"

---
Sources:
[1] Consumer Reports Reliability Ratings 2024 - consumerreports.org
[2] IIHS Safety Ratings - iihs.org
[3] Doug DeMuro RAV4 Review - youtube.com/watch?v=xxx @ 04:32
[4] SavageGeese CX-5 Review - youtube.com/watch?v=yyy @ 12:15
```

### 6.3 Price Analytics & History

#### Price History Tracking

```typescript
interface PriceHistory {
  vin: string;
  entries: PriceEntry[];
  current_price: number | null;
  original_price: number | null;
  total_reduction: number;
  total_reduction_pct: number;
  days_on_market: number;
}

interface PriceEntry {
  date: string;
  price: number;
  miles: number;
  source: string;
  change_from_previous: number | null;
}
```

#### MSRP Comparison

```typescript
interface MSRPComparison {
  vin: string;

  // Pricing breakdown
  base_msrp: number;
  destination_charge: number;
  installed_options: InstalledOption[];
  total_msrp: number;

  // Dealer pricing
  list_price: number;

  // Calculations
  discount_amount: number;      // total_msrp - list_price
  discount_percentage: number;  // discount_amount / total_msrp

  // Market context
  market_avg_discount: number;
  market_position: 'below_average' | 'average' | 'above_average';
}

interface InstalledOption {
  code: string;
  name: string;
  msrp: number;
}
```

### 6.4 Market Analytics Dashboard (Grafana)

#### Dashboard Panels

```yaml
# Grafana dashboard configuration
dashboards:
  - name: "Market Overview"
    panels:
      - title: "Inventory Levels Over Time"
        type: timeseries
        query: "SELECT date, count(*) FROM listings GROUP BY date"

      - title: "Average Price by Model"
        type: bar
        query: "SELECT model, AVG(price) FROM listings GROUP BY model"

      - title: "Days on Market Distribution"
        type: histogram
        query: "SELECT days_on_lot FROM listings WHERE days_on_lot < 180"

      - title: "Price vs MSRP Heatmap"
        type: heatmap
        query: "SELECT year, (price - msrp) / msrp as discount FROM listings"

      - title: "Geographic Inventory Map"
        type: geomap
        query: "SELECT lat, lng, count(*) FROM dealers JOIN listings..."

      - title: "Sold vs Listed Rate"
        type: stat
        query: "SELECT sold_last_week / listed_last_week FROM metrics"
```

#### Metrics to Track

| Metric | Formula | Update Frequency |
|--------|---------|------------------|
| Inventory Level | COUNT(active listings) | Hourly |
| Avg Days on Lot | AVG(current_date - first_listed) | Daily |
| Market Days Supply | Inventory / Avg Weekly Sales | Daily |
| Price Trend | % change in avg price (7-day rolling) | Daily |
| Demand Score | Views + Favorites + Inquiries | Real-time |
| Depreciation Rate | Price change per mile/month | Weekly |

---

## 7. Security & Authentication

### 7.1 Authentication Methods

#### Primary: Google OAuth 2.0

```typescript
// Auth configuration
const authConfig = {
  providers: [
    {
      name: 'google',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scopes: ['email', 'profile']
    },
    {
      name: 'apple',  // For iOS app
      clientId: process.env.APPLE_CLIENT_ID,
      teamId: process.env.APPLE_TEAM_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY
    }
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,  // 30 days
    secret: process.env.JWT_SECRET
  }
};
```

#### Session Management

```typescript
interface Session {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  device_info: {
    platform: 'web' | 'ios' | 'android';
    user_agent: string;
    ip_address: string;
  };
}
```

### 7.2 Security Requirements

#### API Security

| Measure | Implementation |
|---------|----------------|
| Rate Limiting | Cloudflare rate limiting rules |
| CORS | Whitelist allowed origins |
| HTTPS | Enforced via Cloudflare |
| API Keys | For scraper/internal services |
| JWT Validation | Ed25519 signatures |
| Input Validation | Zod schema validation |

#### Data Security

| Measure | Implementation |
|---------|----------------|
| Encryption at Rest | Database-level encryption |
| Encryption in Transit | TLS 1.3 |
| PII Handling | Minimal collection, encrypted |
| Password Storage | N/A (OAuth only) |
| Audit Logging | All auth events logged |

### 7.3 Multi-Factor Authentication (Phase 2)

```typescript
interface MFAConfig {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email')[];
  required_for: ('login' | 'sensitive_actions')[];
}
```

---

## 8. Open Source Dependencies

### 8.1 Core Framework Dependencies

```json
{
  "dependencies": {
    // Framework
    "@tanstack/start": "^1.x",
    "@tanstack/react-router": "^1.x",
    "@tanstack/react-query": "^5.x",

    // UI
    "@radix-ui/react-*": "^1.x",
    "tailwindcss": "^3.x",
    "lucide-react": "^0.x",

    // Maps
    "maplibre-gl": "^4.x",
    "pmtiles": "^3.x",

    // Charts
    "recharts": "^2.x",

    // Auth
    "arctic": "^1.x",

    // Validation
    "zod": "^3.x",

    // Database
    "drizzle-orm": "^0.x",
    "postgres": "^3.x"
  }
}
```

### 8.2 Backend Dependencies

```json
{
  "dependencies": {
    // API Framework
    "hono": "^4.x",

    // Database
    "drizzle-orm": "^0.x",
    "@neondatabase/serverless": "^0.x",

    // Search
    "meilisearch": "^0.x",

    // AI
    "openai": "^4.x",
    "@anthropic-ai/sdk": "^0.x",

    // Utilities
    "zod": "^3.x",
    "date-fns": "^3.x"
  }
}
```

### 8.3 Python Scraper Dependencies

```txt
# requirements.txt
beautifulsoup4>=4.12.0
httpx>=0.27.0
lxml>=5.0.0
pandas>=2.2.0
youtube-transcript-api>=0.6.0
nhtsa-vin-decoder>=1.0.0
playwright>=1.40.0
redis>=5.0.0
celery>=5.3.0
```

### 8.4 iOS Dependencies (Swift Package Manager)

```swift
// Package.swift dependencies
dependencies: [
    .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.0"),
    .package(url: "https://github.com/apple/swift-collections.git", from: "1.0.0"),
    .package(url: "https://github.com/kean/Nuke.git", from: "12.0.0"),
    .package(url: "https://github.com/siteline/SwiftUI-Introspect.git", from: "1.0.0"),
]
```

---

## 9. API Specifications

### 9.1 REST API Endpoints

#### Listings

```
GET    /api/v1/listings                 # Search listings
GET    /api/v1/listings/:vin            # Get listing detail
GET    /api/v1/listings/:vin/history    # Get price history
GET    /api/v1/listings/:vin/similar    # Get similar listings
```

#### Filters & Facets

```
GET    /api/v1/filters                  # Get filter options
GET    /api/v1/facets                   # Get facet counts for search
GET    /api/v1/stats                    # Get market statistics
```

#### User

```
GET    /api/v1/user/profile             # Get user profile
PUT    /api/v1/user/profile             # Update profile
GET    /api/v1/user/favorites           # Get favorites
POST   /api/v1/user/favorites/:vin      # Add favorite
DELETE /api/v1/user/favorites/:vin      # Remove favorite
GET    /api/v1/user/searches            # Get saved searches
POST   /api/v1/user/searches            # Save search
DELETE /api/v1/user/searches/:id        # Delete search
```

#### AI Chat

```
POST   /api/v1/chat                     # Send message
GET    /api/v1/chat/history             # Get chat history
DELETE /api/v1/chat/history             # Clear history
```

#### Videos

```
GET    /api/v1/videos                   # Search videos
GET    /api/v1/videos/:id               # Get video detail
GET    /api/v1/videos/:id/transcript    # Get transcript
```

### 9.2 API Response Format

```typescript
// Success response
interface APIResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    cached?: boolean;
    cache_expires?: string;
  };
}

// Error response
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

---

## 10. Database Schema

### 10.1 Core Tables

```sql
-- Listings
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin VARCHAR(17) UNIQUE NOT NULL,

  -- Vehicle info
  year INTEGER NOT NULL,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  trim VARCHAR(100),
  version VARCHAR(150),
  body_type VARCHAR(50),

  -- Specs
  engine VARCHAR(50),
  transmission VARCHAR(50),
  drivetrain VARCHAR(20),
  fuel_type VARCHAR(30),
  cylinders INTEGER,
  doors INTEGER,
  seating_capacity INTEGER,

  -- Colors
  exterior_color VARCHAR(50),
  interior_color VARCHAR(50),
  base_exterior_color VARCHAR(30),
  base_interior_color VARCHAR(30),

  -- Pricing
  price INTEGER,
  base_msrp INTEGER,
  combined_msrp INTEGER,
  price_msrp_discount DECIMAL(5,4),

  -- Condition
  miles INTEGER,
  condition VARCHAR(20),
  is_certified BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_sold BOOLEAN DEFAULT FALSE,
  sold_date TIMESTAMP,
  in_transit BOOLEAN DEFAULT FALSE,

  -- Timing
  first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  days_on_lot INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (COALESCE(sold_date, NOW()) - first_seen_at))
  ) STORED,

  -- Source
  source VARCHAR(100) NOT NULL,
  source_url TEXT NOT NULL,

  -- Relations
  dealer_id INTEGER REFERENCES dealers(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_listings_make_model ON listings(make, model);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_year ON listings(year);
CREATE INDEX idx_listings_active ON listings(is_active);

-- Dealers
CREATE TABLE dealers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  website VARCHAR(255),

  -- Location
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Type
  dealer_type VARCHAR(20), -- franchise, independent

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dealers_location ON dealers(state, city);
CREATE INDEX idx_dealers_geo ON dealers USING GIST (
  ST_MakePoint(longitude, latitude)
);

-- Price History
CREATE TABLE listing_price_history (
  id SERIAL PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  vin VARCHAR(17) NOT NULL,

  price INTEGER,
  miles INTEGER,
  source VARCHAR(100),

  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_listing ON listing_price_history(listing_id);
CREATE INDEX idx_price_history_vin ON listing_price_history(vin);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,

  -- Profile
  name VARCHAR(100),
  avatar_url TEXT,
  zip_code VARCHAR(10),

  -- Subscription
  subscription_status VARCHAR(20) DEFAULT 'free',
  subscription_id VARCHAR(100),
  customer_id VARCHAR(100),

  -- Preferences
  preferences JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- User Favorites
CREATE TABLE user_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vin VARCHAR(17) NOT NULL,

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, vin)
);

-- Saved Searches
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,

  notifications_enabled BOOLEAN DEFAULT FALSE,
  last_notified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Videos
CREATE TABLE videos (
  id VARCHAR(20) PRIMARY KEY, -- YouTube video ID

  title VARCHAR(500) NOT NULL,
  channel VARCHAR(200) NOT NULL,
  channel_id VARCHAR(50),

  published_at TIMESTAMP,
  duration INTEGER, -- seconds

  -- Content
  transcript TEXT,
  summary TEXT,

  -- Vehicle association
  make VARCHAR(50),
  model VARCHAR(100),
  year INTEGER,

  -- Metadata
  view_count INTEGER,
  like_count INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_make_model ON videos(make, model);
```

### 10.2 Search Index (Meilisearch)

```json
{
  "index": "listings",
  "primaryKey": "vin",
  "searchableAttributes": [
    "make",
    "model",
    "trim",
    "version",
    "exterior_color",
    "interior_color",
    "dealer_name",
    "dealer_city"
  ],
  "filterableAttributes": [
    "year",
    "make",
    "model",
    "trim",
    "price",
    "miles",
    "condition",
    "exterior_color",
    "interior_color",
    "drivetrain",
    "fuel_type",
    "dealer_type",
    "state",
    "is_active",
    "days_on_lot"
  ],
  "sortableAttributes": [
    "price",
    "miles",
    "year",
    "days_on_lot",
    "first_seen_at"
  ],
  "rankingRules": [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness"
  ]
}
```

---

## 11. UI/UX Requirements

### 11.1 Design System

#### Color Palette

```css
:root {
  /* Primary */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-900: #1e3a8a;

  /* Neutral */
  --gray-50: #f9fafb;
  --gray-500: #6b7280;
  --gray-900: #111827;

  /* Semantic */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;

  /* Dark mode */
  --bg-dark: #0f172a;
  --surface-dark: #1e293b;
  --border-dark: #334155;
}
```

#### Typography

```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
}
```

### 11.2 Key UI Components

#### Search Command Palette

- Keyboard shortcut: `Cmd/Ctrl + K`
- Autocomplete for make/model
- Recent searches
- VIN search support

#### Listing Cards

- Primary image with lazy loading
- Price badge with discount indicator
- Key specs (year, miles, location)
- Favorite/hide actions
- "New" / "Price Drop" badges

#### Filters Panel

- Collapsible sections
- Histogram sliders for ranges
- Multi-select with counts
- Clear all / Apply buttons
- Mobile: Full-screen drawer

#### Map View

- Clustered markers
- Price tooltips
- Draw-to-search polygon
- Zoom-based clustering
- Mobile: Bottom sheet listings

### 11.3 Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

## 12. Analytics & Monitoring

### 12.1 Product Analytics (PostHog)

#### Key Events to Track

```typescript
const ANALYTICS_EVENTS = {
  // Search
  'search_performed': { filters: object, results_count: number },
  'filter_applied': { filter_name: string, value: any },
  'search_saved': { filters: object },

  // Listings
  'listing_viewed': { vin: string, source: string },
  'listing_favorited': { vin: string },
  'dealer_site_clicked': { vin: string, dealer: string },

  // Chat
  'chat_message_sent': { message_length: number },
  'citation_clicked': { citation_type: string, source: string },

  // Conversion
  'signup_completed': { method: string },
  'subscription_started': { plan: string },
};
```

### 12.2 Infrastructure Monitoring (Grafana)

#### Dashboards

1. **API Performance**
   - Request latency (p50, p95, p99)
   - Error rates by endpoint
   - Requests per second

2. **Scraper Health**
   - Success rate by source
   - Records processed per hour
   - Queue depth

3. **Database Performance**
   - Query latency
   - Connection pool usage
   - Table sizes

4. **Business Metrics**
   - Active users (DAU/WAU/MAU)
   - Searches per user
   - Conversion funnel

---

## 13. Deployment & DevOps

### 13.1 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy

  deploy-scrapers:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: scrapers
          command: deploy
```

### 13.2 Environment Configuration

```bash
# .env.example

# Database
DATABASE_URL=postgres://...
DATABASE_POOL_SIZE=10

# Search
MEILISEARCH_HOST=https://...
MEILISEARCH_API_KEY=...

# Auth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...

# AI
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Analytics
POSTHOG_API_KEY=...
SENTRY_DSN=...

# External APIs
NHTSA_API_URL=https://vpic.nhtsa.dot.gov/api
YOUTUBE_API_KEY=...
```

---

## 14. Competitive Analysis

### 14.1 Feature Comparison

| Feature | Our Platform | Visor.vin | Cars.com | Autotrader |
|---------|-------------|-----------|----------|------------|
| AI Chat with Citations | ✅ | ❌ | ❌ | ❌ |
| YouTube Integration | ✅ | ❌ | ❌ | ❌ |
| Price History | ✅ | ✅ | ❌ | ❌ |
| MSRP Comparison | ✅ | ✅ | Limited | Limited |
| Market Analytics | ✅ | ✅ (Plus) | ❌ | ❌ |
| Map Search | ✅ | ✅ | Basic | Basic |
| Warranty Calculator | ✅ | ✅ | ❌ | ❌ |
| No Lead Gen | ✅ | ✅ | ❌ | ❌ |
| iOS App | Phase 2 | ✅ | ✅ | ✅ |
| Free Tier | ✅ | ✅ | ✅ | ✅ |

### 14.2 Pricing Strategy

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Basic search, 5 favorites, limited chat |
| Plus | $7/mo | Unlimited favorites, full chat, price alerts |
| Pro | $15/mo | API access, bulk export, advanced analytics |

---

## 15. Success Metrics

### 15.1 North Star Metric

**Weekly Active Searchers (WAS)**: Users who perform at least one search per week.

### 15.2 Key Performance Indicators

| Metric | MVP Target | 6-Month Target |
|--------|------------|----------------|
| Weekly Active Users | 1,000 | 25,000 |
| Search → View Rate | 40% | 50% |
| View → Favorite Rate | 10% | 15% |
| Free → Paid Conversion | 3% | 5% |
| Chat Messages / User | 5 | 15 |
| iOS App Downloads | N/A | 10,000 |

### 15.3 Quality Metrics

| Metric | Target |
|--------|--------|
| API Latency (p95) | < 200ms |
| Scraper Success Rate | > 98% |
| Data Freshness | < 4 hours |
| Uptime | 99.9% |
| App Crash Rate | < 0.1% |

---

## Appendix A: Reference Materials

### Visor.vin Technical Analysis

See companion document: `visor-vin-product-analysis.md`

Key insights incorporated:
- TanStack Start framework choice
- Protomaps for self-hosted maps
- PostHog for analytics
- Faceted search API structure
- Listing data schema
- MSRP calculation formulas

### GitHub Repositories Referenced

**Automotive Scrapers:**
- https://github.com/mboles01/Cars
- https://github.com/MariusBelciug/Scrape_Cars
- https://github.com/oliver-kuo/scraper
- https://github.com/UCDavisZEM/Dealership-Scraping

**VIN Decoding:**
- https://github.com/Wal33D/nhtsa-vin-decoder
- https://github.com/ShaggyTech/nhtsa-api-wrapper
- https://vpic.nhtsa.dot.gov/api/

**YouTube Transcripts:**
- https://github.com/jdepoix/youtube-transcript-api
- https://github.com/danielcliu/youtube-channel-transcript-api

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| VIN | Vehicle Identification Number (17 characters) |
| MSRP | Manufacturer's Suggested Retail Price |
| DOS | Days on Sale |
| WMI | World Manufacturer Identifier (first 3 chars of VIN) |
| vPIC | Vehicle Product Information Catalog (NHTSA database) |
| PMTiles | Protomaps tile format |
| Faceted Search | Search with dynamic filter counts |

---

*Document created: February 2, 2026*
*Last updated: February 2, 2026*

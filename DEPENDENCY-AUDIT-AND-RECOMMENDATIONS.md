# Dependency Audit & Simplified Stack Recommendations

**Created:** February 2, 2026
**Purpose:** Critical evaluation of PRD dependencies and alternative simpler stacks

---

## Executive Summary

After auditing the 40+ dependencies in the original PRD, I've identified several areas where complexity can be reduced without sacrificing functionality. The key insight: **the original PRD was modeled after Visor.vin's stack, but Visor.vin is a mature product—we're building an MVP.**

### Key Recommendations

| Area | Original PRD | Simplified Recommendation | Complexity Reduction |
|------|--------------|---------------------------|---------------------|
| **Framework** | TanStack Start (RC) | Next.js 15 | Use battle-tested, not bleeding-edge |
| **Database** | PostgreSQL + Meilisearch | Supabase (all-in-one) | 2 services → 1 service |
| **Search** | Meilisearch (separate) | PostgreSQL FTS → Meilisearch later | Defer until scale requires |
| **Scrapers** | Python + Celery + Redis | Simple Python scripts + cron | 3 systems → 1 |
| **Maps** | Protomaps + MapLibre | Mapbox GL (free tier) or defer | Self-hosted → managed |
| **Analytics** | PostHog + Grafana | PostHog only | 2 systems → 1 |
| **AI** | OpenAI + Anthropic | **Cloudflare Workers AI** (DeepSeek/Qwen) | Pay-per-use → Free tier + cheap |

**Result: ~15 fewer dependencies, ~40% less infrastructure to manage**

---

## ⚡ UPDATED: Cloudflare Workers AI for LLM (Instead of OpenAI/Kimi)

### Important Finding: Kimi is NOT on Cloudflare Workers AI

After research, **Moonshot AI's Kimi models are NOT available on Cloudflare Workers AI**. However, Cloudflare offers excellent alternatives that are:
- Cheaper than OpenAI
- Run at the edge (low latency)
- Have generous free tier

### Recommended: DeepSeek-R1 or Qwen on Cloudflare Workers AI

| Model | Size | Best For | Neurons/1K tokens |
|-------|------|----------|-------------------|
| **deepseek-r1-distill-qwen-32b** | 32B | Reasoning, matches o1-mini | ~15 |
| **qwen3-30b-a3b-fp8** | 30B | General, multilingual | ~12 |
| **qwq-32b** | 32B | Complex reasoning | ~15 |
| **llama-3.3-70b-instruct-fp8-fast** | 70B | High quality responses | ~25 |
| **llama-3.1-8b-instruct-fast** | 8B | Fast, cheap, good enough | ~5 |

### Cloudflare Workers AI Pricing

| Tier | Free Allocation | Overage |
|------|-----------------|---------|
| **Free** | 10,000 Neurons/day | Hard limit |
| **Paid ($5/mo Workers)** | 10,000 Neurons/day | $0.011 / 1,000 Neurons |

**Cost Comparison for 100K chatbot queries/month:**

| Provider | Model | Cost/month |
|----------|-------|------------|
| OpenAI | gpt-4o-mini | ~$15-30 |
| OpenAI | gpt-4o | ~$150-300 |
| Anthropic | claude-3-haiku | ~$10-25 |
| **Cloudflare** | deepseek-r1-distill | **~$5-15** |
| **Cloudflare** | llama-3.1-8b | **~$2-5** |

### Implementation Example

```typescript
// Using Cloudflare Workers AI for chatbot
export default {
  async fetch(request, env) {
    const { messages } = await request.json();

    const response = await env.AI.run(
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      {
        messages: [
          { role: 'system', content: 'You are a helpful car buying assistant...' },
          ...messages
        ],
        max_tokens: 1024,
        temperature: 0.7
      }
    );

    return Response.json({ response: response.response });
  }
};
```

### If You Still Want Kimi

Kimi models are available via:
1. **Moonshot AI API** (https://platform.moonshot.ai) - OpenAI-compatible API
2. **Together AI** - Hosts Kimi-K2.5
3. **Self-hosted** - Kimi-K2 is open-source on HuggingFace

But for cost efficiency on Cloudflare, **DeepSeek-R1** is the best choice—it matches o1-mini performance at a fraction of the cost.

**Sources:**
- [Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Cloudflare Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Kimi K2.5 on HuggingFace](https://huggingface.co/moonshotai/Kimi-K2.5)

---

## Part 1: Original PRD Dependency Audit

### 1.1 Frontend Dependencies (Web)

| Dependency | Version | Purpose | Verdict |
|------------|---------|---------|---------|
| `@tanstack/start` | ^1.x (RC) | Full-stack framework | ⚠️ **RISKY** - Still Release Candidate |
| `@tanstack/react-router` | ^1.x | Type-safe routing | ✅ Stable, excellent |
| `@tanstack/react-query` | ^5.x | Server state | ✅ Industry standard |
| `@radix-ui/react-*` | ^1.x | UI primitives | ✅ Excellent choice |
| `tailwindcss` | ^3.x | Styling | ✅ Industry standard |
| `maplibre-gl` | ^4.x | Maps | ⚠️ Requires self-hosted tiles |
| `pmtiles` | ^3.x | Map tile format | ⚠️ Additional complexity |
| `recharts` | ^2.x | Charts | ✅ Good choice |
| `lucide-react` | ^0.x | Icons | ✅ Good choice |
| `arctic` | ^1.x | OAuth | ⚠️ Less common, Supabase Auth easier |
| `zod` | ^3.x | Validation | ✅ Excellent |
| `drizzle-orm` | ^0.x | Database ORM | ✅ Good, but Supabase client simpler |

**Total: 12 core dependencies, 4 have concerns**

### 1.2 Backend Dependencies

| Dependency | Version | Purpose | Verdict |
|------------|---------|---------|---------|
| `hono` | ^4.x | API framework | ✅ Good for Workers |
| `@neondatabase/serverless` | ^0.x | DB connection | ⚠️ Adds vendor lock-in |
| `meilisearch` | ^0.x | Search client | ⚠️ Separate service to run |
| `openai` | ^4.x | AI | ✅ Good |
| `@anthropic-ai/sdk` | ^0.x | AI | ⚠️ Redundant with OpenAI |
| `date-fns` | ^3.x | Date utilities | ✅ Good |

### 1.3 Python Scraper Dependencies

| Dependency | Purpose | Verdict |
|------------|---------|---------|
| `beautifulsoup4` | HTML parsing | ✅ Essential |
| `httpx` | HTTP client | ✅ Good |
| `lxml` | Fast parsing | ✅ Good |
| `pandas` | Data processing | ⚠️ Overkill for scraping |
| `youtube-transcript-api` | Transcripts | ✅ Essential |
| `nhtsa-vin-decoder` | VIN decode | ⚠️ Can use API directly |
| `playwright` | Browser automation | ⚠️ Heavy, try without first |
| `redis` | Queue backend | ⚠️ Extra infrastructure |
| `celery` | Task queue | ⚠️ Complex for MVP |

**Total: 9 Python dependencies, 5 add significant complexity**

### 1.4 Infrastructure Services

| Service | Purpose | Verdict |
|---------|---------|---------|
| Cloudflare Workers | Edge compute | ✅ Good choice |
| Cloudflare KV | Cache | ✅ Good |
| Cloudflare R2 | Storage | ✅ Good |
| Cloudflare Queues | Job queue | ⚠️ Can defer |
| PostgreSQL (Neon) | Database | ⚠️ Supabase includes this |
| Meilisearch | Search | ⚠️ Defer to Phase 2 |
| PostHog | Analytics | ✅ Good |
| Grafana | Dashboards | ⚠️ Overkill for MVP |
| Sentry | Errors | ✅ Good |

**Total: 9 services, 4 can be deferred or consolidated**

---

## Part 2: Critical Issues with Original Stack

### 2.1 TanStack Start is NOT Production-Ready

**Evidence:**
- Still at "Release Candidate" stage as of February 2026
- The team says: "If you choose to ship an RC Start app to production, they recommend locking your dependencies to a specific version"
- Limited ecosystem compared to Next.js
- Fewer tutorials, examples, and community support

**Risk:** Breaking changes, bugs, and limited help when things go wrong.

**Source:** [TanStack Start v1 RC Announcement](https://tanstack.com/blog/announcing-tanstack-start-v1)

### 2.2 Meilisearch Adds Operational Complexity

**For MVP:**
- PostgreSQL full-text search handles 100K-500K records well
- Adding Meilisearch = another server to run, sync, monitor
- Typo tolerance is nice-to-have, not MVP-critical

**When to add Meilisearch:**
- When search UX becomes a growth lever
- When you have 500K+ listings
- When users complain about search quality

**Source:** [Meilisearch Blog - When Postgres Stops Being Good Enough](https://www.meilisearch.com/blog/postgres-full-text-search-limitations)

### 2.3 Celery + Redis is Over-Engineered for MVP Scrapers

**The PRD proposes:**
```
Scheduler (Cron) → Queue (Cloudflare) → Workers → Rate Limiter → Parser → Dedup → Normalize → Database
```

**What MVP actually needs:**
```
Cron → Python Script → Database
```

**Why Celery is overkill:**
- You're scraping ~5 sources initially
- Each source runs every 4-6 hours
- Total: 20-30 scraper runs per day
- A simple cron job handles this easily

**When to add Celery:**
- 50+ data sources
- Real-time scraping requirements
- Complex retry/failure patterns

### 2.4 Two AI Providers is Redundant

**Original PRD:** OpenAI + Anthropic SDKs

**Problem:**
- Two API keys to manage
- Two billing relationships
- Two different response formats
- Complexity for no benefit in MVP

**Solution:** Pick one. OpenAI has broader adoption and more tutorials.

---

## Part 3: Simplified Stack Recommendation

### 3.1 The "Lean MVP" Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│   Next.js 15 (App Router)                                        │
│   - Server Components for SEO                                    │
│   - Server Actions for mutations                                 │
│   - Deployed on Vercel OR Cloudflare (via OpenNext)             │
└────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                     SUPABASE (All-in-One)                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   PostgreSQL    │      Auth       │        Storage              │
│   + Full-Text   │   (Google/Apple)│     (Images)                │
│   Search        │                 │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    SCRAPER LAYER (Simple)                        │
├─────────────────────────────────────────────────────────────────┤
│   Python Scripts + GitHub Actions (cron)                         │
│   - No Celery, no Redis                                          │
│   - Direct database writes via Supabase client                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Dependency Comparison

| Category | Original Count | Simplified Count | Removed |
|----------|----------------|------------------|---------|
| Frontend npm | 12 | 8 | 4 |
| Backend npm | 6 | 3 | 3 |
| Python | 9 | 4 | 5 |
| Infrastructure | 9 | 4 | 5 |
| **Total** | **36** | **19** | **17** |

### 3.3 Simplified Package.json

```json
{
  "dependencies": {
    // Framework (1 vs 3)
    "next": "^15.x",

    // UI (same)
    "@radix-ui/react-*": "^1.x",
    "tailwindcss": "^3.x",
    "lucide-react": "^0.x",

    // Data (1 vs 3)
    "@supabase/supabase-js": "^2.x",

    // State (1 vs 2)
    "@tanstack/react-query": "^5.x",

    // Validation (same)
    "zod": "^3.x",

    // AI - Use Cloudflare Workers AI (no SDK needed, uses fetch)
    // Or if calling from client: "@cloudflare/workers-ai-provider": "^1.x"

    // Charts (same)
    "recharts": "^2.x"
  }
}
```

**Note on AI:** Cloudflare Workers AI doesn't require an SDK—you call it directly via the `env.AI.run()` binding in Workers, or via REST API from anywhere. This eliminates the need for `openai` or `@anthropic-ai/sdk` packages.
```

### 3.4 Simplified Python Requirements

```txt
# requirements.txt (MVP)
beautifulsoup4>=4.12.0
httpx>=0.27.0
youtube-transcript-api>=0.6.0
supabase>=2.0.0
```

**Removed:**
- `pandas` (not needed for simple transforms)
- `playwright` (try without browser automation first)
- `celery` (overkill)
- `redis` (not needed without Celery)
- `nhtsa-vin-decoder` (use API directly)
- `lxml` (BeautifulSoup's html.parser is fine)

---

## Part 4: Phase-by-Phase Simplified Roadmap

### Phase 1: MVP Web (Months 1-3)

**Stack:**
- Next.js 15 (deployed on Vercel free tier)
- Supabase (free tier: 500MB, 50K monthly active users)
- PostHog (free tier: 1M events/month)
- OpenAI API (pay-as-you-go)

**Features:**
- [x] Vehicle search with PostgreSQL full-text search
- [x] Listing detail pages
- [x] User accounts (Supabase Auth with Google)
- [x] Saved searches & favorites
- [x] Basic AI chatbot (no citations yet)

**Scrapers:**
- Simple Python scripts
- Run via GitHub Actions cron (free)
- 3 sources: Cars.com, Autotrader, one other
- No browser automation initially

**Deferred to Phase 2:**
- Price history tracking
- Maps
- YouTube integration
- Citations in AI responses
- Meilisearch

**Cost Estimate:** ~$0-50/month (mostly free tiers)

### Phase 2: Enhanced Web (Months 4-6)

**Add:**
- Meilisearch Cloud ($29/month) when search quality matters
- Price history tracking
- YouTube transcript integration
- AI citations
- Maps (Mapbox free tier: 50K loads/month)

**Scrapers:**
- Add 2-3 more sources
- Still cron-based unless volume requires more

**Cost Estimate:** ~$50-150/month

### Phase 3: iOS App (Months 7-10)

**Stack:**
- SwiftUI native app
- Same Supabase backend
- Supabase Realtime for push notifications

**Why native over React Native:**
- Better App Store approval rates
- Superior performance
- Native Apple Sign-In integration

---

## Part 5: Decision Matrix

### When to Use Original Stack vs Simplified

| Scenario | Use Simplified | Use Original |
|----------|----------------|--------------|
| Solo developer | ✅ | ❌ |
| Team of 2-3 | ✅ | ❌ |
| Team of 5+ | ❌ | ✅ |
| MVP validation | ✅ | ❌ |
| Post-funding scale | ❌ | ✅ |
| < 100K listings | ✅ | ❌ |
| > 500K listings | ❌ | ✅ |
| Need type-safe routing | ❌ | ✅ |
| Need RSC | ✅ | ❌ |

### Framework Decision: Next.js vs TanStack Start

| Factor | Next.js 15 | TanStack Start |
|--------|-----------|----------------|
| Production maturity | ✅ Years of battle-testing | ⚠️ Release Candidate |
| Community size | ✅ Massive | ⚠️ Growing |
| Learning resources | ✅ Abundant | ⚠️ Limited |
| Type safety | ⚠️ Good, not perfect | ✅ Excellent |
| Cloudflare deploy | ✅ Via OpenNext | ✅ Native |
| Vercel deploy | ✅ Native | ⚠️ Possible |
| React Server Components | ✅ Native | ⚠️ Partial |

**Recommendation:** Use Next.js 15 for MVP. Consider TanStack Start once it reaches stable 1.0 and you need its advanced type safety features.

### Database Decision: Supabase vs Neon + Separate Services

| Factor | Supabase | Neon + Meilisearch + Auth0 |
|--------|----------|---------------------------|
| Setup time | ✅ 5 minutes | ⚠️ Hours |
| Services to manage | ✅ 1 | ⚠️ 3+ |
| Cost (MVP) | ✅ $0-25/month | ⚠️ $50-100/month |
| Flexibility | ⚠️ Some limits | ✅ Full control |
| Search quality | ⚠️ PG FTS | ✅ Meilisearch |
| Scaling ceiling | ⚠️ Higher tiers expensive | ✅ Unlimited |

**Recommendation:** Start with Supabase. Migrate specific services out only when you hit limits.

---

## Part 6: Migration Path

If you start simple and need to scale:

### From PostgreSQL FTS → Meilisearch
```
1. Keep PostgreSQL as source of truth
2. Add Meilisearch sync worker
3. Query Meilisearch for search, PostgreSQL for details
4. Incremental, no big rewrite
```

### From Next.js → TanStack Start
```
1. TanStack Router can be used inside Next.js
2. Gradually migrate routes
3. Eventually swap framework if needed
4. Most component code transfers directly
```

### From Supabase → Self-Managed
```
1. Export PostgreSQL (pg_dump)
2. Migrate auth to Auth0/Clerk
3. Migrate storage to R2/S3
4. Update connection strings
5. 1-2 day migration
```

---

## Part 7: Final Recommendations

### The 80/20 Stack for Car Search MVP

| Component | Choice | Why |
|-----------|--------|-----|
| **Framework** | Next.js 15 | Mature, huge ecosystem, good DX |
| **Hosting** | Vercel OR Cloudflare (OpenNext) | Zero-config deploys |
| **Database + Auth + Storage** | Supabase | All-in-one, generous free tier |
| **Search** | PostgreSQL FTS (upgrade later) | Good enough for 100K listings |
| **AI** | **Cloudflare Workers AI** (DeepSeek-R1) | 10K neurons/day FREE, then $0.011/1K |
| **Analytics** | PostHog | Free tier handles MVP |
| **Scrapers** | Python + GitHub Actions | Free, simple, works |
| **Maps** | Defer to Phase 2 | Not MVP-critical |
| **iOS** | SwiftUI (Phase 3) | Native is better for App Store |

### What You're Giving Up

1. **Bleeding-edge type safety** (TanStack Router is better here)
2. **Edge-first architecture** (Cloudflare Workers)
3. **Typo-tolerant search** (until you add Meilisearch)
4. **Self-hosted maps** (using Mapbox instead)

### What You're Gaining

1. **~50% fewer dependencies** to manage
2. **Battle-tested frameworks** with abundant help
3. **Faster time to MVP** (weeks, not months)
4. **Lower operational burden** (fewer services)
5. **Clear upgrade paths** when you need scale

---

## Appendix: Links & Sources

### Framework Comparisons
- [TanStack Start vs Next.js - LogRocket](https://blog.logrocket.com/tanstack-start-vs-next-js-choosing-the-right-full-stack-react-framework/)
- [Next.js vs TanStack 2026 - Better Stack](https://www.better-stack.ai/p/blog/nextjs-vs-tanstack-2026)
- [Why Developers Leave Next.js - Appwrite](https://appwrite.io/blog/post/why-developers-leaving-nextjs-tanstack-start)

### Search Engine Comparisons
- [PostgreSQL FTS vs Meilisearch - Nomadz](https://nomadz.pl/en/blog/postgres-full-text-search-or-meilisearch-vs-typesense)
- [When Postgres FTS Isn't Enough - Meilisearch](https://www.meilisearch.com/blog/postgres-full-text-search-limitations)
- [Postgres FTS vs the Rest - Supabase](https://supabase.com/blog/postgres-full-text-search-vs-the-rest)

### Supabase
- [Supabase Review 2026](https://hackceleration.com/supabase-review/)
- [PostgreSQL vs Supabase - Leanware](https://www.leanware.co/insights/postgresql-vs-supabase-deployment-guide-startups)

### Next.js on Cloudflare
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Next.js Guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

### Scraper Architecture
- [Distributed Scraping with Celery - DEV](https://dev.to/deepak_mishra_35863517037/distributed-scraping-the-flask-celery-redis-stack-17d3)
- [Best Web Scraping Tools 2026 - Scrapfly](https://scrapfly.io/blog/posts/best-web-scraping-tools-in-2026)

---

*Document created: February 2, 2026*

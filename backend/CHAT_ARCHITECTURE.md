# AI Chat System - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User / Frontend                          │
│                    (Browser / React App)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/JSON
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                           │
│                         (Hono.js)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Chat Router (chat.ts)                       │  │
│  │  • POST /chat - Send message                             │  │
│  │  • GET /history - Get history                            │  │
│  │  • DELETE /history - Clear history                       │  │
│  │  • POST /context/* - Track context                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Chat Service (chat.ts)                        │  │
│  │  • Natural language parsing                              │  │
│  │  • Database querying                                     │  │
│  │  • AI orchestration                                      │  │
│  │  • Citation extraction                                   │  │
│  │  • Context management                                    │  │
│  └────┬──────────────┬──────────────┬──────────────┬────────┘  │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│   ┌────────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐      │
│   │   D1   │   │Workers  │   │   KV    │   │Citation  │      │
│   │Database│   │   AI    │   │Namespace│   │ Service  │      │
│   └────────┘   └─────────┘   └─────────┘   └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. Send Chat Message

```
Frontend
    │
    │ POST /api/v1/chat
    │ { message: "What electric SUVs?", sessionId: "..." }
    ▼
Chat Router (chat.ts)
    │
    │ Validate input (Zod)
    │ Extract sessionId
    ▼
Chat Service (chat.ts)
    │
    ├─► Parse Query
    │   "electric SUVs" → { fuelType: "Electric", bodyType: "SUV" }
    │
    ├─► Query Database (D1)
    │   SELECT * FROM listings
    │   WHERE fuel_type = 'Electric' AND body_type LIKE '%SUV%'
    │   LIMIT 10
    │   ↓
    │   Returns: [Listing1, Listing2, ...]
    │
    ├─► Build Context
    │   Format listings as:
    │   [1] 2024 Tesla Model Y - $52,990 - 12k mi - VIN: xxx
    │   [2] 2023 Ford Mustang Mach-E - $48,500 - 8k mi - VIN: yyy
    │
    ├─► Call Workers AI
    │   Model: @cf/meta/llama-3.1-8b-instruct
    │   System Prompt + Context + User Message
    │   ↓
    │   Returns: "I recommend [1] for best value..."
    │
    ├─► Extract Citations
    │   Find [1], [2] markers
    │   Link to VINs from context
    │   ↓
    │   Citations: [{ id: "1", vin: "xxx", ... }]
    │
    └─► Save to KV
        chat:history:{sessionId} → [messages...]
        session:searches:{sessionId} → [queries...]
        ↓
        Return response to frontend
```

## Data Flow

### Session Management

```
┌─────────────────────────────────────────────────────────────┐
│                    KV Namespace (CACHE)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  chat:history:{sessionId}                                  │
│  ├─ Last 20 messages                                       │
│  ├─ TTL: 24 hours                                          │
│  └─ Format: [{ role: "user", content: "..." }, ...]       │
│                                                             │
│  session:searches:{sessionId}                              │
│  ├─ Last 10 search queries                                 │
│  ├─ TTL: 24 hours                                          │
│  └─ Format: ["query1", "query2", ...]                     │
│                                                             │
│  session:viewed:{sessionId}                                │
│  ├─ Last 10 viewed VINs                                    │
│  ├─ TTL: 24 hours                                          │
│  └─ Format: ["VIN1", "VIN2", ...]                         │
│                                                             │
│  chat:feedback:{sessionId}:{timestamp}                     │
│  ├─ User feedback on responses                             │
│  ├─ TTL: 30 days                                           │
│  └─ Format: { rating: "helpful", comment: "..." }         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                   D1 Database (SQLite)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  listings                                                   │
│  ├─ id (text, PK)                                          │
│  ├─ vin (text, unique)                                     │
│  ├─ year (integer)                                         │
│  ├─ make (text)                                            │
│  ├─ model (text)                                           │
│  ├─ trim (text)                                            │
│  ├─ price (integer)                                        │
│  ├─ miles (integer)                                        │
│  ├─ fuel_type (text)                                       │
│  ├─ body_type (text)                                       │
│  ├─ drivetrain (text)                                      │
│  └─ ... (other fields)                                     │
│                                                             │
│  dealers                                                    │
│  ├─ id (text, PK)                                          │
│  ├─ name (text)                                            │
│  ├─ city (text)                                            │
│  └─ ... (other fields)                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Interaction

### Chat Service Internal Flow

```
ChatService
│
├─► findRelevantListings()
│   │
│   ├─► parseQuery()
│   │   Input: "electric SUV under $50k"
│   │   Output: {
│   │     fuelType: "Electric",
│   │     bodyType: "SUV",
│   │     priceMax: 50000
│   │   }
│   │
│   └─► Database Query
│       Returns: Listing[]
│
├─► buildContext()
│   Input: Listing[]
│   Output: Formatted string for AI
│
├─► callWorkersAI()
│   Input: messages[]
│   Output: AI response text
│
├─► extractCitations()
│   Input: AI response, Listing[]
│   Output: Citation[]
│
└─► saveConversationHistory()
    Stores in KV
```

### Citation Service

```
CitationService (citations.ts)
│
├─► createCitations(listings)
│   Converts Listing[] → Citation[]
│
├─► formatCitationText(listing)
│   "2024 Tesla Model Y ($52,990, 12,000 mi)"
│
├─► formatForAI(listing, index)
│   "[1] 2024 Tesla Model Y | Price: $52,990 | Mileage: 12,000 miles | ..."
│
├─► extractReferences(text)
│   Finds [1], [2], [3] in AI response
│
└─► formatCitationLinks(text, citations)
    Converts [1] → markdown link
```

## AI Integration

### Workers AI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Workers AI (@cf/meta/llama-3.1-8b)       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input:                                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ System Prompt                                        │  │
│  │ "You are a helpful car shopping assistant..."        │  │
│  │                                                       │  │
│  │ Context                                               │  │
│  │ "[1] 2024 Tesla Model Y - $52,990 - 12k mi"        │  │
│  │ "[2] 2023 Ford Mach-E - $48,500 - 8k mi"           │  │
│  │                                                       │  │
│  │ Conversation History                                  │  │
│  │ [{ role: "user", content: "Show me SUVs" }]        │  │
│  │                                                       │  │
│  │ User Message                                          │  │
│  │ "What electric SUVs do you have?"                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Processing:                                                │
│  • Token limit: 1024                                       │
│  • Temperature: 0.7                                        │
│  • Top-p: 0.9                                              │
│  • Time: ~500ms - 1s                                       │
│                                                             │
│  Output:                                                    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ "I found several electric SUVs in our inventory.    │  │
│  │ The [1] 2024 Tesla Model Y at $52,990 is a great   │  │
│  │ choice with only 12,000 miles. For a more           │  │
│  │ affordable option, check out [2]..."                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

```
Error Handling Flow
│
├─► Input Validation Errors (400)
│   • Message too long/short
│   • Invalid sessionId format
│   • Missing required fields
│
├─► Database Errors (500)
│   • Query timeout
│   • Connection failure
│   • Retry with exponential backoff
│
├─► AI Errors (500)
│   • Model unavailable
│   • Timeout
│   • Return fallback message
│
└─► KV Errors (500)
    • Store operation failed
    • Continue without history
```

## Performance Optimization

```
Caching Strategy
│
├─► Listing Detail Cache (1 hour)
│   Key: "listing:{vin}"
│   Value: Full listing object
│
├─► Query Result Cache (future)
│   Key: "query:{hash}"
│   Value: AI response + citations
│
└─► Session Data (24 hours)
    Key: "chat:history:{sessionId}"
    Value: Conversation messages
```

## Security Layers

```
Security Flow
│
├─► Input Validation
│   • Zod schema validation
│   • Length limits (1-1000 chars)
│   • Format validation
│
├─► SQL Injection Prevention
│   • Drizzle ORM parameterization
│   • No raw SQL queries
│
├─► Session Isolation
│   • UUID-based session IDs
│   • No cross-session leaks
│
└─► Rate Limiting (future)
    • 100 requests/session/hour
    • 1000 requests/IP/day
```

## Deployment Architecture

```
Production Environment
│
├─► Cloudflare Global Network
│   • 300+ data centers worldwide
│   • Edge computing
│   • Sub-50ms latency
│
├─► Workers
│   • Auto-scaling
│   • Pay-per-use
│   • 0ms cold starts
│
├─► D1 Database
│   • SQLite at the edge
│   • Read replicas
│   • Eventual consistency
│
├─► KV Namespace
│   • Global replication
│   • Low-latency reads
│   • High throughput
│
└─► Workers AI
    • On-demand inference
    • No GPU management
    • Automatic scaling
```

## Integration Points

```
External Integration
│
├─► Frontend
│   • REST API (JSON)
│   • WebSocket (future)
│   • Server-Sent Events (future)
│
├─► Analytics
│   • Cloudflare Analytics
│   • Custom metrics
│   • Usage tracking
│
├─► Monitoring
│   • Wrangler tail (logs)
│   • Error tracking
│   • Performance metrics
│
└─► Other APIs
    • Listings API
    • Scraper API
    • Dealer API
```

## File Structure

```
backend/
│
├─── src/
│    ├─── routes/
│    │    ├─── chat.ts              # API endpoints
│    │    └─── chat.test.ts         # Test suite
│    │
│    ├─── services/
│    │    ├─── chat.ts              # Main chat logic
│    │    └─── citations.ts         # Citation handling
│    │
│    ├─── types/
│    │    └─── env.ts               # Environment types
│    │
│    └─── index.ts                  # Main entry point
│
├─── examples/
│    └─── chat-client-example.ts    # Usage examples
│
└─── docs/
     ├─── AI_CHAT_IMPLEMENTATION.md # Full documentation
     ├─── CHAT_QUICKSTART.md        # Quick start guide
     ├─── CHAT_API_REFERENCE.md     # API reference
     ├─── CHAT_ARCHITECTURE.md      # This file
     └─── IMPLEMENTATION_SUMMARY.md # Summary
```

## Technology Stack

```
Stack Overview
│
├─► Runtime
│   └─── Cloudflare Workers
│
├─── Framework
│   └─── Hono.js
│
├─── AI Model
│   └─── Llama 3.1 8B Instruct (Workers AI)
│
├─── Database
│   └─── Cloudflare D1 (SQLite)
│
├─── Cache/Storage
│   └─── KV Namespace
│
├─── ORM
│   └─── Drizzle ORM
│
├─── Validation
│   └─── Zod
│
└─── Language
    └─── TypeScript
```

---

**Version**: 1.0.0
**Last Updated**: 2026-02-05

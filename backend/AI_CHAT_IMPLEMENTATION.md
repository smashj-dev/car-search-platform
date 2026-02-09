# AI Chat Gateway Implementation

Complete AI-powered chat system for the car search platform using Cloudflare Workers AI.

## Architecture Overview

### Components

1. **Chat Service** (`src/services/chat.ts`)
   - Manages AI interactions with Workers AI
   - Implements RAG (Retrieval-Augmented Generation) pattern
   - Handles conversation history
   - Tracks user context (searches, viewed vehicles)

2. **Citation Service** (`src/services/citations.ts`)
   - Formats vehicle references as citations
   - Extracts citation markers from AI responses
   - Links citations back to VIN/listing IDs

3. **Chat Routes** (`src/routes/chat.ts`)
   - RESTful API endpoints for chat functionality
   - Session management
   - Context tracking

## API Endpoints

### POST /api/v1/chat

Send a message and get AI response with citations.

**Request:**
```json
{
  "message": "What's a good electric SUV under $50k?",
  "sessionId": "optional-session-id",
  "includeHistory": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "I recommend the [1] 2024 Tesla Model Y at $52,990...",
    "citations": [
      {
        "id": "1",
        "text": "2024 Tesla Model Y Long Range",
        "vin": "5YJYGDEE1RF123456",
        "vehicle": {
          "year": 2024,
          "make": "Tesla",
          "model": "Model Y",
          "price": 52990
        },
        "url": "/listings/5YJYGDEE1RF123456"
      }
    ],
    "sessionId": "abc-123-def-456",
    "context": {
      "relevantListings": 3,
      "recentSearches": ["electric SUV"],
      "viewedVehicles": []
    }
  }
}
```

### GET /api/v1/chat/history

Retrieve conversation history for a session.

**Query Parameters:**
- `sessionId` (required): Session identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc-123",
    "messages": [
      {
        "role": "user",
        "content": "Show me electric SUVs"
      },
      {
        "role": "assistant",
        "content": "I found several electric SUVs..."
      }
    ],
    "count": 2
  }
}
```

### DELETE /api/v1/chat/history

Clear conversation history for a session.

**Request:**
```json
{
  "sessionId": "abc-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc-123",
    "message": "Conversation history cleared"
  }
}
```

### POST /api/v1/chat/context/search

Track a search in the session context.

**Request:**
```json
{
  "sessionId": "abc-123",
  "query": "electric SUV"
}
```

### POST /api/v1/chat/context/view

Track a viewed vehicle in the session context.

**Request:**
```json
{
  "sessionId": "abc-123",
  "vin": "5YJYGDEE1RF123456"
}
```

### GET /api/v1/chat/suggestions

Get suggested questions for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "What's a good electric SUV under $50k?",
      "Show me reliable sedans with low mileage",
      "What are the best family vehicles available?"
    ]
  }
}
```

### POST /api/v1/chat/feedback

Submit feedback on AI response quality.

**Request:**
```json
{
  "sessionId": "abc-123",
  "messageId": "msg-456",
  "rating": "helpful",
  "comment": "Great recommendations!"
}
```

## RAG Implementation

### How It Works

1. **Query Analysis**: User message is parsed to extract search intent
   - Price constraints: "under $50k"
   - Year: "2023 Honda Civic"
   - Fuel type: "electric", "hybrid"
   - Body type: "SUV", "sedan", "truck"
   - Make/Model: "Tesla Model 3"

2. **Database Query**: Relevant listings are fetched from D1 database
   - Up to 10 most relevant listings
   - Filtered by extracted parameters
   - Active listings only

3. **Context Building**: Listings are formatted for AI context
   ```
   [1] 2024 Tesla Model Y Long Range - $52,990 - 12,000 miles - VIN: xxx
   [2] 2023 Ford Mustang Mach-E - $48,500 - 8,500 miles - VIN: yyy
   ```

4. **AI Generation**: Workers AI generates response with citations
   - Model: `@cf/meta/llama-3.1-8b-instruct`
   - System prompt includes vehicle context
   - Temperature: 0.7 for natural responses

5. **Citation Extraction**: Parse AI response for `[1]`, `[2]` markers
   - Link citations back to VINs
   - Generate URLs for each referenced vehicle

6. **History Management**: Conversation stored in KV
   - Last 20 messages retained
   - 24-hour expiration
   - Session-based isolation

## Natural Language Query Parsing

The system extracts structured search parameters from natural language:

### Price Extraction
```
"under $50k" → priceMax: 50000
"under $30,000" → priceMax: 30000
"cars under 25000" → priceMax: 25000
```

### Year Extraction
```
"2023 Honda Civic" → yearMin: 2023, yearMax: 2023
"2020 Tesla" → yearMin: 2020, yearMax: 2020
```

### Fuel Type Detection
```
"electric SUV" → fuelType: "Electric"
"hybrid sedan" → fuelType: "Hybrid"
"diesel truck" → fuelType: "Diesel"
```

### Body Type Detection
```
"SUV" → bodyType: "SUV"
"sedan" → bodyType: "Sedan"
"truck" → bodyType: "Truck"
"coupe" → bodyType: "Coupe"
```

### Make Detection
```
"Tesla" → make: "Tesla"
"Honda" → make: "Honda"
"Chevy" → make: "Chevrolet"
```

## Session Management

### Session Storage (KV)

**Chat History**: `chat:history:{sessionId}`
- Stores conversation messages
- 24-hour TTL
- Max 20 messages

**Recent Searches**: `session:searches:{sessionId}`
- Tracks user queries
- 24-hour TTL
- Max 10 searches

**Viewed Vehicles**: `session:viewed:{sessionId}`
- VINs of viewed listings
- 24-hour TTL
- Max 10 vehicles

**Feedback**: `chat:feedback:{sessionId}:{timestamp}`
- User feedback on responses
- 30-day TTL

## System Prompt

The AI is given a system prompt with:
- Role definition (helpful car shopping assistant)
- Current inventory context (available vehicles)
- Citation format instructions
- Guidelines for recommendations

Example:
```
You are a helpful car shopping assistant for a car search platform.

Current inventory context:
[1] 2024 Tesla Model 3 - $52,990 - 12,000 miles - VIN: xxx
[2] 2023 Honda Civic - $28,500 - 15,000 miles - VIN: yyy

Guidelines:
- Be conversational, friendly, and helpful
- Reference vehicles by citation number [1], [2]
- Provide specific details like price and mileage
- If no matches, suggest expanding search criteria
```

## Workers AI Configuration

### Model
- **Model ID**: `@cf/meta/llama-3.1-8b-instruct`
- **Max Tokens**: 1024
- **Temperature**: 0.7 (balanced creativity/consistency)
- **Top P**: 0.9

### Why Llama 3.1 8B Instruct?
- Fast inference on Cloudflare's network
- Strong instruction following
- Good at structured output (citations)
- Free tier available
- Low latency (<1s typical)

### Alternative Models
- `@cf/meta/llama-3-8b-instruct` (older, still good)
- `@cf/mistral/mistral-7b-instruct-v0.1` (alternative)

## Citation Format

Citations link AI responses back to actual inventory:

```typescript
interface Citation {
  id: string;              // "1", "2", "3"
  text: string;            // "2024 Tesla Model Y ($52,990, 12,000 mi)"
  vin: string;             // "5YJYGDEE1RF123456"
  year: number;            // 2024
  make: string;            // "Tesla"
  model: string;           // "Model Y"
  price: number;           // 52990
  url: string;             // "/listings/5YJYGDEE1RF123456"
}
```

## Error Handling

### AI Errors
- Timeout: Return graceful fallback message
- Invalid response: Log and return error
- Rate limiting: Queue retry

### Database Errors
- No results: Still generate helpful response
- Query timeout: Reduce complexity, retry

### Session Errors
- Missing history: Start fresh conversation
- KV unavailable: Continue without history

## Performance Considerations

### Caching Strategy
- Listing detail cache: 1 hour
- Popular queries: Cache AI responses (future)
- Session data: 24 hours in KV

### Database Optimization
- Limit to 10 listings per query
- Index on make, model, year, price, fuelType
- Use prepared statements

### AI Optimization
- Keep system prompt concise (<500 tokens)
- Limit conversation history to 20 messages
- Stream responses (future enhancement)

## Usage Examples

### Example 1: Electric SUV Search
```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What'\''s a good electric SUV under $50k?"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "I found several great electric SUVs under $50k. The [1] 2024 Chevrolet Bolt EUV at $28,995 with 5,200 miles is an excellent value. If you want more range and features, consider the [2] 2023 Hyundai Ioniq 5 at $45,900 with 12,000 miles.",
    "citations": [
      {
        "id": "1",
        "text": "2024 Chevrolet Bolt EUV Premier ($28,995, 5,200 mi)",
        "vin": "1G1FZ6S09P4123456",
        "url": "/listings/1G1FZ6S09P4123456"
      },
      {
        "id": "2",
        "text": "2023 Hyundai Ioniq 5 Limited ($45,900, 12,000 mi)",
        "vin": "KM8KCDAF7NU123456",
        "url": "/listings/KM8KCDAF7NU123456"
      }
    ],
    "sessionId": "abc-123-def-456"
  }
}
```

### Example 2: Follow-up Question
```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about the Ioniq 5",
    "sessionId": "abc-123-def-456",
    "includeHistory": true
  }'
```

### Example 3: Track Context
```bash
# Track when user views a listing
curl -X POST http://localhost:8787/api/v1/chat/context/view \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def-456",
    "vin": "KM8KCDAF7NU123456"
  }'

# Next chat message will know they viewed this vehicle
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What do you think of that Ioniq 5 I just looked at?",
    "sessionId": "abc-123-def-456"
  }'
```

## Testing

Run the test suite:
```bash
npm test src/routes/chat.test.ts
```

Test coverage includes:
- Basic chat queries
- Citation extraction
- Context tracking
- History management
- Error handling
- Session isolation

## Future Enhancements

### Planned Features
1. **Streaming Responses**: Real-time token streaming
2. **Conversation Branching**: Multiple conversation threads
3. **Smart Suggestions**: Context-aware question suggestions
4. **Price Alerts**: "Let me know if price drops"
5. **Comparison Mode**: "Compare [1] and [2] for me"
6. **Voice Input**: Speech-to-text integration
7. **Multi-language**: Spanish, Chinese support

### Performance Improvements
1. **Response Caching**: Cache common queries
2. **Listing Embeddings**: Vector search for better matching
3. **Query Optimization**: Faster database queries
4. **Batch Processing**: Handle multiple queries efficiently

### Advanced Features
1. **Personalization**: User preference learning
2. **Proactive Suggestions**: "This just came in, you might like it"
3. **Negotiation Help**: "This is overpriced by $2k based on market data"
4. **Scheduling**: "Book a test drive at the dealer"

## Monitoring & Analytics

### Key Metrics
- Response time (p50, p95, p99)
- Citation accuracy
- User satisfaction (feedback ratings)
- Session length
- Query complexity
- AI cost per query

### Logging
- All queries logged with session ID
- AI response quality tracked
- Error rates monitored
- Usage patterns analyzed

## Security Considerations

1. **Rate Limiting**: Prevent abuse
   - 100 requests per session per hour
   - 1000 requests per IP per day

2. **Input Validation**: Sanitize user messages
   - Max 1000 characters
   - Strip HTML/scripts
   - Check for injection attacks

3. **Session Isolation**: Prevent cross-session data leaks
   - UUID-based session IDs
   - No PII in logs
   - 24-hour auto-expiry

4. **AI Safety**: Content filtering
   - Reject inappropriate queries
   - Monitor for prompt injection
   - Filter harmful responses

## Deployment

The chat system is automatically deployed with the main API:

```bash
npm run deploy
```

Environment variables (set via wrangler):
```bash
wrangler secret put OPENAI_API_KEY  # Optional for future GPT integration
```

## Cost Estimates

### Workers AI (Free Tier)
- 10,000 requests/day free
- ~$0.01 per 1,000 requests after

### KV Storage
- 100,000 reads/day free
- 1,000 writes/day free
- Minimal cost for typical usage

### D1 Database
- 5M reads/month free
- 100k writes/month free
- Well within free tier for most usage

**Estimated Monthly Cost**: $0 - $10 for typical usage

## Support & Troubleshooting

### Common Issues

**Issue**: AI returns empty response
- **Fix**: Check Workers AI binding in wrangler.toml
- **Fix**: Verify model name is correct

**Issue**: No citations in response
- **Fix**: Ensure database has listings
- **Fix**: Check query parsing logic

**Issue**: Session history not persisting
- **Fix**: Verify KV namespace is bound
- **Fix**: Check TTL settings

### Debug Mode

Enable debug logging:
```typescript
// In chat.ts
const DEBUG = true;
```

View logs:
```bash
wrangler tail
```

## Contributing

When adding new features:
1. Update this documentation
2. Add tests for new functionality
3. Update API response types
4. Consider backwards compatibility
5. Test with real user queries

## License

MIT - See main project LICENSE

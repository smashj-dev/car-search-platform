# AI Chat API - Quick Reference

## Base URL
```
http://localhost:8787/api/v1/chat  # Development
https://api.example.com/api/v1/chat  # Production
```

## Endpoints

### 1. Send Chat Message

**POST** `/api/v1/chat`

Send a message and receive AI response with vehicle citations.

**Request Body:**
```json
{
  "message": "What electric SUVs do you have?",
  "sessionId": "optional-uuid",
  "includeHistory": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "I found several electric SUVs...",
    "citations": [
      {
        "id": "1",
        "text": "2024 Tesla Model Y ($52,990, 12,000 mi)",
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

**cURL:**
```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What electric SUVs do you have?",
    "includeHistory": true
  }'
```

---

### 2. Get Conversation History

**GET** `/api/v1/chat/history?sessionId={id}`

Retrieve all messages in the conversation.

**Query Parameters:**
- `sessionId` (required): Session UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc-123",
    "messages": [
      {
        "role": "user",
        "content": "Show me SUVs"
      },
      {
        "role": "assistant",
        "content": "I found 5 SUVs..."
      }
    ],
    "count": 2
  }
}
```

**cURL:**
```bash
curl "http://localhost:8787/api/v1/chat/history?sessionId=abc-123"
```

---

### 3. Clear History

**DELETE** `/api/v1/chat/history`

Clear all messages for a session.

**Request Body:**
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

**cURL:**
```bash
curl -X DELETE http://localhost:8787/api/v1/chat/history \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123"}'
```

---

### 4. Track Search

**POST** `/api/v1/chat/context/search`

Track a search query in session context.

**Request Body:**
```json
{
  "sessionId": "abc-123",
  "query": "electric SUV"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Search tracked"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:8787/api/v1/chat/context/search \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123", "query": "electric SUV"}'
```

---

### 5. Track Viewed Vehicle

**POST** `/api/v1/chat/context/view`

Track when a user views a specific vehicle.

**Request Body:**
```json
{
  "sessionId": "abc-123",
  "vin": "5YJYGDEE1RF123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Vehicle view tracked"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:8787/api/v1/chat/context/view \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123", "vin": "5YJYGDEE1RF123456"}'
```

---

### 6. Get Suggestions

**GET** `/api/v1/chat/suggestions`

Get suggested questions for the user.

**Query Parameters:**
- `sessionId` (optional): Session UUID

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

**cURL:**
```bash
curl "http://localhost:8787/api/v1/chat/suggestions"
```

---

### 7. Submit Feedback

**POST** `/api/v1/chat/feedback`

Submit feedback on AI response quality.

**Request Body:**
```json
{
  "sessionId": "abc-123",
  "messageId": "optional-msg-id",
  "rating": "helpful",
  "comment": "Great recommendations!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Feedback received"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:8787/api/v1/chat/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123",
    "rating": "helpful",
    "comment": "Very helpful!"
  }'
```

---

## Query Examples

### By Price
```
"Show me cars under $30,000"
"What's available under 25k?"
"Electric SUVs under $50k"
```

### By Make/Model
```
"What Honda Civics do you have?"
"Show me Tesla Model 3s"
"Do you have any Toyota Camrys?"
```

### By Features
```
"Electric SUVs with low mileage"
"Reliable sedans under 50k miles"
"Family vehicles with 3rd row seating"
```

### By Body Type
```
"Show me all SUVs"
"What trucks are available?"
"Do you have any sedans?"
```

### Comparison
```
"Compare electric and hybrid SUVs"
"What's the difference between the Camry and Accord?"
```

---

## Response Types

### Success Response
```typescript
{
  success: true,
  data: {
    // Endpoint-specific data
  }
}
```

### Error Response
```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Error description"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `CHAT_ERROR` | General chat processing error |
| `HISTORY_ERROR` | Failed to fetch history |
| `CLEAR_ERROR` | Failed to clear history |
| `TRACK_ERROR` | Failed to track context |
| `FEEDBACK_ERROR` | Failed to submit feedback |
| `VALIDATION_ERROR` | Invalid request parameters |

---

## Rate Limits

| Tier | Limit |
|------|-------|
| Free | 10,000 requests/day |
| Paid | Custom |

---

## Data Types

### ChatMessage
```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

### Citation
```typescript
interface Citation {
  id: string;
  text: string;
  vin: string;
  vehicle: {
    year: number;
    make: string;
    model: string;
    price: number;
  };
  url: string;
}
```

### Context
```typescript
interface Context {
  relevantListings: number;
  recentSearches: string[];
  viewedVehicles: string[];
}
```

---

## JavaScript Client

### Basic Usage
```javascript
const response = await fetch('http://localhost:8787/api/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What electric SUVs do you have?'
  })
});

const data = await response.json();
console.log(data.data.message);
```

### With Session
```javascript
let sessionId = null;

async function sendMessage(text) {
  const response = await fetch('http://localhost:8787/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      sessionId,
      includeHistory: true
    })
  });

  const data = await response.json();
  sessionId = data.data.sessionId; // Save for next message
  return data;
}
```

---

## Testing

### Health Check
```bash
curl http://localhost:8787/
```

### Test Chat
```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### View Logs
```bash
wrangler tail
```

---

## Session Management

### Session Storage (KV)
- **History**: `chat:history:{sessionId}` (24h TTL)
- **Searches**: `session:searches:{sessionId}` (24h TTL)
- **Views**: `session:viewed:{sessionId}` (24h TTL)
- **Feedback**: `chat:feedback:{sessionId}:{timestamp}` (30d TTL)

### Best Practices
1. Always pass `sessionId` after first message
2. Set `includeHistory: true` for follow-ups
3. Track searches/views for better context
4. Handle session expiry gracefully
5. Store sessionId in localStorage

---

## Common Patterns

### Multi-turn Conversation
```javascript
// 1. Initial message
const resp1 = await sendMessage('Show me SUVs');
const sessionId = resp1.data.sessionId;

// 2. Follow-up
const resp2 = await sendMessage('What about electric ones?', sessionId);

// 3. Another follow-up
const resp3 = await sendMessage('Tell me about the first one', sessionId);
```

### Context Tracking
```javascript
// Track when user searches
await trackSearch(sessionId, 'electric SUV');

// Track when user views listing
await trackView(sessionId, 'VIN123456');

// Now AI knows what they're looking at
await sendMessage('Tell me more about that one', sessionId);
```

### Error Handling
```javascript
try {
  const response = await sendMessage('Show me cars');
  if (!response.success) {
    console.error(response.error.message);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Performance

### Typical Response Times
- **AI Generation**: 500ms - 1s
- **Database Query**: 50ms - 200ms
- **Total**: 800ms - 1.5s

### Optimization Tips
1. Reuse sessionId for faster responses
2. Enable history for better context
3. Track user actions for relevance
4. Cache common queries client-side
5. Debounce user input (500ms)

---

## Security

### Input Validation
- Message: 1-1000 characters
- SessionId: Valid UUID format
- VIN: 17 characters

### Headers Required
- `Content-Type: application/json`

### CORS
Allowed origins:
- `http://localhost:5173`
- `http://localhost:3000`
- `https://carsearch.app`

---

## Support

- **Documentation**: See `AI_CHAT_IMPLEMENTATION.md`
- **Quick Start**: See `CHAT_QUICKSTART.md`
- **Examples**: See `examples/chat-client-example.ts`
- **Issues**: GitHub Issues

---

**Version**: 1.0.0
**Last Updated**: 2026-02-05

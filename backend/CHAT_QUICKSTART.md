# AI Chat - Quick Start Guide

Get the AI Chat system up and running in 5 minutes.

## Prerequisites

- Cloudflare account with Workers AI enabled
- Backend already deployed (`npm run deploy`)
- Database populated with some listings

## Verify Installation

### 1. Check Configuration

Verify `wrangler.toml` has the AI binding:

```toml
[ai]
binding = "AI"
```

### 2. Test Health Endpoint

```bash
curl http://localhost:8787/
```

Expected response:
```json
{
  "name": "Car Search Platform API",
  "version": "1.0.0",
  "status": "healthy"
}
```

## Basic Usage

### Send Your First Chat Message

```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What electric SUVs do you have?"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "message": "I found several electric SUVs in our inventory...",
    "citations": [...],
    "sessionId": "abc-123-def-456",
    "context": {
      "relevantListings": 3,
      "recentSearches": ["What electric SUVs do you have?"],
      "viewedVehicles": []
    }
  }
}
```

### Continue the Conversation

Save the `sessionId` and use it for follow-up messages:

```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about the first one",
    "sessionId": "abc-123-def-456",
    "includeHistory": true
  }'
```

## Common Queries

### Search by Price
```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me sedans under $30k"}'
```

### Search by Make/Model
```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What Honda Civics do you have?"}'
```

### Search by Features
```bash
curl -X POST http://localhost:8787/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find me a reliable family SUV with low mileage"}'
```

## Frontend Integration

### HTML + JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Car Chat</title>
  <style>
    .chat-container { max-width: 600px; margin: 50px auto; }
    .messages { height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; }
    .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
    .user { background: #e3f2fd; text-align: right; }
    .assistant { background: #f5f5f5; }
    .input-area { margin-top: 10px; display: flex; gap: 10px; }
    .input-area input { flex: 1; padding: 10px; }
    .input-area button { padding: 10px 20px; }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div class="input-area">
      <input type="text" id="input" placeholder="Ask about vehicles..." />
      <button onclick="sendMessage()">Send</button>
    </div>
  </div>

  <script>
    let sessionId = null;

    async function sendMessage() {
      const input = document.getElementById('input');
      const message = input.value.trim();
      if (!message) return;

      // Display user message
      addMessage(message, 'user');
      input.value = '';

      try {
        const response = await fetch('http://localhost:8787/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId,
            includeHistory: true
          })
        });

        const data = await response.json();
        sessionId = data.data.sessionId;

        // Display AI response
        addMessage(data.data.message, 'assistant');

        // Display citations
        if (data.data.citations.length > 0) {
          const citationsHtml = data.data.citations.map(c =>
            `<a href="${c.url}">[${c.id}] ${c.text}</a>`
          ).join('<br>');
          addMessage(citationsHtml, 'assistant');
        }
      } catch (error) {
        addMessage('Error: ' + error.message, 'assistant');
      }
    }

    function addMessage(text, role) {
      const messagesDiv = document.getElementById('messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + role;
      messageDiv.innerHTML = text;
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Allow Enter key to send
    document.getElementById('input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>
```

### React Component

```tsx
import { useState } from 'react';

function ChatWidget() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8787/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          sessionId,
          includeHistory: true
        })
      });

      const data = await response.json();
      setSessionId(data.data.sessionId);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.data.message
      }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role}>
            {msg.content}
          </div>
        ))}
        {loading && <div>Thinking...</div>}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="Ask about vehicles..."
      />
      <button onClick={sendMessage} disabled={loading}>
        Send
      </button>
    </div>
  );
}

export default ChatWidget;
```

## Testing Locally

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open Browser Console
```javascript
// Send a test message
fetch('http://localhost:8787/api/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What SUVs do you have?'
  })
})
  .then(r => r.json())
  .then(console.log);
```

### 3. Check Logs
```bash
# In another terminal
wrangler tail
```

## Troubleshooting

### Problem: "AI binding not found"

**Solution**: Verify `wrangler.toml` has:
```toml
[ai]
binding = "AI"
```

Then restart dev server:
```bash
npm run dev
```

### Problem: "No listings found"

**Solution**: Make sure database has some listings. Run the scraper:
```bash
curl -X POST http://localhost:8787/api/v1/scraper/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Toyota",
    "model": "Camry",
    "zipCode": "90001"
  }'
```

### Problem: Empty AI response

**Solution**: Check Workers AI model name:
```typescript
// In src/services/chat.ts
const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  // Verify this model name is correct
});
```

### Problem: CORS errors in browser

**Solution**: Add your frontend origin to CORS config:
```typescript
// In src/index.ts
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  // Add your frontend URL here
}));
```

## Next Steps

1. **Read Full Documentation**: See `AI_CHAT_IMPLEMENTATION.md`
2. **Run Tests**: `npm test src/routes/chat.test.ts`
3. **View Examples**: Check `examples/chat-client-example.ts`
4. **Deploy to Production**: `npm run deploy`

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/chat` | POST | Send message, get AI response |
| `/api/v1/chat/history` | GET | Get conversation history |
| `/api/v1/chat/history` | DELETE | Clear history |
| `/api/v1/chat/context/search` | POST | Track search query |
| `/api/v1/chat/context/view` | POST | Track viewed vehicle |
| `/api/v1/chat/suggestions` | GET | Get suggested questions |
| `/api/v1/chat/feedback` | POST | Submit feedback |

## Example Queries to Try

- "What's a good first car under $20k?"
- "Show me reliable SUVs with low mileage"
- "Compare electric sedans in your inventory"
- "What Honda Accords do you have?"
- "Find me a truck under 50k miles"
- "What luxury cars are available under $40k?"
- "Show me family vehicles with 3rd row seating"

## Support

- GitHub Issues: Report bugs or request features
- Documentation: `AI_CHAT_IMPLEMENTATION.md`
- Examples: `examples/chat-client-example.ts`

## Performance Tips

1. **Session Reuse**: Always pass `sessionId` for better context
2. **Include History**: Set `includeHistory: true` for follow-up questions
3. **Track Context**: Use `/context/search` and `/context/view` endpoints
4. **Cache Responses**: Cache common queries on frontend
5. **Debounce Input**: Wait 500ms after typing before sending

## Production Checklist

- [ ] Environment variables set
- [ ] CORS origins configured
- [ ] Rate limiting enabled
- [ ] Error tracking set up
- [ ] Analytics configured
- [ ] Database indexed properly
- [ ] KV namespaces created
- [ ] Workers AI quota checked
- [ ] Logs monitoring enabled
- [ ] Backup strategy in place

---

**Ready to go!** Start chatting with your AI assistant. 🚗💬

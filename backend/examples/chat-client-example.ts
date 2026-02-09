/**
 * Example Chat Client
 *
 * Demonstrates how to integrate the AI Chat API into your frontend application.
 * This example uses fetch API and can be adapted for React, Vue, or any framework.
 */

// Configuration
const API_BASE_URL = 'http://localhost:8787/api/v1';

// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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

interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    citations: Citation[];
    sessionId: string;
    context: {
      relevantListings: number;
      recentSearches: string[];
      viewedVehicles: string[];
    };
  };
}

/**
 * Chat Client Class
 */
class ChatClient {
  private sessionId: string;
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = apiBaseUrl;
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Get or create a session ID
   */
  private getOrCreateSessionId(): string {
    const stored = localStorage.getItem('chat_session_id');
    if (stored) {
      return stored;
    }

    const newSessionId = crypto.randomUUID();
    localStorage.setItem('chat_session_id', newSessionId);
    return newSessionId;
  }

  /**
   * Send a chat message
   */
  async sendMessage(message: string, includeHistory: boolean = true): Promise<ChatResponse> {
    const response = await fetch(`${this.apiBaseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId: this.sessionId,
        includeHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get conversation history
   */
  async getHistory(): Promise<ChatMessage[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/chat/history?sessionId=${this.sessionId}`
    );

    if (!response.ok) {
      throw new Error(`History API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.messages;
  }

  /**
   * Clear conversation history
   */
  async clearHistory(): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/chat/history`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Clear history error: ${response.statusText}`);
    }
  }

  /**
   * Track a search query
   */
  async trackSearch(query: string): Promise<void> {
    await fetch(`${this.apiBaseUrl}/chat/context/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        query,
      }),
    });
  }

  /**
   * Track a viewed vehicle
   */
  async trackViewedVehicle(vin: string): Promise<void> {
    await fetch(`${this.apiBaseUrl}/chat/context/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        vin,
      }),
    });
  }

  /**
   * Get suggested questions
   */
  async getSuggestions(): Promise<string[]> {
    const response = await fetch(`${this.apiBaseUrl}/chat/suggestions`);
    const data = await response.json();
    return data.data.suggestions;
  }

  /**
   * Submit feedback
   */
  async submitFeedback(
    rating: 'helpful' | 'not_helpful',
    comment?: string
  ): Promise<void> {
    await fetch(`${this.apiBaseUrl}/chat/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        rating,
        comment,
      }),
    });
  }

  /**
   * Reset session (creates new session ID)
   */
  resetSession(): void {
    localStorage.removeItem('chat_session_id');
    this.sessionId = this.getOrCreateSessionId();
  }
}

/**
 * Usage Examples
 */

// Example 1: Basic chat interaction
async function basicChatExample() {
  const client = new ChatClient();

  try {
    const response = await client.sendMessage(
      "What's a good electric SUV under $50k?"
    );

    console.log('AI Response:', response.data.message);
    console.log('Citations:', response.data.citations);

    // Display citations
    response.data.citations.forEach(citation => {
      console.log(
        `[${citation.id}] ${citation.vehicle.year} ${citation.vehicle.make} ${citation.vehicle.model} - $${citation.vehicle.price}`
      );
    });
  } catch (error) {
    console.error('Chat error:', error);
  }
}

// Example 2: Multi-turn conversation
async function conversationExample() {
  const client = new ChatClient();

  try {
    // First message
    const response1 = await client.sendMessage('Show me reliable SUVs');
    console.log('AI:', response1.data.message);

    // Follow-up message
    const response2 = await client.sendMessage(
      'What about ones with low mileage?',
      true // Include conversation history
    );
    console.log('AI:', response2.data.message);

    // Get full history
    const history = await client.getHistory();
    console.log('Conversation history:', history);
  } catch (error) {
    console.error('Conversation error:', error);
  }
}

// Example 3: Track user context
async function contextTrackingExample() {
  const client = new ChatClient();

  try {
    // Track when user searches
    await client.trackSearch('electric SUV');

    // Track when user views a listing
    await client.trackViewedVehicle('5YJYGDEE1RF123456');

    // Now chat with context
    const response = await client.sendMessage(
      'Tell me more about that Tesla I just looked at'
    );
    console.log('AI:', response.data.message);
  } catch (error) {
    console.error('Context tracking error:', error);
  }
}

// Example 4: Display suggestions
async function suggestionsExample() {
  const client = new ChatClient();

  try {
    const suggestions = await client.getSuggestions();
    console.log('Suggested questions:');
    suggestions.forEach((suggestion, idx) => {
      console.log(`${idx + 1}. ${suggestion}`);
    });
  } catch (error) {
    console.error('Suggestions error:', error);
  }
}

// Example 5: Feedback collection
async function feedbackExample() {
  const client = new ChatClient();

  try {
    const response = await client.sendMessage('What trucks do you have?');
    console.log('AI:', response.data.message);

    // User liked the response
    await client.submitFeedback('helpful', 'Great recommendations!');
  } catch (error) {
    console.error('Feedback error:', error);
  }
}

// Example 6: React component integration
/**
 * React Chat Component Example
 */
/*
import React, { useState, useEffect } from 'react';

function ChatWidget() {
  const [client] = useState(() => new ChatClient());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Load history on mount
    client.getHistory().then(setMessages);

    // Load suggestions
    client.getSuggestions().then(setSuggestions);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await client.sendMessage(input);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.message,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Display citations if any
      if (response.data.citations.length > 0) {
        console.log('Citations:', response.data.citations);
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="chat-widget">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="loading">Thinking...</div>}
      </div>

      <div className="suggestions">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(suggestion)}
            className="suggestion-chip"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about vehicles..."
          disabled={loading}
        />
        <button onClick={handleSendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatWidget;
*/

// Example 7: Citation rendering
function renderCitation(citation: Citation): string {
  return `
    <div class="citation" data-vin="${citation.vin}">
      <span class="citation-number">[${citation.id}]</span>
      <a href="${citation.url}" class="citation-link">
        ${citation.vehicle.year} ${citation.vehicle.make} ${citation.vehicle.model}
        <span class="citation-price">$${citation.vehicle.price.toLocaleString()}</span>
      </a>
    </div>
  `;
}

// Example 8: Error handling with retry
async function robustChatExample() {
  const client = new ChatClient();
  let retries = 3;

  while (retries > 0) {
    try {
      const response = await client.sendMessage('Show me sedans');
      console.log('Success:', response.data.message);
      break;
    } catch (error) {
      retries--;
      console.log(`Error, retrying... (${retries} attempts left)`);

      if (retries === 0) {
        console.error('Failed after all retries:', error);
        // Fallback to showing cached results or error message
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Export for use in other modules
export {
  ChatClient,
  type ChatMessage,
  type Citation,
  type ChatResponse,
  renderCitation,
};

// Run examples (comment out in production)
if (typeof window === 'undefined') {
  // Node.js environment (for testing)
  console.log('Chat Client Examples');
  console.log('===================\n');

  // Uncomment to run examples:
  // basicChatExample();
  // conversationExample();
  // contextTrackingExample();
  // suggestionsExample();
  // feedbackExample();
}

import type { Env } from '../types/env';
import type { Listing } from '../db/schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, like } from 'drizzle-orm';
import * as schema from '../db/schema';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  recentSearches?: string[];
  viewedVehicles?: string[];
  relevantListings?: Listing[];
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  context?: ChatContext;
}

export interface Citation {
  id: string;
  text: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  price: number;
  url: string;
}

/**
 * Chat service using Cloudflare Workers AI
 */
export class ChatService {
  private env: Env;
  private db: ReturnType<typeof drizzle>;

  constructor(env: Env) {
    this.env = env;
    this.db = drizzle(env.DB, { schema });
  }

  /**
   * Send a chat message and get AI response with citations
   */
  async sendMessage(
    message: string,
    sessionId: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    // Query database for relevant listings based on user message
    const relevantListings = await this.findRelevantListings(message);

    // Build context from listings
    const context = this.buildContext(relevantListings);

    // Get conversation history from KV
    const history = await this.getConversationHistory(sessionId);
    const fullHistory = [...history, ...conversationHistory];

    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(context, relevantListings);

    // Prepare messages for AI
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...fullHistory,
      { role: 'user', content: message },
    ];

    // Call Workers AI
    const aiResponse = await this.callWorkersAI(messages);

    // Parse citations from response
    const citations = this.extractCitations(aiResponse, relevantListings);

    // Save to conversation history
    await this.saveConversationHistory(sessionId, [
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse },
    ]);

    return {
      message: aiResponse,
      citations,
      context: {
        relevantListings,
        recentSearches: await this.getRecentSearches(sessionId),
        viewedVehicles: await this.getViewedVehicles(sessionId),
      },
    };
  }

  /**
   * Find relevant listings based on user query
   */
  private async findRelevantListings(query: string): Promise<Listing[]> {
    const lowerQuery = query.toLowerCase();

    // Extract search parameters from natural language
    const params = this.parseQuery(lowerQuery);

    // Build where conditions
    const conditions = [eq(schema.listings.isActive, 1)];

    if (params.make) {
      conditions.push(like(schema.listings.make, `%${params.make}%`));
    }
    if (params.model) {
      conditions.push(like(schema.listings.model, `%${params.model}%`));
    }
    if (params.yearMin) {
      conditions.push(gte(schema.listings.year, params.yearMin));
    }
    if (params.yearMax) {
      conditions.push(lte(schema.listings.year, params.yearMax));
    }
    if (params.priceMax) {
      conditions.push(lte(schema.listings.price, params.priceMax));
    }
    if (params.milesMax) {
      conditions.push(lte(schema.listings.miles, params.milesMax));
    }
    if (params.fuelType) {
      conditions.push(eq(schema.listings.fuelType, params.fuelType));
    }
    if (params.bodyType) {
      conditions.push(like(schema.listings.bodyType, `%${params.bodyType}%`));
    }

    // Query database
    const listings = await this.db
      .select()
      .from(schema.listings)
      .where(and(...conditions))
      .limit(10);

    return listings;
  }

  /**
   * Parse natural language query into search parameters
   */
  private parseQuery(query: string): {
    make?: string;
    model?: string;
    yearMin?: number;
    yearMax?: number;
    priceMax?: number;
    milesMax?: number;
    fuelType?: string;
    bodyType?: string;
  } {
    const params: any = {};

    // Extract price
    const priceMatch = query.match(/under\s+\$?(\d{1,3}),?(\d{3})/i);
    if (priceMatch) {
      params.priceMax = parseInt(priceMatch[1] + priceMatch[2]);
    }

    // Extract year
    const yearMatch = query.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 2000 && year <= 2030) {
        params.yearMin = year;
        params.yearMax = year;
      }
    }

    // Extract miles
    const milesMatch = query.match(/under\s+(\d{1,3}),?(\d{3})?\s*(miles|mi|k)/i);
    if (milesMatch) {
      const miles = parseInt(milesMatch[1] + (milesMatch[2] || '000'));
      params.milesMax = miles;
    }

    // Fuel type
    if (query.includes('electric') || query.includes('ev')) {
      params.fuelType = 'Electric';
    } else if (query.includes('hybrid')) {
      params.fuelType = 'Hybrid';
    } else if (query.includes('diesel')) {
      params.fuelType = 'Diesel';
    }

    // Body type
    if (query.includes('suv')) {
      params.bodyType = 'SUV';
    } else if (query.includes('sedan')) {
      params.bodyType = 'Sedan';
    } else if (query.includes('truck')) {
      params.bodyType = 'Truck';
    } else if (query.includes('coupe')) {
      params.bodyType = 'Coupe';
    } else if (query.includes('hatchback')) {
      params.bodyType = 'Hatchback';
    } else if (query.includes('wagon')) {
      params.bodyType = 'Wagon';
    } else if (query.includes('van') || query.includes('minivan')) {
      params.bodyType = 'Van';
    }

    // Extract make/model (common brands)
    const makes = [
      'toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'nissan', 'hyundai', 'kia',
      'mazda', 'subaru', 'volkswagen', 'vw', 'bmw', 'mercedes', 'audi', 'lexus',
      'tesla', 'jeep', 'ram', 'gmc', 'dodge', 'chrysler', 'buick', 'cadillac',
      'volvo', 'genesis', 'acura', 'infiniti', 'lincoln', 'porsche', 'land rover',
      'jaguar', 'mini', 'fiat', 'alfa romeo', 'maserati', 'bentley', 'rolls royce',
      'ferrari', 'lamborghini', 'mclaren', 'aston martin'
    ];

    for (const make of makes) {
      if (query.includes(make)) {
        params.make = make.charAt(0).toUpperCase() + make.slice(1);
        if (make === 'chevy') params.make = 'Chevrolet';
        if (make === 'vw') params.make = 'Volkswagen';
        break;
      }
    }

    return params;
  }

  /**
   * Build context string from listings
   */
  private buildContext(listings: Listing[]): string {
    if (listings.length === 0) {
      return 'No relevant vehicles found in the current inventory.';
    }

    const contextLines = listings.map((listing, idx) => {
      return `[${idx + 1}] ${listing.year} ${listing.make} ${listing.model} ${listing.trim || ''} - $${listing.price?.toLocaleString() || 'N/A'} - ${listing.miles?.toLocaleString() || 'N/A'} miles - VIN: ${listing.vin}`;
    });

    return `Available vehicles:\n${contextLines.join('\n')}`;
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(context: string, listings: Listing[]): string {
    return `You are a helpful car shopping assistant for a car search platform. Your role is to help users find the perfect vehicle based on their needs and preferences.

Current inventory context:
${context}

Guidelines:
- Be conversational, friendly, and helpful
- When recommending vehicles, reference them by their citation number [1], [2], etc.
- Provide specific details like price, mileage, features when available
- If the user asks about a specific vehicle, use the VIN to identify it
- If no vehicles match their criteria, suggest expanding their search or adjusting parameters
- Always be honest about vehicle availability and pricing
- Focus on helping the user make an informed decision

When recommending vehicles, use this format:
"I recommend the [1] 2024 Tesla Model 3 at $52,990 with 12,000 miles."

Remember: You have access to ${listings.length} vehicles in the current search results.`;
  }

  /**
   * Call Cloudflare Workers AI
   */
  private async callWorkersAI(messages: ChatMessage[]): Promise<string> {
    try {
      // Use Llama 3.1 8B Instruct model
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
      });

      // Extract response text
      if (typeof response === 'object' && response !== null) {
        const aiResponse = response as { response?: string; result?: { response?: string } };
        return aiResponse.response || aiResponse.result?.response || 'I apologize, but I encountered an error processing your request.';
      }

      return String(response);
    } catch (error) {
      console.error('Workers AI error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Extract citations from AI response
   */
  private extractCitations(response: string, listings: Listing[]): Citation[] {
    const citations: Citation[] = [];

    // Find citation markers like [1], [2], etc.
    const citationPattern = /\[(\d+)\]/g;
    const matches = response.matchAll(citationPattern);

    const citedIndices = new Set<number>();
    for (const match of matches) {
      const index = parseInt(match[1]) - 1;
      if (index >= 0 && index < listings.length) {
        citedIndices.add(index);
      }
    }

    // Build citations for referenced listings
    for (const index of citedIndices) {
      const listing = listings[index];
      citations.push({
        id: `${index + 1}`,
        text: `${listing.year} ${listing.make} ${listing.model} ${listing.trim || ''}`.trim(),
        vin: listing.vin,
        year: listing.year,
        make: listing.make,
        model: listing.model,
        price: listing.price || 0,
        url: `/listings/${listing.vin}`,
      });
    }

    return citations;
  }

  /**
   * Get conversation history from KV
   */
  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const key = `chat:history:${sessionId}`;
      const history = await this.env.CACHE.get(key, 'json');
      return (history as ChatMessage[]) || [];
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  /**
   * Save conversation history to KV
   */
  private async saveConversationHistory(sessionId: string, messages: ChatMessage[]): Promise<void> {
    try {
      const key = `chat:history:${sessionId}`;
      const existing = await this.getConversationHistory(sessionId);
      const updated = [...existing, ...messages];

      // Keep only last 20 messages
      const trimmed = updated.slice(-20);

      // Save with 24 hour expiration
      await this.env.CACHE.put(key, JSON.stringify(trimmed), {
        expirationTtl: 86400,
      });
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }

  /**
   * Clear conversation history
   */
  async clearHistory(sessionId: string): Promise<void> {
    const key = `chat:history:${sessionId}`;
    await this.env.CACHE.delete(key);
  }

  /**
   * Get recent searches from session
   */
  private async getRecentSearches(sessionId: string): Promise<string[]> {
    try {
      const key = `session:searches:${sessionId}`;
      const searches = await this.env.CACHE.get(key, 'json');
      return (searches as string[]) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get viewed vehicles from session
   */
  private async getViewedVehicles(sessionId: string): Promise<string[]> {
    try {
      const key = `session:viewed:${sessionId}`;
      const viewed = await this.env.CACHE.get(key, 'json');
      return (viewed as string[]) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Track user search
   */
  async trackSearch(sessionId: string, query: string): Promise<void> {
    try {
      const key = `session:searches:${sessionId}`;
      const existing = await this.getRecentSearches(sessionId);
      const updated = [...existing, query].slice(-10); // Keep last 10

      await this.env.CACHE.put(key, JSON.stringify(updated), {
        expirationTtl: 86400,
      });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  /**
   * Track viewed vehicle
   */
  async trackViewedVehicle(sessionId: string, vin: string): Promise<void> {
    try {
      const key = `session:viewed:${sessionId}`;
      const existing = await this.getViewedVehicles(sessionId);

      // Add to beginning, remove duplicates, keep last 10
      const updated = [vin, ...existing.filter(v => v !== vin)].slice(0, 10);

      await this.env.CACHE.put(key, JSON.stringify(updated), {
        expirationTtl: 86400,
      });
    } catch (error) {
      console.error('Error tracking viewed vehicle:', error);
    }
  }
}

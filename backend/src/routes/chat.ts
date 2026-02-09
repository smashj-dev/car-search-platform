import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { ChatService } from '../services/chat';
import { CitationService } from '../services/citations';

export const chatRouter = new Hono<{ Bindings: Env }>();

// Request schemas
const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
  includeHistory: z.boolean().default(true),
});

const historyQuerySchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * POST /api/v1/chat
 * Send a message and get AI response with citations
 */
chatRouter.post('/', zValidator('json', chatMessageSchema), async (c) => {
  try {
    const { message, sessionId, includeHistory } = c.req.valid('json');

    // Generate session ID if not provided
    const actualSessionId = sessionId || crypto.randomUUID();

    // Initialize chat service
    const chatService = new ChatService(c.env);

    // Track the search
    await chatService.trackSearch(actualSessionId, message);

    // Get conversation history if requested
    const history = includeHistory
      ? await chatService.getConversationHistory(actualSessionId)
      : [];

    // Send message and get response
    const response = await chatService.sendMessage(message, actualSessionId, history);

    // Format citations for response
    const formattedCitations = response.citations.map(citation => ({
      id: citation.id,
      text: citation.text,
      vin: citation.vin,
      vehicle: {
        year: citation.year,
        make: citation.make,
        model: citation.model,
        price: citation.price,
      },
      url: citation.url,
    }));

    return c.json({
      success: true,
      data: {
        message: response.message,
        citations: formattedCitations,
        sessionId: actualSessionId,
        context: {
          relevantListings: response.context?.relevantListings?.length || 0,
          recentSearches: response.context?.recentSearches || [],
          viewedVehicles: response.context?.viewedVehicles || [],
        },
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: error.message || 'Failed to process chat message',
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/chat/history
 * Get conversation history for a session
 */
chatRouter.get('/history', zValidator('query', historyQuerySchema), async (c) => {
  try {
    const { sessionId } = c.req.valid('query');

    // Initialize chat service
    const chatService = new ChatService(c.env);

    // Get conversation history
    const history = await chatService.getConversationHistory(sessionId);

    return c.json({
      success: true,
      data: {
        sessionId,
        messages: history,
        count: history.length,
      },
    });
  } catch (error: any) {
    console.error('History fetch error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: error.message || 'Failed to fetch conversation history',
        },
      },
      500
    );
  }
});

/**
 * DELETE /api/v1/chat/history
 * Clear conversation history for a session
 */
chatRouter.delete('/history', zValidator('json', z.object({
  sessionId: z.string().min(1),
})), async (c) => {
  try {
    const { sessionId } = c.req.valid('json');

    // Initialize chat service
    const chatService = new ChatService(c.env);

    // Clear history
    await chatService.clearHistory(sessionId);

    return c.json({
      success: true,
      data: {
        sessionId,
        message: 'Conversation history cleared',
      },
    });
  } catch (error: any) {
    console.error('History clear error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'CLEAR_ERROR',
          message: error.message || 'Failed to clear conversation history',
        },
      },
      500
    );
  }
});

/**
 * POST /api/v1/chat/context/search
 * Track a search in the session context
 */
chatRouter.post('/context/search', zValidator('json', z.object({
  sessionId: z.string().min(1),
  query: z.string().min(1),
})), async (c) => {
  try {
    const { sessionId, query } = c.req.valid('json');

    const chatService = new ChatService(c.env);
    await chatService.trackSearch(sessionId, query);

    return c.json({
      success: true,
      data: { message: 'Search tracked' },
    });
  } catch (error: any) {
    console.error('Track search error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'TRACK_ERROR',
          message: error.message || 'Failed to track search',
        },
      },
      500
    );
  }
});

/**
 * POST /api/v1/chat/context/view
 * Track a viewed vehicle in the session context
 */
chatRouter.post('/context/view', zValidator('json', z.object({
  sessionId: z.string().min(1),
  vin: z.string().min(1),
})), async (c) => {
  try {
    const { sessionId, vin } = c.req.valid('json');

    const chatService = new ChatService(c.env);
    await chatService.trackViewedVehicle(sessionId, vin);

    return c.json({
      success: true,
      data: { message: 'Vehicle view tracked' },
    });
  } catch (error: any) {
    console.error('Track view error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'TRACK_ERROR',
          message: error.message || 'Failed to track vehicle view',
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/chat/suggestions
 * Get suggested questions based on context
 */
chatRouter.get('/suggestions', zValidator('query', z.object({
  sessionId: z.string().optional(),
})), async (c) => {
  const suggestions = [
    "What's a good electric SUV under $50k?",
    "Show me reliable sedans with low mileage",
    "What are the best family vehicles available?",
    "Find me a truck under 50,000 miles",
    "What luxury cars do you have under $40k?",
    "Compare hybrid SUVs in your inventory",
  ];

  return c.json({
    success: true,
    data: {
      suggestions,
    },
  });
});

/**
 * POST /api/v1/chat/feedback
 * Submit feedback on AI response
 */
chatRouter.post('/feedback', zValidator('json', z.object({
  sessionId: z.string().min(1),
  messageId: z.string().optional(),
  rating: z.enum(['helpful', 'not_helpful']),
  comment: z.string().optional(),
})), async (c) => {
  try {
    const feedback = c.req.valid('json');

    // Store feedback in KV for analytics
    const key = `chat:feedback:${feedback.sessionId}:${Date.now()}`;
    await c.env.CACHE.put(key, JSON.stringify(feedback), {
      expirationTtl: 2592000, // 30 days
    });

    return c.json({
      success: true,
      data: { message: 'Feedback received' },
    });
  } catch (error: any) {
    console.error('Feedback error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'FEEDBACK_ERROR',
          message: error.message || 'Failed to submit feedback',
        },
      },
      500
    );
  }
});

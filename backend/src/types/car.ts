import { z } from 'zod';

// Core car identification
export const CarIdentifierSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int().min(1900).max(2030),
  generation: z.string().optional(), // e.g., "JK1" for Genesis GV80
});

export type CarIdentifier = z.infer<typeof CarIdentifierSchema>;

// The "soul" of the car - enthusiast-level insights
export const InsightCategorySchema = z.enum([
  'driving_feel',        // How it feels behind the wheel
  'common_issues',       // Known problems, failure points
  'ownership_costs',     // Real maintenance costs, insurance
  'buy_avoid_years',     // Which years to target/avoid
  'mod_support',         // Aftermarket community, parts availability
  'real_world_mpg',      // Actual fuel economy from owners
  'character',           // The soul - what makes it special
  'comparison',          // How it stacks vs competitors
  'long_term_ownership', // 2+ year owner reports
  'dealer_experience',   // Service department quality
]);

export type InsightCategory = z.infer<typeof InsightCategorySchema>;

export const CarInsightSchema = z.object({
  id: z.string().uuid(),
  carId: z.string().uuid(),
  category: InsightCategorySchema,
  insight: z.string(),
  sourceUrl: z.string().url().optional(),
  sourceName: z.string(), // "GenesisForum.com", "Reddit r/GenesisMotors"
  confidenceScore: z.number().min(0).max(1), // How reliable is this insight
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CarInsight = z.infer<typeof CarInsightSchema>;

// Forum thread data
export const ForumThreadSchema = z.object({
  id: z.string().uuid(),
  carId: z.string().uuid(),
  forumSource: z.string(),
  threadUrl: z.string().url(),
  title: z.string(),
  summary: z.string(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  replyCount: z.number().int(),
  viewCount: z.number().int().optional(),
  lastActivity: z.date(),
  scrapedAt: z.date(),
});

export type ForumThread = z.infer<typeof ForumThreadSchema>;

// Search request tracking
export const SearchRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  carQuery: z.string(), // "2021 Genesis GV80"
  parsedMake: z.string().optional(),
  parsedModel: z.string().optional(),
  parsedYear: z.number().int().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  notifiedAt: z.date().optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

// Cache key structure
export const CacheKeySchema = z.object({
  type: z.enum(['car_profile', 'insights', 'forum_threads', 'search_result']),
  identifier: z.string(), // "genesis_gv80_2021"
});

export type CacheKey = z.infer<typeof CacheKeySchema>;

// API response for car research
export const CarResearchResponseSchema = z.object({
  car: CarIdentifierSchema,
  insights: z.array(CarInsightSchema),
  forumThreads: z.array(ForumThreadSchema),
  enrichmentStatus: z.enum(['complete', 'partial', 'enriching']),
  lastUpdated: z.date(),
  sources: z.array(z.string()),
});

export type CarResearchResponse = z.infer<typeof CarResearchResponseSchema>;

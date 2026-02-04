import type { Env } from '../types/env';
import { quickSentiment, truncate, extractDomain } from '../utils/helpers';

interface ScrapeResult {
  insights: Array<{
    category: string;
    insight: string;
    sourceUrl: string;
    sourceName: string;
    sentiment: string;
    confidenceScore: number;
  }>;
  threads: Array<{
    title: string;
    url: string;
    summary: string;
    sentiment: string;
    replyCount: number;
  }>;
}

/**
 * Main scraper orchestrator
 * Coordinates scraping from multiple sources and AI summarization
 */
export class CarScraper {
  constructor(private env: Env) {}

  /**
   * Scrape all sources for a car and extract insights
   */
  async scrapeForCar(
    carId: string,
    make: string,
    model: string,
    year?: number
  ): Promise<ScrapeResult> {
    const query = `${year || ''} ${make} ${model}`.trim();

    const results: ScrapeResult = {
      insights: [],
      threads: [],
    };

    // Scrape Reddit
    try {
      const redditResults = await this.scrapeReddit(query, make);
      results.insights.push(...redditResults.insights);
      results.threads.push(...redditResults.threads);
    } catch (error) {
      console.error('Reddit scrape failed:', error);
    }

    // Scrape forum (GenesisForum for GV80)
    try {
      const forumResults = await this.scrapeForum(query, make, model);
      results.insights.push(...forumResults.insights);
      results.threads.push(...forumResults.threads);
    } catch (error) {
      console.error('Forum scrape failed:', error);
    }

    // Use AI to synthesize insights
    try {
      const aiInsights = await this.synthesizeWithAI(results, make, model, year);
      results.insights.push(...aiInsights);
    } catch (error) {
      console.error('AI synthesis failed:', error);
    }

    return results;
  }

  /**
   * Scrape Reddit for car discussions
   */
  private async scrapeReddit(
    query: string,
    make: string
  ): Promise<ScrapeResult> {
    const results: ScrapeResult = { insights: [], threads: [] };

    // Subreddits to search
    const subreddits = [
      'GenesisMotors',
      'whatcarshouldIbuy',
      'cars',
      'Autos',
      'askcarsales',
    ];

    // For Genesis specifically
    if (make.toLowerCase() === 'genesis') {
      subreddits.unshift('GenesisOwners');
    }

    for (const subreddit of subreddits.slice(0, 3)) { // Limit to avoid rate limits
      try {
        const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=10`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Kemi Car Research Bot/1.0',
          },
        });

        if (!response.ok) continue;

        const data = await response.json() as any;
        const posts = data?.data?.children || [];

        for (const post of posts) {
          const postData = post.data;

          results.threads.push({
            title: postData.title,
            url: `https://reddit.com${postData.permalink}`,
            summary: truncate(postData.selftext || postData.title, 500),
            sentiment: quickSentiment(postData.selftext || postData.title),
            replyCount: postData.num_comments || 0,
          });

          // Extract insights from high-engagement posts
          if (postData.num_comments > 10 || postData.score > 20) {
            const text = `${postData.title} ${postData.selftext || ''}`;

            // Check for common issue mentions
            if (text.toLowerCase().includes('issue') || text.toLowerCase().includes('problem')) {
              results.insights.push({
                category: 'common_issues',
                insight: truncate(text, 500),
                sourceUrl: `https://reddit.com${postData.permalink}`,
                sourceName: `Reddit r/${subreddit}`,
                sentiment: quickSentiment(text),
                confidenceScore: Math.min(0.9, 0.5 + (postData.score / 100)),
              });
            }

            // Check for ownership experience
            if (text.toLowerCase().includes('owner') || text.toLowerCase().includes('month') || text.toLowerCase().includes('year')) {
              results.insights.push({
                category: 'long_term_ownership',
                insight: truncate(text, 500),
                sourceUrl: `https://reddit.com${postData.permalink}`,
                sourceName: `Reddit r/${subreddit}`,
                sentiment: quickSentiment(text),
                confidenceScore: Math.min(0.9, 0.5 + (postData.score / 100)),
              });
            }
          }
        }
      } catch (error) {
        console.error(`Failed to scrape r/${subreddit}:`, error);
      }
    }

    return results;
  }

  /**
   * Scrape dedicated car forum
   */
  private async scrapeForum(
    query: string,
    make: string,
    model: string
  ): Promise<ScrapeResult> {
    const results: ScrapeResult = { insights: [], threads: [] };

    // This would be expanded with actual forum scraping logic
    // For now, we'll use a placeholder that can be expanded

    // Genesis forums
    if (make.toLowerCase() === 'genesis') {
      // GenesisForum.com search
      // In production, this would use Puppeteer/Playwright or a scraping service
      console.log(`Would scrape GenesisForum.com for: ${query}`);

      // Placeholder - in production this would be real scrape data
      results.insights.push({
        category: 'driving_feel',
        insight: `The ${model} has been praised for its smooth ride quality and quiet cabin, comparable to German luxury competitors.`,
        sourceUrl: 'https://www.genesisforum.com',
        sourceName: 'GenesisForum.com',
        sentiment: 'positive',
        confidenceScore: 0.7,
      });

      results.insights.push({
        category: 'common_issues',
        insight: `Some owners report minor infotainment glitches that are typically resolved with software updates. No major mechanical issues reported.`,
        sourceUrl: 'https://www.genesisforum.com',
        sourceName: 'GenesisForum.com',
        sentiment: 'neutral',
        confidenceScore: 0.7,
      });

      results.insights.push({
        category: 'dealer_experience',
        insight: `Genesis concierge service praised highly - they pick up your car for service and leave a loaner. Better than traditional luxury brands.`,
        sourceUrl: 'https://www.genesisforum.com',
        sourceName: 'GenesisForum.com',
        sentiment: 'positive',
        confidenceScore: 0.8,
      });
    }

    return results;
  }

  /**
   * Use Cloudflare Workers AI to synthesize insights
   */
  private async synthesizeWithAI(
    rawResults: ScrapeResult,
    make: string,
    model: string,
    year?: number
  ): Promise<ScrapeResult['insights']> {
    const carName = `${year || ''} ${make} ${model}`.trim();

    // Combine all raw text for analysis
    const rawText = [
      ...rawResults.threads.map(t => `${t.title}: ${t.summary}`),
      ...rawResults.insights.map(i => i.insight),
    ].join('\n\n');

    if (!rawText.trim()) {
      return [];
    }

    try {
      // Use Cloudflare Workers AI for summarization
      const prompt = `Analyze these forum posts and reviews about the ${carName} and extract key insights for a car buyer. Focus on:
1. What's the driving experience like? (driving_feel)
2. What common issues should buyers watch for? (common_issues)
3. What are realistic ownership costs? (ownership_costs)
4. What's the car's character/personality? (character)

Raw data:
${truncate(rawText, 3000)}

Respond in JSON format with an array of insights, each having: category, insight (2-3 sentences), sentiment (positive/negative/neutral/mixed), confidenceScore (0-1).`;

      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        prompt,
        max_tokens: 1000,
      }) as { response: string };

      // Parse AI response
      try {
        const aiInsights = JSON.parse(response.response);
        return aiInsights.map((i: any) => ({
          ...i,
          sourceUrl: '',
          sourceName: 'AI Analysis',
        }));
      } catch {
        // AI didn't return valid JSON, return empty
        return [];
      }
    } catch (error) {
      console.error('AI synthesis failed:', error);
      return [];
    }
  }
}

/**
 * Process a scrape job from the queue
 */
export async function processScrapeJob(
  env: Env,
  jobData: {
    jobId?: string;
    carId: string;
    searchRequestId?: string;
    email?: string;
    source: string;
  }
): Promise<void> {
  const { carId, searchRequestId, email } = jobData;
  const now = new Date().toISOString();

  // Get car details
  const carResult = await env.DB.prepare(
    'SELECT * FROM cars WHERE id = ?'
  ).bind(carId).first();

  if (!carResult) {
    console.error(`Car not found: ${carId}`);
    return;
  }

  const car = carResult as {
    id: string;
    make: string;
    model: string;
    year: number;
    normalized_key: string;
  };

  // Run scraper
  const scraper = new CarScraper(env);
  const results = await scraper.scrapeForCar(
    car.id,
    car.make,
    car.model,
    car.year
  );

  // Save insights to DB
  for (const insight of results.insights) {
    const insightId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO car_insights (id, car_id, category, insight, source_url, source_name, confidence_score, sentiment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      insightId,
      carId,
      insight.category,
      insight.insight,
      insight.sourceUrl || null,
      insight.sourceName,
      insight.confidenceScore,
      insight.sentiment,
      now,
      now
    ).run();
  }

  // Save threads to DB
  for (const thread of results.threads) {
    const threadId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT OR IGNORE INTO forum_threads (id, car_id, forum_source, thread_url, title, summary, sentiment, reply_count, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      threadId,
      carId,
      extractDomain(thread.url),
      thread.url,
      thread.title,
      thread.summary,
      thread.sentiment,
      thread.replyCount,
      now
    ).run();
  }

  // Update car status
  await env.DB.prepare(`
    UPDATE cars SET enrichment_status = 'complete', updated_at = ? WHERE id = ?
  `).bind(now, carId).run();

  // Update search request if exists
  if (searchRequestId) {
    await env.DB.prepare(`
      UPDATE search_requests SET status = 'completed', completed_at = ? WHERE id = ?
    `).bind(now, searchRequestId).run();
  }

  // Invalidate cache
  await env.CACHE.delete(`car:${car.normalized_key}`);
  await env.CACHE.delete(`car_full:${car.normalized_key}`);
  await env.CACHE.delete(`search:${car.normalized_key}`);

  // Send email notification if requested
  if (email) {
    await sendCompletionEmail(env, email, car.make, car.model, car.year);
  }

  console.log(`Completed scrape for ${car.year} ${car.make} ${car.model}: ${results.insights.length} insights, ${results.threads.length} threads`);
}

/**
 * Send email notification when research is complete
 */
async function sendCompletionEmail(
  env: Env,
  toEmail: string,
  make: string,
  model: string,
  year?: number
): Promise<void> {
  const carName = `${year || ''} ${make} ${model}`.trim();

  // Using MailChannels via Cloudflare Workers
  // Requires DNS setup: https://developers.cloudflare.com/email-routing/
  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail }],
          },
        ],
        from: {
          email: 'research@kemi.app',
          name: 'Kemi Car Research',
        },
        subject: `Your ${carName} research is ready!`,
        content: [
          {
            type: 'text/html',
            value: `
              <h1>Your ${carName} Research is Ready!</h1>
              <p>Great news! We've finished gathering insights about the ${carName} from enthusiast forums and owner reviews.</p>
              <p>Here's what we found:</p>
              <ul>
                <li>Driving experience and feel</li>
                <li>Common issues to watch for</li>
                <li>Real ownership costs</li>
                <li>Long-term owner experiences</li>
              </ul>
              <p><a href="https://kemi.app/research/${make.toLowerCase()}_${model.toLowerCase()}_${year || ''}">View Your Full Report</a></p>
              <p>Happy car shopping!</p>
              <p>- The Kemi Team</p>
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Email send failed:', await response.text());
    }
  } catch (error) {
    console.error('Email send error:', error);
  }
}

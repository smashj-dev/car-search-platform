import puppeteer from '@cloudflare/puppeteer';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { Env } from '../types/env';
import * as schema from '../db/schema';

export interface ScrapedListing {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price?: number;
  miles?: number;
  condition: string;
  exteriorColor?: string;
  interiorColor?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  imageUrl?: string;
  dealerName: string;
  dealerCity: string;
  dealerState: string;
  sourceUrl: string;
}

export async function scrapeCarsComSearch(
  env: Env,
  make: string,
  model: string,
  zipCode: string,
  radius: number = 100,
  maxRetries: number = 3
): Promise<ScrapedListing[]> {

  const url = `https://www.cars.com/shopping/results/?` +
    `stock_type=all&makes[]=${encodeURIComponent(make)}&` +
    `models[]=${encodeURIComponent(`${make}-${model}`)}&` +
    `list_price_max=&maximum_distance=${radius}&zip=${zipCode}`;

  console.log(`Scraping Cars.com: ${url}`);

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    attempt++;

    try {
      // Rate limiting: wait 2-3 seconds between attempts
      if (attempt > 1) {
        const delay = 2000 + Math.random() * 1000; // 2-3 seconds
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const browser = await puppeteer.launch(env.BROWSER);
      const page = await browser.newPage();

      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to search results
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for listings to load - try multiple selectors
      try {
        await page.waitForSelector('.vehicle-card, [data-qa="vehicle-card"], .vehicle-cards-item', {
          timeout: 15000
        });
      } catch (selectorError) {
        console.warn('Primary selectors not found, checking for alternative content');
      }

      // Check for anti-bot detection
      const bodyText = await page.evaluate(() => document.body.textContent || '');
      if (bodyText.includes('Access Denied') || bodyText.includes('captcha') || bodyText.includes('robot')) {
        throw new Error('Anti-bot detection triggered');
      }

      // Extract listing data with multiple selector strategies
      const listings = await page.evaluate(() => {
        const results: any[] = [];

        // Try multiple selector patterns
        const cardSelectors = [
          '.vehicle-card',
          '[data-qa="vehicle-card"]',
          '.vehicle-cards-item',
          'article[class*="vehicle"]'
        ];

        let cards: NodeListOf<Element> | null = null;
        for (const selector of cardSelectors) {
          cards = document.querySelectorAll(selector);
          if (cards.length > 0) {
            console.log(`Found ${cards.length} cards with selector: ${selector}`);
            break;
          }
        }

        if (!cards || cards.length === 0) {
          console.warn('No vehicle cards found with any selector');
          return results;
        }

        cards.forEach((card, index) => {
          try {
            // VIN - try multiple approaches
            let vin = '';
            const vinElement = card.querySelector('[data-vin]');
            if (vinElement) {
              vin = vinElement.getAttribute('data-vin') || '';
            }

            // Also check for VIN in link or data attributes
            if (!vin) {
              const linkElement = card.querySelector('a[href*="vehicledetail"]');
              const href = linkElement?.getAttribute('href') || '';
              const vinMatch = href.match(/vin[=\/]([A-HJ-NPR-Z0-9]{17})/i);
              if (vinMatch) vin = vinMatch[1];
            }

            if (!vin) {
              console.warn(`Card ${index}: No VIN found, skipping`);
              return;
            }

            // Title (contains year, make, model) - try multiple selectors
            const titleSelectors = ['.title', '[data-qa="title"]', 'h2', '.vehicle-card__title'];
            let titleText = '';
            for (const selector of titleSelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent?.trim()) {
                titleText = el.textContent.trim();
                break;
              }
            }

            const titleParts = titleText.split(' ');
            const year = parseInt(titleParts[0]) || 0;
            const make = titleParts[1] || '';
            const model = titleParts.slice(2).join(' ') || '';

            // Price - try multiple selectors
            const priceSelectors = ['.primary-price', '[data-qa="price"]', '.price-section span'];
            let priceText = '';
            for (const selector of priceSelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent) {
                priceText = el.textContent.replace(/[^0-9]/g, '');
                break;
              }
            }
            const price = parseInt(priceText) || null;

            // Mileage
            const mileageSelectors = ['.mileage', '[data-qa="mileage"]', '.miles'];
            let mileageText = '';
            for (const selector of mileageSelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent) {
                mileageText = el.textContent.replace(/[^0-9]/g, '');
                break;
              }
            }
            const miles = parseInt(mileageText) || null;

            // Condition
            const stockTypeSelectors = ['.stock-type', '[data-qa="stock-type"]', '.badge'];
            let condition = 'used';
            for (const selector of stockTypeSelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent) {
                condition = el.textContent.toLowerCase().trim();
                break;
              }
            }

            // Image
            const imageElement = card.querySelector('img');
            const imageUrl = imageElement?.getAttribute('data-src') ||
                            imageElement?.getAttribute('src') ||
                            imageElement?.getAttribute('data-lazy') || '';

            // Dealer info
            const dealerSelectors = ['.dealer-name', '[data-qa="dealer-name"]', '.seller-name'];
            let dealerName = '';
            for (const selector of dealerSelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent?.trim()) {
                dealerName = el.textContent.trim();
                break;
              }
            }

            // Location
            const locationSelectors = ['.miles-from', '[data-qa="miles-from"]', '.dealer-location'];
            let locationText = '';
            for (const selector of locationSelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent?.trim()) {
                locationText = el.textContent.trim();
                break;
              }
            }
            const locationParts = locationText.split(',');
            const dealerCity = locationParts[0]?.trim() || '';
            const dealerState = locationParts[1]?.trim() || '';

            // Detail link
            const linkElement = card.querySelector('a');
            const sourceUrl = linkElement?.getAttribute('href') || '';
            const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `https://www.cars.com${sourceUrl}`;

            results.push({
              vin,
              year,
              make,
              model,
              price,
              miles,
              condition,
              imageUrl,
              dealerName,
              dealerCity,
              dealerState,
              sourceUrl: fullUrl,
            });
          } catch (error) {
            console.error(`Error parsing card ${index}:`, error);
          }
        });

        return results;
      });

      await browser.close();

      console.log(`✓ Scraped ${listings.length} listings from Cars.com (attempt ${attempt})`);

      if (listings.length === 0 && attempt < maxRetries) {
        throw new Error('No listings found, retrying');
      }

      return listings;

    } catch (error: any) {
      lastError = error;
      console.error(`✗ Error scraping Cars.com (attempt ${attempt}/${maxRetries}):`, error.message);

      if (attempt >= maxRetries) {
        console.error(`Failed after ${maxRetries} attempts:`, error);
        throw error;
      }
    }
  }

  throw lastError || new Error('Scraping failed');
}

export async function scrapeListingDetails(
  env: Env,
  url: string
): Promise<Partial<ScrapedListing>> {
  try {
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const details = await page.evaluate(() => {
      const getText = (selector: string) => {
        return document.querySelector(selector)?.textContent?.trim() || null;
      };

      return {
        trim: getText('.fancy-description-trim'),
        exteriorColor: getText('[data-qa="exterior-color"]'),
        interiorColor: getText('[data-qa="interior-color"]'),
        engine: getText('[data-qa="engine"]'),
        transmission: getText('[data-qa="transmission"]'),
        drivetrain: getText('[data-qa="drivetrain"]'),
        fuelType: getText('[data-qa="fuel-type"]'),
      };
    });

    await browser.close();

    return details;

  } catch (error) {
    console.error(`Error scraping listing details:`, error);
    return {};
  }
}

export async function saveListingsToDB(env: Env, listings: ScrapedListing[]): Promise<void> {
  const db = drizzle(env.DB, { schema });
  const now = new Date().toISOString();

  for (const listing of listings) {
    try {
      // Check if listing exists
      const existing = await db.query.listings.findFirst({
        where: eq(schema.listings.vin, listing.vin),
      });

      if (existing) {
        // Update existing listing
        await env.DB.prepare(`
          UPDATE listings
          SET price = ?, miles = ?, last_seen_at = ?, updated_at = ?
          WHERE vin = ?
        `).bind(listing.price || null, listing.miles || null, now, now, listing.vin).run();

        // Record price history if price changed
        if (listing.price && existing.price !== listing.price) {
          const historyId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO listing_price_history (id, listing_id, vin, price, miles, source, recorded_at)
            VALUES (?, ?, ?, ?, ?, 'cars.com', ?)
          `).bind(historyId, existing.id, listing.vin, listing.price, listing.miles || null, now).run();
        }
      } else {
        // Insert new listing
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO listings (
            id, vin, year, make, model, trim, price, miles, condition,
            exterior_color, interior_color, engine, transmission, drivetrain, fuel_type,
            image_url, source, source_url, is_active, first_seen_at, last_seen_at,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cars.com', ?, 1, ?, ?, ?, ?)
        `).bind(
          id,
          listing.vin,
          listing.year,
          listing.make,
          listing.model,
          listing.trim || null,
          listing.price || null,
          listing.miles || null,
          listing.condition,
          listing.exteriorColor || null,
          listing.interiorColor || null,
          listing.engine || null,
          listing.transmission || null,
          listing.drivetrain || null,
          listing.fuelType || null,
          listing.imageUrl || null,
          listing.sourceUrl,
          now,
          now,
          now,
          now
        ).run();

        // Record initial price history
        if (listing.price) {
          const historyId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO listing_price_history (id, listing_id, vin, price, miles, source, recorded_at)
            VALUES (?, ?, ?, ?, ?, 'cars.com', ?)
          `).bind(historyId, id, listing.vin, listing.price, listing.miles || null, now).run();
        }

        // Auto-enrich with VIN data for new listings (background, don't wait)
        enrichListingInBackground(env, listing.vin).catch((error) => {
          console.warn(`VIN enrichment failed for ${listing.vin}:`, error.message);
        });
      }

      console.log(`✓ Saved: ${listing.year} ${listing.make} ${listing.model} (${listing.vin})`);
    } catch (error) {
      console.error(`✗ Error saving listing ${listing.vin}:`, error);
    }
  }
}

/**
 * Enriches a listing with VIN data in the background
 */
async function enrichListingInBackground(env: Env, vin: string): Promise<void> {
  const { enrichListingByVIN } = await import('../workers/batch-decode');

  // Small delay to avoid overwhelming the NHTSA API
  await new Promise(resolve => setTimeout(resolve, 1000));

  const result = await enrichListingByVIN(env, vin, false);

  if (result.success && result.enrichedFields > 0) {
    console.log(`  → Auto-enriched ${result.enrichedFields} field(s) for ${vin}`);
  }
}

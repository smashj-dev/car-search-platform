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
  radius: number = 100
): Promise<ScrapedListing[]> {

  const url = `https://www.cars.com/shopping/results/?` +
    `stock_type=all&makes[]=${encodeURIComponent(make)}&` +
    `models[]=${encodeURIComponent(`${make}-${model}`)}&` +
    `list_price_max=&maximum_distance=${radius}&zip=${zipCode}`;

  console.log(`Scraping Cars.com: ${url}`);

  try {
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to search results
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for listings to load
    await page.waitForSelector('.vehicle-card', { timeout: 10000 });

    // Extract listing data
    const listings = await page.evaluate(() => {
      const results: any[] = [];
      const cards = document.querySelectorAll('.vehicle-card');

      cards.forEach((card) => {
        try {
          // VIN
          const vinElement = card.querySelector('[data-vin]');
          const vin = vinElement?.getAttribute('data-vin') || '';

          if (!vin) return; // Skip if no VIN

          // Title (contains year, make, model)
          const titleElement = card.querySelector('.title');
          const titleText = titleElement?.textContent?.trim() || '';
          const titleParts = titleText.split(' ');
          const year = parseInt(titleParts[0]) || 0;
          const make = titleParts[1] || '';
          const model = titleParts.slice(2).join(' ') || '';

          // Price
          const priceElement = card.querySelector('.primary-price');
          const priceText = priceElement?.textContent?.replace(/[^0-9]/g, '') || '0';
          const price = parseInt(priceText) || null;

          // Mileage
          const mileageElement = card.querySelector('.mileage');
          const mileageText = mileageElement?.textContent?.replace(/[^0-9]/g, '') || '0';
          const miles = parseInt(mileageText) || null;

          // Condition
          const stockTypeElement = card.querySelector('.stock-type');
          const condition = stockTypeElement?.textContent?.toLowerCase().trim() || 'used';

          // Image
          const imageElement = card.querySelector('img');
          const imageUrl = imageElement?.getAttribute('data-src') || imageElement?.getAttribute('src') || '';

          // Dealer info
          const dealerElement = card.querySelector('.dealer-name');
          const dealerName = dealerElement?.textContent?.trim() || '';

          const locationElement = card.querySelector('.miles-from');
          const locationText = locationElement?.textContent?.trim() || '';
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
          console.error('Error parsing card:', error);
        }
      });

      return results;
    });

    await browser.close();

    console.log(`Scraped ${listings.length} listings from Cars.com`);
    return listings;

  } catch (error) {
    console.error(`Error scraping Cars.com:`, error);
    return [];
  }
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
      }

      console.log(`✓ Saved: ${listing.year} ${listing.make} ${listing.model} (${listing.vin})`);
    } catch (error) {
      console.error(`✗ Error saving listing ${listing.vin}:`, error);
    }
  }
}

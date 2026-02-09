import type { Listing } from '../db/schema';

export interface Citation {
  id: string;
  text: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  miles?: number;
  url: string;
  metadata?: {
    condition?: string;
    fuelType?: string;
    drivetrain?: string;
    exteriorColor?: string;
  };
}

/**
 * Citation service for formatting and managing vehicle references
 */
export class CitationService {
  /**
   * Create citations from listings
   */
  static createCitations(listings: Listing[]): Citation[] {
    return listings.map((listing, index) => ({
      id: `${index + 1}`,
      text: this.formatCitationText(listing),
      vin: listing.vin,
      year: listing.year,
      make: listing.make,
      model: listing.model,
      trim: listing.trim || undefined,
      price: listing.price || 0,
      miles: listing.miles || undefined,
      url: `/listings/${listing.vin}`,
      metadata: {
        condition: listing.condition || undefined,
        fuelType: listing.fuelType || undefined,
        drivetrain: listing.drivetrain || undefined,
        exteriorColor: listing.exteriorColor || undefined,
      },
    }));
  }

  /**
   * Format citation text for display
   */
  static formatCitationText(listing: Listing): string {
    const parts = [
      `${listing.year}`,
      listing.make,
      listing.model,
    ];

    if (listing.trim) {
      parts.push(listing.trim);
    }

    const priceStr = listing.price ? `$${listing.price.toLocaleString()}` : 'Price N/A';
    const milesStr = listing.miles ? `${listing.miles.toLocaleString()} mi` : 'Mileage N/A';

    return `${parts.join(' ')} (${priceStr}, ${milesStr})`;
  }

  /**
   * Format citation for AI context
   */
  static formatForAI(listing: Listing, index: number): string {
    const lines = [
      `[${index + 1}] ${listing.year} ${listing.make} ${listing.model} ${listing.trim || ''}`.trim(),
      `Price: $${listing.price?.toLocaleString() || 'N/A'}`,
      `Mileage: ${listing.miles?.toLocaleString() || 'N/A'} miles`,
    ];

    if (listing.condition) {
      lines.push(`Condition: ${listing.condition}`);
    }

    if (listing.fuelType) {
      lines.push(`Fuel: ${listing.fuelType}`);
    }

    if (listing.drivetrain) {
      lines.push(`Drivetrain: ${listing.drivetrain}`);
    }

    if (listing.exteriorColor) {
      lines.push(`Color: ${listing.exteriorColor}`);
    }

    if (listing.engine) {
      lines.push(`Engine: ${listing.engine}`);
    }

    if (listing.transmission) {
      lines.push(`Transmission: ${listing.transmission}`);
    }

    lines.push(`VIN: ${listing.vin}`);

    return lines.join(' | ');
  }

  /**
   * Extract citation references from text
   */
  static extractReferences(text: string): number[] {
    const pattern = /\[(\d+)\]/g;
    const matches = text.matchAll(pattern);
    const indices = new Set<number>();

    for (const match of matches) {
      const index = parseInt(match[1]);
      if (index > 0) {
        indices.add(index);
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  }

  /**
   * Replace citation markers with formatted links
   */
  static formatCitationLinks(text: string, citations: Citation[]): string {
    let formatted = text;

    for (const citation of citations) {
      const marker = `[${citation.id}]`;
      const link = `[${citation.id}](${citation.url})`;
      formatted = formatted.replace(new RegExp(`\\${marker}`, 'g'), link);
    }

    return formatted;
  }

  /**
   * Get citation by ID
   */
  static getCitationById(citations: Citation[], id: string): Citation | undefined {
    return citations.find(c => c.id === id);
  }

  /**
   * Get citations by VIN
   */
  static getCitationsByVin(citations: Citation[], vin: string): Citation[] {
    return citations.filter(c => c.vin === vin);
  }

  /**
   * Format citations for display in chat
   */
  static formatForChat(citations: Citation[]): string {
    if (citations.length === 0) {
      return '';
    }

    const lines = citations.map(citation => {
      return `[${citation.id}] ${citation.text} - VIN: ${citation.vin}`;
    });

    return `\n\nReferences:\n${lines.join('\n')}`;
  }

  /**
   * Create a summary of citations
   */
  static createSummary(citations: Citation[]): {
    totalListings: number;
    priceRange: { min: number; max: number };
    averagePrice: number;
    averageMiles: number;
    makes: string[];
    models: string[];
  } {
    if (citations.length === 0) {
      return {
        totalListings: 0,
        priceRange: { min: 0, max: 0 },
        averagePrice: 0,
        averageMiles: 0,
        makes: [],
        models: [],
      };
    }

    const prices = citations.map(c => c.price).filter(p => p > 0);
    const miles = citations.map(c => c.miles).filter(m => m !== undefined) as number[];
    const makes = [...new Set(citations.map(c => c.make))];
    const models = [...new Set(citations.map(c => c.model))];

    return {
      totalListings: citations.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      averageMiles: miles.length > 0 ? miles.reduce((a, b) => a + b, 0) / miles.length : 0,
      makes,
      models,
    };
  }

  /**
   * Validate citation
   */
  static validateCitation(citation: Citation): boolean {
    return !!(
      citation.id &&
      citation.vin &&
      citation.year >= 1900 &&
      citation.year <= 2030 &&
      citation.make &&
      citation.model &&
      citation.url
    );
  }

  /**
   * Deduplicate citations by VIN
   */
  static deduplicate(citations: Citation[]): Citation[] {
    const seen = new Set<string>();
    const unique: Citation[] = [];

    for (const citation of citations) {
      if (!seen.has(citation.vin)) {
        seen.add(citation.vin);
        unique.push(citation);
      }
    }

    return unique;
  }
}

/**
 * Parse a natural language car query into structured data
 * Examples:
 *   "2021 Genesis GV80" -> { year: 2021, make: "Genesis", model: "GV80" }
 *   "Genesis GV80 2021" -> { year: 2021, make: "Genesis", model: "GV80" }
 *   "BMW M3" -> { make: "BMW", model: "M3" }
 */
export function parseCarQuery(query: string): {
  year?: number;
  make?: string;
  model?: string;
  raw: string;
} {
  const normalized = query.trim();

  // Common car makes for matching
  const knownMakes = [
    'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Bugatti',
    'Buick', 'Cadillac', 'Chevrolet', 'Chevy', 'Chrysler', 'Dodge', 'Ferrari',
    'Fiat', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar',
    'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Lotus',
    'Maserati', 'Mazda', 'McLaren', 'Mercedes', 'Mercedes-Benz', 'Mini', 'Mitsubishi',
    'Nissan', 'Pagani', 'Polestar', 'Porsche', 'Ram', 'Rivian', 'Rolls-Royce',
    'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'VW', 'Volvo'
  ];

  // Normalize some makes
  const makeNormalization: Record<string, string> = {
    'chevy': 'Chevrolet',
    'vw': 'Volkswagen',
    'mercedes': 'Mercedes-Benz',
    'merc': 'Mercedes-Benz',
  };

  // Extract year (4 digit number between 1990-2030)
  const yearMatch = normalized.match(/\b(19[9]\d|20[0-3]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

  // Remove year from query for easier parsing
  const withoutYear = normalized.replace(/\b(19[9]\d|20[0-3]\d)\b/, '').trim();

  // Try to find make
  let make: string | undefined;
  let model: string | undefined;

  const words = withoutYear.split(/\s+/);

  for (const knownMake of knownMakes) {
    const lowerMake = knownMake.toLowerCase();
    const queryLower = withoutYear.toLowerCase();

    if (queryLower.includes(lowerMake)) {
      make = knownMake;
      // Everything after the make is the model
      const makeIndex = queryLower.indexOf(lowerMake);
      const afterMake = withoutYear.slice(makeIndex + knownMake.length).trim();
      if (afterMake) {
        model = afterMake;
      }
      break;
    }
  }

  // Check for normalized makes
  if (!make) {
    for (const [alias, canonical] of Object.entries(makeNormalization)) {
      if (withoutYear.toLowerCase().includes(alias)) {
        make = canonical;
        const aliasIndex = withoutYear.toLowerCase().indexOf(alias);
        const afterMake = withoutYear.slice(aliasIndex + alias.length).trim();
        if (afterMake) {
          model = afterMake;
        }
        break;
      }
    }
  }

  // If no make found, assume first word is make, rest is model
  if (!make && words.length >= 2) {
    make = words[0];
    model = words.slice(1).join(' ');
  } else if (!make && words.length === 1) {
    // Single word - could be just a make or a model
    make = words[0];
  }

  // Capitalize properly
  if (make) {
    make = make.charAt(0).toUpperCase() + make.slice(1);
  }
  if (model) {
    model = model.toUpperCase(); // Models are often uppercase (GV80, M3, etc.)
  }

  return {
    year,
    make,
    model,
    raw: normalized,
  };
}

/**
 * Generate a normalized cache key from car identifiers
 * Example: "genesis_gv80_2021"
 */
export function generateNormalizedKey(
  make: string,
  model: string,
  year?: number
): string {
  const parts = [
    make.toLowerCase().replace(/[^a-z0-9]/g, ''),
    model.toLowerCase().replace(/[^a-z0-9]/g, ''),
  ];

  if (year) {
    parts.push(year.toString());
  }

  return parts.join('_');
}

/**
 * Generate a UUID (for environments without crypto.randomUUID)
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/**
 * Simple sentiment analysis based on keywords
 * (Will be replaced by AI analysis in production)
 */
export function quickSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
  const lower = text.toLowerCase();

  const positiveWords = [
    'love', 'great', 'excellent', 'amazing', 'perfect', 'best', 'fantastic',
    'wonderful', 'reliable', 'smooth', 'beautiful', 'impressed', 'recommend'
  ];

  const negativeWords = [
    'hate', 'terrible', 'awful', 'worst', 'problem', 'issue', 'broken',
    'failure', 'unreliable', 'expensive', 'disappointed', 'regret', 'avoid'
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) positiveCount++;
  }

  for (const word of negativeWords) {
    if (lower.includes(word)) negativeCount++;
  }

  if (positiveCount > 0 && negativeCount > 0) return 'mixed';
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

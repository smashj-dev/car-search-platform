-- Kemi Car Research Database Schema
-- Initial migration for D1

-- Core car profiles
CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  generation TEXT,
  normalized_key TEXT NOT NULL UNIQUE, -- "genesis_gv80_2021" for fast lookups
  enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'processing', 'complete', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_cars_normalized_key ON cars(normalized_key);
CREATE INDEX idx_cars_make_model ON cars(make, model);
CREATE INDEX idx_cars_year ON cars(year);

-- The "soul" data - enthusiast insights
CREATE TABLE IF NOT EXISTS car_insights (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'driving_feel', 'common_issues', 'ownership_costs', 'buy_avoid_years',
    'mod_support', 'real_world_mpg', 'character', 'comparison',
    'long_term_ownership', 'dealer_experience'
  )),
  insight TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_insights_car_id ON car_insights(car_id);
CREATE INDEX idx_insights_category ON car_insights(category);
CREATE INDEX idx_insights_sentiment ON car_insights(sentiment);

-- Forum thread cache
CREATE TABLE IF NOT EXISTS forum_threads (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  forum_source TEXT NOT NULL, -- "GenesisForum.com", "Reddit"
  thread_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  reply_count INTEGER DEFAULT 0,
  view_count INTEGER,
  last_activity TEXT,
  scraped_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_threads_car_id ON forum_threads(car_id);
CREATE INDEX idx_threads_forum_source ON forum_threads(forum_source);
CREATE INDEX idx_threads_last_activity ON forum_threads(last_activity);

-- User search requests (for background enrichment + notifications)
CREATE TABLE IF NOT EXISTS search_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  car_query TEXT NOT NULL, -- Original query: "2021 Genesis GV80"
  parsed_make TEXT,
  parsed_model TEXT,
  parsed_year INTEGER,
  car_id TEXT REFERENCES cars(id), -- Links to car after parsing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  notified_at TEXT
);

CREATE INDEX idx_search_requests_status ON search_requests(status);
CREATE INDEX idx_search_requests_user_email ON search_requests(user_email);
CREATE INDEX idx_search_requests_car_id ON search_requests(car_id);

-- Scrape job tracking
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- "forum", "reddit", "youtube"
  source_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX idx_scrape_jobs_car_id ON scrape_jobs(car_id);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);

-- Forum sources configuration
CREATE TABLE IF NOT EXISTS forum_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  search_url_template TEXT, -- "{base_url}/search?q={query}"
  car_makes TEXT, -- JSON array of makes this forum covers
  scrape_priority INTEGER DEFAULT 5 CHECK (scrape_priority >= 1 AND scrape_priority <= 10),
  is_active INTEGER DEFAULT 1,
  last_scraped_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed Genesis-specific forum sources
INSERT OR IGNORE INTO forum_sources (id, name, base_url, search_url_template, car_makes, scrape_priority) VALUES
  ('genesis-forum', 'GenesisForum.com', 'https://www.genesisforum.com', 'https://www.genesisforum.com/search/?q={query}', '["Genesis"]', 10),
  ('genesis-owners', 'GenesisOwners.com', 'https://www.genesisowners.com', 'https://www.genesisowners.com/search/?q={query}', '["Genesis"]', 9),
  ('reddit-genesis', 'Reddit r/GenesisMotors', 'https://www.reddit.com/r/GenesisMotors', 'https://www.reddit.com/r/GenesisMotors/search/?q={query}', '["Genesis"]', 8);

-- Seed the 2021 GV80 as our test car
INSERT OR IGNORE INTO cars (id, make, model, year, generation, normalized_key, enrichment_status) VALUES
  ('gv80-2021-001', 'Genesis', 'GV80', 2021, 'JK1', 'genesis_gv80_2021', 'pending');

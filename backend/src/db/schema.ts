import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Vehicle listings (scraped from Cars.com, Autotrader, etc.)
export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(),
  vin: text('vin').notNull().unique(),

  // Vehicle identification
  year: integer('year').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  trim: text('trim'),
  version: text('version'),
  bodyType: text('body_type'),

  // Specs
  engine: text('engine'),
  transmission: text('transmission'),
  drivetrain: text('drivetrain'),
  fuelType: text('fuel_type'),
  cylinders: integer('cylinders'),
  doors: integer('doors'),
  seatingCapacity: integer('seating_capacity'),

  // Colors
  exteriorColor: text('exterior_color'),
  interiorColor: text('interior_color'),

  // Pricing
  price: integer('price'),
  baseMsrp: integer('base_msrp'),
  combinedMsrp: integer('combined_msrp'),
  priceMsrpDiscount: real('price_msrp_discount'),

  // Condition
  miles: integer('miles'),
  condition: text('condition'), // new, used, certified
  isCertified: integer('is_certified').default(0),

  // Status
  isActive: integer('is_active').default(1),
  isSold: integer('is_sold').default(0),
  soldDate: text('sold_date'),
  inTransit: integer('in_transit').default(0),

  // Timing
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),

  // Source
  source: text('source').notNull(), // cars.com, autotrader, etc.
  sourceUrl: text('source_url').notNull(),
  imageUrl: text('image_url'),

  // Relations
  dealerId: text('dealer_id'),

  // Metadata
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// Dealers
export const dealers = sqliteTable('dealers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  website: text('website'),

  // Location
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  latitude: real('latitude'),
  longitude: real('longitude'),

  // Type
  dealerType: text('dealer_type'), // franchise, independent

  // Metadata
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// Price history for tracking
export const listingPriceHistory = sqliteTable('listing_price_history', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull(),
  vin: text('vin').notNull(),

  price: integer('price'),
  miles: integer('miles'),
  source: text('source'),

  recordedAt: text('recorded_at').notNull(),
});

// User accounts (for saved searches, favorites)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified').default(0),

  // Profile
  name: text('name'),
  avatarUrl: text('avatar_url'),
  zipCode: text('zip_code'),

  // Preferences (JSON stored as text)
  preferences: text('preferences'),

  // Metadata
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  lastLoginAt: text('last_login_at'),
});

// User favorites
export const userFavorites = sqliteTable('user_favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  vin: text('vin').notNull(),
  notes: text('notes'),
  createdAt: text('created_at'),
});

// Saved searches with alerts
export const savedSearches = sqliteTable('saved_searches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),

  name: text('name').notNull(),
  filters: text('filters').notNull(), // JSON

  notificationsEnabled: integer('notifications_enabled').default(0),
  lastNotifiedAt: text('last_notified_at'),

  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// Type exports
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Dealer = typeof dealers.$inferSelect;
export type NewDealer = typeof dealers.$inferInsert;
export type PriceHistory = typeof listingPriceHistory.$inferSelect;
export type NewPriceHistory = typeof listingPriceHistory.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type SavedSearch = typeof savedSearches.$inferSelect;

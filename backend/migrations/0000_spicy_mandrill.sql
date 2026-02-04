CREATE TABLE `dealers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`address` text,
	`city` text,
	`state` text,
	`zip_code` text,
	`latitude` real,
	`longitude` real,
	`dealer_type` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `listing_price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`vin` text NOT NULL,
	`price` integer,
	`miles` integer,
	`source` text,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`vin` text NOT NULL,
	`year` integer NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`trim` text,
	`version` text,
	`body_type` text,
	`engine` text,
	`transmission` text,
	`drivetrain` text,
	`fuel_type` text,
	`cylinders` integer,
	`doors` integer,
	`seating_capacity` integer,
	`exterior_color` text,
	`interior_color` text,
	`price` integer,
	`base_msrp` integer,
	`combined_msrp` integer,
	`price_msrp_discount` real,
	`miles` integer,
	`condition` text,
	`is_certified` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`is_sold` integer DEFAULT 0,
	`sold_date` text,
	`in_transit` integer DEFAULT 0,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`source` text NOT NULL,
	`source_url` text NOT NULL,
	`image_url` text,
	`dealer_id` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_vin_unique` ON `listings` (`vin`);--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`notifications_enabled` integer DEFAULT 0,
	`last_notified_at` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`vin` text NOT NULL,
	`notes` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT 0,
	`name` text,
	`avatar_url` text,
	`zip_code` text,
	`preferences` text,
	`created_at` text,
	`updated_at` text,
	`last_login_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
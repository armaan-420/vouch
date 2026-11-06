CREATE TABLE `catalog_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_daily_usage` (
	`date` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);

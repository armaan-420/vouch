CREATE TABLE `app_records` (
	`key` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);

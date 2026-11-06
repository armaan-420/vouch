import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const appRecords = sqliteTable('app_records', {
  key: text('key').primaryKey(),
  json: text('json').notNull(),
  version: integer('version').notNull().default(0),
});

// Expiring provider snapshots, separate from durable Vouch product identity.
export const catalogCache = sqliteTable('catalog_cache', {
  key: text('key').primaryKey(),
  json: text('json').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const catalogDailyUsage = sqliteTable('catalog_daily_usage', {
  date: text('date').primaryKey(),
  count: integer('count').notNull().default(0),
});

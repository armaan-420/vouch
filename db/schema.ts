import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const appRecords = sqliteTable('app_records', {
  key: text('key').primaryKey(),
  json: text('json').notNull(),
  version: integer('version').notNull().default(0),
});

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const houses = sqliteTable('houses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  actor: text('actor').notNull().unique(),
  cityId: integer('city_id').notNull(),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('houses_city_idx').on(table.cityId)]);
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  actor: text('actor').notNull(),
  username: text('username').notNull(),
  comment: text('comment').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
});

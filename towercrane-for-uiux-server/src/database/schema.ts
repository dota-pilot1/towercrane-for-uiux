import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  group: text('group_name').notNull(),
  iconKey: text('icon_key').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  checklist: text('checklist', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: text('created_at').notNull(),
});

export const prototypesTable = sqliteTable('prototypes', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  repoUrl: text('repo_url').notNull(),
  summary: text('summary').notNull(),
  status: text('status').notNull(),
  visibility: text('visibility').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const schema = {
  categoriesTable,
  prototypesTable,
};

export type CategoryRow = typeof categoriesTable.$inferSelect;
export type PrototypeRow = typeof prototypesTable.$inferSelect;
export type PrototypeInsert = typeof prototypesTable.$inferInsert;

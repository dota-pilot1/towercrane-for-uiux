import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').$type<'admin' | 'user'>().notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sessionsTable = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});

export const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  group: text('group_name').notNull(),
  iconKey: text('icon_key').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  checklist: text('checklist', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const prototypesTable = sqliteTable('prototypes', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  repoUrl: text('repo_url').notNull(),
  demoUrl: text('demo_url'),
  figmaUrl: text('figma_url'),
  summary: text('summary').notNull(),
  status: text('status').notNull(),
  visibility: text('visibility').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const docSectionsTable = sqliteTable('doc_sections', {
  id: text('id').primaryKey(),
  prototypeId: text('prototype_id')
    .notNull()
    .references(() => prototypesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const documentsTable = sqliteTable('documents', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => docSectionsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type DocumentBlockType =
  | 'NOTE'
  | 'MMD'
  | 'FIGMA'
  | 'FILE'
  | 'DBTABLE'
  | 'GITHUB';

export const documentBlocksTable = sqliteTable('document_blocks', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documentsTable.id, { onDelete: 'cascade' }),
  blockType: text('block_type').$type<DocumentBlockType>().notNull(),
  blockTitle: text('block_title'),
  content: text('content').notNull(),
  orderIdx: integer('order_idx').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const schema = {
  usersTable,
  sessionsTable,
  categoriesTable,
  prototypesTable,
  docSectionsTable,
  documentsTable,
  documentBlocksTable,
};

export type UserRow = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;
export type SessionRow = typeof sessionsTable.$inferSelect;
export type SessionInsert = typeof sessionsTable.$inferInsert;
export type CategoryRow = typeof categoriesTable.$inferSelect;
export type CategoryInsert = typeof categoriesTable.$inferInsert;
export type PrototypeRow = typeof prototypesTable.$inferSelect;
export type PrototypeInsert = typeof prototypesTable.$inferInsert;
export type DocSectionRow = typeof docSectionsTable.$inferSelect;
export type DocSectionInsert = typeof docSectionsTable.$inferInsert;
export type DocumentRow = typeof documentsTable.$inferSelect;
export type DocumentInsert = typeof documentsTable.$inferInsert;
export type DocumentBlockRow = typeof documentBlocksTable.$inferSelect;
export type DocumentBlockInsert = typeof documentBlocksTable.$inferInsert;

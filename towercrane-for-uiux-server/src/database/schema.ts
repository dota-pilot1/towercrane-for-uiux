import {
  sqliteTable,
  text,
  integer,
  AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  profileImageUrl: text('profile_image_url'),
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

export const emailVerificationsTable = sqliteTable('email_verifications', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  purpose: text('purpose').$type<'signup' | 'password_reset'>().notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  failCount: integer('fail_count').notNull().default(0),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  verifiedTokenHash: text('verified_token_hash').unique(),
  verifiedTokenExpiresAt: text('verified_token_expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
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
  orderIdx: integer('order_idx').notNull().default(0),
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
  checklist: text('checklist', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
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

export const prototypeReviewsTable = sqliteTable('prototype_reviews', {
  id: text('id').primaryKey(),
  prototypeId: text('prototype_id')
    .notNull()
    .references(() => prototypesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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

export const prototypeImagesTable = sqliteTable('prototype_images', {
  id: text('id').primaryKey(),
  prototypeId: text('prototype_id')
    .notNull()
    .references(() => prototypesTable.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  orderIdx: integer('order_idx').notNull(),
  createdAt: text('created_at').notNull(),
});

export const menusTable = sqliteTable('menus', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').references((): AnySQLiteColumn => menusTable.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  sectionId: text('section_id'),
  icon: text('icon'),
  displayOrder: integer('display_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  requiredRole: text('required_role'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type MeetingRoomType =
  | 'ANNOUNCE'
  | 'PROTOTYPE'
  | 'FEEDBACK'
  | 'ISSUE'
  | 'DECISION'
  | 'RESOURCE'
  | 'INTERNAL'
  | 'FREE'
  | 'QNA'
  | 'DM';
export type MeetingMessageType =
  | 'TEXT'
  | 'SYSTEM'
  | 'COMMAND_RESULT'
  | 'BOT_REPLY';

export const meetingRoomsTable = sqliteTable('meeting_rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  roomType: text('room_type').$type<MeetingRoomType>().notNull(),
  description: text('description'),
  orderIdx: integer('order_idx').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const meetingMessagesTable = sqliteTable('meeting_messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => meetingRoomsTable.id, { onDelete: 'cascade' }),
  senderId: text('sender_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role'),
  content: text('content').notNull(),
  messageType: text('message_type')
    .$type<MeetingMessageType>()
    .notNull()
    .default('TEXT'),
  payload: text('payload', { mode: 'json' }).$type<Record<
    string,
    unknown
  > | null>(),
  createdAt: text('created_at').notNull(),
});

export const meetingDmPairsTable = sqliteTable('meeting_dm_pairs', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => meetingRoomsTable.id, { onDelete: 'cascade' }),
  userAId: text('user_a_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  userBId: text('user_b_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const schema = {
  usersTable,
  sessionsTable,
  emailVerificationsTable,
  categoriesTable,
  prototypesTable,
  prototypeReviewsTable,
  prototypeImagesTable,
  docSectionsTable,
  documentsTable,
  documentBlocksTable,
  menusTable,
  meetingRoomsTable,
  meetingMessagesTable,
  meetingDmPairsTable,
};

export type UserRow = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;
export type SessionRow = typeof sessionsTable.$inferSelect;
export type SessionInsert = typeof sessionsTable.$inferInsert;
export type EmailVerificationRow = typeof emailVerificationsTable.$inferSelect;
export type EmailVerificationInsert =
  typeof emailVerificationsTable.$inferInsert;
export type CategoryRow = typeof categoriesTable.$inferSelect;
export type CategoryInsert = typeof categoriesTable.$inferInsert;
export type PrototypeRow = typeof prototypesTable.$inferSelect;
export type PrototypeInsert = typeof prototypesTable.$inferInsert;
export type PrototypeImageRow = typeof prototypeImagesTable.$inferSelect;
export type PrototypeImageInsert = typeof prototypeImagesTable.$inferInsert;
export type DocSectionRow = typeof docSectionsTable.$inferSelect;
export type DocSectionInsert = typeof docSectionsTable.$inferInsert;
export type DocumentRow = typeof documentsTable.$inferSelect;
export type DocumentInsert = typeof documentsTable.$inferInsert;
export type DocumentBlockRow = typeof documentBlocksTable.$inferSelect;
export type DocumentBlockInsert = typeof documentBlocksTable.$inferInsert;
export type PrototypeReviewRow = typeof prototypeReviewsTable.$inferSelect;
export type PrototypeReviewInsert = typeof prototypeReviewsTable.$inferInsert;
export type MenuRow = typeof menusTable.$inferSelect;
export type MenuInsert = typeof menusTable.$inferInsert;
export type MeetingRoomRow = typeof meetingRoomsTable.$inferSelect;
export type MeetingRoomInsert = typeof meetingRoomsTable.$inferInsert;
export type MeetingMessageRow = typeof meetingMessagesTable.$inferSelect;
export type MeetingMessageInsert = typeof meetingMessagesTable.$inferInsert;
export type MeetingDmPairRow = typeof meetingDmPairsTable.$inferSelect;
export type MeetingDmPairInsert = typeof meetingDmPairsTable.$inferInsert;

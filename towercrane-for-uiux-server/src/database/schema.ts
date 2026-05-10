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

export type ApiDocHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiDocBlockType = 'API';

export const apiDocCategoriesTable = sqliteTable('api_doc_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  emoji: text('emoji'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const apiDocEndpointsTable = sqliteTable('api_doc_endpoints', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => apiDocCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  method: text('method').$type<ApiDocHttpMethod>().notNull().default('GET'),
  path: text('path').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const apiDocBlocksTable = sqliteTable('api_doc_blocks', {
  id: text('id').primaryKey(),
  endpointId: text('endpoint_id')
    .notNull()
    .references(() => apiDocEndpointsTable.id, { onDelete: 'cascade' }),
  blockType: text('block_type').$type<ApiDocBlockType>().notNull().default('API'),
  content: text('content').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type TaskType =
  | 'FEATURE'
  | 'BUG'
  | 'DOCS'
  | 'DESIGN'
  | 'REFACTOR'
  | 'QA'
  | 'CHORE';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'HOLD';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskActivityType =
  | 'CREATED'
  | 'STATUS'
  | 'ASSIGNEE'
  | 'PRIORITY'
  | 'UPDATED'
  | 'ARCHIVED'
  | 'RESTORED';

export const tasksTable = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  taskType: text('task_type').$type<TaskType>().notNull().default('FEATURE'),
  status: text('status').$type<TaskStatus>().notNull().default('TODO'),
  priority: text('priority').$type<TaskPriority>().notNull().default('MEDIUM'),
  reporterId: text('reporter_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  assigneeId: text('assignee_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  dueDate: text('due_date'),
  orderIdx: integer('order_idx').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const taskChecklistsTable = sqliteTable('task_checklists', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const taskCommentsTable = sqliteTable('task_comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const taskAttachmentsTable = sqliteTable('task_attachments', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  contentType: text('content_type').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const taskActivityLogsTable = sqliteTable('task_activity_logs', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  activityType: text('activity_type').$type<TaskActivityType>().notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  message: text('message'),
  createdAt: text('created_at').notNull(),
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

export type IssueType = 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'QUESTION' | 'OTHER';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'TESTING' | 'CLOSED';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const issuesTable = sqliteTable('issues', {
  id: text('id').primaryKey(),
  prototypeId: text('prototype_id')
    .notNull()
    .references(() => prototypesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  issueType: text('issue_type').$type<IssueType>().notNull().default('BUG'),
  status: text('status').$type<IssueStatus>().notNull().default('OPEN'),
  priority: text('priority').$type<IssuePriority>().notNull().default('MEDIUM'),
  reporterId: text('reporter_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  assigneeId: text('assignee_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  dueDate: text('due_date'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const issueCommentsTable = sqliteTable('issue_comments', {
  id: text('id').primaryKey(),
  issueId: text('issue_id')
    .notNull()
    .references(() => issuesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ─── Challenge Module Tables ────────────────────────────────────────────

export type ChallengeBlockType = 'NOTE' | 'MMD' | 'CHECKLIST' | 'GITHUB' | 'FIGMA' | 'FILE' | 'DBTABLE';

export const challengeCategoriesTable = sqliteTable('challenge_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  summary: text('summary'),
  icon: text('icon').notNull().default('Trophy'),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const challengeSectionsTable = sqliteTable('challenge_sections', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => challengeCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const challengeTopicsTable = sqliteTable('challenge_topics', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  blockType: text('block_type').$type<ChallengeBlockType>().notNull(),
  blockTitle: text('block_title'),
  content: text('content').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const challengeSubmissionsTable = sqliteTable('challenge_submissions', {
  id: text('id').primaryKey(),
  topicId: text('topic_id')
    .notNull()
    .references(() => challengeTopicsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  score: integer('score').notNull().default(0),
  maxScore: integer('max_score').notNull().default(0),
  checkedItems: text('checked_items', { mode: 'json' }).$type<string[]>().notNull().default([]),
  adminRating: integer('admin_rating'),
  adminFeedback: text('admin_feedback'),
  ratedBy: text('rated_by').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const challengeGptThreadsTable = sqliteTable('challenge_gpt_threads', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  model: text('model').notNull().default('gpt-4o-mini'),
  isShared: integer('is_shared', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type GptMessageRole = 'user' | 'assistant' | 'system';

export const challengeGptMessagesTable = sqliteTable('challenge_gpt_messages', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .references(() => challengeGptThreadsTable.id, { onDelete: 'cascade' }),
  role: text('role').$type<GptMessageRole>().notNull(),
  content: text('content').notNull(),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  createdAt: text('created_at').notNull(),
});

export type NoteVisibility = 'private' | 'shared' | 'public';

export const challengeUserNotesTable = sqliteTable('challenge_user_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  sectionId: text('section_id').references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  topicId: text('topic_id').references(() => challengeTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title'),
  content: text('content').notNull(),
  visibility: text('visibility').$type<NoteVisibility>().notNull().default('private'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
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
  apiDocCategoriesTable,
  apiDocEndpointsTable,
  apiDocBlocksTable,
  tasksTable,
  taskChecklistsTable,
  taskCommentsTable,
  taskAttachmentsTable,
  taskActivityLogsTable,
  meetingRoomsTable,
  meetingMessagesTable,
  meetingDmPairsTable,
  issuesTable,
  issueCommentsTable,
  challengeCategoriesTable,
  challengeSectionsTable,
  challengeTopicsTable,
  challengeSubmissionsTable,
  challengeGptThreadsTable,
  challengeGptMessagesTable,
  challengeUserNotesTable,
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
export type ApiDocCategoryRow = typeof apiDocCategoriesTable.$inferSelect;
export type ApiDocCategoryInsert = typeof apiDocCategoriesTable.$inferInsert;
export type ApiDocEndpointRow = typeof apiDocEndpointsTable.$inferSelect;
export type ApiDocEndpointInsert = typeof apiDocEndpointsTable.$inferInsert;
export type ApiDocBlockRow = typeof apiDocBlocksTable.$inferSelect;
export type ApiDocBlockInsert = typeof apiDocBlocksTable.$inferInsert;
export type TaskRow = typeof tasksTable.$inferSelect;
export type TaskInsert = typeof tasksTable.$inferInsert;
export type TaskChecklistRow = typeof taskChecklistsTable.$inferSelect;
export type TaskChecklistInsert = typeof taskChecklistsTable.$inferInsert;
export type TaskCommentRow = typeof taskCommentsTable.$inferSelect;
export type TaskCommentInsert = typeof taskCommentsTable.$inferInsert;
export type TaskAttachmentRow = typeof taskAttachmentsTable.$inferSelect;
export type TaskAttachmentInsert = typeof taskAttachmentsTable.$inferInsert;
export type TaskActivityLogRow = typeof taskActivityLogsTable.$inferSelect;
export type TaskActivityLogInsert = typeof taskActivityLogsTable.$inferInsert;
export type MeetingRoomRow = typeof meetingRoomsTable.$inferSelect;
export type MeetingRoomInsert = typeof meetingRoomsTable.$inferInsert;
export type MeetingMessageRow = typeof meetingMessagesTable.$inferSelect;
export type MeetingMessageInsert = typeof meetingMessagesTable.$inferInsert;
export type MeetingDmPairRow = typeof meetingDmPairsTable.$inferSelect;
export type MeetingDmPairInsert = typeof meetingDmPairsTable.$inferInsert;
export type IssueRow = typeof issuesTable.$inferSelect;
export type IssueInsert = typeof issuesTable.$inferInsert;
export type IssueCommentRow = typeof issueCommentsTable.$inferSelect;
export type IssueCommentInsert = typeof issueCommentsTable.$inferInsert;
export type ChallengeCategoryRow = typeof challengeCategoriesTable.$inferSelect;
export type ChallengeCategoryInsert = typeof challengeCategoriesTable.$inferInsert;
export type ChallengeSectionRow = typeof challengeSectionsTable.$inferSelect;
export type ChallengeSectionInsert = typeof challengeSectionsTable.$inferInsert;
export type ChallengeTopicRow = typeof challengeTopicsTable.$inferSelect;
export type ChallengeTopicInsert = typeof challengeTopicsTable.$inferInsert;
export type ChallengeSubmissionRow = typeof challengeSubmissionsTable.$inferSelect;
export type ChallengeSubmissionInsert = typeof challengeSubmissionsTable.$inferInsert;
export type ChallengeGptThreadRow = typeof challengeGptThreadsTable.$inferSelect;
export type ChallengeGptThreadInsert = typeof challengeGptThreadsTable.$inferInsert;
export type ChallengeGptMessageRow = typeof challengeGptMessagesTable.$inferSelect;
export type ChallengeGptMessageInsert = typeof challengeGptMessagesTable.$inferInsert;
export type ChallengeUserNoteRow = typeof challengeUserNotesTable.$inferSelect;
export type ChallengeUserNoteInsert = typeof challengeUserNotesTable.$inferInsert;

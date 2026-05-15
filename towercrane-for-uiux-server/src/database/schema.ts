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

export const studyDiariesTable = sqliteTable('study_diaries', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  visibility: text('visibility')
    .$type<'private' | 'shared' | 'public'>()
    .notNull()
    .default('private'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
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

export type BoardKind =
  | 'NOTICE'
  | 'INQUIRY'
  | 'QNA'
  | 'FREE'
  | 'FAQ'
  | 'EVENT'
  | 'GENERAL';
export type BoardStatus = 'PUBLISHED' | 'HIDDEN' | 'DRAFT';

export const boardConfigsTable = sqliteTable('board_configs', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  kind: text('kind').$type<BoardKind>().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  allowUserWrite: integer('allow_user_write', { mode: 'boolean' })
    .notNull()
    .default(false),
  allowComment: integer('allow_comment', { mode: 'boolean' })
    .notNull()
    .default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const boardsTable = sqliteTable('boards', {
  id: text('id').primaryKey(),
  boardConfigId: text('board_config_id')
    .notNull()
    .references(() => boardConfigsTable.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  authorName: text('author_name').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  status: text('status').$type<BoardStatus>().notNull().default('PUBLISHED'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  pinnedOrder: integer('pinned_order'),
  answered: integer('answered', { mode: 'boolean' }).notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const boardCommentsTable = sqliteTable('board_comments', {
  id: text('id').primaryKey(),
  boardId: text('board_id')
    .notNull()
    .references(() => boardsTable.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  authorName: text('author_name').notNull(),
  content: text('content').notNull(),
  adminReply: integer('admin_reply', { mode: 'boolean' })
    .notNull()
    .default(false),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
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
  blockType: text('block_type')
    .$type<ApiDocBlockType>()
    .notNull()
    .default('API'),
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
export type TaskScope = 'TEAM' | 'PERSONAL';
export type TaskVisibility = 'TEAM' | 'PRIVATE';
export type TaskActivityType =
  | 'CREATED'
  | 'STATUS'
  | 'ASSIGNEE'
  | 'PRIORITY'
  | 'UPDATED'
  | 'ARCHIVED'
  | 'RESTORED';
export type ProjectIssueType =
  | 'BUG'
  | 'FEATURE'
  | 'IMPROVEMENT'
  | 'QUESTION'
  | 'RISK'
  | 'OTHER';
export type ProjectIssueStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'TESTING'
  | 'CLOSED'
  | 'HOLD';
export type ProjectIssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectIssueActivityType =
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
  scope: text('scope').$type<TaskScope>().notNull().default('TEAM'),
  ownerId: text('owner_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  visibility: text('visibility')
    .$type<TaskVisibility>()
    .notNull()
    .default('TEAM'),
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

export const projectIssueCategoriesTable = sqliteTable(
  'project_issue_categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    orderIdx: integer('order_idx').notNull().default(0),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    createdBy: text('created_by').references(() => usersTable.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const projectIssuesTable = sqliteTable('project_issues', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projectIssueCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  issueType: text('issue_type')
    .$type<ProjectIssueType>()
    .notNull()
    .default('BUG'),
  status: text('status').$type<ProjectIssueStatus>().notNull().default('OPEN'),
  priority: text('priority')
    .$type<ProjectIssuePriority>()
    .notNull()
    .default('MEDIUM'),
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

export const projectIssueChecklistsTable = sqliteTable(
  'project_issue_checklists',
  {
    id: text('id').primaryKey(),
    projectIssueId: text('project_issue_id')
      .notNull()
      .references(() => projectIssuesTable.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    completed: integer('completed', { mode: 'boolean' })
      .notNull()
      .default(false),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const projectIssueCommentsTable = sqliteTable('project_issue_comments', {
  id: text('id').primaryKey(),
  projectIssueId: text('project_issue_id')
    .notNull()
    .references(() => projectIssuesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const projectIssueAttachmentsTable = sqliteTable(
  'project_issue_attachments',
  {
    id: text('id').primaryKey(),
    projectIssueId: text('project_issue_id')
      .notNull()
      .references(() => projectIssuesTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    contentType: text('content_type').notNull(),
    fileSize: integer('file_size').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
);

export const projectIssueActivityLogsTable = sqliteTable(
  'project_issue_activity_logs',
  {
    id: text('id').primaryKey(),
    projectIssueId: text('project_issue_id')
      .notNull()
      .references(() => projectIssuesTable.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => usersTable.id, {
      onDelete: 'set null',
    }),
    activityType: text('activity_type')
      .$type<ProjectIssueActivityType>()
      .notNull(),
    fromValue: text('from_value'),
    toValue: text('to_value'),
    message: text('message'),
    createdAt: text('created_at').notNull(),
  },
);

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

export type IssueType =
  | 'BUG'
  | 'FEATURE'
  | 'IMPROVEMENT'
  | 'QUESTION'
  | 'OTHER';
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

export type ChallengeBlockType =
  | 'NOTE'
  | 'MMD'
  | 'CHECKLIST'
  | 'GITHUB'
  | 'FIGMA'
  | 'FILE'
  | 'DBTABLE';

export const challengeCategoriesTable = sqliteTable('challenge_categories', {
  id: text('id').primaryKey(),
  diaryId: text('diary_id').references(() => studyDiariesTable.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  summary: text('summary'),
  icon: text('icon').notNull().default('Trophy'),
  orderIdx: integer('order_idx').notNull().default(0),
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
  checkedItems: text('checked_items', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  adminRating: integer('admin_rating'),
  adminFeedback: text('admin_feedback'),
  ratedBy: text('rated_by').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
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
  sectionId: text('section_id').references(() => challengeSectionsTable.id, {
    onDelete: 'cascade',
  }),
  topicId: text('topic_id').references(() => challengeTopicsTable.id, {
    onDelete: 'cascade',
  }),
  title: text('title'),
  content: text('content').notNull(),
  visibility: text('visibility')
    .$type<NoteVisibility>()
    .notNull()
    .default('private'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sqlPracticeNotesTable = sqliteTable('sql_practice_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  seedFile: text('seed_file'),
  exampleId: text('example_id'),
  exampleTitle: text('example_title'),
  tableName: text('table_name'),
  title: text('title'),
  content: text('content').notNull(),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  publicToken: text('public_token').unique(),
  publicSharedAt: text('public_shared_at'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type SqlPracticeSubmissionLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export const sqlPracticeSubmissionsTable = sqliteTable(
  'sql_practice_submissions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    seedFile: text('seed_file').notNull(),
    seedHash: text('seed_hash'),
    exampleId: text('example_id').notNull(),
    exampleTitle: text('example_title').notNull(),
    exampleLevel: text('example_level')
      .$type<SqlPracticeSubmissionLevel>()
      .notNull(),
    exampleOrder: integer('example_order').notNull(),
    submittedSql: text('submitted_sql').notNull(),
    answerSql: text('answer_sql').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
    score: integer('score').notNull().default(0),
    maxScore: integer('max_score').notNull().default(1),
    feedback: text('feedback').notNull(),
    geminiRaw: text('gemini_raw'),
    createdAt: text('created_at').notNull(),
  },
);

export const sqlPracticeSubmissionLogsTable = sqliteTable(
  'sql_practice_submission_logs',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id').unique(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    seedFile: text('seed_file').notNull(),
    seedHash: text('seed_hash'),
    exampleId: text('example_id').notNull(),
    exampleTitle: text('example_title').notNull(),
    exampleLevel: text('example_level')
      .$type<SqlPracticeSubmissionLevel>()
      .notNull(),
    exampleOrder: integer('example_order').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
    score: integer('score').notNull().default(0),
    maxScore: integer('max_score').notNull().default(1),
    createdAt: text('created_at').notNull(),
  },
);

// ─── Dev Challenge Module Tables ──────────────────────────────────────────

export type DevChallengeAssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DevChallengeBlockType =
  | 'NOTE'
  | 'MMD'
  | 'CHECKLIST'
  | 'GITHUB'
  | 'FIGMA'
  | 'FILE'
  | 'DBTABLE';
export type DevChallengeSubmissionStatus =
  | 'SUBMITTED'
  | 'NEEDS_CHANGES'
  | 'APPROVED'
  | 'REJECTED';

export const devChallengeCategoriesTable = sqliteTable(
  'dev_challenge_categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    summary: text('summary'),
    icon: text('icon').notNull().default('Trophy'),
    orderIdx: integer('order_idx').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devChallengeSectionsTable = sqliteTable('dev_challenge_sections', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => devChallengeCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devChallengeAssignmentsTable = sqliteTable(
  'dev_challenge_assignments',
  {
    id: text('id').primaryKey(),
    sectionId: text('section_id')
      .notNull()
      .references(() => devChallengeSectionsTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary'),
    difficulty: text('difficulty').notNull().default('BASIC'),
    status: text('status')
      .$type<DevChallengeAssignmentStatus>()
      .notNull()
      .default('DRAFT'),
    orderIdx: integer('order_idx').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devChallengeAssignmentBlocksTable = sqliteTable(
  'dev_challenge_assignment_blocks',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id')
      .notNull()
      .references(() => devChallengeAssignmentsTable.id, {
        onDelete: 'cascade',
      }),
    blockType: text('block_type').$type<DevChallengeBlockType>().notNull(),
    title: text('title'),
    content: text('content').notNull(),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devChallengeSubmissionsTable = sqliteTable(
  'dev_challenge_submissions',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id')
      .notNull()
      .references(() => devChallengeAssignmentsTable.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    comment: text('comment').notNull().default(''),
    githubUrl: text('github_url'),
    status: text('status')
      .$type<DevChallengeSubmissionStatus>()
      .notNull()
      .default('SUBMITTED'),
    score: integer('score').notNull().default(0),
    maxScore: integer('max_score').notNull().default(0),
    checkedItems: text('checked_items', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    adminRating: integer('admin_rating'),
    adminFeedback: text('admin_feedback'),
    reviewedBy: text('reviewed_by').references(() => usersTable.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const schema = {
  usersTable,
  sessionsTable,
  studyDiariesTable,
  emailVerificationsTable,
  categoriesTable,
  prototypesTable,
  prototypeReviewsTable,
  prototypeImagesTable,
  docSectionsTable,
  documentsTable,
  documentBlocksTable,
  menusTable,
  boardConfigsTable,
  boardsTable,
  boardCommentsTable,
  apiDocCategoriesTable,
  apiDocEndpointsTable,
  apiDocBlocksTable,
  tasksTable,
  taskChecklistsTable,
  taskCommentsTable,
  taskAttachmentsTable,
  taskActivityLogsTable,
  projectIssueCategoriesTable,
  projectIssuesTable,
  projectIssueChecklistsTable,
  projectIssueCommentsTable,
  projectIssueAttachmentsTable,
  projectIssueActivityLogsTable,
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
  sqlPracticeNotesTable,
  sqlPracticeSubmissionsTable,
  sqlPracticeSubmissionLogsTable,
  devChallengeCategoriesTable,
  devChallengeSectionsTable,
  devChallengeAssignmentsTable,
  devChallengeAssignmentBlocksTable,
  devChallengeSubmissionsTable,
};

export type UserRow = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;
export type SessionRow = typeof sessionsTable.$inferSelect;
export type SessionInsert = typeof sessionsTable.$inferInsert;
export type StudyDiaryRow = typeof studyDiariesTable.$inferSelect;
export type StudyDiaryInsert = typeof studyDiariesTable.$inferInsert;
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
export type BoardConfigRow = typeof boardConfigsTable.$inferSelect;
export type BoardConfigInsert = typeof boardConfigsTable.$inferInsert;
export type BoardRow = typeof boardsTable.$inferSelect;
export type BoardInsert = typeof boardsTable.$inferInsert;
export type BoardCommentRow = typeof boardCommentsTable.$inferSelect;
export type BoardCommentInsert = typeof boardCommentsTable.$inferInsert;
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
export type ProjectIssueCategoryRow =
  typeof projectIssueCategoriesTable.$inferSelect;
export type ProjectIssueCategoryInsert =
  typeof projectIssueCategoriesTable.$inferInsert;
export type ProjectIssueRow = typeof projectIssuesTable.$inferSelect;
export type ProjectIssueInsert = typeof projectIssuesTable.$inferInsert;
export type ProjectIssueChecklistRow =
  typeof projectIssueChecklistsTable.$inferSelect;
export type ProjectIssueChecklistInsert =
  typeof projectIssueChecklistsTable.$inferInsert;
export type ProjectIssueCommentRow =
  typeof projectIssueCommentsTable.$inferSelect;
export type ProjectIssueCommentInsert =
  typeof projectIssueCommentsTable.$inferInsert;
export type ProjectIssueAttachmentRow =
  typeof projectIssueAttachmentsTable.$inferSelect;
export type ProjectIssueAttachmentInsert =
  typeof projectIssueAttachmentsTable.$inferInsert;
export type ProjectIssueActivityLogRow =
  typeof projectIssueActivityLogsTable.$inferSelect;
export type ProjectIssueActivityLogInsert =
  typeof projectIssueActivityLogsTable.$inferInsert;
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
export type ChallengeCategoryInsert =
  typeof challengeCategoriesTable.$inferInsert;
export type ChallengeSectionRow = typeof challengeSectionsTable.$inferSelect;
export type ChallengeSectionInsert = typeof challengeSectionsTable.$inferInsert;
export type ChallengeTopicRow = typeof challengeTopicsTable.$inferSelect;
export type ChallengeTopicInsert = typeof challengeTopicsTable.$inferInsert;
export type ChallengeSubmissionRow =
  typeof challengeSubmissionsTable.$inferSelect;
export type ChallengeSubmissionInsert =
  typeof challengeSubmissionsTable.$inferInsert;
export type ChallengeGptThreadRow =
  typeof challengeGptThreadsTable.$inferSelect;
export type ChallengeGptThreadInsert =
  typeof challengeGptThreadsTable.$inferInsert;
export type ChallengeGptMessageRow =
  typeof challengeGptMessagesTable.$inferSelect;
export type ChallengeGptMessageInsert =
  typeof challengeGptMessagesTable.$inferInsert;
export type ChallengeUserNoteRow = typeof challengeUserNotesTable.$inferSelect;
export type ChallengeUserNoteInsert =
  typeof challengeUserNotesTable.$inferInsert;
export type SqlPracticeNoteRow = typeof sqlPracticeNotesTable.$inferSelect;
export type SqlPracticeNoteInsert = typeof sqlPracticeNotesTable.$inferInsert;
export type SqlPracticeSubmissionRow =
  typeof sqlPracticeSubmissionsTable.$inferSelect;
export type SqlPracticeSubmissionInsert =
  typeof sqlPracticeSubmissionsTable.$inferInsert;
export type SqlPracticeSubmissionLogRow =
  typeof sqlPracticeSubmissionLogsTable.$inferSelect;
export type SqlPracticeSubmissionLogInsert =
  typeof sqlPracticeSubmissionLogsTable.$inferInsert;
export type DevChallengeCategoryRow =
  typeof devChallengeCategoriesTable.$inferSelect;
export type DevChallengeCategoryInsert =
  typeof devChallengeCategoriesTable.$inferInsert;
export type DevChallengeSectionRow =
  typeof devChallengeSectionsTable.$inferSelect;
export type DevChallengeSectionInsert =
  typeof devChallengeSectionsTable.$inferInsert;
export type DevChallengeAssignmentRow =
  typeof devChallengeAssignmentsTable.$inferSelect;
export type DevChallengeAssignmentInsert =
  typeof devChallengeAssignmentsTable.$inferInsert;
export type DevChallengeAssignmentBlockRow =
  typeof devChallengeAssignmentBlocksTable.$inferSelect;
export type DevChallengeAssignmentBlockInsert =
  typeof devChallengeAssignmentBlocksTable.$inferInsert;
export type DevChallengeSubmissionRow =
  typeof devChallengeSubmissionsTable.$inferSelect;
export type DevChallengeSubmissionInsert =
  typeof devChallengeSubmissionsTable.$inferInsert;

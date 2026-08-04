import {
  sqliteTable,
  text,
  integer,
  real,
  AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

export const departmentsTable = sqliteTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // 자기참조 → 부서 계층 (본부 > 팀). 최상위는 null
  parentId: text('parent_id').references(
    (): AnySQLiteColumn => departmentsTable.id,
    {
      onDelete: 'set null',
    },
  ),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  profileImageUrl: text('profile_image_url'),
  role: text('role').$type<'admin' | 'user'>().notNull(),
  aiAccess: integer('ai_access').notNull().default(0),
  // 조직도: 소속 부서 + 직급
  departmentId: text('department_id').references(() => departmentsTable.id, {
    onDelete: 'set null',
  }),
  position: text('position'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type DepartmentRow = typeof departmentsTable.$inferSelect;
export type DepartmentInsert = typeof departmentsTable.$inferInsert;

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

// ── Arch Note (아키텍처 노트 — 워크스페이스=분류(백엔드/프론트/DevOps)) ──
// study-diary와 별개의 독립 도메인. 워크스페이스→1차 주제→2차 주제→노트 4단 구조.
export const archNoteWorkspacesTable = sqliteTable('arch_note_workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon').notNull().default('Layers'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const archNoteCategoriesTable = sqliteTable('arch_note_categories', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => archNoteWorkspacesTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const archNoteSectionsTable = sqliteTable('arch_note_sections', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => archNoteCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const archNoteNotesTable = sqliteTable('arch_note_notes', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => archNoteSectionsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type ArchNoteWorkspaceRow = typeof archNoteWorkspacesTable.$inferSelect;
export type ArchNoteCategoryRow = typeof archNoteCategoriesTable.$inferSelect;
export type ArchNoteSectionRow = typeof archNoteSectionsTable.$inferSelect;
export type ArchNoteNoteRow = typeof archNoteNotesTable.$inferSelect;

// ── Planning Design (기획·설계 — Lexical 문서 안에서 MMD 포함) ─────────────
// arch-note와 동일한 4단 구조를 사용하되 데이터 수명주기는 독립적으로 관리한다.
export const planningDesignWorkspacesTable = sqliteTable(
  'planning_design_workspaces',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    icon: text('icon').notNull().default('DraftingCompass'),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const planningDesignCategoriesTable = sqliteTable(
  'planning_design_categories',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => planningDesignWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    name: text('name').notNull(),
    orderIdx: integer('order_idx').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const planningDesignSectionsTable = sqliteTable(
  'planning_design_sections',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => planningDesignCategoriesTable.id, {
        onDelete: 'cascade',
      }),
    title: text('title').notNull(),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const planningDesignDocumentsTable = sqliteTable(
  'planning_design_documents',
  {
    id: text('id').primaryKey(),
    sectionId: text('section_id')
      .notNull()
      .references(() => planningDesignSectionsTable.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export type PlanningDesignWorkspaceRow =
  typeof planningDesignWorkspacesTable.$inferSelect;
export type PlanningDesignCategoryRow =
  typeof planningDesignCategoriesTable.$inferSelect;
export type PlanningDesignSectionRow =
  typeof planningDesignSectionsTable.$inferSelect;
export type PlanningDesignDocumentRow =
  typeof planningDesignDocumentsTable.$inferSelect;

// ── Dev History (개발 일지) ─────────────────────────────────────────────
// 기획·설계와 같은 4단 구조를 사용하되 개발 진행 기록은 독립 도메인으로 관리한다.
export const devHistoryWorkspacesTable = sqliteTable('dev_history_workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon').notNull().default('NotebookPen'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devHistoryCategoriesTable = sqliteTable('dev_history_categories', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => devHistoryWorkspacesTable.id, {
      onDelete: 'cascade',
    }),
  name: text('name').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devHistorySectionsTable = sqliteTable('dev_history_sections', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => devHistoryCategoriesTable.id, {
      onDelete: 'cascade',
    }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devHistoryDocumentsTable = sqliteTable('dev_history_documents', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => devHistorySectionsTable.id, {
      onDelete: 'cascade',
    }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type DevHistoryWorkspaceRow =
  typeof devHistoryWorkspacesTable.$inferSelect;
export type DevHistoryCategoryRow =
  typeof devHistoryCategoriesTable.$inferSelect;
export type DevHistorySectionRow = typeof devHistorySectionsTable.$inferSelect;
export type DevHistoryDocumentRow =
  typeof devHistoryDocumentsTable.$inferSelect;

// ── Idea Note (아이디어 노트) ───────────────────────────────────────────
// 기획 전 단계의 아이디어, 가설, 레퍼런스를 독립 도메인으로 관리한다.
export const ideaNoteWorkspacesTable = sqliteTable('idea_note_workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon').notNull().default('Lightbulb'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const ideaNoteCategoriesTable = sqliteTable('idea_note_categories', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => ideaNoteWorkspacesTable.id, {
      onDelete: 'cascade',
    }),
  name: text('name').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const ideaNoteSectionsTable = sqliteTable('idea_note_sections', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => ideaNoteCategoriesTable.id, {
      onDelete: 'cascade',
    }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const ideaNoteDocumentsTable = sqliteTable('idea_note_documents', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => ideaNoteSectionsTable.id, {
      onDelete: 'cascade',
    }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type IdeaNoteWorkspaceRow = typeof ideaNoteWorkspacesTable.$inferSelect;
export type IdeaNoteCategoryRow = typeof ideaNoteCategoriesTable.$inferSelect;
export type IdeaNoteSectionRow = typeof ideaNoteSectionsTable.$inferSelect;
export type IdeaNoteDocumentRow = typeof ideaNoteDocumentsTable.$inferSelect;

// ── Discussion Note (의사결정 노트) ─────────────────────────────────────
// 논의가 필요한 주제를 저장하고 댓글·결정 요약을 함께 추적한다.
export const discussionNotesTable = sqliteTable('discussion_notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  decisionSummary: text('decision_summary').notNull().default(''),
  status: text('status')
    .$type<'OPEN' | 'DISCUSSING' | 'DECIDED' | 'ON_HOLD' | 'CLOSED'>()
    .notNull()
    .default('OPEN'),
  priority: text('priority')
    .$type<'LOW' | 'MEDIUM' | 'HIGH'>()
    .notNull()
    .default('MEDIUM'),
  linkedTaskId: text('linked_task_id'),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const discussionNoteCommentsTable = sqliteTable(
  'discussion_note_comments',
  {
    id: text('id').primaryKey(),
    discussionNoteId: text('discussion_note_id')
      .notNull()
      .references(() => discussionNotesTable.id, { onDelete: 'cascade' }),
    kind: text('kind')
      .$type<'OPINION' | 'COUNTER'>()
      .notNull()
      .default('OPINION'),
    content: text('content').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

export type DiscussionNoteRow = typeof discussionNotesTable.$inferSelect;
export type DiscussionNoteInsert = typeof discussionNotesTable.$inferInsert;
export type DiscussionNoteCommentRow =
  typeof discussionNoteCommentsTable.$inferSelect;
export type DiscussionNoteCommentInsert =
  typeof discussionNoteCommentsTable.$inferInsert;

// ── Project Board (프로젝트 논의 게시판) ───────────────────────────────
// 2차 사이드바에서 관리하는 게시판과 각 게시판의 게시글을 저장한다.
export const projectDiscussionBoardsTable = sqliteTable(
  'project_discussion_boards',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    orderIdx: integer('order_idx').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const projectDiscussionPostsTable = sqliteTable(
  'project_discussion_posts',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => projectDiscussionBoardsTable.id, {
        onDelete: 'cascade',
      }),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export type ProjectDiscussionBoardRow =
  typeof projectDiscussionBoardsTable.$inferSelect;
export type ProjectDiscussionBoardInsert =
  typeof projectDiscussionBoardsTable.$inferInsert;
export type ProjectDiscussionPostRow =
  typeof projectDiscussionPostsTable.$inferSelect;
export type ProjectDiscussionPostInsert =
  typeof projectDiscussionPostsTable.$inferInsert;

// ── Project Schedule (개발 일정 관리) ───────────────────────────────────
// 개발 일정의 제목, 상세 내용과 시작·종료 기간을 달력에서 관리한다.
export const projectSchedulesTable = sqliteTable('project_schedules', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  startAt: text('start_at').notNull(),
  endAt: text('end_at'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type ProjectScheduleRow = typeof projectSchedulesTable.$inferSelect;
export type ProjectScheduleInsert = typeof projectSchedulesTable.$inferInsert;

// ── Project Code Review (프로젝트 코드리뷰 — 워크스페이스=프로젝트) ──
// arch-note와 동일한 4단 구조(워크스페이스→1차 주제→2차 주제→노트)의 독립 도메인.
export const projectCodeReviewWorkspacesTable = sqliteTable(
  'project_code_review_workspaces',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    icon: text('icon').notNull().default('GitPullRequest'),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const projectCodeReviewCategoriesTable = sqliteTable(
  'project_code_review_categories',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => projectCodeReviewWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    name: text('name').notNull(),
    orderIdx: integer('order_idx').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const projectCodeReviewSectionsTable = sqliteTable(
  'project_code_review_sections',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => projectCodeReviewCategoriesTable.id, {
        onDelete: 'cascade',
      }),
    title: text('title').notNull(),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const projectCodeReviewNotesTable = sqliteTable(
  'project_code_review_notes',
  {
    id: text('id').primaryKey(),
    sectionId: text('section_id')
      .notNull()
      .references(() => projectCodeReviewSectionsTable.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export type ProjectCodeReviewWorkspaceRow =
  typeof projectCodeReviewWorkspacesTable.$inferSelect;
export type ProjectCodeReviewCategoryRow =
  typeof projectCodeReviewCategoriesTable.$inferSelect;
export type ProjectCodeReviewSectionRow =
  typeof projectCodeReviewSectionsTable.$inferSelect;
export type ProjectCodeReviewNoteRow =
  typeof projectCodeReviewNotesTable.$inferSelect;

// ── AX Playbook ────────────────────────────────────────────────────
// 1차 영역 → 2차 주제 → 여러 Lexical 문서.
export const axPlaybookCategoriesTable = sqliteTable('ax_playbook_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const axPlaybookTopicsTable = sqliteTable('ax_playbook_topics', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => axPlaybookCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const axPlaybookDocumentsTable = sqliteTable('ax_playbook_documents', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => axPlaybookTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type AxPlaybookCategoryRow = typeof axPlaybookCategoriesTable.$inferSelect;
export type AxPlaybookTopicRow = typeof axPlaybookTopicsTable.$inferSelect;
export type AxPlaybookDocumentRow = typeof axPlaybookDocumentsTable.$inferSelect;

// ── DevOps Playbook ───────────────────────────────────────────────
// 1차 영역 → 2차 주제 → 여러 Lexical 문서.
export const devopsPlaybookCategoriesTable = sqliteTable('devops_playbook_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devopsPlaybookTopicsTable = sqliteTable('devops_playbook_topics', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => devopsPlaybookCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devopsPlaybookDocumentsTable = sqliteTable('devops_playbook_documents', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => devopsPlaybookTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type DevopsPlaybookCategoryRow = typeof devopsPlaybookCategoriesTable.$inferSelect;
export type DevopsPlaybookTopicRow = typeof devopsPlaybookTopicsTable.$inferSelect;
export type DevopsPlaybookDocumentRow = typeof devopsPlaybookDocumentsTable.$inferSelect;

// ── AX Study (towercrane-axtrainer-tauri 전용 모듈) ──────────────────
// ── Architecture Playbook ───────────────────────────────────────────────
// 1차 영역 → 2차 주제 → 여러 Lexical 문서.
export const architecturePlaybookCategoriesTable = sqliteTable('architecture_playbook_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const architecturePlaybookTopicsTable = sqliteTable('architecture_playbook_topics', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => architecturePlaybookCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const architecturePlaybookDocumentsTable = sqliteTable('architecture_playbook_documents', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => architecturePlaybookTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type ArchitecturePlaybookCategoryRow = typeof architecturePlaybookCategoriesTable.$inferSelect;
export type ArchitecturePlaybookTopicRow = typeof architecturePlaybookTopicsTable.$inferSelect;
export type ArchitecturePlaybookDocumentRow = typeof architecturePlaybookDocumentsTable.$inferSelect;

// ── AX Study (towercrane-axtrainer-tauri 전용 모듈) ──────────────────
// ── Commerce Playbook ───────────────────────────────────────────────
// 1차 영역 → 2차 주제 → 여러 Lexical 문서.
export const commercePlaybookCategoriesTable = sqliteTable('commerce_playbook_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const commercePlaybookTopicsTable = sqliteTable('commerce_playbook_topics', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => commercePlaybookCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const commercePlaybookDocumentsTable = sqliteTable('commerce_playbook_documents', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => commercePlaybookTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type CommercePlaybookCategoryRow = typeof commercePlaybookCategoriesTable.$inferSelect;
export type CommercePlaybookTopicRow = typeof commercePlaybookTopicsTable.$inferSelect;
export type CommercePlaybookDocumentRow = typeof commercePlaybookDocumentsTable.$inferSelect;

// ── AX Study (towercrane-axtrainer-tauri 전용 모듈) ──────────────────
// ── DB Playbook ───────────────────────────────────────────────
// 1차 영역 → 2차 주제 → 여러 Lexical 문서.
export const dbPlaybookCategoriesTable = sqliteTable('db_playbook_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const dbPlaybookTopicsTable = sqliteTable('db_playbook_topics', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => dbPlaybookCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const dbPlaybookDocumentsTable = sqliteTable('db_playbook_documents', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => dbPlaybookTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type DbPlaybookCategoryRow = typeof dbPlaybookCategoriesTable.$inferSelect;
export type DbPlaybookTopicRow = typeof dbPlaybookTopicsTable.$inferSelect;
export type DbPlaybookDocumentRow = typeof dbPlaybookDocumentsTable.$inferSelect;

// ── SQL Playbook ─────────────────────────────────────────────
export const sqlPlaybookCategoriesTable = sqliteTable('sql_playbook_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sqlPlaybookTopicsTable = sqliteTable('sql_playbook_topics', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => sqlPlaybookCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sqlPlaybookDocumentsTable = sqliteTable('sql_playbook_documents', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => sqlPlaybookTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type SqlPlaybookCategoryRow = typeof sqlPlaybookCategoriesTable.$inferSelect;
export type SqlPlaybookTopicRow = typeof sqlPlaybookTopicsTable.$inferSelect;
export type SqlPlaybookDocumentRow = typeof sqlPlaybookDocumentsTable.$inferSelect;

// ── Debugging History / Technical Debt ───────────────────────
export const debuggingHistoryCategoriesTable = sqliteTable('debugging_history_categories', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), orderIdx: integer('order_idx').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const debuggingHistoryTopicsTable = sqliteTable('debugging_history_topics', {
  id: text('id').primaryKey(), categoryId: text('category_id').notNull().references(() => debuggingHistoryCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), orderIdx: integer('order_idx').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const debuggingHistoryDocumentsTable = sqliteTable('debugging_history_documents', {
  id: text('id').primaryKey(), topicId: text('topic_id').notNull().references(() => debuggingHistoryTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), content: text('content').notNull().default(''), orderIdx: integer('order_idx').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const technicalDebtCategoriesTable = sqliteTable('technical_debt_categories', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), orderIdx: integer('order_idx').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const technicalDebtTopicsTable = sqliteTable('technical_debt_topics', {
  id: text('id').primaryKey(), categoryId: text('category_id').notNull().references(() => technicalDebtCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), orderIdx: integer('order_idx').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const technicalDebtDocumentsTable = sqliteTable('technical_debt_documents', {
  id: text('id').primaryKey(), topicId: text('topic_id').notNull().references(() => technicalDebtTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), content: text('content').notNull().default(''), orderIdx: integer('order_idx').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});

// ── AX Study (towercrane-axtrainer-tauri 전용 모듈) ──────────────────

// study-diary와 별개의 워크스페이스→노트 2단 구조. AX 학습 자료 정리/공유용.
export const axStudyWorkspacesTable = sqliteTable('ax_study_workspaces', {
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

export const axStudyNotesTable = sqliteTable('ax_study_notes', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => axStudyWorkspacesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type AxStudyWorkspaceRow = typeof axStudyWorkspacesTable.$inferSelect;
export type AxStudyNoteRow = typeof axStudyNotesTable.$inferSelect;

// ── Study Plan (towercrane-axtrainer-tauri 학습 노트) ────────────────
// 계획(plan)→학습 항목(item) 2단 구조. 항목마다 진행 상태를 두어 진행률 계산.
export const aiStudyNotesTable = sqliteTable('ai_study_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  // UI는 비공개/공개 2단계. shared(팀 범위)는 미도입 → 타입도 2단계로 고정.
  visibility: text('visibility')
    .$type<'private' | 'public'>()
    .notNull()
    .default('private'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiStudyNoteItemsTable = sqliteTable('ai_study_note_items', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => aiStudyNotesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  resourceUrl: text('resource_url'),
  status: text('status')
    .$type<'todo' | 'doing' | 'done'>()
    .notNull()
    .default('todo'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 항목별 단계 노트 — 댓글처럼 여러 개 쌓아 카드로 표시.
export const aiStudyNoteItemNotesTable = sqliteTable(
  'ai_study_note_item_notes',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => aiStudyNoteItemsTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    orderIdx: integer('order_idx').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export type AiStudyNoteRow = typeof aiStudyNotesTable.$inferSelect;
export type AiStudyNoteItemRow = typeof aiStudyNoteItemsTable.$inferSelect;
export type AiStudyNoteItemNoteRow =
  typeof aiStudyNoteItemNotesTable.$inferSelect;

// ── AX Board (towercrane-axtrainer-tauri 게시판) ─────────────────────
// 카테고리별 게시글 + 댓글. ax-study(노트)와 완전 별개 기능.
export type AxBoardCategory = 'news' | 'tips' | 'qna' | 'free';

export const axBoardPostsTable = sqliteTable('ax_board_posts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  category: text('category').$type<AxBoardCategory>().notNull().default('free'),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const axBoardCommentsTable = sqliteTable('ax_board_comments', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => axBoardPostsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type AxBoardPostRow = typeof axBoardPostsTable.$inferSelect;
export type AxBoardCommentRow = typeof axBoardCommentsTable.$inferSelect;

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

export type PrototypeWorkspaceRole = 'owner' | 'editor' | 'member' | 'viewer';

export const prototypeWorkspacesTable = sqliteTable('prototype_workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const prototypeWorkspaceMembersTable = sqliteTable(
  'prototype_workspace_members',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => prototypeWorkspacesTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: text('role')
      .$type<PrototypeWorkspaceRole>()
      .notNull()
      .default('member'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(
    () => prototypeWorkspacesTable.id,
    {
      onDelete: 'cascade',
    },
  ),
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

export const prototypeNoteTopicsTable = sqliteTable('prototype_note_topics', {
  id: text('id').primaryKey(),
  prototypeId: text('prototype_id')
    .notNull()
    .references(() => prototypesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const prototypeNoteSectionsTable = sqliteTable('prototype_note_sections', {
  id: text('id').primaryKey(),
  topicId: text('topic_id')
    .notNull()
    .references(() => prototypeNoteTopicsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const prototypeNoteEntriesTable = sqliteTable('prototype_note_entries', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => prototypeNoteSectionsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ── Tutorial (튜토리얼 — 1차 카테고리→2차 주제→본문) ────────────────
export const tutorialCategoriesTable = sqliteTable('tutorial_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tutorialSectionsTable = sqliteTable('tutorial_sections', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => tutorialCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tutorialLessonsTable = sqliteTable('tutorial_lessons', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => tutorialSectionsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''),
  videoUrl: text('video_url').notNull().default(''),
  videoTitle: text('video_title').notNull().default(''),
  documentUrl: text('document_url').notNull().default(''),
  documentTitle: text('document_title').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tutorialContentsTable = sqliteTable('tutorial_contents', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id')
    .notNull()
    .references(() => tutorialLessonsTable.id, { onDelete: 'cascade' }),
  type: text('type').$type<'lexical' | 'youtube' | 'document'>().notNull(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  url: text('url').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ── Test Playbook (테스트 실행 과정·리뷰·원천 모듈 링크) ─────────────
export const testPlaybookCategoriesTable = sqliteTable('test_playbook_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const testPlaybookDocumentsTable = sqliteTable('test_playbook_documents', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => testPlaybookCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''),
  stepsJson: text('steps_json').notNull().default('[]'),
  githubUrl: text('github_url').notNull().default(''),
  reviewNotes: text('review_notes').notNull().default(''),
  status: text('status').$type<'draft' | 'running' | 'review' | 'approved'>().notNull().default('draft'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const testPlaybookContentsTable = sqliteTable('test_playbook_contents', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => testPlaybookDocumentsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  orderIdx: integer('order_idx').notNull().default(0),
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
    onDelete: 'cascade',
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
    onDelete: 'cascade',
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

export const apiDocTeamsTable = sqliteTable('api_doc_teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  emoji: text('emoji'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const apiDocCategoriesTable = sqliteTable('api_doc_categories', {
  id: text('id').primaryKey(),
  teamId: text('team_id').references(() => apiDocTeamsTable.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  icon: text('icon'),
  emoji: text('emoji'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
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
    onDelete: 'cascade',
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

// Excel API 원본 문서 관리: 프로젝트 → 분류 → Excel 파일
export const apiExcelProjectsTable = sqliteTable('api_excel_projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const apiExcelCategoriesTable = sqliteTable('api_excel_categories', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => apiExcelProjectsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const apiExcelFilesTable = sqliteTable('api_excel_files', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => apiExcelCategoriesTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  storageKey: text('storage_key').notNull(),
  publicUrl: text('public_url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  sheetCount: integer('sheet_count').notNull().default(0),
  apiCount: integer('api_count').notNull().default(0),
  version: integer('version').notNull().default(1),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type TaskWorkspaceRole = 'owner' | 'editor' | 'member' | 'viewer';

export const taskWorkspacesTable = sqliteTable('task_workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const taskWorkspaceMembersTable = sqliteTable('task_workspace_members', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => taskWorkspacesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  role: text('role').$type<TaskWorkspaceRole>().notNull().default('member'),
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
export type TaskReferenceType = 'FIGMA' | 'DOC' | 'GITHUB' | 'URL';
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
  workspaceId: text('workspace_id').references(() => taskWorkspacesTable.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  acceptanceCriteria: text('acceptance_criteria').notNull().default(''),
  plan: text('plan').notNull().default(''),
  folderStructure: text('folder_structure').notNull().default(''),
  mmdContent: text('mmd_content').notNull().default(''),
  taskType: text('task_type').$type<TaskType>().notNull().default('FEATURE'),
  status: text('status').$type<TaskStatus>().notNull().default('TODO'),
  priority: text('priority').$type<TaskPriority>().notNull().default('MEDIUM'),
  reporterId: text('reporter_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  assigneeId: text('assignee_id').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  scope: text('scope').$type<TaskScope>().notNull().default('TEAM'),
  ownerId: text('owner_id').references(() => usersTable.id, {
    onDelete: 'cascade',
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

export const taskReferencesTable = sqliteTable('task_references', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  referenceType: text('reference_type')
    .$type<TaskReferenceType>()
    .notNull()
    .default('URL'),
  title: text('title').notNull(),
  url: text('url').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const taskActivityLogsTable = sqliteTable('task_activity_logs', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  activityType: text('activity_type').$type<TaskActivityType>().notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  message: text('message'),
  createdAt: text('created_at').notNull(),
});

export const taskAiReviewsTable = sqliteTable('task_ai_reviews', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  format: text('format')
    .$type<'MARKDOWN' | 'HTML'>()
    .notNull()
    .default('MARKDOWN'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  source: text('source').$type<'CODEX' | 'MANUAL'>().notNull().default('CODEX'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
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
      onDelete: 'cascade',
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
    onDelete: 'cascade',
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
      onDelete: 'cascade',
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

// 팀 문서 — 폴더/문서/파일을 하나의 트리 노드로 통합 (parentId 자기참조)
export type TeamDocNodeType = 'FOLDER' | 'DOC' | 'FILE';

export const teamDocNodesTable = sqliteTable('team_doc_nodes', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').references(
    (): AnySQLiteColumn => teamDocNodesTable.id,
    { onDelete: 'cascade' },
  ),
  type: text('type').$type<TeamDocNodeType>().notNull(),
  title: text('title').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  content: text('content'),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  contentType: text('content_type'),
  fileSize: integer('file_size'),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  updatedBy: text('updated_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type TeamDocNodeRow = typeof teamDocNodesTable.$inferSelect;
export type TeamDocNodeInsert = typeof teamDocNodesTable.$inferInsert;

export type MeetingWorkspaceRole = 'owner' | 'editor' | 'member' | 'viewer';

export const meetingWorkspacesTable = sqliteTable('meeting_workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  orderIdx: integer('order_idx').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const meetingWorkspaceMembersTable = sqliteTable(
  'meeting_workspace_members',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => meetingWorkspacesTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: text('role')
      .$type<MeetingWorkspaceRole>()
      .notNull()
      .default('member'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
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
  workspaceId: text('workspace_id').references(
    () => meetingWorkspacesTable.id,
    {
      onDelete: 'set null',
    },
  ),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
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
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
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

// 방별 읽음 커서 — 안읽음 카운트는 last_read_at 이후 메시지 수로 계산
export const meetingRoomReadsTable = sqliteTable('meeting_room_reads', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => meetingRoomsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  lastReadAt: text('last_read_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type DevManagementRoomType =
  | 'GENERAL'
  | 'PROTOTYPE'
  | 'ISSUE'
  | 'DECISION'
  | 'TECH_DEBT'
  | 'RESOURCE'
  | 'DM';
export type DevManagementSenderType = 'USER' | 'BOT' | 'SYSTEM' | 'TOOL';
export type DevManagementMessageType =
  | 'TEXT'
  | 'SYSTEM'
  | 'BOT_REPLY'
  | 'SUMMARY'
  | 'MEETING_MINUTES_SAVED'
  | 'CODE_REVIEW_SAVED'
  | 'PROTOTYPE_SEARCH_RESULT'
  | 'TECH_DEBT_ANALYSIS'
  | 'TOOL_RESULT';
export type DevManagementBotResponseMode =
  | 'MENTION_ONLY'
  | 'DIRECT_ONLY'
  | 'MENTION_OR_DIRECT';

export const devManagementRoomsTable = sqliteTable('dev_management_rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  roomType: text('room_type').$type<DevManagementRoomType>().notNull(),
  description: text('description'),
  orderIdx: integer('order_idx').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devManagementMessagesTable = sqliteTable(
  'dev_management_messages',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => devManagementRoomsTable.id, { onDelete: 'cascade' }),
    senderId: text('sender_id').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    senderType: text('sender_type').$type<DevManagementSenderType>().notNull(),
    senderName: text('sender_name').notNull(),
    senderRole: text('sender_role'),
    content: text('content').notNull(),
    messageType: text('message_type')
      .$type<DevManagementMessageType>()
      .notNull()
      .default('TEXT'),
    payload: text('payload', { mode: 'json' }).$type<Record<
      string,
      unknown
    > | null>(),
    createdAt: text('created_at').notNull(),
  },
);

export type DevMeetingMinutesSourceRef = {
  text: string;
  sourceMessageIds: string[];
};

export type DevMeetingMinutesActionItem = {
  text: string;
  assigneeName: string | null;
  dueDate: string | null;
  sourceMessageIds: string[];
};

export const devMeetingMinutesTable = sqliteTable('dev_meeting_minutes', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => devManagementRoomsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  discussionPoints: text('discussion_points', { mode: 'json' })
    .$type<DevMeetingMinutesSourceRef[]>()
    .notNull()
    .default([]),
  decisions: text('decisions', { mode: 'json' })
    .$type<DevMeetingMinutesSourceRef[]>()
    .notNull()
    .default([]),
  actionItems: text('action_items', { mode: 'json' })
    .$type<DevMeetingMinutesActionItem[]>()
    .notNull()
    .default([]),
  openQuestions: text('open_questions', { mode: 'json' })
    .$type<DevMeetingMinutesSourceRef[]>()
    .notNull()
    .default([]),
  sourceMessageIds: text('source_message_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdByName: text('created_by_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type CodeReviewSourceType = 'commit' | 'pr' | 'compare' | 'diff_url';
export type CodeReviewRiskLevel = 'low' | 'medium' | 'high';
export type CodeReviewFindingSeverity = 'low' | 'medium' | 'high';

export type CodeReviewFinding = {
  category?:
    | 'process'
    | 'code'
    | 'syntax'
    | 'structure'
    | 'architecture'
    | 'clean_code'
    | 'diagram'
    | 'risk';
  severity: CodeReviewFindingSeverity;
  title: string;
  body: string;
  filePath: string | null;
  lineNumber: number | null;
  recommendation: string;
};

export type CodeReviewChangedFile = {
  path: string;
  additions: number;
  deletions: number;
  reviewed: boolean;
  excludedReason: string | null;
};

export type CodeReviewDocumentType =
  | 'overview'
  | 'review'
  | 'checklist'
  | 'issue'
  | 'note';

export type CodeReviewDocument = {
  id: string;
  type: CodeReviewDocumentType;
  title: string;
  content: string;
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
};

export type CodeReviewCriterion = {
  id: string;
  title: string;
  instruction: string;
  enabled: boolean;
  orderIdx: number;
};

export type CodeReviewCriterionFinding = {
  severity: CodeReviewFindingSeverity;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
  evidence: string;
  recommendation: string;
};

export type CodeReviewCriterionResult = {
  criterionId: string;
  criterionTitle: string;
  status: 'problem' | 'warning' | 'no_finding' | 'not_applicable';
  summary: string;
  findings: CodeReviewCriterionFinding[];
};

export const codeReviewsTable = sqliteTable('code_reviews', {
  id: text('id').primaryKey(),
  taskId: text('task_id').references(() => tasksTable.id, {
    onDelete: 'set null',
  }),
  sourceType: text('source_type').$type<CodeReviewSourceType>().notNull(),
  sourceUrl: text('source_url').notNull(),
  repository: text('repository').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  riskLevel: text('risk_level').$type<CodeReviewRiskLevel>().notNull(),
  findings: text('findings', { mode: 'json' })
    .$type<CodeReviewFinding[]>()
    .notNull()
    .default([]),
  testGaps: text('test_gaps', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  changedFiles: text('changed_files', { mode: 'json' })
    .$type<CodeReviewChangedFile[]>()
    .notNull()
    .default([]),
  excludedFiles: text('excluded_files', { mode: 'json' })
    .$type<CodeReviewChangedFile[]>()
    .notNull()
    .default([]),
  reviewDocuments: text('review_documents', { mode: 'json' })
    .$type<CodeReviewDocument[]>()
    .notNull()
    .default([]),
  diffHash: text('diff_hash').notNull(),
  diffSnapshot: text('diff_snapshot'),
  model: text('model'),
  prNumber: integer('pr_number'),
  prTitle: text('pr_title'),
  prState: text('pr_state'),
  prAuthorLogin: text('pr_author_login'),
  baseRef: text('base_ref'),
  headRef: text('head_ref'),
  headSha: text('head_sha'),
  prUpdatedAt: text('pr_updated_at'),
  reviewNote: text('review_note'),
  criteriaSnapshot: text('criteria_snapshot', { mode: 'json' })
    .$type<CodeReviewCriterion[]>()
    .notNull()
    .default([]),
  criterionResults: text('criterion_results', { mode: 'json' })
    .$type<CodeReviewCriterionResult[]>()
    .notNull()
    .default([]),
  promptContractVersion: text('prompt_contract_version'),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdByName: text('created_by_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const featurePlansTable = sqliteTable('feature_plans', {
  id: text('id').primaryKey(),
  linkedTaskId: text('linked_task_id').references(() => tasksTable.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  content: text('content').notNull().default(''),
  acceptanceCriteria: text('acceptance_criteria').notNull().default(''),
  plan: text('plan').notNull().default(''),
  folderStructure: text('folder_structure').notNull().default(''),
  checklist: text('checklist', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  mmdContent: text('mmd_content').notNull().default(''),
  sourceFileName: text('source_file_name'),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdByName: text('created_by_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type DesignTemplateFile = {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
  purpose?: 'source' | 'convention' | 'asset';
};

export const designTemplatesTable = sqliteTable('design_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  category: text('category').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  coverImageUrl: text('cover_image_url'),
  previewImageUrls: text('preview_image_urls', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  files: text('files', { mode: 'json' })
    .$type<DesignTemplateFile[]>()
    .notNull()
    .default([]),
  conventionFiles: text('convention_files', { mode: 'json' })
    .$type<DesignTemplateFile[]>()
    .notNull()
    .default([]),
  designRules: text('design_rules').notNull().default(''),
  aiPrompt: text('ai_prompt').notNull().default(''),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdByName: text('created_by_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const designReferencesTable = sqliteTable('design_references', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: text('created_by').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdByName: text('created_by_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type CommonComponentPreviewKind =
  | 'input'
  | 'button'
  | 'card'
  | 'filter-tabs';

export type CommonComponentProps = Record<string, unknown>;

export type CommonComponentExample = {
  id: string;
  title: string;
  summary: string;
  previewKind: CommonComponentPreviewKind;
  previewVariant: string;
  code: string;
  props?: CommonComponentProps;
  orderIdx: number;
};

export const commonComponentTemplatesTable = sqliteTable(
  'common_component_templates',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    category: text('category').notNull(),
    style: text('style').notNull(),
    previewKind: text('preview_kind').$type<CommonComponentPreviewKind>().notNull(),
    componentName: text('component_name').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
    examples: text('examples', { mode: 'json' })
      .$type<CommonComponentExample[]>()
      .notNull()
      .default([]),
    code: text('code').notNull(),
    notes: text('notes').notNull().default(''),
    createdBy: text('created_by').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    createdByName: text('created_by_name').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devManagementBotSettingsTable = sqliteTable(
  'dev_management_bot_settings',
  {
    roomId: text('room_id')
      .primaryKey()
      .references(() => devManagementRoomsTable.id, { onDelete: 'cascade' }),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    responseMode: text('response_mode')
      .$type<DevManagementBotResponseMode>()
      .notNull()
      .default('MENTION_ONLY'),
    updatedBy: text('updated_by').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devManagementDmPairsTable = sqliteTable(
  'dev_management_dm_pairs',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => devManagementRoomsTable.id, { onDelete: 'cascade' }),
    userAId: text('user_a_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    userBId: text('user_b_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
);

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
    onDelete: 'cascade',
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
    onDelete: 'cascade',
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
  orderIdx: integer('order_idx').notNull().default(0),
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

export type SqlUserPracticeProblemVisibility = 'public' | 'private';
export type SqlUserPracticeProblemStatus = 'draft' | 'published' | 'archived';

export const sqlUserPracticeSchemasTable = sqliteTable(
  'sql_user_practice_schemas',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    schemaSql: text('schema_sql').notNull(),
    erdMmd: text('erd_mmd'),
    dbFileHash: text('db_file_hash').notNull(),
    sourceType: text('source_type').notNull().default('seed'),
    replacedFromSchemaId: text('replaced_from_schema_id'),
    version: integer('version').notNull().default(1),
    createdBy: text('created_by').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlUserPracticeProblemsTable = sqliteTable(
  'sql_user_practice_problems',
  {
    id: text('id').primaryKey(),
    schemaId: text('schema_id')
      .notNull()
      .references(() => sqlUserPracticeSchemasTable.id, {
        onDelete: 'cascade',
      }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    level: integer('level').notNull().default(1),
    targetTables: text('target_tables', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    starterSql: text('starter_sql'),
    answerSql: text('answer_sql').notNull(),
    explanation: text('explanation'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    visibility: text('visibility')
      .$type<SqlUserPracticeProblemVisibility>()
      .notNull()
      .default('public'),
    status: text('status')
      .$type<SqlUserPracticeProblemStatus>()
      .notNull()
      .default('published'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export type SqlPersonalPracticeSchemaSourceType =
  | 'seed'
  | 'uploaded_sql'
  | 'uploaded_sqlite';
export type SqlPersonalPracticeProblemStatus =
  | 'draft'
  | 'published'
  | 'archived';
export type SqlPracticeProblemSetStatus = 'draft' | 'published' | 'archived';

export const sqlPersonalPracticeWorkspacesTable = sqliteTable(
  'sql_personal_practice_workspaces',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    activeSchemaVersionId: text('active_schema_version_id'),
    learningGoal: text('learning_goal'),
    level: text('level'),
    topics: text('topics'),
    visibility: text('visibility').notNull().default('private'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlPersonalPracticeSchemaVersionsTable = sqliteTable(
  'sql_personal_practice_schema_versions',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlPersonalPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    schemaSql: text('schema_sql').notNull(),
    erdMmd: text('erd_mmd'),
    dbFileHash: text('db_file_hash').notNull(),
    sourceType: text('source_type')
      .$type<SqlPersonalPracticeSchemaSourceType>()
      .notNull()
      .default('seed'),
    sourceFileName: text('source_file_name'),
    replacedFromSchemaVersionId: text('replaced_from_schema_version_id'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
);

export const sqlPersonalPracticeProblemSetsTable = sqliteTable(
  'sql_personal_practice_problem_sets',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlPersonalPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    schemaVersionId: text('schema_version_id').references(
      () => sqlPersonalPracticeSchemaVersionsTable.id,
      {
        onDelete: 'set null',
      },
    ),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    level: integer('level'),
    status: text('status')
      .$type<SqlPracticeProblemSetStatus>()
      .notNull()
      .default('draft'),
    orderIdx: integer('order_idx').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlPersonalPracticeProblemsTable = sqliteTable(
  'sql_personal_practice_problems',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlPersonalPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    schemaVersionId: text('schema_version_id')
      .notNull()
      .references(() => sqlPersonalPracticeSchemaVersionsTable.id, {
        onDelete: 'restrict',
      }),
    problemSetId: text('problem_set_id').references(
      () => sqlPersonalPracticeProblemSetsTable.id,
      {
        onDelete: 'set null',
      },
    ),
    title: text('title').notNull(),
    description: text('description').notNull(),
    level: integer('level').notNull().default(1),
    orderIdx: integer('order_idx').notNull().default(0),
    targetTables: text('target_tables', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    starterSql: text('starter_sql'),
    answerSql: text('answer_sql').notNull(),
    explanation: text('explanation'),
    status: text('status')
      .$type<SqlPersonalPracticeProblemStatus>()
      .notNull()
      .default('published'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlPersonalPracticeSharesTable = sqliteTable(
  'sql_personal_practice_shares',
  {
    id: text('id').primaryKey(),
    problemId: text('problem_id')
      .notNull()
      .references(() => sqlPersonalPracticeProblemsTable.id, {
        onDelete: 'cascade',
      }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlPersonalPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    schemaVersionId: text('schema_version_id')
      .notNull()
      .references(() => sqlPersonalPracticeSchemaVersionsTable.id, {
        onDelete: 'restrict',
      }),
    token: text('token').notNull().unique(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    disabledAt: text('disabled_at'),
  },
);

export const sqlPersonalPracticeSubmissionsTable = sqliteTable(
  'sql_personal_practice_submissions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    problemId: text('problem_id')
      .notNull()
      .references(() => sqlPersonalPracticeProblemsTable.id, {
        onDelete: 'cascade',
      }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlPersonalPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    schemaVersionId: text('schema_version_id')
      .notNull()
      .references(() => sqlPersonalPracticeSchemaVersionsTable.id, {
        onDelete: 'restrict',
      }),
    shareId: text('share_id').references(
      () => sqlPersonalPracticeSharesTable.id,
      {
        onDelete: 'set null',
      },
    ),
    submittedSql: text('submitted_sql').notNull(),
    answerSql: text('answer_sql').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
    score: integer('score').notNull().default(0),
    maxScore: integer('max_score').notNull().default(1),
    feedback: text('feedback').notNull(),
    createdAt: text('created_at').notNull(),
  },
);

export type SqlTeamPracticeMemberRole = 'owner' | 'editor' | 'member';
export type SqlTeamPracticeSchemaSourceType =
  | 'seed'
  | 'uploaded_sql'
  | 'uploaded_sqlite';
export type SqlTeamPracticeProblemStatus = 'draft' | 'published' | 'archived';

export const sqlTeamPracticeWorkspacesTable = sqliteTable(
  'sql_team_practice_workspaces',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    activeSchemaVersionId: text('active_schema_version_id'),
    learningGoal: text('learning_goal'),
    level: text('level'),
    topics: text('topics'),
    visibility: text('visibility').notNull().default('private'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlTeamPracticeMembersTable = sqliteTable(
  'sql_team_practice_members',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlTeamPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: text('role')
      .$type<SqlTeamPracticeMemberRole>()
      .notNull()
      .default('member'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlTeamPracticeSchemaVersionsTable = sqliteTable(
  'sql_team_practice_schema_versions',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlTeamPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    schemaSql: text('schema_sql').notNull(),
    erdMmd: text('erd_mmd'),
    dbFileHash: text('db_file_hash').notNull(),
    sourceType: text('source_type')
      .$type<SqlTeamPracticeSchemaSourceType>()
      .notNull()
      .default('seed'),
    sourceFileName: text('source_file_name'),
    replacedFromSchemaVersionId: text('replaced_from_schema_version_id'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
);

export const sqlTeamPracticeProblemSetsTable = sqliteTable(
  'sql_team_practice_problem_sets',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlTeamPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    schemaVersionId: text('schema_version_id').references(
      () => sqlTeamPracticeSchemaVersionsTable.id,
      {
        onDelete: 'set null',
      },
    ),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    level: integer('level'),
    status: text('status')
      .$type<SqlPracticeProblemSetStatus>()
      .notNull()
      .default('draft'),
    orderIdx: integer('order_idx').notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlTeamPracticeProblemsTable = sqliteTable(
  'sql_team_practice_problems',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlTeamPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    schemaVersionId: text('schema_version_id')
      .notNull()
      .references(() => sqlTeamPracticeSchemaVersionsTable.id, {
        onDelete: 'restrict',
      }),
    problemSetId: text('problem_set_id').references(
      () => sqlTeamPracticeProblemSetsTable.id,
      {
        onDelete: 'set null',
      },
    ),
    title: text('title').notNull(),
    description: text('description').notNull(),
    level: integer('level').notNull().default(1),
    orderIdx: integer('order_idx').notNull().default(0),
    targetTables: text('target_tables', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    starterSql: text('starter_sql'),
    answerSql: text('answer_sql').notNull(),
    explanation: text('explanation'),
    status: text('status')
      .$type<SqlTeamPracticeProblemStatus>()
      .notNull()
      .default('published'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    updatedBy: text('updated_by').references(() => usersTable.id, {
      onDelete: 'cascade',
    }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const sqlTeamPracticeSubmissionsTable = sqliteTable(
  'sql_team_practice_submissions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    problemId: text('problem_id')
      .notNull()
      .references(() => sqlTeamPracticeProblemsTable.id, {
        onDelete: 'cascade',
      }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => sqlTeamPracticeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    schemaVersionId: text('schema_version_id')
      .notNull()
      .references(() => sqlTeamPracticeSchemaVersionsTable.id, {
        onDelete: 'restrict',
      }),
    submittedSql: text('submitted_sql').notNull(),
    answerSql: text('answer_sql').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
    score: integer('score').notNull().default(0),
    maxScore: integer('max_score').notNull().default(1),
    feedback: text('feedback').notNull(),
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
export type DevChallengeWorkspaceRole = 'owner' | 'editor' | 'member';

export const devChallengeWorkspacesTable = sqliteTable(
  'dev_challenge_workspaces',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    icon: text('icon').notNull().default('Trophy'),
    color: text('color'),
    orderIdx: integer('order_idx').notNull().default(0),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devChallengeWorkspaceMembersTable = sqliteTable(
  'dev_challenge_workspace_members',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => devChallengeWorkspacesTable.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: text('role')
      .$type<DevChallengeWorkspaceRole>()
      .notNull()
      .default('member'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devChallengeCategoriesTable = sqliteTable(
  'dev_challenge_categories',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => devChallengeWorkspacesTable.id, {
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
      onDelete: 'cascade',
    }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const devChallengeSubmissionCommentsTable = sqliteTable(
  'dev_challenge_submission_comments',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id')
      .notNull()
      .references(() => devChallengeSubmissionsTable.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
);

export const chatSessionsTable = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const chatMessagesTable = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessionsTable.id, { onDelete: 'cascade' }),
  role: text('role').$type<'user' | 'assistant'>().notNull(),
  content: text('content').notNull(),
  fileUrls: text('file_urls'),
  createdAt: text('created_at').notNull(),
});

export const schema = {
  usersTable,
  sessionsTable,
  studyDiariesTable,
  archNoteWorkspacesTable,
  archNoteCategoriesTable,
  archNoteSectionsTable,
  archNoteNotesTable,
  planningDesignWorkspacesTable,
  planningDesignCategoriesTable,
  planningDesignSectionsTable,
  planningDesignDocumentsTable,
  devHistoryWorkspacesTable,
  devHistoryCategoriesTable,
  devHistorySectionsTable,
  devHistoryDocumentsTable,
  ideaNoteWorkspacesTable,
  ideaNoteCategoriesTable,
  ideaNoteSectionsTable,
  ideaNoteDocumentsTable,
  discussionNotesTable,
  discussionNoteCommentsTable,
  projectDiscussionBoardsTable,
  projectDiscussionPostsTable,
  projectSchedulesTable,
  projectCodeReviewWorkspacesTable,
  projectCodeReviewCategoriesTable,
  projectCodeReviewSectionsTable,
  projectCodeReviewNotesTable,
  emailVerificationsTable,
  prototypeWorkspacesTable,
  prototypeWorkspaceMembersTable,
  categoriesTable,
  prototypesTable,
  prototypeReviewsTable,
  prototypeImagesTable,
  tutorialCategoriesTable,
  tutorialSectionsTable,
  tutorialLessonsTable,
  tutorialContentsTable,
  testPlaybookCategoriesTable,
  testPlaybookDocumentsTable,
  testPlaybookContentsTable,
  docSectionsTable,
  documentsTable,
  documentBlocksTable,
  menusTable,
  boardConfigsTable,
  boardsTable,
  boardCommentsTable,
  apiDocTeamsTable,
  apiDocCategoriesTable,
  apiDocEndpointsTable,
  apiDocBlocksTable,
  apiExcelProjectsTable,
  apiExcelCategoriesTable,
  apiExcelFilesTable,
  taskWorkspacesTable,
  taskWorkspaceMembersTable,
  tasksTable,
  taskChecklistsTable,
  taskCommentsTable,
  taskAttachmentsTable,
  taskReferencesTable,
  taskActivityLogsTable,
  taskAiReviewsTable,
  projectIssueCategoriesTable,
  projectIssuesTable,
  projectIssueChecklistsTable,
  projectIssueCommentsTable,
  projectIssueAttachmentsTable,
  projectIssueActivityLogsTable,
  teamDocNodesTable,
  meetingWorkspacesTable,
  meetingWorkspaceMembersTable,
  meetingRoomsTable,
  meetingMessagesTable,
  meetingDmPairsTable,
  meetingRoomReadsTable,
  devManagementRoomsTable,
  devManagementMessagesTable,
  devMeetingMinutesTable,
  codeReviewsTable,
  featurePlansTable,
  designTemplatesTable,
  designReferencesTable,
  commonComponentTemplatesTable,
  devManagementBotSettingsTable,
  devManagementDmPairsTable,
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
  sqlUserPracticeSchemasTable,
  sqlUserPracticeProblemsTable,
  sqlPersonalPracticeWorkspacesTable,
  sqlPersonalPracticeSchemaVersionsTable,
  sqlPersonalPracticeProblemSetsTable,
  sqlPersonalPracticeProblemsTable,
  sqlPersonalPracticeSharesTable,
  sqlPersonalPracticeSubmissionsTable,
  sqlTeamPracticeWorkspacesTable,
  sqlTeamPracticeMembersTable,
  sqlTeamPracticeSchemaVersionsTable,
  sqlTeamPracticeProblemSetsTable,
  sqlTeamPracticeProblemsTable,
  sqlTeamPracticeSubmissionsTable,
  devChallengeWorkspacesTable,
  devChallengeWorkspaceMembersTable,
  devChallengeCategoriesTable,
  devChallengeSectionsTable,
  devChallengeAssignmentsTable,
  devChallengeAssignmentBlocksTable,
  devChallengeSubmissionsTable,
  devChallengeSubmissionCommentsTable,
  chatSessionsTable,
  chatMessagesTable,
};

export type ChatSessionRow = typeof chatSessionsTable.$inferSelect;
export type ChatSessionInsert = typeof chatSessionsTable.$inferInsert;
export type ChatMessageRow = typeof chatMessagesTable.$inferSelect;
export type ChatMessageInsert = typeof chatMessagesTable.$inferInsert;

export type UserRow = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;
export type SessionRow = typeof sessionsTable.$inferSelect;
export type SessionInsert = typeof sessionsTable.$inferInsert;
export type StudyDiaryRow = typeof studyDiariesTable.$inferSelect;
export type StudyDiaryInsert = typeof studyDiariesTable.$inferInsert;
export type EmailVerificationRow = typeof emailVerificationsTable.$inferSelect;
export type EmailVerificationInsert =
  typeof emailVerificationsTable.$inferInsert;
export type PrototypeWorkspaceRow =
  typeof prototypeWorkspacesTable.$inferSelect;
export type PrototypeWorkspaceInsert =
  typeof prototypeWorkspacesTable.$inferInsert;
export type PrototypeWorkspaceMemberRow =
  typeof prototypeWorkspaceMembersTable.$inferSelect;
export type PrototypeWorkspaceMemberInsert =
  typeof prototypeWorkspaceMembersTable.$inferInsert;
export type CategoryRow = typeof categoriesTable.$inferSelect;
export type CategoryInsert = typeof categoriesTable.$inferInsert;
export type PrototypeRow = typeof prototypesTable.$inferSelect;
export type PrototypeInsert = typeof prototypesTable.$inferInsert;
export type PrototypeNoteTopicRow = typeof prototypeNoteTopicsTable.$inferSelect;
export type PrototypeNoteTopicInsert =
  typeof prototypeNoteTopicsTable.$inferInsert;
export type PrototypeNoteSectionRow =
  typeof prototypeNoteSectionsTable.$inferSelect;
export type PrototypeNoteSectionInsert =
  typeof prototypeNoteSectionsTable.$inferInsert;
export type PrototypeNoteEntryRow =
  typeof prototypeNoteEntriesTable.$inferSelect;
export type PrototypeNoteEntryInsert =
  typeof prototypeNoteEntriesTable.$inferInsert;
export type PrototypeImageRow = typeof prototypeImagesTable.$inferSelect;
export type PrototypeImageInsert = typeof prototypeImagesTable.$inferInsert;
export type TutorialCategoryRow = typeof tutorialCategoriesTable.$inferSelect;
export type TutorialCategoryInsert = typeof tutorialCategoriesTable.$inferInsert;
export type TutorialSectionRow = typeof tutorialSectionsTable.$inferSelect;
export type TutorialSectionInsert = typeof tutorialSectionsTable.$inferInsert;
export type TutorialLessonRow = typeof tutorialLessonsTable.$inferSelect;
export type TutorialLessonInsert = typeof tutorialLessonsTable.$inferInsert;
export type TutorialContentRow = typeof tutorialContentsTable.$inferSelect;
export type TutorialContentInsert = typeof tutorialContentsTable.$inferInsert;
export type TestPlaybookCategoryRow = typeof testPlaybookCategoriesTable.$inferSelect;
export type TestPlaybookCategoryInsert = typeof testPlaybookCategoriesTable.$inferInsert;
export type TestPlaybookDocumentRow = typeof testPlaybookDocumentsTable.$inferSelect;
export type TestPlaybookDocumentInsert = typeof testPlaybookDocumentsTable.$inferInsert;
export type TestPlaybookContentRow = typeof testPlaybookContentsTable.$inferSelect;
export type TestPlaybookContentInsert = typeof testPlaybookContentsTable.$inferInsert;
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
export type ApiDocTeamRow = typeof apiDocTeamsTable.$inferSelect;
export type ApiDocTeamInsert = typeof apiDocTeamsTable.$inferInsert;
export type ApiDocCategoryRow = typeof apiDocCategoriesTable.$inferSelect;
export type ApiDocCategoryInsert = typeof apiDocCategoriesTable.$inferInsert;
export type ApiDocEndpointRow = typeof apiDocEndpointsTable.$inferSelect;
export type ApiDocEndpointInsert = typeof apiDocEndpointsTable.$inferInsert;
export type ApiDocBlockRow = typeof apiDocBlocksTable.$inferSelect;
export type ApiDocBlockInsert = typeof apiDocBlocksTable.$inferInsert;
export type ApiExcelProjectRow = typeof apiExcelProjectsTable.$inferSelect;
export type ApiExcelProjectInsert = typeof apiExcelProjectsTable.$inferInsert;
export type ApiExcelCategoryRow = typeof apiExcelCategoriesTable.$inferSelect;
export type ApiExcelCategoryInsert = typeof apiExcelCategoriesTable.$inferInsert;
export type ApiExcelFileRow = typeof apiExcelFilesTable.$inferSelect;
export type ApiExcelFileInsert = typeof apiExcelFilesTable.$inferInsert;
export type TaskWorkspaceRow = typeof taskWorkspacesTable.$inferSelect;
export type TaskWorkspaceInsert = typeof taskWorkspacesTable.$inferInsert;
export type TaskWorkspaceMemberRow =
  typeof taskWorkspaceMembersTable.$inferSelect;
export type TaskWorkspaceMemberInsert =
  typeof taskWorkspaceMembersTable.$inferInsert;
export type TaskRow = typeof tasksTable.$inferSelect;
export type TaskInsert = typeof tasksTable.$inferInsert;
export type TaskChecklistRow = typeof taskChecklistsTable.$inferSelect;
export type TaskChecklistInsert = typeof taskChecklistsTable.$inferInsert;
export type TaskCommentRow = typeof taskCommentsTable.$inferSelect;
export type TaskCommentInsert = typeof taskCommentsTable.$inferInsert;
export type TaskAttachmentRow = typeof taskAttachmentsTable.$inferSelect;
export type TaskAttachmentInsert = typeof taskAttachmentsTable.$inferInsert;
export type TaskReferenceRow = typeof taskReferencesTable.$inferSelect;
export type TaskReferenceInsert = typeof taskReferencesTable.$inferInsert;
export type TaskActivityLogRow = typeof taskActivityLogsTable.$inferSelect;
export type TaskActivityLogInsert = typeof taskActivityLogsTable.$inferInsert;
export type TaskAiReviewRow = typeof taskAiReviewsTable.$inferSelect;
export type TaskAiReviewInsert = typeof taskAiReviewsTable.$inferInsert;
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
export type MeetingWorkspaceRow = typeof meetingWorkspacesTable.$inferSelect;
export type MeetingWorkspaceInsert = typeof meetingWorkspacesTable.$inferInsert;
export type MeetingWorkspaceMemberRow =
  typeof meetingWorkspaceMembersTable.$inferSelect;
export type MeetingWorkspaceMemberInsert =
  typeof meetingWorkspaceMembersTable.$inferInsert;
export type MeetingRoomRow = typeof meetingRoomsTable.$inferSelect;
export type MeetingRoomInsert = typeof meetingRoomsTable.$inferInsert;
export type MeetingMessageRow = typeof meetingMessagesTable.$inferSelect;
export type MeetingMessageInsert = typeof meetingMessagesTable.$inferInsert;
export type MeetingDmPairRow = typeof meetingDmPairsTable.$inferSelect;
export type MeetingDmPairInsert = typeof meetingDmPairsTable.$inferInsert;
export type MeetingRoomReadRow = typeof meetingRoomReadsTable.$inferSelect;
export type MeetingRoomReadInsert = typeof meetingRoomReadsTable.$inferInsert;
export type DevManagementRoomRow = typeof devManagementRoomsTable.$inferSelect;
export type DevManagementRoomInsert =
  typeof devManagementRoomsTable.$inferInsert;
export type DevManagementMessageRow =
  typeof devManagementMessagesTable.$inferSelect;
export type DevManagementMessageInsert =
  typeof devManagementMessagesTable.$inferInsert;
export type DevMeetingMinutesRow = typeof devMeetingMinutesTable.$inferSelect;
export type DevMeetingMinutesInsert =
  typeof devMeetingMinutesTable.$inferInsert;
export type CodeReviewRow = typeof codeReviewsTable.$inferSelect;
export type CodeReviewInsert = typeof codeReviewsTable.$inferInsert;
export type FeaturePlanRow = typeof featurePlansTable.$inferSelect;
export type FeaturePlanInsert = typeof featurePlansTable.$inferInsert;
export type DesignTemplateRow = typeof designTemplatesTable.$inferSelect;
export type DesignTemplateInsert = typeof designTemplatesTable.$inferInsert;
export type DesignReferenceRow = typeof designReferencesTable.$inferSelect;
export type DesignReferenceInsert = typeof designReferencesTable.$inferInsert;
export type CommonComponentTemplateRow = typeof commonComponentTemplatesTable.$inferSelect;
export type CommonComponentTemplateInsert = typeof commonComponentTemplatesTable.$inferInsert;
export type DevManagementBotSettingsRow =
  typeof devManagementBotSettingsTable.$inferSelect;
export type DevManagementBotSettingsInsert =
  typeof devManagementBotSettingsTable.$inferInsert;
export type DevManagementDmPairRow =
  typeof devManagementDmPairsTable.$inferSelect;
export type DevManagementDmPairInsert =
  typeof devManagementDmPairsTable.$inferInsert;
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
export type SqlUserPracticeSchemaRow =
  typeof sqlUserPracticeSchemasTable.$inferSelect;
export type SqlUserPracticeSchemaInsert =
  typeof sqlUserPracticeSchemasTable.$inferInsert;
export type SqlUserPracticeProblemRow =
  typeof sqlUserPracticeProblemsTable.$inferSelect;
export type SqlUserPracticeProblemInsert =
  typeof sqlUserPracticeProblemsTable.$inferInsert;
export type SqlPersonalPracticeWorkspaceRow =
  typeof sqlPersonalPracticeWorkspacesTable.$inferSelect;
export type SqlPersonalPracticeWorkspaceInsert =
  typeof sqlPersonalPracticeWorkspacesTable.$inferInsert;
export type SqlPersonalPracticeSchemaVersionRow =
  typeof sqlPersonalPracticeSchemaVersionsTable.$inferSelect;
export type SqlPersonalPracticeSchemaVersionInsert =
  typeof sqlPersonalPracticeSchemaVersionsTable.$inferInsert;
export type SqlPersonalPracticeProblemSetRow =
  typeof sqlPersonalPracticeProblemSetsTable.$inferSelect;
export type SqlPersonalPracticeProblemSetInsert =
  typeof sqlPersonalPracticeProblemSetsTable.$inferInsert;
export type SqlPersonalPracticeProblemRow =
  typeof sqlPersonalPracticeProblemsTable.$inferSelect;
export type SqlPersonalPracticeProblemInsert =
  typeof sqlPersonalPracticeProblemsTable.$inferInsert;
export type SqlPersonalPracticeShareRow =
  typeof sqlPersonalPracticeSharesTable.$inferSelect;
export type SqlPersonalPracticeShareInsert =
  typeof sqlPersonalPracticeSharesTable.$inferInsert;
export type SqlPersonalPracticeSubmissionRow =
  typeof sqlPersonalPracticeSubmissionsTable.$inferSelect;
export type SqlPersonalPracticeSubmissionInsert =
  typeof sqlPersonalPracticeSubmissionsTable.$inferInsert;
export type SqlTeamPracticeWorkspaceRow =
  typeof sqlTeamPracticeWorkspacesTable.$inferSelect;
export type SqlTeamPracticeWorkspaceInsert =
  typeof sqlTeamPracticeWorkspacesTable.$inferInsert;
export type SqlTeamPracticeMemberRow =
  typeof sqlTeamPracticeMembersTable.$inferSelect;
export type SqlTeamPracticeMemberInsert =
  typeof sqlTeamPracticeMembersTable.$inferInsert;
export type SqlTeamPracticeSchemaVersionRow =
  typeof sqlTeamPracticeSchemaVersionsTable.$inferSelect;
export type SqlTeamPracticeSchemaVersionInsert =
  typeof sqlTeamPracticeSchemaVersionsTable.$inferInsert;
export type SqlTeamPracticeProblemSetRow =
  typeof sqlTeamPracticeProblemSetsTable.$inferSelect;
export type SqlTeamPracticeProblemSetInsert =
  typeof sqlTeamPracticeProblemSetsTable.$inferInsert;
export type SqlTeamPracticeProblemRow =
  typeof sqlTeamPracticeProblemsTable.$inferSelect;
export type SqlTeamPracticeProblemInsert =
  typeof sqlTeamPracticeProblemsTable.$inferInsert;
export type SqlTeamPracticeSubmissionRow =
  typeof sqlTeamPracticeSubmissionsTable.$inferSelect;
export type SqlTeamPracticeSubmissionInsert =
  typeof sqlTeamPracticeSubmissionsTable.$inferInsert;
export type DevChallengeCategoryRow =
  typeof devChallengeCategoriesTable.$inferSelect;
export type DevChallengeCategoryInsert =
  typeof devChallengeCategoriesTable.$inferInsert;
export type DevChallengeWorkspaceRow =
  typeof devChallengeWorkspacesTable.$inferSelect;
export type DevChallengeWorkspaceInsert =
  typeof devChallengeWorkspacesTable.$inferInsert;
export type DevChallengeWorkspaceMemberRow =
  typeof devChallengeWorkspaceMembersTable.$inferSelect;
export type DevChallengeWorkspaceMemberInsert =
  typeof devChallengeWorkspaceMembersTable.$inferInsert;
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
export type DevChallengeSubmissionCommentRow =
  typeof devChallengeSubmissionCommentsTable.$inferSelect;
export type DevChallengeSubmissionCommentInsert =
  typeof devChallengeSubmissionCommentsTable.$inferInsert;

// ─── AI 사용량 로그 ───────────────────────────────────────────────────────────

export const usageLogsTable = sqliteTable('usage_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),
  sessionId: text('session_id').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  estimatedCostUsd: real('estimated_cost_usd').notNull().default(0),
  isError: integer('is_error').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export type UsageLogRow = typeof usageLogsTable.$inferSelect;
export type UsageLogInsert = typeof usageLogsTable.$inferInsert;

// ─── AI 서비스 신청 ───────────────────────────────────────────────────────────

export const aiServiceRequestsTable = sqliteTable('ai_service_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),
  serviceType: text('service_type').notNull(),
  purpose: text('purpose').notNull(),
  estimatedUsage: text('estimated_usage').notNull(),
  securityLevel: text('security_level').notNull(),
  status: text('status').notNull().default('pending'),
  // pending | manager_approved | admin_approved | active | rejected | revision_requested
  rejectReason: text('reject_reason'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type AiServiceRequestRow = typeof aiServiceRequestsTable.$inferSelect;
export type AiServiceRequestInsert = typeof aiServiceRequestsTable.$inferInsert;

// ── 방문자 이용 통계 (page_view 단일 이벤트) ──────────────────────────────────
export const pageViewsTable = sqliteTable('page_views', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  visitorId: text('visitor_id').notNull(),
  sessionId: text('session_id').notNull(),
  path: text('path').notNull(),
  referrer: text('referrer'),
  createdAt: text('created_at').notNull(),
});

export type PageViewRow = typeof pageViewsTable.$inferSelect;
export type PageViewInsert = typeof pageViewsTable.$inferInsert;

// ── 포인트 지갑 (현금 충전 → 내부 포인트) ──────────────────────────────────
export const pointAccountsTable = sqliteTable('point_accounts', {
  userId: text('user_id')
    .primaryKey()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const pointTransactionsTable = sqliteTable('point_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // topup | spend | refund | adjust
  amount: integer('amount').notNull(), // 부호 있는 변화량 (+충전 / -차감)
  balanceAfter: integer('balance_after').notNull(),
  refType: text('ref_type'), // topup | market_item | ...
  refId: text('ref_id'),
  memo: text('memo'),
  createdAt: text('created_at').notNull(),
});

export const pointTopupsTable = sqliteTable('point_topups', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  amountKrw: integer('amount_krw').notNull(),
  points: integer('points').notNull(),
  status: text('status').notNull().default('paid'), // pending | paid | failed
  provider: text('provider').notNull().default('mock'),
  providerTxId: text('provider_tx_id'),
  createdAt: text('created_at').notNull(),
  paidAt: text('paid_at'),
});

export type PointAccountRow = typeof pointAccountsTable.$inferSelect;
export type PointTransactionRow = typeof pointTransactionsTable.$inferSelect;
export type PointTopupRow = typeof pointTopupsTable.$inferSelect;

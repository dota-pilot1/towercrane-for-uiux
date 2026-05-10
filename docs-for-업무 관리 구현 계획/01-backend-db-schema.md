# 01. 백엔드 DB 스키마 계획

## 대상 파일

새로 만들거나 수정할 파일은 다음과 같다.

| 작업 | 파일 |
|---|---|
| Drizzle 테이블 타입 추가 | `towercrane-for-uiux-server/src/database/schema.ts` |
| 런타임 테이블 생성 SQL 추가 | `towercrane-for-uiux-server/src/database/database.service.ts` |
| 필요 시 Drizzle migration 생성 | `towercrane-for-uiux-server/drizzle/*` |

현재 towercrane는 Drizzle schema와 `database.service.ts`의 `CREATE TABLE IF NOT EXISTS`가 같이 존재한다. 업무 관리 테이블도 두 파일을 반드시 같이 맞춘다.

## 테이블 설계 원칙

- 팔란티어의 `works`를 towercrane에서는 `tasks`로 구현한다.
- ID는 towercrane 기존 테이블처럼 `TEXT` + `randomUUID()`를 사용한다.
- 날짜는 기존 방식과 맞춰 ISO 문자열 `TEXT`로 저장한다.
- boolean은 SQLite에서 `INTEGER` + Drizzle `{ mode: 'boolean' }`로 저장한다.
- 1차 구현은 협업용 공유 업무 목록으로 둔다. 모든 로그인 사용자가 목록을 볼 수 있고, 작성자/담당자/관리자 권한은 서비스 계층에서 제어한다.

## 1. `tasks` 테이블

팔란티어 `works`의 보편 필드를 가져오고 특화 필드를 줄인다.

```ts
export type TaskType =
  | 'FEATURE'
  | 'BUG'
  | 'DOCS'
  | 'DESIGN'
  | 'REFACTOR'
  | 'QA'
  | 'CHORE';

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE'
  | 'HOLD';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
```

```ts
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
```

### 팔란티어 필드 매핑

| 팔란티어 `Work` | towercrane `Task` | 처리 |
|---|---|---|
| `id` | `id` | number에서 uuid text로 변경 |
| `title` | `title` | 유지 |
| `content` | `content` | 유지 |
| `workType` | `taskType` | 일반 업무 유형으로 변경 |
| `status` | `status` | `TEST/BLOCKED`는 1차에서 `REVIEW/HOLD`로 단순화 |
| `priority` | `priority` | `CRITICAL` 대신 `URGENT` |
| `reporterId` | `reporterId` | 현재 로그인 사용자 |
| `assigneeId` | `assigneeId` | nullable |
| `dueDate` | `dueDate` | ISO text |
| `orderNum` | `orderIdx` | towercrane 네이밍 |
| `isArchived` | `archived` | boolean |
| `prize` | 제외 | 특화 기능 |
| `organizationId` | 제외 | towercrane에 조직 도메인 없음 |

## 2. `task_checklists` 테이블

팔란티어 `work_checklists`에서 이미지 필드를 제외하고 단순 체크리스트로 구성한다.

```ts
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
```

## 3. `task_comments` 테이블

팔란티어 `work_messages`를 업무 댓글로 단순화한다.

```ts
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
```

## 4. `task_activity_logs` 테이블

상태, 담당자, 우선순위 변경 이력을 남긴다. 팔란티어의 `WorkStatusLog` 역할을 일반화한 것이다.

```ts
export type TaskActivityType =
  | 'CREATED'
  | 'STATUS'
  | 'ASSIGNEE'
  | 'PRIORITY'
  | 'UPDATED'
  | 'ARCHIVED'
  | 'RESTORED';

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
```

1차 구현에서 시간이 부족하면 활동 로그 UI는 숨겨도 되지만, 상태 변경 기록은 나중에 붙이기 어려우므로 테이블과 서비스 기록 함수는 먼저 만든다.

## `schema` export 추가

`schema.ts` 하단 `schema` 객체와 type export에 다음을 추가한다.

```ts
export const schema = {
  // existing
  tasksTable,
  taskChecklistsTable,
  taskCommentsTable,
  taskActivityLogsTable,
};

export type TaskRow = typeof tasksTable.$inferSelect;
export type TaskInsert = typeof tasksTable.$inferInsert;
export type TaskChecklistRow = typeof taskChecklistsTable.$inferSelect;
export type TaskCommentRow = typeof taskCommentsTable.$inferSelect;
export type TaskActivityLogRow = typeof taskActivityLogsTable.$inferSelect;
```

## `database.service.ts` DDL 추가

`onModuleInit()`의 `this.sqlite.exec` 블록에 다음 테이블 생성을 추가한다.

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'FEATURE',
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  reporter_id TEXT NOT NULL,
  assignee_id TEXT,
  due_date TEXT,
  order_idx INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_order
  ON tasks(status, order_idx);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
  ON tasks(assignee_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_archived_updated
  ON tasks(archived, updated_at);

CREATE TABLE IF NOT EXISTS task_checklists (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  content TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task_order
  ON task_checklists(task_id, order_idx);

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
  ON task_comments(task_id, created_at);

CREATE TABLE IF NOT EXISTS task_activity_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  actor_id TEXT,
  activity_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_created
  ON task_activity_logs(task_id, created_at);
```

## 기존 DB 마이그레이션 고려

신규 테이블만 추가하므로 `migrateLegacySchema()`에 `ensureColumn`은 필수는 아니다. 다만 배포 후 컬럼을 추가하는 상황을 대비해 아래 원칙을 따른다.

- 테이블 자체는 `CREATE TABLE IF NOT EXISTS`로 생성한다.
- 신규 컬럼 추가가 생기면 `migrateLegacySchema()`에 `ensureColumn('tasks', ...)`를 추가한다.
- 기존 데이터가 있는 로컬/운영 DB에서 테이블 생성은 앱 시작 시 자동 수행된다.

## 메뉴 seed 보강

이미 화면에는 업무 관리 메뉴가 보이지만, 빈 DB에서 사라질 수 있다. `seedDefaults()`의 초기 메뉴에 다음 항목을 추가하거나 메뉴 관리 페이지에서 등록한다.

```ts
{
  id: randomUUID(),
  name: '업무 관리',
  sectionId: 'task',
  icon: 'CheckSquare',
  displayOrder: 4,
  isVisible: true,
  requiredRole: null,
  parentId: null,
  createdAt: now,
  updatedAt: now,
}
```

`Admin` 메뉴의 `displayOrder`는 한 칸 뒤로 조정한다.

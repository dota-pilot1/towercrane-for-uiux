# 01. 데이터베이스 스키마 (Drizzle + SQLite)

> 마포-팔란티어의 4개 테이블(`challenge_categories`, `challenge_sections`, `challenge_topics`, `challenge_submissions`)을 그대로 모티브로 가져오되, **GPT 대화 로그 + 유저 노트 + 공유 토글** 3개 테이블을 추가한다.

수정 대상 파일:
- `towercrane-for-uiux-server/src/database/schema.ts` — Drizzle 테이블 정의
- `towercrane-for-uiux-server/src/database/database.service.ts` — `CREATE TABLE IF NOT EXISTS`, 마이그레이션 보조, 시드

---

## 1. 테이블 목록 (총 7개)

| 테이블 | 역할 | 비고 |
|---|---|---|
| `challenge_categories` | "스프링 부트", "리액트" 같은 카테고리 | 어드민 전용 작성 |
| `challenge_sections` | 카테고리 내 회차 (1회차, 2회차 …) | 어드민 전용 |
| `challenge_topics` | 섹션 안의 주제 블록 (NOTE/MMD/CHECKLIST/...) | JSON content |
| `challenge_submissions` | 사용자의 풀이 제출 | GitHub URL + 체크리스트 결과 + 자동 점수 |
| `challenge_gpt_threads` | **(신규)** 섹션별 GPT 대화 스레드 | 사용자별 1개 이상 |
| `challenge_gpt_messages` | **(신규)** 스레드 내부 메시지 (user/assistant/system) | role/content/tokens |
| `challenge_user_notes` | **(신규)** 사용자 개인 노트 + 공개 토글 | section 또는 topic 단위 |

---

## 2. Drizzle 정의 (스니펫)

`schema.ts` 마지막에 아래 블록을 추가한다. 컨벤션은 기존 `tasks`/`api_doc_*` 와 동일하게 맞춘다(snake_case 컬럼 + camelCase TS).

```ts
// ─────────────── Challenge: 카테고리 ───────────────
export const challengeCategoriesTable = sqliteTable('challenge_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),                      // Lucide 이름 (선택)
  emoji: text('emoji'),                    // 이모지 prefix (선택)
  description: text('description'),
  orderIdx: integer('order_idx').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdBy: text('created_by').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─────────────── Challenge: 섹션(회차) ───────────────
export const challengeSectionsTable = sqliteTable('challenge_sections', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull()
    .references(() => challengeCategoriesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  orderIdx: integer('order_idx').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─────────────── Challenge: 주제 블록 ───────────────
// 마포의 challenge_topics 와 동일 의도. blockType 별로 content(JSON)를 다르게 해석한다.
export const challengeTopicsTable = sqliteTable('challenge_topics', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  blockType: text('block_type').notNull(),  // 'NOTE' | 'MMD' | 'CHECKLIST' | 'GITHUB' | 'FIGMA' | 'FILE' | 'DBTABLE'
  blockTitle: text('block_title'),
  content: text('content').notNull(),       // JSON 직렬화
  orderIdx: integer('order_idx').notNull().default(0),
  updatedBy: text('updated_by').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─────────────── Challenge: 풀이 제출 ───────────────
export const challengeSubmissionsTable = sqliteTable('challenge_submissions', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),     // snapshot (이름 변경되어도 유지)
  githubUrl: text('github_url'),
  content: text('content').notNull().default(''),
  checklistResult: text('checklist_result').notNull().default('[]'),  // JSON
  score: integer('score').notNull().default(0),                       // 자동 채점
  rating: integer('rating'),                                          // 어드민 평가 (1~5)
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─────────────── Challenge: GPT 스레드 ───────────────
export const challengeGptThreadsTable = sqliteTable('challenge_gpt_threads', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('새 대화'),
  model: text('model').notNull().default('gpt-4o-mini'),
  isShared: integer('is_shared', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─────────────── Challenge: GPT 메시지 ───────────────
export const challengeGptMessagesTable = sqliteTable('challenge_gpt_messages', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull()
    .references(() => challengeGptThreadsTable.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),         // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  createdAt: text('created_at').notNull(),
})

// ─────────────── Challenge: 유저 개인 노트 ───────────────
export const challengeUserNotesTable = sqliteTable('challenge_user_notes', {
  id: text('id').primaryKey(),
  // section 또는 topic 단위로 노트를 매다는데, 둘 중 하나는 반드시 채워진다.
  sectionId: text('section_id').references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  topicId: text('topic_id').references(() => challengeTopicsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  content: text('content').notNull().default(''),    // Lexical 직렬화 또는 markdown
  visibility: text('visibility').notNull().default('private'),  // 'private' | 'shared' | 'public'
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// 타입 export (다른 모듈/테스트에서 재사용)
export type ChallengeCategoryRow = typeof challengeCategoriesTable.$inferSelect
export type ChallengeSectionRow  = typeof challengeSectionsTable.$inferSelect
export type ChallengeTopicRow    = typeof challengeTopicsTable.$inferSelect
export type ChallengeSubmissionRow = typeof challengeSubmissionsTable.$inferSelect
export type ChallengeGptThreadRow  = typeof challengeGptThreadsTable.$inferSelect
export type ChallengeGptMessageRow = typeof challengeGptMessagesTable.$inferSelect
export type ChallengeUserNoteRow   = typeof challengeUserNotesTable.$inferSelect
```

> `schema` export 객체에도 위 테이블들을 모두 추가해야 Drizzle 인스턴스가 인식한다.

---

## 3. `database.service.ts` 의 raw `CREATE TABLE`

기존 `onModuleInit` 의 `this.sqlite.exec(\`CREATE TABLE IF NOT EXISTS …\`)` 블록 뒤에 다음을 **append** 한다 (기존 컨벤션과 동일하게 raw SQL로 명시):

```sql
CREATE TABLE IF NOT EXISTS challenge_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  emoji TEXT,
  description TEXT,
  order_idx INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_challenge_categories_order ON challenge_categories(order_idx);

CREATE TABLE IF NOT EXISTS challenge_sections (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  order_idx INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES challenge_categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_challenge_sections_cat_order ON challenge_sections(category_id, order_idx);

CREATE TABLE IF NOT EXISTS challenge_topics (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  block_type TEXT NOT NULL,
  block_title TEXT,
  content TEXT NOT NULL,
  order_idx INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE,
  FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_challenge_topics_section_order ON challenge_topics(section_id, order_idx);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  github_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  checklist_result TEXT NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  rating INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_section_user
  ON challenge_submissions(section_id, user_id);

CREATE TABLE IF NOT EXISTS challenge_gpt_threads (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '새 대화',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  is_shared INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_challenge_gpt_threads_section_user
  ON challenge_gpt_threads(section_id, user_id);

CREATE TABLE IF NOT EXISTS challenge_gpt_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES challenge_gpt_threads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_challenge_gpt_messages_thread_created
  ON challenge_gpt_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS challenge_user_notes (
  id TEXT PRIMARY KEY,
  section_id TEXT,
  topic_id TEXT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE,
  FOREIGN KEY(topic_id) REFERENCES challenge_topics(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (section_id IS NOT NULL OR topic_id IS NOT NULL),
  CHECK (visibility IN ('private', 'shared', 'public'))
);
CREATE INDEX IF NOT EXISTS idx_challenge_user_notes_user_visibility
  ON challenge_user_notes(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_challenge_user_notes_topic
  ON challenge_user_notes(topic_id);
```

---

## 4. `migrateLegacySchema()` 보강 (안전망)

기존 DB가 있는 경우에도 깨지지 않도록, `database.service.ts` 의 `migrateLegacySchema()` 에 **컬럼 누락 대비** 호출들을 추가한다.

```ts
// 예시: rating 컬럼이 나중에 추가되었다면
this.ensureColumn(
  'challenge_submissions',
  'rating',
  'ALTER TABLE challenge_submissions ADD COLUMN rating INTEGER',
)
```

> 처음 도입 시에는 `CREATE TABLE IF NOT EXISTS` 로 충분하지만, 이후 컬럼 추가가 생기면 반드시 `ensureColumn` 으로 처리. 데이터 손실 금지.

---

## 5. 시드 데이터 (M2 단계)

`seedDefaults()` 안에 "challenge_categories 가 비어있을 때만" 1~2개 카테고리와 1개 섹션을 시드한다.

```ts
const existingCats = this.sqlite
  .prepare('SELECT COUNT(*) as count FROM challenge_categories')
  .get() as { count: number }

if (existingCats.count === 0) {
  const springId = randomUUID()
  this.db.insert(challengeCategoriesTable).values({
    id: springId,
    name: '스프링 부트',
    icon: 'Server',
    emoji: '🌱',
    description: 'Spring Boot 기본기 셀프 챌린지',
    orderIdx: 0,
    isActive: true,
    createdBy: demoUser.id,
    createdAt: now,
    updatedAt: now,
  }).run()

  this.db.insert(challengeSectionsTable).values({
    id: randomUUID(),
    categoryId: springId,
    title: '1회차 — Hello Spring',
    summary: '프로젝트 생성, 첫 컨트롤러, REST 응답',
    orderIdx: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).run()
}
```

> ⚠️ **주의**: 시드는 새 DB에서만 실행되어야 한다. `existing.count === 0` 체크 빼먹지 말 것 (기존 사용자가 만든 카테고리를 덮어쓰지 않게).

---

## 6. 권한 / 무결성 정책 요약

| 테이블 | 작성 권한 | 수정 권한 | 삭제 권한 |
|---|---|---|---|
| `challenge_categories` | admin | admin | admin |
| `challenge_sections` | admin | admin | admin (cascade로 topics/submissions 삭제됨) |
| `challenge_topics` | admin | admin | admin |
| `challenge_submissions` | 본인 | 본인 | 본인 또는 admin |
| `challenge_gpt_threads` | 본인 | 본인 (제목/공유) | 본인 |
| `challenge_gpt_messages` | 시스템 (서비스가 GPT 호출 후 저장) | 불가 | 본인 (스레드 단위) |
| `challenge_user_notes` | 본인 | 본인 | 본인 |

---

## 7. 점검 체크리스트

- [ ] `schema.ts` 에 7개 테이블 + 7개 type export 추가
- [ ] `database` 객체 export 에 새 테이블 등록
- [ ] `database.service.ts` 의 `CREATE TABLE` 블록에 7개 추가
- [ ] `migrateLegacySchema()` 에 placeholder 주석 (당분간 비어있음 OK)
- [ ] `seedDefaults()` 에 카테고리/섹션 1개씩 (idempotent 체크 포함)
- [ ] 로컬에서 DB 파일 삭제 → 재기동 → 7개 테이블 모두 생성됨 확인 (`sqlite3 ... ".schema challenge_*"`)
- [ ] 시드 카테고리 1개 보임 (`SELECT * FROM challenge_categories;`)

---

## 8. 다음 단계

- → `02-backend-module.md` (NestJS challenge 모듈, 컨트롤러/서비스/Zod 스키마)

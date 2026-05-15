# 01. 데이터베이스 스키마 (Drizzle + SQLite)

> **Study Diary** 는 3단계 계층형 학습 관리 시스템이다. 필요한 핵심 테이블은 **categories(1차 주제), sections(2차 주제), user_notes(3차 본문)** 3개이며, 추가로 submissions(풀이) 및 gpt_threads(AI 대화 로그)를 선택사항으로 지원한다.

수정 대상 파일:
- `towercrane-for-uiux-server/src/database/schema.ts` — Drizzle 테이블 정의
- `towercrane-for-uiux-server/src/database/database.service.ts` — `CREATE TABLE IF NOT EXISTS`, 마이그레이션, 시드

---

## 1. 테이블 목록

### ✅ 현재 구현됨 (M4)

| 테이블 | 역할 | 상태 |
|---|---|---|
| `challenge_categories` | 1차 주제 (예: "Spring Boot", "React") | ✅ 완료 + 추가 기능 |
| `challenge_sections` | 2차 주제 (예: "1회차", "2회차") | ✅ 완료 + 추가 기능 |
| `challenge_user_notes` | 3차 본문 — 사용자 학습 노트 | ✅ 완료 |

### 🔄 선택사항 (M7~M8)

| 테이블 | 역할 | 예상 추가 시점 |
|---|---|---|
| `challenge_topics` | 섹션 내 블록형 콘텐츠 (선택) | M5+ |
| `challenge_submissions` | 풀이 제출 (선택) | M7+ |
| `challenge_gpt_threads` | GPT 대화 스레드 (선택) | M8+ |
| `challenge_gpt_messages` | GPT 대화 메시지 (선택) | M8+ |

---

## 2. Drizzle 정의

`schema.ts` 마지막에 아래 블록을 추가한다. 컨벤션은 기존 `tasks`/`api_doc_*` 와 동일하게 맞춘다(snake_case 컬럼 + camelCase TS).

### ✅ challenge_categories (1차 주제)

```ts
export const challengeCategoriesTable = sqliteTable('challenge_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  emoji: text('emoji'),
  description: text('description'),
  orderIdx: integer('order_idx').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdBy: text('created_by').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

**사용**: 좌측 첫 번째 사이드바에서 표시. 어드민만 추가/편집 가능.

---

### ✅ challenge_sections (2차 주제)

```ts
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
```

**사용**: 중앙 두 번째 사이드바에서 표시. `categoryId`로 필터링. 어드민만 추가/편집 가능.

---

### ✅ challenge_user_notes (3차 본문)

```ts
export const challengeUserNotesTable = sqliteTable('challenge_user_notes', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  content: text('content').notNull().default(''),
  visibility: text('visibility').notNull().default('private'),  // 'private' | 'shared'
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

**사용**: 
- 우측 콘텐츠 영역에서 표시
- `sectionId`로 필터링  
- 본인(userId)만 작성/수정/삭제 가능
- `visibility` 로 공개 여부 제어

---

### 🔄 challenge_topics (선택, M5+)

```ts
export const challengeTopicsTable = sqliteTable('challenge_topics', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  blockType: text('block_type').notNull(),  // 'NOTE' | 'MMD' | 'CHECKLIST' | ...
  blockTitle: text('block_title'),
  content: text('content').notNull(),
  orderIdx: integer('order_idx').notNull().default(0),
  updatedBy: text('updated_by').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

**향후 용도**: 섹션 내에 구조화된 학습 자료(블록형) 추가. 현재는 미사용.

---

### 🔄 challenge_submissions (선택, M7+)

```ts
export const challengeSubmissionsTable = sqliteTable('challenge_submissions', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull().default(''),
  score: integer('score').notNull().default(0),
  feedback: text('feedback'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

**향후 용도**: 각 섹션에 풀이 제출 기능 추가. 현재는 미사용.

---

### 🔄 challenge_gpt_threads / challenge_gpt_messages (선택, M8+)

```ts
export const challengeGptThreadsTable = sqliteTable('challenge_gpt_threads', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull()
    .references(() => challengeSectionsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('새 대화'),
  model: text('model').notNull().default('gpt-4o-mini'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const challengeGptMessagesTable = sqliteTable('challenge_gpt_messages', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull()
    .references(() => challengeGptThreadsTable.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),  // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
})
```

**향후 용도**: 섹션별로 GPT와 학습 대화. 현재는 미사용.

---

## 3. `database.service.ts` 의 CREATE TABLE

`onModuleInit` 에서 `this.sqlite.exec(...)` 로 아래를 실행:

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
CREATE INDEX IF NOT EXISTS idx_challenge_sections_category_order ON challenge_sections(category_id, order_idx);

CREATE TABLE IF NOT EXISTS challenge_user_notes (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (visibility IN ('private', 'shared'))
);
CREATE INDEX IF NOT EXISTS idx_challenge_user_notes_section ON challenge_user_notes(section_id);
CREATE INDEX IF NOT EXISTS idx_challenge_user_notes_user ON challenge_user_notes(user_id);

-- 🔄 선택사항 (미래 추가)
-- challenge_topics, challenge_submissions, challenge_gpt_* 는 필요시 추가
```

---

## 4. 시드 데이터

`seedDefaults()` 에서 "challenge_categories 가 비어있을 때만" 실행:

```ts
const existingCats = this.sqlite
  .prepare('SELECT COUNT(*) as count FROM challenge_categories')
  .get() as { count: number }

if (existingCats.count === 0) {
  const now = new Date().toISOString()
  
  // 1차 주제: Spring Boot
  const springId = randomUUID()
  this.db.insert(challengeCategoriesTable).values({
    id: springId,
    name: 'Spring Boot',
    icon: 'Server',
    emoji: '🌱',
    description: '스프링 부트 학습 다이어리',
    orderIdx: 0,
    isActive: true,
    createdBy: demoUser.id,
    createdAt: now,
    updatedAt: now,
  }).run()

  // 2차 주제 3개: 1회차, 2회차, 3회차
  for (let i = 0; i < 3; i++) {
    this.db.insert(challengeSectionsTable).values({
      id: randomUUID(),
      categoryId: springId,
      title: `${i + 1}회차`,
      summary: `Spring Boot 학습 ${i + 1}번째 섹션`,
      orderIdx: i,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).run()
  }
}
```

> ⚠️ **중요**: 시드는 **기존 데이터가 없을 때만** 실행되어야 한다. `count === 0` 체크 빼먹지 말 것.

---

## 5. 권한 정책

| 테이블 | 생성 | 수정 | 삭제 |
|---|---|---|---|
| `challenge_categories` | admin | admin | admin |
| `challenge_sections` | admin | admin | admin |
| `challenge_user_notes` | 본인 | 본인 | 본인 |
| `challenge_topics` | admin | admin | admin (선택) |
| `challenge_submissions` | 본인 | 본인 | 본인 (선택) |
| `challenge_gpt_threads` | 본인 | 본인 | 본인 (선택) |

---

## 6. 현재 상태 (2026-05-11)

✅ **구현됨**:
- `challenge_categories` — 생성/조회/삭제 API
- `challenge_sections` — 생성/조회/삭제 API
- `challenge_user_notes` — 생성/조회/수정/삭제 API
- DB 테이블 자동 생성
- 시드 데이터 (Spring Boot + 3개 섹션)

🔄 **향후**:
- `challenge_topics` (선택사항)
- `challenge_submissions` (선택사항)
- `challenge_gpt_*` (선택사항)

---

## 7. 점검 체크리스트

- [ ] `schema.ts` 에 필수 3개 테이블 정의
- [ ] 선택 테이블들을 주석으로 정의 (향후 활성화용)
- [ ] `database.service.ts` 의 `CREATE TABLE` 블록 확인
- [ ] `seedDefaults()` 의 카테고리/섹션 생성 로직 확인
- [ ] 로컬에서 DB 재초기화 → 테이블 생성 확인
- [ ] 시드 데이터 확인 (`SELECT * FROM challenge_categories`)

---

## 다음 단계

→ `02-backend-module.md` (NestJS challenge 모듈 API)

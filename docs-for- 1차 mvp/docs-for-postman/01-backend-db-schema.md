# 01. 백엔드 DB 스키마 계획

## 대상 파일

| 작업 | 파일 |
|---|---|
| Drizzle 테이블 타입 추가 | `towercrane-for-uiux-server/src/database/schema.ts` |
| 런타임 테이블 생성 SQL 추가 | `towercrane-for-uiux-server/src/database/database.service.ts` |
| 초기 메뉴 seed 추가 | `towercrane-for-uiux-server/src/database/database.service.ts` |
| 필요 시 Drizzle migration 생성 | `towercrane-for-uiux-server/drizzle/*` |

현재 towercrane는 Drizzle schema와 `database.service.ts`의 `CREATE TABLE IF NOT EXISTS`가 같이 존재한다. API 문서 테이블도 두 파일을 반드시 같이 맞춘다.

## 테이블 설계 원칙

- ID는 기존 신규 도메인처럼 `TEXT` + prefix + `randomUUID()`를 사용한다.
- 날짜는 ISO 문자열 `TEXT`로 저장한다.
- 문서 구조는 공유 리소스로 둔다. 조회는 로그인 사용자 전체, 편집은 관리자만 허용한다.
- 원본 `section`은 towercrane에서 의미가 애매하므로 `endpoint`로 이름을 바꾼다.
- 요청 설정은 Postman형 JSON이므로 `api_doc_blocks.content`에 저장한다.

## 1. `api_doc_categories`

```ts
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
```

## 2. `api_doc_endpoints`

```ts
export type ApiDocHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
```

## 3. `api_doc_blocks`

```ts
export type ApiDocBlockType = 'API';

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
```

## DDL

`database.service.ts`의 `this.sqlite.exec` 블록에 다음 테이블과 인덱스를 추가한다.

```sql
CREATE TABLE IF NOT EXISTS api_doc_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  emoji TEXT,
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_api_doc_categories_order
  ON api_doc_categories(order_idx);

CREATE TABLE IF NOT EXISTS api_doc_endpoints (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  path TEXT NOT NULL DEFAULT '',
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES api_doc_categories(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_api_doc_endpoints_category_order
  ON api_doc_endpoints(category_id, order_idx);

CREATE TABLE IF NOT EXISTS api_doc_blocks (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'API',
  content TEXT NOT NULL,
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(endpoint_id) REFERENCES api_doc_endpoints(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_doc_blocks_endpoint_order
  ON api_doc_blocks(endpoint_id, order_idx);
```

## 메뉴 seed

`seedDefaults()`에서 초기 메뉴와 기존 DB 보정 모두 처리한다.

- 신규 초기 메뉴: `name: 'API 문서'`, `sectionId: 'api_doc'`, `icon: 'FileJson'`
- 위치: `업무 관리` 다음, `Admin` 이전
- 기존 DB에 `api_doc`가 없으면 루트 메뉴 `display_order >= 5`를 한 칸 밀고 추가


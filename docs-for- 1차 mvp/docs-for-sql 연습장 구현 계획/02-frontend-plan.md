# 02. 프론트엔드 구현 계획

## 목표

`/sql` 페이지를 추가해 SQL 입력, 실행 히스토리, 결과 테이블, 우측 테이블 정보를 제공한다.

1차에서는 세트 선택 UI를 만들지 않는다. 현재 runtime DB의 실제 테이블 목록을 오른쪽에 출력하고, 사용자가 SQL로 테이블을 추가/삭제하면 목록을 즉시 갱신한다.

## 새 파일

```text
towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts
towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts
towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-input-bar.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-history-item.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-result-table.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-schema-sidebar.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-table-schema-dialog.tsx
towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx
```

후순위 파일:

```text
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-set-selector.tsx
```

## 수정 파일

```text
towercrane-for-uiux-front/src/app/router.tsx
towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx
towercrane-for-uiux-server/src/database/database.service.ts
```

## 타입

`entities/sql-practice/model/types.ts`

```ts
export type SqlPracticeMeta = {
  seedFile: string
  seedHash: string
  dbFile: string
  lastLoadedAt: string | null
  tableCount: number
}

export type ColumnInfo = {
  cid: number
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  primaryKey: boolean
}

export type TableInfo = {
  tableName: string
  columns: ColumnInfo[]
  rowCount: number
}

export type SqlExecuteResponse = {
  success: boolean
  type: string
  columns: string[] | null
  rows: Record<string, unknown>[] | null
  affectedRows: number
  message: string
  executionTimeMs: number
  truncated?: boolean
  schemaChanged?: boolean
  seedReloaded?: boolean
}

export type SqlHistoryItem = {
  id: string
  query: string
  response: SqlExecuteResponse
  timestamp: Date
}
```

## API wrapper

`entities/sql-practice/api/sql-practice-api.ts`

```ts
export const sqlPracticeApi = {
  getMeta: () => apiRequest<SqlPracticeMeta>('/sql/meta'),
  getTables: () => apiRequest<TableInfo[]>('/sql/tables'),
  execute: (query: string) =>
    apiRequest<SqlExecuteResponse>('/sql/execute', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  reset: () =>
    apiRequest<{ success: boolean; message: string; seedHash: string }>('/sql/reset', {
      method: 'POST',
    }),
  reloadSeed: () =>
    apiRequest<{ success: boolean; message: string; seedHash: string }>('/sql/reload-seed', {
      method: 'POST',
    }),
}
```

주의:

- `API_BASE_URL`에는 이미 `/api`가 포함된다.
- `fetch`를 직접 쓰지 않고 `apiRequest`를 써서 인증 토큰/401 처리를 재사용한다.

## query hooks

`features/sql-practice/model/use-sql-practice-queries.ts`

필요 hook:

- `useSqlPracticeMeta()`
- `useSqlPracticeTables()`
- `useExecuteSqlPracticeQuery()`
- `useResetSqlPracticeDb()`
- `useReloadSqlPracticeSeed()`

mutation 성공 후:

- execute 응답의 `schemaChanged`가 true면 meta/tables invalidate
- execute가 `INSERT`, `UPDATE`, `DELETE`면 row count 갱신을 위해 tables invalidate
- reset/reload 성공 시 meta/tables invalidate

## 페이지

`pages/sql-practice/ui/sql-practice-page.tsx`

state:

- `selectedTable`
- `history`
- `seedReloadNotice`

레이아웃:

```text
┌────────────────────────────────────────────────────────────────────┐
│ header: SQL 연습장 · seed.sql · reset/reload/history clear         │
├──────────────────────────────────────────────────────┬─────────────┤
│ history / empty state                                │ table info  │
│                                                      │ seed meta   │
│                                                      │ table list  │
├──────────────────────────────────────────────────────┴─────────────┤
│ SQL input bar                                                       │
└────────────────────────────────────────────────────────────────────┘
```

현재 프로젝트의 `AppLayout`이 `main`에 padding을 주므로 페이지 내부는 `h-[calc(100vh-112px)]` 수준으로 제한한다.

## `sql-input-bar.tsx`

기능:

- textarea
- `Ctrl+Enter` 또는 `Meta+Enter` 실행
- Tab 입력 시 공백 2칸 삽입
- 실행 중 버튼 disabled
- placeholder는 기본 예시 쿼리 사용

스타일:

- textarea는 `ui-input` 기반
- 실행 버튼은 `Button size="icon" tone="brand"` 또는 `ui-icon-button-brand`

## `sql-history-item.tsx`

기능:

- 실행 시각
- 쿼리 pre block
- 성공/실패 메시지
- 실행 시간
- SELECT 결과면 `SqlResultTable`
- DDL/DML이면 affected rows
- `seedReloaded`가 true면 seed 변경으로 DB가 갱신되었음을 표시

스타일:

- 성공 색상은 raw `text-green-*` 대신 `text-brand-primary`
- 실패 색상은 기존 `destructive` token 또는 `ui-icon-button-danger`
- 배경은 `ui-panel`, `ui-panel-soft`, `bg-surface-muted`

## `sql-result-table.tsx`

기능:

- 행이 없으면 `결과 없음`
- `null`은 `NULL` 표시
- 긴 값은 truncate + title
- `truncated`면 상단에 `최대 500행까지만 표시됨` 안내

스타일:

- `border-surface-border-soft`
- `bg-surface-muted`
- `text-text-primary`, `text-text-secondary`, `text-text-muted`

## `sql-schema-sidebar.tsx`

구성:

1. 헤더: `테이블 정보`, refresh 버튼
2. seed meta: seed 파일명, table count, hash 일부
3. reset/reload 버튼
4. 테이블 목록
5. schema dialog 열기 버튼

기능:

- 테이블 클릭 시 선택 상태 변경
- info 버튼 클릭 시 컬럼 dialog
- refresh 버튼으로 meta/tables refetch
- reset/reload 버튼은 확인 후 실행
- `CREATE`, `DROP`, `ALTER` 실행 후 자동 갱신

## `sql-table-schema-dialog.tsx`

기능:

- 테이블명
- row count / column count
- 컬럼 목록
- PK, NOT NULL, DEFAULT 표시

스타일:

- overlay는 `ui-overlay`
- dialog는 `glass-panel` 또는 `ui-panel`
- PK 배지는 `bg-brand-glass text-brand-primary border-brand-border`
- NOT NULL 배지는 destructive token 계열 CSS 변수 사용

## 라우터 연결

`app/router.tsx`

```ts
import { SqlPracticePage } from '../pages/sql-practice/ui/sql-practice-page'

const sqlPracticeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sql',
  component: SqlPracticePage,
})
```

`routeTree`에 `sqlPracticeRoute` 추가.

## 헤더 연결

`widgets/app-header/ui/app-header.tsx`

```ts
function sectionIdToPath(sectionId: string): string {
  const map = {
    sql: '/sql',
    ...
  }
}

function getSectionIdFromPath(pathname: string): string {
  if (pathname.startsWith('/sql')) return 'sql'
  ...
}
```

## 메뉴 seed

백엔드 `database.service.ts`에서 기본 메뉴와 기존 DB 보정에 `SQL 연습장`을 추가한다.

권장 값:

```ts
{
  name: 'SQL 연습장',
  sectionId: 'sql',
  icon: 'Database',
  displayOrder: 5,
  isVisible: true,
  requiredRole: null,
}
```

## 스타일 규칙

신규 파일에서 금지:

```text
text-white
text-slate-*
text-emerald-*
text-amber-*
text-sky-*
bg-white/*
bg-slate-*/*
bg-emerald-500/*
border-white/*
border-slate-*
border-emerald-*
```

사용:

```text
text-text-primary
text-text-secondary
text-text-muted
text-brand-primary
bg-brand-glass
border-brand-border
bg-surface-muted
bg-surface-raised
border-surface-border
border-surface-border-soft
ui-panel
ui-panel-soft
ui-input
ui-icon-button
ui-icon-button-brand
ui-icon-button-danger
```

## 후순위 기능

- 여러 SQL 세트 선택
- ERD 목록/CRUD
- Mermaid ERD preview
- AI ERD 생성
- 쿼리 저장/즐겨찾기
- 사용자별 history localStorage 저장
- 문제/정답 모드

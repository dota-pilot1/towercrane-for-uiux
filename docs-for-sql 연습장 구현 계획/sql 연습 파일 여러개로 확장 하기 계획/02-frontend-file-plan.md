# 02. 프론트 파일별 구현 계획

## 대상 파일

```text
towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts
towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts
towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-schema-sidebar.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-seed-manager-dialog.tsx
towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx
```

## `types.ts`

추가 타입:

```ts
export type SqlPracticeSeedSource = 'builtin' | 'uploaded'
export type SqlPracticeSeedLevel = 'beginner' | 'basic' | 'intermediate' | 'advanced'

export type SqlPracticeSeedSummary = {
  source: SqlPracticeSeedSource
  fileName: string
  slug: string
  title: string
  level: SqlPracticeSeedLevel
  description: string
  topics: string[]
  tables: string[]
  recommendedQueries: string[]
  hash: string
  sizeBytes: number
  updatedAt: string | null
  isActive: boolean
  isUpload: boolean
}

export type SqlPracticeSeedListResponse = {
  active: {
    source: SqlPracticeSeedSource
    fileName: string
    slug: string
  }
  seeds: SqlPracticeSeedSummary[]
}
```

`SqlPracticeMeta`에 `activeSeed` 추가.

## `sql-practice-api.ts`

추가 API 함수:

```ts
export async function fetchSqlPracticeSeeds()
export async function activateSqlPracticeSeed(source, fileName)
export async function uploadSqlPracticeSeed(file)
```

업로드는 `FormData` 사용:

```ts
const formData = new FormData()
formData.append('file', file)
```

주의:

- `apiRequest`가 JSON 전용이면 multipart용 helper가 필요하다.
- `Content-Type`은 직접 지정하지 않는다. 브라우저가 boundary를 붙여야 한다.

## `use-sql-practice-queries.ts`

추가 hooks:

```ts
useSqlPracticeSeeds()
useActivateSqlPracticeSeed()
useUploadSqlPracticeSeed()
```

activate 성공 시 invalidate:

- `sql-practice-meta`
- `sql-practice-tables`
- `sql-practice-seeds`

upload 성공 시 invalidate:

- `sql-practice-seeds`

## `sql-schema-sidebar.tsx`

변경:

- 헤더 우상단에 `Settings` 아이콘 버튼 추가
- 기존 refresh 버튼은 유지
- settings 클릭 시 `SqlSeedManagerDialog` open

UI 배치:

```text
테이블 정보                 [톱니] [새로고침]
현재 연습 DB 기준
```

사용 아이콘:

- `Settings`
- 기존 `RefreshCw`

raw Tailwind 색상 금지. 기존 `ui-icon-button`, `text-text-*`, `bg-surface-*` 사용.

## `sql-seed-manager-dialog.tsx`

신규 컴포넌트.

props 예:

```ts
type SqlSeedManagerDialogProps = {
  open: boolean
  onClose: () => void
  seeds?: SqlPracticeSeedSummary[]
  activeSeed?: SqlPracticeSeedSummary
  isLoading: boolean
  isActivating: boolean
  isUploading: boolean
  onActivate: (seed: SqlPracticeSeedSummary) => void
  onUpload: (file: File) => void
}
```

표시 요소:

- 현재 활성 seed
- seed 목록
- 난이도 badge
- topics
- tables
- description
- recommended queries
- 적용 버튼
- admin 업로드 영역

1차에서는 사용자 role을 프론트에서 완벽히 판단하지 못해도 된다. 업로드 API가 403을 반환하면 에러 메시지를 보여준다. 다만 session store에 role이 있으면 admin일 때만 업로드 UI를 노출한다.

## `sql-practice-page.tsx`

seed 변경 성공 시:

- `history` clear
- `selectedTable` null
- `meta` refetch
- `tables` refetch

이유:

- 이전 history는 이전 DB 기준이다.
- 이전 selected table이 새 seed에 없을 수 있다.

## UX 디테일

Seed 선택 버튼 문구:

```text
이 파일로 연습하기
```

선택 확인 문구:

```text
연습 파일을 바꾸면 현재 연습 DB가 새 파일 기준으로 초기화됩니다. 계속할까요?
```

업로드 성공 문구:

```text
SQL 파일을 업로드했습니다. 목록에서 선택하면 이 파일로 연습 DB를 만들 수 있습니다.
```


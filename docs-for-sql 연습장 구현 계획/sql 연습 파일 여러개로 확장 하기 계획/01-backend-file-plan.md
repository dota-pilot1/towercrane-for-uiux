# 01. 백엔드 파일별 구현 계획

## 대상 파일

```text
towercrane-for-uiux-server/src/sql-practice/sql-practice.types.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.module.ts
towercrane-for-uiux-server/src/sql-practice/seeds/*.sql
towercrane-for-uiux-server/.env.example
towercrane-for-uiux-server/.gitignore
```

## `sql-practice.types.ts`

추가 타입:

```ts
export type SqlPracticeSeedSource = 'builtin' | 'uploaded'
export type SqlPracticeSeedLevel = 'beginner' | 'basic' | 'intermediate' | 'advanced'

export type SqlPracticeSeedMeta = {
  title: string
  slug: string
  level: SqlPracticeSeedLevel
  description: string
  topics: string[]
  tables: string[]
  recommendedQueries: string[]
}

export type SqlPracticeSeedSummary = SqlPracticeSeedMeta & {
  source: SqlPracticeSeedSource
  fileName: string
  hash: string
  sizeBytes: number
  updatedAt: string | null
  isActive: boolean
  isUpload: boolean
}
```

기존 `SqlPracticeMeta` 확장:

```ts
export type SqlPracticeMeta = {
  seedFile: string
  seedHash: string
  dbFile: string
  lastLoadedAt: string | null
  tableCount: number
  activeSeed: SqlPracticeSeedSummary
}
```

## `sql-practice.schemas.ts`

추가 schema:

```ts
activateSeedSchema
seedFileNameSchema
```

파일명 정책:

```text
^[a-zA-Z0-9._-]+\.sql$
```

차단:

- `/`
- `\`
- `..`
- null byte
- `.sql` 외 확장자

## `sql-practice.service.ts`

추가 public 메서드:

```ts
listSeeds()
activateSeed(payload: unknown, actorId?: string)
uploadSeed(file: Express.Multer.File, actorId?: string)
```

추가 private 메서드:

```ts
getBuiltinSeedDir()
getUploadedSeedDir()
getActiveSeedStateFile()
readActiveSeedState()
writeActiveSeedState()
resolveSeedFile()
scanSeedDirectory(source)
parseSeedMeta(sql, fileName)
validateSeedSql(sql)
validateSeedByTempDatabase(sql)
sanitizeUploadFileName(fileName)
```

기존 변경:

- `getSeedFile()`은 active seed 기준 파일을 반환하도록 변경한다.
- `reset()` 메시지는 `seed.sql` 고정 문구 대신 현재 seed 파일명을 사용한다.
- `ensureDatabaseFresh()`는 active seed hash를 기준으로 비교한다.

## `sql-practice.controller.ts`

추가 API:

```text
GET  /api/sql/seeds
POST /api/sql/seeds/activate
POST /api/sql/seeds/upload
```

권장 controller 형태:

```ts
@Get('seeds')
seeds()

@Post('seeds/activate')
@UseGuards(AdminGuard)
activateSeed(@Body() body: unknown, @Req() request)

@Post('seeds/upload')
@UseGuards(AdminGuard)
@UseInterceptors(FileInterceptor('file'))
uploadSeed(@UploadedFile() file, @Req() request)
```

## `sql-practice.module.ts`

업로드 처리를 위해 `FileInterceptor`를 사용한다. 별도 module 설정 없이도 동작 가능하지만, 파일 크기 제한을 명확히 두려면 interceptor option을 둔다.

권장 제한:

```text
max file size: 1MB
```

## `src/sql-practice/seeds/*.sql`

기존 `seed.sql`은 다음 중 하나로 처리한다.

권장:

- `seed.sql`은 호환용으로 남긴다.
- 같은 내용을 `01_board_basic.sql`로 복사/정리한다.
- active seed fallback은 `01_board_basic.sql`을 우선한다.

추가할 기본 파일:

```text
01_board_basic.sql
02_shop_order.sql
03_hr_attendance.sql
04_project_task.sql
05_reservation_schedule.sql
06_support_ticket.sql
07_sales_crm.sql
08_analytics_event.sql
09_finance_reconciliation.sql
10_inventory_supply_chain.sql
```

## `.env.example`

후보:

```env
SQL_PRACTICE_DB_FILE=./data/sql-practice/runtime/practice.sqlite
SQL_PRACTICE_SEED_FILE=
SQL_PRACTICE_UPLOAD_SEED_DIR=./data/sql-practice/seeds
SQL_PRACTICE_ACTIVE_SEED_FILE=./data/sql-practice/active-seed.json
SQL_PRACTICE_MAX_ROWS=500
SQL_PRACTICE_MAX_QUERY_LENGTH=10000
SQL_PRACTICE_MAX_SEED_UPLOAD_BYTES=1048576
```

`SQL_PRACTICE_SEED_FILE`은 기존 단일 seed 호환용으로 남긴다. active seed 방식이 우선되면 문서상 deprecated로 표시할 수 있다.

## `.gitignore`

추가 확인:

```gitignore
/towercrane-for-uiux-server/data/sql-practice/runtime/
/towercrane-for-uiux-server/data/sql-practice/seeds/
/towercrane-for-uiux-server/data/sql-practice/active-seed.json
```

기본 seed는 `src/sql-practice/seeds/`이므로 git에 포함한다.


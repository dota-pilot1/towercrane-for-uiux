# 01. 백엔드 구현 계획

## 목표

NestJS 서버에 SQL 연습장 전용 모듈을 추가한다.

1차 구현은 `seed.sql` 파일 하나와 별도 runtime SQLite DB 하나를 사용한다. 기존 앱 DB와 완전히 분리된 파일에만 사용자 SQL을 실행한다.

## DB 분리 구조

| 구분 | 파일 | 연결 방식 | 역할 |
|---|---|---|---|
| 메인 앱 DB | `DATABASE_FILE` 또는 `./data/towercrane-catalog.sqlite` | 기존 `DatabaseService` + Drizzle | 사용자/메뉴/문서 등 앱 데이터 |
| SQL 연습 DB | `SQL_PRACTICE_DB_FILE` 또는 `./data/sql-practice/runtime/practice.sqlite` | 신규 `SqlPracticeService` + `better-sqlite3` | SQL 연습 전용 |

금지:

- `SqlPracticeService`에서 `DatabaseService.db` 사용 금지
- 사용자 SQL을 메인 앱 DB에 전달 금지
- SQL 연습 테이블을 `src/database/schema.ts`에 추가 금지

## 새 파일

```text
towercrane-for-uiux-server/src/sql-practice/sql-practice.module.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.types.ts
towercrane-for-uiux-server/src/sql-practice/sql-safety.ts
towercrane-for-uiux-server/src/sql-practice/seeds/seed.sql
```

## 수정 파일

```text
towercrane-for-uiux-server/src/app.module.ts
towercrane-for-uiux-server/nest-cli.json
towercrane-for-uiux-server/.env.example
towercrane-for-uiux-server/.gitignore
towercrane-for-uiux-server/src/database/database.service.ts
```

## 환경 변수

`.env.example`에 추가:

```text
SQL_PRACTICE_DB_FILE=./data/sql-practice/runtime/practice.sqlite
SQL_PRACTICE_SEED_FILE=
SQL_PRACTICE_MAX_ROWS=500
SQL_PRACTICE_MAX_QUERY_LENGTH=10000
```

설명:

- `SQL_PRACTICE_DB_FILE`: runtime DB 파일 경로
- `SQL_PRACTICE_SEED_FILE`: 비워두면 bundled `src/sql-practice/seeds/seed.sql` 사용
- `SQL_PRACTICE_MAX_ROWS`: SELECT 결과 최대 표시 행
- `SQL_PRACTICE_MAX_QUERY_LENGTH`: 사용자 SQL 길이 제한

## 빌드 assets

`nest-cli.json`에 seed SQL 복사 설정을 추가한다.

```json
{
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "sql-practice/seeds/**/*",
        "outDir": "dist"
      }
    ],
    "watchAssets": true
  }
}
```

`nest build` 후 `dist/sql-practice/seeds/seed.sql`이 존재해야 한다.

## .gitignore

runtime DB와 sidecar hash 파일만 제외한다.

```text
/data/sql-practice/runtime/*.sqlite
/data/sql-practice/runtime/*.sqlite-shm
/data/sql-practice/runtime/*.sqlite-wal
/data/sql-practice/runtime/*.seedhash
```

`src/sql-practice/seeds/seed.sql`은 버전 관리 대상이다.

## API 계약

### GET `/api/sql/meta`

현재 seed/runtime 상태를 반환한다.

```ts
type SqlPracticeMeta = {
  seedFile: string
  seedHash: string
  dbFile: string
  lastLoadedAt: string | null
  tableCount: number
}
```

### GET `/api/sql/tables`

현재 runtime DB의 테이블 목록과 컬럼 정보를 반환한다.

```ts
type ColumnInfo = {
  cid: number
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  primaryKey: boolean
}

type TableInfo = {
  tableName: string
  columns: ColumnInfo[]
  rowCount: number
}
```

숨김 대상:

- `sqlite_%`
- `__sql_practice_%`

### GET `/api/sql/tables/:tableName`

특정 테이블의 컬럼과 row count를 반환한다.

주의:

- `tableName`은 `sqlite_master`에 존재하는 테이블인지 먼저 확인한다.
- 식별자는 double quote escape 후 사용한다.

### POST `/api/sql/execute`

요청:

```ts
type SqlExecuteRequest = {
  query: string
}
```

응답:

```ts
type SqlExecuteResponse = {
  success: boolean
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER' | 'PRAGMA' | 'EXPLAIN' | 'OTHER'
  columns: string[] | null
  rows: Record<string, unknown>[] | null
  affectedRows: number
  message: string
  executionTimeMs: number
  truncated?: boolean
  schemaChanged?: boolean
  seedReloaded?: boolean
}
```

`schemaChanged`는 `CREATE`, `DROP`, `ALTER`일 때 true로 반환한다.

### POST `/api/sql/reset`

runtime DB를 삭제하고 현재 `seed.sql`로 다시 만든다.

응답:

```ts
type SqlResetResponse = {
  success: boolean
  message: string
  seedHash: string
}
```

### POST `/api/sql/reload-seed`

seed 파일을 강제로 다시 적용한다. 내부 동작은 reset과 동일하게 clean rebuild로 처리한다.

## seed 변경 즉시 반영

파일 watcher보다 hash 비교 방식이 더 단순하고 안정적이다.

요청마다 `ensureDatabaseFresh()`를 호출한다.

```ts
private ensureDatabaseFresh() {
  const currentHash = hashFile(seedFile)
  const loadedHash = readSidecarHash()

  if (!dbExists || currentHash !== loadedHash) {
    rebuildDatabaseFromSeed(currentHash)
  }
}
```

sidecar 파일:

```text
data/sql-practice/runtime/practice.seedhash
```

seed가 바뀌면 runtime DB를 clean rebuild한다. 기존 사용자가 직접 만든 테이블과 데이터는 사라지지만, seed 파일 변경은 기준 DB 변경이므로 이 동작이 가장 예측 가능하다.

## 파일별 구현 상세

### `sql-practice.types.ts`

역할:

- API 응답 타입 정의
- `SqlPracticeMeta`, `ColumnInfo`, `TableInfo`, `SqlExecuteResponse` 관리
- SQLite 값을 JSON-safe 값으로 변환할 때 참조할 타입 제공

### `sql-practice.schemas.ts`

역할:

- Zod로 body 검증

스키마:

```ts
executeSqlSchema = z.object({
  query: z.string().trim().min(1).max(maxQueryLength)
})
```

`maxQueryLength`는 `ConfigService` 값으로 service에서 적용하거나, schema factory로 구성한다.

### `sql-safety.ts`

역할:

- 사용자 SQL 실행 전 최소 안전장치 적용

차단 또는 제한:

- 다중 statement 금지
- `ATTACH`, `DETACH` 금지
- `VACUUM INTO` 금지
- `PRAGMA writable_schema` 금지
- `load_extension` 금지
- `__sql_practice_` prefix 테이블의 `DROP`, `ALTER` 금지
- query length 제한

허용:

- `SELECT`, `WITH`
- `INSERT`, `UPDATE`, `DELETE`
- `CREATE`, `DROP`, `ALTER`
- 읽기 목적 `PRAGMA table_info`, `PRAGMA index_list`
- `EXPLAIN`

### `sql-practice.service.ts`

역할:

- seed 파일 경로 계산
- seed hash 계산
- runtime DB freshness 확인
- DB rebuild/reset
- SQL 실행
- 테이블/컬럼 정보 조회

주요 메서드:

```ts
getMeta()
getTables()
getTable(tableName: string)
execute(query: string)
reset()
reloadSeed()
```

DB 초기화:

1. runtime DB 디렉터리 생성
2. 기존 DB/wal/shm 파일 삭제
3. `new Database(dbFile)`로 연결
4. `foreign_keys = ON`, `journal_mode = WAL`
5. `seed.sql`을 `db.exec()`로 실행
6. sidecar hash 저장

SELECT 처리:

```ts
const stmt = db.prepare(query)
const rows = []
for (const row of stmt.iterate()) {
  rows.push(toJsonSafe(row))
  if (rows.length > maxRows) break
}
```

DDL/DML 처리:

```ts
const info = db.prepare(query).run()
```

테이블 목록 조회:

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE '__sql_practice_%'
ORDER BY name
```

### `sql-practice.controller.ts`

권장:

- 현재 앱은 로그인 후 쓰는 콘솔이므로 `@UseGuards(AuthGuard)` 적용
- reset/reload도 로그인 사용자에게 허용하되, 운영에서 부담이 되면 admin 전용으로 전환 가능

컨트롤러:

```ts
@Controller('sql')
@UseGuards(AuthGuard)
export class SqlPracticeController {
  @Get('meta') meta() {}
  @Get('tables') listTables() {}
  @Get('tables/:tableName') getTable() {}
  @Post('execute') execute() {}
  @Post('reset') reset() {}
  @Post('reload-seed') reloadSeed() {}
}
```

### `sql-practice.module.ts`

역할:

- `SqlPracticeService` provider 등록
- `SqlPracticeController` 등록

### `app.module.ts`

작업:

- `SqlPracticeModule` import 추가

### `database.service.ts`

작업:

- 메뉴 seed에 `SQL 연습장` 추가
- 기존 DB에 `section_id = 'sql'` 메뉴가 없으면 보정 삽입

권장 메뉴 값:

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

## seed.sql 작성 원칙

```text
src/sql-practice/seeds/seed.sql
```

규칙:

- `DROP TABLE` 없이 빈 DB 기준 `CREATE TABLE`과 `INSERT`를 작성
- reset/reload가 clean rebuild를 하므로 `CREATE TABLE IF NOT EXISTS`는 선택
- FK 순서를 지킨다.
- 참조 프로젝트의 `schema.sql`과 `data.sql`을 하나로 합쳐 시작해도 된다.

## 후순위 확장

여러 학습 세트가 필요해지면 다음을 추가한다.

- `sets.json`
- 세트별 seed SQL
- `/api/sql/sets`
- 프론트 `SqlSetSelector`

이 확장은 `03-set-label-improvement.md`를 기준으로 진행한다.

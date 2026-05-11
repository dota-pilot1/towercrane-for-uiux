# SQL 연습장 구현 계획 개요

## 결론

구현 가능하다.

다만 1차 구현은 여러 SQL 파일/세트를 동시에 운영하는 방식보다 `seed.sql` 파일 하나와 runtime SQLite DB 하나로 시작하는 편이 더 합리적이다. 오른쪽 사이드바는 세트 번호가 아니라 현재 DB의 실제 테이블 목록을 보여주고, 사용자가 SQL로 `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`을 실행하면 테이블 목록을 즉시 갱신한다.

여러 SQL 파일/세트 선택은 학습 커리큘럼이 늘어난 뒤 2차 확장으로 둔다. 자세한 판단은 `05-single-seed-file-decision.md`에 정리한다.

현재 프로젝트는 이미 다음 기반을 갖고 있어서 `/Users/terecal/mapo-palantier-project`의 `http://localhost:5173/sql` 기능을 현 스택에 맞춰 옮길 수 있다.

| 항목 | 참조 프로젝트 | 현재 프로젝트 적용 방향 |
|---|---|---|
| 프론트 | React + Vite, `/sql` 라우트 | React 19 + Vite + TanStack Router, `/sql` 라우트 추가 |
| 백엔드 | Spring + JDBC + sqlite-jdbc | NestJS + `better-sqlite3` |
| 앱 DB | PostgreSQL/MyBatis 중심 | 기존 앱 DB는 SQLite + Drizzle |
| SQL 연습 DB | `sql-practice-*.db` 파일 | 앱 DB와 분리한 별도 `practice.sqlite` |
| API | `/api/sql/execute`, `/api/sql/tables` | `@Controller('sql')`로 `/api/sql/*` 유지 |
| 프론트 API | fetch 직접 호출 | 기존 `apiRequest('/sql/...')` 사용 |
| 테마 | shadcn 변수 + 일부 raw 팔레트 | semantic token / `ui-*` 유틸만 사용 |

핵심은 앱의 운영 DB인 `towercrane-catalog.sqlite`에 사용자 SQL을 날리지 않는 것이다. SQL 연습장은 별도 `data/sql-practice/runtime/practice.sqlite` 파일을 열고, `seed.sql` 파일로 초기화한다.

## 참조한 원본 파일

### 프론트엔드

- `/Users/terecal/mapo-palantier-project/parantier-front/src/pages/sql/SqlPage.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/sql/api/sqlApi.ts`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/sql/components/SqlInputBar.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/sql/components/SqlSchemaSidebar.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/sql/components/SqlHistoryItem.tsx`
- `/Users/terecal/mapo-palantier-project/parantier-front/src/features/sql/components/SqlResultTable.tsx`

### 백엔드

- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/sql/controller/SqlPracticeController.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/sql/service/SqlPracticeService.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/sql/dto/SqlExecuteResponse.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/java/com/mapo/palantier/sql/dto/TableInfo.java`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/sql/schema.sql`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/sql/schema-2.sql`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/sql/data.sql`
- `/Users/terecal/mapo-palantier-project/parantier-api/src/main/resources/sql/data-2.sql`

## 1차 구현 범위

| 기능 | 1차 포함 여부 | 비고 |
|---|---:|---|
| `/sql` 페이지 | 포함 | 헤더 메뉴에서 접근 |
| SQL 입력/실행 | 포함 | `Ctrl+Enter`, Tab 들여쓰기 |
| 실행 히스토리 | 포함 | 쿼리와 결과를 대화형 로그처럼 표시 |
| SELECT 결과 테이블 | 포함 | 컬럼/행 표시, NULL 처리, 가로 스크롤 |
| INSERT/UPDATE/DELETE/DDL 실행 결과 | 포함 | affected row와 메시지 표시 |
| 우측 테이블 정보 | 포함 | 현재 DB의 테이블, 컬럼, row count 표시 |
| SQL 파일/세트 전환 | 후순위 | 1차는 seed 파일 하나로 단순화 |
| SQL 파일 변경 즉시 반영 | 포함 | seed hash 변경 감지 후 runtime DB 재생성 |
| 초기화/리셋 | 포함 | 연습 DB 파일 삭제 후 seed 재실행 |
| 세트 목록 API | 제외 | 여러 세트 도입 시 추가 |
| ERD 목록/CRUD | 후순위 | 현재 요구의 핵심은 SQL 연습장과 테이블 정보 |
| AI ERD 생성 | 제외 | OpenAI/AI 설정과 별도 기능으로 분리 |
| 다중 사용자별 DB 격리 | 선택 | 1차는 세트별 공유 DB 또는 세션별 DB 중 결정 필요 |

## 중요한 설계 결정

1. 사용자 SQL은 앱 DB에 절대 연결하지 않는다.
2. SQL 연습 DB는 `better-sqlite3`로 직접 열고, Drizzle 스키마에 포함하지 않는다.
3. 1차에서는 세트 선택 UI를 만들지 않고 현재 DB의 실제 테이블 목록만 오른쪽에 표시한다.
4. `seed.sql` 파일이 바뀌면 hash를 감지해 runtime DB를 재생성한다.
5. seed SQL 파일은 빌드 산출물에 포함되도록 `nest-cli.json` assets 설정을 추가한다.
6. raw Tailwind 팔레트 사용은 금지한다. 신규 UI는 `text-text-*`, `bg-surface-*`, `border-surface-*`, `bg-brand-glass`, `ui-panel`, `ui-input`, `ui-icon-button*`를 사용한다.

## API 경로

현재 서버는 `src/main.ts`에서 `app.setGlobalPrefix('api')`를 사용한다.

따라서 백엔드 컨트롤러는 다음처럼 작성한다.

```ts
@Controller('sql')
export class SqlPracticeController {}
```

프론트에서는 기존 API 래퍼를 이용해 다음처럼 호출한다.

```ts
apiRequest('/sql/meta')
apiRequest('/sql/tables')
apiRequest('/sql/execute', { method: 'POST', body: JSON.stringify({ query }) })
```

`apiRequest('/api/sql/...')`처럼 `/api`를 중복해서 넣지 않는다.

## SQL 파일/세트 식별성 판단

참조 화면의 `1~10` 버튼은 어떤 SQL 파일/DB인지 알 수 없다. 다만 이 문제를 바로 `sets.json`과 다중 세트 UI로 풀면 1차 구현 복잡도가 올라간다.

1차 권장:

- `seed.sql` 하나
- runtime DB 하나
- 오른쪽에는 현재 DB에 실제 존재하는 테이블명 표시
- `CREATE TABLE` / `DROP TABLE` 실행 후 테이블 목록 즉시 갱신
- `seed.sql` 파일 자체가 바뀌면 runtime DB 재생성

2차 확장:

- 여러 seed 파일이 필요해지면 `sets.json` 기반 라벨 선택 UI 도입
- 이때도 숫자 `1~10` 대신 `게시판 기본`, `쇼핑몰 주문`처럼 이름으로 선택

## 리스크

| 리스크 | 대응 |
|---|---|
| 사용자 SQL이 서버 파일에 접근하거나 새 DB를 붙이는 문제 | `ATTACH`, `DETACH`, `VACUUM INTO`, `PRAGMA writable_schema`, `load_extension` 등 차단 |
| 무거운 쿼리로 서버가 멈추는 문제 | 결과 row cap, query length cap, 단일 statement 제한, 필요 시 worker thread 후순위 |
| DDL/DML로 연습 DB가 망가지는 문제 | reset API 제공 |
| SQL seed 파일이 prod build에 누락되는 문제 | `nest-cli.json` assets 설정 |
| 숫자 세트의 식별성 부족 | 1차에서는 세트 UI 제거, 2차에서 라벨형 선택 UI 적용 |
| 테마 전환 시 글자 안 보임 | raw Tailwind 팔레트 금지, semantic token만 사용 |

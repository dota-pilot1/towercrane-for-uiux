# 04. 단계별 파일별 구현 체크리스트

## Phase 0. 기준 확인

- [ ] 참조 프로젝트 `/sql` 기능 확인
- [ ] 현 프로젝트 라우터 구조 확인
- [ ] 현 프로젝트 `apiRequest`의 `/api` prefix 처리 확인
- [ ] 현 프로젝트 `better-sqlite3` 의존성 확인
- [ ] 메인 앱 DB와 연습 DB를 분리할 경로 확정
- [ ] raw Tailwind 팔레트 금지 규칙 확인

확인된 주요 사실:

- 프론트 API base: `towercrane-for-uiux-front/src/shared/api/http.ts`
- 서버 global prefix: `towercrane-for-uiux-server/src/main.ts`
- 서버 SQLite 의존성: `better-sqlite3` 설치됨
- 메인 DB 서비스: `towercrane-for-uiux-server/src/database/database.service.ts`
- 헤더 메뉴는 DB `menus`에서 로드됨

## Phase 1. seed.sql 준비

새 파일:

```text
towercrane-for-uiux-server/src/sql-practice/seeds/seed.sql
```

작업:

- [ ] 참조 `schema.sql`과 `data.sql`을 하나의 `seed.sql`로 이관
- [ ] FK 순서 확인
- [ ] 빈 DB에서 `seed.sql`이 한 번에 실행되는지 확인
- [ ] 초기 예시 쿼리로 `SELECT * FROM users LIMIT 10;` 사용 가능하게 구성

## Phase 2. Nest assets/env/gitignore

수정 파일:

```text
towercrane-for-uiux-server/nest-cli.json
towercrane-for-uiux-server/.env.example
towercrane-for-uiux-server/.gitignore
```

작업:

- [ ] `nest-cli.json`에 `sql-practice/seeds/**/*` assets 추가
- [ ] `.env.example`에 `SQL_PRACTICE_DB_FILE` 추가
- [ ] `.env.example`에 `SQL_PRACTICE_SEED_FILE` 추가
- [ ] `.env.example`에 `SQL_PRACTICE_MAX_ROWS` 추가
- [ ] `.env.example`에 `SQL_PRACTICE_MAX_QUERY_LENGTH` 추가
- [ ] runtime sqlite/hash 파일 ignore 패턴 추가

검증:

```text
pnpm build
```

빌드 후 `dist/sql-practice/seeds/seed.sql`이 존재해야 한다.

## Phase 3. 백엔드 타입/검증/안전장치

새 파일:

```text
towercrane-for-uiux-server/src/sql-practice/sql-practice.types.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts
towercrane-for-uiux-server/src/sql-practice/sql-safety.ts
```

작업:

- [ ] `SqlPracticeMeta` 타입 정의
- [ ] `ColumnInfo`, `TableInfo` 타입 정의
- [ ] `SqlExecuteResponse` 타입 정의
- [ ] execute request Zod schema 작성
- [ ] 금지 SQL 키워드 검사
- [ ] 단일 statement 제한
- [ ] `__sql_practice_` prefix 보호
- [ ] query length 제한

## Phase 4. 백엔드 서비스/컨트롤러/모듈

새 파일:

```text
towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.module.ts
```

수정 파일:

```text
towercrane-for-uiux-server/src/app.module.ts
```

작업:

- [ ] `SqlPracticeModule` 작성
- [ ] `AppModule`에 import
- [ ] `GET /api/sql/meta`
- [ ] `GET /api/sql/tables`
- [ ] `GET /api/sql/tables/:tableName`
- [ ] `POST /api/sql/execute`
- [ ] `POST /api/sql/reset`
- [ ] `POST /api/sql/reload-seed`
- [ ] runtime DB 파일이 없으면 seed 자동 실행
- [ ] seed hash가 바뀌면 runtime DB clean rebuild
- [ ] SELECT 결과 row cap 적용
- [ ] DDL/DML 이후 tables refetch 가능하도록 `schemaChanged`와 type 반환

검증:

```text
pnpm build
pnpm test
```

수동 확인:

```text
GET http://127.0.0.1:3000/api/sql/meta
GET http://127.0.0.1:3000/api/sql/tables
POST http://127.0.0.1:3000/api/sql/execute
```

## Phase 5. 메뉴 seed/라우팅 연결

수정 파일:

```text
towercrane-for-uiux-server/src/database/database.service.ts
towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx
towercrane-for-uiux-front/src/app/router.tsx
```

작업:

- [ ] 기본 메뉴 seed에 `SQL 연습장` 추가
- [ ] 기존 DB 보정용 `existingSqlMenu` 추가
- [ ] `sectionIdToPath`에 `sql: '/sql'` 추가
- [ ] `getSectionIdFromPath`에 `/sql` 처리 추가
- [ ] router에 `/sql` route 추가

## Phase 6. 프론트 API/type/query

새 파일:

```text
towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts
towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts
towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts
```

작업:

- [ ] 타입 정의
- [ ] `apiRequest('/sql/...')` API wrapper 작성
- [ ] meta/tables query 작성
- [ ] execute/reset/reload mutation 작성
- [ ] execute 성공 시 DDL/DML이면 tables invalidate
- [ ] reset/reload 성공 시 meta/tables invalidate

## Phase 7. 프론트 UI 컴포넌트

새 파일:

```text
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-input-bar.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-history-item.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-result-table.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-schema-sidebar.tsx
towercrane-for-uiux-front/src/features/sql-practice/ui/sql-table-schema-dialog.tsx
```

작업:

- [ ] SQL 입력창 구현
- [ ] `Ctrl+Enter` / `Meta+Enter` 실행
- [ ] Tab 들여쓰기
- [ ] history item 구현
- [ ] result table 구현
- [ ] schema sidebar 구현
- [ ] seed meta 표시
- [ ] reset/reload 버튼 구현
- [ ] table schema dialog 구현
- [ ] raw Tailwind 팔레트 금지 패턴 미사용 확인

## Phase 8. 페이지 조립

새 파일:

```text
towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx
```

작업:

- [ ] meta 로드
- [ ] tables 로드
- [ ] selected table 관리
- [ ] execute mutation으로 history append
- [ ] DDL/DML 실행 후 tables refetch
- [ ] reset/reload 후 history clear 및 meta/tables refetch
- [ ] empty state에 기본 sample query 표시
- [ ] seed hash 변경으로 DB가 재생성되었을 때 안내 표시

## Phase 9. 검증

서버:

```text
cd towercrane-for-uiux-server
pnpm build
pnpm test
```

프론트:

```text
cd towercrane-for-uiux-front
pnpm typecheck
pnpm build
```

raw Tailwind 금지 패턴 검사:

```text
rg -n "text-white|text-slate-|text-emerald-|text-amber-|text-sky-|bg-white/|bg-slate-|bg-emerald-500/|border-white/|border-slate-|border-emerald-" towercrane-for-uiux-front/src/pages/sql-practice towercrane-for-uiux-front/src/features/sql-practice towercrane-for-uiux-front/src/entities/sql-practice
```

브라우저 확인:

- [ ] `/sql` 접근 가능
- [ ] 메뉴 active 상태가 `SQL 연습장`으로 표시
- [ ] 오른쪽 테이블 목록 표시
- [ ] `SELECT * FROM users LIMIT 10` 실행
- [ ] 결과 테이블 표시
- [ ] `CREATE TABLE` 실행 후 오른쪽 테이블 목록 갱신
- [ ] `DROP TABLE` 실행 후 오른쪽 테이블 목록 갱신
- [ ] `seed.sql` 변경 후 다음 refresh/execute에서 DB 재생성
- [ ] reset 후 seed 데이터 복구

## Phase 10. 후순위

- [ ] 여러 SQL 세트 선택
- [ ] ERD 목록/CRUD
- [ ] ERD with DB
- [ ] AI ERD 생성
- [ ] 사용자별 독립 DB
- [ ] SQL 문제/정답 모드
- [ ] query favorite
- [ ] history localStorage 저장

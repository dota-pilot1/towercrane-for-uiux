# 05. SQL 파일 하나로 단순화하는 권장안

## 결론

1차 구현은 SQL 파일 여러 개보다 `seed.sql` 파일 하나가 더 합리적이다.

권장 구조:

```text
src/sql-practice/seeds/seed.sql
data/sql-practice/runtime/practice.sqlite
```

오른쪽 사이드바는 세트 선택 버튼을 없애고, 현재 runtime DB에 실제 존재하는 테이블 목록을 보여준다. 사용자가 SQL로 `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`을 실행하면 서버가 테이블 목록을 다시 읽고 프론트가 즉시 갱신한다.

## 메인 DB와 분리 가능 여부

가능하다.

현재 메인 DB도 SQLite 파일이지만, 연결 파일과 service를 분리하면 서로 영향을 주지 않는다.

| 구분 | 파일 | 사용 주체 | 사용자 SQL 실행 여부 |
|---|---|---|---|
| 메인 앱 DB | `data/towercrane-catalog.sqlite` 또는 `DATABASE_FILE` | 기존 `DatabaseService` + Drizzle | 실행 금지 |
| SQL 연습 DB | `data/sql-practice/runtime/practice.sqlite` | 신규 `SqlPracticeService` + `better-sqlite3` | 실행 허용 |

중요한 원칙:

- `SqlPracticeService`는 `DatabaseService.db`를 주입받지 않는다.
- SQL 연습장은 Drizzle schema에 포함하지 않는다.
- 사용자 SQL은 오직 `practice.sqlite` 연결에만 실행한다.
- runtime DB 경로는 `SQL_PRACTICE_DB_FILE` 또는 `SQL_PRACTICE_DATA_DIR`로 고정한다.

## 왜 이 방식이 더 합리적인가

여러 SQL 파일/세트 방식은 커리큘럼에는 좋지만, 1차 기능에는 다음 복잡도가 추가된다.

- set id 관리
- `sets.json` 메타데이터 관리
- 세트 선택 UI
- 세트별 DB 파일 생성/초기화
- 세트 변경 시 history 처리
- 숫자 버튼 식별성 문제 해결
- seed 파일과 runtime DB의 매핑 관리

반면 SQL 연습장의 핵심은 다음이다.

- SQL을 입력한다.
- SQLite DB에 실행한다.
- 결과를 본다.
- 오른쪽에서 현재 테이블 구조를 확인한다.
- 테이블을 만들고 지우면 목록이 바뀐다.

이 핵심만 보면 seed 파일 하나가 충분하다.

## 추천 MVP 스펙

### 파일

```text
towercrane-for-uiux-server/src/sql-practice/seeds/seed.sql
towercrane-for-uiux-server/data/sql-practice/runtime/practice.sqlite
```

### API

```text
GET  /api/sql/meta
GET  /api/sql/tables
GET  /api/sql/tables/:tableName
POST /api/sql/execute
POST /api/sql/reset
POST /api/sql/reload-seed
```

`/api/sql/meta` 응답:

```ts
type SqlPracticeMeta = {
  seedFile: string
  seedHash: string
  lastLoadedAt: string | null
  tableCount: number
}
```

### 오른쪽 사이드바

표시:

- `테이블 정보`
- refresh 버튼
- reset 버튼
- seed 파일명
- table count
- 테이블 목록
- 각 테이블의 row count / column count
- 컬럼 상세 dialog

세트 번호나 세트 선택 UI는 없다.

## SQL로 테이블 추가/삭제

가능하다.

허용 예:

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total_amount INTEGER NOT NULL
);
```

```sql
DROP TABLE orders;
```

프론트 처리:

1. SQL 실행
2. 응답 type이 `CREATE`, `DROP`, `ALTER`, `INSERT`, `UPDATE`, `DELETE` 중 하나면 `tables` query invalidate
3. 오른쪽 테이블 목록 갱신

`INSERT`, `UPDATE`, `DELETE`도 row count가 바뀔 수 있으므로 갱신 대상에 포함한다.

## SQL 파일 자체를 바꾸면 바로 적용 가능한가

가능하다.

다만 "바로 적용"의 의미를 명확히 해야 한다. 가장 안전한 방식은 seed 파일 변경을 감지하면 runtime DB를 재생성하는 것이다.

권장 동작:

1. 서버가 `seed.sql`의 SHA-256 hash를 계산한다.
2. sidecar 파일에 마지막 적용 hash를 저장한다.
3. `/api/sql/tables`, `/api/sql/execute`, `/api/sql/meta` 요청 때 현재 hash와 적용 hash를 비교한다.
4. hash가 다르면 runtime DB 파일을 닫고 삭제한다.
5. 새 runtime DB를 만들고 `seed.sql`을 실행한다.
6. 오른쪽 테이블 정보는 새 DB 기준으로 갱신된다.

이 방식이면 파일 watcher 없이도 다음 요청에서 바로 반영된다.

## 왜 `seed.sql`을 기존 DB에 그냥 실행하지 않는가

기존 DB에 새 seed를 그대로 `exec`하면 이전 테이블이 남을 수 있다.

예:

기존 seed:

```sql
CREATE TABLE users (...);
CREATE TABLE posts (...);
```

새 seed:

```sql
CREATE TABLE products (...);
```

이때 기존 DB에 새 seed만 실행하면 `users`, `posts`, `products`가 모두 남는다. 사용자는 SQL 파일을 바꿨는데 오른쪽 테이블 정보가 섞여 보인다.

따라서 seed 파일 자체가 바뀌면 clean rebuild가 맞다.

## clean rebuild의 단점

사용자가 SQL 연습 중 직접 만든 테이블과 데이터가 사라진다.

하지만 seed 파일이 바뀌었다는 것은 연습 DB의 기준 상태가 바뀐 것이므로, 1차 구현에서는 이 동작이 더 예측 가능하다.

보완 UX:

- `seed.sql 변경 감지됨. DB를 새 seed 기준으로 다시 만들었습니다.`
- `Reset` 버튼 제공
- 실행 history는 seed reload 시 clear

## 파일 변경 감지 구현안

sidecar 파일을 둔다.

```text
data/sql-practice/runtime/practice.seedhash
```

장점:

- 사용자가 SQL로 건드릴 수 없다.
- runtime DB와 seed 적용 상태를 분리해서 관리할 수 있다.

모든 요청 앞에서 `ensureDatabaseFresh()`를 호출한다.

```ts
private ensureDatabaseFresh() {
  const currentHash = hashFile(seedFile)
  const loadedHash = readSidecarHash()

  if (!dbExists || currentHash !== loadedHash) {
    rebuildDatabaseFromSeed(currentHash)
  }
}
```

적용 API:

- `GET /api/sql/meta`
- `GET /api/sql/tables`
- `GET /api/sql/tables/:tableName`
- `POST /api/sql/execute`

`POST /api/sql/reset`은 hash 비교 없이 항상 rebuild한다.

## 여러 SQL 파일은 언제 필요한가

다음 요구가 생기면 여러 파일/세트로 확장한다.

- 입문/초급/중급 커리큘럼을 나누고 싶다.
- 게시판, 쇼핑몰, 인사, 재고처럼 도메인별 연습 세트가 필요하다.
- 각 세트별 샘플 쿼리와 문제를 따로 관리하고 싶다.
- 사용자에게 "오늘은 쇼핑몰 세트"처럼 선택권을 주고 싶다.

그때는 `03-set-label-improvement.md`의 `sets.json` 방식으로 확장한다.

## 최종 권장 순서

1. `seed.sql` 하나로 `/sql` MVP 구현
2. 오른쪽 사이드바는 현재 DB 테이블 목록만 표시
3. SQL DDL/DML 실행 후 테이블 목록 자동 갱신
4. `seed.sql` hash 변경 시 runtime DB clean rebuild
5. 나중에 세트가 3개 이상 필요해지면 `sets.json`과 라벨형 세트 선택 UI 도입

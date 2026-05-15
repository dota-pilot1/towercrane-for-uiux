# SQL 파일 바꾸기 개인화 계획

## 목표

현재 SQL 연습장의 SQL 대상 파일(active seed)은 서버 전역 상태다.
한 사용자가 오른쪽 패널에서 `01_board_basic.sql`에서 다른 SQL 파일로 이동하면, 같은 운영 서버를 보는 다른 사용자도 같은 active seed와 같은 `practice.sqlite`를 보게 된다.

목표는 SQL 연습장의 대상 파일 변경을 사용자별로 분리하는 것이다.

- 오현석 사용자가 `02_shop_order.sql`로 바꿔도 김민준 사용자의 active seed는 그대로 유지
- 사용자가 실행한 `CREATE`, `INSERT`, `UPDATE`, `DELETE`, `DROP` 등도 자기 연습 DB에만 반영
- 랭킹, 제출 로그, 개인 노트는 기존처럼 `seedFile`, `userId` 기준으로 유지
- 프론트 API 스펙은 가능하면 유지

## 현재 구조

### 공용 상태

현재 서버는 아래 파일을 공용으로 사용한다.

```text
data/sql-practice/active-seed.json
data/sql-practice/runtime/practice.sqlite
data/sql-practice/runtime/practice.sqlite.seedhash
```

관련 코드:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`

`POST /api/sql/seeds/activate`가 호출되면:

1. 요청한 seed 파일을 검증한다.
2. `active-seed.json`에 현재 seed를 저장한다.
3. `practice.sqlite`를 삭제 후 새 seed 기준으로 다시 만든다.

그래서 active seed 변경과 runtime DB 변경이 모두 전역으로 전파된다.

## 변경 방향

active seed와 runtime DB를 `userId` 기준으로 분리한다.

```text
data/sql-practice/users/{userKey}/active-seed.json
data/sql-practice/runtime/users/{userKey}/practice.sqlite
data/sql-practice/runtime/users/{userKey}/practice.sqlite.seedhash
```

`userKey`는 파일 경로 안전성을 위해 `userId`를 그대로 쓰지 말고 helper로 정규화한다.

예시:

```ts
private getUserRuntimeKey(userId: string) {
  const safe = userId.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
  const hash = createHash('sha256').update(userId).digest('hex').slice(0, 8);
  return `${safe || 'user'}-${hash}`;
}
```

## 백엔드 변경 계획

### 1. Controller에서 userId 전달

현재 아래 API는 로그인은 되어 있지만 service 호출에 `req.user.id`를 넘기지 않는다.

- `GET /api/sql/meta`
- `GET /api/sql/seeds`
- `POST /api/sql/seeds/activate`
- `GET /api/sql/tables`
- `GET /api/sql/tables/:tableName`
- `POST /api/sql/execute`
- `POST /api/sql/reset`
- `POST /api/sql/reload-seed`

이 메서드들에 `@Req() req: SessionRequest`를 추가하고 service에 `req.user.id`를 넘긴다.

예시:

```ts
@Get('meta')
meta(@Req() req: SessionRequest) {
  return this.sqlPracticeService.getMeta(req.user.id);
}
```

### 2. Service public method에 userId 추가

아래 public method signature를 변경한다.

```ts
getMeta(userId: string)
listSeeds(userId: string)
activateSeed(payload: unknown, userId: string)
getTables(userId: string)
getTable(tableName: string, userId: string)
execute(payload: unknown, userId: string)
reset(userId: string)
reloadSeed(userId: string)
```

`gradeAndSaveSubmission(body, userId)`는 이미 `userId`를 받는다.
다만 내부 문법 검사용 SQL 실행도 개인 DB를 사용해야 하므로 `executeSubmittedSqlForGrade(input.submittedSql, userId)`로 바꾼다.

### 3. Runtime DB helper를 userId 기반으로 변경

현재 helper:

```ts
private getDatabaseFile()
private getSeedStateFile()
private openDatabase()
private ensureDatabaseFresh()
private rebuildDatabase()
```

변경 후:

```ts
private getBaseDatabaseFile()
private getDatabaseFile(userId: string)
private getSeedStateFile(userId: string)
private openDatabase(userId: string)
private ensureDatabaseFresh(userId: string)
private rebuildDatabase(userId: string, currentHash?: string, activeSeed?: ResolvedSeed)
```

`SQL_PRACTICE_DB_FILE=./data/sql-practice/runtime/practice.sqlite` 설정은 “기본 파일명과 기준 디렉터리”로 해석한다.
실제 사용자별 DB는 그 하위 `users/{userKey}/practice.sqlite`에 만든다.

### 4. Active seed helper를 userId 기반으로 변경

현재 helper:

```ts
private getActiveSeedStateFile()
private readActiveSeedState()
private writeActiveSeedState(state)
private resolveActiveSeedFile()
```

변경 후:

```ts
private getActiveSeedStateFile(userId: string)
private readActiveSeedState(userId: string)
private writeActiveSeedState(userId: string, state: ActiveSeedState)
private resolveActiveSeedFile(userId: string)
```

`SQL_PRACTICE_ACTIVE_SEED_FILE=./data/sql-practice/active-seed.json` 설정은 기준 파일명으로만 사용하고, 실제 저장은 아래로 분리한다.

```text
data/sql-practice/users/{userKey}/active-seed.json
```

### 5. Seed 목록의 active 표시도 사용자별로 계산

`listSeeds(userId)`에서 `resolveActiveSeedFile(userId)`를 사용한다.
그러면 seed manager dialog의 “현재 파일” 표시가 사용자별로 달라진다.

### 6. Reset/reload는 개인 DB만 초기화

`reset(userId)`와 `reloadSeed(userId)`는 현재 사용자의 active seed 기준으로 해당 사용자 DB만 rebuild한다.

다른 사용자의 DB 파일은 삭제하지 않는다.

## 프론트엔드 변경 계획

필수 변경은 없다.

프론트는 기존처럼 같은 API를 호출한다.
백엔드가 세션 userId 기준으로 active seed와 DB를 분리하면 화면은 자연스럽게 사용자별 상태를 받는다.

다만 UX 문구는 바꾸는 편이 좋다.

- `SQL 연습 DB를 초기화했습니다.` → `내 SQL 연습 DB를 초기화했습니다.`
- `현재 SQL 연습 파일을 다시 적용했습니다.` → `내 SQL 연습 파일을 다시 적용했습니다.`
- `파일로 이동했습니다.` → `내 연습 파일을 ...로 변경했습니다.`

위 문구는 `towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts`에서 toast만 수정하면 된다.

## 데이터 호환성

기존 공용 파일은 자동 마이그레이션하지 않는다.

기존 파일:

```text
data/sql-practice/active-seed.json
data/sql-practice/runtime/practice.sqlite
```

변경 후 첫 접속 시 각 사용자는 기본 seed인 `01_board_basic.sql` 또는 설정된 `SQL_PRACTICE_SEED_FILE` 기준으로 자기 DB를 새로 만든다.

이유:

- 공용 DB를 특정 사용자에게 귀속시키면 다른 사용자 상태를 잘못 가져가는 문제가 생긴다.
- SQL 연습 DB는 seed로 재생성 가능한 runtime 데이터다.
- 개인 풀이 기록과 랭킹은 메인 DB에 이미 별도로 저장되어 있다.

## 주의할 점

`executeSubmittedSqlForGrade`도 반드시 사용자별 DB를 써야 한다.
여기를 놓치면 화면에서 보이는 테이블은 개인 DB인데, 채점 문법 검사는 공용 DB 기준으로 동작하는 불일치가 생긴다.

`getSeedHash`는 userId가 아니라 active seed 파일 내용만 보면 된다.
다만 기본값으로 `resolveActiveSeedFile()`을 호출하던 구조는 제거하고, 호출부에서 `activeSeed`를 명시적으로 넘기는 편이 안전하다.

운영 서버에 사용자 수가 많아지면 `data/sql-practice/runtime/users/*`에 SQLite 파일이 누적된다.
지금 단계에서는 유지하고, 필요하면 나중에 “최근 접속 기준 N일 미사용 runtime DB 정리” 배치를 별도 작업으로 추가한다.

## 검증 체크리스트

1. A 사용자 로그인 후 `02_shop_order.sql`로 변경
2. B 사용자 로그인 후 `/sql` 접속 시 기본 `01_board_basic.sql` 유지 확인
3. A 사용자가 `CREATE TABLE temp_a (...)` 실행
4. B 사용자 테이블 목록에 `temp_a`가 없는지 확인
5. A 사용자 reset 실행 후 A DB만 초기화되는지 확인
6. B 사용자 active seed와 테이블 목록이 유지되는지 확인
7. A/B 각각 문제 제출 후 랭킹과 활동 로그가 seedFile 기준으로 정상 집계되는지 확인
8. 서버 재시작 후 A/B의 active seed가 각자 유지되는지 확인

## 구현 대상 파일

```text
towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts
towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts
towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts
```

프론트 파일은 toast 문구 개선용이라 필수는 아니다.

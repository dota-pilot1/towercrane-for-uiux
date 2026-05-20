# SQL 연습장(개인) 구현 계획

## 목표

`SQL 연습장(개인)`은 현재 `/sql/user`의 문제 출제/풀이/채점 경험을 유지하되, 문제 관리 범위를 “내가 만든 개인 연습장”으로 분리한다.

핵심 요구사항은 다음과 같다.

1. 로그인한 사용자만 개인 문제를 등록, 수정, 삭제, 공유 설정할 수 있다.
2. 개인 문제는 `/sql/personal`에서 별도 관리한다.
3. 공유 링크가 만들어진 문제는 별도 공개 페이지에서 로그인하지 않은 사람도 풀 수 있다.
4. 기존 `/sql/user`는 공용 유저 문제 목록으로 유지하고, 개인 문제와 섞이지 않게 한다.
5. 이후 개인 SQL 파일 교체가 가능하도록 연습장 파일/스키마 버전을 문제와 분리한다.
6. UI 색상은 `AGENTS.md` 규칙대로 semantic token 또는 `ui-*` 유틸만 사용한다.

## 구현 방향

개인 연습장은 기존 `sql_user_practice_problems`에 `scope = personal`만 붙이는 방식으로 끝내지 않는다.

파일 교체를 고려하면 “문제”와 “DB 파일/스키마”를 별도 도메인으로 분리해야 한다. 문제가 특정 테이블/컬럼/정답 SQL에 의존하기 때문에, 파일이 바뀐 뒤에도 기존 문제와 공유 링크는 생성 당시의 schema version 기준으로 계속 풀려야 한다.

현재 `/sql/user`가 이미 갖고 있는 기반은 재사용한다.

- 공용 커머스 seed DB: `src/sql-practice/user-seeds/user_commerce.sql`
- 정답 SQL 검증: `validateAnswerSql`
- 풀이 채점: `gradeUserPracticeProblem`
- 프론트 문제 등록/풀이 UI: `sql-user-practice-page.tsx`

다만 개인 도메인은 아래처럼 별도 테이블로 잡는다.

```text
personal workspace
  - 사용자의 개인 연습장 단위
  - active schema version을 가짐

schema version
  - 업로드/교체된 SQL 파일 또는 sqlite 파일의 버전
  - schemaSql, erdMmd, dbFileHash 보관

personal problem
  - workspaceId + schemaVersionId에 묶임
  - 정답 SQL은 해당 schema version 기준으로 검증

personal share
  - problemId + schemaVersionId + token
  - 공유 링크는 항상 특정 schema version을 기준으로 풀이
```

```text
현재
/sql/user
  - 로그인 필요
  - 유저들이 만든 공용 문제 목록
  - 로그인한 유저가 문제 등록 가능

추가
/sql/personal
  - 로그인 필요
  - 내가 만든 개인 연습장/문제 관리
  - 기본 개인 연습장은 자동 생성
  - 이후 SQL 파일 교체 가능

/sql/personal/workspaces/:workspaceId
  - 해당 개인 연습장의 문제 목록/출제/풀이

/sql/personal/workspaces/:workspaceId/files
  - 이후 파일 업로드/교체 화면

/share/sql/personal/:token
  - 로그인 불필요
  - 공유된 단일 문제 풀이
  - SELECT/WITH 답안만 실행/채점
```

## 단계별 문서

1. [00-현재-구조-정리.md](./단계별 구현 계획/00-현재-구조-정리.md)
2. [01-DB-모델-확장-계획.md](./단계별 구현 계획/01-DB-모델-확장-계획.md)
3. [02-백엔드-API-서비스-계획.md](./단계별 구현 계획/02-백엔드-API-서비스-계획.md)
4. [03-프론트-데이터-계층-계획.md](./단계별 구현 계획/03-프론트-데이터-계층-계획.md)
5. [04-프론트-UI-공통화와-개인-페이지-계획.md](./단계별 구현 계획/04-프론트-UI-공통화와-개인-페이지-계획.md)
6. [05-공개-공유-풀이-페이지-계획.md](./단계별 구현 계획/05-공개-공유-풀이-페이지-계획.md)
7. [06-검증-체크리스트.md](./단계별 구현 계획/06-검증-체크리스트.md)
8. [07-파일-교체-도메인-계획.md](./단계별 구현 계획/07-파일-교체-도메인-계획.md)

## 우선순위

```text
개인 workspace/schema version DB 추가
→ 기본 개인 workspace 자동 생성
→ 개인 문제 API
→ 공유 token API
→ 프론트 API/query 타입
→ /sql/user UI 공통화
→ /sql/personal 구현
→ /share/sql/personal/:token 구현
→ 파일 교체 도메인 확장
→ 권한/공유/채점 검증
```

## 구현 시 주의사항

- `/sql/user`는 기존 공용 유저 문제 도메인으로 유지한다.
- `/sql/personal`은 `sql_personal_practice_*` 도메인을 사용한다.
- 개인 문제는 반드시 `workspace_id`와 `schema_version_id`를 가진다.
- 개인 문제의 정답 SQL은 저장 시 해당 schema version DB에서 검증한다.
- 파일 교체 시 기존 schema version과 기존 문제/공유 링크는 보존한다.
- 개인 문제 등록/수정/삭제/공유는 반드시 로그인 사용자 본인 문제만 허용한다.
- 공개 공유 페이지는 token 기반으로 접근한다. user id를 URL에 노출하지 않는다.
- 공개 풀이 API는 인증을 건너뛰되, 공유 token이 없거나 공유 해제된 문제는 `404`로 처리한다.
- 공개 풀이에서도 `SELECT/WITH`만 허용하고 기존 SQL safety 로직을 재사용한다.
- 익명 풀이 결과는 MVP에서는 저장하지 않는다. 필요하면 이후 `sql_personal_practice_public_submissions` 같은 별도 로그 테이블로 확장한다.

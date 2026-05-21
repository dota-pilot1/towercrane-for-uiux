# Step 2. 제출한 채점 결과 저장 및 유저별 랭킹 출력 구현

## 목표

SQL 연습장 문제 풀이 제출 결과를 사용자별로 저장하고, 현재 seed의 풀이 상태와 총점을 화면에 보여준다. 문제 목록에는 각 문제의 최신/최고 채점 상태를 아이콘으로 표시하고, 사이드바 하단에는 총점과 `랭킹 보기` 버튼을 배치한다.

## 핵심 UX

1. 문제 풀이 제출
   - 사용자가 문제 본문 `정답 입력` textarea에 SQL을 입력하고 `제출`을 누른다.
   - Gemini가 실제 정답 SQL과 사용자 SQL을 비교한다.
   - 결과가 `정답`이면 1점, `오답`이면 0점으로 저장한다.
   - 채점 피드백은 기존처럼 입력창 바로 아래에 표시한다.

2. 왼쪽 문제 목록 상태 표시
   - 각 문제 제목 오른쪽에 풀이 상태 아이콘을 표시한다.
   - 정답: `CheckCircle` 계열 아이콘
   - 오답: `XCircle` 계열 아이콘
   - 아직 제출하지 않은 문제는 아이콘 없음
   - 한 문제를 여러 번 제출한 경우, 목록 아이콘과 총점은 해당 문제의 최고 점수 기준으로 표시한다.

3. 사이드바 하단 총점
   - 현재 seed + 현재 레벨 필터 기준이 아니라, 현재 seed 전체 문제 기준으로 총점을 계산한다.
   - 예: `총점 7 / 30`
   - 총점 옆에 `랭킹 보기` 다이어로그 버튼을 배치한다.

4. 랭킹 다이어로그
   - 현재 seed 기준 사용자별 총점 랭킹을 표시한다.
   - 표시 컬럼: 순위, 사용자 이름, 점수, 정답 수, 제출 문제 수, 최근 제출 시간
   - 동점은 점수가 같으면 같은 순위 또는 최근 제출 빠른 순 정렬 중 하나를 선택한다.
   - 기본안: 점수 내림차순, 최근 제출 시간 오름차순, 이름 오름차순으로 정렬한다.

## 점수 정책

- 문제 1개당 최고 1점.
- Gemini 응답이 `[SQL_CORRECT]`이면 `score=1`, `[SQL_INCORRECT]`이면 `score=0`.
- Gemini가 판정 태그를 누락하면 저장하지 않고 사용자에게 “채점 결과를 판별하지 못했습니다” 오류를 보여준다.
- 제출 이력은 모두 저장한다.
- 총점과 랭킹은 `user_id + seed_file + example_id`별 최고 점수만 합산한다.
- 같은 문제를 오답 후 정답으로 다시 제출하면 총점은 0점에서 1점으로 올라간다.
- 정답 후 오답을 다시 제출해도 최고 점수 기준 총점은 유지한다. 단, 최근 제출 피드백은 최신 결과를 보여줄 수 있다.

## DB 설계

### 신규 테이블: `sql_practice_submissions`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | text PK | 제출 ID |
| `user_id` | text FK users(id) | 제출 사용자 |
| `seed_file` | text not null | 문제 seed 파일명 |
| `seed_hash` | text | 제출 당시 seed hash |
| `example_id` | text not null | 프론트 문제 ID |
| `example_title` | text not null | 문제 제목 |
| `example_level` | text not null | beginner/intermediate/advanced |
| `example_order` | integer not null | 문제 순서 |
| `submitted_sql` | text not null | 사용자가 제출한 SQL |
| `answer_sql` | text not null | 채점에 사용한 모범 SQL |
| `is_correct` | integer boolean not null | 정답 여부 |
| `score` | integer not null default 0 | 획득 점수 |
| `max_score` | integer not null default 1 | 문제 최대 점수 |
| `feedback` | text not null | Gemini 피드백 본문 |
| `gemini_raw` | text | 태그 포함 원본 응답 |
| `created_at` | text not null | 제출 시간 |

### 인덱스

- `idx_sql_practice_submissions_user_seed_created`
  - `(user_id, seed_file, created_at)`
- `idx_sql_practice_submissions_user_seed_example`
  - `(user_id, seed_file, example_id)`
- `idx_sql_practice_submissions_seed_score`
  - `(seed_file, score, created_at)`

### 마이그레이션

- `towercrane-for-uiux-server/src/database/schema.ts`에 Drizzle 테이블 추가
- `towercrane-for-uiux-server/src/database/database.service.ts`의 `CREATE TABLE IF NOT EXISTS`에도 추가
- 운영/개발 DB 모두 안전하게 생성되도록 `CREATE TABLE IF NOT EXISTS` 방식 유지
- 필요 시 drizzle migration 파일 생성

## 백엔드 API 설계

### `POST /sql/submissions/grade`

사용자 제출 SQL을 Gemini로 채점하고, 결과를 저장한다.

요청:

```json
{
  "seedFile": "01_board_basic.sql",
  "seedHash": "ad9ae402b7",
  "exampleId": "01-board-basic-beginner-01",
  "exampleTitle": "사용자 가입일순 목록",
  "exampleLevel": "beginner",
  "exampleOrder": 1,
  "description": "전체 사용자 목록을...",
  "hint": "특정 컬럼을 기준으로...",
  "relatedTables": ["users"],
  "submittedSql": "SELECT ...",
  "answerSql": "SELECT ..."
}
```

응답:

```json
{
  "submission": {
    "id": "...",
    "isCorrect": true,
    "score": 1,
    "maxScore": 1,
    "feedback": "..."
  },
  "summary": {
    "seedFile": "01_board_basic.sql",
    "totalScore": 7,
    "maxScore": 30,
    "correctCount": 7,
    "submittedCount": 9
  }
}
```

구현 포인트:

- 기존 `/sql/gemini`의 `grading` 프롬프트를 서비스 내부 함수로 분리해 재사용한다.
- 저장은 Gemini 태그 파싱 후 수행한다.
- 컨트롤러는 `@Req()`에서 `req.user.id`를 받아 본인 제출로 저장한다.
- 클라이언트가 보낸 `score`를 신뢰하지 않는다. 서버가 `[SQL_CORRECT]` 여부로 점수를 계산한다.

### `GET /sql/submissions/mine?seedFile=...`

현재 사용자의 seed별 제출 상태를 조회한다.

응답:

```json
{
  "seedFile": "01_board_basic.sql",
  "summary": {
    "totalScore": 7,
    "maxScore": 30,
    "correctCount": 7,
    "submittedCount": 9
  },
  "byExample": {
    "01-board-basic-beginner-01": {
      "bestScore": 1,
      "isCorrect": true,
      "lastSubmittedAt": "2026-05-13T13:00:00.000Z"
    }
  }
}
```

구현 포인트:

- 서버는 저장된 제출 데이터만 반환한다.
- `maxScore`는 프론트 문제 수를 서버가 모르기 때문에 선택지가 있다.
  - 기본안: 프론트가 전체 문제 수를 알고 있으므로 `maxScore`는 프론트에서 계산한다.
  - 서버 응답 summary의 `maxScore`는 저장된 문제 기준으로 두거나 생략 가능.
- 최종 구현에서는 프론트가 `exampleSet` 전체 개수를 기준으로 `총점 / 전체 문제 수`를 표시한다.

### `GET /sql/submissions/ranking?seedFile=...`

현재 seed 기준 사용자별 랭킹을 조회한다.

응답:

```json
{
  "seedFile": "01_board_basic.sql",
  "rankings": [
    {
      "rank": 1,
      "userId": "...",
      "userName": "Seed User",
      "totalScore": 10,
      "correctCount": 10,
      "submittedCount": 12,
      "lastSubmittedAt": "2026-05-13T13:00:00.000Z"
    }
  ]
}
```

구현 포인트:

- 사용자별/문제별 최고 점수만 합산한다.
- 랭킹 조회는 인증 사용자만 가능하게 유지한다.
- 이름은 `users` 테이블과 join해서 표시한다.

## 프론트 구현 계획

### 타입/API

수정 파일:

- `towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts`
- `towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts`
- `towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts`

추가 타입:

- `SqlPracticeSubmission`
- `SqlPracticeGradePayload`
- `SqlPracticeGradeResponse`
- `SqlPracticeSubmissionSummary`
- `SqlPracticeSubmissionStatusByExample`
- `SqlPracticeRankingItem`

추가 훅:

- `useSqlPracticeMySubmissions(seedFile)`
- `useGradeSqlPracticeSubmission()`
- `useSqlPracticeRanking(seedFile, enabled)`

### 문제 패널

수정 파일:

- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`

변경 내용:

- 기존 `sqlPracticeApi.geminiAsk(..., 'grading')` 직접 호출을 `POST /sql/submissions/grade` 호출로 교체한다.
- 제출 성공 시:
  - 피드백 표시
  - 정답/오답 배지 표시
  - `mine submissions` 쿼리 invalidate
  - 랭킹 쿼리 invalidate
- 문제 전환 시 입력/피드백 초기화는 유지한다.

### 문제 사이드바

수정 파일:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-quiz-sidebar.tsx`

변경 내용:

- props에 `submissionStatusByExample`, `totalScore`, `maxScore`, `onOpenRanking` 추가
- 각 문제 버튼 오른쪽에 상태 아이콘 추가
- 사이드바 하단 고정 영역 추가
  - `총점 7 / 30`
  - `랭킹 보기` 버튼
- raw Tailwind 팔레트 금지. `text-brand-primary`, `text-destructive`, `bg-brand-glass`, `border-surface-border` 등 semantic token 사용

### 랭킹 다이어로그

신규 파일 후보:

- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-ranking-dialog.tsx`

UI:

- Radix Dialog 사용
- 제목: `SQL 랭킹`
- 현재 seed 파일명 표시
- 표 또는 리스트 형태로 순위 표시
- 내 사용자 row는 `bg-brand-glass` 정도로 강조
- 로딩/빈 상태 처리

## 백엔드 구현 계획

수정 파일:

- `towercrane-for-uiux-server/src/database/schema.ts`
- `towercrane-for-uiux-server/src/database/database.service.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.schemas.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.types.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`

작업 순서:

1. `sqlPracticeSubmissionsTable` 추가
2. `CREATE TABLE IF NOT EXISTS sql_practice_submissions` 추가
3. 제출/랭킹용 zod schema 추가
4. Gemini grading 프롬프트 빌더와 응답 파서 서비스 함수로 분리
5. `gradeAndSaveSubmission` 서비스 메서드 추가
6. `getMySubmissionSummary` 서비스 메서드 추가
7. `getRanking` 서비스 메서드 추가
8. 컨트롤러 endpoint 연결

## 구현 순서

1. step2 문서 확정
2. 백엔드 DB 테이블/스키마/API 구현
3. 프론트 API 타입/쿼리 훅 추가
4. 문제 제출 호출을 저장형 API로 교체
5. 왼쪽 사이드바 상태 아이콘/총점/랭킹 버튼 추가
6. 랭킹 다이어로그 추가
7. 타입체크/빌드
8. 가능하면 로그인된 로컬 화면에서 실제 제출 저장과 랭킹 표시 확인

## 검증 체크리스트

- [ ] 오답 제출 시 입력창 아래에 오답 피드백이 보인다.
- [ ] 정답 제출 시 입력창 아래에 정답 피드백이 보인다.
- [ ] 제출 후 왼쪽 문제 목록에 정답/오답 아이콘이 표시된다.
- [ ] 오답 후 정답 제출 시 총점이 올라간다.
- [ ] 정답 후 오답 제출 시 총점은 떨어지지 않는다.
- [ ] seed를 바꾸면 해당 seed 기준 상태/총점으로 바뀐다.
- [ ] 랭킹 다이어로그에서 사용자별 총점이 보인다.
- [ ] 프론트 `npm run typecheck` 통과
- [ ] 프론트 `npm run build` 통과
- [ ] 서버 `npm run build` 통과
- [ ] SQL 연습장 관련 파일에 금지된 raw Tailwind 팔레트 색상 추가 없음

## 결정 필요 사항

현재 계획의 기본안은 아래처럼 둔다.

- 점수: 문제당 1점
- 저장: 모든 제출 이력 저장
- 총점/랭킹: 문제별 최고 점수 합산
- 랭킹 범위: 현재 seed 기준
- 총점 분모: 현재 seed 전체 문제 수

구현 전에 바꿀 수 있는 선택지는 다음과 같다.

- 오답 감점 여부: 기본안은 감점 없음
- 랭킹 범위: 현재 seed 기준 또는 전체 seed 통합
- 같은 점수 정렬: 최근 제출 빠른 순 또는 최근 제출 늦은 순

# GitHub PR Review 상세 구현 계획

## 1. 목표

사용자가 상단 바에 GitHub PR URL을 붙여 넣고 `분석`을 누르면 다음을 자동 수행한다.

1. URL이 실제 GitHub Pull Request인지 검증한다.
2. GitHub에서 PR 실제 제목과 메타데이터, 변경 파일, diff, 필요한 코드 컨텍스트를 수집한다.
3. 사용자가 미리 정한 리뷰 기준과 이번 리뷰 참고사항을 AI에 함께 전달한다.
4. 기준별 결과를 구조화된 JSON으로 받아 서버에서 검증한다.
5. PR 실제 제목으로 리뷰 히스토리를 저장한다.
6. 왼쪽 PR 목록과 오른쪽 단일 리뷰 본문으로 결과를 보여준다.

성공 기준은 “AI가 그럴듯한 문서를 생성”하는 것이 아니라, 사용자가 정한 각 기준에 대해 코드 근거를 가진 결과가 정확히 하나씩 반환되는 것이다.

## 2. 기존 구현 진단

### 이미 있는 것

- `CodeReviewsService.parseGithubSource()`는 `/pull/:number`를 `sourceType: 'pr'`로 파싱한다.
- PR의 `.diff`를 가져오고 파일별 diff를 분리한다.
- PR API에서 head SHA를 조회한 뒤 변경 파일 전체 내용을 읽는다.
- import 경로를 따라 연관 파일을 추가 수집한다.
- lock/generated/build 파일과 지나치게 큰 diff를 제외한다.
- OpenAI JSON 응답과 로컬 휴리스틱 리뷰를 지원한다.
- 분석 결과 목록/상세/수정/삭제, 업무 연결, 공유 URL 기능이 있다.
- 프론트 타입에는 이미 `sourceType: 'pr'`가 있다.

### 현재 PR 전용 화면으로 쓰기 어려운 점

- 프론트 URL 검증이 commit URL만 허용한다.
- 화면 설명과 placeholder도 commit 중심이다.
- 리뷰 제목이 AI 응답에 의존하며 GitHub PR 실제 제목을 저장하지 않는다.
- 고정된 `structure/process/code/syntax/architecture/diagram` 섹션만 선택할 수 있다.
- 사용자별 리뷰 기준 이름과 상세 지침을 저장할 곳이 없다.
- 현재 중복 키는 기준 목록 전체를 반영하지 않아 같은 diff라도 다른 기준의 리뷰가 재사용될 수 있다.
- GitHub 요청에 인증 헤더가 없어 비공개 저장소 및 낮은 rate limit에 취약하다.
- AI 실패 시 휴리스틱 결과로 조용히 대체되어 사용자가 AI 분석 성공 여부를 구분하기 어렵다.
- `CodeReviewsPage` 한 파일에 업로드, 분석, 목록, 상세, 다이얼로그가 모여 있어 새 UX를 그대로 덧붙이면 유지보수가 더 어려워진다.

## 3. 정보 구조와 상태

### 화면 상태

| 상태 | 오른쪽 본문 |
|---|---|
| 최초 진입, 이력 없음 | PR URL 입력 안내와 리뷰 기준 요약 |
| 이력은 있으나 선택 없음 | 가장 최근 리뷰 자동 선택 |
| 분석 중 | `PR 확인 → diff 수집 → 기준별 분석 → 저장` 진행 상태 |
| 완료 | PR 메타데이터 + 전체 요약 + 기준별 결과 |
| 실패 | 실패 단계와 재시도 가능한 메시지 |
| PR 갱신됨 | 저장된 head SHA와 현재 head SHA가 다르다는 배너 + 재분석 버튼 |

### 왼쪽 목록 한 행

- `repository #number`
- GitHub PR 제목
- 전체 판정: 문제 있음 / 주의 / 발견 없음
- 문제·주의 개수
- 분석 시각
- 새 커밋 존재 배지

AI가 목록 제목을 생성하지 않는다.

### 오른쪽 본문

1. PR 헤더
2. 전체 요약
3. 기준별 결과
4. 검토한 파일 / 제외한 파일
5. 분석 정보: 기준 버전, 모델, head SHA, 분석 시각

기준별 결과 카드는 3개 이상 반복되므로
`shared/ui/` 또는 기능 전용 재사용 컴포넌트로 분리한다.

## 4. 데이터 모델

기존 `code_reviews`를 유지해 과거 데이터와 업무 연결을 보존한다. PR 전용 필드를 nullable/default 형태로 추가한다.

### 4.1 `github_pr_review_settings`

사용자별 기본 리뷰 기준을 저장하는 새 테이블이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | TEXT PK/FK | 사용자당 한 설정 |
| `criteria` | JSON TEXT | `ReviewCriterion[]` |
| `version` | INTEGER | 설정 수정 시 증가 |
| `created_at` | TEXT | 생성 시각 |
| `updated_at` | TEXT | 수정 시각 |

`ReviewCriterion`:

```ts
type ReviewCriterion = {
  id: string
  title: string
  instruction: string
  enabled: boolean
  orderIdx: number
}
```

제약:

- 활성 기준 1~10개
- 제목 1~60자
- 지침 1~1000자
- `id`는 서버 생성 UUID
- 저장 시 `orderIdx`를 0부터 재정규화

### 4.2 `code_reviews` 추가 필드

| 컬럼 | 타입 | 기본값/설명 |
|---|---|---|
| `pr_number` | INTEGER nullable | PR 번호 |
| `pr_title` | TEXT nullable | GitHub 실제 제목 |
| `pr_state` | TEXT nullable | `open/closed/merged` |
| `pr_author_login` | TEXT nullable | GitHub 작성자 |
| `base_ref` | TEXT nullable | 대상 브랜치 |
| `head_ref` | TEXT nullable | 변경 브랜치 |
| `head_sha` | TEXT nullable | 분석한 PR 버전 |
| `pr_updated_at` | TEXT nullable | GitHub 갱신 시각 |
| `review_note` | TEXT nullable | 이번 리뷰 참고사항 |
| `criteria_snapshot` | JSON TEXT | 분석 당시 기준 |
| `criterion_results` | JSON TEXT | 기준별 구조화 결과 |

과거 행은 `criteria_snapshot=[]`, `criterion_results=[]`로 읽히게 한다.

`criterion_results`가 새 화면의 원본이다. 필요하면 기존 `findings`는 하위 호환 표시용으로 서버에서 파생한다. 서로 다른 두 결과를 별도로 AI에 생성시키지 않는다.

### 4.3 분석 식별자

기존 `sourceUrl + diffHash` 대신 다음 값으로 분석 fingerprint를 만든다.

```text
sha256(
  canonicalPrUrl
  + headSha
  + normalizedCriteriaSnapshot
  + normalizedReviewNote
  + promptContractVersion
)
```

- fingerprint가 같으면 기존 완료 결과를 반환하고 `duplicate: true`로 표시한다.
- head SHA, 리뷰 기준, 참고사항 중 하나라도 달라지면 새 버전을 저장한다.
- 같은 PR의 과거 버전은 삭제하지 않아 변경 전후를 추적할 수 있게 한다.

## 5. 백엔드 설계

### 5.1 기존 서비스 분리

`CodeReviewsService`의 동작을 바꾸지 않는 리팩터링부터 한다.

```text
src/code-reviews/
├─ code-reviews.controller.ts
├─ code-reviews.service.ts
├─ code-reviews.schemas.ts
├─ code-review-style-guide.ts
├─ github/
│  ├─ github-source.parser.ts
│  ├─ github-pr.client.ts
│  └─ github-diff.parser.ts
└─ analysis/
   ├─ code-review-analyzer.service.ts
   ├─ code-review-normalizer.ts
   └─ code-review-fingerprint.ts
```

- URL 파서: 오직 `https://github.com/{owner}/{repo}/pull/{number}`만 PR 분석 API에서 허용
- GitHub client: PR 메타데이터, diff, head 파일, 연관 파일 수집
- analyzer: 프롬프트 및 AI 호출
- normalizer: AI JSON 검증, 기준 누락/중복 차단
- fingerprint: 안정적인 JSON 정렬 후 해시

리팩터링 전후 기존 commit/compare 분석 테스트가 동일하게 통과해야 한다.

### 5.2 GitHub 수집

PR 메타데이터:

```text
GET /repos/{owner}/{repo}/pulls/{number}
Accept: application/vnd.github+json
Authorization: Bearer GITHUB_TOKEN  // 설정된 경우에만
```

diff:

```text
GET /repos/{owner}/{repo}/pulls/{number}
Accept: application/vnd.github.diff
```

필요하면 현재 `.diff` URL 방식을 public fallback으로 유지한다.

규칙:

- 브라우저가 GitHub API를 직접 호출하지 않는다.
- `GITHUB_TOKEN`은 서버 환경변수로만 읽고 로그·응답·DB에 남기지 않는다.
- GitHub hostname을 엄격히 고정해 SSRF를 막는다.
- 404는 “PR이 없거나 접근 권한 없음”, 403 rate limit은 재시도 시각을 포함해 구분한다.
- 최대 diff 80,000자, 최대 변경 파일 30개라는 현재 제한은 MVP에서 유지하고 UI에 제외 사유를 보인다.
- 분석한 `headSha`를 반드시 저장한다.

### 5.3 API

기존 `/api/code-reviews` 네임스페이스를 유지해 중복 백엔드를 만들지 않는다.

| Method | Path | 용도 |
|---|---|---|
| `GET` | `/code-reviews?sourceType=pr&q=...` | PR 리뷰 목록 |
| `GET` | `/code-reviews/:id` | 상세 |
| `POST` | `/code-reviews/pr/analyze` | PR 전용 분석 |
| `POST` | `/code-reviews/:id/check-freshness` | 현재 head SHA 비교 |
| `DELETE` | `/code-reviews/:id` | 본인/Admin 삭제 |
| `GET` | `/code-reviews/preferences` | 내 리뷰 기준 |
| `PUT` | `/code-reviews/preferences` | 내 리뷰 기준 저장 |

`POST /code-reviews/pr/analyze`:

```json
{
  "sourceUrl": "https://github.com/owner/repo/pull/123",
  "reviewNote": "인증 만료와 refresh token 경쟁 상태를 특히 확인"
}
```

서버가 로그인 사용자의 활성 기준을 읽어 스냅샷으로 고정한다. 클라이언트가 임의의 숨은 system prompt를 전달할 수 있게 만들지 않는다.

응답은 [REVIEW-CONTRACT.md](./REVIEW-CONTRACT.md)의 구조를 따른다.

### 5.4 AI 실패 정책

- JSON 파싱 또는 스키마 검증 실패 시 한 번만 “JSON 수정” 재요청한다.
- 두 번째도 실패하면 `502`와 명확한 메시지를 반환한다.
- AI가 실패한 경우 기존 휴리스틱 결과를 “AI 리뷰 완료”로 저장하지 않는다.
- 향후 휴리스틱을 제공하려면 별도 `analysisMode: heuristic`으로 명시한다.
- 모델명과 `promptContractVersion`을 결과에 저장한다.

### 5.5 권한

- 목록/상세는 현재 코드 리뷰 정책을 유지하되 팀 공개 범위를 제품 정책으로 확정한다.
- 기준 설정은 본인만 조회/수정한다.
- 리뷰 삭제는 작성자 또는 Admin만 가능하다.
- GitHub 토큰이나 OpenAI 키는 API 응답에 절대 포함하지 않는다.

## 6. 프론트엔드 설계

### 6.1 FSD 구조

```text
towercrane-for-uiux-front/src/
├─ entities/github-pr-review/
│  ├─ api/github-pr-review-api.ts
│  └─ model/types.ts
├─ features/github-pr-review/
│  ├─ model/use-github-pr-review-queries.ts
│  ├─ ui/pr-review-input-bar.tsx
│  └─ ui/review-criteria-dialog.tsx
├─ widgets/github-pr-review/
│  ├─ pr-review-history-sidebar.tsx
│  ├─ pr-review-detail.tsx
│  ├─ review-criterion-section.tsx
│  └─ review-analysis-progress.tsx
└─ pages/github-pr-review/
   └─ ui/github-pr-review-page.tsx
```

새 페이지는 조립만 담당한다. 현재 `code-reviews-page.tsx`처럼 모든 책임을 한 파일에 넣지 않는다.

### 6.2 라우트

```text
/github-pr-review
/github-pr-review/:reviewId
```

TanStack Router의 현재 형식에 맞춰 `router.tsx`에 두 라우트를 등록한다.

`/code-reviews`의 처리:

- 첫 배포에서는 유지해 기존 공유 URL을 깨지 않는다.
- 새 화면 안정화 후 목록 라우트만 `/github-pr-review`로 redirect할지 결정한다.
- 기존 `/code-reviews/:reviewId` 공유 링크는 영구 유지하거나 상세 redirect를 제공한다.

### 6.3 입력 바

- PR URL input
- `분석` 버튼
- 접을 수 있는 `이번 리뷰 참고사항`
- `리뷰 기준 N개` 설정 버튼

검증 정규식:

```text
https://github.com/{owner}/{repo}/pull/{positiveInteger}
```

commit, compare, repository URL은 즉시 거절하고 올바른 예시를 표시한다.

분석 성공 후 URL input은 비우지 않는다. 사용자가 방금 분석한 대상을 계속 인식할 수 있게 유지하며, 오른쪽 결과 선택 상태와 동기화한다.

### 6.4 리뷰 기준 설정

- 기본 기준을 최초 설정으로 제공
- 제목, 상세 지침, 활성 여부, 순서 변경
- 추가/삭제
- 저장 전 유효성 검사
- `기본값 복원`은 확인 후 실행
- 한 번의 분석에는 저장 시점 기준을 snapshot으로 사용

기준 설정이 바뀌어도 과거 리뷰 결과의 제목과 순서는 변하지 않는다.

### 6.5 상세 결과

기준 섹션은 저장된 snapshot 순서대로 렌더링한다.

각 섹션:

- 기준 이름
- 결과 상태
- 기준별 요약
- 발견 항목 목록
- 각 항목의 severity, 메시지, `filePath:line`, 근거 코드, 개선안

`발견 없음`은 “정상 보장”이 아니라 “제공된 diff와 컨텍스트에서 문제를 발견하지 못함”이라고 tooltip/보조문구로 설명한다.

### 6.6 테마 규칙

AGENTS.md를 그대로 따른다.

- raw Tailwind palette 금지
- 텍스트: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- 패널: `ui-panel`, `ui-panel-soft`
- 입력: `ui-input`
- 보더: `border-surface-border`, `border-surface-border-soft`
- 브랜드: `text-brand-primary`, `bg-brand-glass`, `border-brand-border`
- 위험 상태는 기존 `danger-*` semantic token 재사용

반복되는 “상태 아이콘 + 기준 제목 + 요약”은 하나의 컴포넌트로 승격한다.

## 7. 메뉴 등록

`docs-for-배포/메뉴 추가 방법에 대해.md` 지침에 따라 세 곳을 같이 수정한다.

1. `towercrane-for-uiux-server/src/database/database.service.ts`
   - `github_pr_review` 메뉴 upsert
   - 현재 `개발 도구` 아래에는 Postman만 남기고 다른 항목을 숨기는 로직이 있으므로, `github_pr_review`를 숨김 목록에 넣지 않고 `existingDevManagement.id`의 자식으로 명시한다.
2. `towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx`
   - `github_pr_review: '/github-pr-review'`
   - `getSectionIdFromPath` 분기 추가
3. `towercrane-for-uiux-front/src/app/router.tsx`
   - 목록/상세 라우트 등록

서버 재시작 후 메뉴 upsert가 실행되어야 한다.

## 8. 구현 순서

### 단계 0 — 회귀 기준 고정

- [ ] 현재 code review service의 PR URL 파싱 테스트 추가
- [ ] diff 파일 파싱/제외 규칙 테스트 추가
- [ ] 기존 목록/상세 API smoke test
- [ ] 현재 프론트와 서버 typecheck/build 결과 기록

### 단계 1 — GitHub PR 수집기 분리

- [ ] URL parser 추출
- [ ] GitHub API client 추출
- [ ] diff parser 추출
- [ ] 선택적 `GITHUB_TOKEN` 헤더 적용
- [ ] PR metadata DTO 정의
- [ ] 기존 분석기가 추출된 서비스를 사용하도록 연결

완료 조건: 기존 commit/PR 분석 결과가 리팩터링 전과 호환되고, PR 제목과 head SHA를 안정적으로 얻는다.

### 단계 2 — 설정 및 저장 모델

- [ ] `github_pr_review_settings` Drizzle schema 추가
- [ ] `code_reviews` nullable/default 컬럼 추가
- [ ] `database.service.ts`의 `CREATE TABLE IF NOT EXISTS`/컬럼 보강 로직 추가
- [ ] settings CRUD service/schema 추가
- [ ] criteria snapshot 및 fingerprint 구현
- [ ] 과거 행 역호환 DTO 처리

완료 조건: 기준 변경 후에도 과거 결과가 변하지 않고, 같은 PR을 다른 기준으로 다시 분석할 수 있다.

### 단계 3 — PR 전용 분석 계약

- [ ] `POST /code-reviews/pr/analyze`
- [ ] 사용자 설정 조회 및 활성 기준 검증
- [ ] `reviewNote` 길이/내용 검증
- [ ] 기준별 JSON Schema 프롬프트 적용
- [ ] 누락·중복 기준 정규화
- [ ] 한 번 재시도 후 명시적 실패
- [ ] PR 실제 제목 저장
- [ ] freshness API 구현

완료 조건: 응답의 기준 수·ID·순서가 snapshot과 정확히 일치한다.

### 단계 4 — 새 2열 UI

- [ ] entity 타입/API/query 작성
- [ ] 상단 URL 입력 바
- [ ] 리뷰 기준 설정 dialog
- [ ] 왼쪽 PR 리뷰 목록/검색
- [ ] 분석 진행 UI
- [ ] 오른쪽 상세/빈 상태/오류 상태
- [ ] 파일·라인 근거 및 GitHub 원본 링크
- [ ] PR 갱신 배너 및 재분석
- [ ] 모바일 drawer/단일 열

완료 조건: 제목이나 주제를 수동 생성하지 않고 URL 입력부터 결과 확인까지 한 화면에서 끝난다.

### 단계 5 — 라우팅과 메뉴

- [ ] `/github-pr-review` 등록
- [ ] `/github-pr-review/:reviewId` 등록
- [ ] `github_pr_review` DB 메뉴 upsert
- [ ] 헤더 section/path 양방향 매핑
- [ ] 기존 `/code-reviews` 링크 보존 확인

### 단계 6 — 검증과 배포

- [ ] 서버 unit/integration test
- [ ] 프론트 typecheck/lint/build
- [ ] light/dark/brand 테마 시각 검증
- [ ] public PR 실제 분석 smoke test
- [ ] 잘못된 URL, 닫힌 PR, 대형 PR, rate limit, AI 오류 검증
- [ ] 서버 토큰을 사용한 비공개 PR 검증이 필요한 경우 별도 보안 체크
- [ ] 배포 전 `docs-for-배포`의 백엔드/프론트엔드 문서 확인

## 9. 테스트 시나리오

### URL 및 GitHub

- 정상 public PR
- trailing slash/query가 있는 PR URL
- repository, commit, compare URL
- 존재하지 않는 PR
- 접근 권한 없는 private PR
- closed/merged PR
- 변경 파일 0개
- 파일 30개 초과
- lock/generated 파일만 있는 PR
- GitHub rate limit

### 리뷰 기준

- 최초 기본값 생성
- 1개 기준만 활성
- 10개 기준 활성
- 중복 제목 허용 여부: 허용하되 ID로 구분
- 빈 제목/지침 거절
- 순서 변경
- 분석 후 기준 이름 변경 시 과거 결과 불변

### AI 응답

- 정상 결과
- 기준 하나 누락
- 동일 기준 중복
- 알 수 없는 criterion ID
- 파일 경로/라인 누락
- malformed JSON
- 재시도 성공/실패
- prompt injection 성격의 PR 코드/설명

### 권한과 데이터

- 비로그인 접근 차단
- 다른 사용자의 설정 수정 차단
- 작성자/Admin 삭제
- fingerprint 중복 반환
- 새 head SHA 재분석
- 과거 `/code-reviews/:id` 상세 호환

### UI

- 분석 중 중복 submit 차단
- 목록 검색/선택/URL 상태 동기화
- 길이가 긴 PR 제목
- 긴 파일 경로와 코드 블록
- 빈 상태/실패/재시도
- 1280px 이상 2열
- 태블릿/모바일 1열
- 모든 테마에서 대비 확인

## 10. 수용 기준

- [ ] 사용자는 PR URL과 선택적 참고사항만으로 분석을 시작할 수 있다.
- [ ] 목록과 상세 제목은 GitHub PR 실제 제목이다.
- [ ] 2차 주제와 노트 목록이 없다.
- [ ] 모든 활성 리뷰 기준에 결과가 정확히 하나씩 존재한다.
- [ ] 기준 제목과 순서는 AI가 수정하지 않는다.
- [ ] 발견 항목은 가능한 경우 실제 파일과 라인을 포함한다.
- [ ] 분석한 head SHA와 현재 PR head SHA 차이를 알 수 있다.
- [ ] 같은 PR이라도 기준 또는 참고사항이 다르면 별도 분석된다.
- [ ] GitHub/OpenAI 실패를 성공 결과로 저장하지 않는다.
- [ ] 기존 `/code-reviews` 데이터와 공유 링크를 깨지 않는다.
- [ ] 메뉴 DB upsert, 헤더 맵, 라우터가 모두 등록된다.
- [ ] raw Tailwind palette가 새 코드에 없다.
- [ ] 서버 test/build와 프론트 typecheck/lint/build가 통과한다.

## 11. 예상 변경 파일

기존 파일:

```text
towercrane-for-uiux-server/src/app.module.ts
towercrane-for-uiux-server/src/database/schema.ts
towercrane-for-uiux-server/src/database/database.service.ts
towercrane-for-uiux-server/src/code-reviews/code-reviews.module.ts
towercrane-for-uiux-server/src/code-reviews/code-reviews.controller.ts
towercrane-for-uiux-server/src/code-reviews/code-reviews.service.ts
towercrane-for-uiux-server/src/code-reviews/code-reviews.schemas.ts
towercrane-for-uiux-server/.env.example

towercrane-for-uiux-front/src/app/router.tsx
towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx
```

신규 파일:

```text
towercrane-for-uiux-server/src/code-reviews/github/github-source.parser.ts
towercrane-for-uiux-server/src/code-reviews/github/github-pr.client.ts
towercrane-for-uiux-server/src/code-reviews/github/github-diff.parser.ts
towercrane-for-uiux-server/src/code-reviews/analysis/code-review-analyzer.service.ts
towercrane-for-uiux-server/src/code-reviews/analysis/code-review-normalizer.ts
towercrane-for-uiux-server/src/code-reviews/analysis/code-review-fingerprint.ts
towercrane-for-uiux-server/src/code-reviews/*.spec.ts

towercrane-for-uiux-front/src/entities/github-pr-review/api/github-pr-review-api.ts
towercrane-for-uiux-front/src/entities/github-pr-review/model/types.ts
towercrane-for-uiux-front/src/features/github-pr-review/model/use-github-pr-review-queries.ts
towercrane-for-uiux-front/src/features/github-pr-review/ui/pr-review-input-bar.tsx
towercrane-for-uiux-front/src/features/github-pr-review/ui/review-criteria-dialog.tsx
towercrane-for-uiux-front/src/widgets/github-pr-review/pr-review-history-sidebar.tsx
towercrane-for-uiux-front/src/widgets/github-pr-review/pr-review-detail.tsx
towercrane-for-uiux-front/src/widgets/github-pr-review/review-criterion-section.tsx
towercrane-for-uiux-front/src/widgets/github-pr-review/review-analysis-progress.tsx
towercrane-for-uiux-front/src/pages/github-pr-review/ui/github-pr-review-page.tsx
```

## 12. 후속 확장

MVP 이후 우선순위:

1. GitHub App 설치를 통한 사용자/조직별 private repository 권한
2. 새 커밋 push webhook 수신과 “재분석 필요” 자동 표시
3. 사용자가 선택한 finding만 GitHub inline comment 초안으로 변환
4. CI check 요약을 읽어 리뷰 본문에 참고 정보로 표시
5. 같은 PR의 분석 버전 간 변경점 비교

Approve, Request changes, Merge 같은 쓰기 동작은 별도 권한·감사 로그·명시적 사용자 확인이 준비된 뒤에만 추가한다.

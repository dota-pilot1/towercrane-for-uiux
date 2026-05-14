# 02. Dev Challenge 백엔드 계획

## 목표

`Study Diary`와 완전히 별도인 개발 챌린지 도메인을 만든다. 1차/2차 주제 구조는 유지하고, 본문은 `출제`, `제출`, `검토`에 맞춘다.

## 권장 DB 구조

### `dev_challenge_categories`

1차 주제.

필드:

- `id`
- `name`
- `summary`
- `icon`
- `order_idx`
- `created_by`
- `created_at`
- `updated_at`

### `dev_challenge_sections`

2차 주제.

필드:

- `id`
- `category_id`
- `title`
- `summary`
- `order_idx`
- `created_at`
- `updated_at`

### `dev_challenge_assignments`

출제 주제. Study Diary의 노트 1개와 달리, 챌린지의 실제 문제 단위다.

필드:

- `id`
- `section_id`
- `title`
- `summary`
- `difficulty`
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
- `order_idx`
- `created_by`
- `created_at`
- `updated_at`

### `dev_challenge_assignment_blocks`

출제 본문 블록.

필드:

- `id`
- `assignment_id`
- `block_type`: `NOTE`, `MMD`, `FIGMA`, `CHECKLIST`, `GITHUB`, `FILE`, `DBTABLE`
- `title`
- `content`
- `order_idx`
- `created_at`
- `updated_at`

`CHECKLIST` 블록은 출제자가 요구하는 완료 조건이다. 제출자가 체크하는 항목의 원본이 된다.

### `dev_challenge_submissions`

사용자 제출.

필드:

- `id`
- `assignment_id`
- `user_id`
- `comment`
- `github_url`
- `figma_url`
- `deploy_url`
- `status`: `SUBMITTED`, `NEEDS_CHANGES`, `APPROVED`, `REJECTED`
- `score`
- `max_score`
- `checked_items`: JSON array
- `admin_rating`
- `admin_feedback`
- `reviewed_by`
- `created_at`
- `updated_at`

1차에서는 `comment`, `github_url`, `checked_items`만 UI 필수로 둔다.

## 파일별 계획

### `towercrane-for-uiux-server/src/database/schema.ts`

추가:

- `DevChallengeBlockType`
- `DevChallengeAssignmentStatus`
- `DevChallengeSubmissionStatus`
- `devChallengeCategoriesTable`
- `devChallengeSectionsTable`
- `devChallengeAssignmentsTable`
- `devChallengeAssignmentBlocksTable`
- `devChallengeSubmissionsTable`
- infer select/insert 타입 export
- `schema` export 객체에 테이블 추가

기존 `challenge_*` 타입은 Study Diary가 쓰는 동안 건드리지 않는다.

### `towercrane-for-uiux-server/src/database/database.service.ts`

추가:

- `CREATE TABLE IF NOT EXISTS dev_challenge_categories`
- `CREATE TABLE IF NOT EXISTS dev_challenge_sections`
- `CREATE TABLE IF NOT EXISTS dev_challenge_assignments`
- `CREATE TABLE IF NOT EXISTS dev_challenge_assignment_blocks`
- `CREATE TABLE IF NOT EXISTS dev_challenge_submissions`
- 각 FK와 index

메뉴 시드:

- `Dev Challenge`, `sectionId: 'dev_challenge'`, `icon: 'Trophy'` 추가

초기 데이터 시드:

- 필요하면 `Frontend`, `Backend`, `Database` 같은 샘플 1차 주제만 넣는다.
- 실제 챌린지 출제는 어드민 UI로 만들 수 있게 두고 과한 시드는 피한다.

### `towercrane-for-uiux-server/src/dev-challenge/dev-challenge.module.ts`

신규:

- `DevChallengeController`
- `DevChallengeService`

### `towercrane-for-uiux-server/src/dev-challenge/dto/dev-challenge.schema.ts`

신규 Zod 스키마:

- `createCategorySchema`
- `updateCategorySchema`
- `createSectionSchema`
- `updateSectionSchema`
- `createAssignmentSchema`
- `updateAssignmentSchema`
- `createAssignmentBlockSchema`
- `updateAssignmentBlockSchema`
- `createSubmissionSchema`
- `updateSubmissionSchema`
- `reviewSubmissionSchema`

주의:

- `githubUrl`은 URL 형식 검증을 한다.
- `checkedItems`는 string array 또는 block/item id array로 정한다.
- 1차에서는 checklist item id를 안정적으로 만들기 위해 블록 content JSON에 `{ id, label }[]` 형태를 권장한다.

### `towercrane-for-uiux-server/src/dev-challenge/dev-challenge.service.ts`

구현:

- 1차 주제 CRUD, reorder
- 2차 주제 CRUD, reorder
- assignment CRUD, publish/archive, reorder
- assignment block CRUD, reorder
- 내 제출 조회
- 제출 생성/수정
- 제출 목록 조회
- 어드민 검토
- 체크리스트 기반 점수 계산

점수 계산:

- 출제 체크리스트 전체 개수 * 10 = `maxScore`
- 제출 체크리스트 체크 개수 * 10 = `score`
- 체크 항목 id가 출제 원본에 없는 경우 무시

### `towercrane-for-uiux-server/src/dev-challenge/dev-challenge.controller.ts`

권장 API:

```txt
GET    /api/dev-challenge/categories
POST   /api/dev-challenge/categories
PATCH  /api/dev-challenge/categories/:id
DELETE /api/dev-challenge/categories/:id
POST   /api/dev-challenge/categories/reorder

GET    /api/dev-challenge/categories/:categoryId/sections
POST   /api/dev-challenge/sections
PATCH  /api/dev-challenge/sections/:id
DELETE /api/dev-challenge/sections/:id
POST   /api/dev-challenge/sections/reorder

GET    /api/dev-challenge/sections/:sectionId/assignments
POST   /api/dev-challenge/assignments
GET    /api/dev-challenge/assignments/:id
PATCH  /api/dev-challenge/assignments/:id
DELETE /api/dev-challenge/assignments/:id
POST   /api/dev-challenge/assignments/reorder

POST   /api/dev-challenge/assignments/:assignmentId/blocks
PATCH  /api/dev-challenge/blocks/:id
DELETE /api/dev-challenge/blocks/:id
POST   /api/dev-challenge/blocks/reorder

GET    /api/dev-challenge/assignments/:assignmentId/submissions
GET    /api/dev-challenge/assignments/:assignmentId/submissions/my
POST   /api/dev-challenge/submissions
PATCH  /api/dev-challenge/submissions/:id
POST   /api/dev-challenge/submissions/:id/review
```

권한:

- 카테고리, 섹션, 출제, 블록 생성/수정/삭제: `AdminGuard`
- 제출 생성/수정: 로그인 사용자
- 모든 제출 목록 조회, 검토: `AdminGuard`
- 내 제출 조회: 본인

### `towercrane-for-uiux-server/src/app.module.ts`

추가:

- `DevChallengeModule`

## 백엔드 테스트

추가 후보:

- `towercrane-for-uiux-server/src/dev-challenge/dev-challenge.service.spec.ts`
- `towercrane-for-uiux-server/test/dev-challenge.e2e-spec.ts`

1차 검증:

- 카테고리/섹션 CRUD
- 출제 생성 후 블록 추가
- 체크리스트 점수 계산
- 사용자가 제출 생성
- 같은 사용자가 같은 assignment에 재제출하면 update 처리 또는 정책대로 409 처리
- 어드민만 검토 가능


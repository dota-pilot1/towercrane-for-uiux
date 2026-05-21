# 03. Dev Challenge 프론트엔드 계획

## 목표

`Study Diary`와 같은 1차/2차 주제 관리 UX를 유지하되, 본문 영역을 `챌린지 출제`와 `제출` 중심으로 만든다.

## 화면 구조

```txt
Dev Challenge
├─ 1차 주제 패널
├─ 2차 주제 패널
└─ 본문 패널
   ├─ 챌린지 출제
   │  ├─ 출제 목록
   │  └─ 출제 상세: 노트, 다이어그램, Figma, 체크리스트
   └─ 제출
      ├─ 댓글형 설명
      ├─ 제출 체크리스트
      └─ GitHub 링크
```

1차 구현에서는 탭을 명확히 둔다.

- `챌린지 출제`
- `제출`

어드민은 `챌린지 출제` 탭에서 생성/수정/삭제가 가능하고, 일반 사용자는 읽기만 가능하다.

## 파일별 계획

### `towercrane-for-uiux-front/src/app/router.tsx`

추가:

- `DevChallengePage` import
- `/dev-challenge` route
- routeTree에 `devChallengeRoute` 추가

### `towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx`

추가:

- `sectionIdToPath.dev_challenge = '/dev-challenge'`
- `getSectionIdFromPath('/dev-challenge') = 'dev_challenge'`

### `towercrane-for-uiux-front/src/shared/config/navigation.ts`

추가:

- `{ id: 'dev_challenge', label: 'Dev Challenge', icon: Trophy }`

정적 navigation이 완전히 사용되지 않더라도 DB 메뉴와 맞춰 둔다.

### `towercrane-for-uiux-front/src/entities/dev-challenge/model/types.ts`

신규 타입:

- `DevChallengeCategory`
- `DevChallengeSection`
- `DevChallengeAssignment`
- `DevChallengeAssignmentBlock`
- `DevChallengeSubmission`
- `DevChallengeBlockType`
- `DevChallengeSubmissionStatus`

### `towercrane-for-uiux-front/src/entities/dev-challenge/api/dev-challenge-api.ts`

신규 API 함수:

- `getCategories`
- `createCategory`
- `updateCategory`
- `deleteCategory`
- `reorderCategories`
- `getSectionsByCategory`
- `createSection`
- `updateSection`
- `deleteSection`
- `reorderSections`
- `getAssignmentsBySection`
- `getAssignment`
- `createAssignment`
- `updateAssignment`
- `deleteAssignment`
- `reorderAssignments`
- `createAssignmentBlock`
- `updateAssignmentBlock`
- `deleteAssignmentBlock`
- `reorderAssignmentBlocks`
- `getMySubmission`
- `createSubmission`
- `updateSubmission`
- `getSubmissions`
- `reviewSubmission`

### `towercrane-for-uiux-front/src/features/dev-challenge/lib/hooks.ts`

TanStack Query hook:

- `DEV_CHALLENGE_KEYS`
- category hooks
- section hooks
- assignment hooks
- block hooks
- submission hooks

주의:

- Study Diary의 query key `['challenge']`와 섞이지 않게 `['dev-challenge']`를 사용한다.

### `towercrane-for-uiux-front/src/pages/dev-challenge/ui/dev-challenge-page.tsx`

신규 페이지.

상태:

- `selectedCategoryId`
- `selectedSectionId`
- `selectedAssignmentId`
- active tab: `assignment` 또는 `submission`

구성:

- `DevChallengeCategoryPanel`
- `DevChallengeSectionPanel`
- `DevChallengeMainPanel`

### `towercrane-for-uiux-front/src/features/dev-challenge/ui/dev-challenge-category-panel.tsx`

1차 주제 패널.

가능하면 기존 `ChallengeSidebar`의 UI/동작을 공통화해서 사용한다.

변경 포인트:

- raw Tailwind 팔레트 사용 금지
- `text-red-400`, `text-white` 같은 기존 패턴은 semantic token 또는 `ui-*` 유틸로 바꾼다.

### `towercrane-for-uiux-front/src/features/dev-challenge/ui/dev-challenge-section-panel.tsx`

2차 주제 패널.

기존 `ChallengeTopicsList`와 같은 동작:

- 목록
- 추가
- 수정
- 삭제
- 드래그 정렬

### `towercrane-for-uiux-front/src/features/dev-challenge/ui/dev-challenge-main-panel.tsx`

본문 패널.

선택 상태별 표시:

- 2차 주제 미선택: "2차 주제를 선택하세요"
- 출제 없음: 어드민은 "챌린지 출제 추가", 일반 사용자는 빈 상태
- 출제 선택됨: `AssignmentDetail` + `SubmissionPanel`

탭:

- `챌린지 출제`
- `제출`

### `towercrane-for-uiux-front/src/features/dev-challenge/assignment/ui/assignment-list.tsx`

2차 주제 안의 출제 목록.

기능:

- 출제 카드 목록
- 선택
- 어드민용 추가/수정/삭제
- 드래그 정렬
- 상태 배지: draft/published/archive

### `towercrane-for-uiux-front/src/features/dev-challenge/assignment/ui/assignment-editor-dialog.tsx`

출제 생성/수정 모달.

구성:

- 제목
- 요약
- 난이도
- 상태
- 블록 에디터

### `towercrane-for-uiux-front/src/features/dev-challenge/assignment/ui/assignment-block-editor.tsx`

출제 블록 에디터.

Study Diary 노트의 `BlockEditor`와 `docu`의 블록 에디터를 참고한다.

1차 필수:

- `NOTE`
- `CHECKLIST`

2차 확장:

- `MMD`
- `FIGMA`
- `GITHUB`
- `FILE`
- `DBTABLE`

### `towercrane-for-uiux-front/src/features/dev-challenge/assignment/ui/assignment-viewer.tsx`

출제 상세 보기.

블록별 렌더링:

- 노트: Lexical readOnly
- 체크리스트: disabled checkbox 목록
- Mermaid: 렌더링 또는 코드 프리뷰
- Figma/GitHub: 링크 카드

### `towercrane-for-uiux-front/src/features/dev-challenge/submission/ui/submission-panel.tsx`

제출 영역 진입점.

구성:

- 내 제출이 없으면 `SubmissionForm`
- 내 제출이 있으면 `SubmissionCard` + 수정 버튼
- 어드민이면 제출 목록/검토 영역 표시

### `towercrane-for-uiux-front/src/features/dev-challenge/submission/ui/submission-form.tsx`

입력:

- 댓글형 설명 textarea 또는 Lexical 간단 에디터
- GitHub 링크 input
- 출제 체크리스트 기반 checkbox

검증:

- 댓글 또는 GitHub 링크 중 하나는 필수
- GitHub 링크가 있으면 URL 형식
- 체크리스트는 선택 사항이지만 점수 계산에 반영

### `towercrane-for-uiux-front/src/features/dev-challenge/submission/ui/submission-card.tsx`

표시:

- 제출자
- 제출 시간
- GitHub 링크
- 댓글
- 체크리스트 완료율
- 점수
- 검토 상태
- 어드민 피드백

### `towercrane-for-uiux-front/src/features/dev-challenge/submission/ui/submission-review-panel.tsx`

어드민 검토.

기능:

- 상태 변경: 승인, 수정 요청, 반려
- 평점
- 피드백

## 스타일 규칙

AGENTS.md 규칙을 따른다.

금지:

- `text-white`
- `text-slate-*`
- `text-emerald-*`
- `bg-white/*`
- `bg-slate-*`
- `bg-emerald-*`
- `border-white/*`
- `border-slate-*`

대신:

- `text-text-primary`
- `text-text-secondary`
- `text-brand-primary`
- `bg-brand-glass`
- `bg-surface-muted`
- `border-surface-border`
- `ui-panel`
- `ui-panel-soft`
- `ui-input`


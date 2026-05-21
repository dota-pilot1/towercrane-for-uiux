# 01. Study Diary URL / 메뉴 정리 계획

## 목표

현재 `/challenge`로 열리는 Study Diary를 `/study-diary`로 바꾼다. 기존 `/challenge` 접근은 `/study-diary`로 리다이렉트한다.

## 파일별 계획

### `towercrane-for-uiux-front/src/app/router.tsx`

변경:

- `challengeRoute`를 `studyDiaryRoute`로 이름 변경한다.
- `path: '/challenge'`를 `path: '/study-diary'`로 변경한다.
- 기존 `/challenge` 라우트는 리다이렉트 전용으로 남긴다.
- `/chatbot` 리다이렉트도 `/study-diary`로 변경한다.

권장 라우트:

```ts
const studyDiaryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/study-diary',
  component: StudyDiaryPage,
})

const legacyChallengeRedirectRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/challenge',
  component: StudyDiaryRedirect,
})
```

### `towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx`

변경:

- `sectionIdToPath`에 `study_diary: '/study-diary'`를 추가한다.
- 기존 `challenge: '/challenge'`는 호환용으로 `'/study-diary'`를 반환하게 둔다.
- `getSectionIdFromPath`에서 `/study-diary`를 `study_diary`로 인식한다.
- `/challenge`도 `study_diary`로 인식하게 둔다.
- 새 `dev_challenge: '/dev-challenge'` 매핑은 Dev Challenge 단계에서 추가한다.

### `towercrane-for-uiux-front/src/shared/config/navigation.ts`

현재 정적 navigation은 일부만 쓰이지만 함께 정리한다.

변경:

- `{ id: 'chatbot', label: 'Study Diary' }` 대신 `{ id: 'study_diary', label: 'Study Diary' }`
- Dev Challenge 추가 시 `{ id: 'dev_challenge', label: 'Dev Challenge' }`

### `towercrane-for-uiux-server/src/database/database.service.ts`

메뉴 시드 변경:

- 기존 `Challenge with GPT`, `sectionId: 'challenge'`를 `Study Diary`, `sectionId: 'study_diary'`로 변경한다.
- 새 메뉴 `Dev Challenge`, `sectionId: 'dev_challenge'`, `icon: 'Trophy'`를 추가한다.

주의:

- 이미 생성된 SQLite DB에는 기존 메뉴 데이터가 남아 있을 수 있다.
- 시드는 `menus`가 비어 있을 때만 들어가므로 기존 개발 DB에는 별도 보정 로직이 필요하다.

권장 보정:

```sql
UPDATE menus
SET name = 'Study Diary', section_id = 'study_diary', icon = 'BookOpen'
WHERE section_id = 'challenge';
```

이후 `Dev Challenge` 메뉴가 없으면 insert한다.

### `towercrane-for-uiux-front/src/pages/challenge/ui/challenge-page.tsx`

1차에서는 파일명만 바꾸지 않고 라우터 import만 바꿔도 된다. 하지만 기능 이름을 명확히 하려면 다음 단계에서 이동한다.

이동 계획:

- 기존: `pages/challenge/ui/challenge-page.tsx`
- 변경: `pages/study-diary/ui/study-diary-page.tsx`

내부 컴포넌트명:

- `ChallengePage` → `StudyDiaryPage`

### `towercrane-for-uiux-front/src/features/challenge/**`

1차 URL 정리에서는 그대로 둘 수 있다. 다만 다음 리팩터링에서 Study Diary 전용으로 이동한다.

권장 이동:

- `features/challenge/ui/challenge-sidebar.tsx` → 공통 `shared/ui/two-level-topic-panel.tsx` 또는 `features/study-diary/ui/study-diary-category-panel.tsx`
- `features/challenge/ui/challenge-topics-list.tsx` → 공통 `shared/ui/section-list-panel.tsx` 또는 `features/study-diary/ui/study-diary-section-panel.tsx`
- `features/challenge/user-notes/**` → `features/study-diary/user-notes/**`
- `features/challenge/lib/hooks.ts` → `features/study-diary/lib/hooks.ts`

## 검증

- `/study-diary` 직접 접근 시 화면이 열린다.
- `/challenge` 접근 시 `/study-diary`로 이동한다.
- `/chatbot` 접근 시 `/study-diary`로 이동한다.
- 헤더 메뉴에서 Study Diary 클릭 시 `/study-diary`로 이동한다.
- 새 Dev Challenge 메뉴를 추가해도 Study Diary 활성 상태가 꼬이지 않는다.


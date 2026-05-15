# 03. 프론트 구현 계획

## 목표

`StudyDiaryPage`가 더 이상 `ChallengePage`를 그대로 렌더링하지 않게 한다. 스터디 다이어리 전용 API, query key, 화면 문구를 만들고 로그인 유저의 개인 다이어리만 표시한다.

## 신규 프론트 구조

권장 파일:

- `towercrane-for-uiux-front/src/pages/study-diary/ui/study-diary-page.tsx`
- `towercrane-for-uiux-front/src/entities/study-diary/model/types.ts`
- `towercrane-for-uiux-front/src/entities/study-diary/api/study-diary-api.ts`
- `towercrane-for-uiux-front/src/features/study-diary/lib/hooks.ts`
- `towercrane-for-uiux-front/src/features/study-diary/ui/study-diary-sidebar.tsx`
- `towercrane-for-uiux-front/src/features/study-diary/ui/study-diary-section-list.tsx`
- `towercrane-for-uiux-front/src/features/study-diary/ui/study-diary-note-panel.tsx`

초기에는 기존 `features/challenge/user-notes`의 `UserNotesPanel`을 재사용해도 된다. 단 API hook은 `study-diary` namespace로 새로 만든다.

## 타입 설계

```ts
export type StudyDiary = {
  id: string
  userId: string
  ownerName: string
  title: string
  description?: string | null
  visibility: 'private' | 'shared' | 'public'
  createdAt: string
  updatedAt: string
}

export type StudyDiaryCategory = {
  id: string
  diaryId: string
  name: string
  summary?: string | null
  icon: string
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type StudyDiarySection = {
  id: string
  categoryId: string
  title: string
  summary?: string | null
  orderIdx: number
  createdAt: string
  updatedAt: string
}
```

## API 클라이언트

```ts
export const studyDiaryApi = {
  getMe: () => apiRequest<StudyDiary>('/study-diary/me'),
  updateMe: (data: Partial<Pick<StudyDiary, 'title' | 'description'>>) =>
    apiRequest<StudyDiary>('/study-diary/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listCategories: () => apiRequest<StudyDiaryCategory[]>('/study-diary/categories'),
  createCategory: (data: { name: string }) =>
    apiRequest<StudyDiaryCategory>('/study-diary/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listSections: (categoryId: string) =>
    apiRequest<StudyDiarySection[]>(`/study-diary/categories/${categoryId}/sections`),
}
```

## React Query key

기존 `CHALLENGE_KEYS`와 분리한다.

```ts
const STUDY_DIARY_KEYS = {
  all: ['study-diary'] as const,
  me: () => [...STUDY_DIARY_KEYS.all, 'me'] as const,
  categories: () => [...STUDY_DIARY_KEYS.all, 'categories'] as const,
  sections: (categoryId: string) => [...STUDY_DIARY_KEYS.all, 'sections', categoryId] as const,
  notes: (sectionId: string) => [...STUDY_DIARY_KEYS.all, 'notes', sectionId] as const,
}
```

로그아웃/유저 전환 시 `study-diary` query cache를 비워야 한다. 세션이 바뀌었는데 이전 유저의 다이어리 목록이 잠깐 보이는 상태를 막기 위해서다.

## 화면 문구

헤더:

- title: API에서 받은 `diary.title`
- fallback: `${session.user.name}의 스터디 다이어리`
- description: `학습 주제와 노트를 개인 공간에 정리합니다.`

현재 `PageHeader`에 `Study Diary`가 고정되어 있으므로 diary 조회 후 동적으로 표시한다.

## UI 정책

AGENTS.md 테마 규칙을 따른다.

사용 가능:

- `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `bg-surface-muted`, `bg-surface-raised`, `bg-surface-strong`
- `border-surface-border`, `border-surface-border-soft`
- `bg-brand-glass`, `text-brand-primary`, `border-brand-border`
- `ui-panel`, `ui-panel-soft`, `ui-text-primary`, `ui-text-secondary`, `ui-text-muted`

금지:

- `text-white`
- `text-slate-*`
- `bg-white/*`
- `bg-slate-*`
- `text-emerald-*`
- `border-white/*`
- `border-slate-*`

기존 코드에 남아 있는 `text-red-400`, `text-white` 같은 색상도 스터디 다이어리 전용 컴포넌트로 옮길 때 semantic token 또는 utility로 정리한다.

## UX 흐름

1. `/study-diary` 진입
2. `GET /study-diary/me` 호출
3. diary가 없으면 서버가 자동 생성
4. 헤더에 `OOO의 스터디 다이어리` 표시
5. `GET /study-diary/categories` 호출
6. 1차 주제 선택
7. `GET /study-diary/categories/:categoryId/sections` 호출
8. 2차 주제 선택
9. `GET /study-diary/sections/:sectionId/notes/mine` 호출

## 빈 상태

새 유저는 처음에 category가 없을 수 있다.

- 1차 주제 패널: `아직 1차 주제가 없습니다`
- 2차 주제 패널: `1차 주제를 선택하세요`
- 본문: `2차 주제를 선택하여 노트를 시작하세요`

단, 이 안내 문구는 화면 기능 설명을 길게 늘어놓지 말고 현재 상태만 짧게 보여준다.

## 기존 ChallengePage와의 관계

`/challenge` legacy redirect는 계속 `/study-diary`로 보낼 수 있다. 하지만 `/study-diary` 내부 구현은 더 이상 `ChallengePage`를 import하지 않는다.

기존 `ChallengePage`는 제거하지 않고 남겨도 된다. 다만 새 화면에서 사용하지 않으면 추후 정리 대상으로 표시한다.

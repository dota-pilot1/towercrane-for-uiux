# 04. 프론트엔드 — 3패널 UI 골격 (카테고리 / 섹션 / 콘텐츠)

> 마포-팔란티어 `ChallengePage.tsx` (1863줄, 단일 파일)를 **FSD 로 분해**하여 컴포넌트 단위로 짠다.
> 산출물: 카테고리/섹션 선택이 가능하고, 가운데 영역에 "주제/풀이 탭" 자리가 잡힌 상태.

---

## 1. 화면 레이아웃

```
┌────────────────────────────────────────────────────────────────────┐
│ 페이지 헤더 (Trophy + "Challenge with GPT" + 우측 작은 액션)         │
├────────────┬──────────────┬──────────────────────────────────────┤
│ 카테고리   │ 섹션(회차)   │ 메인 콘텐츠 (탭)                     │
│ Sidebar    │ Sidebar      │  ┌──────────────────────────────────┐│
│ (220px)    │ (260px)      │  │ [주제] [풀이] [GPT] [내 노트]   ││
│ 가변,      │ 가변,        │  └──────────────────────────────────┘│
│ resizable  │ resizable    │  탭별 콘텐츠 영역                     │
│            │              │                                      │
└────────────┴──────────────┴──────────────────────────────────────┘
```

높이: `h-[calc(100vh-132px)]` (헤더 높이 보정 — meeting 페이지와 동일 패턴).

---

## 2. 컴포넌트 분해

| 컴포넌트 | 위치 | 책임 |
|---|---|---|
| `ChallengePage` | `pages/challenge/ui/challenge-page.tsx` | 데이터 fetch + 선택 상태 + 레이아웃 조립 |
| `CategorySidebar` | `features/challenge/category-sidebar/ui/category-sidebar.tsx` | 카테고리 목록 + 선택 + (admin) 추가/편집/삭제/드래그 |
| `SectionSidebar` | `features/challenge/section-sidebar/ui/section-sidebar.tsx` | 선택된 카테고리의 섹션 목록 + (admin) CRUD/드래그 |
| `ChallengeContentTabs` | `pages/challenge/ui/challenge-content-tabs.tsx` | 4개 탭 (주제/풀이/GPT/노트) — 컴포지션 |
| `EmptyState` | `pages/challenge/ui/empty-state.tsx` | 카테고리/섹션 미선택 안내 |

각 사이드바는 **자체 React Query 훅**으로 데이터를 가져온다 (페이지가 prop drill 하지 않는다).

---

## 3. 선택 상태 (URL 동기화)

`/challenge?categoryId=...&sectionId=...` 로 직링크 가능하게.

```ts
// pages/challenge/lib/use-challenge-selection.ts
import { useNavigate, useSearch } from '@tanstack/react-router'

export function useChallengeSelection() {
  const search = useSearch({ from: '/challenge' }) as {
    categoryId?: string
    sectionId?: string
  }
  const navigate = useNavigate({ from: '/challenge' })

  const setCategoryId = (id: string | null) =>
    navigate({ search: { ...search, categoryId: id ?? undefined, sectionId: undefined } })

  const setSectionId = (id: string | null) =>
    navigate({ search: { ...search, sectionId: id ?? undefined } })

  return {
    categoryId: search.categoryId ?? null,
    sectionId: search.sectionId ?? null,
    setCategoryId,
    setSectionId,
  }
}
```

라우트 정의에 `validateSearch` 추가:
```ts
const challengeRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/challenge',
  validateSearch: (s: Record<string, unknown>) => ({
    categoryId: typeof s.categoryId === 'string' ? s.categoryId : undefined,
    sectionId: typeof s.sectionId === 'string' ? s.sectionId : undefined,
  }),
  component: lazy(() => import('../pages/challenge/ui/challenge-page')),
})
```

---

## 4. 카테고리 사이드바

### 4.1 데이터 훅

```ts
// entities/challenge/api/challenge-api.ts
export function useChallengeCategories() {
  return useQuery({
    queryKey: ['challenge', 'categories'],
    queryFn: () => apiRequest<ChallengeCategory[]>('/challenge/categories'),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiRequest('/challenge/categories', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenge', 'categories'] }),
  })
}
// updateCategory, deleteCategory, reorderCategories 동일 패턴
```

### 4.2 컴포넌트

```tsx
export function CategorySidebar({
  selectedId,
  onSelect,
}: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { data: categories = [], isLoading } = useChallengeCategories()
  const userRole = useSessionStore((s) => s.userRole)
  const isAdmin = userRole === 'admin'

  return (
    <aside className="ui-panel flex min-h-0 w-56 flex-col overflow-hidden bg-surface-raised">
      <header className="flex items-center justify-between border-b border-surface-border-soft bg-surface-muted px-4 py-3">
        <h2 className="text-sm font-black ui-text-primary">카테고리</h2>
        {isAdmin && <AddCategoryButton />}
      </header>
      <DndContext /* admin 일 때만 */>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                isSelected={selectedId === cat.id}
                onSelect={() => onSelect(cat.id)}
                isAdmin={isAdmin}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </aside>
  )
}
```

> 드래그 처리는 메뉴 관리에서 만든 패턴(상위 SortableContext 1개 + closestCenter + activationConstraint 8px) 그대로 재사용.

### 4.3 너비 저장

```ts
const [width, setWidth] = useLocalStorage('challenge:cat-sidebar-width', 224)
```

`shared/lib/use-local-storage.ts` 가 없으면 추가. 양쪽 사이드바 모두 동일하게 사용.

---

## 5. 섹션 사이드바

기본 구조는 카테고리 사이드바와 동일. 차이점:
- `useChallengeSections(categoryId)` 로 종속 fetch (`enabled: !!categoryId`)
- 카테고리 미선택일 때 `<EmptyState message="좌측에서 카테고리를 선택하세요" />`
- 섹션 카드에 `summary` (소제목) 한 줄 노출

---

## 6. 메인 콘텐츠 — 탭 구성

### 6.1 탭 정의

| 탭 | 키 | 노출 조건 | 본문 |
|---|---|---|---|
| 주제 | `topics` | 항상 | `TopicViewer` (사용자) / `TopicEditor` (admin) — 05번 문서 |
| 풀이 | `submissions` | 항상 | `SubmissionList` + `SubmissionForm` — 06번 문서 |
| GPT | `gpt` | 항상 | `GptChatPanel` — 07번 문서 |
| 내 노트 | `notes` | 항상 | `UserNotesPanel` — 08번 문서 |

URL 에 `?tab=topics` 로 보존.

### 6.2 탭 컴포넌트 (radix tabs 또는 자체)

기존 프로젝트에 radix tabs가 이미 있는지 확인 후 재사용. 없으면 간단한 자체 구현:

```tsx
const tabs = [
  { id: 'topics', label: '주제', icon: BookOpen },
  { id: 'submissions', label: '풀이', icon: ClipboardList },
  { id: 'gpt', label: 'GPT', icon: Sparkles },
  { id: 'notes', label: '내 노트', icon: NotebookPen },
] as const
```

---

## 7. EmptyState 가이드

| 상태 | 메시지 |
|---|---|
| 카테고리 0개 | "카테고리가 아직 없습니다. (admin) 좌측 상단의 + 로 추가하세요." |
| 카테고리 선택 X | "왼쪽에서 카테고리를 선택하세요." |
| 섹션 0개 | "이 카테고리에는 회차가 없습니다." |
| 섹션 선택 X | "회차를 선택하면 주제와 풀이가 보입니다." |

각각 `ui-panel-soft` 안에 `Trophy`/`BookOpen` 아이콘 + 문구.

---

## 8. 페이지 컴포넌트 조립 (스니펫)

```tsx
export default function ChallengePage() {
  const { categoryId, sectionId, setCategoryId, setSectionId } = useChallengeSelection()

  return (
    <div className="h-[calc(100vh-132px)] min-h-[680px] overflow-hidden p-1">
      <div className="grid h-full gap-3 lg:grid-cols-[14rem_16rem_minmax(0,1fr)]">
        <CategorySidebar selectedId={categoryId} onSelect={setCategoryId} />

        {categoryId ? (
          <SectionSidebar
            categoryId={categoryId}
            selectedId={sectionId}
            onSelect={setSectionId}
          />
        ) : (
          <EmptyState variant="no-category" />
        )}

        {sectionId ? (
          <ChallengeContentTabs sectionId={sectionId} />
        ) : (
          <EmptyState variant="no-section" />
        )}
      </div>
    </div>
  )
}
```

---

## 9. 스타일 토큰 사용 (CLAUDE.md 규칙 준수)

| 용도 | 클래스 |
|---|---|
| 사이드바 패널 | `ui-panel bg-surface-raised` |
| 헤더 strip | `bg-surface-muted border-b border-surface-border-soft` |
| 선택된 항목 | `border-brand-border bg-surface-strong text-text-primary` |
| 비선택 항목 | `border-transparent ui-text-secondary hover:bg-surface-muted` |
| 강조 배지 | `border-brand-border bg-brand-glass text-brand-primary` |
| 본문 카드 | `ui-panel-soft p-4` |

> `text-white`, `bg-slate-*` 같은 raw 팔레트 절대 금지.

---

## 10. 점검 체크리스트

- [ ] `/challenge` 진입 시 좌측 카테고리 사이드바 표시 (시드 카테고리 1개 보임)
- [ ] 카테고리 클릭 → URL 에 `?categoryId=...` 반영
- [ ] 카테고리 선택 후 가운데 섹션 사이드바 활성화
- [ ] 섹션 선택 → URL `?sectionId=...` 반영, 우측 탭 영역 활성화
- [ ] 직접 URL 에 `categoryId/sectionId` 로 진입 가능 (새로고침 후에도 선택 유지)
- [ ] admin 만 카테고리/섹션 추가 버튼 보임
- [ ] 사이드바 너비 변경 → 새로고침 후 유지 (localStorage)
- [ ] 비어있을 때 EmptyState 4종 모두 정상 노출
- [ ] 모바일 폭 (lg 미만) 에서도 깨지지 않음 (단계별 표시)

---

## 11. 다음 단계

→ `05-block-editor.md` — 주제 블록 에디터 (NOTE/MMD/CHECKLIST/...)

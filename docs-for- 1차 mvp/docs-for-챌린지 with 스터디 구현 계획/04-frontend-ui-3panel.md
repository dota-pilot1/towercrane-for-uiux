# 04. 프론트엔드 — 3패널 UI 구조 (1차/2차/3차)

> **Study Diary** 는 3단계 계층형 레이아웃이다: 1차 주제(카테고리) → 2차 주제(섹션) → 3차 본문(노트).
> 산출물: 3개 사이드바 + 노트 영역이 연동되는 완전한 UI.

---

## 1. 화면 레이아웃

```
┌────────────────────────────────────────────────────────┐
│ 헤더: Trophy + "Study Diary" 메뉴                      │
├──────────┬──────────┬──────────────────────────────────┤
│ 1차 주제 │ 2차 주제 │ 3차 본문 (노트 목록 + 에디터)    │
│(Category)│(Section) │                                 │
│          │          │ ┌────────────────────────────┐  │
│ Spring   │ 1회차 +  │ │ [+ 새 노트] [저장] [공유]   │  │
│ React +  │ 2회차    │ │                            │  │
│          │ 3회차    │ │ 노트 선택/작성 에디터      │  │
│          │          │ │                            │  │
└──────────┴──────────┴──────────────────────────────────┘
```

높이: `h-[calc(100vh-120px)]` (헤더 높이 보정).

---

## 2. 컴포넌트 구조

| 컴포넌트 | 파일 | 책임 |
|---|---|---|
| `ChallengePage` | `pages/challenge/ui/challenge-page.tsx` | 선택 상태 + 레이아웃 조립 |
| `ChallengeSidebar` | `features/challenge/ui/challenge-sidebar.tsx` | 1차 주제 목록 + "+" 버튼 + 선택 |
| `ChallengeTopicsList` | `features/challenge/ui/challenge-topics-list.tsx` | 2차 주제 목록 + "+" 버튼 + 선택 |
| `UserNotesPanel` | `features/challenge/user-notes/ui/user-notes-panel.tsx` | 3차 본문 (노트 CRUD) |

각 컴포넌트는 **자체 React Query 훅**으로 독립적으로 데이터를 가져온다.

---

## 3. 데이터 플로우

```
페이지 상태 (selectedCategory, selectedSection)
    ↓
ChallengeSidebar ──(categoryId)──→ ChallengeTopicsList
                                       ↓
                              (sectionId)
                                       ↓
                              UserNotesPanel
```

**선택 흐름**:
1. 1차 주제(카테고리) 선택 → `selectedCategory` 상태 변경
2. 자동으로 중앙 패널이 "+" 버튼과 함께 활성화
3. 2차 주제(섹션) 선택 → `selectedSection` 상태 변경
4. 우측 패널에 해당 섹션의 노트 목록 표시

---

## 4. 1차 주제 사이드바 (ChallengeSidebar)

### 4.1 헤더 및 "+" 버튼

```tsx
<div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Trophy className="size-4 text-brand-primary" />
      <p className="text-xs font-bold ui-text-primary">1차 주제</p>
    </div>
    <button
      onClick={() => setIsAddingCategory(true)}
      className="p-1 hover:bg-surface-border rounded transition-colors"
      title="카테고리 추가"
    >
      <Plus className="size-3.5 ui-text-secondary hover:ui-text-primary" />
    </button>
  </div>
</div>
```

### 4.2 카테고리 항목

각 카테고리는 클릭 가능한 버튼:
- 선택됨: `bg-brand-glass ui-text-primary`
- 미선택: `ui-text-secondary hover:bg-surface-muted`
- 체크: `text-truncate` (긴 이름 생략)

### 4.3 "+" 버튼 모달 (현재 구현)

```tsx
{isAddingCategory && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card className="w-96 p-4 rounded-md">
      <h3 className="text-sm font-bold ui-text-primary mb-4">1차 주제 추가</h3>
      <input
        type="text"
        placeholder="카테고리명 입력"
        className="ui-input w-full mb-4"
      />
      <div className="flex gap-2 justify-end">
        <button className="px-3 py-1.5 text-xs...">취소</button>
        <button className="px-3 py-1.5 text-xs... bg-brand-primary">추가</button>
      </div>
    </Card>
  </div>
)}
```

---

## 5. 2차 주제 사이드바 (ChallengeTopicsList)

### 5.1 헤더 및 "+" 버튼

```tsx
<div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
  <div className="flex items-center justify-between">
    <p className="text-xs font-bold ui-text-primary">2차 주제 ({sections.length})</p>
    <button
      onClick={() => setIsAddingSection(true)}
      className="p-1 hover:bg-surface-border rounded transition-colors"
      title="섹션 추가"
    >
      <Plus className="size-3.5 ui-text-secondary hover:ui-text-primary" />
    </button>
  </div>
</div>
```

### 5.2 섹션 항목

- 1차 주제 미선택: 빈 상태 표시
- 1차 주제 선택: 해당 섹션들 로드 + 표시
- 각 섹션: `title` 필드 표시

### 5.3 "+" 버튼 모달

```tsx
{isAddingSection && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card className="w-96 p-4 rounded-md">
      <h3 className="text-sm font-bold ui-text-primary mb-4">2차 주제 추가</h3>
      <input
        type="text"
        placeholder="주제명 입력"
        className="ui-input w-full mb-4"
      />
      <div className="flex gap-2 justify-end">
        <button>취소</button>
        <button className="bg-brand-primary">추가</button>
      </div>
    </Card>
  </div>
)}
```

---

## 6. 3차 본문 영역 (UserNotesPanel)

### 6.1 헤더

```tsx
<div className="border-b border-surface-border bg-surface-muted p-4 flex items-center justify-between">
  <h2 className="text-sm font-bold ui-text-primary">3차 본문</h2>
  <button className="px-3 py-1.5 text-xs bg-brand-primary text-white">+ 새 노트</button>
</div>
```

### 6.2 노트 목록 (좌측)

```tsx
<div className="w-64 border-r border-surface-border overflow-y-auto">
  {notes.map((note) => (
    <button
      key={note.id}
      onClick={() => setSelectedNoteId(note.id)}
      className={`w-full p-3 text-left border-b ${
        selectedNoteId === note.id
          ? 'bg-brand-glass ui-text-primary'
          : 'ui-text-secondary hover:bg-surface-muted'
      }`}
    >
      <div className="font-medium truncate">{note.title || '(제목 없음)'}</div>
      <div className="text-xs ui-text-muted mt-1">
        {new Date(note.updatedAt).toLocaleDateString()}
      </div>
    </button>
  ))}
</div>
```

### 6.3 노트 에디터 (우측)

선택된 노트의:
- 제목 입력
- 마크다운/텍스트 에디터
- 저장 버튼
- 공개 토글 (private/shared)
- 삭제 버튼

---

## 7. 전체 페이지 조립

```tsx
export function ChallengePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  return (
    <div className="flex h-[calc(100vh-120px)] gap-3">
      {/* 1차 주제 */}
      <ChallengeSidebar 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />

      {/* 2차 주제 */}
      {selectedCategory && (
        <ChallengeTopicsList
          sectionId={selectedCategory}
          selectedTopic={selectedSection}
          onSelectTopic={setSelectedSection}
        />
      )}

      {/* 3차 본문 */}
      {selectedSection ? (
        <Card className="flex-1 flex flex-col rounded-md overflow-hidden">
          <UserNotesPanel sectionId={selectedSection} />
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center rounded-md">
          <div className="text-center">
            <p className="ui-text-muted text-sm">2차 주제를 선택하여 시작하세요</p>
          </div>
        </Card>
      )}
    </div>
  )
}
```

---

## 8. 스타일 규칙 (CLAUDE.md 준수)

| 요소 | 스타일 |
|---|---|
| 사이드바 배경 | `bg-surface-muted` |
| 헤더 구분선 | `border-b border-surface-border` |
| 선택된 항목 | `bg-brand-glass ui-text-primary` |
| 비선택 항목 | `ui-text-secondary hover:bg-surface-muted` |
| "+" 버튼 | `p-1 hover:bg-surface-border rounded` |
| 모달 배경 | `fixed inset-0 bg-black/50` |
| 모달 버튼 | `bg-brand-primary text-white` or `border border-surface-border` |

> **절대 금지**: `text-white`, `bg-slate-*`, `text-emerald-*` 등 raw 팔레트

---

## 9. 현재 구현 상태 (2026-05-11)

✅ **완료**:
- `ChallengeSidebar` with "+" 버튼 + 모달 (카테고리 추가)
- `ChallengeTopicsList` with "+" 버튼 + 모달 (섹션 추가)
- `UserNotesPanel` (노트 목록)
- 3패널 선택 흐름 동작
- 헤더 라벨 (1차 주제, 2차 주제)

🔄 **진행 중**:
- 노트 에디터 (작성/수정/삭제 UI)
- 공개 토글

---

## 10. 점검 체크리스트

- [x] 1차 주제 선택 가능
- [x] "+" 버튼으로 카테고리 추가 가능
- [x] 1차 주제 선택 후 2차 주제 사이드바 활성화
- [x] 2차 주제 선택 가능
- [x] "+" 버튼으로 섹션 추가 가능
- [x] 2차 주제 선택 후 노트 패널 활성화
- [ ] 노트 작성/수정/삭제 완성
- [ ] 노트 공개 토글 구현
- [ ] 모바일 레이아웃 대응

---

## 다음 단계

→ `05-block-editor.md` 또는 M5 구현 (노트 CRUD UI)

# 08. 유저별 개인 노트 + 공유

> 풀이 제출(`submission`) 과는 별개로, 사용자가 챌린지를 풀면서 정리하는 **개인 학습 노트**. 처음엔 비공개(default), 사용자가 원할 때 "공유" 토글로 공개한다.

---

## 1. 어디에 노트가 매달리나

| 단위 | 설명 | 예시 |
|---|---|---|
| 섹션 단위 | 섹션 전체에 대한 한 줄 요약/회고 | "1회차 — Spring 첫 컨트롤러 작성에서 헷갈렸던 부분" |
| 토픽 단위 | 특정 주제 블록에 대한 메모 | NOTE 블록의 코드 예제에 대한 이해/오개념 정정 |

DB 스키마(`challenge_user_notes`)에서 `section_id` / `topic_id` 둘 중 하나는 반드시 채워진다 (CHECK 제약).

---

## 2. 공개 단계

| visibility | 설명 | 누가 볼 수 있나 |
|---|---|---|
| `private` | 기본값 | 본인만 |
| `shared` | 같은 섹션 회원에게만 공개 | 본인 + 같은 섹션을 본 적 있는 로그인 유저 |
| `public` | 전체 공개 | 본인 + 모든 로그인 유저 |

> v1 은 `private` / `shared` 두 가지로 시작 가능. `public` 은 추후 토글로 추가.
> 추후 "스터디 그룹" 도입 시 `group` visibility + `group_id` 컬럼 확장.

---

## 3. UI 컴포넌트

```
features/challenge/user-notes/
├── ui/
│   ├── notes-tab.tsx                ← 탭 진입점, "내 노트" + "공유받은 노트" 분리
│   ├── my-notes-panel.tsx           ← 본인 노트 (CRUD)
│   ├── shared-notes-panel.tsx       ← 다른 사람 공유 노트 (read only)
│   ├── note-card.tsx
│   ├── note-form.tsx                ← 새 노트 / 수정
│   ├── note-visibility-toggle.tsx
│   └── pin-button.tsx
└── lib/
    └── note-anchor-label.ts         ← topicId 가 있으면 "주제: ${blockTitle}" 라벨
```

---

## 4. 데이터 훅

```ts
// entities/challenge/api/challenge-notes-api.ts
export function useMyNotes(sectionId: string) {
  return useQuery({
    queryKey: ['challenge', 'notes', 'mine', sectionId],
    queryFn: () => apiRequest(`/challenge/sections/${sectionId}/notes/mine`),
  })
}
export function useSharedNotes(sectionId: string) {
  return useQuery({
    queryKey: ['challenge', 'notes', 'shared', sectionId],
    queryFn: () => apiRequest(`/challenge/sections/${sectionId}/notes/shared`),
  })
}
export function useTopicNotesMine(topicId: string) {
  return useQuery({
    queryKey: ['challenge', 'notes', 'mine', 'topic', topicId],
    queryFn: () => apiRequest(`/challenge/topics/${topicId}/notes/mine`),
    enabled: !!topicId,
  })
}
export function useCreateNote() { /* POST /challenge/notes */ }
export function useUpdateNote() { /* PATCH */ }
export function useDeleteNote() { /* DELETE */ }
```

---

## 5. NoteForm

- 제목 (선택)
- 본문 (markdown 또는 plain text — Lexical 도 가능하지만 v1 은 textarea + react-markdown preview)
- visibility 셀렉터 (`Lock` / `Users` / `Globe` 아이콘)
- pinned 토글 (목록 상단 고정)

```tsx
function NoteForm({ initial, onSubmit, onCancel }: Props) {
  // ... useState 들
  return (
    <form onSubmit={handleSubmit} className="ui-panel-soft p-4 space-y-3">
      <input className="ui-input" placeholder="제목 (선택)" value={title} onChange={...} />
      <textarea className="ui-input min-h-32" placeholder="노트 본문 (markdown 가능)" value={content} onChange={...} />
      <div className="flex items-center justify-between">
        <NoteVisibilityToggle value={visibility} onChange={setVisibility} />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>취소</Button>
          <Button type="submit" tone="brand">저장</Button>
        </div>
      </div>
    </form>
  )
}
```

---

## 6. NoteCard

```tsx
function NoteCard({ note, isMine }: Props) {
  return (
    <article className="ui-panel-soft p-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="font-bold ui-text-primary">{note.title || '(제목 없음)'}</h3>
          <p className="text-xs ui-text-muted">
            {isMine ? '나' : note.userName}
            <span className="mx-1.5">·</span>
            {formatRelative(note.updatedAt)}
            {note.pinned && <Pin className="size-3 inline ml-1" />}
          </p>
        </div>
        {isMine && <NoteVisibilityBadge value={note.visibility} />}
      </header>
      <Markdown content={note.content} />
      {isMine && (
        <footer className="mt-2 flex justify-end gap-1">
          <button onClick={onEdit} className="ui-icon-button">수정</button>
          <button onClick={onDelete} className="ui-icon-button-danger">삭제</button>
        </footer>
      )}
    </article>
  )
}
```

---

## 7. 토픽 단위 노트 표출 위치

토픽(주제 블록) 카드의 우측 상단에 작은 `NotebookPen` 버튼:
- 클릭 시 우측 슬라이드 패널 또는 인라인 확장
- 본인 노트가 있으면 미리보기 + 수정 버튼
- 없으면 "이 주제에 노트 추가" CTA

→ 즉, 노트 탭 외에도 **블록 옆에서 즉시 노트** 가능.

---

## 8. 권한/검증

| 액션 | 본인 | 다른 사람 |
|---|---|---|
| 본인 노트 보기 (private 포함) | ✅ | ❌ |
| shared/public 노트 보기 | ✅ | ✅ (로그인 시) |
| 본인 노트 수정/삭제 | ✅ | ❌ |
| 다른 사람 노트 좋아요 | ❌ (v2) | ❌ (v2) |

서버 검증:
- `POST /challenge/notes`: `section_id` 또는 `topic_id` 둘 중 하나 필수, 둘 다는 가능 (토픽 + 자동으로 섹션 추론)
- `PATCH/DELETE`: `note.userId === user.id` 체크
- shared/public 조회: 본인 노트는 제외 (이미 mine 에 노출됨)

---

## 9. 화면 흐름

탭 "내 노트" 진입 시:
1. 상단: `[+ 새 노트]` 버튼 + 검색창 (v2)
2. 내 노트 (pinned 우선, 그다음 updatedAt desc)
3. 구분선
4. 공유받은 노트 (다른 유저의 shared/public)

비어있을 때 EmptyState:
- "이 챌린지에 대한 첫 노트를 남겨보세요. 학습 흔적이 곧 자산이 됩니다."

---

## 10. 추후 확장 (이번엔 안 함)

- 노트 좋아요/북마크
- 노트 댓글
- 노트 → blog post export
- 스터디 그룹 단위 공유
- 노트끼리 백링크 (`#section/회차/주제` 멘션)

---

## 11. 점검 체크리스트

- [ ] 본인 노트 생성/수정/삭제 — visibility 보존
- [ ] visibility 토글 → 다른 계정에서 즉시 노출/숨김
- [ ] 토픽 카드 옆 노트 버튼으로도 노트 추가 가능
- [ ] pinned 노트가 목록 최상단에 고정
- [ ] shared 탭에서 본인 노트 중복 노출 X
- [ ] section_id 또는 topic_id 없는 요청 → 400
- [ ] 다른 사람 노트 PATCH 시도 → 403
- [ ] 큰 노트 (10kb) 저장 OK

---

## 12. 다음 단계

→ `09-rollout-checklist.md` — 마무리 / 시드 / 회귀 / 배포

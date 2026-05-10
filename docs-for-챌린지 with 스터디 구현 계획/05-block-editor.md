# 05. 주제 블록 에디터 (Topic Block Editor)

> 마포 `TaskBlockEditor` 의 의도를 가져와, 챌린지의 "주제" 영역을 **블록 단위 콘텐츠**로 작성/저장한다.
> 기존 타워크레인의 `document_blocks` (catalog/docu) 패턴과 친구로 공존시킨다.

---

## 1. 블록 타입과 `content` JSON 스펙

| blockType | 용도 | content (JSON 직렬화) 예시 |
|---|---|---|
| `NOTE` | 리치텍스트 (Lexical) | `{ "format": "lexical", "state": { … } }` 또는 markdown 문자열 |
| `MMD` | Mermaid 다이어그램 | `{ "code": "graph TD; A-->B" }` |
| `CHECKLIST` | 자동 채점 항목 | `[ { "label": "Step 1", "point": 10 }, ... ]` |
| `GITHUB` | GitHub 링크/리포 카드 | `{ "url": "...", "label": "참고 코드" }` |
| `FIGMA` | Figma 임베드 | `{ "url": "..." }` |
| `FILE` | 첨부 파일 | `{ "url": "...", "name": "...", "size": 1234, "contentType": "..." }` |
| `DBTABLE` | DB 스키마 표 | `{ "columns": [{name, type, comment}], "rows": [...] }` (옵션) |

> 신규 블록 타입은 화이트리스트(`02-backend-module.md` 의 `blockTypeSchema`)에도 추가해야 한다.

---

## 2. 컴포넌트 구조

```
features/challenge/topic-editor/
├── ui/
│   ├── topic-editor.tsx                 ← 모드 라우팅 (admin: 편집, user: 뷰어)
│   ├── topic-list.tsx                    ← 블록 목록 + dnd
│   ├── topic-block.tsx                   ← 블록 1개 (read view)
│   ├── topic-block-form.tsx              ← 블록 1개 (edit form)
│   ├── add-block-menu.tsx                ← "블록 추가" 드롭다운
│   └── blocks/
│       ├── note-block.tsx
│       ├── mmd-block.tsx
│       ├── checklist-block.tsx
│       ├── github-block.tsx
│       ├── figma-block.tsx
│       ├── file-block.tsx
│       └── dbtable-block.tsx
└── lib/
    ├── parse-block-content.ts            ← JSON.parse 안전 래퍼 + 기본값
    └── block-icons.ts                    ← blockType → Lucide 매핑
```

---

## 3. admin 편집 vs user 뷰어 분기

```tsx
export function TopicEditor({ sectionId }: { sectionId: string }) {
  const role = useSessionStore((s) => s.userRole)
  if (role === 'admin') return <TopicEditorAdmin sectionId={sectionId} />
  return <TopicViewer sectionId={sectionId} />
}
```

- **TopicViewer (user)**: 읽기 전용. CHECKLIST 도 체크 불가능 (체크는 풀이 제출 폼에서만).
- **TopicEditorAdmin**: 블록 추가/삭제/순서 변경/내용 수정 → "저장" 버튼으로 일괄 PUT.

---

## 4. 편집 상태 관리

마포처럼 "전체를 한번에 저장" (PUT `/sections/:id/topics`) 패턴을 따른다.

```ts
type DraftBlock = {
  tempId: string                 // 신규는 randomUUID, 기존은 server id
  blockType: BlockType
  blockTitle: string | null
  content: string                // JSON string (저장 시 유지)
  orderIdx: number
  // 편집 보조 필드
  isDirty?: boolean
}

// useState<DraftBlock[]> 로 관리, 마운트 시 서버 데이터로 초기화
```

저장:
```ts
const save = () => saveTopicsMutation.mutate({
  sectionId,
  topics: draft.map(({ tempId, isDirty, ...rest }) => rest),
})
```

> 무지성 저장은 위험하므로 `isDirty` 또는 deep equal 비교 후, 변경 사항이 있을 때만 PUT.
> 저장 중 다른 섹션으로 이동하면 confirm dialog (마포처럼).

---

## 5. CHECKLIST 블록 작성 UX

핵심: **각 항목별 점수(point)** 를 admin 이 부여. 06번 풀이 제출 단계에서 자동 채점에 사용.

```tsx
function ChecklistBlockForm({ value, onChange }: ChecklistFormProps) {
  const items: { label: string; point: number }[] = JSON.parse(value || '[]')
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            value={it.label}
            onChange={(e) => updateItem(idx, { label: e.target.value })}
            className="ui-input flex-1"
          />
          <input
            type="number" min={0} max={100}
            value={it.point}
            onChange={(e) => updateItem(idx, { point: Number(e.target.value) })}
            className="ui-input w-20"
          />
          <button onClick={() => removeItem(idx)} className="ui-icon-button-danger">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button onClick={addItem} className="ui-text-brand-primary text-sm">
        + 항목 추가
      </button>
      {/* 일괄 입력 영역 (선택): 줄바꿈 텍스트로 한번에 추가 */}
      <BulkInput onApply={(rows) => setItems([...items, ...rows])} />
    </div>
  )
}
```

`BulkInput`: textarea 에 `라벨|점수` 한 줄씩 입력 → 파싱 후 추가.

---

## 6. NOTE 블록 (Lexical)

기존 프로젝트에 Lexical 0.43.0 이 이미 깔려있으므로 `shared/ui/` 에 있는 에디터(있다면)를 재사용. 없다면:

- `LexicalComposer` + `RichTextPlugin` + `HistoryPlugin` + `OnChangePlugin`
- onChange → editor.getEditorState().toJSON() 직렬화 후 `content` 에 저장
- 뷰어는 `LexicalComposer` 의 readonly 모드 또는 markdown 변환

> Lexical 통합은 분량이 크므로 별도 컴포넌트 (`shared/ui/rich-text-editor.tsx`) 로 빼고 NOTE 블록은 그걸 import.

---

## 7. MMD 블록 (Mermaid)

`shared/ui/mermaid.tsx` 가 이미 존재 (project context). 재사용.

```tsx
function MmdBlock({ content }: { content: string }) {
  const { code } = parseBlockContent<{ code: string }>(content, { code: '' })
  return <Mermaid chart={code} />
}
function MmdBlockForm({ value, onChange }: BlockFormProps) {
  return (
    <textarea
      value={JSON.parse(value || '{"code":""}').code}
      onChange={(e) => onChange(JSON.stringify({ code: e.target.value }))}
      className="ui-input font-mono text-sm min-h-40"
      placeholder="graph TD; A-->B"
    />
  )
}
```

---

## 8. 드래그 앤 드롭 (블록 순서)

메뉴 관리에서 정착한 패턴 그대로:
- 상위 SortableContext 1개 (전체 블록 ID 배열)
- collisionDetection: `closestCenter`
- activationConstraint: `{ distance: 8 }`
- 그립 핸들에만 listeners 부착, 클릭은 stopPropagation

---

## 9. 자동 저장 vs 명시적 저장

- **명시적 저장 권장** (마포 방식). 이유:
  - PUT 이 일괄 덮어쓰기라서 자동 저장이 위험 (의도치 않은 빈 배열로 덮을 수 있음).
  - "저장 안 됨" 표시 → 사용자가 명확히 인지.
- 단, 자동 임시 저장 (localStorage) 은 30초마다 1회 → 새로고침 후 복원 다이얼로그.
  - 키: `challenge:topic-draft:${sectionId}`

---

## 10. 점검 체크리스트

- [ ] admin 으로 7개 블록 타입 모두 생성/수정/삭제/순서변경 가능
- [ ] 일반 사용자는 편집 UI 가 보이지 않음 (뷰어만)
- [ ] 저장 → 새로고침 → 동일하게 복원
- [ ] 저장 안 한 변경 사항이 있는 채 다른 섹션으로 이동 시 confirm
- [ ] CHECKLIST 항목별 점수가 정상 저장 (서버 SELECT 로 확인)
- [ ] 큰 NOTE (10kb) 저장 OK
- [ ] DnD 가 하위 블록을 지나도 끊기지 않음

---

## 11. 다음 단계

→ `06-submission-feature.md` — 풀이 제출 + 자동 채점 + admin 평점

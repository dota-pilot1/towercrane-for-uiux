# 04. 프론트엔드 UI 구현 계획

## 대상 파일

기존 파일 수정:

```text
towercrane-for-uiux-front/src/pages/task/ui/task-page.tsx
```

새로 만들 파일:

```text
towercrane-for-uiux-front/src/features/task/ui/task-toolbar.tsx
towercrane-for-uiux-front/src/features/task/ui/task-table-view.tsx
towercrane-for-uiux-front/src/features/task/ui/task-kanban-view.tsx
towercrane-for-uiux-front/src/features/task/ui/task-card-view.tsx
towercrane-for-uiux-front/src/features/task/ui/task-card.tsx
towercrane-for-uiux-front/src/features/task/ui/task-detail-dialog.tsx
towercrane-for-uiux-front/src/features/task/ui/task-form-dialog.tsx
towercrane-for-uiux-front/src/features/task/ui/task-checklist-panel.tsx
towercrane-for-uiux-front/src/features/task/ui/task-comments-panel.tsx
towercrane-for-uiux-front/src/features/task/ui/task-activity-panel.tsx
towercrane-for-uiux-front/src/features/task/ui/task-badges.tsx
```

필요 시 공통화:

```text
towercrane-for-uiux-front/src/shared/ui/dialog.tsx
towercrane-for-uiux-front/src/shared/ui/badge.tsx
```

Radix Dialog/Tabs는 이미 설치되어 있으므로 기존 컴포넌트가 없으면 이 단계에서 얇은 wrapper를 만든다.

## 디자인 규칙

towercrane의 `AGENTS.md` 규칙을 따른다.

- `text-white`, `text-slate-*`, `bg-slate-*`, `bg-emerald-*` 같은 raw palette 금지
- `text-text-primary`, `text-brand-primary`, `bg-surface-muted`, `border-surface-border-soft` 사용
- 반복되는 배지/아이콘 버튼은 `task-badges.tsx`나 `shared/ui`로 분리
- 페이지 섹션은 큰 card 안에 card를 중첩하지 않는다
- 업무 화면은 운영 도구이므로 밀도 있게 만들고 과한 hero/마케팅 레이아웃은 피한다

## 1. `TaskPage` 상태 구조

`src/pages/task/ui/task-page.tsx`는 큰 컨테이너와 상태 조합만 맡긴다.

```ts
type TaskViewMode = 'table' | 'kanban' | 'card'

const [viewMode, setViewMode] = useState<TaskViewMode>('table')
const [filters, setFilters] = useState<TaskFilters>({
  archived: false,
  sort: 'order',
  page: 1,
  pageSize: 50,
})
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
const [isDetailOpen, setIsDetailOpen] = useState(false)
const [isFormOpen, setIsFormOpen] = useState(false)
```

렌더링 구조:

```tsx
<section className="space-y-4">
  <TaskToolbar ... />

  {viewMode === 'table' ? <TaskTableView ... /> : null}
  {viewMode === 'kanban' ? <TaskKanbanView ... /> : null}
  {viewMode === 'card' ? <TaskCardView ... /> : null}

  <TaskFormDialog ... />
  <TaskDetailDialog ... />
</section>
```

## 2. 상단 툴바

`task-toolbar.tsx`

포함 요소:

- 뷰 전환 segmented control: 테이블 / 칸반 / 카드
- 상태 카운트: 전체, 대기, 진행 중, 검토, 완료, 보류
- 유형 필터
- 우선순위 필터
- 담당자 필터
- 제목/본문 검색
- 보관함 토글
- 새 업무 버튼

권장 UI:

- 뷰 전환은 `shared/ui/toggle-group.tsx` 재사용
- 검색은 `shared/ui/search-field.tsx`가 있으면 재사용
- 필터는 native `shared/ui/select.tsx` 사용
- 새 업무 버튼은 `Button` + `Plus` icon

## 3. 테이블 뷰

`task-table-view.tsx`

팔란티어는 AG Grid를 사용하지만 towercrane에는 이미 TanStack Table이 있다. 1차 구현은 TanStack Table을 사용한다.

필수 컬럼:

| 컬럼 | 편집 방식 |
|---|---|
| 선택 checkbox | bulk archive/restore |
| No./ID | 읽기 전용 |
| 제목 | 클릭 시 상세, 필요 시 inline input |
| 유형 | select |
| 상태 | select 또는 badge menu |
| 우선순위 | select 또는 badge menu |
| 담당자 | select |
| 마감일 | date input |
| 작성자 | 읽기 전용 |
| 작성일 | 읽기 전용 |
| 상세 | icon button |

1차에서는 모든 셀을 완전 inline edit로 만들 필요는 없다. 팔란티어의 핵심 경험은 유지하되 구현 안정성을 위해 다음 순서를 추천한다.

1. 테이블 행 클릭/상세 버튼으로 상세 다이얼로그 열기
2. 상태/우선순위/담당자는 테이블에서 바로 PATCH
3. 제목/본문/마감일은 상세 다이얼로그에서 수정
4. bulk archive/restore만 테이블 선택으로 처리
5. row reorder는 `@dnd-kit/sortable`로 후속 구현

## 4. 칸반 뷰

`task-kanban-view.tsx`

팔란티어 `WorkKanbanView`의 구조를 towercrane 디자인 토큰으로 다시 구현한다.

컬럼:

- 대기 `TODO`
- 진행 중 `IN_PROGRESS`
- 검토 `REVIEW`
- 완료 `DONE`
- 보류 `HOLD`

동작:

- `@dnd-kit/core`의 `DndContext`, `useDraggable`, `useDroppable`
- 카드 드래그 종료 시 `updateStatus(taskId, status)`
- 상태 변경 성공 후 목록 invalidate
- 드래그 중에는 `DragOverlay`로 카드 표시

카드 표시 요소:

- 제목
- 우선순위
- 유형
- 담당자
- 마감일
- overdue 표시
- 댓글/체크리스트 카운트는 2차에서 추가 가능

## 5. 카드 뷰

`task-card-view.tsx`

팔란티어 `WorkCardView`처럼 미완료/완료 업무를 나눠 보는 뷰다.

구성:

- 왼쪽 또는 상단: 미완료 업무 그룹
- 오른쪽 또는 하단: 완료 업무 그룹
- 상태별 접기/펼치기
- 카드에서 상태/담당자 빠른 변경
- 완료 영역으로 드롭하면 `DONE`
- 미완료 영역으로 되돌리면 `TODO`

1차에서는 반응형을 단순하게 한다.

- desktop: `grid-cols-[1fr_1fr]`
- mobile: 세로 스택

## 6. 상세 다이얼로그

`task-detail-dialog.tsx`

상세는 팔란티어의 대형 `WorkDetailDialog`를 작은 탭 구조로 나눈다.

탭:

| 탭 | 내용 |
|---|---|
| 개요 | 제목, 본문, 유형, 상태, 우선순위, 담당자, 마감일 |
| 체크리스트 | 할 일 추가/토글/삭제 |
| 댓글 | 댓글 목록/작성/수정/삭제 |
| 활동 | 상태/담당자/우선순위 변경 로그 |

파일 분리:

- `task-form-dialog.tsx`: 새 업무 / 기본 정보 수정 폼
- `task-checklist-panel.tsx`: 체크리스트
- `task-comments-panel.tsx`: 댓글
- `task-activity-panel.tsx`: 로그

## 7. 새 업무 다이얼로그

`task-form-dialog.tsx`

필드:

- 제목: 필수
- 내용: 선택
- 유형: 기본 `FEATURE`
- 상태: 기본 `TODO`
- 우선순위: 기본 `MEDIUM`
- 담당자: 선택
- 마감일: 선택

생성 성공 후:

- 다이얼로그 닫기
- `taskQueryKeys.all` invalidate
- 새 업무 상세 열기는 선택 사항

## 8. 배지 컴포넌트

`task-badges.tsx`

반복되는 상태/우선순위/유형 표시를 분리한다.

```tsx
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold ...">
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}
```

raw 색상 대신 CSS 변수/semantic token으로 표현한다.

## 9. 빈 상태

기존 `TaskPage`의 placeholder는 기능 구현 후 다음 경우에만 사용한다.

- 검색 결과 없음
- 보관함이 비어 있음
- 아직 업무가 없음

문구:

- `등록된 업무가 없습니다.`
- `검색 조건에 맞는 업무가 없습니다.`
- `보관된 업무가 없습니다.`

## 10. 메뉴/라우팅

towercrane는 TanStack Router가 아니라 `activeSection` 상태로 화면을 전환한다. 따라서 별도 route 파일은 만들지 않는다.

확인할 파일:

```text
towercrane-for-uiux-front/src/app/App.tsx
towercrane-for-uiux-front/src/widgets/app-header/ui/app-header.tsx
towercrane-for-uiux-server/src/database/database.service.ts
```

이미 `activeSection === 'task'`가 `TaskPage`를 렌더링하므로 프론트 라우팅 수정은 거의 필요 없다. 빈 DB에서도 메뉴가 나오게 하려면 백엔드 seed menu에 `sectionId: 'task'`를 추가한다.

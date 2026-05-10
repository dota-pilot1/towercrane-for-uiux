# 단계 4 — 프론트엔드 features/issue UI

## 생성할 파일 (8개)

```
towercrane-for-uiux-front/src/features/issue/
├── model/
│   └── use-issue-queries.ts       ← React Query 훅 모음
└── ui/
    ├── issue-badges.tsx           ← 상태/타입/우선순위 배지
    ├── issue-form-dialog.tsx      ← 이슈 생성/수정 다이얼로그
    ├── issue-detail-dialog.tsx    ← 이슈 상세 다이얼로그 (댓글 포함)
    ├── issue-kanban-view.tsx      ← 칸반 보드 (기본 뷰)
    ├── issue-table-view.tsx       ← 테이블 뷰
    ├── issue-card.tsx             ← 칸반/테이블 공용 이슈 카드
    └── issue-comments-panel.tsx   ← 댓글 패널
```

> 패턴: `src/features/task/` 구조 그대로. 복붙 후 Task → Issue 치환.

---

## model/use-issue-queries.ts

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { issueApi } from '../../../entities/issue/api/issue-api'
import type { IssueFilters } from '../../../entities/issue/model/types'

// Query keys
const issueKeys = {
  all: ['issues'] as const,
  list: (filters: IssueFilters) => [...issueKeys.all, 'list', filters] as const,
  detail: (id: string) => [...issueKeys.all, 'detail', id] as const,
  comments: (id: string) => [...issueKeys.all, 'comments', id] as const,
}

// 조회 훅
export function useIssues(filters: IssueFilters) {
  return useQuery({
    queryKey: issueKeys.list(filters),
    queryFn: () => issueApi.list(filters),
  })
}

export function useIssueDetail(issueId: string, enabled = true) {
  return useQuery({
    queryKey: issueKeys.detail(issueId),
    queryFn: () => issueApi.detail(issueId),
    enabled,
  })
}

export function useIssueComments(issueId: string) {
  return useQuery({
    queryKey: issueKeys.comments(issueId),
    queryFn: () => issueApi.listComments(issueId),
  })
}

// 뮤테이션 훅
export function useCreateIssue(prototypeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: issueApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: issueKeys.all }),
  })
}

export function useUpdateIssue(issueId: string) { ... }
export function useDeleteIssue() { ... }
export function useUpdateIssueStatus() { ... }    // 칸반 드래그 시 호출
export function useReorderIssues() { ... }

// 댓글 뮤테이션
export function useCreateIssueComment(issueId: string) { ... }
export function useUpdateIssueComment(issueId: string) { ... }
export function useDeleteIssueComment(issueId: string) { ... }
```

---

## ui/issue-badges.tsx

```tsx
// Task 배지와 동일 패턴
export function IssueStatusBadge({ status }: { status: IssueStatus }) { ... }
export function IssuePriorityBadge({ priority }: { priority: IssuePriority }) { ... }
export function IssueTypeBadge({ issueType }: { issueType: IssueType }) { ... }
```

---

## ui/issue-kanban-view.tsx (핵심 — 기본 뷰)

```tsx
// dnd-kit 기반 드래그 앤 드롭 (task-kanban-view.tsx 패턴)
// 4개 컬럼: OPEN | IN_PROGRESS | TESTING | CLOSED
// 카드를 드래그해서 다른 컬럼으로 이동 → useUpdateIssueStatus 호출
// 같은 컬럼 내 드래그 → useReorderIssues 호출

export function IssueKanbanView({
  issues,
  onUpdateStatus,
  onReorder,
  onOpenDetail,
}: IssueKanbanViewProps) { ... }
```

컬럼 구성:
| 컬럼 | 헤더 색상 (semantic token) |
|------|--------------------------|
| OPEN | `text-text-secondary` |
| IN_PROGRESS | `text-brand-primary` |
| TESTING | warning 계열 |
| CLOSED | success 계열 |

---

## ui/issue-table-view.tsx

```tsx
// TanStack React Table 기반 (task-table-view.tsx 패턴)
// 컬럼: 제목, 타입, 상태, 우선순위, 담당자, 마감일, 작성자, 작성일, 액션
// 인라인 상태 변경 드롭다운
// 행 클릭 → detail dialog 오픈

export function IssueTableView({
  issues,
  isLoading,
  onOpenDetail,
}: IssueTableViewProps) { ... }
```

---

## ui/issue-form-dialog.tsx

```tsx
// 이슈 생성 / 수정 다이얼로그
// 필드:
//   - 제목 (text input)
//   - 내용 (textarea)
//   - 이슈 타입 (select: BUG/FEATURE/IMPROVEMENT/QUESTION/OTHER)
//   - 상태 (select: OPEN/IN_PROGRESS/TESTING/CLOSED)
//   - 우선순위 (select: LOW/MEDIUM/HIGH/URGENT)
//   - 담당자 (사용자 목록 select, useUsersList 재사용)
//   - 마감일 (date input)

export function IssueFormDialog({
  prototypeId,
  issue,         // undefined이면 생성, 값이 있으면 수정
  open,
  onOpenChange,
}: IssueFormDialogProps) { ... }
```

---

## ui/issue-detail-dialog.tsx

```tsx
// 이슈 상세 보기 + 수정
// 상단: 제목, 타입/상태/우선순위 배지, 담당자, 마감일
// 하단 2개 탭:
//   - 내용: 이슈 설명 (편집 가능)
//   - 댓글: IssueCommentsPanel

export function IssueDetailDialog({
  issueId,
  open,
  onOpenChange,
}: IssueDetailDialogProps) { ... }
```

---

## ui/issue-comments-panel.tsx

```tsx
// 댓글 목록 + 입력창
// task-comments-panel.tsx 와 동일 구조

export function IssueCommentsPanel({ issueId }: { issueId: string }) { ... }
```

---

## ui/issue-card.tsx

```tsx
// 칸반 보드에서 개별 카드
// 표시 정보: 타입 배지, 제목, 우선순위, 담당자 아바타, 마감일
// 클릭 → detail dialog

export function IssueCard({
  issue,
  onClick,
}: { issue: Issue; onClick: () => void }) { ... }
```

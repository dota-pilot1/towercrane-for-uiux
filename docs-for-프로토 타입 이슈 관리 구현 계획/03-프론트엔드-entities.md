# 단계 3 — 프론트엔드 entities/issue

## 생성할 파일 (3개)

```
towercrane-for-uiux-front/src/entities/issue/
├── model/
│   ├── types.ts       ← TypeScript 타입 정의
│   └── constants.ts   ← 레이블, 배지 CSS, 순서 상수
└── api/
    └── issue-api.ts   ← API 호출 함수
```

> 패턴: `src/entities/task/` 와 구조 동일.

---

## model/types.ts

```ts
export type IssueType = 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'QUESTION' | 'OTHER'
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'TESTING' | 'CLOSED'
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Issue = {
  id: string
  prototypeId: string
  title: string
  content: string
  issueType: IssueType
  status: IssueStatus
  priority: IssuePriority
  reporterId: string
  reporterName?: string | null
  reporterEmail?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeEmail?: string | null
  dueDate?: string | null
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type IssueListResponse = {
  items: Issue[]
  total: number
  page: number
  pageSize: number
}

export type IssueComment = {
  id: string
  issueId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export type IssueFilters = {
  prototypeId: string
  page?: number
  pageSize?: number
  q?: string
  issueType?: IssueType
  status?: IssueStatus
  priority?: IssuePriority
  assigneeId?: string
  sort?: 'order' | 'recent' | 'oldest' | 'priority'
}
```

---

## model/constants.ts

```ts
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  BUG: '버그',
  FEATURE: '기능 요청',
  IMPROVEMENT: '개선',
  QUESTION: '질문',
  OTHER: '기타',
}

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: '이슈 등록',
  IN_PROGRESS: '해결 진행',
  TESTING: '테스트',
  CLOSED: '완료',
}

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
}

// 칸반 컬럼 순서
export const ISSUE_STATUS_ORDER: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'TESTING', 'CLOSED']

// 배지 CSS (CLAUDE.md 규칙 준수 — semantic token)
export const ISSUE_STATUS_BADGE_CLASS: Record<IssueStatus, string> = {
  OPEN: 'border-surface-border bg-surface-muted text-text-secondary',
  IN_PROGRESS: 'border-brand-border bg-brand-glass text-brand-primary',
  TESTING: 'border-[var(--warning-border)] bg-[var(--warning-glass)] text-[var(--warning-primary)]',
  CLOSED: 'border-[var(--success-border)] bg-[var(--success-glass)] text-[var(--success-primary)]',
}

export const ISSUE_PRIORITY_BADGE_CLASS: Record<IssuePriority, string> = {
  LOW: 'border-surface-border bg-surface-muted text-text-muted',
  MEDIUM: 'border-surface-border bg-surface-raised text-text-secondary',
  HIGH: 'border-brand-border bg-brand-glass text-brand-primary',
  URGENT: 'border-danger-border bg-danger-glass text-danger-500',
}

export const ISSUE_TYPE_BADGE_CLASS: Record<IssueType, string> = {
  BUG: 'border-danger-border bg-danger-glass text-danger-500',
  FEATURE: 'border-brand-border bg-brand-glass text-brand-primary',
  IMPROVEMENT: 'border-[var(--info-border)] bg-[var(--info-glass)] text-[var(--info-primary)]',
  QUESTION: 'border-surface-border bg-surface-muted text-text-secondary',
  OTHER: 'border-surface-border-soft bg-surface-muted text-text-muted',
}
```

---

## api/issue-api.ts

```ts
import { apiFetch } from '../../../shared/api/fetch'   // 기존 fetch 유틸 재사용
import type { Issue, IssueListResponse, IssueComment, IssueFilters } from '../model/types'

const BASE = '/issues'

export const issueApi = {
  // 이슈 CRUD
  list: (filters: IssueFilters) =>
    apiFetch<IssueListResponse>(BASE, { params: filters }),

  detail: (issueId: string) =>
    apiFetch<Issue>(`${BASE}/${issueId}`),

  create: (body: Partial<Issue>) =>
    apiFetch<Issue>(BASE, { method: 'POST', body }),

  update: (issueId: string, body: Partial<Issue>) =>
    apiFetch<Issue>(`${BASE}/${issueId}`, { method: 'PATCH', body }),

  delete: (issueId: string) =>
    apiFetch<void>(`${BASE}/${issueId}`, { method: 'DELETE' }),

  updateStatus: (issueId: string, status: string) =>
    apiFetch<Issue>(`${BASE}/${issueId}/status`, { method: 'PATCH', body: { status } }),

  reorder: (items: { id: string; orderIdx: number }[]) =>
    apiFetch<void>(`${BASE}/reorder`, { method: 'POST', body: { items } }),

  // 댓글
  listComments: (issueId: string) =>
    apiFetch<IssueComment[]>(`${BASE}/${issueId}/comments`),

  createComment: (issueId: string, content: string) =>
    apiFetch<IssueComment>(`${BASE}/${issueId}/comments`, { method: 'POST', body: { content } }),

  updateComment: (issueId: string, commentId: string, content: string) =>
    apiFetch<IssueComment>(`${BASE}/${issueId}/comments/${commentId}`, { method: 'PATCH', body: { content } }),

  deleteComment: (issueId: string, commentId: string) =>
    apiFetch<void>(`${BASE}/${issueId}/comments/${commentId}`, { method: 'DELETE' }),
}
```

> `apiFetch` 유틸은 `src/shared/api/fetch.ts` (또는 동일 패턴 함수) 재사용.  
> 기존 task-api.ts 상단 import를 확인 후 동일하게 맞출 것.

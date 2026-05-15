# 03. 프론트엔드 데이터 계층 계획

## 대상 파일

새로 만들 파일:

```text
towercrane-for-uiux-front/src/entities/task/model/types.ts
towercrane-for-uiux-front/src/entities/task/model/constants.ts
towercrane-for-uiux-front/src/entities/task/api/task-api.ts
towercrane-for-uiux-front/src/features/task/model/use-task-queries.ts
```

수정할 파일:

```text
towercrane-for-uiux-front/src/pages/task/ui/task-page.tsx
```

## 타입 정의

`src/entities/task/model/types.ts`

```ts
export type TaskType =
  | 'FEATURE'
  | 'BUG'
  | 'DOCS'
  | 'DESIGN'
  | 'REFACTOR'
  | 'QA'
  | 'CHORE'

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE'
  | 'HOLD'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Task = {
  id: string
  title: string
  content: string
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
  reporterId: string
  reporterName?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  dueDate?: string | null
  orderIdx: number
  archived: boolean
  createdAt: string
  updatedAt: string
}

export type TaskListResponse = {
  items: Task[]
  total: number
  page: number
  pageSize: number
}

export type TaskFilters = {
  page?: number
  pageSize?: number
  q?: string
  taskType?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  archived?: boolean
  sort?: 'order' | 'recent' | 'oldest' | 'dueDate' | 'priority'
}

export type CreateTaskRequest = {
  title: string
  content?: string
  taskType?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>

export type TaskChecklist = {
  id: string
  taskId: string
  content: string
  completed: boolean
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type TaskComment = {
  id: string
  taskId: string
  userId: string
  userName?: string | null
  userEmail?: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export type TaskActivityLog = {
  id: string
  taskId: string
  actorId?: string | null
  actorName?: string | null
  activityType:
    | 'CREATED'
    | 'STATUS'
    | 'ASSIGNEE'
    | 'PRIORITY'
    | 'UPDATED'
    | 'ARCHIVED'
    | 'RESTORED'
  fromValue?: string | null
  toValue?: string | null
  message?: string | null
  createdAt: string
}
```

## 표시 상수

`src/entities/task/model/constants.ts`

raw Tailwind 팔레트 색상은 towercrane 규칙상 금지다. 상태 배지는 semantic token 조합으로 만든다.

```ts
import type { TaskPriority, TaskStatus, TaskType } from './types'

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FEATURE: '기능',
  BUG: '버그',
  DOCS: '문서',
  DESIGN: '디자인',
  REFACTOR: '리팩토링',
  QA: 'QA',
  CHORE: '기타',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: '대기',
  IN_PROGRESS: '진행 중',
  REVIEW: '검토',
  DONE: '완료',
  HOLD: '보류',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
  'HOLD',
]

export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
]
```

배지 클래스는 상수로 둬도 되지만 raw palette를 쓰지 않는다.

```ts
export const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  TODO: 'border-surface-border-soft bg-surface-muted ui-text-secondary',
  IN_PROGRESS: 'border-brand-border bg-brand-glass text-brand-primary',
  REVIEW: 'border-surface-border bg-surface-raised ui-text-primary',
  DONE: 'border-brand-border bg-brand-glass text-brand-primary',
  HOLD: 'border-surface-border-soft bg-surface-muted ui-text-muted',
}
```

## API 래퍼

`src/entities/task/api/task-api.ts`

```ts
import { apiRequest } from '../../../shared/api/http'
import type {
  CreateTaskRequest,
  Task,
  TaskActivityLog,
  TaskChecklist,
  TaskComment,
  TaskFilters,
  TaskListResponse,
  UpdateTaskRequest,
} from '../model/types'

function toSearchParams(filters?: TaskFilters) {
  const params = new URLSearchParams()
  if (!filters) return params

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  return params
}

export const taskApi = {
  list: (filters?: TaskFilters) => {
    const params = toSearchParams(filters)
    const query = params.toString()
    return apiRequest<TaskListResponse>(`/tasks${query ? `?${query}` : ''}`)
  },

  detail: (taskId: string) => apiRequest<Task>(`/tasks/${taskId}`),

  create: (body: CreateTaskRequest) =>
    apiRequest<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (taskId: string, body: UpdateTaskRequest) =>
    apiRequest<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (taskId: string) =>
    apiRequest<{ success: boolean }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  updateStatus: (taskId: string, status: Task['status']) =>
    apiRequest<Task>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updatePriority: (taskId: string, priority: Task['priority']) =>
    apiRequest<Task>(`/tasks/${taskId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),

  updateAssignee: (taskId: string, assigneeId: string | null) =>
    apiRequest<Task>(`/tasks/${taskId}/assignee`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeId }),
    }),

  reorder: (items: Array<{ id: string; orderIdx: number }>) =>
    apiRequest<{ success: boolean }>('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  archive: (ids: string[]) =>
    apiRequest<{ success: boolean }>('/tasks/archive', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  restore: (ids: string[]) =>
    apiRequest<{ success: boolean }>('/tasks/restore', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  listChecklists: (taskId: string) =>
    apiRequest<TaskChecklist[]>(`/tasks/${taskId}/checklists`),

  createChecklist: (taskId: string, content: string) =>
    apiRequest<TaskChecklist>(`/tasks/${taskId}/checklists`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateChecklist: (
    taskId: string,
    checklistId: string,
    body: Partial<Pick<TaskChecklist, 'content' | 'completed' | 'orderIdx'>>,
  ) =>
    apiRequest<TaskChecklist>(`/tasks/${taskId}/checklists/${checklistId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  toggleChecklist: (taskId: string, checklistId: string) =>
    apiRequest<TaskChecklist>(
      `/tasks/${taskId}/checklists/${checklistId}/toggle`,
      { method: 'PATCH' },
    ),

  deleteChecklist: (taskId: string, checklistId: string) =>
    apiRequest<{ success: boolean }>(
      `/tasks/${taskId}/checklists/${checklistId}`,
      { method: 'DELETE' },
    ),

  listComments: (taskId: string) =>
    apiRequest<TaskComment[]>(`/tasks/${taskId}/comments`),

  createComment: (taskId: string, content: string) =>
    apiRequest<TaskComment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateComment: (taskId: string, commentId: string, content: string) =>
    apiRequest<TaskComment>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (taskId: string, commentId: string) =>
    apiRequest<{ success: boolean }>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  listActivity: (taskId: string) =>
    apiRequest<TaskActivityLog[]>(`/tasks/${taskId}/activity`),
}
```

## Query hooks

`src/features/task/model/use-task-queries.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { taskApi } from '../../../entities/task/api/task-api'
import type {
  CreateTaskRequest,
  TaskFilters,
  UpdateTaskRequest,
} from '../../../entities/task/model/types'

export const taskQueryKeys = {
  all: ['tasks'] as const,
  list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
  detail: (taskId: string | null) => ['tasks', 'detail', taskId] as const,
  checklists: (taskId: string | null) => ['tasks', 'checklists', taskId] as const,
  comments: (taskId: string | null) => ['tasks', 'comments', taskId] as const,
  activity: (taskId: string | null) => ['tasks', 'activity', taskId] as const,
}
```

필요 hook:

- `useTasks(filters)`
- `useTaskDetail(taskId, enabled)`
- `useCreateTask()`
- `useUpdateTask()`
- `useDeleteTask()`
- `useUpdateTaskStatus()`
- `useUpdateTaskPriority()`
- `useUpdateTaskAssignee()`
- `useReorderTasks()`
- `useArchiveTasks()`
- `useRestoreTasks()`
- `useTaskChecklists(taskId)`
- `useCreateTaskChecklist(taskId)`
- `useToggleTaskChecklist(taskId)`
- `useDeleteTaskChecklist(taskId)`
- `useTaskComments(taskId)`
- `useCreateTaskComment(taskId)`
- `useUpdateTaskComment(taskId)`
- `useDeleteTaskComment(taskId)`
- `useTaskActivity(taskId)`

mutation 성공 시 기본 invalidate:

```ts
queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
```

상세 화면 안에서 체크리스트나 댓글만 바뀔 때는 해당 query만 invalidate한다.

```ts
queryClient.invalidateQueries({
  queryKey: taskQueryKeys.checklists(taskId),
})
```

## 기존 사용자 목록 재사용

담당자 선택에는 기존 hook을 재사용한다.

```text
towercrane-for-uiux-front/src/shared/api/users.ts
```

현재 `useUsersList()`는 admin만 활성화된다. 업무 담당자 목록은 일반 사용자도 필요하므로 백엔드 또는 프론트 중 하나를 조정해야 한다.

권장:

1. 백엔드 `UsersController`에 `GET /users/assignable` 추가
2. 로그인 사용자면 `id`, `name`, `email`, `profileImageUrl`만 반환
3. 프론트 `useAssignableUsers()` 추가

파일:

```text
towercrane-for-uiux-server/src/users/users.controller.ts
towercrane-for-uiux-server/src/users/users.service.ts
towercrane-for-uiux-front/src/shared/api/users.ts
```

## 캐시 정책

- 목록: 필터 객체를 query key에 포함
- 상세: `taskId` 단위
- 체크리스트/댓글/활동: 상세 다이얼로그가 열릴 때만 enabled
- 상태 드래그 변경: optimistic update를 적용하면 좋지만 1차는 invalidate로 충분

## API 네이밍 주의

`src/shared/api/http.ts`:

```ts
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api'
```

따라서 업무 API는 반드시 다음처럼 호출한다.

```ts
apiRequest('/tasks')
apiRequest(`/tasks/${taskId}`)
```

다음은 잘못된 호출이다.

```ts
apiRequest('/api/tasks')
```

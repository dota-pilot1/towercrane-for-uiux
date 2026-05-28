import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Activity,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckSquare,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import {
  TASK_ACTIVITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '../../../entities/task/model/constants'
import type {
  CreateTaskRequest,
  Task,
  TaskActivityLog,
  TaskFilters,
  TaskPriority,
  TaskScope,
  TaskStatus,
  TaskType,
} from '../../../entities/task/model/types'
import { taskApi } from '../../../entities/task/api/task-api'
import { useAssignableUsers } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { Switch } from '../../../shared/ui/switch'
import { ToggleGroup } from '../../../shared/ui/toggle-group'
import { TaskCardView } from '../../../features/task/ui/task-card-view'
import { TaskFormDialog } from '../../../features/task/ui/task-form-dialog'
import { TaskKanbanView } from '../../../features/task/ui/task-kanban-view'
import { TaskTableView } from '../../../features/task/ui/task-table-view'
import { TaskToolbar, type TaskViewMode } from '../../../features/task/ui/task-toolbar'
import {
  useArchiveTasks,
  useCreateTask,
  useCreateWorkspaceTask,
  useDeleteTasks,
  useRestoreTasks,
  taskQueryKeys,
  useTasks,
  useWorkspaceTasks,
  useTaskWorkspaces,
} from '../../../features/task/model/use-task-queries'
import { PageHeader } from '../../../shared/ui/page-header'
import { useSessionStore } from '../../../shared/store/session-store'

type TaskScopeMode = 'all' | 'my' | 'user'

function getInitialFilters(scopeMode: TaskScopeMode, targetUserId?: string): TaskFilters {
  return {
    archived: false,
    sort: 'order',
    page: 1,
    pageSize: 50,
    scope: scopeMode,
    userId: scopeMode === 'user' ? targetUserId : undefined,
  }
}

function emptyMessage(filters: TaskFilters, scopeMode: TaskScopeMode) {
  if (filters.archived) return '보관된 업무가 없습니다.'
  if (scopeMode === 'my') return '내 업무가 없습니다.'
  if (scopeMode === 'user') return '선택한 담당자의 업무가 없습니다.'
  if (filters.q || filters.status || filters.taskType || filters.priority || filters.assigneeId) {
    return '검색 조건에 맞는 업무가 없습니다.'
  }
  return '등록된 업무가 없습니다.'
}

function formatActivityTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim()
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!match) return { meta: {} as Record<string, string>, body: markdown }

  const meta = match[1].split('\n').reduce<Record<string, string>>((acc, line) => {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex < 0) return acc
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) acc[key] = value
    return acc
  }, {})

  return {
    meta,
    body: markdown.slice(match[0].length),
  }
}

function getMarkdownTitle(markdown: string, fallback: string) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return title || stripExtension(fallback) || '새 업무'
}

function readMarkdownSection(markdown: string, sectionNames: string[]) {
  for (const name of sectionNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = markdown.match(
      new RegExp(`(?:^|\\n)#{2,3}\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n#{2,3}\\s+|$)`, 'i'),
    )
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return ''
}

function stripMarkdownFence(value: string) {
  const match = value.trim().match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```$/)
  return (match?.[1] ?? value).trim()
}

function normalizeTaskType(value?: string): TaskType {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'BUG' || value === '버그') return 'BUG'
  if (normalized === 'DOCS' || value === '문서') return 'DOCS'
  if (normalized === 'DESIGN' || value === '디자인') return 'DESIGN'
  if (normalized === 'REFACTOR' || value === '리팩터링') return 'REFACTOR'
  if (normalized === 'QA' || value === '테스트') return 'QA'
  if (normalized === 'CHORE' || value === '작업') return 'CHORE'
  return 'FEATURE'
}

function normalizeTaskStatus(value?: string): TaskStatus {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'IN_PROGRESS' || normalized === 'PROGRESS' || value === '진행 중') return 'IN_PROGRESS'
  if (normalized === 'REVIEW' || value === '검토') return 'REVIEW'
  if (normalized === 'DONE' || value === '완료') return 'DONE'
  if (normalized === 'HOLD' || value === '보류') return 'HOLD'
  return 'TODO'
}

function normalizeTaskPriority(value?: string): TaskPriority {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'LOW' || value === '낮음') return 'LOW'
  if (normalized === 'HIGH' || value === '높음') return 'HIGH'
  if (normalized === 'URGENT' || value === '긴급') return 'URGENT'
  return 'MEDIUM'
}

function buildTaskPayloadFromFile(
  fileName: string,
  markdown: string,
  defaultScope: TaskScope,
  currentUserId?: string | null,
  lockAssigneeToCurrentUser = false,
): CreateTaskRequest {
  const { meta, body } = parseFrontmatter(markdown)
  const title = meta.title || getMarkdownTitle(body, fileName)
  const content =
    readMarkdownSection(body, ['내용', '업무 내용', '업무 배경', '배경', 'Content', 'Summary']) ||
    body
      .replace(/^#\s+.+$/m, '')
      .trim()
      .slice(0, 500)
  const plan = readMarkdownSection(body, ['단계별 계획', '구현 계획', '계획', 'Plan'])
  const folderStructure = stripMarkdownFence(
    readMarkdownSection(body, ['예상 파일 구조', '파일 구조', '폴더 구조', 'Folder Structure']),
  )
  const mmdContent = stripMarkdownFence(
    readMarkdownSection(body, ['MMD', 'Mermaid', '흐름도', 'Flow']),
  )

  return {
    title,
    content,
    plan,
    folderStructure,
    mmdContent,
    taskType: normalizeTaskType(meta.type || meta.taskType),
    status: normalizeTaskStatus(meta.status),
    priority: normalizeTaskPriority(meta.priority),
    scope: defaultScope,
    visibility: defaultScope === 'PERSONAL' ? 'PRIVATE' : 'TEAM',
    assigneeId: lockAssigneeToCurrentUser ? currentUserId : (meta.assigneeId || null),
    dueDate: meta.dueDate || meta.due || null,
  }
}

type ActivityWithTask = TaskActivityLog & {
  taskTitle: string
  taskAssigneeId?: string | null
  taskReporterId: string
  taskOwnerId?: string | null
}

type ActivityFilter = 'all' | 'mine'

const ACTIVITY_FILTER_LABELS: Record<ActivityFilter, string> = {
  all: '전체',
  mine: '나',
}

function matchesActivityFilter(
  activity: ActivityWithTask,
  filter: ActivityFilter,
  currentUserId?: string | null,
) {
  if (filter === 'all') return true
  if (!currentUserId) return false

  if (filter === 'mine') {
    return (
      activity.actorId === currentUserId ||
      activity.taskAssigneeId === currentUserId ||
      activity.taskReporterId === currentUserId ||
      activity.taskOwnerId === currentUserId
    )
  }

  return false
}

function TaskActivityListFooter({
  tasks,
  currentUserId,
}: {
  tasks: Task[]
  currentUserId?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const trackedTasks = useMemo(() => tasks.slice(0, 25), [tasks])
  const activityQueries = useQueries({
    queries: trackedTasks.map((task) => ({
      queryKey: taskQueryKeys.activity(task.id),
      queryFn: () => taskApi.listActivity(task.id),
      enabled: Boolean(task.id),
      refetchInterval: 15_000,
    })),
  })
  const isLoading = activityQueries.some((query) => query.isLoading)
  const allActivities = useMemo<ActivityWithTask[]>(() => {
    return activityQueries
      .flatMap((query, index) =>
        (query.data ?? []).map((activity) => ({
          ...activity,
          taskTitle: trackedTasks[index]?.title ?? '업무',
          taskAssigneeId: trackedTasks[index]?.assigneeId,
          taskReporterId: trackedTasks[index]?.reporterId ?? '',
          taskOwnerId: trackedTasks[index]?.ownerId,
        })),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [activityQueries, trackedTasks])
  const filterCounts = useMemo<Record<ActivityFilter, number>>(
    () => ({
      all: allActivities.length,
      mine: allActivities.filter((activity) =>
        matchesActivityFilter(activity, 'mine', currentUserId),
      ).length,
    }),
    [allActivities, currentUserId],
  )
  const activities = useMemo(
    () =>
      allActivities
        .filter((activity) => matchesActivityFilter(activity, filter, currentUserId))
        .slice(0, 12),
    [allActivities, currentUserId, filter],
  )
  if (tasks.length === 0) return null

  return (
    <div className="fixed inset-x-4 bottom-3 z-40 overflow-hidden rounded-md border border-surface-border bg-surface-muted shadow-lg sm:inset-x-7">
      <div className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-brand-border bg-brand-glass px-4 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-surface-border"
          aria-expanded={open}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-brand-border bg-surface-raised text-brand-primary">
            <Activity className="size-3.5" />
          </span>
          <span className="truncate text-sm font-black text-text-primary">
            업무 활동 {filterCounts[filter]}
          </span>
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>

        <div className="flex shrink-0 items-center rounded-md border border-brand-border bg-surface-raised p-0.5">
          {(Object.keys(ACTIVITY_FILTER_LABELS) as ActivityFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`h-8 rounded-sm px-3 text-xs font-black outline-none transition-colors focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-surface-border ${
                filter === item
                  ? 'bg-brand-primary text-text-on-brand shadow-sm'
                  : 'text-text-secondary hover:bg-surface-strong hover:text-text-primary'
              }`}
            >
              {ACTIVITY_FILTER_LABELS[item]} {filterCounts[item]}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="bg-surface-muted">
            <div className="max-h-80 overflow-y-auto p-3 sm:p-4">
              {activities.length === 0 ? (
                <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-raised px-4 py-8 text-center text-sm text-text-muted">
                  {isLoading
                    ? '활동 로그를 불러오는 중입니다.'
                    : `${ACTIVITY_FILTER_LABELS[filter]} 알림이 없습니다.`}
                </div>
              ) : (
                <ul className="space-y-2">
                  {activities.map((activity) => (
                    <li
                      key={`${activity.taskId}-${activity.id}`}
                      className="rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-black text-brand-primary">
                              {TASK_ACTIVITY_LABELS[activity.activityType]}
                            </span>
                            <span className="truncate text-sm font-black text-text-primary">
                              {activity.message ?? '업무 이력이 기록되었습니다.'}
                            </span>
                          </div>
                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                            <span className="truncate font-bold text-text-secondary">
                              {activity.taskTitle}
                            </span>
                            {activity.fromValue || activity.toValue ? (
                              <span>
                                {activity.fromValue ?? '-'} → {activity.toValue ?? '-'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-xs text-text-muted">
                          <div>{activity.actorName ?? '시스템'}</div>
                          <div className="mt-1">{formatActivityTime(activity.createdAt)}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskPagination({
  viewMode,
  page,
  pageSize,
  total,
  onChange,
}: {
  viewMode: TaskViewMode
  page: number
  pageSize: number
  total: number
  onChange: (next: Pick<TaskFilters, 'page' | 'pageSize'>) => void
}) {
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)
  const pageSizeOptions = [10, 20, 50, 100]

  return (
    <div className="flex flex-col gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-text-secondary">
        <span className="font-bold text-text-primary">{start}-{end}</span>
        <span> / {total}개</span>
        {viewMode !== 'table' ? (
          <span className="ml-2 text-xs text-text-muted">
            {viewMode === 'kanban' ? '칸반' : '카드'}도 현재 페이지 기준으로 표시됩니다.
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPageSizeOpen(false)
            }
          }}
        >
          <button
            type="button"
            className="flex h-8 min-w-[78px] items-center justify-between gap-1 rounded-md border border-surface-border-soft bg-surface-raised px-2.5 text-xs font-medium text-text-primary transition-colors hover:border-brand-border hover:bg-brand-glass focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-border"
            onClick={() => setIsPageSizeOpen((value) => !value)}
            aria-haspopup="listbox"
            aria-expanded={isPageSizeOpen}
            aria-label="페이지 크기"
          >
            <span>{pageSize}개씩</span>
            <ChevronDown className="size-3 text-text-muted" />
          </button>

          {isPageSizeOpen ? (
            <div
              className="absolute bottom-full right-0 z-20 mb-1 w-[78px] overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-lg"
              role="listbox"
              aria-label="페이지 크기"
            >
              {pageSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  role="option"
                  aria-selected={pageSize === size}
                  className={`flex h-8 w-full items-center px-2.5 text-left text-xs transition-colors ${
                    pageSize === size
                      ? 'bg-brand-glass font-bold text-brand-primary'
                      : 'font-medium text-text-primary hover:bg-surface-muted'
                  }`}
                  onClick={() => {
                    setIsPageSizeOpen(false)
                    onChange({ page: 1, pageSize: size })
                  }}
                >
                  {size}개씩
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 min-h-8 w-8 rounded-md"
            onClick={() => onChange({ page: 1, pageSize })}
            disabled={safePage <= 1}
            aria-label="첫 페이지"
            title="첫 페이지"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 min-h-8 w-8 rounded-md"
            onClick={() => onChange({ page: safePage - 1, pageSize })}
            disabled={safePage <= 1}
            aria-label="이전 페이지"
            title="이전 페이지"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="flex h-8 min-w-16 items-center justify-center rounded-md border border-surface-border-soft bg-surface-raised px-3 text-xs font-medium text-text-secondary">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 min-h-8 w-8 rounded-md"
            onClick={() => onChange({ page: safePage + 1, pageSize })}
            disabled={safePage >= totalPages}
            aria-label="다음 페이지"
            title="다음 페이지"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 min-h-8 w-8 rounded-md"
            onClick={() => onChange({ page: totalPages, pageSize })}
            disabled={safePage >= totalPages}
            aria-label="마지막 페이지"
            title="마지막 페이지"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TaskPage({
  scopeMode,
  targetUserId,
  workspaceId,
}: {
  scopeMode: TaskScopeMode
  targetUserId?: string
  workspaceId?: string
}) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<TaskViewMode>('table')
  const [filters, setFilters] = useState<TaskFilters>(() =>
    getInitialFilters(scopeMode, targetUserId),
  )
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const currentUserId = useSessionStore((state) => state.userId)
  const currentUserName = useSessionStore((state) => state.userName)
  const currentUserRole = useSessionStore((state) => state.userRole)
  const isAdmin = currentUserRole === 'admin'

  const normalizedFilters = useMemo(
    () => ({
      ...getInitialFilters(scopeMode, targetUserId),
      ...filters,
      scope: scopeMode,
      userId: scopeMode === 'user' ? targetUserId : undefined,
    }),
    [filters, scopeMode, targetUserId],
  )

  const workspacesQuery = useTaskWorkspaces()
  const currentWorkspace = workspaceId
    ? (workspacesQuery.data ?? []).find((ws) => ws.id === workspaceId)
    : null
  const allTasksQuery = useTasks(normalizedFilters)
  const wsTasksQuery = useWorkspaceTasks(workspaceId ?? '', normalizedFilters)
  const tasksQuery = workspaceId ? wsTasksQuery : allTasksQuery
  const assignableUsersQuery = useAssignableUsers()
  const archiveTasks = useArchiveTasks()
  const restoreTasks = useRestoreTasks()
  const deleteTasks = useDeleteTasks()
  const createTask = useCreateTask()
  const createWorkspaceTask = useCreateWorkspaceTask(workspaceId ?? '')
  const tasks = tasksQuery.data?.items ?? []
  const users = assignableUsersQuery.data ?? []
  const targetUser = targetUserId
    ? users.find((user) => user.id === targetUserId)
    : null
  const scopeTitle =
    workspaceId
      ? `${currentWorkspace?.name ?? '워크스페이스'} 업무`
      : scopeMode === 'my'
      ? `${currentUserName || '내'}의 업무`
      : scopeMode === 'user'
        ? `${targetUser?.name ?? '선택한 사용자'}의 업무`
        : '전체 업무'
  const scopeDescription =
    workspaceId
      ? (currentWorkspace?.description ?? '워크스페이스에 묶인 업무를 관리합니다.')
      : scopeMode === 'my'
      ? '내가 담당하거나 개인으로 등록한 업무를 관리합니다.'
      : scopeMode === 'user'
        ? '선택한 담당자의 팀 업무를 확인합니다.'
        : '프로젝트 전체 업무, 담당자, 체크리스트와 댓글을 관리합니다.'
  const total = tasksQuery.data?.total ?? 0
  const page = normalizedFilters.page ?? 1
  const pageSize = normalizedFilters.pageSize ?? 50

  const statusCounts = TASK_STATUS_ORDER.reduce<Record<TaskStatus, number>>(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status).length
      return acc
    },
    { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, HOLD: 0 },
  )

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return
    const action = normalizedFilters.archived ? restoreTasks : archiveTasks
    await action.mutateAsync(selectedIds)
    setSelectedIds([])
  }

  const handleDeleteSelectedTasks = async () => {
    if (selectedIds.length === 0) return
    const confirmed = window.confirm(
      `선택한 업무 ${selectedIds.length}개를 삭제할까요? 삭제 후에는 복원할 수 없습니다.`,
    )
    if (!confirmed) return

    await deleteTasks.mutateAsync(selectedIds)
    setSelectedIds([])
  }

  const handleOpenTask = (taskId: string) => {
    navigate({ to: `/task/${taskId}` })
  }

  const handleCreateTaskFromFile = async (file: File) => {
    try {
      const markdown = await file.text()
      const payload = buildTaskPayloadFromFile(
        file.name,
        markdown,
        scopeMode === 'my' ? 'PERSONAL' : 'TEAM',
        currentUserId,
        scopeMode === 'my',
      )

      if (!payload.title.trim()) {
        toast.error('파일에서 업무 제목을 찾을 수 없습니다.')
        return
      }

      if (workspaceId) {
        await createWorkspaceTask.mutateAsync(payload)
      } else {
        await createTask.mutateAsync(payload)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '업무 파일 등록에 실패했습니다.')
    }
  }

  return (
    <section className={`space-y-4 ui-page-bg ${tasks.length > 0 ? 'pb-20' : 'pb-8'}`}>

      <PageHeader
        icon={CheckSquare}
        title={scopeTitle}
        description={scopeDescription}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate({ to: '/task' })}
            className="gap-1.5 shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ChevronLeft className="size-3.5" />
            워크스페이스 목록
          </Button>
        }
      />

      <TaskToolbar
        filters={normalizedFilters}
        onFiltersChange={setFilters}
        users={users}
        assigneeLabel={scopeMode === 'user' ? (targetUser?.name ?? '담당자') : '내 업무'}
        isFetching={tasksQuery.isFetching}
        onCreate={() => setIsFormOpen(true)}
        onCreateFromFile={handleCreateTaskFromFile}
        isCreateFromFilePending={createTask.isPending || createWorkspaceTask.isPending}
        onRefresh={() => tasksQuery.refetch()}
        showAssigneeFilter={scopeMode === 'all'}
      />

      {/* content bar: 상태 필터(좌) + 선택 보관 + 뷰 토글(우) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, status: undefined, page: 1 }))}
            className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border px-3 text-xs font-bold transition-all ${
              !normalizedFilters.status
                ? 'bg-brand-primary text-text-on-brand border-brand-primary shadow-sm shadow-brand-primary/10'
                : 'bg-surface-raised text-text-secondary border-surface-border-soft hover:bg-brand-glass hover:text-brand-primary hover:border-brand-border'
            }`}
          >
            전체 {total}
          </button>
          {TASK_STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  status: f.status === status ? undefined : status,
                  page: 1,
                }))
              }
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-xs transition-all ${
                normalizedFilters.status === status
                  ? 'bg-brand-primary text-text-on-brand border-brand-primary font-bold shadow-sm shadow-brand-primary/10'
                  : 'bg-surface-raised text-text-secondary border-surface-border-soft hover:bg-brand-glass hover:text-brand-primary hover:border-brand-border'
              }`}
            >
              {TASK_STATUS_LABELS[status]}
              <span className={normalizedFilters.status === status ? 'text-text-on-brand font-black' : 'text-text-muted font-black'}>
                {statusCounts[status]}
              </span>
            </button>
          ))}
          <div className="ml-1 border-l border-surface-border-soft pl-3">
            <Switch
              checked={Boolean(normalizedFilters.archived)}
              onCheckedChange={(checked) =>
                setFilters((f) => ({ ...f, archived: checked, page: 1 }))
              }
              label={normalizedFilters.archived ? '보관함 보기' : '진행 업무 보기'}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({
                page: 1,
                pageSize: normalizedFilters.pageSize ?? 50,
                archived: false,
                sort: 'order',
                scope: scopeMode,
                userId: scopeMode === 'user' ? targetUserId : undefined,
              })
            }
          >
            필터 초기화
          </Button>
          {viewMode === 'table' && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9"
                disabled={
                  selectedIds.length === 0 ||
                  archiveTasks.isPending ||
                  restoreTasks.isPending ||
                  deleteTasks.isPending
                }
                onClick={handleBulkAction}
              >
                {normalizedFilters.archived ? (
                  <ArchiveRestore className="mr-1.5 size-3.5" />
                ) : (
                  <Archive className="mr-1.5 size-3.5" />
                )}
                {selectedIds.length > 0 ? `${selectedIds.length}개 ` : ''}
                {normalizedFilters.archived ? '선택 복원' : '선택 보관'}
              </Button>
              {isAdmin ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 border-destructive bg-danger-glass text-destructive hover:bg-danger-glass"
                  disabled={
                    selectedIds.length === 0 ||
                    archiveTasks.isPending ||
                    restoreTasks.isPending ||
                    deleteTasks.isPending
                  }
                  onClick={handleDeleteSelectedTasks}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  {selectedIds.length > 0 ? `${selectedIds.length}개 ` : ''}
                  선택 삭제
                </Button>
              ) : null}
            </>
          )}
          <ToggleGroup<TaskViewMode>
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'table', label: '테이블' },
              { value: 'kanban', label: '칸반' },
              { value: 'card', label: '카드' },
            ]}
          />
        </div>
      </div>

      {tasksQuery.error ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive bg-danger-glass px-4 py-3 text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold">업무를 불러오지 못했습니다.</p>
            <p className="mt-1 text-xs">
              {tasksQuery.error instanceof Error
                ? tasksQuery.error.message
                : '잠시 후 다시 시도하세요.'}
            </p>
          </div>
        </div>
      ) : null}

      {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-16 text-center">
          <p className="text-sm text-text-muted">
            {emptyMessage(normalizedFilters, scopeMode)}
          </p>
          {!normalizedFilters.archived ? (
            <Button
              type="button"
              className="mt-4"
              onClick={() => setIsFormOpen(true)}
            >
              새 업무 만들기
            </Button>
          ) : null}
        </div>
      ) : null}

      {tasks.length > 0 || tasksQuery.isLoading ? (
        <>
          {viewMode === 'table' ? (
            <TaskTableView
              tasks={tasks}
              users={users}
              onSelectionChange={setSelectedIds}
              canReorder={
                !normalizedFilters.archived &&
                normalizedFilters.sort === 'order' &&
                tasks.length > 1
              }
              isLoading={tasksQuery.isLoading}
              onOpenTask={handleOpenTask}
            />
          ) : null}
          {viewMode === 'kanban' ? (
            <TaskKanbanView tasks={tasks} onOpenTask={handleOpenTask} />
          ) : null}
          {viewMode === 'card' ? (
            <TaskCardView tasks={tasks} onOpenTask={handleOpenTask} />
          ) : null}
        </>
      ) : null}

      {total > 0 ? (
        <TaskPagination
          viewMode={viewMode}
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={(next) =>
            setFilters((prev) => ({
              ...prev,
              ...next,
            }))
          }
        />
      ) : null}

      <TaskActivityListFooter tasks={tasks} currentUserId={currentUserId} />

      <TaskFormDialog
        open={isFormOpen}
        users={users}
        defaultScope={scopeMode === 'my' ? 'PERSONAL' : 'TEAM'}
        currentUserId={currentUserId}
        lockAssigneeToCurrentUser={scopeMode === 'my'}
        workspaceId={workspaceId}
        onOpenChange={setIsFormOpen}
      />
    </section>
  )
}

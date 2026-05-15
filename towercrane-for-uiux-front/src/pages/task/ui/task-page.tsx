import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '../../../entities/task/model/constants'
import type { TaskFilters, TaskStatus } from '../../../entities/task/model/types'
import { useAssignableUsers } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { Switch } from '../../../shared/ui/switch'
import { ToggleGroup } from '../../../shared/ui/toggle-group'
import { TaskCardView } from '../../../features/task/ui/task-card-view'
import { TaskDetailDialog } from '../../../features/task/ui/task-detail-dialog'
import { TaskFormDialog } from '../../../features/task/ui/task-form-dialog'
import { TaskKanbanView } from '../../../features/task/ui/task-kanban-view'
import { TaskTableView } from '../../../features/task/ui/task-table-view'
import { TaskToolbar, type TaskViewMode } from '../../../features/task/ui/task-toolbar'
import { useArchiveTasks, useRestoreTasks, useTasks } from '../../../features/task/model/use-task-queries'
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)

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
        <CompactSelect
          value={String(pageSize)}
          wrapperClassName="w-28"
          className="h-9 pl-3 pr-9 text-sm font-bold"
          onChange={(event) =>
            onChange({
              page: 1,
              pageSize: Number(event.target.value),
            })
          }
          aria-label="페이지 크기"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}개씩
            </option>
          ))}
        </CompactSelect>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
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
            onClick={() => onChange({ page: safePage - 1, pageSize })}
            disabled={safePage <= 1}
            aria-label="이전 페이지"
            title="이전 페이지"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="flex h-9 min-w-20 items-center justify-center rounded-md border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-secondary">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
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
}: {
  scopeMode: TaskScopeMode
  targetUserId?: string
}) {
  const [viewMode, setViewMode] = useState<TaskViewMode>('table')
  const [filters, setFilters] = useState<TaskFilters>(() =>
    getInitialFilters(scopeMode, targetUserId),
  )
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const currentUserId = useSessionStore((state) => state.userId)
  const currentUserName = useSessionStore((state) => state.userName)

  const normalizedFilters = useMemo(
    () => ({
      ...getInitialFilters(scopeMode, targetUserId),
      ...filters,
      scope: scopeMode,
      userId: scopeMode === 'user' ? targetUserId : undefined,
    }),
    [filters, scopeMode, targetUserId],
  )

  const tasksQuery = useTasks(normalizedFilters)
  const assignableUsersQuery = useAssignableUsers()
  const archiveTasks = useArchiveTasks()
  const restoreTasks = useRestoreTasks()
  const tasks = tasksQuery.data?.items ?? []
  const users = assignableUsersQuery.data ?? []
  const targetUser = targetUserId
    ? users.find((user) => user.id === targetUserId)
    : null
  const scopeTitle =
    scopeMode === 'my'
      ? `${currentUserName || '내'}의 업무`
      : scopeMode === 'user'
        ? `${targetUser?.name ?? '선택한 사용자'}의 업무`
        : '전체 업무'
  const scopeDescription =
    scopeMode === 'my'
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

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setIsDetailOpen(true)
  }

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open) setSelectedTaskId(null)
  }

  return (
    <section className="space-y-4 ui-page-bg pb-8">
      <PageHeader
        icon={CheckSquare}
        title={scopeTitle}
        description={scopeDescription}
      />

      <TaskToolbar
        filters={normalizedFilters}
        onFiltersChange={setFilters}
        users={users}
        assigneeLabel={scopeMode === 'user' ? (targetUser?.name ?? '담당자') : '내 업무'}
        isFetching={tasksQuery.isFetching}
        onCreate={() => setIsFormOpen(true)}
        onRefresh={() => tasksQuery.refetch()}
        showAssigneeFilter={scopeMode === 'all'}
      />

      {/* content bar: 상태 필터(좌) + 선택 보관 + 뷰 토글(우) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, status: undefined, page: 1 }))}
            className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border px-3 text-xs font-bold transition-colors ${
              !normalizedFilters.status
                ? 'bg-text-primary text-background border-text-primary'
                : 'bg-background text-text-secondary border-surface-border hover:bg-surface-muted'
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
              className={`inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-3 text-xs transition-colors ${
                normalizedFilters.status === status
                  ? 'bg-text-primary text-background border-text-primary font-bold'
                  : 'bg-background text-text-secondary border-surface-border hover:bg-surface-muted'
              }`}
            >
              {TASK_STATUS_LABELS[status]}
              <span className="font-black">{statusCounts[status]}</span>
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              disabled={selectedIds.length === 0 || archiveTasks.isPending || restoreTasks.isPending}
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
              archived={Boolean(normalizedFilters.archived)}
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

      <TaskFormDialog
        open={isFormOpen}
        users={users}
        defaultScope={scopeMode === 'my' ? 'PERSONAL' : 'TEAM'}
        currentUserId={currentUserId}
        lockAssigneeToCurrentUser={scopeMode === 'my'}
        onOpenChange={setIsFormOpen}
      />
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={isDetailOpen}
        users={users}
        onOpenChange={handleDetailOpenChange}
      />
    </section>
  )
}

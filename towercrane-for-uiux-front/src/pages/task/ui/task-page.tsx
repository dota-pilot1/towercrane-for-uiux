import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { TaskFilters } from '../../../entities/task/model/types'
import { useAssignableUsers } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { TaskCardView } from '../../../features/task/ui/task-card-view'
import { TaskDetailDialog } from '../../../features/task/ui/task-detail-dialog'
import { TaskFormDialog } from '../../../features/task/ui/task-form-dialog'
import { TaskKanbanView } from '../../../features/task/ui/task-kanban-view'
import { TaskTableView } from '../../../features/task/ui/task-table-view'
import { TaskToolbar, type TaskViewMode } from '../../../features/task/ui/task-toolbar'
import { useTasks } from '../../../features/task/model/use-task-queries'

const initialFilters: TaskFilters = {
  archived: false,
  sort: 'order',
  page: 1,
  pageSize: 50,
}

function emptyMessage(filters: TaskFilters) {
  if (filters.archived) return '보관된 업무가 없습니다.'
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
    <div className="ui-panel-soft flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
          className="h-10 pl-3 pr-9 text-sm font-bold"
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
            size="sm-icon"
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
            size="sm-icon"
            onClick={() => onChange({ page: safePage - 1, pageSize })}
            disabled={safePage <= 1}
            aria-label="이전 페이지"
            title="이전 페이지"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="flex h-8 min-w-20 items-center justify-center rounded-md border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-secondary">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm-icon"
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
            size="sm-icon"
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

export function TaskPage() {
  const [viewMode, setViewMode] = useState<TaskViewMode>('table')
  const [filters, setFilters] = useState<TaskFilters>(initialFilters)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const normalizedFilters = useMemo(
    () => ({
      ...initialFilters,
      ...filters,
    }),
    [filters],
  )

  const tasksQuery = useTasks(normalizedFilters)
  const assignableUsersQuery = useAssignableUsers()
  const tasks = tasksQuery.data?.items ?? []
  const users = assignableUsersQuery.data ?? []
  const total = tasksQuery.data?.total ?? 0
  const page = normalizedFilters.page ?? 1
  const pageSize = normalizedFilters.pageSize ?? 50

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setIsDetailOpen(true)
  }

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open) setSelectedTaskId(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-surface-border-soft bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-10 shrink-0">
            <CheckSquare className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-text-primary">Task 관리</h2>
            <p className="mt-1 text-xs text-text-secondary">
              프로젝트 업무, 담당자, 체크리스트와 댓글을 관리합니다.
            </p>
          </div>
        </div>
        <div className="rounded-sm border border-brand-border bg-brand-glass px-3 py-1 text-xs font-bold text-brand-primary">
          Phase 1
        </div>
      </div>

      <TaskToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={normalizedFilters}
        onFiltersChange={setFilters}
        tasks={tasks}
        users={users}
        total={total}
        isFetching={tasksQuery.isFetching}
        onCreate={() => setIsFormOpen(true)}
        onRefresh={() => tasksQuery.refetch()}
      />

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
          <p className="text-sm text-text-muted">{emptyMessage(normalizedFilters)}</p>
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
